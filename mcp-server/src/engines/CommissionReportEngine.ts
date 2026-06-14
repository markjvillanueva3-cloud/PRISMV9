/**
 * CommissionReportEngine — per-salesperson sales-commission report with tiered rates.
 *
 * Hotel/ERP financial engine (slot:hotel). Computes commission owed to each salesperson
 * from a set of CLOSED deals, using a margin-tiered rate table (higher margin → higher
 * commission rate, the standard sales-comp design that aligns reps with profitability,
 * not just top-line revenue).
 *
 * Pure + deterministic (no I/O, no store): deals in → report out. The dispatcher action
 * `commission_report` is responsible for SOURCING the closed deals (today from the request
 * body; the salesperson-tagged closed-deal store is a tracked follow-up — SalesOrderEngine
 * is a pure status-FSM with no salesperson dimension, so a real source must be established
 * before the live page populates). This engine is the real, tested commission MATH either way.
 *
 * Hotel-soul invariants (enforced, never softened):
 *  - Money reconciles to the CENT: Σ(per-rep commission) === Σ(per-deal commission), and
 *    Σ(per-rep revenue) === Σ(included-deal revenue). `reconciled` is returned, not assumed.
 *  - A deal with non-finite / non-positive revenue, or no way to determine margin (neither
 *    `cost` nor `margin` given), is EXCLUDED and counted — never silently defaulted to a
 *    fabricated margin (a guessed margin would mis-pay a real person).
 *  - PII: `salesperson` is a display name/handle only; this engine never touches SSN/bank data.
 *
 * @milestone HOTEL — commission_report backend (CommissionTrackerPage consumer)
 */

/** One closed deal attributed to a salesperson. `cost` OR `margin` ($) is required to tier it. */
export interface CommissionDeal {
  salesperson: string;
  revenue: number;
  /** COGS in $ — margin$ = revenue − cost. Preferred. */
  cost?: number;
  /** Explicit margin in $ (revenue − cost), if cost is not supplied. */
  margin?: number;
  deal_id?: string;
  closed_date?: string;
}

/** A commission tier: deals at/above `min_margin_pct` margin earn `rate_pct` of revenue. */
export interface CommissionTier {
  min_margin_pct: number;
  rate_pct: number;
}

/** Per-salesperson aggregated commission row — matches CommissionTrackerPage's contract exactly. */
export interface CommissionEntry {
  salesperson: string;
  revenue: number;
  /** revenue-weighted average margin %, to 1 decimal. */
  margin_pct: number;
  /** effective blended commission rate % (commission / revenue), to 2 decimals. */
  commission_rate_pct: number;
  commission_amount: number;
  deals_closed: number;
}

export interface CommissionReportResult {
  entries: CommissionEntry[];
  total_revenue: number;
  total_commission: number;
  deals_total: number;
  /** deals dropped for non-finite/non-positive revenue or indeterminate margin (surfaced, never hidden). */
  deals_excluded: number;
  excluded_reasons: Array<{ deal_id?: string; salesperson?: string; reason: string }>;
  reconciled: boolean;
  tiers: CommissionTier[];
}

/**
 * Default margin-tiered commission table. Ascending min_margin_pct; the engine picks the
 * HIGHEST tier whose threshold the deal's margin% meets. A deal below the lowest threshold
 * earns the lowest tier's rate (here 2% at ≥0% margin — i.e. any profitable-or-breakeven sale).
 */
export const DEFAULT_COMMISSION_TIERS: readonly CommissionTier[] = Object.freeze([
  { min_margin_pct: 0, rate_pct: 2 },
  { min_margin_pct: 20, rate_pct: 4 },
  { min_margin_pct: 35, rate_pct: 6 },
  { min_margin_pct: 50, rate_pct: 8 },
]);

/** Round to the cent (2 decimals), avoiding binary-float drift (e.g. 1.005 → 1.01). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Round to 1 decimal (for display percentages). */
function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

