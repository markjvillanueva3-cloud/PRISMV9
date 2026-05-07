/**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH1 — 6 unwired lathe
 * engines wired into turningDispatcher (prism_turning).
 */
import { describe, it, expect } from "vitest";
import { latheCSSOptimizerEngine } from "../engines/LatheCSSOptimizerEngine.js";
import { latheChipMechanicsEngine } from "../engines/LatheChipMechanicsEngine.js";
import { latheCoolantAdvisorEngine } from "../engines/LatheCoolantAdvisorEngine.js";
import { latheBirdNestPredictorEngine } from "../engines/LatheBirdNestPredictorEngine.js";
import { latheBlockTimeProfilerEngine } from "../engines/LatheBlockTimeProfilerEngine.js";

const MIN_OD_MM = 20;
const MAX_OD_MM = 80;
const TARGET_VC_M_MIN = 250;
const MAX_RPM = 4000;
const NEW_LATHE_ACTION_COUNT = 6;
const RAPID_FEED_MM_MIN = 10000;
const CUT_FEED_MM_MIN = 200;

describe("U-WIRE-LATHE-BATCH1 — engines verified directly", () => {
  describe("LatheCSSOptimizerEngine.optimize", () => {
    it("computes CSS rpm clamp at small diameter (G50)", () => {
      const r = latheCSSOptimizerEngine.optimize({
        min_od_mm: MIN_OD_MM,
        max_od_mm: MAX_OD_MM,
        Vc_m_min: TARGET_VC_M_MIN,
        rated_max_rpm: MAX_RPM,
      });
      expect(r.clamp_activates_at_diameter_mm).toBeGreaterThan(0);
      expect(r.recommended_clamp_rpm).toBeGreaterThan(0);
      expect(r.recommended_clamp_rpm).toBeLessThanOrEqual(MAX_RPM);
      // RPM at max OD < uncapped RPM at min OD (smaller diameter = higher rpm)
      expect(r.rpm_at_max_od).toBeLessThan(r.uncapped_rpm_at_min_od);
      expect(r.true_css_fraction + r.clamped_fraction).toBeCloseTo(1, 5);
    });

    it("throws Error when min_od > max_od (invalid range)", () => {
      expect(() =>
        latheCSSOptimizerEngine.optimize({
          min_od_mm: 50,
          max_od_mm: 20,
          Vc_m_min: TARGET_VC_M_MIN,
          rated_max_rpm: MAX_RPM,
        }),
      ).toThrow(/min_od_mm must be <= max_od_mm/);
    });
  });

  describe("LatheBirdNestPredictorEngine.predict", () => {
    it("rates risk level for ductile-steel finishing scenario", () => {
      const r = latheBirdNestPredictorEngine.predict({
        material_iso_group: "P",
        ductility: "high",
        vc_m_min: 200,
        feed_mm_rev: 0.1,
        doc_mm: 0.5,
        clearance_length_mm: 100,
        length_over_diameter: 4,
        chipbreaker: "light",
        coolant: "flood",
      });
      expect(["low", "moderate", "high", "severe"]).toContain(r.risk_level);
      expect(r.risk_score).toBeGreaterThanOrEqual(0);
      expect(r.risk_score).toBeLessThanOrEqual(1);
    });
  });

  describe("LatheChipMechanicsEngine.predictChipType", () => {
    it("predicts a valid chip type with confidence and BUE AtomicValue", () => {
      const r = latheChipMechanicsEngine.predictChipType(
        {
          cutting_speed_mpm: 200,
          feed_mm_rev: 0.15,
          depth_of_cut_mm: 1.5,
          rake_angle_deg: 6,
          coolant: "flood",
        },
        "steel",
      );
      expect(typeof r.predicted_type).toBe("string");
      expect(r.predicted_type.length).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      // bue_risk is an AtomicValue with a .value field
      expect(typeof r.bue_risk.value).toBe("number");
      expect(r.bue_risk.value).toBeGreaterThanOrEqual(0);
      expect(r.bue_risk.value).toBeLessThanOrEqual(1);
    });
  });

  describe("LatheCoolantAdvisorEngine.advise", () => {
    it("recommends a coolant mode for stainless (M-group) drilling", () => {
      const r = latheCoolantAdvisorEngine.advise({
        iso_group: "M",
        operation: "drilling",
        tool_material: "carbide",
        thru_spindle_available: true,
        sustainability_priority: "medium",
        hard_turning: false,
        deep_hole: false,
      });
      expect(typeof r.recommendation).toBe("string");
      expect(r.recommendation.length).toBeGreaterThan(0);
      expect(Array.isArray(r.reasoning)).toBe(true);
      expect(r.reasoning.length).toBeGreaterThan(0);
      expect(r.confidence).toBeGreaterThan(0);
    });
  });

  describe("LatheBlockTimeProfilerEngine.profile", () => {
    it("profiles cycle time across rapid + feed blocks with category share totals", () => {
      const r = latheBlockTimeProfilerEngine.profile({
        blocks: [
          { n: 10, category: "rapid", distance_mm: 100, rapid_rate_mm_min: RAPID_FEED_MM_MIN },
          { n: 20, category: "feed", distance_mm: 50, effective_feed_mm_min: CUT_FEED_MM_MIN },
          { n: 30, category: "feed", distance_mm: 80, effective_feed_mm_min: CUT_FEED_MM_MIN },
        ],
      });
      // feed blocks: (50+80)/200 * 60 = 39s, rapid: 100/10000 * 60 = 0.6s
      expect(r.total_seconds).toBeGreaterThan(30);
      expect(r.total_seconds).toBeLessThan(50);
      expect(Array.isArray(r.category_shares)).toBe(true);
      const feedShare = r.category_shares.find((c) => c.category === "feed");
      expect(feedShare?.total_seconds).toBeGreaterThan(35);
      expect(feedShare?.block_count).toBe(2);
    });
  });
});

describe("U-WIRE-LATHE-BATCH1 — dispatcher wiring verified by source content", () => {
  const NEW_ACTIONS = [
    "lathe_css_optimize",
    "lathe_chip_predict_type",
    "lathe_coolant_advise",
    "lathe_birdnest_predict",
    "lathe_coaxiality_runout_validate",
    "lathe_block_time_profile",
  ] as const;

  it("dispatcher source contains all 6 new action strings", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "turningDispatcher.ts",
    );
    const src = fs.readFileSync(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(NEW_LATHE_ACTION_COUNT);
    // Each action name appears at least twice (enum entry + case statement)
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });
});
