#!/usr/bin/env node
/**
 * window-slot-bindings.mjs — Durable terminal-window → slot mapping.
 *
 * Solves the silent-drift class: when a slot is nulled (crash sweep,
 * /fleet-reaper, manual evict, /compact race), `chat-slots.json[slot].
 * terminalWindowId` disappears with the slot. The next chat in the SAME
 * PowerShell window cannot find its prior slot via the existing terminal-pin
 * inheritance loop (chat-slots.mjs:871-915 — it walks live slots only). It
 * claims first-free instead, drifting the window's identity.
 *
 * This sidecar persists the twid → slot mapping INDEPENDENT of the slots
 * themselves. Survives slot eviction. Read by chat-slots.mjs claimSlot() as
 * tier-1.5 (after live-twid match, before default walk). Written on every
 * successful claim that carries a non-empty twid.
 *
 * Schema:
 *   {
 *     schemaVersion: 1,
 *     lastUpdated: ISO-8601,
 *     bindings: {
 *       "tw-wt-<uuid>": {
 *         slot: "india",
 *         lastChatId: "claude-<8hex>",
 *         lastWrittenAt: ISO-8601
 *       },
 *       "tw-ps-<pid>": { ... },
 *       ...
 *     }
 *   }
 *
 * Pruning policy:
 *   - Entries older than MAX_AGE_MS (default 30d) are dropped on every read.
 *   - Bounded at MAX_BINDINGS (default 200); oldest dropped first when over.
 *
 * Gating:
 *   - PRISM_WINDOW_SLOT_BIND=1 must be set for the persistence to be active.
 *     This is an opt-in rollout knob — old code paths stay untouched until
 *     the env var is flipped on. Once verified across a few chats, the
 *     default can flip in a later commit.
 *
 * Knobs:
 *   PRISM_WINDOW_SLOT_BIND=1               — REQUIRED — opt in to the layer
 *   PRISM_WINDOW_SLOT_BIND_FILE=<path>     — override bindings file (tests)
 *   PRISM_WINDOW_SLOT_BIND_MAX_AGE_MS=N    — eviction age, default 30d
 *   PRISM_WINDOW_SLOT_BIND_MAX_BINDINGS=N  — capacity, default 200
 *   PRISM_WINDOW_SLOT_BIND_VERBOSE=1       — write decision-trace to stderr
 *
 * Failure policy:
 *   - All file errors are fail-soft: read errors → empty bindings, write
 *     errors → boolean false, never throws. A broken sidecar must NEVER
 *     stall the claim path — that's a fleet-wide deadlock vector.
 *
 * @module window-slot-bindings
 */

import fs from "node:fs";
import path from "node:path";

const DEFAULT_FILE = "H:/prism/state/shared/window-slot-bindings.json";
const SCHEMA_VERSION = 1;
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MAX_BINDINGS = 200;

export function isEnabled(env = process.env) {
  return env.PRISM_WINDOW_SLOT_BIND === "1";
}

export function bindingsFile() {
  return process.env.PRISM_WINDOW_SLOT_BIND_FILE || DEFAULT_FILE;
}

function maxAgeMs() {
  const raw = Number(process.env.PRISM_WINDOW_SLOT_BIND_MAX_AGE_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_AGE_MS;
}

function maxBindings() {
  const raw = Number(process.env.PRISM_WINDOW_SLOT_BIND_MAX_BINDINGS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_BINDINGS;
}

function trace(msg) {
  if (process.env.PRISM_WINDOW_SLOT_BIND_VERBOSE === "1") {
    process.stderr.write(`[window-slot-bindings] ${msg}\n`);
  }
}

function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastUpdated: null,
    bindings: {},
  };
}

/**
 * Read the bindings sidecar. Fail-soft on any error (missing, malformed,
 * wrong schema, non-object payload) → returns empty state. Does NOT throw.
 *
 * Pure with injected I/O for tests.
 *
 * @param {object} [opts]
 * @param {string} [opts.file]                  — override bindings file path
 * @param {typeof fs} [opts._fs]                — override fs module (tests)
 * @returns {{schemaVersion:number, lastUpdated:string|null, bindings:Record<string, {slot:string, lastChatId:string, lastWrittenAt:string}>}}
 */
