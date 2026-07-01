/**
 * CADRegressionReportGeneratorEngine.test.ts — canonical-name smoke suite
 *
 * The full test suite lives in cadRegressionReportGenerator.test.ts (44 cases,
 * including the 26 new HTML/PDF tests shipped under U-CINF11). This file
 * exists to satisfy the wiring hook's filename convention (engine name +
 * .test.ts) and provides 12 focused smoke tests covering the engine's
 * public surface — class, capabilities, validate, all 10 execute() ops.
 *
 * Tests are intentionally LIGHT (smoke, not exhaustive) — see the sibling
 * file for full per-renderer + per-op coverage with edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  CADRegressionReportGeneratorEngine,
  cadRegressionReportGeneratorEngine,
  mdToInlineHtml,
  wrapPrintableHtml,
} from "../engines/CADRegressionReportGeneratorEngine.js";
import type { DashboardSnapshot } from "../engines/CADRegressionDashboardEngine.js";
import type { DiffReport } from "../engines/CADRegressionResultsAnalyzerEngine.js";

const UUID = "11111111-1111-4111-8111-111111111111";

function smokeSnapshot(): DashboardSnapshot {
  return {
    batchId: UUID,
    schemaVersion: 1,
    lifecycle: "running",
    pctComplete: 50,
    counts: {
      total: 4,
      completed: 2,
      pending: 1,
      running: 1,
      passed: 2,
      failed: 0,
      skipped: 0,
      errored: 0,
    },
    errorBreakdown: {
      format: 0,
      parse: 0,
      generation: 0,
      comparison: 0,
      timeout: 0,
      crash: 0,
      unclassified: 0,
    },
    throughput: {
      avgTerminalDurationMs: 100,
      windowedCompletedCount: 2,
      windowMinutes: 5,
      filesPerMinute: 0.4,
      etaMs: 5000,
    },
    recentFailures: [],
    createdAt: "2026-05-20T17:00:00.000Z",
    lastCheckpoint: "2026-05-20T17:01:00.000Z",
    updatedAt: "2026-05-20T17:01:00.000Z",
    snapshotAt: "2026-05-20T17:01:01.000Z",
  };
}

function smokeDiff(): DiffReport {
  return {
    baseBatchId: UUID,
    candidateBatchId: UUID,
    regressions: [],
    recoveries: [],
    stablePass: [],
    stableFail: [],
    newFiles: [],
    removedFiles: [],
    other: [],
    totals: {
      regression: 0,
      recovery: 0,
      stablePass: 0,
      stableFail: 0,
      new: 0,
      removed: 0,
      other: 0,
    },
  };
}

describe("CADRegressionReportGeneratorEngine — canonical-name smoke", () => {
  it("instantiates with the expected EngineInfo", () => {
    const e = new CADRegressionReportGeneratorEngine();
    expect(e.getInfo().name).toBe("CADRegressionReportGeneratorEngine");
    expect(e.getInfo().domain).toBe("cad_infrastructure");
  });

  it("exposes 10 capabilities (5 markdown + 5 html)", () => {
    const caps = cadRegressionReportGeneratorEngine.getCapabilities();
    expect(caps).toHaveLength(10);
    const names = caps.map((c) => c.name).sort();
    expect(names).toContain("renderSnapshot");
    expect(names).toContain("renderSnapshotHtml");
    expect(names).toContain("renderSummaryHtml");
  });

  it("validate() rejects non-object input", () => {
    const e = new CADRegressionReportGeneratorEngine();
    expect(e.validate(null)).toMatch(/object/);
    expect(e.validate(42)).toMatch(/object/);
  });

  it("validate() rejects unknown op", () => {
    const e = new CADRegressionReportGeneratorEngine();
    expect(e.validate({ op: "frobnicate" })).toMatch(/op must be/);
  });

  it("execute() routes op=renderSnapshot to markdown output", async () => {
    const data = (await cadRegressionReportGeneratorEngine.execute({
      op: "renderSnapshot",
      snapshot: smokeSnapshot(),
    })) as { markdown: string };
    expect(data.markdown).toContain("# CAD Regression");
  });

  it("execute() routes op=renderSnapshotHtml to HTML fragment", async () => {
    const data = (await cadRegressionReportGeneratorEngine.execute({
      op: "renderSnapshotHtml",
      snapshot: smokeSnapshot(),
    })) as { html: string };
    expect(data.html).toContain("<h1>");
    expect(data.html).not.toContain("<!DOCTYPE html>");
  });

  it("execute() routes op=renderSummaryHtml with printable=true to standalone doc", async () => {
    const data = (await cadRegressionReportGeneratorEngine.execute({
      op: "renderSummaryHtml",
      snapshot: smokeSnapshot(),
      diff: smokeDiff(),
      printable: true,
    })) as { html: string };
    expect(data.html).toContain("<!DOCTYPE html>");
    expect(data.html).toContain("@media print");
  });

  it("execute() throws on validation failure (BaseEngine contract)", async () => {
    await expect(
      cadRegressionReportGeneratorEngine.execute({ op: "bogus" } as unknown),
    ).rejects.toThrow(/op must be/);
  });

  it("execute() throws when required payload missing", async () => {
    await expect(
      cadRegressionReportGeneratorEngine.execute({ op: "renderDiffHtml" } as unknown),
    ).rejects.toThrow(/requires/);
  });

  it("mdToInlineHtml() converts a heading + table fragment", () => {
    const html = mdToInlineHtml("## Heading\n\n| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("wrapPrintableHtml() produces a valid HTML5 doc with print CSS", () => {
    const doc = wrapPrintableHtml("<p>hi</p>", "Smoke");
    expect(doc).toMatch(/<!DOCTYPE html>/i);
    expect(doc).toContain("<title>Smoke</title>");
    expect(doc).toContain("@media print");
    expect(doc).toContain("<p>hi</p>");
  });

  it("mdToInlineHtml() escapes attacker-controlled content (XSS guard)", () => {
    const html = mdToInlineHtml("| f | x |\n| --- | --- |\n| <script>alert(1)</script> | ok |");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toMatch(/<script>alert/);
  });
});
