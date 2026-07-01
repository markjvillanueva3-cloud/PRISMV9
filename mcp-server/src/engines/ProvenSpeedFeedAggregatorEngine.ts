/**
 * ProvenSpeedFeedAggregatorEngine — KAR-MS2 U-KAR13
 * Aggregate extracted S/F data by material/operation/tool with statistical analysis.
 *
 * Takes extracted speed/feed data from:
 *   - OkumaOSPParserEngine (lathe programs)
 *   - MillPatternMinerEngine (mill programs)
 *
 * Produces:
 *   - Aggregated proven parameters by material group
 *   - Statistical analysis (mean, stddev, confidence intervals)
 *   - Outlier detection and flagging
 *   - Recommendations for SpeedFeedOrchestratorEngine
 *
 * @module ProvenSpeedFeedAggregatorEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";
import { safeWriteSync } from "../utils/atomicWrite.js";
import type { DetailedSpeedFeed } from "./OkumaOSPParserEngine.js";
import type { ChipLoadSample } from "./MillPatternMinerEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type OperationCategory =
  | "od_roughing" | "od_finishing" | "id_roughing" | "id_finishing"
  | "facing" | "grooving" | "threading" | "parting"
  | "drilling" | "center_drilling" | "peck_drilling" | "boring"
  | "milling_roughing" | "milling_finishing" | "pocketing" | "contouring"
  | "unknown";

export type MaterialGroup =
  | "tool_steel" | "stainless" | "aluminum" | "brass" | "copper"
  | "cast_iron" | "carbon_steel" | "alloy_steel" | "titanium"
  | "inconel" | "tungsten_carbide" | "graphite" | "plastic"
  | "unknown";

export interface ProvenParameter {
  /** Unique ID for this proven parameter set */
  id: string;
  /** Material group */
  materialGroup: MaterialGroup;
  /** Operation category */
  operationCategory: OperationCategory;
  /** Tool type description */
  toolType: string;
  /** Sample count used for statistics */
  sampleCount: number;
  /** CSS speed statistics */
  cssSpeed: StatisticalSummary | null;
  /** Direct RPM statistics */
  directRPM: StatisticalSummary | null;
  /** Max RPM clamp statistics */
  maxRPM: StatisticalSummary | null;
  /** Feed rate statistics */
  feedRate: StatisticalSummary | null;
  /** Chip load statistics (mill only) */
  chipLoad: StatisticalSummary | null;
  /** Source programs */
  sources: string[];
  /** Customers where this was observed */
  customers: string[];
  /** Confidence level (0-1) based on sample count and consistency */
  confidence: number;
  /** Last updated timestamp */
  updatedAt: string;
}

export interface StatisticalSummary {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Mean value */
  mean: number;
  /** Standard deviation */
  stdDev: number;
  /** Median value */
  median: number;
  /** 25th percentile */
  p25: number;
  /** 75th percentile */
  p75: number;
  /** Number of samples */
  n: number;
  /** Coefficient of variation (stdDev/mean) */
  cv: number;
  /** Outliers (values > 2 stdDev from mean) */
  outliers: number[];
}

export interface AggregationResult {
  /** When aggregation was performed */
  aggregatedAt: string;
  /** Total programs processed */
  totalPrograms: number;
  /** Total speed/feed samples processed */
  totalSamples: number;
  /** Aggregated proven parameters */
  provenParameters: ProvenParameter[];
  /** Outliers flagged during aggregation */
  outliersFlagged: Array<{
    source: string;
    value: number;
    expected: { min: number; max: number };
    reason: string;
  }>;
  /** Material group distribution */
  byMaterialGroup: Record<MaterialGroup, number>;
  /** Operation category distribution */
  byOperationCategory: Record<OperationCategory, number>;
}

/**
 * Persisted, versioned proven-S/F store. Serialized form of the in-memory
 * `provenParams` Map so the aggregated parameters survive across processes and
 * the live MCP server can hydrate them at first read (the orchestrator's
 * proven-blend at SpeedFeedOrchestratorEngine.ts:2196 is otherwise dead because
 * the singleton starts empty every process). The aggregated store is small
 * (~hundreds of material:op:machine keys) even though the raw mined corpus is
 * large, so load-at-init is cheap and synchronous.
 */