export function readBindings(opts = {}) {
  const file = opts.file || bindingsFile();
  const _fs = opts._fs || fs;
  try {
    if (!_fs.existsSync(file)) return emptyState();
    const raw = _fs.readFileSync(file, "utf-8");
    if (!raw || raw.trim().length === 0) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyState();
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      trace(`schemaVersion mismatch in ${file}: expected ${SCHEMA_VERSION}, got ${parsed.schemaVersion} — treating as empty`);
      return emptyState();
    }
    if (!parsed.bindings || typeof parsed.bindings !== "object") return emptyState();
    // Shallow-validate each entry — drop malformed ones rather than fail-loud.
    const out = emptyState();
    out.lastUpdated = typeof parsed.lastUpdated === "string" ? parsed.lastUpdated : null;
    for (const [twid, entry] of Object.entries(parsed.bindings)) {
      if (typeof twid !== "string" || twid.length === 0) continue;
      if (!entry || typeof entry !== "object") continue;
      if (typeof entry.slot !== "string" || entry.slot.length === 0) continue;
      if (typeof entry.lastChatId !== "string" || entry.lastChatId.length === 0) continue;
      if (typeof entry.lastWrittenAt !== "string" || entry.lastWrittenAt.length === 0) continue;
      out.bindings[twid] = {
        slot: entry.slot,
        lastChatId: entry.lastChatId,
        lastWrittenAt: entry.lastWrittenAt,
      };
    }
    return out;
  } catch (err) {
    trace(`read failed for ${file}: ${err && err.message ? err.message : err}`);
    return emptyState();
  }
}

/**
 * Atomic write via tmp+rename. Returns true on success, false on any IO
 * error. Includes the writer PID + ts in tmp name to survive concurrent
 * bootstrap runs.
 *
 * @param {object} state
 * @param {object} [opts]
 * @returns {boolean}
 */
export function writeBindings(state, opts = {}) {
  const file = opts.file || bindingsFile();
  const _fs = opts._fs || fs;
  try {
    const dir = path.dirname(file);
    if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      bindings: state.bindings || {},
    };
    const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
    _fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
    _fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    trace(`write failed for ${file}: ${err && err.message ? err.message : err}`);
    return false;
  }
}

/**
 * Drop entries older than maxAgeMs and cap at maxBindings (oldest first).
 * Pure — returns a NEW bindings object, does not mutate input. Tests inject
 * `now` to avoid clock-dependent flakes.
 *
 * @param {Record<string, {slot:string, lastChatId:string, lastWrittenAt:string}>} bindings
 * @param {object} [opts]
 * @returns {Record<string, {slot:string, lastChatId:string, lastWrittenAt:string}>}
 */
export function pruneBindings(bindings, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const ageLimit = Number.isFinite(opts.maxAgeMs) ? opts.maxAgeMs : maxAgeMs();
  const capacity = Number.isFinite(opts.maxBindings) ? opts.maxBindings : maxBindings();
  /** @type {Record<string, {slot:string, lastChatId:string, lastWrittenAt:string}>} */
  const out = {};
  const entries = [];
  for (const [twid, entry] of Object.entries(bindings || {})) {
    if (!entry || typeof entry !== "object") continue;
    const writtenAt = Date.parse(entry.lastWrittenAt || "");
    if (!Number.isFinite(writtenAt)) continue;
    if ((now - writtenAt) > ageLimit) continue;
    entries.push({ twid, entry, writtenAt });
  }
  entries.sort((a, b) => b.writtenAt - a.writtenAt);
  const kept = entries.slice(0, capacity);
  for (const k of kept) out[k.twid] = k.entry;
  return out;
}

/**
 * Tier-1.5 lookup: given a twid, return the slot it was last bound to.
 * Returns null if no entry, or layer disabled, or entry has been pruned by
 * the age policy. NEVER throws.
 *
 * @param {string} twid
 * @param {object} [opts]
 * @returns {string|null}
 */
export function findSlotByTwid(twid, opts = {}) {
  if (!isEnabled(opts.env || process.env)) return null;
  if (typeof twid !== "string" || twid.length === 0) return null;
  const state = readBindings(opts);
  const pruned = pruneBindings(state.bindings, opts);
  const entry = pruned[twid];
  return entry ? entry.slot : null;
}

/**
 * Record a binding. No-op when disabled, when twid/slot/chatId are missing,
 * or when the persistence layer is not enabled.
 *
 * @param {string} twid
 * @param {string} slot
 * @param {string} chatId
 * @param {object} [opts]
 * @returns {boolean}
 */
