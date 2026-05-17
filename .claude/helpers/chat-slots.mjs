#!/usr/bin/env node
/**
 * chat-slots.mjs — 7-slot fleet manager for concurrent PRISM chats.
 *
 * Replaces opaque 8-char hex chat ids in handoff filenames with NATO-phonetic
 * slot names (alpha..juliett — 9 work + 1 hygiene = 10 total). Each Claude/Codex
 * session at SessionStart claims the first free slot; the slot binding lives
 * for the lifetime of the chat (or until the 10-minute heartbeat TTL elapses
 * and the slot is auto-reclaimed for the next session).
 *
 * Why slots exist:
 *   - 7 chats (alpha..foxtrot work + golf hygiene) compacting on `main` simultaneously all derive the same topic
 *     and produce colliding HANDOFF-<id>.md filenames. Slots give each chat
 *     a stable human-readable lane name independent of branch/topic state.
 *   - The chat bus already tracks `claude-<8hex>` ids but operators can't
 *     remember which is which. "alpha is editing the neural engine, bravo
 *     is on tribal-AI" is grokkable at a glance; "claude-845cf238 is editing
 *     the neural engine" requires a lookup.
 *   - Crash detection: when a slot's lastHeartbeat goes >10min without
 *     update, we know the chat died (or the user closed the terminal).
 *     Orphan file-claims attached to that chat can be safely reclaimed.
 *
 * Atomicity:
 *   - All writes go through tmp+rename. Multiple chats may try to claim the
 *     same slot simultaneously; the read-modify-write is wrapped with a
 *     short OS-level lock file. Conflict resolution: last-writer-wins is
 *     SAFE here because each slot is independent — two chats racing for
 *     `alpha` produce a deterministic outcome (one wins by getting their
 *     write through second; the loser gets the "slot taken" error and
 *     re-runs its claim with the next-free slot).
 *
 * Failure modes covered:
 *   1. State file missing → treated as empty fleet; auto-creates on first claim
 *   2. State file malformed → backup to .corrupt-<ts>; reset to empty
 *   3. Two chats race for same slot → second writer detects collision, retries
 *   4. Chat crashes mid-claim → 10-min TTL reclaims the slot
 *   5. Chat heartbeats forever (zombie) → lastActivity field shows what
 *      it was doing; operator can force-release via `force` flag
 *   6. All slots full when 8th chat tries to claim → returns
 *      `{ ok: false, error: "fleet_full" }`; chat falls back to legacy
 *      chatId-based handoff naming
 *   7. Concurrent reads during a write window → tmp+rename guarantees
 *      reader either sees pre-write or post-write state, never partial
 *
 * @module chat-slots
 */

