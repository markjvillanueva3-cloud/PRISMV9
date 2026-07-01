#!/usr/bin/env node
// scripts/galaxy-synthesis-claim.mjs — synthesis-claim ledger (BRAIN-UPGRADE rank 6, 2026-05-30 slot:alpha)
//
// THE PRECONDITION FOR FLEET-DISTRIBUTED SYNTHESIS (amplifier #3, the 20-chat lever).
// When ~20 slot-Claudes each run galaxy synthesis in parallel, without a shared claim they
// ALL enumerate the same ~34 galaxies and ALL re-synthesize each one → 20× redundant Ollama
// generations + write-races on knowledge/memories/patterns/<galaxy>_synthesis.md. This ledger
// lets a chat CLAIM a (galaxy, sourceHash) work-unit; peers checking the same unit skip it and
// move to an unclaimed galaxy.
//
// WHY (galaxy, sourceHash) AND NOT galaxy ALONE: the claim is specific to the EXACT memory
// cluster being synthesized — sourceHash = computeSourceHash(memories) from
// galaxy-reflection-synthesis.mjs, the same fingerprint already stamped into each synthesis's
// frontmatter. If the source memories change (hash X→Y) while a peer holds galaxy@X, a chat
// computing galaxy@Y finds NO live claim for Y → it correctly synthesizes the FRESH cluster.
// Keying by galaxy alone would wrongly block the legitimate re-synthesis of changed content.
//   Bounded residual (documented, not silent — R12): if the source changes mid-flight, two
//   syntheses of the same galaxy at different hashes can briefly race; last-writer-wins, and
//   the next incremental refresh (galaxy-synthesis-refresh.mjs) detects stored≠current and
//   re-synthesizes. The ledger removes the COMMON 20×-same-hash collision, not every theoretic
//   race — which is exactly its scope as an optimization (see fail-open contract below).
//
// LINEAGE (dedup-verified — sibling, NOT a duplicate): clones the proven atomic-RMW + O_EXCL
// lock (stale-TTL steal) + schema-guard + corrupt-preserve pattern of
// .claude/helpers/slot-task-claim.mjs (PER-SLOT-CLAIM-MS0), specialized to a DIFFERENT domain
// (synthesis work-units, not roadmap task units), a DIFFERENT store, and a DIFFERENT key shape
// (galaxy@hash, not MILESTONE::U-ID). The lock/store primitives there are hard-bound to that
// store's path, so they cannot be imported for a second store — the ~50 duplicated lines are
// the pragmatic choice (same axis-niche reasoning the synthesis scripts use vs hermes-*).
//
// FAIL-OPEN CONTRACT (load-bearing correctness property): this ledger is an OPTIMIZATION, never
// a correctness gate. Synthesis works fine with NO ledger at all (today's single-chat behavior).
// So the consumer-facing wrappers (tryClaimSynthesis / tryReleaseSynthesis) NEVER throw and
// NEVER block work: any lock-timeout / corrupt-store / readOnly / unexpected error → fail-OPEN
// (`{ ok:true, failOpen:true, reason }`), i.e. "proceed as if uncontended." The worst case of
// fail-open is a redundant synthesis (== today). ONLY a GENUINE live peer claim returns
// `{ ok:false, conflict }` → that galaxy is the peer's to do.
//
// Exit codes (CLI): 0 ok · 1 conflict (claim held by peer) · 2 invalid args · 3 storage error.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STORE_PATH = process.env.PRISM_GALAXY_SYNTH_CLAIM_STORE
  || "H:/prism/state/shared/galaxy-synthesis-claims.json";
const LOCK_PATH = STORE_PATH + ".lock";
const SCHEMA_VERSION = 1;

// A single galaxy synthesis is one Ollama generation (~30-120s; cold-load to ~180s). The TTL
// must cover a slow cold generation yet auto-release a crashed chat promptly so its galaxy is
// re-done on the next pass. 10min covers the slowest realistic generation with slack.
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MIN_TTL_MS = 60 * 1000;
const MAX_TTL_MS = 60 * 60 * 1000;

const LOCK_ACQUIRE_RETRIES = 50;     // 50 × 50ms = 2.5s max wait
const LOCK_RETRY_MS = 50;
const STALE_LOCK_MS = 30 * 1000;     // a lock older than 30s is considered crashed
const ATOMIC_WRITE_RENAME_RETRIES = 5;

