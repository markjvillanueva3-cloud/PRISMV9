/**
 * CSVStructureEngine tests — HCAP04.
 */
import { describe, it, expect } from "vitest";
import { CSVStructureEngine } from "../engines/CSVStructureEngine.js";

describe("CSVStructureEngine.analyze", () => {
  it("empty rows → all-zero structure", () => {
    const s = CSVStructureEngine.analyze("doc", []);
    expect(s.row_count).toBe(0);
    expect(s.col_count).toBe(0);
    expect(s.has_header).toBe(false);
    expect(s.headers).toEqual([]);
  });

  it("detects all-text header row", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["name", "qty", "price"],
      ["widget", "5", "100.00"],
    ]);
    expect(s.has_header).toBe(true);
    expect(s.headers).toEqual(["name", "qty", "price"]);
  });

  it("does NOT detect header when first row has numeric cell", () => {
    const s = CSVStructureEngine.analyze("doc", [["x", "1"], ["y", "2"]]);
    expect(s.has_header).toBe(false);
    expect(s.headers).toEqual(["col_0", "col_1"]);
  });

  it("infers number column when ≥70% values parse as numbers", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["x", "y"], ["a", "1"], ["b", "2"], ["c", "3"],
    ]);
    expect(s.column_types[1]).toBe("number");
  });

  it("infers boolean column", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["x"], ["true"], ["false"], ["true"],
    ]);
    expect(s.column_types[0]).toBe("boolean");
  });

  it("infers date column (ISO YYYY-MM-DD prefix)", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["d"], ["2026-01-01"], ["2026-02-15"], ["2026-03-30"],
    ]);
    expect(s.column_types[0]).toBe("date");
  });

  it("classifies mixed-content column as 'mixed'", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["x"], ["1"], ["true"], ["hello"],
    ]);
    expect(s.column_types[0]).toBe("mixed");
  });

  it("empty cells produce non-zero empty_cell_ratio", () => {
    const s = CSVStructureEngine.analyze("doc", [
      ["a", "b"], ["1", ""], ["", "2"],
    ]);
    expect(s.empty_cell_ratio).toBeCloseTo(2 / 6, 5);
  });

  it("throws on empty document_id", () => {
    expect(() => CSVStructureEngine.analyze("", [["a"]])).toThrow();
  });

  it("throws on non-array rows", () => {
    expect(() => CSVStructureEngine.analyze("doc", null as never)).toThrow();
  });

  it("renderStructure includes doc + dimensions + types", () => {
    const s = CSVStructureEngine.analyze("doc1", [["x"], ["1"], ["2"]]);
    const md = CSVStructureEngine.renderStructure(s);
    expect(md.includes("[CSV doc1]")).toBe(true);
    expect(md.includes("3×1")).toBe(true);
  });
});
