// ollama-cheap-tier-prime.test.mjs (slot:alpha) -- node:test
// INTENT (R9): the demand-driven cheap-tier warm primes 7b ONLY when a measured-mode offload did NOT
// already land on it (it was cold), is rate-limited, kill-switched, and NEVER throws. A test that
// passes while the prime fires on the wrong mode / double-fires / blocks would be worthless -- each
// assertion pins one of those failure modes.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRIME_DISABLE_ENV,
  shouldPrimeCheapTier,
  primeCheapTier,
} from "./ollama-cheap-tier-prime.mjs";

const FLOOR = "qwen2.5-coder:7b";

// ── shouldPrimeCheapTier (pure) ──────────────────────────────────────────────
test("shouldPrimeCheapTier: measured mode + a NON-floor pick -> warm the floor (it was cold)", () => {
  assert.equal(shouldPrimeCheapTier("summarize", "qwen2.5-coder:32b"), FLOOR);
  assert.equal(shouldPrimeCheapTier("explain", "gpt-oss:120b"), FLOOR);
});

test("shouldPrimeCheapTier: floor WAS the pick -> null (already warm, no-op)", () => {
  assert.equal(shouldPrimeCheapTier("summarize", FLOOR), null);
  assert.equal(shouldPrimeCheapTier("explain", FLOOR), null);
});

test("shouldPrimeCheapTier: UNMEASURED mode -> null (never prime triage/codegen/viz/ask/rerank)", () => {
  for (const mode of ["triage", "codegen", "viz", "ask", "rerank", "", null, undefined]) {
    assert.equal(shouldPrimeCheapTier(mode, "qwen2.5-coder:32b"), null, `${mode} must not prime`);
  }
});

// ── primeCheapTier (injectable side-effect) ──────────────────────────────────
function spawnSpy() {
  const calls = [];
  const spawn = (cmd, args, opts) => { calls.push({ cmd, args, opts }); return { unref() {} }; };
  return { spawn, calls };
}

test("primeCheapTier: warranted + not-in-cooldown -> spawns a detached windowsHide curl warm + stamps", () => {
  const { spawn, calls } = spawnSpy();
  let stamped = null;
  const r = primeCheapTier("summarize", "qwen2.5-coder:32b", {
    spawn, env: {}, now: 1000, inCooldown: () => false, stamp: (m) => { stamped = m; },
  });
  assert.equal(r.primed, true);
  assert.equal(r.model, FLOOR);
  assert.equal(stamped, FLOOR);                 // cooldown stamped after a successful spawn
  assert.equal(calls.length, 1);
  const { cmd, args, opts } = calls[0];
  assert.equal(cmd, "curl");
  assert.equal(opts.detached, true);
  assert.equal(opts.windowsHide, true);         // never opens a console window (regression guard)
  const body = JSON.parse(args[args.indexOf("-d") + 1]);
  assert.equal(body.model, FLOOR);              // warms the cheap FLOOR, not the big model
  assert.equal(body.options.num_predict, 1);    // 1-token warm, not a real generation
  assert.match(body.keep_alive, /m$/);          // a keep_alive window holds it warm
});

test("primeCheapTier: floor already the pick -> NOT warranted, no spawn, no stamp", () => {
  const { spawn, calls } = spawnSpy();
  let stamped = false;
  const r = primeCheapTier("summarize", FLOOR, { spawn, env: {}, stamp: () => { stamped = true; }, inCooldown: () => false });
  assert.equal(r.primed, false);
  assert.equal(r.reason, "not-warranted");
  assert.equal(calls.length, 0);
  assert.equal(stamped, false);
});

test("primeCheapTier: kill switch (env) -> never spawns", () => {
  const { spawn, calls } = spawnSpy();
  const r = primeCheapTier("summarize", "qwen2.5-coder:32b", { spawn, env: { [PRIME_DISABLE_ENV]: "1" }, inCooldown: () => false });
  assert.equal(r.primed, false);
  assert.equal(r.reason, "disabled");
  assert.equal(calls.length, 0);
});

test("primeCheapTier: in cooldown -> no re-warm (rate-limited, no double-fire)", () => {
  const { spawn, calls } = spawnSpy();
  const r = primeCheapTier("summarize", "qwen2.5-coder:32b", { spawn, env: {}, inCooldown: () => true });
  assert.equal(r.primed, false);
  assert.equal(r.reason, "cooldown");
  assert.equal(calls.length, 0);
});

test("primeCheapTier: unmeasured mode -> not warranted, no spawn", () => {
  const { spawn, calls } = spawnSpy();
  const r = primeCheapTier("triage", "qwen2.5-coder:32b", { spawn, env: {}, inCooldown: () => false });
  assert.equal(r.primed, false);
  assert.equal(r.reason, "not-warranted");
  assert.equal(calls.length, 0);
});

test("primeCheapTier: spawn throws (Ollama down) -> primed:false, NO stamp (retry next window), never throws", () => {
  let stamped = false;
  const r = primeCheapTier("summarize", "qwen2.5-coder:32b", {
    spawn: () => { throw new Error("ENOENT curl"); },
    env: {}, inCooldown: () => false, stamp: () => { stamped = true; },
  });
  assert.equal(r.primed, false);
  assert.equal(r.reason, "spawn-failed");
  assert.equal(stamped, false);                 // a failed spawn must NOT suppress the next attempt
});

test("primeCheapTier: real default cooldown path (no inCooldown dep) does not throw", () => {
  // exercises defaultInCooldown/defaultStamp against a throwaway temp dir; just must not throw
  const { spawn } = spawnSpy();
  const r = primeCheapTier("summarize", "qwen2.5-coder:32b", {
    spawn, env: {}, now: Date.now(), stampDir: "H:/prism/.claude/cache/ollama-cheap-prime-test",
  });
  assert.equal(typeof r.primed, "boolean");
});
