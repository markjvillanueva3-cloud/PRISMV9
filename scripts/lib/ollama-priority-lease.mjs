#!/usr/bin/env node
/**
 * ollama-priority-lease.mjs -- RBA-INFERENCE-LANE-MS0 keystone (slot:india, 2026-06-29)
 *
 * The CROSS-PROCESS priority primitive for the reason-before-action (RBA) gate.
 *
 * Why a file-lease, not an in-process semaphore (R12, the corrected design):
 *   The RBA pre-action vote runs in the short-lived PreToolUse HOOK PROCESS, while
 *   the background Ollama traffic it competes with (MCP server :3100, embed/prewarm
 *   hooks, ask-ollama, vision OCR) runs in SEPARATE OS processes. An in-process JS
 *   semaphore can only order calls WITHIN one process -- it cannot hold back another
 *   process's /api/generate. The single shared filesystem CAN: RBA writes a short-TTL
 *   HIGH-priority lease before its vote; background (LOW-priority) Ollama callers
 *   check for an active higher-priority lease and yield briefly before their own
 *   generate, so the RBA vote does not queue behind a freshly-started background decode.
 *
 * HONEST LIMITS (R12 -- documented, not hidden):
 *   - A lease CANNOT preempt an already-running, non-interruptible GPU decode; it only
 *     stops NEW lower-priority work from piling on while a high-pri vote is pending.
 *   - It adds a cheap filesystem stat to the background Ollama path (the consumer side,
 *     wired separately -- that fleet-hot-path change is operator-gated).
 *
 * FAIL-OPEN BY CONSTRUCTION: every read/parse/stat error resolves to "no lease / do
 * not yield" so this primitive can NEVER block, hang, or starve -- it only ever
 * REDUCES the probability of an RBA timeout, never adds one.
 *
 * Default-dormant: nothing writes a lease unless RBA runs (itself default-off via
 * PRISM_RBA_GATE_ENABLE), and nothing yields unless a consumer opts in.
 *
 * Pure-export contract (for tests):
 *   parseLease(raw) -> lease|null
 *   isExpired(lease, nowMs) -> boolean
 *   shouldYield(lease, myPriority, nowMs) -> boolean
 *   PRIORITY  { RBA: 100, BACKGROUND: 0 }
 * Side-effecting (fail-soft):
 *   acquireLease({priority,ttlMs,holder}) -> { release() }
 *   activeLease({nowMs}) -> lease|null
 *   yieldDelayMs(lease, myPriority, nowMs) -> number   (how long a yielding caller should wait, capped)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const LEASE_PATH = process.env.PRISM_OLLAMA_LEASE_PATH
  || path.join(ROOT, "state", "shared", "ollama-priority-lease.json");

export const PRIORITY = Object.freeze({ RBA: 100, BACKGROUND: 0 });
const DEFAULT_TTL_MS = 3000;        // a vote should resolve well inside this; stale leases self-expire
const MAX_YIELD_MS = 1200;          // a background caller never waits longer than this (fail-open ceiling)

/** Parse a raw lease JSON string. Returns null on any malformed input (fail-open). */
export function parseLease(raw) {
  if (typeof raw !== "string" || raw.length === 0) return null;
  let obj;
  try { obj = JSON.parse(raw); } catch { return null; }
  if (!obj || typeof obj !== "object") return null;
  const priority = Number(obj.priority);
  const expiresAt = Number(obj.expiresAt);
  if (!Number.isFinite(priority) || !Number.isFinite(expiresAt)) return null;
  return { priority, expiresAt, holder: typeof obj.holder === "string" ? obj.holder : "unknown" };
}

/** A lease is expired (or invalid) when now is at/after its expiry. */
export function isExpired(lease, nowMs) {
  if (!lease || !Number.isFinite(lease.expiresAt)) return true;
  return nowMs >= lease.expiresAt;
}

/**
 * A caller at `myPriority` should yield iff a live lease exists with STRICTLY higher
 * priority. Equal/lower priority never yields. Expired/absent/garbage never yields.
 */
