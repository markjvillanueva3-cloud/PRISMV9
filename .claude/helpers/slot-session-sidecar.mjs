#!/usr/bin/env node
/**
 * slot-session-sidecar.mjs — writer-side primitives for the per-slot
 * session-id history sidecar at state/shared/slot-sessions/<nato>.jsonl.
 *
 * SLOT-RECOVERY-MS0/U-SR02..U-SR04 (2026-05-25, slot:golf)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §2-§4
 *
 * Design: the WRITE path lives in .mjs hooks for low-overhead fire-and-forget.
 * The READ path is the TypeScript engine `SlotSessionHistoryEngine` (U-SR01)
 * consumed by the MCP server. Both sides MUST agree on the JSONL schema —
 * the engine's test suite + this helper's test suite are the contract.
 *
 * Why hooks write directly (not via the engine):
 *   Spawning a tsx subprocess on every SessionStart / 60s heartbeat / Stop
 *   would add ~200ms per fire (Node startup + ts-node import). For a
 *   purely-append writer this is unjustified — JSON.stringify + appendFileSync
 *   is 0.1ms. Read-path queries (getAllSlotsState, isResumeEligible) live in
 *   the engine because they're called from the MCP server context which is
 *   already running.
 *
 * Knobs (all read at call time so per-test overrides take effect):
 *   PRISM_SLOT_SESSION_SIDECAR_DISABLE=1 — kill switch (hooks exit 0 silently)
 *   PRISM_SLOT_SESSION_BASE_DIR — override storage dir (tests)
 *   PRISM_SLOT_SESSION_RETENTION — entries-per-slot cap (default 30)
 *
 * Shared schema with SlotSessionHistoryEngine.ts:
 *   - schemaVersion: "1.0.0"
 *   - SLOT_NAMES: 26 NATO from chat-slots.mjs
 *   - 3 event types: session-start / heartbeat / session-end
 *   - 4 exitStates: clean / precompact / stop / crash-inferred
 *
 * Crash-inferred invariant (matches engine §3):
 *   On session-start, if the slot's JSONL tail is not session-end AND
 *   refers to a different session-id, this helper synthesizes a crash-
 *   inferred close for the prior session BEFORE appending the new start.
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
import { join, dirname } from "node:path";
import { hostname } from "node:os";

// Single source of truth for SLOT_NAMES is .claude/helpers/chat-slots.mjs.
// We import here so the helper + the engine never drift on slot expansion.
import { SLOT_NAMES } from "./chat-slots.mjs";

export const SCHEMA_VERSION = "1.0.0";
export const DEFAULT_BASE_DIR = "H:/prism/state/shared/slot-sessions";
export const DEFAULT_RETENTION = 30;

const SLOT_SET = new Set(SLOT_NAMES);

function baseDir() {
  return process.env.PRISM_SLOT_SESSION_BASE_DIR || DEFAULT_BASE_DIR;
}

function retention() {
  const n = parseInt(process.env.PRISM_SLOT_SESSION_RETENTION || "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION;
}

export function isDisabled() {
  return process.env.PRISM_SLOT_SESSION_SIDECAR_DISABLE === "1";
}

function slotFile(slot) {
  return join(baseDir(), `${slot}.jsonl`);
}

function ensureDir() {
  const d = baseDir();
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

/**
 * Read all valid entries for a slot. Skips corrupt lines silently — the
 * crash-inferred invariant tolerates tail corruption by treating it as
 * "previous session never finished".
 */
export function readAll(slot) {
  if (!SLOT_SET.has(slot)) return [];
  const file = slotFile(slot);
  if (!existsSync(file)) return [];
  let raw;
  try { raw = readFileSync(file, "utf-8"); } catch { return []; }
  const entries = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const p = JSON.parse(t);
      if (
        p && typeof p === "object"
        && (p.eventType === "session-start" || p.eventType === "heartbeat" || p.eventType === "session-end")
        && SLOT_SET.has(p.slot)
        && typeof p.sessionId === "string" && p.sessionId.length > 0
      ) {
        entries.push(p);
      }
    } catch { /* skip corrupt line */ }
  }
  return entries;
}

/**
 * Append one event line. After append, if total > retention, rewrite the
 * file atomically with only the last N entries. Crash-safe via tmp+rename.
 */
function appendAndPrune(slot, event) {
  ensureDir();
  const file = slotFile(slot);
  appendFileSync(file, JSON.stringify(event) + "\n");
  // Prune inline if over retention.
  const cap = retention();
  const all = readAll(slot);
  if (all.length > cap) {
    const kept = all.slice(-cap);
    const tmp = `${file}.${process.pid}.${Date.now()}.prune.tmp`;
    writeFileSync(tmp, kept.map((e) => JSON.stringify(e)).join("\n") + "\n");
    try {
      renameSync(tmp, file);
    } catch {
      try { unlinkSync(file); } catch { /* race-tolerant */ }
      renameSync(tmp, file);
    }
  }
}

/**
 * recordSessionStart — atomic write of crash-inferred close (if needed)
 * followed by the new session-start. Mirrors the engine's recordSessionStart.
 *
 * Returns { ok:true, crashInferred:boolean } or { ok:false, error:string }.
 */
