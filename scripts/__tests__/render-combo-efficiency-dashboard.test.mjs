/**
 * Tests for COMBO-EFFICIENCY-MS0 / P2-U01 dashboard renderer.
 *
 * Coverage:
 *   - buildDashboardModel: composes baseline + bridges + milestone unit list
 *   - renderMarkdown: includes zone/score/substrate table/bridges/recommendations
 *   - renderMarkdown: degrades gracefully when baseline OR bridges missing
 *   - renderHtml: valid HTML5 doctype + zone badge class + escapes
 *   - renderHtml: mdToHtml correctly handles headings, lists, tables, inline code
 *   - mdToHtml table separator row is skipped (no <th>---</th> emission)
 *   - renderDashboard (I/O): writes all 3 outputs to outDir
 *   - CLI: --dry + env disable
 *
 * Run: node --test scripts/__tests__/render-combo-efficiency-dashboard.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  SCHEMA_VERSION,
  buildDashboardModel,
  renderMarkdown,
  renderHtml,
  renderDashboard,
} from "../render-combo-efficiency-dashboard.mjs";

// ─── buildDashboardModel ───────────────────────────────────────────────────

describe("buildDashboardModel", () => {
  test("composes model from both inputs with milestone unit list", () => {
    const baseline = {
      substrates: {
        obsidian: { status: "RED", reason: "4136 broken" },
        ollama:   { status: "RED", reason: "5.1% offload" },
      },
      overall: { zone: "RED", score: 0.0 },
      blockers: ["ollama: dead"],
      recommendations: ["Run P0-U01"],
    };
    const bridges = { rankings: [{ name: "X", fanIn: 50, tier: "platinum" }], unwiredCount: 597 };
    const out = buildDashboardModel({ baseline, bridges, generatedAt: "2026-05-25T19:00:00Z" });
    assert.equal(out.schemaVersion, SCHEMA_VERSION);
    assert.equal(out.milestone.id, "COMBO-EFFICIENCY-MS0");
    assert.equal(out.milestone.units.length, 6);
    // Summary derived from baseline + bridges.
    assert.equal(out.summary.zone, "RED");
    assert.equal(out.summary.redSubstrateCount, 2);
    assert.equal(out.summary.topBridges, 1);
    assert.equal(out.summary.blockerCount, 1);
  });

  test("missing baseline → summary UNKNOWN, milestone unit list still present", () => {
    const out = buildDashboardModel({});
    assert.equal(out.summary.zone, "UNKNOWN");
    assert.equal(out.summary.overallScore, null);
    assert.equal(out.summary.redSubstrateCount, 0);
    assert.equal(out.milestone.units.length, 6);  // hard-coded, always present
  });

  test("milestone unit list reflects current P1-U02 deferred status", () => {
    const out = buildDashboardModel({});
    const u02 = out.milestone.units.find((u) => u.id === "P1-U02");
    assert.equal(u02.status, "deferred");
    assert.match(u02.reason, /scope too large/);
  });
});

// ─── renderMarkdown ────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  const model = buildDashboardModel({
    baseline: {
      substrates: { obsidian: { status: "RED", reason: "4136 broken" }, ollama: { status: "GREEN", reason: "ok" } },
      overall: { zone: "YELLOW", score: 0.5 },
      blockers: [],
      recommendations: ["Run P1-U02 next"],
      comboUmbrella: { reason: "548 hits / 140 nudges" },
    },
    bridges: { rankings: [{ name: "PluginEngine", fanIn: 50, tier: "platinum" }], unwiredCount: 597, tierCounts: { platinum: 1 } },
    generatedAt: "2026-05-25T19:00:00Z",
  });

  test("includes title + headline + score", () => {
    const md = renderMarkdown(model);
    assert.match(md, /# COMBO-EFFICIENCY-MS0 Dashboard/);
    assert.match(md, /Overall zone:.*YELLOW.*score 0\.50/);
  });

  test("includes substrate table with both substrates", () => {
    const md = renderMarkdown(model);
    assert.match(md, /\| obsidian \| .* RED \| 4136 broken \|/);
    assert.match(md, /\| ollama \| .* GREEN \| ok \|/);
  });

  test("includes milestone unit list with deferred P1-U02 marker", () => {
    const md = renderMarkdown(model);
    assert.match(md, /\| `P1-U02` \| .*deferred/);
    assert.match(md, /\| `P0-U01` \| .*complete/);
  });

  test("includes bridge table with tier", () => {
    const md = renderMarkdown(model);
    assert.match(md, /Top unwired bridges/);
    assert.match(md, /\| 1 \| `PluginEngine` \| 50 \| platinum \|/);
  });

  test("includes recommendations section when present", () => {
    const md = renderMarkdown(model);
    assert.match(md, /## Recommendations/);
    assert.match(md, /- Run P1-U02 next/);
  });

  test("degrades when baseline missing", () => {
    const md = renderMarkdown(buildDashboardModel({ bridges: { rankings: [] } }));
    assert.match(md, /_Baseline not yet generated/);
  });

  test("degrades when bridges missing", () => {
    const md = renderMarkdown(buildDashboardModel({ baseline: { substrates: {}, overall: {} } }));
    assert.match(md, /_Bridge ranking not yet generated/);
  });

  test("null model returns empty string (defensive)", () => {
    assert.equal(renderMarkdown(null), "");
  });
});

// ─── renderHtml ────────────────────────────────────────────────────────────

describe("renderHtml", () => {
  const model = buildDashboardModel({
    baseline: {
      substrates: { obsidian: { status: "RED", reason: "4136 broken" } },
      overall: { zone: "RED", score: 0.0 },
      blockers: [],
      recommendations: [],
    },
  });

  test("emits valid HTML5 doctype", () => {
    const html = renderHtml(model);
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<\/html>/);
  });

  test("includes zone-badge with correct class", () => {
    const html = renderHtml(model);
    assert.match(html, /<div class="zone-badge zone-RED">/);
  });

  test("renders table from markdown (no separator row leak)", () => {
    const html = renderHtml(model);
    // Separator row "| --- | --- | --- |" must NOT appear as <th>---</th>.
    assert.ok(!html.includes("<th>---</th>"));
    assert.ok(!html.includes("<th>------</th>"));
    // But the header row SHOULD render as <th>.
    assert.match(html, /<th>Unit<\/th>/);
  });

  test("escapes HTML in content (XSS guard)", () => {
    const dangerous = buildDashboardModel({
      baseline: {
        substrates: { evil: { status: "RED", reason: "<script>alert(1)</script>" } },
        overall: { zone: "RED" },
        blockers: [],
        recommendations: [],
      },
    });
    const html = renderHtml(dangerous);
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  test("inline code rendered as <code>", () => {
    const html = renderHtml(model);
    assert.match(html, /<code>P0-U01<\/code>/);
  });

  test("null model returns empty string", () => {
    assert.equal(renderHtml(null), "");
  });
});

// ─── renderDashboard (I/O) ─────────────────────────────────────────────────

function withTempPrismRoot(seedFn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "render-combo-dash-test-"));
  try {
    fs.mkdirSync(path.join(tmp, "state/shared/dashboards"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "state/shared"), { recursive: true });
    seedFn(tmp);
    return tmp;
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
}

test("renderDashboard: writes all 3 outputs to outDir", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/dashboards/combo-efficiency-baseline.json"),
      JSON.stringify({
        substrates: { obsidian: { status: "RED", reason: "x" } },
        overall: { zone: "RED", score: 0.0 },
        blockers: [],
        recommendations: ["test rec"],
      }),
    );
    fs.writeFileSync(
      path.join(root, "state/shared/UNWIRED-BRIDGES-TOP10.json"),
      JSON.stringify({ rankings: [{ name: "X", fanIn: 5, tier: "gold" }], unwiredCount: 1 }),
    );
  });
  try {
    const result = renderDashboard({ prismRoot: tmp });
    assert.ok(fs.existsSync(result.written.json));
    assert.ok(fs.existsSync(result.written.md));
    assert.ok(fs.existsSync(result.written.html));
    const json = JSON.parse(fs.readFileSync(result.written.json, "utf8"));
    assert.equal(json.schemaVersion, SCHEMA_VERSION);
    assert.equal(json.summary.zone, "RED");
    const md = fs.readFileSync(result.written.md, "utf8");
    assert.match(md, /test rec/);
    const html = fs.readFileSync(result.written.html, "utf8");
    assert.match(html, /<!DOCTYPE html>/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("renderDashboard: write=false returns model + markdown + html, writes nothing", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const result = renderDashboard({ prismRoot: tmp, write: false });
    assert.equal(result.written, null);
    assert.equal(typeof result.markdown, "string");
    assert.match(result.markdown, /# COMBO-EFFICIENCY-MS0 Dashboard/);
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/dashboards/combo-efficiency.json")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: --dry mode prints markdown, no file written", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const scriptPath = path.resolve(new URL("../render-combo-efficiency-dashboard.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--dry", "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /# COMBO-EFFICIENCY-MS0 Dashboard/);
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/dashboards/combo-efficiency.json")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: env disable knob no-ops", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const scriptPath = path.resolve(new URL("../render-combo-efficiency-dashboard.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--root", tmp], {
      encoding: "utf8",
      env: { ...process.env, PRISM_COMBO_EFFICIENCY_DASHBOARD_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.skipped, "disabled-via-env");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
