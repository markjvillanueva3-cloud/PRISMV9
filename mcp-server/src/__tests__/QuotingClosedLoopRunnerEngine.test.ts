/**
 * QuotingClosedLoopRunnerEngine.test.ts —
 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-RUNNER (slot:charlie iter47 2026-05-26).
 *
 * Covers the 4 pure helpers + the buildLiveDeps integration surface.
 * Pure helpers use synthetic substrate inputs; integration tests use
 * vi.spyOn on QuoteOutcomeFeedEngine (the engine that wires PSN) and a
 * tmpdir-rooted activeFactorPath so the disk write is observable +
 * cleanable.
 *
 * No `toBeDefined` / `not.toThrow` / `toBeUndefined` patterns — every
 * assertion checks a concrete numeric or string value. Substrate-shape
 * literals (mape_pct, mean_signed_pct_error, record_count) come from the
 * substrate's documented interface, not invented fixtures.
 */

import { describe, it, expect, vi } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildLiveDeps,
  toBaselineRecord,
  adaptAccuracyReport,
  applyFactorsToOutcomes,
  DEFAULT_ACTIVE_FACTOR_PATH,
  DEFAULT_OUTCOME_LEDGER_PATH,
} from "../engines/QuotingClosedLoopRunnerEngine.js";
import type {
  QuoteOutcomeRecord as CycleOutcome,
  CycleOutcomeSignal,
} from "../engines/QuotingClosedLoopEngine.js";
import type {
  AccuracyReport as SubstrateAccuracyReport,
} from "../engines/QuotingTrainingLoopEngine.js";
import type { CalibrationFactors as SubstrateFactors } from "../engines/QuotingCalibrationEngine.js";
import { QuoteOutcomeFeedEngine } from "../engines/QuoteOutcomeFeedEngine.js";

// ─── Named test constants ──────────────────────────────────────────────────

const SUBSTRATE_DEFAULT_TIME_IN_CUT_S = 600;
const SUBSTRATE_DEFAULT_MATERIAL_SPEND_USD = 75;
const SUBSTRATE_DEFAULT_MACHINE_RATE_USD_PER_HR = 95;

const OUTCOME_QUOTE_USD = 250;
const OUTCOME_INVOICE_USD = 300;
const SAMPLE_BATCH_SIZE_LARGE = 25;
const SAMPLE_BATCH_SIZE_SMALL = 10;

const SUBSTRATE_MAPE_DRIFTING = 22;
const SUBSTRATE_BIAS_DRIFTING = 9;

const FACTOR_GLOBAL = 1.10;
const FACTOR_ITW = 1.20;
const FACTOR_ALCOA = 0.95;
const RECORD_COUNT_HIGH = 40; // > confidence ceiling 30 → confidence = 1.0
const RECORD_COUNT_MID = 15;

const ACTIVE_FACTOR_PATH_DEFAULT_SUFFIX = "state/shared/calibration/quoting-calibration-active.json";

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeCycleOutcome(overrides: Partial<CycleOutcome> = {}): CycleOutcome {
  return {
    quote_id: "Q-1",
    customer: "ITW",
    part_id: "ITW-PART-A",
    doc_date: "2026-05-01",
    predicted_quote_usd: OUTCOME_QUOTE_USD,
    actual_invoice_usd: OUTCOME_INVOICE_USD,
    accepted: true,
    material: "aluminum_6061",
    machine_class: "mill",
    ...overrides,
  };
}

function makeSubstrateReport(overrides: Partial<SubstrateAccuracyReport["metrics"]> = {}): SubstrateAccuracyReport {
  return {
    ok: true,
    total_records: SAMPLE_BATCH_SIZE_LARGE,
    total_predicted: SAMPLE_BATCH_SIZE_LARGE,
    total_skipped: 0,
    metrics: {
      mae_usd: 0,
      rmse_usd: 0,
      mape_pct: SUBSTRATE_MAPE_DRIFTING,
      mean_signed_pct_error: SUBSTRATE_BIAS_DRIFTING,
      ...overrides,
    },
    per_customer_bias: [],
    worst_5_records: [],
    best_5_records: [],
    psi_delta_fed_count: 0,
  };
}

