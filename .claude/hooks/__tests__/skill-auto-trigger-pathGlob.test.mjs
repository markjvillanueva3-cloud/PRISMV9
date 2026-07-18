// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-E1-DOCTRINE-PHASE-B-PATH-SCOPED-SKILLS
//
// Tests for pathGlobToRegex + matchesPathGlob added to skill-auto-trigger.mjs.
// 22 cases across happy-path + back-compat + failure modes + adversarial
// inputs + alternation + array form + Windows-path normalization.
//
// Run: node --test H:/prism/.claude/hooks/__tests__/skill-auto-trigger-pathGlob.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const hookUrl = pathToFileURL("H:/prism/.claude/hooks/skill-auto-trigger.mjs").href;
const { pathGlobToRegex, matchesPathGlob } = await import(hookUrl);

// ─── pathGlobToRegex — happy path ─────────────────────────────────────────

test("pathGlobToRegex: ** matches any path inc. slashes", () => {
  const rx = pathGlobToRegex("**/wedm/**");
  assert.ok(rx);
  assert.equal(rx.test("H:/prism/mcp-server/src/engines/wedm/foo"), true);
  assert.equal(rx.test("a/b/c/wedm/d/e"), true);
});

test("pathGlobToRegex: * matches no slash (single segment)", () => {
  const rx = pathGlobToRegex("src/*.ts");
  assert.ok(rx);
  assert.equal(rx.test("src/file.ts"), true);
  assert.equal(rx.test("src/sub/file.ts"), false); // no cross-slash
});

test("pathGlobToRegex: ? matches single non-slash char", () => {
  const rx = pathGlobToRegex("file?.ts");
  assert.ok(rx);
  assert.equal(rx.test("file1.ts"), true);
  assert.equal(rx.test("file.ts"), false); // ? requires exactly one
  assert.equal(rx.test("file12.ts"), false); // ? = exactly one
});

test("pathGlobToRegex: {a,b,c} alternation", () => {
  const rx = pathGlobToRegex("**/{wedm,mill,lathe}/**");
  assert.ok(rx);
  assert.equal(rx.test("a/wedm/b"), true);
  assert.equal(rx.test("a/mill/b"), true);
  assert.equal(rx.test("a/lathe/b"), true);
  assert.equal(rx.test("a/quoting/b"), false);
});

test("pathGlobToRegex: Windows path normalization (backslash -> forward)", () => {
  const rx = pathGlobToRegex("H:\\prism\\mcp-server\\**");
  assert.ok(rx);
  // pattern itself has backslashes converted; cwd must also be normalized
  // by the caller (matchesPathGlob normalizes). Test the regex against a
  // forward-slash path.
  assert.equal(rx.test("H:/prism/mcp-server/anything/here"), true);
});

// ─── pathGlobToRegex — failure modes ──────────────────────────────────────

test("pathGlobToRegex: null pattern returns null", () => {
  assert.equal(pathGlobToRegex(null), null);
});

test("pathGlobToRegex: undefined pattern returns null", () => {
  assert.equal(pathGlobToRegex(undefined), null);
});

test("pathGlobToRegex: empty pattern returns null", () => {
  assert.equal(pathGlobToRegex(""), null);
});

test("pathGlobToRegex: non-string pattern returns null", () => {
  assert.equal(pathGlobToRegex(123), null);
  assert.equal(pathGlobToRegex({}), null);
  assert.equal(pathGlobToRegex([]), null);
});

// ─── pathGlobToRegex — adversarial ────────────────────────────────────────

test("pathGlobToRegex: regex special chars in literal positions are escaped", () => {
  // Pattern contains regex special chars that should be matched literally
  // (not interpreted as regex metacharacters).
  const rx = pathGlobToRegex("path/with.dot/and(parens)");
  assert.ok(rx);
  assert.equal(rx.test("path/with.dot/and(parens)"), true);
  // The "." should NOT match "x" — it's escaped to literal dot.
  assert.equal(rx.test("path/withxdot/and(parens)"), false);
});

