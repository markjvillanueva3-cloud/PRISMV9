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

const KNOWN_FRAME_GENERATOR_OPS = [
  // member placement (4)
  "INSERT_FRAME_MEMBER", "CHANGE", "REUSE_FRAME_MEMBER", "AUTHOR_FRAME_MEMBER",
  // end treatments (7)
  "MITRE", "NOTCH", "TRIM_TO_FRAME", "EXTEND_TO_FRAME",
  "TRIM_AND_EXTEND", "LENGTHEN_SHORTEN", "REMOVE_END_TREATMENT",
  // output (1)
  "FRAME_BOM",
];

const KNOWN_WELDMENT_OPS = [
  // setup (1)
  "CONVERT_TO_WELDMENT",
  // preparations (3)
  "PREPARATION_COPE", "PREPARATION_CHAMFER", "PREPARATION_FILLET",
  // weld beads (3)
  "COSMETIC_WELD_BEAD", "FILLET_WELD_BEAD", "GROOVE_WELD_BEAD",
  // post-weld (1)
  "MACHINING_FEATURE",
  // annotation + cap + schedule (3)
  "WELD_SYMBOL", "END_FILL", "WELD_PASSES",
  // output (1)
  "WELDMENT_BOM",
];

const KNOWN_DRAWING_OPS = [
  // sheet management (1)
  "SHEET",
  // view creation (7)
  "BASE_VIEW", "PROJECTED_VIEW", "SECTION_VIEW", "DETAIL_VIEW",
  "AUXILIARY_VIEW", "BREAK_VIEW", "CROP_VIEW",
  // dimensions (3)
  "DIMENSION", "BASELINE_DIMENSION", "ORDINATE_DIMENSION",
  // tables (3)
  "HOLE_TABLE", "BEND_TABLE", "PARTS_LIST",
  // annotations (3)
  "NOTE_LEADER", "SURFACE_TEXTURE", "GDT_FRAME",
  // sheet ops (2)
  "TITLE_BLOCK", "REVISION_TABLE",
];

const KNOWN_ASSEMBLY_OPS = [
  // placement (2)
  "PLACE_COMPONENT", "PLACE_FROM_CONTENT_CENTER",
  // patterns (3)
  "PATTERN_RECTANGULAR", "PATTERN_CIRCULAR", "PATTERN_MIRROR",
  // constraints (6)
  "CONSTRAINT_MATE", "CONSTRAINT_ANGLE", "CONSTRAINT_TANGENT",
  "CONSTRAINT_INSERT", "CONSTRAINT_SYMMETRY", "CONSTRAINT_ROTATION",
  // joints (6)
  "JOINT_RIGID", "JOINT_ROTATIONAL", "JOINT_SLIDER",
  "JOINT_CYLINDRICAL", "JOINT_PLANAR", "JOINT_BALL",
  // analysis + adaptivity (4)
  "ADAPTIVITY", "FRAME_ANALYSIS", "BILL_OF_MATERIALS", "INTERFERENCE_ANALYSIS",
];

// All 6 constraint type op IDs — exercised together to verify span
const ASSEMBLY_CONSTRAINT_OPS = [
  "CONSTRAINT_MATE",
  "CONSTRAINT_ANGLE",
  "CONSTRAINT_TANGENT",
  "CONSTRAINT_INSERT",
  "CONSTRAINT_SYMMETRY",
  "CONSTRAINT_ROTATION",
];

// All 6 joint type op IDs
const ASSEMBLY_JOINT_OPS = [
  "JOINT_RIGID",
  "JOINT_ROTATIONAL",
  "JOINT_SLIDER",
  "JOINT_CYLINDRICAL",
  "JOINT_PLANAR",
  "JOINT_BALL",
];

// Phase 1 is COMPLETE — no remaining future modules
const PLANNED_FUTURE_MODULES: string[] = [];

