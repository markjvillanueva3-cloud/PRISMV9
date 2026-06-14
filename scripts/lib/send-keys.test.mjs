/**
 * send-keys.test.mjs — hermetic coverage for the Node-side SendKeys wrapper
 * (CHAT-ORCHESTRATOR-MS0/U-CHO04 Node seam).
 *
 * All spawnSync calls are mocked — no real PowerShell invocation. The PS
 * script itself is smoke-tested separately via its own --Hwnd=1 dry-run.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseSendKeysOutput,
  sendKeysToWindow,
  SEND_KEYS_SCRIPT_PATH,
  DEFAULT_SCRIPT_TIMEOUT_MS,
} from "./send-keys.mjs";

// ─── parseSendKeysOutput ────────────────────────────────────────────────────

test("parseSendKeysOutput: valid JSON object → returned as-is", () => {
  const r = parseSendKeysOutput('{"ok":true,"chars":7,"dryRun":true,"hwnd":12345}');
  assert.equal(r.ok, true);
  assert.equal(r.chars, 7);
  assert.equal(r.dryRun, true);
  assert.equal(r.hwnd, 12345);
});

test("parseSendKeysOutput: empty stdout → ok=false with no-stdout error", () => {
  const r = parseSendKeysOutput("");
  assert.equal(r.ok, false);
  assert.match(r.error, /no-stdout/);
});

test("parseSendKeysOutput: empty stdout + fallback → uses fallback", () => {
  const r = parseSendKeysOutput("", "script-exit-1");
  assert.equal(r.ok, false);
  assert.equal(r.error, "script-exit-1");
});

test("parseSendKeysOutput: malformed JSON → ok=false with parse error + snippet", () => {
  const r = parseSendKeysOutput("not { valid json");
  assert.equal(r.ok, false);
  assert.match(r.error, /json-parse-failed/);
  assert.ok(typeof r.rawSnippet === "string");
});

test("parseSendKeysOutput: JSON of non-object (number) → ok=false", () => {
  const r = parseSendKeysOutput("42");
  assert.equal(r.ok, false);
  assert.equal(r.error, "json-parse-non-object");
});

test("parseSendKeysOutput: surrounding whitespace tolerated", () => {
  const r = parseSendKeysOutput('\n  {"ok":true,"chars":0,"dryRun":true}  \n');
  assert.equal(r.ok, true);
});

// ─── sendKeysToWindow: input validation ─────────────────────────────────────

test("sendKeysToWindow: missing hwnd → ok=false", () => {
  const r = sendKeysToWindow({ text: "/clear" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing-hwnd");
});

test("sendKeysToWindow: null hwnd → ok=false", () => {
  const r = sendKeysToWindow({ hwnd: null, text: "/clear" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing-hwnd");
});

test("sendKeysToWindow: missing text → ok=false", () => {
  const r = sendKeysToWindow({ hwnd: 12345 });
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing-text");
});

test("sendKeysToWindow: empty text → ok=false", () => {
  const r = sendKeysToWindow({ hwnd: 12345, text: "" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "missing-text");
});

test("sendKeysToWindow: non-integer hwnd → ok=false with shaped error", () => {
  const r = sendKeysToWindow({ hwnd: "not-a-number", text: "/clear" });
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid-hwnd/);
});

test("sendKeysToWindow: negative hwnd → ok=false", () => {
  const r = sendKeysToWindow({ hwnd: -5, text: "/clear" });
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid-hwnd/);
});

test("sendKeysToWindow: float hwnd → ok=false (must be integer)", () => {
  const r = sendKeysToWindow({ hwnd: 12.5, text: "/clear" });
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid-hwnd/);
});

// ─── sendKeysToWindow: spawn injection (hermetic) ───────────────────────────

test("sendKeysToWindow: happy-path dry-run → parses script output", () => {
  let capturedArgs = null;
  const fake = (_cmd, args) => {
    capturedArgs = args;
    return {
      status: 0,
      stdout: '{"ok":true,"chars":6,"dryRun":true,"hwnd":99,"className":"ConsoleWindowClass"}',
      stderr: "",
    };
  };
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, true);
  assert.equal(r.chars, 6);
  assert.equal(r.dryRun, true);
  assert.equal(r.exitCode, 0);
  // Verify -Confirm:$false was passed (dry-run default).
  assert.ok(capturedArgs.includes("-Confirm:$false"), "must default to dry-run");
});

test("sendKeysToWindow: confirm=true passes -Confirm:$true", () => {
  let capturedArgs = null;
  const fake = (_cmd, args) => {
    capturedArgs = args;
    return { status: 0, stdout: '{"ok":true,"chars":6,"dryRun":false}', stderr: "" };
  };
  sendKeysToWindow({ hwnd: 99, text: "/clear", confirm: true, _spawn: fake });
  assert.ok(capturedArgs.includes("-Confirm:$true"), "confirm=true must propagate");
});

test("sendKeysToWindow: spawn returning error → reported as spawn-error", () => {
  const fake = () => ({ error: new Error("ENOENT"), code: "ENOENT" });
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, false);
  assert.match(r.error, /spawn-error/);
});

test("sendKeysToWindow: spawn throwing → reported as spawn-threw", () => {
  const fake = () => { throw new Error("boom"); };
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, false);
  assert.match(r.error, /spawn-threw:boom/);
});

test("sendKeysToWindow: spawn returning null → reported", () => {
  const fake = () => null;
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, false);
  assert.equal(r.error, "spawn-returned-null");
});

test("sendKeysToWindow: non-zero exit + empty stdout → script-exit-N fallback", () => {
  const fake = () => ({ status: 1, stdout: "", stderr: "" });
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, false);
  assert.match(r.error, /script-exit-1/);
  assert.equal(r.exitCode, 1);
});

test("sendKeysToWindow: non-zero exit WITH parseable JSON → uses parsed result", () => {
  const fake = () => ({
    status: 1,
    stdout: '{"ok":false,"error":"invalid-hwnd-not-a-window","chars":0,"dryRun":false}',
    stderr: "",
  });
  const r = sendKeysToWindow({ hwnd: 99, text: "/clear", _spawn: fake });
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid-hwnd-not-a-window");
  assert.equal(r.exitCode, 1);
});

test("sendKeysToWindow: passes -Text + -Hwnd + -DelayBetweenCharsMs args correctly", () => {
  let capturedArgs = null;
  const fake = (_cmd, args) => {
    capturedArgs = args;
    return { status: 0, stdout: '{"ok":true,"chars":0,"dryRun":true}', stderr: "" };
  };
  sendKeysToWindow({ hwnd: 4242, text: "/compact", delayMs: 25, _spawn: fake });
  assert.ok(capturedArgs.includes("-Text"), "must pass -Text flag");
  assert.equal(capturedArgs[capturedArgs.indexOf("-Text") + 1], "/compact");
  assert.equal(capturedArgs[capturedArgs.indexOf("-Hwnd") + 1], "4242");
  assert.equal(capturedArgs[capturedArgs.indexOf("-DelayBetweenCharsMs") + 1], "25");
});

test("sendKeysToWindow: uses SEND_KEYS_SCRIPT_PATH constant", () => {
  let capturedArgs = null;
  const fake = (_cmd, args) => {
    capturedArgs = args;
    return { status: 0, stdout: '{"ok":true,"chars":0,"dryRun":true}', stderr: "" };
  };
  sendKeysToWindow({ hwnd: 1, text: "x", _spawn: fake });
  assert.ok(capturedArgs.includes("-File"));
  assert.equal(capturedArgs[capturedArgs.indexOf("-File") + 1], SEND_KEYS_SCRIPT_PATH);
});

test("constants: DEFAULT_SCRIPT_TIMEOUT_MS is sane", () => {
  assert.ok(DEFAULT_SCRIPT_TIMEOUT_MS >= 1000 && DEFAULT_SCRIPT_TIMEOUT_MS <= 600000);
});
