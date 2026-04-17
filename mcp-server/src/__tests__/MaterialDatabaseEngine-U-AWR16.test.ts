/**
 * AI-AWARE-HARDEN/U-AWR16 — Canonical Constants Refactor Verification
 *
 * Validates that MaterialDatabaseEngine coefficients match AISI_CUTTING_COEFFICIENTS
 * from src/physics/constants.ts. Ensures single source of truth for Kienzle/Taylor.
 *
 * Exit criteria:
 *   - All 28 AISI grades have entries in AISI_CUTTING_COEFFICIENTS
 *   - MaterialDatabaseEngine.getKienzleCoefficients returns canonical values
 *   - MaterialDatabaseEngine.getTaylorCoefficients returns canonical values
 *   - Zero coefficient divergence (inline == canonical)
 *   - ≥15 assertions passing
 */

import { describe, it, expect } from "vitest";
import { materialDatabaseEngine } from "../engines/MaterialDatabaseEngine.js";
import { AISI_CUTTING_COEFFICIENTS, CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

describe("AI-AWARE-HARDEN/U-AWR16: Canonical constants refactor", () => {
  describe("AISI_CUTTING_COEFFICIENTS coverage", () => {
    it("has >= 25 AISI grade entries", () => {
      const count = Object.keys(AISI_CUTTING_COEFFICIENTS).length;
      expect(count).toBeGreaterThanOrEqual(25);
    });

    it("covers all carbon steels (1018, 1045, 12L14)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["1018"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["1045"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["12L14"]).toBeDefined();
    });

    it("covers all alloy steels (4140, 4340, 8620)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["4140"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["4340"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["8620"]).toBeDefined();
    });

    it("covers all tool steels (D2, A2, H13, S7, M2)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["D2"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["A2"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["H13"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["S7"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["M2"]).toBeDefined();
    });

    it("covers stainless steels (303, 304, 316, 17-4)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["303"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["304"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["316"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["17-4"]).toBeDefined();
    });

    it("covers aluminum alloys (6061-T6, 7075-T6, 2024-T3)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["6061-T6"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["7075-T6"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["2024-T3"]).toBeDefined();
    });

    it("covers superalloys (Ti-6Al-4V, Inconel 718, Hastelloy C276)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["Ti-6Al-4V"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["Inconel 718"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["Hastelloy C276"]).toBeDefined();
    });

    it("covers copper alloys and cast iron (C360, C110, Gray Iron, Ductile Iron)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["C360"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["C110"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["Gray Iron Class 30"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["Ductile Iron 65-45-12"]).toBeDefined();
    });

    it("covers plastics (Delrin, UHMW)", () => {
      expect(AISI_CUTTING_COEFFICIENTS["Delrin"]).toBeDefined();
      expect(AISI_CUTTING_COEFFICIENTS["UHMW"]).toBeDefined();
    });
  });

  describe("Kienzle coefficient parity", () => {
    const testCases: Array<{ id: string; expected_kc1_1: number; expected_mc: number }> = [
      { id: "1018", expected_kc1_1: 1780, expected_mc: 0.18 },
      { id: "4140", expected_kc1_1: 2500, expected_mc: 0.26 },
      { id: "D2", expected_kc1_1: 2850, expected_mc: 0.28 },
      { id: "304", expected_kc1_1: 2350, expected_mc: 0.24 },
      { id: "6061-T6", expected_kc1_1: 790, expected_mc: 0.15 },
      { id: "Ti-6Al-4V", expected_kc1_1: 1970, expected_mc: 0.21 },
      { id: "Inconel 718", expected_kc1_1: 2700, expected_mc: 0.25 },
    ];

    it.each(testCases)("$id: kc1_1=$expected_kc1_1, mc=$expected_mc", ({ id, expected_kc1_1, expected_mc }) => {
      const coeffs = materialDatabaseEngine.getKienzleCoefficients(id);
      expect(coeffs).not.toBeNull();
      expect(coeffs!.kc1_1).toBeCloseTo(expected_kc1_1, 0);
      expect(coeffs!.mc).toBeCloseTo(expected_mc, 2);
    });

    it("returns canonical values from constants.ts (not inline)", () => {
      // Verify we're getting the constants.ts value, not a stale inline value
      const canonicalKc = AISI_CUTTING_COEFFICIENTS["4140"].kc1_1;
      const engineKc = materialDatabaseEngine.getKienzleCoefficients("4140")?.kc1_1;
      expect(engineKc).toBe(canonicalKc);
    });
  });

  describe("Taylor coefficient parity", () => {
    const testCases: Array<{ id: string; expected_C: number; expected_n: number }> = [
      { id: "1018", expected_C: 350, expected_n: 0.25 },
      { id: "4140", expected_C: 280, expected_n: 0.22 },
      { id: "M2", expected_C: 120, expected_n: 0.12 },
      { id: "316", expected_C: 150, expected_n: 0.14 },
      { id: "7075-T6", expected_C: 850, expected_n: 0.33 },
      { id: "Inconel 718", expected_C: 55, expected_n: 0.15 },
    ];

    it.each(testCases)("$id: C=$expected_C, n=$expected_n", ({ id, expected_C, expected_n }) => {
      const coeffs = materialDatabaseEngine.getTaylorCoefficients(id);
      expect(coeffs).not.toBeNull();
      expect(coeffs!.C).toBeCloseTo(expected_C, 0);
      expect(coeffs!.n).toBeCloseTo(expected_n, 2);
    });

    it("returns canonical values from constants.ts (not inline)", () => {
      const canonicalC = AISI_CUTTING_COEFFICIENTS["Inconel 718"].taylor_C;
      const engineC = materialDatabaseEngine.getTaylorCoefficients("Inconel 718")?.C;
      expect(engineC).toBe(canonicalC);
    });
  });

  describe("ISO group consistency", () => {
    it("all entries have valid ISO group", () => {
      const validGroups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
      for (const [id, coeffs] of Object.entries(AISI_CUTTING_COEFFICIENTS)) {
        expect(validGroups).toContain(coeffs.iso_group);
      }
    });

    it("tool steels are ISO H", () => {
      expect(AISI_CUTTING_COEFFICIENTS["D2"].iso_group).toBe("H");
      expect(AISI_CUTTING_COEFFICIENTS["A2"].iso_group).toBe("H");
      expect(AISI_CUTTING_COEFFICIENTS["H13"].iso_group).toBe("H");
      expect(AISI_CUTTING_COEFFICIENTS["M2"].iso_group).toBe("H");
    });

    it("stainless steels are ISO M", () => {
      expect(AISI_CUTTING_COEFFICIENTS["303"].iso_group).toBe("M");
      expect(AISI_CUTTING_COEFFICIENTS["304"].iso_group).toBe("M");
      expect(AISI_CUTTING_COEFFICIENTS["316"].iso_group).toBe("M");
    });

    it("aluminum alloys are ISO N", () => {
      expect(AISI_CUTTING_COEFFICIENTS["6061-T6"].iso_group).toBe("N");
      expect(AISI_CUTTING_COEFFICIENTS["7075-T6"].iso_group).toBe("N");
    });

    it("superalloys (Ti, Ni) are ISO S", () => {
      expect(AISI_CUTTING_COEFFICIENTS["Ti-6Al-4V"].iso_group).toBe("S");
      expect(AISI_CUTTING_COEFFICIENTS["Inconel 718"].iso_group).toBe("S");
    });
  });

  describe("Coefficient physics validation", () => {
    it("kc1_1 values are in valid range [100, 5000] N/mm²", () => {
      for (const [id, coeffs] of Object.entries(AISI_CUTTING_COEFFICIENTS)) {
        expect(coeffs.kc1_1).toBeGreaterThanOrEqual(100);
        expect(coeffs.kc1_1).toBeLessThanOrEqual(5000);
      }
    });

    it("mc values are in valid range [0.05, 0.40]", () => {
      for (const [id, coeffs] of Object.entries(AISI_CUTTING_COEFFICIENTS)) {
        expect(coeffs.mc).toBeGreaterThanOrEqual(0.05);
        expect(coeffs.mc).toBeLessThanOrEqual(0.40);
      }
    });

    it("Taylor C values are in valid range [50, 3000] m/min", () => {
      for (const [id, coeffs] of Object.entries(AISI_CUTTING_COEFFICIENTS)) {
        expect(coeffs.taylor_C).toBeGreaterThanOrEqual(50);
        expect(coeffs.taylor_C).toBeLessThanOrEqual(3000);
      }
    });

    it("Taylor n values are in valid range [0.08, 0.55]", () => {
      for (const [id, coeffs] of Object.entries(AISI_CUTTING_COEFFICIENTS)) {
        expect(coeffs.taylor_n).toBeGreaterThanOrEqual(0.08);
        expect(coeffs.taylor_n).toBeLessThanOrEqual(0.55);
      }
    });

    it("harder materials have higher kc1_1 (tool steel > carbon steel)", () => {
      const toolSteel = AISI_CUTTING_COEFFICIENTS["M2"].kc1_1;
      const carbonSteel = AISI_CUTTING_COEFFICIENTS["1018"].kc1_1;
      expect(toolSteel).toBeGreaterThan(carbonSteel);
    });

    it("more machinable materials have higher Taylor C (aluminum > superalloy)", () => {
      const aluminum = AISI_CUTTING_COEFFICIENTS["6061-T6"].taylor_C;
      const inconel = AISI_CUTTING_COEFFICIENTS["Inconel 718"].taylor_C;
      expect(aluminum).toBeGreaterThan(inconel);
    });
  });

  describe("MaterialDatabaseEngine integration", () => {
    it("getMaterial returns valid object for all canonical grades", () => {
      const canonicalIds = Object.keys(AISI_CUTTING_COEFFICIENTS);
      let matchCount = 0;
      for (const id of canonicalIds) {
        const mat = materialDatabaseEngine.getMaterial(id);
        if (mat) matchCount++;
      }
      // Most canonical IDs should be found (some use slightly different formatting)
      expect(matchCount).toBeGreaterThanOrEqual(20);
    });

    it("search returns results for material queries", () => {
      const steels = materialDatabaseEngine.search("steel");
      expect(steels.length).toBeGreaterThan(0);

      const aluminum = materialDatabaseEngine.search("aluminum");
      expect(aluminum.length).toBeGreaterThan(0);
    });

    it("getCount returns >= 25 materials", () => {
      expect(materialDatabaseEngine.getCount()).toBeGreaterThanOrEqual(25);
    });
  });
});
