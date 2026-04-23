/**
 * wedmDLCoreSchemas.ts — MS-P4-DL-CORE dispatcher-boundary Zod schemas.
 * Covers job-outcome ingestion, LoRA adapter ops, EWC schedule presets,
 * and few-shot material bootstrap/predict.
 */
import { z } from "zod";

const finiteNum = z.number().refine(Number.isFinite, "must be finite");
const nonNegNum = finiteNum.refine((n) => n >= 0, "must be non-negative");
const posNum = finiteNum.refine((n) => n > 0, "must be positive");
const numArray = z.array(finiteNum);
const numMatrix = z.array(z.array(finiteNum));

const recipeSchema = z.object({
  peakCurrentA: finiteNum,
  pulseOnUs: posNum,
  pulseOffUs: posNum,
  wireTensionN: posNum,
}).passthrough();

const predictionSchema = z.object({
  raUm: finiteNum.optional(),
  cycleTimeMin: finiteNum.optional(),
  wireBreaks: finiteNum.optional(),
}).passthrough();

export const WEDM_DL_CORE_SCHEMAS = {
  wedm_learn_from_job: z.object({
    jobId: z.string().min(1),
    finishedAt: z.string().min(1),
    material: z.string().min(1),
    thicknessMm: posNum,
    wireDiameterMm: posNum,
    wireMaterial: z.string().min(1),
    controller: z.string().min(1),
    predicted: predictionSchema,
    actual: predictionSchema,
    recipe: recipeSchema,
    recordedBy: z.string().min(1).optional(),
  }).passthrough(),

  wedm_job_history_stats: z.object({}).passthrough().optional(),

  wedm_lora_create: z.object({
    name: z.string().min(1),
    rank: z.number().int().positive(),
    alpha: posNum,
    dIn: z.number().int().positive(),
    dOut: z.number().int().positive(),
    seed: z.number().int().optional(),
  }).passthrough(),

  wedm_lora_set_scale: z.object({
    name: z.string().min(1),
    scale: finiteNum,
  }).passthrough(),

  wedm_lora_forward: z.object({
    name: z.string().min(1),
    x: numArray,
    W0: numMatrix,
  }).passthrough(),

  wedm_ewc_schedule: z.object({
    preset: z.enum(["mnist-like", "split-cifar", "permuted-mnist", "wedm-default"]),
  }).passthrough(),

  wedm_fewshot_bootstrap: z.object({
    material: z.string().min(1),
    samples: z.array(z.object({
      x: numArray,
      target: numArray,
    }).passthrough()).min(1),
    dIn: z.number().int().positive(),
    dOut: z.number().int().positive(),
    rank: z.number().int().positive().optional(),
    alpha: posNum.optional(),
    lr: posNum.optional(),
    nEpochs: z.number().int().positive().optional(),
    seed: z.number().int().optional(),
    baseLinear: z.object({
      W0: numMatrix,
      b: numArray,
    }).passthrough().optional(),
    consolidate: z.boolean().optional(),
  }).passthrough(),

  wedm_fewshot_predict: z.object({
    material: z.string().min(1),
    x: numArray,
    baseLinear: z.object({
      W0: numMatrix,
      b: numArray,
    }).passthrough().optional(),
  }).passthrough(),

  wedm_fewshot_list: z.object({}).passthrough().optional(),

  // MS-P4-DL-PRED predictor boundary schemas
  wedm_predict_ra_v2: z.object({
    material: z.string().min(1),
    peakCurrentA: posNum,
    pulseOnUs: posNum,
    useAdapter: z.boolean().optional(),
  }).passthrough(),

  wedm_train_ra_adapter: z.object({
    material: z.string().min(1),
    samples: z.array(z.object({
      input: z.object({}).passthrough(),
      measuredRaUm: finiteNum,
    }).passthrough()).min(1),
    epochs: z.number().int().positive().optional(),
    lr: posNum.optional(),
    seed: z.number().int().optional(),
    rank: z.number().int().positive().optional(),
    alpha: posNum.optional(),
  }).passthrough(),

  wedm_predict_break: z.object({
    peakCurrentA: posNum,
    wireDiameterMm: posNum,
    thicknessMm: posNum,
    useAdapter: z.boolean().optional(),
    cumulativeCutMin: nonNegNum.optional(),
    horizonMin: posNum.optional(),
  }).passthrough(),

  wedm_evaluate_break: z.object({
    samples: z.array(z.object({
      input: z.object({}).passthrough(),
      broke: z.boolean(),
    }).passthrough()).min(1),
    horizonMin: posNum.optional(),
    binCount: z.number().int().positive().optional(),
  }).passthrough(),

  wedm_predict_recast: z.object({
    material: z.string().min(1),
    voltageV: posNum,
    peakCurrentA: posNum,
    pulseOnUs: posNum,
    useAdapter: z.boolean().optional(),
  }).passthrough(),

  wedm_train_recast_adapter: z.object({
    material: z.string().min(1),
    samples: z.array(z.object({
      input: z.object({}).passthrough(),
      measuredDepthUm: finiteNum,
    }).passthrough()).min(1),
    epochs: z.number().int().positive().optional(),
    lr: posNum.optional(),
    seed: z.number().int().optional(),
  }).passthrough(),
} as const;
