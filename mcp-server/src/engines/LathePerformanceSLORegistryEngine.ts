/**
 * LathePerformanceSLORegistryEngine — LATHE-PROD-READY-MS0/U-LPR-PERF-SLO
 *
 * Canonical lathe-production performance SLOs. The general SLOEngine can
 * track any named target, but a production-ready lathe system needs a
 * specific, reviewed set: parting cycle time, program-generation latency,
 * first-piece approval duration, tool-change time, setup-sheet render,
 * simulation completion, etc. This engine owns the canonical targets +
 * their thresholds + the ingest → percentile → breach pipeline.
 *
 * Why separate from the general SLOEngine:
 *   - Lathe thresholds are shop-specific and change over time; centralizing
 *     them here means shops can override a single file (or inject a custom
 *     set via the constructor) without touching the general SLO machinery.
 *   - Lathe metrics have operational units (ms, min) that deserve named
 *     helpers rather than opaque "latency_samples".
 *   - Breach verdict carries an operational recommendation string so the
 *     dashboard + alerts surface what to DO, not just what broke.
 *
 * Engine is pure — samples live in bounded rolling windows per metric;
 * no I/O. A future persistence layer can snapshot the windows.
 */

// ============================================================================
// CANONICAL LATHE SLO TARGETS
// ============================================================================

export type LatheSLOMetric =
  | "parting_cycle_time_ms"
  | "program_generation_ms"
  | "first_piece_approval_min"
  | "tool_change_ms"
  | "setup_sheet_render_ms"
  | "simulation_completion_ms"
  | "collision_check_ms"
  | "feed_override_latency_ms";

export interface SLOTarget {
  metric: LatheSLOMetric;
  percentile: 50 | 90 | 95 | 99;
  /** Threshold value. Units depend on the metric (ms, min). */
  threshold: number;
  /** Human-readable units for dashboard rendering. */
  unit: "ms" | "min";
  /** How many samples to keep in the rolling window. */
  window_size: number;
  /** Minimum samples required before emitting a verdict. */
  min_samples: number;
  /** Human-readable explanation of the SLO. */
  description: string;
  /** What to do if this SLO is breaching. */
  remediation: string;
}

/** Default targets — JM Die production baseline. Shops can override. */
export const DEFAULT_LATHE_SLO_TARGETS: SLOTarget[] = [
  {
    metric: "parting_cycle_time_ms",
    percentile: 95,
    threshold: 8_000,
    unit: "ms",
    window_size: 100,
    min_samples: 10,
    description: "95th-pct parting cycle should complete in ≤ 8s.",
    remediation:
      "Check parting blade wear, feed schedule, and chip evacuation. Slow partings scrap tools faster.",
  },
  {
    metric: "program_generation_ms",
    percentile: 99,
    threshold: 15_000,
    unit: "ms",
    window_size: 200,
    min_samples: 20,
    description: "99th-pct print-to-program generation should complete in ≤ 15s.",
    remediation:
      "Profile the pipeline — feature extraction or kNN is likely the bottleneck.",
  },
  {
    metric: "first_piece_approval_min",
    percentile: 90,
    threshold: 45,
    unit: "min",
    window_size: 50,
    min_samples: 5,
    description: "90th-pct first-piece approval should complete in ≤ 45 min.",
    remediation:
      "Check QA queue depth + inspection fixture availability. Long approvals stall production.",
  },
  {
    metric: "tool_change_ms",
    percentile: 95,
    threshold: 6_000,
    unit: "ms",
    window_size: 200,
    min_samples: 10,
    description: "95th-pct turret tool change should complete in ≤ 6s.",
    remediation:
      "Inspect turret indexing + air-pressure. Slow tool changes compound over thousands of ops.",
  },
  {
    metric: "setup_sheet_render_ms",
    percentile: 99,
    threshold: 3_000,
    unit: "ms",
    window_size: 100,
    min_samples: 10,
    description: "99th-pct setup-sheet render should complete in ≤ 3s.",
    remediation:
      "Check template cache + asset thumbnail generation.",
  },
  {
    metric: "simulation_completion_ms",
    percentile: 95,
    threshold: 30_000,
    unit: "ms",
    window_size: 100,
    min_samples: 10,
    description: "95th-pct full-program simulation should complete in ≤ 30s.",
    remediation:
      "Simulation times > 30s suggest collision checks exploding on dense toolpaths.",
  },
  {
    metric: "collision_check_ms",
    percentile: 99,
    threshold: 5_000,
    unit: "ms",
    window_size: 200,
    min_samples: 20,
    description: "99th-pct collision check should complete in ≤ 5s.",
    remediation:
      "BVH tree may be unbalanced; re-build indexes on holder + tool geometry.",
  },
  {
    metric: "feed_override_latency_ms",
    percentile: 99,
    threshold: 200,
    unit: "ms",
    window_size: 500,
    min_samples: 50,
    description: "99th-pct feed-override response should be ≤ 200 ms.",
    remediation:
      "Override latency > 200ms means the operator loses tight control under chatter.",
  },
];

// ============================================================================
// TYPES
// ============================================================================

export type SLOStatus = "ok" | "warning" | "breach" | "insufficient_data";

