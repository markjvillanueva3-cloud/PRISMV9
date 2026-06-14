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
