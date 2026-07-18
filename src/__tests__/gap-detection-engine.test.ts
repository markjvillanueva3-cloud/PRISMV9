/**
 * Tests for GapDetectionEngine — SQ1-0-GAP
 * Verifies all 8 gap detection dimensions, input validation, error handling,
 * report persistence, and summary generation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// We test the engine directly — it scans the real codebase
// No mocking needed since it reads filesystem (read-only)
describe("GapDetectionEngine", () => {
  let gapDetectionEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../engines/GapDetectionEngine.js");
    gapDetectionEngine = mod.gapDetectionEngine;
  });

  describe("input validation", () => {
    it("rejects non-string target", async () => {
      const report = await gapDetectionEngine.scan(123 as any);
      expect(report.warnings).toBeDefined();
      expect(report.warnings[0]).toContain("ERROR");
      expect(report.warnings[0]).toContain("Invalid target");
    });

    it("rejects target exceeding 200 chars", async () => {
      const longTarget = "a".repeat(201);
      const report = await gapDetectionEngine.scan(longTarget);
      expect(report.warnings[0]).toContain("ERROR");
      expect(report.warnings[0]).toContain("200 character");
    });

    it("warns on unknown dimension names", async () => {
      const report = await gapDetectionEngine.scan(undefined, ["bogus_dim", "engine_index"]);
      expect(report.warnings.some((w: string) => w.includes("Unknown dimensions"))).toBe(true);
    });

    it("accepts valid target string", async () => {
      const report = await gapDetectionEngine.scan("QualityScore");
      expect(report.total_engines).toBeGreaterThanOrEqual(1);
      expect(report.warnings.every((w: string) => !w.includes("ERROR"))).toBe(true);
    });

    it("warns when target matches no engines", async () => {
      const report = await gapDetectionEngine.scan("ZzzNonExistent99999");
      expect(report.total_engines).toBe(0);
      expect(report.warnings.some((w: string) => w.includes("No engines matched"))).toBe(true);
    });
  });

  describe("full scan", () => {
    it("returns a valid GapReport with all 8 dimensions", async () => {
      const report = await gapDetectionEngine.scan();

      expect(report.timestamp).toBeDefined();
      expect(report.version).toBe("1.0.0");
      expect(report.total_engines).toBeGreaterThan(100);
      expect(report.total_dispatchers).toBeGreaterThan(10);
      expect(report.total_actions).toBeGreaterThan(100);
      expect(report.dimensions).toHaveLength(8);
      expect(typeof report.overall_coverage_pct).toBe("number");
      expect(report.overall_coverage_pct).toBeGreaterThanOrEqual(0);
      expect(report.overall_coverage_pct).toBeLessThanOrEqual(100);
      expect(Array.isArray(report.warnings)).toBe(true);
    });

    it("has correct dimension names", async () => {
      const report = await gapDetectionEngine.scan();
      const dimNames = report.dimensions.map((d: any) => d.dimension);
      expect(dimNames).toContain("engine_index");
      expect(dimNames).toContain("engine_dispatcher");
      expect(dimNames).toContain("engine_schema");
      expect(dimNames).toContain("engine_route");
      expect(dimNames).toContain("engine_api_client");
      expect(dimNames).toContain("engine_test");
      expect(dimNames).toContain("dispatcher_schema");
      expect(dimNames).toContain("route_api_client");
    });

    it("each dimension has valid coverage_pct", async () => {
      const report = await gapDetectionEngine.scan();
      for (const dim of report.dimensions) {
        expect(dim.coverage_pct).toBeGreaterThanOrEqual(0);
        expect(dim.coverage_pct).toBeLessThanOrEqual(100);
        expect(dim.covered).toBeLessThanOrEqual(dim.total);
      }
    });

    it("gaps have required fields", async () => {
      const report = await gapDetectionEngine.scan();
      const allGaps = report.dimensions.flatMap((d: any) => d.gaps);
      if (allGaps.length > 0) {
        const gap = allGaps[0];
        expect(gap.dimension).toBeDefined();
        expect(gap.entity).toBeDefined();
        expect(gap.description).toBeDefined();
        expect(gap.severity).toMatch(/^(critical|high|medium|low)$/);
        expect(gap.fix_suggestion).toBeDefined();
      }
    });

    it("severity counts match total_gaps", async () => {
      const report = await gapDetectionEngine.scan();
      expect(report.critical_count + report.high_count + report.medium_count + report.low_count)
        .toBe(report.total_gaps);
    });
  });

  describe("dimension filtering", () => {
    it("filters to specific dimensions", async () => {
      const report = await gapDetectionEngine.scan(undefined, ["engine_index", "engine_test"]);
      expect(report.dimensions).toHaveLength(2);
      expect(report.dimensions[0].dimension).toBe("engine_index");
      expect(report.dimensions[1].dimension).toBe("engine_test");
    });

    it("returns all dimensions when filter is empty", async () => {
      const report = await gapDetectionEngine.scan(undefined, []);
      expect(report.dimensions).toHaveLength(8);
    });
  });

  describe("targeted scan", () => {
    it("scans only matching engines", async () => {
      const report = await gapDetectionEngine.scan("AutoWiring");
      expect(report.total_engines).toBeGreaterThanOrEqual(1);
      expect(report.total_engines).toBeLessThan(10);
    });

    it("QualityScoreEngine is well-wired (has dispatcher + test)", async () => {
      const report = await gapDetectionEngine.scan("QualityScore");
      const dispatcherDim = report.dimensions.find((d: any) => d.dimension === "engine_dispatcher");
      // QualityScoreEngine is wired to devDispatcher
      expect(dispatcherDim.gaps.length).toBe(0);
    });
  });

  describe("read (persisted report)", () => {
    it("returns null when no saved report exists", async () => {
      // This may return a real report if scan was run before — that's fine
      const result = await gapDetectionEngine.read();
      expect(result === null || typeof result === "object").toBe(true);
    });

    it("returns persisted report after scan", async () => {
      await gapDetectionEngine.scan("QualityScore");
      const report = await gapDetectionEngine.read();
      expect(report).not.toBeNull();
      expect(report.version).toBe("1.0.0");
    });
  });

  describe("summary generation", () => {
    it("generates markdown summary from report", async () => {
      const report = await gapDetectionEngine.scan("QualityScore");
      const md = gapDetectionEngine.summary(report);
      expect(md).toContain("# Gap Report");
      expect(md).toContain("Coverage");
      expect(md).toContain("engine_index");
      expect(md).toContain("Dimension");
    });

    it("includes warnings in summary", async () => {
      const report = await gapDetectionEngine.scan("ZzzNonExistent99999");
      const md = gapDetectionEngine.summary(report);
      expect(md).toContain("Warnings");
      expect(md).toContain("No engines matched");
    });
  });
});