import { promises as fs, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";
import { resolveTerminalWindowId } from "./terminal-window-id.mjs";

// ─── Constants ──────────────────────────────────────────────────────────

/** NATO phonetic alphabet — first 12. Stable order; auto-claim picks first free.
 *  Slot 7 ("golf") is HISTORICALLY the dedicated hygiene/cleanup chat per
 *  CLEANUP-MS0:
 *  - Reaps orphan node/bash/git processes (memory monitor + extended reapers)
 *  - Watchdog for peer commits (B4 reviewer-dispatch + cascade-route via Ollama)
 *  - Grooms system-viz graph (C-series wiring-potential + C5 augment-on-new-engine)
 *  - Gardens awareness surfaces (H-series memories/skills/hooks/CLAUDE.md/GSD drift)
 *  Bound by `golf-slot-write-allowlist.mjs` (U-CLEANUP-A5): writes outside
 *  the named ledger/dashboard set are blocked.
 *
 *  2026-05-16 operator directive (/checkin-<slot> family): golf MAY now be
 *  used as a normal work slot. The allowlist hook still fires keyed on
 *  slot==="golf"; bypass with PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1 OR disable
 *  the hook in settings.json. The slot table itself does not distinguish
 *  hygiene vs work — that's a hook-level concern.
 *
 *  Slots 8-10 ("hotel", "india", "juliett") added 2026-05-15 per the user
 *  directive `[[feedback_fleet_design_10_chats]]`. They are WORK slots
 *  (no allowlist restriction).
 *
 *  Slots 11-12 ("kilo", "lima") added 2026-05-16 per the operator directive
 *  to support /checkin-<slot> for all 12 NATO letters through Lima. Additive
 *  forward-compat: schemaVersion intentionally NOT bumped because the
 *  expansion is a strict superset (old chat-slots.json files get the new
 *  keys populated as null on next assertSlotFile; no migration needed).
 *  Bumping would force a state-file reset across active peers — strictly
 *  worse than the additive path.
 *
 *  Slot 13 ("mike") added 2026-05-16 (later same day) per operator directive
 *  "add a 13th chat slot, update everything that needs to update to intake
 *  a 13th chat". Same additive forward-compat as kilo/lima: no schemaVersion
 *  bump, new key populated as null on next assertSlotFile. Total fleet is
 *  now 12 work + 1 historically-hygiene = 13.
 *
 *  See `[[reference_session_continuity_stack_2026_05_15]]` for the
 *  terminal-window pinning that makes 13 concurrent PowerShell windows each
 *  resolve to a deterministic slot. */
export const SLOT_NAMES = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike"];

/** Crash TTL — slot is considered crashed/reclaimable after this many ms with
 *  no heartbeat update. 10min matches the existing chat-bus claim TTL. */
export const CRASH_TTL_MS = 10 * 60 * 1000;

/** Stale threshold — slot is yellow-flagged but still alive. */
export const STALE_TTL_MS = 2 * 60 * 1000;

/** Lock-file timeout for read-modify-write critical sections. */
export const LOCK_TIMEOUT_MS = 3000;

/** Recency guard for claim races — refuse to claim a slot that was claimed by a
 *  DIFFERENT chatId within this window unless `force:true`. The window is short
 *  enough to not interfere with legit /checkin -> /handoff cycles, long enough
 *  to catch the fleet-startup pathology where two chats both run /checkin in
 *  the same ~10s and the second writer silently overwrites the first.
 *  Knob: PRISM_CHAT_SLOTS_RECENT_GUARD_MS (overrides the default at import time). */
export const RECENT_CLAIM_GUARD_MS = Number.isFinite(parseInt(process.env.PRISM_CHAT_SLOTS_RECENT_GUARD_MS, 10))
  ? parseInt(process.env.PRISM_CHAT_SLOTS_RECENT_GUARD_MS, 10)
  : 30 * 1000;

/** Default state file path. Override via env or arg for tests. */
export const DEFAULT_STATE_PATH = "H:/prism/state/shared/chat-slots.json";
const DEFAULT_LOCK_PATH = "H:/prism/state/shared/chat-slots.lock";

// schemaVersion 2 (2026-05-15): adds optional `terminalWindowId` field to
// SlotState so a single PowerShell/terminal window keeps the same slot across
// /compact, /clear, and any new chat session spawned in the same window.
// Backward-compat: missing field falls back to chatId-only behavior — slots
// claimed under v1 keep working, they just don't get window-pinning until
// they re-claim with a window id.
const SCHEMA_VERSION = 2;

// ─── Schema ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SlotState
 * @property {string} chatId            — stable session id (e.g. "claude-845cf238")
 * @property {string} host              — hostname where chat runs
 * @property {number|null} pid          — node process id (if known)
 * @property {string} claimedAt         — ISO timestamp of initial claim
 * @property {string} lastHeartbeat     — ISO timestamp of last update
 * @property {string|null} branch       — current git branch
 * @property {string|null} topic        — current work topic
 * @property {string|null} activity     — short description of what chat is doing now
 * @property {string|null} [terminalWindowId] — stable PowerShell/terminal window
 *           identity (e.g. "tw-wt-<uuid>" or "tw-ps-<pid>"). Persists across
 *           /compact + new chats in the same window. When set, claimSlot()
 *           prefers re-binding to the SAME slot regardless of chatId churn.
 *           Schema v2 field; missing on v1 records.
 * @property {string|null} [pipelineStep] — current /checkin pipeline step
 *           (e.g. "Step 8 awareness-inject", "Step 12 iter 3/5"). Updated
 *           via setPipelineStep(). Schema v2 field; null when not in pipeline.
 *           Used by fleet-status.mjs + /system-viz "fleet" subgroup to render
 *           per-slot phase visibility across 10 concurrent chats.
 * @property {number|null} [pipelineIter] — current loop iteration index when
 *           pipelineStep refers to a /loop body. Null otherwise.
 * @property {number|null} [pipelineTarget] — target iteration count.
 *
 * @typedef {Object} SlotsFile
 * @property {number} schemaVersion
 * @property {string} lastUpdated
 * @property {Record<string, SlotState|null>} slots
 */

function emptyFile() {
  /** @type {SlotsFile} */
  const file = {
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    slots: {},
  };
  for (const n of SLOT_NAMES) file.slots[n] = null;
  return file;
}

// ─── File I/O (atomic) ──────────────────────────────────────────────────

function ensureDir(path) {
  const d = dirname(path);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

/**
 * Read the slots file. Self-heals on missing or corrupt input.
 * @returns {SlotsFile}
 */
export function readSlots(statePath = DEFAULT_STATE_PATH) {
  if (!existsSync(statePath)) return emptyFile();
  let raw;
  try {
    raw = readFileSync(statePath, "utf-8");
  } catch (e) {
    return emptyFile();
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Corrupt file — back up and reset. Don't lose data silently.
    const backup = `${statePath}.corrupt-${Date.now()}`;
    try {
      writeFileSync(backup, raw);
    } catch {}
    return emptyFile();
  }
  if (!parsed || typeof parsed !== "object" || !parsed.slots) return emptyFile();
  // Ensure all slot keys exist in state file (forward-compat as SLOT_NAMES grows; currently 7).
  for (const n of SLOT_NAMES) {
    if (!(n in parsed.slots)) parsed.slots[n] = null;
  }
  return parsed;
}

/**
 * Atomic write: write to .tmp, rename over target. fs.renameSync on the
 * same volume is atomic on Windows + POSIX.
 */
function writeSlotsAtomic(file, statePath = DEFAULT_STATE_PATH) {
  ensureDir(statePath);
  file.lastUpdated = new Date().toISOString();
  const tmp = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2));
  renameSync(tmp, statePath);
}

// ─── Lock for read-modify-write ─────────────────────────────────────────
//
// Two chats claiming "alpha" simultaneously could both read null, both write
// their own claim, and the last writer wins silently. Lock prevents that:
// each claim acquires the lock, reads, modifies, writes, releases.

