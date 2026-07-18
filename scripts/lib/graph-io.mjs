/**
 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
 *
 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
 * (write) calls once the graph passes ~512MB serialized.
 *
 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
 * Memory: `reference_regen_viz_string_length_2026_05_23.md`.
 * Tracked: CLAUDE.md ## Recent regressions (2026-05-23 entry).
 *
 * The graph structure assumed:
 *   `{ schemaVersion, meta, nodes: [...], edges: [...] }` (plus other top-level keys)
 *
 * write strategy: per-key streaming. Top-level keys are serialized one at a
 * time; within `nodes` / `edges` arrays, each element is serialized separately.
 * No single `JSON.stringify` call ever sees more than one node/edge.
 *
 * read strategy: load file as a `Buffer` (Node Buffer max ~4GB; no V8
 * string-length limit applies). Walk byte offsets to identify top-level
 * key/value boundaries WITHOUT ever converting the whole buffer to a string.
 * Extract sub-strings only for individual nodes/edges/values (each well under
 * the ceiling) and `JSON.parse` each.
 *
 * Output is byte-equivalent to legacy single-shot stringify modulo key
 * ordering (which `Object.keys` preserves in insertion order, same as
 * `JSON.stringify` does).
 */

import fs from "node:fs";

/** Top-level keys whose array values may exceed the V8 string-length ceiling. */
export const LARGE_ARRAY_KEYS = new Set(["nodes", "edges"]);

/**
 * V8's hard maximum string length in bytes (0x1fffffe8 = 536,870,888 ~= 512 MiB).
 * `fs.readFileSync(path, "utf8")` and `buf.toString("utf8")` THROW above this, so a
 * JSON file larger than this cannot be JSON.parse()'d through a single string -- it
 * needs a streaming parser (readGraphStreaming / streamGraphArray) or it must be
 * sharded. Centralized here so the cap is checked in ONE place rather than re-inlined
 * (an un-checked >512MiB string read caused BOTH the tribal-index clobber and the
 * obsidian-augmentation silent-drop). 2026-06-09.
 */
export const V8_MAX_STRING_BYTES = 0x1fffffe8;

/**
 * True if a file/string of `byteLength` bytes is too large to JSON.parse via a
 * single JS string (would throw V8's max-string-length error). Gate string-based
 * loads with this and fall back to a streaming parse or fail LOUD -- never silently
 * drop an oversize file.
 *
 * @param {number} byteLength
 * @returns {boolean}
 */
export function exceedsStringParseCap(byteLength) {
  return typeof byteLength === "number" && byteLength > V8_MAX_STRING_BYTES;
}

/**
 * Stream-write a graph object to a JSON file. Per-key, per-element streaming
 * keeps every intermediate `JSON.stringify` call under ~1MB.
 *
 * @param {string} filePath - absolute path to write
 * @param {object} graph - the graph object to serialize
 */
export function writeGraphStreaming(filePath, graph) {
  const fd = fs.openSync(filePath, "w");
  try {
    const writeChunk = (s) => fs.writeSync(fd, s, null, "utf8");
    writeChunk("{");
    let firstKey = true;
    for (const key of Object.keys(graph)) {
      if (!firstKey) writeChunk(",");
      firstKey = false;
      writeChunk(JSON.stringify(key));
      writeChunk(":");
      const val = graph[key];
      if (Array.isArray(val) && LARGE_ARRAY_KEYS.has(key)) {
        writeChunk("[");
        for (let i = 0; i < val.length; i++) {
          if (i > 0) writeChunk(",");
          writeChunk(JSON.stringify(val[i]));
        }
        writeChunk("]");
      } else {
        writeChunk(JSON.stringify(val));
      }
    }
    writeChunk("}\n");
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Atomic variant of writeGraphStreaming: stream per-key into a sibling
 * `.tmp-<pid>` file, then rename it over the target. A crash / reaper-kill
 * mid-write leaves only the orphan .tmp (swept by the tmp-orphan janitor) --
 * never a truncated system-graph.json. Same >512MB string-cap safety as
 * writeGraphStreaming (no whole-graph JSON.stringify), plus crash-atomicity.
 *
 * Added 2026-06-09 (OBSIDIAN-AI-SYNERGY / vault->GNN refpool): seed-ghost-*
 * writers used a tmp+rename atomicWrite that took a single JSON.stringify(g)
 * string (broken >512MB) OR the non-atomic writeGraphStreaming (crash-unsafe on
 * the 642MB live graph). This combines both correct properties.
 *
 * @param {string} filePath - absolute path to write
 * @param {object} graph - the graph object to serialize
 */
export function writeGraphStreamingAtomic(filePath, graph) {
  const tmp = `${filePath}.tmp-${process.pid}`;
  // Clean up the partial tmp if the streaming write itself throws mid-way
  // (disk-full / EIO) — otherwise a large tmp orphan (~hundreds of MB for the
  // sidecar) is left behind, and this dir is NOT covered by the tmpdir/C: janitors.
  // Matches the explicit cleanup the pre-2026-07-05 sidecar writer had. The real
  // target is never touched until the rename below, so atomicity is unaffected.
  try {
    writeGraphStreaming(tmp, graph);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* best-effort orphan cleanup */ }
    throw err;
  }
  const delays = [50, 100, 200, 400, 800, 1600];
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      const code = err?.code;
      const retryable = code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "EEXIST";
      if (!retryable || attempt >= delays.length) {
        try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup of the orphan */ }
        throw err;
      }
      const until = Date.now() + delays[attempt];
      while (Date.now() < until) { /* spin */ }
    }
  }
}

