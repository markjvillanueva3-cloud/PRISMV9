/**
 * QuoteExplainPDFEngine.test.ts — explainable-quote render (galaxy:business, slot:hotel).
 *
 * Verifies the pure transform of an InstantQuoteResult → buyer-visible "Why this price?" artifact:
 *  - physics_calculated quote → full Kienzle-chain derivation steps with engine names + ISO basis
 *  - historical-source quote → honest fallback note + ZERO fabricated physics steps
 *  - CI95 band rendered correctly (and money is banker's-rounded to match the ERP)
 *  - missing-field quotes THROW (cannot explain a quote with no derivation)
 *  - markdown contains the headline price + every derivation step
 *  - two genuinely different parts/processes (milled 4140 vs turned aluminum) → different derivations
 *
 * Tests assert REAL reference values — each would FAIL if the render logic changed.
 */
import { describe, it, expect } from "vitest";
import { QuoteExplainPDFEngine } from "../engines/QuoteExplainPDFEngine.js";
import type { InstantQuoteResult } from "../engines/InstantQuoteEngine.js";

// ---------------------------------------------------------------------------
// Fixtures — built from InstantQuoteEngine's REAL output shape (InstantQuoteResult).
// ---------------------------------------------------------------------------

/** A milled 4140 steel part, physics-calculated cycle time (SpeedFeedOrchestrator ran). */
function milled4140Quote(overrides: Partial<InstantQuoteResult> = {}): InstantQuoteResult {
  return {
    quote_id: "Q-4140-0001",
    part_name: "4140 bracket",
    quantity: 10,
    date: "2026-05-30",
    valid_until: "2026-06-29",

    unit_price: 142.5,
    total_price: 1425.0,
    ci95_low: 121.13,
    ci95_high: 163.88,
    confidence: 82,

    quantity_breaks: [],
    lead_time_options: [],

    dfm: {
      score: 88,
      manufacturability: "good",
      issues: [
        {
          severity: "warning",
          category: "deep_pocket",
          message: "Pocket depth-to-width ratio 6:1 risks tool deflection",
          recommendation: "Step down or use a stub tool",
          cost_impact_usd: 7.13,
          physics_basis: "Tool deflection δ = FL³/3EI (cantilever beam)",
        },
        {
          severity: "info",
          category: "tolerance",
          message: "±0.005mm tolerance requires finish pass",
          recommendation: "Confirm tolerance is functionally required",
          cost_impact_usd: 1.43,
          // physics_basis intentionally omitted → renders "n/a (heuristic DFM rule)"
        },
      ],
    },

    cost_breakdown: {
      material: { raw_cost: 18.4, scrap_pct: 12, total: 20.61 },
      machining: { cycle_time_min: 24.5, machine_rate_hr: 95, total: 38.79 },
      setup: { num_setups: 2, setup_minutes: 30, total: 12.5 },
      tooling: { tool_count: 4, amortization_per_part: 3.2, total: 3.2 },
      programming: { hours: 1.5, total: 9.0 },
      inspection: { level: "standard", total: 5.5 },
      secondary_ops: { operations: [{ type: "deburr", per_part: 2.0 }], total: 2.0 },
      overhead: { rate_pct: 18, total: 16.34 },
      total_cost_per_part: 107.94,
    },

    similar_parts: [],
    recommended_process: "CNC Milling",
    recommended_machine: "cnc_mill_3axis",

    cycle_time_min: 24.5,
    cycle_time_source: "physics_calculated",
    physics_engines_used: [
      "InstantQuoteEngine",
      "DFMFeedbackEngine",
      "SpeedFeedOrchestratorEngine",
      "QuoteEstimatorEngine",
    ],

    confidence_factors: ["Physics-based cycle time (±12%)", "Secondary ops included (±15%)"],
    warnings: [],
    ...overrides,
  };
}

