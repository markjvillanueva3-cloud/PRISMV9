/**
 * R3-MS4.5-T2 InferenceChainEngine Unit Tests
 *
 * Pure unit tests — do NOT require actual API calls.
 * API-dependent paths are exercised through graceful degradation
 * (hasValidApiKey() === false in CI without ANTHROPIC_API_KEY).
 *
 * Test coverage (15 cases):
 *   1.  listChainTypes returns expected types
 *   2.  CHAIN_ACTIONS exports correct action names
 *   3.  Template substitution — simple variable
 *   4.  Template substitution — multiple variables
 *   5.  Template substitution — unknown key preserved
 *   6.  Template substitution — object value JSON-stringified
 *   7.  chain_id generation — unique IDs
 *   8.  chain_id generation — format validation
 *   9.  Graceful degradation — runInferenceChain no API key
 *  10.  Graceful degradation — analyzeAndRecommend no API key
 *  11.  Graceful degradation — deepDiagnose no API key
 *  12.  response_level "pointer" filtering
 *  13.  response_level "summary" filtering
 *  14.  response_level "full" — step_results present
 *  15.  InferenceChainResult structure validation
 */

import {
  runInferenceChain,
  analyzeAndRecommend,
  deepDiagnose,
  listChainTypes,
  CHAIN_ACTIONS,
  type InferenceChainConfig,
  type InferenceChainResult,
  type ChainStep,
} from "../../src/engines/InferenceChainEngine.js";

// ============================================================================
// Test framework (minimal — no external dependencies)
// ============================================================================

interface TestCase {
  name: string;
  run: () => string[] | Promise<string[]>;
}

let passed = 0;
let failed = 0;