/**
 * Stream-read a graph file. Loads the file as Buffer, walks byte offsets to
 * identify top-level key/value boundaries, and only extracts small per-element
 * sub-strings for `JSON.parse`.
 *
 * Sub-utility: the byte-walk respects JSON string-escape rules (`\\X`) and
 * tracks brace/bracket nesting depth.
 *
 * @param {string} filePath - absolute path to read
 * @returns {object} the parsed graph object
 */
export function readGraphStreaming(filePath) {
  const buf = fs.readFileSync(filePath);
  const result = {};
  const LBRACE = 0x7b, RBRACE = 0x7d, LBRACKET = 0x5b, RBRACKET = 0x5d;
  const QUOTE = 0x22, BACKSLASH = 0x5c, COLON = 0x3a, COMMA = 0x2c;
  const isWS = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

  let i = 0;
  while (i < buf.length && isWS(buf[i])) i++;
  if (buf[i] !== LBRACE) {
    throw new Error(`readGraphStreaming: expected '{' at offset ${i}, got ${String.fromCharCode(buf[i])} (file: ${filePath})`);
  }
  i++;

  while (i < buf.length) {
    while (i < buf.length && (isWS(buf[i]) || buf[i] === COMMA)) i++;
    if (buf[i] === RBRACE) { i++; break; }
    if (buf[i] !== QUOTE) {
      throw new Error(`readGraphStreaming: expected string key at offset ${i} (file: ${filePath})`);
    }
    // Scan key string (handling escapes).
    const keyStart = i;
    i++;
    while (i < buf.length) {
      if (buf[i] === BACKSLASH) { i += 2; continue; }
      if (buf[i] === QUOTE) { i++; break; }
      i++;
    }
    const key = JSON.parse(buf.toString("utf8", keyStart, i));
    // Skip to ':' then any whitespace before the value.
    while (i < buf.length && buf[i] !== COLON) i++;
    i++;
    while (i < buf.length && isWS(buf[i])) i++;

    if (LARGE_ARRAY_KEYS.has(key) && buf[i] === LBRACKET) {
      // Walk array elements one at a time.
      i++;
      const arr = [];
      let arrClosed = false;
      while (i < buf.length) {
        while (i < buf.length && (isWS(buf[i]) || buf[i] === COMMA)) i++;
        if (buf[i] === RBRACKET) { i++; arrClosed = true; break; }
        const elemStart = i;
        let depth = 0;
        let inStr = false;
        while (i < buf.length) {
          const c = buf[i];
          if (inStr) {
            if (c === BACKSLASH) { i += 2; continue; }
            if (c === QUOTE) inStr = false;
            i++;
            continue;
          }
          if (c === QUOTE) { inStr = true; i++; continue; }
          if (c === LBRACE || c === LBRACKET) { depth++; i++; continue; }
          if (c === RBRACE || c === RBRACKET) {
            if (depth === 0) break;
            depth--;
            i++;
            continue;
          }
          if (c === COMMA && depth === 0) break;
          i++;
        }
        arr.push(JSON.parse(buf.toString("utf8", elemStart, i)));
      }
      // R12 truncation guard (same closed-flag as count/stream): a large array that ran off the
      // buffer end without its closing ']' is TRUNCATED -- fail loud rather than return a
      // silently-short array to the ~40 readGraphStreaming consumers (index/embedding/bridge
      // builders). The between-element cut (clean end right after an element) slips past the
      // per-element JSON.parse, so the closed-flag is the only thing that catches it.
      if (!arrClosed) throw new Error(`readGraphStreaming: unterminated array '${key}' -- truncated file? (${filePath})`);
      result[key] = arr;
      continue;
    }

    // Non-large value — extract its byte range, then `JSON.parse` whole.
    const valStart = i;
    let depth = 0;
    let inStr = false;
    while (i < buf.length) {
      const c = buf[i];
      if (inStr) {
        if (c === BACKSLASH) { i += 2; continue; }
        if (c === QUOTE) inStr = false;
        i++;
        continue;
      }
      if (c === QUOTE) { inStr = true; i++; continue; }
      if (c === LBRACE || c === LBRACKET) { depth++; i++; continue; }
      if (c === RBRACE) {
        if (depth === 0) break;
        depth--; i++; continue;
      }
      if (c === RBRACKET) { depth--; i++; continue; }
      if (c === COMMA && depth === 0) break;
      i++;
    }
    result[key] = JSON.parse(buf.toString("utf8", valStart, i));
  }
  return result;
}

