// scripts/predict-missing-edges.test.mjs — node:test for the path-A CLI consumer.
// Covers the pure functions (splitTypes/parseArgs/predictMissingEdges) AND run() via
// temp-fixture integration tests (injectable io + temp embeddings/edges files) — the
// run() fail-loud branches are the unit's headline feature, so they are pinned here,
// not deferred to live E2E (reviewer arm-A P1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { splitTypes, parseArgs, predictMissingEdges, run } from "./predict-missing-edges.mjs";
import { l2normalize } from "./lib/edge-predict.mjs";
import { edgeKey as candEdgeKey } from "./lib/edge-predict-candidates.mjs";

// ── splitTypes ───────────────────────────────────────────────────────────────
test("splitTypes comma-splits + trims + drops empties", () => {
  assert.deepEqual(splitTypes("wiki,memory_reference, ghost"), ["wiki", "memory_reference", "ghost"]);
  assert.deepEqual(splitTypes("a, ,b"), ["a", "b"]);
  assert.deepEqual(splitTypes("ghost"), ["ghost"]);
});

test("splitTypes empty/non-string → undefined (= no filter)", () => {
  assert.equal(splitTypes(""), undefined);
  assert.equal(splitTypes("   "), undefined);
  assert.equal(splitTypes(null), undefined);
  assert.equal(splitTypes(undefined), undefined);
});

// ── parseArgs ────────────────────────────────────────────────────────────────
test("parseArgs defaults", () => {
  const a = parseArgs([]);
  assert.equal(a.source, "ghost");
  assert.equal(a.target, "wiki,memory_reference,memory_feedback");
  assert.equal(a.top, 50);
  assert.equal(a.min, 0);
  assert.equal(a.json, false);
});

test("parseArgs parses flags", () => {
  const a = parseArgs(["--source", "wiki", "--target", "memory_reference", "--top", "10", "--min", "0.7", "--json"]);
  assert.equal(a.source, "wiki");
  assert.equal(a.target, "memory_reference");
  assert.equal(a.top, 10);
  assert.equal(a.min, 0.7);
  assert.equal(a.json, true);
});

test("parseArgs bad numeric → safe fallback (not NaN)", () => {
  const a = parseArgs(["--top", "notanumber", "--min", "alsobad"]);
  assert.equal(a.top, 50); // fallback
  assert.equal(a.min, 0); // fallback
});

test("parseArgs trailing valueless --out/--embeddings/--edges → defaults (no undefined path → no writeFileSync(undefined) crash)", () => {
  const a = parseArgs(["--out"]); // value past end of argv
  assert.equal(typeof a.out, "string");
  assert.ok(a.out.endsWith("predicted-missing-edges.json"));
  const b = parseArgs(["--embeddings"]);
  assert.ok(typeof b.embeddings === "string" && b.embeddings.endsWith(".jsonl"));
  const c = parseArgs(["--edges"]);
  assert.ok(typeof c.edges === "string" && c.edges.endsWith(".json"));
});

// ── predictMissingEdges ──────────────────────────────────────────────────────
function fixture() {
  // ghost.a aligned with wiki.x (cos~1) ; ghost.b orthogonal to wiki.x (cos 0)
  return new Map([
    ["ghost.a", l2normalize([1, 1])],
    ["ghost.b", l2normalize([1, -1])],
    ["wiki.x", l2normalize([2, 2])], // same direction as ghost.a
    ["wiki.y", l2normalize([1, 0])],
    ["memory_reference.m", l2normalize([0, 1])],
  ]);
}

test("predictMissingEdges ranks ghost→wiki DESC; aligned pair on top", () => {
  const { predictions, gen } = predictMissingEdges(fixture(), new Set(), {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki"],
  });
  assert.equal(gen.candidates.length, 4); // 2 ghost × 2 wiki
  assert.equal(predictions.length, 4);
  assert.deepEqual([predictions[0].u, predictions[0].v], ["ghost.a", "wiki.x"]); // cos~1 highest
  assert.ok(predictions[0].score >= predictions[predictions.length - 1].score); // DESC
});

test("predictMissingEdges excludes an existing edge", () => {
  const existing = new Set([candEdgeKey("ghost.a", "wiki.x"), candEdgeKey("wiki.x", "ghost.a")]);
  const { predictions } = predictMissingEdges(fixture(), existing, {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki"],
  });
  assert.ok(!predictions.some((p) => p.u === "ghost.a" && p.v === "wiki.x"));
  assert.equal(predictions.length, 3); // 4 minus the excluded pair
});

test("predictMissingEdges min-score filter drops low-similarity pairs", () => {
  // orthogonal pairs score sigmoid(0)=0.5; aligned ~sigmoid(1)=0.731. min 0.6 keeps only aligned.
  const { predictions } = predictMissingEdges(fixture(), new Set(), {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki"],
    min: 0.6,
  });
  assert.ok(predictions.every((p) => p.score >= 0.6));
  assert.ok(predictions.some((p) => p.u === "ghost.a" && p.v === "wiki.x"));
  assert.ok(!predictions.some((p) => p.score < 0.6));
});

