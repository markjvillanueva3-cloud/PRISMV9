import { describe, it, expect } from "vitest";
import {
  DomainWizardPipelineTestEngine,
  domainWizardPipelineTestEngine,
  MILL_CONTRACT,
  LATHE_CONTRACT,
  WIRE_EDM_CONTRACT,
  type DomainContract,
  type PipelineAdapter,
  type StageOutput,
  type CanonicalStageName,
} from "../engines/DomainWizardPipelineTestEngine.js";

function happyStages(toolId = "T01", wireDiameter?: number): StageOutput[] {
  return [
    { stage: "cad_parse",           payload: { features: 3 },                       duration_ms: 50 },
    { stage: "feature_recognize",   payload: { pocket: 1, hole: 2 },                duration_ms: 80 },
    { stage: "strategy_select",     payload: { strategy: "trochoidal", tool: toolId, ...(wireDiameter !== undefined ? { wire_diameter_mm: wireDiameter } : {}) },
      handoff: { tool_id: toolId, ...(wireDiameter !== undefined ? { wire_diameter_mm: wireDiameter } : {}) },
      duration_ms: 120 },
    { stage: "toolpath_synthesize", payload: { segments: 42 },                      duration_ms: 200 },
    { stage: "post_emit",           payload: { lines: ["G90", `${toolId} M6`, ...(wireDiameter !== undefined ? [`(wire ${wireDiameter})`] : [])] }, duration_ms: 60 },
    { stage: "gcode_validate",      payload: { valid: true },                       duration_ms: 30 },
  ];
}

function happyMillAdapter(): PipelineAdapter {
  return async () => ({
    stages: happyStages("T01"),
    final_program: "G90 G54\nT01 M6\nM3 S5000\nG1 X10 Y10 F250\nM30",
  });
}

function happyWireEDMAdapter(): PipelineAdapter {
  return async () => ({
    stages: happyStages("WIRE01", 0.25),
    final_program: "G90\nN10 G92 X0 Y0\nN20 G1 X10 Y0\nN30 G1 X10 Y10\nN40 M30",
  });
}

