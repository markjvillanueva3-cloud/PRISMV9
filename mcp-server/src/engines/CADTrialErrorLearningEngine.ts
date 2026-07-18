/**
 * CADTrialErrorLearningEngine — U-CADC29
 *
 * Learns from CAD generation regeneration-test failures (output of
 * CADRegenerationTestEngine). Extracts recurring failure patterns by
 * category (volume mismatch, bbox mismatch, topology, code error) and
 * provides risk scoring + adjustment recommendations for new generation
 * candidates.
 *
 * Learning model:
 *   - Frequentist failure-rate per category (Laplace-smoothed):
 *       p(fail | category) = (failures + 1) / (failures + successes + 2)
 *   - Beta(α=1, β=1) prior, posterior Beta(1+k, 1+n-k) — see Gelman, BDA3 §2.4.
 *   - Recommendation strength scales with sample count via shrinkage:
 *       w = n / (n + κ),  κ=10 default — see Efron & Morris (1973), JASA 68.
 *
 * Persistence: append-only JSONL ledger; in-memory caches rebuilt on load.
 * Pure-code: no external app launches, no network.
 */

import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type FailureCategory =
  | "volume_mismatch"
  | "bbox_mismatch"
  | "feature_count_mismatch"
  | "topology_mismatch"
  | "code_error"
  | "unknown";

export interface RegenerationOutcome {
  testId: string;
  originalPath: string;
  status: "pass" | "fail" | "error";
  partType?: string;
  features?: string[];
  generator?: string; // e.g. "cadquery", "freecad", "inventor"
  metrics?: {
    volume?: { passed: boolean; deviationPct?: number };
    bboxX?: { passed: boolean; deviationPct?: number };
    bboxY?: { passed: boolean; deviationPct?: number };
    bboxZ?: { passed: boolean; deviationPct?: number };
    featureCount?: { passed: boolean; deviationPct?: number };
    topology?: { passed: boolean; deviationPct?: number };
  };
  error?: string;
  durationMs?: number;
  timestamp?: string;
  /**
   * Closed-loop attribution: when this outcome resulted from acting on a
   * previously-issued recommendation, the recommendationId links them so
   * getLoopEfficacy() can compare the prediction to this realized result.
   */
  recommendationId?: string;
}

export interface IngestResult {
  testId: string;
  categories: FailureCategory[];
  recorded: boolean;
  warning?: string;
}

export interface FailurePattern {
  category: FailureCategory;
  failures: number;
  successes: number;
  failureRate: number; // posterior mean
  confidence: number; // shrinkage weight ∈ (0,1)
  exampleErrors: string[]; // up to 5 most recent
  byPartType: Record<string, { failures: number; successes: number; rate: number }>;
  byGenerator: Record<string, { failures: number; successes: number; rate: number }>;
}

export interface RecommendationCandidate {
  partType?: string;
  features?: string[];
  generator?: string;
}

export interface AdjustmentSuggestion {
  category: FailureCategory;
  action: string; // human-readable adjustment
  rationale: string;
  expectedRiskReduction: number; // 0..1
}

/**
 * A shop-floor tribal lesson injected into a recommendation. The learning engine
 * learns from its OWN failure ledger; tribal injection adds the operator-curated CAD
 * lessons (e.g. "topology before tolerance", "STEP defaults to mm - set INCH") the
 * ledger can never contain. Supplied by an injected TribalTipProvider so the engine
 * stays pure (no corpus I/O) - the dispatcher wires the real CADTribalDrawInjectionEngine.
 */
export interface TribalAdvice {
  id: string;
  tip: string;
  relevanceScore: number; // 0..1, from the tribal ranker
  source?: string;
  kind?: string; // failure-mode | doctrine | convention | process | ...
}

/**
 * Pure provider returning CAD tribal lessons relevant to a recommendation's risk
 * profile. Injected per-call (no shared engine state). Implemented by the dispatcher
 * over CADTribalDrawInjectionEngine + the tracked CAD tribal corpus.
 */
export type TribalTipProvider = (ctx: {
  categories: FailureCategory[];
  candidate: RecommendationCandidate;
  limit?: number;
}) => TribalAdvice[];

export interface CalibrationInfo {
  applied: boolean;         // true when a non-trivial shift was applied (enough scored data)
  rawRiskScore: number;     // riskScore BEFORE recalibration (the raw aggregate estimate)
  shift: number;            // logit-space shift added (negative = corpus over-predicts risk)
  scoredSampleSize: number; // recommendations with a realized outcome that informed the shift
}

export interface Recommendation {
  candidate: RecommendationCandidate;
  riskScore: number; // 0..1, posterior failure probability
  confidence: number; // 0..1, shrinkage weight
  topRiskCategories: Array<{ category: FailureCategory; rate: number }>;
  suggestions: AdjustmentSuggestion[];
  sampleSize: number;
  /**
   * Shop-floor tribal lessons relevant to this candidate's risk profile, injected via
   * a TribalTipProvider (deduped by id, sorted by relevance, capped). Always present;
   * empty when no provider is supplied or it returns/throws nothing. The closed loop's
   * knowledge-injection arm - pairs the engine's learned ledger with curated doctrine.
   */
  tribalTips: TribalAdvice[];
  /**
   * Closed-loop self-calibration (U-CAD-LEARN-CALIBRATE): present ONLY when calibration
   * was requested. riskScore is then the recalibrated value and rawRiskScore (here)
   * preserves the pre-correction aggregate estimate. The shift is learned from scored
   * recommendations (logit-shift from the RAW mean prediction toward the realized failure
   * rate, shrinkage-weighted by scored sample size), so the corrected risk converges on the
   * realized rate as scored data accumulates (w -> 1) -- closing the prior measure-but-don't-
   * act gap (getLoopEfficacy computed calibrationError but nothing consumed it).
   */
  calibration?: CalibrationInfo;
}

