/**
 * MillingLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
 * =================================================================
 *
 * Builds LoRA fine-tuning datasets for milling operations by wrapping
 * {@link BaseLoRADatasetBuilder} with a milling-specific render function
 * and validation policy.
 *
 * INPUT: RawJob records sourced from PrintToProgramPipeline outputs +
 *        CMM actuals + ERP actuals. Each job's `features` must include
 *        at minimum { material, tool_class, op_type, machine_class,
 *        ap_mm, ae_mm, fz_mm_rev_tooth, vc_m_min }.
 *
 * OUTPUT: Alpaca-format instruction-tuning examples where:
 *   - instruction: "Recommend milling feed/speed/strategy for <op_type>
 *     on <material> with <tool_class>."
 *   - input:       JSON-serialized features (stable key order)
 *   - output:      JSON-serialized actual result (the ground truth
 *                  parameter set)
 *
 * FINGERPRINT AXES: (material, tool_class, op_type, machine_class) —
 *                   4-way stratification preserves rare combinations.
 *
 * @module engines/MillingLoRADatasetBuilderEngine
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
] as const;

const REQUIRED_ACTUAL_KEYS = ["rpm", "feed_mm_min"] as const;

class MillingLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;

  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "milling",
      validate: (job) => this.validate(job),
      render: (job) => this.render(job),
    });
  }

  /**
   * Build dataset from milling jobs. Rejects jobs missing required
   * feature keys or required actual keys.
   */
  buildDataset(jobs: RawJob[], split: DatasetSplitConfig = DEFAULT_SPLIT): DatasetBuildResult {
    return this.builder.build(jobs, split);
  }

  /**
   * Return the required schema so upstream collectors know what to send.
   */
  requiredSchema(): { features: readonly string[]; actuals: readonly string[] } {
    return { features: REQUIRED_FEATURE_KEYS, actuals: REQUIRED_ACTUAL_KEYS };
  }

  private validate(job: RawJob): string | null {
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (job.features[k] === undefined || job.features[k] === null || job.features[k] === "") {
        // return non-null to skip — the base builder drops jobs on any non-null.
        return `missing feature ${k}`;
      }
    }
    for (const k of REQUIRED_ACTUAL_KEYS) {
      const v = job.actual[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
        return `missing or invalid actual ${k}`;
      }
    }
    // Accept. Returning null means "include" per base builder contract.
    return null;
  }

  private render(job: RawJob): { instruction: string; input: string; output: string } {
    const material = String(job.features.material);
    const toolClass = String(job.features.tool_class);
    const opType = String(job.features.op_type);
    const machineClass = String(job.features.machine_class);
    const instruction =
      `Recommend milling feed/speed/strategy for ${opType} on ${material} ` +
      `with ${toolClass} on a ${machineClass} machine.`;
    // stable key order → deterministic dataset fingerprint
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

export const millingLoRADatasetBuilderEngine = new MillingLoRADatasetBuilderEngineImpl();
export type MillingLoRADatasetBuilderEngine = typeof millingLoRADatasetBuilderEngine;
