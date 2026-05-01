import { describe, it, expect } from "vitest";
import { ToolRedirectEngine } from "../engines/ToolRedirectEngine.js";

describe("ToolRedirectEngine", () => {
  const engine = new ToolRedirectEngine();

  describe("Bash redirects", () => {
    it("redirects cat to Read", () => {
      const s = engine.evaluate({ tool: "Bash", params: { command: "cat src/index.ts" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Read");
    });

    it("redirects grep to Grep", () => {
      const s = engine.evaluate({ tool: "Bash", params: { command: "grep -r pattern src/" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Grep");
    });

    it("redirects find to Glob", () => {
      const s = engine.evaluate({ tool: "Bash", params: { command: "find . -name '*.ts'" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Glob");
    });

    it("returns null for non-redirectable bash", () => {
      const s = engine.evaluate({ tool: "Bash", params: { command: "npm run build" } });
      expect(s).toBeNull();
    });
  });

  describe("Agent redirects", () => {
    it("redirects simple file search", () => {
      const s = engine.evaluate({ tool: "Agent", params: { prompt: "find index.ts file" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Glob");
    });

    it("redirects simple grep", () => {
      const s = engine.evaluate({ tool: "Agent", params: { prompt: "search for TODO in src/" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Grep");
    });

    it("does not redirect complex queries", () => {
      const s = engine.evaluate({ tool: "Agent", params: { prompt: "Analyze the architecture of the dispatcher system, identify all action handlers, and suggest optimizations for the routing logic" } });
      expect(s).toBeNull();
    });
  });

  describe("Read redirects", () => {
    it("suggests limit for large files", () => {
      const s = engine.evaluate({ tool: "Read", params: { file_path: "src/engines/index.ts" } });
      expect(s).not.toBeNull();
      expect(s!.reason).toContain("large");
    });

    it("returns null for small files", () => {
      const s = engine.evaluate({ tool: "Read", params: { file_path: "src/utils/helper.ts" } });
      expect(s).toBeNull();
    });

    it("returns null when limit is set", () => {
      const s = engine.evaluate({ tool: "Read", params: { file_path: "src/engines/index.ts", limit: 50 } });
      expect(s).toBeNull();
    });
  });

  describe("Glob redirects", () => {
    it("redirects exact filename to Read", () => {
      const s = engine.evaluate({ tool: "Glob", params: { pattern: "src/engines/FooEngine.ts" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toBe("Read");
    });

    it("returns null for wildcard patterns", () => {
      const s = engine.evaluate({ tool: "Glob", params: { pattern: "src/**/*.ts" } });
      expect(s).toBeNull();
    });
  });

  describe("WebFetch redirects", () => {
    it("redirects doc sites to context7", () => {
      const s = engine.evaluate({ tool: "WebFetch", params: { url: "https://docs.python.org/3/library/os.html" } });
      expect(s).not.toBeNull();
      expect(s!.suggested).toContain("context7");
    });

    it("returns null for non-doc URLs", () => {
      const s = engine.evaluate({ tool: "WebFetch", params: { url: "https://example.com/api/data" } });
      expect(s).toBeNull();
    });
  });

  describe("batch evaluation", () => {
    it("evaluates multiple calls", () => {
      const suggestions = engine.evaluateAll([
        { tool: "Bash", params: { command: "cat file.ts" } },
        { tool: "Bash", params: { command: "npm test" } },
        { tool: "Agent", params: { prompt: "find utils.ts file" } },
      ]);
      expect(suggestions.length).toBe(2);
    });

    it("calculates total savings", () => {
      const suggestions = engine.evaluateAll([
        { tool: "Bash", params: { command: "cat file.ts" } },
        { tool: "Agent", params: { prompt: "find utils.ts file" } },
      ]);
      expect(engine.totalSavings(suggestions)).toBeGreaterThan(1000);
    });
  });
});
