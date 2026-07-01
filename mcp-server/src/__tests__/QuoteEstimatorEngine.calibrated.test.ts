/**
 * QuoteEstimatorEngine.estimateCalibrated — U-QP-CALIBRATION-WIRE tests
 *
 * Verifies the runtime calibration application is correct and backward-compat
 * preserved. NOT a full test of estimate() — only the calibrated wrapper.
 *
 * Coverage:
 *   - happy path: calibration applied + base+post fields populated
 *   - skipCalibration flag → no factor applied, marker present
 *   - no active factors file → fallback graceful (pricing unchanged)
 *   - margin recalculated against new unit_price
 *   - sync estimate() still works unchanged
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-QP-CALIBRATION-WIRE
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quoteEstimatorEngine } from "../engines/QuoteEstimatorEngine.js";
import { quotingActiveFactorLoaderEngine } from "../engines/QuotingActiveFactorLoaderEngine.js";

function minimalInput() {
  return {
    part_name: "test-bracket",
    material: "aluminum_6061",
    quantity: 10,
    process: "mill" as const,
    cycle_time_min: 5,
    setup_time_min: 30,
  };
}

describe("QuoteEstimatorEngine.estimateCalibrated — U-QP-CALIBRATION-WIRE", () => {
  let tmpDir: string;
  let factorPath: string;
  let originalPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "qe-cal-test-"));
    factorPath = join(tmpDir, "active-factors.json");
    originalPath = quotingActiveFactorLoaderEngine.getPath();
    quotingActiveFactorLoaderEngine.setPath(factorPath);
  });

  afterEach(async () => {
    quotingActiveFactorLoaderEngine.setPath(originalPath);
    quotingActiveFactorLoaderEngine.refresh();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("sync estimate() is unchanged — calibration NEVER auto-applies", () => {
    const result = quoteEstimatorEngine.estimate(minimalInput());
    expect(result.pricing.unit_price).toBeGreaterThan(0);
    expect((result as unknown as { calibration?: unknown }).calibration).toBe(undefined);
  });

  it("estimateCalibrated() with no active factors → graceful fallback (pricing unchanged)", async () => {
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput());
    expect(result.calibration.applied).toBe(false);
    expect(result.calibration.reason).toBe("active-factors-file-missing");
    expect(result.calibration.factor_used).toBe(1);
    // Unit price unchanged
    const baseline = quoteEstimatorEngine.estimate(minimalInput());
    expect(result.pricing.unit_price).toBe(baseline.pricing.unit_price);
  });

  it("estimateCalibrated() with active 0.5 factor → unit_price halved", async () => {
    await fs.writeFile(factorPath, JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      source_report_signature: "test",
      global: {
        customer: "*",
        record_count: 10,
        signed_pct_error_observed: 100,
        factor: 0.5,
        factor_clamped: false,
        rationale: "test 0.5 factor",
      },
      per_customer: [],
      notes: [],
    }), "utf-8");
    quotingActiveFactorLoaderEngine.refresh();

    const baseline = quoteEstimatorEngine.estimate(minimalInput());
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput());

    expect(result.calibration.applied).toBe(true);
    expect(result.calibration.factor_used).toBe(0.5);
    expect(result.calibration.factor_source).toBe("global");
    expect(result.calibration.pre_calibration_unit_price).toBe(baseline.pricing.unit_price);
    // Unit price is roughly halved (round-to-cents tolerance)
    expect(Math.abs(result.pricing.unit_price - baseline.pricing.unit_price * 0.5)).toBeLessThan(0.5);
    // Total price = unit × qty
    expect(result.pricing.total_price).toBe(Math.round(result.pricing.unit_price * 10 * 100) / 100);
  });

  it("skipCalibration flag → no factor applied even with active factors loaded", async () => {
    await fs.writeFile(factorPath, JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      source_report_signature: "test",
      global: { customer: "*", record_count: 10, signed_pct_error_observed: 100, factor: 0.5, factor_clamped: false, rationale: "t" },
      per_customer: [],
      notes: [],
    }), "utf-8");
    quotingActiveFactorLoaderEngine.refresh();

    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput(), { skipCalibration: true });
    expect(result.calibration.applied).toBe(false);
    expect(result.calibration.reason).toBe("skipCalibration-flag");
    expect(result.calibration.factor_used).toBe(1);
  });

  it("margin_pct recomputed against the calibrated unit_price (not the pre-cal one)", async () => {
    await fs.writeFile(factorPath, JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      source_report_signature: "test",
      global: { customer: "*", record_count: 10, signed_pct_error_observed: 50, factor: 0.6667, factor_clamped: false, rationale: "t" },
      per_customer: [],
      notes: [],
    }), "utf-8");
    quotingActiveFactorLoaderEngine.refresh();

    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput());
    expect(result.calibration.applied).toBe(true);
    // Recomputed margin uses NEW total_price - cost
    const expectedMargin = result.pricing.total_price > 0
      ? Math.round(((result.pricing.total_price - result.costs.total_cost) / result.pricing.total_price) * 100 * 100) / 100
      : 0;
    expect(result.pricing.margin_pct).toBe(expectedMargin);
    // Pre-cal margin stored for diff
    expect(result.calibration.pre_calibration_margin_pct).toBeGreaterThan(0);
  });
});

describe("QuoteEstimatorEngine.estimateCalibrated — U-QP-CALIBRATION-FRESHNESS-PREFLIGHT", () => {
  let tmpDir: string;
  let factorPath: string;
  let originalPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "qe-fresh-test-"));
    factorPath = join(tmpDir, "active-factors.json");
    originalPath = quotingActiveFactorLoaderEngine.getPath();
    quotingActiveFactorLoaderEngine.setPath(factorPath);
  });

  afterEach(async () => {
    quotingActiveFactorLoaderEngine.setPath(originalPath);
    quotingActiveFactorLoaderEngine.refresh();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // Write a global 0.5 factor with a controllable generated_at age (hours in the past).
  async function writeFactorAgedHours(hours: number) {
    const generated_at = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    await fs.writeFile(factorPath, JSON.stringify({
      ok: true,
      generated_at,
      source_report_signature: "fresh-test",
      global: { customer: "*", record_count: 10, signed_pct_error_observed: 100, factor: 0.5, factor_clamped: false, rationale: "aged" },
      per_customer: [],
      notes: [],
    }), "utf-8");
    quotingActiveFactorLoaderEngine.refresh();
  }

  it("STALE factor (48h old) is still APPLIED but flagged is_stale + warned (soft path)", async () => {
    await writeFactorAgedHours(48);
    const baseline = quoteEstimatorEngine.estimate(minimalInput());
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput());
    // The 0.5 factor still corrects the price (we do NOT silently drop a stale factor) ...
    expect(result.calibration.applied).toBe(true);
    expect(result.calibration.factor_used).toBe(0.5);
    expect(Math.abs(result.pricing.unit_price - baseline.pricing.unit_price * 0.5)).toBeLessThan(0.5);
    // ... but it is flagged stale, the age is carried, and a re-derive warning is emitted.
    expect(result.calibration.is_stale).toBe(true);
    expect(result.calibration.factor_age_minutes).toBeGreaterThan(24 * 60);
    expect(result.dfm_warnings.some((w) => /re-derive/i.test(w))).toBe(true);
  });

  it("FRESH factor (1h old) applies with NO staleness flag/warning (no regression)", async () => {
    await writeFactorAgedHours(1);
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput());
    expect(result.calibration.applied).toBe(true);
    expect(result.calibration.is_stale).toBe(false);
    expect(result.dfm_warnings.some((w) => /re-derive/i.test(w))).toBe(false);
  });

  it("HARD CUTOFF: maxFactorAgeHours=24 on a 50h factor -> REFUSED, raw FMV emitted (not calibrated)", async () => {
    await writeFactorAgedHours(50);
    const baseline = quoteEstimatorEngine.estimate(minimalInput());
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput(), { maxFactorAgeHours: 24 });
    // Refused -> uncalibrated, raw FMV (NOT the 0.5-halved price): a known-too-stale factor
    // must not silently re-price a live customer quote.
    expect(result.calibration.applied).toBe(false);
    expect(result.calibration.reason).toMatch(/factor-too-stale/);
    expect(result.calibration.is_stale).toBe(true);
    expect(result.pricing.unit_price).toBe(baseline.pricing.unit_price);
    expect(result.dfm_warnings.some((w) => /UNCALIBRATED/.test(w))).toBe(true);
  });

  it("HARD CUTOFF does not fire within range (10h factor, 24h cutoff) -> applied, not stale", async () => {
    await writeFactorAgedHours(10);
    const baseline = quoteEstimatorEngine.estimate(minimalInput());
    const result = await quoteEstimatorEngine.estimateCalibrated(minimalInput(), { maxFactorAgeHours: 24 });
    expect(result.calibration.applied).toBe(true);
    expect(Math.abs(result.pricing.unit_price - baseline.pricing.unit_price * 0.5)).toBeLessThan(0.5);
    expect(result.calibration.is_stale).toBe(false);
  });
});