/** Pick the commission rate% for a given margin% from a tier table. Returns 0 if no tier applies. */
export function rateForMargin(marginPct: number, tiers: readonly CommissionTier[] = DEFAULT_COMMISSION_TIERS): number {
  if (!Number.isFinite(marginPct)) return 0;
  // sort ascending by threshold, then take the highest threshold ≤ marginPct
  const sorted = [...tiers].filter((t) => Number.isFinite(t.min_margin_pct) && Number.isFinite(t.rate_pct))
    .sort((a, b) => a.min_margin_pct - b.min_margin_pct);
  let rate = 0;
  for (const t of sorted) {
    if (marginPct >= t.min_margin_pct) rate = t.rate_pct;
    else break;
  }
  return rate;
}

export class CommissionReportEngine {
  /**
   * Compute the per-salesperson commission report.
   * @param deals  closed deals (salesperson + revenue + cost|margin)
   * @param opts.tiers  override the default margin-tier table
   */
  report(deals: CommissionDeal[], opts: { tiers?: readonly CommissionTier[] } = {}): CommissionReportResult {
    const tiers = (Array.isArray(opts.tiers) && opts.tiers.length ? opts.tiers : DEFAULT_COMMISSION_TIERS);
    const list = Array.isArray(deals) ? deals : [];
    const excluded_reasons: CommissionReportResult["excluded_reasons"] = [];

    // accumulator per salesperson
    const acc = new Map<string, { revenue: number; margin$: number; commission: number; deals: number }>();
    let total_commission = 0;
    let total_revenue = 0;

    for (const d of list) {
      const rep = typeof d?.salesperson === "string" && d.salesperson.trim() ? d.salesperson.trim() : null;
      const revenue = Number(d?.revenue);
      if (!rep) { excluded_reasons.push({ deal_id: d?.deal_id, reason: "missing salesperson" }); continue; }
      if (!Number.isFinite(revenue) || revenue <= 0) {
        excluded_reasons.push({ deal_id: d?.deal_id, salesperson: rep, reason: `non-positive/non-finite revenue (${d?.revenue})` });
        continue;
      }
      // margin$ from explicit margin, else revenue − cost; require ONE of them (never guess)
      let margin$: number;
      if (Number.isFinite(Number(d?.margin))) {
        margin$ = Number(d.margin);
      } else if (Number.isFinite(Number(d?.cost))) {
        margin$ = revenue - Number(d.cost);
      } else {
        excluded_reasons.push({ deal_id: d?.deal_id, salesperson: rep, reason: "no cost or margin — margin% indeterminate" });
        continue;
      }
      const marginPct = (margin$ / revenue) * 100;
      const rate = rateForMargin(marginPct, tiers);
      const commission = revenue * (rate / 100);

      const a = acc.get(rep) ?? { revenue: 0, margin$: 0, commission: 0, deals: 0 };
      a.revenue += revenue;
      a.margin$ += margin$;
      a.commission += commission;
      a.deals += 1;
      acc.set(rep, a);

      total_commission += commission;
      total_revenue += revenue;
    }

    const entries: CommissionEntry[] = [...acc.entries()].map(([salesperson, a]) => ({
      salesperson,
      revenue: round2(a.revenue),
      margin_pct: a.revenue > 0 ? round1((a.margin$ / a.revenue) * 100) : 0,
      commission_rate_pct: a.revenue > 0 ? round2((a.commission / a.revenue) * 100) : 0,
      commission_amount: round2(a.commission),
      deals_closed: a.deals,
    })).sort((x, y) => y.commission_amount - x.commission_amount || x.salesperson.localeCompare(y.salesperson));

    // Reconciliation invariant (hotel-soul): the rounded per-rep totals must equal the
    // rounded grand totals to the cent. If rounding of many small commissions drifts the
    // sum, surface it (reconciled:false) rather than silently shipping an off-books number.
    const sumEntryCommission = round2(entries.reduce((s, e) => s + e.commission_amount, 0));
    const sumEntryRevenue = round2(entries.reduce((s, e) => s + e.revenue, 0));
    const reconciled = sumEntryCommission === round2(total_commission) && sumEntryRevenue === round2(total_revenue);

    return {
      entries,
      total_revenue: round2(total_revenue),
      total_commission: round2(total_commission),
      deals_total: list.length,
      deals_excluded: excluded_reasons.length,
      excluded_reasons,
      reconciled,
      tiers: [...tiers],
    };
  }
}

export const commissionReportEngine = new CommissionReportEngine();
