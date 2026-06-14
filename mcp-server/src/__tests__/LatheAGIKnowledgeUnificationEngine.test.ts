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
  type LatheOrchestrateOptions,
  type LatheDecisionValue,
} from "../engines/LatheAGIKnowledgeUnificationEngine.js";
import { LatheAGIFeatureBridgeEngine } from "../engines/LatheAGIFeatureBridgeEngine.js";
import { LatheAGIContinuousLearningEngine } from "../engines/LatheAGIContinuousLearningEngine.js";
import { latheAGISafetyContainmentEngine } from "../engines/LatheAGISafetyContainmentEngine.js";
import type { DomainAGIIntent } from "../schemas/domainAGIContract.js";
import { OutcomeEventSchema, type OutcomeEvent } from "../schemas/outcomeEventSchema.js";

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

// ============================================================================
// DOMAIN AGI CONTRACT — orchestrate(intent) — INFRA-AGI-ROUTER-MS2/P0-U03
// ============================================================================

/**
 * Build a fresh orchestrate test rig: a KG engine plus fresh FeatureBridge and
 * ContinuousLearning instances on temp state paths — real cluster composition
 * logic, hermetic (no writes to H:/prism/state/shared/). SafetyContainment is
 * pure, so the real singleton is used directly. `realSeams` wires all four into
 * the orchestrate() opts; `published` captures every emitted outcome event.
 */
function makeOrchestrateRig() {
  const dir = mkdtempSync(join(tmpdir(), "kg-orch-"));
  const engine = new LatheAGIKnowledgeUnificationEngine(join(dir, "kg.json"));
  engine.__resetForTests();
  const fb = new LatheAGIFeatureBridgeEngine(join(dir, "fb.json"));
  const cl = new LatheAGIContinuousLearningEngine(join(dir, "cl.json"));
  const published: OutcomeEvent[] = [];
  const realSeams: LatheOrchestrateOptions = {
    featureReason: (input) => fb.reason(input),
    predictAdjustment: (feature, key) => cl.predictAdjustment(feature, key),
    safetyCheck: (input) => latheAGISafetyContainmentEngine.check(input),
    publishOutcome: (event) => {
      published.push(event);
    },
  };
  return { engine, fb, cl, published, realSeams };
}

/** Build a valid lathe DomainAGIIntent with optional overrides. */
function latheIntent(overrides: Partial<DomainAGIIntent> = {}): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "lathe",
    action: "turning",
    features: [],
    material: "1018 steel",
    constraints: {},
    consensusRequired: false,
    ...overrides,
  };
}