/** A turned aluminum 6061 part, historical cycle-time source (no first-principles solve). */
function turnedAluminumHistoricalQuote(overrides: Partial<InstantQuoteResult> = {}): InstantQuoteResult {
  return {
    quote_id: "Q-AL-0007",
    part_name: "6061 shaft",
    quantity: 25,
    date: "2026-05-30",
    valid_until: "2026-06-29",

    unit_price: 33.75,
    total_price: 843.75,
    ci95_low: 25.31,
    ci95_high: 42.19,
    confidence: 48,

    quantity_breaks: [],
    lead_time_options: [],

    dfm: { score: 96, manufacturability: "excellent", issues: [] },

    cost_breakdown: {
      material: { raw_cost: 6.2, scrap_pct: 8, total: 6.7 },
      machining: { cycle_time_min: 9.0, machine_rate_hr: 85, total: 12.75 },
      setup: { num_setups: 1, setup_minutes: 15, total: 4.25 },
      tooling: { tool_count: 2, amortization_per_part: 1.1, total: 1.1 },
      programming: { hours: 0.5, total: 3.0 },
      inspection: { level: "minimal", total: 1.5 },
      secondary_ops: { operations: [], total: 0 },
      overhead: { rate_pct: 15, total: 3.79 },
      total_cost_per_part: 25.57,
    },

    similar_parts: [{ id: "P-PRIOR-441", similarity_score: 0.91 }],
    recommended_process: "CNC Turning",
    recommended_machine: "cnc_lathe",

    cycle_time_min: 9.0,
    cycle_time_source: "historical",
    physics_engines_used: ["InstantQuoteEngine", "PartSimilarityEngine", "QuoteEstimatorEngine"],

    confidence_factors: ["Historical similar-part estimate (±25%)"],
    warnings: ["Cycle time estimated from similar parts"],
    ...overrides,
  };
}

