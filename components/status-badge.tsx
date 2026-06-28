import { asInvoiceStatus, statusClassNames, statusLabels } from "@/lib/status";

export function StatusBadge({ status }: { status: string }) {
  const invoiceStatus = asInvoiceStatus(status);

  return <span className={statusClassNames[invoiceStatus]}>{statusLabels[invoiceStatus]}</span>;
}
