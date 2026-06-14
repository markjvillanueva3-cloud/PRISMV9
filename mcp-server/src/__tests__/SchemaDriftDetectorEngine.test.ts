/** SchemaDriftDetectorEngine tests — HMPI04. */
import { describe, it, expect } from "vitest";
import { SchemaDriftDetectorEngine, type ToolSchema } from "../engines/SchemaDriftDetectorEngine.js";

const sch = (params: ToolSchema["params"]): ToolSchema => ({ tool_id: "t1", params });

describe("SchemaDriftDetectorEngine.diff", () => {
  it("identical schemas → zero changes", () => {
    const s = sch([{ name: "x", type: "string", required: true }]);
    const r = SchemaDriftDetectorEngine.diff(s, s);
    expect(r.changes).toEqual([]);
    expect(r.breaking_count).toBe(0);
    expect(r.net_param_delta).toBe(0);
  });

  it("added required param without default → breaking", () => {
    const a = sch([]);
    const b = sch([{ name: "x", type: "string", required: true }]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0].kind).toBe("added");
    expect(r.changes[0].breaking).toBe(true);
    expect(r.breaking_count).toBe(1);
  });

  it("added optional param → non-breaking", () => {
    const a = sch([]);
    const b = sch([{ name: "x", type: "string", required: false }]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes[0].breaking).toBe(false);
    expect(r.non_breaking_count).toBe(1);
  });

  it("added required with default → non-breaking", () => {
    const a = sch([]);
    const b = sch([{ name: "x", type: "string", required: true, default_value: "" }]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes[0].breaking).toBe(false);
  });

  it("type change → always breaking", () => {
    const a = sch([{ name: "x", type: "string", required: false }]);
    const b = sch([{ name: "x", type: "number", required: false }]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes[0].kind).toBe("type-changed");
    expect(r.changes[0].breaking).toBe(true);
  });

  it("flag flip optional→required is breaking; required→optional is not", () => {
    const opt: ToolSchema["params"][number] = { name: "x", type: "string", required: false };
    const req: ToolSchema["params"][number] = { name: "x", type: "string", required: true };
    expect(SchemaDriftDetectorEngine.diff(sch([opt]), sch([req])).changes[0].breaking).toBe(true);
    expect(SchemaDriftDetectorEngine.diff(sch([req]), sch([opt])).changes[0].breaking).toBe(false);
  });

  it("removed required param → breaking", () => {
    const a = sch([{ name: "x", type: "string", required: true }]);
    const b = sch([]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes[0].kind).toBe("removed");
    expect(r.changes[0].breaking).toBe(true);
  });

  it("removed optional param → non-breaking", () => {
    const a = sch([{ name: "x", type: "string", required: false }]);
    const b = sch([]);
    const r = SchemaDriftDetectorEngine.diff(a, b);
    expect(r.changes[0].breaking).toBe(false);
  });

  it("throws on tool_id mismatch (adversarial)", () => {
    const a: ToolSchema = { tool_id: "a", params: [] };
    const b: ToolSchema = { tool_id: "b", params: [] };
    expect(() => SchemaDriftDetectorEngine.diff(a, b)).toThrow(/mismatch/);
  });

  it("renderReport tags BREAKING when any breaking change present", () => {
    const a = sch([{ name: "x", type: "string", required: false }]);
    const b = sch([{ name: "x", type: "number", required: false }]);
    const md = SchemaDriftDetectorEngine.renderReport(SchemaDriftDetectorEngine.diff(a, b));
    expect(md.includes("[SCHEMA-DRIFT BREAKING]")).toBe(true);
  });

  it("renderReport tags STABLE when zero changes", () => {
    const s = sch([]);
    expect(SchemaDriftDetectorEngine.renderReport(SchemaDriftDetectorEngine.diff(s, s)).includes("STABLE")).toBe(true);
  });
});
