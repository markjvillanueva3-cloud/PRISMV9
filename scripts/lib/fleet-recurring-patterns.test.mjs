/**
 * fleet-recurring-patterns.test.mjs -- real reference-value tests for the pure pattern aggregator.
 * Run: node --test scripts/lib/fleet-recurring-patterns.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  regressionFingerprint,
  clusterRegressions,
  extractScope,
  tallyScopes,
  extractWikiLinks,
  tallyCitations,
  detectFixRebreakLoops,
  buildDigest,
  renderDigest,
  DEFAULT_MIN_REGRESSION_HITS,
  DEFAULT_MIN_SCOPE_HITS,
} from "./fleet-recurring-patterns.mjs";

// ---- regressionFingerprint -----------------------------------------------------------------
test("regressionFingerprint: identical semantic content -> same fingerprint despite SHAs/numbers", () => {
  const a = "2026-06-15 | fix MCP daemon pid 12568 timeout 0xC0000142 see commit 5c4778b59";
  const b = "2026-06-16 | fix MCP daemon pid 99999 timeout 0xDEADBEEF see commit abcdef12";
  assert.equal(regressionFingerprint(a), regressionFingerprint(b));
});

test("regressionFingerprint: returns empty string for non-string input", () => {
  assert.equal(regressionFingerprint(null), "");
  assert.equal(regressionFingerprint(undefined), "");
  assert.equal(regressionFingerprint(42), "");
});

test("regressionFingerprint: empty string -> empty", () => {
  assert.equal(regressionFingerprint(""), "");
});

test("regressionFingerprint: tokens stripped of versions, hex, U-ids", () => {
  const fp = regressionFingerprint("U-ABC123 ship feature 0xFF version 1.2.3");
  // After stripping U-id, hex, version, digits: "ship feature"
  assert.ok(fp.includes("ship"));
  assert.ok(fp.includes("feature"));
  assert.ok(!fp.includes("123"));
});

// ---- clusterRegressions --------------------------------------------------------------------
test("clusterRegressions: groups by fingerprint, keeps >= minHits", () => {
  const lines = [
    "fix MCP daemon timeout",
    "fix MCP daemon timeout again",
    "fix MCP daemon timeout once more",
    "unrelated thing",
  ];
  const groups = clusterRegressions(lines, 3);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 3);
});

test("clusterRegressions: below threshold returns nothing", () => {
  const lines = ["fix mcp", "fix mcp", "other"];
  assert.equal(clusterRegressions(lines, 3).length, 0);
});

test("clusterRegressions: non-array returns []", () => {
  assert.deepEqual(clusterRegressions(null), []);
  assert.deepEqual(clusterRegressions("not-array"), []);
});

test("clusterRegressions: default minHits = DEFAULT_MIN_REGRESSION_HITS (3)", () => {
  assert.equal(DEFAULT_MIN_REGRESSION_HITS, 3);
});

test("clusterRegressions: caps samples at 3 per group", () => {
  const lines = Array(7).fill("fix wsl memory guard hang");
  const groups = clusterRegressions(lines, 3);
  assert.equal(groups[0].count, 7);
  assert.equal(groups[0].samples.length, 3);
});

// ---- extractScope --------------------------------------------------------------------------
test("extractScope: standard [SCOPE]/U-ID subject", () => {
  const r = extractScope("[MAIN] [FLEET-HYGIENE]/U-MCP-BRIDGE: title");
  assert.deepEqual(r, { scope: "FLEET-HYGIENE", unit: "U-MCP-BRIDGE" });
});

test("extractScope: subject without scope returns null", () => {
  assert.equal(extractScope("just a commit message"), null);
});

test("extractScope: non-string returns null", () => {
  assert.equal(extractScope(null), null);
  assert.equal(extractScope(123), null);
});

// ---- tallyScopes ---------------------------------------------------------------------------
test("tallyScopes: groups commits by SCOPE, counts distinct units", () => {
  const subjects = [
    "[FLEET-HYGIENE]/U-A: x",
    "[FLEET-HYGIENE]/U-B: y",
    "[FLEET-HYGIENE]/U-A: z",
    "[CAM]/U-A: cam thing",
    "[FLEET-HYGIENE]/U-C: w",
    "[FLEET-HYGIENE]/U-D: v",
    "[FLEET-HYGIENE]/U-E: u",
  ];
  const tallies = tallyScopes(subjects, 5);
  assert.equal(tallies.length, 1);
  assert.equal(tallies[0].scope, "FLEET-HYGIENE");
  assert.equal(tallies[0].count, 6);
  assert.equal(tallies[0].distinctUnits, 5); // A,B,C,D,E
});

test("tallyScopes: default minHits = DEFAULT_MIN_SCOPE_HITS (5)", () => {
  assert.equal(DEFAULT_MIN_SCOPE_HITS, 5);
});

test("tallyScopes: non-array returns []", () => {
  assert.deepEqual(tallyScopes(null), []);
});

// ---- extractWikiLinks ----------------------------------------------------------------------
test("extractWikiLinks: pulls all [[X]] tokens, lowercased", () => {
  const text = "see [[Alpha]] and [[BravoBeta]] also [[Alpha]] again";
  const links = extractWikiLinks(text);
  assert.deepEqual(links, ["alpha", "bravobeta", "alpha"]);
});

test("extractWikiLinks: honors [[X|alias]] form (takes the canonical name)", () => {
  const links = extractWikiLinks("see [[real-name|pretty alias]]");
  assert.deepEqual(links, ["real-name"]);
});

test("extractWikiLinks: returns [] for non-string", () => {
  assert.deepEqual(extractWikiLinks(null), []);
});

test("extractWikiLinks: no links -> []", () => {
  assert.deepEqual(extractWikiLinks("no links here"), []);
});

// ---- tallyCitations ------------------------------------------------------------------------
test("tallyCitations: counts, filters by minHits, sorts desc", () => {
  const links = ["a", "a", "a", "b", "b", "c"];
  const out = tallyCitations(links, 2);
  assert.deepEqual(out, [{ link: "a", count: 3 }, { link: "b", count: 2 }]);
});

test("tallyCitations: skips non-string entries", () => {
  const out = tallyCitations(["a", null, "a", undefined, "a", 42], 2);
  assert.deepEqual(out, [{ link: "a", count: 3 }]);
});

// ---- detectFixRebreakLoops ----------------------------------------------------------------
test("detectFixRebreakLoops: scope with fix commit AND regression mention -> flagged", () => {
  const commits = ["[FLEET-HYGIENE]/U-FIX1: fix MCP race condition"];
  const regressions = ["2026-06-15 | [FLEET-HYGIENE]/U-FIX1 MCP race condition again"];
  const loops = detectFixRebreakLoops(commits, regressions);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].scope, "FLEET-HYGIENE");
  assert.equal(loops[0].regressionHits, 1);
});

test("detectFixRebreakLoops: scope with fix but no regression -> not flagged", () => {
  const commits = ["[FLEET-HYGIENE]/U-FIX1: fix MCP race"];
  const regressions = ["2026-06-15 | [OTHER-SCOPE]/U-X some other thing"];
  assert.deepEqual(detectFixRebreakLoops(commits, regressions), []);
});

test("detectFixRebreakLoops: adversarial -- non-array inputs return []", () => {
  assert.deepEqual(detectFixRebreakLoops(null, []), []);
  assert.deepEqual(detectFixRebreakLoops([], null), []);
});

test("detectFixRebreakLoops: regression-only without matching fix-commit -> not flagged", () => {
  const commits = ["[A]/U-1: build something"];
  const regressions = ["2026-06-15 | [B]/U-2: regression"];
  assert.deepEqual(detectFixRebreakLoops(commits, regressions), []);
});

// ---- buildDigest --------------------------------------------------------------------------
test("buildDigest: integrates all signals correctly", () => {
  const raw = {
    regressionLines: [
      "fix mcp daemon timeout",
      "fix mcp daemon timeout",
      "fix mcp daemon timeout",
    ],
    commitSubjects: [
      "[FLEET-HYGIENE]/U-A: a",
      "[FLEET-HYGIENE]/U-B: b",
      "[FLEET-HYGIENE]/U-C: c",
      "[FLEET-HYGIENE]/U-D: d",
      "[FLEET-HYGIENE]/U-E: e",
    ],
    allCitations: ["alpha", "alpha", "alpha", "bravo"],
    regressionFileCount: 2,
  };
  const d = buildDigest(raw, { windowDays: 7, generatedAtMs: 1000 });
  assert.equal(d.regressionPatterns.length, 1);
  assert.equal(d.scopePatterns.length, 1);
  assert.equal(d.topCitations.length, 1);
  assert.equal(d.topCitations[0].link, "alpha");
  assert.equal(d.windowDays, 7);
  assert.equal(d.generatedAtMs, 1000);
  assert.equal(d.regressionFileCount, 2);
});

test("buildDigest: empty inputs -> empty digest with structural fields intact", () => {
  const d = buildDigest({}, {});
  assert.equal(d.regressionPatterns.length, 0);
  assert.equal(d.scopePatterns.length, 0);
  assert.equal(d.topCitations.length, 0);
  assert.equal(d.commitCount, 0);
  assert.equal(d.citationCount, 0);
  assert.ok(d.thresholds);
});

test("buildDigest: respects opts overrides", () => {
  const raw = {
    commitSubjects: [
      "[X]/U-1: a", "[X]/U-2: b", "[X]/U-3: c",
    ],
  };
  // minScopeHits=3 should match; default 5 would not
  const dWithLowThreshold = buildDigest(raw, { minScopeHits: 3 });
  const dWithDefault = buildDigest(raw, {});
  assert.equal(dWithLowThreshold.scopePatterns.length, 1);
  assert.equal(dWithDefault.scopePatterns.length, 0);
});

// ---- renderDigest --------------------------------------------------------------------------
test("renderDigest: produces markdown with section headers + summary line", () => {
  const d = buildDigest({
    regressionLines: ["a", "a", "a"],
    commitSubjects: ["[S]/U-1: x"],
    allCitations: ["q", "q", "q"],
  }, { windowDays: 14, generatedAtMs: 1000 });
  const md = renderDigest(d);
  assert.ok(md.includes("# FLEET RECURRING-PATTERNS DIGEST"));
  assert.ok(md.includes("## Summary"));
  assert.ok(md.includes("## Recurring regression classes"));
  assert.ok(md.includes("## Scope focus"));
  assert.ok(md.includes("## Top fleet-wide citations"));
  assert.ok(md.includes("14d"));
});

test("renderDigest: fix-rebreak section appears only when loops exist", () => {
  const dNo = buildDigest({}, {});
  const mdNo = renderDigest(dNo);
  assert.ok(!mdNo.includes("Fix-then-rebreak"));

  const dYes = buildDigest({
    commitSubjects: ["[X]/U-1: fix bad thing"],
    regressionLines: ["[X]/U-2 still bad"],
  }, {});
  const mdYes = renderDigest(dYes);
  assert.ok(mdYes.includes("Fix-then-rebreak"));
});

test("renderDigest: returns empty string for non-object input", () => {
  assert.equal(renderDigest(null), "");
  assert.equal(renderDigest("not-an-object"), "");
});
