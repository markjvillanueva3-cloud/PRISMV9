#!/usr/bin/env node
/**
 * graph-random-walk.test.mjs — real node2vec invariants, no stubs.
 * Run: node --test scripts/lib/graph-random-walk.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  mulberry32,
  buildAdjacency,
  node2vecWalk,
  collectWalks,
  generateWalks,
  DEFAULTS,
} from "./graph-random-walk.mjs";

// path graph A-B-C-D-E (undirected)
const PATH = {
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }],
  edges: [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "D" },
    { source: "D", target: "E" },
  ],
};

describe("mulberry32", () => {
  test("deterministic for a fixed seed", () => {
    const a = mulberry32(42), b = mulberry32(42);
    const sa = [a(), a(), a()], sb = [b(), b(), b()];
    assert.deepEqual(sa, sb);
  });
  test("different seeds → different streams", () => {
    const a = mulberry32(1), b = mulberry32(2);
    assert.notEqual(a(), b());
  });
  test("output always in [0,1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1, `v=${v}`); }
  });
  test("seed 0 does not lock the stream (handled as 1)", () => {
    const r = mulberry32(0);
    assert.ok(r() !== r()); // advances, not stuck
  });
});

describe("buildAdjacency", () => {
  test("undirected symmetry", () => {
    const { adj, nbrSet } = buildAdjacency(PATH);
    assert.deepEqual([...adj.get("A")], ["B"]);
    assert.ok(nbrSet.get("B").has("A") && nbrSet.get("B").has("C"));
  });
  test("directed mode keeps only forward edges", () => {
    const { adj } = buildAdjacency(PATH, { undirected: false });
    assert.deepEqual([...adj.get("A")], ["B"]);
    assert.deepEqual([...adj.get("B")], ["C"]);
  });
  test("self-loops dropped", () => {
    const { adj } = buildAdjacency({ nodes: [{ id: "X" }], edges: [{ source: "X", target: "X" }] });
    assert.equal(adj.get("X").length, 0);
  });
  test("duplicate edges deduped", () => {
    const { adj } = buildAdjacency({
      nodes: [{ id: "X" }, { id: "Y" }],
      edges: [{ source: "X", target: "Y" }, { source: "X", target: "Y" }],
    });
    assert.equal(adj.get("X").length, 1);
  });
  test("edges to unknown nodes are skipped", () => {
    const { adj } = buildAdjacency({ nodes: [{ id: "X" }], edges: [{ source: "X", target: "ZZ" }] });
    assert.equal(adj.get("X").length, 0);
  });
  test("maxNodes truncation sets the flag and caps nodes", () => {
    const big = { nodes: Array.from({ length: 10 }, (_, i) => ({ id: `n${i}` })), edges: [] };
    const { nodeIds, truncated } = buildAdjacency(big, { maxNodes: 4 });
    assert.equal(truncated, true);
    assert.equal(nodeIds.length, 4);
  });
  test("non-object / empty inputs → empty adjacency (never throws)", () => {
    for (const g of [null, undefined, 42, {}, { nodes: [] }]) {
      const r = buildAdjacency(g);
      assert.equal(r.nodeIds.length, 0);
      assert.equal(r.truncated, false);
      assert.equal(r.edgeCount, 0);
    }
  });

  // TRIPWIRE: the live producer (system-graph-normalized.json) keys edges as
  // {from,to,type,status,intensity,rawType} — NOT {source,target}. Reading
  // only source/target silently empties the corpus (the P0 caught in review).
  // This fixture is the exact real shape; it must build a non-empty graph.
  test("real-producer edge shape {from,to,...} builds a non-empty graph", () => {
    const real = {
      nodes: [{ id: "wt.prism" }, { id: "wt.root" }, { id: "engine.Foo" }],
      edges: [
        { from: "wt.prism", to: "wt.root", type: "ghost-wire", status: "ok", intensity: 0.5, rawType: "x" },
        { from: "engine.Foo", to: "wt.prism", type: "imports", status: "ok", intensity: 1, rawType: "import" },
      ],
    };
    const { adj, edgeCount } = buildAdjacency(real);
    assert.ok(edgeCount > 0, "edgeCount must be > 0 for {from,to} edges");
    assert.ok(adj.get("wt.prism").length > 0, "wt.prism must have neighbors");
    const walks = collectWalks(real, { walksPerNode: 1, walkLength: 4, seed: 1 });
    assert.ok(walks.length > 0, "corpus must be non-empty for the real edge shape");
  });

  test("source/target schema still works (back-compat)", () => {
    const { edgeCount } = buildAdjacency(PATH);
    assert.ok(edgeCount > 0);
  });
});

describe("node2vecWalk — structural correctness", () => {
  const { adj, nbrSet } = buildAdjacency(PATH);

  test("walk never exceeds walkLength and starts at start", () => {
    const w = node2vecWalk(adj, nbrSet, "A", { p: 1, q: 1, walkLength: 5 }, mulberry32(1));
    assert.equal(w[0], "A");
    assert.ok(w.length <= 5);
  });
  test("every step is a real edge", () => {
    const w = node2vecWalk(adj, nbrSet, "C", { p: 1, q: 1, walkLength: 20 }, mulberry32(3));
    for (let i = 1; i < w.length; i++) {
      assert.ok(nbrSet.get(w[i - 1]).has(w[i]), `${w[i-1]}→${w[i]} not an edge`);
    }
  });
  test("isolated node → walk of just itself", () => {
    const iso = buildAdjacency({ nodes: [{ id: "L" }], edges: [] });
    const w = node2vecWalk(iso.adj, iso.nbrSet, "L", { p: 1, q: 1, walkLength: 10 }, mulberry32(1));
    assert.deepEqual(w, ["L"]);
  });
  test("start not in graph → empty walk", () => {
    assert.deepEqual(node2vecWalk(adj, nbrSet, "NOPE", { p: 1, q: 1, walkLength: 5 }, mulberry32(1)), []);
  });
  test("deterministic for a fixed seed", () => {
    const w1 = node2vecWalk(adj, nbrSet, "A", { p: 2, q: 3, walkLength: 30 }, mulberry32(99));
    const w2 = node2vecWalk(adj, nbrSet, "A", { p: 2, q: 3, walkLength: 30 }, mulberry32(99));
    assert.deepEqual(w1, w2);
  });

  // The load-bearing node2vec invariant: small p ⇒ more backtracking.
  test("p bias: tiny p backtracks far more than huge p", () => {
    const countBacktracks = (p) => {
      let bt = 0, steps = 0;
      for (let s = 0; s < 60; s++) {
        const w = node2vecWalk(adj, nbrSet, "C", { p, q: 1, walkLength: 40 }, mulberry32(s + 1));
        for (let i = 2; i < w.length; i++) { steps++; if (w[i] === w[i - 2]) bt++; }
      }
      return bt / Math.max(1, steps);
    };
    const lowP = countBacktracks(0.01);  // 1/p huge → return strongly favored
    const highP = countBacktracks(100);  // 1/p ~0 → return strongly suppressed
    assert.ok(lowP > highP + 0.15, `expected lowP(${lowP.toFixed(3)}) >> highP(${highP.toFixed(3)})`);
  });

  // q bias: on a graph with a dist-2 escape, huge q suppresses outward moves.
  test("q bias: tiny q explores outward more than huge q", () => {
    // star-ish: H connected to A,B,C,D; plus a chain A-A2 so 'outward' (dist-2) exists
    const g = {
      nodes: ["H", "A", "B", "C", "A2"].map((id) => ({ id })),
      edges: [
        { source: "H", target: "A" }, { source: "H", target: "B" },
        { source: "H", target: "C" }, { source: "A", target: "A2" },
      ],
    };
    const { adj: a2, nbrSet: n2 } = buildAdjacency(g);
    const reachA2 = (q) => {
      let hits = 0;
      for (let s = 0; s < 80; s++) {
        const w = node2vecWalk(a2, n2, "H", { p: 1, q, walkLength: 12 }, mulberry32(s + 1));
        if (w.includes("A2")) hits++;
      }
      return hits;
    };
    assert.ok(reachA2(0.05) >= reachA2(50), `tiny q should reach the outward node at least as often`);
  });
});

describe("generateWalks / collectWalks", () => {
  test("isolated nodes produce no walks (length-1 filtered)", () => {
    const g = { nodes: [{ id: "X" }, { id: "Y" }, { id: "Z" }], edges: [{ source: "X", target: "Y" }] };
    const walks = collectWalks(g, { walksPerNode: 1, walkLength: 5, seed: 1 });
    assert.ok(walks.every((w) => w.length >= 2));
    assert.ok(walks.every((w) => !w.includes("Z")), "isolated Z must not start a kept walk");
  });
  test("walksPerNode multiplies the corpus deterministically", () => {
    const one = collectWalks(PATH, { walksPerNode: 1, walkLength: 10, seed: 5 });
    const three = collectWalks(PATH, { walksPerNode: 3, walkLength: 10, seed: 5 });
    assert.ok(three.length > one.length);
    const a = collectWalks(PATH, { walksPerNode: 2, walkLength: 10, seed: 5 });
    const b = collectWalks(PATH, { walksPerNode: 2, walkLength: 10, seed: 5 });
    assert.deepEqual(a, b);
  });
  test("onTruncate fires when graph exceeds maxNodes", () => {
    let cb = -1;
    const big = { nodes: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}` })), edges: [] };
    [...generateWalks(big, { maxNodes: 3, walksPerNode: 1, walkLength: 2, onTruncate: (n) => { cb = n; } })];
    assert.equal(cb, 3);
  });
  test("generator is lazy (can take just the first walk)", () => {
    const it = generateWalks(PATH, { walksPerNode: 99, walkLength: 8, seed: 2 });
    const first = it.next();
    assert.equal(first.done, false);
    assert.ok(Array.isArray(first.value) && first.value.length >= 2);
  });

  // R12 fail-loud: nodes but zero edges (schema drift) must NOT silently
  // yield an empty corpus the embedder would train on blindly.
  test("nodes-but-zero-edges THROWS by default (silent-empty tripwire)", () => {
    const wrong = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [{ lhs: "A", rhs: "B" }], // neither schema → 0 edges built
    };
    assert.throws(() => collectWalks(wrong, { walksPerNode: 1, walkLength: 3 }), /0 edges built/);
  });
  test("onEmpty handler opts out of the throw and receives the diagnostic", () => {
    const wrong = { nodes: [{ id: "A" }], edges: [{ x: 1 }] };
    let seen = null;
    const walks = [...generateWalks(wrong, { walksPerNode: 1, walkLength: 3, onEmpty: (d) => { seen = d; } })];
    assert.deepEqual(seen, { nodeIds: 1, edgeCount: 0 });
    assert.equal(walks.length, 0);
  });
  test("a truly empty graph (no nodes) does NOT trip the guard", () => {
    assert.doesNotThrow(() => collectWalks({ nodes: [], edges: [] }, { walksPerNode: 1, walkLength: 3 }));
  });
});

describe("param validation — failure & adversarial", () => {
  const bad = (opts) => assert.throws(() => collectWalks(PATH, opts), RangeError);
  test("p <= 0 throws", () => { bad({ p: 0 }); bad({ p: -1 }); });
  test("q <= 0 throws", () => { bad({ q: 0 }); bad({ q: -3 }); });
  test("NaN / Infinity p or q throw (adversarial)", () => {
    bad({ p: NaN }); bad({ q: Infinity }); bad({ p: -Infinity });
  });
  test("non-integer / <1 walkLength & walksPerNode throw", () => {
    bad({ walkLength: 0 }); bad({ walkLength: 2.5 }); bad({ walksPerNode: 0 }); bad({ walksPerNode: -2 });
  });
  test("defaults are sane and frozen", () => {
    assert.equal(DEFAULTS.p, 1.0);
    assert.equal(DEFAULTS.q, 1.0);
    assert.ok(Object.isFrozen(DEFAULTS));
    assert.throws(() => { DEFAULTS.p = 5; }, TypeError);
  });
  test("valid params do not throw and produce a corpus", () => {
    const w = collectWalks(PATH, { p: 0.5, q: 2, walkLength: 6, walksPerNode: 2, seed: 11 });
    assert.ok(w.length > 0 && w.every((x) => x.length >= 2));
  });
});
