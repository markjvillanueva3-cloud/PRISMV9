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

function claimSlotForWindow(chatId, windowId, preferSlot, forceReclaim = false) {
  // Use a subprocess for the claim — chat-slots.mjs takes a write-lock and we
  // don't want to hold it in the hook process longer than necessary.
  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): preferSlot threaded through so
  // post-/compact auto-pin can request the slot the prior handoff named.
  // Without --force the request is advisory — chat-slots.mjs claims it only if
  // free, otherwise falls through to default walk (the mismatch warning then
  // fires below). This avoids race-evicting a fresh peer who legitimately
  // claimed the slot first; the operator can /checkin-<slot> to force-take.
  //
  // SLOT-RECLAIM (2026-05-19): forceReclaim=true threads `--force
  // --confirmRecent` so a post-/compact|/clear chat takes its PS-window-pinned
  // slot back DETERMINISTICALLY. The ps-window-pin is keyed on the PowerShell
  // ancestor PID (one per terminal window), so a peer holding this window's
  // slot is provably in a different window and has drifted — force-take is the
  // correction, not a race. Gated by shouldForceReclaim() at the call site;
  // doForce additionally requires a non-empty preferSlot so a bare `--force`
  // (which would default-walk and evict an arbitrary slot) can never escape.
  const doForce = forceReclaim === true
    && typeof preferSlot === "string" && preferSlot.length > 0;
  const args = [
    CHAT_SLOTS_HELPER, "claim",
    "--chatId", chatId,
    "--activity", doForce ? "session-start-force-reclaim" : "session-start-auto-pin",
    "--startupAuto", "true",
  ];
  // SLOT-RECLAIM-FALLBACK: only pass --terminalWindowId when one was
  // resolved. An empty value is mis-parsed by chat-slots parseFlags as
  // boolean `true`; omit it so the claim falls through cleanly to the
  // preferSlot path (the post-/compact window-id-unresolved fallback below
  // relies on this).
  if (typeof windowId === "string" && windowId.length > 0) {
    args.push("--terminalWindowId", windowId);
  }
  if (typeof preferSlot === "string" && preferSlot.length > 0) {
    args.push("--preferSlot", preferSlot);
  }
  if (doForce) {
    args.push("--force", "true", "--confirmRecent", "true");
  }
  const r = spawnSync(NODE_BIN, args, { encoding: "utf-8", timeout: CLAIM_TIMEOUT_MS, windowsHide: true });
  if (r.status !== 0 || !r.stdout) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

/**
 * SLOT-RECLAIM (2026-05-19) — pure decision: is this SessionStart eligible to
 * force-reclaim its terminal's prior slot?
 *
 * TRUE only when ALL of:
 *   - the event is a post-/compact or post-/clear resume (`source`);
 *   - a prior slot was resolved for this terminal (`priorSlot` — sourced from
 *     the ps-window-pin, the per-chat handoff, OR the slot-identity cache);
 *   - the operator has not disabled it (PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM).
 *
 * This is the FIRST of two gates. It answers only "is a force-reclaim in
 * scope?" — it does NOT decide whether the target slot is SAFE to take. That
 * second question (never evict a live operator-bound peer) is
 * peerBlocksForceReclaim(); main() ANDs the two.
 *
 * On a `startup`/`resume` event a window may legitimately be racing for a
 * fresh slot, so an advisory claim is correct there — force is withheld. The
 * decision is isolated as a pure function so it can be unit-tested without
 * spawning the chat-slots subprocess.
 *
 * @param {string} source — SessionStart trigger (startup|resume|compact|clear)
 * @param {string|null|undefined} priorSlot — this terminal's prior slot, or null
 * @param {Record<string,string|undefined>} [env] — defaults to process.env
 * @returns {boolean}
 */
export function shouldForceReclaim(source, priorSlot, env = process.env) {
  if (env.PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM === "1") return false;
  const s = (source || "").toString().toLowerCase();
  if (s !== "compact" && s !== "clear") return false;
  return typeof priorSlot === "string" && priorSlot.length > 0;
}

// Activities chat-slots records for a slot bound by an automated SessionStart
// hook — NOT an operator /checkin or /startup. A peer holding a slot under one
// of these auto-pin activities drifted in; it is safe to force-reclaim from.
// Keep in sync with the --activity values claimSlotForWindow passes.
const AUTO_PIN_ACTIVITIES = new Set([
  "session-start-auto-pin",
  "session-start-auto-resolve",
  "session-start-force-reclaim",
]);

// Mirrors chat-slots.mjs CRASH_TTL_MS — a slot with no heartbeat for longer
// than this is crashed, and freely reclaimable.
const CRASH_TTL_MS = 10 * 60 * 1000;

