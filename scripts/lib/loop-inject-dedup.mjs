#!/usr/bin/env node
/**
 * loop-inject-dedup.mjs — SESSION-SCOPED dedup for UserPromptSubmit context
 * injection. When a hook would inject the SAME content it already injected
 * earlier in this session (after volatile-token normalization), the hook emits
 * a compact pointer instead — the model already holds the block.
 *
 * FOXTROT-WORK 2026-05-18 — realizes the dedup gate recommended by
 * scripts/loop-inject-cost-audit.mjs (commit f88cc94705). It primarily recovers
 * /loop re-injection waste (a /loop re-injects byte-identical hook context
 * every iteration) but the mechanism is session-scoped, NOT loop-aware: any
 * second identical injection in the same session is deduped.
 *
 * DESIGN — fail-open and conservative:
 *   - Every error path returns {suppress:false}: a dedup fault can ONLY ever
 *     emit the FULL content, never wrongly hide it.
 *   - Suppress IFF the normalized digest is non-empty AND byte-equal to a prior
 *     fire for the same (session, hook) within the suppression window.
 *
 * LIMITATION (honest) — the window REDUCES but does not ELIMINATE the
 * /compact-eviction risk: a /compact within the window can evict the original
 * full block, leaving the pointer dangling. This is acceptable ONLY for
 * ADVISORY injected content (the consumer's panel is advisory; a hard Stop gate
 * is the real check) — never wire this into load-bearing context. Window is
 * env-tunable via PRISM_LOOP_INJECT_DEDUP_WINDOW_MS.
 *
 * Consumer: .claude/hooks/goal-prereq-inject.mjs (advisory /goal pre-flight
 * panel; kill-knob PRISM_LOOP_INJECT_DEDUP_DISABLE=1). NOTE: the per-session
 * cache file is shared across hooks via per-hook keys — safe today because
 * UserPromptSubmit hooks run sequentially; a future SECOND consumer firing
 * concurrently would need per-hook cache files or an O_EXCL lock.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_CACHE_DIR = path.join(
  (process.env.PRISM_ROOT || "H:/prism").replace(/\\/g, "/"),
  "state/shared/.loop-inject-cache",
);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;          // prune cache files older than 24h
const DEFAULT_SUPPRESS_WINDOW_MS = 10 * 60 * 1000; // suppress only if the prior fire is this recent — bounds /compact-eviction risk
const SESSION_KEY_MAX = 120;                       // filename-safe session key length cap

/** Suppression window in ms — env-overridable, falls back to the 10-min default. */
export function suppressWindowMs() {
  const v = Number(process.env.PRISM_LOOP_INJECT_DEDUP_WINDOW_MS);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_SUPPRESS_WINDOW_MS;
}

/* ---------------- pure helpers ---------------- */

/**
 * Strip volatile tokens (timestamps, ages, iteration counters, hashes) so two
 * substantively-identical injections compare equal.
 * KEEP-IN-SYNC with normalize() in scripts/loop-inject-cost-audit.mjs.
 */
export function normalize(t) {
  return String(t == null ? "" : t)
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "<TS>")
    .replace(/\d{4}-\d{2}-\d{2}/g, "<DATE>")
    .replace(/\b\d+(?:\.\d+)?(?:ms|hr|min|sec|[smhd])\b\s*(?:old|ago)?/gi, "<AGE>")
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<TIME>")
    .replace(/\biter(?:ation)?\s*#?\d+/gi, "iter<N>")
    .replace(/\b(?=[0-9a-f]{8,40}\b)[0-9a-f]*[a-f][0-9a-f]*\b/gi, "<HASH>")
    .replace(/\s+/g, " ")
    .trim();
}

/** sha1 digest of normalized content. Empty/whitespace content → "" (never dedups). */
export function digest(content) {
  const n = normalize(content);
  if (!n) return "";
  return crypto.createHash("sha1").update(n).digest("hex");
}

/**
 * Pure decision: should this injection be suppressed?
 * @param prev      prior record {digest, ts} for (session,hook), or undefined
 * @param curDigest digest of the current content
 * @param now       current epoch ms
 * @param maxAgeMs  suppression window — a prior fire older than this is treated as gone
 */
export function decideDedup(prev, curDigest, now, maxAgeMs) {
  if (!curDigest) return { suppress: false, reason: "empty-content" };
  if (!prev || !prev.digest) return { suppress: false, reason: "no-prior" };
  if (prev.digest !== curDigest) return { suppress: false, reason: "changed" };
  if ((now - (Number(prev.ts) || 0)) > maxAgeMs) return { suppress: false, reason: "stale-prior" };
  return { suppress: true, reason: "unchanged" };
}

/** Compact pointer emitted in place of a suppressed block. */
export function pointerFor(hookName) {
  return `🔁 [${hookName}] loop-context dedup — this block is unchanged since an `
    + `earlier prompt this session; not re-injected (token-save).`;
}

/** Filename-safe cache path for a session. */
export function cachePath(cacheDir, sessionId) {
  const safe = String(sessionId).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, SESSION_KEY_MAX);
  return path.join(cacheDir, `${safe}.json`);
}

/* ---------------- impure (cache I/O) ---------------- */

function readCache(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, "utf8"));
    if (j && typeof j === "object" && j.hooks && typeof j.hooks === "object") return j;
  } catch { /* absent / corrupt — start fresh */ }
  return { hooks: {} };
}

function pruneOldCaches(cacheDir, now) {
  try {
    for (const f of fs.readdirSync(cacheDir)) {
      if (!f.endsWith(".json")) continue;
      const p = path.join(cacheDir, f);
      try { if (now - fs.statSync(p).mtimeMs > CACHE_TTL_MS) fs.unlinkSync(p); }
      catch { /* skip one bad file */ }
    }
  } catch { /* cache dir absent — fine */ }
}

/**
 * Record this hook's content for the session and report whether it duplicates a
 * recent prior fire. FAIL-OPEN: every error path returns {suppress:false}.
 *
 * @param {{sessionId:string, hookName:string, content:string,
 *          cacheDir?:string, now?:number, maxAgeMs?:number}} args
 * @returns {{suppress:boolean, pointer:string, reason:string, digest:string}}
 */
export function recordAndCheck({ sessionId, hookName, content, cacheDir, now, maxAgeMs } = {}) {
  const ts = Number.isFinite(now) ? now : Date.now();
  const windowMs = Number.isFinite(maxAgeMs) ? maxAgeMs : suppressWindowMs();
  const out = { suppress: false, pointer: "", reason: "init", digest: "" };
  try {
    if (!sessionId || !hookName) { out.reason = "missing-key"; return out; }
    const dir = String(cacheDir || DEFAULT_CACHE_DIR).replace(/\\/g, "/");
    const curDigest = digest(content);
    out.digest = curDigest;
    if (!curDigest) { out.reason = "empty-content"; return out; }

    const file = cachePath(dir, sessionId);
    const cache = readCache(file);
    const prev = cache.hooks[hookName];
    const decision = decideDedup(prev, curDigest, ts, windowMs);
    out.reason = decision.reason;

    if (decision.suppress) {
      out.suppress = true;
      out.pointer = pointerFor(hookName);
      return out; // keep the original cache record — do NOT slide the window on a hit
    }

    // first-seen / changed / stale-prior: record fresh, persist atomically.
    cache.hooks[hookName] = { digest: curDigest, ts };
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(cache), "utf8");
    fs.renameSync(tmp, file);
    pruneOldCaches(dir, ts);
    return out;
  } catch {
    return { suppress: false, pointer: "", reason: "error-fail-open", digest: out.digest };
  }
}
