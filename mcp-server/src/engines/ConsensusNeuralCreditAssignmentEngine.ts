/**
 * ConsensusNeuralCreditAssignmentEngine — closes the multi-model consensus
 * learning loop by translating per-run reward into per-vendor credit and
 * applying it to the ConsensusModelPerformanceEngine EMA tracker.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-NEURAL-CREDIT-ASSIGN.
 *
 * Why this exists
 * ---------------
 * The neural feedback pipeline had a producer (ConsensusNeuralFeedbackEngine
 * writing JSONL) and a consumer-shape (ConsensusModelPerformanceEngine
 * exposing applyObservation()) but nothing connecting them. As a result the
 * vendor-EMA tracker stayed permanently cold-start (ema=0.5) — the consensus
 * pool could never actually learn which vendors were worth their cost on a
 * given task type.
 *
 * This engine is that connection.
 *
 *   ConsensusAIBridgeEngine.reason()
 *     ├── consensusNeuralFeedbackEngine.record(result)   (writes JSONL)
 *     └── consensusNeuralCreditAssignmentEngine.applyFromResult(...)  ← NEW
 *           ├── computeCredit(datum)         per-model credit fan-out
 *           ├── applyObservation(...)        per-vendor EMA update
 *           └── saveState(...)               atomic temp+rename
 *
 * Two modes are exposed:
 *
 *   1. applyFromResult(): online — called per consensus run from AIBridge.
 *      Reads current perf state, computes per-model credit from the
 *      ConsensusResult directly (no JSONL roundtrip), applies all
 *      observations, persists. Returns the diff (per-model emaBefore /
 *      emaAfter) so callers can surface "the pool just learned X about
 *      vendor Y" telemetry.
 *
 *   2. applyFromFeed(): batch — replays a JSONL feed from a persisted
 *      cursor. Idempotent: the cursor records last_offset_bytes and last_ts
 *      so re-running over the same feed processes only new lines. Used for
 *      backfill after deployment, dashboard rebuilds, and disaster recovery
 *      when the perf state file is lost but the feed survived.
 *
 * Credit formula
 * --------------
 * For each model in a consensus result, we want to translate the global
 * reward [0,1] into a per-vendor credit signal that captures THAT model's
 * contribution. Three multiplicative factors:
 *
 *   credit = global_reward
 *          × voter_bonus      // 1.0 if model voted with consensus, 0.5 otherwise
 *          × fact_factor      // factuality_score in [0,1], or 1.0 if no mentions
 *          × ok_factor        // 1.0 if model returned ok, 0.0 if it errored
 *
 * Failed models get exactly zero credit so the EMA correctly tracks
 * unreliable vendors. Non-voters keep half-credit because they still ran +
 * paid token cost and might be right while the consensus is wrong (we just
 * don't have ground truth yet — half is a deliberate prior).
 *
 * Hallucinations show up via factuality_score: a model that hallucinates
 * gets fact_factor < 1, so even if it won the vote it loses some credit.
 *
 * The credit is then clamped to [0,1] before passing to applyObservation,
 * which itself rejects out-of-range rewards (defensive on top of defensive).
 *
 * Cursor
 * ------
 * Schema:
 *   {
 *     schemaVersion: "1.0.0",
 *     feed_path: string,                // canonical feed this cursor tracks
 *     last_offset_bytes: number,        // file position consumed up to
 *     last_ts: string,                  // ISO timestamp of last datum applied
 *     lines_processed: number,          // total lines processed across all runs
 *   }
 *
 * Atomic via temp+rename. Cursor mismatch (different feed_path) auto-resets
 * to offset 0 with a warning in the result so callers can detect feed
 * rotation.
 *
 * Pure where possible — computeCredit() has no I/O. applyFromResult() does
 * one read + one write of the perf state file. applyFromFeed() does one
 * read of the cursor, streams the feed from offset, applies in-memory, and
 * does one write each of perf state + cursor at the end.
 *
 * @module engines/ConsensusNeuralCreditAssignmentEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  ConsensusModelPerformanceEngine,
  consensusModelPerformanceEngine,
  type PerformanceState,
} from "./ConsensusModelPerformanceEngine.js";
import type { ConsensusResultLike, NeuralFeedDatum } from "./ConsensusNeuralFeedbackEngine.js";

const SCHEMA_VERSION = "1.0.0";

const DEFAULT_FEED_PATH =
  process.env.CONSENSUS_NEURAL_FEED ?? "H:/prism/state/shared/CONSENSUS_NEURAL_FEED.jsonl";

const DEFAULT_CURSOR_PATH =
  process.env.CONSENSUS_CREDIT_CURSOR ??
  "H:/prism/state/shared/CONSENSUS_CREDIT_ASSIGN_CURSOR.json";

const DEFAULT_PERF_STATE_PATH =
  "H:/prism/mcp-server/data/state/consensus-model-performance.json";

const VOTER_BONUS_FULL = 1.0;
const VOTER_BONUS_HALF = 0.5;
const DEFAULT_ALPHA = 0.2;

/** Per-model credit produced by computeCredit(). */
export interface ModelCredit {
  vendor: string;
  model: string;
  credit: number;
  /** Voter bonus that was applied. */
  voterBonus: number;
  /** Factuality factor that was applied (1.0 if no mentions). */
  factFactor: number;
  /** ok factor (1.0 success, 0.0 failure). */
  okFactor: number;
  /** True if model errored — credit is exactly 0. */
  failed: boolean;
}

