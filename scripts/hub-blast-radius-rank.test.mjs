/**
 * hub-blast-radius-rank tests -- exact blast-radius counts on synthetic graphs
 * (chains, stars, cycles, diamonds) + ranking order + candidate filtering.
 *
 * DISCOVERY-EFFICIENCY/U-HUB-BLAST-RADIUS-RANK (slot:tango, 2026-06-15).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildForwardAdjacency,
  blastRadius,
  defaultCandidateFilter,
  rankHubsByBlastRadius,
} from "./hub-blast-radius-rank.mjs";

const edge = (from, to) => ({ from, to, type: "calls", status: "active" });
const chain = (...ids) => ids.slice(0, -1).map((id, i) => edge(id, ids[i + 1]));

// -- buildForwardAdjacency --

test("buildForwardAdjacency: maps from -> to[] for valid edges", () => {
  const fwd = buildForwardAdjacency([edge("A", "B"), edge("A", "C"), edge("B", "C")]);
  assert.deepEqual(fwd.get("A"), ["B", "C"]);
  assert.deepEqual(fwd.get("B"), ["C"]);
  assert.equal(fwd.get("C"), undefined);
});

test("buildForwardAdjacency: skips self-loops and malformed edges", () => {
  const fwd = buildForwardAdjacency([
    edge("A", "A"),                 // self-loop -> skipped
    { from: "A" },                  // missing to -> skipped
    { to: "B" },                    // missing from -> skipped
    null,                           // null -> skipped
    edge("A", "B"),                 // kept
  ]);
  assert.deepEqual(fwd.get("A"), ["B"]);
});

test("buildForwardAdjacency: non-array input -> empty map", () => {
  assert.equal(buildForwardAdjacency(null).size, 0);
  assert.equal(buildForwardAdjacency(undefined).size, 0);
  assert.equal(buildForwardAdjacency("nope").size, 0);
});

// -- blastRadius (exact counts) --

test("blastRadius: linear chain A->B->C->D at depth 3 = 3 reachable", () => {
  const fwd = buildForwardAdjacency(chain("A", "B", "C", "D"));
  assert.equal(blastRadius(fwd, "A", 3), 3);
  assert.equal(blastRadius(fwd, "B", 3), 2);
  assert.equal(blastRadius(fwd, "C", 3), 1);
  assert.equal(blastRadius(fwd, "D", 3), 0);
});

test("blastRadius: star hub H->{x1..x5} = 5; leaves = 0", () => {
  const fwd = buildForwardAdjacency(["x1", "x2", "x3", "x4", "x5"].map((x) => edge("H", x)));
  assert.equal(blastRadius(fwd, "H", 3), 5);
  assert.equal(blastRadius(fwd, "x1", 3), 0);
});

test("blastRadius: depth bound truncates reach (chain of 6, depth 2 = 2)", () => {
  const fwd = buildForwardAdjacency(chain("A", "B", "C", "D", "E", "F"));
  assert.equal(blastRadius(fwd, "A", 2), 2);
  assert.equal(blastRadius(fwd, "A", 5), 5);
});

test("blastRadius: cycle A->B->C->A is finite (no infinite loop)", () => {
  const fwd = buildForwardAdjacency([edge("A", "B"), edge("B", "C"), edge("C", "A")]);
  assert.equal(blastRadius(fwd, "A", 10), 2); // B, C reachable; A is the start
});

test("blastRadius: diamond A->B,A->C,B->D,C->D counts D once", () => {
  const fwd = buildForwardAdjacency([edge("A", "B"), edge("A", "C"), edge("B", "D"), edge("C", "D")]);
  assert.equal(blastRadius(fwd, "A", 3), 3); // B, C, D (D visited once)
});

test("blastRadius: unknown start / depth<1 -> 0", () => {
  const fwd = buildForwardAdjacency(chain("A", "B"));
  assert.equal(blastRadius(fwd, "ZZZ", 3), 0);
  assert.equal(blastRadius(fwd, "A", 0), 0);
  assert.equal(blastRadius(null, "A", 3), 0);
});

// -- defaultCandidateFilter --

test("defaultCandidateFilter: accepts engine/dispatcher/algorithm prefixes + L4/L5", () => {
  assert.equal(defaultCandidateFilter({ id: "eng.KienzleEngine" }), true);
  assert.equal(defaultCandidateFilter({ id: "disp.prism_calc" }), true);
  assert.equal(defaultCandidateFilter({ id: "algo.LBFGSBOptimizer" }), true);
  assert.equal(defaultCandidateFilter({ id: "x", layer: "L5" }), true);
  assert.equal(defaultCandidateFilter({ id: "y", layer: "L4" }), true);
});

test("defaultCandidateFilter: rejects vault/wiki/memory + malformed nodes", () => {
  assert.equal(defaultCandidateFilter({ id: "vault.mem.feedback.foo", layer: "L10" }), false);
  assert.equal(defaultCandidateFilter({ id: "wiki.architecture.bar", layer: "L9" }), false);
  assert.equal(defaultCandidateFilter({ id: "z", layer: "L1" }), false);
  assert.equal(defaultCandidateFilter(null), false);
  assert.equal(defaultCandidateFilter({}), false);
});

// -- rankHubsByBlastRadius --

test("rankHubsByBlastRadius: chain ranks A>B>C>D by blast radius", () => {
  const graph = {
    nodes: ["A", "B", "C", "D"].map((id) => ({ id, label: id })),
    edges: chain("A", "B", "C", "D"),
  };
  const { ranked } = rankHubsByBlastRadius(graph, { maxDepth: 3, candidateFilter: () => true });
  assert.deepEqual(ranked.map((r) => r.id), ["A", "B", "C", "D"]);
  assert.deepEqual(ranked.map((r) => r.blastRadius), [3, 2, 1, 0]);
  assert.equal(ranked[0].outDegree, 1);
});

test("rankHubsByBlastRadius: star hub outranks its leaves", () => {
  const leaves = ["x1", "x2", "x3"];
  const graph = {
    nodes: ["H", ...leaves].map((id) => ({ id, label: id })),
    edges: leaves.map((x) => edge("H", x)),
  };
  const { ranked } = rankHubsByBlastRadius(graph, { candidateFilter: () => true });
  assert.equal(ranked[0].id, "H");
  assert.equal(ranked[0].blastRadius, 3);
});

test("rankHubsByBlastRadius: topN truncates the ranking", () => {
  const graph = {
    nodes: ["A", "B", "C", "D"].map((id) => ({ id, label: id })),
    edges: chain("A", "B", "C", "D"),
  };
  const { ranked } = rankHubsByBlastRadius(graph, { topN: 2, candidateFilter: () => true });
  assert.equal(ranked.length, 2);
  assert.deepEqual(ranked.map((r) => r.id), ["A", "B"]);
});

test("rankHubsByBlastRadius: candidateFilter restricts the ranked set", () => {
  const graph = {
    nodes: ["A", "B", "C"].map((id) => ({ id, label: id })),
    edges: chain("A", "B", "C"),
  };
  const onlyB = (n) => n.id === "B";
  const { ranked, meta } = rankHubsByBlastRadius(graph, { candidateFilter: onlyB });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "B");
  assert.equal(ranked[0].blastRadius, 1);
  assert.equal(meta.candidateCount, 1);
});

test("rankHubsByBlastRadius: default filter keeps only structural hubs", () => {
  const graph = {
    nodes: [
      { id: "eng.Hub", label: "Hub" },
      { id: "vault.mem.x", label: "x", layer: "L10" },
    ],
    edges: [edge("eng.Hub", "eng.Leaf"), edge("vault.mem.x", "vault.mem.y")],
  };
  const { ranked } = rankHubsByBlastRadius(graph);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].id, "eng.Hub");
});

test("rankHubsByBlastRadius: empty graph -> empty ranking, no throw", () => {
  const { ranked, meta } = rankHubsByBlastRadius({ nodes: [], edges: [] });
  assert.deepEqual(ranked, []);
  assert.equal(meta.candidateCount, 0);
  assert.equal(meta.totalEdges, 0);
});

test("rankHubsByBlastRadius: missing nodes/edges keys -> safe defaults", () => {
  const { ranked, meta } = rankHubsByBlastRadius({});
  assert.deepEqual(ranked, []);
  assert.equal(meta.totalNodes, 0);
  assert.equal(meta.totalEdges, 0);
});

test("rankHubsByBlastRadius: ties break by outDegree then id (deterministic)", () => {
  // P and Q both have blast radius 1 (single distinct child); Q has higher
  // out-degree (2 edges to the same child counts as out-degree 2). Q sorts first.
  const graph = {
    nodes: ["P", "Q", "c"].map((id) => ({ id, label: id })),
    edges: [edge("P", "c"), edge("Q", "c"), edge("Q", "c")],
  };
  const { ranked } = rankHubsByBlastRadius(graph, { candidateFilter: (n) => n.id === "P" || n.id === "Q" });
  assert.equal(ranked[0].id, "Q");
  assert.equal(ranked[0].blastRadius, 1);
  assert.equal(ranked[1].id, "P");
});

test("rankHubsByBlastRadius: label newlines flattened in output", () => {
  const graph = {
    nodes: [{ id: "eng.X", label: "X\n(700/707)" }],
    edges: [edge("eng.X", "eng.Y")],
  };
  const { ranked } = rankHubsByBlastRadius(graph);
  assert.equal(ranked[0].label, "X (700/707)");
});
