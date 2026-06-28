import { Search } from "lucide-react";

import { InvoiceTable } from "@/components/invoice-table";
import { getInvoiceList } from "@/lib/data";
import { InvoiceStatus, invoiceStatusOrder, statusLabels } from "@/lib/status";

type InvoicePageSearchParams = {
  search?: string | string[];
  status?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvoicesPage({
  searchParams
}: {
  searchParams?: Promise<InvoicePageSearchParams>;
}) {
  const params = await searchParams;
  const search = firstParam(params?.search)?.trim() ?? "";
  const requestedStatus = firstParam(params?.status);
  const status = requestedStatus && invoiceStatusOrder.includes(requestedStatus as InvoiceStatus)
    ? requestedStatus
    : "ALL";
  const invoices = await getInvoiceList({
    status,
    search
  });

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Invoice Register</p>
          <h1>Invoices</h1>
          <p className="muted">Search and filter the operational workflow queue.</p>
        </div>
      </header>

      <section className="panel">
        <form action="/invoices" method="get" className="filters">
          <label>
            Search
            <input
              name="search"
              defaultValue={search}
              placeholder="Vendor or invoice number"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={status}>
              <option value="ALL">All statuses</option>
              {invoiceStatusOrder.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">
            <Search size={16} />
            Filter
          </button>
        </form>

        <InvoiceTable invoices={invoices} />
      </section>
    </>
  );
}
