#!/usr/bin/env node
// slot-task-claim.mjs — PER-SLOT-CLAIM-MS0/U-PSC01 (2026-05-16)
// SCRUTINY-ROUND-2: P0s fixed per arm-A + arm-B reviewer findings.
//
// Per-slot task claim system. A slot can CLAIM a unit (identified by
// `MILESTONE::U-ID` like `HTML-COMPANION-MS0::U-HTML-CLAUDE-MD-EDIT`)
// while it's working it; peers' /pick-unit excludes claimed units.
// Heartbeat refreshes TTL; commit auto-releases.
//
// WHY NOT SQLITE: better-sqlite3 only resolves inside mcp-server/node_modules;
// a CLI launched from H:/prism/.claude/helpers can't load it. Plain JSON +
// lockfile-guarded atomic tmp+rename is the proven pattern (chat-slots.mjs).
// At fleet scale (~10 claims/min total across 12 chats), this scales fine.
//
// FAILURE MODES handled (this round closes 4 P0s + 5 P1s from scrutiny gate):
//   - **P0 concurrency**: file lock around RMW (advisory `.lock` file with stale-TTL)
//   - **P0 corruption**: corrupt JSON renamed to `.corrupt-<iso>` (preserves evidence),
//     storage returns readOnly:true; commitStore refuses to write — exit 3 + stderr
//   - **P0 schema bump**: newer schemaVersion → readOnly:true (refuse to clobber
//     a forward-compat peer's write)
//   - **P0 isCli detection**: canonical `fileURLToPath(import.meta.url) === path.resolve(argv[1])`
//   - **P1 chatId validation**: regex against stable-session-id format
//   - **P1 claim-row validation on read**: malformed rows dropped + warned
//   - **P1 phase forward-only**: phases progress claimed→building→testing→committing,
//     re-claim with backward phase only refreshes heartbeat
//   - **P1 sync sleep**: `Atomics.wait` (real yield, not CPU busy-spin)
//   - **P1 peerClaimedSet identity**: requires non-empty mySlot+myChatId
//
// CLI subcommands: claim/release/heartbeat/list/check/sweep — see usage()
// Exit codes: 0 ok · 1 conflict (claim held by peer) · 2 invalid args · 3 storage error

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SLOT_NAMES } from "./chat-slots.mjs";

const STORE_PATH = "H:/prism/state/shared/slot-task-claims.json";
const LOCK_PATH = STORE_PATH + ".lock";
const SCHEMA_VERSION = 1;
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MIN_TTL_MS = 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
// Slot names are sourced from chat-slots.mjs SLOT_NAMES — never hard-code the
// fleet size (feedback_fleet_design_10_chats). Frozen-12 drift fixed
// 2026-05-20 (U-SLOT-TASK-CLAIM-DRIFT): the fleet expanded 12→26 on 2026-05-19
// (SLOT-RECLAIM), so claims for november..zulu were silently rejected as
// invalid args. Fail loud if the export is malformed rather than degrade to an
// empty set (which would reject every claim).
if (!Array.isArray(SLOT_NAMES) || SLOT_NAMES.length === 0) {
  throw new Error("slot-task-claim: SLOT_NAMES import from chat-slots.mjs is missing or empty");
}
const VALID_SLOTS = new Set(SLOT_NAMES);
// Forward-only phase progression. Re-claim with a backward phase keeps the
// existing (more-advanced) phase but still refreshes heartbeat.
const PHASE_ORDER = Object.freeze({ claimed: 0, building: 1, testing: 2, committing: 3 });
const VALID_PHASES = new Set(Object.keys(PHASE_ORDER));

const UNIT_ID_RE = /^[A-Z][A-Z0-9_-]{1,80}::[A-Za-z0-9_+.-]{1,80}$/;
// chatId formats observed in PRISM: `claude-<8hex>` (stable-session-id),
// `claude-<uuid>` (full uuid), `codex-<id>`, occasional bespoke runners.
// Accept anything alphanumeric+dash+underscore, 4..80 chars.
const CHAT_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{3,79}$/;

const LOCK_ACQUIRE_RETRIES = 50;        // 50 × 50ms = 2.5s max wait
const LOCK_RETRY_MS = 50;
const STALE_LOCK_MS = 30 * 1000;        // a lock older than 30s is considered crashed
const ATOMIC_WRITE_RENAME_RETRIES = 5;

