// Plain links rather than a fetch+blob dance: a same-origin GET already
// carries the session cookie, and the export routes respond with
// Content-Disposition: attachment, so the browser just downloads the file.
export default function ExportButtons() {
  return (
    <div className="flex items-center gap-2">
      <a
        href="/api/export/xlsx"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Exportar Excel
      </a>
      <a
        href="/api/export/pdf"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        Exportar PDF
      </a>
    </div>
  );
}