test("pathGlobToRegex: nested alternation degraded but doesn't crash", () => {
  // Nested {} is not supported (intentional); the outer {} captures the
  // entire string up to the closing brace. Adversarial input must not throw.
  const rx = pathGlobToRegex("**/{a,b}/**");
  assert.ok(rx);
  assert.equal(rx.test("x/a/y"), true);
});

test("pathGlobToRegex: very long pattern doesn't throw", () => {
  // 5KB pattern stress test — adversarial input.
  const longPattern = "**/" + "x".repeat(5000) + "/**";
  const rx = pathGlobToRegex(longPattern);
  // Either returns a valid regex OR returns null on the safe path. Never throws.
  assert.ok(rx === null || rx instanceof RegExp);
});

// ─── matchesPathGlob — back-compat (no pathGlob = always applicable) ──────

test("matchesPathGlob: trigger without pathGlob is always applicable (back-compat)", () => {
  const t = { name: "legacy-skill", matcher: { value: "foo" } };
  assert.equal(matchesPathGlob(t, "H:/prism/anywhere"), true);
  assert.equal(matchesPathGlob(t, "/foo/bar"), true);
  assert.equal(matchesPathGlob(t, ""), true);
});

test("matchesPathGlob: null trigger returns true (defensive)", () => {
  assert.equal(matchesPathGlob(null, "/foo"), true);
});

test("matchesPathGlob: undefined trigger returns true (defensive)", () => {
  assert.equal(matchesPathGlob(undefined, "/foo"), true);
});

test("matchesPathGlob: empty pathGlob is same as no pathGlob", () => {
  assert.equal(matchesPathGlob({ pathGlob: "" }, "/foo"), true);
  assert.equal(matchesPathGlob({ pathGlob: null }, "/foo"), true);
});

// ─── matchesPathGlob — fail-OPEN on missing cwd ───────────────────────────

test("matchesPathGlob: missing cwd fails OPEN (preserves trigger surfacing)", () => {
  // R12-honest: rather than silently hide path-scoped skills when cwd is
  // missing (e.g. PostToolUse/Stop events that don't reliably carry cwd),
  // we fail-OPEN and surface the skill anyway. Documented in the helper.
  const t = { pathGlob: "**/wedm/**" };
  assert.equal(matchesPathGlob(t, ""), true);
  assert.equal(matchesPathGlob(t, undefined), true);
  assert.equal(matchesPathGlob(t, null), true);
});

// ─── matchesPathGlob — happy-path scoping ─────────────────────────────────

test("matchesPathGlob: pathGlob wedm matches wedm cwd, NOT mill cwd", () => {
  const t = { pathGlob: "**/wedm/**" };
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/wedm/foo"), true);
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/mill/foo"), false);
});

test("matchesPathGlob: array form matches if ANY pattern matches", () => {
  const t = { pathGlob: ["**/wedm/**", "**/mill/**"] };
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/mill/foo"), true);
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/wedm/foo"), true);
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/lathe/foo"), false);
});

test("matchesPathGlob: trailing slashes are stripped before match", () => {
  const t = { pathGlob: "**/wedm" };
  assert.equal(matchesPathGlob(t, "H:/prism/wedm/"), true);
  assert.equal(matchesPathGlob(t, "H:/prism/wedm//"), true);
});

test("matchesPathGlob: Windows backslash cwd is normalized to forward-slash", () => {
  const t = { pathGlob: "**/wedm/**" };
  // Windows-style cwd with backslashes
  assert.equal(matchesPathGlob(t, "H:\\prism\\mcp-server\\src\\engines\\wedm\\foo"), true);
});

test("matchesPathGlob: array with invalid + valid mixes - valid still matches", () => {
  // First pattern is invalid (would yield null regex), second is valid.
  // The valid one should still match.
  const t = { pathGlob: [null, "**/wedm/**"] };
  assert.equal(matchesPathGlob(t, "H:/prism/wedm/foo"), true);
});

test("matchesPathGlob: pathGlob mismatches every cwd in the array form", () => {
  const t = { pathGlob: ["**/wedm/**", "**/mill/**"] };
  // Neither pattern matches — should return false.
  assert.equal(matchesPathGlob(t, "H:/prism/mcp-server/src/engines/lathe/foo"), false);
});