// Galaxy slugs are engines/<slug> dir names: kebab-case (token-optimization, hermes-zulu,
// ai-training). sourceHash is computeSourceHash → 12 lowercase-hex (sha256 sliced); accept
// 6..64 hex to be forgiving of future widening. chatId mirrors slot-task-claim's accepted set
// (claude-<hex>, codex-<id>, bespoke runners, plus our synthetic synth-<pid> fallback).
const GALAXY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HASH_RE = /^[a-f0-9]{6,64}$/;
const CHAT_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{3,79}$/;

// Per-process Atomics buffer for a real (non-busy-spin) sync sleep — same primitive as
// slot-task-claim. No one ever notifies it, so Atomics.wait always times out = an OS sleep.
const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));
export function syncSleep(ms) {
  Atomics.wait(SLEEP_BUF, 0, 0, Math.max(0, Math.floor(ms)));
}

// ──────────────────────────────────────────────────────────────────────────
// key helpers
// ──────────────────────────────────────────────────────────────────────────

export function claimKey(galaxy, sourceHash) {
  return `${galaxy}@${sourceHash}`;
}

// Split a claimKey back into parts. The galaxy slug never contains '@' (GALAXY_RE forbids it),
// so the LAST '@' is an unambiguous separator. Returns null on a malformed key.
export function parseKey(key) {
  if (typeof key !== "string") return null;
  const at = key.lastIndexOf("@");
  if (at <= 0 || at === key.length - 1) return null;
  return { galaxy: key.slice(0, at), sourceHash: key.slice(at + 1) };
}

// ──────────────────────────────────────────────────────────────────────────
// lock layer — advisory `.lock` file with stale-PID detection. Parameterized
// on lockPath so a real-fs tmpdir oracle can exercise it (the brain-refresh
// lesson: an unparameterized lock has zero test coverage).
// ──────────────────────────────────────────────────────────────────────────

export function acquireLock(lockPath = LOCK_PATH) {
  for (let attempt = 0; attempt < LOCK_ACQUIRE_RETRIES; attempt++) {
    try {
      const fd = fs.openSync(lockPath, "wx"); // exclusive create; EEXIST if held
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
          // ATOMIC steal (NOT a blind unlink-by-path): renameSync is atomic, so under
          // simultaneous stealers exactly ONE wins the rename — the loser's rename throws
          // ENOENT (the stale lock is already gone) and falls through to wait+retry. A blind
          // `unlinkSync(lockPath)` here would race: a 2nd stealer could remove a lock a 1st
          // stealer already recreated → both acquire (the steal-path double-unlink TOCTOU,
          // caught in per-file scrutiny 2026-05-30 on the sibling lock and fixed identically
          // here). Mirrors the canonical scripts/lib/exclusive-file-lock.mjs rename-steal.
          const stealPath = `${lockPath}.steal-${process.pid}-${attempt}`;
          fs.renameSync(lockPath, stealPath); // atomic; ENOENT if already stolen by a peer
          try { fs.unlinkSync(stealPath); } catch { /* best-effort — an orphan steal sidecar is harmless */ }
          continue; // retry the atomic create (a peer may still win openSync → EEXIST → wait)
        }
      } catch { /* statSync miss / lost the rename-steal race (ENOENT) → fall through to retry */ }
      syncSleep(LOCK_RETRY_MS);
    }
  }
  return false;
}

export function releaseLock(lockPath = LOCK_PATH) {
  try { fs.unlinkSync(lockPath); } catch (e) {
    if (e.code !== "ENOENT") console.error("galaxy-synth-claim: lock release issue:", e.code || e.message);
  }
}

export function withLock(fn, { lockPath = LOCK_PATH } = {}) {
  if (!acquireLock(lockPath)) {
    const err = new Error("could not acquire galaxy-synth-claim lock after " + LOCK_ACQUIRE_RETRIES + " retries");
    err.code = "LOCK_TIMEOUT";
    throw err;
  }
  try { return fn(); } finally { releaseLock(lockPath); }
}

// ──────────────────────────────────────────────────────────────────────────
// storage layer — read + atomic write (caller must hold the lock for full RMW)
// ──────────────────────────────────────────────────────────────────────────

