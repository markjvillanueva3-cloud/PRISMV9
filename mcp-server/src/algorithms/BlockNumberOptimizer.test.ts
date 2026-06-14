import { describe, it, expect } from "vitest";
import { renumber, BlockNumberOptimizer, type BlockNumberInput } from "./BlockNumberOptimizer.js";

const SAMPLE = `(part-1)
N1 G0 G54 X0 Y0
N2 G1 Z-1. F100
M6 T2
N5 G0 X10 Y10
N6 G1 X20`;

describe("BlockNumberOptimizer", () => {
  describe("strategy: strip", () => {
    it("removes all N-words, preserves rest", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "strip" });
      expect(r.gcode).not.toMatch(/N\d+/);
      expect(r.gcode).toContain("G0 G54 X0 Y0");
      expect(r.n_words_stripped).toBe(4);
      expect(r.n_words_emitted).toBe(0);
    });
    it("preserves comment-only lines unchanged", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "strip" });
      expect(r.gcode).toContain("(part-1)");
    });
  });

  describe("strategy: dense (stride 10)", () => {
    it("emits N10, N20, N30, N40, ...", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "dense" });
      expect(r.gcode).toMatch(/N10\s/);
      expect(r.gcode).toMatch(/N20\s/);
      expect(r.gcode).toMatch(/N30\s/);
      expect(r.gcode).toMatch(/N40\s/);
      expect(r.n_words_emitted).toBe(5);
    });
    it("replaces pre-existing N-words (does not duplicate)", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "dense" });
      // Should not have both N1 and N10 — the N1 must be stripped first
      expect(r.gcode).not.toMatch(/N1\s+G0/);
      expect(r.notes.join("|")).toContain("replaced");
    });
  });

  describe("strategy: sparse (stride 100)", () => {
    it("emits N100, N200, N300, ...", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "sparse" });
      expect(r.gcode).toMatch(/N100\s/);
      expect(r.gcode).toMatch(/N200\s/);
      expect(r.gcode).toMatch(/N300\s/);
    });
  });

  describe("strategy: operation_anchored (tool-group anchored)", () => {
    it("resets N counter at each M6 tool change", () => {
      const r = renumber({ gcode: SAMPLE, strategy: "operation_anchored" });
      // First tool group: N10, N20
      // After M6: counter resets to N1010 (tool 1 base = 10 + 1*10*100 = 1010)
      expect(r.gcode).toMatch(/N10\s/);
      expect(r.gcode).toMatch(/N1010\s/);
    });
  });

  describe("config: stride override", () => {
    it("respects custom stride parameter", () => {
      const r = renumber({ gcode: "G0\nG1\nG2", strategy: "dense", stride: 5 });
      expect(r.gcode).toMatch(/N5\s/);
      expect(r.gcode).toMatch(/N10\s/);
      expect(r.gcode).toMatch(/N15\s/);
    });
    it("respects custom start parameter", () => {
      const r = renumber({ gcode: "G0\nG1", strategy: "dense", start: 100, stride: 50 });
      expect(r.gcode).toMatch(/N100\s/);
      expect(r.gcode).toMatch(/N150\s/);
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("non-string gcode → diagnostic", () => {
      const r = renumber({ gcode: 42 as unknown as string, strategy: "dense" });
      expect(r.notes.join("|")).toContain("string");
    });
    it("unknown strategy → diagnostic", () => {
      const r = renumber({ gcode: "G0", strategy: "renumber_alphabetically" as BlockNumberInput["strategy"] });
      expect(r.notes.join("|")).toContain("unknown strategy");
    });
    it("oversize gcode (>5MB) → diagnostic, no crash", () => {
      const huge = "G0\n".repeat(2_000_000);
      const r = renumber({ gcode: huge, strategy: "dense" });
      expect(r.notes.join("|")).toMatch(/exceeds/);
    });
    it("empty gcode → 0 blocks, empty result", () => {
      const r = renumber({ gcode: "", strategy: "dense" });
      expect(r.total_blocks_processed).toBe(0);
      expect(r.n_words_emitted).toBe(0);
    });
    it("comment-only file → 0 blocks renumbered", () => {
      const r = renumber({ gcode: "(comment1)\n; comment2\n(comment3)", strategy: "dense" });
      expect(r.total_blocks_processed).toBe(0);
      expect(r.n_words_emitted).toBe(0);
      expect(r.gcode).toContain("(comment1)");
    });
  });

  describe("idempotency", () => {
    it("renumber→renumber with same strategy = stable counts", () => {
      const r1 = renumber({ gcode: SAMPLE, strategy: "dense" });
      const r2 = renumber({ gcode: r1.gcode, strategy: "dense" });
      expect(r1.n_words_emitted).toBe(r2.n_words_emitted);
    });
  });

  it("BlockNumberOptimizer.version is 1.0.0", () => {
    expect(BlockNumberOptimizer.version).toBe("1.0.0");
  });
});
