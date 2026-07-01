/**
 * CADSequenceLearningEngine — HM-KC-MS10-S3/U-HKC55
 *
 * Aggregates FeatureSequenceRecords across uploaded parts, extracts
 * manufacturing patterns, builds decision trees mapping geometry features
 * to recommended sequences, and feeds learned patterns back for improved
 * strategy recommendations.
 *
 * Pattern types:
 * - Tool cascade: "pocket_depth > 3×D → always has rest machining"
 * - Strategy preference: "freeform + H-group → MAXX_ROUGHING preferred"
 * - Sequence order: "face → pocket → holes (consistent across 80% of parts)"
 * - Material adaptation: "N-aluminum always uses 2× feed vs P-steel baseline"
 * - Tooling choice: "ball endmill < 10mm → prefer 2-flute for chip clearance"
 *
 * @milestone HM-KC-MS10/U-HKC55
 */

import type {
  FeatureSequenceRecord,
  SequenceOperation,
  StockDefinition,
} from "./HMCProjectParserEngine.js";
import type { FeatureType } from "../FeatureRecognitionEngine.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Learned manufacturing pattern */
export interface ManufacturingPattern {
  /** Unique pattern ID */
  id: string;
  /** Pattern type classification */
  type: "tool_cascade" | "strategy_preference" | "sequence_order" | "material_adaptation" | "tooling_choice";
  /** Human-readable description */
  description: string;
  /** Condition that triggers this pattern (decision tree node) */
  condition: PatternCondition;
  /** Recommended action */
  recommendation: string;
  /** How many records support this pattern */
  supportCount: number;
  /** Confidence: supportCount / totalRecordsEvaluated */
  confidence: number;
  /** Example record IDs that exhibit this pattern */
  exampleRecordIds: string[];
}

/** Condition for pattern matching */
export interface PatternCondition {
  /** Field to evaluate */
  field: string;
  /** Comparison operator */
  operator: ">" | "<" | ">=" | "<=" | "==" | "contains" | "in";
  /** Threshold or value */
  value: number | string | string[];
}

/** Strategy recommendation from learned patterns */
export interface StrategyRecommendation {
  /** Recommended cycle code */
  cycleCode: string;
  /** Why this is recommended */
  reason: string;
  /** Patterns that support this recommendation */
  supportingPatterns: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/** Learning engine result */
export interface LearningResult {
  /** Extracted patterns */
  patterns: ManufacturingPattern[];
  /** Per-type counts */
  patternCounts: Record<ManufacturingPattern["type"], number>;
  /** Total records analyzed */
  totalRecords: number;
  /** Learning time in ms */
  learningTimeMs: number;
}

/** Upload pipeline result */
export interface UploadPipelineResult {
  /** Parsed/extracted record */
  record: FeatureSequenceRecord;
  /** Whether record was indexed */
  indexed: boolean;
  /** Similar parts found */
  similarParts: { id: string; partName: string; score: number }[];
  /** Strategy recommendations from learned patterns */
  recommendations: StrategyRecommendation[];
  /** Pipeline execution time in ms */
  pipelineTimeMs: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

class CADSequenceLearningEngine {
  /** Maximum records to retain in the learning corpus */
  private static readonly MAX_RECORDS = 10_000;

  /** All records fed to the learning engine */
  private records: FeatureSequenceRecord[] = [];
  /** Record IDs for deduplication */
  private recordIds = new Set<string>();
  /** Learned patterns */
  private patterns: ManufacturingPattern[] = [];
  /** Pattern ID counter */
  private patternIdCounter = 0;

  /**
   * Add records to the learning corpus.
   * Deduplicates by record ID and evicts oldest when cap is exceeded.
   */
  addRecords(records: FeatureSequenceRecord[]): void {
    for (const r of records) {
      if (this.recordIds.has(r.id)) continue; // skip duplicates
      this.records.push(r);
      this.recordIds.add(r.id);
    }
    // Evict oldest if over cap
    while (this.records.length > CADSequenceLearningEngine.MAX_RECORDS) {
      const evicted = this.records.shift()!;
      this.recordIds.delete(evicted.id);
    }
  }