describe("DomainWizardPipelineTestEngine", () => {
  const eng = domainWizardPipelineTestEngine;

  describe("runDomain — happy path", () => {
    it("PASS for a complete, well-shaped mill pipeline", async () => {
      const report = await eng.runDomain({
        contract: MILL_CONTRACT,
        adapter: happyMillAdapter(),
      });
      expect(report.verdict).toBe("pass");
      expect(report.domain).toBe("mill");
      expect(report.stage_assertions).toHaveLength(MILL_CONTRACT.required_stages.length);
      expect(report.stage_assertions.every((a) => a.verdict === "ok")).toBe(true);
      expect(report.handoff_assertions).toHaveLength(1);
      expect(report.handoff_assertions[0].verdict).toBe("ok");
      expect(report.handoff_assertions[0].handoff_value).toBe("T01");
      expect(report.final_program_lines).toBe(5);
      // pipeline_error must be undefined on a clean pass — verify the cell does not exist
      expect("pipeline_error" in report ? report.pipeline_error : undefined).toBe(undefined);
    });

    it("PASS for a complete wire-EDM pipeline with wire_diameter handoff", async () => {
      const report = await eng.runDomain({
        contract: WIRE_EDM_CONTRACT,
        adapter: happyWireEDMAdapter(),
      });
      expect(report.verdict).toBe("pass");
      expect(report.handoff_assertions[0].handoff_key).toBe("wire_diameter_mm");
      expect(report.handoff_assertions[0].verdict).toBe("ok");
      expect(report.handoff_assertions[0].handoff_value).toBe(0.25);
    });
  });

  describe("runDomain — S1/S2 stage assertions", () => {
    it("FAIL with verdict=missing when a required stage is absent", async () => {
      const adapter: PipelineAdapter = async () => ({
        stages: happyStages().slice(0, 3),
        final_program: "",
      });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      const missing = report.stage_assertions.filter((a) => a.verdict === "missing");
      expect(missing.length).toBeGreaterThan(0);
      expect(missing[0].stage).toBe("toolpath_synthesize");
    });

    it("FAIL with verdict=out_of_order when stages swap positions", async () => {
      const swapped = happyStages();
      [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
      const adapter: PipelineAdapter = async () => ({
        stages: swapped, final_program: "G90\nM30",
      });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      const ooo = report.stage_assertions.filter((a) => a.verdict === "out_of_order");
      expect(ooo).toHaveLength(2);
    });

    it("FAIL with verdict=empty_payload when a stage emits null", async () => {
      const stages = happyStages();
      stages[2] = { ...stages[2], payload: null };
      const adapter: PipelineAdapter = async () => ({ stages, final_program: "G90\nM30" });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      const empty = report.stage_assertions.filter((a) => a.verdict === "empty_payload");
      expect(empty).toHaveLength(1);
      expect(empty[0].stage).toBe("strategy_select");
    });

    it("FAIL with verdict=empty_payload when a stage emits {}", async () => {
      const stages = happyStages();
      stages[2] = { ...stages[2], payload: {} };
      const adapter: PipelineAdapter = async () => ({ stages, final_program: "G90\nM30" });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.stage_assertions.filter((a) => a.verdict === "empty_payload")).toHaveLength(1);
    });
  });

  describe("runDomain — S3 handoff invariants", () => {
    it("FAIL with verdict=missing_handoff when strategy stage forgets tool_id", async () => {
      const stages = happyStages();
      stages[2] = { ...stages[2], handoff: {} };
      const adapter: PipelineAdapter = async () => ({ stages, final_program: "G90\nM30" });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.handoff_assertions[0].verdict).toBe("missing_handoff");
    });

    it("FAIL with verdict=not_propagated when tool_id is dropped before post_emit", async () => {
      const stages = happyStages("T17");
      stages[4] = { stage: "post_emit", payload: { lines: ["G90", "TXX M6"] }, duration_ms: 60 };
      const adapter: PipelineAdapter = async () => ({ stages, final_program: "G90\nTXX M6\nM30" });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.handoff_assertions[0].verdict).toBe("not_propagated");
      expect(report.handoff_assertions[0].handoff_value).toBe("T17");
    });
  });

  describe("runDomain — S4 latency budget", () => {
    it("WARN with verdict=over_budget when a single stage blows its budget", async () => {
      const tightContract: DomainContract = {
        ...MILL_CONTRACT,
        stage_budget_ms: { toolpath_synthesize: 50 },
      };
      const adapter: PipelineAdapter = async () => ({
        stages: happyStages(),
        final_program: "G90\nT01 M6\nM3\nM30",
      });
      const report = await eng.runDomain({ contract: tightContract, adapter });
      expect(report.verdict).toBe("warn");
      const overBudget = report.stage_assertions.filter((a) => a.verdict === "over_budget");
      expect(overBudget).toHaveLength(1);
      expect(overBudget[0].stage).toBe("toolpath_synthesize");
    });
  });

  describe("runDomain — S5 final-program non-emptiness", () => {
    it("FAIL when final_program is empty even with all stages passing", async () => {
      const adapter: PipelineAdapter = async () => ({
        stages: happyStages(),
        final_program: "",
      });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.final_program_lines).toBe(0);
      expect(report.notes.some((n) => n.includes("empty"))).toBe(true);
    });

    it("FAIL when final_program contains only whitespace lines", async () => {
      const adapter: PipelineAdapter = async () => ({
        stages: happyStages(),
        final_program: "\n   \n\t\n   ",
      });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.final_program_lines).toBe(0);
    });
  });

  describe("runDomain — adapter exceptions", () => {
    it("FAIL with pipeline_error when adapter throws", async () => {
      const adapter: PipelineAdapter = async () => { throw new Error("CAD parse exploded"); };
      const report = await eng.runDomain({ contract: LATHE_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.pipeline_error).toBe("CAD parse exploded");
      expect(report.stage_assertions).toHaveLength(0);
    });

    it("FAIL when pipeline returns an error field even if stages look OK", async () => {
      const adapter: PipelineAdapter = async () => ({
        stages: happyStages(),
        final_program: "G90\nM30",
        error: "post-validation flagged unsafe RPM",
      });
      const report = await eng.runDomain({ contract: MILL_CONTRACT, adapter });
      expect(report.verdict).toBe("fail");
      expect(report.pipeline_error).toBe("post-validation flagged unsafe RPM");
    });
  });

  describe("runAllDomains — multi-domain aggregation", () => {
    it("3-domain run with all passing reports pass=3, pass_rate=1", async () => {
      const report = await eng.runAllDomains([
        { contract: MILL_CONTRACT, adapter: happyMillAdapter() },
        { contract: LATHE_CONTRACT, adapter: async () => ({
          stages: happyStages("T08"),
          final_program: "G90\nT08 M6\nM30",
        }) },
        { contract: WIRE_EDM_CONTRACT, adapter: happyWireEDMAdapter() },
      ]);
      expect(report.total).toBe(3);
      expect(report.pass).toBe(3);
      expect(report.fail).toBe(0);
      expect(report.pass_rate.value).toBe(1);
      expect(report.reports.map((r) => r.domain)).toEqual(["mill", "lathe", "wire_edm"]);
    });

    it("3-domain run with 1 fail reports pass_rate ≈ 0.667 with Wilson uncertainty", async () => {
      const report = await eng.runAllDomains([
        { contract: MILL_CONTRACT, adapter: happyMillAdapter() },
        { contract: LATHE_CONTRACT, adapter: async () => { throw new Error("lathe boom"); } },
        { contract: WIRE_EDM_CONTRACT, adapter: happyWireEDMAdapter() },
      ]);
      expect(report.pass).toBe(2);
      expect(report.fail).toBe(1);
      expect(report.pass_rate.value).toBeCloseTo(0.6667, 3);
      expect(report.pass_rate.uncertainty).toBeGreaterThan(0.45);
      expect(report.pass_rate.uncertainty).toBeLessThan(0.6);
    });

    it("confidence scales via sqrt(n / FULL=12)", async () => {
      const single = await eng.runAllDomains([
        { contract: MILL_CONTRACT, adapter: happyMillAdapter() },
      ]);
      const triple = await eng.runAllDomains([
        { contract: MILL_CONTRACT, adapter: happyMillAdapter() },
        { contract: LATHE_CONTRACT, adapter: async () => ({
          stages: happyStages("T08"), final_program: "G90\nT08\nM30",
        }) },
        { contract: WIRE_EDM_CONTRACT, adapter: happyWireEDMAdapter() },
      ]);
      expect(single.pass_rate.confidence!).toBeLessThan(triple.pass_rate.confidence!);
      expect(triple.pass_rate.confidence).toBeCloseTo(0.5, 2);
    });
  });

  describe("class API", () => {
    it("fresh instance equivalence to singleton", async () => {
      const fresh = new DomainWizardPipelineTestEngine();
      const a = await eng.runDomain({ contract: MILL_CONTRACT, adapter: happyMillAdapter() });
      const b = await fresh.runDomain({ contract: MILL_CONTRACT, adapter: happyMillAdapter() });
      expect(a.verdict).toBe(b.verdict);
      expect(a.stage_assertions.length).toBe(b.stage_assertions.length);
    });
  });

  describe("default domain contracts", () => {
    it("MILL/LATHE/WIRE_EDM contracts declare the canonical 6-stage pipeline", () => {
      const expected: CanonicalStageName[] = [
        "cad_parse", "feature_recognize", "strategy_select",
        "toolpath_synthesize", "post_emit", "gcode_validate",
      ];
      expect(MILL_CONTRACT.required_stages).toEqual(expected);
      expect(LATHE_CONTRACT.required_stages).toEqual(expected);
      expect(WIRE_EDM_CONTRACT.required_stages).toEqual(expected);
      expect(WIRE_EDM_CONTRACT.total_budget_ms).toBeGreaterThan(MILL_CONTRACT.total_budget_ms);
    });
  });
});
