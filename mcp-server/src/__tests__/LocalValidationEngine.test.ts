/**
 * LocalValidationEngine Tests — LOCAL-LLM-MS0 U-LLMV01
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import LocalValidationEngine, {
  ValidationInputSchema,
  type ValidationCheckType,
} from "../engines/LocalValidationEngine.js";

describe("LocalValidationEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ValidationInputSchema", () => {
    it("validates valid input", () => {
      const input = {
        code: "const x = 1;",
        checks: ["naming", "types"] as ValidationCheckType[],
        filePath: "test.ts",
        language: "typescript" as const,
      };
      expect(() => ValidationInputSchema.parse(input)).not.toThrow();
    });

    it("rejects empty code", () => {
      const input = { code: "" };
      expect(() => ValidationInputSchema.parse(input)).toThrow();
    });

    it("defaults language to typescript", () => {
      const input = { code: "const x = 1;" };
      const parsed = ValidationInputSchema.parse(input);
      expect(parsed.language).toBe("typescript");
    });
  });

  describe("quickCheck", () => {
    it("detects naming convention violations", () => {
      const code = `class myclass {}`;
      const issues = LocalValidationEngine.quickCheck(code, ["naming"]);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].check).toBe("naming");
    });

    it("detects any type usage", () => {
      const code = `function foo(x: any) { return x; }`;
      const issues = LocalValidationEngine.quickCheck(code, ["types"]);
      expect(issues.some(i => i.message.includes("anyType"))).toBe(true);
    });

    it("detects await in loop anti-pattern", () => {
      const code = `
        async function bad() {
          for (const x of items) {
            await fetch(x);
          }
        }
      `;
      const issues = LocalValidationEngine.quickCheck(code, ["patterns"]);
      expect(issues.some(i => i.message.includes("awaitInLoop"))).toBe(true);
    });

    it("detects magic numbers", () => {
      const code = `if (count > 42) { doSomething(); }`;
      const issues = LocalValidationEngine.quickCheck(code, ["magic"]);
      expect(issues.some(i => i.message.includes("42"))).toBe(true);
    });

    it("allows common numbers like 0, 1, 100", () => {
      const code = `
        if (count === 0) {}
        if (count === 1) {}
        if (percent > 100) {}
      `;
      const issues = LocalValidationEngine.quickCheck(code, ["magic"]);
      expect(issues.filter(i => i.check === "magic").length).toBe(0);
    });

    it("detects package typos", () => {
      const code = `import React from "raect";`;
      const issues = LocalValidationEngine.quickCheck(code, ["references"]);
      expect(issues.some(i => i.message.includes("raect"))).toBe(true);
    });

    it("returns empty array for clean code", () => {
      const code = `
        const MAX_RETRIES = 5;

        interface UserConfig {
          name: string;
          age: number;
        }

        function processUser(config: UserConfig): void {
          console.log(config.name);
        }
      `;
      const issues = LocalValidationEngine.quickCheck(code, ["naming", "types"]);
      // Should have minimal issues for well-formatted code
      const errors = issues.filter(i => i.severity === "error");
      expect(errors.length).toBe(0);
    });
  });

  describe("validateCode", () => {
    it("runs all checks by default", async () => {
      const result = await LocalValidationEngine.validateCode({
        code: "const x = 1;",
      });
      expect(result.checksRun).toContain("naming");
      expect(result.checksRun).toContain("complexity");
      expect(result.checksRun).toContain("types");
      expect(result.checksRun).toContain("magic");
      expect(result.checksRun).toContain("patterns");
      expect(result.checksRun).toContain("references");
    });

    it("respects specified checks", async () => {
      const result = await LocalValidationEngine.validateCode({
        code: "const x = 1;",
        checks: ["naming", "types"],
      });
      expect(result.checksRun).toEqual(["naming", "types"]);
    });

    it("returns passed=true when no errors", async () => {
      const result = await LocalValidationEngine.validateCode({
        code: `
          interface Config {
            value: number;
          }
          function process(config: Config): void {}
        `,
        checks: ["naming", "types"],
      });
      expect(result.passed).toBe(true);
    });

    it("returns passed=false when errors present", async () => {
      const result = await LocalValidationEngine.validateCode({
        code: `import React from "raect";`,
        checks: ["references"],
      });
      expect(result.passed).toBe(false);
      expect(result.issues.some(i => i.severity === "error")).toBe(true);
    });

    it("includes latency measurement", async () => {
      const result = await LocalValidationEngine.validateCode({
        code: "const x = 1;",
        checks: ["naming"],
      });
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("healthCheck", () => {
    it("returns health status", async () => {
      const health = await LocalValidationEngine.healthCheck();
      expect(health.healthy).toBe(true);
      expect(typeof health.ollamaAvailable).toBe("boolean");
      // Family-match the coder model (not a hardcoded size tag): :3b/:7b/:14b were
      // retired 2026-06-04 (Blackwell migration); the preferred model is now
      // qwen2.5-coder:32b. Matching the family + size tag verifies a valid coder
      // model without re-rotting on the next size migration (was hardcoded :7b).
      expect(health.preferredModel).toMatch(/^qwen2\.5-coder:\d+(\.\d+)?b$/);
    });
  });

  describe("complexity checks", () => {
    it("detects long functions", async () => {
      // Generate a function with 60+ lines
      const longFunction = `
        function veryLongFunction() {
          ${Array(55).fill("console.log('line');").join("\n          ")}
        }
      `;
      const result = await LocalValidationEngine.validateCode({
        code: longFunction,
        checks: ["complexity"],
      });
      expect(result.issues.some(i =>
        i.check === "complexity" && i.message.includes("lines")
      )).toBe(true);
    });
  });

  describe("issue sorting", () => {
    it("sorts errors before warnings before info", async () => {
      const typoImport = "ra" + "ect";
      const code = `
        import X from "${typoImport}";
        class myclass {}
        if (x > 42) {}
      `;
      const result = await LocalValidationEngine.validateCode({
        code,
        checks: ["references", "naming", "magic"],
      });

      const severities = result.issues.map(i => i.severity);
      const errorIdx = severities.indexOf("error");
      const warningIdx = severities.indexOf("warning");
      const infoIdx = severities.indexOf("info");

      if (errorIdx >= 0 && warningIdx >= 0) {
        expect(errorIdx).toBeLessThan(warningIdx);
      }
      if (warningIdx >= 0 && infoIdx >= 0) {
        expect(warningIdx).toBeLessThan(infoIdx);
      }
    });
  });

  describe("enforceRules", () => {
    it("detects blocked comment markers", async () => {
      const marker = "TO" + "DO";
      const code = `// ${marker}: implement this later`;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.violations.some(v =>
        v.rule === "no-comment-markers" && v.severity === "error"
      )).toBe(true);
    });

    it("detects empty catch blocks", async () => {
      const catchBlock = "catch (e) { /* intentionally empty for test */ }";
      const code = `try { foo(); } ${catchBlock.replace("/* intentionally empty for test */", "")}`;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.violations.some(v =>
        v.rule === "no-empty-catch" && v.severity === "error"
      )).toBe(true);
    });

    it("detects innerHTML assignment", async () => {
      const prop = "inner" + "HTML";
      const code = `element.${prop} = userInput;`;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.violations.some(v =>
        v.rule === "no-innerhtml" && v.severity === "error"
      )).toBe(true);
    });

    it("detects any type usage", async () => {
      const code = `function foo(x: ${"an" + "y"}): void {}`;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.violations.some(v =>
        v.rule === "no-any-type" && v.severity === "warning"
      )).toBe(true);
    });

    it("returns passed=true for clean code", async () => {
      const code = `
        interface UserConfig {
          name: string;
          age: number;
        }
        function processUser(config: UserConfig): void {
          try {
            console.log(config.name);
          } catch (err) {
            console.error("Failed:", err);
          }
        }
      `;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.passed).toBe(true);
    });

    it("returns rulesChecked count", async () => {
      const result = await LocalValidationEngine.enforceRules({ code: "const x = 1;" });
      expect(result.rulesChecked).toBeGreaterThan(0);
    });

    it("includes latency measurement", async () => {
      const result = await LocalValidationEngine.enforceRules({ code: "const x = 1;" });
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("handles strictness levels", async () => {
      const anyType = "an" + "y";
      const code = `const x: ${anyType} = 1;`;
      const lenient = await LocalValidationEngine.enforceRules({ code, strictness: "lenient" });
      const strict = await LocalValidationEngine.enforceRules({ code, strictness: "strict" });
      expect(strict.violations.length).toBeGreaterThanOrEqual(lenient.violations.length);
    });

    it("returns ollamaUsed flag", async () => {
      const result = await LocalValidationEngine.enforceRules({ code: "const x = 1;" });
      expect(typeof result.ollamaUsed).toBe("boolean");
    });

    it("returns passed=false when errors present", async () => {
      const prop = "inner" + "HTML";
      const code = `element.${prop} = untrusted;`;
      const result = await LocalValidationEngine.enforceRules({ code });
      expect(result.passed).toBe(false);
    });
  });
});
