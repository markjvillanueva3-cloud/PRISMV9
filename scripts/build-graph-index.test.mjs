/**
 * build-graph-index.test.mjs — node:test suite for the master-index sidecar
 * generator (U-MASTER-INDEX-SIDECAR, File 2 of 5).
 *
 * Coverage:
 *  - sidecar shape + schemaVersion
 *  - posting integrity (every index valid; no duplicates)
 *  - tokenize parity — sidecar `inverted` === what loadGraph builds (gold check)
 *  - compact node shape (searchGraphHits-consumed: knowledge.{wikiEntries,…})
 *  - null / idless / non-string-id node skip
 *  - atomic write (temp gone, output valid JSON)
 *  - fail-loud: missing graph / no nodes[] / 0 indexed / mass-skip
 *  - mass-skip knob (PRISM_BUILD_GRAPH_INDEX_MIN_RATIO=0 disables the floor)
 *  - prototype-safe inverted keys (`constructor` token round-trips)
 *  - CLI: real-fs E2E (NO_REEXEC fast path) + heap re-exec path + exit codes
 *
 * Run: node --test scripts/build-graph-index.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildGraphIndex, writeSidecar, generate,
  SIDECAR_SCHEMA_VERSION, EXIT_OK, EXIT_FAIL,
} from "./build-graph-index.mjs";
import { loadGraph, tokenize, _resetCachesForTests } from "./lib/master-index-search-lib.mjs";

const SCRIPT = fileURLToPath(new URL("./build-graph-index.mjs", import.meta.url));

// ── fixtures ──────────────────────────────────────────────────────────────

/** Representative graph: normal nodes, knowledge (object + string entries),
 *  a knowledge-less node, a node carrying the `constructor` token, plus the
 *  three skip cases (null, missing id, non-string id). */
const FIXTURE_GRAPH = {
  schemaVersion: "2.1.0",
  nodes: [
    {
      id: "eng.kienzle", label: "Kienzle Force Engine", layer: "L7", status: "built",
      info: "computes cutting force",
      knowledge: { wikiEntries: ["kienzle-model"], memoryEntries: [{ name: "ref-kienzle" }] },
    },
    { id: "eng.taylor", label: "Taylor Wear Engine", layer: "L7", status: "built", info: "tool life prediction" },
    { id: "disp.calc", label: "Calc Dispatcher", layer: "L4", status: "built" },
    { id: "node.proto", label: "Proto Node", layer: "L8", info: "constructor pattern sample" },
    { id: "node.plain", label: "Plain Node", layer: "L8" },
    null,                                       // skip — null
    { label: "no id here", layer: "L8" },       // skip — missing id
    { id: 42, label: "numeric id node" },       // skip — non-string id
  ],
  edges: [],
};
const FIXTURE_RAW = FIXTURE_GRAPH.nodes.length;   // 8
const FIXTURE_INDEXED = 5;                        // 8 − 3 skipped

// ── temp-dir harness ──────────────────────────────────────────────────────

let DIR;
test.beforeEach(() => { DIR = mkdtempSync(join(tmpdir(), "bgi-")); _resetCachesForTests(); });
test.afterEach(() => { try { rmSync(DIR, { recursive: true, force: true }); } catch { /* best effort */ } });

function writeGraph(obj, name = "system-graph.json") {
  const p = join(DIR, name);
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

/** MIRRORS build-graph-index's blob construction — independent parity oracle. */
function oracleEntryName(e) {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    if (typeof e.name === "string") return e.name;
    if (typeof e.path === "string") return e.path;
  }
  return "";
}
function oracleBlob(n) {
  const w = Array.isArray(n.knowledge?.wikiEntries) ? n.knowledge.wikiEntries : [];
  const m = Array.isArray(n.knowledge?.memoryEntries) ? n.knowledge.memoryEntries : [];
  return `${n.id} ${n.label ?? ""} ${n.info ?? ""} `
    + `${w.map(oracleEntryName).join(" ")} ${m.map(oracleEntryName).join(" ")}`;
}

