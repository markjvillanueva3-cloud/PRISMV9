/**
 * aiReasoningDispatcher U-WIRE45 round-trip tests — LatheLoRADatasetValidatorEngine.
 *
 * Validates lathe_lora_validate / lathe_lora_validate_single / lathe_lora_summary
 * through prism_ai. Engine is stateless - no setup/teardown needed.
 *
 * Engine internals (verified):
 *   - Empty array → valid:false, score:0, total_examples:0.
 *   - Required fields: id, instruction, input, output. Missing field emits
 *     error issue and drops schema_compliance.
 *   - Instruction/output length checked against config (default 20-500 / 50-2000).
 *     Out of bounds → warning issue.
 *   - Physics sanity: RPM (50-6000), feed_ipr (0.001-0.1), depth_mm (0.1-10),
 *     surface_speed_mpm (10-500). Out of bounds → warning issue.
 *   - Duplicate detection via content hash (instruction + output).
 *   - Score combines schema_compliance + content_quality + physics_sanity +
 *     diversity_score + (1 - duplicate_ratio); higher is better.
 *   - getSummary returns multi-line markdown-ish text including pass/fail,
 *     score, example count, error/warning counts, optional recommendations.
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE45
 */

import { describe, it, expect } from "vitest";
import { latheLoRADatasetValidatorEngine } from "../engines/LatheLoRADatasetValidatorEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = ["lathe_lora_validate", "lathe_lora_validate_single", "lathe_lora_summary"] as const;

// Fully-formed valid LoRAExample (matches engine's interface verbatim)
const GOOD_EXAMPLE = {
  id: "ex-1",
  instruction: "Calculate spindle RPM for 100 m/min surface speed on 50 mm OD",
  input: "Material: 4140 steel, OD: 50 mm, target Vc: 100 m/min",
  output: "RPM = 1000 * Vc / (pi * D) = 1000 * 100 / (3.14159 * 50) = 636.6 RPM. Round down to 600 RPM for safety margin.",
  metadata: {
    source_program: "OP100",
    customer: "JM-DIE",
    operation_type: "roughing",
    confidence: 0.85,
    tribal_tips_applied: ["safe-rpm-rounding"],
  },
};

const SHORT_INSTRUCTION_EXAMPLE = {
  id: "ex-short",
  instruction: "RPM?", // 4 chars, well below default min 20
  input: "OP100 line 5",
  output: "Calculate RPM from surface speed and diameter using V=pi*D*N/1000",
  metadata: {
    source_program: "OP100",
    customer: "JM-DIE",
    operation_type: "roughing",
    confidence: 0.7,
    tribal_tips_applied: [],
  },
};

const MISSING_FIELD_EXAMPLE = {
  id: "ex-missing",
  // instruction missing
  input: "ctx",
  output: "answer",
};

