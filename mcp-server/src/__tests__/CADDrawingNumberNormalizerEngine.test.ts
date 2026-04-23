/**
 * CADDrawingNumberNormalizerEngine.test.ts — U-FS-06 (PHASE-47)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CADDrawingNumberNormalizerEngine } from "../engines/CADDrawingNumberNormalizerEngine.js";

describe("CADDrawingNumberNormalizerEngine (U-FS-06)", () => {
  let eng: CADDrawingNumberNormalizerEngine;

  beforeEach(() => {
    eng = new CADDrawingNumberNormalizerEngine();
  });

  describe("parse + canonicalize", () => {
    it("uppercases and swaps separators to '-'", () => {
      const p = eng.parse("alcoa.pn_100");
      expect(p.canonical).toBe("ALCOA-PN-0100");
      expect(p.prefix).toBe("ALCOA-PN");
      expect(p.numericBody).toBe("0100");
    });

    it("zero-pads numeric body to 4 digits", () => {
      expect(eng.canonicalize("PN-23")).toBe("PN-0023");
    });

    it("collapses multiple separators", () => {
      expect(eng.canonicalize("pn__100___01")).toBe("PN-0100-01");
    });

    it("strips leading/trailing separators", () => {
      expect(eng.canonicalize("_PN-100_")).toBe("PN-0100");
    });

    it("strips trailing Rev suffix", () => {
      expect(eng.canonicalize("PN-100 Rev.A")).toBe("PN-0100");
      expect(eng.canonicalize("PN-100_R3")).toBe("PN-0100");
      expect(eng.canonicalize("PN-100 v2")).toBe("PN-0100");
    });

    it("extracts config suffix", () => {
      const p = eng.parse("PN-100-01");
      expect(p.configSuffix).toBe("01");
      expect(p.familyKey).toBe("PN-0100");
    });

    it("handles no prefix (pure numeric)", () => {
      const p = eng.parse("42");
      expect(p.canonical).toBe("0042");
      expect(p.prefix).toBeUndefined();
      expect(p.numericBody).toBe("0042");
    });

    it("handles no numeric body (all letters)", () => {
      const p = eng.parse("BRACKET-A");
      expect(p.canonical).toBe("BRACKET-A");
      expect(p.numericBody).toBeUndefined();
      expect(p.familyKey).toBe("BRACKET-A");
    });

    it("rejects empty input", () => {
      expect(() => eng.parse("")).toThrow();
      expect(() => eng.parse("   ")).toThrow();
    });
  });

  describe("part-family hierarchy", () => {
    it("groups configs under the same family", () => {
      eng.register("PN-100-01");
      eng.register("PN-100-02");
      eng.register("PN-100-BASE");
      const fam = eng.getFamily("PN-0100");
      expect(fam).toBeTruthy();
      expect(fam!.drawings.sort()).toEqual([
        "PN-0100-01",
        "PN-0100-02",
        "PN-0100-BASE",
      ]);
      expect(fam!.configs.sort()).toEqual(["01", "02", "BASE"]);
    });

    it("splits distinct families", () => {
      eng.register("ALCOA-PN-100");
      eng.register("ITW-PN-100");
      expect(eng.listFamilies().length).toBe(2);
    });

    it("idempotent re-registration", () => {
      eng.register("PN-100-01");
      eng.register("PN-100-01");
      expect(eng.getFamily("PN-0100")!.drawings.length).toBe(1);
    });
  });

  describe("has + size", () => {
    it("reports exact membership", () => {
      eng.register("PN-100");
      expect(eng.has("PN-0100")).toBe(true);
      expect(eng.has("pn 100")).toBe(true); // canonicalizes to same
      expect(eng.has("PN-101")).toBe(false);
      expect(eng.size).toBe(1);
    });
  });

  describe("fuzzy find (Levenshtein ≤ 2)", () => {
    beforeEach(() => {
      eng.register("ALCOA-PN-0100");
      eng.register("ALCOA-PN-0200");
      eng.register("ITW-PN-0100");
    });

    it("returns exact match at distance 0", () => {
      const hits = eng.fuzzyFind("ALCOA-PN-0100");
      expect(hits[0].distance).toBe(0);
      expect(hits[0].score).toBe(1);
    });

    it("matches within distance 1", () => {
      const hits = eng.fuzzyFind("ALCOA-PN-0101"); // 1 char off from 0100
      const best = hits[0];
      expect(best.canonical).toBe("ALCOA-PN-0100");
      expect(best.distance).toBeLessThanOrEqual(1);
    });

    it("respects maxDistance cap", () => {
      // Distance 3+ → nothing returned with default cap of 2
      const hits = eng.fuzzyFind("ALCOA-PN-9999");
      expect(hits.length).toBe(0);
    });

    it("allows wider cap when explicitly requested", () => {
      const hits = eng.fuzzyFind("ALCOA-PN-9999", 5);
      expect(hits.length).toBeGreaterThan(0);
    });

    it("sorts results by distance ascending", () => {
      const hits = eng.fuzzyFind("ALCOA-PN-0101");
      for (let i = 1; i < hits.length; i++) {
        expect(hits[i].distance).toBeGreaterThanOrEqual(hits[i - 1].distance);
      }
    });
  });

  describe("clear", () => {
    it("empties both indexes", () => {
      eng.register("PN-100");
      eng.register("PN-200");
      eng.clear();
      expect(eng.size).toBe(0);
      expect(eng.listFamilies().length).toBe(0);
    });
  });
});
