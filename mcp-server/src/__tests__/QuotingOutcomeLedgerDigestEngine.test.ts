/**
 * QuotingOutcomeLedgerDigestEngine.test.ts --
 * QUOTING-SYNERGY-MS0/U-QP-OUTCOME-LEDGER-DIGEST (slot:charlie 2026-06-11).
 *
 * The read-side digest of the closed-loop outcome ledger. Covers:
 *   - pure summarizeOutcomeLedger: per-verdict counts/rates, applied/withhold/
 *     rollback rates, mean_applied_mape_delta (PROMOTED-only, non-null), the
 *     health verdict (insufficient / provenance_problem / drift_uncorrectable /
 *     healthy), and the fed_at window.
 *   - tolerant readOutcomeLedger: valid JSONL, blank+malformed skip, missing-
 *     verdict skip, ENOENT -> [], non-ENOENT throws.
 *   - the class round-trip via an injected reader.
 *
 * Every assertion is a concrete equality/number check (no toBeDefined stubs).
 */

import { describe, it, expect } from "vitest";

import {
  summarizeOutcomeLedger,
  readOutcomeLedger,
  QuotingOutcomeLedgerDigestEngine,
  ALL_CYCLE_VERDICTS,
  WITHHOLD_PROBLEM_THRESHOLD,
  ROLLBACK_PROBLEM_THRESHOLD,
  MIN_CYCLES_FOR_HEALTH,
  type OutcomeLedgerRecord,
} from "../engines/QuotingOutcomeLedgerDigestEngine.js";

// ─── Named constants ────────────────────────────────────────────────────────
const FED_AT_EARLY = "2026-06-11T10:00:00.000Z";
const FED_AT_MID = "2026-06-11T11:00:00.000Z";
const FED_AT_LATE = "2026-06-11T12:00:00.000Z";

const PROMOTED_DELTA_A = 8; // before-after improvement on a PROMOTED cycle
const PROMOTED_DELTA_B = 4;
const EXPECTED_MEAN_DELTA = (PROMOTED_DELTA_A + PROMOTED_DELTA_B) / 2; // 6

// ─── Fixtures ───────────────────────────────────────────────────────────────
function rec(overrides: Partial<OutcomeLedgerRecord> = {}): OutcomeLedgerRecord {
  return {
    cycle_id: "c-1",
    verdict: "PROMOTED",
    drift_detected: true,
    mape_delta: PROMOTED_DELTA_A,
    applied: true,
    provenance: "real",
    ...overrides,
  };
}

