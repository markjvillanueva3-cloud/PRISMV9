#!/usr/bin/env node
// commit-coordinator.mjs — auto commit-lane mutex for the multi-chat fleet.
// COMMIT-COORD-MS0 / U-CC-COORDINATOR (2026-05-20, slot:foxtrot).
//
// PROBLEM: up to 26 chats share the H:/prism git tree. Concurrent `git commit`
// contends on .git/index.lock; worse, a peer's `git add -A` window can absorb
// another chat's staged files into the wrong commit (misattribution — see
// reference_h8_misattribution_2026_05_20). git's index.lock serializes the
// WRITE but does nothing to ORDER chats fairly or prevent the add-window race.
//
// THIS: a cooperative commit-lane mutex. A chat ACQUIRES the lane before
// committing; peers queue. When the holder RELEASES, the next holder is picked
// by a deterministic rock-paper-scissors tournament (rps-core.mjs) — fair,
// reproducible, needs no interactive "throw". Release broadcasts "lane open"
// to the chat bus (AGENT_CHAT.jsonl) so waiters proceed.
//
// FAIL-OPEN BY DESIGN: this is an OPTIMIZATION, not a correctness gate. git's
// own index.lock remains the real mutex. Every failure mode here (corrupt
// store, lock timeout, schema drift, missing files) degrades to "grant" so a
// coordinator fault can NEVER wedge the fleet's ability to commit.
//
// STORE: state/shared/commit-coordination.json — lockfile-guarded atomic RMW
// (the proven chat-slots.mjs / slot-task-claim.mjs pattern; better-sqlite3
// does not resolve from .claude/helpers).
//
// CLI: acquire | release | heartbeat | status | reap   (see usage())
// Exit: 0 granted/ok · 10 queued (not granted) · 2 bad args · 3 storage error

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rpsTournament } from "./lib/rps-core.mjs";

// Paths are env-overridable so tests can run against an isolated store
// without touching the live fleet coordination state.
const STORE_PATH = process.env.PRISM_COMMIT_COORD_STORE || "H:/prism/state/shared/commit-coordination.json";
const LOCK_PATH = STORE_PATH + ".lock";
const CHAT_BUS_PATH = process.env.PRISM_COMMIT_COORD_BUS || "H:/prism/state/shared/AGENT_CHAT.jsonl";
const SCHEMA_VERSION = "1.0.0";

// Lease windows. A holder must heartbeat or it is reaped (crash recovery).
// HOLDER_STALE_MS is held <= the acquire hook's wait budget (HOOK_BUDGET_MS,
// ~50s) so a crashed holder is reaped WITHIN a live waiter's poll loop instead
// of wedging the lane for minutes. A commit slower than 45s is rare; if a
// holder is reaped mid-commit, git's own index.lock still serialises the write
// (no corruption — just a missed optimisation). See COMMIT-COORD-MS0 review.
const HOLDER_STALE_MS = 45 * 1000; // active holder lease
const PROMOTED_GRACE_MS = 30 * 1000; // an RPS-promoted holder that has not yet re-acquired
const QUEUE_STALE_MS = 180 * 1000; // a queued waiter that stopped polling
const HISTORY_MAX = 30;

// Lock layer — advisory `.lock` file, stale-detected.
const LOCK_RETRIES = 60; // 60 × 50ms = 3s max wait
const LOCK_RETRY_MS = 50;
const STALE_LOCK_MS = 15 * 1000;
const RENAME_RETRIES = 5;

const CHAT_ID_RE = /^[A-Za-z][A-Za-z0-9_-]{3,79}$/;

const SLEEP_BUF = new Int32Array(new SharedArrayBuffer(4));
function syncSleep(ms) {
  Atomics.wait(SLEEP_BUF, 0, 0, Math.max(0, Math.floor(ms)));
}

// ──────────────────────────────────────────────────────────────────────────
// args
// ──────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 3; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// lock
// ──────────────────────────────────────────────────────────────────────────
function acquireLock() {
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt += 1) {
    try {
      const fd = fs.openSync(LOCK_PATH, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      fs.closeSync(fd);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") return false; // fail-open: cannot lock → caller grants
      try {
        const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
        if (age > STALE_LOCK_MS) {
          fs.rmSync(LOCK_PATH, { force: true });
          continue;
        }
      } catch {
        /* lock vanished between stat and now — retry */
      }
      syncSleep(LOCK_RETRY_MS);
    }
  }
  return false;
}

function releaseLock() {
  try {
    fs.rmSync(LOCK_PATH, { force: true });
  } catch {
    /* best-effort */
  }
}

