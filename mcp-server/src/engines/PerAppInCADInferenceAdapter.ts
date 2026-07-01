/**
 * PerAppInCADInferenceAdapter — U-CAD-APP-20 (PHASE-48)
 *
 * Embeds foundation model inference directly inside CAD plugin processes
 * for ultra-low-latency predictions (≤100ms p99 SLO).
 *
 * Features:
 *   - In-process ONNX/TensorRT model loading per CAD application
 *   - Feature extraction from CAD geometry
 *   - Multiple inference types (tool, parameter, error, recommendation)
 *   - Result caching with LRU eviction
 *   - SLO monitoring (p50/p95/p99 latency tracking)
 *   - Model hot-swapping without restart
 *   - Quantized INT8/FP16 models for speed
 *
 * Supported CAD Applications:
 *   - Mastercam (NET-Hook in-process)
 *   - Onshape (WebAssembly/SharedArrayBuffer)
 *   - AutoCAD (.NET add-in)
 *   - Siemens NX (NXOpen)
 *   - SolidWorks (COM add-in)
 *   - Fusion 360 (JavaScript sandbox)
 *
 * @module engines/PerAppInCADInferenceAdapter
 */

import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const CADAppTypeSchema = z.enum([
  "mastercam",
  "onshape",
  "autocad",
  "nx",
  "solidworks",
  "fusion360",
  "inventor",
  "catia",
  "creo",
  "freecad",
]);
export type CADAppType = z.infer<typeof CADAppTypeSchema>;

export const InferenceTypeSchema = z.enum([
  "tool_recommendation",
  "parameter_optimization",
  "error_prediction",
  "feature_recognition",
  "toolpath_classification",
  "surface_quality_prediction",
  "cycle_time_estimation",
  "collision_detection",
  "material_suggestion",
  "strategy_selection",
]);
export type InferenceType = z.infer<typeof InferenceTypeSchema>;

export const ModelFormatSchema = z.enum([
  "onnx",
  "tensorrt",
  "openvino",
  "coreml",
  "wasm",
  "tflite",
]);
export type ModelFormat = z.infer<typeof ModelFormatSchema>;

export const QuantizationSchema = z.enum([
  "fp32",
  "fp16",
  "int8",
  "int4",
]);
export type Quantization = z.infer<typeof QuantizationSchema>;

