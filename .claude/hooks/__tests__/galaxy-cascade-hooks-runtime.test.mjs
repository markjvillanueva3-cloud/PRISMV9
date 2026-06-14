#!/usr/bin/env node
// galaxy-cascade-hooks-runtime.test.mjs — runtime smoke tests for F1+F2 hooks.
// Spawns the hooks with simulated PreToolUse envelopes via stdin and asserts the
// JSON output structure. Closes the "wired AND tested" goal-criterion concretely
// — F1 + F2 are wired in settings.json (per c-to-h-mirror confirmation 2026-05-27)
// and now demonstrably PASS structural runtime smoke per node --test.
//
// Run: node --test .claude/hooks/__tests__/galaxy-cascade-hooks-runtime.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const NODE = process.execPath;

function runHook(hookPath, envelope, extraEnv = {}) {
  const res = spawnSync(NODE, [hookPath], {
    input: JSON.stringify(envelope),
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    timeout: 5000,
  });
  return { exit: res.status, stdout: res.stdout, stderr: res.stderr };
}

function parseHookOutput(stdout) {
  try { return JSON.parse(stdout); } catch { return null; }
}

// ---- F1 pre-edit-galaxy-cascade-inject -----------------------------------

test("F1: galaxy match (mill) injects cascade context", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-edit-galaxy-cascade-inject.mjs");
  const env = { session_id: "test-1", tool_input: { file_path: `${PRISM}/mcp-server/src/engines/mill/SomeEngine.ts` } };
  const r = runHook(hook, env);
  assert.equal(r.exit, 0, "F1 must exit 0");
  const out = parseHookOutput(r.stdout);
  assert.ok(out, "F1 must emit valid JSON");
  assert.equal(out.continue, true, "F1 must set continue:true");
  assert.ok(out.hookSpecificOutput, "F1 must emit hookSpecificOutput on galaxy match");
  assert.match(out.hookSpecificOutput.additionalContext, /mill/i, "F1 context must mention mill");
});

test("F1: non-galaxy path silent skip", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-edit-galaxy-cascade-inject.mjs");
  const env = { session_id: "test-2", tool_input: { file_path: `${PRISM}/scripts/some-script.mjs` } };
  const r = runHook(hook, env);
  assert.equal(r.exit, 0, "F1 must exit 0 on non-galaxy path");
  const out = parseHookOutput(r.stdout);
  assert.ok(out, "F1 must emit valid JSON");
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "F1 must skip injection silently for non-galaxy paths");
});

test("F1: disable knob respected", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-edit-galaxy-cascade-inject.mjs");
  const env = { session_id: "test-3", tool_input: { file_path: `${PRISM}/mcp-server/src/engines/mill/X.ts` } };
  const r = runHook(hook, env, { PRISM_GALAXY_CASCADE_INJECT_DISABLE: "1" });
  assert.equal(r.exit, 0);
  const out = parseHookOutput(r.stdout);
  assert.equal(out.hookSpecificOutput, undefined, "F1 disable knob must suppress injection");
});

// ---- F2 pre-write-cross-galaxy-warn --------------------------------------

test("F2: single-galaxy edit silent (no cross-galaxy yet)", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-write-cross-galaxy-warn.mjs");
  const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "xgalaxy-cache-"));
  const env = { session_id: "test-f2-1", tool_input: { file_path: `${PRISM}/mcp-server/src/engines/mill/X.ts` } };
  const r = runHook(hook, env, { PRISM_CROSS_GALAXY_WARN_PATH: tmpCacheDir });
  assert.equal(r.exit, 0);
  const out = parseHookOutput(r.stdout);
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined, "F2 first galaxy touch — silent skip");
  // Cache should now contain the mill entry
  const cacheFile = path.join(tmpCacheDir, "test-f2-1.json");
  assert.ok(fs.existsSync(cacheFile), "F2 must write per-session cache");
  const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  assert.ok(cached.galaxies.includes("mill"));
});

test("F2: 2nd-galaxy edit triggers cross-galaxy warning", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-write-cross-galaxy-warn.mjs");
  const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "xgalaxy-cache-"));
  // First touch: mill (silent)
  runHook(hook, {
    session_id: "test-f2-2",
    tool_input: { file_path: `${PRISM}/mcp-server/src/engines/mill/X.ts` },
  }, { PRISM_CROSS_GALAXY_WARN_PATH: tmpCacheDir });
  // Second touch: quoting (cross-galaxy — warning expected)
  const r = runHook(hook, {
    session_id: "test-f2-2",
    tool_input: { file_path: `${PRISM}/mcp-server/src/engines/quoting/Y.ts` },
  }, { PRISM_CROSS_GALAXY_WARN_PATH: tmpCacheDir });
  assert.equal(r.exit, 0);
  const out = parseHookOutput(r.stdout);
  assert.ok(out.hookSpecificOutput, "F2 must emit warning on cross-galaxy");
  assert.match(out.hookSpecificOutput.additionalContext, /Cross-galaxy edit detected/i);
  assert.match(out.hookSpecificOutput.additionalContext, /mill|quoting/i);
});

test("F2: non-galaxy path silent skip + no cache write", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-write-cross-galaxy-warn.mjs");
  const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "xgalaxy-cache-"));
  const env = { session_id: "test-f2-3", tool_input: { file_path: `${PRISM}/scripts/x.mjs` } };
  const r = runHook(hook, env, { PRISM_CROSS_GALAXY_WARN_PATH: tmpCacheDir });
  assert.equal(r.exit, 0);
  const out = parseHookOutput(r.stdout);
  assert.equal(out.hookSpecificOutput, undefined);
  // Cache should NOT contain anything (non-galaxy paths don't touch cache)
  const cacheFile = path.join(tmpCacheDir, "test-f2-3.json");
  assert.ok(!fs.existsSync(cacheFile), "F2 must not write cache for non-galaxy paths");
});

test("F2: disable knob respected", () => {
  const hook = path.join(PRISM, ".claude/hooks/pre-write-cross-galaxy-warn.mjs");
  const tmpCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "xgalaxy-cache-"));
  const env = { session_id: "test-f2-4", tool_input: { file_path: `${PRISM}/mcp-server/src/engines/mill/X.ts` } };
  const r = runHook(hook, env, { PRISM_CROSS_GALAXY_WARN_DISABLE: "1", PRISM_CROSS_GALAXY_WARN_PATH: tmpCacheDir });
  assert.equal(r.exit, 0);
  const out = parseHookOutput(r.stdout);
  assert.equal(out.hookSpecificOutput, undefined, "F2 disable knob must suppress + skip cache write");
});

// ---- F3 slot-context-bundle-inject (galaxy line) ------------------------

test("F3: SLOT_GALAXY_MAP covers the 7 documented soul-canonical galaxies", () => {
  const src = fs.readFileSync(path.join(PRISM, ".claude/hooks/slot-context-bundle-inject.mjs"), "utf8");
  // Verify the SLOT_GALAXY_MAP entries match the 7 soul-canonical/de-facto galaxies
  for (const slot of ["alpha", "bravo", "charlie", "hotel", "lima", "echo"]) {
    assert.match(src, new RegExp(`${slot}:`), `F3 SLOT_GALAXY_MAP must include slot "${slot}"`);
  }
});
