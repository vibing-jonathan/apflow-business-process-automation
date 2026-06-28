import { NextResponse } from "next/server";

import { getActiveUser } from "@/lib/data";
import { createInvoiceFromFile } from "@/lib/invoice-intake";

export async function POST(request: Request) {
  const formData = await request.formData();
  const activeUser = await getActiveUser();
  const result = await createInvoiceFromFile(formData.get("invoiceFile"), activeUser.id);

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/upload?error=${result.error}`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/invoices/${result.invoiceId}`, request.url), 303);
}
