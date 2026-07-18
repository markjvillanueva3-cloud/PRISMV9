/**
 * CLI Output Formatters — 4 modes for different use cases.
 * - json: machine-readable, pipe-friendly
 * - table: human-readable terminal output
 * - csv: spreadsheet/pipe-friendly
 * - compact: minimal key=value pairs
 */

export type OutputFormat = "json" | "table" | "csv" | "compact";

/** Format data for CLI output. */
export function formatOutput(data: unknown, format: OutputFormat): string {
  if (data === null || data === undefined) return "";

  switch (format) {
    case "json": return formatJson(data);
    case "table": return formatTable(data);
    case "csv": return formatCsv(data);
    case "compact": return formatCompact(data);
    default: return formatJson(data);
  }
}

function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Format as ASCII table for terminal display. */
function formatTable(data: unknown): string {
  if (typeof data !== "object" || data === null) return String(data);

  // If it's an array of objects, show as rows
  if (Array.isArray(data)) {
    if (data.length === 0) return "(empty)";
    if (typeof data[0] !== "object") return data.join("\n");
    return arrayToTable(data as Record<string, unknown>[]);
  }

  // Single object — show as key/value pairs
  return objectToKeyValue(data as Record<string, unknown>);
}

/** Render array of objects as ASCII table. */
function arrayToTable(rows: Record<string, unknown>[]): string {
  const keys = Object.keys(rows[0]).filter(k => {
    // Skip deeply nested objects for table display
    const v = rows[0][k];
    return typeof v !== "object" || v === null;
  });
  if (keys.length === 0) return formatJson(rows);

  // Calculate column widths
  const widths = keys.map(k => Math.max(
    k.length,
    ...rows.map(r => String(r[k] ?? "").length)
  ));

  // Cap at 30 chars per column
  const cappedWidths = widths.map(w => Math.min(w, 30));

  // Header
  const header = keys.map((k, i) => k.padEnd(cappedWidths[i])).join(" │ ");
  const separator = cappedWidths.map(w => "─".repeat(w)).join("─┼─");

  // Rows
  const rowLines = rows.map(r =>
    keys.map((k, i) => String(r[k] ?? "").padEnd(cappedWidths[i]).slice(0, cappedWidths[i])).join(" │ ")
  );

  return [header, separator, ...rowLines].join("\n");
}

/** Render single object as key/value pairs. */
function objectToKeyValue(obj: Record<string, unknown>, prefix = "", depth = 0): string {
  if (depth > 2) return `${prefix}${formatJson(obj)}`;

  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      lines.push(`── ${label} ──`);
      lines.push(objectToKeyValue(val as Record<string, unknown>, "", depth + 1));
    } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") {
      lines.push(`── ${label} (${val.length} items) ──`);
      lines.push(arrayToTable(val as Record<string, unknown>[]));
    } else {
      const formatted = typeof val === "number" ? formatNumber(val, key) : String(val ?? "");
      lines.push(`  ${key.padEnd(25)} ${formatted}`);
    }
  }
  return lines.join("\n");
}

/** Smart number formatting based on field name hints. */
function formatNumber(n: number, key: string): string {
  if (key.includes("rpm") || key.includes("RPM")) return `${Math.round(n)} rpm`;
  if (key.includes("feed") && key.includes("min")) return `${Math.round(n)} mm/min`;
  if (key.includes("force") || key.includes("_N")) return `${Math.round(n)} N`;
  if (key.includes("power") || key.includes("_kW")) return `${n.toFixed(2)} kW`;
  if (key.includes("torque") || key.includes("_Nm")) return `${n.toFixed(2)} Nm`;
  if (key.includes("life") && key.includes("min")) return `${n.toFixed(1)} min`;
  if (key.includes("Ra") || key.includes("_um")) return `${n.toFixed(2)} µm`;
  if (key.includes("price") || key.includes("cost") || key.includes("_usd")) return `$${n.toFixed(2)}`;
  if (key.includes("pct") || key.includes("percent")) return `${n.toFixed(1)}%`;
  if (key.includes("time") && key.includes("sec")) return `${n.toFixed(1)}s`;
  if (key.includes("mm") || key.includes("diameter")) return `${n.toFixed(3)} mm`;
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4);
}

/** Format as CSV. */
function formatCsv(data: unknown): string {
  if (!Array.isArray(data)) {
    // Single object → single row with headers
    if (typeof data === "object" && data !== null) {
      const flat = flattenObject(data as Record<string, unknown>);
      const keys = Object.keys(flat);
      const vals = keys.map(k => csvEscape(String(flat[k] ?? "")));
      return keys.join(",") + "\n" + vals.join(",");
    }
    return String(data);
  }

  if (data.length === 0) return "";
  const keys = Object.keys(flattenObject(data[0] as Record<string, unknown>));
  const header = keys.join(",");
  const rows = data.map(item => {
    const flat = flattenObject(item as Record<string, unknown>);
    return keys.map(k => csvEscape(String(flat[k] ?? ""))).join(",");
  });
  return [header, ...rows].join("\n");
}

/** Format as compact key=value pairs (one line). */
function formatCompact(data: unknown): string {
  if (typeof data !== "object" || data === null) return String(data);
  const flat = flattenObject(data as Record<string, unknown>);
  return Object.entries(flat)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
}

/** Flatten nested object with dot notation. */
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val as Record<string, unknown>, path));
    } else {
      result[path] = val;
    }
  }
  return result;
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
