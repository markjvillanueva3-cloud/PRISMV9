/**
 * CAMX-MS0.3 / U-CAMX12 — Smart safe-Z calculation in PrintToProgram
 *
 * Behavioural coverage for the workholding-aware safe-Z retract. Verified
 * against `printToProgramPipelineEngine.runFullPipeline()`:
 *   1. `safe_z_plan` is populated iff ≥1 op planned; retract_clearance_mm is a
 *      real workholding-derived value (NOT a hardcoded literal).
 *   2. ZERO REGRESSION — a vise part (the common case) keeps the prior
 *      hardcoded `G0 Z50.` byte-identical; retract only ever RAISES, never
 *      lowers. The emitted G-code retract/clearance lines all use the plan.
 *   3. A fixture-plate part raises the retract above 50mm (its clamps protrude
 *      above the part top — a blind 50 would rapid the tool into workholding).
 *   4. R12 — the plan + a raised-clearance caveat + every note surface as
 *      stage="safe_z" warnings; never silently swallowed.
 *   5. Determinism + cross-regression (U-CAMX09/10/11/24/08).
 *
 * @module tests/CAMX-MS0.3-U-CAMX12-SmartSafeZ
 */

import { describe, it, expect } from "vitest";
import {
  printToProgramPipelineEngine,
  type DrawingInput,
  type MachinableFeature,
  type MaterialCallout,
} from "../engines/PrintToProgramPipelineEngine.js";

// ISO P, small stock → buildWorkholdingConfig picks a VISE (retract stays 50).
const STEEL: MaterialCallout = {
  material_name: "AISI 1018 Steel",
  specification: "ASTM A29",
  hardness_hrc: 18,
  iso_group: "P",
};

// ISO S (Inconel) → highLoadMaterial → fixture_plate + hydraulic clamps →
// retract raised above the 50mm default.
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
    depth_mm: 8,
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
    part_number: "CAMX12-T",
    material: STEEL,
    stock_size: { x: 150, y: 100, z: 30 },
    dimensions: [{ id: "D1", type: "linear", nominal_mm: 100, confidence: 0.95 }],
    features,
    max_spindle_rpm: 12000,
    max_power_kW: 15,
    ...overrides,
  };
}

