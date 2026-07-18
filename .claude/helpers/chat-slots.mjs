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
 *   - 26 chats (alpha..foxtrot, hotel..zulu work + golf hygiene) compacting on `main` simultaneously all derive the same topic
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

import { promises as fs, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { hostname } from "node:os";
import { resolveTerminalWindowId } from "./terminal-window-id.mjs";
import { recordSlotForChat as _persistSlotForChat } from "./slot-identity-cache.mjs";
// [SLOT-BRIDGE-MS0]/U-SBB05 (2026-05-26): single source of truth for
// INTEGRATOR_SLOT_NAME (was triplicated; arm-C R7 drift hazard).
import { INTEGRATOR_SLOT_NAME } from "./slot-constants.mjs";
// Re-export so existing callers (or callers that import "the slot helper")
// keep getting it from the canonical chat-slots module.
export { INTEGRATOR_SLOT_NAME } from "./slot-constants.mjs";

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
 *  terminal-window pinning that makes up to 26 concurrent PowerShell windows each
 *  resolve to a deterministic slot. */
//  Slots 14-26 ("november"..."zulu") added 2026-05-19 per operator directive
//  "expand chat slots to full alphabet. make sure ALL chat slot related
//  documents are updated and synchronized to carry over to the new chat slots."
//  Same additive forward-compat as kilo/lima/mike: no schemaVersion bump, new
//  keys populated as null on next assertSlotFile. Total fleet is now 25 work
//  + 1 historically-hygiene (golf) = 26 — the full NATO alphabet.
//
//  Wrapper skills (checkin-<nato> / handoff-<nato> / precompact-<nato> /
//  startup-<nato>) are auto-generated by scripts/generate-per-slot-wrappers.mjs
//  which reads its own copy of this list — keep BOTH in sync when expanding.
export const SLOT_NAMES = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
];

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
// [SLOT-BRIDGE-MS0]/U-SBB05 (2026-05-26): exported so single-shot bridge
// scripts (scripts/backfill-chat-slots-branch.mjs) can wrap their
// read-mutate-write in the same lock primitive — closes the race-clobber
// gap surfaced by 3-of-3 scrutiny arm-C.
export const DEFAULT_LOCK_PATH = "H:/prism/state/shared/chat-slots.lock";

/**
 * SLOT-COMPACT-SYNERGY-MS0/U-WAVE5a (2026-05-19): per-slot branch binding
 * sidecar. Populated by `scripts/slot-worktree-bootstrap.mjs` after a
 * `slot/<nato>` worktree is created. `claimSlot()` reads this sidecar and
 * lets bindings override `input.branch` so the 3 lane-routing hooks
 * (main-tree-write-block / git-add-lane-guard / worktree-commit-route) arm
 * even when a chat ran /checkin from the wrong cwd. Operator-intent layer —
 * separate from the operational chat-slots.json so a bad bindings file
 * cannot corrupt slot ownership.
 *
 * Schema: { schemaVersion:1, lastUpdated:string, bindings:{ [slot]: "slot/<nato>" } }
 * Only branch values that start with "slot/" are honored — defensive guard.
 */
export const DEFAULT_BINDINGS_PATH = "H:/prism/state/shared/slot-branch-bindings.json";
const BINDINGS_SCHEMA_VERSION = 1;

// [SLOT-BRIDGE-MS0]/U-SBB05 (2026-05-26): INTEGRATOR_SLOT_NAME now imported
// from ./slot-constants.mjs (single source of truth) — was a local const
// duplicated in main-tree-write-block.mjs and seed-slot-branch-bindings.mjs.
// 3-of-3 scrutiny arm-C R7 fix.

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

// ─── Slot-branch bindings sidecar (U-WAVE5a) ────────────────────────────
//
// Pure read/write helpers for the per-slot branch-binding sidecar that
// scripts/slot-worktree-bootstrap.mjs populates after a `slot/<nato>`
// worktree exists. claimSlot() consults this sidecar to override
// input.branch so the lane-routing hooks arm regardless of where the
// chat launched /checkin from. Fail-soft: any read error returns an
// empty bindings map — never throws into the claim path.

/**
 * Read the slot-branch bindings sidecar. Fail-soft: missing file,
 * malformed JSON, wrong schemaVersion, or non-object payload all yield
 * `{}` so the bindings layer never breaks slot claim semantics.
 * @param {string} [path]
 * @returns {Record<string,string>}
 */
