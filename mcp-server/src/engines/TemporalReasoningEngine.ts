/**
 * TemporalReasoningEngine — Past/present/future state projection over a timeline
 *
 * Phase 0.18 U-AGI6 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Stores ordered
 * snapshots of a named series (e.g. "psi_percent", "engine_count") and
 * answers questions like "what was the value 7d ago" and "at the current
 * rate of change, when will we hit X".
 *
 * Linear regression on the most recent window gives slope + intercept for
 * short-horizon projection. No curve-fitting or exotic modeling here — the
 * aim is a cheap, deterministic timeline reasoner.
 *
 * No I/O. Snapshots are in-memory; persistence to TEMPORAL_STATE_LEDGER.jsonl
 * belongs to the script/hook layer.
 *
 * @module engines/TemporalReasoningEngine
 * @milestone PP-0.18-U-AGI6
 */

export interface Snapshot {
  at: string; // ISO timestamp
  value: number;
  note?: string;
}

export interface Projection {
  series: string;
  slopePerDay: number;
  intercept: number;
  r2: number;
  current: number;
  windowSize: number;
}

export interface ForecastResult {
  series: string;
  targetValue: number;
  hit: boolean;
  etaIso?: string;
  etaDays?: number;
  reason: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class TemporalReasoningEngine {
  private readonly series = new Map<string, Snapshot[]>();

  record(series: string, value: number, at?: string, note?: string): Snapshot {
    if (!series || series.trim() === "") throw new Error("series name required");
    if (!Number.isFinite(value)) throw new Error("value must be finite");
    const iso = at ?? new Date().toISOString();
    if (!/^\d{4}-\d{2}-\d{2}T/.test(iso)) throw new Error(`at must be ISO-8601: ${iso}`);
    const snap: Snapshot = { at: iso, value, note };
    const arr = this.series.get(series) ?? [];
    // Insert keeping chronological order.
    const idx = arr.findIndex((s) => s.at > iso);
    if (idx === -1) arr.push(snap);
    else arr.splice(idx, 0, snap);
    this.series.set(series, arr);
    return snap;
  }

  snapshots(series: string): Snapshot[] {
    return [...(this.series.get(series) ?? [])];
  }

  /** Value at a specific ISO time (linear interpolation between snapshots). */
  valueAt(series: string, iso: string): number | null {
    const arr = this.series.get(series);
    if (!arr || arr.length === 0) return null;
    const tms = Date.parse(iso);
    if (Number.isNaN(tms)) throw new Error(`unparseable iso: ${iso}`);

    if (tms <= Date.parse(arr[0].at)) return arr[0].value;
    if (tms >= Date.parse(arr[arr.length - 1].at)) return arr[arr.length - 1].value;

    for (let i = 0; i < arr.length - 1; i += 1) {
      const t0 = Date.parse(arr[i].at);
      const t1 = Date.parse(arr[i + 1].at);
      if (tms >= t0 && tms <= t1) {
        const frac = (tms - t0) / Math.max(1, t1 - t0);
        return arr[i].value + frac * (arr[i + 1].value - arr[i].value);
      }
    }
    return arr[arr.length - 1].value;
  }

  /** Linear regression over the last `windowSize` snapshots. */
  project(series: string, windowSize = 10): Projection | null {
    const arr = this.series.get(series);
    if (!arr || arr.length < 2) return null;
    const window = arr.slice(-Math.max(2, windowSize));
    const t0 = Date.parse(window[0].at);
    const xs = window.map((s) => (Date.parse(s.at) - t0) / MS_PER_DAY);
    const ys = window.map((s) => s.value);
    const n = xs.length;

    const sumX = xs.reduce((a, v) => a + v, 0);
    const sumY = ys.reduce((a, v) => a + v, 0);
    const sumXY = xs.reduce((a, v, i) => a + v * ys[i], 0);
    const sumXX = xs.reduce((a, v) => a + v * v, 0);
    const meanY = sumY / n;

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // R² computed from SS_res / SS_tot
    const ssTot = ys.reduce((a, v) => a + (v - meanY) ** 2, 0);
    const ssRes = xs.reduce((a, x, i) => a + (ys[i] - (intercept + slope * x)) ** 2, 0);
    const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

    return {
      series,
      slopePerDay: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 10000) / 10000,
      r2: Math.round(r2 * 10000) / 10000,
      current: window[window.length - 1].value,
      windowSize: n,
    };
  }

  /**
   * ETA for the series to reach `target`. Uses the projection's slope. Returns
   * `hit=true` with etaDays=0 if already reached.
   */
  forecast(series: string, target: number, windowSize = 10, nowIso?: string): ForecastResult {
    const p = this.project(series, windowSize);
    if (!p) return { series, targetValue: target, hit: false, reason: "not enough data" };

    const now = nowIso ? Date.parse(nowIso) : Date.now();
    const gap = target - p.current;
    if (gap === 0) {
      return { series, targetValue: target, hit: true, etaDays: 0, etaIso: new Date(now).toISOString(), reason: "already at target" };
    }
    if (p.slopePerDay === 0) {
      return { series, targetValue: target, hit: false, reason: "slope is zero; will not reach target" };
    }
    const gapSign = Math.sign(gap);
    const slopeSign = Math.sign(p.slopePerDay);
    if (gapSign !== slopeSign) {
      return { series, targetValue: target, hit: false, reason: "slope points away from target" };
    }
    const etaDays = gap / p.slopePerDay;
    const etaMs = now + etaDays * MS_PER_DAY;
    return {
      series,
      targetValue: target,
      hit: false,
      etaDays: Math.round(etaDays * 100) / 100,
      etaIso: new Date(etaMs).toISOString(),
      reason: `linear projection from window ${p.windowSize}`,
    };
  }

  listSeries(): string[] {
    return [...this.series.keys()].sort();
  }

  size(series?: string): number {
    if (series === undefined) {
      let total = 0;
      for (const arr of this.series.values()) total += arr.length;
      return total;
    }
    return this.series.get(series)?.length ?? 0;
  }

  clear(series?: string): void {
    if (series === undefined) {
      this.series.clear();
      return;
    }
    this.series.delete(series);
  }
}

export const temporalReasoningEngine = new TemporalReasoningEngine();
