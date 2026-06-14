#!/usr/bin/env node
/**
 * Tests for goal-synergy-status-inject.mjs (/goal synergy iter 11, echo).
 *
 * Run: node --test .claude/hooks/goal-synergy-status-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadStatus, formatDigest } from "./goal-synergy-status-inject.mjs";

const HEALTHY = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T00:00:00Z",
  healthy: true,
  driftSurfaces: [],
  substrates: {
    linkAudit:  { present: true, summary: "5 broken / 1,000 tokens (0.5%)", stats: {} },
    wikiTribal: { present: true, summary: "5 / 100 missing (95.0% coverage)", stats: {} },
  },
};

const DRIFTED = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-05-21T00:00:00Z",
  healthy: false,
  driftSurfaces: ["link-audit", "wiki-tribal"],
  substrates: {
    linkAudit:  { present: true, summary: "4,136 broken / 97,673 tokens (4.2%)", stats: {} },
    wikiTribal: { present: true, summary: "23,802 / 23,992 missing (0.8% coverage)", stats: {} },
  },
};

// ───────────────────────── loadStatus ─────────────────────────

test("loadStatus: valid JSON → { status, ageMs }", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "gss-"));
  const f = path.join(dir, "status.json");
  writeFileSync(f, JSON.stringify(HEALTHY));
  const r = loadStatus(f, Date.now() + 1000);
  assert.ok(r);
  assert.equal(r.status.healthy, true);
  rmSync(dir, { recursive: true, force: true });
});

test("loadStatus: missing/corrupt/wrong-shape/zero-size → null", () => {
  assert.equal(loadStatus("/nonexistent/x.json"), null);
  const dir = mkdtempSync(path.join(tmpdir(), "gss-bad-"));
  const c = path.join(dir, "corrupt.json");
  writeFileSync(c, "{not valid");
  assert.equal(loadStatus(c), null);
  const w = path.join(dir, "wrong.json");
  writeFileSync(w, JSON.stringify({ healthy: true })); // no substrates
  assert.equal(loadStatus(w), null);
  const z = path.join(dir, "zero.json");
  writeFileSync(z, "");
  assert.equal(loadStatus(z), null);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── formatDigest ─────────────────────────

test("formatDigest: healthy → OK line", () => {
  const out = formatDigest(HEALTHY, 0);
  assert.ok(out, "renders OK line");
  assert.ok(out.includes("✓"));
  assert.ok(out.includes("all substrates clean"));
});

test("formatDigest: healthy + showOk=false → null (silent)", () => {
  assert.equal(formatDigest(HEALTHY, 0, { showOk: false }), null);
});

test("formatDigest: drift → one line per substrate, deterministic name-asc order", () => {
  const out = formatDigest(DRIFTED, 0);
  assert.ok(out);
  assert.ok(out.includes("⚠ linkAudit"), "linkAudit drift surfaced");
  assert.ok(out.includes("⚠ wikiTribal"), "wikiTribal drift surfaced");
  assert.ok(out.includes("4,136"), "iter-4 numbers preserved from rollup summary");
  assert.ok(out.includes("23,802"), "iter-7 numbers preserved");
  // Name-asc order: linkAudit before wikiTribal
  const idxLink = out.indexOf("linkAudit");
  const idxWiki = out.indexOf("wikiTribal");
  assert.ok(idxLink < idxWiki, "name-asc order");
});

test("formatDigest: missing substrate present:false → ⚠ ... missing audit", () => {
  const s = {
    healthy: false,
    driftSurfaces: [],
    substrates: {
      linkAudit:  { present: false, summary: "missing audit" },
      wikiTribal: { present: true, summary: "5/100 (95%)" },
    },
  };
  const out = formatDigest(s, 0);
  assert.ok(out.includes("⚠ linkAudit"), "absent substrate flagged");
  assert.ok(out.includes("missing audit"));
});

test("formatDigest: stale gate → null", () => {
  const ageMs = 31 * 24 * 3600_000;
  assert.equal(formatDigest(HEALTHY, ageMs, { staleHrs: 720 }), null);
});

test("formatDigest: null/empty input → null", () => {
  assert.equal(formatDigest(null, 0), null);
  assert.equal(formatDigest({}, 0), null);
  assert.equal(formatDigest({ substrates: null }, 0), null);
});

test("formatDigest: age label fresh (<1h) vs N h old", () => {
  assert.ok(formatDigest(DRIFTED, 30 * 60_000).includes("fresh"));
  assert.ok(formatDigest(DRIFTED, 5 * 3600_000).includes("5h old"));
});

test("formatDigest: deterministic — same input twice → identical output", () => {
  const a = formatDigest(DRIFTED, 1000);
  const b = formatDigest(DRIFTED, 1000);
  assert.equal(a, b);
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: live rollup parses + renders drift", () => {
  const live = "H:/prism/state/shared/.goal-synergy-status.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live rollup missing");
    return;
  }
  const r = loadStatus(live);
  assert.ok(r);
  const out = formatDigest(r.status, 0);
  assert.ok(out, "renders");
  // The real-data first run had healthy=false; tolerate either path though.
  assert.ok(out.includes("synergy health"));
});
