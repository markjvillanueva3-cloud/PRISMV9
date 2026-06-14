#!/usr/bin/env node
// tier: T1
/**
 * mcp-readonly-cache.test.mjs — HIGH-ROI-HOOKS-MS0 / U-HRH02.
 *
 * Pure-function coverage + subprocess integration oracles. The fail-on-revert
 * guard for the safety filter is the `isReadOnlyAction` MUTATING_VERB unit
 * test (`x_record_status` must be false) — it FAILS if the mutating-verb gate
 * is removed. The `memory_save` oracle is a coarser end-to-end sanity check.
 *
 * Run: node --test H:/prism/.claude/hooks/mcp-readonly-cache.test.mjs
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  ttlMs,
  isReadOnlyAction,
  stableStringify,
  cacheKey,
  decideMcpCheck,
} from "./mcp-readonly-cache.mjs";

const HOOK = path.join(process.cwd(), ".claude/hooks/mcp-readonly-cache.mjs");
// Hermetic per-process cache dir — no contention with the live wired hook or a
// concurrently-running sibling suite (closes the node --test multi-file flake).
const CACHE_DIR = path.join(os.tmpdir(), `mrc-test-${process.pid}-${Date.now()}`);
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
    env: { ...process.env, PRISM_MCP_CACHE_DIR: CACHE_DIR, ...env },
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
test("ttlMs: default is 3 min", () => {
  assert.equal(ttlMs({}), 180000);
});
test("ttlMs: honors a valid override; rejects junk", () => {
  assert.equal(ttlMs({ PRISM_MCP_CACHE_TTL_MS: "60000" }), 60000);
  assert.equal(ttlMs({ PRISM_MCP_CACHE_TTL_MS: "x" }), 180000);
  assert.equal(ttlMs({ PRISM_MCP_CACHE_TTL_MS: "0" }), 180000);
});

// ---- isReadOnlyAction ---------------------------------------------------
test("isReadOnlyAction: positive — read-suffixed, no mutating verb", () => {
  for (const a of [
    "gap_scan_read",
    "db_health",
    "master_index_query",
    "infra_summary",
    "tool_crib_status",
    "engine_list",
    "material_search",
    "quality_score_read",
    "get_dashboard",
    "adaptive_status",
    "roadmap_tool_plan_query",
  ]) {
    assert.equal(isReadOnlyAction(a), true, `expected read-only: ${a}`);
  }
});
test("isReadOnlyAction: negative — mutating verb present (NEVER cached)", () => {
  for (const a of [
    "memory_save",
    "job_create",
    "pattern_record",
    "task_init",
    "roadmap_advance",
    "cam_generate",
    "auto_fix_apply",
    "model_register",
    "roadmap_tool_plan_build",
  ]) {
    assert.equal(isReadOnlyAction(a), false, `mutating action must not be cacheable: ${a}`);
  }
});
test("isReadOnlyAction: negative — no read suffix", () => {
  for (const a of ["assess_risk", "gap_scan", "compute", "", "cpk_predict"]) {
    assert.equal(isReadOnlyAction(a), false, `expected not-read-only: ${a}`);
  }
});
test("isReadOnlyAction: the MUTATING_VERB gate is load-bearing (fail-on-revert)", () => {
  // A mutating verb must veto a read suffix. If the MUTATING_VERB check were
  // removed, `x_record_status` would end in `_status` → wrongly read-only.
  assert.equal(isReadOnlyAction("x_record_status"), false, "mutating verb must beat read suffix");
  assert.equal(isReadOnlyAction("x_export_summary"), false);
  assert.equal(isReadOnlyAction("x_status"), true, "pure read suffix, no verb → read-only");
});

// ---- stableStringify ----------------------------------------------------
test("stableStringify: object key order does not matter", () => {
  assert.equal(stableStringify({ a: 1, b: 2 }), stableStringify({ b: 2, a: 1 }));
});
test("stableStringify: nested objects are order-stable", () => {
  assert.equal(
    stableStringify({ x: { p: 1, q: 2 }, y: 3 }),
    stableStringify({ y: 3, x: { q: 2, p: 1 } }),
  );
});
test("stableStringify: arrays preserve order; primitives + null handled", () => {
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify(5), "5");
  assert.equal(stableStringify("s"), '"s"');
});
test("stableStringify: an undefined value does NOT collide with null (key-collision guard)", () => {
  assert.notEqual(stableStringify({ x: undefined }), stableStringify({ x: null }));
  assert.notEqual(
    cacheKey("t", "a_read", { x: undefined }),
    cacheKey("t", "a_read", { x: null }),
  );
});

// ---- cacheKey -----------------------------------------------------------
test("cacheKey: deterministic + insensitive to param key order", () => {
  assert.equal(
    cacheKey("t", "gap_scan_read", { a: 1, b: 2 }),
    cacheKey("t", "gap_scan_read", { b: 2, a: 1 }),
  );
});
test("cacheKey: differs on tool / action / params", () => {
  const base = cacheKey("t1", "act_read", { a: 1 });
  assert.notEqual(base, cacheKey("t2", "act_read", { a: 1 }));
  assert.notEqual(base, cacheKey("t1", "other_read", { a: 1 }));
  assert.notEqual(base, cacheKey("t1", "act_read", { a: 2 }));
});

// ---- decideMcpCheck -----------------------------------------------------
const NOW = 1_000_000_000;
test("decideMcpCheck: no entry → pass", () => {
  assert.equal(decideMcpCheck({ entry: undefined, ttl: 180000, now: NOW }).action, "pass");
});
test("decideMcpCheck: expired entry → pass", () => {
  const r = decideMcpCheck({ entry: { ts: NOW - 300000 }, ttl: 180000, now: NOW });
  assert.equal(r.reason, "expired");
});
test("decideMcpCheck: deny mark → pass (count-based escape)", () => {
  const r = decideMcpCheck({ entry: { ts: NOW - 1000 }, denyMark: NOW - 1000, ttl: 180000, now: NOW });
  assert.equal(r.action, "pass");
  assert.equal(r.reason, "deny-loop-escape");
});
test("decideMcpCheck: fresh duplicate, no deny mark → deny", () => {
  const r = decideMcpCheck({ entry: { ts: NOW - 1000 }, ttl: 180000, now: NOW });
  assert.equal(r.action, "deny");
});

// ---- subprocess integration oracles ------------------------------------
test("oracle: identical read-only call → first passes, second is denied", () => {
  const sid = "MRC01AAA";
  cleanup(sid);
  try {
    const first = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "gap_scan_read", params: { scope: "x" } },
    });
    assert.equal(JSON.parse(first).continue, true);
    const second = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "gap_scan_read", params: { scope: "x" } },
    });
    assert.equal(JSON.parse(second).hookSpecificOutput.permissionDecision, "deny");
  } finally {
    cleanup(sid);
  }
});

test("oracle: MUTATING action is NEVER denied (fail-on-revert safety guard)", () => {
  const sid = "MRC02BBB";
  cleanup(sid);
  try {
    for (let i = 0; i < 2; i++) {
      const out = runHook({
        hook_event_name: "PreToolUse",
        tool_name: "mcp__prism_safe__prism_memory",
        session_id: sid,
        tool_input: { action: "memory_save", params: { text: "same" } },
      });
      assert.equal(JSON.parse(out).continue, true, "memory_save must always pass");
    }
  } finally {
    cleanup(sid);
  }
});

test("oracle: param key-order does not defeat the dedup", () => {
  const sid = "MRC03CCC";
  cleanup(sid);
  try {
    runHook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "quality_score_read", params: { a: 1, b: 2 } },
    });
    const out = runHook({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "quality_score_read", params: { b: 2, a: 1 } },
    });
    assert.equal(JSON.parse(out).hookSpecificOutput.permissionDecision, "deny");
  } finally {
    cleanup(sid);
  }
});

test("oracle: deny-loop escape — the check right after a deny passes", () => {
  const sid = "MRC04DDD";
  cleanup(sid);
  try {
    const ev = {
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "db_health", params: {} },
    };
    runHook(ev); // miss
    assert.equal(JSON.parse(runHook(ev)).hookSpecificOutput.permissionDecision, "deny");
    assert.equal(JSON.parse(runHook(ev)).continue, true, "escape must honor its promise");
  } finally {
    cleanup(sid);
  }
});

test("oracle: deny-loop escape survives an intervening different-key call (A,A,B,A)", () => {
  const sid = "MRC08HHH";
  cleanup(sid);
  try {
    const evA = {
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "engine_list", params: { d: "A" } },
    };
    const evB = { ...evA, tool_input: { action: "engine_list", params: { d: "B" } } };
    runHook(evA); // A miss
    assert.equal(JSON.parse(runHook(evA)).hookSpecificOutput.permissionDecision, "deny");
    runHook(evB); // B miss — runs pruneCallsAndFiles; A's deny mark is fresh, must survive
    assert.equal(JSON.parse(runHook(evA)).continue, true, "A's escape must survive a B-call prune");
  } finally {
    cleanup(sid);
  }
});

test("oracle: an expired cache entry passes through (TTL-expiry integration)", () => {
  const sid = "MRC09III";
  cleanup(sid);
  try {
    const ev = {
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "master_index_query", params: { q: "x" } },
    };
    runHook(ev, { PRISM_MCP_CACHE_TTL_MS: "1" }); // record
    const out = runHook(ev, { PRISM_MCP_CACHE_TTL_MS: "1" }); // entry already >1ms old
    assert.equal(JSON.parse(out).continue, true, "an expired entry must not deny");
  } finally {
    cleanup(sid);
  }
});

test("oracle: a non-read action (no suffix) passes through", () => {
  const out = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "mcp__prism_safe__prism_calc",
    session_id: "MRC05EEE",
    tool_input: { action: "cpk_predict", params: {} },
  });
  assert.equal(JSON.parse(out).continue, true);
});

test("oracle: a non-MCP tool passes through untouched", () => {
  const out = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    session_id: "MRC06FFF",
    tool_input: { command: "ls" },
  });
  assert.equal(JSON.parse(out).continue, true);
});

test("oracle: disable knob forces pass-through even on a duplicate", () => {
  const sid = "MRC07GGG";
  cleanup(sid);
  try {
    const ev = {
      hook_event_name: "PreToolUse",
      tool_name: "mcp__prism_safe__prism_dev",
      session_id: sid,
      tool_input: { action: "engine_list", params: {} },
    };
    runHook(ev, { PRISM_MCP_READONLY_CACHE_DISABLE: "1" });
    const out = runHook(ev, { PRISM_MCP_READONLY_CACHE_DISABLE: "1" });
    assert.equal(JSON.parse(out).continue, true);
    assert.ok(!out.includes("deny"));
  } finally {
    cleanup(sid);
  }
});
