/**
 * CAMX-MS0.3 / U-CAMX09 — Wire WorkholdingViabilityEngine into PrintToProgram
 *
 * Behavioural coverage for the fixture-GEOMETRY viability wire. Verifies
 * against `printToProgramPipelineEngine.runFullPipeline()` (no mocked seams):
 *   1. `workholding_viability` is populated iff the planner produced ≥1 op
 *      (a peak cutting force + workholding config exist to evaluate).
 *   2. R8 — it is COMPLEMENTARY, not a duplicate: the force-margin
 *      `workholding_force` safety rows AND the geometry `workholding_viability`
 *      view coexist on the same result (two distinct safety lenses).
 *   3. The fixture-plate path routes all clamps onto the shared base face, so
 *      the engine's "all clamps same face — poor moment resistance" geometry
 *      heuristic actually fires and is surfaced (proves the wire passes the
 *      derived zones through, not a hard-coded happy path).
 *   4. R12 — every viability issue is surfaced as a stage="workholding_viability"
 *      warning; a non-viable verdict additionally surfaces a critical. No silent
 *      drop.
 *   5. Determinism — same input twice produces the same viability verdict.
 *   6. Cross-regression: U-CAMX24 gcode_setup_sheet + U-CAMX08 sequencing wires
 *      still fire after this addition.
 *
 * @module tests/CAMX-MS0.3-U-CAMX09-WorkholdingViability
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";
// The pipeline resolves the viability engine via getWorkholdingViabilityEngine()
// which returns THIS exact singleton instance — spying on its method here makes
// the pipeline's call hit the spy (same object reference). Used only to make the
// non-viable + engine-throw R12 oracles UNCONDITIONAL (Arm-A P1 fix: the prior
// single case forked on runtime physics, an R9 intent violation).
import { workholdingViabilityEngine } from "../engines/WorkholdingViabilityEngine.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const STEEL: MaterialCallout = {
  material_name: "AISI 4140 Steel",
  specification: "ASTM A29",
  hardness_hrc: 28,
  iso_group: "P",
};

// Inconel — ISO "S" → buildWorkholdingConfig.highLoadMaterial → fixture_plate
// path (4 clamps, all on the shared base face).
const INCONEL: MaterialCallout = {
  material_name: "Inconel 718",
  specification: "AMS 5662",
  hardness_hrc: 36,
  iso_group: "S",
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
    part_number: "CAMX09-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

describe("CAMX-MS0.3/U-CAMX09 — WorkholdingViabilityEngine wire", () => {
  // --- Exit condition 1: populated iff ≥1 operation planned ---

  it("attaches workholding_viability when operations were planned", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.operations.length).toBeGreaterThan(0);
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing despite planned operations");
    expect(typeof v.viable).toBe("boolean");
    expect(Array.isArray(v.issues)).toBe(true);
    expect(Number.isFinite(v.grip_margin)).toBe(true);
    expect(Number.isFinite(v.force_capacity_N)).toBe(true);
    expect(v.force_capacity_N).toBeGreaterThan(0);
  });

  it("omits workholding_viability when no features (no operations planned)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    expect(r.operations.length).toBe(0);
    expect(r.workholding_viability === undefined).toBe(true);
  });

  // --- Exit condition 2 (R8): complementary, NOT a duplicate of the force gate ---

  it("coexists with the force-margin workholding_force safety rows (R8 — two distinct lenses)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    // The pre-existing force gate still emits its rows...
    const forceRows = r.safety_checks.filter(c => c.rule === "workholding_force");
    expect(forceRows.length).toBeGreaterThan(0);
    // ...AND the new geometry lens is independently present (different shape:
    // the force gate is a safety_checks row, viability is its own object).
    expect(r.workholding_viability !== undefined).toBe(true);
    // They are not aliased — viability is not a safety_checks entry.
    expect(
      (r.safety_checks as unknown[]).includes(r.workholding_viability as unknown),
    ).toBe(false);
  });

  // --- Exit condition 3: fixture-plate geometry heuristic actually fires ---

  it("surfaces the same-face moment-resistance heuristic on the fixture-plate path", () => {
    // Inconel (ISO S) → highLoadMaterial → buildWorkholdingConfig picks
    // fixture_plate (4 clamp points). The wire maps all 4 onto the shared
    // "base" face, so WorkholdingViabilityEngine MUST emit its
    // "All clamps on same face — poor moment resistance" issue.
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")], { material: INCONEL }),
    );
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing on fixture-plate path");
    const sameFace = v.issues.some(i => /same face/i.test(i));
    expect(sameFace).toBe(true);
    // And that issue is surfaced as a stage-tagged warning (R12).
    const warn = r.warnings.find(
      w => w.stage === "workholding_viability" && /same face/i.test(w.message),
    );
    if (!warn) throw new Error("same-face issue not surfaced as a workholding_viability warning");
    expect(warn.message.startsWith("U-CAMX09 ")).toBe(true);
  });

  // --- Exit condition 4 (R12): no silent drop — every issue is a warning ---

  it("surfaces every viability issue verbatim as a stage=workholding_viability warning", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")], { material: INCONEL }),
    );
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing");
    // Inconel → fixture_plate → all-clamps-same-face always yields ≥1 issue.
    expect(v.issues.length).toBeGreaterThan(0);
    const warnMsgs = r.warnings
      .filter(w => w.stage === "workholding_viability" && w.severity === "warning")
      .map(w => w.message);
    for (const iss of v.issues) {
      expect(warnMsgs).toContain(`U-CAMX09 ${iss}`);
    }
  });

  // Arm-A P1 fix: the non-viable CRITICAL R12 oracle is now UNCONDITIONAL.
  // buildWorkholdingConfig sizes grip viable-by-construction, so the prior
  // `if (!v.viable)` branch never fired (R9 intent violation). A one-shot spy
  // injects a guaranteed-non-viable verdict so the contract runs every time.
  it("emits a CRITICAL workholding_viability warning on a non-viable verdict (R12)", () => {
    vi.spyOn(workholdingViabilityEngine, "checkViabilityDirect").mockImplementationOnce(() => ({
      viable: false,
      grip_margin: -0.42,
      issues: ["Insufficient grip: 900N capacity vs 2000N required (1000N x SF 2)"],
      force_capacity_N: 900,
    }));
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing");
    expect(v.viable).toBe(false);
    expect(v.grip_margin).toBeLessThan(0);
    expect(v.force_capacity_N).toBe(900);
    const crit = r.warnings.find(
      w => w.stage === "workholding_viability" && w.severity === "critical",
    );
    if (!crit) throw new Error("non-viable verdict produced no critical warning (R12 violation)");
    expect(crit.message).toContain("NOT viable");
    expect(crit.message).toContain("900N");
    // Headline (critical) AND itemized (warning) — intentionally not collapsed.
    const itemized = r.warnings.find(
      w => w.stage === "workholding_viability"
        && w.severity === "warning"
        && /Insufficient grip/.test(w.message),
    );
    if (!itemized) throw new Error("non-viable issue not itemized as a warning row");
    expect(itemized.message).toBe(
      "U-CAMX09 Insufficient grip: 900N capacity vs 2000N required (1000N x SF 2)",
    );
  });

  // Arm-A P1 fix: the catch arm (R12 — a thrown viability check is a visible
  // warn, never a silent swallow) is now exercised. A one-shot spy forces a
  // throw; the wire must surface it AND the pipeline must still succeed.
  it("surfaces a thrown viability check as a warning without crashing the pipeline (R12)", () => {
    vi.spyOn(workholdingViabilityEngine, "checkViabilityDirect").mockImplementationOnce(() => {
      throw new Error("synthetic viability engine fault");
    });
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const w = r.warnings.find(
      x => x.stage === "workholding_viability" && /viability check failed/.test(x.message),
    );
    if (!w) throw new Error("thrown viability check was silently swallowed (R12 violation)");
    expect(w.message).toContain("synthetic viability engine fault");
    expect(w.severity).toBe("warning");
    // R12: the catch arm assigns nothing — a fabricated object hard-fails here.
    if (r.workholding_viability !== undefined) {
      throw new Error(
        `stale viability object after engine throw: ${JSON.stringify(r.workholding_viability)}`,
      );
    }
    // The thrown advisory lens must not poison the rest of the pipeline.
    expect(r.success).toBe(true);
    expect(r.program_text.length).toBeGreaterThan(0);
  });

  it("on the viable vise path, emits zero critical workholding_viability warnings", () => {
    // Steel + small stock → vise, sized viable by construction (positive
    // control for the non-viable oracle above — proves it is not always-on).
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing on vise path");
    expect(v.viable).toBe(true);
    expect(v.grip_margin).toBeGreaterThan(0);
    expect(v.force_capacity_N).toBeGreaterThan(0);
    const crits = r.warnings.filter(
      w => w.stage === "workholding_viability" && w.severity === "critical",
    );
    expect(crits.length).toBe(0);
  });

  // --- Exit condition 5: determinism ---

  it("is deterministic — same input twice produces the same viability verdict", () => {
    const a = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const b = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(a.workholding_viability?.viable).toBe(b.workholding_viability?.viable);
    expect(a.workholding_viability?.force_capacity_N).toBe(b.workholding_viability?.force_capacity_N);
    expect(a.workholding_viability?.issues).toEqual(b.workholding_viability?.issues);
  });

  it("vise-path part keeps clamps on opposed jaw faces (no same-face issue)", () => {
    // Plain steel, small stock → vise path (2 opposed jaw faces). The
    // same-face moment-resistance heuristic must NOT fire here.
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const v = r.workholding_viability;
    if (!v) throw new Error("workholding_viability missing on vise path");
    expect(v.issues.some(i => /same face/i.test(i))).toBe(false);
  });

  // --- Exit condition 6: cross-regression — prior wires still fire ---

  it("U-CAMX24 gcode_setup_sheet still attaches after the U-CAMX09 addition", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    if (!r.gcode_setup_sheet) throw new Error("U-CAMX24 regression: gcode_setup_sheet missing");
    expect(r.gcode_setup_sheet.setup_sheet.part_number).toBe("CAMX09-T");
  });

  it("U-CAMX08 sequencing still produces a gap-free 1..N op order after U-CAMX09", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), pocket("P2")]),
    );
    expect(r.success).toBe(true);
    const opNums = r.operations.map(o => o.op_number);
    expect(opNums[0]).toBe(1);
    expect(opNums).toEqual(Array.from({ length: opNums.length }, (_, i) => i + 1));
  });
});
