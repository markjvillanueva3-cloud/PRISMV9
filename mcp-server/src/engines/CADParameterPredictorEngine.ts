/**
 * CADParameterPredictorEngine — U-CADC31
 *
 * Given target geometry (volume, bbox, face/edge counts, optional feature
 * type or U-CADC30 LearningClassification), predict the parameters needed
 * to drive a CAD generator (extrusion depth, hole diameter/depth, fillet
 * radius, chamfer size, pocket depth, slot dims, thread pitch, boss dims,
 * groove dims, counterbore/countersink dims).
 *
 * Predictor uses a feature-conditioned linear regression of the form
 *     y = clamp(intercept + Σ w_i · x_i, min, max)
 * with coefficients persisted to data/models/cad_param_predictor.json.
 *
 * The shipped coefficients are *analytic priors* — derived from the
 * U-CADC30 classifier thresholds, the FeatureRecognitionEngine taxonomy,
 * ISO 261 / 286 / 4762 sizing tables, ISO 13715 cosmetic-edge ranges, and
 * the JM Die hole-distribution histogram (24,545 programs). The same
 * inference call signature accepts retrained corpus coefficients without
 * any code change — `train()` updates the JSON in place.
 *
 * Outputs follow the AtomicValue contract: { value, unit, uncertainty,
 * confidence, source }. Uncertainties are derived per-output from
 * default_uncertainty_pct in the model file plus a per-feature confidence
 * blend (lower confidence → wider band).
 *
 * Spec: U-CADC31 — exit "RMSE < 5% on parameter prediction" is checked by
 * `evaluate(samples)` which writes RMSE/MAE back into the model JSON.
 */

import { z } from "zod";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { FeatureType } from "./FeatureRecognitionEngine.js";
import type { LearningClassification } from "./CADFeatureClassifierEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface TargetGeometry {
  volume_mm3: number;
  bbox: { x_mm: number; y_mm: number; z_mm: number };
  faceCount: number;
  edgeCount: number;
  featureType?: FeatureType;
  classification?: LearningClassification;
}

/** All predictable CAD parameters. Predictor returns subset relevant to the geometry. */
export type PredictableParam =
  | "extrusion_depth_mm"
  | "hole_diameter_mm"
  | "hole_depth_mm"
  | "fillet_radius_mm"
  | "chamfer_size_mm"
  | "pocket_depth_mm"
  | "slot_width_mm"
  | "slot_length_mm"
  | "thread_pitch_mm"
  | "boss_diameter_mm"
  | "boss_height_mm"
  | "groove_width_mm"
  | "groove_depth_mm"
  | "countersink_angle_deg"
  | "counterbore_diameter_mm"
  | "counterbore_depth_mm";

export interface AtomicPrediction {
  value: number;
  unit: string;
  uncertainty: number; // absolute, same unit
  confidence: number;  // 0..1
  source: string;
  warning?: string;
}

export type PredictionSet = Partial<Record<PredictableParam, AtomicPrediction>>;

export interface PredictionResult {
  geometryFingerprint: { longestDim_mm: number; aspectRatio: number };
  parameters: PredictionSet;
  meanConfidence: number;
  rationale: string[];
}

export interface TrainingSample {
  geometry: TargetGeometry;
  truth: PredictionSet;
}

