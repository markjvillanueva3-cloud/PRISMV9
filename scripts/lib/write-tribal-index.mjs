#!/usr/bin/env node
/**
 * write-tribal-index.mjs -- shard-aware, V8-cap-safe WRITER for
 * state/shared/tribal-embed-index.json. The companion to the cap-safe READER
 * `load-tribal-index.mjs`.
 *
 * ## The blocker this closes (the write half of the 2026-06-08 V8-cap problem)
 *
 * `load-tribal-index.mjs` made the index READABLE past V8's 512 MiB max string
 * length (`0x1fffffe8`) by buffer-walking the entries. But the WRITE side was
 * left unsolved (its own docstring: "the WRITE side ... needs sharding"):
 * `tribal-embed-index.mjs writeIndex()` does `fs.writeFileSync(tmp,
 * JSON.stringify(idx))`, and `JSON.stringify` of a >cap object THROWS -- so once
 * the index regrows past ~512 MiB (re-embedding the 32,630 unembedded wiki
 * files would get there), appends become impossible and the brain freezes.
 * [[reference_tribal_index_v8_string_cap_2026_06_08]]
 *
 * ## Strategy -- additive, back-compat, never one >cap string
 *
 * - **Below `shardThresholdBytes`** (default ~480 MiB, a safe margin under the
 *   512 MiB cap): write the single monolith `tribal-embed-index.json` exactly
 *   as before (`JSON.stringify(idx)` is cap-safe here) -> ZERO behavior change
 *   for the live ~160 MiB index. Any stale shard manifest is removed so the
 *   reader falls back to the monolith.
 * - **At/above threshold**: partition the entries into N shards each serialized
 *   under the threshold, STREAM each shard to disk per-entry (never building one
 *   >cap string), and write a small `tribal-embed-index.manifest.json` LAST. The
 *   manifest's presence is the atomic switch the reader keys off.
 *
 * Atomic: every shard + the manifest is written to a `.tmp` then renamed. The
 * manifest renames in LAST, so until it exists every reader still sees the
 * prior valid monolith (or prior manifest) -- never a half-written state.
 *
 * Pure helpers (`partitionEntriesByBytes`, `shardPathFor`, `manifestPathFor`)
 * are exported for the hermetic suite.
 */
import fs from "node:fs";
import path from "node:path";
import { V8_MAX_STRING } from "./load-tribal-index.mjs";

// Default shard threshold: 480 MiB. A ~33 MiB margin under V8's 512 MiB
// (536,870,888 B) string cap, so a monolith JSON.stringify and every individual
// shard parse stay comfortably below the limit. Overridable for tests + tuning.
export const DEFAULT_SHARD_THRESHOLD = 480 * 1024 * 1024; // 503,316,480

function shardThreshold(opts) {
  const fromOpt = opts && Number(opts.shardThresholdBytes);
  if (fromOpt && fromOpt > 0) return fromOpt;
  const fromEnv = Number(process.env.PRISM_TRIBAL_SHARD_THRESHOLD_BYTES);
  if (fromEnv && fromEnv > 0) return fromEnv;
  return DEFAULT_SHARD_THRESHOLD;
}

/** `.../tribal-embed-index.json` -> `.../tribal-embed-index.manifest.json` */
export function manifestPathFor(indexPath) {
  return indexPath.replace(/\.json$/i, "") + ".manifest.json";
}

/** shard i -> `.../tribal-embed-index.shard-007.json` (3-digit zero-pad) */
export function shardPathFor(indexPath, i) {
  return indexPath.replace(/\.json$/i, "") + `.shard-${String(i).padStart(3, "0")}.json`;
}

/**
 * Partition entries into groups whose per-shard serialized size stays under
 * `budget` bytes. Each entry is measured by its own `JSON.stringify` length
 * (cap-safe -- a single entry is a few KB) plus 1 for the joining comma; the
 * `{"entries":[]}` wrapper (~13 B) is the per-shard base. An entry larger than
 * the whole budget still gets placed (in a shard of its own) rather than
 * dropped -- entries are never lost to partitioning.
 */
export function partitionEntriesByBytes(entries, budget) {
  const WRAP = 13; // {"entries":[]} is 14 B; 13 intentionally offsets the +1
                   // comma over-count of the first entry (estimate stays a
                   // conservative over-count, so a shard never exceeds budget)
  const shards = [];
  let cur = [];
  let curBytes = WRAP;
  for (const e of entries) {
    const b = Buffer.byteLength(JSON.stringify(e), "utf8") + 1; // +comma
    if (cur.length > 0 && curBytes + b > budget) {
      shards.push(cur);
      cur = [];
      curBytes = WRAP;
    }
    cur.push(e);
    curBytes += b;
  }
  if (cur.length > 0) shards.push(cur);
  return shards;
}

/** Atomic write of one file: write `<path>.tmp` then rename over `<path>`. */
function atomicWrite(fsImpl, filePath, data) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  fsImpl.writeFileSync(tmp, data);
  fsImpl.renameSync(tmp, filePath);
}

/**
 * Stream a shard to disk per-entry so the full `{"entries":[...]}` text is never
 * held as one (possibly >cap) string. Written to `<path>.tmp` then renamed.
 * Returns the byte length written.
 */
