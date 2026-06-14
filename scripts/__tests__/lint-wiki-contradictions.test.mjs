// Tests for scripts/lint-wiki-contradictions.mjs (OLLAMA-SYNERGY / U-WIKI-NLI-LINT).
// Hermetic: every LLM/network dependency is injected (callImpl / fetchModelsFn).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tokenizeForTopic,
  parsePage,
  selectClaim,
  candidatePairs,
  buildNliPrompt,
  parseNliVerdict,
  runNliLint,
  resolveNliModel,
  CLAIM_MAX_CHARS,
  DEFAULT_NLI_MODEL,
} from "../lint-wiki-contradictions.mjs";

/* ---------------- tokenizeForTopic ---------------- */
test("tokenizeForTopic drops stopwords + short tokens, dedupes", () => {
  const toks = tokenizeForTopic({ title: "The Kienzle cutting force model", tags: ["physics"], firstHeading: "Kienzle force" });
  assert.ok(toks.has("kienzle"));
  assert.ok(toks.has("cutting"));
  assert.ok(toks.has("force"));
  assert.ok(toks.has("physics"));
  assert.ok(!toks.has("the"));   // stopword
  assert.ok(toks.has("model")); // 'model' is 5 chars, kept
  // 'force' appears twice (title + heading) -> deduped to one Set entry
  assert.equal([...toks].filter((t) => t === "force").length, 1);
});

test("tokenizeForTopic handles empty/missing input", () => {
  assert.equal(tokenizeForTopic({}).size, 0);
  assert.equal(tokenizeForTopic().size, 0);
});

/* ---------------- parsePage ---------------- */
test("parsePage extracts frontmatter title/description/tags + first heading + body", () => {
  const md = `---
title: My Lesson
description: A lesson about thin-wall milling.
tags: [mill, lesson]
---

# Heading One

Body paragraph here.`;
  const p = parsePage(md, "lessons/my-lesson.md");
  assert.equal(p.title, "My Lesson");
  assert.equal(p.description, "A lesson about thin-wall milling.");
  assert.deepEqual(p.tags, ["mill", "lesson"]);
  assert.equal(p.firstHeading, "Heading One");
  assert.ok(p.body.includes("Body paragraph here."));
  assert.ok(!p.body.startsWith("---")); // frontmatter stripped
});

test("parsePage falls back to first heading / basename when no title frontmatter", () => {
  const p = parsePage("# Just A Heading\n\ntext", "concepts/foo.md");
  assert.equal(p.title, "Just A Heading");
  const p2 = parsePage("plain body no heading", "concepts/bar.md");
  assert.equal(p2.title, "bar"); // basename fallback
});

/* ---------------- selectClaim ---------------- */
test("selectClaim prefers frontmatter description", () => {
  const p = parsePage("---\ndescription: The canonical claim.\n---\n\n# H\n\nbody", "lessons/x.md");
  assert.equal(selectClaim(p), "The canonical claim.");
});

test("selectClaim falls back to first non-heading/non-blockquote paragraph", () => {
  const p = parsePage("# Title\n\n> a blockquote\n\nThe real first paragraph of content.", "lessons/y.md");
  assert.equal(selectClaim(p), "The real first paragraph of content.");
});

test("selectClaim truncates at maxChars", () => {
  const long = "x".repeat(CLAIM_MAX_CHARS + 200);
  const p = parsePage(`---\ndescription: ${long}\n---\n\nbody`, "lessons/z.md");
  const claim = selectClaim(p);
  assert.ok(claim.length <= CLAIM_MAX_CHARS + 3); // + "..."
  assert.ok(claim.endsWith("..."));
});

/* ---------------- candidatePairs ---------------- */
const mkPage = (rel, tokens, claim = "c") => ({ rel, base: rel, tokens: new Set(tokens), claim });

test("candidatePairs pairs pages sharing >= minShared tokens, sorted by shared desc", () => {
  const pages = [
    mkPage("a", ["kienzle", "force", "mill"]),
    mkPage("b", ["kienzle", "force", "lathe"]), // shares 2 with a (kienzle, force)
    mkPage("c", ["taylor", "wear"]),            // shares 0 with a/b
  ];
  const pairs = candidatePairs(pages, { minShared: 2, limit: 10, maxBucket: 50 });
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].shared, 2);
  assert.deepEqual([pairs[0].i, pairs[0].j].sort(), [0, 1]);
});