describe("QuoteExplainPDFEngine.renderExplain", () => {
  // ── Happy path: physics_calculated → full derivation ──────────────────────

  it("renders full physics derivation steps for a physics_calculated quote", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    // 4 steps: physics→cycle, cycle×rate→mach cost, sum buckets→unit cost, unit cost→price+CI95
    expect(art.derivationSteps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
    expect(art.derivationSteps).toHaveLength(4);
  });

  it("credits SpeedFeedOrchestratorEngine for the cycle-time step when it ran", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    const step1 = art.derivationSteps[0];
    expect(step1.engine).toBe("SpeedFeedOrchestratorEngine");
    expect(step1.basis).toContain("Kienzle");
    expect(step1.output).toBe("24.5 min machining time");
  });

  it("names the ISO/literature basis on the machining-cost and CI95 steps", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    const machStep = art.derivationSteps.find((s) => s.step === 2)!;
    expect(machStep.engine).toBe("QuoteEstimatorEngine");
    expect(machStep.inputs.machine_rate_hr).toBe("$95.00/hr");
    expect(machStep.output).toBe("$38.79 machining cost");

    const ci95Step = art.derivationSteps.find((s) => s.step === 4)!;
    expect(ci95Step.basis).toContain("AACE");
    expect(ci95Step.basis).toContain("18R-97");
  });

  it("falls back to InstantQuoteEngine credit + generic basis when SpeedFeed did not run", () => {
    const q = milled4140Quote({
      physics_engines_used: ["InstantQuoteEngine", "QuoteEstimatorEngine"],
    });
    const art = QuoteExplainPDFEngine.renderExplain(q);
    const step1 = art.derivationSteps[0];
    expect(step1.engine).toBe("InstantQuoteEngine");
    // InstantQuoteEngine has a real citation in the table (not the generic fallback)
    expect(step1.basis).toContain("Instant-quote orchestration");
  });

  // ── Honesty: historical source → no fabricated physics ────────────────────

  it("renders the honest fallback note and ZERO derivation steps for a historical quote", () => {
    const art = QuoteExplainPDFEngine.renderExplain(turnedAluminumHistoricalQuote());
    expect(art.derivationSteps).toHaveLength(0);
    expect(art.honestyNote).not.toBeNull();
    expect(art.honestyNote!.toLowerCase()).toContain("estimate");
    expect(art.cycleTimeSourceLadder.firstPrinciples).toBe(false);
    expect(art.cycleTimeSourceLadder.used).toBe("historical");
  });

  it("physics_calculated quote has NO honesty note (it is first-principles)", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    expect(art.honestyNote).toBeNull();
    expect(art.cycleTimeSourceLadder.firstPrinciples).toBe(true);
  });

  // ── CI95 band + money rounding ────────────────────────────────────────────

  it("renders the CI95 band correctly with banker's-rounded money", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    expect(art.confidence.ci95Low).toBe(121.13);
    expect(art.confidence.ci95High).toBe(163.88);
    expect(art.confidence.confidence).toBe(82);
    expect(art.confidence.basis).toEqual([
      "Physics-based cycle time (±12%)",
      "Secondary ops included (±15%)",
    ]);
    // headline carries the band
    expect(art.headline).toBe(
      "$142.50/unit (95% confidence: $121.13–$163.88) · 10× = $1425.00 total",
    );
  });

  it("applies banker's rounding (round-half-to-even) to the headline price", () => {
    // 142.125 → ties to even hundredth → 142.12 ; 142.135 → 142.14
    const q = milled4140Quote({ unit_price: 142.125, total_price: 1421.25 });
    const art = QuoteExplainPDFEngine.renderExplain(q);
    expect(art.headline).toContain("$142.12/unit");
  });

  // ── The cycle-time-source ladder ──────────────────────────────────────────

  it("renders the full preference ladder best→worst with the used tier flagged", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    expect(art.cycleTimeSourceLadder.ladder.map((t) => t.source)).toEqual([
      "cam_derived",
      "physics_calculated",
      "parametric_estimate",
      "historical",
    ]);
    const used = art.cycleTimeSourceLadder.ladder.filter((t) => t.isUsed);
    expect(used).toHaveLength(1);
    expect(used[0].source).toBe("physics_calculated");
  });

  it("treats an unrecognized cycle_time_source as historical (no fabricated physics)", () => {
    const q = milled4140Quote({ cycle_time_source: "wishful_thinking" });
    const art = QuoteExplainPDFEngine.renderExplain(q);
    expect(art.cycleTimeSourceLadder.used).toBe("historical");
    expect(art.derivationSteps).toHaveLength(0);
    expect(art.honestyNote).not.toBeNull();
  });

  it("resolves the 'parametric' alias onto parametric_estimate (non-first-principles)", () => {
    const q = milled4140Quote({ cycle_time_source: "parametric" });
    const art = QuoteExplainPDFEngine.renderExplain(q);
    expect(art.cycleTimeSourceLadder.used).toBe("parametric_estimate");
    expect(art.derivationSteps).toHaveLength(0);
    expect(art.honestyNote).not.toBeNull();
  });

  // ── DFM notes ─────────────────────────────────────────────────────────────

  it("re-narrates DFM issues with physics basis + cost impact, honest 'n/a' when basis absent", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    expect(art.dfmNotes).toHaveLength(2);
    const warn = art.dfmNotes[0];
    expect(warn.severity).toBe("warning");
    expect(warn.physics_basis).toContain("Tool deflection");
    expect(warn.costImpact).toBe(7.13);
    const info = art.dfmNotes[1];
    expect(info.physics_basis).toBe("n/a (heuristic DFM rule)");
    expect(info.costImpact).toBe(1.43);
  });

  it("renders an empty dfmNotes array when the quote has no DFM issues", () => {
    const art = QuoteExplainPDFEngine.renderExplain(turnedAluminumHistoricalQuote());
    expect(art.dfmNotes).toEqual([]);
  });

  // ── Markdown ──────────────────────────────────────────────────────────────

  it("markdown contains the headline price and every derivation step heading", () => {
    const art = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    expect(art.markdown).toContain("# Why this price? — 4140 bracket");
    expect(art.markdown).toContain("$142.50/unit");
    for (const s of art.derivationSteps) {
      expect(art.markdown).toContain(`### Step ${s.step}: ${s.title}`);
    }
    // credited engines section
    expect(art.markdown).toContain("SpeedFeedOrchestratorEngine");
  });

  it("markdown for a historical quote shows the honesty warning, not derivation steps", () => {
    const art = QuoteExplainPDFEngine.renderExplain(turnedAluminumHistoricalQuote());
    expect(art.markdown).toContain("⚠️");
    expect(art.markdown).not.toContain("## Price derivation");
  });

  // ── Two genuinely different parts → different derivations ──────────────────

  it("produces correctly different derivations for a milled 4140 vs a turned aluminum part", () => {
    const mill = QuoteExplainPDFEngine.renderExplain(milled4140Quote());
    const turn = QuoteExplainPDFEngine.renderExplain(
      turnedAluminumHistoricalQuote({ cycle_time_source: "physics_calculated" }),
    );
    // Both now first-principles, but the process/machine/cycle differ
    expect(mill.derivationSteps[0].inputs.process).toBe("CNC Milling");
    expect(turn.derivationSteps[0].inputs.process).toBe("CNC Turning");
    expect(mill.derivationSteps[0].inputs.machine).toBe("cnc_mill_3axis");
    expect(turn.derivationSteps[0].inputs.machine).toBe("cnc_lathe");
    expect(mill.derivationSteps[0].output).toBe("24.5 min machining time");
    expect(turn.derivationSteps[0].output).toBe("9 min machining time");
    // machining cost step differs ($38.79 vs $12.75)
    expect(mill.derivationSteps[1].output).toBe("$38.79 machining cost");
    expect(turn.derivationSteps[1].output).toBe("$12.75 machining cost");
    expect(mill.headline).not.toBe(turn.headline);
  });

  // ── Failure modes: missing fields THROW ───────────────────────────────────

  it("throws when the quote is missing unit_price", () => {
    const q = milled4140Quote();
    delete (q as Partial<InstantQuoteResult>).unit_price;
    expect(() => QuoteExplainPDFEngine.renderExplain(q)).toThrow(/unit_price/);
  });

  it("throws when ci95 bounds are non-finite", () => {
    expect(() => QuoteExplainPDFEngine.renderExplain(milled4140Quote({ ci95_high: NaN }))).toThrow(
      /ci95_high/,
    );
    expect(() => QuoteExplainPDFEngine.renderExplain(milled4140Quote({ ci95_low: Infinity }))).toThrow(
      /ci95_low/,
    );
  });

  it("throws when cycle_time_source is empty (no derivation to explain)", () => {
    expect(() => QuoteExplainPDFEngine.renderExplain(milled4140Quote({ cycle_time_source: "" }))).toThrow(
      /cycle_time_source/,
    );
  });

  it("throws when cost_breakdown is missing", () => {
    const q = milled4140Quote();
    delete (q as Partial<InstantQuoteResult>).cost_breakdown;
    expect(() => QuoteExplainPDFEngine.renderExplain(q)).toThrow(/cost_breakdown/);
  });

  it("throws when cycle_time_min is negative", () => {
    expect(() => QuoteExplainPDFEngine.renderExplain(milled4140Quote({ cycle_time_min: -5 }))).toThrow(
      /cycle_time_min/,
    );
  });

  it("throws on a non-object quote", () => {
    expect(() => QuoteExplainPDFEngine.renderExplain(null as unknown as InstantQuoteResult)).toThrow(
      /InstantQuoteResult/,
    );
  });

  it("throws when physics_engines_used is not an array", () => {
    const q = milled4140Quote();
    (q as { physics_engines_used: unknown }).physics_engines_used = undefined;
    expect(() => QuoteExplainPDFEngine.renderExplain(q)).toThrow(/physics_engines_used/);
  });

  // ── Adversarial ───────────────────────────────────────────────────────────

  it("tolerates a quote with confidence_factors absent (renders empty basis)", () => {
    const q = milled4140Quote();
    delete (q as Partial<InstantQuoteResult>).confidence_factors;
    const art = QuoteExplainPDFEngine.renderExplain(q);
    expect(art.confidence.basis).toEqual([]);
  });

  it("does not mutate the input quote result", () => {
    const q = milled4140Quote();
    const snapshot = JSON.stringify(q);
    QuoteExplainPDFEngine.renderExplain(q);
    expect(JSON.stringify(q)).toBe(snapshot);
  });
});
