// Tests for extraction-forge-detect.mjs pure logic (EXTRACTION-FORGE-MS0, slot:bravo 2026-06-12).
// Verifies INTENT (R9): frontmatter parsing feeds the classifier the right title+body;
// dedup by source path makes the scan idempotent (re-runs do not re-queue).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry, queueKey, selectNewCandidates } from "./extraction-forge-detect.mjs";

test("parseEntry: strips frontmatter, extracts title from title: or name:", () => {
  const withTitle = '---\ntitle: "Chip Thinning Model"\nslug: x\n---\n# Heading\nbody text';
  const a = parseEntry(withTitle);
  assert.equal(a.title, "Chip Thinning Model");
  assert.match(a.body, /# Heading/);
  assert.doesNotMatch(a.body, /slug: x/, "frontmatter must be stripped from the body");
  // name: fallback
  assert.equal(parseEntry("---\nname: foo-bar\n---\nbody").title, "foo-bar");
  // no frontmatter -> body is the whole raw, title empty
  const none = parseEntry("# Just A Heading\nsome body");
  assert.equal(none.title, "");
  assert.match(none.body, /Just A Heading/);
  // non-string safe
  assert.deepEqual(parseEntry(null), { title: "", body: "" });
});

test("queueKey: returns the source path (the dedup key)", () => {
  assert.equal(queueKey({ sourcePath: "knowledge/wiki/code-tribal/youtube-a.md" }), "knowledge/wiki/code-tribal/youtube-a.md");
  assert.equal(queueKey({}), "");
  assert.equal(queueKey(null), "");
});

test("selectNewCandidates: skips sources already in the queue (idempotent scan)", () => {
  const cands = [
    { sourcePath: "a.md", conceptName: "A" },
    { sourcePath: "b.md", conceptName: "B" },
    { sourcePath: "c.md", conceptName: "C" },
  ];
  const queued = new Set(["b.md"]);
  assert.deepEqual(selectNewCandidates(cands, queued).map((c) => c.sourcePath), ["a.md", "c.md"]);
  // empty queue -> all new
  assert.equal(selectNewCandidates(cands, new Set()).length, 3);
  // accepts an array of keys
  assert.equal(selectNewCandidates(cands, ["a.md", "c.md"]).length, 1);
  // null candidates safe
  assert.deepEqual(selectNewCandidates(null, queued), []);
});
