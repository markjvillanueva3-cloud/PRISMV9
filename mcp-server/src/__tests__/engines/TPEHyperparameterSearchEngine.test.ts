/**
 * TPEHyperparameterSearchEngine tests (U-LPR-HPSEARCH)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  TPEHyperparameterSearchEngine,
  DEFAULT_SEARCH_CONFIG,
  type HPSample,
} from "../../engines/TPEHyperparameterSearchEngine.js";

let eng: TPEHyperparameterSearchEngine;

beforeEach(() => {
  eng = new TPEHyperparameterSearchEngine({ seed: 42 });
});

// ──────────────────────────────────────────────────────────────────────
// Config + defaults
// ──────────────────────────────────────────────────────────────────────

describe("config + defaults", () => {
  it("defaults match plan (8 trial budget, γ=0.25, warmup=2)", () => {
    expect(DEFAULT_SEARCH_CONFIG.total_budget).toBe(8);
    expect(DEFAULT_SEARCH_CONFIG.warmup_trials).toBe(2);
    expect(DEFAULT_SEARCH_CONFIG.gamma_split).toBe(0.25);
  });

  it("rejects invalid config values", () => {
    expect(() => new TPEHyperparameterSearchEngine({ total_budget: 1 })).toThrow(/total_budget/);
    expect(() => new TPEHyperparameterSearchEngine({ total_budget: 5, warmup_trials: 5 })).toThrow(/warmup/);
    expect(() => new TPEHyperparameterSearchEngine({ gamma_split: 0 })).toThrow(/gamma_split/);
    expect(() => new TPEHyperparameterSearchEngine({ gamma_split: 1 })).toThrow(/gamma_split/);
    expect(() =>
      new TPEHyperparameterSearchEngine({ candidates_per_tpe_step: 0 }),
    ).toThrow(/candidates/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// randomSample respects search space bounds
// ──────────────────────────────────────────────────────────────────────

describe("randomSample", () => {
  it("rank ∈ {8,16,32,64}", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect([8, 16, 32, 64]).toContain(s.rank);
    }
  });

  it("alpha ∈ {rank, 2·rank}", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect([s.rank, 2 * s.rank]).toContain(s.alpha);
    }
  });

  it("dropout ∈ [0, 0.2]", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect(s.dropout).toBeGreaterThanOrEqual(0);
      expect(s.dropout).toBeLessThanOrEqual(0.2);
    }
  });

  it("lr ∈ [1e-5, 1e-3]", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect(s.lr).toBeGreaterThanOrEqual(1e-5);
      expect(s.lr).toBeLessThanOrEqual(1e-3);
    }
  });

  it("warmup_ratio ∈ [0.01, 0.10]", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect(s.warmup_ratio).toBeGreaterThanOrEqual(0.01);
      expect(s.warmup_ratio).toBeLessThanOrEqual(0.10);
    }
  });

  it("target_modules ∈ {qkvo, all-linear}", () => {
    for (let i = 0; i < 50; i++) {
      const s = eng.randomSample();
      expect(["qkvo", "all-linear"]).toContain(s.target_modules);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────
// suggest / tell lifecycle
// ──────────────────────────────────────────────────────────────────────

describe("suggest + tell", () => {
  function complete(eng: TPEHyperparameterSearchEngine, loss: number): void {
    const sug = eng.suggest()!;
    eng.tell({
      trial_id: sug.trial_id,
      sample: sug.sample,
      loss,
      elapsed_ms: 100,
      completed_at: Date.now(),
      source: sug.source,
    });
  }

  it("first 2 suggestions are warmup (random)", () => {
    const s1 = eng.suggest()!;
    expect(s1.source).toBe("warmup");
    expect(s1.trial_id).toBe(0);
    eng.tell({
      trial_id: 0, sample: s1.sample, loss: 1.0, elapsed_ms: 10, completed_at: 1, source: "warmup",
    });
    const s2 = eng.suggest()!;
    expect(s2.source).toBe("warmup");
  });

  it("switches to TPE after warmup_trials completed", () => {
    complete(eng, 1.0);
    complete(eng, 0.8);
    const s3 = eng.suggest()!;
    expect(s3.source).toBe("tpe");
  });

  it("returns null once budget exhausted (8 trials)", () => {
    for (let i = 0; i < 8; i++) complete(eng, 1.0 - i * 0.05);
    expect(eng.suggest()).toBeNull();
    expect(eng.isExhausted()).toBe(true);
  });

  it("rejects out-of-order tell", () => {
    eng.suggest();
    expect(() =>
      eng.tell({
        trial_id: 5,
        sample: eng.randomSample(),
        loss: 0.5,
        elapsed_ms: 0,
        completed_at: 0,
        source: "warmup",
      }),
    ).toThrow(/trial_id/);
  });

  it("rejects non-finite loss", () => {
    const s = eng.suggest()!;
    expect(() =>
      eng.tell({
        trial_id: s.trial_id,
        sample: s.sample,
        loss: NaN,
        elapsed_ms: 0,
        completed_at: 0,
        source: "warmup",
      }),
    ).toThrow(/loss/);
  });

  it("bestTrial returns min-loss record", () => {
    complete(eng, 1.0);
    complete(eng, 0.3);
    complete(eng, 0.8);
    const best = eng.bestTrial()!;
    expect(best.loss).toBe(0.3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// perturb
// ──────────────────────────────────────────────────────────────────────

describe("perturb", () => {
  it("perturbed sample stays within bounds", () => {
    const base: HPSample = {
      rank: 16,
      alpha: 32,
      dropout: 0.1,
      lr: 1e-4,
      warmup_ratio: 0.05,
      target_modules: "qkvo",
    };
    for (let i = 0; i < 100; i++) {
      const p = eng.perturb(base);
      expect([8, 16, 32, 64]).toContain(p.rank);
      expect(p.dropout).toBeGreaterThanOrEqual(0);
      expect(p.dropout).toBeLessThanOrEqual(0.2);
      expect(p.lr).toBeGreaterThanOrEqual(1e-5);
      expect(p.lr).toBeLessThanOrEqual(1e-3);
      expect(p.warmup_ratio).toBeGreaterThanOrEqual(0.01);
      expect(p.warmup_ratio).toBeLessThanOrEqual(0.10);
    }
  });

  it("most perturbations keep rank near the exemplar", () => {
    const base: HPSample = {
      rank: 32, alpha: 64, dropout: 0.1, lr: 1e-4, warmup_ratio: 0.05,
      target_modules: "qkvo",
    };
    let kept = 0;
    for (let i = 0; i < 100; i++) {
      const p = eng.perturb(base);
      if (p.rank === 32) kept += 1;
    }
    // 70% retention rate on categoricals per design
    expect(kept).toBeGreaterThan(50);
  });
});

// ──────────────────────────────────────────────────────────────────────
// parzenLogDensity behaviour
// ──────────────────────────────────────────────────────────────────────

describe("parzenLogDensity", () => {
  it("empty D → -Infinity", () => {
    const d = eng.parzenLogDensity(eng.randomSample(), []);
    expect(d).toBe(-Infinity);
  });

  it("same sample as exemplar → higher density than distant sample", () => {
    const exemplar: HPSample = {
      rank: 16, alpha: 16, dropout: 0.05, lr: 5e-4, warmup_ratio: 0.05,
      target_modules: "qkvo",
    };
    const D = [{
      trial_id: 0,
      sample: exemplar,
      loss: 0.1,
      elapsed_ms: 0,
      completed_at: 0,
      source: "warmup" as const,
    }];
    const near = eng.parzenLogDensity(exemplar, D);
    const far = eng.parzenLogDensity(
      { rank: 64, alpha: 128, dropout: 0.19, lr: 1e-5, warmup_ratio: 0.10, target_modules: "all-linear" },
      D,
    );
    expect(near).toBeGreaterThan(far);
  });
});

// ──────────────────────────────────────────────────────────────────────
// TPE behaviour: should favour exemplars near good region
// ──────────────────────────────────────────────────────────────────────

describe("TPE end-to-end", () => {
  it("after warmup, TPE samples tend toward the low-loss exemplar rank", () => {
    // Plant a distinct low-loss rank in warmup.
    const s1 = eng.suggest()!;
    eng.tell({
      trial_id: s1.trial_id,
      sample: { ...s1.sample, rank: 8, alpha: 8 }, // clearly low-loss rank
      loss: 0.1,
      elapsed_ms: 0,
      completed_at: 0,
      source: "warmup",
    });
    const s2 = eng.suggest()!;
    eng.tell({
      trial_id: s2.trial_id,
      sample: { ...s2.sample, rank: 64, alpha: 128 }, // high-loss rank
      loss: 0.9,
      elapsed_ms: 0,
      completed_at: 0,
      source: "warmup",
    });
    // TPE phase: collect 6 suggestions and count how many kept rank=8
    let picked_good_rank = 0;
    for (let i = 0; i < 6; i++) {
      const s = eng.suggest();
      if (s === null) break;
      if (s.sample.rank === 8) picked_good_rank += 1;
      eng.tell({
        trial_id: s!.trial_id,
        sample: s!.sample,
        loss: s!.sample.rank === 8 ? 0.15 : 0.85,
        elapsed_ms: 0,
        completed_at: 0,
        source: s!.source,
      });
    }
    // TPE bias towards low-loss exemplar → at least 3/6 picks should be rank=8
    expect(picked_good_rank).toBeGreaterThanOrEqual(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Snapshot persistence
// ──────────────────────────────────────────────────────────────────────

describe("snapshot", () => {
  it("toSnapshot + loadSnapshot round-trips", () => {
    const s = eng.suggest()!;
    eng.tell({
      trial_id: s.trial_id, sample: s.sample, loss: 0.5, elapsed_ms: 0, completed_at: 0, source: "warmup",
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    expect(snap.trials).toHaveLength(1);
    const eng2 = new TPEHyperparameterSearchEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.listTrials()).toHaveLength(1);
  });

  it("rejects bad schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({
        schemaVersion: 99,
        config: DEFAULT_SEARCH_CONFIG,
        trials: [],
      }),
    ).toThrow(/schemaVersion/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Sample validation
// ──────────────────────────────────────────────────────────────────────

describe("sample validation", () => {
  it("rejects non-canonical rank", () => {
    expect(() =>
      eng.tell({
        trial_id: 0,
        sample: {
          rank: 24 as 16,
          alpha: 24, dropout: 0.1, lr: 1e-4, warmup_ratio: 0.05, target_modules: "qkvo",
        },
        loss: 0.5, elapsed_ms: 0, completed_at: 0, source: "warmup",
      }),
    ).toThrow(/rank/);
  });

  it("rejects alpha ≠ rank or 2·rank", () => {
    expect(() =>
      eng.tell({
        trial_id: 0,
        sample: {
          rank: 16, alpha: 99, dropout: 0.1, lr: 1e-4, warmup_ratio: 0.05,
          target_modules: "qkvo",
        },
        loss: 0.5, elapsed_ms: 0, completed_at: 0, source: "warmup",
      }),
    ).toThrow(/alpha/);
  });

  it("rejects out-of-range continuous params", () => {
    const s: HPSample = {
      rank: 16, alpha: 16, dropout: 0.5, // out of range
      lr: 1e-4, warmup_ratio: 0.05, target_modules: "qkvo",
    };
    expect(() =>
      eng.tell({
        trial_id: 0, sample: s, loss: 0.5, elapsed_ms: 0, completed_at: 0, source: "warmup",
      }),
    ).toThrow(/dropout/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// clearAll
// ──────────────────────────────────────────────────────────────────────

describe("clearAll", () => {
  it("resets trials + PRNG", () => {
    eng.suggest();
    eng.clearAll();
    expect(eng.listTrials()).toHaveLength(0);
    expect(eng.suggest()!.trial_id).toBe(0);
  });
});
