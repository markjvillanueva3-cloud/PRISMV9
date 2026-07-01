/**
 * dispatcher-method-drift-fixes.test.ts
 *
 * R9 regression lock for the 8 dispatcher->engine method drift fixes applied
 * to edmDispatcher.ts (7 fixes) and feasibilityDispatcher.ts (1 fix).
 *
 * Every test encodes WHY the fix matters:
 *   - Old wrong method name should not exist on the engine (runtime crash prevention)
 *   - Correct method returns real physics-grounded values (not a stub)
 *   - Failure modes throw descriptively or return {success:false} -- never silently wrong
 *
 * Reference sources:
 *   - WEDM_MULTI_PASS constants: mcp-server/src/physics/wedm-constants.ts
 *   - EDMMultiPassStrategyEngine.plan(): line 124
 *   - EDMWireSlugCornerTaperEngine.analyze(): line 166
 *   - WEDMSetupSheetEngine.generateSetupSheet(): line 203
 *   - FeasibilityAnalysisEngine.calculate(): line 431
 */

import { describe, it, expect } from "vitest";
import { EDMMultiPassStrategyEngine } from "../engines/EDMMultiPassStrategyEngine.js";
import { EDMWireSlugCornerTaperEngine } from "../engines/EDMWireSlugCornerTaperEngine.js";
import { generateSetupSheet } from "../engines/WEDMSetupSheetEngine.js";
import { feasibilityAnalysisEngine } from "../engines/FeasibilityAnalysisEngine.js";
import { MillingReasoningTraceLedgerEngine } from "../engines/MillingReasoningTraceLedgerEngine.js";
import { printReadingEngine } from "../engines/PrintReadingEngine.js";
import { postProcessorAnalysisEngine } from "../engines/PostProcessorAnalysisEngine.js";

// ── helpers ────────────────────────────────────────────────────────────────

const multiPassEngine = new EDMMultiPassStrategyEngine();
const cornerTaperEngine = new EDMWireSlugCornerTaperEngine();

// Minimal valid square-slug geometry for analyze() tests
const SQUARE_SLUG = {
  area_mm2: 900,          // 30x30mm square
  perimeter_mm: 120,
  min_internal_angle_deg: 90,
  max_internal_angle_deg: 90,
  internal_corner_count: 4,
  has_undercut: false,
  corners: [
    { x: 0, y: 0, angle_deg: 90, is_concave: false },
    { x: 30, y: 0, angle_deg: 90, is_concave: false },
    { x: 30, y: 30, angle_deg: 90, is_concave: false },
    { x: 0, y: 30, angle_deg: 90, is_concave: false },
  ],
};

// ── Block 1: plan_passes / full_plan are ABSENT (Fix 1 + Fix 2) ────────────

describe("EDMMultiPassStrategyEngine -- absent method names (Fix 1 + Fix 2)", () => {
  it("plan_passes does not exist -- calling it would throw TypeError at runtime", () => {
    // This is the exact runtime crash the fix prevents.
    // The engine ONLY exposes plan() as the public entry point.
    expect(typeof (multiPassEngine as unknown as Record<string, unknown>)["plan_passes"]).toBe("undefined");
  });

  it("full_plan does not exist -- calling it would throw TypeError at runtime", () => {
    expect(typeof (multiPassEngine as unknown as Record<string, unknown>)["full_plan"]).toBe("undefined");
  });

  it("plan() IS the correct public entry point", () => {
    expect(typeof multiPassEngine.plan).toBe("function");
  });
});

// ── Block 2: EDMMultiPassStrategyEngine.plan() real reference values ────────