export function shouldYield(lease, myPriority, nowMs) {
  if (!lease) return false;
  if (isExpired(lease, nowMs)) return false;
  const mine = Number(myPriority);
  if (!Number.isFinite(mine)) return false; // unknown priority -> never block it (fail-open)
  return lease.priority > mine;
}

/** How long a yielding caller should wait: time until the lease expires, capped at MAX_YIELD_MS. */
export function yieldDelayMs(lease, myPriority, nowMs) {
  if (!shouldYield(lease, myPriority, nowMs)) return 0;
  const remaining = lease.expiresAt - nowMs;
  if (!Number.isFinite(remaining) || remaining <= 0) return 0;
  return Math.min(remaining, MAX_YIELD_MS);
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * CONSUMER side: a background Ollama caller awaits this before its /api/generate so it
 * yields to an in-flight higher-priority (RBA) vote. Cheap when idle: if no lease file
 * exists (the common case -- RBA is default-off) it returns instantly with zero parse.
 * FAIL-OPEN: any error -> returns immediately (never blocks a background call).
 * Disabled fleet-wide via PRISM_OLLAMA_LEASE_CONSUMER_DISABLE=1.
 * @returns {Promise<{yielded:boolean, waitedMs:number}>}
 */
export async function yieldToHigherPriority({
  myPriority = PRIORITY.BACKGROUND,
  leasePath = LEASE_PATH,
  nowMs = Date.now(),
  sleepFn = defaultSleep,
  env = process.env,
} = {}) {
  try {
    // Skip when disabled, OR when we ARE the RBA vote context (never yield to our own lease).
    if (env && (env.PRISM_OLLAMA_LEASE_CONSUMER_DISABLE === "1" || env.PRISM_RBA_IN_FLIGHT === "1")) return { yielded: false, waitedMs: 0 };
    if (!fs.existsSync(leasePath)) return { yielded: false, waitedMs: 0 }; // hot-path fast exit
    const lease = activeLease({ nowMs, leasePath });
    const delay = yieldDelayMs(lease, myPriority, nowMs);
    if (delay <= 0) return { yielded: false, waitedMs: 0 };
    await sleepFn(delay);
    return { yielded: true, waitedMs: delay };
  } catch {
    return { yielded: false, waitedMs: 0 }; // fail-open: a lease subsystem fault never stalls the fleet
  }
}

/** Read the current active lease (null if absent/expired/unreadable). Fail-soft. */
export function activeLease({ nowMs = Date.now(), leasePath = LEASE_PATH } = {}) {
  let raw;
  try { raw = fs.readFileSync(leasePath, "utf8"); }
  catch { return null; } // no file / unreadable -> no lease
  const lease = parseLease(raw);
  return lease && !isExpired(lease, nowMs) ? lease : null;
}

/**
 * Acquire a priority lease (writes the lease file atomically). Returns a handle with
 * release(). NEVER throws -- a write failure yields a no-op handle so the caller
 * (e.g. the RBA vote) proceeds regardless.
 */
export function acquireLease({ priority = PRIORITY.RBA, ttlMs = DEFAULT_TTL_MS, holder = "rba", nowMs = Date.now(), leasePath = LEASE_PATH } = {}) {
  const lease = { priority: Number(priority), expiresAt: nowMs + Math.max(1, Number(ttlMs) || DEFAULT_TTL_MS), holder: String(holder) };
  let wrote = false;
  try {
    fs.mkdirSync(path.dirname(leasePath), { recursive: true });
    const tmp = `${leasePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(lease));
    fs.renameSync(tmp, leasePath);
    wrote = true;
  } catch { /* fail-open: no lease written, RBA proceeds without priority */ }
  return {
    lease,
    wrote,
    release() {
      if (!wrote) return;
      // Only delete if it's still OUR lease (don't clobber a newer holder's lease).
      try {
        const cur = parseLease(fs.readFileSync(leasePath, "utf8"));
        if (cur && cur.holder === lease.holder && cur.expiresAt === lease.expiresAt) {
          fs.rmSync(leasePath, { force: true });
        }
      } catch { /* best-effort -- a stale lease self-expires via TTL anyway */ }
    },
  };
}
