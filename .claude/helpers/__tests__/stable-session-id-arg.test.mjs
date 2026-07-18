// HS-01 fix test: stable-session-id.mjs explicit --session-id anchor (2026-06-10).
// The bug: a BARE Bash call miskeyed handoffs to a PEER chat in a long turn (this
// chat's PID-pin goes stale -> the cwd-match heuristic returns a fresh peer's id;
// confirmed live: claude-c48a1aff for session db273e77). The fix: an explicit
// --session-id / positional arg is anchor (0), short-circuiting ALL heuristics, so
// the caller (which always knows its own id) gets correct, deterministic keying.
// These tests pin anchor-0 -- the only fully-deterministic path (independent of
// cache/pin/env state, which the helper hardcodes and cannot be injected here).
// node:test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const HELPER = resolve("H:/prism/.claude/helpers/stable-session-id.mjs");
function run(args) {
  return execFileSync(process.execPath, [HELPER, ...args], { encoding: "utf8" }).trim();
}

test("--session-id full uuid -> claude-<first8>", () => {
  assert.equal(run(["--session-id", "db273e77-fb5e-418e-b0e1-d7ef98b97236"]), "claude-db273e77");
});
test("first positional full uuid -> claude-<first8>", () => {
  assert.equal(run(["db273e77-fb5e-418e-b0e1-d7ef98b97236"]), "claude-db273e77");
});
test("--session-id already in claude-<hex> form normalizes to claude-<hex>", () => {
  assert.equal(run(["--session-id", "claude-db273e77"]), "claude-db273e77");
});
test("--terminal alias is accepted (per-agent-handoff uses --terminal)", () => {
  assert.equal(run(["--terminal", "db273e77-fb5e-418e-b0e1-d7ef98b97236"]), "claude-db273e77");
});
test("AUTHORITATIVE: an explicit id WINS over any cache/pin heuristic (the fix)", () => {
  // A made-up-but-valid id must come back verbatim-keyed, proving anchor-0 short-
  // circuits the heuristic chain that was returning a PEER's id.
  assert.equal(run(["--session-id", "abcd1234-0000-4000-8000-000000000000"]), "claude-abcd1234");
});
test("a too-short / non-hex arg is REJECTED by anchor-0 (not used as an id)", () => {
  // 'xyz' fails the >=8 hex guard, so anchor-0 returns null and the heuristic chain
  // runs instead -> whatever it returns, it must NOT be the bogus 'claude-xyz'.
  const out = (() => { try { return run(["--session-id", "xyz"]); } catch { return ""; } })();
  assert.notEqual(out, "claude-xyz");
});
