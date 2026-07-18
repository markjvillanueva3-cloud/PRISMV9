/**
 * CADFeatureClassifierEngine — U-CADC30
 *
 * Pure-code classifier that maps RecognizedFeature objects (from
 * FeatureRecognitionEngine) into ML-friendly learning categories used by
 * CADTrialErrorLearningEngine, CADGenerationConfidenceEngine, and the
 * progressive-complexity scheduler.
 *
 * Three orthogonal axes per feature:
 *   1. Geometric family   → prismatic | rotational | freeform | sheet | mixed
 *   2. Size class         → small | medium | large    (longest dim threshold)
 *   3. Complexity tier    → simple | intermediate | complex
 *
 * Plus a generation-strategy hint (parametric|lofted|boolean|scripted) and a
 * per-channel risk profile keyed to the trial-error learner's failure
 * categories so a downstream client can pre-bias risk before generation.
 *
 * Heuristics are deterministic and cite the feature taxonomy in
 * FeatureRecognitionEngine.FeatureType. No I/O, no external app launches.
 */

import { z } from "zod";
import type { RecognizedFeature, FeatureType } from "./FeatureRecognitionEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type GeometricFamily =
  | "prismatic"
  | "rotational"
  | "freeform"
  | "sheet"
  | "mixed";

export type SizeClass = "small" | "medium" | "large";

export type ComplexityTier = "simple" | "intermediate" | "complex";

export type StrategyHint = "parametric" | "lofted" | "boolean" | "scripted";

export interface RiskProfile {
  volume: number; // 0..1, prior risk of volume_mismatch on generation
  bbox: number;
  featureCount: number;
  topology: number;
}

export interface LearningClassification {
  featureId: string;
  featureType: FeatureType;
  geometricFamily: GeometricFamily;
  sizeClass: SizeClass;
  complexityTier: ComplexityTier;
  strategyHint: StrategyHint;
  riskProfile: RiskProfile;
  confidence: number; // 0..1, blended from feature confidence + rule strength
  rationale: string[];
}

export interface BatchSummary {
  total: number;
  byFamily: Record<GeometricFamily, number>;
  bySize: Record<SizeClass, number>;
  byTier: Record<ComplexityTier, number>;
  byStrategy: Record<StrategyHint, number>;
  meanConfidence: number;
  worstRisk: { channel: keyof RiskProfile; value: number };
}

export interface ClassifierThresholds {
  /** longest dimension (mm) ≤ smallMax → "small" */
  smallMax: number;
  /** longest dimension (mm) ≤ mediumMax → "medium", else "large" */
  mediumMax: number;
  /** complexity score boundaries (0..10 scale) */
  intermediateMin: number;
  complexMin: number;
}

