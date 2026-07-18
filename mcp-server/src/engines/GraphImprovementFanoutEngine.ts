/**
 * GraphImprovementFanoutEngine -- U-ALPHA-HERMES-GRAPH-IMPROVE (slot:alpha).
 *
 * The PURE planning core of the parallel opus-fast-max graph-improvement loop. Given
 * the system-viz leverage wiring queue (each entry = a domain bucket of unwired
 * engines = missing engine->dispatcher edges in the graph), it:
 *   1. decomposes the queue into parallelizable graph-improvement subtasks
 *      (highest-leverage first),
 *   2. sizes the OPUS-FAST-MAX fan-out (OpusFastMaxAgentSpecEngine.planParallelism),
 *   3. assigns subtasks -> slots (HermesParallelFanoutPlannerEngine.plan), and
 *   4. attaches the opus-fast-max AgentSpec to each, producing an executable agent batch.
 *
 * PURE (no I/O, no agent-spawning) so it is testable AND dispatcher-wireable: the
 * cron driver (scripts/hermes-graph-improvement-driver.mts) supplies the queue it
 * read from disk; the hermesDispatcher action `hermes_graph_improve_plan` supplies a
 * queue from its request. Both call THIS, so the planning logic lives in one place (R8).
 *
 * @module engines/GraphImprovementFanoutEngine
 */

import { z } from "zod";
import {
  OpusFastMaxAgentSpecEngine,
  type AgentSpec,
} from "./OpusFastMaxAgentSpecEngine.js";
import {
  HermesParallelFanoutPlannerEngine,
  type Subtask,
  type SlotCandidate,
  type FanoutPlan,
} from "./HermesParallelFanoutPlannerEngine.js";

// ---------------------------------------------------------------------------
// Schemas + types
// ---------------------------------------------------------------------------

/** One leverage-queue entry: a graph-domain bucket with N unwired engines. */
export const WiringQueueEntrySchema = z.object({
  domain: z.string().min(1).max(120),
  id: z.string().max(200).optional(),
  unwired: z.number(),
  coverage_pct: z.number().optional(),
  leverageScore: z.number().optional(),
  needsDispatcherInference: z.boolean().optional(),
  suggestedDispatchers: z.array(z.string()).optional(),
});
export type WiringQueueEntry = z.infer<typeof WiringQueueEntrySchema>;

export const GraphImprovementRequestSchema = z.object({
  queue: z.array(WiringQueueEntrySchema).max(200),
  totals: z
    .object({ domains: z.number().optional(), unwiredEngines: z.number().optional(), needInference: z.number().optional() })
    .partial()
    .optional(),
  /** Remaining token budget the fan-out must fit inside. */
  budgetTokens: z.number().int().min(0).max(20_000_000),
  /** How many parallel agents the operator WANTS (the "drastically increase" lever). */
  desiredAgents: z.number().int().min(1).max(20),
  /** Cap on subtasks pulled from the queue (defaults to 12). */
  maxSubtasks: z.number().int().min(1).max(20).optional(),
});
export type GraphImprovementRequest = z.infer<typeof GraphImprovementRequestSchema>;

export interface GraphImprovementPlan {
  ok: boolean;
  reason: string;
  totals: NonNullable<GraphImprovementRequest["totals"]>;
  opus: ReturnType<typeof OpusFastMaxAgentSpecEngine.planParallelism>;
  fanout: FanoutPlan;
  agentBatch: Array<{ subtask_id: string; slot: string; description: string; spec: AgentSpec }>;
}

// ---------------------------------------------------------------------------
// Slot routing tables
// ---------------------------------------------------------------------------

/**
 * Graph-domain bucket -> canonical galaxy NATO slot, where the bucket cleanly maps
 * to a domain owner. Buckets that are NOT galaxy-specific (MiscDomains, Other,
 * Monolith, Wet, Shop) fall through to the any-domain fallback pool.
 */
export const DOMAIN_SLOT_MAP: Readonly<Record<string, string>> = Object.freeze({
  speed: "oscar",
  mill: "foxtrot",
  quoting: "charlie",
  post: "echo",
  mastercam: "kilo",
  hyper: "kilo",
  fusion: "delta",
  tool: "kilo",
  lathe: "whiskey",
  wedm: "mike",
  cad: "delta",
  cam: "kilo",
});

