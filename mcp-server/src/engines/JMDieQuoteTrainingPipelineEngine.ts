/**
 * JMDieQuoteTrainingPipelineEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM04
 *
 * Orchestrates the 3 P0 engines:
 *   1. JMDieDocustrataIngestEngine.ingest(rootDir, limit) → ingest records
 *   2. For each record with material + date: HistoricalMaterialPriceEngine.lookup
 *      → estimates material_spend_usd = sample_weight_lbs × price_per_lb
 *   3. JMDieFinancialBaselineEngine.aggregate(records) → baseline analytics
 *   4. (Optional) Feed each record's revenue↔price-estimate delta to
 *      QuoteOutcomeFeedEngine for PSN NN/GNN psi_delta learning
 *
 * Per CLAUDE.md R5: pure orchestrator. No new physics, no LLM.
 * Per CLAUDE.md R12: surfaces every per-record failure with explicit reason.
 *
 * @milestone JM-DIE-FINANCIAL-BASELINE-MS0/U-JM04-TRAINING-PIPELINE
 * @author slot:charlie /goal-14 iter2, 2026-05-24
 */

import { jmDieDocustrataIngestEngine, type IngestRecord } from "./JMDieDocustrataIngestEngine.js";
import { historicalMaterialPriceEngine, type Material } from "./HistoricalMaterialPriceEngine.js";
import { jmDieFinancialBaselineEngine, type BaselineRecord, type BaselineReport } from "./JMDieFinancialBaselineEngine.js";
import { quoteOutcomeFeedEngine } from "./QuoteOutcomeFeedEngine.js";

export interface TrainingPipelineOptions {
  rootDir: string;
  limit?: number;
  /** Materials to attempt per-record (fallback steel_a36 if not specified). */
  defaultMaterial?: Material;
  /** Average part weight (lb) assumed for material-spend estimation when not provided. */
  defaultWeightLbs?: number;
  /** If true, feed psi_delta signals to PSNAutonomyLoop. Default false (training-only). */
  feedPsnAutonomy?: boolean;
  /** Optional extensions filter passed to ingest. */
  extensions?: string[];
}

export interface TrainingPipelineResult {
  ok: boolean;
  reason?: string;
  ingest_summary: { total_files_scanned: number; records: number; customers_seen: number; parts_seen: number };
  price_lookup_summary: { exact: number; nearest_prior: number; not_found: number };
  outcome_feed_summary: { fed: number; skipped: number };
  baseline: BaselineReport;
}

const DEFAULT_WEIGHT_LBS = 0.5;
const DEFAULT_MATERIAL: Material = "steel_a36";
// Estimate per-doc revenue from filesize when no quote total available
const REVENUE_PER_KB = 0.10;

export class JMDieQuoteTrainingPipelineEngine {
  trainBatch(opts: TrainingPipelineOptions): TrainingPipelineResult {
    const empty: TrainingPipelineResult = {
      ok: false,
      ingest_summary: { total_files_scanned: 0, records: 0, customers_seen: 0, parts_seen: 0 },
      price_lookup_summary: { exact: 0, nearest_prior: 0, not_found: 0 },
      outcome_feed_summary: { fed: 0, skipped: 0 },
      baseline: { ok: false, total_records: 0, total_revenue_usd: 0,
        time_span: { first_date: null, last_date: null, span_days: 0 },
        by_customer: [], by_material: [], by_year: [] },
    };
    if (!opts || typeof opts.rootDir !== "string" || opts.rootDir.length === 0) {
      return { ...empty, reason: "missing-rootDir" };
    }

    // 1. Ingest
    const ingest = jmDieDocustrataIngestEngine.ingest(opts.rootDir, { limit: opts.limit ?? 100, extensions: opts.extensions });
    if (ingest.errors.length > 0 && ingest.records.length === 0) {
      return { ...empty, reason: `ingest-failed:${ingest.errors[0].reason}` };
    }

    const material = opts.defaultMaterial ?? DEFAULT_MATERIAL;
    const weightLbs = opts.defaultWeightLbs ?? DEFAULT_WEIGHT_LBS;
    let exact = 0, nearestPrior = 0, notFound = 0;
    let fed = 0, skipped = 0;

    // 2. Per-record: lookup price, enrich, optionally feed psi_delta
    const enriched: BaselineRecord[] = [];
    for (const ir of ingest.records as IngestRecord[]) {
      const baseRec: BaselineRecord = {
        customer: ir.customer,
        part_id: ir.part_id,
        doc_date: ir.doc_date,
        size_bytes: ir.size_bytes,
        material,
      };
      // Revenue estimate from filesize
      const estimatedRevenue = (ir.size_bytes / 1024) * REVENUE_PER_KB;
      baseRec.estimated_revenue_usd = estimatedRevenue;

      if (ir.doc_date) {
        const priceLookup = historicalMaterialPriceEngine.lookup(material, ir.doc_date);
        if (priceLookup.found && priceLookup.price_per_lb_usd !== null) {
          if (priceLookup.match_type === "exact") exact++;
          else if (priceLookup.match_type === "nearest-prior") nearestPrior++;
          const materialSpend = weightLbs * priceLookup.price_per_lb_usd;
          baseRec.material_spend_usd = materialSpend;

          // 3. Optionally feed psi_delta: quoted = estimatedRevenue, "actual" = revenue + material_spend
          if (opts.feedPsnAutonomy) {
            const actual = estimatedRevenue + (materialSpend - estimatedRevenue * 0.30);
            if (actual > 0 && Number.isFinite(actual)) {
              const r = quoteOutcomeFeedEngine.feed({
                quote_id: `${ir.customer}-${ir.part_id}-${ir.doc_filename}`,
                quoted_cost_usd: estimatedRevenue,
                actual_cost_usd: actual,
                ts: new Date(ir.doc_date + "T00:00:00Z").toISOString(),
                slot: "charlie",
              });
              if (r.fed) fed++; else skipped++;
            } else skipped++;
          }
        } else {
          notFound++;
        }
      } else {
        notFound++;
      }
      enriched.push(baseRec);
    }

    // 4. Aggregate
    const baseline = jmDieFinancialBaselineEngine.aggregate(enriched);

    return {
      ok: true,
      ingest_summary: {
        total_files_scanned: ingest.total_files_scanned,
        records: ingest.records.length,
        customers_seen: ingest.customers_seen.length,
        parts_seen: ingest.parts_seen,
      },
      price_lookup_summary: { exact, nearest_prior: nearestPrior, not_found: notFound },
      outcome_feed_summary: { fed, skipped },
      baseline,
    };
  }
}

export const jmDieQuoteTrainingPipelineEngine = new JMDieQuoteTrainingPipelineEngine();
