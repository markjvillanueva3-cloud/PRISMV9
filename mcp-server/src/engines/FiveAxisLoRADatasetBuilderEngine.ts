/**
 * FiveAxisLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL02
 * ===================================================================
 *
 * 5-axis LoRA dataset builder. Domain adds two axes beyond milling:
 *   - tilt angle relative to stock frame (singularity risk)
 *   - TCPC mode (tool-center-point-control on/off)
 *
 * The fingerprint captures (material, tool_class, op_type, machine_class,
 * tilt_bucket) so rare tilt regimes are preserved across the train/val
 * split.
 *
 * Singularity-aware sampling: jobs near gimbal-lock (|tilt-90°| < 5°)
 * are down-weighted in `validate()` (not dropped — their actuals are
 * particularly valuable for the adapter). Weight is preserved in
 * metadata.weight so downstream trainers can up-sample during batching.
 *
 * @module engines/FiveAxisLoRADatasetBuilderEngine
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
  "tool_class",
  "op_type",
  "machine_class",
  "tilt_deg",
  "tcpc_enabled",
] as const;

const REQUIRED_ACTUAL_KEYS = ["surface_ra_um"] as const;

/** Gimbal-lock proximity threshold for singularity weighting. */
const SINGULARITY_DEG = 5;

class FiveAxisLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;

  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "5axis",
      validate: (job) => this.validate(job),
      render: (job) => this.render(job),
    });
  }

  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
    // Inject derived fingerprint axis (tilt_bucket) before passing down.
    const enriched = jobs.map((j) => this.enrichFingerprint(j));
    return this.builder.build(enriched, split);
  }

  requiredSchema(): { features: readonly string[]; actuals: readonly string[] } {
    return { features: REQUIRED_FEATURE_KEYS, actuals: REQUIRED_ACTUAL_KEYS };
  }

  private enrichFingerprint(job: RawJob): RawJob {
    const tilt = Number(job.features.tilt_deg ?? 0);
    // Bucket tilt in 10° increments so splits are stable across reruns.
    const tiltBucket = `t${Math.round(tilt / 10) * 10}`;
    return {
      ...job,
      fingerprint: { ...job.fingerprint, tilt_bucket: tiltBucket },
    };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null || job.features[k] === "") {
        return `missing feature ${k}`;
      }
    }
    const ra = job.actual["surface_ra_um"];
    if (typeof ra !== "number" || !Number.isFinite(ra) || ra <= 0) {
      return `missing or invalid surface_ra_um`;
    }
    // Singularity-aware: near gimbal-lock, boost weight so adapter sees
    // these rare cases more often. Preserve existing weight if caller
    // already set one.
    const tilt = Number(job.features.tilt_deg ?? 0);
    if (Math.abs(tilt - 90) < SINGULARITY_DEG) {
      job.weight = Math.max(job.weight ?? 1, 2.0);
      const labels = job.labels ?? (job.labels = []);
      if (!labels.includes("near-singularity")) labels.push("near-singularity");
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const opType = String(job.features.op_type);
    const tcpc = job.features.tcpc_enabled ? "with TCPC" : "without TCPC";
    const tilt = Number(job.features.tilt_deg ?? 0).toFixed(1);
    const instruction =
      `Recommend 5-axis tool-axis and feed/speed for ${opType} on ${material} ` +
      `at tilt=${tilt}° ${tcpc}.`;
    const input = JSON.stringify(sortKeys(job.features));
    const output = JSON.stringify(sortKeys(job.actual));
    return { instruction, input, output };
  }
}

function sortKeys<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out as T;
}

export const fiveAxisLoRADatasetBuilderEngine = new FiveAxisLoRADatasetBuilderEngineImpl();
export type FiveAxisLoRADatasetBuilderEngine = typeof fiveAxisLoRADatasetBuilderEngine;