describe("InventorCADFunctionIndexEngine — index navigation", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getIndex returns Autodesk Inventor metadata with COMPLETE Phase 1 coverage", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.system_id).toBe("inventor");
    expect(idx.module_id).toBe("cad_function_index");
    expect(idx.module_name).toBe("Autodesk Inventor CAD Unified Function Index");
    expect(idx.schema_version).toBe("1.0.0");
    expect(idx.modules.length).toBe(8);
    expect(idx.coverage_summary.api_surface.coverage_state).toBe("COMPLETE");
    expect(idx.coverage_summary.api_surface.phase_1_target_modules_remaining).toBe(0);
  });

  it("listModules surfaces all 8 Phase 1 Inventor modules in registration order", () => {
    expect(InventorCADFunctionIndexEngine.listModules()).toEqual([
      "sketch_operations",
      "part_operations",
      "surface_operations",
      "sheet_metal_operations",
      "frame_generator_operations",
      "weldment_operations",
      "drawing_operations",
      "assembly_operations",
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

  it("future_modules is empty after Phase 1 COMPLETE (INV-08 ship)", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    const planned = (idx.future_modules ?? []).map((f) => f.planned_id);
    expect(planned).toEqual(PLANNED_FUTURE_MODULES);
    expect(idx.future_modules ?? []).toEqual([]);
  });

  it("phase_1_modules_pending is empty array after COMPLETE", () => {
    const idx = InventorCADFunctionIndexEngine.getIndex();
    expect(idx.coverage_summary.api_surface.phase_1_modules_pending).toEqual([]);
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

  it("listAllOperations returns 150 operations across all 8 Phase 1 modules", () => {
    expect(InventorCADFunctionIndexEngine.listAllOperations().length).toBe(150);
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

describe("InventorCADFunctionIndexEngine — frame_generator_operations module (U-CAD-FIDX-INV-05)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 12 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("frame_generator_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-05");
    expect(mod?.metadata?.operationCount).toBe(12);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(12);
  });

  it("listOperations returns exactly KNOWN_FRAME_GENERATOR_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("frame_generator_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_FRAME_GENERATOR_OPS].sort());
  });

  it("each frame generator operation carries a FrameGenerator_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("frame_generator_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^FrameGenerator_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(3);
    }
  });

  it("getOperation('INSERT_FRAME_MEMBER') exposes 4 tabs and the 9-position alignment grid", () => {
    const insert = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "INSERT_FRAME_MEMBER",
    );
    expect(insert?.category).toBe("FrameGenerator_Member_Insert");
    expect(insert?.python_api).toContain("FrameMembers.Add");
    expect(Object.keys(insert?.tabs ?? {})).toEqual(["Lines", "Family", "Orientation", "Treatments"]);
    const align = insert?.tabs?.Orientation?.parameters?.find((p) => p.name === "Alignment Position");
    expect(align?.options).toEqual([
      "top_left",
      "top",
      "top_right",
      "left",
      "center",
      "right",
      "bottom_left",
      "bottom",
      "bottom_right",
    ]);
  });

  it("getOperation('INSERT_FRAME_MEMBER') Family tab carries Content Center standard options", () => {
    const insert = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "INSERT_FRAME_MEMBER",
    );
    const std = insert?.tabs?.Family?.parameters?.find((p) => p.name === "Standard");
    expect(std?.options).toEqual([
      "ansi",
      "iso",
      "din",
      "jis",
      "as",
      "aisc",
      "bsi",
      "gb",
      "custom",
    ]);
  });

  it("getOperation('MITRE') supports single + double mitre with required Member 1/2 and optional Member 3", () => {
    const mitre = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "MITRE",
    );
    expect(mitre?.category).toBe("FrameGenerator_Treatment_Mitre");
    const mitreType = mitre?.tabs?.Selection?.parameters?.find((p) => p.name === "Mitre Type");
    expect(mitreType?.options).toEqual(["single_mitre", "double_mitre"]);
    const member1 = mitre?.tabs?.Selection?.parameters?.find((p) => p.name === "Member 1");
    const member2 = mitre?.tabs?.Selection?.parameters?.find((p) => p.name === "Member 2");
    const member3 = mitre?.tabs?.Selection?.parameters?.find((p) => p.name === "Member 3");
    expect(member1?.required).toBe(true);
    expect(member2?.required).toBe(true);
    expect(member3?.required).not.toBe(true);
    expect(member3?.description).toContain("Double mitre");
  });

  it("getOperation('NOTCH') registers profile / face / dual-face notch types", () => {
    const notch = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "NOTCH",
    );
    const notchType = notch?.tabs?.Selection?.parameters?.find((p) => p.name === "Notch Type");
    expect(notchType?.options).toEqual(["profile_notch", "face_notch", "dual_face_notch"]);
    const through = notch?.tabs?.Selection?.parameters?.find((p) => p.name === "Through Cut");
    expect(through?.type).toBe("checkbox");
  });

  it("getOperation('REMOVE_END_TREATMENT') filters across all treatment families", () => {
    const rem = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "REMOVE_END_TREATMENT",
    );
    const filter = rem?.tabs?.Selection?.parameters?.find((p) => p.name === "Treatment Filter");
    expect(filter?.options).toEqual([
      "all",
      "mitre_only",
      "notch_only",
      "trim_only",
      "extend_only",
      "lengthen_shorten_only",
    ]);
  });

  it("getOperation('FRAME_BOM') emits the full output-format set including parts-list table", () => {
    const bom = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "FRAME_BOM",
    );
    const fmt = bom?.tabs?.Output?.parameters?.find((p) => p.name === "Output Format");
    expect(fmt?.options).toEqual([
      "csv",
      "xlsx",
      "xml",
      "inventor_parts_list",
      "iam_drawing_table",
    ]);
  });

  it("getOperation('AUTHOR_FRAME_MEMBER') splits Family and Output tabs across 10 params", () => {
    const author = InventorCADFunctionIndexEngine.getOperation(
      "frame_generator_operations",
      "AUTHOR_FRAME_MEMBER",
    );
    expect(Object.keys(author?.tabs ?? {})).toEqual(["Family", "Output"]);
    expect(author?.parameterCount).toBe(10);
    const lib = author?.tabs?.Output?.parameters?.find((p) => p.name === "Library");
    expect(lib?.options).toEqual([
      "read_write_library",
      "shared_content_center",
      "project_library",
    ]);
  });

  it("frame_generator_operations declares dependencies on sketch + part_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("frame_generator_operations");
    expect(entry?.dependencies).toEqual(["sketch_operations", "part_operations"]);
  });

  it("getOperationsByCategory restricts within frame_generator_operations", () => {
    const insertOps = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "FrameGenerator_Member_Insert",
      "frame_generator_operations",
    );
    expect(insertOps.length).toBe(1);
    expect(insertOps[0]?.operation_id).toBe("INSERT_FRAME_MEMBER");
  });
});