export interface EvaluationReport {
  validationSetSize: number;
  perParam: Record<string, { rmsePct: number; maeAbs: number; n: number }>;
  overall: { rmsePct: number; maeAbs: number };
  passesExitCriterion: boolean; // RMSE < 5%
  evaluatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Model file schema
// ─────────────────────────────────────────────────────────────────────────────

const OutputSpecSchema = z.object({
  intercept: z.number(),
  weights: z.record(z.string(), z.number()),
  minValue: z.number(),
  maxValue: z.number(),
  defaultUncertainty_pct: z.number(),
  source: z.string(),
});

const ModelSchema = z.object({
  schemaVersion: z.number(),
  modelId: z.string(),
  modelType: z.string(),
  version: z.string(),
  trainedOn: z.string().nullable(),
  trainedAt: z.string().nullable(),
  corpusSize: z.number(),
  notes: z.string(),
  inputFeatures: z.array(z.string()),
  outputs: z.record(z.string(), OutputSpecSchema),
  metrics: z.object({
    rmsePct: z.number().nullable(),
    maeAbs: z.number().nullable(),
    validationSetSize: z.number(),
    lastEvaluatedAt: z.string().nullable(),
  }),
});

type Model = z.infer<typeof ModelSchema>;
type OutputSpec = z.infer<typeof OutputSpecSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Feature → relevant outputs mapping
// Each FeatureType only emits parameters that physically make sense for it.
// ─────────────────────────────────────────────────────────────────────────────

const FEATURE_OUTPUTS: Record<FeatureType, PredictableParam[]> = {
  through_hole:       ["hole_diameter_mm", "hole_depth_mm"],
  blind_hole:         ["hole_diameter_mm", "hole_depth_mm"],
  counterbore:        ["hole_diameter_mm", "hole_depth_mm", "counterbore_diameter_mm", "counterbore_depth_mm"],
  countersink:        ["hole_diameter_mm", "hole_depth_mm", "countersink_angle_deg"],
  tapped_hole:        ["hole_diameter_mm", "hole_depth_mm", "thread_pitch_mm"],
  pocket_rectangular: ["pocket_depth_mm", "fillet_radius_mm"],
  pocket_circular:    ["pocket_depth_mm", "fillet_radius_mm"],
  pocket_freeform:    ["pocket_depth_mm", "fillet_radius_mm"],
  slot_through:       ["slot_width_mm", "slot_length_mm"],
  slot_blind:         ["slot_width_mm", "slot_length_mm", "pocket_depth_mm"],
  keyway:             ["slot_width_mm", "slot_length_mm", "pocket_depth_mm"],
  boss_circular:      ["boss_diameter_mm", "boss_height_mm", "fillet_radius_mm"],
  boss_rectangular:   ["boss_diameter_mm", "boss_height_mm", "fillet_radius_mm"],
  fillet:             ["fillet_radius_mm"],
  chamfer:            ["chamfer_size_mm"],
  face:               ["extrusion_depth_mm"],
  step:               ["extrusion_depth_mm", "fillet_radius_mm"],
  groove:             ["groove_width_mm", "groove_depth_mm"],
  thread_external:    ["hole_diameter_mm", "thread_pitch_mm"],
  thread_internal:    ["hole_diameter_mm", "hole_depth_mm", "thread_pitch_mm"],
  pocket_complex:     ["pocket_depth_mm", "fillet_radius_mm"],
  slot_dovetail:      ["slot_width_mm", "slot_length_mm", "pocket_depth_mm"],
  slot_t_shaped:      ["slot_width_mm", "slot_length_mm", "pocket_depth_mm"],
  contour_2d:         ["extrusion_depth_mm"],
  contour_3d:         ["extrusion_depth_mm", "fillet_radius_mm"],
};

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../data/models/cad_param_predictor.json",
);

export class CADParameterPredictorEngine {
  private model: Model;
  private modelPath: string;

  constructor(modelPath: string = DEFAULT_MODEL_PATH) {
    this.modelPath = modelPath;
    this.model = this.loadModel(modelPath);
  }

  private loadModel(path: string): Model {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return ModelSchema.parse(raw);
  }

  /** Reload model JSON from disk — useful after train() in a long-running process. */
  reload(): void {
    this.model = this.loadModel(this.modelPath);
  }

  /** Inspect loaded model metadata (no copy — caller must not mutate). */
  getModelInfo(): { version: string; corpusSize: number; rmsePct: number | null; trainedAt: string | null } {
    return {
      version: this.model.version,
      corpusSize: this.model.corpusSize,
      rmsePct: this.model.metrics.rmsePct,
      trainedAt: this.model.trainedAt,
    };
  }

