/**
 * WEDMLoRADatasetBuilderEngine -- CAM-ML-CLOSEDLOOP-MS0 (slot:india, U-LORA-WEDM-DATASET)
 * =====================================================================================
 *
 * Builds LoRA fine-tuning datasets for wire-EDM operations by wrapping
 * {@link BaseLoRADatasetBuilder} with a WEDM-specific render function and
 * validation policy. WEDM was the ONE machine-type in the
 * MachineLoRABaseEngine family (milling, 5-axis, mill-turn, WEDM, sinker EDM,
 * laser, waterjet, grinding) whose builder was a 0-byte empty placeholder --
 * this implements it from the established Milling/Grinding sibling pattern so
 * WEDM (PRISM's deepest domain) has a LoRA dataset builder like its siblings.
 *
 * INPUT: RawJob records sourced from the WEDM PrintToProgram pipeline + cut
 *        actuals. Each job's `features` must include at minimum
 *        { material, wire_diameter, op_type, machine_class }; the recommended
 *        discharge settings live in `actual`.
 *
 * OUTPUT: Alpaca-format instruction-tuning examples where:
 *   - instruction: "Recommend wire-EDM discharge parameters for <op_type> on
 *     <material> with <wire_diameter>mm wire on a <machine_class> machine."
 *   - input:       JSON-serialized features (stable key order)
 *   - output:      JSON-serialized actual discharge result (ground truth)
 *
 * REQUIRED_ACTUAL_KEYS = the core WEDM generator settings (peak_current,
 * pulse_on, pulse_off) -- the canonical discharge vocabulary verified against
 * the live WEDM engine corpus (peak_current/pulse_on/pulse_off are the three
 * most-referenced discharge params). The builder DEFINES this contract;
 * collectors align to requiredSchema() (same pattern as the Milling sibling).
 * WEDM physics/parameter doctrine is mike's domain -- this engine only assembles
 * the dataset; it does not compute or validate discharge physics.
 *
 * FINGERPRINT AXES: (material, wire_diameter, op_type, machine_class) -- 4-way
 *                   stratification preserves rare wire/material/op combinations.
 *
 * @module engines/WEDMLoRADatasetBuilderEngine
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
  "wire_diameter",
  "op_type",
  "machine_class",
] as const;

const REQUIRED_ACTUAL_KEYS = ["peak_current", "pulse_on", "pulse_off"] as const;

class WEDMLoRADatasetBuilderEngineImpl {
  private readonly builder: BaseLoRADatasetBuilder;

  constructor() {
    this.builder = new BaseLoRADatasetBuilder({
      machineType: "wedm",
      validate: (job) => this.validate(job),
      render: (job) => this.render(job),
    });
  }

  /**
   * Build dataset from WEDM jobs. Rejects jobs missing required feature keys
   * or required (positive, finite) discharge actual keys.
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
        // return non-null to skip -- the base builder drops jobs on any non-null.
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
    const wireDiameter = String(job.features.wire_diameter);
    const opType = String(job.features.op_type);
    const machineClass = String(job.features.machine_class);
    const instruction =
      `Recommend wire-EDM discharge parameters for ${opType} on ${material} ` +
      `with ${wireDiameter}mm wire on a ${machineClass} machine.`;
    // stable key order -> deterministic dataset fingerprint
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

export const wedmLoRADatasetBuilderEngine = new WEDMLoRADatasetBuilderEngineImpl();
export type WEDMLoRADatasetBuilderEngine = typeof wedmLoRADatasetBuilderEngine;
