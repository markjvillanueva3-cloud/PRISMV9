/**
 * HybridAgentDispatchEngine -- DOMAIN-SOUL-AGENTS / U3.
 *
 * Pure decision core: given a domain-soul agent + a task + the live Hermes-proxy
 * health, decide WHICH lane carries the agent -- the Claude Agent tool (default), the
 * Hermes free-lane parallel fan-out (when healthy + fan-out-shaped + non-safety), or a
 * local-Ollama fallback. The operator's "hybrid agent": a domain-soul agent that can run
 * as a Claude subagent OR be dispatched through the free Hermes lane.
 *
 * This does NOT replace the Agent tool. It ADVISES which lane to use. A live chat /
 * Workflow reads the verdict and either spawns the subagent (claude) or routes the
 * agent's prompt through `ask-hermes` / `HermesAutonomousDriveRunnerEngine` (hermes /
 * ollama). The agent persona + refuse-list are identical across lanes (same .md soul).
 *
 * SAFETY (R12, fail-closed): the Hermes/Ollama lanes are free + parallel but UNTRUSTED
 * for safety-critical writes. Any task classified `safety_write` is FORCED to `claude`
 * regardless of proxy health. When the proxy is dark, hermes degrades hermes->ollama->
 * claude. Default is ALWAYS the trusted Claude lane -- a free lane is an opt-in
 * accelerator for the right shape of work, never the default.
 *
 * @module engines/HybridAgentDispatchEngine
 */

import { z } from "zod";

export type Lane = "claude" | "hermes" | "ollama";

/** Work shape -- drives whether the free parallel lane is even a candidate. */
export type TaskKind = "review" | "audit" | "research" | "plan" | "draft" | "build" | "safety_write";

export const HybridDispatchRequestSchema = z.object({
  /** The domain-soul agent name, e.g. "charlie-quoting". */
  agent: z.string().min(1).max(80),
  /** What kind of work this is -- the safety + lane-eligibility driver. */
  task_kind: z.enum(["review", "audit", "research", "plan", "draft", "build", "safety_write"]),
  /** Is the Hermes proxy answering /health right now? (caller probes; never assumed.) */
  hermes_healthy: z.boolean(),
  /** Is local Ollama reachable right now? */
  ollama_healthy: z.boolean().optional(),
  /** How many of these agents are being fanned out at once. Fan-out (>=2) is what makes
   *  the free parallel lane worth its latency; a single agent runs faster on Claude. */
  parallelism: z.number().int().min(1).max(64).optional(),
  /** Hard override: caller forbids any non-Claude lane (e.g. operator-sensitive run). */
  force_claude: z.boolean().optional(),
});
export type HybridDispatchRequest = z.infer<typeof HybridDispatchRequestSchema>;

export interface HybridDispatchVerdict {
  lane: Lane;
  /** The ordered fallback chain the caller should walk if `lane` is unreachable mid-run. */
  fallback_chain: Lane[];
  reason: string;
  /** True when a free (Hermes/Ollama) lane was chosen -- a token/cost win flag. */
  free_lane: boolean;
}

/** Work kinds that may NEVER leave the trusted Claude lane. A safety-critical write
 *  (engine/safety/program emit) must run where the full PRISM guard stack applies. */
const SAFETY_KINDS: ReadonlySet<TaskKind> = new Set<TaskKind>(["safety_write"]);

/** Work kinds eligible for the free parallel Hermes lane: read/think/draft only.
 *  `build` is eligible only as plan+draft (the Hermes work-loop is plan+draft-only by
 *  operator decision) -- a build that WRITES code is treated as a Claude task here. */
const FREE_LANE_ELIGIBLE: ReadonlySet<TaskKind> = new Set<TaskKind>([
  "review",
  "audit",
  "research",
  "plan",
  "draft",
]);

/** Minimum fan-out at which the free parallel lane's setup latency pays off. */
export const MIN_FANOUT_FOR_HERMES = 2;

export class HybridAgentDispatchEngine {
  /**
   * Decide the lane for a domain-soul agent dispatch. Pure; never throws on caller data
   * (invalid input -> safe default `claude`).
   */
  static selectLane(req: HybridDispatchRequest): HybridDispatchVerdict {
    const parsed = HybridDispatchRequestSchema.safeParse(req);
    if (!parsed.success) {
      return {
        lane: "claude",
        fallback_chain: ["claude"],
        reason: `invalid request -> safe default claude (${parsed.error.issues.map((i) => i.message).join("; ")})`,
        free_lane: false,
      };
    }
    const r = parsed.data;

    // Hard overrides first.
    if (r.force_claude) {
      return { lane: "claude", fallback_chain: ["claude"], reason: "force_claude override", free_lane: false };
    }
    // Safety-critical work NEVER leaves the trusted lane, healthy proxy or not.
    if (SAFETY_KINDS.has(r.task_kind)) {
      return {
        lane: "claude",
        fallback_chain: ["claude"],
        reason: `task_kind=${r.task_kind} is safety-critical -> trusted Claude lane only`,
        free_lane: false,
      };
    }

    const parallelism = r.parallelism ?? 1;
    const eligible = FREE_LANE_ELIGIBLE.has(r.task_kind);
    const fanoutWorthy = parallelism >= MIN_FANOUT_FOR_HERMES;
    const ollamaUp = r.ollama_healthy !== false; // default-assume reachable unless told false

    // Free parallel lane is a candidate ONLY for eligible read/think/draft work at fan-out.
    if (eligible && fanoutWorthy) {
      if (r.hermes_healthy) {
        // Hermes is the strong free lane; degrade hermes -> ollama -> claude.
        const chain: Lane[] = ["hermes"];
        if (ollamaUp) chain.push("ollama");
        chain.push("claude");
        return {
          lane: "hermes",
          fallback_chain: chain,
          reason: `${r.task_kind} x${parallelism} fan-out + Hermes healthy -> free parallel lane (degrade hermes->ollama->claude)`,
          free_lane: true,
        };
      }
      if (ollamaUp) {
        // Proxy dark but Ollama up: still a free lane for mechanical read/think work.
        return {
          lane: "ollama",
          fallback_chain: ["ollama", "claude"],
          reason: `${r.task_kind} x${parallelism} fan-out, Hermes dark -> local Ollama free lane (degrade ollama->claude)`,
          free_lane: true,
        };
      }
      // Both free lanes down -> trusted lane.
      return {
        lane: "claude",
        fallback_chain: ["claude"],
        reason: `${r.task_kind} x${parallelism} fan-out but Hermes dark + Ollama down -> Claude`,
        free_lane: false,
      };
    }

    // Single-agent or build/safety: the trusted Claude lane is faster + correct.
    const why = !eligible
      ? `task_kind=${r.task_kind} not free-lane-eligible (write/build path)`
      : `single agent (parallelism=${parallelism}<${MIN_FANOUT_FOR_HERMES}) runs faster on Claude`;
    return { lane: "claude", fallback_chain: ["claude"], reason: `${why} -> Claude`, free_lane: false };
  }
}

export const hybridAgentDispatchEngine = new HybridAgentDispatchEngine();
