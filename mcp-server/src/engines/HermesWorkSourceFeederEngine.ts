/**
 * HermesWorkSourceFeederEngine -- HERMES-WORK-LOOP-MS0/U3 work-source -> Subtask[] adapter.
 *
 * The PARALLEL fan-out machinery already exists (HermesParallelFanoutPlannerEngine,
 * HermesAutonomousDriveRunnerEngine). This engine is the missing FEEDER: a thin, PURE
 * adapter that turns heterogeneous PRISM work-source rows (open roadmap units, research/wiki
 * tasks, unwired-engine wiring gaps, galaxy-synthesis gaps) into the canonical `Subtask[]`
 * shape those engines already consume -- AFTER deduping against the live slot-task claims so
 * a Hermes agent never races a work slot, and risk-classifying each unit so the downstream
 * executor can route it (read-only/research -> local Ollama + plan-only; code/engine -> cloud
 * Grok + draft-with-diff; safety-touching -> ALWAYS plan-only, high risk).
 *
 * PURE (engines are calculation-only -- engines/CLAUDE.md): the caller (the U4 driver) does ALL
 * I/O -- reads the source files, normalizes each row into a `WorkSourceUnit`, queries the
 * slot-task-claim store, and passes the held-claim Set in. This engine maps + dedupes + classifies
 * + emits. No fetch, no spawn, no parallel logic (the existing engines own that).
 *
 * @module engines/HermesWorkSourceFeederEngine
 */

import { z } from "zod";
import type { Subtask } from "./HermesParallelFanoutPlannerEngine.js";

/**
 * A normalized work-source row. The caller flattens each heterogeneous source
 * (ROADMAP-CONSOLIDATED.pending_units / .bridge_units, MISC-TASKS-INVENTORY.items,
 * UNWIRED-ENGINE-AUDIT.unwiredEngines, galaxy-synthesis gaps) into THIS shape before
 * passing it in. Only `unit_id` + `title` are required; the rest sharpen classification.
 */
export const WorkSourceUnitSchema = z.object({
  /** Canonical unit id (roadmap unit_id / MILESTONE::U-ID / engine name / synthesis-gap slug). */
  unit_id: z.string().min(1).max(120),
  /** Human-readable title -- becomes the Subtask description (with evidence/intent appended). */
  title: z.string().min(1).max(2000),
  /** Which of the 4 operator-chosen work sources this came from. */
  source: z.enum(["roadmap", "research", "wiring", "synthesis"]),
  /** Domain/galaxy hint (mill, lathe, wedm, Auth, etc.) -- defaults from the source if absent. */
  domain: z.string().min(1).max(60).optional(),
  /** Extra context the executor should see (evidence line, intent, suggestedDispatcher). */
  detail: z.string().max(4000).optional(),
  /** Owning milestone, if known -- used only for the description, never the id. */
  milestone: z.string().max(160).optional(),
});
export type WorkSourceUnit = z.infer<typeof WorkSourceUnitSchema>;

export const FeederRequestSchema = z.object({
  /**
   * The normalized work-source rows (caller-read, caller-normalized -- this engine does no I/O).
   * Validated LOOSELY here (`z.unknown()`) so ONE malformed row never sinks the whole request:
   * the strict per-row `WorkSourceUnitSchema.safeParse` runs inside `toSubtasks`, dropping bad
   * rows individually and surfacing the drop count (R12). A 5000-row feed from the U4 driver
   * must survive a single garbage row, not throw.
   */
  sources: z.array(z.unknown()).max(5000),
  /**
   * Unit ids currently claimed by a PEER slot/chat -- the caller computes this via
   * `slot-task-claim.mjs::peerClaimedSet(store, mySlot, myChatId, candidateIds, nowIso)`.
   * Any source whose unit_id is in this set is EXCLUDED (a Hermes agent never races a live slot).
   */
  heldClaims: z.array(z.string()).max(5000).default([]),
  /** Cap on emitted subtasks (the parallel budget). 1..20 -- the fan-out planner's own max. */
  maxUnits: z.number().int().min(1).max(20).default(8),
});
export type FeederRequest = z.infer<typeof FeederRequestSchema>;

/** Risk classification -- drives the executor's routing + the plan-vs-draft posture. */
export type RiskClass = "read-only" | "code" | "safety";

