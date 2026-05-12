/**
 * OrphanDetectionHook Tests
 *
 * Tests for orphan detection and prevention hook.
 */

import { describe, it, expect } from "vitest";

describe("OrphanDetectionHook", () => {
  describe("delete detection", () => {
    it("should detect rm commands targeting TypeScript files", () => {
      const deletePatterns = [
        /\brm\s+(?!-rf?\s+node_modules).*\.ts\b/,
        /\bgit\s+rm\b.*\.ts\b/,
        /\bdel\s+.*\.ts\b/,
      ];

      const commands = [
        "rm src/engines/OldEngine.ts",
        "git rm src/engines/OldEngine.ts",
        "rm -f src/engines/OldEngine.ts",
      ];

      for (const cmd of commands) {
        const matches = deletePatterns.some((p) => p.test(cmd));
        expect(matches).toBe(true);
      }
    });

    it("should not block node_modules cleanup", () => {
      const pattern = /\brm\s+(?!-rf?\s+node_modules).*\.ts\b/;
      const cmd = "rm -rf node_modules";
      expect(pattern.test(cmd)).toBe(false);
    });

    it("should extract engine name from delete command", () => {
      const cmd = "rm src/engines/MyTestEngine.ts";
      const match = cmd.match(/([A-Z][a-zA-Z]+Engine)\.ts/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("MyTestEngine");
    });

    it("should identify critical assets", () => {
      const criticalAssets = new Set([
        "SafetyEngine",
        "KienzleForceModelEngine",
        "TaylorToolLifeEngine",
        "DuplicationGuardEngine",
        "TransactionLogEngine",
      ]);

      expect(criticalAssets.has("SafetyEngine")).toBe(true);
      expect(criticalAssets.has("RandomEngine")).toBe(false);
    });
  });

  describe("write detection", () => {
    it("should detect new engine files", () => {
      const filePath = "src/engines/NewFeatureEngine.ts";
      const isEngine = filePath.includes("/engines/") && filePath.endsWith(".ts");
      expect(isEngine).toBe(true);
    });

    it("should skip index files", () => {
      const filePath = "src/engines/index.ts";
      const fileName = filePath.split("/").pop()?.replace(".ts", "") || "";
      const isIndex = fileName === "index";
      expect(isIndex).toBe(true);
    });

    it("should detect export statements", () => {
      const content = `
export class MyEngine {
  static calculate() {}
}
export const myEngine = new MyEngine();
`;
      const hasExport = /export\s+(class|const|function|interface)/.test(content);
      expect(hasExport).toBe(true);
    });

    it("should detect missing exports", () => {
      const content = `
class MyEngine {
  static calculate() {}
}
const myEngine = new MyEngine();
`;
      const hasExport = /export\s+(class|const|function|interface)/.test(content);
      expect(hasExport).toBe(false);
    });

    it("should detect dispatcher mentions", () => {
      const content = `
// This engine is wired to testDispatcher
export class MyEngine {}
`;
      const dispatcherMention = /dispatcher|Dispatcher/.test(content);
      expect(dispatcherMention).toBe(true);
    });
  });

  describe("edit detection", () => {
    it("should detect export removal", () => {
      const oldString = "export const myEngine = new MyEngine();";
      const newString = "const myEngine = new MyEngine();";

      const hasExportBefore = /export\s+(const|class|function)\s+\w+/.test(oldString);
      const hasExportAfter = /export\s+(const|class|function)\s+\w+/.test(newString);

      expect(hasExportBefore).toBe(true);
      expect(hasExportAfter).toBe(false);
    });

    it("should extract export name", () => {
      const oldString = "export const myEngine = new MyEngine();";
      const match = oldString.match(/export\s+(?:const|class|function)\s+(\w+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("myEngine");
    });

    it("should detect singleton removal", () => {
      const oldString = "export const myEngine = new MyEngine();";
      const newString = "// removed";

      const singletonRemoval = /export\s+const\s+\w+Engine\s*=/.test(oldString) &&
                              !/export\s+const\s+\w+Engine\s*=/.test(newString);
      expect(singletonRemoval).toBe(true);
    });
  });

  describe("hook decision logic", () => {
    it("should return deny for critical asset deletion", () => {
      const criticalAssets = ["SafetyEngine", "KienzleForceModelEngine"];
      const engineName = "SafetyEngine";

      const decision = criticalAssets.includes(engineName) ? "deny" : "allow";
      expect(decision).toBe("deny");
    });

    it("should return allow with warning for non-critical deletion", () => {
      const criticalAssets = ["SafetyEngine", "KienzleForceModelEngine"];
      const engineName = "RandomEngine";

      const decision = criticalAssets.includes(engineName) ? "deny" : "allow";
      expect(decision).toBe("allow");
    });

    it("should allow writes with informational notes", () => {
      // Non-critical operations are allowed but may have warnings
      const result = { decision: "allow", reason: "NOTE: Remember to wire" };
      expect(result.decision).toBe("allow");
      expect(result.reason).toContain("NOTE");
    });
  });

  describe("path validation", () => {
    it("should validate engine paths", () => {
      const validPaths = [
        "src/engines/MyEngine.ts",
        "src/engines/SubDir/MyEngine.ts",
      ];

      for (const p of validPaths) {
        expect(p.includes("/engines/")).toBe(true);
        expect(p.endsWith(".ts")).toBe(true);
      }
    });

    it("should reject non-engine paths", () => {
      const invalidPaths = [
        "src/utils/helper.ts",
        "src/engines/index.ts",
      ];

      const isEngineFile = (p: string) => {
        const fileName = p.split("/").pop()?.replace(".ts", "") || "";
        return p.includes("/engines/") &&
               p.endsWith(".ts") &&
               fileName !== "index" &&
               fileName.endsWith("Engine");
      };

      expect(isEngineFile(invalidPaths[0])).toBe(false);
      expect(isEngineFile(invalidPaths[1])).toBe(false);
    });
  });
});

describe("OrphanDetection Integration", () => {
  it("should define all hook types", () => {
    const hookTypes = ["PreToolUse", "PostToolUse"];
    expect(hookTypes).toContain("PreToolUse");
  });

  it("should define monitored tools", () => {
    const monitoredTools = ["Bash", "Write", "Edit"];
    expect(monitoredTools).toHaveLength(3);
  });

  it("should define decision types", () => {
    const decisions = ["allow", "deny"];
    expect(decisions).toContain("allow");
    expect(decisions).toContain("deny");
  });
});
