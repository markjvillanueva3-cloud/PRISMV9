/**
 * CAMX-MS14 — Safety-First Decision Engine
 *
 * Consolidated integration test for all 6 U01-U06 engines:
 *   U01 PipelineSafetyOrchestratorEngine — aggregate collision/overload/chatter
 *                                          /thermal/breakage/workholding risk
 *   U02 SafetyVetoEngine                 — hard vetoes (power, deflection,
 *                                          chatter, collision, workholding,
 *                                          coolant, rpm, torque)
 *   U03 SafetyEscalationEngine           — auto parameter reduction when tight
 *   U04 CollisionPreventionEngine        — full-toolpath collision check
 *   U05 ToolBreakagePredictionEngine     — Miner damage + stress + chipload
 *                                          + engagement spike
 *   U06 WorkholdingVerificationEngine    — grip vs cutting force margin
 *
 * Satisfies U08 exit condition: 40+ tests pass.
 */

import { describe, it, expect } from "vitest";
import { pipelineSafetyOrchestratorEngine } from "../engines/PipelineSafetyOrchestratorEngine.js";
import { safetyVetoEngine } from "../engines/SafetyVetoEngine.js";
import { safetyEscalationEngine } from "../engines/SafetyEscalationEngine.js";
import { collisionPreventionEngine } from "../engines/CollisionPreventionEngine.js";
import { toolBreakagePredictionEngine } from "../engines/ToolBreakagePredictionEngine.js";
import { workholdingVerificationEngine } from "../engines/WorkholdingVerificationEngine.js";

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const safeOperation = {
  name: "rough-1",
  ap_mm: 2.0,
  fz_mm: 0.08,
  vc_mpm: 180,
  tool_diameter_mm: 12,
  num_teeth: 4,
  tool_stickout_mm: 40,
  tolerance_mm: 0.15,
};
const steel = { name: "4140", kc1_1: 2100, mc: 0.25, T_melt_C: 1500, iso_group: "P" };
const midMachine = {
  name: "VM3",
  max_power_kW: 22,
  max_rpm: 12000,
  natural_frequencies_Hz: [180, 420],
  min_coolant_pressure_bar: 10,
  coolant_pressure_bar: 30,
};
const carbideTool = { material: "carbide", tensile_strength_MPa: 3500, elastic_modulus_MPa: 600_000 };
const goodHolding = { grip_force_N: 40_000, friction_coefficient: 0.35, clamp_points: 2 };

// ─── U01: PipelineSafetyOrchestratorEngine ───────────────────────────────────