export interface FailureStats {
  totalIngested: number;
  totalFailures: number;
  totalSuccesses: number;
  totalErrors: number;
  byCategory: Record<FailureCategory, { failures: number; successes: number; rate: number }>;
  byPartType: Record<string, { failures: number; successes: number; rate: number }>;
  byGenerator: Record<string, { failures: number; successes: number; rate: number }>;
  windowStart?: string;
  windowEnd?: string;
}

export interface LearningTrend {
  earlyFailureRate: number;   // Beta(1,1) posterior, chronologically-first half
  recentFailureRate: number;  // Beta(1,1) posterior, chronologically-recent half
  delta: number;              // recent - early; negative = failures dropping (improving)
  improving: boolean;         // recent rate strictly below early rate (needs both halves populated)
  earlySampleSize: number;
  recentSampleSize: number;
  sufficientData: boolean;    // both halves have >= 1 outcome
}

export interface RecommendationRecord {
  recommendationId: string;
  issuedAt: string;
  candidate: RecommendationCandidate;
  predictedRisk: number;     // riskScore HANDED TO THE CALLER at issue time (calibrated when calibrate=true, else raw)
  rawPredictedRisk?: number; // pre-calibration aggregate risk; the calibration-shift basis (U-CAD-LEARN-CALIBRATE).
                             // Optional for legacy records -> computeCalibrationShift falls back to predictedRisk.
  confidence: number;        // shrinkage weight at issue time
  suggestionCount: number;   // # of adjustment suggestions handed to the caller
  tribalTipCount?: number;   // # tribal lessons injected at issue time (knowledge-arm signal)
  fulfilled: boolean;        // a linked outcome has been observed
  outcomeStatus?: "pass" | "fail" | "error"; // realized status of the linked outcome
  outcomeTestId?: string;
  fulfilledAt?: string;
}

