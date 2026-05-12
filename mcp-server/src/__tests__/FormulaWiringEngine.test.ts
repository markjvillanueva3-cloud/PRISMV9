/**
 * FormulaWiringEngine — Tests
 * Validates formula-to-engine wiring infrastructure
 */

import { describe, it, expect, beforeAll } from "vitest";
import { FormulaWiringEngine, formulaWiringEngine } from "../engines/FormulaWiringEngine.js";

describe("FormulaWiringEngine", () => {
  // Use a fresh instance for isolated tests
  let engine: FormulaWiringEngine;

  beforeAll(async () => {
    engine = new FormulaWiringEngine();
    await engine.initialize();
  });

  describe("initialization", () => {
    it("initializes without error", async () => {
      const testEngine = new FormulaWiringEngine();
      await expect(testEngine.initialize()).resolves.not.toThrow();
    });

    it("can be initialized multiple times safely", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();
      await testEngine.initialize(); // Should be a no-op
      const stats = await testEngine.getStats();
      expect(stats.totalFormulas).toBeGreaterThan(0);
    });
  });

  describe("listUnwiredFormulas", () => {
    it("returns array of formulas", async () => {
      const unwired = await engine.listUnwiredFormulas();
      expect(Array.isArray(unwired)).toBe(true);
    });

    it("unwired formulas have formula_id", async () => {
      const unwired = await engine.listUnwiredFormulas();
      for (const formula of unwired.slice(0, 10)) {
        expect(formula.formula_id).toBeDefined();
        expect(typeof formula.formula_id).toBe("string");
      }
    });

    it("unwired count is less than total", async () => {
      const unwired = await engine.listUnwiredFormulas();
      const stats = await engine.getStats();
      expect(unwired.length).toBeLessThan(stats.totalFormulas);
    });
  });

  describe("listWiredFormulas", () => {
    it("returns array of search results", async () => {
      const wired = await engine.listWiredFormulas();
      expect(Array.isArray(wired)).toBe(true);
      expect(wired.length).toBeGreaterThan(0);
    });

    it("wired formulas have wiring info", async () => {
      const wired = await engine.listWiredFormulas();
      const first = wired[0];
      expect(first.formula).toBeDefined();
      expect(first.wiring).toBeDefined();
      expect(Array.isArray(first.wiring)).toBe(true);
      expect(first.wiring.length).toBeGreaterThan(0);
    });

    it("results are sorted by consumer count descending", async () => {
      const wired = await engine.listWiredFormulas();
      for (let i = 1; i < Math.min(wired.length, 10); i++) {
        expect(wired[i - 1].consumerCount).toBeGreaterThanOrEqual(wired[i].consumerCount);
      }
    });
  });

  describe("getFormulaConsumers", () => {
    it("returns consumers for Kienzle formula", async () => {
      const consumers = await engine.getFormulaConsumers("F-KIENZLE-001");
      expect(consumers.length).toBeGreaterThan(0);
      expect(consumers.some(c => c.engineId.includes("CuttingForce") || c.engineId.includes("Manufacturing"))).toBe(true);
    });

    it("returns empty array for unknown formula", async () => {
      const consumers = await engine.getFormulaConsumers("F-NONEXISTENT-999");
      expect(consumers).toEqual([]);
    });

    it("consumers have required properties", async () => {
      const consumers = await engine.getFormulaConsumers("F-TAYLOR-001");
      for (const consumer of consumers) {
        expect(consumer.formulaId).toBe("F-TAYLOR-001");
        expect(consumer.engineId).toBeDefined();
        expect(consumer.source).toMatch(/^(auto|manual|inferred)$/);
        expect(consumer.confidence).toBeGreaterThan(0);
        expect(consumer.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("getEngineFormulas", () => {
    it("returns formulas for ManufacturingCalculations", async () => {
      const formulas = await engine.getEngineFormulas("ManufacturingCalculations");
      expect(formulas.length).toBeGreaterThan(0);
    });

    it("returns empty array for unknown engine", async () => {
      const formulas = await engine.getEngineFormulas("NonExistentEngine");
      expect(formulas).toEqual([]);
    });
  });

  describe("wireFormula", () => {
    it("creates manual wiring", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      const wiring = await testEngine.wireFormula("F-MRR-001", "TestEngine");
      expect(wiring.formulaId).toBe("F-MRR-001");
      expect(wiring.engineId).toBe("TestEngine");
      expect(wiring.source).toBe("manual");
      expect(wiring.confidence).toBe(1.0);
    });

    it("respects custom confidence", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      const wiring = await testEngine.wireFormula("F-POWER-001", "CustomEngine", {
        confidence: 0.75,
        source: "auto"
      });
      expect(wiring.confidence).toBe(0.75);
      expect(wiring.source).toBe("auto");
    });

    it("throws for unknown formula", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      await expect(
        testEngine.wireFormula("F-INVALID-999", "AnyEngine")
      ).rejects.toThrow("not found");
    });

    it("does not duplicate wirings", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      await testEngine.wireFormula("F-SURFACE-001", "DupeEngine");
      await testEngine.wireFormula("F-SURFACE-001", "DupeEngine");

      const consumers = await testEngine.getFormulaConsumers("F-SURFACE-001");
      const dupeCount = consumers.filter(c => c.engineId === "DupeEngine").length;
      expect(dupeCount).toBe(1);
    });
  });

  describe("unwireFormula", () => {
    it("removes existing wiring", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      await testEngine.wireFormula("F-CHIPTHK-001", "RemoveMe");
      const removed = await testEngine.unwireFormula("F-CHIPTHK-001", "RemoveMe");
      expect(removed).toBe(true);

      const consumers = await testEngine.getFormulaConsumers("F-CHIPTHK-001");
      expect(consumers.some(c => c.engineId === "RemoveMe")).toBe(false);
    });

    it("returns false for non-existent wiring", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      const removed = await testEngine.unwireFormula("F-DEFLECT-001", "NeverWired");
      expect(removed).toBe(false);
    });
  });

  describe("getFormulasByDomain", () => {
    it("returns physics domain formulas", async () => {
      const results = await engine.getFormulasByDomain("physics");
      expect(results.length).toBeGreaterThan(0);
      for (const r of results.slice(0, 5)) {
        expect(r.formula.domain).toBe("physics");
      }
    });

    it("returns manufacturing domain formulas", async () => {
      const results = await engine.getFormulasByDomain("manufacturing");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for unknown domain", async () => {
      const results = await engine.getFormulasByDomain("nonexistent_domain");
      expect(results.length).toBe(0);
    });
  });

  describe("getFormulasByCategory", () => {
    it("returns cutting_force category formulas", async () => {
      const results = await engine.getFormulasByCategory("cutting_force");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns tool_life category formulas", async () => {
      const results = await engine.getFormulasByCategory("tool_life");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("validateFormula", () => {
    it("validates Kienzle inputs correctly", async () => {
      const result = await engine.validateFormula("F-KIENZLE-001", {
        kc1_1: 1800,
        mc: 0.25,
        h: 0.1,
        b: 4.0
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.missingInputs.length).toBe(0);
    });

    it("detects missing required inputs", async () => {
      const result = await engine.validateFormula("F-KIENZLE-001", {
        kc1_1: 1800
        // missing mc, h, b
      });
      expect(result.valid).toBe(false);
      expect(result.missingInputs.length).toBeGreaterThan(0);
    });

    it("warns on out-of-range values", async () => {
      const result = await engine.validateFormula("F-KIENZLE-001", {
        kc1_1: 1800,
        mc: 0.25,
        h: 10.0, // above range max of 2.0
        b: 4.0
      });
      expect(result.outOfRangeInputs.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("handles unknown formula gracefully", async () => {
      const result = await engine.validateFormula("F-NONEXISTENT-999", { x: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("not found"))).toBe(true);
    });

    it("rejects NaN inputs", async () => {
      const result = await engine.validateFormula("F-KIENZLE-001", {
        kc1_1: NaN,
        mc: 0.25,
        h: 0.1,
        b: 4.0
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("executeFormula", () => {
    it("executes Kienzle formula correctly", async () => {
      const trace = await engine.executeFormula("F-KIENZLE-001", {
        kc1_1: 1800,
        mc: 0.25,
        h: 0.1,
        b: 4.0
      });
      expect(trace.formulaId).toBe("F-KIENZLE-001");
      expect(trace.output).toBeGreaterThan(0);
      expect(trace.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(trace.validationResult.valid).toBe(true);
    });

    it("traces consuming engines", async () => {
      const trace = await engine.executeFormula("F-KIENZLE-001", {
        kc1_1: 1800,
        mc: 0.25,
        h: 0.1,
        b: 4.0
      });
      expect(trace.consumingEngines.length).toBeGreaterThan(0);
    });

    it("handles invalid inputs gracefully", async () => {
      const trace = await engine.executeFormula("F-KIENZLE-001", {
        kc1_1: 1800
        // missing required inputs
      });
      expect(trace.validationResult.valid).toBe(false);
      expect(Number.isNaN(trace.output)).toBe(true);
    });

    it("executes Taylor formula", async () => {
      const trace = await engine.executeFormula("F-TAYLOR-001", {
        V: 200,
        n: 0.25,
        C: 300
      });
      expect(trace.output).toBeCloseTo(5.06, 1);
    });

    it("executes MRR formula", async () => {
      const trace = await engine.executeFormula("F-MRR-001", {
        ap: 2,
        ae: 10,
        vf: 500
      });
      expect(trace.output).toBe(10000);
    });
  });

  describe("getWiringReport", () => {
    it("returns comprehensive report", async () => {
      const report = await engine.getWiringReport();

      expect(report.totalFormulas).toBeGreaterThan(0);
      expect(report.wiredCount).toBeGreaterThan(0);
      expect(report.wiringPercentage).toBeGreaterThan(0);
      expect(report.wiringPercentage).toBeLessThanOrEqual(100);
    });

    it("includes domain breakdown", async () => {
      const report = await engine.getWiringReport();
      expect(Object.keys(report.byDomain).length).toBeGreaterThan(0);

      for (const [domain, stats] of Object.entries(report.byDomain)) {
        expect(stats.total).toBeGreaterThanOrEqual(stats.wired);
        expect(stats.unwired).toBe(stats.total - stats.wired);
      }
    });

    it("includes top consumers", async () => {
      const report = await engine.getWiringReport();
      expect(report.topConsumers.length).toBeGreaterThan(0);

      for (const consumer of report.topConsumers) {
        expect(consumer.engineId).toBeDefined();
        expect(consumer.formulaCount).toBeGreaterThan(0);
      }
    });

    it("includes auto-wired pattern stats", async () => {
      const report = await engine.getWiringReport();
      expect(report.autoWiredPatterns.length).toBeGreaterThan(0);

      for (const pattern of report.autoWiredPatterns) {
        expect(pattern.pattern).toBeDefined();
        expect(pattern.count).toBeGreaterThan(0);
      }
    });
  });

  describe("searchFormulas", () => {
    it("finds formulas by keyword", async () => {
      const results = await engine.searchFormulas("kienzle");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.formula.formula_id === "F-KIENZLE-001")).toBe(true);
    });

    it("finds formulas by domain", async () => {
      const results = await engine.searchFormulas("thermal");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for no matches", async () => {
      const results = await engine.searchFormulas("xyznonexistent123");
      expect(results.length).toBe(0);
    });
  });

  describe("getDomains", () => {
    it("returns domain list with counts", async () => {
      const domains = await engine.getDomains();
      expect(domains.length).toBeGreaterThan(0);

      for (const d of domains) {
        expect(d.domain).toBeDefined();
        expect(d.total).toBeGreaterThan(0);
        expect(d.wired).toBeLessThanOrEqual(d.total);
      }
    });

    it("is sorted by total descending", async () => {
      const domains = await engine.getDomains();
      for (let i = 1; i < domains.length; i++) {
        expect(domains[i - 1].total).toBeGreaterThanOrEqual(domains[i].total);
      }
    });
  });

  describe("bulkWireByPattern", () => {
    it("wires multiple formulas by pattern", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      const result = await testEngine.bulkWireByPattern(/EDM/i, "BulkEDMEngine");
      expect(result.wired).toBeGreaterThanOrEqual(0);
    });

    it("skips already wired formulas", async () => {
      const testEngine = new FormulaWiringEngine();
      await testEngine.initialize();

      // First pass
      await testEngine.bulkWireByPattern(/THERMAL/i, "ThermalBulk");
      // Second pass
      const result = await testEngine.bulkWireByPattern(/THERMAL/i, "ThermalBulk");
      expect(result.skipped).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("returns summary statistics", async () => {
      const stats = await engine.getStats();

      expect(stats.totalFormulas).toBeGreaterThan(0);
      expect(stats.wiredFormulas).toBeGreaterThan(0);
      expect(stats.unwiredFormulas).toBeGreaterThanOrEqual(0);
      expect(stats.totalEngines).toBeGreaterThan(0);
      expect(stats.totalWirings).toBeGreaterThanOrEqual(stats.wiredFormulas);
      expect(stats.avgWiringsPerFormula).toBeGreaterThan(0);
    });

    it("unwired + wired equals total", async () => {
      const stats = await engine.getStats();
      expect(stats.wiredFormulas + stats.unwiredFormulas).toBe(stats.totalFormulas);
    });
  });

  describe("singleton instance", () => {
    it("formulaWiringEngine singleton exists", () => {
      expect(formulaWiringEngine).toBeDefined();
      expect(formulaWiringEngine).toBeInstanceOf(FormulaWiringEngine);
    });

    it("singleton can be initialized", async () => {
      await expect(formulaWiringEngine.initialize()).resolves.not.toThrow();
    });
  });
});
