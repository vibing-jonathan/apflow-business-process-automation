# APFlow Implementation Plan

## 1. Project Summary

**Product name:** APFlow

**Concept:** APFlow is an AI-assisted invoice intake and approval tool for small and mid-sized businesses. It automates the manual process of collecting supplier invoices, extracting key fields, validating the data, routing invoices to the right approver, tracking approval status, and preparing approved invoices for payment or accounting export.

**Primary goal:** Build a focused MVP that demonstrates practical business process automation through a complete workflow: document intake, AI extraction, human review, approval routing, database persistence, operational dashboard, audit trail, and export.

**Why this project fits the assignment:** The brief asks for a real business problem, a clear before-and-after process, and an MVP that demonstrates frontend, backend, database, workflow automation, and AI integration. Invoice processing is a strong fit because it is repetitive, measurable, document-heavy, and common across many companies.

## 2. Business Problem

Many businesses still process supplier invoices manually. A typical finance or operations employee receives invoices by email, downloads attachments, reads each PDF, copies fields into a spreadsheet or accounting tool, checks totals and due dates, asks the right manager to approve the expense, follows up when approvals are late, and finally prepares the invoice for payment.

This process is slow, error-prone, and hard to track. Missing invoices, late approvals, duplicate invoices, incorrect totals, and unclear ownership can cause payment delays, vendor frustration, inaccurate cash-flow visibility, and unnecessary administrative work.

APFlow focuses on one high-value workflow: turning incoming invoices into reviewed, approved, exportable payment records.

## 3. Target Users

### Finance or Operations Coordinator

The main daily user. This person uploads invoices, reviews extracted data, fixes errors, monitors approval status, and exports approved invoices.

### Department Manager or Approver

The user responsible for approving invoices assigned to their department or cost center.

### Business Owner or Finance Lead

The user who wants visibility into pending liabilities, approval bottlenecks, overdue invoices, and upcoming cash requirements.

## 4. Current Manual Workflow

1. Vendor sends invoice by email.
2. Finance employee downloads the attachment.
3. Employee opens the document and manually reads invoice fields.
4. Employee copies vendor name, invoice number, issue date, due date, amount, tax, currency, and line items into a spreadsheet.
5. Employee decides which manager should approve the invoice.
6. Employee sends a message or email requesting approval.
7. Employee follows up manually if no response arrives.
8. Approved invoices are copied into an accounting system or payment batch.
9. Reporting is performed manually from the spreadsheet.

## 5. Automated Workflow With APFlow

1. User uploads an invoice PDF or image.
2. Backend stores the file and creates an invoice intake record.
3. AI extraction reads the invoice and returns structured fields.
4. System validates required fields, totals, dates, duplicate invoice numbers, and confidence levels.
5. User reviews extracted fields and confirms or edits them.
6. System suggests or assigns an approver based on vendor, department, amount, or rules.
7. Approver receives the invoice in their approval queue.
8. Approver approves, rejects, or requests changes.
9. System records every important event in an audit trail.
10. Approved invoices become available for CSV export or accounting handoff.
11. Dashboard shows operational status, overdue approvals, upcoming due dates, and totals by vendor or department.

## 6. MVP Scope

### In Scope

- Invoice upload for PDF and common image formats.
- AI-powered extraction of structured invoice data.
- Human review and correction screen.
- Invoice status lifecycle.
- Basic duplicate detection using vendor name and invoice number.
- Rule-based approver assignment.
- Approval queue for managers.
- Approve, reject, and request-changes actions.
- Dashboard for pending, overdue, approved, rejected, and payment-ready invoices.
- CSV export for approved invoices.
- Audit trail for important workflow events.
- Simple authentication or role simulation for demo purposes.
- Seed data for vendors, departments, users, and sample invoices.

### Out of Scope For MVP

