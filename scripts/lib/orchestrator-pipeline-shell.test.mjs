// scripts/lib/orchestrator-pipeline-shell.test.mjs
//
// Tests for U-MMO-PIPELINE-SHELL.
// Run: node --test H:/prism/scripts/lib/orchestrator-pipeline-shell.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PIPELINE_VERSION,
  STAGE_IDS,
  STAGE_METADATA,
  validateStageAdapter,
  createNoopAdapter,
  createPipeline,
  aggregateDecomposition,
  summarizeRun,
} from "./orchestrator-pipeline-shell.mjs";

// ---------------------------------------------------------------------------
// STAGE_IDS + STAGE_METADATA invariants
// ---------------------------------------------------------------------------

describe("STAGE_IDS + STAGE_METADATA", () => {
  it("has exactly 16 stages", () => {
    assert.equal(STAGE_IDS.length, 16);
  });

  it("STAGE_IDS is frozen", () => {
    assert.ok(Object.isFrozen(STAGE_IDS));
  });

  it("every stage has metadata", () => {
    for (const id of STAGE_IDS) {
      assert.ok(STAGE_METADATA[id], `missing metadata for ${id}`);
      assert.equal(typeof STAGE_METADATA[id].stage_no, "number");
      assert.equal(typeof STAGE_METADATA[id].hub_engine, "string");
    }
  });

  it("stage_no is 1-16 contiguous", () => {
    const nos = STAGE_IDS.map((id) => STAGE_METADATA[id].stage_no).sort((a, b) => a - b);
    assert.deepEqual(nos, Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it("contains the spec-required stages", () => {
    const required = [
      "INPUT", "MATERIAL_RESOLVE", "FEASIBILITY_GATE", "CAD", "SETUP_PLAN",
      "METHOD_ROUTER", "CAM_STRATEGY", "SSF", "TOOL_CRIB", "POST",
      "SETUP_VALIDATION", "SIM_QA", "FAI_GATE", "SECONDARY_OPS", "EXECUTE",
      "ERP_COST_QUOTE",
    ];
    for (const r of required) {
      assert.ok(STAGE_IDS.includes(r), `missing required stage ${r}`);
    }
  });
});

// ---------------------------------------------------------------------------
// validateStageAdapter
// ---------------------------------------------------------------------------

describe("validateStageAdapter", () => {
  const goodAdapter = {
    engineRef: "TestEngine",
    run: () => ({ cost: 0, confidence: 1, evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false }),
  };

  it("accepts a valid adapter", () => {
    validateStageAdapter(goodAdapter, "INPUT");
  });

  it("rejects null adapter", () => {
    assert.throws(() => validateStageAdapter(null, "INPUT"), /must be an object/);
  });

  it("rejects invalid stageId", () => {
    assert.throws(() => validateStageAdapter(goodAdapter, "NOT_A_STAGE"), /invalid stageId/);
  });

  it("rejects adapter missing run()", () => {
    assert.throws(() => validateStageAdapter({ engineRef: "X" }, "INPUT"), /adapter\.run/);
  });

  it("rejects adapter missing engineRef (R8)", () => {
    assert.throws(() => validateStageAdapter({ run: () => ({}) }, "INPUT"), /engineRef/);
  });
});

// ---------------------------------------------------------------------------
// createNoopAdapter
// ---------------------------------------------------------------------------

describe("createNoopAdapter", () => {
  it("returns deferred=true + zero cost (R12 honest)", () => {
    const noop = createNoopAdapter("INPUT");
    const r = noop.run({}, {});
    assert.equal(r.cost, 0);
    assert.equal(r.confidence, 0);
    assert.equal(r.deferred, true);
    assert.match(r.trace, /UNBUILT: INPUT/);
  });

  it("evidence array surfaces the gap honestly", () => {
    const noop = createNoopAdapter("SETUP_PLAN");
    const r = noop.run({}, {});
    assert.ok(r.evidence.some((e) => e.includes("UNDERESTIMATE")));
  });

  it("includes the canonical hub_engine in engineRef", () => {
    const noop = createNoopAdapter("CAD");
    assert.match(noop.engineRef, /CADSystemRouterEngine/);
    assert.match(noop.engineRef, /UNBUILT-NOOP/);
  });

  it("rejects invalid stageId", () => {
    assert.throws(() => createNoopAdapter("FAKE"), /invalid stageId/);
  });
});

// ---------------------------------------------------------------------------
// createPipeline
// ---------------------------------------------------------------------------

describe("createPipeline", () => {
  it("defaults to estimate mode", () => {
    const p = createPipeline();
    assert.equal(p.mode, "estimate");
  });

  it("accepts execute mode", () => {
    const p = createPipeline({ mode: "execute" });
    assert.equal(p.mode, "execute");
  });

  it("rejects unknown mode", () => {
    assert.throws(() => createPipeline({ mode: "yolo" }), /mode must be/);
  });

  it("starts with 16 no-op adapters", () => {
    const p = createPipeline();
    const stages = p.listStages();
    assert.equal(stages.length, 16);
    assert.equal(stages.every((s) => s.isNoop === true), true);
  });

  it("registerStage replaces no-op with real adapter", () => {
    const p = createPipeline();
    p.registerStage("INPUT", {
      engineRef: "RealInputEngine",
      run: () => ({ cost: 100, confidence: 0.9, evidence: ["test"], gdnt_passthrough: null, trace: "real", output: {}, deferred: false }),
    });
    const stages = p.listStages();
    const input = stages.find((s) => s.stageId === "INPUT");
    assert.equal(input.isNoop, false);
    assert.equal(input.engineRef, "RealInputEngine");
  });

  it("registerStage validates the adapter contract", () => {
    const p = createPipeline();
    assert.throws(() => p.registerStage("INPUT", { run: () => ({}) }), /engineRef/);
    assert.throws(() => p.registerStage("INPUT", { engineRef: "X" }), /adapter\.run/);
  });
});

// ---------------------------------------------------------------------------
// Pipeline.run() — end-to-end
// ---------------------------------------------------------------------------

describe("Pipeline.run() with all no-op stages", () => {
  it("runs all 16 stages and returns decomposition + totals", () => {
    const p = createPipeline();
    const result = p.run({ rfq_id: "TEST-001" });
    assert.equal(result.decomposition.length, 16);
    assert.equal(result.totals.cost_p50, 0);
    assert.equal(result.totals.cost_p95, 0);
    assert.equal(result.totals.cost_p99, 0);
    assert.equal(result.totals.deferred_stages.length, 16, "all stages deferred when no real adapters registered");
    assert.equal(result.totals.quote_reliability, "GAMMA");
  });

  it("attaches run_metadata with version + mode + timestamps", () => {
    const p = createPipeline({ mode: "estimate" });
    const r = p.run({});
    assert.equal(r.run_metadata.version, PIPELINE_VERSION);
    assert.equal(r.run_metadata.mode, "estimate");
    assert.ok(r.run_metadata.startTime);
    assert.ok(r.run_metadata.endTime);
  });

  it("rejects non-object initialInput (R12)", () => {
    const p = createPipeline();
    assert.throws(() => p.run(null), /initialInput object required/);
    assert.throws(() => p.run("rfq-001"), /initialInput object required/);
  });
});

describe("Pipeline.run() with mixed real + no-op adapters", () => {
  function makeRealAdapter(stage, cost, confidence) {
    return {
      engineRef: `Real${stage}Engine`,
      run: (input, _context) => ({
        cost, confidence,
        duration_estimate_sec: 60,
        evidence: [`${stage}: cost=${cost}, conf=${confidence}`],
        gdnt_passthrough: stage === "INPUT" ? { tolerances: [0.005, 0.010] } : null,
        trace: `${stage} ran on ${input.rfq_id || "?"}`,
        output: { from: stage },
        deferred: false,
      }),
    };
  }

  it("real adapters contribute to totals, no-ops do not", () => {
    const p = createPipeline();
    p.registerStage("MATERIAL_RESOLVE", makeRealAdapter("MATERIAL_RESOLVE", 47.20, 0.95));
    p.registerStage("CAM_STRATEGY", makeRealAdapter("CAM_STRATEGY", 64.50, 0.75));
    p.registerStage("SSF", makeRealAdapter("SSF", 11.30, 0.90));
    const r = p.run({ rfq_id: "TEST-002" });
    const realStages = r.decomposition.filter((s) => !s.deferred);
    assert.equal(realStages.length, 3);
    assert.ok(Math.abs(r.totals.cost_p50 - (47.20 + 64.50 + 11.30)) < 0.01);
    assert.ok(r.totals.cost_p99 > r.totals.cost_p50, "p99 must be ≥ p50");
    assert.ok(r.totals.cost_p95 > r.totals.cost_p50 || r.totals.cost_p95 === r.totals.cost_p50);
    assert.ok(r.totals.cost_p95 <= r.totals.cost_p99);
  });

  it("propagates GD&T side-channel from INPUT through to FAI_GATE", () => {
    const p = createPipeline();
    p.registerStage("INPUT", {
      engineRef: "RealInputEngine",
      run: () => ({
        cost: 0, confidence: 1, evidence: [],
        gdnt_passthrough: { tolerances: [0.005, 0.010], features: ["pocket_1"] },
        trace: "", output: {}, deferred: false,
      }),
    });
    const r = p.run({});
    assert.deepEqual(r.gdnt_final, { tolerances: [0.005, 0.010], features: ["pocket_1"] });
  });

  it("confidence_trace records every stage's confidence", () => {
    const p = createPipeline();
    const r = p.run({});
    assert.equal(r.confidence_trace.length, 16);
    for (const t of r.confidence_trace) {
      assert.ok(STAGE_IDS.includes(t.stage));
      assert.ok(typeof t.confidence === "number" && t.confidence >= 0 && t.confidence <= 1);
    }
  });

  it("invokes audit hook once per stage", () => {
    const audited = [];
    const p = createPipeline({ audit: (entry) => audited.push(entry.stageId) });
    p.run({});
    assert.equal(audited.length, 16);
    assert.deepEqual(audited, [...STAGE_IDS]);
  });

  it("R12: rejects adapter returning non-finite cost", () => {
    const p = createPipeline();
    p.registerStage("INPUT", {
      engineRef: "BadAdapter",
      run: () => ({ cost: NaN, confidence: 1, evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false }),
    });
    assert.throws(() => p.run({}), /non-finite cost/);
  });

  it("R12: rejects adapter returning confidence out of [0,1]", () => {
    const p = createPipeline();
    p.registerStage("INPUT", {
      engineRef: "BadAdapter",
      run: () => ({ cost: 10, confidence: 1.5, evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false }),
    });
    assert.throws(() => p.run({}), /confidence must be in/);
  });

  it("R12: surfaces stage that throws as errored, doesn't crash the run", () => {
    const p = createPipeline();
    p.registerStage("INPUT", {
      engineRef: "ThrowingAdapter",
      run: () => { throw new Error("simulated stage failure"); },
    });
    const r = p.run({ rfq_id: "TEST-CRASH" });
    const inputStage = r.decomposition.find((s) => s.stage === "INPUT");
    assert.equal(inputStage.errored, true);
    assert.match(inputStage.trace, /simulated stage failure/);
    assert.equal(r.totals.errored_stages.length, 1);
  });
});

// ---------------------------------------------------------------------------
// aggregateDecomposition
// ---------------------------------------------------------------------------

describe("aggregateDecomposition", () => {
  it("returns zero totals for empty decomposition", () => {
    const t = aggregateDecomposition([]);
    assert.equal(t.cost_p50, 0);
    assert.equal(t.cost_p99, 0);
    assert.equal(t.deferred_stages.length, 0);
    assert.equal(t.quote_reliability, "ALPHA");
  });

  it("quote_reliability = ALPHA when all stages built + no errors", () => {
    const decomp = STAGE_IDS.map((s) => ({ stage: s, cost: 10, confidence: 0.9, deferred: false, errored: false }));
    assert.equal(aggregateDecomposition(decomp).quote_reliability, "ALPHA");
  });

  it("quote_reliability = BETA when 1-4 stages deferred", () => {
    const decomp = STAGE_IDS.map((s, i) => ({ stage: s, cost: 10, confidence: 0.9, deferred: i < 3, errored: false }));
    assert.equal(aggregateDecomposition(decomp).quote_reliability, "BETA");
  });

  it("quote_reliability = GAMMA when 5+ stages deferred", () => {
    const decomp = STAGE_IDS.map((s, i) => ({ stage: s, cost: 10, confidence: 0.9, deferred: i < 6, errored: false }));
    assert.equal(aggregateDecomposition(decomp).quote_reliability, "GAMMA");
  });

  it("quote_reliability = GAMMA when ANY stage errored (regardless of count)", () => {
    const decomp = STAGE_IDS.map((s, i) => ({ stage: s, cost: 10, confidence: 0.9, deferred: false, errored: i === 0 }));
    assert.equal(aggregateDecomposition(decomp).quote_reliability, "GAMMA");
  });

  it("p99 ≥ p50 for any cost distribution", () => {
    const decomp = [
      { stage: "A", cost: 100, confidence: 0.9, deferred: false },
      { stage: "B", cost: 50,  confidence: 0.5, deferred: false },
      { stage: "C", cost: 200, confidence: 0.3, deferred: false },
    ];
    const t = aggregateDecomposition(decomp);
    assert.ok(t.cost_p99 >= t.cost_p50, `p99=${t.cost_p99} must be ≥ p50=${t.cost_p50}`);
    assert.ok(t.cost_p95 >= t.cost_p50);
    assert.ok(t.cost_p95 <= t.cost_p99);
  });

  it("identifies min_confidence stage", () => {
    const decomp = [
      { stage: "A", cost: 10, confidence: 0.9, deferred: false },
      { stage: "B", cost: 10, confidence: 0.3, deferred: false },
      { stage: "C", cost: 10, confidence: 0.7, deferred: false },
    ];
    const t = aggregateDecomposition(decomp);
    assert.equal(t.min_confidence.stage, "B");
    assert.equal(t.min_confidence.value, 0.3);
  });

  it("floors confidence at 0.1 to prevent p99 blow-up on unbuilt stages", () => {
    const decomp = [
      { stage: "A", cost: 100, confidence: 0, deferred: true },
    ];
    const t = aggregateDecomposition(decomp);
    // confidence floored at 0.1, so p99 = 100/0.1 = 1000
    assert.ok(t.cost_p99 <= 1000.01, `p99 should be bounded ≈ 1000, got ${t.cost_p99}`);
    assert.ok(t.cost_p99 >= 999.99);
  });

  it("rejects non-array input", () => {
    assert.throws(() => aggregateDecomposition("not array"), /must be an array/);
  });
});

// ---------------------------------------------------------------------------
// summarizeRun
// ---------------------------------------------------------------------------

describe("summarizeRun", () => {
  it("returns a compact 1-line summary", () => {
    const t = { cost_p50: 100, cost_p95: 120, cost_p99: 150, duration_total_sec: 600, quote_reliability: "ALPHA", deferred_stages: [] };
    const s = summarizeRun(t);
    assert.match(s, /\$100\/p50/);
    assert.match(s, /\$120\/p95/);
    assert.match(s, /\$150\/p99/);
    assert.match(s, /600s/);
    assert.match(s, /ALPHA/);
  });

  it("includes deferred stage list", () => {
    const t = { cost_p50: 0, cost_p95: 0, cost_p99: 0, duration_total_sec: 0, quote_reliability: "GAMMA", deferred_stages: ["INPUT", "CAD"] };
    const s = summarizeRun(t);
    assert.match(s, /deferred=\[INPUT,CAD\]/);
  });

  it("handles null gracefully", () => {
    assert.equal(summarizeRun(null), "(no run totals)");
  });
});

// ---------------------------------------------------------------------------
// Anti-regression — invariants that compound through MS0 unit landings
// ---------------------------------------------------------------------------

describe("anti-regression invariants", () => {
  it("PIPELINE_VERSION is semver", () => {
    assert.match(PIPELINE_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it("end-to-end deterministic for the same input", () => {
    const make = () => createPipeline();
    const a = make().run({ rfq_id: "DETERMINISTIC" });
    const b = make().run({ rfq_id: "DETERMINISTIC" });
    assert.equal(a.totals.cost_p50, b.totals.cost_p50);
    assert.equal(a.totals.quote_reliability, b.totals.quote_reliability);
    assert.deepEqual(a.totals.deferred_stages, b.totals.deferred_stages);
  });

  it("stage execution order matches STAGE_IDS order", () => {
    const order = [];
    const p = createPipeline();
    for (const id of STAGE_IDS) {
      p.registerStage(id, {
        engineRef: `Engine${id}`,
        run: () => {
          order.push(id);
          return { cost: 0, confidence: 1, evidence: [], gdnt_passthrough: null, trace: "", output: {}, deferred: false };
        },
      });
    }
    p.run({});
    assert.deepEqual(order, [...STAGE_IDS]);
  });
});
