/**
 * Tests for CodeGenerationIntegrityEngine
 * ========================================
 * Validates the code generation integrity checking system.
 */

import { describe, it, expect } from "vitest";
import {
  codeGenerationIntegrityEngine,
  CodeGenerationIntegrityEngine,
} from "../../engines/CodeGenerationIntegrityEngine.js";

describe("CodeGenerationIntegrityEngine", () => {
  describe("validateBeforeWrite", () => {
    it("accepts valid TypeScript engine code", () => {
      const validCode = `/**
 * TestEngine — Sample engine
 * @module engines/TestEngine
 */

import { log } from "../utils/Logger.js";

export interface TestInput {
  value: number;
}

export class TestEngine {
  process(input: TestInput): number {
    return input.value * 2;
  }
}

export const testEngine = new TestEngine();
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/TestEngine.ts",
        content: validCode,
        fileType: "engine",
      });

      expect(result.valid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty content", () => {
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/EmptyEngine.ts",
        content: "",
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "EMPTY_FILE")).toBe(true);
    });

    it("rejects binary data", () => {
      // Simulate binary/zlib compressed content
      const binaryContent = "\x00\x01\x02\x03Binary garbage data";
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/CorruptEngine.ts",
        content: binaryContent,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "BINARY_DATA" || e.type === "INVALID_START")).toBe(true);
    });

    it("rejects source map contamination", () => {
      const contaminatedCode = `/**
 * TestEngine
 */
export class TestEngine {}

//# sourceMappingURL=TestEngine.js.map
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/TestEngine.ts",
        content: contaminatedCode,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "SOURCEMAP_LEAK")).toBe(true);
    });

    it("rejects declaration file leakage", () => {
      const declContent = `export declare class TestEngine {
  process(input: any): number;
}
//# sourceMappingURL=TestEngine.d.ts.map
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/TestEngine.ts",
        content: declContent,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "DECLARATION_LEAK" || e.type === "SOURCEMAP_LEAK")).toBe(true);
    });

    it("rejects mixed engine content", () => {
      const mixedContent = `/**
 * FirstEngine
 * @module engines/FirstEngine
 */
export class FirstEngine {
  run() { return 1; }
}

/**
 * SecondEngine — DIFFERENT ENGINE!
 * @module engines/SecondEngine
 */
export class SecondEngine {
  run() { return 2; }
}
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/FirstEngine.ts",
        content: mixedContent,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "MIXED_CONTENT")).toBe(true);
    });

    it("rejects truncated files", () => {
      const truncatedCode = `/**
 * TestEngine
 */
export class TestEngine {
  constructor() {
    this.init();
  }

  init() {
    if (true) {
      while (true) {
        for (let i = 0; i < 10; i++) {
          if (x) {
            switch (y) {
              case 1: {
                try {
                  // Many missing closing braces
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/TestEngine.ts",
        content: truncatedCode,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "TRUNCATED")).toBe(true);
    });

    it("rejects invalid TypeScript start", () => {
      const invalidStart = `randomGarbageAtStart
// This should be the first line
export class TestEngine {}
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "src/engines/TestEngine.ts",
        content: invalidStart,
        fileType: "engine",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.type === "INVALID_START")).toBe(true);
    });

    it("accepts various valid TypeScript starts", () => {
      const validStarts = [
        `/** JSDoc comment */\nexport class Test {}`,
        `// Single line comment\nexport class Test {}`,
        `import { x } from "y";\nexport class Test {}`,
        `export const x = 1;`,
        `declare module "x" {}`,
        `const x = 1;`,
        `interface X {}`,
        `type X = string;`,
        `function test() {}`,
        `class Test {}`,
        `enum Status {}`,
        `async function test() {}`,
      ];

      for (const code of validStarts) {
        const result = codeGenerationIntegrityEngine.validateBeforeWrite({
          filepath: "test.ts",
          content: code,
        });
        expect(result.errors.filter(e => e.type === "INVALID_START")).toHaveLength(0);
      }
    });

    it("calculates reasonable metrics", () => {
      const code = `/**
 * TestEngine
 */
import { log } from "../utils/Logger.js";
import { z } from "zod";

export interface TestInput {
  value: number;
}

export class TestEngine {
  private data: number[] = [];

  process(input: TestInput): number {
    return input.value * 2;
  }

  compute = () => {
    return this.data.length;
  };
}

export const testEngine = new TestEngine();
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "test.ts",
        content: code,
      });

      expect(result.metrics.lineCount).toBeGreaterThan(10);
      expect(result.metrics.importCount).toBe(2);
      expect(result.metrics.classCount).toBe(1);
      expect(result.metrics.binaryBytePercent).toBeLessThan(0.01);
    });
  });

  describe("quickValidate", () => {
    it("quickly detects empty content", () => {
      const result = codeGenerationIntegrityEngine.quickValidate("");
      expect(result.likely_valid).toBe(false);
      expect(result.issues).toContain("Empty content");
    });

    it("quickly detects binary signatures", () => {
      const result = codeGenerationIntegrityEngine.quickValidate("\x00Binary");
      expect(result.likely_valid).toBe(false);
      expect(result.issues).toContain("Binary signature detected");
    });

    it("quickly detects invalid starts", () => {
      const result = codeGenerationIntegrityEngine.quickValidate("garbage\nexport class X {}");
      expect(result.likely_valid).toBe(false);
      expect(result.issues.some(i => i.includes("start"))).toBe(true);
    });

    it("quickly accepts valid code", () => {
      const result = codeGenerationIntegrityEngine.quickValidate("/** Test */\nexport class X {}");
      expect(result.likely_valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("getStatistics", () => {
    it("tracks validation history", () => {
      // Run a few validations
      codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "test1.ts",
        content: "/** Valid */\nexport const x = 1;",
      });
      codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "test2.ts",
        content: "",  // Invalid
      });

      const stats = codeGenerationIntegrityEngine.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.passed).toBeGreaterThan(0);
      expect(typeof stats.passRate).toBe("number");
    });
  });

  describe("autoFix", () => {
    it("removes sourcemap comments when autoFix is true", () => {
      const contaminatedCode = `/** Test */
export class Test {}

//# sourceMappingURL=test.js.map
`;
      const result = codeGenerationIntegrityEngine.validateBeforeWrite({
        filepath: "test.ts",
        content: contaminatedCode,
        autoFix: true,
      });

      expect(result.autoFixed).toBeDefined();
      expect(result.autoFixed).not.toContain("sourceMappingURL");
    });
  });
});

describe("CodeGenerationIntegrityEngine instance", () => {
  it("exports singleton", () => {
    expect(codeGenerationIntegrityEngine).toBeInstanceOf(CodeGenerationIntegrityEngine);
  });

  it("can create new instances", () => {
    const engine = new CodeGenerationIntegrityEngine();
    expect(engine).toBeInstanceOf(CodeGenerationIntegrityEngine);
  });
});
