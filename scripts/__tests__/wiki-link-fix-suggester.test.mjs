/**
 * Tests for COMBO-EFFICIENCY-MS0 / P1-U02 wiki-link-fix-suggester.mjs.
 *
 * Coverage:
 *   - slugify: lowercase + replace + collapse
 *   - levenshtein: identical/empty/single-edit/large-distance + adversarial
 *   - scoreCandidate: exact / prefix / substring / levenshtein / decay
 *   - rankCandidates: top-K ordering, noise-floor cutoff, autoApplyEligible
 *   - classifyConfidence: each boundary
 *   - buildSummary: tallies + autoApplyCount
 *   - suggestFixes (I/O): tempdir fixtures with seeded audit + wiki files
 *   - CLI: --dry mode + env disable + batch limit
 *
 * Run: node --test scripts/__tests__/wiki-link-fix-suggester.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  SCHEMA_VERSION,
  slugify,
  levenshtein,
  scoreCandidate,
  rankCandidates,
  classifyConfidence,
  buildSummary,
  suggestFixes,
  isAutoApplyReason,
} from "../wiki-link-fix-suggester.mjs";

// ─── slugify ───────────────────────────────────────────────────────────────

describe("slugify", () => {
  test("lowercases", () => {
    assert.equal(slugify("Hello"), "hello");
  });
  test("replaces whitespace, underscores, dots, slashes with dashes", () => {
    assert.equal(slugify("foo bar_baz.quux/bar"), "foo-bar-baz-quux-bar");
  });
  test("strips non-alphanumerics", () => {
    assert.equal(slugify("Foo@#$%Bar!"), "foobar");
  });
  test("collapses multiple dashes", () => {
    assert.equal(slugify("foo---bar___baz"), "foo-bar-baz");
  });
  test("trims leading/trailing dashes", () => {
    assert.equal(slugify("-foo-bar-"), "foo-bar");
  });
  test("empty + non-string defensive", () => {
    assert.equal(slugify(""), "");
    assert.equal(slugify(null), "");
    assert.equal(slugify(42), "");
  });
});

// ─── levenshtein ───────────────────────────────────────────────────────────

describe("levenshtein", () => {
  test("identical → 0", () => {
    assert.equal(levenshtein("abc", "abc"), 0);
  });
  test("empty + non-empty → length of other", () => {
    assert.equal(levenshtein("", "abc"), 3);
    assert.equal(levenshtein("abc", ""), 3);
    assert.equal(levenshtein("", ""), 0);
  });
  test("single edits", () => {
    assert.equal(levenshtein("kitten", "sitten"), 1);  // sub
    assert.equal(levenshtein("kitten", "kittenx"), 1); // ins
    assert.equal(levenshtein("kittenx", "kitten"), 1); // del
  });
  test("classic kitten/sitting → 3", () => {
    assert.equal(levenshtein("kitten", "sitting"), 3);
  });
  test("non-string → Infinity (defensive)", () => {
    assert.equal(levenshtein(null, "abc"), Infinity);
    assert.equal(levenshtein("abc", undefined), Infinity);
    assert.equal(levenshtein(42, "abc"), Infinity);
  });
});

// ─── scoreCandidate ────────────────────────────────────────────────────────

describe("scoreCandidate", () => {
  test("exact match → 1.0", () => {
    const r = scoreCandidate("foo-bar", "foo-bar");
    assert.equal(r.score, 1.0);
    assert.equal(r.reason, "exact-match");
  });
  // RECALIBRATED 2026-06-08 (U-VAULT-LINK-HEAL): structural prefix/substring is now
  // a MEDIUM hint (0.70), capped BELOW the 0.85 auto-apply floor. The over-confident
  // 0.85-0.95 scores tagged 91% of broken links auto-apply-eligible — wholesale risk.
  const AUTO_APPLY_FLOOR = 0.85;
  test("broken-is-prefix → 0.70 medium, NOT auto-apply", () => {
    const r = scoreCandidate("foo", "foo-bar-baz");
    assert.equal(r.score, 0.70);
    assert.ok(r.score < AUTO_APPLY_FLOOR, "prefix alone must not be auto-apply-eligible");
    assert.match(r.reason, /structural-broken-is-prefix/);
  });
  test("candidate-is-prefix → 0.70 medium", () => {
    const r = scoreCandidate("foo-bar-baz", "foo");
    assert.equal(r.score, 0.70);
    assert.ok(r.score < AUTO_APPLY_FLOOR);
  });
  test("broken-substring-of-candidate → 0.70 medium", () => {
    const r = scoreCandidate("middle", "xx-middle-yy");
    assert.equal(r.score, 0.70);
    assert.ok(r.score < AUTO_APPLY_FLOOR);
  });
  test("candidate-substring-of-broken → 0.70 medium", () => {
    const r = scoreCandidate("xx-middle-yy", "middle");
    assert.equal(r.score, 0.70);
    assert.ok(r.score < AUTO_APPLY_FLOOR);
  });
  test("ADVERSARIAL — short token `echo` as substring of unrelated slug is NOT auto-apply", () => {
    // The concrete over-confidence case: `echo` ⊂ `post-status-echo`, `echo-chamber`,
    // etc. Under the old scorer this returned 0.88 (auto-apply-eligible) → would have
    // rewritten every broken [[echo]] to a random echo-containing slug.
    const r = scoreCandidate("echo", "post-status-echo");
    assert.ok(r.score < AUTO_APPLY_FLOOR, `echo-substring must be <${AUTO_APPLY_FLOOR}, got ${r.score}`);
    assert.equal(r.score, 0.70);
  });
  test("tight levenshtein (1 edit) → 0.92, auto-apply-eligible (real typo)", () => {
    // "audit-viz" vs "audit-vix" = 1 edit — a genuine typo, SAFE to auto-apply.
    const r = scoreCandidate("audit-viz", "audit-vix");
    assert.equal(r.score, 0.92);
    assert.ok(r.score >= AUTO_APPLY_FLOOR, "a 1-edit typo clears the auto-apply floor");
    assert.match(r.reason, /levenshtein-1/);
  });
  test("2-edit levenshtein on a LONG-ENOUGH slug → 0.86, just clears auto-apply floor", () => {
    // 14-char slugs, dist 2 (frst→fixt) → minLen 14 ≥ 8, fraction 2/14=0.14 ≤ 0.17 → auto-apply OK
    const r = scoreCandidate("audit-viz-frst", "audit-viz-fixt");
    assert.equal(r.score, 0.86);
    assert.ok(r.score >= AUTO_APPLY_FLOOR);
    assert.match(r.reason, /levenshtein-2/);
  });
  test("SHORT-TOKEN guard — 2-edit on a 6-char token → 0.70 medium, NOT auto-apply", () => {
    // The session-gate P1: a 2-edit distance on a short token is a coincidental
    // near-collision, not a rename. minLen 6 < 8 → demoted to medium review.
    const r = scoreCandidate("abcdef", "abxyef");
    assert.equal(r.score, 0.70);
    assert.ok(r.score < AUTO_APPLY_FLOOR, "short-token edit must NOT auto-apply");
    assert.match(r.reason, /short-token-levenshtein-2/);
  });
  test("SHORT-TOKEN guard — real cases (goal→go, echo→eco, skill→mill) NOT auto-apply", () => {
    // The exact false positives the gate found in the regenerated candidates file.
    for (const [broken, cand] of [["goal", "go"], ["echo", "eco"], ["skill", "mill"], ["null", "mill"]]) {
      const r = scoreCandidate(broken, cand);
      assert.ok(r.score < AUTO_APPLY_FLOOR, `${broken}->${cand} must be <0.85, got ${r.score}`);
    }
  });
  test("3-edit levenshtein (long slug) → 0.62 low, NOT auto-apply", () => {
    const r = scoreCandidate("abcdefghij", "abxyzfghij"); // 3 subs, 10 chars
    assert.equal(r.score, 0.62);
    assert.ok(r.score < AUTO_APPLY_FLOOR);
  });
  test("distance-decay fallback for very different short slugs", () => {
    // "xyz" vs "abcdefghij" — both short, dist=10 (5 subs + 5 ins), maxLen=10
    // dist > 3 so not "close-levenshtein", dist > 6 so not "moderate"
    // falls to decay: 1 - 10/10 = 0
    const r = scoreCandidate("xyz", "abcdefghij");
    assert.ok(r.score <= 0.5, `expected ≤0.5, got ${r.score}`);
    assert.match(r.reason, /distance-decay/);
  });
  test("empty slug → 0", () => {
    assert.equal(scoreCandidate("", "abc").score, 0);
    assert.equal(scoreCandidate("abc", "").score, 0);
  });
  test("non-string → 0", () => {
    assert.equal(scoreCandidate(null, "abc").score, 0);
    assert.equal(scoreCandidate("abc", undefined).score, 0);
  });
});

// ─── rankCandidates ────────────────────────────────────────────────────────

describe("rankCandidates", () => {
  const fileIndex = [
    { slug: "audit-viz-first-skill",     path: "wiki/audit-viz-first-skill.md" },
    { slug: "audit-viz-first",           path: "wiki/audit-viz-first.md" },
    { slug: "completely-unrelated",      path: "wiki/completely-unrelated.md" },
    { slug: "octopus-neural-ms0",        path: "wiki/octopus-neural-ms0.md" },
  ];

  test("exact match sorts to top", () => {
    const out = rankCandidates("audit-viz-first-skill", fileIndex);
    assert.equal(out.suggestions[0].target, "wiki/audit-viz-first-skill.md");
    assert.equal(out.bestScore, 1.0);
    assert.equal(out.confidence, "high");
    assert.equal(out.autoApplyEligible, true);
  });

  test("prefix match correctly ranks below exact", () => {
    // "audit-viz-first" exists as exact + audit-viz-first-skill as prefix
    const out = rankCandidates("audit-viz-first", fileIndex);
    assert.equal(out.suggestions[0].target, "wiki/audit-viz-first.md");
    assert.equal(out.bestScore, 1.0);
  });

  test("returns empty suggestions when nothing above noise floor", () => {
    // Short query maximally distant from every candidate slug → distance-decay
    // pushes ALL scores below the 0.20 noise floor.
    const out = rankCandidates("zz", fileIndex);
    assert.equal(out.suggestions.length, 0);
    assert.equal(out.bestScore, 0);
    assert.equal(out.confidence, "none");
    assert.equal(out.autoApplyEligible, false);
  });

  test("topK limit respected", () => {
    const out = rankCandidates("audit-viz", fileIndex, { topK: 1 });
    assert.equal(out.suggestions.length, 1);
  });

  test("invalid input → empty result", () => {
    assert.equal(rankCandidates(null, fileIndex).suggestions.length, 0);
    assert.equal(rankCandidates("foo", null).suggestions.length, 0);
  });
});

// ─── isAutoApplyReason + decay-leak guard (U-VAULT-LINK-HEAL hardening) ──────

describe("isAutoApplyReason", () => {
  test("only exact + tight-edit reasons are auto-apply-eligible", () => {
    assert.equal(isAutoApplyReason("exact-match"), true);
    assert.equal(isAutoApplyReason("levenshtein-1"), true);
    assert.equal(isAutoApplyReason("levenshtein-2"), true);
  });
  test("structural + loose + decay reasons are NOT auto-apply", () => {
    assert.equal(isAutoApplyReason("structural-broken-substring-of-candidate"), false);
    assert.equal(isAutoApplyReason("levenshtein-3"), false);
    assert.equal(isAutoApplyReason("distance-decay-3"), false);
    assert.equal(isAutoApplyReason(null), false);
    assert.equal(isAutoApplyReason(undefined), false);
  });
});

describe("rankCandidates — decay-leak does NOT auto-apply (>60-char slugs)", () => {
  test("two long slugs, 3 edits → high score but NOT auto-apply-eligible", () => {
    // The reviewer-A blocker: two 61-char slugs differing by 3 chars hit the
    // distance-decay path (1 - 3/61 = 0.95), which is >0.85. Score alone would
    // mark it auto-apply; the reason gate (distance-decay-3) must veto it.
    const base = "reference_a_very_long_memory_slug_from_the_2026_05_family_aaa"; // 60 chars
    const broken = base + "xyz";       // 63 chars
    const candidate = base + "abc";    // 63 chars (3 trailing chars differ)
    const out = rankCandidates(broken, [{ slug: candidate, path: "wiki/x.md" }]);
    assert.ok(out.bestScore > 0.85, `decay path still produces a high score: ${out.bestScore}`);
    assert.equal(out.autoApplyEligible, false, "decay-3 on long slugs must NOT auto-apply");
    assert.match(out.suggestions[0].reason, /distance-decay/);
  });

  test("exact long-slug match IS still auto-apply-eligible", () => {
    const slug = "reference_obsidian_vault_audit_2026_06_08_a_long_canonical_slug";
    const out = rankCandidates(slug, [{ slug, path: "wiki/x.md" }]);
    assert.equal(out.bestScore, 1.0);
    assert.equal(out.autoApplyEligible, true, "exact match clears both gates regardless of length");
  });

  test("1-edit typo IS auto-apply-eligible (not over-corrected)", () => {
    const out = rankCandidates("audit-viz-frist", [{ slug: "audit-viz-first", path: "wiki/x.md" }]);
    assert.equal(out.autoApplyEligible, true, "a genuine 1-edit typo must still auto-apply");
  });
});

// ─── classifyConfidence ────────────────────────────────────────────────────

describe("classifyConfidence", () => {
  test("≥0.85 → high", () => {
    assert.equal(classifyConfidence(0.85), "high");
    assert.equal(classifyConfidence(1.0), "high");
  });
  test("[0.60, 0.85) → medium", () => {
    assert.equal(classifyConfidence(0.60), "medium");
    assert.equal(classifyConfidence(0.84), "medium");
  });
  test("[0.30, 0.60) → low", () => {
    assert.equal(classifyConfidence(0.30), "low");
    assert.equal(classifyConfidence(0.59), "low");
  });
  test("<0.30 → none", () => {
    assert.equal(classifyConfidence(0.29), "none");
    assert.equal(classifyConfidence(0), "none");
    assert.equal(classifyConfidence(-1), "none");
  });
  test("non-finite → none", () => {
    assert.equal(classifyConfidence(NaN), "none");
    assert.equal(classifyConfidence(Infinity), "none");
    assert.equal(classifyConfidence(null), "none");
    assert.equal(classifyConfidence("0.9"), "none");
  });
});

// ─── buildSummary ──────────────────────────────────────────────────────────

describe("buildSummary", () => {
  test("tallies per-confidence + autoApply", () => {
    const cands = [
      { confidence: "high",   autoApplyEligible: true },
      { confidence: "high",   autoApplyEligible: true },
      { confidence: "medium", autoApplyEligible: false },
      { confidence: "low",    autoApplyEligible: false },
      { confidence: "none",   autoApplyEligible: false },
      { confidence: "none",   autoApplyEligible: false },
    ];
    assert.deepEqual(buildSummary(cands), { high: 2, medium: 1, low: 1, none: 2, autoApplyCount: 2 });
  });
  test("non-array input → zero summary", () => {
    assert.deepEqual(buildSummary(null),  { high: 0, medium: 0, low: 0, none: 0, autoApplyCount: 0 });
    assert.deepEqual(buildSummary({}),    { high: 0, medium: 0, low: 0, none: 0, autoApplyCount: 0 });
  });
});

// ─── suggestFixes (I/O) ────────────────────────────────────────────────────

function withTempPrismRoot(seedFn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-link-fix-suggester-test-"));
  try {
    fs.mkdirSync(path.join(tmp, "state/shared"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "knowledge/wiki"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "knowledge/memories"), { recursive: true });
    seedFn(tmp);
    return tmp;
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
}

test("suggestFixes: end-to-end with seeded audit + wiki/memory tree", () => {
  const tmp = withTempPrismRoot((root) => {
    // Seed audit with 3 broken links.
    fs.writeFileSync(
      path.join(root, "state/shared/.knowledge-link-audit.json"),
      JSON.stringify({
        broken: [
          { link: "Audit-Viz-First-Skill", normalized: "audit-viz-first-skill", from: "MEMORY.md" },
          { link: "OCTOPUS-NEURAL-MS0",    normalized: "octopus-neural-ms0",    from: "MEMORY.md" },
          { link: "zz", normalized: "zz", from: "x.md" },
        ],
      }),
    );
    // Seed wiki with files for the first two; nothing for the third.
    fs.writeFileSync(path.join(root, "knowledge/wiki/audit-viz-first-skill.md"), "x");
    fs.writeFileSync(path.join(root, "knowledge/wiki/octopus-neural-ms0.md"), "x");
  });
  try {
    const out = suggestFixes({ prismRoot: tmp, batchLimit: 100 });
    assert.equal(out.result.schemaVersion, SCHEMA_VERSION);
    assert.equal(out.result.totalBroken, 3);
    assert.equal(out.result.processed, 3);
    assert.equal(out.result.fileIndexSize, 2);
    // First two should have exact matches (high confidence + auto-apply eligible).
    const audit = out.result.candidates.find((c) => c.normalized === "audit-viz-first-skill");
    assert.equal(audit.confidence, "high");
    assert.equal(audit.autoApplyEligible, true);
    assert.equal(audit.bestScore, 1.0);
    const oct = out.result.candidates.find((c) => c.normalized === "octopus-neural-ms0");
    assert.equal(oct.confidence, "high");
    // Third has no match.
    const none = out.result.candidates.find((c) => c.normalized === "zz");
    assert.equal(none.confidence, "none");
    assert.equal(none.autoApplyEligible, false);
    // Summary correct.
    assert.equal(out.result.summary.high, 2);
    assert.equal(out.result.summary.none, 1);
    assert.equal(out.result.summary.autoApplyCount, 2);
    // File written.
    assert.ok(fs.existsSync(out.written));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("suggestFixes: batchLimit respected", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/.knowledge-link-audit.json"),
      JSON.stringify({
        broken: Array.from({ length: 10 }, (_, i) => ({ link: `link-${i}`, normalized: `link-${i}`, from: "x.md" })),
      }),
    );
  });
  try {
    const out = suggestFixes({ prismRoot: tmp, batchLimit: 3, write: false });
    assert.equal(out.result.totalBroken, 10);
    assert.equal(out.result.processed, 3);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("suggestFixes: missing audit → empty result, no crash", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const out = suggestFixes({ prismRoot: tmp, write: false });
    assert.equal(out.result.totalBroken, 0);
    assert.equal(out.result.processed, 0);
    assert.deepEqual(out.result.summary, { high: 0, medium: 0, low: 0, none: 0, autoApplyCount: 0 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: --dry prints summary, no file written", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/.knowledge-link-audit.json"),
      JSON.stringify({ broken: [{ link: "x", normalized: "x", from: "y.md" }] }),
    );
  });
  try {
    const scriptPath = path.resolve(new URL("../wiki-link-fix-suggester.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--dry", "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.totalBroken, 1);
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/wiki-link-fix-candidates.json")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: env disable knob no-ops", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const scriptPath = path.resolve(new URL("../wiki-link-fix-suggester.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--root", tmp], {
      encoding: "utf8",
      env: { ...process.env, PRISM_WIKI_LINK_FIX_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.skipped, "disabled-via-env");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
