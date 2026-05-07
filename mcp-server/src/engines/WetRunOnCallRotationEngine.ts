/**
 * WetRunOnCallRotationEngine
 * ------------------------------------------------------------
 * Contiguous on-call rotation + escalation ladder for wet-run
 * pilot abort response. When an abort page fires from
 * WetRunSessionLogEngine or BlamelessPostMortemEngine, the
 * current shift's primary responder is paged. If the primary
 * does not acknowledge within ack_window_ms, the page escalates
 * to the secondary. If the secondary does not acknowledge
 * within secondary_window_ms, the page walks the escalation
 * ladder in order until someone acknowledges.
 *
 * Shifts are strictly contiguous: every new shift must start
 * exactly where the previous one ended. This prevents
 * accidental coverage gaps. Primary and secondary must differ,
 * and the escalation ladder cannot contain either of them.
 *
 * Swaps are recorded with an audit trail: the swap endpoint
 * must be inside the shift window, must name an approver
 * distinct from the swap initiator, and must carry a reason
 * of at least 30 characters.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-ONCALL
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_ACK_WINDOW_MS = 60_000; // 1 minute
const MAX_ACK_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours
const DEFAULT_PRIMARY_WINDOW_MS = 15 * 60_000;
const DEFAULT_SECONDARY_WINDOW_MS = 15 * 60_000;
const DEFAULT_LADDER_WINDOW_MS = 30 * 60_000;

const MIN_SWAP_REASON_CHARS = 30;

// ============================================================================
// Types
// ============================================================================

export type PageStage =
  | "primary"
  | "secondary"
  | "ladder" // one of the ladder positions
  | "acknowledged"
  | "expired";

export interface Shift {
  shift_id: string;
  start_ts: number;
  end_ts: number; // exclusive
  primary: string;
  secondary: string;
  ladder: string[]; // ordered escalation after secondary
  ack_window_ms: number; // for primary
  secondary_window_ms: number; // additional window for secondary
  ladder_window_ms: number; // additional window for each ladder step
}

export interface ShiftInput {
  shift_id: string;
  start_ts: number;
  end_ts: number;
  primary: string;
  secondary: string;
  ladder?: string[];
  ack_window_ms?: number;
  secondary_window_ms?: number;
  ladder_window_ms?: number;
}

export interface SwapRecord {
  swap_id: string;
  shift_id: string;
  role: "primary" | "secondary";
  from_person: string;
  to_person: string;
  initiated_by: string;
  approved_by: string;
  reason: string;
  ts: number;
}

export interface Page {
  page_id: string;
  pilot_id: string;
  shift_id: string;
  reason: string;
  ts: number;
  current_stage: PageStage;
  current_responder: string | null;
  stage_entered_at: number;
  stage_deadline: number;
  acknowledged_by?: string;
  ack_ts?: number;
  ladder_position: number; // 0-based index into ladder; -1 when not yet on ladder
}

export interface EscalationNote {
  page_id: string;
  pilot_id: string;
  shift_id: string;
  previous_stage: PageStage;
  next_stage: PageStage;
  next_responder: string | null;
  escalated_at: number;
  next_deadline: number;
}

export interface Snapshot {
  schemaVersion: 1;
  shifts: Shift[];
  swaps: SwapRecord[];
  pages: Page[];
}

// ============================================================================
// Helper (defeats TypeScript control-flow narrowing in the sweep loop)
// ============================================================================

function readStage(page: Page): PageStage {
  return page.current_stage;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunOnCallRotationEngine {
  private shifts: Shift[] = []; // kept sorted by start_ts
  private swaps: SwapRecord[] = [];
  private pages: Page[] = [];
  private pageCounter = 0;
  private swapCounter = 0;

  // --------------------------------------------------------------------
  // configureShift — append a single shift contiguous with the last one
  // --------------------------------------------------------------------
  configureShift(input: ShiftInput): Shift {
    this.validateShiftInput(input);

    // contiguity: start must equal prior end (unless empty)
    if (this.shifts.length > 0) {
      const last = this.shifts[this.shifts.length - 1]!;
      if (input.start_ts !== last.end_ts) {
        throw new Error(
          `shift ${input.shift_id} must start where previous ended: expected ${last.end_ts}, got ${input.start_ts}`,
        );
      }
    }
    if (this.shifts.some((s) => s.shift_id === input.shift_id)) {
      throw new Error(`duplicate shift_id: ${input.shift_id}`);
    }

    const shift: Shift = {
      shift_id: input.shift_id,
      start_ts: input.start_ts,
      end_ts: input.end_ts,
      primary: input.primary,
      secondary: input.secondary,
      ladder: input.ladder ? [...input.ladder] : [],
      ack_window_ms: input.ack_window_ms ?? DEFAULT_PRIMARY_WINDOW_MS,
      secondary_window_ms:
        input.secondary_window_ms ?? DEFAULT_SECONDARY_WINDOW_MS,
      ladder_window_ms: input.ladder_window_ms ?? DEFAULT_LADDER_WINDOW_MS,
    };
    this.shifts.push(shift);
    return { ...shift, ladder: [...shift.ladder] };
  }

  // --------------------------------------------------------------------
  // currentShift — find the shift active at ts
  // --------------------------------------------------------------------
  currentShift(ts: number): Shift | undefined {
    if (!Number.isFinite(ts)) throw new Error(`ts must be finite`);
    const s = this.shifts.find((s) => ts >= s.start_ts && ts < s.end_ts);
    return s ? { ...s, ladder: [...s.ladder] } : undefined;
  }

  // --------------------------------------------------------------------
  // swap — record a swap for a shift (role primary or secondary)
  // --------------------------------------------------------------------
  swap(input: {
    shift_id: string;
    role: "primary" | "secondary";
    from_person: string;
    to_person: string;
    initiated_by: string;
    approved_by: string;
    reason: string;
    ts: number;
  }): SwapRecord {
    const shift = this.shifts.find((s) => s.shift_id === input.shift_id);
    if (!shift) throw new Error(`unknown shift: ${input.shift_id}`);
    if (!Number.isFinite(input.ts)) throw new Error(`ts must be finite`);
    if (input.ts < shift.start_ts || input.ts >= shift.end_ts) {
      throw new Error(
        `swap ts ${input.ts} outside shift window [${shift.start_ts}, ${shift.end_ts})`,
      );
    }
    if (input.role !== "primary" && input.role !== "secondary") {
      throw new Error(`invalid role: ${input.role}`);
    }
    const current = input.role === "primary" ? shift.primary : shift.secondary;
    if (current !== input.from_person) {
      throw new Error(
        `from_person ${input.from_person} does not hold ${input.role} role (current: ${current})`,
      );
    }
    if (input.from_person === input.to_person) {
      throw new Error(`to_person must differ from from_person`);
    }
    if (input.initiated_by === input.approved_by) {
      throw new Error(`approver must differ from initiator`);
    }
    if (!input.reason || input.reason.trim().length < MIN_SWAP_REASON_CHARS) {
      throw new Error(
        `swap reason must be at least ${MIN_SWAP_REASON_CHARS} characters`,
      );
    }
    // to_person cannot collide with the other role or the ladder
    const otherRoleHolder =
      input.role === "primary" ? shift.secondary : shift.primary;
    if (otherRoleHolder === input.to_person) {
      throw new Error(
        `to_person already holds the other role for this shift`,
      );
    }
    if (shift.ladder.includes(input.to_person)) {
      throw new Error(`to_person is already on the escalation ladder`);
    }

    if (input.role === "primary") shift.primary = input.to_person;
    else shift.secondary = input.to_person;

    this.swapCounter += 1;
    const record: SwapRecord = {
      swap_id: `swap:${this.swapCounter.toString().padStart(6, "0")}`,
      shift_id: shift.shift_id,
      role: input.role,
      from_person: input.from_person,
      to_person: input.to_person,
      initiated_by: input.initiated_by,
      approved_by: input.approved_by,
      reason: input.reason.trim(),
      ts: input.ts,
    };
    this.swaps.push(record);
    return { ...record };
  }

  // --------------------------------------------------------------------
  // page — create a page during the active shift
  // --------------------------------------------------------------------
  page(input: { pilot_id: string; reason: string; ts: number }): Page {
    if (!input.pilot_id || input.pilot_id.trim().length === 0) {
      throw new Error(`pilot_id required`);
    }
    if (!Number.isFinite(input.ts)) throw new Error(`ts must be finite`);
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error(`page reason must be at least 10 characters`);
    }
    const shift = this.currentShift(input.ts);
    if (!shift) {
      throw new Error(`no active shift at ts=${input.ts}`);
    }
    this.pageCounter += 1;
    const page: Page = {
      page_id: `page:${this.pageCounter.toString().padStart(6, "0")}`,
      pilot_id: input.pilot_id,
      shift_id: shift.shift_id,
      reason: input.reason.trim(),
      ts: input.ts,
      current_stage: "primary",
      current_responder: shift.primary,
      stage_entered_at: input.ts,
      stage_deadline: input.ts + shift.ack_window_ms,
      ladder_position: -1,
    };
    this.pages.push(page);
    return { ...page };
  }

  // --------------------------------------------------------------------
  // acknowledge — responder acknowledges a page
  // --------------------------------------------------------------------
  acknowledge(input: {
    page_id: string;
    responder: string;
    ts: number;
  }): Page {
    const page = this.pages.find((p) => p.page_id === input.page_id);
    if (!page) throw new Error(`unknown page: ${input.page_id}`);
    if (page.current_stage === "acknowledged") {
      throw new Error(`page already acknowledged: ${input.page_id}`);
    }
    if (page.current_stage === "expired") {
      throw new Error(
        `page expired (no ladder member acknowledged): ${input.page_id}`,
      );
    }
    if (!Number.isFinite(input.ts)) throw new Error(`ts must be finite`);
    if (input.ts < page.stage_entered_at) {
      throw new Error(
        `ack ts ${input.ts} precedes stage entry ${page.stage_entered_at}`,
      );
    }
    if (page.current_responder !== input.responder) {
      throw new Error(
        `responder ${input.responder} is not the current ${page.current_stage} responder (${page.current_responder})`,
      );
    }
    page.current_stage = "acknowledged";
    page.acknowledged_by = input.responder;
    page.ack_ts = input.ts;
    return { ...page };
  }

  // --------------------------------------------------------------------
  // sweepEscalations — advance pages whose current stage has timed out
  // --------------------------------------------------------------------
  sweepEscalations(nowTs: number): EscalationNote[] {
    if (!Number.isFinite(nowTs)) throw new Error(`nowTs must be finite`);
    const notes: EscalationNote[] = [];
    for (const page of this.pages) {
      if (
        page.current_stage === "acknowledged" ||
        page.current_stage === "expired"
      ) {
        continue;
      }
      // advance while the current stage's deadline has passed
      // (can jump multiple stages in one sweep if nowTs is far in the future)
      // guard against infinite loops with a bound of (ladder size + 2)
      const shift = this.shifts.find((s) => s.shift_id === page.shift_id);
      if (!shift) continue;
      const maxJumps = shift.ladder.length + 2;
      let jumps = 0;
      while (jumps < maxJumps) {
        const stage = readStage(page);
        if (stage === "acknowledged" || stage === "expired") break;
        if (nowTs <= page.stage_deadline) break;
        const previousStage = stage;
        this.advanceStage(page, shift);
        notes.push({
          page_id: page.page_id,
          pilot_id: page.pilot_id,
          shift_id: page.shift_id,
          previous_stage: previousStage,
          next_stage: page.current_stage,
          next_responder: page.current_responder,
          escalated_at: page.stage_entered_at,
          next_deadline: page.stage_deadline,
        });
        jumps += 1;
      }
    }
    return notes;
  }

  // --------------------------------------------------------------------
  // pendingEscalations — pages whose current stage is past deadline
  // --------------------------------------------------------------------
  pendingEscalations(nowTs: number): Page[] {
    if (!Number.isFinite(nowTs)) throw new Error(`nowTs must be finite`);
    return this.pages
      .filter(
        (p) =>
          p.current_stage !== "acknowledged" &&
          p.current_stage !== "expired" &&
          nowTs > p.stage_deadline,
      )
      .map((p) => ({ ...p }));
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getPage(pageId: string): Page | undefined {
    const p = this.pages.find((x) => x.page_id === pageId);
    return p ? { ...p } : undefined;
  }

  listPages(): Page[] {
    return this.pages.map((p) => ({ ...p }));
  }

  listShifts(): Shift[] {
    return this.shifts.map((s) => ({ ...s, ladder: [...s.ladder] }));
  }

  listSwaps(): SwapRecord[] {
    return this.swaps.map((s) => ({ ...s }));
  }

  snapshot(): Snapshot {
    return {
      schemaVersion: 1,
      shifts: this.listShifts(),
      swaps: this.listSwaps(),
      pages: this.listPages(),
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private advanceStage(page: Page, shift: Shift): void {
    if (page.current_stage === "primary") {
      page.current_stage = "secondary";
      page.current_responder = shift.secondary;
      page.stage_entered_at = page.stage_deadline;
      page.stage_deadline = page.stage_entered_at + shift.secondary_window_ms;
      return;
    }
    if (page.current_stage === "secondary") {
      if (shift.ladder.length === 0) {
        page.current_stage = "expired";
        page.current_responder = null;
        return;
      }
      page.current_stage = "ladder";
      page.ladder_position = 0;
      page.current_responder = shift.ladder[0]!;
      page.stage_entered_at = page.stage_deadline;
      page.stage_deadline = page.stage_entered_at + shift.ladder_window_ms;
      return;
    }
    if (page.current_stage === "ladder") {
      const nextPos = page.ladder_position + 1;
      if (nextPos >= shift.ladder.length) {
        page.current_stage = "expired";
        page.current_responder = null;
        return;
      }
      page.ladder_position = nextPos;
      page.current_responder = shift.ladder[nextPos]!;
      page.stage_entered_at = page.stage_deadline;
      page.stage_deadline = page.stage_entered_at + shift.ladder_window_ms;
      return;
    }
  }

  private validateShiftInput(input: ShiftInput): void {
    if (!input.shift_id || input.shift_id.trim().length === 0) {
      throw new Error(`shift_id required`);
    }
    if (!Number.isFinite(input.start_ts) || !Number.isFinite(input.end_ts)) {
      throw new Error(`start_ts and end_ts must be finite`);
    }
    if (input.end_ts <= input.start_ts) {
      throw new Error(
        `end_ts must be strictly greater than start_ts (shift ${input.shift_id})`,
      );
    }
    if (!input.primary || input.primary.trim().length === 0) {
      throw new Error(`primary responder required`);
    }
    if (!input.secondary || input.secondary.trim().length === 0) {
      throw new Error(`secondary responder required`);
    }
    if (input.primary === input.secondary) {
      throw new Error(`primary and secondary must differ`);
    }
    if (input.ladder) {
      const ladderSet = new Set(input.ladder);
      if (ladderSet.size !== input.ladder.length) {
        throw new Error(`escalation ladder contains duplicates`);
      }
      if (ladderSet.has(input.primary) || ladderSet.has(input.secondary)) {
        throw new Error(
          `ladder cannot include primary or secondary responder`,
        );
      }
      for (const l of input.ladder) {
        if (typeof l !== "string" || l.trim().length === 0) {
          throw new Error(`ladder entries must be non-empty names`);
        }
      }
    }
    const ack = input.ack_window_ms ?? DEFAULT_PRIMARY_WINDOW_MS;
    const sec = input.secondary_window_ms ?? DEFAULT_SECONDARY_WINDOW_MS;
    const lad = input.ladder_window_ms ?? DEFAULT_LADDER_WINDOW_MS;
    for (const [name, v] of [
      ["ack_window_ms", ack],
      ["secondary_window_ms", sec],
      ["ladder_window_ms", lad],
    ] as const) {
      if (v < MIN_ACK_WINDOW_MS || v > MAX_ACK_WINDOW_MS) {
        throw new Error(
          `${name} must be within [${MIN_ACK_WINDOW_MS}, ${MAX_ACK_WINDOW_MS}] ms (got ${v})`,
        );
      }
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunOnCallRotationEngine = new WetRunOnCallRotationEngine();
