import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";

const contentTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function contentDisposition(disposition: "inline" | "attachment", fileName: string) {
  const safeFileName = fileName.replace(/["\r\n]/g, "") || "invoice";
  return `${disposition}; filename="${safeFileName}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id }
  });
  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";

  if (!invoice || invoice.filePath.startsWith("seed/")) {
    return Response.json({ error: "File is not available." }, { status: 404 });
  }

  const uploadRoot = path.resolve(process.cwd(), "uploads");
  const resolvedPath = path.resolve(invoice.filePath);

  if (!resolvedPath.startsWith(uploadRoot)) {
    return Response.json({ error: "File path is outside upload storage." }, { status: 403 });
  }

  try {
    const file = await readFile(resolvedPath);
    const extension = path.extname(invoice.fileName).toLowerCase();

    return new Response(file, {
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Content-Disposition": contentDisposition(disposition, invoice.fileName)
      }
    });
  } catch {
    return Response.json({ error: "File could not be read." }, { status: 404 });
  }
}