describe("InventorCADFunctionIndexEngine — weldment_operations module (U-CAD-FIDX-INV-06)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 12 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("weldment_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-06");
    expect(mod?.metadata?.operationCount).toBe(12);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(12);
  });

  it("listOperations returns exactly KNOWN_WELDMENT_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("weldment_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_WELDMENT_OPS].sort());
  });

  it("each weldment operation carries a Weldment_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("weldment_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Weldment_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(4);
    }
  });

  it("getOperation('CONVERT_TO_WELDMENT') exposes 6 welding standards", () => {
    const conv = InventorCADFunctionIndexEngine.getOperation(
      "weldment_operations",
      "CONVERT_TO_WELDMENT",
    );
    expect(conv?.category).toBe("Weldment_Setup_Convert");
    expect(conv?.python_api).toBe("AssemblyDocument.ConvertToWeldment");
    const std = conv?.tabs?.Properties?.parameters?.find((p) => p.name === "Welding Standard");
    expect(std?.options).toEqual([
      "aws_a2_4",
      "iso_2553",
      "din_iso_2553",
      "jis_z_3021",
      "gb_t_324",
      "ansi_y14_5",
    ]);
  });

  it("getOperation('PREPARATION_CHAMFER') registers 6 groove geometry types", () => {
    const ch = InventorCADFunctionIndexEngine.getOperation(
      "weldment_operations",
      "PREPARATION_CHAMFER",
    );
    const groove = ch?.tabs?.Selection?.parameters?.find((p) => p.name === "Groove Type");
    expect(groove?.options).toEqual([
      "v_groove",
      "single_bevel",
      "double_bevel",
      "j_groove",
      "u_groove",
      "double_v",
    ]);
    const angle = ch?.tabs?.Selection?.parameters?.find((p) => p.name === "Chamfer Angle");
    expect(angle?.default).toBe(60);
    expect(angle?.min).toBe(10);
    expect(angle?.max).toBe(90);
  });

  it("getOperation('FILLET_WELD_BEAD') splits 4 tabs and 13 params with optional Face Set 3", () => {
    const fw = InventorCADFunctionIndexEngine.getOperation(
      "weldment_operations",
      "FILLET_WELD_BEAD",
    );
    expect(fw?.category).toBe("Weldment_Bead_Fillet");
    expect(Object.keys(fw?.tabs ?? {})).toEqual(["Selection", "Bead", "Termination"]);
    expect(fw?.parameterCount).toBe(13);
    const face1 = fw?.tabs?.Selection?.parameters?.find((p) => p.name === "Face Set 1");
    const face3 = fw?.tabs?.Selection?.parameters?.find((p) => p.name === "Face Set 3");
    expect(face1?.required).toBe(true);
    expect(face3?.required).not.toBe(true);
    const contour = fw?.tabs?.Bead?.parameters?.find((p) => p.name === "Contour");
    expect(contour?.options).toEqual(["flat", "convex", "concave"]);
    const dir = fw?.tabs?.Termination?.parameters?.find((p) => p.name === "Direction");
    expect(dir?.options).toEqual(["from_face_1", "from_face_2", "centered"]);
  });

  it("getOperation('GROOVE_WELD_BEAD') exposes full vs partial penetration + 4 contours", () => {
    const gw = InventorCADFunctionIndexEngine.getOperation(
      "weldment_operations",
      "GROOVE_WELD_BEAD",
    );
    const pen = gw?.tabs?.Selection?.parameters?.find((p) => p.name === "Penetration");
    expect(pen?.options).toEqual(["full", "partial"]);
    const contour = gw?.tabs?.Bead?.parameters?.find((p) => p.name === "Contour");
    expect(contour?.options).toEqual(["flat", "convex", "concave", "ground_flush"]);
    const reinforcement = gw?.tabs?.Bead?.parameters?.find((p) => p.name === "Reinforcement");
    expect(reinforcement?.default).toBe(1.5);
  });

  it("getOperation('WELD_SYMBOL') registers 15 weld types per AWS A2.4 / ISO 2553", () => {
    const sym = InventorCADFunctionIndexEngine.getOperation("weldment_operations", "WELD_SYMBOL");
    const wt = sym?.tabs?.Symbol?.parameters?.find((p) => p.name === "Weld Type");
    expect(wt?.options?.length).toBe(15);
    expect(wt?.options).toContain("fillet");
    expect(wt?.options).toContain("v_groove");
    expect(wt?.options).toContain("flare_v");
    const finish = sym?.tabs?.Bead?.parameters?.find((p) => p.name === "Finish Symbol");
    expect(finish?.options).toEqual([
      "none",
      "g_grind",
      "m_machine",
      "c_chip",
      "h_hammer",
      "r_roll",
      "u_unspecified",
    ]);
  });

  it("getOperation('WELD_PASSES') supports the 7 AWS welding processes", () => {
    const wp = InventorCADFunctionIndexEngine.getOperation("weldment_operations", "WELD_PASSES");
    const process = wp?.tabs?.Pass?.parameters?.find((p) => p.name === "Process");
    expect(process?.options).toEqual(["smaw", "gmaw", "fcaw", "gtaw", "saw", "esw", "ew"]);
    const passCount = wp?.tabs?.Pass?.parameters?.find((p) => p.name === "Pass Count");
    expect(passCount?.required).toBe(true);
    expect(passCount?.min).toBe(1);
  });

  it("getOperation('WELDMENT_BOM') emits 6 output formats including weld_procedure_form", () => {
    const bom = InventorCADFunctionIndexEngine.getOperation(
      "weldment_operations",
      "WELDMENT_BOM",
    );
    const fmt = bom?.tabs?.Output?.parameters?.find((p) => p.name === "Output Format");
    expect(fmt?.options).toEqual([
      "xlsx",
      "csv",
      "xml",
      "inventor_parts_list",
      "iam_drawing_table",
      "weld_procedure_form",
    ]);
    const dens = bom?.tabs?.Output?.parameters?.find((p) => p.name === "Electrode Density");
    expect(dens?.default).toBe(7.85);
    const eff = bom?.tabs?.Output?.parameters?.find((p) => p.name === "Deposition Efficiency");
    expect(eff?.default).toBe(0.95);
    expect(eff?.min).toBe(0);
    expect(eff?.max).toBe(1);
  });

  it("weldment_operations declares dependencies on sketch + part_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("weldment_operations");
    expect(entry?.dependencies).toEqual(["sketch_operations", "part_operations"]);
  });

  it("getOperationsByCategory restricts within weldment_operations", () => {
    const setupOps = InventorCADFunctionIndexEngine.getOperationsByCategory(
      "Weldment_Setup_Convert",
      "weldment_operations",
    );
    expect(setupOps.length).toBe(1);
    expect(setupOps[0]?.operation_id).toBe("CONVERT_TO_WELDMENT");

    const beadOps = InventorCADFunctionIndexEngine.listOperations("weldment_operations").filter(
      (o) => o.category.startsWith("Weldment_Bead_"),
    );
    // Cosmetic + Fillet + Groove + EndFill + PassSchedule (multi-pass schedule
    // attaches to a parent bead so it lives in the Bead category family).
    expect(beadOps.length).toBe(5);
    const beadCategories = beadOps.map((o) => o.category).sort();
    expect(beadCategories).toEqual([
      "Weldment_Bead_Cosmetic",
      "Weldment_Bead_EndFill",
      "Weldment_Bead_Fillet",
      "Weldment_Bead_Groove",
      "Weldment_Bead_PassSchedule",
    ]);
  });
});

