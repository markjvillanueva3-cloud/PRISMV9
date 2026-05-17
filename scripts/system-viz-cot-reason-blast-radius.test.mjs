// system-viz-cot-reason-blast-radius.test.mjs — U-P2-COT-REASON-BLAST-RADIUS tests (node:test)
//
// Coverage:
//   • extractBlastRadius — empty graph, single node, fan-out, cycles, isolated node,
//     hops clamping, maxNeighbors truncation, upstream vs downstream direction
//   • buildCotReasonPayload — happy path, missing nodeId, missing target node,
//     synthesized defaults, caller overrides, contract pinning (dispatcher/action/params shape)
//   • Dispatcher contract regression guards — frozen against aiReasoningDispatcher.ts:1444
//     and ChainOfThoughtEngine.ts:129-138 (catches contract drift if upstream renames fields)
//   • Proto-pollution safety (Object.create(null) accumulators)
//   • parseArgs defaults + each flag
//   • Atomic write
//   • Real-data E2E (live system-graph IF small enough)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  extractBlastRadius,
  buildCotReasonPayload,
  readSystemGraph,
  writePayload,
  parseArgs,
  COT_DISPATCHER,
  COT_ACTION,
  DEFAULT_HOPS,
  DEFAULT_MAX_NEIGHBORS,
  ABSOLUTE_HOP_CAP,
  ABSOLUTE_NEIGHBOR_CAP,
  MIN_HOPS,
  MIN_NEIGHBORS,
  DEFAULT_STRATEGY,
  DEFAULT_MAX_STEPS,
  DEFAULT_CONFIDENCE_THRESHOLD,
} from "./system-viz-cot-reason-blast-radius.mjs";

const FROZEN_ISO = "2026-05-17T17:30:00.000Z";
const FROZEN_MS = Date.parse(FROZEN_ISO);

// Synthetic graph helpers
const GRAPH_LINEAR = {
  nodes: [
    { id: "A", label: "Node A", kind: "engine" },
    { id: "B", label: "Node B", kind: "engine" },
    { id: "C", label: "Node C", kind: "engine" },
    { id: "D", label: "Node D", kind: "engine" },
  ],
  edges: [
    { source: "A", target: "B", kind: "calls" },
    { source: "B", target: "C", kind: "calls" },
    { source: "C", target: "D", kind: "calls" },
  ],
};

