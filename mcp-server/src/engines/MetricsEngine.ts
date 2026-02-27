/**
 * MetricsEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Application metrics collection: counters, gauges, histograms,
 * and timers with namespace support and Prometheus-compatible export.
 *
 * Actions: metric_increment, metric_gauge, metric_histogram,
 *          metric_timer, metric_export, metric_stats
 */

// ============================================================================
// TYPES
// ============================================================================

export type MetricType = "counter" | "gauge" | "histogram" | "timer";

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  labels: string[];
  unit?: string;
}

export interface MetricValue {
  name: string;
  type: MetricType;
  labels: Record<string, string>;
  value: number;
  timestamp: string;
}

export interface HistogramBucket {
  le: number;   // less than or equal
  count: number;
}

export interface HistogramSummary {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
  buckets: HistogramBucket[];
}

export interface MetricsExport {
  timestamp: string;
  counters: MetricValue[];
  gauges: MetricValue[];
  histograms: HistogramSummary[];
  total_metrics: number;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export class MetricsEngine {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histogramData = new Map<string, number[]>();
  private definitions = new Map<string, MetricDefinition>();
  private labels = new Map<string, Record<string, string>>();

  define(def: MetricDefinition): void {
    this.definitions.set(def.name, def);
  }

  increment(name: string, value: number = 1, lbls?: Record<string, string>): number {
    const key = this.makeKey(name, lbls);
    const current = (this.counters.get(key) || 0) + value;
    this.counters.set(key, current);
    if (lbls) this.labels.set(key, lbls);
    return current;
  }

  gauge(name: string, value: number, lbls?: Record<string, string>): void {
    const key = this.makeKey(name, lbls);
    this.gauges.set(key, value);
    if (lbls) this.labels.set(key, lbls);
  }

  observe(name: string, value: number, lbls?: Record<string, string>): void {
    const key = this.makeKey(name, lbls);
    let data = this.histogramData.get(key);
    if (!data) { data = []; this.histogramData.set(key, data); }
    data.push(value);
    if (data.length > 10000) data.shift(); // cap memory
    if (lbls) this.labels.set(key, lbls);
  }

  startTimer(name: string, lbls?: Record<string, string>): () => number {
    const start = performance.now();
    return () => {
      const elapsed = (performance.now() - start) / 1000; // seconds
      this.observe(name, elapsed, lbls);
      return elapsed;
    };
  }

  getCounter(name: string, lbls?: Record<string, string>): number {
    return this.counters.get(this.makeKey(name, lbls)) || 0;
  }

  getGauge(name: string, lbls?: Record<string, string>): number {
    return this.gauges.get(this.makeKey(name, lbls)) || 0;
  }

  getHistogram(name: string, lbls?: Record<string, string>, buckets: number[] = DEFAULT_BUCKETS): HistogramSummary {
    const key = this.makeKey(name, lbls);
    const data = this.histogramData.get(key) || [];

    if (data.length === 0) {
      return { name, count: 0, sum: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p99: 0, buckets: buckets.map(le => ({ le, count: 0 })) };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((s, v) => s + v, 0);

    return {
      name,
      count: data.length,
      sum: Math.round(sum * 1000) / 1000,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / data.length * 1000) / 1000,
      p50: sorted[Math.floor(data.length * 0.5)],
      p90: sorted[Math.floor(data.length * 0.9)],
      p99: sorted[Math.floor(data.length * 0.99)],
      buckets: buckets.map(le => ({ le, count: sorted.filter(v => v <= le).length })),
    };
  }

  export(): MetricsExport {
    const now = new Date().toISOString();
    const counterValues: MetricValue[] = [];
    const gaugeValues: MetricValue[] = [];
    const histogramSummaries: HistogramSummary[] = [];

    for (const [key, value] of this.counters) {
      const name = key.split("{")[0];
      counterValues.push({ name, type: "counter", labels: this.labels.get(key) || {}, value, timestamp: now });
    }
    for (const [key, value] of this.gauges) {
      const name = key.split("{")[0];
      gaugeValues.push({ name, type: "gauge", labels: this.labels.get(key) || {}, value, timestamp: now });
    }
    for (const key of this.histogramData.keys()) {
      const name = key.split("{")[0];
      histogramSummaries.push(this.getHistogram(name));
    }

    return {
      timestamp: now,
      counters: counterValues,
      gauges: gaugeValues,
      histograms: histogramSummaries,
      total_metrics: counterValues.length + gaugeValues.length + histogramSummaries.length,
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histogramData.clear();
    this.labels.clear();
  }

  // ---- PRIVATE ----

  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return `${name}{${sorted.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
  }
}

export const metricsEngine = new MetricsEngine();
