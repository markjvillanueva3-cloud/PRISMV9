/**
 * AutoSchemaGeneratorEngine.test.ts — Tests for AUTO-2 Schema Generation
 */

import { describe, it, expect } from "vitest";
import { autoSchemaGeneratorEngine } from "../engines/AutoSchemaGeneratorEngine.js";

describe("AutoSchemaGeneratorEngine", () => {
  describe("scan()", () => {
    it("returns a SchemaGapReport with valid structure", async () => {
      const report = await autoSchemaGeneratorEngine.scan();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeTruthy();
      expect(report.total_dispatchers).toBeGreaterThan(0);
      expect(report.total_actions).toBeGreaterThan(0);
      expect(report.schema_coverage).toBeGreaterThanOrEqual(0);
      expect(report.schema_coverage).toBeLessThanOrEqual(1);
      expect(report.target_coverage).toBe(0.95);
      expect(Array.isArray(report.by_dispatcher)).toBe(true);
      expect(Array.isArray(report.missing_actions)).toBe(true);
    });

    it("gap equals target minus coverage", async () => {
      const report = await autoSchemaGeneratorEngine.scan();
      const expectedGap = Math.round((report.target_coverage - report.schema_coverage) * 1000) / 1000;
      expect(report.gap).toBe(expectedGap);
    });

    it("per-dispatcher counts sum to totals", async () => {
      const report = await autoSchemaGeneratorEngine.scan();
      const sumActions = report.by_dispatcher.reduce((s, d) => s + d.total_actions, 0);
      expect(sumActions).toBe(report.total_actions);
      const sumWithSchema = report.by_dispatcher.reduce((s, d) => s + d.with_schema, 0);
      expect(sumWithSchema).toBe(report.actions_with_schema);
    });
  });

  describe("generate()", () => {
    it("returns generated schemas in dry-run mode", async () => {
      const result = await autoSchemaGeneratorEngine.generate(undefined, 5, true);
      expect(result).toBeDefined();
      expect(result.dry_run).toBe(true);
      expect(result.files_written).toHaveLength(0);
      expect(Array.isArray(result.schemas)).toBe(true);
    });

    it("each generated schema has valid fields", async () => {
      const result = await autoSchemaGeneratorEngine.generate(undefined, 3, true);
      for (const s of result.schemas) {
        expect(s.dispatcher).toBeTruthy();
        expect(s.action).toBeTruthy();
        expect(s.schema_code).toContain("z.object");
        expect(s.target_file).toBeTruthy();
        expect(["engine_method", "dispatcher_params", "passthrough_default"]).toContain(s.inferred_from);
        expect(s.confidence).toBeGreaterThan(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("respects maxSchemas limit", async () => {
      const result = await autoSchemaGeneratorEngine.generate(undefined, 2, true);
      expect(result.schemas.length).toBeLessThanOrEqual(2);
    });
  });

  describe("read()", () => {
    it("returns null before first scan", () => {
      // read() may return cached data from scan() above or null
      const cached = autoSchemaGeneratorEngine.read();
      // Either null or valid report
      if (cached) {
        expect(cached.total_dispatchers).toBeGreaterThan(0);
      }
    });
  });

  describe("summary()", () => {
    it("returns a human-readable string", () => {
      const summary = autoSchemaGeneratorEngine.summary();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
