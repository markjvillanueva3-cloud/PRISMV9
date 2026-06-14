#!/usr/bin/env node
/**
 * load-tribal-index.mjs — cap-safe loader for state/shared/tribal-embed-index.json
 *
 * ## The blocker this closes (2026-06-08, slot golf, gap #5 root cause)
 *
 * The tribal index grew past **V8's hard maximum string length**
 * (`0x1fffffe8` = 536,870,888 bytes ≈ 512 MiB). Every consumer that did
 * `JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))` — the live cosine reranker
 * `.claude/scripts/tribal-rerank.mjs:76` (PSN leg #5 / tribal injection), the
 * wiki/engine/tips embedders, and ~20 read-only audit scripts — now throws
 * `Cannot create a string longer than 0x1fffffe8 characters` BEFORE JSON.parse
 * ever runs. `--max-old-space-size` does NOT help: this is the string-length
 * limit, not the heap. The result was a SILENT fleet-wide regression — tribal
 * injection returned nothing in every chat with no error surfaced.
 *
 * A `Buffer` has no such cap (`buffer.constants.MAX_LENGTH` ≈ 2-4 GB), so the
 * fix is to read the file as a Buffer and parse the entries array
 * **incrementally** — never materializing the whole file as one string. The
 * head metadata (< 1 KB) and each individual entry (a few KB) are each well
 * under the cap, so they string-parse fine on their own.
 *
 * ## Contract
 *
 * `loadTribalIndex(indexPath, fsImpl=fs)` returns the same object shape as the
 * old `JSON.parse(readFileSync(...))` did: `{ ...headMeta, entries: [...] }`.
 *
 * - **Fast path** (buffer < cap): a single `JSON.parse(buf.toString("utf8"))`
 *   — byte-identical semantics to the prior code, so every existing under-cap
 *   index loads exactly as before (zero behavior change until the cap is hit).
 * - **Cap-exceeding path**: parse the small head, locate the `"entries":[`
 *   array, and walk it with a minimal JSON boundary scanner (string + escape +
 *   depth state) so braces/brackets/quotes inside string values (a `text`
 *   field of flattened markdown, a Windows `path` with `\\`) never confuse the
 *   per-entry boundaries. Each entry is `JSON.parse`d individually.
 *
 * Read-only — never mutates the index. The WRITE side (`JSON.stringify` of a
 * >cap object also throws) is a separate, harder problem that needs sharding;
 * this loader unblocks every READER, which is the live regression.
 *
 * Pure/streaming helpers (`findEntriesArrayStart`, `parseHead`,
 * `walkEntriesArray`, `parseEntriesArray`, `streamTribalEntries`) are exported
 * for the hermetic adversarial suite. (The WRITE side's >cap problem is now
 * solved separately by write-tribal-index.mjs's sharding; this loader +
 * streamTribalEntries are manifest-aware readers of either layout.)
 */
import fs from "node:fs";
import path from "node:path";

// V8 hard maximum string length. A file at/above this size cannot be read via
// fs.readFileSync(path, "utf8") — the string allocation throws before any parse.
export const V8_MAX_STRING = 0x1fffffe8; // 536,870,888

// byte constants
const C_LBRACE = 0x7b; // {
const C_RBRACE = 0x7d; // }
const C_LBRACK = 0x5b; // [
const C_RBRACK = 0x5d; // ]
const C_QUOTE = 0x22;  // "
const C_BSLASH = 0x5c; // \
const C_COMMA = 0x2c;  // ,
const C_COLON = 0x3a;  // :

function isWs(b) {
  return b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d;
}

/**
 * Byte offset of the first byte INSIDE the top-level `"entries":[` array, or
 * -1 if absent/malformed. Tolerates whitespace between the key, the colon, and
 * the opening bracket. (Assumes the literal `"entries"` does not appear inside
 * an earlier string value — true for the index's known head schema:
 * schemaVersion/model/dim/generatedAt/wikiEmbeddedAt/wikiEmbeddedCount.)
 */
