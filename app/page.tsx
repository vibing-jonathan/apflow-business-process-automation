import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  PackageCheck,
  WalletCards
} from "lucide-react";
import Link from "next/link";

import { InvoiceTable } from "@/components/invoice-table";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { getDashboardData } from "@/lib/data";
import { statusLabels } from "@/lib/status";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const needsReview =
    data.counts.find((item) => item.status === "NEEDS_REVIEW")?.count ?? 0;
  const pendingApproval =
    data.counts.find((item) => item.status === "PENDING_APPROVAL")?.count ?? 0;
  const approved = data.counts.find((item) => item.status === "APPROVED")?.count ?? 0;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations Dashboard</p>
          <h1>Invoice workflow control</h1>
          <p className="muted">Review intake, approval bottlenecks, and export readiness.</p>
        </div>
        <Link className="button" href="/upload">
          Upload invoice
        </Link>
      </header>

      <section className="metric-grid" aria-label="Workflow metrics">
        <MetricCard
          label="Needs Review"
          value={String(needsReview)}
          detail="AI drafts waiting on finance"
          icon={<FileWarning size={20} />}
        />
        <MetricCard
          label="Pending Approval"
          value={String(pendingApproval)}
          detail={formatMoney(data.pendingApprovalTotal)}
          icon={<Clock3 size={20} />}
        />
        <MetricCard
          label="Approved"
          value={String(approved)}
          detail={formatMoney(data.approvedReadyTotal)}
          icon={<CheckCircle2 size={20} />}
        />
        <MetricCard
          label="Overdue"
          value={String(data.overdueInvoices.length)}
          detail="Active invoices past due date"
          icon={<AlertTriangle size={20} />}
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="page-header">
            <div>
              <h2>Active invoices</h2>
              <p className="muted">Sorted by the most recently updated workflow items.</p>
            </div>
            <Link className="button secondary" href="/invoices">
              View all
            </Link>
          </div>
          <InvoiceTable invoices={data.invoices.slice(0, 6)} />
        </section>

        <aside>
          <section className="panel">
            <h2>Status mix</h2>
            <ul className="summary-list">
              {data.counts
                .filter((item) => item.count > 0)
                .map((item) => (
                  <li key={item.status}>
                    <strong>{statusLabels[item.status]}</strong>
                    <span>{item.count} invoices</span>
                    <div style={{ marginTop: 7 }}>
                      <StatusBadge status={item.status} />
                    </div>
                  </li>
                ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Approval bottlenecks</h2>
            {data.bottlenecks.length > 0 ? (
              <ul className="summary-list">
                {data.bottlenecks.map((item) => (
                  <li key={item.approver}>
                    <strong>{item.approver}</strong>
                    <span>
                      {item.count} invoices - {formatMoney(item.total)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No pending approvals.</p>
            )}
          </section>
        </aside>
      </div>

      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        <section className="panel">
          <h2>Due soon</h2>
          <InvoiceTable
            invoices={data.dueSoonInvoices.slice(0, 4)}
            emptyLabel="No active invoices due in the next week."
          />
        </section>

        <section className="panel">
          <h2>Recent activity</h2>
          {data.recentActivity.length > 0 ? (
            <ul className="activity-list">
              {data.recentActivity.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.action.replaceAll(".", " ")}</strong>
                  <span>
                    {entry.invoice.vendorNameRaw} - {entry.actor?.name ?? "System"} -{" "}
                    {formatDate(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No audit activity yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
