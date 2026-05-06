/**
 * CrossProcessDriftAwareFederationEngine.test.ts — XPROC-NEURAL Tier 6 (T6-03)
 *
 * Verifies the federated-round participation gate composing T3-02 drift
 * confidences with T6-01/T6-02 aggregation. The Tier 6 R3 acceptance
 * criterion ("rejects synthetic drift-injected client at ≥95% rate") is
 * verified across 50 trials with 100 healthy + 1 drift-injected clients.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessDriftAwareFederationEngine,
  crossProcessDriftAwareFederation,
} from "../engines/CrossProcessDriftAwareFederationEngine.js";

// Deterministic LCG for synthetic drift-confidence streams.
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s & 0xFFFFFF) / 0x1000000; // [0, 1)
  };
}

describe("gate() — input validation", () => {
  it("rejects empty client list", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({ clients: [] });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects driftConfidence outside [0, 1]", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 1.5 }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects NaN driftConfidence", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: Number.NaN }],
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  });

  it("rejects thresholds with low > high", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
      thresholds: { low: 0.8, high: 0.3, maxConsecutiveDefers: 3 },
    });
    expect(r).toMatchObject({ ok: false, error: "invalid_input" });
    if (!r.ok) expect(r.message).toMatch(/low.*must be <=.*high/);
  });

  it("dedupes duplicate clientIds with warning (keeps first)", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [
        { clientId: "a", driftConfidence: 0.1 },
        { clientId: "a", driftConfidence: 0.9 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.evaluated).toBe(1);
      expect(r.participate.length).toBe(1); // first kept = healthy
      expect(r.reject.length).toBe(0);
      expect(r.warnings.some((w) => w.includes("duplicate"))).toBe(true);
    }
  });

  it("warns on history entry for unknown clientId", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.1 }],
      recentDecisions: [{ clientId: "ghost", pastDecisions: ["defer", "defer"] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes("'ghost'"))).toBe(true);
    }
  });
});

describe("gate() — partition logic", () => {
  it("driftConfidence < low → participate", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.participate.length).toBe(1);
      expect(r.participate[0].decision).toBe("participate");
      expect(r.participate[0].reason).toBe("below_low");
    }
  });

  it("low ≤ driftConfidence < high → defer (no history)", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.defer.length).toBe(1);
      expect(r.defer[0].reason).toBe("in_warning_band");
      expect(r.defer[0].consecutiveDefers).toBe(1);
    }
  });

  it("driftConfidence ≥ high → reject", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.85 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.reject.length).toBe(1);
      expect(r.reject[0].reason).toBe("above_high");
    }
  });

  it("custom thresholds override defaults", () => {
    // With high=0.4, conf=0.5 should now reject (above_high), not defer.
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
      thresholds: { low: 0.2, high: 0.4, maxConsecutiveDefers: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.reject.length).toBe(1);
      expect(r.thresholds.high).toBe(0.4);
    }
  });

  it("at-boundary low: confidence === low → defer (not participate)", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.34 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.defer.length).toBe(1);
  });

  it("at-boundary high: confidence === high → reject (not defer)", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.67 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.reject.length).toBe(1);
  });
});

describe("gate() — consecutive-defer escalation", () => {
  it("escalates to REJECT after 3 consecutive defers", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
      recentDecisions: [
        { clientId: "a", pastDecisions: ["defer", "defer"] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 2 prior + this round = 3 = maxConsecutiveDefers → escalate.
      expect(r.reject.length).toBe(1);
      expect(r.reject[0].reason).toBe("escalated_after_consecutive_defers");
      expect(r.warnings.some((w) => w.includes("'a'") && w.includes("escalated"))).toBe(true);
    }
  });

  it("does NOT escalate when intervening participate breaks the streak", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
      recentDecisions: [
        { clientId: "a", pastDecisions: ["defer", "participate", "defer"] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Prior streak counts only consecutive from index 0 → 1 (only the latest).
      expect(r.defer.length).toBe(1);
      expect(r.defer[0].consecutiveDefers).toBe(2);
    }
  });

  it("custom maxConsecutiveDefers=2 escalates after just 1 prior defer", () => {
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.5 }],
      thresholds: { low: 0.34, high: 0.67, maxConsecutiveDefers: 2 },
      recentDecisions: [{ clientId: "a", pastDecisions: ["defer"] }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.reject.length).toBe(1);
  });

  it("escalation does NOT apply when current confidence is below_low", () => {
    // Client has 5 prior defers but is now healthy → participate, not reject.
    const r = CrossProcessDriftAwareFederationEngine.gate({
      clients: [{ clientId: "a", driftConfidence: 0.0 }],
      recentDecisions: [
        { clientId: "a", pastDecisions: ["defer", "defer", "defer", "defer", "defer"] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.participate.length).toBe(1);
      expect(r.reject.length).toBe(0);
    }
  });
});

describe("gate() — Tier 6 R3 acceptance: drift injection rejection ≥95%", () => {
  it("rejects drift-injected client across 50 trials with 0% healthy false-reject", () => {
    const TRIALS = 50;
    const HEALTHY_PER_TRIAL = 100;
    let injectedRejections = 0;
    let healthyFalseRejections = 0;

    for (let trial = 0; trial < TRIALS; trial++) {
      const rng = lcg(0xCAFE0000 + trial);
      const clients: { clientId: string; driftConfidence: number }[] = [];
      for (let i = 0; i < HEALTHY_PER_TRIAL; i++) {
        clients.push({
          clientId: `healthy-${i}`,
          driftConfidence: rng() * 0.2, // ∈ [0, 0.2) — below_low
        });
      }
      // Drift-injected: high confidence (≥0.85)
      clients.push({
        clientId: "injected",
        driftConfidence: 0.85 + rng() * 0.15, // ∈ [0.85, 1.0)
      });

      const r = CrossProcessDriftAwareFederationEngine.gate({ clients });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;

      const injected = r.reject.find((c) => c.clientId === "injected");
      if (injected) injectedRejections++;

      const healthyRejected = r.reject.filter((c) => c.clientId.startsWith("healthy-"));
      healthyFalseRejections += healthyRejected.length;
    }

    expect(injectedRejections / TRIALS).toBeGreaterThanOrEqual(0.95);
    expect(healthyFalseRejections).toBe(0);
  });
});

describe("driftReport() — diagnostics", () => {
  it("counts healthy/warning/drifting at default thresholds", () => {
    const r = CrossProcessDriftAwareFederationEngine.driftReport({
      clients: [
        { clientId: "h1", driftConfidence: 0.05 },
        { clientId: "h2", driftConfidence: 0.10 },
        { clientId: "w1", driftConfidence: 0.40 },
        { clientId: "w2", driftConfidence: 0.55 },
        { clientId: "d1", driftConfidence: 0.80 },
        { clientId: "d2", driftConfidence: 0.95 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total).toBe(6);
      expect(r.healthy).toBe(2);
      expect(r.warning).toBe(2);
      expect(r.drifting).toBe(2);
      expect(r.meanConfidence).toBeCloseTo((0.05 + 0.10 + 0.40 + 0.55 + 0.80 + 0.95) / 6, 6);
      expect(r.medianConfidence).toBeCloseTo(0.475, 6);
    }
  });

  it("breaks down counts by process tag", () => {
    const r = CrossProcessDriftAwareFederationEngine.driftReport({
      clients: [
        { clientId: "m1", driftConfidence: 0.10, process: "mill" },
        { clientId: "m2", driftConfidence: 0.85, process: "mill" },
        { clientId: "l1", driftConfidence: 0.20, process: "lathe" },
        { clientId: "w1", driftConfidence: 0.50, process: "wedm" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.byProcess.mill).toEqual({ total: 2, healthy: 1, warning: 0, drifting: 1 });
      expect(r.byProcess.lathe).toEqual({ total: 1, healthy: 1, warning: 0, drifting: 0 });
      expect(r.byProcess.wedm).toEqual({ total: 1, healthy: 0, warning: 1, drifting: 0 });
    }
  });

  it("tallies which detectors fired across the population", () => {
    const r = CrossProcessDriftAwareFederationEngine.driftReport({
      clients: [
        { clientId: "a", driftConfidence: 0.5, detectorFired: ["ddm"] },
        { clientId: "b", driftConfidence: 0.7, detectorFired: ["ddm", "eddm"] },
        { clientId: "c", driftConfidence: 0.9, detectorFired: ["ddm", "eddm", "adwin"] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.detectorTallies).toEqual({ ddm: 3, eddm: 2, adwin: 1 });
    }
  });

  it("p90 percentile interpolates correctly on small samples", () => {
    // 10 clients evenly spaced 0.0 .. 0.9 → p90 = 0.81 (interp idx=8.1).
    const clients = Array.from({ length: 10 }, (_, i) => ({
      clientId: `c${i}`, driftConfidence: i / 10,
    }));
    const r = CrossProcessDriftAwareFederationEngine.driftReport({ clients });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.p90Confidence).toBeCloseTo(0.81, 6);
    }
  });
});

describe("constants() + dispatcher wrapper", () => {
  it("constants snapshot exposes default thresholds", () => {
    const c = CrossProcessDriftAwareFederationEngine.constants();
    expect(c.DEFAULT_LOW_THRESHOLD).toBe(0.34);
    expect(c.DEFAULT_HIGH_THRESHOLD).toBe(0.67);
    expect(c.DEFAULT_MAX_CONSECUTIVE_DEFERS).toBe(3);
  });

  it("dispatcher wrapper routes xproc_fed_gate", () => {
    const r = crossProcessDriftAwareFederation("xproc_fed_gate", {
      clients: [{ clientId: "a", driftConfidence: 0.1 }],
    }) as { ok: boolean; participate?: unknown[] };
    expect(r.ok).toBe(true);
    expect(r.participate?.length).toBe(1);
  });

  it("dispatcher wrapper routes xproc_fed_drift_report", () => {
    const r = crossProcessDriftAwareFederation("xproc_fed_drift_report", {
      clients: [
        { clientId: "a", driftConfidence: 0.1 },
        { clientId: "b", driftConfidence: 0.9 },
      ],
    }) as { ok: boolean; healthy?: number; drifting?: number };
    expect(r.ok).toBe(true);
    expect(r.healthy).toBe(1);
    expect(r.drifting).toBe(1);
  });

  it("dispatcher wrapper rejects unknown action", () => {
    expect(() =>
      crossProcessDriftAwareFederation("xproc_fed_drift_bogus", {}),
    ).toThrow(/unknown action/);
  });
});
