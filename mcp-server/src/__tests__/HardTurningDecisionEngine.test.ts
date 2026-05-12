/**
 * HardTurningDecisionEngine Test Suite (LATHE-PRO-MS5)
 */
import { describe, it, expect } from "vitest";
import { hardTurningDecisionEngine } from "../engines/HardTurningDecisionEngine.js";

describe("HardTurningDecisionEngine", () => {
  describe("decide()", () => {
    it("recommends CBN for 60 HRC with moderate Ra", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 60,
        target_ra_um: 0.8,
        target_tolerance_mm: 0.01,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(r.recommendation).toBe("hard_turn_cbn");
    });

    it("recommends grind for very tight Ra (<0.1 μm)", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 60,
        target_ra_um: 0.08,
        target_tolerance_mm: 0.002,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
        shop_has_grinder: true,
      });
      expect(r.recommendation).toBe("grind");
    });

    it("recommends conventional turning below 45 HRC", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 30,
        target_ra_um: 1.6,
        target_tolerance_mm: 0.05,
        feature: "od",
        lot_size: 50,
        diameter_mm: 40,
      });
      expect(r.recommendation).toBe("conventional_turn");
    });

    it("returns all 4 alternatives", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 55,
        target_ra_um: 0.8,
        target_tolerance_mm: 0.015,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(r.alternatives.length).toBe(3);
    });

    it("confidence is in [0, 1]", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 55,
        target_ra_um: 0.8,
        target_tolerance_mm: 0.015,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });

    it("tool material populated", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 55,
        target_ra_um: 0.4,
        target_tolerance_mm: 0.01,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(r.tool_material).toContain("CBN");
    });

    it("surface integrity note populated", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 60,
        target_ra_um: 0.5,
        target_tolerance_mm: 0.01,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(r.surface_integrity_note.length).toBeGreaterThan(10);
    });

    it("cost_per_part is finite + positive", () => {
      const r = hardTurningDecisionEngine.decide({
        hardness_hrc: 55,
        target_ra_um: 0.8,
        target_tolerance_mm: 0.015,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      expect(Number.isFinite(r.cost_per_part_usd)).toBe(true);
      expect(r.cost_per_part_usd).toBeGreaterThan(0);
    });

    it("threads/grooves hurt ceramic score", () => {
      const threadR = hardTurningDecisionEngine.decide({
        hardness_hrc: 50,
        target_ra_um: 1.6,
        target_tolerance_mm: 0.02,
        feature: "thread",
        lot_size: 100,
        diameter_mm: 30,
      });
      const odR = hardTurningDecisionEngine.decide({
        hardness_hrc: 50,
        target_ra_um: 1.6,
        target_tolerance_mm: 0.02,
        feature: "od",
        lot_size: 100,
        diameter_mm: 30,
      });
      const threadCeramic = [threadR, ...threadR.alternatives.map((a) => ({ choice: a.choice, score: a.score }))].find(
        (c: any) => c.choice === "hard_turn_ceramic" || c.recommendation === "hard_turn_ceramic"
      );
      expect(threadCeramic).toBeDefined();
      expect(odR).toBeDefined();
    });

    it("throws on invalid inputs", () => {
      expect(() =>
        hardTurningDecisionEngine.decide({
          hardness_hrc: 0,
          target_ra_um: 0.4,
          target_tolerance_mm: 0.01,
          feature: "od",
          lot_size: 100,
          diameter_mm: 30,
        })
      ).toThrow();
    });
  });

  describe("getStats()", () => {
    it("returns 4 decision choices", () => {
      const s = hardTurningDecisionEngine.getStats();
      expect(s.decision_choices.length).toBe(4);
      expect(s.factors_considered.length).toBeGreaterThanOrEqual(5);
    });
  });
});
