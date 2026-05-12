/**
 * Tests for SituationalAwarenessFilterEngine (Phase 0.13 U-SAW5)
 */

import { describe, it, expect } from "vitest";
import {
  SituationalAwarenessFilterEngine,
  situationalAwarenessFilterEngine,
} from "../engines/SituationalAwarenessFilterEngine.js";

const SAMPLE_DIRECTIVE = `# PRISM Self-Awareness Directive

## Overview
This document describes what PRISM knows about itself.

## Machining
Kienzle force model applies to milling and turning operations.
Taylor tool life predicts wear based on cutting speed.

## EDM
Wire EDM uses electrical discharge to cut conductive materials.
Sinker EDM uses graphite electrodes with dielectric fluid.

## Materials
Tool steels include M2, D2, and S7 grades.
Tungsten carbide is the most common cutting insert material.

## Safety
Always check collision detection before running G-code.
`;

describe("SituationalAwarenessFilterEngine", () => {
  const engine = new SituationalAwarenessFilterEngine();

  describe("filter()", () => {
    it("returns at most maxLines", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle milling", { maxLines: 3 });
      expect(r.kept.length).toBeLessThanOrEqual(3);
    });

    it("preserves original line order in output", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "tool life cutting speed", { maxLines: 10 });
      for (let i = 1; i < r.kept.length; i++) {
        expect(r.kept[i].lineNumber).toBeGreaterThan(r.kept[i - 1].lineNumber);
      }
    });

    it("ranks prompt-relevant lines above irrelevant ones", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle force milling", { maxLines: 5 });
      const keptText = r.kept.map((l) => l.text).join(" ");
      expect(keptText.toLowerCase()).toContain("kienzle");
    });

    it("filters out lines below minScore", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle milling", { maxLines: 25, minScore: 0.5 });
      for (const line of r.kept) {
        expect(line.score).toBeGreaterThanOrEqual(0.5);
      }
    });

    it("returns empty kept when prompt is unrelated and minScore is strict", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "zzz-unrelated-term", { minScore: 0.5 });
      expect(r.kept.length).toBe(0);
    });

    it("drops blank lines from the input", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 25 });
      for (const line of r.kept) {
        expect(line.text.trim().length).toBeGreaterThan(0);
      }
    });

    it("reports inputLineCount excluding blank lines", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "anything");
      // SAMPLE_DIRECTIVE has 14 non-blank lines (5 headers + 9 content)
      expect(r.inputLineCount).toBe(14);
    });

    it("reports a sane compression ratio", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle milling", { maxLines: 5 });
      expect(r.compressionRatio).toBeGreaterThan(0);
      expect(r.compressionRatio).toBeLessThanOrEqual(1);
    });

    it("reports droppedCount = input - kept", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 5 });
      expect(r.droppedCount).toBe(r.inputLineCount - r.kept.length);
    });

    it("biases headers up when alwaysKeepHeaders=true (default)", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "machining");
      const headerScores = r.kept.filter((l) => l.text.startsWith("#")).map((l) => l.score);
      expect(headerScores.length).toBeGreaterThan(0);
    });

    it("does not bias headers when alwaysKeepHeaders=false", () => {
      const withBias = engine.filter(SAMPLE_DIRECTIVE, "zzz-nonsense", { alwaysKeepHeaders: true, minScore: 0.1 });
      const withoutBias = engine.filter(SAMPLE_DIRECTIVE, "zzz-nonsense", { alwaysKeepHeaders: false, minScore: 0.1 });
      expect(withoutBias.kept.length).toBeLessThanOrEqual(withBias.kept.length);
    });

    it("rejects negative maxLines", () => {
      expect(() => engine.filter(SAMPLE_DIRECTIVE, "x", { maxLines: -1 })).toThrow(/maxLines/);
    });

    it("rejects out-of-range minScore", () => {
      expect(() => engine.filter(SAMPLE_DIRECTIVE, "x", { minScore: -0.1 })).toThrow(/minScore/);
      expect(() => engine.filter(SAMPLE_DIRECTIVE, "x", { minScore: 1.1 })).toThrow(/minScore/);
    });

    it("defaults to 25 max lines", () => {
      const longDirective = Array.from({ length: 100 }, (_, i) => `topic ${i} kienzle machining`).join("\n");
      const r = engine.filter(longDirective, "kienzle");
      expect(r.kept.length).toBeLessThanOrEqual(25);
    });

    it("handles an empty directive", () => {
      const r = engine.filter("", "anything");
      expect(r.kept).toEqual([]);
      expect(r.inputLineCount).toBe(0);
      expect(r.compressionRatio).toBe(1);
    });

    it("handles an empty prompt (returns header bias only)", () => {
      const r = engine.filter(SAMPLE_DIRECTIVE, "", { alwaysKeepHeaders: true, minScore: 0.1 });
      for (const line of r.kept) {
        expect(line.text).toMatch(/^#/);
      }
    });
  });

  describe("scoreLine()", () => {
    it("scores 0 for blank lines", () => {
      expect(engine.scoreLine("", new Set(["x"]))).toBe(0);
      expect(engine.scoreLine("   ", new Set(["x"]))).toBe(0);
    });

    it("returns 0 when no tokens overlap", () => {
      expect(engine.scoreLine("completely different words", new Set(["unrelated"]))).toBe(0);
    });

    it("returns >0 when tokens overlap", () => {
      expect(engine.scoreLine("kienzle force", new Set(["kienzle"]))).toBeGreaterThan(0);
    });

    it("clamps the score to 1.0", () => {
      const score = engine.scoreLine("# kienzle", new Set(["kienzle"]));
      expect(score).toBeLessThanOrEqual(1);
    });

    it("applies header bias only when keepHeaders=true", () => {
      // Use a partial overlap so the pre-clamp scores differ.
      const withBias = engine.scoreLine("# Materials Catalog", new Set(["materials", "unrelated"]), true);
      const noBias = engine.scoreLine("# Materials Catalog", new Set(["materials", "unrelated"]), false);
      expect(withBias).toBeGreaterThan(noBias);
    });
  });

  describe("similarity()", () => {
    it("returns 0 for disjoint strings", () => {
      expect(engine.similarity("abc def", "ghi jkl")).toBe(0);
    });

    it("returns between 0 and 1", () => {
      const s = engine.similarity("kienzle force model", "kienzle cutting model");
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(1);
    });

    it("is symmetric", () => {
      const a = engine.similarity("kienzle force", "force model");
      const b = engine.similarity("force model", "kienzle force");
      expect(a).toBe(b);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = situationalAwarenessFilterEngine.filter(SAMPLE_DIRECTIVE, "kienzle", { maxLines: 3 });
      expect(r.kept.length).toBeGreaterThan(0);
    });
  });
});
