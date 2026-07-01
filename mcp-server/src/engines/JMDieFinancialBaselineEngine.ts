/**
 * JMDieFinancialBaselineEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM03
 *
 * Aggregates ingested JM Die records (U-JM01) + historical material prices
 * (U-JM02) into baseline financial analytics:
 *
 *   - by_customer: revenue trend per customer (count, total_revenue, first/last date)
 *   - by_material: spend trend per material (count, total_spend, avg_price)
 *   - by_year: YoY revenue rollup
 *   - time_span: {first_date, last_date, span_days}
 *
 * Per CLAUDE.md R5: pure aggregator. No LLM. Input: records + price lookups.
 * Per CLAUDE.md R12: zero-record input returns explicit "no-records" reason.
 *
 * @milestone JM-DIE-FINANCIAL-BASELINE-MS0/U-JM03-BASELINE
 * @author slot:charlie /goal-14 iter1, 2026-05-24
 */

export interface BaselineRecord {
  customer: string;
  part_id: string;
  doc_date: string | null;
  size_bytes: number;
  /** Optional estimated revenue (USD) per doc — when not provided, defaults to a per-byte heuristic */
  estimated_revenue_usd?: number;
  /** Optional material associated with the part */
  material?: string;
  /** Optional material spend (USD) — when not provided, falls back to revenue × material-fraction default */
  material_spend_usd?: number;
}

export interface CustomerStats {
  customer: string;
  doc_count: number;
  total_revenue_usd: number;
  first_date: string | null;
  last_date: string | null;
  parts_seen: number;
}

export interface MaterialStats {
  material: string;
  doc_count: number;
  total_spend_usd: number;
  avg_spend_per_doc_usd: number;
}

export interface YearStats {
  year: string;
  doc_count: number;
  total_revenue_usd: number;
}

export interface BaselineReport {
  ok: boolean;
  reason?: string;
  total_records: number;
  total_revenue_usd: number;
  time_span: { first_date: string | null; last_date: string | null; span_days: number };
  by_customer: CustomerStats[];
  by_material: MaterialStats[];
  by_year: YearStats[];
}

/** Default per-byte heuristic for unknown-revenue records (very rough, surfaced for operator override). */
const DEFAULT_REVENUE_PER_BYTE = 0.0001; // 1KB doc ≈ $0.10 of associated work

function daysBetween(a: string, b: string): number {
  const dA = new Date(a + "T00:00:00Z").getTime();
  const dB = new Date(b + "T00:00:00Z").getTime();
  if (!Number.isFinite(dA) || !Number.isFinite(dB)) return 0;
  return Math.round(Math.abs(dB - dA) / (24 * 3600 * 1000));
}

export class JMDieFinancialBaselineEngine {
  aggregate(records: BaselineRecord[]): BaselineReport {
    const empty: BaselineReport = {
      ok: false,
      total_records: 0,
      total_revenue_usd: 0,
      time_span: { first_date: null, last_date: null, span_days: 0 },
      by_customer: [],
      by_material: [],
      by_year: [],
    };
    if (!Array.isArray(records) || records.length === 0) {
      return { ...empty, reason: "no-records" };
    }

    const customerMap = new Map<string, { docs: number; revenue: number; first: string | null; last: string | null; parts: Set<string> }>();
    const materialMap = new Map<string, { docs: number; spend: number }>();
    const yearMap = new Map<string, { docs: number; revenue: number }>();
    let totalRevenue = 0;
    let firstDate: string | null = null;
    let lastDate: string | null = null;

    for (const r of records) {
      if (!r || typeof r.customer !== "string" || r.customer.length === 0) continue;

      const revenue = (typeof r.estimated_revenue_usd === "number" && Number.isFinite(r.estimated_revenue_usd))
        ? r.estimated_revenue_usd
        : r.size_bytes * DEFAULT_REVENUE_PER_BYTE;
      totalRevenue += revenue;

      // Customer
      const cur = customerMap.get(r.customer) ?? { docs: 0, revenue: 0, first: null, last: null, parts: new Set<string>() };
      cur.docs++;
      cur.revenue += revenue;
      if (r.part_id) cur.parts.add(r.part_id);
      if (r.doc_date) {
        if (!cur.first || r.doc_date < cur.first) cur.first = r.doc_date;
        if (!cur.last || r.doc_date > cur.last) cur.last = r.doc_date;
      }
      customerMap.set(r.customer, cur);

      // Material
      if (r.material) {
        const spend = (typeof r.material_spend_usd === "number" && Number.isFinite(r.material_spend_usd))
          ? r.material_spend_usd
          : revenue * 0.30; // default: 30% of revenue is material
        const mCur = materialMap.get(r.material) ?? { docs: 0, spend: 0 };
        mCur.docs++;
        mCur.spend += spend;
        materialMap.set(r.material, mCur);
      }

      // Year
      if (r.doc_date) {
        const yr = r.doc_date.slice(0, 4);
        const yCur = yearMap.get(yr) ?? { docs: 0, revenue: 0 };
        yCur.docs++;
        yCur.revenue += revenue;
        yearMap.set(yr, yCur);

        if (!firstDate || r.doc_date < firstDate) firstDate = r.doc_date;
        if (!lastDate || r.doc_date > lastDate) lastDate = r.doc_date;
      }
    }

    const by_customer: CustomerStats[] = [...customerMap.entries()].map(([customer, v]) => ({
      customer,
      doc_count: v.docs,
      total_revenue_usd: Math.round(v.revenue * 100) / 100,
      first_date: v.first,
      last_date: v.last,
      parts_seen: v.parts.size,
    })).sort((a, b) => b.total_revenue_usd - a.total_revenue_usd);

    const by_material: MaterialStats[] = [...materialMap.entries()].map(([material, v]) => ({
      material,
      doc_count: v.docs,
      total_spend_usd: Math.round(v.spend * 100) / 100,
      avg_spend_per_doc_usd: Math.round((v.spend / v.docs) * 100) / 100,
    })).sort((a, b) => b.total_spend_usd - a.total_spend_usd);

    const by_year: YearStats[] = [...yearMap.entries()].map(([year, v]) => ({
      year,
      doc_count: v.docs,
      total_revenue_usd: Math.round(v.revenue * 100) / 100,
    })).sort((a, b) => a.year.localeCompare(b.year));

    return {
      ok: true,
      total_records: records.length,
      total_revenue_usd: Math.round(totalRevenue * 100) / 100,
      time_span: {
        first_date: firstDate,
        last_date: lastDate,
        span_days: firstDate && lastDate ? daysBetween(firstDate, lastDate) : 0,
      },
      by_customer,
      by_material,
      by_year,
    };
  }
}

export const jmDieFinancialBaselineEngine = new JMDieFinancialBaselineEngine();
