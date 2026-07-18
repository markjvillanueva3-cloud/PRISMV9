/**
 * Tests for WaferDieCodeEngine — wafer die-code decoder (ARC-MS6 / muS-C23).
 *
 * The engine is a pure string parser; every expected value below is derived
 * directly from the documented code grammar
 * (`<PREFIX><dim>X<dim>...X<dim>.<EXT>`) so each assertion fails on a real
 * parsing regression.
 */

import { describe, it, expect } from "vitest";
import {
  WaferDieCodeEngine,
  waferDieCodeEngine,
} from "../engines/WaferDieCodeEngine.js";

describe("WaferDieCodeEngine — canonical decode", () => {
  it("decodes WAFER880X334X145.MIN into prefix + 3 dimensions + extension", () => {
    const r = waferDieCodeEngine.decode({ code: "WAFER880X334X145.MIN" });
    expect(r.prefix).toBe("WAFER");
    expect(r.extension).toBe("MIN");
    expect(r.dimension_count).toBe(3);
    expect(r.valid).toBe(true);
    expect(r.dimensions).toEqual([
      { axis: "length", code_value: 880, index: 1 },
      { axis: "width", code_value: 334, index: 2 },
      { axis: "height", code_value: 145, index: 3 },
    ]);
    expect(r.warnings).toEqual([]);
    expect(r.notes).toEqual([]);
    expect(r.scaled).toBe(undefined);
  });

  it("maps the three dimensions to length / width / height by convention", () => {
    const r = waferDieCodeEngine.decode({ code: "WAFER880X334X145.MIN" });
    expect(r.dimensions.map((d) => d.axis)).toEqual([
      "length",
      "width",
      "height",
    ]);
  });

  it("produces a scaled view only when unit_scale AND unit are both supplied", () => {
    const r = waferDieCodeEngine.decode({
      code: "WAFER880X334X145.MIN",
      unit_scale: 0.1,
      unit: "mm",
    });
    expect(r.scaled).toEqual([
      { axis: "length", value: 88, unit: "mm" },
      { axis: "width", value: 33.4, unit: "mm" },
      { axis: "height", value: 14.5, unit: "mm" },
    ]);
  });

  it("omits the scaled view and notes the gap when only unit_scale is given", () => {
    const r = waferDieCodeEngine.decode({
      code: "WAFER880X334X145.MIN",
      unit_scale: 0.1,
    });
    expect(r.scaled).toBe(undefined);
    expect(r.notes.some((n) => n.includes("must BOTH be supplied"))).toBe(true);
  });
});

describe("WaferDieCodeEngine — grammar variants", () => {
  it("accepts a lowercase x separator", () => {
    const r = waferDieCodeEngine.decode({ code: "DIE100x50x25" });
    expect(r.prefix).toBe("DIE");
    expect(r.dimension_count).toBe(3);
    expect(r.dimensions.map((d) => d.code_value)).toEqual([100, 50, 25]);
  });

  it("returns extension null when the code has no dot", () => {
    const r = waferDieCodeEngine.decode({ code: "WAFER880X334X145" });
    expect(r.extension).toBe(null);
    expect(r.valid).toBe(true);
  });

  it("decodes decimal dimension tokens", () => {
    const r = waferDieCodeEngine.decode({ code: "WAFER88.0X33.4X14.5" });
    expect(r.dimensions.map((d) => d.code_value)).toEqual([88, 33.4, 14.5]);
    expect(r.valid).toBe(true);
  });

  it("strips a directory path and decodes the basename only", () => {
    const r = waferDieCodeEngine.decode({
      code: "C:/dies/wafer/WAFER880X334X145.MIN",
    });
    expect(r.code).toBe("WAFER880X334X145.MIN");
    expect(r.prefix).toBe("WAFER");
    expect(r.notes.some((n) => n.includes("decoded the basename only"))).toBe(
      true,
    );
  });

  it("labels a 4th dimension as dim4 and notes the non-standard count", () => {
    const r = waferDieCodeEngine.decode({ code: "GRID10X20X30X40" });
    expect(r.dimension_count).toBe(4);
    expect(r.dimensions[3].axis).toBe("dim4");
    expect(r.notes.some((n) => n.includes("4 dimension token(s)"))).toBe(true);
  });

  it("honours an axis_labels override", () => {
    const r = waferDieCodeEngine.decode({
      code: "WAFER880X334X145",
      axis_labels: ["x", "y", "z"],
    });
    expect(r.dimensions.map((d) => d.axis)).toEqual(["x", "y", "z"]);
  });
});

