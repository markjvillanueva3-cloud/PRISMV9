/**
 * SlotSessionHistoryEngine — per-slot session history sidecar.
 *
 * SLOT-RECOVERY-MS0/U-SR01 (2026-05-25, slot:golf, claude-b509cb68)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §2-3
 *
 * Solves: when a chat dies, the session-id is forgotten because chat-slots.json
 * stores only the CURRENT chatId per slot. Last night's 20-chat crash left the
 * operator unable to identify which session_id belonged to which slot.
 *
 * Storage:
 *   state/shared/slot-sessions/<nato>.jsonl — append-only, per-slot.
 *
 * 3 event types per spec §2:
 *   - session-start (SessionStart hook fires)
 *   - heartbeat (60s via heartbeat-keepalive chain extension)
 *   - session-end (Stop / PreCompact hook fires, exitState: clean/precompact/stop/crash-inferred)
 *
 * Crash-inferred invariant (the key design):
 *   At session-start, the engine reads the previous tail of the slot's JSONL.
 *   If the last entry is NOT session-end (meaning the prior session never
 *   wrote a clean exit — PC shutdown, OOM, etc.), the engine writes a
 *   `crash-inferred` session-end BEFORE writing its own session-start. This
 *   closes the "no clean exit on hard shutdown" gap that today loses
 *   everything beyond the last heartbeat.
 *
 * Why per-slot files (one per nato, 26 files total):
 *   Zero lock contention (each file written by one slot at a time). Append-
 *   only is crash-safe (fs.appendFileSync is atomic for sub-PIPE_BUF writes
 *   on POSIX, sub-512B on Windows). One slot's corruption can't affect another.
 *
 * Retention: 30 entries per slot (configurable). Oldest pruned on each write.
 *   30 entries ≈ 30 sessions ≈ 1-2 weeks at the current fleet cadence.
 *
 * Knob (read at every call so per-test overrides take effect):
 *   PRISM_SLOT_SESSION_BASE_DIR — override the storage dir (tests)
 *   PRISM_SLOT_SESSION_RETENTION — override the entry-count cap
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { hostname } from "node:os";

// ─── Constants ──────────────────────────────────────────────────────────

/**
 * NATO slot names — single source of truth lives in
 * H:/prism/.claude/helpers/chat-slots.mjs SLOT_NAMES. Duplicated here only
 * because the TS build (esbuild) can't import .mjs across the H:/prism vs
 * mcp-server/ tree without an import-path shim. Keep both in sync when
 * expanding (last expansion: 13→26 on 2026-05-19, SLOT-RECLAIM commit
 * ed5c49044b).
 */
export const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf",
  "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra",
  "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
] as const;

export type NatoSlot = typeof SLOT_NAMES[number];

const SLOT_SET = new Set<string>(SLOT_NAMES);

export const DEFAULT_BASE_DIR = "H:/prism/state/shared/slot-sessions";
export const DEFAULT_RETENTION = 30;
export const SCHEMA_VERSION = "1.0.0";

/** Per-spec §5: default 24h window for resume eligibility. */
export const DEFAULT_RESUME_MAX_AGE_HOURS = 24;

/** Liveness classification thresholds — match chat-slots.mjs convention. */
export const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 min
export const CRASHED_THRESHOLD_MS = 10 * 60 * 1000; // 10 min

// ─── Event type schema ──────────────────────────────────────────────────

export type EventType = "session-start" | "heartbeat" | "session-end";
export type ExitState = "running" | "clean" | "precompact" | "stop" | "crash-inferred";

interface BaseEvent {
  schemaVersion: string;
  eventType: EventType;
  ts: string; // ISO 8601
  slot: NatoSlot;
  sessionId: string;
}

export interface SessionStartEvent extends BaseEvent {
  eventType: "session-start";
  chatId: string;
  host: string;
  terminalWindowId: string | null;
  branch: string | null;
  topic: string | null;
  directive: string | null;
  transcriptPath: string | null;
}

export interface HeartbeatEvent extends BaseEvent {
  eventType: "heartbeat";
  exitState: "running";
  directive: string | null;
  currentGoal: string | null;
  transcriptSizeBytes: number | null;
  transcriptMtimeMs: number | null;
  loopIter: number | null;
  loopTarget: number | null;
}