export interface ClassifiedSubtask {
  subtask: Subtask;
  /** read-only -> local Ollama + plan-only; code -> cloud Grok + draft; safety -> ALWAYS plan-only. */
  risk: RiskClass;
  /** Cloud (Grok reasoning) for code/safety; local (Ollama) for read-only research/wiki/docs. */
  executor_lane: "cloud" | "local";
  /** plan = analysis/research note only; draft = plan + a code diff for human review. */
  posture: "plan" | "draft";
  /** The work source this came from -- carried through for the ledger. */
  source: WorkSourceUnit["source"];
  /** Why this risk class -- the matched signal (for the receipt + operator trust). */
  reason: string;
}

export interface FeederResult {
  /** The emitted, deduped, risk-classified subtasks (<= maxUnits), leaves-only (no depends_on). */
  subtasks: ClassifiedSubtask[];
  /** Count of source rows excluded because a peer slot holds the claim. */
  excludedClaimed: number;
  /** Count of source rows dropped as malformed (failed per-row schema parse). */
  excludedMalformed: number;
  /** Count of duplicate unit_ids collapsed (first wins). */
  excludedDuplicate: number;
  /** Total source rows considered. */
  consideredCount: number;
}

/**
 * Safety-touching signals -> risk "safety": ALWAYS plan-only, cloud lane (deep reasoning),
 * NEVER a draft diff (operator decision 2 + extra caution). Word-boundary matched so "draft"
 * doesn't trip on "redraft" etc. Kept conservative -- a false safety-positive only makes a unit
 * MORE cautious (plan-only), never less.
 */
const SAFETY_SIGNALS =
  /\b(safety|physics|kienzle|taylor|collision|crash|tool[\s-]?break|workhold|spindle[\s-]?(load|torque|power)|constants\.ts|deflection|chatter|coolant|feed[\s-]?rate|surface[\s-]?integrity)\b|s\(x\)/i;

/**
 * Code-touching signals -> risk "code": cloud Grok reasoning, draft-with-diff. A roadmap unit,
 * a wiring gap, or anything naming an engine/dispatcher/build is code work. Stem alternatives
 * (migrat/orchestrat/refactor/implement) use `\w*` so every inflection matches -- a trailing `\b`
 * after a stem requires a NON-word char, which the natural forms (migration, orchestrating,
 * refactoring) never have, so those would silently miss (caught by per-file scrutiny arm B).
 */
const CODE_SIGNALS =
  /\b(?:engine|dispatcher|wir(?:e|ing)|build|implement\w*|refactor\w*|migrat\w*|schema|test|fix|bug|regression|route|hook|algorithm|typescript|orchestrat\w*)\b|\.ts\b/i;

/** Per-source default domain when a row omits it. */
const SOURCE_DEFAULT_DOMAIN: Record<WorkSourceUnit["source"], string> = {
  roadmap: "roadmap",
  research: "research",
  wiring: "wiring",
  synthesis: "synthesis",
};

export class HermesWorkSourceFeederEngine {
  static readonly SCHEMA_VERSION = "1.0.0";

  /**
   * Classify a single normalized row. The `wiring` and `synthesis` SOURCES are inherently
   * code/build work; `research` is read-only by source; `roadmap` is classified by its title.
   * Safety signals OVERRIDE everything (the most cautious class wins).
   */
  static classify(unit: WorkSourceUnit): {
    risk: RiskClass;
    lane: "cloud" | "local";
    posture: "plan" | "draft";
    reason: string;
  } {
    const haystack = `${unit.title} ${unit.detail ?? ""} ${unit.milestone ?? ""} ${unit.unit_id}`;

    // 1. Safety dominates -- plan-only, cloud (deep reasoning), regardless of source.
    const safetyMatch = haystack.match(SAFETY_SIGNALS);
    if (safetyMatch) {
      return {
        risk: "safety",
        lane: "cloud",
        posture: "plan",
        reason: `safety-touching signal "${safetyMatch[0]}" -> plan-only (no autonomous draft)`,
      };
    }

    // 2. `research` source is read-only by construction (summarize/wiki/synthesize).
    if (unit.source === "research") {
      return {
        risk: "read-only",
        lane: "local",
        posture: "plan",
        reason: "research/wiki source -> local Ollama summarize, plan-only",
      };
    }

    // 3. `wiring` + `synthesis` sources are code/build work by construction; `roadmap` by title.
    if (unit.source === "wiring" || unit.source === "synthesis") {
      const kind = unit.source === "wiring" ? "wiring-gap" : "synthesis-gap";
      return {
        risk: "code",
        lane: "cloud",
        posture: "draft",
        reason: `${kind} source -> cloud Grok, plan+draft for human review`,
      };
    }
    const codeMatch = haystack.match(CODE_SIGNALS);
    if (codeMatch) {
      return {
        risk: "code",
        lane: "cloud",
        posture: "draft",
        reason: `code-touching signal "${codeMatch[0]}" -> cloud Grok, plan+draft for human review`,
      };
    }

    // 4. No code/safety signal in a roadmap title -> treat as read-only analysis (conservative).
    return {
      risk: "read-only",
      lane: "local",
      posture: "plan",
      reason: "no code/safety signal -> local analysis, plan-only",
    };
  }

