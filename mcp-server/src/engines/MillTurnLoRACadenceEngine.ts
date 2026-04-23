/**
 * MillTurnLoRACadenceEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL03
 * ============================================================
 *
 * Weekly-cadence retrain scheduler for the mill-turn LoRA. Mill-turn
 * jobs are moderate volume at JM Die (~1 channel-program/day), so
 * weekly retrain gives ~7 new jobs — above the minNewJobs floor.
 *
 * Defaults differ from the 5-axis scheduler in performanceThreshold
 * (higher: mill-turn adapters target wait-ms reduction with hard floors
 * from the multi-channel scheduler engine).
 *
 * @module engines/MillTurnLoRACadenceEngine
 * @version 1.0.0
 */

import {
  BaseLoRACadence,
  type CadenceConfig,
  type TrainingRun,
  type VersionInfo,
  type CadenceState,
} from "./MachineLoRABaseEngine.js";

const MILLTURN_DEFAULTS: Partial<CadenceConfig> = {
  interval: "weekly",
  dayOfWeek: 0,
  hour: 2,
  minNewJobs: 7,
  driftThreshold: 0.10,
  performanceThreshold: 70,
  maxVersions: 6,
  autoPromote: true,
};

class MillTurnLoRACadenceEngineImpl {
  private readonly cadence: BaseLoRACadence;

  constructor(clock: () => Date = () => new Date()) {
    this.cadence = new BaseLoRACadence(MILLTURN_DEFAULTS, clock);
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

export const millTurnLoRACadenceEngine = new MillTurnLoRACadenceEngineImpl();
export type MillTurnLoRACadenceEngine = typeof millTurnLoRACadenceEngine;

export function createMillTurnLoRACadence(clock: () => Date): MillTurnLoRACadenceEngineImpl {
  return new MillTurnLoRACadenceEngineImpl(clock);
}
