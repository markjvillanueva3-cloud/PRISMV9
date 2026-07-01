// HS-01 FLEET-WIDE FIX test: stable-session-id.mjs CLAUDE_CODE_SESSION_ID env
// anchor (2026-06-10). The HS-01 root fix added an explicit --session-id arg
// (anchor 0), but the 24 BARE callers (`STABLE=$(stable-session-id.mjs)`) pass
// NO arg and have NO stdin -> they fell through to the PID-pin heuristic, which
// silently returned a PEER chat's id (claude-c48a1aff for db273e77). The harness
// exports CLAUDE_CODE_SESSION_ID into every tool subprocess's env, scoped to
// THIS chat's process (cannot be a peer's id), so anchor 1.5 reads it and fixes
// EVERY bare caller fleet-wide with zero caller edits. These tests pin that
// anchor deterministically by overriding the env var in the child process.
// node:test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const HELPER = resolve("H:/prism/.claude/helpers/stable-session-id.mjs");

// Run the helper with a controlled env + empty stdin (so the stdin anchor is
// a no-op and the env anchor is the one under test). We DELETE CLAUDE_SESSION_ID
// (the legacy manual-override at anchor 3) so it can never mask the result.
function runEnv(envOverrides, args = []) {
  const env = { ...process.env, ...envOverrides };
  delete env.CLAUDE_SESSION_ID; // legacy anchor (3) must not interfere
  return execFileSync(process.execPath, [HELPER, ...args], {
    encoding: "utf8",
    input: "", // empty stdin -> stdin anchor returns null
    env,
  }).trim();
}

test("CLAUDE_CODE_SESSION_ID (full uuid) -> claude-<first8> for a BARE call (no arg)", () => {
  // This IS the production scenario that was broken: a bare Bash caller with the
  // harness env set must key to ITS OWN id, never a peer.
  assert.equal(
    runEnv({ CLAUDE_CODE_SESSION_ID: "feed1234-0000-4000-8000-000000000000" }),
    "claude-feed1234"
  );
});

test("explicit --session-id (anchor 0) WINS over CLAUDE_CODE_SESSION_ID env (anchor 1.5)", () => {
  // Anchor precedence: an explicit arg the caller passed is more authoritative
  // than the ambient env. Proves the env anchor did not displace anchor 0.
  assert.equal(
    runEnv(
      { CLAUDE_CODE_SESSION_ID: "feed1234-0000-4000-8000-000000000000" },
      ["--session-id", "abcd1234-1111-4000-8000-000000000000"]
    ),
    "claude-abcd1234"
  );
});

test("a non-hex CLAUDE_CODE_SESSION_ID is REJECTED by anchor 1.5 (not used as an id)", () => {
  // 'xyz' fails the >=8-hex guard -> anchor 1.5 returns null and the chain falls
  // through; whatever it returns, it must NOT be the bogus 'claude-xyz'.
  const out = (() => {
    try { return runEnv({ CLAUDE_CODE_SESSION_ID: "xyz" }); } catch { return ""; }
  })();
  assert.notEqual(out, "claude-xyz");
});

test("an already-normalized full uuid is truncated to claude-<first8> (matches handoff filename)", () => {
  // deriveTerminalFromIdentifier must emit the SAME `claude-<first8>` form that
  // precompact-handoff.mjs uses for the filename, so per-agent-handoff read finds it.
  assert.equal(
    runEnv({ CLAUDE_CODE_SESSION_ID: "db273e77-fb5e-418e-b0e1-d7ef98b97236" }),
    "claude-db273e77"
  );
});