describe("WaferDieCodeEngine — malformed codes (valid=false, no throw)", () => {
  it("marks valid=false and skips a non-numeric dimension token", () => {
    const r = waferDieCodeEngine.decode({ code: "WAFER880XABCx145" });
    expect(r.valid).toBe(false);
    // The non-numeric "ABC" token is skipped; 880 + 145 still decode.
    expect(r.dimensions.map((d) => d.code_value)).toEqual([880, 145]);
    expect(r.warnings.some((w) => w.includes("ABC"))).toBe(true);
  });

  it("marks valid=false and warns when the code has no alphabetic prefix", () => {
    const r = waferDieCodeEngine.decode({ code: "880X334X145" });
    expect(r.prefix).toBe("");
    expect(r.valid).toBe(false);
    expect(r.warnings.some((w) => w.includes("No alphabetic prefix"))).toBe(
      true,
    );
    // dimensions still decode for downstream inspection.
    expect(r.dimension_count).toBe(3);
  });

  it("marks valid=false when no numeric dimension token is present", () => {
    const r = waferDieCodeEngine.decode({ code: "PLATE.STEP" });
    expect(r.prefix).toBe("PLATE");
    expect(r.dimension_count).toBe(0);
    expect(r.valid).toBe(false);
    expect(
      r.warnings.some((w) => w.includes("No numeric dimension tokens")),
    ).toBe(true);
  });

  it("notes a single-dimension code (L×W×H convention expects 3)", () => {
    const r = waferDieCodeEngine.decode({ code: "ROD500" });
    expect(r.dimension_count).toBe(1);
    expect(r.dimensions[0]).toEqual({
      axis: "length",
      code_value: 500,
      index: 1,
    });
    expect(r.valid).toBe(true);
    expect(r.notes.some((n) => n.includes("1 dimension token(s)"))).toBe(true);
  });
});

describe("WaferDieCodeEngine — determinism & shape", () => {
  it("is deterministic — identical input yields identical output", () => {
    const a = waferDieCodeEngine.decode({ code: "WAFER880X334X145.MIN" });
    const b = waferDieCodeEngine.decode({ code: "WAFER880X334X145.MIN" });
    expect(a).toEqual(b);
  });

  it("works through a freshly constructed instance, not only the singleton", () => {
    const fresh = new WaferDieCodeEngine();
    const r = fresh.decode({ code: "WAFER880X334X145.MIN" });
    expect(r.valid).toBe(true);
    expect(r.dimension_count).toBe(3);
  });
});

describe("WaferDieCodeEngine — input validation", () => {
  it("throws an engine-named error on schema-invalid input", () => {
    expect(() => waferDieCodeEngine.decode({})).toThrow(
      /WaferDieCodeEngine: invalid input/,
    );
    expect(() => waferDieCodeEngine.decode({ code: "" })).toThrow();
    expect(() => waferDieCodeEngine.decode({ code: 12345 })).toThrow();
    expect(() =>
      waferDieCodeEngine.decode({ code: "WAFER880", bogus: 1 }),
    ).toThrow();
  });

  it("rejects a non-positive unit_scale", () => {
    expect(() =>
      waferDieCodeEngine.decode({ code: "WAFER880", unit_scale: -1, unit: "mm" }),
    ).toThrow();
    expect(() =>
      waferDieCodeEngine.decode({ code: "WAFER880", unit_scale: 0, unit: "mm" }),
    ).toThrow();
  });
});