export interface SessionEndEvent extends BaseEvent {
  eventType: "session-end";
  exitState: Exclude<ExitState, "running">;
  directive: string | null;
  finalResume: string | null;
  handoffPath: string | null;
  transcriptSizeBytes: number | null;
  loopIter: number | null;
  loopTarget: number | null;
}

export type SlotSessionEntry = SessionStartEvent | HeartbeatEvent | SessionEndEvent;

export interface FleetStateCard {
  slot: NatoSlot;
  status: "alive" | "stale" | "crashed" | "idle";
  chatId: string | null;
  sessionId: string | null;
  directive: string | null;
  currentGoal: string | null;
  loopIter: number | null;
  loopTarget: number | null;
  lastActivityAgeMs: number | null;
  lastEventType: EventType | null;
  lastExitState: ExitState | null;
}

export interface IsResumeEligibleResult {
  eligible: boolean;
  reason: string;
  sessionId?: string;
  ageHours?: number;
  cleanExit?: boolean;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class SlotSessionHistoryEngine {
  private readonly baseDir: string;
  private readonly retention: number;

  constructor(opts: { baseDir?: string; retention?: number } = {}) {
    this.baseDir = opts.baseDir
      ?? process.env.PRISM_SLOT_SESSION_BASE_DIR
      ?? DEFAULT_BASE_DIR;
    const retentionEnv = parseInt(process.env.PRISM_SLOT_SESSION_RETENTION ?? "", 10);
    this.retention = opts.retention
      ?? (Number.isFinite(retentionEnv) && retentionEnv > 0 ? retentionEnv : DEFAULT_RETENTION);
  }

  // ── Path + IO primitives ──────────────────────────────────────────────

  private slotFile(slot: NatoSlot): string {
    return join(this.baseDir, `${slot}.jsonl`);
  }

  private ensureDir(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Read all entries for a slot. Returns [] if file missing or empty.
   * Corrupt lines (unparseable JSON, missing required fields) are SKIPPED —
   * never throws. The crash-inferred invariant tolerates a corrupt tail by
   * treating it as "previous session never finished" and writing the
   * synthetic crash-inferred entry on the next session-start.
   */
  readAll(slot: NatoSlot): SlotSessionEntry[] {
    if (!SLOT_SET.has(slot)) return [];
    const file = this.slotFile(slot);
    if (!existsSync(file)) return [];
    let raw: string;
    try {
      raw = readFileSync(file, "utf-8");
    } catch {
      return [];
    }
    const entries: SlotSessionEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        // Minimal shape check — must have eventType + slot + sessionId.
        // Defensive against partial corruption + schema drift.
        if (
          parsed
          && typeof parsed === "object"
          && (parsed.eventType === "session-start"
            || parsed.eventType === "heartbeat"
            || parsed.eventType === "session-end")
          && SLOT_SET.has(parsed.slot)
          && typeof parsed.sessionId === "string"
          && parsed.sessionId.length > 0
        ) {
          entries.push(parsed as SlotSessionEntry);
        }
      } catch {
        // Skip corrupt line — invariant tolerates tail corruption.
      }
    }
    return entries;
  }

  /**
   * Append a single entry to the slot's JSONL. Atomic at the OS level for
   * small writes (the JSON line is well under PIPE_BUF). Prunes oldest
   * entries when total exceeds retention.
   */
  private append(slot: NatoSlot, entry: SlotSessionEntry): void {
    this.ensureDir();
    const file = this.slotFile(slot);
    appendFileSync(file, JSON.stringify(entry) + "\n");
    // In-place prune so the file never grows unboundedly. This is the only
    // place where we re-write the file (everywhere else is append-only).
    this.pruneSlot(slot, this.retention);
  }

