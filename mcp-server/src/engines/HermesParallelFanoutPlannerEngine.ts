/**
 * HermesParallelFanoutPlannerEngine — HZP01 parallel-agent fan-out planner.
 *
 * The existing zulu-awareness reader ranks ONE slot per task. This planner
 * decomposes a parent task into N independent subtasks, each routed to a
 * distinct slot/role, and emits a fan-out plan suitable for a single
 * Agent-tool batch (parallel tool calls in one message).
 *
 * Pure-core: takes the parent task + a slot-recommendation list +
 * pre-decomposed subtasks; returns the planned fan-out (or rejects with a
 * reason if the work is actually sequential).
 *
 * @module engines/HermesParallelFanoutPlannerEngine
 */

import { z } from "zod";

export const SubtaskSchema = z.object({
  subtask_id: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  domain: z.string().min(1).max(60),
  /**
   * IDs of subtasks this depends on; empty = leaf (parallelizable). `.default([])` so an ABSENT
   * depends_on parses as a leaf -- a request round-tripped over MCP through slimResponse (which drops
   * empty arrays) re-parses cleanly here instead of throwing "Required" on every leaf subtask.
   */
  depends_on: z.array(z.string()).max(20).default([]),
  /** Rough size signal — short/medium/large drives budget allocation. */
  size_hint: z.enum(["short", "medium", "large"]),
});
export type Subtask = z.infer<typeof SubtaskSchema>;

export const SlotCandidateSchema = z.object({
  slot: z.string().min(1).max(60),
  hermes_role: z.string().min(1).max(60),
  primary_domain: z.string().min(1).max(60).nullable(),
  score: z.number(),
});
export type SlotCandidate = z.infer<typeof SlotCandidateSchema>;

export const FanoutPlanRequestSchema = z.object({
  parent_task_id: z.string().min(1).max(120),
  subtasks: z.array(SubtaskSchema).min(1).max(20),
  candidates: z.array(SlotCandidateSchema).min(1).max(40),
  /** Max parallelism — caller's parallel-agent budget. */
  max_parallel: z.number().int().min(1).max(20),
});
export type FanoutPlanRequest = z.infer<typeof FanoutPlanRequestSchema>;

export interface AgentAssignment {
  subtask_id: string;
  slot: string;
  hermes_role: string;
  score: number;
  reason: string;
}

export interface FanoutPlan {
  parent_task_id: string;
  parallelizable: boolean;
  /** Why we refuse if not parallelizable (sequential dependencies / no candidates). */
  reject_reason: string | null;
  /** First-wave assignments (leaves only, with no `depends_on`). */
  wave_1: AgentAssignment[];
  /** Subtasks deferred because of dependencies — caller fans these out after wave_1 returns. */
  deferred: string[];
  /** Subtasks unable to route (no surviving candidate after refuse-list veto). */
  unrouted: string[];
}

/**
 * Canonical NATO-slot ↔ domain signatures, keyed off `state/shared/CHAT-SLOT-DOMAINS.md`
 * (operator-canonical). Keywords are matched word-boundary, case-insensitive. This is the
 * detection table the auto-trigger gate uses to count how many DISTINCT fleet domains a raw
 * task touches — the missing decision layer above the pure `plan()` graph planner.
 *
 * Conservative by design: only high-signal, low-ambiguity keywords so a single-domain task
 * never spuriously trips a fan-out advisory (false positives are worse than misses here —
 * a missed fan-out just runs sequentially, a false one spams every prompt).
 */
