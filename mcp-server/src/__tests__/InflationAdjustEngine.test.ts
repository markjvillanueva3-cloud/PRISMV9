/**
 * Tests for InflationAdjustEngine — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP02.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InflationAdjustEngine, type CpiRecord } from "../engines/InflationAdjustEngine.js";

const SAMPLE: CpiRecord[] = [
  { month_year: "2020-01", cpi_u: 258.4, source: "test" },
  { month_year: "2021-01", cpi_u: 261.6, source: "test" },
  { month_year: "2022-01", cpi_u: 281.1, source: "test" },
  { month_year: "2023-01", cpi_u: 299.2, source: "test" },
  { month_year: "2024-01", cpi_u: 308.4, source: "test" },
  { month_year: "2026-05", cpi_u: 328.4, source: "test" },
];

let eng: InflationAdjustEngine;
beforeEach(() => {
  eng = new InflationAdjustEngine();
  eng.loadFromInline(SAMPLE);
});

describe("InflationAdjustEngine.adjust — happy path", () => {
  it("$1000 from 2020-01 to 2024-01: CPI ratio 308.4/258.4 = 1.1934 → adjusted = $1193.42", () => {
    const r = eng.adjust(1000, "2020-01-15", "2024-01-15");
    expect(r.ok).toBe(true);
    expect(r.cpi_ratio).toBeCloseTo(1.1935, 3);
    expect(r.adjusted_usd).toBeCloseTo(1193.50, 1);
  });

  it("$500 from 2022-01 to 2026-05: CPI ratio 328.4/281.1 = 1.1683 → adjusted ≈ $584", () => {
    const r = eng.adjust(500, "2022-01-15", "2026-05-15");
    expect(r.ok).toBe(true);
    expect(r.adjusted_usd).toBeCloseTo(584.14, 1);
  });

  it("same-date adjust: ratio = 1.0, adjusted = original", () => {
    const r = eng.adjust(1000, "2023-01-15", "2023-01-15");
    expect(r.cpi_ratio).toBe(1.0);
    expect(r.adjusted_usd).toBe(1000);
  });

  it("nearest-prior fallback when month not in CSV", () => {
    // 2020-04 not in sample; should fall back to 2020-01
    const r = eng.adjust(1000, "2020-04-15", "2024-01-15");
    expect(r.ok).toBe(true);
    expect(r.cpi_from).toBe(258.4);
  });
});

describe("InflationAdjustEngine.adjust — failure modes (R12 fail-loud)", () => {
  it("non-finite usd → ok=false reason=non-finite-usd", () => {
    const r = eng.adjust(NaN, "2020-01-15", "2024-01-15");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("non-finite-usd");
  });

  it("invalid date format → ok=false reason=invalid-date-format", () => {
    const r = eng.adjust(1000, "bogus", "2024-01-15");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("invalid-date-format");
  });

  it("CPI data missing for from-date → ok=false with no-cpi-data reason", () => {
    const r = eng.adjust(1000, "1990-01-15", "2024-01-15");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no-cpi-data-for-from/);
  });

  it("CPI data missing for to-date → ok=false with no-cpi-data-for-to reason", () => {
    const r = eng.adjust(1000, "2024-01-15", "2030-01-15");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no-cpi-data-for-to/);
  });
});

describe("InflationAdjustEngine.adjust — adversarial inputs", () => {
  it("negative usd allowed (e.g. refund) — math still works", () => {
    const r = eng.adjust(-500, "2020-01-15", "2024-01-15");
    expect(r.ok).toBe(true);
    expect(r.adjusted_usd).toBeLessThan(0);
  });

  it("zero usd → adjusted=0, ratio still computed", () => {
    const r = eng.adjust(0, "2020-01-15", "2024-01-15");
    expect(r.ok).toBe(true);
    expect(r.adjusted_usd).toBe(0);
    expect(r.cpi_ratio).toBeGreaterThan(1);
  });

  it("Infinity usd → ok=false (non-finite)", () => {
    const r = eng.adjust(Infinity, "2020-01-15", "2024-01-15");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("non-finite-usd");
  });
});