// ─── extractBlastRadius ─────────────────────────────────────────────────────
describe("extractBlastRadius", () => {
  it("empty graph → empty upstream/downstream", () => {
    const out = extractBlastRadius({ nodeId: "X", systemGraph: { nodes: [], edges: [] } });
    assert.equal(out.upstream.nodes.length, 0);
    assert.equal(out.downstream.nodes.length, 0);
    assert.equal(out.truncated, false);
  });

  it("isolated node (no edges) → empty radius", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: { nodes: [{ id: "A", label: "lonely" }], edges: [] },
    });
    assert.equal(out.upstream.nodes.length, 0);
    assert.equal(out.downstream.nodes.length, 0);
  });

  it("downstream BFS picks up outgoing edges", () => {
    const out = extractBlastRadius({
      nodeId: "B",
      systemGraph: GRAPH_LINEAR,
      hops: 2,
    });
    const downIds = out.downstream.nodes.map((n) => n.id).sort();
    assert.deepEqual(downIds, ["C", "D"]);
  });

  it("upstream BFS picks up incoming edges", () => {
    const out = extractBlastRadius({
      nodeId: "C",
      systemGraph: GRAPH_LINEAR,
      hops: 2,
    });
    const upIds = out.upstream.nodes.map((n) => n.id).sort();
    assert.deepEqual(upIds, ["A", "B"]);
  });

  it("hops=1 only collects immediate neighbors", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: 1,
    });
    assert.deepEqual(
      out.downstream.nodes.map((n) => n.id),
      ["B"],
    );
  });

  it("nodes carry hop distance from target", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: 3,
    });
    const hopMap = Object.fromEntries(
      out.downstream.nodes.map((n) => [n.id, n.hop]),
    );
    assert.equal(hopMap.B, 1);
    assert.equal(hopMap.C, 2);
    assert.equal(hopMap.D, 3);
  });

  it("hops clamped to [MIN_HOPS, ABSOLUTE_HOP_CAP]", () => {
    const out1 = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: 999,
    });
    assert.equal(out1.clampedHops, ABSOLUTE_HOP_CAP);

    const out2 = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: -5,
    });
    assert.equal(out2.clampedHops, MIN_HOPS);
  });

  it("maxNeighbors clamped to [MIN_NEIGHBORS, ABSOLUTE_NEIGHBOR_CAP]", () => {
    const out1 = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      maxNeighbors: 99999,
    });
    assert.equal(out1.clampedMaxNeighbors, ABSOLUTE_NEIGHBOR_CAP);

    const out2 = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      maxNeighbors: 0,
    });
    assert.equal(out2.clampedMaxNeighbors, MIN_NEIGHBORS);
  });

  it("truncation: maxNeighbors=1 on fan-out → truncated:true", () => {
    const fan = {
      nodes: [
        { id: "root" },
        { id: "n1" },
        { id: "n2" },
        { id: "n3" },
      ],
      edges: [
        { source: "root", target: "n1" },
        { source: "root", target: "n2" },
        { source: "root", target: "n3" },
      ],
    };
    const out = extractBlastRadius({
      nodeId: "root",
      systemGraph: fan,
      hops: 1,
      maxNeighbors: 1,
    });
    assert.equal(out.truncated, true);
    assert.ok(out.downstream.nodes.length <= 1);
  });

  it("cycles: same node can appear in BOTH upstream AND downstream", () => {
    const cyc = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [
        { source: "A", target: "B" },
        { source: "B", target: "A" },
      ],
    };
    const out = extractBlastRadius({ nodeId: "A", systemGraph: cyc, hops: 1 });
    assert.equal(out.upstream.nodes.length, 1);
    assert.equal(out.downstream.nodes.length, 1);
    assert.equal(out.upstream.nodes[0].id, "B");
    assert.equal(out.downstream.nodes[0].id, "B");
  });

  it("malformed edges (non-string source/target) are skipped", () => {
    const bad = {
      nodes: [{ id: "A" }, { id: "B" }],
      edges: [
        { source: 42, target: "B" },
        { source: "A", target: null },
        { source: "A", target: "B" },
      ],
    };
    const out = extractBlastRadius({ nodeId: "A", systemGraph: bad, hops: 1 });
    assert.equal(out.downstream.nodes.length, 1);
    assert.equal(out.downstream.nodes[0].id, "B");
  });

  it("malformed nodes (no id) don't appear in radius", () => {
    const bad = {
      nodes: [{ id: "A" }, { id: null }, { label: "missing-id" }],
      edges: [{ source: "A", target: "A" }], // self-loop
    };
    const out = extractBlastRadius({ nodeId: "A", systemGraph: bad, hops: 1 });
    // Self-loop visits "A" but A is the start, so it's in visitedNodes; downstream stays empty.
    assert.equal(out.downstream.nodes.length, 0);
  });
});

