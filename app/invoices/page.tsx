import { Search } from "lucide-react";

import { InvoiceTable } from "@/components/invoice-table";
import { getInvoiceList } from "@/lib/data";
import { invoiceStatusOrder, statusLabels } from "@/lib/status";

export default async function InvoicesPage({
  searchParams
}: {
  searchParams?: { status?: string; search?: string };
}) {
  const invoices = await getInvoiceList({
    status: searchParams?.status,
    search: searchParams?.search
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
        <form className="filters">
          <label>
            Search
            <input
              name="search"
              defaultValue={searchParams?.search ?? ""}
              placeholder="Vendor or invoice number"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={searchParams?.status ?? "ALL"}>
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
