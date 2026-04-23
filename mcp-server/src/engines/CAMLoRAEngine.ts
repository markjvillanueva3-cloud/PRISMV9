/**
 * CAMLoRAEngine — U-CAM107 (PHASE-8 / CAM-EXHAUST-MS0)
 * =====================================================
 *
 * Fine-tuning adapter framework for CAM knowledge.
 *
 * This engine is the inference-time + management layer that sits ABOVE
 * the existing CAMLoRAAdapterTrainerEngine (which trains adapters).
 *
 *   CAMLoRAAdapterTrainerEngine  → produces  → LoRAAdapter
 *   CAMLoRAEngine                → consumes →  LoRAAdapter (predict / list / validate)
 *
 * Why a separate engine?
 *   - Trainer is heavy: needs full baseline + training split + epochs.
 *   - Inference is lightweight: just A·B·x·(α/r) plus baseline weights·x.
 *   - The roadmap (U-CAM107) calls for a framework that downstream units
 *     U-CAM108..U-CAM111 train into, and U-CAM112 (Ollama) consumes from.
 *
 * Math (LoRA forward pass, identical to trainer):
 *     y_hat = baseline·x_std + (B · A · x_std) · (α / r)
 *   where A is r×d, B is 1×r (stored as length-r vector), x_std is the
 *   standardized feature vector (z-scored against baseline.feature_stats).
 *
 * Reference: Hu et al. 2021, "LoRA: Low-Rank Adaptation of Large Language
 * Models", arXiv:2106.09685 — adapter contract: y = Wx + (BA)x · α/r.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  type LoRAAdapter,
  type Priority4CAM,
  type LoRAConfig,
  DEFAULT_LORA_CONFIG,
} from "./CAMLoRAAdapterTrainerEngine.js";
import type { TargetName, BayesianRidgeModel } from "./CAMBaselineRegressorEngine.js";

// ─── Types ──────────────────────────────────────────────────────────

export interface AdapterPredictionInput {
  /** Adapter to apply */
  adapter: LoRAAdapter;
  /** Baseline model (must match adapter's d_in) */
  baseline: BayesianRidgeModel;
  /** Pre-standardized feature vector (length must equal adapter.d_in) */
  xStd: number[];
}

export interface AdapterPredictionResult {
  baseline_value: number;
  adapter_delta: number;
  final_value: number;
  cam_slug: Priority4CAM;
  target: TargetName;
}

export interface AdapterValidationResult {
  valid: boolean;
  issues: string[];
  d_in: number;
  rank: number;
  scale: number;
}

export interface AdapterHealthReport {
  cam_slug: Priority4CAM;
  target: TargetName;
  age_days: number;
  is_stale: boolean;
  trained_on: number;
  improvement_over_baseline_mae_pct: number;
  recommendation: "use" | "retrain_recommended" | "retrain_required";
  reason: string;
}

export interface AdapterIndexEntry {
  cam_slug: Priority4CAM;
  target: TargetName;
  path: string;
  trained_at: string;
  improvement_pct: number;
  d_in: number;
  rank: number;
}

export interface EnsembleInput {
  adapters: LoRAAdapter[];
  weights?: number[]; // defaults to equal weights
  baseline: BayesianRidgeModel;
  xStd: number[];
}

