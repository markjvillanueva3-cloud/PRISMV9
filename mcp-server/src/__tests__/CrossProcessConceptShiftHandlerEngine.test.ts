/**
 * CrossProcessConceptShiftHandlerEngine.test.ts — XPROC-NEURAL Tier 3 (T3-03)
 *
 * Verifies the recovery decision tree per XPROC-NEURAL-ROADMAP.md Tier 3 R3:
 * warm-restart for ≤5% severity, full-retrain for ≥20%.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CrossProcessConceptShiftHandlerEngine,
  crossProcessConceptShiftHandler,
} from "../engines/CrossProcessConceptShiftHandlerEngine.js";

beforeEach(() => CrossProcessConceptShiftHandlerEngine.reset());

describe("input validation", () => {
  it("rejects driftConfidence > 1", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.5,
      recommendedAction: "alert",
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects negative driftConfidence", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: -0.1,
      recommendedAction: "alert",
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects unknown recommendedAction", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "panic",
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects magnitude > 1", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.5,
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });
});

describe("recommendedAction='none' overrides severity calc", () => {
  it("returns no_op even with high driftConfidence when action=none", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "none",
      magnitudeAbsDeviation: 1.0,  // would otherwise be full_retrain
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.decision.strategy).toBe("no_op");
      expect(r.decision.severity).toBe(0);
      expect(r.decision.rationale).toContain("no_change");
    }
  });
});

describe("acceptance — warm_restart for ≤5% severity", () => {
  it("severity = 0.05 → warm_restart (boundary)", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "alert",
      magnitudeAbsDeviation: 0.1,  // 0.5 × 0.1 = 0.05 exactly at threshold
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("warm_restart");
      expect(r.decision.severity).toBeCloseTo(0.05, 6);
    }
  });

  it("severity = 0.04 → warm_restart (below threshold)", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "alert",
      magnitudeAbsDeviation: 0.08,  // 0.04
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("warm_restart");
      expect(r.decision.severity).toBeCloseTo(0.04, 6);
    }
  });
});

describe("acceptance — full_retrain for ≥20% severity", () => {
  it("severity = 0.25 → full_retrain", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 0.5,  // 0.25 > 0.20 threshold
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("full_retrain");
      expect(r.decision.severity).toBeCloseTo(0.25, 6);
    }
  });

  it("severity = 1.0 (max) → full_retrain", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.0,
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("full_retrain");
      expect(r.decision.severity).toBe(1);
    }
  });
});

describe("intermediate severity → transfer_from_sister", () => {
  it("severity ∈ (0.05, 0.20] with sister available → transfer", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "alert",
      magnitudeAbsDeviation: 0.3,  // 0.15 in range
      sisterProcessAvailable: true,
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("transfer_from_sister");
      expect(r.decision.severity).toBeCloseTo(0.15, 6);
    }
  });

  it("intermediate severity but sister unavailable → downgrade to full_retrain + warning", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.5,
      recommendedAction: "alert",
      magnitudeAbsDeviation: 0.3,
      sisterProcessAvailable: false,
    });
    if (r.ok) {
      expect(r.decision.strategy).toBe("full_retrain");
      expect(r.decision.feasibilityHint).toBe("sister_process_unavailable_downgraded_to_full_retrain");
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0]).toMatch(/unavailable/);
    }
  });
});

describe("default magnitude (no caller value)", () => {
  it("severity defaults to driftConfidence × 1.0", () => {
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 0.3,
      recommendedAction: "alert",
      // no magnitudeAbsDeviation
    });
    if (r.ok) {
      expect(r.decision.severity).toBeCloseTo(0.3, 6);
      expect(r.decision.strategy).toBe("full_retrain");  // 0.3 > 0.20
    }
  });
});

describe("cooldown prevents thrashing", () => {
  it("second decision within cooldown returns no_op", () => {
    const t0 = 1000000;
    const r1 = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.0,
      nowMs: t0,
    });
    if (r1.ok) expect(r1.decision.strategy).toBe("full_retrain");

    const r2 = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.0,
      nowMs: t0 + 30_000,  // 30s later — within default 60s cooldown
    });
    if (r2.ok) {
      expect(r2.decision.strategy).toBe("no_op");
      expect(r2.decision.cooldownActive).toBe(true);
      expect(r2.decision.cooldownRemainingMs).toBe(30_000);
    }
  });

  it("decision after cooldown expires returns the real strategy", () => {
    const t0 = 1000000;
    CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.0,
      nowMs: t0,
    });
    const r2 = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      magnitudeAbsDeviation: 1.0,
      nowMs: t0 + 70_000,  // past cooldown
    });
    if (r2.ok) {
      expect(r2.decision.strategy).toBe("full_retrain");
      expect(r2.decision.cooldownActive).toBe(false);
    }
  });

  it("custom cooldownMs is honored", () => {
    const t0 = 1000000;
    CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      cooldownMs: 5000,  // 5s cooldown
      nowMs: t0,
    });
    const r2 = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      cooldownMs: 5000,
      nowMs: t0 + 6000,  // past 5s
    });
    if (r2.ok) expect(r2.decision.strategy).toBe("full_retrain");
  });
});

describe("history + reset", () => {
  it("records every decision in history (most recent first)", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) {
      CrossProcessConceptShiftHandlerEngine.decide({
        driftConfidence: 0.1 + i * 0.1,
        recommendedAction: "alert",
        nowMs: t0 + i * 70_000,  // beyond cooldown each time
      });
    }
    const h = CrossProcessConceptShiftHandlerEngine.history();
    expect(h.length).toBe(3);
    // Most recent first → severity 0.3 (full_retrain) at index 0
    expect(h[0].severity).toBeCloseTo(0.3, 6);
    expect(h[2].severity).toBeCloseTo(0.1, 6);
  });

  it("history(limit) respects the limit", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) {
      CrossProcessConceptShiftHandlerEngine.decide({
        driftConfidence: 0.5,
        recommendedAction: "alert",
        nowMs: t0 + i * 70_000,
      });
    }
    const h = CrossProcessConceptShiftHandlerEngine.history(2);
    expect(h.length).toBe(2);
  });

  it("reset() clears history and cooldown", () => {
    CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      nowMs: 1_000_000,
    });
    CrossProcessConceptShiftHandlerEngine.reset();
    expect(CrossProcessConceptShiftHandlerEngine.history()).toEqual([]);
    // Immediate next decision should NOT be cooldown-blocked
    const r = CrossProcessConceptShiftHandlerEngine.decide({
      driftConfidence: 1.0,
      recommendedAction: "retrain",
      nowMs: 1_000_000,  // same time as before reset
    });
    if (r.ok) {
      expect(r.decision.cooldownActive).toBe(false);
      expect(r.decision.strategy).toBe("full_retrain");
    }
  });
});

describe("constants() snapshot", () => {
  it("exposes the policy thresholds", () => {
    const c = CrossProcessConceptShiftHandlerEngine.constants();
    expect(c.DRIFT_SEVERITY_LOW).toBe(0.05);
    expect(c.DRIFT_SEVERITY_HIGH).toBe(0.20);
    expect(c.DECISION_COOLDOWN_MS).toBe(60_000);
    expect(c.DEFAULT_MAGNITUDE).toBe(1.0);
  });
});

describe("dispatcher convenience wrapper", () => {
  it("routes xproc_shift_decide", () => {
    const r = crossProcessConceptShiftHandler("xproc_shift_decide", {
      driftConfidence: 0.5,
      recommendedAction: "alert",
      magnitudeAbsDeviation: 0.04,
    }) as { ok: boolean; decision?: { strategy: string } };
    expect(r.ok).toBe(true);
    expect(r.decision?.strategy).toBe("warm_restart");
  });

  it("routes xproc_shift_history", () => {
    crossProcessConceptShiftHandler("xproc_shift_decide", {
      driftConfidence: 0.5,
      recommendedAction: "alert",
      nowMs: 1_000_000,
    });
    const h = crossProcessConceptShiftHandler("xproc_shift_history", { limit: 1 }) as Array<{
      severity: number;
    }>;
    expect(h.length).toBe(1);
  });

  it("routes xproc_shift_reset", () => {
    crossProcessConceptShiftHandler("xproc_shift_decide", {
      driftConfidence: 0.5,
      recommendedAction: "alert",
    });
    const r = crossProcessConceptShiftHandler("xproc_shift_reset", {}) as { ok: boolean };
    expect(r.ok).toBe(true);
    expect(crossProcessConceptShiftHandler("xproc_shift_history", {})).toEqual([]);
  });

  it("routes xproc_shift_constants", () => {
    const c = crossProcessConceptShiftHandler("xproc_shift_constants", {}) as {
      DRIFT_SEVERITY_LOW: number;
    };
    expect(c.DRIFT_SEVERITY_LOW).toBe(0.05);
  });

  it("throws on unknown action", () => {
    expect(() => crossProcessConceptShiftHandler("xproc_unknown", {})).toThrow(
      /unknown action 'xproc_unknown'/,
    );
  });
});