// ─── buildCotReasonPayload contract pinning ─────────────────────────────────
describe("buildCotReasonPayload — dispatcher contract", () => {
  it("REGRESSION: dispatcher MUST be 'prism_ai' (frozen contract)", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.dispatcher, COT_DISPATCHER);
    assert.equal(out.dispatcher, "prism_ai");
  });

  it("REGRESSION: action MUST be 'cot_reason' (frozen contract)", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.action, COT_ACTION);
    assert.equal(out.action, "cot_reason");
  });

  it("REGRESSION: params MUST contain required ReasoningProblem fields (problem, goal)", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(typeof out.params.problem, "string");
    assert.equal(typeof out.params.goal, "string");
    assert.ok(out.params.problem.length > 0);
    assert.ok(out.params.goal.length > 0);
  });

  it("REGRESSION: params.context MUST be plain object (Record<string,unknown>)", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(typeof out.params.context, "object");
    assert.equal(Array.isArray(out.params.context), false);
    assert.equal(out.params.context.node_id, "A");
  });

  it("REGRESSION: params optional fields are NOT emitted when caller didn't supply", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    // constraints + known_facts are optional in ReasoningProblem — should be ABSENT
    // when caller didn't supply them, not emitted as empty arrays.
    assert.equal("constraints" in out.params, false);
    assert.equal("known_facts" in out.params, false);
  });

  it("REGRESSION: params optional fields ARE emitted when caller DOES supply", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      constraints: ["no-side-effects"],
      knownFacts: ["A is an engine"],
      now: FROZEN_MS,
    });
    assert.deepEqual(out.params.constraints, ["no-side-effects"]);
    assert.deepEqual(out.params.known_facts, ["A is an engine"]);
  });

  it("REGRESSION: params strategy/max_steps/confidence_threshold defaults match engine doc", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.params.strategy, DEFAULT_STRATEGY);
    assert.equal(out.params.strategy, "linear"); // engine default at line 230
    assert.equal(out.params.max_steps, DEFAULT_MAX_STEPS);
    assert.equal(out.params.confidence_threshold, DEFAULT_CONFIDENCE_THRESHOLD);
  });

  it("REGRESSION: sourceContract pins ai dispatcher + engine type line range", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.match(out.sourceContract, /aiReasoningDispatcher/);
    assert.match(out.sourceContract, /ChainOfThoughtEngine/);
  });
});

// ─── buildCotReasonPayload edge cases ────────────────────────────────────────
describe("buildCotReasonPayload — edge cases", () => {
  it("missing nodeId → ok:false with MISSING_NODE_ID error", () => {
    const out = buildCotReasonPayload({ systemGraph: GRAPH_LINEAR, now: FROZEN_MS });
    assert.equal(out.ok, false);
    assert.equal(out.error, "MISSING_NODE_ID");
  });

  it("non-string nodeId → ok:false", () => {
    const out = buildCotReasonPayload({
      nodeId: 42,
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.ok, false);
  });

  it("nodeId not in graph → ok:true, targetNodePresent:false", () => {
    const out = buildCotReasonPayload({
      nodeId: "MISSING",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.ok, true);
    assert.equal(out.targetNodePresent, false);
    // Problem is still synthesized — degraded form (no label) but valid
    assert.match(out.params.problem, /MISSING/);
  });

  it("caller-provided problem + goal override synthesized defaults", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      problem: "Custom problem",
      goal: "Custom goal",
      now: FROZEN_MS,
    });
    assert.equal(out.params.problem, "Custom problem");
    assert.equal(out.params.goal, "Custom goal");
  });

  it("blastRadius summary counts match BFS output", () => {
    const out = buildCotReasonPayload({
      nodeId: "B",
      systemGraph: GRAPH_LINEAR,
      hops: 2,
      now: FROZEN_MS,
    });
    assert.equal(out.blastRadius.upstream.nodeCount, 1); // A
    assert.equal(out.blastRadius.downstream.nodeCount, 2); // C, D
    assert.equal(out.blastRadius.truncated, false);
    assert.equal(out.blastRadius.hops, 2);
  });

  it("advisory.mustHumanVerify always true; caveat non-empty", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.advisory.mustHumanVerify, true);
    assert.ok(out.advisory.caveat.length > 0);
  });

  it("generatedAt reflects injected now", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.generatedAt, FROZEN_ISO);
  });

  it("schemaVersion is 1", () => {
    const out = buildCotReasonPayload({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      now: FROZEN_MS,
    });
    assert.equal(out.schemaVersion, 1);
  });
});

// ─── Proto-pollution safety ─────────────────────────────────────────────────
describe("proto-pollution safety", () => {
  it("REGRESSION: __proto__ as node id does NOT pollute Object.prototype", () => {
    const out = extractBlastRadius({
      nodeId: "real",
      systemGraph: {
        nodes: [{ id: "real" }, { id: "__proto__" }],
        edges: [{ source: "real", target: "__proto__" }],
      },
      hops: 1,
    });
    assert.equal({}.toString, Object.prototype.toString); // no override
    // Resolver should successfully visit __proto__ as a regular node id
    assert.equal(out.downstream.nodes.length, 1);
  });
});