describe("InventorCADFunctionIndexEngine — drawing_operations module (U-CAD-FIDX-INV-07)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 19 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("drawing_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-07");
    expect(mod?.metadata?.operationCount).toBe(19);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(19);
  });

  it("listOperations returns exactly KNOWN_DRAWING_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("drawing_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_DRAWING_OPS].sort());
  });

  it("each drawing operation carries a Drawing_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("drawing_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Drawing_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(4);
    }
  });

  it("getOperation('SHEET') registers all 11 sheet formats including ANSI A..E and ISO A0..A4", () => {
    const sheet = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "SHEET");
    expect(sheet?.category).toBe("Drawing_Sheet_Manage");
    const fmt = sheet?.tabs?.Sheet?.parameters?.find((p) => p.name === "Format");
    expect(fmt?.options).toEqual([
      "ansi_a", "ansi_b", "ansi_c", "ansi_d", "ansi_e",
      "iso_a0", "iso_a1", "iso_a2", "iso_a3", "iso_a4",
      "custom",
    ]);
  });

  it("getOperation('BASE_VIEW') exposes 6 styles + 11 orientations + 4 thread modes", () => {
    const bv = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "BASE_VIEW");
    expect(bv?.category).toBe("Drawing_View_Base");
    expect(bv?.python_api).toBe("Sheet.DrawingViews.AddBaseView");
    const style = bv?.tabs?.View?.parameters?.find((p) => p.name === "Style");
    expect(style?.options).toEqual([
      "hidden_line", "hidden_line_removed", "shaded",
      "shaded_with_edges", "wireframe", "rendered",
    ]);
    const orient = bv?.tabs?.View?.parameters?.find((p) => p.name === "Orientation");
    expect(orient?.options?.length).toBe(11);
    const threads = bv?.tabs?.Display?.parameters?.find((p) => p.name === "Threads Display");
    expect(threads?.options).toEqual(["none", "schematic", "cosmetic", "feature"]);
  });

  it("getOperation('SECTION_VIEW') registers 4 section types + 3-tab structure", () => {
    const sv = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "SECTION_VIEW");
    expect(Object.keys(sv?.tabs ?? {})).toEqual(["View", "Style", "Filter"]);
    const sType = sv?.tabs?.View?.parameters?.find((p) => p.name === "Section Type");
    expect(sType?.options).toEqual(["full", "half", "aligned", "offset"]);
    const hatchAngle = sv?.tabs?.Style?.parameters?.find((p) => p.name === "Hatch Angle");
    expect(hatchAngle?.default).toBe(45);
  });

  it("getOperation('DETAIL_VIEW') exposes 3 boundary shapes + 3 connection styles", () => {
    const dv = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "DETAIL_VIEW");
    const shape = dv?.tabs?.View?.parameters?.find((p) => p.name === "Boundary Shape");
    expect(shape?.options).toEqual(["circular", "rectangular", "sketched"]);
    const conn = dv?.tabs?.Style?.parameters?.find((p) => p.name === "Connection Style");
    expect(conn?.options).toEqual(["smooth", "jagged", "connected"]);
    const mag = dv?.tabs?.View?.parameters?.find((p) => p.name === "Magnification");
    expect(mag?.default).toBe(2);
  });

  it("getOperation('DIMENSION') registers all 7 type modes + 8 tolerance types per ASME Y14.5", () => {
    const dim = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "DIMENSION");
    expect(dim?.category).toBe("Drawing_Dimension_General");
    const type = dim?.tabs?.Selection?.parameters?.find((p) => p.name === "Type");
    expect(type?.options).toEqual([
      "linear", "aligned", "angular", "radial",
      "diametric", "arc_length", "chamfer",
    ]);
    const tol = dim?.tabs?.Style?.parameters?.find((p) => p.name === "Tolerance Type");
    expect(tol?.options).toEqual([
      "none", "symmetric", "deviation", "limits",
      "basic", "reference", "max", "min",
    ]);
    const prec = dim?.tabs?.Style?.parameters?.find((p) => p.name === "Precision");
    expect(prec?.options?.length).toBe(11); // 5 decimal + 6 fractional
  });

  it("getOperation('GDT_FRAME') exposes 16 geometric characteristics per ASME Y14.5", () => {
    const gdt = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "GDT_FRAME");
    expect(gdt?.category).toBe("Drawing_Annotation_GDT");
    expect(gdt?.python_api).toBe("Sheet.FeatureControlFrames.Add");
    const sym = gdt?.tabs?.Symbol?.parameters?.find((p) => p.name === "Symbol");
    expect(sym?.options?.length).toBe(16);
    expect(sym?.options).toContain("flatness");
    expect(sym?.options).toContain("perpendicularity");
    expect(sym?.options).toContain("position");
    expect(sym?.options).toContain("runout_total");
    const mod = gdt?.tabs?.Symbol?.parameters?.find((p) => p.name === "Modifier");
    expect(mod?.options).toEqual([
      "none", "m_mmc", "l_lmc", "f_free_state", "p_projected", "t_tangent_plane",
    ]);
  });

  it("getOperation('SURFACE_TEXTURE') exposes 4 symbol types + 8 lay directions", () => {
    const st = InventorCADFunctionIndexEngine.getOperation(
      "drawing_operations",
      "SURFACE_TEXTURE",
    );
    const symbol = st?.tabs?.Symbol?.parameters?.find((p) => p.name === "Symbol Type");
    expect(symbol?.options).toEqual([
      "basic",
      "material_removal_required",
      "material_removal_prohibited",
      "any_process",
    ]);
    const lay = st?.tabs?.Style?.parameters?.find((p) => p.name === "Lay Direction");
    expect(lay?.options).toEqual([
      "none", "parallel", "perpendicular", "crossed",
      "multidirectional", "circular", "radial", "particulate",
    ]);
  });

  it("getOperation('PARTS_LIST') registers 3 BOM views + 5 grouping modes", () => {
    const pl = InventorCADFunctionIndexEngine.getOperation("drawing_operations", "PARTS_LIST");
    const bv = pl?.tabs?.Selection?.parameters?.find((p) => p.name === "BOM View");
    expect(bv?.options).toEqual(["structured", "parts_only", "compact"]);
    const grp = pl?.tabs?.Filter?.parameters?.find((p) => p.name === "Group By");
    expect(grp?.options).toEqual([
      "item", "part_number", "category", "vendor", "custom_property",
    ]);
  });

  it("getOperation('REVISION_TABLE') registers 3 number formats including ASME Y14.35 letters", () => {
    const rt = InventorCADFunctionIndexEngine.getOperation(
      "drawing_operations",
      "REVISION_TABLE",
    );
    const fmt = rt?.tabs?.Sheet?.parameters?.find((p) => p.name === "Number Format");
    expect(fmt?.options).toEqual([
      "letters_asme_y14_35",
      "letters_no_skips",
      "numeric_1_2_3",
    ]);
  });

  it("drawing_operations declares dependencies on part + sheet_metal_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("drawing_operations");
    expect(entry?.dependencies).toEqual(["part_operations", "sheet_metal_operations"]);
  });

  it("getOperationsByCategory restricts within drawing_operations across the 4 view families", () => {
    const viewOps = InventorCADFunctionIndexEngine.listOperations("drawing_operations").filter(
      (o) => o.category.startsWith("Drawing_View_"),
    );
    // Base + Projected + Section + Detail + Auxiliary + Break + Crop = 7
    expect(viewOps.length).toBe(7);
    const dimOps = InventorCADFunctionIndexEngine.listOperations("drawing_operations").filter(
      (o) => o.category.startsWith("Drawing_Dimension_"),
    );
    // General + Baseline + Ordinate = 3
    expect(dimOps.length).toBe(3);
    const tableOps = InventorCADFunctionIndexEngine.listOperations("drawing_operations").filter(
      (o) => o.category.startsWith("Drawing_Table_"),
    );
    // HoleTable + BendTable + PartsList = 3
    expect(tableOps.length).toBe(3);
  });
});

