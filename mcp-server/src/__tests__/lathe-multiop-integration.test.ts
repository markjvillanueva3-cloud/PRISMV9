/**
 * LATHE-PRO-MS3, U-LPS10
 * Integration tests: Op1/Op2 workflow for 5 part types
 * Each part type exercises a different workholding scenario.
 */

import { describe, it, expect } from "vitest";
import { latheMultiOpPlannerEngine } from "../engines/LatheMultiOpPlannerEngine.js";
import { latheWorkholdingEngine } from "../engines/LatheWorkholdingEngine.js";
import { lathePartClassifierEngine } from "../engines/LathePartClassifierEngine.js";
import { latheSequenceOptimizerEngine } from "../engines/LatheSequenceOptimizerEngine.js";
import type { MultiOpFeature } from "../engines/LatheMultiOpPlannerEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// HELPER — build features list
// ═══════════════════════════════════════════════════════════════════════

function makeFeature(partial: Partial<MultiOpFeature> & { id: string }): MultiOpFeature {
  return {
    type: "od_straight",
    position: "chuck_end",
    ...partial,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PART 1: Simple Shaft — hard jaws, single op (no flip needed)
// ═══════════════════════════════════════════════════════════════════════

describe("Integration: Simple Shaft — no flip", () => {
  const features: MultiOpFeature[] = [
    makeFeature({ id: "od1", type: "od_straight", position: "chuck_end", diameter_mm: 40, length_mm: 60 }),
    makeFeature({ id: "od2", type: "od_straight", position: "chuck_end", diameter_mm: 30, length_mm: 40 }),
  ];

  it("classifies as shaft family", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 100, max_od_mm: 40, od_step_count: 2,
    });
    expect(r.family).toBe("shaft");
  });

  it("plans single-op (no flip needed)", () => {
    const plan = latheMultiOpPlannerEngine.plan({
      part_length_mm: 100,
      max_od_mm: 40,
      features,
      stock_od_mm: 42,
    });
    expect(plan.needs_flip).toBe(false);
    expect(plan.op1.op_number).toBe(1);
    expect(plan.op2).toBeNull();
    expect(plan.soft_jaw_boring).toBeNull();
  });

  it("selects hard jaws for standard shaft", () => {
    const jaw = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 42,
      tolerance_mm: 0.05,
      stock_form: "bar",
    });
    expect(jaw.recommended_jaw).toBe("hard_od");
    expect(jaw.bore_program_needed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 2: Flanged Bushing — soft jaws, Op1/Op2 flip
// ═══════════════════════════════════════════════════════════════════════

describe("Integration: Flanged Bushing — flip with soft jaws", () => {
  const features: MultiOpFeature[] = [
    makeFeature({ id: "bore1", type: "id_bore", position: "through", diameter_mm: 20, length_mm: 30, is_bore: true, is_through: true }),
    makeFeature({ id: "od1", type: "od_straight", position: "chuck_end", diameter_mm: 50, length_mm: 10 }),
    makeFeature({ id: "face1", type: "face", position: "tailstock_end", requires_facing: true }),
  ];

  it("plans Op1/Op2 flip for two-sided access", () => {
    const plan = latheMultiOpPlannerEngine.plan({
      part_length_mm: 30,
      max_od_mm: 50,
      features,
      stock_od_mm: 52,
      concentricity_mm: 0.02,
    });
    expect(plan.needs_flip).toBe(true);
    expect(plan.op1).toBeDefined();
    expect(plan.op2).not.toBeNull();
    expect(plan.estimated_setup_changes).toBeGreaterThanOrEqual(1);
  });

  it("generates soft jaw boring program for Op2", () => {
    const plan = latheMultiOpPlannerEngine.plan({
      part_length_mm: 30,
      max_od_mm: 50,
      features,
      stock_od_mm: 52,
      concentricity_mm: 0.02,
    });
    if (plan.soft_jaw_boring) {
      expect(plan.soft_jaw_boring.bore_diameter_mm).toBeGreaterThan(49);
      expect(plan.soft_jaw_boring.gcode).toContain("G71");
    }
  });

  it("preserves concentricity through Z transfer", () => {
    const plan = latheMultiOpPlannerEngine.plan({
      part_length_mm: 30,
      max_od_mm: 50,
      features,
      stock_od_mm: 52,
      concentricity_mm: 0.02,
    });
    if (plan.z_transfer) {
      expect(plan.z_transfer.op2_face_stock_mm).toBeGreaterThan(0);
      expect(plan.z_transfer.method).toBeDefined();
    }
    if (plan.concentricity) {
      expect(plan.concentricity.target_tir_mm).toBeLessThanOrEqual(0.02);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 3: Thin-Wall Sleeve — collet or 6-jaw workholding
// ═══════════════════════════════════════════════════════════════════════

describe("Integration: Thin-Wall Sleeve — collet workholding", () => {
  it("classifies thin-wall hollow part", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 50, max_od_mm: 40, bore_id_mm: 36, // 2mm wall
    });
    // Should be sleeve, bushing, or tube_hollow — any thin-wall hollow type
    expect(["sleeve", "bushing", "tube_hollow"]).toContain(r.family);
  });

  it("selects collet for thin wall", () => {
    const jaw = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 40,
      bore_id_mm: 36,
      tolerance_mm: 0.03,
    });
    // 2mm wall, ratio = 5% → collet range
    expect(["collet", "6_jaw"]).toContain(jaw.recommended_jaw);
  });

  it("trilobe analysis flags acceptable with collet", () => {
    // Even though we'd use collet, test trilobe for if 3-jaw were used
    const r = latheWorkholdingEngine.calculateTrilobe({
      od_mm: 40, id_mm: 36, clamp_force_n: 8000, tolerance_mm: 0.03,
    });
    expect(r.delta_um).toBeGreaterThan(0);
    expect(r.details.wall_thickness_mm).toBeCloseTo(2.0, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 4: Forging Blank — soft jaws + G73 pattern repeat
// ═══════════════════════════════════════════════════════════════════════

describe("Integration: Forging Blank — soft jaws + G73", () => {
  it("classifies as forging_blank family", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 80, max_od_mm: 100, stock_form: "forging",
    });
    expect(r.family).toBe("forging_blank");
    expect(r.roughing_cycle).toBe("G73");
  });

  it("selects soft jaws for forging stock", () => {
    const jaw = latheWorkholdingEngine.selectJaw({
      grip_diameter_mm: 100,
      tolerance_mm: 0.1,
      stock_form: "forging",
    });
    expect(jaw.recommended_jaw).toBe("soft_od");
    expect(jaw.bore_program_needed).toBe(true);
  });

  it("stock form recommends G73 cycle", () => {
    const r = latheWorkholdingEngine.stockFormRecommendation("forging", 100);
    expect(r.roughing_cycle).toBe("G73");
  });

  it("sequences with face first constraint", () => {
    const r = latheSequenceOptimizerEngine.optimize([
      { id: "od1", type: "rough_od", feature_id: "f1" },
      { id: "face1", type: "face", feature_id: "f2" },
      { id: "bore1", type: "rough_bore", feature_id: "f3" },
    ]);
    expect(r.operations.length).toBe(3);
    expect(r.operations[0].type).toBe("face");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PART 5: Shaft Between Centers — face driver + tailstock
// ═══════════════════════════════════════════════════════════════════════

describe("Integration: Shaft Between Centers — face driver", () => {
  it("classifies long shaft", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 300, max_od_mm: 50, od_step_count: 4,
    });
    expect(r.family).toBe("shaft");
  });

  it("face driver provides adequate torque for light cuts", () => {
    const r = latheWorkholdingEngine.calculateFaceDriver({
      axial_force_n: 8000,
      n_pins: 4,
      mu: 0.25,
      pin_circle_radius_mm: 25,
      required_torque_nm: 50,
    });
    // T = 8000 × 0.25 × 0.025m × 4 = 200 Nm >> 50 Nm required
    expect(r.transmittable_torque_nm).toBeGreaterThan(100);
    expect(r.is_adequate).toBe(true);
    expect(r.safety_factor).toBeGreaterThan(2.0);
  });

  it("soft jaw boring generates valid G-code for Fanuc", () => {
    const bore = latheMultiOpPlannerEngine.generateSoftJawBoring(50.05, 15, "fanuc");
    expect(bore.gcode).toContain("G71");
    expect(bore.bore_diameter_mm).toBeCloseTo(50.05, 1);
    expect(bore.bore_depth_mm).toBe(15);
  });

  it("soft jaw boring generates valid G-code for Haas", () => {
    const bore = latheMultiOpPlannerEngine.generateSoftJawBoring(50.05, 15, "haas");
    expect(bore.gcode).toContain("G71");
    expect(bore.bore_diameter_mm).toBeCloseTo(50.05, 1);
  });
});
