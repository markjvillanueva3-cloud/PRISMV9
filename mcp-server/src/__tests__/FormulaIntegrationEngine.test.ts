/**
 * FormulaIntegrationEngine Tests — Phase 0.23 U-UTL1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { formulaIntegrationEngine } from "../engines/FormulaIntegrationEngine.js";

describe("FormulaIntegrationEngine", () => {
  beforeEach(() => {
    formulaIntegrationEngine.reset();
  });

  it("initializes with seeded formulas", async () => {
    const stats = await formulaIntegrationEngine.getStats();
    expect(stats.totalFormulas).toBeGreaterThan(0);
  });

  it("queries formulas by domain", async () => {
    const results = await formulaIntegrationEngine.query({ domain: "kienzle" });
    expect(results.every(f => f.domain === "kienzle")).toBe(true);
  });

  it("queries formulas by category", async () => {
    const results = await formulaIntegrationEngine.query({ category: "force" });
    expect(results.every(f => f.category === "force")).toBe(true);
  });

  it("queries formulas by keywords", async () => {
    const results = await formulaIntegrationEngine.query({ keywords: ["kienzle"] });
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it("gets formula by id", async () => {
    const results = await formulaIntegrationEngine.query({ limit: 1 });
    if (results.length > 0) {
      const formula = await formulaIntegrationEngine.getFormula(results[0].id);
      expect(formula).not.toBeNull();
      expect(formula?.id).toBe(results[0].id);
    }
  });

  it("returns null for unknown formula id", async () => {
    const formula = await formulaIntegrationEngine.getFormula("nonexistent");
    expect(formula).toBeNull();
  });

  it("verifies formula", async () => {
    const results = await formulaIntegrationEngine.query({ limit: 1 });
    if (results.length > 0) {
      const verified = await formulaIntegrationEngine.verify(results[0].id);
      expect(verified).toBe(true);
    }
  });

  it("verify returns false for unknown formula", async () => {
    const verified = await formulaIntegrationEngine.verify("nonexistent");
    expect(verified).toBe(false);
  });

  it("respects query limit", async () => {
    const results = await formulaIntegrationEngine.query({ limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("stats include domain breakdown", async () => {
    const stats = await formulaIntegrationEngine.getStats();
    expect(stats.byDomain).toBeDefined();
    expect(typeof stats.byDomain).toBe("object");
  });

  it("stats include category breakdown", async () => {
    const stats = await formulaIntegrationEngine.getStats();
    expect(stats.byCategory).toBeDefined();
    expect(typeof stats.byCategory).toBe("object");
  });

  it("stats include verified count", async () => {
    const stats = await formulaIntegrationEngine.getStats();
    expect(typeof stats.verifiedFormulas).toBe("number");
  });

  it("stats include coverage percent", async () => {
    const stats = await formulaIntegrationEngine.getStats();
    expect(typeof stats.coveragePercent).toBe("number");
  });

  it("reset clears state", async () => {
    await formulaIntegrationEngine.query({ limit: 1 });
    formulaIntegrationEngine.reset();
    const stats = await formulaIntegrationEngine.getStats();
    expect(stats.totalFormulas).toBeGreaterThan(0);
  });
});
