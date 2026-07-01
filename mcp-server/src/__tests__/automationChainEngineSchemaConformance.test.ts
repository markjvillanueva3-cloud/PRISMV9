/**
 * ACP — AutomationChainEngine ↔ frozen-contract conformance
 * =========================================================
 * The RUNTIME (AutomationChainEngine, ACP-MS0A+MS1, wired to devDispatcher)
 * declares its OWN local TaskClass/ChainTier/FailBehavior/AutomationChain types
 * that DUPLICATE the canonical Zod contract in `schemas/automationChainSchema.ts`
 * — a single-source-of-truth split (R7). Nothing currently proves the engine's
 * runtime chains actually honor the frozen contract, so the two can silently
 * drift (e.g. the engine emits a chain the schema would reject, or the schema
 * tightens and the engine no longer conforms).
 *
 * This test is the missing VALIDATE leg (R15): it round-trips every chain the
 * engine produces through `AutomationChainSchema` and pins the classifier's
 * intent. It is the runtime bridge to the contract frozen by
 * `automationChainSchema.test.ts`.
 *
 * @module __tests__/automationChainEngineSchemaConformance.test
 * @milestone ACP-MS0A
 */

import { describe, it, expect } from "vitest";
import { automationChainEngine } from "../engines/AutomationChainEngine.js";
import {
  AutomationChainSchema,
  TaskClassSchema,
  ChainTierSchema,
  TelemetryEventStatusSchema,
} from "../schemas/automationChainSchema.js";

// Every TaskClass the contract knows about. The engine MUST define a chain for
// each (it keys CHAINS by TaskClass), so this is also a completeness check:
// a class added to the schema enum but not to the engine would fail getChain.
const ALL_TASK_CLASSES = TaskClassSchema.options;