export function findEntriesArrayStart(buf) {
  const k = buf.indexOf(Buffer.from('"entries"'));
  if (k < 0) return -1;
  let i = k + 9; // past the closing quote of "entries"
  // expect optional ws, a ':', optional ws, then '['
  while (i < buf.length && (isWs(buf[i]) || buf[i] === C_COLON)) i++;
  if (i >= buf.length || buf[i] !== C_LBRACK) return -1;
  return i + 1;
}

/**
 * Parse the head metadata (everything before `,"entries"`) by closing the
 * truncated object with `}`. The head is tiny (< 1 KB) so its string
 * allocation is cap-safe. Handles `"entries"` as the first key (head = {}).
 */
export function parseHead(buf) {
  if (buf.indexOf(Buffer.from('{"entries"')) === 0) return {};
  const k = buf.indexOf(Buffer.from(',"entries"'));
  if (k < 0) {
    // No comma before entries and not the first key → degenerate; return {}.
    return {};
  }
  return JSON.parse(buf.slice(0, k).toString("utf8") + "}");
}

/**
 * Walk the entries array beginning at byte `start` (first byte inside `[`),
 * invoking `onEntry(parsedObj)` for each entry and returning the entry COUNT
 * (not an array -- the caller decides whether to collect or stream). A minimal
 * JSON value-boundary scanner tracks string + escape + brace-depth state so a
 * `}` / `"` / `[` inside a string value never ends an object prematurely. Each
 * object's bytes are sliced and `JSON.parse`d individually (small -> cap-safe).
 * Shared substrate of parseEntriesArray (collect) and streamTribalEntries
 * (bounded top-K consumer); fail-loud on a torn/unterminated array.
 */
export function walkEntriesArray(buf, start, onEntry) {
  // Per-entry byte-walk: invoke onEntry(parsedObj) for each entry, returning the
  // count. The minimal JSON value-boundary scanner tracks string + escape +
  // brace-depth state so a `}` / `"` / `[` inside a string value never ends an
  // object prematurely. Each object's bytes are sliced and JSON.parse'd
  // individually (small -> cap-safe). Holding NOTHING across iterations beyond
  // the caller's onEntry side-effects keeps peak heap O(1 entry) -- the streaming
  // substrate shared by parseEntriesArray (collect) and streamTribalEntries (the
  // rerank's O(K) top-K consumer, U-TRIBAL-RERANK-STREAM 2026-06-10). Same
  // truncation guard (sawClose) as the prior parseEntriesArray.
  const n = buf.length;
  let i = start;
  let count = 0;
  let sawClose = false;
  while (i < n && isWs(buf[i])) i++;
  if (i < n && buf[i] === C_RBRACK) return 0; // empty array (clean close)
  while (i < n) {
    while (i < n && isWs(buf[i])) i++;
    if (i >= n || buf[i] !== C_LBRACE) break; // not an object -> torn/malformed
    const objStart = i;
    let depth = 0, inStr = false, esc = false;
    for (; i < n; i++) {
      const c = buf[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === C_BSLASH) esc = true;
        else if (c === C_QUOTE) inStr = false;
      } else if (c === C_QUOTE) {
        inStr = true;
      } else if (c === C_LBRACE) {
        depth++;
      } else if (c === C_RBRACE) {
        depth--;
        if (depth === 0) { i++; break; } // consumed the closing brace
      }
    }
    onEntry(JSON.parse(buf.slice(objStart, i).toString("utf8")));
    count++;
    while (i < n && (isWs(buf[i]) || buf[i] === C_COMMA)) i++;
    if (i < n && buf[i] === C_RBRACK) { sawClose = true; break; } // end of array
  }
  // Fail loud on a torn/truncated index: if the array never closed with `]`,
  // the file was cut off mid-write (e.g. a killed atomic write) and we have
  // only a PREFIX of the entries. Returning that prefix would silently shrink
  // the fleet's tribal brain -- refuse it (R12). A clean close set sawClose; the
  // empty-array path returned above. (reviewer-C P2 hardening, 2026-06-08.)
  if (!sawClose) {
    throw new Error(
      `walkEntriesArray: entries array not closed with ']' after ${count} ` +
      `entries -- index is truncated/corrupt (torn write?); refusing to return a partial brain`,
    );
  }
  return count;
}

