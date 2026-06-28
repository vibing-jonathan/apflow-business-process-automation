import "server-only";

import type { Prisma } from "@prisma/client";

import { csvEscape, decimalToNumber } from "@/lib/format";
import { InvoiceStatus } from "@/lib/status";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type ExportInvoice = {
  vendorNameRaw: string;
  invoiceNumber: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  currency: string;
  subtotal: DecimalLike;
  taxAmount: DecimalLike;
  discountAmount: DecimalLike;
  adjustmentAmount: DecimalLike;
  totalAmount: DecimalLike;
  department?: {
    name: string;
  } | null;
  approvedBy?: {
    name: string;
  } | null;
  assignedApprover?: {
    name: string;
  } | null;
};

export function buildApprovedInvoicesCsv(invoices: ExportInvoice[]) {
  const rows = [
    [
      "vendor",
      "invoice_number",
      "issue_date",
      "due_date",
      "currency",
      "subtotal",
      "tax_amount",
      "discount_amount",
      "adjustment_amount",
      "total_amount",
      "department",
      "approver",
      "status"
    ],
    ...invoices.map((invoice) => [
      invoice.vendorNameRaw,
      invoice.invoiceNumber ?? "",
      invoice.issueDate?.toISOString().slice(0, 10) ?? "",
      invoice.dueDate?.toISOString().slice(0, 10) ?? "",
      invoice.currency,
      decimalToNumber(invoice.subtotal).toFixed(2),
      decimalToNumber(invoice.taxAmount).toFixed(2),
      decimalToNumber(invoice.discountAmount).toFixed(2),
      decimalToNumber(invoice.adjustmentAmount).toFixed(2),
      decimalToNumber(invoice.totalAmount).toFixed(2),
      invoice.department?.name ?? "",
      invoice.approvedBy?.name ?? invoice.assignedApprover?.name ?? "",
      InvoiceStatus.EXPORTED
    ])
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function csvDownloadResponse(csv: string, fileName: string) {
  const safeFileName = fileName.replace(/["\r\n]/g, "") || "apflow-export.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName}"`
    }
  });
}