describe("InventorCADFunctionIndexEngine — assembly_operations module (U-CAD-FIDX-INV-08)", () => {
  beforeEach(() => InventorCADFunctionIndexEngine.clearCache());

  it("getModule loads catalog with metadata + 21 operations", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("assembly_operations");
    expect(mod?.metadata?.milestone).toBe("U-CAD-FIDX-INV-08");
    expect(mod?.metadata?.operationCount).toBe(21);
    expect(Object.keys(mod?.operations ?? {}).length).toBe(21);
  });

  it("listOperations returns exactly KNOWN_ASSEMBLY_OPS", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("assembly_operations");
    const opIds = ops.map((o) => o.operation_id).sort();
    expect(opIds).toEqual([...KNOWN_ASSEMBLY_OPS].sort());
  });

  it("each assembly operation carries an Assembly_-prefixed category", () => {
    const ops = InventorCADFunctionIndexEngine.listOperations("assembly_operations");
    for (const op of ops) {
      expect.soft(op.category, `op ${op.operation_id} category`).toMatch(/^Assembly_/);
      expect.soft(op.params_count, `op ${op.operation_id} params`).toBeGreaterThanOrEqual(4);
    }
  });

  it("getOperation('PLACE_COMPONENT') exposes 6 placement modes including by_constraint + grounded flag", () => {
    const place = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "PLACE_COMPONENT",
    );
    expect(place?.python_api).toBe("AssemblyComponentDefinition.Occurrences.Add");
    const mode = place?.tabs?.Position?.parameters?.find((p) => p.name === "Placement Mode");
    expect(mode?.options).toEqual([
      "free_place",
      "at_origin",
      "at_snap_face",
      "at_snap_edge",
      "at_snap_point",
      "by_constraint",
    ]);
    const grounded = place?.tabs?.Position?.parameters?.find((p) => p.name === "Grounded");
    expect(grounded?.type).toBe("checkbox");
    expect(grounded?.default).toBe(false);
  });

  it("getOperation('CONSTRAINT_MATE') registers all 6 mate solutions including Mate-Insert variants", () => {
    const mate = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "CONSTRAINT_MATE",
    );
    expect(mate?.category).toBe("Assembly_Constraint_Mate");
    const sol = mate?.tabs?.Solution?.parameters?.find((p) => p.name === "Solution");
    expect(sol?.options).toEqual([
      "mate",
      "flush",
      "mate_tangent_outside",
      "mate_tangent_inside",
      "mate_insert_aligned",
      "mate_insert_opposed",
    ]);
    const method = mate?.tabs?.Solution?.parameters?.find(
      (p) => p.name === "Solution Method",
    );
    expect(method?.options).toEqual(["best_fit", "lock", "ignore_redundancy"]);
  });

  it("getOperation('CONSTRAINT_ANGLE') exposes 3 solution modes including explicit_reference_vector", () => {
    const ang = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "CONSTRAINT_ANGLE",
    );
    const sol = ang?.tabs?.Solution?.parameters?.find((p) => p.name === "Solution");
    expect(sol?.options).toEqual(["directed", "undirected", "explicit_reference_vector"]);
  });

  it("getOperation('CONSTRAINT_INSERT') uses 4 params (axial-alignment + face-mate combo)", () => {
    const ins = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "CONSTRAINT_INSERT",
    );
    expect(ins?.parameterCount).toBe(4);
    const sol = ins?.tabs?.Solution?.parameters?.find((p) => p.name === "Solution");
    expect(sol?.options).toEqual(["aligned", "opposed"]);
    const pin = ins?.tabs?.Selection?.parameters?.find((p) => p.name === "Pin Geometry");
    expect(pin?.required).toBe(true);
  });

  it("getOperation('CONSTRAINT_ROTATION') supports rotation + rotation_translation with ratio + driving side", () => {
    const rot = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "CONSTRAINT_ROTATION",
    );
    const type = rot?.tabs?.Solution?.parameters?.find((p) => p.name === "Type");
    expect(type?.options).toEqual(["rotation", "rotation_translation"]);
    const ratio = rot?.tabs?.Solution?.parameters?.find((p) => p.name === "Ratio");
    expect(ratio?.required).toBe(true);
    const drv = rot?.tabs?.Solution?.parameters?.find((p) => p.name === "Driving");
    expect(drv?.options).toEqual(["first", "second", "either"]);
  });

  it("each of 6 classical constraint ops carries Assembly_Constraint_ category and First/Second Geometry", () => {
    for (const opId of ASSEMBLY_CONSTRAINT_OPS) {
      const op = InventorCADFunctionIndexEngine.getOperation("assembly_operations", opId);
      expect.soft(op?.category, `${opId} category`).toMatch(/^Assembly_Constraint_/);
      const allParams = Object.values(op?.tabs ?? {}).flatMap((t) => t.parameters ?? []);
      const hasFirst = allParams.some((p) =>
        p.name === "First Geometry" ||
        p.name === "First Component" ||
        p.name === "Pin Geometry",
      );
      const hasSecond = allParams.some((p) =>
        p.name === "Second Geometry" ||
        p.name === "Second Component" ||
        p.name === "Hole Geometry",
      );
      expect.soft(hasFirst, `${opId} first selection`).toBe(true);
      expect.soft(hasSecond, `${opId} second selection`).toBe(true);
    }
  });

  it("each of 6 joint ops carries Assembly_Joint_ category, First/Second Origin, and references real kJointType", () => {
    for (const opId of ASSEMBLY_JOINT_OPS) {
      const op = InventorCADFunctionIndexEngine.getOperation("assembly_operations", opId);
      expect.soft(op?.category, `${opId} category`).toMatch(/^Assembly_Joint_/);
      expect.soft(op?.python_api, `${opId} api`).toMatch(/AssemblyJoints\.Add \(k.+JointType\)/);
      const allParams = Object.values(op?.tabs ?? {}).flatMap((t) => t.parameters ?? []);
      const hasFirstOrigin = allParams.some((p) => p.name === "First Origin");
      const hasSecondOrigin = allParams.some((p) => p.name === "Second Origin");
      expect.soft(hasFirstOrigin, `${opId} first origin`).toBe(true);
      expect.soft(hasSecondOrigin, `${opId} second origin`).toBe(true);
    }
  });

  it("getOperation('JOINT_ROTATIONAL') exposes limits with 4 limit-type modes + damping", () => {
    const jr = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "JOINT_ROTATIONAL",
    );
    expect(jr?.python_api).toBe(
      "AssemblyComponentDefinition.AssemblyJoints.Add (kRotationalJointType)",
    );
    const limType = jr?.tabs?.Limits?.parameters?.find((p) => p.name === "Limits Type");
    expect(limType?.options).toEqual(["none", "min_only", "max_only", "both"]);
    const damping = jr?.tabs?.Limits?.parameters?.find((p) => p.name === "Damping");
    expect(damping?.unit).toBe("Nms/rad");
    expect(damping?.default).toBe(0);
  });

  it("getOperation('JOINT_SLIDER') exposes friction with bounded fraction range 0..1", () => {
    const js = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "JOINT_SLIDER",
    );
    const fric = js?.tabs?.Limits?.parameters?.find((p) => p.name === "Friction");
    expect(fric?.unit).toBe("fraction");
    expect(fric?.min).toBe(0);
    expect(fric?.max).toBe(1);
    expect(fric?.default).toBe(0);
  });

  it("getOperation('PATTERN_CIRCULAR') exposes 3 distribution modes with 360 default total angle", () => {
    const pc = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "PATTERN_CIRCULAR",
    );
    const totalAngle = pc?.tabs?.Pattern?.parameters?.find((p) => p.name === "Total Angle");
    expect(totalAngle?.default).toBe(360);
    const dist = pc?.tabs?.Pattern?.parameters?.find((p) => p.name === "Distribution");
    expect(dist?.options).toEqual(["equal", "compute_angle", "specify_angles"]);
    const count = pc?.tabs?.Pattern?.parameters?.find((p) => p.name === "Count");
    expect(count?.min).toBe(2);
  });

  it("getOperation('FRAME_ANALYSIS') registers 3 analysis types + bounded convergence tolerance", () => {
    const fa = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "FRAME_ANALYSIS",
    );
    const type = fa?.tabs?.Setup?.parameters?.find((p) => p.name === "Analysis Type");
    expect(type?.options).toEqual(["static", "modal", "buckling"]);
    const beam = fa?.tabs?.Setup?.parameters?.find((p) => p.name === "Beam Element Order");
    expect(beam?.options).toEqual(["linear", "quadratic"]);
    const tol = fa?.tabs?.Setup?.parameters?.find((p) => p.name === "Convergence Tolerance");
    expect(tol?.default).toBe(1e-6);
    expect(tol?.min).toBe(1e-12);
    expect(tol?.max).toBe(1e-2);
  });

  it("getOperation('BILL_OF_MATERIALS') exposes 3 view types + 4 standard hardware treatments + 5 output formats", () => {
    const bom = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "BILL_OF_MATERIALS",
    );
    const view = bom?.tabs?.Setup?.parameters?.find((p) => p.name === "View Type");
    expect(view?.options).toEqual(["structured", "parts_only", "compact"]);
    const stdHw = bom?.tabs?.Setup?.parameters?.find(
      (p) => p.name === "Standard Hardware Treatment",
    );
    expect(stdHw?.options).toEqual(["promote", "aggregate", "hide"]);
    const fmt = bom?.tabs?.Output?.parameters?.find((p) => p.name === "Output Format");
    expect(fmt?.options).toEqual(["xlsx", "csv", "xml", "drawing_table", "vault_export"]);
  });

  it("getOperation('INTERFERENCE_ANALYSIS') exposes 3 detection modes + 4 result outputs", () => {
    const ia = InventorCADFunctionIndexEngine.getOperation(
      "assembly_operations",
      "INTERFERENCE_ANALYSIS",
    );
    const mode = ia?.tabs?.Setup?.parameters?.find((p) => p.name === "Detection Mode");
    expect(mode?.options).toEqual([
      "all_vs_all",
      "selected_vs_all",
      "selected_vs_selected",
    ]);
    const out = ia?.tabs?.Output?.parameters?.find((p) => p.name === "Result Output");
    expect(out?.options).toEqual([
      "dialog_only",
      "csv_export",
      "xml_export",
      "annotated_view",
    ]);
  });

  it("assembly_operations declares dependency on part_operations", () => {
    const entry = InventorCADFunctionIndexEngine.getModuleEntry("assembly_operations");
    expect(entry?.dependencies).toEqual(["part_operations"]);
  });

  it("getOperationsByCategory restricts within assembly_operations across constraint/joint/pattern families", () => {
    const constraintOps = InventorCADFunctionIndexEngine.listOperations(
      "assembly_operations",
    ).filter((o) => o.category.startsWith("Assembly_Constraint_"));
    expect(constraintOps.length).toBe(6);
    const jointOps = InventorCADFunctionIndexEngine.listOperations(
      "assembly_operations",
    ).filter((o) => o.category.startsWith("Assembly_Joint_"));
    expect(jointOps.length).toBe(6);
    const patternOps = InventorCADFunctionIndexEngine.listOperations(
      "assembly_operations",
    ).filter((o) => o.category.startsWith("Assembly_Pattern_"));
    expect(patternOps.length).toBe(3);
  });

  // Adversarial coverage — ensures findParameter/searchParameters tolerate edge inputs
  // against the assembly module specifically (most parametrically complex INV module).
  it("findParameter returns null for empty parameter name (adversarial empty)", () => {
    expect(
      InventorCADFunctionIndexEngine.findParameter(
        "assembly_operations",
        "PLACE_COMPONENT",
        "",
      ),
    ).toBeNull();
  });

  it("searchParameters tolerates oversize keyword (adversarial 1000-char input)", () => {
    const big = "x".repeat(1000);
    expect(InventorCADFunctionIndexEngine.searchParameters(big)).toEqual([]);
  });

  it("getOperation tolerates empty string op id (adversarial empty)", () => {
    expect(
      InventorCADFunctionIndexEngine.getOperation("assembly_operations", ""),
    ).toBeNull();
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

  it("getTotalParameterCount equals 983 across all 8 Phase 1 modules (sketch 138 + part 178 + surface 63 + sheet_metal 151 + frame_generator 83 + weldment 95 + drawing 145 + assembly 130)", () => {
    expect(InventorCADFunctionIndexEngine.getTotalParameterCount()).toBe(983);
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

  it("frame_generator_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("frame_generator_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(83);
    expect(mod?.metadata?.totalParameters).toBe(83);
  });

  it("weldment_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("weldment_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(95);
    expect(mod?.metadata?.totalParameters).toBe(95);
  });

  it("drawing_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("drawing_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(145);
    expect(mod?.metadata?.totalParameters).toBe(145);
  });

  it("assembly_operations declared totalParameters matches actual sum (drift guard)", () => {
    const mod = InventorCADFunctionIndexEngine.getModule("assembly_operations");
    let actual = 0;
    for (const op of Object.values(mod?.operations ?? {})) {
      for (const tab of Object.values(op.tabs ?? {})) {
        actual += (tab.parameters ?? tab.params ?? []).length;
      }
    }
    expect(actual).toBe(130);
    expect(mod?.metadata?.totalParameters).toBe(130);
  });

  it("each per-op declared parameterCount matches actual tab-sum across all modules", () => {
    for (const moduleId of [
      "sketch_operations",
      "part_operations",
      "surface_operations",
      "sheet_metal_operations",
      "frame_generator_operations",
      "weldment_operations",
      "drawing_operations",
      "assembly_operations",
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
      "U-CAD-FIDX-INV-05",
      "U-CAD-FIDX-INV-06",
      "U-CAD-FIDX-INV-07",
      "U-CAD-FIDX-INV-08",
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

    const frameGen = InventorCADFunctionIndexEngine.getModule("frame_generator_operations");
    expect(Object.keys(frameGen?.operations ?? {}).length).toBe(12);
    expect(frameGen?.metadata?.operationCount).toBe(12);

    const weldment = InventorCADFunctionIndexEngine.getModule("weldment_operations");
    expect(Object.keys(weldment?.operations ?? {}).length).toBe(12);
    expect(weldment?.metadata?.operationCount).toBe(12);

    const drawing = InventorCADFunctionIndexEngine.getModule("drawing_operations");
    expect(Object.keys(drawing?.operations ?? {}).length).toBe(19);
    expect(drawing?.metadata?.operationCount).toBe(19);

    const assembly = InventorCADFunctionIndexEngine.getModule("assembly_operations");
    expect(Object.keys(assembly?.operations ?? {}).length).toBe(21);
    expect(assembly?.metadata?.operationCount).toBe(21);
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
