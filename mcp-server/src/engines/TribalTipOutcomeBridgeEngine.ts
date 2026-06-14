/**
 * TribalTipOutcomeBridgeEngine — TRIBAL-OUTCOME-LOOP-MS0 U-TTOB01
 * ===============================================================
 *
 * Closes the closed-loop self-training gap for the tribal-tip corpus.
 *
 * Both halves exist in PRISM already:
 *   • Tribal tips: src/data/tribal-tips/*.ts (309 milling, +cam-tips/* indexes)
 *   • Outcomes:    OutcomeTrackingEngine writes <data>/outcomes/outcomes.jsonl
 *
 * What was missing: the *join*. When milling-wizard generates a program using
 * tribal tip X, no record links tip X to the resulting program. When the
 * shop floor logs an outcome (good/scrap/adjusted/aborted) for that program,
 * we cannot ask "which tips correlate with good runs?" — the bridge wasn't
 * there. This engine is that bridge.
 *
 * Two files, both append-only JSONL:
 *   1. tip-program-applications.jsonl
 *      Records (tipId, programId, contextMeta, appliedAt) — every time a tip
 *      participated in program generation, log here.
 *   2. (No second file — outcomes are read from OutcomeTrackingEngine directly.)
 *
 * Effectiveness score per tip = weighted average of joined outcomes:
 *   good=+1.0, adjusted=+0.5, aborted=-0.25, scrap=-1.0
 *   With Laplace smoothing (1 prior in each direction) so a single bad
 *   outcome doesn't collapse a tip's score to -1.0 forever.
 *
 * Wiring (TTOB02..04):
 *   - Dispatcher actions: prism_mill:tribal_tip_record_application,
 *                         prism_mill:tribal_tip_effectiveness
 *   - KnowledgeCurriculumBridgeEngine.tipsForMillingOperation() will rank by
 *     effectiveness once TTOB03 lands.
 *   - JM Die feedback loop: shop_outcome_record automatically calls
 *     OutcomeTrackingEngine.log(); this bridge then joins on programId.
 *
 * Foxtrot-soul refuse_list compliance:
 *   - "promoting-low-confidence-tribal-to-doctrine" — effectiveness score is
 *     ADVISORY for retrieval ranking, NOT a doctrine-promotion signal. Tips
 *     graduate draft→validated→doctrine via human review, not auto-promotion.
 *   - "dropping-source-attribution-on-ingest" — bridge preserves tipId, never
 *     synthesizes a "consensus tip" from outcome data.
 *
 * @module engines/TribalTipOutcomeBridgeEngine
 * @milestone TRIBAL-OUTCOME-LOOP-MS0/U-TTOB01
 * @authored 2026-05-27 slot:foxtrot
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { OutcomeTrackingEngine, type OutcomeRecord } from "./OutcomeTrackingEngine.js";

const SCHEMA_VERSION = 1 as const;

// Weights for effectiveness scoring. Tuned per CLAUDE.md AI discipline injection
// (good >> adjusted > aborted > scrap). Asymmetric: scrap is twice as costly
// as aborted because scrap implies the tip drove a bad final result, while
// aborted often reflects external machine issues unrelated to tip quality.
const OUTCOME_WEIGHTS: Record<string, number> = {
  good: 1.0,
  adjusted: 0.5,
  aborted: -0.25,
  scrap: -1.0,
};

// Laplace smoothing prior: 1 "neutral" outcome in each direction.
// Prevents a single scrap from dominating a 1-application tip's score.
const LAPLACE_PRIOR_GOOD = 1;
const LAPLACE_PRIOR_SCRAP = 1;

export const TipApplicationInputSchema = z.object({
  tipId: z.string().min(1),
  programId: z.string().min(1),
  /** Operation taxonomy bucket (e.g. "face_milling") for slicing effectiveness by op type. */
  operation: z.string().optional(),
  /** Which mill engine consumed the tip (KnowledgeCurriculumBridge, MillWizard, etc.) */
  consumer: z.string().optional(),
  /** Free-text context: why was this tip surfaced for this program? */
  context: z.string().optional(),
});

