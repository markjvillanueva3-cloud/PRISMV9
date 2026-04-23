/**
 * LatheAGIKnowledgeUnificationEngine tests — U-LTH60
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LatheAGIKnowledgeUnificationEngine,
  NODE_TYPES,
} from "../engines/LatheAGIKnowledgeUnificationEngine.js";

function makeEngine() {
  const dir = mkdtempSync(join(tmpdir(), "kg-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheAGIKnowledgeUnificationEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

describe("LatheAGIKnowledgeUnificationEngine — canonical seed", () => {
  it("seeds 12 formula nodes on construction (6 ISO groups × 2 formulas)", () => {
    const { engine } = makeEngine();
    const formulas = engine.query({ type: "formula" });
    expect(formulas.nodes.length).toBe(12);
    const kienzleIds = formulas.nodes.filter((n) => n.id.startsWith("kienzle_")).map((n) => n.id);
    expect(kienzleIds.sort()).toEqual(["kienzle_H","kienzle_K","kienzle_M","kienzle_N","kienzle_P","kienzle_S"]);
  });

  it("Kienzle P node carries kc1_1=1800, mc=0.25 from constants.ts", () => {
    const { engine } = makeEngine();
    const result = engine.query({ type: "formula", id: "kienzle_P" });
    expect(result.center?.props.kc1_1).toBe(1800);
    expect(result.center?.props.mc).toBe(0.25);
  });

  it("exposes 10 node types", () => {
    expect(NODE_TYPES.length).toBe(10);
    expect([...NODE_TYPES]).toContain("material");
    expect([...NODE_TYPES]).toContain("formula");
    expect([...NODE_TYPES]).toContain("tip");
  });
});

describe("LatheAGIKnowledgeUnificationEngine — upsertNode + upsertEdge", () => {
  it("upsertNode creates new and updates existing (created_at preserved)", () => {
    const { engine } = makeEngine();
    const a = engine.upsertNode({ type: "material", id: "1018", props: { iso: "P" } });
    const b = engine.upsertNode({ type: "material", id: "1018", props: { density: 7870 } });
    expect(a.created_at).toBe(b.created_at);
    expect(b.props.iso).toBe("P");
    expect(b.props.density).toBe(7870);
  });

  it("upsertEdge rejects when 'from' node missing", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertEdge({
        from: { type: "material", id: "missing" },
        to: { type: "formula", id: "kienzle_P" },
        label: "USES",
      }),
    ).toThrow(/edge 'from' node not found/);
  });

  it("upsertEdge rejects when 'to' node missing", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    expect(() =>
      engine.upsertEdge({
        from: { type: "material", id: "1018" },
        to: { type: "formula", id: "bogus" },
        label: "USES",
      }),
    ).toThrow(/edge 'to' node not found/);
  });

  it("upsertEdge idempotent on (from, to, label) tuple", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    engine.upsertEdge({ from: { type: "material", id: "1018" }, to: { type: "formula", id: "kienzle_P" }, label: "USES" });
    engine.upsertEdge({ from: { type: "material", id: "1018" }, to: { type: "formula", id: "kienzle_P" }, label: "USES" });
    expect(engine.__getState().edges.filter((e) => e.label === "USES").length).toBe(1);
  });
});

describe("LatheAGIKnowledgeUnificationEngine — query + traversal", () => {
  it("query by type returns all nodes of that type", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    engine.upsertNode({ type: "material", id: "4140" });
    const result = engine.query({ type: "material" });
    expect(result.nodes.length).toBe(2);
  });

  it("BFS traversal expands hops", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    engine.upsertNode({ type: "tool", id: "CNMG12" });
    engine.upsertNode({ type: "strategy", id: "rough_turn" });
    engine.upsertEdge({ from: { type: "material", id: "1018" }, to: { type: "tool", id: "CNMG12" }, label: "CUT_WITH" });
    engine.upsertEdge({ from: { type: "tool", id: "CNMG12" }, to: { type: "strategy", id: "rough_turn" }, label: "USED_IN" });
    const result = engine.query({ type: "material", id: "1018", hops: 2 });
    expect(result.nodes.length).toBe(3);
    expect(result.hops_traversed).toBe(2);
  });
});

describe("LatheAGIKnowledgeUnificationEngine — traceReasoning", () => {
  it("always produces ≥5 reasoning steps (padded if graph is short)", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    const trace = engine.traceReasoning({ start_type: "material", start_id: "1018" });
    expect(trace.steps.length).toBeGreaterThanOrEqual(5);
  });

  it("finds goal node when reachable (complete=true)", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    engine.upsertNode({ type: "tool", id: "CNMG" });
    engine.upsertEdge({ from: { type: "material", id: "1018" }, to: { type: "tool", id: "CNMG" }, label: "CUT_WITH" });
    const trace = engine.traceReasoning({ start_type: "material", start_id: "1018", goal_type: "tool" });
    expect(trace.complete).toBe(true);
    expect(trace.reason).toBe("goal_reached");
  });

  it("rejects unknown start node", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.traceReasoning({ start_type: "material", start_id: "nope" }),
    ).toThrow(/start node/);
  });
});

describe("LatheAGIKnowledgeUnificationEngine — stats + persistence", () => {
  it("stats report seed formula count + any upserted nodes", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018" });
    const stats = engine.stats();
    expect(stats.nodes_by_type.formula).toBe(12);
    expect(stats.nodes_by_type.material).toBe(1);
  });

  it("state survives new engine instance", () => {
    const { engine, statePath } = makeEngine();
    engine.upsertNode({ type: "customer", id: "ALCOA" });
    expect(existsSync(statePath)).toBe(true);
    const engine2 = new LatheAGIKnowledgeUnificationEngine(statePath);
    expect(engine2.query({ type: "customer", id: "ALCOA" }).center?.id).toBe("ALCOA");
  });
});

describe("LatheAGIKnowledgeUnificationEngine — failure modes", () => {
  it("rejects invalid node type", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertNode({ type: "bogus" as any, id: "x" }),
    ).toThrow();
  });

  it("rejects empty id", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.upsertNode({ type: "material", id: "" }),
    ).toThrow();
  });

  it("rejects hops > MAX_HOPS", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.query({ hops: 99 }),
    ).toThrow();
  });
});

describe("LatheAGIKnowledgeUnificationEngine — dispatcher wiring", () => {
  it("lathe_agi_kg_query + upsert + trace actions wired", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    expect(src).toContain('"lathe_agi_kg_query"');
    expect(src).toContain('"lathe_agi_kg_upsert_node"');
    expect(src).toContain('"lathe_agi_kg_trace"');
    expect(src).toContain('"../../engines/LatheAGIKnowledgeUnificationEngine.js"');
    expect(src).toContain('case "latheAGIKnowledge"');
  });
});
