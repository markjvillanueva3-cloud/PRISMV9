import { persistenceBridge } from "../db/PersistenceBridge.js";

/**
 * CustomerManagementEngine — CRM for job shops. Customer records, credit limits,
 * pricing tiers, communication log, win/loss tracking, sales pipeline.
 */

export interface Customer {
  id: string;
  name: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  address: { street: string; city: string; state: string; zip: string };
  credit_limit: number;
  current_balance: number;
  payment_terms: string;
  pricing_tier: 'standard' | 'preferred' | 'contract' | 'wholesale';
  discount_pct: number;
  tax_exempt: boolean;
  tax_id?: string;
  status: 'active' | 'inactive' | 'on_hold' | 'prospect';
  created_at: string;
  notes?: string;
  tags: string[];
}

export interface CommunicationLog {
  id: string;
  customer_id: string;
  date: string;
  type: 'email' | 'phone' | 'meeting' | 'site_visit' | 'rfq' | 'complaint' | 'note';
  subject: string;
  details: string;
  logged_by: string;
  follow_up_date?: string;
  follow_up_done?: boolean;
}

export interface SalesOpportunity {
  id: string;
  customer_id: string;
  description: string;
  estimated_value: number;
  stage: 'prospect' | 'rfq_received' | 'quoted' | 'negotiating' | 'won' | 'lost';
  probability_pct: number;
  created_at: string;
  close_date?: string;
  lost_reason?: string;
  quote_id?: string;
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  total_jobs: number;
  avg_job_value: number;
  on_time_delivery_pct: number;
  avg_margin_pct: number;
  quote_win_rate: number;
  last_order_date: string;
  lifetime_months: number;
}

export interface RevenueConcentration {
  total_customers: number;
  revenue_customers: number;
  total_revenue: number;
  hhi_index: number;
  hhi_classification: 'unconcentrated' | 'moderate' | 'high';
  top1_share_pct: number;
  top3_share_pct: number;
  top5_share_pct: number;
  pareto_count: number;
  pareto_pct: number;
  concentration_risk: 'low' | 'moderate' | 'high' | 'critical';
  top_customers: { customer_id: string; customer_name: string; revenue: number; share_pct: number }[];
  recommendation: string;
}

export interface CustomerTrend {
  customer_id: string;
  customer_name: string;
  total_revenue: number;
  recent_revenue: number;
  prior_revenue: number;
  change_pct: number;
  trend: 'growing' | 'stable' | 'declining' | 'new' | 'dormant';
  days_since_last_order: number;
  churn_risk: 'low' | 'moderate' | 'high';
}

export interface CustomerTrendsReport {
  window_days: number;
  total_customers: number;
  active_customers: number;
  growing: number;
  stable: number;
  declining: number;
  dormant: number;
  new_customers: number;
  at_churn_risk: number;
  trends: CustomerTrend[];
  recommendation: string;
}

export interface CustomerNormalizationChange {
  customer_id: string;
  field: string;
  from: string;
  to: string;
}

export interface CustomerDuplicateCluster {
  normalized_key: string;
  customer_ids: string[];
  customer_names: string[];
}

export interface CustomerNormalizationReport {
  total_customers: number;
  customers_with_changes: number;
  total_changes: number;
  changes: CustomerNormalizationChange[];
  duplicate_clusters: CustomerDuplicateCluster[];
  applied: boolean;
  recommendation: string;
}

/**
 * One record from the JM Die full-corpus ingest (state/shared/databases/jm-customers.jsonl,
 * emitted by scripts/jm-die-full-corpus-ingest.mjs — 473 real JM Die customer folders).
 * File-inventory derived: names + activity counts, no contact/financial fields.
 */
export interface JMCorpusCustomerRecord {
  customer_key: string;
  aliases?: string[];
  files_total?: number;
  files_by_bucket?: { program?: number; cad?: number; print?: number; scan?: number; setup?: number; doc?: number; other?: number };
  materials_seen?: string[];
  machine_classes_seen?: string[];
  source_folders?: string[];
  has_docustrata_record?: boolean;
}

export interface JMCorpusSeedResult {
  total_records: number;
  seeded: number;
  skipped_existing: number;
  skipped_invalid: number;
  active: number;
  prospect: number;
  customer_ids: string[];
}

