/**
 * LaserLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL06
 * =========================================================
 *
 * Weekly cadence for laser LoRA. Pierce-failure oversampling at the
 * dataset stage means we accept a lower minNewJobs floor (pierce events
 * are high-variance signal).
 *
 * @module engines/LaserLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const LASER_DEFAULTS: Partial<CadenceConfig> = {
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 20,
  driftThreshold: 0.12,
  performanceThreshold: 70,
  maxVersions: 6,
  autoPromote: true,
};

class LaserLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;
  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(LASER_DEFAULTS, clock);
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

export const laserLoRACadenceEngine = new LaserLoRACadenceEngineImpl();
export type LaserLoRACadenceEngine = typeof laserLoRACadenceEngine;
export function createLaserLoRACadence(clock: () => Date): LaserLoRACadenceEngineImpl {
  return new LaserLoRACadenceEngineImpl(clock);
}
