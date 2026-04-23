/**
 * MultiSignalAutoRollbackEngine tests (U-LPR-AUTOROLLBACK)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  MultiSignalAutoRollbackEngine,
  fitGPD,
  gpdSurvival,
  quantileR7,
  DEFAULT_TRIGGER_CONFIG,
  type ProgramFeedback,
} from "../../engines/MultiSignalAutoRollbackEngine.js";

const ART = "lora-v2";
const FB = "lora-v1-lkg";
let eng: MultiSignalAutoRollbackEngine;

function seedFeedback(
  e: MultiSignalAutoRollbackEngine,
  count: number,
  overrides: Partial<ProgramFeedback> = {},
  tStart = 1_000_000,
): void {
  for (let i = 0; i < count; i++) {
    e.recordFeedback(
      {
        program_id: `P${i}`,
        artifact_id: ART,
        timestamp: tStart + i * 1000,
        thumbs_up: true,
        error: false,
        latency_ms: 200,
        safety_score: 0.95,
        physics_validity: 0.95,
        ...overrides,
      },
      tStart + i * 1000 + 1,
    );
  }
}

beforeEach(() => {
  eng = new MultiSignalAutoRollbackEngine();
  eng.setFallback(ART, FB);
});

// ──────────────────────────────────────────────────────────────────────
// Utility math
// ──────────────────────────────────────────────────────────────────────

describe("quantileR7", () => {
  it("matches numpy default on linear samples", () => {
    // [1..10], q=0.5 → 5.5
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantileR7(v, 0.5)).toBe(5.5);
    expect(quantileR7(v, 0)).toBe(1);
    expect(quantileR7(v, 1)).toBe(10);
    expect(quantileR7(v, 0.95)).toBeCloseTo(9.55, 5);
  });
  it("rejects invalid q", () => {
    expect(() => quantileR7([1, 2], -0.1)).toThrow(/q/);
    expect(() => quantileR7([1, 2], 1.1)).toThrow(/q/);
  });
});

describe("fitGPD + gpdSurvival", () => {
  it("null when insufficient exceedances", () => {
    expect(fitGPD([0.9, 0.91, 0.92], 0.5)).toBeNull();
  });

  it("fits a positive-scale GPD for synthetic tail", () => {
    // Generate 50 samples with a left tail below 0.3
    const vals: number[] = [];
    for (let i = 0; i < 40; i++) vals.push(0.5 + (i % 10) * 0.01);
    for (let i = 0; i < 10; i++) vals.push(0.1 + i * 0.01);
    const fit = fitGPD(vals, 0.3);
    expect(fit).not.toBeNull();
    expect(fit!.exceedance_count).toBe(10);
    expect(fit!.sample_count).toBe(50);
    expect(fit!.scale_beta).toBeGreaterThan(0);
  });

  it("survival at/above threshold ≈ 1 - exceedance_rate", () => {
    const fit = fitGPD(
      [0.1, 0.1, 0.2, 0.3, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9],
      0.4,
    );
    expect(fit).not.toBeNull();
    // Exactly at u: survival = 1 - exceedance_rate
    const surv = gpdSurvival(fit!, 0.4);
    expect(surv).toBeCloseTo(1 - fit!.exceedance_rate, 5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Config validation
// ──────────────────────────────────────────────────────────────────────

describe("config", () => {
  it("defaults match plan spec", () => {
    const c = eng.getConfig();
    expect(c.thumbs_down_max_rate).toBe(0.15);
    expect(c.error_rate_max).toBe(0.05);
    expect(c.latency_p95_ms_max).toBe(3000);
    expect(c.safety_score_min).toBe(0.7);
    expect(c.rollback_sla_ms).toBe(60_000);
    expect(c).toEqual(DEFAULT_TRIGGER_CONFIG);
  });

  it("rejects invalid config values", () => {
    expect(() => eng.setConfig({ thumbs_down_window: 0 })).toThrow(/thumbs_down_window/);
    expect(() => eng.setConfig({ thumbs_down_max_rate: 1.5 })).toThrow(/thumbs_down_max_rate/);
    expect(() => eng.setConfig({ error_rate_max: -0.1 })).toThrow(/error_rate_max/);
    expect(() => eng.setConfig({ safety_score_min: 2 })).toThrow(/safety_score_min/);
    expect(() => eng.setConfig({ evt_threshold_quantile: 1 })).toThrow(/evt_threshold_quantile/);
    expect(() => eng.setConfig({ rollback_sla_ms: 0 })).toThrow(/rollback_sla_ms/);
  });

  it("allows tightening", () => {
    eng.setConfig({ safety_score_min: 0.8, rollback_sla_ms: 30_000 });
    expect(eng.getConfig().safety_score_min).toBe(0.8);
    expect(eng.getConfig().rollback_sla_ms).toBe(30_000);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Triggers
// ──────────────────────────────────────────────────────────────────────

describe("triggers", () => {
  it("safety_score: single sample below 0.70 fires immediately", () => {
    const trig = eng.recordFeedback({
      program_id: "P0",
      artifact_id: ART,
      timestamp: 1_000_000,
      thumbs_up: true,
      error: false,
      latency_ms: 100,
      safety_score: 0.65,
      physics_validity: 0.9,
    });
    expect(trig).not.toBeNull();
    expect(trig!.kind).toBe("safety_score");
    expect(trig!.measured_value).toBe(0.65);
  });

  it("thumbs_down_rate: >15% over window of 20 fires", () => {
    // 16 thumbs-up + 4 thumbs-down → 20% rate
    const t0 = 1_000_000;
    for (let i = 0; i < 16; i++) {
      eng.recordFeedback(
        { program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i, thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.9 },
      );
    }
    let trig = null;
    for (let i = 16; i < 20; i++) {
      trig = eng.recordFeedback({
        program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i, thumbs_up: false, error: false, latency_ms: 100, safety_score: 0.9,
      });
    }
    expect(trig).not.toBeNull();
    expect(trig!.kind).toBe("thumbs_down_rate");
    expect(trig!.measured_value).toBeCloseTo(0.2, 5);
  });

  it("thumbs_down does NOT fire at exactly 15%", () => {
    // 17 thumbs-up + 3 thumbs-down = 15% not > 15%
    const t0 = 1_000_000;
    for (let i = 0; i < 17; i++) {
      eng.recordFeedback({
        program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i, thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.9,
      });
    }
    let trig = null;
    for (let i = 17; i < 20; i++) {
      trig = eng.recordFeedback({
        program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i, thumbs_up: false, error: false, latency_ms: 100, safety_score: 0.9,
      });
    }
    expect(trig).toBeNull();
  });

  it("error_rate >5% over window fires", () => {
    const t0 = 1_000_000;
    // 9 clean + 1 error = 10% error
    for (let i = 0; i < 9; i++) {
      eng.recordFeedback({
        program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i * 1000,
        thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.95,
      });
    }
    const trig = eng.recordFeedback(
      {
        program_id: "P_err", artifact_id: ART, timestamp: t0 + 9000,
        thumbs_up: true, error: true, latency_ms: 100, safety_score: 0.95,
      },
      t0 + 9001,
    );
    expect(trig).not.toBeNull();
    expect(trig!.kind).toBe("error_rate");
  });

  it("latency_p95 >3000ms fires on slow tail", () => {
    // Need p95 R-7 of sorted[...] > 3000. With 10 samples, h = 9*0.95 = 8.55
    // so p95 = sorted[8] + 0.55*(sorted[9]-sorted[8]).
    // 9×100ms + 1×8000ms → p95 = 100 + 0.55*(8000-100) = 100 + 4345 = 4445
    const t0 = 1_000_000;
    const latencies = [100, 100, 100, 100, 100, 100, 100, 100, 100, 8000];
    let trig = null;
    for (let i = 0; i < latencies.length; i++) {
      trig = eng.recordFeedback(
        {
          program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i * 1000,
          thumbs_up: true, error: false, latency_ms: latencies[i], safety_score: 0.95,
        },
        t0 + i * 1000 + 1,
      );
    }
    expect(trig).not.toBeNull();
    expect(trig!.kind).toBe("latency_p95");
    expect(trig!.measured_value).toBeGreaterThan(3000);
  });

  it("evt_tail_breach: extreme physics_validity fires", () => {
    // Seed 35 samples with spread physics so quantileR7(0.01) is meaningful
    // and enough values lie below u for GPD to fit (k ≥ 2).
    const t0 = 1_000_000;
    for (let i = 0; i < 35; i++) {
      const pv = 0.65 + (i % 10) * 0.03; // spread 0.65..0.92
      eng.recordFeedback(
        {
          program_id: `P${i}`, artifact_id: ART, timestamp: t0 + i * 1000,
          thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.95,
          physics_validity: pv,
        },
        t0 + i * 1000 + 1,
      );
    }
    // Extreme catastrophic tail sample.
    const trig = eng.recordFeedback(
      {
        program_id: "CATASTROPHE", artifact_id: ART, timestamp: 2_000_000,
        thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.95,
        physics_validity: 0.02,
      },
      2_000_001,
    );
    expect(trig).not.toBeNull();
    expect(trig!.kind).toBe("evt_tail_breach");
  });

  it("latched artifact does not re-fire", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    eng.executeRollback({
      trigger: trig!,
      initiated_at: trig!.detected_at + 100,
      completed_at: trig!.detected_at + 5_000,
    });
    expect(eng.isLatched(ART)).toBe(true);
    const trig2 = eng.recordFeedback({
      program_id: "P1", artifact_id: ART, timestamp: 1_000_100,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.4,
    });
    expect(trig2).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// Rollback execution
// ──────────────────────────────────────────────────────────────────────

describe("executeRollback", () => {
  it("requires registered fallback", () => {
    const e2 = new MultiSignalAutoRollbackEngine();
    const fb: ProgramFeedback = {
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    };
    const trig = e2.recordFeedback(fb);
    expect(() =>
      e2.executeRollback({
        trigger: trig!,
        initiated_at: trig!.detected_at + 10,
        completed_at: trig!.detected_at + 5_000,
      }),
    ).toThrow(/no fallback/);
  });

  it("rejects backwards timestamps", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    expect(() =>
      eng.executeRollback({
        trigger: trig!,
        initiated_at: trig!.detected_at - 10,
        completed_at: trig!.detected_at,
      }),
    ).toThrow(/initiated_at cannot precede/);
    expect(() =>
      eng.executeRollback({
        trigger: trig!,
        initiated_at: trig!.detected_at + 100,
        completed_at: trig!.detected_at + 50,
      }),
    ).toThrow(/completed_at cannot precede/);
  });

  it("flags SLA violation when elapsed > 60s", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    const ex = eng.executeRollback({
      trigger: trig!,
      initiated_at: trig!.detected_at + 10,
      completed_at: trig!.detected_at + 90_000,
    });
    expect(ex.within_sla).toBe(false);
    expect(ex.elapsed_ms).toBe(90_000);
  });

  it("records within-SLA success", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    const ex = eng.executeRollback({
      trigger: trig!,
      initiated_at: trig!.detected_at + 100,
      completed_at: trig!.detected_at + 5_000,
      notes: "reverted to v1-lkg via feature-flag flip",
    });
    expect(ex.outcome).toBe("success");
    expect(ex.within_sla).toBe(true);
    expect(ex.to_artifact).toBe(FB);
  });

  it("rearm() lets next signal fire again", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    eng.executeRollback({
      trigger: trig!,
      initiated_at: trig!.detected_at + 10,
      completed_at: trig!.detected_at + 5_000,
    });
    eng.rearm(ART);
    expect(eng.isLatched(ART)).toBe(false);
    const trig2 = eng.recordFeedback({
      program_id: "P1", artifact_id: ART, timestamp: 1_100_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.4,
    });
    expect(trig2).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// Stats + admin
// ──────────────────────────────────────────────────────────────────────

describe("stats + admin", () => {
  it("stats aggregates counts + SLA violations", () => {
    const trig = eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.5,
    });
    eng.executeRollback({
      trigger: trig!,
      initiated_at: trig!.detected_at,
      completed_at: trig!.detected_at + 90_000,
    });
    const s = eng.getStats();
    expect(s.total_executions).toBe(1);
    expect(s.sla_violation_count).toBe(1);
    expect(s.sla_violation_rate).toBe(1);
    expect(s.by_kind.safety_score).toBe(1);
  });

  it("clearAll resets everything", () => {
    eng.recordFeedback({
      program_id: "P0", artifact_id: ART, timestamp: 1_000_000,
      thumbs_up: true, error: false, latency_ms: 100, safety_score: 0.95,
    });
    eng.clearAll();
    expect(eng.getStats().total_feedback).toBe(0);
    expect(eng.getConfig()).toEqual(DEFAULT_TRIGGER_CONFIG);
    expect(eng.getFallback(ART)).toBeNull();
  });
});
