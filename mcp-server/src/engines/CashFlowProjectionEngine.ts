/**
 * CashFlowProjectionEngine — daily-bucketed cash-flow forecaster.
 *
 * STUB-RESCUE (slot:bravo 2026-05-26, U-STUB-HUNT-02). Original lost to exFAT
 * corruption 2026-04-10; the 32-line replacement summed total in/outflow but
 * ignored horizon_days, did no per-day bucketing, and self-announced as a
 * stub.  Real implementation: daily projection from `today` over horizonDays
 * with running balance + breach detection + burn-rate analytics.
 *
 * Project plumbing: dispatcher action `cash_flow_project` already exists in
 * businessDispatcher.ts (signature unchanged: project(horizonDays, scheduledFlows)).
 *
 * @version 2.0.0 — restored from stub
 */

export type CashFlowDirection = "inflow" | "outflow";

export interface ScheduledFlow {
  date: string;                  // ISO 8601 (date or full timestamp)
  amount: number;                // must be positive; direction comes from `type`
  type: CashFlowDirection;
  label?: string;
}

export interface DayBucket {
  date: string;                  // YYYY-MM-DD
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
  events: ScheduledFlow[];
}

export interface BurnRate {
  averageDailyNet: number;       // signed (negative = burning cash)
  averageDailyOutflow: number;
  averageDailyInflow: number;
  daysUntilZero: number | null;  // null if averageDailyNet >= 0 (never zeroes)
}

export interface ProjectionResult {
  horizonDays: number;
  startDate: string;             // YYYY-MM-DD
  endDate: string;               // YYYY-MM-DD
  openingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  flowCount: number;
  daysWithActivity: number;
  daysInsolvent: number;         // count of days runningBalance < 0
  firstInsolvencyDate: string | null;
  burnRate: BurnRate;
  buckets: DayBucket[];
}

/** Pure: today (UTC) in YYYY-MM-DD form. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Pure: add N days to a YYYY-MM-DD string, return YYYY-MM-DD. */
export function addDays(yyyyMmDd: string, n: number): string {
  const base = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + n);
  return isoDay(base);
}

/** Pure: build a date-keyed map of all flows falling in [start, start+horizon). */
export function bucketize(flows: ScheduledFlow[], startDate: string, horizonDays: number): Map<string, ScheduledFlow[]> {
  const out = new Map<string, ScheduledFlow[]>();
  for (let i = 0; i < horizonDays; i++) out.set(addDays(startDate, i), []);
  for (const f of flows) {
    const day = String(f.date).slice(0, 10);
    if (!out.has(day)) continue;     // outside horizon
    out.get(day)!.push(f);
  }
  return out;
}

export class CashFlowProjectionEngine {
  private readonly _now: () => Date;
  constructor(opts: { now?: () => Date } = {}) {
    this._now = opts.now ?? (() => new Date());
  }

  /** Project cash flow per-day across the horizon. */
  project(horizonDays: number, scheduledFlows: ScheduledFlow[], openingBalance = 0): ProjectionResult {
    if (!Number.isFinite(horizonDays) || horizonDays <= 0) {
      throw new Error(`CashFlowProjectionEngine.project: horizonDays must be a positive number (got ${horizonDays})`);
    }
    if (!Array.isArray(scheduledFlows)) {
      throw new Error("CashFlowProjectionEngine.project: scheduledFlows must be an array");
    }
    if (!Number.isFinite(openingBalance)) {
      throw new Error(`CashFlowProjectionEngine.project: openingBalance must be finite (got ${openingBalance})`);
    }
    // Validate each flow shape — fail loud per R12
    for (const [i, f] of scheduledFlows.entries()) {
      if (!f || typeof f !== "object") throw new Error(`scheduledFlows[${i}] is not an object`);
      if (!f.date) throw new Error(`scheduledFlows[${i}] missing date`);
      if (f.type !== "inflow" && f.type !== "outflow") {
        throw new Error(`scheduledFlows[${i}] invalid type (${f.type}); must be 'inflow' | 'outflow'`);
      }
      if (!Number.isFinite(f.amount) || f.amount < 0) {
        throw new Error(`scheduledFlows[${i}] amount must be non-negative finite (got ${f.amount})`);
      }
    }
    const startDate = isoDay(this._now());
    const endDate = addDays(startDate, horizonDays - 1);
    const buckets = bucketize(scheduledFlows, startDate, horizonDays);

    let running = openingBalance;
    let totalInflow = 0;
    let totalOutflow = 0;
    let daysWithActivity = 0;
    let daysInsolvent = 0;
    let firstInsolvencyDate: string | null = null;
    const dayBuckets: DayBucket[] = [];

    for (let i = 0; i < horizonDays; i++) {
      const date = addDays(startDate, i);
      const events = buckets.get(date) ?? [];
      let inflow = 0;
      let outflow = 0;
      for (const e of events) {
        if (e.type === "inflow") inflow += e.amount;
        else outflow += e.amount;
      }
      const net = inflow - outflow;
      running += net;
      totalInflow += inflow;
      totalOutflow += outflow;
      if (events.length > 0) daysWithActivity += 1;
      if (running < 0) {
        daysInsolvent += 1;
        if (firstInsolvencyDate === null) firstInsolvencyDate = date;
      }
      dayBuckets.push({ date, inflow, outflow, net, runningBalance: running, events });
    }

    const averageDailyInflow = totalInflow / horizonDays;
    const averageDailyOutflow = totalOutflow / horizonDays;
    const averageDailyNet = averageDailyInflow - averageDailyOutflow;
    const daysUntilZero =
      averageDailyNet < 0 && openingBalance > 0
        ? Math.floor(openingBalance / -averageDailyNet)
        : null;

    return {
      horizonDays,
      startDate,
      endDate,
      openingBalance,
      closingBalance: running,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      flowCount: scheduledFlows.length,
      daysWithActivity,
      daysInsolvent,
      firstInsolvencyDate,
      burnRate: { averageDailyNet, averageDailyOutflow, averageDailyInflow, daysUntilZero },
      buckets: dayBuckets,
    };
  }
}

export const cashFlowProjectionEngine = new CashFlowProjectionEngine();
