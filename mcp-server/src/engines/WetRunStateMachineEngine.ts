/**
 * WetRunStateMachineEngine (U-LPR-WETRUN-FSM)
 *
 * Explicit state machine for JM-Die pilot wet runs. Governs transitions
 * between WET_PASS, WET_SOFT_FAIL, WET_HARD_FAIL, and QUARANTINE states
 * based on scrap counts and safety events. All transitions are recorded
 * with timestamps and evidence for post-mortem audit.
 *
 * State rules (from LATHE-PROD-READY-MS0-PLAN Phase-8 — Prod B1):
 *
 *   WET_PASS          — 0 scrapped parts, 0 safety events. Session ready.
 *   WET_SOFT_FAIL     — ≤1 scrapped part, 0 safety events. Requires
 *                       root-cause analysis + patch to Phase-4 corpus +
 *                       re-sim + re-wet before advancing.
 *   WET_HARD_FAIL     — ≥2 scrapped parts OR any safety event (kill-switch
 *                       trip, collision, workholding breach). Forces
 *                       corpus-only quarantine for 5 days minimum.
 *   QUARANTINE        — 5-day post-mortem hold. Exit requires auth +
 *                       post-mortem document + remediation plan.
 *   RESOLVED          — Terminal state after successful re-wet or
 *                       quarantine clearance.
 *
 * Safety event = anything from SafetyBlockError family, kill-switch L1/L2
 * trip, workholding slip (safety factor < 1.5), or spindle_power/torque
 * overrun > 110% for >500ms.
 *
 * Quarantine minimum = 5 days (5 × 24 × 60 × 60 × 1000 = 432,000,000 ms).
 */

export type WetRunState =
  | "WET_PASS"
  | "WET_SOFT_FAIL"
  | "WET_HARD_FAIL"
  | "QUARANTINE"
  | "RESOLVED";

export type SafetyEventKind =
  | "kill_switch_l1"
  | "kill_switch_l2"
  | "collision"
  | "workholding_slip"
  | "spindle_overrun"
  | "tool_breakage"
  | "other";

export interface WetRunSession {
  session_id: string;
  tenant_id: string;
  part_id: string;
  machine_id: string;
  operator: string;
  state: WetRunState;
  created_at: number;
  updated_at: number;
  scrap_count: number;
  safety_event_count: number;
  total_parts_attempted: number;
  quarantine_started_at?: number;
  quarantine_cleared_at?: number;
  resolution?: "advance" | "rerun" | "abort";
  resolution_notes?: string;
}

export interface ScrapEvent {
  session_id: string;
  recorded_at: number;
  part_sequence: number;
  root_cause: string;
  corpus_patch_id?: string;
}

export interface SafetyEvent {
  session_id: string;
  recorded_at: number;
  kind: SafetyEventKind;
  severity: "critical" | "high" | "medium";
  detail: string;
}

export interface StateTransition {
  session_id: string;
  from_state: WetRunState;
  to_state: WetRunState;
  transitioned_at: number;
  trigger: string;
  evidence_ref?: string;
}

export interface PostMortemRecord {
  session_id: string;
  authored_at: number;
  authored_by: string;
  root_cause: string;
  remediation: string;
  corpus_patch_id?: string;
  approved_by: string[];
}

export interface QuarantineClearance {
  session_id: string;
  cleared_at: number;
  authorized_by: string;
  post_mortem_ref: string;
  runbook_completed: boolean;
  evidence: string;
}

const QUARANTINE_MIN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
const REQUIRED_APPROVERS_FOR_POST_MORTEM = 2;

/**
 * WetRunStateMachineEngine — finite state machine for JM Die pilot sessions.
 */
export class WetRunStateMachineEngine {
  private sessions = new Map<string, WetRunSession>();
  private scrapEvents: ScrapEvent[] = [];
  private safetyEvents: SafetyEvent[] = [];
  private transitions: StateTransition[] = [];
  private postMortems = new Map<string, PostMortemRecord>();
  private clearances: QuarantineClearance[] = [];

  // ───────────────────────────────────────────────────────────────
  // Session lifecycle
  // ───────────────────────────────────────────────────────────────