// ── buildGraphIndex — shape ───────────────────────────────────────────────

test("buildGraphIndex: sidecar carries the documented schema fields", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH, { sourceMtimeMs: 123, sourceSizeBytes: 456 });
  assert.equal(s.schemaVersion, SIDECAR_SCHEMA_VERSION);
  assert.equal(s.schemaVersion, "1.0.0");
  assert.equal(typeof s.generatedAt, "string");
  assert.ok(!Number.isNaN(Date.parse(s.generatedAt)), "generatedAt is an ISO date");
  assert.equal(s.sourceMtimeMs, 123);
  assert.equal(s.sourceSizeBytes, 456);
  assert.ok(Array.isArray(s.nodes));
  assert.equal(typeof s.inverted, "object");
});

test("buildGraphIndex: skips null / id-less / non-string-id nodes", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  assert.equal(s.nodeCount, FIXTURE_INDEXED);
  assert.equal(s.nodes.length, FIXTURE_INDEXED);
  assert.equal(s.nodeCount, s.nodes.length, "nodeCount === nodes.length");
  for (const n of s.nodes) assert.equal(typeof n.id, "string");
  assert.ok(!s.nodes.some((n) => n.id === "no id here" || n.id === 42));
});

test("buildGraphIndex: compact node uses searchGraphHits' knowledge.* shape", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  const kienzle = s.nodes.find((n) => n.id === "eng.kienzle");
  assert.ok(kienzle.knowledge, "knowledge object present when entries exist");
  assert.deepEqual(kienzle.knowledge.wikiEntries, ["kienzle-model"]);
  // {name:"ref-kienzle"} → entryName-extracted to the bare string.
  assert.deepEqual(kienzle.knowledge.memoryEntries, ["ref-kienzle"]);
  assert.equal(kienzle.label, "Kienzle Force Engine");
  assert.equal(kienzle.layer, "L7");
  assert.equal(kienzle.status, "built");
  assert.equal(kienzle.info, "computes cutting force");
});

test("buildGraphIndex: omits knowledge entirely when a node has no entries", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  const plain = s.nodes.find((n) => n.id === "node.plain");
  assert.equal(plain.knowledge, undefined);
  assert.equal("knowledge" in plain, false);
});

test("buildGraphIndex: throws when the graph has no nodes[] array", () => {
  assert.throws(() => buildGraphIndex({}), /no nodes/);
  assert.throws(() => buildGraphIndex(null), /no nodes/);
  assert.throws(() => buildGraphIndex({ nodes: "x" }), /no nodes/);
});

// ── buildGraphIndex — postings ────────────────────────────────────────────

test("buildGraphIndex: every posting index is a valid slot in nodes[]", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  for (const [tok, idxs] of Object.entries(s.inverted)) {
    assert.ok(Array.isArray(idxs) && idxs.length > 0, `posting for ${tok} non-empty`);
    for (const i of idxs) {
      assert.ok(Number.isInteger(i) && i >= 0 && i < s.nodes.length,
        `index ${i} for token ${tok} in range`);
    }
  }
});

test("buildGraphIndex: a posting holds no duplicate index (tokenize dedups)", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  for (const [tok, idxs] of Object.entries(s.inverted)) {
    assert.equal(new Set(idxs).size, idxs.length, `no dup index in posting for ${tok}`);
  }
});

test("buildGraphIndex: tokenize parity — each blob token maps back to its node", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  for (const raw of FIXTURE_GRAPH.nodes) {
    if (!raw || typeof raw.id !== "string") continue;
    const idx = s.nodes.findIndex((n) => n.id === raw.id);
    assert.ok(idx >= 0, `${raw.id} indexed`);
    for (const tok of tokenize(oracleBlob(raw), { maxTokens: Number.MAX_SAFE_INTEGER, maxLen: Number.MAX_SAFE_INTEGER })) {
      assert.ok(s.inverted[tok]?.includes(idx),
        `token "${tok}" of ${raw.id} present in posting`);
    }
  }
});

