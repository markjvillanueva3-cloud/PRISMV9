import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeLedger, formatHeadline } from "../rtk-savings-headline-inject.mjs";

test("summarizeLedger: hit + miss are counted separately", () => {
  const jsonl = [
    JSON.stringify({ sessionId: "abc12345", base: "git", kind: "hit", est_tokens: 700 }),
    JSON.stringify({ sessionId: "abc12345", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ sessionId: "abc12345", base: "vitest", kind: "miss", est_tokens: 950 }),
  ].join("\n");
  const s = summarizeLedger(jsonl, "abc12345");
  assert.equal(s.hits, 1);
  assert.equal(s.misses, 2);
  assert.equal(s.savedTokens, 700);
  assert.equal(s.missedTokens, 1650);
  assert.equal(s.byMiss.git, 700);
  assert.equal(s.byMiss.vitest, 950);
});

test("summarizeLedger: session filter excludes other sessions", () => {
  const jsonl = [
    JSON.stringify({ sessionId: "aaa", base: "git", kind: "miss", est_tokens: 700 }),
    JSON.stringify({ sessionId: "bbb", base: "vitest", kind: "miss", est_tokens: 950 }),
  ].join("\n");
  const s = summarizeLedger(jsonl, "aaa");
  assert.equal(s.misses, 1);
  assert.equal(s.byMiss.vitest, undefined);
});

test("summarizeLedger: empty/malformed input → zero counts", () => {
  const s1 = summarizeLedger("");
  assert.equal(s1.hits, 0);
  assert.equal(s1.misses, 0);
  const s2 = summarizeLedger("not-json\n{broken\n");
  assert.equal(s2.hits, 0);
});

test("summarizeLedger: skip-kind entries ignored", () => {
  const jsonl = [
    JSON.stringify({ sessionId: "x", base: "ls", kind: "skip", est_tokens: 650 }),
    JSON.stringify({ sessionId: "x", base: "git", kind: "miss", est_tokens: 700 }),
  ].join("\n");
  const s = summarizeLedger(jsonl, "x");
  assert.equal(s.hits, 0);
  assert.equal(s.misses, 1);
});

test("formatHeadline: empty summary → null", () => {
  assert.equal(formatHeadline({ hits: 0, misses: 0, savedTokens: 0, missedTokens: 0, byMiss: {} }), null);
  assert.equal(formatHeadline(null), null);
});

test("formatHeadline: includes hit + miss counts + top miss", () => {
  const out = formatHeadline({ hits: 3, misses: 5, savedTokens: 2100, missedTokens: 3500, byMiss: { git: 2100, vitest: 1400 } });
  assert.ok(out.includes("3 hits"));
  assert.ok(out.includes("5 misses"));
  assert.ok(out.includes("2.1k"));
  assert.ok(out.includes("3.5k"));
  assert.ok(out.includes("git"));
});

test("formatHeadline: no misses → no top-miss section", () => {
  const out = formatHeadline({ hits: 2, misses: 0, savedTokens: 1400, missedTokens: 0, byMiss: {} });
  assert.ok(out.includes("0 misses"));
  assert.ok(!out.includes("top miss"));
});

test("formatHeadline: includes disable knob hint", () => {
  const out = formatHeadline({ hits: 1, misses: 1, savedTokens: 700, missedTokens: 700, byMiss: { git: 700 } });
  assert.ok(out.includes("PRISM_RTK_HEADLINE_DISABLE"));
});
