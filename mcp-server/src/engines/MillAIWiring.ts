/**
 * MillAIWiring — shared helpers for wiring mill-master engines onto PRISM AI.
 * Four sync entry points (async overloads reserved for later units):
 *   - rankCandidatesBayesian : HypothesisRanker lifecycle wrapper.
 *   - withPRISMReasoning     : TreeOfThought-backed reasoning summary.
 *   - recordCapabilityUsage  : CapabilityEffectiveness adapter.
 *   - budgetedAIPath         : useAI router with fail-closed legacy fallback.
 * Invariants: fail-closed on any primitive exception; inputs never mutated.
 * @envelope data/milestones/MILL-MASTER-AI-WIRING.json (U2-EXTRACT-HELPER)
 */

import { performance } from "node:perf_hooks";

import { treeOfThoughtEngine } from "./TreeOfThoughtEngine.js";
import { hypothesisRankerEngine } from "./HypothesisRankerEngine.js";
import { capabilityEffectivenessEngine } from "./CapabilityEffectivenessEngine.js";
import type { PillarId } from "./ProductPillarEngine.js";

export type UseAI = "off" | "auto" | "on";

// ----------------------------------------------------------------------------
// rankCandidatesBayesian — HypothesisRanker lifecycle wrapper
// ----------------------------------------------------------------------------

export interface RankerEvidence {
  description: string;
  strength: number;   // 0..1
  reliability: number; // 0..1
  supports: boolean;
  source?: string;
}

export interface RankCandidatesInput<C> {
  /** Human-readable label for the hypothesis set (logged + audit trail). */
  problem: string;
  candidates: C[];
  /** Statement text for each candidate's hypothesis. */
  statement: (candidate: C, index: number) => string;
  /** Prior probability [0..1] per candidate. Defaults to 0.5 if omitted. */
  prior?: (candidate: C) => number;
  /** Tribal-alignment hint [0..1]; defaults to 0.5. */
  tribalAlignment?: (candidate: C) => number;
  /** Evidence set per candidate (>= 1 item recommended). */
  evidence: (candidate: C) => RankerEvidence[];
}

export interface RankedCandidate<C> {
  candidate: C;
  /** Posterior score from rankHypotheses. */
  score: number;
  rank: number;
}

export interface RankCandidatesResult<C> {
  best: C | null;
  ranked: RankedCandidate<C>[];
}

/**
 * Run the hypothesisRankerEngine lifecycle (createSet → addHypothesis →
 * addEvidence → rankHypotheses) for a homogeneous candidate pool. Returns
 * the candidates ordered by posterior score. Fail-closed: on any internal
 * exception, `ranked` is empty and `best` is null.
 */
export function rankCandidatesBayesian<C>(
  input: RankCandidatesInput<C>,
): RankCandidatesResult<C> {
  try {
    if (input.candidates.length === 0) return { best: null, ranked: [] };
    const set = hypothesisRankerEngine.createHypothesisSet(input.problem);
    const idToCandidate = new Map<string, C>();
    for (let i = 0; i < input.candidates.length; i++) {
      const c = input.candidates[i];
      const prior = input.prior ? clamp01(input.prior(c)) : 0.5;
      const tribal = input.tribalAlignment ? clamp01(input.tribalAlignment(c)) : 0.5;
      const hyp = hypothesisRankerEngine.addHypothesis(
        set.id,
        input.statement(c, i),
        "empirical",
        { prior, tribal_alignment: tribal, source: "MillAIWiring.rankCandidatesBayesian" },
      );
      if (!hyp) continue;
      idToCandidate.set(hyp.id, c);
      for (const ev of input.evidence(c)) {
        hypothesisRankerEngine.addEvidence(set.id, hyp.id, {
          description: ev.description,
          type: "empirical",
          strength: clamp01(ev.strength),
          reliability: clamp01(ev.reliability),
          source: ev.source ?? "MillAIWiring",
          supports: ev.supports,
        });
      }
    }
    const rankings = hypothesisRankerEngine.rankHypotheses(set.id);
    const ranked: RankedCandidate<C>[] = [];
    for (const r of rankings) {
      const c = idToCandidate.get(r.hypothesis_id);
      if (c !== undefined) ranked.push({ candidate: c, score: r.score, rank: r.rank });
    }
    return { best: ranked[0]?.candidate ?? null, ranked };
  } catch {
    return { best: null, ranked: [] };
  }
}

// ----------------------------------------------------------------------------
// withPRISMReasoning — TreeOfThought-backed multi-branch reasoning
// ----------------------------------------------------------------------------