export function parseEntriesArray(buf, start) {
  const entries = [];
  walkEntriesArray(buf, start, (e) => entries.push(e));
  return entries;
}

/**
 * Load a SHARDED index from its manifest. Each shard is < the write threshold
 * (< V8 cap) by construction, so a plain per-shard string parse is cap-safe.
 * Fail loud (R12) on a torn/incomplete shard set rather than return a partial
 * brain -- mirrors the monolith path's truncation guard. Companion to the
 * writer in `write-tribal-index.mjs`.
 */
export function loadShardedIndex(manifestPath, indexPath, fsImpl = fs) {
  const manifest = JSON.parse(fsImpl.readFileSync(manifestPath, "utf8")); // small
  const { sharded, shardCount, totalEntries, shards, ...head } = manifest;
  const dir = path.dirname(indexPath);
  const entries = [];
  for (const sh of shards || []) {
    // basename guard: never honor a `../` in a shard filename, even from a
    // hand-corrupted manifest (defense-in-depth; the writer only ever stores a
    // basename). path.basename keeps a normal "tribal-embed-index.shard-NNN.json".
    const sp = path.join(dir, path.basename(String(sh.file)));
    const sbuf = fsImpl.readFileSync(sp);
    if (sbuf.length >= V8_MAX_STRING) {
      throw new Error(
        `loadShardedIndex: shard ${sh.file} is ${sbuf.length} bytes >= V8 cap ` +
        `(${V8_MAX_STRING}) -- corrupt manifest/shard; refusing to read`,
      );
    }
    const obj = JSON.parse(sbuf.toString("utf8"));
    const got = (obj.entries || []).length;
    if (typeof sh.count === "number" && got !== sh.count) {
      throw new Error(
        `loadShardedIndex: shard ${sh.file} has ${got} entries, manifest says ` +
        `${sh.count} -- torn/corrupt shard; refusing to return a partial brain`,
      );
    }
    for (const e of obj.entries || []) entries.push(e);
  }
  if (typeof totalEntries === "number" && entries.length !== totalEntries) {
    throw new Error(
      `loadShardedIndex: merged ${entries.length} entries but manifest ` +
      `totalEntries=${totalEntries} -- shard set incomplete; refusing partial brain`,
    );
  }
  head.entries = entries;
  return head;
}

/**
 * STREAM every entry of the tribal index, invoking onEntry(entry) per entry,
 * WITHOUT ever materializing the full entries array in heap. Shard-aware
 * (mirrors loadTribalIndex's manifest detection) + monolith. Returns the total
 * entry count. Peak heap is O(1 entry + the off-heap Buffer) -- this is what
 * lets the per-prompt reranker (tribal-rerank.mjs) keep only a bounded top-K
 * instead of holding all ~30K entries (each a 768-float embedding) in the 8 GB
 * spawn heap. Removes the heap ceiling that capped the JSON index's growth and
 * was the stated reason to move to Qdrant (U-TRIBAL-RERANK-STREAM 2026-06-10;
 * [[reference_wiki_tribal_coverage_69pct_qdrant_gate_2026_06_10]]).
 *
 * Fail-loud (R12) on a torn shard set / truncated array (via walkEntriesArray's
 * sawClose guard + the per-shard + total count checks), never a partial brain.
 *
 * @param {string}   indexPath  canonical tribal-embed-index.json path
 * @param {(e:object)=>void} onEntry  called once per parsed entry
 * @param {object}   [fsImpl=fs]
 * @returns {number} total entries streamed
 */
