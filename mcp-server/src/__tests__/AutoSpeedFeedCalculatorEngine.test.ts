/**
 * Tests for AutoSpeedFeedCalculatorEngine — speed/feed calculator for Okuma macros.
 *
 * Coverage targets (per CLAUDE.md engine-test conventions):
 *   - calcRPM:            imperial + metric formula, edge zero/negative
 *   - applyG50Clamp:      default G50 by op, override, machine-max interaction
 *   - scaleBoringBarFeed: every L/D rigidity band (1.0 / 0.75 / 0.50 / 0.25 / 0.15)
 *   - calcPeckSchedule:   steel vs non-ferrous multipliers, depth shorter than firstPeck
 *   - calcFinishFeed:     Brammertz inverse, unit-system roundtrip
 *   - calculate (e2e):    RPM clamping, feed scaling, force/power, Ra finish-warn
 *
 * Reference oracles (Machinery's Handbook 31st ed., Sandvik Coromant General Turning 2024):
 *   - Imperial:  RPM = round(SFM * 12 / (π * D_in)) = round(SFM * 3.8197 / D_in)
 *   - Metric:    RPM = round(1000 * Vc / (π * D_mm))     (constants.ts:rpmFromVc)
 *   - Brammertz: Ra[µm] = fz² / (32·r) · 1000             (constants.ts:predictedRa)
 *
 * No physics constants are inlined here — reference values are derived from the
 * canonical formulas above. See src/physics/constants.ts for the source of truth.
 */
import { describe, it, expect } from "vitest";
import {
  AutoSpeedFeedCalculatorEngine,
  type AutoSFInput,
  type AutoSFOperation,
} from "../engines/AutoSpeedFeedCalculatorEngine.js";

const engine = new AutoSpeedFeedCalculatorEngine();

/** Build a minimal valid operation; overrides win. */
function op(overrides: Partial<AutoSFOperation> = {}): AutoSFOperation {
  return {
    station: 1,
    operation: "od_rough",
    sfm: 300,
    feed: 0.012,
    cutting_diameter: 2.0,
    ...overrides,
  };
}

/** Build a minimal valid input; overrides win. */
function input(opOverrides: Partial<AutoSFOperation> = {}, inputOverrides: Partial<AutoSFInput> = {}): AutoSFInput {
  return {
    unit_system: "imperial",
    operations: [op(opOverrides)],
    ...inputOverrides,
  };
}

