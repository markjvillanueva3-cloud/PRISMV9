// Tests for measure-codebase-wired-refpool-auroc.mjs -- the pure embeddings-merge helper.
// The eval math is the already-tested nn-graph-eval lib; here we pin the merge invariants the
// non-destructive measurement depends on: one __meta header, id-dedup (base wins), honest counts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeEmbeddingBodies, capPerClass, buildSeparabilityFactorMap } from "./measure-codebase-wired-refpool-auroc.mjs";

const meta = (tag) => JSON.stringify({ __meta: true, model: "nomic", tag });
const row = (id, q = [1, -1]) => JSON.stringify({ id, q, s: 0.01 });

test("mergeEmbeddingBodies -- keeps ONE base __meta, drops new __meta, concatenates rows", () => {
  const base = [meta("base"), row("ghost.unwired.A"), row("ghost.outcome-wired.B")].join("\n");
  const fresh = [meta("new"), row("ghost.codebase-wired.C"), row("ghost.codebase-wired.D")].join("\n");
  const { body, baseCount, newCount, merged } = mergeEmbeddingBodies(base, fresh);
  const lines = body.split("\n").filter(Boolean);
  // exactly one meta line, and it is the BASE one
  const metas = lines.filter((l) => l.startsWith('{"__meta'));
  assert.equal(metas.length, 1, "exactly one __meta header survives");
  assert.ok(metas[0].includes('"tag":"base"'), "the surviving meta is the base's");
  assert.equal(baseCount, 2);
  assert.equal(newCount, 2);
  assert.equal(merged, 4);
  // ordering: base rows precede new rows
  const ids = lines.filter((l) => !l.startsWith('{"__meta')).map((l) => JSON.parse(l).id);
  assert.deepEqual(ids, ["ghost.unwired.A", "ghost.outcome-wired.B", "ghost.codebase-wired.C", "ghost.codebase-wired.D"]);
});

test("mergeEmbeddingBodies -- id dedup: a deployed embedding is NEVER overwritten by a fresh one", () => {
  const base = [meta("base"), row("ghost.dup.X", [9, 9])].join("\n");
  const fresh = [meta("new"), row("ghost.dup.X", [-9, -9]), row("ghost.new.Y")].join("\n");
  const { body, baseCount, newCount, merged } = mergeEmbeddingBodies(base, fresh);
  assert.equal(baseCount, 1);
  assert.equal(newCount, 1, "the duplicate X from the new side is dropped (base wins), only Y counts");
  assert.equal(merged, 2);
  // the surviving X row carries the BASE vector, not the fresh one
  const xRow = body.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return {}; } }).find((o) => o.id === "ghost.dup.X");
  assert.deepEqual(xRow.q, [9, 9], "base embedding preserved verbatim");
});

test("mergeEmbeddingBodies -- skips blank + unparseable lines, tolerates a meta-less base", () => {
  const base = [row("ghost.A"), "", "   ", "{not json", row("ghost.B")].join("\n");
  const fresh = ["", row("ghost.C")].join("\n");
  const { body, baseCount, newCount, merged } = mergeEmbeddingBodies(base, fresh);
  assert.equal(baseCount, 2, "blank + garbage lines skipped");
  assert.equal(newCount, 1);
  assert.equal(merged, 3);
  // no __meta in either input -> none fabricated
  assert.equal(body.split("\n").filter((l) => l.startsWith('{"__meta')).length, 0);
});

test("mergeEmbeddingBodies -- empty inputs yield an empty-but-valid body", () => {
  const { body, baseCount, newCount, merged } = mergeEmbeddingBodies("", "");
  assert.equal(baseCount, 0);
  assert.equal(newCount, 0);
  assert.equal(merged, 0);
  assert.equal(body.trim(), "");
});

// capPerClass -- balanced per-dispatcher subset selection (the #14 density-test lever).
const G = (id, cls) => ({ node: { id, proposed_wiring: cls } });
const GHOSTS = [G("A0", "prism_a"), G("A1", "prism_a"), G("A2", "prism_a"), G("B0", "prism_b"), G("B1", "prism_b"), G("C0", "prism_c")];