export type TipApplicationInput = z.infer<typeof TipApplicationInputSchema>;

export interface TipApplicationRecord extends TipApplicationInput {
  appliedAt: string;
  seq: number;
  schemaVersion: typeof SCHEMA_VERSION;
}

export interface TipEffectivenessQuery {
  tipId: string;
  /** Restrict to applications for a specific operation bucket. */
  operation?: string;
  /** Earliest application timestamp to include. */
  sinceIso?: string;
}

export interface TipEffectivenessReport {
  tipId: string;
  totalApplications: number;
  joinedOutcomes: number;
  byKind: { good: number; adjusted: number; aborted: number; scrap: number };
  /** Raw weighted average score, signed [-1, +1]. */
  weightedScore: number;
  /** Laplace-smoothed score, signed [-1, +1]. More stable for low-N tips. */
  smoothedScore: number;
  /** Confidence tier derived from N: low (<5), medium (5-20), high (>20). */
  confidenceTier: "low" | "medium" | "high";
  /** Sample applications for traceability (newest 5). */
  recentApplications: TipApplicationRecord[];
  /** ISO timestamp range for the joined outcomes. Null if none. */
  outcomeRange: { firstIso: string | null; lastIso: string | null };
}

const writeChains = new Map<string, Promise<void>>();

function serialize<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(filePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  writeChains.set(filePath, next.then(() => undefined, () => undefined));
  return next;
}

export class TribalTipOutcomeBridgeEngine {
  readonly name = "TribalTipOutcomeBridgeEngine";

  private readonly applicationsPath: string;
  private cache: TipApplicationRecord[] | null = null;
  private nextSeq = 0;

  constructor(
    private readonly outcomeEngine: OutcomeTrackingEngine = new OutcomeTrackingEngine(),
    dataDir: string = path.resolve(process.cwd(), "data", "tribal-outcomes"),
    filename = "tip-program-applications.jsonl",
  ) {
    this.applicationsPath = path.join(dataDir, filename);
  }

  /** Test/ops hook: disk path for the applications log. */
  getApplicationsLogPath(): string {
    return this.applicationsPath;
  }

  /**
   * Record that a tip was applied during generation of a program.
   *
   * @param input tipId + programId + optional metadata
   * @returns the appended TipApplicationRecord (with assigned seq + appliedAt)
   */
  async recordApplication(input: TipApplicationInput): Promise<TipApplicationRecord> {
    const parsed = TipApplicationInputSchema.parse(input);
    const records = await this.loadCache();
    const seq = this.nextSeq++;
    const record: TipApplicationRecord = {
      ...parsed,
      appliedAt: new Date().toISOString(),
      seq,
      schemaVersion: SCHEMA_VERSION,
    };
    await this.appendRecord(record);
    records.push(record);
    return record;
  }

