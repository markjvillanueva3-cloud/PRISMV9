/**
 * OpusFastMaxAgentSpecEngine -- U-ALPHA-HERMES-GRAPH-IMPROVE (slot:alpha).
 *
 * THE GAP IT CLOSES.
 *   The Hermes parallel fan-out chain (HermesParallelFanoutPlannerEngine ->
 *   ZuluWaveSchedulerEngine -> HermesAutonomousDriverEngine) is built + dispatcher-
 *   wired, but its budget envelope (HermesParallelBudgetEnvelopeEngine) is sized
 *   for SONNET subagents ONLY. The operator now runs a Claude MAX subscription and
 *   wants parallel hermes agents at "maxed out opus fast max settings" -- a model +
 *   effort + parallelism contract that did not exist as a first-class spec.
 *
 * WHAT THIS ADDS (and ONLY this -- it forks nothing).
 *   1. A canonical per-agent spec: opus-fast-max = { model: "opus", effort: "max",
 *      fastMode: true } -- the exact agent settings the operator named.
 *   2. A per-tier ABSOLUTE token cost table DERIVED from the Sonnet baseline by the
 *      OpusCapabilityEngine inter-tier RATIO (opus = 15/3 = 5x sonnet). No new magic
 *      multiplier: a single source of truth (MODEL_COSTS) drives every tier.
 *   3. buildAgentSpecs() -- a multi-model fleet of N parallel agents ("different
 *      parallel hermes agents"): default all opus-fast-max, optional tier mix.
 *   4. planParallelism() -- composes HermesParallelBudgetEnvelopeEngine with the
 *      opus cost table to answer "how many opus-fast-max agents fit my budget?",
 *      degrading gracefully (max_parallel_fits) instead of refusing the whole fan-out.
 *
 * PURE: no I/O, no agent-spawning. The risky half (actually spawning the agents)
 * lives in the gated consumer (the graph-improvement driver / a Workflow). This
 * engine only DESCRIBES the agents + sizes the budget, so it is fully testable.
 *
 * Karpathy discipline:
 *   CLASSIFY: spec-construction (pure) + budget composition (delegates to the
 *     proven envelope engine).
 *   TECHNIQUE: derive the opus table from the Sonnet baseline x tier ratio; reuse
 *     the envelope engine's largest-prefix-that-fits walk rather than re-deriving.
 *   EDGE CASES: count<1 / tier-unknown -> schema reject; budget 0 -> 0 fit;
 *     haiku sub-unit cost -> rounded integer >= 0; desired > 20 -> schema reject.
 *   FAILURE MODES: an unknown tier can never reach the cost math (z.enum gate).
 *
 * @module engines/OpusFastMaxAgentSpecEngine
 */

import { z } from "zod";
import { MODEL_COSTS, type ModelTier } from "./OpusCapabilityEngine.js";
import {
  HermesParallelBudgetEnvelopeEngine,
  SONNET_COST_BY_SIZE,
  type SizeHint,
  type CostTable,
  type BudgetVerdict,
} from "./HermesParallelBudgetEnvelopeEngine.js";

// ---------------------------------------------------------------------------
// Schemas + types
// ---------------------------------------------------------------------------

/** Reasoning-effort levels -- mirror the Agent/Workflow tool `effort` enum exactly. */
export const EffortLevelSchema = z.enum(["low", "medium", "high", "xhigh", "max"]);
export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const ModelTierSchema = z.enum(["haiku", "sonnet", "opus"]);

/** A single parallel-agent spec: the model + effort + fast-mode the spawner applies. */
export interface AgentSpec {
  /** Model tier -- "opus" for the maxed-out lane. */
  model: ModelTier;
  /** Reasoning effort -- "max" for the maxed-out lane. */
  effort: EffortLevel;
  /** Fast mode (Claude Code faster-output Opus). Session-level toggle; carried as intent. */
  fastMode: boolean;
  /** Optional human label for the agent (e.g. the subtask/galaxy it serves). */
  label?: string;
  /** Why this spec (the lane it represents). */
  rationale: string;
}

