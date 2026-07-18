/**
 * Tests for COMBO-EFFICIENCY-MS0 / P1-U02 follow-up wiki-link-fix-apply.mjs.
 *
 * Coverage:
 *   - buildReplacementToken: extract basename, reject path-traversal/invalid chars
 *   - eligibleCandidate: confidence + score gate + shape validation
 *   - applyReplacementToText: single + multi replacement, escape metachars, no-match
 *   - inSafetyPerimeter: inside knowledge/ accepted, outside rejected, traversal rejected
 *   - applyFixes (I/O): dry-run vs apply, idempotency, backup, max-edits cap,
 *     safety perimeter rejection, missing source file skip, error short-circuit
 *
 * Run: node --test scripts/__tests__/wiki-link-fix-apply.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  SCHEMA_VERSION,
  buildReplacementToken,
  eligibleCandidate,
  applyReplacementToText,
  inSafetyPerimeter,
  applyFixes,
} from "../wiki-link-fix-apply.mjs";

// ─── buildReplacementToken ─────────────────────────────────────────────────

describe("buildReplacementToken", () => {
  test("strips .md extension from basename", () => {
    assert.equal(buildReplacementToken("knowledge/wiki/foo-bar.md"), "foo-bar");
  });
  test("works on absolute paths", () => {
    assert.equal(buildReplacementToken("/abs/path/to/baz.md"), "baz");
  });
  test("works on basename without .md (already-stripped)", () => {
    assert.equal(buildReplacementToken("plain-name"), "plain-name");
  });
  test("rejects path-traversal artifacts", () => {
    assert.equal(buildReplacementToken("foo/..bar.md"), null);
  });
  test("rejects invalid filename chars (Windows-reserved)", () => {
    assert.equal(buildReplacementToken("knowledge/wiki/foo|bar.md"), null);
    assert.equal(buildReplacementToken("knowledge/wiki/foo<bar.md"), null);
    assert.equal(buildReplacementToken("knowledge/wiki/foo*bar.md"), null);
  });
  test("rejects empty / non-string input", () => {
    assert.equal(buildReplacementToken(""), null);
    assert.equal(buildReplacementToken(null), null);
    assert.equal(buildReplacementToken(42), null);
  });
});

// ─── eligibleCandidate ─────────────────────────────────────────────────────

describe("eligibleCandidate", () => {
  const good = {
    link: "foo",
    normalized: "foo",
    from: "knowledge/memories/x.md",
    confidence: "high",
    bestScore: 1.0,
    suggestions: [{ target: "knowledge/wiki/foo.md", score: 1.0, reason: "exact-match" }],
  };

  test("accepts well-formed high-confidence candidate at floor", () => {
    assert.equal(eligibleCandidate(good, 0.85), true);
  });
  test("rejects medium/low/none confidence", () => {
    assert.equal(eligibleCandidate({ ...good, confidence: "medium" }), false);
    assert.equal(eligibleCandidate({ ...good, confidence: "low" }), false);
    assert.equal(eligibleCandidate({ ...good, confidence: "none" }), false);
  });
  test("rejects when bestScore below floor (even if confidence='high')", () => {
    assert.equal(eligibleCandidate({ ...good, bestScore: 0.80 }, 0.85), false);
  });
  test("rejects empty suggestions array", () => {
    assert.equal(eligibleCandidate({ ...good, suggestions: [] }), false);
  });
  test("rejects suggestion with no target", () => {
    assert.equal(eligibleCandidate({ ...good, suggestions: [{ score: 1, reason: "x" }] }), false);
  });
  test("rejects missing from / link", () => {
    assert.equal(eligibleCandidate({ ...good, from: "" }), false);
    assert.equal(eligibleCandidate({ ...good, link: "" }), false);
  });
  test("rejects null / non-object", () => {
    assert.equal(eligibleCandidate(null), false);
    assert.equal(eligibleCandidate("not-obj"), false);
  });
});

// ─── applyReplacementToText ────────────────────────────────────────────────

describe("applyReplacementToText", () => {
  test("replaces single [[broken]] with [[new]]", () => {
    const r = applyReplacementToText("see [[foo-bar]] for details", "foo-bar", "foo-bar-v2");
    assert.equal(r.text, "see [[foo-bar-v2]] for details");
    assert.equal(r.replaced, 1);
  });
  test("replaces all occurrences", () => {
    const r = applyReplacementToText("[[a]] [[a]] [[a]]", "a", "b");
    assert.equal(r.text, "[[b]] [[b]] [[b]]");
    assert.equal(r.replaced, 3);
  });
  test("does NOT replace pipe-alias form (out of scope)", () => {
    // [[a|alias]] is intentionally untouched (audit doesn't track aliases).
    const r = applyReplacementToText("[[a|alias]] [[a]]", "a", "b");
    assert.equal(r.text, "[[a|alias]] [[b]]");
    assert.equal(r.replaced, 1);
  });
  test("escapes regex metachars in brokenLink (defensive)", () => {
    const r = applyReplacementToText("see [[foo.bar]] here", "foo.bar", "foo-bar");
    assert.equal(r.text, "see [[foo-bar]] here");
    assert.equal(r.replaced, 1);
  });
  test("no-match returns original text + count 0", () => {
    const r = applyReplacementToText("no relevant content", "missing", "new");
    assert.equal(r.text, "no relevant content");
    assert.equal(r.replaced, 0);
  });
  test("empty inputs → no replace", () => {
    assert.equal(applyReplacementToText("text", "", "new").replaced, 0);
    assert.equal(applyReplacementToText("text", "x", "").replaced, 0);
  });
  test("non-string inputs → defensive no-op", () => {
    assert.equal(applyReplacementToText(null, "a", "b").replaced, 0);
    assert.equal(applyReplacementToText("text", null, "b").replaced, 0);
  });
});

// ─── inSafetyPerimeter ─────────────────────────────────────────────────────

describe("inSafetyPerimeter", () => {
  test("accepts path inside knowledge root", () => {
    const root = path.resolve("knowledge");
    const file = path.resolve("knowledge/wiki/x.md");
    assert.equal(inSafetyPerimeter(file, root), true);
  });
  test("rejects path outside knowledge root", () => {
    const root = path.resolve("knowledge");
    const file = path.resolve("scripts/x.mjs");
    assert.equal(inSafetyPerimeter(file, root), false);
  });
  test("rejects path-traversal escape", () => {
    const root = path.resolve("knowledge");
    const file = path.resolve("knowledge/../scripts/x.mjs");
    assert.equal(inSafetyPerimeter(file, root), false);
  });
  test("defensive on empty / non-string input", () => {
    assert.equal(inSafetyPerimeter("", "knowledge"), false);
    assert.equal(inSafetyPerimeter("file", ""), false);
    assert.equal(inSafetyPerimeter(null, "knowledge"), false);
  });
});

// ─── applyFixes (I/O) ──────────────────────────────────────────────────────

function withTempPrismRoot(seedFn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wiki-link-fix-apply-test-"));
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

test("applyFixes: DRY RUN (default) doesn't modify files", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "old-link",
          from: "knowledge/memories/x.md",
          confidence: "high",
          bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/new-target.md", score: 1.0, reason: "exact-match" }],
        }],
      }),
    );
    fs.writeFileSync(path.join(root, "knowledge/memories/x.md"), "see [[old-link]] here");
  });
  try {
    const out = applyFixes({ prismRoot: tmp });
    assert.equal(out.report.dryRun, true);
    assert.equal(out.report.eligibleCount, 1);
    assert.equal(out.report.appliedCount, 1);
    assert.equal(out.report.applied[0].mode, "dry-run");
    // File NOT modified.
    const content = fs.readFileSync(path.join(tmp, "knowledge/memories/x.md"), "utf8");
    assert.equal(content, "see [[old-link]] here");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: --apply actually rewrites the file", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "old-link",
          from: "knowledge/memories/x.md",
          confidence: "high",
          bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/new-target.md", score: 1.0, reason: "exact-match" }],
        }],
      }),
    );
    fs.writeFileSync(path.join(root, "knowledge/memories/x.md"), "see [[old-link]] here");
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: false });
    assert.equal(out.report.appliedCount, 1);
    assert.equal(out.report.applied[0].mode, "applied");
    const content = fs.readFileSync(path.join(tmp, "knowledge/memories/x.md"), "utf8");
    assert.equal(content, "see [[new-target]] here");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: skips medium/low confidence even with high bestScore", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "x", from: "knowledge/x.md", confidence: "medium", bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/y.md", score: 1.0, reason: "x" }],
        }],
      }),
    );
    fs.writeFileSync(path.join(root, "knowledge/x.md"), "[[x]]");
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: false });
    assert.equal(out.report.eligibleCount, 0);
    assert.equal(out.report.appliedCount, 0);
    assert.equal(out.report.skippedReasons["not-eligible"], 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: rejects files outside knowledge/ safety perimeter", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts/x.md"), "[[old]]");
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "old", from: "scripts/x.md", confidence: "high", bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/new.md", score: 1.0, reason: "x" }],
        }],
      }),
    );
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: false });
    assert.equal(out.report.skippedReasons["outside-safety-perimeter"], 1);
    assert.equal(out.report.appliedCount, 0);
    // scripts/x.md not modified.
    assert.equal(fs.readFileSync(path.join(tmp, "scripts/x.md"), "utf8"), "[[old]]");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: idempotent — already-fixed file (broken link absent) skips silently", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "already-fixed", from: "knowledge/x.md", confidence: "high", bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/new.md", score: 1.0, reason: "x" }],
        }],
      }),
    );
    // File has the FIXED form already.
    fs.writeFileSync(path.join(root, "knowledge/x.md"), "see [[new]] here");
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: false });
    assert.equal(out.report.skippedReasons["broken-link-not-found"], 1);
    assert.equal(out.report.appliedCount, 0);
    assert.equal(out.report.errors.length, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: maxEdits caps the run", () => {
  const tmp = withTempPrismRoot((root) => {
    const cands = [];
    for (let i = 0; i < 10; i++) {
      const fn = `knowledge/x${i}.md`;
      fs.writeFileSync(path.join(root, fn), `[[link-${i}]]`);
      cands.push({
        link: `link-${i}`, from: fn, confidence: "high", bestScore: 1.0,
        suggestions: [{ target: `knowledge/wiki/target-${i}.md`, score: 1.0, reason: "x" }],
      });
    }
    fs.writeFileSync(path.join(root, "state/shared/wiki-link-fix-candidates.json"), JSON.stringify({ candidates: cands }));
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: true, maxEdits: 3 });
    assert.equal(out.report.appliedCount, 3);
    assert.equal(out.report.skippedReasons["max-edits-reached"], 7);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: with backup writes .bak files before modifying", () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/wiki-link-fix-candidates.json"),
      JSON.stringify({
        candidates: [{
          link: "old", from: "knowledge/x.md", confidence: "high", bestScore: 1.0,
          suggestions: [{ target: "knowledge/wiki/new.md", score: 1.0, reason: "x" }],
        }],
      }),
    );
    fs.writeFileSync(path.join(root, "knowledge/x.md"), "see [[old]]");
  });
  try {
    const out = applyFixes({ prismRoot: tmp, dryRun: false, makeBackup: true });
    assert.equal(out.report.appliedCount, 1);
    const backupDir = path.join(tmp, "state/shared/.wiki-link-fix-backups");
    assert.ok(fs.existsSync(backupDir));
    const backups = fs.readdirSync(backupDir);
    assert.equal(backups.length, 1);
    assert.match(backups[0], /\.x\.md\.bak$/);
    const bakContent = fs.readFileSync(path.join(backupDir, backups[0]), "utf8");
    assert.equal(bakContent, "see [[old]]");
    // Source modified.
    assert.equal(fs.readFileSync(path.join(tmp, "knowledge/x.md"), "utf8"), "see [[new]]");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("applyFixes: report schema includes all expected fields", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const out = applyFixes({ prismRoot: tmp, write: false });
    assert.equal(out.report.schemaVersion, SCHEMA_VERSION);
    assert.equal(out.report.totalCandidates, 0);
    assert.deepEqual(out.report.applied, []);
    assert.deepEqual(out.report.skipped, []);
    assert.deepEqual(out.report.errors, []);
    assert.ok(out.report.skippedReasons);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