function acquireLock(lockPath = DEFAULT_LOCK_PATH) {
  ensureDir(lockPath);
  const start = Date.now();
  while (Date.now() - start < LOCK_TIMEOUT_MS) {
    try {
      // wx flag: fail if exists. This is the lock primitive.
      writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`, { flag: "wx" });
      return true;
    } catch (e) {
      // Check for stale lock (pid no longer alive or older than timeout).
      try {
        const stat = statSync(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_TIMEOUT_MS) {
          // Stale lock — break it.
          try { writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}`); } catch {}
          return true;
        }
      } catch {}
      // Wait and retry.
      const ms = 50 + Math.random() * 100;
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) {} // spin (small interval, in ms)
    }
  }
  return false;
}

function releaseLock(lockPath = DEFAULT_LOCK_PATH) {
  try {
    if (existsSync(lockPath)) {
      writeFileSync(lockPath, "", { flag: "w" });
      // Best-effort delete; if it fails, the next acquireLock will detect stale.
      try { renameSync(lockPath, `${lockPath}.released-${Date.now()}`); } catch {}
    }
  } catch {}
}

function withLock(fn, lockPath = DEFAULT_LOCK_PATH) {
  if (!acquireLock(lockPath)) {
    return { ok: false, error: "lock_timeout", message: "could not acquire chat-slots lock within timeout" };
  }
  try {
    return fn();
  } finally {
    releaseLock(lockPath);
  }
}

// ─── Status classification ──────────────────────────────────────────────

/**
 * @param {SlotState|null} slot
 * @returns {"alive"|"stale"|"crashed"|"idle"}
 */
export function classifySlot(slot, now = Date.now()) {
  if (!slot) return "idle";
  const lastMs = Date.parse(slot.lastHeartbeat);
  if (!Number.isFinite(lastMs)) return "crashed";
  const age = now - lastMs;
  if (age < STALE_TTL_MS) return "alive";
  if (age < CRASH_TTL_MS) return "stale";
  return "crashed";
}

// ─── SLOT-DRIFT-FIX-MS0/U-SDF02 — window-PID liveness gate ──────────────────
//
// User-reported 2026-05-17 (bravo claude-339c8ff7):
//   "can we tie it to the window pid so that pid stays locked into that chat
//    slot as long as its open"
//
// The terminal-window-id resolver encodes the owning window's PID into the
// twid: `tw-pp-<pid>` (parent-process tier), `tw-ps-<pid>` (PowerShell PID),
// `tw-pa-<pid>` (parent-ancestor PID). The `tw-wt-<guid>` form encodes a
// Windows Terminal session GUID instead — no PID is extractable for that
// tier, so we fall back to the standard heartbeat-based reclaim.
//
// The OWNING-WINDOW PID — not slot.pid (which is the transient chat-slots.mjs
// helper PID, useless for liveness) — is what we check. When the window is
// still alive (process.kill(pid, 0) succeeds), automatic reclaim REFUSES to
// release the slot even if the chat's heartbeat lapsed: the chat may be idle,
// wedged, or mid-/compact, but the window is still open and the operator
// still owns it. Only when the window PID is dead does the slot become
// genuinely free for another chat to claim.
//
// `--force --confirmRecent` (operator override, e.g., /checkin-<slot>) is a
// SEPARATE codepath — it bypasses this gate so an operator can always reclaim
// a slot held by another window when they explicitly say so.

const TWID_PID_RE = /^tw-(pp|ps|pa)-(\d+)$/;

// Tier hierarchy from terminal-window-id.mjs (never-downgrade order):
//   tw-wt (tier 4): Windows Terminal session GUID — no PID encoded
//   tw-ps (tier 3): PowerShell process PID       — STABLE for window lifetime
//   tw-pa (tier 2): first non-shell ancestor PID — STABLE for harness lifetime
//   tw-pp (tier 1): immediate parent PID         — TRANSIENT (often a bash
//                                                  subprocess that dies the
//                                                  moment the Bash tool call
//                                                  completes — useless for
//                                                  liveness probes)
//
// Live-system evidence (slot bravo claude-339c8ff7, 2026-05-17): the twid
// `tw-pp-46708` was recorded at claim time, but PID 46708 was dead seconds
// later because it was the parent of the chat-slots.mjs subprocess — a
// bash shell whose lifetime was bounded by the Bash tool call duration.
// Refusing tier-1 PIDs forces the gate to fall through to heartbeat-based
// reclaim (old pre-U-SDF02 behavior) for unstable-tier slots — no
// regression. Stable-tier slots (tier 2/3) get the new protection.
const STABLE_TIER = new Set(["ps", "pa"]);

/**
 * Extract the owning-window PID from a `terminalWindowId`. Returns null for
 * the `tw-wt-<guid>` form (no PID encoded), for tier-1 `tw-pp-<pid>` (PID is
 * known-transient on Claude Bash subprocesses — see TWID_PID_RE comment),
 * or for any unparseable value.
 *
 * @param {string|null|undefined} twid
 * @returns {number|null}
 */
export function extractWindowPid(twid) {
  if (typeof twid !== "string") return null;
  const m = twid.match(TWID_PID_RE);
  if (!m) return null;
  if (!STABLE_TIER.has(m[1])) return null;
  const n = parseInt(m[2], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Same-host PID liveness probe. `process.kill(pid, 0)` is the POSIX
 * convention for "signal nothing — just tell me if the PID exists";
 * Node implements the same semantics on Windows via the kill32 wrapper.
 *   - returns truthy/undefined → PID exists → alive
 *   - throws ESRCH             → PID does not exist → dead
 *   - throws EPERM             → PID exists but inaccessible → still alive
 *                                (this DOES happen on Windows when the proc
 *                                runs as a different integrity level)
 *
 * @param {number} pid
 * @returns {boolean}
 */
function isPidAlive(pid) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    if (e && e.code === "EPERM") return true;
    return false;
  }
}

