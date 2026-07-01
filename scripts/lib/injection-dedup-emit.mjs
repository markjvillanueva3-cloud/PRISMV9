// scripts/lib/injection-dedup-emit.mjs
// -------------------------------------
// TOKEN-SAVINGS-EXPAND / HIGHVALUE-DISCOVERY #1 (2026-06-08, slot:alpha).
//
// One-call wrapper around injection-dedup.mjs so a per-prompt injector hook can
// adopt session-keyed block dedup in a single line instead of copy-pasting the
// ~15-line read→prune→shouldEmit→recordEmit→write gate (which had drifted into 3
// near-identical copies: slot-soul-inject, slot-domain-awareness-inject,
// psn-leg-state-inject). DRY: the gate logic is tested ONCE here.
//
// Contract: `dedupedContext(hookTag, block, sid, opts?) -> string`
//   - Returns `block` unchanged on first-emit / TTL-expiry / content-change,
//     and records the emit in the shared sidecar.
//   - Returns a 1-line dedup marker when the same (hookTag, sid, contentHash)
//     was emitted within ttlMs.
//   - FAIL-OPEN: dedup-disabled / missing sid / missing hookTag / any sidecar or
//     hashing error → returns `block` unchanged (exactly the pre-dedup behavior,
//     zero regression). Never throws.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneTag } from "./injection-dedup.mjs";

export const DEFAULT_DEDUP_SIDECAR = join(
  process.env.PRISM_ROOT || "H:/prism",
  "state", "shared", "dashboards", "injection-dedup-cache.json",
);
export const DEFAULT_DEDUP_TTL_MS = 5 * 60_000; // 5 min — most per-prompt blocks are stable across a /loop iter

/**
 * Session-keyed dedup for a per-prompt injector block.
 * @param {string} hookTag  stable per-hook tag, e.g. "foxtrot-mill-awareness" (NOT including the sid)
 * @param {string} block    the rendered additionalContext block
 * @param {string} sid      the session id (sliced to 8 chars internally for the cache key)
 * @param {{ttlMs?:number, sidecar?:string, now?:number}} [opts]  now is injectable for deterministic tests (defaults to Date.now())
 * @returns {string} the block (emit) or a 1-line dedup marker (suppress); never throws
 */
export function dedupedContext(hookTag, block, sid, opts = {}) {
  if (typeof block !== "string" || block.length === 0) return block;
  if (process.env.PRISM_INJECTION_DEDUP_DISABLE === "1") return block;
  const sid8 = String(sid || "").slice(0, 8);
  if (!sid8 || !hookTag) return block; // no session key → cannot dedup safely; emit
  const ttlMs = Number.isFinite(opts.ttlMs) ? opts.ttlMs : DEFAULT_DEDUP_TTL_MS;
  const sidecar = opts.sidecar || DEFAULT_DEDUP_SIDECAR;
  try {
    const tag = `${hookTag}:${sid8}`;
    const contentHash = hashBlock(block);
    if (!contentHash) return block;
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    let cache;
    try { cache = JSON.parse(readFileSync(sidecar, "utf8")); } catch { cache = {}; }
    // pruneTag (NOT pruneExpired): prune ONLY this tag in the SHARED sidecar so a
    // short-TTL caller can't evict a still-live longer-TTL sibling's entry. This
    // wrapper backs ~9 domain-injector hooks, so the fix lands fleet-wide here.
    cache = pruneTag(cache, tag, now, ttlMs);
    const decision = shouldEmit(cache, tag, contentHash, now, ttlMs);
    if (!decision.emit) return formatDedupedMarker(tag);
    try {
      const next = recordEmit(cache, tag, contentHash, now);
      mkdirSync(dirname(sidecar), { recursive: true });
      writeFileSync(sidecar, JSON.stringify(next), "utf8");
    } catch { /* sidecar write fail-soft — emit still proceeds */ }
    return block;
  } catch {
    return block; // fail-open
  }
}
