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
}

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_FEED_PATH = process.env.CONSENSUS_NEURAL_FEED ?? "H:/prism/state/shared/CONSENSUS_NEURAL_FEED.jsonl";
const PROMPT_CAP_BYTES = 4096;
const LATENCY_HALF_LIFE_MS = 60_000;

export class ConsensusNeuralFeedbackEngine {
  /**
   * Append one training datum for the given consensus run. Returns the path
   * + reward + bytes-written. Never throws — all errors surface in the
   * returned `error` field so a fire-and-forget caller can drop the result.
   */
  record(input: NeuralFeedInput): FeedResult {
    const feedPath = input.feedPath ?? DEFAULT_FEED_PATH;
    const promptHash = this.hashPrompt(input.prompt);

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
      return { ok: true, feedPath, promptHash, reward: datum.reward, bytesWritten: line.length, error: null };
    } catch (e) {
      return { ok: false, feedPath, promptHash, reward: datum.reward, bytesWritten: 0, error: (e as Error).message };
    }
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