export interface CreditDiff {
  vendor: string;
  model: string;
  credit: number;
  emaBefore: number;
  emaAfter: number;
  /** Number of observations BEFORE this update, useful for cold-start telemetry. */
  nBefore: number;
  failed: boolean;
}

export interface ApplyFromResultInput {
  /** The same ConsensusResult object the AIBridge already has. */
  result: ConsensusResultLike;
  /** Task type is the EMA bucketing key — same value used in feedback record(). */
  taskType: string;
  /** Override perf state path (tests). */
  perfStatePath?: string;
  /** Override EMA smoothing factor. Default 0.2. */
  alpha?: number;
  /** If false, computes diff but does NOT persist. Default true. */
  persist?: boolean;
}

export interface ApplyFromResultOutput {
  ok: boolean;
  taskType: string;
  applied: number;
  diffs: CreditDiff[];
  state: PerformanceState;
  perfStatePath: string;
  persisted: boolean;
  error: string | null;
}

export interface ApplyFromFeedInput {
  /** Override feed path (tests). Default env or shared feed. */
  feedPath?: string;
  /** Override cursor path. Default env or shared cursor. */
  cursorPath?: string;
  /** Override perf state path. */
  perfStatePath?: string;
  /** Override EMA alpha. */
  alpha?: number;
  /** Cap on lines to process in one batch. Default unlimited. */
  batchSize?: number;
  /** If false, computes counts but does NOT persist state or cursor. Default true. */
  persist?: boolean;
}

export interface CreditCursor {
  schemaVersion: string;
  feed_path: string;
  last_offset_bytes: number;
  last_ts: string | null;
  lines_processed: number;
}

export interface PerVendorTotals {
  observations: number;
  credit_sum: number;
  failures: number;
}

export interface ApplyFromFeedOutput {
  ok: boolean;
  feedPath: string;
  cursorPath: string;
  perfStatePath: string;
  /** Lines newly processed this invocation. */
  processed: number;
  /** Lines skipped (malformed JSON, missing fields). */
  skipped: number;
  /** Cursor reset because feed_path changed since last run. */
  cursorReset: boolean;
  cursor: CreditCursor;
  perVendor: Record<string, PerVendorTotals>;
  state: PerformanceState;
  persisted: boolean;
  error: string | null;
}

export class ConsensusNeuralCreditAssignmentEngine {
  private readonly perfEngine: ConsensusModelPerformanceEngine;

  constructor(perfEngine: ConsensusModelPerformanceEngine = consensusModelPerformanceEngine) {
    this.perfEngine = perfEngine;
  }

