#!/usr/bin/env node
/**
 * set-window-title.test.mjs — hermetic tests (injected runPs, no real PowerShell).
 * Run: node --test .claude/helpers/set-window-title.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  sanitizeTitle,
  resolveClaudeHostPid,
  setWindowTitle,
  defaultStampFile,
} from "./set-window-title.mjs";

const IS_WIN = process.platform === "win32";

describe("sanitizeTitle", () => {
  test("passes through a normal slot name", () => {
    assert.equal(sanitizeTitle("ALPHA-FLEET-REAPER/GNN"), "ALPHA-FLEET-REAPER/GNN");
  });
  test("strips control chars (incl. ESC/BEL used in OSC injection)", () => {
    assert.equal(sanitizeTitle("a\x1b]0;evilb\x07c"), "a ]0;evilb c");
  });
  test("collapses whitespace and trims", () => {
    assert.equal(sanitizeTitle("  foo   bar \t baz  "), "foo bar baz");
  });
  test("caps length at 80", () => {
    assert.equal(sanitizeTitle("x".repeat(200)).length, 80);
  });
  test("non-string → empty", () => {
    assert.equal(sanitizeTitle(null), "");
    assert.equal(sanitizeTitle(undefined), "");
    assert.equal(sanitizeTitle(42), "");
  });
  test("DEL (0x7f) is stripped", () => {
    assert.equal(sanitizeTitle("a\x7fb"), "a b");
  });
});

describe("resolveClaudeHostPid", () => {
  test("returns the pid the PS walker prints", () => {
    if (!IS_WIN) { assert.equal(resolveClaudeHostPid(123), null); return; }
    const runPs = () => "65660\n";
    assert.equal(resolveClaudeHostPid(123, { runPs }), 65660);
  });
  test("null on non-integer / non-positive start pid", () => {
    assert.equal(resolveClaudeHostPid("abc", { runPs: () => "1" }), null);
    assert.equal(resolveClaudeHostPid(0, { runPs: () => "1" }), null);
    assert.equal(resolveClaudeHostPid(-5, { runPs: () => "1" }), null);
  });
  test("null when PS yields no number", () => {
    if (!IS_WIN) return;
    assert.equal(resolveClaudeHostPid(123, { runPs: () => "no match here" }), null);
  });
  test("null when PS throws (never propagates)", () => {
    if (!IS_WIN) return;
    assert.equal(resolveClaudeHostPid(123, { runPs: () => { throw new Error("boom"); } }), null);
  });
});

describe("setWindowTitle", () => {
  test("empty title → error, no PS spawned", () => {
    let called = false;
    const r = setWindowTitle("   ", { runPs: () => { called = true; return "OK"; }, hostPid: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.error, "empty_title");
    assert.equal(called, false);
  });

  test("non-Windows → skipped, never throws", () => {
    if (IS_WIN) return;
    const r = setWindowTitle("name", { hostPid: 1 });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, "non-win32");
  });

  test("happy path sets title via injected PS and writes stamp", () => {
    if (!IS_WIN) return;
    const stamp = path.join(os.tmpdir(), `swt-test-${Date.now()}-${Math.random().toString(36).slice(2)}.stamp`);
    try {
      let seenEnv = null;
      const runPs = (_script, env) => { seenEnv = env; return "OK\n"; };
      const r = setWindowTitle("ALPHA-GNN", { hostPid: 999, stampFile: stamp, runPs });
      assert.equal(r.ok, true);
      assert.equal(r.cached, false);
      assert.equal(r.hostPid, 999);
      assert.equal(seenEnv.PRISM_WT_PID, "999");
      assert.equal(seenEnv.PRISM_WT_TITLE, "ALPHA-GNN");
      assert.equal(fs.readFileSync(stamp, "utf8"), "ALPHA-GNN");
    } finally { try { fs.unlinkSync(stamp); } catch { /* ignore */ } }
  });

  test("stamp cache short-circuits the PS spawn on identical title", () => {
    if (!IS_WIN) return;
    const stamp = path.join(os.tmpdir(), `swt-cache-${Date.now()}-${Math.random().toString(36).slice(2)}.stamp`);
    try {
      fs.writeFileSync(stamp, "SAME", "utf8");
      let calls = 0;
      const r = setWindowTitle("SAME", { hostPid: 1, stampFile: stamp, runPs: () => { calls++; return "OK"; } });
      assert.equal(r.ok, true);
      assert.equal(r.cached, true);
      assert.equal(calls, 0, "PowerShell must NOT be spawned on cache hit");
    } finally { try { fs.unlinkSync(stamp); } catch { /* ignore */ } }
  });

  test("force:true bypasses the stamp cache", () => {
    if (!IS_WIN) return;
    const stamp = path.join(os.tmpdir(), `swt-force-${Date.now()}.stamp`);
    try {
      fs.writeFileSync(stamp, "SAME", "utf8");
      let calls = 0;
      const r = setWindowTitle("SAME", { hostPid: 1, stampFile: stamp, force: true, runPs: () => { calls++; return "OK"; } });
      assert.equal(calls, 1);
      assert.equal(r.cached, false);
    } finally { try { fs.unlinkSync(stamp); } catch { /* ignore */ } }
  });

  test("PS returns FAIL → ok:false, stamp NOT written", () => {
    if (!IS_WIN) return;
    const stamp = path.join(os.tmpdir(), `swt-fail-${Date.now()}.stamp`);
    try {
      const r = setWindowTitle("X", { hostPid: 1, stampFile: stamp, runPs: () => "FAIL" });
      assert.equal(r.ok, false);
      assert.equal(fs.existsSync(stamp), false);
    } finally { try { fs.unlinkSync(stamp); } catch { /* ignore */ } }
  });

  test("PS throws → ok:false with error, never propagates", () => {
    if (!IS_WIN) return;
    const r = setWindowTitle("X", { hostPid: 1, runPs: () => { throw new Error("spawn EACCES"); } });
    assert.equal(r.ok, false);
    assert.match(r.error, /EACCES/);
  });

  test("no host pid resolvable → error", () => {
    if (!IS_WIN) return;
    const r = setWindowTitle("X", { startPid: 123, runPs: () => "no number" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_host_pid");
  });
});

describe("defaultStampFile", () => {
  test("sanitizes session id and lives under tmpdir", () => {
    const f = defaultStampFile("claude-b6c4b196");
    assert.ok(f.startsWith(os.tmpdir().replace(/\\/g, "/")) || f.startsWith(os.tmpdir()));
    assert.match(f, /prism-wt-title-claude-b6c4b196\.stamp$/);
  });
  test("handles missing/odd ids", () => {
    assert.match(defaultStampFile(null), /prism-wt-title-unknown\.stamp$/);
    assert.match(defaultStampFile("a/b\\c:d"), /prism-wt-title-a_b_c_d\.stamp$/);
  });
});