  /**
   * Predict the relevant parameter set for a target geometry.
   * If `geometry.featureType` (or `geometry.classification.featureType`) is
   * supplied, only the parameters listed in FEATURE_OUTPUTS for that type
   * are emitted. Otherwise every output in the model is predicted.
   */
  predict(geometry: TargetGeometry): PredictionResult {
    if (geometry.volume_mm3 <= 0) {
      throw new Error("CADParameterPredictor: volume_mm3 must be > 0");
    }
    if (geometry.bbox.x_mm <= 0 || geometry.bbox.y_mm <= 0 || geometry.bbox.z_mm <= 0) {
      throw new Error("CADParameterPredictor: every bbox dimension must be > 0");
    }
    if (geometry.faceCount < 0 || geometry.edgeCount < 0) {
      throw new Error("CADParameterPredictor: face/edge counts must be ≥ 0");
    }

    const inputs = this.buildInputs(geometry);
    const ftype = geometry.featureType ?? geometry.classification?.featureType;
    const wanted: PredictableParam[] = ftype
      ? FEATURE_OUTPUTS[ftype]
      : (Object.keys(this.model.outputs) as PredictableParam[]);

    const baseConf =
      geometry.classification?.confidence ??
      this.heuristicConfidence(geometry, ftype);

    const params: PredictionSet = {};
    const rationale: string[] = [];
    let confSum = 0;
    let confN = 0;

    for (const name of wanted) {
      const spec = this.model.outputs[name];
      if (!spec) continue;
      const pred = this.predictOne(name, spec, inputs, baseConf);
      params[name] = pred;
      rationale.push(`${name}: ${pred.value.toFixed(3)} ${pred.unit} (±${pred.uncertainty.toFixed(3)}, conf=${pred.confidence.toFixed(2)})`);
      confSum += pred.confidence;
      confN += 1;
    }

    return {
      geometryFingerprint: {
        longestDim_mm: inputs.longestDim,
        aspectRatio: inputs.aspectRatio,
      },
      parameters: params,
      meanConfidence: confN > 0 ? confSum / confN : 0,
      rationale,
    };
  }

  private predictOne(
    name: PredictableParam,
    spec: OutputSpec,
    inputs: ReturnType<CADParameterPredictorEngine["buildInputs"]>,
    baseConf: number,
  ): AtomicPrediction {
    const x: Record<string, number> = {
      longestDim:  inputs.longestDim,
      bbox_x:      inputs.bbox_x,
      bbox_y:      inputs.bbox_y,
      bbox_z:      inputs.bbox_z,
      bbox_min_xy: inputs.bbox_min_xy,
      bbox_max_xy: inputs.bbox_max_xy,
      faceCount:   inputs.faceCount,
      edgeCount:   inputs.edgeCount,
      // hole_diameter is a special back-reference for thread/cbore — when
      // not yet predicted in this call, fall back to bbox heuristic.
      hole_diameter: 0.18 * inputs.bbox_min_xy,
    };

    let raw = spec.intercept;
    for (const [key, w] of Object.entries(spec.weights)) {
      const val = x[key];
      if (val === undefined) {
        throw new Error(`CADParameterPredictor: model references unknown input "${key}" for output "${name}"`);
      }
      raw += w * val;
    }

    let warning: string | undefined;
    let value = raw;
    if (raw < spec.minValue) { value = spec.minValue; warning = `clamped to minValue ${spec.minValue}`; }
    if (raw > spec.maxValue) { value = spec.maxValue; warning = `clamped to maxValue ${spec.maxValue}`; }

    // Uncertainty: spec %·value, widened by (1 − confidence)·50%.
    const pct = spec.defaultUncertainty_pct / 100;
    const widening = 1 + (1 - baseConf) * 0.5;
    const uncertainty = Math.max(value * pct * widening, 1e-6);

    const unit = name.endsWith("_mm") ? "mm" : name.endsWith("_deg") ? "deg" : "";

    return {
      value,
      unit,
      uncertainty,
      confidence: baseConf,
      source: spec.source,
      ...(warning ? { warning } : {}),
    };
  }