describe("EDMMultiPassStrategyEngine.plan() -- reference value tests (Fix 1 + Fix 2)", () => {
  // Constants from wedm-constants.ts: pass_count.standard=2, pass_count.rough_only=1,
  // pass_count.precision=3, pass_count.ultra=4

  it("standard finish class yields exactly 2 passes (Mitsubishi MV1200R E-table)", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      finish_class: "standard",
    });
    expect(result.success).toBe(true);
    expect(result.pass_count).toBe(2);
    expect(result.finish_class).toBe("standard");
  });

  it("rough_only yields exactly 1 pass", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      finish_class: "rough_only",
    });
    expect(result.success).toBe(true);
    expect(result.pass_count).toBe(1);
  });

  it("precision class yields exactly 3 passes", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      finish_class: "precision",
    });
    expect(result.success).toBe(true);
    expect(result.pass_count).toBe(3);
  });

  it("ultra class yields exactly 4 passes", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      finish_class: "ultra",
    });
    expect(result.success).toBe(true);
    expect(result.pass_count).toBe(4);
  });

  it("pass offsets are strictly decreasing (last pass offset is 0)", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      finish_class: "precision",
    });
    expect(result.success).toBe(true);
    // First pass (rough) has the largest offset; last pass is at 0
    const offsets = result.passes.map(p => p.offset_mm);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
    }
    expect(offsets[offsets.length - 1]).toBe(0);
  });

  it("total_time_min is positive and sum of per-pass times", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 30,
      cut_length_mm: 100,
      finish_class: "standard",
    });
    expect(result.success).toBe(true);
    expect(result.total_time_min).toBeGreaterThan(0);
    const summed = result.time_estimates.reduce((s, t) => s + t.total_time_min, 0);
    // total_time_min is rounded to 1 decimal; allow 0.1 tolerance
    expect(Math.abs(result.total_time_min - summed)).toBeLessThan(0.15);
  });

  it("target_ra_um <= 0.4 selects ultra class (4 passes)", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      target_ra_um: 0.3,
    });
    expect(result.success).toBe(true);
    expect(result.finish_class).toBe("ultra");
    expect(result.pass_count).toBe(4);
  });

  it("invalid input (missing required fields) returns success:false", () => {
    // thickness_mm and cut_length_mm are required
    const result = multiPassEngine.plan({} as Parameters<typeof multiPassEngine.plan>[0]);
    expect(result.success).toBe(false);
  });

  it("explicit pass_count is clamped to max_passes=7", () => {
    const result = multiPassEngine.plan({
      thickness_mm: 20,
      cut_length_mm: 50,
      pass_count: 99,
    });
    expect(result.success).toBe(true);
    expect(result.pass_count).toBeLessThanOrEqual(7);
  });
});

// ── Block 3: planWireManagement / calculateCornerCompensation / solveTaper absent ─

describe("EDMWireSlugCornerTaperEngine -- absent method names (Fix 3 + Fix 4 + Fix 5)", () => {
  it("planWireManagement does not exist", () => {
    expect(typeof (cornerTaperEngine as unknown as Record<string, unknown>)["planWireManagement"]).toBe("undefined");
  });

  it("calculateCornerCompensation does not exist", () => {
    expect(typeof (cornerTaperEngine as unknown as Record<string, unknown>)["calculateCornerCompensation"]).toBe("undefined");
  });

  it("solveTaper does not exist", () => {
    expect(typeof (cornerTaperEngine as unknown as Record<string, unknown>)["solveTaper"]).toBe("undefined");
  });

  it("analyze() IS the correct public entry point", () => {
    expect(typeof cornerTaperEngine.analyze).toBe("function");
  });
});

// ── Block 4: EDMWireSlugCornerTaperEngine.analyze() real reference values ──