  /**
   * Atomic rewrite of a slot's JSONL with only the last `keepLast` entries.
   * Called after each append when over retention. Uses tmp+rename to be
   * crash-safe.
   */
  pruneSlot(slot: NatoSlot, keepLast: number): { pruned: number } {
    if (!SLOT_SET.has(slot)) return { pruned: 0 };
    const file = this.slotFile(slot);
    if (!existsSync(file)) return { pruned: 0 };
    const entries = this.readAll(slot);
    if (entries.length <= keepLast) return { pruned: 0 };
    const kept = entries.slice(-keepLast);
    const tmp = `${file}.${process.pid}.${Date.now()}.prune.tmp`;
    const newContent = kept.map((e) => JSON.stringify(e)).join("\n") + "\n";
    writeFileSync(tmp, newContent);
    // Windows rename fails if target exists; unlink-then-rename for atomicity.
    try {
      renameSync(tmp, file);
    } catch {
      try { unlinkSync(file); } catch { /* race-tolerant */ }
      renameSync(tmp, file);
    }
    return { pruned: entries.length - keepLast };
  }

  // ── Public write API ──────────────────────────────────────────────────

  /**
   * Record a session-start event. If the previous tail of the slot's JSONL
   * is NOT a session-end (different session-id), this method first writes a
   * `crash-inferred` session-end entry for the prior session. This is the
   * core invariant that makes PC-shutdown survival work.
   *
   * Returns { crashInferred: true } when the synthetic close was written, so
   * the SessionStart hook can log a warning to the operator.
   */
  recordSessionStart(input: {
    slot: NatoSlot;
    sessionId: string;
    chatId: string;
    host?: string;
    terminalWindowId?: string | null;
    branch?: string | null;
    topic?: string | null;
    directive?: string | null;
    transcriptPath?: string | null;
  }): { ok: true; crashInferred: boolean } | { ok: false; error: string } {
    if (!SLOT_SET.has(input.slot)) {
      return { ok: false, error: `unknown slot: ${input.slot}` };
    }
    if (!input.sessionId || typeof input.sessionId !== "string") {
      return { ok: false, error: "sessionId required" };
    }
    if (!input.chatId || typeof input.chatId !== "string") {
      return { ok: false, error: "chatId required" };
    }

    // Crash-inferred invariant: if the slot's last entry is NOT a clean
    // session-end AND belongs to a DIFFERENT session, write a synthetic
    // close for that session before recording the new session-start. We
    // intentionally do NOT close a "same sessionId" tail — that would
    // indicate a duplicate session-start (recovery from a hook re-fire,
    // which is harmless to deduplicate by just appending another start).
    const entries = this.readAll(input.slot);
    let crashInferred = false;
    if (entries.length > 0) {
      const last = entries[entries.length - 1];
      if (last.eventType !== "session-end" && last.sessionId !== input.sessionId) {
        const crashEvent: SessionEndEvent = {
          schemaVersion: SCHEMA_VERSION,
          eventType: "session-end",
          ts: new Date().toISOString(),
          slot: input.slot,
          sessionId: last.sessionId,
          exitState: "crash-inferred",
          directive: last.eventType !== "session-start"
            ? (last as HeartbeatEvent).directive
            : (last as SessionStartEvent).directive,
          finalResume: null,
          handoffPath: null,
          transcriptSizeBytes: last.eventType === "heartbeat"
            ? (last as HeartbeatEvent).transcriptSizeBytes
            : null,
          loopIter: last.eventType === "heartbeat"
            ? (last as HeartbeatEvent).loopIter
            : null,
          loopTarget: last.eventType === "heartbeat"
            ? (last as HeartbeatEvent).loopTarget
            : null,
        };
        this.append(input.slot, crashEvent);
        crashInferred = true;
      }
    }

    const event: SessionStartEvent = {
      schemaVersion: SCHEMA_VERSION,
      eventType: "session-start",
      ts: new Date().toISOString(),
      slot: input.slot,
      sessionId: input.sessionId,
      chatId: input.chatId,
      host: input.host ?? hostname(),
      terminalWindowId: input.terminalWindowId ?? null,
      branch: input.branch ?? null,
      topic: input.topic ?? null,
      directive: input.directive ?? null,
      transcriptPath: input.transcriptPath ?? null,
    };
    this.append(input.slot, event);
    return { ok: true, crashInferred };
  }

