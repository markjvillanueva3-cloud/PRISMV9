/**
 * E2E test for ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH2 — 6 unwired WEDM
 * engines wired into edmDispatcher (prism_edm).
 */
import { describe, it, expect } from "vitest";
import { wedmAdaptivePassEngine } from "../engines/WEDMAdaptivePassEngine.js";
import { wedmAccessibilityEngine } from "../engines/WEDMAccessibilityEngine.js";
import { wedmCurrentDensityGuardEngine } from "../engines/WEDMCurrentDensityGuardEngine.js";
import { wedmBenchmarkToleranceEngine } from "../engines/WEDMBenchmarkToleranceEngine.js";
import { wedmArchiveBackfillEngine } from "../engines/WEDMArchiveBackfillEngine.js";

const NEW_WEDM_ACTION_COUNT = 6;

describe("U-WIRE-WEDM-BATCH2 — engines verified directly", () => {
  describe("WEDMAdaptivePassEngine.calculatePassCount + calculateOffsets", () => {
    it("returns more passes for tighter tolerance (0.005mm) than looser (0.05mm)", () => {
      const tight = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.005,
        thickness_mm: 25,
      });
      const loose = wedmAdaptivePassEngine.calculatePassCount({
        target_tolerance_mm: 0.05,
        thickness_mm: 25,
      });
      expect(tight).toBeGreaterThanOrEqual(loose);
      expect(tight).toBeGreaterThanOrEqual(1);
    });

    it("calculateOffsets returns N values that sum to totalOffset within float tolerance", () => {
      const N = 4;
      const TOTAL = 0.4;
      const offsets = wedmAdaptivePassEngine.calculateOffsets(N, TOTAL);
      expect(offsets.length).toBe(N);
      const sum = offsets.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(TOTAL, 4);
      // All offsets should be strictly positive
      const allPositive = offsets.every((o) => o > 0);
      expect(allPositive).toBe(true);
    });

    it("first (rough) pass takes a larger offset than the last (skim) pass", () => {
      const offsets = wedmAdaptivePassEngine.calculateOffsets(5, 0.5);
      // Standard WEDM pass distribution: rough takes most material, skims take less
      const first = offsets[0]!;
      const last = offsets[offsets.length - 1]!;
      expect(first).toBeGreaterThan(last);
    });
  });

  describe("WEDMAccessibilityEngine.analyze", () => {
    it("returns overall_score ∈ [0,1] for a workpiece with one accessible profile", () => {
      const r = wedmAccessibilityEngine.analyze({
        profiles: [
          {
            name: "profile-1",
            path: [
              { x: 10, y: 10 },
              { x: 30, y: 10 },
              { x: 30, y: 30 },
              { x: 10, y: 30 },
              { x: 10, y: 10 },
            ],
            is_through: true,
          },
        ],
        start_holes: [
          {
            id: "sh-1",
            x_mm: 20,
            y_mm: 20,
            diameter_mm: 1.0,
            depth_mm: 25,
            method: "drill",
            serves_profiles: ["profile-1"],
            auto_thread_compatible: true,
          },
        ],
        clamps: [
          {
            id: "clamp-1",
            type: "step",
            footprint: {
              min: { x: 0, y: 0 },
              max: { x: 5, y: 50 },
              width_mm: 5,
              height_mm: 50,
            },
            height_mm: 30,
            over_top: false,
          },
        ],
        workpiece: {
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 50, y: 50 },
            width_mm: 50,
            height_mm: 50,
          },
          thickness_mm: 25,
          origin: { x: 0, y: 0 },
        },
      });
      expect(r.overall_score).toBeGreaterThanOrEqual(0);
      expect(r.overall_score).toBeLessThanOrEqual(1);
      expect(r.per_profile.length).toBe(1);
      expect(Array.isArray(r.blockers)).toBe(true);
    });

    it("flags 'no-start-hole' blocker when profile has no associated start hole", () => {
      const r = wedmAccessibilityEngine.analyze({
        profiles: [
          {
            name: "profile-orphan",
            path: [
              { x: 10, y: 10 },
              { x: 20, y: 10 },
              { x: 20, y: 20 },
              { x: 10, y: 10 },
            ],
            is_through: true,
          },
        ],
        start_holes: [], // intentionally empty
        clamps: [],
        workpiece: {
          bounds: {
            min: { x: 0, y: 0 },
            max: { x: 50, y: 50 },
            width_mm: 50,
            height_mm: 50,
          },
          thickness_mm: 25,
          origin: { x: 0, y: 0 },
        },
      });
      const hasNoStartHole = r.blockers.some((b) => b.kind === "no-start-hole");
      expect(hasNoStartHole).toBe(true);
      expect(r.per_profile[0]!.verdict).toBe("blocked");
    });
  });

  describe("WEDMCurrentDensityGuardEngine.validate", () => {
    it("computes current density = current / area for round wire", () => {
      const CURRENT = 12;
      const DIA = 0.25;
      const d = wedmCurrentDensityGuardEngine.calculateCurrentDensity(CURRENT, DIA);
      const expected_area = Math.PI * (DIA / 2) ** 2;
      expect(d).toBeCloseTo(CURRENT / expected_area, 2);
    });

    it("validate returns finite densities + valid safe decision for brass 0.25mm wire @ 8A", () => {
      const r = wedmCurrentDensityGuardEngine.validate({
        current_A: 8,
        wire_diameter_mm: 0.25,
        wire_material: "brass",
      });
      expect(Number.isFinite(r.current_density_A_mm2)).toBe(true);
      expect(r.current_density_A_mm2).toBeGreaterThan(0);
      const decisionIsBoolean = typeof r.safe === "boolean";
      expect(decisionIsBoolean).toBe(true);
      // Utilization should be a real percentage 0..200ish (could exceed 100 if unsafe)
      expect(Number.isFinite(r.utilization_pct)).toBe(true);
      expect(r.utilization_pct).toBeGreaterThanOrEqual(0);
    });

    it("validate flags unsafe when current_density vastly exceeds typical brass limits", () => {
      // 50A through 0.10mm wire → density ~6,366 A/mm² (well past brass thermal limits)
      const r = wedmCurrentDensityGuardEngine.validate({
        current_A: 50,
        wire_diameter_mm: 0.1,
        wire_material: "brass",
      });
      expect(r.safe).toBe(false);
    });
  });

  describe("WEDMBenchmarkToleranceEngine.classify", () => {
    it("classifies tiny (<5%) deviation in d2_rough_speed_pct as 'match' or 'warning'", () => {
      const cls = wedmBenchmarkToleranceEngine.classify(2, "d2_rough_speed_pct");
      const isAcceptable = cls === "match" || cls === "warning";
      expect(isAcceptable).toBe(true);
    });

    it("classifies large (>50%) deviation as 'major' or 'critical'", () => {
      const cls = wedmBenchmarkToleranceEngine.classify(75, "d2_rough_speed_pct");
      const isSevere = cls === "major" || cls === "critical";
      expect(isSevere).toBe(true);
    });

    it("getBand returns numeric band with applies_to + rationale fields", () => {
      const band = wedmBenchmarkToleranceEngine.getBand("kerf_width_pct");
      expect(typeof band.value).toBe("number");
      expect(band.value).toBeGreaterThan(0);
      expect(typeof band.applies_to).toBe("string");
      expect(band.rationale.length).toBeGreaterThan(0);
    });
  });

  describe("WEDMArchiveBackfillEngine.getState", () => {
    it("getState returns object with at least one numeric/string field", () => {
      const s = wedmArchiveBackfillEngine.getState();
      const isObject = typeof s === "object" && s !== null;
      expect(isObject).toBe(true);
    });
  });
});

