/**
 * CAM Dispatcher — Cost & Safety Decision Actions (CAMX-MS2/U05+U06)
 *
 * Tests 6 new actions wired into camDispatcher:
 * - strategy_cost_compute / strategy_cost_decide / strategy_cost_sensitivity
 * - strategy_safety_assess / strategy_safety_decide / strategy_safety_filter
 */

import { describe, it, expect } from "vitest";
import { ACTIONS } from "../tools/dispatchers/camDispatcher.js";

describe("camDispatcher: CAMX-MS2/U05+U06 cost & safety actions", () => {
  describe("U05 cost action registration", () => {
    it("strategy_cost_compute is registered", () => {
      expect(ACTIONS).toContain("strategy_cost_compute");
    });
    it("strategy_cost_decide is registered", () => {
      expect(ACTIONS).toContain("strategy_cost_decide");
    });
    it("strategy_cost_sensitivity is registered", () => {
      expect(ACTIONS).toContain("strategy_cost_sensitivity");
    });
  });

  describe("U06 safety action registration", () => {
    it("strategy_safety_assess is registered", () => {
      expect(ACTIONS).toContain("strategy_safety_assess");
    });
    it("strategy_safety_decide is registered", () => {
      expect(ACTIONS).toContain("strategy_safety_decide");
    });
    it("strategy_safety_filter is registered", () => {
      expect(ACTIONS).toContain("strategy_safety_filter");
    });
  });

  describe("end-to-end via engines", () => {
    it("strategy_cost_decide picks minimum total cost", async () => {
      const { strategyCostOptimalEngine } = await import("../engines/StrategyCostOptimalEngine.js");
      const options = [
        { strategy_id: "fast_risky", cycle_time_min: 10, expected_tool_life_min: 30, tool_price_usd: 120, avg_power_kW: 20, failure_probability: 0.05 },
        { strategy_id: "slow_safe", cycle_time_min: 25, expected_tool_life_min: 180, tool_price_usd: 120, avg_power_kW: 12, failure_probability: 0.005 },
      ];
      const rates = { machine_rate_per_min_usd: 1.5, energy_rate_per_kWh_usd: 0.12, part_value_usd: 500 };
      const d = strategyCostOptimalEngine.decide(options, rates);
      expect(d.ranked.length).toBe(2);
      expect(d.best).toBeDefined();
      expect(d.best.total_cost_usd).toBeLessThanOrEqual(d.ranked[1].total_cost_usd);
    });

    it("strategy_safety_decide rejects options exceeding thresholds", async () => {
      const { strategySafetyDecisionEngine } = await import("../engines/StrategySafetyDecisionEngine.js");
      const options = [
        { strategy_id: "safe", risks: { collision_risk: 10, overload_risk: 15, chatter_risk: 20, thermal_risk: 10 } },
        { strategy_id: "unsafe", risks: { collision_risk: 10, overload_risk: 15, chatter_risk: 85, thermal_risk: 10 } },
      ];
      const d = strategySafetyDecisionEngine.decide(options);
      expect(d.rejected.map(r => r.strategy_id)).toContain("unsafe");
      expect(d.safe.map(r => r.strategy_id)).toContain("safe");
    });

    it("safety override detected when cost-optimal is rejected", async () => {
      const { strategySafetyDecisionEngine } = await import("../engines/StrategySafetyDecisionEngine.js");
      const options = [
        { strategy_id: "cheap_unsafe", risks: { collision_risk: 90, overload_risk: 10, chatter_risk: 10, thermal_risk: 10 } },
        { strategy_id: "expensive_safe", risks: { collision_risk: 20, overload_risk: 15, chatter_risk: 10, thermal_risk: 10 } },
      ];
      const d = strategySafetyDecisionEngine.decide(options, "cheap_unsafe");
      expect(d.overrode_cost).toBe(true);
      expect(d.safest?.strategy_id).toBe("expensive_safe");
    });

    it("cost + safety together: compose safe filter then cost rank", async () => {
      const { strategyCostOptimalEngine } = await import("../engines/StrategyCostOptimalEngine.js");
      const { strategySafetyDecisionEngine } = await import("../engines/StrategySafetyDecisionEngine.js");

      const candidates = [
        {
          cost: { strategy_id: "cheap_unsafe", cycle_time_min: 5, expected_tool_life_min: 60, tool_price_usd: 100, avg_power_kW: 25, failure_probability: 0.1 },
          safety: { strategy_id: "cheap_unsafe", risks: { collision_risk: 90, overload_risk: 10, chatter_risk: 10, thermal_risk: 10 } },
        },
        {
          cost: { strategy_id: "balanced_safe", cycle_time_min: 15, expected_tool_life_min: 120, tool_price_usd: 100, avg_power_kW: 15, failure_probability: 0.01 },
          safety: { strategy_id: "balanced_safe", risks: { collision_risk: 20, overload_risk: 15, chatter_risk: 10, thermal_risk: 10 } },
        },
      ];

      const safeIds = strategySafetyDecisionEngine.filterSafe(candidates.map(c => c.safety)).map(s => s.strategy_id);
      const safeCostOptions = candidates.filter(c => safeIds.includes(c.cost.strategy_id)).map(c => c.cost);
      const rates = { machine_rate_per_min_usd: 1.5, energy_rate_per_kWh_usd: 0.12, part_value_usd: 500 };
      const finalPick = strategyCostOptimalEngine.decide(safeCostOptions, rates);

      expect(finalPick.best.strategy_id).toBe("balanced_safe");
    });
  });
});