export function recordBinding(twid, slot, chatId, opts = {}) {
  if (!isEnabled(opts.env || process.env)) return false;
  if (typeof twid !== "string" || twid.length === 0) return false;
  if (typeof slot !== "string" || slot.length === 0) return false;
  if (typeof chatId !== "string" || chatId.length === 0) return false;
  const state = readBindings(opts);
  const writtenAt = new Date().toISOString();
  state.bindings[twid] = { slot, lastChatId: chatId, lastWrittenAt: writtenAt };
  state.bindings = pruneBindings(state.bindings, opts);
  return writeBindings(state, opts);
}

/**
 * Convenience: drop the binding for a twid. Used when the operator
 * explicitly /checkin-<other-slot> moves a window to a different slot —
 * the auto-bind should learn the new pairing on the next claim. NEVER throws.
 *
 * @param {string} twid
 * @param {object} [opts]
 * @returns {boolean}
 */
export function clearBinding(twid, opts = {}) {
  if (!isEnabled(opts.env || process.env)) return false;
  if (typeof twid !== "string" || twid.length === 0) return false;
  const state = readBindings(opts);
  if (!(twid in state.bindings)) return false;
  delete state.bindings[twid];
  return writeBindings(state, opts);
}

// CLI: `list | get <twid> | put <twid> <slot> <chatId> | drop <twid> | prune`
const __isCli = (() => {
  try {
    const argv1 = (process.argv[1] || "").replace(/\\/g, "/");
    const argv1Base = argv1.split("/").pop() || "";
    return argv1Base.length > 0
      && import.meta.url.replace(/\\/g, "/").endsWith(argv1Base);
  } catch { return false; }
})();

if (__isCli) {
  const cmd = process.argv[2];
  let exitCode = 0;
  if (cmd === "list") {
    const s = readBindings();
    s.bindings = pruneBindings(s.bindings);
    console.log(JSON.stringify(s, null, 2));
  } else if (cmd === "get") {
    const twid = process.argv[3];
    if (!twid) { console.error("usage: get <twid>"); exitCode = 2; }
    else {
      // CLI: surface the answer even when the layer is disabled so operators
      // can inspect what WOULD bind once they flip the env. Bypass isEnabled
      // here — gating is for the auto-claim path, not for read-only diag.
      const state = readBindings();
      const pruned = pruneBindings(state.bindings);
      const entry = pruned[twid] || null;
      console.log(JSON.stringify(entry, null, 2));
    }
  } else if (cmd === "put") {
    const twid = process.argv[3];
    const slot = process.argv[4];
    const chatId = process.argv[5];
    if (!twid || !slot || !chatId) {
      console.error("usage: put <twid> <slot> <chatId>");
      exitCode = 2;
    } else {
      // CLI write: bypass isEnabled too — operator is asking for an explicit
      // seed. The auto-write in chat-slots.mjs is gated; manual CLI is not.
      const state = readBindings();
      state.bindings[twid] = {
        slot,
        lastChatId: chatId,
        lastWrittenAt: new Date().toISOString(),
      };
      state.bindings = pruneBindings(state.bindings);
      const ok = writeBindings(state);
      console.log(JSON.stringify({ ok, twid, slot, chatId }, null, 2));
      exitCode = ok ? 0 : 1;
    }
  } else if (cmd === "drop") {
    const twid = process.argv[3];
    if (!twid) { console.error("usage: drop <twid>"); exitCode = 2; }
    else {
      const state = readBindings();
      const had = twid in state.bindings;
      if (had) delete state.bindings[twid];
      const ok = had ? writeBindings(state) : true;
      console.log(JSON.stringify({ ok, twid, removed: had }, null, 2));
      exitCode = ok ? 0 : 1;
    }
  } else if (cmd === "prune") {
    const state = readBindings();
    const before = Object.keys(state.bindings).length;
    state.bindings = pruneBindings(state.bindings);
    const after = Object.keys(state.bindings).length;
    const ok = writeBindings(state);
    console.log(JSON.stringify({ ok, before, after, dropped: before - after }, null, 2));
    exitCode = ok ? 0 : 1;
  } else {
    console.error("usage: window-slot-bindings.mjs {list | get <twid> | put <twid> <slot> <chatId> | drop <twid> | prune}");
    exitCode = 2;
  }
  process.exit(exitCode);
}
