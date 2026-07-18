/**
 * boring-bar-overhang.test.ts -- slot:whiskey  [U-W2K]
 * Locks the boring-bar overhang model fixed by the closed-loop finding U-W2J: overhang is governed by
 * REACH TO THE BORE BOTTOM (feature depth), capped at part length so it NEVER exceeds the legacy
 * part_length*1.2 model. This relieves false-positive deflection flags on blind bores WITHOUT softening
 * the check for genuinely deep/through bores. Advisory deflection pre-check; not a hard emit gate.
 */
import { describe, it, expect } from "vitest";
import { boringBarOverhangMm, groovePartStickoutMm, requiredPartingBladeMm } from "../engines/TurningPrintToProgramEngine.js";

const FACTOR = 1.2; // holder-to-face gap + clearance (documented in the helper)

describe("boringBarOverhangMm", () => {
  // ---- HAPPY: blind bore uses bore depth, not part length ----
  it("blind bore (depth 10mm in a 100mm part) -> overhang 12mm (was 120mm under the part-length model)", () => {
    expect(boringBarOverhangMm({ depth_mm: 10 }, 100)).toBeCloseTo(12, 5);
  });
  it("through bore (depth == part length) -> overhang == legacy part_length*1.2 (unchanged)", () => {
    expect(boringBarOverhangMm({ depth_mm: 100 }, 100)).toBeCloseTo(120, 5);
  });

  // ---- the relief is real: L/D drops below the flag threshold for a shallow bore ----
  it("a 12mm overhang on a 12mm bar gives L/D 1.0 (within tol) vs legacy L/D 10 (flagged)", () => {
    const barDia = 12;
    const blind = boringBarOverhangMm({ depth_mm: 10 }, 100) / barDia; // 1.0
    const legacy = (100 * FACTOR) / barDia;                           // 10.0
    expect(blind).toBeCloseTo(1.0, 5);
    expect(legacy).toBeCloseTo(10.0, 5);
    expect(blind).toBeLessThan(4); // below the L/D>4 boring-deflection flag
  });

  // ---- FAILURE MODE 1: no feature found -> conservative part-length fallback ----
  it("undefined feature -> falls back to part_length*1.2 (legacy/conservative, no relief)", () => {
    expect(boringBarOverhangMm(undefined, 80)).toBeCloseTo(96, 5);
  });
  // ---- FAILURE MODE 2: depth_mm absent -> uses length_mm ----
  it("no depth_mm but length_mm present -> uses length_mm", () => {
    expect(boringBarOverhangMm({ length_mm: 25 }, 100)).toBeCloseTo(30, 5);
  });
  // ---- FAILURE MODE 3: depth_mm = 0 -> falls through to length, then part ----
  it("depth_mm 0 -> falls through to length_mm; both absent -> part_length", () => {
    expect(boringBarOverhangMm({ depth_mm: 0, length_mm: 15 }, 100)).toBeCloseTo(18, 5);
    expect(boringBarOverhangMm({ depth_mm: 0 }, 100)).toBeCloseTo(120, 5);
  });

  // ---- ADVERSARIAL 1: negative / NaN depth never used (guarded by >0) ----
  it("negative or NaN depth is ignored -> conservative fallback (never a tiny overhang)", () => {
    expect(boringBarOverhangMm({ depth_mm: -5 }, 100)).toBeCloseTo(120, 5);
    expect(boringBarOverhangMm({ depth_mm: NaN, length_mm: NaN }, 100)).toBeCloseTo(120, 5);
  });
  // ---- ADVERSARIAL 2: depth exceeding part length is CAPPED (never exceeds legacy) ----
  it("depth > part_length is capped at part_length (overhang never exceeds the legacy model)", () => {
    expect(boringBarOverhangMm({ depth_mm: 500 }, 100)).toBeCloseTo(120, 5);
  });

  // ---- SAFETY INVARIANT (never-soften): overhang ALWAYS <= legacy part_length*1.2 ----
  it("INVARIANT: overhang is always <= the legacy part_length*1.2 (relief-only, never less safe)", () => {
    const partLengths = [20, 50, 100, 250];
    const depths = [1, 5, 10, 30, 60, 99, 100, 200, NaN, -3, 0];
    for (const L of partLengths) {
      const legacy = L * FACTOR;
      for (const d of depths) {
        const o = boringBarOverhangMm({ depth_mm: d }, L);
        expect(o).toBeLessThanOrEqual(legacy + 1e-9); // never exceeds the prior, more-conservative model
        expect(o).toBeGreaterThan(0);                 // always a positive, finite overhang
        expect(Number.isFinite(o)).toBe(true);
      }
    }
  });
});

