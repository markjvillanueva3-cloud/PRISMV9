/**
 * VAR-MS1 Phase 1 — Video Action Recognition Tests
 * Tests for VideoActionExtractorEngine, CADOperationTaxonomyEngine,
 * and CadQueryCodeGeneratorEngine.
 */
import { describe, it, expect } from "vitest";
import {
  VideoActionExtractorEngine,
  videoActionExtractorEngine,
  type ExtractedAction,
  type CADActionType,
} from "../engines/VideoActionExtractorEngine.js";
import {
  CADOperationTaxonomyEngine,
  cadOperationTaxonomyEngine,
} from "../engines/CADOperationTaxonomyEngine.js";
import {
  CadQueryCodeGeneratorEngine,
  cadQueryCodeGeneratorEngine,
} from "../engines/CadQueryCodeGeneratorEngine.js";

// ── Helpers ────────────────────────────────────────────────────────

function makeAction(
  step: number,
  type: CADActionType,
  desc: string,
  params: Record<string, number | string> = {},
  ts = step * 2,
  confidence = 0.8,
): ExtractedAction {
  return {
    step_number: step,
    timestamp_s: ts,
    action_type: type,
    operation: type,
    parameters: params,
    confidence,
    description: desc,
    keyframe_index: step,
  };
}

// ── Action Classification (8 tests) ───────────────────────────────

