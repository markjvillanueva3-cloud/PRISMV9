/**
 * WEDMCurriculumSchedulerEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-D2
 * ============================================================================
 *
 * Curriculum-learning scheduler for the WEDM LoRA training corpus. Orders
 * training examples from EASIEST to MOST COMPLEX so the trainer sees
 * fundamentals before edge cases — the empirically-validated regime that
 * lifts LoRA convergence vs random-order serving (Bengio et al. 2009
 * "Curriculum Learning" — applied to instruction-tuning corpora by
 * subsequent NLP work).
 *
 * Consumes the same Alpaca-format training examples emitted by
 * WEDMLoRADatasetBuilderEngine (U-WCTP-A2-DSB) and
 * WEDMAcademyBridgeEngine.emitTrainingExamples (U-WCTP-ACADEMY-BRIDGE).
 *
 * Complexity axes (weighted sum, 0..1 per axis):
 *   - axes_count       (2-axis straight cut = 0.0 ; 4-axis UV taper = 1.0)
 *   - pass_count       (1-pass rough = 0.0 ; 5-pass cycle = 1.0)
 *   - material_class   (carbon steel = 0.1 ; carbide / PCD / superalloy = 1.0)
 *   - tolerance_tier   (±0.01 mm = 0.0 ; ±0.001 mm = 1.0)
 *   - tag_domain       (fundamentals = 0.0 ; controller_dialect = 0.5 ;
 *                       workpiece_machinability = 0.7 ; shop_ground_truth = 1.0)
 *   - inverse_confidence (high confidence = low complexity)
 *
 * @module engines/WEDMCurriculumSchedulerEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** Per-example complexity scoring axes (each 0..1). */
export interface WedmComplexityAxes {
  axes_count: number;
  pass_count: number;
  material_class: number;
  tolerance_tier: number;
  tag_domain: number;
  inverse_confidence: number;
}

/** Weight assigned to each axis in the final complexity score. */
export interface WedmComplexityWeights {
  axes_count: number;
  pass_count: number;
  material_class: number;
  tolerance_tier: number;
  tag_domain: number;
  inverse_confidence: number;
}

/** Difficulty tier label assigned per example. */
export type WedmCurriculumTier = "easy" | "medium" | "hard";

/** A scored training example with sortable complexity. */
export interface WedmCurriculumExample {
  /** The original training example payload — passes through untouched. */
  instruction: string;
  input: string;
  output: string;
  metadata: Record<string, unknown>;
  /** 0..1 score; higher = more complex. */
  complexity: number;
  /** Bucket: easy < 0.33 <= medium < 0.66 <= hard. */
  tier: WedmCurriculumTier;
  /** Per-axis breakdown for telemetry / inspection. */
  axes: WedmComplexityAxes;
}

