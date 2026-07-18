/**
 * sfc-combinatorial-axes — axis-integrity tests.
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-01-AXES-EXTRACT (slot:oscar, 2026-06-04).
 *
 * These are the canonical SFC variability axes shared by the 103-case matrix,
 * the 401-gauntlet, and the combinatorial harness. A dropped/renamed axis member
 * would silently shrink coverage, so each assertion PINS the exact cardinality
 * and membership (deterministic value-pins, not presence checks — R9).
 */
import { describe, it, expect } from "vitest";
import {
  ISO_BANDS, TOOL_MATERIALS, OPERATIONS, CUT_TYPES, STRATEGIES, COOLANTS,
  DIAMETER_SWEEP_MM, FLUTE_SWEEP, MACHINE_POWER_KW, HARDNESS_HB_SWEEP,
} from "./sfc-combinatorial-axes.js";

describe("sfc-combinatorial-axes — axis integrity", () => {
  it("ISO_BANDS covers all 6 ISO groups exactly once, in canonical P,M,K,N,S,H order", () => {
    expect(ISO_BANDS.map((b) => b.iso)).toEqual(["P", "M", "K", "N", "S", "H"]);
  });

  it("every ISO band is a valid ordered interval (min < max) with positive speeds", () => {
    for (const { iso, vcBand } of ISO_BANDS) {
      expect(vcBand[0]).toBeGreaterThan(0); // iso=${iso}
      expect(vcBand[1]).toBeGreaterThan(vcBand[0]);
    }
    // Cross-case physics ordering of the band ceilings: aluminum (N) is the
    // fastest-cutting group, titanium (S) the slowest — a known catalogue fact.
    const max = (g: string) => ISO_BANDS.find((b) => b.iso === g)!.vcBand[1];
    expect(max("N")).toBeGreaterThan(max("P"));
    expect(max("P")).toBeGreaterThan(max("S"));
  });

  it("TOOL_MATERIALS = the 6 canonical tool-material classes", () => {
    expect(TOOL_MATERIALS).toEqual(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]);
  });

  it("OPERATIONS = the 7 machining operations (incl. drilling, the broken-regime guard target)", () => {
    expect(OPERATIONS).toEqual([
      "milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling",
    ]);
    expect(OPERATIONS).toContain("drilling");
  });

  it("CUT_TYPES = roughing/semi_finishing/finishing", () => {
    expect(CUT_TYPES).toEqual(["roughing", "semi_finishing", "finishing"]);
  });

  it("STRATEGIES = the 7 toolpath strategies", () => {
    expect(STRATEGIES).toEqual([
      "conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot",
    ]);
  });

  it("COOLANTS = the 7 coolant states", () => {
    expect(COOLANTS).toEqual([
      "flood", "mist", "mql", "air_blast", "dry", "through_tool", "cryogenic",
    ]);
  });

  it("numeric sweeps are strictly ascending and span their stated ranges", () => {
    const ascending = (a: number[]) => a.every((v, i) => i === 0 || v > a[i - 1]!);
    expect(ascending(DIAMETER_SWEEP_MM)).toBe(true);
    expect(ascending(FLUTE_SWEEP)).toBe(true);
    expect(ascending(MACHINE_POWER_KW)).toBe(true);
    expect(ascending(HARDNESS_HB_SWEEP)).toBe(true);
    // Span endpoints (catch a silently truncated sweep).
    expect(DIAMETER_SWEEP_MM[0]).toBe(1);
    expect(DIAMETER_SWEEP_MM[DIAMETER_SWEEP_MM.length - 1]).toBe(80);
    expect(FLUTE_SWEEP[0]).toBe(2);
    expect(FLUTE_SWEEP[FLUTE_SWEEP.length - 1]).toBe(8);
    expect(MACHINE_POWER_KW[0]).toBe(3);
    expect(MACHINE_POWER_KW[MACHINE_POWER_KW.length - 1]).toBe(30);
    expect(HARDNESS_HB_SWEEP[0]).toBe(150);
    expect(HARDNESS_HB_SWEEP[HARDNESS_HB_SWEEP.length - 1]).toBe(420);
  });

  it("axis cardinalities are exactly as documented (coverage contract)", () => {
    expect(ISO_BANDS).toHaveLength(6);
    expect(TOOL_MATERIALS).toHaveLength(6);
    expect(OPERATIONS).toHaveLength(7);
    expect(CUT_TYPES).toHaveLength(3);
    expect(STRATEGIES).toHaveLength(7);
    expect(COOLANTS).toHaveLength(7);
    expect(DIAMETER_SWEEP_MM).toHaveLength(10);
    expect(FLUTE_SWEEP).toHaveLength(7);
    expect(MACHINE_POWER_KW).toHaveLength(6);
    expect(HARDNESS_HB_SWEEP).toHaveLength(6);
  });

  it("no duplicate members within any enumerated axis", () => {
    const uniq = (a: readonly unknown[]) => new Set(a).size === a.length;
    expect(uniq(TOOL_MATERIALS)).toBe(true);
    expect(uniq(OPERATIONS)).toBe(true);
    expect(uniq(CUT_TYPES)).toBe(true);
    expect(uniq(STRATEGIES)).toBe(true);
    expect(uniq(COOLANTS)).toBe(true);
    expect(uniq(DIAMETER_SWEEP_MM)).toBe(true);
  });
});
