/**
 * ToolCallHistogramEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-HISTOGRAM wiring-gate test.
 *
 * Asserts ToolCallHistogramEngine is reachable via prism_dev:tool_call_histogram
 * (op-discriminator pattern) and that every one of the 6 engine methods
 * round-trips through the dispatcher case block.
 *
 * Pattern mirror: U-WIRE-TOOL-CALL-THROTTLE / U-WIRE-TOOL-CALL-DEDUP /
 * U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (sibling token-efficiency wires). Same
 * lessons: schema 'op' field is z.enum (NOT z.string); the dispatcher imports
 * the singleton (NOT `new ToolCallHistogramEngine()` — would defeat the
 * cross-call cost log); source-grep is scoped to the case block by
 * `case "tool_call_histogram":` + the `// ── Skill Inlining` end-anchor.
 *
 * Anti-regression: ACTIONS-enum membership, schema enum vs string, singleton-
 * not-class, per-op fail-loud, real-behavior record/report/format/window.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { toolCallHistogramEngine, ToolCallHistogramEngine } from "../engines/ToolCallHistogramEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

// Scope source-grep to JUST the tool_call_histogram case block. Unscoped grep
// over the 9.5k-line file false-WIRED matches sibling cases (tool_call_record /
// _analyze / _reset / _throttle / _dedup / _batch_optimize all share the
// "tool_call_*" prefix). Same lesson as U-ECHO-AUDIT-ACTIONMAP.
const TCH_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "tool_call_histogram":');
  if (start === -1) return "";
  // End-anchor: the Skill Inlining divider that immediately follows the
  // WIRE-UNWIRED-MS0 tool_call_* cluster in the dispatcher switch.
  const dividerIdx = DISPATCHER_SRC.indexOf("// ── Skill Inlining", start);
  return dividerIdx === -1 ? DISPATCHER_SRC.slice(start) : DISPATCHER_SRC.slice(start, dividerIdx);
})();

describe("ToolCallHistogramEngine — dispatcher wiring gate", () => {
  beforeEach(() => {
    // Module-singleton — clear state to prevent cross-test bleed.
    toolCallHistogramEngine.reset();
  });

  // ── ACTIONS-enum membership ──────────────────────────────────────────
  it("ACTIONS enum contains 'tool_call_histogram'", () => {
    // Closes the array: `"tool_call_histogram"] as const;` is unique in the
    // file (tool_call_batch_optimize now has a trailing comma, not the
    // `] as const;` terminator).
    expect(DISPATCHER_SRC).toContain('"tool_call_histogram"] as const;');
  });

  // ── Schema registration ──────────────────────────────────────────────
  it("ACTION_DEV_SCHEMAS exports a 'tool_call_histogram' Zod schema", () => {
    expect(ACTION_DEV_SCHEMAS).toHaveProperty("tool_call_histogram");
    expect(typeof ACTION_DEV_SCHEMAS.tool_call_histogram.parse).toBe("function");
  });

  it("schema enforces the 6-value 'op' z.enum (not z.string)", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_histogram;
    expect(() => sch.parse({ op: "record", tool: "Read", tokens: 100 })).not.toThrow();
    expect(() => sch.parse({ op: "report" })).not.toThrow();
    expect(() => sch.parse({ op: "format" })).not.toThrow();
    expect(() => sch.parse({ op: "oneliner" })).not.toThrow();
    expect(() => sch.parse({ op: "window", minutes: 10 })).not.toThrow();
    expect(() => sch.parse({ op: "reset" })).not.toThrow();
    // z.enum (not z.string) — rejects unknown op
    expect(() => sch.parse({ op: "invalid_op" })).toThrow();
  });

  it("schema enforces field types (tokens/max_tools/minutes)", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_histogram;
    // tokens must be non-negative
    expect(() => sch.parse({ op: "record", tool: "X", tokens: -1 })).toThrow();
    // max_tools must be a positive integer
    expect(() => sch.parse({ op: "format", max_tools: 0 })).toThrow();
    expect(() => sch.parse({ op: "format", max_tools: -3 })).toThrow();
    expect(() => sch.parse({ op: "format", max_tools: 2.5 })).toThrow();
    // minutes must be positive
    expect(() => sch.parse({ op: "window", minutes: 0 })).toThrow();
    expect(() => sch.parse({ op: "window", minutes: -5 })).toThrow();
    // valid combinations pass
    expect(() => sch.parse({ op: "record", tool: "X", tokens: 0 })).not.toThrow();
    expect(() => sch.parse({ op: "format", max_tools: 5 })).not.toThrow();
    expect(() => sch.parse({ op: "window", minutes: 30 })).not.toThrow();
  });

  // ── Case-block presence + per-op routing (scoped source-grep) ────────
  it("dispatcher case 'tool_call_histogram' exists with all 6 inner ops", () => {
    expect(TCH_CASE_BLOCK).not.toBe("");
    expect(TCH_CASE_BLOCK).toContain('case "record":');
    expect(TCH_CASE_BLOCK).toContain('case "report":');
    expect(TCH_CASE_BLOCK).toContain('case "format":');
    expect(TCH_CASE_BLOCK).toContain('case "oneliner":');
    expect(TCH_CASE_BLOCK).toContain('case "window":');
    expect(TCH_CASE_BLOCK).toContain('case "reset":');
  });

  it("dispatcher case lazy-imports the singleton (not the class)", () => {
    // Singleton-pattern preservation: a regression switching to `new
    // ToolCallHistogramEngine()` per dispatch call would silently start a
    // fresh cost log each invocation — the histogram would always reflect
    // one call instead of the session-wide distribution.
    expect(TCH_CASE_BLOCK).toContain('await import("../../engines/ToolCallHistogramEngine.js")');
    expect(TCH_CASE_BLOCK).toContain("{ toolCallHistogramEngine }");
    expect(TCH_CASE_BLOCK).not.toContain("new ToolCallHistogramEngine(");
  });

  it("dispatcher case fails loud on missing per-op params", () => {
    // R12 invariant: every op with required args has a fail-loud `result =
    // { error: ... }` arm. Anti-regression: a refactor passing undefined to
    // record() would silently push a junk record.
    expect(TCH_CASE_BLOCK).toContain('error: "record requires {tool, tokens}"');
    expect(TCH_CASE_BLOCK).toContain('error: "window requires {minutes}"');
    expect(TCH_CASE_BLOCK).toContain('error: `unknown tool_call_histogram op:');
  });

  // ── Real-behavior round-trip — every engine method actually fires ────
  it("record() + report() round-trip — distribution reflects recorded calls", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 1000);
    e.record("Grep", 3000);
    const r = e.report();
    expect(r.totalCalls).toBe(2);
    expect(r.totalTokens).toBe(4000);
    // Sorted by totalTokens desc — Grep first.
    expect(r.tools[0].tool).toBe("Grep");
    expect(r.tools[1].tool).toBe("Read");
  });

  it("report() computes percent + topConsumer correctly", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 1000);
    e.record("Grep", 3000);
    const r = e.report();
    expect(r.topConsumer).toBe("Grep");
    expect(r.topPercent).toBe(75); // 3000/4000
    const read = r.tools.find(t => t.tool === "Read")!;
    expect(read.percent).toBe(25); // 1000/4000
  });

  it("report() aggregates multiple calls to the same tool", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Bash", 200);
    e.record("Bash", 600);
    const r = e.report();
    expect(r.tools).toHaveLength(1);
    expect(r.tools[0].calls).toBe(2);
    expect(r.tools[0].totalTokens).toBe(800);
    expect(r.tools[0].avgTokens).toBe(400);
  });

  it("report() returns empty-state shape with no records", () => {
    const e = new ToolCallHistogramEngine();
    const r = e.report();
    expect(r.tools).toHaveLength(0);
    expect(r.totalCalls).toBe(0);
    expect(r.totalTokens).toBe(0);
    expect(r.topConsumer).toBe("none");
    expect(r.topPercent).toBe(0);
  });

  it("format() renders a text histogram with ASCII bars", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 1000);
    e.record("Grep", 3000);
    const text = e.format();
    expect(text).toContain("Tool Usage:");
    expect(text).toContain("Grep");
    expect(text).toContain("Read");
    expect(text).toMatch(/[█░]/); // ASCII bar glyphs
  });

  it("format() respects the maxTools limit and reports the remainder", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 100);
    e.record("Grep", 200);
    e.record("Bash", 300);
    const text = e.format(1);
    // Only the top tool (Bash) is shown; the other 2 are summarized.
    expect(text).toContain("Bash");
    expect(text).toContain("... and 2 more tools");
  });

  it("format() returns the empty-state string with no records", () => {
    const e = new ToolCallHistogramEngine();
    expect(e.format()).toBe("No tool calls recorded");
  });

  it("oneLiner() reflects engine state", () => {
    const e = new ToolCallHistogramEngine();
    expect(e.oneLiner()).toBe("No calls");
    e.record("Edit", 500);
    expect(e.oneLiner()).toMatch(/1 calls/);
    expect(e.oneLiner()).toContain("Edit:");
  });

  it("window() returns the ToolCallRecord[] inside the look-back window", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 100);
    e.record("Grep", 200);
    // Fresh records always fall inside a generous 60-minute window.
    const win = e.window(60);
    expect(Array.isArray(win)).toBe(true);
    expect(win).toHaveLength(2);
    for (const rec of win) {
      expect(typeof rec.tool).toBe("string");
      expect(typeof rec.tokens).toBe("number");
      expect(typeof rec.timestamp).toBe("number");
    }
  });

  it("window() excludes records older than the cutoff", () => {
    // Exclusion-path coverage: the inclusion test above passes even if the
    // filter predicate is inverted. White-box backdate the first record's
    // timestamp (the only field window() filters on) to 10 minutes ago — a
    // 5-minute window MUST then drop it. This is the test that fails if
    // engine `r.timestamp >= cutoff` ever regresses to `<=`.
    const e = new ToolCallHistogramEngine();
    e.record("OldTool", 100);
    e.record("NewTool", 200);
    const recs = (e as unknown as {
      records: { tool: string; timestamp: number; tokens: number }[];
    }).records;
    recs[0].timestamp = Date.now() - 10 * 60_000;
    const win = e.window(5);
    expect(win).toHaveLength(1);
    expect(win[0].tool).toBe("NewTool");
  });

  it("reset() clears the cost log", () => {
    const e = new ToolCallHistogramEngine();
    e.record("Read", 1000);
    e.record("Grep", 2000);
    expect(e.report().totalCalls).toBe(2);
    e.reset();
    const r = e.report();
    expect(r.totalCalls).toBe(0);
    expect(r.totalTokens).toBe(0);
    expect(r.tools).toHaveLength(0);
  });

  it("singleton round-trips through the same module instance", () => {
    // The dispatcher imports `toolCallHistogramEngine` (the singleton). A
    // record() then report() on the singleton must see the same log — this
    // is the cross-dispatch-call persistence the wiring depends on.
    toolCallHistogramEngine.record("Webfetch", 1200);
    expect(toolCallHistogramEngine.report().totalCalls).toBe(1);
    expect(toolCallHistogramEngine.report().topConsumer).toBe("Webfetch");
  });
});
