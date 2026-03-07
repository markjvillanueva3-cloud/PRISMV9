/**
 * ExportButton — Data export dropdown component
 * UX-MS1: One-click CSV/JSON export for any data table
 */
import { useState, useRef, useEffect } from "react";
import { type ExportColumn, toCSV, toJSON, downloadFile } from "../hooks/useExport";

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
        style={{
          padding: "6px 14px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label} ({data.length})
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: 100,
            minWidth: 140,
          }}
        >
          <button
            onClick={() => handleExport("csv")}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              color: "#e2e8f0",
              textAlign: "left",
              cursor: "pointer",
              fontSize: 13,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#334155")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            CSV (.csv)
          </button>
          <button
            onClick={() => handleExport("json")}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              color: "#e2e8f0",
              textAlign: "left",
              cursor: "pointer",
              fontSize: 13,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#334155")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            JSON (.json)
          </button>
        </div>
      )}
    </div>
  );
}
