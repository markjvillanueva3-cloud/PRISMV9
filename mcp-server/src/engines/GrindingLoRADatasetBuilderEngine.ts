/**
 * GrindingLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL08
 * ====================================================================
 *
 * Grinding LoRA dataset builder. Covers traverse, plunge, creep-feed +
 * actual Ra + wheel wear + burn-risk events. LoRA target: infeed,
 * spark-out schedule, dress interval.
 *
 * Burn events are labeled "burn" — they are the costliest failure mode
 * (scrap + re-dress). Jobs with burn events get weight 2.5.
 *
 * @module engines/GrindingLoRADatasetBuilderEngine
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
  "wheel_grit",
  "grinding_mode",
  "wheel_diameter_mm",
  "coolant_type",
] as const;
const REQUIRED_ACTUAL_KEYS = [
  "achieved_ra_um",
  "wheel_wear_mm",
  "burn_event",
] as const;

const GRINDING_MODES = new Set(["traverse", "plunge", "creep-feed"]);

class GrindingLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;
  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "grinding",
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
    return {
      ...job,
      fingerprint: {
        ...job.fingerprint,
        mode: String(job.features.grinding_mode ?? "unknown"),
      },
    };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null) return `missing feature ${k}`;
    }
    const mode = String(job.features.grinding_mode);
    if (!GRINDING_MODES.has(mode)) return `grinding_mode must be one of ${[...GRINDING_MODES].join("|")}`;
    const ra = job.actual["achieved_ra_um"];
    if (typeof ra !== "number" || !Number.isFinite(ra) || ra <= 0) return "invalid achieved_ra_um";
    const wear = job.actual["wheel_wear_mm"];
    if (typeof wear !== "number" || !Number.isFinite(wear) || wear < 0) return "invalid wheel_wear_mm";
    const burn = job.actual["burn_event"];
    if (typeof burn !== "boolean") return "burn_event must be boolean";
    if (burn === true) {
      const labels = job.labels ?? (job.labels = []);
      if (!labels.includes("burn")) labels.push("burn");
      job.weight = Math.max(job.weight ?? 1, 2.5);
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const grit = job.features.wheel_grit;
    const mode = String(job.features.grinding_mode);
    const instruction =
      `Recommend grinding ${mode} infeed/spark-out for ${material} with grit ${grit}.`;
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

export const grindingLoRADatasetBuilderEngine = new GrindingLoRADatasetBuilderEngineImpl();
export type GrindingLoRADatasetBuilderEngine = typeof grindingLoRADatasetBuilderEngine;