export interface ProvenSpeedFeedStore {
  /** Store schema version (gate hydration on a match) */
  schemaVersion: string;
  /** ISO timestamp the store was generated */
  generatedAt: string;
  /** Provenance of the aggregated data (e.g. "jm-die-corpus") */
  source: string;
  /** Total programs mined into this store */
  totalPrograms: number;
  /** Total speed/feed samples aggregated */
  totalSamples: number;
  /** Serialized proven parameters (the Map values) */
  params: ProvenParameter[];
}

// ============================================================================
// MATERIAL INFERENCE
// ============================================================================

const CUSTOMER_MATERIAL_HINTS: Record<string, MaterialGroup> = {
  // Tool steel customers (die/mold industry)
  "ITW": "tool_steel",
  "CAMCAR": "tool_steel",
  "TEXTRON": "tool_steel",
  "SFS": "alloy_steel",
  "OPTIMAS": "alloy_steel",
  "ELGIN": "carbon_steel",
  "FASTENAL": "carbon_steel",
  // Aerospace
  "ALCOA": "aluminum",
  "ARCONIC": "aluminum",
  // General fastener
  "HOLO-KROME": "alloy_steel",
  "ACUMENT": "alloy_steel",
};

const OPERATION_DESC_TO_MATERIAL: Array<{ pattern: RegExp; material: MaterialGroup }> = [
  { pattern: /M[24]|D[24]|S[17]|A[24]|H13/i, material: "tool_steel" },
  { pattern: /carbide|tungsten|WC/i, material: "tungsten_carbide" },
  { pattern: /graphite|EDM/i, material: "graphite" },
  { pattern: /brass/i, material: "brass" },
  { pattern: /alum|6061|7075/i, material: "aluminum" },
  { pattern: /stainless|304|316|17-4/i, material: "stainless" },
  { pattern: /inconel|718|625/i, material: "inconel" },
  { pattern: /titanium|Ti-6/i, material: "titanium" },
  { pattern: /cast\s*iron/i, material: "cast_iron" },
  { pattern: /1045|1018|1020|4140|4340/i, material: "alloy_steel" },
];

// ============================================================================
// ENGINE
// ============================================================================

export class ProvenSpeedFeedAggregatorEngine {
  /** Store schema version -- hydration is skipped on a mismatch (fail-soft). */
  static readonly STORE_SCHEMA_VERSION = "1.0.0";

  private provenParams: Map<string, ProvenParameter> = new Map();
  /** Whether a load-at-init hydration attempt has already run this process. */
  private hydrated = false;

  /**
   * Aggregate lathe speed/feed data from Okuma parser.
   */
  aggregateLatheData(data: DetailedSpeedFeed[]): AggregationResult {
    const result = this.initResult();
    const samples: Map<string, number[]> = new Map();

    for (const entry of data) {
      result.totalSamples++;

      // Infer material from source path/customer
      const materialGroup = this.inferMaterial(entry.filePath, entry.operationDescription);
      const opCategory = this.mapLatheOperation(entry.operationType);

      // Create aggregation key
      const key = `${materialGroup}:${opCategory}:lathe`;

      // Get or create proven parameter
      let param = this.provenParams.get(key);
      if (!param) {
        param = this.initProvenParam(key, materialGroup, opCategory, "lathe_tool");
        this.provenParams.set(key, param);
      }

      // Accumulate samples
      if (entry.cssSpeed) {
        this.addSample(samples, `${key}:css`, entry.cssSpeed);
      }
      if (entry.directRPM) {
        this.addSample(samples, `${key}:rpm`, entry.directRPM);
      }
      if (entry.maxRPM) {
        this.addSample(samples, `${key}:maxrpm`, entry.maxRPM);
      }
      for (const feed of entry.feedRates) {
        this.addSample(samples, `${key}:feed`, feed.value);
      }

      // Track sources
      if (!param.sources.includes(entry.filePath)) {
        param.sources.push(entry.filePath);
      }
      param.sampleCount++;

      // Update distributions
      result.byMaterialGroup[materialGroup] = (result.byMaterialGroup[materialGroup] || 0) + 1;
      result.byOperationCategory[opCategory] = (result.byOperationCategory[opCategory] || 0) + 1;
    }

    // Compute statistics for all accumulated samples
    this.computeStatistics(samples, result);

    result.provenParameters = Array.from(this.provenParams.values());
    result.totalPrograms = new Set(data.map(d => d.filePath)).size;

    return result;
  }

