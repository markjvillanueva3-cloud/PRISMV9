/**
 * PrintMatchStallDetectorEngine — LATHE-PROD-READY-MS0/U-LPR-STALL-PRINTS
 *
 * Watchdog for the print-matching pipeline. Prints enter the match queue,
 * advance through stages (ingest → features → similarity → disposition),
 * and emit completion when a matching program is found or a no-match
 * disposition is reached. Anything in between that sits longer than its
 * budget is "stalled" — the pipeline isn't failing, it's just silent.
 *
 * Silent failures in a human-in-the-loop system are worse than loud ones:
 * the operator starts wondering if they mistyped the print, the pipeline
 * never shouts for help, and hours leak. This engine converts silence into
 * a typed escalation payload with the context needed to rescue the job.
 *
 * Semantics
 * ---------
 * - startTracking(job_id, stage): job begins a stage with a timestamp
 * - markProgress(job_id, stage): the stage moved (reset stall clock)
 * - advanceStage(job_id, from_stage, to_stage): stage transition
 * - completeJob(job_id): clean exit — removes from watch list
 * - scan(now_ms): returns all stall events currently active
 *
 * A job is "stalled" when (now - last_progress) > stage_budget_ms for its
 * CURRENT stage. Per-stage budgets are declared constants (tuneable).
 *
 * Engine is PURE — state lives only in its Maps. A future persistence
 * layer can snapshot the state without modifying this engine.
 */

// ============================================================================
// CONSTANTS (per-stage stall budgets)
// ============================================================================

export type MatchStage =
  | "ingest"
  | "feature_extraction"
  | "similarity_search"
  | "candidate_review"
  | "disposition";

/** Stage → milliseconds a job may sit in that stage before being stalled. */
const STAGE_BUDGET_MS: Record<MatchStage, number> = {
  ingest: 10_000,              // 10 s — file read / parse
  feature_extraction: 30_000,  // 30 s — CAD/BOM feature extraction
  similarity_search: 60_000,   // 1 min — kNN against corpus
  candidate_review: 15 * 60 * 1000, // 15 min — human in the loop
  disposition: 30_000,          // 30 s — commit disposition to record
};

/** Escalation priorities. */
export type StallPriority = "low" | "medium" | "high" | "critical";

// ============================================================================
// TYPES
// ============================================================================

interface JobState {
  job_id: string;
  stage: MatchStage;
  entered_stage_at_ms: number;
  last_progress_at_ms: number;
  /** Human context — print id, operator, etc. */
  context: Record<string, unknown>;
}

export interface StallEvent {
  job_id: string;
  stage: MatchStage;
  /** ms since last progress. */
  stalled_for_ms: number;
  /** Configured budget for this stage. */
  budget_ms: number;
  priority: StallPriority;
  recommended_action: string;
  context: Record<string, unknown>;
}

