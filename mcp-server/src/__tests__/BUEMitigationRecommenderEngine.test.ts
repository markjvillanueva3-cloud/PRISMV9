import { describe, it, expect } from "vitest";
import { bueMitigationRecommenderEngine as eng } from "../engines/BUEMitigationRecommenderEngine.js";
import { BUEOnsetThresholdEngine } from "../engines/BUEOnsetThresholdEngine.js";

/**
 * UNIT-0011 BUEMitigationRecommenderEngine -- composes BUEOnsetThresholdEngine to rank mitigation
 * levers. ISO P BUE band is [30, 110] m/min (peak ~60, safeMin 120); Vc=60 is deep in the band.
 * Tests verify the composition logic + direction + ranking (the onset risk formula is covered by
 * BUEOnsetThresholdEngine's own tests).
 */
const inBand = { cutting_speed_m_per_min: 60, iso_group: "P" as const, tool_material: "uncoated_carbide" as const, rake_angle_deg: 0 };

describe("BUEMitigationRecommenderEngine.recommend -- in the BUE band (P steel, Vc=60)", () => {
  it("flags the risk band and returns a non-empty ranked mitigation list", () => {
    const r = eng.recommend(inBand);
    expect(r.in_risk_band).toBe(true);
    expect(r.current_risk_score).toBeGreaterThan(0);
    expect(r.ranked_mitigations.length).toBeGreaterThanOrEqual(4); // raise_vc + 2 rake + coating + coolant
  });

  it("includes the primary raise_cutting_speed lever aiming above the band (>= safeMin 120)", () => {
    const r = eng.recommend(inBand);
    const raise = r.ranked_mitigations.find((l) => l.lever === "raise_cutting_speed")!;
    expect(raise.quantified).toBe(true);
    expect(raise.action).toMatch(/>= 120 m\/min/);
    expect(raise.risk_reduction).toBeGreaterThan(0); // raising Vc out of the band lowers risk
  });

  it("raise_cutting_speed new_risk_score MATCHES the onset engine re-evaluated at the safe Vc (composition is faithful)", () => {
    const r = eng.recommend(inBand);
    const raise = r.ranked_mitigations.find((l) => l.lever === "raise_cutting_speed")!;
    const direct = new BUEOnsetThresholdEngine().evaluate({ cutting_speed_m_per_min: 120, iso_group: "P", tool_material: "uncoated_carbide", rake_angle_deg: 0 });
    expect(raise.new_risk_score).toBeCloseTo(direct.risk_score, 4);
  });

  it("increase_rake levers are quantified and REDUCE risk (positive rake suppresses BUE)", () => {
    const r = eng.recommend(inBand);
    const rakeLevers = r.ranked_mitigations.filter((l) => l.lever.startsWith("increase_rake"));
    expect(rakeLevers.length).toBe(2); // default +5, +10
    for (const l of rakeLevers) {
      expect(l.quantified).toBe(true);
      expect(l.risk_reduction).toBeGreaterThanOrEqual(0);
      expect(l.new_risk_score).toBeLessThanOrEqual(r.current_risk_score);
    }
  });

  it("a larger rake increase reduces risk at least as much as a smaller one (monotone)", () => {
    const r = eng.recommend(inBand);
    const p5 = r.ranked_mitigations.find((l) => l.lever === "increase_rake_+5deg")!;
    const p10 = r.ranked_mitigations.find((l) => l.lever === "increase_rake_+10deg")!;
    expect(p10.risk_reduction!).toBeGreaterThanOrEqual(p5.risk_reduction!);
  });

  it("coating + coolant appear as QUALITATIVE levers (quantified=false, no fabricated number)", () => {
    const r = eng.recommend(inBand);
    const coating = r.ranked_mitigations.find((l) => l.lever === "coating_change")!;
    const coolant = r.ranked_mitigations.find((l) => l.lever === "coolant_upgrade")!;
    expect(coating.quantified).toBe(false);
    expect(coating.new_risk_score).toBeNull();
    expect(coating.risk_reduction).toBeNull();
    expect(coolant.quantified).toBe(false);
  });

  it("ranking puts quantified levers ahead of the qualitative ones", () => {
    const r = eng.recommend(inBand);
    const firstQualitativeIdx = r.ranked_mitigations.findIndex((l) => !l.quantified);
    const lastQuantifiedIdx = r.ranked_mitigations.map((l) => l.quantified).lastIndexOf(true);
    expect(lastQuantifiedIdx).toBeLessThan(firstQualitativeIdx); // all quantified precede all qualitative
  });
});

describe("BUEMitigationRecommenderEngine.recommend -- edge cases (never throws)", () => {
  it("Vc above the band (200 m/min) -> not in band, no mitigations, advisory warning", () => {
    const r = eng.recommend({ ...inBand, cutting_speed_m_per_min: 200 });
    expect(r.in_risk_band).toBe(false);
    expect(r.ranked_mitigations).toHaveLength(0);
    expect(r.warnings.some((w) => /no BUE mitigation needed/i.test(w))).toBe(true);
  });

  it("cast iron (ISO K, not BUE-prone) -> not in band, no mitigations", () => {
    const r = eng.recommend({ ...inBand, iso_group: "K" });
    expect(r.in_risk_band).toBe(false);
    expect(r.ranked_mitigations).toHaveLength(0);
  });

  it("rake increase that would exceed the +/-30 deg model limit is skipped with a warning", () => {
    const r = eng.recommend({ ...inBand, rake_angle_deg: 25 }); // 25 + 10 = 35 > 30
    expect(r.warnings.some((w) => /exceeds the 30 deg model limit/i.test(w))).toBe(true);
    expect(r.ranked_mitigations.some((l) => l.lever === "increase_rake_+10deg")).toBe(false);
  });

  it("custom candidate rake increases are honored", () => {
    const r = eng.recommend({ ...inBand, candidate_rake_increases_deg: [3] });
    expect(r.ranked_mitigations.some((l) => l.lever === "increase_rake_+3deg")).toBe(true);
    expect(r.ranked_mitigations.some((l) => l.lever === "increase_rake_+5deg")).toBe(false);
  });

  it("non-positive rake increase is skipped with a warning (never throws)", () => {
    const r = eng.recommend({ ...inBand, candidate_rake_increases_deg: [0, -5] });
    expect(r.warnings.length).toBeGreaterThanOrEqual(2);
    expect(r.ranked_mitigations.some((l) => l.lever.startsWith("increase_rake"))).toBe(false);
  });
});
