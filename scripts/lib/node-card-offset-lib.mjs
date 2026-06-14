/**
 * node-card-offset-lib.mjs — the seekable card-offset index for sub-parse
 * node reads (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX, slot:sierra).
 *
 * THE PROBLEM (the next layer down from node-card-read): readCard's full-sidecar
 * path parses the WHOLE 193MB system-graph-index.json (or 55MB find-cache) to
 * build an id->node Map. A long-lived process caches that, but a SHORT-LIVED
 * per-prompt prefetch hook re-pays the ~600ms-2s parse + ~1.5GB RSS every fire —
 * fatal in a UserPromptSubmit budget. This lib emits a purpose-built pair so a
 * reader seeks ONE record instead:
 *
 *   - node-cards.jsonl        — one card per line: `JSON.stringify(makeCard(node))`,
 *                               pre-projected so the reader does ZERO reshaping.
 *   - node-card-offsets.json  — { …stamps, jsonl, count, offsets:{ id:[byteOffset,length] } }
 *                               — the seek table; ~13MB (302K ids) vs 193MB.
 *
 * A reader parses the small offsets table once (cacheable), then `fs.read`s
 * exactly `length` bytes at `byteOffset` from the jsonl — sub-ms per card, no
 * full parse, never the 644MB graph (R12, the CHEAP-NODE-ACCESS invariant).
 *
 * `makeCard` is imported (not re-implemented) so the JSONL card shape can NEVER
 * drift from the full-sidecar path — one projection definition, two emit sites.
 *
 * Pure compute (`buildCardOffsetIndex`) is split from I/O (`writeCardOffsetIndex`)
 * exactly like build-graph-index's buildGraphIndex/writeSidecar split, so the
 * offset math is unit-testable with no FS.
 */

import { writeFileSync, renameSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { makeCard } from "./node-card-schema.mjs";

export const CARD_OFFSET_SCHEMA_VERSION = "1.0.0";

/**
 * Build the JSONL blob + id->[byteOffset,length] offset table from the compact
 * node records that build-graph-index already produces (`sidecar.nodes`) — the
 * SAME records readCard's full path projects, so coverage is identical.
 *
 * Posture mirrors node-card-read's buildIndex EXACTLY:
 *   - a node makeCard() rejects (no string id) is skipped (counted in `skipped`),
 *   - FIRST occurrence of a dup id wins (later dups dropped, not written) — so the
 *     offset table and the full-sidecar Map resolve the same record for any id.
 * The offsets object is null-proto so an id literally named "__proto__" /
 * "constructor" is a normal own key (no prototype pollution); the READER must
 * therefore look it up with hasOwnProperty, never `offsets[id]` blind.
 *
 * Pure — no FS, no Date. `length` excludes the trailing "\n" so a reader parses
 * the exact JSON slice with no trim.
 *
 * @param {Array<object>} nodes  compact node records ({id,label,layer,status,info,knowledge?})
 * @returns {{ jsonl: string, offsets: object, count: number, skipped: number, dupSkipped: number }}
 */
export function buildCardOffsetIndex(nodes) {
  if (!Array.isArray(nodes)) {
    throw new Error("buildCardOffsetIndex: nodes must be an array");
  }
  const offsets = Object.create(null);
  const parts = [];
  let offset = 0;
  let count = 0;
  let skipped = 0;
  let dupSkipped = 0;

  for (const node of nodes) {
    const card = makeCard(node);
    if (!card) { skipped++; continue; }
    // first-wins: identical dedup semantics to buildIndex's `!byId.has(id)`.
    if (Object.prototype.hasOwnProperty.call(offsets, card.id)) { dupSkipped++; continue; }
    const line = JSON.stringify(card);
    const lineBytes = Buffer.byteLength(line, "utf8");
    offsets[card.id] = [offset, lineBytes];
    parts.push(line);
    offset += lineBytes + 1; // +1 for the "\n" joined below
    count++;
  }

  // join with "\n" + trailing "\n" so every record (incl. the last) is one full
  // line; `offset` already accounted the +1 per record, so this matches exactly.
  const jsonl = count > 0 ? parts.join("\n") + "\n" : "";
  return { jsonl, offsets, count, skipped, dupSkipped };
}

/** Atomic single-file write (tmp + same-volume rename); cleans tmp on failure. */
function atomicWrite(targetPath, data) {
  const tmp = `${targetPath}.tmp.${process.pid}`;
  try {
    writeFileSync(tmp, data);
    renameSync(tmp, targetPath);
  } catch (e) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* best effort */ }
    throw e;
  }
  return Buffer.byteLength(data);
}