  /** Start a new wet-run session in the WET_PASS state (optimistic). */
  startSession(input: {
    session_id: string;
    tenant_id: string;
    part_id: string;
    machine_id: string;
    operator: string;
    now?: number;
  }): WetRunSession {
    if (!input.session_id.trim()) throw new Error("session_id required");
    if (!input.tenant_id.trim()) throw new Error("tenant_id required");
    if (this.sessions.has(input.session_id)) {
      throw new Error(`session already exists: ${input.session_id}`);
    }
    const now = input.now ?? Date.now();
    const session: WetRunSession = {
      session_id: input.session_id,
      tenant_id: input.tenant_id,
      part_id: input.part_id,
      machine_id: input.machine_id,
      operator: input.operator,
      state: "WET_PASS",
      created_at: now,
      updated_at: now,
      scrap_count: 0,
      safety_event_count: 0,
      total_parts_attempted: 0,
    };
    this.sessions.set(input.session_id, session);
    return { ...session };
  }

  getSession(session_id: string): WetRunSession {
    const s = this.sessions.get(session_id);
    if (!s) throw new Error(`session not found: ${session_id}`);
    return { ...s };
  }

  listSessions(filter?: { state?: WetRunState; tenant_id?: string }): WetRunSession[] {
    const all = Array.from(this.sessions.values());
    return all
      .filter((s) => !filter?.state || s.state === filter.state)
      .filter((s) => !filter?.tenant_id || s.tenant_id === filter.tenant_id)
      .map((s) => ({ ...s }))
      .sort((a, b) => b.updated_at - a.updated_at);
  }

  // ───────────────────────────────────────────────────────────────
  // Event recording
  // ───────────────────────────────────────────────────────────────

  /** Record a completed part (pass or scrap). Auto-transitions state. */
  recordPartOutcome(input: {
    session_id: string;
    passed: boolean;
    root_cause?: string;
    now?: number;
  }): { session: WetRunSession; transitioned: boolean } {
    const s = this.sessions.get(input.session_id);
    if (!s) throw new Error(`session not found: ${input.session_id}`);
    if (s.state === "QUARANTINE" || s.state === "RESOLVED") {
      throw new Error(`session in terminal state ${s.state} — cannot record outcome`);
    }
    const now = input.now ?? Date.now();
    s.total_parts_attempted += 1;
    s.updated_at = now;

    if (!input.passed) {
      if (!input.root_cause || input.root_cause.trim().length < 10) {
        throw new Error("scrap event requires root_cause (≥10 chars)");
      }
      s.scrap_count += 1;
      this.scrapEvents.push({
        session_id: s.session_id,
        recorded_at: now,
        part_sequence: s.total_parts_attempted,
        root_cause: input.root_cause.trim(),
      });
    }

    const transitioned = this.reevaluateState(s, now, input.passed ? "part_passed" : "part_scrapped");
    this.sessions.set(s.session_id, s);
    return { session: { ...s }, transitioned };
  }

  /** Record a safety event — any event forces WET_HARD_FAIL → QUARANTINE. */
  recordSafetyEvent(input: {
    session_id: string;
    kind: SafetyEventKind;
    severity: "critical" | "high" | "medium";
    detail: string;
    now?: number;
  }): { session: WetRunSession; transitioned: boolean } {
    const s = this.sessions.get(input.session_id);
    if (!s) throw new Error(`session not found: ${input.session_id}`);
    if (s.state === "RESOLVED") {
      throw new Error("session is RESOLVED — cannot record new safety event");
    }
    if (!input.detail || input.detail.trim().length < 10) {
      throw new Error("safety event requires detail (≥10 chars)");
    }
    const now = input.now ?? Date.now();
    s.safety_event_count += 1;
    s.updated_at = now;
    this.safetyEvents.push({
      session_id: s.session_id,
      recorded_at: now,
      kind: input.kind,
      severity: input.severity,
      detail: input.detail.trim(),
    });
    const transitioned = this.reevaluateState(s, now, `safety_${input.kind}`);
    this.sessions.set(s.session_id, s);
    return { session: { ...s }, transitioned };
  }

  // ───────────────────────────────────────────────────────────────
  // State machine
  // ───────────────────────────────────────────────────────────────

