/**
 * ConsensusAIBridgeEngine — adapter that lets PRISM AI orchestration engines
 * route through the multi-model consensus system as if it were a single
 * deep-reasoning engine.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / LAYER-3-AI-BRIDGE.
 *
 * Why this exists
 * ---------------
 * PRISM has 3046 engines. Many delegate "reasoning" or "decision" steps to
 * `AutonomousAIOrchestrationEngine`, `AISystemSynchronizerEngine`,
 * `AICapabilityMaximizerEngine`, etc. Those engines historically called a
 * single LLM (Claude). We want them to optionally route their reasoning
 * step through the 4-way consensus pipeline so:
 *
 *   - hallucinations get caught before they propagate into a roadmap
 *     or engine generation step
 *   - high-stakes decisions (architecture, refactor, safety) get 4 votes
 *   - the result is automatically persisted to the wiki second-brain
 *   - the result is automatically fed into the neural training feed
 *
 * Design
 * ------
 * Standalone adapter — does NOT modify orchestrator internals. Orchestrators
 * call `consensusAIBridgeEngine.reason(...)` when they want a 4-way vote.
 * Caller specifies the "task type" (plan/build/review/decide) which lets
 * the bridge pick the right model tier + budget.
 *
 * The bridge does THREE things:
 *   1. Recall cache check — short-circuit if we already answered this prompt
 *   2. Live fan-out via MultiModelConsensusEngine
 *   3. Project the ConsensusResult into the AI orchestrator's
 *      ExecutionStep shape so the caller can drop it straight into its
 *      `steps[]` array.
 *
 * Pure orchestrator. No new I/O beyond what MultiModelConsensusEngine,
 * recall cache, and persistence engine already do.
 *
 * @module engines/ConsensusAIBridgeEngine
 */

import { multiModelConsensusEngine, type ConsensusResult, type ConsensusInput } from "./MultiModelConsensusEngine.js";
import { consensusRecallCacheEngine, type CachedConsensus } from "./ConsensusRecallCacheEngine.js";
import { consensusNeuralFeedbackEngine } from "./ConsensusNeuralFeedbackEngine.js";

export type AITaskType =
  | "plan"        // architecture / roadmap planning — requires deep reasoning
  | "build"       // code generation
  | "review"      // PR review / scrutinize
  | "decide"      // single decision (yes/no, choose-from-options)
  | "explain"     // synthesize an explanation
  | "extract"     // extract structured data from unstructured text
  | "validate";   // validate a claim against ground-truth

export interface AIBridgeRequest {
  /** Free-form task / prompt for the consensus to reason about. */
  prompt: string;
  /** Task type — controls model tier + budget. Default "decide". */
  taskType?: AITaskType;
  /** Optional list of vote options if taskType is "decide" or "validate". */
  voteOptions?: readonly string[];
  /** Calling AI engine (for telemetry). e.g. "AutonomousAIOrchestrationEngine". */
  caller?: string;
  /** Skip the recall cache and force live fan-out. Default false. */
  forceLive?: boolean;
  /** Override timeout per model. Default 90s. */
  timeoutMs?: number;
  /** Forwarded to consensus engine — see ConsensusInput. */
  prismContext?: boolean;
  /** Forwarded — Claude is included by default; set false when caller IS Claude. */
  includeClaude?: boolean;
}

export interface AIBridgeStep {
  /** Maps onto AutonomousAIOrchestrationEngine.ExecutionStep. */
  type: "engine";
  resource: "ConsensusAIBridgeEngine";
  action: "reason";
  input: { prompt: string; taskType: AITaskType; caller: string };
  output: {
    answer: string | null;
    recommendation: "accept" | "review" | "escalate";
    voters: string[];
    voterCount: number;
    agreementScore: number;
    cached: boolean;
    promptHash: string;
    sha8: string;
    reward: number;
    factualityScore: number | null;
    hallucinationCount: number;
  };
  status: "completed" | "failed" | "escalated";
  duration_ms: number;
  confidence: number;
  reasoning: string;
}