- Full accounting system integration.
- Real email inbox ingestion.
- Payment execution.
- Vendor portal.
- Multi-company enterprise tenancy.
- Advanced OCR training.
- Complex purchase order matching.
- Real-time notifications through external services.
- Mobile app.

These can be positioned as future enhancements after the MVP proves the core workflow.

## 7. Product Requirements

### Invoice Intake

- User can upload one invoice at a time.
- System accepts PDF, PNG, JPG, and JPEG files.
- System creates an invoice record immediately with status `Uploaded`.
- System stores original filename, upload timestamp, uploader, and file path or object key.
- System starts AI extraction after upload.

### AI Extraction

The AI extraction layer should return a structured object containing:

- Vendor name.
- Vendor tax ID, if present.
- Invoice number.
- Issue date.
- Due date.
- Currency.
- Subtotal.
- Tax amount.
- Total amount.
- Payment terms, if present.
- Purchase order number, if present.
- Line items with description, quantity, unit price, tax, and total.
- Confidence score per important field.
- Warnings for missing, ambiguous, or suspicious data.

The MVP should treat AI output as a draft, not as final truth. A human user must confirm extracted fields before approval routing.

### Validation

The backend should validate:

- Required fields are present.
- Total amount is greater than zero.
- Due date is not before issue date.
- Line item totals roughly match invoice total where line items exist.
- Vendor and invoice number combination is not already present.
- Confidence scores below a threshold trigger a review warning.

### Human Review

- User can view the uploaded document and extracted fields side by side.
- User can edit extracted values.
- User can approve extraction and move invoice to approval routing.
- User can mark invoice as invalid or duplicate.

### Approval Routing

- System assigns approver using simple rules:
  - Vendor default approver if configured.
  - Department approver if department is selected.
  - Finance lead approval if amount exceeds a configurable threshold.
- Invoices move to `Pending Approval` after review.
- Approver can approve, reject, or request changes.
- Every approval decision creates an audit log entry.

### Dashboard

Dashboard should show:

- Number of invoices by status.
- Total amount pending approval.
- Total amount approved but not exported.
- Overdue invoices.
- Invoices due in the next 7 days.
- Approval bottlenecks by approver.
- Recent activity.

### Export

- User can export approved invoices as CSV.
- Export includes vendor, invoice number, dates, currency, subtotal, tax, total, department, approver, and status.
- Exported invoices move to `Exported` or receive an exported timestamp.

## 8. Recommended Status Model

| Status | Meaning |
| --- | --- |
| `Uploaded` | File has been received but extraction is not complete. |
| `Extraction Failed` | AI extraction failed or returned unusable data. |
| `Needs Review` | AI extraction is complete and requires human confirmation. |
| `Ready For Approval` | Data has been reviewed and routing is ready. |
| `Pending Approval` | Invoice has been assigned to an approver. |
| `Changes Requested` | Approver needs corrections or more information. |
| `Rejected` | Invoice should not be paid. |
| `Approved` | Invoice has been approved for payment. |
| `Exported` | Invoice has been included in an accounting/payment export. |

## 9. User Stories And Acceptance Criteria

| User Story | Acceptance Criteria |
| --- | --- |
| As a finance user, I can upload an invoice so that it enters the workflow. | Upload creates an invoice record, stores the file reference, and shows status. |
| As a finance user, I can see AI-extracted fields so that I do not manually type invoice data. | Extracted fields appear in an editable form with warnings and confidence indicators. |
| As a finance user, I can correct extracted data before approval. | Saving review updates the database and records an audit event. |
| As a finance user, I can detect likely duplicate invoices. | Existing vendor plus invoice number match creates a duplicate warning. |
| As an approver, I can review invoices assigned to me. | Approval queue lists pending invoices with key details and document access. |
| As an approver, I can approve, reject, or request changes. | Status changes are persisted and audit logged. |
| As a finance lead, I can see operational metrics. | Dashboard displays counts, totals, overdue items, and upcoming due invoices. |
| As a finance user, I can export approved invoices. | CSV export contains approved invoice records and marks them exported. |

