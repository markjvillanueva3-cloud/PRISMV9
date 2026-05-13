#!/usr/bin/env node
// tier: T0
// smoke-test.mjs — standalone test runner for the hook bundle library.
// Uses node:test (built-in) so it runs without vitest/project config.
// Invoke directly:  node H:/prism/.claude/hooks/bundles/smoke-test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHook, runBundle } from "./lib/hook-runner.mjs";

const tempDir = mkdtempSync(join(tmpdir(), "hook-runner-test-"));

const HOOK_OK = join(tempDir, "ok.mjs");
const HOOK_BLOCK = join(tempDir, "block.mjs");
const HOOK_ADVISE = join(tempDir, "advise.mjs");
const HOOK_TIMEOUT = join(tempDir, "timeout.mjs");
const HOOK_CRASH = join(tempDir, "crash.mjs");
const HOOK_CONTINUE_FALSE = join(tempDir, "continue-false.mjs");

writeFileSync(HOOK_OK, `process.stdout.write(JSON.stringify({continue:true}));process.exit(0);`);
writeFileSync(HOOK_BLOCK, `process.stdout.write(JSON.stringify({continue:false,hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"TEST_BLOCK"}}));process.exit(2);`);
writeFileSync(HOOK_ADVISE, `process.stdout.write(JSON.stringify({continue:true,hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:"TEST_ADVICE"}}));process.exit(0);`);
writeFileSync(HOOK_TIMEOUT, `setTimeout(()=>process.exit(0),10000);`);
writeFileSync(HOOK_CRASH, `throw new Error("CRASH");`);
writeFileSync(HOOK_CONTINUE_FALSE, `process.stdout.write(JSON.stringify({continue:false,stopReason:"TEST_STOP"}));process.exit(0);`);

process.on("exit", () => {
  try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

test("runHook captures stdout JSON from successful hook", async () => {
  const result = await runHook(HOOK_OK, "{}", 2000);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.parsed, { continue: true });
  assert.equal(result.timedOut, false);
});

test("runHook captures block decision from blocking hook", async () => {
  const result = await runHook(HOOK_BLOCK, "{}", 2000);
  assert.equal(result.exitCode, 2);
  assert.equal(result.parsed.continue, false);
  assert.equal(result.parsed.hookSpecificOutput.permissionDecision, "deny");
  assert.equal(result.parsed.hookSpecificOutput.permissionDecisionReason, "TEST_BLOCK");
});

test("runHook kills hook that exceeds timeout", async () => {
  const result = await runHook(HOOK_TIMEOUT, "{}", 500);
  assert.equal(result.timedOut, true);
  assert.ok(result.elapsed < 2000, `elapsed ${result.elapsed} should be < 2000`);
  assert.ok(result.elapsed >= 500, `elapsed ${result.elapsed} should be >= 500`);
});

test("runHook survives hook crash without throwing", async () => {
  const result = await runHook(HOOK_CRASH, "{}", 2000);
  assert.notEqual(result.exitCode, 0);
  assert.ok(result.stderr.includes("CRASH"), `stderr should contain CRASH, got: ${result.stderr}`);
});

test("runBundle returns continue=true when all hooks pass", async () => {
  const result = await runBundle([
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
  ], "{}");
  assert.equal(result.continue, true);
});

test("runBundle blocks when any hook denies", async () => {
  const result = await runBundle([
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_BLOCK, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
  ], "{}");
  assert.equal(result.continue, false);
  assert.ok(result.stopReason.includes("TEST_BLOCK"), `stopReason: ${result.stopReason}`);
  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.ok(result.hookSpecificOutput.permissionDecisionReason.includes("TEST_BLOCK"));
});

test("runBundle aggregates additionalContext from advisory hooks", async () => {
  const result = await runBundle([
    { path: HOOK_ADVISE, timeout: 2000 },
    { path: HOOK_ADVISE, timeout: 2000 },
  ], "{}");
  assert.equal(result.continue, true);
  const ctx = result.hookSpecificOutput.additionalContext;
  assert.ok(ctx.includes("TEST_ADVICE"));
  const occurrences = (ctx.match(/TEST_ADVICE/g) || []).length;
  assert.equal(occurrences, 2);
});

test("runBundle runs hooks in parallel — total time near max(individual)", async () => {
  const start = Date.now();
  const result = await runBundle([
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
  ], "{}");
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 2500, `parallel 4-hook bundle took ${elapsed}ms — should be <2500`);
  assert.equal(result.continue, true);
});

test("runBundle handles empty hook list gracefully", async () => {
  const result = await runBundle([], "{}");
  assert.equal(result.continue, true);
});

test("runBundle survives crashing hook without blocking", async () => {
  const result = await runBundle([
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_CRASH, timeout: 2000 },
    { path: HOOK_OK, timeout: 2000 },
  ], "{}");
  assert.equal(result.continue, true);
});

test("runBundle survives timing-out hook without blocking", async () => {
  const result = await runBundle([
    { path: HOOK_OK, timeout: 2000 },
    { path: HOOK_TIMEOUT, timeout: 300 },
  ], "{}");
  assert.equal(result.continue, true);
});

test("runBundle propagates block from continue=false even without permissionDecision", async () => {
  const result = await runBundle([
    { path: HOOK_CONTINUE_FALSE, timeout: 2000 },
  ], "{}");
  assert.equal(result.continue, false);
  assert.equal(result.stopReason, "TEST_STOP");
});
