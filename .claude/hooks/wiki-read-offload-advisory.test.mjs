// tier: T3
// wiki-read-offload-advisory.test.mjs — pure-fn coverage via node:test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyWikiPath,
  countLines,
  decideAdvisory,
  DEFAULT_MIN_LINES,
  HOOK_KEY,
} from "./wiki-read-offload-advisory.mjs";

// ---- classifyWikiPath ----
test("classifyWikiPath: matches posix wiki path", () => {
  const c = classifyWikiPath("H:/prism/knowledge/wiki/architecture/foo.md");
  assert.equal(c.isWiki, true);
  assert.equal(c.relPath, "architecture/foo.md");
});
test("classifyWikiPath: matches windows backslash path", () => {
  const c = classifyWikiPath("H:\\prism\\knowledge\\wiki\\lessons\\bar.md");
  assert.equal(c.isWiki, true);
  assert.equal(c.relPath, "lessons/bar.md");
});
test("classifyWikiPath: rejects non-wiki path", () => {
  assert.equal(classifyWikiPath("H:/prism/src/engines/Foo.ts"), null);
});
test("classifyWikiPath: rejects non-md wiki file", () => {
  assert.equal(classifyWikiPath("H:/prism/knowledge/wiki/architecture/foo.json"), null);
});
test("classifyWikiPath: rejects null/empty input", () => {
  assert.equal(classifyWikiPath(null), null);
  assert.equal(classifyWikiPath(""), null);
  assert.equal(classifyWikiPath(undefined), null);
  assert.equal(classifyWikiPath(42), null);
});

// ---- countLines ----
test("countLines: empty string is 0", () => assert.equal(countLines(""), 0));
test("countLines: single line no newline is 1", () => assert.equal(countLines("a"), 1));
test("countLines: single line + trailing newline is 1", () => assert.equal(countLines("a\n"), 1));
test("countLines: three lines + trailing newline is 3", () => assert.equal(countLines("a\nb\nc\n"), 3));
test("countLines: three lines no trailing newline is 3", () => assert.equal(countLines("a\nb\nc"), 3));
test("countLines: only newlines counts blank lines", () => assert.equal(countLines("\n\n\n"), 3));

// ---- decideAdvisory ----
const wikiClass = { isWiki: true, isMd: true, relPath: "architecture/big.md", normPath: "x" };

test("decideAdvisory: non-wiki classification returns false", () => {
  const d = decideAdvisory({ classification: null, lineCount: 1000, byteSize: 10000, minLines: 500 });
  assert.equal(d.advise, false);
  assert.equal(d.reason, "not-a-wiki-md");
});
test("decideAdvisory: below threshold returns false", () => {
  const d = decideAdvisory({ classification: wikiClass, lineCount: 100, byteSize: 4000, minLines: 500 });
  assert.equal(d.advise, false);
  assert.match(d.reason, /below-threshold/);
});
test("decideAdvisory: above threshold returns advice", () => {
  const d = decideAdvisory({ classification: wikiClass, lineCount: 800, byteSize: 35000, minLines: 500 });
  assert.equal(d.advise, true);
  assert.equal(d.reason, "large-wiki-md");
  assert.ok(d.tokensSavedIfTaken > 0);
  assert.match(d.suggestion, /route-to-obsidian/);
  assert.match(d.suggestion, /architecture\/big\.md/);
});
test("decideAdvisory: floors minLines at 50 (sub-50 thresholds become 50)", () => {
  // lineCount=49 should NOT advise even if minLines=10 — floor enforces 50.
  const d = decideAdvisory({ classification: wikiClass, lineCount: 49, byteSize: 2000, minLines: 10 });
  assert.equal(d.advise, false);
});
test("decideAdvisory: uses DEFAULT_MIN_LINES when minLines is non-finite", () => {
  const d = decideAdvisory({ classification: wikiClass, lineCount: DEFAULT_MIN_LINES + 1, byteSize: 30000, minLines: NaN });
  assert.equal(d.advise, true);
});
test("decideAdvisory: handles missing byteSize via line-based estimate", () => {
  const d = decideAdvisory({ classification: wikiClass, lineCount: 1000, byteSize: 0, minLines: 500 });
  assert.equal(d.advise, true);
  // Without bytesize, estimate is lineCount * 60 / 3.5 ≈ 17143
  assert.ok(d.rawTokens > 10000);
});
test("decideAdvisory: tokens-saved is non-negative even for tiny files just past threshold", () => {
  // Edge: 500 lines but tiny bytesize → rawTokens may be <= summaryTokens.
  const d = decideAdvisory({ classification: wikiClass, lineCount: 500, byteSize: 500, minLines: 500 });
  assert.equal(d.advise, true);
  assert.ok(d.tokensSavedIfTaken >= 0);
});

// ---- constants ----
test("DEFAULT_MIN_LINES is 500", () => assert.equal(DEFAULT_MIN_LINES, 500));
test("HOOK_KEY matches stats schema convention", () => assert.equal(HOOK_KEY, "wiki-read-offload-advisory"));
