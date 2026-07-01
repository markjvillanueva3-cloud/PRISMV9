// Tests for the apply-draft safety gate. node --test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { gateDraft } from "./apply-galaxy-claudemd-drafts.mjs";

// A realistic >=600B draft body with the §0 pointer + a section heading.
const PAD = "x".repeat(640);
const goodBody =
  "# mill Galaxy -- slot:foxtrot\n" +
  "> Universal rails: H:/prism/CLAUDE.md. THIS file = mill doctrine only.\n\n" +
  "## 1. Domain scope\nOwns mill toolpaths.\n\n" +
  "## 5. Domain gotchas\nFeed = IPM.\n" +
  PAD;

test("gateDraft: a well-formed draft (>=600B, pointer, heading) passes", () => {
  const r = gateDraft(goodBody);
  assert.equal(r.ok, true, JSON.stringify(r.reasons));
});

test("gateDraft: a too-small body fails (truncated/error dump)", () => {
  const r = gateDraft("## x\nH:/prism/CLAUDE.md");
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("too-small")));
});

test("gateDraft: missing the §0 universal-core pointer fails (safety section dropped)", () => {
  const noPointer = "## 1. Domain scope\nsome domain content here\n" + PAD;
  const r = gateDraft(noPointer);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("pointer")));
});

test("gateDraft: a body with no '## ' heading fails (not a real CLAUDE.md)", () => {
  const noHeading = "plain text referencing H:/prism/CLAUDE.md but no markdown heading at all\n" + PAD;
  const r = gateDraft(noHeading);
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes("heading")));
});

test("gateDraft: 'root CLAUDE.md' phrasing also satisfies the pointer gate", () => {
  const altPointer = "# g\n> universal rails: the root CLAUDE.md only.\n## 1. Scope\ncontent\n" + PAD;
  assert.equal(gateDraft(altPointer).ok, true);
});

test("gateDraft: null / non-string / empty are rejected (never apply)", () => {
  assert.equal(gateDraft(null).ok, false);
  assert.equal(gateDraft(undefined).ok, false);
  assert.equal(gateDraft(42).ok, false);
  assert.equal(gateDraft("").ok, false);
});
