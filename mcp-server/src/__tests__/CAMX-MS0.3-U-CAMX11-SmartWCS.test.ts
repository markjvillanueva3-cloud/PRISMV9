/**
 * CAMX-MS0.3 / U-CAMX11 — Smart WCS selection wired into PrintToProgram
 *
 * Behavioural coverage for the datum-derived WCS plan. Verified against
 * `printToProgramPipelineEngine.runFullPipeline()`:
 *   1. `wcs_plan` populated iff ≥1 op planned; carries the engine-derived
 *      origin + probe sequence + setup-time (NOT a fabricated G54 literal).
 *   2. ADDITIVE — the emitted G-code still contains the conventional G54
 *      (unchanged); the smart plan is the operator/setup-sheet layer the
 *      hardcoded "G54" never provided (R8 — complementary, not a rewrite).
 *   3. Multi-setup detection: a back-side feature (z < -1) ⇒ multi_setup +
 *      G55 recommendation + a loud "emitted G-code uses G54 only" caveat.
 *   4. R12 — plan + every note/validation issue surfaced as stage="wcs"
 *      warnings; an engine throw is surfaced, never silently swallowed.
 *   5. Fresh-per-call instance — repeated runs do NOT accumulate WCS offsets
 *      (the stateful-singleton false-duplicate bug is structurally avoided).
 *
 * @module tests/CAMX-MS0.3-U-CAMX11-SmartWCS
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";
// Same class the pipeline instantiates per-call via getWorkCoordinateEngineClass().
import { WorkCoordinateEngine } from "../engines/WorkCoordinateEngine.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const STEEL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

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
    part_number: "CAMX11-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

describe("CAMX-MS0.3/U-CAMX11 — Smart WCS selection wire", () => {
  it("attaches an engine-derived wcs_plan when operations were planned", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.operations.length).toBeGreaterThan(0);
    const w = r.wcs_plan;
    if (!w) throw new Error("wcs_plan missing despite planned operations");
    expect(w.primary_code).toBe("G54");
    expect(typeof w.origin.x).toBe("number");
    expect(typeof w.origin.y).toBe("number");
    expect(typeof w.origin.z).toBe("number");
    expect(w.datum_count).toBeGreaterThan(0);
    expect(Array.isArray(w.probe_sequence)).toBe(true);
    expect(w.probe_sequence.length).toBeGreaterThan(0);
    expect(w.estimated_setup_time_min).toBeGreaterThan(0);
    expect(Array.isArray(w.additional_wcs)).toBe(true);
    expect(typeof w.multi_setup).toBe("boolean");
    expect(typeof w.valid).toBe("boolean");
  });

  it("omits wcs_plan when no features (no operations)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    expect(r.operations.length).toBe(0);
    if (r.wcs_plan !== undefined) {
      throw new Error(`wcs_plan should be absent with zero ops: ${JSON.stringify(r.wcs_plan)}`);
    }
  });

  it("the origin/probe-sequence come from WorkCoordinateEngine (not a fabricated literal)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1")]));
    const w = r.wcs_plan;
    if (!w) throw new Error("wcs_plan missing");
    // setupFromDatums origin = { x: datum[0].x, y: datum[0].y, z: lastDatum.z }.
    // Primary datum is top-face-center: x = stock.x/2 = 75, y = stock.y/2 = 50.
    expect(w.origin.x).toBeCloseTo(75, 5);
    expect(w.origin.y).toBeCloseTo(50, 5);
    // The engine's PROBE_SEQUENCES injects a "--- Datum A (surface) ---" marker.
    expect(w.probe_sequence.some(s => /Datum A \(surface\)/.test(s))).toBe(true);
  });

  it("single top-side part → multi_setup false, no additional WCS", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const w = r.wcs_plan;
    if (!w) throw new Error("wcs_plan missing");
    expect(w.multi_setup).toBe(false);
    expect(w.additional_wcs.length).toBe(0);
  });

  it("back-side feature (z < -1) → multi_setup true, G55 recommended + G54-only caveat", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1", { position: { x: 60, y: 40, z: -15 } })]),
    );
    const w = r.wcs_plan;
    if (!w) throw new Error("wcs_plan missing");
    expect(w.multi_setup).toBe(true);
    expect(w.additional_wcs).toContain("G55");
    const caveat = r.warnings.find(
      x => x.stage === "wcs" && /multi-setup detected/.test(x.message) && /G54 only/.test(x.message),
    );
    if (!caveat) throw new Error("multi-setup G54-only caveat not surfaced (R12)");
    expect(caveat.message.startsWith("U-CAMX11 ")).toBe(true);
  });

  it("surfaces the WCS plan as a stage=wcs warning (R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const note = r.warnings.find(
      w => w.stage === "wcs" && /WCS plan: G54/.test(w.message),
    );
    if (!note) throw new Error("WCS plan not surfaced as a stage=wcs warning (R12)");
    expect(note.message).toContain("origin");
    expect(note.message).toContain("datums");
  });

  it("R8 — emitted G-code still uses G54 (unchanged) AND wcs_plan coexists", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    // The hardcoded conventional work-offset emit is untouched (additive).
    expect(/G5[4-9]/.test(r.program_text)).toBe(true);
    if (!r.wcs_plan) throw new Error("R8: wcs_plan absent — wire reverted?");
    expect(r.wcs_plan.primary_code).toBe("G54");
  });

  it("surfaces a thrown WCS engine as a warning without crashing the pipeline (R12)", () => {
    vi.spyOn(WorkCoordinateEngine.prototype, "setupFromDatums").mockImplementationOnce(() => {
      throw new Error("synthetic wcs fault");
    });
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const w = r.warnings.find(
      x => x.stage === "wcs" && /WCS plan failed/.test(x.message),
    );
    if (!w) throw new Error("thrown WCS engine was silently swallowed (R12 violation)");
    expect(w.message).toContain("synthetic wcs fault");
    expect(w.severity).toBe("warning");
    if (r.wcs_plan !== undefined) {
      throw new Error(`stale wcs_plan after engine throw: ${JSON.stringify(r.wcs_plan)}`);
    }
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input twice produces the same WCS plan", () => {
    const a = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const b = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(a.wcs_plan?.primary_code).toBe(b.wcs_plan?.primary_code);
    expect(a.wcs_plan?.origin).toEqual(b.wcs_plan?.origin);
    expect(a.wcs_plan?.multi_setup).toBe(b.wcs_plan?.multi_setup);
    expect(a.wcs_plan?.additional_wcs).toEqual(b.wcs_plan?.additional_wcs);
  });

  it("fresh per-call instance — repeated runs never report a false duplicate-WCS (valid stays true)", () => {
    // The stateful-singleton bug would accumulate G54 offsets across runs and
    // flip validation invalid by run 3. A fresh instance per call keeps it valid.
    for (let i = 0; i < 4; i++) {
      const r = printToProgramPipelineEngine.runFullPipeline(input([pocket(`P${i}`), bore(`B${i}`)]));
      const w = r.wcs_plan;
      if (!w) throw new Error(`wcs_plan missing on run ${i}`);
      expect(w.valid).toBe(true);
      const dupWarn = r.warnings.find(
        x => x.stage === "wcs" && /Duplicate WCS codes/.test(x.message),
      );
      if (dupWarn) {
        throw new Error(`run ${i} reported a false duplicate-WCS (state bled across runs): ${dupWarn.message}`);
      }
    }
  });

  it("U-CAMX10 + U-CAMX09 wires still fire after the U-CAMX11 addition", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    if (!r.cam_strategy_recommendation) {
      throw new Error("U-CAMX10 regression: cam_strategy_recommendation missing for pocket+bore");
    }
    if (!r.workholding_viability) throw new Error("U-CAMX09 regression: workholding_viability missing");
    expect(typeof r.workholding_viability.viable).toBe("boolean");
  });

  it("U-CAMX08 sequencing still yields a gap-free 1..N op order after U-CAMX11", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), pocket("P2")]),
    );
    expect(r.success).toBe(true);
    const opNums = r.operations.map(o => o.op_number);
    expect(opNums[0]).toBe(1);
    expect(opNums).toEqual(Array.from({ length: opNums.length }, (_, i) => i + 1));
  });
});
