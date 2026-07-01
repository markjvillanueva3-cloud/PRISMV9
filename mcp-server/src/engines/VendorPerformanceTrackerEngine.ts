/**
 * VendorPerformanceTrackerEngine — ISO 9001:2015 §8.4 external-provider evaluation.
 *
 * §8.4.1 requires the org to evaluate, select, monitor, and re-evaluate external
 * providers based on their ability to provide processes/products/services per
 * requirements.
 *
 * Composite scorecard (0..1):
 *   0.40 · on_time_delivery   — % of POs received on/before due
 *   0.30 · quality_acceptance — 1 − (NCR-rate per shipment)
 *   0.15 · responsiveness     — avg quote turnaround (lower = better)
 *   0.15 · price_competitiveness — relative to historical norm
 *
 * Tier classification: ≥0.85 preferred · 0.70-0.85 approved · 0.55-0.70 probation
 * · <0.55 disqualified (must re-evaluate).
 *
 * Hotel-soul: PII-free (vendor_id only — vendor entity, not human PII),
 * Object.frozen, R12 fail-loud, financial-invariant gate (no silent NCR drop).
 *
 * @module VendorPerformanceTrackerEngine
 * @milestone HOTEL/U-VENDOR-PERFORMANCE-TRACKER (2026-05-25, slot:hotel iter29 /yolo)
 */

export type VendorTier = "preferred" | "approved" | "probation" | "disqualified";

export interface PurchaseOrderRecord {
  po_id: string;
  vendor_id: string;
  promised_date: string;
  received_date: string | null;
  amount_cents: number;
  ncr_count: number;            // NCRs raised against this PO
  quote_turnaround_hours: number;
  recorded_at: string;
}

export interface VendorScorecard {
  vendor_id: string;
  evaluation_window_days: number;
  po_count: number;
  on_time_delivery: number;        // 0..1
  quality_acceptance: number;      // 0..1
  responsiveness: number;          // 0..1 (1=fastest)
  price_competitiveness: number;   // 0..1 (1=best vs historical)
  composite_score: number;         // 0..1 weighted
  tier: VendorTier;
  rationale: ReadonlyArray<string>;
  computed_at: string;
}

const PRICE_BENCHMARK_CENTS_PER_PO = 50_000; // illustrative shop-norm avg PO size
const QUOTE_TURNAROUND_NORM_HOURS = 24;       // 1-day norm
const NCR_TOLERANCE_PER_PO = 0.10;            // <10% NCR rate = acceptable

class VendorPerformanceTrackerEngine {
  private pos: Map<string, PurchaseOrderRecord> = new Map();

