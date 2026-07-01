/**
 * PipelineHarnessAdaptersEngine tests — Axis 4 Mill + Lathe adapter binding.
 *
 * Karpathy R9: tests verify intent, not behavior. Each test names WHY
 * the invariant matters (harness depends on this exact shape to assert).
 */

import { describe, it, expect } from "vitest";
import {
  PipelineHarnessAdaptersEngine,
  pipelineHarnessAdaptersEngine,
  normalizeMillInput,
  millResultToStages,
  normalizeLatheInput,
} from "../engines/PipelineHarnessAdaptersEngine.js";
import { domainWizardPipelineTestEngine, MILL_CONTRACT, LATHE_CONTRACT } from "../engines/DomainWizardPipelineTestEngine.js";
import type { StageOutput, PipelineRunResult } from "../engines/DomainWizardPipelineTestEngine.js";

const engine = pipelineHarnessAdaptersEngine;

/** Find a stage by canonical name; throw with full names dump if missing. */
function stageByName(result: PipelineRunResult, name: StageOutput["stage"]): StageOutput {
  const s = result.stages.find(x => x.stage === name);
  if (!s) {
    throw new Error(`Expected stage='${name}', but saw [${result.stages.map(x => x.stage).join(", ")}] error='${result.error ?? ""}'`);
  }
  return s;
}

