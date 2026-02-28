/**
 * REM-MS3: Code Quality & Documentation Cleanup Verification Tests
 *
 * Tests for findings fixed during REM-MS3:
 * - M-011: _physicsActions prefix removed (was misleading)
 * - M-013: ToolpathStrategyRegistry_Part1 verified as imported (not dead)
 * - M-014: EXTENDED_STRATEGIES verified as used by 5 functions (not dead)
 * - M-016: code_sandbox renamed to code_reasoning
 * - M-017: web_research renamed to knowledge_lookup
 * - M-018: hook_trigger status changed from "executed" to "simulated"
 * - M-032: Hook count already 220 (fixed in MS7)
 * - M-033: Cadence count — no stale "40" found
 * - M-034: Param normalization already on thread + toolpath dispatchers
 */
import { describe, it, expect } from "vitest";

describe("M-011: physicsActions prefix fixed", () => {
  it("no underscore-prefixed physicsActions in calcDispatcher", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/calcDispatcher.ts", "utf-8");
    expect(src).not.toContain("_physicsActions");
    expect(src).toContain("physicsActions");
  });
});

describe("M-013: ToolpathStrategyRegistry_Part1 is imported", () => {
  it("Part1 imported by registries/index.ts", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/registries/index.ts", "utf-8");
    expect(src).toContain("ToolpathStrategyRegistry_Part1");
  });
});

describe("M-014: EXTENDED_STRATEGIES is used", () => {
  it("EXTENDED_STRATEGIES referenced in ToolpathStrategyRegistry", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/registries/ToolpathStrategyRegistry.ts", "utf-8");
    const matches = src.match(/EXTENDED_STRATEGIES/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(5);
  });
});

describe("M-016/M-017: Manus action renames", () => {
  it("code_sandbox renamed to code_reasoning", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/manusDispatcher.ts", "utf-8");
    expect(src).not.toContain('"code_sandbox"');
    expect(src).toContain('"code_reasoning"');
  });

  it("web_research renamed to knowledge_lookup", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/manusDispatcher.ts", "utf-8");
    expect(src).not.toContain('"web_research"');
    expect(src).toContain('"knowledge_lookup"');
  });
});

describe("M-018: hook_trigger returns simulated status", () => {
  it("hook_trigger reports simulated, not executed", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/manusDispatcher.ts", "utf-8");
    expect(src).toContain('status: "simulated"');
    expect(src).not.toContain('status: "executed"');
  });
});

describe("M-032: Hook count documentation", () => {
  it("hooks/index.ts shows 220 hooks", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/hooks/index.ts", "utf-8");
    expect(src).toContain("220 hooks");
  });
});

describe("M-034: Param normalization on thread + toolpath", () => {
  it("threadDispatcher has normalizeParams", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/threadDispatcher.ts", "utf-8");
    expect(src).toContain("normalizeParams");
  });
  it("toolpathDispatcher has normalizeParams", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/tools/dispatchers/toolpathDispatcher.ts", "utf-8");
    expect(src).toContain("normalizeParams");
  });
});
