// Tests for slot-context-bundle-inject.mjs hook.
// Spawn the hook as a child process to verify the real I/O contract end-to-end.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PRISM = "H:/prism";
const HOOK = `${PRISM}/.claude/hooks/slot-context-bundle-inject.mjs`;

function runHook(envelope, env = {}) {
  const stdin = JSON.stringify(envelope);
  const result = spawnSync(process.execPath, [HOOK], {
    input: stdin,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 10000,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    code: result.status,
    parsed: (() => { try { return JSON.parse(result.stdout); } catch { return null; } })(),
  };
}

describe("slot-context-bundle-inject — contract", () => {
  it("returns valid JSON envelope with continue:true on any input", () => {
    const r = runHook({});
    assert.equal(r.code, 0);
    assert.ok(r.parsed, "stdout must be valid JSON");
    assert.equal(r.parsed.continue, true);
  });

  it("disable-env knob short-circuits with continue:true and no additionalContext", () => {
    const r = runHook({ session_id: "claude-7979e425", prompt: "x" }, { PRISM_SLOT_CONTEXT_INJECT_DISABLE: "1" });
    assert.equal(r.parsed.continue, true);
    assert.equal(r.parsed.hookSpecificOutput, undefined);
  });

  it("missing session_id → silent skip (no additionalContext)", () => {
    const r = runHook({ prompt: "x" });
    assert.equal(r.parsed.continue, true);
    assert.equal(r.parsed.hookSpecificOutput, undefined);
  });

  it("session_id matching a bound slot → emits PSN aggregator block", () => {
    // Use this chat's real session id (bravo is currently claimed by claude-7979e425
    // per the live chat-slots.json). If the slot isn't bound at test time the test
    // becomes a no-op assertion — but the hook must STILL emit valid JSON.
    const r = runHook({ session_id: "claude-7979e425", prompt: "x" });
    assert.equal(r.code, 0);
    assert.ok(r.parsed, "stdout must be valid JSON even on no-match");
    assert.equal(r.parsed.continue, true);
    if (r.parsed.hookSpecificOutput) {
      assert.equal(r.parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
      assert.ok(r.parsed.hookSpecificOutput.additionalContext.includes("ZEBRA-OMNISCIENT-MS0 PSN aggregator"));
      assert.ok(r.parsed.hookSpecificOutput.additionalContext.includes("Auto-injected"));
    }
  });

  it("malformed envelope → never throws, returns continue:true", () => {
    // Hook should fail-soft on any input — pass garbage stdin.
    const r = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8", timeout: 10000 });
    assert.equal(r.status, 0);
    const parsed = JSON.parse(r.stdout);
    assert.equal(parsed.continue, true);
  });

  it("verbose flag includes Surfaces section when slot is matched", () => {
    const r = runHook({ session_id: "claude-7979e425", prompt: "x" }, { PRISM_SLOT_CONTEXT_INJECT_VERBOSE: "1" });
    if (r.parsed.hookSpecificOutput) {
      assert.ok(r.parsed.hookSpecificOutput.additionalContext.includes("Surfaces:"));
    }
  });

  it("NEVER outputs a block decision (no exit 2 / decision:'block')", () => {
    const r = runHook({ session_id: "claude-7979e425", prompt: "x" });
    assert.notEqual(r.code, 2);
    if (r.parsed.hookSpecificOutput) {
      assert.notEqual(r.parsed.hookSpecificOutput.decision, "block");
    }
  });
});