/**
 * SLOT-RECLAIM (2026-05-19) — pure SAFETY gate: does the peer currently
 * holding `slot` BLOCK a force-reclaim?
 *
 * The prior-slot signal (ps-window-pin / handoff / slot-identity cache) can go
 * stale — a PowerShell PID gets reused by a new window, or an operator
 * `/checkin-<other>` moved this chat to a different slot without rewriting the
 * signal. A blind force-take would then evict a healthy, legitimately
 * operator-bound peer. This gate forbids that: force-reclaim is permitted ONLY
 * when the target slot is
 *   - free, or
 *   - already held by this chat, or
 *   - held by a CRASHED peer (no heartbeat past CRASH_TTL_MS), or
 *   - held by an AUTO-PINNED peer (drifted in via a SessionStart hook).
 * A live/stale, operator-bound peer (activity `checkin`/`startup`/…) BLOCKS.
 *
 * Fail-SAFE: any parse error or unknown state → TRUE (block the force-take).
 * When in doubt, never force-evict.
 *
 * @param {string} slot — the slot a force-reclaim would target
 * @param {string} chatId — this chat's stable id
 * @param {object|null} slotsState — parsed chat-slots.json, or null
 * @param {number} [nowMs] — defaults to Date.now()
 * @returns {boolean} TRUE = force-reclaim must downgrade to an advisory claim
 */
