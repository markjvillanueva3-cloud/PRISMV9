/**
 * ConsensusDriftDetectorEngine — detect EMA regressions across two
 * snapshots of the consensus performance state.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DRIFT-DETECTOR.
 *
 * Why this exists
 * ---------------
 * The consensus pool learns vendor reward EMAs per task type via
 * ConsensusNeuralCreditAssignmentEngine.applyFromFeed(). Once those
 * EMAs drive vendor selection (MultiModelConsensusEngine when
 * usePerformanceWeights=true), an unnoticed regression silently
 * starves the consensus pool of an entire vendor.
 *
 * Concrete failure mode: Anthropic's plan-task EMA drops from 0.85 to
 * 0.42 over 24h because of a model regression or a prompt template
 * bug. The selector now drops Anthropic. The pool collapses to 2
 * vendors. Consensus weakens silently.
 *
 * This engine compares two snapshots (e.g. yesterday vs today) and
 * surfaces every (vendor, taskType) whose EMA dropped beyond a
 * configurable threshold, classified by severity. Pure: no I/O, no
 * side effects, deterministic for same input.
 *
 * Operational coupling
 * --------------------
 * Snapshots are produced by reading
 * mcp-server/data/state/consensus-model-performance.json at two points
 * in time. A separate unit will wire this engine to the credit-cron
 * CLI so each cron run captures a "before" snapshot, then compares to
 * the "after" snapshot. This engine is the pure compute layer.
 *
 * Severity ladder
 * ---------------
 *   - none   : delta >= -minorThreshold (no meaningful drop)
 *   - minor  : -minorThreshold > delta >= -moderateThreshold
 *   - moderate: -moderateThreshold > delta >= -severeThreshold
 *   - severe : delta < -severeThreshold
 *
 * Cold-start exemption
 * --------------------
 * A (vendor, taskType) is EXEMPT from drift detection if EITHER
 * snapshot has n < minObservations. Cold-start EMAs swing wildly with
 * the first few observations and would drown signal in noise.
 *
 * @module engines/ConsensusDriftDetectorEngine
 */

import type { PerformanceState } from "./ConsensusModelPerformanceEngine.js";

const DEFAULT_MIN_OBSERVATIONS = 5;
const DEFAULT_MINOR_THRESHOLD = 0.05;
const DEFAULT_MODERATE_THRESHOLD = 0.15;
const DEFAULT_SEVERE_THRESHOLD = 0.30;

export type DriftSeverity = "none" | "minor" | "moderate" | "severe";

export interface DriftDetectorOpts {
  /** EMAs with n < minObservations on either snapshot are exempt. Default 5. */
  minObservations?: number;
  /** Drop magnitude (in EMA units) at which severity becomes "minor". Default 0.05. */
  minorThreshold?: number;
  /** Drop magnitude at which severity becomes "moderate". Default 0.15. */
  moderateThreshold?: number;
  /** Drop magnitude at which severity becomes "severe". Default 0.30. */
  severeThreshold?: number;
  /** Optional ISO timestamp for the "before" snapshot (used in report metadata only). */
  beforeAt?: string;
  /** Optional ISO timestamp for the "after" snapshot (used in report metadata only). */
  afterAt?: string;
}

export interface DriftEvent {
  vendor: string;
  taskType: string;
  emaBefore: number;
  emaAfter: number;
  delta: number;
  severity: DriftSeverity;
  nBefore: number;
  nAfter: number;
}

export interface DriftReport {
  generatedAt: string;
  beforeAt: string | null;
  afterAt: string | null;
  thresholds: { minor: number; moderate: number; severe: number };
  minObservations: number;
  events: DriftEvent[];
  exempt: { vendor: string; taskType: string; reason: string }[];
  counts: {
    none: number;
    minor: number;
    moderate: number;
    severe: number;
    exempt: number;
    totalCompared: number;
  };
}