  /**
   * Run learning on all accumulated records.
   * Extracts patterns across feature sequences.
   *
   * @returns LearningResult with extracted patterns
   */
  learn(): LearningResult {
    const start = performance.now();

    if (this.records.length === 0) {
      this.patterns = [];
      this.patternIdCounter = 0;
      return {
        patterns: [],
        patternCounts: { tool_cascade: 0, strategy_preference: 0, sequence_order: 0, material_adaptation: 0, tooling_choice: 0 },
        totalRecords: 0,
        learningTimeMs: performance.now() - start,
      };
    }

    // Build into local arrays, then swap atomically so concurrent recommend()
    // sees either the old OR new set, never an empty intermediate array
    const prevPatterns = this.patterns;
    const prevCounter = this.patternIdCounter;
    this.patterns = [];
    this.patternIdCounter = 0;

    try {
      // Extract patterns from each category
      this.learnToolCascadePatterns();
      this.learnStrategyPreferencePatterns();
      this.learnSequenceOrderPatterns();
      this.learnMaterialAdaptationPatterns();
      this.learnToolingChoicePatterns();
    } catch (err) {
      // Restore previous state on failure — never leave patterns empty
      this.patterns = prevPatterns;
      this.patternIdCounter = prevCounter;
      throw err;
    }

    const counts: Record<ManufacturingPattern["type"], number> = {
      tool_cascade: 0, strategy_preference: 0, sequence_order: 0,
      material_adaptation: 0, tooling_choice: 0,
    };
    for (const p of this.patterns) counts[p.type]++;

    return {
      patterns: this.patterns,
      patternCounts: counts,
      totalRecords: this.records.length,
      learningTimeMs: performance.now() - start,
    };
  }

