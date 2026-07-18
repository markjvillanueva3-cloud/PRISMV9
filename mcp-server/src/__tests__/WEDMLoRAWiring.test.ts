/**
 * Wiring test for U-WCTP-WIRING (slot:mike iter17) — 6 WEDM-LoRA pipeline
 * engines wired into the `prism_edm` dispatcher:
 *   • wedm_lora_train_script  → WEDMLoRATrainingScriptEngine
 *   • wedm_lora_reward        → WEDMLoRARewardShapingEngine
 *   • wedm_lora_safety        → WEDMLoRASafetyEvaluatorEngine
 *   • wedm_lora_reason        → WEDMLoRAReasoningEvaluatorEngine
 *   • wedm_lora_curriculum    → WEDMCurriculumSchedulerEngine
 *   • wedm_academy_bridge     → WEDMAcademyBridgeEngine
 *
 * Mirrors WEDMOutcomeEstimatorWiring.test.ts. Two-half verification:
 *   1. Source-grep — each action has exactly 1 `case "<action>":` body AND
 *      appears as a quoted enum entry outside the case label.
 *   2. Engine round-trip — invoke the same engine method the dispatcher calls
 *      and assert non-trivial behavior.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { wedmLoRATrainingScriptEngine } from "../engines/WEDMLoRATrainingScriptEngine.js";
import { wedmLoRARewardShapingEngine } from "../engines/WEDMLoRARewardShapingEngine.js";
import { wedmLoRASafetyEvaluatorEngine } from "../engines/WEDMLoRASafetyEvaluatorEngine.js";
import { wedmLoRAReasoningEvaluatorEngine } from "../engines/WEDMLoRAReasoningEvaluatorEngine.js";
import { wedmCurriculumSchedulerEngine } from "../engines/WEDMCurriculumSchedulerEngine.js";
import { wedmAcademyBridgeEngine } from "../engines/WEDMAcademyBridgeEngine.js";

const NEW_ACTIONS = [
  "wedm_lora_train_script",
  "wedm_lora_reward",
  "wedm_lora_safety",
  "wedm_lora_reason",
  "wedm_lora_curriculum",
  "wedm_academy_bridge",
] as const;

describe("U-WCTP-WIRING — dispatcher wiring registration", () => {
  it("registers all 6 actions in edmDispatcher — exactly 1 case body + 1 distinct enum entry each", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "edmDispatcher.ts"),
      "utf8",
    );
    for (const a of NEW_ACTIONS) {
      const caseBodies = src.split(`case "${a}":`).length - 1;
      expect(caseBodies).toBe(1);
      const totalQuoted = src.split(`"${a}"`).length - 1;
      // totalQuoted - caseBodies = (enum entries + cite mentions) >= 1
      expect(totalQuoted - caseBodies).toBeGreaterThanOrEqual(1);
    }
  });

  it("each new action has a corresponding lazy-import in getEngine()", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "edmDispatcher.ts"),
      "utf8",
    );
    const expectedAliases = [
      "wedmLoraTrain", "wedmLoraReward", "wedmLoraSafety",
      "wedmLoraReason", "wedmCurriculum", "wedmAcademyBridge",
    ];
    for (const alias of expectedAliases) {
      const caseHits = src.split(`case "${alias}":`).length - 1;
      expect(caseHits).toBe(1);
    }
  });
});

describe("U-WCTP-WIRING — engine round-trip behavior", () => {
  it("wedm_lora_train_script: generateScript emits train_wedm_lora.py + Qwen-Coder base", () => {
    const out = wedmLoRATrainingScriptEngine.generateScript();
    expect(out.filename).toBe("train_wedm_lora.py");
    expect(out.script).toContain("Qwen2.5-Coder-7B-bnb-4bit");
    expect(out.script).toContain("wedm_lora_train.jsonl");
  });

  it("wedm_lora_reward: calculateReward returns 5 components with bounded total in [-1, 1]", () => {
    const r = wedmLoRARewardShapingEngine.calculateReward(
      "Step 1 wire diameter 0.25 mm brass wire because D2 standard. Therefore 4-pass cycle. AWT armed dielectric."
    );
    expect(r.components).toHaveLength(5);
    expect(r.total_reward).toBeGreaterThanOrEqual(-1);
    expect(r.total_reward).toBeLessThanOrEqual(1);
  });

  it("wedm_lora_safety: evaluate returns 4-axis S(x) score in [0, 1]", () => {
    const r = wedmLoRASafetyEvaluatorEngine.evaluate(
      "M91 M20 M78 M78 M80 M82 M84 M90 wire diameter 0.25 mm wire tension 12 N AWT armed dielectric verify"
    );
    expect(r.s_x_score).toBeGreaterThanOrEqual(0);
    expect(r.s_x_score).toBeLessThanOrEqual(1);
    expect(r.wire_safety).toBeGreaterThanOrEqual(0);
  });

  it("wedm_lora_reason: evaluate returns 5-axis reasoning score >= 0 on rich input", () => {
    const r = wedmLoRAReasoningEvaluatorEngine.evaluate(
      "Step 1: select wire diameter 0.25 mm brass because D2 standard. Therefore 4-pass cycle. " +
      "Verify AWT armed. The rationale is Klocke 2013 cascade. Material D2 tool steel tolerance 0.005 mm. " +
      "This output is intentionally long enough to clear the structure-length threshold of two hundred characters."
    );
    expect(r.overall_score).toBeGreaterThanOrEqual(50);
    expect(r.completeness).toBeGreaterThanOrEqual(50);
  });

  it("wedm_lora_curriculum: emitCurriculum sorts easy→hard with stable order", () => {
    const corpus = [
      { instruction: "5-pass UV carbide ±0.001 mm", output: "complex", metadata: { confidence: 70, category: "shop_ground_truth" } },
      { instruction: "Brass fundamentals", output: "simple", metadata: { confidence: 100, category: "fundamentals", tags: ["brass"] } },
    ];
    const ordered = wedmCurriculumSchedulerEngine.emitCurriculum(corpus);
    expect(ordered).toHaveLength(2);
    expect(ordered[0].complexity).toBeLessThanOrEqual(ordered[1].complexity);
    expect(ordered[0].instruction).toBe("Brass fundamentals");
  });

  it("wedm_academy_bridge: with no courses, emits empty stats but does not throw", () => {
    wedmAcademyBridgeEngine.setCourses([]);
    const stats = wedmAcademyBridgeEngine.stats();
    expect(stats.courses).toBe(0);
    expect(stats.trainingExamples).toBe(0);
    const tooltips = wedmAcademyBridgeEngine.emitWizardTooltips();
    expect(tooltips).toHaveLength(0);
  });
});
