/**
 * TurningChipUnmannedScoreEngine — per-engine tests (MS7 / U-LPC05)
 */
import { describe, it, expect } from "vitest";
import { turningChipUnmannedScoreEngine } from "../engines/TurningChipUnmannedScoreEngine.js";

function greenBase() {
  return {
    batch_quantity: 200,
    cycle_time_s: 30,
    chip_volume_mm3_per_part: 150,
    conveyor_rate_mm3_s: 50, // need 5/s → 900% headroom
    coolant_filter_life_h: 20, // batch ≈ 1.67 h → 12× ratio
    wrapping_risk_score: 10,
    mitigations_applied: 0,
  };
}

describe("TurningChipUnmannedScoreEngine", () => {
  it("GREEN when conveyor, filter, and wrapping all clear", () => {
    const r = turningChipUnmannedScoreEngine.assess(greenBase());
    expect(r.verdict).toBe("GREEN");
  });

  it("RED when conveyor headroom < 20%", () => {
    const r = turningChipUnmannedScoreEngine.assess({ ...greenBase(), conveyor_rate_mm3_s: 5.5 });
    expect(r.verdict).toBe("RED");
  });

  it("YELLOW when conveyor headroom 20-50%", () => {
    // Need 5 mm³/s, supply 7 mm³/s → 40% headroom → YELLOW.
    const r = turningChipUnmannedScoreEngine.assess({ ...greenBase(), conveyor_rate_mm3_s: 7 });
    expect(r.verdict).toBe("YELLOW");
  });

  it("RED when filter life < batch duration", () => {
    const r = turningChipUnmannedScoreEngine.assess({ ...greenBase(), coolant_filter_life_h: 0.5 });
    expect(r.verdict).toBe("RED");
  });

  it("YELLOW when filter life 1-2× batch duration", () => {
    const r = turningChipUnmannedScoreEngine.assess({ ...greenBase(), coolant_filter_life_h: 2 });
    // batch ≈ 1.67 h → ratio 1.2 → YELLOW
    expect(r.verdict).toBe("YELLOW");
  });

  it("RED on wrapping_risk_score ≥ 60 regardless of mitigations", () => {
    const r = turningChipUnmannedScoreEngine.assess({
      ...greenBase(),
      wrapping_risk_score: 70,
      mitigations_applied: 3,
    });
    expect(r.verdict).toBe("RED");
  });

  it("RED on risk ≥ 25 with zero mitigations applied", () => {
    const r = turningChipUnmannedScoreEngine.assess({
      ...greenBase(),
      wrapping_risk_score: 35,
      mitigations_applied: 0,
    });
    expect(r.verdict).toBe("RED");
  });

  it("YELLOW on risk 25-60 with at least one mitigation applied", () => {
    const r = turningChipUnmannedScoreEngine.assess({
      ...greenBase(),
      wrapping_risk_score: 40,
      mitigations_applied: 2,
    });
    expect(r.verdict).toBe("YELLOW");
  });

  it("conveyor_headroom_pct correct", () => {
    const r = turningChipUnmannedScoreEngine.assess(greenBase());
    // need 5, have 50 → (50-5)/5 = 900%
    expect(r.conveyor_headroom_pct).toBeCloseTo(900, 0);
  });

  it("filter_life_ratio correct", () => {
    const r = turningChipUnmannedScoreEngine.assess(greenBase());
    // 20h / 1.666h ≈ 12
    expect(r.filter_life_ratio).toBeGreaterThan(10);
  });

  it("reasons array populated for YELLOW/RED verdicts", () => {
    const r = turningChipUnmannedScoreEngine.assess({
      ...greenBase(),
      conveyor_rate_mm3_s: 6,
    });
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("GREEN verdict has a reassuring reason", () => {
    const r = turningChipUnmannedScoreEngine.assess(greenBase());
    expect(r.reasons.some(m => /lights-out/.test(m))).toBe(true);
  });

  it("batch_duration_h = batch × cycle / 3600", () => {
    const r = turningChipUnmannedScoreEngine.assess(greenBase());
    expect(r.batch_duration_h).toBeCloseTo((200 * 30) / 3600, 2);
  });
});
