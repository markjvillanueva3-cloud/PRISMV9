/**
 * QuoteExplainPDFEngine — renders an {@link InstantQuoteResult} into a buyer-visible
 * "Why this price?" artifact (galaxy:business, slot:hotel). The explainable-physics MOAT:
 * every dollar in the quote is traced back to a named physics engine + an ISO/literature basis,
 * so a procurement buyer can audit the price instead of taking it on faith.
 *
 * This is NOT a binary PDF. It is a structured render — a plain object PLUS a human-readable
 * markdown string — that the frontend turns into a PDF (jsPDF / react-pdf / print CSS). Keeping
 * it a pure, dependency-free transform means it is deterministic, unit-testable, and never reaches
 * out to the network or a PDF runtime from the backend.
 *
 * DEDUP — this engine NEVER recomputes a quote. It consumes the {@link InstantQuoteResult} that
 * InstantQuoteEngine already produced (its cost_breakdown, ci95 bounds, cycle_time_source ladder,
 * physics_engines_used, per-DFM physics_basis) and re-narrates it. Recomputing here would fork the
 * pricing logic and let the explanation drift from the actual quote. {@link InstantQuoteEngine}
 * OWNS pricing; this engine OWNS the explanation of that pricing.
 *
 * Physics-derivation chain narrated (the Kienzle cost chain, per InstantQuoteEngine's pipeline):
 *   specific cutting force (Kienzle kc) → cutting power → MRR-bounded cycle time → machining cost
 *   → aggregated unit price (QuoteEstimatorEngine) → CI95 band (RSS uncertainty, AACE 18R-97).
 *
 * Honesty invariants (the whole point of the moat — a fabricated derivation is worse than none):
 *  - a quote whose cycle_time_source is "historical" renders an HONEST "estimated from similar
 *    parts, not first-principles" note and emits NO fabricated physics derivation steps.
 *  - a quote missing the cost/cycle-time fields THROWS (you cannot explain a quote that has no
 *    derivation) — never a bogus default, never a half-rendered artifact.
 *  - money in the render is rounded with REUSED roundCentsHalfEven (banker's rounding) so the
 *    explanation's dollars match the ERP/invoice penny-for-penny (DRY with SalesUseTaxEngine).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.
import { roundCentsHalfEven } from "../data/money.js";
import type { InstantQuoteResult } from "./InstantQuoteEngine.js";

// ============================================================================
// Cycle-time-source ladder — the canonical preference order + per-tier rationale.
// Defined ONCE here (render vocabulary, not a physics constant) with a citation comment;
// every consumer reads this table rather than inlining the strings. The ladder order is
// InstantQuoteEngine / QuoteEstimatorEngine's own contract:
//   cam_derived > physics_calculated > parametric_estimate > historical
// (QuoteEstimatorEngine.QuoteEstimateResult.costs.machining.cycle_time_source union type).
// ============================================================================

/** Preference rank: lower index = more trustworthy / more first-principles. */
const CYCLE_TIME_SOURCE_LADDER = [
  "cam_derived",
  "physics_calculated",
  "parametric_estimate",
  "historical",
] as const;

export type CycleTimeSource = (typeof CYCLE_TIME_SOURCE_LADDER)[number];

/**
 * Per-tier human rationale: WHY a given tier was used and HOW trustworthy it is.
 * `firstPrinciples=true` tiers earn a physics derivation; `false` tiers get the honest note.
 * Citations tie each tier to its method of record.
 */
const CYCLE_TIME_SOURCE_META: Record<
  CycleTimeSource,
  { label: string; rank: number; firstPrinciples: boolean; why: string }
