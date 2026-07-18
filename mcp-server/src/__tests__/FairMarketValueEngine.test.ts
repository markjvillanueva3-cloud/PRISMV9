/**
 * Tests for FairMarketValueEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP03.
 */
import { describe, it, expect } from "vitest";
import { FairMarketValueEngine } from "../engines/FairMarketValueEngine.js";

const eng = new FairMarketValueEngine();

describe("FairMarketValueEngine.estimate — happy path", () => {
  it("simple job: 1hr cut + 30min setup, $75/hr machine, $50 material → FMV ≈ $238", () => {
    const r = eng.estimate({
      time_in_cut_s: 3600,
      setup_time_s: 1800,
      machine_rate_usd_per_hr: 75,
      material_spend_usd: 50,
    });
    // cycle = 1.5h × $75 = $112.50; material × 1.3 = $65; subtotal = $177.50
    // +15% overhead = $26.625; with-overhead = $204.125; +20% margin = $40.825; fmv ≈ $244.95
    expect(r.ok).toBe(true);
    expect(r.fmv_usd).toBeCloseTo(244.95, 1);
  });

  it("components add up: machine_time + material_passthrough × (1+oh) × (1+mg) ≈ fmv", () => {
    const r = eng.estimate({
      time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 100,
    });
    const c = r.components;
    // The sum identity holds within rounding
    const reconstructed = (c.machine_time_usd + c.material_passthrough_usd + c.overhead_usd + c.margin_usd);
    expect(reconstructed).toBeCloseTo(r.fmv_usd, 1);
  });

  it("custom overhead + margin overrides defaults", () => {
    const baseline = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50 });
    const aggressive = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50, target_margin_pct: 0.40 });
    expect(aggressive.fmv_usd).toBeGreaterThan(baseline.fmv_usd);
  });
});

describe("FairMarketValueEngine.estimate — verdict classification (3 spanning)", () => {
  it("charged 50% below FMV → under-charged", () => {
    const r = eng.estimate({
      time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50,
      charged_usd: 100,
    });
    expect(r.verdict).toBe("under-charged");
    expect(r.gap_pct).toBeLessThan(-0.10);
  });

  it("charged at FMV → at-market", () => {
    const fmv = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50 }).fmv_usd;
    const r = eng.estimate({
      time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50,
      charged_usd: fmv,
    });
    expect(r.verdict).toBe("at-market");
    expect(Math.abs(r.gap_pct ?? 0)).toBeLessThan(0.10);
  });

  it("charged 50% above FMV → over-charged", () => {
    const fmv = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50 }).fmv_usd;
    const r = eng.estimate({
      time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, material_spend_usd: 50,
      charged_usd: fmv * 1.5,
    });
    expect(r.verdict).toBe("over-charged");
    expect(r.gap_pct).toBeGreaterThan(0.10);
  });
});

describe("FairMarketValueEngine.estimate — failure modes (R12 fail-loud)", () => {
  it("missing time_in_cut_s → ok=false with missing-required reason", () => {
    // @ts-expect-error testing guard
    const r = eng.estimate({ machine_rate_usd_per_hr: 75, material_spend_usd: 50 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/missing-required/);
  });

  it("non-finite time → ok=false reason=invalid-time_in_cut_s", () => {
    const r = eng.estimate({ time_in_cut_s: NaN, machine_rate_usd_per_hr: 75, material_spend_usd: 50 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid-time_in_cut_s");
  });

  it("zero machine_rate → ok=false reason=invalid-machine_rate", () => {
    const r = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 0, material_spend_usd: 50 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid-machine_rate");
  });

  it("negative material → ok=false reason=invalid-material_spend", () => {
    const r = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 75, material_spend_usd: -10 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid-material_spend");
  });

  it("missing input entirely → ok=false (R12 runtime guard)", () => {
    // @ts-expect-error testing guard
    const r = eng.estimate(null);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/missing-required/);
  });
});

describe("FairMarketValueEngine.estimate — charged_usd optional", () => {
  it("no charged_usd → verdict=null gap_pct=null, FMV still computed", () => {
    const r = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 75, material_spend_usd: 50 });
    expect(r.fmv_usd).toBeGreaterThan(0);
    expect(r.verdict).toBeNull();
    expect(r.gap_pct).toBeNull();
  });

  it("non-finite charged_usd → verdict still null (R12 honest)", () => {
    const r = eng.estimate({ time_in_cut_s: 3600, machine_rate_usd_per_hr: 75, material_spend_usd: 50, charged_usd: NaN });
    expect(r.verdict).toBeNull();
  });
});
