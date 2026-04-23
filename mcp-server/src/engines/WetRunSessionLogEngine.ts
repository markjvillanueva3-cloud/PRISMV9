/**
 * WetRunSessionLogEngine (U-LPR-WETRUN-LOG, Delivery B4)
 *
 * Structured runtime log for every authorised wet-run session. Pairs
 * with WetRunAuthorizationEngine: once an auth decision clears, this
 * engine records the lifecycle of the actual run so a post-run review
 * (or a warranty dispute, or a customer audit) can reconstruct exactly
 * what happened without trusting after-the-fact memory.
 *
 * Event types captured:
 *
 *   SESSION_OPEN          — run starts (references auth decision)
 *   SESSION_CLOSE         — run ends (normal or abort)
 *   BLOCK_EXEC            — G-code block executed (N-number, timing)
 *   SPINDLE_OVERRIDE      — operator changed spindle % override
 *   FEED_OVERRIDE         — operator changed feed % override
 *   COOLANT_TOGGLE        — coolant on/off event
 *   PROBE_CYCLE           — probe/touch-off cycle
 *   TOOL_CHANGE           — T# changed
 *   ALARM                 — controller alarm fired
 *   OPERATOR_PAUSE        — cycle stop pressed
 *   OPERATOR_RESUME       — resume pressed
 *   OPERATOR_ABORT        — E-stop / abort
 *   NOTE                  — free-form operator observation
 *
 * Invariants enforced:
 *
 *   - every session has exactly one SESSION_OPEN and at most one
 *     SESSION_CLOSE event. Appending events after CLOSE throws.
 *   - events are ordered strictly by timestamp within a session — any
 *     backwards-in-time append throws to protect downstream metrics.
 *   - every override event carries a scalar value; overrides outside
 *     [0, 200] percent are rejected.
 *   - abort events auto-close the session with outcome="ABORTED".
 *
 * summarise() computes aggregates: total runtime, # overrides per kind,
 * # alarms, longest pause, block execution count.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/WETRUN_SESSION_LOG.json` (schemaVersion 1).
 */

export type WetRunEventKind =
  | "SESSION_OPEN"
  | "SESSION_CLOSE"
  | "BLOCK_EXEC"
  | "SPINDLE_OVERRIDE"
  | "FEED_OVERRIDE"
  | "COOLANT_TOGGLE"
  | "PROBE_CYCLE"
  | "TOOL_CHANGE"
  | "ALARM"
  | "OPERATOR_PAUSE"
  | "OPERATOR_RESUME"
  | "OPERATOR_ABORT"
  | "NOTE";

export type SessionOutcome = "COMPLETED" | "ABORTED" | "IN_PROGRESS";

export interface WetRunEvent {
  seq: number;                  // monotonically increasing within a session
  kind: WetRunEventKind;
  ts: number;                   // epoch ms
  operator?: string;
  n_number?: number;            // G-code block N-number for BLOCK_EXEC
  tool_id?: string;             // for TOOL_CHANGE
  alarm_code?: string;          // for ALARM
  override_percent?: number;    // for SPINDLE_OVERRIDE / FEED_OVERRIDE
  coolant_on?: boolean;         // for COOLANT_TOGGLE
  note?: string;
}

export interface SessionOpen {
  session_id: string;
  auth_decision_id: string;     // reference to WetRunAuthorization log
  operator: string;
  opened_at: number;
  machine_id: string;
  program_id: string;
}

export interface SessionRecord {
  session_id: string;
  auth_decision_id: string;
  operator: string;
  opened_at: number;
  closed_at?: number;
  closed_outcome: SessionOutcome;
  machine_id: string;
  program_id: string;
  events: WetRunEvent[];
  next_seq: number;
}

export interface SessionSummary {
  session_id: string;
  outcome: SessionOutcome;
  duration_ms: number;
  block_count: number;
  spindle_override_events: number;
  feed_override_events: number;
  coolant_toggle_events: number;
  tool_change_count: number;
  alarm_count: number;
  alarm_codes: string[];
  pause_count: number;
  longest_pause_ms: number;
  abort_event?: WetRunEvent;
}

export class WetRunSessionLogEngine {
  private sessions = new Map<string, SessionRecord>();