export interface WithPRISMReasoningInput {
  question: string;
  goal?: string;
  initial_state?: Record<string, unknown>;
  available_actions?: string[];
  constraints?: string[];
  tribal_tips?: string[];
  physics_bounds?: Record<string, { min: number; max: number }>;
  depth?: number;
  branches?: number;
  beamWidth?: number;
}

export interface WithPRISMReasoningResult {
  branch_count: number;
  max_depth_reached: number;
  confidence: number; // 0..1
  reasoning_chain: string[];
  source: "tree_of_thought";
}

/**
 * Create a TreeOfThought tree for the given question and explore it with
 * sensible best-first defaults. Returns a compact summary suitable for
 * inclusion as reasoning steps; returns null on any internal failure.
 */
export function withPRISMReasoning(
  input: WithPRISMReasoningInput,
): WithPRISMReasoningResult | null {
  try {
    const tree = treeOfThoughtEngine.createTree(
      input.question || "empty question",
      input.goal ?? "actionable_recommendation",
      input.initial_state ?? {},
    );
    const solution = treeOfThoughtEngine.explore(
      tree,
      {
        current_state: input.initial_state ?? { question: input.question },
        constraints: input.constraints ?? [],
        available_actions: input.available_actions ?? ["observe", "analyze", "synthesize"],
        tribal_tips: input.tribal_tips ?? [],
        physics_bounds: input.physics_bounds ?? {},
      },
      {
        strategy: "best_first",
        max_depth: input.depth ?? 3,
        max_branches_per_node: input.branches ?? 4,
        beam_width: input.beamWidth ?? 3,
        pruning_threshold: 0.1,
        backtrack_on_violation: true,
        tribal_weight: 0.2,
        physics_weight: 0.2,
      },
    );
    return {
      branch_count: tree.exploration_count,
      max_depth_reached: tree.max_depth_reached,
      confidence: solution ? solution.confidence : 0.5,
      reasoning_chain: solution ? solution.reasoning_chain.slice(0, 6) : [],
      source: "tree_of_thought",
    };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// recordCapabilityUsage — CapabilityEffectiveness adapter
// ----------------------------------------------------------------------------

export interface CapabilityUsageEvent {
  capabilityId: string;
  pillar?: PillarId;
  useAI: UseAI;
  durationMs: number;
  success: boolean;
  fallback?: boolean;
  tokensConsumed?: number;
}

/**
 * Record a mill-AI-wiring invocation on the effectiveness engine. Swallows
 * any error — telemetry must never affect the main call path.
 */
export function recordCapabilityUsage(event: CapabilityUsageEvent): void {
  try {
    capabilityEffectivenessEngine.recordUsage({
      capability_id: event.capabilityId,
      pillar: event.pillar ?? "toolpath",
      timestamp: new Date().toISOString(),
      tokens_consumed: event.tokensConsumed ?? 0,
      success: event.success,
    });
  } catch {
    // silently drop — telemetry is never load-bearing
  }
}

// ----------------------------------------------------------------------------
// budgetedAIPath — useAI router with fail-closed legacy fallback
// ----------------------------------------------------------------------------

/**
 * Route between legacy and AI paths based on the `useAI` flag.
 *   - 'off'  : legacy only.
 *   - 'auto' : AI if `budgetMs` has not been exceeded by a prior call; the
 *              helper keeps a per-capability cool-down so runaway AI paths
 *              auto-downgrade on the next invocation.
 *   - 'on'   : AI first, with fail-closed catch that falls back to legacy.
 *
 * Sync-only in U2 (mill-master engines are all sync today). An async overload
 * is planned alongside the first long-running mill-AI method.
 */
const budgetOverruns = new Map<string, number>();

export function budgetedAIPath<T>(
  useAI: UseAI,
  legacyFn: () => T,
  aiFn: () => T,
  opts?: { capabilityId?: string; budgetMs?: number },
): T {
  if (useAI === "off") return legacyFn();
  const capId = opts?.capabilityId ?? "mill-ai-wiring:default";
  const budget = opts?.budgetMs ?? 500;
  if (useAI === "auto") {
    const lastOverrun = budgetOverruns.get(capId) ?? 0;
    if (Date.now() - lastOverrun < 60_000) return legacyFn();
  }
  const t0 = performance.now();
  try {
    const out = aiFn();
    const dt = performance.now() - t0;
    if (dt > budget) budgetOverruns.set(capId, Date.now());
    return out;
  } catch {
    budgetOverruns.set(capId, Date.now());
    return legacyFn();
  }
}

/** Reset the auto-downgrade cool-down (for tests and ops tooling). */
export function resetBudgetOverruns(): void {
  budgetOverruns.clear();
}

// ----------------------------------------------------------------------------
// internals
// ----------------------------------------------------------------------------

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0.5;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
