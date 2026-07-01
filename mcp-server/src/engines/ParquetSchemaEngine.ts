/**
 * ParquetSchemaEngine — HCAP11 Parquet/columnar-table schema model.
 *
 * Pure-core: caller drives the actual parquet read (parquetjs, arrow) and
 * supplies a schema description; engine validates + emits structure +
 * a per-column-type aggregate report.
 *
 * @module engines/ParquetSchemaEngine
 */

import { z } from "zod";

export const ParquetColumnTypeSchema = z.enum([
  "int32", "int64", "float", "double", "boolean", "byte_array", "fixed_len_byte_array",
]);
export type ParquetColumnType = z.infer<typeof ParquetColumnTypeSchema>;

export const ParquetColumnSchema = z.object({
  name: z.string().min(1).max(120),
  type: ParquetColumnTypeSchema,
  nullable: z.boolean().default(true),
  encoding: z.string().max(40).optional(),
});
export type ParquetColumn = z.infer<typeof ParquetColumnSchema>;

export const ParquetFileSchema = z.object({
  document_id: z.string().min(1).max(120),
  row_count: z.number().int().min(0),
  columns: z.array(ParquetColumnSchema).min(1).max(1000),
  size_bytes: z.number().int().min(0),
});
export type ParquetFile = z.infer<typeof ParquetFileSchema>;

export interface ParquetStructure {
  document_id: string;
  row_count: number;
  column_count: number;
  size_bytes: number;
  bytes_per_row: number;
  type_counts: Partial<Record<ParquetColumnType, number>>;
  nullable_count: number;
  required_count: number;
}

export class ParquetSchemaEngine {
  static validate(p: unknown): ParquetFile { return ParquetFileSchema.parse(p); }

  static analyze(file: ParquetFile): ParquetStructure {
    const f = ParquetFileSchema.parse(file);
    const type_counts: Partial<Record<ParquetColumnType, number>> = {};
    let nullable_count = 0;
    let required_count = 0;
    for (const c of f.columns) {
      type_counts[c.type] = (type_counts[c.type] ?? 0) + 1;
      if (c.nullable) nullable_count += 1; else required_count += 1;
    }
    return {
      document_id: f.document_id,
      row_count: f.row_count,
      column_count: f.columns.length,
      size_bytes: f.size_bytes,
      bytes_per_row: f.row_count === 0 ? 0 : f.size_bytes / f.row_count,
      type_counts, nullable_count, required_count,
    };
  }

  /** Find columns of a specific type. */
  static columnsOfType(file: ParquetFile, t: ParquetColumnType): ParquetColumn[] {
    ParquetColumnTypeSchema.parse(t);
    return file.columns.filter((c) => c.type === t);
  }

  static renderStructure(s: ParquetStructure): string {
    const types = Object.entries(s.type_counts).map(([t, n]) => `${t}=${n}`).join(", ");
    return `[PARQUET ${s.document_id}] rows=${s.row_count} cols=${s.column_count} bytes/row=${s.bytes_per_row.toFixed(1)} types: ${types}`;
  }
}

export const parquetSchemaEngine = ParquetSchemaEngine;
