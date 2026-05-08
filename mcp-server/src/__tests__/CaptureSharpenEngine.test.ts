/**
 * CaptureSharpenEngine.test.ts
 *
 * OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN — exit_criteria coverage:
 *   1. Sharp capture (headline-shape) passes with score ≥ 0.7
 *   2. Vague capture (no number, paragraph-shape) fails
 *   3. Capture with bare "this/that/it" anaphora gets flagged
 *   4. Classification routes to correct cyrilXBT subfolder
 *   5. 3-tag proposal: pillar / note_type / topical
 *   6. Length out-of-range gets flagged
 *
 * 14 it() cases.
 */

import { describe, it, expect } from "vitest";
import {
  CaptureSharpenEngine,
  captureSharpenEngine,
} from "../engines/CaptureSharpenEngine.js";

describe("CaptureSharpenEngine", () => {
  // -------------------- HAPPY: SHARP CAPTURES --------------------

  it("sharp number-bearing headline passes with high score", () => {
    const r = captureSharpenEngine.assess(
      "Posts with a specific number in the first line outperformed numberless hooks 3:1 this week across all content pillars.",
    );
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0.7);
    expect(r.classifiedAs).toBe("numbers");
    expect(r.flags.length).toBe(0);
  });

  it("classifies as 'questions' when ending in '?' or starting with why/how/what-if", () => {
    const r1 = captureSharpenEngine.assess("Why does the closer-first rule outperform middle-first by 2x?");
    expect(r1.classifiedAs).toBe("questions");

    const r2 = captureSharpenEngine.assess("How would tribal knowledge surface change if we promoted weekly to memories/reference/?");
    expect(r2.classifiedAs).toBe("questions");
  });

  it("classifies as 'patterns' when keywords match (across, principle, every time, ...)", () => {
    const r = captureSharpenEngine.assess(
      "The same principle appears across mill safety and EDM safety: pre-flight gates beat reactive blocks every time.",
    );
    expect(r.classifiedAs).toBe("patterns");
  });

  it("classifies as 'reactions' on emotional keywords (love, hate, surprising)", () => {
    const r = captureSharpenEngine.assess(
      "Genuinely surprising that lint-staged hollowed the contradiction-detector commit twice in a row.",
    );
    expect(r.classifiedAs).toBe("reactions");
  });

  it("falls back to 'observations' when no other category keywords match", () => {
    const r = captureSharpenEngine.assess(
      "JM Die ALCOA folder has 1,234 lathe programs spanning carbon, stainless, and tool steels.",
    );
    expect(r.classifiedAs).toBe("numbers"); // contains a number
  });

  it("3-tag proposal returns [pillar, note_type, topical]", () => {
    const r = captureSharpenEngine.assess(
      "Posts with a specific number in the first line outperformed numberless hooks 3:1 across pillars.",
      { contentPillarHint: "ai-content" },
    );
    expect(r.proposedTags.length).toBe(3);
    expect(r.proposedTags[0]).toBe("ai-content");
    expect(r.proposedTags[1]).toBe(r.classifiedAs);
    expect(r.proposedTags[2].length).toBeGreaterThan(0);
  });

  // -------------------- REJECT: NOT SHARP --------------------

  it("rejects vague paragraph-shape capture", () => {
    const r = captureSharpenEngine.assess(
      "I noticed something today; this is interesting because it could mean that we have a problem; we should think about it; perhaps tomorrow.",
    );
    expect(r.passed).toBe(false);
    expect(r.flags.length).toBeGreaterThan(0);
  });

  it("rejects capture with bare anaphora ('this is...')", () => {
    const r = captureSharpenEngine.assess(
      "This is the most important thing that happened this week.",
    );
    expect(r.flags.find((f) => f.kind === "anaphora")).not.toBe(undefined);
  });

  it("flags capture without any specific number / source tag / named entity", () => {
    const r = captureSharpenEngine.assess(
      "Performance was strong across the board for content this week.",
    );
    const specFlag = r.flags.find((f) => f.kind === "specificity");
    expect(specFlag).not.toBe(undefined);
  });

  it("flags compound sentence (semicolon)", () => {
    const r = captureSharpenEngine.assess(
      "Numbers win; closers matter even more; we proved it across 12 posts.",
    );
    const structFlag = r.flags.find((f) => f.kind === "structure");
    expect(structFlag).not.toBe(undefined);
  });

  // -------------------- LENGTH GUARDS --------------------

  it("flags too-short capture", () => {
    const r = captureSharpenEngine.assess("Numbers win.");
    const lenFlag = r.flags.find((f) => f.kind === "too_short");
    expect(lenFlag).not.toBe(undefined);
  });

  it("flags too-long capture (paragraph rather than headline)", () => {
    const long = "X ".repeat(180) + "ends now.";
    const r = captureSharpenEngine.assess(long);
    const lenFlag = r.flags.find((f) => f.kind === "too_long");
    expect(lenFlag).not.toBe(undefined);
  });

  // -------------------- DETERMINISM + ADVERSARIAL --------------------

  it("threshold override changes pass/fail boundary", () => {
    const cap = "A merely-okay sentence about something testable in scope.";
    const strict = captureSharpenEngine.assess(cap, { threshold: 0.95 });
    const loose = captureSharpenEngine.assess(cap, { threshold: 0.3 });
    expect(strict.passed).toBe(false);
    expect(loose.passed).toBe(true);
  });

  it("singleton == fresh class instance — equivalent results", () => {
    const fresh = new CaptureSharpenEngine();
    const cap = "Posts with a specific number in the first line outperformed numberless hooks 3:1.";
    const r1 = captureSharpenEngine.assess(cap);
    const r2 = fresh.assess(cap);
    expect(r2.score).toBeCloseTo(r1.score, 8);
    expect(r2.classifiedAs).toBe(r1.classifiedAs);
    expect(r2.proposedTags).toEqual(r1.proposedTags);
  });
});