describe("LatheAGIKnowledgeUnificationEngine.orchestrate — DomainAGIIntent contract (P0-U03)", () => {
  // ── 3 lathe intent types — turning / threading / parting ──────────────────
  it("turning intent returns a valid DomainAGIResult with tool/strategy/feed decisions", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ action: "turning" }), realSeams);
    expect(result.success).toBe(true);
    expect(result.schemaVersion).toBe("1.0.0");
    expect(result.decisions.map((d) => d.kind)).toEqual(["tool", "strategy", "feed"]);
    // Content, not just shape — the turning branch must yield turning-specific picks.
    const tool = result.decisions[0].value as LatheDecisionValue;
    const strategy = result.decisions[1].value as LatheDecisionValue;
    const feed = result.decisions[2].value as LatheDecisionValue;
    expect(tool.selected).toContain("CNMG");
    expect(["rough_then_finish", "finish_single_pass"]).toContain(strategy.selected);
    const fd = feed.detail as { vc_m_min: number; fz_mm: number };
    expect(fd.vc_m_min).toBeGreaterThan(0);
    // Baseline feed (no learning slot ⇒ multiplier 1.0) — the ContinuousLearning
    // test below shows 1.5× shifts this to 0.45, proving the multiplier applies.
    expect(fd.fz_mm).toBeCloseTo(0.3, 4);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.outcomes).toHaveLength(3);
  });

  it("threading intent returns a valid result with a threading-specific tool", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ action: "threading" }), realSeams);
    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(3);
    const tool = result.decisions[0].value as LatheDecisionValue;
    expect(tool.selected).toContain("threading insert");
    expect(tool.selected).toContain("16ER"); // ISO-1832 laydown threading designation
  });

  it("parting intent returns a valid result with a parting-specific tool", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ action: "parting" }), realSeams);
    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(3);
    const tool = result.decisions[0].value as LatheDecisionValue;
    expect(tool.selected).toContain("parting blade");
    expect(tool.selected).toContain("MGMN"); // ISO-1832 parting-blade designation
  });

  // ── Confidence rollup ─────────────────────────────────────────────────────
  it("pipeline confidence is the joint product of the 3 decision confidences", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), realSeams);
    expect(result.decisions).toHaveLength(3);
    // The tool decision carries the fixed LATHE_TOOL_HEURISTIC_CONFIDENCE (0.8).
    expect(result.decisions[0].confidence).toBe(0.8);
    const joint =
      result.decisions[0].confidence * result.decisions[1].confidence * result.decisions[2].confidence;
    expect(result.confidence).toBeCloseTo(joint, 5);
    // Joint-product semantics: the rollup of 3 sub-unity factors is strictly
    // smaller than any single factor — proves it is NOT min / max / mean.
    expect(result.confidence).toBeLessThan(result.decisions[0].confidence);
  });

  it("a zero-confidence consensus zeroes the pipeline rollup (multiplicative)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0, voters: [] }),
    });
    expect(result.success).toBe(true);
    expect(result.decisions.every((d) => d.confidence === 0)).toBe(true);
    expect(result.confidence).toBe(0);
  });

  // ── Outcome events ────────────────────────────────────────────────────────
  it("emits one cross_process_decision v1.1.0 outcome event per decision", async () => {
    const { engine, realSeams, published } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), realSeams);
    expect(published).toHaveLength(3);
    expect(result.outcomes).toHaveLength(3);
    for (const e of published) {
      // Proof, not belief — the hand-built event must satisfy the real schema
      // (incl. the v1.1.0 no-version-bleed superRefine).
      expect(() => OutcomeEventSchema.parse(e)).not.toThrow();
      expect(e.schemaVersion).toBe("1.1.0");
      expect(e.kind).toBe("cross_process_decision");
      expect(e.domain).toBe("lathe");
      expect(e.context.engine).toBe("LatheAGIKnowledgeUnificationEngine");
      expect(e.context.pipeline_stage).toBe("domain_agi_orchestrate");
    }
    // Each event carries its own decision's value as `recommended`.
    expect(published.map((e) => e.recommended)).toEqual(result.decisions.map((d) => d.value));
  });

  it("all outcome events of one run share a job_id; lineage_ids are distinct per decision", async () => {
    const { engine, realSeams, published } = makeOrchestrateRig();
    await engine.orchestrate(latheIntent(), realSeams);
    const jobIds = new Set(published.map((e) => e.context.job_id));
    expect(jobIds.size).toBe(1);
    expect(published[0].context.job_id).toMatch(/^lathe-agi-job-/);
    const lineageIds = new Set(published.map((e) => e.lineage_id));
    expect(lineageIds.size).toBe(3);
  });

  it("a throwing publishOutcome seam degrades to a warning; result still succeeds", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      publishOutcome: () => {
        throw new Error("bus down");
      },
    });
    expect(result.success).toBe(true);
    expect(result.outcomes).toHaveLength(3);
    expect(result.warnings.some((w) => w.includes("could not be published"))).toBe(true);
  });

  // ── Consensus gating ──────────────────────────────────────────────────────
  it("consensusRequired routes every pick through the consensus seam", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0.91, voters: ["claude", "ollama"] }),
    });
    expect(result.success).toBe(true);
    expect(result.decisions.every((d) => d.source.startsWith("consensus_decide:"))).toBe(true);
    expect(result.decisions.every((d) => d.confidence === 0.91)).toBe(true);
    expect(result.decisions.every((d) => (d.value as LatheDecisionValue).consensusOverride === false)).toBe(true);
  });

  it("a consensus answer that differs from the engine pick overrides it", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async (q) => ({ answer: q.options[1], confidence: 0.77, voters: ["claude"] }),
    });
    expect(result.success).toBe(true);
    expect(result.decisions.every((d) => (d.value as LatheDecisionValue).consensusOverride === true)).toBe(true);
    for (const d of result.decisions) {
      const v = d.value as LatheDecisionValue;
      expect(v.selected).not.toBe(v.enginePick);
    }
    expect(result.warnings.some((w) => w.includes("Consensus overrode"))).toBe(true);
    // A consensus run populates each decision's alternatives (the losing options).
    expect(result.decisions.every((d) => (d.alternatives?.length ?? 0) > 0)).toBe(true);
    expect(
      result.decisions.every((d) =>
        (d.alternatives ?? []).every((a) => (a.rejected_reason ?? "").includes("consensus")),
      ),
    ).toBe(true);
  });

  it("surfaces consensus_audit_id on decisions + outcome events when the seam provides one", async () => {
    const { engine, realSeams, published } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0.9, voters: ["a"], auditId: "AUD-123" }),
    });
    expect(result.decisions.every((d) => d.consensus_audit_id === "AUD-123")).toBe(true);
    expect(published.every((e) => e.context.consensus_audit_id === "AUD-123")).toBe(true);
  });

  it("never fabricates a consensus_audit_id when the seam omits it (R12)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0.9, voters: ["a"] }),
    });
    expect(result.decisions.every((d) => d.consensus_audit_id === undefined)).toBe(true);
  });

  it("a throwing consensus seam degrades to the engine pick + a warning", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), {
      ...realSeams,
      consensusDecide: async () => {
        throw new Error("voices down");
      },
    });
    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(3);
    expect(result.warnings.some((w) => w.includes("Consensus call failed"))).toBe(true);
  });

  it("the default consensus seam fails loud under the test runner without an injected fake", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    // realSeams has no consensusDecide → defaultConsensusDecide → throws under VITEST.
    const result = await engine.orchestrate(latheIntent({ consensusRequired: true }), realSeams);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("without an injected consensusDecide"))).toBe(true);
  });

  // ── Validation + error paths ──────────────────────────────────────────────
  it("rejects an action that does not belong to the lathe domain (INVALID_INTENT)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ action: "roughing" }), realSeams);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_INTENT");
    expect(result.error?.stage).toBe("validation");
  });

  it("rejects a non-lathe domain (WRONG_DOMAIN)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ domain: "mill", action: "roughing" }), realSeams);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("WRONG_DOMAIN");
  });

  it("returns REASONING_FAILED when the FeatureBridge seam throws", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      featureReason: () => {
        throw new Error("bridge boom");
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_FAILED");
    expect(result.error?.stage).toBe("reasoning");
    // The underlying bridge error must be propagated, not silently absorbed.
    expect(result.error?.message).toContain("bridge boom");
  });

  it("returns REASONING_INCOMPLETE when the FeatureBridge yields no usable prediction", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      featureReason: () => ({
        feature: "speed_feed",
        prediction: {},
        confidence: 0.5,
        explanation: "stub",
        novel_insights: [],
        trace: [],
        generated_at: new Date().toISOString(),
        request_id: "stub",
      }),
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_INCOMPLETE");
  });

  it("returns REASONING_INCOMPLETE when speed/feed is valid but the strategy is absent", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    // Isolates the strategy arm of the completeness guard — speed/feed is fully
    // populated, only print_to_program's `strategy` is missing.
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      featureReason: (input) => ({
        feature: input.feature,
        prediction: input.feature === "speed_feed" ? { vc_m_min: 180, fz_mm: 0.3, ap_mm: 2.0 } : {},
        confidence: 0.7,
        explanation: "partial stub",
        novel_insights: [],
        trace: [],
        generated_at: new Date().toISOString(),
        request_id: "partial",
      }),
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_INCOMPLETE");
  });

  it("returns SAFETY_FLOOR_VIOLATED when SafetyContainment hard-blocks the candidate", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      safetyCheck: () => ({
        passed: false,
        blocking_count: 1,
        warning_count: 0,
        checks: [
          { category: "physics", check_id: "vc_above_hard_max", severity: "hard", message: "Vc exceeds hard max" },
        ],
        trace: [],
      }),
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SAFETY_FLOOR_VIOLATED");
    expect(result.error?.message).toContain("Vc exceeds hard max");
  });

  it("a soft SafetyContainment check surfaces a warning; result still succeeds", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      safetyCheck: () => ({
        passed: true,
        blocking_count: 0,
        warning_count: 1,
        checks: [
          { category: "physics", check_id: "fz_above_soft_max", severity: "soft", message: "fz above recommended" },
        ],
        trace: [],
      }),
    });
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("Safety warning: fz above recommended"))).toBe(true);
  });

  // ── Intent → cluster context mapping ──────────────────────────────────────
  it("maps a tight feature tolerance_um into a finish-pass strategy", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(
      latheIntent({ features: [{ id: "F1", kind: "od_groove", tolerance_um: 10 }] }),
      realSeams,
    );
    expect(result.success).toBe(true);
    const strategy = result.decisions[1].value as LatheDecisionValue;
    expect(strategy.selected).toBe("finish_single_pass");
  });

  it("maps a loose feature tolerance_um into a rough-then-finish strategy", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(
      latheIntent({ features: [{ id: "F1", kind: "od_turn", tolerance_um: 100 }] }),
      realSeams,
    );
    expect(result.success).toBe(true);
    const strategy = result.decisions[1].value as LatheDecisionValue;
    expect(strategy.selected).toBe("rough_then_finish");
  });

  it("a feature tolerance_um of 0 falls through to the FeatureBridge default (no throw)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    // tolerance_um=0 must NOT be forwarded as tolerance_mm=0 — reasonPrintToProgram
    // throws on a non-positive tolerance. orchestrate's `tolUm > 0` guard handles it.
    const result = await engine.orchestrate(
      latheIntent({ features: [{ id: "F1", kind: "od_turn", tolerance_um: 0 }] }),
      realSeams,
    );
    expect(result.success).toBe(true);
    expect(result.decisions).toHaveLength(3);
  });

  it("maps a fine surface_finish_ra_um into a finish-pass strategy", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(
      latheIntent({ features: [{ id: "F1", kind: "od_finish", surface_finish_ra_um: 0.4 }] }),
      realSeams,
    );
    expect(result.success).toBe(true);
    const strategy = result.decisions[1].value as LatheDecisionValue;
    expect(strategy.selected).toBe("finish_single_pass");
  });

  it("surfaces a warning when the ISO group is inferred from an unrecognized material", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ material: "unobtanium-9000" }), realSeams);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("name-based heuristic"))).toBe(true);
  });

  it("does not warn about ISO inference for a recognized material", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent({ material: "1018 steel" }), realSeams);
    expect(result.warnings.some((w) => w.includes("name-based heuristic"))).toBe(false);
  });

  // ── ContinuousLearning feed adjustment ────────────────────────────────────
  it("applies the ContinuousLearning multiplier to the feed and records it", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    const result = await engine.orchestrate(latheIntent(), {
      ...realSeams,
      predictAdjustment: () => 1.5,
    });
    expect(result.success).toBe(true);
    const feed = result.decisions[2].value as LatheDecisionValue;
    const detail = feed.detail as { fz_mm: number; learning_multiplier: number };
    expect(detail.learning_multiplier).toBe(1.5);
    // FeatureBridge default fz is 0.3 mm/rev → 0.3 × 1.5 = 0.45. The multiplier
    // is deliberately chosen so adjustedFz (0.45) stays under the ISO-P fz soft
    // envelope (0.50) — so no safety warning fires and `success` stays true.
    expect(detail.fz_mm).toBeCloseTo(0.45, 4);
    expect(result.warnings.some((w) => w.includes("ContinuousLearning adjusted feed"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("Safety warning"))).toBe(false);
  });

  // ── Legacy KG API preservation ────────────────────────────────────────────
  it("leaves the legacy KG API untouched (formula seed + upsert + query still work)", async () => {
    const { engine, realSeams } = makeOrchestrateRig();
    await engine.orchestrate(latheIntent(), realSeams);
    expect(engine.query({ type: "formula" }).nodes.length).toBe(12);
    const node = engine.upsertNode({ type: "customer", id: "ALCOA" });
    expect(node.id).toBe("ALCOA");
    expect(engine.query({ type: "customer", id: "ALCOA" }).center?.id).toBe("ALCOA");
  });
});
