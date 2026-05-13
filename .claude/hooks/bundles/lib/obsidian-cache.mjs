// tier: T4
// obsidian-cache.mjs — content-addressed cache for stable hook results.
// Hooks like dedup-auto-invoke, error-learn, and master-index-search-gate
// produce text keyed by (file_path, content_hash) that rarely changes.
// Caching their result in H:/prism/knowledge/wiki/.hook-cache/ avoids
// re-running expensive lookups when the same edit pattern repeats.
//
// Cache file format: <sha1-of-key>.json
//   {
//     key: "<original-key-string>",
//     hookName: "<name>",
//     result: { additionalContext: "..." },
//     savedAt: <epoch-ms>,
//     ttlMs: <epoch-ms-after-which-stale>
//   }
//
// TTL defaults to 1h. Cache miss returns null; caller should compute and cache().

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const CACHE_ROOT = "H:/prism/knowledge/wiki/.hook-cache";
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_FILES = 5000;
const PRUNE_BATCH = 500;

function ensureCacheDir() {
  if (!existsSync(CACHE_ROOT)) {
    mkdirSync(CACHE_ROOT, { recursive: true });
  }
}

function keyToPath(key) {
  const sha = createHash("sha1").update(key).digest("hex");
  return join(CACHE_ROOT, `${sha}.json`);
}

/**
 * Lookup cached result by key. Returns null on miss or stale.
 * @param {string} key - cache key (e.g., "dedup:src/engines/Foo.ts:abc123")
 * @returns {object|null}
 */
export function get(key) {
  try {
    const path = keyToPath(key);
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    const entry = JSON.parse(raw);
    if (entry.ttlMs && Date.now() > entry.ttlMs) {
      try { unlinkSync(path); } catch { /* ignore */ }
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

/**
 * Store result in cache.
 * @param {string} key
 * @param {string} hookName
 * @param {object} result - typically {additionalContext: "..."}
 * @param {number} ttlMs - milliseconds from now until stale
 */
export function set(key, hookName, result, ttlMs = DEFAULT_TTL_MS) {
  try {
    ensureCacheDir();
    const path = keyToPath(key);
    const entry = {
      key,
      hookName,
      result,
      savedAt: Date.now(),
      ttlMs: Date.now() + ttlMs,
    };
    writeFileSync(path, JSON.stringify(entry, null, 2));
    maybePrune();
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Build cache key from a file edit.
 */
export function keyForEdit(hookName, filePath, content) {
  const contentHash = createHash("sha1").update(content || "").digest("hex").slice(0, 16);
  return `${hookName}:${filePath}:${contentHash}`;
}

/**
 * Periodically prune cache to MAX_CACHE_FILES (LRU by mtime).
 * Runs only when cache exceeds threshold to avoid every-call overhead.
 */
function maybePrune() {
  try {
    if (!existsSync(CACHE_ROOT)) return;
    const files = readdirSync(CACHE_ROOT).filter(f => f.endsWith(".json"));
    if (files.length <= MAX_CACHE_FILES) return;

    const entries = files.map(f => {
      const full = join(CACHE_ROOT, f);
      const s = statSync(full);
      return { path: full, mtime: s.mtimeMs };
    });
    entries.sort((a, b) => a.mtime - b.mtime); // oldest first

    const toDelete = entries.slice(0, PRUNE_BATCH);
    for (const e of toDelete) {
      try { unlinkSync(e.path); } catch { /* ignore */ }
    }
  } catch {
    // Prune failure is non-fatal
  }
}

/**
 * Cache stats for /hook-cache-stats observability.
 */
export function stats() {
  try {
    if (!existsSync(CACHE_ROOT)) return { count: 0, totalBytes: 0 };
    const files = readdirSync(CACHE_ROOT).filter(f => f.endsWith(".json"));
    let totalBytes = 0;
    for (const f of files) {
      try { totalBytes += statSync(join(CACHE_ROOT, f)).size; } catch { /* ignore */ }
    }
    return { count: files.length, totalBytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}
