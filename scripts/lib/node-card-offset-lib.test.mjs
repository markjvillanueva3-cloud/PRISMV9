/**
 * node-card-offset-lib.test.mjs — verifies the seek-index INTENT:
 *   1. every [byteOffset,length] slice of the JSONL re-parses to EXACTLY the
 *      card for that id (byte-exact, incl. multibyte UTF-8 — a 🌌 label breaks a
 *      naive String.length offset; this is the whole reason the index exists),
 *   2. dedup matches buildIndex (first id wins, dup not written),
 *   3. a node makeCard rejects is skipped, not crashed on,
 *   4. an id literally named "__proto__" round-trips (null-proto, no pollution),
 *   5. writeCardOffsetIndex emits both files, jsonl-before-offsets, with the
 *      GRAPH source stamps (not the sidecar's) so freshness checks work,
 *   6. a real on-disk seek (read len bytes at off) returns the card.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildCardOffsetIndex,
  writeCardOffsetIndex,
  offsetIndexPathsFor,
  CARD_OFFSET_SCHEMA_VERSION,
} from "./node-card-offset-lib.mjs";

// Compact node records in the system-graph-index shape, incl. a multibyte label,
// a knowledge-bearing node, a dup id, and a makeCard-rejected node (no id).
const NODES = [
  { id: "eng.mill", label: "mill\n(64)", layer: "L5", status: "stub", info: "Mill domain",
    knowledge: { wikiEntries: ["H:/prism/knowledge/wiki/architecture/mill.md"], memoryEntries: ["reference_mill_one"] } },
  { id: "ghost.galaxy.wedm", label: "🌌 wedm", layer: "L7", status: "galaxy_federation", info: "WEDM roost" },
  { id: "p.operator", label: "Operator", layer: "L0", status: "built", info: "Shop floor" },
  { id: "eng.mill", label: "DUP — must be dropped", layer: "L5", status: "x", info: "dup" }, // dup id
  { id: 42, label: "no-string-id" }, // makeCard rejects
  { id: "__proto__", label: "pollution probe", layer: "L9", status: "x", info: "adversarial" },
];

test("every [offset,length] slice re-parses to exactly that id's card (byte-exact, multibyte-safe)", () => {
  const { jsonl, offsets, count, skipped, dupSkipped } = buildCardOffsetIndex(NODES);
  const buf = Buffer.from(jsonl, "utf8");
  // 4 distinct accepted ids (eng.mill, ghost.galaxy.wedm, p.operator, __proto__)
  assert.equal(count, 4, "4 distinct ids written");
  assert.equal(skipped, 1, "the id:42 node skipped by makeCard");
  assert.equal(dupSkipped, 1, "the second eng.mill dropped");

  for (const id of ["eng.mill", "ghost.galaxy.wedm", "p.operator", "__proto__"]) {
    const rec = Object.prototype.hasOwnProperty.call(offsets, id) ? offsets[id] : undefined;
    assert.ok(Array.isArray(rec), `offset record for ${id}`);
    const [off, len] = rec;
    const slice = buf.subarray(off, off + len).toString("utf8");
    const card = JSON.parse(slice);
    assert.equal(card.id, id, `slice for ${id} parses to that card`);
  }
  // the 🌌 label is 4 UTF-8 bytes — prove the offset accounted bytes not chars by
  // checking the NEXT record after it starts at the right place (no drift).
  const wedm = offsets["ghost.galaxy.wedm"];
  const decoded = JSON.parse(buf.subarray(wedm[0], wedm[0] + wedm[1]).toString("utf8"));
  assert.equal(decoded.label, "🌌 wedm", "multibyte label intact at its byte offset");
});

test("first id wins — the offset resolves the FIRST eng.mill, dup dropped", () => {
  const { jsonl, offsets } = buildCardOffsetIndex(NODES);
  const [off, len] = offsets["eng.mill"];
  const card = JSON.parse(Buffer.from(jsonl, "utf8").subarray(off, off + len).toString("utf8"));
  assert.equal(card.status, "stub", "first eng.mill (status:stub), not the dup (status:x)");
  // dup line must NOT be in the jsonl at all
  assert.equal((jsonl.match(/"DUP — must be dropped"/g) || []).length, 0, "dup line never written");
});

test("empty array -> empty jsonl, zero count; non-array throws", () => {
  const r = buildCardOffsetIndex([]);
  assert.equal(r.jsonl, "");
  assert.equal(r.count, 0);
  assert.throws(() => buildCardOffsetIndex(null), /must be an array/);
  assert.throws(() => buildCardOffsetIndex("nope"), /must be an array/);
});

test("jsonl line count equals count (every record is exactly one full line)", () => {
  const { jsonl, count } = buildCardOffsetIndex(NODES);
  const lines = jsonl.split("\n").filter((l) => l.length > 0);
  assert.equal(lines.length, count);
  // last char is a newline so the final record is a complete line
  assert.equal(jsonl.endsWith("\n"), true);
});

test("offsetIndexPathsFor co-locates the pair beside the sidecar outPath", () => {
  const p = offsetIndexPathsFor("/some/dir/system-graph-index.json");
  assert.equal(path.basename(p.jsonlPath), "node-cards.jsonl");
  assert.equal(path.basename(p.offsetsPath), "node-card-offsets.json");
  assert.equal(path.dirname(p.jsonlPath).replace(/\\/g, "/"), "/some/dir");
});

test("writeCardOffsetIndex writes both files with GRAPH stamps; on-disk seek round-trips", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "card-offset-write-"));
  try {
    const built = buildCardOffsetIndex(NODES);
    const { jsonlPath, offsetsPath } = offsetIndexPathsFor(path.join(dir, "system-graph-index.json"));
    const res = writeCardOffsetIndex(built, {
      jsonlPath, offsetsPath,
      meta: { sourceGraph: "system-graph.json", sourceMtimeMs: 123456789, sourceSizeBytes: 999 },
    });
    assert.equal(res.count, 4);
    assert.ok(fs.existsSync(jsonlPath) && fs.existsSync(offsetsPath));

    const doc = JSON.parse(fs.readFileSync(offsetsPath, "utf8"));
    assert.equal(doc.schemaVersion, CARD_OFFSET_SCHEMA_VERSION);
    assert.equal(doc.sourceMtimeMs, 123456789, "GRAPH mtime stamp (for freshnessOf)");
    assert.equal(doc.sourceSizeBytes, 999, "GRAPH size stamp");
    assert.equal(doc.jsonl, "node-cards.jsonl", "offsets names its jsonl");

    // real seek: open the jsonl, read exactly [off,len] for one id
    const [off, len] = doc.offsets["p.operator"];
    const fd = fs.openSync(jsonlPath, "r");
    try {
      const b = Buffer.alloc(len);
      fs.readSync(fd, b, 0, len, off);
      const card = JSON.parse(b.toString("utf8"));
      assert.equal(card.id, "p.operator");
      assert.equal(card.label, "Operator");
    } finally {
      fs.closeSync(fd);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("writeCardOffsetIndex rejects missing dest paths / invalid built", () => {
  const built = buildCardOffsetIndex(NODES);
  assert.throws(() => writeCardOffsetIndex(built, { jsonlPath: "", offsetsPath: "x" }), /required/);
  assert.throws(() => writeCardOffsetIndex(null, { jsonlPath: "a", offsetsPath: "b" }), /invalid built/);
});
