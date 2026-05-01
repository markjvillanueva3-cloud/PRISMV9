/**
 * Tests for InventorCADFunctionIndexEngine — Autodesk Inventor CAD Function Index.
 *
 * Foundation suite for U-CAD-FIDX-INV-01 (sketch_operations module).
 *
 * Pattern mirrors HyperCADCADFunctionIndexEngine.test.ts: KNOWN_OPS list,
 * drift guard (per-module sum vs declared metadata.totalParameters), index
 * shape, parameter lookups, and future_modules registration discipline.
 *
 * @see src/engines/InventorCADFunctionIndexEngine.ts
 * @see U-CAD-FIDX-INV-01 (sketch_operations) — current
 * @see U-CAD-FIDX-INV-02..08 — future_modules (part / surface / sheet_metal / frame_generator / weldment / drawing / assembly)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InventorCADFunctionIndexEngine } from "../engines/InventorCADFunctionIndexEngine.js";

const KNOWN_SKETCH_OPS = [
  // 9 primitive families
  "LINE", "RECTANGLE", "CIRCLE", "ARC", "ELLIPSE", "POLYGON", "SPLINE", "SLOT", "POINT",
  // 8 editing tools
  "TRIM", "EXTEND", "BREAK", "OFFSET", "MIRROR", "MOVE", "ROTATE", "SCALE",
  // 3 reference projections
  "PROJECT_GEOMETRY", "PROJECT_TO_SURFACE", "INTERSECT_CURVE",
  // 2 constraint families
  "GEOMETRIC_CONSTRAINT", "DIMENSION_CONSTRAINT",
  // sketch fillet/chamfer
  "FILLET_SKETCH", "CHAMFER_SKETCH",
  // sketch patterns
  "PATTERN_RECTANGULAR", "PATTERN_CIRCULAR",
  // construction toggle + text
  "CONSTRUCTION_TOGGLE", "TEXT_SKETCH",
];

const KNOWN_PART_OPS = [
  // 6 sweep features
  "EXTRUDE", "REVOLVE", "SWEEP", "LOFT", "COIL", "RIB",
  // hole + thread
  "HOLE", "THREAD",
  // 4 modify
  "FILLET", "CHAMFER", "SHELL", "DRAFT",
  // boolean
  "COMBINE",
  // 5 patterns
  "PATTERN_RECTANGULAR", "PATTERN_CIRCULAR", "PATTERN_MIRROR",
  "PATTERN_SKETCH_DRIVEN", "PATTERN_PATH",
  // derive + thicken-offset
  "DERIVE_COMPONENT", "THICKEN_OFFSET",
  // 5 direct-edit / utility
  "DELETE_FACE", "SPLIT_BODY", "COPY_OBJECT", "MOVE_BODY", "EMBOSS",
];

const KNOWN_SURFACE_OPS = [
  "BOUNDARY_PATCH", "STITCH", "UNSTITCH",
  "TRIM_SURFACE", "EXTEND_SURFACE", "REPLACE_FACE",
  "SCULPT", "RULED_SURFACE", "REPAIR_BODIES",
  "MOVE_FACE", "SILHOUETTE_CURVE", "SURFACE_INTERSECT",
];

const KNOWN_SHEET_METAL_OPS = [
  // base creation
  "FACE", "CONTOUR_FLANGE", "CONTOUR_ROLL", "LOFTED_FLANGE",
  // edge features
  "FLANGE", "HEM", "BEND", "FOLD", "JOG",
  // modify / cut
  "CUT", "EMBOSS",
  // corner treatments
  "CORNER_SEAM", "CORNER_CHAMFER", "CORNER_ROUND", "RIP",
  // special features
  "PUNCH",
  // unfold / refold / flat pattern
  "UNFOLD", "REFOLD", "FLAT_PATTERN",
  // style management
  "SHEET_METAL_RULE", "SHEET_METAL_DEFAULTS",
];

const PLANNED_FUTURE_MODULES = [
  "frame_generator_operations",
  "weldment_operations",
  "drawing_operations",
  "assembly_operations",
];

describe("InventorCADFunctionIndexEngine — index navigation", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getIndex returns Autodesk Inventor metadata", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.system_id).toBe("inventor");
    expect(idx.module_id).toBe("cad_function_index");
    expect(idx.module_name).toBe("Autodesk Inventor CAD Unified Function Index");
    expect(idx.schema_version).toBe("1.0.0");
    expect(idx.modules.length).toBe(4);
  });

  it("listModules surfaces sketch / part / surface / sheet_metal in registration order", () => {
    expect(InventorCADFunctionIndexEngine.listModules()).toEqual([
      "sketch_operations",
      "part_operations",
      "surface_operations",
      "sheet_metal_operations",
    ]);
  });

  it("getModuleEntry returns the registered sketch_operations entry", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("sketch_operations");
    expect(entry?.module_id).toBe("sketch_operations");
    expect(entry?.path).toBe("cad-functions/inventor/sketch-operations.json");
    expect(entry?.covered_units).toEqual(["U-CAD-FIDX-INV-01"]);
    expect(entry?.parameter_count_estimate).toBe(138);
  });

  it("getModuleEntry returns null for unknown module", () => {
    expect(InventorCADFunctionIndexEngine.getModuleEntry("does_not_exist")).toBeNull();
  });

  it("future_modules registers exactly the planned 4 follow-ups (after INV-04 ship)", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    const planned = (idx.future_modules ?? []).map((f) => f.planned_id);
    expect(planned.sort()).toEqual([...PLANNED_FUTURE_MODULES].sort());
  });

  it("each future_modules entry has scope, params, and a valid INV unit id (05..08)", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    const futureModules = idx.future_modules ?? [];
    expect(futureModules.length).toBe(4);
    for (const fm of futureModules) {
      expect(fm.scope.length).toBeGreaterThan(20);
      expect(fm.estimated_params).toBeGreaterThan(0);
      expect(fm.deferred_to).toMatch(/^U-CAD-FIDX-INV-0[5-8]$/);
    }
  });

  it("global_cross_references names InventorCADFunctionIndexEngine in engines_linked", () => {
    const refs = InventorCADFunctionIndexEngine.getIndex().global_cross_references;
    expect(refs.engines_linked).toContain("InventorCADFunctionIndexEngine");
    expect(refs.dispatchers_touched).toContain("prism_cad");
  });
});

describe("InventorCADFunctionIndexEngine — sketch_operations module", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 28 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-01");
    expect(mod?.metadata?.operationCount).toBe(28);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(28);
  });

  it("listOperations returns exactly KNOWN_SKETCH_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sketch_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_SKETCH_OPS].sort());
  });

  it("listOperations returns empty array for unknown module", () => {
    expect(InventorCADFunctionIndexEngine.listOperations("does_not_exist")).toEqual([]);
  });

  it("each operation carries a Sketch_-prefixed category and non-zero param count", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sketch_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Sketch_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(2);
    }
  });

  it("getOperation('LINE') exposes Inventor SketchLines.AddByTwoPoints binding", () => {
    const line = InventorCADFunctionIndexEngine.getOperation("sketch_operations", "LINE");
    expect(line?.category).toBe("Sketch_Primitive_Line");
    expect(line?.python_api).toBe("Sketch.SketchLines.AddByTwoPoints(StartPoint, EndPoint)");
    expect(Object.keys(line?.tabs ?? {})).toEqual(["Plane", "Geometry", "Properties"]);
  });

  it("getOperation('RECTANGLE') has 4-mode dropdown", () => {
    const rect = InventorCADFunctionIndexEngine.getOperation("sketch_operations", "RECTANGLE");
    const modeParam = rect?.tabs?.Geometry?.parameters?.find((p) => p.name === "Mode");
    expect(modeParam?.options).toEqual([
      "two_point",
      "three_point",
      "two_point_centered",
      "three_point_centered",
    ]);
  });

  it("getOperation('GEOMETRIC_CONSTRAINT') registers all 13 constraint types", () => {
    const gc = InventorCADFunctionIndexEngine.getOperation(
      "sketch_operations",
      "GEOMETRIC_CONSTRAINT",
    );
    const typeParam = gc?.tabs?.Geometry?.parameters?.find((p) => p.name === "Constraint Type");
    expect(typeParam?.options?.length).toBe(13);
    expect(typeParam?.options).toContain("coincident");
    expect(typeParam?.options).toContain("tangent");
    expect(typeParam?.options).toContain("symmetric");
  });

  it("getOperation returns null for unknown op or module", () => {
    expect(
      InventorCADFunctionIndexEngine.getOperation("sketch_operations", "FAKE_OP"),
    ).toBeNull();
    expect(
      InventorCADFunctionIndexEngine.getOperation("does_not_exist", "LINE"),
    ).toBeNull();
  });
});

describe("InventorCADFunctionIndexEngine — parameter discovery", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("findParameter locates Length on LINE in the Geometry tab", () => {
    const loc = InventorCADFunctionIndexEngine.findParameter(
      "sketch_operations",
      "LINE",
      "Length",
    );
    expect(loc?.module_id).toBe("sketch_operations");
    expect(loc?.operation_id).toBe("LINE");
    expect(loc?.tab_id).toBe("Geometry");
    expect(loc?.parameter.name).toBe("Length");
    expect(loc?.parameter.unit).toBe("mm");
    expect(loc?.parameter.type).toBe("numeric");
  });

  it("findParameter is case-insensitive", () => {
    const loc = InventorCADFunctionIndexEngine.findParameter(
      "sketch_operations",
      "LINE",
      "lEnGtH",
    );
    expect(loc?.parameter.name).toBe("Length");
  });

  it("findParameter returns null when parameter is absent", () => {
    expect(
      InventorCADFunctionIndexEngine.findParameter(
        "sketch_operations",
        "LINE",
        "NotARealParam",
      ),
    ).toBeNull();
  });

  it("findParameter returns null when operation is absent", () => {
    expect(
      InventorCADFunctionIndexEngine.findParameter("sketch_operations", "GHOST", "Length"),
    ).toBeNull();
  });

  it("searchParameters('radius') matches every Radius / Minor Radius / Circumradius hit", () => {
    const matches = InventorCADFunctionIndexEngine.searchParameters("radius");
    expect(matches.length).toBeGreaterThanOrEqual(3);
    for (const m of matches) {
      expect.soft(m.parameter.name.toLowerCase()).toContain("radius");
    }
    const opIds = new Set(matches.map((m) => m.operation_id));
    expect(opIds.has("CIRCLE")).toBe(true);
    expect(opIds.has("ELLIPSE")).toBe(true);
  });

  it("searchParameters honors limit", () => {
    const matches = InventorCADFunctionIndexEngine.searchParameters("point", 3);
    expect(matches.length).toBe(3);
  });

  it("searchParameters returns empty for no matches", () => {
    expect(InventorCADFunctionIndexEngine.searchParameters("zzzzz_nope")).toEqual([]);
  });
});

describe("InventorCADFunctionIndexEngine — taxonomy queries", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getOperationsByCategory('Sketch_Primitive_Line') returns LINE only", () => {
    const lines = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Sketch_Primitive_Line",
    );
    expect(lines.length).toBe(1);
    expect(lines[0]?.operation_id).toBe("LINE");
  });

  it("getOperationsByCategory restricts when moduleId provided", () => {
    const ops = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Sketch_Edit_Trim",
      "sketch_operations",
    );
    expect(ops.length).toBe(1);
    expect(ops[0]?.operation_id).toBe("TRIM");
  });

  it("getOperationsByCategory returns empty for unknown category", () => {
    expect(
      InventorCADFunctionIndexEngine.getOperationsByCategory("Not_A_Category"),
    ).toEqual([]);
  });

  it("listAllOperations returns 86 operations across sketch + part + surface + sheet_metal modules", () => {
    expect(InventorCADFunctionIndexEngine.listAllOperations().length).toBe(86);
  });
});

describe("InventorCADFunctionIndexEngine — sheet_metal_operations module (U-CAD-FIDX-INV-04)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 21 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sheet_metal_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-04");
    expect(mod?.metadata?.operationCount).toBe(21);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(21);
  });

  it("listOperations returns exactly KNOWN_SHEET_METAL_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sheet_metal_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_SHEET_METAL_OPS].sort());
  });

  it("each sheet metal operation carries a SheetMetal_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("sheet_metal_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^SheetMetal_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(4);
    }
  });

  it("getOperation('FLANGE') exposes 4 height-datum modes + 4 edge-extents modes", () => {
    const flange = InventorCADFunctionIndexEngine.getOperation(
      "sheet_metal_operations",
      "FLANGE",
    );
    expect(flange?.category).toBe("SheetMetal_Edge_Flange");
    const datum = flange?.tabs?.Shape?.parameters?.find((p) => p.name === "Height Datum");
    expect(datum?.options).toEqual([
      "inside_to_inside",
      "outside_to_outside",
      "tangent_to_sketch",
      "edge_outside",
    ]);
    const extents = flange?.tabs?.Shape?.parameters?.find((p) => p.name === "Edge Extents");
    expect(extents?.options).toEqual([
      "full_edge",
      "from_end",
      "two_distance_from_ends",
      "centered",
    ]);
  });

  it("getOperation('HEM') registers all 4 hem types", () => {
    const hem = InventorCADFunctionIndexEngine.getOperation("sheet_metal_operations", "HEM");
    const hemType = hem?.tabs?.Shape?.parameters?.find((p) => p.name === "Hem Type");
    expect(hemType?.options).toEqual(["single", "teardrop", "rolled", "double"]);
  });

  it("getOperation('CORNER_SEAM') exposes all 5 seam types", () => {
    const seam = InventorCADFunctionIndexEngine.getOperation(
      "sheet_metal_operations",
      "CORNER_SEAM",
    );
    const seamType = seam?.tabs?.Corner?.parameters?.find((p) => p.name === "Seam Type");
    expect(seamType?.options).toEqual([
      "no_overlap",
      "overlap",
      "reverse_overlap",
      "bidirectional_overlap",
      "rip",
    ]);
  });

  it("getOperation('LOFTED_FLANGE') supports all 3 press methods", () => {
    const lf = InventorCADFunctionIndexEngine.getOperation(
      "sheet_metal_operations",
      "LOFTED_FLANGE",
    );
    const press = lf?.tabs?.Shape?.parameters?.find((p) => p.name === "Output Type");
    expect(press?.options).toEqual(["press_brake", "roll_form", "die_form"]);
  });

  it("getOperation('SHEET_METAL_RULE') exposes the 4 unfold methods", () => {
    const rule = InventorCADFunctionIndexEngine.getOperation(
      "sheet_metal_operations",
      "SHEET_METAL_RULE",
    );
    const unfold = rule?.tabs?.Shape?.parameters?.find((p) => p.name === "Unfold Method");
    expect(unfold?.options).toEqual([
      "linear",
      "bend_compensation",
      "bend_table",
      "custom_equation",
    ]);
    const kFactor = rule?.tabs?.Shape?.parameters?.find((p) => p.name === "K-Factor");
    expect(kFactor?.default).toBe(0.44);
    expect(kFactor?.min).toBe(0);
    expect(kFactor?.max).toBe(0.5);
  });

  it("getOperation('FLAT_PATTERN') registers DXF/DWG/both output formats", () => {
    const fp = InventorCADFunctionIndexEngine.getOperation(
      "sheet_metal_operations",
      "FLAT_PATTERN",
    );
    const fmt = fp?.tabs?.Unfold?.parameters?.find((p) => p.name === "Output Format");
    expect(fmt?.options).toEqual(["dxf", "dwg", "both"]);
    expect(fp?.tabs?.Unfold?.parameters?.length).toBe(14);
  });

  it("sheet_metal_operations declares dependencies on sketch + part_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("sheet_metal_operations");
    expect(entry?.dependencies).toEqual(["sketch_operations", "part_operations"]);
  });

  it("getOperationsByCategory restricts within sheet_metal_operations", () => {
    const flatPatternOps = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "SheetMetal_Output_FlatPattern",
      "sheet_metal_operations",
    );
    expect(flatPatternOps.length).toBe(1);
    expect(flatPatternOps[0]?.operation_id).toBe("FLAT_PATTERN");
  });
});

describe("InventorCADFunctionIndexEngine — surface_operations module (U-CAD-FIDX-INV-03)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 12 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("surface_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-03");
    expect(mod?.metadata?.operationCount).toBe(12);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(12);
  });

  it("listOperations returns exactly KNOWN_SURFACE_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("surface_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_SURFACE_OPS].sort());
  });

  it("each surface operation carries a Surface_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("surface_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Surface_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(3);
    }
  });

  it("getOperation('BOUNDARY_PATCH') exposes G0/G1/G2 continuity options", () => {
    const bp = InventorCADFunctionIndexEngine.getOperation(
      "surface_operations",
      "BOUNDARY_PATCH",
    );
    expect(bp?.category).toBe("Surface_Boundary_Patch");
    const cont = bp?.tabs?.Geometry?.parameters?.find((p) => p.name === "Continuity");
    expect(cont?.options).toEqual(["g0_position", "g1_tangent", "g2_curvature"]);
  });

  it("getOperation('STITCH') registers 3 output types", () => {
    const stitch = InventorCADFunctionIndexEngine.getOperation(
      "surface_operations",
      "STITCH",
    );
    const outType = stitch?.tabs?.Geometry?.parameters?.find((p) => p.name === "Output Type");
    expect(outType?.options).toEqual(["quilt", "solid_when_watertight", "solid_force"]);
  });

  it("getOperation('SCULPT') exposes the surface→solid bridge operation modes", () => {
    const sculpt = InventorCADFunctionIndexEngine.getOperation("surface_operations", "SCULPT");
    expect(sculpt?.category).toBe("Surface_Sculpt_Combine");
    const op = sculpt?.tabs?.Geometry?.parameters?.find((p) => p.name === "Operation");
    expect(op?.options).toEqual(["add", "subtract", "new_solid"]);
  });

  it("getOperation('RULED_SURFACE') supports normal / tangent / vector direction modes", () => {
    const rs = InventorCADFunctionIndexEngine.getOperation(
      "surface_operations",
      "RULED_SURFACE",
    );
    const dirMode = rs?.tabs?.Geometry?.parameters?.find((p) => p.name === "Direction Mode");
    expect(dirMode?.options).toEqual(["normal", "tangent", "vector"]);
  });

  it("surface_operations declares dependency on sketch_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("surface_operations");
    expect(entry?.dependencies).toEqual(["sketch_operations"]);
  });

  it("getOperationsByCategory restricts within surface_operations", () => {
    const trimOps = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Surface_Modify_Trim",
      "surface_operations",
    );
    expect(trimOps.length).toBe(1);
    expect(trimOps[0]?.operation_id).toBe("TRIM_SURFACE");
  });
});

describe("InventorCADFunctionIndexEngine — part_operations module (U-CAD-FIDX-INV-02)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 25 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("part_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-02");
    expect(mod?.metadata?.operationCount).toBe(25);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(25);
  });

  it("listOperations returns exactly KNOWN_PART_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("part_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_PART_OPS].sort());
  });

  it("each part operation carries a Part_-prefixed category and non-zero param count", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("part_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Part_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(4);
    }
  });

  it("getOperation('EXTRUDE') exposes Inventor ExtrudeFeatures binding + 5 termination modes", () => {
    const ext = InventorCADFunctionIndexEngine.getOperation("part_operations", "EXTRUDE");
    expect(ext?.category).toBe("Part_Sweep_Extrude");
    expect(ext?.python_api).toContain("ExtrudeFeatures");
    const termParam = ext?.tabs?.Geometry?.parameters?.find((p) => p.name === "Termination");
    expect(termParam?.options).toEqual([
      "distance",
      "to",
      "to_next",
      "through_all",
      "between",
    ]);
  });

  it("getOperation('HOLE') registers all 5 head types and 5 thread standards", () => {
    const hole = InventorCADFunctionIndexEngine.getOperation("part_operations", "HOLE");
    const headTypes = hole?.tabs?.Geometry?.parameters?.find((p) => p.name === "Head Type");
    expect(headTypes?.options?.length).toBe(5);
    expect(headTypes?.options).toContain("counterbore");
    expect(headTypes?.options).toContain("countersink");

    const threadType = hole?.tabs?.Geometry?.parameters?.find((p) => p.name === "Thread Type");
    expect(threadType?.options?.length).toBe(6);
    expect(threadType?.options).toContain("ansi_un");
    expect(threadType?.options).toContain("iso_metric");
  });

  it("getOperation('THREAD') supports 8 thread standards", () => {
    const thread = InventorCADFunctionIndexEngine.getOperation("part_operations", "THREAD");
    const std = thread?.tabs?.Geometry?.parameters?.find((p) => p.name === "Standard");
    expect(std?.options?.length).toBe(8);
    expect(std?.options).toContain("ansi_unj");
    expect(std?.options).toContain("npt");
  });

  it("part operations declare correct dependency on sketch_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("part_operations");
    expect(entry?.dependencies).toEqual(["sketch_operations"]);
  });

  it("getOperationsByCategory restricts within part_operations", () => {
    const filletOps = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Part_Modify_Fillet",
      "part_operations",
    );
    expect(filletOps.length).toBe(1);
    expect(filletOps[0]?.operation_id).toBe("FILLET");
  });
});

describe("InventorCADFunctionIndexEngine — drift guards", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getTotalParameterCount equals 530 (sketch 138 + part 178 + surface 63 + sheet_metal 151)", () => {
    expect(InventorCADFunctionIndexEngine.getTotalParameterCount()).toBe(530);
  });

  it("sketch_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(138);
    expect(mod?.metadata?.totalParameters).toBe(138);
  });

  it("part_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("part_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(178);
    expect(mod?.metadata?.totalParameters).toBe(178);
  });

  it("surface_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("surface_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(63);
    expect(mod?.metadata?.totalParameters).toBe(63);
  });

  it("sheet_metal_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("sheet_metal_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(151);
    expect(mod?.metadata?.totalParameters).toBe(151);
  });

  it("each per-op declared parameterCount matches actual tab-sum across all modules", () => {
    for (const moduleId of [
      "sketch_operations",
      "part_operations",
      "surface_operations",
      "sheet_metal_operations",
    ]) {
      const mod = InventorCADFunctionIndexEngine.getModule(moduleId);
      for (const [opId, op] of Object.entries(mod?.operations ?? {})) {
        const declared = op.parameterCount;
        let actual = 0;
        for (const tab of Object.values(op.tabs ?? {})) {
          actual += (tab.parameters ?? tab.params ?? []).length;
        }
        expect.soft(actual, `${moduleId}/${opId} drift`).toBe(declared);
      }
    }
  });

  it("index estimated_parameter_total matches engine getTotalParameterCount", () => {
    const declared =
      InventorCADFunctionIndexEngine.getIndex().coverage_summary.estimated_parameter_total;
    expect(InventorCADFunctionIndexEngine.getTotalParameterCount()).toBe(declared);
  });

  it("index module count matches loaded modules length", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.coverage_summary.total_modules).toBe(idx.modules.length);
    expect(idx.coverage_summary.total_units_covered).toEqual([
      "U-CAD-FIDX-INV-01",
      "U-CAD-FIDX-INV-02",
      "U-CAD-FIDX-INV-03",
      "U-CAD-FIDX-INV-04",
    ]);
  });

  it("getLoadErrors is empty when catalog is healthy", () => {
    InventorCADFunctionIndexEngine.getTotalParameterCount(); // forces all loads
    expect(InventorCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
  });

  it("operationCount declared in metadata matches actual op count per module", () => {
    const sketch = InventorCADFunctionIndexEngine.getModule("sketch_operations");
    expect(Object.keys(sketch?.operations ?? {}).length).toBe(28);
    expect(sketch?.metadata?.operationCount).toBe(28);

    const part = InventorCADFunctionIndexEngine.getModule("part_operations");
    expect(Object.keys(part?.operations ?? {}).length).toBe(25);
    expect(part?.metadata?.operationCount).toBe(25);

    const surface = InventorCADFunctionIndexEngine.getModule("surface_operations");
    expect(Object.keys(surface?.operations ?? {}).length).toBe(12);
    expect(surface?.metadata?.operationCount).toBe(12);

    const sheetMetal = InventorCADFunctionIndexEngine.getModule("sheet_metal_operations");
    expect(Object.keys(sheetMetal?.operations ?? {}).length).toBe(21);
    expect(sheetMetal?.metadata?.operationCount).toBe(21);
  });
});

describe("InventorCADFunctionIndexEngine — cache discipline", () => {
  it("clearCache resets indexCache + moduleCache + loadErrors", () => {
    InventorCADFunctionIndexEngine.getIndex();
    InventorCADFunctionIndexEngine.getModule("sketch_operations");
    InventorCADFunctionIndexEngine.clearCache();
    // After clear, calling again should re-populate without throwing
    expect(() => InventorCADFunctionIndexEngine.getIndex()).not.toThrow();
    expect(() => InventorCADFunctionIndexEngine.getModule("sketch_operations")).not.toThrow();
    expect(InventorCADFunctionIndexEngine.getLoadErrors()).toEqual([]);
  });

  it("repeated getIndex returns cached reference (no I/O on second call)", () => {
    InventorCADFunctionIndexEngine.clearCache();
    const a = InventorCADFunctionIndexEngine.getIndex();
    const b = InventorCADFunctionIndexEngine.getIndex();
    expect(a).toBe(b);
  });
});
