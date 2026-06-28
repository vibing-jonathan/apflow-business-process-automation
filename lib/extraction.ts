import "server-only";

import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative(),
  lineTotal: z.coerce.number().positive()
});

export const extractedInvoiceSchema = z.object({
  vendorName: z.string().min(1),
  vendorTaxId: z.string().optional(),
  invoiceNumber: z.string().min(1),
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  currency: z.string().min(3).max(3),
  subtotal: z.coerce.number().positive(),
  taxAmount: z.coerce.number().nonnegative(),
  totalAmount: z.coerce.number().positive(),
  paymentTerms: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1),
  warnings: z.array(z.string()),
  lineItems: z.array(lineItemSchema).min(1)
});

export type ExtractedInvoiceDraft = z.infer<typeof extractedInvoiceSchema>;

export class InvoiceExtractionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "InvoiceExtractionError";
  }
}

export type InvoiceExtractionInput = {
  fileName: string;
  mimeType: string;
  data: Buffer;
};

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const invoiceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "vendorName",
    "vendorTaxId",
    "invoiceNumber",
    "issueDate",
    "dueDate",
    "currency",
    "subtotal",
    "taxAmount",
    "totalAmount",
    "paymentTerms",
    "purchaseOrderNumber",
    "confidence",
    "warnings",
    "lineItems"
  ],
  properties: {
    vendorName: { type: "string" },
    vendorTaxId: { type: "string" },
    invoiceNumber: { type: "string" },
    issueDate: { type: "string", format: "date" },
    dueDate: { type: "string", format: "date" },
    currency: { type: "string" },
    subtotal: { type: "number", minimum: 0 },
    taxAmount: { type: "number", minimum: 0 },
    totalAmount: { type: "number", minimum: 0 },
    paymentTerms: { type: "string" },
    purchaseOrderNumber: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    lineItems: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["description", "quantity", "unitPrice", "taxAmount", "lineTotal"],
        properties: {
          description: { type: "string" },
          quantity: { type: "number", minimum: 0 },
          unitPrice: { type: "number", minimum: 0 },
          taxAmount: { type: "number", minimum: 0 },
          lineTotal: { type: "number", minimum: 0 }
        }
      }
    }
  },
  propertyOrdering: [
    "vendorName",
    "vendorTaxId",
    "invoiceNumber",
    "issueDate",
    "dueDate",
    "currency",
    "subtotal",
    "taxAmount",
    "totalAmount",
    "paymentTerms",
    "purchaseOrderNumber",
    "confidence",
    "warnings",
    "lineItems"
  ]
} as const;

function getGeminiApiKey(): string | undefined {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ].find((value): value is string => Boolean(value?.trim()))?.trim();
}

function normalizeOptionalStrings(draft: ExtractedInvoiceDraft): ExtractedInvoiceDraft {
  return {
    ...draft,
    vendorTaxId: draft.vendorTaxId?.trim() || undefined,
    paymentTerms: draft.paymentTerms?.trim() || undefined,
    purchaseOrderNumber: draft.purchaseOrderNumber?.trim() || undefined,
    currency: draft.currency.toUpperCase()
  };
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return JSON.parse(trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
  }

  return JSON.parse(trimmed);
}

async function extractWithGemini(input: InvoiceExtractionInput): Promise<ExtractedInvoiceDraft> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new InvoiceExtractionError("Gemini API key is not set in the OS environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Extract structured invoice data from the attached invoice.",
              "Return only JSON matching the response schema.",
              "Use ISO 8601 YYYY-MM-DD dates.",
              "Use a three-letter ISO currency code; use USD only if the currency is not visible.",
              "Use 0 for missing numeric tax amounts.",
              "Use an empty string for unknown optional text fields.",
              "If invoice number or vendor name is unclear, use UNKNOWN and add a warning.",
              "If line items are not visible, create one line item named Invoice total with quantity 1.",
              `Original filename: ${input.fileName}`
            ].join(" ")
          },
          createPartFromBase64(input.data.toString("base64"), input.mimeType)
        ]
      }
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: invoiceJsonSchema
    }
  });

  if (!response.text) {
    throw new InvoiceExtractionError("Gemini returned an empty extraction response.");
  }

  const parsed = extractedInvoiceSchema.parse(parseGeminiJson(response.text));
  return normalizeOptionalStrings(parsed);
}

export async function extractInvoiceDraft(
  input: InvoiceExtractionInput
): Promise<ExtractedInvoiceDraft> {
  const provider = process.env.APFLOW_EXTRACTION_PROVIDER?.toLowerCase();

  if (provider === "mock" || !getGeminiApiKey()) {
    return extractMockInvoiceDraft(input.fileName);
  }

  try {
    return await extractWithGemini(input);
  } catch (error) {
    throw new InvoiceExtractionError("Gemini invoice extraction failed.", error);
  }
}

export function extractMockInvoiceDraft(fileName: string): ExtractedInvoiceDraft {
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
