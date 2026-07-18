#!/usr/bin/env node
// tier: T3
/**
 * slot-session-sidecar-stop.mjs — Stop hook (U-SR04)
 *
 * SLOT-RECOVERY-MS0/U-SR04 (2026-05-25, slot:golf)
 * Spec: state/shared/specs/SLOT-RECOVERY-MS0.md §4
 *
 * Appends a session-end event to state/shared/slot-sessions/<slot>.jsonl
 * when the chat reaches a clean Stop. exitState=stop. The final RESUME
 * text is pulled from the slot's handoff file if it exists, capped at
 * 500 chars.
 *
 * Order: this hook must fire AFTER precompact-handoff.mjs / enforce-
 * handoff-topic.mjs so the slot's handoff path + RESUME text are settled.
 * Wire in settings.json Stop chain LATE in the order.
 *
 * Note: PreCompact and the auto-trigger compact path are handled by their
 * own variants (or, in this MS, by the PRISM precompact-handoff hook which
 * already writes the slot handoff — we just stamp the session-end event).
 *
 * Knob: PRISM_SLOT_SESSION_SIDECAR_DISABLE=1 short-circuits.
 *
 * Exit semantics: NEVER blocks Stop. All errors → exit 0.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  isDisabled,
  recordSessionEnd,
  resolveSlotForChatId,
  resolveTranscriptPath,
} from "../helpers/slot-session-sidecar.mjs";

const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";

function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf-8")); } catch { return null; }
}

/**
 * Find the slot's most recent handoff file by `slot:` frontmatter match.
 * Mirrors the resolution path used by per-agent-handoff.mjs newestHandoffForSlot.
 * Returns { path, resume } or null.
 */
function readLatestHandoffForSlot(slot) {
  if (!existsSync(HANDOFFS_DIR)) return null;
  let files;
  try {
    files = readdirSync(HANDOFFS_DIR).filter((f) => f.startsWith("HANDOFF-") && f.endsWith(".md"));
  } catch { return null; }
  const matches = [];
  for (const f of files) {
    const fp = join(HANDOFFS_DIR, f);
    try {
      const content = readFileSync(fp, "utf-8");
      const slotMatch = content.match(/^slot:[ \t]*([^\r\n]*?)[ \t]*$/m);
      if (slotMatch && slotMatch[1].trim().toLowerCase() === slot) {
        matches.push({ path: fp, content, mtime: statSync(fp).mtimeMs });
      }
    } catch { /* skip unreadable */ }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.mtime - a.mtime);
  const top = matches[0];
  // Extract ## RESUME section
  const m = top.content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
  const resume = m ? m[1].trim().slice(0, 500) : null;
  return { path: top.path, resume };
}

function readTranscriptSize(sessionId) {
  try {
    const p = resolveTranscriptPath(sessionId);
    if (!p || !existsSync(p)) return null;
    return statSync(p).size;
  } catch { return null; }
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

function main() {
  if (isDisabled()) process.exit(0);
  const payload = readStdin();
  if (!payload || !payload.session_id) process.exit(0);
  const sessionId = String(payload.session_id);
  const chatId = `claude-${sessionId.slice(0, 8)}`;
  const slot = resolveSlotForChatId(chatId);
  if (!slot) process.exit(0);

  const handoff = readLatestHandoffForSlot(slot);
  const loop = readLoopState(sessionId);

  const result = recordSessionEnd({
    slot,
    sessionId,
    exitState: "stop",
    directive: readChatActivity(chatId),
    finalResume: handoff?.resume ?? null,
    handoffPath: handoff?.path ?? null,
    transcriptSizeBytes: readTranscriptSize(sessionId),
    loopIter: loop.iter,
    loopTarget: loop.target,
  });
  if (!result.ok) {
    process.stderr.write(`[slot-session-sidecar-stop] ${result.error}\n`);
  }
  process.exit(0);
}

main();