test("buildGraphIndex: prototype-named token survives (Object.create(null))", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  // "constructor" appears in node.proto's info; on a normal object the key
  // would collide with Object.prototype.constructor.
  assert.ok(Object.keys(s.inverted).includes("constructor"));
  const idx = s.nodes.findIndex((n) => n.id === "node.proto");
  assert.ok(s.inverted.constructor.includes(idx));
});

// ── gold parity: sidecar inverted === loadGraph inverted ──────────────────

test("parity: sidecar `inverted` is identical to loadGraph's index", () => {
  const graphPath = writeGraph(FIXTURE_GRAPH);
  const libGraph = loadGraph(graphPath);
  assert.ok(libGraph, "loadGraph loaded the fixture");

  const s = buildGraphIndex(FIXTURE_GRAPH);
  // Rebuild the sidecar's token → node-id sets.
  const sidecarIndex = new Map();
  for (const [tok, idxs] of Object.entries(s.inverted)) {
    sidecarIndex.set(tok, new Set(idxs.map((i) => s.nodes[i].id)));
  }

  assert.deepEqual(
    new Set(sidecarIndex.keys()), new Set(libGraph.inverted.keys()),
    "same token vocabulary",
  );
  for (const [tok, libIds] of libGraph.inverted) {
    assert.deepEqual(sidecarIndex.get(tok), libIds, `posting for "${tok}" matches loadGraph`);
  }
});

// ── writeSidecar — atomic write ───────────────────────────────────────────

test("writeSidecar: writes valid JSON and leaves no temp file", () => {
  const s = buildGraphIndex(FIXTURE_GRAPH);
  const out = join(DIR, "system-graph-index.json");
  const bytes = writeSidecar(s, out);
  assert.ok(bytes > 0);
  assert.ok(existsSync(out));
  const parsed = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(parsed.nodeCount, FIXTURE_INDEXED);
  assert.equal(readdirSync(DIR).filter((f) => f.includes(".tmp.")).length, 0,
    "no leftover temp file");
});

// ── generate — happy path + fail-loud ─────────────────────────────────────

test("generate: produces a fresh sidecar with stat-derived metadata", () => {
  const graphPath = writeGraph(FIXTURE_GRAPH);
  const out = join(DIR, "idx.json");
  const r = generate({ graphPath, outPath: out });
  assert.equal(r.nodeCount, FIXTURE_INDEXED);
  assert.equal(r.rawNodeCount, FIXTURE_RAW);
  assert.equal(r.skipped, FIXTURE_RAW - FIXTURE_INDEXED);
  assert.ok(r.tokenCount > 0);
  assert.ok(r.sidecarBytes > 0);

  const sidecar = JSON.parse(readFileSync(out, "utf8"));
  assert.ok(sidecar.sourceMtimeMs > 0, "sourceMtimeMs from statSync");
  assert.ok(sidecar.sourceSizeBytes > 0, "sourceSizeBytes from statSync");
  assert.equal(sidecar.sourceGraph, "system-graph.json");
});

test("generate: idempotent — two runs yield the same node/token counts", () => {
  const graphPath = writeGraph(FIXTURE_GRAPH);
  const a = generate({ graphPath, outPath: join(DIR, "a.json") });
  const b = generate({ graphPath, outPath: join(DIR, "b.json") });
  assert.equal(a.nodeCount, b.nodeCount);
  assert.equal(a.tokenCount, b.tokenCount);
});

test("generate: throws (fail-loud) when the graph file is missing", () => {
  assert.throws(() => generate({ graphPath: join(DIR, "nope.json"), outPath: join(DIR, "o.json") }),
    /not found/);
});

test("generate: throws on a graph with no nodes[] array", () => {
  const graphPath = writeGraph({ schemaVersion: "2.1.0", edges: [] });
  assert.throws(() => generate({ graphPath, outPath: join(DIR, "o.json") }), /no nodes/);
});