// ──────────────────────────────────────────────────────────────────────────
// store
// ──────────────────────────────────────────────────────────────────────────
function emptyStore() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    holder: null,
    queue: [],
    releaseSeq: 0,
    history: [],
  };
}

/** Load the store. Corrupt → preserve as .corrupt-<iso> + reset (fail-soft).
 *  Newer schema → return {readOnly:true} so callers fail-open without clobber. */
function loadStore() {
  let raw;
  try {
    raw = fs.readFileSync(STORE_PATH, "utf8");
  } catch {
    return { store: emptyStore(), readOnly: false };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // One retry — a transient mid-write read or a Windows AV scan can yield a
    // partial buffer even though saveStore renames atomically. Only quarantine
    // the store if it is STILL unparseable after a brief re-read.
    try {
      syncSleep(60);
      parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    } catch {
      try {
        fs.renameSync(STORE_PATH, `${STORE_PATH}.corrupt-${Date.now()}`);
      } catch {
        /* ignore */
      }
      return { store: emptyStore(), readOnly: false };
    }
  }
  if (typeof parsed.schemaVersion === "string" && parsed.schemaVersion > SCHEMA_VERSION) {
    return { store: parsed, readOnly: true };
  }
  // Defensive normalisation — never trust shape.
  const store = emptyStore();
  store.holder = parsed.holder && typeof parsed.holder === "object" ? parsed.holder : null;
  store.queue = Array.isArray(parsed.queue) ? parsed.queue.filter((q) => q && CHAT_ID_RE.test(q.chatId || "")) : [];
  store.releaseSeq = Number.isFinite(parsed.releaseSeq) ? parsed.releaseSeq : 0;
  store.history = Array.isArray(parsed.history) ? parsed.history.slice(0, HISTORY_MAX) : [];
  if (store.holder && !CHAT_ID_RE.test(store.holder.chatId || "")) store.holder = null;
  return { store, readOnly: false };
}

function saveStore(store) {
  store.schemaVersion = SCHEMA_VERSION;
  store.updatedAt = new Date().toISOString();
  const tmp = `${STORE_PATH}.tmp-${process.pid}`;
  const body = `${JSON.stringify(store, null, 2)}\n`;
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(tmp, body, "utf8");
  for (let attempt = 0; attempt < RENAME_RETRIES; attempt += 1) {
    try {
      fs.renameSync(tmp, STORE_PATH);
      return true;
    } catch {
      syncSleep(40);
    }
  }
  try {
    fs.rmSync(tmp, { force: true });
  } catch {
    /* ignore */
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// staleness
// ──────────────────────────────────────────────────────────────────────────
function ageMs(iso) {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? Date.now() - t : Infinity;
}

function holderStaleMs(holder) {
  // A promoted holder that has not re-acquired ("active") yet gets a shorter
  // grace window so a vanished RPS winner does not wedge the lane for 2 min.
  return holder && holder.promoted && !holder.active ? PROMOTED_GRACE_MS : HOLDER_STALE_MS;
}

/** Drop a stale holder + stale queue waiters in place. Returns reaped info. */
function reapStale(store) {
  const reaped = { holder: null, queue: [] };
  if (store.holder && ageMs(store.holder.heartbeat) > holderStaleMs(store.holder)) {
    reaped.holder = store.holder;
    store.holder = null;
  }
  const fresh = [];
  for (const q of store.queue) {
    if (ageMs(q.heartbeat) > QUEUE_STALE_MS) {
      reaped.queue.push(q);
    } else {
      fresh.push(q);
    }
  }
  store.queue = fresh;
  return reaped;
}

// ──────────────────────────────────────────────────────────────────────────
// chat-bus broadcast — best-effort, never throws
// ──────────────────────────────────────────────────────────────────────────
function broadcast(fields) {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      from: "commit-coordinator",
      kind: "commit-lane",
      level: "info",
      ...fields,
    });
    fs.appendFileSync(CHAT_BUS_PATH, line + "\n", "utf8");
  } catch {
    /* the chat bus is advisory — a write failure must not break coordination */
  }
}

// ──────────────────────────────────────────────────────────────────────────
// commands
// ──────────────────────────────────────────────────────────────────────────
function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function queuePos(store, chatId) {
  const idx = store.queue.findIndex((q) => q.chatId === chatId);
  return idx < 0 ? -1 : idx + 1;
}

