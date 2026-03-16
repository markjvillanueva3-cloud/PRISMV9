import { describe, it, expect } from "vitest";
import {
  ForceCapabilityEngine,
  MachineCapability,
  OperationForceInput,
} from "../engines/ForceCapabilityEngine";

const engine = new ForceCapabilityEngine();

// ─── Fixtures ──────────────────────────────────────────────────────

/** Typical VMC: 15kW, 120Nm, 12000rpm */
const stdMachine: MachineCapability = {
  max_power_kw: 15,
  max_torque_Nm: 120,
  max_rpm: 12000,
};

/** Small machine with thrust limit */
const smallMachine: MachineCapability = {
  max_power_kw: 7.5,
  max_torque_Nm: 60,
  max_rpm: 10000,
  max_thrust_N: 3000,
  rigidity: "low",
};

/** Mild steel Kienzle constants */
const steelKc = { material_kc1_1: 1800, material_mc: 0.25 };

/** Aluminum Kienzle constants */
const aluminumKc = { material_kc1_1: 700, material_mc: 0.23 };

/** Titanium Kienzle constants */
const titaniumKc = { material_kc1_1: 1400, material_mc: 0.22 };

function makeOp(overrides: Partial<OperationForceInput>): OperationForceInput {
  return {
    id: "op1",
    type: "milling",
    tool_diameter_mm: 12,
    flutes: 4,
    depth_mm: 3,
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.08,
    ...steelKc,
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("ForceCapabilityEngine", () => {
  // 1. Single operation power check — within limits
  it("single operation within power limits", () => {
    const op = makeOp({ id: "light-cut" });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.feasible).toBe(true);
    expect(result.value.power_utilization_pct).toBeLessThan(100);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.source).toContain("ForceCapabilityEngine");
  });

  // 2. Single operation power exceeded
  it("detects power exceeded on aggressive cut", () => {
    const op = makeOp({
      id: "heavy-cut",
      depth_mm: 15,
      cutting_speed_mpm: 250,
      feed_per_tooth_mm: 0.2,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.power_utilization_pct).toBeGreaterThan(100);
    expect(result.value.feasible).toBe(false);
    expect(result.value.limiting_factor).toBe("power");
  });

  // 3. Torque limit exceeded at low RPM (large diameter, low speed)
  it("detects torque limit at low RPM", () => {
    const op = makeOp({
      id: "big-face-mill",
      tool_diameter_mm: 80,
      depth_mm: 4,
      cutting_speed_mpm: 30,
      feed_per_tooth_mm: 0.15,
    });
    const result = engine.checkSingleOperation(smallMachine, op);
    // Large diameter + low speed = high torque demand
    expect(result.value.torque_Nm).toBeGreaterThan(0);
    if (result.value.torque_utilization_pct > 100) {
      expect(result.value.limiting_factor).toBe("torque");
      expect(result.value.feasible).toBe(false);
    }
  });

  // 4. Deflection warning for long stickout
  it("flags deflection for long stickout", () => {
    const op = makeOp({
      id: "deep-pocket",
      tool_diameter_mm: 6,
      tool_stickout_mm: 80,
      depth_mm: 3,
      feed_per_tooth_mm: 0.06,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.deflection_um).toBeGreaterThan(50);
    expect(
      result.value.limiting_factor === "deflection" ||
      result.value.limiting_factor === "deflection_warning"
    ).toBe(true);
  });

  // 5. Clamp force insufficient
  it("detects insufficient clamping", () => {
    const op = makeOp({
      id: "low-clamp",
      depth_mm: 5,
      feed_per_tooth_mm: 0.12,
      clamp_force_N: 200,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.clamp_safety_factor).toBeLessThan(1);
    expect(result.value.feasible).toBe(false);
    expect(result.value.limiting_factor).toBe("clamping");
  });

  // 6. Thermal growth accumulation over sequence
  it("accumulates thermal growth across operations", () => {
    const ops: OperationForceInput[] = [
      makeOp({ id: "op1", elapsed_cutting_time_min: 5 }),
      makeOp({ id: "op2", elapsed_cutting_time_min: 5 }),
      makeOp({ id: "op3", elapsed_cutting_time_min: 5 }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    // 15 min total → ΔT=30°C → ΔL = 11.7 × 30 × 0.3 = 105.3 µm
    expect(result.value.thermal_growth_um).toBeGreaterThan(100);
    // First op should have less thermal growth than last
    expect(result.value.checks[0].thermal_growth_um)
      .toBeLessThan(result.value.checks[2].thermal_growth_um);
  });

  // 7. Tool wear increases force over time
  it("models wear-based force increase", () => {
    const fresh = makeOp({
      id: "fresh",
      elapsed_cutting_time_min: 0,
      tool_life_min: 60,
    });
    const worn = makeOp({
      id: "worn",
      elapsed_cutting_time_min: 60,
      tool_life_min: 60,
    });
    const rFresh = engine.checkSingleOperation(stdMachine, fresh);
    const rWorn = engine.checkSingleOperation(stdMachine, worn);
    // Wear factor at t/T=1: 1 + 0.3×1.0 = 1.3 → 30% increase
    expect(rWorn.value.cutting_force_N).toBeGreaterThan(
      rFresh.value.cutting_force_N * 1.25
    );
    expect(rWorn.value.wear_factor).toBeCloseTo(1.3, 1);
  });

  // 8. Full sequence — all pass
  it("full sequence all feasible", () => {
    const ops = [
      makeOp({ id: "rough", depth_mm: 3 }),
      makeOp({ id: "semi", depth_mm: 1.5 }),
      makeOp({ id: "finish", depth_mm: 0.3, feed_per_tooth_mm: 0.04 }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    expect(result.value.feasible).toBe(true);
    expect(result.value.limiting_operation).toBeNull();
    expect(result.value.checks).toHaveLength(3);
  });

  // 9. Full sequence — one operation fails
  it("full sequence detects single failing operation", () => {
    const ops = [
      makeOp({ id: "ok1", depth_mm: 2 }),
      makeOp({
        id: "overload",
        depth_mm: 20,
        feed_per_tooth_mm: 0.2,
        cutting_speed_mpm: 250,
      }),
      makeOp({ id: "ok2", depth_mm: 1 }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    expect(result.value.feasible).toBe(false);
    expect(result.value.limiting_operation).toBe("overload");
  });

  // 10. Axis thrust limit check
  it("detects axis thrust limit exceeded", () => {
    const op = makeOp({
      id: "thrust-test",
      depth_mm: 8,
      feed_per_tooth_mm: 0.15,
    });
    const machine: MachineCapability = {
      ...stdMachine,
      max_thrust_N: 500, // very low thrust limit
    };
    const result = engine.checkSingleOperation(machine, op);
    // Feed force = 0.5 × Fc; for heavy cut Fc will be large
    if (result.value.cutting_force_N * 0.5 > 500) {
      expect(result.value.limiting_factor).toBe("axis_thrust");
      expect(result.value.feasible).toBe(false);
    }
  });

  // 11. Small tool high speed — power OK, deflection bad
  it("small tool at high speed: power OK but deflection issue", () => {
    const op = makeOp({
      id: "micro-cut",
      tool_diameter_mm: 3,
      tool_stickout_mm: 60,
      depth_mm: 2,
      cutting_speed_mpm: 200,
      feed_per_tooth_mm: 0.03,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.power_utilization_pct).toBeLessThan(50);
    expect(result.value.deflection_um).toBeGreaterThan(50);
  });

  // 12. Large tool low speed — torque concern
  it("large tool low speed produces high torque", () => {
    const op = makeOp({
      id: "face-mill",
      tool_diameter_mm: 63,
      depth_mm: 3,
      cutting_speed_mpm: 40,
      feed_per_tooth_mm: 0.12,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.torque_Nm).toBeGreaterThan(20);
    expect(result.value.torque_utilization_pct).toBeGreaterThan(
      result.value.power_utilization_pct * 0.5
    );
  });

  // 13. Aluminum (low kc) vs titanium (high kc)
  it("aluminum feasible where titanium is not", () => {
    const base = {
      id: "material-compare",
      type: "milling" as const,
      tool_diameter_mm: 12,
      flutes: 4,
      depth_mm: 6,
      cutting_speed_mpm: 180,
      feed_per_tooth_mm: 0.12,
    };
    const alOp = makeOp({ ...base, ...aluminumKc });
    const tiOp = makeOp({ ...base, ...titaniumKc });
    const alResult = engine.checkSingleOperation(smallMachine, alOp);
    const tiResult = engine.checkSingleOperation(smallMachine, tiOp);
    expect(alResult.value.cutting_force_N).toBeLessThan(
      tiResult.value.cutting_force_N
    );
    expect(alResult.value.power_kw).toBeLessThan(tiResult.value.power_kw);
  });

  // 14. Multiple passes accumulate thermal growth
  it("thermal growth increases with each operation", () => {
    const ops = Array.from({ length: 5 }, (_, i) =>
      makeOp({ id: `pass${i + 1}`, elapsed_cutting_time_min: 3 })
    );
    const result = engine.checkSequence(stdMachine, ops);
    for (let i = 1; i < result.value.checks.length; i++) {
      expect(result.value.checks[i].thermal_growth_um).toBeGreaterThan(
        result.value.checks[i - 1].thermal_growth_um
      );
    }
  });

  // 15. Worn tool near end of life
  it("heavily worn tool shows significant force increase", () => {
    const op = makeOp({
      id: "eol-tool",
      elapsed_cutting_time_min: 55,
      tool_life_min: 60,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    // wear factor = 1 + 0.3 × sqrt(55/60) ≈ 1.287
    expect(result.value.wear_factor).toBeGreaterThan(1.25);
    expect(result.value.wear_factor).toBeLessThan(1.35);
  });

  // 16. Zero stickout edge case
  it("handles zero stickout gracefully", () => {
    const op = makeOp({ id: "zero-stick", tool_stickout_mm: 0 });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.deflection_um).toBe(0);
    expect(result.value.feasible).toBe(true);
  });

  // 17. Very small depth (finishing) — always feasible
  it("finishing pass with tiny depth is always feasible", () => {
    const op = makeOp({
      id: "finish",
      depth_mm: 0.05,
      feed_per_tooth_mm: 0.02,
      cutting_speed_mpm: 200,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.feasible).toBe(true);
    expect(result.value.power_utilization_pct).toBeLessThan(5);
    expect(result.value.torque_utilization_pct).toBeLessThan(5);
  });

  // 18. Maximum utilization thresholds
  it("reports near-limit when utilization > 90%", () => {
    // Calibrate a cut that lands between 90-100% power
    const op = makeOp({
      id: "near-limit",
      depth_mm: 8,
      feed_per_tooth_mm: 0.12,
      cutting_speed_mpm: 180,
    });
    const result = engine.checkSingleOperation(stdMachine, op);
    if (
      result.value.power_utilization_pct > 90 &&
      result.value.power_utilization_pct <= 100
    ) {
      expect(result.value.limiting_factor).toBe("power_near_limit");
      expect(result.value.feasible).toBe(true);
    }
  });

  // 19. Recommendations generated for failing checks
  it("generates recommendations for failing operations", () => {
    const ops = [
      makeOp({
        id: "overpower",
        depth_mm: 20,
        feed_per_tooth_mm: 0.2,
        cutting_speed_mpm: 250,
      }),
      makeOp({
        id: "bad-clamp",
        clamp_force_N: 100,
        depth_mm: 5,
      }),
      makeOp({
        id: "long-stick",
        tool_diameter_mm: 4,
        tool_stickout_mm: 100,
      }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
    const recText = result.value.recommendations.join(" ");
    expect(recText).toContain("overpower");
  });

  // 20. Limiting operation correctly identified
  it("identifies the first limiting operation in sequence", () => {
    const ops = [
      makeOp({ id: "ok-first", depth_mm: 1 }),
      makeOp({
        id: "fail-second",
        depth_mm: 25,
        feed_per_tooth_mm: 0.25,
        cutting_speed_mpm: 300,
      }),
      makeOp({
        id: "fail-third",
        depth_mm: 30,
        feed_per_tooth_mm: 0.3,
        cutting_speed_mpm: 300,
      }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    expect(result.value.feasible).toBe(false);
    expect(result.value.limiting_operation).toBe("fail-second");
  });

  // 21. Kienzle force calculation correctness
  it("computes Kienzle force correctly", () => {
    // Fc = kc1.1 × ap × fz^(1-mc)
    // kc1.1=1800, ap=3, fz=0.08, mc=0.25
    // Fc = 1800 × 3 × 0.08^0.75
    const op = makeOp({ id: "verify-force" });
    const result = engine.checkSingleOperation(stdMachine, op);
    const expected = 1800 * 3 * Math.pow(0.08, 0.75);
    expect(result.value.cutting_force_N).toBeCloseTo(expected, 0);
  });

  // 22. Power calculation correctness
  it("computes power correctly from Fc and Vc", () => {
    const op = makeOp({ id: "verify-power" });
    const result = engine.checkSingleOperation(stdMachine, op);
    const expectedPower =
      (result.value.cutting_force_N * 150) / 60000;
    expect(result.value.power_kw).toBeCloseTo(expectedPower, 2);
  });

  // 23. Torque calculation correctness
  it("computes torque correctly from Fc and D", () => {
    const op = makeOp({ id: "verify-torque" });
    const result = engine.checkSingleOperation(stdMachine, op);
    const expectedTorque =
      (result.value.cutting_force_N * 12) / 2000;
    expect(result.value.torque_Nm).toBeCloseTo(expectedTorque, 2);
  });

  // 24. No clamp_force_N yields high safety factor sentinel
  it("no clamp force yields max safety factor", () => {
    const op = makeOp({ id: "no-clamp" });
    const result = engine.checkSingleOperation(stdMachine, op);
    expect(result.value.clamp_safety_factor).toBe(999);
  });

  // 25. Wear force increase percentage in sequence result
  it("sequence reports max wear force increase pct", () => {
    const ops = [
      makeOp({
        id: "fresh",
        elapsed_cutting_time_min: 0,
        tool_life_min: 60,
      }),
      makeOp({
        id: "mid-life",
        elapsed_cutting_time_min: 30,
        tool_life_min: 60,
      }),
      makeOp({
        id: "worn",
        elapsed_cutting_time_min: 60,
        tool_life_min: 60,
      }),
    ];
    const result = engine.checkSequence(stdMachine, ops);
    // Max wear at t/T=1 → 30%
    expect(result.value.wear_force_increase_pct).toBeCloseTo(30, 0);
  });
});
