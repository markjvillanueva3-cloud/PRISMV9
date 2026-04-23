/**
 * MultiControllerCalibrationEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS60
 */
import { describe, it, expect } from "vitest";
import {
  MultiControllerCalibrationEngine,
  multiControllerCalibrationEngine,
  StaticControllerProbe,
  canonicalProbes,
  CANONICAL_REQUIRED,
  type ControllerEmission,
} from "../../engines/MultiControllerCalibrationEngine.js";

const FULL_EMISSIONS: ControllerEmission[] = [
  { category: "units", code: "G21", required: true },
  { category: "plane_xy", code: "G17", required: true },
  { category: "absolute_mode", code: "G90", required: true },
  { category: "feed_mode", code: "G94", required: true },
  { category: "end_of_program", code: "M30", required: true },
];

describe("MultiControllerCalibrationEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(multiControllerCalibrationEngine).toBeInstanceOf(MultiControllerCalibrationEngine);
  });

  it("CANONICAL_REQUIRED has exactly 5 entries matching spec", () => {
    expect(CANONICAL_REQUIRED).toEqual([
      "units", "plane_xy", "absolute_mode", "feed_mode", "end_of_program",
    ]);
  });

  it("a fully compliant probe hits all 5 categories", () => {
    const probe = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS);
    const r = multiControllerCalibrationEngine.compareOne(probe);
    expect(r.hits).toEqual([...CANONICAL_REQUIRED]);
    expect(r.misses).toEqual([]);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(100);
  });

  it("a missing category counts as a miss + reduces score to 80", () => {
    const partial = FULL_EMISSIONS.filter((e) => e.category !== "feed_mode");
    const probe = new StaticControllerProbe("haas_ngc", partial);
    const r = multiControllerCalibrationEngine.compareOne(probe);
    expect(r.misses).toContain("feed_mode");
    expect(r.passed).toBe(false);
    expect(r.score).toBe(80); // 4/5 × 100
  });

  it("extras capture optional-category emissions beyond canonical set", () => {
    const extraEm: ControllerEmission[] = [
      ...FULL_EMISSIONS,
      { category: "coolant_on", code: "M8", required: false },
      { category: "tool_offset", code: "G43", required: false },
    ];
    const probe = new StaticControllerProbe("okuma_osp", extraEm);
    const r = multiControllerCalibrationEngine.compareOne(probe);
    expect(r.extras).toEqual(expect.arrayContaining(["coolant_on", "tool_offset"]));
    expect(r.passed).toBe(true);
  });

  it("non-required emissions don't count as hits", () => {
    // If 'feed_mode' is emitted with required=false, treat as missing.
    const weakEm: ControllerEmission[] = FULL_EMISSIONS.map((e) =>
      e.category === "feed_mode" ? { ...e, required: false } : e,
    );
    const probe = new StaticControllerProbe("mitsubishi_ea", weakEm);
    const r = multiControllerCalibrationEngine.compareOne(probe);
    expect(r.misses).toContain("feed_mode");
  });

  it("compareAll aggregates universal_hits only when every dialect emits", () => {
    const fullProbe = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS);
    const partial = new StaticControllerProbe(
      "haas_ngc",
      FULL_EMISSIONS.filter((e) => e.category !== "feed_mode"),
    );
    const out = multiControllerCalibrationEngine.compareAll([fullProbe, partial]);
    // feed_mode missing in partial → NOT universal
    expect(out.universal_hits).not.toContain("feed_mode");
    // units, plane_xy, absolute_mode, end_of_program ARE universal
    expect(out.universal_hits).toEqual(
      expect.arrayContaining(["units", "plane_xy", "absolute_mode", "end_of_program"]),
    );
  });

  it("compareAll flags a divergent dialect (missed what the majority hit)", () => {
    const good1 = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS);
    const good2 = new StaticControllerProbe("haas_ngc", FULL_EMISSIONS);
    const good3 = new StaticControllerProbe("okuma_osp", FULL_EMISSIONS);
    const bad = new StaticControllerProbe(
      "mitsubishi_ea",
      FULL_EMISSIONS.filter((e) => e.category !== "feed_mode"),
    );
    const out = multiControllerCalibrationEngine.compareAll([good1, good2, good3, bad]);
    expect(out.divergent_dialects).toContain("mitsubishi_ea");
    expect(out.divergent_dialects).toHaveLength(1);
  });

  it("all_passed = true iff every dialect scored 100", () => {
    const good1 = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS);
    const good2 = new StaticControllerProbe("haas_ngc", FULL_EMISSIONS);
    const allGood = multiControllerCalibrationEngine.compareAll([good1, good2]);
    expect(allGood.all_passed).toBe(true);

    const bad = new StaticControllerProbe(
      "mitsubishi_ea",
      FULL_EMISSIONS.filter((e) => e.category !== "feed_mode"),
    );
    const mixed = multiControllerCalibrationEngine.compareAll([good1, bad]);
    expect(mixed.all_passed).toBe(false);
  });

  it("aggregate_score averages per-dialect scores", () => {
    const full = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS); // 100
    const partial = new StaticControllerProbe(
      "haas_ngc",
      FULL_EMISSIONS.filter((e) => e.category !== "feed_mode"),
    ); // 80
    const out = multiControllerCalibrationEngine.compareAll([full, partial]);
    expect(out.aggregate_score).toBe(90); // (100 + 80) / 2
  });

  it("empty probe list returns all required categories as any_miss", () => {
    const out = multiControllerCalibrationEngine.compareAll([]);
    expect(out.per_dialect).toHaveLength(0);
    expect(out.any_miss).toEqual([...CANONICAL_REQUIRED]);
    expect(out.all_passed).toBe(false);
    expect(out.aggregate_score).toBe(0);
  });

  it("canonicalProbes() returns 5 compliant controllers", () => {
    const probes = canonicalProbes();
    expect(probes).toHaveLength(5);
    const out = multiControllerCalibrationEngine.compareAll(probes);
    expect(out.all_passed).toBe(true);
    expect(out.aggregate_score).toBe(100);
    expect(out.universal_hits).toEqual([...CANONICAL_REQUIRED]);
    expect(out.divergent_dialects).toHaveLength(0);
  });

  it("emissions are cloned — mutating returned list doesn't leak back", () => {
    const probe = new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS);
    const first = probe.emissions();
    first.pop();
    const second = probe.emissions();
    expect(second.length).toBe(FULL_EMISSIONS.length);
  });

  it("score is always integer 0..100", () => {
    const probes = [
      new StaticControllerProbe("fanuc_30i", FULL_EMISSIONS),
      new StaticControllerProbe("haas_ngc", []),
    ];
    for (const p of probes) {
      const r = multiControllerCalibrationEngine.compareOne(p);
      expect(Number.isInteger(r.score)).toBe(true);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("majority threshold: 2-of-3 hit → is majority; 1-of-3 → divergence of majority", () => {
    // All 3 hit units/absolute_mode, but only 1 hits end_of_program → others are divergent
    const emA: ControllerEmission[] = [
      { category: "units", code: "G21", required: true },
      { category: "plane_xy", code: "G17", required: true },
      { category: "absolute_mode", code: "G90", required: true },
      { category: "feed_mode", code: "G94", required: true },
      { category: "end_of_program", code: "M30", required: true },
    ];
    const emB: ControllerEmission[] = emA.filter((e) => e.category !== "end_of_program");
    const emC: ControllerEmission[] = emA.filter((e) => e.category !== "end_of_program");
    // A hits end_of_program; B+C don't → majority (2/3) DIDN'T hit it,
    // so B and C are NOT divergent on that category (they match the majority).
    const probeA = new StaticControllerProbe("fanuc_30i", emA);
    const probeB = new StaticControllerProbe("haas_ngc", emB);
    const probeC = new StaticControllerProbe("okuma_osp", emC);
    const out = multiControllerCalibrationEngine.compareAll([probeA, probeB, probeC]);
    // end_of_program is NOT in universal_hits (B, C missed it)
    expect(out.universal_hits).not.toContain("end_of_program");
    // No one is divergent on end_of_program because it's not a majority hit.
    expect(out.divergent_dialects).toHaveLength(0);
  });

  it("per_dialect contains one entry per input probe, preserving order", () => {
    const probes = canonicalProbes();
    const out = multiControllerCalibrationEngine.compareAll(probes);
    expect(out.per_dialect).toHaveLength(probes.length);
    for (let i = 0; i < probes.length; i++) {
      expect(out.per_dialect[i].dialect).toBe(probes[i].dialect);
    }
  });
});