test("candidatePairs skips too-common token buckets (> maxBucket)", () => {
  // 4 pages all share token 'common' -> bucket size 4; with maxBucket 3 it's skipped.
  const pages = [
    mkPage("a", ["common", "x"]),
    mkPage("b", ["common", "y"]),
    mkPage("c", ["common", "z"]),
    mkPage("d", ["common", "w"]),
  ];
  // Only 'common' is shared; each unique token is a singleton. With it skipped, 0 pairs.
  const pairs = candidatePairs(pages, { minShared: 1, limit: 10, maxBucket: 3 });
  assert.equal(pairs.length, 0);
  // With a larger maxBucket the 'common' bucket yields C(4,2)=6 pairs.
  const pairs2 = candidatePairs(pages, { minShared: 1, limit: 10, maxBucket: 10 });
  assert.equal(pairs2.length, 6);
});

test("candidatePairs respects the limit cap and returns none on no overlap", () => {
  const pages = [
    mkPage("a", ["t1", "t2", "t3"]),
    mkPage("b", ["t1", "t2", "t3"]),
    mkPage("c", ["t1", "t2", "t3"]),
  ]; // all 3 pairs share 3 tokens
  assert.equal(candidatePairs(pages, { minShared: 2, limit: 2, maxBucket: 50 }).length, 2);
  const none = candidatePairs([mkPage("a", ["only"]), mkPage("b", ["other"])], { minShared: 2, limit: 10 });
  assert.equal(none.length, 0);
});

/* ---------------- buildNliPrompt ---------------- */
test("buildNliPrompt includes both claims and the three verdict words", () => {
  const p = buildNliPrompt("Claim AAA", "Claim BBB");
  assert.ok(p.includes("Claim AAA"));
  assert.ok(p.includes("Claim BBB"));
  for (const v of ["CONTRADICT", "CONSISTENT", "UNRELATED"]) assert.ok(p.includes(v));
});

/* ---------------- parseNliVerdict ---------------- */
test("parseNliVerdict reads each verdict + reason", () => {
  assert.equal(parseNliVerdict("CONTRADICT\nA says X, B says not-X.").verdict, "contradict");
  assert.equal(parseNliVerdict("CONSISTENT\nthey agree").verdict, "consistent");
  assert.equal(parseNliVerdict("UNRELATED\ndifferent topics").verdict, "unrelated");
  assert.equal(parseNliVerdict("CONTRADICT\nbecause reason here").reason, "because reason here");
});

test("parseNliVerdict: earliest keyword wins, garbage/empty -> unknown", () => {
  // CONSISTENT appears before CONTRADICT -> consistent wins.
  assert.equal(parseNliVerdict("They are CONSISTENT and not CONTRADICT.").verdict, "consistent");
  assert.equal(parseNliVerdict("banana waffles").verdict, "unknown");
  assert.equal(parseNliVerdict("").verdict, "unknown");
  assert.equal(parseNliVerdict(null).verdict, "unknown");
});

test("parseNliVerdict: word-boundary + negation guard (no false contradict)", () => {
  // substring 'UNRELATEDNESS' must NOT match 'unrelated' (word boundary)
  assert.equal(parseNliVerdict("UNRELATEDNESS abounds").verdict, "unknown");
  // a negation immediately before CONTRADICT -> NOT a contradiction
  assert.equal(parseNliVerdict("These do not contradict; they are CONSISTENT.").verdict, "consistent");
  assert.equal(parseNliVerdict("CONSISTENT\nthey do not contradict").verdict, "consistent");
  // first-line verdict wins even when the reason line mentions another keyword
  assert.equal(parseNliVerdict("CONTRADICT\nthis is consistent with prior art").verdict, "contradict");
});

/* ---------------- runNliLint (injected callImpl) ---------------- */
const lintPages = [
  mkPage("lessons/a.md", ["kienzle", "force"], "Cutting force rises with feed."),
  mkPage("lessons/b.md", ["kienzle", "force"], "Cutting force is independent of feed."),
];

test("runNliLint captures a contradiction (happy path)", async () => {
  const callImpl = async () => ({ ok: true, text: "CONTRADICT\nfeed-dependence claims conflict" });
  const rep = await runNliLint(lintPages, { callImpl, limit: 10 });
  assert.equal(rep.totals.pairsConsidered, 1);
  assert.equal(rep.totals.pairsChecked, 1);
  assert.equal(rep.totals.contradictions, 1);
  assert.equal(rep.contradictions[0].a, "lessons/a.md");
  assert.equal(rep.contradictions[0].b, "lessons/b.md");
  assert.ok(rep.contradictions[0].reason.length > 0);
});

test("runNliLint: consistent verdict yields no contradiction", async () => {
  const callImpl = async () => ({ ok: true, text: "CONSISTENT\nboth fine" });
  const rep = await runNliLint(lintPages, { callImpl, limit: 10 });
  assert.equal(rep.totals.pairsChecked, 1);
  assert.equal(rep.totals.contradictions, 0);
});

