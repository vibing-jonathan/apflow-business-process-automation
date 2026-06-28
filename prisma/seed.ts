import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UserRole = {
  FINANCE: "FINANCE",
  APPROVER: "APPROVER",
  ADMIN: "ADMIN"
} as const;

const InvoiceStatus = {
  UPLOADED: "UPLOADED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  APPROVED: "APPROVED"
} as const;

async function main() {
  await prisma.exportBatchInvoice.deleteMany();
  await prisma.exportBatch.deleteMany();
  await prisma.approvalDecision.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const finance = await prisma.user.create({
    data: {
      name: "Maya Cohen",
      email: "maya.finance@apflow.local",
      role: UserRole.FINANCE
    }
  });

  const operationsLead = await prisma.user.create({
    data: {
      name: "Daniel Ortiz",
      email: "daniel.ops@apflow.local",
      role: UserRole.APPROVER
    }
  });

  const itLead = await prisma.user.create({
    data: {
      name: "Leah Stein",
      email: "leah.it@apflow.local",
      role: UserRole.APPROVER
    }
  });

  const financeLead = await prisma.user.create({
    data: {
      name: "Nora Patel",
      email: "nora.controller@apflow.local",
      role: UserRole.ADMIN
    }
  });

  const operations = await prisma.department.create({
    data: {
      name: "Operations",
      defaultApproverId: operationsLead.id
    }
  });

  const technology = await prisma.department.create({
    data: {
      name: "Technology",
      defaultApproverId: itLead.id
    }
  });

  const financeDept = await prisma.department.create({
    data: {
      name: "Finance",
      defaultApproverId: financeLead.id
    }
  });

  await prisma.user.update({
    where: { id: operationsLead.id },
    data: { departmentId: operations.id }
  });
  await prisma.user.update({
    where: { id: itLead.id },
    data: { departmentId: technology.id }
  });
  await prisma.user.update({
    where: { id: financeLead.id },
    data: { departmentId: financeDept.id }
  });

  const atlas = await prisma.vendor.create({
    data: {
      name: "Atlas Office Supplies",
      taxId: "US-847-291",
      defaultDepartmentId: operations.id,
      defaultApproverId: operationsLead.id,
      paymentTerms: "Net 30"
    }
  });

  const cloud = await prisma.vendor.create({
    data: {
      name: "Northstar Cloud Services",
      taxId: "US-113-904",
      defaultDepartmentId: technology.id,
      defaultApproverId: itLead.id,
      paymentTerms: "Net 15"
    }
  });

  const logistics = await prisma.vendor.create({
    data: {
      name: "Harbor Logistics",
      taxId: "US-551-420",
      defaultDepartmentId: operations.id,
      defaultApproverId: operationsLead.id,
      paymentTerms: "Net 45"
    }
  });

  const officeInvoice = await prisma.invoice.create({
    data: {
      vendorId: atlas.id,
      vendorNameRaw: atlas.name,
      invoiceNumber: "ATL-1048",
      issueDate: new Date("2026-06-11"),
      dueDate: new Date("2026-07-11"),
      currency: "USD",
      subtotal: 1478.9,
      taxAmount: 125.71,
      totalAmount: 1604.61,
      status: InvoiceStatus.PENDING_APPROVAL,
      departmentId: operations.id,
      assignedApproverId: operationsLead.id,
      uploadedById: finance.id,
      reviewedById: finance.id,
      fileName: "atlas-office-supplies-atl-1048.pdf",
      filePath: "seed/atlas-office-supplies-atl-1048.pdf",
      extractionConfidence: 0.94,
      extractionWarnings: JSON.stringify(["Tax ID detected", "Line totals matched invoice total"]),
      lineItems: {
        create: [
          {
            description: "Warehouse labels and packing slips",
            quantity: 12,
            unitPrice: 48.5,
            taxAmount: 49.47,
            lineTotal: 631.47
          },
          {
            description: "Printer toner bundle",
            quantity: 5,
            unitPrice: 169.38,
            taxAmount: 76.24,
            lineTotal: 973.14
          }
        ]
      },
      auditLogs: {
        create: [
          {
            actorId: finance.id,
            action: "invoice.seeded",
            toStatus: InvoiceStatus.PENDING_APPROVAL,
            metadata: "Seeded as a pending invoice awaiting operations approval."
          }
        ]
      }
    }
  });

  await prisma.invoice.create({
    data: {
      vendorId: cloud.id,
      vendorNameRaw: cloud.name,
      invoiceNumber: "NCS-22091",
      issueDate: new Date("2026-06-01"),
      dueDate: new Date("2026-06-16"),
      currency: "USD",
      subtotal: 4200,
      taxAmount: 0,
      totalAmount: 4200,
      status: InvoiceStatus.APPROVED,
      departmentId: technology.id,
      assignedApproverId: itLead.id,
      uploadedById: finance.id,
      reviewedById: finance.id,
      approvedById: itLead.id,
      fileName: "northstar-cloud-ncs-22091.pdf",
      filePath: "seed/northstar-cloud-ncs-22091.pdf",
      extractionConfidence: 0.91,
      extractionWarnings: JSON.stringify(["No tax amount found", "Recurring vendor matched"]),
      lineItems: {
        create: [
          {
            description: "Managed cloud hosting subscription",
            quantity: 1,
            unitPrice: 4200,
            taxAmount: 0,
            lineTotal: 4200
          }
        ]
      },
      approvalDecisions: {
        create: [
          {
            approverId: itLead.id,
            decision: "APPROVED",
            comment: "Matches monthly infrastructure run rate."
          }
        ]
      },
      auditLogs: {
        create: [
          {
            actorId: itLead.id,
            action: "approval.approved",
            fromStatus: InvoiceStatus.PENDING_APPROVAL,
            toStatus: InvoiceStatus.APPROVED,
            metadata: "Seeded approved invoice for export workflow."
          }
        ]
      }
    }
  });

  await prisma.invoice.create({
    data: {
      vendorId: logistics.id,
      vendorNameRaw: logistics.name,
      invoiceNumber: "HL-7762",
      issueDate: new Date("2026-05-20"),
      dueDate: new Date("2026-06-19"),
      currency: "USD",
      subtotal: 8125,
      taxAmount: 568.75,
      totalAmount: 8693.75,
      status: InvoiceStatus.PENDING_APPROVAL,
      departmentId: operations.id,
      assignedApproverId: financeLead.id,
      uploadedById: finance.id,
      reviewedById: finance.id,
      fileName: "harbor-logistics-hl-7762.pdf",
      filePath: "seed/harbor-logistics-hl-7762.pdf",
      extractionConfidence: 0.89,
      extractionWarnings: JSON.stringify(["High amount routed to finance lead", "Due date is approaching"]),
      lineItems: {
        create: [
          {
            description: "Freight consolidation and regional delivery",
            quantity: 1,
            unitPrice: 8125,
            taxAmount: 568.75,
            lineTotal: 8693.75
          }
        ]
      },
      auditLogs: {
        create: [
          {
            actorId: finance.id,
            action: "routing.escalated",
            fromStatus: InvoiceStatus.NEEDS_REVIEW,
            toStatus: InvoiceStatus.PENDING_APPROVAL,
            metadata: "Amount exceeded finance approval threshold."
          }
        ]
      }
    }
  });

  await prisma.invoice.create({
    data: {
      vendorNameRaw: "Metro Cleaning Co.",
      invoiceNumber: "MCC-3318",
      issueDate: new Date("2026-06-21"),
      dueDate: new Date("2026-07-21"),
      currency: "USD",
      subtotal: 980,
      taxAmount: 78.4,
      totalAmount: 1058.4,
      status: InvoiceStatus.NEEDS_REVIEW,
      departmentId: operations.id,
      uploadedById: finance.id,
      fileName: "metro-cleaning-mcc-3318.jpg",
      filePath: "seed/metro-cleaning-mcc-3318.jpg",
      extractionConfidence: 0.72,
      extractionWarnings: JSON.stringify(["Vendor is not in master data", "Payment terms were not detected"]),
      lineItems: {
        create: [
          {
            description: "Office cleaning services",
            quantity: 1,
            unitPrice: 980,
            taxAmount: 78.4,
            lineTotal: 1058.4
          }
        ]
      },
      auditLogs: {
        create: [
          {
            actorId: finance.id,
            action: "extraction.completed",
            fromStatus: InvoiceStatus.UPLOADED,
            toStatus: InvoiceStatus.NEEDS_REVIEW,
            metadata: "Seeded invoice requiring human review because vendor was unknown."
          }
        ]
      }
    }
  });

  await prisma.invoice.create({
    data: {
      vendorId: atlas.id,
      vendorNameRaw: atlas.name,
      invoiceNumber: "ATL-1048",
      issueDate: new Date("2026-06-12"),
      dueDate: new Date("2026-07-12"),
      currency: "USD",
      subtotal: 1478.9,
      taxAmount: 125.71,
      totalAmount: 1604.61,
      status: InvoiceStatus.CHANGES_REQUESTED,
      departmentId: operations.id,
      assignedApproverId: operationsLead.id,
      uploadedById: finance.id,
      reviewedById: finance.id,
      duplicateOfInvoiceId: officeInvoice.id,
      fileName: "atlas-office-supplies-duplicate.pdf",
      filePath: "seed/atlas-office-supplies-duplicate.pdf",
      extractionConfidence: 0.86,
      extractionWarnings: JSON.stringify(["Possible duplicate of ATL-1048", "Approver requested finance review"]),
      lineItems: {
        create: [
          {
            description: "Warehouse labels and packing slips",
            quantity: 12,
            unitPrice: 48.5,
            taxAmount: 49.47,
            lineTotal: 631.47
          },
          {
            description: "Printer toner bundle",
            quantity: 5,
            unitPrice: 169.38,
            taxAmount: 76.24,
            lineTotal: 973.14
          }
        ]
      },
      approvalDecisions: {
        create: [
          {
            approverId: operationsLead.id,
            decision: "CHANGES_REQUESTED",
            comment: "Looks like the same invoice number as ATL-1048. Please confirm before approval."
          }
        ]
      },
      auditLogs: {
        create: [
          {
            actorId: operationsLead.id,
            action: "approval.changes_requested",
            fromStatus: InvoiceStatus.PENDING_APPROVAL,
            toStatus: InvoiceStatus.CHANGES_REQUESTED,
            metadata: "Duplicate review requested."
          }
        ]
      }
    }
  });

  console.log("Seeded APFlow demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
