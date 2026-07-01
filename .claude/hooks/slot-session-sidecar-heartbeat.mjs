#!/usr/bin/env node
// tier: T3
/**
 * slot-session-sidecar-heartbeat.mjs — UserPromptSubmit heartbeat hook (U-SR03)
 *
 * SLOT-RECOVERY-MS0/U-SR03 (2026-05-25, slot:golf)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §4
 *
 * Appends a heartbeat event to state/shared/slot-sessions/<slot>.jsonl on
 * every UserPromptSubmit, throttled to once per 60s per slot. This keeps
 * the per-slot session-id history sidecar fresh while the chat is alive.
 *
 * Throttle: a sentinel file per slot tracks the last beat ts; we skip if
 * the elapsed time is below PRISM_SLOT_SESSION_HEARTBEAT_MIN_INTERVAL_MS
 * (default 60000). Atomic via tmp+rename, fail-soft on any error.
 *
 * Carries: directive (from chat-slots.json activity field if available),
 * loop iter/target (from state/shared/loop-state/loop-<sessionId>.json),
 * transcript size + mtime (from the chat's .jsonl).
 *
 * Knob: PRISM_SLOT_SESSION_SIDECAR_DISABLE=1 short-circuits.
 *
 * Exit semantics: NEVER blocks the prompt. All errors → exit 0.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import {
  isDisabled,
  recordHeartbeat,
  resolveSlotForChatId,
  resolveTranscriptPath,
} from "../helpers/slot-session-sidecar.mjs";

const HEARTBEAT_SENTINEL_DIR = "H:/prism/state/shared/.slot-session-heartbeat-throttle";
const DEFAULT_MIN_INTERVAL_MS = 60_000;

function minIntervalMs() {
  const n = parseInt(process.env.PRISM_SLOT_SESSION_HEARTBEAT_MIN_INTERVAL_MS || "", 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_INTERVAL_MS;
}

function shouldThrottle(slot) {
  try {
    if (!existsSync(HEARTBEAT_SENTINEL_DIR)) {
      mkdirSync(HEARTBEAT_SENTINEL_DIR, { recursive: true });
      return false;
    }
    const f = join(HEARTBEAT_SENTINEL_DIR, `${slot}.ts`);
    if (!existsSync(f)) return false;
    const lastMs = statSync(f).mtimeMs;
    return (Date.now() - lastMs) < minIntervalMs();
  } catch { return false; }
}

function markBeat(slot) {
  try {
    const dir = HEARTBEAT_SENTINEL_DIR;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const f = join(dir, `${slot}.ts`);
    const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, new Date().toISOString());
    try { renameSync(tmp, f); } catch { /* race-tolerant */ }
  } catch { /* fail-soft */ }
}

function readLoopState(sessionId) {
  try {
    const f = `H:/prism/state/shared/loop-state/loop-${sessionId}.json`;
    if (!existsSync(f)) return { iter: null, target: null };
    const p = JSON.parse(readFileSync(f, "utf-8"));
    return {
      iter: typeof p.iter === "number" ? p.iter : null,
      target: typeof p.target === "number" ? p.target : null,
    };
  } catch { return { iter: null, target: null }; }
}

function readChatActivity(chatId) {
  try {
    const p = JSON.parse(readFileSync("H:/prism/state/shared/chat-slots.json", "utf-8"));
    const slots = p?.slots || {};
    for (const s of Object.values(slots)) {
      if (s && typeof s === "object" && s.chatId === chatId) {
        return typeof s.activity === "string" ? s.activity : null;
      }
    }
  } catch { /* fail-soft */ }
  return null;
}

function readTranscriptStats(sessionId) {
  try {
    const p = resolveTranscriptPath(sessionId);
    if (!p || !existsSync(p)) return { size: null, mtimeMs: null };
    const s = statSync(p);
    return { size: s.size, mtimeMs: s.mtimeMs };
  } catch { return { size: null, mtimeMs: null }; }
}

function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf-8")); } catch { return null; }
}

function main() {
  if (isDisabled()) process.exit(0);
  const payload = readStdin();
  if (!payload || !payload.session_id) process.exit(0);
  const sessionId = String(payload.session_id);
  const chatId = `claude-${sessionId.slice(0, 8)}`;
  const slot = resolveSlotForChatId(chatId);
  if (!slot) process.exit(0);
  if (shouldThrottle(slot)) process.exit(0);

  const directive = readChatActivity(chatId);
  const loop = readLoopState(sessionId);
  const transcript = readTranscriptStats(sessionId);

  const result = recordHeartbeat({
    slot,
    sessionId,
    directive,
    currentGoal: null, // populated by the chat via separate mechanism later
    transcriptSizeBytes: transcript.size,
    transcriptMtimeMs: transcript.mtimeMs,
    loopIter: loop.iter,
    loopTarget: loop.target,
  });
  if (result.ok) markBeat(slot);
  else process.stderr.write(`[slot-session-sidecar-heartbeat] ${result.error}\n`);
  process.exit(0);
}

main();
