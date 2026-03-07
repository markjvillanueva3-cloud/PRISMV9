import { describe, it, expect } from "vitest";
import { CostAwareRouterEngine } from "../engines/CostAwareRouterEngine.js";

describe("CostAwareRouterEngine", () => {
  const engine = new CostAwareRouterEngine();

  describe("route", () => {
    it("routes find-file to Glob", () => {
      const r = engine.route("find-file", { pattern: "**/*.ts" });
      expect(r.tool).toBe("Glob");
      expect(r.estimatedTokens).toBeLessThan(100);
    });

    it("routes search-content to Grep", () => {
      const r = engine.route("search-content", { pattern: "TODO" });
      expect(r.tool).toBe("Grep");
    });

    it("routes count-matches to Grep count mode", () => {
      const r = engine.route("count-matches", { pattern: "export" });
      expect(r.tool).toBe("Grep");
      expect(r.params.output_mode).toBe("count");
      expect(r.estimatedTokens).toBeLessThan(50);
    });

    it("routes check-exists to Glob", () => {
      const r = engine.route("check-exists", { file: "src/index.ts" });
      expect(r.tool).toBe("Glob");
      expect(r.estimatedTokens).toBeLessThan(50);
    });

    it("routes get-structure to Grep", () => {
      const r = engine.route("get-structure", { file: "src/engine.ts" });
      expect(r.tool).toBe("Grep");
    });

    it("provides alternatives", () => {
      const r = engine.route("find-file");
      expect(r.alternatives.length).toBeGreaterThan(0);
      expect(r.alternatives[0].estimatedTokens).toBeGreaterThan(r.estimatedTokens);
    });
  });

  describe("inferIntent", () => {
    it("infers find-file", () => {
      expect(engine.inferIntent("find the utils.ts file")).toBe("find-file");
      expect(engine.inferIntent("where is index.ts")).toBe("find-file");
    });

    it("infers search-content", () => {
      expect(engine.inferIntent("search for TODO in src/")).toBe("search-content");
    });

    it("infers count-matches", () => {
      expect(engine.inferIntent("how many exports are there")).toBe("count-matches");
    });

    it("infers list-files", () => {
      expect(engine.inferIntent("list files in the directory")).toBe("list-files");
    });

    it("infers read-section", () => {
      expect(engine.inferIntent("show me the function definition on lines 50-80")).toBe("read-section");
    });

    it("infers modify-file", () => {
      expect(engine.inferIntent("edit the router to fix the bug")).toBe("modify-file");
    });
  });

  describe("oneLiner", () => {
    it("produces recommendation", () => {
      const line = engine.oneLiner("find-file");
      expect(line).toContain("Glob");
      expect(line).toContain("tokens");
    });
  });
});