// ─── parseArgs ──────────────────────────────────────────────────────────────
describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs(["node", "x"]);
    assert.equal(a.nodeId, null);
    assert.equal(a.json, true); // CLI default: stdout
    assert.equal(a.hops, DEFAULT_HOPS);
    assert.equal(a.maxNeighbors, DEFAULT_MAX_NEIGHBORS);
    assert.equal(a.help, false);
  });

  it("--node-id captures id", () => {
    const a = parseArgs(["node", "x", "--node-id", "engine:Foo"]);
    assert.equal(a.nodeId, "engine:Foo");
  });

  it("--out sets file mode (json:false)", () => {
    const a = parseArgs(["node", "x", "--out", "/tmp/x.json"]);
    assert.equal(a.outPath, "/tmp/x.json");
    assert.equal(a.json, false);
  });

  it("--hops / --max-neighbors / --problem / --goal / --frozen-time / --graph", () => {
    const a = parseArgs([
      "node",
      "x",
      "--hops",
      "3",
      "--max-neighbors",
      "100",
      "--problem",
      "P",
      "--goal",
      "G",
      "--frozen-time",
      FROZEN_ISO,
      "--graph",
      "/tmp/g.json",
    ]);
    assert.equal(a.hops, 3);
    assert.equal(a.maxNeighbors, 100);
    assert.equal(a.problem, "P");
    assert.equal(a.goal, "G");
    assert.equal(a.frozenTime, FROZEN_ISO);
    assert.equal(a.graphPath, "/tmp/g.json");
  });

  it("--help / -h", () => {
    assert.equal(parseArgs(["node", "x", "--help"]).help, true);
    assert.equal(parseArgs(["node", "x", "-h"]).help, true);
  });
});

// ─── I/O ────────────────────────────────────────────────────────────────────
describe("readSystemGraph", () => {
  it("missing file returns empty graph (no throw)", () => {
    const out = readSystemGraph("/nonexistent/graph.json");
    assert.deepEqual(out.nodes, []);
    assert.deepEqual(out.edges, []);
  });

  it("malformed JSON returns empty graph with _readError", () => {
    const tmp = path.join(os.tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(tmp, "{not json", "utf8");
    try {
      const out = readSystemGraph(tmp);
      assert.deepEqual(out.nodes, []);
      assert.ok(out._readError);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

describe("writePayload", () => {
  it("creates parent dir + writes pretty JSON with trailing newline (atomic)", () => {
    const tmp = path.join(os.tmpdir(), `cot-${Date.now()}`, "deep", "p.json");
    try {
      const payload = { schemaVersion: 1, ok: true };
      writePayload(tmp, payload);
      const txt = fs.readFileSync(tmp, "utf8");
      assert.ok(txt.endsWith("\n"));
      assert.deepEqual(JSON.parse(txt), payload);
      const leftover = fs.readdirSync(path.dirname(tmp)).filter((f) =>
        f.startsWith("p.json.tmp-"),
      );
      assert.equal(leftover.length, 0);
    } finally {
      try {
        fs.rmSync(path.dirname(path.dirname(tmp)), { recursive: true, force: true });
      } catch {}
    }
  });
});

// ─── NaN-clamp regression (arm A P1) ────────────────────────────────────────
describe("extractBlastRadius — NaN-clamp regression", () => {
  it("REGRESSION (arm A P1): hops=NaN falls back to DEFAULT_HOPS (not bypassed by Math.min/max)", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: NaN,
    });
    assert.equal(out.clampedHops, DEFAULT_HOPS);
  });

  it("REGRESSION (arm A P1): maxNeighbors=NaN falls back to DEFAULT_MAX_NEIGHBORS", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      maxNeighbors: NaN,
    });
    assert.equal(out.clampedMaxNeighbors, DEFAULT_MAX_NEIGHBORS);
  });

  it("REGRESSION (arm A P1): hops=undefined → DEFAULT_HOPS (not NaN-bypass)", () => {
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: undefined,
    });
    assert.equal(out.clampedHops, DEFAULT_HOPS);
  });

  it("REGRESSION (arm A P1): hops='3' string passed via CLI Number() coercion works", () => {
    // CLI does `Number(argv[++i])` so a numeric string becomes 3 (valid).
    // A non-numeric string would become NaN — covered above.
    const out = extractBlastRadius({
      nodeId: "A",
      systemGraph: GRAPH_LINEAR,
      hops: Number("3"),
    });
    assert.equal(out.clampedHops, 3);
  });

  it("REGRESSION: null systemGraph entirely → empty radius (no throw)", () => {
    const out = extractBlastRadius({ nodeId: "A", systemGraph: null });
    assert.equal(out.upstream.nodes.length, 0);
    assert.equal(out.downstream.nodes.length, 0);
  });

  it("REGRESSION: undefined systemGraph → empty radius (no throw)", () => {
    const out = extractBlastRadius({ nodeId: "A" });
    assert.equal(out.upstream.nodes.length, 0);
    assert.equal(out.downstream.nodes.length, 0);
  });
});