## 10. Recommended Technical Stack

The exact stack can be adjusted, but this plan assumes a modern full-stack TypeScript application because it keeps the frontend, backend, validation, and shared types cohesive.

### Frontend

- Next.js with TypeScript.
- React server and client components where appropriate.
- Tailwind CSS or a lightweight component library for fast, consistent UI.
- Form validation using Zod-backed schemas.
- Tables, filters, status badges, and dashboard cards for operational visibility.

### Backend

- Next.js API routes or route handlers for MVP simplicity.
- Server-side validation with Zod.
- Prisma ORM for database access.
- Background-style processing abstraction for invoice extraction. For MVP, this can run synchronously after upload or through a simple job table.

### Database

- PostgreSQL for production-like architecture.
- SQLite is acceptable for local MVP speed if deployment requirements are minimal.
- Prisma migrations should define the schema from the start.

### AI Layer

- LLM-based structured extraction from OCR text or document text.
- JSON schema validation for AI output.
- Confidence scoring and warnings.
- Fallback handling when extraction fails.

### File Storage

- Local `uploads/` directory for MVP.
- Abstract storage behind a service module so it can later move to S3-compatible storage.

### Authentication

- MVP can use seeded users and role switching.
- If time allows, add real authentication with credentials or OAuth.

## 11. High-Level Architecture

```text
Browser UI
  |
  | Upload invoice, review fields, approve invoices, view dashboard
  v
Next.js Application
  |
  | Route handlers / server actions
  v
Application Services
  |
  |-- Invoice Service
  |-- Extraction Service
  |-- Validation Service
  |-- Approval Routing Service
  |-- Export Service
  |-- Audit Log Service
  |
  v
Database
  |
  | Users, vendors, invoices, line items, approvals, audit logs, exports
  v
File Storage
  |
  | Original invoice documents
  v
AI Provider
  |
  | Structured invoice extraction and warning generation
```

## 12. Proposed Data Model

### User

- `id`
- `name`
- `email`
- `role`: `finance`, `approver`, `admin`
- `departmentId`
- `createdAt`
- `updatedAt`

### Department

- `id`
- `name`
- `defaultApproverId`
- `createdAt`
- `updatedAt`

### Vendor

- `id`
- `name`
- `taxId`
- `defaultDepartmentId`
- `defaultApproverId`
- `paymentTerms`
- `createdAt`
- `updatedAt`

### Invoice

- `id`
- `vendorId`
- `vendorNameRaw`
- `invoiceNumber`
- `issueDate`
- `dueDate`
- `currency`
- `subtotal`
- `taxAmount`
- `totalAmount`
- `status`
- `departmentId`
- `assignedApproverId`
- `uploadedById`
- `reviewedById`
- `approvedById`
- `fileName`
- `filePath`
- `extractionConfidence`
- `extractionWarnings`
- `duplicateOfInvoiceId`
- `exportedAt`
- `createdAt`
- `updatedAt`

### InvoiceLineItem

- `id`
- `invoiceId`
- `description`
- `quantity`
- `unitPrice`
- `taxAmount`
- `lineTotal`
- `createdAt`
- `updatedAt`

### ApprovalDecision

- `id`
- `invoiceId`
- `approverId`
- `decision`: `approved`, `rejected`, `changes_requested`
- `comment`
- `createdAt`

### AuditLog

- `id`
- `invoiceId`
- `actorId`
- `action`
- `fromStatus`
- `toStatus`
- `metadata`
- `createdAt`

### ExportBatch

- `id`
- `createdById`
- `fileName`
- `invoiceCount`
- `totalAmount`
- `createdAt`

### ExportBatchInvoice

- `id`
- `exportBatchId`
- `invoiceId`

## 13. API Design

### Invoice APIs

- `POST /api/invoices/upload`
  - Upload an invoice file and create intake record.
