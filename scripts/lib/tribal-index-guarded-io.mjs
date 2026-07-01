#!/usr/bin/env node
/**
 * tribal-index-guarded-io.mjs -- the ONE manifest-aware, shard-safe,
 * clobber-guarded read/write pair for state/shared/tribal-embed-index.json,
 * shared by every tribal-index embedder + maintenance writer (embed-wiki /
 * embed-all-wiki / embed-engines / embed-knowledge-store / embed-cited-tips /
 * prune-stale / retag-backend-dev) so none re-rolls a monolith-only `JSON.parse(readFileSync)`
 * + `writeFileSync`. (The canonical .claude/scripts/tribal-embed-index.mjs
 * carries the equivalent inline guard from commit 8bf1873577.) The recurring
 * clobber vector this closes destroyed the brain 4x: 2026-05-22, 2026-06-08 x2,
 * 2026-06-10.
 *
 * ## Root cause it closes (U-TRIBAL-SIBLING-WRITER-SHARD-SAFE 2026-06-10)
 *
 * The 3 sibling embedders (engines / knowledge-store / cited-tips) each did
 * `fs.existsSync(INDEX_PATH)` (the monolith .json ONLY) + raw
 * `JSON.parse(fs.readFileSync(INDEX_PATH,"utf8"))` + `writeFileSync`. Once
 * `write-tribal-index.mjs` shards the index (>480 MiB it writes a
 * `.manifest.json` + shard files and REMOVES the monolith .json), a
 * monolith-only reader returns an EMPTY base -> the next splice+write drops the
 * entire brain, and a raw `writeFileSync` leaves the stale shards that then
 * shadow the write. cited-tips' loadIndex fail-OPENed to an empty shell on
 * `!existsSync` -- the 2026-06-08 clobber 1:1.
 * [[reference_tribal_shard_read_clobber_2026_06_10]]
 *
 * ## Contract (parameterized by indexPath -- the only difference from the
 *    in-place guard tribal-embed-index.mjs's readIndex/writeIndex carry,
 *    commit 8bf1873577; this is the shared, path-agnostic form so all writers
 *    use ONE implementation -- R7/R8, one pattern not four divergent copies)
 *
 * - `readTribalIndexGuarded(indexPath, {fs, emptyHead})`: an empty bootstrap
 *   base ONLY when NEITHER the monolith .json NOR the sibling .manifest.json
 *   exists (a genuine first run). Otherwise `loadTribalIndex` (manifest-aware +
 *   V8-cap-safe). FAILS LOUD (R12) when the index EXISTS but will not load --
 *   never the fail-open "return empty" that clobbered the brain, because the
 *   caller would splice onto empty and write a near-empty index over the real
 *   one.
 *
 * - `writeTribalIndexGuarded(idx, indexPath, {fs, allowShrink, prevCount})`:
 *   a shrink clobber-guard (refuse a >50% entry-count loss over a populated
 *   prior unless PRISM_TRIBAL_ALLOW_SHRINK=1 / opts.allowShrink), then
 *   `writeTribalIndex` (monolith below threshold, N shards + manifest above,
 *   retiring the superseded layout so no stale shard ever shadows the write).
 *   Pass `prevCount` (the count BEFORE this batch's splice) to skip the
 *   guard's own load -- a caller that already re-read the index inside a lock
 *   then avoids a second full read of a possibly-sharded ~500 MB index.
 *
 * Pure helpers are exported for the hermetic suite. No Ollama, no network.
 */
import fs from "node:fs";
import { loadTribalIndex } from "./load-tribal-index.mjs";
import { writeTribalIndex } from "./write-tribal-index.mjs";

/** `.../tribal-embed-index.json` -> `.../tribal-embed-index.manifest.json` */
export function manifestPathFor(indexPath) {
  return indexPath.replace(/\.json$/i, "") + ".manifest.json";
}

const DEFAULT_EMPTY_HEAD = {
  schemaVersion: "1.0.0",
  model: "nomic-embed-text:latest",
  dim: 768,
  generatedAt: null,
};