test("generate: throws on a 0-node graph (refuses an empty sidecar)", () => {
  const graphPath = writeGraph({ nodes: [] });
  assert.throws(() => generate({ graphPath, outPath: join(DIR, "o.json") }), /0 nodes|no nodes/);
});

test("generate: throws on mass-skip (indexed below the floor ratio)", () => {
  // 1 string-id node + 9 numeric-id nodes → indexed 1 / raw 10 = 0.1 < 0.5.
  const massSkip = { nodes: [{ id: "ok" }, ...Array.from({ length: 9 }, (_, i) => ({ id: i }))] };
  const graphPath = writeGraph(massSkip);
  assert.throws(() => generate({ graphPath, outPath: join(DIR, "o.json") }),
    /1\/10 nodes indexed|floor/);
});

test("generate: PRISM_BUILD_GRAPH_INDEX_MIN_RATIO=0 disables the mass-skip floor", () => {
  const massSkip = { nodes: [{ id: "ok" }, ...Array.from({ length: 9 }, (_, i) => ({ id: i }))] };
  const graphPath = writeGraph(massSkip);
  const prev = process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO;
  process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO = "0";
  try {
    const r = generate({ graphPath, outPath: join(DIR, "o.json") });
    assert.equal(r.nodeCount, 1, "1-node sidecar written when floor disabled");
  } finally {
    if (prev === undefined) delete process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO;
    else process.env.PRISM_BUILD_GRAPH_INDEX_MIN_RATIO = prev;
  }
});

// ── CLI — real-fs E2E ─────────────────────────────────────────────────────

test("CLI: --graph/--out generates a sidecar and exits 0 (NO_REEXEC fast path)", () => {
  const graphPath = writeGraph(FIXTURE_GRAPH);
  const out = join(DIR, "cli-idx.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--graph", graphPath, "--out", out], {
    encoding: "utf8",
    env: { ...process.env, PRISM_BUILD_GRAPH_INDEX_NO_REEXEC: "1" },
  });
  assert.equal(r.status, EXIT_OK, `stderr: ${r.stderr}`);
  assert.ok(existsSync(out));
  const sidecar = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(sidecar.nodeCount, FIXTURE_INDEXED);
  assert.match(r.stdout, /✓/);
});

test("CLI: missing graph exits non-zero with a stderr diagnostic", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--graph", join(DIR, "absent.json"), "--out", join(DIR, "o.json")], {
    encoding: "utf8",
    env: { ...process.env, PRISM_BUILD_GRAPH_INDEX_NO_REEXEC: "1" },
  });
  assert.equal(r.status, EXIT_FAIL);
  assert.match(r.stderr, /✗|not found/);
});

test("CLI: heap re-exec path still produces a correct sidecar", () => {
  // No NO_REEXEC knob → main() re-execs itself with --max-old-space-size.
  // The grandchild must still write a valid sidecar and the exit code must
  // propagate back through the re-exec.
  const graphPath = writeGraph(FIXTURE_GRAPH);
  const out = join(DIR, "reexec-idx.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--graph", graphPath, "--out", out], {
    encoding: "utf8",
  });
  assert.equal(r.status, EXIT_OK, `stderr: ${r.stderr}`);
  assert.ok(existsSync(out));
  assert.equal(JSON.parse(readFileSync(out, "utf8")).nodeCount, FIXTURE_INDEXED);
});

// ── module import has no side effect ──────────────────────────────────────

test("module exports are present and importing ran no CLI side effect", () => {
  assert.equal(typeof buildGraphIndex, "function");
  assert.equal(typeof writeSidecar, "function");
  assert.equal(typeof generate, "function");
  assert.equal(EXIT_OK, 0);
  assert.equal(EXIT_FAIL, 1);
  // If main() had fired on import it would have re-exec'd / exited the
  // process — the suite would not be running. Reaching here proves the
  // import.meta.url guard held.
  assert.ok(true);
});