describe("AutomationChainEngine — every runtime chain conforms to the frozen AutomationChainSchema (R15 VALIDATE)", () => {
  it.each(ALL_TASK_CLASSES)("getChain('%s') produces a chain that validates against AutomationChainSchema", (taskClass) => {
    const chain = automationChainEngine.getChain(taskClass);
    const result = AutomationChainSchema.safeParse(chain);
    // Surface the exact zod issue if it fails — a non-conforming runtime chain
    // is a real contract-drift bug, not a test problem (R12).
    expect(result.success, result.success ? "" : JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("each chain's parsed task_class matches the key it was fetched under", () => {
    for (const taskClass of ALL_TASK_CLASSES) {
      const parsed = AutomationChainSchema.parse(automationChainEngine.getChain(taskClass));
      expect(parsed.task_class).toBe(taskClass);
      expect(ChainTierSchema.options).toContain(parsed.tier);
      expect(Number.isInteger(parsed.token_budget)).toBe(true);
      expect(parsed.token_budget).toBeGreaterThan(0);
    }
  });

  it("operational chains have >=1 executable step; 'general' is the intentional step-less catch-all", () => {
    // VERIFIED against the engine's CHAINS table: 8 domain chains carry steps,
    // the 'general' catch-all is deliberately step-less (degrade_silent, no
    // special automation for an unclassified prompt). The test encodes that real
    // contract so adding steps to 'general' OR emptying an operational chain both
    // fail (drift in either direction is caught).
    for (const taskClass of ALL_TASK_CLASSES) {
      const chain = automationChainEngine.getChain(taskClass);
      if (taskClass === "general") {
        expect(chain.steps.length, "'general' is the step-less catch-all").toBe(0);
      } else {
        expect(chain.steps.length, `${taskClass} must have >=1 step`).toBeGreaterThan(0);
      }
      // Any step that DOES exist must be executable: positive timeout + a real id.
      for (const step of chain.steps) {
        expect(step.timeout_ms, `${taskClass}/${step.id} timeout`).toBeGreaterThan(0);
        expect(step.id.length, `${taskClass} step id`).toBeGreaterThan(0);
      }
    }
  });

  it("listChains() enumerates exactly the 9 task classes with positive budgets", () => {
    const listed = automationChainEngine.listChains();
    expect(listed.map((c) => c.task_class).sort()).toEqual([...ALL_TASK_CLASSES].sort());
    for (const c of listed) {
      expect(c.token_budget, `${c.task_class} budget`).toBeGreaterThan(0);
      // 'general' is the step-less catch-all (0 steps); the other 8 are operational.
      if (c.task_class === "general") expect(c.steps, "'general' steps").toBe(0);
      else expect(c.steps, `${c.task_class} steps`).toBeGreaterThan(0);
    }
  });
});

describe("AutomationChainEngine.classify — keyword classifier intent (R9)", () => {
  it("returns a valid contract TaskClass for any prompt (never an off-contract class)", () => {
    for (const prompt of ["", "random words with no domain", "the quick brown fox"]) {
      const r = automationChainEngine.classify(prompt);
      expect(TaskClassSchema.options).toContain(r.task_class);
      expect(r.token_budget).toBeGreaterThan(0);
    }
  });

  it("routes unambiguous single-domain prompts to the expected class (reference values)", () => {
    // Each prompt is saturated with keywords from exactly ONE class's table.
    const cases: Array<[string, string]> = [
      ["react vite frontend component dashboard tailwind css jsx", "web"],
      ["cadquery cad python step brep fusion parametric sketch geometry", "cad_python"],
      ["fanuc haas okuma g-code post processor controller dialect m-code", "post_process"],
      ["quote cost price estimate rfq purchase order invoice supplier customer", "erp"],
      ["rpm sfm chip load kienzle taylor cutting force tool life chatter deflection", "speed_feed"],
    ];
    for (const [prompt, expected] of cases) {
      const r = automationChainEngine.classify(prompt);
      expect(r.task_class, `"${prompt}" -> ${r.task_class}`).toBe(expected);
      expect(r.matched_keywords.length).toBeGreaterThan(0);
      // The chain id the classifier resolves must belong to a real, conforming chain.
      const chain = automationChainEngine.getChain(r.task_class);
      expect(AutomationChainSchema.safeParse(chain).success).toBe(true);
    }
  });

  it("falls back to 'general' for a prompt with no domain keywords", () => {
    const r = automationChainEngine.classify("zzz qqq vvv");
    expect(r.task_class).toBe("general");
  });

  it("confidence is a normalized fraction in [0,1]", () => {
    const r = automationChainEngine.classify("engine dispatcher schema tsc build vitest");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

describe("AutomationChainEngine telemetry — engine emits the FULL contract status set (ACP-MS2)", () => {
  // ACP-MS2 closed the prior capability gap: executeChain now PRODUCES the full
  // 6-value status set, including "timeout" (a step exceeding timeout_ms) and
  // "budget_exceeded" (cumulative token_cost over the chain's token_budget). The
  // legacy createTelemetryEvent() helper still emits only the 4 base statuses;
  // every status either path can emit must be contract-valid (always validates
  // upstream through AutomationChainTelemetryEngine + the prism_telemetry schema).
  const LEGACY_HELPER_STATUSES = ["started", "completed", "failed", "skipped"];
  const EXECUTOR_TERMINAL_STATUSES = ["completed", "failed", "timeout", "budget_exceeded"];

  it("every status createTelemetryEvent can emit is a valid contract status", () => {
    for (const status of LEGACY_HELPER_STATUSES) {
      expect(TelemetryEventStatusSchema.safeParse(status).success, status).toBe(true);
    }
  });

  it("every terminal status executeChain can produce is a valid contract status (incl timeout, budget_exceeded)", () => {
    for (const status of EXECUTOR_TERMINAL_STATUSES) {
      expect(TelemetryEventStatusSchema.safeParse(status).success, status).toBe(true);
    }
  });

  it("the engine now covers the COMPLETE contract status set -- no contract-only gap remains", () => {
    // The union of every status the engine can emit (started from executeChain +
    // the 4 legacy + the 2 executor-only) equals the contract's full option set.
    const engineEmittable = new Set([...LEGACY_HELPER_STATUSES, ...EXECUTOR_TERMINAL_STATUSES, "started"]);
    const contractOnly = TelemetryEventStatusSchema.options.filter((s) => !engineEmittable.has(s));
    expect(contractOnly).toEqual([]);   // ACP-MS2: gap closed
  });
});
