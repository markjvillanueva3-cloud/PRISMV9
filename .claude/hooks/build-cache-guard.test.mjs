#!/usr/bin/env node
// tier: T1
/**
 * build-cache-guard.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH01.
 *
 * Pure-function coverage + subprocess integration oracles. The subprocess
 * oracles are load-bearing: a pure-function suite never proves the wired
 * `main()` path — the deny / capture / invalidate / never-deny-a-FAIL
 * round-trips must be exercised end-to-end. Several oracles are fail-on-
 * revert guards (would FAIL if the safety logic were reverted).
 *
 * Run: node --test H:/prism/.claude/hooks/build-cache-guard.test.mjs
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  ttlMs,
  normalizeCmd,
  hasUnsafeShell,
  isBuildCmd,
  cacheKey,
  decideBuildCheck,
  summarizeBuildOutput,
  fmtAge,
} from "./build-cache-guard.mjs";

const HOOK = path.join(process.cwd(), ".claude/hooks/build-cache-guard.mjs");
// Hermetic per-process cache dir — no contention with the live wired hook or a
// concurrently-running sibling suite (closes the node --test multi-file flake).
const CACHE_DIR = path.join(os.tmpdir(), `bcg-test-${process.pid}-${Date.now()}`);
after(() => {
  try {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* ok */
  }
});

function runHook(fixture, env = {}) {
  return execFileSync(process.execPath, [HOOK], {
    input: JSON.stringify(fixture),
    encoding: "utf-8",
    env: { ...process.env, PRISM_BUILD_CACHE_DIR: CACHE_DIR, ...env },
  });
}
function cleanup(sid8) {
  try {
    fs.unlinkSync(path.join(CACHE_DIR, `${sid8}.json`));
  } catch {
    /* ok */
  }
}

// ---- ttlMs --------------------------------------------------------------
test("ttlMs: default is 5 min", () => {
  assert.equal(ttlMs({}), 300000);
});
test("ttlMs: honors a valid override", () => {
  assert.equal(ttlMs({ PRISM_BUILD_CACHE_TTL_MS: "60000" }), 60000);
});
test("ttlMs: rejects NaN / zero / negative → default", () => {
  assert.equal(ttlMs({ PRISM_BUILD_CACHE_TTL_MS: "abc" }), 300000);
  assert.equal(ttlMs({ PRISM_BUILD_CACHE_TTL_MS: "0" }), 300000);
  assert.equal(ttlMs({ PRISM_BUILD_CACHE_TTL_MS: "-5" }), 300000);
});

// ---- normalizeCmd -------------------------------------------------------
test("normalizeCmd: plain command unchanged", () => {
  assert.deepEqual(normalizeCmd("npm run build"), { cmd: "npm run build", cwd: "" });
});
test("normalizeCmd: strips `cd <dir> &&` prefix and captures cwd", () => {
  assert.deepEqual(normalizeCmd("cd mcp-server && npm run build"), {
    cmd: "npm run build",
    cwd: "mcp-server",
  });
});
test("normalizeCmd: strips leading `rtk ` and collapses whitespace", () => {
  assert.deepEqual(normalizeCmd("cd mcp-server &&  rtk   npm   run  build"), {
    cmd: "npm run build",
    cwd: "mcp-server",
  });
});
test("normalizeCmd: empty / null safe", () => {
  assert.deepEqual(normalizeCmd(""), { cmd: "", cwd: "" });
  assert.deepEqual(normalizeCmd(null), { cmd: "", cwd: "" });
});

// ---- hasUnsafeShell -----------------------------------------------------
test("hasUnsafeShell: detects compound / piped / substituted commands", () => {
  for (const c of [
    "echo hi && npm run build",
    "npm run build || true",
    "npm run build; ls",
    "npm run build | tail",
    "npm run build & ",
    "npm run build&ls", // no surrounding whitespace — must still be caught
    "npm run build&", // trailing & with no space
    "npm run build $(date)",
    "npm run build `date`",
  ]) {
    assert.equal(hasUnsafeShell(c), true, `expected unsafe: ${c}`);
  }
});
test("hasUnsafeShell: clean build commands are safe", () => {
  for (const c of ["npm run build", "npm run build:fast", "npx vitest run src/x.test.ts", "tsc -p ."]) {
    assert.equal(hasUnsafeShell(c), false, `expected safe: ${c}`);
  }
});

// ---- fmtAge -------------------------------------------------------------
test("fmtAge: never renders '0m' — sub-90s ages show in seconds, floored at 1s", () => {
  assert.equal(fmtAge(0), "1s");
  assert.equal(fmtAge(30000), "30s");
  assert.equal(fmtAge(89000), "89s");
  assert.equal(fmtAge(200000), "3m");
});