  openSession(input: SessionOpen): SessionRecord {
    if (!input.session_id.trim()) throw new Error("session_id required");
    if (!input.auth_decision_id.trim()) {
      throw new Error("auth_decision_id required");
    }
    if (!input.operator.trim()) throw new Error("operator required");
    if (!input.machine_id.trim()) throw new Error("machine_id required");
    if (!input.program_id.trim()) throw new Error("program_id required");
    if (!Number.isFinite(input.opened_at) || input.opened_at <= 0) {
      throw new Error("opened_at must be a positive epoch-ms");
    }
    if (this.sessions.has(input.session_id)) {
      throw new Error(`session ${input.session_id} already open`);
    }
    const rec: SessionRecord = {
      session_id: input.session_id.trim(),
      auth_decision_id: input.auth_decision_id.trim(),
      operator: input.operator.trim(),
      opened_at: input.opened_at,
      closed_outcome: "IN_PROGRESS",
      machine_id: input.machine_id.trim(),
      program_id: input.program_id.trim(),
      events: [
        {
          seq: 0,
          kind: "SESSION_OPEN",
          ts: input.opened_at,
          operator: input.operator.trim(),
        },
      ],
      next_seq: 1,
    };
    this.sessions.set(rec.session_id, rec);
    return this.snapshot(rec);
  }

  append(
    session_id: string,
    event: Omit<WetRunEvent, "seq">,
  ): WetRunEvent {
    const s = this.mustFind(session_id);
    if (s.closed_at !== undefined) {
      throw new Error(`session ${session_id} is closed`);
    }
    if (event.kind === "SESSION_OPEN") {
      throw new Error("SESSION_OPEN can only be emitted by openSession()");
    }
    if (event.kind === "SESSION_CLOSE") {
      throw new Error(
        "SESSION_CLOSE must be emitted via closeSession() — do not append directly",
      );
    }
    if (!Number.isFinite(event.ts) || event.ts <= 0) {
      throw new Error("ts must be a positive epoch-ms");
    }
    const last = s.events[s.events.length - 1];
    if (event.ts < last.ts) {
      throw new Error(
        `event ts ${event.ts} precedes last event ts ${last.ts}`,
      );
    }
    if (
      (event.kind === "SPINDLE_OVERRIDE" || event.kind === "FEED_OVERRIDE")
    ) {
      if (event.override_percent === undefined) {
        throw new Error(`${event.kind} requires override_percent`);
      }
      if (event.override_percent < 0 || event.override_percent > 200) {
        throw new Error(
          `override_percent must be within [0, 200], got ${event.override_percent}`,
        );
      }
    }
    if (event.kind === "TOOL_CHANGE" && !event.tool_id?.trim()) {
      throw new Error("TOOL_CHANGE requires tool_id");
    }
    if (event.kind === "ALARM" && !event.alarm_code?.trim()) {
      throw new Error("ALARM requires alarm_code");
    }
    if (event.kind === "BLOCK_EXEC" && event.n_number === undefined) {
      throw new Error("BLOCK_EXEC requires n_number");
    }
    if (event.kind === "COOLANT_TOGGLE" && event.coolant_on === undefined) {
      throw new Error("COOLANT_TOGGLE requires coolant_on");
    }
    const full: WetRunEvent = { ...event, seq: s.next_seq };
    s.events.push(full);
    s.next_seq += 1;
    if (event.kind === "OPERATOR_ABORT") {
      s.closed_at = event.ts;
      s.closed_outcome = "ABORTED";
      s.events.push({
        seq: s.next_seq,
        kind: "SESSION_CLOSE",
        ts: event.ts,
        operator: event.operator,
        note: "auto-close on OPERATOR_ABORT",
      });
      s.next_seq += 1;
    }
    return { ...full };
  }

  closeSession(input: {
    session_id: string;
    closed_at: number;
    closed_by: string;
    outcome: "COMPLETED" | "ABORTED";
    note?: string;
  }): SessionRecord {
    const s = this.mustFind(input.session_id);
    if (s.closed_at !== undefined) {
      throw new Error(`session ${input.session_id} already closed`);
    }
    if (!input.closed_by.trim()) throw new Error("closed_by required");
    const last = s.events[s.events.length - 1];
    if (input.closed_at < last.ts) {
      throw new Error("closed_at cannot precede last event ts");
    }
    s.closed_at = input.closed_at;
    s.closed_outcome = input.outcome;
    s.events.push({
      seq: s.next_seq,
      kind: "SESSION_CLOSE",
      ts: input.closed_at,
      operator: input.closed_by.trim(),
      note: input.note?.trim() || undefined,
    });
    s.next_seq += 1;
    return this.snapshot(s);
  }

