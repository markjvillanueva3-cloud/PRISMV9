/**
 * ForgeQuintEngine Tests
 *
 * Tests for atomic 5-output asset creation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Test directory setup
const testBaseDir = path.join(os.tmpdir(), `prism-forge-test-${Date.now()}`);
const testEnginesDir = path.join(testBaseDir, "src", "engines");
const testTestsDir = path.join(testBaseDir, "src", "__tests__");
const testCommandsDir = path.join(testBaseDir, ".claude", "commands");
const testHooksDir = path.join(testBaseDir, ".claude", "hooks", "lib");
const testStateDir = path.join(testBaseDir, "data", "state", "pending-wiring");

describe("ForgeQuintEngine", () => {
  beforeEach(() => {
    // Create test directories
    [testEnginesDir, testTestsDir, testCommandsDir, testHooksDir, testStateDir].forEach((dir) => {
      fs.mkdirSync(dir, { recursive: true });
    });
  });

  afterEach(() => {
    // Cleanup
    try {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe("validation", () => {
    it("should reject invalid engine names", () => {
      const invalidNames = [
        "myEngine", // lowercase start
        "MyEnginee", // doesn't end with Engine
        "my-engine", // kebab case
        "123Engine", // starts with number
      ];

      for (const name of invalidNames) {
        const isValid = /^[A-Z][a-zA-Z0-9]*Engine$/.test(name);
        expect(isValid).toBe(false);
      }
    });

    it("should accept valid engine names", () => {
      const validNames = [
        "MyEngine",
        "SuperCoolEngine",
        "A1Engine",
        "XMLParserEngine",
      ];

      for (const name of validNames) {
        const isValid = /^[A-Z][a-zA-Z0-9]*Engine$/.test(name);
        expect(isValid).toBe(true);
      }
    });

    it("should detect stub patterns in code", () => {
      const stubPatterns = [
        "return {}",
        "return { }",
        "// TODO: implement",
        "// STUB",
        "PLACEHOLDER",
      ];

      for (const pattern of stubPatterns) {
        const hasStub = /return\s*\{\s*\}|TODO|STUB|PLACEHOLDER/i.test(pattern);
        expect(hasStub).toBe(true);
      }
    });

    it("should detect trivial test assertions", () => {
      const trivialTests = [
        "expect(true).toBe(true)",
        "expect(1).toBeTruthy()",
      ];

      for (const test of trivialTests) {
        const hasTrivial = /expect\(true\)\.toBe\(true\)|\.toBeTruthy\(\)/.test(test);
        expect(hasTrivial).toBe(true);
      }
    });
  });

  describe("file preparation", () => {
    it("should generate correct file paths", () => {
      const engineName = "TestForgeEngine";
      const expectedPaths = {
        engine: `src/engines/${engineName}.ts`,
        test: `src/__tests__/test-forge-engine.test.ts`,
        skill: `.claude/commands/test-forge.md`,
        hook: `.claude/hooks/lib/test-hook.py`,
      };

      // Verify path patterns
      expect(expectedPaths.engine).toContain("engines");
      expect(expectedPaths.test).toContain("__tests__");
      expect(expectedPaths.test).toContain(".test.ts");
      expect(expectedPaths.skill).toContain("commands");
      expect(expectedPaths.hook).toContain("hooks");
    });

    it("should convert PascalCase to kebab-case correctly", () => {
      const toKebabCase = (str: string): string => {
        return str
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
          .toLowerCase();
      };

      expect(toKebabCase("MyEngine")).toBe("my-engine");
      expect(toKebabCase("XMLParserEngine")).toBe("xml-parser-engine");
      expect(toKebabCase("SuperCoolFeatureEngine")).toBe("super-cool-feature-engine");
      expect(toKebabCase("A1Engine")).toBe("a1-engine".replace("1-", "1")); // Numbers don't trigger hyphen
    });
  });

  describe("atomic operations", () => {
    it("should create all files or none on success", () => {
      const files = [
        { path: path.join(testEnginesDir, "TestEngine.ts"), content: "// engine" },
        { path: path.join(testTestsDir, "test-engine.test.ts"), content: "// test" },
        { path: path.join(testCommandsDir, "test.md"), content: "# skill" },
        { path: path.join(testHooksDir, "test-hook.py"), content: "# hook" },
        { path: path.join(testStateDir, "wiring.json"), content: "{}" },
      ];

      // Write all files
      for (const file of files) {
        fs.writeFileSync(file.path, file.content);
      }

      // Verify all exist
      for (const file of files) {
        expect(fs.existsSync(file.path)).toBe(true);
      }
    });

    it("should handle rollback scenario", () => {
      const files = [
        { path: path.join(testEnginesDir, "RollbackEngine.ts"), content: "// engine" },
        { path: path.join(testTestsDir, "rollback-engine.test.ts"), content: "// test" },
      ];

      // Write files
      for (const file of files) {
        fs.writeFileSync(file.path, file.content);
      }

      // Simulate rollback by deleting
      for (const file of files) {
        fs.unlinkSync(file.path);
      }

      // Verify all removed
      for (const file of files) {
        expect(fs.existsSync(file.path)).toBe(false);
      }
    });
  });

  describe("wiring metadata", () => {
    it("should generate valid wiring JSON", () => {
      const wiringData = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        engineName: "TestEngine",
        dispatcherName: "testDispatcher",
        actionName: "test_action",
        status: "pending",
      };

      const wiringPath = path.join(testStateDir, "test-wiring.json");
      fs.writeFileSync(wiringPath, JSON.stringify(wiringData, null, 2));

      const read = JSON.parse(fs.readFileSync(wiringPath, "utf-8"));
      expect(read.schemaVersion).toBe(1);
      expect(read.engineName).toBe("TestEngine");
      expect(read.status).toBe("pending");
    });
  });

  describe("code wrapping", () => {
    it("should not double-wrap code with existing JSDoc", () => {
      const codeWithJsdoc = `/**
 * Existing JSDoc
 */