export const OpusParallelismRequestSchema = z.object({
  /** Remaining token budget the fan-out must fit inside. */
  remaining_budget_tokens: z.number().int().min(0).max(10_000_000),
  /** How many parallel agents the caller WANTS (the "drastically increase" lever). */
  desired_agents: z.number().int().min(1).max(20),
  /** Model tier for every agent in this fan-out. Default opus (the operator's ask). */
  tier: ModelTierSchema.default("opus"),
  /** Per-agent size hint -> drives the cost table lookup. Default medium. */
  size_hint: z.enum(["short", "medium", "large"]).default("medium"),
  /** Reasoning effort for every agent. Default max. */
  effort: EffortLevelSchema.default("max"),
  /** Fast mode for every agent. Default true. */
  fast_mode: z.boolean().default(true),
  /** Reserve a fraction of budget for the parent's post-aggregation. */
  parent_reserve_pct: z.number().min(0).max(0.5).optional(),
});
/** Output (post-default) shape -- all fields resolved. */
export type OpusParallelismRequest = z.infer<typeof OpusParallelismRequestSchema>;
/** Input shape -- defaulted fields (tier/size_hint/effort/fast_mode) are optional for callers. */
export type OpusParallelismInput = z.input<typeof OpusParallelismRequestSchema>;

