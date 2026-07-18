// nc-normalize.test.mjs — real-behavior tests for the strict NC normalizer + comparator.
// Run: node --test scripts/lib/nc-normalize.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { normalizeNC, compareNC } from "./nc-normalize.mjs";

// ─── normalizeNC: per-rule behavior ──────────────────────────────────────────

test("strips leading block numbers by default (renumber is non-semantic)", () => {
  assert.equal(normalizeNC("N100 G0 X1"), "G0 X1");
  assert.equal(normalizeNC("  N5G1Y2"), "G1Y2"); // no space after N5, leading ws
  assert.equal(normalizeNC("n20 G2"), "G2"); // lowercase n
});

test("stripBlockNumbers:false preserves sequence numbers", () => {
  assert.equal(normalizeNC("N100 G0 X1", { stripBlockNumbers: false }), "N100 G0 X1");
});

test("does NOT strip an N inside a comment or mid-line address", () => {
  // comment line starts with '(' → untouched; N-in-comment preserved
  assert.equal(normalizeNC("(N5 IS A NOTE)"), "(N5 IS A NOTE)");
  // a real mid-line token is never at line-start, so never stripped
  assert.equal(normalizeNC("G0 X1 N5", { stripBlockNumbers: true }), "G0 X1 N5");
});

test("normalizes CRLF and lone CR to LF", () => {
  assert.equal(normalizeNC("G0\r\nG1\rG2"), "G0\nG1\nG2");
});

test("strips trailing whitespace per line", () => {
  assert.equal(normalizeNC("G0 X1   \nG1\t"), "G0 X1\nG1");
});

test("collapses blank-line runs and trims leading/trailing blanks", () => {
  assert.equal(normalizeNC("\n\nG0\n\n\nG1\n\n"), "G0\n\nG1");
});

test("preserves case, addresses, decimals and comments by default (conservative)", () => {
  const src = "G01 X1.2345 Y-0.5 (Finish Pass) M08";
  assert.equal(normalizeNC(src), src);
});

test("collapseInnerSpacing is OFF by default, ON only when requested", () => {
  assert.equal(normalizeNC("G0   X1\tY2"), "G0   X1\tY2"); // default preserves
  assert.equal(normalizeNC("G0   X1\tY2", { collapseInnerSpacing: true }), "G0 X1 Y2");
});

test("dropComments removes (...) and ;... comments", () => {
  assert.equal(normalizeNC("G0 X1 (rapid)", { dropComments: true }).trim(), "G0 X1");
  assert.equal(normalizeNC("G1 Y2 ;feed", { dropComments: true }).trim(), "G1 Y2");
});

test("volatileCommentMask applies caller-supplied substitutions (e.g. mask DATE=)", () => {
  const src = "(DATE=DD-MM-YY - 16-07-20 TIME=HH:MM - 10:42)";
  const masked = normalizeNC(src, {
    volatileCommentMask: [{ pattern: "DATE=\\S+ - [0-9-]+", replacement: "DATE=*" }],
  });
  assert.match(masked, /DATE=\*/);
  assert.doesNotMatch(masked, /16-07-20/);
});

test("is idempotent: normalize(normalize(x)) === normalize(x)", () => {
  const src = "N5 G0 X1   \r\n\n\nN10 (note)  \r\nN15 M30\n\n";
  const once = normalizeNC(src);
  assert.equal(normalizeNC(once), once);
});

test("throws on non-string input (fail-loud contract)", () => {
  assert.throws(() => normalizeNC(42), /must be a string/);
});

test("empty / blank-only input → empty string", () => {
  assert.equal(normalizeNC(""), "");
  assert.equal(normalizeNC("\n\n  \n"), "");
});

// ─── compareNC: the byte-equivalence contract ────────────────────────────────

test("compareNC: a renumbered + respaced variant is EQUAL (renumber/spacing non-semantic)", () => {
  const golden = "%\nO1\nG0 X1\nG1 Y2\nM30\n%";
  const variant = "%\r\nO1\r\nN10 G0 X1  \r\nN20 G1 Y2\r\nN30 M30\r\n%\r\n";
  const r = compareNC(golden, variant);
  assert.equal(r.equal, true, r.summary);
  assert.equal(r.firstDiff, null);
});

test("compareNC: a real coordinate change is UNEQUAL with the correct first-diff line", () => {
  const golden = "G0 X1\nG1 Y2\nM30";
  const changed = "G0 X1\nG1 Y2.5\nM30"; // Y2 → Y2.5 = semantic drift
  const r = compareNC(golden, changed);
  assert.equal(r.equal, false);
  assert.equal(r.firstDiff.line, 2);
  assert.equal(r.firstDiff.a, "G1 Y2");
  assert.equal(r.firstDiff.b, "G1 Y2.5");
});

test("compareNC: identical programs are equal", () => {
  const p = "%\nO1\nG0 X1\nM30\n%";
  assert.equal(compareNC(p, p).equal, true);
});

// ─── Integration: real golden Haas NC corpus ─────────────────────────────────

const GOLDEN = "JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC";

test("integration: a real golden Haas NC normalizes idempotently + self-compares equal", (t) => {
  if (!existsSync(GOLDEN)) return t.skip("golden Haas NC not present on this machine");
  const raw = readFileSync(GOLDEN, "utf8");
  const once = normalizeNC(raw);
  assert.equal(normalizeNC(once), once, "normalization must be idempotent on real data");
  assert.equal(compareNC(raw, raw).equal, true);
  assert.ok(once.length > 0);
});

test("integration: injecting block numbers into a real golden NC still compares EQUAL (renumber-invariance)", (t) => {
  if (!existsSync(GOLDEN)) return t.skip("golden Haas NC not present on this machine");
  const raw = readFileSync(GOLDEN, "utf8").replace(/\r\n?/g, "\n");
  // RE-number every non-empty line (strip any existing seq number, add a fresh one) — the real
  // renumber operation. The golden body already carries N-numbers (N1 G20, N3 G0…), so a naive
  // prefix would STACK a second number; a single strip leaves a residual. Re-numbering proves the
  // true invariance: original `N1 G20` and renumbered `N10 G20` both normalize to `G20`.
  const renumbered = raw
    .split("\n")
    .map((l, i) => (l.trim() === "" ? l : `N${(i + 1) * 10} ${l.replace(/^[ \t]*[Nn]\d+[ \t]?/, "")}`))
    .join("\r\n"); // also change EOL to prove EOL-invariance
  const r = compareNC(raw, renumbered);
  assert.equal(r.equal, true, r.summary);
});
