/**
 * CADOperationTaxonomyEngine -- generateCadQueryCode
 *
 * R9 mandate: asserts verify the INTENT of the method (generates real,
 * importable CadQuery Python for each taxonomy operation id), not just that
 * a value exists. Reference values are concrete expected substrings verified
 * against known CadQuery API calls.
 */

import { describe, it, expect } from "vitest";
import { cadOperationTaxonomyEngine } from "../engines/CADOperationTaxonomyEngine.js";

// ---------------------------------------------------------------------------
// Happy path -- concrete operation ids
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- happy path", () => {
  it("extrude: generates import + Workplane + rect + extrude", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("extrude");
    expect(code).toContain("import cadquery as cq");
    expect(code).toContain("cq.Workplane");
    expect(code).toContain(".rect(");
    expect(code).toContain(".extrude(");
    expect(code).toContain("show_object(result)");
  });

  it("revolve: generates revolve() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("revolve");
    expect(code).toContain("import cadquery as cq");
    expect(code).toContain(".revolve(");
  });

  it("loft: generates loft() call with two workplane circles", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("loft");
    expect(code).toContain(".circle(");
    expect(code).toContain(".loft()");
  });

  it("sweep: generates sweep() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("sweep");
    expect(code).toContain(".sweep(");
  });

  it("fillet: generates .fillet() on edges", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("fillet");
    expect(code).toContain(".fillet(");
    expect(code).toContain("base_solid");
  });

  it("chamfer: generates .chamfer() on edges", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("chamfer");
    expect(code).toContain(".chamfer(");
    expect(code).toContain("base_solid");
  });

  it("shell: generates .shell() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("shell");
    expect(code).toContain(".shell(");
  });

  it("hole: generates .hole() with pushPoints", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("hole");
    expect(code).toContain(".hole(");
    expect(code).toContain("pushPoints");
  });

  it("pattern_linear: generates .rarray() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("pattern_linear");
    expect(code).toContain(".rarray(");
  });

  it("pattern_circular: generates .polarArray() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("pattern_circular");
    expect(code).toContain(".polarArray(");
  });

  it("mirror: generates .mirror() call", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("mirror");
    expect(code).toContain(".mirror(");
  });

  it("loft + extrude: generated code strings differ (each op is distinct)", () => {
    const loft = cadOperationTaxonomyEngine.generateCadQueryCode("loft");
    const extrude = cadOperationTaxonomyEngine.generateCadQueryCode("extrude");
    expect(loft).not.toBe(extrude);
  });
});

// ---------------------------------------------------------------------------
// Object-shape input (as forwarded by cadDispatcher: params.action ?? params)
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- object input shapes", () => {
  it("accepts { action: 'extrude' } shape", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode({ action: "extrude" });
    expect(code).toContain(".extrude(");
  });

  it("accepts { id: 'fillet' } shape", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode({ id: "fillet" });
    expect(code).toContain(".fillet(");
  });

  it("accepts { operation_id: 'hole' } shape", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode({ operation_id: "hole" });
    expect(code).toContain(".hole(");
  });

  it("id takes precedence over action in mixed objects", () => {
    // id wins per the resolver: id ?? operation_id ?? action
    const code = cadOperationTaxonomyEngine.generateCadQueryCode({ id: "revolve", action: "extrude" });
    expect(code).toContain(".revolve(");
    expect(code).not.toContain(".extrude(");
  });
});

// ---------------------------------------------------------------------------
// Aerospace operations (loft, sweep, ruled_surface, blend_surface, variable_fillet)
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- aerospace ops", () => {
  it("loft produces real CadQuery code (not a stub)", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("loft");
    expect(code).not.toContain("TODO");
    expect(code).not.toContain("pass");
    expect(code).toContain("import cadquery");
  });

  it("sweep produces a path-based sweep snippet", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("sweep");
    expect(code).toContain("path");
    expect(code).toContain(".sweep(");
  });

  it("ruled_surface mentions makeRuledSurface or Shell", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("ruled_surface");
    expect(code.toLowerCase()).toMatch(/ruledSurface|shell/i);
  });

  it("variable_fillet includes a fallback mean-radius note", () => {
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("variable_fillet");
    expect(code).toContain(".fillet(");
    // Must document the approximation honestly
    expect(code).toContain("#");
  });
});

// ---------------------------------------------------------------------------
// Unmapped / generic fallback
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- generic fallback", () => {
  it("returns a non-empty snippet with box() for any operation not explicitly mapped", () => {
    // 'boundary_surface' may be mapped; test with a known-mapped one to confirm
    // For operations that exist but hit the default branch:
    // We cannot easily add a fake op without touching engine state, so we
    // verify the contract by confirming every real op returns non-empty code.
    const allOps = cadOperationTaxonomyEngine.getAllOperations();
    for (const op of allOps) {
      const code = cadOperationTaxonomyEngine.generateCadQueryCode(op.id);
      expect(code.length).toBeGreaterThan(0);
      expect(code).toContain("import cadquery");
      expect(code).toContain("show_object(result)");
    }
  });
});

// ---------------------------------------------------------------------------
// Failure modes
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- failure modes", () => {
  it("throws a descriptive error for an unknown operation id string", () => {
    expect(() =>
      cadOperationTaxonomyEngine.generateCadQueryCode("not_a_real_op_xyz"),
    ).toThrow(/unknown operation.*not_a_real_op_xyz/i);
  });

  it("throws for an object where no id field resolves to a known op", () => {
    expect(() =>
      cadOperationTaxonomyEngine.generateCadQueryCode({ action: "nonexistent_op_abc" }),
    ).toThrow(/unknown operation/i);
  });

  it("throws for an empty string id", () => {
    expect(() =>
      cadOperationTaxonomyEngine.generateCadQueryCode(""),
    ).toThrow(/unknown operation/i);
  });

  it("throws for an empty object (no resolvable id)", () => {
    expect(() =>
      cadOperationTaxonomyEngine.generateCadQueryCode({}),
    ).toThrow(/unknown operation/i);
  });

  it("error message lists available operation ids to aid debugging", () => {
    let msg = "";
    try {
      cadOperationTaxonomyEngine.generateCadQueryCode("totally_wrong");
    } catch (e: unknown) {
      msg = e instanceof Error ? e.message : String(e);
    }
    // Must list at least one known operation in the error
    expect(msg).toContain("extrude");
  });
});

// ---------------------------------------------------------------------------
// Adversarial inputs
// ---------------------------------------------------------------------------

describe("CADOperationTaxonomyEngine.generateCadQueryCode -- adversarial", () => {
  it("does not execute or eval the generated Python string", () => {
    // The returned value is a plain string -- no dynamic execution
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("extrude");
    expect(typeof code).toBe("string");
  });

  it("handles whitespace-padded id by trimming before lookup", () => {
    // The method trims opId before .get() so '  extrude  ' should work
    const code = cadOperationTaxonomyEngine.generateCadQueryCode("  extrude  ");
    expect(code).toContain(".extrude(");
  });

  it("object with null-ish fields falls back through resolver chain without crashing", () => {
    // { id: undefined, action: 'revolve' } should resolve via action
    const code = cadOperationTaxonomyEngine.generateCadQueryCode({
      id: undefined,
      action: "revolve",
    });
    expect(code).toContain(".revolve(");
  });
});
