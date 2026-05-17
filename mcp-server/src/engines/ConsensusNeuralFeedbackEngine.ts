/**
 * ConsensusNeuralFeedbackEngine — record every consensus run as a training
 * datum for downstream LoRA fine-tuning + reinforcement learning.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-NEURAL-FEED.
 *
 * Why this exists
 * ---------------
 * Each consensus run is rich training signal: the prompt, what each model
 * said, who agreed with whom, factuality scores, latency, recommendation.
 * If we throw that away, we can't ever learn to:
 *   - skip the slow models when fast ones suffice (latency optimization)
 *   - down-weight a model on domains where it consistently hallucinates
 *   - up-weight a model whose answer matches the eventual ground-truth
 *
 * This engine appends one JSONL line per consensus run to:
 *   `state/shared/CONSENSUS_NEURAL_FEED.jsonl`
 *
 * Each line is a self-contained training example with:
 *   - prompt_hash (key for joining with future ground-truth labels)
 *   - prompt (raw text, capped at 4KB)
 *   - per-model: model, vendor, ok, latency, tokens, factuality, jaccard_to_consensus
 *   - reward (composite score, [0,1])
 *   - timestamp
 *
 * Reward formula
 * --------------
 * Composite of three signals:
 *   - rec_score:    accept=1.0, review=0.5, escalate=0.1
 *   - agree_score:  agreementScore clamped to [0,1]
 *   - fact_score:   mean factuality across models with mentions; 1.0 if no mentions
 *   - latency_pen:  exp(-totalLatencyMs / 60000) — 60s half-life
 *   reward = rec_score * agree_score * fact_score * latency_pen
 *
 * The reward is stored alongside per-model contributions so a future LoRA
 * trainer can do credit assignment (which model deserved how much of the
 * reward).
 *
 * Pure append. Atomic via temp+rename. Append-only file — never rewritten.
 *
 * @module engines/ConsensusNeuralFeedbackEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

import { feedbackBusEngine, type SubscriptionHandle } from "./FeedbackBusEngine.js";
import { CONSENSUS_COMPLETED_TOPIC } from "./MultiModelConsensusEngine.js";

/**
 * Bus topic broadcast after every successful `record()` (NOT on dedup or error).
 * NN-STACK-INTEG-MS0/U-NN-INTEG-03+05.
 *
 * Payload shape:
 * ```
 * {
 *   prompt_hash:    string;  // sha256 of normalized prompt — joins to NeuralFeedDatum
 *   reward:         number;  // composite [0,1]
 *   task_type:      string;
 *   source_session: string;
 *   ts:             string;  // ISO timestamp
 *   feedPath:       string;  // where the JSONL line landed (operator forensic)
 * }
 * ```
 */
export const NEURAL_FEEDBACK_RECORDED_TOPIC = "neural.consensus.feedback";

export interface NeuralFeedInput {
  prompt: string;
  taskType?: string;
  sourceSession?: string;
  result: ConsensusResultLike;
  /** Override feed file path (tests). Default env or state/shared/CONSENSUS_NEURAL_FEED.jsonl. */
  feedPath?: string;
}

export interface ConsensusResultLike {
  ok: boolean;
  mode: "compare" | "vote";
  responses: Array<{
    model: string;
    vendor: string;
    ok: boolean;
    answer: string;
    latencyMs: number;
    tokens: number | null;
    error: string | null;
  }>;
  successCount: number;
  agreementScore: number;
  consensus: { answer: string; voters: string[]; confidence: number } | null;
  recommendation: "accept" | "review" | "escalate";
  totalLatencyMs: number;
  factCheck: Record<string, { totalMentions: number; verifiedMentions: number; factualityScore: number; hallucinations: Array<{ kind: string; mention: string; closestMatch: string | null; modelName: string }> }>;
}