/**
 * Find the byte offset of the FIRST element inside a top-level array value for
 * `arrayKey` (i.e. one byte past the array's opening `[`). Returns -1 if the key
 * is not present as a real array-valued key. The "is this a real key vs a
 * substring inside some string value" guard (the `"<key>"` must be followed,
 * after whitespace, by `:` then `[`) lives here so countGraphArrayStreaming and
 * streamGraphArray share ONE implementation.
 *
 * @param {Buffer} buf       graph file contents as an off-heap Buffer
 * @param {string} arrayKey  top-level array key to locate
 * @returns {number}  offset of the first array-content byte, or -1
 */
function findArrayContentStart(buf, arrayKey) {
  const COLON = 0x3a, LBRACKET = 0x5b;
  const isWS = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
  const keyBuf = Buffer.from(`"${arrayKey}"`, "utf8");
  let from = 0;
  while (from < buf.length) {
    const hit = buf.indexOf(keyBuf, from);
    if (hit < 0) break;
    let j = hit + keyBuf.length;
    while (j < buf.length && isWS(buf[j])) j++;
    if (buf[j] === COLON) {
      j++;
      while (j < buf.length && isWS(buf[j])) j++;
      if (buf[j] === LBRACKET) return j + 1;
    }
    from = hit + keyBuf.length;
  }
  return -1;
}

/**
 * Count elements of a top-level array key (default "nodes") WITHOUT materializing
 * the graph object. Reads the file as a Node Buffer (allocated OFF the V8 heap)
 * and byte-walks only the target array, counting its top-level elements. V8-heap
 * use is O(1) regardless of graph size, so a DEFAULT-heap process can count a
 * multi-hundred-MB graph that `JSON.parse(readFileSync(...,"utf8"))` would OOM
 * (materialization) or throw on (>512MB V8 string cap). Returns 0 on any error /
 * missing key / not-an-array / a TRUNCATED (unterminated) array (caller treats 0 as
 * "couldn't verify" -- a partial count would silently mask graph corruption).
 *
 * Element counting: top-level elements are object/array opens (`{`/`[`) at array
 * depth 0, plus depth-0 scalars/strings delimited by commas. The graph's nodes
 * are objects, so this counts them exactly; the comma/scalar handling keeps it
 * correct for arbitrary arrays too.
 *
 * @param {string} filePath  absolute path to the graph JSON
 * @param {string} [arrayKey="nodes"]  top-level array key to count
 * @returns {number}
 */
export function countGraphArrayStreaming(filePath, arrayKey = "nodes") {
  let buf;
  try { buf = fs.readFileSync(filePath); } catch { return 0; }
  const arrStart = findArrayContentStart(buf, arrayKey);
  if (arrStart < 0) return 0;
  const QUOTE = 0x22, BACKSLASH = 0x5c, LBRACE = 0x7b, RBRACE = 0x7d;
  const LBRACKET = 0x5b, RBRACKET = 0x5d, COMMA = 0x2c;
  const isWS = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

  let count = 0, depth = 0, inStr = false, inElem = false, closed = false;
  let i = arrStart;
  while (i < buf.length) {
    const c = buf[i];
    if (inStr) {
      if (c === BACKSLASH) { i += 2; continue; }
      if (c === QUOTE) inStr = false;
      i++; continue;
    }
    if (c === QUOTE) {
      if (depth === 0 && !inElem) { count++; inElem = true; }
      inStr = true; i++; continue;
    }
    if (c === LBRACE || c === LBRACKET) {
      if (depth === 0) { count++; }
      depth++; i++; continue;
    }
    if (c === RBRACE) { depth--; i++; continue; }
    if (c === RBRACKET) {
      if (depth === 0) { closed = true; break; } // reached the array's closing ']'
      depth--; i++; continue;
    }
    if (c === COMMA) { if (depth === 0) inElem = false; i++; continue; }
    if (depth === 0 && !isWS(c) && !inElem) { count++; inElem = true; } // depth-0 scalar
    i++;
  }
  // R12 / silent-corruption guard: an array that ran off the buffer end WITHOUT its closing
  // ']' is TRUNCATED (a crashed non-atomic write, a disk-full, a copy interrupted). A partial
  // count would silently pass the regen-viz node-count VERIFICATION and mask the corruption.
  // Return 0 ("couldn't verify" -- same contract as a read error / missing key), never a
  // misleading partial. (An empty array is legitimately closed -> 0; a truncated one is 0 too,
  // and the caller already treats 0 as suspect for the 244K-node live graph.)
  return closed ? count : 0;
}