const DOMAIN_SIGNATURES: ReadonlyArray<{ domain: string; slot: string; keywords: readonly string[] }> = [
  { domain: "mill", slot: "foxtrot", keywords: ["mill", "milling", "vmc", "face mill", "end mill"] },
  { domain: "lathe", slot: "whiskey", keywords: ["lathe", "turning", "okuma", "live tooling", "chuck"] },
  { domain: "wedm", slot: "mike", keywords: ["wire edm", "wedm", "wire-edm", "spark erosion"] },
  { domain: "cam", slot: "kilo", keywords: ["cam", "toolpath", "hypermill", "mastercam", "esprit"] },
  { domain: "cad", slot: "delta", keywords: ["cad", "fusion 360", "solidworks", "step file", "feature recognition"] },
  { domain: "post-processor", slot: "echo", keywords: ["post processor", "post-processor", "g-code", "gcode", "controller dialect", "nc post"] },
  { domain: "speed-feed", slot: "oscar", keywords: ["speed and feed", "speed/feed", "sfc", "kienzle", "feed per tooth", "cutting speed"] },
  { domain: "quoting", slot: "charlie", keywords: ["quote", "quoting", "estimate", "pricing", "cost estimation"] },
  { domain: "business", slot: "hotel", keywords: ["erp", "accounting", "invoice", "payroll", "human resources"] },
  { domain: "academy", slot: "lima", keywords: ["course", "curriculum", "lesson", "academy", "certification"] },
  { domain: "system-viz", slot: "sierra", keywords: ["system-viz", "system viz", "visualization graph", "ghost roost", "regen-viz"] },
  { domain: "ai-training", slot: "india", keywords: ["nn", "gnn", "lora", "rag", "cag", "neural network", "deep learning", "graphsage", "retrain"] },
  { domain: "hermes-zulu", slot: "bravo", keywords: ["hermes", "zulu", "orchestrate", "orchestration", "orchestrator", "fanout", "fan-out", "consensus", "octopus"] },
  { domain: "obsidian", slot: "alpha", keywords: ["obsidian", "vault", "tribal knowledge"] },
  { domain: "database", slot: "juliett", keywords: ["database expansion", "qdrant", "sqlite", "persistence store", "agentdb"] },
  { domain: "fleet-hygiene", slot: "golf", keywords: ["fleet reaper", "orphan reap", "zombie", "fleet hygiene"] },
  { domain: "frontend", slot: "quebec", keywords: ["frontend", "web app", "react component", "next.js"] },
  { domain: "backend", slot: "papa", keywords: ["backend", "tsc error", "build fix", "dispatcher wiring"] },
  { domain: "discovery", slot: "tango", keywords: ["duplication guard", "orphan inventory", "pipeline discovery"] },
] as const;

const DEFAULT_AUTO_FANOUT_THRESHOLD = 3;
const MAX_PROMPT_SCAN_CHARS = 8000;

/** A distinct fleet domain detected in a raw task, with the keywords that matched it. */
export interface DetectedDomain {
  domain: string;
  /** Canonical NATO slot that owns this domain (the natural fan-out target). */
  slot: string;
  /** The keyword(s) from the prompt that matched this domain (evidence, not the whole prompt). */
  matched: string[];
}

/**
 * Output of {@link HermesParallelFanoutPlannerEngine.assessAutoTrigger} — the decision of
 * WHETHER a raw task warrants parallel fan-out (distinct from `plan()`, which decides HOW).
 */
export interface AutoFanoutAssessment {
  /** True when the task touches ≥ threshold distinct domains OR carries an explicit fleet-wide signal. */
  shouldFanout: boolean;
  /** Count of distinct fleet domains detected. */
  domainCount: number;
  /** The distinct domains detected, each with its owning slot + matched evidence. */
  domains: DetectedDomain[];
  /** Heuristic signals that fired (e.g. "fleet-wide-scope", "multi-domain", "and-chain"). */
  signals: string[];
  /** The effective threshold used (after clamping invalid input to the default). */
  threshold: number;
  /** Human-readable explanation of the verdict (always populated — fail-loud, never silent). */
  reason: string;
  /**
   * Plan-ready candidate list — one full {@link SlotCandidate} per detected domain, already
   * satisfying {@link SlotCandidateSchema} (so it can be dropped straight into a
   * {@link FanoutPlanRequest}.candidates without further hydration). `hermes_role` defaults to
   * "specialist" and `score` to 1 (a positive, pickable placeholder); a caller with real
   * zulu-awareness rankings should overwrite `score`/`hermes_role` before calling `plan()`.
   * Capped at `opts.maxParallel` when supplied. Empty when shouldFanout is false.
   */
  suggested_candidates: SlotCandidate[];
}

/**
 * Pure: assign a set of (already parallelizable) subtasks to distinct slots,
 * preferring the highest-score candidate whose `primary_domain` matches the
 * subtask's domain, falling back to any positive-score candidate. Each slot is
 * used at most once (a slot is one chat -- it cannot run two agents at once).
 * Caps at `maxParallel`: subtasks beyond the cap are `overflow` (the caller defers
 * them to a later wave); a subtask with no surviving positive candidate is `unrouted`.
 *
 * Shared by {@link HermesParallelFanoutPlannerEngine.plan} (wave-1 leaves) and
 * {@link ZuluWaveSchedulerEngine.nextWaveAssignments} (any wave's ready set) so the
 * assignment policy lives in EXACTLY ONE place (R8/DRY). Behavior-preserving
 * extraction of plan()'s former inline loop -- guarded by the existing plan() tests.
 */
