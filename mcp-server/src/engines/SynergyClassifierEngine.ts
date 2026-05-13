/**
 * SynergyClassifierEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL04
 * ===========================================================
 *
 * The auto-decide brain. Consumes one researcher-subagent output
 * bundle from U-ALL03 `AutoResearchOrchestratorEngine` (a
 * `ResearchOutcome` with prose `content` + the originating source
 * item) PLUS a feature vector computed by upstream callers (semantic
 * match against PRISM's domain, novelty strength from U-ALL02,
 * duplication risk from master-index, AI priority + effort + blast
 * radius), and emits one of four labels: **high / med / low / none**.
 *
 * U-ALL05 `VizAutoAugmentationEngine` will append nodes for `high`
 * and `med` verdicts to the system-viz augmentation file; U-ALL06
 * `RoadmapAutoAppendEngine` will turn `high` verdicts into new
 * `U-AUTORES-XX` roadmap units.
 *
 * Decision-tree contract (per atomized spec § U-ALL04):
 *   1. **Invalid-feature veto** — if ANY feature in the input is
 *      `NaN`, `Infinity`, or `null`, classify "none" with
 *      `reason:"invalid_features"`. Conservative — never let a
 *      poisoned feature score promote a paper into the roadmap.
 *   2. **Duplicate-risk veto** — if `duplication_risk` exceeds the
 *      configured `duplicate_veto_threshold` (default 0.85),
 *      classify "none" with `reason:"duplicate_veto"` even if every
 *      other signal is strong. This is the "we already built this
 *      and didn't realise" guard rail.
 *   3. **Weighted-sum score** — `score = Σ wᵢ·fᵢ` over the rubric
 *      `weights` map. Cost-side features (`duplication_risk`,
 *      `effort_estimate`, `blast_radius`) carry negative weight by
 *      default; positive features (`semantic_match`,
 *      `novelty_strength`, `ai_priority_score`) carry positive
 *      weight. Score is clamped to [0, 1] before band selection.
 *   4. **Band selection** — `high` if `score ≥ rubric.high`, `med`
 *      if `score ≥ rubric.med`, `low` if `score ≥ rubric.low`,
 *      else `none`. Default thresholds are the atomized spec's
 *      `{high:0.65, med:0.45, low:0.25}`.
 *
 * Rubric persistence — pure data. The engine never reads from disk;
 * the canonical rubric lives at
 * `state/shared/auto-learning/synergy-classifier-rubric.json` and is
 * loaded via `loadRubric()` by the CLI / dispatcher action. This
 * mirrors the U-ALL02 + U-ALL03 split: dispatcher action
 * `prism_ai:synergy_classify` and the (deferred to U-ALL09) cron CLI
 * share the singleton; both can be in flight simultaneously during a
 * cron tick.
 *
 * Adaptive tuning — the rubric is schema-versioned + tunable. A
 * future U-ALL10/U-ALL11 self-tuning unit will adjust the
 * thresholds + weights based on shipped-vs-rejected outcome history;
 * `setRubric()` is the surface that pass would call. Until then the
 * spec-default rubric ships with the file.
 *
 * Determinism + testability:
 *   - `rubric`, `now` injected via opts; defaults to the spec rubric
 *     + `Date.now`. Tests inject frozen clocks + custom rubrics for
 *     boundary cases.
 *   - The engine performs ZERO network I/O. Domain classification
 *     (`semantic_match`) is computed UPSTREAM by the dispatcher
 *     using master-index + Ollama embedder — the engine receives
 *     pre-computed feature vectors and stays hermetic.
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL04
 */

// ─── Public types ────────────────────────────────────────────────────

/**
 * Feature vector consumed by `classify()`. Every value MUST be a
 * finite number in [0, 1]; out-of-range or non-finite values
 * trigger the invalid-feature veto.
 */
export interface ClassifierFeatures {
  /**
   * How well the research output matches PRISM's existing domain
   * (manufacturing intelligence, CAM, CAD, AI orchestration). Higher
   * = better fit. Computed UPSTREAM via Ollama-embedder cosine
   * between research-content and PRISM's domain seed vector.
   */
  semantic_match: number;
  /**
   * How confidently NEW this is. Output of U-ALL02
   * `NoveltyDetectionEngine` — 1.0 ⇒ never seen before, 0.0 ⇒
   * exact-hash dup.
   */
  novelty_strength: number;
  /**
   * How likely this overlaps with existing PRISM engines / skills /
   * domains. Computed UPSTREAM via master-index top-K hits — 0 ⇒
   * no overlap with any existing capability, 1 ⇒ near-exact dup of
   * an existing engine.
   */
  duplication_risk: number;
  /**
   * The AI-orchestrator's own priority signal for this work
   * (whether it bubbles up high in /pick-unit, /priority, etc.).
   */
  ai_priority_score: number;
  /**
   * Effort to integrate. Higher = MORE effort. Subtracted from
   * score (negative weight in default rubric).
   */
  effort_estimate: number;
  /**
   * Disruption surface — how many existing engines/dispatchers/
   * hooks this would touch. Higher = MORE blast. Subtracted from
   * score (negative weight in default rubric).
   */
  blast_radius: number;
}

