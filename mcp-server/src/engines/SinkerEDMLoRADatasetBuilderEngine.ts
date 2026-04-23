/**
 * SinkerEDMLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL05
 * ====================================================================
 *
 * Sinker EDM LoRA dataset builder. Captures multi-electrode sequences +
 * actual wear + surface finish. LoRA target: optimal electrode
 * sequencing and orbit radius schedule.
 *
 * Fingerprint includes cavity complexity class (depth-to-width ratio
 * bucket) so rare deep-pocket jobs are preserved.
 *
 * @module engines/SinkerEDMLoRADatasetBuilderEngine
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
  "electrode_material",
  "cavity_depth_mm",
  "cavity_width_mm",
  "electrode_count",
] as const;
const REQUIRED_ACTUAL_KEYS = [
  "total_wear_mm",
  "achieved_ra_um",
  "cycle_time_min",
] as const;

class SinkerEDMLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;
  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "sinker-edm",
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
    const depth = Number(job.features.cavity_depth_mm ?? 0);
    const width = Number(job.features.cavity_width_mm ?? 1);
    const aspect = depth / Math.max(width, 0.1);
    let complexityBucket = "simple";
    if (aspect > 5) complexityBucket = "deep";
    else if (aspect > 2) complexityBucket = "moderate";
    return {
      ...job,
      fingerprint: { ...job.fingerprint, complexity: complexityBucket },
    };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null) return `missing feature ${k}`;
    }
    for (const k of REQUIRED_ACTUAL_KEYS) {
      const v = job.actual[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return `missing or invalid actual ${k}`;
    }
    // Deep cavities (aspect > 5) are rare and valuable — boost weight.
    const depth = Number(job.features.cavity_depth_mm ?? 0);
    const width = Number(job.features.cavity_width_mm ?? 1);
    if (width > 0 && depth / width > 5) {
      job.weight = Math.max(job.weight ?? 1, 2.0);
      const labels = job.labels ?? (job.labels = []);
      if (!labels.includes("deep-cavity")) labels.push("deep-cavity");
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const electrode = String(job.features.electrode_material);
    const electrodeCount = Number(job.features.electrode_count);
    const depth = Number(job.features.cavity_depth_mm);
    const instruction =
      `Sequence ${electrodeCount} ${electrode} electrodes for a sinker-EDM ` +
      `cavity in ${material}, depth ${depth.toFixed(1)}mm.`;
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

export const sinkerEDMLoRADatasetBuilderEngine = new SinkerEDMLoRADatasetBuilderEngineImpl();
export type SinkerEDMLoRADatasetBuilderEngine = typeof sinkerEDMLoRADatasetBuilderEngine;