  private reevaluateState(s: WetRunSession, now: number, trigger: string): boolean {
    const prev = s.state;
    let next: WetRunState = prev;

    // Terminal states don't re-evaluate.
    if (prev === "QUARANTINE" || prev === "RESOLVED") return false;

    // ≥2 scrap OR any safety event → WET_HARD_FAIL → QUARANTINE
    if (s.safety_event_count > 0 || s.scrap_count >= 2) {
      next = "WET_HARD_FAIL";
    } else if (s.scrap_count === 1) {
      next = "WET_SOFT_FAIL";
    } else {
      next = "WET_PASS";
    }

    if (next !== prev) {
      this.transitions.push({
        session_id: s.session_id,
        from_state: prev,
        to_state: next,
        transitioned_at: now,
        trigger,
      });
      s.state = next;
      // WET_HARD_FAIL auto-enters QUARANTINE immediately.
      if (next === "WET_HARD_FAIL") {
        s.quarantine_started_at = now;
        s.state = "QUARANTINE";
        this.transitions.push({
          session_id: s.session_id,
          from_state: "WET_HARD_FAIL",
          to_state: "QUARANTINE",
          transitioned_at: now,
          trigger: "auto_quarantine_on_hard_fail",
        });
      }
      return true;
    }
    return false;
  }

  /** Record the formal post-mortem doc for a QUARANTINE session. */
  submitPostMortem(input: {
    session_id: string;
    authored_by: string;
    root_cause: string;
    remediation: string;
    corpus_patch_id?: string;
    approvers: string[];
    now?: number;
  }): PostMortemRecord {
    const s = this.sessions.get(input.session_id);
    if (!s) throw new Error(`session not found: ${input.session_id}`);
    if (s.state !== "QUARANTINE") {
      throw new Error(`post-mortem requires QUARANTINE state — current: ${s.state}`);
    }
    if (!input.authored_by.trim()) throw new Error("authored_by required");
    if ((input.root_cause ?? "").trim().length < 20) {
      throw new Error("root_cause too short (≥20 chars)");
    }
    if ((input.remediation ?? "").trim().length < 20) {
      throw new Error("remediation too short (≥20 chars)");
    }
    const uniqueApprovers = Array.from(new Set(input.approvers.map((a) => a.trim()).filter(Boolean)));
    if (uniqueApprovers.length < REQUIRED_APPROVERS_FOR_POST_MORTEM) {
      throw new Error(
        `post-mortem requires ≥${REQUIRED_APPROVERS_FOR_POST_MORTEM} distinct approvers (got ${uniqueApprovers.length})`,
      );
    }
    const now = input.now ?? Date.now();
    const rec: PostMortemRecord = {
      session_id: input.session_id,
      authored_at: now,
      authored_by: input.authored_by.trim(),
      root_cause: input.root_cause.trim(),
      remediation: input.remediation.trim(),
      corpus_patch_id: input.corpus_patch_id,
      approved_by: uniqueApprovers,
    };
    this.postMortems.set(input.session_id, rec);
    return { ...rec };
  }

  /** Clear a session out of QUARANTINE. Requires post-mortem + 5-day hold. */
  clearQuarantine(input: {
    session_id: string;
    authorized_by: string;
    evidence: string;
    runbook_completed: boolean;
    now?: number;
  }): { session: WetRunSession; clearance: QuarantineClearance } {
    const s = this.sessions.get(input.session_id);
    if (!s) throw new Error(`session not found: ${input.session_id}`);
    if (s.state !== "QUARANTINE") {
      throw new Error(`clear_quarantine requires QUARANTINE state — current: ${s.state}`);
    }
    if (!s.quarantine_started_at) {
      throw new Error("missing quarantine_started_at");
    }
    const now = input.now ?? Date.now();
    const elapsed = now - s.quarantine_started_at;
    if (elapsed < QUARANTINE_MIN_MS) {
      throw new Error(
        `quarantine minimum 5 days not met — elapsed ${Math.floor(elapsed / (60 * 60 * 1000))}h of 120h`,
      );
    }
    if (!this.postMortems.has(input.session_id)) {
      throw new Error("post-mortem not submitted — cannot clear quarantine");
    }
    if (!input.authorized_by.trim()) throw new Error("authorized_by required");
    if ((input.evidence ?? "").trim().length < 10) {
      throw new Error("evidence too short (≥10 chars)");
    }
    const clearance: QuarantineClearance = {
      session_id: input.session_id,
      cleared_at: now,
      authorized_by: input.authorized_by.trim(),
      post_mortem_ref: input.session_id,
      runbook_completed: !!input.runbook_completed,
      evidence: input.evidence.trim(),
    };
    this.clearances.push(clearance);
    s.state = "RESOLVED";
    s.quarantine_cleared_at = now;
    s.updated_at = now;
    this.transitions.push({
      session_id: input.session_id,
      from_state: "QUARANTINE",
      to_state: "RESOLVED",
      transitioned_at: now,
      trigger: "quarantine_cleared",
    });
    this.sessions.set(s.session_id, s);
    return { session: { ...s }, clearance: { ...clearance } };
  }