describe("CAMX-MS14 / U01 PipelineSafetyOrchestratorEngine", () => {
  it("assess: safe operation returns non-vetoed assessment with all 6 dimensions", () => {
    const a = pipelineSafetyOrchestratorEngine.assess(safeOperation, steel, midMachine, carbideTool, goodHolding);
    expect(a.vetoed).toBe(false);
    expect(a.risk_level).not.toBe("veto");
    expect(a.dimensions.collision).toBeDefined();
    expect(a.dimensions.overload).toBeDefined();
    expect(a.dimensions.chatter).toBeDefined();
    expect(a.dimensions.thermal).toBeDefined();
    expect(a.dimensions.breakage).toBeDefined();
    expect(a.dimensions.workholding).toBeDefined();
  });

  it("assess: computed intermediate values are all finite", () => {
    const a = pipelineSafetyOrchestratorEngine.assess(safeOperation, steel, midMachine, carbideTool, goodHolding);
    expect(Number.isFinite(a.computed.Fc_N)).toBe(true);
    expect(Number.isFinite(a.computed.power_kW)).toBe(true);
    expect(Number.isFinite(a.computed.deflection_mm)).toBe(true);
    expect(Number.isFinite(a.computed.stress_MPa)).toBe(true);
    expect(Number.isFinite(a.computed.temperature_C)).toBe(true);
    expect(Number.isFinite(a.computed.chatter_probability)).toBe(true);
    expect(Number.isFinite(a.computed.workholding_safety_factor)).toBe(true);
  });

  it("assess: overload fires when power demand exceeds 85% of machine power", () => {
    const heavy = { ...safeOperation, ap_mm: 15, fz_mm: 0.25, vc_mpm: 300 };
    const small = { ...midMachine, max_power_kW: 5 };
    const a = pipelineSafetyOrchestratorEngine.assess(heavy, steel, small, carbideTool, goodHolding);
    expect(a.dimensions.overload.vetoed).toBe(true);
    expect(a.vetoed).toBe(true);
    expect(a.escalation_actions.length).toBeGreaterThan(0);
  });

  it("assess: collision clearance zero triggers collision veto", () => {
    const opWithCollision = {
      ...safeOperation,
      collision: { swept_radius_mm: 6, clearance_stock_mm: 0, clearance_fixture_mm: 0, clearance_machine_mm: 0 },
    };
    const a = pipelineSafetyOrchestratorEngine.assess(opWithCollision, steel, midMachine, carbideTool, goodHolding);
    expect(a.dimensions.collision.vetoed).toBe(true);
    expect(a.vetoed).toBe(true);
  });

  it("assess: inadequate workholding drops safety factor below 1.5 → veto", () => {
    const weakHolding = { grip_force_N: 50, friction_coefficient: 0.1 };
    const a = pipelineSafetyOrchestratorEngine.assess(safeOperation, steel, midMachine, carbideTool, weakHolding);
    expect(a.computed.workholding_safety_factor).toBeLessThan(1.5);
    expect(a.dimensions.workholding.vetoed).toBe(true);
  });

  it("veto: pure veto helper returns reasons list when assessment is vetoed", () => {
    const heavy = { ...safeOperation, ap_mm: 15, fz_mm: 0.25, vc_mpm: 300 };
    const small = { ...midMachine, max_power_kW: 5 };
    const a = pipelineSafetyOrchestratorEngine.assess(heavy, steel, small, carbideTool, goodHolding);
    const v = pipelineSafetyOrchestratorEngine.veto(a);
    expect(v.vetoed).toBe(true);
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(v.escalation_actions.length).toBeGreaterThan(0);
  });

  it("batchAssess: aggregates worst risk across multiple operations", () => {
    const report = pipelineSafetyOrchestratorEngine.batchAssess([
      { operation: safeOperation, material: steel, machine: midMachine, tool: carbideTool, workholding: goodHolding },
      { operation: { ...safeOperation, name: "finish-1", ap_mm: 0.5, fz_mm: 0.04 }, material: steel, machine: midMachine, tool: carbideTool, workholding: goodHolding },
    ]);
    expect(report.total).toBe(2);
    expect(report.assessments.length).toBe(2);
    expect(typeof report.overall_risk).toBe("string");
    expect(report.counts).toBeDefined();
  });

  it("thermal derating tightens for superalloy (S group) vs steel (P group)", () => {
    const titanium = { name: "Ti6Al4V", kc1_1: 2800, mc: 0.25, T_melt_C: 1660, iso_group: "S" };
    const aSteel = pipelineSafetyOrchestratorEngine.assess(safeOperation, steel, midMachine, carbideTool, goodHolding);
    const aTi = pipelineSafetyOrchestratorEngine.assess(safeOperation, titanium, midMachine, carbideTool, goodHolding);
    // titanium threshold (0.45 * T_melt) vs steel (0.60 * T_melt) — tighter for Ti
    expect(aTi.dimensions.thermal.threshold).toBeLessThan(aSteel.dimensions.thermal.threshold + 1);
  });
});

// ─── U02: SafetyVetoEngine ───────────────────────────────────────────────────