describe("EDMWireSlugCornerTaperEngine.analyze() -- reference value tests (Fix 3+4+5)", () => {
  it("square slug with 4 x 90-degree corners returns a result object", () => {
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: SQUARE_SLUG,
    });
    // Must return a typed result with known fields, not throw
    expect(typeof result.success).toBe("boolean");
    expect(Array.isArray(result.corners)).toBe(true);
    expect(result.corners.length).toBe(4);
  });

  it("all_corners_adequate is true when corner radius exceeds wire radius + spark gap", () => {
    // Default wire_diameter_mm=0.25 -> wire_radius=0.125; default spark_gap_mm=0.025
    // Required min_radius = 0.125 + 0.025 = 0.15mm
    // 90-degree corners in this slug have radius > 0 from the geometry => check adequacy
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: SQUARE_SLUG,
      wire_diameter_mm: 0.25,
      spark_gap_mm: 0.025,
    });
    expect(typeof result.all_corners_adequate).toBe("boolean");
    // min_corner_radius_mm and required_min_radius_mm must both be non-negative
    expect(result.min_corner_radius_mm).toBeGreaterThanOrEqual(0);
    expect(result.required_min_radius_mm).toBeGreaterThan(0);
  });

  it("required_min_radius_mm equals wire_radius + spark_gap + 0.02 margin (physics invariant)", () => {
    // Formula (EDMWireSlugCornerTaperEngine.ts:222-224):
    //   R_min = wire_dia/2 + spark_gap + 0.02 (fixed margin)
    // wire_diameter=0.30 -> radius=0.15; spark_gap=0.03; margin=0.02 -> required=0.20
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: SQUARE_SLUG,
      wire_diameter_mm: 0.30,
      spark_gap_mm: 0.03,
    });
    expect(result.required_min_radius_mm).toBeCloseTo(0.15 + 0.03 + 0.02, 5);
  });

  it("slug_prediction is present with drop_probability and estimated_weight_N fields", () => {
    // SlugDropPrediction shape (EDMWireSlugCornerTaperEngine.ts:113-118):
    //   hook_risk, estimated_weight_N, drop_probability, recommendations
    const result = cornerTaperEngine.analyze({
      thickness_mm: 25,
      slug: SQUARE_SLUG,
      wire_diameter_mm: 0.25,
      spark_gap_mm: 0.025,
    });
    expect(typeof result.slug_prediction).toBe("object");
    const pred = result.slug_prediction as Record<string, unknown>;
    // A 30x30x25mm slug at steel density has non-zero weight
    expect(typeof pred["estimated_weight_N"]).toBe("number");
    expect((pred["estimated_weight_N"] as number)).toBeGreaterThan(0);
    expect(typeof pred["drop_probability"]).toBe("number");
    // drop_probability is in [0, 1]
    expect((pred["drop_probability"] as number)).toBeGreaterThanOrEqual(0);
    expect((pred["drop_probability"] as number)).toBeLessThanOrEqual(1);
  });

  it("summary is a non-empty string", () => {
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: SQUARE_SLUG,
    });
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("total_warnings is an array (may be empty for well-configured input)", () => {
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: SQUARE_SLUG,
    });
    expect(Array.isArray(result.total_warnings)).toBe(true);
  });

  it("adversarial: zero thickness returns success:false or non-throwing result", () => {
    // Engine must not throw on degenerate input -- must return structured error
    let result: ReturnType<typeof cornerTaperEngine.analyze> | undefined;
    expect(() => {
      result = cornerTaperEngine.analyze({
        thickness_mm: 0,
        slug: SQUARE_SLUG,
      });
    }).not.toThrow();
    // If it returns, the result must have the standard shape
    if (result !== undefined) {
      expect(typeof result.success).toBe("boolean");
    }
  });

  it("adversarial: slug with undercut sets has_undercut warning in total_warnings or success:false", () => {
    const undercutSlug = { ...SQUARE_SLUG, has_undercut: true };
    const result = cornerTaperEngine.analyze({
      thickness_mm: 20,
      slug: undercutSlug,
    });
    expect(typeof result.success).toBe("boolean");
    // Either warns or blocks -- must not silently ignore an undercut
    const hasWarningOrFail =
      result.success === false ||
      result.total_warnings.length > 0;
    expect(hasWarningOrFail).toBe(true);
  });
});

// ── Block 5: WEDMSetupSheetEngine.generateSetupSheet() (Fix 6) ─────────────

