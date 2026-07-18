/**
 * PartSimilaritySearchEngine — HM-KC-MS10-S2/U-HKC53
 *
 * Indexes FeatureSequenceRecords by geometric hash for O(1) bucket lookup.
 * Computes similarity metric: feature_type_overlap × dimension_proximity × material_match.
 * Returns top-N similar parts with per-feature adaptation suggestions.
 *
 * @milestone HM-KC-MS10/U-HKC53
 */

import type { FeatureSequenceRecord, StockDefinition } from "./HMCProjectParserEngine.js";
import type { FeatureType } from "../FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Similarity match result */
export interface SimilarityMatch {
  /** Matched record */
  record: FeatureSequenceRecord;
  /** Overall similarity score (0-100) */
  score: number;
  /** Per-dimension breakdown */
  breakdown: {
    featureTypeOverlap: number;   // 0-100
    dimensionProximity: number;   // 0-100
    materialMatch: number;        // 0-100
    complexityMatch: number;      // 0-100
    operationOverlap: number;     // 0-100
  };
  /** Per-feature adaptation suggestions */
  adaptations: AdaptationSuggestion[];
}

/** Adaptation suggestion for replicating a similar part */
export interface AdaptationSuggestion {
  /** Feature type to adapt */
  featureType: FeatureType;
  /** What needs changing */
  change: "scale_dimensions" | "add_feature" | "remove_feature" | "adjust_parameters" | "change_tool";
  /** Description of the adaptation */
  description: string;
  /** Scale factor if applicable */
  scaleFactor?: number;
}

/** Search query parameters */
export interface SimilarityQuery {
  /** Part type filter */
  partType?: FeatureSequenceRecord["partType"];
  /** Material group filter */
  materialGroup?: StockDefinition["isoGroup"];
  /** Minimum complexity score */
  minComplexity?: number;
  /** Maximum complexity score */
  maxComplexity?: number;
  /** Required feature types */
  requiredFeatures?: FeatureType[];
  /** Maximum results */
  topN?: number;
}

/** Geometric hash for bucket lookup */
type GeometricHash = string;

// ══════════════════════════════════════════════════════════════════════════════
// ISO GROUP AFFINITY MATRIX
// ══════════════════════════════════════════════════════════════════════════════

const ISO_GROUPS: StockDefinition["isoGroup"][] = ["P", "M", "K", "N", "S", "H"];