export interface ParallelismPlan {
  /** The per-agent spec every recommended agent shares. */
  spec: AgentSpec;
  /** The tier cost table used to size the budget. */
  cost_table: CostTable;
  /** Number of agents the caller asked for. */
  desired_agents: number;
  /** Largest count that fits the budget (<= desired_agents). The number to actually spawn. */
  recommended_parallel: number;
  /** Full budget verdict from the envelope engine (within | over | refused). */
  verdict: BudgetVerdict;
  /** Why the recommendation was capped (budget vs request). */
  cap_reason: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class OpusFastMaxAgentSpecEngine {
  /**
   * The canonical "maxed out opus fast max" per-agent spec -- the exact settings
   * the operator named for each parallel hermes agent.
   *
   * @param label optional label (e.g. the subtask/galaxy the agent serves)
   * @returns the opus-fast-max AgentSpec
   */
  static opusFastMaxSpec(label?: string): AgentSpec {
    return {
      model: "opus",
      effort: "max",
      fastMode: true,
      ...(label ? { label } : {}),
      rationale: "operator MAX-tier: opus + max reasoning effort + fast mode",
    };
  }

  /**
   * Absolute per-size token cost table for a model tier, DERIVED from the Sonnet
   * baseline by the OpusCapabilityEngine inter-tier ratio (single source of truth).
   * opus = sonnet x (15/3) = 5x; haiku = sonnet x (1/3). Rounded UP (ceil) to whole
   * tokens so a non-integer ratio (haiku) is strictly CONSERVATIVE -- the budget
   * sizing never UNDER-reports cost (which would over-spawn agents). Opus/sonnet
   * ratios are integers so ceil is a no-op there (exact 20k/60k/150k, baseline).
   *
   * @param tier "haiku" | "sonnet" | "opus"
   * @returns CostTable { short, medium, large } in tokens
   */
  static costTableFor(tier: ModelTier): CostTable {
    const ratio = MODEL_COSTS[tier] / MODEL_COSTS.sonnet;
    const scale = (n: number): number => Math.max(0, Math.ceil(n * ratio));
    return {
      short: scale(SONNET_COST_BY_SIZE.short),
      medium: scale(SONNET_COST_BY_SIZE.medium),
      large: scale(SONNET_COST_BY_SIZE.large),
    };
  }

  /**
   * Build a fleet of N parallel agent specs. Default: every agent opus-fast-max
   * ("drastically increase parallel hermes agents"). Optional `tierMix` distributes
   * a few cheaper-tier agents ("multiple models with different parallel hermes
   * agents") -- e.g. opus for the hard subtasks, sonnet for mechanical ones.
   *
   * @param count number of agents (1..20)
   * @param opts.tierMix optional ordered tier list; agent i gets tierMix[i] (cycled);
   *   absent -> all `defaultTier`
   * @param opts.defaultTier tier for agents not covered by tierMix (default "opus")
   * @param opts.effort effort for every agent (default "max")
   * @param opts.fastMode fast mode for every agent (default true)
   * @param opts.labels optional per-agent labels (agent i gets labels[i])
   * @returns AgentSpec[] of length `count`
   */
  static buildAgentSpecs(
    count: number,
    opts: {
      tierMix?: ModelTier[];
      defaultTier?: ModelTier;
      effort?: EffortLevel;
      fastMode?: boolean;
      labels?: string[];
    } = {},
  ): AgentSpec[] {
    const n = z.number().int().min(1).max(20).parse(count);
    const defaultTier = opts.defaultTier ?? "opus";
    const effort = opts.effort ?? "max";
    const fastMode = opts.fastMode ?? true;
    const mix = Array.isArray(opts.tierMix) && opts.tierMix.length > 0 ? opts.tierMix : null;
    const specs: AgentSpec[] = [];
    for (let i = 0; i < n; i++) {
      const tier = mix ? mix[i % mix.length] : defaultTier;
      const label = opts.labels && opts.labels[i] ? opts.labels[i] : undefined;
      specs.push({
        model: tier,
        effort,
        fastMode,
        ...(label ? { label } : {}),
        rationale:
          tier === "opus"
            ? "operator MAX-tier: opus + max reasoning effort + fast mode"
            : `cost-aware tier ${tier} for a cheaper sub-lane`,
      });
    }
    return specs;
  }

  /**
   * How many opus-fast-max (or other-tier) agents fit the remaining budget?
   * Composes HermesParallelBudgetEnvelopeEngine with the tier cost table so the
   * caller can DRASTICALLY increase parallelism up to what the budget allows,
   * degrading to `recommended_parallel` instead of refusing the whole fan-out.
   *
   * @param req OpusParallelismInput (Zod-validated; defaulted fields optional)
   * @returns ParallelismPlan with the spec, the verdict, and the count to spawn
   */
  static planParallelism(req: OpusParallelismInput): ParallelismPlan {
    const v = OpusParallelismRequestSchema.parse(req);
    const cost_table = OpusFastMaxAgentSpecEngine.costTableFor(v.tier);
    const size: SizeHint = v.size_hint;

    const verdict = HermesParallelBudgetEnvelopeEngine.estimate({
      agents: Array.from({ length: v.desired_agents }, (_, i) => ({
        agent_id: `agent-${i + 1}`,
        size_hint: size,
      })),
      remaining_budget_tokens: v.remaining_budget_tokens,
      cost_table,
      ...(v.parent_reserve_pct !== undefined ? { parent_reserve_pct: v.parent_reserve_pct } : {}),
    });

    const recommended_parallel = Math.min(v.desired_agents, verdict.max_parallel_fits);
    const cap_reason =
      recommended_parallel === v.desired_agents
        ? "all desired agents fit the budget"
        : recommended_parallel === 0
          ? `budget too small for even one ${v.tier}-${size} agent (${cost_table[size]} tokens)`
          : `budget caps ${v.desired_agents} desired -> ${recommended_parallel} that fit`;

    const spec: AgentSpec = {
      model: v.tier,
      effort: v.effort,
      fastMode: v.fast_mode,
      rationale:
        v.tier === "opus" && v.effort === "max" && v.fast_mode
          ? "operator MAX-tier: opus + max reasoning effort + fast mode"
          : `tier ${v.tier}, effort ${v.effort}, fastMode ${v.fast_mode}`,
    };

    return { spec, cost_table, desired_agents: v.desired_agents, recommended_parallel, verdict, cap_reason };
  }

  /** One-line render of a ParallelismPlan for logs / ledgers. */
  static renderPlan(p: ParallelismPlan): string {
    return (
      `[OPUS-FANOUT ${p.verdict.verdict.toUpperCase()}] ` +
      `spec=${p.spec.model}/${p.spec.effort}/fast=${p.spec.fastMode} ` +
      `desired=${p.desired_agents} spawn=${p.recommended_parallel} (${p.cap_reason})`
    );
  }
}

export const opusFastMaxAgentSpecEngine = OpusFastMaxAgentSpecEngine;