  /**
   * Aggregate mill chip load data from MillPatternMiner.
   */
  aggregateMillData(data: ChipLoadSample[]): AggregationResult {
    const result = this.initResult();
    const samples: Map<string, number[]> = new Map();

    for (const entry of data) {
      result.totalSamples++;

      const materialGroup = this.inferMaterial(entry.program, entry.tool_desc || "");
      const opCategory = this.mapMillOperation(entry.operation);

      const key = `${materialGroup}:${opCategory}:mill`;

      let param = this.provenParams.get(key);
      if (!param) {
        param = this.initProvenParam(key, materialGroup, opCategory, "mill_tool");
        this.provenParams.set(key, param);
      }

      // Accumulate samples
      this.addSample(samples, `${key}:rpm`, entry.rpm);
      this.addSample(samples, `${key}:feed`, entry.feed_rate);
      if (entry.chip_load) {
        this.addSample(samples, `${key}:chipload`, entry.chip_load);
      }

      if (!param.sources.includes(entry.program)) {
        param.sources.push(entry.program);
      }
      param.sampleCount++;

      result.byMaterialGroup[materialGroup] = (result.byMaterialGroup[materialGroup] || 0) + 1;
      result.byOperationCategory[opCategory] = (result.byOperationCategory[opCategory] || 0) + 1;
    }

    this.computeStatistics(samples, result);

    result.provenParameters = Array.from(this.provenParams.values());
    result.totalPrograms = new Set(data.map(d => d.program)).size;

    return result;
  }

  /**
   * Get proven parameters for a given material/operation combination.
   */
  getProvenParams(materialGroup: MaterialGroup, opCategory: OperationCategory): ProvenParameter | null {
    this.ensureHydrated();
    // Try exact match first
    for (const [key, param] of this.provenParams) {
      if (param.materialGroup === materialGroup && param.operationCategory === opCategory) {
        return param;
      }
    }
    return null;
  }

  /**
   * Get all proven parameters above a confidence threshold.
   */
  getHighConfidenceParams(minConfidence: number = 0.7): ProvenParameter[] {
    this.ensureHydrated();
    return Array.from(this.provenParams.values()).filter(p => p.confidence >= minConfidence);
  }

