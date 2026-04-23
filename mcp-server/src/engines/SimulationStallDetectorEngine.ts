/**
 * SimulationStallDetectorEngine — LATHE-PROD-READY-MS0/U-LPR-STALL-SIM
 *
 * Watchdog for the lathe-program simulation pipeline. Mirrors the shape
 * of PrintMatchStallDetectorEngine but owns the simulation-specific
 * stage taxonomy + budgets. A simulation that silently hangs (a stuck
 * BVH traversal, a collision set that explodes, a physics solve that
 * enters a tight oscillation) wastes shop-floor operator time — the
 * operator is watching a spinner that'll never turn.
 *
 * This engine converts silent simulation hangs into typed stall events
 * with stage-specific remediation. Keeping it as its own engine (rather
 * than a parameterized base class shared with STALL-PRINTS) keeps the
 * stage enums type-safe and the remediation advice on-target.
 *
 * Stages + budgets
 * ----------------
 *   gcode_parse      5 s    (parse + tokenize the program)
 *   kinematics       10 s   (map axis moves → WCS toolpath)
 *   collision_check  30 s   (BVH traversal against holder + fixture)
 *   physics_validate 20 s   (Kienzle force + thermal + chatter checks)
 *   finalize         5 s    (render scorecard + persist artifacts)
 *
 * Priority ladder is identical to STALL-PRINTS for the machine stages.
 * Simulation has no "human in the loop" stage — all work is automated.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export type SimStage =
  | "gcode_parse"
  | "kinematics"
  | "collision_check"
  | "physics_validate"
  | "finalize";

const SIM_STAGE_BUDGET_MS: Record<SimStage, number> = {
  gcode_parse: 5_000,
  kinematics: 10_000,
  collision_check: 30_000,
  physics_validate: 20_000,
  finalize: 5_000,
};

export type StallPriority = "low" | "medium" | "high" | "critical";

// ============================================================================
// TYPES
// ============================================================================

interface SimJobState {
  job_id: string;
  stage: SimStage;
  entered_stage_at_ms: number;
  last_progress_at_ms: number;
  context: Record<string, unknown>;
}

export interface SimStallEvent {
  job_id: string;
  stage: SimStage;
  stalled_for_ms: number;
  budget_ms: number;
  priority: StallPriority;
  recommended_action: string;
  context: Record<string, unknown>;
}

export interface SimTrackerStats {
  total_tracked: number;
  by_stage: Record<SimStage, number>;
  currently_stalled: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SimulationStallDetectorEngine {
  private readonly _jobs = new Map<string, SimJobState>();

  startTracking(
    job_id: string,
    stage: SimStage,
    now_ms: number,
    context: Record<string, unknown> = {},
  ): void {
    if (!job_id) throw new Error("job_id is required");
    if (!(stage in SIM_STAGE_BUDGET_MS)) {
      throw new Error(`Unknown simulation stage: ${stage}`);
    }
    if (this._jobs.has(job_id)) {
      throw new Error(`Simulation job already tracked: ${job_id}`);
    }
    this._jobs.set(job_id, {
      job_id,
      stage,
      entered_stage_at_ms: now_ms,
      last_progress_at_ms: now_ms,
      context: structuredClone(context),
    });
  }

  markProgress(job_id: string, now_ms: number): void {
    const j = this._jobs.get(job_id);
    if (!j) throw new Error(`Sim job not tracked: ${job_id}`);
    j.last_progress_at_ms = now_ms;
  }

  advanceStage(
    job_id: string,
    from_stage: SimStage,
    to_stage: SimStage,
    now_ms: number,
  ): void {
    const j = this._jobs.get(job_id);
    if (!j) throw new Error(`Sim job not tracked: ${job_id}`);
    if (j.stage !== from_stage) {
      throw new Error(
        `advance mismatch: sim job '${job_id}' is in stage '${j.stage}', not '${from_stage}'`,
      );
    }
    if (!(to_stage in SIM_STAGE_BUDGET_MS)) {
      throw new Error(`Unknown simulation stage: ${to_stage}`);
    }
    j.stage = to_stage;
    j.entered_stage_at_ms = now_ms;
    j.last_progress_at_ms = now_ms;
  }

  completeJob(job_id: string): boolean {
    return this._jobs.delete(job_id);
  }

  scan(now_ms: number): SimStallEvent[] {
    const events: SimStallEvent[] = [];
    for (const j of this._jobs.values()) {
      const stalled = now_ms - j.last_progress_at_ms;
      const budget = SIM_STAGE_BUDGET_MS[j.stage];
      if (stalled > budget) {
        events.push(this._buildEvent(j, stalled, budget));
      }
    }
    events.sort((a, b) => b.stalled_for_ms - a.stalled_for_ms);
    return events;
  }

  scanOne(job_id: string, now_ms: number): SimStallEvent | undefined {
    const j = this._jobs.get(job_id);
    if (!j) return undefined;
    const stalled = now_ms - j.last_progress_at_ms;
    const budget = SIM_STAGE_BUDGET_MS[j.stage];
    if (stalled <= budget) return undefined;
    return this._buildEvent(j, stalled, budget);
  }

  stats(): SimTrackerStats {
    const by_stage: Record<SimStage, number> = {
      gcode_parse: 0,
      kinematics: 0,
      collision_check: 0,
      physics_validate: 0,
      finalize: 0,
    };
    for (const j of this._jobs.values()) by_stage[j.stage]++;
    return {
      total_tracked: this._jobs.size,
      by_stage,
      currently_stalled: 0,
    };
  }

  statsAt(now_ms: number): SimTrackerStats {
    const base = this.stats();
    base.currently_stalled = this.scan(now_ms).length;
    return base;
  }

  trackedIds(): string[] {
    return Array.from(this._jobs.keys());
  }

  clear(): void {
    this._jobs.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────

  private _buildEvent(
    j: SimJobState,
    stalled: number,
    budget: number,
  ): SimStallEvent {
    return {
      job_id: j.job_id,
      stage: j.stage,
      stalled_for_ms: stalled,
      budget_ms: budget,
      priority: this._priorityFor(stalled, budget),
      recommended_action: this._actionFor(j.stage),
      context: structuredClone(j.context),
    };
  }

  private _priorityFor(stalled: number, budget: number): StallPriority {
    const r = stalled / budget;
    if (r > 6) return "critical";
    if (r > 3) return "high";
    if (r > 1.5) return "medium";
    return "low";
  }

  private _actionFor(stage: SimStage): string {
    switch (stage) {
      case "gcode_parse":
        return "Inspect the input G-code for pathological constructs (infinite subroutine recursion, very-long comments). Kill + restart parser worker.";
      case "kinematics":
        return "Check axis-limit polytope coverage. Degenerate rotary cases (singularities) can stall the IK solver — fall back to 3-axis Cartesian.";
      case "collision_check":
        return "BVH traversal exploded — likely a dense fixture geometry or unbalanced tree. Re-index the holder+fixture scene or drop to AABB-only check.";
      case "physics_validate":
        return "Force/thermal model may be oscillating. Clamp iteration count and report approximate results; promote to warn-only for this program.";
      case "finalize":
        return "Artifact writer is blocked — check persistence layer (DB, S3, filesystem). Retry with exponential backoff.";
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const simulationStallDetectorEngine = new SimulationStallDetectorEngine();