  /** Resolve a non-quarantine session (advance after soft-fail retry, etc). */
  resolveSession(input: {
    session_id: string;
    resolution: "advance" | "rerun" | "abort";
    notes: string;
    now?: number;
  }): WetRunSession {
    const s = this.sessions.get(input.session_id);
    if (!s) throw new Error(`session not found: ${input.session_id}`);
    if (s.state === "RESOLVED") throw new Error("already RESOLVED");
    if (s.state === "QUARANTINE") {
      throw new Error("use clearQuarantine for QUARANTINE sessions");
    }
    if ((input.notes ?? "").trim().length < 10) {
      throw new Error("notes too short (≥10 chars)");
    }
    const now = input.now ?? Date.now();
    const prev = s.state;
    s.state = "RESOLVED";
    s.resolution = input.resolution;
    s.resolution_notes = input.notes.trim();
    s.updated_at = now;
    this.transitions.push({
      session_id: s.session_id,
      from_state: prev,
      to_state: "RESOLVED",
      transitioned_at: now,
      trigger: `resolve_${input.resolution}`,
    });
    this.sessions.set(s.session_id, s);
    return { ...s };
  }

  // ───────────────────────────────────────────────────────────────
  // Audit queries
  // ───────────────────────────────────────────────────────────────

  listTransitions(filter?: { session_id?: string; since?: number }): StateTransition[] {
    return this.transitions
      .filter((t) => !filter?.session_id || t.session_id === filter.session_id)
      .filter((t) => filter?.since === undefined || t.transitioned_at >= filter.since)
      .slice()
      .sort((a, b) => a.transitioned_at - b.transitioned_at);
  }

  listScrapEvents(session_id?: string): ScrapEvent[] {
    return this.scrapEvents.filter((e) => !session_id || e.session_id === session_id).slice();
  }

  listSafetyEvents(session_id?: string): SafetyEvent[] {
    return this.safetyEvents.filter((e) => !session_id || e.session_id === session_id).slice();
  }

  getPostMortem(session_id: string): PostMortemRecord | null {
    const r = this.postMortems.get(session_id);
    return r ? { ...r } : null;
  }

  listClearances(): QuarantineClearance[] {
    return this.clearances.slice();
  }

  getStats(): {
    total_sessions: number;
    by_state: Record<WetRunState, number>;
    total_scrap: number;
    total_safety_events: number;
    hard_fail_rate: number;
    post_mortem_count: number;
    quarantine_clearance_count: number;
  } {
    const by_state: Record<WetRunState, number> = {
      WET_PASS: 0,
      WET_SOFT_FAIL: 0,
      WET_HARD_FAIL: 0,
      QUARANTINE: 0,
      RESOLVED: 0,
    };
    for (const s of this.sessions.values()) by_state[s.state] += 1;
    const total = this.sessions.size;
    const hardFailTransitions = this.transitions.filter(
      (t) => t.to_state === "WET_HARD_FAIL" || t.to_state === "QUARANTINE",
    ).length;
    return {
      total_sessions: total,
      by_state,
      total_scrap: this.scrapEvents.length,
      total_safety_events: this.safetyEvents.length,
      hard_fail_rate: total === 0 ? 0 : hardFailTransitions / total,
      post_mortem_count: this.postMortems.size,
      quarantine_clearance_count: this.clearances.length,
    };
  }

  clearAll(): void {
    this.sessions.clear();
    this.scrapEvents.length = 0;
    this.safetyEvents.length = 0;
    this.transitions.length = 0;
    this.postMortems.clear();
    this.clearances.length = 0;
  }
}

export const wetRunStateMachineEngine = new WetRunStateMachineEngine();
