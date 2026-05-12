/**
 * StrategySafetyDecisionEngine Tests — CAMX-MS2/U06
 */

import { describe, it, expect } from "vitest";
import {
  StrategySafetyDecisionEngine,
  strategySafetyDecisionEngine,
  SAFETY_THRESHOLDS,
  type StrategySafetyOption,
} from "../engines/StrategySafetyDecisionEngine.js";

const SAFE_OPTION: StrategySafetyOption = {
  strategy_id: "conservative_mill",
  risks: { collision_risk: 10, overload_risk: 15, chatter_risk: 20, thermal_risk: 10 },
};

const CAUTION_OPTION: StrategySafetyOption = {
  strategy_id: "moderate_mill",
  risks: { collision_risk: 40, overload_risk: 55, chatter_risk: 35, thermal_risk: 30 },
};

const UNSAFE_CHATTER: StrategySafetyOption = {
  strategy_id: "risky_chatter",
  risks: { collision_risk: 10, overload_risk: 15, chatter_risk: 85, thermal_risk: 10 },
};

const UNSAFE_COLLISION: StrategySafetyOption = {
  strategy_id: "risky_collision",
  risks: { collision_risk: 90, overload_risk: 20, chatter_risk: 15, thermal_risk: 15 },
};

describe("StrategySafetyDecisionEngine.assess()", () => {
  it("flags safe option as is_safe=true", () => {
    const a = strategySafetyDecisionEngine.assess(SAFE_OPTION);
    expect(a.is_safe).toBe(true);
    expect(a.severity).toBe("safe");
    expect(a.rejection_reasons).toEqual([]);
  });

  it("flags option with any single risk >= 80 as unsafe", () => {
    const a = strategySafetyDecisionEngine.assess(UNSAFE_CHATTER);
    expect(a.is_safe).toBe(false);
    expect(a.severity).toBe("critical");
    expect(a.rejection_reasons.length).toBeGreaterThan(0);
    expect(a.rejection_reasons[0]).toContain("chatter_risk");
  });

  it("rejects collision_risk >= 80", () => {
    const a = strategySafetyDecisionEngine.assess(UNSAFE_COLLISION);
    expect(a.is_safe).toBe(false);
    expect(a.rejection_reasons.some(r => r.includes("collision_risk"))).toBe(true);
  });

  it("rejects options with combined risk >= 250", () => {
    const a = strategySafetyDecisionEngine.assess({
      strategy_id: "sum_overflow",
      risks: { collision_risk: 70, overload_risk: 70, chatter_risk: 60, thermal_risk: 60 }, // sum 260
    });
    expect(a.is_safe).toBe(false);
    expect(a.rejection_reasons.some(r => r.includes("combined_risk"))).toBe(true);
  });

  it("marks borderline options as 'caution'", () => {
    const a = strategySafetyDecisionEngine.assess(CAUTION_OPTION);
    expect(a.is_safe).toBe(true);
    expect(a.severity).toBe("caution");
  });

  it("computes combined_risk as sum of all 4", () => {
    const a = strategySafetyDecisionEngine.assess(SAFE_OPTION);
    expect(a.combined_risk).toBeCloseTo(10 + 15 + 20 + 10, 2); // 55
  });

  it("computes max_risk correctly", () => {
    const a = strategySafetyDecisionEngine.assess(SAFE_OPTION);
    expect(a.max_risk).toBe(20); // max of 10, 15, 20, 10
  });

  it("throws on out-of-range risk score", () => {
    expect(() => strategySafetyDecisionEngine.assess({
      strategy_id: "bad",
      risks: { collision_risk: 150, overload_risk: 10, chatter_risk: 10, thermal_risk: 10 },
    })).toThrow(/collision_risk/);
  });

  it("throws on negative risk", () => {
    expect(() => strategySafetyDecisionEngine.assess({
      strategy_id: "bad",
      risks: { collision_risk: 10, overload_risk: -5, chatter_risk: 10, thermal_risk: 10 },
    })).toThrow(/overload_risk/);
  });
});