function writeShardStreaming(fsImpl, shardPath, entries) {
  const tmp = `${shardPath}.${process.pid}.tmp`;
  const fd = fsImpl.openSync(tmp, "w");
  let bytes = 0;
  try {
    const w = (s) => { bytes += fsImpl.writeSync(fd, s); };
    w('{"entries":[');
    for (let i = 0; i < entries.length; i++) {
      w((i ? "," : "") + JSON.stringify(entries[i]));
    }
    w("]}");
  } finally {
    fsImpl.closeSync(fd);
  }
  fsImpl.renameSync(tmp, shardPath);
  return bytes;
}

/** Remove a sharded layout (manifest first so readers fall back, then shards). */
function removeShardLayout(fsImpl, indexPath) {
  const mp = manifestPathFor(indexPath);
  if (!fsImpl.existsSync(mp)) return;
  let manifest = null;
  try { manifest = JSON.parse(fsImpl.readFileSync(mp, "utf8")); } catch { /* ignore */ }
  fsImpl.rmSync(mp, { force: true }); // drop the switch first
  const dir = path.dirname(indexPath);
  for (const sh of (manifest && manifest.shards) || []) {
    // basename guard: a manifest is trusted (state/shared) but never honor a
    // `../` in a shard filename even from a hand-corrupted one (rmSync deletes).
    const sp = path.join(dir, path.basename(String(sh.file)));
    try { fsImpl.rmSync(sp, { force: true }); } catch { /* best-effort */ }
  }
}

/**
 * After a sharded write, retire artifacts the new layout supersedes: the stale
 * monolith (on a monolith->shard transition) and any prior shard files NOT in
 * the new manifest (on a sharded->sharded rewrite with a smaller shard count).
 * Run AFTER the manifest renames in, so readers are already on the new shards;
 * removing superseded files can never strand a reader. Best-effort + guarded so
 * a minimal mock fsImpl (no readdirSync) degrades to a no-op.
 */
function retireSupersededArtifacts(fsImpl, indexPath, keepShardNames) {
  // 1. stale monolith (superseded once the manifest exists)
  try {
    if (typeof fsImpl.existsSync === "function" && fsImpl.existsSync(indexPath)) {
      fsImpl.rmSync(indexPath, { force: true });
    }
  } catch { /* best-effort */ }
  // 2. orphaned shard files (a prior larger shard count)
  if (typeof fsImpl.readdirSync !== "function") return;
  const dir = path.dirname(indexPath);
  const base = path.basename(indexPath).replace(/\.json$/i, "");
  const shardRe = new RegExp(
    "^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.shard-\\d+\\.json$",
  );
  let names = [];
  try { names = fsImpl.readdirSync(dir); } catch { return; }
  for (const nm of names) {
    if (shardRe.test(nm) && !keepShardNames.has(nm)) {
      try { fsImpl.rmSync(path.join(dir, nm), { force: true }); } catch { /* best-effort */ }
    }
  }
}

/**
 * Estimate the serialized monolith size without ever building a >cap string:
 * head JSON + sum of per-entry JSON lengths + structural overhead.
 */
function estimateMonolithBytes(head, entries) {
  let total = Buffer.byteLength(JSON.stringify(head), "utf8") + 16; // head + ,"entries":[]
  for (const e of entries) total += Buffer.byteLength(JSON.stringify(e), "utf8") + 1;
  return total;
}

/**
 * Write the tribal index, choosing monolith vs sharded by size. Drop-in for the
 * monolith case (byte-identical to `fs.writeFileSync(p, JSON.stringify(idx))`).
 *
 * @param idx        `{ ...head, entries: [...] }`
 * @param indexPath  canonical `tribal-embed-index.json` path
 * @param opts       { fs, shardThresholdBytes }
 * @returns { sharded, shardCount, totalEntries, bytes }
 */
export function writeTribalIndex(idx, indexPath, opts = {}) {
  const fsImpl = opts.fs || fs;
  const threshold = shardThreshold(opts);
  const entries = idx.entries || [];
  const head = { ...idx };
  delete head.entries;

  fsImpl.mkdirSync(path.dirname(indexPath), { recursive: true });

  const est = estimateMonolithBytes(head, entries);

  // --- monolith path (default; live ~160 MiB index stays a single file) ------
  if (est < threshold && est < V8_MAX_STRING) {
    atomicWrite(fsImpl, indexPath, JSON.stringify(idx)); // cap-safe under threshold
    removeShardLayout(fsImpl, indexPath); // if we were previously sharded, retire it
    return { sharded: false, shardCount: 1, totalEntries: entries.length, bytes: est };
  }

  // --- sharded path (at/above threshold) -------------------------------------
  const groups = partitionEntriesByBytes(entries, threshold);
  const shards = [];
  for (let i = 0; i < groups.length; i++) {
    const sp = shardPathFor(indexPath, i);
    const bytes = writeShardStreaming(fsImpl, sp, groups[i]);
    shards.push({ file: path.basename(sp), count: groups[i].length, bytes });
  }
  const manifest = {
    ...head,
    sharded: true,
    shardCount: shards.length,
    totalEntries: entries.length,
    shards,
  };
  // Manifest LAST = the atomic switch. Before it lands, readers still see the
  // prior monolith/manifest; after, they read these shards.
  atomicWrite(fsImpl, manifestPathFor(indexPath), JSON.stringify(manifest));
  // Now that the switch is flipped, retire the superseded monolith (monolith->
  // shard) and any orphaned higher-index shards (sharded->fewer-shards rewrite).
  retireSupersededArtifacts(fsImpl, indexPath, new Set(shards.map((s) => s.file)));
  return { sharded: true, shardCount: shards.length, totalEntries: entries.length, bytes: est };
}

export default writeTribalIndex;