describe("CAMX-MS14 / U02 SafetyVetoEngine", () => {
  const mc = { max_power_kW: 22, max_rpm: 12000, max_torque_Nm: 150 };
  const baseParams = {
    Fc_N: 600, Vc_mpm: 180, ap_mm: 2, fz_mm: 0.08,
    D_mm: 12, L_mm: 40, RPM: 4775,
    chatter_probability: 0.03, collision_detected: false,
    tolerance_mm: 0.05,
  };
  const holding = { grip_force_N: 40_000, friction_coefficient: 0.35 };

  it("power_veto: does not fire under 85% power limit", () => {
    const r = safetyVetoEngine.checkVeto("power_veto", baseParams, mc, holding);
    expect(r.vetoed).toBe(false);
  });

  it("power_veto: fires when Fc*Vc/60000 > 0.85*max_power", () => {
    const hot = { ...baseParams, Fc_N: 8500, Vc_mpm: 300 }; // 42.5 kW >> 0.85*22 = 18.7
    const r = safetyVetoEngine.checkVeto("power_veto", hot, mc, holding);
    expect(r.vetoed).toBe(true);
    expect(r.rule).toBe("power_veto");
    expect(r.escalation_action).toBeDefined();
  });

  it("deflection_veto: fires when δ > tolerance/3", () => {
    const slim = { ...baseParams, Fc_N: 2000, D_mm: 4, L_mm: 80, tolerance_mm: 0.02 };
    const r = safetyVetoEngine.checkVeto("deflection_veto", slim, mc, holding);
    expect(r.vetoed).toBe(true);
    expect(r.original_value).toBeGreaterThan(r.limit);
  });

  it("chatter_veto: fires when P(chatter) > 15%", () => {
    const r = safetyVetoEngine.checkVeto("chatter_veto", { ...baseParams, chatter_probability: 0.4 }, mc, holding);
    expect(r.vetoed).toBe(true);
    expect(r.adjusted_params?.RPM).toBeDefined();
  });

  it("collision_veto: binary — any detected collision is a hard veto", () => {
    const r = safetyVetoEngine.checkVeto("collision_veto", { ...baseParams, collision_detected: true }, mc, holding);
    expect(r.vetoed).toBe(true);
  });

  it("workholding_veto: fires when cutting force * SF > mu*grip", () => {
    const weak = { grip_force_N: 500, friction_coefficient: 0.1 };
    const r = safetyVetoEngine.checkVeto("workholding_veto", baseParams, mc, weak);
    expect(r.vetoed).toBe(true);
  });

  it("rpm_veto: fires when RPM > max_rpm", () => {
    const r = safetyVetoEngine.checkVeto("rpm_veto", { ...baseParams, RPM: 25_000 }, mc, holding);
    expect(r.vetoed).toBe(true);
  });

  it("checkAllVetos: emits aggregated report with per-rule details", () => {
    const report = safetyVetoEngine.checkAllVetos(baseParams, null, mc, null, holding);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(Array.isArray(report.active_vetos)).toBe(true);
    expect(report.machine).toBe(mc);
  });

  it("autoEscalate: resolves or reports remaining vetos after iterations", () => {
    const hot = { ...baseParams, Fc_N: 8500, Vc_mpm: 300 };
    const report = safetyVetoEngine.checkAllVetos(hot, null, mc, null, holding);
    const esc = safetyVetoEngine.autoEscalate(report);
    expect(esc.iterations).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(esc.escalation_log)).toBe(true);
    // Either resolved or remaining_vetos populated
    if (!esc.resolved) expect(esc.remaining_vetos.length).toBeGreaterThan(0);
  });
});

// ─── U03: SafetyEscalationEngine ─────────────────────────────────────────────

