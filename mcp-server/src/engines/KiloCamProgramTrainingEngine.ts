/**
 * KiloCamProgramTrainingEngine — KILO-CAM-TRAINING-MS0 campaign iter 4
 *
 * Emits LoRA training tuples from an extracted CAM program corpus. Each
 * tuple shape:
 *
 *   input:  { part_id, system, features[] }
 *   output: { operations[] (strategy + tool_number), program_path }
 *
 * Consumes the normalized `ExtractedCamProgram` shape — the output of the
 * file-parser/decoder layer (Mastercam .mcx-8 reader, Okuma .min parser,
 * Fusion file-parser iter3, ...). Pure function — no I/O.
 *
 * The training corpus this targets:
 *   - 8,592 Mastercam .mcx/.mcx-8 files (from partlib manifest ext_counts)
 *   - 17,342 Okuma .min files
 *   - 4,837 Inventor .ipt + 581 .iam (when Fusion-converted to .f3d)
 *
 * Tuple count target: one tuple per program (i.e. ~30K tuples from the
 * JM-Die corpus alone) — substrate for Per-system LoRA (CAMLoRAAdapter
 * Trainer's `Priority4CAM` types).
 *
 * Per kilo refuse-list:
 *   - no-silent-fallback: programs with NO recognized features are
 *     surfaced in `programs_with_no_features[]`, NOT emitted as
 *     training rows (would teach the model garbage)
 *   - dropping-tolerance-stack-on-translate: if the source program
 *     carries per-op tolerance metadata, it flows through to the row
 *   - emitting-program-without-pmi-validation: this engine emits
 *     training data, NOT runnable programs — PMI gate not applicable
 *
 * @milestone KILO-CAM-TRAINING-MS0
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// INPUT SHAPE
// ============================================================================

export const CamProgramOperationSchema = z.object({
  op_id: z.string(),
  strategy: z.string(),
  tool_number: z.number().int().min(0).optional(),
  tolerance_total_mm: z.number().min(0).optional(),
});
export type CamProgramOperation = z.infer<typeof CamProgramOperationSchema>;

export const ExtractedCamProgramSchema = z.object({
  part_id: z.string(),
  program_path: z.string(),
  system: z.enum(["mastercam", "okuma", "fusion360", "hypermill", "esprit", "inventor_hsm", "solidcam"]),
  features: z.array(z.object({
    feature_id: z.string(),
    feature_type: z.string(),
    tolerance_total_mm: z.number().min(0).optional(),
  })),
  operations: z.array(CamProgramOperationSchema),
});
export type ExtractedCamProgram = z.infer<typeof ExtractedCamProgramSchema>;

// ============================================================================
// OUTPUT SHAPE
// ============================================================================

export const TrainingRowSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_cam_program_training"),
  part_id: z.string(),
  system: z.string(),
  /** Compact JSON-stringified feature list (LoRA input prompt). */
  input_features_json: z.string(),
  /** Compact JSON-stringified operation list (LoRA output prompt). */
  output_operations_json: z.string(),
  feature_count: z.number().int().min(0),
  op_count: z.number().int().min(0),
  source_program_path: z.string(),
});
export type TrainingRow = z.infer<typeof TrainingRowSchema>;

export const TrainingDatasetSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  source: z.literal("kilo_cam_program_training"),
  rows: z.array(TrainingRowSchema),
  total_rows: z.number().int().min(0),
  per_system_counts: z.record(z.string(), z.number().int().min(0)).default({}),
  programs_with_no_features: z.array(z.string()),
  programs_with_no_operations: z.array(z.string()),
  programs_input: z.number().int().min(0),
  programs_emitted: z.number().int().min(0),
});
export type TrainingDataset = z.infer<typeof TrainingDatasetSchema>;

// ============================================================================
// BUILD DATASET
// ============================================================================

export interface BuildOpts {
  /** Restrict to specified systems (defaults to all). */
  systems?: string[];
  /** Include programs with 0 operations (default: false — refuse to emit). */
  allow_empty_ops?: boolean;
}

function buildTrainingDataset(
  programs: ExtractedCamProgram[],
  opts?: BuildOpts,
): TrainingDataset {
  for (const p of programs) ExtractedCamProgramSchema.parse(p);

  const filterSystems = opts?.systems ? new Set(opts.systems) : null;
  const allowEmptyOps = opts?.allow_empty_ops ?? false;

  const rows: TrainingRow[] = [];
  const counts: Record<string, number> = {};
  const noFeatures: string[] = [];
  const noOps: string[] = [];

  for (const p of programs) {
    if (filterSystems && !filterSystems.has(p.system)) continue;

    // Refuse-list: programs with 0 features are training garbage
    if (p.features.length === 0) {
      noFeatures.push(p.part_id);
      continue;
    }

    // Refuse-list: programs with 0 operations are training garbage
    if (p.operations.length === 0) {
      noOps.push(p.part_id);
      if (!allowEmptyOps) continue;
    }

    rows.push({
      schemaVersion: "1.0.0",
      source: "kilo_cam_program_training",
      part_id: p.part_id,
      system: p.system,
      input_features_json: JSON.stringify(p.features),
      output_operations_json: JSON.stringify(p.operations),
      feature_count: p.features.length,
      op_count: p.operations.length,
      source_program_path: p.program_path,
    });
    counts[p.system] = (counts[p.system] ?? 0) + 1;
  }

  return {
    schemaVersion: "1.0.0",
    source: "kilo_cam_program_training",
    rows,
    total_rows: rows.length,
    per_system_counts: counts,
    programs_with_no_features: noFeatures,
    programs_with_no_operations: noOps,
    programs_input: programs.length,
    programs_emitted: rows.length,
  };
}

// ============================================================================
// CLASS WRAPPER
// ============================================================================

class KiloCamProgramTrainingEngine {
  static buildTrainingDataset = buildTrainingDataset;
}

export const kiloCamProgramTrainingEngine = KiloCamProgramTrainingEngine;