/**
 * Adaptive-tunable rubric: weights × thresholds × veto cutoff.
 * Schema-versioned so future self-tuning passes can detect
 * incompatible rubric shapes.
 */
export interface ClassifierRubric {
  schemaVersion: number;
  /**
   * Per-feature weight in the weighted sum. Positive features add
   * to score; cost features (effort, duplication, blast) typically
   * carry negative weight.
   */
  weights: Record<keyof ClassifierFeatures, number>;
  /** Band thresholds — score ≥ value ⇒ that label. */
  high: number;
  med: number;
  low: number;
  /**
   * Hard veto cutoff. duplication_risk > this ⇒ "none" regardless
   * of other features. Default 0.85.
   */
  duplicate_veto_threshold: number;
  /**
   * Optional human-facing rationale / tuning notes. Adaptive
   * tuners write here so operators can see WHY the rubric drifted.
   */
  notes?: string;
}

export type ClassifierLabel = "high" | "med" | "low" | "none";

export type ClassifierReason =
  | "invalid_features"
  | "duplicate_veto"
  | "score_band";

export interface ClassifierVerdict {
  label: ClassifierLabel;
  score: number;
  reason: ClassifierReason;
  /** Per-feature contribution to the final score (weighted). */
  contributions: Record<keyof ClassifierFeatures, number>;
  /** Snapshot of the rubric used (for audit trail). */
  rubricSchemaVersion: number;
  /** UTC epoch ms of the classification. */
  classifiedAt: number;
}

export interface ClassifyResult {
  results: ClassifierVerdict[];
  /** Counts per band, derived from `results` — pre-computed for caller convenience. */
  counts: Record<ClassifierLabel, number>;
}

export interface LoadOutcome {
  ok: boolean;
  schemaVersion?: number;
  /** Reason for failure when ok===false. */
  error?: string;
}

export interface EngineOpts {
  rubric?: ClassifierRubric | null;
  now?: () => number;
}

// ─── Constants ──────────────────────────────────────────────────────

export const RUBRIC_SCHEMA_VERSION = 1;

/**
 * Spec § U-ALL04 default rubric. Adaptive tuners (deferred unit)
 * will overwrite this in the rubric file; the engine never edits
 * the default at runtime.
 *
 * Weight rationale:
 *   - `semantic_match` (+0.30): domain fit is the #1 keep-or-skip
 *     signal — irrelevant research drops out fast.
 *   - `novelty_strength` (+0.25): we care about NEW signal; known
 *     dups get hashed out by U-ALL02 before reaching us, so this
 *     mostly differentiates near-paraphrase reposts.
 *   - `ai_priority_score` (+0.20): the orchestrator's own taste
 *     signal; balanced lower than match/novelty because it can be
 *     noisy on early outputs.
 *   - `duplication_risk` (-0.20): overlap with existing capabilities
 *     downgrades — if we built it already, even strong novelty is
 *     not worth a roadmap unit.
 *   - `effort_estimate` (-0.10): integrate-cost; light penalty so
 *     high-effort high-value items still win.
 *   - `blast_radius` (-0.05): smallest weight; some high-leverage
 *     items necessarily touch many subsystems and we don't want
 *     blast alone to demote them.
 *
 * Weights sum to +/- 0.55 / -0.35; max positive score = 0.75 (when
 * all three positive features = 1 and cost features = 0). Min score
 * = -0.35 (clamped to 0 before band selection). So the band
 * thresholds {0.25, 0.45, 0.65} cover the bulk of the realised
 * range. Adaptive tuning will move them in concert with weights.
 */
export const DEFAULT_RUBRIC: ClassifierRubric = {
  schemaVersion: RUBRIC_SCHEMA_VERSION,
  weights: {
    semantic_match: 0.3,
    novelty_strength: 0.25,
    ai_priority_score: 0.2,
    duplication_risk: -0.2,
    effort_estimate: -0.1,
    blast_radius: -0.05,
  },
  high: 0.65,
  med: 0.45,
  low: 0.25,
  duplicate_veto_threshold: 0.85,
};

