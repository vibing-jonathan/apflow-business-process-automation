import { ClipboardCheck } from "lucide-react";

import { approvalDecisionAction } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { getActiveUser, getApprovalQueue } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ApprovalsPage() {
  const activeUser = await getActiveUser();
  const queue = await getApprovalQueue(activeUser.id);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Approval Queue</p>
          <h1>Assigned invoices</h1>
          <p className="muted">Approve, reject, or request changes for routed invoices.</p>
        </div>
      </header>

      {queue.length === 0 ? (
        <p className="empty-state">No invoices are waiting on this persona.</p>
      ) : (
        <section className="decision-grid">
          {queue.map((invoice) => (
            <article className="decision-card" key={invoice.id}>
              <div className="page-header">
                <div>
                  <h2>{invoice.vendorNameRaw}</h2>
                  <p className="muted">
                    {invoice.invoiceNumber} - {invoice.department?.name ?? "No department"}
                  </p>
                </div>
                <StatusBadge status={invoice.status} />
              </div>

              <div className="metric-grid">
                <div>
                  <p className="metric-label">Amount</p>
                  <strong>{formatMoney(invoice.totalAmount, invoice.currency)}</strong>
                </div>
                <div>
                  <p className="metric-label">Due date</p>
                  <strong>{formatDate(invoice.dueDate)}</strong>
                </div>
                <div>
                  <p className="metric-label">Approver</p>
                  <strong>{invoice.assignedApprover?.name ?? "Unassigned"}</strong>
                </div>
                <div>
                  <p className="metric-label">Lines</p>
                  <strong>{invoice.lineItems.length}</strong>
                </div>
              </div>

              <form action={approvalDecisionAction.bind(null, invoice.id)} className="decision-grid">
                <label>
                  Comment
                  <textarea name="comment" placeholder="Optional note" />
                </label>
                <div className="action-row">
                  <button name="decision" value="approved" type="submit">
                    <ClipboardCheck size={16} />
                    Approve
                  </button>
                  <button name="decision" value="changes_requested" type="submit" className="secondary">
                    Request changes
                  </button>
                  <button name="decision" value="rejected" type="submit" className="danger">
                    Reject
                  </button>
                </div>
              </form>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