describe("CAMX-MS0.3/U-CAMX12 — smart safe-Z calculation", () => {
  it("attaches a safe_z_plan when operations were planned", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.operations.length).toBeGreaterThan(0);
    const p = r.safe_z_plan;
    if (!p) throw new Error("safe_z_plan missing despite planned operations");
    expect(p.rapid_plane_mm).toBe(2);
    expect(p.retract_clearance_mm).toBeGreaterThanOrEqual(50);
    expect(typeof p.basis).toBe("string");
    expect(p.basis.length).toBeGreaterThan(0);
    expect(typeof p.raised_above_default).toBe("boolean");
    expect(Array.isArray(p.notes)).toBe(true);
    expect(p.notes.length).toBeGreaterThan(0);
  });

  it("omits safe_z_plan when no features (no operations)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([]));
    expect(r.operations.length).toBe(0);
    if (r.safe_z_plan !== undefined) {
      throw new Error(`safe_z_plan should be absent with zero ops: ${JSON.stringify(r.safe_z_plan)}`);
    }
  });

  // --- Exit condition 2: ZERO REGRESSION on the common vise case ---

  it("a vise part keeps the prior hardcoded G0 Z50. retract byte-identical", () => {
    // Plain steel + small stock → vise → retract stays exactly 50.
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const p = r.safe_z_plan;
    if (!p) throw new Error("safe_z_plan missing");
    expect(p.retract_clearance_mm).toBe(50);
    expect(p.raised_above_default).toBe(false);
    // The emitted G-code still carries the literal `Z50.` retract token.
    expect(/G0 Z50\./.test(r.program_text)).toBe(true);
    // And no retract above 50 anywhere on the vise path.
    const retractZs = Array.from(r.program_text.matchAll(/G0 Z(\d+)\./g)).map(m => Number(m[1]));
    for (const z of retractZs) expect(z).toBeLessThanOrEqual(50);
  });

  // --- Exit condition 3: fixture-plate raises the retract ---

  it("a fixture-plate part raises the retract clearance above 50mm", () => {
    // Inconel (ISO S) → highLoadMaterial → fixture_plate + hydraulic clamps.
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")], { material: INCONEL }),
    );
    const p = r.safe_z_plan;
    if (!p) throw new Error("safe_z_plan missing on fixture-plate path");
    expect(p.retract_clearance_mm).toBeGreaterThan(50);
    expect(p.raised_above_default).toBe(true);
    // `G0 Z<int>.` lines are exactly two value-classes: the R-plane (Z2., the
    // in-feature approach — correctly UNCHANGED) and the safe-Z retract (>=50).
    const allZ = Array.from(r.program_text.matchAll(/G0 Z(\d+)\./g)).map(m => Number(m[1]));
    const retractZs = allZ.filter(z => z >= 50);
    expect(retractZs.length).toBeGreaterThan(0);
    for (const z of retractZs) expect(z).toBe(p.retract_clearance_mm);
    // The R-plane stays at 2mm — U-CAMX12 raises only the retract clearance.
    expect(allZ.some(z => z === 2)).toBe(true);
  });

  it("the tool-change G43 clearance also uses the smart retract value", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")], { material: INCONEL }),
    );
    const p = r.safe_z_plan;
    if (!p) throw new Error("safe_z_plan missing");
    // G43 H<n> Z<retract>. — the tool-length-comp safe-Z must match the plan.
    const g43 = Array.from(r.program_text.matchAll(/G43 H\d+ Z(\d+)\./g)).map(m => Number(m[1]));
    expect(g43.length).toBeGreaterThan(0);
    for (const z of g43) expect(z).toBe(p.retract_clearance_mm);
  });

  // --- Exit condition 4 (R12): plan surfaced as warnings ---

  it("surfaces the safe-Z plan as a stage=safe_z warning (R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const note = r.warnings.find(
      w => w.stage === "safe_z" && /safe-Z: retract/.test(w.message),
    );
    if (!note) throw new Error("safe-Z plan not surfaced as a stage=safe_z warning (R12)");
    expect(note.message).toContain("retract");
    expect(note.message.startsWith("U-CAMX12 ")).toBe(true);
  });

  it("raises a loud caveat warning when the clearance was raised above default (R12)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1")], { material: INCONEL }),
    );
    const caveat = r.warnings.find(
      w => w.stage === "safe_z" && /raised above the 50mm default/.test(w.message),
    );
    if (!caveat) throw new Error("raised-clearance caveat not surfaced (R12 violation)");
    expect(caveat.severity).toBe("warning");
  });

  it("does NOT raise the caveat for a vise part (positive control)", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const caveat = r.warnings.filter(
      w => w.stage === "safe_z" && /raised above the 50mm default/.test(w.message),
    );
    expect(caveat.length).toBe(0);
  });

  // --- Exit condition 5: determinism + cross-regression ---

  it("is deterministic — same input twice produces the same safe-Z plan", () => {
    const a = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    const b = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(a.safe_z_plan?.retract_clearance_mm).toBe(b.safe_z_plan?.retract_clearance_mm);
    expect(a.safe_z_plan?.basis).toBe(b.safe_z_plan?.basis);
  });

  it("U-CAMX09 + U-CAMX11 + U-CAMX24 wires still fire after the U-CAMX12 addition", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(input([pocket("P1"), bore("B1")]));
    expect(r.success).toBe(true);
    if (!r.workholding_viability) throw new Error("U-CAMX09 regression: workholding_viability missing");
    if (!r.wcs_plan) throw new Error("U-CAMX11 regression: wcs_plan missing");
    if (!r.gcode_setup_sheet) throw new Error("U-CAMX24 regression: gcode_setup_sheet missing");
    expect(r.gcode_setup_sheet.setup_sheet.part_number).toBe("CAMX12-T");
  });

  it("U-CAMX08 sequencing still yields a gap-free 1..N op order after U-CAMX12", () => {
    const r = printToProgramPipelineEngine.runFullPipeline(
      input([pocket("P1"), bore("B1"), pocket("P2")]),
    );
    expect(r.success).toBe(true);
    const opNums = r.operations.map(o => o.op_number);
    expect(opNums[0]).toBe(1);
    expect(opNums).toEqual(Array.from({ length: opNums.length }, (_, i) => i + 1));
  });
});