/**
 * Is the OWNING terminal window still alive for this slot? Returns true only
 * when ALL of: (a) we can extract a PID from twid, (b) the slot is on the
 * current host (we can't probe remote PIDs), (c) `process.kill(pid, 0)`
 * confirms the PID still exists.
 *
 * Conservative: returns FALSE when any precondition fails, so the caller
 * falls through to the standard heartbeat-based reclaim. Never throws.
 *
 * @param {SlotState|null} slot
 * @returns {boolean}
 */
export function isWindowAlive(slot) {
  if (!slot) return false;
  // Same-host only — we can't probe a peer host's PID space.
  if (slot.host && slot.host !== hostname()) return false;
  const pid = extractWindowPid(slot.terminalWindowId);
  if (pid === null) return false;
  return isPidAlive(pid);
}

/**
 * Should the automatic reclaim sweep KEEP this slot bound (refuse to release)
 * because its owning window is still open? Wraps `isWindowAlive` with the
 * env-knob escape hatch so an operator can disable the gate fleet-wide if
 * it ever causes trouble (the slot would then fall back to pure heartbeat
 * reclaim — the pre-U-SDF02 behavior).
 *
 *   PRISM_SLOT_PID_ALIVE_CHECK_DISABLE=1 → disable, fall back to old behavior
 *
 * @param {SlotState|null} slot
 * @returns {boolean}
 */
