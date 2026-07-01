/**
 * CAMX-MS0.3 / U-CAMX10 — Wire CrossCamRecommenderEngine into PrintToProgram
 *
 * Behavioural coverage for the advisory CAM-bridge + strategy recommendation
 * wire. Verified against `printToProgramPipelineEngine.runFullPipeline()`:
 *   1. `cam_strategy_recommendation` is populated iff ≥1 op was planned (a
 *      representative tool + geometry exist to recommend against).
 *   2. R8 — COMPLEMENTARY, not duplicate: the pipeline's own emitted G-code
 *      (`program_text`) AND the external-CAM routing hint coexist.
 *   3. The surfaced recommendation reflects the engine output verbatim
 *      (cam_system from the engine's CamSystem taxonomy, not fabricated).
 *   4. R12 — the recommendation + every engine warning is surfaced as a
 *      stage="cam_strategy" warning; an engine throw / empty result is
 *      surfaced loudly, never silently swallowed, and never gates the program.
 *   5. Determinism + cross-regression (U-CAMX09 / U-CAMX24 / U-CAMX08).
 *
 * The two spy cases force engine states the pipeline construction cannot reach
 * (throw, empty result) so the R12 oracles are UNCONDITIONAL — the rest of the
 * suite uses the real engine with no mocked seam.
 *
 * @module tests/CAMX-MS0.3-U-CAMX10-CrossCamRecommender
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";
// Same module singleton the pipeline resolves via getCrossCamRecommenderEngine().
import { crossCamRecommenderEngine } from "../engines/CrossCamRecommenderEngine.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const STEEL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

const KNOWN_CAM = new Set([
  "hypermill", "fusion360", "mastercam", "solidcam",
  "siemens_nx", "gibbscam", "esprit", "surfcam",
]);

function pocket(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "pocket_closed",
    width_mm: 30,
    length_mm: 40,
    depth_mm: 10,
    position: { x: 40, y: 30, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function bore(id: string, opts?: Partial<MachinableFeature>): MachinableFeature {
  return {
    id,
    type: "bore",
    diameter_mm: 20,
    depth_mm: 12,
    position: { x: 60, y: 40, z: 0 },
    required_operations: [],
    priority: 0,
    ...opts,
  };
}

function input(features: MachinableFeature[], overrides?: Partial<DrawingInput>): DrawingInput {
  return {
    part_number: "CAMX10-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

describe("CAMX-MS0.3/U-CAMX10 — CrossCamRecommenderEngine wire", () => {
  it("attaches cam_strategy_recommendation when operations were planned", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.operations.length).toBeGreaterThan(0);
    const rec = r.cam_strategy_recommendation;
    if (!rec) throw new Error("cam_strategy_recommendation missing despite planned operations");
    expect(typeof rec.recommended_cam).toBe("string");
    expect(rec.recommended_cam.length).toBeGreaterThan(0);
    expect(typeof rec.recommended_strategy).toBe("string");
    expect(rec.recommended_strategy.length).toBeGreaterThan(0);
    expect(rec.confidence).toBeGreaterThanOrEqual(0);
    expect(rec.confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(rec.predicted_cycle_time_min)).toBe(true);
    expect(Array.isArray(rec.advantages)).toBe(true);
    expect(Array.isArray(rec.warnings)).toBe(true);
  });

  it("omits cam_strategy_recommendation when no features (no operations)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    expect(r.operations.length).toBe(0);
    if (r.cam_strategy_recommendation !== undefined) {
      throw new Error(
        `cam_strategy_recommendation should be absent with zero ops: ${JSON.stringify(r.cam_strategy_recommendation)}`,
      );
    }
  });

  it("recommends a CAM system from the engine's real CamSystem taxonomy (not fabricated)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const rec = r.cam_strategy_recommendation;
    if (!rec) throw new Error("cam_strategy_recommendation missing");
    expect(KNOWN_CAM.has(rec.recommended_cam)).toBe(true);
    expect(rec.strategy_category.length).toBeGreaterThan(0);
  });

  it("surfaces the recommendation as a stage=cam_strategy warning (R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const rec = r.cam_strategy_recommendation;
    if (!rec) throw new Error("cam_strategy_recommendation missing");
    const note = r.warnings.find(
      w => w.stage === "cam_strategy" && /CAM recommendation:/.test(w.message),
    );
    if (!note) throw new Error("recommendation not surfaced as a cam_strategy warning (R12)");
    expect(note.message).toContain(rec.recommended_cam);
    expect(note.message).toContain(rec.recommended_strategy);
    expect(note.message.startsWith("U-CAMX10 ")).toBe(true);
  });

  it("R8 — the routing hint coexists with the pipeline's own emitted G-code", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    // Pipeline still emits its OWN program (it IS the CAM)...
    expect(r.program_text.length).toBeGreaterThan(0);
    // ...AND the advisory external-CAM recommendation is independently present.
    if (!r.cam_strategy_recommendation) {
      throw new Error("R8: recommendation absent — wire reverted?");
    }
    // Not aliased into program_text / setup_sheet (distinct surface).
    expect(typeof r.cam_strategy_recommendation).toBe("object");
  });

  it("emits a cam_strategy warning and NO recommendation when the engine returns no best_overall (R12)", () => {
    vi.spyOn(crossCamRecommenderEngine, "compute").mockImplementationOnce(() => ({
      value: { ranked_strategies: [], best_overall: undefined },
      unit: "cross_cam_recommendation",
      confidence: 0,
      source: "test",
      timestamp: new Date().toISOString(),
    }) as any);
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const w = r.warnings.find(
      x => x.stage === "cam_strategy" && /no best_overall/.test(x.message),
    );
    if (!w) throw new Error("empty recommendation not surfaced (R12 violation)");
    if (r.cam_strategy_recommendation !== undefined) {
      throw new Error("fabricated recommendation despite no best_overall");
    }
    // Advisory failure must not gate the program.
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("surfaces a thrown recommender as a warning without crashing the pipeline (R12)", () => {
    vi.spyOn(crossCamRecommenderEngine, "compute").mockImplementationOnce(() => {
      throw new Error("synthetic crosscam fault");
    });
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const w = r.warnings.find(
      x => x.stage === "cam_strategy" && /CAM strategy recommendation failed/.test(x.message),
    );
    if (!w) throw new Error("thrown recommender was silently swallowed (R12 violation)");
    expect(w.message).toContain("synthetic crosscam fault");
    expect(w.severity).toBe("warning");
    if (r.cam_strategy_recommendation !== undefined) {
      throw new Error(
        `stale recommendation after engine throw: ${JSON.stringify(r.cam_strategy_recommendation)}`,
      );
    }
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input twice produces the same CAM recommendation", () => {
    const a = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const b = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(a.cam_strategy_recommendation?.recommended_cam)
      .toBe(b.cam_strategy_recommendation?.recommended_cam);
    expect(a.cam_strategy_recommendation?.recommended_strategy)
      .toBe(b.cam_strategy_recommendation?.recommended_strategy);
  });

  it("produces a recommendation for a multi-pocket part (geometry maps through)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), pocket("P2"), pocket("P3")]),
    );
    const rec = r.cam_strategy_recommendation;
    if (!rec) throw new Error("multi-pocket part produced no recommendation");
    expect(KNOWN_CAM.has(rec.recommended_cam)).toBe(true);
    expect(rec.predicted_cycle_time_min).toBeGreaterThanOrEqual(0);
  });

  // Arm-B P1 fix: the production no-match path (drilling/boring-dominant part)
  // exercised with the REAL engine — no mock. The round-1 ternary emitted
  // "boring"/"drilling" (no strategy profile covers them) → the real engine
  // threw "Cannot read properties of undefined (reading 'confidence')". The
  // wire now skips the recommender with a SPECIFIC named reason. Fail-on-revert
  // oracle: reverting the drillBoreDominant guard makes a bore-only part fall
  // to geomType="contour" → a semantically-WRONG-but-valid milling
  // recommendation is produced (recommendation becomes defined, the skip
  // warning vanishes) → both assertions below FAIL. (It does NOT re-throw —
  // the post-fix ternary only emits strategy-DB-covered literals.)
  it("skips the recommender with a specific advisory for a bore-only part (real engine, R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([bore("B1")]));
    expect(r.operations.length).toBeGreaterThan(0);
    if (r.cam_strategy_recommendation !== undefined) {
      throw new Error(
        `bore-only part should yield no CAM recommendation: ${JSON.stringify(r.cam_strategy_recommendation)}`,
      );
    }
    const skip = r.warnings.find(
      w => w.stage === "cam_strategy" && /skipped: drilling\/boring-dominant/.test(w.message),
    );
    if (!skip) throw new Error("bore-only skip advisory not surfaced (R12 / Arm-B P1 regression)");
    // Must be the CLEAN named skip, NOT the cryptic caught engine throw.
    const cryptic = r.warnings.find(
      w => w.stage === "cam_strategy" && /recommendation failed/.test(w.message),
    );
    if (cryptic) {
      throw new Error(
        `bore-only part hit the cryptic engine-throw path (geomType taxonomy regression): ${cryptic.message}`,
      );
    }
    // Advisory skip must not gate the program.
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("a hole-only part also takes the clean skip path (no cryptic throw, real engine)", () => {
    const holeOnly: MachinableFeature = {
      id: "H1",
      type: "hole_through",
      diameter_mm: 8,
      depth_mm: 20,
      position: { x: 25, y: 25, z: 0 },
      required_operations: [],
      priority: 0,
    };
    const r = printToProgramPipelineEngine.runFullPipeline(input([holeOnly]));
    expect(r.operations.length).toBeGreaterThan(0);
    if (r.cam_strategy_recommendation !== undefined) {
      throw new Error("hole-only part should yield no CAM recommendation");
    }
    const skip = r.warnings.find(
      w => w.stage === "cam_strategy" && /skipped: drilling\/boring-dominant/.test(w.message),
    );
    if (!skip) throw new Error("hole-only skip advisory not surfaced");
    expect(r.warnings.some(w => w.stage === "cam_strategy" && /recommendation failed/.test(w.message)))
      .toBe(false);
  });

  it("U-CAMX09 + U-CAMX24 wires still fire after the U-CAMX10 addition", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    if (!r.workholding_viability) throw new Error("U-CAMX09 regression: workholding_viability missing");
    expect(typeof r.workholding_viability.viable).toBe("boolean");
    if (!r.gcode_setup_sheet) throw new Error("U-CAMX24 regression: gcode_setup_sheet missing");
    expect(r.gcode_setup_sheet.setup_sheet.part_number).toBe("CAMX10-T");
  });

  it("U-CAMX08 sequencing still yields a gap-free 1..N op order after U-CAMX10", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), pocket("P2")]),
    );
    expect(r.success).toBe(true);
    const opNums = r.operations.map(o => o.op_number);
    expect(opNums[0]).toBe(1);
    expect(opNums).toEqual(Array.from({ length: opNums.length }, (_, i) => i + 1));
  });
});