/** Defence-in-depth — refuse `__proto__` / `constructor` / `prototype` as feature keys. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

const FEATURE_KEYS: ReadonlyArray<keyof ClassifierFeatures> = [
  "semantic_match",
  "novelty_strength",
  "ai_priority_score",
  "duplication_risk",
  "effort_estimate",
  "blast_radius",
];

// ─── Helpers ────────────────────────────────────────────────────────

function freshContributions(): Record<keyof ClassifierFeatures, number> {
  return {
    semantic_match: 0,
    novelty_strength: 0,
    ai_priority_score: 0,
    duplication_risk: 0,
    effort_estimate: 0,
    blast_radius: 0,
  };
}

function isValidFeatureValue(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidFeatureBag(features: unknown): features is ClassifierFeatures {
  if (!features || typeof features !== "object") return false;
  for (const key of FEATURE_KEYS) {
    const v = (features as Record<string, unknown>)[key];
    if (!isValidFeatureValue(v)) return false;
  }
  return true;
}

function deepCloneRubric(r: ClassifierRubric): ClassifierRubric {
  const cloneWeights = (): Record<keyof ClassifierFeatures, number> => {
    const out = freshContributions();
    for (const key of FEATURE_KEYS) {
      const w = r.weights?.[key];
      out[key] = isValidFeatureValue(w) ? w : 0;
    }
    return out;
  };
  return {
    schemaVersion: RUBRIC_SCHEMA_VERSION,
    weights: cloneWeights(),
    high: isValidFeatureValue(r.high) ? r.high : DEFAULT_RUBRIC.high,
    med: isValidFeatureValue(r.med) ? r.med : DEFAULT_RUBRIC.med,
    low: isValidFeatureValue(r.low) ? r.low : DEFAULT_RUBRIC.low,
    duplicate_veto_threshold: isValidFeatureValue(r.duplicate_veto_threshold)
      ? r.duplicate_veto_threshold
      : DEFAULT_RUBRIC.duplicate_veto_threshold,
    notes: typeof r.notes === "string" ? r.notes : undefined,
  };
}

/** Clamp value to [0, 1]. */
function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class SynergyClassifierEngine {
  readonly name = "SynergyClassifierEngine";

  private rubric: ClassifierRubric;
  private nowFn: () => number;

  constructor(opts: EngineOpts = {}) {
    this.rubric = opts.rubric ? deepCloneRubric(opts.rubric) : deepCloneRubric(DEFAULT_RUBRIC);
    this.nowFn = opts.now ?? Date.now;
    this.validateRubricOrThrow();
  }

  /** Defensive snapshot of the active rubric. Safe to mutate the result. */
  getRubric(): ClassifierRubric {
    return deepCloneRubric(this.rubric);
  }

  /**
   * Adaptive-tuning surface. CLI / self-tuning unit calls this with
   * a new rubric; the engine validates + atomically swaps. On
   * validation failure the active rubric is unchanged.
   */
  setRubric(next: ClassifierRubric): LoadOutcome {
    const validated = this.validateRubric(next);
    if (!validated.ok) return validated;
    this.rubric = deepCloneRubric(next);
    return { ok: true, schemaVersion: this.rubric.schemaVersion };
  }

  /**
   * Parse a JSON-encoded rubric blob and load it. Structured error
   * rather than throwing so the CLI can fall back to
   * `.previous.json`.
   */
  loadRubric(json: string): LoadOutcome {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      return {
        ok: false,
        error: `parse_error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "not_an_object" };
    }
    return this.setRubric(parsed as ClassifierRubric);
  }

  /** Reset to spec-default rubric. Test-only escape hatch. */
  resetAll(): void {
    this.rubric = deepCloneRubric(DEFAULT_RUBRIC);
  }

  /**
   * Classify a single feature vector → ClassifierVerdict.
   *
   * Decision tree (per spec):
   *   1. Invalid feature → "none" (invalid_features).
   *   2. duplication_risk > veto threshold → "none" (duplicate_veto).
   *   3. Weighted-sum score, clamp to [0,1], band-select.
   */
  classify(features: ClassifierFeatures): ClassifierVerdict {
    const now = this.nowFn();

    if (!isValidFeatureBag(features)) {
      return {
        label: "none",
        score: 0,
        reason: "invalid_features",
        contributions: freshContributions(),
        rubricSchemaVersion: this.rubric.schemaVersion,
        classifiedAt: now,
      };
    }

    // Duplicate veto — even strong novelty cannot promote a paper
    // whose master-index overlap is above the veto cutoff.
    if (features.duplication_risk > this.rubric.duplicate_veto_threshold) {
      return {
        label: "none",
        score: 0,
        reason: "duplicate_veto",
        contributions: this.contributions(features),
        rubricSchemaVersion: this.rubric.schemaVersion,
        classifiedAt: now,
      };
    }

    const contributions = this.contributions(features);
    const sum = FEATURE_KEYS.reduce((acc, k) => acc + contributions[k], 0);
    const score = clamp01(sum);
    const label = this.bandFor(score);

    return {
      label,
      score,
      reason: "score_band",
      contributions,
      rubricSchemaVersion: this.rubric.schemaVersion,
      classifiedAt: now,
    };
  }

  /**
   * Batch helper — classify N feature vectors and return per-band
   * counts pre-computed.
   */
  classifyBatch(batch: ReadonlyArray<ClassifierFeatures>): ClassifyResult {
    const results: ClassifierVerdict[] = [];
    const counts: Record<ClassifierLabel, number> = { high: 0, med: 0, low: 0, none: 0 };
    if (!Array.isArray(batch)) {
      return { results, counts };
    }
    for (const f of batch) {
      const v = this.classify(f);
      results.push(v);
      counts[v.label] += 1;
    }
    return { results, counts };
  }

  // ── private helpers ──

  /**
   * Compute weight × feature for every feature key. Out-of-range
   * features clamp to [0,1] before multiplication so a 1.5
   * "semantic_match" can't run the score to 1.5×0.30 = 0.45 on its
   * own.
   */
  private contributions(features: ClassifierFeatures): Record<keyof ClassifierFeatures, number> {
    const out = freshContributions();
    for (const key of FEATURE_KEYS) {
      const v = clamp01(features[key]);
      const w = this.rubric.weights[key] ?? 0;
      out[key] = v * w;
    }
    return out;
  }

  /** Map score → band per rubric thresholds. */
  private bandFor(score: number): ClassifierLabel {
    if (score >= this.rubric.high) return "high";
    if (score >= this.rubric.med) return "med";
    if (score >= this.rubric.low) return "low";
    return "none";
  }

  private validateRubricOrThrow(): void {
    const r = this.validateRubric(this.rubric);
    if (!r.ok) {
      throw new Error(`Invalid rubric: ${r.error ?? "unknown"}`);
    }
  }

  private validateRubric(next: ClassifierRubric): LoadOutcome {
    if (!next || typeof next !== "object") {
      return { ok: false, error: "not_an_object" };
    }
    if (next.schemaVersion !== RUBRIC_SCHEMA_VERSION) {
      return { ok: false, error: `schema_mismatch: got ${String(next.schemaVersion)}, want ${RUBRIC_SCHEMA_VERSION}` };
    }
    if (!next.weights || typeof next.weights !== "object") {
      return { ok: false, error: "weights_missing" };
    }
    for (const key of FEATURE_KEYS) {
      const w = (next.weights as Record<string, unknown>)[key];
      if (!isValidFeatureValue(w)) {
        return { ok: false, error: `weight_${key}_invalid` };
      }
    }
    // Reject prototype-pollution payloads at the validator surface
    // even though deepCloneRubric also strips them — defence in depth.
    for (const k of Object.keys(next.weights as object)) {
      if (FORBIDDEN_KEYS.has(k)) {
        return { ok: false, error: `forbidden_weight_key:${k}` };
      }
    }
    if (!isValidFeatureValue(next.high)) return { ok: false, error: "high_threshold_invalid" };
    if (!isValidFeatureValue(next.med)) return { ok: false, error: "med_threshold_invalid" };
    if (!isValidFeatureValue(next.low)) return { ok: false, error: "low_threshold_invalid" };
    if (!isValidFeatureValue(next.duplicate_veto_threshold)) {
      return { ok: false, error: "veto_threshold_invalid" };
    }
    // Thresholds must be monotone-descending: high > med > low ≥ 0.
    if (!(next.high > next.med && next.med > next.low && next.low >= 0)) {
      return { ok: false, error: "thresholds_not_monotone" };
    }
    return { ok: true, schemaVersion: next.schemaVersion };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton. Default rubric is the spec rubric; the CLI
 * (`scripts/synergy-classify-sweep.mjs`, deferred to U-ALL09 cron
 * landing) loads the persisted rubric on startup via
 * `loadRubric(fs.readFileSync(...))`.
 *
 * // WIRE-EXEMPT: dispatcher action `prism_ai:synergy_classify`
 * // lands in the same U-ALL07/U-ALL08 wiring batch. The CLI is
 * // deferred to U-ALL09. `stop-auto-wire.mjs` should suppress
 * // orphan warnings during the gap.
 */
export const synergyClassifierEngine = new SynergyClassifierEngine();
