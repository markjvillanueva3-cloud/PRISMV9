/**
 * CAM AI Health alert thresholds + classifier (U-CAM123).
 *
 * Pure data + pure function. The dashboard renders the thresholds and
 * the classifier tags each model's CamServeHealth with zero or more
 * alerts. Keeping this isolated from React makes it deterministically
 * testable without RTL.
 *
 * Thresholds are derived from the SLOs encoded in the U-CAM122 k8s
 * AnalysisTemplate (success_rate ≥ 0.90, p95 ≤ 200ms) plus operator
 * runbook drift / queue heuristics from the engine docs.
 */

import type { CamServeHealth } from "../api/camServe";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertThreshold {
  /** Stable id used in tests + audit logs. */
  id: string;
  /** Human-readable metric name shown on the dashboard. */
  metric: string;
  /** Optional unit suffix (rendered as a chip). */
  unit?: string;
  /** Warning level — crossing this raises severity to "warning". */
  warn: number;
  /** Critical level — crossing this raises severity to "critical". */
  crit: number;
  /** Direction of badness: "high" (large is bad) or "low" (small is bad). */
  direction: "high" | "low";
  /** Short description shown in the Alerts tab. */
  description: string;
}

export const CAM_AI_ALERT_THRESHOLDS: readonly AlertThreshold[] = Object.freeze([
  {
    id: "p95_latency_ms",
    metric: "p95 Latency",
    unit: "ms",
    warn: 200,
    crit: 500,
    direction: "high",
    description: "p95 inference latency. SLO from k8s AnalysisTemplate ≤ 200 ms.",
  },
  {
    id: "error_rate",
    metric: "Error Rate",
    unit: "%",
    warn: 0.05,
    crit: 0.10,
    direction: "high",
    description: "Rolling error rate (errors / requests). SLO success_rate ≥ 0.90 ⇒ crit at 10%.",
  },
  {
    id: "drift_score",
    metric: "Drift Score",
    warn: 0.30,
    crit: 0.60,
    direction: "high",
    description: "Distributional drift vs canary baseline. >0.60 triggers operator review per runbook.",
  },
  {
    id: "queue_depth",
    metric: "Queue Depth",
    unit: "req",
    warn: 50,
    crit: 200,
    direction: "high",
    description: "Pending micro-batch backlog. Sustained crit ⇒ HPA scale-up or rate-limit cut.",
  },
  {
    id: "request_count",
    metric: "Sample Size",
    unit: "req",
    warn: 100,
    crit: 30,
    direction: "low",
    description: "Min samples for valid SLO. Below crit ⇒ Hoeffding gate not yet armed.",
  },
] as const);

export interface AlertInstance {
  threshold_id: string;
  model_id: string;
  metric: string;
  value: number;
  warn: number;
  crit: number;
  severity: AlertSeverity;
  message: string;
}

/**
 * Classify a single CamServeHealth row against the alert thresholds.
 * Returns one alert per crossed threshold (severity = warning | critical).
 *
 * Edge cases:
 *  - Missing/undefined metric → skipped (no alert).
 *  - NaN / Infinity → skipped (defensive; engine should never emit these).
 *  - For "low" direction (e.g. sample size), values >= warn are healthy
 *    so no alert; only emit if value < warn.
 *  - Exactly equal to a threshold → counted as crossing it (>=/<= boundary).
 */
export function classifyHealth(
  health: CamServeHealth,
  thresholds: readonly AlertThreshold[] = CAM_AI_ALERT_THRESHOLDS,
): AlertInstance[] {
  const alerts: AlertInstance[] = [];

  for (const t of thresholds) {
    const raw = (health as unknown as Record<string, unknown>)[t.id];
    if (raw == null) continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;

    let severity: AlertSeverity | null = null;
    if (t.direction === "high") {
      if (value >= t.crit) severity = "critical";
      else if (value >= t.warn) severity = "warning";
    } else {
      if (value <= t.crit) severity = "critical";
      else if (value <= t.warn) severity = "warning";
    }
    if (!severity) continue;

    alerts.push({
      threshold_id: t.id,
      model_id: health.model_id,
      metric: t.metric,
      value,
      warn: t.warn,
      crit: t.crit,
      severity,
      message:
        t.direction === "high"
          ? `${t.metric}=${formatValue(value, t.unit)} crossed ${severity} threshold (${formatValue(severity === "critical" ? t.crit : t.warn, t.unit)})`
          : `${t.metric}=${formatValue(value, t.unit)} below ${severity} threshold (${formatValue(severity === "critical" ? t.crit : t.warn, t.unit)})`,
    });
  }

  return alerts;
}

/**
 * Classify every health row in the fleet, sorted by severity (critical
 * first) then by model_id for stable rendering.
 */
export function classifyFleet(
  fleet: readonly CamServeHealth[],
  thresholds: readonly AlertThreshold[] = CAM_AI_ALERT_THRESHOLDS,
): AlertInstance[] {
  const all: AlertInstance[] = [];
  for (const h of fleet) {
    all.push(...classifyHealth(h, thresholds));
  }
  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return all.sort((a, b) => {
    const sev = rank[a.severity] - rank[b.severity];
    if (sev !== 0) return sev;
    return a.model_id.localeCompare(b.model_id);
  });
}

function formatValue(v: number, unit?: string): string {
  if (unit === "%") return `${(v * 100).toFixed(2)}%`;
  if (unit === "ms") return `${v.toFixed(1)} ms`;
  if (unit === "req") return `${Math.round(v)} req`;
  return v.toFixed(3);
}