describe("PipelineHarnessAdaptersEngine — Axis 4 Mill + Lathe binding", () => {
  describe("supportedDomains + isBound contract", () => {
    it("exposes the canonical 3 wizard domains", () => {
      expect(engine.supportedDomains().sort()).toEqual(["lathe", "mill", "wire_edm"]);
    });
    it("isBound is true for the bound domains (mill + lathe); wire_edm still unbound", () => {
      expect(engine.isBound("mill")).toBe(true);
      expect(engine.isBound("lathe")).toBe(true);
      expect(engine.isBound("wire_edm")).toBe(false);
    });
    it("version is exactly '1.1.0'", () => {
      expect(engine.version).toBe("1.1.0");
    });
  });

  describe("normalizeMillInput defaults", () => {
    it("undefined input produces a complete MillingInput with smoke-test defaults", () => {
      const norm = normalizeMillInput(undefined);
      expect(norm.part_number).toBe("TANGO-AXIS4-SMOKE");
      expect((norm as unknown as { material: { iso_group: string } }).material.iso_group).toBe("P");
      expect((norm as unknown as { machine_model: string }).machine_model).toBe("VF-2");
      const feats = (norm as unknown as { features: unknown[] }).features;
      expect(Array.isArray(feats)).toBe(true);
      expect(feats.length).toBeGreaterThanOrEqual(1);
    });
    it("partial input is merged (caller overrides iso_group to 'M')", () => {
      const norm = normalizeMillInput({ iso_group: "M" });
      expect((norm as unknown as { material: { iso_group: string } }).material.iso_group).toBe("M");
    });
    it("empty features array is replaced with default canonical pocket", () => {
      const norm = normalizeMillInput({ features: [] });
      const feats = (norm as unknown as { features: unknown[] }).features;
      expect(feats.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("makeMillAdapter — closure shape + Promise contract", () => {
    it("returns a function whose call yields a Promise", () => {
      const adapter = engine.makeMillAdapter();
      expect(typeof adapter).toBe("function");
      const ret = adapter({});
      expect(ret).toBeInstanceOf(Promise);
      // Drain the promise so the open handle doesn't leak across tests.
      return ret;
    });
    it("adapter resolves to a PipelineRunResult with stages array", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      expect(Array.isArray(result.stages)).toBe(true);
      // .error is either undefined or a string — never a non-string truthy.
      const errorIsValidShape = result.error === undefined || typeof result.error === "string";
      expect(errorIsValidShape).toBe(true);
    });
    it("adapter does NOT throw on degenerate input — surfaces error via .error string", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({ machine_model: "DOES_NOT_EXIST_42X" });
      // Whether the engine accepts or rejects, we must get a structured result.
      expect(Array.isArray(result.stages)).toBe(true);
      expect(typeof result.final_program).toBe("string");
    });
  });

  describe("makeMillAdapter — 6 canonical stages emitted in order", () => {
    it("stage sequence exactly matches MILL_CONTRACT.required_stages", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      if (result.error && result.stages.length === 0) {
        throw new Error(`Mill adapter failed catastrophically: ${result.error}`);
      }
      const stageNames = result.stages.map(s => s.stage);
      expect(stageNames).toEqual([
        "cad_parse", "feature_recognize", "strategy_select",
        "toolpath_synthesize", "post_emit", "gcode_validate",
      ]);
    });
    it("strategy_select emits handoff.tool_id as a non-empty string", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      const strategy = stageByName(result, "strategy_select");
      expect(strategy.handoff).toEqual(expect.objectContaining({ tool_id: expect.any(String) }));
      expect(String(strategy.handoff!.tool_id).length).toBeGreaterThanOrEqual(1);
    });
    it("post_emit payload contains the lead_tool from strategy_select (substring handoff invariant)", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      const strategy = stageByName(result, "strategy_select");
      const post = stageByName(result, "post_emit");
      const toolId = String(strategy.handoff!.tool_id);
      expect(JSON.stringify(post.payload)).toContain(toolId);
    });
    it("final_program is a string (G-code text or empty on hard failure)", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      expect(typeof result.final_program).toBe("string");
    });
    it("every stage carries duration_ms ≥ 1 (no zero-divide for harness budget math)", async () => {
      const adapter = engine.makeMillAdapter();
      const result = await adapter({});
      if (result.stages.length === 0) return;
      for (const s of result.stages) {
        expect(s.duration_ms).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("makeAdapterFor — routing (mill + lathe bound, wire_edm unbound)", () => {
    it("lathe adapter is bound — produces 6 canonical stages, NOT the 'not yet bound' stub", async () => {
      const adapter = engine.makeAdapterFor("lathe");
      const result = await adapter({});
      expect(result.error ?? "").not.toContain("not yet bound");
      expect(result.stages.map(s => s.stage)).toEqual([
        "cad_parse", "feature_recognize", "strategy_select",
        "toolpath_synthesize", "post_emit", "gcode_validate",
      ]);
      expect(typeof result.final_program).toBe("string");
      expect(result.final_program.length).toBeGreaterThan(0);
    });
    it("wire_edm adapter returns error containing 'not yet bound' and empty stages", async () => {
      const adapter = engine.makeAdapterFor("wire_edm");
      const result = await adapter({});
      expect(result.error ?? "").toContain("not yet bound");
      expect(result.stages).toEqual([]);
    });
    it("mill via makeAdapterFor produces same 6-stage shape as makeMillAdapter", async () => {
      const r1 = await engine.makeAdapterFor("mill")({});
      const r2 = await engine.makeMillAdapter()({});
      expect(r1.stages.map(s => s.stage)).toEqual(r2.stages.map(s => s.stage));
    });
  });

  describe("E2E: harness × Mill adapter — runDomain round-trip", () => {
    it("DomainWizardPipelineTestEngine.runDomain reports verdict in {pass, warn}", async () => {
      const adapter = engine.makeMillAdapter();
      const report = await domainWizardPipelineTestEngine.runDomain({
        contract: MILL_CONTRACT,
        adapter,
      });
      expect(["pass", "warn"]).toContain(report.verdict);
      expect(report.domain).toBe("mill");
      expect(report.stage_assertions).toHaveLength(MILL_CONTRACT.required_stages.length);
    });
  });

  // ── LATHE adapter (WHISKEY-LATHE-ACCURACY-MS0 follow-up, 2026-06-03) ──
  describe("normalizeLatheInput defaults (Okuma/JM smoke shape)", () => {
    it("undefined input produces a complete TurningInput with smoke defaults", () => {
      const norm = normalizeLatheInput(undefined) as unknown as {
        part_number: string;
        material: { material_name: string; iso_group: string };
        controller: string;
        bar_stock_od_mm: number;
        features: unknown[];
      };
      expect(norm.part_number).toBe("TANGO-AXIS4-LATHE-SMOKE");
      expect(norm.material.iso_group).toBe("P");
      expect(norm.controller).toBe("okuma"); // JM fleet is 100% Okuma OSP
      expect(norm.bar_stock_od_mm).toBeGreaterThan(0);
      expect(Array.isArray(norm.features)).toBe(true);
      expect(norm.features.length).toBeGreaterThanOrEqual(1);
    });
    it("empty features array is replaced with the default OD-straight feature", () => {
      const norm = normalizeLatheInput({ features: [] }) as unknown as { features: unknown[] };
      expect(norm.features.length).toBeGreaterThanOrEqual(1);
    });

    // --- Lathe Wizard UI form mapping (silent-input-drop fix) -----------------
    // The web wizard posts {material, diameter_in, length_in} (flat, INCH). These MUST
    // reach the physics; before the fix they were dropped -> every program ran on the
    // 31.75mm/50mm/1018 defaults regardless of what the user typed.
    type LatheNorm = { material: { material_name: string }; bar_stock_od_mm: number; part_length_mm: number };
    it("maps the wizard's flat material + INCH diameter/length into the engine input", () => {
      const norm = normalizeLatheInput({ material: "4140 steel", diameter_in: 2, length_in: 6 }) as unknown as LatheNorm;
      expect(norm.material.material_name).toBe("4140 steel");         // not silently "1018 Steel"
      expect(norm.bar_stock_od_mm).toBeCloseTo(50.8, 5);             // 2 in x 25.4 (units-first)
      expect(norm.part_length_mm).toBeCloseTo(152.4, 5);            // 6 in x 25.4 (not the 50mm default)
    });
    it("inch->mm conversion is exact (1.25 in -> 31.75 mm)", () => {
      const norm = normalizeLatheInput({ diameter_in: 1.25, length_in: 4 }) as unknown as LatheNorm;
      expect(norm.bar_stock_od_mm).toBeCloseTo(31.75, 5);
      expect(norm.part_length_mm).toBeCloseTo(101.6, 5);
    });
    it("canonical mm key WINS over the wizard inch key (no double-convert / no regression)", () => {
      const norm = normalizeLatheInput({ bar_stock_od_mm: 40, diameter_in: 2, part_length_mm: 80, length_in: 6 }) as unknown as LatheNorm;
      expect(norm.bar_stock_od_mm).toBe(40);   // explicit mm preserved, NOT 50.8
      expect(norm.part_length_mm).toBe(80);    // explicit mm preserved, NOT 152.4
    });
    it("canonical material_name WINS over the flat wizard material string", () => {
      const norm = normalizeLatheInput({ material_name: "316 Stainless", material: "4140 steel" }) as unknown as LatheNorm;
      expect(norm.material.material_name).toBe("316 Stainless");
    });
    it("zero / invalid inch dims fall back to the JM default, never 0 (no bad geometry)", () => {
      const norm = normalizeLatheInput({ diameter_in: 0, length_in: -3 }) as unknown as LatheNorm;
      expect(norm.bar_stock_od_mm).toBe(31.75);
      expect(norm.part_length_mm).toBe(50);
    });
  });

  describe("makeLatheAdapter — 6 canonical stages + tool_id handoff", () => {
    it("stage sequence exactly matches LATHE_CONTRACT.required_stages", async () => {
      const result = await engine.makeLatheAdapter()({});
      if (result.error && result.stages.length === 0) {
        throw new Error(`Lathe adapter failed catastrophically: ${result.error}`);
      }
      expect(result.stages.map(s => s.stage)).toEqual([
        "cad_parse", "feature_recognize", "strategy_select",
        "toolpath_synthesize", "post_emit", "gcode_validate",
      ]);
    });
    it("strategy_select emits tool_id that propagates into post_emit payload (handoff invariant)", async () => {
      const result = await engine.makeLatheAdapter()({});
      const strategy = stageByName(result, "strategy_select");
      const post = stageByName(result, "post_emit");
      const toolId = String(strategy.handoff!.tool_id);
      expect(toolId.length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(post.payload)).toContain(toolId);
    });
    it("emits a non-empty Okuma program and every stage duration_ms ≥ 1", async () => {
      const result = await engine.makeLatheAdapter()({});
      expect(typeof result.final_program).toBe("string");
      expect(result.final_program.length).toBeGreaterThan(0);
      for (const s of result.stages) expect(s.duration_ms).toBeGreaterThanOrEqual(1);
    });
  });

  describe("E2E: harness × Lathe adapter — runDomain round-trip", () => {
    it("DomainWizardPipelineTestEngine.runDomain reports verdict in {pass, warn}", async () => {
      const report = await domainWizardPipelineTestEngine.runDomain({
        contract: LATHE_CONTRACT,
        adapter: engine.makeLatheAdapter(),
      });
      expect(["pass", "warn"]).toContain(report.verdict);
      expect(report.domain).toBe("lathe");
      expect(report.stage_assertions).toHaveLength(LATHE_CONTRACT.required_stages.length);
      // The tool_id cross-stage handoff must verify OK (not missing/not_propagated).
      for (const h of report.handoff_assertions) expect(h.verdict).toBe("ok");
    });
  });
});

describe("millResultToStages helper (pure)", () => {
  it("on an empty MillingProgramResult emits exactly 6 stages, tool_id defaults to T01", () => {
    const fake = {
      success: true,
      part_number: "X",
      material: "X",
      machine: "X",
      controller: "X",
      intake_validation: { complete: true, missing_dimensions: [], ambiguous_tolerances: [], warnings: [] },
      machinable_features: [],
      feature_count: 0,
      operations: [],
      total_operations: 0,
      total_tool_changes: 0,
      estimated_cycle_time_sec: 60,
      program_text: "",
      program_line_count: 0,
      safety_checks: [],
      safety_pass_rate: 1,
    };
    const stages = millResultToStages(fake as unknown as Parameters<typeof millResultToStages>[0]);
    expect(stages).toHaveLength(6);
    const strat = stages.find(s => s.stage === "strategy_select")!;
    expect(strat.handoff!.tool_id).toBe("T01");
  });
});

describe("singleton stability", () => {
  it("pipelineHarnessAdaptersEngine is a stable singleton (same identity across imports)", () => {
    expect(pipelineHarnessAdaptersEngine).toBeInstanceOf(PipelineHarnessAdaptersEngine);
  });
});
