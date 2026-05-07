/**
 * TrainingLedgerEngine tests (U-LPR-TRAINING-LEDGER)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  TrainingLedgerEngine,
  type TrainingRunStart,
} from "../../engines/TrainingLedgerEngine.js";

let eng: TrainingLedgerEngine;

const SHA = (seed: string): string =>
  (seed + "0".repeat(64)).slice(0, 64);

function baseStart(overrides: Partial<TrainingRunStart> = {}): TrainingRunStart {
  return {
    experiment_id: "lathe-rank16-v2",
    attempt: 1,
    start_ts: 1_700_000_000_000,
    base_weight_sha256: SHA("a1"),
    manifest_sha256: SHA("b2"),
    aug_seed: 42,
    hyperparams_sha256: SHA("c3"),
    tokenizer_version: "tiktoken/cl100k-base",
    trainer_commit_sha: "abcdef1",
    author: "ml-eng",
    ...overrides,
  };
}

beforeEach(() => {
  eng = new TrainingLedgerEngine();
});

// ──────────────────────────────────────────────────────────────────────
// openRun validation
// ──────────────────────────────────────────────────────────────────────

describe("openRun", () => {
  it("opens a valid run and returns deterministic run_id", () => {
    const r = eng.openRun(baseStart());
    expect(r.run_id).toMatch(/^[a-f0-9]{16}$/);
    expect(r.status).toBe("open");
    expect(r.fingerprint.aug_seed).toBe(42);
  });

  it("run_id is deterministic across engines for same inputs", () => {
    const r1 = eng.openRun(baseStart());
    const eng2 = new TrainingLedgerEngine();
    const r2 = eng2.openRun(baseStart());
    expect(r1.run_id).toBe(r2.run_id);
  });

  it("rejects empty experiment_id", () => {
    expect(() => eng.openRun(baseStart({ experiment_id: "  " }))).toThrow(/experiment_id/);
  });

  it("rejects attempt <1", () => {
    expect(() => eng.openRun(baseStart({ attempt: 0 }))).toThrow(/attempt/);
  });

  it("rejects malformed base_weight_sha256", () => {
    expect(() => eng.openRun(baseStart({ base_weight_sha256: "ZZZ" }))).toThrow(/base_weight_sha256/);
  });

  it("rejects malformed manifest_sha256", () => {
    expect(() => eng.openRun(baseStart({ manifest_sha256: "short" }))).toThrow(/manifest_sha256/);
  });

  it("rejects negative aug_seed", () => {
    expect(() => eng.openRun(baseStart({ aug_seed: -1 }))).toThrow(/aug_seed/);
  });

  it("rejects non-integer aug_seed", () => {
    expect(() => eng.openRun(baseStart({ aug_seed: 3.14 }))).toThrow(/aug_seed/);
  });

  it("rejects missing tokenizer_version", () => {
    expect(() => eng.openRun(baseStart({ tokenizer_version: "" }))).toThrow(/tokenizer_version/);
  });

  it("rejects non-git trainer_commit_sha", () => {
    expect(() => eng.openRun(baseStart({ trainer_commit_sha: "nothex!" }))).toThrow(/trainer_commit_sha/);
  });

  it("rejects duplicate run_id (same experiment/attempt/start_ts)", () => {
    eng.openRun(baseStart());
    expect(() => eng.openRun(baseStart())).toThrow(/duplicate|already has run/);
  });

  it("rejects attempt collision (different start_ts, same attempt)", () => {
    eng.openRun(baseStart());
    expect(() =>
      eng.openRun(baseStart({ start_ts: 1_700_000_001_000 })),
    ).toThrow(/already has run/);
  });

  it("allows attempt=2 for same experiment after attempt=1", () => {
    eng.openRun(baseStart({ attempt: 1 }));
    const r2 = eng.openRun(baseStart({ attempt: 2 }));
    expect(r2.run_id).not.toBe(eng.listRuns()[0].run_id);
  });
});

// ──────────────────────────────────────────────────────────────────────
// closeRun
// ──────────────────────────────────────────────────────────────────────

describe("closeRun", () => {
  it("completes a run with final weight + metrics", () => {
    const r = eng.openRun(baseStart());
    const closed = eng.closeRun({
      run_id: r.run_id,
      end_ts: r.start_ts + 3_600_000,
      status: "completed",
      final_weight_sha256: SHA("d4"),
      eval_metrics_sha256: SHA("e5"),
      elapsed_ms: 3_600_000,
      wall_clock_ms: 3_700_000,
    });
    expect(closed.status).toBe("completed");
    expect(closed.outcome?.elapsed_ms).toBe(3_600_000);
  });

  it("rejects close before start", () => {
    const r = eng.openRun(baseStart());
    expect(() =>
      eng.closeRun({
        run_id: r.run_id,
        end_ts: r.start_ts - 1,
        status: "aborted",
        reason: "test backwards time",
        elapsed_ms: 0,
        wall_clock_ms: 0,
      }),
    ).toThrow(/end_ts/);
  });

  it("rejects elapsed_ms > wall_clock_ms", () => {
    const r = eng.openRun(baseStart());
    expect(() =>
      eng.closeRun({
        run_id: r.run_id,
        end_ts: r.start_ts + 100,
        status: "completed",
        final_weight_sha256: SHA("d4"),
        eval_metrics_sha256: SHA("e5"),
        elapsed_ms: 5_000,
        wall_clock_ms: 3_000,
      }),
    ).toThrow(/elapsed_ms/);
  });

  it("completed run requires final_weight + eval_metrics", () => {
    const r = eng.openRun(baseStart());
    expect(() =>
      eng.closeRun({
        run_id: r.run_id,
        end_ts: r.start_ts + 100,
        status: "completed",
        elapsed_ms: 100,
        wall_clock_ms: 100,
      }),
    ).toThrow(/final_weight_sha256/);
  });

  it("aborted run requires reason ≥10 chars", () => {
    const r = eng.openRun(baseStart());
    expect(() =>
      eng.closeRun({
        run_id: r.run_id,
        end_ts: r.start_ts + 100,
        status: "aborted",
        reason: "short",
        elapsed_ms: 100,
        wall_clock_ms: 100,
      }),
    ).toThrow(/reason/);
  });

  it("cannot close already-closed run", () => {
    const r = eng.openRun(baseStart());
    eng.closeRun({
      run_id: r.run_id,
      end_ts: r.start_ts + 100,
      status: "aborted",
      reason: "OOM on GPU node 2",
      elapsed_ms: 100,
      wall_clock_ms: 100,
    });
    expect(() =>
      eng.closeRun({
        run_id: r.run_id,
        end_ts: r.start_ts + 200,
        status: "aborted",
        reason: "double close attempt",
        elapsed_ms: 200,
        wall_clock_ms: 200,
      }),
    ).toThrow(/already closed/);
  });

  it("rejects close of unknown run_id", () => {
    expect(() =>
      eng.closeRun({
        run_id: "deadbeef00000000",
        end_ts: 0,
        status: "aborted",
        reason: "bogus run id",
        elapsed_ms: 0,
        wall_clock_ms: 0,
      }),
    ).toThrow(/not found/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// listRuns + filter
// ──────────────────────────────────────────────────────────────────────

describe("listRuns", () => {
  it("filters by experiment_id / status / author", () => {
    eng.openRun(baseStart({ experiment_id: "exp-A", attempt: 1, start_ts: 1_000 }));
    eng.openRun(baseStart({ experiment_id: "exp-A", attempt: 2, start_ts: 2_000 }));
    eng.openRun(baseStart({ experiment_id: "exp-B", attempt: 1, start_ts: 3_000, author: "other" }));
    expect(eng.listRuns({ experiment_id: "exp-A" })).toHaveLength(2);
    expect(eng.listRuns({ experiment_id: "exp-B" })).toHaveLength(1);
    expect(eng.listRuns({ author: "other" })).toHaveLength(1);
    expect(eng.listRuns({ status: "open" })).toHaveLength(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// driftReport
// ──────────────────────────────────────────────────────────────────────

describe("driftReport", () => {
  it("no drift for single run", () => {
    eng.openRun(baseStart());
    const rep = eng.driftReport("lathe-rank16-v2");
    expect(rep.drift_detected).toBe(false);
    expect(rep.manifest_drift.distinct).toBe(1);
    expect(rep.run_count).toBe(1);
  });

  it("manifest drift fires when two runs see different manifests", () => {
    eng.openRun(baseStart({ attempt: 1, start_ts: 1_000 }));
    eng.openRun(
      baseStart({
        attempt: 2,
        start_ts: 2_000,
        manifest_sha256: SHA("ff"),
      }),
    );
    const rep = eng.driftReport("lathe-rank16-v2");
    expect(rep.drift_detected).toBe(true);
    expect(rep.manifest_drift.distinct).toBe(2);
  });

  it("aug_seed drift alone does NOT trigger drift_detected (by design)", () => {
    eng.openRun(baseStart({ attempt: 1, start_ts: 1_000, aug_seed: 1 }));
    eng.openRun(baseStart({ attempt: 2, start_ts: 2_000, aug_seed: 2 }));
    const rep = eng.driftReport("lathe-rank16-v2");
    expect(rep.aug_seed_drift.distinct).toBe(2);
    // Seed drift is intentional for ablations — not flagged automatically
    expect(rep.drift_detected).toBe(false);
  });

  it("trainer commit drift is flagged (code changed mid-experiment)", () => {
    eng.openRun(baseStart({ attempt: 1, start_ts: 1_000 }));
    eng.openRun(
      baseStart({
        attempt: 2,
        start_ts: 2_000,
        trainer_commit_sha: "1234567",
      }),
    );
    const rep = eng.driftReport("lathe-rank16-v2");
    expect(rep.drift_detected).toBe(true);
    expect(rep.trainer_commit_drift.distinct).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// snapshot persistence
// ──────────────────────────────────────────────────────────────────────

describe("toSnapshot + loadSnapshot", () => {
  it("round-trips preserving runs + order", () => {
    eng.openRun(baseStart({ attempt: 1, start_ts: 1_000 }));
    eng.openRun(baseStart({ attempt: 2, start_ts: 2_000 }));
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    expect(snap.runs).toHaveLength(2);

    const eng2 = new TrainingLedgerEngine();
    const loaded = eng2.loadSnapshot(snap);
    expect(loaded).toBe(2);
    expect(eng2.listRuns()).toHaveLength(2);
  });

  it("rejects unsupported schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, runs: [] }),
    ).toThrow(/schemaVersion/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// stats + admin
// ──────────────────────────────────────────────────────────────────────

describe("getStats + clearAll", () => {
  it("tracks totals, status breakdown, and unique experiments", () => {
    const r1 = eng.openRun(baseStart({ attempt: 1, start_ts: 1_000 }));
    eng.closeRun({
      run_id: r1.run_id,
      end_ts: 1_000 + 100,
      status: "completed",
      final_weight_sha256: SHA("d4"),
      eval_metrics_sha256: SHA("e5"),
      elapsed_ms: 100,
      wall_clock_ms: 100,
    });
    eng.openRun(baseStart({ attempt: 2, start_ts: 2_000 }));
    const s = eng.getStats();
    expect(s.total_runs).toBe(2);
    expect(s.by_status.completed).toBe(1);
    expect(s.by_status.open).toBe(1);
    expect(s.experiments).toBe(1);
  });

  it("clearAll resets state", () => {
    eng.openRun(baseStart());
    eng.clearAll();
    expect(eng.getStats().total_runs).toBe(0);
    expect(eng.listRuns()).toHaveLength(0);
  });
});
