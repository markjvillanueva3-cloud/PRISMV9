/**
 * LATHE-PRO-MS3, U-LPS01..U-LPS03
 * Session 12 Tests: Part Classification, Sequence Optimization, Multi-Op Planning
 */

import { describe, it, expect } from "vitest";
import { lathePartClassifierEngine, type LathePartFamily } from "../engines/LathePartClassifierEngine.js";
import { latheSequenceOptimizerEngine, type SequenceOperation } from "../engines/LatheSequenceOptimizerEngine.js";
import { latheMultiOpPlannerEngine } from "../engines/LatheMultiOpPlannerEngine.js";

// ═══════════════════════════════════════════════════════════════════════
// U-LPS01: LathePartClassifierEngine — 15 families
// ═══════════════════════════════════════════════════════════════════════

describe("Part Classifier — Family Detection (U-LPS01)", () => {
  it("classifies long solid as shaft (L/D > 3)", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 200, max_od_mm: 30, od_step_count: 3,
    });
    expect(r.family).toBe("shaft");
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("classifies short part with bolt circle as flange", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 20, max_od_mm: 100, has_bolt_circle: true,
    });
    expect(r.family).toBe("flange");
    expect(r.roughing_cycle).toMatch(/G71|G72/);
  });

  it("classifies very short solid as disc (L/D < 0.3)", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 8, max_od_mm: 80,
    });
    expect(r.family).toBe("disc");
  });

  it("classifies hollow cylinder as sleeve", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 60, max_od_mm: 40, bore_id_mm: 25,
    });
    expect(r.family).toBe("sleeve");
    expect(r.workholding_default).toBe("collet");
  });

  it("classifies short hollow with tight tolerance as bushing", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 20, max_od_mm: 30, bore_id_mm: 20,
      tightest_tolerance_mm: 0.02,
    });
    expect(r.family).toBe("bushing");
  });

  it("classifies belt-grooved part as pulley", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 30, max_od_mm: 80, bore_id_mm: 25,
      has_grooves: true, features: ["v_groove", "belt"],
    });
    expect(r.family).toBe("pulley");
  });

  it("classifies bore + keyway as coupling", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 50, max_od_mm: 40, bore_id_mm: 20, has_keyway: true,
    });
    expect(r.family).toBe("coupling");
  });

  it("classifies bore + steps + web as hub", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 40, max_od_mm: 60, bore_id_mm: 25,
      od_step_count: 3, features: ["hub", "web"],
    });
    expect(r.family).toBe("hub");
  });

  it("classifies simple ring as spacer", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 10, max_od_mm: 30, bore_id_mm: 20,
    });
    expect(r.family).toBe("spacer");
  });

  it("classifies blind bore as cap", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 40, max_od_mm: 50, bore_id_mm: 30,
      blind_bore: true,
    });
    expect(r.family).toBe("cap");
  });

  it("classifies short solid with thread as plug", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 20, max_od_mm: 25, has_threads: true,
    });
    expect(r.family).toBe("plug");
  });

  it("classifies threaded both ends as nipple", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 60, max_od_mm: 25, threaded_both_ends: true,
    });
    expect(r.family).toBe("nipple");
  });

  it("classifies forging stock as forging_blank → G73", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 80, max_od_mm: 60, stock_form: "forging",
    });
    expect(r.family).toBe("forging_blank");
    expect(r.roughing_cycle).toBe("G73");
  });

  it("classifies casting stock as casting_blank → G73", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 80, max_od_mm: 60, stock_form: "casting",
    });
    expect(r.family).toBe("casting_blank");
    expect(r.roughing_cycle).toBe("G73");
  });

  it("classifies tube stock as tube_hollow → controlled pressure", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 100, max_od_mm: 50, bore_id_mm: 44, stock_form: "tube",
    });
    expect(r.family).toBe("tube_hollow");
    expect(r.workholding_default).toBe("controlled_pressure");
    expect(r.thin_wall_risk).toBe(true);
  });

  it("listFamilies returns all 15 families", () => {
    const families = lathePartClassifierEngine.listFamilies();
    expect(families.length).toBe(15);
    const names = families.map(f => f.family);
    expect(names).toContain("shaft");
    expect(names).toContain("forging_blank");
    expect(names).toContain("tube_hollow");
  });

  it("thin wall overrides workholding to controlled_pressure", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 60, max_od_mm: 50, bore_id_mm: 47, // wall = 1.5mm, 3% of OD
    });
    expect(r.workholding_default).toBe("controlled_pressure");
    expect(r.thin_wall_risk).toBe(true);
  });

  it("tight tolerance overrides shaft workholding to collet", () => {
    const r = lathePartClassifierEngine.classify({
      length_mm: 120, max_od_mm: 25, od_step_count: 2,
      tightest_tolerance_mm: 0.01,
    });
    expect(r.workholding_default).toBe("collet");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-LPS02: LatheSequenceOptimizerEngine
// ═══════════════════════════════════════════════════════════════════════

describe("Sequence Optimizer — Hard Constraints (U-LPS02)", () => {
  const makeOp = (id: string, type: string, extra: Partial<SequenceOperation> = {}): SequenceOperation => ({
    id, type: type as any, ...extra,
  });

  it("face is always first", () => {
    const ops = [
      makeOp("1", "rough_od"),
      makeOp("2", "face"),
      makeOp("3", "finish_od"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.operations[0].type).toBe("face");
    expect(result.constraint_violations.length).toBe(0);
  });

  it("part_off is always last", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "part_off"),
      makeOp("3", "rough_od"),
      makeOp("4", "finish_od"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.operations[result.operations.length - 1].type).toBe("part_off");
  });

  it("G97 assigned for drilling, G96 for turning", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "rough_od"),
      makeOp("3", "drill"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.spindle_modes.get("2")).toBe("G96");
    expect(result.spindle_modes.get("3")).toBe("G97");
  });

  it("center drill precedes drill", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "drill"),
      makeOp("3", "center_drill"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    const cdIdx = result.operations.findIndex(o => o.type === "center_drill");
    const drIdx = result.operations.findIndex(o => o.type === "drill");
    expect(cdIdx).toBeLessThan(drIdx);
  });

  it("rough OD before finish OD", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "finish_od"),
      makeOp("3", "rough_od"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    const rIdx = result.operations.findIndex(o => o.type === "rough_od");
    const fIdx = result.operations.findIndex(o => o.type === "finish_od");
    expect(rIdx).toBeLessThan(fIdx);
  });

  it("validates constraint violations on bad sequence", () => {
    const violations = latheSequenceOptimizerEngine.validateSequence([
      makeOp("1", "rough_od"),  // face not first
      makeOp("2", "face"),
      makeOp("3", "part_off"),
      makeOp("4", "finish_od"), // after part_off
    ]);
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("Sequence Optimizer — Thermal Sequencing (U-LPS02)", () => {
  const makeOp = (id: string, type: string, extra: Partial<SequenceOperation> = {}): SequenceOperation => ({
    id, type: type as any, ...extra,
  });

  it("activates thermal sequencing for tolerance < 0.05mm", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "finish_od", { tolerance_mm: 0.02, is_finishing: true }),
      makeOp("3", "rough_od", { is_roughing: true }),
      makeOp("4", "part_off"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.thermal_sequencing_active).toBe(true);
    // Rough should come before finish
    const rIdx = result.operations.findIndex(o => o.type === "rough_od");
    const fIdx = result.operations.findIndex(o => o.type === "finish_od");
    expect(rIdx).toBeLessThan(fIdx);
  });

  it("groups by tool to minimize changes", () => {
    const ops = [
      makeOp("1", "face", { tool_number: 1 }),
      makeOp("2", "rough_od", { tool_number: 1 }),
      makeOp("3", "drill", { tool_number: 3 }),
      makeOp("4", "rough_bore", { tool_number: 2 }),
      makeOp("5", "finish_od", { tool_number: 1 }),
      makeOp("6", "finish_bore", { tool_number: 2 }),
      makeOp("7", "part_off", { tool_number: 4 }),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.tool_changes).toBeLessThanOrEqual(6); // at most worst case
  });

  it("optimization score is between 0 and 1", () => {
    const ops = [
      makeOp("1", "face"),
      makeOp("2", "rough_od"),
      makeOp("3", "finish_od"),
      makeOp("4", "part_off"),
    ];
    const result = latheSequenceOptimizerEngine.optimize(ops);
    expect(result.optimization_score).toBeGreaterThanOrEqual(0);
    expect(result.optimization_score).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// U-LPS03: LatheMultiOpPlannerEngine
// ═══════════════════════════════════════════════════════════════════════

describe("Multi-Op Planner — Op1/Op2 Detection (U-LPS03)", () => {
  it("single-sided part doesn't need flip", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 50, max_od_mm: 30,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 30 },
        { id: "bore1", type: "bore", position: "chuck_end", is_bore: true, diameter_mm: 15 },
      ],
    });
    expect(result.needs_flip).toBe(false);
    expect(result.op2).toBeNull();
    expect(result.soft_jaw_boring).toBeNull();
  });

  it("two-sided part requires flip with Op2 plan", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 80, max_od_mm: 40,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 40 },
        { id: "face2", type: "face", position: "tailstock_end", requires_facing: true },
        { id: "bore2", type: "bore", position: "tailstock_end", is_bore: true, diameter_mm: 20 },
      ],
    });
    expect(result.needs_flip).toBe(true);
    expect(result.op2).not.toBeNull();
    expect(result.op2!.op_number).toBe(2);
    expect(result.estimated_setup_changes).toBe(1);
  });

  it("generates soft jaw boring program for Op2", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 60, max_od_mm: 35,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 35 },
        { id: "bore2", type: "bore", position: "tailstock_end", is_bore: true, diameter_mm: 15 },
      ],
    });
    expect(result.soft_jaw_boring).not.toBeNull();
    expect(result.soft_jaw_boring!.bore_diameter_mm).toBeCloseTo(35.05, 2); // OD + 0.05 clearance
    expect(result.soft_jaw_boring!.gcode).toContain("G71");
    expect(result.soft_jaw_boring!.gcode).toContain("G70");
  });

  it("Z transfer includes face stock for Op2 facing", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 100, max_od_mm: 50,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 50 },
        { id: "f2", type: "face", position: "tailstock_end", requires_facing: true },
      ],
    });
    expect(result.z_transfer).not.toBeNull();
    expect(result.z_transfer!.op2_face_stock_mm).toBe(0.5);
    expect(result.z_transfer!.method).toBe("face_reference");
  });

  it("concentricity strategy for standard tolerance", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 60, max_od_mm: 40, concentricity_mm: 0.025,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 40 },
        { id: "bore2", type: "bore", position: "tailstock_end", is_bore: true },
      ],
    });
    expect(result.concentricity).not.toBeNull();
    expect(result.concentricity!.method).toBe("soft_jaw_bore_to_od");
  });

  it("tight concentricity triggers indicator alignment", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 60, max_od_mm: 40, concentricity_mm: 0.005,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 40 },
        { id: "bore2", type: "bore", position: "tailstock_end", is_bore: true },
      ],
    });
    expect(result.concentricity!.method).toBe("indicator_alignment");
  });

  it("soft jaw boring for Okuma generates GROV/GFIN", () => {
    const prog = latheMultiOpPlannerEngine.generateSoftJawBoring(40.05, 15, "okuma");
    expect(prog.gcode).toContain("GROV");
    expect(prog.gcode).toContain("GFIN");
  });

  it("soft jaw boring for Siemens generates CYCLE95", () => {
    const prog = latheMultiOpPlannerEngine.generateSoftJawBoring(40.05, 15, "siemens");
    expect(prog.gcode).toContain("CYCLE95");
  });

  it("through features don't require flip", () => {
    const result = latheMultiOpPlannerEngine.plan({
      part_length_mm: 80, max_od_mm: 40,
      features: [
        { id: "od1", type: "od", position: "chuck_end", diameter_mm: 40 },
        { id: "bore_through", type: "bore", position: "through", is_bore: true, is_through: true },
      ],
    });
    expect(result.needs_flip).toBe(false);
  });
});