> = {
  cam_derived: {
    label: "CAM-derived toolpath time",
    rank: 0,
    firstPrinciples: true,
    why: "Cycle time was read directly from the simulated CAM toolpath (most accurate — reflects the actual posted program).",
  },
  physics_calculated: {
    label: "Physics-calculated (Kienzle → power → MRR)",
    rank: 1,
    firstPrinciples: true,
    why: "No CAM program available, so cycle time was computed from first principles: Kienzle specific-cutting-force → spindle power → material-removal-rate-bounded machining time.",
  },
  parametric_estimate: {
    label: "Parametric estimate (complexity + geometry scaling)",
    rank: 2,
    firstPrinciples: false,
    why: "Insufficient geometry for a physics solve, so cycle time is a parametric estimate scaled by complexity class and bounding-box volume — directional, not first-principles.",
  },
  historical: {
    label: "Historical (similar-part lookup)",
    rank: 3,
    firstPrinciples: false,
    why: "Cycle time was estimated from similar parts in quote history, NOT derived from first principles. Treat as a reference price pending a physics or CAM solve.",
  },
};

/**
 * Citation basis for each physics engine that can appear in physics_engines_used.
 * Names the ISO / literature standard the engine's contribution rests on, so the
 * derivation step can show its source. Unknown engines fall back to a generic basis
 * (never a fabricated citation).
 */
const ENGINE_PHYSICS_BASIS: Record<string, string> = {
  SpeedFeedOrchestratorEngine:
    "Kienzle (1952) specific cutting force Fc = kc1.1·b·h^(1−mc); ISO 3685 tool-life; merchant power model",
  QuoteEstimatorEngine:
    "Cost aggregation per shop machine-rate model; CI95 via RSS uncertainty propagation (AACE 18R-97)",
  DFMFeedbackEngine:
    "Design-for-manufacturability rules per Boothroyd, Dewhurst & Knight, 'Product Design for Manufacture and Assembly' 3rd ed.",
  PartSimilarityEngine:
    "Historical similar-part price sanity check (feature-vector nearest-neighbor)",
  InstantQuoteEngine:
    "Instant-quote orchestration pipeline (feature → DFM → cycle time → cost → Wright's-law qty breaks)",
};

/** Generic basis when an engine name is not in the citation table — honest, not fabricated. */
const GENERIC_ENGINE_BASIS = "PRISM internal cost/physics model (no external standard cited)";

// ============================================================================
// Output types
// ============================================================================

export interface DerivationStep {
  /** 1-based ordinal within the derivation chain. */
  step: number;
  /** Human title of the step (e.g. "Specific cutting force"). */
  title: string;
  /** Physics engine credited with this step (from physics_engines_used). */
  engine: string;
  /** Inputs that fed this step, as label→value strings (already rendered for display). */
  inputs: Record<string, string>;
  /** Output of this step, as a rendered string (includes units / $). */
  output: string;
  /** ISO / literature basis for this step. */
  basis: string;
}

export interface DFMNote {
  /** The DFM issue message. */
  issue: string;
  /** Severity carried through from the quote. */
  severity: "critical" | "warning" | "info";
  /** The physics/standard basis for flagging it (honest "n/a" when the quote carried none). */
  physics_basis: string;
  /** Dollar cost impact of this issue (rounded to the cent), or null if the quote carried none. */
  costImpact: number | null;
}

export interface CycleTimeSourceLadderRender {
  /** The tier that was actually used for this quote. */
  used: CycleTimeSource;
  /** Display label of the used tier. */
  usedLabel: string;
  /** True when the used tier is a first-principles derivation (earns physics steps). */
  firstPrinciples: boolean;
  /** Why this tier was used (and what it implies for trust). */
  why: string;
  /** The full preference ladder, best→worst, with the used tier flagged. */
  ladder: Array<{ source: CycleTimeSource; label: string; rank: number; isUsed: boolean }>;
}

export interface QuoteConfidenceRender {
  /** Confidence band low bound (rounded to the cent). */
  ci95Low: number;
  /** Confidence band high bound (rounded to the cent). */
  ci95High: number;
  /** Confidence score 0–100 carried through from the quote. */
  confidence: number;
  /** The factors that drove the confidence (carried through from the quote). */
  basis: string[];
}

