/**
 * Fusion360CodeGeneratorEngine — Tests
 * Validates Python script generation for the Fusion 360 API.
 */
import { describe, it, expect } from "vitest";
import {
  Fusion360CodeGeneratorEngine,
  type Fusion360Script,
} from "../engines/Fusion360CodeGeneratorEngine.js";
import type { ExtractedAction } from "../engines/VideoActionExtractorEngine.js";

const engine = new Fusion360CodeGeneratorEngine();

// ── Helpers ────────────────────────────────────────────────────────

function action(
  step: number,
  type: ExtractedAction["action_type"],
  params: Record<string, number | string> = {},
  desc = "",
): ExtractedAction {
  return {
    step_number: step,
    timestamp_s: 0,
    action_type: type,
    operation: type,
    parameters: params,
    confidence: 1,
    description: desc || type,
    keyframe_index: 0,
  };
}

/** Build a simple box action sequence: sketch_create → sketch_rectangle → extrude */
function boxActions(
  w = 50, h = 30, d = 25,
): ExtractedAction[] {
  return [
    action(1, "sketch_create", { plane: "XY" }, "Create Sketch"),
    action(2, "sketch_rectangle", { width_mm: w, height_mm: h }, "Draw Rectangle"),
    action(3, "extrude", { distance_mm: d }, "Extrude"),
  ];
}

// ── Script Generation (8) ──────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Script Generation", () => {
  it("1. Simple box generates valid run(context) function", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("def run(context):");
    expect(result.operations).toHaveLength(3);
    expect(result.estimated_complexity).toBe("simple");
  });

  it("2. Script includes import adsk.core, adsk.fusion", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("import adsk.core, adsk.fusion");
  });

  it("3. Script includes try/except error handling", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("try:");
    expect(result.script).toContain("except:");
    expect(result.script).toContain("traceback.format_exc()");
  });

  it("4. Script includes ui.messageBox success notification", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("ui.messageBox(");
    expect(result.script).toContain("created successfully!");
  });

  it("5. Units converted: 25mm appears as 2.5 in generated code", () => {
    const result = engine.generateScript(boxActions(50, 30, 25));
    // 25mm extrude → 2.5cm
    expect(result.script).toContain("2.5");
    // 50mm width → 5cm
    expect(result.script).toContain("50mm");
    expect(result.script).toContain("5cm");
    // Should NOT contain raw 25 in createByReal
    expect(result.script).not.toMatch(/createByReal\(25\)/);
  });

  it("6. Comments include step descriptions", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("# Step 1:");
    expect(result.script).toContain("# Step 2:");
    expect(result.script).toContain("# Step 3:");
  });

  it("7. Component name used when provided", () => {
    const result = engine.generateScript(boxActions(), {
      component_name: "BracketMount",
    });
    expect(result.script).toContain("BracketMount");
    expect(result.script_name).toBe("BracketMount.py");
  });

  it("8. Empty actions produce minimal valid script", () => {
    const result = engine.generateScript([]);
    expect(result.script).toContain("def run(context):");
    expect(result.script).toContain("import adsk.core");
    expect(result.operations).toHaveLength(0);
    expect(result.parameter_count).toBe(0);
  });
});

