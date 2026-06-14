/**
 * machine_aware_constrain wire test —
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-MACHINE-AWARE (2026-05-21, slot:juliett).
 *
 * Validates MachineAwareSpeedFeedEngine.constrain() — clamps calculated S/F
 * to CanonicalMachinePackage limits. Tests use concrete machine packages
 * and assert algebraic invariants (RPM clamp = min(n_calc, n_max), power
 * formula P=T·n/9549, constant-torque region boundary).
 */
import { describe, it, expect } from "vitest";
import { machineAwareSpeedFeedEngine } from "../engines/MachineAwareSpeedFeedEngine.js";

function pkg(overrides: any = {}): any {
  return {
    canonical_id: "haas-vf-2-test",
    manufacturer: "Haas",
    model: "VF-2",
    spindle: {
      max_rpm: 8100,
      min_rpm: 50,
      power: 22.4,
      torque: 122,
      ...(overrides.spindle ?? {}),
    },
    axes: { x_rapid: 30000, ...(overrides.axes ?? {}) },
    ...overrides,
  };
}

describe("machine_aware_constrain — MachineAwareSpeedFeedEngine.constrain()", () => {
  it("RPM under machine max → no clamp, rpmLimited:false, headroom.rpm > 0", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000 },
      pkg(),
    );
    expect(r.constrained.rpm).toBe(6000);
    expect(r.constraints.rpmLimited).toBe(false);
    // Headroom = ((8100 - 6000) / 8100) × 100 = 25.9%
    expect(r.headroom.rpm).toBeCloseTo(25.93, 1);
  });

  it("RPM over machine max → clamped to max_rpm, rpmLimited:true, limitingFactor='spindle_max_rpm'", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 12000, feedRate: 1000 },
      pkg(),
    );
    expect(r.constrained.rpm).toBe(8100);
    expect(r.constraints.rpmLimited).toBe(true);
    expect(r.constraints.limitingFactor).toBe("spindle_max_rpm");
    expect(r.unconstrained.rpm).toBe(12000);
    expect(r.recommendations.some((rec) => rec.includes("RPM reduced"))).toBe(true);
  });

  it("RPM below machine min → floored to min_rpm with recommendation", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 10, feedRate: 100 },
      pkg({ spindle: { max_rpm: 8100, min_rpm: 50, power: 22.4, torque: 122 } }),
    );
    expect(r.constrained.rpm).toBe(50);
    expect(r.recommendations.some((rec) => rec.includes("RPM increased to minimum"))).toBe(true);
  });

  it("Feed rate over machine max (15000 default) → clamped, feedLimited:true", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 20000 },
      pkg(),
    );
    expect(r.constrained.feedRate).toBe(15000);
    expect(r.constraints.feedLimited).toBe(true);
  });

  it("requiredPower over spindle.power → powerLimited:true + recommendation to reduce DOC/feed", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000, requiredPower: 30 },
      pkg({ spindle: { max_rpm: 8100, min_rpm: 50, power: 22.4, torque: 122 } }),
    );
    expect(r.constraints.powerLimited).toBe(true);
    expect(r.recommendations.some((rec) => rec.toLowerCase().includes("power") && rec.includes("22.4"))).toBe(true);
  });

  it("requiredTorque over constant-power-derated torque → torqueLimited:true (n > base_rpm=1500 region)", () => {
    // At n=6000 (above base_rpm=1500): T_avail = 122 × (1500/6000) = 30.5 Nm.
    // Required torque 50 > 30.5 → torqueLimited.
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000, requiredTorque: 50 },
      pkg({ spindle: { max_rpm: 8100, min_rpm: 50, power: 22.4, torque: 122 } }),
    );
    expect(r.constraints.torqueLimited).toBe(true);
    // Engine emits suggested-RPM recommendation.
    expect(r.recommendations.some((rec) => rec.toLowerCase().includes("torque"))).toBe(true);
  });

  it("fpt + flutes provided but no feedRate → engine derives feedRate = fz × flutes × rpm (milling derivation)", () => {
    // fz=0.1, flutes=3, rpm=5000 → feedRate = 0.1 × 3 × 5000 = 1500
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 5000, feedPerTooth: 0.1, numberOfFlutes: 3 },
      pkg(),
    );
    expect(r.unconstrained.feedRate).toBeCloseTo(1500, 0);
  });

  it("fpr provided but no feedRate (turning derivation) → engine derives feedRate = fpr × rpm", () => {
    // fpr=0.2, rpm=2000 → feedRate = 0.2 × 2000 = 400
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 2000, feedPerRev: 0.2 },
      pkg(),
    );
    expect(r.unconstrained.feedRate).toBeCloseTo(400, 0);
  });

  it("RPM clamp + flutes → engine recomputes fpt from constrained feedRate (preserves milling math invariant)", () => {
    // Calculate: fz=0.1, z=3, n=12000 → unconstrained feedRate = 0.1×3×12000 = 3600.
    // RPM gets clamped to 8100. Engine then recomputes fz_new = feedRate_new / (z × n_new).
    // feedRate_new is unchanged (still 3600, < 15000), so fz_new = 3600 / (3 × 8100) ≈ 0.148.
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 12000, feedPerTooth: 0.1, numberOfFlutes: 3 },
      pkg(),
    );
    expect(r.constrained.rpm).toBe(8100);
    expect(r.constrained.feedPerTooth).toBeCloseTo(3600 / (3 * 8100), 3);
  });

  it("safety.passed=true when not power/torque limited", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 5000, feedRate: 1000, requiredPower: 5, requiredTorque: 20 },
      pkg(),
    );
    expect(r.safety.passed).toBe(true);
    expect(r.safety.warnings.length).toBe(0);
  });

  it("safety.passed=false when power-limited (warning emitted)", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 5000, feedRate: 1000, requiredPower: 30 },
      pkg({ spindle: { max_rpm: 8100, min_rpm: 50, power: 22.4, torque: 122 } }),
    );
    expect(r.safety.passed).toBe(false);
    expect(r.safety.warnings.length).toBeGreaterThan(0);
    expect(r.safety.warnings[0]).toContain("spindle_power");
  });

  it("machine package fields propagate to result.machine identity (canonical_id, manufacturer, model)", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000 },
      pkg(),
    );
    expect(r.machine.id).toBe("haas-vf-2-test");
    expect(r.machine.manufacturer).toBe("Haas");
    expect(r.machine.model).toBe("VF-2");
    expect(r.machine.constraints.maxRpm).toBe(8100);
    expect(r.machine.constraints.maxPower).toBeCloseTo(22.4, 1);
  });

  it("missing spindle.power/torque → engine applies defaults (10000/50/15/100)", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000 },
      { canonical_id: "test", manufacturer: "Test", model: "T1", spindle: {} } as any,
    );
    expect(r.machine.constraints.maxRpm).toBe(10000);
    expect(r.machine.constraints.minRpm).toBe(50);
    expect(r.machine.constraints.maxPower).toBe(15);
    expect(r.machine.constraints.maxTorque).toBe(100);
  });

  it("constant-torque region (n ≤ base_rpm=1500): torqueAtRpm returns full max torque", () => {
    // At n=1000 (below base_rpm): T_avail = 122 (full torque).
    // Required 100 < 122 → NOT torque-limited.
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 1000, feedRate: 500, requiredTorque: 100 },
      pkg(),
    );
    expect(r.constraints.torqueLimited).toBe(false);
    // At n=1500 (exactly base_rpm): still full torque (engine: if n ≤ base, return maxTorque).
    const r2 = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 1500, feedRate: 500, requiredTorque: 121 },
      pkg(),
    );
    expect(r2.constraints.torqueLimited).toBe(false);
  });

  it("returns the complete documented result contract — concrete shape with engine-set fields", () => {
    const r = machineAwareSpeedFeedEngine.constrain(
      { spindleRpm: 6000, feedRate: 1000 },
      pkg(),
    );
    // Six top-level fields populated with concrete sub-values.
    expect(r.unconstrained.rpm).toBe(6000);
    expect(r.constrained.rpm).toBe(6000);
    expect(["none", "spindle_max_rpm", "max_feed_rate", "spindle_power", "spindle_torque"]).toContain(r.constraints.limitingFactor);
    expect(r.machine.id).toBe("haas-vf-2-test");
    expect(r.headroom.rpm).toBeGreaterThanOrEqual(0);
    expect(r.headroom.rpm).toBeLessThanOrEqual(100);
    expect(r.safety.passed).toBe(true);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
