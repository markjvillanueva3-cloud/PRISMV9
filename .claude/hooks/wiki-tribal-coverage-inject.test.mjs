#!/usr/bin/env node
/**
 * Tests for wiki-tribal-coverage-inject.mjs (/goal synergy iter 8, echo).
 *
 * Coverage:
 *   - loadAudit:       valid JSON, missing/corrupt/wrong-shape/zero-size
 *   - coverageGap:     valid coverage, missing/non-finite, out-of-range clamp
 *   - pickTopMissing:  empty/null, K clamped [0,20], non-string entries safe
 *   - formatDigest:    below-threshold silence, above-threshold render,
 *                      stale gate, no samples branch, env=0 anti-regression
 *                      (mirror iter-5 P1-1)
 *   - real-data E2E:   parse the actual on-disk audit JSON (iter-7 producer)
 *
 * Run: node --test .claude/hooks/wiki-tribal-coverage-inject.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadAudit,
  coverageGap,
  pickTopMissing,
  formatDigest,
  perDomainWillRender,
} from "./wiki-tribal-coverage-inject.mjs";

// ───────────────────────── loadAudit ─────────────────────────

test("loadAudit: valid JSON returns {audit, ageMs}", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-load-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0", stats: { wikiFiles: 100, missing: 50, coverage: 0.5 }, missingFromTribal: [] }));
  const r = loadAudit(f, Date.now() + 1000);
  assert.ok(r);
  assert.equal(r.audit.stats.coverage, 0.5);
  assert.ok(r.ageMs >= 0);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: missing file → null", () => {
  assert.equal(loadAudit("/nonexistent/audit.json"), null);
});

test("loadAudit: corrupt JSON → null (fail-soft)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-corrupt-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "{not valid");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: wrong shape (no .stats) → null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-shape-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0", missingFromTribal: [] }));
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

test("loadAudit: zero-size → null", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-zero-"));
  const f = path.join(dir, "audit.json");
  writeFileSync(f, "");
  assert.equal(loadAudit(f), null);
  rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── coverageGap ─────────────────────────

test("coverageGap: valid coverage → 1 - coverage", () => {
  assert.equal(coverageGap({ coverage: 0.5 }), 0.5);
  assert.equal(coverageGap({ coverage: 0.008 }), 0.992); // iter-7 numbers
});

test("coverageGap: missing/null/non-finite → 0 (silent)", () => {
  assert.equal(coverageGap({}), 0);
  assert.equal(coverageGap(null), 0);
  assert.equal(coverageGap({ coverage: NaN }), 0);
  assert.equal(coverageGap("not-an-object"), 0);
});

test("coverageGap: out-of-range clamped", () => {
  assert.equal(coverageGap({ coverage: -0.5 }), 1, "negative → treat as total drift");
  assert.equal(coverageGap({ coverage: 1.5 }), 0, "over-1 → treat as no drift");
});

// ───────────────────────── pickTopMissing ─────────────────────────

test("pickTopMissing: empty/null/non-array → []", () => {
  assert.deepEqual(pickTopMissing([]), []);
  assert.deepEqual(pickTopMissing(null), []);
  assert.deepEqual(pickTopMissing("not-array"), []);
});

test("pickTopMissing: K clamped to [0,20], default 3", () => {
  const big = Array.from({ length: 30 }, (_, i) => `path/file${i}.md`);
  assert.equal(pickTopMissing(big).length, 3);
  assert.equal(pickTopMissing(big, 0).length, 0);
  assert.equal(pickTopMissing(big, 50).length, 20, "capped at 20");
  assert.equal(pickTopMissing(big, -5).length, 0);
});

test("pickTopMissing: garbage entries → coerced via String()", () => {
  // Explicit K=4 to surface all 4 entries (default K=3 would clip the last).
  const r = pickTopMissing([null, undefined, "valid.md", 42], 4);
  assert.equal(r[0], "");
  assert.equal(r[1], "");
  assert.equal(r[2], "valid.md");
  assert.equal(r[3], "42");
});

// ───────────────────────── formatDigest ─────────────────────────

const SAMPLE_AUDIT = {
  schemaVersion: "1.0.0",
  stats: { wikiFiles: 1000, missing: 500, stale: 0, coverage: 0.5 },
  missingFromTribal: ["lessons/a.md", "concepts/b.md"],
};

test("formatDigest: below threshold → null", () => {
  const a = { stats: { wikiFiles: 100, missing: 5, coverage: 0.95 }, missingFromTribal: [] };
  // gap = 0.05 < default 0.10 → silent
  assert.equal(formatDigest(a, 0), null);
});

test("formatDigest: above threshold → 3-4 line digest", () => {
  const out = formatDigest(SAMPLE_AUDIT, 0);
  assert.ok(out);
  assert.ok(out.includes("Wiki↔Tribal coverage"));
  assert.ok(out.includes("500"), "missing count");
  assert.ok(out.includes("1,000"), "total wiki count");
  assert.ok(out.includes("50.0%"), "coverage pct");
  assert.ok(out.includes("lessons/a.md"), "sample listed");
  assert.ok(out.includes("PRISM_WIKI_TRIBAL_INJECT=0"), "disable knob hint");
});

test("formatDigest: iter-7 numbers render properly (99.2% gap → 0.8% coverage)", () => {
  const a = {
    stats: { wikiFiles: 23992, missing: 23802, stale: 0, coverage: 0.008 },
    missingFromTribal: ["a.md", "b.md", "c.md"],
  };
  const out = formatDigest(a, 0);
  assert.ok(out.includes("23,802"), "missing");
  assert.ok(out.includes("23,992"), "total");
  assert.ok(out.includes("0.8%"), "coverage");
});

test("formatDigest: stale gate honored", () => {
  const ageMs = 31 * 24 * 3600_000;
  assert.equal(formatDigest(SAMPLE_AUDIT, ageMs), null, "31d > 30d stale ceiling");
  // staleHrs=48 + ageMs=25h → fresh
  assert.ok(formatDigest(SAMPLE_AUDIT, 25 * 3600_000, { staleHrs: 48 }));
});

test("formatDigest: empty missingFromTribal → still renders if gap above threshold", () => {
  const a = { stats: { wikiFiles: 100, missing: 50, coverage: 0.5 }, missingFromTribal: [] };
  const out = formatDigest(a, 0);
  assert.ok(out, "still renders count");
  assert.ok(!out.includes("Top "), "no Top section");
});

test("formatDigest: stale-count surfaced when nonzero", () => {
  const a = { stats: { wikiFiles: 100, missing: 30, stale: 7, coverage: 0.7 }, missingFromTribal: [] };
  const out = formatDigest(a, 0);
  assert.ok(out.includes("7 stale"));
});

test("formatDigest: missing/null audit → null", () => {
  assert.equal(formatDigest(null, 0), null);
  assert.equal(formatDigest({}, 0), null);
  assert.equal(formatDigest({ stats: null }, 0), null);
});

// Iter-8 anti-regression: same env=0 footgun class as iter-5 P1-1.
// The pure-core formatDigest test verifies threshold=0 path; the main()
// integration test (smoke) verifies the env-undefined-vs-0 logic.
test("env=0 anti-regression: threshold=0 surfaces every gap", () => {
  const a = { stats: { wikiFiles: 100, missing: 1, coverage: 0.99 }, missingFromTribal: [] };
  // gap = 0.01 < default 0.10 → silent. threshold=0 → renders.
  const out = formatDigest(a, 0, { threshold: 0 });
  assert.ok(out, "threshold=0 must NOT collapse to default");
});

test("env=0 anti-regression: topK=0 → no sample bullets", () => {
  const out = formatDigest(SAMPLE_AUDIT, 0, { topK: 0 });
  assert.ok(out);
  assert.ok(!out.includes("Top "), "no Top section");
});

test("env=0 anti-regression: staleHrs=0 → silence (everything stale)", () => {
  assert.equal(formatDigest(SAMPLE_AUDIT, 1, { staleHrs: 0 }), null);
});

// ───────────────────────── real-data E2E ─────────────────────────

test("real-data E2E: parses live producer JSON", () => {
  const live = "H:/prism/state/shared/.wiki-tribal-cross-ref-audit.json";
  if (!existsSync(live)) {
    console.log("  SKIP: live audit JSON not present");
    return;
  }
  const loaded = loadAudit(live);
  assert.ok(loaded, "live audit loads");
  assert.ok(loaded.audit.stats, "stats present");
  assert.ok(loaded.audit.stats.wikiFiles >= 100, "wiki count realistic");
  assert.ok(loaded.audit.stats.coverage >= 0 && loaded.audit.stats.coverage <= 1);
  // Force-render bypassing stale gate
  const out = formatDigest(loaded.audit, 0, { threshold: 0.0 });
  assert.ok(out, "renders");
  assert.ok(out.includes("wiki files"), "mentions wiki files");
});

// ----- U-WIKI-TRIBAL-DEDUP (bravo 2026-06-10) -----
// The global hook drops its redundant "Top N missing" list when the per-domain
// sibling block will render. These cover the pure suppressSamples path in
// formatDigest + the perDomainWillRender predictor (hermetic, temp report).

test("formatDigest: suppressSamples:true drops the sample list, keeps headline+footer", () => {
  const withSamples = formatDigest(SAMPLE_AUDIT, 0);
  assert.ok(withSamples.includes("lessons/a.md"), "baseline shows samples");
  const out = formatDigest(SAMPLE_AUDIT, 0, { suppressSamples: true });
  assert.ok(out, "still renders (headline preserved)");
  assert.ok(out.includes("Tribal coverage"), "headline kept");
  assert.ok(out.includes("50.0%"), "coverage pct kept");
  assert.ok(!out.includes("Top "), "Top N missing list dropped");
  assert.ok(!out.includes("lessons/a.md"), "sample bullets dropped");
  assert.ok(out.includes("PRISM_WIKI_TRIBAL_INJECT=0"), "footer kept");
});

test("formatDigest: suppressSamples defaults OFF (samples present) -- regression guard", () => {
  const out = formatDigest(SAMPLE_AUDIT, 0); // no opts
  assert.ok(out.includes("Top "), "default keeps the sample list");
  assert.ok(out.includes("lessons/a.md"));
});

function writeByDomain(dir, byDomain) {
  const f = path.join(dir, ".wiki-tribal-coverage-by-domain.json");
  writeFileSync(f, JSON.stringify({ schemaVersion: "1.0.0", byDomain }));
  return f;
}

test("perDomainWillRender: fresh report with a sub-threshold domain -> true", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-pd-true-"));
  const f = writeByDomain(dir, { logistics: { coverage: 0.2, wikiFiles: 22, missing: 18, sampleMissing: ["a.md"] } });
  assert.equal(perDomainWillRender(f, Date.now()), true);
  rmSync(dir, { recursive: true, force: true });
});

test("perDomainWillRender: all domains above threshold -> false (sibling silent -> keep our samples)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-pd-above-"));
  const f = writeByDomain(dir, { mill: { coverage: 0.95, wikiFiles: 100, missing: 5 } });
  assert.equal(perDomainWillRender(f, Date.now()), false);
  rmSync(dir, { recursive: true, force: true });
});

test("perDomainWillRender: missing report -> false (fail-safe keeps samples)", () => {
  assert.equal(perDomainWillRender("/nonexistent/by-domain.json", Date.now()), false);
});

test("perDomainWillRender: stale report -> false", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-pd-stale-"));
  const f = writeByDomain(dir, { logistics: { coverage: 0.2, wikiFiles: 22, missing: 18 } });
  // default per-domain stale ceiling = 168h; age it 200h into the future.
  assert.equal(perDomainWillRender(f, Date.now() + 200 * 3600_000), false);
  rmSync(dir, { recursive: true, force: true });
});

test("perDomainWillRender: PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT=0 -> false (sibling disabled)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wt-pd-off-"));
  const f = writeByDomain(dir, { logistics: { coverage: 0.2, wikiFiles: 22, missing: 18 } });
  const prev = process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT;
  process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT = "0";
  try {
    assert.equal(perDomainWillRender(f, Date.now()), false);
  } finally {
    if (prev === undefined) delete process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT;
    else process.env.PRISM_WIKI_TRIBAL_PER_DOMAIN_INJECT = prev;
  }
  rmSync(dir, { recursive: true, force: true });
});
