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

export interface Recommendation {
  candidate: RecommendationCandidate;
  riskScore: number; // 0..1, posterior failure probability
  confidence: number; // 0..1, shrinkage weight
  topRiskCategories: Array<{ category: FailureCategory; rate: number }>;
  suggestions: AdjustmentSuggestion[];
  sampleSize: number;
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

const DEFAULT_LEDGER_PATH =
  process.env.PRISM_CAD_FAILURE_LEDGER ||
  path.resolve(process.cwd(), "data/state/cad-failure-ledger.jsonl");

const SHRINKAGE_KAPPA = 10; // Efron-Morris-style shrinkage constant
const MAX_EXAMPLE_ERRORS = 5;

interface CategoryAggregate {
  failures: number;
  successes: number;
  exampleErrors: string[];
  byPartType: Map<string, { failures: number; successes: number }>;
  byGenerator: Map<string, { failures: number; successes: number }>;
}

export class CADTrialErrorLearningEngine {
  private ledgerPath: string;
  private outcomes: RegenerationOutcome[] = [];
  private aggregates: Map<FailureCategory, CategoryAggregate> = new Map();
  private partTypeTotals: Map<string, { failures: number; successes: number }> = new Map();
  private generatorTotals: Map<string, { failures: number; successes: number }> = new Map();
  private totalIngested = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private totalErrors = 0;
  private windowStart?: string;
  private windowEnd?: string;

  constructor(ledgerPath: string | null = DEFAULT_LEDGER_PATH) {
    this.ledgerPath = ledgerPath || "";
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
  recommendAdjustments(rawCandidate: unknown): Recommendation {
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

    return {
      candidate,
      riskScore,
      confidence,
      topRiskCategories,
      suggestions,
      sampleSize,
    };
  }

  // ─── Stats / introspection ───────────────────────────────────────────────

  getFailureStats(opts?: { since?: string; partType?: string }): FailureStats {
    const filter = (o: RegenerationOutcome) => {
      if (opts?.since && (o.timestamp || "") < opts.since) return false;
      if (opts?.partType && o.partType !== opts.partType) return false;
      return true;
    };
    const filtered = this.outcomes.filter(filter);

    const byCategory: Partial<Record<FailureCategory, { failures: number; successes: number; rate: number }>> = {};
    const byPartType: Record<string, { failures: number; successes: number; rate: number }> = {};
    const byGenerator: Record<string, { failures: number; successes: number; rate: number }> = {};

    let f = 0, s = 0, e = 0;
    for (const o of filtered) {
      if (o.status === "pass") s++;
      else if (o.status === "fail") f++;
      else e++;
      const cats = this.classify(o);
      const isFail = o.status !== "pass";
      for (const c of cats) {
        const cur = byCategory[c] || { failures: 0, successes: 0, rate: 0 };
        if (isFail) cur.failures++;
        else cur.successes++;
        byCategory[c] = cur;
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

  // ─── Persistence ─────────────────────────────────────────────────────────

  /**
   * Reset all in-memory state and (optionally) the ledger file. Test-only.
   */
  reset(opts?: { eraseLedger?: boolean }): void {
    this.outcomes = [];
    this.aggregates.clear();
    this.partTypeTotals.clear();
    this.generatorTotals.clear();
    this.totalIngested = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.totalErrors = 0;
    this.windowStart = undefined;
    this.windowEnd = undefined;
    if (opts?.eraseLedger && this.ledgerPath && fs.existsSync(this.ledgerPath)) {
      fs.unlinkSync(this.ledgerPath);
    }
  }

  /**
   * Replace the ledger path (creates parent directory on next write).
   */
  setLedgerPath(p: string | null): void {
    this.ledgerPath = p || "";
  }

  /**
   * Replay the JSONL ledger to rebuild in-memory state.
   */
  loadFromDisk(): { loaded: number; skipped: number } {
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
      for (const c of [
        "volume_mismatch",
        "bbox_mismatch",
        "feature_count_mismatch",
        "topology_mismatch",
        "code_error",
        "unknown",
      ] as FailureCategory[]) {
        seen.add(c);
      }
    }
    for (const c of seen) {
      const agg = this.aggregates.get(c) || {
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
