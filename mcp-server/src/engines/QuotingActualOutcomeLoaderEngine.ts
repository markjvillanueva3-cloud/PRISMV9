/**
 * QuotingActualOutcomeLoaderEngine -- QUOTING-CLOSED-LOOP-MS0
 *
 * Supplies REAL actuals from hotel's ActualCostEngine.profitability() to the
 * QuotingClosedLoopEngine OODA loop.  Feeds the ClosedLoopDeps.fetchOutcomes
 * slot so the provenance gate (classifyOutcomeProvenance) can allow live
 * promotion of learned corrections.
 *
 * Charlie soul refuse: FAIL LOUD when there are no real actuals.
 * NEVER silently fall back to synthetic data.
 *
 * Design:
 *  - Pure projection fn cycleOutcomesFromProfitability() -- fully unit-testable
 *  - Injectable source dep (ActualCostSource) -- no live ERP required in tests
 *  - provenanceCheck() wires both: load -> classify -> return verdict
 *
 * Provenance contract (QuotingClosedLoopEngine.ts lines 329-386):
 *  - verdict:"real"      -> mayPromote:true  -> OODA learning proceeds
 *  - verdict:"empty"     -> mayPromote:false -> gate blocks (no real actuals yet)
 *  - verdict:"synthetic" -> mayPromote:false -> gate blocks (placeholder markers)
 *  - verdict:"error"     -> mayPromote:false -> infra failure; signals has the cause
 *
 * Mapping from JobProfitability -> QuoteOutcomeRecord
 * (ActualCostEngine.ts lines 33-46, QuotingClosedLoopEngine.ts lines 62-73):
 *  job_id           -> quote_id
 *  estimated_cost   -> predicted_quote_usd   (model's pre-job estimate)
 *  revenue          -> actual_invoice_usd    (realized invoice)
 *  status derived   -> accepted              (profitable/break_even -> true, loss -> false)
 *  materialType     -> material              (from ActualCostEngine.materialTypes Map)
 */

import {
  type QuoteOutcomeRecord,
  classifyOutcomeProvenance,
  type OutcomeProvenance,
} from "./QuotingClosedLoopEngine.js";

// -- JobProfitability mirror (hotel-galaxy ActualCostEngine.ts lines 33-46) --
// Re-declared here to avoid circular dep on hotel's singleton at import time;
// the injectable source dep supplies the same shape at test time.
export interface JobProfitability {
  job_id: string;
  revenue: number;
  estimated_cost: number;
  actual_cost: number;
  estimated_margin: number;
  actual_margin: number;
  estimated_margin_pct: number;
  actual_margin_pct: number;
  cost_variance: number;
  variance_pct: number;
  categories: unknown[];
  status: "profitable" | "break_even" | "loss";
}

/**
 * Source abstraction -- injectable for unit tests.
 * The live implementation returns the list of job-id/profitability pairs
 * from ActualCostEngine's in-memory Maps.
 */
export interface ActualCostSource {
  /** Return all tracked job ids in the engine's estimates map. */
  listJobIds(): string[];
  /** Return profitability for a single job (same as ActualCostEngine.profitability). */
  profitability(jobId: string): JobProfitability;
  /** Optional: material type string for a job (from ActualCostEngine.materialTypes). */
  materialType?(jobId: string): string | undefined;
}

/** Result of a provenance check -- wraps classifyOutcomeProvenance output */
export interface ProvenanceCheckResult {
  provenance: OutcomeProvenance;
  outcome_count: number;
  /** true if mayPromote; false if gate blocks */
  may_promote: boolean;
  /** the mapped QuoteOutcomeRecord[] -- empty when no real actuals */
  outcomes: QuoteOutcomeRecord[];
}

/**
 * Pure projection: map a JobProfitability row to QuoteOutcomeRecord.
 *
 * Mapping rationale:
 *  - estimated_cost is the model's cost estimate before the job ran = "predicted quote"
 *  - revenue is the real invoice amount = "actual invoice"
 *  - A loss job (status:"loss") is still a real outcome; accepted:false signals it
 *  - A zero-revenue job is treated as no-real-invoice (actual_invoice_usd:null)
 *    because $0 revenue = nothing was billed, which is indistinguishable from
 *    untracked at the ActualCostEngine level.
 */
export function cycleOutcomesFromProfitability(
  rows: Array<{ job: JobProfitability; material?: string }>,
): QuoteOutcomeRecord[] {
  const out: QuoteOutcomeRecord[] = [];
  for (const { job, material } of rows) {
    const actual_invoice_usd = job.revenue > 0 ? job.revenue : null;
    const accepted: boolean | null =
      job.status === "profitable" || job.status === "break_even"
        ? true
        : job.status === "loss"
          ? false
          : null;

    out.push({
      quote_id: job.job_id,
      predicted_quote_usd: job.estimated_cost,
      actual_invoice_usd,
      accepted,
      material: material ?? undefined,
      observed_at: new Date().toISOString(),
    });
  }
  return out;
}

// -- Engine class -------------------------------------------------------------

export class QuotingActualOutcomeLoaderEngine {
  private readonly source: ActualCostSource;

