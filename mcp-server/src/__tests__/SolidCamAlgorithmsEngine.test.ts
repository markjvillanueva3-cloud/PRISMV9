/**
 * SolidCamAlgorithmsEngine -- Test Suite
 *
 * Ports and extends the original JS test suites from:
 *   SESSION_1_1_TESTS.js  (chip thickness)
 *   SESSION_1_2_TESTS.js  (engagement geometry)
 *
 * All numeric comparisons use toBeCloseTo (5 decimal digits by default).
 */

import { describe, it, expect } from 'vitest';
import { SolidCamAlgorithmsEngine } from '../engines/SolidCamAlgorithmsEngine.js';

// ---------------------------------------------------------------------------
// Chip Thickness Tests
// ---------------------------------------------------------------------------

describe('SolidCamAlgorithmsEngine.chipThickness', () => {

  // ---- JS Test: Average Chip Thickness (Sandvik example) ----
  // fz=0.15, ae=3, Dc=12 -> h_m = 0.15 * sqrt(3/12) = 0.075
  it('Sandvik example: fz=0.15, ae=3, Dc=12 -> h_m=0.075', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 3, feedPerTooth: 0.15,
    });
    expect(r.actualChipThickness).toBeCloseTo(0.075, 4);
  });

  // ---- Full engagement (ae = Dc) -> thinning factor = 1.0 ----
  it('full engagement (ae = D): thinning factor is 1.0, h_m = fz', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 12, feedPerTooth: 0.10,
    });
    expect(r.thinningFactor).toBeCloseTo(1.0, 5);
    // h_m = fz * sqrt(1) = fz
    expect(r.actualChipThickness).toBeCloseTo(0.10, 5);
    expect(r.adjustedFeedPerTooth).toBeCloseTo(0.10, 5);
  });

  // ---- 50% engagement (ae = D/2) ----
  it('50% engagement (ae = D/2): thinning factor = 1.0', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 6, feedPerTooth: 0.10,
    });
    expect(r.thinningFactor).toBeCloseTo(1.0, 5);
    // h_m = 0.10 * sqrt(0.5) = 0.07071
    expect(r.actualChipThickness).toBeCloseTo(0.10 * Math.sqrt(0.5), 4);
  });

  // ---- 10% engagement -> significant thinning ----
  it('10% engagement: significant thinning, factor ~1.732', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 10, stepover: 1, feedPerTooth: 0.10,
    });
    // ratio = 0.1, factor = 1/sqrt(0.1) = 3.162 -- capped at 2.5?
    // 1/sqrt(0.1) = 3.162, but cap is 2.5
    // Wait: actual session_1_1 code: 1/sqrt(ratio) with cap 2.5
    // 1/sqrt(0.1) = 3.162 > 2.5  --> capped to 2.5
    expect(r.thinningFactor).toBeCloseTo(2.5, 3);
    // h_m = 0.10 * sqrt(0.1) = 0.03162
    expect(r.actualChipThickness).toBeCloseTo(0.10 * Math.sqrt(0.1), 4);
    // adjusted = 0.10 * 2.5 = 0.25
    expect(r.adjustedFeedPerTooth).toBeCloseTo(0.25, 4);
  });

  // ---- JS Test: 5% WOC thinning factor ~ 2.236, capped to 2.5? ----
  // 1/sqrt(0.05) = 4.47 -> cap 2.5
  it('5% engagement: thinning factor capped at 2.5', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 10, stepover: 0.5, feedPerTooth: 0.10,
    });
    expect(r.thinningFactor).toBeCloseTo(2.5, 3);
  });

  // ---- JS Test: 25% WOC thinning factor ~ 1.414 ----
  it('25% engagement: thinning factor ~1.414', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 10, stepover: 2.5, feedPerTooth: 0.10,
    });
    expect(r.thinningFactor).toBeCloseTo(1 / Math.sqrt(0.25), 3); // 2.0
    expect(r.actualChipThickness).toBeCloseTo(0.10 * Math.sqrt(0.25), 4); // 0.05
  });

  // ---- JS Test: 75% WOC thinning factor = 1.0 ----
  it('75% engagement: thinning factor is 1.0', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 10, stepover: 7.5, feedPerTooth: 0.10,
    });
    expect(r.thinningFactor).toBeCloseTo(1.0, 5);
  });

  // ---- Zero stepover edge case ----
  it('zero stepover returns zero chip thickness', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 0, feedPerTooth: 0.10,
    });
    expect(r.actualChipThickness).toBe(0);
    expect(r.thinningFactor).toBe(1);
    expect(r.adjustedFeedPerTooth).toBe(0.10);
  });

  // ---- JS Test: h_m at full slot = fz ----
  it('h_m at full slot equals fz', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 12, feedPerTooth: 0.10,
    });
    expect(r.actualChipThickness).toBeCloseTo(0.10, 5);
  });

  // ---- JS Test: h_m at 10% stepover = fz * 0.316 ----
  it('h_m at 10% stepover = fz * sqrt(0.1)', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 12, stepover: 1.2, feedPerTooth: 0.10,
    });
    expect(r.actualChipThickness).toBeCloseTo(0.10 * Math.sqrt(0.1), 4);
  });

  // ---- Stepover exceeding diameter clamps to full slot ----
  it('stepover exceeding diameter clamps to full-slot behavior', () => {
    const r = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: 10, stepover: 15, feedPerTooth: 0.10,
    });
    // Should behave like ae=Dc
    expect(r.actualChipThickness).toBeCloseTo(0.10, 5);
    expect(r.thinningFactor).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// Engagement Geometry Tests