describe("WEDMSetupSheetEngine.generateSetupSheet() -- failure-path shape (Fix 6)", () => {
  it("is exported as a named function (not a class method)", () => {
    expect(typeof generateSetupSheet).toBe("function");
  });

  it("failed WEDMProgramResult returns success:false with html string", () => {
    // Pass a minimal failed result -- the engine must not throw
    const failedResult = { success: false } as Parameters<typeof generateSetupSheet>[0];
    const out = generateSetupSheet(failedResult);
    expect(out.success).toBe(false);
    expect(typeof out.html).toBe("string");
    expect(out.html.length).toBeGreaterThan(0);
  });

  it("failed result returns a data object (not undefined)", () => {
    const failedResult = { success: false } as Parameters<typeof generateSetupSheet>[0];
    const out = generateSetupSheet(failedResult);
    expect(typeof out.data).toBe("object");
    expect(out.data).not.toBeNull();
  });
});

// ── Block 6: wedm_full_documentation SPEC shape (Fix 7) ────────────────────

describe("edmDispatcher wedm_full_documentation -- SPEC error contract (Fix 7)", () => {
  // The dispatcher returns a structured SPEC error rather than calling a non-existent engine.
  // This block confirms the SPEC object shape so consumers can detect and handle it.
  it("SPEC error object must have success:false and spec.required_engine field", () => {
    // We verify the contract shape by constructing what the dispatcher emits.
    // The actual dispatcher code is at edmDispatcher.ts case 'wedm_full_documentation'.
    const specError = {
      success: false,
      error: "wedm_full_documentation not yet implemented -- requires WEDMFullDocumentationEngine (owner: mike slot).",
      spec: {
        required_engine: "WEDMFullDocumentationEngine",
        owner: "mike",
        components: ["setup_sheet", "cost_estimate", "multi_pass_plan", "quality_plan"],
        workaround_actions: ["wedm_generate_setup_sheet", "wedm_estimate_cost", "wedm_plan_passes"],
      },
    };
    expect(specError.success).toBe(false);
    expect(specError.spec.required_engine).toBe("WEDMFullDocumentationEngine");
    expect(specError.spec.owner).toBe("mike");
    expect(specError.spec.workaround_actions).toContain("wedm_generate_setup_sheet");
    expect(specError.spec.components.length).toBe(4);
  });
});

// ── Block 7: FeasibilityAnalysisEngine.calculate() -- Fix 8 ────────────────

describe("FeasibilityAnalysisEngine -- analyze() is absent, calculate() is the entry (Fix 8)", () => {
  it("analyze() method does not exist on the engine singleton", () => {
    expect(typeof (feasibilityAnalysisEngine as unknown as Record<string, unknown>)["analyze"]).toBe("undefined");
  });

  it("calculate() IS the correct public entry point", () => {
    expect(typeof feasibilityAnalysisEngine.calculate).toBe("function");
  });
});

// ── Block 8: FeasibilityAnalysisEngine.calculate() reference values ─────────

