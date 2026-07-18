// scripts/lib/injection-dedup.mjs
// ---------------------------------
// TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB (2026-05-23, slot:alpha)
//
// Generic per-session injection deduper. UserPromptSubmit hooks fire ~14-16
// context blocks per prompt; many are byte-identical to prior emissions in
// the same session (wiki precheck, master-index, memory vault, slot soul).
// A single goal-prereq-inject already proves the pattern works ("loop-context
// dedup — this block is unchanged since an earlier prompt this session").
// This lib generalizes that pattern so any hook can adopt it cheaply.
//
// Pure-function lib + tiny in-memory cache wrapper. Sidecar I/O is owned by
// the caller (so the lib stays unit-testable with no FS dependency).
//
// Contract:
//   - hashBlock(text) → short stable hex digest
//   - shouldEmit(cache, hookTag, contentHash, now, ttlMs) → { emit, reason, lastSeenAt }
//   - recordEmit(cache, hookTag, contentHash, now) → new cache (immutable update)
//   - formatDedupedMarker(hookTag) → 1-line `🔁 [<tag>] dedup …` text

import { createHash } from "node:crypto";

export const DEFAULT_TTL_MS = 60_000;        // 60s default — most fleet hook bursts <60s
export const MAX_HASH_INPUT_BYTES = 4096;     // cap input before hashing (cheap large-block guard)

/**
 * Pure: short stable hex hash of a normalized block.
 * Normalization: trim, collapse trailing whitespace, cap input bytes.
 * Empty/non-string → null (caller decides what to do).
 */
export function hashBlock(text) {
  if (typeof text !== "string" || text.length === 0) return null;
  const normalized = text.replace(/\s+$/g, "").slice(0, MAX_HASH_INPUT_BYTES);
  if (normalized.length === 0) return null;
  return createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 16);
}

/**
 * Pure: should this hookTag re-emit its block given prior cache state?
 * cache shape: { [hookTag]: { [hash]: { lastSeenAt: number } } }
 * ttlMs=0 disables dedup (always emit). Missing entry / expired → emit.
 */
export function shouldEmit(cache, hookTag, contentHash, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  if (!hookTag || !contentHash) return { emit: true, reason: "missing-key", lastSeenAt: null };
  if (ttlMs === 0) return { emit: true, reason: "ttl-disabled", lastSeenAt: null };
  const entry = cache && cache[hookTag] && cache[hookTag][contentHash];
  if (!entry) return { emit: true, reason: "first-emit", lastSeenAt: null };
  const age = now - (entry.lastSeenAt ?? 0);
  if (age >= ttlMs) return { emit: true, reason: `expired (${age}ms ≥ ${ttlMs}ms)`, lastSeenAt: entry.lastSeenAt };
  return { emit: false, reason: `dedup-hit (${age}ms < ${ttlMs}ms)`, lastSeenAt: entry.lastSeenAt };
}

/**
 * Pure: append a new emit record. Returns a NEW cache object.
 */
export function recordEmit(cache, hookTag, contentHash, now = Date.now()) {
  if (!hookTag || !contentHash) return cache;
  const base = cache && typeof cache === "object" ? cache : {};
  const tagBucket = { ...(base[hookTag] || {}) };
  tagBucket[contentHash] = { lastSeenAt: now };
  return { ...base, [hookTag]: tagBucket };
}

/**
 * Pure: 1-line skip marker the hook can emit instead of the full block.
 * Mirrors the existing goal-prereq-inject style for fleet consistency.
 */
export function formatDedupedMarker(hookTag) {
  return `🔁 [${hookTag}] dedup — block unchanged since prior prompt this session; not re-injected (token-save).`;
}

/**
 * Pure: drop expired entries across EVERY tag using a single ttlMs.
 *
 * TAG-AGNOSTIC -- a caller pruning the SHARED sidecar with its own ttlMs
 * evicts still-live entries belonging to OTHER hooks that use a longer TTL.
 * The shared `state/shared/dashboards/injection-dedup-cache.json` is written
 * back by ~10 evictor hooks with TTLs from 5min..24h, so a 5min hook calling
 * pruneExpired silently destroys a 24h sibling's fresh entries -> dedup MISS.
 * For the shared cache, prune ONLY your own tag with `pruneTag` (below).
 * pruneExpired stays exported for back-compat + single-tag-owner callers + the
 * lib self-tests. Returns a NEW cache object.
 */
export function pruneExpired(cache, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  if (!cache || typeof cache !== "object") return {};
  const out = {};
  for (const [tag, bucket] of Object.entries(cache)) {
    if (!bucket || typeof bucket !== "object") continue;
    const kept = {};
    for (const [hash, entry] of Object.entries(bucket)) {
      if (entry && (now - (entry.lastSeenAt ?? 0)) < ttlMs) kept[hash] = entry;
    }
    if (Object.keys(kept).length > 0) out[tag] = kept;
  }
  return out;
}

/**
 * Pure: drop expired entries for ONE hookTag only, leaving every OTHER tag's
 * bucket byte-identical. This is the SHARED-CACHE-SAFE prune: a hook with a
 * 5min TTL pruning its own tag can no longer evict a 24h sibling's live entry.
 *
 * Foreign tags are preserved by a shallow `{...cache}` spread -- safe because we
 * never mutate their buckets (we only replace OUR tag's bucket with a fresh
 * `kept`), and callers serialize the whole object straight to disk. As a
 * second-order win this also softens the sidecar's last-writer-wins race: a
 * late writer now carries every foreign tag through untouched instead of
 * clobbering it with a stale-pruned snapshot.
 *
 * Edge cases (handled from line 1):
 *   - cache null/non-object  -> {} (mirror pruneExpired)
 *   - falsy hookTag          -> cache unchanged (never touch foreign tags)
 *   - tag absent / non-object bucket -> cache unchanged (nothing of ours to prune)
 *   - tag's bucket fully expired -> tag key removed (mirror pruneExpired drop-empty)
 * Returns a NEW cache object (except the no-op falsy/absent paths, which return
 * the input ref -- matching recordEmit's missing-key convention).
 */
export function pruneTag(cache, hookTag, now = Date.now(), ttlMs = DEFAULT_TTL_MS) {
  if (!cache || typeof cache !== "object") return {};
  if (!hookTag) return cache;
  const bucket = cache[hookTag];
  if (!bucket || typeof bucket !== "object") return cache;
  const kept = {};
  for (const [hash, entry] of Object.entries(bucket)) {
    if (entry && (now - (entry.lastSeenAt ?? 0)) < ttlMs) kept[hash] = entry;
  }
  const out = { ...cache };
  if (Object.keys(kept).length > 0) out[hookTag] = kept;
  else delete out[hookTag];
  return out;
}
