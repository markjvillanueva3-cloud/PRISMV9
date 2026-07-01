#!/usr/bin/env node
/**
 * stop-force-loop-continue.test.mjs — tests for AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-LOOP-CONTINUE
 * Run: node --test .claude/hooks/__tests__/stop-force-loop-continue.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const HOOK_PATH = path.resolve("H:/prism/.claude/hooks/stop-force-loop-continue.mjs");

function runHook(stdinObj, env = {}) {
  return spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(stdinObj ?? {}),
    encoding: "utf-8",
    timeout: 10000,
    env: { ...process.env, ...env },
  });
}

describe("stop-force-loop-continue — knob discipline", () => {
  test("DISABLE=1 → fast-path approve", () => {
    const r = runHook({ session_id: "claude-test123" }, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout.trim().split("\n").pop());
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  });

  test("missing session_id → approve gracefully", () => {
    const r = runHook({});
    assert.equal(r.status, 0);
  });

  test("empty stdin → approve gracefully", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "", encoding: "utf-8", timeout: 10000,
      env: { ...process.env, PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
  });

  test("malformed JSON stdin → approve gracefully", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: "{not json", encoding: "utf-8", timeout: 10000,
      env: { ...process.env, PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
  });
});

describe("stop-force-loop-continue — output shape contract", () => {
  test("always emits {continue:true,suppressOutput:true}", () => {
    const r = runHook({ session_id: "claude-nonexistent" }, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1" });
    const lines = r.stdout.trim().split("\n").filter(Boolean);
    const lastJsonLine = lines.find(l => { try { JSON.parse(l); return true; } catch { return false; } });
    assert.ok(lastJsonLine);
    const out = JSON.parse(lastJsonLine);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, true);
  });

  test("never blocks Stop (exit 0)", () => {
    const r = runHook({ session_id: "claude-test" });
    assert.equal(r.status, 0);
  });

  test("verbose mode emits stderr diagnostics", () => {
    const r = runHook({}, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1", PRISM_FORCE_LOOP_CONTINUE_VERBOSE: "1" });
    assert.equal(r.status, 0);
    assert.match(r.stderr ?? "", /\[force-loop\]/);
  });
});

describe("stop-force-loop-continue — no-loop fast-paths", () => {
  test("session with no loop state → approve", () => {
    const r = runHook({ session_id: "claude-fake-no-loop-state" });
    assert.equal(r.status, 0);
  });

  test("approves quickly when no loop active (sub-2s)", () => {
    const start = Date.now();
    const r = runHook({ session_id: "claude-fake" });
    const elapsed = Date.now() - start;
    assert.equal(r.status, 0);
    assert.ok(elapsed < 5000, `took ${elapsed}ms`);
  });
});

describe("stop-force-loop-continue — environment-knob tunability", () => {
  test("MAX env var parses as integer", () => {
    const r = runHook({}, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1", PRISM_FORCE_LOOP_CONTINUE_MAX: "5" });
    assert.equal(r.status, 0);
  });

  test("MAX env var with non-numeric falls to default", () => {
    const r = runHook({}, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1", PRISM_FORCE_LOOP_CONTINUE_MAX: "abc" });
    assert.equal(r.status, 0);
  });
});

describe("stop-force-loop-continue — never-block contract", () => {
  test("very long session_id still exits 0", () => {
    const r = runHook({ session_id: "x".repeat(5000) });
    assert.equal(r.status, 0);
  });

  test("session_id with special chars still exits 0", () => {
    const r = runHook({ session_id: "claude-../../bad" });
    assert.equal(r.status, 0);
  });

  test("multiple invocations all exit 0", () => {
    for (let i = 0; i < 3; i++) {
      const r = runHook({ session_id: `claude-test-${i}` }, { PRISM_FORCE_LOOP_CONTINUE_DISABLE: "1" });
      assert.equal(r.status, 0, `iteration ${i} should exit 0`);
    }
  });
});

describe("stop-force-loop-continue -- findHandoff short-chatId match (RESUME_LOOP append fix)", () => {
  test("matches a SHORT-chatId handoff file given a FULL-UUID sid (pre-fix this was DEAD)", async () => {
    const os = await import("node:os");
    const fsx = await import("node:fs");
    const px = await import("node:path");
    const dir = fsx.mkdtempSync(px.join(os.tmpdir(), "sflc-handoffs-"));
    fsx.writeFileSync(px.join(dir, "HANDOFF-claude-70add462-alpha-work.md"), "## RESUME\nx\n");
    process.env.PRISM_TEST_HANDOFFS_DIR = dir;
    const mod = await import("../stop-force-loop-continue.mjs");
    const hit = mod.findHandoff("70add462-1791-4709-8720-39bf7ced2ecc");
    assert.ok(hit && hit.replace(/\\/g, "/").endsWith("HANDOFF-claude-70add462-alpha-work.md"), `full-UUID sid must match short file; got ${hit}`);
    const hit2 = mod.findHandoff("claude-70add462-1791-4709");
    assert.ok(hit2, "claude-prefixed full form must also match");
    assert.equal(mod.handoffNeedle("70add462-1791-4709"), "claude-70add462");
    assert.equal(mod.handoffNeedle("claude-70add462"), "claude-70add462");
    assert.equal(mod.handoffNeedle(""), "");
    assert.equal(mod.findHandoff("zz999999-aaaa"), null, "non-matching sid -> null");
    fsx.rmSync(dir, { recursive: true, force: true });
    delete process.env.PRISM_TEST_HANDOFFS_DIR;
  });
});