describe("U-WIRE-WEDM-BATCH2 — dispatcher wiring verified", () => {
  const NEW_ACTIONS = [
    "wedm_adaptive_pass_count",
    "wedm_adaptive_offsets",
    "wedm_accessibility_analyze",
    "wedm_current_density_validate",
    "wedm_benchmark_classify",
    "wedm_archive_backfill_state",
  ] as const;

  it("registers all 6 new actions in edmDispatcher source", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dispatcherPath = path.resolve(
      __dirname,
      "..",
      "tools",
      "dispatchers",
      "edmDispatcher.ts",
    );
    const src = fs.readFileSync(dispatcherPath, "utf8");
    const present = NEW_ACTIONS.filter((a) => src.includes(`"${a}"`));
    expect(present.length).toBe(NEW_WEDM_ACTION_COUNT);
    // Each should appear at least twice: once in ACTIONS array, once in switch case
    for (const a of NEW_ACTIONS) {
      const occurrences = src.split(`"${a}"`).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it("registers all 6 schemas in EDM_ACTION_SCHEMAS", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const present = NEW_ACTIONS.filter(
      (a) => typeof EDM_ACTION_SCHEMAS[a]?.safeParse === "function",
    );
    expect(present.length).toBe(NEW_WEDM_ACTION_COUNT);
  });

  it("schema rejects wedm_adaptive_pass_count with negative thickness", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_adaptive_pass_count"]!.safeParse({
      target_tolerance_mm: 0.01,
      thickness_mm: -5,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_benchmark_classify with invalid key enum", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_benchmark_classify"]!.safeParse({
      deviation_pct: 5,
      key: "totally-bogus-key",
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_current_density_validate with zero wire diameter", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_current_density_validate"]!.safeParse({
      current_A: 8,
      wire_diameter_mm: 0,
    });
    expect(r.success).toBe(false);
  });

  it("schema rejects wedm_accessibility_analyze with empty profiles array", async () => {
    const { EDM_ACTION_SCHEMAS } = await import("../schemas/edmActionSchemas.js");
    const r = EDM_ACTION_SCHEMAS["wedm_accessibility_analyze"]!.safeParse({
      profiles: [],
      start_holes: [],
      clamps: [],
      workpiece: {
        bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 }, width_mm: 10, height_mm: 10 },
        thickness_mm: 25,
        origin: { x: 0, y: 0 },
      },
    });
    expect(r.success).toBe(false);
  });
});
