import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  lineTotal: z.number().positive()
});

export const extractedInvoiceSchema = z.object({
  vendorName: z.string().min(1),
  vendorTaxId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  currency: z.string().min(3).max(3),
  subtotal: z.number().positive(),
  taxAmount: z.number().nonnegative(),
  totalAmount: z.number().positive(),
  paymentTerms: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  lineItems: z.array(lineItemSchema).min(1)
});

export type ExtractedInvoiceDraft = z.infer<typeof extractedInvoiceSchema>;

export async function extractInvoiceDraft(fileName: string): Promise<ExtractedInvoiceDraft> {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("cloud") || normalized.includes("northstar")) {
    return extractedInvoiceSchema.parse({
      vendorName: "Northstar Cloud Services",
      vendorTaxId: "US-113-904",
      invoiceNumber: `NCS-${Math.floor(30000 + normalized.length * 17)}`,
      issueDate: "2026-06-25",
      dueDate: "2026-07-10",
      currency: "USD",
      subtotal: 4200,
      taxAmount: 0,
      totalAmount: 4200,
      paymentTerms: "Net 15",
      confidence: 0.9,
      warnings: ["No tax line detected", "Recurring vendor matched from master data"],
      lineItems: [
        {
          description: "Managed cloud hosting subscription",
          quantity: 1,
          unitPrice: 4200,
          taxAmount: 0,
          lineTotal: 4200
        }
      ]
    });
  }

  if (normalized.includes("logistics") || normalized.includes("freight")) {
    return extractedInvoiceSchema.parse({
      vendorName: "Harbor Logistics",
      vendorTaxId: "US-551-420",
      invoiceNumber: `HL-${Math.floor(8000 + normalized.length * 11)}`,
      issueDate: "2026-06-18",
      dueDate: "2026-07-18",
      currency: "USD",
      subtotal: 8125,
      taxAmount: 568.75,
      totalAmount: 8693.75,
      paymentTerms: "Net 30",
      confidence: 0.88,
      warnings: ["High amount invoice", "Approval will route to finance lead"],
      lineItems: [
        {
          description: "Freight consolidation and regional delivery",
          quantity: 1,
          unitPrice: 8125,
          taxAmount: 568.75,
          lineTotal: 8693.75
        }
      ]
    });
  }

  if (normalized.includes("atlas") || normalized.includes("office")) {
    return extractedInvoiceSchema.parse({
      vendorName: "Atlas Office Supplies",
      vendorTaxId: "US-847-291",
      invoiceNumber: `ATL-${Math.floor(1100 + normalized.length * 9)}`,
      issueDate: "2026-06-24",
      dueDate: "2026-07-24",
      currency: "USD",
      subtotal: 1478.9,
      taxAmount: 125.71,
      totalAmount: 1604.61,
      paymentTerms: "Net 30",
      confidence: 0.93,
      warnings: ["Vendor matched", "Line totals matched invoice total"],
      lineItems: [
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
    });
  }

  return extractedInvoiceSchema.parse({
    vendorName: "Metro Cleaning Co.",
    vendorTaxId: undefined,
    invoiceNumber: `MCC-${Math.floor(3500 + normalized.length * 13)}`,
    issueDate: "2026-06-21",
    dueDate: "2026-07-21",
    currency: "USD",
    subtotal: 980,
    taxAmount: 78.4,
    totalAmount: 1058.4,
    paymentTerms: undefined,
    confidence: 0.72,
    warnings: ["Vendor is not in master data", "Payment terms were not detected"],
    lineItems: [
      {
        description: "Office cleaning services",
        quantity: 1,
        unitPrice: 980,
        taxAmount: 78.4,
        lineTotal: 1058.4
      }
    ]
  });
}