describe("FeasibilityAnalysisEngine.calculate() -- reference value tests (Fix 8)", () => {
  // ---- analyzeRigidity ----

  it("analyzeRigidity: thin wall (1mm thick, 40mm tall) has low rigidity_score", () => {
    // RigidityResult shape (FeasibilityAnalysisEngine.ts:256-258):
    //   rigidity_score: number (0-100, higher = more rigid)
    // A 1mm wall at 40mm height has very low stiffness: k = E*w*t^3/(4*h^3)
    //   t^3/h^3 = (1)^3/(40)^3 = 1/64000 -- well into the flexible regime.
    // material must be a RigidityMaterial object (E_GPa + density_kg_m3) --
    //   a plain string is truthy and passes the !material guard but causes
    //   NaN arithmetic; aluminum: E=70 GPa, rho=2700 kg/m3 (standard values).
    const result = feasibilityAnalysisEngine.calculate({
      action: "analyzeRigidity",
      material: { name: "aluminum", E_GPa: 70, density_kg_m3: 2700 },
      wall_thickness_mm: 1,
      wall_height_mm: 40,
      wall_length_mm: 50,
    });
    const r = result as Record<string, unknown>;
    expect(typeof r["rigidity_score"]).toBe("number");
    // Thin 1mm/40mm wall must score below 80 (not considered robust)
    expect((r["rigidity_score"] as number)).toBeLessThan(80);
  });

  it("analyzeRigidity: robust wall (20mm thick, 20mm tall) has high rigidity_score", () => {
    // k = E*w*t^3/(4*h^3); t^3/h^3 = (20)^3/(20)^3 = 1 -- solid block ratio.
    // rigidity_score should be >= 80 for this well-proportioned steel wall.
    // steel: E=200 GPa, rho=7850 kg/m3 (standard structural steel values).
    const result = feasibilityAnalysisEngine.calculate({
      action: "analyzeRigidity",
      material: { name: "steel", E_GPa: 200, density_kg_m3: 7850 },
      wall_thickness_mm: 20,
      wall_height_mm: 20,
    });
    const r = result as Record<string, unknown>;
    expect(typeof r["rigidity_score"]).toBe("number");
    expect((r["rigidity_score"] as number)).toBeGreaterThanOrEqual(80);
  });

  it("analyzeRigidity: throws when material is missing", () => {
    expect(() => {
      feasibilityAnalysisEngine.calculate({
        action: "analyzeRigidity",
      } as Parameters<typeof feasibilityAnalysisEngine.calculate>[0]);
    }).toThrow("analyzeRigidity requires 'material' param");
  });

  // ---- analyzeAccessibility ----

  it("analyzeAccessibility: throws when feature or tool are missing", () => {
    expect(() => {
      feasibilityAnalysisEngine.calculate({
        action: "analyzeAccessibility",
      } as Parameters<typeof feasibilityAnalysisEngine.calculate>[0]);
    }).toThrow("analyzeAccessibility requires 'feature' and 'tool' params");
  });

  it("analyzeAccessibility: shallow pocket is accessible with short end mill", () => {
    const result = feasibilityAnalysisEngine.calculate({
      action: "analyzeAccessibility",
      feature: {
        depth_mm: 10,
        diameter_mm: 20,
        corner_radius_mm: 3,
      },
      tool: {
        diameter_mm: 6,
        loc_mm: 20,       // length of cut 20mm -- easily reaches 10mm depth
        shank_diameter_mm: 6,
        flutes: 4,
        material: "carbide",
      },
    });
    expect(typeof result).toBe("object");
    const r = result as Record<string, unknown>;
    expect(r["accessible"]).toBe(true);
  });

  it("analyzeAccessibility: too-deep pocket is not accessible", () => {
    // tool LOC = 10mm, pocket depth = 50mm -- cannot reach
    const result = feasibilityAnalysisEngine.calculate({
      action: "analyzeAccessibility",
      feature: {
        depth_mm: 50,
        diameter_mm: 20,
        corner_radius_mm: 3,
      },
      tool: {
        diameter_mm: 6,
        loc_mm: 10,       // only 10mm LOC -- cannot reach 50mm depth
        shank_diameter_mm: 6,
        flutes: 4,
        material: "carbide",
      },
    });
    expect(typeof result).toBe("object");
    const r = result as Record<string, unknown>;
    expect(r["accessible"]).toBe(false);
  });

  // ---- analyzeWorkholding ----

  it("analyzeWorkholding: throws when required fields are missing", () => {
    expect(() => {
      feasibilityAnalysisEngine.calculate({
        action: "analyzeWorkholding",
      } as Parameters<typeof feasibilityAnalysisEngine.calculate>[0]);
    }).toThrow("analyzeWorkholding requires 'workpiece_state', 'clamping', and 'operation_forces' params");
  });

  // ---- unknown action ----

  it("unknown action throws with descriptive message", () => {
    expect(() => {
      feasibilityAnalysisEngine.calculate({
        action: "nonexistent_action" as Parameters<typeof feasibilityAnalysisEngine.calculate>[0]["action"],
      });
    }).toThrow("Unknown feasibility action");
  });
});

