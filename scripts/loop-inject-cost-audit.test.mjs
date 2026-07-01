#!/usr/bin/env node
/**
 * Tests for loop-inject-cost-audit.mjs — the helpers that classify the
 * per-/loop-iteration token cost of the hook injection chain.
 *
 * Run: node --test scripts/loop-inject-cost-audit.test.mjs
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hookScriptPath,
  hookName,
  extractInjected,
  normalize,
  classifyRun,
  estTokens,
  walkHooks,
  summarize,
  runHook,
} from "./loop-inject-cost-audit.mjs";

describe("hookScriptPath", () => {
  it("extracts the .mjs script after the portable-node interpreter", () => {
    assert.equal(
      hookScriptPath('"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/foo.mjs'),
      "H:/prism/.claude/hooks/foo.mjs",
    );
  });
  it("normalizes backslash paths to forward slashes", () => {
    assert.equal(
      hookScriptPath('"H:\\.claude\\bin\\portable-node" H:\\prism\\.claude\\hooks\\foo.mjs'),
      "H:/prism/.claude/hooks/foo.mjs",
    );
  });
  it("strips a trailing stray quote (the stress-harness-emit settings.json bug)", () => {
    assert.equal(
      hookScriptPath('H:/prism/.claude/hooks/stress-harness-emit.mjs"'),
      "H:/prism/.claude/hooks/stress-harness-emit.mjs",
    );
  });
  it("handles .py hook scripts", () => {
    assert.equal(
      hookScriptPath("python H:/prism/.claude/hooks/lib/auto-effort-detect.py"),
      "H:/prism/.claude/hooks/lib/auto-effort-detect.py",
    );
  });
  it("returns the LAST script token when several are present", () => {
    assert.equal(hookScriptPath("node H:/x/a.mjs H:/y/b.mjs"), "H:/y/b.mjs");
  });
  it("returns null when the command has no absolute script path", () => {
    assert.equal(hookScriptPath("echo hello"), null);
    assert.equal(hookScriptPath("node relative.mjs"), null);
  });
  it("returns null for empty / null / non-string input", () => {
    assert.equal(hookScriptPath(""), null);
    assert.equal(hookScriptPath(null), null);
    assert.equal(hookScriptPath(undefined), null);
    assert.equal(hookScriptPath(42), null);
  });
});

describe("hookName", () => {
  it("derives a clean basename for an .mjs hook", () => {
    assert.equal(
      hookName('"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/prompt-context-inject.mjs'),
      "prompt-context-inject",
    );
  });
  it("strips the .py extension (regression: classifyHook only stripped .mjs)", () => {
    assert.equal(
      hookName("python H:/prism/.claude/hooks/lib/auto-effort-detect.py"),
      "auto-effort-detect",
    );
  });
  it("strips a trailing stray quote AND the extension", () => {
    assert.equal(
      hookName('H:/prism/.claude/hooks/stress-harness-emit.mjs"'),
      "stress-harness-emit",
    );
  });
});

describe("extractInjected", () => {
  it("pulls nested hookSpecificOutput.additionalContext", () => {
    assert.equal(
      extractInjected('{"hookSpecificOutput":{"additionalContext":"hello world"}}'),
      "hello world",
    );
  });
  it("pulls flat additionalContext", () => {
    assert.equal(extractInjected('{"additionalContext":"flat ctx"}'), "flat ctx");
  });
  it("pulls systemMessage", () => {
    assert.equal(extractInjected('{"systemMessage":"sys msg"}'), "sys msg");
  });
  it("de-duplicates a value emitted in both nested and flat fields (no double-count)", () => {
    const out = extractInjected(
      '{"hookSpecificOutput":{"additionalContext":"SAME"},"additionalContext":"SAME"}',
    );
    assert.equal(out, "SAME");
  });
  it("joins genuinely-distinct injected fields", () => {
    const out = extractInjected(
      '{"hookSpecificOutput":{"additionalContext":"A"},"systemMessage":"B"}',
    );
    assert.equal(out, "A\nB");
  });
  it("returns empty string for JSON with no injected fields", () => {
    assert.equal(extractInjected('{"continue":true,"suppressOutput":true}'), "");
  });
  it("returns empty string for NON-JSON stdout (not structured injection)", () => {
    assert.equal(extractInjected("plain hook output"), "");
    assert.equal(extractInjected('{"broken json'), "");
  });
  it("returns empty string for empty / whitespace / null stdout", () => {
    assert.equal(extractInjected(""), "");
    assert.equal(extractInjected("   \n  "), "");
    assert.equal(extractInjected(null), "");
  });
});

describe("normalize", () => {
  it("strips ISO-8601 timestamps", () => {
    assert.equal(normalize("done at 2026-05-18T02:01:08.509Z ok"), "done at <TS> ok");
  });
  it("strips bare dates", () => {
    assert.equal(normalize("synced 2026-05-18"), "synced <DATE>");
  });
  it("strips ages attached to their unit, with/without old/ago suffix", () => {
    assert.equal(normalize("5m old"), "<AGE>");
    assert.equal(normalize("1m ago"), "<AGE>");
    assert.equal(normalize("417.6h"), "<AGE>");
    assert.equal(normalize("250ms"), "<AGE>");
  });
  it("does NOT strip a bare number followed by a spaced lone letter", () => {
    // regression: the age regex must not collapse "6 d" / "3 s" (over-strip risk)
    assert.equal(normalize("queue 6 d deep"), "queue 6 d deep");
  });
  it("strips clock times", () => {
    assert.equal(normalize("at 12:30 sharp"), "at <TIME> sharp");
    assert.equal(normalize("02:01:08"), "<TIME>");
  });
  it("strips iteration counters", () => {
    assert.equal(normalize("iter 5"), "iter<N>");
    assert.equal(normalize("iteration #3"), "iter<N>");
  });
  it("strips hex hashes that contain a hex letter", () => {
    assert.equal(normalize("session d99dc7c4 here"), "session <HASH> here");
  });
  it("does NOT strip a pure-decimal run (avoids masking a stable count)", () => {
    assert.equal(normalize("count 12345678 here"), "count 12345678 here");
  });
  it("collapses whitespace and trims", () => {
    assert.equal(normalize("  a   b\n\tc  "), "a b c");
  });
  it("returns empty string for null / undefined", () => {
    assert.equal(normalize(null), "");
    assert.equal(normalize(undefined), "");
  });
  it("is idempotent — normalize(normalize(x)) === normalize(x)", () => {
    const x = "iter 7 at 2026-05-18T02:01:08Z hash a1b2c3d4 — 5m old";
    assert.equal(normalize(normalize(x)), normalize(x));
  });
  it("makes two strings that differ only by volatile tokens compare equal", () => {
    const a = "loop iter 4 — graph fresh 2026-05-18T01:00:00Z (2m old)";
    const b = "loop iter 5 — graph fresh 2026-05-18T03:00:00Z (9m old)";
    assert.equal(normalize(a), normalize(b));
  });
});

describe("classifyRun", () => {
  const ok = (bytes, raw) => ({ status: "ok", bytes, raw });
  it("classifies two empty runs as silent", () => {
    assert.equal(classifyRun(ok(0, ""), ok(0, "")), "silent");
  });
  it("classifies byte-identical runs as stable-redundant", () => {
    assert.equal(classifyRun(ok(10, "hello ctx"), ok(10, "hello ctx")), "stable-redundant");
  });
  it("classifies runs differing only by timestamp as stable-redundant", () => {
    const r1 = ok(40, "loop iter 1 at 2026-05-18T01:00:00Z");
    const r2 = ok(40, "loop iter 2 at 2026-05-18T02:00:00Z");
    assert.equal(classifyRun(r1, r2), "stable-redundant");
  });
  it("classifies genuinely different runs as volatile", () => {
    assert.equal(classifyRun(ok(20, "alpha content"), ok(20, "bravo content")), "volatile");
  });
  it("propagates missing / timeout / error status", () => {
    assert.equal(classifyRun({ status: "missing", bytes: 0, raw: "" }, ok(0, "")), "missing");
    assert.equal(classifyRun(ok(5, "x"), { status: "timeout", bytes: 0, raw: "" }), "timeout");
    assert.equal(classifyRun({ status: "error", bytes: 0, raw: "" }, ok(5, "x")), "error");
  });
});

describe("estTokens", () => {
  it("converts bytes to tokens at ~4 chars/token", () => {
    assert.equal(estTokens(4), 1);
    assert.equal(estTokens(400), 100);
  });
  it("rounds to nearest integer", () => {
    assert.equal(estTokens(10), 3); // 2.5 -> 3
  });
  it("returns 0 for 0 / undefined bytes", () => {
    assert.equal(estTokens(0), 0);
    assert.equal(estTokens(undefined), 0);
  });
});

describe("walkHooks", () => {
  const settings = {
    hooks: {
      UserPromptSubmit: [
        {
          matcher: "*",
          hooks: [
            { command: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/prompt-context-inject.mjs', timeout: 1500 },
            { command: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/token-budget-gate.mjs', timeout: 2000 },
            { command: "python H:/prism/.claude/hooks/lib/auto-effort-detect.py", timeout: 3000 },
            { command: 'H:/prism/.claude/hooks/stress-harness-emit.mjs"', timeout: 2000 },
          ],
        },
      ],
    },
  };
  it("walks an event's hook chain into structured records", () => {
    const hooks = walkHooks(settings, "UserPromptSubmit");
    assert.equal(hooks.length, 4);
    assert.equal(hooks[0].name, "prompt-context-inject");
    assert.equal(hooks[0].role, "inject");
    assert.equal(hooks[0].script, "H:/prism/.claude/hooks/prompt-context-inject.mjs");
    assert.equal(hooks[0].timeout, 1500);
    assert.equal(hooks[1].role, "guard"); // token-budget-gate is not an inject hook
  });
  it("derives a clean name for a .py hook (regression: classifyHook only stripped .mjs)", () => {
    const hooks = walkHooks(settings, "UserPromptSubmit");
    assert.equal(hooks[2].name, "auto-effort-detect"); // not "auto-effort-detect.py"
  });
  it("derives a clean name for a trailing-quote command", () => {
    const hooks = walkHooks(settings, "UserPromptSubmit");
    assert.equal(hooks[3].name, "stress-harness-emit"); // not 'stress-harness-emit.mjs"'
  });
  it("returns [] for a missing event", () => {
    assert.deepEqual(walkHooks(settings, "Stop"), []);
  });
  it("returns [] for null / hookless settings", () => {
    assert.deepEqual(walkHooks(null, "UserPromptSubmit"), []);
    assert.deepEqual(walkHooks({}, "UserPromptSubmit"), []);
  });
});

describe("summarize", () => {
  it("aggregates per-hook results into counts and token sums", () => {
    const results = [
      { classification: "silent", tokens: 0 },
      { classification: "stable-redundant", tokens: 100 },
      { classification: "stable-redundant", tokens: 50 },
      { classification: "volatile", tokens: 200 },
      { classification: "timeout", tokens: 0 },
    ];
    const s = summarize(results);
    assert.equal(s.measured, 5);
    assert.equal(s.silent, 1);
    assert.equal(s.stableRedundant, 2);
    assert.equal(s.volatile, 1);
    assert.equal(s.problem, 1);
    assert.equal(s.redundantTokens, 150);
    assert.equal(s.volatileTokens, 200);
    assert.equal(s.injectedTokens, 350);
  });
  it("returns an all-zero summary for empty results", () => {
    const s = summarize([]);
    assert.equal(s.measured, 0);
    assert.equal(s.injectedTokens, 0);
    assert.equal(s.redundantTokens, 0);
  });
});

describe("runHook (fixture-driven E2E)", () => {
  let dir;
  let okScript, exitScript, plainScript;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "loop-inject-audit-"));
    okScript = path.join(dir, "ok-hook.mjs");
    exitScript = path.join(dir, "exit-hook.mjs");
    plainScript = path.join(dir, "plain-hook.mjs");
    fs.writeFileSync(okScript,
      'console.log(JSON.stringify({hookSpecificOutput:{additionalContext:"FIXTURE_CTX"}}));');
    fs.writeFileSync(exitScript, "process.exit(3);");
    fs.writeFileSync(plainScript, 'console.log("this is not json output");');
  });
  after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });

  it("measures a real hook subprocess that emits structured context", () => {
    const r = runHook({ script: okScript, timeout: 0 }, "{}");
    assert.equal(r.status, "ok");
    assert.equal(r.raw, "FIXTURE_CTX");
    assert.equal(r.bytes, Buffer.byteLength("FIXTURE_CTX", "utf8"));
  });
  it("reports a non-zero exit and counts no injected context", () => {
    const r = runHook({ script: exitScript, timeout: 0 }, "{}");
    assert.equal(r.status, "exit3");
    assert.equal(r.bytes, 0);
  });
  it("counts 0 bytes for a hook that emits non-JSON stdout", () => {
    const r = runHook({ script: plainScript, timeout: 0 }, "{}");
    assert.equal(r.status, "ok");
    assert.equal(r.bytes, 0);
  });
  it("returns status 'missing' when the script is not on disk", () => {
    const r = runHook({ script: path.join(dir, "does-not-exist.mjs") }, "{}");
    assert.equal(r.status, "missing");
    assert.equal(r.bytes, 0);
  });
  it("returns status 'timeout' when spawn reports ETIMEDOUT", () => {
    const fakeSpawn = () => ({ error: { code: "ETIMEDOUT" }, status: null });
    const r = runHook({ script: okScript, timeout: 0 }, "{}", fakeSpawn);
    assert.equal(r.status, "timeout");
  });
  it("returns status 'timeout' when spawn is SIGTERM-killed", () => {
    const fakeSpawn = () => ({ error: { message: "killed" }, signal: "SIGTERM" });
    const r = runHook({ script: okScript, timeout: 0 }, "{}", fakeSpawn);
    assert.equal(r.status, "timeout");
  });
  it("returns status 'error' when spawn reports a generic error", () => {
    const fakeSpawn = () => ({ error: { message: "boom" }, status: null });
    const r = runHook({ script: okScript, timeout: 0 }, "{}", fakeSpawn);
    assert.equal(r.status, "error");
  });
  it("returns status 'error' when the spawn implementation throws", () => {
    const throwingSpawn = () => { throw new Error("spawn failed"); };
    const r = runHook({ script: okScript, timeout: 0 }, "{}", throwingSpawn);
    assert.equal(r.status, "error");
  });
});
