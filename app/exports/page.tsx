import { Download } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { getActiveUser, getExportData } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ExportsPage() {
  const [activeUser, data] = await Promise.all([getActiveUser(), getExportData()]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Accounting Handoff</p>
          <h1>Export approved invoices</h1>
          <p className="muted">Generate CSV batches for invoices approved for payment.</p>
        </div>
      </header>

      <div className="two-column">
        <section className="panel">
          <h2>Ready to export</h2>
          {data.approvedInvoices.length === 0 ? (
            <p className="empty-state">No approved invoices are ready for export.</p>
          ) : (
            <form
              action="/api/exports/approved-invoices"
              method="post"
              className="export-form"
            >
              <input type="hidden" name="createdById" value={activeUser.id} />
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Vendor</th>
                      <th>Invoice</th>
                      <th>Due</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.approvedInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <label className="checkbox-row">
                            <input name="invoiceId" type="checkbox" value={invoice.id} defaultChecked />
                            Include
                          </label>
                        </td>
                        <td>
                          <strong>{invoice.vendorNameRaw}</strong>
                          <span>{invoice.department?.name ?? "No department"}</span>
                        </td>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{formatDate(invoice.dueDate)}</td>
                        <td>{formatMoney(invoice.totalAmount, invoice.currency)}</td>
                        <td>
                          <StatusBadge status={invoice.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="submit">
                <Download size={16} />
                Generate CSV
              </button>
            </form>
          )}
        </section>

        <aside className="panel">
          <h2>Export history</h2>
          {data.batches.length === 0 ? (
            <p className="empty-state">No export batches yet.</p>
          ) : (
            <ul className="summary-list">
              {data.batches.map((batch) => (
                <li key={batch.id}>
                  <strong>{batch.fileName}</strong>
                  <span>
                    {batch.invoiceCount} invoices - {formatMoney(batch.totalAmount)} -{" "}
                    {formatDate(batch.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