describe("VideoActionExtractorEngine — classifyAction", () => {
  const eng = videoActionExtractorEngine;

  it("1: classifies 'extrude by 25mm'", () => {
    const r = eng.classifyAction("extrude by 25mm");
    expect(r.action_type).toBe("extrude");
    expect(r.parameters.depth_mm).toBe(25);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("2: classifies 'sketch a rectangle 50x30'", () => {
    const r = eng.classifyAction("sketch a rectangle 50x30");
    expect(r.action_type).toBe("sketch_rectangle");
    expect(r.parameters.width_mm).toBe(50);
    expect(r.parameters.height_mm).toBe(30);
  });

  it("3: classifies 'fillet edges with 3mm radius'", () => {
    const r = eng.classifyAction("fillet edges with 3mm radius");
    expect(r.action_type).toBe("fillet");
    expect(r.parameters.radius_mm).toBe(3);
  });

  it("4: classifies 'revolve 360 degrees'", () => {
    const r = eng.classifyAction("revolve 360 degrees");
    expect(r.action_type).toBe("revolve");
    expect(r.parameters.angle_deg).toBe(360);
  });

  it("5: classifies 'cut a hole diameter 10mm'", () => {
    const r = eng.classifyAction("cut a hole diameter 10mm");
    expect(r.action_type).toBe("hole");
    expect(r.parameters.diameter_mm).toBe(10);
  });

  it("6: classifies 'chamfer 2mm'", () => {
    const r = eng.classifyAction("chamfer 2mm");
    expect(r.action_type).toBe("chamfer");
    expect(r.parameters.size_mm).toBe(2);
  });

  it("7: unknown action → low confidence", () => {
    const r = eng.classifyAction("unknown action xyz");
    expect(r.action_type).toBe("unknown");
    expect(r.confidence).toBeLessThan(0.3);
  });

  it("8: classifies 'create a sketch on XY plane'", () => {
    const r = eng.classifyAction("create a sketch on XY plane");
    expect(r.action_type).toBe("sketch_create");
    expect(r.confidence).toBeGreaterThan(0.5);
  });
});

// ── Sequence Validation (8 tests) ─────────────────────────────────

describe("VideoActionExtractorEngine — validateSequence", () => {
  const eng = videoActionExtractorEngine;

  it("9: valid sketch → extrude → fillet passes", () => {
    const actions = [
      makeAction(1, "sketch_create", "Create sketch"),
      makeAction(2, "sketch_rectangle", "Draw rectangle"),
      makeAction(3, "extrude", "Extrude", { depth_mm: 10 }),
      makeAction(4, "fillet", "Fillet edges", { radius_mm: 2 }),
    ];
    const r = eng.validateSequence(actions);
    expect(r.valid).toBe(true);
    expect(r.logical_errors).toHaveLength(0);
  });

  it("10: fillet before extrude flags error", () => {
    const actions = [
      makeAction(1, "sketch_create", "Create sketch"),
      makeAction(2, "fillet", "Fillet edges"),
    ];
    const r = eng.validateSequence(actions);
    expect(r.valid).toBe(false);
    expect(r.logical_errors.length).toBeGreaterThan(0);
    expect(r.logical_errors[0]).toContain("fillet");
  });

  it("11: extrude without sketch flags error", () => {
    const actions = [
      makeAction(1, "extrude", "Extrude", { depth_mm: 10 }),
    ];
    const r = eng.validateSequence(actions);
    expect(r.valid).toBe(false);
    expect(r.logical_errors.some(e => e.includes("sketch"))).toBe(true);
  });

  it("12: consecutive view_change removed", () => {
    const actions = [
      makeAction(1, "view_change", "Zoom in"),
      makeAction(2, "view_change", "Rotate view"),
      makeAction(3, "view_change", "Pan"),
      makeAction(4, "sketch_create", "Create sketch"),
    ];
    const r = eng.validateSequence(actions);
    // First view_change kept, two consecutive removed
    expect(r.removed_count).toBe(2);
    expect(r.cleaned_actions.length).toBe(2);
  });

  it("13: dependency graph has correct edges", () => {
    const actions = [
      makeAction(1, "sketch_create", "Create sketch"),
      makeAction(2, "extrude", "Extrude", { depth_mm: 10 }),
      makeAction(3, "fillet", "Fillet", { radius_mm: 2 }),
    ];
    const r = eng.validateSequence(actions);
    expect(r.dependency_graph.length).toBeGreaterThan(0);
    // sketch → extrude edge
    const sketchToExtrude = r.dependency_graph.find(
      e => e.to === 2,
    );
    expect(sketchToExtrude).toBeDefined();
    expect(sketchToExtrude!.from).toBe(1);
  });

  it("14: empty sequence → valid", () => {
    const r = eng.validateSequence([]);
    expect(r.valid).toBe(true);
    expect(r.cleaned_actions).toHaveLength(0);
  });

  it("15: single sketch action → valid", () => {
    const actions = [
      makeAction(1, "sketch_create", "Create sketch"),
    ];
    const r = eng.validateSequence(actions);
    expect(r.valid).toBe(true);
    expect(r.cleaned_actions).toHaveLength(1);
  });

  it("16: mixed valid/invalid → warnings but cleaned", () => {
    const actions = [
      makeAction(1, "fillet", "Fillet"), // no solid yet
      makeAction(2, "sketch_create", "Sketch"),
      makeAction(3, "extrude", "Extrude"),
      makeAction(4, "chamfer", "Chamfer"),
    ];
    const r = eng.validateSequence(actions);
    expect(r.valid).toBe(false);
    expect(r.logical_errors.length).toBeGreaterThan(0);
    expect(r.cleaned_actions.length).toBe(4);
  });
});

// ── Parameter Inference (4 tests) ─────────────────────────────────

describe("VideoActionExtractorEngine — inferMissingParameters", () => {
  const eng = videoActionExtractorEngine;

  it("17: extrude without depth → default 10mm, low confidence", () => {
    const actions = [makeAction(1, "extrude", "Extrude", {})];
    const result = eng.inferMissingParameters(actions);
    expect(result[0].parameters.depth_mm).toBe(10);
    expect(result[0].confidence).toBeLessThanOrEqual(0.3);
  });

  it("18: fillet without radius → default 2mm, low confidence", () => {
    const actions = [makeAction(1, "fillet", "Fillet", {})];
    const result = eng.inferMissingParameters(actions);
    expect(result[0].parameters.radius_mm).toBe(2);
    expect(result[0].confidence).toBeLessThanOrEqual(0.3);
  });

  it("19: action with all params → unchanged", () => {
    const actions = [
      makeAction(1, "extrude", "Extrude", { depth_mm: 25 }, 2, 0.9),
    ];
    const result = eng.inferMissingParameters(actions);
    expect(result[0].parameters.depth_mm).toBe(25);
    expect(result[0].confidence).toBe(0.9);
  });

  it("20: rectangle without dimensions → defaults applied", () => {
    const actions = [
      makeAction(1, "sketch_rectangle", "Draw rect", {}),
    ];
    const result = eng.inferMissingParameters(actions);
    expect(result[0].parameters.width_mm).toBe(50);
    expect(result[0].parameters.height_mm).toBe(30);
    expect(result[0].confidence).toBeLessThanOrEqual(0.3);
  });
});

// ── Difficulty Rating (4 tests) ───────────────────────────────────

describe("VideoActionExtractorEngine — estimateDifficulty", () => {
  const eng = videoActionExtractorEngine;

  it("21: single extrude → difficulty 1", () => {
    const actions = [makeAction(1, "extrude", "Extrude")];
    expect(eng.estimateDifficulty(actions)).toBe(1);
  });

  it("22: sketch + extrude + fillet + chamfer → difficulty 2", () => {
    const actions = [
      makeAction(1, "sketch_create", "Sketch"),
      makeAction(2, "sketch_rectangle", "Rect"),
      makeAction(3, "extrude", "Extrude"),
      makeAction(4, "fillet", "Fillet"),
      makeAction(5, "chamfer", "Chamfer"),
    ];
    expect(eng.estimateDifficulty(actions)).toBe(2);
  });

  it("23: with boolean operations → difficulty 3", () => {
    const actions = [
      makeAction(1, "extrude", "Extrude"),
      makeAction(2, "boolean_subtract", "Cut"),
    ];
    expect(eng.estimateDifficulty(actions)).toBe(3);
  });

  it("24: with sweep/loft → difficulty 4+", () => {
    const actions = [
      makeAction(1, "sketch_create", "Sketch"),
      makeAction(2, "sweep", "Sweep"),
      makeAction(3, "boolean_union", "Union"),
    ];
    const d = eng.estimateDifficulty(actions);
    expect(d).toBeGreaterThanOrEqual(4);
  });
});

// ── Taxonomy Engine (6 tests) ─────────────────────────────────────

describe("CADOperationTaxonomyEngine", () => {
  const eng = cadOperationTaxonomyEngine;

  it("25: getOperation('extrude') returns valid operation", () => {
    const op = eng.getOperation("extrude");
    expect(op).not.toBeNull();
    expect(op!.name).toBe("Extrude");
    expect(op!.category).toBe("solid_3d");
    expect(op!.required_params.length).toBeGreaterThan(0);
  });

  it("26: getOperation for nonexistent returns null", () => {
    const op = eng.getOperation("nonexistent" as CADActionType);
    expect(op).toBeNull();
  });

  it("27: all 36+ operations cataloged", () => {
    const all = eng.getAllOperations();
    expect(all.length).toBeGreaterThanOrEqual(36);
    // Check key categories have entries
    const categories = new Set(all.map(o => o.category));
    expect(categories.has("sketch_2d")).toBe(true);
    expect(categories.has("solid_3d")).toBe(true);
    expect(categories.has("modify")).toBe(true);
    expect(categories.has("assembly")).toBe(true);
    expect(categories.has("cam")).toBe(true);
  });

  it("28: CadQuery template for extrude contains .extrude", () => {
    const op = eng.getOperation("extrude");
    expect(op!.cadquery_template).toContain(".extrude");
  });

  it("29: prerequisites: fillet requires extrude", () => {
    const prev: CADActionType[] = ["sketch_create"];
    const check = eng.checkPrerequisites("fillet", prev);
    expect(check.satisfied).toBe(false);
    expect(check.missing).toContain("extrude");
  });

  it("30: category filter returns correct subset", () => {
    const sketch = eng.getOperationsByCategory("sketch_2d");
    expect(sketch.length).toBeGreaterThanOrEqual(8);
    for (const op of sketch) {
      expect(op.category).toBe("sketch_2d");
    }
  });
});

// ── Code Generation (7 tests) ─────────────────────────────────────

describe("CadQueryCodeGeneratorEngine", () => {
  const eng = cadQueryCodeGeneratorEngine;

  it("31: simple box: sketch_rect + extrude → valid Python", () => {
    const actions = [
      makeAction(1, "sketch_create", "Create sketch", { plane: "XY" }, 0),
      makeAction(2, "sketch_rectangle", "Draw rect", { width_mm: 40, height_mm: 20 }, 5),
      makeAction(3, "extrude", "Extrude", { depth_mm: 15 }, 10),
    ];
    const r = eng.generateScript(actions);
    expect(r.script).toContain("import cadquery as cq");
    expect(r.script).toContain(".rect(40, 20)");
    expect(r.script).toContain(".extrude(15)");
  });

  it("32: box with fillet includes .fillet() call", () => {
    const actions = [
      makeAction(1, "sketch_create", "Sketch", {}, 0),
      makeAction(2, "sketch_rectangle", "Rect", { width_mm: 30, height_mm: 30 }, 3),
      makeAction(3, "extrude", "Extrude", { depth_mm: 20 }, 6),
      makeAction(4, "fillet", "Fillet", { radius_mm: 3 }, 9),
    ];
    const r = eng.generateScript(actions);
    expect(r.script).toContain(".fillet(3)");
  });

  it("33: script has 'import cadquery as cq' header", () => {
    const actions = [makeAction(1, "extrude", "Extrude", { depth_mm: 10 })];
    const r = eng.generateScript(actions);
    expect(r.script.startsWith("import cadquery as cq")).toBe(true);
  });

  it("34: step-by-step: each step builds on previous", () => {
    const actions = [
      makeAction(1, "sketch_create", "Sketch", {}, 0),
      makeAction(2, "extrude", "Extrude", { depth_mm: 10 }, 5),
    ];
    const steps = eng.generateStepByStep(actions);
    expect(steps).toHaveLength(2);
    expect(steps[0].step).toBe(1);
    expect(steps[1].step).toBe(2);
    // Cumulative script at step 2 includes step 1's code
    expect(steps[1].cumulative).toContain("Sketch");
    expect(steps[1].cumulative).toContain(".extrude(10)");
  });

  it("35: parametric mode extracts dimensions as variables", () => {
    const actions = [
      makeAction(1, "extrude", "Extrude", { depth_mm: 25 }, 15),
    ];
    const base = eng.generateScript(actions);
    const parametric = eng.makeParametric(base.script, actions);
    expect(parametric).toContain("extrude_depth_mm = 25");
    expect(parametric).toContain("# from video @");
  });

  it("36: timestamp comments included", () => {
    const actions = [
      makeAction(1, "fillet", "Fillet edges", { radius_mm: 5 }, 75),
    ];
    const r = eng.generateScript(actions);
    // 75 seconds = 1:15
    expect(r.script).toContain("@1:15");
  });

  it("37: multiple operations chained correctly", () => {
    const actions = [
      makeAction(1, "sketch_create", "Sketch", {}, 0),
      makeAction(2, "sketch_rectangle", "Rect", { width_mm: 50, height_mm: 30 }, 3),
      makeAction(3, "extrude", "Extrude", { depth_mm: 20 }, 6),
      makeAction(4, "fillet", "Fillet", { radius_mm: 2 }, 9),
      makeAction(5, "chamfer", "Chamfer", { size_mm: 1 }, 12),
    ];
    const r = eng.generateScript(actions);
    // All operations present in order
    const lines = r.script.split("\n");
    const rectIdx = lines.findIndex(l => l.includes(".rect("));
    const extIdx = lines.findIndex(l => l.includes(".extrude("));
    const filIdx = lines.findIndex(l => l.includes(".fillet("));
    const chamIdx = lines.findIndex(l => l.includes(".chamfer("));
    expect(rectIdx).toBeLessThan(extIdx);
    expect(extIdx).toBeLessThan(filIdx);
    expect(filIdx).toBeLessThan(chamIdx);
  });
});

// ── Syntax Validation (3 bonus tests) ─────────────────────────────

describe("CadQueryCodeGeneratorEngine — validateSyntax", () => {
  const eng = cadQueryCodeGeneratorEngine;

  it("valid script passes", () => {
    const script = [
      "import cadquery as cq",
      "result = cq.Workplane('XY').rect(50, 30)",
      "result = result.extrude(10)",
      "result = result.fillet(2)",
    ].join("\n");
    const r = eng.validateSyntax(script);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("unmatched parenthesis detected", () => {
    const script = [
      "import cadquery as cq",
      "result = result.extrude(10",
    ].join("\n");
    const r = eng.validateSyntax(script);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes("parenthes"))).toBe(true);
  });

  it("missing import detected", () => {
    const script = "result = cq.Workplane('XY').extrude(10)";
    const r = eng.validateSyntax(script);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes("import"))).toBe(true);
  });
});