function cmdAcquire(chatId, slot, reason) {
  const locked = acquireLock();
  if (!locked) {
    // fail-open — cannot coordinate, let git's own lock serialise.
    return { granted: true, failOpen: "lock-timeout", holder: null };
  }
  try {
    const { store, readOnly } = loadStore();
    if (readOnly) {
      return { granted: true, failOpen: "schema-newer", holder: store.holder || null };
    }
    const reaped = reapStale(store);
    const now = new Date().toISOString();

    let granted = false;
    if (store.holder && store.holder.chatId === chatId) {
      // re-acquire: I already hold it — refresh + mark active.
      store.holder.heartbeat = now;
      store.holder.active = true;
      store.queue = store.queue.filter((q) => q.chatId !== chatId);
      granted = true;
    } else if (!store.holder) {
      store.holder = {
        chatId,
        slot: slot || null,
        since: now,
        heartbeat: now,
        reason: reason || null,
        promoted: false,
        active: true,
      };
      store.queue = store.queue.filter((q) => q.chatId !== chatId);
      granted = true;
    } else {
      // someone else holds the lane — join / refresh my queue entry.
      const existing = store.queue.find((q) => q.chatId === chatId);
      if (existing) {
        existing.heartbeat = now;
        existing.slot = slot || existing.slot || null;
      } else {
        store.queue.push({ chatId, slot: slot || null, joinedAt: now, heartbeat: now });
      }
    }
    const saved = saveStore(store);

    if (reaped.holder) {
      broadcast({
        event: "reap",
        chatId: reaped.holder.chatId,
        message: `commit lane reaped — holder ${reaped.holder.chatId} went stale (no heartbeat ${Math.round(
          ageMs(reaped.holder.heartbeat) / 1000,
        )}s)`,
      });
    }
    return {
      granted,
      // A failed save means the on-disk state may not reflect this grant —
      // surface it so the caller treats the result as advisory (fail-open).
      ...(saved ? {} : { failOpen: "save-failed" }),
      holder: store.holder,
      queuePos: granted ? 0 : queuePos(store, chatId),
      queueLen: store.queue.length,
    };
  } finally {
    releaseLock();
  }
}

function cmdRelease(chatId) {
  const locked = acquireLock();
  if (!locked) {
    return { released: true, failOpen: "lock-timeout" };
  }
  try {
    const { store, readOnly } = loadStore();
    if (readOnly) {
      return { released: true, failOpen: "schema-newer" };
    }
    reapStale(store);

    const wasHolder = store.holder && store.holder.chatId === chatId;
    if (!wasHolder) {
      // defensive: a non-holder release just drops any queue entry.
      store.queue = store.queue.filter((q) => q.chatId !== chatId);
      saveStore(store);
      return { released: false, reason: "not-holder" };
    }

    store.holder = null;
    store.releaseSeq = (store.releaseSeq || 0) + 1;

    let nextHolder = null;
    let rps = null;
    if (store.queue.length > 0) {
      const seed = `commit-lane|${dayStamp()}|${store.releaseSeq}`;
      const ids = store.queue.map((q) => q.chatId);
      const tour = rpsTournament(ids, seed);
      rps = { seed, ranked: tour.ranked, wins: tour.wins };
      // reorder queue by RPS rank
      const byId = new Map(store.queue.map((q) => [q.chatId, q]));
      store.queue = tour.ranked.map((id) => byId.get(id)).filter(Boolean);
      // promote the RPS winner directly so the post-release acquire is not a
      // fresh timing race — only the winner sees holder===itself.
      const winner = store.queue.shift();
      nextHolder = winner.chatId;
      const now = new Date().toISOString();
      store.holder = {
        chatId: winner.chatId,
        slot: winner.slot || null,
        since: now,
        heartbeat: now,
        reason: "rps-promoted",
        promoted: true,
        active: false,
      };
    }

    store.history.unshift({
      ts: new Date().toISOString(),
      action: "release",
      releasedBy: chatId,
      nextHolder,
      rps: rps ? { ranked: rps.ranked, seed: rps.seed } : null,
    });
    store.history = store.history.slice(0, HISTORY_MAX);
    const saved = saveStore(store);

    broadcast({
      event: "release",
      chatId,
      nextHolder,
      message: nextHolder
        ? `commit lane released by ${chatId} — next: ${nextHolder} (RPS winner of ${rps.ranked.length}: ${rps.ranked.join(" > ")})`
        : `commit lane released by ${chatId} — OPEN (no waiters)`,
    });
    return { released: true, ...(saved ? {} : { failOpen: "save-failed" }), nextHolder, rps };
  } finally {
    releaseLock();
  }
}

