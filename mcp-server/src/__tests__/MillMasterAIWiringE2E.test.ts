/**
 * MillMasterAIWiringE2E.test — MILL-MASTER-AI-WIRING / U16-DISPATCHER-E2E
 * =========================================================================
 * Verifies the new mill_prism_reason dispatcher action end-to-end.
 *
 * @milestone MILL-MASTER-AI-WIRING / U16-DISPATCHER-E2E
 */

import { describe, expect, it } from "vitest";
import {
  MILL_DISPATCHER_ACTIONS,
  executeMillAction,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const ACTION = "mill_prism_reason";

// ---------------------------------------------------------------------------
// ACTIONS enum + anti-regression
// ---------------------------------------------------------------------------

describe("MILL_DISPATCHER_ACTIONS — mill_prism_reason registration (U16)", () => {
  it("ACTIONS array contains mill_prism_reason exactly once", () => {
    const occurrences = MILL_DISPATCHER_ACTIONS.filter((a) => a === ACTION).length;
    expect(occurrences).toBe(1);
  });

  it("ACTIONS array has no duplicate entries (anti-regression)", () => {
    const unique = new Set(MILL_DISPATCHER_ACTIONS);
    expect(unique.size).toBe(MILL_DISPATCHER_ACTIONS.length);
  });

  it("mill_prism_reason coexists with mill_agi_reason (preserves facade action)", () => {
    expect(MILL_DISPATCHER_ACTIONS.includes("mill_agi_reason")).toBe(true);
    expect(MILL_DISPATCHER_ACTIONS.includes("mill_prism_reason")).toBe(true);
  });

  it("MILL_ACTION_SCHEMAS[mill_prism_reason] safeParses a minimal valid input", () => {
    const r = MILL_ACTION_SCHEMAS[ACTION].safeParse({ question: "x" });
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Zod schema validation
// ---------------------------------------------------------------------------

describe("mill_prism_reason — Zod schema (U16)", () => {
  const schema = MILL_ACTION_SCHEMAS[ACTION];

  it("accepts op='reason' with question + context", () => {
    const r = schema.safeParse({
      op: "reason",
      question: "Should I use 5-axis simultaneous for an impeller?",
      context: { material: "P", machine: "Okuma M460V-5AX" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts op='rank' with candidates[]", () => {
    const r = schema.safeParse({
      op: "rank",
      question: "rank these strategies",
      candidates: ["3+2", "5-axis simultaneous", "swarf"],
    });
    expect(r.success).toBe(true);
  });

  it("accepts op='budget' with budget_ms", () => {
    const r = schema.safeParse({ op: "budget", budget_ms: 200, question: "probe" });
    expect(r.success).toBe(true);
  });

  it("defaults op to 'reason' when omitted (Zod default)", () => {
    const r = schema.safeParse({ question: "anything" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.op).toBe("reason");
  });

  it("rejects an unknown op", () => {
    const r = schema.safeParse({ op: "unknown_op", question: "x" });
    expect(r.success).toBe(false);
  });

  it("rejects budget_ms below 1ms (boundary)", () => {
    const r = schema.safeParse({ op: "budget", budget_ms: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects budget_ms above 10s ceiling", () => {
    const r = schema.safeParse({ op: "budget", budget_ms: 100_000 });
    expect(r.success).toBe(false);
  });

  it("rejects budget_ms NaN (adversarial)", () => {
    const r = schema.safeParse({ op: "budget", budget_ms: NaN });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// E2E invocation through executeMillAction
// ---------------------------------------------------------------------------

describe("mill_prism_reason — E2E through dispatcher (U16)", () => {
  it("op='reason' returns a structured TreeOfThought reasoning chain on success", async () => {
    const result = await executeMillAction(ACTION, {
      op: "reason",
      question: "Pick optimal 5-axis strategy for an impeller blade",
      goal: "actionable_recommendation",
      constraints: ["material=P", "machine=Okuma M460V-5AX"],
    });
    expect(result.op).toBe("reason");
    // Reasoning succeeded — assert concrete shape.
    expect(result.error).toBe(undefined);
    expect(result.source).toBe("tree_of_thought");
    expect(Array.isArray(result.reasoning_chain)).toBe(true);
    expect(result.reasoning_chain.length).toBeLessThanOrEqual(6);
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(Number.isFinite(result.branch_count)).toBe(true);
    expect(result.branch_count).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.max_depth_reached)).toBe(true);
    expect(result.max_depth_reached).toBeGreaterThanOrEqual(0);
  });

  it("op='explain' uses the same reasoning pipeline and tags op='explain'", async () => {
    const result = await executeMillAction(ACTION, {
      op: "explain",
      question: "Why is 5-axis simultaneous preferred for impellers?",
    });
    expect(result.op).toBe("explain");
    expect(result.error).toBe(undefined);
    expect(result.source).toBe("tree_of_thought");
    expect(Array.isArray(result.reasoning_chain)).toBe(true);
  });

  it("op='rank' returns 3 ranked candidates each with score in [0,1]", async () => {
    const result = await executeMillAction(ACTION, {
      op: "rank",
      question: "rank strategies",
      candidates: ["3+2", "5-axis simultaneous", "swarf"],
    });
    expect(result.op).toBe("rank");
    expect(Array.isArray(result.ranked)).toBe(true);
    expect(result.ranked.length).toBe(3);
    for (const r of result.ranked) {
      expect(typeof r.candidate).toBe("string");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
      expect(Number.isInteger(r.rank)).toBe(true);
    }
    // Best is one of the input candidates.
    expect(["3+2", "5-axis simultaneous", "swarf"]).toContain(result.best);
  });

  it("op='rank' with empty candidates[] returns a structured error pointing at candidates", async () => {
    const result = await executeMillAction(ACTION, {
      op: "rank",
      candidates: [],
    });
    expect(result.op).toBe("rank");
    expect(typeof result.error).toBe("string");
    expect(result.error).toMatch(/candidates/);
  });

  it("op='budget' runs withPRISMReasoning under budgetedAIPath and returns reasoning shape", async () => {
    const result = await executeMillAction(ACTION, {
      op: "budget",
      question: "budget probe",
      budget_ms: 500,
    });
    expect(result.op).toBe("budget");
    expect(Array.isArray(result.reasoning_chain)).toBe(true);
    expect(result.reasoning_chain.length).toBeLessThanOrEqual(6);
    expect(typeof result.confidence).toBe("number");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(["legacy", "tree_of_thought"]).toContain(result.source);
  });

  it("unknown op returns a structured 'Unknown op' error (forward-compatibility)", async () => {
    const result = await executeMillAction(ACTION, { op: "totally_unknown" });
    expect(typeof result.error).toBe("string");
    expect(result.error).toMatch(/Unknown op/);
  });

  it("op='reason' with no question still returns a structured response (no exception)", async () => {
    const result = await executeMillAction(ACTION, { op: "reason" });
    expect(result.op).toBe("reason");
    // Either we got a reasoning chain or a documented error — never a thrown exception.
    if (result.error) {
      expect(typeof result.error).toBe("string");
      expect(result.error.length).toBeGreaterThan(0);
    } else {
      expect(Array.isArray(result.reasoning_chain)).toBe(true);
    }
  });

  it("two consecutive rank calls return independent results (no shared mutable state)", async () => {
    const a = await executeMillAction(ACTION, {
      op: "rank",
      candidates: ["alpha", "beta"],
    });
    const b = await executeMillAction(ACTION, {
      op: "rank",
      candidates: ["gamma"],
    });
    expect(a.ranked.length).toBe(2);
    expect(b.ranked.length).toBe(1);
    expect(a.ranked.map((r: { candidate: string }) => r.candidate).sort())
      .toEqual(["alpha", "beta"]);
    expect(b.ranked[0].candidate).toBe("gamma");
  });
});
