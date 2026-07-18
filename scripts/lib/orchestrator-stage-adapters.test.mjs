// scripts/lib/orchestrator-stage-adapters.test.mjs
//
// Tests for U-MMO-FEASIBILITY-GATE + U-MMO-MATERIAL-RESOLVE-STAGE +
// U-MMO-TOOL-CRIB-STAGE (bundled stage adapters).
// Run: node --test H:/prism/scripts/lib/orchestrator-stage-adapters.test.mjs

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createFeasibilityGateAdapter,
  createMaterialResolveAdapter,
  createToolCribAdapter,
  registerWireUnits,
} from "./orchestrator-stage-adapters.mjs";
import { createPipeline, validateStageAdapter, STAGE_IDS } from "./orchestrator-pipeline-shell.mjs";

// ===========================================================================
// FEASIBILITY-GATE adapter
// ===========================================================================

describe("createFeasibilityGateAdapter", () => {
  it("rejects missing callEngine", () => {
    assert.throws(() => createFeasibilityGateAdapter({}), /callEngine fn required/);
  });

  it("conforms to the pipeline-shell adapter contract", () => {
    const a = createFeasibilityGateAdapter({ callEngine: () => ({ feasible: true, confidence: 0.9 }) });
    validateStageAdapter(a, "FEASIBILITY_GATE");
  });

  it("returns PASS with confidence + evidence when feasible", () => {
    const a = createFeasibilityGateAdapter({
      callEngine: () => ({ feasible: true, reasons: ["geometry within envelope"], confidence: 0.92 }),
    });
    const r = a.run({ rfq_id: "X" }, {});
    assert.equal(r.output.feasible, true);
    assert.equal(r.confidence, 0.92);
    assert.ok(r.evidence.some((e) => e === "feasibility: PASS"));
    assert.ok(r.evidence.some((e) => e.startsWith("REASON:")));
    assert.match(r.trace, /FEASIBILITY-GATE PASS/);
  });

  it("returns FAIL trace + zero-cost defer-equivalent when not feasible", () => {
    const a = createFeasibilityGateAdapter({
      callEngine: () => ({ feasible: false, blockers: ["spindle Z-travel insufficient"], confidence: 0.95 }),
    });
    const r = a.run({}, {});
    assert.equal(r.output.feasible, false);
    assert.equal(r.feasibility_failed, true);
    assert.ok(r.evidence.some((e) => e === "feasibility: FAIL"));
    assert.ok(r.evidence.some((e) => e.startsWith("BLOCKER:")));
    assert.match(r.trace, /FEASIBILITY-GATE FAIL/);
  });

  it("R12: surfaces engine throw with errored output + zero confidence", () => {
    const a = createFeasibilityGateAdapter({
      callEngine: () => { throw new Error("DB down"); },
    });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.equal(r.output._error, true);
    assert.match(r.trace, /FEASIBILITY-GATE error: DB down/);
  });

  it("R12: surfaces invalid engine result", () => {
    const a = createFeasibilityGateAdapter({ callEngine: () => null });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid-result/);
  });

  it("respects custom engineRef", () => {
    const a = createFeasibilityGateAdapter({
      callEngine: () => ({ feasible: true, confidence: 0.9 }),
      engineRef: "CustomFeasibilityEngine",
    });
    assert.equal(a.engineRef, "CustomFeasibilityEngine");
  });

  it("emits warnings in evidence (soft concerns)", () => {
    const a = createFeasibilityGateAdapter({
      callEngine: () => ({
        feasible: true, warnings: ["tight tolerance on hole #3"], confidence: 0.85,
      }),
    });
    const r = a.run({}, {});
    assert.ok(r.evidence.some((e) => e.startsWith("WARN:")));
  });

  it("defaults to 0.85 confidence when engine doesn't return one", () => {
    const a = createFeasibilityGateAdapter({ callEngine: () => ({ feasible: true }) });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0.85);
  });
});

// ===========================================================================
// MATERIAL-RESOLVE adapter — variability: ISO P/M/K/N/S/H (≥3 spanning)
// ===========================================================================