// ---- isBuildCmd ---------------------------------------------------------
test("isBuildCmd: positive — build/test invocations", () => {
  for (const c of [
    "npm run build",
    "npm run build:fast",
    "npm run build:incremental",
    "npm test",
    "npm run test",
    "npx vitest run",
    "vitest run src/x.test.ts",
    "npx tsc --noEmit",
    "tsc -p .",
    "tsc",
  ]) {
    assert.equal(isBuildCmd(c), true, `expected build: ${c}`);
  }
});
test("isBuildCmd: negative — non-build commands", () => {
  for (const c of ["git status", "ls -la", "cat tsconfig.json", "node script.mjs", "latsc x"]) {
    assert.equal(isBuildCmd(c), false, `expected non-build: ${c}`);
  }
});
test("isBuildCmd: bare-tsc rule is anchored — `grep tsc file` does NOT match", () => {
  assert.equal(isBuildCmd("grep tsc file.txt"), false);
  assert.equal(isBuildCmd("echo tsc"), false);
  assert.equal(isBuildCmd("cat tsconfig.json"), false);
});

// ---- cacheKey -----------------------------------------------------------
test("cacheKey: deterministic for same input", () => {
  assert.equal(cacheKey("npm run build", "mcp-server"), cacheKey("npm run build", "mcp-server"));
});
test("cacheKey: cwd-sensitive", () => {
  assert.notEqual(cacheKey("npm run build", "mcp-server"), cacheKey("npm run build", "web"));
});

// ---- decideBuildCheck ---------------------------------------------------
const NOW = 1_000_000_000;
test("decideBuildCheck: no entry → pass", () => {
  assert.equal(decideBuildCheck({ entry: undefined, ttl: 300000, now: NOW }).action, "pass");
});
test("decideBuildCheck: expired entry → pass", () => {
  const r = decideBuildCheck({ entry: { ts: NOW - 400000, ok: true }, ttl: 300000, now: NOW });
  assert.equal(r.action, "pass");
  assert.equal(r.reason, "expired");
});
test("decideBuildCheck: source edited at-or-after the build → pass (>= closes same-ms hole)", () => {
  const sameMs = decideBuildCheck({
    entry: { ts: NOW, ok: true },
    editTs: NOW,
    ttl: 300000,
    now: NOW,
  });
  assert.equal(sameMs.reason, "edited-since", "editTs === entry.ts must invalidate");
  const after = decideBuildCheck({
    entry: { ts: NOW - 1000, ok: true },
    editTs: NOW - 500,
    ttl: 300000,
    now: NOW,
  });
  assert.equal(after.reason, "edited-since");
});
test("decideBuildCheck: deny mark on the key → pass (count-based deny-loop escape)", () => {
  const r = decideBuildCheck({
    entry: { ts: NOW - 1000, ok: true },
    denyMark: NOW - 240000, // older than the old 3-min window — still escapes
    ttl: 300000,
    now: NOW,
  });
  assert.equal(r.action, "pass");
  assert.equal(r.reason, "deny-loop-escape");
});
test("decideBuildCheck: cached FAIL is NEVER denied (safety invariant)", () => {
  const fail = decideBuildCheck({ entry: { ts: NOW - 1000, ok: false }, ttl: 300000, now: NOW });
  assert.equal(fail.action, "pass");
  assert.equal(fail.reason, "not-confirmed-pass");
  const unknown = decideBuildCheck({ entry: { ts: NOW - 1000, ok: null }, ttl: 300000, now: NOW });
  assert.equal(unknown.action, "pass", "an ambiguous result must never masquerade as PASS");
});
test("decideBuildCheck: fresh confirmed PASS, no edit, no deny mark → deny", () => {
  const r = decideBuildCheck({
    entry: { ts: NOW - 1000, ok: true },
    editTs: NOW - 5000,
    ttl: 300000,
    now: NOW,
  });
  assert.equal(r.action, "deny");
  assert.equal(r.entry.ok, true);
});

// ---- summarizeBuildOutput ----------------------------------------------
test("summarizeBuildOutput: explicit success signal → ok=true", () => {
  assert.equal(summarizeBuildOutput("Build complete in 3.2s\nesbuild ok\n").ok, true);
  assert.equal(summarizeBuildOutput({ out: "noise", exitCode: 0 }).ok, true);
});
test("summarizeBuildOutput: counts TS errors and marks not-ok", () => {
  const r = summarizeBuildOutput("src/a.ts(1,2): error TS2304: x\nsrc/b.ts(3,4): error TS2345: y\n");
  assert.equal(r.errorCount, 2);
  assert.equal(r.ok, false);
});
test("summarizeBuildOutput: P0 — non-zero exit with clean stdout → ok=false (NOT a false PASS)", () => {
  assert.equal(summarizeBuildOutput({ out: "Build complete\n", exitCode: 1 }).ok, false);
  assert.equal(summarizeBuildOutput({ out: "", isError: true }).ok, false);
});
test("summarizeBuildOutput: npm/esbuild failure strings → ok=false", () => {
  assert.equal(summarizeBuildOutput("npm ERR! code ELIFECYCLE\n").ok, false);
  assert.equal(summarizeBuildOutput("[ERROR] could not resolve\n").ok, false);
  assert.equal(summarizeBuildOutput("RUN v1\n FAIL  src/x.test.ts\n 1 failed\n").ok, false);
});
test("summarizeBuildOutput: genuinely ambiguous output → ok=null (never PASS)", () => {
  assert.equal(summarizeBuildOutput("some neutral log line\n").ok, null);
  assert.equal(summarizeBuildOutput("").ok, null);
});
test("summarizeBuildOutput: long output → faithful head+tail digest", () => {
  const big = "HEAD" + "x".repeat(5000) + "TAILMARK";
  const r = summarizeBuildOutput(big);
  assert.ok(r.digest.startsWith("HEAD"));
  assert.ok(r.digest.includes("TAILMARK"));
  assert.ok(r.digest.includes("omitted"));
  assert.ok(r.digest.length < big.length);
});

