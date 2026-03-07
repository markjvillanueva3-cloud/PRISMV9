import { describe, it, expect } from "vitest";
import { HookRuleMatcherEngine } from "../engines/HookRuleMatcherEngine.js";
import type { HookRule } from "../engines/HookRuleMatcherEngine.js";

describe("HookRuleMatcherEngine", () => {
  const makeEngine = () => {
    const engine = new HookRuleMatcherEngine();
    engine.loadRules([
      { name: "block-env", type: "block", event: "PreToolUse", tool: "Read", condition: 'file_path ends with ".env"', message: "Blocked .env" },
      { name: "warn-large", type: "warn", event: "PreToolUse", tool: "Read", condition: 'file_path contains "catalog"', message: "Large catalog" },
      { name: "block-sleep", type: "block", event: "PreToolUse", tool: "Bash", condition: 'command matches "^sleep"', message: "No sleep" },
      { name: "autofire-calc", type: "autofire", event: "UserMessage", condition: "message matches calc", message: "Route to /calc" },
    ]);
    return engine;
  };

  describe("match", () => {
    it("matches file_path endsWith", () => {
      const engine = makeEngine();
      const matches = engine.match("Read", { file_path: "config/.env" });
      expect(matches.length).toBe(1);
      expect(matches[0].action).toBe("block");
    });

    it("matches file_path contains", () => {
      const engine = makeEngine();
      const matches = engine.match("Read", { file_path: "src/data/catalog.ts" });
      expect(matches.some(m => m.action === "warn")).toBe(true);
    });

    it("matches command regex", () => {
      const engine = makeEngine();
      const matches = engine.match("Bash", { command: "sleep 5" });
      expect(matches.length).toBe(1);
      expect(matches[0].action).toBe("block");
    });

    it("returns empty for non-matching", () => {
      const engine = makeEngine();
      const matches = engine.match("Read", { file_path: "src/index.ts" });
      expect(matches.length).toBe(0);
    });

    it("skips non-PreToolUse rules", () => {
      const engine = makeEngine();
      const matches = engine.match("Read", { file_path: "calc" });
      // autofire rule shouldn't match since it's UserMessage event
      expect(matches.length).toBe(0);
    });
  });

  describe("willBlock", () => {
    it("returns true for blocked calls", () => {
      const engine = makeEngine();
      expect(engine.willBlock("Read", { file_path: ".env" })).toBe(true);
    });

    it("returns false for allowed calls", () => {
      const engine = makeEngine();
      expect(engine.willBlock("Read", { file_path: "index.ts" })).toBe(false);
    });
  });

  describe("getWarnings", () => {
    it("returns warning messages", () => {
      const engine = makeEngine();
      const warnings = engine.getWarnings("Read", { file_path: "data/catalog.ts" });
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("catalog");
    });
  });

  describe("rulesForTool", () => {
    it("returns rules for specific tool", () => {
      const engine = makeEngine();
      const rules = engine.rulesForTool("Read");
      expect(rules.length).toBe(3); // 2 Read-specific + 1 with no tool (matches all)
    });
  });

  describe("counts", () => {
    it("counts by type", () => {
      const engine = makeEngine();
      const c = engine.counts();
      expect(c.block).toBe(2);
      expect(c.warn).toBe(1);
      expect(c.autofire).toBe(1);
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const engine = makeEngine();
      const line = engine.oneLiner();
      expect(line).toContain("4 rules");
    });
  });
});