describe("StrategySafetyDecisionEngine.decide()", () => {
  it("sorts safe options by combined_risk ascending", () => {
    const d = strategySafetyDecisionEngine.decide([CAUTION_OPTION, SAFE_OPTION]);
    expect(d.safe[0].strategy_id).toBe(SAFE_OPTION.strategy_id); // lower risk first
  });

  it("places unsafe options in 'rejected'", () => {
    const d = strategySafetyDecisionEngine.decide([SAFE_OPTION, UNSAFE_CHATTER]);
    expect(d.rejected.map(r => r.strategy_id)).toContain(UNSAFE_CHATTER.strategy_id);
    expect(d.safe.map(r => r.strategy_id)).not.toContain(UNSAFE_CHATTER.strategy_id);
  });

  it("safest is the lowest-risk safe option", () => {
    const d = strategySafetyDecisionEngine.decide([CAUTION_OPTION, SAFE_OPTION]);
    expect(d.safest?.strategy_id).toBe(SAFE_OPTION.strategy_id);
  });

  it("safest is null when all options rejected", () => {
    const d = strategySafetyDecisionEngine.decide([UNSAFE_CHATTER, UNSAFE_COLLISION]);
    expect(d.safest).toBeNull();
    expect(d.explanation).toMatch(/ALL.*rejected/i);
  });

  it("detects safety override when cost_preferred is rejected", () => {
    const d = strategySafetyDecisionEngine.decide(
      [SAFE_OPTION, UNSAFE_CHATTER],
      UNSAFE_CHATTER.strategy_id, // cost pick was the unsafe one
    );
    expect(d.overrode_cost).toBe(true);
    expect(d.explanation).toMatch(/Safety override/i);
  });

  it("no override when cost_preferred is safe", () => {
    const d = strategySafetyDecisionEngine.decide(
      [SAFE_OPTION, CAUTION_OPTION],
      SAFE_OPTION.strategy_id,
    );
    expect(d.overrode_cost).toBe(false);
  });

  it("throws on empty input", () => {
    expect(() => strategySafetyDecisionEngine.decide([])).toThrow();
  });

  it("explanation includes safest strategy id when available", () => {
    const d = strategySafetyDecisionEngine.decide([SAFE_OPTION, CAUTION_OPTION]);
    expect(d.explanation).toContain(SAFE_OPTION.strategy_id);
  });

  it("reports counts of safe vs rejected", () => {
    const d = strategySafetyDecisionEngine.decide([SAFE_OPTION, CAUTION_OPTION, UNSAFE_CHATTER]);
    expect(d.safe.length).toBe(2);
    expect(d.rejected.length).toBe(1);
  });
});

describe("StrategySafetyDecisionEngine.filterSafe()", () => {
  it("returns only safe options, preserving input order", () => {
    const result = strategySafetyDecisionEngine.filterSafe([
      UNSAFE_CHATTER, SAFE_OPTION, CAUTION_OPTION, UNSAFE_COLLISION,
    ]);
    expect(result.map(o => o.strategy_id)).toEqual([SAFE_OPTION.strategy_id, CAUTION_OPTION.strategy_id]);
  });

  it("returns empty when all unsafe", () => {
    expect(strategySafetyDecisionEngine.filterSafe([UNSAFE_CHATTER, UNSAFE_COLLISION])).toEqual([]);
  });
});

describe("Safety thresholds", () => {
  it("exports SAFETY_THRESHOLDS constants", () => {
    expect(SAFETY_THRESHOLDS.CRITICAL_SINGLE).toBe(80);
    expect(SAFETY_THRESHOLDS.CRITICAL_SUM).toBe(250);
  });
});

describe("StrategySafetyDecisionEngine singleton", () => {
  it("exports singleton instance", () => {
    expect(strategySafetyDecisionEngine).toBeInstanceOf(StrategySafetyDecisionEngine);
  });
});