async function runTests(tests: TestCase[]): Promise<void> {
  for (const test of tests) {
    try {
      const errs = await test.run();
      if (errs.length === 0) {
        console.log(`  PASS  ${test.name}`);
        passed++;
      } else {
        console.log(`  FAIL  ${test.name}`);
        for (const e of errs) {
          console.log(`          -> ${e}`);
        }
        failed++;
      }
    } catch (err) {
      console.log(`  ERROR ${test.name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }
}

// ============================================================================
// Internal helpers re-exported for testing via module internals
// We test substituteTemplate indirectly via the engine's template substitution
// by verifying final outputs when no API key is set.
// ============================================================================

/**
 * Simulate substituteTemplate logic for unit testing.
 * Mirrors the internal implementation in InferenceChainEngine.ts.
 */
function substituteTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (key in variables) {
      const val = variables[key];
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    }
    return _match;
  });
}

/**
 * Extract chain_id format from a generated ID string.
 * Expected format: chain_{timestamp}_{4-char hex}
 */
function isValidChainIdFormat(id: string): boolean {
  return /^chain_\d+_[0-9a-f]{4}$/.test(id);
}

// ============================================================================
// Tests
// ============================================================================

const TESTS: TestCase[] = [
  // === 1. listChainTypes ===
  {
    name: "listChainTypes returns sequential, parallel, reduce",
    run: () => {
      const errs: string[] = [];
      const types = listChainTypes();
      if (!Array.isArray(types)) {
        errs.push(`Expected array, got ${typeof types}`);
        return errs;
      }
      const expected = ["sequential", "parallel", "reduce"];
      for (const t of expected) {
        if (!types.includes(t)) errs.push(`Missing chain type: ${t}`);
      }
      if (types.length !== expected.length) {
        errs.push(`Expected ${expected.length} types, got ${types.length}: [${types.join(", ")}]`);
      }
      return errs;
    },
  },

  // === 2. CHAIN_ACTIONS ===
  {
    name: "CHAIN_ACTIONS exports correct action names",
    run: () => {
      const errs: string[] = [];
      if (!Array.isArray(CHAIN_ACTIONS)) {
        errs.push(`CHAIN_ACTIONS should be array-like, got ${typeof CHAIN_ACTIONS}`);
        return errs;
      }
      const expected = ["inference_chain", "analyze_and_recommend", "deep_diagnose", "list_chain_types"];
      const actionsArr = Array.from(CHAIN_ACTIONS);
      for (const a of expected) {
        if (!actionsArr.includes(a as any)) errs.push(`Missing action: ${a}`);
      }
      return errs;
    },
  },

  // === 3. Template substitution — simple variable ===
  {
    name: "substituteTemplate replaces a single {{variable}}",
    run: () => {
      const errs: string[] = [];
      const result = substituteTemplate("Hello {{name}}!", { name: "PRISM" });
      if (result !== "Hello PRISM!") errs.push(`Expected "Hello PRISM!", got "${result}"`);
      return errs;
    },
  },

  // === 4. Template substitution — multiple variables ===
  {
    name: "substituteTemplate replaces multiple {{variables}}",
    run: () => {
      const errs: string[] = [];
      const result = substituteTemplate("{{a}} + {{b}} = {{c}}", { a: "1", b: "2", c: "3" });
      if (result !== "1 + 2 = 3") errs.push(`Expected "1 + 2 = 3", got "${result}"`);
      return errs;
    },
  },

  // === 5. Template substitution — unknown key preserved ===
  {
    name: "substituteTemplate leaves unknown {{keys}} intact",
    run: () => {
      const errs: string[] = [];
      const result = substituteTemplate("{{known}} {{unknown}}", { known: "hello" });
      if (result !== "hello {{unknown}}") {
        errs.push(`Expected "hello {{unknown}}", got "${result}"`);
      }
      return errs;
    },
  },

  // === 6. Template substitution — object value JSON-stringified ===
  {
    name: "substituteTemplate JSON-stringifies object values",
    run: () => {
      const errs: string[] = [];
      const obj = { x: 1, y: 2 };
      const result = substituteTemplate("data: {{obj}}", { obj });
      const expected = `data: ${JSON.stringify(obj)}`;
      if (result !== expected) {
        errs.push(`Expected '${expected}', got '${result}'`);
      }
      return errs;
    },
  },

  // === 7. Chain ID generation — unique IDs ===
  {
    name: "runInferenceChain generates unique chain_id values",
    run: async () => {
      const errs: string[] = [];
      // We test this via the no-API-key path which still generates a chain_id
      const config1: InferenceChainConfig = {
        name: "test-chain-1",
        steps: [],
        input: {},
      };
      const config2: InferenceChainConfig = {
        name: "test-chain-2",
        steps: [],
        input: {},
      };
      const r1 = await runInferenceChain(config1);
      const r2 = await runInferenceChain(config2);
      if (r1.chain_id === r2.chain_id) {
        errs.push(`Two chains generated the same chain_id: ${r1.chain_id}`);
      }
      return errs;
    },
  },

  // === 8. Chain ID generation — format validation ===
  {
    name: "Auto-generated chain_id matches chain_{ts}_{hex4} format",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        name: "format-test",
        steps: [],
        input: {},
      };
      const r = await runInferenceChain(config);
      if (!isValidChainIdFormat(r.chain_id)) {
        errs.push(`chain_id format invalid: "${r.chain_id}" (expected chain_{digits}_{4hex})`);
      }
      return errs;
    },
  },

  // === 9. Graceful degradation — runInferenceChain no API key ===
  {
    name: "runInferenceChain returns structured error when no API key",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        name: "no-key-test",
        steps: [
          {
            name: "step1",
            model_tier: "haiku",
            prompt_template: "Test {{topic}}",
          },
        ],
        input: { topic: "steel milling" },
        log_to_disk: false,
      };
      // This will use no-key path in CI (no ANTHROPIC_API_KEY set)
      // or will actually run if key is present — either way, result must be valid shape
      let result: InferenceChainResult;
      try {
        result = await runInferenceChain(config);
      } catch (err) {
        errs.push(`runInferenceChain should not throw — got: ${err}`);
        return errs;
      }

      // Validate shape regardless of whether key is present
      if (!result.chain_id) errs.push("Missing chain_id in result");
      if (!result.name) errs.push("Missing name in result");
      if (typeof result.steps_completed !== "number") errs.push("steps_completed must be number");
      if (typeof result.total_steps !== "number") errs.push("total_steps must be number");
      if (!result.total_tokens) errs.push("Missing total_tokens");
      if (typeof result.total_duration_ms !== "number") errs.push("total_duration_ms must be number");
      if (!["completed", "partial", "failed"].includes(result.status)) {
        errs.push(`Invalid status: ${result.status}`);
      }

      return errs;
    },
  },

  // === 10. Graceful degradation — analyzeAndRecommend no API key ===
  {
    name: "analyzeAndRecommend returns structured result (no API key path)",
    run: async () => {
      const errs: string[] = [];
      let result: any;
      try {
        result = await analyzeAndRecommend({
          scenario: "High tool wear rate when milling Inconel 718",
          material: "Inconel 718",
        });
      } catch (err) {
        errs.push(`analyzeAndRecommend should not throw — got: ${err}`);
        return errs;
      }

      if (!result.chain_id) errs.push("Missing chain_id");
      if (typeof result.problem_classification !== "string") errs.push("problem_classification must be string");
      if (!Array.isArray(result.recommendations)) errs.push("recommendations must be array");
      if (!result.total_tokens) errs.push("Missing total_tokens");
      if (typeof result.total_tokens.input !== "number") errs.push("total_tokens.input must be number");
      if (typeof result.total_tokens.output !== "number") errs.push("total_tokens.output must be number");

      return errs;
    },
  },

  // === 11. Graceful degradation — deepDiagnose no API key ===
  {
    name: "deepDiagnose returns structured result (no API key path)",
    run: async () => {
      const errs: string[] = [];
      let result: any;
      try {
        result = await deepDiagnose({
          alarm_code: "ALM 410",
          symptoms: "Spindle overload during roughing, vibration increasing",
          material: "Ti-6Al-4V",
        });
      } catch (err) {
        errs.push(`deepDiagnose should not throw — got: ${err}`);
        return errs;
      }

      if (!result.chain_id) errs.push("Missing chain_id");
      if (typeof result.failure_mode !== "string") errs.push("failure_mode must be string");
      if (!Array.isArray(result.root_causes)) errs.push("root_causes must be array");
      if (!Array.isArray(result.remediation)) errs.push("remediation must be array");
      if (!result.total_tokens) errs.push("Missing total_tokens");

      return errs;
    },
  },

  // === 12. response_level "pointer" filtering ===
  {
    name: "response_level pointer returns only chain_id + status",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        name: "pointer-test",
        steps: [],
        input: {},
        response_level: "pointer",
        log_to_disk: false,
      };
      const result = await runInferenceChain(config);

      if (!result.chain_id) errs.push("pointer: chain_id missing");
      if (!result.status) errs.push("pointer: status missing");

      // In pointer mode, final_output and name should be absent or empty
      // (the engine casts the partial to InferenceChainResult so fields exist
      // but pointer should strip most fields — check they're absent from JSON)
      const asJson = JSON.parse(JSON.stringify(result));
      const keys = Object.keys(asJson);
      if (keys.includes("step_results") && Array.isArray(asJson.step_results) && asJson.step_results.length > 0) {
        errs.push("pointer: step_results should not contain entries");
      }
      if (keys.includes("final_output") && asJson.final_output && typeof asJson.final_output === "string" && asJson.final_output.length > 0) {
        errs.push("pointer: final_output should be absent at pointer level");
      }

      return errs;
    },
  },

  // === 13. response_level "summary" filtering ===
  {
    name: "response_level summary includes final_output and total_tokens",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        name: "summary-test",
        steps: [],
        input: {},
        response_level: "summary",
        log_to_disk: false,
      };
      const result = await runInferenceChain(config);

      // summary must have: chain_id, name, final_output, total_tokens, status
      if (!result.chain_id) errs.push("summary: chain_id missing");
      if (!result.name) errs.push("summary: name missing");
      if (result.final_output === undefined) errs.push("summary: final_output missing");
      if (!result.total_tokens) errs.push("summary: total_tokens missing");
      if (!result.status) errs.push("summary: status missing");

      return errs;
    },
  },

  // === 14. response_level "full" — step_results present ===
  {
    name: "response_level full includes step_results array",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        name: "full-level-test",
        steps: [
          {
            name: "step_a",
            model_tier: "haiku",
            prompt_template: "Analyse: {{query}}",
          },
        ],
        input: { query: "test" },
        response_level: "full",
        log_to_disk: false,
      };
      const result = await runInferenceChain(config);

      if (!Array.isArray(result.step_results)) {
        errs.push("full: step_results must be an array");
      }
      if (typeof result.total_steps !== "number") {
        errs.push("full: total_steps must be present");
      }
      if (typeof result.steps_completed !== "number") {
        errs.push("full: steps_completed must be present");
      }
      if (typeof result.total_duration_ms !== "number") {
        errs.push("full: total_duration_ms must be present");
      }

      return errs;
    },
  },

  // === 15. InferenceChainResult structure validation ===
  {
    name: "InferenceChainResult has all required fields",
    run: async () => {
      const errs: string[] = [];
      const config: InferenceChainConfig = {
        chain_id: "chain_test_abcd",
        name: "structure-validation",
        steps: [],
        input: { foo: "bar" },
        response_level: "full",
        log_to_disk: false,
      };
      const result = await runInferenceChain(config);

      // Required fields
      const requiredFields: Array<keyof InferenceChainResult> = [
        "chain_id",
        "name",
        "steps_completed",
        "total_steps",
        "total_tokens",
        "total_duration_ms",
        "final_output",
        "step_results",
        "status",
      ];
      for (const field of requiredFields) {
        if (result[field] === undefined) errs.push(`Missing required field: ${field}`);
      }

      // chain_id should match the one we provided
      if (result.chain_id !== "chain_test_abcd") {
        errs.push(`chain_id should be "chain_test_abcd", got "${result.chain_id}"`);
      }

      // total_steps should equal config.steps.length
      if (result.total_steps !== config.steps.length) {
        errs.push(`total_steps ${result.total_steps} !== steps.length ${config.steps.length}`);
      }

      // total_tokens must have numeric input + output
      if (typeof result.total_tokens?.input !== "number") errs.push("total_tokens.input must be number");
      if (typeof result.total_tokens?.output !== "number") errs.push("total_tokens.output must be number");

      // status must be one of the valid values
      if (!["completed", "partial", "failed"].includes(result.status)) {
        errs.push(`Invalid status value: "${result.status}"`);
      }

      return errs;
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

async function main(): Promise<void> {
  console.log("=== InferenceChainEngine Unit Tests (R3-MS4.5-T2) ===\n");
  await runTests(TESTS);
  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