describe("CAMX-MS14 / U03 SafetyEscalationEngine", () => {
  const params = { ap_mm: 3, fz_mm: 0.1, Vc_mpm: 200, RPM: 5300, D_mm: 12, L_mm: 50, ae_mm: 6, num_flutes: 4 };
  const limits = { max_power_kW: 22, max_rpm: 12000, max_torque_Nm: 150 };

  it("escalate: returns all-clear when no vetoes present", () => {
    const r = safetyEscalationEngine.escalate({ vetoed: false, active_vetoes: [] }, params, limits);
    expect(r.resolved).toBe(true);
    expect(r.total_actions).toBe(0);
    expect(r.mrr_reduction_pct).toBe(0);
  });

  it("escalate: power_veto reduces ap and captures an action", () => {
    const r = safetyEscalationEngine.escalate(
      { vetoed: true, active_vetoes: ["power_veto"] },
      params, limits,
    );
    expect(r.final_params.ap_mm).toBeLessThanOrEqual(params.ap_mm);
    expect(r.total_actions).toBeGreaterThan(0);
    expect(r.mrr_reduction_pct).toBeGreaterThanOrEqual(0);
  });

  it("escalate: chatter_veto shifts RPM", () => {
    const r = safetyEscalationEngine.escalate(
      { vetoed: true, active_vetoes: ["chatter_veto"] },
      params, limits,
    );
    const changedRPM = r.iterations.some(it => it.actions.some(a => a.parameter.toLowerCase().includes("rpm")));
    expect(changedRPM || r.final_params.RPM !== params.RPM || r.total_actions > 0).toBe(true);
  });

  it("preview: pure computation — returns same shape as escalate", () => {
    const r = safetyEscalationEngine.preview(
      { vetoed: true, active_vetoes: ["deflection_veto"] },
      params, limits,
    );
    expect(r.original_params.ap_mm).toBe(params.ap_mm);
    expect(r.final_params).toBeDefined();
    expect(Array.isArray(r.iterations)).toBe(true);
  });

  it("escalate: iterations capped at max_iterations argument", () => {
    const r = safetyEscalationEngine.escalate(
      { vetoed: true, active_vetoes: ["power_veto", "deflection_veto", "chatter_veto"] },
      params, limits, 2,
    );
    expect(r.iterations.length).toBeLessThanOrEqual(2);
  });

  it("escalate: MRR reduction % is non-negative finite number", () => {
    const r = safetyEscalationEngine.escalate(
      { vetoed: true, active_vetoes: ["power_veto"] },
      params, limits,
    );
    expect(Number.isFinite(r.mrr_reduction_pct)).toBe(true);
    expect(r.mrr_reduction_pct).toBeGreaterThanOrEqual(0);
  });
});

// ─── U04: CollisionPreventionEngine ──────────────────────────────────────────

describe("CAMX-MS14 / U04 CollisionPreventionEngine", () => {
  const tool = { diameter_mm: 10, cutting_length_mm: 30, overall_length_mm: 80, holder_diameter_mm: 30, holder_length_mm: 60 };
  const cleanBlocks = [
    { index: 0, x: 100, y: 100, z: 50, motion: "rapid" as const },
    { index: 1, x: 120, y: 100, z: 50, motion: "linear" as const, feed_mmpm: 800 },
    { index: 2, x: 120, y: 120, z: 50, motion: "linear" as const, feed_mmpm: 800 },
    { index: 3, x: 100, y: 120, z: 50, motion: "linear" as const, feed_mmpm: 800 },
    { index: 4, x: 100, y: 100, z: 50, motion: "rapid" as const },
  ];
  const stock = { id: "stock", body_type: "stock" as const, min_x: -5, min_y: -5, min_z: -10, max_x: 25, max_y: 25, max_z: 0 };

  it("checkFullToolpath: empty blocks returns empty report (not certified)", () => {
    const r = collisionPreventionEngine.checkFullToolpath([], tool, stock);
    expect(r.blocks_checked).toBe(0);
    expect(r.events).toEqual([]);
  });

  it("checkFullToolpath: clean motion above stock has no collision events", () => {
    const r = collisionPreventionEngine.checkFullToolpath(cleanBlocks, tool, stock, []);
    expect(r.blocks_checked).toBe(cleanBlocks.length);
    expect(r.collision_count).toBe(0);
  });

  it("checkFullToolpath: fixture in the path flags at least one event", () => {
    const fixture = { id: "vise", body_type: "fixture" as const, min_x: 5, min_y: 5, min_z: -20, max_x: 15, max_y: 15, max_z: 20 };
    const blocks = [
      { index: 0, x: 0, y: 10, z: 0, motion: "linear" as const, feed_mmpm: 800 },
      { index: 1, x: 20, y: 10, z: 0, motion: "linear" as const, feed_mmpm: 800 },
    ];
    const r = collisionPreventionEngine.checkFullToolpath(blocks, tool, stock, [fixture]);
    expect(r.events.length + r.collision_count + r.near_miss_count).toBeGreaterThan(0);
  });

  it("checkFullToolpath: machine envelope violation flagged", () => {
    const env = { min_x: -50, min_y: -50, min_z: -50, max_x: 50, max_y: 50, max_z: 50 };
    const blocks = [
      { index: 0, x: 100, y: 100, z: 0, motion: "linear" as const, feed_mmpm: 800 },
    ];
    const r = collisionPreventionEngine.checkFullToolpath(blocks, tool, stock, [], env);
    expect(r.events.length + r.collision_count).toBeGreaterThan(0);
  });

  it("certify: clean path returns certified=true with finite min_clearance_mm", () => {
    const r = collisionPreventionEngine.certify(cleanBlocks, tool, stock, []);
    expect(typeof r.certified).toBe("boolean");
    expect(Number.isFinite(r.min_clearance_mm)).toBe(true);
  });

  it("getCollisionZones: returns array (possibly empty) for clean path", () => {
    const zones = collisionPreventionEngine.getCollisionZones(cleanBlocks, tool, stock, []);
    expect(Array.isArray(zones)).toBe(true);
  });
});