describe("createMaterialResolveAdapter", () => {
  it("rejects missing callEngine", () => {
    assert.throws(() => createMaterialResolveAdapter({}), /callEngine fn required/);
  });

  it("conforms to pipeline contract", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "AISI_4140_HRH", iso_group: "P", hardness_hb: 250, confidence: 0.9 }),
    });
    validateStageAdapter(a, "MATERIAL_RESOLVE");
  });

  it("resolves ISO P (steel) — variability axis 1", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "AISI_4140_HRH", iso_group: "P", hardness_hb: 250, machinability_score: 0.65, confidence: 0.92 }),
    });
    const r = a.run({ material: "4140" }, {});
    assert.equal(r.output.iso_group, "P");
    assert.equal(r.output.hardness_hb, 250);
    assert.equal(r.confidence, 0.92);
    assert.ok(r.evidence.some((e) => e.includes("AISI_4140_HRH")));
  });

  it("resolves ISO M (stainless) — variability axis 2", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "AISI_316L", iso_group: "M", hardness_hb: 217, confidence: 0.88 }),
    });
    const r = a.run({ material: "316L" }, {});
    assert.equal(r.output.iso_group, "M");
    assert.match(r.trace, /ISO M/);
  });

  it("resolves ISO S (heat-resistant / superalloy) — variability axis 3", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "INCONEL_718", iso_group: "S", hardness_hb: 380, machinability_score: 0.10, confidence: 0.85 }),
    });
    const r = a.run({ material: "Inconel 718" }, {});
    assert.equal(r.output.iso_group, "S");
  });

  it("resolves ISO H (hardened steel) — variability axis 4", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "A2_TOOL_STEEL_HRC60", iso_group: "H", hardness_hb: 650, confidence: 0.80 }),
    });
    const r = a.run({}, {});
    assert.equal(r.output.iso_group, "H");
  });

  it("resolves ISO N (non-ferrous) + K (cast iron) — variability axes 5+6", () => {
    const aN = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "AL_6061_T6", iso_group: "N", hardness_hb: 95, confidence: 0.95 }),
    }).run({}, {});
    assert.equal(aN.output.iso_group, "N");
    const aK = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "GREY_CAST_IRON_25", iso_group: "K", hardness_hb: 230, confidence: 0.90 }),
    }).run({}, {});
    assert.equal(aK.output.iso_group, "K");
  });

  it("R12: rejects invalid iso_group", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "X", iso_group: "Z", hardness_hb: 100, confidence: 0.9 }),
    });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid-iso-group/);
  });

  it("R12: rejects engine result missing canonical_id", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ iso_group: "P", hardness_hb: 250 }),
    });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid-result/);
  });

  it("R12: surfaces engine throw", () => {
    const a = createMaterialResolveAdapter({ callEngine: () => { throw new Error("Material DB unreachable"); } });
    const r = a.run({}, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /Material DB unreachable/);
  });

  it("notes heat-treat requirement in evidence", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "AISI_4140_ANNEALED", iso_group: "P", hardness_hb: 200, requires_heat_treat: true, confidence: 0.9 }),
    });
    const r = a.run({}, {});
    assert.ok(r.evidence.some((e) => e.includes("requires heat-treat")));
    assert.equal(r.output.requires_heat_treat, true);
  });

  it("notes supplier in evidence when recommended", () => {
    const a = createMaterialResolveAdapter({
      callEngine: () => ({ canonical_id: "X", iso_group: "P", hardness_hb: 200, supplier_recommended: "MetalsUSA-Chicago", confidence: 0.85 }),
    });
    const r = a.run({}, {});
    assert.ok(r.evidence.some((e) => e.includes("supplier:")));
    assert.equal(r.output.supplier_recommended, "MetalsUSA-Chicago");
  });
});

// ===========================================================================
// TOOL-CRIB adapter
// ===========================================================================

