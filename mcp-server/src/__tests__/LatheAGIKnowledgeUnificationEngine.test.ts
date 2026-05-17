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
  normalizeTribalTip,
  defaultLatheTribalSource,
  type LatheTribalSourceFn,
} from "../engines/LatheAGIKnowledgeUnificationEngine.js";

function makeEngine() {
  const dir = mkdtempSync(join(tmpdir(), "kg-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheAGIKnowledgeUnificationEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

function makeEngineWithSource(source: LatheTribalSourceFn) {
  const dir = mkdtempSync(join(tmpdir(), "kg-trib-"));
  const statePath = join(dir, "state.json");
  const engine = new LatheAGIKnowledgeUnificationEngine(statePath, source);
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

// ============================================================================
// TRIBAL SEEDING (audit finding #3 sibling — wires the 3rd unified surface)
// ============================================================================

describe("LatheAGIKnowledgeUnificationEngine — tribal seeding (audit finding #3)", () => {
  it("seeds tribal tips on construction with default source (REAL-DATA E2E)", () => {
    const { engine } = makeEngine();
    const tips = engine.query({ type: "tip" });
    // Real corpus has KIENZLE/TAYLOR/THERMAL/METALLURGY/CHEMISTRY/CHIP_PHYSICS/
    // DYNAMICS + OKUMA_LATHE_TRIBAL — at least 20 tips total.
    expect(tips.nodes.length).toBeGreaterThanOrEqual(20);
    const seed = engine.getTribalSeedStatus();
    expect(seed.status).toBe("seeded");
    expect(seed.count).toBe(tips.nodes.length);
  });

  it("tip nodes carry domain='lathe' provenance + normalized props", () => {
    const { engine } = makeEngine();
    const tips = engine.query({ type: "tip" });
    expect(tips.nodes.length).toBeGreaterThan(0);
    const sample = tips.nodes[0];
    expect(sample.props.domain).toBe("lathe");
    expect(typeof sample.props.title).toBe("string");
    expect(typeof sample.props.source).toBe("string");
    const conf = sample.props.confidence as number;
    expect(conf).toBeGreaterThanOrEqual(0);
    expect(conf).toBeLessThanOrEqual(1);
  });

  it("stats() exposes tribal_seed_status + tribal_seed_count honest provenance", () => {
    const { engine } = makeEngine();
    const stats = engine.stats();
    expect(stats.tribal_seed_status).toBe("seeded");
    expect(stats.tribal_seed_count).toBeGreaterThan(0);
    expect(stats.nodes_by_type.tip).toBe(stats.tribal_seed_count);
  });

  it("DI seam: injected source's tips appear as graph nodes", () => {
    const stub: LatheTribalSourceFn = () => [
      { id: "stub-001", title: "Stub Tip 1", tip: "use coolant", category: "tooling", confidence: 0.9, source: "test" },
      { id: "stub-002", title: "Stub Tip 2", tip: "watch chatter", category: "stability", confidence: 0.85, source: "test" },
    ];
    const { engine } = makeEngineWithSource(stub);
    const tips = engine.query({ type: "tip" });
    expect(tips.nodes.length).toBe(2);
    expect(tips.nodes.map((n) => n.id).sort()).toEqual(["tip_stub-001", "tip_stub-002"]);
    expect(engine.getTribalSeedStatus().status).toBe("seeded");
  });

  it("status=empty when source returns []", () => {
    const empty: LatheTribalSourceFn = () => [];
    const { engine } = makeEngineWithSource(empty);
    expect(engine.query({ type: "tip" }).nodes.length).toBe(0);
    expect(engine.getTribalSeedStatus().status).toBe("empty");
    expect(engine.getTribalSeedStatus().count).toBe(0);
  });

  it("status=unavailable when source throws", () => {
    const broken: LatheTribalSourceFn = () => {
      throw new Error("corpus offline");
    };
    const { engine } = makeEngineWithSource(broken);
    expect(engine.query({ type: "tip" }).nodes.length).toBe(0);
    expect(engine.getTribalSeedStatus().status).toBe("unavailable");
  });

  it("status=unavailable when source returns non-array", () => {
    // Adversarial: source returns wrong shape (e.g. object, null, undefined).
    const wrong: LatheTribalSourceFn = (() => null) as unknown as LatheTribalSourceFn;
    const { engine } = makeEngineWithSource(wrong);
    expect(engine.query({ type: "tip" }).nodes.length).toBe(0);
    expect(engine.getTribalSeedStatus().status).toBe("unavailable");
  });

  it("status=empty when every entry fails normalization (no id field)", () => {
    const malformed: LatheTribalSourceFn = () => [
      { title: "Missing id", tip: "drift" },
      { description: "Also missing id" },
    ];
    const { engine } = makeEngineWithSource(malformed);
    expect(engine.query({ type: "tip" }).nodes.length).toBe(0);
    expect(engine.getTribalSeedStatus().status).toBe("empty");
  });

  it("idempotent across instances — second boot detects existing tips and skips reseeding", () => {
    const stub: LatheTribalSourceFn = () => [
      { id: "persistent-001", title: "Persistent", tip: "x", category: "g", confidence: 0.8, source: "t" },
    ];
    const dir = mkdtempSync(join(tmpdir(), "kg-idem-"));
    const statePath = join(dir, "state.json");
    const a = new LatheAGIKnowledgeUnificationEngine(statePath, stub);
    a.__resetForTests();
    expect(a.getTribalSeedStatus().status).toBe("seeded");
    // 2nd boot reads existing state from disk — should detect existing tip nodes.
    const b = new LatheAGIKnowledgeUnificationEngine(statePath, stub);
    expect(b.getTribalSeedStatus().status).toBe("skipped_idempotent");
    expect(b.query({ type: "tip" }).nodes.length).toBe(1);
  });

  it("normalizes both shapes: physics-science (tip_id/description) and Okuma (id/tip)", () => {
    const phys = normalizeTribalTip({
      tip_id: "kienzle-001",
      title: "Kienzle Force",
      description: "Fc = kc1.1 * ap * f^(1-mc)",
      category: "cutting_force",
      confidence: 0.98,
      source: "Kienzle 1952",
      tags: ["physics"],
    });
    expect(phys?.id).toBe("kienzle-001");
    expect(phys?.body).toContain("Fc =");
    expect(phys?.confidence).toBe(0.98);

    const okuma = normalizeTribalTip({
      id: "okuma-thread-01",
      title: "Thread Lead",
      tip: "ramp into thread",
      category: "threading",
      confidence: 0.85,
      source: "operator",
    });
    expect(okuma?.id).toBe("okuma-thread-01");
    expect(okuma?.body).toBe("ramp into thread");
  });

  it("normalizeTribalTip clamps confidence to [0,1]", () => {
    expect(normalizeTribalTip({ id: "x", confidence: 99 })?.confidence).toBe(1);
    expect(normalizeTribalTip({ id: "x", confidence: -5 })?.confidence).toBe(0);
    expect(normalizeTribalTip({ id: "x", confidence: NaN })?.confidence).toBe(0.7);
    expect(normalizeTribalTip({ id: "x" })?.confidence).toBe(0.7);
  });

  it("normalizeTribalTip extracts iso_groups from values_by_iso", () => {
    const n = normalizeTribalTip({
      tip_id: "k1",
      values_by_iso: { P: { kc1_1: 1800 }, M: { kc1_1: 2100 }, K: { kc1_1: 1100 } },
    });
    expect(n?.iso_groups?.sort()).toEqual(["K", "M", "P"]);
  });

  it("normalizeTribalTip returns null when id is missing/blank", () => {
    expect(normalizeTribalTip({ title: "no id" })).toBeNull();
    expect(normalizeTribalTip({ id: "" })).toBeNull();
    expect(normalizeTribalTip({} as Record<string, unknown>)).toBeNull();
  });

  it("defaultLatheTribalSource returns ≥20 entries spanning both schemas", () => {
    const raw = defaultLatheTribalSource();
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThanOrEqual(20);
    // At least one physics-science entry (uses tip_id) and one Okuma (uses id).
    const hasPhys = raw.some((t) => typeof (t as { tip_id?: unknown }).tip_id === "string");
    const hasOkuma = raw.some((t) =>
      typeof (t as { id?: unknown }).id === "string" &&
      typeof (t as { tip?: unknown }).tip === "string",
    );
    expect(hasPhys).toBe(true);
    expect(hasOkuma).toBe(true);
  });

  it("REGRESSION: canonical formula seeding still produces exactly 12 nodes", () => {
    const { engine } = makeEngine();
    const formulas = engine.query({ type: "formula" });
    expect(formulas.nodes.length).toBe(12);
  });

  it("REGRESSION: traceReasoning still pads to ≥5 steps when graph is short", () => {
    const { engine } = makeEngine();
    engine.upsertNode({ type: "material", id: "1018-iter7" });
    const trace = engine.traceReasoning({ start_type: "material", start_id: "1018-iter7" });
    expect(trace.steps.length).toBeGreaterThanOrEqual(5);
  });
});