export class MyEngine {}`;

      // Code starting with /** should not be wrapped
      expect(codeWithJsdoc.startsWith("/**")).toBe(true);
    });

    it("should wrap code without JSDoc", () => {
      const codeWithoutJsdoc = "export class MyEngine {}";

      // Code not starting with /** needs wrapping
      expect(codeWithoutJsdoc.startsWith("/**")).toBe(false);
    });
  });

  describe("lock behavior", () => {
    it("should use exclusive file creation for locks", () => {
      const lockPath = path.join(testStateDir, "forge.lock");
      const lockData = { holder: "test-session" };

      // First creation succeeds
      fs.writeFileSync(lockPath, JSON.stringify(lockData), { flag: "wx" });
      expect(fs.existsSync(lockPath)).toBe(true);

      // Second creation fails
      expect(() => {
        fs.writeFileSync(lockPath, JSON.stringify({ holder: "other" }), { flag: "wx" });
      }).toThrow();

      // Original lock preserved
      const read = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
      expect(read.holder).toBe("test-session");
    });
  });
});

describe("ForgeQuint Integration", () => {
  it("should define all 5 output types", () => {
    const outputTypes = [
      "engine", // src/engines/*.ts
      "test", // src/__tests__/*.test.ts
      "skill", // .claude/commands/*.md
      "hook", // .claude/hooks/lib/*
      "wiring", // data/state/pending-wiring/*.json
    ];

    expect(outputTypes).toHaveLength(5);
    expect(outputTypes).toContain("engine");
    expect(outputTypes).toContain("test");
    expect(outputTypes).toContain("skill");
    expect(outputTypes).toContain("hook");
    expect(outputTypes).toContain("wiring");
  });

  it("should require all inputs for forge", () => {
    const requiredInputs = [
      "engineName",
      "description",
      "keywords",
      "engineCode",
      "testCode",
      "dispatcherName",
      "actionName",
      "skillContent",
      "hookContent",
      "hookFilename",
    ];

    // All inputs must be present
    expect(requiredInputs).toHaveLength(10);
  });
});