describe("createToolCribAdapter", () => {
  const ok = (toolId) => ({ tool_id: toolId, in_stock: 3 });
  const sub = (toolId, alt) => ({ tool_id: toolId, in_stock: 0, substitute: alt });
  const buy = (toolId, cost, days) => ({ tool_id: toolId, in_stock: 0, buy_cost: cost, lead_days: days });
  const miss = (toolId) => ({ tool_id: toolId, in_stock: 0 });

  it("rejects missing callEngine", () => {
    assert.throws(() => createToolCribAdapter({}), /callEngine fn required/);
  });

  it("conforms to pipeline contract", () => {
    const a = createToolCribAdapter({ callEngine: () => ({ availability: [], total_buy_cost: 0, max_lead_days: 0, substitutes_applied: [], hard_misses: [] }) });
    validateStageAdapter(a, "TOOL_CRIB");
  });

  it("returns OK + zero-cost when all tools in inventory", () => {
    const a = createToolCribAdapter({
      callEngine: () => ({
        availability: [ok("EM-12-4FL"), ok("DR-6.0")],
        total_buy_cost: 0, max_lead_days: 0,
        substitutes_applied: [], hard_misses: [],
      }),
    });
    const r = a.run({ tools_required: [{ tool_id: "EM-12-4FL", qty_required: 1 }, { tool_id: "DR-6.0", qty_required: 1 }] }, {});
    assert.equal(r.cost, 0);
    assert.equal(r.output.tool_crib_ok, true);
    assert.ok(r.evidence.some((e) => e.includes("all tools in inventory")));
    assert.match(r.trace, /all in stock/);
  });

  it("emits buy cost + lead time when tool must be ordered", () => {
    const a = createToolCribAdapter({
      callEngine: () => ({
        availability: [buy("EM-12-3FL", 78.50, 5)],
        total_buy_cost: 78.50, max_lead_days: 5,
        substitutes_applied: [], hard_misses: [],
      }),
    });
    const r = a.run({ tools_required: [{ tool_id: "EM-12-3FL", qty_required: 2 }] }, {});
    assert.equal(r.cost, 78.50);
    assert.equal(r.output.max_lead_days, 5);
    assert.equal(r.duration_estimate_sec, 5 * 24 * 3600);
    assert.match(r.trace, /\$78.50 order/);
  });

  it("lowers confidence when substitutes applied", () => {
    const a = createToolCribAdapter({
      callEngine: () => ({
        availability: [sub("EM-12-4FL", "EM-12-3FL")],
        total_buy_cost: 0, max_lead_days: 0,
        substitutes_applied: ["EM-12-4FL→EM-12-3FL"], hard_misses: [],
      }),
    });
    const r = a.run({ tools_required: [{ tool_id: "EM-12-4FL", qty_required: 1 }] }, {});
    assert.ok(r.confidence < 0.9, `expected lowered confidence, got ${r.confidence}`);
    assert.ok(r.evidence.some((e) => e.includes("substitutes:")));
    assert.equal(r.output.tool_crib_ok, true);  // substitutes still OK
  });

  it("blocks pipeline (confidence=low + tool_crib_ok=false) on hard miss", () => {
    const a = createToolCribAdapter({
      callEngine: () => ({
        availability: [miss("EXOTIC-CARBIDE-50")],
        total_buy_cost: 0, max_lead_days: 0,
        substitutes_applied: [], hard_misses: ["EXOTIC-CARBIDE-50"],
      }),
    });
    const r = a.run({ tools_required: [{ tool_id: "EXOTIC-CARBIDE-50", qty_required: 1 }] }, {});
    assert.equal(r.output.tool_crib_ok, false);
    assert.ok(r.confidence <= 0.5, `expected confidence ≤0.5, got ${r.confidence}`);
    assert.match(r.trace, /BLOCKED/);
    assert.ok(r.evidence.some((e) => e.includes("HARD MISSES:")));
  });

  it("handles empty tools_required gracefully (upstream didn't emit)", () => {
    const a = createToolCribAdapter({ callEngine: () => ({ availability: [], total_buy_cost: 0, max_lead_days: 0, substitutes_applied: [], hard_misses: [] }) });
    const r = a.run({}, {});
    assert.equal(r.cost, 0);
    assert.equal(r.confidence, 0.5);
    assert.match(r.trace, /no tools requested/);
  });

  it("R12: surfaces engine throw", () => {
    const a = createToolCribAdapter({ callEngine: () => { throw new Error("Inventory DB offline"); } });
    const r = a.run({ tools_required: [{ tool_id: "X", qty_required: 1 }] }, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /Inventory DB offline/);
  });

  it("R12: rejects invalid availability shape", () => {
    const a = createToolCribAdapter({ callEngine: () => ({ availability: "not-array" }) });
    const r = a.run({ tools_required: [{ tool_id: "X", qty_required: 1 }] }, {});
    assert.equal(r.confidence, 0);
    assert.match(r.trace, /invalid-result/);
  });

  it("reads tools_required from input.prior chain (upstream stage output)", () => {
    const a = createToolCribAdapter({
      callEngine: () => ({
        availability: [ok("DR-3.5")],
        total_buy_cost: 0, max_lead_days: 0,
        substitutes_applied: [], hard_misses: [],
      }),
    });
    // Upstream stage emitted tools via the .prior chain
    const r = a.run({ prior: { tools_required: [{ tool_id: "DR-3.5", qty_required: 1 }] } }, {});
    assert.equal(r.cost, 0);
    assert.equal(r.output.tool_crib_ok, true);
  });
});

// ===========================================================================
// registerWireUnits — convenience bundling
// ===========================================================================