export function shouldKeepSlotAlive(slot) {
  if (String(process.env.PRISM_SLOT_PID_ALIVE_CHECK_DISABLE ?? "") === "1") {
    return false;
  }
  return isWindowAlive(slot);
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Auto-claim the first free or crashed slot for this chat.
 *
 * @param {Object} input
 * @param {string} input.chatId          — stable session id
 * @param {string} [input.host]          — defaults to os.hostname()
 * @param {number|null} [input.pid]      — defaults to process.pid
 * @param {string|null} [input.branch]
 * @param {string|null} [input.topic]
 * @param {string|null} [input.activity]
 * @param {string} [input.preferSlot]    — try this slot first if free
 * @param {boolean} [input.force]        — force-claim even if slot is alive (operator override)
 * @param {string} [statePath]           — override for tests
 * @param {string} [lockPath]            — override for tests
 * @returns {{ok: true, slot: string, state: SlotState} | {ok: false, error: string, message: string}}
 */
export function claimSlot(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  if (!input || typeof input.chatId !== "string" || input.chatId.length === 0) {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    // Capture pre-sweep state for the recency guard + previousOwner reporting.
    // We need to know who held each slot BEFORE the crashed-sweep wiped them.
    /** @type {Record<string, SlotState|null>} */
    const preSweep = {};
    for (const n of SLOT_NAMES) preSweep[n] = file.slots[n] ?? null;
    // First, sweep crashed slots — any slot whose chat hasn't heartbeated in
    // CRASH_TTL_MS is implicitly available.
    //
    // SLOT-DRIFT-FIX-MS0/U-SDF02 gate: BEFORE releasing a "crashed"-by-
    // heartbeat slot, check whether the owning terminal window's PID is
    // still alive on this host. If the window is open, the chat may simply
    // be idle (long /compact, user think-time, etc.) — releasing the slot
    // here causes the exact symptom the user reported: "chats randomly exit
    // out of the chat slot then another chat claims that slot in between
    // sessions". Same-host PID-alive => keep the binding. The operator
    // override path (`--force --confirmRecent` below) is unaffected.
    const now = Date.now();
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      if (s && classifySlot(s, now) === "crashed" && !shouldKeepSlotAlive(s)) {
        file.slots[n] = null;
      }
    }
    // Operator-override predicate: an explicit `--preferSlot <other> --force`
    // is the /checkin-<slot> intent — it must BEAT both inheritance early-
    // returns below (chatId-owns AND terminal-window-pin). Without this guard
    // a post-/compact chat already pinned to slot A could not be moved to
    // slot B even by an explicit operator force-take (observed pathology:
    // /checkin-lima silently returning charlie — U-SLOT-FORCE-FIX, 2026-05-16).
    const wantsDifferentSlot = (currentSlot) =>
      typeof input.preferSlot === "string" &&
      SLOT_NAMES.includes(input.preferSlot) &&
      input.preferSlot !== currentSlot &&
      input.force === true;

    // If chat already owns a slot, refresh its heartbeat and return it —
    // UNLESS the operator force-asked to move to a different slot. In that
    // case release the current slot and fall through to the preferSlot path.
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      if (s && s.chatId === input.chatId) {
        if (wantsDifferentSlot(n)) {
          file.slots[n] = null;
          break;
        }
        const refreshed = refreshState(s, input);
        file.slots[n] = refreshed;
        writeSlotsAtomic(file, statePath);
        return { ok: true, slot: n, state: refreshed, alreadyOwned: true };
      }
    }
    // TERMINAL-WINDOW PIN (schema v2): if this chat belongs to a window that
    // ALREADY owns a slot (different chatId — typically because of /compact,
    // /clear, or a new chat session spawned in the same PowerShell), inherit
    // that slot instead of claiming a new one. This makes slot↔window binding
    // survive session churn and prevents lane drift in the multi-window fleet.
    if (typeof input.terminalWindowId === "string" && input.terminalWindowId.length > 0) {
      for (const n of SLOT_NAMES) {
        const s = file.slots[n];
        // Only re-bind to slots that are STILL ALIVE (not crashed-swept).
        // A crashed slot was already nulled above; reaching here means the
        // prior owner is alive but had a different chatId — same window.
        if (s && s.terminalWindowId === input.terminalWindowId) {
          // Same operator-override guard: don't inherit the window's slot
          // when the operator explicitly asked for a different one + --force.
          if (wantsDifferentSlot(n)) {
            file.slots[n] = null;
            break;
          }
          const previousChatId = s.chatId;
          const inherited = {
            ...refreshState(s, input),
            chatId: input.chatId,        // new session id takes over
            terminalWindowId: input.terminalWindowId,
          };
          file.slots[n] = inherited;
          writeSlotsAtomic(file, statePath);
          return {
            ok: true,
            slot: n,
            state: inherited,
            alreadyOwned: true,
            terminalPinned: true,
            previousChatId,
          };
        }
      }
    }
    // Honor preferSlot — gating logic:
    //   · slot is null              → claim it
    //   · slot is alive/stale       → only if force=true (operator takeover)
    //   · slot is crashed           → claim it (already swept above, now null)
    // RECENCY GUARD fires on the force-takeover path: if the slot was claimed
    // by a DIFFERENT chat within RECENT_CLAIM_GUARD_MS, refuse unless --force
    // was passed AND the operator explicitly named --confirm-recent. Prevents
    // the "operator force-takes alpha 5 seconds after some other chat just
    // claimed it" pathology (one of them is going to silently lose).
    const order = [...SLOT_NAMES];
    if (input.preferSlot && SLOT_NAMES.includes(input.preferSlot)) {
      const preferred = preSweep[input.preferSlot];
      const liveAfterSweep = file.slots[input.preferSlot];
      // Case 1: preferred slot is free (was null, or just swept crashed)
      if (!liveAfterSweep) {
        order.splice(order.indexOf(input.preferSlot), 1);
        order.unshift(input.preferSlot);
      }
      // Case 2: preferred slot is alive/stale held by SOMEONE ELSE,
      // operator wants to force-take it. Check the recency guard FIRST.
      else if (liveAfterSweep.chatId !== input.chatId && input.force) {
        const claimedMs = Date.parse(liveAfterSweep.claimedAt);
        const isRecent = Number.isFinite(claimedMs) && (now - claimedMs) < RECENT_CLAIM_GUARD_MS;
        if (isRecent && !input.confirmRecent) {
          return {
            ok: false,
            error: "slot_recently_claimed",
            message:
              `slot '${input.preferSlot}' was claimed by ${liveAfterSweep.chatId} ` +
              `${Math.round((now - claimedMs) / 1000)}s ago (within recency guard ` +
              `${Math.round(RECENT_CLAIM_GUARD_MS / 1000)}s). Force-takeover blocked — ` +
              `pass --confirmRecent to override, or wait for the recency window to expire.`,
            details: { slot: input.preferSlot, blockedBy: liveAfterSweep, ageMs: now - claimedMs },
          };
        }
        // Recency cleared (or operator confirmed) — force-takeover proceeds:
        // wipe the slot now so the walk below picks it up.
        file.slots[input.preferSlot] = null;
        order.splice(order.indexOf(input.preferSlot), 1);
        order.unshift(input.preferSlot);
      }
      // Case 3: preferred slot held by someone else, no force → fall through
      // to default walk; the operator gets whatever next-free slot is available.
    }
    // Recency guard for the DEFAULT-WALK reclaim path — closes BLOCKER #1
    // (arm-C scrutiny 2026-05-14). If a slot was crashed-swept above AND its
    // pre-sweep `claimedAt` was inside the recency window (recent claim by a
    // chat whose process died before its first heartbeat), refuse to silently
    // reclaim it on the default walk. Operator must pass --preferSlot
    // <name> --force --confirmRecent to explicitly take it. Walk continues to
    // the next free slot otherwise.
    if (!input.force) {
      const guardedSlots = new Set();
      for (const n of order) {
        if (file.slots[n] === null) {
          const prev = preSweep[n];
          if (prev && prev.chatId !== input.chatId) {
            const claimedMs = Date.parse(prev.claimedAt);
            if (Number.isFinite(claimedMs) && (now - claimedMs) < RECENT_CLAIM_GUARD_MS) {
              guardedSlots.add(n);
            }
          }
        }
      }
      if (guardedSlots.size > 0) {
        // Remove guarded slots from walk-eligible set; if all walkable slots
        // are guarded, fall through to "fleet_full" with an explanatory
        // details field.
        for (const n of guardedSlots) {
          const idx = order.indexOf(n);
          if (idx >= 0) order.splice(idx, 1);
        }
        if (order.length === 0) {
          return {
            ok: false,
            error: "all_slots_recently_claimed",
            message:
              `every free slot was claimed by another chat within the recency guard ` +
              `(${Math.round(RECENT_CLAIM_GUARD_MS / 1000)}s). Wait, or pass ` +
              `--preferSlot <name> --force --confirmRecent to take one explicitly.`,
            details: {
              guardedSlots: [...guardedSlots],
              guardMs: RECENT_CLAIM_GUARD_MS,
            },
          };
        }
      }
    }
    // Find first free slot.
    for (const n of order) {
      if (file.slots[n] === null) {
        const claimed = freshState(input);
        const result = { ok: true, slot: n, state: claimed };
        // Surface previousOwner when this claim reclaimed a non-null pre-sweep
        // slot (crashed-sweep, or explicit force-takeover). Operator transparency.
        const prev = preSweep[n];
        if (prev && prev.chatId !== input.chatId) {
          const lastHbMs = Date.parse(prev.lastHeartbeat);
          result.previousOwner = {
            chatId: prev.chatId,
            host: prev.host,
            pid: prev.pid ?? null,
            branch: prev.branch ?? null,
            topic: prev.topic ?? null,
            activity: prev.activity ?? null,
            claimedAt: prev.claimedAt,
            lastHeartbeat: prev.lastHeartbeat,
            ageMs: Number.isFinite(lastHbMs) ? now - lastHbMs : null,
            reason: classifySlot(prev, now) === "crashed"
              ? "crashed-reclaim"
              : (input.force && preferSlotMatchesExplicit(input.preferSlot, n))
                ? "force-takeover"
                : "stale-reclaim",
          };
        }
        file.slots[n] = claimed;
        writeSlotsAtomic(file, statePath);
        return result;
      }
    }
    // All slots full and alive.
    return { ok: false, error: "fleet_full", message: `all ${SLOT_NAMES.length} slots are claimed by alive chats; chat ${input.chatId} should fall back to legacy chatId-based handoff naming or wait for a slot to free` };
  }, lockPath);
}

