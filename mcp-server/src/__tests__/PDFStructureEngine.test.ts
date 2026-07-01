/**
 * PDFStructureEngine tests — HCAP03.
 */
import { describe, it, expect } from "vitest";
import { PDFStructureEngine, type PDFBlock } from "../engines/PDFStructureEngine.js";

const blk = (page: number, text: string, font_size?: number, is_bold = false): PDFBlock => ({
  page, text, font_size, is_bold,
});

describe("PDFStructureEngine.analyze", () => {
  it("empty blocks → zero counts", () => {
    const s = PDFStructureEngine.analyze("doc1", []);
    expect(s.document_id).toBe("doc1");
    expect(s.page_count).toBe(0);
    expect(s.block_count).toBe(0);
    expect(s.headings).toEqual([]);
    expect(s.table_candidates).toEqual([]);
    expect(s.total_text_chars).toBe(0);
  });

  it("counts pages from max page number", () => {
    const s = PDFStructureEngine.analyze("doc", [blk(1, "a"), blk(5, "b")]);
    expect(s.page_count).toBe(5);
    expect(s.block_count).toBe(2);
  });

  it("computes total_text_chars exactly", () => {
    const s = PDFStructureEngine.analyze("doc", [blk(1, "hello"), blk(1, "world!")]);
    expect(s.total_text_chars).toBe(11);
  });

  it("detects bold short text as heading", () => {
    const s = PDFStructureEngine.analyze("doc", [
      blk(1, "Title", undefined, true),
      blk(1, "body text body text", undefined, false),
    ]);
    expect(s.headings).toHaveLength(1);
    expect(s.headings[0].text).toBe("Title");
  });

  it("detects large-font block as heading (>1.2× avg)", () => {
    const s = PDFStructureEngine.analyze("doc", [
      blk(1, "TITLE", 24),
      blk(1, "body", 10),
      blk(1, "body", 10),
    ]);
    expect(s.headings).toHaveLength(1);
    expect(s.headings[0].text).toBe("TITLE");
  });

  it("detects table candidate when ≥3 blocks have ≥2 column markers", () => {
    const s = PDFStructureEngine.analyze("doc", [
      blk(1, "header"),
      blk(1, "name | qty | price"),
      blk(1, "widget | 5 | 100"),
      blk(1, "gizmo | 3 | 50"),
    ]);
    expect(s.table_candidates).toHaveLength(1);
    expect(s.table_candidates[0].page).toBe(1);
    expect(s.table_candidates[0].line_count).toBe(3);
  });

  it("does NOT flag table when only 2 column rows (below ≥3 threshold)", () => {
    const s = PDFStructureEngine.analyze("doc", [
      blk(1, "name | qty"), blk(1, "w | 1"),
    ]);
    expect(s.table_candidates).toEqual([]);
  });

  it("throws on empty document_id", () => {
    expect(() => PDFStructureEngine.analyze("", [blk(1, "a")])).toThrow();
  });

  it("throws on non-array blocks", () => {
    expect(() => PDFStructureEngine.analyze("doc", null as never)).toThrow();
  });

  it("rejects block with page=0 (zod min 1)", () => {
    expect(() => PDFStructureEngine.analyze("doc", [{ page: 0, text: "a", is_bold: false } as never])).toThrow();
  });

  it("rejects block with negative font_size", () => {
    expect(() => PDFStructureEngine.analyze("doc", [blk(1, "a", -1)])).toThrow();
  });

  it("renderStructure includes doc id + pages + counts", () => {
    const s = PDFStructureEngine.analyze("doc1", [blk(1, "Title", undefined, true)]);
    const md = PDFStructureEngine.renderStructure(s);
    expect(md.includes("[PDF doc1]")).toBe(true);
    expect(md.includes("pages=1")).toBe(true);
    expect(md.includes("blocks=1")).toBe(true);
  });
});
