#!/usr/bin/env node
/**
 * Regression test for file-claim-guard.mjs namespace fix (2026-04-27).
 *
 * Bug: claims written with sessionId=claude-XXXXXXXX (truncated UUID from
 * stable-session-id.mjs) were invisible to lookups using agentInstance=
 * Agent@MARKV/pid-XXXXX (full instance from agent-coordination.mjs).
 *
 * Fix: claim now stores BOTH sessionId AND agentInstance fields. Lookup
 * checks either match. Backward compatible — old claims without
 * agentInstance fall back to sessionId comparison.
 *
 * Run: node .claude/hooks/__tests__/file-claim-namespace.test.mjs
 * Exits 0 on pass, 1 on fail. Reports via process.stdout.write.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const HOOK_TIMEOUT_MS = 5000;
const TMP_CLAIMS = path.join(process.cwd(), ".claude/cache/test-claims-namespace");
const HOOK = path.join(process.cwd(), ".claude/hooks/file-claim-guard.mjs");
const out = (msg) => process.stdout.write(msg + "\n");

let passCount = 0;
let failCount = 0;
function assert(cond, msg) {
  if (cond) {
    out("  PASS: " + msg);
    passCount += 1;
  } else {
    process.stderr.write("  FAIL: " + msg + "\n");
    failCount += 1;
  }
}

function runHook(payload) {
  const r = spawnSync(
    process.execPath,
    [HOOK],
    {
      input: JSON.stringify(payload),
      encoding: "utf-8",
      env: { ...process.env, CHAT_BUS_ROOT_OVERRIDE: TMP_CLAIMS },
      timeout: HOOK_TIMEOUT_MS,
    }
  );
  return { stdout: r.stdout || "", stderr: r.stderr || "", status: r.status };
}

if (fs.existsSync(TMP_CLAIMS)) fs.rmSync(TMP_CLAIMS, { recursive: true, force: true });
fs.mkdirSync(TMP_CLAIMS, { recursive: true });

out("Test: file-claim-guard.mjs namespace fix");

const t1 = runHook({
  tool_name: "Edit",
  tool_input: { file_path: "h:/test/sample-1.ts" },
  session_id: "test-namespace-001",
  agent_instance: "Agent@TEST/pid-11111",
});
assert(t1.status === 0 || t1.status === 2, "Hook runs without crash (status 0 or 2)");

const t2 = runHook({
  tool_name: "Edit",
  tool_input: { file_path: "h:/test/sample-2.ts" },
  session_id: "test-namespace-002",
  agent_instance: "Agent@TEST/pid-22222",
});
let t2out;
try { t2out = JSON.parse(t2.stdout.trim()); } catch { t2out = {}; }
assert(t2out.continue === true, "First claim by new agentInstance succeeds (continue=true)");

const t3 = runHook({
  tool_name: "Edit",
  tool_input: { file_path: "h:/test/sample-2.ts" },
  session_id: "test-namespace-003",
  agent_instance: "Agent@TEST/pid-22222",
});
let t3out;
try { t3out = JSON.parse(t3.stdout.trim()); } catch { t3out = {}; }
assert(t3out.continue === true && !t3out.decision, "Same agentInstance + different sessionId is treated as own claim (NO BLOCK)");

const src = fs.readFileSync(HOOK, "utf-8");
const claimBlock = src.match(/const claim = \{[\s\S]*?\};/);
assert(claimBlock && claimBlock[0].includes('schemaVersion: "1.1.0"'), "Claim object schemaVersion bumped to 1.1.0");
assert(claimBlock && claimBlock[0].includes("agentInstance"), "Claim object includes agentInstance field");

const auditBlock = src.match(/function postAuditMessage[\s\S]*?\n\}/);
assert(auditBlock && !auditBlock[0].includes("agentInstance:"), "postAuditMessage block stays clean (no agentInstance leak)");

if (fs.existsSync(TMP_CLAIMS)) fs.rmSync(TMP_CLAIMS, { recursive: true, force: true });

out("");
out("Results: " + passCount + " passed, " + failCount + " failed");
process.exit(failCount === 0 ? 0 : 1);