/**
 * The recency guard is bypassed when the caller explicitly asked for THIS slot
 * via --preferSlot AND we matched it. That is the operator-intent codepath
 * ("take alpha from the dead chat — I know what I'm doing"). It is NOT a
 * bypass for the default first-free walk, which is the racy codepath we
 * want to guard.
 */
function preferSlotMatchesExplicit(preferSlot, n) {
  return typeof preferSlot === "string" && preferSlot === n;
}

function freshState(input) {
  const nowIso = new Date().toISOString();
  return {
    chatId: input.chatId,
    host: input.host ?? hostname(),
    pid: input.pid ?? (typeof process !== "undefined" ? process.pid : null),
    claimedAt: nowIso,
    lastHeartbeat: nowIso,
    branch: input.branch ?? null,
    topic: input.topic ?? null,
    activity: input.activity ?? null,
    terminalWindowId: input.terminalWindowId ?? null,
  };
}

function refreshState(prev, input) {
  return {
    ...prev,
    lastHeartbeat: new Date().toISOString(),
    branch: input.branch ?? prev.branch,
    topic: input.topic ?? prev.topic,
    activity: input.activity ?? prev.activity,
    pid: input.pid ?? prev.pid,
    // Allow re-binding a window id (e.g. when migrating v1 → v2 slots — the
    // first claim by a chat with a window id stamps the field even if the
    // record was created without one). Never blank an existing id.
    terminalWindowId: input.terminalWindowId ?? prev.terminalWindowId ?? null,
    // Pipeline-step visibility (10-chat fleet). Null preserves prev value;
    // explicit null in input means "exit pipeline" so we honor that.
    pipelineStep: input.pipelineStep !== undefined ? input.pipelineStep : (prev.pipelineStep ?? null),
    pipelineIter: input.pipelineIter !== undefined ? input.pipelineIter : (prev.pipelineIter ?? null),
    pipelineTarget: input.pipelineTarget !== undefined ? input.pipelineTarget : (prev.pipelineTarget ?? null),
  };
}

/**
 * Update the pipeline-step visibility fields for the slot owned by this
 * chatId. Idempotent. Use this to surface "Step 12 iter 3/5" to the fleet
 * dashboard + /system-viz "fleet" subgroup. Returns the updated slot or
 * an error if the chat doesn't own a slot.
 *
 * @param {{chatId:string, pipelineStep:string|null, pipelineIter?:number|null, pipelineTarget?:number|null}} input
 */
export function setPipelineStep(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  if (!input || typeof input.chatId !== "string") {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      if (s && s.chatId === input.chatId) {
        file.slots[n] = refreshState(s, input);
        writeSlotsAtomic(file, statePath);
        return { ok: true, slot: n, state: file.slots[n] };
      }
    }
    return { ok: false, error: "no_slot_owned", message: `chat ${input.chatId} owns no slot — call claimSlot first` };
  }, lockPath);
}

/**
 * Update lastHeartbeat (and optionally activity/branch/topic) for the slot
 * owned by this chatId. Idempotent. Returns the updated slot or an error
 * if the chat doesn't own any slot.
 */
export function heartbeat(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  if (!input || typeof input.chatId !== "string") {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      if (s && s.chatId === input.chatId) {
        const refreshed = refreshState(s, input);
        file.slots[n] = refreshed;
        writeSlotsAtomic(file, statePath);
        return { ok: true, slot: n, state: refreshed };
      }
    }
    return { ok: false, error: "no_slot_owned", message: `chat ${input.chatId} does not own any slot — call claimSlot first` };
  }, lockPath);
}

/**
 * Rename the chat occupying a slot — updates the slot's `topic` (the label
 * shown in fleet-status / resume picker) and optionally `activity`, in place,
 * WITHOUT releasing or re-claiming the slot. The slot binding (chatId, pid,
 * terminalWindowId, claimedAt) is preserved; only the human-facing label
 * changes. Heartbeat is refreshed so the rename counts as liveness.
 *
 * Resolves the target slot in priority order:
 *   1. explicit --slot <name>            (operator names it directly)
 *   2. --chatId <id> → the slot it owns  (rename "my chat")
 *
 * topic is sanitized: lowercased, [^a-z0-9-] → '-', collapsed, ≤ 32 chars
 * (matches the handoff-topic sanitizer so the slot label and the
 * HANDOFF-<id>-<topic>.md filename stay consistent).
 */
