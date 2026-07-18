/**
 * MillSurfaceFinishPanel — Ra prediction + ISO 4287 grade pure-function tests
 * ==============================================================================
 * MILL-STUDIO-MS0/U-MSTUD-B6 (oscar, 2026-05-23 iter11).
 *
 * Real numeric assertions against the documented line-of-cusps Ra formula
 * AND the ISO 4287 grade table. No mocks.
 *
 * @module __tests__/MillSurfaceFinishPanel
 */
import { describe, it, expect } from "vitest";
import {
  raTheoreticalUm,
  isoGradeForRa,
  classifyFinish,
  assessMillSurfaceFinish,
  type MillSurfaceFinishInput,
} from "../components/calculator/MillSurfaceFinishPanel.js";

describe("raTheoreticalUm — Ra = f² / (8r), µm", () => {
  it("baseline ball-nose: 0.25 mm stepover / 3.0 mm radius = 2.604 µm", () => {
    // 0.0625 / 24 = 0.002604 mm → 2.604 µm
    expect(raTheoreticalUm(0.25, 3.0)).toBeCloseTo(2.604, 2);
  });

  it("face mill: 0.1 mm/tooth feed / 0.4 mm corner = 3.125 µm", () => {
    // 0.01 / 3.2 = 0.003125 mm → 3.125 µm
    expect(raTheoreticalUm(0.1, 0.4)).toBeCloseTo(3.125, 3);
  });

  it("doubling driver → 4× Ra (quadratic in f or ae)", () => {
    const a = raTheoreticalUm(0.1, 1);
    const b = raTheoreticalUm(0.2, 1);
    expect(b / a).toBeCloseTo(4, 5);
  });

  it("doubling tool radius → halves Ra (inverse-linear in r)", () => {
    const small = raTheoreticalUm(0.1, 1);
    const big = raTheoreticalUm(0.1, 2);
    expect(small / big).toBeCloseTo(2, 5);
  });

  it("zero driver returns 0", () => {
    expect(raTheoreticalUm(0, 3)).toBe(0);
  });

  it("zero tool radius returns Infinity (fails LOUD — zero-radius cutter is undefined)", () => {
    expect(raTheoreticalUm(0.1, 0)).toBe(Infinity);
    expect(raTheoreticalUm(0.1, -1)).toBe(Infinity);
  });
});

describe("isoGradeForRa — pins the ISO 4287 ladder N1..N12", () => {
  it("0.025 µm → N1 (boundary lower bound)", () => {
    expect(isoGradeForRa(0.025)).toBe("N1");
  });

  it("0.4 µm → N5 (mirror/fine boundary)", () => {
    expect(isoGradeForRa(0.4)).toBe("N5");
  });

  it("1.6 µm → N7 (fine/general boundary — typical print spec)", () => {
    expect(isoGradeForRa(1.6)).toBe("N7");
  });

  it("3.2 µm → N8", () => {
    expect(isoGradeForRa(3.2)).toBe("N8");
  });

  it("6.3 µm → N9 (general/rough boundary)", () => {
    expect(isoGradeForRa(6.3)).toBe("N9");
  });

  it("12.5 µm → N10", () => {
    expect(isoGradeForRa(12.5)).toBe("N10");
  });

  it("50 µm → N12 (table cap)", () => {
    expect(isoGradeForRa(50)).toBe("N12");
  });

  it("> 50 µm → '>N12' (off-scale signal)", () => {
    expect(isoGradeForRa(100)).toBe(">N12");
  });

  it("Infinity / negative returns 'N/A'", () => {
    expect(isoGradeForRa(Infinity)).toBe("N/A");
    expect(isoGradeForRa(-1)).toBe("N/A");
  });
});

describe("classifyFinish — zone bucketer", () => {
  it("Ra ≤ 0.4 µm → mirror", () => {
    expect(classifyFinish(0.1)).toBe("mirror");
    expect(classifyFinish(0.4)).toBe("mirror");
  });

  it("0.4 < Ra ≤ 1.6 µm → fine", () => {
    expect(classifyFinish(0.8)).toBe("fine");
    expect(classifyFinish(1.6)).toBe("fine");
  });

  it("1.6 < Ra ≤ 6.3 µm → general", () => {
    expect(classifyFinish(2.5)).toBe("general");
    expect(classifyFinish(6.3)).toBe("general");
  });

  it("Ra > 6.3 µm → rough", () => {
    expect(classifyFinish(10)).toBe("rough");
    expect(classifyFinish(50)).toBe("rough");
  });

  it("Infinity / negative falls into rough", () => {
    expect(classifyFinish(Infinity)).toBe("rough");
    expect(classifyFinish(-1)).toBe("rough");
  });
});