export interface NeuralFeedDatum {
  schema_version: string;
  ts: string;
  prompt_hash: string;
  prompt: string;
  task_type: string;
  source_session: string;
  recommendation: "accept" | "review" | "escalate";
  agreement_score: number;
  total_latency_ms: number;
  reward: number;
  reward_components: {
    rec_score: number;
    agree_score: number;
    fact_score: number;
    latency_penalty: number;
  };
  models: Array<{
    model: string;
    vendor: string;
    ok: boolean;
    latency_ms: number;
    tokens: number | null;
    factuality_score: number | null;
    hallucination_count: number;
    in_consensus_voters: boolean;
    answer_chars: number;
  }>;
}

export interface FeedResult {
  ok: boolean;
  feedPath: string;
  promptHash: string;
  reward: number;
  bytesWritten: number;
  error: string | null;
  /**
   * True when the call short-circuited because the same prompt was recorded
   * within `DEDUP_TTL_MS`. No JSONL line was appended, no bus event was
   * published. The bridge-imperative call (ConsensusAIBridgeEngine.reason)
   * + the CONSENSUS_COMPLETED_TOPIC subscriber both pass through `record()`,
   * so without this guard the same consensus would be recorded TWICE.
   * NN-STACK-INTEG-MS0/U-NN-INTEG-03+05.
   */
  deduped?: boolean;
}

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_FEED_PATH = process.env.CONSENSUS_NEURAL_FEED ?? "H:/prism/state/shared/CONSENSUS_NEURAL_FEED.jsonl";
const PROMPT_CAP_BYTES = 4096;
const LATENCY_HALF_LIFE_MS = 60_000;
/**
 * Prompt-hash dedup TTL. If the same prompt is record()'d again within this
 * window, the call is a no-op. Set to 60s because the bridge-imperative call
 * and the bus subscriber typically arrive within microseconds of each other;
 * 60s is a healthy safety margin against operator double-clicks.
 * Knob: PRISM_NN_FEED_DEDUP_TTL_MS overrides (set to 0 to disable dedup).
 */
const DEDUP_TTL_MS = Number.parseInt(process.env.PRISM_NN_FEED_DEDUP_TTL_MS ?? "60000", 10);

export class ConsensusNeuralFeedbackEngine {
  /**
   * Last-record timestamps per prompt-hash, for the dedup window. Cleared
   * lazily on every record() call (entries older than DEDUP_TTL_MS are
   * dropped) — pure in-process map, no IO, no growth-unbounded risk under
   * normal use because old entries age out on every visit.
   */
  private readonly recentHashes: Map<string, number> = new Map();

  /**
   * Append one training datum for the given consensus run. Returns the path
   * + reward + bytes-written. Never throws — all errors surface in the
   * returned `error` field so a fire-and-forget caller can drop the result.
   *
   * **Dedup contract**: the same prompt-hash within `DEDUP_TTL_MS` is a no-op
   * — no JSONL write, no bus publish. This protects against the dual-arrival
   * pattern where the bridge imperative call (ConsensusAIBridgeEngine.reason)
   * AND the CONSENSUS_COMPLETED_TOPIC subscriber both call record() with the
   * same payload. Without this, every consensus would be recorded twice.
   * NN-STACK-INTEG-MS0/U-NN-INTEG-03+05.
   *
   * **Bus contract**: on every SUCCESSFUL append (not on dedup, not on
   * buildDatum error, not on appendFile error), the engine publishes
   * `NEURAL_FEEDBACK_RECORDED_TOPIC` so downstream learners (a future LoRA
   * trainer trigger, the live dashboard) get notified without polling.
   * The publish is fire-and-forget under the same contract as the persist
   * + consensus.completed blocks — a bus error never fails a successful
   * record. Gated by `PRISM_NN_INTEG_DISABLE=1`.
   */
  record(input: NeuralFeedInput): FeedResult {
    const feedPath = input.feedPath ?? DEFAULT_FEED_PATH;
    const promptHash = this.hashPrompt(input.prompt);