const DEFAULT_THRESHOLDS: ClassifierThresholds = {
  smallMax: 25,
  mediumMax: 100,
  intermediateMin: 3,
  complexMin: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature taxonomy — family + base risk + base complexity
// ─────────────────────────────────────────────────────────────────────────────

interface FeatureProfile {
  family: GeometricFamily;
  /** base complexity score 0..10 — prismatic 1..3, rotational 1..4, freeform 5..9 */
  baseComplexity: number;
  baseRisk: RiskProfile;
}

const FEATURE_PROFILES: Record<FeatureType, FeatureProfile> = {
  through_hole: {
    family: "rotational",
    baseComplexity: 1,
    baseRisk: { volume: 0.05, bbox: 0.05, featureCount: 0.10, topology: 0.05 },
  },
  blind_hole: {
    family: "rotational",
    baseComplexity: 2,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.10, topology: 0.05 },
  },
  counterbore: {
    family: "rotational",
    baseComplexity: 3,
    baseRisk: { volume: 0.15, bbox: 0.05, featureCount: 0.15, topology: 0.10 },
  },
  countersink: {
    family: "rotational",
    baseComplexity: 2,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.10, topology: 0.10 },
  },
  tapped_hole: {
    family: "rotational",
    baseComplexity: 4,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.20, topology: 0.20 },
  },
  pocket_rectangular: {
    family: "prismatic",
    baseComplexity: 2,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.10, topology: 0.10 },
  },
  pocket_circular: {
    family: "rotational",
    baseComplexity: 2,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.10, topology: 0.10 },
  },
  pocket_freeform: {
    family: "freeform",
    baseComplexity: 6,
    baseRisk: { volume: 0.30, bbox: 0.20, featureCount: 0.25, topology: 0.35 },
  },
  slot_through: {
    family: "prismatic",
    baseComplexity: 2,
    baseRisk: { volume: 0.10, bbox: 0.10, featureCount: 0.10, topology: 0.10 },
  },
  slot_blind: {
    family: "prismatic",
    baseComplexity: 3,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.10, topology: 0.15 },
  },
  keyway: {
    family: "prismatic",
    baseComplexity: 3,
    baseRisk: { volume: 0.10, bbox: 0.10, featureCount: 0.10, topology: 0.20 },
  },
  boss_circular: {
    family: "rotational",
    baseComplexity: 2,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.10, topology: 0.10 },
  },
  boss_rectangular: {
    family: "prismatic",
    baseComplexity: 2,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.10, topology: 0.10 },
  },
  fillet: {
    family: "freeform",
    baseComplexity: 4,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.15, topology: 0.30 },
  },
  chamfer: {
    family: "prismatic",
    baseComplexity: 2,
    baseRisk: { volume: 0.05, bbox: 0.05, featureCount: 0.10, topology: 0.15 },
  },
  face: {
    family: "prismatic",
    baseComplexity: 1,
    baseRisk: { volume: 0.05, bbox: 0.10, featureCount: 0.05, topology: 0.05 },
  },
  step: {
    family: "prismatic",
    baseComplexity: 2,
    baseRisk: { volume: 0.10, bbox: 0.10, featureCount: 0.05, topology: 0.10 },
  },
  groove: {
    family: "rotational",
    baseComplexity: 3,
    baseRisk: { volume: 0.15, bbox: 0.05, featureCount: 0.10, topology: 0.20 },
  },
  thread_external: {
    family: "rotational",
    baseComplexity: 5,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.20, topology: 0.30 },
  },
  thread_internal: {
    family: "rotational",
    baseComplexity: 5,
    baseRisk: { volume: 0.10, bbox: 0.05, featureCount: 0.20, topology: 0.30 },
  },
  pocket_complex: {
    family: "prismatic",
    baseComplexity: 4,
    baseRisk: { volume: 0.20, bbox: 0.15, featureCount: 0.20, topology: 0.25 },
  },
  slot_dovetail: {
    family: "prismatic",
    baseComplexity: 4,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.15, topology: 0.25 },
  },
  slot_t_shaped: {
    family: "prismatic",
    baseComplexity: 4,
    baseRisk: { volume: 0.15, bbox: 0.10, featureCount: 0.15, topology: 0.25 },
  },
  contour_2d: {
    family: "freeform",
    baseComplexity: 5,
    baseRisk: { volume: 0.20, bbox: 0.15, featureCount: 0.15, topology: 0.25 },
  },
  contour_3d: {
    family: "freeform",
    baseComplexity: 8,
    baseRisk: { volume: 0.35, bbox: 0.25, featureCount: 0.25, topology: 0.45 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Zod input schemas (lightweight validation — full structural validation is
// the caller's responsibility through FeatureRecognitionEngine outputs).
// ─────────────────────────────────────────────────────────────────────────────

const featureSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    confidence: z.number().min(0).max(1),
    dimensions: z.unknown().optional(),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    orientation: z
      .object({ axis: z.enum(["x", "y", "z", "custom"]), angle_deg: z.number().optional() })
      .optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export class CADFeatureClassifierEngine {
  private thresholds: ClassifierThresholds;

  constructor(thresholds: Partial<ClassifierThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Classify a single recognised feature into learning-category axes.
   * @returns LearningClassification with confidence and rationale.
   * @throws never — invalid input is reported via low-confidence + rationale.
   */
  classify(feature: RecognizedFeature): LearningClassification {
    const parsed = featureSchema.safeParse(feature);
    if (!parsed.success) {
      return this.makeFallback(
        typeof (feature as { id?: unknown })?.id === "string" ? (feature as { id: string }).id : "<invalid>",
        "contour_2d",
        ["Invalid feature shape: " + parsed.error.issues.map((i) => i.message).join("; ")]
      );
    }

    const profile = FEATURE_PROFILES[feature.type];
    if (!profile) {
      return this.makeFallback(feature.id, feature.type, [
        "Unknown feature type '" + feature.type + "' — defaulting to mixed/freeform",
      ]);
    }

    const longest = this.longestDimensionMm(feature);
    const sizeClass = this.classifySize(longest);
    const sizeAdjust = sizeClass === "large" ? 1.5 : sizeClass === "medium" ? 1.15 : 1.0;
    const complexityScore = profile.baseComplexity * sizeAdjust;
    const complexityTier = this.classifyComplexity(complexityScore);
    const strategyHint = this.suggestStrategy(profile.family, complexityTier);
    const riskProfile = this.adjustRisk(profile.baseRisk, sizeClass, complexityTier);

    const confidence = this.blendConfidence(feature.confidence, profile, sizeClass);

    const rationale: string[] = [];
    rationale.push(
      "Feature '" + feature.type + "' belongs to family '" + profile.family + "' (base complexity " +
        profile.baseComplexity.toFixed(1) + ")"
    );
    rationale.push(
      "Longest dimension " + longest.toFixed(1) + "mm → size class '" + sizeClass + "' (×" +
        sizeAdjust.toFixed(2) + " complexity adjust)"
    );
    rationale.push("Complexity score " + complexityScore.toFixed(2) + " → tier '" + complexityTier + "'");
    rationale.push("Strategy hint: '" + strategyHint + "'");

    return {
      featureId: feature.id,
      featureType: feature.type,
      geometricFamily: profile.family,
      sizeClass,
      complexityTier,
      strategyHint,
      riskProfile,
      confidence,
      rationale,
    };
  }

  /**
   * Classify a list of features, with summary counts and worst-channel risk.
   */
  classifyBatch(features: RecognizedFeature[]): {
    results: LearningClassification[];
    summary: BatchSummary;
  } {
    const results = features.map((f) => this.classify(f));
    return { results, summary: this.summarize(results) };
  }

  /**
   * Group classifications by geometric family for cohort-based learning.
   */
  groupByFamily(classifications: LearningClassification[]): Record<GeometricFamily, LearningClassification[]> {
    const groups: Record<GeometricFamily, LearningClassification[]> = {
      prismatic: [],
      rotational: [],
      freeform: [],
      sheet: [],
      mixed: [],
    };
    for (const c of classifications) groups[c.geometricFamily].push(c);
    return groups;
  }

  /**
   * Suggest the dominant family across a set of features. Uses simple plurality
   * with mixed-family fallback when no family has >50% share.
   */
  suggestDominantFamily(classifications: LearningClassification[]): {
    family: GeometricFamily;
    share: number;
  } {
    if (classifications.length === 0) return { family: "mixed", share: 0 };
    const counts = this.groupByFamily(classifications);
    let best: GeometricFamily = "mixed";
    let bestN = 0;
    for (const fam of Object.keys(counts) as GeometricFamily[]) {
      if (counts[fam].length > bestN) {
        best = fam;
        bestN = counts[fam].length;
      }
    }
    const share = bestN / classifications.length;
    if (share < 0.5) return { family: "mixed", share };
    return { family: best, share };
  }

  /**
   * Override classifier thresholds (size + complexity bins).
   */
  setThresholds(t: Partial<ClassifierThresholds>): ClassifierThresholds {
    this.thresholds = { ...this.thresholds, ...t };
    return { ...this.thresholds };
  }

  getThresholds(): ClassifierThresholds {
    return { ...this.thresholds };
  }

  // ─── Internals ─────────────────────────────────────────────────────────

  private longestDimensionMm(feature: RecognizedFeature): number {
    const d = feature.dimensions || {};
    const candidates = [
      d.diameter_mm,
      d.depth_mm,
      d.width_mm,
      d.length_mm,
      d.radius_mm,
      d.counterbore_diameter_mm,
      d.counterbore_depth_mm,
    ].filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    return candidates.length === 0 ? 0 : Math.max(...candidates);
  }

  private classifySize(longestMm: number): SizeClass {
    if (longestMm <= this.thresholds.smallMax) return "small";
    if (longestMm <= this.thresholds.mediumMax) return "medium";
    return "large";
  }

  private classifyComplexity(score: number): ComplexityTier {
    if (score >= this.thresholds.complexMin) return "complex";
    if (score >= this.thresholds.intermediateMin) return "intermediate";
    return "simple";
  }

  private suggestStrategy(family: GeometricFamily, tier: ComplexityTier): StrategyHint {
    if (family === "freeform") return tier === "simple" ? "lofted" : "scripted";
    if (family === "rotational") return tier === "complex" ? "scripted" : "parametric";
    if (family === "prismatic") return tier === "simple" ? "parametric" : "boolean";
    if (family === "sheet") return "parametric";
    return tier === "complex" ? "scripted" : "parametric";
  }

  private adjustRisk(base: RiskProfile, size: SizeClass, tier: ComplexityTier): RiskProfile {
    const sizeMul = size === "large" ? 1.4 : size === "medium" ? 1.1 : 1.0;
    const tierMul = tier === "complex" ? 1.5 : tier === "intermediate" ? 1.2 : 1.0;
    const mul = sizeMul * tierMul;
    return {
      volume: Math.min(1, base.volume * mul),
      bbox: Math.min(1, base.bbox * mul),
      featureCount: Math.min(1, base.featureCount * mul),
      topology: Math.min(1, base.topology * mul),
    };
  }

  private blendConfidence(
    featureConfidence: number,
    profile: FeatureProfile,
    sizeClass: SizeClass
  ): number {
    // Rule strength: known-family confident classifications start at 0.85;
    // unknown families fall back to 0.4. Size-class extreme reduces confidence.
    const ruleStrength = profile.family === "freeform" ? 0.75 : 0.85;
    const sizePenalty = sizeClass === "large" ? 0.95 : 1.0;
    return Math.max(0, Math.min(1, featureConfidence * ruleStrength * sizePenalty));
  }

  private summarize(results: LearningClassification[]): BatchSummary {
    const byFamily: Record<GeometricFamily, number> = {
      prismatic: 0, rotational: 0, freeform: 0, sheet: 0, mixed: 0,
    };
    const bySize: Record<SizeClass, number> = { small: 0, medium: 0, large: 0 };
    const byTier: Record<ComplexityTier, number> = { simple: 0, intermediate: 0, complex: 0 };
    const byStrategy: Record<StrategyHint, number> = {
      parametric: 0, lofted: 0, boolean: 0, scripted: 0,
    };

    let confSum = 0;
    let worstChannel: keyof RiskProfile = "volume";
    let worstValue = 0;

    for (const r of results) {
      byFamily[r.geometricFamily]++;
      bySize[r.sizeClass]++;
      byTier[r.complexityTier]++;
      byStrategy[r.strategyHint]++;
      confSum += r.confidence;
      for (const k of ["volume", "bbox", "featureCount", "topology"] as const) {
        if (r.riskProfile[k] > worstValue) {
          worstValue = r.riskProfile[k];
          worstChannel = k;
        }
      }
    }

    return {
      total: results.length,
      byFamily,
      bySize,
      byTier,
      byStrategy,
      meanConfidence: results.length === 0 ? 0 : confSum / results.length,
      worstRisk: { channel: worstChannel, value: worstValue },
    };
  }

  private makeFallback(
    featureId: string,
    featureType: string,
    rationale: string[]
  ): LearningClassification {
    return {
      featureId,
      featureType: featureType as FeatureType,
      geometricFamily: "mixed",
      sizeClass: "medium",
      complexityTier: "intermediate",
      strategyHint: "scripted",
      riskProfile: { volume: 0.5, bbox: 0.5, featureCount: 0.5, topology: 0.5 },
      confidence: 0.2,
      rationale,
    };
  }
}

export const cadFeatureClassifierEngine = new CADFeatureClassifierEngine();
