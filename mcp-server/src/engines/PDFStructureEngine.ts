/**
 * PDFStructureEngine — HCAP03 PDF document structural model.
 *
 * Pure-core: caller supplies pre-extracted PDF text blocks (from pdfjs,
 * pdftotext, etc.); engine produces sections + table candidates + page
 * count + heading hierarchy.
 *
 * @module engines/PDFStructureEngine
 */

import { z } from "zod";

export const PDFBlockSchema = z.object({
  page: z.number().int().min(1),
  text: z.string().max(50_000),
  font_size: z.number().refine((v) => Number.isFinite(v) && v > 0, {}).optional(),
  is_bold: z.boolean().default(false),
});
export type PDFBlock = z.infer<typeof PDFBlockSchema>;

export interface PDFStructure {
  document_id: string;
  page_count: number;
  block_count: number;
  headings: { page: number; text: string; level: number }[];
  table_candidates: { page: number; line_count: number; aligned_cols: number }[];
  total_text_chars: number;
}

export class PDFStructureEngine {
  static validateBlock(b: unknown): PDFBlock { return PDFBlockSchema.parse(b); }

  /** Analyze blocks → headings (by font size / bold) + table candidates + counts. */
  static analyze(document_id: string, blocks: readonly PDFBlock[]): PDFStructure {
    if (!document_id) throw new Error("PDFStructure.analyze: document_id required");
    if (!Array.isArray(blocks)) throw new Error("PDFStructure.analyze: blocks must be an array");
    for (const b of blocks) PDFBlockSchema.parse(b);

    const page_count = blocks.reduce((m, b) => Math.max(m, b.page), 0);
    const block_count = blocks.length;
    const total_text_chars = blocks.reduce((s, b) => s + b.text.length, 0);

    // Heading detection: bold-or-large-font blocks short enough to be a title.
    const fontSizes = blocks
      .map((b) => b.font_size)
      .filter((s): s is number => typeof s === "number");
    const avgFont = fontSizes.length === 0 ? 0 : fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;

    const headings: PDFStructure["headings"] = [];
    for (const b of blocks) {
      const isLarge = b.font_size !== undefined && avgFont > 0 && b.font_size > avgFont * 1.2;
      const isShort = b.text.length > 0 && b.text.length < 120;
      if (isShort && (b.is_bold || isLarge)) {
        const level = b.font_size !== undefined && avgFont > 0
          ? Math.min(3, Math.max(1, Math.round(b.font_size / avgFont)))
          : 1;
        headings.push({ page: b.page, text: b.text.trim(), level });
      }
    }

    // Table candidate detection: ≥3 blocks on same page with ≥2 internal pipes / tabs / multi-space columns.
    const tableMap = new Map<number, { line_count: number; aligned_cols: number }>();
    for (const b of blocks) {
      const colCount = Math.max(
        (b.text.match(/\|/g) ?? []).length,
        (b.text.match(/\t/g) ?? []).length,
        (b.text.match(/  +/g) ?? []).length,
      );
      if (colCount >= 2) {
        const existing = tableMap.get(b.page) ?? { line_count: 0, aligned_cols: 0 };
        existing.line_count += 1;
        existing.aligned_cols = Math.max(existing.aligned_cols, colCount);
        tableMap.set(b.page, existing);
      }
    }
    const table_candidates: PDFStructure["table_candidates"] = [];
    for (const [page, info] of tableMap) {
      if (info.line_count >= 3) table_candidates.push({ page, ...info });
    }
    table_candidates.sort((a, b) => a.page - b.page);

    return { document_id, page_count, block_count, headings, table_candidates, total_text_chars };
  }

  /** Render summary. */
  static renderStructure(s: PDFStructure): string {
    return [
      `[PDF ${s.document_id}] pages=${s.page_count} blocks=${s.block_count} chars=${s.total_text_chars}`,
      `  headings: ${s.headings.length}`,
      `  table candidates: ${s.table_candidates.length}`,
    ].join("\n");
  }
}

export const pdfStructureEngine = PDFStructureEngine;