export interface LoopEfficacy {
  issued: number;               // recommendations recorded
  attributed: number;           // recommendations with a linked (followed) outcome
  pending: number;              // issued but no linked outcome yet
  followedFailureRate: number;  // Beta(1,1) posterior fail rate among outcomes citing a recommendation
  baselineFailureRate: number;  // Beta(1,1) posterior fail rate among outcomes citing none
  lift: number;                 // baseline - followed; positive = recommendations reduce failures
  helping: boolean;             // lift > 0 with sufficient data on both arms
  calibrationError: number;     // |mean predictedRisk - realized failure fraction| over scored recs
  brierScore: number;           // mean (predictedRisk - actualFailed)^2 over scored recs; lower = better
  followedSampleSize: number;   // outcomes citing a recommendation
  baselineSampleSize: number;   // outcomes citing none
  sufficientData: boolean;      // both arms have >= MIN_EFFICACY_SAMPLES outcomes
  calibrationShift: number;     // logit-shift recommendAdjustments applies when calibrate=true (0 when not applicable)
  calibrationApplied: boolean;  // true when enough scored recs exist to trust + apply the shift
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas (input validation)
// ─────────────────────────────────────────────────────────────────────────────

const metricResultSchema = z
  .object({
    passed: z.boolean(),
    deviationPct: z.number().optional(),
  })
  .passthrough();

const outcomeSchema = z
  .object({
    testId: z.string().min(1),
    originalPath: z.string().min(1),
    status: z.enum(["pass", "fail", "error"]),
    partType: z.string().optional(),
    features: z.array(z.string()).optional(),
    generator: z.string().optional(),
    metrics: z
      .object({
        volume: metricResultSchema.optional(),
        bboxX: metricResultSchema.optional(),
        bboxY: metricResultSchema.optional(),
        bboxZ: metricResultSchema.optional(),
        featureCount: metricResultSchema.optional(),
        topology: metricResultSchema.optional(),
      })
      .optional(),
    error: z.string().optional(),
    durationMs: z.number().optional(),
    timestamp: z.string().optional(),
    recommendationId: z.string().optional(),
  })
  .passthrough();

const candidateSchema = z
  .object({
    partType: z.string().optional(),
    features: z.array(z.string()).optional(),
    generator: z.string().optional(),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the canonical CAD failure-ledger path, ANCHORED to this engine module's
 * location (mcp-server/data/state/...), NOT process.cwd(). A cwd-relative default
 * silently SPLITS the closed loop: a repo-root script (cwd=H:/prism) and the
 * mcp-server dispatcher (cwd=mcp-server) would write DIFFERENT ledgers, so the
 * cad_learning_* recommendations never see a script's ingested outcomes. Module-
 * anchoring makes every consumer share one ledger regardless of launch cwd.
 * (U-CAD-LEDGER-PATH-ABS -- fixes the divergence U-CAD-TEXT-LEARN-LOOP worked around
 * via PRISM_CAD_FAILURE_LEDGER.)
 *
 * @param moduleUrl import.meta.url of this engine module
 * @returns absolute path to <mcp-server>/data/state/cad-failure-ledger.jsonl
 */
export function resolveDefaultLedgerPath(moduleUrl: string): string {
  // <mcp-server>/{src|dist}/engines/CADTrialErrorLearningEngine.* -> ../../data/state/...
  const dir = path.dirname(fileURLToPath(moduleUrl));
  return path.resolve(dir, "..", "..", "data", "state", "cad-failure-ledger.jsonl");
}

const DEFAULT_LEDGER_PATH =
  process.env.PRISM_CAD_FAILURE_LEDGER || resolveDefaultLedgerPath(import.meta.url);

const SHRINKAGE_KAPPA = 10; // Efron-Morris-style shrinkage constant
const MAX_EXAMPLE_ERRORS = 5;
const MIN_EFFICACY_SAMPLES = 3; // min per-arm outcomes before a lift/calibration verdict is trusted
const MAX_TRIBAL_TIPS = 5; // cap on injected tribal lessons per recommendation
const CALIB_EPS = 1e-6; // probability clamp so logit() stays finite at p in {0,1}

/** Clamp a probability into (0,1) so logit() is finite. NaN -> 0.5. */
function clampProb(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - CALIB_EPS, Math.max(CALIB_EPS, p));
}
/** Log-odds of a probability (clamped to stay finite). */
function logit(p: number): number {
  const c = clampProb(p);
  return Math.log(c / (1 - c));
}
/** Inverse log-odds: maps a real number back into (0,1). */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Every failure category. A PASS is credited as a success to ALL of these so each
 * per-category failure rate has a proper denominator (failures + successes), not
 * failures alone. Single source shared by updateAggregates + getFailureStats.
 */
const ALL_FAILURE_CATEGORIES: FailureCategory[] = [
  "volume_mismatch",
  "bbox_mismatch",
  "feature_count_mismatch",
  "topology_mismatch",
  "code_error",
  "unknown",
];

interface CategoryAggregate {
  failures: number;
  successes: number;
  exampleErrors: string[];
  byPartType: Map<string, { failures: number; successes: number }>;
  byGenerator: Map<string, { failures: number; successes: number }>;
}

export class CADTrialErrorLearningEngine {
  private ledgerPath: string;
  private recLedgerPath: string;
  private outcomes: RegenerationOutcome[] = [];
  private aggregates: Map<FailureCategory, CategoryAggregate> = new Map();
  private partTypeTotals: Map<string, { failures: number; successes: number }> = new Map();
  private generatorTotals: Map<string, { failures: number; successes: number }> = new Map();
  private featureTotals: Map<string, { failures: number; successes: number }> = new Map();
  private recommendations: Map<string, RecommendationRecord> = new Map();
  private recCounter = 0;
  private totalIngested = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalErrors = 0;
  private windowStart?: string;
  private windowEnd?: string;

  constructor(ledgerPath: string | null = DEFAULT_LEDGER_PATH) {
    this.ledgerPath = ledgerPath || "";
    this.recLedgerPath = this.ledgerPath
      ? path.join(path.dirname(this.ledgerPath), "cad-recommendation-ledger.jsonl")
      : "";
    if (this.ledgerPath) {
      try {
        this.loadFromDisk();
      } catch {
        // first-run: ledger file may not exist yet — silently OK
      }
    }
  }

  // ─── Ingestion ───────────────────────────────────────────────────────────

  /**
   * Ingest a single regeneration test outcome and update learning state.
   * @param raw RegenerationOutcome (validated via Zod)
   * @returns IngestResult with categories detected
   */
  ingest(raw: unknown): IngestResult {
    const parsed = outcomeSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        testId: typeof (raw as any)?.testId === "string" ? (raw as any).testId : "<invalid>",
        categories: [],
        recorded: false,
        warning: `Invalid outcome: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const outcome: RegenerationOutcome = {
      testId: parsed.data.testId,
      originalPath: parsed.data.originalPath,
      status: parsed.data.status,
      partType: parsed.data.partType,
      features: parsed.data.features,
      generator: parsed.data.generator,
      metrics: parsed.data.metrics,
      error: parsed.data.error,
      durationMs: parsed.data.durationMs,
      timestamp: parsed.data.timestamp,
      recommendationId: parsed.data.recommendationId,
    };
    const ts = outcome.timestamp || new Date().toISOString();
    const stamped: RegenerationOutcome = { ...outcome, timestamp: ts };
    const categories = this.classify(stamped);

    this.outcomes.push(stamped);
    this.totalIngested++;
    if (stamped.status === "pass") this.totalSuccesses++;
    else if (stamped.status === "fail") this.totalFailures++;
    else this.totalErrors++;

    if (!this.windowStart || ts < this.windowStart) this.windowStart = ts;
    if (!this.windowEnd || ts > this.windowEnd) this.windowEnd = ts;

    this.updateAggregates(stamped, categories);
    this.appendToLedger(stamped);
    this.linkOutcome(stamped);

    return { testId: stamped.testId, categories, recorded: true };
  }

  /**
   * Ingest a batch of outcomes. Continues on individual failures.
   */
  ingestBatch(rawList: unknown[]): {
    total: number;
    recorded: number;
    skipped: number;
    results: IngestResult[];
  } {
    const results = rawList.map((r) => this.ingest(r));
    return {
      total: rawList.length,
      recorded: results.filter((r) => r.recorded).length,
      skipped: results.filter((r) => !r.recorded).length,
      results,
    };
  }

  // ─── Pattern extraction ──────────────────────────────────────────────────

  /**
   * Return failure patterns sorted by posterior failure-rate × confidence.
   */
  extractPatterns(): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    for (const [category, agg] of this.aggregates.entries()) {
      const n = agg.failures + agg.successes;
      const rate = (agg.failures + 1) / (n + 2); // Beta(1,1) posterior mean
      const confidence = n / (n + SHRINKAGE_KAPPA);
      patterns.push({
        category,
        failures: agg.failures,
        successes: agg.successes,
        failureRate: rate,
        confidence,
        exampleErrors: [...agg.exampleErrors],
        byPartType: this.toRecord(agg.byPartType),
        byGenerator: this.toRecord(agg.byGenerator),
      });
    }
    patterns.sort((a, b) => b.failureRate * b.confidence - a.failureRate * a.confidence);
    return patterns;
  }

  // ─── Recommendation ──────────────────────────────────────────────────────

  /**
   * Score a generation candidate and suggest adjustments based on
   * historical failure patterns.
   */
  /**
   * Closed-loop self-calibration signal (U-CAD-LEARN-CALIBRATE). The scored set =
   * recommendations with a realized (linked) outcome. Once it reaches
   * MIN_EFFICACY_SAMPLES, the corpus mean predicted risk is compared to the realized
   * failure fraction and a logit-space shift is learned that moves future predictions
   * toward reality, shrinkage-weighted by scored sample size (same Efron-Morris kappa
   * as the aggregate slices) so a thin corpus barely corrects. This is the missing
   * consumer of getLoopEfficacy's calibration measurement. Pure read of the ledger.
   *
   * @returns {applied, shift, scoredSampleSize} -- applied=false (shift 0) below the
   *   sample floor so an under-evidenced loop never distorts predictions.
   */
  private computeCalibrationShift(): { applied: boolean; shift: number; scoredSampleSize: number } {
    const scored = [...this.recommendations.values()].filter(
      (r) => r.fulfilled && r.outcomeStatus !== undefined
    );
    const n = scored.length;
    if (n < MIN_EFFICACY_SAMPLES) {
      return { applied: false, shift: 0, scoredSampleSize: n };
    }
    let predSum = 0;
    let realFails = 0;
    for (const r of scored) {
      // Anchor on the RAW pre-calibration risk (fallback: predictedRisk for legacy records).
      // Using the calibrated output here would make the shift self-referential and settle at a
      // biased fixed point; anchoring on the raw aggregate lets the correction converge on reality
      // as scored data grows (the shrinkage weight is then the only thing holding it back).
      predSum += r.rawPredictedRisk ?? r.predictedRisk;
      if (r.outcomeStatus !== "pass") realFails++;
    }
    const meanPred = predSum / n;
    const realizedFailFrac = realFails / n;
    const weight = n / (n + SHRINKAGE_KAPPA); // shrinkage: thin corpus -> small shift
    const shift = (logit(realizedFailFrac) - logit(meanPred)) * weight;
    return { applied: true, shift, scoredSampleSize: n };
  }

  /**
   * Risk-score + adjustment recommendation for a candidate.
   *
   * @param rawCandidate generation candidate (partType/features/generator)
   * @param opts.tribalProvider optional pure tribal-tip provider (dispatcher-wired)
   * @param opts.calibrate when true, recalibrate the raw aggregate riskScore via the
   *   closed-loop logit-shift (computeCalibrationShift); a `calibration` field is then
   *   attached carrying the raw score + applied shift. Default off -> byte-identical
   *   to the pre-U-CAD-LEARN-CALIBRATE behavior (no field, raw riskScore).
   * @returns the recommendation (riskScore is the calibrated value when calibrate=true
   *   and enough scored data exists; otherwise the raw aggregate estimate).
   */
  recommendAdjustments(
    rawCandidate: unknown,
    opts?: { tribalProvider?: TribalTipProvider; calibrate?: boolean }
  ): Recommendation {
    const parsed = candidateSchema.safeParse(rawCandidate ?? {});
    const candidate: RecommendationCandidate = parsed.success ? parsed.data : {};

    const patterns = this.extractPatterns();
    const sampleSize = this.totalIngested;

    // Risk score: weighted average over relevant slices
    const slicesUsed: Array<{ rate: number; conf: number; n: number }> = [];

    if (candidate.partType) {
      const t = this.partTypeTotals.get(candidate.partType);
      if (t) {
        const n = t.failures + t.successes;
        slicesUsed.push({
          rate: (t.failures + 1) / (n + 2),
          conf: n / (n + SHRINKAGE_KAPPA),
          n,
        });
      }
    }
    if (candidate.generator) {
      const t = this.generatorTotals.get(candidate.generator);
      if (t) {
        const n = t.failures + t.successes;
        slicesUsed.push({
          rate: (t.failures + 1) / (n + 2),
          conf: n / (n + SHRINKAGE_KAPPA),
          n,
        });
      }
    }
    for (const feat of candidate.features ?? []) {
      const t = this.featureTotals.get(feat);
      if (t) {
        const n = t.failures + t.successes;
        slicesUsed.push({
          rate: (t.failures + 1) / (n + 2),
          conf: n / (n + SHRINKAGE_KAPPA),
          n,
        });
      }
    }
    if (slicesUsed.length === 0 && this.totalIngested > 0) {
      const n = this.totalFailures + this.totalSuccesses;
      slicesUsed.push({
        rate: (this.totalFailures + 1) / (n + 2),
        conf: n / (n + SHRINKAGE_KAPPA),
        n,
      });
    }

    let riskScore = 0.5; // uninformed prior
    let confidence = 0;
    if (slicesUsed.length > 0) {
      const totalConf = slicesUsed.reduce((s, x) => s + x.conf, 0);
      if (totalConf > 0) {
        riskScore = slicesUsed.reduce((s, x) => s + x.rate * x.conf, 0) / totalConf;
        confidence = totalConf / slicesUsed.length;
      }
    }

    const topRiskCategories = patterns
      .slice(0, 3)
      .map((p) => ({ category: p.category, rate: p.failureRate }));

    const suggestions = this.buildSuggestions(patterns, candidate);
    const tribalTips = this.collectTribalTips(
      topRiskCategories.map((c) => c.category),
      candidate,
      opts?.tribalProvider
    );

    // Closed-loop self-calibration (U-CAD-LEARN-CALIBRATE): shift the raw aggregate
    // riskScore toward the realized failure rate measured over scored recommendations.
    let calibration: CalibrationInfo | undefined;
    if (opts?.calibrate) {
      const cal = this.computeCalibrationShift();
      const rawRiskScore = riskScore;
      if (cal.applied && cal.shift !== 0) {
        riskScore = sigmoid(logit(riskScore) + cal.shift);
      }
      calibration = {
        applied: cal.applied,
        rawRiskScore,
        shift: cal.shift,
        scoredSampleSize: cal.scoredSampleSize,
      };
    }

    return {
      candidate,
      riskScore,
      confidence,
      topRiskCategories,
      suggestions,
      sampleSize,
      tribalTips,
      ...(calibration ? { calibration } : {}),
    };
  }

  /**
   * Invoke the injected tribal provider (if any), validate, dedupe by id, sort by
   * relevance desc (id asc tiebreak), and cap at MAX_TRIBAL_TIPS. A tribal-injection
   * failure is NON-FATAL -- it never breaks a recommendation (mirrors the engine's
   * non-fatal ledger-I/O policy). Returns [] when no provider is supplied.
   *
   * @param categories the top risk categories for context
   * @param candidate the generation candidate (partType/features/generator)
   * @param provider optional pure tribal-tip provider (dispatcher-wired)
   * @returns deduped, ranked, capped tribal lessons (possibly empty)
   */
  private collectTribalTips(
    categories: FailureCategory[],
    candidate: RecommendationCandidate,
    provider?: TribalTipProvider
  ): TribalAdvice[] {
    if (!provider) return [];
    let raw: unknown;
    try {
      raw = provider({ categories, candidate, limit: MAX_TRIBAL_TIPS });
    } catch {
      return []; // tribal injection is advisory -- never fail the recommendation
    }
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: TribalAdvice[] = [];
    for (const t of raw as TribalAdvice[]) {
      if (!t || typeof t.id !== "string" || typeof t.tip !== "string") continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push({
        id: t.id,
        tip: t.tip,
        relevanceScore: typeof t.relevanceScore === "number" ? t.relevanceScore : 0,
        source: t.source,
        kind: t.kind,
      });
    }
    out.sort((a, b) => b.relevanceScore - a.relevanceScore || a.id.localeCompare(b.id));
    return out.slice(0, MAX_TRIBAL_TIPS);
  }

  // ─── Stats / introspection ───────────────────────────────────────────────

  getFailureStats(opts?: { since?: string; partType?: string }): FailureStats {
    const filter = (o: RegenerationOutcome) => {
      if (opts?.since && (o.timestamp || "") < opts.since) return false;
      if (opts?.partType && o.partType !== opts.partType) return false;
      return true;
    };
    const filtered = this.outcomes.filter(filter);

    const byCategory: Record<string, { failures: number; successes: number; rate: number }> = {};
    const byPartType: Record<string, { failures: number; successes: number; rate: number }> = {};
    const byGenerator: Record<string, { failures: number; successes: number; rate: number }> = {};

    let f = 0, s = 0, e = 0;
    for (const o of filtered) {
      if (o.status === "pass") s++;
      else if (o.status === "fail") f++;
      else e++;
      const isFail = o.status !== "pass";
      if (isFail) {
        // A failure is credited only to the categories it actually failed on.
        for (const c of this.classify(o)) {
          const cur = byCategory[c] || { failures: 0, successes: 0, rate: 0 };
          cur.failures++;
          byCategory[c] = cur;
        }
      } else {
        // A PASS is a success for EVERY category baseline (mirrors updateAggregates),
        // so each per-category rate has a proper denominator. WITHOUT this, classify()
        // returns [] for a pass -> successes stay 0 -> rate = (f+1)/(f+2) is wildly
        // inflated and disagrees with extractPatterns on the same data.
        for (const c of ALL_FAILURE_CATEGORIES) {
          const cur = byCategory[c] || { failures: 0, successes: 0, rate: 0 };
          cur.successes++;
          byCategory[c] = cur;
        }
      }
      if (o.partType) {
        const cur = byPartType[o.partType] || { failures: 0, successes: 0, rate: 0 };
        if (isFail) cur.failures++;
        else cur.successes++;
        byPartType[o.partType] = cur;
      }
      if (o.generator) {
        const cur = byGenerator[o.generator] || { failures: 0, successes: 0, rate: 0 };
        if (isFail) cur.failures++;
        else cur.successes++;
        byGenerator[o.generator] = cur;
      }
    }
    for (const obj of [byCategory, byPartType, byGenerator]) {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        const n = v.failures + v.successes;
        v.rate = n === 0 ? 0 : (v.failures + 1) / (n + 2);
      }
    }

    return {
      totalIngested: filtered.length,
      totalFailures: f,
      totalSuccesses: s,
      totalErrors: e,
      byCategory: byCategory as Record<FailureCategory, { failures: number; successes: number; rate: number }>,
      byPartType,
      byGenerator,
      windowStart: this.windowStart,
      windowEnd: this.windowEnd,
    };
  }

  // ─── Learning trend (loop-health observability) ──────────────────────────

  /**
   * Is the CAD generation learning loop actually improving? Splits the
   * chronologically-ordered outcome corpus into an early half and a recent half
   * and compares each half's Beta(1,1)-posterior failure rate. A recent rate
   * BELOW the early rate means failures are dropping as the corpus grows --
   * evidence the closed loop (ingest -> recommend -> better outcomes) is working.
   * Pure read of the existing ledger; no new state.
   *
   * @returns Early vs recent failure rates + the improving verdict.
   */
  getLearningTrend(): LearningTrend {
    const sorted = [...this.outcomes].sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    const early = sorted.slice(0, mid);
    const recent = sorted.slice(mid);
    const rate = (arr: RegenerationOutcome[]): number => {
      let f = 0, s = 0;
      for (const o of arr) { if (o.status === "pass") s++; else f++; }
      const nn = f + s;
      return nn === 0 ? 0 : (f + 1) / (nn + 2); // Beta(1,1) posterior mean
    };
    const earlyRate = rate(early);
    const recentRate = rate(recent);
    const sufficientData = early.length >= 1 && recent.length >= 1;
    return {
      earlyFailureRate: earlyRate,
      recentFailureRate: recentRate,
      delta: recentRate - earlyRate, // negative = improving
      improving: sufficientData && recentRate < earlyRate,
      earlySampleSize: early.length,
      recentSampleSize: recent.length,
      sufficientData,
    };
  }

  // ─── Closed-loop attribution (predictions -> outcomes -> retrain signal) ───

  /**
   * Issue and RECORD a recommendation so its realized outcome can later be
   * attributed back to it. Computes the recommendation via recommendAdjustments,
   * stamps a stable id, persists the issued record to the recommendation ledger,
   * and returns both. Close the loop by calling ingest() (or attributeOutcome())
   * with an outcome carrying the returned recommendationId; getLoopEfficacy()
   * then measures predicted-vs-realized + recommendation lift.
   *
   * @param rawCandidate generation candidate (same shape as recommendAdjustments)
   * @param opts.recommendationId optional caller-supplied id (else auto-assigned)
   * @returns the recommendationId + the full Recommendation handed to the caller
   */
  recordRecommendation(
    rawCandidate: unknown,
    opts?: { recommendationId?: string; tribalProvider?: TribalTipProvider; calibrate?: boolean }
  ): { recommendationId: string; recommendation: Recommendation } {
    const recommendation = this.recommendAdjustments(rawCandidate, {
      tribalProvider: opts?.tribalProvider,
      calibrate: opts?.calibrate,
    });
    const id =
      opts?.recommendationId && opts.recommendationId.length > 0
        ? opts.recommendationId
        : `rec_${this.recCounter++}`;
    // A caller-supplied id that collides keeps the FIRST record (idempotent) so
    // replay + re-issue never double-count a recommendation.
    if (!this.recommendations.has(id)) {
      const record: RecommendationRecord = {
        recommendationId: id,
        issuedAt: new Date().toISOString(),
        candidate: recommendation.candidate,
        predictedRisk: recommendation.riskScore,
        // Persist the RAW (pre-calibration) risk as the shift basis so computeCalibrationShift
        // is anchored to the aggregate model, NOT to its own calibrated output -- otherwise the
        // loop would settle at a biased fixed point instead of converging on the realized rate.
        rawPredictedRisk: recommendation.calibration?.rawRiskScore ?? recommendation.riskScore,
        confidence: recommendation.confidence,
        suggestionCount: recommendation.suggestions.length,
        tribalTipCount: recommendation.tribalTips.length,
        fulfilled: false,
      };
      this.recommendations.set(id, record);
      this.appendRecommendationToLedger(record);
    }
    return { recommendationId: id, recommendation };
  }

  /**
   * Convenience: stamp an outcome with a recommendationId and ingest it, closing
   * the loop in one call. Equivalent to ingest({ ...outcome, recommendationId }).
   */
  attributeOutcome(recommendationId: string, rawOutcome: unknown): IngestResult {
    const base = (rawOutcome && typeof rawOutcome === "object" ? rawOutcome : {}) as Record<string, unknown>;
    return this.ingest({ ...base, recommendationId });
  }

  /**
   * Closed-loop efficacy: did issuing recommendations actually help? Compares the
   * realized failure rate of outcomes that FOLLOWED a recommendation against the
   * BASELINE failure rate of outcomes that cited none, and scores how well the
   * predicted riskScore matched reality (calibration error + Brier). This is the
   * retrain signal -- a non-improving or mis-calibrated loop flags a retrain.
   * Pure read of the in-memory recommendation + outcome ledgers.
   *
   * @returns followed-vs-baseline lift + prediction calibration over the corpus.
   */
  getLoopEfficacy(): LoopEfficacy {
    const recs = [...this.recommendations.values()];
    const issued = recs.length;
    const attributed = recs.filter((r) => r.fulfilled).length;
    const pending = issued - attributed;

    // Lift arm: outcomes citing a recommendationId (followed) vs citing none (baseline).
    let followF = 0, followN = 0, baseF = 0, baseN = 0;
    for (const o of this.outcomes) {
      const failed = o.status !== "pass";
      if (o.recommendationId) {
        followN++;
        if (failed) followF++;
      } else {
        baseN++;
        if (failed) baseF++;
      }
    }
    // Beta(1,1) posterior mean; n===0 -> 0 (no data implies no measured risk, not 50%).
    const posterior = (f: number, n: number): number => (n === 0 ? 0 : (f + 1) / (n + 2));
    const followedFailureRate = posterior(followF, followN);
    const baselineFailureRate = posterior(baseF, baseN);
    const lift = baselineFailureRate - followedFailureRate;

    // Calibration arm: recommendations with BOTH a prediction and a realized outcome.
    const scored = recs.filter((r) => r.fulfilled && r.outcomeStatus !== undefined);
    let sqErr = 0, predSum = 0, realFails = 0;
    for (const r of scored) {
      const actual = r.outcomeStatus !== "pass" ? 1 : 0;
      sqErr += (r.predictedRisk - actual) ** 2;
      predSum += r.predictedRisk;
      realFails += actual;
    }
    const brierScore = scored.length === 0 ? 0 : sqErr / scored.length;
    const meanPred = scored.length === 0 ? 0 : predSum / scored.length;
    const realizedFailFrac = scored.length === 0 ? 0 : realFails / scored.length;
    const calibrationError = Math.abs(meanPred - realizedFailFrac);

    const sufficientData = followN >= MIN_EFFICACY_SAMPLES && baseN >= MIN_EFFICACY_SAMPLES;
    // Surface the self-correction the loop will apply (consumes the calibration measurement).
    const cal = this.computeCalibrationShift();
    return {
      issued,
      attributed,
      pending,
      followedFailureRate,
      baselineFailureRate,
      lift,
      helping: sufficientData && lift > 0,
      calibrationError,
      brierScore,
      followedSampleSize: followN,
      baselineSampleSize: baseN,
      sufficientData,
      calibrationShift: cal.shift,
      calibrationApplied: cal.applied,
    };
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  /**
   * Reset all in-memory state and (optionally) the ledger file. Test-only.
   */
  reset(opts?: { eraseLedger?: boolean }): void {
    this.outcomes = [];
    this.aggregates.clear();
    this.partTypeTotals.clear();
    this.generatorTotals.clear();
    this.featureTotals.clear();
    this.recommendations.clear();
    this.recCounter = 0;
    this.totalIngested = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.totalErrors = 0;
    this.windowStart = undefined;
    this.windowEnd = undefined;
    if (opts?.eraseLedger && this.ledgerPath && fs.existsSync(this.ledgerPath)) {
      fs.unlinkSync(this.ledgerPath);
    }
    if (opts?.eraseLedger && this.recLedgerPath && fs.existsSync(this.recLedgerPath)) {
      fs.unlinkSync(this.recLedgerPath);
    }
  }

  /**
   * Replace the ledger path (creates parent directory on next write).
   */
  setLedgerPath(p: string | null): void {
    this.ledgerPath = p || "";
    this.recLedgerPath = this.ledgerPath
      ? path.join(path.dirname(this.ledgerPath), "cad-recommendation-ledger.jsonl")
      : "";
  }

  /**
   * Replay the JSONL ledger to rebuild in-memory state.
   */
  loadFromDisk(): { loaded: number; skipped: number } {
    // Recommendations first so outcome replay can attribute against them.
    this.recommendations.clear();
    this.recCounter = 0;
    this.loadRecommendationsFromDisk();
    if (!this.ledgerPath || !fs.existsSync(this.ledgerPath)) {
      return { loaded: 0, skipped: 0 };
    }
    const text = fs.readFileSync(this.ledgerPath, "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let loaded = 0, skipped = 0;
    this.outcomes = [];
    this.aggregates.clear();
    this.partTypeTotals.clear();
    this.generatorTotals.clear();
    this.featureTotals.clear();
    this.totalIngested = this.totalFailures = this.totalSuccesses = this.totalErrors = 0;
    this.windowStart = this.windowEnd = undefined;
    for (const line of lines) {
      try {
        const o = JSON.parse(line) as RegenerationOutcome;
        const cats = this.classify(o);
        this.outcomes.push(o);
        this.totalIngested++;
        if (o.status === "pass") this.totalSuccesses++;
        else if (o.status === "fail") this.totalFailures++;
        else this.totalErrors++;
        const ts = o.timestamp || "";
        if (ts && (!this.windowStart || ts < this.windowStart)) this.windowStart = ts;
        if (ts && (!this.windowEnd || ts > this.windowEnd)) this.windowEnd = ts;
        this.updateAggregates(o, cats);
        this.linkOutcome(o);
        loaded++;
      } catch {
        skipped++;
      }
    }
    return { loaded, skipped };
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private classify(o: RegenerationOutcome): FailureCategory[] {
    if (o.status === "pass") return [];
    if (o.status === "error") return ["code_error"];

    const cats: FailureCategory[] = [];
    const m = o.metrics || {};
    if (m.volume && m.volume.passed === false) cats.push("volume_mismatch");
    if (
      (m.bboxX && m.bboxX.passed === false) ||
      (m.bboxY && m.bboxY.passed === false) ||
      (m.bboxZ && m.bboxZ.passed === false)
    ) {
      cats.push("bbox_mismatch");
    }
    if (m.featureCount && m.featureCount.passed === false) cats.push("feature_count_mismatch");
    if (m.topology && m.topology.passed === false) cats.push("topology_mismatch");
    if (cats.length === 0) cats.push("unknown");
    return cats;
  }

  private updateAggregates(o: RegenerationOutcome, categories: FailureCategory[]): void {
    const isFail = o.status !== "pass";
    const seen = new Set<FailureCategory>(categories);
    if (!isFail) {
      // Successes count toward every observed-when-failed category in a flat
      // aggregation — but we want per-category baselines, so credit success
      // to ALL categories so each rate is bounded properly.
      for (const c of ALL_FAILURE_CATEGORIES) {
        seen.add(c);
      }
    }
    for (const c of seen) {
      const agg: CategoryAggregate = this.aggregates.get(c) ?? {
        failures: 0,
        successes: 0,
        exampleErrors: [],
        byPartType: new Map(),
        byGenerator: new Map(),
      };
      if (isFail && categories.includes(c)) {
        agg.failures++;
        if (o.error) {
          agg.exampleErrors.unshift(o.error);
          if (agg.exampleErrors.length > MAX_EXAMPLE_ERRORS) {
            agg.exampleErrors.length = MAX_EXAMPLE_ERRORS;
          }
        }
      } else if (!isFail) {
        agg.successes++;
      }
      if (o.partType) {
        const pt = agg.byPartType.get(o.partType) || { failures: 0, successes: 0 };
        if (isFail && categories.includes(c)) pt.failures++;
        else if (!isFail) pt.successes++;
        agg.byPartType.set(o.partType, pt);
      }
      if (o.generator) {
        const g = agg.byGenerator.get(o.generator) || { failures: 0, successes: 0 };
        if (isFail && categories.includes(c)) g.failures++;
        else if (!isFail) g.successes++;
        agg.byGenerator.set(o.generator, g);
      }
      this.aggregates.set(c, agg);
    }
    if (o.partType) {
      const t = this.partTypeTotals.get(o.partType) || { failures: 0, successes: 0 };
      if (isFail) t.failures++;
      else t.successes++;
      this.partTypeTotals.set(o.partType, t);
    }
    if (o.generator) {
      const t = this.generatorTotals.get(o.generator) || { failures: 0, successes: 0 };
      if (isFail) t.failures++;
      else t.successes++;
      this.generatorTotals.set(o.generator, t);
    }
    // Features are a 3rd learning dimension (alongside partType + generator): each
    // feature present on an outcome accrues the fail/success so recommendAdjustments
    // can risk-score a candidate by its features (previously accepted but inert).
    for (const feat of o.features ?? []) {
      const t = this.featureTotals.get(feat) || { failures: 0, successes: 0 };
      if (isFail) t.failures++;
      else t.successes++;
      this.featureTotals.set(feat, t);
    }
  }

  private appendToLedger(o: RegenerationOutcome): void {
    if (!this.ledgerPath) return;
    try {
      const dir = path.dirname(this.ledgerPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.ledgerPath, JSON.stringify(o) + "\n", "utf8");
    } catch {
      // non-fatal — learning still works in memory
    }
  }

  /**
   * Closed-loop attribution: if an outcome cites a recommendationId, mark that
   * recommendation fulfilled with the realized status. First-write-wins (the
   * immediate result of acting on the recommendation); later duplicates are
   * ignored so ledger replay is order-stable.
   */
  private linkOutcome(o: RegenerationOutcome): void {
    const id = o.recommendationId;
    if (!id) return;
    const rec = this.recommendations.get(id);
    if (!rec || rec.fulfilled) return;
    rec.fulfilled = true;
    rec.outcomeStatus = o.status;
    rec.outcomeTestId = o.testId;
    rec.fulfilledAt = o.timestamp;
  }

  private appendRecommendationToLedger(record: RecommendationRecord): void {
    if (!this.recLedgerPath) return;
    try {
      const dir = path.dirname(this.recLedgerPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(this.recLedgerPath, JSON.stringify(record) + "\n", "utf8");
    } catch {
      // non-fatal -- attribution still works in memory this session
    }
  }

  /**
   * Replay the recommendation JSONL ledger. Records are stored at issue time
   * (fulfilled:false); fulfillment is re-derived from the outcome ledger by the
   * outcome replay in loadFromDisk, so always reload them unfulfilled. Restores
   * recCounter past the highest auto-assigned id so new ids never collide.
   */
  private loadRecommendationsFromDisk(): void {
    if (!this.recLedgerPath || !fs.existsSync(this.recLedgerPath)) return;
    let maxCounter = 0;
    try {
      const text = fs.readFileSync(this.recLedgerPath, "utf8");
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const r = JSON.parse(line) as RecommendationRecord;
          if (!r.recommendationId) continue;
          this.recommendations.set(r.recommendationId, {
            ...r,
            fulfilled: false,
            outcomeStatus: undefined,
            outcomeTestId: undefined,
            fulfilledAt: undefined,
          });
          const m = r.recommendationId.match(/^rec_(\d+)$/);
          if (m) maxCounter = Math.max(maxCounter, Number(m[1]) + 1);
        } catch {
          // skip a malformed recommendation line
        }
      }
    } catch {
      // unreadable ledger -> attribution starts empty this session
    }
    this.recCounter = maxCounter;
  }

  private toRecord(
    map: Map<string, { failures: number; successes: number }>
  ): Record<string, { failures: number; successes: number; rate: number }> {
    const out: Record<string, { failures: number; successes: number; rate: number }> = {};
    for (const [k, v] of map.entries()) {
      const n = v.failures + v.successes;
      out[k] = { failures: v.failures, successes: v.successes, rate: n === 0 ? 0 : (v.failures + 1) / (n + 2) };
    }
    return out;
  }

  private buildSuggestions(
    patterns: FailurePattern[],
    candidate: RecommendationCandidate
  ): AdjustmentSuggestion[] {
    const out: AdjustmentSuggestion[] = [];
    for (const p of patterns) {
      if (p.confidence < 0.1) continue;
      if (p.failureRate < 0.25) continue;
      const reduction = p.failureRate * p.confidence;
      switch (p.category) {
        case "volume_mismatch":
          out.push({
            category: p.category,
            action: "Tighten volume tolerance check; verify boolean op order; ensure stock allowance applied consistently.",
            rationale: `Volume mismatch occurs in ~${(p.failureRate * 100).toFixed(0)}% of past attempts (n=${p.failures + p.successes}).`,
            expectedRiskReduction: reduction,
          });
          break;
        case "bbox_mismatch":
          out.push({
            category: p.category,
            action: "Re-validate WCS origin and primary-axis orientation before extrude/revolve.",
            rationale: `Bounding-box deviations in ~${(p.failureRate * 100).toFixed(0)}% of past attempts.`,
            expectedRiskReduction: reduction,
          });
          break;
        case "feature_count_mismatch":
          out.push({
            category: p.category,
            action: "Audit feature recognition output; some features may be merged or split during code emission.",
            rationale: `Feature-count drift in ~${(p.failureRate * 100).toFixed(0)}% of past attempts.`,
            expectedRiskReduction: reduction,
          });
          break;
        case "topology_mismatch":
          out.push({
            category: p.category,
            action: "Check fillet/chamfer order and shell direction; topology errors often stem from operation sequencing.",
            rationale: `Topology deltas in ~${(p.failureRate * 100).toFixed(0)}% of past attempts.`,
            expectedRiskReduction: reduction,
          });
          break;
        case "code_error":
          out.push({
            category: p.category,
            action: "Run generator dry-run / lint pass before launching CAD app; capture stderr for triage.",
            rationale: `Outright code errors occur in ~${(p.failureRate * 100).toFixed(0)}% of past attempts.`,
            expectedRiskReduction: reduction,
          });
          break;
      }
    }
    if (candidate.generator) {
      const gt = this.generatorTotals.get(candidate.generator);
      if (gt) {
        const n = gt.failures + gt.successes;
        const rate = (gt.failures + 1) / (n + 2);
        if (rate > 0.4 && n >= 5) {
          out.push({
            category: "unknown",
            action: `Consider an alternate generator — '${candidate.generator}' fails ~${(rate * 100).toFixed(0)}% of the time on prior runs (n=${n}).`,
            rationale: "Generator-specific failure rate exceeds 40% threshold.",
            expectedRiskReduction: rate * (n / (n + SHRINKAGE_KAPPA)),
          });
        }
      }
    }
    return out;
  }
}

export const cadTrialErrorLearningEngine = new CADTrialErrorLearningEngine();