export interface QuoteExplainArtifact {
  quote_id: string;
  part_name: string;
  quantity: number;
  /** Headline string: unit price + CI95 band, buyer-facing. */
  headline: string;
  /** The step-by-step physics→cost derivation (empty for non-first-principles sources). */
  derivationSteps: DerivationStep[];
  /** Which cycle-time tier was used and why, plus the full ladder. */
  cycleTimeSourceLadder: CycleTimeSourceLadderRender;
  /** DFM issues re-narrated with physics basis + cost impact. */
  dfmNotes: DFMNote[];
  /** Confidence band + its basis. */
  confidence: QuoteConfidenceRender;
  /**
   * Present ONLY when the cycle-time source is not first-principles (parametric/historical):
   * an honest disclosure that the price is not derived from physics. Null otherwise.
   */
  honestyNote: string | null;
  /** The whole artifact rendered as a human-readable markdown "Why this price?" document. */
  markdown: string;
}

// ============================================================================
// Engine
// ============================================================================

export class QuoteExplainPDFEngine {
  /**
   * Render an InstantQuote result into a buyer-visible explain artifact.
   *
   * @param quoteResult the result produced by InstantQuoteEngine.quote() — consumed, never recomputed.
   * @returns a structured artifact + a markdown "Why this price?" document.
   * @throws if the quote is missing the cost/cycle-time fields required to explain it.
   */
  static renderExplain(quoteResult: InstantQuoteResult): QuoteExplainArtifact {
    const q = this.#validate(quoteResult);

    const source = this.#resolveSource(q.cycle_time_source);
    const meta = CYCLE_TIME_SOURCE_META[source];

    const headline = this.#renderHeadline(q);
    const cycleTimeSourceLadder = this.#renderLadder(source);
    const confidence = this.#renderConfidence(q);
    const dfmNotes = this.#renderDfmNotes(q);

    // First-principles tiers earn a derivation chain; non-physics tiers get an honest note instead.
    const derivationSteps = meta.firstPrinciples ? this.#renderDerivationSteps(q) : [];
    const honestyNote = meta.firstPrinciples
      ? null
      : `This price is ${meta.label.toLowerCase()} — ${meta.why} ` +
        "It is an estimate, not a first-principles physics derivation; request a CAD upload or CAM program for a physics-backed quote.";

    const markdown = this.#renderMarkdown({
      q,
      headline,
      derivationSteps,
      cycleTimeSourceLadder,
      dfmNotes,
      confidence,
      honestyNote,
    });

    return {
      quote_id: q.quote_id,
      part_name: q.part_name,
      quantity: q.quantity,
      headline,
      derivationSteps,
      cycleTimeSourceLadder,
      dfmNotes,
      confidence,
      honestyNote,
      markdown,
    };
  }

  // --------------------------------------------------------------------------
  // Validation (fail-loud — cannot explain a quote with no derivation)
  // --------------------------------------------------------------------------

  static #validate(quoteResult: InstantQuoteResult): InstantQuoteResult {
    if (quoteResult === null || typeof quoteResult !== "object") {
      throw new Error("[quote-explain] quoteResult must be an InstantQuoteResult object");
    }
    const q = quoteResult;

    // Identity / price fields must be present and finite — an explain artifact headlines the price.
    for (const field of ["unit_price", "total_price", "ci95_low", "ci95_high", "confidence"] as const) {
      const v = q[field];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new Error(
          `[quote-explain] cannot explain a quote missing/invalid '${field}' (got ${JSON.stringify(v)}) — ` +
            "QuoteExplainPDFEngine consumes a complete InstantQuoteResult, it does not recompute pricing",
        );
      }
    }

    // Cycle-time derivation must exist — the whole artifact narrates it.
    if (typeof q.cycle_time_source !== "string" || q.cycle_time_source.length === 0) {
      throw new Error("[quote-explain] quote is missing 'cycle_time_source' — no derivation to explain");
    }
    if (typeof q.cycle_time_min !== "number" || !Number.isFinite(q.cycle_time_min) || q.cycle_time_min < 0) {
      throw new Error(
        `[quote-explain] quote has invalid 'cycle_time_min' (${JSON.stringify(q.cycle_time_min)}) — cannot explain a quote with no machining time`,
      );
    }

    // Cost breakdown must exist — the derivation steps walk it.
    const cb = q.cost_breakdown;
    if (cb === null || typeof cb !== "object") {
      throw new Error("[quote-explain] quote is missing 'cost_breakdown' — nothing to derive");
    }
    if (
      cb.material === undefined ||
      cb.machining === undefined ||
      typeof cb.total_cost_per_part !== "number" ||
      !Number.isFinite(cb.total_cost_per_part)
    ) {
      throw new Error(
        "[quote-explain] quote 'cost_breakdown' is missing material/machining/total_cost_per_part — incomplete derivation",
      );
    }
    if (typeof cb.machining.cycle_time_min !== "number" || typeof cb.machining.machine_rate_hr !== "number") {
      throw new Error("[quote-explain] quote 'cost_breakdown.machining' is missing cycle_time_min/machine_rate_hr");
    }

    if (!Array.isArray(q.physics_engines_used)) {
      throw new Error("[quote-explain] quote is missing 'physics_engines_used[]' — cannot credit derivation steps");
    }

    return q;
  }

  // --------------------------------------------------------------------------
  // Source resolution
  // --------------------------------------------------------------------------

  /**
   * Map the quote's free-string cycle_time_source onto the canonical ladder.
   * InstantQuoteEngine types this as a free `string` (and only ever emits two of the four tiers
   * today), so we resolve defensively. An unrecognized non-empty value is treated as a historical
   * (non-first-principles) tier — the SAFE failure mode: never fabricate physics for an unknown source.
   */
  static #resolveSource(raw: string): CycleTimeSource {
    const norm = raw.trim().toLowerCase();
    if ((CYCLE_TIME_SOURCE_LADDER as readonly string[]).includes(norm)) {
      return norm as CycleTimeSource;
    }
    // Tolerate close aliases InstantQuoteEngine/QuoteEstimator may use.
    if (norm === "parametric") return "parametric_estimate";
    if (norm === "cam" || norm === "cam_simulated") return "cam_derived";
    if (norm === "physics") return "physics_calculated";
    // Unknown source → honest fallback (no fabricated physics), never throw on a present-but-odd label.
    return "historical";
  }

  // --------------------------------------------------------------------------
  // Renders
  // --------------------------------------------------------------------------

  static #renderHeadline(q: InstantQuoteResult): string {
    const unit = roundCentsHalfEven(q.unit_price);
    const low = roundCentsHalfEven(q.ci95_low);
    const high = roundCentsHalfEven(q.ci95_high);
    return (
      `$${unit.toFixed(2)}/unit (95% confidence: $${low.toFixed(2)}–$${high.toFixed(2)}) ` +
      `· ${q.quantity}× = $${roundCentsHalfEven(q.total_price).toFixed(2)} total`
    );
  }

  static #renderLadder(used: CycleTimeSource): CycleTimeSourceLadderRender {
    const meta = CYCLE_TIME_SOURCE_META[used];
    return {
      used,
      usedLabel: meta.label,
      firstPrinciples: meta.firstPrinciples,
      why: meta.why,
      ladder: CYCLE_TIME_SOURCE_LADDER.map((source) => ({
        source,
        label: CYCLE_TIME_SOURCE_META[source].label,
        rank: CYCLE_TIME_SOURCE_META[source].rank,
        isUsed: source === used,
      })),
    };
  }

  static #renderConfidence(q: InstantQuoteResult): QuoteConfidenceRender {
    return {
      ci95Low: roundCentsHalfEven(q.ci95_low),
      ci95High: roundCentsHalfEven(q.ci95_high),
      confidence: q.confidence,
      basis: Array.isArray(q.confidence_factors) ? [...q.confidence_factors] : [],
    };
  }

  static #renderDfmNotes(q: InstantQuoteResult): DFMNote[] {
    const issues = q.dfm?.issues;
    if (!Array.isArray(issues)) return [];
    return issues.map((i) => ({
      issue: i.message,
      severity: i.severity,
      physics_basis: i.physics_basis && i.physics_basis.length > 0 ? i.physics_basis : "n/a (heuristic DFM rule)",
      costImpact: typeof i.cost_impact_usd === "number" && Number.isFinite(i.cost_impact_usd)
        ? roundCentsHalfEven(i.cost_impact_usd)
        : null,
    }));
  }

  /**
   * The Kienzle cost chain, narrated as discrete steps:
   *   1. specific cutting force / MRR  → cycle time  (the physics engine)
   *   2. cycle time × machine rate     → machining cost
   *   3. + material + setup + tooling + programming + inspection + secondary + overhead → unit cost
   *   4. unit cost → unit price (with CI95 band)
   * Each step credits the engine that produced it and cites its basis.
   */
  static #renderDerivationSteps(q: InstantQuoteResult): DerivationStep[] {
    const cb = q.cost_breakdown;
    const steps: DerivationStep[] = [];

    // The physics engine that produced the cycle time (prefer SpeedFeedOrchestrator if it ran).
    const cycleEngine = q.physics_engines_used.includes("SpeedFeedOrchestratorEngine")
      ? "SpeedFeedOrchestratorEngine"
      : "InstantQuoteEngine";

    // Step 1: physics → cycle time
    steps.push({
      step: 1,
      title: "Cutting physics → cycle time",
      engine: cycleEngine,
      inputs: {
        process: q.recommended_process,
        machine: q.recommended_machine,
      },
      output: `${this.#round3(q.cycle_time_min)} min machining time`,
      basis: this.#basisFor(cycleEngine),
    });

    // Step 2: cycle time × machine rate → machining cost
    const machRate = roundCentsHalfEven(cb.machining.machine_rate_hr);
    steps.push({
      step: 2,
      title: "Cycle time × machine rate → machining cost",
      engine: "QuoteEstimatorEngine",
      inputs: {
        cycle_time_min: `${this.#round3(cb.machining.cycle_time_min)} min`,
        machine_rate_hr: `$${machRate.toFixed(2)}/hr`,
      },
      output: `$${roundCentsHalfEven(cb.machining.total).toFixed(2)} machining cost`,
      basis: this.#basisFor("QuoteEstimatorEngine"),
    });

    // Step 3: aggregate all cost buckets → unit cost
    const buckets: Array<[string, number | undefined]> = [
      ["material", cb.material?.total],
      ["machining", cb.machining?.total],
      ["setup", cb.setup?.total],
      ["tooling", cb.tooling?.total],
      ["programming", cb.programming?.total],
      ["inspection", cb.inspection?.total],
      ["secondary_ops", cb.secondary_ops?.total],
      ["overhead", cb.overhead?.total],
    ];
    const inputs: Record<string, string> = {};
    for (const [name, val] of buckets) {
      if (typeof val === "number" && Number.isFinite(val)) {
        inputs[name] = `$${roundCentsHalfEven(val).toFixed(2)}`;
      }
    }
    steps.push({
      step: 3,
      title: "Sum cost buckets → unit cost",
      engine: "QuoteEstimatorEngine",
      inputs,
      output: `$${roundCentsHalfEven(cb.total_cost_per_part).toFixed(2)} unit cost`,
      basis: this.#basisFor("QuoteEstimatorEngine"),
    });

    // Step 4: unit cost → unit price (margin) + CI95 band
    steps.push({
      step: 4,
      title: "Unit cost → unit price (with CI95 band)",
      engine: "QuoteEstimatorEngine",
      inputs: {
        unit_cost: `$${roundCentsHalfEven(cb.total_cost_per_part).toFixed(2)}`,
        confidence: `${q.confidence}%`,
      },
      output:
        `$${roundCentsHalfEven(q.unit_price).toFixed(2)}/unit ` +
        `(95% CI: $${roundCentsHalfEven(q.ci95_low).toFixed(2)}–$${roundCentsHalfEven(q.ci95_high).toFixed(2)})`,
      basis: "CI95 via RSS uncertainty propagation, AACE International Recommended Practice 18R-97",
    });

    return steps;
  }

  static #basisFor(engine: string): string {
    return ENGINE_PHYSICS_BASIS[engine] ?? GENERIC_ENGINE_BASIS;
  }

  /** Round to 3 decimals for time/quantity display (NOT money — money uses roundCentsHalfEven). */
  static #round3(v: number): number {
    return Math.round(v * 1000) / 1000;
  }

  // --------------------------------------------------------------------------
  // Markdown render — the human-readable "Why this price?" document
  // --------------------------------------------------------------------------

  static #renderMarkdown(ctx: {
    q: InstantQuoteResult;
    headline: string;
    derivationSteps: DerivationStep[];
    cycleTimeSourceLadder: CycleTimeSourceLadderRender;
    dfmNotes: DFMNote[];
    confidence: QuoteConfidenceRender;
    honestyNote: string | null;
  }): string {
    const { q, headline, derivationSteps, cycleTimeSourceLadder, dfmNotes, confidence, honestyNote } = ctx;
    const L: string[] = [];

    L.push(`# Why this price? — ${q.part_name}`);
    L.push("");
    L.push(`**Quote ${q.quote_id}** · quantity ${q.quantity}`);
    L.push("");
    L.push(`## Headline`);
    L.push("");
    L.push(headline);
    L.push("");

    // Cycle-time source ladder
    L.push(`## Cycle-time basis`);
    L.push("");
    L.push(`Source used: **${cycleTimeSourceLadder.usedLabel}**`);
    L.push("");
    L.push(cycleTimeSourceLadder.why);
    L.push("");
    L.push(`| Tier (best → fallback) | Used |`);
    L.push(`| --- | --- |`);
    for (const tier of cycleTimeSourceLadder.ladder) {
      L.push(`| ${tier.label} | ${tier.isUsed ? "✓ used" : ""} |`);
    }
    L.push("");

    if (honestyNote) {
      L.push(`> ⚠️ ${honestyNote}`);
      L.push("");
    }

    // Derivation steps
    if (derivationSteps.length > 0) {
      L.push(`## Price derivation (physics → cost)`);
      L.push("");
      for (const s of derivationSteps) {
        L.push(`### Step ${s.step}: ${s.title}`);
        L.push(`- **Engine:** ${s.engine}`);
        const inputPairs = Object.entries(s.inputs);
        if (inputPairs.length > 0) {
          L.push(`- **Inputs:** ${inputPairs.map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
        L.push(`- **Output:** ${s.output}`);
        L.push(`- **Basis:** ${s.basis}`);
        L.push("");
      }
    }

    // Confidence
    L.push(`## Confidence`);
    L.push("");
    L.push(
      `${confidence.confidence}% confidence · 95% band $${confidence.ci95Low.toFixed(2)}–$${confidence.ci95High.toFixed(2)}`,
    );
    if (confidence.basis.length > 0) {
      L.push("");
      for (const f of confidence.basis) L.push(`- ${f}`);
    }
    L.push("");

    // DFM notes
    if (dfmNotes.length > 0) {
      L.push(`## Design-for-manufacturability notes`);
      L.push("");
      for (const n of dfmNotes) {
        const impact = n.costImpact !== null ? ` (cost impact ≈ $${n.costImpact.toFixed(2)})` : "";
        L.push(`- **[${n.severity}]** ${n.issue}${impact}`);
        L.push(`  - basis: ${n.physics_basis}`);
      }
      L.push("");
    }

    // Provenance
    L.push(`## Engines credited`);
    L.push("");
    L.push(q.physics_engines_used.join(", "));
    L.push("");

    return L.join("\n");
  }
}

export const quoteExplainPDFEngine = QuoteExplainPDFEngine;
