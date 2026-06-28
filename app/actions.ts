"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildReviewWarnings, detectDuplicateInvoice, selectApprover } from "@/lib/automation";
import { activeUserCookieName, getActiveUser } from "@/lib/data";
import { decimalToNumber, parseDateInput, parseNumberInput } from "@/lib/format";
import { createInvoiceFromFile } from "@/lib/invoice-intake";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/lib/status";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalId(value: string): string | null {
  return value ? value : null;
}

function readLineItems(formData: FormData) {
  const descriptions = formData.getAll("lineDescription").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const unitPrices = formData.getAll("lineUnitPrice").map(String);
  const taxes = formData.getAll("lineTaxAmount").map(String);
  const totals = formData.getAll("lineTotal").map(String);

  return descriptions
    .map((description, index) => ({
      description: description.trim(),
      quantity: Number(quantities[index] ?? 0),
      unitPrice: Number(unitPrices[index] ?? 0),
      taxAmount: Number(taxes[index] ?? 0),
      lineTotal: Number(totals[index] ?? 0)
    }))
    .filter((item) => item.description && item.quantity > 0 && item.lineTotal > 0);
}

export async function setActiveUserAction(formData: FormData) {
  const userId = formString(formData, "userId");
  const returnTo = formString(formData, "returnTo") || "/";

  if (userId) {
    const cookieStore = await cookies();
    cookieStore.set(activeUserCookieName, userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });
  }

  revalidatePath("/");
  redirect(returnTo);
}

export async function uploadInvoiceAction(formData: FormData) {
  const activeUser = await getActiveUser();
  const result = await createInvoiceFromFile(formData.get("invoiceFile"), activeUser.id);

  if (!result.ok) {
    redirect(`/upload?error=${result.error}`);
  }

  revalidatePath("/");
  redirect(`/invoices/${result.invoiceId}`);
}

export async function reviewInvoiceAction(invoiceId: string, formData: FormData) {
  const activeUser = await getActiveUser();
  const existingInvoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: true }
  });

  const vendorId = optionalId(formString(formData, "vendorId"));
  const vendorNameRaw = formString(formData, "vendorNameRaw");
  const invoiceNumber = formString(formData, "invoiceNumber");
  const issueDate = parseDateInput(formData.get("issueDate"));
  const dueDate = parseDateInput(formData.get("dueDate"));
  const currency = formString(formData, "currency") || "USD";
  const subtotal = parseNumberInput(formData.get("subtotal"));
  const taxAmount = parseNumberInput(formData.get("taxAmount")) ?? 0;
  const totalAmount = parseNumberInput(formData.get("totalAmount"));
  const departmentId = optionalId(formString(formData, "departmentId"));
  const selectedApproverId = optionalId(formString(formData, "assignedApproverId"));
  const intent = formString(formData, "intent");
  const lineItems = readLineItems(formData);
  const lineTotal = lineItems.reduce((total, item) => total + item.lineTotal, 0);

  const duplicate = await detectDuplicateInvoice({
    invoiceId,
    vendorId,
    vendorNameRaw,
    invoiceNumber
  });

  const warnings = buildReviewWarnings({
    vendorNameRaw,
    invoiceNumber,
    issueDate,
    dueDate,
    totalAmount,
    subtotal,
    taxAmount,
    lineTotal,
    extractionConfidence: existingInvoice.extractionConfidence,
    duplicateInvoiceNumber: duplicate?.invoiceNumber
  });

  let nextStatus: string = InvoiceStatus.READY_FOR_APPROVAL;
  let assignedApproverId = selectedApproverId;
  let action = "review.saved";

  if (intent === "route") {
    const approver =
      selectedApproverId
        ? await prisma.user.findUnique({ where: { id: selectedApproverId } })
        : await selectApprover({ vendorId, departmentId, totalAmount });

    assignedApproverId = approver?.id ?? null;
    nextStatus = approver ? InvoiceStatus.PENDING_APPROVAL : InvoiceStatus.READY_FOR_APPROVAL;
    action = "review.routed";
  }

  if (intent === "duplicate") {
    nextStatus = InvoiceStatus.REJECTED;
    assignedApproverId = null;
    action = "review.marked_duplicate";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      vendorId,
      vendorNameRaw,
      invoiceNumber,
      issueDate,
      dueDate,
      currency,
      subtotal,
      taxAmount,
      totalAmount,
      status: nextStatus,
      departmentId,
      assignedApproverId,
      reviewedById: activeUser.id,
      duplicateOfInvoiceId: duplicate?.id,
      extractionWarnings: JSON.stringify(warnings),
      lineItems: {
        deleteMany: {},
        create: lineItems
      },
      auditLogs: {
        create: {
          actorId: activeUser.id,
          action,
          fromStatus: existingInvoice.status,
          toStatus: nextStatus,
          metadata: JSON.stringify({ warnings, duplicateOfInvoiceId: duplicate?.id ?? null })
        }
      }
    }
  });

  revalidatePath("/");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function approvalDecisionAction(invoiceId: string, formData: FormData) {
  const activeUser = await getActiveUser();
  const decision = formString(formData, "decision");
  const comment = formString(formData, "comment");
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId }
  });

  const nextStatus =
    decision === "approved"
      ? InvoiceStatus.APPROVED
      : decision === "rejected"
        ? InvoiceStatus.REJECTED
        : InvoiceStatus.CHANGES_REQUESTED;

  const decisionType =
    decision === "approved"
      ? "APPROVED"
      : decision === "rejected"
        ? "REJECTED"
        : "CHANGES_REQUESTED";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: nextStatus,
      approvedById: nextStatus === InvoiceStatus.APPROVED ? activeUser.id : null,
      approvalDecisions: {
        create: {
          approverId: activeUser.id,
          decision: decisionType,
          comment: comment || null
        }
      },
      auditLogs: {
        create: {
          actorId: activeUser.id,
          action: `approval.${decision}`,
          fromStatus: invoice.status,
          toStatus: nextStatus,
          metadata: comment || null
        }
      }
    }
  });

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath(`/invoices/${invoiceId}`);
  redirect("/approvals");
}

export async function quickRouteInvoiceAction(invoiceId: string) {
  const activeUser = await getActiveUser();
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId }
  });
  const approver = await selectApprover({
    vendorId: invoice.vendorId,
    departmentId: invoice.departmentId,
    totalAmount: decimalToNumber(invoice.totalAmount)
  });

  if (!approver) {
    redirect(`/invoices/${invoiceId}`);
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.PENDING_APPROVAL,
      assignedApproverId: approver.id,
      auditLogs: {
        create: {
          actorId: activeUser.id,
          action: "routing.auto_assigned",
          fromStatus: invoice.status,
          toStatus: InvoiceStatus.PENDING_APPROVAL,
          metadata: `Assigned to ${approver.name}.`
        }
      }
    }
  });

  revalidatePath("/");
  redirect(`/invoices/${invoiceId}`);
}