export function peerBlocksForceReclaim(slot, chatId, slotsState, nowMs = Date.now()) {
  try {
    const s = slotsState && slotsState.slots ? slotsState.slots[slot] : null;
    if (s == null) return false;                // slot free → nothing to evict
    // A present-but-malformed slot entry is genuine corruption — block the
    // force-take (fail-safe: never force-evict when the holder is unknowable).
    if (typeof s !== "object" || typeof s.chatId !== "string" || !s.chatId) {
      return true;
    }
    if (s.chatId === chatId) return false;      // already mine → no eviction
    const hb = Date.parse(s.lastHeartbeat);
    if (Number.isFinite(hb) && (nowMs - hb) > CRASH_TTL_MS) return false; // crashed
    if (AUTO_PIN_ACTIVITIES.has(s.activity)) return false; // auto-pinned drift
    return true;                                // live, operator-bound → BLOCK
  } catch {
    return true;                                // fail-safe — never force on doubt
  }
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
// Canonical 26-slot fleet — the full NATO phonetic alphabet (alpha..zulu).
// MUST stay byte-equal to chat-slots.mjs SLOT_NAMES. Realigned 13→26 on
// 2026-05-19 (the stale 13-slot copy made extractSlotFromTopicOrFilename
// reject every november..zulu topic/filename prefix).
const VALID_SLOTS = new Set([
  "alpha","bravo","charlie","delta","echo","foxtrot","golf",
  "hotel","india","juliett","kilo","lima","mike","november",
  "oscar","papa","quebec","romeo","sierra","tango","uniform",
  "victor","whiskey","xray","yankee","zulu",
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

  // U-SDF20: pass session_id so the resolver's tier-0 cache + never-downgrade
  // rule activate (was undefined → fresh tier resolve every call → tier-drift
  // defeated cross-chat terminal-pin inheritance).
  const windowId = await resolveWindowId(stdin.session_id);
  if (!windowId) {
    // SLOT-RECLAIM-FALLBACK (bravo post-/compact no-op fix): a null windowId
    // (WT_SESSION absent + ancestor-walk flake -- a known Win11 class) must
    // NOT abandon the slot. The force-reclaim path keys on the PRIOR SLOT
    // (which carries the full ps-pin -> handoff -> sticky-cache fallback
    // chain via readPriorSlotFromHandoff), NOT windowId, so we can still
    // DETERMINISTICALLY re-bind by name on a compact/clear event. Only the
    // advisory auto-pin (which needs a window to match) is lost. Without
    // this, a post-/compact chat whose window-id failed to resolve silently
    // stayed slotless (operator-reported: bravo). Double-gated by
    // shouldForceReclaim (compact/clear only) + peerBlocksForceReclaim
    // (never evicts a healthy operator-bound peer).
    const fbSource = (stdin.source || stdin.trigger || "").toString().toLowerCase();
    const fbPriorSlot = readPriorSlotFromHandoff(chatId).slot || null;
    if (shouldForceReclaim(fbSource, fbPriorSlot)) {
      let force = true;
      try {
        const slotsState = JSON.parse(fs.readFileSync((process.env.PRISM_ROOT || "H:/prism") + "/state/shared/chat-slots.json", "utf-8"));
        if (peerBlocksForceReclaim(fbPriorSlot, chatId, slotsState)) force = false;
      } catch { force = false; } // fail-safe: can't read state -> never force-evict
      if (force) {
        const r = claimSlotForWindow(chatId, "", fbPriorSlot, true);
        if (r && r.ok) {
          emit(process.env.PRISM_TERMINAL_PIN_VERBOSE === "1"
            ? { continue: true, hookSpecificOutput: { hookEventName: "SessionStart",
                additionalContext: `Slot ${r.slot} reclaimed by sticky-cache fallback (window-id unresolved)` } }
            : SILENCE);
          return;
        }
      }
    }
    emit(SILENCE); return;
  }

  // U-SDF21 (2026-05-17): PS-window-pin is the most authoritative source —
  // anchored on the PowerShell ancestor PID (stable for the window's life),
  // survives /compact, /clear, crashes, chat-respawn. Wins over handoff-derived
  // priorSlot. Fail-soft: helper missing/broken → fall back to handoff path.
  let psPinMod = null;
  try {
    psPinMod = await import("../helpers/ps-window-pin.mjs");
  } catch { psPinMod = null; }
  let psPinSlot = null;
  if (psPinMod) {
    try {
      const pin = psPinMod.readPinForCurrentWindow({ sessionId: stdin.session_id });
      if (pin && pin.slot) psPinSlot = pin.slot;
    } catch { /* fail-soft */ }
  }

  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-17): handoff fallback when no PS-pin.
  // The handoff topic prefix carries the durable slot identity.
  const priorSlot = psPinSlot || readPriorSlotFromHandoff(chatId).slot || null;

  // SLOT-RECLAIM (2026-05-19): on a post-/compact or post-/clear SessionStart,
  // FORCE-reclaim this terminal's prior slot instead of an advisory claim. The
  // advisory path silently lands this chat in a different slot (and only
  // warns) when a peer drifted into the slot during the /compact release
  // window — leaving the operator to /checkin-<slot> by hand. Force-reclaim
  // re-binds the correct slot deterministically.
  //
  // Keyed on `priorSlot` — ps-window-pin FIRST, then the per-chat handoff,
  // then the slot-identity cache (see priorSlot above). The ps-window-pin is
  // the ideal window-keyed signal but is frequently empty (findPsAncestorPid
  // resolves nothing on many hosts), so the handoff/cache fallback is what
  // actually carries the identity in practice.
  //
  // TWO gates: shouldForceReclaim (event + a known prior slot) AND NOT
  // peerBlocksForceReclaim (the target slot is not held by a live
  // operator-bound peer). The safety gate is what makes keying on the
  // advisory handoff signal safe — a stale prior-slot can never evict a
  // healthy /checkin peer. Knob: PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM=1.
  const source = (stdin.source || stdin.trigger || "").toString().toLowerCase();
  let forceReclaim = shouldForceReclaim(source, priorSlot);
  if (forceReclaim) {
    try {
      const slotsFile = "H:/prism/state/shared/chat-slots.json";
      const slotsState = fs.existsSync(slotsFile)
        ? JSON.parse(fs.readFileSync(slotsFile, "utf-8"))
        : null;
      if (peerBlocksForceReclaim(priorSlot, chatId, slotsState)) {
        forceReclaim = false;  // target slot held by a healthy peer → advisory
      }
    } catch { forceReclaim = false; }  // fail-safe — never force on a read error
  }

  const result = claimSlotForWindow(chatId, windowId, priorSlot, forceReclaim);
  if (!result?.ok) { emit(SILENCE); return; }

  // U-SDF21: refresh the PS-pin so its writtenAt clock resets — keeps the
  // 7-day age-prune from evicting actively-used windows.
  if (psPinMod && result.slot) {
    try {
      psPinMod.tryWritePinForCurrentWindow({
        slot: result.slot, chatId, sessionId: stdin.session_id,
      });
    } catch { /* fail-soft */ }
  }

  // SLOT-RECLAIM (2026-05-19): when force-reclaim evicted a peer that had
  // drifted into this terminal's slot during the /compact|/clear window,
  // surface it loud — a peer chat just lost its slot binding and both the
  // operator and this chat should know the slot was forcibly re-bound here.
  // chat-slots tags a genuine eviction with previousOwner.reason ===
  // "force-takeover" (a same-window /compact inheritance carries no
  // previousOwner), so this fires ONLY on a real cross-window reclaim — the
  // common no-eviction case stays silent.
  if (forceReclaim && result.previousOwner &&
      result.previousOwner.reason === "force-takeover") {
    emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: [
          `## 🔒 Slot \`${result.slot}\` force-reclaimed for this PowerShell terminal`,
          ``,
          `This window owns slot \`${result.slot}\` (ps-window-pin binding). Peer \`${result.previousOwner.chatId}\` had drifted into it during the /${source} window — force-takeover evicted that peer and re-bound \`${result.slot}\` to this chat.`,
          ``,
          `The evicted peer will re-pin its own terminal's slot on its next SessionStart. No action needed here — the slot is correct.`,
        ].join("\n"),
      },
    });
    return;
  }

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

// Run main() only when this file is invoked as a script — not when a test
// imports it for the exported shouldForceReclaim(). FAIL-OPEN: if the
// argv/import.meta probe throws, default to running. A SessionStart hook must
// never be silently dead; the only cost of a false-positive run is one
// fail-soft {continue:true} emission. A test file's basename is *.test.mjs,
// which never equals this hook's basename, so __isMain resolves false there.
const __isMain = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    const argv1Base = argv1.split("/").pop() || "";
    return argv1Base.length > 0
      && import.meta.url.replace(/\\/g, "/").endsWith(argv1Base);
  } catch { return true; }
})();
if (__isMain) main().catch(() => emit(SILENCE));