describe("groovePartStickoutMm", () => {
  const CLR = 3; // helper's blade-base/over-travel clearance

  // ---- HAPPY: parting reaches the part center; grooving reaches the groove bottom ----
  it("parting (part OD 25mm) -> reach = 25/2 + 3 = 15.5mm (was a flat 40mm)", () => {
    expect(groovePartStickoutMm("part_off", 25, undefined, 40)).toBeCloseTo(12.5 + CLR, 5);
  });
  it("grooving (groove depth 3mm) -> reach = 3 + 3 = 6mm (was 40mm)", () => {
    expect(groovePartStickoutMm("groove_od", 50, 3, 40)).toBeCloseTo(6, 5);
  });

  // ---- the relief is real: ratio drops below the parting/grooving limit ----
  it("parting stickout 15.5mm / blade 3mm = 5.2x (< 6x limit) vs legacy 40/3 = 13.3x (flagged)", () => {
    const blade = 3;
    expect(groovePartStickoutMm("part_off", 25, undefined, 40) / blade).toBeCloseTo(5.17, 1);
    expect((40 / blade)).toBeGreaterThan(6); // legacy flagged
  });

  // ---- FAILURE MODES: unknown groove depth / big part -> conservative cap (no relief) ----
  it("grooving with UNKNOWN depth -> stays at the conservative fallback 40 (no under-estimation)", () => {
    expect(groovePartStickoutMm("groove_od", 50, undefined, 40)).toBeCloseTo(40, 5);
  });
  it("a big part needing reach > fallback is CAPPED at the fallback (part OD 100 -> 53 capped to 40)", () => {
    expect(groovePartStickoutMm("part_off", 100, undefined, 40)).toBeCloseTo(40, 5);
    expect(groovePartStickoutMm("groove_od", 50, 80, 40)).toBeCloseTo(40, 5);
  });
  it("non-groove/part op (turning/boring) -> fallback unchanged", () => {
    expect(groovePartStickoutMm("od_rough", 25, undefined, 40)).toBeCloseTo(40, 5);
  });

  // ---- ADVERSARIAL: negative/NaN/zero geometry -> conservative fallback, never a tiny stickout ----
  it("negative/NaN/zero groove depth -> conservative fallback (never masks a real overhang)", () => {
    expect(groovePartStickoutMm("groove_od", 50, -5, 40)).toBeCloseTo(40, 5);
    expect(groovePartStickoutMm("groove_od", 50, NaN, 40)).toBeCloseTo(40, 5);
    expect(groovePartStickoutMm("groove_od", 50, 0, 40)).toBeCloseTo(40, 5);
  });
  it("zero/negative part OD for parting -> conservative fallback", () => {
    expect(groovePartStickoutMm("part_off", 0, undefined, 40)).toBeCloseTo(40, 5);
  });

  // ---- SAFETY INVARIANT (never-soften): stickout ALWAYS <= the legacy fallback ----
  it("INVARIANT: stickout is always <= the legacy flat default (relief-only, never less safe)", () => {
    const ods = [10, 25, 60, 200];
    const depths: (number | undefined)[] = [1, 3, 5, 20, 50, 100, undefined, NaN, -2, 0];
    for (const od of ods) {
      for (const d of depths) {
        for (const op of ["part_off", "groove_od", "groove_id"]) {
          const s = groovePartStickoutMm(op, od, d, 40);
          expect(s).toBeLessThanOrEqual(40 + 1e-9); // never exceeds the prior, more-conservative default
          expect(s).toBeGreaterThan(0);
          expect(Number.isFinite(s)).toBe(true);
        }
      }
    }
  });
});

describe("requiredPartingBladeMm", () => {
  // ---- HAPPY: the required standard blade steps up with bar OD ----
  it("small bar (OD 25.4) -> 3mm blade; mid (OD 40) -> 4mm; (OD 50) -> 5mm; (OD 60) -> 6mm", () => {
    expect(requiredPartingBladeMm(25.4)).toBe(3);
    expect(requiredPartingBladeMm(40)).toBe(4);
    expect(requiredPartingBladeMm(50)).toBe(5);
    expect(requiredPartingBladeMm(60)).toBe(6);
  });

  // ---- the SPEC completes: with the required blade, a feasible bar passes the 6:1 ratio ----
  it("a feasible bar passes the 6:1 ratio with its required blade (OD 50 -> stickout 28 / 5mm = 5.6 <= 6)", () => {
    const od = 50;
    const stickout = groovePartStickoutMm("part_off", od, undefined, 40); // 28
    const blade = requiredPartingBladeMm(od); // 5
    expect(stickout / blade).toBeLessThanOrEqual(6);
  });

  // ---- NEVER-SOFTEN: an oversized bar still EXCEEDS the ratio even at the 6mm cap (still flags) ----
  it("oversized bar (OD 100): blade caps at 6mm and the ratio STILL exceeds 6 -> still flags", () => {
    const od = 100;
    const blade = requiredPartingBladeMm(od);
    expect(blade).toBe(6); // capped at the widest standard
    const stickout = groovePartStickoutMm("part_off", od, undefined, 40); // 40 (capped)
    expect(stickout / blade).toBeGreaterThan(6); // 40/6 = 6.67 -> the collision check STILL flags it
  });

  // ---- ADVERSARIAL: NaN/negative/zero OD -> a wide (conservative) blade, never a tiny one ----
  it("NaN/negative/zero OD -> conservative wide blade (never a 3mm that masks a large-bar overhang)", () => {
    // stickout falls back to ~40 (the cap) -> needs the widest blade; ratio still flags -> safe.
    expect(requiredPartingBladeMm(NaN)).toBe(6);
    expect(requiredPartingBladeMm(-10)).toBe(6);
    expect(requiredPartingBladeMm(0)).toBe(6);
  });

  // ---- SAFETY INVARIANT: the returned blade is always a standard width in [3,6] ----
  it("INVARIANT: returns a standard blade in {3,4,5,6} for any OD (never < 3 or > 6)", () => {
    for (const od of [5, 25, 35, 50, 65, 120, 300, NaN, -5, 0]) {
      const b = requiredPartingBladeMm(od);
      expect([3, 4, 5, 6]).toContain(b);
    }
  });
});
