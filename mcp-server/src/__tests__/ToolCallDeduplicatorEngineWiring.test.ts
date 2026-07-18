/**
 * ToolCallDeduplicatorEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-DEDUP wiring-gate test.
 *
 * Asserts ToolCallDeduplicatorEngine is reachable via prism_dev:tool_call_dedup
 * (op-discriminator pattern) and that all 4 engine methods round-trip through
 * the dispatcher case block.
 *
 * Pattern mirror: U-WIRE-WASTE-DETECTOR + U-WIRE-TOOL-CALL-THROTTLE.
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { toolCallDeduplicatorEngine, ToolCallDeduplicatorEngine } from "../engines/ToolCallDeduplicatorEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");

const TCD_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "tool_call_dedup":');
  if (start === -1) return "";
  const dividerIdx = DISPATCHER_SRC.indexOf("// ── Skill Inlining", start);
  return dividerIdx === -1 ? DISPATCHER_SRC.slice(start) : DISPATCHER_SRC.slice(start, dividerIdx);
})();

describe("ToolCallDeduplicatorEngine — dispatcher wiring gate", () => {
  beforeEach(() => {
    toolCallDeduplicatorEngine.reset();
  });

  it("ACTIONS enum contains 'tool_call_dedup' (positional-agnostic membership)", () => {
    // Anchor-to-terminator (`...] as const;`) would brittle-break the moment a
    // peer chat appends a sibling wire — exactly the race that happened this
    // session: U-WIRE-TOOL-CALL-BATCH-OPTIMIZE landed after this unit was first
    // tested, moving the terminator. Membership-check instead — covers both
    // mid-array (`"tool_call_dedup",`) and tail (`"tool_call_dedup"] as const;`).
    expect(DISPATCHER_SRC).toMatch(/"tool_call_dedup"(,|\] as const;)/);
  });

  it("ACTION_DEV_SCHEMAS exports a 'tool_call_dedup' Zod schema", () => {
    expect(ACTION_DEV_SCHEMAS).toHaveProperty("tool_call_dedup");
    expect(typeof ACTION_DEV_SCHEMAS.tool_call_dedup.parse).toBe("function");
  });

  it("schema 'op' enum exactly equals the 4-string contract", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_dedup;
    // Positive: every contract op must parse.
    expect(sch.parse({ op: "check", tool: "Read" }).op).toBe("check");
    expect(sch.parse({ op: "record", tool: "Read", params: { a: 1 } }).op).toBe("record");
    expect(sch.parse({ op: "stats" }).op).toBe("stats");
    expect(sch.parse({ op: "reset" }).op).toBe("reset");
    // Negative: must reject sibling-engine ops (set_rule belongs to throttle).
    expect(() => sch.parse({ op: "set_rule" })).toThrow();
    // Negative: must reject unknown.
    expect(() => sch.parse({ op: "invalid_op" })).toThrow();
    // Negative: missing op fails (it's required, not optional).
    expect(() => sch.parse({})).toThrow();
  });

  it("schema accepts arbitrary nested params shapes (z.record over unknown)", () => {
    const sch = ACTION_DEV_SCHEMAS.tool_call_dedup;
    const r = sch.parse({
      op: "check",
      tool: "Bash",
      params: { command: "ls -la", description: "list", env: { PATH: "/usr/bin" }, args: [1, 2, 3] },
    });
    expect(r.params).toEqual({
      command: "ls -la",
      description: "list",
      env: { PATH: "/usr/bin" },
      args: [1, 2, 3],
    });
  });

  it("dispatcher case 'tool_call_dedup' branches into exactly 4 inner ops", () => {
    expect(TCD_CASE_BLOCK).not.toBe("");
    expect(TCD_CASE_BLOCK).toContain('case "check":');
    expect(TCD_CASE_BLOCK).toContain('case "record":');
    expect(TCD_CASE_BLOCK).toContain('case "stats":');
    expect(TCD_CASE_BLOCK).toContain('case "reset":');
    // Verify the OUTER break exists at the end of the case (no fall-through).
    // The trailing 'break;' immediately precedes the closing brace + final
    // newline + the comment divider in the slice.
    expect(TCD_CASE_BLOCK).toMatch(/break;\s*}\s*$/);
  });

  it("dispatcher case binds the singleton (not class instantiation)", () => {
    expect(TCD_CASE_BLOCK).toContain('await import("../../engines/ToolCallDeduplicatorEngine.js")');
    expect(TCD_CASE_BLOCK).toContain("{ toolCallDeduplicatorEngine }");
    expect(TCD_CASE_BLOCK).not.toMatch(/new\s+ToolCallDeduplicatorEngine\s*\(/);
  });

  it("dispatcher case fails loud on missing tool param", () => {
    expect(TCD_CASE_BLOCK).toContain('error: "check requires {tool, params?}"');
    expect(TCD_CASE_BLOCK).toContain('error: "record requires {tool, params?}"');
    expect(TCD_CASE_BLOCK).toContain('error: `unknown tool_call_dedup op:');
  });

  it("dispatcher defaults params to {} when omitted (avoids hashCall NaN)", () => {
    // Engine signature requires Record<string, unknown>. Passing undefined
    // through `JSON.stringify(undefined)` returns the string "undefined" then
    // `Object.keys(undefined)` THROWS. Defaulting to {} keeps hashCall safe.
    expect(TCD_CASE_BLOCK).toContain("params.params ?? {}");
    // Count the safeguard: it must appear in BOTH check and record (2 sites).
    const matches = TCD_CASE_BLOCK.match(/params\.params \?\? \{\}/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  // ── Real-behavior round-trip ─────────────────────────────────────────
  it("check() returns isDuplicate=false with no diagnostic fields on first call", () => {
    const e = new ToolCallDeduplicatorEngine();
    const r = e.check("Read", { file: "a.ts" });
    expect(r.isDuplicate).toBe(false);
    // Sibling fields are absent (the engine omits them in the false-path).
    // Assert by key-membership rather than value-undef so the assertion fails
    // loud if a future refactor adds noisy default fields.
    expect(Object.keys(r).sort()).toEqual(["isDuplicate"]);
  });

  it("check()+record()+check() flags exact duplicate with non-empty reason", () => {
    const e = new ToolCallDeduplicatorEngine();
    expect(e.check("Read", { file: "x.ts" }).isDuplicate).toBe(false);
    e.record("Read", { file: "x.ts" });
    const r2 = e.check("Read", { file: "x.ts" });
    expect(r2.isDuplicate).toBe(true);
    // Real-behavior assertions:
    expect(typeof r2.originalTimestamp).toBe("number");
    expect(r2.originalTimestamp).toBeGreaterThan(Date.now() - 5000);
    expect(r2.age).toBeGreaterThanOrEqual(0);
    expect(r2.age).toBeLessThan(5);
    expect(r2.reason).toMatch(/^Exact duplicate of Read call from \d+s ago$/);
  });

  it("hash is order-independent over param keys", () => {
    const e = new ToolCallDeduplicatorEngine();
    e.record("Bash", { command: "ls", description: "list", env: "prod" });
    // Same keys, different insertion order → hashCall sorts keys, so hash matches.
    const r = e.check("Bash", { env: "prod", description: "list", command: "ls" });
    expect(r.isDuplicate).toBe(true);
    expect(r.reason).toContain("Exact duplicate of Bash");
  });

  it("different tools with same params do NOT collide", () => {
    const e = new ToolCallDeduplicatorEngine();
    e.record("Read", { file: "x.ts" });
    const r = e.check("Edit", { file: "x.ts" });
    expect(r.isDuplicate).toBe(false);
  });

  it("near-duplicate matches at >0.9 similarity for params strings >= 50 chars", () => {
    const e = new ToolCallDeduplicatorEngine();
    // similarity() requires the JSON strings >= 50 chars (short strings need
    // exact-only match). Build a payload that crosses that threshold and
    // differs by exactly 1 char in the body — Levenshtein-like position-match
    // similarity computes >0.9.
    const longA = "x".repeat(80);
    const longB = "x".repeat(79) + "y"; // 79/81 ≈ 0.975 → > 0.9
    e.record("WebFetch", { url: "https://example.com/a", body: longA });
    const r = e.check("WebFetch", { url: "https://example.com/a", body: longB });
    expect(r.isDuplicate).toBe(true);
    expect(r.reason).toMatch(/Near-duplicate of WebFetch/);
    expect(r.reason).toContain(">90% similar");
  });

  it("stats() returns the exact ToolCallDeduplicatorEngine.stats() shape", () => {
    const e = new ToolCallDeduplicatorEngine();
    e.record("Read", { file: "a.ts" });
    e.record("Read", { file: "b.ts" });
    e.record("Grep", { pattern: "foo" });
    const s = e.stats();
    expect(s.totalRecorded).toBe(3);
    expect(s.uniqueTools).toBe(2);
    expect(s.windowSeconds).toBe(120);
  });

  it("reset() clears records AND lifts duplicate flags", () => {
    const e = new ToolCallDeduplicatorEngine();
    e.record("Read", { file: "x.ts" });
    expect(e.check("Read", { file: "x.ts" }).isDuplicate).toBe(true);
    e.reset();
    expect(e.stats().totalRecorded).toBe(0);
    // After reset, the same call no longer flags as duplicate.
    expect(e.check("Read", { file: "x.ts" }).isDuplicate).toBe(false);
  });

  it("constructor windowSeconds default is 120s", () => {
    const e = new ToolCallDeduplicatorEngine();
    expect(e.stats().windowSeconds).toBe(120);
  });

  it("constructor accepts custom window + maxRecords (trim cap)", () => {
    const e = new ToolCallDeduplicatorEngine(60, 50);
    expect(e.stats().windowSeconds).toBe(60);
    // Push 60 records; trim() in record() must cap to 50.
    for (let i = 0; i < 60; i++) {
      e.record("Read", { i });
    }
    expect(e.stats().totalRecorded).toBe(50);
  });
});