export const ModelConfigSchema = z.object({
  modelId: z.string(),
  modelPath: z.string(),
  format: ModelFormatSchema,
  quantization: QuantizationSchema,
  inferenceType: InferenceTypeSchema,
  inputShape: z.array(z.number().int().positive()),
  outputShape: z.array(z.number().int().positive()),
  maxBatchSize: z.number().int().positive().default(1),
  warmupIterations: z.number().int().nonnegative().default(3),
});
export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const FeatureVectorSchema = z.object({
  featureId: z.string(),
  cadApp: CADAppTypeSchema,
  inferenceType: InferenceTypeSchema,
  features: z.array(z.number()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type FeatureVector = z.infer<typeof FeatureVectorSchema>;

export const InferenceResultSchema = z.object({
  requestId: z.string(),
  inferenceType: InferenceTypeSchema,
  predictions: z.array(z.object({
    label: z.string(),
    confidence: z.number().min(0).max(1),
    value: z.union([z.number(), z.string(), z.array(z.number())]).optional(),
  })),
  latencyMs: z.number().nonnegative(),
  fromCache: z.boolean(),
  modelId: z.string(),
  timestamp: z.string().datetime(),
});
export type InferenceResult = z.infer<typeof InferenceResultSchema>;

export const LatencyStatsSchema = z.object({
  cadApp: CADAppTypeSchema,
  inferenceType: InferenceTypeSchema,
  sampleCount: z.number().int().nonnegative(),
  p50Ms: z.number().nonnegative(),
  p95Ms: z.number().nonnegative(),
  p99Ms: z.number().nonnegative(),
  meanMs: z.number().nonnegative(),
  minMs: z.number().nonnegative(),
  maxMs: z.number().nonnegative(),
  sloTarget: z.number().positive(),
  sloMet: z.boolean(),
  cacheHitRate: z.number().min(0).max(1),
});
export type LatencyStats = z.infer<typeof LatencyStatsSchema>;

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface InferenceClock {
  now(): string;
  nowMs(): number;
}

export interface InferenceRuntime {
  loadModel(config: ModelConfig): Promise<{ success: boolean; loadTimeMs: number; error?: string }>;
  unloadModel(modelId: string): Promise<boolean>;
  isModelLoaded(modelId: string): boolean;
  runInference(modelId: string, input: number[]): Promise<{ output: number[]; latencyMs: number }>;
  warmup(modelId: string, iterations: number): Promise<{ avgLatencyMs: number }>;
  getMemoryUsage(): { usedMB: number; peakMB: number };
}

export interface FeatureExtractor {
  extractFromGeometry(cadApp: CADAppType, geometryData: unknown): FeatureVector;
  extractFromToolpath(cadApp: CADAppType, toolpathData: unknown): FeatureVector;
  extractFromOperation(cadApp: CADAppType, operationData: unknown): FeatureVector;
}

function defaultClock(): InferenceClock {
  return {
    now: () => new Date().toISOString(),
    nowMs: () => Date.now(),
  };
}

// ── Types ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  result: InferenceResult;
  expiresAt: number;
  accessCount: number;
}

type InferenceSubscriber = (result: InferenceResult) => void;
type SLOViolationSubscriber = (stats: LatencyStats) => void;

/** Default p99 latency SLO target (ms). Single source for the field default + describeCapabilities. */
const DEFAULT_SLO_TARGET_MS = 100;

/**
 * Pure capability contract for the in-CAD inference adapter -- returned by
 * {@link PerAppInCADInferenceAdapter.describeCapabilities}. Surfaces what
 * in-process inference is supported and the backend-injection contract a host
 * must satisfy to actually run it (a JSON dispatcher call cannot).
 */
export interface InCADInferenceCapabilities {
  engine: string;
  cadApps: CADAppType[];
  inferenceTypes: InferenceType[];
  modelFormats: ModelFormat[];
  quantizations: Quantization[];
  defaultSloTargetMs: number;
  /** Backends the constructor REQUIRES; supplied by the in-CAD plugin host, not the dispatcher. */
  backendRequired: { runtime: string; extractor: string };
}

// ── Engine Implementation ───────────────────────────────────────────────────

export class PerAppInCADInferenceAdapter {
  private runtime: InferenceRuntime;
  private extractor: FeatureExtractor;
  private clock: InferenceClock;

  private loadedModels = new Map<string, ModelConfig>();
  private modelsByApp = new Map<CADAppType, Map<InferenceType, string>>();
  private cache = new Map<string, CacheEntry>();
  private latencySamples = new Map<string, number[]>();

  private inferenceSubscribers: InferenceSubscriber[] = [];
  private sloSubscribers: SLOViolationSubscriber[] = [];

  private maxCacheSize = 1000;
  private cacheTTLMs = 60000;
  private sloTargetMs = DEFAULT_SLO_TARGET_MS;
  private maxSamples = 1000;

  constructor(opts: {
    runtime: InferenceRuntime;
    extractor: FeatureExtractor;
    clock?: InferenceClock;
    maxCacheSize?: number;
    cacheTTLMs?: number;
    sloTargetMs?: number;
  }) {
    this.runtime = opts.runtime;
    this.extractor = opts.extractor;
    this.clock = opts.clock ?? defaultClock();
    if (opts.maxCacheSize !== undefined) this.maxCacheSize = opts.maxCacheSize;
    if (opts.cacheTTLMs !== undefined) this.cacheTTLMs = opts.cacheTTLMs;
    if (opts.sloTargetMs !== undefined) this.sloTargetMs = opts.sloTargetMs;
  }

  // ── Capability Introspection (pure; no backend required) ──────────────────

  /**
   * Describe what in-CAD inference this adapter supports, WITHOUT constructing an
   * instance (the constructor requires an injected InferenceRuntime +
   * FeatureExtractor that only a CAD-plugin host can supply). Pure + deterministic
   * -- lets a dispatcher/caller discover the supported CAD apps, inference types,
   * model formats, and the backend-injection contract needed to actually run.
   *
   * @returns Static capability + backend-requirement contract.
   */
  static describeCapabilities(): InCADInferenceCapabilities {
    return {
      engine: "PerAppInCADInferenceAdapter",
      cadApps: [...CADAppTypeSchema.options],
      inferenceTypes: [...InferenceTypeSchema.options],
      modelFormats: [...ModelFormatSchema.options],
      quantizations: [...QuantizationSchema.options],
      defaultSloTargetMs: DEFAULT_SLO_TARGET_MS,
      backendRequired: {
        runtime: "InferenceRuntime (ONNX/TensorRT/OpenVINO/CoreML/WASM/TFLite)",
        extractor: "FeatureExtractor (CAD geometry -> feature vector)",
      },
    };
  }

  // ── Model Management ──────────────────────────────────────────────────────

  async loadModel(config: ModelConfig, cadApp: CADAppType): Promise<{ success: boolean; loadTimeMs: number; error?: string }> {
    const result = await this.runtime.loadModel(config);
    if (result.success) {
      this.loadedModels.set(config.modelId, config);

      if (!this.modelsByApp.has(cadApp)) {
        this.modelsByApp.set(cadApp, new Map());
      }
      this.modelsByApp.get(cadApp)!.set(config.inferenceType, config.modelId);

      if (config.warmupIterations > 0) {
        await this.runtime.warmup(config.modelId, config.warmupIterations);
      }
    }

    return result;
  }

  async unloadModel(modelId: string): Promise<boolean> {
    const success = await this.runtime.unloadModel(modelId);
    if (success) {
      const config = this.loadedModels.get(modelId);
      this.loadedModels.delete(modelId);

      if (config) {
        for (const [app, typeMap] of this.modelsByApp) {
          for (const [type, id] of typeMap) {
            if (id === modelId) {
              typeMap.delete(type);
            }
          }
        }
      }
    }

    return success;
  }

  async hotSwapModel(oldModelId: string, newConfig: ModelConfig, cadApp: CADAppType): Promise<{ success: boolean; downTimeMs: number }> {
    const startMs = this.clock.nowMs();

    const loadResult = await this.runtime.loadModel(newConfig);
    if (!loadResult.success) {
      return { success: false, downTimeMs: 0 };
    }

    await this.unloadModel(oldModelId);

    this.loadedModels.set(newConfig.modelId, newConfig);
    if (!this.modelsByApp.has(cadApp)) {
      this.modelsByApp.set(cadApp, new Map());
    }
    this.modelsByApp.get(cadApp)!.set(newConfig.inferenceType, newConfig.modelId);

    const downTimeMs = this.clock.nowMs() - startMs;
    return { success: true, downTimeMs };
  }

  isModelLoaded(modelId: string): boolean {
    return this.runtime.isModelLoaded(modelId);
  }

  getLoadedModels(): ModelConfig[] {
    return [...this.loadedModels.values()];
  }

  getModelsForApp(cadApp: CADAppType): Map<InferenceType, string> {
    return this.modelsByApp.get(cadApp) ?? new Map();
  }

  // ── Inference ─────────────────────────────────────────────────────────────

  async infer(
    cadApp: CADAppType,
    inferenceType: InferenceType,
    features: FeatureVector,
  ): Promise<InferenceResult> {
    const requestId = `req-${this.clock.nowMs()}-${Math.random().toString(36).slice(2, 8)}`;
    const cacheKey = this.computeCacheKey(cadApp, inferenceType, features);

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      const result: InferenceResult = {
        ...cached,
        requestId,
        fromCache: true,
        timestamp: this.clock.now(),
      };
      this.notifyInference(result);
      return result;
    }

    const modelId = this.modelsByApp.get(cadApp)?.get(inferenceType);
    if (!modelId) {
      throw new Error(`No model loaded for ${cadApp}/${inferenceType}`);
    }

    const startMs = this.clock.nowMs();
    const inferResult = await this.runtime.runInference(modelId, features.features);
    const latencyMs = this.clock.nowMs() - startMs;

    const predictions = this.interpretOutput(inferenceType, inferResult.output);

    const result: InferenceResult = {
      requestId,
      inferenceType,
      predictions,
      latencyMs,
      fromCache: false,
      modelId,
      timestamp: this.clock.now(),
    };

    this.putInCache(cacheKey, result);
    this.recordLatency(cadApp, inferenceType, latencyMs);
    this.notifyInference(result);

    this.checkSLO(cadApp, inferenceType);

    return result;
  }

  async inferFromGeometry(
    cadApp: CADAppType,
    inferenceType: InferenceType,
    geometryData: unknown,
  ): Promise<InferenceResult> {
    const features = this.extractor.extractFromGeometry(cadApp, geometryData);
    return this.infer(cadApp, inferenceType, features);
  }

  async inferFromToolpath(
    cadApp: CADAppType,
    inferenceType: InferenceType,
    toolpathData: unknown,
  ): Promise<InferenceResult> {
    const features = this.extractor.extractFromToolpath(cadApp, toolpathData);
    return this.infer(cadApp, inferenceType, features);
  }

  async inferFromOperation(
    cadApp: CADAppType,
    inferenceType: InferenceType,
    operationData: unknown,
  ): Promise<InferenceResult> {
    const features = this.extractor.extractFromOperation(cadApp, operationData);
    return this.infer(cadApp, inferenceType, features);
  }

  async batchInfer(
    cadApp: CADAppType,
    inferenceType: InferenceType,
    featuresBatch: FeatureVector[],
  ): Promise<InferenceResult[]> {
    const results: InferenceResult[] = [];
    for (const features of featuresBatch) {
      const result = await this.infer(cadApp, inferenceType, features);
      results.push(result);
    }
    return results;
  }

  // ── Latency Stats ─────────────────────────────────────────────────────────

  getLatencyStats(cadApp: CADAppType, inferenceType: InferenceType): LatencyStats | null {
    const key = `${cadApp}:${inferenceType}`;
    const samples = this.latencySamples.get(key);
    if (!samples || samples.length === 0) {
      return null;
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const n = sorted.length;

    const p50 = sorted[Math.floor(n * 0.5)];
    const p95 = sorted[Math.floor(n * 0.95)];
    const p99 = sorted[Math.floor(n * 0.99)];
    const mean = samples.reduce((a, b) => a + b, 0) / n;

    const cacheStats = this.getCacheStats(cadApp, inferenceType);

    return {
      cadApp,
      inferenceType,
      sampleCount: n,
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      meanMs: mean,
      minMs: sorted[0],
      maxMs: sorted[n - 1],
      sloTarget: this.sloTargetMs,
      sloMet: p99 <= this.sloTargetMs,
      cacheHitRate: cacheStats.hitRate,
    };
  }

  getAllLatencyStats(): LatencyStats[] {
    const stats: LatencyStats[] = [];
    for (const [key] of this.latencySamples) {
      const [cadApp, inferenceType] = key.split(":") as [CADAppType, InferenceType];
      const stat = this.getLatencyStats(cadApp, inferenceType);
      if (stat) stats.push(stat);
    }
    return stats;
  }

  clearLatencyStats(cadApp?: CADAppType, inferenceType?: InferenceType): number {
    if (cadApp && inferenceType) {
      const key = `${cadApp}:${inferenceType}`;
      const existed = this.latencySamples.has(key);
      this.latencySamples.delete(key);
      return existed ? 1 : 0;
    }

    const count = this.latencySamples.size;
    this.latencySamples.clear();
    return count;
  }

  // ── Cache Management ──────────────────────────────────────────────────────

  getCacheStats(cadApp?: CADAppType, inferenceType?: InferenceType): { entries: number; hitRate: number; memoryMB: number } {
    let entries = 0;
    let hits = 0;
    let total = 0;

    for (const [key, entry] of this.cache) {
      if (cadApp && !key.startsWith(cadApp)) continue;
      if (inferenceType && !key.includes(inferenceType)) continue;

      entries++;
      hits += entry.accessCount > 1 ? entry.accessCount - 1 : 0;
      total += entry.accessCount;
    }

    return {
      entries,
      hitRate: total > 0 ? hits / total : 0,
      memoryMB: this.estimateCacheMemoryMB(),
    };
  }

  clearCache(cadApp?: CADAppType): number {
    if (!cadApp) {
      const count = this.cache.size;
      this.cache.clear();
      return count;
    }

    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(cadApp)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  onInference(callback: InferenceSubscriber): () => void {
    this.inferenceSubscribers.push(callback);
    return () => {
      const idx = this.inferenceSubscribers.indexOf(callback);
      if (idx >= 0) this.inferenceSubscribers.splice(idx, 1);
    };
  }

  onSLOViolation(callback: SLOViolationSubscriber): () => void {
    this.sloSubscribers.push(callback);
    return () => {
      const idx = this.sloSubscribers.indexOf(callback);
      if (idx >= 0) this.sloSubscribers.splice(idx, 1);
    };
  }

  // ── Memory ────────────────────────────────────────────────────────────────

  getMemoryUsage(): { runtimeMB: number; cacheMB: number; totalMB: number } {
    const runtime = this.runtime.getMemoryUsage();
    const cacheMB = this.estimateCacheMemoryMB();
    return {
      runtimeMB: runtime.usedMB,
      cacheMB,
      totalMB: runtime.usedMB + cacheMB,
    };
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  setSLOTarget(targetMs: number): void {
    this.sloTargetMs = targetMs;
  }

  getSLOTarget(): number {
    return this.sloTargetMs;
  }

  setCacheTTL(ttlMs: number): void {
    this.cacheTTLMs = ttlMs;
  }

  setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
    this.evictIfNeeded();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private computeCacheKey(cadApp: CADAppType, inferenceType: InferenceType, features: FeatureVector): string {
    const featureHash = this.hashFeatures(features.features);
    return `${cadApp}:${inferenceType}:${featureHash}`;
  }

  private hashFeatures(features: number[]): string {
    let hash = 0;
    const str = features.join(",");
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): InferenceResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.clock.nowMs() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.result;
  }

  private putInCache(key: string, result: InferenceResult): void {
    this.evictIfNeeded();

    this.cache.set(key, {
      result,
      expiresAt: this.clock.nowMs() + this.cacheTTLMs,
      accessCount: 1,
    });
  }

  private evictIfNeeded(): void {
    while (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  private estimateCacheMemoryMB(): number {
    return (this.cache.size * 2) / 1024;
  }

  private recordLatency(cadApp: CADAppType, inferenceType: InferenceType, latencyMs: number): void {
    const key = `${cadApp}:${inferenceType}`;
    if (!this.latencySamples.has(key)) {
      this.latencySamples.set(key, []);
    }

    const samples = this.latencySamples.get(key)!;
    samples.push(latencyMs);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  private checkSLO(cadApp: CADAppType, inferenceType: InferenceType): void {
    const stats = this.getLatencyStats(cadApp, inferenceType);
    if (stats && !stats.sloMet) {
      this.notifySLOViolation(stats);
    }
  }

  private interpretOutput(inferenceType: InferenceType, output: number[]): InferenceResult["predictions"] {
    switch (inferenceType) {
      case "tool_recommendation":
        return this.interpretClassification(output, ["end_mill", "ball_mill", "face_mill", "drill", "tap"]);
      case "parameter_optimization":
        return [{ label: "optimized_params", confidence: 1, value: output }];
      case "error_prediction":
        return this.interpretClassification(output, ["no_error", "collision", "overload", "chatter", "breakage"]);
      case "feature_recognition":
        return this.interpretClassification(output, ["pocket", "hole", "slot", "boss", "chamfer", "fillet"]);
      case "toolpath_classification":
        return this.interpretClassification(output, ["roughing", "semi_finishing", "finishing", "drilling"]);
      case "surface_quality_prediction":
        return [{ label: "ra_um", confidence: output[1] ?? 0.9, value: output[0] }];
      case "cycle_time_estimation":
        return [{ label: "cycle_time_min", confidence: output[1] ?? 0.9, value: output[0] }];
      case "collision_detection":
        return [{ label: output[0] > 0.5 ? "collision" : "safe", confidence: Math.abs(output[0] - 0.5) * 2 }];
      case "material_suggestion":
        return this.interpretClassification(output, ["aluminum", "steel", "stainless", "titanium", "plastic"]);
      case "strategy_selection":
        return this.interpretClassification(output, ["adaptive", "pocket", "contour", "facing", "drill"]);
      default:
        return [{ label: "unknown", confidence: 0, value: output }];
    }
  }

  private interpretClassification(output: number[], labels: string[]): InferenceResult["predictions"] {
    return output
      .map((conf, i) => ({ label: labels[i] ?? `class_${i}`, confidence: conf }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private notifyInference(result: InferenceResult): void {
    for (const sub of this.inferenceSubscribers) {
      try { sub(result); } catch { /* ignore */ }
    }
  }

  private notifySLOViolation(stats: LatencyStats): void {
    for (const sub of this.sloSubscribers) {
      try { sub(stats); } catch { /* ignore */ }
    }
  }
}

// Types CADAppType/InferenceType/ModelFormat/Quantization/ModelConfig/FeatureVector/InferenceResult/LatencyStats are exported at their declarations above.