    // Dedup gate — short-circuit if this prompt was recorded within the TTL.
    // Disabled when DEDUP_TTL_MS <= 0 (operator override for tests / replay).
    if (DEDUP_TTL_MS > 0) {
      const now = Date.now();
      const prev = this.recentHashes.get(promptHash);
      if (prev !== undefined && now - prev < DEDUP_TTL_MS) {
        return { ok: true, feedPath, promptHash, reward: 0, bytesWritten: 0, error: null, deduped: true };
      }
      // Opportunistic GC — drop entries older than the TTL so the map stays
      // bounded across long-running sessions. O(map.size) per call is fine
      // for the expected scale (consensus runs are seconds-apart, not ms).
      if (this.recentHashes.size > 0) {
        for (const [h, t] of this.recentHashes) {
          if (now - t >= DEDUP_TTL_MS) this.recentHashes.delete(h);
        }
      }
    }

    let datum: NeuralFeedDatum;
    try {
      datum = this.buildDatum(input, promptHash);
    } catch (e) {
      return { ok: false, feedPath, promptHash, reward: 0, bytesWritten: 0, error: (e as Error).message };
    }

    const line = JSON.stringify(datum) + "\n";

    try {
      fs.mkdirSync(path.dirname(feedPath), { recursive: true });
      fs.appendFileSync(feedPath, line, "utf-8");

      // Stamp dedup map AFTER successful write — a failed write should NOT
      // dedup the next attempt (otherwise a transient disk error silently
      // drops a follow-up record).
      if (DEDUP_TTL_MS > 0) this.recentHashes.set(promptHash, Date.now());

      // Fire-and-forget broadcast. Same contract as MultiModelConsensusEngine's
      // consensus.completed publish: bus errors swallowed; disable knob
      // PRISM_NN_INTEG_DISABLE=1 reverts to pre-integration behavior.
      if (process.env.PRISM_NN_INTEG_DISABLE !== "1") {
        try {
          feedbackBusEngine.publish(NEURAL_FEEDBACK_RECORDED_TOPIC, {
            prompt_hash: promptHash,
            reward: datum.reward,
            task_type: datum.task_type,
            source_session: datum.source_session,
            ts: datum.ts,
            feedPath,
          });
        } catch {
          // swallowed — fire-and-forget contract
        }
      }

      return { ok: true, feedPath, promptHash, reward: datum.reward, bytesWritten: line.length, error: null };
    } catch (e) {
      return { ok: false, feedPath, promptHash, reward: datum.reward, bytesWritten: 0, error: (e as Error).message };
    }
  }

  /**
   * Clear the in-process dedup state. Tests use this to exercise back-to-back
   * record() calls with the same prompt without waiting out the TTL window.
   */
  resetDedup(): void {
    this.recentHashes.clear();
  }

  /**
   * Compute the composite reward for a ConsensusResult without writing
   * anything. Used by the router to decide whether to surface a cached
   * result or re-fan-out.
   */
  scoreReward(result: ConsensusResultLike): { reward: number; components: NeuralFeedDatum["reward_components"] } {
    const recScore = result.recommendation === "accept" ? 1.0 : result.recommendation === "review" ? 0.5 : 0.1;
    const agreeScore = Math.max(0, Math.min(1, result.agreementScore));
    const factVals = Object.values(result.factCheck ?? {})
      .map((f) => f.factualityScore)
      .filter((n) => Number.isFinite(n));
    const factScore = factVals.length === 0
      ? 1.0
      : factVals.reduce((a, b) => a + b, 0) / factVals.length;
    const latencyPenalty = Math.exp(-result.totalLatencyMs / LATENCY_HALF_LIFE_MS);
    const reward = Number((recScore * agreeScore * factScore * latencyPenalty).toFixed(4));
    return {
      reward,
      components: {
        rec_score: recScore,
        agree_score: Number(agreeScore.toFixed(4)),
        fact_score: Number(factScore.toFixed(4)),
        latency_penalty: Number(latencyPenalty.toFixed(4)),
      },
    };
  }