  summarise(session_id: string): SessionSummary {
    const s = this.mustFind(session_id);
    let blockCount = 0;
    let spindleOv = 0;
    let feedOv = 0;
    let coolantToggles = 0;
    let toolChanges = 0;
    let alarmCount = 0;
    const alarmCodes: string[] = [];
    let pauseCount = 0;
    let longestPause = 0;
    let pauseStart: number | null = null;
    let abortEvent: WetRunEvent | undefined;

    for (const e of s.events) {
      switch (e.kind) {
        case "BLOCK_EXEC":
          blockCount += 1;
          break;
        case "SPINDLE_OVERRIDE":
          spindleOv += 1;
          break;
        case "FEED_OVERRIDE":
          feedOv += 1;
          break;
        case "COOLANT_TOGGLE":
          coolantToggles += 1;
          break;
        case "TOOL_CHANGE":
          toolChanges += 1;
          break;
        case "ALARM":
          alarmCount += 1;
          if (e.alarm_code && !alarmCodes.includes(e.alarm_code)) {
            alarmCodes.push(e.alarm_code);
          }
          break;
        case "OPERATOR_PAUSE":
          pauseCount += 1;
          pauseStart = e.ts;
          break;
        case "OPERATOR_RESUME":
          if (pauseStart !== null) {
            const dur = e.ts - pauseStart;
            if (dur > longestPause) longestPause = dur;
            pauseStart = null;
          }
          break;
        case "OPERATOR_ABORT":
          abortEvent = e;
          break;
      }
    }
    // pause that never resolved: count duration up to close/now
    if (pauseStart !== null) {
      const end = s.closed_at ?? s.events[s.events.length - 1].ts;
      const dur = end - pauseStart;
      if (dur > longestPause) longestPause = dur;
    }

    const duration = (s.closed_at ?? s.events[s.events.length - 1].ts) - s.opened_at;
    return {
      session_id: s.session_id,
      outcome: s.closed_outcome,
      duration_ms: duration,
      block_count: blockCount,
      spindle_override_events: spindleOv,
      feed_override_events: feedOv,
      coolant_toggle_events: coolantToggles,
      tool_change_count: toolChanges,
      alarm_count: alarmCount,
      alarm_codes: alarmCodes,
      pause_count: pauseCount,
      longest_pause_ms: longestPause,
      abort_event: abortEvent ? { ...abortEvent } : undefined,
    };
  }

  getSession(session_id: string): SessionRecord | null {
    const s = this.sessions.get(session_id);
    return s ? this.snapshot(s) : null;
  }

  listSessions(filter?: {
    outcome?: SessionOutcome;
    operator?: string;
  }): SessionRecord[] {
    const out: SessionRecord[] = [];
    for (const s of this.sessions.values()) {
      if (filter?.outcome && s.closed_outcome !== filter.outcome) continue;
      if (filter?.operator && s.operator !== filter.operator) continue;
      out.push(this.snapshot(s));
    }
    return out;
  }

  toSnapshot(): { schemaVersion: 1; sessions: SessionRecord[] } {
    return { schemaVersion: 1, sessions: this.listSessions() };
  }

  loadSnapshot(snap: { schemaVersion: number; sessions: SessionRecord[] }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.sessions.clear();
    for (const s of snap.sessions) {
      this.sessions.set(s.session_id, {
        ...s,
        events: s.events.map((e) => ({ ...e })),
      });
    }
  }

  clearAll(): void {
    this.sessions.clear();
  }

  private mustFind(id: string): SessionRecord {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`session ${id} not found`);
    return s;
  }

  private snapshot(s: SessionRecord): SessionRecord {
    return {
      ...s,
      events: s.events.map((e) => ({ ...e })),
    };
  }
}

export const wetRunSessionLogEngine = new WetRunSessionLogEngine();