describe("registerWireUnits", () => {
  it("registers all 3 stages with provided engine fns", () => {
    const p = createPipeline({ mode: "estimate" });
    registerWireUnits(p, {
      feasibility: () => ({ feasible: true, confidence: 0.9 }),
      material: () => ({ canonical_id: "AISI_4140", iso_group: "P", hardness_hb: 250, confidence: 0.9 }),
      toolCrib: () => ({ availability: [{ tool_id: "X", in_stock: 1 }], total_buy_cost: 0, max_lead_days: 0, substitutes_applied: [], hard_misses: [] }),
    });
    const stages = p.listStages();
    const feas = stages.find((s) => s.stageId === "FEASIBILITY_GATE");
    const mat = stages.find((s) => s.stageId === "MATERIAL_RESOLVE");
    const crib = stages.find((s) => s.stageId === "TOOL_CRIB");
    assert.equal(feas.isNoop, false);
    assert.equal(mat.isNoop, false);
    assert.equal(crib.isNoop, false);
  });

  it("skips a stage when its engine fn is omitted", () => {
    const p = createPipeline({ mode: "estimate" });
    registerWireUnits(p, {
      feasibility: () => ({ feasible: true, confidence: 0.9 }),
      // material + toolCrib omitted
    });
    const stages = p.listStages();
    const feas = stages.find((s) => s.stageId === "FEASIBILITY_GATE");
    const mat = stages.find((s) => s.stageId === "MATERIAL_RESOLVE");
    assert.equal(feas.isNoop, false);
    assert.equal(mat.isNoop, true);  // still default no-op
  });

  it("rejects null pipeline", () => {
    assert.throws(() => registerWireUnits(null, {}), /pipeline with registerStage/);
  });

  it("rejects null engines object", () => {
    const p = createPipeline();
    assert.throws(() => registerWireUnits(p, null), /engines object required/);
  });
});

// ===========================================================================
// End-to-end integration with the pipeline shell
// ===========================================================================

describe("end-to-end integration with pipeline shell", () => {
  it("3 wired stages contribute to pipeline run; 13 remain no-op", () => {
    const p = createPipeline({ mode: "estimate" });
    registerWireUnits(p, {
      feasibility: () => ({ feasible: true, reasons: ["envelope OK"], confidence: 0.93 }),
      material: () => ({ canonical_id: "AISI_4140_HRH", iso_group: "P", hardness_hb: 250, machinability_score: 0.65, confidence: 0.90 }),
      toolCrib: () => ({ availability: [{ tool_id: "EM-12", in_stock: 2 }], total_buy_cost: 0, max_lead_days: 0, substitutes_applied: [], hard_misses: [] }),
    });
    const result = p.run({ rfq_id: "INT-001", tools_required: [{ tool_id: "EM-12", qty_required: 1 }] });
    assert.equal(result.decomposition.length, STAGE_IDS.length);
    const real = result.decomposition.filter((s) => !s.deferred);
    assert.equal(real.length, 3, "exactly 3 stages should be real (the wired ones)");
    const realIds = real.map((s) => s.stage).sort();
    assert.deepEqual(realIds, ["FEASIBILITY_GATE", "MATERIAL_RESOLVE", "TOOL_CRIB"]);
  });

  it("feasibility FAIL → downstream stages still execute (no short-circuit by design)", () => {
    const p = createPipeline({ mode: "estimate" });
    registerWireUnits(p, {
      feasibility: () => ({ feasible: false, blockers: ["machine envelope"], confidence: 0.95 }),
    });
    const result = p.run({ rfq_id: "BLOCKED" });
    const feas = result.decomposition.find((s) => s.stage === "FEASIBILITY_GATE");
    assert.equal(feas.deferred, false);
    // Other stages still ran as no-op (quote_reliability reflects this)
    assert.equal(result.decomposition.length, STAGE_IDS.length);
    assert.ok(result.totals.deferred_stages.length > 0);
  });

  it("pipeline-shell + adapters are deterministic for same input", () => {
    const make = () => {
      const p = createPipeline();
      registerWireUnits(p, {
        feasibility: () => ({ feasible: true, confidence: 0.9 }),
        material: () => ({ canonical_id: "X", iso_group: "P", hardness_hb: 250, confidence: 0.9 }),
      });
      return p;
    };
    const a = make().run({ rfq_id: "DET" });
    const b = make().run({ rfq_id: "DET" });
    assert.equal(a.totals.cost_p50, b.totals.cost_p50);
    assert.equal(a.totals.quote_reliability, b.totals.quote_reliability);
    assert.deepEqual(a.totals.deferred_stages, b.totals.deferred_stages);
  });
});