export function streamTribalEntries(indexPath, onEntry, fsImpl = fs) {
  const manifestPath = indexPath.replace(/\.json$/i, "") + ".manifest.json";
  if (typeof fsImpl.existsSync === "function" && fsImpl.existsSync(manifestPath)) {
    // Sharded: walk each shard's entries array per-entry (each shard < the write
    // threshold, so its Buffer is well under the V8 cap by construction).
    const manifest = JSON.parse(fsImpl.readFileSync(manifestPath, "utf8")); // small
    const dir = path.dirname(indexPath);
    let total = 0;
    for (const sh of manifest.shards || []) {
      const sp = path.join(dir, path.basename(String(sh.file))); // `../` guard
      const sbuf = fsImpl.readFileSync(sp);
      if (sbuf.length >= V8_MAX_STRING) {
        throw new Error(
          `streamTribalEntries: shard ${sh.file} is ${sbuf.length} bytes >= V8 cap ` +
          `(${V8_MAX_STRING}) -- corrupt manifest/shard; refusing to read`,
        );
      }
      const start = findEntriesArrayStart(sbuf);
      if (start < 0) {
        throw new Error(
          `streamTribalEntries: shard ${sh.file} has no parseable "entries":[ array`,
        );
      }
      const got = walkEntriesArray(sbuf, start, onEntry);
      if (typeof sh.count === "number" && got !== sh.count) {
        throw new Error(
          `streamTribalEntries: shard ${sh.file} streamed ${got} entries, manifest ` +
          `says ${sh.count} -- torn/corrupt shard; refusing a partial brain`,
        );
      }
      total += got;
    }
    if (typeof manifest.totalEntries === "number" && total !== manifest.totalEntries) {
      throw new Error(
        `streamTribalEntries: streamed ${total} entries but manifest totalEntries=` +
        `${manifest.totalEntries} -- shard set incomplete; refusing a partial brain`,
      );
    }
    return total;
  }
  // Monolith: byte-walk the single file's entries array (cap-safe at any size;
  // the Buffer is off-heap, only one entry is string-parsed at a time).
  const buf = fsImpl.readFileSync(indexPath);
  const start = findEntriesArrayStart(buf);
  if (start < 0) {
    throw new Error(
      `streamTribalEntries: ${indexPath} has no parseable "entries":[ array`,
    );
  }
  return walkEntriesArray(buf, start, onEntry);
}

/**
 * Load the tribal index from disk, cap-safe. Drop-in replacement for
 * `JSON.parse(fs.readFileSync(indexPath, "utf8"))`.
 */
export function loadTribalIndex(indexPath, fsImpl = fs) {
  // Shard-aware (companion to write-tribal-index.mjs): if a sibling manifest
  // exists, the index is sharded -- read + merge the shards. Manifest absent ->
  // the monolith path below runs UNCHANGED, so the live ~160 MiB single-file
  // index is byte-for-byte the prior behavior (zero risk to live recall).
  // Guard on existsSync so a minimal mock fsImpl ({ readFileSync } only, as the
  // hermetic over-cap suite passes) falls through to the monolith path rather
  // than throwing -- the shard feature stays fully active for the real `fs`.
  const manifestPath = indexPath.replace(/\.json$/i, "") + ".manifest.json";
  if (typeof fsImpl.existsSync === "function" && fsImpl.existsSync(manifestPath)) {
    return loadShardedIndex(manifestPath, indexPath, fsImpl);
  }
  const buf = fsImpl.readFileSync(indexPath); // Buffer (no string-length cap)
  if (buf.length < V8_MAX_STRING) {
    // Under cap → exact prior semantics.
    return JSON.parse(buf.toString("utf8"));
  }
  // Over cap → incremental parse so we never allocate a >cap string.
  const head = parseHead(buf);
  const start = findEntriesArrayStart(buf);
  if (start < 0) {
    throw new Error(
      `loadTribalIndex: oversize index (${buf.length} bytes > ${V8_MAX_STRING}) ` +
      `has no parseable "entries":[ array — cannot incrementally load ${indexPath}`,
    );
  }
  head.entries = parseEntriesArray(buf, start);
  return head;
}

export default loadTribalIndex;
