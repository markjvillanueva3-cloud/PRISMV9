/**
 * ToolCallThrottleEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-THROTTLE wiring-gate test.
 *
 * Asserts ToolCallThrottleEngine is reachable via prism_dev:tool_call_throttle
 * (op-discriminator pattern) and that every one of the 5 engine methods
 * round-trips through the dispatcher case block.
 *
 * Pattern mirror: U-WIRE-WASTE-DETECTOR (sibling wire shipped iter-1). Same
 * lessons: schema 'op' field is z.enum (NOT z.string); dispatcher imports the
 * singleton (NOT new ToolCallThrottleEngine() — would defeat rate-limit state);
 * source-grep is scoped to the case block by 'case "tool_call_throttle":' +
 * '// ── Skill Inlining' end-anchor.
 *
 * Anti-regression: ACTIONS-enum membership, schema enum vs string, singleton-
 * not-class, per-op fail-loud, real-behavior rate-limit + cooldown + burst.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { toolCallThrottleEngine, ToolCallThrottleEngine } from "../engines/ToolCallThrottleEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

// Scope source-grep to JUST the tool_call_throttle case block. Unscoped grep
// over the 9.5k-line file false-WIRED matches sibling cases (tool_call_record /
// _analyze / _reset all use "tool_call_*" prefix). Same lesson as
// U-ECHO-AUDIT-ACTIONMAP / U-WIRE-WASTE-DETECTOR.
const TCT_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "tool_call_throttle":');
  if (start === -1) return "";
  // End-anchor: the Skill Inlining divider that follows the WIRE-UNWIRED-MS0
  // cluster (waste_detector + tool_call_throttle both inserted just before it).
  const dividerIdx = DISPATCHER_SRC.indexOf("// ── Skill Inlining", start);
  return dividerIdx === -1 ? DISPATCHER_SRC.slice(start) : DISPATCHER_SRC.slice(start, dividerIdx);
})();

describe("ToolCallThrottleEngine — dispatcher wiring gate", () => {
  beforeEach(() => {
    // Module-singleton — clear state to prevent cross-test bleed.
    toolCallThrottleEngine.reset();
  });

  // ── ACTIONS-enum membership ──────────────────────────────────────────
  it("ACTIONS enum contains 'tool_call_throttle'", () => {
    // Closes the array: `"tool_call_throttle"] as const;` is unique in the file
    // (waste_detector now has a trailing comma, not the `] as const;` terminator).
    expect(DISPATCHER_SRC).toContain('"tool_call_throttle"] as const;');
  });

  // ── Schema registration ──────────────────────────────────────────────
  it("ACTION_DEV_SCHEMAS exports a 'tool_call_throttle' Zod schema", () => {
    expect(ACTION_DEV_SCHEMAS).toHaveProperty("tool_call_throttle");
    expect(typeof ACTION_DEV_SCHEMAS.tool_call_throttle.parse).toBe("function");
  });

  it("schema enforces the 5-value 'op' z.enum (not z.string)", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_throttle;
    expect(() => sch.parse({ op: "check", tool: "Read" })).not.toThrow();
    expect(() => sch.parse({ op: "set_rule", tool: "Read", max_per_minute: 30 })).not.toThrow();
    expect(() => sch.parse({ op: "stats" })).not.toThrow();
    expect(() => sch.parse({ op: "oneliner" })).not.toThrow();
    expect(() => sch.parse({ op: "reset" })).not.toThrow();
    // z.enum (not z.string) — rejects unknown op
    expect(() => sch.parse({ op: "invalid_op" })).toThrow();
  });

  it("schema enforces set_rule field types (integer/positive)", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_throttle;
    // max_per_minute must be positive integer
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: 0 })).toThrow();
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: -5 })).toThrow();
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: 1.5 })).toThrow();
    // burst_limit must be non-negative integer
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: 10, burst_limit: -1 })).toThrow();
    // cooldown_ms must be non-negative
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: 10, cooldown_ms: -1 })).toThrow();
    // valid combination passes
    expect(() => sch.parse({ op: "set_rule", tool: "X", max_per_minute: 10, burst_limit: 3, cooldown_ms: 5000 })).not.toThrow();
  });

  // ── Case-block presence + per-op routing (scoped source-grep) ────────
  it("dispatcher case 'tool_call_throttle' exists with all 5 inner ops", () => {
    expect(TCT_CASE_BLOCK).not.toBe("");
    expect(TCT_CASE_BLOCK).toContain('case "check":');
    expect(TCT_CASE_BLOCK).toContain('case "set_rule":');
    expect(TCT_CASE_BLOCK).toContain('case "stats":');
    expect(TCT_CASE_BLOCK).toContain('case "oneliner":');
    expect(TCT_CASE_BLOCK).toContain('case "reset":');
  });

  it("dispatcher case lazy-imports the singleton (not the class)", () => {
    // Singleton-pattern preservation: a regression switching to `new
    // ToolCallThrottleEngine()` per dispatch call would silently start a fresh
    // call-log each invocation — rate limits would never trigger because the
    // log would always be empty.
    expect(TCT_CASE_BLOCK).toContain('await import("../../engines/ToolCallThrottleEngine.js")');
    expect(TCT_CASE_BLOCK).toContain("{ toolCallThrottleEngine }");
    expect(TCT_CASE_BLOCK).not.toContain("new ToolCallThrottleEngine(");
  });

  it("dispatcher case fails loud on missing per-op params", () => {
    // R12 invariant: every op with required args has a fail-loud `result =
    // { error: ... }` arm. Anti-regression: a future refactor passing
    // undefined to setRule() would silently set a bogus rule.
    expect(TCT_CASE_BLOCK).toContain('error: "check requires {tool}"');
    expect(TCT_CASE_BLOCK).toContain('error: "set_rule requires {tool, max_per_minute, burst_limit?, cooldown_ms?}"');
    expect(TCT_CASE_BLOCK).toContain('error: `unknown tool_call_throttle op:');
  });

  // ── Real-behavior round-trip — every engine method actually fires ────
  it("check() allows first call to an unrestricted tool", () => {
    const r = toolCallThrottleEngine.check("UnitTestTool_Allowed");
    expect(r.allowed).toBe(true);
    expect(r.callsInWindow).toBe(1);
  });

  it("check() throttles when burst-limit exceeded", () => {
    // Use a FRESH engine instance — the singleton has DEFAULT_RULES seeded
    // with real tools. Use a unique tool name so we test the default-rule
    // path (burst_limit=4 from DEFAULT_RULES `*`).
    const e = new ToolCallThrottleEngine();
    // Default rule: maxPerMinute=12, burstLimit=4, cooldownMs=5000.
    // First 4 burst-window calls allowed; 5th hits the burst gate.
    for (let i = 0; i < 4; i++) {
      const r = e.check("UnitTestTool_Burst");
      expect(r.allowed).toBe(true);
    }
    const r5 = e.check("UnitTestTool_Burst");
    expect(r5.allowed).toBe(false);
    expect(r5.reason).toMatch(/burst limit/);
  });

  it("check() throttles when rate-limit exceeded", () => {
    const e = new ToolCallThrottleEngine();
    // Lower the burst gate to clear the way for the rate-limit gate.
    // maxPerMinute=12 by default; raise burstLimit above 12 so it never trips
    // first, then make 12 calls within the minute window and verify #13 fails
    // by rate-limit (not burst).
    e.setRule("UnitTestTool_Rate", 12, 100, 5000);
    for (let i = 0; i < 12; i++) {
      expect(e.check("UnitTestTool_Rate").allowed).toBe(true);
    }
    const r13 = e.check("UnitTestTool_Rate");
    expect(r13.allowed).toBe(false);
    expect(r13.reason).toMatch(/exceeded.*12.*min/);
  });

  it("check() enforces cooldown after rate-limit trip", () => {
    const e = new ToolCallThrottleEngine();
    e.setRule("UnitTestTool_Cool", 2, 100, 30000); // 2/min, big burst, 30s cooldown
    expect(e.check("UnitTestTool_Cool").allowed).toBe(true);
    expect(e.check("UnitTestTool_Cool").allowed).toBe(true);
    const r3 = e.check("UnitTestTool_Cool"); // triggers cooldown
    expect(r3.allowed).toBe(false);
    // Next call must still be denied (cooldown active)
    const r4 = e.check("UnitTestTool_Cool");
    expect(r4.allowed).toBe(false);
    expect(r4.cooldownRemainingMs).toBeGreaterThan(0);
  });

  it("setRule() registers a custom rule", () => {
    const e = new ToolCallThrottleEngine();
    e.setRule("UnitTestTool_Custom", 1, 1, 1000);
    expect(e.check("UnitTestTool_Custom").allowed).toBe(true);
    // Second call exceeds maxPerMinute=1 immediately.
    expect(e.check("UnitTestTool_Custom").allowed).toBe(false);
  });

  it("setRule() applies default burst/cooldown when omitted", () => {
    // Engine signature: setRule(tool, maxPerMinute, burstLimit=3, cooldownMs=5000).
    // Dispatcher passes params.burst_limit / params.cooldown_ms — when omitted
    // (undefined), the engine's default param values kick in.
    const e = new ToolCallThrottleEngine();
    e.setRule("UnitTestTool_Defaults", 10);
    // burstLimit defaults to 3. So first 3 in burst-window succeed; 4th trips.
    for (let i = 0; i < 3; i++) {
      expect(e.check("UnitTestTool_Defaults").allowed).toBe(true);
    }
    expect(e.check("UnitTestTool_Defaults").allowed).toBe(false);
  });

  it("stats() returns the ThrottleStats shape", () => {
    const e = new ToolCallThrottleEngine();
    e.check("UnitTestTool_StatsA");
    e.check("UnitTestTool_StatsA");
    e.check("UnitTestTool_StatsB");
    const s = e.stats();
    expect(s.totalChecks).toBe(3);
    expect(s.totalThrottled).toBe(0);
    expect(s.throttleRate).toBe(0);
    expect(Array.isArray(s.perTool)).toBe(true);
    expect(s.perTool.length).toBeGreaterThanOrEqual(2);
  });

  it("oneLiner() reflects engine state", () => {
    const e = new ToolCallThrottleEngine();
    expect(e.oneLiner()).toMatch(/0 checks.*0 throttled.*0%/);
    e.check("UnitTestTool_OneLiner");
    expect(e.oneLiner()).toMatch(/1 checks/);
  });

  it("reset() clears state (cooldowns, log, counters)", () => {
    const e = new ToolCallThrottleEngine();
    e.setRule("UnitTestTool_R", 1, 1, 60000);
    e.check("UnitTestTool_R");
    e.check("UnitTestTool_R"); // trips
    expect(e.stats().totalChecks).toBeGreaterThan(0);
    expect(e.stats().totalThrottled).toBeGreaterThan(0);

    e.reset();
    expect(e.stats().totalChecks).toBe(0);
    expect(e.stats().totalThrottled).toBe(0);
    // After reset, the same tool should pass again (cooldown cleared).
    expect(e.check("UnitTestTool_R").allowed).toBe(true);
  });

  it("default rules ship for common tools (Read/Grep/Edit/Bash/Agent)", () => {
    // The engine seeds DEFAULT_RULES for 8 common tools. Source-grep the
    // engine file to confirm — this is an anti-regression for someone who
    // refactors the defaults out without updating the wiring contract.
    const ENGINE_SRC = fs.readFileSync(
      path.resolve(__dirname, "..", "engines", "ToolCallThrottleEngine.ts"),
      "utf8",
    );
    expect(ENGINE_SRC).toContain('tool: "Read"');
    expect(ENGINE_SRC).toContain('tool: "Grep"');
    expect(ENGINE_SRC).toContain('tool: "Edit"');
    expect(ENGINE_SRC).toContain('tool: "Bash"');
    expect(ENGINE_SRC).toContain('tool: "Agent"');
  });
});