// ── Keyframe Extraction (2 bonus tests) ───────────────────────────

describe("VideoActionExtractorEngine — extractActionsFromKeyframes", () => {
  const eng = videoActionExtractorEngine;

  it("extracts actions from keyframe paths", () => {
    const paths = Array.from({ length: 8 }, (_, i) =>
      `/tmp/keyframes/frame_${String(i + 1).padStart(4, "0")}.png`,
    );
    const seq = eng.extractActionsFromKeyframes(paths, {
      min_confidence: 0.1,
    });
    expect(seq.actions.length).toBeGreaterThan(0);
    expect(seq.actions[0].step_number).toBe(1);
    expect(seq.summary).toContain("actions");
  });

  it("respects min_confidence filter", () => {
    const paths = Array.from({ length: 4 }, (_, i) =>
      `/tmp/keyframes/frame_${String(i + 1).padStart(4, "0")}.png`,
    );
    const highConf = eng.extractActionsFromKeyframes(paths, {
      min_confidence: 0.9,
    });
    const lowConf = eng.extractActionsFromKeyframes(paths, {
      min_confidence: 0.1,
    });
    expect(lowConf.actions.length).toBeGreaterThanOrEqual(
      highConf.actions.length,
    );
  });
});

// ── Cross-Engine Integration (2 bonus tests) ──────────────────────