// ── Operation Coverage (10) ────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Operation Coverage", () => {
  it("9. sketch_rectangle → addTwoPointRectangle with cm points", () => {
    const result = engine.generateScript([
      action(1, "sketch_create", { plane: "XY" }),
      action(2, "sketch_rectangle", { width_mm: 40, height_mm: 20 }),
    ]);
    expect(result.script).toContain("addTwoPointRectangle");
    // 40mm → 4cm, 20mm → 2cm — verify comment and converted values
    expect(result.script).toContain("40mm");
    expect(result.script).toContain("20mm");
    expect(result.script).toContain("4cm");
  });

  it("10. sketch_circle → addByCenterRadius with radius in cm", () => {
    const result = engine.generateScript([
      action(1, "sketch_create", { plane: "XY" }),
      action(2, "sketch_circle", { radius_mm: 15 }),
    ]);
    expect(result.script).toContain("addByCenterRadius");
    // 15mm → 1.5cm
    expect(result.script).toContain("1.5");
  });

  it("11. extrude → addSimple/createInput with NewBodyFeatureOperation", () => {
    const result = engine.generateScript(boxActions());
    expect(result.script).toContain("NewBodyFeatureOperation");
    expect(result.script).toContain("extrudeFeatures.createInput");
    expect(result.script).toContain("setDistanceExtent");
  });

  it("12. extrude_cut → CutFeatureOperation", () => {
    const result = engine.generateScript([
      action(1, "sketch_create", { plane: "XY" }),
      action(2, "sketch_circle", { radius_mm: 5 }),
      action(3, "extrude_cut", { distance_mm: 10 }),
    ]);
    expect(result.script).toContain("CutFeatureOperation");
  });

  it("13. revolve → revolveFeatures with angle conversion", () => {
    const result = engine.generateScript([
      action(1, "sketch_create", { plane: "XY" }),
      action(2, "sketch_line", { x1_mm: 0, y1_mm: 0, x2_mm: 10, y2_mm: 20 }),
      action(3, "revolve", { angle_deg: 360 }),
    ]);
    expect(result.script).toContain("revolveFeatures");
    expect(result.script).toContain("math.radians(360)");
    expect(result.script).toContain("import math");
  });

  it("14. fillet → filletFeatures with edge selection helper", () => {
    const result = engine.generateScript([
      ...boxActions(),
      action(4, "fillet", { radius_mm: 3 }),
    ]);
    expect(result.script).toContain("filletFeatures");
    expect(result.script).toContain("addConstantRadiusEdgeSet");
    expect(result.script).toContain("select_edges_by_direction");
    // 3mm → 0.3cm
    expect(result.script).toContain("0.3");
  });

  it("15. chamfer → chamferFeatures with distance in cm", () => {
    const result = engine.generateScript([
      ...boxActions(),
      action(4, "chamfer", { distance_mm: 2 }),
    ]);
    expect(result.script).toContain("chamferFeatures");
    expect(result.script).toContain("setToEqualDistance");
    // 2mm → 0.2cm
    expect(result.script).toContain("0.2");
  });

  it("16. pattern_linear → rectangularPatternFeatures", () => {
    const result = engine.generateScript([
      ...boxActions(),
      action(4, "pattern_linear", { count_x: 4, spacing_x_mm: 20 }),
    ]);
    expect(result.script).toContain("rectangularPatternFeatures");
    expect(result.script).toContain("SpacingPatternDistanceType");
  });

  it("17. boolean_union → combineFeatures JoinFeatureOperation", () => {
    const result = engine.generateScript([
      action(1, "boolean_union", {}),
    ]);
    expect(result.script).toContain("combineFeatures");
    expect(result.script).toContain("JoinFeatureOperation");
  });

  it("18. shell → shellFeatures with thickness", () => {
    const result = engine.generateScript([
      ...boxActions(),
      action(4, "shell", { thickness_mm: 2 }),
    ]);
    expect(result.script).toContain("shellFeatures");
    expect(result.script).toContain("insideThickness");
    // 2mm → 0.2cm
    expect(result.script).toContain("0.2");
  });
});

// ── Parametric Mode (3) ────────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Parametric Mode", () => {
  it("19. Dimensions extracted as variables at top", () => {
    const result = engine.generateParametricScript(boxActions());
    expect(result.script).toContain("# === Parameters");
    expect(result.parameter_count).toBeGreaterThan(0);
  });

  it("20. Variables use descriptive names", () => {
    const result = engine.generateParametricScript(boxActions());
    // Should have named params like width, height, extrude_depth
    expect(result.script).toMatch(/width\s*=/);
    expect(result.script).toMatch(/height\s*=/);
    expect(result.script).toMatch(/extrude_depth\s*=/);
  });

  it("21. userParameters.add() calls generated for each dimension", () => {
    const result = engine.generateParametricScript(boxActions());
    expect(result.script).toContain("design.userParameters.add(");
    // At least 3 params: width, height, depth
    const upCount = (
      result.script.match(/userParameters\.add\(/g) || []
    ).length;
    expect(upCount).toBeGreaterThanOrEqual(3);
  });
});