  /**
   * Export proven parameters to JSON for SpeedFeedOrchestratorEngine.
   */
  exportForSpeedFeedOrchestrator(): Array<{
    materialGroup: string;
    operation: string;
    css: { recommended: number; range: [number, number] } | null;
    feed: { recommended: number; range: [number, number] } | null;
    confidence: number;
    sampleCount: number;
  }> {
    this.ensureHydrated();
    const exports: Array<{
      materialGroup: string;
      operation: string;
      css: { recommended: number; range: [number, number] } | null;
      feed: { recommended: number; range: [number, number] } | null;
      confidence: number;
      sampleCount: number;
    }> = [];

    for (const param of this.provenParams.values()) {
      if (param.sampleCount < 3) continue; // Skip low sample counts

      exports.push({
        materialGroup: param.materialGroup,
        operation: param.operationCategory,
        css: param.cssSpeed ? {
          recommended: param.cssSpeed.median,
          range: [param.cssSpeed.p25, param.cssSpeed.p75],
        } : null,
        feed: param.feedRate ? {
          recommended: param.feedRate.median,
          range: [param.feedRate.p25, param.feedRate.p75],
        } : null,
        confidence: param.confidence,
        sampleCount: param.sampleCount,
      });
    }

    return exports.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Clear accumulated data (for fresh aggregation).
   */
  clear(): void {
    this.provenParams.clear();
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE (load-at-init + serialize) -- KAR-MS2 U-SFC-PROVEN-PIPELINE-ACTIVATE
  //
  // The calculation methods above stay pure (no I/O). These I/O methods are the
  // separated persistence layer that lets the live MCP server hydrate the
  // aggregated proven parameters at first read. Fail-soft on every path: a
  // missing/corrupt/schema-mismatched store must NEVER crash the server or the
  // orchestrator's proven-blend; it just leaves the map empty (the prior
  // behaviour, so this is strictly additive).
  // --------------------------------------------------------------------------

  /** Resolve the on-disk store path (env override, then canonical mcp-server/data/state). */
  resolveStorePath(explicit?: string): string {
    if (explicit && explicit.trim()) return explicit.trim();
    const env = process.env.PRISM_PROVEN_SF_STORE;
    if (env && env.trim()) return env.trim();
    return path.join(PATHS.MCP_SERVER, "data", "state", "proven-speed-feed-store.json");
  }

  /**
   * Serialize the in-memory proven parameters into a versioned store object.
   * Pure (no I/O) -- the persist path stringifies + writes this.
   */
  serialize(meta?: { source?: string; totalPrograms?: number; totalSamples?: number }): ProvenSpeedFeedStore {
    return {
      schemaVersion: ProvenSpeedFeedAggregatorEngine.STORE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: meta?.source ?? "jm-die-corpus",
      totalPrograms: meta?.totalPrograms ?? 0,
      totalSamples: meta?.totalSamples ?? 0,
      params: Array.from(this.provenParams.values()),
    };
  }

  /**
   * Hydrate the in-memory map from a (already-parsed) store object. Pure (no I/O).
   * Gated on a schema-version match; malformed entries are skipped, not fatal.
   * Marks the engine hydrated so a subsequent first-read does not re-load.
   * @returns counts {loaded, skipped} and an optional skip reason.
   */
  hydrate(store: ProvenSpeedFeedStore | null | undefined): { loaded: number; skipped: number; reason?: string } {
    this.hydrated = true;
    if (!store || typeof store !== "object") {
      return { loaded: 0, skipped: 0, reason: "empty-store" };
    }
    if (store.schemaVersion !== ProvenSpeedFeedAggregatorEngine.STORE_SCHEMA_VERSION) {
      return {
        loaded: 0,
        skipped: Array.isArray(store.params) ? store.params.length : 0,
        reason: `schema-mismatch:${store.schemaVersion}`,
      };
    }
    let loaded = 0;
    let skipped = 0;
    for (const p of store.params ?? []) {
      if (!p || !p.id || !p.materialGroup || !p.operationCategory) {
        skipped++;
        continue;
      }
      this.provenParams.set(p.id, p);
      loaded++;
    }
    return { loaded, skipped };
  }

  /**
   * Synchronously load the persisted store from disk into the in-memory map.
   * Fail-soft: a missing file, parse error, or schema mismatch leaves the map
   * unchanged and returns ok:false (never throws).
   */
  loadFromStore(explicitPath?: string): { loaded: number; skipped: number; source: string; ok: boolean; reason?: string } {
    const file = this.resolveStorePath(explicitPath);
    this.hydrated = true;
    try {
      if (!fs.existsSync(file)) {
        return { loaded: 0, skipped: 0, source: file, ok: false, reason: "absent" };
      }
      const raw = fs.readFileSync(file, "utf-8");
      const store = JSON.parse(raw) as ProvenSpeedFeedStore;
      const res = this.hydrate(store);
      if (res.reason) {
        log.warn(`[ProvenSF] store hydration skipped (${res.reason}) from ${file}`);
      }
      return { ...res, source: file, ok: res.loaded > 0 };
    } catch (err) {
      log.warn(`[ProvenSF] loadFromStore fail-soft: ${(err as Error).message}`);
      return { loaded: 0, skipped: 0, source: file, ok: false, reason: (err as Error).message };
    }
  }

  /**
   * Persist the current in-memory proven parameters to the versioned store on
   * disk (atomic write). Used by the corpus-mining harness after aggregation.
   */
  persistToStore(
    explicitPath?: string,
    meta?: { source?: string; totalPrograms?: number; totalSamples?: number },
  ): { file: string; params: number } {
    const file = this.resolveStorePath(explicitPath);
    const store = this.serialize(meta);
    safeWriteSync(file, JSON.stringify(store, null, 2));
    return { file, params: store.params.length };
  }

  /**
   * Load-at-init guard: hydrate from the persisted store exactly once per
   * process, on the first read (getProvenParams / getHighConfidenceParams /
   * exportForSpeedFeedOrchestrator). This is what makes the orchestrator's
   * proven-blend live in the MCP server. Disable via PRISM_PROVEN_SF_NO_HYDRATE=1.
   */
  private ensureHydrated(): void {
    if (this.hydrated) return;
    if (process.env.PRISM_PROVEN_SF_NO_HYDRATE === "1") {
      this.hydrated = true;
      return;
    }
    this.loadFromStore();
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private initResult(): AggregationResult {
    return {
      aggregatedAt: new Date().toISOString(),
      totalPrograms: 0,
      totalSamples: 0,
      provenParameters: [],
      outliersFlagged: [],
      byMaterialGroup: {} as Record<MaterialGroup, number>,
      byOperationCategory: {} as Record<OperationCategory, number>,
    };
  }

  private initProvenParam(id: string, material: MaterialGroup, op: OperationCategory, toolType: string): ProvenParameter {
    return {
      id,
      materialGroup: material,
      operationCategory: op,
      toolType,
      sampleCount: 0,
      cssSpeed: null,
      directRPM: null,
      maxRPM: null,
      feedRate: null,
      chipLoad: null,
      sources: [],
      customers: [],
      confidence: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private addSample(samples: Map<string, number[]>, key: string, value: number): void {
    if (!samples.has(key)) {
      samples.set(key, []);
    }
    samples.get(key)!.push(value);
  }

  private computeStatistics(samples: Map<string, number[]>, result: AggregationResult): void {
    for (const [key, values] of samples) {
      if (values.length < 2) continue;

      const stats = this.calcStats(values);
      const [paramKey, field] = this.parseKey(key);

      const param = this.provenParams.get(paramKey);
      if (!param) continue;

      // Assign to appropriate field
      switch (field) {
        case "css": param.cssSpeed = stats; break;
        case "rpm": param.directRPM = stats; break;
        case "maxrpm": param.maxRPM = stats; break;
        case "feed": param.feedRate = stats; break;
        case "chipload": param.chipLoad = stats; break;
      }

      // Flag outliers
      for (const outlier of stats.outliers) {
        result.outliersFlagged.push({
          source: param.sources[param.sources.length - 1] || "unknown",
          value: outlier,
          expected: { min: stats.mean - 2 * stats.stdDev, max: stats.mean + 2 * stats.stdDev },
          reason: `${field} value ${outlier} is > 2σ from mean ${stats.mean.toFixed(2)}`,
        });
      }

      // Calculate confidence based on sample count and consistency
      param.confidence = this.calcConfidence(stats);
      param.updatedAt = new Date().toISOString();
    }
  }

  private calcStats(values: number[]): StatisticalSummary {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    const p25 = sorted[Math.floor(n * 0.25)];
    const p75 = sorted[Math.floor(n * 0.75)];

    // Flag outliers (> 2 stdDev from mean)
    const outliers = values.filter(v => Math.abs(v - mean) > 2 * stdDev);

    return {
      min: sorted[0],
      max: sorted[n - 1],
      mean,
      stdDev,
      median,
      p25,
      p75,
      n,
      cv,
      outliers,
    };
  }

  private calcConfidence(stats: StatisticalSummary): number {
    // Base confidence from sample count (asymptotic to 1)
    const sampleConfidence = 1 - Math.exp(-stats.n / 10);

    // Consistency penalty based on CV (coefficient of variation)
    // CV > 0.5 = high variability = lower confidence
    const consistencyPenalty = Math.max(0, 1 - stats.cv);

    // Outlier penalty
    const outlierPenalty = 1 - (stats.outliers.length / stats.n);

    return Math.min(1, sampleConfidence * consistencyPenalty * outlierPenalty);
  }

  private parseKey(key: string): [string, string] {
    const lastColon = key.lastIndexOf(":");
    return [key.slice(0, lastColon), key.slice(lastColon + 1)];
  }

  private inferMaterial(filePath: string, description: string): MaterialGroup {
    // Check operation description first
    for (const { pattern, material } of OPERATION_DESC_TO_MATERIAL) {
      if (pattern.test(description)) {
        return material;
      }
    }

    // Check customer hints from path
    const upperPath = filePath.toUpperCase();
    for (const [customer, material] of Object.entries(CUSTOMER_MATERIAL_HINTS)) {
      if (upperPath.includes(customer)) {
        return material;
      }
    }

    // JM Die primarily works with tool steels
    return "tool_steel";
  }

  private mapLatheOperation(opType: string): OperationCategory {
    const map: Record<string, OperationCategory> = {
      "od_rough": "od_roughing",
      "od_finish": "od_finishing",
      "id_rough": "id_roughing",
      "id_finish": "id_finishing",
      "face": "facing",
      "groove": "grooving",
      "cutoff": "parting",
      "thread": "threading",
      "drill": "drilling",
      "center_drill": "center_drilling",
      "peck_drill": "peck_drilling",
      "bore": "boring",
      "bore_finish": "boring",
    };
    return map[opType] || "unknown";
  }

  private mapMillOperation(opType: string): OperationCategory {
    const lower = opType.toLowerCase();
    if (lower.includes("rough")) return "milling_roughing";
    if (lower.includes("finish")) return "milling_finishing";
    if (lower.includes("pocket")) return "pocketing";
    if (lower.includes("contour")) return "contouring";
    if (lower.includes("drill")) return "drilling";
    if (lower.includes("bore")) return "boring";
    return "unknown";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const provenSpeedFeedAggregatorEngine = new ProvenSpeedFeedAggregatorEngine();
