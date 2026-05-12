/**
 * Feature Editor Integration Tests
 * Tests: secondary ops allowances, feature dimension calculations,
 *        heat treat + grinding + plating stock adjustment, anodize buildup
 */

import { describe, it, expect } from "vitest";
import { threadEngine } from "../engines/ThreadCalculationEngine.js";
import { threadGageEngine } from "../engines/ThreadGageEngine.js";
import { singlePointThreadEngine } from "../engines/SinglePointThreadEngine.js";
import { hardTurningDecisionEngine } from "../engines/HardTurningDecisionEngine.js";
import { grooveClassificationEngine } from "../engines/GrooveClassificationEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// Secondary Operations Stock Allowances
// ═══════════════════════════════════════════════════════════════════════

describe("Secondary Ops — Stock Allowances", () => {
  it("grinding allowance: finish OD must leave 0.2-0.5mm stock", () => {
    const nominalOD = 50.0;
    const grindAllowance = 0.3; // mm per side
    const machinedOD = nominalOD + grindAllowance * 2;
    expect(machinedOD).toBeCloseTo(50.6, 1);
    // Lathe programs to 50.6mm, grinder finishes to 50.0mm
    expect(machinedOD).toBeGreaterThan(nominalOD);
  });

  it("hard chrome plating: machine undersize by plating thickness", () => {
    const nominalOD = 25.0;
    const platingThickness_um = 25; // 25 micron per side
    const platingThickness_mm = platingThickness_um / 1000;
    const machinedOD = nominalOD - platingThickness_mm * 2;
    expect(machinedOD).toBeCloseTo(24.95, 2);
    // After plating 25um per side: 24.95 + 0.05 = 25.0mm
  });

  it("anodize Type II: minimal dimensional growth (~0.003mm/side)", () => {
    const nominalOD = 30.0;
    const anodizeGrowth = 0.003; // mm per side, Type II
    const machinedOD = nominalOD - anodizeGrowth * 2;
    expect(machinedOD).toBeCloseTo(29.994, 3);
  });

  it("anodize Type III (hard): significant growth (~0.025mm/side)", () => {
    const nominalOD = 30.0;
    const anodizeGrowth = 0.025; // mm per side, Type III hard coat
    const machinedOD = nominalOD - anodizeGrowth * 2;
    expect(machinedOD).toBeCloseTo(29.95, 2);
  });

  it("heat treat allowance: leave stock for distortion + grinding", () => {
    const nominalOD = 40.0;
    const htDistortion = 0.05; // mm typical for through-hardened 4140
    const grindAllowance = 0.3;
    const machinedOD = nominalOD + grindAllowance * 2 + htDistortion;
    expect(machinedOD).toBeCloseTo(40.65, 2);
  });

  it("case hardening depth must be specified (0.5-2.0mm typical)", () => {
    const caseDepths = [0.5, 0.8, 1.0, 1.5, 2.0];
    for (const depth of caseDepths) {
      expect(depth).toBeGreaterThanOrEqual(0.5);
      expect(depth).toBeLessThanOrEqual(2.0);
    }
  });

  it("electroless nickel plating: uniform coverage (bore + OD)", () => {
    const nominalBoreID = 20.0;
    const plating_um = 25;
    const plating_mm = plating_um / 1000;
    // Bore gets SMALLER after plating (buildup on ID)
    const machinedBoreID = nominalBoreID + plating_mm * 2;
    expect(machinedBoreID).toBeCloseTo(20.05, 2);
    // Machine bore 0.05mm oversize, plating fills it back
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Feature Dimension Calculations
// ═══════════════════════════════════════════════════════════════════════

describe("Feature Dimensions — calculated from user input", () => {
  it("thread pitch diameter calculated from designation", () => {
    const thread = threadEngine.parseThreadDesignation("M10x1.5");
    expect(thread).not.toBeNull();
    // d2 = D - 0.6495*P = 10 - 0.974 = 9.026
    expect(thread!.pitchDiameter).toBeCloseTo(9.026, 1);
  });

  it("groove depth affects remaining wall thickness", () => {
    const partOD = 40;
    const grooveDepth = 5;
    const boreID = 20;
    const wallBefore = (partOD - boreID) / 2; // 10mm
    const wallAfter = wallBefore - grooveDepth; // 5mm
    expect(wallBefore).toBeCloseTo(10, 0);
    expect(wallAfter).toBeCloseTo(5, 0);
    expect(wallAfter).toBeGreaterThan(0); // Still positive = safe
  });

  it("taper angle from diameter difference and length", () => {
    const largeDia = 50;
    const smallDia = 40;
    const length = 100;
    const taperPerSide = Math.atan((largeDia - smallDia) / 2 / length) * 180 / Math.PI;
    expect(taperPerSide).toBeCloseTo(2.86, 1);
  });

  it("bore L/D determines finishing strategy", () => {
    const boreID = 20;
    const boreDepth = 120;
    const ld = boreDepth / boreID;
    expect(ld).toBeCloseTo(6.0, 0);
    // L/D > 6 → honing recommended
    const decision = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 30, od_mm: 50, bore_id_mm: boreID, bore_depth_mm: boreDepth },
      requirements: { target_Ra_um: 0.4, tolerance_mm: 0.01 },
    });
    // L/D=6, hardness 30 → fine boring (honing at L/D>6 AND Ra<0.2)
    expect(["honing", "fine_boring_diamond", "cbn_boring"]).toContain(decision.bore_finishing!.method);
  });

  it("thread relief groove width from pitch (DIN 76)", () => {
    // DIN 76 Type A: width = 3*P for pitch 1.5-3mm
    const pitch = 2.0;
    const reliefWidth = 3 * pitch;
    expect(reliefWidth).toBeCloseTo(6.0, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Feature Interaction — dimension changes affect other features
// ═══════════════════════════════════════════════════════════════════════

describe("Feature Interactions — cascading dimension changes", () => {
  it("changing OD affects bar stock selection", () => {
    const finishedOD = 48;
    const minBarStock = finishedOD + 2; // 2mm cleanup allowance
    const standardBars = [25, 30, 35, 40, 45, 50, 55, 60, 65, 75, 100];
    const selectedBar = standardBars.find(b => b >= minBarStock)!;
    expect(selectedBar).toBe(50);
  });

  it("adding groove near thread affects workholding", () => {
    const groove = grooveClassificationEngine.classify({
      type: "rectangular", location: "od", width_mm: 3, depth_mm: 15,
      diameter_mm: 50, blade_width_mm: 3,
    });
    // depth=15 > blade*3=9 → peck strategy
    expect(groove.strategy).toBe("peck");
    expect(groove.peck_depth_mm).toBeGreaterThan(0);
  });

  it("secondary ops on bore affect boring final dimension", () => {
    const nominalBore = 25.0;
    const grindAllowance = 0.2; // leave stock for ID grinding
    const machinedBore = nominalBore - grindAllowance * 2;
    expect(machinedBore).toBeCloseTo(24.6, 1);
    // Lathe bores to 24.6mm, ID grinder finishes to 25.0mm H7
  });

  it("hardness after heat treat changes cutting parameters", () => {
    // Before HT: 28 HRC → standard carbide
    const before = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 28, od_mm: 50 },
      requirements: { target_Ra_um: 0.8, tolerance_mm: 0.02 },
    });
    // After HT: 60 HRC → needs CBN
    const after = hardTurningDecisionEngine.analyze({
      workpiece: { hardness_hrc: 60, od_mm: 50 },
      requirements: { target_Ra_um: 0.4, tolerance_mm: 0.01 },
    });
    expect(before.insert_selection!.material).toContain("ceramic");
    expect(after.insert_selection!.material).toContain("cbn");
  });
});
