/**
 * LoRADriftCoordinatorEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL10
 * ==============================================================
 *
 * Monitors drift signals from all 8 pipeline LoRA cadence engines.
 * Fires a MASTER retrain trigger when ≥ k pipelines drift within a
 * rolling time window — suggests a shared upstream cause (e.g. material
 * batch variation affecting milling AND turning simultaneously).
 *
 * Algorithm: buffer drift observations with timestamps. On each
 * observation, count how many DIFFERENT pipelines have drifted within
 * the current window [now - windowMs, now]. If count ≥ threshold,
 * emit a coordinatedDrift event.
 *
 * Output events:
 *   - pipelineDrift: single-pipeline drift (informational)
 *   - coordinatedDrift: ≥ threshold pipelines drifted in window (alert)
 *   - allClear: no active drifts in window (reset)
 *
 * Alert publication: returns events to caller — the dispatcher is
 * responsible for writing to AGENT_CHAT.md / PagerDuty.
 *
 * @module engines/LoRADriftCoordinatorEngine
 * @version 1.0.0
 */

import type { PipelineType } from "./MasterAITrainingLedgerEngine.js";

export interface DriftObservation {
  pipelineType: PipelineType;
  /** Relative drop (positive = drop) — typically 0.10 to 0.50. */
  delta: number;
  /** ISO-8601 timestamp of observation. */
  observedAt: string;
  baselineEvalScore: number;
  currentEvalScore: number;
}

export type DriftEventKind = "pipelineDrift" | "coordinatedDrift" | "allClear";

export interface DriftEvent {
  kind: DriftEventKind;
  timestamp: string;
  pipelineTypes: PipelineType[];
  details: string;
  severity: "info" | "warning" | "critical";
}

export interface CoordinatorConfig {
  /** Window in ms to correlate drifts. Default 2h. */
  windowMs: number;
  /** Minimum pipelines drifted to trigger coordinated alert. Default 2. */
  coordinatedThreshold: number;
  /** Delta above this is considered "drifted". Default 0.10. */
  driftDeltaFloor: number;
}

const DEFAULT_CONFIG: CoordinatorConfig = {
  windowMs: 2 * 60 * 60 * 1000,
  coordinatedThreshold: 2,
  driftDeltaFloor: 0.10,
};

class LoRADriftCoordinatorEngineImpl {
  private readonly now: () => Date;
  private config: CoordinatorConfig;
  private buffer: DriftObservation[] = [];

  constructor(clock: () => Date = () => new Date(), config: Partial<CoordinatorConfig> = {}) {
    this.now = clock;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(patch: Partial<CoordinatorConfig>): CoordinatorConfig {
    // Validate the merged config on a candidate BEFORE assigning -- a rejected patch
    // must leave this.config untouched (mutate-then-validate previously left the
    // singleton partially-applied with a bad value, polluting later record/check calls,
    // and is reachable via the prism_ai:ledger_drift_config{set} wire).
    const next = { ...this.config, ...patch };
    if (next.windowMs <= 0) throw new Error("windowMs must be positive");
    if (next.coordinatedThreshold < 2) throw new Error("coordinatedThreshold must be >= 2");
    if (next.driftDeltaFloor < 0) throw new Error("driftDeltaFloor must be >= 0");
    this.config = next;
    return { ...this.config };
  }

  getConfig(): CoordinatorConfig {
    return { ...this.config };
  }

  /**
   * Record a drift observation from a pipeline. Returns the event
   * emitted as a result (single- or coordinated-drift).
   */
  record(obs: DriftObservation): DriftEvent {
    if (!obs.pipelineType) throw new Error("pipelineType required");
    if (!Number.isFinite(obs.delta)) throw new Error("delta must be finite");
    if (!obs.observedAt) throw new Error("observedAt required");
    this.buffer.push({ ...obs });
    this.prune();

    if (Math.abs(obs.delta) < this.config.driftDeltaFloor) {
      // Below drift floor — informational, no alert, but still recorded
      return {
        kind: "pipelineDrift",
        timestamp: obs.observedAt,
        pipelineTypes: [obs.pipelineType],
        details: `below drift floor: delta=${obs.delta.toFixed(3)}`,
        severity: "info",
      };
    }

    const active = this.activePipelines();
    if (active.length >= this.config.coordinatedThreshold) {
      return {
        kind: "coordinatedDrift",
        timestamp: obs.observedAt,
        pipelineTypes: active,
        details:
          `coordinated drift: ${active.length} pipelines (${active.join(", ")}) ` +
          `in window=${this.config.windowMs}ms → master retrain trigger`,
        severity: "critical",
      };
    }

    return {
      kind: "pipelineDrift",
      timestamp: obs.observedAt,
      pipelineTypes: [obs.pipelineType],
      details: `single-pipeline drift delta=${obs.delta.toFixed(3)}`,
      severity: "warning",
    };
  }

  /** List drifted pipelines currently in the rolling window. */
  activePipelines(): PipelineType[] {
    this.prune();
    const seen = new Set<PipelineType>();
    for (const o of this.buffer) {
      if (Math.abs(o.delta) >= this.config.driftDeltaFloor) seen.add(o.pipelineType);
    }
    return Array.from(seen).sort();
  }

  /** Returns true if master retrain trigger should fire right now. */
  shouldTriggerMasterRetrain(): boolean {
    return this.activePipelines().length >= this.config.coordinatedThreshold;
  }

  /**
   * Emit allClear event if no active drifts. Returns null if drifts
   * are still present. Useful for test / monitoring cycles.
   */
  checkAllClear(): DriftEvent | null {
    this.prune();
    if (this.activePipelines().length === 0 && this.buffer.length > 0) {
      return {
        kind: "allClear",
        timestamp: this.now().toISOString(),
        pipelineTypes: [],
        details: "no active drifts in window",
        severity: "info",
      };
    }
    return null;
  }

  /** Current buffer size (after pruning). */
  bufferSize(): number {
    this.prune();
    return this.buffer.length;
  }

  /** Clear all observations. */
  reset(): void {
    this.buffer = [];
  }

  private prune(): void {
    const now = this.now().getTime();
    this.buffer = this.buffer.filter((o) => {
      const t = Date.parse(o.observedAt);
      return Number.isFinite(t) && now - t <= this.config.windowMs;
    });
  }
}

export const loRADriftCoordinatorEngine = new LoRADriftCoordinatorEngineImpl();
export type LoRADriftCoordinatorEngine = typeof loRADriftCoordinatorEngine;
export function createLoRADriftCoordinator(
  clock: () => Date,
  config?: Partial<CoordinatorConfig>,
): LoRADriftCoordinatorEngineImpl {
  return new LoRADriftCoordinatorEngineImpl(clock, config);
}