describe("Cross-engine integration", () => {
  it("classify → taxonomy → codegen pipeline", () => {
    const ext = videoActionExtractorEngine;
    const tax = cadOperationTaxonomyEngine;
    const gen = cadQueryCodeGeneratorEngine;

    // Classify text descriptions
    const descriptions = [
      "create a sketch on XY plane",
      "sketch a rectangle 60x40",
      "extrude by 30mm",
      "fillet edges with 5mm radius",
    ];
    const actions: ExtractedAction[] = descriptions.map((desc, i) => {
      const classified = ext.classifyAction(desc);
      return makeAction(
        i + 1,
        classified.action_type,
        desc,
        classified.parameters,
        i * 5,
        classified.confidence,
      );
    });

    // Validate
    const validated = ext.validateSequence(actions);
    expect(validated.valid).toBe(true);

    // Generate code
    const result = gen.generateScript(validated.cleaned_actions);
    expect(result.script).toContain("import cadquery as cq");
    expect(result.script).toContain(".rect(60, 40)");
    expect(result.script).toContain(".extrude(30)");
    expect(result.script).toContain(".fillet(5)");
  });

  it("taxonomy prerequisites match validation logic", () => {
    const tax = cadOperationTaxonomyEngine;

    // Fillet requires extrude
    const filletCheck = tax.checkPrerequisites("fillet", []);
    expect(filletCheck.satisfied).toBe(false);

    // With extrude in history, fillet is satisfied
    const filletOk = tax.checkPrerequisites("fillet", ["extrude"]);
    expect(filletOk.satisfied).toBe(true);

    // Extrude requires sketch_create
    const extCheck = tax.checkPrerequisites("extrude", []);
    expect(extCheck.satisfied).toBe(false);
    expect(extCheck.missing).toContain("sketch_create");
  });
});
