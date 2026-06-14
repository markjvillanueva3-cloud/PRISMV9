/**
 * ChipTypePredictionShimEquivalence.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-02C-D (slot:juliett, 2026-05-23).
 *
 * Bit-equivalence between the engine's pre-shim inline predictChipType()
 * (UltimateSpeedFeedEngine.ts line 1152 pre-2026-05-23) and the post-shim
 * ChipTypePredictionModel.predictCompat() static method.
 *
 * Rule precedence (verbatim relocation from Ernst-Merchant 1941 / Komanduri 1982):
 *   discontinuous (override) → segmented (high HB / ISO-S) → BUE (Vc < threshold)
 *   → lamellar (Vc>150 + HB>250) → continuous (+ wrap-note if N + Vc>100) → fallback
 *
 * This commit closes U-SFPSN-02C (4 of 4 sub-shims complete).
 *
 * Pattern matches U-SFPSN-02A/03/04/05/02C-A/02C-B/02C-C shims.
 */

import { describe, it, expect } from "vitest";
import { ChipTypePredictionModel } from "../algorithms/ChipTypePredictionModel.js";

interface MatStub {
  aliases: string[];
  iso_group: string;
  chip_type: string;
  built_up_edge_risk: string;
}

// Frozen baseline — verbatim relocation of pre-shim predictChipType (UltimateSpeedFeedEngine.ts:1152)
const OLD_BUE_THRESHOLDS: Record<string, number> = {
  aluminum: 200, brass: 150, copper: 120,
  steel: 50, alloy_steel: 40, stainless_steel: 30,
  cast_iron: 999,
  titanium: 25, inconel: 15, hardened_steel: 10,
};

function oldPredictChipType(
  Vc_mpm: number, hardness_hb: number, mat: MatStub,
): { type: string; confidence: number; risk_notes: string[] } {
  const notes: string[] = [];
  const bueThreshold = OLD_BUE_THRESHOLDS[
    Object.keys(OLD_BUE_THRESHOLDS).find(k =>
      mat.aliases.some(a => a.includes(k)) || k === mat.iso_group
    ) || "steel"
  ] || 50;
  if (mat.chip_type === "discontinuous") {
    return { type: "discontinuous", confidence: 0.85, risk_notes: notes };
  }
  if (hardness_hb > 350 || mat.iso_group === "S") {
    notes.push("Segmented chips — intermittent cutting forces, potential tool fracture");
    return { type: "segmented", confidence: 0.70, risk_notes: notes };
  }
  if (mat.built_up_edge_risk !== "none" && Vc_mpm < bueThreshold) {
    notes.push(`BUE risk below ${bueThreshold} m/min — increase speed or use DLC/polished coating`);
    return { type: "built_up_edge", confidence: 0.75, risk_notes: notes };
  }
  if (Vc_mpm > 150 && hardness_hb > 250) {
    return { type: "lamellar", confidence: 0.60, risk_notes: notes };
  }
  if (mat.chip_type === "continuous") {
    if (Vc_mpm > 100 && mat.iso_group === "N") {
      notes.push("Long continuous chips — spindle wrapping risk, use chipbreaker");
    }
    return { type: "continuous", confidence: 0.80, risk_notes: notes };
  }
  return { type: mat.chip_type, confidence: 0.60, risk_notes: notes };
}

const ALUMINUM: MatStub = { aliases: ["aluminum", "6061"], iso_group: "N", chip_type: "continuous", built_up_edge_risk: "high" };
const STEEL_1018: MatStub = { aliases: ["steel", "1018"], iso_group: "P", chip_type: "continuous", built_up_edge_risk: "medium" };
const STAINLESS_316: MatStub = { aliases: ["stainless_steel", "316"], iso_group: "M", chip_type: "continuous", built_up_edge_risk: "high" };
const CAST_IRON: MatStub = { aliases: ["cast_iron", "gg25"], iso_group: "K", chip_type: "discontinuous", built_up_edge_risk: "none" };
const TITANIUM: MatStub = { aliases: ["titanium", "ti6al4v"], iso_group: "S", chip_type: "segmented", built_up_edge_risk: "medium" };
const INCONEL: MatStub = { aliases: ["inconel", "718"], iso_group: "S", chip_type: "segmented", built_up_edge_risk: "low" };
const HARDENED_TOOL: MatStub = { aliases: ["hardened_steel", "d2"], iso_group: "H", chip_type: "segmented", built_up_edge_risk: "none" };

