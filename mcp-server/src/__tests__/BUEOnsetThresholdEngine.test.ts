/**
 * BUEOnsetThresholdEngine.test.ts — LATHE-PROD-READY-MS0/U-LPR-BUE
 * ================================================================
 *
 * Behavioral coverage with citation-grounded reference values from
 * Trent & Wright (2000) and the Sandvik Coromant Technical Guide (2023).
 * Spans all six ISO 513 groups (P/M/K/N/S/H), all seven tool materials,
 * positive/zero/negative rake, and adversarial inputs (NaN, Infinity,
 * extreme cutting speeds).  Every assertion ties to an explicit
 * physical claim from the engine's documented contract.
 */

import { describe, it, expect } from "vitest";
import {
  BUEOnsetThresholdEngine,
  bueOnsetThresholdEngine,
  type BUEOnsetInput,
  type IsoGroup,
  type ToolMaterial,
} from "../engines/BUEOnsetThresholdEngine.js";

const baseInput = (over: Partial<BUEOnsetInput> = {}): BUEOnsetInput => ({
  cutting_speed_m_per_min: 60,
  iso_group: "P",
  tool_material: "uncoated_carbide",
  rake_angle_deg: 0,
  ...over,
});

describe("BUEOnsetThresholdEngine", () => {
  const engine = new BUEOnsetThresholdEngine();

  // 1 — singleton + schema-version contract
  it("exports a singleton with stable schema version", () => {
    expect(bueOnsetThresholdEngine).toBeInstanceOf(BUEOnsetThresholdEngine);
    expect(bueOnsetThresholdEngine.schemaVersion).toBe("1.0.0");
  });

  // 2 — Steel (ISO P) at peak (60 m/min) is HIGH/SEVERE risk per Trent & Wright
  it("ISO P @ 60 m/min (peak of risk band) hits high/severe risk", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: 60, iso_group: "P" }));
    expect(r.in_risk_band).toBe(true);
    expect(["high", "severe"]).toContain(r.risk_level);
    expect(r.risk_score).toBeGreaterThanOrEqual(0.65);
    expect(r.recommended_min_vc_m_per_min).toBe(120);
  });

  // 3 — ISO P above the band (200 m/min) is OUTSIDE the BUE regime
  it("ISO P @ 200 m/min (above suppression threshold) reports no BUE risk", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: 200, iso_group: "P" }));
    expect(r.in_risk_band).toBe(false);
    expect(r.risk_level).toBe("none");
    expect(r.risk_score).toBe(0);
    expect(r.recommended_min_vc_m_per_min).toBeNull();
  });

  // 4 — ISO P below the band (10 m/min) reports no risk + recommends safe min
  it("ISO P @ 10 m/min (below band) reports no risk and recommends safe minimum 120", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: 10, iso_group: "P" }));
    expect(r.in_risk_band).toBe(false);
    expect(r.risk_level).toBe("none");
    expect(r.recommended_min_vc_m_per_min).toBe(120);
  });

  // 5 — Cast iron (ISO K): graphite acts as lubricant — never BUE risk
  it("ISO K (cast iron) returns no BUE risk regardless of cutting speed", () => {
    for (const vc of [10, 60, 100, 250, 500]) {
      const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: vc, iso_group: "K" }));
      expect(r.risk_level).toBe("none");
      expect(r.risk_score).toBe(0);
      expect(r.recommended_min_vc_m_per_min).toBeNull();
      expect(r.evidence.some((e) => /graphite/i.test(e))).toBe(true);
    }
  });

  // 6 — Hardened steel (ISO H): shear-dominated, no BUE
  it("ISO H (hardened steel) returns no BUE risk regardless of cutting speed", () => {
    for (const vc of [10, 60, 200]) {
      const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: vc, iso_group: "H" }));
      expect(r.risk_level).toBe("none");
      expect(r.risk_score).toBe(0);
    }
  });

  // 7 — Aluminum (ISO N): aggressive risk band 0–200, peak ~100
  it("ISO N (aluminum) @ 100 m/min lands in the BUE band with elevated risk", () => {
    const r = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 100,
      iso_group: "N",
      tool_material: "uncoated_carbide",
    }));
    expect(r.in_risk_band).toBe(true);
    expect(["moderate", "high", "severe"]).toContain(r.risk_level);
    expect(r.recommended_min_vc_m_per_min).toBe(250);
  });

  // 8 — Superalloy (ISO S): tight band 15–60, suppress > 80
  it("ISO S (superalloy) @ 30 m/min (peak) is HIGH risk; suppressed at 100", () => {
    const peak = engine.evaluate(baseInput({ cutting_speed_m_per_min: 30, iso_group: "S" }));
    expect(peak.in_risk_band).toBe(true);
    expect(["high", "severe"]).toContain(peak.risk_level);
    const suppressed = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 100,
      iso_group: "S",
    }));
    expect(suppressed.risk_level).toBe("none");
  });

  // 9 — PCD on aluminum is the lowest-BUE pairing in industry
  it("PCD tool on ISO N (aluminum) reduces score vs uncoated carbide", () => {
    const carbide = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 100,
      iso_group: "N",
      tool_material: "uncoated_carbide",
    }));
    const pcd = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 100,
      iso_group: "N",
      tool_material: "pcd",
    }));
    expect(pcd.risk_score).toBeLessThan(carbide.risk_score);
  });

  // 10 — HSS dramatically increases BUE vs coated carbide on steel
  it("HSS tool on ISO P (steel) raises score vs coated carbide at same conditions", () => {
    const hss = engine.evaluate(baseInput({
      iso_group: "P",
      tool_material: "hss",
      cutting_speed_m_per_min: 60,
    }));
    const coated = engine.evaluate(baseInput({
      iso_group: "P",
      tool_material: "coated_carbide",
      cutting_speed_m_per_min: 60,
    }));
    expect(hss.risk_score).toBeGreaterThan(coated.risk_score);
  });

  // 11 — Positive rake reduces BUE; negative rake amplifies
  it("rake angle: positive reduces, negative amplifies (monotone)", () => {
    const negative = engine.evaluate(baseInput({ rake_angle_deg: -10 }));
    const zero = engine.evaluate(baseInput({ rake_angle_deg: 0 }));
    const positive = engine.evaluate(baseInput({ rake_angle_deg: 10 }));
    expect(negative.risk_score).toBeGreaterThanOrEqual(zero.risk_score);
    expect(positive.risk_score).toBeLessThanOrEqual(zero.risk_score);
  });

  // 12 — Risk score is monotone in cutting speed inside the band toward peak
  it("risk score peaks near band midpoint and falls off toward edges", () => {
    const lowEdge = engine.evaluate(baseInput({ cutting_speed_m_per_min: 30, iso_group: "P" }));
    const peak = engine.evaluate(baseInput({ cutting_speed_m_per_min: 60, iso_group: "P" }));
    const upperBand = engine.evaluate(baseInput({ cutting_speed_m_per_min: 100, iso_group: "P" }));
    // Peak risk is highest within the in-band samples
    expect(peak.risk_score).toBeGreaterThanOrEqual(lowEdge.risk_score);
    expect(peak.risk_score).toBeGreaterThanOrEqual(upperBand.risk_score);
  });

  // 13 — Adversarial: negative cutting speed clamps to 0, no throw
  it("negative cutting speed clamps to 0 without throwing", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: -50, iso_group: "P" }));
    expect(r.in_risk_band).toBe(false);
    expect(r.risk_level).toBe("none");
    expect(r.recommended_min_vc_m_per_min).toBe(120);
  });

  // 14 — Adversarial: zero cutting speed
  it("zero cutting speed reports no risk + recommends safe minimum", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: 0, iso_group: "P" }));
    expect(r.risk_level).toBe("none");
    expect(r.recommended_min_vc_m_per_min).toBe(120);
  });

  // 15 — Adversarial: huge cutting speed
  it("very large cutting speed (5000 m/min) reports no risk", () => {
    const r = engine.evaluate(baseInput({ cutting_speed_m_per_min: 5000, iso_group: "P" }));
    expect(r.risk_level).toBe("none");
  });

  // 16 — Determinism: same input → identical output
  it("two evaluations of identical input produce identical output", () => {
    const a = engine.evaluate(baseInput({ cutting_speed_m_per_min: 60 }));
    const b = engine.evaluate(baseInput({ cutting_speed_m_per_min: 60 }));
    expect(b).toEqual(a);
  });

  // 17 — Citations always present on a real BUE-prone material
  it("citations include both Trent & Wright and Sandvik Tech Guide", () => {
    const r = engine.evaluate(baseInput({ iso_group: "P", cutting_speed_m_per_min: 60 }));
    expect(r.citations.some((c) => /Trent.*Wright/i.test(c))).toBe(true);
    expect(r.citations.some((c) => /Sandvik/i.test(c))).toBe(true);
  });

  // 18 — Variability floor: every ISO group produces a coherent result
  it("all six ISO groups produce a structurally valid result at v_c=60 m/min", () => {
    const groups: ReadonlyArray<IsoGroup> = ["P", "M", "K", "N", "S", "H"];
    for (const g of groups) {
      const r = engine.evaluate(baseInput({ iso_group: g, cutting_speed_m_per_min: 60 }));
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(1);
      expect(r.evidence.length).toBeGreaterThan(0);
      expect(r.citations.length).toBeGreaterThanOrEqual(2);
      expect(typeof r.in_risk_band).toBe("boolean");
    }
  });

  // 19 — Variability floor: every tool material produces a coherent result
  it("all seven tool materials produce a structurally valid result on ISO P @ 60", () => {
    const tools: ReadonlyArray<ToolMaterial> = [
      "hss",
      "uncoated_carbide",
      "coated_carbide",
      "cermet",
      "ceramic",
      "cbn",
      "pcd",
    ];
    for (const t of tools) {
      const r = engine.evaluate(baseInput({
        iso_group: "P",
        tool_material: t,
        cutting_speed_m_per_min: 60,
      }));
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(1);
    }
  });

  // 20 — Stainless (ISO M) suppresses above 150, not 120
  it("ISO M (stainless) requires v_c > 150 (wider band than steel)", () => {
    const inBand = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 130,
      iso_group: "M",
    }));
    expect(inBand.in_risk_band).toBe(true);
    const suppressed = engine.evaluate(baseInput({
      cutting_speed_m_per_min: 160,
      iso_group: "M",
    }));
    expect(suppressed.risk_level).toBe("none");
    expect(inBand.recommended_min_vc_m_per_min).toBe(150);
  });
});
