// Tests for safe-truncate.mjs -- the surrogate-safe truncation + lone-surrogate
// sanitizer built to fix the bravo 400 "no low surrogate in string" API block.
// R9: the key assertions are that a cut mid-surrogate-pair NEVER leaves a lone
// surrogate, and that valid emoji (surrogate PAIRS) survive untouched.
// Run: node --test H:/prism/scripts/lib/safe-truncate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stripLoneSurrogates,
  stripLoneSurrogatesFallback,
  hasLoneSurrogate,
  clampUtf8,
  utf8Truncate,
  safeTruncate,
} from "./safe-truncate.mjs";

const HI = "\uD83D";            // lone high surrogate (high half of U+1F600)
const LO = "\uDE00";            // lone low surrogate (low half of U+1F600)
const EMOJI = String.fromCharCode(0xd83d, 0xde00); // U+1F600 GRINNING FACE -- a valid surrogate PAIR
const FFFD = String.fromCharCode(0xfffd);

test("stripLoneSurrogates: replaces a lone high surrogate with U+FFFD", () => {
  assert.equal(stripLoneSurrogates("ab" + HI + "cd"), "ab" + FFFD + "cd");
});

test("stripLoneSurrogates: replaces a lone low surrogate with U+FFFD", () => {
  assert.equal(stripLoneSurrogates("ab" + LO + "cd"), "ab" + FFFD + "cd");
});

test("stripLoneSurrogates: preserves a valid emoji (surrogate pair) untouched", () => {
  assert.equal(stripLoneSurrogates("ab" + EMOJI + "cd"), "ab" + EMOJI + "cd");
});

test("stripLoneSurrogates: no-op on clean text, empty, non-string", () => {
  assert.equal(stripLoneSurrogates("plain ascii"), "plain ascii");
  assert.equal(stripLoneSurrogates(""), "");
  assert.equal(stripLoneSurrogates(null), null);
});

test("stripLoneSurrogates: result is always well-formed (no lone surrogate left)", () => {
  assert.equal(hasLoneSurrogate(stripLoneSurrogates("x" + HI + EMOJI + LO + "y")), false);
});

test("stripLoneSurrogatesFallback: consecutive lone-LOW surrogates are BOTH replaced (P1 regression)", () => {
  // The old consuming regex `(^|[^high])(low)` ate the char before a lone low,
  // so the 2nd of two adjacent lone lows leaked. The lookbehind form fixes it.
  const out = stripLoneSurrogatesFallback("a" + LO + LO + "b");
  assert.equal(out, "a" + FFFD + FFFD + "b");
  assert.equal(hasLoneSurrogate(out), false);
});

test("stripLoneSurrogatesFallback: consecutive lone-HIGH surrogates are BOTH replaced", () => {
  const out = stripLoneSurrogatesFallback("a" + HI + HI + "b");
  assert.equal(out, "a" + FFFD + FFFD + "b");
  assert.equal(hasLoneSurrogate(out), false);
});

test("stripLoneSurrogatesFallback: preserves a valid emoji pair + clean text", () => {
  assert.equal(stripLoneSurrogatesFallback("x" + EMOJI + "y"), "x" + EMOJI + "y");
  assert.equal(stripLoneSurrogatesFallback("plain"), "plain");
});

test("stripLoneSurrogatesFallback: reversed adjacency (low then high) both replaced", () => {
  const out = stripLoneSurrogatesFallback(LO + HI);
  assert.equal(out, FFFD + FFFD);
  assert.equal(hasLoneSurrogate(out), false);
});

test("hasLoneSurrogate: true for lone, false for clean/paired", () => {
  assert.equal(hasLoneSurrogate("ab" + HI), true);
  assert.equal(hasLoneSurrogate("ab" + LO), true);
  assert.equal(hasLoneSurrogate(EMOJI), false);
  assert.equal(hasLoneSurrogate("clean"), false);
  assert.equal(hasLoneSurrogate(""), false);
});

test("safeTruncate: a cut mid-emoji drops the partial pair (no lone surrogate)", () => {
  // "ab" + 😀 + "cd" -> length 6; cut at 3 lands on the high half of the emoji.
  const out = safeTruncate("ab" + EMOJI + "cd", 3);
  assert.equal(out, "ab");                      // backed off, partial emoji dropped
  assert.equal(hasLoneSurrogate(out), false);   // and provably no lone surrogate
});

test("safeTruncate: a naive slice WOULD have left a lone surrogate (regression anchor)", () => {
  // Proves the bug the fix prevents: the raw slice leaves a lone high surrogate.
  assert.equal(hasLoneSurrogate(("ab" + EMOJI + "cd").slice(0, 3)), true);
});

test("safeTruncate: normal truncation, under-budget passthrough, suffix", () => {
  assert.equal(safeTruncate("abcdef", 3), "abc");
  assert.equal(safeTruncate("abcdef", 10), "abcdef");
  assert.equal(safeTruncate("abcdef", 3, "X"), "abcX");
});

test("clampUtf8: byte budget never splits a 4-byte emoji or leaves a lone surrogate", () => {
  const out = clampUtf8("ab" + EMOJI, 3); // 3 bytes can't fit "ab"(2) + emoji(4)
  assert.equal(out, "ab");
  assert.equal(hasLoneSurrogate(out), false);
});

test("utf8Truncate: surrogate-safe under any byte budget that cuts the emoji", () => {
  const s = "aaaa" + EMOJI + "bbbb"; // emoji is 4 UTF-8 bytes mid-string
  for (let b = 1; b <= Buffer.byteLength(s, "utf8"); b++) {
    const { text } = utf8Truncate(s, b);
    assert.equal(hasLoneSurrogate(text), false, `lone surrogate at byte budget ${b}`);
    assert.ok(Buffer.byteLength(text, "utf8") <= b, `over budget at ${b}`);
  }
});

test("utf8Truncate: under-budget returns the original, truncated=false", () => {
  const r = utf8Truncate("short", 100);
  assert.equal(r.text, "short");
  assert.equal(r.truncated, false);
});