/** Affinity between ISO material groups (0-1, symmetric) */
const ISO_AFFINITY: Record<string, Record<string, number>> = {
  P: { P: 1.0, M: 0.6, K: 0.5, N: 0.3, S: 0.4, H: 0.7 },
  M: { P: 0.6, M: 1.0, K: 0.4, N: 0.2, S: 0.7, H: 0.5 },
  K: { P: 0.5, K: 1.0, M: 0.4, N: 0.4, S: 0.3, H: 0.4 },
  N: { P: 0.3, N: 1.0, M: 0.2, K: 0.4, S: 0.2, H: 0.2 },
  S: { P: 0.4, S: 1.0, M: 0.7, K: 0.3, N: 0.2, H: 0.6 },
  H: { P: 0.7, H: 1.0, M: 0.5, K: 0.4, N: 0.2, S: 0.6 },
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class PartSimilaritySearchEngine {
  /** Maximum records to retain */
  private static readonly MAX_RECORDS = 50_000;

  /** Indexed records: hash → records */
  private buckets = new Map<GeometricHash, FeatureSequenceRecord[]>();
  /** All indexed records */
  private allRecords: FeatureSequenceRecord[] = [];
  /** Record IDs for deduplication */
  private indexedIds = new Set<string>();

  /**
   * Index a FeatureSequenceRecord for later similarity search.
   * O(1) insert into hash bucket. Deduplicates and caps memory.
   */
  index(record: FeatureSequenceRecord): void {
    if (this.indexedIds.has(record.id)) return; // skip duplicates

    // Evict oldest if over cap
    if (this.allRecords.length >= PartSimilaritySearchEngine.MAX_RECORDS) {
      const evicted = this.allRecords.shift()!;
      this.indexedIds.delete(evicted.id);
      const evictedHash = this.computeHash(evicted);
      const bucket = this.buckets.get(evictedHash);
      if (bucket) {
        const idx = bucket.indexOf(evicted);
        if (idx >= 0) bucket.splice(idx, 1);
        if (bucket.length === 0) this.buckets.delete(evictedHash);
      }
    }

    this.allRecords.push(record);
    this.indexedIds.add(record.id);
    const hash = this.computeHash(record);
    if (!this.buckets.has(hash)) this.buckets.set(hash, []);
    this.buckets.get(hash)!.push(record);
  }

  /**
   * Index multiple records at once.
   */
  indexBatch(records: FeatureSequenceRecord[]): void {
    for (const rec of records) this.index(rec);
  }

  /**
   * Search for similar parts to a query record.
   * Returns top-N matches sorted by similarity score (descending).
   *
   * @param queryRecord - The record to find similar parts for
   * @param query - Optional search filters
   * @returns Array of SimilarityMatch sorted by score
   */
  search(queryRecord: FeatureSequenceRecord, query?: SimilarityQuery): SimilarityMatch[] {
    const topN = query?.topN ?? 3;

    // Filter candidates
    let candidates = this.allRecords.filter((r) => r.id !== queryRecord.id);

    if (query?.partType) {
      candidates = candidates.filter((r) => r.partType === query.partType);
    }
    if (query?.materialGroup) {
      candidates = candidates.filter((r) => r.stock.isoGroup === query.materialGroup);
    }
    if (query?.minComplexity !== undefined) {
      candidates = candidates.filter((r) => r.complexityScore >= query.minComplexity!);
    }
    if (query?.maxComplexity !== undefined) {
      candidates = candidates.filter((r) => r.complexityScore <= query.maxComplexity!);
    }
    if (query?.requiredFeatures && query.requiredFeatures.length > 0) {
      const required = new Set(query.requiredFeatures);
      candidates = candidates.filter((r) => {
        const featureTypes = new Set(r.features.map((f) => f.type));
        return [...required].every((ft) => featureTypes.has(ft));
      });
    }

    // Score all candidates
    const matches: SimilarityMatch[] = candidates.map((candidate) => {
      const breakdown = this.computeBreakdown(queryRecord, candidate);
      const score = this.aggregateScore(breakdown);
      const adaptations = this.generateAdaptations(queryRecord, candidate);
      return { record: candidate, score, breakdown, adaptations };
    });

    // Sort by score descending, return top N
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, topN);
  }

  /**
   * Search by geometric hash for O(1) bucket lookup.
   * Falls back to full search if no bucket match.
   */
  searchByHash(queryRecord: FeatureSequenceRecord, topN: number = 3): SimilarityMatch[] {
    const hash = this.computeHash(queryRecord);
    const bucket = this.buckets.get(hash) ?? [];

    if (bucket.length > 0) {
      // Score bucket matches only
      const matches = bucket
        .filter((r) => r.id !== queryRecord.id)
        .map((candidate) => {
          const breakdown = this.computeBreakdown(queryRecord, candidate);
          const score = this.aggregateScore(breakdown);
          const adaptations = this.generateAdaptations(queryRecord, candidate);
          return { record: candidate, score, breakdown, adaptations };
        })
        .sort((a, b) => b.score - a.score);

      if (matches.length >= topN) return matches.slice(0, topN);
    }

    // Fall back to full search
    return this.search(queryRecord, { topN });
  }

  /** Get total indexed record count */
  getIndexSize(): number {
    return this.allRecords.length;
  }

  /** Get bucket count (unique geometric hashes) */
  getBucketCount(): number {
    return this.buckets.size;
  }

  /** Clear all indexed records */
  clear(): void {
    this.allRecords = [];
    this.buckets.clear();
    this.indexedIds.clear();
  }

  // ── Geometric hash computation ───────────────────────────────────────────

  /**
   * Compute geometric hash for bucket indexing.
   * Hash = partType + featureTypeSet (sorted) + dimensionQuantile + materialGroup
   */
  private computeHash(record: FeatureSequenceRecord): GeometricHash {
    const partType = record.partType;
    const featureTypes = [...new Set(record.features.map((f) => f.type))].sort().join(",");
    const dimQuantile = this.dimensionQuantile(record.stock.dimensions);
    const matGroup = record.stock.isoGroup ?? "P";
    return `${partType}|${featureTypes}|${dimQuantile}|${matGroup}`;
  }

  /** Quantize dimensions into size buckets (small/medium/large) */
  private dimensionQuantile(dims: { x: number; y: number; z: number }): string {
    const vol = dims.x * dims.y * dims.z;
    if (vol < 50000) return "S";       // < 50cm³
    if (vol < 500000) return "M";      // < 500cm³
    if (vol < 5000000) return "L";     // < 5000cm³
    return "XL";
  }

  // ── Similarity scoring ───────────────────────────────────────────────────

  private computeBreakdown(
    query: FeatureSequenceRecord,
    candidate: FeatureSequenceRecord
  ): SimilarityMatch["breakdown"] {
    return {
      featureTypeOverlap: this.featureTypeOverlap(query, candidate),
      dimensionProximity: this.dimensionProximity(query, candidate),
      materialMatch: this.materialMatch(query, candidate),
      complexityMatch: this.complexityMatch(query, candidate),
      operationOverlap: this.operationOverlap(query, candidate),
    };
  }

  /** Feature type overlap: Jaccard index × 100 */
  private featureTypeOverlap(a: FeatureSequenceRecord, b: FeatureSequenceRecord): number {
    const setA = new Set(a.features.map((f) => f.type));
    const setB = new Set(b.features.map((f) => f.type));
    if (setA.size === 0 && setB.size === 0) return 100;
    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return Math.round((intersection / union) * 100);
  }

  /** Dimension proximity: 1 - normalized distance, × 100 */
  private dimensionProximity(a: FeatureSequenceRecord, b: FeatureSequenceRecord): number {
    const da = a.stock.dimensions;
    const db = b.stock.dimensions;
    const volA = da.x * da.y * da.z;
    const volB = db.x * db.y * db.z;
    if (volA === 0 || volB === 0) return 0;

    // Volume ratio (log scale for better differentiation)
    const volRatio = Math.min(volA, volB) / Math.max(volA, volB);
    // Aspect ratio similarity
    const sortedA = [da.x, da.y, da.z].sort((a, b) => a - b);
    const sortedB = [db.x, db.y, db.z].sort((a, b) => a - b);
    const aspectSim = sortedA.reduce((sum, v, i) => {
      const maxVal = Math.max(v, sortedB[i]);
      const ratio = maxVal === 0 ? 1 : Math.min(v, sortedB[i]) / maxVal;
      return sum + ratio;
    }, 0) / 3;

    return Math.round((volRatio * 0.5 + aspectSim * 0.5) * 100);
  }

  /** Material match: ISO affinity lookup × 100 */
  private materialMatch(a: FeatureSequenceRecord, b: FeatureSequenceRecord): number {
    const groupA = a.stock.isoGroup ?? "P";
    const groupB = b.stock.isoGroup ?? "P";
    const affinity = ISO_AFFINITY[groupA]?.[groupB] ?? 0.3;
    return Math.round(affinity * 100);
  }

  /** Complexity match: 1 - |diff|/10, × 100 */
  private complexityMatch(a: FeatureSequenceRecord, b: FeatureSequenceRecord): number {
    const diff = Math.abs(a.complexityScore - b.complexityScore);
    return Math.round(Math.max(0, (1 - diff / 10)) * 100);
  }

  /** Operation overlap: Jaccard on operation types × 100 */
  private operationOverlap(a: FeatureSequenceRecord, b: FeatureSequenceRecord): number {
    const setA = new Set(a.operations.map((o) => o.cycleCode));
    const setB = new Set(b.operations.map((o) => o.cycleCode));
    if (setA.size === 0 && setB.size === 0) return 100;
    const intersection = [...setA].filter((t) => setB.has(t)).length;
    const union = new Set([...setA, ...setB]).size;
    return Math.round((intersection / union) * 100);
  }

  /** Weighted aggregate score */
  private aggregateScore(breakdown: SimilarityMatch["breakdown"]): number {
    const weights = {
      featureTypeOverlap: 0.30,
      dimensionProximity: 0.20,
      materialMatch: 0.20,
      complexityMatch: 0.15,
      operationOverlap: 0.15,
    };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (breakdown as any)[key] * weight;
    }
    return Math.round(score * 10) / 10;
  }

  // ── Adaptation suggestions ───────────────────────────────────────────────

  private generateAdaptations(
    query: FeatureSequenceRecord,
    template: FeatureSequenceRecord
  ): AdaptationSuggestion[] {
    const suggestions: AdaptationSuggestion[] = [];

    const queryTypes = new Set(query.features.map((f) => f.type));
    const templateTypes = new Set(template.features.map((f) => f.type));

    // Features in template but not in query → remove
    for (const ft of templateTypes) {
      if (!queryTypes.has(ft)) {
        suggestions.push({
          featureType: ft,
          change: "remove_feature",
          description: `Template has ${ft} but query part does not — remove from adapted sequence`,
        });
      }
    }

    // Features in query but not in template → add
    for (const ft of queryTypes) {
      if (!templateTypes.has(ft)) {
        suggestions.push({
          featureType: ft,
          change: "add_feature",
          description: `Query part has ${ft} not in template — add new operations for this feature`,
        });
      }
    }

    // Shared features → check dimension scaling
    const queryDims = query.stock.dimensions;
    const templateDims = template.stock.dimensions;
    const scaleX = queryDims.x / (templateDims.x || 1);
    const scaleY = queryDims.y / (templateDims.y || 1);
    const scaleZ = queryDims.z / (templateDims.z || 1);
    const avgScale = (scaleX + scaleY + scaleZ) / 3;

    if (Math.abs(avgScale - 1.0) > 0.05) {
      for (const ft of queryTypes) {
        if (templateTypes.has(ft)) {
          suggestions.push({
            featureType: ft,
            change: "scale_dimensions",
            description: `Scale ${ft} dimensions by ${avgScale.toFixed(2)}x from template`,
            scaleFactor: Math.round(avgScale * 100) / 100,
          });
        }
      }
    }

    // Material change → adjust parameters
    if (query.stock.isoGroup !== template.stock.isoGroup) {
      suggestions.push({
        featureType: "face" as FeatureType, // Representative
        change: "adjust_parameters",
        description: `Material changed from ${template.stock.isoGroup ?? "unknown"} to ${query.stock.isoGroup ?? "unknown"} — recalculate S/F via SpeedFeedOrchestrator`,
      });
    }

    return suggestions;
  }
}

/** Singleton export */
export const partSimilaritySearchEngine = new PartSimilaritySearchEngine();
