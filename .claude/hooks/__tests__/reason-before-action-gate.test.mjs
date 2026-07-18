/**
 * Tests for reason-before-action-gate.mjs (the PreToolUse RBA gate).
 *
 * Hermetic: the engine + ollama-probe side channels are injected, so no test spawns
 * a real model or reads real stdin. Run: `node .claude/hooks/__tests__/reason-before-action-gate.test.mjs`
 * (node:test auto-runs on exit; `node --test` reports 0 in this env -- see india regression).
 *
 * Verifies the fleet-safety invariants: DEFAULT-OFF, KILL overrides all, ADVISORY-vs-ENFORCE
 * two-key + allowlist governance, FAIL-OPEN (unparseable / not-loadable / throw / cap-breach /
 * ollama-down), NO-RECURSION (sentinel + depth, set during consult + restored after), the
 * gated-tool scope, and the legacy-stdin fallback (no fail-deaf).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decide,
  isGatedTool,
  governanceAllows,
  isKilled,
  isEnabled,
  headOf,
} from "../reason-before-action-gate.mjs";

// --- helpers ---------------------------------------------------------------
const stdinFor = (tool_name, tool_input = {}) => JSON.stringify({ tool_name, tool_input });
function mockEngine(verdict, { score = 0.9, rationale = "test rationale" } = {}) {
  return { plan: async () => ({ verdict, agreementScore: score, rationale, path: "fast-path" }) };
}
const alive = async () => true;
const dead = async () => false;
function recordingLoader(engine) {
  const state = { called: false };
  return { state, loader: async () => { state.called = true; return engine; } };
}
function tmpAllowlist(obj) {
  const dir = mkdtempSync(join(tmpdir(), "rba-allow-"));
  const f = join(dir, "allow.json");
  writeFileSync(f, JSON.stringify(obj));
  return f;
}

// ===========================================================================
// isGatedTool
// ===========================================================================
test("isGatedTool: editors are gated", () => {
  assert.equal(isGatedTool("Write", { file_path: "x.ts" }), true);
  assert.equal(isGatedTool("Edit", { file_path: "x.ts" }), true);
  assert.equal(isGatedTool("MultiEdit", {}), true);
});
test("isGatedTool: reads + searches are NOT gated", () => {
  assert.equal(isGatedTool("Read", { file_path: "x" }), false);
  assert.equal(isGatedTool("Grep", { pattern: "x" }), false);
  assert.equal(isGatedTool("Glob", {}), false);
});
test("isGatedTool: destructive Bash is gated, lifeblood Bash is not", () => {
  assert.equal(isGatedTool("Bash", { command: "rm -rf ./build" }), true);
  assert.equal(isGatedTool("Bash", { command: "git push --force origin main" }), true);
  assert.equal(isGatedTool("Bash", { command: "git commit -m x" }), false);
  assert.equal(isGatedTool("Bash", { command: "git status" }), false);
  assert.equal(isGatedTool("Bash", { command: "ls -la" }), false);
  // a destructive flag on a git op IS gated (--no-verify bypasses hooks)
  assert.equal(isGatedTool("Bash", { command: "git commit --no-verify -m x" }), true);
  // cross-platform destroyers (best-effort denylist additions)
  assert.equal(isGatedTool("Bash", { command: "git filter-branch --force" }), true);
  assert.equal(isGatedTool("Bash", { command: "del /f /q important.txt" }), true);
  assert.equal(isGatedTool("Bash", { command: "Remove-Item -Recurse -Force ./build" }), true);
});
test("isGatedTool: mcp__*/prism_* (lifeblood) never gated", () => {
  assert.equal(isGatedTool("mcp__prism__prism_ai", {}), false);
  assert.equal(isGatedTool("prism_ai", {}), false);
  assert.equal(isGatedTool("", {}), false);
  assert.equal(isGatedTool(undefined, {}), false);
});

