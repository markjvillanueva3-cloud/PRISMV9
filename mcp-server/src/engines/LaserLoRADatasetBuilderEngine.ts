/**
 * LaserLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL06
 * ================================================================
 *
 * Laser LoRA dataset builder. Consumes nested-sheet programs + pierce
 * success + edge quality + dross events. LoRA target: pierce strategy
 * and lead-in/out geometry per material/thickness.
 *
 * Pierce failures are labeled "pierce-fail" and weight-boosted — they
 * are the highest-cost failure mode in laser cutting.
 *
 * @module engines/LaserLoRADatasetBuilderEngine
 * @version 1.0.0
 */

import {
  BaseLoRADatasetBuilder,
  DEFAULT_SPLIT,
  type RawJob,
  type DatasetSplitConfig,
  type DatasetBuildResult,
} from "./MachineLoRABaseEngine.js";

const REQUIRED_FEATURE_KEYS = [
  "material",
  "thickness_mm",
  "laser_power_w",
  "assist_gas",
  "pierce_type",
] as const;
const REQUIRED_ACTUAL_KEYS = [
  "pierce_success",
  "edge_quality_score",
  "dross_events",
] as const;

class LaserLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;
  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "laser",
      validate: (j) => this.validate(j),
      render: (j) => this.render(j),
    });
  }

  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
    return this.builder.build(jobs.map((j) => this.enrichFingerprint(j)), split);
  }

  requiredSchema(): { features: readonly string[]; actuals: readonly string[] } {
    return { features: REQUIRED_FEATURE_KEYS, actuals: REQUIRED_ACTUAL_KEYS };
  }

  private enrichFingerprint(job: RawJob): RawJob {
    const thickness = Number(job.features.thickness_mm ?? 0);
    // Laser thickness regimes (mm): <3 thin, 3-10 medium, 10-25 thick, >25 heavy
    let bucket = "heavy";
    if (thickness < 3) bucket = "thin";
    else if (thickness < 10) bucket = "medium";
    else if (thickness < 25) bucket = "thick";
    return { ...job, fingerprint: { ...job.fingerprint, thicknessBucket: bucket } };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null) return `missing feature ${k}`;
    }
    const pierce = job.actual["pierce_success"];
    if (typeof pierce !== "boolean") return "pierce_success must be boolean";
    const eq = job.actual["edge_quality_score"];
    if (typeof eq !== "number" || !Number.isFinite(eq) || eq < 0 || eq > 10) {
      return "edge_quality_score must be 0–10";
    }
    const dross = job.actual["dross_events"];
    if (typeof dross !== "number" || !Number.isFinite(dross) || dross < 0) {
      return "dross_events must be non-negative number";
    }
    if (pierce === false) {
      const labels = job.labels ?? (job.labels = []);
      if (!labels.includes("pierce-fail")) labels.push("pierce-fail");
      job.weight = Math.max(job.weight ?? 1, 3.0);
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const thickness = Number(job.features.thickness_mm);
    const gas = String(job.features.assist_gas);
    const instruction =
      `Recommend laser pierce strategy and lead-in for ${material} ` +
      `${thickness.toFixed(1)}mm with ${gas} assist.`;
    const input = JSON.stringify(sortKeys(job.features));
    const output = JSON.stringify(sortKeys(job.actual));
    return { instruction, input, output };
  }
}

function sortKeys<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) out[k] = o[k];
  return out as T;
}

export const laserLoRADatasetBuilderEngine = new LaserLoRADatasetBuilderEngineImpl();
export type LaserLoRADatasetBuilderEngine = typeof laserLoRADatasetBuilderEngine;
