/**
 * ToolCallPipelineEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-PIPELINE wiring-gate test.
 *
 * Asserts ToolCallPipelineEngine is reachable via prism_dev:tool_call_pipeline
 * (op-discriminator pattern) and that the 7 surfaced engine methods round-trip
 * through the dispatcher case block.
 *
 * Pattern mirror: U-WIRE-WASTE-DETECTOR / U-WIRE-TOOL-CALL-THROTTLE /
 * U-WIRE-TOOL-CALL-DEDUP. Same lessons: op = z.enum (NOT z.string); singleton
 * (NOT new); case-scoped source-grep; positional-agnostic ACTIONS membership.
 *
 * Scope note: recordExecution() is intentionally NOT wired — its PipelineResult
 * argument carries Map<> fields that do not round-trip a JSON dispatcher
 * boundary. This test verifies the 7 surfaced ops and asserts recordExecution
 * is absent from the case block (so a future regression that adds it without
 * Map-marshalling is caught).
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { toolCallPipelineEngine, ToolCallPipelineEngine } from "../engines/ToolCallPipelineEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

const TCP_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "tool_call_pipeline":');
  if (start === -1) return "";
  const dividerIdx = DISPATCHER_SRC.indexOf("// ── Skill Inlining", start);
  return dividerIdx === -1 ? DISPATCHER_SRC.slice(start) : DISPATCHER_SRC.slice(start, dividerIdx);
})();

describe("ToolCallPipelineEngine — dispatcher wiring gate", () => {
  beforeEach(() => {
    toolCallPipelineEngine.reset();
  });

  it("ACTIONS enum contains 'tool_call_pipeline' (positional-agnostic)", () => {
    // Membership-check, not terminator-anchor — peers append sibling wires and
    // move the `] as const;` terminator (lesson from U-WIRE-TOOL-CALL-DEDUP).
    expect(DISPATCHER_SRC).toMatch(/"tool_call_pipeline"(,|\] as const;)/);
  });

  it("ACTION_DEV_SCHEMAS exports a 'tool_call_pipeline' Zod schema", () => {
    expect(ACTION_DEV_SCHEMAS).toHaveProperty("tool_call_pipeline");
    expect(typeof ACTION_DEV_SCHEMAS.tool_call_pipeline.parse).toBe("function");
  });

  it("schema 'op' enum is exactly the 7-string contract", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_pipeline;
    expect(sch.parse({ op: "list" }).op).toBe("list");
    expect(sch.parse({ op: "get", name: "x" }).op).toBe("get");
    expect(sch.parse({ op: "dry_run", name: "x" }).op).toBe("dry_run");
    expect(sch.parse({ op: "stats" }).op).toBe("stats");
    expect(sch.parse({ op: "oneliner" }).op).toBe("oneliner");
    expect(sch.parse({ op: "reset" }).op).toBe("reset");
    expect(sch.parse({ op: "register", name: "p", steps: [] }).op).toBe("register");
    // Negative: recordExecution is deliberately NOT a valid op.
    expect(() => sch.parse({ op: "record_execution" })).toThrow();
    expect(() => sch.parse({ op: "invalid" })).toThrow();
    expect(() => sch.parse({})).toThrow();
  });

  it("schema 'steps' accepts declarative {name,tool,params} without closures", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_pipeline;
    const r = sch.parse({
      op: "register",
      name: "custom",
      steps: [
        { name: "s1", tool: "Read", params: { file: "a.ts" } },
        { name: "s2", tool: "Grep", params: { pattern: "foo" } },
      ],
      description: "two-step",
    });
    expect(r.steps).toHaveLength(2);
    expect(r.steps![0].tool).toBe("Read");
    // A step missing the required tool field must be rejected.
    expect(() => sch.parse({ op: "register", name: "x", steps: [{ name: "s", params: {} }] })).toThrow();
  });

  it("dispatcher case 'tool_call_pipeline' branches into 7 inner ops", () => {
    expect(TCP_CASE_BLOCK).not.toBe("");
    expect(TCP_CASE_BLOCK).toContain('case "register":');
    expect(TCP_CASE_BLOCK).toContain('case "get":');
    expect(TCP_CASE_BLOCK).toContain('case "list":');
    expect(TCP_CASE_BLOCK).toContain('case "dry_run":');
    expect(TCP_CASE_BLOCK).toContain('case "stats":');
    expect(TCP_CASE_BLOCK).toContain('case "oneliner":');
    expect(TCP_CASE_BLOCK).toContain('case "reset":');
    // Outer break — no fall-through into the Skill Inlining section.
    expect(TCP_CASE_BLOCK).toMatch(/break;\s*}\s*$/);
  });

  it("dispatcher case does NOT surface recordExecution (Map<> non-marshalling)", () => {
    // recordExecution takes a PipelineResult with Map<> fields. It is
    // intentionally excluded — verify no case arm and no engine call for it.
    expect(TCP_CASE_BLOCK).not.toContain("recordExecution");
    expect(TCP_CASE_BLOCK).not.toContain('"record_execution"');
  });

  it("dispatcher case binds the singleton (not class instantiation)", () => {
    expect(TCP_CASE_BLOCK).toContain('await import("../../engines/ToolCallPipelineEngine.js")');
    expect(TCP_CASE_BLOCK).toContain("{ toolCallPipelineEngine }");
    expect(TCP_CASE_BLOCK).not.toMatch(/new\s+ToolCallPipelineEngine\s*\(/);
  });

  it("dispatcher case fails loud on missing required params", () => {
    expect(TCP_CASE_BLOCK).toContain('error: "register requires {name, steps: [{name, tool, params}], description?}"');
    expect(TCP_CASE_BLOCK).toContain('error: "get requires {name}"');
    expect(TCP_CASE_BLOCK).toContain('error: "dry_run requires {name, params?}"');
    expect(TCP_CASE_BLOCK).toContain('pipeline not found:');
  });

  // ── Real-behavior round-trip ─────────────────────────────────────────
  it("list() returns the 3 built-in pipelines on a fresh engine", () => {
    const e = new ToolCallPipelineEngine();
    const names = e.list();
    expect(names).toContain("read-edit-verify");
    expect(names).toContain("search-then-read");
    expect(names).toContain("glob-then-grep");
    expect(names).toHaveLength(3);
  });

  it("get() returns a built-in pipeline definition with its steps", () => {
    const e = new ToolCallPipelineEngine();
    const def = e.get("search-then-read");
    expect(def!.name).toBe("search-then-read");
    expect(def!.steps).toHaveLength(2);
    expect(def!.steps[0].tool).toBe("Grep");
    expect(def!.steps[1].tool).toBe("Read");
  });

  it("get() returns undefined for an unknown pipeline", () => {
    const e = new ToolCallPipelineEngine();
    expect(e.get("does-not-exist")).toBeUndefined();
  });

  it("register() adds a custom pipeline retrievable via get/list", () => {
    const e = new ToolCallPipelineEngine();
    e.register({
      name: "my-pipeline",
      steps: [{ name: "step1", tool: "Bash", params: { command: "ls" } }],
      description: "test",
    });
    expect(e.list()).toContain("my-pipeline");
    const def = e.get("my-pipeline");
    expect(def!.steps[0].tool).toBe("Bash");
    expect(def!.description).toBe("test");
  });

  it("dryRun() estimates token cost from per-tool costs", () => {
    const e = new ToolCallPipelineEngine();
    // search-then-read = Grep(200) + Read(500) = 700
    const plan = e.dryRun("search-then-read");
    expect(plan!.estimatedTokens).toBe(700);
    expect(plan!.steps).toEqual(["search (Grep)", "read (Read)"]);
  });

  it("dryRun() returns undefined for an unknown pipeline", () => {
    const e = new ToolCallPipelineEngine();
    expect(e.dryRun("nonexistent")).toBeUndefined();
  });

  it("dryRun() falls back to 300 tokens for an unknown tool", () => {
    const e = new ToolCallPipelineEngine();
    e.register({ name: "exotic", steps: [{ name: "s", tool: "UnknownTool", params: {} }] });
    const plan = e.dryRun("exotic");
    expect(plan!.estimatedTokens).toBe(300);
  });

  it("stats() returns zeros on a fresh engine (no executions)", () => {
    const e = new ToolCallPipelineEngine();
    const s = e.stats();
    expect(s.totalExecutions).toBe(0);
    expect(s.successRate).toBe(0);
    expect(s.avgTokens).toBe(0);
    expect(s.topPipelines).toEqual([]);
  });

  it("oneLiner() reports registered count on a fresh engine", () => {
    const e = new ToolCallPipelineEngine();
    expect(e.oneLiner()).toMatch(/Pipelines: 3 registered, 0 executed/);
    e.register({ name: "extra", steps: [{ name: "s", tool: "Read", params: {} }] });
    expect(e.oneLiner()).toMatch(/Pipelines: 4 registered/);
  });

  it("reset() clears the execution log but keeps registered pipelines", () => {
    const e = new ToolCallPipelineEngine();
    e.recordExecution("search-then-read", {
      success: true, stepsRun: 2, stepsSkipped: 0, totalTokens: 700,
      durationMs: 10, results: new Map(), errors: [],
    });
    expect(e.stats().totalExecutions).toBe(1);
    e.reset();
    expect(e.stats().totalExecutions).toBe(0);
    // Registered (built-in) pipelines survive reset — only the log is cleared.
    expect(e.list()).toHaveLength(3);
  });

  it("stats() aggregates execution outcomes after recordExecution", () => {
    // recordExecution is not dispatcher-surfaced, but the engine method still
    // drives stats() which IS surfaced — exercise the real aggregation path.
    const e = new ToolCallPipelineEngine();
    e.recordExecution("glob-then-grep", {
      success: true, stepsRun: 2, stepsSkipped: 0, totalTokens: 300,
      durationMs: 5, results: new Map(), errors: [],
    });
    e.recordExecution("glob-then-grep", {
      success: false, stepsRun: 1, stepsSkipped: 1, totalTokens: 100,
      durationMs: 3, results: new Map(), errors: ["step failed"],
    });
    const s = e.stats();
    expect(s.totalExecutions).toBe(2);
    expect(s.successRate).toBe(50);
    expect(s.avgTokens).toBe(200);
    expect(s.topPipelines[0]).toEqual({ name: "glob-then-grep", count: 2 });
  });
});