test("predictMissingEdges top slices to N highest", () => {
  const { predictions } = predictMissingEdges(fixture(), new Set(), {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki", "memory_reference"],
    top: 2,
  });
  assert.equal(predictions.length, 2);
  // top-2 must be the two highest of all ghost→{wiki,memory} candidates
  assert.ok(predictions[0].score >= predictions[1].score);
});

test("predictMissingEdges top:0 → empty predictions (Math.max(0,top) guard)", () => {
  const { predictions } = predictMissingEdges(fixture(), new Set(), {
    sourceTypes: ["ghost"],
    targetTypes: ["wiki"],
    top: 0,
  });
  assert.equal(predictions.length, 0);
});

test("predictMissingEdges requesting absent type → no candidates, empty predictions", () => {
  const { predictions, gen } = predictMissingEdges(fixture(), new Set(), {
    sourceTypes: ["disp"], // no disp.* nodes (the path-B gap)
    targetTypes: ["wiki"],
  });
  assert.equal(gen.srcCount, 0);
  assert.equal(predictions.length, 0);
});

// ── run() integration (temp fixtures + injected io) ──────────────────────────
function tmpFixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "edgepred-"));
  const emb = path.join(dir, "emb.jsonl");
  const edges = path.join(dir, "edges.json");
  const out = path.join(dir, "out.json");
  writeFileSync(
    emb,
    [
      JSON.stringify({ __meta: true, dim: 2 }),
      JSON.stringify({ n: "ghost.a", q: [1, 1] }),
      JSON.stringify({ n: "wiki.x", q: [2, 2] }), // aligned with ghost.a
      JSON.stringify({ n: "wiki.y", q: [1, -1] }), // orthogonal
    ].join("\n"),
  );
  writeFileSync(edges, JSON.stringify({ newEdges: [{ from: "ghost.a", to: "wiki.y", type: "documented-by" }] }));
  return { dir, emb, edges, out };
}
function capIo() {
  const logs = [];
  const errs = [];
  return { io: { log: (...a) => logs.push(a.join(" ")), err: (...a) => errs.push(a.join(" ")) }, logs, errs };
}

test("run() clean run → exit 0, report written w/ honest inputs, predictions present", () => {
  const f = tmpFixture();
  const { io, logs } = capIo();
  try {
    const code = run(["--source", "ghost", "--target", "wiki", "--embeddings", f.emb, "--edges", f.edges, "--out", f.out], io);
    assert.equal(code, 0);
    assert.ok(existsSync(f.out));
    const rep = JSON.parse(readFileSync(f.out, "utf8"));
    assert.equal(rep.schemaVersion, 1);
    assert.equal(rep.inputs.embeddings, 3);
    assert.equal(rep.inputs.existingEdgesLoaded, true);
    assert.ok(rep.predictions.length >= 1); // ghost.a→wiki.x survives (ghost.a→wiki.y excluded)
    assert.ok(!rep.predictions.some((p) => p.u === "ghost.a" && p.v === "wiki.y")); // excluded edge gone
    assert.ok(logs.some((l) => l.includes("predicted")));
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});

test("run() missing embeddings path → exit 1 + FAIL (read-guard, arm-A P1 lock)", () => {
  const { io, errs } = capIo();
  const code = run(["--embeddings", path.join(os.tmpdir(), "__edgepred_nonexistent__.jsonl")], io);
  assert.equal(code, 1);
  assert.ok(errs.some((e) => e.startsWith("FAIL") && e.includes("could not read embeddings")));
});

test("run() zero-node embeddings (meta only) → exit 1 fail-loud", () => {
  const f = tmpFixture();
  writeFileSync(f.emb, JSON.stringify({ __meta: true, dim: 2 })); // header only, no node records
  const { io, errs } = capIo();
  try {
    const code = run(["--embeddings", f.emb, "--edges", f.edges, "--out", f.out], io);
    assert.equal(code, 1);
    assert.ok(errs.some((e) => e.includes("no embeddings")));
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});

test("run() missing edges file → exit 0, existingEdgesLoaded:false + WARN (exclusion OFF surfaced)", () => {
  const f = tmpFixture();
  const { io, errs } = capIo();
  try {
    const code = run(
      ["--source", "ghost", "--target", "wiki", "--embeddings", f.emb, "--edges", path.join(f.dir, "nope.json"), "--out", f.out],
      io,
    );
    assert.equal(code, 0); // missing edges is fail-soft (exclusion off), not fatal
    const rep = JSON.parse(readFileSync(f.out, "utf8"));
    assert.equal(rep.inputs.existingEdgesLoaded, false);
    assert.ok(errs.some((e) => e.includes("exclusion OFF")));
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});

test("run() --json → emits machine-readable inputs (existingEdgesLoaded present)", () => {
  const f = tmpFixture();
  const { io, logs } = capIo();
  try {
    const code = run(
      ["--embeddings", f.emb, "--edges", f.edges, "--out", f.out, "--json", "--source", "ghost", "--target", "wiki"],
      io,
    );
    assert.equal(code, 0);
    const jsonLine = logs.find((l) => l.trim().startsWith("{"));
    assert.ok(jsonLine, "expected a JSON inputs line");
    const inputs = JSON.parse(jsonLine);
    assert.equal(inputs.existingEdgesLoaded, true);
    assert.equal(inputs.embeddings, 3);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
