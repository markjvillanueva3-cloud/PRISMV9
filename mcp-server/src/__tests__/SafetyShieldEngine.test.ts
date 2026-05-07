/**
 * SafetyShield Engine Tests — U-LEARN-08
 */
import { describe, it, expect, beforeEach } from "vitest";
import { safetyShieldEngine } from "../engines/SafetyShieldEngine.js";

describe("SafetyShieldEngine", () => {
  beforeEach(() => { safetyShieldEngine.clear(); });

  it("creates a shield with constraints", () => {
    const result = safetyShieldEngine.createShield({
      shield_id: "test_shield", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 5000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "gaussian", uncertainty_scale: 1.0,
    });
    expect(result.shield_id).toBe("test_shield");
    expect(result.constraint_count).toBe(1);
  });

  it("evaluates safe action as allowed", () => {
    safetyShieldEngine.createShield({
      shield_id: "safe_test", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 10000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0,
    });
    const result = safetyShieldEngine.evaluate({ shield_id: "safe_test", state: { ap_mm: 1.0, fz_mm: 0.1 }, proposed_action: { ap_mm: 1.0, fz_mm: 0.1 }, material_iso: "P" });
    expect(result.allowed).toBe(true);
    expect(result.overall_safety_score).toBeGreaterThan(0.7);
  });

  it("rejects unsafe action exceeding force limit", () => {
    safetyShieldEngine.createShield({
      shield_id: "unsafe_test", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 100, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0,
    });
    const result = safetyShieldEngine.evaluate({ shield_id: "unsafe_test", state: {}, proposed_action: { ap_mm: 10.0, fz_mm: 1.0 }, material_iso: "H" });
    expect(result.was_modified).toBe(true);
  });

  it("checks Kienzle envelope correctly", () => {
    const result = safetyShieldEngine.checkKienzleEnvelope({ ap_mm: 2.0, fz_mm: 0.1 }, "P", 5000);
    expect(result.force_N).toBeGreaterThan(0);
    expect(result.force_N).toBeLessThan(5000);
    expect(result.allowed).toBe(true);
  });

  it("uses correct kc1_1 values per ISO group", () => {
    const resultP = safetyShieldEngine.checkKienzleEnvelope({ ap_mm: 1.0, fz_mm: 0.1 }, "P", 10000);
    const resultH = safetyShieldEngine.checkKienzleEnvelope({ ap_mm: 1.0, fz_mm: 0.1 }, "H", 10000);
    expect(resultH.force_N).toBeGreaterThan(resultP.force_N);
  });

  it("throws error for unknown shield", () => {
    expect(() => safetyShieldEngine.evaluate({ shield_id: "nonexistent", state: {}, proposed_action: {} })).toThrow("Shield not found");
  });

  it("tracks evaluation statistics", () => {
    safetyShieldEngine.createShield({
      shield_id: "stats_shield", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 5000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0,
    });
    safetyShieldEngine.evaluate({ shield_id: "stats_shield", state: {}, proposed_action: { ap_mm: 1.0, fz_mm: 0.1 }, material_iso: "P" });
    const stats = safetyShieldEngine.getStats("stats_shield");
    expect(stats!.evaluation_count).toBe(1);
  });

  it("lists and deletes shields", () => {
    safetyShieldEngine.createShield({ shield_id: "s1", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 5000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }], cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0 });
    safetyShieldEngine.createShield({ shield_id: "s2", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 5000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }], cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0 });
    expect(safetyShieldEngine.listShields()).toHaveLength(2);
    safetyShieldEngine.deleteShield("s1");
    expect(safetyShieldEngine.listShields()).toHaveLength(1);
  });

  it("returns constraint evaluations with margins", () => {
    safetyShieldEngine.createShield({
      shield_id: "margin_test", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 5000, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0,
    });
    const result = safetyShieldEngine.evaluate({ shield_id: "margin_test", state: {}, proposed_action: { ap_mm: 1.0, fz_mm: 0.1 }, material_iso: "P" });
    expect(result.constraint_evaluations).toHaveLength(1);
    expect(result.constraint_evaluations[0].margin).toBeGreaterThan(0);
  });

  it("modifies action to meet constraints when possible", () => {
    safetyShieldEngine.createShield({
      shield_id: "modify_test", constraints: [{ constraint_id: "c1", type: "force_limit", parameter: "Fc", limit_value: 500, limit_type: "max", probability_threshold: 1e-4, severity: "hard", physics_model: "kienzle" }],
      cbf_gamma: 0.1, slack_penalty: 1000, uncertainty_model: "none", uncertainty_scale: 1.0,
    });
    const result = safetyShieldEngine.evaluate({ shield_id: "modify_test", state: {}, proposed_action: { ap_mm: 5.0, fz_mm: 0.5 }, material_iso: "P" });
    expect(result.was_modified).toBe(true);
    expect(result.safe_action.ap_mm).toBeLessThan(5.0);
  });
});
