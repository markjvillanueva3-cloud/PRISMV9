/**
 * GrindingLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL08
 *
 * Weekly cadence for grinding LoRA. Burn events are oversampled at the
 * dataset stage.
 *
 * @module engines/GrindingLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const GRINDING_DEFAULTS: Partial<CadenceConfig> = {
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 12,
  driftThreshold: 0.10,
  performanceThreshold: 68,
  maxVersions: 6,
  autoPromote: true,
};

class GrindingLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;
  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(GRINDING_DEFAULTS, clock);
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

export const grindingLoRACadenceEngine = new GrindingLoRACadenceEngineImpl();
export type GrindingLoRACadenceEngine = typeof grindingLoRACadenceEngine;
export function createGrindingLoRACadence(clock: () => Date): GrindingLoRACadenceEngineImpl {
  return new GrindingLoRACadenceEngineImpl(clock);
}