  /**
   * Record a heartbeat event. Idempotent — missed beats are non-fatal,
   * extra beats are just additional history rows. Fires every 60s via the
   * heartbeat-keepalive UserPromptSubmit chain extension (per spec §4).
   */
  recordHeartbeat(input: {
    slot: NatoSlot;
    sessionId: string;
    directive?: string | null;
    currentGoal?: string | null;
    transcriptSizeBytes?: number | null;
    transcriptMtimeMs?: number | null;
    loopIter?: number | null;
    loopTarget?: number | null;
  }): { ok: true } | { ok: false; error: string } {
    if (!SLOT_SET.has(input.slot)) {
      return { ok: false, error: `unknown slot: ${input.slot}` };
    }
    if (!input.sessionId) {
      return { ok: false, error: "sessionId required" };
    }
    const event: HeartbeatEvent = {
      schemaVersion: SCHEMA_VERSION,
      eventType: "heartbeat",
      ts: new Date().toISOString(),
      slot: input.slot,
      sessionId: input.sessionId,
      exitState: "running",
      directive: input.directive ?? null,
      currentGoal: input.currentGoal ?? null,
      transcriptSizeBytes: input.transcriptSizeBytes ?? null,
      transcriptMtimeMs: input.transcriptMtimeMs ?? null,
      loopIter: input.loopIter ?? null,
      loopTarget: input.loopTarget ?? null,
    };
    this.append(input.slot, event);
    return { ok: true };
  }

  /**
   * Record a clean session-end. Caller specifies the exitState reason
   * (clean / precompact / stop / crash-inferred). finalResume is truncated
   * to 500 chars (matches the spec §2 schema cap).
   */
  recordSessionEnd(input: {
    slot: NatoSlot;
    sessionId: string;
    exitState: Exclude<ExitState, "running">;
    directive?: string | null;
    finalResume?: string | null;
    handoffPath?: string | null;
    transcriptSizeBytes?: number | null;
    loopIter?: number | null;
    loopTarget?: number | null;
  }): { ok: true } | { ok: false; error: string } {
    if (!SLOT_SET.has(input.slot)) {
      return { ok: false, error: `unknown slot: ${input.slot}` };
    }
    if (!input.sessionId) {
      return { ok: false, error: "sessionId required" };
    }
    if (!input.exitState
      || (input.exitState !== "clean"
        && input.exitState !== "precompact"
        && input.exitState !== "stop"
        && input.exitState !== "crash-inferred")
    ) {
      return { ok: false, error: `invalid exitState: ${input.exitState}` };
    }
    const event: SessionEndEvent = {
      schemaVersion: SCHEMA_VERSION,
      eventType: "session-end",
      ts: new Date().toISOString(),
      slot: input.slot,
      sessionId: input.sessionId,
      exitState: input.exitState,
      directive: input.directive ?? null,
      finalResume: input.finalResume ? input.finalResume.slice(0, 500) : null,
      handoffPath: input.handoffPath ?? null,
      transcriptSizeBytes: input.transcriptSizeBytes ?? null,
      loopIter: input.loopIter ?? null,
      loopTarget: input.loopTarget ?? null,
    };
    this.append(input.slot, event);
    return { ok: true };
  }

  // ── Public read API ───────────────────────────────────────────────────