// ─── summarizeOutcomeLedger ─────────────────────────────────────────────────
describe("summarizeOutcomeLedger", () => {
  it("empty ledger -> total 0, all verdict counts 0, insufficient health, null window", () => {
    const d = summarizeOutcomeLedger([]);
    expect(d.total_cycles).toBe(0);
    for (const v of ALL_CYCLE_VERDICTS) {
      expect(d.by_verdict[v].count).toBe(0);
      expect(d.by_verdict[v].rate).toBe(0);
    }
    expect(d.applied_rate).toBe(0);
    expect(d.mean_applied_mape_delta).toBeNull();
    expect(d.drift_detected_count).toBe(0);
    expect(d.health.insufficient_cycles).toBe(true);
    expect(d.health.healthy).toBe(false);
    expect(d.health.provenance_problem).toBe(false);
    expect(d.health.drift_uncorrectable).toBe(false);
    expect(d.window.first_iso).toBeNull();
    expect(d.window.last_iso).toBeNull();
  });

  it("zero-fills every verdict even when only some appear", () => {
    const d = summarizeOutcomeLedger([rec({ verdict: "PROMOTED" })]);
    // STAGE_FAILED / INSUFFICIENT_DATA etc. absent from input but present at count 0
    expect(d.by_verdict.STAGE_FAILED.count).toBe(0);
    expect(d.by_verdict.INSUFFICIENT_DATA.count).toBe(0);
    expect(d.by_verdict.PROMOTED.count).toBe(1);
    expect(Object.keys(d.by_verdict).sort()).toEqual([...ALL_CYCLE_VERDICTS].sort());
  });

  it("counts + rates are exact across a known 10-cycle mix", () => {
    // 4 PROMOTED, 2 NO_DRIFT_NO_OP, 2 ROLLED_BACK, 1 WITHHELD_SYNTHETIC, 1 INSUFFICIENT_DATA
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "PROMOTED", mape_delta: PROMOTED_DELTA_A }),
      rec({ verdict: "PROMOTED", mape_delta: PROMOTED_DELTA_B }),
      rec({ verdict: "PROMOTED", mape_delta: null, applied: true }),
      rec({ verdict: "PROMOTED", mape_delta: null, applied: true }),
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "ROLLED_BACK", mape_delta: -6, applied: false }),
      rec({ verdict: "ROLLED_BACK", mape_delta: -3, applied: false }),
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", mape_delta: null, applied: false }),
      rec({ verdict: "INSUFFICIENT_DATA", drift_detected: false, mape_delta: null, applied: false }),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.total_cycles).toBe(10);
    expect(d.by_verdict.PROMOTED.count).toBe(4);
    expect(d.by_verdict.PROMOTED.rate).toBeCloseTo(0.4, 10);
    expect(d.by_verdict.NO_DRIFT_NO_OP.count).toBe(2);
    expect(d.by_verdict.ROLLED_BACK.count).toBe(2);
    expect(d.by_verdict.WITHHELD_SYNTHETIC.count).toBe(1);
    expect(d.applied_rate).toBeCloseTo(0.4, 10);
    expect(d.withhold_rate).toBeCloseTo(0.1, 10);
    expect(d.rollback_rate).toBeCloseTo(0.2, 10);
    expect(d.no_drift_rate).toBeCloseTo(0.2, 10);
    expect(d.insufficient_rate).toBeCloseTo(0.1, 10);
    // mean over the 2 PROMOTED cycles with a non-null delta only (8,4 -> 6); the
    // 2 null-delta PROMOTED cycles are excluded.
    expect(d.mean_applied_mape_delta).toBe(EXPECTED_MEAN_DELTA);
  });

  it("mean_applied_mape_delta excludes non-PROMOTED deltas + null deltas", () => {
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "PROMOTED", mape_delta: 10 }),
      rec({ verdict: "ROLLED_BACK", mape_delta: -6, applied: false }), // not PROMOTED -> excluded
      rec({ verdict: "PROMOTED", mape_delta: null, applied: true }), // null -> excluded
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.mean_applied_mape_delta).toBe(10); // only the single 10
  });

  it("mean_applied_mape_delta is null when no PROMOTED cycle has a numeric delta", () => {
    const d = summarizeOutcomeLedger([
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", mape_delta: null, applied: false }),
    ]);
    expect(d.mean_applied_mape_delta).toBeNull();
  });

  it("HEALTH: >= threshold withheld-synthetic over >=5 cycles -> provenance_problem, not healthy", () => {
    // 5 cycles, 3 withheld (0.6 >= 0.5)
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", drift_detected: true, mape_delta: null, applied: false }),
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", drift_detected: true, mape_delta: null, applied: false }),
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", drift_detected: true, mape_delta: null, applied: false }),
      rec({ verdict: "PROMOTED", mape_delta: 5 }),
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.withhold_rate).toBeGreaterThanOrEqual(WITHHOLD_PROBLEM_THRESHOLD);
    expect(d.health.provenance_problem).toBe(true);
    expect(d.health.healthy).toBe(false);
    expect(d.health.insufficient_cycles).toBe(false);
    expect(d.health.reasons.some((r) => r.includes("provenance problem"))).toBe(true);
  });

  it("HEALTH: rollback fraction uses the DRIFT-DETECTED denominator, not total (R9 denominator pin)", () => {
    // 10 cycles: only 4 drift-detected, of which 3 rolled back. The other 6 are
    // non-drift NO_DRIFT_NO_OP. rollback-among-drift = 3/4 = 0.75 >= 0.5 -> fires.
    // A bug using `total` as the denominator would compute 3/10 = 0.30 < 0.5 and
    // NOT fire -- so this fixture (drift_detected_count < total) DISTINGUISHES the
    // two denominators (the all-drift fixture could not).
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "ROLLED_BACK", drift_detected: true, mape_delta: -2, applied: false }),
      rec({ verdict: "ROLLED_BACK", drift_detected: true, mape_delta: -2, applied: false }),
      rec({ verdict: "ROLLED_BACK", drift_detected: true, mape_delta: -2, applied: false }),
      rec({ verdict: "PROMOTED", drift_detected: true, mape_delta: 5 }),
      ...Array.from({ length: 6 }, () =>
        rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      ),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.total_cycles).toBe(10);
    expect(d.drift_detected_count).toBe(4);
    expect(d.rollback_rate).toBeCloseTo(0.3, 10); // 3/10 of TOTAL -- below threshold
    expect(d.health.drift_uncorrectable).toBe(true); // 3/4 of DRIFT >= 0.5 -- fires
    expect(d.health.healthy).toBe(false);
    expect(d.health.reasons.some((r) => r.includes("drift uncorrectable"))).toBe(true);
  });

  it("counts STAGE_FAILED with a non-zero count (every verdict accumulates, not just zero-fill)", () => {
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "STAGE_FAILED", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "STAGE_FAILED", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "PROMOTED", mape_delta: 5 }),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.by_verdict.STAGE_FAILED.count).toBe(2);
    expect(d.by_verdict.STAGE_FAILED.rate).toBeCloseTo(2 / 3, 10);
    expect(d.by_verdict.PROMOTED.count).toBe(1);
  });

  it("HEALTH: drift_uncorrectable stays false when NO cycle detected drift (no divide-by-zero)", () => {
    // 5 rolled-back cycles but none drift_detected -> rollbackFracOfDrift = 0
    const records: OutcomeLedgerRecord[] = Array.from({ length: 5 }, () =>
      rec({ verdict: "ROLLED_BACK", drift_detected: false, mape_delta: -2, applied: false }),
    );
    const d = summarizeOutcomeLedger(records);
    expect(d.drift_detected_count).toBe(0);
    expect(d.health.drift_uncorrectable).toBe(false);
  });

  it("HEALTH: a clean mostly-promoted batch of >=5 cycles is healthy", () => {
    const records: OutcomeLedgerRecord[] = [
      rec({ verdict: "PROMOTED", mape_delta: 5 }),
      rec({ verdict: "PROMOTED", mape_delta: 4 }),
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "NO_DRIFT_NO_OP", drift_detected: false, mape_delta: null, applied: false }),
      rec({ verdict: "ROLLED_BACK", drift_detected: true, mape_delta: -1, applied: false }),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.health.healthy).toBe(true);
    expect(d.health.provenance_problem).toBe(false);
    expect(d.health.drift_uncorrectable).toBe(false);
    expect(d.health.reasons.some((r) => r.startsWith("healthy"))).toBe(true);
  });

  it("HEALTH: below MIN_CYCLES_FOR_HEALTH is insufficient regardless of mix", () => {
    const records: OutcomeLedgerRecord[] = Array.from({ length: MIN_CYCLES_FOR_HEALTH - 1 }, () =>
      rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", mape_delta: null, applied: false }),
    );
    const d = summarizeOutcomeLedger(records);
    expect(d.total_cycles).toBe(MIN_CYCLES_FOR_HEALTH - 1);
    expect(d.health.insufficient_cycles).toBe(true);
    expect(d.health.provenance_problem).toBe(false); // not concluded
    expect(d.health.healthy).toBe(false);
  });

  it("window first/last derive from the min/max fed_at (order-independent)", () => {
    const records: OutcomeLedgerRecord[] = [
      rec({ fed_at: FED_AT_MID }),
      rec({ fed_at: FED_AT_LATE }),
      rec({ fed_at: FED_AT_EARLY }),
    ];
    const d = summarizeOutcomeLedger(records);
    expect(d.window.first_iso).toBe(FED_AT_EARLY);
    expect(d.window.last_iso).toBe(FED_AT_LATE);
  });

  it("window stays null when no record carries a parseable fed_at", () => {
    const d = summarizeOutcomeLedger([
      rec({ fed_at: undefined }),
      rec({ fed_at: "not-a-date" }),
    ]);
    expect(d.window.first_iso).toBeNull();
    expect(d.window.last_iso).toBeNull();
  });
});