- `GET /api/invoices`
  - List invoices with filters for status, vendor, approver, date, and search.
- `GET /api/invoices/:id`
  - Retrieve invoice details, line items, audit log, and file metadata.
- `PATCH /api/invoices/:id/review`
  - Save corrected extraction fields and mark review complete.
- `POST /api/invoices/:id/route`
  - Assign approver and move invoice into approval.
- `POST /api/invoices/:id/approve`
  - Approve invoice.
- `POST /api/invoices/:id/reject`
  - Reject invoice.
- `POST /api/invoices/:id/request-changes`
  - Request changes.

### Dashboard APIs

- `GET /api/dashboard/summary`
  - Return counts, totals, overdue items, upcoming due dates, and bottlenecks.

### Export APIs

- `POST /api/exports/approved-invoices`
  - Generate CSV from approved invoices.
- `GET /api/exports`
  - List previous export batches.

### Reference Data APIs

- `GET /api/vendors`
- `POST /api/vendors`
- `GET /api/departments`
- `GET /api/users`

## 14. Frontend Screens

### Main Dashboard

Purpose: Give finance users immediate operational visibility.

Core elements:

- Status summary cards.
- Pending approval total.
- Approved not exported total.
- Overdue invoice table.
- Upcoming due invoice table.
- Recent activity feed.
- Primary action to upload invoice.

### Invoice Upload Screen

Purpose: Start the automation workflow.

Core elements:

- File dropzone.
- Upload progress.
- Supported file type guidance.
- Extraction status.
- Link to review screen after extraction.

### Invoice Review Screen

Purpose: Human-in-the-loop validation of AI results.

Core elements:

- Document preview area.
- Editable invoice fields.
- Line item editor.
- Confidence and warning display.
- Duplicate warning.
- Department and approver selection.
- Confirm and send for approval action.

### Invoice List Screen

Purpose: Search and manage all invoices.

Core elements:

- Table with vendor, invoice number, amount, due date, status, approver, and age.
- Filters by status, vendor, approver, due date, and department.
- Search by vendor or invoice number.
- Row actions for view, review, approve, or export eligibility.

### Approval Queue Screen

Purpose: Allow managers to quickly act on assigned invoices.

Core elements:

- List of pending invoices assigned to the current approver.
- Document preview or detail drawer.
- Approve, reject, and request changes actions.
- Comment field for decision notes.

### Export Screen

Purpose: Prepare accounting handoff.

Core elements:

- List of approved invoices not yet exported.
- Select all and individual selection.
- CSV preview.
- Generate export action.
- Previous export history.

## 15. AI Extraction Design

### Input Strategy

For MVP, use one of these approaches:

1. Extract text from PDFs using a local parser when the PDF contains embedded text.
2. Use OCR for scanned images or scanned PDFs if needed.
3. Send extracted text and limited document context to the AI provider.

If OCR setup slows delivery, MVP can support text-based PDFs first and include sample invoices designed for reliable extraction.

### AI Prompt Objective

The extraction prompt should instruct the model to return only structured JSON matching the invoice extraction schema. It should also identify uncertainty instead of guessing.

### Output Contract

The extraction service should validate AI output against a schema before storing it. Invalid output should not corrupt invoice records. It should create an extraction failure state or a review warning.

### Human Control

AI should accelerate data entry, not make irreversible financial decisions. Approval, rejection, and export require explicit user actions.

### Example Extraction Result Shape

```json
{
  "vendorName": "Acme Supplies Ltd.",
  "vendorTaxId": "123456789",
  "invoiceNumber": "INV-2026-0142",
  "issueDate": "2026-06-15",
  "dueDate": "2026-07-15",
  "currency": "USD",
  "subtotal": 1200.0,
  "taxAmount": 204.0,
  "totalAmount": 1404.0,
  "paymentTerms": "Net 30",
  "purchaseOrderNumber": "PO-8871",
  "lineItems": [
    {
      "description": "Office supplies",
      "quantity": 10,
      "unitPrice": 120.0,
      "taxAmount": 204.0,
      "lineTotal": 1404.0
    }
  ],
  "confidence": {
    "vendorName": 0.97,
    "invoiceNumber": 0.94,
    "dueDate": 0.91,
    "totalAmount": 0.98
  },
  "warnings": []
}
```