const MATS = [ALUMINUM, STEEL_1018, STAINLESS_316, CAST_IRON, TITANIUM, INCONEL, HARDENED_TOOL];
const VC_VALUES = [10, 25, 60, 100, 200, 400];
const HB_VALUES = [80, 150, 250, 320, 400, 550];

describe("SF-PSN-WIRE-MS0/U-SFPSN-02C-D — ChipTypePredictionModel shim bit-equivalence to inline predictChipType", () => {
  it("bit-equivalence on full fixture grid (7 materials × 6 Vc × 6 HB = 252 fixtures) — exact type + confidence + notes match", () => {
    let fixtures = 0;
    for (const mat of MATS) {
      for (const Vc of VC_VALUES) {
        for (const hb of HB_VALUES) {
          const baseline = oldPredictChipType(Vc, hb, mat);
          const shim = ChipTypePredictionModel.predictCompat(Vc, hb, mat);
          expect(shim.type).toBe(baseline.type);
          expect(shim.confidence).toBe(baseline.confidence);
          expect(shim.risk_notes).toEqual(baseline.risk_notes);
          fixtures++;
        }
      }
    }
    expect(fixtures).toBe(252);
  });

  it("discontinuous override (cast iron at any Vc/HB returns 'discontinuous' with confidence 0.85)", () => {
    const cases = [[10, 80], [400, 550], [100, 250]] as const;
    for (const [Vc, hb] of cases) {
      const result = ChipTypePredictionModel.predictCompat(Vc, hb, CAST_IRON);
      expect(result.type).toBe("discontinuous");
      expect(result.confidence).toBe(0.85);
      expect(result.risk_notes).toEqual([]);
    }
  });

  it("segmented at ISO-S returns confidence 0.70 with the documented warning note", () => {
    const result = ChipTypePredictionModel.predictCompat(100, 250, TITANIUM);
    expect(result.type).toBe("segmented");
    expect(result.confidence).toBe(0.70);
    expect(result.risk_notes).toEqual(["Segmented chips — intermittent cutting forces, potential tool fracture"]);
  });

  it("segmented at hardness > 350 (P-group) returns 'segmented' regardless of ISO group", () => {
    const hardP: MatStub = { aliases: ["steel"], iso_group: "P", chip_type: "continuous", built_up_edge_risk: "low" };
    const result = ChipTypePredictionModel.predictCompat(100, 400, hardP);
    expect(result.type).toBe("segmented");
  });

  it("BUE for aluminum below 200 m/min returns 'built_up_edge' with threshold in note", () => {
    const result = ChipTypePredictionModel.predictCompat(60, 80, ALUMINUM);
    expect(result.type).toBe("built_up_edge");
    expect(result.confidence).toBe(0.75);
    expect(result.risk_notes[0]).toContain("BUE risk below 200 m/min");
  });

  it("BUE threshold lookup honors aliases.includes(k) — '6061' alias matches 'aluminum' key via includes", () => {
    const result = ChipTypePredictionModel.predictCompat(60, 80, ALUMINUM);
    // 6061 is in aliases; "aluminum" key matches via aliases.some(a=>a.includes("aluminum")) → threshold 200
    expect(result.type).toBe("built_up_edge");
    expect(result.risk_notes[0]).toContain("200 m/min");
  });

  it("lamellar fires when Vc > 150 AND HB > 250 AND no BUE/segmented (P-group example)", () => {
    const result = ChipTypePredictionModel.predictCompat(200, 300, STEEL_1018);
    expect(result.type).toBe("lamellar");
    expect(result.confidence).toBe(0.60);
  });

  it("continuous + ISO-N high-speed adds spindle-wrap note (Vc>100 AND iso_group='N')", () => {
    const result = ChipTypePredictionModel.predictCompat(200, 80, ALUMINUM);
    expect(result.type).toBe("continuous");
    expect(result.confidence).toBe(0.80);
    expect(result.risk_notes).toEqual(["Long continuous chips — spindle wrapping risk, use chipbreaker"]);
  });

  it("BUE_SPEED_THRESHOLDS_COMPAT exports the documented 10-row table", () => {
    expect(Object.keys(ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT).sort()).toEqual([
      "alloy_steel", "aluminum", "brass", "cast_iron", "copper", "hardened_steel",
      "inconel", "stainless_steel", "steel", "titanium",
    ]);
    expect(ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT.aluminum).toBe(200);
    expect(ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT.cast_iron).toBe(999);
    expect(ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT.hardened_steel).toBe(10);
  });
});