  /**
   * Map normalized work-source rows -> a deduped, claim-filtered, risk-classified Subtask[]
   * (<= maxUnits). Pure: no I/O, no spawn. The emitted subtasks are leaves (empty depends_on)
   * so the existing HermesAutonomousDriveRunnerEngine can fan them out in one wave.
   *
   * @throws if `req` is not an object (fail-loud -- a malformed request is a caller bug, not a
   *   silent empty result).
   */
  static toSubtasks(req: unknown): FeederResult {
    if (req === null || typeof req !== "object") {
      throw new Error("HermesWorkSourceFeeder.toSubtasks: request must be an object");
    }
    const v = FeederRequestSchema.parse(req);
    const held = new Set(v.heldClaims);

    let excludedClaimed = 0;
    let excludedMalformed = 0;
    let excludedDuplicate = 0;
    const seen = new Set<string>();
    const out: ClassifiedSubtask[] = [];

    for (const raw of v.sources) {
      // Per-row validate -- a malformed row (NaN id, missing title) is dropped, NOT thrown
      // (one bad source row must not sink the whole feed; the count is surfaced -- R12).
      const parsed = WorkSourceUnitSchema.safeParse(raw);
      if (!parsed.success) {
        excludedMalformed++;
        continue;
      }
      const unit = parsed.data;

      // Claim-dedup: a peer slot owns this unit -> never race it.
      if (held.has(unit.unit_id)) {
        excludedClaimed++;
        continue;
      }

      // Collapse duplicate unit_ids (the same unit can appear in >1 source). First wins.
      if (seen.has(unit.unit_id)) {
        excludedDuplicate++;
        continue;
      }
      seen.add(unit.unit_id);

      if (out.length >= v.maxUnits) continue; // keep counting exclusions, but stop emitting.

      const c = HermesWorkSourceFeederEngine.classify(unit);
      const description = HermesWorkSourceFeederEngine.buildDescription(unit);
      const subtask: Subtask = {
        subtask_id: unit.unit_id.slice(0, 120),
        description,
        domain: (unit.domain ?? SOURCE_DEFAULT_DOMAIN[unit.source]).slice(0, 60),
        depends_on: [], // leaves -- the runner fans them out in one wave.
        size_hint: HermesWorkSourceFeederEngine.sizeHint(description),
      };
      out.push({
        subtask,
        risk: c.risk,
        executor_lane: c.lane,
        posture: c.posture,
        source: unit.source,
        reason: c.reason,
      });
    }

    return {
      subtasks: out,
      excludedClaimed,
      excludedMalformed,
      excludedDuplicate,
      consideredCount: v.sources.length,
    };
  }

  /** Compose the Subtask description from the row's title + milestone + detail (truncated to 2000). */
  private static buildDescription(unit: WorkSourceUnit): string {
    const parts = [unit.title.trim()];
    if (unit.milestone) parts.push(`[milestone: ${unit.milestone}]`);
    if (unit.detail) parts.push(unit.detail.trim());
    return parts.join(" -- ").slice(0, 2000);
  }

  /** Rough size from the description length -- the planner's budget allocator reads size_hint. */
  private static sizeHint(description: string): Subtask["size_hint"] {
    if (description.length < 120) return "short";
    if (description.length < 600) return "medium";
    return "large";
  }
}

export const hermesWorkSourceFeederEngine = new HermesWorkSourceFeederEngine();