export function recordSessionStart(input) {
  if (!input || !SLOT_SET.has(input.slot)) {
    return { ok: false, error: `unknown slot: ${input?.slot}` };
  }
  if (!input.sessionId || typeof input.sessionId !== "string") {
    return { ok: false, error: "sessionId required" };
  }
  if (!input.chatId || typeof input.chatId !== "string") {
    return { ok: false, error: "chatId required" };
  }
  const entries = readAll(input.slot);
  let crashInferred = false;
  if (entries.length > 0) {
    const last = entries[entries.length - 1];
    if (last.eventType !== "session-end" && last.sessionId !== input.sessionId) {
      const crashEvent = {
        schemaVersion: SCHEMA_VERSION,
        eventType: "session-end",
        ts: new Date().toISOString(),
        slot: input.slot,
        sessionId: last.sessionId,
        exitState: "crash-inferred",
        directive: last.directive ?? null,
        finalResume: null,
        handoffPath: null,
        transcriptSizeBytes: last.eventType === "heartbeat" ? (last.transcriptSizeBytes ?? null) : null,
        loopIter: last.eventType === "heartbeat" ? (last.loopIter ?? null) : null,
        loopTarget: last.eventType === "heartbeat" ? (last.loopTarget ?? null) : null,
      };
      appendAndPrune(input.slot, crashEvent);
      crashInferred = true;
    }
  }
  const event = {
    schemaVersion: SCHEMA_VERSION,
    eventType: "session-start",
    ts: new Date().toISOString(),
    slot: input.slot,
    sessionId: input.sessionId,
    chatId: input.chatId,
    host: input.host || hostname(),
    terminalWindowId: input.terminalWindowId ?? null,
    branch: input.branch ?? null,
    topic: input.topic ?? null,
    directive: input.directive ?? null,
    transcriptPath: input.transcriptPath ?? null,
  };
  appendAndPrune(input.slot, event);
  return { ok: true, crashInferred };
}

/**
 * recordHeartbeat — append a heartbeat event. Idempotent — missed beats
 * are non-fatal; extra beats are just more history rows.
 */
export function recordHeartbeat(input) {
  if (!input || !SLOT_SET.has(input.slot)) {
    return { ok: false, error: `unknown slot: ${input?.slot}` };
  }
  if (!input.sessionId) {
    return { ok: false, error: "sessionId required" };
  }
  const event = {
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
  appendAndPrune(input.slot, event);
  return { ok: true };
}

/**
 * recordSessionEnd — append a session-end event. finalResume is truncated
 * to 500 chars (matches spec §2 cap).
 */
export function recordSessionEnd(input) {
  if (!input || !SLOT_SET.has(input.slot)) {
    return { ok: false, error: `unknown slot: ${input?.slot}` };
  }
  if (!input.sessionId) {
    return { ok: false, error: "sessionId required" };
  }
  const valid = ["clean", "precompact", "stop", "crash-inferred"];
  if (!valid.includes(input.exitState)) {
    return { ok: false, error: `invalid exitState: ${input.exitState}` };
  }
  const event = {
    schemaVersion: SCHEMA_VERSION,
    eventType: "session-end",
    ts: new Date().toISOString(),
    slot: input.slot,
    sessionId: input.sessionId,
    exitState: input.exitState,
    directive: input.directive ?? null,
    finalResume: input.finalResume ? String(input.finalResume).slice(0, 500) : null,
    handoffPath: input.handoffPath ?? null,
    transcriptSizeBytes: input.transcriptSizeBytes ?? null,
    loopIter: input.loopIter ?? null,
    loopTarget: input.loopTarget ?? null,
  };
  appendAndPrune(input.slot, event);
  return { ok: true };
}

/**
 * Resolve the slot bound to a given chatId by reading chat-slots.json.
 * Returns the slot name (e.g. "foxtrot") or null when no slot binds the chatId.
 * Hooks call this to get the slot for their stdin chatId.
 */
export function resolveSlotForChatId(chatId, slotsPath = "H:/prism/state/shared/chat-slots.json") {
  if (!chatId || typeof chatId !== "string") return null;
  if (!existsSync(slotsPath)) return null;
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(slotsPath, "utf-8"));
  } catch { return null; }
  const slots = parsed?.slots;
  if (!slots || typeof slots !== "object") return null;
  for (const [name, state] of Object.entries(slots)) {
    if (state && typeof state === "object" && state.chatId === chatId && SLOT_SET.has(name)) {
      return name;
    }
  }
  return null;
}

/**
 * Build the path Claude Code uses for the transcript JSONL of a given
 * session_id, derived from cwd and the standard projects directory.
 * Same convention as chat-slots.mjs claudeProjectsDir() — keeps the
 * resolver consistent across the codebase.
 */
export function resolveTranscriptPath(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return null;
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (!home) return null;
  // Claude Code stores transcripts at <home>/.claude/projects/<project-slug>/<uuid>.jsonl
  // project-slug is the cwd path with separators replaced (e.g. H:/prism → H--prism)
  return join(home, ".claude", "projects", "H--prism", `${sessionId}.jsonl`).replace(/\\/g, "/");
}
