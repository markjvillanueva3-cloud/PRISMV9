import { describe, it, expect } from "vitest";
import { PromptCompressionEngine } from "../engines/PromptCompressionEngine.js";

describe("PromptCompressionEngine", () => {
  const engine = new PromptCompressionEngine();

  describe("compress", () => {
    it("removes filler phrases", () => {
      const result = engine.compress("Please could you find the configuration file and make sure to check it");
      expect(result.compressed).not.toContain("Please");
      expect(result.compressed).not.toContain("could you");
      expect(result.compressed).not.toContain("make sure to");
      expect(result.techniques).toContain("filler-removal");
    });

    it("collapses whitespace", () => {
      const result = engine.compress("find   the   file   in   the   directory");
      expect(result.compressed).not.toContain("  ");
      expect(result.techniques).toContain("whitespace-collapse");
    });

    it("strips markdown formatting", () => {
      const result = engine.compress("## Header\n**bold text** and `code` here\n```typescript\nconst x = 1;\n```");
      expect(result.compressed).not.toContain("##");
      expect(result.compressed).not.toContain("**");
      expect(result.techniques).toContain("markdown-strip");
    });

    it("abbreviates common terms", () => {
      const result = engine.compress("Check the configuration in the repository documentation for the application environment parameters");
      expect(result.compressed).toContain("config");
      expect(result.compressed).toContain("repo");
      expect(result.compressed).toContain("docs");
      expect(result.techniques).toContain("abbreviation");
    });

    it("deduplicates sentences", () => {
      const result = engine.compress("Find the file. Check the code. Find the file. Review it.");
      expect(result.techniques).toContain("dedup-sentences");
    });

    it("calculates savings", () => {
      const long = "I need you to please find the configuration file in the repository and make sure to check the documentation for the application parameters";
      const result = engine.compress(long);
      expect(result.savings).toBeGreaterThan(0);
      expect(result.savingsPercent).toBeGreaterThan(10);
    });

    it("returns unchanged for short input", () => {
      const result = engine.compress("fix bug");
      expect(result.compressed).toBe("fix bug");
      expect(result.savings).toBe(0);
    });
  });

  describe("isWorthCompressing", () => {
    it("returns false for short prompts", () => {
      expect(engine.isWorthCompressing("short")).toBe(false);
    });

    it("returns true for long prompts", () => {
      expect(engine.isWorthCompressing("a".repeat(250))).toBe(true);
    });
  });

  describe("oneLiner", () => {
    it("reports compression potential", () => {
      const prompt = "I need you to please find the configuration in the repository documentation for the application environment parameters and make sure to verify everything is correct in the implementation of the function that handles the authentication flow";
      const line = engine.oneLiner(prompt);
      expect(line).toContain("→");
      expect(line).toContain("saved via");
    });

    it("reports too short", () => {
      expect(engine.oneLiner("hi")).toBe("Too short to compress");
    });
  });
});
