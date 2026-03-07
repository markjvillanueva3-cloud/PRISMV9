import { describe, it, expect } from "vitest";
import { ContextDigestEngine } from "../engines/ContextDigestEngine.js";

describe("ContextDigestEngine", () => {
  const engine = new ContextDigestEngine();

  describe("digestFile", () => {
    it("digests TypeScript files with symbols", () => {
      const content = [
        'import { foo } from "./bar.js";',
        "",
        "export class MyEngine {",
        "  run(): void {}",
        "}",
        "",
        "export interface Config {",
        "  name: string;",
        "}",
        "",
        "export const instance = new MyEngine();",
      ].join("\n");
      const result = engine.digestFile("src/engines/MyEngine.ts", content);
      expect(result.type).toBe("typescript");
      expect(result.symbols).toBeDefined();
      expect(result.symbols!.length).toBeGreaterThan(0);
      expect(result.symbols).toContain("MyEngine");
      expect(result.digest).toContain("MyEngine");
    });

    it("digests JSON files with top keys", () => {
      const content = JSON.stringify({ name: "test", version: "1.0", deps: {} });
      const result = engine.digestFile("package.json", content);
      expect(result.type).toBe("json");
      expect(result.digest).toContain("JSON");
      expect(result.digest).toContain("name");
    });

    it("digests Markdown files with headings", () => {
      const content = "# Title\n\nSome text\n\n## Section\n\nMore text";
      const result = engine.digestFile("README.md", content);
      expect(result.type).toBe("markdown");
      expect(result.digest).toContain("MD");
      expect(result.digest).toContain("2 headings");
    });

    it("digests generic text files", () => {
      const content = "line 1\nline 2\nline 3";
      const result = engine.digestFile("data.txt", content);
      expect(result.type).toBe("text");
      expect(result.digest).toContain("3 lines");
    });

    it("handles JavaScript files", () => {
      const content = "export function hello() { return 1; }";
      const result = engine.digestFile("util.js", content);
      expect(result.type).toBe("javascript");
      expect(result.symbols).toContain("hello");
    });

    it("handles invalid JSON gracefully", () => {
      const result = engine.digestFile("bad.json", "{invalid json");
      expect(result.digest).toContain("invalid");
    });
  });

  describe("digestDirectory", () => {
    it("produces directory summary", () => {
      const files = [
        { name: "a.ts", content: "export const a = 1;" },
        { name: "b.ts", content: "export const b = 2;" },
        { name: "c.json", content: '{"key": "value"}' },
      ];
      const result = engine.digestDirectory("src/", files);
      expect(result.fileCount).toBe(3);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.digest).toContain("3 files");
      expect(result.files.length).toBe(3);
    });
  });

  describe("savings", () => {
    it("calculates token savings", () => {
      const result = engine.savings(1000, "short digest text");
      expect(result.saved).toBeGreaterThan(0);
      expect(result.percent).toBeGreaterThan(90);
    });

    it("handles zero full tokens", () => {
      const result = engine.savings(0, "digest");
      expect(result.saved).toBe(0);
      expect(result.percent).toBe(0);
    });
  });

  describe("oneLiner", () => {
    it("produces one-line summary with symbols", () => {
      const result = engine.digestFile("src/foo.ts", "export class Foo {}");
      const line = engine.oneLiner(result);
      expect(line).toContain("foo.ts");
      expect(line).toContain("typescript");
      expect(line).toContain("symbols");
    });

    it("produces one-line summary without symbols", () => {
      const result = engine.digestFile("data.txt", "hello world");
      const line = engine.oneLiner(result);
      expect(line).toContain("data.txt");
      expect(line).not.toContain("symbols");
    });
  });
});