  /**
   * Read the last N data points from the feed for online learning probes
   * and dashboard rendering. Streams the file and parses only the tail.
   */
  recent(n: number = 50, feedPath?: string): NeuralFeedDatum[] {
    const target = feedPath ?? DEFAULT_FEED_PATH;
    if (!fs.existsSync(target)) return [];
    const raw = fs.readFileSync(target, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    const tail = lines.slice(-n);
    const out: NeuralFeedDatum[] = [];
    for (const l of tail) {
      try {
        out.push(JSON.parse(l));
      } catch {
        continue;
      }
    }
    return out;
  }

  hashPrompt(prompt: string): string {
    const normalized = (prompt ?? "").trim().replace(/\s+/g, " ");
    return createHash("sha256").update(normalized, "utf-8").digest("hex");
  }

  // ---- internals ----

  private buildDatum(input: NeuralFeedInput, promptHash: string): NeuralFeedDatum {
    if (typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
    if (!input.result || !Array.isArray(input.result.responses)) {
      throw new Error("result.responses must be an array");
    }
    const { reward, components } = this.scoreReward(input.result);
    const voters = new Set(input.result.consensus?.voters ?? []);
    const cappedPrompt = input.prompt.length > PROMPT_CAP_BYTES
      ? input.prompt.slice(0, PROMPT_CAP_BYTES) + "...[truncated]"
      : input.prompt;

    const models: NeuralFeedDatum["models"] = input.result.responses.map((r) => {
      const fc = input.result.factCheck?.[r.model];
      const fact = fc && Number.isFinite(fc.factualityScore) ? Number(fc.factualityScore) : null;
      return {
        model: r.model,
        vendor: r.vendor,
        ok: r.ok,
        latency_ms: r.latencyMs,
        tokens: r.tokens,
        factuality_score: fact,
        hallucination_count: fc ? (fc.hallucinations?.length ?? 0) : 0,
        in_consensus_voters: voters.has(r.model),
        answer_chars: r.answer ? r.answer.length : 0,
      };
    });

    return {
      schema_version: SCHEMA_VERSION,
      ts: new Date().toISOString(),
      prompt_hash: promptHash,
      prompt: cappedPrompt,
      task_type: input.taskType ?? "untagged",
      source_session: input.sourceSession ?? "unknown",
      recommendation: input.result.recommendation,
      agreement_score: input.result.agreementScore,
      total_latency_ms: input.result.totalLatencyMs,
      reward,
      reward_components: components,
      models,
    };
  }
}

export const consensusNeuralFeedbackEngine = new ConsensusNeuralFeedbackEngine();

/**
 * Module-level subscription that wires this engine to MultiModelConsensusEngine's
 * `consensus.completed` topic. Lives outside the class so test instances created
 * via `new ConsensusNeuralFeedbackEngine()` do NOT auto-subscribe — only the
 * singleton wires itself to the global bus. Tests subscribe manually if needed.
 *
 * Disable knob: `PRISM_NN_INTEG_DISABLE=1` short-circuits both publish (in
 * MultiModelConsensusEngine) AND this subscription, reverting the stack to its
 * pre-integration behavior. NN-STACK-INTEG-MS0/U-NN-INTEG-03+05.
 *
 * The handle is exported for explicit teardown in long-lived test harnesses
 * (vitest hot-reload, e.g.) — production code should never unsubscribe.
 */
export const consensusBusSubscriptionHandle: SubscriptionHandle | null =
  process.env.PRISM_NN_INTEG_DISABLE === "1"
    ? null
    : feedbackBusEngine.subscribe(CONSENSUS_COMPLETED_TOPIC, (event) => {
        const payload = event.payload as {
          prompt: string;
          taskType?: string;
          sourceSession?: string;
          result: ConsensusResultLike;
        } | null;
        if (!payload || typeof payload.prompt !== "string" || !payload.result) {
          // Hostile-payload class: the bus accepts `unknown` payloads, so an
          // unrelated publisher (or a future schema-evolving caller) could
          // emit a malformed event on this topic. Treat anything that fails
          // shape-check as a silent skip — never throw, never partially record.
          return;
        }
        // The bridge-imperative path will ALSO call record(); the dedup gate
        // inside record() ensures only one JSONL line + one bus publish per
        // (prompt-hash, 60s) window. So this subscriber is idempotent with
        // respect to the imperative path.
        consensusNeuralFeedbackEngine.record({
          prompt: payload.prompt,
          taskType: payload.taskType,
          sourceSession: payload.sourceSession,
          result: payload.result,
        });
      });