  /**
   * Return the most-recent entry for the slot, regardless of type.
   * null when the slot has never written anything.
   */
  getLatestForSlot(slot: NatoSlot): SlotSessionEntry | null {
    const entries = this.readAll(slot);
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  /**
   * Return the last N entries for the slot (most-recent last). Default 10.
   */
  getHistoryForSlot(slot: NatoSlot, limit = 10): SlotSessionEntry[] {
    const entries = this.readAll(slot);
    if (limit <= 0) return [];
    return entries.slice(-limit);
  }

  /**
   * Return the most recent session-end entry. Used to find the "last clean
   * session" or the most recent crash. null when no session-end exists.
   */
  getLatestSessionEnd(slot: NatoSlot): SessionEndEvent | null {
    const entries = this.readAll(slot);
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].eventType === "session-end") {
        return entries[i] as SessionEndEvent;
      }
    }
    return null;
  }

  /**
   * Build the per-slot card the dashboard renders. Includes liveness
   * classification (alive / stale / crashed / idle) based on the most
   * recent entry's age.
   */
  getAllSlotsState(now = Date.now()): Record<NatoSlot, FleetStateCard> {
    const out = {} as Record<NatoSlot, FleetStateCard>;
    for (const slot of SLOT_NAMES) {
      const entries = this.readAll(slot);
      if (entries.length === 0) {
        out[slot] = {
          slot,
          status: "idle",
          chatId: null,
          sessionId: null,
          directive: null,
          currentGoal: null,
          loopIter: null,
          loopTarget: null,
          lastActivityAgeMs: null,
          lastEventType: null,
          lastExitState: null,
        };
        continue;
      }
      const last = entries[entries.length - 1];
      const lastMs = Date.parse(last.ts);
      const ageMs = Number.isFinite(lastMs) ? now - lastMs : null;
      // Find the most recent session-start to extract chatId.
      let chatId: string | null = null;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].eventType === "session-start"
          && entries[i].sessionId === last.sessionId) {
          chatId = (entries[i] as SessionStartEvent).chatId;
          break;
        }
      }
      let status: FleetStateCard["status"];
      if (last.eventType === "session-end") {
        // Closed session — slot is idle until next session-start.
        status = "idle";
      } else if (ageMs === null || ageMs > CRASHED_THRESHOLD_MS) {
        status = "crashed";
      } else if (ageMs > STALE_THRESHOLD_MS) {
        status = "stale";
      } else {
        status = "alive";
      }
      out[slot] = {
        slot,
        status,
        chatId,
        sessionId: last.sessionId,
        directive: last.eventType !== "session-start"
          ? (last as HeartbeatEvent | SessionEndEvent).directive
          : (last as SessionStartEvent).directive,
        currentGoal: last.eventType === "heartbeat"
          ? (last as HeartbeatEvent).currentGoal
          : null,
        loopIter: last.eventType === "heartbeat" || last.eventType === "session-end"
          ? (last as HeartbeatEvent | SessionEndEvent).loopIter
          : null,
        loopTarget: last.eventType === "heartbeat" || last.eventType === "session-end"
          ? (last as HeartbeatEvent | SessionEndEvent).loopTarget
          : null,
        lastActivityAgeMs: ageMs,
        lastEventType: last.eventType,
        lastExitState: last.eventType === "session-end"
          ? (last as SessionEndEvent).exitState
          : last.eventType === "heartbeat"
            ? "running"
            : null,
      };
    }
    return out;
  }

  /**
   * Apply the 7-condition resume-eligibility matrix from spec §5. Returns
   * eligible:true with the sessionId to resume, OR eligible:false with a
   * machine-readable reason string. Used by the launcher to decide between
   * `claude --resume <sid>` and fresh `claude + /checkin-<slot>`.
   *
   * Conditions checked (in evaluation order):
   *   1. operator override env (PRISM_SLOT_NO_RESUME=1) → ineligible
   *   2. operator opts.fresh=true → ineligible
   *   3. no entries in sidecar → ineligible (reason: no-history)
   *   4. last sessionId's transcript file missing → ineligible (transcript-gcd)
   *   5. last entry age > maxAgeHours (default 24) → ineligible (too-old)
   *   6. corrupt-tail detection (last line of file is unparseable) → ineligible
   *   7. eligible — return the sessionId of the last session (whether clean
   *      exit or crash-inferred — operator can resume either)
   */
  isResumeEligible(
    slot: NatoSlot,
    opts: {
      maxAgeHours?: number;
      fresh?: boolean;
      now?: number;
      transcriptExistsCheck?: (transcriptPath: string | null) => boolean;
    } = {},
  ): IsResumeEligibleResult {
    if (!SLOT_SET.has(slot)) {
      return { eligible: false, reason: `unknown-slot:${slot}` };
    }
    // Cond 1: env override
    if (process.env.PRISM_SLOT_NO_RESUME === "1") {
      return { eligible: false, reason: "env-PRISM_SLOT_NO_RESUME-set" };
    }
    // Cond 2: caller override
    if (opts.fresh === true) {
      return { eligible: false, reason: "caller-opts-fresh" };
    }
    const entries = this.readAll(slot);
    // Cond 3: no history
    if (entries.length === 0) {
      return { eligible: false, reason: "no-history" };
    }
    // Find the last session-start (the one to resume). If the last event
    // is a session-end, we still find its matching session-start to get
    // the sessionId — resuming a closed session is operator's choice.
    let lastStart: SessionStartEvent | null = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].eventType === "session-start") {
        lastStart = entries[i] as SessionStartEvent;
        break;
      }
    }
    if (!lastStart) {
      return { eligible: false, reason: "no-session-start-found" };
    }
    // Cond 4: transcript file existence (injected for testability)
    const transcriptExists = opts.transcriptExistsCheck
      ?? ((p: string | null) => p ? existsSync(p) : false);
    if (lastStart.transcriptPath && !transcriptExists(lastStart.transcriptPath)) {
      return {
        eligible: false,
        reason: "transcript-gcd",
        sessionId: lastStart.sessionId,
      };
    }
    // Cond 5: age
    const maxAgeHours = opts.maxAgeHours ?? DEFAULT_RESUME_MAX_AGE_HOURS;
    const now = opts.now ?? Date.now();
    const last = entries[entries.length - 1];
    const lastMs = Date.parse(last.ts);
    if (!Number.isFinite(lastMs)) {
      return { eligible: false, reason: "unparseable-last-ts" };
    }
    const ageHours = (now - lastMs) / (1000 * 60 * 60);
    if (ageHours > maxAgeHours) {
      return {
        eligible: false,
        reason: "too-old",
        sessionId: lastStart.sessionId,
        ageHours,
      };
    }
    // Cond 6: corrupt-tail — check by reading raw file and confirming the
    // last non-empty line is valid JSON. readAll() already skips corrupt
    // lines silently, so we need a separate raw check here.
    const file = this.slotFile(slot);
    try {
      const raw = readFileSync(file, "utf-8");
      const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length > 0) {
        try {
          JSON.parse(lines[lines.length - 1]);
        } catch {
          return {
            eligible: false,
            reason: "corrupt-tail",
            sessionId: lastStart.sessionId,
            ageHours,
          };
        }
      }
    } catch {
      // File read failed — treat as no-history.
      return { eligible: false, reason: "file-unreadable" };
    }
    // Cond 7: eligible. Determine cleanExit from the last session-end of
    // THIS sessionId, if any.
    let cleanExit = false;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].eventType === "session-end"
        && entries[i].sessionId === lastStart.sessionId) {
        cleanExit = (entries[i] as SessionEndEvent).exitState !== "crash-inferred";
        break;
      }
    }
    return {
      eligible: true,
      reason: "ok",
      sessionId: lastStart.sessionId,
      ageHours,
      cleanExit,
    };
  }

  /**
   * Detect whether the slot's most recent session ended unexpectedly.
   * Used by dashboards + audit reports. Distinct from `isResumeEligible`,
   * which is the launcher's decision predicate.
   */
  detectCrashedSlot(slot: NatoSlot, now = Date.now()): {
    crashed: boolean;
    lastEventType: EventType | null;
    ageMs: number | null;
    sessionId: string | null;
  } {
    const last = this.getLatestForSlot(slot);
    if (!last) {
      return { crashed: false, lastEventType: null, ageMs: null, sessionId: null };
    }
    const lastMs = Date.parse(last.ts);
    const ageMs = Number.isFinite(lastMs) ? now - lastMs : null;
    // A "crashed" slot is one whose tail is session-start OR heartbeat (no
    // clean end) AND has aged past the crash threshold. A tail of type
    // session-end with exitState=crash-inferred is ALSO crashed.
    let crashed = false;
    if (last.eventType === "session-end") {
      crashed = (last as SessionEndEvent).exitState === "crash-inferred";
    } else if (ageMs !== null && ageMs > CRASHED_THRESHOLD_MS) {
      crashed = true;
    }
    return {
      crashed,
      lastEventType: last.eventType,
      ageMs,
      sessionId: last.sessionId,
    };
  }
}

// ─── Singleton export (PRISM convention) ────────────────────────────────

let _singleton: SlotSessionHistoryEngine | null = null;

/**
 * Lazy singleton accessor — matches the PRISM engine pattern. Tests can
 * call `new SlotSessionHistoryEngine({ baseDir: '/tmp/...' })` directly to
 * bypass the singleton.
 */
export function slotSessionHistoryEngine(): SlotSessionHistoryEngine {
  if (_singleton === null) {
    _singleton = new SlotSessionHistoryEngine();
  }
  return _singleton;
}

/** Reset the singleton — TESTS ONLY. */
export function _resetSlotSessionHistoryEngineForTests(): void {
  _singleton = null;
}