  constructor(source?: ActualCostSource) {
    // Default: defer live import so the engine is importable in test without
    // pulling in the full ActualCostEngine (which has ERP read-paths).
    if (source) {
      this.source = source;
    } else {
      // Live path: wrap the hotel singleton at call-time, not import-time.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      this.source = {
        listJobIds(): string[] {
          // Delegates to the public ActualCostEngine.listJobIds() accessor so
          // a rename of the private field is caught at compile-time.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { actualCostEngine } = require("./ActualCostEngine.js") as {
            actualCostEngine: {
              listJobIds(): string[];
              profitability(id: string): JobProfitability;
              materialType?(id: string): string | undefined;
            };
          };
          return actualCostEngine.listJobIds();
        },
        profitability(jobId: string): JobProfitability {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { actualCostEngine } = require("./ActualCostEngine.js") as {
            actualCostEngine: { profitability(id: string): JobProfitability };
          };
          return actualCostEngine.profitability(jobId);
        },
        materialType(jobId: string): string | undefined {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { actualCostEngine } = require("./ActualCostEngine.js") as {
            actualCostEngine: { materialTypes: Map<string, string> };
          };
          return actualCostEngine.materialTypes.get(jobId);
        },
      };
    }
  }

  /**
   * Load all tracked jobs and project to QuoteOutcomeRecord[].
   *
   * CHARLIE SOUL REFUSE -- FAIL LOUD:
   * If the source has no job ids (empty estimates), throw immediately.
   * We NEVER silently return an empty array that would look like a valid
   * but empty outcome set -- that would let the downstream gate make
   * decisions on zero evidence without knowing why it is zero.
   *
   * @param _opts  reserved for future sinceIso date filter
   */
  async loadOutcomes(_opts?: { sinceIso?: string }): Promise<QuoteOutcomeRecord[]> {
    const ids = this.source.listJobIds();

    if (ids.length === 0) {
      throw new Error(
        "[QuotingActualOutcomeLoaderEngine] FAIL-LOUD: no real actuals available. " +
          "ActualCostEngine has no tracked jobs. " +
          "Cannot supply outcomes to the OODA closed-loop learner. " +
          "Feed real job data via ActualCostEngine.trackEstimate/recordRevenue first.",
      );
    }

    const rows: Array<{ job: JobProfitability; material?: string }> = [];
    for (const id of ids) {
      const job = this.source.profitability(id);
      const material = this.source.materialType?.(id);
      rows.push({ job, material });
    }

    const outcomes = cycleOutcomesFromProfitability(rows);

    // Secondary fail-loud: all projected rows have null invoice (all zero-revenue).
    // Jobs tracked in estimates but with no revenue recorded are still synthetic
    // from the provenance gate's perspective -- they carry no real billing signal.
    const realOutcomes = outcomes.filter((o) => o.actual_invoice_usd != null);
    if (realOutcomes.length === 0) {
      throw new Error(
        "[QuotingActualOutcomeLoaderEngine] FAIL-LOUD: " +
          `${ids.length} job(s) tracked but NONE have revenue recorded (all actual_invoice_usd=null). ` +
          "Cannot promote from zero-revenue outcomes -- these are indistinguishable from synthetic placeholders. " +
          "Call ActualCostEngine.recordRevenue(jobId, amount) for at least one job first.",
      );
    }

    return outcomes;
  }

  /**
   * provenanceCheck -- the action surface wired to prism_quoting.
   *
   * Loads outcomes and classifies them through classifyOutcomeProvenance().
   * Returns a ProvenanceCheckResult.  On FAIL-LOUD from loadOutcomes (no
   * tracked jobs, no revenue), maps to verdict:"empty" + may_promote:false.
   * On a hard infra failure (source threw unexpectedly), maps to
   * verdict:"error" + may_promote:false with the error message in signals,
   * so the caller/operator can distinguish a data gap from a crash.
   */
  async provenanceCheck(_opts?: { sinceIso?: string }): Promise<ProvenanceCheckResult> {
    let outcomes: QuoteOutcomeRecord[] = [];
    try {
      outcomes = await this.loadOutcomes(_opts);
    } catch (err) {
      // provenanceCheck is the advisory surface -- do NOT re-throw.
      // BUT distinguish a hard infra failure from a legitimate no-data condition
      // so the caller/operator can see WHY may_promote is false.
      // verdict:"empty" is reserved for "no real data yet" (expected state).
      // verdict:"error" means the source threw -- a crash or ERP read failure.
      const errMsg = err instanceof Error ? err.message : String(err);
      const isExpectedEmpty =
        errMsg.includes("no real actuals available") ||
        errMsg.includes("NONE have revenue recorded");
      if (isExpectedEmpty) {
        // Legitimate no-data: FAIL-LOUD from loadOutcomes about missing actuals.
        const provenance = classifyOutcomeProvenance(outcomes);
        return {
          provenance,
          outcome_count: 0,
          may_promote: false,
          outcomes,
        };
      }
      // Hard infra failure: surface the cause so the operator can diagnose.
      return {
        provenance: {
          verdict: "error",
          signals: ["loader-error: " + errMsg],
          mayPromote: false,
          real_outcome_count: 0,
        },
        outcome_count: 0,
        may_promote: false,
        outcomes,
      };
    }

    const provenance = classifyOutcomeProvenance(outcomes);
    return {
      provenance,
      outcome_count: outcomes.length,
      may_promote: provenance.mayPromote,
      outcomes,
    };
  }
}

// Singleton -- the live production instance (lazy hotel dep via require at call-time)
export const quotingActualOutcomeLoaderEngine = new QuotingActualOutcomeLoaderEngine();
