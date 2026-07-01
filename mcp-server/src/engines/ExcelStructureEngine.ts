/**
 * ExcelStructureEngine — HCAP02 Excel sheet/range structural parser.
 *
 * Pure-core structural model of an Excel workbook: pre-parsed cell arrays
 * (caller-supplied) → typed sheets + ranges + headers + computed-column
 * detection.  Operator's Excel files (BOM, quote ledger, capacity plan)
 * become first-class PSN-queryable data through this engine.
 *
 * No `xlsx` runtime dependency here — caller drives the workbook parsing
 * and hands the engine a JSON cell-array.  The engine produces an analyzed
 * `ExcelStructure` that downstream PSN nodes consume.
 *
 * @module engines/ExcelStructureEngine
 */

import { z } from "zod";

export const CellTypeSchema = z.enum(["text", "number", "boolean", "date", "formula", "empty"]);
export type CellType = z.infer<typeof CellTypeSchema>;

export const ExcelCellSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  value: z.unknown().optional(),
  type: CellTypeSchema,
  formula: z.string().optional(),
});
export type ExcelCell = z.infer<typeof ExcelCellSchema>;

export const ExcelSheetSchema = z.object({
  sheet_name: z.string().min(1).max(120),
  cells: z.array(ExcelCellSchema),
});
export type ExcelSheet = z.infer<typeof ExcelSheetSchema>;

export interface ExcelStructure {
  sheet_name: string;
  row_count: number;
  col_count: number;
  header_row?: number;
  headers: string[];
  numeric_columns: number[];
  formula_columns: number[];
  empty_ratio: number;
}

export class ExcelStructureEngine {
  static validateCell(c: unknown): ExcelCell { return ExcelCellSchema.parse(c); }
  static validateSheet(s: unknown): ExcelSheet { return ExcelSheetSchema.parse(s); }

  /** Analyze a parsed sheet to extract headers, column types, density. */
  static analyze(sheet: ExcelSheet): ExcelStructure {
    ExcelSheetSchema.parse(sheet);
    const cells = sheet.cells;
    if (cells.length === 0) {
      return {
        sheet_name: sheet.sheet_name,
        row_count: 0, col_count: 0,
        headers: [], numeric_columns: [], formula_columns: [],
        empty_ratio: 1,
      };
    }

    const maxRow = cells.reduce((m, c) => Math.max(m, c.row), 0);
    const maxCol = cells.reduce((m, c) => Math.max(m, c.col), 0);
    const row_count = maxRow + 1;
    const col_count = maxCol + 1;
    const total_cells = row_count * col_count;
    const non_empty = cells.filter((c) => c.type !== "empty").length;
    const empty_ratio = total_cells === 0 ? 0 : (total_cells - non_empty) / total_cells;

    // Header heuristic: first row where every cell is type=text and value is a non-empty string.
    let header_row: number | undefined = undefined;
    const headers: string[] = [];
    for (let r = 0; r <= Math.min(maxRow, 5); r += 1) {
      const rowCells = cells.filter((c) => c.row === r);
      if (rowCells.length === 0) continue;
      const allText = rowCells.every((c) => c.type === "text" && typeof c.value === "string" && (c.value as string).length > 0);
      if (allText) {
        header_row = r;
        for (let col = 0; col <= maxCol; col += 1) {
          const h = rowCells.find((c) => c.col === col);
          headers.push(h && typeof h.value === "string" ? h.value : `col_${col}`);
        }
        break;
      }
    }

    // Per-column type detection (skip header row if found).
    const numeric_columns: number[] = [];
    const formula_columns: number[] = [];
    for (let col = 0; col <= maxCol; col += 1) {
      const dataCells = cells.filter(
        (c) => c.col === col && c.row !== header_row && c.type !== "empty",
      );
      if (dataCells.length === 0) continue;
      const numCount = dataCells.filter((c) => c.type === "number").length;
      const formCount = dataCells.filter((c) => c.type === "formula").length;
      if (numCount / dataCells.length > 0.7) numeric_columns.push(col);
      if (formCount > 0) formula_columns.push(col);
    }

    return {
      sheet_name: sheet.sheet_name,
      row_count, col_count,
      header_row, headers,
      numeric_columns, formula_columns,
      empty_ratio,
    };
  }

  /** Extract a column's data (skipping header row) as typed values. */
  static columnValues(sheet: ExcelSheet, col: number, header_row?: number): unknown[] {
    return sheet.cells
      .filter((c) => c.col === col && c.row !== header_row && c.type !== "empty")
      .sort((a, b) => a.row - b.row)
      .map((c) => c.value);
  }

  /** Render structure summary. */
  static renderStructure(s: ExcelStructure): string {
    return [
      `[EXCEL ${s.sheet_name}] ${s.row_count}×${s.col_count} cells (empty ratio ${(s.empty_ratio * 100).toFixed(1)}%)`,
      `  header_row=${s.header_row ?? "-"}  headers=[${s.headers.slice(0, 5).join(", ")}${s.headers.length > 5 ? ", …" : ""}]`,
      `  numeric_cols=[${s.numeric_columns.join(",")}]  formula_cols=[${s.formula_columns.join(",")}]`,
    ].join("\n");
  }
}

export const excelStructureEngine = ExcelStructureEngine;
