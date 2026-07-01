/**
 * ExcelStructureEngine tests — HCAP02.
 */
import { describe, it, expect } from "vitest";
import { ExcelStructureEngine, type ExcelCell } from "../engines/ExcelStructureEngine.js";

const cell = (row: number, col: number, value: unknown, type: ExcelCell["type"]): ExcelCell => ({ row, col, value, type });

describe("ExcelStructureEngine.analyze — empty + degenerate", () => {
  it("empty sheet → all-zero structure", () => {
    const s = ExcelStructureEngine.analyze({ sheet_name: "Sheet1", cells: [] });
    expect(s.row_count).toBe(0);
    expect(s.col_count).toBe(0);
    expect(s.headers).toEqual([]);
    expect(s.numeric_columns).toEqual([]);
    expect(s.empty_ratio).toBe(1);
  });

  it("single text cell → row_count=1, col_count=1, no header", () => {
    const s = ExcelStructureEngine.analyze({ sheet_name: "x", cells: [cell(0, 0, "hi", "text")] });
    expect(s.row_count).toBe(1);
    expect(s.col_count).toBe(1);
    expect(s.headers).toEqual(["hi"]);
    expect(s.header_row).toBe(0);
  });
});

describe("ExcelStructureEngine.analyze — header detection", () => {
  it("detects header row when first row is all-text", () => {
    const cells: ExcelCell[] = [
      cell(0, 0, "name", "text"), cell(0, 1, "qty", "text"),
      cell(1, 0, "widget", "text"), cell(1, 1, 5, "number"),
      cell(2, 0, "gizmo", "text"), cell(2, 1, 3, "number"),
    ];
    const s = ExcelStructureEngine.analyze({ sheet_name: "BOM", cells });
    expect(s.header_row).toBe(0);
    expect(s.headers).toEqual(["name", "qty"]);
  });

  it("no header_row when first row has mixed text + numeric", () => {
    const cells: ExcelCell[] = [
      cell(0, 0, "name", "text"), cell(0, 1, 100, "number"),
      cell(1, 0, "widget", "text"), cell(1, 1, 5, "number"),
    ];
    const s = ExcelStructureEngine.analyze({ sheet_name: "x", cells });
    expect(s.header_row === undefined).toBe(true);
  });
});

describe("ExcelStructureEngine.analyze — column type detection", () => {
  it("detects numeric column when ≥70% of data cells are numbers", () => {
    const cells: ExcelCell[] = [
      cell(0, 0, "qty", "text"),
      cell(1, 0, 1, "number"), cell(2, 0, 2, "number"), cell(3, 0, 3, "number"),
      cell(4, 0, 4, "number"), cell(5, 0, 5, "number"),
    ];
    const s = ExcelStructureEngine.analyze({ sheet_name: "x", cells });
    expect(s.numeric_columns).toEqual([0]);
  });

  it("detects formula column when any data cell is type=formula", () => {
    const cells: ExcelCell[] = [
      cell(0, 0, "header", "text"), cell(0, 1, "total", "text"),
      cell(1, 0, 1, "number"), cell(1, 1, 10, "formula"),
    ];
    const s = ExcelStructureEngine.analyze({ sheet_name: "x", cells });
    expect(s.formula_columns).toEqual([1]);
  });
});

describe("ExcelStructureEngine.columnValues + renderStructure", () => {
  it("columnValues extracts non-header non-empty values in row order", () => {
    const sheet = {
      sheet_name: "x", cells: [
        cell(0, 0, "qty", "text"),
        cell(1, 0, 1, "number"), cell(2, 0, 2, "number"),
      ],
    };
    expect(ExcelStructureEngine.columnValues(sheet, 0, 0)).toEqual([1, 2]);
  });

  it("renderStructure shows sheet name + dimensions + headers preview", () => {
    const sheet = {
      sheet_name: "Quote", cells: [
        cell(0, 0, "part", "text"), cell(0, 1, "qty", "text"),
        cell(1, 0, "w1", "text"), cell(1, 1, 5, "number"),
      ],
    };
    const struct = ExcelStructureEngine.analyze(sheet);
    const md = ExcelStructureEngine.renderStructure(struct);
    expect(md.includes("[EXCEL Quote]")).toBe(true);
    expect(md.includes("2×2")).toBe(true);
    expect(md.includes("part")).toBe(true);
  });

  it("rejects negative row/col indices (zod adversarial)", () => {
    expect(() => ExcelStructureEngine.analyze({
      sheet_name: "x", cells: [{ row: -1, col: 0, value: "x", type: "text" }],
    } as never)).toThrow();
  });

  it("computes empty_ratio when sparse: 1 cell of 4 → 0.75", () => {
    const cells: ExcelCell[] = [
      cell(0, 0, 1, "number"),
      cell(0, 1, undefined, "empty"),
      cell(1, 0, undefined, "empty"),
      cell(1, 1, undefined, "empty"),
    ];
    const s = ExcelStructureEngine.analyze({ sheet_name: "x", cells });
    expect(s.empty_ratio).toBe(0.75);
  });
});
