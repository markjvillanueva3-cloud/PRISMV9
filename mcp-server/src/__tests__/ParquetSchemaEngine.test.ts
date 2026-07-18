/** ParquetSchemaEngine tests — HCAP11. */
import { describe, it, expect } from "vitest";
import { ParquetSchemaEngine, type ParquetFile } from "../engines/ParquetSchemaEngine.js";

const file = (over: Partial<ParquetFile> = {}): ParquetFile => ({
  document_id: "p1", row_count: 1000,
  columns: [
    { name: "id", type: "int64", nullable: false },
    { name: "name", type: "byte_array", nullable: true },
    { name: "price", type: "double", nullable: false },
  ],
  size_bytes: 50_000,
  ...over,
});

describe("ParquetSchemaEngine.analyze", () => {
  it("counts columns + rows + bytes_per_row exactly", () => {
    const s = ParquetSchemaEngine.analyze(file());
    expect(s.column_count).toBe(3);
    expect(s.row_count).toBe(1000);
    expect(s.bytes_per_row).toBe(50);
  });

  it("computes type_counts per column type", () => {
    const s = ParquetSchemaEngine.analyze(file());
    expect(s.type_counts.int64).toBe(1);
    expect(s.type_counts.byte_array).toBe(1);
    expect(s.type_counts.double).toBe(1);
  });

  it("counts nullable vs required exactly", () => {
    const s = ParquetSchemaEngine.analyze(file());
    expect(s.required_count).toBe(2);
    expect(s.nullable_count).toBe(1);
  });

  it("zero rows → bytes_per_row=0 (avoid div by zero)", () => {
    expect(ParquetSchemaEngine.analyze(file({ row_count: 0 })).bytes_per_row).toBe(0);
  });

  it("rejects empty columns (zod min(1))", () => {
    expect(() => ParquetSchemaEngine.analyze(file({ columns: [] }))).toThrow();
  });

  it("rejects unknown column type (zod adversarial)", () => {
    expect(() => ParquetSchemaEngine.analyze({
      ...file(), columns: [{ name: "x", type: "yolo" as never, nullable: false }],
    })).toThrow();
  });

  it("rejects negative row_count", () => {
    expect(() => ParquetSchemaEngine.analyze(file({ row_count: -1 }))).toThrow();
  });

  it("columnsOfType returns matching columns only", () => {
    const cols = ParquetSchemaEngine.columnsOfType(file(), "double");
    expect(cols.map((c) => c.name)).toEqual(["price"]);
  });

  it("columnsOfType rejects unknown type", () => {
    expect(() => ParquetSchemaEngine.columnsOfType(file(), "yolo" as never)).toThrow();
  });

  it("renderStructure shows id + counts + types", () => {
    const md = ParquetSchemaEngine.renderStructure(ParquetSchemaEngine.analyze(file()));
    expect(md.includes("[PARQUET p1]")).toBe(true);
    expect(md.includes("rows=1000")).toBe(true);
    expect(md.includes("cols=3")).toBe(true);
  });
});