// ─── Real-data E2E (arm B P2) ───────────────────────────────────────────────
describe("real-data E2E (arm B P2 — pure-core + injected-readers needs one real-data test)", () => {
  it("live system-graph (if present) → resolver produces valid payload for first node", () => {
    const graph = readSystemGraph();
    if (graph.nodes.length === 0) {
      // Graph not present in this sandbox — skip with explicit no-op assertion.
      assert.ok(true, "system-graph.json not present; skipping E2E");
      return;
    }
    const firstNode = graph.nodes.find((n) => n && typeof n.id === "string");
    assert.ok(firstNode, "expected ≥1 well-formed node in live graph");
    const out = buildCotReasonPayload({
      nodeId: firstNode.id,
      systemGraph: graph,
      hops: 1, // keep small for real-graph fan-out
      maxNeighbors: 20,
      now: FROZEN_MS,
    });
    assert.equal(out.ok, true);
    assert.equal(out.dispatcher, "prism_ai");
    assert.equal(out.action, "cot_reason");
    assert.equal(typeof out.params.problem, "string");
    assert.equal(typeof out.params.goal, "string");
    assert.equal(typeof out.params.context, "object");
    assert.equal(out.params.context.node_id, firstNode.id);
  });

  it("live graph: targetNodePresent is TRUE for a real node id", () => {
    const graph = readSystemGraph();
    if (graph.nodes.length === 0) {
      assert.ok(true, "skip — no graph");
      return;
    }
    const realNode = graph.nodes.find((n) => n && typeof n.id === "string");
    const out = buildCotReasonPayload({
      nodeId: realNode.id,
      systemGraph: graph,
      now: FROZEN_MS,
    });
    assert.equal(out.targetNodePresent, true);
  });
});

// ─── Dispatcher source-contract pinning (REGRESSION against live source) ────
describe("dispatcher source contract — frozen against aiReasoningDispatcher.ts:1444", () => {
  it("REGRESSION: aiReasoningDispatcher.ts MUST contain 'case \"cot_reason\"' handler", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts"),
      "utf8",
    );
    assert.match(src, /case ['"]cot_reason['"]:/);
  });

  it("REGRESSION: ChainOfThoughtEngine.ts MUST export ReasoningProblem interface with {problem, goal}", () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const REPO_ROOT = path.resolve(__dirname, "..");
    const src = fs.readFileSync(
      path.join(REPO_ROOT, "mcp-server/src/engines/ChainOfThoughtEngine.ts"),
      "utf8",
    );
    assert.match(src, /export interface ReasoningProblem/);
    assert.match(src, /problem:\s*string/);
    assert.match(src, /goal:\s*string/);
  });
});
