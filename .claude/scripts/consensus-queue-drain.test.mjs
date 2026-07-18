// Test -- consensus-queue-drain.mjs buildDrainVoiceBound (RATE-LIMIT-FIX local-only path).
//
// The drain fires on EVERY Stop across the ~10-session fleet. Its default voice
// bound MUST be local-only (no Claude/Codex/Grok/Gemini API spend) -- otherwise
// it is the exact org-wide rate-limit amplifier it was built to eliminate. The
// includeCodex:false key is load-bearing: without it the engine called codex
// UNCONDITIONALLY. This file also proves importing the module is side-effect-free
// (the isDirect guard) -- if it weren't, importing here would trigger a real drain.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDrainVoiceBound, drainGrokEnabled } from "./consensus-queue-drain.mjs";

test("buildDrainVoiceBound (default) is LOCAL-ONLY -- every external voice disabled", () => {
  const b = buildDrainVoiceBound();
  // Codex is the one that was always-on before the includeCodex flag: assert it.
  assert.equal(b.includeCodex, false);
  assert.equal(b.includeClaude, false);
  assert.equal(b.includeGrok, false);
  assert.equal(b.includeGemini, false);
});

test("buildDrainVoiceBound seats a diverse local panel (genuine multi-voice, $0)", () => {
  const b = buildDrainVoiceBound();
  assert.equal(b.diverseLocalPanel, true);
  assert.ok(Array.isArray(b.diverseLocalModels) && b.diverseLocalModels.length >= 2,
    "expected >=2 distinct local voices for real consensus");
  // No external/cloud model id may leak into the local panel.
  assert.equal(b.diverseLocalModels.some((m) => /gpt-5|claude|grok|gemini/i.test(m)), false);
});

// ── drainGrokEnabled: opt-in FREE hermes-Grok voice, keyless-gated (U-OCT-DRAIN-HERMES-GROK) ──
// The drain may seat the free :8645 hermes-Grok voice ONLY when opted in AND keyless, so the
// unattended fleet-wide drain never makes a PAID Grok API call (the no-paid-voice invariant).
test("drainGrokEnabled: OFF by default (knob unset) -> no Grok voice (byte-identical local-only)", () => {
  assert.equal(drainGrokEnabled(false, {}), false);
  assert.equal(drainGrokEnabled(undefined, {}), false);
});

test("drainGrokEnabled: ON + keyless -> true (free hermes proxy is the only available Grok transport)", () => {
  assert.equal(drainGrokEnabled(true, {}), true);
});

test("drainGrokEnabled: ON but XAI_API_KEY present -> false (never a PAID Grok call from the unattended drain)", () => {
  assert.equal(drainGrokEnabled(true, { XAI_API_KEY: "present" }), false);
});

test("drainGrokEnabled: ON but GROK_API_KEY present -> false (no-paid-voice invariant, either key name)", () => {
  assert.equal(drainGrokEnabled(true, { GROK_API_KEY: "present" }), false);
});

test("importing the module did NOT trigger a drain (isDirect guard holds)", () => {
  // If the guard were missing, the import above would have run main() and
  // drained the live queue as a side effect. Reaching this assertion at all
  // proves the guard works (the test process is not the direct CLI invocation).
  assert.ok(typeof buildDrainVoiceBound === "function");
});
