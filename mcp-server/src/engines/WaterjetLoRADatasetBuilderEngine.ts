/**
 * WaterjetLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL07
 * ====================================================================
 *
 * Waterjet LoRA dataset builder. Q1-Q5 programs (quality levels) with
 * actual edge taper + cycle time. LoRA target: quality-to-feed mapping
 * per material.
 *
 * Q-level is captured in fingerprint so the train/val/test split
 * stratifies across all 5 quality regimes (preserves rare Q5 finishing
 * data).
 *
 * @module engines/WaterjetLoRADatasetBuilderEngine
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
  "quality_level",
  "abrasive_flow_g_min",
  "orifice_mm",
] as const;
const REQUIRED_ACTUAL_KEYS = [
  "edge_taper_deg",
  "cycle_time_s",
  "achieved_quality",
] as const;

class WaterjetLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;
  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "waterjet",
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
    const q = Number(job.features.quality_level ?? 3);
    return { ...job, fingerprint: { ...job.fingerprint, quality: `Q${q}` } };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null) return `missing feature ${k}`;
    }
    const q = Number(job.features.quality_level);
    if (!Number.isInteger(q) || q < 1 || q > 5) return "quality_level must be 1–5";
    for (const k of REQUIRED_ACTUAL_KEYS) {
      const v = job.actual[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return `missing or invalid actual ${k}`;
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const thickness = Number(job.features.thickness_mm);
    const q = Number(job.features.quality_level);
    const instruction =
      `Recommend waterjet feed for ${material} ${thickness.toFixed(1)}mm at Q${q}.`;
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

export const waterjetLoRADatasetBuilderEngine = new WaterjetLoRADatasetBuilderEngineImpl();
export type WaterjetLoRADatasetBuilderEngine = typeof waterjetLoRADatasetBuilderEngine;
