#!/usr/bin/env node
// tier: T1
/**
 * session-start-terminal-pin.mjs — Auto-claim the slot owned by THIS terminal
 * window on every SessionStart (startup | resume | compact | clear).
 *
 * Solves: a PowerShell window that ran chat A in slot alpha now spawns chat B
 * (via /clear, /compact, or fresh `claude` invocation). Without this hook, B
 * runs slotless until the operator manually /checkin. With this hook, B
 * inherits alpha automatically — chat-slots.json finds the slot whose
 * terminalWindowId matches and re-binds the new chatId to it (see
 * chat-slots.mjs `claimSlot` terminal-pin branch added in schema v2).
 *
 * Design intent (10-chat fleet, conflict-free):
 *   - 10 PowerShell windows → 10 distinct WT_SESSION / shell-ancestor PIDs
 *     → 10 deterministic slot bindings, never drifting.
 *   - One window can be in any state (startup/resume/compact/clear) and
 *     still re-find its slot — the lookup key is the window, not the chat.
 *
 * Failure policy:
 *   - ALL failures emit silence (`{continue:true,suppressOutput:true}`). The
 *     auto-pin is convenience; never block SessionStart over it.
 *   - When the helper can't resolve a window id (no WT_SESSION, no ancestor
 *     shell, no ppid) the hook is a no-op. The chat keeps its prior /checkin
 *     behavior — it'll claim a slot the first time the operator runs /checkin.
 *
 * Knobs:
 *   PRISM_TERMINAL_PIN_DISABLE=1   — turn the auto-pin off entirely
 *   PRISM_TERMINAL_PIN_VERBOSE=1   — emit a one-line confirmation to additionalContext
 */

import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const TERMINAL_WINDOW_HELPER = "H:/prism/.claude/helpers/terminal-window-id.mjs";
const CHAT_SLOTS_HELPER = "H:/prism/.claude/helpers/chat-slots.mjs";
const NODE_BIN = process.env.PRISM_NODE_BIN || process.execPath;
const CLAIM_TIMEOUT_MS = 4000;
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

function stableIdFromSession(sid) {
  if (!sid || typeof sid !== "string") return null;
  const hex = sid.replace(/[^0-9a-f]/gi, "").toLowerCase().slice(0, 8);
  return hex.length === 8 ? `claude-${hex}` : null;
}

async function resolveWindowId(sessionId) {
  // Prefer in-process import so we don't pay spawn cost on every SessionStart.
  // Fall back to subprocess if the module fails to load.
  // Pass sessionId so the resolver's tier-0 cache activates (kills the
  // intermittent-wmic drift class — the most common observed lane-drift
  // pathology on Win11 hosts).
  try {
    if (!fs.existsSync(TERMINAL_WINDOW_HELPER)) return null;
    const mod = await import(pathToFileURL(TERMINAL_WINDOW_HELPER).href);
    return mod.resolveTerminalWindowId({ sessionId }) || null;
  } catch {
    try {
      const args = sessionId ? [TERMINAL_WINDOW_HELPER, sessionId] : [TERMINAL_WINDOW_HELPER];
      const r = spawnSync(NODE_BIN, args, {
        encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS, windowsHide: true,
      });
      if (r.status !== 0) return null;
      const out = (r.stdout || "").trim();
      return (out && out !== "null") ? out : null;
    } catch { return null; }
  }
}

