/**
 * ConsumableReconciliationEngine -- per-consumable-type predicted-vs-actual
 * reconciliation for the quoting closed loop (QUOTING-OPTIMAL/U4).
 *
 * WHY (the gap this closes): perishable-tooling consumables (inserts, drills,
 * taps, wire, coolant, abrasives) are ~$4.9M of real JM spend
 * (state/shared/quoting/jm-tool-purchases.json, 7,150 line-items) yet the quote
 * cost stack had NO predicted-vs-actual reconciliation for them. The prediction
 * side exists (ToolCostAmortizationEngine / ToolCostPerPartEngine, forward
 * per-part cost) and aggregate actuals exist (ActualCostEngine.tooling = total
 * only, no per-type), but nothing reconciled per-consumable-type predicted vs
 * actual to feed the loop. LatheActualCostReconciliationEngine bundles ALL
 * tooling into ONE cycle-scaled tool_wear multiplier (no per-type breakdown);
 * ERPCostFeedbackEngine is an unwired ledger -- so this is NOT a duplicate.
 *
 * WHAT IT DOES (honest, R12): pure per-type reconciliation. Caller supplies the
 * predicted consumable lines and the actual per-type consumption (shop-floor /
 * ERP supplies these when available). For each type it computes qty + cost
 * variance, breakage rate, and a BOUNDED [0.8, 1.2] advisory feedback
 * multiplier (same convention as LatheActualCostReconciliationEngine -- a tuning
 * HINT, never a gate). It NEVER touches a reconciliation threshold (charlie soul
 * refuse-list: softening-quote-vs-actual-reconciliation-thresholds).
 *
 * DATA HONESTY: jm-tool-purchases.json byType carries {count, spend} only -- NO
 * per-type qty. So the fallback unit-cost prior is spend/count = average $ per
 * PURCHASE LINE-ITEM (a line-item may be a box of N inserts), an ADVISORY rough
 * figure, NOT a true per-unit cost. It is used ONLY when the caller omits
 * cost_per_unit, and it is flagged confidence:"advisory" + a warning. Feeding it
 * as a true per-unit cost would be the units/grain error class the quoting
 * galaxy gotcha #5 warns against.
 *
 * Actions: consumable_reconcile (prism_quoting)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// -- Reader path (mirrors VendorCostIndexEngine resolver) --------------------
const TOOL_PURCHASES_REL = "state/shared/quoting/jm-tool-purchases.json";
const WALK_UP_DEPTH = 8;

/** Best-effort resolution: walk up from cwd, then from this module's dir. */
function resolveRelPath(rel: string): string | null {
  const roots: string[] = [];
  let d = process.cwd();
  for (let i = 0; i < WALK_UP_DEPTH; i++) {
    roots.push(d);
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  try {
    let m = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < WALK_UP_DEPTH; i++) {
      roots.push(m);
      const up = dirname(m);
      if (up === m) break;
      m = up;
    }
  } catch {
    /* import.meta unavailable in this runtime -- cwd candidates suffice */
  }
  for (const r of roots) {
    const candidate = join(r, rel);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// -- Types -------------------------------------------------------------------

export type ConsumableCategory =
  | "insert"
  | "drill"
  | "tap"
  | "reamer"
  | "end-mill"
  | "wire"
  | "coolant"
  | "abrasive"
  | "grinding-wheel"
  | "boring-bar"
  | "misc-tooling";

/** A predicted consumable line from the quote. */
export interface ConsumableLine {
  /** Stable key joining predicted<->actual (e.g. "roughing_inserts", "3mm_drill"). */
  type: string;
  /** Coarse family; drives the jm-tool-purchases.json prior fallback. */
  category: ConsumableCategory;
  /** Optional finer label (e.g. "coated_carbide_r390"). */
  subtype?: string;
  /** Predicted quantity consumed on this job. */
  predicted_qty: number;
  /** Caller-supplied unit cost (USD). Falls back to the advisory prior when omitted. */
  cost_per_unit?: number;
}

/** Actual per-type consumption from the shop floor / ERP. */
export interface ConsumableActual {
  type: string;
  qty_used: number;
  qty_broken?: number;
}

export interface ConsumableReconcileInput {
  job_id: string;
  quote_id: string;
  customer?: string;
  predicted: ConsumableLine[];
  actual: ConsumableActual[];
  /** Test/override path for the unit-cost prior corpus. */
  unit_cost_basis_path?: string;
}

export interface ConsumableVariance {
  type: string;
  category: ConsumableCategory;
  subtype?: string;
  predicted_qty: number;
  actual_qty_used: number;
  actual_qty_broken: number;
  cost_per_unit: number;
  cost_per_unit_source: "caller" | "advisory-prior" | "none";
  predicted_cost_usd: number;
  actual_cost_usd: number;
  variance_qty: number;
  variance_qty_pct: number | null;
  variance_cost_usd: number;
  variance_cost_pct: number | null;
  breakage_rate_pct: number | null;
  /** Bounded advisory tuning hint in [0.8, 1.2]; NOT a gate. null when predicted_cost=0. */
  multiplier: number | null;
  warnings: string[];
}

export interface ConsumableRootCause {
  type: string;
  reason: string;
}

export interface ConsumableReconciliationReport {
  reconciliation_id: string;
  job_id: string;
  quote_id: string;
  customer?: string;
  consumables: ConsumableVariance[];
  total_predicted_consumable_usd: number;
  total_actual_consumable_usd: number;
  total_variance_usd: number;
  total_variance_pct: number | null;
  /** Per-type bounded advisory multipliers, keyed by type. */
  feedback_multipliers: Record<string, number>;
  root_causes: ConsumableRootCause[];
  warnings: string[];
  source: string;
}

const MULT_MIN = 0.8;
const MULT_MAX = 1.2;

function round4(n: number): number {
  return Number(n.toFixed(4));
}
function round2(n: number): number {
  return Number(n.toFixed(2));
}
function clampMult(m: number): number {
  return Math.min(MULT_MAX, Math.max(MULT_MIN, m));
}
function isFinitePos(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export class ConsumableReconciliationEngine {
  /** Cache of the advisory per-line-item unit-cost prior, keyed by resolved path. */
  private priorCache: { path: string; byType: Record<string, number> } | null = null;

  /**
   * Load the advisory per-category unit-cost prior from jm-tool-purchases.json.
   * Returns spend/count (avg $ per PURCHASE LINE-ITEM) per byType key -- an
   * ADVISORY rough figure, NOT a true per-unit cost (byType has no qty). Empty
   * map on missing/corrupt file (fail-soft, never throws).
   */
  loadAdvisoryPrior(basisPath?: string): Record<string, number> {
    const path = basisPath ?? resolveRelPath(TOOL_PURCHASES_REL);
    if (path && this.priorCache && this.priorCache.path === path) return this.priorCache.byType;
    if (!path || !existsSync(path)) return {};
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as {
        byType?: Record<string, { count?: number; spend?: number }>;
      };
      const byType: Record<string, number> = {};
      const src = raw.byType ?? {};
      for (const [k, v] of Object.entries(src)) {
        const count = v?.count ?? 0;
        const spend = v?.spend ?? 0;
        if (count > 0 && spend > 0) byType[k] = spend / count;
      }
      if (path) this.priorCache = { path, byType };
      return byType;
    } catch {
      return {}; // corrupt file -- advisory prior simply unavailable
    }
  }

  /**
   * Reconcile predicted vs actual per-consumable-type. Pure -- no I/O beyond the
   * fail-soft advisory-prior read, no state mutation, no threshold touch.
   *
   * @param input predicted consumable lines + actual per-type consumption
   * @returns per-type + total variance with bounded advisory feedback multipliers
   */
  reconcile(input: ConsumableReconcileInput): ConsumableReconciliationReport {
    if (!input || typeof input.job_id !== "string" || !input.job_id) {
      throw new Error("ConsumableReconciliationEngine.reconcile: job_id (non-empty string) required");
    }
    if (typeof input.quote_id !== "string" || !input.quote_id) {
      throw new Error("ConsumableReconciliationEngine.reconcile: quote_id (non-empty string) required");
    }
    if (!Array.isArray(input.predicted)) {
      throw new Error("ConsumableReconciliationEngine.reconcile: predicted[] array required");
    }
    if (!Array.isArray(input.actual)) {
      throw new Error("ConsumableReconciliationEngine.reconcile: actual[] array required");
    }

    const warnings: string[] = [];
    const prior = this.loadAdvisoryPrior(input.unit_cost_basis_path);
    const actualByType = new Map<string, ConsumableActual>();
    for (const a of input.actual) {
      if (a && typeof a.type === "string") actualByType.set(a.type, a);
    }

    const consumables: ConsumableVariance[] = [];
    let totalPredicted = 0;
    let totalActual = 0;
    const feedbackMultipliers: Record<string, number> = {};

    for (const line of input.predicted) {
      const lineWarnings: string[] = [];
      if (!line || typeof line.type !== "string" || !line.type) {
        warnings.push("skipped a predicted line with no type");
        continue;
      }
      // Sanitize quantities -- reject NaN/Infinity/negative down to 0 with a warning.
      let predictedQty = line.predicted_qty;
      if (!isFinitePos(predictedQty)) {
        lineWarnings.push(`predicted_qty for ${line.type} not a finite non-negative number -- treated as 0`);
        predictedQty = 0;
      }

      const act = actualByType.get(line.type);
      let qtyUsed = act?.qty_used ?? 0;
      if (!isFinitePos(qtyUsed)) {
        lineWarnings.push(`qty_used for ${line.type} not a finite non-negative number -- treated as 0`);
        qtyUsed = 0;
      }
      let qtyBroken = act?.qty_broken ?? 0;
      if (!isFinitePos(qtyBroken)) {
        lineWarnings.push(`qty_broken for ${line.type} not a finite non-negative number -- treated as 0`);
        qtyBroken = 0;
      }
      // Broken cannot exceed used (a physical impossibility). Clamp so breakage_rate stays <=100%.
      if (qtyBroken > qtyUsed) {
        lineWarnings.push(`qty_broken (${qtyBroken}) for ${line.type} exceeds qty_used (${qtyUsed}) -- clamped to qty_used (breakage_rate capped at 100%)`);
        qtyBroken = qtyUsed;
      }
      if (!act) lineWarnings.push(`no actual consumption reported for ${line.type} -- qty_used defaulted to 0`);

      // Resolve unit cost: caller-supplied wins; else advisory line-item prior.
      let costPerUnit = 0;
      let costSource: ConsumableVariance["cost_per_unit_source"] = "none";
      if (isFinitePos(line.cost_per_unit) && line.cost_per_unit > 0) {
        costPerUnit = line.cost_per_unit;
        costSource = "caller";
      } else {
        const p = prior[line.category];
        if (typeof p === "number" && p > 0) {
          costPerUnit = p;
          costSource = "advisory-prior";
          lineWarnings.push(
            `cost_per_unit for ${line.type} fell back to the ADVISORY per-line-item prior ($${round2(p)}/line-item for category ${line.category}) -- NOT a true per-unit cost; supply cost_per_unit for accuracy`,
          );
        } else {
          lineWarnings.push(`no cost_per_unit and no advisory prior for category ${line.category} -- cost variance is 0`);
        }
      }

      const predictedCost = predictedQty * costPerUnit;
      const actualCost = qtyUsed * costPerUnit;
      const varianceQty = qtyUsed - predictedQty;
      const varianceCost = actualCost - predictedCost;
      const varianceQtyPct = predictedQty > 0 ? (varianceQty / predictedQty) * 100 : null;
      const varianceCostPct = predictedCost > 0 ? (varianceCost / predictedCost) * 100 : null;
      const breakageRatePct = qtyUsed > 0 ? (qtyBroken / qtyUsed) * 100 : null;
      // Bounded advisory multiplier (actual/predicted cost), only when predicted_cost>0.
      const multiplier = predictedCost > 0 ? clampMult(actualCost / predictedCost) : null;

      totalPredicted += predictedCost;
      totalActual += actualCost;
      if (multiplier !== null) feedbackMultipliers[line.type] = round4(multiplier);

      consumables.push({
        type: line.type,
        category: line.category,
        subtype: line.subtype,
        predicted_qty: round4(predictedQty),
        actual_qty_used: round4(qtyUsed),
        actual_qty_broken: round4(qtyBroken),
        cost_per_unit: round4(costPerUnit),
        cost_per_unit_source: costSource,
        predicted_cost_usd: round2(predictedCost),
        actual_cost_usd: round2(actualCost),
        variance_qty: round4(varianceQty),
        variance_qty_pct: varianceQtyPct === null ? null : round2(varianceQtyPct),
        variance_cost_usd: round2(varianceCost),
        variance_cost_pct: varianceCostPct === null ? null : round2(varianceCostPct),
        breakage_rate_pct: breakageRatePct === null ? null : round2(breakageRatePct),
        multiplier: multiplier === null ? null : round4(multiplier),
        warnings: lineWarnings,
      });
    }

    const totalVariance = totalActual - totalPredicted;
    const totalVariancePct = totalPredicted > 0 ? round2((totalVariance / totalPredicted) * 100) : null;

    // Advisory root-cause classification: the largest |cost variance| driver +
    // any type whose breakage exceeded 10% (breakage is a real over-consumption signal).
    const rootCauses: ConsumableRootCause[] = [];
    const driver = [...consumables]
      .filter((c) => Number.isFinite(c.variance_cost_usd) && c.variance_cost_usd !== 0)
      .sort((a, b) => Math.abs(b.variance_cost_usd) - Math.abs(a.variance_cost_usd))[0];
    if (driver) {
      rootCauses.push({
        type: driver.type,
        reason:
          driver.variance_cost_usd > 0
            ? `largest cost over-run: consumed $${round2(driver.variance_cost_usd)} more than predicted`
            : `largest cost under-run: consumed $${round2(Math.abs(driver.variance_cost_usd))} less than predicted`,
      });
    }
    for (const c of consumables) {
      if (c.breakage_rate_pct !== null && c.breakage_rate_pct > 10) {
        rootCauses.push({ type: c.type, reason: `high breakage rate ${c.breakage_rate_pct}% -- tool dulling/breaking faster than expected` });
      }
    }

    return {
      reconciliation_id: `consrec-${input.quote_id}-${input.job_id}`,
      job_id: input.job_id,
      quote_id: input.quote_id,
      customer: input.customer,
      consumables,
      total_predicted_consumable_usd: round2(totalPredicted),
      total_actual_consumable_usd: round2(totalActual),
      total_variance_usd: round2(totalVariance),
      total_variance_pct: totalVariancePct,
      feedback_multipliers: feedbackMultipliers,
      root_causes: rootCauses,
      warnings,
      source:
        "ConsumableReconciliationEngine -- per-type predicted-vs-actual; advisory prior from jm-tool-purchases.json (spend/line-item); multiplier bounded [0.8,1.2] advisory (telemetry-only, no threshold)",
    };
  }
}

export const consumableReconciliationEngine = new ConsumableReconciliationEngine();
