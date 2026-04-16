/**
 * ResourceCensusEngine.test.ts — Tests for ResourceCensusEngine (SQ2-0-CENSUS)
 * Tests resource scanning, domain classification, filtering, persistence, and summaries.
 * Scans real filesystem — no mocking.
 */

import { describe, it, expect } from "vitest";
import { resourceCensusEngine } from "../engines/ResourceCensusEngine.js";
import type { CensusReport } from "../engines/ResourceCensusEngine.js";

describe("ResourceCensusEngine", () => {
  let fullReport: CensusReport;

  // ── Full Scan ──

  describe("scan (full)", () => {
    it("scans all locations and returns a report", async () => {
      fullReport = await resourceCensusEngine.scan();
      expect(fullReport).toBeDefined();
      expect(fullReport.total_resources).toBeGreaterThan(100);
      expect(fullReport.timestamp).toBeTruthy();
      expect(fullReport.scan_duration_ms).toBeGreaterThan(0);
      expect(fullReport.warnings).toBeInstanceOf(Array);
    }, 60000);

    it("has at least 2 locations", () => {
      expect(fullReport.locations.length).toBeGreaterThanOrEqual(2);
    });

    it("detects PDFs", () => {
      expect(fullReport.by_type["pdf"]).toBeGreaterThan(50);
    });

    it("detects CAD models", () => {
      expect(fullReport.by_type["cad_model"]).toBeGreaterThan(20);
    });

    it("detects videos", () => {
      expect(fullReport.by_type["video"]).toBeGreaterThan(10);
    });

    it("detects JSON data", () => {
      expect(fullReport.by_type["json_data"]).toBeGreaterThan(50);
    });

    it("has domain classifications", () => {
      const domains = Object.keys(fullReport.by_domain);
      expect(domains.length).toBeGreaterThan(3);
    });

    it("reports top directories", () => {
      expect(fullReport.top_directories.length).toBeGreaterThan(0);
      expect(fullReport.top_directories[0].count).toBeGreaterThan(5);
    });

    it("reports total size", () => {
      expect(fullReport.total_size_mb).toBeGreaterThan(0);
    });
  });

  // ── Location Filtering ──

  describe("scan (location filter)", () => {
    it("filters to prism only", async () => {
      const report = await resourceCensusEngine.scan("prism");
      expect(report.locations.length).toBe(1);
      expect(report.locations[0].location).toBe("prism");
      expect(report.total_resources).toBeGreaterThan(0);
    }, 60000);

    it("warns on unknown location", async () => {
      const report = await resourceCensusEngine.scan("invalid_loc");
      expect(report.warnings.some((w) => w.includes("Unknown location"))).toBe(true);
    });
  });

  // ── Type Filtering ──

  describe("scan (type filter)", () => {
    it("filters to PDFs only", async () => {
      const report = await resourceCensusEngine.scan(undefined, "pdf");
      expect(Object.keys(report.by_type)).toEqual(["pdf"]);
      expect(report.total_resources).toBeGreaterThan(50);
    }, 60000);

    it("warns on unknown type", async () => {
      const report = await resourceCensusEngine.scan(undefined, "banana");
      expect(report.warnings.some((w) => w.includes("Unknown type"))).toBe(true);
    });
  });

  // ── Persistence ──

  describe("read()", () => {
    it("reads persisted report", async () => {
      const cached = await resourceCensusEngine.read();
      expect(cached).not.toBeNull();
      expect(cached!.timestamp).toBeTruthy();
      expect(typeof cached!.total_resources).toBe("number");
    });
  });

  // ── Summary ──

  describe("summary()", () => {
    it("generates markdown summary", () => {
      const text = resourceCensusEngine.summary(fullReport);
      expect(text).toContain("# Resource Census");
      expect(text).toContain("By Location");
      expect(text).toContain("By Type");
      expect(text).toContain("By Domain");
    });
  });
});