/**
 * Any-domain fallback slots (operator 2026-06-18): expand to ANY domain when their
 * own queue is dry -- the natural executors for the non-galaxy graph buckets.
 */
export const FALLBACK_SLOTS: readonly string[] = Object.freeze([
  "alpha", "bravo", "sierra", "papa", "india", "romeo", "xray", "zulu", "golf",
]);

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class GraphImprovementFanoutEngine {
  /** Size hint from the count of unwired engines in a domain bucket. */
  static sizeHintForUnwired(n: number): "short" | "medium" | "large" {
    if (!Number.isFinite(n) || n <= 0) return "short";
    if (n > 20) return "large";
    if (n >= 5) return "medium";
    return "short";
  }

  /** Normalize a graph-domain label to a lowercase slug for matching + ids. */
  static normalizeDomain(domain: unknown): string {
    return (
      String(domain ?? "unknown")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "unknown"
    );
  }

  /**
   * Map the leverage queue into parallelizable subtasks, highest leverage first,
   * capped at maxSubtasks. Each subtask is a graph-edge improvement (infer + propose
   * the dispatcher wiring for that domain's unwired engines). Zero-unwired entries
   * are dropped. All leaves (no deps) -> fully parallelizable.
   */
  static queueToSubtasks(queue: WiringQueueEntry[], maxSubtasks: number): Subtask[] {
    const cap = Number.isFinite(maxSubtasks) && maxSubtasks >= 1 ? Math.trunc(maxSubtasks) : 12;
    const ranked = [...(Array.isArray(queue) ? queue : [])]
      .filter((e) => e && Number.isFinite(e.unwired) && e.unwired > 0)
      .sort((a, b) => (b.leverageScore ?? 0) - (a.leverageScore ?? 0))
      .slice(0, cap);
    return ranked.map((e) => {
      const slug = GraphImprovementFanoutEngine.normalizeDomain(e.domain);
      return {
        subtask_id: `wire-${slug}`,
        description:
          `Improve the system-viz graph for the "${e.domain}" domain: ${e.unwired} engine(s) on disk ` +
          `have no dispatcher edge. Infer + propose the correct prism_* dispatcher wiring for each ` +
          `(or confirm WIRE-EXEMPT), so the engine->dispatcher edges are added to the graph. ` +
          `Leverage ${e.leverageScore ?? 0}, coverage ${e.coverage_pct ?? "?"}%.`,
        domain: slug,
        depends_on: [],
        size_hint: GraphImprovementFanoutEngine.sizeHintForUnwired(e.unwired),
      };
    });
  }

  /**
   * Build the slot-candidate pool for the planner. Each subtask domain gets its galaxy
   * slot (if mapped, higher score); the any-domain fallback slots round out the pool so
   * the planner can fill up to max_parallel even for non-galaxy graph buckets. One slot
   * per candidate (a slot is one chat).
   */
  static buildCandidates(subtasks: Subtask[]): SlotCandidate[] {
    const used = new Set<string>();
    const candidates: SlotCandidate[] = [];
    for (const st of subtasks) {
      const slot = DOMAIN_SLOT_MAP[st.domain];
      if (slot && !used.has(slot)) {
        used.add(slot);
        candidates.push({ slot, hermes_role: "specialist", primary_domain: st.domain, score: 10 });
      }
    }
    const unmatched = subtasks.map((s) => s.domain).filter((d) => !DOMAIN_SLOT_MAP[d]);
    let fi = 0;
    for (const slot of FALLBACK_SLOTS) {
      if (used.has(slot)) continue;
      used.add(slot);
      const dom = unmatched[fi] ?? null;
      fi += 1;
      candidates.push({ slot, hermes_role: "generalist", primary_domain: dom, score: dom ? 6 : 4 });
    }
    return candidates;
  }

  /**
   * Compose a full graph-improvement fan-out plan from a wiring queue + budget.
   * Zod-validated. Pure (no I/O). A refused budget spawns NOTHING (no phantom batch).
   *
   * @param req GraphImprovementRequest
   * @returns GraphImprovementPlan with the opus sizing, fan-out, and executable batch
   */
  static plan(req: GraphImprovementRequest): GraphImprovementPlan {
    const v = GraphImprovementRequestSchema.parse(req);
    const totals = v.totals ?? {};

    const subtasks = GraphImprovementFanoutEngine.queueToSubtasks(v.queue, v.maxSubtasks ?? 12);
    if (subtasks.length === 0) {
      return {
        ok: true,
        reason: "no graph gaps in queue -- nothing to fan out this tick",
        totals,
        opus: OpusFastMaxAgentSpecEngine.planParallelism({ remaining_budget_tokens: v.budgetTokens, desired_agents: 1 }),
        fanout: { parent_task_id: "graph-improve", parallelizable: false, reject_reason: "no-subtasks", wave_1: [], deferred: [], unrouted: [] },
        agentBatch: [],
      };
    }

    // Desired parallelism bounded by subtask count AND the schema cap (20).
    const desired = Math.max(1, Math.min(subtasks.length, v.desiredAgents, 20));
    // Size each agent by the LARGEST subtask in the wave (conservative -- the budget
    // must hold even the heaviest domain). Opus tier, max effort, fast mode.
    const largest = subtasks.reduce<"short" | "medium" | "large">(
      (acc, s) => (s.size_hint === "large" ? "large" : acc === "large" ? "large" : s.size_hint === "medium" ? "medium" : acc),
      "short",
    );
    const opus = OpusFastMaxAgentSpecEngine.planParallelism({
      remaining_budget_tokens: v.budgetTokens,
      desired_agents: desired,
      tier: "opus",
      size_hint: largest,
      effort: "max",
      fast_mode: true,
    });

    // Budget REFUSED -> spawn nothing (R12 honesty: no phantom batch on a refused tick).
    if (opus.recommended_parallel === 0) {
      return {
        ok: false,
        reason: `budget refused: ${opus.cap_reason}`,
        totals,
        opus,
        fanout: { parent_task_id: "graph-improve", parallelizable: false, reject_reason: "budget-refused", wave_1: [], deferred: subtasks.map((s) => s.subtask_id), unrouted: [] },
        agentBatch: [],
      };
    }

    const candidates = GraphImprovementFanoutEngine.buildCandidates(subtasks);
    const fanout = HermesParallelFanoutPlannerEngine.plan({
      parent_task_id: "graph-improve",
      subtasks,
      candidates,
      max_parallel: opus.recommended_parallel,
    });

    const byId = new Map(subtasks.map((s) => [s.subtask_id, s]));
    const agentBatch = fanout.wave_1.map((a) => ({
      subtask_id: a.subtask_id,
      slot: a.slot,
      description: byId.get(a.subtask_id)?.description ?? "",
      spec: OpusFastMaxAgentSpecEngine.opusFastMaxSpec(a.subtask_id),
    }));

    const ok = agentBatch.length > 0;
    return {
      ok,
      reason: ok
        ? `fan-out ${agentBatch.length} opus-fast-max agent(s) over ${subtasks.length} graph gap(s)`
        : "no routable subtasks (no positive-score candidate)",
      totals,
      opus,
      fanout,
      agentBatch,
    };
  }

  /** Render the executable batch as an operator/agent-readable block. */
  static renderBatch(plan: GraphImprovementPlan): string {
    if (plan.agentBatch.length === 0) return `[GRAPH-IMPROVE] no agents this tick (${plan.reason})`;
    const head =
      `[GRAPH-IMPROVE] ${OpusFastMaxAgentSpecEngine.renderPlan(plan.opus)}\n` +
      `  fan-out: wave1=${plan.fanout.wave_1.length} deferred=${plan.fanout.deferred.length} unrouted=${plan.fanout.unrouted.length}`;
    const rows = plan.agentBatch.map(
      (a) => `  -> slot ${a.slot.padEnd(8)} [${a.spec.model}/${a.spec.effort}/fast] ${a.subtask_id}`,
    );
    return [head, ...rows].join("\n");
  }
}

export const graphImprovementFanoutEngine = GraphImprovementFanoutEngine;