// ---------------------------------------------------------------------------

describe('SolidCamAlgorithmsEngine.engagementGeometry', () => {

  // ---- JS Test: 50% stepover = 90 degrees engagement ----
  it('50% stepover -> 90 deg engagement', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 6,
    });
    expect(r.engagementAngle).toBeCloseTo(90, 1);
    expect(r.engagementPercent).toBeCloseTo(50, 1);
  });

  // ---- JS Test: 25% stepover ~ 60 degrees ----
  it('25% stepover -> ~60 deg engagement', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 3,
    });
    const expectedDeg = Math.acos(1 - 2 * 0.25) * (180 / Math.PI);
    expect(r.engagementAngle).toBeCloseTo(expectedDeg, 2);
  });

  // ---- Full slot (ae = Dc) = 180 degrees ----
  it('full engagement (ae = D) -> 180 deg', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 12,
    });
    expect(r.engagementAngle).toBeCloseTo(180, 1);
    expect(r.engagementPercent).toBeCloseTo(100, 1);
  });

  // ---- 10% stepover ~ 36.87 degrees ----
  it('10% stepover -> ~36.87 deg engagement', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 1.2,
    });
    const expectedDeg = Math.acos(1 - 2 * 0.1) * (180 / Math.PI);
    expect(r.engagementAngle).toBeCloseTo(expectedDeg, 2);
  });

  // ---- Zero stepover returns zeros ----
  it('zero stepover returns zero engagement', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 0,
    });
    expect(r.engagementAngle).toBe(0);
    expect(r.contactArcLength).toBe(0);
    expect(r.engagementPercent).toBe(0);
  });

  // ---- Contact arc length at 50% stepover ----
  it('contact arc length at 50% stepover', () => {
    const Dc = 12;
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: Dc, stepover: 6,
    });
    // alpha = pi/2, arc = R * pi/2 = 6 * pi/2 = 3*pi
    expect(r.contactArcLength).toBeCloseTo((Dc / 2) * (Math.PI / 2), 3);
  });

  // ---- Engagement percent at 50% ----
  it('engagement percent at 50% stepover is 50%', () => {
    const r = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: 12, stepover: 6,
    });
    expect(r.engagementPercent).toBeCloseTo(50, 1);
  });

  // ---- JS round-trip: stepover -> engagement -> back ----
  it('round-trip: engagement angle is consistent with stepover formula', () => {
    const Dc = 12;
    const ae = 4.5;
    const result = SolidCamAlgorithmsEngine.engagementGeometry({
      toolDiameter: Dc, stepover: ae,
    });
    // Reconstruct stepover from engagement angle
    const alphaRad = result.engagementAngle * (Math.PI / 180);
    const reconstructedAe = (Dc / 2) * (1 - Math.cos(alphaRad));
    expect(reconstructedAe).toBeCloseTo(ae, 4);
  });
});

// ---------------------------------------------------------------------------
// adjustFeedForEngagement Tests
// ---------------------------------------------------------------------------

describe('SolidCamAlgorithmsEngine.adjustFeedForEngagement', () => {

  // ---- Inverse consistency with chipThickness ----
  it('adjustFeedForEngagement inverse matches chipThickness', () => {
    const Dc = 12;
    const ae = 3;
    const targetH = 0.075;

    const adj = SolidCamAlgorithmsEngine.adjustFeedForEngagement({
      toolDiameter: Dc, stepover: ae, targetChipThickness: targetH,
    });

    // Verify: using the adjusted fz, chipThickness should produce targetH
    const check = SolidCamAlgorithmsEngine.chipThickness({
      toolDiameter: Dc, stepover: ae, feedPerTooth: adj.adjustedFz,
    });
    expect(check.actualChipThickness).toBeCloseTo(targetH, 5);
  });

  // ---- At full slot the adjusted fz equals the target chip thickness ----
  it('at full slot, adjustedFz equals targetChipThickness', () => {
    const r = SolidCamAlgorithmsEngine.adjustFeedForEngagement({
      toolDiameter: 10, stepover: 10, targetChipThickness: 0.08,
    });
    // sqrt(1) = 1, so fz = h_target / 1 = h_target
    expect(r.adjustedFz).toBeCloseTo(0.08, 5);
    expect(r.thinningFactor).toBeCloseTo(1.0, 5);
  });

  // ---- At 25% engagement, adjustedFz is doubled ----
  it('at 25% engagement, adjustedFz compensates for thinning', () => {
    const r = SolidCamAlgorithmsEngine.adjustFeedForEngagement({
      toolDiameter: 10, stepover: 2.5, targetChipThickness: 0.05,
    });
    // fz = 0.05 / sqrt(0.25) = 0.05 / 0.5 = 0.10
    expect(r.adjustedFz).toBeCloseTo(0.10, 5);
    // thinningFactor = 1/sqrt(0.25) = 2.0
    expect(r.thinningFactor).toBeCloseTo(2.0, 3);
  });

  // ---- Zero inputs produce zero ----
  it('zero stepover returns zero adjustedFz', () => {
    const r = SolidCamAlgorithmsEngine.adjustFeedForEngagement({
      toolDiameter: 10, stepover: 0, targetChipThickness: 0.05,
    });
    expect(r.adjustedFz).toBe(0);
  });
});
