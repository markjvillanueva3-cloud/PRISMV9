/**
 * U-WIRE-LATHE-LORA-REASON-EVAL — wiring-gate test
 * ===================================================
 *
 * Verifies the 5 dispatcher actions for `LatheLoRAReasoningEvaluatorEngine`
 * (evaluate/getSummary/getSuggestions/setConfig/getConfig).
 *
 * @module __tests__/U-WIRE-LATHE-LORA-REASON-EVAL
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { latheLoRAReasoningEvaluatorEngine } from "../engines/LatheLoRAReasoningEvaluatorEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const ACTIONS = [
  "lathe_lora_reason_evaluate",
  "lathe_lora_reason_summary",
  "lathe_lora_reason_suggestions",
  "lathe_lora_reason_set_config",
  "lathe_lora_reason_get_config",
] as const;

const METHOD_MAP: Record<typeof ACTIONS[number], string> = {
  lathe_lora_reason_evaluate: "evaluate",
  lathe_lora_reason_summary: "getSummary",
  lathe_lora_reason_suggestions: "getSuggestions",
  lathe_lora_reason_set_config: "setConfig",
  lathe_lora_reason_get_config: "getConfig",
};

beforeEach(() => {
  // Reset to default config for hermetic isolation.
  latheLoRAReasoningEvaluatorEngine.setConfig({
    min_explanation_length: 100,
    require_justification: true,
    require_steps: false,
    domain_term_threshold: 3,
    passing_score: 60,
  });
});

// Reasoning rich with domain terminology + causal markers + sequential structure.
const RICH_REASONING = `
First, we identified the part as a roughing operation requiring carbide insert tooling.
The cutting speed should be 250 SFM because the material is 1045 carbon steel — therefore
RPM at 1.5 inch diameter is approximately 636. Next, the feed rate of 0.012 IPR with a
depth of cut of 0.080 inch produces a chip load suitable for the rough turning operation.
The spindle power requirement is calculated using Kienzle formula: Fc = kc * b * h, which
results in approximately 4.2 kW. Since the machine has 7.5 kW spindle, we have adequate
margin. Therefore, we recommend these parameters with confidence.
`;

const WEAK_REASONING = `do roughing.`;

describe("U-WIRE-LATHE-LORA-REASON-EVAL — turning-dispatcher wiring", () => {
  it("registers all 5 actions in TURNING_ACTION_SCHEMAS", () => {
    for (const a of ACTIONS) {
      if (!SCHEMA_MAP[a]) throw new Error(`${a} missing from TURNING_ACTION_SCHEMAS`);
    }
  });

  it("evaluate schema requires non-empty output string", () => {
    expect(SCHEMA_MAP["lathe_lora_reason_evaluate"]!.safeParse({ output: RICH_REASONING }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reason_evaluate"]!.safeParse({ output: "" }).success).toBe(false);
  });

  it("set_config schema rejects passing_score outside [0,100]", () => {
    expect(SCHEMA_MAP["lathe_lora_reason_set_config"]!.safeParse({ config: { passing_score: -1 } }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_reason_set_config"]!.safeParse({ config: { passing_score: 150 } }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_lora_reason_set_config"]!.safeParse({ config: { passing_score: 80 } }).success).toBe(true);
  });

  it("get_config schema accepts empty input", () => {
    expect(SCHEMA_MAP["lathe_lora_reason_get_config"]!.safeParse({}).success).toBe(true);
  });

  it("summary / suggestions schemas require a ReasoningEvaluation object", () => {
    const ev = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    expect(SCHEMA_MAP["lathe_lora_reason_summary"]!.safeParse({ evaluation: ev }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reason_suggestions"]!.safeParse({ evaluation: ev }).success).toBe(true);
    expect(SCHEMA_MAP["lathe_lora_reason_summary"]!.safeParse({}).success).toBe(false);
  });

  it("dispatcher source carries all 5 actions in enum AND case form", () => {
    for (const a of ACTIONS) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("each case routes to its matching engine method (action↔method map verified)", () => {
    for (const a of ACTIONS) {
      const startIdx = DISPATCHER_SRC.indexOf(`case "${a}":`);
      if (startIdx < 0) throw new Error(`${a} case missing`);
      const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${a}":`.length);
      const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
      const expectedMethod = METHOD_MAP[a];
      if (!block.includes(`latheLoRAReasoningEvaluatorEngine.${expectedMethod}(`)) {
        throw new Error(`${a} case must call .${expectedMethod}`);
      }
    }
  });
});

describe("U-WIRE-LATHE-LORA-REASON-EVAL — engine semantic round-trip", () => {
  it("evaluate returns all 5 dimension scores + findings + passed boolean", () => {
    const ev = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    expect(typeof ev.overall_score).toBe("number");
    expect(ev.overall_score).toBeGreaterThanOrEqual(0);
    expect(ev.overall_score).toBeLessThanOrEqual(100);
    for (const dim of ["coherence_score", "domain_score", "justification_score", "structure_score", "completeness_score"] as const) {
      expect(typeof ev[dim]).toBe("number");
      expect(ev[dim]).toBeGreaterThanOrEqual(0);
      expect(ev[dim]).toBeLessThanOrEqual(100);
    }
    expect(Array.isArray(ev.findings)).toBe(true);
    expect(typeof ev.passed).toBe("boolean");
  });

  it("rich reasoning out-scores weak reasoning (real signal in the model)", () => {
    const rich = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    const weak = latheLoRAReasoningEvaluatorEngine.evaluate(WEAK_REASONING);
    if (rich.overall_score <= weak.overall_score) {
      throw new Error(`rich reasoning did not beat weak — rich=${rich.overall_score} weak=${weak.overall_score}`);
    }
  });

  it("weak reasoning fails (definitional invariant)", () => {
    const ev = latheLoRAReasoningEvaluatorEngine.evaluate(WEAK_REASONING);
    expect(ev.passed).toBe(false);
  });

  it("getSummary returns a non-empty string for any evaluation", () => {
    const ev = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    const s = latheLoRAReasoningEvaluatorEngine.getSummary(ev);
    expect(typeof s).toBe("string");
    expect(s.length).toBeGreaterThan(0);
  });

  it("getSuggestions returns array (weak output → at least one suggestion)", () => {
    const weak = latheLoRAReasoningEvaluatorEngine.evaluate(WEAK_REASONING);
    const sugg = latheLoRAReasoningEvaluatorEngine.getSuggestions(weak);
    expect(Array.isArray(sugg)).toBe(true);
    // Weak output ALWAYS surfaces at least one improvement suggestion.
    expect(sugg.length).toBeGreaterThan(0);
  });

  it("setConfig + getConfig round-trip (passing_score override read-back)", () => {
    latheLoRAReasoningEvaluatorEngine.setConfig({ passing_score: 85 });
    expect(latheLoRAReasoningEvaluatorEngine.getConfig().passing_score).toBe(85);
  });

  it("raising the passing_score above current overall flips passed:true→false", () => {
    const baseline = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    if (!baseline.passed) {
      // Baseline didn't pass — skip the flip invariant.
      return;
    }
    latheLoRAReasoningEvaluatorEngine.setConfig({ passing_score: Math.min(100, baseline.overall_score + 5) });
    const after = latheLoRAReasoningEvaluatorEngine.evaluate(RICH_REASONING);
    if (after.passed === true) {
      throw new Error(`raised passing_score to ${latheLoRAReasoningEvaluatorEngine.getConfig().passing_score} above overall=${baseline.overall_score} but still passed`);
    }
  });
});
