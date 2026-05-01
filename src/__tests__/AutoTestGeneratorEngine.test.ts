/**
 * AutoTestGeneratorEngine.test.ts — Tests for AUTO-3 Test Generation
 */

import { describe, it, expect } from "vitest";
import { autoTestGeneratorEngine } from "../engines/AutoTestGeneratorEngine.js";

describe("AutoTestGeneratorEngine", () => {
  describe("scan()", () => {
    it("returns a TestGapReport with valid structure", async () => {
      const report = await autoTestGeneratorEngine.scan();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeTruthy();
      expect(report.total_engines).toBeGreaterThan(0);
      expect(report.test_coverage).toBeGreaterThanOrEqual(0);
      expect(report.test_coverage).toBeLessThanOrEqual(1);
      expect(report.target_coverage).toBe(0.80);
      expect(Array.isArray(report.missing)).toBe(true);
    });

    it("gap equals target minus coverage", async () => {
      const report = await autoTestGeneratorEngine.scan();
      const expectedGap = Math.round((report.target_coverage - report.test_coverage) * 1000) / 1000;
      expect(report.gap).toBe(expectedGap);
    });

    it("counts sum correctly", async () => {
      const report = await autoTestGeneratorEngine.scan();
      expect(report.engines_with_tests + report.engines_without_tests).toBe(report.total_engines);
      expect(report.missing.length).toBe(report.engines_without_tests);
    });

    it("missing entries have required fields", async () => {
      const report = await autoTestGeneratorEngine.scan();
      for (const m of report.missing.slice(0, 5)) {
        expect(m.engine_file).toBeTruthy();
        expect(m.engine_name).toBeTruthy();
        expect(m.has_test).toBe(false);
        expect(Array.isArray(m.public_methods)).toBe(true);
      }
    });
  });

  describe("generate()", () => {
    it("returns generated tests in dry-run mode", async () => {
      const result = await autoTestGeneratorEngine.generate(undefined, 3, true);
      expect(result).toBeDefined();
      expect(result.dry_run).toBe(true);
      expect(result.files_written).toHaveLength(0);
      expect(Array.isArray(result.tests)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("each generated test has valid structure", async () => {
      const result = await autoTestGeneratorEngine.generate(undefined, 2, true);
      for (const t of result.tests) {
        expect(t.engine_file).toBeTruthy();
        expect(t.engine_name).toBeTruthy();
        expect(t.test_file).toContain("__tests__");
        expect(t.test_code).toContain("import { describe");
        expect(t.test_code).toContain("expect");
        expect(["physics", "business", "infra", "general"]).toContain(t.domain);
        expect(t.test_count).toBeGreaterThan(0);
      }
    });

    it("respects maxTests limit", async () => {
      const result = await autoTestGeneratorEngine.generate(undefined, 1, true);
      expect(result.tests.length).toBeLessThanOrEqual(1);
    });

    it("prioritizes physics engines", async () => {
      const result = await autoTestGeneratorEngine.generate(undefined, 10, true);
      if (result.tests.length >= 2) {
        const firstPhysics = result.tests.findIndex(t => t.domain === "physics");
        const firstNonPhysics = result.tests.findIndex(t => t.domain !== "physics");
        // If both exist, physics should come first
        if (firstPhysics >= 0 && firstNonPhysics >= 0) {
          expect(firstPhysics).toBeLessThan(firstNonPhysics);
        }
      }
    });
  });

  describe("summary()", () => {
    it("returns a human-readable string", () => {
      const summary = autoTestGeneratorEngine.summary();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