function emptyStore() {
  return { schemaVersion: SCHEMA_VERSION, lastSweepAt: null, claims: {} };
}

export function isValidClaimRow(row) {
  if (typeof row !== "object" || row === null) return false;
  if (typeof row.galaxy !== "string" || !GALAXY_RE.test(row.galaxy)) return false;
  if (typeof row.sourceHash !== "string" || !HASH_RE.test(row.sourceHash)) return false;
  if (typeof row.chatId !== "string" || !CHAT_ID_RE.test(row.chatId)) return false;
  if (typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) return false;
  if (typeof row.claimedAt !== "string" || !Number.isFinite(Date.parse(row.claimedAt))) return false;
  return true;
}

/**
 * Read the store. Sentinels:
 *   { readOnly:true, reason } — caller MUST NOT write (corrupt / schema-mismatch / read-fail)
 *   { schemaVersion, lastSweepAt, claims } — normal
 * Corrupt JSON is renamed to `.corrupt-<iso>` (evidence preserved) and a fresh emptyStore is
 * returned WITH readOnly:true so a write never clobbers a newer peer.
 */
export function readStore(opts = {}) {
  const storePath = opts.storePath || STORE_PATH;
  if (!fs.existsSync(storePath)) return emptyStore();
  let raw;
  try { raw = fs.readFileSync(storePath, "utf8"); }
  catch (e) { return { ...emptyStore(), readOnly: true, reason: `read failed: ${e.code || e.message}` }; }
  if (raw.trim().length === 0) return emptyStore();
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) {
    const corruptPath = storePath + ".corrupt-" + new Date().toISOString().replace(/[:.]/g, "-");
    try { fs.renameSync(storePath, corruptPath); } catch { /* best-effort */ }
    return { ...emptyStore(), readOnly: true, reason: `parse failed: ${e.message} — corrupt file preserved at ${corruptPath}` };
  }
  if (typeof parsed !== "object" || parsed === null || !parsed.claims) {
    return { ...emptyStore(), readOnly: true, reason: "schema-shape failure: missing claims map" };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return { ...emptyStore(), readOnly: true, reason: `schema-version mismatch: file=${parsed.schemaVersion} script=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)` };
  }
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