/** Collapse a customer name to a dedup key (case + punctuation/space insensitive). */
function normalizeCustomerKey(name: string): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

class CustomerManagementEngine {
  private customers: Map<string, Customer> = new Map();
  private commLogs: CommunicationLog[] = [];
  private opportunities: SalesOpportunity[] = [];
  private jobHistory: Map<string, { revenue: number; margin: number; on_time: boolean; date: string }[]> = new Map();
  private nextId = 1;

  createCustomer(params: Omit<Customer, 'id' | 'current_balance' | 'created_at' | 'status'> & { status?: Customer['status'] }): Customer {
    const id = `CUST-${String(this.nextId++).padStart(4, '0')}`;
    const customer: Customer = {
      ...params,
      id,
      current_balance: 0,
      status: params.status ?? 'active',
      created_at: new Date().toISOString(),
    };
    this.customers.set(id, customer);
    persistenceBridge.persist("customers", id, customer as any);
    return customer;
  }

  getCustomer(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Customer {
    const cust = this.customers.get(id);
    if (!cust) throw new Error(`Customer ${id} not found`);
    Object.assign(cust, updates);
    persistenceBridge.persist("customers", id, cust as any);
    return cust;
  }

  searchCustomers(query: string): Customer[] {
    const q = query.toLowerCase();
    return [...this.customers.values()].filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.contact_name.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  listCustomers(filter?: { status?: string; tier?: string }): Customer[] {
    let result = [...this.customers.values()];
    if (filter?.status) result = result.filter((c) => c.status === filter.status);
    if (filter?.tier) result = result.filter((c) => c.pricing_tier === filter.tier);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Bulk-seed the CRM from the JM Die full-corpus customer roster (473 real customer
   * folders, scripts/jm-die-full-corpus-ingest.mjs → jm-customers.jsonl). Idempotent:
   * a record whose name already maps to an existing customer (normalized) is skipped,
   * so re-running never duplicates. File-inventory records carry no contact/financial
   * data, so those fields seed to safe defaults (Net 30, standard tier, $0 credit) for
   * the operator to enrich later. Status is `active` when the customer has machining
   * files (programs/CAD/prints/setups), else `prospect` (scans/docs only). Fail-soft:
   * non-array input and records with no usable name are skipped, never thrown.
   */
  seedFromJMCorpus(records: JMCorpusCustomerRecord[]): JMCorpusSeedResult {
    const result: JMCorpusSeedResult = {
      total_records: Array.isArray(records) ? records.length : 0,
      seeded: 0, skipped_existing: 0, skipped_invalid: 0, active: 0, prospect: 0, customer_ids: [],
    };
    if (!Array.isArray(records)) return result;
    const existing = new Set([...this.customers.values()].map((c) => normalizeCustomerKey(c.name)));
    for (const rec of records) {
      const key = (rec?.customer_key ?? "").trim();
      const nk = normalizeCustomerKey(key);
      if (!nk) { result.skipped_invalid++; continue; }
      if (existing.has(nk)) { result.skipped_existing++; continue; }
      const b = rec.files_by_bucket ?? {};
      const filesTotal = Number.isFinite(rec.files_total) ? (rec.files_total as number) : 0;
      const machiningFiles = (b.program ?? 0) + (b.cad ?? 0) + (b.print ?? 0) + (b.setup ?? 0);
      // Active if they have machining files (programs/CAD/prints/setups) OR a DocuStrata
      // transaction record (quote/invoice) — a customer who has transacted is real even if the
      // corpus holds only scans for them. Otherwise prospect (scan/doc-only, never transacted).
      const status: Customer["status"] = (machiningFiles > 0 || rec.has_docustrata_record === true) ? "active" : "prospect";
      const tags = Array.from(new Set([...(rec.materials_seen ?? []), ...(rec.machine_classes_seen ?? [])]))
        .filter((t) => typeof t === "string" && t.length > 0)
        .slice(0, 12);
      const noteParts = [`JM corpus: ${filesTotal} file${filesTotal === 1 ? "" : "s"}`];
      if (b.program) noteParts.push(`${b.program} programs`);
      if (b.cad) noteParts.push(`${b.cad} CAD`);
      if (b.print) noteParts.push(`${b.print} prints`);
      if (b.scan) noteParts.push(`${b.scan} scans`);
      if (rec.source_folders?.[0]) noteParts.push(`src: ${rec.source_folders[0]}`);
      const cust = this.createCustomer({
        name: key,
        company: key,
        contact_name: "",
        email: "",
        phone: "",
        address: { street: "", city: "", state: "", zip: "" },
        credit_limit: 0,
        payment_terms: "Net 30",
        pricing_tier: "standard",
        discount_pct: 0,
        tax_exempt: false,
        tags,
        notes: noteParts.join(" · "),
        status,
      });
      existing.add(nk);
      result.customer_ids.push(cust.id);
      result.seeded++;
      if (status === "active") result.active++; else result.prospect++;
    }
    return result;
  }

  checkCredit(customer_id: string, order_amount: number): {
    approved: boolean;
    credit_limit: number;
    current_balance: number;
    available_credit: number;
    order_amount: number;
    over_limit_by: number;
  } {
    const cust = this.customers.get(customer_id);
    if (!cust) throw new Error(`Customer ${customer_id} not found`);
    const available = cust.credit_limit - cust.current_balance;
    return {
      approved: order_amount <= available,
      credit_limit: cust.credit_limit,
      current_balance: cust.current_balance,
      available_credit: available,
      order_amount,
      over_limit_by: Math.max(order_amount - available, 0),
    };
  }

  // --- Communication Log ---
  logCommunication(params: Omit<CommunicationLog, 'id'>): CommunicationLog {
    const log: CommunicationLog = { ...params, id: `COMM-${Date.now()}` };
    this.commLogs.push(log);
    persistenceBridge.persistAppend("customer_communications", log as any);
    return log;
  }

  getCommHistory(customer_id: string, limit?: number): CommunicationLog[] {
    const logs = this.commLogs
      .filter((l) => l.customer_id === customer_id)
      .sort((a, b) => b.date.localeCompare(a.date));
    return limit ? logs.slice(0, limit) : logs;
  }

  getPendingFollowUps(): CommunicationLog[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.commLogs.filter((l) =>
      l.follow_up_date && l.follow_up_date <= today && !l.follow_up_done
    );
  }

  // --- Sales Pipeline ---
  createOpportunity(params: Omit<SalesOpportunity, 'id' | 'created_at'>): SalesOpportunity {
    const opp: SalesOpportunity = { ...params, id: `OPP-${Date.now()}`, created_at: new Date().toISOString() };
    this.opportunities.push(opp);
    persistenceBridge.persistAppend("sales_opportunities", opp as any);
    return opp;
  }

  updateOpportunity(id: string, updates: Partial<Pick<SalesOpportunity, 'stage' | 'probability_pct' | 'close_date' | 'lost_reason'>>): SalesOpportunity {
    const opp = this.opportunities.find((o) => o.id === id);
    if (!opp) throw new Error(`Opportunity ${id} not found`);
    Object.assign(opp, updates);
    persistenceBridge.persist("sales_opportunities", id, opp as any);
    return opp;
  }

  salesPipeline(): {
    stages: { stage: string; count: number; value: number; weighted_value: number }[];
    total_pipeline: number;
    weighted_pipeline: number;
    win_rate: number;
    avg_deal_size: number;
  } {
    const stageMap = new Map<string, { count: number; value: number; weighted: number }>();
    for (const opp of this.opportunities) {
      const existing = stageMap.get(opp.stage) ?? { count: 0, value: 0, weighted: 0 };
      existing.count++;
      existing.value += opp.estimated_value;
      existing.weighted += opp.estimated_value * (opp.probability_pct / 100);
      stageMap.set(opp.stage, existing);
    }

    const stages = [...stageMap.entries()].map(([stage, data]) => ({
      stage, count: data.count, value: data.value, weighted_value: Math.round(data.weighted),
    }));

    const total = this.opportunities.reduce((s, o) => s + o.estimated_value, 0);
    const weighted = this.opportunities.reduce((s, o) => s + o.estimated_value * (o.probability_pct / 100), 0);
    const won = this.opportunities.filter((o) => o.stage === 'won').length;
    const closed = this.opportunities.filter((o) => o.stage === 'won' || o.stage === 'lost').length;

    return {
      stages,
      total_pipeline: total,
      weighted_pipeline: Math.round(weighted),
      win_rate: closed > 0 ? Math.round((won / closed) * 100) : 0,
      avg_deal_size: this.opportunities.length > 0 ? Math.round(total / this.opportunities.length) : 0,
    };
  }

  // --- Analytics ---
  recordJobForCustomer(customer_id: string, revenue: number, margin: number, on_time: boolean, date?: string): void {
    const history = this.jobHistory.get(customer_id) ?? [];
    history.push({ revenue, margin, on_time, date: date ?? new Date().toISOString().slice(0, 10) });
    this.jobHistory.set(customer_id, history);

    const cust = this.customers.get(customer_id);
    if (cust) {
      cust.current_balance += revenue;
      persistenceBridge.persist("customers", customer_id, cust as any);
    }
  }

  customerAnalytics(customer_id: string): CustomerAnalytics {
    const cust = this.customers.get(customer_id);
    if (!cust) throw new Error(`Customer ${customer_id} not found`);
    const jobs = this.jobHistory.get(customer_id) ?? [];
    const totalRevenue = jobs.reduce((s, j) => s + j.revenue, 0);
    const onTime = jobs.filter((j) => j.on_time).length;

    const quotes = this.opportunities.filter((o) => o.customer_id === customer_id);
    const won = quotes.filter((o) => o.stage === 'won').length;
    const closed = quotes.filter((o) => o.stage === 'won' || o.stage === 'lost').length;

    const created = new Date(cust.created_at);
    const months = Math.max(1, Math.floor((Date.now() - created.getTime()) / (30 * 86400000)));

    return {
      customer_id,
      customer_name: cust.name,
      total_revenue: totalRevenue,
      total_jobs: jobs.length,
      avg_job_value: jobs.length > 0 ? Math.round(totalRevenue / jobs.length) : 0,
      on_time_delivery_pct: jobs.length > 0 ? Math.round((onTime / jobs.length) * 100) : 100,
      avg_margin_pct: jobs.length > 0 ? Math.round(jobs.reduce((s, j) => s + j.margin, 0) / jobs.length * 10) / 10 : 0,
      quote_win_rate: closed > 0 ? Math.round((won / closed) * 100) : 0,
      last_order_date: jobs.length > 0 ? jobs[jobs.length - 1].date : 'none',
      lifetime_months: months,
    };
  }

  topCustomers(limit: number = 10): CustomerAnalytics[] {
    const analytics = [...this.customers.keys()].map((id) => this.customerAnalytics(id));
    return analytics.sort((a, b) => b.total_revenue - a.total_revenue).slice(0, limit);
  }

  /**
   * Portfolio-level customer revenue concentration. Computes the
   * Herfindahl-Hirschman Index (HHI), top-N revenue share, the Pareto count
   * (customers producing >=80% of revenue), and a concentration-risk grade.
   *
   * HHI is the sum of squared market-share percentages (0-10000). DOJ/FTC
   * Horizontal Merger Guidelines thresholds: <1500 unconcentrated,
   * 1500-2500 moderately concentrated, >2500 highly concentrated.
   *
   * The top-1-share risk bands (>=50% critical, >=35% high, >=20% moderate)
   * are a shop-floor heuristic, not a regulatory standard.
   *
   * @returns RevenueConcentration portfolio-risk report
   */
  revenueConcentration(): RevenueConcentration {
    const totals: { customer_id: string; customer_name: string; revenue: number }[] = [];
    for (const [id, cust] of this.customers) {
      const jobs = this.jobHistory.get(id) ?? [];
      const revenue = jobs.reduce((s, j) => s + j.revenue, 0);
      totals.push({ customer_id: id, customer_name: cust.name, revenue });
    }
    totals.sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = totals.reduce((s, t) => s + t.revenue, 0);
    const revenueCustomers = totals.filter((t) => t.revenue > 0).length;

    if (totalRevenue <= 0) {
      return {
        total_customers: this.customers.size,
        revenue_customers: 0,
        total_revenue: 0,
        hhi_index: 0,
        hhi_classification: 'unconcentrated',
        top1_share_pct: 0,
        top3_share_pct: 0,
        top5_share_pct: 0,
        pareto_count: 0,
        pareto_pct: 0,
        concentration_risk: 'low',
        top_customers: [],
        recommendation:
          'No customer revenue recorded — record jobs via recordJobForCustomer to enable concentration analysis.',
      };
    }

    // HHI uses precise (unrounded) share so squared terms stay accurate.
    const hhi = Math.round(
      totals.reduce((s, t) => {
        const share = (t.revenue / totalRevenue) * 100;
        return s + share * share;
      }, 0),
    );
    const hhiClass: RevenueConcentration['hhi_classification'] =
      hhi > 2500 ? 'high' : hhi >= 1500 ? 'moderate' : 'unconcentrated';

    const shareOfTopN = (n: number): number =>
      Math.round((totals.slice(0, n).reduce((s, t) => s + t.revenue, 0) / totalRevenue) * 1000) / 10;

    // Pareto: smallest customer count producing >=80% of total revenue.
    let cum = 0;
    let paretoCount = 0;
    for (const t of totals) {
      if (t.revenue <= 0) break;
      cum += t.revenue;
      paretoCount++;
      if (cum / totalRevenue >= 0.8) break;
    }

    const top1 = shareOfTopN(1);
    const risk: RevenueConcentration['concentration_risk'] =
      top1 >= 50 ? 'critical'
      : top1 >= 35 || hhi > 2500 ? 'high'
      : top1 >= 20 || hhi >= 1500 ? 'moderate'
      : 'low';

    const recommendation =
      risk === 'critical'
        ? `Single-customer dependency: top customer is ${top1}% of revenue. Diversify the customer base to reduce existential risk.`
        : risk === 'high'
          ? `High concentration (HHI ${hhi}, top customer ${top1}%). Prioritize new-customer acquisition and protect key accounts.`
          : risk === 'moderate'
            ? `Moderate concentration (HHI ${hhi}). Monitor top-account retention — healthy but watch for drift.`
            : `Well-diversified customer base (HHI ${hhi}). Low concentration risk.`;

    return {
      total_customers: this.customers.size,
      revenue_customers: revenueCustomers,
      total_revenue: Math.round(totalRevenue),
      hhi_index: hhi,
      hhi_classification: hhiClass,
      top1_share_pct: top1,
      top3_share_pct: shareOfTopN(3),
      top5_share_pct: shareOfTopN(5),
      pareto_count: paretoCount,
      pareto_pct:
        revenueCustomers > 0 ? Math.round((paretoCount / revenueCustomers) * 1000) / 10 : 0,
      concentration_risk: risk,
      top_customers: totals.slice(0, 10).map((t) => ({
        customer_id: t.customer_id,
        customer_name: t.customer_name,
        revenue: Math.round(t.revenue),
        share_pct: Math.round((t.revenue / totalRevenue) * 1000) / 10,
      })),
      recommendation,
    };
  }

  /**
   * Per-customer revenue growth/decline trend analysis. For each customer
   * with job history, compares revenue in the most recent window against the
   * immediately prior window of equal length and classifies the trajectory.
   *
   * trend: 'new'       — first order falls inside the recent window, none prior
   *        'dormant'   — last order is older than 2x the window
   *        'growing'   — recent revenue is >15% above the prior window
   *        'declining' — recent revenue is >15% below the prior window
   *        'stable'    — within +/-15% of the prior window
   *
   * The +/-15% growth band and the 2x-window dormancy cutoff are shop-floor
   * heuristics, not regulatory standards.
   *
   * @param windowDays comparison window length in days (default 90 — one quarter)
   * @returns CustomerTrendsReport portfolio trend summary + per-customer trends
   */
  customerTrends(windowDays: number = 90): CustomerTrendsReport {
    const win = windowDays > 0 ? windowDays : 90;
    const now = Date.now();
    const dayMs = 86_400_000;
    const recentStart = now - win * dayMs;
    const priorStart = now - 2 * win * dayMs;
    const GROWTH_BAND = 0.15;

    const trends: CustomerTrend[] = [];
    for (const [id, cust] of this.customers) {
      const jobs = this.jobHistory.get(id) ?? [];
      if (jobs.length === 0) continue;

      let recent = 0;
      let prior = 0;
      let total = 0;
      let lastTs = 0;
      let firstTs = Infinity;
      for (const j of jobs) {
        const ts = new Date(j.date).getTime();
        if (Number.isNaN(ts)) continue;
        total += j.revenue;
        if (ts > lastTs) lastTs = ts;
        if (ts < firstTs) firstTs = ts;
        if (ts >= recentStart) recent += j.revenue;
        else if (ts >= priorStart) prior += j.revenue;
      }
      if (lastTs === 0) continue; // every job date was unparseable

      const daysSinceLast = Math.max(0, Math.round((now - lastTs) / dayMs));
      const changePct =
        prior > 0
          ? Math.round(((recent - prior) / prior) * 1000) / 10
          : recent > 0 ? 100 : 0;

      let trend: CustomerTrend['trend'];
      if (daysSinceLast > 2 * win) {
        trend = 'dormant';
      } else if (firstTs >= recentStart && prior === 0) {
        trend = 'new';
      } else if (prior === 0 && recent > 0) {
        trend = 'growing'; // reactivated after a quiet prior window
      } else if (recent >= prior * (1 + GROWTH_BAND)) {
        trend = 'growing';
      } else if (recent <= prior * (1 - GROWTH_BAND)) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }

      let churn: CustomerTrend['churn_risk'];
      if (trend === 'dormant' || (trend === 'declining' && daysSinceLast > win)) {
        churn = 'high';
      } else if (trend === 'declining' || daysSinceLast > win) {
        churn = 'moderate';
      } else {
        churn = 'low';
      }

      trends.push({
        customer_id: id,
        customer_name: cust.name,
        total_revenue: Math.round(total),
        recent_revenue: Math.round(recent),
        prior_revenue: Math.round(prior),
        change_pct: changePct,
        trend,
        days_since_last_order: daysSinceLast,
        churn_risk: churn,
      });
    }

    trends.sort((a, b) => b.total_revenue - a.total_revenue);

    const count = (t: CustomerTrend['trend']): number =>
      trends.filter((x) => x.trend === t).length;
    const growing = count('growing');
    const declining = count('declining');
    const dormant = count('dormant');
    const atChurnRisk = trends.filter((x) => x.churn_risk === 'high').length;

    const recommendation =
      trends.length === 0
        ? 'No customer job history recorded — record jobs via recordJobForCustomer to enable trend analysis.'
        : declining + dormant > growing
          ? `Net customer erosion: ${declining} declining + ${dormant} dormant vs ${growing} growing. ${atChurnRisk} at high churn risk — prioritize win-back outreach.`
          : `Healthy trajectory: ${growing} growing vs ${declining + dormant} declining/dormant. Monitor the ${atChurnRisk} high-churn-risk account(s).`;

    return {
      window_days: win,
      total_customers: this.customers.size,
      active_customers: trends.length,
      growing,
      stable: count('stable'),
      declining,
      dormant,
      new_customers: count('new'),
      at_churn_risk: atChurnRisk,
      trends,
      recommendation,
    };
  }

  /**
   * Normalize customer records — collapses whitespace in name/company/contact,
   * lowercases email, canonicalizes phone to (NNN) NNN-NNNN where 10/11 digits
   * are present, uppercases the state code, trims zip. Also detects suspected
   * duplicate customers by a normalized name key (lowercased, alphanumerics
   * only).
   *
   * Dry-run by default (apply=false) — returns the proposed changes without
   * mutating any record. Pass apply=true to persist the field normalizations.
   * Duplicate clusters are always report-only — merging customers is a manual
   * decision (it would orphan job history and opportunities).
   *
   * @param apply when true, persist the field normalizations
   * @returns CustomerNormalizationReport
   */
  normalizeCustomers(apply: boolean = false): CustomerNormalizationReport {
    const changes: CustomerNormalizationChange[] = [];
    const keyGroups = new Map<string, { ids: string[]; names: string[] }>();
    const collapse = (s: string): string => s.trim().replace(/\s+/g, ' ');
    // Compute phase only fills this; the apply phase runs afterwards so a
    // malformed record cannot leave the portfolio half-normalized.
    const pendingApply: {
      id: string;
      cust: Customer;
      name: string;
      company: string;
      contact_name: string;
      email: string;
      phone: string;
      address: Customer['address'];
    }[] = [];

    for (const [id, cust] of this.customers) {
      const fieldChanges: CustomerNormalizationChange[] = [];

      const nName = collapse(cust.name);
      if (nName !== cust.name) {
        fieldChanges.push({ customer_id: id, field: 'name', from: cust.name, to: nName });
      }
      const nCompany = collapse(cust.company);
      if (nCompany !== cust.company) {
        fieldChanges.push({ customer_id: id, field: 'company', from: cust.company, to: nCompany });
      }
      const nContact = collapse(cust.contact_name);
      if (nContact !== cust.contact_name) {
        fieldChanges.push({ customer_id: id, field: 'contact_name', from: cust.contact_name, to: nContact });
      }
      const nEmail = cust.email.trim().toLowerCase();
      if (nEmail !== cust.email) {
        fieldChanges.push({ customer_id: id, field: 'email', from: cust.email, to: nEmail });
      }
      const nPhone = this.canonicalPhone(cust.phone);
      if (nPhone !== cust.phone) {
        fieldChanges.push({ customer_id: id, field: 'phone', from: cust.phone, to: nPhone });
      }
      const nState = cust.address.state.trim().toUpperCase();
      if (nState !== cust.address.state) {
        fieldChanges.push({ customer_id: id, field: 'address.state', from: cust.address.state, to: nState });
      }
      const nZip = cust.address.zip.trim();
      if (nZip !== cust.address.zip) {
        fieldChanges.push({ customer_id: id, field: 'address.zip', from: cust.address.zip, to: nZip });
      }

      if (fieldChanges.length > 0) {
        pendingApply.push({
          id,
          cust,
          name: nName,
          company: nCompany,
          contact_name: nContact,
          email: nEmail,
          phone: nPhone,
          address: { ...cust.address, state: nState, zip: nZip },
        });
      }
      changes.push(...fieldChanges);

      // Duplicate detection keys off the normalized name (alphanumerics only).
      const key = nName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key.length > 0) {
        const g = keyGroups.get(key) ?? { ids: [], names: [] };
        g.ids.push(id);
        g.names.push(nName);
        keyGroups.set(key, g);
      }
    }

    // Apply phase — every record was read without error above, so writing
    // here cannot leave the portfolio partially normalized.
    if (apply) {
      for (const p of pendingApply) {
        p.cust.name = p.name;
        p.cust.company = p.company;
        p.cust.contact_name = p.contact_name;
        p.cust.email = p.email;
        p.cust.phone = p.phone;
        p.cust.address = p.address;
        persistenceBridge.persist('customers', p.id, p.cust as any);
      }
    }

    const duplicateClusters: CustomerDuplicateCluster[] = [];
    for (const [key, g] of keyGroups) {
      if (g.ids.length >= 2) {
        duplicateClusters.push({ normalized_key: key, customer_ids: g.ids, customer_names: g.names });
      }
    }

    const customersWithChanges = new Set(changes.map((c) => c.customer_id)).size;
    const recommendation =
      changes.length === 0 && duplicateClusters.length === 0
        ? 'All customer records are already normalized — no action needed.'
        : `${changes.length} field normalization(s) across ${customersWithChanges} customer(s)` +
          (duplicateClusters.length > 0
            ? `; ${duplicateClusters.length} suspected duplicate cluster(s) — review and merge manually.`
            : '.') +
          (apply ? ' Field changes applied.' : ' Dry run — pass apply=true to persist field changes.');

    return {
      total_customers: this.customers.size,
      customers_with_changes: customersWithChanges,
      total_changes: changes.length,
      changes,
      duplicate_clusters: duplicateClusters,
      applied: apply,
      recommendation,
    };
  }

  /** Canonicalize a phone number to (NNN) NNN-NNNN when 10 (or 11 with a
   *  leading country-code 1) digits are present; otherwise trim and return. */
  private canonicalPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (local.length === 10) {
      return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    }
    return raw.trim();
  }
}

export const customerManagementEngine = new CustomerManagementEngine();

// ─── Persistence Bridge Registration ────────────────────────────────────────
persistenceBridge.registerMap({
  entity: "customers",
  getMap: () => (customerManagementEngine as any).customers as Map<string, any>,
  keyField: "id",
});
persistenceBridge.registerArray({
  entity: "customer_communications",
  getArray: () => (customerManagementEngine as any).commLogs as any[],
  setArray: (data: any[]) => { (customerManagementEngine as any).commLogs = data; },
  keyField: "id",
});
persistenceBridge.registerArray({
  entity: "sales_opportunities",
  getArray: () => (customerManagementEngine as any).opportunities as any[],
  setArray: (data: any[]) => { (customerManagementEngine as any).opportunities = data; },
  keyField: "id",
});
