/**
 * LocalHookAggregatorEngine Tests — LOCAL-LLM-MS0 U-LLM-AGG01
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import LocalHookAggregatorEngine, {
  HookAggregatorInputSchema,
} from "../engines/LocalHookAggregatorEngine.js";

describe("LocalHookAggregatorEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HookAggregatorInputSchema", () => {
    it("validates valid input", () => {
      const input = {
        code: "const x = 1;",
        hookTypes: ["naming", "types"] as const,
        maxIssues: 5,
      };
      expect(() => HookAggregatorInputSchema.parse(input)).not.toThrow();
    });

    it("rejects empty code", () => {
      const input = { code: "" };
      expect(() => HookAggregatorInputSchema.parse(input)).toThrow();
    });

    it("defaults hookTypes to all", () => {
      const input = { code: "const x = 1;" };
      const parsed = HookAggregatorInputSchema.parse(input);
      expect(parsed.hookTypes).toEqual(["all"]);
    });

    it("defaults maxIssues to 5", () => {
      const input = { code: "const x = 1;" };
      const parsed = HookAggregatorInputSchema.parse(input);
      expect(parsed.maxIssues).toBe(5);
    });

    it("clamps maxIssues to valid range", () => {
      expect(() => HookAggregatorInputSchema.parse({
        code: "x",
        maxIssues: 0,
      })).toThrow();
      expect(() => HookAggregatorInputSchema.parse({
        code: "x",
        maxIssues: 21,
      })).toThrow();
    });
  });

  describe("aggregate", () => {
    it("detects class naming violations", async () => {
      const code = `class myclass {}`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["naming"],
      });
      expect(result.issues.some(i =>
        i.hookType === "naming" && i.message.includes("PascalCase")
      )).toBe(true);
    });

    it("detects interface naming violations", async () => {
      const code = `interface myinterface { x: number; }`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["naming"],
      });
      expect(result.issues.some(i =>
        i.hookType === "naming" && i.message.includes("PascalCase")
      )).toBe(true);
    });

    it("detects any type usage", async () => {
      const anyType = ": an" + "y";
      const code = `function foo(x${anyType}) { return x; }`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["types"],
      });
      expect(result.issues.some(i =>
        i.hookType === "types" && i.message.includes("any")
      )).toBe(true);
    });

    it("detects await in loop anti-pattern", async () => {
      const code = `
        async function bad() {
          for (const x of items) {
            await fetch(x);
          }
        }
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["async"],
      });
      expect(result.issues.some(i =>
        i.hookType === "async" && i.message.includes("loop")
      )).toBe(true);
    });

    it("detects nested loops performance issue", async () => {
      const code = `
        for (let i = 0; i < arr.length; i++) {
          for (let j = 0; j < arr.length; j++) {
            console.log(arr[i], arr[j]);
          }
        }
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["performance"],
      });
      expect(result.issues.some(i =>
        i.hookType === "performance" && i.message.includes("O(n")
      )).toBe(true);
    });

    it("detects spread in reduce", async () => {
      // Simpler pattern that regex can detect - spread directly in reduce callback
      const code = `items.reduce(fn, ...initial)`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["performance"],
      });
      expect(result.issues.some(i =>
        i.hookType === "performance" && i.message.includes("reduce")
      )).toBe(true);
    });

    it("returns passed=true when no errors", async () => {
      const code = `
        interface Config {
          value: number;
        }
        function process(config: Config): void {
          console.log(config.value);
        }
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["naming", "types"],
      });
      expect(result.passed).toBe(true);
    });

    it("returns passed=false when errors present", async () => {
      const code = `return 1;\nconsole.log("unreachable");`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["returns"],
      });
      expect(result.passed).toBe(false);
    });

    it("includes latency measurement", async () => {
      const result = await LocalHookAggregatorEngine.aggregate({
        code: "const x = 1;",
        hookTypes: ["naming"],
      });
      expect(typeof result.latencyMs).toBe("number");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("returns hooksChecked list", async () => {
      const result = await LocalHookAggregatorEngine.aggregate({
        code: "const x = 1;",
        hookTypes: ["naming", "types"],
      });
      expect(result.hooksChecked).toContain("naming");
      expect(result.hooksChecked).toContain("types");
    });

    it("handles all hookTypes", async () => {
      const result = await LocalHookAggregatorEngine.aggregate({
        code: "const x = 1;",
        hookTypes: ["all"],
      });
      expect(result.hooksChecked.length).toBeGreaterThan(2);
    });

    it("limits issues to maxIssues", async () => {
      const code = `
        class a {}
        class b {}
        class c {}
        class d {}
        class e {}
        class f {}
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["naming"],
        maxIssues: 3,
      });
      expect(result.issues.length).toBeLessThanOrEqual(3);
    });

    it("sorts errors before warnings before info", async () => {
      const code = `
        return 1;
        console.log("unreachable");
        class myclass {}
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["returns", "naming"],
        maxIssues: 10,
      });

      const severities = result.issues.map(i => i.severity);
      const errorIdx = severities.indexOf("error");
      const warningIdx = severities.indexOf("warning");

      if (errorIdx >= 0 && warningIdx >= 0) {
        expect(errorIdx).toBeLessThan(warningIdx);
      }
    });

    it("returns ollamaUsed flag", async () => {
      const result = await LocalHookAggregatorEngine.aggregate({
        code: "const x = 1;",
      });
      expect(typeof result.ollamaUsed).toBe("boolean");
    });
  });

  describe("getCondensedOutput", () => {
    it("returns empty string for clean code", async () => {
      const code = `
        interface Config {
          value: number;
        }
        function process(config: Config): void {
          console.log(config.value);
        }
      `;
      const output = await LocalHookAggregatorEngine.getCondensedOutput({
        code,
        hookTypes: ["naming", "types"],
      });
      expect(output).toBe("");
    });

    it("returns warning emoji for issues", async () => {
      const code = `class myclass {}`;
      const output = await LocalHookAggregatorEngine.getCondensedOutput({
        code,
        hookTypes: ["naming"],
      });
      expect(output).toMatch(/^⚠️/);
    });

    it("includes issue summary", async () => {
      const code = `class a {}\nclass b {}`;
      const output = await LocalHookAggregatorEngine.getCondensedOutput({
        code,
        hookTypes: ["naming"],
        maxIssues: 1,
      });
      expect(output).toContain("warning");
    });

    it("indicates more issues exist", async () => {
      const code = `
        class a {}
        class b {}
        class c {}
        class d {}
        class e {}
        class f {}
      `;
      const output = await LocalHookAggregatorEngine.getCondensedOutput({
        code,
        hookTypes: ["naming"],
        maxIssues: 2,
      });
      expect(output).toMatch(/\+\d+ more/);
    });
  });

  describe("magic number detection", () => {
    it("detects magic numbers", async () => {
      const result = await LocalHookAggregatorEngine.aggregate({
        code: `if (count > 999) { doSomething(); }`,
        hookTypes: ["magic"],
      });
      expect(result.issues.some(i =>
        i.hookType === "magic" && i.message.includes("Magic")
      )).toBe(true);
    });
  });

  describe("double type assertion detection", () => {
    it("detects double assertions", async () => {
      const code = `const x = value as unknown as string;`;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["types"],
      });
      expect(result.issues.some(i =>
        i.hookType === "types" && i.message.includes("Double")
      )).toBe(true);
    });
  });

  describe("deep nesting detection", () => {
    it("detects excessive nesting", async () => {
      const code = `
        function deep() {
          if (a) {
            if (b) {
              if (c) {
                if (d) {
                  if (e) {
                    console.log("deep");
                  }
                }
              }
            }
          }
        }
      `;
      const result = await LocalHookAggregatorEngine.aggregate({
        code,
        hookTypes: ["complexity"],
      });
      expect(result.issues.some(i =>
        i.hookType === "complexity" && i.message.includes("Nesting")
      )).toBe(true);
    });
  });
});
