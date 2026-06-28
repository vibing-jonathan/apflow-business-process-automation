import { cookies } from "next/headers";

import { decimalToNumber } from "@/lib/format";
import { activeWorkflowStatuses, InvoiceStatus, invoiceStatusOrder, UserRole } from "@/lib/status";
import { prisma } from "@/lib/prisma";

export const activeUserCookieName = "apflow_active_user";

export async function getUsers() {
  return prisma.user.findMany({
    include: { department: true },
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });
}

export async function getActiveUser() {
  const users = await getUsers();
  const cookieStore = await cookies();
  const activeUserId = cookieStore.get(activeUserCookieName)?.value;

  return (
    users.find((user) => user.id === activeUserId) ??
    users.find((user) => user.role === UserRole.FINANCE) ??
    users[0]
  );
}

export async function getReferenceData() {
  const [users, departments, vendors] = await Promise.all([
    getUsers(),
    prisma.department.findMany({
      include: { defaultApprover: true },
      orderBy: { name: "asc" }
    }),
    prisma.vendor.findMany({
      include: { defaultApprover: true, defaultDepartment: true },
      orderBy: { name: "asc" }
    })
  ]);

  return { users, departments, vendors };
}

export async function getDashboardData() {
  const [invoices, recentActivity] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        vendor: true,
        department: true,
        assignedApprover: true,
        duplicateOfInvoice: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.auditLog.findMany({
      include: {
        actor: true,
        invoice: true
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const counts = invoiceStatusOrder.map((status) => ({
    status,
    count: invoices.filter((invoice) => invoice.status === status).length
  }));

  const pendingApprovalTotal = invoices
    .filter((invoice) => invoice.status === InvoiceStatus.PENDING_APPROVAL)
    .reduce((total, invoice) => total + decimalToNumber(invoice.totalAmount), 0);

  const approvedReadyTotal = invoices
    .filter((invoice) => invoice.status === InvoiceStatus.APPROVED && !invoice.exportedAt)
    .reduce((total, invoice) => total + decimalToNumber(invoice.totalAmount), 0);

  const overdueInvoices = invoices.filter(
    (invoice) =>
      invoice.dueDate &&
      invoice.dueDate < now &&
      activeWorkflowStatuses.has(invoice.status as InvoiceStatus)
  );

  const dueSoonInvoices = invoices.filter(
    (invoice) =>
      invoice.dueDate &&
      invoice.dueDate >= now &&
      invoice.dueDate <= nextWeek &&
      activeWorkflowStatuses.has(invoice.status as InvoiceStatus)
  );

  const bottlenecks = Object.values(
    invoices
      .filter((invoice) => invoice.status === InvoiceStatus.PENDING_APPROVAL)
      .reduce<Record<string, { approver: string; count: number; total: number }>>(
        (accumulator, invoice) => {
          const approver = invoice.assignedApprover?.name ?? "Unassigned";
          accumulator[approver] ??= { approver, count: 0, total: 0 };
          accumulator[approver].count += 1;
          accumulator[approver].total += decimalToNumber(invoice.totalAmount);
          return accumulator;
        },
        {}
      )
  ).sort((a, b) => b.total - a.total);

  return {
    counts,
    invoices,
    recentActivity,
    pendingApprovalTotal,
    approvedReadyTotal,
    overdueInvoices,
    dueSoonInvoices,
    bottlenecks
  };
}

export async function getInvoiceList(input: {
  status?: string;
  search?: string;
  approverId?: string;
}) {
  const search = input.search?.trim();

  return prisma.invoice.findMany({
    where: {
      status: input.status && input.status !== "ALL" ? input.status : undefined,
      assignedApproverId: input.approverId || undefined,
      OR: search
        ? [
            { vendorNameRaw: { contains: search } },
            { invoiceNumber: { contains: search } }
          ]
        : undefined
    },
    include: {
      vendor: true,
      department: true,
      assignedApprover: true,
      duplicateOfInvoice: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getInvoiceDetail(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      vendor: true,
      department: true,
      assignedApprover: true,
      uploadedBy: true,
      reviewedBy: true,
      approvedBy: true,
      duplicateOfInvoice: true,
      lineItems: {
        orderBy: { createdAt: "asc" }
      },
      approvalDecisions: {
        include: { approver: true },
        orderBy: { createdAt: "desc" }
      },
      auditLogs: {
        include: { actor: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getApprovalQueue(userId?: string) {
  return prisma.invoice.findMany({
    where: {
      status: InvoiceStatus.PENDING_APPROVAL,
      assignedApproverId: userId || undefined
    },
    include: {
      vendor: true,
      department: true,
      assignedApprover: true,
      lineItems: true
    },
    orderBy: [{ dueDate: "asc" }, { totalAmount: "desc" }]
  });
}

export async function getExportData() {
  const [approvedInvoices, batches] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.APPROVED,
        exportedAt: null
      },
      include: {
        vendor: true,
        department: true,
        assignedApprover: true,
        approvedBy: true
      },
      orderBy: [{ dueDate: "asc" }]
    }),
    prisma.exportBatch.findMany({
      include: {
        createdBy: true,
        invoices: {
          include: {
            invoice: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return { approvedInvoices, batches };
}
