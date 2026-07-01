import { test } from "node:test";
import assert from "node:assert/strict";
import { baseFromCommand, shouldEnforce, RTK_WRAPPABLE_BASES } from "../pre-tool-bash-rtk-enforce.mjs";

// === baseFromCommand ===
test("baseFromCommand: bare 'git status' → 'git'", () => {
  assert.equal(baseFromCommand("git status"), "git");
});
test("baseFromCommand: 'node script.mjs' → 'node'", () => {
  assert.equal(baseFromCommand("node script.mjs"), "node");
});
test("baseFromCommand: 'rtk git status' → null (already wrapped)", () => {
  assert.equal(baseFromCommand("rtk git status"), null);
});
test("baseFromCommand: 'command git status' → null (already opt-out wrapped)", () => {
  assert.equal(baseFromCommand("command git status"), null);
});
test("baseFromCommand: 'git --version' → null (cheap probe)", () => {
  assert.equal(baseFromCommand("git --version"), null);
});
test("baseFromCommand: 'node -v' → null (cheap probe)", () => {
  assert.equal(baseFromCommand("node -v"), null);
});
test("baseFromCommand: empty/null/non-string → null", () => {
  assert.equal(baseFromCommand(""), null);
  assert.equal(baseFromCommand(null), null);
  assert.equal(baseFromCommand(undefined), null);
  assert.equal(baseFromCommand(42), null);
});
test("baseFromCommand: leading whitespace tolerated", () => {
  assert.equal(baseFromCommand("  git status"), "git");
});
test("baseFromCommand: case-insensitive base", () => {
  assert.equal(baseFromCommand("GIT status"), "git");
});

// === shouldEnforce ===
test("shouldEnforce: bare 'git status' → enforce=true, suggested='rtk git status'", () => {
  const r = shouldEnforce("git status");
  assert.equal(r.enforce, true);
  assert.equal(r.suggested, "rtk git status");
  assert.equal(r.reason, "unwrapped-git");
});
test("shouldEnforce: 'rtk git status' → enforce=false (already wrapped)", () => {
  const r = shouldEnforce("rtk git status");
  assert.equal(r.enforce, false);
});
test("shouldEnforce: 'command git status' → enforce=false (opt-out wrapped)", () => {
  const r = shouldEnforce("command git status");
  assert.equal(r.enforce, false);
});
test("shouldEnforce: 'echo hello' → enforce=false (non-wrappable base)", () => {
  const r = shouldEnforce("echo hello");
  assert.equal(r.enforce, false);
  assert.equal(r.reason, "non-wrappable");
});
test("shouldEnforce: 'git --version' → enforce=false (cheap probe)", () => {
  const r = shouldEnforce("git --version");
  assert.equal(r.enforce, false);
});
test("shouldEnforce: each RTK_WRAPPABLE_BASES base triggers enforcement", () => {
  for (const base of RTK_WRAPPABLE_BASES) {
    const r = shouldEnforce(`${base} foo`);
    assert.equal(r.enforce, true, `${base} should be enforced`);
    assert.equal(r.suggested, `rtk ${base} foo`);
  }
});
test("shouldEnforce: empty/null → enforce=false", () => {
  assert.equal(shouldEnforce("").enforce, false);
  assert.equal(shouldEnforce(null).enforce, false);
});

// === Adversarial edge cases ===
test("shouldEnforce: 'git' alone (no args) still enforces — verbose 'git' dumps help", () => {
  const r = shouldEnforce("git");
  assert.equal(r.enforce, true);
});
test("shouldEnforce: 'git;rm -rf /' shell-injection pattern → still extracts base correctly", () => {
  // We classify the base; we don't sanitize the command. Defense in depth = base detection only.
  const r = shouldEnforce("git;echo pwned");
  assert.equal(r.enforce, true);
});
test("shouldEnforce: custom wrappable set respected", () => {
  const r = shouldEnforce("foo bar", { wrappable: new Set(["foo"]) });
  assert.equal(r.enforce, true);
  assert.equal(r.suggested, "rtk foo bar");
});
test("RTK_WRAPPABLE_BASES: 'git' is in set", () => {
  assert.ok(RTK_WRAPPABLE_BASES.has("git"));
});
test("RTK_WRAPPABLE_BASES: 'echo' is NOT in set", () => {
  assert.equal(RTK_WRAPPABLE_BASES.has("echo"), false);
});