export function readSlotBranchBindings(path = DEFAULT_BINDINGS_PATH) {
  if (!existsSync(path)) return {};
  let raw;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (err) {
    // R12 fail-loud — matches the SLOT-DRIFT-FIX-MS0/U-SDF14 pattern at
    // claimSlot's slot-identity-cache writes. A silent degrade here means
    // the lane-routing hooks silently don't arm; operator must see the
    // signal so a broken sidecar surfaces in the next hook telemetry sweep.
    process.stderr.write(`[slot-branch-bindings] read failed for ${path}: ${err && err.message ? err.message : err}\n`);
    return {};
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[slot-branch-bindings] parse failed for ${path}: ${err && err.message ? err.message : err}\n`);
    return {};
  }
  if (!parsed || typeof parsed !== "object") {
    process.stderr.write(`[slot-branch-bindings] non-object payload in ${path}\n`);
    return {};
  }
  if (parsed.schemaVersion !== BINDINGS_SCHEMA_VERSION) {
    process.stderr.write(`[slot-branch-bindings] schemaVersion mismatch in ${path}: expected ${BINDINGS_SCHEMA_VERSION}, got ${parsed.schemaVersion}\n`);
    return {};
  }
  const b = parsed.bindings;
  if (!b || typeof b !== "object") {
    process.stderr.write(`[slot-branch-bindings] missing or non-object bindings field in ${path}\n`);
    return {};
  }
  /** @type {Record<string,string>} */
  const out = {};
  for (const slot of SLOT_NAMES) {
    const v = b[slot];
    // Only honor strings that explicitly name a slot/<nato> branch — defensive
    // gate against a malformed entry pointing at e.g. "cad-fusion-live-ms0"
    // which would defeat the entire lane-routing arm.
    if (typeof v === "string" && v.startsWith("slot/") && v.length > "slot/".length) {
      out[slot] = v;
    }
  }
  return out;
}

/**
 * Convenience accessor for external callers (lane-routing hooks if they
 * want to double-check the binding independent of chat-slots.json).
 * @param {string} slot
 * @param {string} [path]
 * @returns {string|null}
 */
export function getSlotBranchBinding(slot, path = DEFAULT_BINDINGS_PATH) {
  if (typeof slot !== "string" || !SLOT_NAMES.includes(slot)) return null;
  const bindings = readSlotBranchBindings(path);
  return bindings[slot] ?? null;
}

/**
 * Atomic write the slot-branch bindings sidecar. Merges with any
 * existing bindings (new bindings overwrite, unspecified slots keep
 * their previous value). Pass `{ replace: true }` to wipe + replace.
 * Atomic-rename pattern (pid + Date.now + crypto-random temp) to
 * survive concurrent bootstrap runs.
 *
 * @param {Record<string,string>} bindings  partial map: slot -> branch
 * @param {Object} [opts]
 * @param {boolean} [opts.replace=false]
 * @param {string} [opts.path]
 * @returns {{ok:boolean, written:Record<string,string>, error?:string}}
 */
export function writeSlotBranchBindings(bindings, opts = {}) {
  const path = opts.path || DEFAULT_BINDINGS_PATH;
  const replace = opts.replace === true;
  if (!bindings || typeof bindings !== "object") {
    return { ok: false, written: {}, error: "bindings must be an object" };
  }
  // Validate every value before any write; partial success is the worst
  // failure mode for an advisory sidecar (operator can't trust the file).
  /** @type {Record<string,string>} */
  const incoming = {};
  for (const [slot, branch] of Object.entries(bindings)) {
    if (!SLOT_NAMES.includes(slot)) {
      return { ok: false, written: {}, error: `unknown slot '${slot}' (not in SLOT_NAMES)` };
    }
    if (typeof branch !== "string" || !branch.startsWith("slot/") || branch.length <= "slot/".length) {
      return { ok: false, written: {}, error: `binding for '${slot}' must be a non-empty 'slot/<nato>' string, got ${JSON.stringify(branch)}` };
    }
    incoming[slot] = branch;
  }
  const existing = replace ? {} : readSlotBranchBindings(path);
  const merged = { ...existing, ...incoming };
  /** @type {{schemaVersion:number, lastUpdated:string, bindings:Record<string,string>}} */
  const file = {
    schemaVersion: BINDINGS_SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
    bindings: merged,
  };
  ensureDir(path);
  // pid + Date.now + 8-char base36 so concurrent bootstrap invocations on the
  // same host can't collide. Math.random() collision at this entropy is
  // negligible (~1e-12 per pair); a heavier dep on node:crypto would buy us
  // nothing operationally and `chat-slots.mjs` doesn't otherwise import crypto.
  const randSuffix = Math.random().toString(36).slice(2, 10);
  const tmp = `${path}.${process.pid}.${Date.now()}.${randSuffix}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n");
    // POSIX rename overwrites; Windows rename fails if target exists, so
    // unlink-then-rename. Matches scripts/slot-worktree-bootstrap.mjs:355.
    if (existsSync(path)) {
      try {
        renameSync(tmp, path);
      } catch {
        try { unlinkSync(path); } catch {}
        renameSync(tmp, path);
      }
    } else {
      renameSync(tmp, path);
    }
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    return { ok: false, written: {}, error: `write failed: ${err && err.message ? err.message : err}` };
  }
  return { ok: true, written: merged };
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
      // FLEET-GIT-CONTENTION-MS0/U-FGC-2 (golf 2026-06-04): DELETE the lock — the
      // documented "best-effort delete" intent. Was
      //   renameSync(lockPath, `${lockPath}.released-${Date.now()}`)
      // which LEAKED one orphan file per release: tens of thousands of
      // `chat-slots.lock.released-*` (28,761 swept in the U-FGC-2 cleanup) =
      // 57% of the repo's entire git-status churn under state/shared/.
      // unlinkSync is the correct removal; rename is kept ONLY as a Windows fallback
      // for the rare case unlink races a concurrent open handle (the next acquireLock
      // wx-exclusive create still succeeds against the moved-aside file).
      try {
        unlinkSync(lockPath);
      } catch {
        try { renameSync(lockPath, `${lockPath}.released-${Date.now()}`); } catch {}
      }
    }
  } catch {}
}