export interface SLOVerdict {
  metric: LatheSLOMetric;
  status: SLOStatus;
  percentile: number;
  measured: number | null;
  threshold: number;
  unit: "ms" | "min";
  sample_count: number;
  error_budget_pct: number;
  description: string;
  remediation: string | null;
}

export interface SLODashboard {
  generated_at: string;
  total_metrics: number;
  breaching: number;
  warning: number;
  healthy: number;
  insufficient_data: number;
  verdicts: SLOVerdict[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class LathePerformanceSLORegistryEngine {
  private readonly _targets = new Map<LatheSLOMetric, SLOTarget>();
  private readonly _samples = new Map<LatheSLOMetric, number[]>();

  constructor(targets: SLOTarget[] = DEFAULT_LATHE_SLO_TARGETS) {
    for (const t of targets) {
      if (this._targets.has(t.metric)) {
        throw new Error(`Duplicate SLO target in seed: ${t.metric}`);
      }
      this._targets.set(t.metric, { ...t });
      this._samples.set(t.metric, []);
    }
  }

  /** Snapshot of all configured targets. */
  targets(): SLOTarget[] {
    return Array.from(this._targets.values()).map((t) => ({ ...t }));
  }

  /** Lookup one target. */
  getTarget(metric: LatheSLOMetric): SLOTarget | undefined {
    const t = this._targets.get(metric);
    return t ? { ...t } : undefined;
  }

  /** Register or replace a target. */
  setTarget(t: SLOTarget): void {
    if (!(t.percentile === 50 || t.percentile === 90 || t.percentile === 95 || t.percentile === 99)) {
      throw new Error(`Invalid percentile ${t.percentile} — must be 50/90/95/99`);
    }
    if (t.window_size <= 0) throw new Error("window_size must be > 0");
    if (t.min_samples < 1) throw new Error("min_samples must be ≥ 1");
    if (t.min_samples > t.window_size) {
      throw new Error("min_samples cannot exceed window_size");
    }
    this._targets.set(t.metric, { ...t });
    if (!this._samples.has(t.metric)) this._samples.set(t.metric, []);
  }

  /** Ingest one sample for a metric. */
  recordSample(metric: LatheSLOMetric, value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid sample for ${metric}: ${value}`);
    }
    const target = this._targets.get(metric);
    if (!target) throw new Error(`No target configured for ${metric}`);
    const arr = this._samples.get(metric)!;
    arr.push(value);
    // Trim to window_size — ring-buffer semantics.
    if (arr.length > target.window_size) {
      arr.splice(0, arr.length - target.window_size);
    }
  }

  /** Current sample count for a metric. */
  sampleCount(metric: LatheSLOMetric): number {
    return this._samples.get(metric)?.length ?? 0;
  }

  /** Compute one verdict. */
  evaluate(metric: LatheSLOMetric): SLOVerdict {
    const target = this._targets.get(metric);
    if (!target) throw new Error(`No target configured for ${metric}`);
    const samples = this._samples.get(metric)!;
    const n = samples.length;

    if (n < target.min_samples) {
      return {
        metric,
        status: "insufficient_data",
        percentile: target.percentile,
        measured: null,
        threshold: target.threshold,
        unit: target.unit,
        sample_count: n,
        error_budget_pct: 0,
        description: target.description,
        remediation: null,
      };
    }

    const measured = this._percentile(samples, target.percentile);
    // Error budget: how much headroom relative to threshold, clamped [-100, 100]
    const budget = round(((target.threshold - measured) / target.threshold) * 100, 1);
    const clampedBudget = Math.max(-100, Math.min(100, budget));

    let status: SLOStatus;
    if (measured > target.threshold) status = "breach";
    else if (measured > target.threshold * 0.9) status = "warning";
    else status = "ok";

    return {
      metric,
      status,
      percentile: target.percentile,
      measured: round(measured, 2),
      threshold: target.threshold,
      unit: target.unit,
      sample_count: n,
      error_budget_pct: clampedBudget,
      description: target.description,
      remediation: status === "ok" ? null : target.remediation,
    };
  }

  /** Evaluate all registered metrics. */
  dashboard(): SLODashboard {
    const verdicts = Array.from(this._targets.keys()).map((m) => this.evaluate(m));
    let breaching = 0;
    let warning = 0;
    let healthy = 0;
    let insufficient = 0;
    for (const v of verdicts) {
      if (v.status === "breach") breaching++;
      else if (v.status === "warning") warning++;
      else if (v.status === "ok") healthy++;
      else insufficient++;
    }
    return {
      generated_at: new Date().toISOString(),
      total_metrics: verdicts.length,
      breaching,
      warning,
      healthy,
      insufficient_data: insufficient,
      verdicts,
    };
  }

  /** Clear all samples — useful for test isolation. */
  clearSamples(metric?: LatheSLOMetric): void {
    if (metric) {
      this._samples.set(metric, []);
    } else {
      for (const m of this._samples.keys()) this._samples.set(m, []);
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Nearest-rank percentile. Deterministic, no interpolation. */
  private _percentile(xs: number[], p: number): number {
    const sorted = [...xs].sort((a, b) => a - b);
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.max(0, Math.min(sorted.length - 1, rank - 1))];
  }
}

function round(v: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const lathePerformanceSLORegistryEngine = new LathePerformanceSLORegistryEngine();
