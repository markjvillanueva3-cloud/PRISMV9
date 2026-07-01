// mcp-route-suggest-backend-audit-gate.test.mjs
// ------------------------------------------------
// U-OBS-BACKEND-AUDIT-SESSION-GATE (2026-06-09, slot:alpha): twin of the
// doctrineSurface fix (mcp-route-suggest-doctrine-gate.test.mjs). The
// "Backend audit:" route-suggest nudge was pushed on EVERY backend-file edit
// — and the message is STATIC (AUDIT_CHAIN_CMD ends in a literal "<path>",
// never interpolated), so a /loop that edits N files in mcp-server/src/engines
// re-injected the IDENTICAL block N times. Telemetry: 4052 fires / 3 takeups
// (0.07%). The fix keys it on a fixed per-SESSION sentinel
// (__backend_audit_session__) → at most once per session, like its sibling.
//
// STANDALONE integration test (fires the hook as a subprocess), kept separate
// from mcp-route-suggest.test.mjs so it is not entangled with that file's
// pre-existing Grep-classifier failures. HERMETIC: a UNIQUE session id per run
// + a per-process PRISM_DOCTRINE_RATE_FILE (the sentinel store both gates
// share) → no cross-run / fleet / parallel leak (the stamp-leak lesson from
// precompact-auto-trigger 05e3c45196).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

const HOOK = path.resolve("H:/prism/.claude/hooks/mcp-route-suggest.mjs");
const NODE = process.execPath;

// HERMETICITY: the per-session sentinel store is a process-GLOBAL file written
// by EVERY fleet slot (and by the doctrine gate, which shares it). Point the
// hook at a UNIQUE per-process rate file via PRISM_DOCTRINE_RATE_FILE so nothing
// else can touch it → deterministic regardless of fleet / parallel load.
const RATE_FILE = path.join(mkdtempSync(path.join(tmpdir(), "baudit-rate-")), "doctrine-seen.json");

let _n = 0;
function uniqueSid(tag) {
  // pid + monotonic counter → unique within and across concurrent runs, no
  // Date.now()/Math.random() needed for hermeticity.
  return `test-baudit-${tag}-${process.pid}-${_n++}`;
}

// Fire the hook with an arbitrary tool + a backend-file path. The backend-audit
// push gates on isBackendFile(filePath) (pure regex, no disk read), independent
// of tool — but "Edit" is the semantically-correct trigger ("after meaningful
// edits"). PRISM_ROUTE_SUGGEST_HONOR_MCP_DOWN=0 disables the daemon-down early
// exit so the message logic runs regardless of live MCP state.
function fireEdit(filePath, sessionId) {
  const stdin = JSON.stringify({
    tool_name: "Edit",
    tool_input: { file_path: filePath, old_string: "a", new_string: "b" },
    session_id: sessionId,
  });
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

// Fire a doctrine-file Read (consumes the __doctrine_session__ sentinel) — used
// to prove the backend-audit gate uses a DISTINCT sentinel.
function fireDoctrineRead(filePath, sessionId) {
  const stdin = JSON.stringify({
    tool_name: "Read",
    tool_input: { file_path: filePath },
    session_id: sessionId,
  });
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

const hasBackendAudit = (ctx) => /Backend audit:/.test(ctx);
const hasDoctrine = (ctx) => /Doctrine\/command surface/.test(ctx);

// Two distinct backend files (mcp-server/src/engines/*.ts → BACKEND_FILE_PATTERN_NARROW).
const FILE_A = "h:/prism/mcp-server/src/engines/_baudit_a.ts";
const FILE_B = "h:/prism/mcp-server/src/engines/_baudit_b.ts";
const DOCTRINE_FILE = "h:/prism/.claude/hooks/_baudit_doctrine.mjs";

test("backend-audit block fires on the FIRST backend-file edit of a fresh session", () => {
  const sid = uniqueSid("first");
  assert.equal(hasBackendAudit(fireEdit(FILE_A, sid)), true, "first backend edit must emit the audit nudge");
});

test("backend-audit block is GATED on a 2nd edit of a DIFFERENT backend file (same session)", () => {
  const sid = uniqueSid("gate");
  assert.equal(hasBackendAudit(fireEdit(FILE_A, sid)), true, "fire 1 emits (precondition)");
  // Different file, SAME session — pre-fix this re-fired the byte-identical block;
  // post-fix it is suppressed (per-session sentinel). This is the core of the fix.
  assert.equal(hasBackendAudit(fireEdit(FILE_B, sid)), false, "fire 2 (different file, same session) must be GATED");
});

test("a fresh session re-fires the backend-audit block (gate is per-session, not global)", () => {
  const sidA = uniqueSid("sessA");
  const sidB = uniqueSid("sessB");
  assert.equal(hasBackendAudit(fireEdit(FILE_A, sidA)), true, "session A emits");
  assert.equal(hasBackendAudit(fireEdit(FILE_A, sidB)), true, "session B (different session) also emits — not globally suppressed");
});

test("backend-audit and doctrine gates use DISTINCT sentinels (one does not consume the other)", () => {
  // R9 — verifies the INTENT: the two once-per-session nudges are independent.
  // A doctrine Read first → then a backend Edit in the SAME session must STILL
  // fire (a shared sentinel would have suppressed it). Then a 2nd backend Edit
  // is gated, and a 2nd doctrine Read is gated — each on its own key.
  const sid = uniqueSid("distinct");
  assert.equal(hasDoctrine(fireDoctrineRead(DOCTRINE_FILE, sid)), true, "doctrine fires first");
  assert.equal(hasBackendAudit(fireEdit(FILE_A, sid)), true, "backend audit STILL fires (distinct sentinel, not consumed by doctrine)");
  assert.equal(hasBackendAudit(fireEdit(FILE_B, sid)), false, "2nd backend edit gated on its own sentinel");
});
