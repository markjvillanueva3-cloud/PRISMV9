/**
 * CSVStructureEngine — HCAP04 CSV structural parser (companion to HCAP02 Excel).
 *
 * Pure-core: caller supplies pre-parsed rows (string[][]); engine produces
 * headers + per-column type inference + row count.
 *
 * @module engines/CSVStructureEngine
 */

import { z } from "zod";

export const CSVRowSchema = z.array(z.string()).max(1000);
export type CSVRow = z.infer<typeof CSVRowSchema>;

export const InferredColumnTypeSchema = z.enum(["text", "number", "boolean", "date", "mixed", "empty"]);
export type InferredColumnType = z.infer<typeof InferredColumnTypeSchema>;

export interface CSVStructure {
  document_id: string;
  row_count: number;
  col_count: number;
  has_header: boolean;
  headers: string[];
  column_types: InferredColumnType[];
  empty_cell_ratio: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function inferType(values: readonly string[]): InferredColumnType {
  const non_empty = values.filter((v) => v !== "");
  if (non_empty.length === 0) return "empty";
  let numeric = 0, bool = 0, date = 0;
  for (const v of non_empty) {
    if (!Number.isNaN(Number(v)) && v.trim() !== "") numeric += 1;
    else if (/^(true|false)$/i.test(v)) bool += 1;
    else if (DATE_RE.test(v)) date += 1;
  }
  const total = non_empty.length;
  if (numeric / total > 0.7) return "number";
  if (bool / total > 0.7) return "boolean";
  if (date / total > 0.7) return "date";
  if (numeric + bool + date === 0) return "text";
  return "mixed";
}

export class CSVStructureEngine {
  /** Analyze rows; first row treated as header iff every cell is non-empty + non-numeric. */
  static analyze(document_id: string, rows: readonly CSVRow[]): CSVStructure {
    if (!document_id) throw new Error("CSVStructure.analyze: document_id required");
    if (!Array.isArray(rows)) throw new Error("CSVStructure.analyze: rows must be an array");
    for (const r of rows) CSVRowSchema.parse(r);
    if (rows.length === 0) {
      return {
        document_id, row_count: 0, col_count: 0, has_header: false,
        headers: [], column_types: [], empty_cell_ratio: 1,
      };
    }
    const col_count = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const total_cells = rows.length * col_count;
    let empty_cells = 0;
    for (const r of rows) {
      for (let c = 0; c < col_count; c += 1) {
        if ((r[c] ?? "") === "") empty_cells += 1;
      }
    }
    const first = rows[0];
    const headerIsText = first.length === col_count
      && first.every((cell) => cell !== "" && Number.isNaN(Number(cell)));
    const has_header = headerIsText;
    const headers = has_header
      ? first.slice(0, col_count)
      : Array.from({ length: col_count }, (_, i) => `col_${i}`);
    const data = has_header ? rows.slice(1) : rows;
    const column_types: InferredColumnType[] = [];
    for (let c = 0; c < col_count; c += 1) {
      const col = data.map((r) => r[c] ?? "");
      column_types.push(inferType(col));
    }
    return {
      document_id, row_count: rows.length, col_count,
      has_header, headers, column_types,
      empty_cell_ratio: total_cells === 0 ? 0 : empty_cells / total_cells,
    };
  }

  static renderStructure(s: CSVStructure): string {
    return [
      `[CSV ${s.document_id}] ${s.row_count}×${s.col_count} (empty ${(s.empty_cell_ratio * 100).toFixed(1)}%)`,
      `  header=${s.has_header ? "[" + s.headers.slice(0, 5).join(",") + "]" : "-"}`,
      `  types: [${s.column_types.join(", ")}]`,
    ].join("\n");
  }
}

export const csvStructureEngine = CSVStructureEngine;
