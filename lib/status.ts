export const UserRole = {
  FINANCE: "FINANCE",
  APPROVER: "APPROVER",
  ADMIN: "ADMIN"
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const InvoiceStatus = {
  UPLOADED: "UPLOADED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  EXPORTED: "EXPORTED"
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const invoiceStatusOrder: InvoiceStatus[] = [
  InvoiceStatus.UPLOADED,
  InvoiceStatus.EXTRACTION_FAILED,
  InvoiceStatus.NEEDS_REVIEW,
  InvoiceStatus.READY_FOR_APPROVAL,
  InvoiceStatus.PENDING_APPROVAL,
  InvoiceStatus.CHANGES_REQUESTED,
  InvoiceStatus.REJECTED,
  InvoiceStatus.APPROVED,
  InvoiceStatus.EXPORTED
];

export const statusLabels: Record<InvoiceStatus, string> = {
  UPLOADED: "Uploaded",
  EXTRACTION_FAILED: "Extraction Failed",
  NEEDS_REVIEW: "Needs Review",
  READY_FOR_APPROVAL: "Ready For Approval",
  PENDING_APPROVAL: "Pending Approval",
  CHANGES_REQUESTED: "Changes Requested",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  EXPORTED: "Exported"
};

export const statusClassNames: Record<InvoiceStatus, string> = {
  UPLOADED: "status neutral",
  EXTRACTION_FAILED: "status danger",
  NEEDS_REVIEW: "status warning",
  READY_FOR_APPROVAL: "status info",
  PENDING_APPROVAL: "status attention",
  CHANGES_REQUESTED: "status warning",
  REJECTED: "status danger",
  APPROVED: "status success",
  EXPORTED: "status complete"
};

export const activeWorkflowStatuses = new Set<InvoiceStatus>([
  InvoiceStatus.UPLOADED,
  InvoiceStatus.NEEDS_REVIEW,
  InvoiceStatus.READY_FOR_APPROVAL,
  InvoiceStatus.PENDING_APPROVAL,
  InvoiceStatus.CHANGES_REQUESTED
]);

export function asInvoiceStatus(status: string): InvoiceStatus {
  return invoiceStatusOrder.includes(status as InvoiceStatus)
    ? (status as InvoiceStatus)
    : InvoiceStatus.UPLOADED;
}
