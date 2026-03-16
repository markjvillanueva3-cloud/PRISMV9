/**
 * useExport — Data export utilities
 * UX-MS1: CSV/JSON export from any tabular data
 */

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  format?: (value: unknown) => string;
}

/**
 * Convert array of objects to CSV string.
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
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

/**
 * Convert array of objects to JSON string.
 */
export function toJSON<T>(data: T[], pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
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

/**
 * Hook-like utility for exporting data.
 */
export function useExport<T extends Record<string, unknown>>(
  columns: ExportColumn<T>[]
) {
  const exportCSV = (data: T[], filename = "export.csv") => {
    const csv = toCSV(data, columns);
    downloadFile(csv, filename, "text/csv;charset=utf-8;");
  };

  const exportJSON = (data: T[], filename = "export.json") => {
    const json = toJSON(data);
    downloadFile(json, filename, "application/json");
  };

  return { exportCSV, exportJSON };
}