describe("AutoSpeedFeedCalculatorEngine", () => {

  // ──────────────────────────────────────────────────────────────────────────
  describe("calcRPM()", () => {
    it("imperial: 300 SFM at 2.0\" diameter → 573 RPM (300·3.8197/2 = 572.955)", () => {
      expect(engine.calcRPM(300, 2.0, "imperial")).toBe(573);
    });

    it("imperial: 500 SFM at 1.0\" diameter → 1910 RPM (500·3.8197 = 1909.85)", () => {
      expect(engine.calcRPM(500, 1.0, "imperial")).toBe(1910);
    });

    it("imperial: large SFM, small diameter scales correctly (1000 SFM, 0.5\")", () => {
      // 1000 · 3.8197 / 0.5 = 7639.4 → round → 7639
      expect(engine.calcRPM(1000, 0.5, "imperial")).toBe(7639);
    });

    it("metric: 200 m/min Vc at 20 mm diameter → 3183 RPM (canonical rpmFromVc)", () => {
      // 1000 * 200 / (π · 20) = 3183.0989… → 3183
      expect(engine.calcRPM(200, 20, "metric")).toBe(3183);
    });

    it("metric: 100 m/min Vc at 10 mm diameter → 3183 RPM (same identity, half-scale)", () => {
      expect(engine.calcRPM(100, 10, "metric")).toBe(3183);
    });

    it("returns 0 when diameter is zero (division guard)", () => {
      expect(engine.calcRPM(300, 0, "imperial")).toBe(0);
      expect(engine.calcRPM(300, 0, "metric")).toBe(0);
    });

    it("returns 0 when sfm is zero or negative", () => {
      expect(engine.calcRPM(0, 2.0, "imperial")).toBe(0);
      expect(engine.calcRPM(-100, 2.0, "imperial")).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("applyG50Clamp()", () => {
    it("clamps raw RPM down to default G50 for od_rough (2500)", () => {
      const r = engine.applyG50Clamp(5000, "od_rough", undefined, 4500);
      expect(r.clamped_rpm).toBe(2500);
      expect(r.g50_value).toBe(2500);
      expect(r.was_clamped).toBe(true);
    });

    it("does NOT clamp when raw RPM is already below the G50 limit", () => {
      const r = engine.applyG50Clamp(1500, "od_rough", undefined, 4500);
      expect(r.clamped_rpm).toBe(1500);
      expect(r.was_clamped).toBe(false);
    });

    it("clamps to the more-restrictive of override vs machine-max (override wins when lower)", () => {
      const r = engine.applyG50Clamp(5000, "od_rough", 3500, 4500);
      // min(override=3500, machineMax=4500) = 3500
      expect(r.clamped_rpm).toBe(3500);
      expect(r.g50_value).toBe(3500);
      expect(r.was_clamped).toBe(true);
    });

    it("clamps to machine-max when machine-max is more restrictive than override", () => {
      const r = engine.applyG50Clamp(5000, "od_rough", 5500, 4000);
      // min(override=5500, machineMax=4000) = 4000
      expect(r.clamped_rpm).toBe(4000);
      expect(r.g50_value).toBe(4000);
      expect(r.was_clamped).toBe(true);
    });

    it("uses conservative 6000 RPM default when machine-max is unspecified (BT40 balance G6.3)", () => {
      // No machineMax param → falls back to 6000 internal default.
      // For od_rough the default G50 (2500) is still the effective cap (lower of the two).
      const r = engine.applyG50Clamp(8000, "od_rough");
      expect(r.g50_value).toBe(2500);
      expect(r.clamped_rpm).toBe(2500);
      expect(r.was_clamped).toBe(true);
    });

    it("applies the cutoff G50 (1500 RPM — most conservative)", () => {
      const r = engine.applyG50Clamp(4000, "cutoff", undefined, 4500);
      expect(r.g50_value).toBe(1500);
      expect(r.clamped_rpm).toBe(1500);
      expect(r.was_clamped).toBe(true);
    });

    it("applies the od_finish G50 (3000 RPM — higher than rough)", () => {
      const r = engine.applyG50Clamp(4000, "od_finish", undefined, 4500);
      expect(r.g50_value).toBe(3000);
      expect(r.clamped_rpm).toBe(3000);
      expect(r.was_clamped).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("scaleBoringBarFeed()", () => {
    it("L/D ≤ 3 → full feed (factor 1.0)", () => {
      const r = engine.scaleBoringBarFeed(0.010, 10, 20); // L/D = 2.0
      expect(r.scale_factor).toBe(1.0);
      expect(r.scaled_feed).toBeCloseTo(0.010, 5);
      expect(r.reason).toContain("full feed");
    });

    it("L/D in (3, 4] → 75% feed (Sandvik Coromant rigidity rule)", () => {
      const r = engine.scaleBoringBarFeed(0.010, 10, 35); // L/D = 3.5
      expect(r.scale_factor).toBe(0.75);
      expect(r.scaled_feed).toBeCloseTo(0.0075, 5);
      expect(r.reason).toContain("75%");
    });

    it("L/D in (4, 5] → 50% feed", () => {
      const r = engine.scaleBoringBarFeed(0.010, 10, 45); // L/D = 4.5
      expect(r.scale_factor).toBe(0.50);
      expect(r.scaled_feed).toBeCloseTo(0.005, 5);
      expect(r.reason).toContain("50%");
    });

    it("L/D in (5, 6] → 25% feed", () => {
      const r = engine.scaleBoringBarFeed(0.010, 10, 55); // L/D = 5.5
      expect(r.scale_factor).toBe(0.25);
      expect(r.scaled_feed).toBeCloseTo(0.0025, 5);
      expect(r.reason).toContain("25%");
    });

    it("L/D > 6 → 15% feed with CAUTION reason", () => {
      const r = engine.scaleBoringBarFeed(0.010, 10, 70); // L/D = 7.0
      expect(r.scale_factor).toBe(0.15);
      expect(r.scaled_feed).toBeCloseTo(0.0015, 5);
      expect(r.reason).toContain("CAUTION");
    });

    it("L/D = 4.0 boundary lands in the ≤4 band (75%)", () => {
      const r = engine.scaleBoringBarFeed(0.020, 10, 40); // L/D exactly 4.0
      expect(r.scale_factor).toBe(0.75);
    });

    it("L/D = 5.0 boundary lands in the ≤5 band (50%)", () => {
      const r = engine.scaleBoringBarFeed(0.020, 10, 50); // L/D exactly 5.0
      expect(r.scale_factor).toBe(0.50);
    });

    it("invalid bar diameter (0) returns feed unchanged with reason flag", () => {
      const r = engine.scaleBoringBarFeed(0.010, 0, 30);
      expect(r.scale_factor).toBe(1.0);
      expect(r.scaled_feed).toBe(0.010);
      expect(r.reason).toContain("invalid");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("calcPeckSchedule()", () => {
    it("steel (P) imperial: drill 0.25\", depth 0.75\" → [0.25, 0.125, 0.125, 0.125, 0.125]", () => {
      // firstMult=1.0, subMult=0.5, minPeck=0.020"
      // p1=0.25  remaining=0.50
      // p2=0.125 remaining=0.375
      // p3=0.125 remaining=0.25
      // p4=0.125 remaining=0.125
      // p5=0.125 remaining=0  (loop guard: remaining > minPeck → false)
      const sched = engine.calcPeckSchedule(0.25, 0.75, "imperial", "P");
      expect(sched).toEqual([0.25, 0.125, 0.125, 0.125, 0.125]);
    });

    it("non-ferrous (N) gets larger pecks: drill 0.25\", depth 0.75\" → [0.375, 0.25, 0.125]", () => {
      // firstMult=1.5 → p1=0.375; subMult=1.0 → subPeck=0.25
      // remaining=0.375 → p2=0.25, remaining=0.125 → p3=0.125, remaining=0
      const sched = engine.calcPeckSchedule(0.25, 0.75, "imperial", "N");
      expect(sched).toEqual([0.375, 0.25, 0.125]);
    });

    it("metric default (no material) uses steel multipliers: drill 10mm depth 30mm → [10, 5, 5, 5, 5]", () => {
      const sched = engine.calcPeckSchedule(10, 30, "metric");
      expect(sched).toEqual([10, 5, 5, 5, 5]);
    });

    it("depth shorter than firstPeck → single peck equal to depth", () => {
      // drill=5mm metric P: firstMult=1.0 → firstPeck=5; depth=4 < firstPeck
      // p1 = min(firstPeck=5, remaining=4) = 4
      const sched = engine.calcPeckSchedule(5, 4, "metric", "P");
      expect(sched).toEqual([4]);
    });

    it("zero or negative drill diameter returns empty schedule", () => {
      expect(engine.calcPeckSchedule(0, 10, "metric")).toEqual([]);
      expect(engine.calcPeckSchedule(-5, 10, "metric")).toEqual([]);
    });

    it("zero or negative depth returns empty schedule", () => {
      expect(engine.calcPeckSchedule(10, 0, "metric")).toEqual([]);
      expect(engine.calcPeckSchedule(10, -1, "metric")).toEqual([]);
    });

    it("cast iron (K) is treated as non-ferrous-like (chip-breaks easily)", () => {
      // K maps to isNonFerrous=true in the engine (chip behavior)
      const sched = engine.calcPeckSchedule(0.25, 0.75, "imperial", "K");
      expect(sched).toEqual([0.375, 0.25, 0.125]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("calcFinishFeed()", () => {
    it("metric Brammertz inverse: target Ra=1.6µm, r=0.4mm → f ≈ 0.1431 mm/rev", () => {
      // f = sqrt(Ra · 32 · r / 1000) = sqrt(1.6·32·0.4/1000) = sqrt(0.02048) ≈ 0.14311
      expect(engine.calcFinishFeed(1.6, 0.4, "metric")).toBeCloseTo(0.1431, 4);
    });

    it("metric: target Ra=3.2µm, r=0.8mm → f ≈ 0.2862 mm/rev", () => {
      // sqrt(3.2·32·0.8/1000) = sqrt(0.08192) ≈ 0.28623
      expect(engine.calcFinishFeed(3.2, 0.8, "metric")).toBeCloseTo(0.2862, 4);
    });

    it("imperial roundtrip: converts nose to mm, then feed back to inches (Ra=1.6, r=0.0157\")", () => {
      // r_mm = 0.0157 · 25.4 = 0.39878
      // f_mm = sqrt(1.6·32·0.39878/1000) ≈ 0.14289
      // f_in = 0.14289 / 25.4 ≈ 0.005626
      expect(engine.calcFinishFeed(1.6, 0.0157, "imperial")).toBeCloseTo(0.0056, 4);
    });

    it("returns 0 for zero target Ra (no surface-finish demand → no feed constraint here)", () => {
      expect(engine.calcFinishFeed(0, 0.4, "metric")).toBe(0);
    });

    it("returns 0 for zero or negative nose radius (no geometry)", () => {
      expect(engine.calcFinishFeed(1.6, 0, "metric")).toBe(0);
      expect(engine.calcFinishFeed(1.6, -0.4, "metric")).toBe(0);
    });

    it("inverse-of-predictedRa identity: feeding the result back through Brammertz reproduces target Ra", () => {
      // f = calcFinishFeed(target, r) → Ra(f, r) ≈ target.  Verifies the algebra round-trips.
      const target = 1.6;
      const r_mm = 0.4;
      const f_mm = engine.calcFinishFeed(target, r_mm, "metric");
      // Brammertz: Ra = f² / (32·r) · 1000
      const ra_back = (f_mm * f_mm) / (32 * r_mm) * 1000;
      expect(ra_back).toBeCloseTo(target, 1); // 4-dp rounding in engine loses ~0.01µm precision
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("calculate() — top-level orchestration", () => {
    it("processes a clean single op: no clamp, no scale, valid Okuma lines", () => {
      const r = engine.calculate(input({ station: 1, operation: "od_rough", sfm: 300, feed: 0.012, cutting_diameter: 2.0 }));
      expect(r.operations).toHaveLength(1);
      const o = r.operations[0]!;
      expect(o.calculated_rpm).toBe(573);
      expect(o.clamped_rpm).toBe(573);
      expect(o.was_clamped).toBe(false);
      expect(o.feed_scaled).toBe(false);
      expect(o.adjusted_feed).toBeCloseTo(0.012, 5);
      expect(o.warnings).toEqual([]);
      expect(o.okuma_lines.length).toBeGreaterThanOrEqual(2);
      expect(o.okuma_lines[0]).toContain("T01");
      expect(o.okuma_lines[0]).toContain("OD ROUGH");
      expect(o.okuma_lines[1]).toContain("CALCULATED RPM = 573");
    });

    it("clamps RPM when raw exceeds G50, sets was_clamped + warning + clamp-marker in Okuma line", () => {
      // 2000 SFM @ 1.0" → 7639 raw; od_rough G50 2500 caps it.
      const r = engine.calculate(input({ sfm: 2000, cutting_diameter: 1.0 }));
      const o = r.operations[0]!;
      expect(o.calculated_rpm).toBe(7639);
      expect(o.clamped_rpm).toBe(2500);
      expect(o.was_clamped).toBe(true);
      expect(o.warnings.some(w => w.includes("RPM clamped"))).toBe(true);
      expect(o.okuma_lines[1]).toContain("[CLAMPED FROM 7639]");
      expect(r.stats.operations_clamped).toBe(1);
    });

    it("scales feed for high L/D boring bar (L/D=5 → 50%)", () => {
      const r = engine.calculate(input({
        operation: "bore_finish",
        sfm: 300,
        feed: 0.005,
        cutting_diameter: 1.0,
        bar_diameter: 0.5,
        bar_stickout: 2.5, // L/D = 5.0 → 50% feed
      }));
      const o = r.operations[0]!;
      expect(o.feed_scaled).toBe(true);
      expect(o.adjusted_feed).toBeCloseTo(0.0025, 5);
      expect(o.feed_scale_reason).toContain("50%");
      expect(r.stats.operations_feed_scaled).toBe(1);
    });

    it("emits peck schedule for drill operations using default 3xD depth when DOC unset", () => {
      const r = engine.calculate(input({
        operation: "drill",
        sfm: 200,
        feed: 0.005,
        cutting_diameter: 0.25,
        material_group: "P", // explicit steel
      }, { unit_system: "imperial" }));
      const o = r.operations[0]!;
      // default depth = 3 · 0.25 = 0.75" → same schedule as the calcPeckSchedule oracle.
      expect(o.peck_schedule).toEqual([0.25, 0.125, 0.125, 0.125, 0.125]);
    });

    it("estimates cutting force + power when DOC + material_group are provided (P-group steel)", () => {
      const r = engine.calculate(input({
        operation: "od_rough",
        sfm: 300,
        feed: 0.012,
        cutting_diameter: 2.0,
        doc: 0.05,
        material_group: "P",
      }));
      const o = r.operations[0]!;
      // Sanity: force and power must be positive finite numbers and power within default 15 kW machine.
      expect(o.estimated_force_n).toBeGreaterThan(0);
      expect(o.estimated_power_kw).toBeGreaterThan(0);
      expect(o.power_ok).toBe(true);
      expect(r.stats.max_power_kw).toBeGreaterThan(0);
    });

    it("flags POWER EXCEEDED when estimated power exceeds machine_power_kw budget", () => {
      // Heavy cut on hardened steel (kc1.1=3200, mc=0.30) on a 5 kW machine.
      const r = engine.calculate({
        unit_system: "imperial",
        machine_power_kw: 5,
        operations: [op({
          operation: "od_rough",
          sfm: 400,
          feed: 0.015,
          cutting_diameter: 2.0,
          doc: 0.150,
          material_group: "H",
        })],
      });
      const o = r.operations[0]!;
      expect(o.power_ok).toBe(false);
      expect(o.warnings.some(w => w.includes("POWER EXCEEDED"))).toBe(true);
    });

    it("predicts surface finish Ra and warns when finish op exceeds 3.2µm target", () => {
      // Generous feed + small nose → Ra well above 3.2 µm on an id_finish op.
      // r_mm = 0.005·25.4 = 0.127, f_mm = 0.006·25.4 = 0.1524
      // Ra = 0.1524² / (32·0.127) · 1000 ≈ 5.7150 µm; engine rounds to 5.72
      const r = engine.calculate(input({
        operation: "id_finish",
        sfm: 300,
        feed: 0.006,
        cutting_diameter: 1.0,
        nose_radius: 0.005,
      }));
      const o = r.operations[0]!;
      expect(o.predicted_ra_um).toBeCloseTo(5.72, 2);
      expect(o.warnings.some(w => w.includes("Predicted Ra") && w.includes("exceeds"))).toBe(true);
    });

    it("aggregates stats across a multi-op program", () => {
      const r = engine.calculate({
        unit_system: "imperial",
        operations: [
          op({ station: 1, operation: "od_rough", sfm: 2000, cutting_diameter: 1.0 }), // clamps
          op({ station: 2, operation: "bore_finish", sfm: 300, feed: 0.005, cutting_diameter: 1.0, bar_diameter: 0.5, bar_stickout: 2.5 }), // scales feed
          op({ station: 3, operation: "od_finish", sfm: 400, cutting_diameter: 2.0 }),  // clean
        ],
      });
      expect(r.operations).toHaveLength(3);
      expect(r.stats.total_operations).toBe(3);
      expect(r.stats.operations_clamped).toBe(1);
      expect(r.stats.operations_feed_scaled).toBe(1);
      // Combined Okuma lines = sum of per-op lines (≥ 3 headers).
      expect(r.all_okuma_lines.length).toBeGreaterThanOrEqual(3);
      expect(r.all_okuma_lines.some(l => l.includes("T01"))).toBe(true);
      expect(r.all_okuma_lines.some(l => l.includes("T02"))).toBe(true);
      expect(r.all_okuma_lines.some(l => l.includes("T03"))).toBe(true);
    });

    it("metric e2e: 200 m/min Vc on 20mm diameter produces 3183 RPM (matches canonical rpmFromVc)", () => {
      const r = engine.calculate({
        unit_system: "metric",
        operations: [op({ station: 1, operation: "od_rough", sfm: 200, feed: 0.3, cutting_diameter: 20 })],
      });
      const o = r.operations[0]!;
      expect(o.calculated_rpm).toBe(3183);
      // od_rough G50 2500, default machine max 4500 → effective 2500 → clamped.
      expect(o.clamped_rpm).toBe(2500);
      expect(o.was_clamped).toBe(true);
    });

    it("respects per-op max_rpm_override even when default G50 is more permissive", () => {
      // od_finish default G50 = 3000; override to 1800 → cap drops below default.
      const r = engine.calculate(input({
        operation: "od_finish",
        sfm: 1000,
        feed: 0.005,
        cutting_diameter: 1.0,
        max_rpm_override: 1800,
      }));
      const o = r.operations[0]!;
      expect(o.g50_value).toBe(1800);
      expect(o.clamped_rpm).toBe(1800);
      expect(o.was_clamped).toBe(true);
    });
  });
});
