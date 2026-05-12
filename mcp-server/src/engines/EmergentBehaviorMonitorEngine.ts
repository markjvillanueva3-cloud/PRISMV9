/**
 * EmergentBehaviorMonitorEngine — Detect unexpected interactions across PRISM
 *
 * Phase 0.18 U-AGI11 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Watches for
 * signals that the system's observed behaviour is drifting away from the
 * expected baseline: perf regressions, registry count drift, flaky-test
 * correlations, sudden fan-in or fan-out changes.
 *
 * Two primitives:
 *   - `observeMetric(name, value, at)` — feeds a rolling window of values.
 *   - `detect(name)` — reports anomalies in the current window against the
 *     rolling-baseline mean ± N·stddev, where N is the configured z-score.
 *
 * No I/O. The engine is a stats tracker; a hook decides when to escalate.
 *
 * @module engines/EmergentBehaviorMonitorEngine
 * @milestone PP-0.18-U-AGI11
 */

export interface MetricPoint {
  at: string;
  value: number;
}

export interface AnomalyReport {
  metric: string;
  latest: number;
  mean: number;
  stddev: number;
  z: number;
  severity: "none" | "warn" | "alert";
  reason: string;
}

export interface MonitorConfig {
  windowSize: number;
  warnZ: number;
  alertZ: number;
}

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = Object.freeze({
  windowSize: 20,
  warnZ: 2,
  alertZ: 3,
});

export class EmergentBehaviorMonitorEngine {
  private readonly windows = new Map<string, MetricPoint[]>();
  private readonly config: MonitorConfig;

  constructor(config: MonitorConfig = DEFAULT_MONITOR_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  observeMetric(name: string, value: number, at?: string): MetricPoint {
    if (!name || name.trim() === "") throw new Error("metric name required");
    if (!Number.isFinite(value)) throw new Error("value must be finite");
    const iso = at ?? new Date().toISOString();
    const point: MetricPoint = { at: iso, value };
    const arr = this.windows.get(name) ?? [];
    arr.push(point);
    if (arr.length > this.config.windowSize) arr.splice(0, arr.length - this.config.windowSize);
    this.windows.set(name, arr);
    return point;
  }

  detect(name: string): AnomalyReport | null {
    const arr = this.windows.get(name);
    if (!arr || arr.length < 3) return null;
    const latest = arr[arr.length - 1].value;
    const prior = arr.slice(0, -1);
    const mean = prior.reduce((a, p) => a + p.value, 0) / prior.length;
    const variance = prior.reduce((a, p) => a + (p.value - mean) ** 2, 0) / prior.length;
    const stddev = Math.sqrt(variance);
    const z = stddev === 0 ? (latest === mean ? 0 : Number.POSITIVE_INFINITY) : (latest - mean) / stddev;
    const absZ = Math.abs(z);

    let severity: AnomalyReport["severity"] = "none";
    if (absZ >= this.config.alertZ) severity = "alert";
    else if (absZ >= this.config.warnZ) severity = "warn";

    const reason =
      severity === "none"
        ? "within baseline"
        : `|z|=${absZ.toFixed(2)} exceeds ${severity === "alert" ? this.config.alertZ : this.config.warnZ}`;

    return {
      metric: name,
      latest: round4(latest),
      mean: round4(mean),
      stddev: round4(stddev),
      z: round4(z),
      severity,
      reason,
    };
  }

  listMetrics(): string[] {
    return [...this.windows.keys()].sort();
  }

  size(name?: string): number {
    if (name === undefined) {
      let n = 0;
      for (const arr of this.windows.values()) n += arr.length;
      return n;
    }
    return this.windows.get(name)?.length ?? 0;
  }

  clear(name?: string): void {
    if (name === undefined) this.windows.clear();
    else this.windows.delete(name);
  }

  private validateConfig(c: MonitorConfig): void {
    if (!Number.isInteger(c.windowSize) || c.windowSize < 3) throw new Error("windowSize must be >= 3");
    if (c.warnZ <= 0 || c.alertZ <= 0) throw new Error("warnZ and alertZ must be > 0");
    if (c.alertZ <= c.warnZ) throw new Error("alertZ must be > warnZ");
  }
}

function round4(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round(n * 10000) / 10000;
}

export const emergentBehaviorMonitorEngine = new EmergentBehaviorMonitorEngine();