## 16. Automation Rules

### Duplicate Detection

If an invoice has the same normalized vendor name and invoice number as an existing invoice, mark it as a likely duplicate and prevent approval until reviewed.

### Approval Assignment

Recommended MVP routing logic:

1. Use vendor default approver if available.
2. Otherwise use selected department default approver.
3. If total amount is above a configured threshold, assign or add finance lead review.
4. If no rule matches, keep invoice in `Ready For Approval` and ask finance user to choose an approver.

### Overdue Detection

An invoice is operationally overdue if:

- It is pending approval and the due date is within 3 days or already passed.
- It has been pending approval for more than a configured number of days.

### Export Eligibility

An invoice is exportable if:

- Status is `Approved`.
- Required fields are complete.
- It has not already been exported.

## 17. Security And Compliance Considerations

The MVP does not need enterprise-grade compliance, but the plan should show awareness of financial data handling.

- Store API keys only in environment variables.
- Do not commit uploaded invoice files.
- Validate file type and file size on upload.
- Restrict access by role.
- Record audit events for status changes and approvals.
- Avoid sending unnecessary sensitive data to AI providers.
- Keep original documents available for human verification.
- Make AI confidence and warnings visible.

## 18. Testing Strategy

### Unit Tests

- Invoice status transitions.
- Duplicate detection.
- Approval routing rules.
- Export eligibility.
- Field validation.
- Currency and date parsing helpers.

### Integration Tests

- Upload creates invoice record.
- Extraction result updates invoice and line items.
- Review moves invoice to approval state.
- Approval decision updates status and audit log.
- Export generates CSV and marks invoices exported.

### AI Contract Tests

- Mock AI provider returns valid structured data.
- Invalid AI response is rejected.
- Missing required fields produce warnings.
- Low-confidence fields require review.

### UI Tests

- Dashboard renders seeded metrics.
- User can upload and move to review.
- User can edit extracted fields.
- Approver can approve invoice.
- Finance user can export approved invoice.

## 19. Implementation Milestones

### Milestone 1: Project Foundation

Deliverables:

- Application scaffold.
- TypeScript configuration.
- Styling setup.
- Database ORM setup.
- Initial schema and migrations.
- Seed data for users, departments, vendors, and sample invoices.
- Basic layout and navigation.

Success criteria:

- App runs locally.
- Database can be migrated and seeded.
- User can navigate core screens with placeholder data.

### Milestone 2: Invoice Intake And Persistence

Deliverables:

- File upload UI.
- Upload API.
- Local file storage abstraction.
- Invoice record creation.
- Invoice list page.
- Invoice detail page.

Success criteria:

- User can upload an invoice.
- Invoice appears in the database and list view.
- Original file metadata is visible.

### Milestone 3: AI Extraction And Review

Deliverables:

- Extraction service interface.
- AI provider integration or mock provider for local development.
- Structured extraction schema.
- Extraction warnings.
- Review form.
- Line item editor.

Success criteria:

- Uploaded invoice gets extracted fields.
- User can edit and confirm extracted data.
- Invalid or low-confidence fields are flagged.

### Milestone 4: Workflow Automation

Deliverables:

- Invoice status model.
- Duplicate detection.
- Approval routing service.
- Approval queue.
- Approve, reject, and request-changes actions.
- Audit log.

Success criteria:

- Reviewed invoice can be routed to an approver.
- Approver can take action.
- Status changes and audit records are reliable.

### Milestone 5: Dashboard And Export

Deliverables:

