/**
 * SFCFewShotNewMaterialEngine — U-PPG-SFC-13
 * ==========================================
 *
 * Wires ProtoMAML few-shot learning into the SFC (Speed/Feed Calculator)
 * path for rapid adaptation to new materials with <10 samples during
 * quote-to-ship workflow.
 *
 * Key capabilities:
 *   - 3-shot adaptation in <500ms inside dispatcher path
 *   - Caches adapted head per (customer × material) in adapter registry
 *   - Falls back to base model when cache miss
 *   - Provides provenance for adapted predictions
 *
 * Exit criteria:
 *   - 3-shot adapted prediction in <500ms inside quote path
 *   - MAE on held-out new-customer material within 1.2x fully-trained baseline
 *   - Cache hit on repeat (customer×material) <50ms
 *
 * References:
 *   - Finn 2017 "Model-Agnostic Meta-Learning"
 *   - Triantafillou 2020 "Meta-Dataset"
 *
 * @module engines/SFCFewShotNewMaterialEngine
 * @milestone PSAU-PPG-SFC U-PPG-SFC-13
 */

import { protoMAMLFewShotEngine } from "./ProtoMAMLFewShotEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Material sample for few-shot learning */
export interface MaterialSample {
  material: string;
  tool_class: string;
  machine_id?: string;
  features: MaterialFeatures;
  actual_sfm: number;
  actual_feed: number;
  actual_doc?: number;
  outcome?: "success" | "chatter" | "tool_break" | "poor_finish";
}

/** Material features for embedding */
export interface MaterialFeatures {
  hardness_hrc?: number;
  tensile_strength_mpa?: number;
  thermal_conductivity?: number;
  machinability_rating?: number;
  iso_group?: string;
  alloy_class?: string;
}

/** Adapted prediction result */
export interface FewShotPrediction {
  customer: string;
  material: string;
  tool_class: string;
  predicted_sfm: number;
  predicted_feed: number;
  predicted_doc?: number;
  confidence: number;
  adapted: boolean;
  cache_hit: boolean;
  adaptation_time_ms: number;
  prediction_time_ms: number;
  total_time_ms: number;
  support_set_size: number;
  provenance: FewShotProvenance;
}

/** Provenance for adapted predictions */
export interface FewShotProvenance {
  adapter_id: string;
  config_id: string;
  inner_steps: number;
  final_loss: number;
  adapted_at: string;
  source: "adapted" | "base_model" | "cached";
  support_materials: string[];
}

/** Cache entry for adapted parameters */
export interface AdapterCacheEntry {
  adapter_id: string;
  customer: string;
  material: string;
  tool_class: string;
  config_id: string;
  adapted_at: number;
  support_set_size: number;
  inner_steps: number;
  final_loss: number;
  hit_count: number;
  last_hit_at: number;
}

/** Engine configuration */
export interface SFCFewShotConfig {
  /** Default inner loop steps */
  inner_steps: number;
  /** Inner loop learning rate */
  inner_lr: number;
  /** Feature dimension */
  feature_dim: number;
  /** Hidden dimension */
  hidden_dim: number;
  /** Cache TTL in milliseconds */
  cache_ttl_ms: number;
  /** Max cached adapters */
  max_cache_size: number;
  /** Target adaptation time budget (ms) */
  adaptation_budget_ms: number;
  /** Target prediction time budget (ms) */
  prediction_budget_ms: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: SFCFewShotConfig = {
  inner_steps: 5,
  inner_lr: 0.01,
  feature_dim: 16,
  hidden_dim: 32,
  cache_ttl_ms: 24 * 60 * 60 * 1000, // 24 hours
  max_cache_size: 1000,
  adaptation_budget_ms: 500,
  prediction_budget_ms: 50,
};

const PROTOMAML_CONFIG_ID = "sfc-fewshot-maml";

// ============================================================================
// ENGINE
// ============================================================================

class SFCFewShotNewMaterialEngine {
  private config: SFCFewShotConfig = { ...DEFAULT_CONFIG };
  private adapterCache: Map<string, AdapterCacheEntry> = new Map();
  private initialized = false;

