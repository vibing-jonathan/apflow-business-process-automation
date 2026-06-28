import { buildApprovedInvoicesCsv, csvDownloadResponse } from "@/lib/export-csv";
import { decimalToNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/lib/status";

export async function POST(request: Request) {
  const formData = await request.formData();
  const invoiceIds = formData
    .getAll("invoiceId")
    .map(String)
    .filter(Boolean);
  const createdById = String(formData.get("createdById") ?? "");

  if (invoiceIds.length === 0) {
    return Response.json({ error: "Select at least one approved invoice." }, { status: 400 });
  }

  const createdBy = await prisma.user.findUnique({
    where: { id: createdById }
  });

  if (!createdBy) {
    return Response.json({ error: "Export user was not found." }, { status: 400 });
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      id: { in: invoiceIds },
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
  });

  if (invoices.length === 0) {
    return Response.json({ error: "No selected invoices are ready for export." }, { status: 400 });
  }

  const exportedAt = new Date();
  const fileName = `apflow-export-${exportedAt.toISOString().slice(0, 10)}-${exportedAt
    .getTime()
    .toString()
    .slice(-6)}.csv`;
  const totalAmount = invoices.reduce(
    (total, invoice) => total + decimalToNumber(invoice.totalAmount),
    0
  );

  await prisma.$transaction(async (tx) => {
    const batch = await tx.exportBatch.create({
      data: {
        createdById: createdBy.id,
        fileName,
        invoiceCount: invoices.length,
        totalAmount,
        invoices: {
          create: invoices.map((invoice) => ({
            invoiceId: invoice.id
          }))
        }
      }
    });

    await Promise.all(
      invoices.map((invoice) =>
        tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.EXPORTED,
            exportedAt,
            auditLogs: {
              create: {
                actorId: createdBy.id,
                action: "export.generated",
                fromStatus: InvoiceStatus.APPROVED,
                toStatus: InvoiceStatus.EXPORTED,
                metadata: `Exported in batch ${batch.fileName}.`
              }
            }
          }
        })
      )
    );
  });

  return csvDownloadResponse(buildApprovedInvoicesCsv(invoices), fileName);
}
