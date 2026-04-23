/**
 * FiveAxisLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL02
 * ============================================================
 *
 * Weekly-cadence retrain scheduler for the 5-axis LoRA. Weekly (not
 * daily) because 5-axis job volume is ~10% of milling at JM Die, so
 * daily retraining would produce noisy adapters.
 *
 * Defaults:
 *   - interval:             weekly (Sunday 2am)
 *   - minNewJobs:           10
 *   - driftThreshold:       0.12 (slightly looser — higher process variance)
 *   - performanceThreshold: 60
 *
 * @module engines/FiveAxisLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const FIVEAXIS_DEFAULTS: Partial<CadenceConfig> = {
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 10,
  driftThreshold: 0.12,
  performanceThreshold: 60,
  maxVersions: 6,
  autoPromote: true,
};

class FiveAxisLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;

  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(FIVEAXIS_DEFAULTS, clock);
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

  shouldTriggerRun() {
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

export const fiveAxisLoRACadenceEngine = new FiveAxisLoRACadenceEngineImpl();
export type FiveAxisLoRACadenceEngine = typeof fiveAxisLoRACadenceEngine;

export function createFiveAxisLoRACadence(clock: () => Date): FiveAxisLoRACadenceEngineImpl {
  return new FiveAxisLoRACadenceEngineImpl(clock);
}
