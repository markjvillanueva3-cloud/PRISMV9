#!/usr/bin/env node
/**
 * hook-archive-crossref.test.mjs — U-OBF-F4-ARCHIVE-CROSSREF tests
 *
 * Hermetic tests for the pure cores. I/O helpers are tested with a tmp-dir
 * fixture corpus. Real-data E2E covered by running the CLI against the live
 * audit JSON in scripts/__tests__/ (separate file, this is unit-only).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findMatches,
  crossReferenceHook,
  categorizeForArchive,
  buildCorpus,
  buildSelfFileMap,
} from "./hook-archive-crossref.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// findMatches — pure substring matcher with left word boundary
// ─────────────────────────────────────────────────────────────────────────────

test("findMatches — happy path single match", () => {
  const r = findMatches("foo-bar", "node .claude/hooks/foo-bar.mjs --json");
  assert.equal(r.length, 1);
  assert.equal(r[0].lineNumber, 1);
  assert.match(r[0].snippet, /foo-bar\.mjs/);
});

test("findMatches — multi-line content reports correct line number", () => {
  const content = "line1\nline2\nimport x from './foo.mjs';\nline4";
  const r = findMatches("foo", content);
  assert.equal(r.length, 1);
  assert.equal(r[0].lineNumber, 3);
});

test("findMatches — multi-match in same file", () => {
  const content = "a foo.mjs b\nc foo.mjs d";
  const r = findMatches("foo", content);
  assert.equal(r.length, 2);
  assert.equal(r[0].lineNumber, 1);
  assert.equal(r[1].lineNumber, 2);
});

test("findMatches — substring of longer name is REJECTED (left word boundary)", () => {
  const content = "myfoo.mjs is not foo.mjs";
  const r = findMatches("foo", content);
  // Only the second occurrence (after space) should match; the prefix 'myfoo.mjs' must not.
  assert.equal(r.length, 1);
  assert.match(r[0].snippet, /not foo\.mjs/);
});

test("findMatches — empty hook name returns []", () => {
  assert.deepEqual(findMatches("", "foo.mjs content"), []);
});

test("findMatches — empty content returns []", () => {
  assert.deepEqual(findMatches("foo", ""), []);
});

test("findMatches — non-string args return []", () => {
  assert.deepEqual(findMatches(null, "x"), []);
  assert.deepEqual(findMatches("foo", null), []);
  assert.deepEqual(findMatches(undefined, undefined), []);
});

test("findMatches — match at start of content (offset 0)", () => {
  const r = findMatches("foo", "foo.mjs at start");
  assert.equal(r.length, 1);
  assert.equal(r[0].offset, 0);
});

test("findMatches — match at end of content (no trailing newline)", () => {
  const r = findMatches("foo", "the file is foo.mjs");
  assert.equal(r.length, 1);
});

test("findMatches — hook name with dots and dashes (regex-special chars)", () => {
  // Should match literally, no regex interpretation needed since we use indexOf.
  const r = findMatches("agent.boundary-guard", "node agent.boundary-guard.mjs");
  assert.equal(r.length, 1);
});

test("findMatches — long snippet is truncated to 160 chars with ellipsis", () => {
  const longLine = "x".repeat(200) + " foo.mjs ref";
  const r = findMatches("foo", longLine);
  assert.equal(r.length, 1);
  assert(r[0].snippet.length <= 160, "snippet must be <= 160 chars");
  assert.match(r[0].snippet, /\.\.\.$/);
});

test("findMatches — char before is dot triggers rejection (file.foo.mjs not foo.mjs)", () => {
  const r = findMatches("foo", "see file.foo.mjs link");
  assert.equal(r.length, 0);
});

test("findMatches — char before is underscore triggers rejection", () => {
  const r = findMatches("foo", "var name_foo.mjs");
  assert.equal(r.length, 0);
});

test("findMatches — char before is hyphen triggers rejection", () => {
  const r = findMatches("foo", "see other-foo.mjs link");
  assert.equal(r.length, 0);
});

test("findMatches — char before is whitespace passes", () => {
  const r = findMatches("foo", "before  foo.mjs after");
  assert.equal(r.length, 1);
});

test("findMatches — char before is slash passes (path reference)", () => {
  const r = findMatches("foo", ".claude/hooks/foo.mjs");
  assert.equal(r.length, 1);
});

test("findMatches — char before is backslash passes (Windows path)", () => {
  const r = findMatches("foo", ".claude\\hooks\\foo.mjs");
  assert.equal(r.length, 1);
});

test("findMatches — char before is quote passes", () => {
  const r = findMatches("foo", 'import x from "foo.mjs"');
  assert.equal(r.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// crossReferenceHook — orchestrates findMatches across corpus
// ─────────────────────────────────────────────────────────────────────────────

test("crossReferenceHook — zero refs = safeToArchive=true, riskClass=safe", () => {
  const corpus = [
    { path: "/x/skill1.md", content: "no relevant content here" },
    { path: "/x/hook1.mjs", content: "// empty" },
  ];
  const r = crossReferenceHook({ hookName: "ghost", corpus });
  assert.equal(r.safeToArchive, true);
  assert.equal(r.riskClass, "safe");
  assert.equal(r.referenceCount, 0);
});

test("crossReferenceHook — single ref in skill = safeToArchive=false, class=skill-reference", () => {
  const corpus = [
    { path: "/repo/.claude/commands/foo.md", content: "Uses orphan-hook.mjs at startup" },
  ];
  const r = crossReferenceHook({ hookName: "orphan-hook", corpus });
  assert.equal(r.safeToArchive, false);
  assert.equal(r.referenceCount, 1);
  assert.equal(r.riskClass, "skill-reference");
});

test("crossReferenceHook — bundle ref takes priority over skill ref", () => {
  const corpus = [
    { path: "/repo/.claude/hooks/bundles/big-bundle.mjs", content: "import 'orphan-hook.mjs'" },
    { path: "/repo/.claude/commands/foo.md", content: "see orphan-hook.mjs" },
  ];
  const r = crossReferenceHook({ hookName: "orphan-hook", corpus });
  assert.equal(r.riskClass, "bundle-reference");
});

test("crossReferenceHook — doctrine ref (CLAUDE.md) takes priority over all", () => {
  const corpus = [
    { path: "/repo/CLAUDE.md", content: "Doctrine pin: see orphan-hook.mjs" },
    { path: "/repo/.claude/hooks/bundles/big.mjs", content: "import 'orphan-hook.mjs'" },
  ];
  const r = crossReferenceHook({ hookName: "orphan-hook", corpus });
  assert.equal(r.riskClass, "doctrine-reference");
});

test("crossReferenceHook — selfFile is excluded from reference search", () => {
  const corpus = [
    { path: "/repo/.claude/hooks/orphan-hook.mjs", content: "// orphan-hook.mjs header self-mention" },
    { path: "/repo/CLAUDE.md", content: "no mention here" },
  ];
  const r = crossReferenceHook({ hookName: "orphan-hook", corpus, selfFile: "/repo/.claude/hooks/orphan-hook.mjs" });
  assert.equal(r.safeToArchive, true, "self-reference must not count");
});

test("crossReferenceHook — empty hook name returns invalid risk class", () => {
  const r = crossReferenceHook({ hookName: "", corpus: [] });
  assert.equal(r.riskClass, "invalid");
  assert.equal(r.safeToArchive, false);
});

test("crossReferenceHook — non-array corpus is tolerated", () => {
  const r = crossReferenceHook({ hookName: "foo", corpus: null });
  assert.equal(r.safeToArchive, true);
  assert.equal(r.referenceCount, 0);
});

test("crossReferenceHook — corpus entry with missing path or content is skipped", () => {
  const corpus = [
    { path: "/x/ok.md", content: "foo.mjs found" },
    { path: "/x/bad.md" }, // missing content
    null,
    { content: "foo.mjs" }, // missing path
  ];
  const r = crossReferenceHook({ hookName: "foo", corpus });
  assert.equal(r.referenceCount, 1);
});

test("crossReferenceHook — multiple refs in different files reported with correct paths", () => {
  const corpus = [
    { path: "/x/a.md", content: "ref to foo.mjs here" },
    { path: "/x/b.mjs", content: "another foo.mjs there" },
  ];
  const r = crossReferenceHook({ hookName: "foo", corpus });
  assert.equal(r.referenceCount, 2);
  const paths = r.references.map((rr) => rr.file).sort();
  assert.deepEqual(paths, ["/x/a.md", "/x/b.mjs"]);
});

// ─────────────────────────────────────────────────────────────────────────────
// categorizeForArchive — top-level orchestrator
// ─────────────────────────────────────────────────────────────────────────────

test("categorizeForArchive — splits safe vs referenced", () => {
  const corpus = [
    { path: "/x/skill.md", content: "ref to wired-hook.mjs" },
  ];
  const r = categorizeForArchive({ unwiredList: ["wired-hook", "orphan-1", "orphan-2"], corpus });
  assert.equal(r.counts.total, 3);
  assert.equal(r.counts.safeToArchive, 2);
  assert.equal(r.counts.referencedElsewhere, 1);
  assert.equal(r.safe_to_archive.map((h) => h.hook).join(","), "orphan-1,orphan-2");
  assert.equal(r.referenced_elsewhere[0].hook, "wired-hook");
});

test("categorizeForArchive — risk histogram counts each class", () => {
  const corpus = [
    { path: "/repo/CLAUDE.md", content: "ref to doctrine-hook.mjs" },
    { path: "/repo/.claude/hooks/bundles/b.mjs", content: "ref to bundle-hook.mjs" },
    { path: "/repo/.claude/commands/x.md", content: "ref to skill-hook.mjs" },
  ];
  const r = categorizeForArchive({
    unwiredList: ["doctrine-hook", "bundle-hook", "skill-hook", "safe-hook"],
    corpus,
  });
  assert.equal(r.riskHistogram["doctrine-reference"], 1);
  assert.equal(r.riskHistogram["bundle-reference"], 1);
  assert.equal(r.riskHistogram["skill-reference"], 1);
  assert.equal(r.counts.safeToArchive, 1);
});

test("categorizeForArchive — empty list returns zero counts", () => {
  const r = categorizeForArchive({ unwiredList: [], corpus: [] });
  assert.equal(r.counts.total, 0);
  assert.equal(r.safe_to_archive.length, 0);
  assert.equal(r.referenced_elsewhere.length, 0);
});

test("categorizeForArchive — non-array unwiredList treated as []", () => {
  const r = categorizeForArchive({ unwiredList: null, corpus: [] });
  assert.equal(r.counts.total, 0);
});

test("categorizeForArchive — selfFileMap excludes self-references", () => {
  const corpus = [
    { path: "/repo/.claude/hooks/orphan.mjs", content: "// orphan.mjs self header" },
    { path: "/repo/CLAUDE.md", content: "no mention" },
  ];
  const selfFileMap = new Map([["orphan", "/repo/.claude/hooks/orphan.mjs"]]);
  const r = categorizeForArchive({ unwiredList: ["orphan"], corpus, selfFileMap });
  assert.equal(r.counts.safeToArchive, 1);
});

test("categorizeForArchive — bucket arrays are sorted alphabetically", () => {
  const r = categorizeForArchive({ unwiredList: ["zeta", "alpha", "mike"], corpus: [] });
  assert.deepEqual(r.safe_to_archive.map((h) => h.hook), ["alpha", "mike", "zeta"]);
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCorpus + buildSelfFileMap — tmpdir fixture
// ─────────────────────────────────────────────────────────────────────────────

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "hac-test-"));
  mkdirSync(join(root, ".claude/commands/sub"), { recursive: true });
  mkdirSync(join(root, ".claude/hooks/bundles"), { recursive: true });
  mkdirSync(join(root, ".claude/hooks/_archive"), { recursive: true });
  mkdirSync(join(root, "scripts/sub"), { recursive: true });
  mkdirSync(join(root, "knowledge/wiki/architecture"), { recursive: true });
  writeFileSync(join(root, ".claude/commands/sub/skill1.md"), "this references hook-a.mjs");
  writeFileSync(join(root, ".claude/hooks/hook-a.mjs"), "// hook-a body");
  writeFileSync(join(root, ".claude/hooks/hook-b.mjs"), "// hook-b body");
  writeFileSync(join(root, ".claude/hooks/_archive/zombie.mjs"), "// should be skipped (archive dir)");
  writeFileSync(join(root, ".claude/hooks/bundles/main.mjs"), "import './hook-b.mjs'");
  writeFileSync(join(root, "scripts/sub/runner.mjs"), "node .claude/hooks/hook-a.mjs");
  writeFileSync(join(root, "knowledge/wiki/architecture/page1.md"), "Doc: see hook-b.mjs in section");
  writeFileSync(join(root, ".claude/settings.json"), '{ "hooks": [".claude/hooks/hook-a.mjs"] }');
  writeFileSync(join(root, "CLAUDE.md"), "Doctrine pointer.");
  return root;
}

test("buildCorpus — assembles files from all configured roots", () => {
  const root = makeFixture();
  try {
    const corpus = buildCorpus({ rootDir: root });
    // Should include: skill1.md, hook-a.mjs, hook-b.mjs, bundles/main.mjs,
    // scripts/sub/runner.mjs, wiki/architecture/page1.md, settings.json, CLAUDE.md
    // (zombie.mjs SKIPPED — under _archive)
    const paths = corpus.map((c) => c.path.replace(/\\/g, "/"));
    assert(paths.some((p) => p.endsWith("/skill1.md")), "skill1.md present");
    assert(paths.some((p) => p.endsWith("/hook-a.mjs")), "hook-a.mjs present");
    assert(paths.some((p) => p.endsWith("/bundles/main.mjs")), "bundles/main.mjs present");
    assert(paths.some((p) => p.endsWith("/runner.mjs")), "scripts/sub/runner.mjs present");
    assert(paths.some((p) => p.endsWith("/page1.md")), "wiki/page1.md present");
    assert(paths.some((p) => p.endsWith("/settings.json")), "settings.json present");
    assert(paths.some((p) => p.endsWith("/CLAUDE.md")), "CLAUDE.md present");
    assert(!paths.some((p) => p.endsWith("/zombie.mjs")), "archive dir SKIPPED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildCorpus — missing root directory is tolerated (returns subset)", () => {
  const root = mkdtempSync(join(tmpdir(), "hac-empty-"));
  try {
    // No subdirs created — every root should be skipped silently.
    // Pass userClaudeRoot:null to suppress reading the host-machine fallback.
    const corpus = buildCorpus({ rootDir: root, userClaudeRoot: null });
    assert.equal(corpus.length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildSelfFileMap — maps every hook basename to its source path", () => {
  const root = makeFixture();
  try {
    const map = buildSelfFileMap({ rootDir: root });
    assert(map.has("hook-a"), "hook-a present");
    assert(map.has("hook-b"), "hook-b present");
    assert(map.has("main"), "main (in bundles) present");
    assert(!map.has("zombie"), "archive entries skipped");
    const aPath = map.get("hook-a").replace(/\\/g, "/");
    assert(aPath.endsWith(".claude/hooks/hook-a.mjs"), "absolute path");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildSelfFileMap — missing hooks dir returns empty map", () => {
  const root = mkdtempSync(join(tmpdir(), "hac-empty-"));
  try {
    const map = buildSelfFileMap({ rootDir: root });
    assert.equal(map.size, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("integration — buildCorpus + categorizeForArchive on fixture", () => {
  const root = makeFixture();
  try {
    const corpus = buildCorpus({ rootDir: root });
    const selfFileMap = buildSelfFileMap({ rootDir: root });
    // hook-a is referenced in skill1.md + scripts/sub/runner.mjs + settings.json
    // hook-b is referenced in bundles/main.mjs + wiki/page1.md
    // ghost-z has no references anywhere
    const r = categorizeForArchive({
      unwiredList: ["hook-a", "hook-b", "ghost-z"],
      corpus,
      selfFileMap,
    });
    assert.equal(r.counts.total, 3);
    assert.equal(r.counts.safeToArchive, 1, "ghost-z is the only safe-to-archive");
    assert.equal(r.safe_to_archive[0].hook, "ghost-z");
    const refMap = new Map(r.referenced_elsewhere.map((rr) => [rr.hook, rr]));
    assert(refMap.has("hook-a"));
    assert(refMap.has("hook-b"));
    // hook-b ref is in bundles, so risk class should be bundle-reference
    assert.equal(refMap.get("hook-b").riskClass, "bundle-reference");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