export class ConsensusDriftDetectorEngine {
  /**
   * Compare two snapshots and return a structured drift report. Pure —
   * no I/O, deterministic, no input mutation.
   *
   * Pairs every (vendor, taskType) that exists in BOTH snapshots:
   *   - Drift events: severity != "none" and not exempt → reported
   *   - Exempt events: minObservations on either side → recorded separately
   *   - Vendors only in "before": vendor disappeared (OUT) — emitted as severe drift
   *   - Vendors only in "after": vendor appeared cold-start (IN) — exempted
   */
  compare(
    before: PerformanceState,
    after: PerformanceState,
    opts: DriftDetectorOpts = {},
  ): DriftReport {
    const minObservations = Math.max(0, opts.minObservations ?? DEFAULT_MIN_OBSERVATIONS);
    const minor = opts.minorThreshold ?? DEFAULT_MINOR_THRESHOLD;
    const moderate = opts.moderateThreshold ?? DEFAULT_MODERATE_THRESHOLD;
    const severe = opts.severeThreshold ?? DEFAULT_SEVERE_THRESHOLD;
    if (!(minor < moderate && moderate < severe)) {
      throw new Error(
        `thresholds must satisfy minor < moderate < severe (got ${minor}, ${moderate}, ${severe})`,
      );
    }

    const events: DriftEvent[] = [];
    const exempt: { vendor: string; taskType: string; reason: string }[] = [];
    const counts = { none: 0, minor: 0, moderate: 0, severe: 0, exempt: 0, totalCompared: 0 };

    const vendors = new Set<string>([
      ...Object.keys(before?.vendors ?? {}),
      ...Object.keys(after?.vendors ?? {}),
    ]);

    for (const vendor of Array.from(vendors).sort()) {
      const beforeTasks = before?.vendors?.[vendor]?.tasks ?? {};
      const afterTasks = after?.vendors?.[vendor]?.tasks ?? {};
      const taskTypes = new Set<string>([
        ...Object.keys(beforeTasks),
        ...Object.keys(afterTasks),
      ]);

      for (const taskType of Array.from(taskTypes).sort()) {
        const b = beforeTasks[taskType];
        const a = afterTasks[taskType];

        // Vendor-task in "after" only — cold-start, exempt.
        if (!b && a) {
          exempt.push({ vendor, taskType, reason: "new-in-after" });
          counts.exempt++;
          continue;
        }
        // Vendor-task in "before" only — disappearance is a structural change,
        // record as severe drift with emaAfter=0 (treat as floored).
        if (b && !a) {
          if ((b.n ?? 0) < minObservations) {
            exempt.push({ vendor, taskType, reason: "below-min-obs" });
            counts.exempt++;
            continue;
          }
          const event: DriftEvent = {
            vendor,
            taskType,
            emaBefore: b.ema ?? 0,
            emaAfter: 0,
            delta: -1 * (b.ema ?? 0),
            severity: "severe",
            nBefore: b.n ?? 0,
            nAfter: 0,
          };
          events.push(event);
          counts.severe++;
          counts.totalCompared++;
          continue;
        }

        // Both sides present — compute delta and classify.
        const nB = b!.n ?? 0;
        const nA = a!.n ?? 0;
        if (nB < minObservations || nA < minObservations) {
          exempt.push({ vendor, taskType, reason: "below-min-obs" });
          counts.exempt++;
          continue;
        }

        const emaB = Number.isFinite(b!.ema) ? b!.ema : 0;
        const emaA = Number.isFinite(a!.ema) ? a!.ema : 0;
        const delta = emaA - emaB;
        const severity = this.classify(delta, { minor, moderate, severe });

        counts.totalCompared++;
        counts[severity]++;
        if (severity !== "none") {
          events.push({
            vendor,
            taskType,
            emaBefore: emaB,
            emaAfter: emaA,
            delta,
            severity,
            nBefore: nB,
            nAfter: nA,
          });
        }
      }
    }

    // Sort events by severity (severe first), then absolute delta magnitude.
    const sevRank: Record<DriftSeverity, number> = { severe: 0, moderate: 1, minor: 2, none: 3 };
    events.sort((x, y) => {
      const r = sevRank[x.severity] - sevRank[y.severity];
      if (r !== 0) return r;
      return Math.abs(y.delta) - Math.abs(x.delta);
    });

    return {
      generatedAt: new Date().toISOString(),
      beforeAt: opts.beforeAt ?? null,
      afterAt: opts.afterAt ?? null,
      thresholds: { minor, moderate, severe },
      minObservations,
      events,
      exempt,
      counts,
    };
  }

  /**
   * Classify a delta (after - before) into a severity bucket. Positive
   * deltas (improvement) are always "none" — this engine only flags
   * regressions. Boundary semantics (drop magnitude inclusive at the
   * threshold): -minor → minor, -severe → severe.
   *
   *   delta >  -minor    → none
   *   -minor >= delta >  -moderate → minor
   *   -moderate >= delta >  -severe → moderate
   *   delta <= -severe   → severe
   */
  classify(
    delta: number,
    thresholds: { minor: number; moderate: number; severe: number },
  ): DriftSeverity {
    if (Number.isNaN(delta)) return "none";
    if (delta === Number.POSITIVE_INFINITY) return "none";
    if (delta > -thresholds.minor) return "none";
    if (delta > -thresholds.moderate) return "minor";
    if (delta > -thresholds.severe) return "moderate";
    return "severe";
  }

  /** True if the report has any moderate-or-worse events. */
  hasActionableDrift(report: DriftReport): boolean {
    return report.counts.moderate > 0 || report.counts.severe > 0;
  }
}

export const consensusDriftDetectorEngine = new ConsensusDriftDetectorEngine();