  /**
   * Pure: compute per-model credit for a single ConsensusResult-shaped
   * input. No I/O. Used by both online + batch paths.
   *
   * Models with non-finite latency / null answer are still credited normally
   * — the only signal that drops credit to 0 is `ok: false`.
   */
  computeCredit(result: ConsensusResultLike, globalReward: number): ModelCredit[] {
    if (!result || !Array.isArray(result.responses)) {
      return [];
    }
    // clamp01 handles NaN/±Infinity/out-of-range internally — don't pre-guard
    // with isFinite (that would map Infinity→0, which contradicts clamp-to-max).
    const reward = clamp01(globalReward);
    const voters = new Set(result.consensus?.voters ?? []);

    return result.responses.map((r) => {
      const failed = !r.ok;
      const okFactor = failed ? 0 : 1;
      const voterBonus = voters.has(r.model) ? VOTER_BONUS_FULL : VOTER_BONUS_HALF;

      const fc = result.factCheck?.[r.model];
      const factScore = fc && Number.isFinite(fc.factualityScore) ? fc.factualityScore : null;
      // No mentions = no information = no penalty (treat as 1.0 prior).
      const factFactor = factScore == null ? 1.0 : clamp01(factScore);

      const credit = clamp01(reward * voterBonus * factFactor * okFactor);

      return {
        vendor: r.vendor,
        model: r.model,
        credit: Number(credit.toFixed(6)),
        voterBonus,
        factFactor: Number(factFactor.toFixed(4)),
        okFactor,
        failed,
      };
    });
  }

  /**
   * Compute credit from a feed datum (already-stored training example).
   * Reconstructs a minimal ConsensusResultLike from the datum so we share
   * computeCredit() logic.
   */
  computeCreditFromDatum(datum: NeuralFeedDatum): ModelCredit[] {
    if (!datum || !Array.isArray(datum.models)) return [];
    const voters = new Set<string>();
    // Datum carries `in_consensus_voters` per-model — reconstruct the voter
    // set so computeCredit() can use the same voter-bonus path.
    for (const m of datum.models) {
      if (m.in_consensus_voters) voters.add(m.model);
    }

    const factCheck: Record<string, { totalMentions: number; verifiedMentions: number; factualityScore: number; hallucinations: never[] }> = {};
    for (const m of datum.models) {
      if (m.factuality_score != null && Number.isFinite(m.factuality_score)) {
        factCheck[m.model] = {
          totalMentions: 1,
          verifiedMentions: 0,
          factualityScore: m.factuality_score,
          hallucinations: [],
        };
      }
    }

    const synthetic: ConsensusResultLike = {
      ok: true,
      mode: "compare",
      responses: datum.models.map((m) => ({
        model: m.model,
        vendor: m.vendor,
        ok: m.ok,
        answer: "", // not needed for credit math
        latencyMs: m.latency_ms,
        tokens: m.tokens,
        error: m.ok ? null : "(reconstructed from feed)",
      })),
      successCount: datum.models.filter((m) => m.ok).length,
      agreementScore: datum.agreement_score,
      consensus: voters.size > 0
        ? { answer: "", voters: Array.from(voters), confidence: datum.agreement_score }
        : null,
      recommendation: datum.recommendation,
      totalLatencyMs: datum.total_latency_ms,
      factCheck,
    };

    return this.computeCredit(synthetic, datum.reward);
  }