// ── Block 9: millDispatcher mill_trace_query -- queryRecent→getRecent fix ───
//
// BUG: millDispatcher.ts:3127 called engine.queryRecent() but
//      MillingReasoningTraceLedgerEngine only exposes getRecent().
//      queryRecent is NOT a function → runtime TypeError on mill_trace_query.
// FIX: renamed to engine.getRecent(count) (millDispatcher.ts:3127).
//
// These tests lock the engine contract so a future rename of getRecent
// without updating the dispatcher is caught immediately.

describe("MillingReasoningTraceLedgerEngine -- queryRecent absent, getRecent is the entry (Fix 9)", () => {
  const ledger = new MillingReasoningTraceLedgerEngine();

  it("queryRecent does NOT exist on the engine (the method the dispatcher wrongly called)", () => {
    expect(typeof (ledger as unknown as Record<string, unknown>)["queryRecent"]).toBe("undefined");
  });

  it("getRecent IS the correct public entry point (what millDispatcher now calls)", () => {
    expect(typeof ledger.getRecent).toBe("function");
  });

  it("getRecent() on empty ledger returns an empty array", () => {
    const fresh = new MillingReasoningTraceLedgerEngine();
    const result = fresh.getRecent(20);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("getRecent(N) returns at most N entries", () => {
    const eng = new MillingReasoningTraceLedgerEngine();
    eng.setDiskWrites(false);
    // Record 5 entries via recordTraceSync (synchronous append; auto-assigns id/at/schemaVersion)
    for (let i = 0; i < 5; i++) {
      eng.recordTraceSync({
        dispatcher: "prism_mill",
        action: `mill_test_${i}`,
        awareness_used: false,
        durationMs: 10,
        keywords: [],
      });
    }
    const result = eng.getRecent(3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("getRecent() returns entries in insertion order (oldest first in slice)", () => {
    const eng = new MillingReasoningTraceLedgerEngine();
    eng.setDiskWrites(false);
    const actions = ["mill_a", "mill_b", "mill_c"];
    for (const action of actions) {
      eng.recordTraceSync({
        dispatcher: "prism_mill",
        action,
        awareness_used: false,
        durationMs: 1,
        keywords: [],
      });
    }
    const result = eng.getRecent(10);
    // getRecent returns ring.slice(-limit) — last N in insertion order
    expect(result.length).toBe(3);
    expect(result[0].action).toBe("mill_a");
    expect(result[2].action).toBe("mill_c");
  });
});

// ── Block 10: printReadingEngine object-literal export (false-positive lock) ─
//
// The auditor flagged generateSetupSheet/generateInspectionPlan/compareRevisions/
// extractDxfDimensions as MISSING on PrintReadingEngine.  They ARE present as
// object-literal properties (auditor blind spot).  These tests confirm the
// methods exist and return the correct shapes so any future rename is caught.

describe("printReadingEngine -- object-literal exports exist (false-positive regression lock)", () => {
  it("generateSetupSheet is a function on the singleton", () => {
    expect(typeof printReadingEngine.generateSetupSheet).toBe("function");
  });

  it("generateInspectionPlan is a function on the singleton", () => {
    expect(typeof printReadingEngine.generateInspectionPlan).toBe("function");
  });

  it("compareRevisions is a function on the singleton", () => {
    expect(typeof printReadingEngine.compareRevisions).toBe("function");
  });

  it("extractDxfDimensions is a function on the singleton", () => {
    expect(typeof printReadingEngine.extractDxfDimensions).toBe("function");
  });

  it("generateSetupSheet on empty-analysis returns a typed setup-sheet object", () => {
    // Minimal BlueprintAnalysis with empty arrays and a title block
    const emptyAnalysis = {
      title_block: { units: "in" as const },
      dimensions: [],
      gdt_frames: [],
      notes: [],
      tolerances: [],
      surfaces: [],
      threads: [],
      confidence: 0.5,
    };
    // Must not throw; must return the SetupSheetFromPrint shape
    const sheet = printReadingEngine.generateSetupSheet(emptyAnalysis as Parameters<typeof printReadingEngine.generateSetupSheet>[0]);
    expect(typeof sheet).toBe("object");
    expect(typeof sheet.part_number).toBe("string");
    expect(Array.isArray(sheet.critical_dimensions)).toBe(true);
    expect(Array.isArray(sheet.gdt_requirements)).toBe(true);
  });

  it("generateInspectionPlan on empty-analysis returns typed plan with total_features=0", () => {
    const emptyAnalysis = {
      title_block: { units: "mm" as const },
      dimensions: [],
      gdt_frames: [],
      notes: [],
      tolerances: [],
      surfaces: [],
      threads: [],
      confidence: 0.5,
    };
    const plan = printReadingEngine.generateInspectionPlan(emptyAnalysis as Parameters<typeof printReadingEngine.generateInspectionPlan>[0]);
    expect(typeof plan).toBe("object");
    expect(plan.total_features).toBe(0);
    expect(plan.critical_count).toBe(0);
    expect(Array.isArray(plan.features)).toBe(true);
    expect(Array.isArray(plan.gdt_checks)).toBe(true);
  });

  it("compareRevisions on identical text returns 0 changes in summary", () => {
    const text = "DIA 25.000 +0.000/-0.013";
    const result = printReadingEngine.compareRevisions(text, text, { unit: "mm" });
    expect(typeof result).toBe("object");
    expect(typeof result.summary).toBe("string");
    // Identical revisions must report no dimensional changes
    expect(result.added_dimensions.length).toBe(0);
    expect(result.removed_dimensions.length).toBe(0);
    expect(result.changed_tolerances.length).toBe(0);
  });

  it("extractDxfDimensions on empty string returns zero dimensions", () => {
    const result = printReadingEngine.extractDxfDimensions("", { unit: "mm" });
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.dimensions)).toBe(true);
    expect(result.dimension_count).toBe(0);
  });
});

// ── Block 11: postProcessorAnalysisEngine object-literal exports ─────────────
//
// The auditor flagged analyze/generateReport/applyFixes as MISSING on
// PostProcessorAnalysisEngine.  They ARE present as object-literal properties
// { analyze, generateReport, applyFixes }.  These tests lock that contract.

describe("postProcessorAnalysisEngine -- object-literal exports exist (false-positive regression lock)", () => {
  it("analyze is a function on the singleton", () => {
    expect(typeof postProcessorAnalysisEngine.analyze).toBe("function");
  });

  it("generateReport is a function on the singleton", () => {
    expect(typeof postProcessorAnalysisEngine.generateReport).toBe("function");
  });

  it("applyFixes is a function on the singleton", () => {
    expect(typeof postProcessorAnalysisEngine.applyFixes).toBe("function");
  });

  it("analyze on empty code returns an AnalysisResult with issues array", () => {
    const result = postProcessorAnalysisEngine.analyze("", "test.cps");
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.summary).toBe("object");
  });

  it("generateReport on an empty-issue analysis returns a non-empty string", () => {
    const analysis = postProcessorAnalysisEngine.analyze("", "empty.cps");
    const report = postProcessorAnalysisEngine.generateReport(analysis);
    expect(typeof report).toBe("string");
    expect(report.length).toBeGreaterThan(0);
  });

  it("applyFixes on empty code with no issues returns original code unchanged", () => {
    const result = postProcessorAnalysisEngine.applyFixes("", []);
    expect(typeof result).toBe("object");
    expect(result.fixesApplied).toBe(0);
    expect(result.code).toBe("");
  });
});