test("runNliLint fail-soft: callImpl ok:false -> unchecked, never throws", async () => {
  const callImpl = async () => ({ ok: false, error: "http-503" });
  const rep = await runNliLint(lintPages, { callImpl, limit: 10 });
  assert.equal(rep.totals.pairsChecked, 0);
  assert.equal(rep.totals.unchecked, 1);
  assert.equal(rep.totals.contradictions, 0);
});

test("runNliLint fail-soft: callImpl throws -> unchecked, never throws", async () => {
  const callImpl = async () => { throw new Error("boom"); };
  const rep = await runNliLint(lintPages, { callImpl, limit: 10 });
  assert.equal(rep.totals.unchecked, 1);
  assert.equal(rep.totals.pairsChecked, 0);
});

test("runNliLint fail-soft: empty text -> unchecked (harmony empty-output)", async () => {
  const callImpl = async () => ({ ok: true, text: "" });
  const rep = await runNliLint(lintPages, { callImpl, limit: 10 });
  assert.equal(rep.totals.unchecked, 1);
  assert.equal(rep.totals.contradictions, 0);
});

test("runNliLint circuit-breaker: aborts after N consecutive failures (no hours-long grind)", async () => {
  // 4 fully-overlapping pages -> 6 candidate pairs. With a model that always fails
  // and maxConsecutiveFailures=3, the run must abort after exactly 3, not all 6.
  const pages = [
    mkPage("lessons/a.md", ["t1", "t2", "t3"], "claim a"),
    mkPage("lessons/b.md", ["t1", "t2", "t3"], "claim b"),
    mkPage("lessons/c.md", ["t1", "t2", "t3"], "claim c"),
    mkPage("lessons/d.md", ["t1", "t2", "t3"], "claim d"),
  ];
  let calls = 0;
  const callImpl = async () => { calls++; return { ok: false, error: "timeout" }; };
  const rep = await runNliLint(pages, { callImpl, limit: 10, maxConsecutiveFailures: 3 });
  assert.equal(rep.aborted, true);
  assert.ok(rep.abortReason.includes("consecutive"));
  assert.equal(rep.totals.unchecked, 3);
  assert.equal(rep.totals.pairsChecked, 0);
  assert.equal(calls, 3); // stopped early, did NOT call all 6 pairs
});

test("runNliLint: a success resets the consecutive-failure counter", async () => {
  const pages = [
    mkPage("lessons/a.md", ["t1", "t2", "t3"], "claim a"),
    mkPage("lessons/b.md", ["t1", "t2", "t3"], "claim b"),
    mkPage("lessons/c.md", ["t1", "t2", "t3"], "claim c"),
    mkPage("lessons/d.md", ["t1", "t2", "t3"], "claim d"),
  ];
  // fail, fail, OK (resets), fail, fail, fail -> would only abort if 3-in-a-row AFTER reset.
  const seq = [
    { ok: false }, { ok: false }, { ok: true, text: "CONSISTENT\nok" },
    { ok: false }, { ok: false }, { ok: false },
  ];
  let n = 0;
  const callImpl = async () => seq[n++] || { ok: false };
  const rep = await runNliLint(pages, { callImpl, limit: 10, maxConsecutiveFailures: 3 });
  assert.equal(rep.aborted, true);          // the final 3-in-a-row trips it
  assert.equal(rep.totals.pairsChecked, 1); // the one CONSISTENT reset the counter
  // Load-bearing for the RESET: with the reset, all 6 pairs run -> 5 failures.
  // WITHOUT the reset it would abort at pair 4 -> unchecked would be 3, not 5.
  assert.equal(rep.totals.unchecked, 5);
});

/* ---------------- resolveNliModel ---------------- */
test("resolveNliModel: env pin installed wins", async () => {
  const r = await resolveNliModel({ envModel: "gpt-oss:20b", fetchModelsFn: async () => ["gpt-oss:20b", "qwen2.5-coder:32b"] });
  assert.equal(r.model, "gpt-oss:20b");
  assert.ok(!r.fellBack);
});

test("resolveNliModel: default used when no env pin", async () => {
  const r = await resolveNliModel({ envModel: undefined, fetchModelsFn: async () => [DEFAULT_NLI_MODEL, "x"] });
  assert.equal(r.model, DEFAULT_NLI_MODEL);
});

test("resolveNliModel: falls back to preference when wanted absent", async () => {
  const r = await resolveNliModel({ envModel: "not-installed:99b", fetchModelsFn: async () => ["qwen2.5-coder:32b"] });
  assert.equal(r.model, "qwen2.5-coder:32b");
  assert.ok(r.fellBack);
});

test("resolveNliModel: no installed models -> model null (fail-soft)", async () => {
  const r = await resolveNliModel({ fetchModelsFn: async () => [] });
  assert.equal(r.model, null);
  assert.ok(r.reason);
});
