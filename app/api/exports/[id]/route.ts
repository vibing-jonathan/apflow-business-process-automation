import { buildApprovedInvoicesCsv, csvDownloadResponse } from "@/lib/export-csv";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await prisma.exportBatch.findUnique({
    where: { id },
    include: {
      invoices: {
        include: {
          invoice: {
            include: {
              department: true,
              assignedApprover: true,
              approvedBy: true
            }
          }
        },
        orderBy: { id: "asc" }
      }
    }
  });

  if (!batch) {
    return Response.json({ error: "Export batch was not found." }, { status: 404 });
  }

  const invoices = batch.invoices.map((link) => link.invoice);

  return csvDownloadResponse(buildApprovedInvoicesCsv(invoices), batch.fileName);
}