/**
 * Write the offset index pair atomically. The JSONL is written FIRST and the
 * offsets table (which names the jsonl + carries the source stamps a reader
 * checks for freshness) is written LAST — so a reader that observes a fresh
 * offsets file is guaranteed the jsonl it points at is already complete. The
 * offsets file is the commit pointer (crash-safe ordering).
 *
 * `meta` source stamps MUST describe the GRAPH the cards derive from
 * (sourceMtimeMs / sourceSizeBytes), NOT the sidecar — so freshnessOf() can
 * compare them to a stat of the live graph exactly like the other sidecars.
 *
 * @param {{jsonl:string,offsets:object,count:number}} built  from buildCardOffsetIndex
 * @param {{ jsonlPath:string, offsetsPath:string, meta?:object }} dest
 * @returns {{ jsonlPath:string, offsetsPath:string, jsonlBytes:number, offsetsBytes:number, count:number }}
 */
export function writeCardOffsetIndex(built, { jsonlPath, offsetsPath, meta = {} }) {
  if (!built || typeof built.jsonl !== "string" || !built.offsets) {
    throw new Error("writeCardOffsetIndex: invalid built object");
  }
  if (!jsonlPath || !offsetsPath) {
    throw new Error("writeCardOffsetIndex: jsonlPath and offsetsPath are required");
  }
  // jsonl FIRST (the data) so its byte length is known before the offsets doc
  // is built; offsets LAST (the commit pointer). `jsonlBytes` is embedded so a
  // reader can verify `statSync(jsonl).size === jsonlBytes` and reject a TORN
  // pair (a fresh offsets file pointing at a stale/mismatched jsonl from a death
  // between the two renames) — degrading safely to the full-sidecar path rather
  // than seeking into wrong bytes. (Both per-file scrutiny reviewers flagged the
  // non-atomic two-write window; this is the cheap insurance.)
  const jsonlBytes = atomicWrite(jsonlPath, built.jsonl);

  const offsetsDoc = {
    schemaVersion: CARD_OFFSET_SCHEMA_VERSION,
    generatedAt: meta.generatedAt ?? new Date().toISOString(),
    sourceGraph: meta.sourceGraph ?? "system-graph.json",
    sourceMtimeMs: Number(meta.sourceMtimeMs) || 0,
    sourceSizeBytes: Number(meta.sourceSizeBytes) || 0,
    jsonl: path.basename(jsonlPath),
    jsonlBytes, // stamp keys precede `offsets` so the reader's 2KB head read sees them
    count: built.count,
    offsets: built.offsets,
  };
  const offsetsBytes = atomicWrite(offsetsPath, JSON.stringify(offsetsDoc));
  return { jsonlPath, offsetsPath, jsonlBytes, offsetsBytes, count: built.count };
}

/**
 * Resolve the canonical offset-index file paths that sit beside a given main
 * sidecar `outPath` (so an --out override keeps the pair co-located, matching
 * build-graph-index's breadcrumb behaviour).
 *
 * @param {string} outPath  e.g. .../system-graph-index.json
 * @returns {{ jsonlPath:string, offsetsPath:string }}
 */
export function offsetIndexPathsFor(outPath) {
  const dir = path.dirname(String(outPath));
  return {
    jsonlPath: path.join(dir, "node-cards.jsonl"),
    offsetsPath: path.join(dir, "node-card-offsets.json"),
  };
}
