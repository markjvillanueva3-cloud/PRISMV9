/**
 * GraphContextLensEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01
 * Real reference-value tests over a hand-built adjacency fixture (no toBeDefined
 * stubs). Covers happy 1/2/3-hop, unknown node, empty graph, oversized hops,
 * malformed sidecar, cycle-safety, domain extraction, community summary, render
 * formats, and adversarial node ids.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { graphContextLensEngine, GraphContextLensEngine } from "../engines/GraphContextLensEngine.js";

// Clean forward chain (root -> h1{a,b} -> h2{a,b} -> h3) + a separate 2-cycle +
// an isolated node + a small domain cluster. `in` mirrors `out` (as the real
// sidecar does) but introduces NO back-edges into earlier chain nodes, so BFS
// hop-distance from `root` is unambiguous.
const FIXTURE = {
  adjacency: {
    root: { in: [], out: [{ id: "h1a", type: "e" }, { id: "h1b", type: "e" }] },
    h1a: { in: [{ id: "root", type: "e" }], out: [{ id: "h2a", type: "e" }] },
    h1b: { in: [{ id: "root", type: "e" }], out: [{ id: "h2b", type: "e" }] },
    h2a: { in: [{ id: "h1a", type: "e" }], out: [{ id: "h3", type: "e" }] },
    h2b: { in: [{ id: "h1b", type: "e" }], out: [{ id: "h3", type: "e" }] },
    h3: { in: [{ id: "h2a", type: "e" }, { id: "h2b", type: "e" }], out: [] },
    cycA: { in: [{ id: "cycB", type: "loop" }], out: [{ id: "cycB", type: "loop" }] },
    cycB: { in: [{ id: "cycA", type: "loop" }], out: [{ id: "cycA", type: "loop" }] },
    iso: { in: [], out: [] },
    "eng.mill.facemill": { in: [], out: [{ id: "eng.mill.endmill", type: "uses" }] },
    "eng.mill.endmill": { in: [{ id: "eng.mill.facemill", type: "uses" }], out: [] },
    "eng.lathe.turn": { in: [], out: [] },
  },
};

let dir: string;
let FIX: string; // valid fixture path
let BAD: string; // malformed fixture path
const NO = { enrich: false as const };

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "gcle-"));
  FIX = join(dir, "fix-node-adjacency.json");
  writeFileSync(FIX, JSON.stringify(FIXTURE));
  BAD = join(dir, "bad-node-adjacency.json");
  writeFileSync(BAD, "{ this is not valid json ");
});
afterAll(() => {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("extractEgoGraph hop distances", () => {
  it("1-hop on root -> 3 nodes, 2 induced edges", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 1, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(3);
    expect(ego.nodes.map((n) => n.id).sort()).toEqual(["h1a", "h1b", "root"]);
    expect(ego.edgeCount).toBe(2);
    expect(ego.edges.some((e) => e.from === "root" && e.to === "h1a" && e.type === "e")).toBe(true);
    expect(ego.effectiveHops).toBe(1);
    expect(ego.truncated).toBe(false);
  });

  it("2-hop on root -> 5 nodes, 4 edges, h2a at distance 2", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 2, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(5);
    expect(ego.edgeCount).toBe(4);
    const h2a = ego.nodes.find((n) => n.id === "h2a");
    expect(h2a?.distance).toBe(2);
  });

  it("3-hop on root -> 6 nodes, 6 edges, h3 at distance 3", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 3, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(6);
    expect(ego.edgeCount).toBe(6);
    expect(ego.nodes.find((n) => n.id === "h3")?.distance).toBe(3);
  });
});

describe("extractEgoGraph edge cases", () => {
  it("unknown node -> center only + warning, no edges", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("does-not-exist", 2, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(1);
    expect(ego.edgeCount).toBe(0);
    expect(ego.warnings.some((w) => w.includes("no edges"))).toBe(true);
  });

  it("empty graph -> center only + warning", async () => {
    const empty = join(dir, "empty-node-adjacency.json");
    writeFileSync(empty, JSON.stringify({ adjacency: {} }));
    const ego = await graphContextLensEngine.extractEgoGraph("root", 3, { ...NO, adjacencyPath: empty });
    expect(ego.nodeCount).toBe(1);
    expect(ego.edgeCount).toBe(0);
  });

  it("oversized hops (1000) -> clamped to 12, component exhausts at 6 nodes", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 1000, { ...NO, adjacencyPath: FIX });
    expect(ego.effectiveHops).toBe(12);
    expect(ego.requestedHops).toBe(1000);
    expect(ego.nodeCount).toBe(6); // whole reachable component, no infinite growth
    expect(ego.warnings.some((w) => w.includes("clamped"))).toBe(true);
  });

  it("maxNodes cap -> truncated subset + warning", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 3, { ...NO, adjacencyPath: FIX, maxNodes: 3 });
    expect(ego.nodeCount).toBe(3);
    expect(ego.truncated).toBe(true);
    expect(ego.warnings.some((w) => w.includes("cap"))).toBe(true);
  });

  it("malformed sidecar -> throws fail-loud (R12)", async () => {
    await expect(
      graphContextLensEngine.extractEgoGraph("root", 1, { ...NO, adjacencyPath: BAD }),
    ).rejects.toThrow(/corrupt/i);
  });

  it("missing sidecar -> throws with recovery hint", async () => {
    await expect(
      graphContextLensEngine.extractEgoGraph("root", 1, { ...NO, adjacencyPath: join(dir, "nope-node-adjacency.json") }),
    ).rejects.toThrow(/build-viz-adjacency/);
  });
});

describe("extractEgoGraph cycle-safety + adversarial inputs", () => {
  it("2-node cycle terminates (no infinite loop), 2 nodes + 2 edges", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("cycA", 5, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(2);
    expect(ego.nodes.map((n) => n.id).sort()).toEqual(["cycA", "cycB"]);
    expect(ego.edgeCount).toBe(2);
  });

  it("node id with shell-special chars is harmless (treated as unknown key)", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph(";rm -rf / | cat ../../etc", 2, { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(1);
    expect(ego.edgeCount).toBe(0);
  });

  it("empty nodeId rejects", async () => {
    await expect(graphContextLensEngine.extractEgoGraph("", 1, { ...NO, adjacencyPath: FIX })).rejects.toThrow(/non-empty/);
  });

  it("negative hops -> center only (0 effective hops)", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", -3, { ...NO, adjacencyPath: FIX });
    expect(ego.effectiveHops).toBe(0);
    expect(ego.nodeCount).toBe(1);
  });
});

describe("extractByDomain", () => {
  it("domain 'mill' -> 2 nodes + 1 induced edge, excludes lathe", async () => {
    const ego = await graphContextLensEngine.extractByDomain("mill", { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(2);
    expect(ego.nodes.map((n) => n.id).sort()).toEqual(["eng.mill.endmill", "eng.mill.facemill"]);
    expect(ego.edgeCount).toBe(1);
    expect(ego.edges[0]).toMatchObject({ from: "eng.mill.facemill", to: "eng.mill.endmill", type: "uses" });
  });

  it("unmatched domain -> 0 nodes + warning", async () => {
    const ego = await graphContextLensEngine.extractByDomain("nonexistentdomain", { ...NO, adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(0);
    expect(ego.warnings.some((w) => w.includes("no nodes matched"))).toBe(true);
  });

  it("empty domain rejects", async () => {
    await expect(graphContextLensEngine.extractByDomain("", { ...NO, adjacencyPath: FIX })).rejects.toThrow(/non-empty/);
  });
});

describe("summarizeCommunity", () => {
  it("rolls up counts by layer/kind/status", () => {
    const summary = graphContextLensEngine.summarizeCommunity([
      { id: "a", distance: 0, layer: "L6", kind: "engine", status: "built" },
      { id: "b", distance: 1, layer: "L6", kind: "engine", status: "built" },
      { id: "c", distance: 1, layer: "L4", kind: "dispatcher", status: "wired" },
      { id: "d", distance: 2 },
    ]);
    expect(summary.total).toBe(4);
    expect(summary.byLayer.L6).toBe(2);
    expect(summary.byLayer.unknown).toBe(1);
    expect(summary.byKind.engine).toBe(2);
    expect(summary.byStatus.built).toBe(2);
    expect(summary.sample).toEqual(["a", "b", "c", "d"]);
  });
});

describe("render formats", () => {
  let ego: Awaited<ReturnType<GraphContextLensEngine["extractEgoGraph"]>>;
  beforeAll(async () => {
    ego = await graphContextLensEngine.extractEgoGraph("root", 2, { ...NO, adjacencyPath: FIX });
  });
  it("json round-trips", () => {
    const parsed = JSON.parse(graphContextLensEngine.render(ego, "json"));
    expect(parsed.center).toBe("root");
    expect(parsed.nodeCount).toBe(5);
  });
  it("markdown has header + node ids", () => {
    const md = graphContextLensEngine.render(ego, "markdown");
    expect(md).toContain("# Ego-graph: root");
    expect(md).toContain("`h1a`");
  });
  it("mermaid is a graph with sanitized ids + edges", () => {
    const mm = graphContextLensEngine.render(ego, "mermaid");
    expect(mm.startsWith("graph LR")).toBe(true);
    expect(mm).toContain("n_root");
    expect(mm).toContain("-->|e|");
  });
  it("unknown format throws", () => {
    expect(() => graphContextLensEngine.render(ego, "xml" as never)).toThrow(/unknown format/);
  });
});

describe("enrich best-effort", () => {
  it("enrich:true does not throw even when cards are absent for fixture ids", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("root", 1, { adjacencyPath: FIX });
    expect(ego.nodeCount).toBe(3); // enrichment is additive; structure unchanged
  });
});

// R15.3 live-data validation: runs against the real (gitignored) 96MB sidecar on
// hosts that have it; auto-skips in CI where the generated artifact is absent.
const LIVE_ADJ = ["state/shared/system-viz/node-adjacency.json", "../state/shared/system-viz/node-adjacency.json"]
  .map((p) => join(process.cwd(), p))
  .find((p) => existsSync(p));
describe("live adjacency smoke", () => {
  it.skipIf(!LIVE_ADJ)("extracts a real ego-graph from the live node-adjacency.json", async () => {
    const ego = await graphContextLensEngine.extractEgoGraph("eng.adaptive", 1, { enrich: false });
    expect(ego.nodeCount).toBeGreaterThan(1);
    expect(ego.edgeCount).toBeGreaterThan(0);
    expect(ego.center).toBe("eng.adaptive");
  });
});