function cmdHeartbeat(chatId) {
  const locked = acquireLock();
  if (!locked) return { ok: true, failOpen: "lock-timeout" };
  try {
    const { store, readOnly } = loadStore();
    if (readOnly) return { ok: true, failOpen: "schema-newer" };
    reapStale(store);
    const now = new Date().toISOString();
    if (store.holder && store.holder.chatId === chatId) {
      store.holder.heartbeat = now;
      store.holder.active = true;
    } else {
      const q = store.queue.find((e) => e.chatId === chatId);
      if (q) q.heartbeat = now;
    }
    saveStore(store);
    return { ok: true, isHolder: !!(store.holder && store.holder.chatId === chatId) };
  } finally {
    releaseLock();
  }
}

function cmdStatus() {
  const { store, readOnly } = loadStore();
  const holder = store.holder
    ? {
        chatId: store.holder.chatId,
        slot: store.holder.slot,
        reason: store.holder.reason,
        promoted: !!store.holder.promoted,
        active: !!store.holder.active,
        heldForMs: ageMs(store.holder.since),
        heartbeatAgeMs: ageMs(store.holder.heartbeat),
        stale: ageMs(store.holder.heartbeat) > holderStaleMs(store.holder),
      }
    : null;
  return {
    ok: true,
    readOnly,
    schemaVersion: store.schemaVersion,
    holder,
    queue: store.queue.map((q, i) => ({
      pos: i + 1,
      chatId: q.chatId,
      slot: q.slot,
      waitingMs: ageMs(q.joinedAt),
    })),
    queueLen: store.queue.length,
    releaseSeq: store.releaseSeq,
    history: store.history.slice(0, 5),
  };
}

function cmdReap() {
  const locked = acquireLock();
  if (!locked) return { ok: true, failOpen: "lock-timeout" };
  try {
    const { store, readOnly } = loadStore();
    if (readOnly) return { ok: true, failOpen: "schema-newer" };
    const reaped = reapStale(store);
    saveStore(store);
    if (reaped.holder) {
      broadcast({
        event: "reap",
        chatId: reaped.holder.chatId,
        message: `commit lane reaped — stale holder ${reaped.holder.chatId}`,
      });
    }
    return {
      ok: true,
      reapedHolder: reaped.holder ? reaped.holder.chatId : null,
      reapedQueue: reaped.queue.map((q) => q.chatId),
    };
  } finally {
    releaseLock();
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────────────────
function usage() {
  return [
    "commit-coordinator.mjs — auto commit-lane mutex (COMMIT-COORD-MS0)",
    "",
    "  acquire   --chatId <id> [--slot <s>] [--reason <r>]   try to take the lane",
    "  release   --chatId <id>                               release the lane (RPS-promote next)",
    "  heartbeat --chatId <id>                               refresh holder/queue lease",
    "  status                                                show holder + queue",
    "  reap                                                  drop stale holder/waiters",
    "",
    "Exit: 0 granted/ok · 10 queued · 2 bad args · 3 storage error",
  ].join("\n");
}

function main() {
  const cmd = process.argv[2];
  const args = parseArgs(process.argv);

  if (!cmd || cmd === "help" || cmd === "--help") {
    process.stdout.write(usage() + "\n");
    return 0;
  }
  if (cmd === "status") {
    process.stdout.write(JSON.stringify(cmdStatus()) + "\n");
    return 0;
  }
  if (cmd === "reap") {
    process.stdout.write(JSON.stringify(cmdReap()) + "\n");
    return 0;
  }

  const chatId = String(args.chatId || "").trim();
  if (!CHAT_ID_RE.test(chatId)) {
    process.stdout.write(JSON.stringify({ error: "invalid --chatId", chatId }) + "\n");
    return 2;
  }

  try {
    if (cmd === "acquire") {
      const res = cmdAcquire(chatId, args.slot ? String(args.slot) : null, args.reason ? String(args.reason) : null);
      process.stdout.write(JSON.stringify(res) + "\n");
      return res.granted ? 0 : 10;
    }
    if (cmd === "release") {
      process.stdout.write(JSON.stringify(cmdRelease(chatId)) + "\n");
      return 0;
    }
    if (cmd === "heartbeat") {
      process.stdout.write(JSON.stringify(cmdHeartbeat(chatId)) + "\n");
      return 0;
    }
  } catch (e) {
    // fail-open: any unexpected error grants the lane (git's lock is the real mutex).
    process.stdout.write(
      JSON.stringify({ granted: true, failOpen: "exception", error: String(e && e.message ? e.message : e) }) + "\n",
    );
    return 0;
  }

  process.stdout.write(JSON.stringify({ error: "unknown command", cmd }) + "\n");
  return 2;
}

const isCli = (() => {
  try {
    return import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href &&
      process.argv[1] &&
      path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isCli) {
  process.exitCode = main();
}

export { cmdAcquire, cmdRelease, cmdHeartbeat, cmdStatus, cmdReap, STORE_PATH, LOCK_PATH };