export interface TrackerStats {
  total_tracked: number;
  by_stage: Record<MatchStage, number>;
  currently_stalled: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PrintMatchStallDetectorEngine {
  private readonly _jobs = new Map<string, JobState>();

  /** Start tracking a job. Throws if already tracked. */
  startTracking(
    job_id: string,
    stage: MatchStage,
    now_ms: number,
    context: Record<string, unknown> = {},
  ): void {
    if (!job_id) throw new Error("job_id is required");
    if (!(stage in STAGE_BUDGET_MS)) {
      throw new Error(`Unknown stage: ${stage}`);
    }
    if (this._jobs.has(job_id)) {
      throw new Error(`Job already tracked: ${job_id}`);
    }
    this._jobs.set(job_id, {
      job_id,
      stage,
      entered_stage_at_ms: now_ms,
      last_progress_at_ms: now_ms,
      context: structuredClone(context),
    });
  }

  /** Reset the stall clock for a job that made progress. */
  markProgress(job_id: string, now_ms: number): void {
    const j = this._jobs.get(job_id);
    if (!j) throw new Error(`Job not tracked: ${job_id}`);
    j.last_progress_at_ms = now_ms;
  }

  /** Move a job to the next stage — also resets the stall clock. */
  advanceStage(
    job_id: string,
    from_stage: MatchStage,
    to_stage: MatchStage,
    now_ms: number,
  ): void {
    const j = this._jobs.get(job_id);
    if (!j) throw new Error(`Job not tracked: ${job_id}`);
    if (j.stage !== from_stage) {
      throw new Error(
        `advance mismatch: job '${job_id}' is in stage '${j.stage}', not '${from_stage}'`,
      );
    }
    if (!(to_stage in STAGE_BUDGET_MS)) {
      throw new Error(`Unknown stage: ${to_stage}`);
    }
    j.stage = to_stage;
    j.entered_stage_at_ms = now_ms;
    j.last_progress_at_ms = now_ms;
  }

  /** Remove a job from tracking (clean completion). */
  completeJob(job_id: string): boolean {
    return this._jobs.delete(job_id);
  }

  /** Return all jobs currently stalled. Ordered by stalled_for_ms descending. */
  scan(now_ms: number): StallEvent[] {
    const events: StallEvent[] = [];
    for (const j of this._jobs.values()) {
      const stalled = now_ms - j.last_progress_at_ms;
      const budget = STAGE_BUDGET_MS[j.stage];
      if (stalled > budget) {
        events.push({
          job_id: j.job_id,
          stage: j.stage,
          stalled_for_ms: stalled,
          budget_ms: budget,
          priority: this._priorityFor(j.stage, stalled, budget),
          recommended_action: this._actionFor(j.stage),
          context: structuredClone(j.context),
        });
      }
    }
    events.sort((a, b) => b.stalled_for_ms - a.stalled_for_ms);
    return events;
  }

  /** Lookup stall event for one job (undefined if not stalled / not tracked). */
  scanOne(job_id: string, now_ms: number): StallEvent | undefined {
    const j = this._jobs.get(job_id);
    if (!j) return undefined;
    const stalled = now_ms - j.last_progress_at_ms;
    const budget = STAGE_BUDGET_MS[j.stage];
    if (stalled <= budget) return undefined;
    return {
      job_id: j.job_id,
      stage: j.stage,
      stalled_for_ms: stalled,
      budget_ms: budget,
      priority: this._priorityFor(j.stage, stalled, budget),
      recommended_action: this._actionFor(j.stage),
      context: { ...j.context },
    };
  }

  /** Stats snapshot. */
  stats(): TrackerStats {
    const byStage: Record<MatchStage, number> = {
      ingest: 0,
      feature_extraction: 0,
      similarity_search: 0,
      candidate_review: 0,
      disposition: 0,
    };
    for (const j of this._jobs.values()) byStage[j.stage]++;
    return {
      total_tracked: this._jobs.size,
      by_stage: byStage,
      currently_stalled: 0, // filled by scan() — stats doesn't take now_ms
    };
  }

  /** Stats + live stall count. Pass now_ms to populate currently_stalled. */
  statsAt(now_ms: number): TrackerStats {
    const base = this.stats();
    base.currently_stalled = this.scan(now_ms).length;
    return base;
  }

  /** List tracked job ids — useful for dashboards. */
  trackedIds(): string[] {
    return Array.from(this._jobs.keys());
  }

  /** For testing: reset all tracking. */
  clear(): void {
    this._jobs.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────

  private _priorityFor(
    stage: MatchStage,
    stalled: number,
    budget: number,
  ): StallPriority {
    // Ratio of stalled time to budget — > 1 by definition here.
    const r = stalled / budget;
    // Candidate review has a human in the loop — lower priority for equal r.
    if (stage === "candidate_review") {
      if (r > 4) return "high";
      if (r > 2) return "medium";
      return "low";
    }
    // Machine stages — more aggressive.
    if (r > 6) return "critical";
    if (r > 3) return "high";
    if (r > 1.5) return "medium";
    return "low";
  }

  private _actionFor(stage: MatchStage): string {
    switch (stage) {
      case "ingest":
        return "Check file readability + parser liveness; restart the ingest worker if unresponsive.";
      case "feature_extraction":
        return "Verify CAD/BOM dependencies; fall back to heuristic features if extractor is down.";
      case "similarity_search":
        return "Check kNN index health; re-warm cache or route to degraded mode.";
      case "candidate_review":
        return "Notify operator — review queue is idle. Escalate to supervisor if >1h.";
      case "disposition":
        return "Inspect persistence layer — disposition write is blocked on DB/registry.";
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const printMatchStallDetectorEngine = new PrintMatchStallDetectorEngine();
