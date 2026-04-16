/**
 * ExportButton — Data export dropdown component (CSV/JSON).
 * Ported from mcp-server/web with self-contained export utilities.
 */
import { useState, useRef, useEffect } from "react";

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  format?: (value: unknown) => string;
}

function toCSV<T extends Record<string, unknown>>(data: T[], columns: ExportColumn<T>[]): string {
  const header = columns.map(c => `"${c.header}"`).join(",");
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key];
      const formatted = col.format ? col.format(val) : String(val ?? "");
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function toJSON<T>(data: T[]): string {
  return JSON.stringify(data, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ExportColumn<T>[];
  filenameBase?: string;
  label?: string;
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filenameBase = "prism-export",
  label = "Export",
}: ExportButtonProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timestamp = new Date().toISOString().slice(0, 10);

  const handleExport = (format: "csv" | "json") => {
    const filename = `${filenameBase}-${timestamp}.${format}`;
    if (format === "csv") {
      downloadFile(toCSV(data, columns), filename, "text/csv;charset=utf-8;");
    } else {
      downloadFile(toJSON(data), filename, "application/json");
    }
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-primary-600 text-white rounded text-xs font-medium flex items-center gap-1.5 hover:bg-primary-700 transition-colors"
      >
        {label} ({data.length}) <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg z-50 min-w-[140px]">
          <button
            onClick={() => handleExport("csv")}
            className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            CSV (.csv)
          </button>
          <button
            onClick={() => handleExport("json")}
            className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700 transition-colors"
          >
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  );
}
