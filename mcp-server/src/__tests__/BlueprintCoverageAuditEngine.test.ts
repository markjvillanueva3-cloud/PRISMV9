/**
 * BlueprintCoverageAuditEngine.test.ts — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
 * Coverage audit, by-* queries, report generation, retrain-flag detection.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  BlueprintCoverageAuditEngine,
  blueprintCoverageAuditEngine,
  COVERAGE_STATES,
  aggregateRecords,
  blankStateCounts,
  inferConvention,
  coveragePctFromBreakdown,
  renderMarkdownReport,
  type CoverageRecord,
  type CoverageAuditIO,
} from "../engines/BlueprintCoverageAuditEngine.js";

describe("Coverage helpers", () => {
  it("COVERAGE_STATES exposes 4 states", () => {
    expect(COVERAGE_STATES).toEqual(["extracted_ok", "widened_bounds", "operator_overridden", "never_seen"]);
  });
  it("inferConvention maps dim types to standards", () => {
    expect(inferConvention("gdt_positional")).toBe("ASME-Y14.5");
    expect(inferConvention("thread_callout")).toBe("ISO-thread");
    expect(inferConvention("surface_finish")).toBe("ISO-1302");
    expect(inferConvention("linear")).toBe("metric/inch-dim");
  });
  it("blankStateCounts initializes all 4 states to 0", () => {
    const b = blankStateCounts();
    expect(b.extracted_ok).toBe(0);
    expect(b.widened_bounds).toBe(0);
    expect(b.operator_overridden).toBe(0);
    expect(b.never_seen).toBe(0);
  });
  it("coveragePctFromBreakdown computes correctly", () => {
    expect(coveragePctFromBreakdown({ extracted_ok: 8, widened_bounds: 1, operator_overridden: 1, never_seen: 0 })).toBe(80);
    expect(coveragePctFromBreakdown(blankStateCounts())).toBe(0);
  });
  it("aggregateRecords totals + breakdowns", () => {
    const records: CoverageRecord[] = [
      { pdfPath: "/p1", customer: "ALCOA", partNumber: "AB", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p2", customer: "ITW", partNumber: "ZZ", state: "extracted_ok", dimType: "gdt_positional", lastEvaluatedAt: "x" },
      { pdfPath: "/p3", customer: "ALCOA", partNumber: "AB2", state: "never_seen", dimType: "linear", lastEvaluatedAt: "x" },
    ];
    const result = aggregateRecords(records, "x");
    expect(result.totalFiles).toBe(3);
    expect(result.byState.extracted_ok).toBe(2);
    expect(result.byCustomer.ALCOA?.never_seen).toBe(1);
    expect(result.byConvention["ASME-Y14.5"]?.extracted_ok).toBe(1);
    expect(result.coveragePct).toBeCloseTo(66.67, 1);
  });
  it("renderMarkdownReport produces valid markdown", () => {
    const records: CoverageRecord[] = [{ pdfPath: "/p1", customer: "ALCOA", partNumber: "AB", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" }];
    const md = renderMarkdownReport(aggregateRecords(records, "x"));
    expect(md).toContain("# Blueprint Coverage Audit");
    expect(md).toContain("Total files: 1");
  });
});

describe("BlueprintCoverageAuditEngine engine", () => {
  let engine: BlueprintCoverageAuditEngine;
  let tmpRoot: string;

  beforeEach(() => {
    engine = new BlueprintCoverageAuditEngine();
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-u8-cov-"));
  });

  const seedRecords: CoverageRecord[] = [
    { pdfPath: "/p1", customer: "ALCOA", partNumber: "A", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
    { pdfPath: "/p2", customer: "ALCOA", partNumber: "B", state: "widened_bounds", dimType: "linear", lastEvaluatedAt: "x" },
    { pdfPath: "/p3", customer: "ITW", partNumber: "C", state: "extracted_ok", dimType: "gdt_positional", lastEvaluatedAt: "x" },
    { pdfPath: "/p4", customer: "ITW", partNumber: "D", state: "never_seen", dimType: "thread_callout", lastEvaluatedAt: "x" },
  ];

  it("auditCoverage produces full breakdown", async () => {
    const io: CoverageAuditIO = { loadRecords: async () => seedRecords };
    const result = await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io });
    expect(result.totalFiles).toBe(4);
    expect(result.coveragePct).toBe(50);
  });

  it("byCustomer / byDimType / byConvention after audit", async () => {
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => seedRecords } });
    expect(engine.byCustomer({ customer: "alcoa" })?.extracted_ok).toBe(1);
    expect(engine.byCustomer({ customer: "missing" })).toBe(null);
    expect(engine.byDimType({ dimType: "linear" })?.extracted_ok).toBe(1);
    expect(engine.byConvention({ convention: "ASME-Y14.5" })?.extracted_ok).toBe(1);
  });

  it("generateReport writes md + json", async () => {
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => seedRecords } });
    const md = engine.generateReport({ format: "md", outDir: tmpRoot });
    const json = engine.generateReport({ format: "json", outDir: tmpRoot });
    expect(fs.existsSync(md.path)).toBe(true);
    expect(fs.existsSync(json.path)).toBe(true);
    expect(md.path.endsWith(".md")).toBe(true);
    expect(json.path.endsWith(".json")).toBe(true);
  });

  it("flagRetrain fires when customer coverage drops past threshold", async () => {
    const baseline: CoverageRecord[] = [
      { pdfPath: "/p1", customer: "ALCOA", partNumber: "A", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p2", customer: "ALCOA", partNumber: "B", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p3", customer: "ALCOA", partNumber: "C", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p4", customer: "ALCOA", partNumber: "D", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
    ];
    const current: CoverageRecord[] = [
      { pdfPath: "/p1", customer: "ALCOA", partNumber: "A", state: "extracted_ok", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p2", customer: "ALCOA", partNumber: "B", state: "never_seen", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p3", customer: "ALCOA", partNumber: "C", state: "never_seen", dimType: "linear", lastEvaluatedAt: "x" },
      { pdfPath: "/p4", customer: "ALCOA", partNumber: "D", state: "never_seen", dimType: "linear", lastEvaluatedAt: "x" },
    ];
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => baseline } });
    engine.snapshotBaseline({ snapshotId: "snap-1" });
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => current } });
    const flags = engine.flagRetrain({ baselineSnapshotId: "snap-1", coverageDeltaThreshold: 5 });
    expect(flags.length).toBe(1);
    expect(flags[0]?.scopeId).toBe("ALCOA");
    expect(flags[0]?.deltaPct).toBe(75);
  });

  it("flagRetrain rejects missing baseline", () => {
    expect(() => engine.flagRetrain({ baselineSnapshotId: "nope" })).toThrow(/baseline snapshot not found/);
  });

  it("snapshotBaseline rejects empty snapshotId", async () => {
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => seedRecords } });
    expect(() => engine.snapshotBaseline({ snapshotId: "" })).toThrow(/required/);
  });

  it("generateReport before audit throws", () => {
    expect(() => engine.generateReport({ format: "md", outDir: tmpRoot })).toThrow(/auditCoverage must run/);
  });

  it("rejects missing loadRecords injection", async () => {
    await expect(
      engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x" }),
    ).rejects.toThrow(/loadRecords/);
  });

  it("clearState clears audit + baselines", async () => {
    await engine.auditCoverage({ rootDir: tmpRoot, indexPath: "x", io: { loadRecords: async () => seedRecords } });
    engine.snapshotBaseline({ snapshotId: "s" });
    engine.clearState();
    expect(engine.getLastAudit()).toBe(null);
  });

  it("singleton schemaVersion is 1.0.0", () => {
    expect(blueprintCoverageAuditEngine.schemaVersion).toBe("1.0.0");
  });
});
