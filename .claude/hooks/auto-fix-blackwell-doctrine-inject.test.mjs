// auto-fix-blackwell-doctrine-inject.test.mjs
// Verifies the fleet-wide standing-doctrine injector: the message carries BOTH
// directives, the session gate fires exactly once per session, and the impure
// shell (subprocess) injects on first prompt + stays silent on the second +
// honors the disable knob. Pure gate functions are reference-tested (R9 -- each
// fails on a real behavior regression, not a missing symbol).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDoctrineMessage,
  shouldInject,
  recordSeen,
  loadSeen,
} from "./auto-fix-blackwell-doctrine-inject.mjs";

const HOOK = fileURLToPath(new URL("./auto-fix-blackwell-doctrine-inject.mjs", import.meta.url));

// ── buildDoctrineMessage (pure) ────────────────────────────────────────────
test("buildDoctrineMessage: carries BOTH directives + their memory links", () => {
  const m = buildDoctrineMessage();
  assert.match(m, /AUTO-FIX INLINE/);
  assert.match(m, /BUILD FOR BLACKWELL/);
  assert.match(m, /RTX PRO 6000 Blackwell 96GB/);
  assert.match(m, /9950X3D/);
  assert.match(m, /136GB RAM/);
  assert.match(m, /\[\[feedback_auto_fix_and_blackwell_fleet_enforced\]\]/);
  assert.match(m, /\[\[feedback_build_for_blackwell_hardware\]\]/);
});
test("buildDoctrineMessage: ASCII-only (no smart punctuation that would trip the guard)", () => {
  const m = buildDoctrineMessage();
  // eslint-disable-next-line no-control-regex
  assert.equal(/[^\x00-\x7F]/.test(m), false, "doctrine must be pure ASCII");
});

// ── shouldInject (pure gate) ───────────────────────────────────────────────
const WIN = 24 * 60 * 60 * 1000;
test("shouldInject: a never-seen session injects", () => {
  assert.equal(shouldInject({}, "sess-A", 1_000_000, WIN), true);
});
test("shouldInject: a session seen inside the window does NOT re-inject", () => {
  const now = 1_000_000;
  assert.equal(shouldInject({ "sess-A": now - 60_000 }, "sess-A", now, WIN), false);
});
test("shouldInject: a session last seen OUTSIDE the window injects again", () => {
  const now = 1_000_000 + 2 * WIN;
  assert.equal(shouldInject({ "sess-A": 1_000_000 - 1 }, "sess-A", now, WIN), true);
});
test("shouldInject: no sessionId stays silent (never spams every turn)", () => {
  assert.equal(shouldInject({}, "", 1_000_000, WIN), false);
  assert.equal(shouldInject({}, undefined, 1_000_000, WIN), false);
});
test("shouldInject: a non-numeric stamp is treated as never-seen (defensive)", () => {
  assert.equal(shouldInject({ "sess-A": "garbage" }, "sess-A", 1_000_000, WIN), true);
});

// ── recordSeen (pure) ──────────────────────────────────────────────────────
test("recordSeen: stamps the session and keeps other live entries", () => {
  const now = 5_000_000;
  const s = recordSeen({ "sess-B": now - 1000 }, "sess-A", now, WIN);
  assert.equal(s["sess-A"], now);
  assert.equal(s["sess-B"], now - 1000); // still inside window -> kept
});
test("recordSeen: trims entries older than 2 windows (bounded growth)", () => {
  const now = 5_000_000;
  const s = recordSeen({ "old": now - 3 * WIN }, "sess-A", now, WIN);
  assert.equal("old" in s, false);
  assert.equal(s["sess-A"], now);
});

// ── loadSeen (impure, fail-soft) ───────────────────────────────────────────
test("loadSeen: missing/corrupt file degrades to {} (never throws)", () => {
  assert.deepEqual(loadSeen("Z:/no/such/file.json"), {});
  assert.deepEqual(loadSeen("x", () => "{not json}"), {});
});

// ── E2E: the impure shell as a subprocess ──────────────────────────────────
function runHook(sessionId, env = {}) {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: sessionId }),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return JSON.parse(r.stdout || "{}");
}

test("E2E: first prompt injects the doctrine; second (same session) stays silent", () => {
  const dir = mkdtempSync(join(tmpdir(), "autofix-doc-"));
  const sentinel = join(dir, "seen.json");
  try {
    const first = runHook("sess-e2e-1", { PRISM_AUTOFIX_DOCTRINE_FILE: sentinel, PRISM_HOOK_PROFILE: "" });
    assert.equal(first.continue, true);
    assert.ok(first.hookSpecificOutput, "first call must inject");
    assert.equal(first.hookSpecificOutput.hookEventName, "UserPromptSubmit");
    assert.match(first.hookSpecificOutput.additionalContext, /AUTO-FIX INLINE/);
    assert.match(first.hookSpecificOutput.additionalContext, /BUILD FOR BLACKWELL/);

    const second = runHook("sess-e2e-1", { PRISM_AUTOFIX_DOCTRINE_FILE: sentinel, PRISM_HOOK_PROFILE: "" });
    assert.equal(second.continue, true);
    assert.equal(second.hookSpecificOutput, undefined, "second call same session must NOT re-inject");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: a DIFFERENT session still gets the doctrine (per-session, not global-once)", () => {
  const dir = mkdtempSync(join(tmpdir(), "autofix-doc-"));
  const sentinel = join(dir, "seen.json");
  try {
    runHook("sess-X", { PRISM_AUTOFIX_DOCTRINE_FILE: sentinel, PRISM_HOOK_PROFILE: "" });
    const other = runHook("sess-Y", { PRISM_AUTOFIX_DOCTRINE_FILE: sentinel, PRISM_HOOK_PROFILE: "" });
    assert.ok(other.hookSpecificOutput, "a new session must still be served");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("E2E: PRISM_AUTOFIX_DOCTRINE_DISABLE=1 emits a bare continue (no injection)", () => {
  const out = runHook("sess-disabled", { PRISM_AUTOFIX_DOCTRINE_DISABLE: "1", PRISM_HOOK_PROFILE: "" });
  assert.equal(out.continue, true);
  assert.equal(out.hookSpecificOutput, undefined);
});

test("E2E: malformed stdin never crashes the hook (fail-soft continue)", () => {
  const r = spawnSync(process.execPath, [HOOK], {
    input: "not json at all",
    encoding: "utf8",
    env: { ...process.env, PRISM_HOOK_PROFILE: "" },
  });
  const out = JSON.parse(r.stdout || "{}");
  assert.equal(out.continue, true);
  // no session_id parsed -> shouldInject returns false -> no injection
  assert.equal(out.hookSpecificOutput, undefined);
});
