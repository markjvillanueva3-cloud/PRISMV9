/**
 * DownloadButtons — Download optimized G-code, HTML report, JSON report.
 */

interface DownloadButtonsProps {
  optimizedGcode: string;
  reportHtml: string;
  reportJson: string;
  programName: string;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DownloadButtons({
  optimizedGcode,
  reportHtml,
  reportJson,
  programName,
}: DownloadButtonsProps) {
  const baseName = programName.replace(/\.[^.]+$/, '') || 'optimized';

  return (
    <div className="flex flex-wrap gap-3">
      {optimizedGcode && (
        <button
          type="button"
          onClick={() => downloadBlob(optimizedGcode, `${baseName}-optimized.nc`, 'text/plain')}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <span>&#x2B07;</span>
          Optimized G-code
        </button>
      )}
      {reportHtml && (
        <button
          type="button"
          onClick={() => downloadBlob(reportHtml, `${baseName}-report.html`, 'text/html')}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/20"
        >
          <span>&#x2B07;</span>
          HTML Report
        </button>
      )}
      {reportJson && (
        <button
          type="button"
          onClick={() => downloadBlob(reportJson, `${baseName}-report.json`, 'application/json')}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20"
        >
          <span>&#x2B07;</span>
          JSON Report
        </button>
      )}
    </div>
  );
}
