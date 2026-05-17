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
import { lastKnownSlotForChat as _lastKnownSlotForChat } from "../helpers/slot-identity-cache.mjs";

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

function claimSlotForWindow(chatId, windowId, preferSlot) {
  // Use a subprocess for the claim — chat-slots.mjs takes a write-lock and we
  // don't want to hold it in the hook process longer than necessary.
  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): preferSlot threaded through so
  // post-/compact auto-pin can request the slot the prior handoff named.
  // Without --force the request is advisory — chat-slots.mjs claims it only if
  // free, otherwise falls through to default walk (the mismatch warning then
  // fires below). This avoids race-evicting a fresh peer who legitimately
  // claimed the slot first; the operator can /checkin-<slot> to force-take.
  const args = [
    CHAT_SLOTS_HELPER, "claim",
    "--chatId", chatId,
    "--terminalWindowId", windowId,
    "--activity", "session-start-auto-pin",
    "--startupAuto", "true",
  ];
  if (typeof preferSlot === "string" && preferSlot.length > 0) {
    args.push("--preferSlot", preferSlot);
  }
  const r = spawnSync(NODE_BIN, args, { encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS, windowsHide: true });
  if (r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

// AUTOCOMPACT-AUTONOMOUS-MS0/U-AAM01: scan handoffs/ for the most recent
// HANDOFF-<chatId>-<slot>-<topic>.md and extract the `slot:` + `topic:` from
// frontmatter. Used to detect "prior session held slot X, but peer took it
// during my crash/compact window" — surfaced as an additionalContext warning
// so the operator (or the model) knows to force-take. Fail-soft: returns
// `{slot:null, topic:null, file:null}` on any error.
// SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): NATO-prefix extraction set.
// Source-of-truth for valid slot names — anything not in here is rejected
// (defends against topic strings that *coincidentally* start with a word
// resembling a NATO call sign).
const VALID_SLOTS = new Set([
  "alpha","bravo","charlie","delta","echo","foxtrot","golf",
  "hotel","india","juliett","kilo","lima","mike",
]);

function extractSlotFromTopicOrFilename(s) {
  if (typeof s !== "string" || s.length === 0) return null;
  // Match leading NATO word followed by `-` (topic) or `.` / end (filename tail).
  const m = s.toLowerCase().match(/^([a-z]+)[-._]/);
  if (!m) return null;
  return VALID_SLOTS.has(m[1]) ? m[1] : null;
}

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
    const slotM = content.match(/^slot:[ \t]*([^\n]*)$/m);
    const topicM = content.match(/^topic:[ \t]*([^\n]*)$/m);
    const slotFromField = slotM ? (slotM[1].trim().toLowerCase() || null) : null;
    const topic = topicM ? (topicM[1].trim() || null) : null;
    // U-SDF05: 3-tier slot extraction — `slot:` field (most explicit) →
    // topic NATO-prefix → filename suffix-after-chatId NATO-prefix.
    // The topic+filename fallbacks survive the transient chat-slots.json
    // gap that the writer's lookup races against: precompact-handoff fired
    // while bravo binding had momentarily lapsed → writer omitted `slot:`
    // line → drift warning never fired → bravo→delta silent drift.
    // Topic+filename were ALWAYS slot-prefixed (precompact-handoff's
    // `slotPrefix` logic at line 405 is the same source), so they're a more
    // durable identity signal than the writer's transient lookup.
    const slotFromField2 = slotFromField && VALID_SLOTS.has(slotFromField) ? slotFromField : null;
    const slotFromTopic = extractSlotFromTopicOrFilename(topic);
    const filenameSuffix = candidates[0].name.slice(`HANDOFF-${chatId}-`.length);
    const slotFromFile = extractSlotFromTopicOrFilename(filenameSuffix);
    // SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): tier-4 sticky-cache fallback.
    // When all 3 handoff-derived tiers return null (e.g. the precompact
    // writer wrote "slot unbound" because chat-slots.json had already
    // evicted this chat), read state/shared/chat-slot-history/<chatId>.json.
    // That file is written on EVERY successful claim and survives eviction;
    // it's the ground-truth record of "this chat's last known slot."
    let slotFromCache = null;
    if (!slotFromField2 && !slotFromTopic && !slotFromFile) {
      try {
        const recovered = _lastKnownSlotForChat(chatId);
        if (recovered && VALID_SLOTS.has(recovered.toLowerCase())) {
          slotFromCache = recovered.toLowerCase();
        }
      } catch { /* fail-soft */ }
    }
    const slot = slotFromField2 || slotFromTopic || slotFromFile || slotFromCache;
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

  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): read prior slot from handoff
  // BEFORE claiming so we can pass --preferSlot. Without this the auto-pin
  // falls through to default walk and takes whatever slot is next-free —
  // observed pathology: claude-339c8ff7 was bravo, two chats compacted at
  // once, peer won bravo, this chat silently auto-pinned to delta. The
  // handoff topic prefix carries the durable slot identity (more reliable
  // than chat-slots.json which can have transient gaps).
  const priorSlot = readPriorSlotFromHandoff(chatId).slot || null;

  const result = claimSlotForWindow(chatId, windowId, priorSlot);
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

  // SLOT-DRIFT-FIX-MS0/U-SDF06 (2026-05-17): cross-chat collision auto-resolve.
  // When auto-pin drifted to a DIFFERENT slot than the handoff named, inspect
  // the peer holding the contested slot. If peer is `session-start-auto-pin`
  // (not operator-bound via /checkin) AND peer's handoff does NOT name the
  // contested slot, this chat has the stronger claim → auto force-take.
  // This closes the residual collision-with-manual-recovery gap U-SDF05 left.
  // Knob: PRISM_TERMINAL_PIN_NO_AUTO_RESOLVE=1 disables auto-takeover.
  if (priorSlot &&
      result.slot &&
      priorSlot !== result.slot.toLowerCase() &&
      process.env.PRISM_TERMINAL_PIN_NO_AUTO_RESOLVE !== "1") {
    try {
      const slotsFile = "H:/prism/state/shared/chat-slots.json";
      if (fs.existsSync(slotsFile)) {
        const slotsState = JSON.parse(fs.readFileSync(slotsFile, "utf-8"));
        const peer = slotsState?.slots?.[priorSlot];
        // Only auto-resolve if peer is itself auto-pinned (no deliberate claim).
        if (peer && peer.chatId && peer.activity === "session-start-auto-pin") {
          const peerSlot = readPriorSlotFromHandoff(peer.chatId).slot;
          // Peer's handoff does NOT name the contested slot → I win.
          if (!peerSlot || peerSlot !== priorSlot) {
            const takeoverArgs = [
              CHAT_SLOTS_HELPER, "claim",
              "--chatId", chatId,
              "--terminalWindowId", windowId,
              "--activity", "session-start-auto-resolve",
              "--preferSlot", priorSlot,
              "--force", "true",
              "--confirmRecent", "true",
            ];
            const takeover = spawnSync(NODE_BIN, takeoverArgs,
              { encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS, windowsHide: true });
            if (takeover.status === 0 && takeover.stdout) {
              try {
                const tr = JSON.parse(takeover.stdout);
                if (tr.ok && tr.slot === priorSlot) {
                  emit({
                    continue: true,
                    hookSpecificOutput: {
                      hookEventName: "SessionStart",
                      additionalContext: [
                        `## 🔄 Slot auto-resolved — moved from \`${result.slot}\` to \`${priorSlot}\``,
                        ``,
                        `Handoff named \`${priorSlot}\` but auto-pin initially landed on \`${result.slot}\` (race with peer \`${peer.chatId}\`).`,
                        `Peer was \`session-start-auto-pin\` (no operator claim) and their handoff does not name \`${priorSlot}\` — this chat has the stronger claim.`,
                        `Force-takeover succeeded (U-SDF06 cross-chat resolution).`,
                      ].join("\n"),
                    },
                  });
                  return;
                }
              } catch { /* takeover JSON parse failed — fall through to warning */ }
            }
          }
          // Else: peer's handoff ALSO names priorSlot → true collision → warn below.
        }
        // Else: peer is operator-bound (/checkin) → respect their claim → warn below.
      }
    } catch { /* peer-inspect best-effort — fall through to warning */ }
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