// Per-process Atomics buffer for sync sleep (P1 fix — replaces busy-spin).
const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));

function syncSleep(ms) {
  // Atomics.wait blocks the calling thread until timeout OR the int changes.
  // Since no one ever notifies SLEEP_BUF, it always times out — giving us a
  // real OS-level sleep without burning CPU.
  Atomics.wait(SLEEP_BUF, 0, 0, Math.max(0, Math.floor(ms)));
}

// ──────────────────────────────────────────────────────────────────────────
// lock layer — advisory `.lock` file with stale-PID detection
// ──────────────────────────────────────────────────────────────────────────

function acquireLock() {
  for (let attempt = 0; attempt < LOCK_ACQUIRE_RETRIES; attempt++) {
    try {
      // `wx` flag: create exclusively; fails with EEXIST if file already exists.
      const fd = fs.openSync(LOCK_PATH, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      // Check for stale lock (owner crashed without releasing).
      try {
        const stat = fs.statSync(LOCK_PATH);
        const ageMs = Date.now() - stat.mtimeMs;
        if (ageMs > STALE_LOCK_MS) {
          // Steal the stale lock.
          fs.unlinkSync(LOCK_PATH);
          continue;
        }
      } catch { /* race with releaser — retry */ }
      syncSleep(LOCK_RETRY_MS);
    }
  }
  return false;
}

function releaseLock() {
  try { fs.unlinkSync(LOCK_PATH); } catch (e) {
    if (e.code !== "ENOENT") {
      // Lock file gone or unowned — surface, not silent.
      console.error("slot-task-claim: lock release issue:", e.code || e.message);
    }
  }
}

function withLock(fn) {
  if (!acquireLock()) {
    const err = new Error("could not acquire slot-task-claim lock after " + LOCK_ACQUIRE_RETRIES + " retries");
    err.code = "LOCK_TIMEOUT";
    throw err;
  }
  try { return fn(); } finally { releaseLock(); }
}

// ──────────────────────────────────────────────────────────────────────────
// storage layer — read + atomic write (caller must hold lock for full RMW)
// ──────────────────────────────────────────────────────────────────────────

function emptyStore() {
  return { schemaVersion: SCHEMA_VERSION, lastSweepAt: null, claims: {} };
}

function isValidClaimRow(row) {
  if (typeof row !== "object" || row === null) return false;
  if (!VALID_SLOTS.has(row.slot)) return false;
  if (typeof row.chatId !== "string" || !CHAT_ID_RE.test(row.chatId)) return false;
  if (typeof row.unitId !== "string" || !UNIT_ID_RE.test(row.unitId)) return false;
  if (typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) return false;
  if (typeof row.claimedAt !== "string" || !Number.isFinite(Date.parse(row.claimedAt))) return false;
  if (!VALID_PHASES.has(row.phase)) return false;
  return true;
}

/**
 * Read the store. Returns an object with optional sentinels:
 *   { readOnly: true, reason: string }     — caller MUST NOT write
 *   { schemaVersion, lastSweepAt, claims } — normal
 * On parse failure or schema mismatch, the corrupt file is renamed to
 * `.corrupt-<iso>` (preserves evidence) and a fresh emptyStore is returned
 * BUT with `readOnly:true` so commitStore refuses to overwrite a newer peer.
 */
export function readStore(opts = {}) {
  const storePath = opts.storePath || STORE_PATH;
  if (!fs.existsSync(storePath)) return emptyStore();
  let raw;
  try {
    raw = fs.readFileSync(storePath, "utf8");
  } catch (e) {
    return { ...emptyStore(), readOnly: true, reason: `read failed: ${e.code || e.message}` };
  }
  if (raw.trim().length === 0) return emptyStore();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // P0-1 fix: preserve evidence + refuse-write.
    const corruptPath = storePath + ".corrupt-" + new Date().toISOString().replace(/[:.]/g, "-");
    try { fs.renameSync(storePath, corruptPath); } catch { /* best-effort */ }
    return { ...emptyStore(), readOnly: true, reason: `parse failed: ${e.message} — corrupt file preserved at ${corruptPath}` };
  }
  if (typeof parsed !== "object" || parsed === null || !parsed.claims) {
    return { ...emptyStore(), readOnly: true, reason: "schema-shape failure: missing claims map" };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    // P0-2 fix: refuse-write on schema mismatch. A newer-schema peer's data
    // must NEVER be silently clobbered by an older script.
    return { ...emptyStore(), readOnly: true, reason: `schema-version mismatch: file=${parsed.schemaVersion} script=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)` };
  }
  // P1 fix: validate every claim row. Drop malformed rows + collect warning.
  const cleanClaims = {};
  const droppedKeys = [];
  for (const [key, row] of Object.entries(parsed.claims)) {
    if (isValidClaimRow(row)) cleanClaims[key] = row;
    else droppedKeys.push(key);
  }
  const result = { schemaVersion: SCHEMA_VERSION, lastSweepAt: parsed.lastSweepAt || null, claims: cleanClaims };
  if (droppedKeys.length > 0) result.warnings = [`dropped ${droppedKeys.length} malformed row(s): ${droppedKeys.slice(0, 5).join(", ")}${droppedKeys.length > 5 ? "..." : ""}`];
  return result;
}