  private buildInputs(g: TargetGeometry) {
    const longestDim = Math.max(g.bbox.x_mm, g.bbox.y_mm, g.bbox.z_mm);
    const shortestDim = Math.min(g.bbox.x_mm, g.bbox.y_mm, g.bbox.z_mm);
    return {
      bbox_x: g.bbox.x_mm,
      bbox_y: g.bbox.y_mm,
      bbox_z: g.bbox.z_mm,
      bbox_min_xy: Math.min(g.bbox.x_mm, g.bbox.y_mm),
      bbox_max_xy: Math.max(g.bbox.x_mm, g.bbox.y_mm),
      longestDim,
      aspectRatio: longestDim / Math.max(shortestDim, 1e-9),
      faceCount: g.faceCount,
      edgeCount: g.edgeCount,
    };
  }

  private heuristicConfidence(g: TargetGeometry, ftype?: FeatureType): number {
    // No classification → start at 0.6, deduct for extreme aspect ratio
    // (sliver geometry breaks linear priors), boost when feature type is known.
    const inputs = this.buildInputs(g);
    let c = ftype ? 0.78 : 0.6;
    if (inputs.aspectRatio > 50) c -= 0.2;
    else if (inputs.aspectRatio > 20) c -= 0.1;
    if (g.faceCount === 0 && g.edgeCount === 0) c -= 0.05; // hint that geometry is synthetic
    return Math.max(0.05, Math.min(1, c));
  }

  /**
   * Train (refit) the linear coefficients per output from samples.
   * Uses ordinary least squares per output; falls back to existing prior
   * when a sample is missing the truth value for an output. Persists
   * updated coefficients + version to the JSON model file.
   */
  train(samples: TrainingSample[], opts: { corpusName?: string } = {}): { updated: PredictableParam[]; n: number } {
    if (samples.length < 3) {
      throw new Error("CADParameterPredictor.train: need ≥3 samples to refit any output");
    }

    const updated: PredictableParam[] = [];
    for (const [outputName, spec] of Object.entries(this.model.outputs)) {
      const featureKeys = Object.keys(spec.weights);
      if (featureKeys.length === 0) continue; // pure-intercept output (e.g. countersink_angle_deg)

      const usable = samples.filter(
        (s) => s.truth[outputName as PredictableParam]?.value !== undefined,
      );
      if (usable.length < featureKeys.length + 2) continue; // need rank + degrees of freedom

      const fitted = this.fitOLS(usable, outputName as PredictableParam, featureKeys);
      if (fitted) {
        spec.intercept = fitted.intercept;
        for (let i = 0; i < featureKeys.length; i += 1) {
          spec.weights[featureKeys[i]] = fitted.weights[i];
        }
        updated.push(outputName as PredictableParam);
      }
    }

    this.model.trainedOn = opts.corpusName ?? "ad-hoc";
    this.model.trainedAt = new Date().toISOString();
    this.model.corpusSize = samples.length;
    this.model.version = this.bumpVersion(this.model.version);
    writeFileSync(this.modelPath, JSON.stringify(this.model, null, 2));
    return { updated, n: samples.length };
  }

