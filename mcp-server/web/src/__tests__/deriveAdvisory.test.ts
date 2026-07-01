/**
 * R9 intent tests for deriveAdvisory (U-SFC-UI-UNCERTAINTY, slot:oscar).
 *
 * Encodes the oscar-soul invariant the SFC UI must hold: a speed/feed is never surfaced
 * without an uncertainty/advisory signal. Each assert fails if the level logic regresses or a
 * dropped signal (condition_warning, recommendations) stops reaching the advisory.
 */
import { describe, it, expect } from "vitest";
import { deriveAdvisory } from "../components/sfc/deriveAdvisory";

// A "clean" base result (high confidence, all checks pass, no warnings) -- override per case.
const base = (over: Record<string, unknown> = {}) => ({
  overall_confidence: 0.9,
  uncertainty: { dominant_uncertainty_source: "material_kc1.1", suggested_measurement: "measure kc1.1" },
  safety_checks: [{ name: "spindle_power", passed: true, message: "within limit" }],
  limiting_factors: [],
  playbook_warnings: [],
  recommendations: [],
  ...over,
});

describe("deriveAdvisory (SFC UI uncertainty surfacing)", () => {
  it("high confidence + no warnings -> level ok, confidence surfaced", () => {
    const a = deriveAdvisory(base() as never);
    expect(a.level).toBe("ok");
    expect(a.confidencePct).toBe(90);
    expect(a.confidenceKnown).toBe(true);
    expect(a.headline.length).toBeGreaterThan(0);
  });

  it("confidence below the caution threshold (0.5) -> caution with a 'Moderate confidence' headline", () => {
    const a = deriveAdvisory(base({ overall_confidence: 0.5 }) as never);
    expect(a.level).toBe("caution");
    expect(a.headline).toContain("Moderate confidence 50%");
  });

  it("a warning-severity limiting factor -> warning, factor + utilization surfaced in the headline", () => {
    const a = deriveAdvisory(
      base({
        overall_confidence: 0.9,
        limiting_factors: [
          { parameter: "deflection", constraint: "near limit", utilization_pct: 85, severity: "warning" },
        ],
      }) as never,
    );
    expect(a.level).toBe("warning");
    expect(a.warningFactors[0]).toContain("deflection");
    expect(a.warningFactors[0]).toContain("85%");
    expect(a.headline).toContain("Approaching a limit");
  });

  it("confidenceBand reflects the caution/warning thresholds (high/medium/low/unknown)", () => {
    expect(deriveAdvisory(base({ overall_confidence: 0.9 }) as never).confidenceBand).toBe("high");
    expect(deriveAdvisory(base({ overall_confidence: 0.45 }) as never).confidenceBand).toBe("medium");
    expect(deriveAdvisory(base({ overall_confidence: 0.1 }) as never).confidenceBand).toBe("low");
    expect(deriveAdvisory({} as never).confidenceBand).toBe("unknown");
  });

  it("playbook warnings downgrade an otherwise-ok result to caution", () => {
    const a = deriveAdvisory(base({ playbook_warnings: ["chip thinning likely", "watch deflection"] }) as never);
    expect(a.level).toBe("caution");
    expect(a.playbookWarnings).toHaveLength(2);
  });

  it("condition_warning (edge condition) -> warning and is surfaced in the headline", () => {
    const a = deriveAdvisory(base({ uncertainty: { condition_warning: "thin-wall thermal risk" } }) as never);
    expect(a.level).toBe("warning");
    expect(a.conditionWarning).toBe("thin-wall thermal risk");
    expect(a.headline).toContain("thin-wall thermal risk");
  });

  it("confidence below the warning threshold (0.2) -> warning", () => {
    const a = deriveAdvisory(base({ overall_confidence: 0.2 }) as never);
    expect(a.level).toBe("warning");
  });

  it("a failed safety check -> critical, message surfaced, beats high confidence", () => {
    const a = deriveAdvisory(
      base({
        overall_confidence: 0.95,
        safety_checks: [{ name: "workholding", passed: false, message: "clamping force inadequate" }],
      }) as never,
    );
    expect(a.level).toBe("critical");
    expect(a.failedSafetyChecks).toContain("clamping force inadequate");
  });

  it("a critical limiting factor -> critical, factor + utilization surfaced", () => {
    const a = deriveAdvisory(
      base({
        limiting_factors: [
          { parameter: "spindle_power", constraint: "exceeds max", utilization_pct: 130, severity: "critical" },
        ],
      }) as never,
    );
    expect(a.level).toBe("critical");
    expect(a.criticalFactors[0]).toContain("spindle_power");
    expect(a.criticalFactors[0]).toContain("130%");
  });

  it("recommendations are surfaced and capped at the default (4)", () => {
    const recs = ["r1", "r2", "r3", "r4", "r5", "r6"];
    const a = deriveAdvisory(base({ recommendations: recs }) as never);
    expect(a.recommendations).toEqual(["r1", "r2", "r3", "r4"]);
  });

  it("empty/missing result does not throw and is never 'ok' (unknown confidence)", () => {
    const a = deriveAdvisory({} as never);
    expect(a.confidenceKnown).toBe(false);
    expect(a.confidencePct).toBe(0);
    expect(a.level).not.toBe("ok");
    expect(a.headline).toContain("Confidence unavailable");
    expect(a.headline.length).toBeGreaterThan(0);
  });

  it("null result and NaN confidence are handled (no NaN, never ok)", () => {
    expect(() => deriveAdvisory(null)).not.toThrow();
    const a = deriveAdvisory(base({ overall_confidence: Number.NaN }) as never);
    expect(a.confidenceKnown).toBe(false);
    expect(Number.isNaN(a.confidencePct)).toBe(false);
    expect(a.level).not.toBe("ok");
  });

  it("critical precedence: a failed safety check wins over a condition warning", () => {
    const a = deriveAdvisory(
      base({
        uncertainty: { condition_warning: "thin wall" },
        safety_checks: [{ name: "x", passed: false, message: "bad" }],
      }) as never,
    );
    expect(a.level).toBe("critical");
  });

  it("invariant: headline is always a non-empty string (never publish without a signal)", () => {
    const cases: unknown[] = [
      {},
      null,
      base(),
      base({ overall_confidence: 0.5 }),
      base({ overall_confidence: 0.2 }),
      base({ safety_checks: [{ passed: false, message: "m" }] }),
      base({ uncertainty: { condition_warning: "w" } }),
    ];
    for (const c of cases) {
      const a = deriveAdvisory(c as never);
      expect(typeof a.headline).toBe("string");
      expect(a.headline.trim().length).toBeGreaterThan(0);
    }
  });
});
