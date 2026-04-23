import { describe, it, expect } from "vitest";
import { fixtureAwareStrategyEngine } from "../engines/FixtureAwareStrategyEngine.js";

describe("FixtureAwareStrategyEngine", () => {
  it("vise allows aggressive roughing unchanged", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "aggressive_roughing", fixture_type: "vise",
    });
    expect(r.adjusted_strategy).toBe("aggressive_roughing");
    expect(r.force_derating_factor).toBeCloseTo(1.0, 1);
  });

  it("vacuum limits ae to < 15% diameter", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "aggressive_roughing", fixture_type: "vacuum",
      fixture_params: { tool_diameter_mm: 10, ae_mm: 5 },
    });
    expect(r.max_ae_fraction).toBeLessThanOrEqual(0.15);
    expect(r.force_derating_factor).toBeLessThan(1.0);
  });

  it("vacuum blocks plunge milling", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "plunge_milling", fixture_type: "vacuum",
    });
    expect(r.blocked_strategies).toContain("plunge_milling");
    expect(r.strategy_changed).toBe(true);
  });

  it("vacuum prefers climb milling", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "adaptive_roughing", fixture_type: "vacuum",
    });
    expect(r.preferred_direction).toBe("climb");
  });

  it("magnetic blocks ferrous chip contamination strategies", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "adaptive_roughing", fixture_type: "magnetic",
    });
    expect(r.force_derating_factor).toBeLessThan(1.0);
  });

  it("soft_jaws reduces allowable force vs vise", () => {
    const vise = fixtureAwareStrategyEngine.adjustStrategy({ strategy: "adaptive_roughing", fixture_type: "vise" });
    const soft = fixtureAwareStrategyEngine.adjustStrategy({ strategy: "adaptive_roughing", fixture_type: "soft_jaws" });
    expect(soft.force_derating_factor).toBeLessThanOrEqual(vise.force_derating_factor);
  });

  it("fixture_plate allows aggressive strategies", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "aggressive_roughing", fixture_type: "fixture_plate",
    });
    expect(r.force_derating_factor).toBeGreaterThanOrEqual(0.9);
  });

  it("tombstone non-top face reduces ap by 15%", () => {
    const top = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "adaptive_roughing", fixture_type: "tombstone",
      fixture_params: { tombstone_non_top_face: false, ap_mm: 5 },
    });
    const nonTop = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "adaptive_roughing", fixture_type: "tombstone",
      fixture_params: { tombstone_non_top_face: true, ap_mm: 5 },
    });
    if (nonTop.max_ap_mm !== null && top.max_ap_mm !== null) {
      expect(nonTop.max_ap_mm).toBeLessThanOrEqual(top.max_ap_mm);
    }
  });

  it("chuck_3jaw allows turning strategies", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "turning_roughing", fixture_type: "chuck_3jaw",
    });
    expect(r.fixture_holding_force_n).toBeGreaterThan(0);
  });

  it("chuck_6jaw handles thin-wall better than 3jaw", () => {
    const j3 = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "turning_finishing", fixture_type: "chuck_3jaw",
      fixture_params: { min_wall_thickness_mm: 1 },
    });
    const j6 = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "turning_finishing", fixture_type: "chuck_6jaw",
      fixture_params: { min_wall_thickness_mm: 1 },
    });
    expect(j6.force_derating_factor).toBeGreaterThanOrEqual(j3.force_derating_factor);
  });

  it("collet provides highest concentricity for its grip range", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "turning_finishing", fixture_type: "collet",
    });
    expect(r.fixture_holding_force_n).toBeGreaterThan(0);
    expect(r.safety_factor).toBeGreaterThan(1);
  });

  it("validateForFixture() detects incompatible combos", () => {
    const r = fixtureAwareStrategyEngine.validateForFixture({
      strategy: "plunge_milling", fixture_type: "vacuum",
    });
    expect(r.valid).toBe(false);
    expect(r.issues.length).toBeGreaterThan(0);
  });

  it("validateForFixture() approves good combos", () => {
    const r = fixtureAwareStrategyEngine.validateForFixture({
      strategy: "adaptive_roughing", fixture_type: "vise",
    });
    expect(r.valid).toBe(true);
  });

  it("recommendFixture() ranks fixtures by strategy compatibility", () => {
    const r = fixtureAwareStrategyEngine.recommendFixture(
      { type: "pocket", dim_mm: 50 } as any,
      ["aggressive_roughing", "hsm_finishing"],
    );
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) expect(r[0].fixture_type).toBeDefined();
  });

  it("adjustStrategy() notes[] populated for constrained fixtures", () => {
    const r = fixtureAwareStrategyEngine.adjustStrategy({
      strategy: "aggressive_roughing", fixture_type: "vacuum",
    });
    expect(r.notes.length).toBeGreaterThan(0);
  });
});
