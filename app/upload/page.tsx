import { UploadCloud } from "lucide-react";

const errorLabels: Record<string, string> = {
  "missing-file": "Choose a PDF, PNG, JPG, or JPEG invoice file.",
  "unsupported-type": "Only PDF, PNG, JPG, and JPEG invoices are accepted."
};

export default function UploadPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error ? errorLabels[searchParams.error] : null;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Invoice Intake</p>
          <h1>Upload invoice</h1>
          <p className="muted">AI extraction creates a draft for finance review.</p>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <form
        action="/api/invoices/upload"
        method="post"
        encType="multipart/form-data"
        className="upload-zone"
      >
        <UploadCloud size={52} aria-hidden="true" />
        <div>
          <h2>New invoice file</h2>
          <p className="muted">PDF, PNG, JPG, or JPEG. Maximum request size is 8 MB.</p>
        </div>
        <input
          aria-label="Invoice file"
          name="invoiceFile"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          required
        />
        <button type="submit">Start intake</button>
      </form>
    </>
  );
}