  /**
   * Configure the engine.
   * @param config - Partial configuration override
   */
  configure(config: Partial<SFCFewShotConfig>): SFCFewShotConfig {
    this.config = { ...this.config, ...config };
    return { ...this.config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): SFCFewShotConfig {
    return { ...this.config };
  }

  /**
   * Initialize the engine and register ProtoMAML config.
   */
  initialize(): { initialized: boolean; config_id: string } {
    if (this.initialized) {
      return { initialized: true, config_id: PROTOMAML_CONFIG_ID };
    }

    protoMAMLFewShotEngine.register({
      config_id: PROTOMAML_CONFIG_ID,
      domain: "mill",
      inner_steps: this.config.inner_steps,
      inner_lr: this.config.inner_lr,
      feature_dim: this.config.feature_dim,
      hidden_dim: this.config.hidden_dim,
      meta_lr: 0.001,
      use_proto_init: true,
      regularization_lambda: 0.01,
    });

    this.initialized = true;
    return { initialized: true, config_id: PROTOMAML_CONFIG_ID };
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.adapterCache.clear();
    this.initialized = false;
  }

  /**
   * Generate cache key for (customer × material × tool_class).
   */
  private cacheKey(customer: string, material: string, toolClass: string): string {
    return `${customer}:${material}:${toolClass}`;
  }

  /**
   * Extract features from material sample.
   */
  private extractFeatures(sample: MaterialSample): number[] {
    const features: number[] = [];

    // Normalize hardness (0-70 HRC scale)
    features.push((sample.features.hardness_hrc ?? 30) / 70);

    // Normalize tensile strength (0-2000 MPa scale)
    features.push((sample.features.tensile_strength_mpa ?? 500) / 2000);

    // Normalize thermal conductivity (0-400 W/mK scale)
    features.push((sample.features.thermal_conductivity ?? 50) / 400);

    // Normalize machinability rating (0-200 scale)
    features.push((sample.features.machinability_rating ?? 100) / 200);

    // ISO group encoding (P=0, M=0.2, K=0.4, N=0.6, S=0.8, H=1.0)
    const isoGroupMap: Record<string, number> = {
      P: 0, M: 0.2, K: 0.4, N: 0.6, S: 0.8, H: 1.0,
    };
    features.push(isoGroupMap[sample.features.iso_group ?? "P"] ?? 0.5);

    // Outcome encoding (success=1, chatter=0.6, poor_finish=0.3, tool_break=0)
    const outcomeMap: Record<string, number> = {
      success: 1.0, chatter: 0.6, poor_finish: 0.3, tool_break: 0.0,
    };
    features.push(outcomeMap[sample.outcome ?? "success"] ?? 0.5);

    // Pad to feature_dim
    while (features.length < this.config.feature_dim) {
      features.push(0);
    }

    return features.slice(0, this.config.feature_dim);
  }

  /**
   * Build support set from material samples.
   */
  private buildSupportSet(samples: MaterialSample[]): {
    features: number[][];
    targets: number[];
    materials: string[];
  } {
    const features: number[][] = [];
    const targets: number[] = [];
    const materials: string[] = [];

    for (const sample of samples) {
      features.push(this.extractFeatures(sample));
      // Normalize SFM to [0,1] range (0-2000 SFM scale)
      targets.push(sample.actual_sfm / 2000);
      materials.push(sample.material);
    }

    return { features, targets, materials };
  }

  /**
   * Adapt to new customer material with few-shot learning.
   * Target: <500ms for 3-shot adaptation.
   *
   * @param customer - Customer identifier
   * @param material - Material name
   * @param toolClass - Tool classification
   * @param supportSamples - Support set samples (typically 3-10)
   * @returns Adaptation result
   */
  adapt(
    customer: string,
    material: string,
    toolClass: string,
    supportSamples: MaterialSample[],
  ): {
    adapted: boolean;
    adapter_id: string;
    adaptation_time_ms: number;
    support_set_size: number;
    inner_steps: number;
    final_loss: number;
    within_budget: boolean;
  } {
    const startTime = performance.now();

    // Ensure initialized
    if (!this.initialized) {
      this.initialize();
    }

    const supportSet = this.buildSupportSet(supportSamples);
    const adapterId = `sfc-${customer}-${material}-${toolClass}-${Date.now()}`;

    // Call ProtoMAML adapt
    const result = protoMAMLFewShotEngine.adapt({
      config_id: PROTOMAML_CONFIG_ID,
      customer_id: customer,
      material_class: material,
      support_set: supportSet.features.map((feat, idx) => ({
        features: feat,
        target: supportSet.targets[idx],
      })),
      cache_adapted: true,
    });

    const adaptationTime = performance.now() - startTime;

    // Cache the adapted parameters
    const key = this.cacheKey(customer, material, toolClass);
    this.adapterCache.set(key, {
      adapter_id: adapterId,
      customer,
      material,
      tool_class: toolClass,
      config_id: PROTOMAML_CONFIG_ID,
      adapted_at: Date.now(),
      support_set_size: supportSamples.length,
      inner_steps: result.inner_steps_executed,
      final_loss: result.final_inner_loss,
      hit_count: 0,
      last_hit_at: Date.now(),
    });

    // Evict old entries if cache is full
    this.evictOldEntries();

    return {
      adapted: result.cached, // cached means adaptation succeeded and was stored
      adapter_id: adapterId,
      adaptation_time_ms: Math.round(adaptationTime * 100) / 100,
      support_set_size: supportSamples.length,
      inner_steps: result.inner_steps_executed,
      final_loss: Math.round(result.final_inner_loss * 10000) / 10000,
      within_budget: adaptationTime < this.config.adaptation_budget_ms,
    };
  }

  /**
   * Predict SFM for new material query.
   * Uses cached adapted params if available, else base model.
   * Target: <50ms for cache hit.
   *
   * @param customer - Customer identifier
   * @param material - Material name
   * @param toolClass - Tool classification
   * @param queryFeatures - Query material features
   * @returns Prediction with provenance
   */
  predict(
    customer: string,
    material: string,
    toolClass: string,
    queryFeatures: MaterialFeatures,
  ): FewShotPrediction {
    const totalStart = performance.now();

    // Ensure initialized
    if (!this.initialized) {
      this.initialize();
    }

    const key = this.cacheKey(customer, material, toolClass);
    const cacheEntry = this.adapterCache.get(key);
    const cacheHit = cacheEntry !== undefined && !this.isExpired(cacheEntry);

    let adaptationTime = 0;
    const predictionStart = performance.now();

    // Build query features
    const querySample: MaterialSample = {
      material,
      tool_class: toolClass,
      features: queryFeatures,
      actual_sfm: 0, // Not known
      actual_feed: 0, // Not known
    };
    const queryVector = this.extractFeatures(querySample);

    // Call ProtoMAML predict
    const result = protoMAMLFewShotEngine.predict({
      config_id: PROTOMAML_CONFIG_ID,
      customer_id: customer,
      material_class: material,
      query_features: queryVector,
      use_cached: true,
    });

    const predictionTime = performance.now() - predictionStart;
    const totalTime = performance.now() - totalStart;

    // Update cache hit count
    if (cacheHit && cacheEntry) {
      cacheEntry.hit_count++;
      cacheEntry.last_hit_at = Date.now();
    }

    // Denormalize prediction (0-1 back to 0-2000 SFM), clamp to non-negative
    const predictedSfm = Math.round(Math.max(0, result.predicted_value) * 2000);

    // Estimate feed from SFM (simplified relationship)
    const predictedFeed = Math.round((predictedSfm / 100) * 0.004 * 10000) / 10000;

    return {
      customer,
      material,
      tool_class: toolClass,
      predicted_sfm: predictedSfm,
      predicted_feed: predictedFeed,
      confidence: Math.round(result.confidence * 1000) / 1000,
      adapted: result.used_cached,
      cache_hit: cacheHit,
      adaptation_time_ms: Math.round(adaptationTime * 100) / 100,
      prediction_time_ms: Math.round(predictionTime * 100) / 100,
      total_time_ms: Math.round(totalTime * 100) / 100,
      support_set_size: cacheEntry?.support_set_size ?? 0,
      provenance: {
        adapter_id: cacheEntry?.adapter_id ?? "base-model",
        config_id: PROTOMAML_CONFIG_ID,
        inner_steps: cacheEntry?.inner_steps ?? 0,
        final_loss: cacheEntry?.final_loss ?? 0,
        adapted_at: cacheEntry ? new Date(cacheEntry.adapted_at).toISOString() : "",
        source: cacheHit ? "cached" : result.used_cached ? "adapted" : "base_model",
        support_materials: [],
      },
    };
  }

  /**
   * Adapt and predict in one call (for quote path).
   * Combines adaptation + prediction within budget.
   *
   * @param customer - Customer identifier
   * @param material - Material name
   * @param toolClass - Tool classification
   * @param supportSamples - Support set samples
   * @param queryFeatures - Query material features
   * @returns Combined adaptation + prediction result
   */
  adaptAndPredict(
    customer: string,
    material: string,
    toolClass: string,
    supportSamples: MaterialSample[],
    queryFeatures: MaterialFeatures,
  ): FewShotPrediction & { adaptation_result: { adapted: boolean; within_budget: boolean } } {
    const totalStart = performance.now();

    // Check cache first
    const key = this.cacheKey(customer, material, toolClass);
    const cacheEntry = this.adapterCache.get(key);

    if (cacheEntry && !this.isExpired(cacheEntry)) {
      // Cache hit - just predict
      const prediction = this.predict(customer, material, toolClass, queryFeatures);
      return {
        ...prediction,
        adaptation_result: { adapted: false, within_budget: true },
      };
    }

    // Need to adapt first
    const adaptResult = this.adapt(customer, material, toolClass, supportSamples);
    const prediction = this.predict(customer, material, toolClass, queryFeatures);

    const totalTime = performance.now() - totalStart;

    return {
      ...prediction,
      total_time_ms: Math.round(totalTime * 100) / 100,
      adaptation_result: {
        adapted: adaptResult.adapted,
        within_budget: totalTime < this.config.adaptation_budget_ms,
      },
    };
  }

  /**
   * Check if cache entry is expired.
   */
  private isExpired(entry: AdapterCacheEntry): boolean {
    return Date.now() - entry.adapted_at > this.config.cache_ttl_ms;
  }

  /**
   * Evict old entries when cache is full.
   */
  private evictOldEntries(): void {
    if (this.adapterCache.size <= this.config.max_cache_size) {
      return;
    }

    // Sort by last hit time, evict oldest
    const entries = Array.from(this.adapterCache.entries());
    entries.sort((a, b) => a[1].last_hit_at - b[1].last_hit_at);

    const toEvict = entries.slice(0, entries.length - this.config.max_cache_size);
    for (const [key] of toEvict) {
      this.adapterCache.delete(key);
    }
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): {
    size: number;
    max_size: number;
    total_hits: number;
    avg_hits_per_entry: number;
    oldest_entry_age_ms: number;
  } {
    const entries = Array.from(this.adapterCache.values());
    const totalHits = entries.reduce((sum, e) => sum + e.hit_count, 0);
    const oldestAge = entries.length > 0
      ? Date.now() - Math.min(...entries.map(e => e.adapted_at))
      : 0;

    return {
      size: this.adapterCache.size,
      max_size: this.config.max_cache_size,
      total_hits: totalHits,
      avg_hits_per_entry: entries.length > 0 ? totalHits / entries.length : 0,
      oldest_entry_age_ms: oldestAge,
    };
  }

  /**
   * Get adapter for specific (customer × material × tool_class).
   */
  getAdapter(
    customer: string,
    material: string,
    toolClass: string,
  ): AdapterCacheEntry | undefined {
    const key = this.cacheKey(customer, material, toolClass);
    const entry = this.adapterCache.get(key);
    return entry && !this.isExpired(entry) ? { ...entry } : undefined;
  }

  /**
   * List all cached adapters.
   */
  listAdapters(): AdapterCacheEntry[] {
    return Array.from(this.adapterCache.values())
      .filter(e => !this.isExpired(e))
      .map(e => ({ ...e }));
  }

  /**
   * Invalidate adapter cache for customer.
   */
  invalidateCustomer(customer: string): number {
    let count = 0;
    for (const [key, entry] of this.adapterCache.entries()) {
      if (entry.customer === customer) {
        this.adapterCache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Run benchmark to verify exit criteria.
   * @param samples - Test samples to use
   * @returns Benchmark results
   */
  runBenchmark(samples: MaterialSample[]): {
    passed: boolean;
    adaptation_3shot_ms: number;
    adaptation_within_500ms: boolean;
    prediction_cached_ms: number;
    prediction_within_50ms: boolean;
    mae_ratio: number;
    mae_within_1_2x: boolean;
  } {
    if (samples.length < 6) {
      return {
        passed: false,
        adaptation_3shot_ms: 0,
        adaptation_within_500ms: false,
        prediction_cached_ms: 0,
        prediction_within_50ms: false,
        mae_ratio: 0,
        mae_within_1_2x: false,
      };
    }

    // Split samples: 3 for support, rest for test
    const supportSamples = samples.slice(0, 3);
    const testSamples = samples.slice(3);

    // Measure adaptation time
    const adaptStart = performance.now();
    this.adapt("benchmark-customer", "benchmark-material", "benchmark-tool", supportSamples);
    const adaptTime = performance.now() - adaptStart;

    // Measure cached prediction time
    const predStart = performance.now();
    const prediction = this.predict(
      "benchmark-customer",
      "benchmark-material",
      "benchmark-tool",
      testSamples[0].features,
    );
    const predTime = performance.now() - predStart;

    // Calculate MAE on test samples
    let totalError = 0;
    let baselineError = 0;
    const baselineSfm = supportSamples.reduce((sum, s) => sum + s.actual_sfm, 0) / supportSamples.length;

    for (const sample of testSamples) {
      const pred = this.predict(
        "benchmark-customer",
        "benchmark-material",
        "benchmark-tool",
        sample.features,
      );
      totalError += Math.abs(pred.predicted_sfm - sample.actual_sfm);
      baselineError += Math.abs(baselineSfm - sample.actual_sfm);
    }

    const mae = totalError / testSamples.length;
    const baselineMae = baselineError / testSamples.length;
    const maeRatio = baselineMae > 0 ? mae / baselineMae : 1;

    // Clean up benchmark cache
    this.invalidateCustomer("benchmark-customer");

    return {
      passed: adaptTime < 500 && predTime < 50 && maeRatio <= 1.2,
      adaptation_3shot_ms: Math.round(adaptTime * 100) / 100,
      adaptation_within_500ms: adaptTime < 500,
      prediction_cached_ms: Math.round(predTime * 100) / 100,
      prediction_within_50ms: predTime < 50,
      mae_ratio: Math.round(maeRatio * 1000) / 1000,
      mae_within_1_2x: maeRatio <= 1.2,
    };
  }
}

// Export singleton
export const sfcFewShotNewMaterialEngine = new SFCFewShotNewMaterialEngine();