export function assignSubtasksToSlots(
  toAssign: Subtask[],
  candidates: SlotCandidate[],
  maxParallel: number,
): { assignments: AgentAssignment[]; unrouted: string[]; overflow: string[] } {
  const assigned = new Set<string>();
  const assignments: AgentAssignment[] = [];
  const unrouted: string[] = [];
  const overflow: string[] = [];
  // Preserve score ordering so the highest-score candidate wins each pick.
  const sortedCands = [...candidates].sort((a, b) => b.score - a.score);

  for (const task of toAssign) {
    // Cap reached -> every remaining task overflows to a later wave (matches the
    // old break + post-loop overflow sweep, without the second pass).
    if (assignments.length >= maxParallel) {
      overflow.push(task.subtask_id);
      continue;
    }
    // Prefer an un-assigned candidate whose primary_domain matches; else any positive.
    let pick = sortedCands.find((c) => !assigned.has(c.slot) && c.primary_domain === task.domain && c.score > 0);
    if (!pick) pick = sortedCands.find((c) => !assigned.has(c.slot) && c.score > 0);
    if (!pick) {
      unrouted.push(task.subtask_id);
      continue;
    }
    assigned.add(pick.slot);
    assignments.push({
      subtask_id: task.subtask_id,
      slot: pick.slot,
      hermes_role: pick.hermes_role,
      score: pick.score,
      reason: pick.primary_domain === task.domain ? "domain-match" : "best-available",
    });
  }
  return { assignments, unrouted, overflow };
}

export class HermesParallelFanoutPlannerEngine {
  static plan(req: FanoutPlanRequest): FanoutPlan {
    const v = FanoutPlanRequestSchema.parse(req);

    // Detect uniqueness of subtask IDs — duplicates indicate a malformed decomposition.
    const ids = new Set<string>();
    for (const s of v.subtasks) {
      if (ids.has(s.subtask_id)) throw new Error(`HermesFanoutPlanner.plan: duplicate subtask_id ${s.subtask_id}`);
      ids.add(s.subtask_id);
    }

    // Validate depends_on graph references known IDs.
    for (const s of v.subtasks) {
      for (const dep of s.depends_on) {
        if (!ids.has(dep)) throw new Error(`HermesFanoutPlanner.plan: subtask ${s.subtask_id} depends on unknown ${dep}`);
        if (dep === s.subtask_id) throw new Error(`HermesFanoutPlanner.plan: subtask ${s.subtask_id} depends on itself`);
      }
    }

    const leaves = v.subtasks.filter((s) => s.depends_on.length === 0);
    const deferred = v.subtasks.filter((s) => s.depends_on.length > 0).map((s) => s.subtask_id);

    // Fully-sequential decomposition → refuse.
    if (leaves.length <= 1 && v.subtasks.length > 1) {
      return {
        parent_task_id: v.parent_task_id,
        parallelizable: false,
        reject_reason: "sequential-dependency-chain — no parallel fan-out wave available",
        wave_1: [],
        deferred,
        unrouted: [],
      };
    }

    // Assign the wave-1 leaves via the shared policy (also used for waves N>1 by
    // ZuluWaveSchedulerEngine). Overflow beyond max_parallel joins the
    // dependency-deferred subtasks already collected above (deps first, then overflow).
    const { assignments: wave_1, unrouted, overflow } = assignSubtasksToSlots(
      leaves,
      v.candidates,
      v.max_parallel,
    );
    deferred.push(...overflow);

    return {
      parent_task_id: v.parent_task_id,
      parallelizable: wave_1.length > 0,
      reject_reason: wave_1.length === 0 ? "no-positive-score-candidate" : null,
      wave_1,
      deferred,
      unrouted,
    };
  }

  static renderPlan(p: FanoutPlan): string {
    const tag = p.parallelizable ? "[FANOUT OK]" : "[FANOUT REJECTED]";
    return `${tag} ${p.parent_task_id} wave1=${p.wave_1.length} deferred=${p.deferred.length} unrouted=${p.unrouted.length}${p.reject_reason ? " (" + p.reject_reason + ")" : ""}`;
  }