// ─── readOutcomeLedger (tolerant JSONL) ─────────────────────────────────────
describe("readOutcomeLedger", () => {
  it("parses valid JSONL lines into records", async () => {
    const text =
      JSON.stringify(rec({ cycle_id: "a", verdict: "PROMOTED" })) + "\n" +
      JSON.stringify(rec({ cycle_id: "b", verdict: "ROLLED_BACK", applied: false })) + "\n";
    const recs = await readOutcomeLedger("/virtual.jsonl", async () => text);
    expect(recs).toHaveLength(2);
    expect(recs[0].cycle_id).toBe("a");
    expect(recs[1].verdict).toBe("ROLLED_BACK");
  });

  it("skips blank lines and malformed JSON lines", async () => {
    const text =
      JSON.stringify(rec({ cycle_id: "ok" })) + "\n" +
      "\n" +
      "   \n" +
      "{not valid json" + "\n" +
      JSON.stringify(rec({ cycle_id: "ok2" })) + "\n";
    const recs = await readOutcomeLedger("/virtual.jsonl", async () => text);
    expect(recs.map((r) => r.cycle_id)).toEqual(["ok", "ok2"]);
  });

  it("skips well-formed JSON lines that lack a string verdict", async () => {
    const text =
      JSON.stringify({ cycle_id: "no-verdict", foo: 1 }) + "\n" +
      JSON.stringify({ cycle_id: "num-verdict", verdict: 42 }) + "\n" +
      JSON.stringify(rec({ cycle_id: "good" })) + "\n";
    const recs = await readOutcomeLedger("/virtual.jsonl", async () => text);
    expect(recs.map((r) => r.cycle_id)).toEqual(["good"]);
  });

  it("missing file (ENOENT) -> empty array, not an error (0 cycles is valid)", async () => {
    const enoent = Object.assign(new Error("nope"), { code: "ENOENT" });
    const recs = await readOutcomeLedger("/missing.jsonl", async () => {
      throw enoent;
    });
    expect(recs).toEqual([]);
  });

  it("a non-ENOENT read error PROPAGATES (surfaced, not swallowed)", async () => {
    const eacces = Object.assign(new Error("denied"), { code: "EACCES" });
    await expect(
      readOutcomeLedger("/locked.jsonl", async () => {
        throw eacces;
      }),
    ).rejects.toThrow(/denied/);
  });
});