  /**
   * Online path: called per consensus run from ConsensusAIBridgeEngine.
   * Reads perf state, applies one observation per vendor (failed models get
   * credit=0 which still gets recorded so unreliable vendors are tracked),
   * persists. Returns per-model diffs for telemetry.
   *
   * IMPORTANT: We deliberately DO record observations for failed models so
   * the EMA can learn they're unreliable. Skipping them would hide failures.
   */
  applyFromResult(input: ApplyFromResultInput): ApplyFromResultOutput {
    if (!input || !input.result) {
      return {
        ok: false,
        taskType: input?.taskType ?? "unknown",
        applied: 0,
        diffs: [],
        state: this.perfEngine.empty(),
        perfStatePath: input?.perfStatePath ?? DEFAULT_PERF_STATE_PATH,
        persisted: false,
        error: "input.result required",
      };
    }
    const taskType = (input.taskType ?? "untagged").trim() || "untagged";
    const alpha = input.alpha ?? DEFAULT_ALPHA;
    const persist = input.persist !== false;
    const perfStatePath = input.perfStatePath ?? DEFAULT_PERF_STATE_PATH;

    const globalReward = computeGlobalReward(input.result);
    const credits = this.computeCredit(input.result, globalReward);

    let state = this.perfEngine.loadState(perfStatePath);
    const diffs: CreditDiff[] = [];

    for (const c of credits) {
      const prev = state.vendors?.[c.vendor]?.tasks?.[taskType];
      const emaBefore = typeof prev?.ema === "number" && Number.isFinite(prev.ema) ? prev.ema : 0.5;
      const nBefore = typeof prev?.n === "number" && Number.isFinite(prev.n) ? prev.n : 0;

      try {
        state = this.perfEngine.applyObservation(state, c.vendor, taskType, c.credit, alpha);
      } catch (e) {
        // applyObservation rejects out-of-range — should never trip because
        // computeCredit() clamps. Defensive: skip this vendor and continue.
        diffs.push({
          vendor: c.vendor,
          model: c.model,
          credit: c.credit,
          emaBefore,
          emaAfter: emaBefore,
          nBefore,
          failed: c.failed,
        });
        continue;
      }
      const next = state.vendors?.[c.vendor]?.tasks?.[taskType];
      const emaAfter = typeof next?.ema === "number" ? next.ema : emaBefore;
      diffs.push({
        vendor: c.vendor,
        model: c.model,
        credit: c.credit,
        emaBefore: Number(emaBefore.toFixed(6)),
        emaAfter: Number(emaAfter.toFixed(6)),
        nBefore,
        failed: c.failed,
      });
    }

    let persisted = false;
    if (persist && diffs.length > 0) {
      try {
        this.perfEngine.saveState(state, perfStatePath);
        persisted = true;
      } catch (e) {
        return {
          ok: false,
          taskType,
          applied: diffs.length,
          diffs,
          state,
          perfStatePath,
          persisted: false,
          error: (e as Error).message,
        };
      }
    }

    return {
      ok: true,
      taskType,
      applied: diffs.length,
      diffs,
      state,
      perfStatePath,
      persisted,
      error: null,
    };
  }

