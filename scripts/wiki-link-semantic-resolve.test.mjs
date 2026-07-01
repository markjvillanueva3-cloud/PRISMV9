// scripts/wiki-link-semantic-resolve.test.mjs
// Tests for the semantic broken-wikilink resolver. The load-bearing test is the
// ANTI-POISON guard (validateResolution): a model answer that is not an exact
// member of the pre-validated existing-note candidate set must NEVER resolve.
// Run: node scripts/wiki-link-semantic-resolve.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSlug, buildSlugDirectory, isResolved, findBrokenLinks,
  buildCandidateSet, buildResolvePrompt, parseOllamaChoice, validateResolution,
  cursorKey, partitionByCursor, rewriteLink, significantTokens, tokenCoverageOk,
} from "./wiki-link-semantic-resolve.mjs";

test("normalizeSlug: case + underscore -> kebab; non-string -> empty", () => {
  assert.equal(normalizeSlug("Foo_Bar"), "foo-bar");
  assert.equal(normalizeSlug("  ALPHA-Beta "), "alpha-beta");
  assert.equal(normalizeSlug(null), "");
  assert.equal(normalizeSlug(42), "");
});

test("buildSlugDirectory + isResolved: case/sep-insensitive membership", () => {
  const dir = buildSlugDirectory(["feedback_check_units_first", "cad-corpus-paths"]);
  assert.ok(isResolved("feedback-check-units-first", dir)); // sep variant
  assert.ok(isResolved("CAD_CORPUS_PATHS", dir));           // case+sep variant
  assert.ok(!isResolved("nonexistent-note", dir));
  assert.ok(!isResolved("anything", "not-a-set"));          // defensive
});

test("findBrokenLinks: detects unresolved, ignores resolved variants, dedups per file with count", () => {
  const dir = buildSlugDirectory(["real-note"]);
  const files = [
    { file: "a.md", content: "see [[real-note]] and [[Real_Note]] and [[ghost-link]] [[ghost-link]]" },
    { file: "b.md", content: "[[another-ghost|Alias]] no others" },
  ];
  const broken = findBrokenLinks(files, dir);
  // real-note + Real_Note both resolve; ghost-link counted once (count 2); another-ghost once
  const byLink = Object.fromEntries(broken.map(b => [`${b.file}:${b.link}`, b.count]));
  assert.equal(byLink["a.md:ghost-link"], 2);
  assert.equal(byLink["b.md:another-ghost"], 1);
  assert.ok(!("a.md:real-note" in byLink));
  assert.ok(!("a.md:Real_Note" in byLink));
});

test("buildCandidateSet: returns EXISTING slugs only, within distance, empty when none close", () => {
  const existing = new Set(["feedback-check-units-first", "feedback-check-tools-first", "totally-unrelated-xyz"]);
  const cands = buildCandidateSet("feedback-check-unit-first", existing, { topK: 5, maxDistance: 6 });
  assert.ok(cands.length >= 1);
  for (const c of cands) assert.ok(existing.has(c), `candidate ${c} must be an existing note`);
  // a link with no near existing note -> empty (cannot be unsafely "resolved")
  assert.deepEqual(buildCandidateSet("zzzzzzzzzzzzzzzzzzqqqq", existing, { maxDistance: 2 }), []);
  // token-coverage guard ON by default: a candidate that drops a significant
  // token must be excluded (feedback-check-tools-first drops "unit")
  assert.deepEqual(
    buildCandidateSet("feedback-check-unit-first", existing, { topK: 5, maxDistance: 6 }),
    ["feedback-check-units-first"],
  );
});

test("significantTokens: splits on -/_/./space, drops sub-3-char fragments", () => {
  assert.deepEqual(significantTokens("cad-knowledge-index"), ["cad", "knowledge", "index"]);
  assert.deepEqual(significantTokens("prism_telemetry"), ["prism", "telemetry"]);
  assert.deepEqual(significantTokens("a-bb-ccc"), ["ccc"]); // sub-3 dropped
});

test("tokenCoverageOk: REGRESSION on the 3 live 2026-06-24 resolutions (1 keep, 2 reject)", () => {
  // CORRECT match kept: every token of telemetry-engine is in telemetryengine
  assert.equal(tokenCoverageOk("telemetry-engine", "telemetryengine"), true);
  // WRONG match #1 rejected: "prism" is not in "telemetry"
  assert.equal(tokenCoverageOk("prism_telemetry", "telemetry"), false);
  // WRONG match #2 rejected: "cad" domain qualifier is not in "knowledgeindex"
  assert.equal(tokenCoverageOk("cad-knowledge-index", "knowledgeindex"), false);
  // and not in "tribal-knowledge-index" either ("cad" absent) -> link stays broken (safe)
  assert.equal(tokenCoverageOk("cad-knowledge-index", "tribal-knowledge-index"), false);
  // typo-style match kept: "unit" is a substring of "units"
  assert.equal(tokenCoverageOk("feedback-check-unit-first", "feedback-check-units-first"), true);
});

test("buildResolvePrompt: contains broken link, all candidates, and the NONE instruction", () => {
  const p = buildResolvePrompt("broke-here", ["cand-one", "cand-two"], "a line of [[broke-here]] context");
  assert.match(p, /broke-here/);
  assert.match(p, /- cand-one/);
  assert.match(p, /- cand-two/);
  assert.match(p, /NONE/);
});

