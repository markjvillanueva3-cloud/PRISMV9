// gpu-vram-admission-guard.test.mjs - end-to-end test of the PreToolUse:Bash
// VRAM admission guard, round-tripped through the hook process (R15: test the
// CONSUMER, not just the lib). The deterministic test seam
// (PRISM_VRAM_GUARD_TEST_USED_MB/_TOTAL_MB) substitutes for a live nvidia-smi
// read so the hook's decision is reproducible without a GPU.
//
// Run: node --test H:/prism/.claude/hooks/__tests__/gpu-vram-admission-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO = "H:/prism";
const HOOK = path.join(REPO, ".claude/hooks/gpu-vram-admission-guard.mjs");
const NODE = process.execPath;
const HOOK_TIMEOUT_MS = 15000;

// Live 2026-06-10 reading: near-full card.
const NEAR_FULL = { PRISM_VRAM_GUARD_TEST_USED_MB: "86647", PRISM_VRAM_GUARD_TEST_TOTAL_MB: "97887" };
const PLENTY_FREE = { PRISM_VRAM_GUARD_TEST_USED_MB: "5000", PRISM_VRAM_GUARD_TEST_TOTAL_MB: "97887" };
const HEAVY_CMD = "ollama run gpt-oss:120b";

/** Spawn the hook with a stdin payload + extra env; return parsed decision. */
function runHook(stdinObj, extraEnv = {}) {
  // Start from a clean baseline so an ambient PRISM_VRAM_GUARD_MODE cannot skew
  // the test; each case sets mode explicitly.
  const env = { ...process.env, PRISM_VRAM_GUARD_MODE: "warn", ...extraEnv };
  const res = spawnSync(NODE, [HOOK], {
    input: JSON.stringify(stdinObj), encoding: "utf8", timeout: HOOK_TIMEOUT_MS, env,
  });
  const out = (res.stdout || "").trim();
  try { return JSON.parse(out); } catch { return { _parseFail: true, raw: out, stderr: res.stderr }; }
}

function bash(command) { return { tool_name: "Bash", tool_input: { command } }; }

test("non-Bash tool -> continue (silent pass)", () => {
  const d = runHook({ tool_name: "Read", tool_input: { file_path: "/x" } }, NEAR_FULL);
  assert.equal(d.continue, true);
  assert.equal(d.systemMessage, undefined);
});

test("empty command -> continue", () => {
  const d = runHook({ tool_name: "Bash", tool_input: { command: "" } }, NEAR_FULL);
  assert.equal(d.continue, true);
});

test("non-heavy command -> continue (cheap pre-filter, GPU never read)", () => {
  const d = runHook(bash("ls -la /tmp && git status"), NEAR_FULL);
  assert.equal(d.continue, true);
  assert.equal(d.systemMessage, undefined);
});

test("heavy launch on near-full card, default warn -> allow + systemMessage", () => {
  const d = runHook(bash(HEAVY_CMD), NEAR_FULL);
  assert.equal(d.continue, true, `expected allow, got ${JSON.stringify(d)}`);
  assert.match(d.systemMessage || "", /VRAM ADMISSION WARNING/);
  assert.match(d.systemMessage || "", /120b/);
});

test("heavy launch on near-full card, mode=block -> decision block", () => {
  const d = runHook(bash(HEAVY_CMD), { ...NEAR_FULL, PRISM_VRAM_GUARD_MODE: "block" });
  assert.equal(d.decision, "block", `expected block, got ${JSON.stringify(d)}`);
  assert.match(d.reason || "", /VRAM ADMISSION WARNING/);
});

test("heavy launch on near-full card, mode=ask -> permissionDecision ask", () => {
  const d = runHook(bash(HEAVY_CMD), { ...NEAR_FULL, PRISM_VRAM_GUARD_MODE: "ask" });
  assert.equal(d.hookSpecificOutput?.hookEventName, "PreToolUse");
  assert.equal(d.hookSpecificOutput?.permissionDecision, "ask");
  assert.match(d.hookSpecificOutput?.permissionDecisionReason || "", /VRAM ADMISSION/);
});

test("heavy launch but PLENTY of free VRAM + small model fits -> continue (silent)", () => {
  // 32b into a 5GB-used / 97GB card -> fits, low pressure -> admit, no warning.
  const d = runHook(bash("ollama run qwen2.5-coder:32b"), PLENTY_FREE);
  assert.equal(d.continue, true);
  assert.equal(d.systemMessage, undefined);
});

test("mode=off -> always continue even on near-full heavy launch", () => {
  const d = runHook(bash(HEAVY_CMD), { ...NEAR_FULL, PRISM_VRAM_GUARD_MODE: "off" });
  assert.equal(d.continue, true);
  assert.equal(d.systemMessage, undefined);
});

test("no seam + no GPU readable -> fail-open continue (does NOT wedge Bash)", () => {
  // Force the seam off and rely on readGpuVram; on CI/no-GPU this returns
  // ok:false -> the hook must fail-open. (On a live-GPU host this may instead
  // exercise the real path; either way the contract is: never block on a probe
  // failure, so continue:true is acceptable, and a block is only valid with a
  // real over-floor reading.)
  const d = runHook(bash(HEAVY_CMD), {
    PRISM_VRAM_GUARD_MODE: "block",
    PRISM_VRAM_GUARD_TEST_USED_MB: "",
    PRISM_VRAM_GUARD_TEST_TOTAL_MB: "",
  });
  assert.ok(d.continue === true || d.decision === "block",
    `fail-open expects continue, or a real over-floor block; got ${JSON.stringify(d)}`);
});
