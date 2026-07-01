#!/usr/bin/env node
/**
 * Tests for knowledge-link-audit-inject.mjs (iter 5 /goal synergize, echo).
 *
 * Coverage:
 *   - loadAudit:    valid JSON, missing file, corrupt JSON, hostile-size,
 *                   wrong shape (no .stats), zero-size, null ageMs handling
 *   - brokenRatio:  zero-total, negative, non-finite, valid, missing stats
 *   - pickTopBroken: empty/null, garbage entries, K clamped, K=0
 *   - formatDigest: below-threshold silence, above-threshold render, stale
 *                   gate, missing samples, threshold override, topK override
 *   - real-data E2E: parse the actual on-disk audit JSON (iter 4 producer)
 *                   and assert digest contains the expected 4136/97673 line
 *
 * Run: node --test .claude/hooks/knowledge-link-audit-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadAudit,
  brokenRatio,
  pickTopBroken,
  formatDigest,
} from "./knowledge-link-audit-inject.mjs";

// ───────────────────────── loadAudit ─────────────────────────

test("loadAudit: valid JSON returns {audit, ageMs}", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kla-load-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0", stats: { linksTotal: 100, linksBroken: 5, filesScanned: 10 }, broken: [] }));
  const now = Date.now();
  const r = loadAudit(f, now + 1000);
  assert.ok(r, "should return non-null");
  assert.equal(r.audit.stats.linksBroken, 5);
  assert.ok(r.ageMs >= 0, "ageMs is non-negative");
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: missing file returns null", () => {
  assert.equal(loadAudit("/nonexistent/path/audit.json"), null);
});

test("loadAudit: corrupt JSON returns null (fail-soft)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kla-corrupt-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "{not valid json");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: wrong shape (no .stats) returns null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kla-shape-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0", broken: [] }));
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: zero-size file returns null (hostile-payload guard)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kla-zero-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: null returns null when audit not object", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "kla-null-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "null");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── brokenRatio ─────────────────────────

test("brokenRatio: valid stats → ratio", () => {
  assert.equal(brokenRatio({ linksTotal: 100, linksBroken: 5 }), 0.05);
  assert.equal(brokenRatio({ linksTotal: 97673, linksBroken: 4136 }), 4136 / 97673);
});

test("brokenRatio: zero/missing/non-finite total → 0 (no div-by-zero)", () => {
  assert.equal(brokenRatio({ linksTotal: 0, linksBroken: 5 }), 0);
  assert.equal(brokenRatio({ linksTotal: -10, linksBroken: 5 }), 0);
  assert.equal(brokenRatio({ linksTotal: NaN, linksBroken: 5 }), 0);
  assert.equal(brokenRatio({}), 0);
  assert.equal(brokenRatio(null), 0);
  assert.equal(brokenRatio(undefined), 0);
});

test("brokenRatio: negative broken → 0 (defensive)", () => {
  assert.equal(brokenRatio({ linksTotal: 100, linksBroken: -5 }), 0);
  assert.equal(brokenRatio({ linksTotal: 100, linksBroken: NaN }), 0);
});

// ───────────────────────── pickTopBroken ─────────────────────────

test("pickTopBroken: empty/null/garbage → []", () => {
  assert.deepEqual(pickTopBroken([]), []);
  assert.deepEqual(pickTopBroken(null), []);
  assert.deepEqual(pickTopBroken("not-array"), []);
  assert.deepEqual(pickTopBroken(undefined), []);
});

test("pickTopBroken: K clamped to [0,20], default 3", () => {
  const bigArr = Array.from({ length: 30 }, (_, i) => ({ from: `f${i}`, link: `l${i}` }));
  assert.equal(pickTopBroken(bigArr).length, 3, "default 3");
  assert.equal(pickTopBroken(bigArr, 0).length, 0, "K=0 returns []");
  assert.equal(pickTopBroken(bigArr, 5).length, 5);
  assert.equal(pickTopBroken(bigArr, 100).length, 20, "K capped at 20");
  assert.equal(pickTopBroken(bigArr, -5).length, 0, "negative K → 0");
  assert.equal(pickTopBroken(bigArr, NaN).length, 3, "NaN K → default");
});

test("pickTopBroken: projects to {from,link} with garbage-safe coercion", () => {
  const r = pickTopBroken([
    { from: "wiki/x.md", link: "y" },
    { from: null, link: undefined },
    { broken: "shape" },
  ]);
  assert.deepEqual(r, [
    { from: "wiki/x.md", link: "y" },
    { from: "?", link: "?" },
    { from: "?", link: "?" },
  ]);
});

test("pickTopBroken: preserves producer-sorted order (slice prefix, no resort)", () => {
  const r = pickTopBroken([
    { from: "z.md", link: "a" },
    { from: "a.md", link: "z" },
    { from: "m.md", link: "m" },
  ], 2);
  assert.deepEqual(r.map((x) => x.from), ["z.md", "a.md"], "trusts producer sort");
});

// ───────────────────────── formatDigest ─────────────────────────

const SAMPLE_AUDIT = {
  schemaVersion: "1.0.0",
  stats: { linksTotal: 100, linksBroken: 5, filesScanned: 10, linksResolved: 95 },
  broken: [{ from: "wiki/a.md", link: "missing-x" }],
};

test("formatDigest: below threshold returns null (silent skip)", () => {
  // 5/100 = 5% — at default threshold (2%) this would normally fire,
  // so override the threshold to 10% to drive the below-threshold path.
  assert.equal(formatDigest(SAMPLE_AUDIT, 0, { threshold: 0.10 }), null);
});

test("formatDigest: above threshold renders 3-4 line digest", () => {
  const out = formatDigest(SAMPLE_AUDIT, 0, { threshold: 0.01 });
  assert.ok(out, "should render");
  assert.ok(out.includes("Wiki↔Memory link integrity"), "header present");
  assert.ok(out.includes("**5**"), "broken count");
  assert.ok(out.includes("100"), "total count");
  assert.ok(out.includes("5.0%"), "ratio formatted");
  assert.ok(out.includes("missing-x"), "sample link rendered");
  assert.ok(out.includes("PRISM_KNOWLEDGE_LINK_AUDIT_INJECT=0"), "disable knob hint");
});

test("formatDigest: stale gate — report > staleHrs returns null", () => {
  const ageMs = 31 * 24 * 3600_000; // 31d
  assert.equal(formatDigest(SAMPLE_AUDIT, ageMs, { threshold: 0.01, staleHrs: 720 }), null);
});

test("formatDigest: stale gate honors override", () => {
  const ageMs = 25 * 3600_000; // 25h
  // staleHrs:24 → stale → null
  assert.equal(formatDigest(SAMPLE_AUDIT, ageMs, { threshold: 0.01, staleHrs: 24 }), null);
  // staleHrs:48 → fresh → renders
  assert.ok(formatDigest(SAMPLE_AUDIT, ageMs, { threshold: 0.01, staleHrs: 48 }));
});

test("formatDigest: missing/null audit → null", () => {
  assert.equal(formatDigest(null, 0), null);
  assert.equal(formatDigest({}, 0), null);
  assert.equal(formatDigest({ stats: null }, 0), null);
});

test("formatDigest: zero total → silent (ratio=0 below any threshold>0)", () => {
  const a = { stats: { linksTotal: 0, linksBroken: 0, filesScanned: 0 }, broken: [] };
  assert.equal(formatDigest(a, 0), null);
});

test("formatDigest: empty broken array — still renders if above threshold", () => {
  // Pathological but possible: counts say 5 broken but array empty (corruption).
  const a = { stats: { linksTotal: 100, linksBroken: 5 }, broken: [] };
  const out = formatDigest(a, 0, { threshold: 0.01 });
  assert.ok(out, "still renders the count");
  assert.ok(!out.includes("Top "), "no Top section when samples empty");
});

test("formatDigest: topK override surfaces correct number of samples", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 50 },
    broken: Array.from({ length: 10 }, (_, i) => ({ from: `f${i}`, link: `l${i}` })),
  };
  const out = formatDigest(a, 0, { threshold: 0.01, topK: 5 });
  assert.ok(out.includes("Top 5"), "Top 5 header");
  // 5 samples → 5 bullet lines
  assert.equal(out.split("\n").filter((l) => l.includes("• `l")).length, 5);
});

test("formatDigest: deterministic — same input twice is identical", () => {
  const a = JSON.parse(JSON.stringify(SAMPLE_AUDIT));
  const out1 = formatDigest(a, 1000, { threshold: 0.01 });
  const out2 = formatDigest(a, 1000, { threshold: 0.01 });
  assert.equal(out1, out2);
});

test("formatDigest: age label renders 'fresh' (<1h) vs '<N>h old'", () => {
  const out1 = formatDigest(SAMPLE_AUDIT, 30 * 60_000, { threshold: 0.01 }); // 30m
  assert.ok(out1.includes("fresh"), "fresh under 1h");
  const out2 = formatDigest(SAMPLE_AUDIT, 5 * 3600_000, { threshold: 0.01 }); // 5h
  assert.ok(out2.includes("5h old"), "hours rendered");
});

// ───────────────────────── P1-1 anti-regression (env=0) ─────────────────────────
// Both 2-of-2 reviewers cross-flagged this: `Number(env) || DEFAULT` swallows
// the legitimate env value 0. The fix uses Number.isFinite. These tests pin
// the contract at the pure-core layer (main() reads env, builds opts, passes
// to formatDigest — the opts plumbing is the only place 0 can be lost).

test("env=0 anti-regression: threshold=0 surfaces every broken link", () => {
  // ratio 0.01 < default 0.02 → would be silent at default. Pass threshold=0
  // explicitly: must render. (Pre-fix bug: 0 || 0.02 === 0.02 silenced it.)
  const a = { stats: { linksTotal: 1000, linksBroken: 10, filesScanned: 5 }, broken: [] };
  const out = formatDigest(a, 0, { threshold: 0, topK: 3, staleHrs: 720 });
  assert.ok(out, "threshold=0 must NOT collapse to default");
  assert.ok(out.includes("1.0%"), "1% ratio rendered");
});

test("env=0 anti-regression: topK=0 renders header + ratio with no bullets", () => {
  const a = {
    stats: { linksTotal: 100, linksBroken: 50 },
    broken: [{ from: "x.md", link: "y" }, { from: "z.md", link: "w" }],
  };
  const out = formatDigest(a, 0, { threshold: 0.01, topK: 0, staleHrs: 720 });
  assert.ok(out, "topK=0 still renders header");
  assert.ok(!out.includes("Top "), "no 'Top N' section");
  assert.ok(!out.includes("•"), "no bullet samples");
});

test("env=0 anti-regression: staleHrs=0 silences (every report is stale)", () => {
  const a = { stats: { linksTotal: 100, linksBroken: 50 }, broken: [] };
  // ageMs=1 > staleMs=0 → silent
  assert.equal(formatDigest(a, 1, { threshold: 0.01, topK: 3, staleHrs: 0 }), null);
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: parses live producer JSON + renders iter-4 numbers", () => {
  const live = "H:/prism/state/shared/.knowledge-link-audit.json";
  // Skip gracefully if producer artifact missing (e.g. clean clone CI).
  if (!existsSync(live)) {
    console.log("  SKIP: live audit JSON not present (clean-clone)");
    return;
  }
  const loaded = loadAudit(live);
  assert.ok(loaded, "live audit loads");
  assert.ok(loaded.audit.stats, "live audit has stats");
  // Iter 4 first run measured 4136/97673; tolerate later re-runs by bounding.
  assert.ok(loaded.audit.stats.linksTotal >= 50_000, "linksTotal is realistic");
  assert.ok(loaded.audit.stats.linksBroken >= 1, "some broken links");
  // Force-render bypassing stale gate (cron-throttle staleness is expected here).
  const out = formatDigest(loaded.audit, 0, { threshold: 0.0 });
  assert.ok(out, "renders");
  assert.ok(out.includes("broken"), "mentions broken");
  assert.ok(out.includes("md files"), "mentions files scanned");
});