  /**
   * Batch path: scan a JSONL feed from cursor onward and replay all new
   * data into perf state. Idempotent — re-running over an already-consumed
   * feed is a no-op.
   *
   * Failure modes:
   *   - Feed missing: returns ok=true, processed=0 (consistent w/ "nothing
   *     new"), with cursor unchanged.
   *   - Cursor missing: cold-start at offset 0.
   *   - Cursor feed_path mismatch: cursorReset=true, restart from offset 0.
   *   - JSONL parse error on a line: increments `skipped`, continues.
   *   - Datum missing required fields: increments `skipped`, continues.
   *   - applyObservation failure (out-of-range reward): logged in error
   *     summary, continues.
   */
  applyFromFeed(input: ApplyFromFeedInput = {}): ApplyFromFeedOutput {
    const feedPath = input.feedPath ?? DEFAULT_FEED_PATH;
    const cursorPath = input.cursorPath ?? DEFAULT_CURSOR_PATH;
    const perfStatePath = input.perfStatePath ?? DEFAULT_PERF_STATE_PATH;
    const alpha = input.alpha ?? DEFAULT_ALPHA;
    const persist = input.persist !== false;

    const cursor = this.loadCursor(cursorPath);
    const cursorReset = cursor.feed_path && cursor.feed_path !== feedPath ? true : false;
    if (cursorReset) {
      cursor.last_offset_bytes = 0;
      cursor.last_ts = null;
      cursor.feed_path = feedPath;
    } else if (!cursor.feed_path) {
      cursor.feed_path = feedPath;
    }

    if (!fs.existsSync(feedPath)) {
      return {
        ok: true,
        feedPath,
        cursorPath,
        perfStatePath,
        processed: 0,
        skipped: 0,
        cursorReset,
        cursor,
        perVendor: {},
        state: this.perfEngine.loadState(perfStatePath),
        persisted: false,
        error: null,
      };
    }

    let raw: string;
    try {
      const fileSize = fs.statSync(feedPath).size;
      // If the feed shrunk since the cursor was written (rotation, manual
      // truncation), reset to 0 — better to re-process than to over-jump.
      if (cursor.last_offset_bytes > fileSize) {
        cursor.last_offset_bytes = 0;
        cursor.last_ts = null;
      }
      const fd = fs.openSync(feedPath, "r");
      try {
        const remaining = Math.max(0, fileSize - cursor.last_offset_bytes);
        const buf = Buffer.alloc(remaining);
        if (remaining > 0) {
          fs.readSync(fd, buf, 0, remaining, cursor.last_offset_bytes);
        }
        raw = buf.toString("utf-8");
      } finally {
        fs.closeSync(fd);
      }
    } catch (e) {
      return {
        ok: false,
        feedPath,
        cursorPath,
        perfStatePath,
        processed: 0,
        skipped: 0,
        cursorReset,
        cursor,
        perVendor: {},
        state: this.perfEngine.loadState(perfStatePath),
        persisted: false,
        error: (e as Error).message,
      };
    }

    const lines = raw.split("\n");
    // Last element after split on trailing newline is empty string — drop.
    if (lines.length > 0 && lines[lines.length - 1].length === 0) lines.pop();

    const cap = input.batchSize && input.batchSize > 0 ? input.batchSize : Infinity;
    const toProcess = lines.slice(0, cap);

    let state = this.perfEngine.loadState(perfStatePath);
    const perVendor: Record<string, PerVendorTotals> = {};
    let processed = 0;
    let skipped = 0;
    let lastTs: string | null = cursor.last_ts;
    let bytesConsumed = 0;

    for (const line of toProcess) {
      // +1 for the trailing newline that .split removed.
      const lineBytes = Buffer.byteLength(line, "utf-8") + 1;
      bytesConsumed += lineBytes;

      let datum: NeuralFeedDatum;
      try {
        datum = JSON.parse(line);
      } catch {
        skipped++;
        continue;
      }
      if (!datum || !Array.isArray(datum.models) || typeof datum.task_type !== "string") {
        skipped++;
        continue;
      }
      const taskType = datum.task_type || "untagged";
      const credits = this.computeCreditFromDatum(datum);
      if (credits.length === 0) {
        skipped++;
        continue;
      }

      for (const c of credits) {
        try {
          state = this.perfEngine.applyObservation(state, c.vendor, taskType, c.credit, alpha);
        } catch {
          // out-of-range — should never trigger because computeCredit clamps.
          continue;
        }
        const v = perVendor[c.vendor] ?? { observations: 0, credit_sum: 0, failures: 0 };
        v.observations++;
        v.credit_sum += c.credit;
        if (c.failed) v.failures++;
        perVendor[c.vendor] = v;
      }

      processed++;
      lastTs = datum.ts;
    }

    // Even if a line was skipped (parse error), advance the cursor over it
    // so we don't loop on a bad line forever. bytesConsumed accumulates
    // ALL bytes including skipped lines.
    cursor.last_offset_bytes += bytesConsumed;
    cursor.last_ts = lastTs;
    cursor.lines_processed += processed;
    cursor.feed_path = feedPath;

    let persisted = false;
    if (persist && (processed > 0 || skipped > 0)) {
      try {
        if (processed > 0) this.perfEngine.saveState(state, perfStatePath);
        this.saveCursor(cursor, cursorPath);
        persisted = true;
      } catch (e) {
        return {
          ok: false,
          feedPath,
          cursorPath,
          perfStatePath,
          processed,
          skipped,
          cursorReset,
          cursor,
          perVendor,
          state,
          persisted: false,
          error: (e as Error).message,
        };
      }
    }

    return {
      ok: true,
      feedPath,
      cursorPath,
      perfStatePath,
      processed,
      skipped,
      cursorReset,
      cursor,
      perVendor: roundPerVendor(perVendor),
      state,
      persisted,
      error: null,
    };
  }