// ===========================================================================
// governanceAllows
// ===========================================================================
test("governanceAllows: no allowlist file -> false (advisory only)", () => {
  assert.equal(governanceAllows("Bash", {}), false);
});
test("governanceAllows: matching allowlist -> true; non-match -> false", () => {
  const f = tmpAllowlist({ tools: ["Bash"] });
  assert.equal(governanceAllows("Bash", { PRISM_RBA_GOVERNANCE_ALLOWLIST: f }), true);
  assert.equal(governanceAllows("Write", { PRISM_RBA_GOVERNANCE_ALLOWLIST: f }), false);
});
test("governanceAllows: wildcard -> true; malformed file -> false", () => {
  const star = tmpAllowlist({ tools: ["*"] });
  assert.equal(governanceAllows("Anything", { PRISM_RBA_GOVERNANCE_ALLOWLIST: star }), true);
  assert.equal(governanceAllows("Bash", { PRISM_RBA_GOVERNANCE_ALLOWLIST: "/no/such/file.json" }), false);
});

// ===========================================================================
// decide -- default-off + short-circuits (engine must NOT be loaded)
// ===========================================================================
test("decide: DEFAULT-OFF approves without loading the engine", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const out = await decide({ stdin: stdinFor("Bash", { command: "rm -rf /" }), env: {}, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});
test("decide: KILL overrides ENABLE+ENFORCE", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const env = { PRISM_RBA_GATE_DISABLE: "1", PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_GATE_ENFORCE: "1" };
  const out = await decide({ stdin: stdinFor("Bash", { command: "rm -rf /" }), env, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});
test("decide: recursion sentinel short-circuits", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const env = { PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_IN_FLIGHT: "1" };
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});
test("decide: depth cap short-circuits", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const env = { PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_DEPTH: "1" };
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});
test("decide: non-gated tool approves without loading the engine", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const env = { PRISM_RBA_GATE_ENABLE: "1" };
  const out = await decide({ stdin: stdinFor("Read", { file_path: "x" }), env, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});

// ===========================================================================
// decide -- fail-open modes
// ===========================================================================
test("decide: unparseable stdin -> approve", async () => {
  const out = await decide({ stdin: "{not json", env: { PRISM_RBA_GATE_ENABLE: "1" }, engineLoader: async () => mockEngine("BLOCK"), aliveFn: alive });
  assert.equal(out.decision, "approve");
});
test("decide: ollama down -> approve, engine not loaded", async () => {
  const { state, loader } = recordingLoader(mockEngine("BLOCK"));
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env: { PRISM_RBA_GATE_ENABLE: "1" }, engineLoader: loader, aliveFn: dead });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, false);
});
test("decide: engine not loadable -> approve", async () => {
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env: { PRISM_RBA_GATE_ENABLE: "1" }, engineLoader: async () => null, aliveFn: alive });
  assert.equal(out.decision, "approve");
});
test("decide: engine throws -> approve (fail-open)", async () => {
  const engine = { plan: async () => { throw new Error("boom"); } };
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env: { PRISM_RBA_GATE_ENABLE: "1" }, engineLoader: async () => engine, aliveFn: alive });
  assert.equal(out.decision, "approve");
});
test("decide: cap-breach (engine hangs) -> approve", async () => {
  const engine = { plan: () => new Promise(() => {}) }; // never resolves
  const env = { PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_CAP_MS: "50" };
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: async () => engine, aliveFn: alive });
  assert.equal(out.decision, "approve");
});