  /**
   * Compute effectiveness for a tip by joining application records to
   * OutcomeTrackingEngine outcomes on programId.
   *
   * @param query tipId (required) + optional operation/since filters
   * @returns TipEffectivenessReport with raw + Laplace-smoothed scores
   */
  async effectiveness(query: TipEffectivenessQuery): Promise<TipEffectivenessReport> {
    const applications = await this.loadCache();
    const since = query.sinceIso ? Date.parse(query.sinceIso) : -Infinity;

    const tipApps = applications.filter((a) => {
      if (a.tipId !== query.tipId) return false;
      if (query.operation && a.operation !== query.operation) return false;
      const t = Date.parse(a.appliedAt);
      if (Number.isFinite(t) && t < since) return false;
      return true;
    });

    const byKind = { good: 0, adjusted: 0, aborted: 0, scrap: 0 };
    let joined = 0;
    let weightedSum = 0;
    let firstOutcomeIso: string | null = null;
    let lastOutcomeIso: string | null = null;

    // Fetch all matched-program outcomes in parallel (no N+1 sequential awaits).
    const outcomeLists: OutcomeRecord[][] = await Promise.all(
      tipApps.map((app) => this.outcomeEngine.forProgram(app.programId)),
    );
    for (const outcomes of outcomeLists) {
      for (const oc of outcomes) {
        joined++;
        const weight = OUTCOME_WEIGHTS[oc.outcome] ?? 0;
        weightedSum += weight;
        byKind[oc.outcome as keyof typeof byKind]++;
        if (!firstOutcomeIso || oc.recordedAt < firstOutcomeIso) firstOutcomeIso = oc.recordedAt;
        if (!lastOutcomeIso || oc.recordedAt > lastOutcomeIso) lastOutcomeIso = oc.recordedAt;
      }
    }

    const rawWeighted = joined > 0 ? weightedSum / joined : 0;

    // Laplace-smoothed: treat as binary good-vs-bad to start, with priors.
    // weighted_good = sum of positive weights, weighted_bad = abs(sum of negative weights).
    const weightedGood = byKind.good * OUTCOME_WEIGHTS.good + byKind.adjusted * OUTCOME_WEIGHTS.adjusted;
    const weightedBad = Math.abs(byKind.scrap * OUTCOME_WEIGHTS.scrap + byKind.aborted * OUTCOME_WEIGHTS.aborted);
    const smoothedNum = weightedGood + LAPLACE_PRIOR_GOOD;
    const smoothedDen = weightedGood + weightedBad + LAPLACE_PRIOR_GOOD + LAPLACE_PRIOR_SCRAP;
    // Map [0,1] to [-1,+1] for symmetry with raw weighted score.
    const smoothedScore = smoothedDen > 0 ? (2 * smoothedNum / smoothedDen) - 1 : 0;

    const confidenceTier: "low" | "medium" | "high" =
      joined < 5 ? "low" : joined < 20 ? "medium" : "high";

    const recentApplications = tipApps
      .slice()
      .sort((a, b) => b.seq - a.seq)
      .slice(0, 5);

    return {
      tipId: query.tipId,
      totalApplications: tipApps.length,
      joinedOutcomes: joined,
      byKind,
      weightedScore: rawWeighted,
      smoothedScore,
      confidenceTier,
      recentApplications,
      outcomeRange: { firstIso: firstOutcomeIso, lastIso: lastOutcomeIso },
    };
  }

  /** Force cache reload from disk. Useful in tests + after external edits. */
  async reload(): Promise<void> {
    this.cache = null;
    this.nextSeq = 0;
    await this.loadCache();
  }

  // ── internals ────────────────────────────────────────────────────────

  private async loadCache(): Promise<TipApplicationRecord[]> {
    if (this.cache !== null) return this.cache;
    if (!existsSync(this.applicationsPath)) {
      this.cache = [];
      return this.cache;
    }
    const raw = await readFile(this.applicationsPath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: TipApplicationRecord[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as TipApplicationRecord;
        parsed.push(obj);
        if (obj.seq >= this.nextSeq) this.nextSeq = obj.seq + 1;
      } catch {
        // Skip malformed lines — fail-loud via warning, do not throw to caller.
        // Per CLAUDE.md "never silentCatch in engines" we surface this
        // diagnostic but continue serving valid records.
        console.warn(`[TribalTipOutcomeBridge] skipping malformed line in ${this.applicationsPath}`);
      }
    }
    this.cache = parsed;
    return this.cache;
  }

  private async appendRecord(record: TipApplicationRecord): Promise<void> {
    return serialize(this.applicationsPath, async () => {
      await mkdir(path.dirname(this.applicationsPath), { recursive: true });
      await appendFile(this.applicationsPath, JSON.stringify(record) + "\n");
    });
  }
}

/** Singleton instance for dispatcher lazy-import. */
export const tribalTipOutcomeBridgeEngine = new TribalTipOutcomeBridgeEngine();
