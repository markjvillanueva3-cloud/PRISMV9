// mcp-route-suggest-doctrine-gate.test.mjs
// -----------------------------------------
// HIGHVALUE-DISCOVERY #4 (2026-06-09, slot:alpha): the doctrineSurface reminder
// + take-rate footer were keyed per-(session,file), so a /loop that Read N
// distinct .claude/hooks/ files re-fired the IDENTICAL doctrine block N times
// (measured live: doctrineSurface=25 in one session). The fix keys both on a
// fixed per-SESSION sentinel → at most once per session.
//
// This is a STANDALONE integration test (fires the hook as a subprocess) kept
// separate from mcp-route-suggest.test.mjs so it is not entangled with that
// file's pre-existing Grep-classifier failures. HERMETIC by construction: each
// run uses a UNIQUE session id, so the persistent doctrine-state file in
// os.tmpdir (keyed ${sessionId}:<sentinel>) cannot leak across runs — the
// stamp-leak lesson from precompact-auto-trigger (05e3c45196).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const HOOK = path.resolve("H:/prism/.claude/hooks/mcp-route-suggest.mjs");
const NODE = process.execPath;

// HERMETICITY (3-of-3 finding): the doctrine rate-limit state file is a single
// process-GLOBAL shared file written by EVERY fleet slot. Sharing it makes this
// test race against live fleet fires + parallel test processes (a concurrent
// write clobbers a peer's session key → false re-emit). Point the hook at a
// UNIQUE per-process rate file via PRISM_DOCTRINE_RATE_FILE so nothing else can
// touch it → fully deterministic regardless of fleet/parallel load.
const RATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "doctgate-rate-")), "doctrine-seen.json");

// A distinct session id per test run → no cross-run state leak (hermetic).
let _n = 0;
function uniqueSid(tag) {
  // No Date.now()/Math.random() needed for hermeticity — pid + a monotonic
  // counter is unique within and across concurrent runs.
  return `test-doctgate-${tag}-${process.pid}-${_n++}`;
}

function fireRead(filePath, sessionId) {
  const stdin = JSON.stringify({
    tool_name: "Read",
    tool_input: { file_path: filePath },
    session_id: sessionId,
  });
  // HERMETICITY: the hook early-exits with a bare {continue:true} (no doctrine
  // emit) when isMcpDown() reads the live MCP daemon as down — so the test would
  // be coupled to whether the daemon happens to be up. PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN=0
  // disables that gate so we exercise the per-session doctrine/footer logic
  // deterministically regardless of daemon state.
  const r = spawnSync(NODE, [HOOK], {
    input: stdin,
    encoding: "utf-8",
    timeout: 10000,
    windowsHide: true,
    env: { ...process.env, PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN: "0", PRISM_DOCTRINE_RATE_FILE: RATE_FILE },
  });
  let ctx = "";
  try { ctx = JSON.parse(r.stdout || "{}").hookSpecificOutput?.additionalContext || ""; } catch { ctx = ""; }
  return ctx;
}

const hasDoctrine = (ctx) => /Doctrine\/command surface/.test(ctx);
const hasFooter = (ctx) => /take-rate/.test(ctx);

// Two distinct doctrine files (.claude/hooks/*.mjs are doctrine surfaces).
const FILE_A = "H:/prism/.claude/hooks/_doctgate_a.mjs";
const FILE_B = "H:/prism/.claude/hooks/_doctgate_b.mjs";

test("doctrine block fires on the FIRST doctrine Read of a fresh session", () => {
  const sid = uniqueSid("first");
  const ctx = fireRead(FILE_A, sid);
  assert.equal(hasDoctrine(ctx), true, "first doctrine Read must emit the reminder");
});

test("doctrine block is GATED on a 2nd Read of a DIFFERENT doctrine file (same session)", () => {
  const sid = uniqueSid("gate");
  const ctx1 = fireRead(FILE_A, sid);
  assert.equal(hasDoctrine(ctx1), true, "fire 1 emits (precondition)");
  // Different file, SAME session — pre-fix this re-fired (per-file key); post-fix
  // it is suppressed (per-session key). This is the core of #4.
  const ctx2 = fireRead(FILE_B, sid);
  assert.equal(hasDoctrine(ctx2), false, "fire 2 (different file, same session) must be GATED");
});

test("take-rate footer is gated to once-per-session (not every fire)", () => {
  const sid = uniqueSid("footer");
  const ctx1 = fireRead(FILE_A, sid);
  const ctx2 = fireRead(FILE_B, sid);
  // The footer only appears when the fleet take-rate is below the awareness
  // floor; when it DOES appear on fire 1, it must NOT repeat on fire 2.
  if (hasFooter(ctx1)) {
    assert.equal(hasFooter(ctx2), false, "footer must not repeat within a session");
  } else {
    // Above-threshold session → footer suppressed on both; that's also valid.
    assert.equal(hasFooter(ctx2), false, "footer absent on both when above awareness floor");
  }
});

test("a fresh session re-fires the doctrine block (gate is per-session, not global)", () => {
  const sidA = uniqueSid("sessA");
  const sidB = uniqueSid("sessB");
  assert.equal(hasDoctrine(fireRead(FILE_A, sidA)), true, "session A emits");
  assert.equal(hasDoctrine(fireRead(FILE_A, sidB)), true, "session B (different session) also emits — not globally suppressed");
});
