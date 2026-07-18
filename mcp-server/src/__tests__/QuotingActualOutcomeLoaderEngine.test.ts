/**
 * QuotingActualOutcomeLoaderEngine tests -- QUOTING-CLOSED-LOOP-MS0
 *
 * R9 principle: every test encodes WHY the behaviour matters.
 * Tests are round-tripped through the injectable ActualCostSource dep;
 * one assertion round-trips through the prism_quoting dispatcher path
 * via quotingActualOutcomeLoaderEngine.provenanceCheck() (the dispatcher
 * surface, wired case "closed_loop_provenance_check").
 *
 * Coverage:
 *  Happy path (1)         -- real rows -> QuoteOutcomeRecord[] + may_promote:true
 *  Failure modes (3)      -- empty source, zero-revenue-only, malformed row field
 *  Adversarial (2)        -- synthetic-labelled data still accepted as real if it has
 *                            real revenue, placeholder-marker in customer triggers synthetic
 *  Round-trip (1)         -- through provenanceCheck() (the prism_quoting action surface)
 */

import { describe, it, expect } from "vitest";
import {
  cycleOutcomesFromProfitability,
  QuotingActualOutcomeLoaderEngine,
  type ActualCostSource,
  type JobProfitability,
} from "../engines/QuotingActualOutcomeLoaderEngine.js";
import { classifyOutcomeProvenance } from "../engines/QuotingClosedLoopEngine.js";

// -- Test helpers -------------------------------------------------------------

function makeJob(overrides: Partial<JobProfitability> = {}): JobProfitability {
  return {
    job_id: "JOB-001",
    revenue: 1250.0,
    estimated_cost: 980.0,
    actual_cost: 1010.0,
    estimated_margin: 270.0,
    actual_margin: 240.0,
    estimated_margin_pct: 27.55,
    actual_margin_pct: 19.2,
    cost_variance: 30.0,
    variance_pct: 3.06,
    categories: [],
    status: "profitable",
    ...overrides,
  };
}

function makeSource(jobs: Array<{ job: JobProfitability; material?: string }>): ActualCostSource {
  const map = new Map(jobs.map(({ job, material }) => [job.job_id, { job, material }]));
  return {
    listJobIds: () => Array.from(map.keys()),
    profitability: (id: string) => {
      const entry = map.get(id);
      if (!entry) throw new Error(`unknown job: ${id}`);
      return entry.job;
    },
    materialType: (id: string) => map.get(id)?.material,
  };
}

// -- PURE PROJECTION TESTS ---------------------------------------------------

