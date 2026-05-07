/**
 * MillingLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
 * ===========================================================
 *
 * Nightly-cadence retrain scheduler for the milling LoRA. Wraps
 * {@link BaseLoRACadence} with milling-specific defaults:
 *   - interval:             daily (high volume — typically 100+ jobs/day)
 *   - hour:                 2am local
 *   - minNewJobs:           50 (enough to move posteriors)
 *   - driftThreshold:       0.10 (10% eval drop triggers retrain)
 *   - performanceThreshold: 65 (autobump if eval ≥ 65)
 *
 * Drift is evaluated against the active version's eval score.
 *
 * @module engines/MillingLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const MILLING_DEFAULTS: Partial<CadenceConfig> = {
  interval: "daily",
  hour: 2,
  minNewJobs: 50,
  driftThreshold: 0.10,
  performanceThreshold: 65,
  maxVersions: 7, // a week of nightly retains
  autoPromote: true,
};

class MillingLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;

  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(MILLING_DEFAULTS, clock);
  }

  setConfig(patch: Partial<CadenceConfig>): CadenceConfig {
    return this.cadence.setConfig(patch);
  }

  getConfig(): CadenceConfig {
    return this.cadence.getConfig();
  }

  getState(): CadenceState {
    return this.cadence.getState();
  }

  recordJobs(n: number): number {
    return this.cadence.recordJobs(n);
  }

  shouldTriggerRun(): ReturnType<BaseLoRACadence["shouldTriggerRun"]> {
    return this.cadence.shouldTriggerRun();
  }

  checkDrift(currentScore: number, baselineScore: number) {
    return this.cadence.checkDrift(currentScore, baselineScore);
  }

  startRun(triggeredBy: Parameters<BaseLoRACadence["startRun"]>[0], notes?: string): TrainingRun {
    return this.cadence.startRun(triggeredBy, notes);
  }

  completeRun(runId: string, metrics: NonNullable<TrainingRun["metrics"]>, modelPath: string): TrainingRun {
    return this.cadence.completeRun(runId, metrics, modelPath);
  }

  failRun(runId: string, error: string): TrainingRun {
    return this.cadence.failRun(runId, error);
  }

  promoteVersion(version: string): VersionInfo {
    return this.cadence.promoteVersion(version);
  }
}

export const millingLoRACadenceEngine = new MillingLoRACadenceEngineImpl();
export type MillingLoRACadenceEngine = typeof millingLoRACadenceEngine;

/** Factory for test use (injectable clock). */
export function createMillingLoRACadence(clock: () => Date): MillingLoRACadenceEngineImpl {
  return new MillingLoRACadenceEngineImpl(clock);
}
