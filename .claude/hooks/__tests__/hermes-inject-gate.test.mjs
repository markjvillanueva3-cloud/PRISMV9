// tier: T4
/**
 * Regression test for the hermes-prism-inject / pretool-bundle agent-spawn gate
 * (2026-07-04 KIENZLE-ALGO/U-HERMES-INJECT-GATE-FIX).
 *
 * BUG (fleet-wide): a syntax error in hermes-prism-inject.mjs:40 (`modelMatch[modelMatch[1]`)
 * crashed the module at parse time. pretool-bundle.mjs then read the crashed/missing `continue`
 * as a BLOCK (`if (!r2.parsed?.continue ...)`), hard-blocking EVERY Agent/Task/Skill spawn for
 * all 26 slots -- surfacing as "PreToolUse:Agent hook error: No stderr output".
 *
 * THREE fixes, each pinned by a test below:
 *  1. Syntax error fixed  -> hermes-prism-inject.mjs parses + exits 0 for an Agent payload.
 *  2. Fail-OPEN guard      -> pretool-bundle only blocks on EXPLICIT continue:false / decision:"deny";
 *                            a normal advisory inject (no `continue` field) must NOT block.
 *  3. additionalContext path-> bundle reads hookSpecificOutput.additionalContext (the hook nests it),
 *                            so the routing context actually reaches the agent.
 *
 * Runs each hook as a child process with stdin JSON and parses stdout JSON.
 */

import { spawn } from "node:child_process";
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERMES = path.resolve(__dirname, "..", "hermes-prism-inject.mjs");
const BUNDLE = path.resolve(__dirname, "..", "bundles", "pretool-bundle.mjs");

let passed = 0;
let failed = 0;

function runHook(hookPath, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hookPath], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      let parsed = null;
      try { parsed = stdout.trim() ? JSON.parse(stdout.trim()) : null; } catch { /* leave null */ }
      resolve({ code, stdout, stderr, parsed });
    });
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

function test(name, fn) {
  return fn()
    .then(() => { console.log(`  ✓ ${name}`); passed++; })
    .catch((err) => { console.error(`  ✗ ${name}\n    ${err.message}`); failed++; });
}

const agentPayload = {
  hook_event_name: "PreToolUse",
  tool_name: "Agent",
  tool_input: { subagent_type: "reviewer", description: "scrutinize P0-2", prompt: "review" },
  session_id: "test-hermes-gate",
};
const taskPayload = { ...agentPayload, tool_name: "Task" };
const skillPayload = { ...agentPayload, tool_name: "Skill", tool_input: { name: "dedup" } };
const readPayload = { ...agentPayload, tool_name: "Read", tool_input: { file_path: "x.md" } };

async function main() {
  // --- Fix #1: hermes-prism-inject.mjs no longer crashes at parse time -----------------------
  await test("hermes-prism-inject exits 0 for an Agent payload (no syntax crash)", async () => {
    const r = await runHook(HERMES, agentPayload);
    assert.equal(r.code, 0, `exit code should be 0, got ${r.code} (stderr=${r.stderr.slice(0, 200)})`);
    assert.ok(r.parsed, "stdout must be valid JSON");
  });

  await test("hermes-prism-inject emits routing context under hookSpecificOutput.additionalContext", async () => {
    const r = await runHook(HERMES, agentPayload);
    const ctx = r.parsed?.hookSpecificOutput?.additionalContext;
    assert.ok(typeof ctx === "string" && ctx.includes("PRISM-HERMES ROUTING"),
      `expected routing injection, got ${JSON.stringify(r.parsed).slice(0, 200)}`);
  });

  await test("hermes-prism-inject is ADVISORY: never emits continue:false / decision:deny", async () => {
    const r = await runHook(HERMES, agentPayload);
    assert.notEqual(r.parsed?.continue, false, "advisory injector must not set continue:false");
    assert.notEqual(r.parsed?.decision, "deny", "advisory injector must not deny");
  });

  await test("hermes-prism-inject emits {} for a non-agent/task tool (no injection, no block)", async () => {
    const r = await runHook(HERMES, readPayload);
    assert.equal(r.code, 0);
    assert.notEqual(r.parsed?.continue, false);
    // Read is not Agent/Task -> the hook returns an empty object (no routing injection).
    assert.ok(!r.parsed?.hookSpecificOutput, "Read should not get a routing injection");
  });

  // --- Fix #2: pretool-bundle FAILS OPEN -- the injector no longer blocks agent spawns --------
  await test("pretool-bundle returns continue:true for an Agent spawn (fleet-wide unblock)", async () => {
    const r = await runHook(BUNDLE, agentPayload);
    assert.equal(r.parsed?.continue, true,
      `Agent must not be blocked, got ${JSON.stringify(r.parsed).slice(0, 200)}`);
  });

  await test("pretool-bundle returns continue:true for a Task spawn", async () => {
    const r = await runHook(BUNDLE, taskPayload);
    assert.equal(r.parsed?.continue, true, `Task must not be blocked, got ${JSON.stringify(r.parsed).slice(0, 200)}`);
  });

  await test("pretool-bundle returns continue:true for a Skill spawn", async () => {
    const r = await runHook(BUNDLE, skillPayload);
    assert.equal(r.parsed?.continue, true, `Skill must not be blocked, got ${JSON.stringify(r.parsed).slice(0, 200)}`);
  });

  // --- Fix #3: the routing context actually reaches the agent via the bundle ------------------
  // Correct wiring (read hookSpecificOutput.additionalContext, not the top-level) forwards the
  // injection whenever the sub-hook completes; under heavy fleet load the sub-hook may exceed its
  // 3s timeout and fail OPEN (empty context, still continue:true). A BROKEN path (the pre-fix bug)
  // returns empty EVERY time -- so "forwards at least once across N tries, never blocks" cleanly
  // distinguishes correct-wiring-with-occasional-timeout from broken-wiring.
  await test("pretool-bundle forwards the routing injection into additionalContext for Agent", async () => {
    let forwarded = false;
    for (let i = 0; i < 5 && !forwarded; i++) {
      const r = await runHook(BUNDLE, agentPayload);
      assert.equal(r.parsed?.continue, true, "must never block while probing forwarding");
      if ((r.parsed?.hookSpecificOutput?.additionalContext || "").includes("PRISM-HERMES ROUTING")) forwarded = true;
    }
    assert.ok(forwarded, "routing context must reach the agent on at least one of 5 tries (broken path never forwards)");
  });

  console.log(`\nhermes-inject-gate: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
