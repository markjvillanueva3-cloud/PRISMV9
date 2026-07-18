/**
 * BladeProfileLibraryEngine tests — U-CADC13
 *
 * Exit-criteria coverage:
 *   1. Engine builds (construction) ✓
 *   2. 200+ profiles loaded ✓
 *   3. NACA 4-digit formula generation ✓ (symmetric + cambered)
 *   4. Coordinate interpolation validated ✓
 *
 * Plus:
 *   - NACA 5-digit canonical (23012) generation
 *   - Formula numerical cross-checks against published values
 *   - Parsing / error handling
 *   - Catalog query filters
 *   - Cache invariance
 *   - Contour ordering
 *   - End-to-end: every catalog entry generates without throwing
 */

import { describe, it, expect } from "vitest";
import {
  BladeProfileLibraryEngine,
  bladeProfileLibraryEngine,
  AirfoilParseError,
} from "../engines/BladeProfileLibraryEngine.js";

describe("BladeProfileLibraryEngine", () => {
  const eng = new BladeProfileLibraryEngine();

  describe("catalog", () => {
    it("exposes ≥200 profile catalog entries", () => {
      expect(eng.profileCount()).toBeGreaterThanOrEqual(200);
    });

    it("covers both NACA families", () => {
      const families = new Set(eng.listCatalog().map((e) => e.family));
      expect(families.has("naca-4")).toBe(true);
      expect(families.has("naca-5")).toBe(true);
    });

    it("query by thickness returns a non-empty window", () => {
      const results = eng.query({ thicknessPct: 12, thicknessToleranceAbs: 0 });
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) expect(r.thicknessPct).toBe(12);
    });

    it("query by family filters correctly", () => {
      const only5 = eng.query({ family: "naca-5" });
      expect(only5.length).toBeGreaterThan(0);
      for (const r of only5) expect(r.family).toBe("naca-5");
    });

    it("query by exact designation returns the single entry", () => {
      const hits = eng.query({ designation: "NACA 2412" });
      expect(hits).toHaveLength(1);
      expect(hits[0]!.thicknessPct).toBe(12);
    });
  });

  describe("NACA 4-digit symmetric (NACA 0012)", () => {
    const p = eng.getProfile("NACA 0012", 120);

    it("generates the requested sample count per surface", () => {
      expect(p.upper).toHaveLength(120);
      expect(p.lower).toHaveLength(120);
    });

    it("max thickness ≈ 12% chord (at ~30% chord)", () => {
      // Full thickness is upper.y − lower.y at the same x for symmetric.
      let maxT = 0;
      for (let i = 0; i < p.upper.length; i++) {
        const gap = p.upper[i]!.y - p.lower[i]!.y;
        if (gap > maxT) maxT = gap;
      }
      expect(maxT).toBeGreaterThan(0.115);
      expect(maxT).toBeLessThan(0.13);
    });

    it("leading edge and trailing edge land on chord (y≈0)", () => {
      expect(Math.abs(p.upper[0]!.y)).toBeLessThan(1e-3);
      expect(Math.abs(p.lower[0]!.y)).toBeLessThan(1e-3);
      // Trailing edge is open per classical 4-digit definition — non-zero but tiny.
      expect(Math.abs(p.upper[p.upper.length - 1]!.y)).toBeLessThan(0.002);
    });

    it("symmetric across chord line — upper.y = −lower.y at every index", () => {
      for (let i = 0; i < p.upper.length; i++) {
        expect(p.upper[i]!.y).toBeCloseTo(-p.lower[i]!.y, 9);
      }
    });
  });

  describe("NACA 4-digit cambered (NACA 2412)", () => {
    const p = eng.getProfile("NACA 2412", 120);

    it("records canonical metadata", () => {
      expect(p.family).toBe("naca-4");
      expect(p.maxCamber).toBeCloseTo(0.02, 9);
      expect(p.maxCamberPos).toBeCloseTo(0.4, 9);
      expect(p.thickness).toBeCloseTo(0.12, 9);
    });

    it("upper surface lies above lower over the whole chord", () => {
      for (let i = 0; i < p.upper.length; i++) {
        expect(p.upper[i]!.y).toBeGreaterThan(p.lower[i]!.y - 1e-9);
      }
    });

    it("max camber ≈ 2% at x≈0.4 (matches designation 2-4-12)", () => {
      // Camber line ≈ average of upper + lower at each x-sample.
      let maxC = 0;
      let atX = 0;
      for (let i = 0; i < p.upper.length; i++) {
        const xAvg = 0.5 * (p.upper[i]!.x + p.lower[i]!.x);
        const yAvg = 0.5 * (p.upper[i]!.y + p.lower[i]!.y);
        if (yAvg > maxC) {
          maxC = yAvg;
          atX = xAvg;
        }
      }
      expect(maxC).toBeGreaterThan(0.018);
      expect(maxC).toBeLessThan(0.022);
      expect(atX).toBeGreaterThan(0.35);
      expect(atX).toBeLessThan(0.45);
    });
  });

  describe("NACA 5-digit (NACA 23012)", () => {
    const p = eng.getProfile("NACA 23012", 120);

    it("parses as 5-digit with 12% thickness", () => {
      expect(p.family).toBe("naca-5");
      expect(p.thickness).toBeCloseTo(0.12, 9);
    });

    it("upper surface lies above lower across the whole chord", () => {
      for (let i = 0; i < p.upper.length; i++) {
        expect(p.upper[i]!.y).toBeGreaterThan(p.lower[i]!.y - 1e-9);
      }
    });

    it("max thickness ≈ 12% chord", () => {
      let maxT = 0;
      for (let i = 0; i < p.upper.length; i++) {
        maxT = Math.max(maxT, p.upper[i]!.y - p.lower[i]!.y);
      }
      expect(maxT).toBeGreaterThan(0.115);
      expect(maxT).toBeLessThan(0.13);
    });
  });

  describe("interpolate", () => {
    const p = eng.getProfile("NACA 0012", 80);

    it("returns sampled value at known sample points", () => {
      // Pick an interior sample and re-interpolate at exactly its x.
      const mid = p.upper[40]!;
      const y = eng.interpolate(p, mid.x, "upper");
      expect(y).toBeCloseTo(mid.y, 9);
    });

    it("interpolation at x=0 returns ~0 (LE)", () => {
      expect(eng.interpolate(p, 0, "upper")).toBeCloseTo(0, 6);
      expect(eng.interpolate(p, 0, "lower")).toBeCloseTo(0, 6);
    });

    it("interpolation at x=1 returns ~0 (TE)", () => {
      // Open TE per NACA — tiny but close to zero.
      expect(Math.abs(eng.interpolate(p, 1, "upper"))).toBeLessThan(0.002);
      expect(Math.abs(eng.interpolate(p, 1, "lower"))).toBeLessThan(0.002);
    });

    it("rejects out-of-range x with RangeError", () => {
      expect(() => eng.interpolate(p, -0.1, "upper")).toThrow(RangeError);
      expect(() => eng.interpolate(p, 1.1, "upper")).toThrow(RangeError);
      expect(() => eng.interpolate(p, Number.NaN, "upper")).toThrow(RangeError);
    });
  });

  describe("parsing / errors", () => {
    it("rejects malformed designation", () => {
      expect(() => eng.getProfile("MILF 2412")).toThrow(AirfoilParseError);
      expect(() => eng.getProfile("NACA 24")).toThrow(AirfoilParseError);
    });

    it("rejects zero thickness", () => {
      expect(() => eng.getProfile("NACA 0000")).toThrow(AirfoilParseError);
    });

    it("rejects unsupported 5-digit mean lines", () => {
      expect(() => eng.getProfile("NACA 44112")).toThrow(AirfoilParseError);
    });

    it("is case-insensitive / whitespace-tolerant", () => {
      const a = eng.getProfile("naca 2412");
      const b = eng.getProfile("NACA  2412");
      expect(a.designation).toBe("NACA 2412");
      expect(b.designation).toBe("NACA 2412");
    });
  });

  describe("NACA 6-series detection + canGenerate (U-BLISK-6SERIES-PARSE)", () => {
    it("throws a SPECIFIC 6-series error for NACA 65-010 (not the generic 4/5-digit message)", () => {
      try {
        eng.getProfile("NACA 65-010");
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(AirfoilParseError);
        const msg = (e as Error).message;
        expect(msg).toContain("6-series");
        // Must NOT fall through to the generic catch-all message.
        expect(msg).not.toContain("expected 'NACA <4-or-5-digits>'");
      }
    });

    it("throws the 6-series error for 65-012, 65(216)-010, and 64A010", () => {
      for (const d of ["NACA 65-012", "NACA 65(216)-010", "NACA 64A010"]) {
        expect(() => eng.getProfile(d), d).toThrow(AirfoilParseError);
      }
    });

    it("does NOT misclassify a valid 4-digit NACA 6512 as 6-series", () => {
      // 6512 = M6 P5 t12, a real catalog entry; the 6-series detector keys on
      // the dash / 'A' modifier, which a 4-digit designation never carries.
      const p = eng.getProfile("NACA 6512", 40);
      expect(p.family).toBe("naca-4");
      expect(p.thickness).toBeCloseTo(0.12, 9);
      expect(p.maxCamber).toBeCloseTo(0.06, 9);
    });

    it("canGenerate returns ok:true for supported 4- and 5-digit profiles", () => {
      expect(eng.canGenerate("NACA 0012").ok).toBe(true);
      expect(eng.canGenerate("NACA 2412").ok).toBe(true);
      expect(eng.canGenerate("NACA 23012").ok).toBe(true);
    });

    it("canGenerate returns ok:false (no throw) for 6-series with an honest reason", () => {
      const r = eng.canGenerate("NACA 65-010");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("6-series");
    });

    it("canGenerate returns ok:false for an unsupported 5-digit mean-line", () => {
      const r = eng.canGenerate("NACA 44112");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("mean-line");
    });

    it("canGenerate returns ok:false for malformed designations and never throws", () => {
      for (const d of ["MILF 2412", "NACA 24", "NACA 0000", ""]) {
        expect(() => eng.canGenerate(d)).not.toThrow();
        expect(eng.canGenerate(d).ok).toBe(false);
      }
    });

    it("canGenerate(d).ok agrees with getProfile(d) not throwing (round-trip invariant)", () => {
      for (const d of ["NACA 0010", "NACA 2412", "NACA 23012", "NACA 65-010", "NACA 44112"]) {
        const can = eng.canGenerate(d).ok;
        let threw = false;
        try { eng.getProfile(d, 20); } catch { threw = true; }
        expect(can, d).toBe(!threw);
      }
    });
  });

  describe("cache + contour", () => {
    it("returns the same object reference on repeat calls", () => {
      const a = eng.getProfile("NACA 0012", 40);
      const b = eng.getProfile("NACA 0012", 40);
      expect(a).toBe(b);
    });

    it("contour is ordered upper-TE → LE → lower-TE", () => {
      const p = eng.getProfile("NACA 2412", 60);
      // Cambered TE is slightly off-chord due to theta rotation — loose tol.
      expect(p.contour[0]!.x).toBeCloseTo(1, 2);
      expect(p.contour[p.contour.length - 1]!.x).toBeCloseTo(1, 2);
      // LE should appear once, near middle index.
      let minX = Infinity;
      let minIdx = 0;
      for (let i = 0; i < p.contour.length; i++) {
        if (p.contour[i]!.x < minX) {
          minX = p.contour[i]!.x;
          minIdx = i;
        }
      }
      expect(minX).toBeCloseTo(0, 2);
      expect(minIdx).toBeGreaterThan(0);
      expect(minIdx).toBeLessThan(p.contour.length - 1);
    });
  });

  describe("end-to-end catalog generation", () => {
    it("every catalog entry generates without throwing and produces valid geometry", () => {
      for (const entry of eng.listCatalog()) {
        const p = eng.getProfile(entry.designation, 20);
        expect(p.upper.length).toBe(20);
        expect(p.lower.length).toBe(20);
        // Upper above lower over chord (modulo rounding at TE).
        for (let i = 0; i < p.upper.length; i++) {
          expect(p.upper[i]!.y).toBeGreaterThan(p.lower[i]!.y - 1e-6);
        }
      }
    });
  });

  describe("singleton", () => {
    it("exported singleton behaves identically", () => {
      const a = bladeProfileLibraryEngine.getProfile("NACA 2412", 40);
      const b = new BladeProfileLibraryEngine().getProfile("NACA 2412", 40);
      expect(a.thickness).toBe(b.thickness);
      expect(a.maxCamber).toBe(b.maxCamber);
    });
  });
});
