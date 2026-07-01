/**
 * ConsensusModelPerformanceEngine.test.ts — per-engine test split for the
 * U-GO-C6 wiring-enforce Stop gate (one test file per engine name).
 *
 * Covers loadState (hermetic mkdtemp I/O) + recommendVendors (pure 3-branch
 * keep-set ladder) + recordOutcome (pure EMA update). 18 tests, all
 * hard-asserted.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  consensusModelPerformanceEngine,
  ConsensusModelPerformanceEngine,
  CONSENSUS_MODEL_PERFORMANCE_SCHEMA_VERSION,
  type ConsensusPerformanceState,
} from "../engines/ConsensusModelPerformanceEngine.js";

function mkTmpStatePath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-consensus-perf-"));
  return path.join(dir, name);
}

// ───────────────────────────────────────────────────────────────────────────
// loadState — fail-open I/O
// ───────────────────────────────────────────────────────────────────────────

describe("ConsensusModelPerformanceEngine.loadState — fail-open", () => {
  it("returns an empty state when the file is missing", () => {
    const p = mkTmpStatePath("missing.json");
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.schemaVersion).toBe(CONSENSUS_MODEL_PERFORMANCE_SCHEMA_VERSION);
    expect(s.vendors).toEqual({});
  });

  it("returns an empty state on invalid JSON (no throw)", () => {
    const p = mkTmpStatePath("invalid.json");
    fs.writeFileSync(p, "{not valid json", "utf-8");
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.vendors).toEqual({});
  });

  it("returns an empty state on wrong-shape JSON (null/array/missing vendors)", () => {
    const cases = ["null", "[]", '{"schemaVersion":"1.0.0"}', '{"vendors":null}', '{"vendors":[]}'];
    for (const body of cases) {
      const p = mkTmpStatePath("shape.json");
      fs.writeFileSync(p, body, "utf-8");
      const s = consensusModelPerformanceEngine.loadState(p);
      expect(s.vendors).toEqual({});
    }
  });

  it("parses a valid state file", () => {
    const p = mkTmpStatePath("ok.json");
    const valid = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { reasoning: { ema: 0.85, n: 12, lastUpdate: "2026-05-22T00:00:00Z" } },
        ollama: { reasoning: { ema: 0.42, n: 8, lastUpdate: "2026-05-22T00:00:00Z" } },
      },
    };
    fs.writeFileSync(p, JSON.stringify(valid), "utf-8");
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.vendors.anthropic.reasoning.ema).toBe(0.85);
    expect(s.vendors.ollama.reasoning.ema).toBe(0.42);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// recommendVendors — pure 3-branch keep-set ladder
// ───────────────────────────────────────────────────────────────────────────

describe("ConsensusModelPerformanceEngine.recommendVendors — pure", () => {
  const stateOf = (vendorEmas: Record<string, Record<string, number>>): ConsensusPerformanceState => ({
    schemaVersion: "1.0.0",
    vendors: Object.fromEntries(
      Object.entries(vendorEmas).map(([v, taskMap]) => [
        v,
        Object.fromEntries(Object.entries(taskMap).map(([t, ema]) => [t, { ema, n: 1, lastUpdate: "2026-05-22T00:00:00Z" }])),
      ]),
    ),
  });

  it("returns empty ranked on empty available", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(stateOf({}), "reasoning", []);
    expect(r.ranked).toEqual([]);
  });

  it("returns empty ranked on non-array available (defensive)", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(
      stateOf({}), "reasoning", null as unknown as readonly string[],
    );
    expect(r.ranked).toEqual([]);
  });

  it("COLD START — all-zero ema keeps every vendor (never collapses)", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(
      stateOf({}), "reasoning", ["anthropic", "ollama", "xai", "google"], { floor: 2 },
    );
    expect(r.ranked.length).toBe(4);
    expect(r.rationale).toMatch(/cold start/);
  });

  it("WITH SIGNAL — drops zero-ema vendors when non-zero count >= floor", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(
      stateOf({ anthropic: { reasoning: 0.9 }, ollama: { reasoning: 0.5 } }),
      "reasoning",
      ["anthropic", "ollama", "xai", "google"],
      { floor: 2 },
    );
    expect(r.ranked.map((r) => r.vendor)).toEqual(["anthropic", "ollama"]);
    expect(r.ranked[0].score).toBe(0.9);
    expect(r.rationale).toMatch(/kept 2 vendors with non-zero ema/);
  });

  it("PADS to floor when non-zero count < floor (keeps consensus alive)", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(
      stateOf({ anthropic: { reasoning: 0.9 } }),
      "reasoning",
      ["anthropic", "ollama", "xai", "google"],
      { floor: 3 },
    );
    expect(r.ranked.length).toBe(3);
    expect(r.ranked[0].vendor).toBe("anthropic");
    expect(r.rationale).toMatch(/padded keep set to floor/);
  });

  it("CLAMPS floor to available.length when floor exceeds it", () => {
    const r = consensusModelPerformanceEngine.recommendVendors(
      stateOf({}), "reasoning", ["anthropic", "ollama"], { floor: 10 },
    );
    expect(r.ranked.length).toBe(2);
  });

  it("uses task-typed scoring (different taskTypes → different keep sets)", () => {
    const s = stateOf({
      anthropic: { reasoning: 0.9, summarize: 0.1 },
      ollama: { reasoning: 0.2, summarize: 0.95 },
    });
    const rReason = consensusModelPerformanceEngine.recommendVendors(s, "reasoning", ["anthropic", "ollama"], { floor: 1 });
    const rSum = consensusModelPerformanceEngine.recommendVendors(s, "summarize", ["anthropic", "ollama"], { floor: 1 });
    expect(rReason.ranked[0].vendor).toBe("anthropic");
    expect(rSum.ranked[0].vendor).toBe("ollama");
  });

  it("handles NaN ema in state (defensive — treats as 0)", () => {
    const bad: ConsensusPerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { anthropic: { reasoning: { ema: NaN, n: 1, lastUpdate: "" } } },
    };
    const r = consensusModelPerformanceEngine.recommendVendors(
      bad, "reasoning", ["anthropic", "ollama"], { floor: 2 },
    );
    expect(r.ranked.length).toBe(2);
    expect(r.rationale).toMatch(/cold start/);
  });

  it("treats a degenerate floor (≤0, NaN) as default floor=2", () => {
    const r1 = consensusModelPerformanceEngine.recommendVendors(
      stateOf({}), "reasoning", ["a", "b", "c"], { floor: -1 },
    );
    expect(r1.ranked.length).toBe(3);
    const r2 = consensusModelPerformanceEngine.recommendVendors(
      stateOf({ a: { reasoning: 0.5 } }), "reasoning", ["a", "b", "c"], { floor: Number.NaN },
    );
    expect(r2.ranked.length).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// recordOutcome — pure EMA update
// ───────────────────────────────────────────────────────────────────────────

describe("ConsensusModelPerformanceEngine.recordOutcome — pure EMA update", () => {
  it("initializes a new (vendor, taskType) entry to the reward value", () => {
    const before: ConsensusPerformanceState = { schemaVersion: "1.0.0", vendors: {} };
    const after = consensusModelPerformanceEngine.recordOutcome(before, "anthropic", "reasoning", 0.8);
    expect(after.vendors.anthropic.reasoning.ema).toBe(0.8);
    expect(after.vendors.anthropic.reasoning.n).toBe(1);
  });

  it("updates the EMA toward the new reward (default alpha=0.2)", () => {
    const before: ConsensusPerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { anthropic: { reasoning: { ema: 0.5, n: 5, lastUpdate: "x" } } },
    };
    const after = consensusModelPerformanceEngine.recordOutcome(before, "anthropic", "reasoning", 1.0);
    expect(after.vendors.anthropic.reasoning.ema).toBeCloseTo(0.6, 6);
    expect(after.vendors.anthropic.reasoning.n).toBe(6);
  });

  it("clamps a reward outside [0,1]", () => {
    const before: ConsensusPerformanceState = { schemaVersion: "1.0.0", vendors: {} };
    const overflow = consensusModelPerformanceEngine.recordOutcome(before, "v", "t", 5);
    const underflow = consensusModelPerformanceEngine.recordOutcome(before, "v", "t", -3);
    expect(overflow.vendors.v.t.ema).toBe(1);
    expect(underflow.vendors.v.t.ema).toBe(0);
  });

  it("rejects bad inputs without throwing (semantic immutability)", () => {
    const before: ConsensusPerformanceState = { schemaVersion: "1.0.0", vendors: {} };
    const emptyVendor = consensusModelPerformanceEngine.recordOutcome(before, "", "t", 0.5);
    expect("" in emptyVendor.vendors).toBe(false);
    const emptyTask = consensusModelPerformanceEngine.recordOutcome(before, "v", "", 0.5);
    expect("v" in emptyTask.vendors).toBe(false);
    const nanReward = consensusModelPerformanceEngine.recordOutcome(before, "v", "t", Number.NaN);
    expect("v" in nanReward.vendors).toBe(false);
    const infReward = consensusModelPerformanceEngine.recordOutcome(before, "v", "t", Number.POSITIVE_INFINITY);
    expect("v" in infReward.vendors).toBe(false);
  });

  it("normalizes a degenerate alpha to the safe default", () => {
    const before: ConsensusPerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { v: { t: { ema: 0.5, n: 1, lastUpdate: "x" } } },
    };
    const r = consensusModelPerformanceEngine.recordOutcome(before, "v", "t", 1.0, -0.5 as unknown as number);
    expect(r.vendors.v.t.ema).toBeCloseTo(0.6, 6);
  });
});

describe("ConsensusModelPerformanceEngine — class export", () => {
  it("exposes the class constructor for downstream wiring", () => {
    expect(typeof ConsensusModelPerformanceEngine).toBe("function");
    const fresh = new ConsensusModelPerformanceEngine();
    expect(typeof fresh.loadState).toBe("function");
    expect(typeof fresh.recommendVendors).toBe("function");
    expect(typeof fresh.recordOutcome).toBe("function");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// saveState + recordOutcomeAndPersist — the WRITE side that closes the
// vendor-performance loop (U-CONSENSUS-PERF-PERSIST). Without persistence,
// recordOutcome's result was never durable so recommendVendors read a frozen
// file forever.
// ───────────────────────────────────────────────────────────────────────────

describe("ConsensusModelPerformanceEngine.saveState — durable round-trip", () => {
  it("persists a state that loadState reads back identically", () => {
    const p = mkTmpStatePath("rt.json");
    const built = consensusModelPerformanceEngine.recordOutcome(
      { schemaVersion: CONSENSUS_MODEL_PERFORMANCE_SCHEMA_VERSION, vendors: {} } as ConsensusPerformanceState,
      "xai", "code", 0.8,
    );
    const saved = consensusModelPerformanceEngine.saveState(built, p);
    expect(saved.ok).toBe(true);
    expect(saved.path).toBe(p);
    const reloaded = consensusModelPerformanceEngine.loadState(p);
    expect(reloaded.vendors.xai.code.ema).toBeCloseTo(0.8, 10);
    expect(reloaded.vendors.xai.code.n).toBe(1);
  });

  it("is fail-soft (ok:false, no throw) when the path cannot be written", () => {
    // Parent is a FILE, not a dir -> ENOTDIR on write. Must NOT throw.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-consensus-perf-"));
    const fileAsParent = path.join(dir, "notadir");
    fs.writeFileSync(fileAsParent, "x");
    const res = consensusModelPerformanceEngine.saveState(
      { schemaVersion: CONSENSUS_MODEL_PERFORMANCE_SCHEMA_VERSION, vendors: {} } as ConsensusPerformanceState,
      path.join(fileAsParent, "state.json"),
    );
    expect(res.ok).toBe(false);
    expect(typeof res.error).toBe("string");
  });
});

describe("ConsensusModelPerformanceEngine.recordOutcomeAndPersist — closure", () => {
  it("records, persists, and a fresh loadState reflects the fed reward", () => {
    const p = mkTmpStatePath("closure.json");
    const r = consensusModelPerformanceEngine.recordOutcomeAndPersist("xai", "code", 0.9, { filePath: p });
    expect(r.ok).toBe(true);
    expect(r.performance?.ema).toBeCloseTo(0.9, 10);
    // Durable: a brand-new load sees it (the loop is no longer frozen).
    const reloaded = consensusModelPerformanceEngine.loadState(p);
    expect(reloaded.vendors.xai.code.ema).toBeCloseTo(0.9, 10);
  });

  it("CLOSES THE LOOP: recommendVendors ranks by the persisted feedback", () => {
    const p = mkTmpStatePath("rank.json");
    consensusModelPerformanceEngine.recordOutcomeAndPersist("xai", "code", 0.9, { filePath: p });
    consensusModelPerformanceEngine.recordOutcomeAndPersist("google", "code", 0.1, { filePath: p });
    const state = consensusModelPerformanceEngine.loadState(p);
    const rec = consensusModelPerformanceEngine.recommendVendors(state, "code", ["xai", "google"], { floor: 1 });
    // The high-reward vendor outranks the low-reward one -- the feedback the
    // octopus would have discarded now drives selection.
    expect(rec.ranked[0].vendor).toBe("xai");
    expect(rec.ranked[0].score).toBeGreaterThan(rec.ranked[rec.ranked.length - 1].score);
  });

  it("EMA accumulates across rounds (n increments, ema moves toward the new reward)", () => {
    const p = mkTmpStatePath("accum.json");
    const a = consensusModelPerformanceEngine.recordOutcomeAndPersist("xai", "code", 0.2, { filePath: p }); // cold -> ema=0.2
    const b = consensusModelPerformanceEngine.recordOutcomeAndPersist("xai", "code", 1.0, { filePath: p }); // 0.2+0.2*(1-0.2)=0.36
    expect(a.performance?.n).toBe(1);
    expect(b.performance?.n).toBe(2);
    expect(a.performance?.ema).toBeCloseTo(0.2, 10);
    expect(b.performance!.ema).toBeGreaterThan(a.performance!.ema); // climbs toward the new 1.0 reward
    expect(b.performance!.ema).toBeLessThan(1.0); // but it's an EMA, not a jump to the latest value
  });

  it("bad input (empty vendor) is a no-op outcome but still persists fail-soft", () => {
    const p = mkTmpStatePath("badin.json");
    const r = consensusModelPerformanceEngine.recordOutcomeAndPersist("", "code", 0.5, { filePath: p });
    expect(r.ok).toBe(true); // empty state still saved
    expect(r.performance).toBeNull(); // recordOutcome rejected the empty vendor
    expect(consensusModelPerformanceEngine.loadState(p).vendors).toEqual({});
  });
});

// ───────────────────────────────────────────────────────────────────────────
// recordOutcomesAndPersist — batch load-once/fold/save-once (U-CONSENSUS-PERF-BATCH)
// ───────────────────────────────────────────────────────────────────────────

describe("ConsensusModelPerformanceEngine.recordOutcomesAndPersist — batch", () => {
  it("persists every observation in a single save (count === N, all vendors present)", () => {
    const p = mkTmpStatePath("batch.json");
    const r = consensusModelPerformanceEngine.recordOutcomesAndPersist(
      [
        { vendor: "anthropic", taskType: "build", reward: 1 },
        { vendor: "xai", taskType: "build", reward: 0 },
        { vendor: "ollama", taskType: "build", reward: 1 },
      ],
      { filePath: p },
    );
    expect(r.ok).toBe(true);
    expect(r.count).toBe(3);
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.vendors.anthropic.build.ema).toBe(1); // cold-start seeds ema = reward
    expect(s.vendors.xai.build.ema).toBe(0);
    expect(s.vendors.ollama.build.ema).toBe(1);
    expect(s.vendors.anthropic.build.n).toBe(1);
  });

  it("yields the IDENTICAL final EMA as N sequential recordOutcomeAndPersist calls", () => {
    // THE invariant that justifies the optimization: folding recordOutcome through
    // one load/save must equal N load-sees-prior-write singles (same EMA + n).
    const obs = [
      { vendor: "anthropic", taskType: "review", reward: 0.2 },
      { vendor: "anthropic", taskType: "review", reward: 1.0 }, // same vendor twice -> EMA folds
      { vendor: "xai", taskType: "review", reward: 0.5 },
    ];
    const pBatch = mkTmpStatePath("batchcmp.json");
    consensusModelPerformanceEngine.recordOutcomesAndPersist(obs, { filePath: pBatch });
    const pSeq = mkTmpStatePath("seqcmp.json");
    for (const o of obs) {
      consensusModelPerformanceEngine.recordOutcomeAndPersist(o.vendor, o.taskType, o.reward, { filePath: pSeq });
    }
    const sBatch = consensusModelPerformanceEngine.loadState(pBatch);
    const sSeq = consensusModelPerformanceEngine.loadState(pSeq);
    expect(sBatch.vendors.anthropic.review.ema).toBeCloseTo(sSeq.vendors.anthropic.review.ema, 12);
    expect(sBatch.vendors.anthropic.review.n).toBe(sSeq.vendors.anthropic.review.n);
    expect(sBatch.vendors.anthropic.review.n).toBe(2);
    expect(sBatch.vendors.xai.review.ema).toBeCloseTo(sSeq.vendors.xai.review.ema, 12);
  });

  it("accumulates repeated same-vendor observations within the single fold", () => {
    const p = mkTmpStatePath("accum.json");
    const r = consensusModelPerformanceEngine.recordOutcomesAndPersist(
      [
        { vendor: "ollama", taskType: "plan", reward: 0.0 },
        { vendor: "ollama", taskType: "plan", reward: 1.0 },
      ],
      { filePath: p },
    );
    expect(r.count).toBe(2);
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.vendors.ollama.plan.n).toBe(2);
    expect(s.vendors.ollama.plan.ema).toBeGreaterThan(0); // moved off the 0.0 seed toward 1.0
    expect(s.vendors.ollama.plan.ema).toBeLessThan(1.0);
  });

  it("empty array is a no-op (ok:true, count:0)", () => {
    const p = mkTmpStatePath("empty.json");
    const r = consensusModelPerformanceEngine.recordOutcomesAndPersist([], { filePath: p });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
  });

  it("non-array input is a no-op (ok:true, count:0) -- never throws", () => {
    const p = mkTmpStatePath("nonarr.json");
    const r = consensusModelPerformanceEngine.recordOutcomesAndPersist(null as unknown as [], { filePath: p });
    expect(r.ok).toBe(true);
    expect(r.count).toBe(0);
  });

  it("skips invalid rows (blank vendor / non-finite reward) but persists the valid ones", () => {
    const p = mkTmpStatePath("mixed.json");
    const r = consensusModelPerformanceEngine.recordOutcomesAndPersist(
      [
        { vendor: "", taskType: "build", reward: 1 }, // blank vendor -> skipped
        { vendor: "anthropic", taskType: "build", reward: Number.NaN }, // non-finite -> skipped
        { vendor: "xai", taskType: "build", reward: 1 }, // valid
      ],
      { filePath: p },
    );
    expect(r.count).toBe(1); // only the xai row mutated state
    const s = consensusModelPerformanceEngine.loadState(p);
    expect(s.vendors.xai.build.ema).toBe(1);
    expect(s.vendors.anthropic).toBeUndefined(); // NaN reward never recorded
    expect(s.vendors[""]).toBeUndefined();
  });
});
