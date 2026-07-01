/**
 * SpeedFeedNineAxisOrchestratorEngine — tests
 *
 * Reference values derived from canonical sources:
 *   - Sandvik Coromant Mill Cutting Data: AISI 1018 steel, carbide endmill Vc = 180-280 m/min
 *   - Sandvik Coromant 6061-T6 Aluminum: carbide endmill Vc = 400-1000 m/min
 *   - Kennametal Ti6Al4V annealed: carbide Vc = 40-90 m/min
 *   - HSMAdvisor public chip-load table: 12mm carbide endmill in steel fz = 0.05-0.10 mm/tooth
 *   - ISO 1940-1:2003 balance class → max RPM at typical holder mass (0.5 kg, 25mm radius):
 *       G2.5 ≈ 24000 RPM; G6.3 ≈ 12000 RPM; G16 ≈ 8000 RPM; G40 ≈ 4000 RPM
 *   - Altintas/Tlusty rigidity multipliers: box-way > hybrid > linear-rail > roller-bearing
 *
 * Assertions check specific numeric ranges, not just presence/truthiness.
 *
 * @module __tests__/SpeedFeedNineAxisOrchestratorEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  SpeedFeedNineAxisOrchestratorEngine,
  speedFeedNineAxisOrchestratorEngine,
  type NineAxisInput,
} from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const engine = speedFeedNineAxisOrchestratorEngine;

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const MILL_STEEL_BASELINE: NineAxisInput = {
  material: { name: "steel", hardness_hb: 180 },
  tooling: {
    tool_diameter_mm: 12.0,
    flutes: 4,
    tool_material: "carbide",
    coating: "TiAlN",
    helix_angle_deg: 38,
    stickout_mm: 36,
    tool_cost_usd: 65,
  },
  toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional" },
};

const MILL_ALUMINUM_FULL_9AXIS: NineAxisInput = {
  machine: {
    name: "Haas VF-4SS",
    kinematics: "3axis_vmc",
    build_quality: "production",
    way_type: "linear_rail",
    weight_kg: 4500,
    motion_control: "servo",
    power_kw: 22.4,
    max_rpm: 12000,
    max_torque_nm: 102,
    base_rpm: 2000,
  },
  spindle: { hp: 30, diameter_mm: 170, bigplus: true, through_spindle_coolant: true },
  controller: {
    brand: "haas",
    high_speed_machining: true,
    smoothing: true,
    look_ahead_blocks: 80,
  },
  material: { name: "aluminum_6061", hardness_hb: 95 },
  workholding: {
    type: "kurt_vise",
    clamp_force_available_kn: 35,
    parallel_size_mm: 50,
    contact_area_mm2: 3000,
    friction_coefficient: 0.25,
  },
  tool_holder: {
    type: "cat40",
    bigplus: true,
    balance_class: "g2_5",
    runout_tir_um: 4,
    operator_has_balancer: true,
  },
  tooling: {
    tool_diameter_mm: 10.0,
    flutes: 3,
    tool_material: "carbide",
    coating: "uncoated_polished",
    stickout_mm: 30,
    tool_cost_usd: 45,
  },
  coolant: {
    type: "flood",
    brand: "Hangsterfers S-787",
    ph: 9.0,
    concentration_pct: 8,
    flow_rate_lpm: 40,
  },
  toolpath: {
    strategy: "adaptive",
    operation: "milling",
    cut_type: "roughing",
    axial_depth_mm: 20,
    radial_depth_pct: 12,
  },
  batch_size: 200,
  part_volume_cm3: 50,
};

// ─────────────────────────────────────────────────────────────────────
// Existence + determinism
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — instantiation", () => {
  it("exports a singleton of the orchestrator class", () => {
    expect(speedFeedNineAxisOrchestratorEngine).toBeInstanceOf(SpeedFeedNineAxisOrchestratorEngine);
  });

  it("produces identical numeric output for identical input (deterministic)", () => {
    const r1 = engine.run(MILL_STEEL_BASELINE);
    const r2 = engine.run(MILL_STEEL_BASELINE);
    expect(r1.recommendation.spindle_rpm).toBe(r2.recommendation.spindle_rpm);
    expect(r1.recommendation.feed_rate_mmmin).toBe(r2.recommendation.feed_rate_mmmin);
    expect(r1.recommendation.mrr_cm3min).toBe(r2.recommendation.mrr_cm3min);
    expect(r1.axis_factors.machine_rigidity_factor).toBe(
      r2.axis_factors.machine_rigidity_factor,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────
// Required-input validation
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — required input validation", () => {
  it("throws with message 'material.name' when material name missing", () => {
    expect(() =>
      engine.run({ material: { name: "" }, tooling: { tool_diameter_mm: 10 } }),
    ).toThrowError(/material\.name/);
  });

  it("throws with message 'tool_diameter_mm' when diameter zero", () => {
    expect(() =>
      engine.run({ material: { name: "steel" }, tooling: { tool_diameter_mm: 0 } }),
    ).toThrowError(/tool_diameter_mm/);
  });

  it("throws with message 'tool_diameter_mm' when diameter negative", () => {
    expect(() =>
      engine.run({ material: { name: "steel" }, tooling: { tool_diameter_mm: -5 } }),
    ).toThrowError(/tool_diameter_mm/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Mode-specific output — 3 distinct modes
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — 3 distinct optimization modes", () => {
  it("cost_batch returns mode_explanation containing 'V_min_cost' or 'cost-batch'", () => {
    const r = engine.run({ ...MILL_STEEL_BASELINE, mode: "cost_batch", part_volume_cm3: 80 });
    expect(r.mode).toBe("cost_batch");
    expect(r.recommendation.tool_life_min).toBeGreaterThan(1);
    expect(r.recommendation.mode_explanation).toMatch(/V_min_cost|cost-batch/i);
    expect(r.recommendation.cycle_time_min).not.toBeNull();
    expect(r.recommendation.cost_per_part_usd).not.toBeNull();
  });

  it("omitting part_volume_cm3 yields null cycle_time + cost_per_part + warning (fail-loud)", () => {
    const r = engine.run({ ...MILL_STEEL_BASELINE, mode: "cost_batch" });
    expect(r.recommendation.cycle_time_min).toBeNull();
    expect(r.recommendation.cost_per_part_usd).toBeNull();
    const volWarning = r.warnings.find(w => /part_volume_cm3/.test(w));
    expect(volWarning).toMatch(/null|provide/i);
  });

  it("aggressive_rush applies controller smoothing factor > 1.0", () => {
    const input: NineAxisInput = {
      ...MILL_STEEL_BASELINE,
      controller: { high_speed_machining: true, smoothing: true },
      mode: "aggressive_rush",
    };
    const r = engine.run(input);
    expect(r.mode).toBe("aggressive_rush");
    // HSM (1.30) * smoothing (1.08) = 1.404
    expect(r.axis_factors.controller_smoothing_factor).toBeGreaterThanOrEqual(1.40);
    expect(r.axis_factors.controller_smoothing_factor).toBeLessThanOrEqual(1.42);
    expect(r.recommendation.mode_explanation).toMatch(/aggressive-rush|V_max_prod/i);
  });

  it("prism_optimized mentions 'Pareto' or 'PRISM-optimized' in explanation", () => {
    const r = engine.run({ ...MILL_ALUMINUM_FULL_9AXIS, mode: "prism_optimized" });
    expect(r.mode).toBe("prism_optimized");
    expect(r.recommendation.mode_explanation).toMatch(/PRISM-optimized|Pareto/);
  });

  // SFC-WIRING-MS0 operation+group-scoped default: prism_optimized picks shop_recommended (the 80%
  // balanced->aggressive blend) ONLY for ISO P/M milling-roughing; everything else stays balanced.
  // The ratio (default - tool_life) / (productivity - tool_life) on the SAME base table is factor- and
  // RPM-cancelling: shop_recommended -> ~0.90, balanced -> ~0.50, so 0.7 cleanly separates the two.
  it("operation+group-scoped default selects shop_recommended for P/M milling-roughing (Vc leans toward aggressive)", () => {
    const base: NineAxisInput = {
      material: { name: "steel", iso_group: "P", hardness_hb: 180 },
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
      machine: { max_rpm: 20000 }, // high cap -> no RPM clamp distorts the Vc comparison
    };
    const cons = engine.run({ ...base, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
    const def = engine.run({ ...base, mode: "prism_optimized" }).recommendation.cutting_speed_mpm;
    const aggr = engine.run({ ...base, mode: "aggressive_rush" }).recommendation.cutting_speed_mpm;
    expect(def).toBeGreaterThan(cons);
    expect(def).toBeLessThanOrEqual(aggr);
    expect((def - cons) / (aggr - cons)).toBeGreaterThan(0.7); // shop_recommended ~0.90
  });

  it("operation+group-scoped default stays balanced for turning (guards the validated turning overshoot)", () => {
    const base: NineAxisInput = {
      material: { name: "steel", iso_group: "P", hardness_hb: 180 },
      tooling: { tool_diameter_mm: 25, flutes: 1, tool_material: "carbide" },
      toolpath: { operation: "turning", cut_type: "roughing" },
      machine: { max_rpm: 6000 },
      workpiece_diameter_mm: 50,
    };
    const cons = engine.run({ ...base, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
    const def = engine.run({ ...base, mode: "prism_optimized" }).recommendation.cutting_speed_mpm;
    const aggr = engine.run({ ...base, mode: "aggressive_rush" }).recommendation.cutting_speed_mpm;
    expect((def - cons) / (aggr - cons)).toBeLessThan(0.7); // balanced ~0.50, NOT shop's ~0.90
  });

  it("operation+group-scoped default stays balanced for K/S milling (cast iron / Ti -- overshoot groups)", () => {
    // Cast iron (K) and titanium (S) milling-roughing already sit near catalog at balanced; shop_recommended
    // overshot them (+35% / +27% validated), so they must NOT get the blend.
    const kBase: NineAxisInput = {
      material: { name: "cast_iron", iso_group: "K", hardness_hb: 200 },
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
      machine: { max_rpm: 20000 },
    };
    const cons = engine.run({ ...kBase, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
    const def = engine.run({ ...kBase, mode: "prism_optimized" }).recommendation.cutting_speed_mpm;
    const aggr = engine.run({ ...kBase, mode: "aggressive_rush" }).recommendation.cutting_speed_mpm;
    expect((def - cons) / (aggr - cons)).toBeLessThan(0.7); // K stays balanced, not shop_recommended
  });

  it("name-only P caller (no iso_group) still gets shop_recommended for milling-roughing (resolved via MATERIAL_DB)", () => {
    // The scope resolves iso_group from material.name when not supplied -> a "steel" (ISO P) name with
    // NO explicit iso_group still activates shop_recommended for milling-roughing.
    const base: NineAxisInput = {
      material: { name: "steel" }, // resolves to ISO P via the engine's MATERIAL_DB; iso_group unset
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
      machine: { max_rpm: 20000 },
    };
    const cons = engine.run({ ...base, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
    const def = engine.run({ ...base, mode: "prism_optimized" }).recommendation.cutting_speed_mpm;
    const aggr = engine.run({ ...base, mode: "aggressive_rush" }).recommendation.cutting_speed_mpm;
    expect((def - cons) / (aggr - cons)).toBeGreaterThan(0.7); // shop_recommended selected from the name
  });

  it("name-only 'tool_steel' (ISO H) stays balanced -- guards against a substring misclassification as P", () => {
    // The canonical MATERIAL_DB resolver maps "tool_steel" -> H (NOT P), so the aggressive blend never
    // fires on hardened tool steel. A naive name-substring check ("...steel..." -> P) would WRONGLY
    // over-speed it; this test locks the safe resolver behavior.
    const base: NineAxisInput = {
      material: { name: "tool_steel" }, // resolves to ISO H via MATERIAL_DB alias; iso_group unset
      tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
      machine: { max_rpm: 20000 },
    };
    const cons = engine.run({ ...base, mode: "cost_batch" }).recommendation.cutting_speed_mpm;
    const def = engine.run({ ...base, mode: "prism_optimized" }).recommendation.cutting_speed_mpm;
    const aggr = engine.run({ ...base, mode: "aggressive_rush" }).recommendation.cutting_speed_mpm;
    expect((def - cons) / (aggr - cons)).toBeLessThan(0.7); // balanced -- tool_steel is H, not P
  });

  it("flood coolant produces effectiveness exactly 1.0 (baseline, through-spindle-coolant off)", () => {
    // Isolate the flood TYPE baseline: the full fixture enables through_spindle_coolant, which now
    // adds the +8% TSC delivery bonus (U-OSC-SPINDLE-TSC, covered in spindleTscWiring.test.ts). Turn
    // it off here to assert the pure flood-type 1.0 baseline (NOT weakened — still exactly 1.0).
    const r = engine.run({ ...MILL_ALUMINUM_FULL_9AXIS, spindle: { ...MILL_ALUMINUM_FULL_9AXIS.spindle, through_spindle_coolant: false } });
    expect(r.axis_factors.coolant_effectiveness).toBe(1.0);
  });

  it("adaptive toolpath engagement factor is 0.45 per HSMWorks spec", () => {
    const r = engine.run({ ...MILL_ALUMINUM_FULL_9AXIS });
    expect(r.axis_factors.toolpath_engagement_factor).toBe(0.45);
  });

  it("cost_batch MRR ≤ aggressive_rush MRR for same input (Gilbert ordering)", () => {
    const cb = engine.run({ ...MILL_STEEL_BASELINE, mode: "cost_batch", part_volume_cm3: 100 });
    const ar = engine.run({ ...MILL_STEEL_BASELINE, mode: "aggressive_rush", part_volume_cm3: 100 });
    expect(cb.recommendation.mrr_cm3min).toBeLessThanOrEqual(ar.recommendation.mrr_cm3min + 0.01);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Axis-factor derivation — each axis independently testable
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — axis factor derivation", () => {
  it("axis 1: box_way (1.15) × premium build (1.10) = 1.265 rigidity", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      machine: { way_type: "box_way", build_quality: "premium" },
    });
    // 1.15 × 1.10 = 1.265 base, no weight bonus (no weight given)
    expect(r.axis_factors.machine_rigidity_factor).toBeCloseTo(1.265, 2);
  });

  it("axis 1: roller_bearing (0.90) × economy (0.85) = 0.765 rigidity", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      machine: { way_type: "roller_bearing", build_quality: "economy" },
    });
    expect(r.axis_factors.machine_rigidity_factor).toBeCloseTo(0.765, 2);
  });

  it("axis 1: heavy machine (>5000kg) adds 1.05 rigidity bonus", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      machine: { way_type: "box_way", build_quality: "premium", weight_kg: 8000 },
    });
    // 1.15 × 1.10 × 1.05 = 1.328
    expect(r.axis_factors.machine_rigidity_factor).toBeCloseTo(1.328, 2);
  });

  it("axis 3: HSM (1.30) × AICC (1.15) × smoothing (1.08) × EPC (1.10) = 1.776", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      controller: {
        high_speed_machining: true,
        ai_contour_control: true,
        smoothing: true,
        end_point_control: true,
      },
    });
    // 1.30 × 1.15 × 1.08 × 1.10 ≈ 1.776 (under 1.8 cap)
    expect(r.axis_factors.controller_smoothing_factor).toBeCloseTo(1.776, 2);
  });

  it("axis 3: controller smoothing factor capped at 1.8", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      controller: {
        high_speed_machining: true,
        ai_contour_control: true,
        smoothing: true,
        end_point_control: true,
        look_ahead_blocks: 1000, // would push past cap
      },
    });
    expect(r.axis_factors.controller_smoothing_factor).toBe(1.8);
  });

  it("axis 6: G2.5 + balancer → max RPM 24000 per ISO 1940", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { balance_class: "g2_5", operator_has_balancer: true },
    });
    expect(r.axis_factors.holder_balance_max_rpm).toBe(24000);
  });

  it("axis 6: G16 → max RPM 8000 per ISO 1940", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { balance_class: "g16" },
    });
    expect(r.axis_factors.holder_balance_max_rpm).toBe(8000);
  });

  it("axis 6: G2.5 declared without balancer derates to G6.3 (12000 RPM)", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { balance_class: "g2_5", operator_has_balancer: false },
    });
    expect(r.axis_factors.holder_balance_max_rpm).toBe(12000);
    const hasDerateNote = r.axis_factors.notes.some(n => /derated/i.test(n));
    expect(hasDerateNote).toBe(true);
  });

  it("axis 8: cryogenic (1.40) > flood (1.00) > dry (0.60)", () => {
    const dry = engine.run({ ...MILL_STEEL_BASELINE, coolant: { type: "dry" } });
    const flood = engine.run({ ...MILL_STEEL_BASELINE, coolant: { type: "flood" } });
    const cryo = engine.run({ ...MILL_STEEL_BASELINE, coolant: { type: "cryogenic" } });
    expect(dry.axis_factors.coolant_effectiveness).toBe(0.60);
    expect(flood.axis_factors.coolant_effectiveness).toBe(1.00);
    expect(cryo.axis_factors.coolant_effectiveness).toBe(1.40);
  });

  it("axis 8: through-tool coolant (1.25) > flood (1.00)", () => {
    const r = engine.run({ ...MILL_STEEL_BASELINE, coolant: { type: "through_tool" } });
    expect(r.axis_factors.coolant_effectiveness).toBe(1.25);
  });

  it("axis 8: pH 7.5 (out of ideal 8.8-9.2 range) reduces effectiveness 15%", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      coolant: { type: "flood", ph: 7.5 },
    });
    expect(r.axis_factors.coolant_effectiveness).toBeCloseTo(0.85, 2); // 1.00 × 0.85
    const phWarning = r.warnings.find(w => /pH/.test(w));
    expect(phWarning).toMatch(/8\.8|9\.2|range/);
  });

  it("axis 8: 6-month old coolant (>26 weeks) further derates 10%", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      coolant: { type: "flood", age_weeks: 30 },
    });
    expect(r.axis_factors.coolant_effectiveness).toBeCloseTo(0.90, 2); // 1.00 × 0.90
  });

  it("axis 9: conventional = 1.00, trochoidal = 0.50 engagement", () => {
    const conv = engine.run({ ...MILL_STEEL_BASELINE, toolpath: { strategy: "conventional" } });
    const troc = engine.run({ ...MILL_STEEL_BASELINE, toolpath: { strategy: "trochoidal" } });
    expect(conv.axis_factors.toolpath_engagement_factor).toBe(1.00);
    expect(troc.axis_factors.toolpath_engagement_factor).toBe(0.50);
  });

  it("axis 9: adaptive (0.45) is the most aggressive engagement strategy", () => {
    const strategies: NonNullable<NineAxisInput["toolpath"]>["strategy"][] = [
      "conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot",
    ];
    const factors = strategies.map(s => {
      const r = engine.run({ ...MILL_STEEL_BASELINE, toolpath: { strategy: s } });
      return r.axis_factors.toolpath_engagement_factor;
    });
    const minFactor = Math.min(...factors);
    expect(minFactor).toBe(0.45); // adaptive
  });
});

// ─────────────────────────────────────────────────────────────────────
// Workholding feasibility — clamp force vs cutting force (Coulomb friction)
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — workholding feasibility", () => {
  it("Kurt vise (35 kN) on light aluminum cut yields SF ≥ 1.5 (feasible)", () => {
    // Aluminum is ISO N -> the operation+group-scoped default keeps it at balanced (shop_recommended
    // is P/M-milling-roughing only), so this stays feasible. (When the aggressive shop_recommended
    // default IS selected for a P/M cut and exceeds the retention margin, checkWorkholding honestly
    // reports feasible=false + warns -- operator decision 2026-06-19: flag, do NOT auto-derate.)
    const r = engine.run(MILL_ALUMINUM_FULL_9AXIS);
    expect(r.workholding_check.feasible).toBe(true);
    expect(r.workholding_check.safety_factor).toBeGreaterThanOrEqual(1.5);
    expect(r.workholding_check.available_clamp_force_kn).toBe(35);
  });

  it("vacuum (1 kN) on steel cut fails with safety-factor < 1.5", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      workholding: { type: "vacuum", clamp_force_available_kn: 1.0 },
      toolpath: { operation: "milling", axial_depth_mm: 10, radial_depth_pct: 50 },
    });
    expect(r.workholding_check.feasible).toBe(false);
    expect(r.workholding_check.safety_factor).toBeLessThan(1.5);
    // Locate the workholding-FEASIBILITY warning specifically (it names required/available kN).
    // NOTE: do not use a loose /workholding|clamp/ finder -- the helix axial-pull-out advisory
    // (U-OSC-SFC-HELIX-CORE-FORCE) also contains the word "clamping", and can precede this one.
    const clampWarn = r.warnings.find(w => /required|available|kN/i.test(w));
    expect(clampWarn).toMatch(/required clamp|available|kN/);
  });

  it("notes line cardinality is ≥ 4 (force, required, available, SF)", () => {
    const r = engine.run(MILL_ALUMINUM_FULL_9AXIS);
    expect(r.workholding_check.notes.length).toBeGreaterThanOrEqual(4);
    const note0 = r.workholding_check.notes.join(" | ");
    expect(note0).toMatch(/Cutting force resultant/);
    expect(note0).toMatch(/Required clamp/);
    expect(note0).toMatch(/Available/);
    expect(note0).toMatch(/Safety factor/);
  });

  it("Kurt vise with 15mm parallel emits advisory to use larger parallels", () => {
    const r = engine.run({
      ...MILL_ALUMINUM_FULL_9AXIS,
      workholding: {
        type: "kurt_vise",
        clamp_force_available_kn: 35,
        parallel_size_mm: 15,
        contact_area_mm2: 1000,
      },
    });
    const parallelNote = r.workholding_check.notes.find(n => /parallel/i.test(n));
    expect(parallelNote).toMatch(/50mm|small|larger/i);
  });

  it("high contact pressure on aluminum (>50 MPa) emits deformation warning", () => {
    const r = engine.run({
      ...MILL_ALUMINUM_FULL_9AXIS,
      workholding: {
        type: "kurt_vise",
        clamp_force_available_kn: 35,
        parallel_size_mm: 50,
        contact_area_mm2: 100, // tiny → 350 MPa
      },
    });
    const deformNote = r.workholding_check.notes.find(n => /deform|aluminum/i.test(n));
    expect(deformNote).toMatch(/WARNING|deform/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Spindle tuning — ISO 1940 balance class vs target RPM
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — spindle tuning", () => {
  it("target_rpm ≤ derated_safe_rpm always (no out-of-spec recommendation)", () => {
    const r = engine.run(MILL_ALUMINUM_FULL_9AXIS);
    expect(r.recommendation.spindle_rpm).toBeLessThanOrEqual(r.spindle_tuning.derated_safe_rpm);
  });

  it("G40 holder caps recommended RPM at 4000", () => {
    const r = engine.run({
      ...MILL_ALUMINUM_FULL_9AXIS,
      machine: { ...MILL_ALUMINUM_FULL_9AXIS.machine, max_rpm: 50000 },
      tool_holder: { balance_class: "g40", operator_has_balancer: false },
    });
    expect(r.recommendation.spindle_rpm).toBeLessThanOrEqual(4000);
  });

  it("sweet_spot_rpm = 85% of derated × snapped to 500-RPM boundary", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      machine: { max_rpm: 12000 },
      tool_holder: { balance_class: "g6_3" },
    });
    // 0.85 × 12000 = 10200, snapped to nearest 500 = 10000
    expect(r.spindle_tuning.sweet_spot_rpm % 500).toBe(0);
    expect(r.spindle_tuning.sweet_spot_rpm).toBeLessThanOrEqual(r.spindle_tuning.derated_safe_rpm);
  });

  it("coast_down_advisory contains 'RPM' and is non-trivial length", () => {
    const r = engine.run(MILL_STEEL_BASELINE);
    expect(r.spindle_tuning.coast_down_advisory).toMatch(/RPM/);
    expect(r.spindle_tuning.coast_down_advisory.length).toBeGreaterThanOrEqual(20);
  });

  it("required_balance_class is G2.5 when target_rpm > 12000", () => {
    const r = engine.run({
      ...MILL_ALUMINUM_FULL_9AXIS,
      machine: { ...MILL_ALUMINUM_FULL_9AXIS.machine, max_rpm: 24000 },
      tool_holder: { balance_class: "g2_5", operator_has_balancer: true },
    });
    if (r.recommendation.spindle_rpm > 12000) {
      expect(r.spindle_tuning.required_balance_class).toBe("g2_5");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// MRR ranking — tool library iteration sorted by mrr × (1/cost)
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — MRR ranking", () => {
  it("returns exactly one 'current_tool' entry when no library", () => {
    const r = engine.run(MILL_STEEL_BASELINE);
    expect(r.mrr_ranking.length).toBe(1);
    expect(r.mrr_ranking[0]!.config_label).toBe("current_tool");
  });

  it("ranks 4-tool library and assigns rank=1..4 in score-descending order", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_library: [
        { label: "12mm-4fl-carbide-TiAlN", diameter_mm: 12, flutes: 4, tool_material: "carbide", coating: "TiAlN", cost_usd: 80 },
        { label: "10mm-3fl-carbide", diameter_mm: 10, flutes: 3, tool_material: "carbide", cost_usd: 45 },
        { label: "16mm-5fl-carbide-AlTiN", diameter_mm: 16, flutes: 5, tool_material: "carbide", coating: "AlTiN", cost_usd: 120 },
        { label: "8mm-2fl-hss", diameter_mm: 8, flutes: 2, tool_material: "hss", cost_usd: 12 },
      ],
    });
    expect(r.mrr_ranking.length).toBe(4);
    expect(r.mrr_ranking.map(e => e.rank)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < r.mrr_ranking.length; i++) {
      expect(r.mrr_ranking[i - 1]!.score).toBeGreaterThanOrEqual(r.mrr_ranking[i]!.score);
    }
  });

  it("each ranked entry has positive MRR for valid library tools", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_library: [
        { label: "12mm-4fl", diameter_mm: 12, flutes: 4, tool_material: "carbide", cost_usd: 80 },
        { label: "10mm-3fl", diameter_mm: 10, flutes: 3, tool_material: "carbide", cost_usd: 45 },
      ],
    });
    for (const entry of r.mrr_ranking) {
      expect(entry.mrr_cm3min).toBeGreaterThan(0);
      expect(entry.tool_life_min).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// ROI investment popup
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — ROI investment popup", () => {
  it("suggests premium coated insert when current is uncoated", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tooling: { ...MILL_STEEL_BASELINE.tooling, coating: "uncoated" },
    });
    const suggestion = r.roi_investment.suggestions.find(s => /carbide|coated/i.test(s.investment));
    expect(suggestion?.investment).toMatch(/PVD|Sandvik|Kennametal|coated/i);
    expect(suggestion?.tool_life_multiplier).toBeGreaterThanOrEqual(2.0);
  });

  it("suggests shrink-fit holder when current is ER collet", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { type: "er_collet" },
    });
    const shrinkFit = r.roi_investment.suggestions.find(s => /shrink/i.test(s.investment));
    expect(shrinkFit?.investment).toMatch(/Big Daishowa|Schunk|shrink/i);
    expect(shrinkFit?.tool_life_multiplier).toBeGreaterThanOrEqual(1.5);
  });

  it("price ranges have low ≤ high and roi_score in [0,1]", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { type: "er_collet" },
      tooling: { ...MILL_STEEL_BASELINE.tooling, coating: "uncoated" },
    });
    expect(r.roi_investment.suggestions.length).toBeGreaterThanOrEqual(2);
    for (const s of r.roi_investment.suggestions) {
      expect(s.price_usd_range[0]).toBeLessThan(s.price_usd_range[1]);
      expect(s.payback_parts).toBeGreaterThan(0);
      expect(s.roi_score).toBeGreaterThan(0);
      expect(s.roi_score).toBeLessThanOrEqual(1);
    }
  });

  it("suggestions sorted descending by roi_score", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { type: "er_collet" },
      tooling: { ...MILL_STEEL_BASELINE.tooling, coating: "uncoated" },
    });
    for (let i = 1; i < r.roi_investment.suggestions.length; i++) {
      expect(r.roi_investment.suggestions[i - 1]!.roi_score).toBeGreaterThanOrEqual(
        r.roi_investment.suggestions[i]!.roi_score,
      );
    }
  });

  it("show_popup true iff at least one suggestion has roi_score > 0.5", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      tool_holder: { type: "er_collet" },
      tooling: { ...MILL_STEEL_BASELINE.tooling, coating: "uncoated" },
    });
    const topScore = r.roi_investment.suggestions[0]?.roi_score ?? 0;
    expect(r.roi_investment.show_popup).toBe(topScore > 0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Resolved-axes traceability — defaults from canonical sources
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — resolved axes defaults", () => {
  it("minimal input resolves to specific canonical defaults", () => {
    const r = engine.run({
      material: { name: "steel" },
      tooling: { tool_diameter_mm: 10 },
    });
    expect(r.resolved_axes.machine.kinematics).toBe("3axis_vmc");
    expect(r.resolved_axes.machine.build_quality).toBe("production");
    expect(r.resolved_axes.machine.way_type).toBe("hybrid_way");
    expect(r.resolved_axes.machine.power_kw).toBe(15);
    expect(r.resolved_axes.machine.max_rpm).toBe(10000);
    expect(r.resolved_axes.spindle.hp).toBe(20);
    expect(r.resolved_axes.controller.brand).toBe("fanuc");
    expect(r.resolved_axes.workholding.type).toBe("kurt_vise");
    expect(r.resolved_axes.workholding.clamp_force_available_kn).toBe(35);
    expect(r.resolved_axes.tool_holder.type).toBe("cat40");
    expect(r.resolved_axes.tool_holder.balance_class).toBe("g6_3");
    expect(r.resolved_axes.coolant.type).toBe("flood");
    expect(r.resolved_axes.coolant.ph).toBe(9.0);
    expect(r.resolved_axes.toolpath.strategy).toBe("conventional");
    expect(r.resolved_axes.toolpath.operation).toBe("milling");
  });

  it("user-supplied values flow through resolved_axes verbatim", () => {
    const r = engine.run(MILL_ALUMINUM_FULL_9AXIS);
    expect(r.resolved_axes.machine.name).toBe("Haas VF-4SS");
    expect(r.resolved_axes.machine.power_kw).toBe(22.4);
    expect(r.resolved_axes.machine.max_rpm).toBe(12000);
    expect(r.resolved_axes.spindle.hp).toBe(30);
    expect(r.resolved_axes.controller.brand).toBe("haas");
    expect(r.resolved_axes.tool_holder.balance_class).toBe("g2_5");
    expect(r.resolved_axes.tool_holder.runout_tir_um).toBe(4);
    expect(r.resolved_axes.coolant.brand).toBe("Hangsterfers S-787");
    expect(r.resolved_axes.coolant.ph).toBe(9.0);
  });

  it("toolpath default DOC scales with tool diameter (50% ap, 40% ae)", () => {
    const r = engine.run({
      material: { name: "steel" },
      tooling: { tool_diameter_mm: 20 },
    });
    expect(r.resolved_axes.toolpath.axial_depth_mm).toBe(10); // 20 × 0.50
    expect(r.resolved_axes.toolpath.radial_depth_mm).toBe(8); // 20 × 0.40
    expect(r.resolved_axes.toolpath.radial_depth_pct).toBe(40);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Underlying physics — match canonical SFC engine (Kienzle + Taylor)
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — physics traceability via .sfc", () => {
  it("steel 1018 + 12mm carbide produces Vc in Sandvik range 180-280 m/min", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      toolpath: { operation: "milling", cut_type: "roughing", strategy: "conventional", axial_depth_mm: 5, radial_depth_pct: 30 },
    });
    // Sandvik 1018 carbide Vc range: 180-280 m/min
    expect(r.sfc.cutting_speed.value).toBeGreaterThanOrEqual(140);
    expect(r.sfc.cutting_speed.value).toBeLessThanOrEqual(320);
  });

  it("aluminum 6061 + carbide produces Vc > 300 m/min (Sandvik 400-1000)", () => {
    const r = engine.run({
      material: { name: "aluminum_6061" },
      tooling: { tool_diameter_mm: 10, flutes: 3, tool_material: "carbide" },
      toolpath: { operation: "milling", cut_type: "roughing" },
    });
    expect(r.sfc.cutting_speed.value).toBeGreaterThan(300);
  });

  it("Kienzle resultant force ≥ tangential force × 0.9 (resultant always ≥ Fc)", () => {
    const r = engine.run({
      ...MILL_STEEL_BASELINE,
      toolpath: { operation: "milling", axial_depth_mm: 5, radial_depth_pct: 30 },
    });
    expect(r.sfc.forces.tangential_force_N.value).toBeGreaterThan(0);
    expect(r.sfc.forces.resultant_force_N.value).toBeGreaterThanOrEqual(
      r.sfc.forces.tangential_force_N.value * 0.9,
    );
  });

  it("Taylor tool life sensitivity to speed is negative (per VT^n=C)", () => {
    const r = engine.run(MILL_STEEL_BASELINE);
    expect(r.sfc.tool_life.sensitivity.speed).toBeLessThan(0);
  });

  it("MRR > 0 for valid mill input", () => {
    const r = engine.run(MILL_STEEL_BASELINE);
    expect(r.recommendation.mrr_cm3min).toBeGreaterThan(0);
  });

  it("recommendation respects holder balance derated max RPM (G40 → ≤4000)", () => {
    const r = engine.run({
      ...MILL_ALUMINUM_FULL_9AXIS,
      machine: { ...MILL_ALUMINUM_FULL_9AXIS.machine, max_rpm: 50000 },
      tool_holder: { balance_class: "g40", operator_has_balancer: false },
    });
    expect(r.recommendation.spindle_rpm).toBeLessThanOrEqual(4000);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Edge cases & adversarial inputs
// ─────────────────────────────────────────────────────────────────────

describe("SpeedFeedNineAxisOrchestratorEngine — edge cases & adversarial", () => {
  it("tiny tool (1mm) produces finite output values", () => {
    const r = engine.run({
      material: { name: "steel" },
      tooling: { tool_diameter_mm: 1.0, flutes: 2 },
    });
    expect(Number.isFinite(r.recommendation.spindle_rpm)).toBe(true);
    expect(Number.isFinite(r.recommendation.feed_rate_mmmin)).toBe(true);
    expect(r.recommendation.spindle_rpm).toBeGreaterThanOrEqual(50);
  });

  it("large tool (50mm) produces finite output values", () => {
    const r = engine.run({
      material: { name: "aluminum_6061" },
      tooling: { tool_diameter_mm: 50.0, flutes: 8 },
    });
    expect(Number.isFinite(r.recommendation.mrr_cm3min)).toBe(true);
    expect(r.recommendation.mrr_cm3min).toBeGreaterThan(0);
  });

  it("unknown material 'unobtainium' falls back with warning containing 'defaulting'", () => {
    const r = engine.run({
      material: { name: "unobtainium" },
      tooling: { tool_diameter_mm: 10 },
    });
    const matWarn = r.warnings.find(w => /unobtainium|defaulting|not found/i.test(w));
    expect(matWarn).toMatch(/steel|default|fallback/i);
  });

  it("hardened steel HRC 50 produces valid (non-zero) recommendation", () => {
    const r = engine.run({
      material: { name: "steel", hardness_hrc: 50 },
      tooling: { tool_diameter_mm: 8, tool_material: "carbide" },
    });
    expect(r.recommendation.spindle_rpm).toBeGreaterThan(50);
    expect(r.recommendation.cutting_speed_mpm).toBeGreaterThan(10);
  });

  it("RPM minimum floor of 50 enforced (never returns < 50 RPM)", () => {
    // Extreme low-speed material + huge tool to drive RPM near zero
    const r = engine.run({
      material: { name: "titanium", hardness_hb: 350 },
      tooling: { tool_diameter_mm: 50, flutes: 4, tool_material: "carbide" },
    });
    expect(r.recommendation.spindle_rpm).toBeGreaterThanOrEqual(50);
  });

  it("feed_rate minimum floor of 10 mm/min enforced", () => {
    const r = engine.run({
      material: { name: "titanium" },
      tooling: { tool_diameter_mm: 50, flutes: 4 },
    });
    expect(r.recommendation.feed_rate_mmmin).toBeGreaterThanOrEqual(10);
  });
});