const TASK_TIER_DEFAULTS: Record<AITaskType, { codexEffort: ConsensusInput["codexEffort"]; ollamaModel: string; timeoutMs: number }> = {
  plan:     { codexEffort: "xhigh",  ollamaModel: "qwen2.5-coder:32b",      timeoutMs: 180_000 },
  build:    { codexEffort: "high",   ollamaModel: "qwen2.5-coder:32b",      timeoutMs: 120_000 },
  review:   { codexEffort: "high",   ollamaModel: "qwen2.5-coder:32b",      timeoutMs: 120_000 },
  decide:   { codexEffort: "medium", ollamaModel: "qwen2.5-coder:32b",    timeoutMs: 60_000 },
  explain:  { codexEffort: "medium", ollamaModel: "qwen2.5-coder:32b",    timeoutMs: 90_000 },
  extract:  { codexEffort: "low",    ollamaModel: "qwen2.5-coder:32b",    timeoutMs: 45_000 },
  validate: { codexEffort: "medium", ollamaModel: "qwen2.5-coder:32b",      timeoutMs: 60_000 },
};

const HIGH_CONFIDENCE_THRESHOLD = 0.7;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.4;

export class ConsensusAIBridgeEngine {
  /**
   * Reason via consensus and project the result into an AI ExecutionStep.
   * Cache-first: if a recent persisted artifact exists for this exact
   * prompt, return it without re-fanning out. Otherwise live fan-out via
   * MultiModelConsensusEngine, then return the projected step.
   */
  async reason(req: AIBridgeRequest): Promise<AIBridgeStep> {
    this.validate(req);
    const start = Date.now();
    const taskType: AITaskType = req.taskType ?? "decide";
    const caller = req.caller ?? "unknown";
    const tier = TASK_TIER_DEFAULTS[taskType];

    // 1. Cache check — saves $0.30+ per hit
    if (!req.forceLive) {
      const cached = consensusRecallCacheEngine.recall(req.prompt);
      if (cached !== null) {
        return this.projectCached(cached, req.prompt, taskType, caller, Date.now() - start);
      }
    }

    // 2. Live fan-out
    const consensusInput: ConsensusInput = {
      prompt: req.prompt,
      taskType,
      sourceSession: process.env.CLAUDE_SESSION_ID,
      includeClaude: req.includeClaude,
      timeoutMs: req.timeoutMs ?? tier.timeoutMs,
      codexEffort: tier.codexEffort,
      ollamaModel: tier.ollamaModel,
      prismContext: req.prismContext,
      mode: req.voteOptions && req.voteOptions.length > 0 ? "vote" : "compare",
      voteOptions: req.voteOptions,
      persist: true, // bridge always persists — that's the whole point
    };

    let result: ConsensusResult;
    try {
      result = await multiModelConsensusEngine.ask(consensusInput);
    } catch (e) {
      return this.projectFailure(req.prompt, taskType, caller, Date.now() - start, (e as Error).message);
    }

    // 3. Feed neural feedback (fire-and-forget — failure swallowed)
    try {
      consensusNeuralFeedbackEngine.record({
        prompt: req.prompt,
        taskType,
        sourceSession: process.env.CLAUDE_SESSION_ID,
        result,
      });
    } catch {
      // never let feed write break orchestration
    }

    return this.projectLive(result, req.prompt, taskType, caller, Date.now() - start);
  }

  // ---- projections into AI ExecutionStep shape ----

