import { describe, it, expect } from "vitest";
import { ToolOutputFingerprinterEngine } from "../engines/ToolOutputFingerprinterEngine.js";

describe("ToolOutputFingerprinterEngine", () => {
  describe("check", () => {
    it("returns null for new outputs", () => {
      const engine = new ToolOutputFingerprinterEngine();
      const result = engine.check("Read", "file content here");
      expect(result).toBeNull();
    });

    it("detects exact duplicate outputs", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "same content");
      const result = engine.check("Read", "same content");
      expect(result).not.toBeNull();
      expect(result!.similarity).toBe(1.0);
      expect(result!.wastedTokens).toBeGreaterThan(0);
    });

    it("allows different outputs", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "content A with lots of unique text");
      const result = engine.check("Read", "content B completely different");
      expect(result).toBeNull();
    });

    it("detects cross-tool duplicates", () => {
      const engine = new ToolOutputFingerprinterEngine();
      const output = "export class Foo { bar(): void {} }";
      engine.check("Read", output);
      const result = engine.check("Grep", output);
      expect(result).not.toBeNull();
    });

    it("tracks wasted tokens across multiple dupes", () => {
      const engine = new ToolOutputFingerprinterEngine();
      const content = "repeated content here";
      engine.check("Read", content);
      engine.check("Read", content);
      engine.check("Read", content);
      const stats = engine.stats();
      expect(stats.duplicatesFound).toBe(2);
      expect(stats.totalWastedTokens).toBeGreaterThan(0);
    });
  });

  describe("stats", () => {
    it("shows top duplicates", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "content alpha");
      engine.check("Read", "content alpha");
      engine.check("Grep", "content beta");
      engine.check("Grep", "content beta");
      const stats = engine.stats();
      expect(stats.topDuplicates.length).toBe(2);
    });

    it("reports zero for clean session", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "unique 1");
      engine.check("Read", "unique 2");
      const stats = engine.stats();
      expect(stats.duplicatesFound).toBe(0);
    });
  });

  describe("oneLiner", () => {
    it("produces compact status", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "content");
      const line = engine.oneLiner();
      expect(line).toContain("1 tracked");
      expect(line).toContain("Fingerprints");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const engine = new ToolOutputFingerprinterEngine();
      engine.check("Read", "content");
      engine.check("Read", "content");
      engine.reset();
      expect(engine.stats().totalFingerprints).toBe(0);
      expect(engine.stats().duplicatesFound).toBe(0);
    });
  });
});