// ---- subprocess integration oracles ------------------------------------
test("oracle: PASSING build capture → PreToolUse deny (full round-trip)", () => {
  const sid = "BCGT01AA";
  cleanup(sid);
  try {
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
      tool_response: { output: "Build complete\nesbuild ok\n", exit_code: 0 },
    });
    const out = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
    });
    const parsed = JSON.parse(out);
    assert.equal(parsed.hookSpecificOutput.permissionDecision, "deny");
    assert.ok(/PASSED/.test(parsed.hookSpecificOutput.permissionDecisionReason));
  } finally {
    cleanup(sid);
  }
});

test("oracle: FAILING build is NEVER denied (exit-code fail-on-revert guard)", () => {
  const sid = "BCGT02BB";
  cleanup(sid);
  try {
    // Clean, success-LOOKING stdout — only the non-zero exit code signals
    // failure. If the exit-code check regressed, `ok` would become true,
    // the build would be denied, and `continue===true` below would fail.
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
      tool_response: { output: "Build complete\nesbuild done\n", exit_code: 1 },
    });
    const out = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
    });
    assert.equal(JSON.parse(out).continue, true, "a cached FAIL must always re-run");
    assert.ok(!out.includes("deny"));
  } finally {
    cleanup(sid);
  }
});

test("oracle: compound `cmd && npm run build` is NEVER denied (skipping cmd would be a bug)", () => {
  const sid = "BCGT03CC";
  cleanup(sid);
  try {
    // capture attempt — must be ignored (ineligible), no cache file written
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "echo hi && npm run build" },
      tool_response: { output: "Build complete\n", exit_code: 0 },
    });
    const out = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "echo hi && npm run build" },
    });
    assert.equal(JSON.parse(out).continue, true);
    assert.ok(!out.includes("deny"));
  } finally {
    cleanup(sid);
  }
});

test("oracle: PreToolUse on a non-build command → pass-through", () => {
  const out = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    session_id: "BCGT04DD",
    tool_input: { command: "git status" },
  });
  assert.equal(JSON.parse(out).continue, true);
});

test("oracle: disable knob forces pass-through even on a cache hit", () => {
  const sid = "BCGT05EE";
  cleanup(sid);
  try {
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
      tool_response: { output: "Build complete\n", exit_code: 0 },
    });
    const out = runHook(
      {
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        session_id: sid,
        tool_input: { command: "npm run build" },
      },
      { PRISM_BUILD_CACHE_GUARD_DISABLE: "1" },
    );
    assert.equal(JSON.parse(out).continue, true);
    assert.ok(!out.includes("deny"));
  } finally {
    cleanup(sid);
  }
});

test("oracle: a source Edit invalidates the cached build", () => {
  const sid = "BCGT06FF";
  cleanup(sid);
  try {
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
      tool_response: { output: "Build complete\n", exit_code: 0 },
    });
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Edit",
      session_id: sid,
      tool_input: { file_path: "src/x.ts" },
    });
    const out = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npm run build" },
    });
    assert.equal(JSON.parse(out).continue, true, "edited-since must pass through, not deny");
    assert.ok(!out.includes("deny"));
  } finally {
    cleanup(sid);
  }
});

test("oracle: deny-loop escape — the check right after a deny always passes", () => {
  const sid = "BCGT07GG";
  cleanup(sid);
  try {
    runHook({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npx vitest run" },
      tool_response: { output: "Test Files  3 passed\n", exit_code: 0 },
    });
    const first = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npx vitest run" },
    });
    assert.equal(JSON.parse(first).hookSpecificOutput.permissionDecision, "deny");
    const second = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      session_id: sid,
      tool_input: { command: "npx vitest run" },
    });
    assert.equal(JSON.parse(second).continue, true, "the deny-loop escape must always honor its promise");
  } finally {
    cleanup(sid);
  }
});
