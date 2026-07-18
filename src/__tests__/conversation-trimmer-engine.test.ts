import { describe, it, expect } from "vitest";
import { ConversationTrimmerEngine } from "../engines/ConversationTrimmerEngine.js";

describe("ConversationTrimmerEngine", () => {
  const engine = new ConversationTrimmerEngine();

  describe("classify", () => {
    it("detects failed attempts", () => {
      const seg = engine.classify("Error: file not found. Let me try a different approach instead.");
      expect(seg.type).toBe("failed-attempt");
      expect(seg.trimmable).toBe(true);
    });

    it("detects superseded info", () => {
      const seg = engine.classify("This was previously set to 5 but was updated to 10.");
      expect(seg.type).toBe("superseded");
      expect(seg.trimmable).toBe(true);
    });

    it("marks essential content", () => {
      const seg = engine.classify("The router uses Express v4 with middleware.");
      expect(seg.type).toBe("essential");
      expect(seg.trimmable).toBe(false);
    });
  });

  describe("plan", () => {
    it("calculates trimmable tokens", () => {
      const segments = [
        "Essential information here",
        "Error: failed. Let me try again instead.",
        "This was previously different but was updated now.",
      ];
      const p = engine.plan(segments);
      expect(p.trimmableTokens).toBeGreaterThan(0);
      expect(p.trimmablePercent).toBeGreaterThan(0);
    });

    it("groups trims by type", () => {
      const segments = [
        "Error: fail. Let me try instead.",
        "Error: again. Let me retry instead.",
        "Essential info",
      ];
      const p = engine.plan(segments);
      expect(p.topTrims.length).toBeGreaterThan(0);
      expect(p.topTrims[0].type).toBe("failed-attempt");
    });

    it("handles empty input", () => {
      const p = engine.plan([]);
      expect(p.totalTokens).toBe(0);
      expect(p.trimmablePercent).toBe(0);
    });
  });

  describe("quickAssess", () => {
    it("reports minimal for clean context", () => {
      const result = engine.quickAssess(5000, ["Essential content only"]);
      expect(result).toContain("Minimal");
    });

    it("reports trimmable for wasteful context", () => {
      const segments = [
        "Error: fail. Let me try again instead. " + "x".repeat(800),
        "This was previously wrong but was updated. " + "x".repeat(800),
      ];
      const result = engine.quickAssess(10000, segments);
      expect(result).toContain("trimmable");
    });
  });

  describe("oneLiner", () => {
    it("produces summary", () => {
      const line = engine.oneLiner(["some content", "other content"]);
      expect(line).toContain("segments");
    });
  });
});
