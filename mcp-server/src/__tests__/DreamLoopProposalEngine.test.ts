/** DreamLoopProposalEngine tests — HSE06. */
import { describe, it, expect } from "vitest";
import {
  DreamLoopProposalEngine,
  type DreamProposalRequest,
} from "../engines/DreamLoopProposalEngine.js";

const req = (over: Partial<DreamProposalRequest> = {}): DreamProposalRequest => ({
  slot: "bravo",
  current_refuse_list: [],
  corrections: [],
  error_patterns: [],
  ...over,
});

describe("DreamLoopProposalEngine.propose — refuse rule promotion", () => {
  it("recurring correction (≥2) promotes to refuse rule", () => {
    const r = DreamLoopProposalEngine.propose(req({
      corrections: [
        { text: "do not skip vitest", source: "operator" },
        { text: "DO NOT SKIP vitest!", source: "operator" },
      ],
    }));
    expect(r.refuse_rules.length).toBeGreaterThanOrEqual(1);
    expect(r.refuse_rules[0].observed_count).toBe(2);
  });

  it("singleton correction below min_repetitions → filtered, not promoted", () => {
    const r = DreamLoopProposalEngine.propose(req({
      corrections: [{ text: "once only", source: "operator" }],
    }));
    expect(r.refuse_rules).toEqual([]);
    expect(r.filtered_correction_count).toBe(1);
  });

  it("correction already in current_refuse_list → filtered", () => {
    const r = DreamLoopProposalEngine.propose(req({
      current_refuse_list: ["skip-vitest"],
      corrections: [
        { text: "skip vitest", source: "operator" },
        { text: "skip vitest", source: "operator" },
      ],
    }));
    expect(r.refuse_rules).toEqual([]);
  });

  it("refuse rules sorted by observed_count desc", () => {
    const r = DreamLoopProposalEngine.propose(req({
      corrections: [
        { text: "rare a", source: "x" }, { text: "rare a", source: "x" },
        { text: "common b", source: "x" }, { text: "common b", source: "x" },
        { text: "common b", source: "x" }, { text: "common b", source: "x" },
      ],
    }));
    expect(r.refuse_rules[0].observed_count).toBeGreaterThanOrEqual(r.refuse_rules[1].observed_count);
  });

  it("custom min_repetitions threshold honored", () => {
    const r = DreamLoopProposalEngine.propose(req({
      corrections: [
        { text: "x x x", source: "s" }, { text: "x x x", source: "s" },
        { text: "x x x", source: "s" }, { text: "x x x", source: "s" },
      ],
      min_repetitions: 5,
    }));
    expect(r.refuse_rules).toEqual([]);
  });
});

describe("DreamLoopProposalEngine.propose — skill promotion", () => {
  it("error pattern at 2×min_repetitions promotes to skill", () => {
    const r = DreamLoopProposalEngine.propose(req({
      error_patterns: [{ pattern: "missing semicolon in tsx file", count: 5 }],
    }));
    expect(r.skills.length).toBe(1);
    expect(r.skills[0].observed_count).toBe(5);
  });

  it("error pattern below skill threshold → not promoted", () => {
    const r = DreamLoopProposalEngine.propose(req({
      error_patterns: [{ pattern: "rare", count: 1 }],
    }));
    expect(r.skills).toEqual([]);
  });

  it("error pattern matching existing refuse → skipped", () => {
    const r = DreamLoopProposalEngine.propose(req({
      current_refuse_list: ["already-refused-pattern"],
      error_patterns: [{ pattern: "already refused pattern", count: 10 }],
    }));
    expect(r.skills).toEqual([]);
  });

  it("skills sorted by observed_count desc", () => {
    const r = DreamLoopProposalEngine.propose(req({
      error_patterns: [
        { pattern: "small error", count: 5 },
        { pattern: "big error", count: 50 },
      ],
    }));
    expect(r.skills[0].triggering_pattern).toContain("big");
  });
});

describe("DreamLoopProposalEngine — schema + edge", () => {
  it("rejects empty slot", () => {
    expect(() => DreamLoopProposalEngine.propose(req({ slot: "" }))).toThrow();
  });

  it("rejects negative count in error_patterns", () => {
    expect(() => DreamLoopProposalEngine.propose(req({
      error_patterns: [{ pattern: "x", count: -1 }],
    }))).toThrow();
  });

  it("empty corrections + empty patterns → batch with nothing", () => {
    const r = DreamLoopProposalEngine.propose(req());
    expect(r.refuse_rules).toEqual([]);
    expect(r.skills).toEqual([]);
  });

  it("renderBatch shows slot + counts", () => {
    const md = DreamLoopProposalEngine.renderBatch(DreamLoopProposalEngine.propose(req()));
    expect(md.includes("[DREAM bravo]")).toBe(true);
    expect(md.includes("new-refuses=0")).toBe(true);
  });
});