  recordPO(args: {
    po_id: string;
    vendor_id: string;
    promised_date: string;
    received_date: string | null;
    amount_cents: number;
    ncr_count?: number;
    quote_turnaround_hours: number;
  }): PurchaseOrderRecord {
    if (!args.po_id || !args.vendor_id) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: po_id + vendor_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.promised_date)) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: promised_date must be ISO YYYY-MM-DD");
    }
    if (args.received_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(args.received_date)) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: received_date must be ISO or null");
    }
    if (!Number.isFinite(args.amount_cents) || args.amount_cents < 0) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: amount_cents must be non-negative finite");
    }
    if (!Number.isFinite(args.quote_turnaround_hours) || args.quote_turnaround_hours < 0) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: quote_turnaround_hours must be non-negative finite");
    }
    const ncrCount = args.ncr_count ?? 0;
    if (!Number.isInteger(ncrCount) || ncrCount < 0) {
      throw new Error("VendorPerformanceTrackerEngine.recordPO: ncr_count must be non-negative integer");
    }
    const rec: PurchaseOrderRecord = Object.freeze({
      po_id: args.po_id,
      vendor_id: args.vendor_id,
      promised_date: args.promised_date,
      received_date: args.received_date,
      amount_cents: args.amount_cents,
      ncr_count: ncrCount,
      quote_turnaround_hours: args.quote_turnaround_hours,
      recorded_at: new Date().toISOString(),
    });
    this.pos.set(args.po_id, rec);
    return rec;
  }

  /**
   * Compute scorecard over a rolling window. R12: needs ≥3 POs for a stable signal.
   */
  computeScorecard(args: { vendor_id: string; window_days?: number; as_of?: string }): VendorScorecard {
    if (!args.vendor_id) {
      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: vendor_id required");
    }
    const windowDays = args.window_days ?? 180;
    if (!Number.isInteger(windowDays) || windowDays < 7 || windowDays > 1095) {
      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: window_days must be 7..1095");
    }
    const asOf = args.as_of ?? new Date().toISOString().slice(0, 10);
    const asOfMs = Date.parse(asOf);
    if (!Number.isFinite(asOfMs)) {
      throw new Error("VendorPerformanceTrackerEngine.computeScorecard: as_of must be ISO YYYY-MM-DD");
    }
    const cutoffMs = asOfMs - windowDays * 86_400_000;

    const inWindow: PurchaseOrderRecord[] = [];
    for (const po of this.pos.values()) {
      if (po.vendor_id !== args.vendor_id) continue;
      if (Date.parse(po.promised_date) < cutoffMs) continue;
      inWindow.push(po);
    }
    if (inWindow.length < 3) {
      throw new Error(
        `VendorPerformanceTrackerEngine.computeScorecard: vendor ${args.vendor_id} has ${inWindow.length} POs in window (need ≥3 for stable signal)`,
      );
    }

    // On-time delivery
    let onTime = 0, received = 0;
    for (const po of inWindow) {
      if (po.received_date) {
        received++;
        if (po.received_date <= po.promised_date) onTime++;
      }
    }
    const otd = received === 0 ? 0 : onTime / received;

    // Quality acceptance — 1 − (ncrRate / tolerance), clamped [0,1]
    const totalNcrs = inWindow.reduce((s, po) => s + po.ncr_count, 0);
    const ncrRate = totalNcrs / inWindow.length;
    const qual = Math.max(0, Math.min(1, 1 - (ncrRate / NCR_TOLERANCE_PER_PO)));

    // Responsiveness — exp-like decay; ≤norm → 1, ≥3×norm → ~0
    const avgTurn = inWindow.reduce((s, po) => s + po.quote_turnaround_hours, 0) / inWindow.length;
    const resp = Math.max(0, Math.min(1, QUOTE_TURNAROUND_NORM_HOURS / Math.max(QUOTE_TURNAROUND_NORM_HOURS, avgTurn)));

    // Price competitiveness — closer to or below benchmark = better
    const avgAmt = inWindow.reduce((s, po) => s + po.amount_cents, 0) / inWindow.length;
    const price = Math.max(0, Math.min(1, PRICE_BENCHMARK_CENTS_PER_PO / Math.max(PRICE_BENCHMARK_CENTS_PER_PO, avgAmt)));

    const composite = 0.40 * otd + 0.30 * qual + 0.15 * resp + 0.15 * price;

    let tier: VendorTier;
    if (composite >= 0.85) tier = "preferred";
    else if (composite >= 0.70) tier = "approved";
    else if (composite >= 0.55) tier = "probation";
    else tier = "disqualified";

    const rationale: string[] = [];
    rationale.push(`Window ${windowDays}d, ${inWindow.length} POs`);
    rationale.push(`OTD ${(otd * 100).toFixed(0)}% · Qual ${(qual * 100).toFixed(0)}% · Resp ${(resp * 100).toFixed(0)}% · Price ${(price * 100).toFixed(0)}%`);
    if (tier === "disqualified") {
      rationale.push("⚠ Below 55% threshold — re-evaluate per §8.4.1");
    }
    if (tier === "probation") {
      rationale.push("Probation — re-score in 90 days");
    }

    return Object.freeze({
      vendor_id: args.vendor_id,
      evaluation_window_days: windowDays,
      po_count: inWindow.length,
      on_time_delivery: Number(otd.toFixed(4)),
      quality_acceptance: Number(qual.toFixed(4)),
      responsiveness: Number(resp.toFixed(4)),
      price_competitiveness: Number(price.toFixed(4)),
      composite_score: Number(composite.toFixed(4)),
      tier,
      rationale: Object.freeze(rationale),
      computed_at: new Date().toISOString(),
    });
  }

  listAllVendors(): ReadonlyArray<string> {
    const set = new Set<string>();
    for (const po of this.pos.values()) set.add(po.vendor_id);
    return Object.freeze([...set].sort());
  }

  rankVendors(args: { window_days?: number; as_of?: string }): ReadonlyArray<{ vendor_id: string; composite_score: number; tier: VendorTier }> {
    const vendors = this.listAllVendors();
    const out: { vendor_id: string; composite_score: number; tier: VendorTier }[] = [];
    for (const v of vendors) {
      try {
        const s = this.computeScorecard({ vendor_id: v, ...args });
        out.push({ vendor_id: v, composite_score: s.composite_score, tier: s.tier });
      } catch {
        // skip vendors without enough POs in window
      }
    }
    out.sort((a, b) => b.composite_score - a.composite_score);
    return Object.freeze(out.map((x) => Object.freeze(x)));
  }

  /**
   * FE-ready vendor scorecard list -- the projection the VendorScorecardPage renders.
   *
   * Composes computeScorecard() over every vendor (skipping any with <3 POs in window, like
   * rankVendors), and maps the engine's 0..1 metrics to the page's 0..100 scale + the page's field
   * names (quality_score / delivery_score / price_score / on_time_pct), adding ncr_count and
   * avg_lead_days derived from the in-window POs. This is the adapter that turns the raw engine
   * shape into the rich Vendor[] the page reads as `.data` -- without it the page (which only calls
   * vendor_list_all -> string[]) renders an empty/NaN table.
   *
   * @param args optional window_days (7..1095, default 180) + as_of (ISO YYYY-MM-DD)
   * @returns array of FE Vendor rows, sorted by composite_score desc
   */
  listScorecards(args: { window_days?: number; as_of?: string } = {}): ReadonlyArray<{
    vendor_id: string; name: string; quality_score: number; delivery_score: number;
    price_score: number; composite_score: number; total_orders: number; ncr_count: number;
    on_time_pct: number; avg_lead_days: number; tier: VendorTier;
  }> {
    const windowDays = args.window_days ?? 180;
    const asOf = args.as_of ?? new Date().toISOString().slice(0, 10);
    // cutoffMs is ONLY consumed in the per-vendor ncr/lead derivation below, which runs only AFTER
    // computeScorecard({as_of}) succeeds -- and that call throws on a non-finite as_of (its own guard).
    // So by the time we use cutoffMs, asOf is guaranteed parseable (matches computeScorecard's window exactly).
    const cutoffMs = Date.parse(asOf) - windowDays * 86_400_000;
    const out: Array<{
      vendor_id: string; name: string; quality_score: number; delivery_score: number;
      price_score: number; composite_score: number; total_orders: number; ncr_count: number;
      on_time_pct: number; avg_lead_days: number; tier: VendorTier;
    }> = [];
    for (const v of this.listAllVendors()) {
      let s: VendorScorecard;
      try {
        s = this.computeScorecard({ vendor_id: v, window_days: windowDays, as_of: asOf });
      } catch {
        continue; // <3 POs in window -> no stable signal (matches rankVendors)
      }
      // Derive ncr_count + avg_lead_days from the same in-window PO set computeScorecard used.
      let totalNcrs = 0, leadDaySum = 0, leadCount = 0;
      for (const po of this.pos.values()) {
        if (po.vendor_id !== v) continue;
        if (Date.parse(po.promised_date) < cutoffMs) continue;
        totalNcrs += po.ncr_count;
        if (po.received_date) {
          // SIGNED schedule variance: received - promised. Negative = delivered EARLY, positive = LATE.
          // Averaged signed (a consistently-early vendor shows a negative avg_lead_days = ahead of schedule),
          // which is the actionable business signal, NOT absolute lateness.
          const days = (Date.parse(po.received_date) - Date.parse(po.promised_date)) / 86_400_000;
          if (Number.isFinite(days)) { leadDaySum += days; leadCount++; }
        }
      }
      const pct = (x: number): number => Math.round(x * 100);
      out.push({
        vendor_id: v,
        name: v, // PO records carry no separate vendor display name; vendor_id IS the identifier shown
        quality_score: pct(s.quality_acceptance),
        delivery_score: pct(s.on_time_delivery),
        price_score: pct(s.price_competitiveness),
        composite_score: pct(s.composite_score),
        total_orders: s.po_count,
        ncr_count: totalNcrs,
        on_time_pct: pct(s.on_time_delivery),
        avg_lead_days: leadCount === 0 ? 0 : Number((leadDaySum / leadCount).toFixed(1)),
        tier: s.tier,
      });
    }
    out.sort((a, b) => b.composite_score - a.composite_score);
    return Object.freeze(out.map((x) => Object.freeze(x)));
  }

  reset(): void {
    this.pos.clear();
  }
}

export const vendorPerformanceTrackerEngine = new VendorPerformanceTrackerEngine();
