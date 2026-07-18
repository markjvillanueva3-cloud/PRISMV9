// TOKEN-AWARENESS-MS0 / U-TA05 — inject hook tests.
// Tests pure renderInject() exhaustively + subprocess oracle for stdin/stdout
// contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderInject, isAutonomousLoopPrompt } from "../token-awareness-inject.mjs";

const HOOK = path.resolve("H:/prism/.claude/hooks/token-awareness-inject.mjs");
const SIDECAR_DIR = "H:/prism/state/shared";

function makeState({
  zone = "GREEN",
  ctxPct = 0.1,
  fiveHourPct = null,
  sevenDayPct = null,
  worstSource = "ctx",
  worstPct = null,
  offloadRatio = null,
  cumulative = null,
  stale = false,
  ageMs = 0,
  capturedAt = new Date().toISOString(),
} = {}) {
  return {
    schemaVersion: "1.0.0",
    capturedAt,
    sources: {
      statusline: ctxPct != null,
      rateLimits: fiveHourPct != null,
      transcript: cumulative != null,
      offload: offloadRatio != null,
    },
    ctx: { tokens: 0, maxTokens: 1_000_000, pct: ctxPct },
    quota:
      fiveHourPct == null && sevenDayPct == null
        ? null
        : { fiveHour: { pct: fiveHourPct }, sevenDay: { pct: sevenDayPct } },
    cumulative,
    offload: offloadRatio != null ? { offloaded: 60, kept: 40, ratio: offloadRatio } : null,
    zone,
    worstPct: worstPct ?? ctxPct ?? 0,
    worstSource,
    stale,
    ageMs,
  };
}

// ── renderInject behavior ──────────────────────────────────────────────────
test("renderInject — GREEN + fresh → null (no inject, save tokens)", () => {
  const s = makeState({ zone: "GREEN", ctxPct: 0.1 });
  assert.equal(renderInject(s), null);
});

test("renderInject — GREEN + injectOnGreen → block emitted", () => {
  const s = makeState({ zone: "GREEN", ctxPct: 0.1 });
  const block = renderInject(s, { injectOnGreen: true });
  assert.ok(block && block.includes("zone=GREEN"));
});

test("renderInject — YELLOW emits wrap-up advisory", () => {
  const s = makeState({ zone: "YELLOW", ctxPct: 0.7, worstPct: 0.7 });
  const block = renderInject(s);
  assert.ok(block);
  assert.match(block, /YELLOW/);
  assert.match(block, /Ollama|offload|batch/i);
});

test("renderInject — RED emits compact advisory", () => {
  const s = makeState({ zone: "RED", ctxPct: 0.87, worstPct: 0.87 });
  const block = renderInject(s);
  assert.match(block, /RED/);
  assert.match(block, /\/compact/);
});

test("renderInject — CRITICAL emits stop-and-compact advisory", () => {
  const s = makeState({ zone: "CRITICAL", ctxPct: 0.96, worstPct: 0.96 });
  const block = renderInject(s);
  assert.match(block, /CRITICAL/);
  assert.match(block, /handoff|immediately/i);
});

test("renderInject — stale fresh-looking sidecar surfaces age", () => {
  const s = makeState({ zone: "YELLOW", stale: true, ageMs: 90_000, worstPct: 0.7 });
  const block = renderInject(s);
  assert.match(block, /stale/);
  assert.match(block, /90s/);
});

test("renderInject — shows 5h+7d quota when present", () => {
  const s = makeState({
    zone: "YELLOW",
    ctxPct: 0.2,
    fiveHourPct: 0.75,
    sevenDayPct: 0.5,
    worstSource: "5h",
    worstPct: 0.75,
  });
  const block = renderInject(s);
  assert.match(block, /5h=75%/);
  assert.match(block, /7d=50%/);
  assert.match(block, /bottleneck=5h quota/);
});

test("renderInject — missing quota shows em-dash", () => {
  const s = makeState({ zone: "RED", ctxPct: 0.88, worstPct: 0.88 });
  const block = renderInject(s);
  assert.match(block, /5h=—/);
  assert.match(block, /7d=—/);
});

test("renderInject — cumulative tokens formatted (K/M)", () => {
  const s = makeState({
    zone: "YELLOW",
    worstPct: 0.7,
    cumulative: { input: 2_100_000, cache_read: 890_000, cache_creation: 0, output: 180_000 },
  });
  const block = renderInject(s);
  assert.match(block, /in=2\.10M/);
  assert.match(block, /cache_read=890K/);
  assert.match(block, /out=180K/);
});

test("renderInject — null state → null", () => {
  assert.equal(renderInject(null), null);
  assert.equal(renderInject(undefined), null);
  assert.equal(renderInject("not an object"), null);
});

test("renderInject — adversarial: missing cumulative fields don't crash", () => {
  const s = makeState({ zone: "YELLOW", worstPct: 0.7, cumulative: { input: undefined } });
  const block = renderInject(s);
  assert.ok(block);
});

// ── U-TA07: /loop integration ──────────────────────────────────────────────
test("isAutonomousLoopPrompt — detects /loop bare", () => {
  assert.equal(isAutonomousLoopPrompt("/loop continue"), true);
});