- Dashboard metrics API.
- Dashboard UI.
- Approved invoice export screen.
- CSV generation.
- Export batch tracking.

Success criteria:

- Finance user can see useful operational metrics.
- Approved invoices can be exported.
- Exported invoices are tracked.

### Milestone 6: Polish, Testing, And Demo Readiness

Deliverables:

- Focused test suite.
- Error states.
- Empty states.
- Loading states.
- Sample invoices and demo data.
- README with setup and demo script.

Success criteria:

- Core workflow is demoable end to end.
- Tests cover high-risk business logic.
- Project clearly communicates business and technical value.

## 20. Suggested Build Order

1. Define database schema and status lifecycle.
2. Build seed data and basic app shell.
3. Build invoice list and detail views.
4. Build upload and file storage.
5. Add extraction service with mock data first.
6. Add real AI extraction once the contract is stable.
7. Build review form.
8. Add duplicate detection and validation.
9. Build approval routing and approval queue.
10. Add audit logs.
11. Build dashboard metrics.
12. Build CSV export.
13. Add tests and polish.

This order avoids blocking the full product on AI integration. The app can be built and tested with a mock extraction provider, then upgraded to real AI extraction when the workflow is stable.

## 21. Demo Narrative

The final demo should tell a business story:

1. A finance user receives an invoice from a vendor.
2. They upload it into APFlow.
3. APFlow extracts the invoice details automatically.
4. The user sees warnings and confirms the corrected fields.
5. APFlow detects whether the invoice is duplicate or valid.
6. APFlow routes the invoice to the correct approver.
7. The approver approves it from their queue.
8. The dashboard updates immediately.
9. The finance user exports approved invoices for accounting.

This narrative directly demonstrates the assignment requirements: problem definition, automation, AI, workflow, frontend, backend, database, and business value.

## 22. Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI extraction is inconsistent. | Demo may fail or data may be unreliable. | Use schema validation, confidence warnings, sample documents, and a mock provider fallback. |
| PDF/OCR processing takes too long. | Implementation complexity increases. | Start with text PDFs and add OCR only if time allows. |
| Scope becomes too large. | MVP may not finish. | Keep accounting integration, email ingestion, and payment execution out of scope. |
| Approval routing becomes complex. | Business rules may become hard to explain. | Use simple vendor, department, and amount rules. |
| UI becomes too dashboard-heavy. | Core workflow may feel unfinished. | Prioritize upload, review, approve, and export before analytics polish. |
| Financial data handling looks unsafe. | Product may seem unrealistic. | Add role access, audit logs, file validation, and environment-based secrets. |

## 23. Definition Of Done For MVP

The MVP is complete when:

- A user can upload an invoice document.
- The system creates an invoice record.
- AI or mock AI extracts structured fields.
- The user can review and correct extracted fields.
- The system validates required data and duplicate risk.
- The invoice can be routed to an approver.
- The approver can approve, reject, or request changes.
- The dashboard reflects workflow state.
- Approved invoices can be exported as CSV.
- Important events are recorded in an audit trail.
- The project has a clear README, seeded demo data, and focused tests.

## 24. Future Enhancements

- Email inbox ingestion.
- OCR for scanned invoices.
- Purchase order matching.
- Vendor management portal.
- Multi-step approvals.
- Slack or email notifications.
- Accounting integrations.
- Role-based authentication with real users.
- Multi-company support.
- Advanced analytics for vendor spend and payment timing.
- Automated anomaly detection for suspicious invoices.

## 25. Recommended First Implementation Decision

Start with the workflow and database model before implementing real AI extraction. The best early technical move is to build a mock extraction provider that returns realistic structured invoice data. This lets the frontend, backend, database, validation, approval, audit, and export workflow be developed immediately. Once the product flow is stable, replace or supplement the mock provider with a real AI extraction provider behind the same service interface.

This approach keeps the project practical, professional, and demo-ready even if document parsing or AI provider setup takes longer than expected.