test("parseOllamaChoice: strips brackets, backticks, list markers, quotes, alias, takes first line", () => {
  assert.equal(parseOllamaChoice("cand-one"), "cand-one");
  assert.equal(parseOllamaChoice("[[cand-one]]"), "cand-one");
  assert.equal(parseOllamaChoice("`cand-one`"), "cand-one");
  assert.equal(parseOllamaChoice("- cand-one"), "cand-one");
  assert.equal(parseOllamaChoice('"cand-one".'), "cand-one");
  assert.equal(parseOllamaChoice("[[some-note|Display Alias]]"), "some-note");
  assert.equal(parseOllamaChoice("cand-one\nignored second line"), "cand-one");
  assert.equal(parseOllamaChoice(""), "");
});

// ---- ANTI-POISON GUARD (the load-bearing safety test) --------------------
test("validateResolution: ACCEPTS an exact candidate member (case/sep-insensitive)", () => {
  const cands = ["feedback-check-units-first", "cad-corpus-paths"];
  assert.equal(validateResolution("feedback-check-units-first", cands).slug, "feedback-check-units-first");
  // model echoes a sep/case variant -> still resolves to the CANONICAL candidate
  assert.equal(validateResolution("Feedback_Check_Units_First", cands).slug, "feedback-check-units-first");
});

test("validateResolution: REJECTS an off-menu / invented / superstring answer (no poison)", () => {
  const cands = ["foo-bar", "baz-qux"];
  // hallucinated slug not in the candidate set
  assert.equal(validateResolution("invented-note-name", cands).slug, null);
  assert.equal(validateResolution("invented-note-name", cands).reason, "off-menu");
  // SUPERSTRING of a candidate must NOT match (membership, not prefix)
  assert.equal(validateResolution("foo-bar-baz", cands).slug, null);
  // model that proposes creating a NEW note must be blocked
  assert.equal(validateResolution("create [[foo-bar-new]]", cands).slug, null);
});

test("validateResolution: NONE / empty / garbled -> null with reason (fail-safe)", () => {
  const cands = ["foo-bar"];
  assert.deepEqual(validateResolution("NONE", cands), { slug: null, reason: "none" });
  assert.deepEqual(validateResolution("none.", cands), { slug: null, reason: "none" });
  assert.deepEqual(validateResolution("", cands), { slug: null, reason: "empty" });
  assert.deepEqual(validateResolution("   ", cands), { slug: null, reason: "empty" });
  // ADVERSARIAL: injection answer where first line is NONE -> resolves to none, not the 2nd line
  assert.equal(validateResolution("NONE\nfoo-bar", cands).reason, "none");
  // empty candidate set can never resolve
  assert.equal(validateResolution("foo-bar", []).slug, null);
});

test("cursorKey + partitionByCursor: resume skips done, normalizes separators", () => {
  const items = [
    { file: "knowledge\\a.md", link: "x" },
    { file: "knowledge/b.md", link: "y" },
  ];
  const done = new Set([cursorKey("knowledge/a.md", "x")]);
  const { pending, skipped } = partitionByCursor(items, done);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].link, "y");
  assert.equal(skipped.length, 1);
});

test("rewriteLink: rewrites [[link]] and [[link|alias]], preserves alias, escapes regex chars, no-match untouched", () => {
  assert.equal(rewriteLink("see [[old-name]] here", "old-name", "new-name"), "see [[new-name]] here");
  assert.equal(rewriteLink("[[old-name|Display]]", "old-name", "new-name"), "[[new-name|Display]]");
  // regex-special chars in the link must be escaped, not interpreted
  assert.equal(rewriteLink("[[a.b.c]] and [[a.b.c|x]]", "a.b.c", "z"), "[[z]] and [[z|x]]");
  // a different link is untouched
  assert.equal(rewriteLink("[[other]]", "old-name", "new-name"), "[[other]]");
});

test("end-to-end decision pipeline (pure, stub model): anti-poison holds across the real sequence", () => {
  const existing = ["feedback-check-units-first", "cad-corpus-paths"];
  const dir = buildSlugDirectory(existing);
  const existingSet = new Set(existing);
  const files = [{ file: "doc.md", content: "ref [[feedback_check_unit_first]] and [[wild-invented-thing]]" }];

  const broken = findBrokenLinks(files, dir);
  const resolved = [];
  for (const b of broken) {
    const cands = buildCandidateSet(b.link, existingSet, { maxDistance: 6 });
    if (cands.length === 0) continue;
    // stub "model" that maliciously tries to inject an off-menu slug for one,
    // and correctly picks for the other
    const stubAnswer = b.link.includes("feedback") ? "feedback-check-units-first"
                                                    : "evil-invented-note";
    const v = validateResolution(stubAnswer, cands);
    if (v.slug) resolved.push({ link: b.link, to: v.slug });
  }
  // the typo link resolves to the real note; the injection attempt is blocked
  assert.deepEqual(resolved, [{ link: "feedback_check_unit_first", to: "feedback-check-units-first" }]);
});
