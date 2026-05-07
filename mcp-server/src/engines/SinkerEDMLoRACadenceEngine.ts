/**
 * SinkerEDMLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL05
 * =============================================================
 *
 * Monthly cadence for sinker EDM — low job volume (~2 electrodes per
 * job, ~10 jobs/month at JM Die). Weekly would retrain on too little
 * new data.
 *
 * @module engines/SinkerEDMLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const SINKEREDM_DEFAULTS: Partial<CadenceConfig> = {
  interval: "monthly",
  dayOfMonth: 1,
  hour: 3,
  minNewJobs: 8,
  driftThreshold: 0.15,
  performanceThreshold: 65,
  maxVersions: 5,
  autoPromote: true,
};

class SinkerEDMLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;
  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(SINKEREDM_DEFAULTS, clock);
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

export const sinkerEDMLoRACadenceEngine = new SinkerEDMLoRACadenceEngineImpl();
export type SinkerEDMLoRACadenceEngine = typeof sinkerEDMLoRACadenceEngine;
export function createSinkerEDMLoRACadence(clock: () => Date): SinkerEDMLoRACadenceEngineImpl {
  return new SinkerEDMLoRACadenceEngineImpl(clock);
}
