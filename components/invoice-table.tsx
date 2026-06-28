import type { Prisma } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/format";

type InvoiceRow = {
  id: string;
  vendorNameRaw: string;
  invoiceNumber: string | null;
  dueDate: Date | null;
  currency: string;
  totalAmount: Prisma.Decimal | null;
  status: string;
  assignedApprover?: {
    name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  duplicateOfInvoice?: {
    invoiceNumber: string | null;
  } | null;
};

export function InvoiceTable({
  invoices,
  emptyLabel = "No invoices found."
}: {
  invoices: InvoiceRow[];
  emptyLabel?: string;
}) {
  if (invoices.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Invoice</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Due</th>
            <th>Approver</th>
            <th aria-label="Open invoice" />
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td>
                <strong>{invoice.vendorNameRaw}</strong>
                <span>{invoice.department?.name ?? "No department"}</span>
              </td>
              <td>
                <strong>{invoice.invoiceNumber ?? "No number"}</strong>
                {invoice.duplicateOfInvoice ? (
                  <span>Duplicate of {invoice.duplicateOfInvoice.invoiceNumber}</span>
                ) : null}
              </td>
              <td>
                <StatusBadge status={invoice.status} />
              </td>
              <td>{formatMoney(invoice.totalAmount, invoice.currency)}</td>
              <td>{formatDate(invoice.dueDate)}</td>
              <td>{invoice.assignedApprover?.name ?? "Unassigned"}</td>
              <td>
                <Link className="icon-link" href={`/invoices/${invoice.id}`} aria-label="Open invoice">
                  <ArrowRight size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
