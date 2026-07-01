/** DreamConsolidationEngine tests — HSE07. */
import { describe, it, expect } from "vitest";
import { DreamConsolidationEngine } from "../engines/DreamConsolidationEngine.js";
import type { DreamProposalBatch } from "../engines/DreamLoopProposalEngine.js";

const batch = (over: Partial<DreamProposalBatch> = {}): DreamProposalBatch => ({
  slot: "bravo",
  refuse_rules: [],
  skills: [],
  filtered_correction_count: 0,
  ...over,
});

describe("DreamConsolidationEngine.consolidate — happy", () => {
  it("nights_consolidated reflects batch count", () => {
    const r = DreamConsolidationEngine.consolidate({ batches: [batch(), batch(), batch()], top_k: 10 });
    expect(r.nights_consolidated).toBe(3);
  });

  it("repeats sum observed_count + bump recurrence_nights", () => {
    const b1 = batch({ refuse_rules: [{ rule: "rA", source_correction: "x", observed_count: 3 }] });
    const b2 = batch({ refuse_rules: [{ rule: "rA", source_correction: "x", observed_count: 4 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b1, b2], top_k: 10 });
    expect(r.promoted_refuse_rules[0].observed_count).toBe(7);
    expect(r.promoted_refuse_rules[0].recurrence_nights).toBe(2);
  });

  it("ranks by recurrence_nights desc, then observed_count desc", () => {
    const b1 = batch({ refuse_rules: [
      { rule: "single", source_correction: "x", observed_count: 100 },
      { rule: "recurring", source_correction: "x", observed_count: 5 },
    ] });
    const b2 = batch({ refuse_rules: [{ rule: "recurring", source_correction: "x", observed_count: 5 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b1, b2], top_k: 10 });
    expect(r.promoted_refuse_rules[0].rule).toBe("recurring");
  });

  it("top_k caps the promoted lists", () => {
    const rules = Array.from({ length: 20 }, (_, i) => ({
      rule: `r${i}`, source_correction: "x", observed_count: 10,
    }));
    // Two-night recurrence so they survive the singleton filter.
    const r = DreamConsolidationEngine.consolidate({
      batches: [batch({ refuse_rules: rules }), batch({ refuse_rules: rules })],
      top_k: 5,
    });
    expect(r.promoted_refuse_rules.length).toBe(5);
  });

  it("skills consolidate across batches", () => {
    const b1 = batch({ skills: [{ name: "skill-x", reason: "r", triggering_pattern: "p", observed_count: 10 }] });
    const b2 = batch({ skills: [{ name: "skill-x", reason: "r", triggering_pattern: "p", observed_count: 5 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b1, b2], top_k: 10 });
    expect(r.promoted_skills[0].observed_count).toBe(15);
    expect(r.promoted_skills[0].recurrence_nights).toBe(2);
  });
});

describe("DreamConsolidationEngine — singleton drop policy", () => {
  it("singleton refuse-rule with low observed_count → dropped", () => {
    const b = batch({ refuse_rules: [{ rule: "rare", source_correction: "x", observed_count: 2 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b], top_k: 10 });
    expect(r.promoted_refuse_rules).toEqual([]);
    expect(r.dropped_singleton_count).toBe(1);
  });

  it("singleton refuse-rule with strong observed_count (≥3) survives", () => {
    const b = batch({ refuse_rules: [{ rule: "burst", source_correction: "x", observed_count: 10 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b], top_k: 10 });
    expect(r.promoted_refuse_rules.length).toBe(1);
  });

  it("singleton skill needs stronger threshold (≥6)", () => {
    const b = batch({ skills: [{ name: "weak", reason: "r", triggering_pattern: "p", observed_count: 5 }] });
    const r = DreamConsolidationEngine.consolidate({ batches: [b], top_k: 10 });
    expect(r.promoted_skills).toEqual([]);
  });
});

describe("DreamConsolidationEngine — failure modes", () => {
  it("empty batches → throws", () => {
    expect(() => DreamConsolidationEngine.consolidate({ batches: [], top_k: 5 })).toThrow();
  });

  it("mixed slots → throws", () => {
    expect(() =>
      DreamConsolidationEngine.consolidate({
        batches: [batch({ slot: "bravo" }), batch({ slot: "alpha" })],
        top_k: 5,
      }),
    ).toThrow();
  });

  it("non-object batch entry → throws", () => {
    expect(() => DreamConsolidationEngine.consolidate({ batches: [null as never], top_k: 5 })).toThrow();
  });

  it("renderQueue shows tag + nights + counts", () => {
    const md = DreamConsolidationEngine.renderQueue(
      DreamConsolidationEngine.consolidate({ batches: [batch()], top_k: 10 }),
    );
    expect(md.includes("[DREAM-CONSOL bravo]")).toBe(true);
    expect(md.includes("nights=1")).toBe(true);
  });
});
