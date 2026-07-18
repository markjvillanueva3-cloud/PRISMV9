/**
 * U-QP-TIME-BUGS (charlie 2026-06-12) — fail-on-revert guard for the
 * CycleTimeAccuracyEngine.accelTimePenalty unit bug (G7).
 *
 * The triangular-profile branch previously divided BOTH terms by 1000:
 *   2*sqrt(distance_mm/1000/accel) - (distance_mm/1000/v)
 * distance_mm is already mm and accel is mm/s^2, so the sqrt term was scaled
 * by 1/sqrt(1000) (~31.6x too small) while the linear term was scaled by
 * 1/1000 -- inconsistent units, ~25-31x accel underestimate on every short
 * segment. These assertions are hand-computed PHYSICAL values that only the
 * correct (no-/1000) formula produces; the old code FAILS them.
 */
import { describe, it, expect } from "vitest";
import { cycleTimeAccuracyEngine } from "../engines/CycleTimeAccuracyEngine.js";

describe("CycleTimeAccuracyEngine.accelTimePenalty — triangular-profile unit bug (U-QP-TIME-BUGS)", () => {
  // Short 2mm segment: v=100 mm/s (6000 mm/min), a=1000 mm/s^2.
  // d_accel = 0.5*a*(v/a)^2 = 5mm; 2*d_accel = 10mm >= 2mm -> triangular branch.
  // Analytic: t_tri = 2*sqrt(d/a) = 2*sqrt(0.002) = 0.089443 s;
  //           penalty = t_tri - d/v = 0.089443 - 0.020 = 0.069443 s.
  const D = 2;       // mm
  const FEED = 6000; // mm/min -> v = 100 mm/s
  const ACCEL = 1000; // mm/s^2

  it("returns the physically-correct triangular penalty (~0.0694 s), not the /1000 underestimate (~0.0028 s)", () => {
    const penalty = cycleTimeAccuracyEngine.accelTimePenalty(D, FEED, ACCEL);
    // Fixed code -> 0.069443; OLD /1000 code -> 0.002808 (would FAIL this).
    expect(penalty).toBeCloseTo(0.069443, 4);
  });

  it("PHYSICAL invariant: on a too-short segment the accel penalty EXCEEDS the constant-speed time", () => {
    const penalty = cycleTimeAccuracyEngine.accelTimePenalty(D, FEED, ACCEL);
    const constSpeedTime = D / (FEED / 60); // 2 / 100 = 0.02 s
    // Ramping over 2mm costs MORE than running it at full speed -> penalty > 0.02s.
    // OLD /1000 code gave 0.0028s < 0.02s, inverting this physical truth.
    expect(penalty).toBeGreaterThan(constSpeedTime);
  });

  it("matches the closed-form 2*sqrt(d/a) - d/v exactly (units are seconds throughout)", () => {
    const penalty = cycleTimeAccuracyEngine.accelTimePenalty(D, FEED, ACCEL);
    const v = FEED / 60;
    const analytic = 2 * Math.sqrt(D / ACCEL) - D / v;
    expect(penalty).toBeCloseTo(analytic, 9);
  });

  it("guards inputs: zero/negative distance or feed -> 0 penalty (no NaN)", () => {
    expect(cycleTimeAccuracyEngine.accelTimePenalty(0, FEED, ACCEL)).toBe(0);
    expect(cycleTimeAccuracyEngine.accelTimePenalty(D, 0, ACCEL)).toBe(0);
    expect(cycleTimeAccuracyEngine.accelTimePenalty(-5, FEED, ACCEL)).toBe(0);
  });
});