describe("cycleOutcomesFromProfitability", () => {
  it("maps a profitable job to a real QuoteOutcomeRecord with correct reference values", () => {
    const job = makeJob({ job_id: "JOB-100", revenue: 2500, estimated_cost: 1800, status: "profitable" });
    const records = cycleOutcomesFromProfitability([{ job, material: "aluminum_6061" }]);

    expect(records).toHaveLength(1);
    const r = records[0];
    // quote_id tracks the job
    expect(r.quote_id).toBe("JOB-100");
    // predicted_quote_usd = the pre-job estimate (what we charged vs what it cost)
    expect(r.predicted_quote_usd).toBe(1800);
    // actual_invoice_usd = realized revenue (the real billing signal)
    expect(r.actual_invoice_usd).toBe(2500);
    // profitable job -> accepted:true (model was in the money)
    expect(r.accepted).toBe(true);
    // material carried through
    expect(r.material).toBe("aluminum_6061");
    // observed_at is a valid ISO string
    expect(new Date(r.observed_at!).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it("maps a loss job to accepted:false (the model under-estimated cost)", () => {
    const job = makeJob({ job_id: "JOB-101", revenue: 900, estimated_cost: 1200, status: "loss" });
    const records = cycleOutcomesFromProfitability([{ job }]);

    expect(records[0].accepted).toBe(false);
    // Still a real outcome -- revenue was billed, loss or not
    expect(records[0].actual_invoice_usd).toBe(900);
  });

  it("maps a break-even job to accepted:true (at-cost is acceptable)", () => {
    const job = makeJob({ status: "break_even", revenue: 1000, estimated_cost: 1000 });
    const records = cycleOutcomesFromProfitability([{ job }]);
    expect(records[0].accepted).toBe(true);
  });

  it("sets actual_invoice_usd to null when revenue is zero (not yet billed)", () => {
    // Zero revenue = job tracked in estimates but no invoice issued yet.
    // These are NOT real actuals for promotion purposes.
    const job = makeJob({ revenue: 0, estimated_cost: 500, status: "profitable" });
    const records = cycleOutcomesFromProfitability([{ job }]);
    expect(records[0].actual_invoice_usd).toBeNull();
  });

  it("handles multiple rows with independent mapping (no cross-contamination)", () => {
    const rows = [
      { job: makeJob({ job_id: "A", revenue: 100, estimated_cost: 80, status: "profitable" as const }) },
      { job: makeJob({ job_id: "B", revenue: 200, estimated_cost: 250, status: "loss" as const }), material: "steel_a36" },
    ];
    const records = cycleOutcomesFromProfitability(rows);

    expect(records).toHaveLength(2);
    expect(records[0].quote_id).toBe("A");
    expect(records[0].accepted).toBe(true);
    expect(records[1].quote_id).toBe("B");
    expect(records[1].accepted).toBe(false);
    expect(records[1].material).toBe("steel_a36");
  });
});

// -- ENGINE FAILURE MODES ---------------------------------------------------

describe("QuotingActualOutcomeLoaderEngine -- failure modes", () => {
  it("FAIL-LOUD: throws when source has no jobs (empty estimates -- no real actuals)", async () => {
    const emptySource: ActualCostSource = {
      listJobIds: () => [],
      profitability: () => { throw new Error("unreachable"); },
    };
    const engine = new QuotingActualOutcomeLoaderEngine(emptySource);

    // This is the charlie soul refuse: we must throw, not silently return []
    await expect(engine.loadOutcomes()).rejects.toThrow(
      "FAIL-LOUD: no real actuals available",
    );
    await expect(engine.loadOutcomes()).rejects.toThrow(
      "ActualCostEngine has no tracked jobs",
    );
  });

  it("FAIL-LOUD: throws when all jobs have zero revenue (estimates-only, no billing)", async () => {
    // Jobs are tracked in estimates but no revenue was ever recorded.
    // These are indistinguishable from synthetic placeholders to the provenance gate.
    const source = makeSource([
      { job: makeJob({ job_id: "ZR-1", revenue: 0, status: "profitable" }) },
      { job: makeJob({ job_id: "ZR-2", revenue: 0, status: "break_even" }) },
    ]);
    const engine = new QuotingActualOutcomeLoaderEngine(source);

    await expect(engine.loadOutcomes()).rejects.toThrow(
      "FAIL-LOUD",
    );
    await expect(engine.loadOutcomes()).rejects.toThrow(
      "all actual_invoice_usd=null",
    );
  });

  it("handles a malformed row field (NaN revenue) -- maps to null invoice, not crash", () => {
    // NaN revenue: NaN > 0 is false -> maps to null invoice (no billing).
    // The pure projection must not crash on NaN; the fail-loud check then
    // blocks promotion (all null -> throws in loadOutcomes).
    const job = makeJob({ revenue: NaN, estimated_cost: 400 });
    const records = cycleOutcomesFromProfitability([{ job }]);
    expect(records[0].actual_invoice_usd).toBeNull();
  });
});

// -- ADVERSARIAL TESTS -------------------------------------------------------

describe("QuotingActualOutcomeLoaderEngine -- adversarial", () => {
  it("accepts synthetic-LOOKING data as real IF it carries genuine positive revenue", async () => {
    // A job might be named "synthetic-test-part" or have internal-fix in its id,
    // but if revenue is real and positive, classifyOutcomeProvenance checks the
    // QuoteOutcomeRecord content (quote_id, customer, etc.) not the job_id.
    // The PLACEHOLDER_MARKERS check is on the outcome fields, not job metadata.
    // As long as the fields themselves don't contain placeholder strings, it passes.
    const source = makeSource([
      {
        job: makeJob({ job_id: "SYNTH-NAMED-JOB-999", revenue: 750, estimated_cost: 600, status: "profitable" }),
        material: "stainless_304",
      },
    ]);
    const engine = new QuotingActualOutcomeLoaderEngine(source);
    const result = await engine.provenanceCheck();

    // Revenue is real -> provenance should be "real" -> may_promote:true
    expect(result.may_promote).toBe(true);
    expect(result.provenance.verdict).toBe("real");
    expect(result.outcome_count).toBe(1);
  });

  it("synthetic placeholder in quote_id field triggers synthetic verdict via classifyOutcomeProvenance", () => {
    // If a quote_id itself contains a PLACEHOLDER_MARKER string, the provenance
    // classifier will flag it as synthetic (classifyOutcomeProvenance, lines 296-303).
    // This guards against jobs that were hand-crafted from bootstrap seeds.
    // classifyOutcomeProvenance is imported at the top of this file (ESM -- no require).
    const syntheticOutcome = {
      quote_id: "manual-curation-bootstrap-001",
      predicted_quote_usd: 500,
      actual_invoice_usd: 600, // has revenue but...
    };

    const provenance = classifyOutcomeProvenance([syntheticOutcome as never]);
    // PLACEHOLDER_MARKERS match in quote_id -> verdict must be "synthetic"
    expect(provenance.verdict).toBe("synthetic");
    expect(provenance.mayPromote).toBe(false);
    // The signal must call out the placeholder
    expect(provenance.signals.some((s: string) => s.includes("placeholder") || s.includes("synthetic") || s.includes("bootstrap"))).toBe(true);
  });
});

// -- ROUND-TRIP VIA provenanceCheck() (the dispatcher surface) ---------------

describe("QuotingActualOutcomeLoaderEngine.provenanceCheck -- dispatcher surface round-trip", () => {
  it("returns may_promote:true + provenance.verdict:'real' for genuine revenue rows", async () => {
    const source = makeSource([
      { job: makeJob({ job_id: "RT-001", revenue: 3200, estimated_cost: 2400, status: "profitable" }), material: "aluminum_6061" },
      { job: makeJob({ job_id: "RT-002", revenue: 1800, estimated_cost: 2100, status: "loss" }), material: "steel_a36" },
    ]);
    const engine = new QuotingActualOutcomeLoaderEngine(source);

    // This is the exact method wired to prism_quoting:closed_loop_provenance_check
    const result = await engine.provenanceCheck();

    // Gate must open for real data
    expect(result.may_promote).toBe(true);
    expect(result.provenance.verdict).toBe("real");
    expect(result.outcome_count).toBe(2);
    expect(result.outcomes).toHaveLength(2);

    // Reference-value invariant: the mapped records carry exact billing signal
    const rt001 = result.outcomes.find((o) => o.quote_id === "RT-001");
    expect(rt001?.predicted_quote_usd).toBe(2400);
    expect(rt001?.actual_invoice_usd).toBe(3200);
    expect(rt001?.accepted).toBe(true);

    const rt002 = result.outcomes.find((o) => o.quote_id === "RT-002");
    expect(rt002?.actual_invoice_usd).toBe(1800);
    expect(rt002?.accepted).toBe(false);
  });

  it("returns may_promote:false + verdict:'empty' when source has no jobs (no throw from provenanceCheck)", async () => {
    // provenanceCheck is the advisory surface -- it maps FAIL-LOUD to empty verdict
    // so callers get a structured response rather than an unhandled exception.
    const emptySource: ActualCostSource = {
      listJobIds: () => [],
      profitability: () => { throw new Error("unreachable"); },
    };
    const engine = new QuotingActualOutcomeLoaderEngine(emptySource);

    const result = await engine.provenanceCheck();

    // Gate must be closed -- no data means no promotion
    expect(result.may_promote).toBe(false);
    expect(result.provenance.verdict).toBe("empty");
    expect(result.outcome_count).toBe(0);
    expect(result.outcomes).toHaveLength(0);
  });

  it("returns may_promote:false when all jobs have zero revenue", async () => {
    const source = makeSource([
      { job: makeJob({ job_id: "ZR-ROUND", revenue: 0 }) },
    ]);
    const engine = new QuotingActualOutcomeLoaderEngine(source);

    const result = await engine.provenanceCheck();

    // All null invoices -> empty verdict -> gate closed
    expect(result.may_promote).toBe(false);
    expect(result.provenance.verdict).toBe("empty");
  });

  // P1a regression lock: a hard infra failure (source throws unexpectedly) must
  // produce verdict:"error" NOT verdict:"empty".  Reverting the P1a fix causes
  // this test to fail because the catch block would return verdict:"empty" and
  // signals would carry no error message.
  it("P1a: provenanceCheck() returns verdict:'error' (not 'empty') when source throws unexpectedly", async () => {
    const crashMsg = "ERP connection refused: timeout after 5000ms";
    const crashingSource: ActualCostSource = {
      listJobIds: () => { throw new Error(crashMsg); },
      profitability: () => { throw new Error("unreachable"); },
    };
    const engine = new QuotingActualOutcomeLoaderEngine(crashingSource);

    const result = await engine.provenanceCheck();

    // Must NOT silently look like a no-data empty -- that hides the crash.
    expect(result.provenance.verdict).toBe("error");
    expect(result.may_promote).toBe(false);
    expect(result.outcome_count).toBe(0);
    // The error message must be present in signals so the operator can diagnose.
    expect(result.provenance.signals).toHaveLength(1);
    expect(result.provenance.signals[0]).toContain(crashMsg);
    expect(result.provenance.signals[0]).toMatch(/^loader-error:/);
  });
});

// -- P1b regression lock: ActualCostEngine.listJobIds() public accessor --------
// Pins that the public method exists and returns the estimate keys.
// Reverting the P1b fix (removing listJobIds) causes a compile error here,
// and a runtime crash in the live source path of QuotingActualOutcomeLoaderEngine.

import { ActualCostEngine } from "../engines/ActualCostEngine.js";

describe("ActualCostEngine.listJobIds -- public accessor (P1b regression lock)", () => {
  it("returns the keys of the estimates map via the public method", () => {
    const engine = new ActualCostEngine();

    // Initially empty
    expect(engine.listJobIds()).toEqual([]);

    // After recording estimates, keys are visible via the public accessor
    engine.recordEstimate("JOB-A", { labor: 500, material: 200 });
    engine.recordEstimate("JOB-B", { labor: 300, material: 100 });

    const ids = engine.listJobIds();
    expect(ids).toHaveLength(2);
    expect(ids).toContain("JOB-A");
    expect(ids).toContain("JOB-B");
  });
});