export function writeStoreUnsafe(store, opts = {}) {
  const storePath = opts.storePath || STORE_PATH;
  if (store.readOnly) {
    const err = new Error(`refusing to write read-only store: ${store.reason || "(unspecified)"}`);
    err.code = "READ_ONLY";
    throw err;
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = storePath + ".tmp-" + process.pid + "-" + Date.now();
  fs.writeFileSync(tmp, JSON.stringify({
    schemaVersion: store.schemaVersion,
    lastSweepAt: store.lastSweepAt,
    claims: store.claims,
  }), "utf8");
  let lastErr = null;
  for (let attempt = 0; attempt < ATOMIC_WRITE_RENAME_RETRIES; attempt++) {
    try { fs.renameSync(tmp, storePath); return; }
    catch (e) {
      lastErr = e;
      if (e.code !== "EBUSY" && e.code !== "EPERM" && e.code !== "EACCES") break;
      syncSleep(LOCK_RETRY_MS);
    }
  }
  console.error("galaxy-synth-claim: tmp file leaked at:", tmp, "(rename failed:", lastErr?.code || lastErr?.message || "unknown", ")");
  try { fs.unlinkSync(tmp); } catch { /* best-effort */ }
  throw new Error(`atomic write failed after ${ATOMIC_WRITE_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`);
}

// ──────────────────────────────────────────────────────────────────────────
// pure functions — testable without filesystem or locks
// ──────────────────────────────────────────────────────────────────────────

export function sweepExpired(store, nowIso) {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return { purged: 0, purgedDetail: [] };
  const purged = [];
  for (const [key, claim] of Object.entries(store.claims)) {
    const expiresAt = Date.parse(claim.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt < now) {
      purged.push({ key, claim });
      delete store.claims[key];
    }
  }
  if (purged.length > 0) store.lastSweepAt = nowIso;
  return { purged: purged.length, purgedDetail: purged };
}

export function applyClaim(store, args, nowIso) {
  const { galaxy, sourceHash, chatId, ttlMs } = args;
  if (typeof galaxy !== "string" || !GALAXY_RE.test(galaxy)) throw new Error(`invalid galaxy: ${galaxy}`);
  if (typeof sourceHash !== "string" || !HASH_RE.test(sourceHash)) throw new Error(`invalid sourceHash: ${sourceHash}`);
  if (typeof chatId !== "string" || !CHAT_ID_RE.test(chatId)) throw new Error(`invalid chatId: must match ${CHAT_ID_RE} — got: ${typeof chatId === "string" ? chatId.slice(0, 40) : typeof chatId}`);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new Error(`invalid nowIso: ${nowIso}`);
  const ttlNum = Number(ttlMs);
  const clampedTtl = !Number.isFinite(ttlNum) || ttlNum <= 0
    ? DEFAULT_TTL_MS
    : Math.max(MIN_TTL_MS, Math.min(MAX_TTL_MS, ttlNum));

  sweepExpired(store, nowIso);

  const key = claimKey(galaxy, sourceHash);
  const existing = store.claims[key];
  if (existing) {
    if (existing.chatId === chatId) {
      // Same owner re-claiming (idempotent re-run / retry) — refresh heartbeat + TTL.
      existing.lastHeartbeat = nowIso;
      existing.expiresAt = new Date(now + clampedTtl).toISOString();
      return { ok: true, claim: existing, refreshed: true };
    }
    return { ok: false, conflict: existing };
  }
  const claim = {
    galaxy,
    sourceHash,
    chatId,
    claimedAt: nowIso,
    lastHeartbeat: nowIso,
    expiresAt: new Date(now + clampedTtl).toISOString(),
  };
  store.claims[key] = claim;
  return { ok: true, claim, refreshed: false };
}

export function applyRelease(store, args) {
  const { galaxy, sourceHash, chatId } = args;
  if (typeof galaxy !== "string" || !GALAXY_RE.test(galaxy)) throw new Error(`invalid galaxy: ${galaxy}`);
  if (typeof sourceHash !== "string" || !HASH_RE.test(sourceHash)) throw new Error(`invalid sourceHash: ${sourceHash}`);
  if (typeof chatId !== "string" || !CHAT_ID_RE.test(chatId)) throw new Error(`invalid chatId: ${chatId}`);
  const key = claimKey(galaxy, sourceHash);
  const existing = store.claims[key];
  if (!existing) return { ok: false, reason: "not_claimed" };
  if (existing.chatId !== chatId) return { ok: false, reason: "wrong_owner", existing };
  delete store.claims[key];
  return { ok: true, releasedClaim: existing };
}

export function checkClaim(store, galaxy, sourceHash, myChatId, nowIso) {
  if (typeof galaxy !== "string" || !GALAXY_RE.test(galaxy)) throw new Error(`invalid galaxy: ${galaxy}`);
  if (typeof sourceHash !== "string" || !HASH_RE.test(sourceHash)) throw new Error(`invalid sourceHash: ${sourceHash}`);
  const now = Date.parse(nowIso);
  const existing = store.claims[claimKey(galaxy, sourceHash)];
  if (!existing) return { claimed: false };
  const expiresAt = Date.parse(existing.expiresAt);
  if (Number.isFinite(now) && Number.isFinite(expiresAt) && expiresAt < now) {
    return { claimed: false, wasExpired: true, expiredClaim: existing };
  }
  const byMe = !!(myChatId && existing.chatId === myChatId);
  return { claimed: true, byMe, claim: existing };
}

/**
 * Batch pre-filter for the refresher's logging: of the candidate {galaxy, sourceHash} units,
 * which are held by a LIVE peer (not me, not expired)? Returns a Set of claimKeys to skip.
 * Identity-gated: with no myChatId, EVERY live claim is treated as a peer claim (most
 * restrictive — same fail-safe as slot-task-claim's peerClaimedSet).
 */
export function peerClaimedKeys(store, units, myChatId, nowIso) {
  const out = new Set();
  const now = Date.parse(nowIso);
  for (const u of units || []) {
    if (!u || typeof u.galaxy !== "string" || typeof u.sourceHash !== "string") continue;
    const key = claimKey(u.galaxy, u.sourceHash);
    const existing = store.claims[key];
    if (!existing) continue;
    const expiresAt = Date.parse(existing.expiresAt);
    if (Number.isFinite(now) && Number.isFinite(expiresAt) && expiresAt < now) continue;
    if (myChatId && existing.chatId === myChatId) continue;
    out.add(key);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// consumer-facing FAIL-OPEN wrappers — the integration primitives for
// galaxy-synthesis-refresh.mjs. These NEVER throw and NEVER block: any error
// (lock-timeout / corrupt / readOnly / unexpected) → fail-OPEN so synthesis
// proceeds exactly as it does today with no ledger. Only a GENUINE live peer
// claim returns { ok:false, conflict }.
// ──────────────────────────────────────────────────────────────────────────

export function tryClaimSynthesis({ galaxy, sourceHash, chatId, ttlMs, nowIso = new Date().toISOString(), storePath = STORE_PATH, lockPath = LOCK_PATH } = {}) {
  try {
    return withLock(() => {
      const store = readStore({ storePath });
      if (store.readOnly) return { ok: true, failOpen: true, reason: `store read-only: ${store.reason}` };
      const res = applyClaim(store, { galaxy, sourceHash, chatId, ttlMs }, nowIso);
      if (res.ok) writeStoreUnsafe(store, { storePath });
      return res; // { ok:true, refreshed } OR { ok:false, conflict } — the real mutex result
    }, { lockPath });
  } catch (e) {
    return { ok: true, failOpen: true, reason: `claim error: ${e.code || e.message}` };
  }
}

export function tryReleaseSynthesis({ galaxy, sourceHash, chatId, nowIso = new Date().toISOString(), storePath = STORE_PATH, lockPath = LOCK_PATH } = {}) {
  try {
    return withLock(() => {
      const store = readStore({ storePath });
      if (store.readOnly) return { ok: false, failOpen: true, reason: `store read-only: ${store.reason}` };
      const res = applyRelease(store, { galaxy, sourceHash, chatId });
      if (res.ok) writeStoreUnsafe(store, { storePath });
      return res;
    }, { lockPath });
  } catch (e) {
    return { ok: false, failOpen: true, reason: `release error: ${e.code || e.message}` };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CLI plumbing — every mutation runs inside withLock(...) so RMW is atomic
// ──────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--galaxy") args.galaxy = argv[++i];
    else if (a === "--hash") args.hash = argv[++i];
    else if (a === "--chatId" || a === "--chat-id") args.chatId = argv[++i];
    else if (a === "--ttl-ms") args.ttlMs = Number(argv[++i]);
    else if (a === "--json") args.json = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.log(`galaxy-synthesis-claim — fleet-distributed synthesis claim ledger (BRAIN-UPGRADE rank 6)

Usage:
  galaxy-synthesis-claim.mjs claim   --galaxy G --hash H --chatId C [--ttl-ms N]
  galaxy-synthesis-claim.mjs release --galaxy G --hash H --chatId C
  galaxy-synthesis-claim.mjs check   --galaxy G --hash H [--chatId C] [--json]
  galaxy-synthesis-claim.mjs list    [--json]
  galaxy-synthesis-claim.mjs sweep   [--json]

TTL defaults to 10min; floor 1min, ceiling 1h.
Store: ${STORE_PATH}  Lock: ${LOCK_PATH}
`);
}

function shortChatId(c) {
  if (typeof c !== "string") return "??";
  return c.startsWith("claude-") ? c.slice(7, 15) : c.slice(0, 8);
}

function handleReadCmd(cmd, store, args, nowIso) {
  if (cmd === "list") {
    sweepExpired(store, nowIso); // pure mutation, not persisted on the read path
    const rows = Object.values(store.claims);
    if (args.json) { console.log(JSON.stringify({ ok: true, count: rows.length, claims: rows }, null, 2)); return { exitCode: 0 }; }
    console.log(`galaxy-synth-claim: ${rows.length} active claim(s)`);
    for (const r of rows) {
      const ageMin = Math.round((Date.parse(nowIso) - Date.parse(r.claimedAt)) / 60000);
      const ttlMin = Math.round((Date.parse(r.expiresAt) - Date.parse(nowIso)) / 60000);
      console.log(`  ${r.galaxy}@${r.sourceHash} ${shortChatId(r.chatId)} age=${ageMin}m ttl=${ttlMin}m`);
    }
    return { exitCode: 0 };
  }
  if (cmd === "check") {
    const result = checkClaim(store, args.galaxy, args.hash, args.chatId, nowIso);
    if (args.json) console.log(JSON.stringify({ ok: true, result }, null, 2));
    else if (result.claimed) console.log(`CLAIMED by ${shortChatId(result.claim.chatId)} (byMe=${result.byMe}) until ${result.claim.expiresAt}`);
    else console.log(`NOT CLAIMED (wasExpired=${!!result.wasExpired})`);
    return { exitCode: 0 };
  }
  console.error("galaxy-synth-claim: unknown read command:", cmd);
  return { exitCode: 2 };
}

function handleMutationCmd(cmd, store, args, nowIso) {
  switch (cmd) {
    case "claim": {
      const result = applyClaim(store, { galaxy: args.galaxy, sourceHash: args.hash, chatId: args.chatId, ttlMs: args.ttlMs }, nowIso);
      if (!result.ok) { console.log(JSON.stringify({ ok: false, conflict: result.conflict })); return { exitCode: 1 }; }
      writeStoreUnsafe(store);
      console.log(JSON.stringify({ ok: true, claim: result.claim, refreshed: result.refreshed }));
      return { exitCode: 0 };
    }
    case "release": {
      const result = applyRelease(store, { galaxy: args.galaxy, sourceHash: args.hash, chatId: args.chatId });
      if (!result.ok) { console.log(JSON.stringify({ ok: false, reason: result.reason, existing: result.existing })); return { exitCode: result.reason === "wrong_owner" ? 1 : 0 }; }
      writeStoreUnsafe(store);
      console.log(JSON.stringify({ ok: true, releasedClaim: result.releasedClaim }));
      return { exitCode: 0 };
    }
    case "sweep": {
      const result = sweepExpired(store, nowIso);
      if (result.purged > 0) writeStoreUnsafe(store);
      if (args.json) console.log(JSON.stringify({ ok: true, purged: result.purged, detail: result.purgedDetail }, null, 2));
      else console.log(`galaxy-synth-claim: swept ${result.purged} expired claim(s)`);
      return { exitCode: 0 };
    }
    default:
      console.error("galaxy-synth-claim: unknown command:", cmd);
      usage();
      return { exitCode: 2 };
  }
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args._.length === 0) { usage(); process.exit(args.help ? 0 : 2); }
  const cmd = args._[0];
  const nowIso = new Date().toISOString();
  let result;
  try {
    if (cmd === "list" || cmd === "check") {
      const store = readStore();
      if (store.warnings) for (const w of store.warnings) console.error("galaxy-synth-claim: warning:", w);
      if (store.readOnly) console.error("galaxy-synth-claim: read-only:", store.reason);
      result = handleReadCmd(cmd, store, args, nowIso);
    } else {
      result = withLock(() => {
        const store = readStore();
        if (store.warnings) for (const w of store.warnings) console.error("galaxy-synth-claim: warning:", w);
        if (store.readOnly) { console.error("galaxy-synth-claim: READ-ONLY store — refusing to write:", store.reason); process.exit(3); }
        return handleMutationCmd(cmd, store, args, nowIso);
      });
    }
  } catch (e) {
    if (e.code === "LOCK_TIMEOUT") { console.error("galaxy-synth-claim: lock timeout:", e.message); process.exit(3); }
    if (e.code === "READ_ONLY") { console.error("galaxy-synth-claim:", e.message); process.exit(3); }
    console.error("galaxy-synth-claim: error:", e.message);
    process.exit(2);
  }
  if (result?.exitCode) process.exit(result.exitCode);
}

// Canonical isCli detection (the slot-task-claim form — proven on Windows):
// fileURLToPath(import.meta.url) === path.resolve(process.argv[1]), both absolute, no heuristics.
function isCli() {
  if (!process.argv[1]) return false;
  try { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); }
  catch { return false; }
}

if (isCli()) main(process.argv.slice(2));

export {
  STORE_PATH,
  LOCK_PATH,
  SCHEMA_VERSION,
  DEFAULT_TTL_MS,
  MIN_TTL_MS,
  MAX_TTL_MS,
  GALAXY_RE,
  HASH_RE,
  CHAT_ID_RE,
};
