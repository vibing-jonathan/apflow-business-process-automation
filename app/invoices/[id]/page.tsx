import { FileText, RotateCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { approvalDecisionAction, quickRouteInvoiceAction, reviewInvoiceAction } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { dateInputValue, formatDate, formatMoney, parseWarnings, percentage } from "@/lib/format";
import { getInvoiceDetail, getReferenceData } from "@/lib/data";
import { InvoiceStatus } from "@/lib/status";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, reference] = await Promise.all([
    getInvoiceDetail(id),
    getReferenceData()
  ]);

  if (!invoice) {
    notFound();
  }

  const warnings = parseWarnings(invoice.extractionWarnings);
  const reviewableStatuses: InvoiceStatus[] = [
    InvoiceStatus.EXTRACTION_FAILED,
    InvoiceStatus.NEEDS_REVIEW,
    InvoiceStatus.READY_FOR_APPROVAL,
    InvoiceStatus.CHANGES_REQUESTED
  ];
  const canReview = reviewableStatuses.includes(invoice.status as InvoiceStatus);
  const canApprove = invoice.status === InvoiceStatus.PENDING_APPROVAL;
  const canQuickRoute = invoice.status === InvoiceStatus.READY_FOR_APPROVAL;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Invoice Detail</p>
          <h1>{invoice.vendorNameRaw}</h1>
          <p className="muted">
            {invoice.invoiceNumber ?? "No invoice number"} - {formatMoney(invoice.totalAmount, invoice.currency)}
          </p>
        </div>
        <div className="action-row" style={{ marginTop: 0 }}>
          <StatusBadge status={invoice.status} />
          <Link className="button secondary" href="/invoices">
            Back
          </Link>
        </div>
      </header>

      <div className="two-column">
        <section className="panel">
          {canReview ? (
            <form action={reviewInvoiceAction.bind(null, invoice.id)} className="form-grid">
              <label>
                Vendor master
                <select name="vendorId" defaultValue={invoice.vendorId ?? ""}>
                  <option value="">Unmatched vendor</option>
                  {reference.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Vendor name
                <input name="vendorNameRaw" defaultValue={invoice.vendorNameRaw} required />
              </label>

              <label>
                Invoice number
                <input name="invoiceNumber" defaultValue={invoice.invoiceNumber ?? ""} required />
              </label>

              <label>
                Currency
                <input name="currency" defaultValue={invoice.currency} maxLength={3} required />
              </label>

              <label>
                Issue date
                <input name="issueDate" type="date" defaultValue={dateInputValue(invoice.issueDate)} required />
              </label>

              <label>
                Due date
                <input name="dueDate" type="date" defaultValue={dateInputValue(invoice.dueDate)} required />
              </label>

              <label>
                Subtotal
                <input name="subtotal" type="number" step="0.01" defaultValue={String(invoice.subtotal ?? "")} required />
              </label>

              <label>
                Tax
                <input name="taxAmount" type="number" step="0.01" defaultValue={String(invoice.taxAmount ?? 0)} />
              </label>

              <label>
                Total
                <input name="totalAmount" type="number" step="0.01" defaultValue={String(invoice.totalAmount ?? "")} required />
              </label>

              <label>
                Department
                <select name="departmentId" defaultValue={invoice.departmentId ?? ""}>
                  <option value="">No department</option>
                  {reference.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Approver
                <select name="assignedApproverId" defaultValue={invoice.assignedApproverId ?? ""}>
                  <option value="">Auto assign</option>
                  {reference.users
                    .filter((user) => user.role !== "FINANCE")
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="wide">
                <h2>Line items</h2>
                <div className="line-items">
                  {(invoice.lineItems.length > 0 ? invoice.lineItems : [null]).map((item, index) => (
                    <div className="line-item-grid" key={item?.id ?? index}>
                      <label>
                        Description
                        <input name="lineDescription" defaultValue={item?.description ?? ""} />
                      </label>
                      <label>
                        Qty
                        <input name="lineQuantity" type="number" step="0.01" defaultValue={String(item?.quantity ?? 1)} />
                      </label>
                      <label>
                        Unit
                        <input name="lineUnitPrice" type="number" step="0.01" defaultValue={String(item?.unitPrice ?? 0)} />
                      </label>
                      <label>
                        Tax
                        <input name="lineTaxAmount" type="number" step="0.01" defaultValue={String(item?.taxAmount ?? 0)} />
                      </label>
                      <label>
                        Total
                        <input name="lineTotal" type="number" step="0.01" defaultValue={String(item?.lineTotal ?? 0)} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="action-row wide">
                <button name="intent" value="save" type="submit">
                  Save review
                </button>
                <button name="intent" value="route" type="submit">
                  Confirm and route
                </button>
                <button name="intent" value="duplicate" type="submit" className="danger">
                  Mark duplicate
                </button>
              </div>
            </form>
          ) : (
            <div className="detail-list">
              <div>
                <dt>Invoice number</dt>
                <dd>{invoice.invoiceNumber ?? "No number"}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{invoice.department?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Approver</dt>
                <dd>{invoice.assignedApprover?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt>Issue date</dt>
                <dd>{formatDate(invoice.issueDate)}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{formatDate(invoice.dueDate)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(invoice.totalAmount, invoice.currency)}</dd>
              </div>
            </div>
          )}

          {canQuickRoute ? (
            <form action={quickRouteInvoiceAction.bind(null, invoice.id)} className="action-row">
              <button type="submit">
                <RotateCw size={16} />
                Auto assign approver
              </button>
            </form>
          ) : null}
        </section>

        <aside>
          <section className="document-preview">
            <FileText size={56} aria-hidden="true" />
            <div>
              <h2>{invoice.fileName}</h2>
              <p className="muted">Confidence {percentage(invoice.extractionConfidence)}</p>
            </div>
            {invoice.filePath.startsWith("seed/") ? null : (
              <Link className="button secondary" href={`/api/invoices/${invoice.id}/file`} target="_blank">
                Open file
              </Link>
            )}
          </section>

          <section className="panel">
            <h2>Extraction warnings</h2>
            {warnings.length > 0 ? (
              <ul className="warning-list">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No warnings.</p>
            )}
          </section>

          {canApprove ? (
            <section className="decision-card">
              <h2>Decision</h2>
              <form action={approvalDecisionAction.bind(null, invoice.id)} className="decision-grid">
                <label>
                  Comment
                  <textarea name="comment" placeholder="Optional note" />
                </label>
                <div className="action-row">
                  <button name="decision" value="approved" type="submit">
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
            </section>
          ) : null}

          <section className="panel">
            <h2>Audit trail</h2>
            <ul className="activity-list">
              {invoice.auditLogs.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.action.replaceAll(".", " ")}</strong>
                  <span>
                    {entry.actor?.name ?? "System"} - {formatDate(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