/** A loose shape matching both A2-DSB and academy-bridge emissions. */
export interface WedmIncomingExample {
  instruction: string;
  input?: string;
  output: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTS — Scoring lookup tables
// ============================================================================

const DEFAULT_WEIGHTS: WedmComplexityWeights = {
  axes_count: 0.2,
  pass_count: 0.15,
  material_class: 0.2,
  tolerance_tier: 0.15,
  tag_domain: 0.2,
  inverse_confidence: 0.1,
};

/** Material complexity by name (lowercase substring match — first wins). */
const MATERIAL_COMPLEXITY: ReadonlyArray<readonly [string, number]> = [
  ["pcd", 1.0],
  ["polycrystalline diamond", 1.0],
  ["tungsten carbide", 0.95],
  ["wc-co", 0.95],
  ["carbide", 0.9],
  ["inconel", 0.85],
  ["nickel superalloy", 0.85],
  ["nimonic", 0.85],
  ["titanium", 0.8],
  ["ti-6al-4v", 0.8],
  ["ni-ti", 0.8],
  ["shape memory", 0.8],
  ["beryllium copper", 0.7],
  ["cube", 0.7],
  ["c17200", 0.7],
  ["17-4 ph", 0.6],
  ["stainless", 0.55],
  ["304", 0.5],
  ["316", 0.5],
  ["tool steel", 0.45],
  ["d2", 0.45],
  ["a2", 0.45],
  ["s7", 0.45],
  ["m2", 0.45],
  ["h13", 0.45],
  ["o1", 0.4],
  ["w1", 0.4],
  ["4140", 0.3],
  ["4340", 0.35],
  ["alloy steel", 0.3],
  ["carbon steel", 0.15],
  ["1045", 0.15],
  ["brass", 0.1],
  ["aluminum", 0.1],
  ["copper", 0.1],
];

/** Tag/category → tag_domain complexity contribution. */
const CATEGORY_COMPLEXITY: Record<string, number> = {
  shop_ground_truth: 1.0,
  workpiece_machinability: 0.7,
  dielectric_chemistry: 0.6,
  controller_dialect: 0.55,
  process_parameters: 0.45,
  ai_ml: 0.5,
  materials: 0.35,
  operations_diagnostics: 0.4,
  programming: 0.5,
  setup: 0.3,
  fundamentals: 0.05,
  wedm_pedagogy: 0.05,
};

const EASY_THRESHOLD = 0.33;
const HARD_THRESHOLD = 0.66;

// ============================================================================
// SCORERS — Each axis is a pure function 0..1
// ============================================================================

/** Score axes_count — count UV / 4-axis / taper signals in text + metadata. */
export function scoreAxesCount(text: string, meta: Record<string, unknown> = {}): number {
  const lower = text.toLowerCase();
  const metaAxes = typeof meta.axes === "number" ? meta.axes : null;
  if (metaAxes === 4) return 1.0;
  if (metaAxes === 2) return 0.0;
  // Text signals — taper / UV / 4-axis push toward 1
  if (/\b(4[-\s]?axis|uv\b|u-v|taper|conic)\b/i.test(lower)) return 1.0;
  if (/\b(2[-\s]?axis|straight cut)\b/i.test(lower)) return 0.0;
  return 0.3; // unspecified default — slightly above easy
}

/** Score pass_count — surface highest mentioned pass number. */
export function scorePassCount(text: string, meta: Record<string, unknown> = {}): number {
  const lower = text.toLowerCase();
  // Metadata override
  const metaPasses = typeof meta.passes === "number" ? meta.passes : null;
  if (metaPasses != null) return clamp((metaPasses - 1) / 4, 0, 1);
  // Look for "<N>-pass" or "<N> skim passes" or rough+N
  const passMatch = lower.match(/(\d+)[-\s]?pass/);
  if (passMatch) return clamp((parseInt(passMatch[1], 10) - 1) / 4, 0, 1);
  const skimMatch = lower.match(/(\d+)\s+skim/);
  if (skimMatch) return clamp(parseInt(skimMatch[1], 10) / 4, 0, 1);
  if (/\bsingle[-\s]?pass\b/i.test(lower)) return 0;
  return 0.2;
}

/** Score material_class — first lookup-table match wins. */
export function scoreMaterialClass(text: string): number {
  const lower = text.toLowerCase();
  for (const [needle, score] of MATERIAL_COMPLEXITY) {
    if (lower.includes(needle)) return score;
  }
  return 0.25; // unspecified material — slightly above easy
}

/** Score tolerance_tier — tighter tolerance / Ra → higher complexity. */
export function scoreToleranceTier(text: string): number {
  const tolMatch = text.match(/[±+]?\s*0?\.0+\d+\s*(?:mm|inch|in|um|µm)/i);
  if (tolMatch) {
    const raw = tolMatch[0].toLowerCase().replace(/[+±\s]/g, "");
    const num = parseFloat(raw);
    if (Number.isFinite(num)) {
      // Map 0.001-0.01 mm to 1.0 → 0.0
      if (raw.endsWith("mm")) return clamp(1 - (num - 0.001) / 0.009, 0, 1);
      if (raw.endsWith("in") || raw.endsWith("inch")) {
        const mm = num * 25.4;
        return clamp(1 - (mm - 0.001) / 0.009, 0, 1);
      }
      if (raw.endsWith("um") || raw.endsWith("µm")) {
        // 1-10 µm Ra → 1.0 → 0.0
        return clamp(1 - (num - 1) / 9, 0, 1);
      }
    }
  }
  // Coarse text signals
  if (/\bclass[-\s]?2\b|\bgrind(ing)?\b|\bsub[-\s]?micron\b/i.test(text)) return 0.9;
  if (/\bfinishing\b|\bskim\b/i.test(text)) return 0.55;
  if (/\broughing?\b/i.test(text)) return 0.15;
  return 0.3;
}

/** Score tag_domain — pick the MAX over matched category tags. */
export function scoreTagDomain(meta: Record<string, unknown> = {}): number {
  const tags = Array.isArray(meta.tags) ? (meta.tags as string[]).map((t) => t.toLowerCase()) : [];
  const category = typeof meta.category === "string" ? meta.category.toLowerCase() : "";
  let max = 0;
  if (category && category in CATEGORY_COMPLEXITY) max = Math.max(max, CATEGORY_COMPLEXITY[category]);
  for (const t of tags) {
    if (t in CATEGORY_COMPLEXITY) max = Math.max(max, CATEGORY_COMPLEXITY[t]);
  }
  return max === 0 ? 0.3 : max;
}

/** Score inverse_confidence — high confidence = low complexity (well-trodden). */
export function scoreInverseConfidence(meta: Record<string, unknown> = {}): number {
  const conf = typeof meta.confidence === "number" ? meta.confidence : null;
  if (conf == null) return 0.5;
  // confidence 100 → 0.0 ; confidence 50 → 1.0 (rare/uncertain claims are harder)
  return clamp(1 - (conf - 50) / 50, 0, 1);
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMCurriculumSchedulerEngine {
  private weights: WedmComplexityWeights = { ...DEFAULT_WEIGHTS };

  /** Adjust per-axis weights (merged into current). */
  setWeights(weights: Partial<WedmComplexityWeights>): WedmComplexityWeights {
    this.weights = { ...this.weights, ...weights };
    return { ...this.weights };
  }

  /** Defensive copy of current weights. */
  getWeights(): WedmComplexityWeights {
    return { ...this.weights };
  }

  /** Score a single example without re-ordering anything. */
  scoreExample(example: WedmIncomingExample): WedmCurriculumExample {
    const meta = example.metadata ?? {};
    const text = `${example.instruction ?? ""}\n${example.input ?? ""}\n${example.output ?? ""}`;
    const axes: WedmComplexityAxes = {
      axes_count: scoreAxesCount(text, meta),
      pass_count: scorePassCount(text, meta),
      material_class: scoreMaterialClass(text),
      tolerance_tier: scoreToleranceTier(text),
      tag_domain: scoreTagDomain(meta),
      inverse_confidence: scoreInverseConfidence(meta),
    };
    const complexity = clamp(
      axes.axes_count * this.weights.axes_count +
      axes.pass_count * this.weights.pass_count +
      axes.material_class * this.weights.material_class +
      axes.tolerance_tier * this.weights.tolerance_tier +
      axes.tag_domain * this.weights.tag_domain +
      axes.inverse_confidence * this.weights.inverse_confidence,
      0,
      1,
    );
    const tier: WedmCurriculumTier =
      complexity < EASY_THRESHOLD ? "easy" :
      complexity < HARD_THRESHOLD ? "medium" : "hard";
    return {
      instruction: example.instruction,
      input: example.input ?? "",
      output: example.output,
      metadata: meta,
      complexity,
      tier,
      axes,
    };
  }

  /**
   * Score + sort an entire corpus easy → hard. STABLE sort: ties preserve
   * input order so deterministic re-runs produce identical training files.
   */
  emitCurriculum(examples: ReadonlyArray<WedmIncomingExample>): WedmCurriculumExample[] {
    const scored = examples.map((e, idx) => ({ ...this.scoreExample(e), __idx: idx }));
    scored.sort((a, b) => {
      if (a.complexity !== b.complexity) return a.complexity - b.complexity;
      return a.__idx - b.__idx; // stability tiebreak
    });
    // Drop the internal index field from the public payload
    return scored.map((s) => {
      const { __idx: _, ...rest } = s;
      return rest;
    });
  }

  /** Partition a corpus into the 3 tiers without re-sorting within tier. */
  partitionByTier(examples: ReadonlyArray<WedmIncomingExample>): {
    easy: WedmCurriculumExample[];
    medium: WedmCurriculumExample[];
    hard: WedmCurriculumExample[];
  } {
    const ordered = this.emitCurriculum(examples);
    return {
      easy: ordered.filter((e) => e.tier === "easy"),
      medium: ordered.filter((e) => e.tier === "medium"),
      hard: ordered.filter((e) => e.tier === "hard"),
    };
  }

  /** Distribution summary for telemetry — counts + mean complexity per tier. */
  stats(examples: ReadonlyArray<WedmIncomingExample>): {
    total: number;
    counts: Record<WedmCurriculumTier, number>;
    mean: Record<WedmCurriculumTier, number>;
    overallMean: number;
  } {
    const scored = examples.map((e) => this.scoreExample(e));
    const counts: Record<WedmCurriculumTier, number> = { easy: 0, medium: 0, hard: 0 };
    const sums: Record<WedmCurriculumTier, number> = { easy: 0, medium: 0, hard: 0 };
    let total = 0;
    let overallSum = 0;
    for (const s of scored) {
      counts[s.tier]++;
      sums[s.tier] += s.complexity;
      total++;
      overallSum += s.complexity;
    }
    return {
      total,
      counts,
      mean: {
        easy: counts.easy > 0 ? sums.easy / counts.easy : 0,
        medium: counts.medium > 0 ? sums.medium / counts.medium : 0,
        hard: counts.hard > 0 ? sums.hard / counts.hard : 0,
      },
      overallMean: total > 0 ? overallSum / total : 0,
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export const wedmCurriculumSchedulerEngine = new WEDMCurriculumSchedulerEngine();
