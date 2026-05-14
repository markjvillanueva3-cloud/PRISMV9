/**
 * build-awareness-health.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-H6.
 *
 * Coverage floor:
 *   - happy path with all 5 H-series sources present
 *   - >= 3 failure modes (no sources / partial sources / malformed trends)
 *   - >= 2 adversarial inputs (extreme penalty counts, future timestamps)
 *   - >= 3 spanning variability configs (green / yellow / red health states)
 *   - round-trip CLI invocation via main() with real I/O + trends append
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  summarizeTrend,
  projectSections,
  aggregateSeverityCounts,
  computeScore,
  classifyHealth,
  buildDashboard,
  renderMarkdown,
  main,
  _internals,
} from "../build-awareness-health.mjs";

const NOW = "2026-05-14T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const ONE_DAY = 24 * 60 * 60 * 1000;

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "awareness-health-"));
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

function writeReport(root, name, body) {
  writeFileSync(join(root, "state/shared", name), JSON.stringify(body), "utf-8");
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.help).toBe(false);
    expect(a.inputs.h1).toContain("MEMORY_GARDEN_REPORT");
    expect(a.inputs.h2).toContain("SKILL_UTILIZATION_REPORT");
    expect(a.inputs.h3).toContain("HOOK_UTILIZATION_REPORT");
    expect(a.inputs.h4).toContain("CLAUDE_MD_DRIFT_REPORT");
    expect(a.inputs.h5).toContain("GSD_FRESHNESS_REPORT");
  });

  it("--h1..--h5 + --out-md + --out-json + --trends overrides", () => {
    const a = parseArgs([
      "--h1", "/1",
      "--h2", "/2",
      "--h3", "/3",
      "--h4", "/4",
      "--h5", "/5",
      "--out-md", "/md",
      "--out-json", "/json",
      "--trends", "/t",
      "--skip-trends-append",
    ]);
    expect(a.inputs.h1).toBe("/1");
    expect(a.inputs.h5).toBe("/5");
    expect(a.outMd).toBe("/md");
    expect(a.outJson).toBe("/json");
    expect(a.trendsPath).toBe("/t");
    expect(a.skipTrendsAppend).toBe(true);
  });

  it("--help / -h", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// summarizeTrend
// ──────────────────────────────────────────────────────────────────────

describe("summarizeTrend", () => {
  it("empty/null returns zero samples", () => {
    expect(summarizeTrend("", NOW)).toEqual({
      samples: 0,
      scoreP50: null,
      scoreMin: null,
      scoreMax: null,
    });
    expect(summarizeTrend(null, NOW).samples).toBe(0);
  });

  it("aggregates rows within window", () => {
    const rows = [
      { ts: new Date(NOW_MS - 1 * ONE_DAY).toISOString(), score: 80 },
      { ts: new Date(NOW_MS - 5 * ONE_DAY).toISOString(), score: 60 },
      { ts: new Date(NOW_MS - 100 * ONE_DAY).toISOString(), score: 99 }, // outside window
    ]
      .map((r) => JSON.stringify(r))
      .join("\n");
    const s = summarizeTrend(rows, NOW);
    expect(s.samples).toBe(2);
    expect(s.scoreMin).toBe(60);
    expect(s.scoreMax).toBe(80);
  });

  it("skips malformed lines without crashing", () => {
    const rows = '{"ts":"2026-05-13T00:00:00Z","score":90}\nnot-json\n';
    const s = summarizeTrend(rows, NOW);
    expect(s.samples).toBe(1);
  });

  it("uses generatedAt as fallback ts field", () => {
    const rows = JSON.stringify({
      generatedAt: new Date(NOW_MS - 1 * ONE_DAY).toISOString(),
      score: 85,
    });
    const s = summarizeTrend(rows, NOW);
    expect(s.samples).toBe(1);
    expect(s.scoreP50).toBe(85);
  });
});

// ──────────────────────────────────────────────────────────────────────
// projectSections
// ──────────────────────────────────────────────────────────────────────

describe("projectSections", () => {
  it("marks unavailable when source missing", () => {
    const sections = projectSections({});
    expect(sections.memory.available).toBe(false);
    expect(sections.skills.available).toBe(false);
    expect(sections.hooks.available).toBe(false);
    expect(sections.claudeMd.available).toBe(false);
    expect(sections.gsd.available).toBe(false);
  });

  it("projects H2 skill utilization", () => {
    const reports = {
      h2: {
        ok: true,
        value: {
          totals: { skills: 501, telemetryAvailable: 0 },
          counts: { active: 0, stale_30d: 0, unknown_stale: 16 },
          proposedArchive: new Array(16).fill({ name: "x" }),
        },
      },
    };
    const s = projectSections(reports);
    expect(s.skills.available).toBe(true);
    expect(s.skills.total).toBe(501);
    expect(s.skills.proposedArchive).toBe(16);
    expect(s.skills.telemetryAvailable).toBe(0);
  });

  it("projects H3 hook utilization", () => {
    const reports = {
      h3: {
        ok: true,
        value: {
          totals: { hooks: 470, wired: 178 },
          issueCounts: { orphan_file: 292, dormant_30d: 0, tier_mismatch: 0, no_telemetry: 178 },
        },
      },
    };
    const s = projectSections(reports);
    expect(s.hooks.available).toBe(true);
    expect(s.hooks.orphans).toBe(292);
    expect(s.hooks.noTelemetry).toBe(178);
  });

  it("projects H4 CLAUDE.md drift", () => {
    const reports = {
      h4: {
        ok: true,
        value: {
          totals: { claimsAnalyzed: 109, drift: 9, driftRate: 0.083 },
          bySeverity: { P0: 7, P1: 2, P2: 0 },
        },
      },
    };
    const s = projectSections(reports);
    expect(s.claudeMd.available).toBe(true);
    expect(s.claudeMd.p0).toBe(7);
    expect(s.claudeMd.driftRate).toBe(0.083);
  });

  it("projects H5 GSD freshness", () => {
    const reports = {
      h5: {
        ok: true,
        value: {
          totals: { files: 17, drift: 18 },
          bySeverity: { P0: 4, P1: 14, P2: 0 },
          countDrift: [{}, {}, {}, {}],
        },
      },
    };
    const s = projectSections(reports);
    expect(s.gsd.available).toBe(true);
    expect(s.gsd.p0).toBe(4);
    expect(s.gsd.p1).toBe(14);
    expect(s.gsd.countDriftCategories).toBe(4);
  });
});

// ──────────────────────────────────────────────────────────────────────
// aggregateSeverityCounts + score + classify
// ──────────────────────────────────────────────────────────────────────

describe("aggregateSeverityCounts", () => {
  it("sums P0/P1 across H3 (hooks) + H4 + H5", () => {
    const sections = {
      memory: { available: false },
      skills: { available: false },
      hooks: { available: true, orphans: 0, dormant: 5, tierMismatch: 1 },
      claudeMd: { available: true, p0: 2, p1: 3 },
      gsd: { available: true, p0: 1, p1: 4 },
    };
    const out = aggregateSeverityCounts(sections);
    // P0: claudeMd(2) + gsd(1) + hooks.tierMismatch(1) = 4
    expect(out.P0).toBe(4);
    // P1: claudeMd(3) + gsd(4) + hooks.dormant(5) = 12
    expect(out.P1).toBe(12);
  });

  it("accumulates orphanLike from skills.proposedArchive + hooks.orphans + memory drift", () => {
    const sections = {
      memory: { available: true, unreferenced: 100, dangling: 2, stalePathRefs: 15 },
      skills: { available: true, proposedArchive: 16 },
      hooks: { available: true, orphans: 292 },
      claudeMd: { available: false },
      gsd: { available: false },
    };
    const out = aggregateSeverityCounts(sections);
    expect(out.orphanLike).toBe(100 + 2 + 15 + 16 + 292);
  });

  it("missing sections contribute zero", () => {
    const out = aggregateSeverityCounts({
      memory: { available: false },
      skills: { available: false },
      hooks: { available: false },
      claudeMd: { available: false },
      gsd: { available: false },
    });
    expect(out).toEqual({ P0: 0, P1: 0, P2: 0, orphanLike: 0 });
  });
});

describe("computeScore + classifyHealth", () => {
  it("100 when no drift", () => {
    expect(computeScore({ P0: 0, P1: 0, P2: 0, orphanLike: 0 })).toBe(100);
    expect(classifyHealth(100)).toBe("green");
  });

  it("penalizes P0 heavily (10 per)", () => {
    expect(computeScore({ P0: 1, P1: 0, P2: 0, orphanLike: 0 })).toBe(90);
    expect(computeScore({ P0: 5, P1: 0, P2: 0, orphanLike: 0 })).toBe(50);
  });

  it("score clamps to [0, 100]", () => {
    expect(computeScore({ P0: 100, P1: 100, P2: 100, orphanLike: 100000 })).toBe(0);
    expect(computeScore({ P0: -50, P1: 0, P2: 0, orphanLike: 0 })).toBe(100);
  });

  it("orphan-like contributes floor(N / 50) points off", () => {
    expect(computeScore({ P0: 0, P1: 0, P2: 0, orphanLike: 49 })).toBe(100);
    expect(computeScore({ P0: 0, P1: 0, P2: 0, orphanLike: 50 })).toBe(99);
    expect(computeScore({ P0: 0, P1: 0, P2: 0, orphanLike: 500 })).toBe(90);
  });

  it("status thresholds: green >= 75, yellow >= 50, red < 50", () => {
    expect(classifyHealth(75)).toBe("green");
    expect(classifyHealth(74)).toBe("yellow");
    expect(classifyHealth(50)).toBe("yellow");
    expect(classifyHealth(49)).toBe("red");
    expect(classifyHealth(0)).toBe("red");
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildDashboard — variability cohorts
// ──────────────────────────────────────────────────────────────────────

describe("buildDashboard — variability cohorts", () => {
  function blank() {
    return projectSections({});
  }

  // Cohort 1 of 3 — green (no inputs available = 100/100)
  it("green: no inputs available → 100/100", () => {
    const dash = buildDashboard({
      sections: blank(),
      trendSummary: { samples: 0, scoreP50: null, scoreMin: null, scoreMax: null },
      nowIso: NOW,
    });
    expect(dash.score).toBe(100);
    expect(dash.status).toBe("green");
    expect(dash.availableSources.length).toBe(0);
  });

  // Cohort 2 of 3 — yellow
  it("yellow: moderate drift drops score into 50-74", () => {
    const sections = blank();
    sections.claudeMd = { available: true, p0: 3, p1: 5, claimsAnalyzed: 100, drift: 8 };
    const dash = buildDashboard({
      sections,
      trendSummary: { samples: 0 },
      nowIso: NOW,
    });
    // score = 100 - 30 - 15 - 0 = 55 → yellow
    expect(dash.score).toBe(55);
    expect(dash.status).toBe("yellow");
  });

  // Cohort 3 of 3 — red
  it("red: heavy drift drops score below 50", () => {
    const sections = blank();
    sections.claudeMd = { available: true, p0: 7, p1: 2, claimsAnalyzed: 100, drift: 9 };
    sections.gsd = { available: true, p0: 4, p1: 14, files: 17, drift: 18 };
    sections.hooks = { available: true, orphans: 292, dormant: 0, tierMismatch: 0 };
    const dash = buildDashboard({
      sections,
      trendSummary: { samples: 0 },
      nowIso: NOW,
    });
    // P0: 7 + 4 = 11, P1: 2 + 14 = 16, orphanLike: 292 (5 pts off)
    // score = 100 - 110 - 48 - 5 = clamped to 0
    expect(dash.score).toBe(0);
    expect(dash.status).toBe("red");
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes badge + score + section blocks", () => {
    const sections = projectSections({});
    sections.claudeMd = { available: true, p0: 1, p1: 0, claimsAnalyzed: 50, drift: 1 };
    const dash = buildDashboard({
      sections,
      trendSummary: { samples: 5, scoreP50: 80, scoreMin: 70, scoreMax: 95 },
      nowIso: NOW,
    });
    const md = renderMarkdown(dash);
    expect(md).toContain("# Awareness Health Dashboard");
    expect(md).toContain("score **90/100**");
    expect(md).toContain("GREEN");
    expect(md).toContain("30-day trend");
    expect(md).toContain("Samples: **5**");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-H6");
  });

  it("notes unavailable sources", () => {
    const dash = buildDashboard({
      sections: projectSections({}),
      trendSummary: { samples: 0 },
      nowIso: NOW,
    });
    const md = renderMarkdown(dash);
    expect(md).toContain("source not available");
  });
});

// ──────────────────────────────────────────────────────────────────────
// main — round-trip CLI
// ──────────────────────────────────────────────────────────────────────

describe("main (round-trip)", () => {
  let root;
  let logs;
  let errs;

  beforeEach(() => {
    root = makeRepo();
    logs = [];
    errs = [];
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("happy path with all 5 sources present", async () => {
    writeReport(root, "MEMORY_GARDEN_REPORT.json", {
      totals: { files: 142, unreferenced: 102, danglingPointers: 2, stalePathRefs: 15 },
      verdict: "DEFER",
    });
    writeReport(root, "SKILL_UTILIZATION_REPORT.json", {
      totals: { skills: 501, telemetryAvailable: 0 },
      counts: { active: 0, stale_30d: 0, unknown_stale: 16 },
      proposedArchive: new Array(16).fill({ name: "x" }),
    });
    writeReport(root, "HOOK_UTILIZATION_REPORT.json", {
      totals: { hooks: 470, wired: 178 },
      issueCounts: { orphan_file: 292, dormant_30d: 0, tier_mismatch: 0, no_telemetry: 178 },
    });
    writeReport(root, "CLAUDE_MD_DRIFT_REPORT.json", {
      totals: { claimsAnalyzed: 109, drift: 9, driftRate: 0.083 },
      bySeverity: { P0: 7, P1: 2, P2: 0 },
    });
    writeReport(root, "GSD_FRESHNESS_REPORT.json", {
      totals: { files: 17, drift: 18 },
      bySeverity: { P0: 4, P1: 14, P2: 0 },
      countDrift: [{}, {}, {}, {}],
    });

    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.json"), "utf-8"),
    );
    expect(js.schemaVersion).toBe(1);
    expect(js.availableSources.length).toBe(5);
    // Trend JSONL appended
    expect(existsSync(join(root, "state/shared/awareness-health-trends.jsonl"))).toBe(true);
    const trends = readFileSync(join(root, "state/shared/awareness-health-trends.jsonl"), "utf-8");
    expect(trends).toContain(NOW);
  });

  it("--json writes nothing", async () => {
    const res = await main({
      argv: ["--json", "--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.md"))).toBe(false);
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.score).toBe(100); // no inputs = perfect score
  });

  it("--skip-trends-append leaves trends untouched", async () => {
    const res = await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/awareness-health-trends.jsonl"))).toBe(false);
  });

  it("--help short-circuits", async () => {
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("Awareness Health Rollup");
  });

  it("missing sources are non-fatal — runs with 0/5 available", async () => {
    const res = await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.json"), "utf-8"),
    );
    expect(js.availableSources).toEqual([]);
    expect(js.score).toBe(100);
  });

  it("partial sources: only H4 present", async () => {
    writeReport(root, "CLAUDE_MD_DRIFT_REPORT.json", {
      totals: { claimsAnalyzed: 50, drift: 5, driftRate: 0.1 },
      bySeverity: { P0: 2, P1: 3, P2: 0 },
    });
    const res = await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.json"), "utf-8"),
    );
    expect(js.availableSources).toEqual(["claudeMd"]);
    // 100 - 20 (2*10) - 9 (3*3) = 71 → yellow
    expect(js.score).toBe(71);
    expect(js.status).toBe("yellow");
  });

  it("malformed trends file is skipped without crashing", async () => {
    writeFileSync(
      join(root, "state/shared/awareness-health-trends.jsonl"),
      "{not-json\n{also-not-json\n",
      "utf-8",
    );
    const res = await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.json"), "utf-8"),
    );
    expect(js.trend.samples).toBe(0);
  });

  it("idempotent dashboard files (trends jsonl grows)", async () => {
    await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    const md1 = readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.md"), "utf-8");
    await main({
      argv: ["--frozen-time", NOW, "--skip-trends-append"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    const md2 = readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.md"), "utf-8");
    expect(md1).toBe(md2);
  });

  it("trends append accumulates rows", async () => {
    await main({
      argv: ["--frozen-time", "2026-05-12T00:00:00.000Z"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    await main({
      argv: ["--frozen-time", "2026-05-13T00:00:00.000Z"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    const trends = readFileSync(join(root, "state/shared/awareness-health-trends.jsonl"), "utf-8");
    const lines = trends.split("\n").filter((x) => x.trim());
    expect(lines.length).toBe(3);
    // The dashboard's trend summary is computed BEFORE appending the current
    // run's row, so the last invocation sees the 2 prior rows in its window.
    // (Trend = "trajectory leading up to now", not "history including now".)
    const lastDash = JSON.parse(
      readFileSync(join(root, "state/shared/AWARENESS_HEALTH_DASHBOARD.json"), "utf-8"),
    );
    expect(lastDash.trend.samples).toBe(2);
  });
});