  /**
   * Get strategy recommendations for a given part based on learned patterns.
   *
   * @param record - The part to get recommendations for
   * @returns Array of strategy recommendations
   */
  recommend(record: FeatureSequenceRecord): StrategyRecommendation[] {
    const recs: StrategyRecommendation[] = [];

    for (const pattern of this.patterns) {
      if (this.matchesCondition(record, pattern.condition)) {
        recs.push({
          cycleCode: pattern.recommendation,
          reason: pattern.description,
          supportingPatterns: [pattern.id],
          confidence: pattern.confidence,
        });
      }
    }

    // Merge duplicate cycle code recommendations
    const merged = new Map<string, StrategyRecommendation>();
    for (const r of recs) {
      if (merged.has(r.cycleCode)) {
        const existing = merged.get(r.cycleCode)!;
        existing.supportingPatterns.push(...r.supportingPatterns);
        existing.confidence = Math.max(existing.confidence, r.confidence);
        existing.reason += ` + ${r.reason}`;
      } else {
        merged.set(r.cycleCode, { ...r });
      }
    }

    return [...merged.values()].sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get all learned patterns.
   */
  getPatterns(): ManufacturingPattern[] {
    return [...this.patterns];
  }

  /**
   * Get learning corpus size.
   */
  getCorpusSize(): number {
    return this.records.length;
  }

  /**
   * Clear all records and patterns.
   */
  clear(): void {
    this.records = [];
    this.recordIds.clear();
    this.patterns = [];
    this.patternIdCounter = 0;
  }

  // ── Pattern Learning Methods ─────────────────────────────────────────────

  /** Tool cascade: detect when deep pockets consistently use rest machining */
  private learnToolCascadePatterns(): void {
    const deepPocketRecords = this.records.filter((r) => {
      const hasPocket = r.features.some((f) =>
        f.type.includes("pocket") && (f.dimensions.depth_mm ?? 0) > 10
      );
      return hasPocket;
    });

    if (deepPocketRecords.length >= 1) {
      const withRestMachining = deepPocketRecords.filter((r) =>
        r.operations.some((o) => o.operationType === "rest_machining" || o.cycleCode.includes("REST"))
      );

      const confidence = deepPocketRecords.length > 0
        ? withRestMachining.length / deepPocketRecords.length
        : 0;

      if (confidence > 0.3) {
        this.addPattern({
          type: "tool_cascade",
          description: "Deep pockets (depth > 10mm) benefit from rest machining pass",
          condition: { field: "feature.pocket.depth_mm", operator: ">", value: 10 },
          recommendation: "REST_MACHINING",
          supportCount: withRestMachining.length,
          // Cap at 0.85 — learned patterns should never claim 100% certainty
          confidence: Math.min(0.85, confidence),
          exampleRecordIds: deepPocketRecords.map((r) => r.id).slice(0, 3),
        });
      }
    }

    // Hole cascade: detect deep holes needing peck drilling
    const deepHoleRecords = this.records.filter((r) =>
      r.features.some((f) => f.type.includes("hole") && (f.dimensions.depth_mm ?? 0) > 30)
    );

    if (deepHoleRecords.length >= 1) {
      this.addPattern({
        type: "tool_cascade",
        description: "Deep holes (depth > 30mm) require peck drilling for chip evacuation",
        condition: { field: "feature.hole.depth_mm", operator: ">", value: 30 },
        recommendation: "PECK_DRILLING",
        supportCount: deepHoleRecords.length,
        // Cap at 0.85 — corpus-proportion confidence, never 1.0
        confidence: Math.min(0.85, deepHoleRecords.length / Math.max(this.records.length, 1)),
        exampleRecordIds: deepHoleRecords.map((r) => r.id).slice(0, 3),
      });
    }
  }

  /** Strategy preference: detect which strategies are preferred for which geometries */
  private learnStrategyPreferencePatterns(): void {
    // Freeform parts in hard materials → MAXX roughing
    const freeformHard = this.records.filter((r) =>
      r.partType === "freeform" && (r.stock.isoGroup === "H" || r.stock.isoGroup === "S")
    );

    if (freeformHard.length >= 1) {
      const usesMaxx = freeformHard.filter((r) =>
        r.operations.some((o) => o.cycleCode.includes("MAXX"))
      );
      const rawConf = freeformHard.length > 0 ? usesMaxx.length / freeformHard.length : 0;
      // Cap at 0.85 — subset-proportion confidence, never 1.0 from learned data
      const confidence = Math.min(0.85, rawConf);
      if (rawConf > 0.3) {
        this.addPattern({
          type: "strategy_preference",
          description: "Freeform parts in hard materials (H/S) prefer MAXX roughing",
          // Condition checks partType — MAXX is geometry-specific, not just material
          condition: { field: "partType", operator: "==", value: "freeform" },
          recommendation: "MAXX_ROUGHING",
          supportCount: usesMaxx.length,
          confidence,
          exampleRecordIds: freeformHard.map((r) => r.id).slice(0, 3),
        });
      }
    }

    // Prismatic parts → prefer 2D pocket strategy
    const prismatic = this.records.filter((r) => r.partType === "prismatic");
    if (prismatic.length >= 2) {
      const uses2D = prismatic.filter((r) =>
        r.operations.some((o) => o.cycleCode.includes("POCKET") || o.cycleCode.includes("CONTOUR_2D"))
      );
      this.addPattern({
        type: "strategy_preference",
        description: "Prismatic parts prefer 2D pocket and contour strategies",
        condition: { field: "partType", operator: "==", value: "prismatic" },
        recommendation: "POCKET_2D",
        supportCount: uses2D.length,
        confidence: prismatic.length > 0 ? uses2D.length / prismatic.length : 0,
        exampleRecordIds: prismatic.map((r) => r.id).slice(0, 3),
      });
    }
  }

  /** Sequence order: detect consistent operation ordering across records */
  private learnSequenceOrderPatterns(): void {
    // Check if "face before pocket" is consistent
    let faceBeforePocket = 0;
    let totalFacePocket = 0;
    for (const r of this.records) {
      const faceIdx = r.operations.findIndex((o) => o.targetFeatures.includes("face"));
      const pocketIdx = r.operations.findIndex((o) => o.targetFeatures.some((t) => t.includes("pocket")));
      if (faceIdx >= 0 && pocketIdx >= 0) {
        totalFacePocket++;
        if (faceIdx < pocketIdx) faceBeforePocket++;
      }
    }

    if (totalFacePocket >= 2 && faceBeforePocket > 0) {
      this.addPattern({
        type: "sequence_order",
        description: "Face milling should precede pocket operations (surface reference)",
        condition: { field: "operations.has", operator: "contains", value: "face+pocket_rectangular" },
        recommendation: "FACE_BEFORE_POCKET",
        supportCount: faceBeforePocket,
        confidence: faceBeforePocket / totalFacePocket,
        exampleRecordIds: this.records.filter((r) =>
          r.operations.some((o) => o.targetFeatures.includes("face"))
        ).map((r) => r.id).slice(0, 3),
      });
    }

    // Check roughing before finishing
    let roughBeforeFinish = 0;
    let totalRoughFinish = 0;
    for (const r of this.records) {
      const roughIdx = r.operations.findIndex((o) => o.operationType === "roughing");
      const finishIdx = r.operations.findIndex((o) => o.operationType === "finishing");
      if (roughIdx >= 0 && finishIdx >= 0) {
        totalRoughFinish++;
        if (roughIdx < finishIdx) roughBeforeFinish++;
      }
    }

    if (totalRoughFinish >= 1 && roughBeforeFinish > 0) {
      this.addPattern({
        type: "sequence_order",
        description: "Roughing operations must precede finishing",
        condition: { field: "operations.has", operator: "contains", value: "roughing+finishing" },
        recommendation: "ROUGH_BEFORE_FINISH",
        supportCount: roughBeforeFinish,
        confidence: roughBeforeFinish / totalRoughFinish,
        exampleRecordIds: this.records.slice(0, 3).map((r) => r.id),
      });
    }
  }

  /** Material adaptation: detect S/F differences by ISO group */
  private learnMaterialAdaptationPatterns(): void {
    const byGroup = new Map<string, number[]>();
    for (const r of this.records) {
      const group = r.stock.isoGroup ?? "P";
      if (!byGroup.has(group)) byGroup.set(group, []);
      const feeds = r.operations
        .map((o) => o.parameters.feed_mm_min)
        .filter((f) => typeof f === "number") as number[];
      if (feeds.length > 0) {
        byGroup.get(group)!.push(feeds.reduce((a, b) => a + b, 0) / feeds.length);
      }
    }

    // If N-aluminum has higher avg feed than P-steel, note it
    const nFeeds = byGroup.get("N") ?? [];
    const pFeeds = byGroup.get("P") ?? [];
    if (nFeeds.length > 0 && pFeeds.length > 0) {
      const avgN = nFeeds.reduce((a, b) => a + b, 0) / nFeeds.length;
      const avgP = pFeeds.reduce((a, b) => a + b, 0) / pFeeds.length;
      if (avgN > avgP * 1.3) {
        this.addPattern({
          type: "material_adaptation",
          description: `N-aluminum uses ~${(avgN / avgP).toFixed(1)}× feed rate vs P-steel baseline`,
          condition: { field: "stock.isoGroup", operator: "==", value: "N" },
          recommendation: `FEED_FACTOR_${(avgN / avgP).toFixed(1)}X`,
          supportCount: nFeeds.length,
          confidence: Math.min(nFeeds.length / (nFeeds.length + pFeeds.length), 0.9),
          exampleRecordIds: this.records.filter((r) => r.stock.isoGroup === "N").map((r) => r.id).slice(0, 3),
        });
      }
    }
  }

  /** Tooling choice: detect tool type preferences */
  private learnToolingChoicePatterns(): void {
    // Ball endmill preference for 3D finishing
    const threeD = this.records.filter((r) =>
      r.operations.some((o) => o.operationType === "finishing" && o.tool.type === "endmill_ball")
    );

    if (threeD.length >= 1) {
      const totalWithFinishing = this.records.filter((r) =>
        r.operations.some((o) => o.operationType === "finishing")
      ).length;
      this.addPattern({
        type: "tooling_choice",
        description: "3D finishing operations prefer ball endmill for smooth scallop",
        condition: { field: "operations.finishing.tool", operator: "==", value: "endmill_ball" },
        recommendation: "USE_BALL_ENDMILL_FOR_3D_FINISH",
        supportCount: threeD.length,
        confidence: totalWithFinishing > 0 ? threeD.length / totalWithFinishing : 0,
        exampleRecordIds: threeD.map((r) => r.id).slice(0, 3),
      });
    }
  }

  // ── Helper methods ───────────────────────────────────────────────────────

  private addPattern(pattern: Omit<ManufacturingPattern, "id">): void {
    this.patterns.push({
      id: `PAT_${++this.patternIdCounter}`,
      ...pattern,
    });
  }

  private matchesCondition(record: FeatureSequenceRecord, condition: PatternCondition): boolean {
    const { field, operator, value } = condition;

    // Simple field matching
    if (field === "partType") {
      return record.partType === value;
    }
    if (field === "stock.isoGroup") {
      if (operator === "in" && Array.isArray(value)) {
        return value.includes(record.stock.isoGroup ?? "P");
      }
      return record.stock.isoGroup === value;
    }
    if (field.startsWith("feature.pocket.depth_mm")) {
      const maxDepth = Math.max(
        ...record.features
          .filter((f) => f.type.includes("pocket"))
          .map((f) => f.dimensions.depth_mm ?? 0),
        0
      );
      if (operator === ">") return maxDepth > (value as number);
      if (operator === ">=") return maxDepth >= (value as number);
      return false;
    }
    if (field.startsWith("feature.hole.depth_mm")) {
      const maxDepth = Math.max(
        ...record.features
          .filter((f) => f.type.includes("hole"))
          .map((f) => f.dimensions.depth_mm ?? 0),
        0
      );
      if (operator === ">") return maxDepth > (value as number);
      return false;
    }
    if (field.startsWith("operations.has") && operator === "contains" && typeof value === "string") {
      // Parse value string: "face+pocket" → check both operation types exist
      const requiredTypes = value.split("+").map((s) => s.trim().toLowerCase());
      const opTypes = new Set<string>();
      for (const op of record.operations) {
        opTypes.add(op.operationType);
        for (const ft of op.targetFeatures) opTypes.add(ft);
        opTypes.add(op.cycleCode.toLowerCase());
      }
      return requiredTypes.every((t) => opTypes.has(t));
    }
    if (field.startsWith("operations.finishing.tool")) {
      return record.operations.some(
        (o) => o.operationType === "finishing" && o.tool.type === value
      );
    }

    return false;
  }
}

/** Singleton export */
export const cadSequenceLearningEngine = new CADSequenceLearningEngine();
