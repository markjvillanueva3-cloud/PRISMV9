/**
 * FormulaHarvesterEngine — Tests
 * RES-MS1: Validates formula extraction from JS knowledge files
 */

import { describe, it, expect } from "vitest";
import { FormulaHarvesterEngine } from "../engines/FormulaHarvesterEngine.js";

describe("FormulaHarvesterEngine", () => {
  describe("getSources", () => {
    it("lists 3 source files", () => {
      const sources = FormulaHarvesterEngine.getSources();
      expect(sources.files).toHaveLength(3);
      expect(sources.totalExpected).toBeGreaterThan(100);
    });

    it("includes cross-disciplinary file", () => {
      const sources = FormulaHarvesterEngine.getSources();
      const xdf = sources.files.find(f => f.filename.includes("CROSS_DISCIPLINARY"));
      expect(xdf).toBeDefined();
      expect(xdf!.expectedFormulas).toBe(88);
    });

    it("includes advanced cross-domain file", () => {
      const sources = FormulaHarvesterEngine.getSources();
      const axd = sources.files.find(f => f.filename.includes("ADVANCED_CROSS_DOMAIN"));
      expect(axd).toBeDefined();
      expect(axd!.expectedFormulas).toBe(30);
    });

    it("includes university course reference file", () => {
      const sources = FormulaHarvesterEngine.getSources();
      const ucr = sources.files.find(f => f.filename.includes("UNIVERSITY_COURSE"));
      expect(ucr).toBeDefined();
      expect(ucr!.expectedFormulas).toBe(9);
    });
  });

  describe("harvest", () => {
    it("extracts formulas from all 3 files", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      expect(result.totalFormulas).toBeGreaterThanOrEqual(50);
      expect(Object.keys(result.byFile)).toHaveLength(3);
    });

    it("cross-disciplinary has the most formulas", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      const xdfCount = result.byFile["PRISM_CROSS_DISCIPLINARY_FORMULAS_v1.js"] || 0;
      expect(xdfCount).toBeGreaterThanOrEqual(30);
    });

    it("at least 95% of formulas have descriptions", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      const withDesc = result.formulas.filter(f => f.description.length > 0);
      expect(withDesc.length / result.totalFormulas).toBeGreaterThan(0.95);
    });

    it("every formula has a prismApplication", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      for (const f of result.formulas) {
        expect(f.prismApplication.length).toBeGreaterThan(0);
      }
    });

    it("every formula has a unique ID", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      const ids = result.formulas.map(f => f.formulaId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("formulas span multiple domains", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      expect(Object.keys(result.byDomain).length).toBeGreaterThanOrEqual(3);
    });

    it("some formulas have implementations", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      const withImpl = result.formulas.filter(f => f.hasImplementation);
      expect(withImpl.length).toBeGreaterThan(10);
    });

    it("some formulas have equation strings", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      const withEq = result.formulas.filter(f => f.equation.length > 0);
      expect(withEq.length).toBeGreaterThan(10);
    });

    it("registry entries are generated for all formulas", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      expect(result.registryEntries).toHaveLength(result.totalFormulas);
    });

    it("registry entries have valid formula_id format", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      for (const entry of result.registryEntries) {
        expect(entry.formula_id).toMatch(/^F-HARVEST-/);
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry.domain.length).toBeGreaterThan(0);
      }
    });

    it("registry entries have version stamp", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      for (const entry of result.registryEntries) {
        expect(entry.version).toBe("1.0.0-harvested");
      }
    });

    it("timestamp is an ISO string", async () => {
      const result = await FormulaHarvesterEngine.harvest();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("audit", () => {
    it("returns aggregate stats", async () => {
      const audit = await FormulaHarvesterEngine.audit();
      expect(audit.totalHarvested).toBeGreaterThanOrEqual(50);
      expect(audit.withImplementation).toBeGreaterThan(10);
      expect(audit.uniqueConsumers.length).toBeGreaterThan(5);
    });

    it("by-file counts match harvest total", async () => {
      const audit = await FormulaHarvesterEngine.audit();
      const fileTotal = Object.values(audit.byFile).reduce((a, b) => a + b, 0);
      expect(fileTotal).toBe(audit.totalHarvested);
    });

    it("by-domain counts match harvest total", async () => {
      const audit = await FormulaHarvesterEngine.audit();
      const domainTotal = Object.values(audit.byDomain).reduce((a, b) => a + b, 0);
      expect(domainTotal).toBe(audit.totalHarvested);
    });
  });
});
