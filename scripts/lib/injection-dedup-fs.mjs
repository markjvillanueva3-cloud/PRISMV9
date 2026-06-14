// scripts/lib/injection-dedup-fs.mjs
// -----------------------------------
// U-ALPHA-INJECT-DEDUP-FS (2026-06-11, slot:alpha) -- FS wrapper around the PURE injection-dedup
// lib so a UserPromptSubmit hook can adopt per-session dedup in ONE call instead of copy-pasting the
// 22-line sidecar dance (currently duplicated across 8 adopters). The pure lib stays FS-free + unit-
// testable; this wrapper owns the sidecar I/O exactly as the canonical adopter (slot-domain-awareness-
// inject) does -- same sidecar path, same 5-min TTL, same fail-soft contract.
//
// Operator directive 2026-06-11: "look for inefficiencies that is causing us to waste tokens every
// turn, fix for the entire fleet." Three heavy injectors (local-compute-intent 1351B, obsidian-vault-
// precheck 835B, ai-synergy-awareness 467B = 2653 B/turn) re-emit byte-identical blocks every prompt
// with NO dedup. Routing them through dedupeOrMarker() emits the full block once per TTL window and a
// 1-line marker otherwise -- fleet-wide, every slot.
//
// Contract:
//   dedupeOrMarker(block, { sessionId, hookName, root, ttlMs?, now?, fsImpl? }) -> string
//     - returns `block` (and records the emit) on first-emit / TTL-expiry / any fail-soft path
//     - returns a 1-line `formatDedupedMarker` string on a dedup-hit
//     - PRISM_INJECTION_DEDUP_DISABLE=1 -> always returns block (no sidecar touch)
//   Fail-soft: any sidecar read/write error, missing sessionId, or empty block -> returns block
//   unchanged (exactly the pre-dedup behavior -- zero regression).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired, DEFAULT_TTL_MS } from "./injection-dedup.mjs";
import { stripLoneSurrogates } from "./safe-truncate.mjs";

// Canonical shared sidecar (same file the 8 existing adopters use) + canonical 5-min TTL.
export const DEDUP_SIDECAR_REL = "state/shared/dashboards/injection-dedup-cache.json";
export const CANONICAL_TTL_MS = 5 * 60_000;

/**
 * Decide whether to emit the full block or a 1-line dedup marker, persisting state to the shared
 * sidecar. `fsImpl` lets tests inject an in-memory fs (defaults to node:fs). Pure-ish: all side
 * effects go through fsImpl + the injectable `now`.
 */
export function dedupeOrMarker(block, opts = {}) {
  const {
    sessionId,
    hookName,
    root = process.cwd(),
    ttlMs = CANONICAL_TTL_MS,
    now = Date.now(),
    env = process.env,
    fsImpl = { readFileSync, writeFileSync, mkdirSync },
  } = opts;

  if (typeof block !== "string" || block.length === 0) return block;
  // Surrogate-safe chokepoint (U-FLEET-SURROGATE-CHOKEPOINT, slot:alpha 2026-06-11): strip any lone
  // UTF-16 surrogate BEFORE the block is emitted to additionalContext. A lone high surrogate (left by
  // an upstream naive str.slice(0,N) cutting mid-emoji) makes the Anthropic API 400 the whole request
  // body ("no low surrogate in string") -- it survives JSON.stringify, so the half must be REMOVED,
  // not escaped. Sanitizing here covers all 28 hooks routing through dedupeOrMarker in one place, and
  // hashing the cleaned block keeps the dedup key stable. No-op on clean content (toWellFormed identity).
  block = stripLoneSurrogates(block);
  if (env.PRISM_INJECTION_DEDUP_DISABLE === "1") return block;
  const sid8 = String(sessionId || "").slice(0, 8);
  if (!sid8 || !hookName) return block;            // no key -> emit (pre-dedup behavior)

  const contentHash = hashBlock(block);
  if (!contentHash) return block;
  const hookTag = `${hookName}:${sid8}`;
  const sidecar = join(root, DEDUP_SIDECAR_REL);

  let cache;
  try { cache = JSON.parse(fsImpl.readFileSync(sidecar, "utf8")); } catch { cache = {}; }
  cache = pruneExpired(cache, now, ttlMs);
  const decision = shouldEmit(cache, hookTag, contentHash, now, ttlMs);
  if (!decision.emit) return formatDedupedMarker(hookTag);

  // Emit: record the new state (fail-soft -- a write error never blocks the emit).
  try {
    const newCache = recordEmit(cache, hookTag, contentHash, now);
    fsImpl.mkdirSync(dirname(sidecar), { recursive: true });
    fsImpl.writeFileSync(sidecar, JSON.stringify(newCache), "utf8");
  } catch { /* fail-soft */ }
  return block;
}

export { DEFAULT_TTL_MS };