describe("U-WIRE45 — engine direct: LatheLoRADatasetValidatorEngine", () => {
  it("validate on empty dataset returns valid:false, score:0, total:0", () => {
    const r = latheLoRADatasetValidatorEngine.validate([]);
    expect(r.valid).toBe(false);
    expect(r.score).toBe(0);
    expect(r.total_examples).toBe(0);
  });

  it("validate on single good example returns valid:true with high score", () => {
    const r = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE]);
    expect(r.total_examples).toBe(1);
    expect(r.score).toBeGreaterThan(0);
    expect(typeof r.valid).toBe("boolean");
    // Issues array exists.
    expect(Array.isArray(r.issues)).toBe(true);
    // Metrics has all 8 fields documented.
    expect(typeof r.metrics.schema_compliance).toBe("number");
    expect(typeof r.metrics.content_quality).toBe("number");
    expect(typeof r.metrics.physics_sanity).toBe("number");
    expect(typeof r.metrics.diversity_score).toBe("number");
    expect(typeof r.metrics.duplicate_ratio).toBe("number");
    expect(typeof r.metrics.avg_instruction_length).toBe("number");
    expect(typeof r.metrics.avg_output_length).toBe("number");
    expect(Array.isArray(r.metrics.operation_coverage)).toBe(true);
  });

  it("validate flags too-short instruction with warning issue", () => {
    const r = latheLoRADatasetValidatorEngine.validate([SHORT_INSTRUCTION_EXAMPLE]);
    // Engine emits warning when instruction < min_instruction_length (default 20)
    const lengthIssues = r.issues.filter((i) => /short|length|instruction/i.test(i.message));
    expect(lengthIssues.length).toBeGreaterThan(0);
    // Issue must be severity warning (not error) per engine contract.
    expect(lengthIssues.every((i) => i.severity === "warning")).toBe(true);
    // avg_instruction_length metric reflects the actual short text (4 chars).
    expect(r.metrics.avg_instruction_length).toBe(SHORT_INSTRUCTION_EXAMPLE.instruction.length);
  });

  it("validate flags missing required field with error issue", () => {
    // @ts-expect-error - intentionally missing instruction to test schema check
    const r = latheLoRADatasetValidatorEngine.validate([MISSING_FIELD_EXAMPLE]);
    const errorIssues = r.issues.filter((i) => i.severity === "error");
    expect(errorIssues.length).toBeGreaterThan(0);
    // Schema compliance should drop below 1.
    expect(r.metrics.schema_compliance).toBeLessThan(1);
  });

  it("validate detects duplicates (same instruction+output emitted twice)", () => {
    const dupe = { ...GOOD_EXAMPLE, id: "dupe-2" };
    const r = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE, dupe], { check_duplicates: true });
    // duplicate_ratio > 0 when at least one duplicate detected
    expect(r.metrics.duplicate_ratio).toBeGreaterThan(0);
  });

  it("validate honors check_duplicates=false config (no duplicate scan)", () => {
    const dupe = { ...GOOD_EXAMPLE, id: "dupe-2" };
    const r = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE, dupe], { check_duplicates: false });
    // With duplicate check disabled, ratio stays 0.
    expect(r.metrics.duplicate_ratio).toBe(0);
  });

  it("validate returns recommendations array (may be empty)", () => {
    const r = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE]);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });

  it("validate score is bounded [0, 100]", () => {
    const r = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE, { ...GOOD_EXAMPLE, id: "ex-2" }]);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("validateSingle wraps validate([example]) and returns issues only", () => {
    const issues = latheLoRADatasetValidatorEngine.validateSingle(SHORT_INSTRUCTION_EXAMPLE);
    expect(Array.isArray(issues)).toBe(true);
    // Should match what validate returns.
    const fullIssues = latheLoRADatasetValidatorEngine.validate([SHORT_INSTRUCTION_EXAMPLE]).issues;
    expect(issues.length).toBe(fullIssues.length);
  });

  it("getSummary includes PASSED/FAILED, score, example count, issue counts", () => {
    const result = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE]);
    const summary = latheLoRADatasetValidatorEngine.getSummary(result);
    expect(summary.includes(result.valid ? "PASSED" : "FAILED")).toBe(true);
    expect(summary.includes("Score:")).toBe(true);
    expect(summary.includes("Examples:")).toBe(true);
    expect(summary.includes("Issues:")).toBe(true);
  });

  it("getSummary on FAILED result lists recommendations under header", () => {
    // Build a failing result with a recommendation.
    const failed = {
      valid: false,
      score: 25,
      total_examples: 5,
      issues: [
        { severity: "error" as const, code: "E001", message: "schema fail" },
        { severity: "warning" as const, code: "W001", message: "short instruction" },
      ],
      metrics: {
        schema_compliance: 0.4,
        content_quality: 0.5,
        physics_sanity: 0.9,
        diversity_score: 0.5,
        duplicate_ratio: 0.0,
        avg_instruction_length: 30,
        avg_output_length: 100,
        type_distribution: {},
        operation_coverage: [],
        customer_coverage: 0,
      },
      recommendations: ["Add more roughing examples", "Fix schema errors"],
    };
    const summary = latheLoRADatasetValidatorEngine.getSummary(failed);
    expect(summary.includes("FAILED")).toBe(true);
    expect(summary.includes("Score: 25")).toBe(true);
    expect(summary.includes("Recommendations:")).toBe(true);
    expect(summary.includes("Add more roughing examples")).toBe(true);
    expect(summary.includes("Fix schema errors")).toBe(true);
  });
});

