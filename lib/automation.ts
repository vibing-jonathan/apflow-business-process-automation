import type { Invoice, User } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/lib/status";

const financeApprovalThreshold = 5000;

function normalize(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function findVendorByName(name: string) {
  const vendors = await prisma.vendor.findMany({
    include: {
      defaultApprover: true,
      defaultDepartment: true
    }
  });

  return vendors.find((vendor) => normalize(vendor.name) === normalize(name)) ?? null;
}

export async function selectApprover(input: {
  vendorId?: string | null;
  departmentId?: string | null;
  totalAmount?: number | null;
}): Promise<User | null> {
  if ((input.totalAmount ?? 0) >= financeApprovalThreshold) {
    const financeLead = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { name: "asc" }
    });

    if (financeLead) {
      return financeLead;
    }
  }

  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      include: { defaultApprover: true }
    });

    if (vendor?.defaultApprover) {
      return vendor.defaultApprover;
    }
  }

  if (input.departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: input.departmentId },
      include: { defaultApprover: true }
    });

    if (department?.defaultApprover) {
      return department.defaultApprover;
    }
  }

  return prisma.user.findFirst({
    where: {
      role: {
        in: ["APPROVER", "ADMIN"]
      }
    },
    orderBy: { name: "asc" }
  });
}

export async function detectDuplicateInvoice(input: {
  invoiceId?: string;
  vendorId?: string | null;
  vendorNameRaw: string;
  invoiceNumber?: string | null;
}): Promise<Invoice | null> {
  if (!input.invoiceNumber) {
    return null;
  }

  const candidates = await prisma.invoice.findMany({
    where: {
      id: input.invoiceId ? { not: input.invoiceId } : undefined,
      invoiceNumber: input.invoiceNumber,
      status: {
        notIn: [InvoiceStatus.REJECTED]
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return (
    candidates.find((invoice) => {
      if (input.vendorId && invoice.vendorId === input.vendorId) {
        return true;
      }

      return normalize(invoice.vendorNameRaw) === normalize(input.vendorNameRaw);
    }) ?? null
  );
}

export function buildReviewWarnings(input: {
  vendorNameRaw: string;
  invoiceNumber?: string | null;
  issueDate?: Date | null;
  dueDate?: Date | null;
  totalAmount?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  lineTotal?: number | null;
  extractionConfidence?: number | null;
  duplicateInvoiceNumber?: string | null;
}): string[] {
  const warnings: string[] = [];

  if (!input.vendorNameRaw.trim()) {
    warnings.push("Vendor name is required.");
  }

  if (!input.invoiceNumber?.trim()) {
    warnings.push("Invoice number is required.");
  }

  if (!input.issueDate) {
    warnings.push("Issue date is required.");
  }

  if (!input.dueDate) {
    warnings.push("Due date is required.");
  }

  if (input.issueDate && input.dueDate && input.dueDate < input.issueDate) {
    warnings.push("Due date is before issue date.");
  }

  if (!input.totalAmount || input.totalAmount <= 0) {
    warnings.push("Total amount must be greater than zero.");
  }

  if (
    input.totalAmount &&
    input.lineTotal &&
    Math.abs(input.lineTotal - input.totalAmount) > 1
  ) {
    warnings.push("Line item total does not match invoice total.");
  }

  if ((input.extractionConfidence ?? 1) < 0.8) {
    warnings.push("AI confidence is below the 80% review threshold.");
  }

  if (input.duplicateInvoiceNumber) {
    warnings.push(`Possible duplicate invoice: ${input.duplicateInvoiceNumber}.`);
  }

  return warnings;
}