// [SLOT-BRIDGE-MS0]/U-SBB05 (2026-05-26): exported (was internal) so
// scripts/backfill-chat-slots-branch.mjs uses the same lock primitive
// claimSlot/heartbeat use, instead of bypassing locking.
export function withLock(fn, lockPath = DEFAULT_LOCK_PATH) {
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

// ─── SLOT-DRIFT-FIX-MS0/U-SDF03 — transcript-mtime liveness signal ──────────
//
// Why this exists (production observation 2026-05-17 by slot bravo claude-339c8ff7):
//   U-SDF02 (the twid-PID liveness gate) only protects slots whose
//   terminalWindowId is tier-2 (`tw-pa-*`) or tier-3 (`tw-ps-*`). The
//   `terminal-window-id.mjs` resolver SHOULD reach those tiers via a
//   PowerShell ancestry walk, but live audit found **every single cached
//   chat in the production fleet stuck at tier-1** (`tw-pp-*` — bare parent
//   PID). The PowerShell walk silently fails inside Claude's Bash-tool
//   subprocess context: the chain `node-helper → bash → bash → bash → ???`
//   hits a process whose ParentProcessId is already dead (Cygwin bash
//   subprocesses are transient — Get-CimInstance returns nothing for the
//   PID that was the parent when the bash was spawned). Walking the
//   process tree from inside a Claude Bash subprocess CANNOT reach the
//   stable claude.exe harness — verified via atomic-snapshot PowerShell
//   query (single Get-CimInstance for all processes) AND sequential walks.
//
// The fix: PROCESS-TREE-INDEPENDENT liveness signal — Claude's own
// transcript file. claude.exe writes `<session-id>.jsonl` in the projects
// directory on every message, every tool call, every compaction step.
// Its mtime is updated by claude.exe itself (NOT by hooks or helpers) so
// it's a true signal of "the chat process is still actively running".
//
// Path: `<homedir>/.claude/projects/H--<project-slug>/<session-id-full-uuid>.jsonl`
//   - `<homedir>` resolved via `os.homedir()` (portable across users)
//   - `<project-slug>` derived from cwd, e.g. `H--prism` for `H:\prism`
//   - `<session-id-full-uuid>` matched by 8-char prefix from `slot.chatId`
//     (chatId format is `claude-<8hex>`; transcript filename starts with the
//     same 8 hex chars followed by `-`)
//
// Freshness threshold: 4 HOURS default (PRISM_SLOT_TRANSCRIPT_FRESH_MS).
//
// U-SDF04 (2026-05-17, "can we make a permanent fix?"): raised from 5 min
// (the U-SDF03 default) to 4 hours. The 5-min window closed the production
// tier-1-twid bug but left another class of legitimate liveness lapses
// vulnerable to auto-reclaim:
//   - Long single-tool-call (e.g. 6-min Agent run with no streaming output)
//   - User AFK (coffee, meeting, bathroom, kid interruption) > 5 min
//   - Network blip while a model response is generating > 5 min
//   - /compact + immediate fresh-prompt latency > 5 min on slow hosts
// 4-hour threshold covers all realistic active-session lapses while still
// releasing GENUINELY abandoned slots within half a workday. The only
// remaining paths to slot loss are now:
//   (a) operator force-take via /checkin-<slot> --force (explicit intent)
//   (b) graceful chat exit (owner releases slot)
//   (c) chat genuinely abandoned > 4h with no transcript activity
// Path (c) covers "user closed the window and forgot" — slot eventually
// frees itself. No more "chat randomly exits its slot during /compact"
// or "Agent run lost the slot mid-call."
//
// Why not BOTH transcript-mtime AND a process-tree walk? Tried it — the
// PowerShell walk is dead code in production (cannot reach claude.exe).
// Per Karpathy R4 (surgical), removed the scaffolding rather than carry
// always-null code paths. If a future Claude version exposes a reliable
// harness-PID env var, U-SDF04 can layer it on top of this signal.
//
// Knobs:
//   PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE=1 → skip the check (fall back
//                                              to U-SDF02 twid logic).
//   PRISM_SLOT_TRANSCRIPT_FRESH_MS=N         → override 4-hour default
//                                              (U-SDF04 raised from 5 min).
//   PRISM_SLOT_TRANSCRIPT_BASE=/path         → override projects dir
//                                              (tests + non-Windows hosts).

const CLAUDE_PROJECT_PREFIX = "H--prism";
// U-SDF04: 4-hour default (was 5-min in U-SDF03). See block comment above
// for rationale — covers realistic AFK + long Agent runs + breaks while
// still releasing genuinely-abandoned slots within half a workday.
const DEFAULT_TRANSCRIPT_FRESH_MS = 4 * 60 * 60 * 1000;
const CHAT_ID_PREFIX_RE = /^claude-([0-9a-f]{8})$/i;

/**
 * Resolve the Claude projects directory for THIS host. Honors
 * PRISM_SLOT_TRANSCRIPT_BASE for tests. Defaults to
 * `<homedir>/.claude/projects/<CLAUDE_PROJECT_PREFIX>`.
 *
 * @returns {string}
 */
export function claudeProjectsDir() {
  const override = process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  if (typeof override === "string" && override.length > 0) return override;
  const home = (() => {
    try { return process.env.USERPROFILE || process.env.HOME || ""; } catch { return ""; }
  })();
  if (!home) return "";
  return join(home, ".claude", "projects", CLAUDE_PROJECT_PREFIX).replace(/\\/g, "/");
}

/**
 * Find the transcript file path for a chatId. chatId format is
 * `claude-<8hex>`; transcript filename is `<full-uuid>.jsonl` whose
 * first 8 hex chars match the chatId prefix.
 *
 * Returns null when: chatId is malformed, projects dir doesn't exist,
 * or no matching transcript exists.
 *
 * @param {string} chatId
 * @returns {string|null}
 */
export function findTranscriptFile(chatId) {
  if (typeof chatId !== "string") return null;
  const m = chatId.match(CHAT_ID_PREFIX_RE);
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  // SLOT-DRIFT-FIX-MS0/U-SDF05 (2026-05-30, slot:bravo): slot chats run in
  // per-NATO worktrees H:/prism-slot-<nato>, whose Claude transcript dir is
  // H--prism-slot-<nato>, NOT the hardcoded H--prism. The single-dir lookup
  // (U-SDF03) returned null for EVERY worktree chat -> transcript-liveness
  // signal dead fleet-wide -> slots fell through to the no-PID tier-4 twid
  // gate -> unprotected -> drifted on the next peer auto-pin (operator-
  // reported "chats fall out of their slot"). Fix: scan the shared project
  // dir AND every sibling H--prism* worktree dir; return the FRESHEST match.
  // PRISM_SLOT_TRANSCRIPT_BASE still pins one dir for tests.
  const primary = claudeProjectsDir();
  if (!primary) return null;
  let dirs;
  const override = process.env.PRISM_SLOT_TRANSCRIPT_BASE;
  if (typeof override === "string" && override.length > 0) {
    dirs = [primary];
  } else {
    const base = primary.replace(/\/[^/]+$/, "");
    let siblings = [];
    try {
      siblings = readdirSyncSafe(base)
        .filter((e) => e === CLAUDE_PROJECT_PREFIX || e.startsWith(CLAUDE_PROJECT_PREFIX + "-"))
        .map((e) => join(base, e).replace(/\\/g, "/"));
    } catch { /* fall through to primary */ }
    dirs = siblings.length ? siblings : [primary];
  }
  let best = null;
  let bestMtime = -1;
  for (const dir of dirs) {
    if (!dir || !existsSync(dir)) continue;
    let files;
    try { files = readdirSyncSafe(dir); } catch { continue; }
    for (const f of files) {
      const lf = f.toLowerCase();
      if (lf.startsWith(prefix + "-") && lf.endsWith(".jsonl")) {
        const full = join(dir, f).replace(/\\/g, "/");
        try {
          const mt = statSync(full).mtime.getTime();
          if (mt > bestMtime) { bestMtime = mt; best = full; }
        } catch { /* skip unreadable */ }
      }
    }
  }
  return best;
}

/**
 * Get the mtime-age (ms) of the chat's transcript file, or null when the
 * file doesn't exist / can't be read. Lower = more recent activity.
 *
 * @param {string} chatId
 * @returns {number|null}
 */
export function transcriptAgeMs(chatId) {
  const file = findTranscriptFile(chatId);
  if (!file) return null;
  try {
    const s = statSync(file);
    return Date.now() - s.mtime.getTime();
  } catch { return null; }
}

/**
 * Is the chat's transcript fresh? True when mtime age < threshold (default
 * 5 min, knob `PRISM_SLOT_TRANSCRIPT_FRESH_MS`). False when no transcript,
 * stat fails, or age exceeds threshold. Never throws.
 *
 * @param {string} chatId
 * @returns {boolean}
 */
export function isTranscriptFresh(chatId) {
  if (String(process.env.PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE ?? "") === "1") return false;
  const ageMs = transcriptAgeMs(chatId);
  if (ageMs === null) return false;
  const threshold = (() => {
    const n = Number(process.env.PRISM_SLOT_TRANSCRIPT_FRESH_MS);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_TRANSCRIPT_FRESH_MS;
  })();
  return ageMs < threshold;
}

// Wrap readdirSync to swallow ENOENT / EACCES — same fail-closed semantics
// as the rest of this module (return empty list, never throw).
function readdirSyncSafe(dir) {
  try { return readdirSync(dir); } catch { return []; }
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
  // Same-host only — we can't probe a peer host's PID space, NOR can we
  // stat a transcript file on a peer host's filesystem.
  if (slot.host && slot.host !== hostname()) return false;

  // U-SDF03 (2026-05-17): transcript-mtime is the PRIMARY liveness signal.
  // claude.exe writes <session-id>.jsonl on every message + every tool call
  // + during /compact. A fresh mtime proves the harness process is alive
  // INDEPENDENTLY of the broken Bash-subprocess process tree. This closes
  // the user-reported "chats randomly exit out of their slot" bug — the
  // tier-1 twid trap that U-SDF02 left open for production chats.
  if (slot.chatId && isTranscriptFresh(slot.chatId)) return true;

  // U-SDF02 fallback: extract PID from twid (tier-2/3 only — tier-1 is
  // refused by extractWindowPid because the bare ppid dies in seconds on
  // Claude's Bash subprocesses). Kept as a layered defense for slots
  // whose transcript isn't reachable (e.g. a Codex chat on a different
  // host, a non-Claude harness, or a misconfigured projects dir).
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
export function claimSlot(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH, bindingsPath = DEFAULT_BINDINGS_PATH) {
  if (!input || typeof input.chatId !== "string" || input.chatId.length === 0) {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    // U-WAVE5a: per-slot branch binding sidecar overrides input.branch so the
    // 3 lane-routing hooks arm even when /checkin runs from the wrong cwd.
    const slotBindings = readSlotBranchBindings(bindingsPath);
    const inputForSlot = (slot) => {
      // [SLOT-BRIDGE-MS0]/U-SBB03 (2026-05-26): self-healing auto-seed. Closes
      // the slot-worktree auto-invoke gap discovered 2026-05-26 — 25/26 slots
      // were unarmed because only alpha had a binding entry. Without this
      // seed, every NEW chat's input.branch defaults to cad-fusion-live-ms0
      // and the 3 enforcement hooks (worktree-commit-route +
      // git-add-lane-guard + main-tree-write-block) stay dormant. Seeding
      // here means the very first claim arms the binding for that slot —
      // no re-bootstrap ever needed for a new slot or a new chat.
      //
      // golf is EXEMPT (integrator) per INTEGRATOR_SLOT_NAME / per
      // main-tree-write-block.mjs:108. Failure is non-fatal per Karpathy R12
      // — log to stderr; the claim still succeeds (degraded: hooks stay
      // dormant for this slot until next attempt).
      if (slot !== INTEGRATOR_SLOT_NAME && !slotBindings[slot]) {
        const want = `slot/${slot}`;
        try {
          const r = writeSlotBranchBindings({ [slot]: want }, { path: bindingsPath });
          if (r && r.ok) {
            slotBindings[slot] = want;
          } else {
            process.stderr.write(`[slot-branch-bindings] auto-seed failed for ${slot}: ${(r && r.error) || "unknown"}\n`);
          }
        } catch (e) {
          process.stderr.write(`[slot-branch-bindings] auto-seed threw for ${slot}: ${(e && e.message) || e}\n`);
        }
      }
      const bound = slotBindings[slot];
      return (typeof bound === "string" && bound.startsWith("slot/"))
        ? { ...input, branch: bound }
        : input;
    };
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

    // ONE-CHAT-ONE-SLOT invariant (U-SLOT-ONE-OWNER, 2026-06-18, slot:alpha).
    // A chat must NEVER linger in two slots. The prior loop returned/broke on
    // the FIRST slot input.chatId owned, so a chat that transiently owned two
    // (a lingering /startup-<X> claim + a later /checkin-<Y>) left the extra
    // slot dangling forever -- which surfaced to the operator as "logging back
    // into <X>": the stale claim kept being resolved by the per-prompt context
    // injectors (slot-soul / galaxy-doctrine / slot-context-bundle) and fleet
    // tooling, even though slot-bind-enforce authoritatively bound <Y>.
    //
    // Fix: collect EVERY slot this chat owns, settle on exactly one, release
    // the rest. Behavior is byte-identical in the normal single-owned case
    // (the prior loop's three branches are preserved); only the >=2-owned case
    // changes -- from "leak the extras" to "reconcile to one".
    const ownedByChat = SLOT_NAMES.filter(
      (n) => file.slots[n] && file.slots[n].chatId === input.chatId,
    );
    if (ownedByChat.length > 0) {
      // Operator force-move to a slot the chat does NOT yet own: release ALL
      // its current slots and fall through to the preferSlot claim path below
      // (which claims + persists the new slot). Mirrors the old
      // wantsDifferentSlot() release-then-fall-through, but releases EVERY
      // owned slot, not just the first-found.
      const forceMoveToNew =
        typeof input.preferSlot === "string" &&
        SLOT_NAMES.includes(input.preferSlot) &&
        input.force === true &&
        !ownedByChat.includes(input.preferSlot);
      if (forceMoveToNew) {
        for (const n of ownedByChat) file.slots[n] = null;
        // do NOT write yet -- the preferSlot claim path below writes + persists.
      } else {
        // Settle on a single slot via the shared one-owner reconciler -- the
        // single source of the dedupe policy (also used by heartbeat /
        // setPipelineStep, so the rule can never drift between them): keep the
        // operator's preferSlot if the chat already owns it (same-slot
        // re-claim), else the most-recently-heartbeated owned slot; release
        // every other slot the chat owns. keep is non-null here (>=1 owned).
        const keep = reconcileOwnedSlots(file, input.chatId, input.preferSlot);
        const refreshed = refreshState(file.slots[keep], inputForSlot(keep));
        file.slots[keep] = refreshed;
        writeSlotsAtomic(file, statePath);
        // SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): persist the chatId->slot
        // binding to the sticky history cache so post-/compact recovery can
        // find it even if chat-slots.json gets evicted before precompact reads.
        try {
          // SLOT-DRIFT-FIX-MS0/U-SDF14 (2026-05-17): fail-loud per Karpathy R12.
          // Silent EBUSY/EROFS/disk-full was invisible to operators; now logs to
          // stderr so a broken cache surfaces in the next hook telemetry sweep.
          const _r = _persistSlotForChat(input.chatId, keep);
          if (_r && _r.ok === false) {
            process.stderr.write(`[slot-identity-cache] persist failed for ${input.chatId}->${keep}: ${_r.error || "unknown"}\n`);
          }
        } catch (_e) {
          process.stderr.write(`[slot-identity-cache] persist threw for ${input.chatId}->${keep}: ${(_e && _e.message) || _e}\n`);
        }
        return { ok: true, slot: keep, state: refreshed, alreadyOwned: true };
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
            ...refreshState(s, inputForSlot(n)),
            chatId: input.chatId,        // new session id takes over
            terminalWindowId: input.terminalWindowId,
          };
          file.slots[n] = inherited;
          writeSlotsAtomic(file, statePath);
          // SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): persist the new chatId→slot
          // binding when a terminal-window pin inherits the slot for a new chat.
          try {
          // SLOT-DRIFT-FIX-MS0/U-SDF14 (2026-05-17): fail-loud per Karpathy R12.
          // Silent EBUSY/EROFS/disk-full was invisible to operators; now logs to
          // stderr so a broken cache surfaces in the next hook telemetry sweep.
          const _r = _persistSlotForChat(input.chatId, n);
          if (_r && _r.ok === false) {
            process.stderr.write(`[slot-identity-cache] persist failed for ${input.chatId}->${n}: ${_r.error || "unknown"}\n`);
          }
        } catch (_e) {
          process.stderr.write(`[slot-identity-cache] persist threw for ${input.chatId}->${n}: ${(_e && _e.message) || _e}\n`);
        }
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
        const claimed = freshState(inputForSlot(n));
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
        // SLOT-DRIFT-FIX-MS0/U-SDF13 (2026-05-17): persist the chatId→slot
        // binding for first-claim path. Recoverable post-/compact even after
        // chat-slots.json eviction.
        try {
          // SLOT-DRIFT-FIX-MS0/U-SDF14 (2026-05-17): fail-loud per Karpathy R12.
          // Silent EBUSY/EROFS/disk-full was invisible to operators; now logs to
          // stderr so a broken cache surfaces in the next hook telemetry sweep.
          const _r = _persistSlotForChat(input.chatId, n);
          if (_r && _r.ok === false) {
            process.stderr.write(`[slot-identity-cache] persist failed for ${input.chatId}->${n}: ${_r.error || "unknown"}\n`);
          }
        } catch (_e) {
          process.stderr.write(`[slot-identity-cache] persist threw for ${input.chatId}->${n}: ${(_e && _e.message) || _e}\n`);
        }
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
 * ONE-CHAT-ONE-SLOT reconciliation for the lightweight mutators
 * (U-SLOT-ONE-OWNER-HEARTBEAT, 2026-06-18, slot:alpha). claimSlot enforces the
 * invariant at claim time, but heartbeat / setPipelineStep run far more often
 * (every PostToolUse) and historically refreshed only the FIRST-found owned
 * slot in SLOT_NAMES order -- so a dual-owned state (should one ever arise from
 * a race or a pre-fix legacy record) would persist across pure-heartbeat turns
 * until the next claim. This helper makes every mutator self-heal: it returns
 * the slot to KEEP -- the most-recently-heartbeated owned slot, matching
 * claimSlot's no-preferSlot dedupe rule -- and nulls every OTHER slot the chat
 * owns IN the passed `file` object (the caller writes). Behavior is identical
 * to the old first-found loop in the single-owned case (the only owned slot is
 * trivially the one kept); only the >=2-owned case changes from refresh-first-
 * leak-rest to reconcile-to-one.
 *
 * @param {{slots:Object}} file  the in-memory chat-slots doc (mutated in place)
 * @param {string} chatId
 * @param {string} [preferKeep]  if the chat owns this slot, keep it (the
 *   claimSlot same-slot-reclaim case); otherwise fall back to newest-heartbeat.
 * @returns {string|null} the slot name to keep/refresh, or null if none owned
 */
export function reconcileOwnedSlots(file, chatId, preferKeep) {
  const owned = SLOT_NAMES.filter(
    (n) => file.slots[n] && file.slots[n].chatId === chatId,
  );
  if (owned.length === 0) return null;
  const keep =
    preferKeep && owned.includes(preferKeep)
      ? preferKeep
      : owned.length === 1
        ? owned[0]
        : owned
            .slice()
            // ties keep SLOT_NAMES order via stable sort (= old first-found).
            .sort(
              (a, b) =>
                (Date.parse(file.slots[b].lastHeartbeat) || 0) -
                (Date.parse(file.slots[a].lastHeartbeat) || 0),
            )[0];
  for (const n of owned) if (n !== keep) file.slots[n] = null;
  return keep;
}

/**
 * Update the pipeline-step visibility fields for the slot owned by this
 * chatId. Idempotent. Use this to surface "Step 12 iter 3/5" to the fleet
 * dashboard + /system-viz "fleet" subgroup. Returns the updated slot or
 * an error if the chat doesn't own a slot.
 *
 * @param {{chatId:string, pipelineStep:string|null, pipelineIter?:number|null, pipelineTarget?:number|null}} input
 */
export function setPipelineStep(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH, bindingsPath = DEFAULT_BINDINGS_PATH) {
  if (!input || typeof input.chatId !== "string") {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    // U-WAVE5a defense-in-depth: setPipelineStep is the 4th refreshState input
    // flow (after claimSlot's 3 paths + heartbeat). Today callers don't pass
    // input.branch — but if a future caller starts to, the binding must still
    // win. Same override as claimSlot/heartbeat.
    const slotBindings = readSlotBranchBindings(bindingsPath);
    // U-SLOT-ONE-OWNER-HEARTBEAT: reconcile to a single owned slot before the
    // refresh (same self-heal as heartbeat). Single-owned is behavior-unchanged.
    const keep = reconcileOwnedSlots(file, input.chatId);
    if (keep) {
      const bound = slotBindings[keep];
      const inputForRefresh = (typeof bound === "string" && bound.startsWith("slot/"))
        ? { ...input, branch: bound }
        : input;
      file.slots[keep] = refreshState(file.slots[keep], inputForRefresh);
      writeSlotsAtomic(file, statePath);
      return { ok: true, slot: keep, state: file.slots[keep] };
    }
    return { ok: false, error: "no_slot_owned", message: `chat ${input.chatId} owns no slot — call claimSlot first` };
  }, lockPath);
}

/**
 * Update lastHeartbeat (and optionally activity/branch/topic) for the slot
 * owned by this chatId. Idempotent. Returns the updated slot or an error
 * if the chat doesn't own any slot.
 */
export function heartbeat(input, statePath = DEFAULT_STATE_PATH, lockPath = DEFAULT_LOCK_PATH, bindingsPath = DEFAULT_BINDINGS_PATH) {
  if (!input || typeof input.chatId !== "string") {
    return { ok: false, error: "invalid_input", message: "chatId required" };
  }
  return withLock(() => {
    const file = readSlots(statePath);
    // U-WAVE5a: same binding-override as claimSlot. Without this, a heartbeat
    // from a chat sitting in the main tree (input.branch="cad-fusion-live-ms0")
    // would clobber the slot/<nato> branch the binding set at claim time,
    // disarming the lane-routing hooks again.
    const slotBindings = readSlotBranchBindings(bindingsPath);
    // U-SLOT-ONE-OWNER-HEARTBEAT: reconcile to a single owned slot BEFORE the
    // refresh (self-heal a dual-owned state on every heartbeat, not only on the
    // next claim). Single-owned -> keep is the lone slot (behavior unchanged).
    const keep = reconcileOwnedSlots(file, input.chatId);
    if (keep) {
      const bound = slotBindings[keep];
      const inputForRefresh = (typeof bound === "string" && bound.startsWith("slot/"))
        ? { ...input, branch: bound }
        : input;
      const refreshed = refreshState(file.slots[keep], inputForRefresh);
      file.slots[keep] = refreshed;
      writeSlotsAtomic(file, statePath);
      // SLOT-DRIFT-FIX-MS0/U-SDF19: heartbeat refreshes the sticky cache too.
      // Without this, chats that claimed pre-SDF13 (or heartbeat-only since)
      // never get a cache file and drift on next /compact.
      try {
        const _r = _persistSlotForChat(input.chatId, keep);
        if (_r && _r.ok === false) {
          process.stderr.write(`[slot-identity-cache] heartbeat persist failed for ${input.chatId}->${keep}: ${_r.error || "unknown"}\n`);
        }
      } catch (_e) {
        process.stderr.write(`[slot-identity-cache] heartbeat persist threw for ${input.chatId}->${keep}: ${(_e && _e.message) || _e}\n`);
      }
      return { ok: true, slot: keep, state: refreshed };
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
 * READ-ONLY dry-run of reclaimCrashed: report which slots a reclaim WOULD free
 * vs keep, WITHOUT mutating state or taking the lock. Uses the SAME decision
 * functions (classifySlot + shouldKeepSlotAlive) as reclaimCrashed, so the
 * preview can never disagree with the real reclaim (single source of truth).
 *
 * Motivation (FLEET-REAPER cry-wolf fix, golf 2026-06-04): the fleet-reaper's
 * "N slot(s) with dead PID — run reclaim" advisory keys on the recorded `pid`
 * field, which dies across /compact while the chat + its terminal window live
 * on — so it OVER-reports. reclaim only frees heartbeat-crashed AND window-dead
 * slots (verified live: 11 dead-recorded-pid → 0 reclaimable, foxtrot kept).
 * This lets the advisory (and operators) see the ACTUAL reclaimable set.
 *
 * @param {string} [statePath]
 * @returns {{ ok: true, reclaimable: Array<{slot:string,chatId:string,lastHeartbeat:string}>,
 *             kept: Array<{slot:string,chatId:string,reason:string}> }}
 */
export function previewReclaimable(statePath = DEFAULT_STATE_PATH) {
  const file = readSlots(statePath);
  const now = Date.now();
  const reclaimable = [];
  const kept = [];
  for (const n of SLOT_NAMES) {
    const s = file.slots[n];
    if (s && classifySlot(s, now) === "crashed") {
      if (shouldKeepSlotAlive(s)) {
        kept.push({ slot: n, chatId: s.chatId, reason: "window_pid_alive" });
      } else {
        reclaimable.push({ slot: n, chatId: s.chatId, lastHeartbeat: s.lastHeartbeat });
      }
    }
  }
  return { ok: true, reclaimable, kept };
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
      case "reclaim-preview":
        // Read-only dry-run: what WOULD reclaim free vs keep, no mutation.
        result = previewReclaimable();
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
        result = { ok: false, error: "unknown_action", message: `unknown action '${action}'; valid: claim, heartbeat, rename, release, reclaim, reclaim-preview, status, find, golf-liveness` };
    }
  } catch (e) {
    result = { ok: false, error: "exception", message: e.message };
  }
  // U-SDF21: opportunistic PS-window-pin write on successful claim. The pin
  // keys on the PowerShell ancestor PID — stable for the window's life — so
  // future chats spawned in the same window inherit this slot regardless of
  // /compact/clear/crash. Fail-soft: helper missing/broken → claim still ok.
  if (action === "claim" && result?.ok && result.slot && flags.chatId) {
    try {
      const psPin = await import("./ps-window-pin.mjs");
      psPin.tryWritePinForCurrentWindow({
        slot: result.slot,
        chatId: flags.chatId,
        sessionId: flags.chatId,
      });
    } catch { /* fail-soft — pin is best-effort, claim already succeeded */ }
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(result?.ok === false ? 1 : 0);
}