  /**
   * AUTO-TRIGGER GATE — the decision layer that was missing above `plan()`.
   *
   * `plan()` is pure graph machinery: it needs subtasks already decomposed and candidates
   * already ranked, which is exactly why the whole fan-out surface sat dormant (~28% Hermes
   * utilization per the 2026-06-03 assessment) — nothing decided WHEN to invoke it. This
   * method closes that gap: given the raw task text, it counts how many DISTINCT fleet
   * domains the work touches and detects explicit fleet-wide scope signals, then returns a
   * verdict on whether parallel fan-out is warranted plus a candidate skeleton the caller
   * can hydrate into a {@link FanoutPlanRequest}.
   *
   * Pure + no-throw (per engine convention: edge cases return structured results, never
   * throw): empty/non-string input → `shouldFanout:false` with an explicit reason; an
   * invalid threshold is clamped to the default rather than rejected.
   *
   * Advisory only — a true verdict is a RECOMMENDATION to fan out, never an action. The
   * caller (a hook or the operator) decides whether to actually spawn parallel agents.
   *
   * @param promptText  raw task / prompt text to assess
   * @param opts.threshold     min distinct domains to recommend fan-out (default 3; clamped ≥2)
   * @param opts.maxParallel   informational cap echoed into the candidate skeleton (unused by the gate itself)
   */
  static assessAutoTrigger(
    promptText: unknown,
    opts?: { threshold?: number; maxParallel?: number },
  ): AutoFanoutAssessment {
    // Clamp threshold: a fan-out below 2 domains is meaningless (it's just one agent).
    const rawThreshold = opts?.threshold;
    const threshold =
      typeof rawThreshold === "number" && Number.isFinite(rawThreshold) && rawThreshold >= 2
        ? Math.floor(rawThreshold)
        : DEFAULT_AUTO_FANOUT_THRESHOLD;

    const empty: AutoFanoutAssessment = {
      shouldFanout: false,
      domainCount: 0,
      domains: [],
      signals: [],
      threshold,
      reason: "empty-or-invalid-prompt — nothing to assess",
      suggested_candidates: [],
    };
    if (typeof promptText !== "string" || promptText.trim().length === 0) return empty;

    // Bound the scan so a pathologically long paste can't blow up the heuristic cost.
    const text = promptText.slice(0, MAX_PROMPT_SCAN_CHARS).toLowerCase();
    const signals: string[] = [];

    // 1) Distinct-domain detection (word-boundary, evidence-collecting).
    const domains: DetectedDomain[] = [];
    for (const sig of DOMAIN_SIGNATURES) {
      const matched: string[] = [];
      for (const kw of sig.keywords) {
        // Escape regex metachars in the keyword, then match on word boundaries.
        const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i");
        if (re.test(text)) matched.push(kw);
      }
      if (matched.length > 0) domains.push({ domain: sig.domain, slot: sig.slot, matched });
    }
    const domainCount = domains.length;
    if (domainCount >= threshold) signals.push("multi-domain");

    // 2) Explicit fleet-wide scope — these override the domain count (inherently parallel).
    const fleetScopeRe =
      /\b(all galaxies|every slot|every galaxy|across all|fleet[- ]wide|system as a whole|whole system|all slots|all domains)\b/i;
    const hasFleetScope = fleetScopeRe.test(text);
    if (hasFleetScope) signals.push("fleet-wide-scope");

    // 3) and-chain — multiple coordinated deliverables ("build X and optimize Y and synergize Z").
    const andCount = (text.match(/\b and \b/g) ?? []).length + (text.match(/\s\+\s/g) ?? []).length;
    if (andCount >= 2) signals.push("and-chain");

    // `and-chain` and `multi-domain` are EVIDENTIARY signals only — they surface why a task
    // looks parallelizable but DO NOT drive the verdict (and-chains over-fire on single-domain
    // prose like "tune the mill feed and the mill speed"). Only an explicit fleet-wide scope or
    // a genuine distinct-domain count ≥ threshold flips shouldFanout.
    const shouldFanout = hasFleetScope || domainCount >= threshold;

    let reason: string;
    if (shouldFanout) {
      const driver = hasFleetScope
        ? "explicit fleet-wide scope"
        : `${domainCount} distinct domains ≥ threshold ${threshold}`;
      reason = `fan-out recommended (${driver}); domains: ${domains.map((d) => d.domain).join(", ") || "none"}`;
    } else {
      reason = `sequential ok — ${domainCount} distinct domain(s) < threshold ${threshold}, no fleet-wide signal`;
    }

    // Emit FULL, schema-valid SlotCandidates (not a partial skeleton) so the caller can pass
    // them straight into plan() without a hidden hydration step. Cap at maxParallel when the
    // caller supplied a valid positive budget.
    const maxParallel = opts?.maxParallel;
    const cap =
      typeof maxParallel === "number" && Number.isFinite(maxParallel) && maxParallel >= 1
        ? Math.floor(maxParallel)
        : domains.length;
    const suggested_candidates: SlotCandidate[] = shouldFanout
      ? domains.slice(0, cap).map((d) => ({
          slot: d.slot,
          hermes_role: "specialist",
          primary_domain: d.domain,
          score: 1,
        }))
      : [];

    return {
      shouldFanout,
      domainCount,
      domains,
      signals,
      threshold,
      reason,
      suggested_candidates,
    };
  }

  static renderAutoTrigger(a: AutoFanoutAssessment): string {
    const tag = a.shouldFanout ? "[AUTO-FANOUT ✅]" : "[AUTO-FANOUT —]";
    const slots = a.domains.map((d) => `${d.domain}→${d.slot}`).join(", ") || "none";
    return `${tag} domains=${a.domainCount} threshold=${a.threshold} signals=[${a.signals.join(",")}] candidates=[${slots}] (${a.reason})`;
  }
}

export const hermesParallelFanoutPlannerEngine = HermesParallelFanoutPlannerEngine;