  /**
   * Evaluate the loaded model against held-out samples. Writes RMSE/MAE
   * back into the model JSON metrics block. RMSE < 5% satisfies the
   * U-CADC31 exit criterion.
   */
  evaluate(samples: TrainingSample[]): EvaluationReport {
    if (samples.length === 0) {
      throw new Error("CADParameterPredictor.evaluate: empty validation set");
    }
    const perParam: Record<string, { rmsePct: number; maeAbs: number; n: number }> = {};
    let totalSqErrPct = 0;
    let totalAbsErr = 0;
    let totalN = 0;

    for (const outputName of Object.keys(this.model.outputs)) {
      const errsAbs: number[] = [];
      const errsPct: number[] = [];
      for (const s of samples) {
        const truth = s.truth[outputName as PredictableParam];
        if (!truth) continue;
        const pred = this.predict({ ...s.geometry, featureType: undefined }).parameters[outputName as PredictableParam];
        if (!pred) continue;
        const errAbs = Math.abs(pred.value - truth.value);
        errsAbs.push(errAbs);
        errsPct.push(truth.value !== 0 ? errAbs / Math.abs(truth.value) : 0);
      }
      if (errsAbs.length === 0) continue;
      const rmsePct = Math.sqrt(errsPct.reduce((a, b) => a + b * b, 0) / errsPct.length) * 100;
      const maeAbs = errsAbs.reduce((a, b) => a + b, 0) / errsAbs.length;
      perParam[outputName] = { rmsePct, maeAbs, n: errsAbs.length };
      totalSqErrPct += errsPct.reduce((a, b) => a + b * b, 0);
      totalAbsErr += errsAbs.reduce((a, b) => a + b, 0);
      totalN += errsAbs.length;
    }

    const overallRmsePct = totalN > 0 ? Math.sqrt(totalSqErrPct / totalN) * 100 : Infinity;
    const overallMae = totalN > 0 ? totalAbsErr / totalN : Infinity;
    const passes = overallRmsePct < 5;

    this.model.metrics = {
      rmsePct: overallRmsePct,
      maeAbs: overallMae,
      validationSetSize: samples.length,
      lastEvaluatedAt: new Date().toISOString(),
    };
    writeFileSync(this.modelPath, JSON.stringify(this.model, null, 2));

    return {
      validationSetSize: samples.length,
      perParam,
      overall: { rmsePct: overallRmsePct, maeAbs: overallMae },
      passesExitCriterion: passes,
      evaluatedAt: this.model.metrics.lastEvaluatedAt as string,
    };
  }

  // ────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────

  /** OLS fit: solves (XᵀX)·β = Xᵀy via Gaussian elimination on the (k+1)×(k+1) normal equations. */
  private fitOLS(
    samples: TrainingSample[],
    outputName: PredictableParam,
    featureKeys: string[],
  ): { intercept: number; weights: number[] } | null {
    const k = featureKeys.length;
    const rows = samples.map((s) => {
      const inputs = this.buildInputs(s.geometry);
      const x: Record<string, number> = {
        longestDim: inputs.longestDim,
        bbox_x: inputs.bbox_x,
        bbox_y: inputs.bbox_y,
        bbox_z: inputs.bbox_z,
        bbox_min_xy: inputs.bbox_min_xy,
        bbox_max_xy: inputs.bbox_max_xy,
        faceCount: inputs.faceCount,
        edgeCount: inputs.edgeCount,
        hole_diameter: 0.18 * inputs.bbox_min_xy,
      };
      const xs = featureKeys.map((fk) => x[fk] ?? 0);
      const y = s.truth[outputName]!.value;
      return { xs: [1, ...xs], y };
    });

    // Build (k+1)x(k+2) augmented matrix [XᵀX | Xᵀy]
    const dim = k + 1;
    const mat: number[][] = Array.from({ length: dim }, () => Array(dim + 1).fill(0));
    for (const r of rows) {
      for (let i = 0; i < dim; i += 1) {
        for (let j = 0; j < dim; j += 1) mat[i][j] += r.xs[i] * r.xs[j];
        mat[i][dim] += r.xs[i] * r.y;
      }
    }

    // Gaussian elimination with partial pivot
    for (let i = 0; i < dim; i += 1) {
      let pivot = i;
      for (let r = i + 1; r < dim; r += 1) if (Math.abs(mat[r][i]) > Math.abs(mat[pivot][i])) pivot = r;
      if (Math.abs(mat[pivot][i]) < 1e-12) return null; // singular
      if (pivot !== i) [mat[i], mat[pivot]] = [mat[pivot], mat[i]];
      for (let r = 0; r < dim; r += 1) {
        if (r === i) continue;
        const f = mat[r][i] / mat[i][i];
        for (let c = i; c <= dim; c += 1) mat[r][c] -= f * mat[i][c];
      }
    }
    const beta = mat.map((row, i) => row[dim] / row[i]);
    return { intercept: beta[0], weights: beta.slice(1) };
  }

  private bumpVersion(v: string): string {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
    if (!m) return v + "+1";
    return `${m[1]}.${m[2]}.${parseInt(m[3], 10) + 1}`;
  }
}

export const cadParameterPredictorEngine = new CADParameterPredictorEngine();
