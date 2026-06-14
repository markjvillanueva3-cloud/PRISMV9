// scripts/ollama-commit-msg.test.mjs
// U-VERIFIED-OFFLOAD-COMMITMSG (2026-06-09, slot:alpha): the commit-subject drafter
// must (1) accept a well-shaped Ollama subject, (2) reject preamble/multiline/empty/
// oversized/non-ASCII output and FALL BACK to a deterministic file-derived subject,
// (3) always hand the caller a usable single-line subject. Hermetic via injected
// runImpl -- NO network (R9: assert the exact resolved value, never toBeDefined).
import { test } from "node:test";
import assert from "node:assert/strict";

import { subjectShape, fallbackSubject, draftCommitSubject } from "./ollama-commit-msg.mjs";

const DIFF_1 = [
  "diff --git a/scripts/foo.mjs b/scripts/foo.mjs",
  "index 111..222 100644",
  "--- a/scripts/foo.mjs",
  "+++ b/scripts/foo.mjs",
  "@@ -1 +1 @@",
  "+const x = 1;",
].join("\n");

const DIFF_3 = [
  "--- a/a.mjs", "+++ b/a.mjs", "@@ @@", "+1",
  "--- a/b.mjs", "+++ b/b.mjs", "@@ @@", "+2",
  "--- a/c.mjs", "+++ b/c.mjs", "@@ @@", "+3",
].join("\n");

// ---- subjectShape (pure verifier) ----
test("subjectShape: a clean single-line subject is accepted and returned as value", () => {
  const r = subjectShape("add fleet-fallback to the next-unit resolver");
  assert.deepEqual(r, { ok: true, value: "add fleet-fallback to the next-unit resolver" });
});

test("subjectShape: strips wrapping quotes/backticks a model adds", () => {
  const r = subjectShape('"fix the stale find-cache regen path"');
  assert.deepEqual(r, { ok: true, value: "fix the stale find-cache regen path" });
});

test("subjectShape: takes the first NON-EMPTY line of a multi-line reply", () => {
  const r = subjectShape("\n\n  wire commit-msg drafter into the loop  \nbody line ignored");
  assert.equal(r.value, "wire commit-msg drafter into the loop");
});

test("subjectShape: a refusal/preamble line is rejected", () => {
  assert.equal(subjectShape("Sure, here is a commit subject for you"), false);
  assert.equal(subjectShape("Here's the subject line:"), false);
});

test("subjectShape: too-short / too-long / empty / non-string are rejected", () => {
  assert.equal(subjectShape("tiny"), false);          // < 8
  assert.equal(subjectShape("x".repeat(121)), false); // > 120
  assert.equal(subjectShape(""), false);
  assert.equal(subjectShape(null), false);
  assert.equal(subjectShape(42), false);
});

test("subjectShape: a non-ASCII subject (em-dash U+2014) is rejected", () => {
  // built at runtime so THIS source file stays pure-ASCII (ascii-guard).
  const emDash = String.fromCharCode(0x2014);
  assert.equal(subjectShape(`add fleet-fallback ${emDash} resolver`), false);
});

// ---- fallbackSubject (deterministic) ----
test("fallbackSubject: single changed file -> basename + changes suffix", () => {
  assert.equal(fallbackSubject(DIFF_1), "foo.mjs -- changes");
});

test("fallbackSubject: multiple changed files -> count + first basename + more", () => {
  assert.equal(fallbackSubject(DIFF_3), "3 files changed (a.mjs + 2 more)");
});

test("fallbackSubject: no parseable +++ lines -> honest placeholder (never blank)", () => {
  const r = fallbackSubject("some text with no diff headers");
  assert.equal(r, "misc changes (no diff parsed)");
  assert.ok(r.length > 0);
});

test("fallbackSubject: a deleted file (+++ /dev/null) is excluded while a surviving file in the SAME diff is still counted", () => {
  // git emits the deleted side as `+++ /dev/null` (no b/ prefix) -> excluded by the
  // `^+++ b/` regex; only the surviving file is counted. If the regex wrongly matched
  // /dev/null this would read "2 files changed ...", so this genuinely exercises the
  // exclusion mechanism (not the dead m[1]!=='/dev/null' guard).
  const mixed = [
    "--- a/gone.mjs", "+++ /dev/null", "@@ @@", "-1",
    "--- a/kept.mjs", "+++ b/kept.mjs", "@@ @@", "+2",
  ].join("\n");
  assert.equal(fallbackSubject(mixed), "kept.mjs -- changes");
});

// ---- draftCommitSubject (verified offload) ----
test("draftCommitSubject: a well-shaped model subject is accepted (source ollama)", async () => {
  const r = await draftCommitSubject(DIFF_1, { runImpl: async () => "add a constant to foo.mjs" });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.equal(r.value, "add a constant to foo.mjs");
});

test("draftCommitSubject: model preamble -> fallback to the deterministic file subject", async () => {
  const r = await draftCommitSubject(DIFF_1, { runImpl: async () => "Sure, here is your commit message:" });
  assert.equal(r.source, "fallback");
  assert.equal(r.value, "foo.mjs -- changes");
  assert.equal(r.reason, "verify-failed");
});

test("draftCommitSubject: ollama empty/unreachable -> fallback, never throws", async () => {
  const r = await draftCommitSubject(DIFF_3, { runImpl: async () => "" });
  assert.equal(r.source, "fallback");
  assert.equal(r.value, "3 files changed (a.mjs + 2 more)");
});

test("draftCommitSubject: a multi-line model reply keeps only the first valid subject line", async () => {
  const r = await draftCommitSubject(DIFF_1, { runImpl: async () => "refactor foo loop bounds\n\n- detail one\n- detail two" });
  assert.equal(r.source, "ollama");
  assert.equal(r.value, "refactor foo loop bounds");
});