// ── Description Mode (3) ──────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Description Mode", () => {
  it('22. "box 50x30x25" generates box script', () => {
    const result = engine.generateFromDescription("box 50x30x25");
    expect(result.operations).toContain("sketch_create");
    expect(result.operations).toContain("sketch_rectangle");
    expect(result.operations).toContain("extrude");
    // 50mm → 5cm, 25mm → 2.5cm
    expect(result.script).toContain("50mm");
    expect(result.script).toContain("2.5");
  });

  it('23. "cylinder diameter 20, height 40" generates cylinder script', () => {
    const result = engine.generateFromDescription(
      "cylinder diameter 20, height 40",
    );
    expect(result.operations).toContain("sketch_circle");
    expect(result.operations).toContain("extrude");
    // radius 10mm → 1.0cm
    expect(result.script).toContain("addByCenterRadius");
  });

  it('24. "box with 3mm fillets" generates box + fillet', () => {
    const result = engine.generateFromDescription(
      "box 40x20x15 with 3mm fillet",
    );
    expect(result.operations).toContain("extrude");
    expect(result.operations).toContain("fillet");
    expect(result.script).toContain("filletFeatures");
  });
});

// ── Validation (3) ─────────────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Validation", () => {
  it("25. Valid script passes validation", () => {
    const result = engine.generateScript(boxActions());
    const validation = engine.validateScript(result.script);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it("26. Script without run() function flagged", () => {
    const bad = `import adsk.core\nprint("hello")`;
    const validation = engine.validateScript(bad);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((i) => i.includes("run(context)"))).toBe(
      true,
    );
  });

  it("27. Script with unconverted mm values flagged", () => {
    const bad = `import adsk.core, adsk.fusion, traceback
def run(context):
    try:
        createByReal(250)
    except:
        pass`;
    const validation = engine.validateScript(bad);
    expect(validation.valid).toBe(false);
    expect(
      validation.issues.some((i) => i.includes("unconverted") || i.includes("too large")),
    ).toBe(true);
  });
});

// ── CadQuery Conversion (2) ───────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — CadQuery Conversion", () => {
  it("28. .box(50,30,25) → sketch+extrude in Fusion 360", () => {
    const cq = `result = cq.Workplane("XY").box(50, 30, 25)`;
    const result = engine.convertCadQueryToFusion360(cq);
    expect(result.operations).toContain("sketch_create");
    expect(result.operations).toContain("sketch_rectangle");
    expect(result.operations).toContain("extrude");
    expect(result.script).toContain("extrudeFeatures");
    // 25mm → 2.5cm
    expect(result.script).toContain("2.5");
  });

  it("29. .fillet(3) → filletFeatures in Fusion 360", () => {
    const cq = `result = cq.Workplane("XY").box(50, 30, 25).fillet(3)`;
    const result = engine.convertCadQueryToFusion360(cq);
    expect(result.operations).toContain("fillet");
    expect(result.script).toContain("filletFeatures");
    // 3mm → 0.3cm
    expect(result.script).toContain("0.3");
  });
});

// ── Catalog & Misc (2) ────────────────────────────────────────────

describe("Fusion360CodeGeneratorEngine — Catalog & Misc", () => {
  it("30. getOperationCatalog returns all operations", () => {
    const catalog = engine.getOperationCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(25);
    const types = catalog.map((o) => o.action_type);
    expect(types).toContain("sketch_create");
    expect(types).toContain("extrude");
    expect(types).toContain("fillet");
    expect(types).toContain("boolean_union");
    expect(types).toContain("pattern_linear");
  });

  it("31. complexity estimation works correctly", () => {
    // Simple: 3 actions, no booleans
    const simple = engine.generateScript(boxActions());
    expect(simple.estimated_complexity).toBe("simple");

    // Complex: many actions with loft
    const complex = engine.generateScript([
      ...boxActions(),
      action(4, "fillet", { radius_mm: 2 }),
      action(5, "chamfer", { distance_mm: 1 }),
      action(6, "shell", { thickness_mm: 1 }),
      action(7, "loft", {}),
      action(8, "pattern_linear", { count_x: 3, spacing_x_mm: 10 }),
      action(9, "boolean_union", {}),
    ]);
    expect(complex.estimated_complexity).toBe("complex");
  });
});