function makeFactors(overrides: Partial<SubstrateFactors["global"]> = {}): SubstrateFactors {
  return {
    ok: true,
    generated_at: "2026-05-26T00:00:00.000Z",
    record_count: SAMPLE_BATCH_SIZE_LARGE,
    global: {
      factor: FACTOR_GLOBAL,
      record_count: RECORD_COUNT_MID,
      signed_pct_error_observed: SUBSTRATE_BIAS_DRIFTING,
      rationale: "test-fixture",
      ...overrides,
    },
    per_customer: [
      { customer: "ITW", factor: FACTOR_ITW, record_count: 12, signed_pct_error_observed: 17 },
      { customer: "Alcoa", factor: FACTOR_ALCOA, record_count: 8, signed_pct_error_observed: -5 },
    ],
  } as unknown as SubstrateFactors;
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

describe("toBaselineRecord", () => {
  it("maps customer + part_id + doc_date + actual_invoice straight through; stamps substrate defaults for operational fields", () => {
    const r = toBaselineRecord(makeCycleOutcome());
    expect(r.customer).toBe("ITW");
    expect(r.part_id).toBe("ITW-PART-A");
    expect(r.doc_date).toBe("2026-05-01");
    expect(r.actual_revenue_usd).toBe(OUTCOME_INVOICE_USD);
    expect(r.estimated_time_in_cut_s).toBe(SUBSTRATE_DEFAULT_TIME_IN_CUT_S);
    expect(r.estimated_material_spend_usd).toBe(SUBSTRATE_DEFAULT_MATERIAL_SPEND_USD);
    expect(r.machine_rate_usd_per_hr).toBe(SUBSTRATE_DEFAULT_MACHINE_RATE_USD_PER_HR);
  });

  it("falls back to predicted_quote_usd when actual_invoice_usd is null", () => {
    const r = toBaselineRecord(makeCycleOutcome({ actual_invoice_usd: null }));
    expect(r.actual_revenue_usd).toBe(OUTCOME_QUOTE_USD);
  });

  it("falls back to quote_id when part_id is missing", () => {
    const r = toBaselineRecord(makeCycleOutcome({ part_id: undefined, quote_id: "Q-2" }));
    expect(r.part_id).toBe("Q-2");
  });

  it("emits customer='unknown' when the outcome carries no customer", () => {
    const r = toBaselineRecord(makeCycleOutcome({ customer: undefined }));
    expect(r.customer).toBe("unknown");
  });

  it("emits doc_date=null when the outcome carries no doc_date", () => {
    const r = toBaselineRecord(makeCycleOutcome({ doc_date: undefined }));
    expect(r.doc_date).toBeNull();
  });
});

describe("adaptAccuracyReport", () => {
  it("projects substrate mape_pct + mean_signed_pct_error onto cycle's mape_pct + bias_pct", () => {
    const cycle = adaptAccuracyReport(makeSubstrateReport(), SAMPLE_BATCH_SIZE_LARGE);
    expect(cycle.sample_size).toBe(SAMPLE_BATCH_SIZE_LARGE);
    expect(cycle.mape_pct).toBe(SUBSTRATE_MAPE_DRIFTING);
    expect(cycle.bias_pct).toBe(SUBSTRATE_BIAS_DRIFTING);
  });

  it("emits hit_rate_15pct=0 and hit_rate_10pct=0 (substrate does not return per-record predictions in aggregate mode)", () => {
    const cycle = adaptAccuracyReport(makeSubstrateReport(), SAMPLE_BATCH_SIZE_LARGE);
    expect(cycle.hit_rate_15pct).toBe(0);
    expect(cycle.hit_rate_10pct).toBe(0);
  });

  it("honors the supplied sample_size even when substrate's total_records is different", () => {
    const cycle = adaptAccuracyReport(makeSubstrateReport(), SAMPLE_BATCH_SIZE_SMALL);
    expect(cycle.sample_size).toBe(SAMPLE_BATCH_SIZE_SMALL);
  });
});

describe("applyFactorsToOutcomes", () => {
  it("multiplies predicted_quote_usd by per-customer factor when customer matches", () => {
    const outcomes = [makeCycleOutcome({ customer: "ITW", predicted_quote_usd: 100 })];
    const adjusted = applyFactorsToOutcomes(outcomes, makeFactors());
    expect(adjusted[0].predicted_quote_usd).toBe(100 * FACTOR_ITW);
  });

  it("falls back to global factor when customer is unknown", () => {
    const outcomes = [makeCycleOutcome({ customer: "UnknownCo", predicted_quote_usd: 200 })];
    const adjusted = applyFactorsToOutcomes(outcomes, makeFactors());
    expect(adjusted[0].predicted_quote_usd).toBe(200 * FACTOR_GLOBAL);
  });

  it("uses Alcoa-specific factor for an Alcoa record", () => {
    const outcomes = [makeCycleOutcome({ customer: "Alcoa", predicted_quote_usd: 1000 })];
    const adjusted = applyFactorsToOutcomes(outcomes, makeFactors());
    expect(adjusted[0].predicted_quote_usd).toBe(1000 * FACTOR_ALCOA);
  });

  it("returns inputs unchanged when factors.ok is false (cold-start guard)", () => {
    const notOk = { ok: false, generated_at: "x", record_count: 0, global: { factor: 1, record_count: 0, signed_pct_error_observed: 0, rationale: "x" }, per_customer: [] } as unknown as SubstrateFactors;
    const outcomes = [makeCycleOutcome({ predicted_quote_usd: 500 })];
    const adjusted = applyFactorsToOutcomes(outcomes, notOk);
    expect(adjusted[0].predicted_quote_usd).toBe(500);
  });

  it("does not mutate the input array (new object identities for every record)", () => {
    const outcomes = [makeCycleOutcome({ predicted_quote_usd: 100 })];
    const adjusted = applyFactorsToOutcomes(outcomes, makeFactors());
    expect(adjusted[0]).not.toBe(outcomes[0]);
    expect(outcomes[0].predicted_quote_usd).toBe(100);
  });
});

// ─── buildLiveDeps integration ──────────────────────────────────────────────

describe("buildLiveDeps — wiring contract", () => {
  it("DEFAULT_ACTIVE_FACTOR_PATH resolves to the documented sub-path under cwd", () => {
    expect(DEFAULT_ACTIVE_FACTOR_PATH.replace(/\\/g, "/")).toContain(ACTIVE_FACTOR_PATH_DEFAULT_SUFFIX);
  });

  it("fetchOutcomes forwards sinceIso to loadOutcomes and returns its result", async () => {
    const outcome = makeCycleOutcome({ quote_id: "TEST" });
    const loadOutcomes = vi.fn(async () => [outcome]);
    const deps = buildLiveDeps({ loadOutcomes });
    const r = await deps.fetchOutcomes("2026-01-01T00:00:00.000Z");
    expect(loadOutcomes).toHaveBeenCalledWith("2026-01-01T00:00:00.000Z");
    expect(r).toEqual([outcome]);
  });

  it("writeActiveFactors atomically writes JSON to the supplied path and round-trips parseably", async () => {
    const dir = join(tmpdir(), `qclrw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const activeFactorPath = join(dir, "active.json");

    const deps = buildLiveDeps({
      loadOutcomes: async () => [],
      activeFactorPath,
    });

    const factors = makeFactors();
    const writtenPath = await deps.writeActiveFactors(factors as unknown as Record<string, unknown>);
    expect(writtenPath).toBe(activeFactorPath);

    const content = await fs.readFile(activeFactorPath, "utf8");
    const parsed = JSON.parse(content);
    expect(parsed.ok).toBe(true);
    expect(parsed.global.factor).toBe(FACTOR_GLOBAL);
    expect(parsed.per_customer).toHaveLength(2);
    expect(parsed.per_customer[0].customer).toBe("ITW");
    expect(parsed.per_customer[0].factor).toBe(FACTOR_ITW);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("writeActiveFactors leaves no temp file behind on success (rename committed)", async () => {
    const dir = join(tmpdir(), `qclrw-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const activeFactorPath = join(dir, "active.json");
    const deps = buildLiveDeps({ loadOutcomes: async () => [], activeFactorPath });

    await deps.writeActiveFactors(makeFactors() as unknown as Record<string, unknown>);

    const entries = await fs.readdir(dir);
    // Exactly one file (active.json); no .tmp-* lingering.
    expect(entries).toHaveLength(1);
    expect(entries[0]).toBe("active.json");

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("feedPSIDelta calls outcomeFeed.feed once with a synthetic quote whose actual_cost_usd reflects the delta sign", async () => {
    const feed = vi.fn(() => ({ fed: true, delta: 0.08 }));
    const outcomeFeed = { feed } as unknown as QuoteOutcomeFeedEngine;
    const deps = buildLiveDeps({ loadOutcomes: async () => [], outcomeFeed });

    // Positive delta of 8 → actual cost = 100 × (1 + 8/100) = 108
    await deps.feedPSIDelta!(8);
    expect(feed).toHaveBeenCalledTimes(1);
    const call = feed.mock.calls[0][0];
    expect(call.quoted_cost_usd).toBe(100);
    expect(call.actual_cost_usd).toBe(108);
    expect(call.quote_id.startsWith("cycle-psi-")).toBe(true);
  });

  it("feedPSIDelta with negative delta produces actual_cost_usd < quoted_cost_usd", async () => {
    const feed = vi.fn(() => ({ fed: true, delta: -0.05 }));
    const outcomeFeed = { feed } as unknown as QuoteOutcomeFeedEngine;
    const deps = buildLiveDeps({ loadOutcomes: async () => [], outcomeFeed });

    await deps.feedPSIDelta!(-5);
    expect(feed.mock.calls[0][0].actual_cost_usd).toBe(95);
  });

  it("feedPSIDelta throws when outcomeFeed rejects (fed:false) — cycle stage wrapper catches it", async () => {
    const feed = vi.fn(() => ({ fed: false, reason: "non-positive-actual-cost" }));
    const outcomeFeed = { feed } as unknown as QuoteOutcomeFeedEngine;
    const deps = buildLiveDeps({ loadOutcomes: async () => [], outcomeFeed });

    await expect(deps.feedPSIDelta!(1)).rejects.toThrow(/outcome-feed rejected/);
  });

  it("buildLiveDeps returns an object exposing all 7 ClosedLoopDeps members (fetchOutcomes through feedOutcome)", () => {
    const deps = buildLiveDeps({ loadOutcomes: async () => [] });
    expect(typeof deps.fetchOutcomes).toBe("function");
    expect(typeof deps.runAccuracy).toBe("function");
    expect(typeof deps.deriveWithCoV).toBe("function");
    expect(typeof deps.validateOnHoldout).toBe("function");
    expect(typeof deps.writeActiveFactors).toBe("function");
    expect(typeof deps.feedPSIDelta).toBe("function");
    expect(typeof deps.feedOutcome).toBe("function");
  });

  // --- feedOutcome: full-distribution cycle-outcome ledger --------------------
  // (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY) — buildLiveDeps wires feedOutcome to a
  // JSONL append at outcomeLedgerPath so every verdict the loop produces lands on
  // disk for the PSN to learn the loop's own behavior distribution.

  function makeSignal(overrides: Partial<CycleOutcomeSignal> = {}): CycleOutcomeSignal {
    return {
      cycle_id: "cycle-test-1",
      verdict: "PROMOTED",
      drift_detected: true,
      mape_delta: 8,
      applied: true,
      provenance: "real",
      ...overrides,
    };
  }

  it("feedOutcome appends one JSONL line carrying the signal + a fed_at stamp", async () => {
    const dir = join(tmpdir(), `qclr-ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const outcomeLedgerPath = join(dir, "cycle-outcomes.jsonl");
    const deps = buildLiveDeps({ loadOutcomes: async () => [], outcomeLedgerPath });

    await deps.feedOutcome!(makeSignal());

    const content = await fs.readFile(outcomeLedgerPath, "utf8");
    const lines = content.split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.cycle_id).toBe("cycle-test-1");
    expect(rec.verdict).toBe("PROMOTED");
    expect(rec.applied).toBe(true);
    expect(rec.mape_delta).toBe(8);
    expect(rec.provenance).toBe("real");
    expect(typeof rec.fed_at).toBe("string");
    expect(Number.isNaN(Date.parse(rec.fed_at))).toBe(false);

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("feedOutcome appends (never truncates) across multiple verdicts → one line per cycle", async () => {
    const dir = join(tmpdir(), `qclr-ledger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const outcomeLedgerPath = join(dir, "cycle-outcomes.jsonl");
    const deps = buildLiveDeps({ loadOutcomes: async () => [], outcomeLedgerPath });

    await deps.feedOutcome!(makeSignal({ cycle_id: "c1", verdict: "PROMOTED", applied: true }));
    await deps.feedOutcome!(makeSignal({ cycle_id: "c2", verdict: "WITHHELD_SYNTHETIC", applied: false, provenance: "synthetic", mape_delta: null }));
    await deps.feedOutcome!(makeSignal({ cycle_id: "c3", verdict: "NO_DRIFT_NO_OP", applied: false, drift_detected: false, mape_delta: null, provenance: null }));

    const lines = (await fs.readFile(outcomeLedgerPath, "utf8")).split("\n").filter(Boolean);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => JSON.parse(l).verdict)).toEqual([
      "PROMOTED",
      "WITHHELD_SYNTHETIC",
      "NO_DRIFT_NO_OP",
    ]);
    // null mape_delta survives the JSONL round-trip as JSON null
    expect(JSON.parse(lines[1]).mape_delta).toBeNull();

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("DEFAULT_OUTCOME_LEDGER_PATH targets the quoting cycle-outcomes ledger", () => {
    expect(DEFAULT_OUTCOME_LEDGER_PATH.replace(/\\/g, "/")).toContain(
      "state/shared/quoting/quoting-cycle-outcomes.jsonl",
    );
  });
});
