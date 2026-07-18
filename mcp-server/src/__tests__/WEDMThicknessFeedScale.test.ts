/**
 * Tests for the P0-1 thickness-aware feed scaling (WEDM-P2P-COMPREHENSIVE-VALIDATION).
 *   npx vitest run src/__tests__/WEDMThicknessFeedScale.test.ts
 *
 * Verifies INTENT (R9): feed now VARIES with thickness (the defect was constant
 * 1->215 mm); thicker stock => slower feed (sparking-frequency-limited physics);
 * the factor is anchored to the existing FA-Advance curve (estimateRoughingSpeed),
 * clamped against absurd extrapolation; null/invalid inputs degrade safely.
 */
import { describe, it, expect } from "vitest";
import {
  thicknessFeedFactor,
  scaledPassFeed,
  isThicknessExtrapolated,
  MIN_THICKNESS_FACTOR,
  MAX_THICKNESS_FACTOR,
} from "../data/wedm-thickness-feed-scale.js";
import { estimateRoughingSpeed } from "../data/mitsubishi-fa-advance-extracted.js";

// Heavy family pass-1 (rough) feed from the JM oracle (E1281).
const HEAVY_ROUGH = 1.52;

describe("thicknessFeedFactor", () => {
  it("equals curve(target)/familyRoughFeed — anchored to the FA-Advance asset", () => {
    const f100 = thicknessFeedFactor(HEAVY_ROUGH, 100);
    expect(f100).toBeCloseTo(estimateRoughingSpeed(100) / HEAVY_ROUGH, 4);
  });

  it("THICKER stock => SLOWER feed (factor decreases monotonically with thickness)", () => {
    const f10 = thicknessFeedFactor(HEAVY_ROUGH, 10);
    const f50 = thicknessFeedFactor(HEAVY_ROUGH, 50);
    const f100 = thicknessFeedFactor(HEAVY_ROUGH, 100);
    expect(f10).toBeGreaterThan(f50);
    expect(f50).toBeGreaterThan(f100);
    expect(f100).toBeLessThan(1); // 100mm is thicker than the heavy family's implied ref => slower
  });

  it("is NOT constant across thickness (the P0-1 defect is fixed)", () => {
    const factors = [12, 25, 50, 80, 150].map((t) => thicknessFeedFactor(HEAVY_ROUGH, t));
    const unique = new Set(factors.map((x) => x.toFixed(3)));
    expect(unique.size).toBeGreaterThan(3); // genuinely varies, not one frozen value
  });

  it("clamps absurd extrapolation into [MIN,MAX]", () => {
    // a tiny family rough feed at thin stock would explode the ratio -> clamp.
    expect(thicknessFeedFactor(0.4, 5)).toBeLessThanOrEqual(MAX_THICKNESS_FACTOR);
    expect(thicknessFeedFactor(6.2, 215)).toBeGreaterThanOrEqual(MIN_THICKNESS_FACTOR);
  });

  it("degrades safely (1.0 no-op) on null / non-positive / NaN inputs", () => {
    expect(thicknessFeedFactor(null, 50)).toBe(1.0);
    expect(thicknessFeedFactor(HEAVY_ROUGH, -5)).toBe(1.0);
    expect(thicknessFeedFactor(HEAVY_ROUGH, Number.NaN)).toBe(1.0);
    expect(thicknessFeedFactor(0, 50)).toBe(1.0);
  });
});

describe("scaledPassFeed", () => {
  it("scales a pass feed by the thickness factor (thicker => slower)", () => {
    const thin = scaledPassFeed(3.05, HEAVY_ROUGH, 10) as number;
    const thick = scaledPassFeed(3.05, HEAVY_ROUGH, 150) as number;
    expect(thick).toBeLessThan(thin);
    expect(thick).toBeCloseTo(3.05 * thicknessFeedFactor(HEAVY_ROUGH, 150), 2);
  });

  it("operator-set (null) feed stays null", () => {
    expect(scaledPassFeed(null, HEAVY_ROUGH, 50)).toBe(null);
  });

  it("no-op when thickness is unusable", () => {
    expect(scaledPassFeed(3.05, HEAVY_ROUGH, 0)).toBe(3.05);
  });
});

describe("isThicknessExtrapolated", () => {
  it("false inside the FA-Advance calibrated band (5..100 mm), true outside", () => {
    expect(isThicknessExtrapolated(50)).toBe(false);
    expect(isThicknessExtrapolated(5)).toBe(false);
    expect(isThicknessExtrapolated(3)).toBe(true);   // below band
    expect(isThicknessExtrapolated(150)).toBe(true); // above band (100..215 mm = extrapolation)
  });
});