/**
 * Manifest-aware, V8-cap-safe read. Empty base ONLY when neither the monolith
 * nor the manifest exists; fail-loud when the index exists but will not load.
 *
 * @param {string} indexPath canonical tribal-embed-index.json path
 * @param {{fs?:object, emptyHead?:object}} [opts]
 * @returns {{entries:Array}} the index object (head + entries[])
 */
export function readTribalIndexGuarded(indexPath, opts = {}) {
  const fsImpl = opts.fs || fs;
  const manifestPath = manifestPathFor(indexPath);
  const monolith = fsImpl.existsSync(indexPath);
  const manifest = fsImpl.existsSync(manifestPath);
  if (!monolith && !manifest) {
    // genuine first run -- a fresh bootstrap base is correct here (and ONLY here)
    return { ...DEFAULT_EMPTY_HEAD, ...(opts.emptyHead || {}), entries: [] };
  }
  try {
    return loadTribalIndex(indexPath, fsImpl);
  } catch (e) {
    // The index EXISTS (monolith and/or shards) but failed to load. Returning a
    // fresh empty index here would let the caller splice onto it and CLOBBER the
    // real brain on the next write -- the exact fail-open that destroyed it on
    // 2026-06-08. Refuse (R12).
    throw new Error(
      `readTribalIndexGuarded: index EXISTS at ${indexPath} (monolith=${monolith} ` +
      `manifest=${manifest}) but failed to load (${String((e && e.message) || e)}) ` +
      `-- refusing to start fresh; a fail-open empty would clobber the brain on the next write.`,
    );
  }
}

/**
 * Shrink clobber-guard + shard-aware write. The guard refuses a >50% entry
 * loss over a populated (>100-entry) prior index unless explicitly allowed --
 * an intentional prune/rebuild sets PRISM_TRIBAL_ALLOW_SHRINK=1 or
 * opts.allowShrink. The actual write delegates to writeTribalIndex (monolith
 * or shards by size, retiring the superseded layout).
 *
 * @param {{entries:Array}} idx the index object to persist
 * @param {string} indexPath canonical tribal-embed-index.json path
 * @param {{fs?:object, allowShrink?:boolean, prevCount?:number}} [opts]
 * @returns {{sharded:boolean, shardCount:number, totalEntries:number, bytes:number}}
 */
export function writeTribalIndexGuarded(idx, indexPath, opts = {}) {
  const fsImpl = opts.fs || fs;
  const allowShrink = opts.allowShrink === true || process.env.PRISM_TRIBAL_ALLOW_SHRINK === "1";
  const manifestPath = manifestPathFor(indexPath);

  // prevCount: the count of the prior on-disk index. A caller that already
  // re-read the index (e.g. inside a write lock) passes it to avoid a second
  // full read of a possibly-sharded ~500 MB file. -1 = a prior exists but could
  // not be read => skip the ratio guard (a corrupt prior cannot bound a shrink).
  let prevCount;
  if (typeof opts.prevCount === "number") {
    prevCount = opts.prevCount;
  } else if (fsImpl.existsSync(indexPath) || fsImpl.existsSync(manifestPath)) {
    try { prevCount = (loadTribalIndex(indexPath, fsImpl).entries || []).length; }
    catch { prevCount = -1; }
  } else {
    prevCount = 0; // genuinely-absent prior
  }

  const newCount = (idx.entries || []).length;
  if (!allowShrink && prevCount > 100 && newCount < prevCount * 0.5) {
    throw new Error(
      `writeTribalIndexGuarded: refusing to write ${newCount} entries over a populated ` +
      `index of ${prevCount} (>50% loss) -- set PRISM_TRIBAL_ALLOW_SHRINK=1 (or pass ` +
      `allowShrink) for an intentional prune/rebuild.`,
    );
  }

  // Forward shardThresholdBytes when supplied (tuning + hermetic tests force a
  // small threshold to exercise the monolith<->shard transition); absent, the
  // writer uses its default 480 MiB / PRISM_TRIBAL_SHARD_THRESHOLD_BYTES.
  const writeOpts = { fs: fsImpl };
  if (typeof opts.shardThresholdBytes === "number") writeOpts.shardThresholdBytes = opts.shardThresholdBytes;
  return writeTribalIndex(idx, indexPath, writeOpts);
}

export default { readTribalIndexGuarded, writeTribalIndexGuarded, manifestPathFor };