// ─── class round-trip ───────────────────────────────────────────────────────
describe("QuotingOutcomeLedgerDigestEngine.digest", () => {
  it("reads via injected readImpl and returns the summarized digest", async () => {
    const engine = new QuotingOutcomeLedgerDigestEngine();
    const text =
      JSON.stringify(rec({ verdict: "PROMOTED", mape_delta: 8 })) + "\n" +
      JSON.stringify(rec({ verdict: "PROMOTED", mape_delta: 4 })) + "\n" +
      JSON.stringify(rec({ verdict: "WITHHELD_SYNTHETIC", provenance: "synthetic", mape_delta: null, applied: false })) + "\n";
    const d = await engine.digest({ ledgerPath: "/virtual.jsonl", readImpl: async () => text });
    expect(d.total_cycles).toBe(3);
    expect(d.by_verdict.PROMOTED.count).toBe(2);
    expect(d.mean_applied_mape_delta).toBe(6);
    expect(d.withhold_rate).toBeCloseTo(1 / 3, 10);
  });

  it("missing ledger -> a zero digest (insufficient health), never throws", async () => {
    const engine = new QuotingOutcomeLedgerDigestEngine();
    const enoent = Object.assign(new Error("nope"), { code: "ENOENT" });
    const d = await engine.digest({
      ledgerPath: "/missing.jsonl",
      readImpl: async () => {
        throw enoent;
      },
    });
    expect(d.total_cycles).toBe(0);
    expect(d.health.insufficient_cycles).toBe(true);
  });
});
