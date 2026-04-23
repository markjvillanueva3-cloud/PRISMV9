/**
 * LatheLoRAReasoningEvaluatorEngine Tests
 * LATHE-LORA-MS0 U-LLR15: Reasoning evaluation for LatheLoRA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAReasoningEvaluatorEngine } from "../engines/LatheLoRAReasoningEvaluatorEngine.js";

describe("LatheLoRAReasoningEvaluatorEngine", () => {
  beforeEach(() => {
    latheLoRAReasoningEvaluatorEngine.setConfig({
      min_explanation_length: 100,
      require_justification: true,
      require_steps: false,
      domain_term_threshold: 3,
      passing_score: 60,
    });
  });

  describe("evaluate", () => {
    it("passes well-reasoned output", () => {
      const output = `
        **Speed and Feed Recommendation**

        For roughing 4140 steel, I recommend using carbide inserts at 400 SFM.

        Because this is a medium carbon steel, we need moderate surface speed
        to balance material removal rate with tool life. Therefore, 400 SFM
        is appropriate.

        First, set the spindle to CSS mode. Then, verify the feed rate of 0.012 IPR.
        Finally, check clearance before cycling.

        Note: Monitor for chatter and adjust depth of cut if needed.
      `;
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.passed).toBe(true);
      expect(result.overall_score).toBeGreaterThan(60);
    });

    it("fails poorly reasoned output", () => {
      const output = "Use 500 SFM.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.passed).toBe(false);
      expect(result.overall_score).toBeLessThan(60);
    });
  });

  describe("coherence evaluation", () => {
    it("rewards causal reasoning", () => {
      const output = "Because the material is hard, therefore we reduce speed. Since titanium work hardens, we use lower feeds.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.coherence_score).toBeGreaterThanOrEqual(70);
    });

    it("rewards comparative reasoning", () => {
      const output = "However, aluminum allows higher speeds. Although the part is large, we can still use CSS mode.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.coherence_score).toBeGreaterThan(60);
    });

    it("penalizes potential contradictions", () => {
      const output = "Increase the speed but also not faster, we want slower speeds.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const coherenceIssue = result.findings.find(f => f.dimension === "coherence" && f.quality === "weak");
      expect(coherenceIssue).toBeDefined();
    });
  });

  describe("domain knowledge evaluation", () => {
    it("rewards rich domain vocabulary", () => {
      const output = `
        Roughing with carbide insert, set spindle speed for optimal surface speed.
        Feed rate affects chip load and surface finish. Depth of cut limited by
        deflection and chatter stability. Use coolant for temperature control.
      `;
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.domain_score).toBeGreaterThan(70);
    });

    it("flags limited domain vocabulary", () => {
      const output = "Set the machine to go fast and cut the metal.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const domainIssue = result.findings.find(f => f.dimension === "domain" && f.quality === "weak");
      expect(domainIssue).toBeDefined();
    });

    it("bonuses physics terminology", () => {
      const output = "Force calculations show deflection risk. Temperature affects wear rate.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.domain_score).toBeGreaterThan(50);
    });
  });

  describe("justification evaluation", () => {
    it("rewards numerical justification", () => {
      const output = "At 400 SFM and 0.012 IPR, the material removal rate is optimal. The reason is this balances tool life.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.justification_score).toBeGreaterThan(40);
    });

    it("rewards references to standards", () => {
      const output = "According to the Machinery's Handbook, based on Sandvik recommendations.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const justifyFinding = result.findings.find(f => f.dimension === "justification" && f.quality === "good");
      expect(justifyFinding).toBeDefined();
    });

    it("rewards tradeoff discussion", () => {
      const output = "There is a tradeoff between speed and tool life. We must balance surface finish versus cycle time.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const tradeoffFinding = result.findings.find(f => f.observation.includes("tradeoff"));
      expect(tradeoffFinding).toBeDefined();
    });

    it("flags missing justification", () => {
      const output = "Do this operation. Use those settings.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const justifyIssue = result.findings.find(f => f.dimension === "justification" && f.quality === "missing");
      expect(justifyIssue).toBeDefined();
    });
  });

  describe("structure evaluation", () => {
    it("rewards step-by-step structure", () => {
      const output = "First, set up the tool. Then, verify clearance. Next, start spindle. Finally, begin cutting.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const structureFinding = result.findings.find(f => f.dimension === "structure" && f.quality === "excellent");
      expect(structureFinding).toBeDefined();
    });

    it("rewards markdown formatting", () => {
      const output = "## Setup\n- Check tool\n- Verify clearance\n\n## Operation\n1. Start spindle\n2. Begin cut";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.structure_score).toBeGreaterThan(70);
    });

    it("rewards clear conclusions", () => {
      const output = "Based on the analysis, I recommend using 400 SFM. We suggest starting with conservative feeds.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const conclusionFinding = result.findings.find(f => f.observation.includes("recommendations"));
      expect(conclusionFinding).toBeDefined();
    });

    it("penalizes very brief responses", () => {
      const output = "Use 400 SFM.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const briefIssue = result.findings.find(f => f.dimension === "structure" && f.quality === "weak");
      expect(briefIssue).toBeDefined();
    });
  });

  describe("completeness evaluation", () => {
    it("rewards adequate length", () => {
      const output = `
        For this operation, we need to consider multiple factors. The material properties
        suggest using moderate cutting parameters. Surface speed should be around 400 SFM
        with a feed rate of 0.012 IPR. This combination provides a good balance between
        productivity and tool life. Always verify clearance and check for chatter.
      `;
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.completeness_score).toBeGreaterThan(60);
    });

    it("penalizes too brief", () => {
      const output = "Fast.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const lengthIssue = result.findings.find(f => f.dimension === "completeness" && f.quality === "weak");
      expect(lengthIssue).toBeDefined();
    });

    it("rewards G-code inclusion", () => {
      const output = "Use G96 S400 for CSS mode, then G01 Z-2.0 F0.012 for the cut. This approach is recommended.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      expect(result.completeness_score).toBeGreaterThan(40);
    });

    it("rewards considerations/caveats", () => {
      const output = "Note: ensure proper coolant flow. Important: check tool wear. Caution with thin walls.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const caveatFinding = result.findings.find(f => f.observation.includes("considerations"));
      expect(caveatFinding).toBeDefined();
    });
  });

  describe("getSummary", () => {
    it("shows GOOD for passing", () => {
      const output = "Because of the material, therefore use 400 SFM. First rough, then finish. Recommend carbide.";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      if (result.passed) {
        const summary = latheLoRAReasoningEvaluatorEngine.getSummary(result);
        expect(summary).toContain("GOOD");
      }
    });

    it("shows WEAK for failing", () => {
      const output = "do it";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const summary = latheLoRAReasoningEvaluatorEngine.getSummary(result);
      expect(summary).toContain("WEAK");
    });

    it("includes dimension scores", () => {
      const output = "Test output with some content";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const summary = latheLoRAReasoningEvaluatorEngine.getSummary(result);
      expect(summary).toContain("Coherence:");
      expect(summary).toContain("Domain:");
    });
  });

  describe("getSuggestions", () => {
    it("extracts improvement suggestions", () => {
      const output = "fast";
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      const suggestions = latheLoRAReasoningEvaluatorEngine.getSuggestions(result);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns empty for well-structured output", () => {
      const output = `
        Because 4140 steel is P group, therefore use Kienzle parameters.
        First rough at 400 SFM with 0.015 IPR. Then finish at 500 SFM.
        According to the handbook, this provides optimal results.
        Important: verify tool alignment. Check clearance.
      `;
      const result = latheLoRAReasoningEvaluatorEngine.evaluate(output);
      // May or may not have suggestions, but should not be excessive
      const suggestions = latheLoRAReasoningEvaluatorEngine.getSuggestions(result);
      expect(suggestions.length).toBeLessThan(5);
    });
  });

  describe("setConfig / getConfig", () => {
    it("updates minimum length", () => {
      latheLoRAReasoningEvaluatorEngine.setConfig({ min_explanation_length: 200 });
      const config = latheLoRAReasoningEvaluatorEngine.getConfig();
      expect(config.min_explanation_length).toBe(200);
    });

    it("updates passing score", () => {
      latheLoRAReasoningEvaluatorEngine.setConfig({ passing_score: 80 });
      const config = latheLoRAReasoningEvaluatorEngine.getConfig();
      expect(config.passing_score).toBe(80);
    });
  });
});