function writeStoreUnsafe(store, opts = {}) {
  const storePath = opts.storePath || STORE_PATH;
  if (store.readOnly) {
    const err = new Error(`refusing to write read-only store: ${store.reason || "(unspecified)"}`);
    err.code = "READ_ONLY";
    throw err;
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = storePath + ".tmp-" + process.pid + "-" + Date.now();
  // Single-line JSON for diff-friendliness in shared tree.
  fs.writeFileSync(tmp, JSON.stringify({
    schemaVersion: store.schemaVersion,
    lastSweepAt: store.lastSweepAt,
    claims: store.claims,
  }), "utf8");
  let lastErr = null;
  for (let attempt = 0; attempt < ATOMIC_WRITE_RENAME_RETRIES; attempt++) {
    try {
      fs.renameSync(tmp, storePath);
      return;
    } catch (e) {
      lastErr = e;
      if (e.code !== "EBUSY" && e.code !== "EPERM" && e.code !== "EACCES") break;
      syncSleep(LOCK_RETRY_MS);
    }
  }
  // Surface the tmp leak so the operator can clean up.
  console.error("slot-task-claim: tmp file leaked at:", tmp, "(rename failed:", lastErr?.code || lastErr?.message || "unknown", ")");
  try { fs.unlinkSync(tmp); } catch { /* already best-effort */ }
  throw new Error(`atomic write failed after ${ATOMIC_WRITE_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`);
}

// ──────────────────────────────────────────────────────────────────────────
// pure functions — testable without filesystem or locks
// ──────────────────────────────────────────────────────────────────────────

export function sweepExpired(store, nowIso) {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return { purged: 0, purgedDetail: [] };
  const purged = [];
  for (const [unitId, claim] of Object.entries(store.claims)) {
    const expiresAt = Date.parse(claim.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt < now) {
      purged.push({ unitId, claim });
      delete store.claims[unitId];
    }
  }
  // Only update lastSweepAt when something actually changed (P1 fix —
  // reduces write-amplification + diff churn).
  if (purged.length > 0) store.lastSweepAt = nowIso;
  return { purged: purged.length, purgedDetail: purged };
}

export function applyClaim(store, args, nowIso) {
  const { slot, chatId, unitId, ttlMs, phase } = args;
  if (!VALID_SLOTS.has(slot)) throw new Error(`invalid slot: ${slot}`);
  if (typeof chatId !== "string" || !CHAT_ID_RE.test(chatId)) throw new Error(`invalid chatId: must match ${CHAT_ID_RE} — got: ${typeof chatId === "string" ? chatId.slice(0, 40) : typeof chatId}`);
  if (!UNIT_ID_RE.test(unitId)) throw new Error(`invalid unitId: ${unitId} (expected MILESTONE::U-XX)`);
  const ttlNum = Number(ttlMs);
  const clampedTtl = !Number.isFinite(ttlNum) || ttlNum <= 0
    ? DEFAULT_TTL_MS
    : Math.max(MIN_TTL_MS, Math.min(MAX_TTL_MS, ttlNum));
  const requestedPhase = phase && VALID_PHASES.has(phase) ? phase : "claimed";
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new Error(`invalid nowIso: ${nowIso}`);

  sweepExpired(store, nowIso);

  const existing = store.claims[unitId];
  if (existing) {
    if (existing.slot === slot && existing.chatId === chatId) {
      // Same owner re-claiming — refresh heartbeat. Phase advances forward only.
      existing.lastHeartbeat = nowIso;
      existing.expiresAt = new Date(now + clampedTtl).toISOString();
      // P1 fix: forward-only phase
      if (PHASE_ORDER[requestedPhase] >= PHASE_ORDER[existing.phase]) {
        existing.phase = requestedPhase;
      }
      return { ok: true, claim: existing, refreshed: true };
    }
    return { ok: false, conflict: existing };
  }
  const claim = {
    slot,
    chatId,
    unitId,
    claimedAt: nowIso,
    lastHeartbeat: nowIso,
    expiresAt: new Date(now + clampedTtl).toISOString(),
    phase: requestedPhase,
  };
  store.claims[unitId] = claim;
  return { ok: true, claim, refreshed: false };
}

export function applyRelease(store, args) {
  const { slot, chatId, unitId } = args;
  if (!VALID_SLOTS.has(slot)) throw new Error(`invalid slot: ${slot}`);
  if (typeof chatId !== "string" || !CHAT_ID_RE.test(chatId)) throw new Error(`invalid chatId: ${chatId}`);
  if (!UNIT_ID_RE.test(unitId)) throw new Error(`invalid unitId: ${unitId}`);
  const existing = store.claims[unitId];
  if (!existing) return { ok: false, reason: "not_claimed" };
  if (existing.slot !== slot || existing.chatId !== chatId) {
    return { ok: false, reason: "wrong_owner", existing };
  }
  delete store.claims[unitId];
  return { ok: true, releasedClaim: existing };
}

export function applyHeartbeat(store, args, nowIso) {
  const { slot, chatId, unitId, ttlMs } = args;
  if (!VALID_SLOTS.has(slot)) throw new Error(`invalid slot: ${slot}`);
  if (typeof chatId !== "string" || !CHAT_ID_RE.test(chatId)) throw new Error(`invalid chatId: ${chatId}`);
  if (!UNIT_ID_RE.test(unitId)) throw new Error(`invalid unitId: ${unitId}`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new Error(`invalid nowIso: ${nowIso}`);
  const ttlNum = Number(ttlMs);
  const clampedTtl = !Number.isFinite(ttlNum) || ttlNum <= 0
    ? DEFAULT_TTL_MS
    : Math.max(MIN_TTL_MS, Math.min(MAX_TTL_MS, ttlNum));
  const existing = store.claims[unitId];
  if (!existing) return { ok: false, reason: "not_claimed" };
  if (existing.slot !== slot || existing.chatId !== chatId) {
    return { ok: false, reason: "wrong_owner", existing };
  }
  existing.lastHeartbeat = nowIso;
  existing.expiresAt = new Date(now + clampedTtl).toISOString();
  return { ok: true, claim: existing };
}

export function checkClaim(store, unitId, mySlot, myChatId, nowIso) {
  if (!UNIT_ID_RE.test(unitId)) throw new Error(`invalid unitId: ${unitId}`);
  const now = Date.parse(nowIso);
  const existing = store.claims[unitId];
  if (!existing) return { claimed: false };
  const expiresAt = Date.parse(existing.expiresAt);
  if (Number.isFinite(now) && Number.isFinite(expiresAt) && expiresAt < now) {
    return { claimed: false, wasExpired: true, expiredClaim: existing };
  }
  // P1 fix: byMe requires NON-EMPTY identity. Caller passing undefined gets
  // fail-safe (treated as peer claim).
  const byMe = !!(mySlot && myChatId && existing.slot === mySlot && existing.chatId === myChatId);
  return { claimed: true, byMe, claim: existing };
}

/**
 * P1 fix: require non-empty mySlot+myChatId.
 * If caller cannot provide identity, EVERY claim is treated as peer-claimed
 * (fail-safe — pick-unit will skip them all). The caller has no way to
 * accidentally bypass mutual exclusion.
 */
export function peerClaimedSet(store, mySlot, myChatId, unitIds, nowIso) {
  if (!mySlot || !myChatId) {
    // No identity → treat every active claim as a peer claim (most restrictive).
    return new Set(Object.keys(store.claims).filter((u) => unitIds.includes(u)));
  }
  const out = new Set();
  const now = Date.parse(nowIso);
  for (const unitId of unitIds) {
    const existing = store.claims[unitId];
    if (!existing) continue;
    const expiresAt = Date.parse(existing.expiresAt);
    if (Number.isFinite(now) && Number.isFinite(expiresAt) && expiresAt < now) continue;
    if (existing.slot === mySlot && existing.chatId === myChatId) continue;
    out.add(unitId);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// CLI plumbing — every mutation runs inside withLock(...) so RMW is atomic
// ──────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slot") args.slot = argv[++i];
    else if (a === "--chatId") args.chatId = argv[++i];
    else if (a === "--unit") args.unit = argv[++i];
    else if (a === "--ttl-ms") args.ttlMs = Number(argv[++i]);
    else if (a === "--phase") args.phase = argv[++i];
    else if (a === "--all") args.all = true;
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.log(`slot-task-claim — per-slot unit claims for the 12-chat fleet (PER-SLOT-CLAIM-MS0)

Usage:
  slot-task-claim.mjs claim    --slot S --chatId C --unit MS::UID [--ttl-ms N] [--phase claimed|building|testing|committing]
  slot-task-claim.mjs release  --slot S --chatId C --unit MS::UID
  slot-task-claim.mjs heartbeat --slot S --chatId C --unit MS::UID [--ttl-ms N]
  slot-task-claim.mjs list     [--slot S] [--chatId C] [--all] [--json]
  slot-task-claim.mjs check    --unit MS::UID [--slot S] [--chatId C] [--json]
  slot-task-claim.mjs sweep    [--json]

TTL defaults to 30min; floor 1min, ceiling 24h.
Store: ${STORE_PATH}  Lock: ${LOCK_PATH}
`);
}

function shortChatId(c) {
  if (typeof c !== "string") return "??";
  return c.startsWith("claude-") ? c.slice(7, 15) : c.slice(0, 8);
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args._.length === 0) {
    usage();
    process.exit(args.help ? 0 : 2);
  }
  const cmd = args._[0];
  const nowIso = new Date().toISOString();

  // For pure read commands (list, check), we don't strictly need the lock,
  // but acquiring it makes the read consistent (no half-written rename window).
  // For mutation commands, the whole RMW must be inside the lock.
  let result;
  try {
    if (cmd === "list" || cmd === "check") {
      const store = readStore();
      if (store.warnings) for (const w of store.warnings) console.error("slot-task-claim: warning:", w);
      if (store.readOnly) console.error("slot-task-claim: read-only:", store.reason);
      result = handleReadCmd(cmd, store, args, nowIso);
    } else {
      result = withLock(() => {
        const store = readStore();
        if (store.warnings) for (const w of store.warnings) console.error("slot-task-claim: warning:", w);
        if (store.readOnly) {
          console.error("slot-task-claim: READ-ONLY store — refusing to write:", store.reason);
          process.exit(3);
        }
        return handleMutationCmd(cmd, store, args, nowIso);
      });
    }
  } catch (e) {
    if (e.code === "LOCK_TIMEOUT") {
      console.error("slot-task-claim: lock timeout:", e.message);
      process.exit(3);
    }
    if (e.code === "READ_ONLY") {
      console.error("slot-task-claim:", e.message);
      process.exit(3);
    }
    console.error("slot-task-claim: error:", e.message);
    process.exit(2);
  }
  if (result?.exitCode) process.exit(result.exitCode);
}

function handleReadCmd(cmd, store, args, nowIso) {
  if (cmd === "list") {
    sweepExpired(store, nowIso); // pure mutation, not persisted (we're in read-only path)
    let rows = Object.values(store.claims);
    if (!args.all) {
      if (args.slot) rows = rows.filter((r) => r.slot === args.slot);
      if (args.chatId) rows = rows.filter((r) => r.chatId === args.chatId);
    }
    if (args.json) {
      console.log(JSON.stringify({ ok: true, count: rows.length, claims: rows }, null, 2));
    } else {
      console.log(`slot-task-claim: ${rows.length} active claim(s)`);
      for (const r of rows) {
        const ageMin = Math.round((Date.parse(nowIso) - Date.parse(r.claimedAt)) / 60000);
        const ttlMin = Math.round((Date.parse(r.expiresAt) - Date.parse(nowIso)) / 60000);
        console.log(`  ${r.slot}/${shortChatId(r.chatId)} ${r.unitId} [${r.phase}] age=${ageMin}m ttl=${ttlMin}m`);
      }
    }
    return { exitCode: 0 };
  }
  if (cmd === "check") {
    const result = checkClaim(store, args.unit, args.slot, args.chatId, nowIso);
    if (args.json) console.log(JSON.stringify({ ok: true, result }, null, 2));
    else if (result.claimed) console.log(`CLAIMED by ${result.claim.slot}/${shortChatId(result.claim.chatId)} (byMe=${result.byMe}) until ${result.claim.expiresAt}`);
    else console.log(`NOT CLAIMED (wasExpired=${!!result.wasExpired})`);
    return { exitCode: 0 };
  }
  console.error("slot-task-claim: unknown read command:", cmd);
  return { exitCode: 2 };
}

function handleMutationCmd(cmd, store, args, nowIso) {
  switch (cmd) {
    case "claim": {
      const result = applyClaim(store, { slot: args.slot, chatId: args.chatId, unitId: args.unit, ttlMs: args.ttlMs, phase: args.phase }, nowIso);
      if (!result.ok) {
        console.log(JSON.stringify({ ok: false, conflict: result.conflict }));
        return { exitCode: 1 };
      }
      writeStoreUnsafe(store);
      console.log(JSON.stringify({ ok: true, claim: result.claim, refreshed: result.refreshed }));
      return { exitCode: 0 };
    }
    case "release": {
      const result = applyRelease(store, { slot: args.slot, chatId: args.chatId, unitId: args.unit });
      if (!result.ok) {
        console.log(JSON.stringify({ ok: false, reason: result.reason, existing: result.existing }));
        return { exitCode: result.reason === "wrong_owner" ? 1 : 0 };
      }
      writeStoreUnsafe(store);
      console.log(JSON.stringify({ ok: true, releasedClaim: result.releasedClaim }));
      return { exitCode: 0 };
    }
    case "heartbeat": {
      const result = applyHeartbeat(store, { slot: args.slot, chatId: args.chatId, unitId: args.unit, ttlMs: args.ttlMs }, nowIso);
      if (!result.ok) {
        console.log(JSON.stringify({ ok: false, reason: result.reason, existing: result.existing }));
        return { exitCode: 1 };
      }
      writeStoreUnsafe(store);
      console.log(JSON.stringify({ ok: true, claim: result.claim }));
      return { exitCode: 0 };
    }
    case "sweep": {
      const result = sweepExpired(store, nowIso);
      if (result.purged > 0) writeStoreUnsafe(store);
      if (args.json) console.log(JSON.stringify({ ok: true, purged: result.purged, detail: result.purgedDetail }, null, 2));
      else console.log(`slot-task-claim: swept ${result.purged} expired claim(s)`);
      return { exitCode: 0 };
    }
    default:
      console.error("slot-task-claim: unknown command:", cmd);
      usage();
      return { exitCode: 2 };
  }
}

// P0-3 fix: canonical isCli detection.
// fileURLToPath(import.meta.url) → "H:\\prism\\.claude\\helpers\\slot-task-claim.mjs"
// path.resolve(process.argv[1]) → same absolute path
// Direct equality, no slash/scheme/basename heuristics.
function isCli() {
  if (!process.argv[1]) return false;
  try {
    const here = fileURLToPath(import.meta.url);
    const cwdInvoked = path.resolve(process.argv[1]);
    return here === cwdInvoked;
  } catch { return false; }
}

if (isCli()) main(process.argv.slice(2));

export {
  STORE_PATH,
  LOCK_PATH,
  DEFAULT_TTL_MS,
  MIN_TTL_MS,
  MAX_TTL_MS,
  VALID_SLOTS,
  VALID_PHASES,
  PHASE_ORDER,
  UNIT_ID_RE,
  CHAT_ID_RE,
  SCHEMA_VERSION,
  isValidClaimRow,
  writeStoreUnsafe,
  acquireLock,
  releaseLock,
  withLock,
  shortChatId,
  syncSleep,
};