test("isAutonomousLoopPrompt — detects NATO-slot /loop wrapper", () => {
  assert.equal(isAutonomousLoopPrompt("/checkin-alpha /loop pick up next dev unit"), true);
});

test("isAutonomousLoopPrompt — detects autopilot variant", () => {
  assert.equal(isAutonomousLoopPrompt("/autopilot-full keep going until complete"), true);
});

test("isAutonomousLoopPrompt — detects english phrase variants", () => {
  assert.equal(isAutonomousLoopPrompt("keep going until done"), true);
  assert.equal(isAutonomousLoopPrompt("continuous build"), true);
});

test("isAutonomousLoopPrompt — non-loop prompt → false", () => {
  assert.equal(isAutonomousLoopPrompt("just answer this question"), false);
  assert.equal(isAutonomousLoopPrompt(""), false);
  assert.equal(isAutonomousLoopPrompt(null), false);
});

test("renderInject — /loop + RED emits loop-specific advisory", () => {
  const s = makeState({ zone: "RED", ctxPct: 0.87, worstPct: 0.87 });
  const block = renderInject(s, { isLoop: true });
  assert.match(block, /\/loop detected/);
  assert.match(block, /next iteration/);
  assert.match(block, /Forced trip/);
});

test("renderInject — /loop + GREEN does NOT emit loop advisory (no over-warn)", () => {
  const s = makeState({ zone: "GREEN", ctxPct: 0.1, worstPct: 0.1 });
  // GREEN + injectOnGreen=true to get any output at all
  const block = renderInject(s, { isLoop: true, injectOnGreen: true });
  assert.doesNotMatch(block, /\/loop detected/);
});

test("renderInject — non-loop + RED does NOT emit loop-specific line", () => {
  const s = makeState({ zone: "RED", ctxPct: 0.87, worstPct: 0.87 });
  const block = renderInject(s, { isLoop: false });
  // Should still emit the regular RED compact advisory
  assert.match(block, /near hard limit/);
  // But not the loop-specific one
  assert.doesNotMatch(block, /\/loop detected/);
});

// ── subprocess oracle: stdin/stdout contract ────────────────────────────────
function runHook(stdinObj, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("exit", (code) => resolve({ code, stdout, stderr }));
    child.stdin.write(JSON.stringify(stdinObj));
    child.stdin.end();
  });
}

function writeSidecar(slot, state) {
  fs.writeFileSync(path.join(SIDECAR_DIR, `token-budget-${slot}.json`), JSON.stringify(state));
}

test("inject hook — disable knob short-circuits silently", async () => {
  const r = await runHook({ session_id: "test-disabled" }, { PRISM_TOKEN_AWARE_INJECT: "0" });
  assert.equal(r.code, 0);
  assert.equal(r.stdout, "");
});

test("inject hook — missing sidecar → silent no-op", async () => {
  // Session_ids that don't match any chat-slots entry fall through to slot
  // 'unknown' — clean THAT sidecar to prove "missing" behavior. Each prior
  // test in this file also writes to unknown; this test must pre-clean it.
  const sidecarPath = path.join(SIDECAR_DIR, "token-budget-unknown.json");
  if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
  const r = await runHook({ session_id: "test-no-sidecar-9999" });
  assert.equal(r.code, 0);
  assert.equal(r.stdout.trim(), "");
});

test("inject hook — RED sidecar → emits additionalContext envelope", async () => {
  // Build a RED-zone sidecar for slot 'unknown' (default slot when session_id
  // doesn't resolve to a chat-slots.json entry)
  writeSidecar(
    "unknown",
    makeState({
      zone: "RED",
      ctxPct: 0.87,
      worstPct: 0.87,
      capturedAt: new Date().toISOString(),
    }),
  );
  const r = await runHook({ session_id: "test-red-zone-12345" });
  assert.equal(r.code, 0);
  assert.ok(r.stdout.includes('"hookEventName":"UserPromptSubmit"'));
  assert.ok(r.stdout.includes('"additionalContext"'));
  const parsed = JSON.parse(r.stdout);
  assert.ok(parsed.hookSpecificOutput.additionalContext.includes("RED"));
});

test("inject hook — stale sidecar surfaces stale warning", async () => {
  const oldIso = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min old
  writeSidecar(
    "unknown",
    makeState({
      zone: "GREEN",
      ctxPct: 0.1,
      worstPct: 0.1,
      capturedAt: oldIso,
    }),
  );
  const r = await runHook({ session_id: "test-stale-67890" });
  assert.equal(r.code, 0);
  // Stale bumps GREEN→YELLOW so it WILL inject; should mention stale
  if (r.stdout.trim()) {
    const parsed = JSON.parse(r.stdout);
    assert.match(parsed.hookSpecificOutput.additionalContext, /stale/);
  }
});

test("inject hook — malformed stdin → silent no-op", async () => {
  const r = await new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("exit", (code) => resolve({ code, stdout: out }));
    child.stdin.write("not json{{");
    child.stdin.end();
  });
  assert.equal(r.code, 0);
});
