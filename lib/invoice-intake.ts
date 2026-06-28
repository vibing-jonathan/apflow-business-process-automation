import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildReviewWarnings, detectDuplicateInvoice, findVendorByName } from "@/lib/automation";
import { InvoiceExtractionError, extractInvoiceDraft } from "@/lib/extraction";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@/lib/status";

const uploadDirectory = path.join(process.cwd(), "uploads");
const acceptedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg"]);

export type IntakeResult =
  | {
      ok: true;
      invoiceId: string;
    }
  | {
      ok: false;
      error: "missing-file" | "unsupported-type";
    };

function safeFileName(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path
    .basename(fileName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${Date.now()}-${baseName || "invoice"}${extension}`;
}

function inferMimeType(file: File, extension: string): string {
  if (file.type) {
    return file.type;
  }

  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function extractionErrorMessage(error: unknown): string {
  if (error instanceof InvoiceExtractionError) {
    const cause = error.cause instanceof Error ? ` ${error.cause.message}` : "";
    return `${error.message}${cause}`.trim();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown extraction failure.";
}

export async function createInvoiceFromFile(
  file: FormDataEntryValue | null,
  activeUserId: string
): Promise<IntakeResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "missing-file" };
  }

  const extension = path.extname(file.name).toLowerCase();
  if (!acceptedExtensions.has(extension)) {
    return { ok: false, error: "unsupported-type" };
  }

  await mkdir(uploadDirectory, { recursive: true });

  const storedFileName = safeFileName(file.name);
  const storedPath = path.join(uploadDirectory, storedFileName);
  const mimeType = inferMimeType(file, extension);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storedPath, bytes);

  let draft;
  try {
    draft = await extractInvoiceDraft({
      fileName: file.name,
      mimeType,
      data: bytes
    });
  } catch (error) {
    const failureMessage = extractionErrorMessage(error);
    const invoice = await prisma.invoice.create({
      data: {
        vendorNameRaw: "Extraction unavailable",
        status: InvoiceStatus.EXTRACTION_FAILED,
        uploadedById: activeUserId,
        fileName: file.name,
        filePath: storedPath,
        extractionConfidence: 0,
        extractionWarnings: JSON.stringify([failureMessage]),
        auditLogs: {
          create: [
            {
              actorId: activeUserId,
              action: "invoice.uploaded",
              toStatus: InvoiceStatus.UPLOADED,
              metadata: `Stored file as ${storedFileName}.`
            },
            {
              actorId: activeUserId,
              action: "extraction.failed",
              fromStatus: InvoiceStatus.UPLOADED,
              toStatus: InvoiceStatus.EXTRACTION_FAILED,
              metadata: failureMessage
            }
          ]
        }
      }
    });

    return { ok: true, invoiceId: invoice.id };
  }

  const vendor = await findVendorByName(draft.vendorName);
  const duplicate = await detectDuplicateInvoice({
    vendorId: vendor?.id,
    vendorNameRaw: draft.vendorName,
    invoiceNumber: draft.invoiceNumber
  });
  const lineTotal = draft.lineItems.reduce((total, item) => total + item.lineTotal, 0);
  const reviewWarnings = buildReviewWarnings({
    vendorNameRaw: draft.vendorName,
    invoiceNumber: draft.invoiceNumber,
    issueDate: new Date(`${draft.issueDate}T00:00:00.000Z`),
    dueDate: new Date(`${draft.dueDate}T00:00:00.000Z`),
    totalAmount: draft.totalAmount,
    subtotal: draft.subtotal,
    taxAmount: draft.taxAmount,
    discountAmount: draft.discountAmount,
    adjustmentAmount: draft.adjustmentAmount,
    lineTotal,
    extractionConfidence: draft.confidence,
    duplicateInvoiceNumber: duplicate?.invoiceNumber
  });

  const extractionWarnings = Array.from(new Set([
    ...draft.warnings,
    ...reviewWarnings
  ]));

  const invoice = await prisma.invoice.create({
    data: {
      vendorId: vendor?.id,
      vendorNameRaw: draft.vendorName,
      invoiceNumber: draft.invoiceNumber,
      issueDate: new Date(`${draft.issueDate}T00:00:00.000Z`),
      dueDate: new Date(`${draft.dueDate}T00:00:00.000Z`),
      currency: draft.currency,
      subtotal: draft.subtotal,
      taxAmount: draft.taxAmount,
      discountAmount: draft.discountAmount,
      adjustmentAmount: draft.adjustmentAmount,
      totalAmount: draft.totalAmount,
      status: InvoiceStatus.NEEDS_REVIEW,
      departmentId: vendor?.defaultDepartmentId,
      uploadedById: activeUserId,
      fileName: file.name,
      filePath: storedPath,
      extractionConfidence: draft.confidence,
      extractionWarnings: JSON.stringify(extractionWarnings),
      duplicateOfInvoiceId: duplicate?.id,
      lineItems: {
        create: draft.lineItems
      },
      auditLogs: {
        create: [
          {
            actorId: activeUserId,
            action: "invoice.uploaded",
            toStatus: InvoiceStatus.UPLOADED,
            metadata: `Stored file as ${storedFileName}.`
          },
          {
            actorId: activeUserId,
            action: "extraction.completed",
            fromStatus: InvoiceStatus.UPLOADED,
            toStatus: InvoiceStatus.NEEDS_REVIEW,
            metadata: JSON.stringify({ confidence: draft.confidence, warnings: extractionWarnings })
          }
        ]
      }
    }
  });

  return { ok: true, invoiceId: invoice.id };
}