// ===========================================================================
// decide -- advisory vs enforce + governance
// ===========================================================================
test("decide: ADVISORY REVISE annotates, never blocks", async () => {
  const env = { PRISM_RBA_GATE_ENABLE: "1" }; // no ENFORCE
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: async () => mockEngine("REVISE"), aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.match(out.additionalContext, /RBA REVISE/);
});
test("decide: PROCEED -> bare approve (no annotation)", async () => {
  const env = { PRISM_RBA_GATE_ENABLE: "1" };
  const out = await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: async () => mockEngine("PROCEED"), aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(out.additionalContext, undefined);
});
test("decide: BLOCK without ENFORCE -> advisory approve, not a block", async () => {
  const env = { PRISM_RBA_GATE_ENABLE: "1" };
  const out = await decide({ stdin: stdinFor("Bash", { command: "rm -rf /" }), env, engineLoader: async () => mockEngine("BLOCK"), aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.match(out.additionalContext, /RBA BLOCK/);
});
test("decide: BLOCK with ENFORCE but NO allowlist -> advisory approve (governance)", async () => {
  const env = { PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_GATE_ENFORCE: "1" };
  const out = await decide({ stdin: stdinFor("Bash", { command: "rm -rf /" }), env, engineLoader: async () => mockEngine("BLOCK"), aliveFn: alive });
  assert.equal(out.decision, "approve");
});
test("decide: BLOCK with ENFORCE + matching allowlist -> actual block", async () => {
  const f = tmpAllowlist({ tools: ["Bash"] });
  const env = { PRISM_RBA_GATE_ENABLE: "1", PRISM_RBA_GATE_ENFORCE: "1", PRISM_RBA_GOVERNANCE_ALLOWLIST: f };
  const out = await decide({ stdin: stdinFor("Bash", { command: "rm -rf /" }), env, engineLoader: async () => mockEngine("BLOCK", { score: 0.95 }), aliveFn: alive });
  assert.equal(out.decision, "block");
  assert.match(out.reason, /RBA GATE.*BLOCK/);
});

// ===========================================================================
// decide -- no-recursion sentinel set during consult + restored after
// ===========================================================================
test("decide: sets PRISM_RBA_IN_FLIGHT + PRISM_LOCAL_LLM_VIA_MCP=0 during consult, restores after", async () => {
  const env = { PRISM_RBA_GATE_ENABLE: "1" };
  let duringInflight, duringViaMcp, duringDepth;
  const engine = {
    plan: async () => {
      duringInflight = env.PRISM_RBA_IN_FLIGHT;
      duringViaMcp = env.PRISM_LOCAL_LLM_VIA_MCP;
      duringDepth = env.PRISM_RBA_DEPTH;
      return { verdict: "PROCEED", agreementScore: 1, rationale: "" };
    },
  };
  await decide({ stdin: stdinFor("Write", { file_path: "x.ts" }), env, engineLoader: async () => engine, aliveFn: alive });
  assert.equal(duringInflight, "1");
  assert.equal(duringViaMcp, "0");
  assert.equal(duringDepth, "1");
  // restored (all were unset before) -> deleted after
  assert.equal(env.PRISM_RBA_IN_FLIGHT, undefined);
  assert.equal(env.PRISM_LOCAL_LLM_VIA_MCP, undefined);
  assert.equal(env.PRISM_RBA_DEPTH, undefined);
});

// ===========================================================================
// decide -- legacy stdin fallback (no fail-deaf)
// ===========================================================================
test("decide: legacy {tool,input} stdin still reaches the engine (no fail-deaf)", async () => {
  const { state, loader } = recordingLoader(mockEngine("PROCEED"));
  const env = { PRISM_RBA_GATE_ENABLE: "1" };
  const stdin = JSON.stringify({ tool: "Write", input: { file_path: "x.ts" } });
  const out = await decide({ stdin, env, engineLoader: loader, aliveFn: alive });
  assert.equal(out.decision, "approve");
  assert.equal(state.called, true); // the tool??tool_name fallback fired -> gated -> engine consulted
});

// sanity that the trivial guards are wired
test("isKilled/isEnabled flags", () => {
  assert.equal(isKilled({ PRISM_RBA_GATE_KILL: "1" }), true);
  assert.equal(isEnabled({ PRISM_RBA_GATE_ENABLE: "1" }), true);
  assert.equal(headOf({ command: "abc" }), "abc");
});