/**
 * Stream the top-level elements of an array key (default "nodes") WITHOUT
 * materializing the whole graph. Reads the file as an OFF-HEAP Buffer and, for
 * each top-level element, parses ONLY that element and hands it to `onElement`.
 * Peak V8-heap use is O(one element + whatever the callback retains), so a
 * DEFAULT-heap process can walk a multi-hundred-MB graph that
 * `JSON.parse(readFileSync(...,"utf8"))` would OOM on (materialization) or throw
 * on (>512MB V8 string cap).
 *
 * Use this -- not `readGraphStreaming(...).nodes.filter(...)` -- when you only
 * need to PROJECT a few fields per node: readGraphStreaming materializes EVERY
 * element at once, which OOM'd augment-molecules.mjs under the 432MB default heap
 * (U-VIZ-AUGMENT-MOLECULES-STREAM, 2026-06-09). It walks element boundaries with
 * the same string-escape + nesting-aware byte walk as readGraphStreaming's array
 * branch, so a `]`/`}`/`,` inside a string value never splits an element.
 *
 * @param {string} filePath  absolute path to the graph JSON
 * @param {string} arrayKey  top-level array key to stream (e.g. "nodes")
 * @param {(element:any, index:number)=>void} onElement  called per parsed element
 * @returns {number}  number of elements streamed (0 on missing key / read error)
 * @throws  if the target array is TRUNCATED (ran off the buffer end without its closing
 *          ']') -- fail loud rather than hand back a silent PARTIAL projection of a corrupt graph.
 */
export function streamGraphArray(filePath, arrayKey, onElement) {
  let buf;
  try { buf = fs.readFileSync(filePath); } catch { return 0; }
  const arrStart = findArrayContentStart(buf, arrayKey);
  if (arrStart < 0) return 0;
  const QUOTE = 0x22, BACKSLASH = 0x5c, LBRACE = 0x7b, RBRACE = 0x7d;
  const LBRACKET = 0x5b, RBRACKET = 0x5d, COMMA = 0x2c;
  const isWS = (c) => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;

  let i = arrStart, count = 0, closed = false;
  while (i < buf.length) {
    while (i < buf.length && (isWS(buf[i]) || buf[i] === COMMA)) i++;
    if (i >= buf.length) break;                          // ran off the end -> unterminated (caught below)
    if (buf[i] === RBRACKET) { closed = true; break; }   // reached the array's closing ']'
    const elemStart = i;
    let depth = 0, inStr = false;
    while (i < buf.length) {
      const c = buf[i];
      if (inStr) {
        if (c === BACKSLASH) { i += 2; continue; }
        if (c === QUOTE) inStr = false;
        i++; continue;
      }
      if (c === QUOTE) { inStr = true; i++; continue; }
      if (c === LBRACE || c === LBRACKET) { depth++; i++; continue; }
      if (c === RBRACE || c === RBRACKET) {
        if (depth === 0) break;
        depth--; i++; continue;
      }
      if (c === COMMA && depth === 0) break;
      i++;
    }
    onElement(JSON.parse(buf.toString("utf8", elemStart, i)), count);
    count++;
  }
  // R12 / silent-corruption guard: fail LOUD on a TRUNCATED array (ran off the buffer end
  // without the closing ']'). The callback has already fired for the valid prefix, so a silent
  // return would hand the caller a PARTIAL projection of a corrupt graph (wrong augmentations /
  // roadmap nodes) with no signal. All three readers share this closed-flag guard:
  // countGraphArrayStreaming returns 0, this + readGraphStreaming throw. (A mid-element cut
  // already throws via JSON.parse on the partial slice; the closed-flag additionally catches the
  // BETWEEN-element cut -- a clean end right after an element -- which the per-element parse misses.)
  if (!closed) {
    throw new Error(`streamGraphArray: unterminated array '${arrayKey}' -- truncated file? (${filePath})`);
  }
  return count;
}
