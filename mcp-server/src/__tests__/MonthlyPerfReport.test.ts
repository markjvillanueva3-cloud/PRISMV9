/**
 * MonthlyPerfReport.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-PERF-REPORT-CRON
 *
 * Drives the monthly perf-report mjs entry by injecting `now` and a synthetic
 * `published/` corpus, asserts the markdown contains the article's four
 * mandatory section headers and that empty/edge cases produce safe output
 * (no thrown errors, no fabricated data).
 *
 * 11 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMonthlyPerfReport, reportToMarkdown } from "../../scripts/monthly-perf-report.mjs";
import { performanceLoopEngine } from "../engines/PerformanceLoopEngine.js";

let tmpPub: string;
let tmpOut: string;

const NOW = Date.UTC(2026, 4, 1, 8, 1, 0); // 2026-05-01 08:01 UTC — cron fire moment

function writePublished(name: string, frontmatter: Record<string, string | number>) {
  const fmLines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`).join("\n");
  const body = `---\n${fmLines}\n---\n\n# ${name}\n\nbody.\n`;
  writeFileSync(join(tmpPub, `${name}.md`), body, "utf8");
}

beforeEach(() => {
  tmpPub = mkdtempSync(join(tmpdir(), "perf-pub-"));
  tmpOut = mkdtempSync(join(tmpdir(), "perf-out-"));
});

afterEach(() => {
  rmSync(tmpPub, { recursive: true, force: true });
  rmSync(tmpOut, { recursive: true, force: true });
});

describe("monthly-perf-report mjs (cron entry)", () => {
  // -------------------- HAPPY PATHS --------------------

  it("writes a markdown file with the four required section headers", async () => {
    writePublished("post-1", {
      type: "published-content",
      publish_date: "2026-04-15",
      content_pillar: "ai-content-strategy",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    writePublished("post-2", {
      type: "published-content",
      publish_date: "2026-04-20",
      content_pillar: "ai-content-strategy",
      hook_format: "story",
      impressions: 50000,
      bookmarks: 1500,
    });
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "perf-out.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.outputPath).toContain("perf-out.md");
    const md = readFileSync(r.outputPath!, "utf8");
    expect(md).toContain("## Q1 — Topics by bookmarks-per-impression");
    expect(md).toContain("## Q2 — Hook formats outperforming topic average");
    expect(md).toContain("## Q3 — Three angles you have not tried");
    expect(md).toContain("## Q4 — Combos to double down on");
  });

  it("frontmatter carries type=perf-report and the prior-month label", async () => {
    writePublished("post-1", {
      type: "published-content",
      publish_date: "2026-04-15",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const md = readFileSync(r.outputPath!, "utf8");
    expect(md).toMatch(/^---\ntype: perf-report\n/);
    // NOW is May 1; prior month should be 2026-04
    expect(md).toContain("month: 2026-04");
  });

  it("dry-run does NOT write a file but returns markdown", async () => {
    writePublished("post-1", {
      type: "published-content",
      publish_date: "2026-04-15",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    const r = await runMonthlyPerfReport({
      flags: { dryRun: true, output: join(tmpOut, "should-not-exist.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    expect(r.dryRun).toBe(true);
    expect(r.outputPath).toBe(null);
    expect(r.markdown).toContain("# Performance Loop");
    expect(readdirSync(tmpOut).length).toBe(0);
  });

  it("renders Q1 table rows for every analyzed pillar", async () => {
    for (let i = 0; i < 3; i++) {
      writePublished(`a-${i}`, {
        type: "published-content",
        publish_date: "2026-04-15",
        content_pillar: "alpha",
        hook_format: "number",
        impressions: 100000,
        bookmarks: 5000 + i * 100,
      });
    }
    for (let i = 0; i < 2; i++) {
      writePublished(`b-${i}`, {
        type: "published-content",
        publish_date: "2026-04-15",
        content_pillar: "beta",
        hook_format: "story",
        impressions: 80000,
        bookmarks: 3000 + i * 100,
      });
    }
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const md = readFileSync(r.outputPath!, "utf8");
    expect(md).toMatch(/\| alpha \|/);
    expect(md).toMatch(/\| beta \|/);
  });

  it("Q4 combos table emits ranked rows when corpus has repeats", async () => {
    for (let i = 0; i < 4; i++) {
      writePublished(`combo-${i}`, {
        type: "published-content",
        publish_date: "2026-04-15",
        content_pillar: "ai",
        hook_format: "number",
        impressions: 100000,
        bookmarks: 4000 + i * 200,
      });
    }
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const md = readFileSync(r.outputPath!, "utf8");
    // The combo (ai, number) should appear as rank 1.
    expect(md).toMatch(/\| 1 \| ai \| number \|/);
  });

  // -------------------- EDGE CASES --------------------

  it("empty published-dir yields a brief with all 4 headers + empty-section notes", async () => {
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const md = readFileSync(r.outputPath!, "utf8");
    expect(md).toContain("## Q1");
    expect(md).toContain("(no topics analyzed)");
    expect(md).toContain("(no hook outperformed");
    expect(md).toContain("(no untried-angle suggestions");
    expect(md).toContain("(no combo cleared");
  });

  it("missing publish_date frontmatter is silently dropped (not crashed)", async () => {
    writeFileSync(
      join(tmpPub, "broken.md"),
      "---\ntype: published-content\nimpressions: 100\nbookmarks: 5\n---\n",
      "utf8",
    );
    writePublished("ok", {
      type: "published-content",
      publish_date: "2026-04-15",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.report.analyzed).toBe(1);
    expect(r.report.scanned).toBe(2);
  });

  it("non-published-content notes (wrong type) are ignored", async () => {
    writeFileSync(
      join(tmpPub, "draft.md"),
      "---\ntype: draft\npublish_date: 2026-04-15\nimpressions: 100\nbookmarks: 5\n---\n",
      "utf8",
    );
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md") },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    expect(r.report.analyzed).toBe(0);
  });

  it("publish_date older than --since is filtered out", async () => {
    writePublished("old", {
      type: "published-content",
      publish_date: "2026-01-01",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    writePublished("recent", {
      type: "published-content",
      publish_date: "2026-04-20",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    const r = await runMonthlyPerfReport({
      flags: { dryRun: false, output: join(tmpOut, "p.md"), since: "2026-04-01" },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    expect(r.report.analyzed).toBe(1);
  });

  it("idempotent — re-running on same corpus produces byte-identical body modulo generated_at", async () => {
    writePublished("post-1", {
      type: "published-content",
      publish_date: "2026-04-15",
      content_pillar: "ai",
      hook_format: "number",
      impressions: 100000,
      bookmarks: 5000,
    });
    const r1 = await runMonthlyPerfReport({
      flags: { dryRun: true },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const r2 = await runMonthlyPerfReport({
      flags: { dryRun: true },
      publishedDir: tmpPub,
      engine: performanceLoopEngine,
      now: NOW,
    });
    const strip = (s: string) => s.replace(/generated_at: [^\n]+\n/, "");
    expect(strip(r1.markdown)).toBe(strip(r2.markdown));
  });

  it("reportToMarkdown is pure — calling it twice on same report yields identical strings", () => {
    const fakeReport = {
      scanned: 1,
      analyzed: 1,
      windowSinceIso: "2026-04-01",
      generatedAtIso: "2026-05-01T08:01:00.000Z",
      topicsByBpi: [{ pillar: "ai", count: 1, totalImpressions: 100, totalBookmarks: 5, meanBpi: 0.05, bestHookFormat: "number" }],
      hookOutperformance: [],
      untriedAngles: [],
      doubleDownCombos: [],
    };
    const a = reportToMarkdown(fakeReport, "2026-04");
    const b = reportToMarkdown(fakeReport, "2026-04");
    expect(a).toBe(b);
  });
});