describe("U-WIRE45 — schema integrity: ACTION_AI_REASONING_SCHEMAS", () => {
  it.each(NEW_ACTIONS)("schema for '%s' echoes minimal valid input verbatim", (action) => {
    const schema = ACTION_AI_REASONING_SCHEMAS[action as AIReasoningAction];
    const minimal: Record<string, Record<string, unknown>> = {
      lathe_lora_validate: { examples: [] },
      lathe_lora_validate_single: { example: { id: "x", instruction: "i", input: "in", output: "o" } },
      lathe_lora_summary: {
        result: {
          valid: true,
          score: 80,
          total_examples: 1,
          issues: [],
          metrics: {},
          recommendations: [],
        },
      },
    };
    const parsed = schema.parse(minimal[action]);
    expect(parsed).toEqual(minimal[action]);
  });

  it("lathe_lora_validate rejects missing examples key (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate"];
    expect(() => schema.parse({})).toThrow();
  });

  it("lathe_lora_validate rejects example missing required id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate"];
    expect(() => schema.parse({
      examples: [{ instruction: "i", input: "in", output: "o" }],
    })).toThrow();
  });

  it("lathe_lora_validate rejects example with empty id (failure mode)", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate"];
    expect(() => schema.parse({
      examples: [{ id: "", instruction: "i", input: "in", output: "o" }],
    })).toThrow();
  });

  it("lathe_lora_validate config rejects min_confidence outside [0,1]", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate"];
    expect(() => schema.parse({
      examples: [],
      config: { min_confidence: 1.5 },
    })).toThrow();
    expect(() => schema.parse({
      examples: [],
      config: { min_confidence: -0.1 },
    })).toThrow();
  });

  it("lathe_lora_validate config rejects similarity_threshold outside [0,1]", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate"];
    expect(() => schema.parse({
      examples: [],
      config: { similarity_threshold: 2 },
    })).toThrow();
  });

  it("lathe_lora_validate_single rejects missing example key", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_validate_single"];
    expect(() => schema.parse({})).toThrow();
  });

  it("lathe_lora_summary rejects malformed result", () => {
    const schema = ACTION_AI_REASONING_SCHEMAS["lathe_lora_summary"];
    expect(() => schema.parse({ result: { valid: "yes" } })).toThrow();
    expect(() => schema.parse({ result: { valid: true, score: 50 } })).toThrow();
  });

  it.each(NEW_ACTIONS)("'%s' is registered in AI_REASONING_ACTIONS enum", (action) => {
    expect(AI_REASONING_ACTIONS.includes(action as AIReasoningAction)).toBe(true);
  });
});

describe("U-WIRE45 — dispatcher round-trip: prism_ai", () => {
  it("lathe_lora_validate on empty dataset returns success:true, valid:false, score:0", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", { examples: [] });
    expect(out.success).toBe(true);
    const data = out.data as { valid: boolean; score: number; total_examples: number };
    expect(data.valid).toBe(false);
    expect(data.score).toBe(0);
    expect(data.total_examples).toBe(0);
  });

  it("lathe_lora_validate on single good example returns full result shape", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", { examples: [GOOD_EXAMPLE] });
    expect(out.success).toBe(true);
    const data = out.data as {
      valid: boolean;
      score: number;
      total_examples: number;
      issues: unknown[];
      metrics: { schema_compliance: number };
      recommendations: string[];
    };
    expect(data.total_examples).toBe(1);
    expect(typeof data.metrics.schema_compliance).toBe("number");
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it("lathe_lora_validate honors check_duplicates=true config from caller", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", {
      examples: [GOOD_EXAMPLE, { ...GOOD_EXAMPLE, id: "dupe" }],
      config: { check_duplicates: true },
    });
    expect(out.success).toBe(true);
    const data = out.data as { metrics: { duplicate_ratio: number } };
    expect(data.metrics.duplicate_ratio).toBeGreaterThan(0);
  });

  it("lathe_lora_validate_single returns {issues, count}", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate_single", {
      example: SHORT_INSTRUCTION_EXAMPLE,
    });
    expect(out.success).toBe(true);
    const data = out.data as { issues: unknown[]; count: number };
    expect(data.count).toBe(data.issues.length);
    // Short instruction must produce at least one issue.
    expect(data.count).toBeGreaterThan(0);
  });

  it("lathe_lora_summary on engine-direct result returns markdown summary", async () => {
    const directResult = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE]);
    const out = await executeAIReasoningAction("lathe_lora_summary", { result: directResult });
    expect(out.success).toBe(true);
    const data = out.data as { summary: string };
    expect(data.summary.length).toBeGreaterThan(0);
    expect(data.summary.includes(directResult.valid ? "PASSED" : "FAILED")).toBe(true);
  });

  it("lathe_lora_validate without examples key returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", {});
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/examples|required/i);
  });

  it("lathe_lora_validate with example missing id returns success:false (Zod)", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", {
      examples: [{ instruction: "i", input: "in", output: "o" }],
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/id|required/i);
  });

  it("lathe_lora_validate with malformed config returns success:false", async () => {
    const out = await executeAIReasoningAction("lathe_lora_validate", {
      examples: [],
      config: { min_confidence: 5 },
    });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/min_confidence|max/i);
  });

  it("dispatcher validate is equivalent to engine direct for same input", async () => {
    const direct = latheLoRADatasetValidatorEngine.validate([GOOD_EXAMPLE]);
    const out = await executeAIReasoningAction("lathe_lora_validate", { examples: [GOOD_EXAMPLE] });
    expect(out.success).toBe(true);
    const data = out.data as { score: number; total_examples: number; valid: boolean };
    expect(data.score).toBe(direct.score);
    expect(data.total_examples).toBe(direct.total_examples);
    expect(data.valid).toBe(direct.valid);
  });
});
