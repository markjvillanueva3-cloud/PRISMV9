#!/usr/bin/env node
// tier: T1
/**
 * precompact-release-slot.mjs — PreCompact hook
 *
 * Operator directive (2026-05-15): "compaction should auto free up slots".
 *
 * When a chat /compacts, release its slot so other chats can claim it during
 * the compact-window. The post-/compact chat (same window) will re-claim its
 * slot via session-start-terminal-pin.mjs on SessionStart:compact — that hook
 * matches by `terminalWindowId`, so the natural re-binding lands on the same
 * slot UNLESS a peer chat grabbed it during the compact window. The peer-
 * grabbed case is handled by the AAM01 slot-drift warning in terminal-pin
 * (PRISM_TERMINAL_PIN_NO_MISMATCH_WARN to silence).
 *
 * Why release at all? Two reasons:
 *   1. Compact-windows can take 30-60s; during that time the slot was being
 *      blocked from other chats even though the chat was effectively idle.
 *      Releasing frees the slot for ad-hoc work.
 *   2. Slot-drift becomes EXPLICIT — when the post-compact chat finds its
 *      slot was claimed by a peer, the slot-drift warning surfaces the
 *      conflict instead of silent shadowing.
 *
 * Failure policy: fail-soft. Compact MUST proceed regardless of release
 * success. Any error in this hook is swallowed; the slot remains claimed but
 * the compact still happens.
 *
 * Knobs:
 *   PRISM_PRECOMPACT_RELEASE_SLOT_DISABLE=1   — keep slot bound (legacy behavior)
 *   PRISM_PRECOMPACT_RELEASE_SLOT_VERBOSE=1   — emit confirmation context
 *
 * FIRES ON: PreCompact
 * BLOCKING: never — advisory side-effect only
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";

const KILL_SWITCH = "PRISM_PRECOMPACT_RELEASE_SLOT_DISABLE";
const VERBOSE = "PRISM_PRECOMPACT_RELEASE_SLOT_VERBOSE";
const CHAT_SLOTS_HELPER = "H:/prism/.claude/helpers/chat-slots.mjs";
const NODE_BIN = process.env.PRISM_NODE_BIN || process.execPath;
const RELEASE_TIMEOUT_MS = 3000;
const STABLE_ID_HEX_LEN = 8;
const SILENCE = { continue: true, suppressOutput: true };

function readStdinSync() {
  try {
    if (process.stdin.isTTY) return null;
    const buf = fs.readFileSync(0, "utf-8");
    if (!buf || !buf.trim().startsWith("{")) return null;
    return JSON.parse(buf);
  } catch { return null; }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

/**
 * Build the PreCompact verdict for the VERBOSE confirmation path. PreCompact
 * has NO `hookSpecificOutput` contract (that shape is valid only for
 * PreToolUse/UserPromptSubmit/PostToolUse/PostToolBatch/Stop), so a note must
 * ride the top-level `systemMessage` field -- the earlier hookSpecificOutput
 * shape was rejected by the harness, silently dropping the slot-release
 * warning. Sibling fix: precompact-memo-emit U-PRECOMPACT-MEMO-CONTRACT. Pure.
 */
export function buildVerboseVerdict(note) {
  return { continue: true, systemMessage: note };
}

export function stableIdFromSession(sid) {
  if (!sid || typeof sid !== "string") return null;
  const hex = sid.replace(/[^0-9a-f]/gi, "").toLowerCase().slice(0, STABLE_ID_HEX_LEN);
  return hex.length === STABLE_ID_HEX_LEN ? `claude-${hex}` : null;
}

export function releaseSlot(chatId) {
  if (!fs.existsSync(CHAT_SLOTS_HELPER)) return { ok: false, reason: "helper missing" };
  const r = spawnSync(NODE_BIN, [CHAT_SLOTS_HELPER, "release", "--chatId", chatId], {
    encoding: "utf-8", timeout: RELEASE_TIMEOUT_MS, windowsHide: true,
  });
  if (r.status !== 0 || !r.stdout) {
    return { ok: false, reason: (r.stderr || `exit ${r.status}`).slice(0, 120) };
  }
  try { return { ok: true, result: JSON.parse(r.stdout) }; }
  catch { return { ok: true, result: null }; }
}

(function main() {
  if (process.env[KILL_SWITCH] === "1") { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  const chatId = stableIdFromSession(stdin.session_id);
  if (!chatId) { emit(SILENCE); return; }

  const result = releaseSlot(chatId);

  if (process.env[VERBOSE] === "1") {
    const slot = result?.result?.slot || result?.result?.previousSlot || null;
    const note = result.ok
      ? `🔓 PreCompact slot release${slot ? ` — slot ${slot} freed for fleet` : ""}; terminal-pin will re-claim on SessionStart:compact`
      : `⚠ PreCompact slot release failed (${result.reason}) — slot remains claimed`;
    emit(buildVerboseVerdict(note));
    return;
  }

  emit(SILENCE);
})();
