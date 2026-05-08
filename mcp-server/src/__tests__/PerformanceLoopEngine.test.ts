/**
 * PerformanceLoopEngine.test.ts
 *
 * OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP — exit_criteria coverage:
 *   1. Parses published-content frontmatter into PublishedRecord
 *   2. Computes BPI = bookmarks / impressions
 *   3. Topics ranked by mean BPI (article Q1)
 *   4. Hooks outperforming topic average (article Q2)
 *   5. Untried-angle suggestions (article Q3)
 *   6. Double-down combo recommendations (article Q4)
 *   7. Window filter via sinceIso
 *
 * 14 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PerformanceLoopEngine, performanceLoopEngine } from "../engines/PerformanceLoopEngine.js";

let publishedDir: string;

function writePublished(filename: string, fm: Record<string, string | number>, body = "post body"): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) lines.push(`${k}: ${typeof v === "string" ? JSON.stringify(v) : v}`);
  lines.push("---");
  lines.push("");
  lines.push(body);
  const full = join(publishedDir, filename);
  writeFileSync(full, lines.join("\n"), "utf8");
  return full;
}

beforeEach(() => {
  publishedDir = mkdtempSync(join(tmpdir(), "perf-loop-"));
});

afterEach(() => {
  rmSync(publishedDir, { recursive: true, force: true });
});

describe("PerformanceLoopEngine", () => {
  // -------------------- HAPPY PATHS --------------------

  it("parses a single published-content file into a record with BPI computed", () => {
    writePublished("p-001.md", {
      type: "published-content",
      publish_date: "2026-05-01",
      content_pillar: "ai-content",
      hook_format: "number",
      hook_used: "443,000 impressions and 11,678 bookmarks",
      impressions: 443000,
      bookmarks: 11678,
    });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(1);
    expect(r[0].contentPillar).toBe("ai-content");
    expect(r[0].hookFormat).toBe("number");
    expect(r[0].impressions).toBe(443000);
    expect(r[0].bookmarks).toBe(11678);
    expect(r[0].bpi).toBeCloseTo(11678 / 443000, 8);
  });

  it("topicsByBpi: pillar with higher BPI mean ranks first regardless of raw impressions", () => {
    // High-impression / low-BPI pillar
    writePublished("a-1.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "reach", hook_format: "claim", impressions: 500000, bookmarks: 400 });
    writePublished("a-2.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "reach", hook_format: "claim", impressions: 600000, bookmarks: 600 });
    // Low-impression / high-BPI pillar
    writePublished("b-1.md", { type: "published-content", publish_date: "2026-05-03", content_pillar: "depth", hook_format: "story", impressions: 50000, bookmarks: 2000 });
    writePublished("b-2.md", { type: "published-content", publish_date: "2026-05-04", content_pillar: "depth", hook_format: "story", impressions: 40000, bookmarks: 1700 });

    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(report.topicsByBpi.length).toBe(2);
    expect(report.topicsByBpi[0].pillar).toBe("depth");
    expect(report.topicsByBpi[1].pillar).toBe("reach");
    expect(report.topicsByBpi[0].meanBpi).toBeGreaterThan(report.topicsByBpi[1].meanBpi);
  });

  it("hookOutperformance: 'number' beats topic average when its mean BPI is higher", () => {
    // Same pillar, two hook formats, one clearly better
    writePublished("p-1.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "ai", hook_format: "number", impressions: 100000, bookmarks: 4000 });
    writePublished("p-2.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "ai", hook_format: "number", impressions: 100000, bookmarks: 5000 });
    writePublished("p-3.md", { type: "published-content", publish_date: "2026-05-03", content_pillar: "ai", hook_format: "claim", impressions: 100000, bookmarks: 1000 });
    writePublished("p-4.md", { type: "published-content", publish_date: "2026-05-04", content_pillar: "ai", hook_format: "claim", impressions: 100000, bookmarks: 1200 });

    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    const numberOutperf = report.hookOutperformance.find((h) => h.hookFormat === "number");
    expect(numberOutperf).not.toBe(undefined);
    expect(numberOutperf!.outperformanceRatio).toBeGreaterThan(0);
    expect(numberOutperf!.meanBpi).toBeGreaterThan(numberOutperf!.topicMeanBpi);
    // 'claim' should NOT appear — it underperforms.
    const claimOutperf = report.hookOutperformance.find((h) => h.hookFormat === "claim");
    expect(claimOutperf).toBe(undefined);
  });

  it("doubleDownCombos: top combo by mean BPI ranked first", () => {
    writePublished("a-1.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "ai", hook_format: "number", impressions: 100000, bookmarks: 5000 });
    writePublished("a-2.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "ai", hook_format: "number", impressions: 100000, bookmarks: 5500 });
    writePublished("b-1.md", { type: "published-content", publish_date: "2026-05-03", content_pillar: "trading", hook_format: "story", impressions: 100000, bookmarks: 1000 });
    writePublished("b-2.md", { type: "published-content", publish_date: "2026-05-04", content_pillar: "trading", hook_format: "story", impressions: 100000, bookmarks: 1100 });

    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(report.doubleDownCombos.length).toBe(2);
    expect(report.doubleDownCombos[0].pillar).toBe("ai");
    expect(report.doubleDownCombos[0].hookFormat).toBe("number");
    expect(report.doubleDownCombos[0].rank).toBe(1);
    expect(report.doubleDownCombos[1].rank).toBe(2);
  });

  it("untriedAngles: suggests a hook with strong global mean that the top pillar has not used", () => {
    // Top pillar 'ai' has only used 'claim'. 'number' performs much better globally.
    writePublished("ai-1.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "ai", hook_format: "claim", impressions: 100000, bookmarks: 800 });
    writePublished("ai-2.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "ai", hook_format: "claim", impressions: 100000, bookmarks: 900 });
    // Other pillar shows 'number' performs strongly.
    writePublished("trd-1.md", { type: "published-content", publish_date: "2026-05-03", content_pillar: "trading", hook_format: "number", impressions: 100000, bookmarks: 5000 });
    writePublished("trd-2.md", { type: "published-content", publish_date: "2026-05-04", content_pillar: "trading", hook_format: "number", impressions: 100000, bookmarks: 6000 });

    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    // The top-BPI pillar is 'trading' (which has tried 'number' already), so suggestion should target 'ai'.
    const aiSuggest = report.untriedAngles.find((s) => s.pillar === "ai");
    expect(aiSuggest).not.toBe(undefined);
    expect(aiSuggest!.hookFormat).toBe("number");
    expect(aiSuggest!.reason).toContain("not been tried in 'ai'");
  });

  // -------------------- WINDOW FILTERING --------------------

  it("sinceIso filters out older records", () => {
    writePublished("old.md", { type: "published-content", publish_date: "2026-01-01", content_pillar: "x", hook_format: "claim", impressions: 100000, bookmarks: 1000 });
    writePublished("new.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "claim", impressions: 100000, bookmarks: 2000 });

    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(report.scanned).toBe(2);
    expect(report.analyzed).toBe(1);
  });

  // -------------------- FAILURE / ROBUSTNESS --------------------

  it("file with type != published-content is skipped", () => {
    writePublished("other.md", { type: "memory", impressions: 100, bookmarks: 10 });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(0);
  });

  it("file missing impressions or bookmarks is skipped", () => {
    writePublished("missing.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "claim" });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(0);
  });

  it("zero or negative impressions are skipped (avoid div-by-zero)", () => {
    writePublished("zero.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "claim", impressions: 0, bookmarks: 5 });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(0);
  });

  it("missing publish_date or malformed date is skipped", () => {
    writePublished("bad.md", { type: "published-content", publish_date: "May 8 2026", content_pillar: "x", hook_format: "claim", impressions: 100, bookmarks: 5 });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(0);
  });

  it("missing publishedDir returns empty report (no throw)", () => {
    const ghost = join(tmpdir(), "ghost-perf-" + Date.now());
    const report = performanceLoopEngine.monthlyReport({ publishedDir: ghost, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(report.scanned).toBe(0);
    expect(report.analyzed).toBe(0);
    expect(report.topicsByBpi).toEqual([]);
  });

  // -------------------- ADVERSARIAL --------------------

  it("comma-separated impression counts (e.g. '443,000') parse correctly", () => {
    writePublished("commas.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "number", impressions: "443,000" as unknown as number, bookmarks: "11,678" as unknown as number });
    const r = performanceLoopEngine.listRecords({ publishedDir });
    expect(r.length).toBe(1);
    expect(r[0].impressions).toBe(443000);
    expect(r[0].bookmarks).toBe(11678);
  });

  it("hookOutperformance excludes pillars with only 1 record (insufficient signal)", () => {
    writePublished("solo.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "solo-pillar", hook_format: "story", impressions: 100000, bookmarks: 5000 });
    const report = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(report.hookOutperformance.find((h) => h.pillar === "solo-pillar")).toBe(undefined);
  });

  it("singleton == fresh class instance — equivalent results", () => {
    writePublished("a.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "claim", impressions: 100000, bookmarks: 500 });
    writePublished("b.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "x", hook_format: "claim", impressions: 100000, bookmarks: 600 });
    const fresh = new PerformanceLoopEngine();
    const a = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    const b = fresh.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(b.analyzed).toBe(a.analyzed);
    expect(b.topicsByBpi).toEqual(a.topicsByBpi);
  });

  it("deterministic: same fileset + window produces same result across calls", () => {
    writePublished("a.md", { type: "published-content", publish_date: "2026-05-01", content_pillar: "x", hook_format: "number", impressions: 100000, bookmarks: 5000 });
    writePublished("b.md", { type: "published-content", publish_date: "2026-05-02", content_pillar: "x", hook_format: "number", impressions: 100000, bookmarks: 6000 });
    writePublished("c.md", { type: "published-content", publish_date: "2026-05-03", content_pillar: "y", hook_format: "story", impressions: 100000, bookmarks: 1000 });

    const r1 = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    const r2 = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso: "2026-04-01", now: Date.UTC(2026, 4, 8) });
    expect(r2.topicsByBpi).toEqual(r1.topicsByBpi);
    expect(r2.hookOutperformance).toEqual(r1.hookOutperformance);
    expect(r2.doubleDownCombos).toEqual(r1.doubleDownCombos);
  });
});