export function renameChat(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  if (!input || typeof input.topic !== "string" || input.topic.trim() === "") {
    return { ok: false, error: "invalid_input", message: "topic required (the new chat name)" };
  }
  if (!input.slot && !input.chatId) {
    return { ok: false, error: "invalid_input", message: "either --slot or --chatId required" };
  }
  const sanitized = input.topic
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  if (!sanitized) {
    return { ok: false, error: "invalid_input", message: `topic '${input.topic}' sanitized to empty — use [a-z0-9-]` };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    let targetSlot = null;
    if (input.slot) {
      if (!SLOT_NAMES.includes(input.slot)) {
        return { ok: false, error: "unknown_slot", message: `slot '${input.slot}' not in ${SLOT_NAMES.join(",")}` };
      }
      if (!file.slots[input.slot]) {
        return { ok: false, error: "slot_empty", message: `slot '${input.slot}' is not currently claimed` };
      }
      targetSlot = input.slot;
    } else {
      for (const n of SLOT_NAMES) {
        const s = file.slots[n];
        if (s && s.chatId === input.chatId) { targetSlot = n; break; }
      }
      if (!targetSlot) {
        return { ok: false, error: "no_slot_owned", message: `chat ${input.chatId} does not own any slot` };
      }
    }
    const prev = file.slots[targetSlot];
    const oldTopic = prev.topic ?? null;
    const renamed = {
      ...prev,
      topic: sanitized,
      activity: input.activity ?? prev.activity ?? null,
      lastHeartbeat: new Date().toISOString(),
    };
    file.slots[targetSlot] = renamed;
    writeSlotsAtomic(file, statePath);
    return { ok: true, slot: targetSlot, oldTopic, newTopic: sanitized, chatId: prev.chatId, state: renamed };
  }, lockPath);
}

/**
 * Release the slot owned by this chatId (clean exit on Stop).
 */
export function releaseSlot(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  if (!input || typeof input.chatId !== "string") {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      if (s && s.chatId === input.chatId) {
        file.slots[n] = null;
        writeSlotsAtomic(file, statePath);
        return { ok: true, slot: n };
      }
    }
    return { ok: false, error: "no_slot_owned", message: `chat ${input.chatId} does not own any slot` };
  }, lockPath);
}

/**
 * Sweep crashed slots (no heartbeat in CRASH_TTL_MS). Returns array of
 * slot names that were freed. Idempotent.
 */
export function reclaimCrashed(statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH) {
  return withLock(() => {
    const file = readSlots(statePath);
    const now = Date.now();
    const reclaimed = [];
    const kept = [];
    for (const n of SLOT_NAMES) {
      const s = file.slots[n];
      // SLOT-DRIFT-FIX-MS0/U-SDF02: keep heartbeat-crashed slots whose owning
      // terminal window is still alive (same-host PID probe). Sibling fix to
      // the in-claim auto-sweep above. Surface kept-alive slots in the
      // return value so operators / fleet-reaper can observe what the gate
      // saved (and tune if needed).
      if (s && classifySlot(s, now) === "crashed") {
        if (shouldKeepSlotAlive(s)) {
          kept.push({ slot: n, chatId: s.chatId, host: s.host, lastHeartbeat: s.lastHeartbeat, reason: "window_pid_alive" });
        } else {
          reclaimed.push({ slot: n, chatId: s.chatId, host: s.host, lastHeartbeat: s.lastHeartbeat });
          file.slots[n] = null;
        }
      }
    }
    if (reclaimed.length > 0) writeSlotsAtomic(file, statePath);
    return { ok: true, reclaimed, kept };
  }, lockPath);
}

/**
 * Snapshot of the entire fleet for the dashboard. Read-only — does NOT
 * sweep crashed slots.
 */
export function getStatus(statePath = DEFAULT_STATE_PATH) {
  const file = readSlots(statePath);
  const now = Date.now();
  const summary = { alive: 0, stale: 0, crashed: 0, idle: 0 };
  const slots = SLOT_NAMES.map(n => {
    const state = file.slots[n];
    const status = classifySlot(state, now);
    summary[status]++;
    return {
      slot: n,
      status,
      ageMs: state ? now - Date.parse(state.lastHeartbeat) : null,
      state,
    };
  });
  return { ok: true, slots, summary, lastUpdated: file.lastUpdated };
}

/**
 * U-CLEANUP-B8 (2026-05-13): liveness check for the golf hygiene slot.
 *
 * R3-UU2 dropped the dedicated golf-heartbeat.json file in favor of reusing
 * the lastHeartbeat field already maintained in chat-slots.json. This
 * helper is the canonical "is the golf chat alive?" check — used by golf-
 * audit cron tasks, the fleet dashboard, and any hook that needs to decide
 * whether to enqueue hygiene work for the live golf chat vs. self-execute.
 *
 * Returns a structured object so consumers don't have to re-implement
 * staleness math:
 *   {
 *     ok:           true,
 *     slot:         "golf",
 *     status:       "alive" | "stale" | "crashed" | "idle",
 *     isAlive:      boolean (status === "alive"),
 *     isStale:      boolean (status === "stale"),
 *     isCrashed:    boolean (status === "crashed"),
 *     isIdle:       boolean (status === "idle"),
 *     ageMs:        number | null  (null when slot is idle),
 *     lastHeartbeat: string | null  (ISO timestamp; null when slot is idle),
 *     chatId:       string | null,
 *     branch:       string | null,
 *     topic:        string | null,
 *     activity:     string | null,
 *     staleThresholdMs:   STALE_TTL_MS,
 *     crashedThresholdMs: CRASH_TTL_MS,
 *   }
 *
 * Idle vs. crashed semantics: idle = no chat ever claimed the slot in this
 * file (state=null), crashed = a chat claimed it but the heartbeat is older
 * than CRASH_TTL_MS (the chat is dead and the slot is reclaimable).
 *
 * Pure read; does not write or sweep. Pass `now` as the second arg for
 * deterministic test isolation.
 */
