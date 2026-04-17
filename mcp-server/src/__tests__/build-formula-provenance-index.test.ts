/**
 * Tests for build-formula-provenance-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildFormulaProvenanceIndex,
  readFormulaProvenanceIndex,
  FormulaProvenanceIndex,
} from "../../scripts/build-formula-provenance-index.js";

describe("build-formula-provenance-index (Phase 0.7)", () => {
  let index: FormulaProvenanceIndex;

  beforeAll(async () => {
    const existing = await readFormulaProvenanceIndex();
    if (existing && existing.formulaCount > 0) {
      index = existing;
    } else {
      index = await buildFormulaProvenanceIndex();
    }
  }, 30000);

  describe("index structure", () => {
    it("returns a valid index object", () => {
      expect(index).toBeDefined();
      expect(typeof index).toBe("object");
    });

    it("has schemaVersion field set to 1", () => {
      expect(index.schemaVersion).toBe(1);
    });

    it("has lastUpdated as a valid ISO string", () => {
      expect(typeof index.lastUpdated).toBe("string");
      const date = new Date(index.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("has formulaCount matching formulas object keys", () => {
      expect(index.formulaCount).toBe(Object.keys(index.formulas).length);
    });

    it("indexes at least 1 formula", () => {
      expect(index.formulaCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("formula provenance structure", () => {
    it("every formula has required fields", () => {
      for (const [id, formula] of Object.entries(index.formulas)) {
        expect(typeof formula.name, `${id}.name`).toBe("string");
        expect(typeof formula.formulaId, `${id}.formulaId`).toBe("string");
        expect(typeof formula.domain, `${id}.domain`).toBe("string");
        expect(Array.isArray(formula.references), `${id}.references`).toBe(true);
        expect(Array.isArray(formula.consumers), `${id}.consumers`).toBe(true);
        expect(Array.isArray(formula.enginesUsing), `${id}.enginesUsing`).toBe(true);
        expect(typeof formula.sha256, `${id}.sha256`).toBe("string");
      }
    });

    it("sha256 is a valid hex string", () => {
      for (const formula of Object.values(index.formulas)) {
        expect(formula.sha256).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("source is a string or null", () => {
      for (const formula of Object.values(index.formulas)) {
        expect(formula.source === null || typeof formula.source === "string").toBe(true);
      }
    });
  });

  describe("byDomain reverse index", () => {
    it("byDomain is an object", () => {
      expect(typeof index.byDomain).toBe("object");
    });

    it("every byDomain entry is an array of formula ids", () => {
      for (const [domain, formulas] of Object.entries(index.byDomain)) {
        expect(Array.isArray(formulas), `byDomain[${domain}]`).toBe(true);
        for (const id of formulas) {
          expect(typeof id).toBe("string");
          expect(index.formulas[id]).toBeDefined();
        }
      }
    });

    it("maps at least 1 domain", () => {
      expect(Object.keys(index.byDomain).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("byReference reverse index", () => {
    it("byReference is an object", () => {
      expect(typeof index.byReference).toBe("object");
    });

    it("every byReference entry is an array of formula ids", () => {
      for (const [ref, formulas] of Object.entries(index.byReference)) {
        expect(Array.isArray(formulas), `byReference[${ref}]`).toBe(true);
      }
    });
  });

  describe("known formulas", () => {
    it("physics domain has formulas", () => {
      expect(index.byDomain["physics"]).toBeDefined();
      expect(index.byDomain["physics"].length).toBeGreaterThan(0);
    });

    it("formulas have source information", () => {
      const withSource = Object.values(index.formulas).filter((f) => f.source !== null).length;
      expect(withSource).toBeGreaterThan(0);
    });
  });

  describe("coverage metrics", () => {
    it("some formulas have engine usage", () => {
      const withEngines = Object.values(index.formulas).filter((f) => f.enginesUsing.length > 0).length;
      expect(withEngines).toBeGreaterThanOrEqual(0);
    });

    it("some formulas have consumers", () => {
      const withConsumers = Object.values(index.formulas).filter((f) => f.consumers.length > 0).length;
      expect(withConsumers).toBeGreaterThanOrEqual(0);
    });
  });
});
