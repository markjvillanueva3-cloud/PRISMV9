/**
 * WEDMLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL04
 * ========================================================
 *
 * Weekly-cadence retrain scheduler for wire EDM LoRA. Pairs with
 * existing WEDMFeedbackIngestionEngine + WEDMFeedbackCalibrationEngine —
 * they feed jobs into the dataset builder; this engine decides when to
 * retrain.
 *
 * Defaults:
 *   - interval:             weekly Sunday 2am
 *   - minNewJobs:           15 (moderate volume)
 *   - driftThreshold:       0.15 (higher variance than milling)
 *   - performanceThreshold: 68
 *
 * @module engines/WEDMLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const WEDM_DEFAULTS: Partial<CadenceConfig> = {
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 15,
  driftThreshold: 0.15,
  performanceThreshold: 68,
  maxVersions: 6,
  autoPromote: true,
};

class WEDMLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;
  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(WEDM_DEFAULTS, clock);
  }
  setConfig(p: Partial<CadenceConfig>): CadenceConfig { return this.cadence.setConfig(p); }
  getConfig(): CadenceConfig { return this.cadence.getConfig(); }
  getState(): CadenceState { return this.cadence.getState(); }
  recordJobs(n: number): number { return this.cadence.recordJobs(n); }
  shouldTriggerRun() { return this.cadence.shouldTriggerRun(); }
  checkDrift(cur: number, base: number) { return this.cadence.checkDrift(cur, base); }
  startRun(t: Parameters<BaseLoRACadence["startRun"]>[0], notes?: string): TrainingRun { return this.cadence.startRun(t, notes); }
  completeRun(id: string, m: NonNullable<TrainingRun["metrics"]>, path: string): TrainingRun { return this.cadence.completeRun(id, m, path); }
  failRun(id: string, err: string): TrainingRun { return this.cadence.failRun(id, err); }
  promoteVersion(v: string): VersionInfo { return this.cadence.promoteVersion(v); }
}

export const wedmLoRACadenceEngine = new WEDMLoRACadenceEngineImpl();
export type WEDMLoRACadenceEngine = typeof wedmLoRACadenceEngine;
export function createWEDMLoRACadence(clock: () => Date): WEDMLoRACadenceEngineImpl {
  return new WEDMLoRACadenceEngineImpl(clock);
}