export interface EnsembleResult {
  baseline_value: number;
  weighted_delta: number;
  final_value: number;
  per_adapter_deltas: Array<{ cam: Priority4CAM; delta: number; weight: number }>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const STALE_AGE_DAYS = 30;          // adapters older than 30 d → recommend retrain
export const HARD_STALE_AGE_DAYS = 90;     // adapters older than 90 d → require retrain
export const MIN_IMPROVEMENT_PCT = 1.0;    // adapter must beat baseline by ≥1% to be useful

/**
 * Directories that the engine is allowed to read adapters from. Any
 * load/save/list/select call with a path outside this allow-list is
 * rejected to prevent arbitrary filesystem access via dispatcher params.
 * Callers with legitimate out-of-tree paths must be whitelisted here.
 *
 * Evaluated at each call (not module load) so env overrides set by tests
 * are honored regardless of when they are assigned.
 */
export function getAllowedAdapterRoots(): string[] {
  return [
    path.resolve("H:/prism/mcp-server/data/state/models"),
    path.resolve("H:/prism/mcp-server/data/state/models/cam-lora"),
    path.resolve("H:/prism/mcp-server/data/lora"),
    // tmp dirs are allow-listed via env override so tests can use mkdtempSync
    ...(process.env.CAM_LORA_ALLOW_TMP === "1" ? [path.resolve(os.tmpdir())] : []),
  ];
}

/** @deprecated Use {@link getAllowedAdapterRoots} — kept for backward compat. */
export const ALLOWED_ADAPTER_ROOTS: ReadonlyArray<string> = getAllowedAdapterRoots();

function isPathWithinAllowedRoot(target: string): boolean {
  const resolved = path.resolve(target);
  for (const root of getAllowedAdapterRoots()) {
    if (resolved === root || resolved.startsWith(root + path.sep)) {
      return true;
    }
  }
  return false;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class CAMLoRAEngine {
  readonly name = "CAMLoRAEngine";

  /**
   * Load an adapter from a JSON file on disk.
   *
   * @param adapterPath Absolute path to adapter JSON. Must resolve within an
   *                    entry in {@link ALLOWED_ADAPTER_ROOTS}.
   * @returns Parsed and validated LoRAAdapter
   * @throws Error if path is outside allowed roots, file missing, invalid JSON,
   *         or content is not a valid LoRAAdapter shape
   */
  loadAdapter(adapterPath: string): LoRAAdapter {
    if (!isPathWithinAllowedRoot(adapterPath)) {
      throw new Error(
        `CAMLoRAEngine.loadAdapter: path outside allowed roots: ${adapterPath}`
      );
    }
    if (!fs.existsSync(adapterPath)) {
      throw new Error(`CAMLoRAEngine.loadAdapter: file not found: ${adapterPath}`);
    }
    const raw = fs.readFileSync(adapterPath, "utf-8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`CAMLoRAEngine.loadAdapter: invalid JSON in ${adapterPath}: ${(err as Error).message}`);
    }
    return this.assertAdapter(parsed, adapterPath);
  }

  /**
   * Save an adapter to disk (creates parent dir if needed).
   *
   * @param adapter    Validated LoRAAdapter to persist
   * @param adapterPath Absolute path to write. Must resolve within an entry
   *                    in {@link ALLOWED_ADAPTER_ROOTS}.
   * @throws Error if the path is outside allowed roots, points at an existing
   *         directory, or adapter fails validation.
   */
  saveAdapter(adapter: LoRAAdapter, adapterPath: string): void {
    if (!isPathWithinAllowedRoot(adapterPath)) {
      throw new Error(
        `CAMLoRAEngine.saveAdapter: path outside allowed roots: ${adapterPath}`
      );
    }
    this.assertAdapter(adapter, "<in-memory>");
    // Reject writing onto an existing directory (EISDIR would bubble, but
    // we surface a clearer message before fs.writeFileSync does).
    if (fs.existsSync(adapterPath) && fs.statSync(adapterPath).isDirectory()) {
      throw new Error(
        `CAMLoRAEngine.saveAdapter: target is a directory, not a file: ${adapterPath}`
      );
    }
    const dir = path.dirname(adapterPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(adapterPath, JSON.stringify(adapter, null, 2));
  }

  /**
   * Apply adapter delta to baseline prediction.
   *
   * y_hat = baseline·x + (B·(A·x))·(α/r)
   *
   * @throws Error if adapter / baseline / xStd dimensions don't match
   */
  predict(input: AdapterPredictionInput): AdapterPredictionResult {
    const { adapter, baseline, xStd } = input;

    const validation = this.validateAdapterFor(adapter, xStd.length);
    if (!validation.valid) {
      throw new Error(`CAMLoRAEngine.predict: ${validation.issues.join("; ")}`);
    }
    if (baseline.weights.length !== xStd.length) {
      throw new Error(
        `CAMLoRAEngine.predict: baseline.weights length ${baseline.weights.length} ` +
        `does not match xStd length ${xStd.length}`
      );
    }
    for (let i = 0; i < xStd.length; i++) {
      const v = xStd[i];
      if (!Number.isFinite(v)) {
        throw new Error(`CAMLoRAEngine.predict: non-finite feature at index ${i} (got ${v})`);
      }
    }

    const baselineValue = this.dot(baseline.weights, xStd);
    const delta = this.applyDelta(adapter, xStd);

    return {
      baseline_value: baselineValue,
      adapter_delta: delta,
      final_value: baselineValue + delta,
      cam_slug: adapter.cam_slug,
      target: adapter.target,
    };
  }

  /**
   * Compute adapter delta only (no baseline needed). Useful when caller
   * already has the baseline value cached.
   *
   * delta = (B·A·x) · (α/r)
   */
  applyDelta(adapter: LoRAAdapter, xStd: number[]): number {
    if (xStd.length !== adapter.d_in) {
      throw new Error(
        `CAMLoRAEngine.applyDelta: xStd length ${xStd.length} ≠ adapter.d_in ${adapter.d_in}`
      );
    }
    const r = adapter.A.length;
    const scale = adapter.config.alpha / adapter.config.rank;
    let delta = 0;
    for (let i = 0; i < r; i++) {
      const Ai = adapter.A[i];
      let ax = 0;
      for (let j = 0; j < adapter.d_in; j++) {
        ax += Ai[j] * xStd[j];
      }
      delta += adapter.B[i] * ax;
    }
    return delta * scale;
  }

  /**
   * Verify adapter shape and dimension compatibility with a feature vector.
   * Does NOT throw — returns a structured report so callers can decide.
   */
  validateAdapterFor(adapter: LoRAAdapter, expectedDim: number): AdapterValidationResult {
    const issues: string[] = [];

    if (!adapter.A || !Array.isArray(adapter.A)) {
      issues.push("adapter.A missing or not an array");
    }
    if (!adapter.B || !Array.isArray(adapter.B)) {
      issues.push("adapter.B missing or not an array");
    }
    if (adapter.A && adapter.B && adapter.A.length !== adapter.B.length) {
      issues.push(`A.length (${adapter.A.length}) ≠ B.length (${adapter.B.length}) — rank mismatch`);
    }
    if (adapter.A && adapter.A.length === 0) {
      issues.push("adapter has rank 0 (A matrix empty) — cannot produce non-zero delta");
    }
    if (adapter.A && adapter.A.some((row) => row.length !== adapter.d_in)) {
      issues.push(`A row width inconsistent with d_in=${adapter.d_in}`);
    }
    if (typeof adapter.d_in !== "number" || adapter.d_in <= 0) {
      issues.push(`adapter.d_in must be positive integer (got ${adapter.d_in})`);
    }
    if (adapter.d_in !== expectedDim) {
      issues.push(`adapter.d_in (${adapter.d_in}) ≠ expected feature dim (${expectedDim})`);
    }
    if (!adapter.config || typeof adapter.config.rank !== "number" || typeof adapter.config.alpha !== "number") {
      issues.push("adapter.config.rank or adapter.config.alpha missing");
    }
    if (adapter.config && (adapter.config.rank <= 0 || adapter.config.alpha <= 0)) {
      issues.push(`config.rank and config.alpha must be > 0 (got rank=${adapter.config.rank}, alpha=${adapter.config.alpha})`);
    }

    const rank = adapter.A?.length ?? 0;
    const scale = adapter.config ? adapter.config.alpha / adapter.config.rank : NaN;

    return {
      valid: issues.length === 0,
      issues,
      d_in: adapter.d_in,
      rank,
      scale,
    };
  }

  /**
   * Audit adapter freshness + accuracy.
   *
   * @param adapter Adapter to inspect
   * @param now     Reference time (defaults to current wall clock)
   * @returns Report with age, staleness flag, and a deployment recommendation
   */
  checkAdapter(adapter: LoRAAdapter, now: Date = new Date()): AdapterHealthReport {
    const trained = new Date(adapter.trained_at);
    // Invalid ISO → NaN time → treat as corrupt and force retrain
    if (Number.isNaN(trained.getTime())) {
      return {
        cam_slug: adapter.cam_slug,
        target: adapter.target,
        age_days: Number.NaN,
        is_stale: true,
        trained_on: adapter.trained_on,
        improvement_over_baseline_mae_pct: adapter.improvement_over_baseline_mae_pct,
        recommendation: "retrain_required",
        reason: `invalid trained_at timestamp: ${JSON.stringify(adapter.trained_at)}`,
      };
    }
    const ageMs = now.getTime() - trained.getTime();
    const ageDays = ageMs / (24 * 3600 * 1000);

    let recommendation: AdapterHealthReport["recommendation"] = "use";
    const reasons: string[] = [];

    if (ageDays >= HARD_STALE_AGE_DAYS) {
      recommendation = "retrain_required";
      reasons.push(`age ${ageDays.toFixed(1)}d ≥ hard threshold ${HARD_STALE_AGE_DAYS}d`);
    } else if (ageDays >= STALE_AGE_DAYS) {
      recommendation = "retrain_recommended";
      reasons.push(`age ${ageDays.toFixed(1)}d ≥ stale threshold ${STALE_AGE_DAYS}d`);
    }
    if (adapter.improvement_over_baseline_mae_pct < MIN_IMPROVEMENT_PCT) {
      // Worse-than-baseline adapter — promote to "required" regardless of age
      recommendation = "retrain_required";
      reasons.push(
        `improvement ${adapter.improvement_over_baseline_mae_pct.toFixed(2)}% < min ${MIN_IMPROVEMENT_PCT}%`
      );
    }
    if (adapter.trained_on < 3) {
      recommendation = "retrain_required";
      reasons.push(`trained_on=${adapter.trained_on} < min 3 samples`);
    }

    return {
      cam_slug: adapter.cam_slug,
      target: adapter.target,
      age_days: ageDays,
      is_stale: ageDays >= STALE_AGE_DAYS,
      trained_on: adapter.trained_on,
      improvement_over_baseline_mae_pct: adapter.improvement_over_baseline_mae_pct,
      recommendation,
      reason: reasons.length > 0 ? reasons.join("; ") : "fresh, accurate, sufficient data",
    };
  }

  /**
   * List all adapter JSON files in a model directory tree.
   *
   * Expects layout: `{modelDir}/{cam_slug}/adapter.json` (one map per cam)
   * or `{modelDir}/{cam_slug}/{target}.json` (one file per target).
   *
   * @param modelDir Directory to scan (must be under {@link ALLOWED_ADAPTER_ROOTS})
   * @param opts     Set `collectWarnings=true` to return warnings; otherwise uses
   *                 `listAdaptersWithWarnings()` and discards the warnings.
   * @returns Array of discovered adapter index entries (no warnings)
   */
  listAdapters(modelDir: string): AdapterIndexEntry[] {
    return this.listAdaptersWithWarnings(modelDir).entries;
  }

  /**
   * Same as {@link listAdapters} but returns any per-file errors as a
   * `warnings[]` array so callers can surface corrupted adapters instead of
   * silently skipping them.
   *
   * @param modelDir Directory to scan
   * @returns `{ entries, warnings }`
   */
  listAdaptersWithWarnings(
    modelDir: string
  ): { entries: AdapterIndexEntry[]; warnings: Array<{ path: string; reason: string }> } {
    const warnings: Array<{ path: string; reason: string }> = [];
    if (!isPathWithinAllowedRoot(modelDir)) {
      warnings.push({ path: modelDir, reason: "path outside allowed roots" });
      return { entries: [], warnings };
    }
    if (!fs.existsSync(modelDir)) {
      return { entries: [], warnings };
    }
    const entries: AdapterIndexEntry[] = [];
    const camDirs = fs.readdirSync(modelDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const cam of camDirs) {
      const camPath = path.join(modelDir, cam);
      const files = fs.readdirSync(camPath).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const full = path.join(camPath, f);
        try {
          const raw = JSON.parse(fs.readFileSync(full, "utf-8")) as unknown;
          if (this.isAdapter(raw)) {
            entries.push(this.toIndexEntry(raw, full));
          } else if (raw && typeof raw === "object") {
            // Record<TargetName, LoRAAdapter|null> shape
            let anyFound = false;
            for (const v of Object.values(raw as Record<string, unknown>)) {
              if (this.isAdapter(v)) {
                entries.push(this.toIndexEntry(v, full));
                anyFound = true;
              }
            }
            if (!anyFound) {
              warnings.push({ path: full, reason: "no valid LoRAAdapter in file" });
            }
          } else {
            warnings.push({ path: full, reason: "root is not an object" });
          }
        } catch (err) {
          warnings.push({ path: full, reason: (err as Error).message });
        }
      }
    }
    return { entries, warnings };
  }

  /**
   * Locate the best usable adapter for a (cam, target) pair.
   *
   * Candidates are filtered by validation + health check, then sorted by
   * `improvement_over_baseline_mae_pct` descending so the highest-quality
   * adapter wins. Falls back to the first usable one if there are ties.
   *
   * @param modelDir     Root directory containing adapter subdirs
   * @param cam          Priority-4 CAM slug
   * @param target       Regression target
   * @param expectedDim  Feature dimension the caller will pass at inference
   * @returns `{ adapter, sourcePath }` or `null` if none usable
   */
  selectAdapter(
    modelDir: string,
    cam: Priority4CAM,
    target: TargetName,
    expectedDim: number
  ): { adapter: LoRAAdapter; sourcePath: string } | null {
    const candidates = this.listAdapters(modelDir)
      .filter((e) => e.cam_slug === cam && e.target === target)
      // Highest improvement first — tie-break by freshest trained_at
      .sort((a, b) => {
        const dImp = b.improvement_pct - a.improvement_pct;
        if (Math.abs(dImp) > 1e-9) return dImp;
        return (b.trained_at || "").localeCompare(a.trained_at || "");
      });

    for (const entry of candidates) {
      try {
        const adapter = this.loadAdapter(entry.path);
        if (!this.validateAdapterFor(adapter, expectedDim).valid) continue;
        if (this.checkAdapter(adapter).recommendation === "retrain_required") continue;
        return { adapter, sourcePath: entry.path };
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Ensemble multiple adapters with optional weights.
   *
   * @param input `{ adapters, baseline, xStd, weights? }`
   * @returns Weighted-mean delta plus per-adapter contributions.
   * @throws Error on empty adapter list, weight-length mismatch, negative or
   *         non-finite weights, or weights summing to ≤ 0.
   */
  ensemble(input: EnsembleInput): EnsembleResult {
    const { adapters, baseline, xStd } = input;
    if (adapters.length === 0) {
      throw new Error("CAMLoRAEngine.ensemble: at least one adapter required");
    }
    const weights = input.weights ?? new Array(adapters.length).fill(1 / adapters.length);
    if (weights.length !== adapters.length) {
      throw new Error(
        `CAMLoRAEngine.ensemble: weights length ${weights.length} ≠ adapters length ${adapters.length}`
      );
    }
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i];
      if (!Number.isFinite(w)) {
        throw new Error(`CAMLoRAEngine.ensemble: non-finite weight at index ${i} (got ${w})`);
      }
      if (w < 0) {
        throw new Error(`CAMLoRAEngine.ensemble: negative weight at index ${i} (got ${w})`);
      }
    }
    const sumW = weights.reduce((s, w) => s + w, 0);
    if (sumW <= 0) {
      throw new Error(`CAMLoRAEngine.ensemble: weights must sum to > 0 (got ${sumW})`);
    }
    const normW = weights.map((w) => w / sumW);

    const baselineValue = this.dot(baseline.weights, xStd);
    let weightedDelta = 0;
    const perAdapter: EnsembleResult["per_adapter_deltas"] = [];
    for (let i = 0; i < adapters.length; i++) {
      const d = this.applyDelta(adapters[i], xStd);
      perAdapter.push({ cam: adapters[i].cam_slug, delta: d, weight: normW[i] });
      weightedDelta += d * normW[i];
    }
    return {
      baseline_value: baselineValue,
      weighted_delta: weightedDelta,
      final_value: baselineValue + weightedDelta,
      per_adapter_deltas: perAdapter,
    };
  }

  /**
   * Standardize a raw feature vector with given mean/std (z-score).
   * Convenience helper exposed for callers that have raw features.
   *
   * @param raw  Raw feature vector of length d
   * @param mean Per-feature mean of length d
   * @param std  Per-feature std of length d. Zero std signals a constant
   *             feature that should not be in the model — we throw rather
   *             than silently returning NaN or zero.
   * @returns Standardized vector (x - μ) / σ
   * @throws Error on length mismatch or any zero-valued std entry.
   */
  standardize(raw: number[], mean: number[], std: number[]): number[] {
    if (raw.length !== mean.length || raw.length !== std.length) {
      throw new Error(
        `CAMLoRAEngine.standardize: length mismatch raw=${raw.length} mean=${mean.length} std=${std.length}`
      );
    }
    const out = new Array<number>(raw.length);
    for (let i = 0; i < raw.length; i++) {
      if (std[i] === 0) {
        throw new Error(
          `CAMLoRAEngine.standardize: zero std at index ${i} — constant feature should not be in the model`
        );
      }
      out[i] = (raw[i] - mean[i]) / std[i];
    }
    return out;
  }

  /**
   * Default adapter config for downstream units (U-CAM108..U-CAM111).
   * Re-exports trainer defaults so callers don't need to import the trainer.
   */
  defaultConfig(): LoRAConfig {
    return { ...DEFAULT_LORA_CONFIG };
  }

  // ─── Private ────────────────────────────────────────────────────────

  private dot(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  private isAdapter(v: unknown): v is LoRAAdapter {
    if (!v || typeof v !== "object") return false;
    const a = v as Partial<LoRAAdapter>;
    return (
      typeof a.cam_slug === "string" &&
      typeof a.target === "string" &&
      typeof a.d_in === "number" &&
      Array.isArray(a.A) &&
      Array.isArray(a.B) &&
      typeof a.config === "object" &&
      a.config !== null &&
      typeof a.config.rank === "number" &&
      typeof a.config.alpha === "number"
    );
  }

  private assertAdapter(v: unknown, source: string): LoRAAdapter {
    if (!this.isAdapter(v)) {
      throw new Error(`CAMLoRAEngine: not a valid LoRAAdapter (source: ${source})`);
    }
    return v;
  }

  private toIndexEntry(a: LoRAAdapter, p: string): AdapterIndexEntry {
    return {
      cam_slug: a.cam_slug,
      target: a.target,
      path: p,
      trained_at: a.trained_at,
      improvement_pct: a.improvement_over_baseline_mae_pct,
      d_in: a.d_in,
      rank: a.A.length,
    };
  }
}

export const camLoRAEngine = new CAMLoRAEngine();
