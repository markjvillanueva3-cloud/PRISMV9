/**
 * build-card-offset-index.test.mjs — verifies the backfill INTENT:
 *   1. it reads a system-graph-index sidecar and emits the pair co-located in
 *      the out dir, with the GRAPH stamps the sidecar recorded (not the sidecar's),
 *   2. the emitted index round-trips a real on-disk seek,
 *   3. it fails loud on missing / node-less / zero-card sidecars (never writes
 *      an empty or partial index).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate } from "./build-card-offset-index.mjs";

function writeSidecar(dir, nodes, stamps = {}) {
  const p = path.join(dir, "system-graph-index.json");
  fs.writeFileSync(p, JSON.stringify({
    schemaVersion: "1.0.0",
    sourceGraph: "system-graph.json",
    sourceMtimeMs: stamps.sourceMtimeMs ?? 1700000000000,
    sourceSizeBytes: stamps.sourceSizeBytes ?? 644000000,
    nodeCount: nodes.length,
    nodes,
  }));
  return p;
}

test("backfills the offset pair from a sidecar, with GRAPH stamps, seek round-trips", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "card-offset-gen-"));
  try {
    const indexPath = writeSidecar(dir, [
      { id: "eng.mill", label: "mill", layer: "L5", status: "stub", info: "Mill",
        knowledge: { wikiEntries: ["H:/prism/knowledge/wiki/architecture/mill.md"], memoryEntries: ["reference_mill"] } },
      { id: "ghost.galaxy.wedm", label: "🌌 wedm", layer: "L7", status: "galaxy_federation", info: "roost" },
    ], { sourceMtimeMs: 1700000000000, sourceSizeBytes: 644000123 });

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "card-offset-out-"));
    try {
      const r = generate({ indexPath, outDir });
      assert.equal(r.count, 2);
      assert.equal(path.dirname(r.jsonlPath), outDir, "pair co-located in outDir");

      const doc = JSON.parse(fs.readFileSync(r.offsetsPath, "utf8"));
      assert.equal(doc.sourceMtimeMs, 1700000000000, "graph mtime propagated from sidecar");
      assert.equal(doc.sourceSizeBytes, 644000123, "graph size propagated from sidecar");
      assert.equal(doc.count, 2);

      // real seek
      const [off, len] = doc.offsets["ghost.galaxy.wedm"];
      const fd = fs.openSync(r.jsonlPath, "r");
      try {
        const b = Buffer.alloc(len);
        fs.readSync(fd, b, 0, len, off);
        const card = JSON.parse(b.toString("utf8"));
        assert.equal(card.label, "🌌 wedm", "multibyte label seeks correctly");
      } finally {
        fs.closeSync(fd);
      }
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("missing sidecar -> throws (does not silently produce nothing)", () => {
  assert.throws(() => generate({ indexPath: "/no/such/system-graph-index.json" }), /not found/);
});

test("sidecar without nodes[] -> throws", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "card-offset-bad-"));
  try {
    const p = path.join(dir, "system-graph-index.json");
    fs.writeFileSync(p, JSON.stringify({ schemaVersion: "1.0.0", inverted: {} }));
    assert.throws(() => generate({ indexPath: p, outDir: dir }), /no nodes/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sidecar whose nodes all fail makeCard -> 0 cards -> throws (no empty index)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "card-offset-empty-"));
  try {
    const indexPath = writeSidecar(dir, [{ id: 42 }, { label: "no id" }]);
    assert.throws(() => generate({ indexPath, outDir: dir }), /0 cards/);
    // and it must NOT have written a partial pair
    assert.equal(fs.existsSync(path.join(dir, "node-cards.jsonl")), false, "no partial jsonl on failure");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
