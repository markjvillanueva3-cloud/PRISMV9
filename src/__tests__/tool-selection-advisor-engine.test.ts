import { describe, it, expect } from "vitest";
import { ToolSelectionAdvisorEngine } from "../engines/ToolSelectionAdvisorEngine.js";

describe("ToolSelectionAdvisorEngine", () => {
  const engine = new ToolSelectionAdvisorEngine();

  describe("advise", () => {
    it("recommends Glob for find-file", () => {
      const advice = engine.advise("find-file");
      expect(advice.recommended).toBe("Glob");
      expect(advice.estimatedTokens).toBeLessThan(200);
    });

    it("recommends Grep for search-content", () => {
      const advice = engine.advise("search-content");
      expect(advice.recommended).toBe("Grep");
    });

    it("recommends context7 for docs", () => {
      const advice = engine.advise("fetch-docs");
      expect(advice.recommended).toBe("context7");
    });

    it("recommends Read with offset for sections", () => {
      const advice = engine.advise("read-section");
      expect(advice.recommended).toContain("Read");
      expect(advice.recommended).toContain("offset");
    });

    it("provides alternatives", () => {
      const advice = engine.advise("find-file");
      expect(advice.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("detectIntent", () => {
    it("detects find-file intent", () => {
      expect(engine.detectIntent("where is the config file")).toBe("find-file");
    });

    it("detects search-content intent", () => {
      expect(engine.detectIntent("search for the error handler")).toBe("search-content");
    });

    it("detects edit intent", () => {
      expect(engine.detectIntent("change the function name")).toBe("edit-file");
    });

    it("returns null for unknown intents", () => {
      expect(engine.detectIntent("xyz random noise")).toBeNull();
    });
  });

  describe("isOptimal", () => {
    it("confirms optimal tool choice", () => {
      expect(engine.isOptimal("Glob", "find-file")).toBe(true);
    });

    it("rejects non-optimal tool choice", () => {
      expect(engine.isOptimal("Agent", "find-file")).toBe(false);
    });
  });

  describe("suggestCheaper", () => {
    it("suggests cheaper for Agent", () => {
      const cheaper = engine.suggestCheaper("Agent");
      expect(cheaper).not.toBeNull();
      expect(cheaper).toContain("Grep");
    });

    it("suggests context7 for WebFetch", () => {
      const cheaper = engine.suggestCheaper("WebFetch");
      expect(cheaper).toContain("context7");
    });

    it("returns null for already-cheap tools", () => {
      expect(engine.suggestCheaper("Glob")).toBeNull();
    });
  });

  describe("stats", () => {
    it("tracks advice given", () => {
      const e = new ToolSelectionAdvisorEngine();
      e.advise("find-file");
      e.advise("find-file");
      e.advise("search-content");
      const s = e.stats();
      expect(s.totalAdvice).toBe(3);
      expect(s.topIntents[0].intent).toBe("find-file");
    });
  });

  describe("reset", () => {
    it("clears log", () => {
      const e = new ToolSelectionAdvisorEngine();
      e.advise("find-file");
      e.reset();
      expect(e.stats().totalAdvice).toBe(0);
    });
  });
});