describe("assessMillSurfaceFinish — full pipeline", () => {
  const BALL_BASE: MillSurfaceFinishInput = {
    mode: "ball-nose",
    feed_per_tooth_mm: 0.1, // unused in ball-nose
    stepover_mm: 0.25,
    tool_radius_mm: 3.0,
    target_ra_um: 3.2,
  };

  const FACE_BASE: MillSurfaceFinishInput = {
    mode: "face",
    feed_per_tooth_mm: 0.1,
    stepover_mm: 0.25, // unused in face
    tool_radius_mm: 0.8,
    target_ra_um: 3.2,
  };

  it("ball-nose baseline: Ra = 2.604 µm, ISO = N8, zone = general", () => {
    const r = assessMillSurfaceFinish(BALL_BASE);
    expect(r.ra_theoretical_um).toBeCloseTo(2.604, 2);
    expect(r.iso_grade).toBe("N8");
    expect(r.zone).toBe("general");
  });

  it("ball-nose baseline: margin = (3.2 − 2.604) / 3.2 = 0.186 (18.6% headroom)", () => {
    const r = assessMillSurfaceFinish(BALL_BASE);
    expect(r.margin).toBeCloseTo(0.186, 2);
  });

  it("face mill uses feed_per_tooth, not stepover (mode contract)", () => {
    const r = assessMillSurfaceFinish(FACE_BASE);
    // 0.01 / (8 × 0.8) = 0.001563 mm → 1.563 µm (not 2.604)
    expect(r.ra_theoretical_um).toBeCloseTo(1.563, 2);
    expect(r.iso_grade).toBe("N7");
    expect(r.zone).toBe("fine");
  });

  it("over-target Ra: recommendation names the corrective driver value", () => {
    // tiny radius blows Ra up
    const r = assessMillSurfaceFinish({ ...BALL_BASE, tool_radius_mm: 0.5, target_ra_um: 1.6 });
    // Ra = 0.0625/(8×0.5)×1000 = 15.625 µm >> 1.6
    expect(r.ra_theoretical_um).toBeGreaterThan(r.margin === 0 ? 1.6 : 1.6);
    expect(r.recommendation.toLowerCase()).toMatch(/reduce|increase tool radius/);
  });

  it("under-target with > 20% margin: 'comfortable' message", () => {
    // tighten stepover for headroom
    const r = assessMillSurfaceFinish({ ...BALL_BASE, stepover_mm: 0.1, target_ra_um: 1.6 });
    // Ra = 0.01/24×1000 = 0.417 µm → margin 74%
    expect(r.margin).toBeGreaterThan(0.20);
    expect(r.recommendation.toLowerCase()).toContain("comfortable");
  });

  it("tight margin (< 20% under target): 'runout will eat this' warning", () => {
    const r = assessMillSurfaceFinish({ ...BALL_BASE, stepover_mm: 0.24, target_ra_um: 2.5 });
    // Ra = 0.0576/24×1000 = 2.4 µm; margin = (2.5-2.4)/2.5 = 0.04 (4%)
    expect(r.margin).toBeGreaterThan(0);
    expect(r.margin).toBeLessThan(0.20);
    expect(r.recommendation.toLowerCase()).toContain("runout");
  });

  it("target_ra=0 ('no target'): margin = 0 + 'No target set' message", () => {
    const r = assessMillSurfaceFinish({ ...BALL_BASE, target_ra_um: 0 });
    expect(r.margin).toBe(0);
    expect(r.recommendation.toLowerCase()).toMatch(/no target/);
  });

  it("zero tool radius → Ra = Infinity → zone = rough (fail-LOUD)", () => {
    const r = assessMillSurfaceFinish({ ...BALL_BASE, tool_radius_mm: 0 });
    expect(r.ra_theoretical_um).toBe(Infinity);
    expect(r.zone).toBe("rough");
    expect(r.iso_grade).toBe("N/A");
  });
});
