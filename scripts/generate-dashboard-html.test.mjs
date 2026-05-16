#!/usr/bin/env node
/**
 * Tests for generate-dashboard-html.mjs — pure-function panel + reader units.
 * Run: node --test scripts/generate-dashboard-html.test.mjs
 *
 * Covers OBSIDIAN-INTELLIGENCE-MS3 / C2 (U-HTML-DASHBOARD) exit conditions:
 *   - dashboard.html opens without dependencies (self-contained)
 *   - 7 panels render with ≥1 data row each
 *   - readers fail-soft (return {data:null, error} — never throw)
 *   - assembleDashboard always returns a non-empty HTML string
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  readJsonSafe,
  readTextSafe,
  formatAgeMs,
  heartbeatStatus,
  panelSystemViz,
  panelClaudeBrief,
  panelBuildState,
  panelScrutinyLedger,
  panelRecallTop,
  panelChatBus,
  panelWorkboard,
  assembleDashboard,
} = await import("./generate-dashboard-html.mjs");

// ---------- helpers ----------

function tmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-dashboard-test-"));
  fs.mkdirSync(path.join(dir, "state/shared/system-viz"), { recursive: true });
  fs.mkdirSync(path.join(dir, "mcp-server/data/state"), { recursive: true });
  return dir;
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

// ---------- readJsonSafe ----------

test("readJsonSafe returns parsed object for valid JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "x.json");
  fs.writeFileSync(p, JSON.stringify({ a: 1 }));
  const r = readJsonSafe(p);
  assert.deepEqual(r.data, { a: 1 });
  assert.equal(r.error, undefined);
});

test("readJsonSafe returns {data:null, error} on ENOENT", () => {
  const r = readJsonSafe("Z:/this/does/not/exist.json");
  assert.equal(r.data, null);
  assert.ok(typeof r.error === "string" && r.error.length > 0);
});

test("readJsonSafe returns {data:null, error} on malformed JSON", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "bad.json");
  fs.writeFileSync(p, "{not-json}");
  const r = readJsonSafe(p);
  assert.equal(r.data, null);
  assert.ok(r.error.length > 0);
});

// ---------- readTextSafe ----------

test("readTextSafe returns full content for small files", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "t.md");
  fs.writeFileSync(p, "hello\nworld");
  const r = readTextSafe(p);
  assert.equal(r.data, "hello\nworld");
});

test("readTextSafe truncates oversized files", () => {
  const dir = tmpRepo();
  const p = path.join(dir, "big.md");
  fs.writeFileSync(p, "x".repeat(100));
  const r = readTextSafe(p, 32);
  assert.ok(r.data.startsWith("x".repeat(32)));
  assert.ok(r.data.includes("[truncated]"));
});

test("readTextSafe returns error on missing file", () => {
  const r = readTextSafe("Z:/missing.md");
  assert.equal(r.data, null);
  assert.ok(r.error.length > 0);
});

// ---------- formatAgeMs ----------

test("formatAgeMs renders seconds/minutes/hours/days correctly", () => {
  assert.equal(formatAgeMs(500), "0s");
  assert.equal(formatAgeMs(45_000), "45s");
  assert.equal(formatAgeMs(120_000), "2m");
  // 3,600,000 ms = exactly 1h — function transitions at the 60-min boundary
  assert.equal(formatAgeMs(3_600_000), "1h");
  assert.equal(formatAgeMs(7_200_000), "2h");
  assert.equal(formatAgeMs(4 * 24 * 3_600_000), "4d");
});

test("formatAgeMs returns '—' on bad input", () => {
  assert.equal(formatAgeMs(-1), "—");
  assert.equal(formatAgeMs(NaN), "—");
  assert.equal(formatAgeMs(undefined), "—");
});

// ---------- heartbeatStatus ----------

test("heartbeatStatus classifies fresh / warn / fail correctly", () => {
  const now = Date.parse("2026-05-16T12:00:00.000Z");
  assert.equal(heartbeatStatus("2026-05-16T11:59:00.000Z", now).status, "ok");
  assert.equal(heartbeatStatus("2026-05-16T11:53:00.000Z", now).status, "warn");
  assert.equal(heartbeatStatus("2026-05-16T11:40:00.000Z", now).status, "fail");
});

test("heartbeatStatus handles missing/garbage heartbeat", () => {
  assert.equal(heartbeatStatus(null).status, undefined);
  assert.equal(heartbeatStatus("").status, undefined);
  assert.equal(heartbeatStatus("not-a-date").status, "fail");
});

// ---------- panelSystemViz ----------

test("panelSystemViz emits headline+prose on valid briefing", () => {
  const out = panelSystemViz({ data: { totalNodes: 100, totalEdges: 200, totalFiles: 50, totalNamespaces: 5 } });
  assert.equal(out.length, 2);
  assert.equal(out[0].kind, "headline");
  assert.ok(out[0].cards.length >= 1);
  assert.equal(out[1].kind, "prose");
});

test("panelSystemViz reports 'unavailable' on error", () => {
  const out = panelSystemViz({ data: null, error: "ENOENT" });
  assert.equal(out[0].cards[0].status, "fail");
});

test("panelSystemViz handles missing headline counts gracefully", () => {
  const out = panelSystemViz({ data: {} });
  // Should still render — just with a warn-status card
  assert.ok(out[0].cards.length >= 1);
  assert.equal(out[0].cards[0].status, "warn");
});

// ---------- panelClaudeBrief ----------

test("panelClaudeBrief renders markdown headers + paragraphs", () => {
  const out = panelClaudeBrief({ data: "# h1\n## h2\nbody line" });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, "prose");
  assert.ok(out[0].trustedHtml.includes("<h2>h1</h2>"));
  assert.ok(out[0].trustedHtml.includes("<h3>h2</h3>"));
  assert.ok(out[0].trustedHtml.includes("body line"));
});

test("panelClaudeBrief surfaces error", () => {
  const out = panelClaudeBrief({ data: null, error: "ENOENT" });
  assert.ok(out[0].text.includes("ENOENT"));
});

// ---------- panelBuildState ----------

test("panelBuildState emits headline cards with correct statuses", () => {
  const out = panelBuildState({ data: { headline: { enginesWired: 100, enginesUnwired: 5, envelopeDrift: 0, frontendsPending: 0 } } });
  assert.equal(out[0].kind, "headline");
  const cards = out[0].cards;
  assert.equal(cards.find((c) => c.label.includes("wired")).status, "ok");
  assert.equal(cards.find((c) => c.label.includes("unwired")).status, "warn");
  assert.equal(cards.find((c) => c.label.includes("drift")).status, "ok");
});

test("panelBuildState appends drift table when drift entries present", () => {
  const out = panelBuildState({ data: { headline: { enginesWired: 1 }, envelopeDrift: [{ milestone: "MS-X", claimedStatus: "completed", derivedStatus: "not_started", note: "n" }] } });
  assert.equal(out.length, 2);
  assert.equal(out[1].kind, "table");
  assert.equal(out[1].rows.length, 1);
  assert.deepEqual(out[1].headers, ["milestone", "claimed", "derived", "notes"]);
});

test("panelBuildState handles missing data fail-soft", () => {
  const out = panelBuildState({ data: null, error: "ENOENT" });
  assert.equal(out[0].cards[0].status, "fail");
});

// ---------- panelScrutinyLedger ----------

test("panelScrutinyLedger flags CLEARED when all 3 arms reviewed", () => {
  const out = panelScrutinyLedger({
    data: [{ sid: "s1", target: "abc1234", opusReviewed: true, claudeReviewed: true, codexReviewed: true, updatedAt: "2026-05-16T10:00:00.000Z" }],
  });
  assert.equal(out[0].rows[0][5], "CLEARED");
});

test("panelScrutinyLedger flags OPEN when arms are missing", () => {
  const out = panelScrutinyLedger({
    data: [{ sid: "s2", target: "def", opusReviewed: true, updatedAt: "2026-05-16T10:00:00.000Z" }],
  });
  assert.equal(out[0].rows[0][5], "OPEN");
});

test("panelScrutinyLedger handles empty ledger", () => {
  const out = panelScrutinyLedger({ data: [] });
  assert.equal(out[0].kind, "prose");
});

test("panelScrutinyLedger recognizes legacy arm aliases", () => {
  // arm B legacy alias: geminiReviewed; arm C legacy alias: analystReviewed
  const out = panelScrutinyLedger({
    data: [{ sid: "s3", target: "x", opusReviewed: true, geminiReviewed: true, analystReviewed: true }],
  });
  assert.equal(out[0].rows[0][5], "CLEARED");
});

// ---------- panelRecallTop ----------

test("panelRecallTop emits barchart with recall counts", () => {
  const out = panelRecallTop({ data: [{ entry: "wiki-x", count: 42 }, { entry: "wiki-y", count: 18 }] });
  assert.equal(out[0].kind, "barchart");
  assert.equal(out[0].data.length, 2);
  assert.equal(out[0].data[0].value, 42);
});

test("panelRecallTop handles empty data", () => {
  const out = panelRecallTop({ data: [] });
  assert.equal(out[0].kind, "prose");
});

// ---------- panelChatBus ----------

test("panelChatBus emits table row per slot with heartbeat status", () => {
  const now = Date.parse("2026-05-16T12:00:00.000Z");
  const out = panelChatBus({
    data: [{ slot: "alpha", chatId: "claude-aaa", branch: "b", topic: "t", activity: "build", lastHeartbeat: "2026-05-16T11:59:00.000Z" }],
  }, now);
  assert.equal(out[0].kind, "table");
  assert.equal(out[0].rows.length, 1);
  assert.equal(out[0].rows[0][0], "alpha");
  assert.ok(out[0].rows[0][4].includes("✓"));
});

test("panelChatBus handles empty fleet", () => {
  const out = panelChatBus({ data: [] });
  assert.equal(out[0].kind, "prose");
});

// ---------- panelWorkboard ----------

test("panelWorkboard renders list items + headings", () => {
  const out = panelWorkboard({ data: "## In flight\n- one\n- two\n# Goals" });
  assert.equal(out[0].kind, "prose");
  assert.ok(out[0].trustedHtml.includes("<li>one</li>"));
  assert.ok(out[0].trustedHtml.includes("<li>two</li>"));
  assert.ok(out[0].trustedHtml.includes("<h3>In flight</h3>"));
});

// ---------- assembleDashboard (integration) ----------

test("assembleDashboard returns a self-contained HTML page from real repo", () => {
  // Use the real repo root so we exercise actual readers + render lib.
  const html = assembleDashboard("H:/prism");
  assert.ok(typeof html === "string");
  assert.ok(html.length > 1000, `expected >1k bytes, got ${html.length}`);
  // self-contained: must include inline <style>
  assert.ok(html.includes("<style>"));
  // 7 panels: each kind should appear at least once OR a prose fallback should
  assert.ok(html.includes("<h1"), "must include page header H1");
  // Generated-at timestamp present
  assert.ok(/Generated/.test(html) || /generated/i.test(html));
});

test("assembleDashboard remains stable on empty/bad sources", () => {
  // Override REPO_ROOT to a tmp dir with no data files.
  const dir = tmpRepo();
  const html = assembleDashboard(dir);
  assert.ok(typeof html === "string");
  assert.ok(html.length > 200, "must still render a page even with no data");
  assert.ok(html.includes("<style>"));
});

test("assembleDashboard includes header for all 7 panels", () => {
  // Seed minimal data files so panels have content.
  const dir = tmpRepo();
  writeJson(path.join(dir, "state/shared/system-viz/EXECUTIVE-BRIEFING.json"), { totalNodes: 1, totalEdges: 1 });
  fs.writeFileSync(path.join(dir, "state/shared/CLAUDE-BRIEF.md"), "# brief");
  writeJson(path.join(dir, "state/shared/BUILD_STATE.json"), { headline: { enginesWired: 1 } });
  writeJson(path.join(dir, "mcp-server/data/state/SCRUTINY_LEDGER.json"), { s1: { target: "x", opusReviewed: true } });
  writeJson(path.join(dir, "mcp-server/data/state/wiki-recall-counts.json"), { "wiki-a": 5 });
  writeJson(path.join(dir, "state/shared/chat-slots.json"), { slots: { alpha: { chatId: "x", lastHeartbeat: new Date().toISOString() } } });
  fs.writeFileSync(path.join(dir, "state/shared/AGENT_WORKBOARD.md"), "# board\n- x");

  const html = assembleDashboard(dir);
  // Panel titles (loose substring match — the C1 renderer uses these labels)
  const expectMarkers = [
    "PRISM Brain",         // panelSystemViz
    "engines wired",       // panelBuildState
    "Chat fleet",          // panelChatBus
    "CLAUDE-BRIEF",        // panelClaudeBrief
    "Wiki recall",         // panelRecallTop
    "Scrutiny ledger",     // panelScrutinyLedger
    "workboard",           // panelWorkboard
  ];
  for (const marker of expectMarkers) {
    assert.ok(html.includes(marker), `dashboard missing panel marker: ${marker}`);
  }
});
