/**
 * HyperMillThreadStandardEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-THREAD-TESTS-01
 *
 * Coverage:
 *   1. listStandards: 11 standards, 2 populated (iso_metric, ansi_unified)
 *   2. getStandard: id lookup + null on miss
 *   3. search: case-insensitive substring across designations
 *   4. findBySize: nominal+pitch combo for ISO Metric
 *   5. getTapDrill / getMinorDia: cross-standard lookups
 *   6. stats: counts match catalog
 *   7. Adversarial: empty query, unknown id, NaN size
 *   8. Reference value spot-checks (ISO 261/ANSI B1.1)
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillThreadStandardEngine,
  hyperMillThreadStandardEngine,
} from "../engines/HyperMillThreadStandardEngine.js";

const ISO_STANDARD_COUNT = 11;
const POPULATED_STANDARDS = 2; // iso_metric + ansi_unified
const M6_PITCH = 1.0;
const M6_MAJOR_DIA = 6.0;
const M6_MINOR_DIA = 4.917;
const M6_TAP_DRILL = 5.0;
const QUARTER_20_MAJOR_IN = 0.250;
const QUARTER_20_TAP_DRILL_IN = 0.201;

describe("HyperMillThreadStandardEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillThreadStandardEngine).toBe("function");
    expect(hyperMillThreadStandardEngine instanceof HyperMillThreadStandardEngine).toBe(true);
  });
});

describe("HyperMillThreadStandardEngine — listStandards()", () => {
  it("returns 11 standards", () => {
    const list = hyperMillThreadStandardEngine.listStandards();
    expect(list.length).toBe(ISO_STANDARD_COUNT);
  });

  it("includes iso_metric with populated entries", () => {
    const list = hyperMillThreadStandardEngine.listStandards();
    const iso = list.find((s) => s.id === "iso_metric");
    expect(typeof iso).toBe("object");
    expect(iso!.unit).toBe("mm");
    expect(iso!.entryCount).toBeGreaterThan(40);
    expect(iso!.name).toBe("ISO Metric Profile");
  });

  it("includes ansi_unified with populated entries", () => {
    const list = hyperMillThreadStandardEngine.listStandards();
    const ansi = list.find((s) => s.id === "ansi_unified");
    expect(typeof ansi).toBe("object");
    expect(ansi!.unit).toBe("inch");
    expect(ansi!.entryCount).toBeGreaterThan(20);
  });

  it("BSP/DIN/JIS/GB/trapezoidal/AFBMA standards have empty entries (placeholders)", () => {
    const list = hyperMillThreadStandardEngine.listStandards();
    const placeholders = ["bsp_pipe", "din_pipe", "iso_pipe", "jis_pipe", "gb_metric", "gb_pipe", "iso_trapezoidal", "ansi_metric_m", "afbma_locknuts"];
    placeholders.forEach((pid) => {
      const std = list.find((s) => s.id === pid);
      expect(typeof std).toBe("object");
      expect(std!.entryCount).toBe(0);
    });
  });
});

describe("HyperMillThreadStandardEngine — getStandard()", () => {
  it("returns iso_metric standard with all entries", () => {
    const std = hyperMillThreadStandardEngine.getStandard("iso_metric");
    expect(typeof std).toBe("object");
    expect(std!.id).toBe("iso_metric");
    expect(std!.entries.length).toBeGreaterThan(40);
  });

  it("returns null for unknown standard id", () => {
    const std = hyperMillThreadStandardEngine.getStandard("unknown_standard");
    expect(std).toBe(null);
  });

  it("returns null for empty string id", () => {
    expect(hyperMillThreadStandardEngine.getStandard("")).toBe(null);
  });
});

describe("HyperMillThreadStandardEngine — search()", () => {
  it("finds M6x1 across whitespace-stripped query", () => {
    const results = hyperMillThreadStandardEngine.search("M6x1");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].designation).toBe("M6x1");
  });

  it("is case-insensitive", () => {
    const upper = hyperMillThreadStandardEngine.search("M3X0.5");
    const lower = hyperMillThreadStandardEngine.search("m3x0.5");
    expect(upper.length).toBe(lower.length);
    expect(upper[0].designation).toBe("M3x0.5");
  });

  it("finds 1/4-20 UNC even when query is whitespace-padded", () => {
    const results = hyperMillThreadStandardEngine.search(" 1/4-20 ");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.designation === "1/4-20 UNC")).toBe(true);
  });

  it("returns empty array for non-existent thread", () => {
    const results = hyperMillThreadStandardEngine.search("M999x9");
    expect(results).toEqual([]);
  });

  it("substring match returns multiple results (M3 prefix)", () => {
    const results = hyperMillThreadStandardEngine.search("M3");
    expect(results.length).toBeGreaterThan(1);
  });
});

describe("HyperMillThreadStandardEngine — findBySize()", () => {
  it("finds all M6 entries when only nominal_dia provided", () => {
    const results = hyperMillThreadStandardEngine.findBySize(M6_MAJOR_DIA);
    expect(results.length).toBeGreaterThanOrEqual(1);
    results.forEach((r) => expect(r.majorDia).toBeCloseTo(M6_MAJOR_DIA, 6));
  });

  it("finds exactly M6x1 when nominal AND pitch provided", () => {
    const results = hyperMillThreadStandardEngine.findBySize(M6_MAJOR_DIA, M6_PITCH);
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("M6x1");
    expect(results[0].minorDia).toBe(M6_MINOR_DIA);
    expect(results[0].tapDrill).toBe(M6_TAP_DRILL);
  });

  it("finds multiple pitches at the same nominal (M10 has 3 pitches)", () => {
    const results = hyperMillThreadStandardEngine.findBySize(10);
    const pitches = results.map((r) => r.pitch).sort();
    expect(pitches).toEqual([1.0, 1.25, 1.5]);
  });

  it("returns empty for nonexistent diameter", () => {
    const results = hyperMillThreadStandardEngine.findBySize(999);
    expect(results).toEqual([]);
  });

  it("uses tolerance < 0.01 for floating-point comparison", () => {
    const results = hyperMillThreadStandardEngine.findBySize(6.0001);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("HyperMillThreadStandardEngine — getTapDrill()", () => {
  it("returns metric tap drill for M6x1", () => {
    expect(hyperMillThreadStandardEngine.getTapDrill("M6x1")).toBe(M6_TAP_DRILL);
  });

  it("returns inch tap drill for 1/4-20 UNC", () => {
    expect(hyperMillThreadStandardEngine.getTapDrill("1/4-20 UNC")).toBe(QUARTER_20_TAP_DRILL_IN);
  });

  it("is case-insensitive", () => {
    expect(hyperMillThreadStandardEngine.getTapDrill("m6x1")).toBe(M6_TAP_DRILL);
  });

  it("returns null for unknown designation", () => {
    expect(hyperMillThreadStandardEngine.getTapDrill("M999x9")).toBe(null);
  });
});

describe("HyperMillThreadStandardEngine — getMinorDia()", () => {
  it("returns minor diameter for M6x1", () => {
    expect(hyperMillThreadStandardEngine.getMinorDia("M6x1")).toBe(M6_MINOR_DIA);
  });

  it("returns null for unknown designation", () => {
    expect(hyperMillThreadStandardEngine.getMinorDia("MX-NOT-REAL")).toBe(null);
  });

  it("is case-insensitive", () => {
    expect(hyperMillThreadStandardEngine.getMinorDia("M3X0.5")).toBe(2.459);
  });
});

describe("HyperMillThreadStandardEngine — stats()", () => {
  it("returns standardCount=11 with non-zero totalEntries", () => {
    const stats = hyperMillThreadStandardEngine.stats();
    expect(stats.standardCount).toBe(ISO_STANDARD_COUNT);
    expect(stats.totalEntries).toBeGreaterThan(70);
  });

  it("populatedStandards = 2 (iso_metric + ansi_unified)", () => {
    expect(hyperMillThreadStandardEngine.stats().populatedStandards).toBe(POPULATED_STANDARDS);
  });

  it("byStandard has entries for every standard id", () => {
    const stats = hyperMillThreadStandardEngine.stats();
    expect(Object.keys(stats.byStandard).length).toBe(ISO_STANDARD_COUNT);
    expect(stats.byStandard.iso_metric).toBeGreaterThan(0);
    expect(stats.byStandard.ansi_unified).toBeGreaterThan(0);
    expect(stats.byStandard.bsp_pipe).toBe(0);
  });
});

describe("HyperMillThreadStandardEngine — reference value spot-checks (ISO 261, ANSI B1.1)", () => {
  it("M3x0.5: pitch=0.5, major=3.0, minor=2.459, tap=2.5", () => {
    const std = hyperMillThreadStandardEngine.getStandard("iso_metric");
    const m3 = std!.entries.find((e) => e.designation === "M3x0.5");
    expect(m3!.pitch).toBe(0.5);
    expect(m3!.majorDia).toBe(3.0);
    expect(m3!.minorDia).toBe(2.459);
    expect(m3!.tapDrill).toBe(2.5);
  });

  it("1/4-20 UNC: pitchUnit=tpi, major=0.250, threadClass=2B", () => {
    const std = hyperMillThreadStandardEngine.getStandard("ansi_unified");
    const q20 = std!.entries.find((e) => e.designation === "1/4-20 UNC");
    expect(q20!.pitch).toBe(20);
    expect(q20!.pitchUnit).toBe("tpi");
    expect(q20!.majorDia).toBe(QUARTER_20_MAJOR_IN);
    expect(q20!.threadClass).toBe("2B");
  });

  it("M64x6 (largest ISO entry) has pitch=6 and minor=57.505", () => {
    const std = hyperMillThreadStandardEngine.getStandard("iso_metric");
    const m64 = std!.entries.find((e) => e.designation === "M64x6");
    expect(m64!.pitch).toBe(6.0);
    expect(m64!.minorDia).toBe(57.505);
  });
});