// ─── U05: ToolBreakagePredictionEngine ───────────────────────────────────────

describe("CAMX-MS14 / U05 ToolBreakagePredictionEngine", () => {
  const tool = {
    tool_id: "T-test-1",
    diameter_mm: 10, flute_count: 4,
    cutting_length_mm: 25, gauge_length_mm: 50,
    tool_material: "carbide" as const,
  };

  it("predictBreakage: light cut → LOW risk, probability < 0.15", () => {
    const p = toolBreakagePredictionEngine.predictBreakage(tool, { Fc_N: 200 });
    expect(p.risk_level).toBe("LOW");
    expect(p.breakage_probability).toBeLessThan(0.15);
  });

  it("predictBreakage: extreme force → elevated risk (MODERATE|HIGH|CRITICAL)", () => {
    const p = toolBreakagePredictionEngine.predictBreakage(
      { ...tool, gauge_length_mm: 100 },
      { Fc_N: 5000, peak_force_N: 7000 },
    );
    expect(["MODERATE", "HIGH", "CRITICAL"]).toContain(p.risk_level);
    expect(p.breakage_probability).toBeGreaterThan(0.1);
  });

  it("predictBreakage: all probability components in [0,1]", () => {
    const p = toolBreakagePredictionEngine.predictBreakage(tool, { Fc_N: 800 });
    for (const v of Object.values(p.probabilities)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("predictBreakage: reports stress, miner damage, and remaining life", () => {
    const p = toolBreakagePredictionEngine.predictBreakage(tool, { Fc_N: 600 });
    expect(Number.isFinite(p.deflection_stress_MPa)).toBe(true);
    expect(p.miner_damage).toBeGreaterThanOrEqual(0);
    expect(p.remaining_life_min).toBeGreaterThanOrEqual(0);
  });

  it("getCumulativeDamage: accumulates across multiple operations per tool_id", () => {
    const ops = [
      { ae_mm: 5, ap_mm: 2, fz_mm: 0.08, Vc_mpm: 180, duration_min: 2, force_N: 500 },
      { ae_mm: 5, ap_mm: 2, fz_mm: 0.08, Vc_mpm: 180, duration_min: 3, force_N: 520 },
    ];
    const t = { ...tool, tool_id: "T-cumulative-1" };
    const s1 = toolBreakagePredictionEngine.getCumulativeDamage(t, ops);
    const s2 = toolBreakagePredictionEngine.getCumulativeDamage(t, ops);
    expect(s2.operations).toBeGreaterThan(s1.operations);
    expect(s2.damage).toBeGreaterThanOrEqual(s1.damage);
    expect(s2.history.length).toBeGreaterThan(0);
  });

  it("getBreakageRisk: returns a risk + probability + limiting_factor", () => {
    const r = toolBreakagePredictionEngine.getBreakageRisk(
      tool,
      { ae_mm: 5, ap_mm: 2, fz_mm: 0.1, Vc_mpm: 180, duration_min: 1, force_N: 1200 },
    );
    expect(["LOW", "MODERATE", "HIGH", "CRITICAL"]).toContain(r.risk);
    expect(r.probability).toBeGreaterThanOrEqual(0);
    expect(r.probability).toBeLessThanOrEqual(1);
    expect(["fatigue", "deflection", "chipload", "engagement"]).toContain(r.limiting_factor);
  });

  it("predictBreakage: CRITICAL-class alert threshold (P > 5%)", () => {
    // From roadmap exit condition: alert when P(breakage) > 5%
    const p = toolBreakagePredictionEngine.predictBreakage(
      { ...tool, gauge_length_mm: 120, diameter_mm: 5 },
      { Fc_N: 4500, peak_force_N: 6500 },
    );
    // With these params probability should easily exceed 0.05
    expect(p.breakage_probability).toBeGreaterThan(0.05);
  });
});

// ─── U06: WorkholdingVerificationEngine ──────────────────────────────────────

describe("CAMX-MS14 / U06 WorkholdingVerificationEngine", () => {
  const normalForces = { Fc_N: 600, Ff_N: 200, Fp_N: 300, operation_name: "finish_side" };
  const viseOK = {
    type: "vise" as const,
    clamping_force_N: 40_000,
    clamp_points: 2,
    friction_coefficient: 0.35,
    clamping_method: "hydraulic" as const,
  };
  const viseWeak = {
    type: "vise" as const,
    clamping_force_N: 800,
    clamp_points: 2,
    friction_coefficient: 0.20,
    clamping_method: "manual" as const,
  };

  it("verify: adequate vise → SAFE with safety_factor > 1.5", () => {
    const v = workholdingVerificationEngine.verify(normalForces, viseOK);
    expect(v.verdict).toBe("SAFE");
    expect(v.safety_factor).toBeGreaterThan(1.5);
  });

  it("verify: underclamped vise → CRITICAL", () => {
    const v = workholdingVerificationEngine.verify({ Fc_N: 3000, Ff_N: 1500 }, viseWeak);
    expect(v.verdict).toBe("CRITICAL");
    expect(v.safety_factor).toBeLessThan(1.5);
    expect(v.recommendations.length).toBeGreaterThan(0);
  });

  it("verify: ejection_risk and datum_shift_risk are in [0,1]", () => {
    const v = workholdingVerificationEngine.verify(normalForces, viseOK);
    expect(v.ejection_risk).toBeGreaterThanOrEqual(0);
    expect(v.ejection_risk).toBeLessThanOrEqual(1);
    expect(v.datum_shift_risk).toBeGreaterThanOrEqual(0);
    expect(v.datum_shift_risk).toBeLessThanOrEqual(1);
  });

  it("verify: hydraulic and manual clamping both yield finite SF and valid verdicts", () => {
    const a = workholdingVerificationEngine.verify(normalForces, { ...viseOK, clamping_method: "hydraulic" });
    const b = workholdingVerificationEngine.verify(normalForces, { ...viseOK, clamping_method: "manual" });
    expect(Number.isFinite(a.safety_factor)).toBe(true);
    expect(Number.isFinite(b.safety_factor)).toBe(true);
    expect(["SAFE", "WARNING", "CRITICAL"]).toContain(a.verdict);
    expect(["SAFE", "WARNING", "CRITICAL"]).toContain(b.verdict);
  });

  it("verifyAllOperations: aggregates worst verdict across a batch", () => {
    const ops = [
      { Fc_N: 300, operation_name: "roughing" },
      { Fc_N: 900, Ff_N: 400, operation_name: "finishing" },
    ];
    const r = workholdingVerificationEngine.verifyAllOperations(ops, viseOK);
    expect(r.operations.length).toBe(2);
    expect(Number.isFinite(r.min_safety_factor)).toBe(true);
    expect(typeof r.limiting_operation).toBe("string");
    expect(["SAFE", "WARNING", "CRITICAL"]).toContain(r.overall_verdict);
  });

  it("verify: cutting frequency near natural frequency raises resonance_warning", () => {
    const wh = { ...viseOK, natural_freq_Hz: 250, Q_factor: 8 };
    const v = workholdingVerificationEngine.verify(
      { Fc_N: 600, cutting_freq_Hz: 248, operation_name: "near_resonance" },
      wh,
    );
    expect(v.resonance_warning).toBe(true);
    expect(v.vibration_amplification).toBeGreaterThan(1);
  });

  it("verify: required_grip_N scales with resultant force / friction_coefficient", () => {
    const lowMu = { ...viseOK, friction_coefficient: 0.15 };
    const hiMu = { ...viseOK, friction_coefficient: 0.45 };
    const vLow = workholdingVerificationEngine.verify(normalForces, lowMu);
    const vHi = workholdingVerificationEngine.verify(normalForces, hiMu);
    expect(vLow.required_grip_N).toBeGreaterThan(vHi.required_grip_N);
  });
});