  /** Read the cursor; fail-open to a zero cursor if missing/malformed. */
  loadCursor(cursorPath?: string): CreditCursor {
    const target = cursorPath ?? DEFAULT_CURSOR_PATH;
    const empty: CreditCursor = {
      schemaVersion: SCHEMA_VERSION,
      feed_path: "",
      last_offset_bytes: 0,
      last_ts: null,
      lines_processed: 0,
    };
    try {
      if (!fs.existsSync(target)) return empty;
      const parsed = JSON.parse(fs.readFileSync(target, "utf-8"));
      if (!parsed || typeof parsed !== "object") return empty;
      return {
        schemaVersion: typeof parsed.schemaVersion === "string" ? parsed.schemaVersion : SCHEMA_VERSION,
        feed_path: typeof parsed.feed_path === "string" ? parsed.feed_path : "",
        last_offset_bytes:
          typeof parsed.last_offset_bytes === "number" && Number.isFinite(parsed.last_offset_bytes)
            ? Math.max(0, parsed.last_offset_bytes)
            : 0,
        last_ts: typeof parsed.last_ts === "string" ? parsed.last_ts : null,
        lines_processed:
          typeof parsed.lines_processed === "number" && Number.isFinite(parsed.lines_processed)
            ? Math.max(0, parsed.lines_processed)
            : 0,
      };
    } catch {
      return empty;
    }
  }

  /** Persist cursor atomically via temp+rename. */
  saveCursor(cursor: CreditCursor, cursorPath?: string): void {
    const target = cursorPath ?? DEFAULT_CURSOR_PATH;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cursor, null, 2) + "\n", "utf-8");
    try {
      fs.renameSync(tmp, target);
    } catch {
      try { fs.unlinkSync(target); } catch { /* ignore */ }
      fs.renameSync(tmp, target);
    }
  }
}

// ---- helpers ----

function clamp01(n: number): number {
  // NaN is genuinely undefined → fail-closed to 0 (no credit on no-signal).
  // Infinity is "above max" — standard clamp semantics map to 1.
  // -Infinity is "below min" — map to 0.
  if (Number.isNaN(n)) return 0;
  if (n === Number.POSITIVE_INFINITY || n > 1) return 1;
  if (n === Number.NEGATIVE_INFINITY || n < 0) return 0;
  return n;
}

const LATENCY_HALF_LIFE_MS = 60_000;

/**
 * Recompute the global reward from a ConsensusResultLike. Mirrors
 * ConsensusNeuralFeedbackEngine.scoreReward() so applyFromResult and the
 * recorded JSONL agree on the same value — important for replay parity.
 */
function computeGlobalReward(result: ConsensusResultLike): number {
  const recScore = result.recommendation === "accept"
    ? 1.0
    : result.recommendation === "review"
    ? 0.5
    : 0.1;
  const agreeScore = clamp01(result.agreementScore);
  const factVals = Object.values(result.factCheck ?? {})
    .map((f) => f.factualityScore)
    .filter((n) => Number.isFinite(n));
  const factScore =
    factVals.length === 0 ? 1.0 : factVals.reduce((a, b) => a + b, 0) / factVals.length;
  const latencyPen = Math.exp(-result.totalLatencyMs / LATENCY_HALF_LIFE_MS);
  return clamp01(recScore * agreeScore * factScore * latencyPen);
}

function roundPerVendor(p: Record<string, PerVendorTotals>): Record<string, PerVendorTotals> {
  const out: Record<string, PerVendorTotals> = {};
  for (const [k, v] of Object.entries(p)) {
    out[k] = {
      observations: v.observations,
      credit_sum: Number(v.credit_sum.toFixed(6)),
      failures: v.failures,
    };
  }
  return out;
}

export const consensusNeuralCreditAssignmentEngine = new ConsensusNeuralCreditAssignmentEngine();
