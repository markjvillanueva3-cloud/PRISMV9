/**
 * LathePrintToProgramReasoningEngine Tests — U-LTH43
 *
 * Reasoning trace generation: >=10 decision steps, causal/counterfactual/
 * deductive/abductive modes, markdown+JSON export, variability.
 *
 * @milestone LATHE-MASTER U-LTH43
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToProgramReasoningEngine,
  type ReasoningInput,
} from "../engines/LathePrintToProgramReasoningEngine.js";
import {
  lathePrintFeatureStrategySelectorEngine,
  type FeatureInput,
  type MaterialInput,
} from "../engines/LathePrintFeatureStrategySelectorEngine.js";
import {
  lathePrintSequencePlannerEngine,
  type StockInput,
} from "../engines/LathePrintSequencePlannerEngine.js";
import { lathePrintSetupSelectionEngine } from "../engines/LathePrintSetupSelectionEngine.js";
import { lathePrintToolpathGeneratorEngine } from "../engines/LathePrintToolpathGeneratorEngine.js";
import { lathePrintProgramEmitterEngine } from "../engines/LathePrintProgramEmitterEngine.js";
import { lathePrintToProgramDLIntelligenceEngine } from "../engines/LathePrintToProgramDLIntelligenceEngine.js";
import { ACTIONS as camActions } from "../tools/dispatchers/camDispatcher.js";

const STEEL: MaterialInput = { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 };
const ALUM: MaterialInput = { name: "6061", iso_group: "N", tensile_strength_mpa: 310 };
const INCO: MaterialInput = { name: "Inconel 718", iso_group: "S", hardness_hrc: 36, tensile_strength_mpa: 1350 };
const HARD: MaterialInput = { name: "D2 Tool Steel", iso_group: "H", hardness_hrc: 58, tensile_strength_mpa: 2000 };

const JM_PART: FeatureInput[] = [
  { id: "F1", type: "face", diameter_mm: 25, depth_mm: 2, tolerance_total_mm: 0.05 },
  { id: "F2", type: "od_turn", diameter_mm: 25, length_mm: 50, tolerance_total_mm: 0.025, is_critical: true, cpk_target: 1.67 },
  { id: "F3", type: "chamfer_od", diameter_mm: 25, depth_mm: 1.5 },
];

const LONG_PART: FeatureInput[] = [
  { id: "L1", type: "od_turn", diameter_mm: 15, length_mm: 280 },
];

const STOCK: StockInput = { od_mm: 30, length_mm: 60, id_mm: 0 };
const STOCK_LONG: StockInput = { od_mm: 20, length_mm: 300, id_mm: 0 };

function buildInput(
  features: FeatureInput[],
  material: MaterialInput,
  stock: StockInput,
  includeDL: boolean = true
): ReasoningInput {
  const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(features, material);
  const seq = lathePrintSequencePlannerEngine.planSequence(strat, stock, features);
  const geo = lathePrintSetupSelectionEngine.inferGeometry(features);
  const loads = lathePrintSetupSelectionEngine.estimateLoads(seq, material);
  const setup = lathePrintSetupSelectionEngine.selectSetup(geo, material, loads);
  const tp = lathePrintToolpathGeneratorEngine.generateProgram(seq, features, material);
  const emitted = lathePrintProgramEmitterEngine.emit(tp, { controller: "fanuc" });

  const input: ReasoningInput = {
    strategy_plan: strat, sequence_plan: seq, setup, toolpath: tp, emitted,
    features, material,
  };

  if (includeDL) {
    input.dl_prediction = lathePrintToProgramDLIntelligenceEngine.predict({
      strategy_plan: strat, sequence_plan: seq, setup, toolpath: tp, emitted,
      features, material,
    });
  }

  return input;
}

describe("LathePrintToProgramReasoningEngine", () => {
  describe("Happy Path — Decision Steps", () => {
    it("generates >=10 decision steps (exit gate)", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      expect(trace.step_count).toBeGreaterThanOrEqual(10);
      expect(trace.steps.length).toBe(trace.step_count);
    });

    it("steps cover ingest, strategy, sequence, setup, toolpath, signoff stages", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      const stages = new Set(trace.steps.map(s => s.stage));
      expect(stages.has("ingest")).toBe(true);
      expect(stages.has("strategy")).toBe(true);
      expect(stages.has("sequence")).toBe(true);
      expect(stages.has("setup")).toBe(true);
      expect(stages.has("toolpath")).toBe(true);
      expect(stages.has("signoff")).toBe(true);
    });

    it("uses multiple reasoning modes", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      expect(trace.reasoning_modes_used.length).toBeGreaterThanOrEqual(2);
      expect(trace.reasoning_modes_used).toContain("deductive");
    });

    it("every step has confidence in [0,1]", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      trace.steps.forEach(s => {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("every step has because[] with reasoning", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      trace.steps.forEach(s => {
        expect(s.because.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Counterfactuals", () => {
    it("generates counterfactual for hardened material", () => {
      const input = buildInput(JM_PART, HARD, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      const matCf = trace.counterfactuals.find(c => c.variable_changed === "material");
      expect(matCf).toBeTruthy();
      expect(matCf!.impact_severity).toMatch(/significant|critical/);
    });

    it("generates counterfactual for aluminum → superalloy", () => {
      const input = buildInput(JM_PART, ALUM, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      const cf = trace.counterfactuals.find(c => c.variable_changed === "material");
      expect(cf).toBeTruthy();
      expect(cf!.hypothetical_value).toMatch(/Inconel|S group/);
    });

    it("generates L/D counterfactual for long parts", () => {
      const input = buildInput(LONG_PART, STEEL, STOCK_LONG);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      const cf = trace.counterfactuals.find(c => c.variable_changed === "part length");
      expect(cf).toBeTruthy();
    });
  });

  describe("Causal Chain", () => {
    it("produces non-empty causal chain", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      expect(trace.causal_chain.length).toBeGreaterThan(0);
      trace.causal_chain.forEach(c => {
        expect(c).toContain("←");  // causal arrow
      });
    });
  });

  describe("Release Decision", () => {
    it("clean part gets release clearance", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);

      const signoff = trace.steps.find(s => s.stage === "signoff");
      expect(signoff).toBeTruthy();
      expect(signoff!.decision).toMatch(/cleared for release/);
    });

    it("envelope violation blocks release", () => {
      const huge: FeatureInput[] = [
        { id: "H1", type: "od_turn", diameter_mm: 100, length_mm: 400 },
      ];
      const strat = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(huge, STEEL);
      const seq = lathePrintSequencePlannerEngine.planSequence(strat, { od_mm: 120, length_mm: 500, id_mm: 0 }, huge);
      const tp = lathePrintToolpathGeneratorEngine.generateProgram(seq, huge, STEEL, {
        max_x_mm: 5, max_z_mm: 5, max_rpm: 5000, max_feed_mm_min: 10000,
      });
      const input: ReasoningInput = {
        strategy_plan: strat, sequence_plan: seq, toolpath: tp,
        features: huge, material: STEEL,
      };

      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const signoff = trace.steps.find(s => s.stage === "signoff");
      expect(signoff!.decision).toMatch(/rework/);
    });
  });

  describe("Export Formats", () => {
    it("markdown contains all major sections", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const md = lathePrintToProgramReasoningEngine.exportMarkdown(trace);

      expect(md).toContain("# Reasoning Trace");
      expect(md).toContain("## Decision Steps");
      expect(md).toContain("## Causal Chain");
    });

    it("JSON is parseable and round-trips", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const json = lathePrintToProgramReasoningEngine.exportJSON(trace);
      const parsed = JSON.parse(json);

      expect(parsed.trace_id).toBe(trace.trace_id);
      expect(parsed.step_count).toBe(trace.step_count);
    });
  });

  describe("Filtering & Summarizing", () => {
    it("filterSteps by stage returns only matching steps", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const strategySteps = lathePrintToProgramReasoningEngine.filterSteps(trace, { stage: "strategy" });

      expect(strategySteps.length).toBeGreaterThan(0);
      strategySteps.forEach(s => expect(s.stage).toBe("strategy"));
    });

    it("filterSteps by mode returns only matching", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const deductive = lathePrintToProgramReasoningEngine.filterSteps(trace, { mode: "deductive" });

      deductive.forEach(s => expect(s.mode).toBe("deductive"));
    });

    it("summarizeModes returns counts per mode", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      const summary = lathePrintToProgramReasoningEngine.summarizeModes(trace);

      const total = Object.values(summary).reduce((a, b) => a + b, 0);
      expect(total).toBe(trace.step_count);
    });
  });

  describe("Adversarial Inputs", () => {
    it("throws on null input", () => {
      expect(() => {
        lathePrintToProgramReasoningEngine.explain(null as any);
      }).toThrow(/Invalid reasoning input/);
    });

    it("throws on missing strategy plan", () => {
      expect(() => {
        lathePrintToProgramReasoningEngine.explain({} as any);
      }).toThrow(/Missing strategy plan/);
    });

    it("throws on missing sequence plan", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      delete (input as any).sequence_plan;
      expect(() => {
        lathePrintToProgramReasoningEngine.explain(input);
      }).toThrow(/Missing sequence plan/);
    });

    it("throws when features not array", () => {
      const input = buildInput(JM_PART, STEEL, STOCK);
      (input as any).features = null;
      expect(() => {
        lathePrintToProgramReasoningEngine.explain(input);
      }).toThrow(/array/);
    });

    it("works without DL prediction (optional)", () => {
      const input = buildInput(JM_PART, STEEL, STOCK, false);
      expect(input.dl_prediction).toBeUndefined();

      const trace = lathePrintToProgramReasoningEngine.explain(input);
      expect(trace.step_count).toBeGreaterThanOrEqual(10);
      const dlSteps = trace.steps.filter(s => s.stage === "dl_review");
      expect(dlSteps.length).toBe(0);
    });

    it("works without setup (optional)", () => {
      const input = buildInput(JM_PART, STEEL, STOCK, false);
      delete input.setup;
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      expect(trace.step_count).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Material Variability", () => {
    const materials: MaterialInput[] = [
      { name: "1018 Steel", iso_group: "P", tensile_strength_mpa: 440 },
      { name: "316 Stainless", iso_group: "M", tensile_strength_mpa: 580 },
      { name: "Gray Cast Iron", iso_group: "K", tensile_strength_mpa: 250 },
      { name: "Inconel 718", iso_group: "S", tensile_strength_mpa: 1350 },
    ];

    it.each(materials)("generates >=10 steps for $name (ISO $iso_group)", (mat) => {
      const input = buildInput(JM_PART, mat, STOCK);
      const trace = lathePrintToProgramReasoningEngine.explain(input);
      expect(trace.step_count).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains lathe_p2p_reason_explain", () => {
      expect(camActions).toContain("lathe_p2p_reason_explain");
    });
    it("ACTIONS contains lathe_p2p_reason_markdown", () => {
      expect(camActions).toContain("lathe_p2p_reason_markdown");
    });
    it("ACTIONS contains lathe_p2p_reason_json", () => {
      expect(camActions).toContain("lathe_p2p_reason_json");
    });
    it("ACTIONS contains lathe_p2p_reason_filter", () => {
      expect(camActions).toContain("lathe_p2p_reason_filter");
    });
    it("ACTIONS contains lathe_p2p_reason_mode_summary", () => {
      expect(camActions).toContain("lathe_p2p_reason_mode_summary");
    });
  });
});
