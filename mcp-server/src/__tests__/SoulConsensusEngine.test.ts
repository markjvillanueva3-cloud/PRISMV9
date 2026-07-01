/** SoulConsensusEngine tests — HSE08. */
import { describe, it, expect } from "vitest";
import { SoulConsensusEngine } from "../engines/SoulConsensusEngine.js";
import type { SlotSoul } from "../engines/SoulFrontmatterReaderEngine.js";

const SOUL = (over: Partial<SlotSoul> = {}): SlotSoul => ({
  slot: "bravo",
  role: "mill-specialist",
  voice: "v",
  tone: "t",
  refuse_list: [],
  hermes_role: "specialist-mill",
  body: "",
  ...over,
});

describe("SoulConsensusEngine.analyze — fleet doctrine", () => {
  it("refusal held by > majority → fleet_doctrine_candidate", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", refuse_list: ["fleet-rule"] }),
      SOUL({ slot: "b", refuse_list: ["fleet-rule"] }),
      SOUL({ slot: "c", refuse_list: ["fleet-rule"] }),
      SOUL({ slot: "d", refuse_list: [] }),
    ]);
    expect(r.fleet_doctrine_candidates.length).toBe(1);
    expect(r.fleet_doctrine_candidates[0].coverage_pct).toBe(75);
  });

  it("refusal held by minority → NOT fleet_doctrine", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", refuse_list: ["minor"] }),
      SOUL({ slot: "b", refuse_list: [] }),
      SOUL({ slot: "c", refuse_list: [] }),
    ]);
    expect(r.fleet_doctrine_candidates).toEqual([]);
  });

  it("doctrine candidates sorted by coverage desc", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", refuse_list: ["medium", "high"] }),
      SOUL({ slot: "b", refuse_list: ["medium", "high"] }),
      SOUL({ slot: "c", refuse_list: ["high"] }),
    ]);
    expect(r.fleet_doctrine_candidates[0].refusal).toBe("high");
  });
});

describe("SoulConsensusEngine.analyze — singletons + divergences", () => {
  it("singleton refusal surfaces in singleton_refusals", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", refuse_list: ["only-mine"] }),
      SOUL({ slot: "b", refuse_list: [] }),
    ]);
    expect(r.singleton_refusals).toEqual([{ refusal: "only-mine", slot: "a" }]);
  });

  it("role divergence: same role, different refusals", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", hermes_role: "specialist-mill", refuse_list: ["x"] }),
      SOUL({ slot: "b", hermes_role: "specialist-mill", refuse_list: [] }),
    ]);
    expect(r.role_divergences.length).toBeGreaterThanOrEqual(1);
    expect(r.role_divergences[0].holders).toEqual(["a"]);
    expect(r.role_divergences[0].missing_from).toEqual(["b"]);
  });

  it("single-slot role has NO divergence (nothing to disagree with)", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", hermes_role: "solo", refuse_list: ["x"] }),
    ]);
    expect(r.role_divergences).toEqual([]);
  });

  it("role-wide agreement → no divergence", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", hermes_role: "team", refuse_list: ["shared"] }),
      SOUL({ slot: "b", hermes_role: "team", refuse_list: ["shared"] }),
    ]);
    expect(r.role_divergences).toEqual([]);
  });
});

describe("SoulConsensusEngine — totals + render + edge", () => {
  it("distinct_refusal_count tallies unique refusals", () => {
    const r = SoulConsensusEngine.analyze([
      SOUL({ slot: "a", refuse_list: ["x", "y"] }),
      SOUL({ slot: "b", refuse_list: ["y", "z"] }),
    ]);
    expect(r.distinct_refusal_count).toBe(3);
  });

  it("total_souls = input length", () => {
    const r = SoulConsensusEngine.analyze([SOUL({ slot: "a" }), SOUL({ slot: "b" })]);
    expect(r.total_souls).toBe(2);
  });

  it("empty array throws", () => {
    expect(() => SoulConsensusEngine.analyze([])).toThrow();
  });

  it("non-array throws", () => {
    expect(() => SoulConsensusEngine.analyze(null as never)).toThrow();
  });

  it("renderResult shows counts + tag", () => {
    const md = SoulConsensusEngine.renderResult(SoulConsensusEngine.analyze([SOUL()]));
    expect(md.includes("[SOUL-CONSENSUS]")).toBe(true);
    expect(md.includes("n=1")).toBe(true);
  });
});