export function getGolfLiveness(statePath = DEFAULT_STATE_PATH, now = Date.now()) {
  const file = readSlots(statePath);
  const state = file.slots["golf"] ?? null;
  const status = classifySlot(state, now);
  const lastMs = state?.lastHeartbeat ? Date.parse(state.lastHeartbeat) : null;
  const ageMs = state && Number.isFinite(lastMs) ? now - lastMs : null;
  return {
    ok: true,
    slot: "golf",
    status,
    isAlive: status === "alive",
    isStale: status === "stale",
    isCrashed: status === "crashed",
    isIdle: status === "idle",
    ageMs,
    lastHeartbeat: state?.lastHeartbeat ?? null,
    chatId: state?.chatId ?? null,
    branch: state?.branch ?? null,
    topic: state?.topic ?? null,
    activity: state?.activity ?? null,
    staleThresholdMs: STALE_TTL_MS,
    crashedThresholdMs: CRASH_TTL_MS,
  };
}

/**
 * Find the slot currently held by chatId (if any). Pure read.
 */
export function findSlotForChat(chatId, statePath = DEFAULT_STATE_PATH) {
  const file = readSlots(statePath);
  for (const n of SLOT_NAMES) {
    const s = file.slots[n];
    if (s && s.chatId === chatId) return { slot: n, state: s };
  }
  return null;
}

// ─── CLI ────────────────────────────────────────────────────────────────
// Allows hooks to invoke as `node chat-slots.mjs <action> [args]` without
// importing. Returns JSON to stdout.

// Guard against undefined process.argv[1] (e.g. when imported via node -e or
// dynamically loaded by a test runner) so the CLI block never crashes the
// import path. When invoked legitimately as the main script argv[1] resolves
// to this file's absolute path. Use endsWith-only (no file:// URL synthesis)
// so Vite's static analyzer doesn't try to resolve a template-literal URL.
const __cliArgv1 = (process.argv[1] || "").replace(/\\/g, "/");
const __cliArgv1Basename = __cliArgv1.split("/").pop() || "";
if (__cliArgv1Basename && import.meta.url.endsWith(__cliArgv1Basename)) {
  const [action, ...args] = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else { flags[a.slice(2)] = args[i + 1]; i++; }
    }
  }
  let result;
  try {
    switch (action) {
      case "claim":
        result = claimSlot({
          chatId: flags.chatId,
          host: flags.host,
          pid: flags.pid ? parseInt(flags.pid, 10) : null,
          branch: flags.branch,
          topic: flags.topic,
          activity: flags.activity,
          preferSlot: flags.preferSlot,
          force: flags.force === "true",
          confirmRecent: flags.confirmRecent === "true",
          // Auto-resolve when the CLI caller didn't pass --terminalWindowId,
          // so the window-pin moves with explicit slot changes (e.g.
          // /checkin-<slot> doesn't lose the window<->slot binding after a
          // force-take). Fail-soft: pinning is best-effort.
          // Thread sessionId so resolveTerminalWindowId's per-session cache
          // actually hits — without it every CLI claim pays a cold subprocess
          // walk (Arm C scrutiny finding, 2026-05-16).
          terminalWindowId: flags.terminalWindowId ?? (() => {
            try { return resolveTerminalWindowId({ sessionId: flags.chatId }); } catch { return null; }
          })(),
        });
        break;
      case "heartbeat":
        result = heartbeat({
          chatId: flags.chatId,
          branch: flags.branch,
          topic: flags.topic,
          activity: flags.activity,
        });
        break;
      case "pipeline-step":
        result = setPipelineStep({
          chatId: flags.chatId,
          pipelineStep: flags.pipelineStep ?? null,
          pipelineIter: flags.pipelineIter ? parseInt(flags.pipelineIter, 10) : null,
          pipelineTarget: flags.pipelineTarget ? parseInt(flags.pipelineTarget, 10) : null,
        });
        break;
      case "rename":
        result = renameChat({
          chatId: flags.chatId,
          slot: flags.slot,
          topic: flags.topic,
          activity: flags.activity,
        });
        break;
      case "release":
        result = releaseSlot({ chatId: flags.chatId });
        break;
      case "reclaim":
        result = reclaimCrashed();
        break;
      case "status":
        result = getStatus();
        break;
      case "find":
        result = findSlotForChat(flags.chatId);
        break;
      case "golf-liveness":
        result = getGolfLiveness();
        break;
      default:
        result = { ok: false, error: "unknown_action", message: `unknown action '${action}'; valid: claim, heartbeat, rename, release, reclaim, status, find, golf-liveness` };
    }
  } catch (e) {
    result = { ok: false, error: "exception", message: e.message };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result?.ok === false ? 1 : 0);
}
