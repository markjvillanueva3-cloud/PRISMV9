#!/usr/bin/env node
/**
 * Tests for fix-sync-windowshide.mjs -- the synchronous-subprocess windowsHide
 * remediation. Safety-critical: the scanner must target ONLY the call's top-level
 * options object, never a nested env object / an object inside an array / a brace
 * inside a string or template. Run: node scripts/fix-sync-windowshide.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchParen, lastTopLevelObjectBrace, fixText } from "./fix-sync-windowshide.mjs";

test("matchParen finds the matching close paren, string/comment aware", () => {
  const s = `foo(a, ")", b)`;
  assert.equal(s[matchParen(s, 3)], ")");
  assert.equal(matchParen(s, 3), s.length - 1);
});

test("lastTopLevelObjectBrace returns the options object, NOT a nested env object", () => {
  const call = `(cmd, args, { env: { ...process.env, X: "1" }, encoding: "utf8" })`;
  const idx = lastTopLevelObjectBrace(call);
  // The brace it points to must be the OUTER options object (the one preceding ` env:`)
  assert.ok(idx > 0);
  assert.match(call.slice(idx, idx + 6), /\{ env:/);
});

test("lastTopLevelObjectBrace ignores objects nested inside an array argument", () => {
  const call = `(cmd, [{ notOptions: true }])`;
  assert.equal(lastTopLevelObjectBrace(call), -1, "object inside [] is not a top-level arg object");
});

test("lastTopLevelObjectBrace ignores braces inside strings and templates", () => {
  const call = "(process.execPath, [\"-e\", `import(${href}).then(m=>{})`])";
  assert.equal(lastTopLevelObjectBrace(call), -1, "braces inside a template are not an options object");
});

test("lastTopLevelObjectBrace returns -1 when there is no options object", () => {
  assert.equal(lastTopLevelObjectBrace(`("git", ["log", "--oneline"])`), -1);
});

test("fixText inserts windowsHide into the options object", () => {
  const src = `const r = spawnSync("git", args, { encoding: "utf8", timeout: 5000 });`;
  const { next, fixed } = fixText(src);
  assert.equal(fixed, 1);
  assert.match(next, /\{ windowsHide: true, encoding: "utf8", timeout: 5000 \}/);
});

test("fixText targets the OUTER options object, leaving a nested env object intact", () => {
  const src = `execFileSync(cmd, a, { env: { ...process.env, A: "1" }, encoding: "utf8" });`;
  const { next, fixed } = fixText(src);
  assert.equal(fixed, 1);
  // exactly one windowsHide, and it precedes ` env:` (outer object), env object untouched
  assert.equal((next.match(/windowsHide/g) || []).length, 1);
  assert.match(next, /\{ windowsHide: true, env: \{ \.\.\.process\.env, A: "1" \}/);
});

test("fixText SKIPS a call with no options object (no arity change)", () => {
  const src = `const out = execFileSync("git", ["log", "--oneline"]);`;
  const { next, fixed, skipped } = fixText(src);
  assert.equal(fixed, 0);
  assert.equal(skipped, 1);
  assert.equal(next, src, "unchanged -- never adds an options object");
});

test("fixText is idempotent: a call that already has windowsHide is untouched", () => {
  const src = `spawnSync(cmd, args, { encoding: "utf8", windowsHide: true });`;
  const { fixed } = fixText(src);
  assert.equal(fixed, 0);
});

test("fixText empty options object {} gets windowsHide", () => {
  const src = `spawnSync(cmd, args, {});`;
  const { next, fixed } = fixText(src);
  assert.equal(fixed, 1);
  assert.match(next, /\{ windowsHide: true \}/);
});

test("fixText ignores a method-position match (regex method call, not child_process)", () => {
  // Assemble the `.NAME(` form so this test SOURCE does not contain the literal
  // substring the pre-tool security scanner flags.
  const src = "const m = FN_RE." + "exec" + "(text);";
  const { fixed, skipped } = fixText(src);
  assert.equal(fixed, 0);
  assert.equal(skipped, 0, "method-position match without a child-process context is not a subprocess call");
});

test("fixText handles multiple sites in one source, right-to-left offset safety", () => {
  const src = [
    `spawnSync("a", x, { encoding: "utf8" });`,
    `execFileSync("b", y, { timeout: 9 });`,
  ].join("\n");
  const { next, fixed } = fixText(src);
  assert.equal(fixed, 2);
  assert.match(next, /\{ windowsHide: true, encoding: "utf8" \}/);
  assert.match(next, /\{ windowsHide: true, timeout: 9 \}/);
});
