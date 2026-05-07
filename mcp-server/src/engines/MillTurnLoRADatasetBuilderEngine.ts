/**
 * MillTurnLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL03
 * ===================================================================
 *
 * Mill-turn LoRA dataset builder. Captures multi-channel sync performance:
 *   - wait_ms_per_sync         — idle time at each sync marker
 *   - channel_imbalance_ratio  — max(T1, T2, ...) / sum(Ti)
 *   - sub_spindle_transfer_ms  — stock handoff duration
 *
 * These metrics drive the adapter's understanding of optimal channel
 * allocation and sub-spindle handoff timing. The LoRA is trained to
 * minimize aggregate wait time subject to workholding constraints.
 *
 * @module engines/MillTurnLoRADatasetBuilderEngine
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
  "part_class",
  "machine_class",
  "channel_count",
  "sub_spindle",
] as const;

const REQUIRED_ACTUAL_KEYS = [
  "wait_ms_per_sync",
  "channel_imbalance_ratio",
] as const;

class MillTurnLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;

  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "millturn",
      validate: (job) => this.validate(job),
      render: (job) => this.render(job),
    });
  }

  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
    return this.builder.build(jobs.map((j) => this.enrichFingerprint(j)), split);
  }

  requiredSchema(): { features: readonly string[]; actuals: readonly string[] } {
    return { features: REQUIRED_FEATURE_KEYS, actuals: REQUIRED_ACTUAL_KEYS };
  }

  private enrichFingerprint(job: RawJob): RawJob {
    const channels = Number(job.features.channel_count ?? 1);
    const subSpindle = Boolean(job.features.sub_spindle);
    return {
      ...job,
      fingerprint: {
        ...job.fingerprint,
        channels: `c${channels}`,
        subSpindle: subSpindle ? "ss1" : "ss0",
      },
    };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null) {
        return `missing feature ${k}`;
      }
    }
    for (const k of REQUIRED_ACTUAL_KEYS) {
      const v = job.actual[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return `missing or invalid actual ${k}`;
      }
    }
    const imbalance = Number(job.actual["channel_imbalance_ratio"]);
    if (imbalance > 0.95) {
      // heavily imbalanced — label so trainer can over-sample
      const labels = job.labels ?? (job.labels = []);
      if (!labels.includes("imbalanced")) labels.push("imbalanced");
    }
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const partClass = String(job.features.part_class);
    const channels = Number(job.features.channel_count);
    const ss = job.features.sub_spindle ? "with sub-spindle" : "no sub-spindle";
    const instruction =
      `Allocate mill-turn channels for a ${partClass} in ${material} using ` +
      `${channels} channels ${ss}.`;
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

export const millTurnLoRADatasetBuilderEngine = new MillTurnLoRADatasetBuilderEngineImpl();
export type MillTurnLoRADatasetBuilderEngine = typeof millTurnLoRADatasetBuilderEngine;