function claimSlotForWindow(chatId, windowId) {
  // Use a subprocess for the claim — chat-slots.mjs takes a write-lock and we
  // don't want to hold it in the hook process longer than necessary.
  const r = spawnSync(NODE_BIN, [
    CHAT_SLOTS_HELPER, "claim",
    "--chatId", chatId,
    "--terminalWindowId", windowId,
    "--activity", "session-start-auto-pin",
    "--startupAuto", "true",
  ], { encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS, windowsHide: true });
  if (r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

// AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01: scan handoffs/ for the most recent
// HANDOFF-<chatId>-<slot>-<topic>.md and extract the `slot:` + `topic:` from
// frontmatter. Used to detect "prior session held slot X, but peer took it
// during my crash/compact window" — surfaced as an additionalContext warning
// so the operator (or the model) knows to force-take. Fail-soft: returns
// `{slot:null, topic:null, file:null}` on any error.
function readPriorSlotFromHandoff(chatId) {
  try {
    const handoffsDir = "H:/prism/state/shared/handoffs";
    if (!fs.existsSync(handoffsDir)) return { slot: null, topic: null, file: null };
    const wanted = `HANDOFF-${chatId}-`;
    const candidates = fs.readdirSync(handoffsDir)
      .filter(n => n.startsWith(wanted) && n.endsWith(".md"))
      .map(n => ({ name: n, mtime: fs.statSync(`${handoffsDir}/${n}`).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (candidates.length === 0) return { slot: null, topic: null, file: null };
    const file = `${handoffsDir}/${candidates[0].name}`;
    const content = fs.readFileSync(file, "utf-8");
    const slotM = content.match(/^slot:\s*([^\n]*)$/m);
    const topicM = content.match(/^topic:\s*([^\n]*)$/m);
    const slot = slotM ? (slotM[1].trim().toLowerCase() || null) : null;
    const topic = topicM ? (topicM[1].trim() || null) : null;
    return { slot, topic, file: candidates[0].name };
  } catch { return { slot: null, topic: null, file: null }; }
}

async function main() {
  if (process.env.PRISM_TERMINAL_PIN_DISABLE === "1") { emit(SILENCE); return; }
  if (!fs.existsSync(CHAT_SLOTS_HELPER)) { emit(SILENCE); return; }

  const stdin = readStdinSync() || {};
  const chatId = stableIdFromSession(stdin.session_id);
  if (!chatId) { emit(SILENCE); return; }

  const windowId = await resolveWindowId();
  if (!windowId) { emit(SILENCE); return; }

  const result = claimSlotForWindow(chatId, windowId);
  if (!result?.ok) { emit(SILENCE); return; }

  // F10 — pipeline replay: when terminal-pin inherits a slot AND the prior
  // chat had `pipelineStep` set (mid-loop), surface an auto-resume hint with
  // the prior iter/target so the new chat can pick up where the old one
  // left off. This complements the per-chat handoff RESUME directive
  // (session-start-auto-resume.mjs covers /compact; F10 covers the same-
  // window-new-chat case where chatId changed but the window persisted).
  const state = result.state || {};
  if (result.terminalPinned && state.pipelineStep) {
    const iter = state.pipelineIter ?? null;
    const target = state.pipelineTarget ?? null;
    const progress = (iter != null && target != null) ? ` (iter ${iter}/${target})` : "";
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: [
          `## 🔁 Pipeline replay — slot ${result.slot} re-bound to this window`,
          ``,
          `Previous chat (${result.previousChatId}) was mid-pipeline:`,
          `  • step: \`${state.pipelineStep}\`${progress}`,
          `  • last activity: \`${state.activity || "—"}\``,
          ``,
          `To continue: re-invoke the pipeline (\`/checkin /loop ...\`) — the loop-state for the prior chat is in \`state/shared/loop-state/loop-${result.previousChatId.replace(/^claude-/, "")}*.json\`. Carry the iter/target forward.`,
        ].join("\n"),
      },
    });
    return;
  }

  // AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01: slot-mismatch warning.
  // When the most recent handoff for this chatId names a slot but the
  // current claim landed in a DIFFERENT slot, surface this loud — a peer
  // took the prior slot while this chat was crashed / mid-compact. The
  // operator (or model) decides whether to force-take or live with the new
  // slot. Quiet path: same slot OR no handoff with slot info OR no current
  // slot returned. Disable: PRISM_TERMINAL_PIN_NO_MISMATCH_WARN=1.
  if (process.env.PRISM_TERMINAL_PIN_NO_MISMATCH_WARN !== "1") {
    const prior = readPriorSlotFromHandoff(chatId);
    const currentSlot = (result.slot || "").toString().toLowerCase();
    if (prior.slot && currentSlot && prior.slot !== currentSlot) {
      emit({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: [
            `## ⚠ Slot drift — prior session held \`${prior.slot}\`, current claim is \`${currentSlot}\``,
            ``,
            `The handoff \`${prior.file}\` carries \`slot: ${prior.slot}\` but the terminal-pin claim landed on \`${currentSlot}\`. A peer chat took \`${prior.slot}\` while this chat was crashed or mid-compact.`,
            ``,
            `**Options:**`,
            `1. Live with \`${currentSlot}\` — re-bind handoff: \`/checkin --topic ${prior.topic || "<new-topic>"}\``,
            `2. Force-take \`${prior.slot}\` (only if peer is genuinely dead): \`node H:/prism/.claude/helpers/chat-slots.mjs claim --chatId ${chatId} --preferSlot ${prior.slot} --force true --confirmRecent true\``,
            ``,
            `Check who holds \`${prior.slot}\` first: \`node H:/prism/scripts/fleet-status.mjs\``,
          ].join("\n"),
        },
      });
      return;
    }
  }

  // Verbose path — surface a short confirmation when the operator opts in.
  // Otherwise stay silent. The verbose line is informational only and never
  // alters Claude's behavior.
  if (process.env.PRISM_TERMINAL_PIN_VERBOSE === "1") {
    const note = result.terminalPinned
      ? `🪟 Slot **${result.slot}** re-bound to this window (previous chat: ${result.previousChatId})`
      : result.alreadyOwned
        ? `🪟 Slot **${result.slot}** heartbeat refreshed`
        : `🪟 Slot **${result.slot}** claimed for this window (${windowId})`;
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: note,
      },
    });
    return;
  }
  emit(SILENCE);
}

main().catch(() => emit(SILENCE));