test("capPerClass -- keeps at most N per class, in input order", () => {
  const ids = (n) => capPerClass(GHOSTS, n).map((g) => g.node.id);
  assert.deepEqual(ids(2), ["A0", "A1", "B0", "B1", "C0"], "2 per class: A capped to 2, B both, C its 1");
  assert.deepEqual(ids(1), ["A0", "B0", "C0"], "1 per class: first of each");
  assert.deepEqual(ids(99), ["A0", "A1", "A2", "B0", "B1", "C0"], "cap above any class size keeps all");
});

test("capPerClass -- n<=0 / non-integer returns a COPY of every ghost (no cap)", () => {
  for (const bad of [0, -1, 2.5, NaN, undefined]) {
    const out = capPerClass(GHOSTS, bad);
    assert.equal(out.length, GHOSTS.length, `n=${bad} -> no cap`);
  }
  const copy = capPerClass(GHOSTS, 0);
  assert.notEqual(copy, GHOSTS, "returns a new array, not the input reference");
});

test("capPerClass -- empty / nullish ghost list is safe", () => {
  assert.deepEqual(capPerClass([], 3), []);
  assert.deepEqual(capPerClass(undefined, 3), []);
});

// buildSeparabilityFactorMap -- per-class margin -> vote factor (the U-GNN-SEP-VOTE-WEIGHT policy).
const labeledRows = (...rows) => rows.map((r) => JSON.stringify(r)).join("\n");

test("buildSeparabilityFactorMap -- boosts a well-separated class; k=0 -> all 1; unmapped excluded", () => {
  // prism_a clusters at [1,0], prism_b at [0,1] (orthogonal) -> margin ~1; Z1 has no dispatcher.
  const rows = labeledRows(
    { id: "ghost.codebase-wired.A1", n: "A1", q: [1, 0], s: 1 },
    { id: "ghost.codebase-wired.A2", n: "A2", q: [1, 0], s: 1 },
    { id: "ghost.codebase-wired.B1", n: "B1", q: [0, 1], s: 1 },
    { id: "ghost.codebase-wired.B2", n: "B2", q: [0, 1], s: 1 },
    { id: "ghost.codebase-wired.Z1", n: "Z1", q: [1, 1], s: 1 },
  );
  const e2d = new Map([["A1", "prism_a"], ["A2", "prism_a"], ["B1", "prism_b"], ["B2", "prism_b"]]);
  const m = buildSeparabilityFactorMap(rows, e2d, 1, 2);
  assert.equal(m.size, 2, "only mapped classes with >= minClass members (Z1 unmapped excluded)");
  // orthogonal clusters: intra ~1, inter ~0 -> margin ~1 -> factor = 1 + 1*1 ~ 2.
  assert.ok(m.get("prism_a") > 1.5, `separable class boosted (${m.get("prism_a")})`);
  assert.ok(m.get("prism_b") > 1.5);
  const m0 = buildSeparabilityFactorMap(rows, e2d, 0, 2);
  assert.ok(Math.abs(m0.get("prism_a") - 1) < 1e-9, "k=0 -> factor 1 (no-op)");
});

test("buildSeparabilityFactorMap -- entangled class ~1 (no boost); empty / unmapped inputs yield an empty map", () => {
  // Both classes share the SAME direction -> intra == inter -> margin ~0 -> factor ~1 even at high k.
  const rows = labeledRows(
    { id: "x.A1", n: "A1", q: [1, 0], s: 1 },
    { id: "x.A2", n: "A2", q: [1, 0], s: 1 },
    { id: "x.B1", n: "B1", q: [1, 0], s: 1 },
    { id: "x.B2", n: "B2", q: [1, 0], s: 1 },
  );
  const e2d = new Map([["A1", "prism_a"], ["A2", "prism_a"], ["B1", "prism_b"], ["B2", "prism_b"]]);
  for (const v of buildSeparabilityFactorMap(rows, e2d, 10, 2).values()) {
    assert.ok(Math.abs(v - 1) < 0.01, `entangled class stays ~1 even at k=10 (${v})`);
  }
  assert.equal(buildSeparabilityFactorMap("", e2d, 1, 2).size, 0, "no rows -> empty");
  assert.equal(buildSeparabilityFactorMap(rows, new Map(), 1, 2).size, 0, "no dispatcher mapping -> empty");
});