  private projectCached(c: CachedConsensus, prompt: string, taskType: AITaskType, caller: string, durationMs: number): AIBridgeStep {
    const reward = consensusRecallCacheEngine.scoreCached(c);
    const fact = c.meanFactuality;
    const status: AIBridgeStep["status"] = c.recommendation === "accept" ? "completed"
      : c.recommendation === "review" ? "completed"
      : "escalated";
    return {
      type: "engine",
      resource: "ConsensusAIBridgeEngine",
      action: "reason",
      input: { prompt, taskType, caller },
      output: {
        answer: c.answer,
        recommendation: c.recommendation,
        voters: c.modelVoters,
        voterCount: c.modelVoters.length,
        agreementScore: c.agreementScore,
        cached: true,
        promptHash: c.promptHash,
        sha8: c.sha8,
        reward,
        factualityScore: fact,
        hallucinationCount: 0, // not tracked in cache; recompute would need parse pass
      },
      status,
      duration_ms: durationMs,
      confidence: this.confidenceFor(c.agreementScore),
      reasoning: `cache-hit (age ${Math.floor(c.ageMs / 1000)}s) — recommendation=${c.recommendation}, agreement=${c.agreementScore}`,
    };
  }

  private projectLive(result: ConsensusResult, prompt: string, taskType: AITaskType, caller: string, durationMs: number): AIBridgeStep {
    const { reward } = consensusNeuralFeedbackEngine.scoreReward(result);
    const factVals = Object.values(result.factCheck ?? {})
      .map((f) => f.factualityScore)
      .filter((n) => Number.isFinite(n));
    const meanFact = factVals.length === 0 ? null : Number((factVals.reduce((a, b) => a + b, 0) / factVals.length).toFixed(3));
    const hallTotal = Object.values(result.factCheck ?? {})
      .reduce((sum, f) => sum + (f.hallucinations?.length ?? 0), 0);

    const status: AIBridgeStep["status"] = result.successCount === 0 ? "failed"
      : result.recommendation === "escalate" ? "escalated"
      : "completed";

    return {
      type: "engine",
      resource: "ConsensusAIBridgeEngine",
      action: "reason",
      input: { prompt, taskType, caller },
      output: {
        answer: result.consensus?.answer ?? null,
        recommendation: result.recommendation,
        voters: result.consensus?.voters ?? [],
        voterCount: result.consensus?.voters.length ?? 0,
        agreementScore: result.agreementScore,
        cached: false,
        promptHash: consensusNeuralFeedbackEngine.hashPrompt(prompt),
        sha8: consensusNeuralFeedbackEngine.hashPrompt(prompt).slice(0, 8),
        reward,
        factualityScore: meanFact,
        hallucinationCount: hallTotal,
      },
      status,
      duration_ms: durationMs,
      confidence: this.confidenceFor(result.agreementScore),
      reasoning: `live fan-out · ${result.successCount}/${result.responses.length} models ok · agreement=${result.agreementScore} · ${hallTotal} hallucination(s)`,
    };
  }

  private projectFailure(prompt: string, taskType: AITaskType, caller: string, durationMs: number, error: string): AIBridgeStep {
    return {
      type: "engine",
      resource: "ConsensusAIBridgeEngine",
      action: "reason",
      input: { prompt, taskType, caller },
      output: {
        answer: null,
        recommendation: "escalate",
        voters: [],
        voterCount: 0,
        agreementScore: 0,
        cached: false,
        promptHash: consensusNeuralFeedbackEngine.hashPrompt(prompt),
        sha8: consensusNeuralFeedbackEngine.hashPrompt(prompt).slice(0, 8),
        reward: 0,
        factualityScore: null,
        hallucinationCount: 0,
      },
      status: "failed",
      duration_ms: durationMs,
      confidence: 0,
      reasoning: `consensus failed: ${error}`,
    };
  }

  // ---- helpers ----

  private confidenceFor(agreement: number): number {
    if (agreement >= HIGH_CONFIDENCE_THRESHOLD) return 0.9;
    if (agreement >= MEDIUM_CONFIDENCE_THRESHOLD) return 0.6;
    return 0.3;
  }

  private validate(req: AIBridgeRequest): void {
    if (!req || typeof req !== "object") throw new Error("AIBridgeRequest required");
    if (typeof req.prompt !== "string" || req.prompt.length === 0) {
      throw new Error("prompt must be a non-empty string");
    }
  }
}

export const consensusAIBridgeEngine = new ConsensusAIBridgeEngine();
