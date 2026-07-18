// scripts/lib/octopus-dispatch.test.mjs
//
// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P0 — dispatch bridge tests (hermetic).
//
// mapConsensusToLedger is pure → tested directly. dispatchOctopus's I/O is
// tested with an injected engineFactory (no dist import, no network). The
// critical R12 property under test: when no voice succeeds, the verdict names
// the blocker — it is NEVER a fabricated merge.

import test from "node:test";
import assert from "node:assert/strict";
import { mapConsensusToLedger, dispatchOctopus, localOnlyOverrides } from "./octopus-dispatch.mjs";

// -- mapConsensusToLedger: happy path (real consensus) --------------------

test("map: ok consensus → verdict is the merged answer (the de-stub)", () => {
  const cr = {
    ok: true,
    successCount: 2,
    agreementScore: 0.8,
    recommendation: "accept",
    consensus: { answer: "Kienzle estimates milling cutting force from kc1.1.", confidence: 0.8, voters: ["gemini", "ollama"] },
    responses: [
      { model: "gemini-2.5-flash", vendor: "google", ok: true, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: true, error: null },
    ],
  };
  const out = mapConsensusToLedger(cr);
  assert.equal(out.ok, true);
  assert.equal(out.successCount, 2);
  assert.notEqual(out.consensus.verdict, "stub-not-yet-merged");
  assert.match(out.consensus.verdict, /Kienzle/);
  assert.equal(out.voices.length, 2);
  assert.ok(out.voices.every((v) => v.verdict === "answered"));
  assert.equal(out.consensus.confidence, 0.8);
});

// -- voice-id diagnosability: distinct ollama models get distinct ids ------

test("map: two ollama voices get distinct model-tagged ids (1-voice regression is diagnosable)", () => {
  const cr = {
    ok: true,
    successCount: 2,
    consensus: { answer: "Trochoidal milling protects tool life.", confidence: 0.78 },
    responses: [
      { model: "qwen2.5-coder:32b", vendor: "ollama", ok: true, error: null },
      { model: "gpt-oss:20b", vendor: "ollama", ok: true, error: null },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const ids = out.voices.map((v) => v.id).sort();
  // The two local voices are DISTINGUISHABLE in the ledger -- NOT both collapsed
  // to "ollama" -- so when the VRAM-runnable gate drops one, the ledger shows
  // exactly which model survived (the honest, observable half of the transient-
  // co-residency caveat).
  assert.deepEqual(ids, ["ollama:gpt-oss:20b", "ollama:qwen2.5-coder:32b"]);
});

test("map: single-model vendors keep the bare vendor id (back-compat, unambiguous)", () => {
  const cr = {
    ok: true,
    successCount: 2,
    consensus: { answer: "x", confidence: 0.7 },
    responses: [
      { model: "gemini-2.5-flash", vendor: "google", ok: true, error: null },
      { model: "grok-4", vendor: "xai", ok: false, error: "HTTP 429" },
    ],
  };
  const out = mapConsensusToLedger(cr);
  const ids = out.voices.map((v) => v.id).sort();
  // google/xai/openai/anthropic field one model each -> bare vendor id, unchanged.
  assert.deepEqual(ids, ["google", "xai"]);
});

// -- mapConsensusToLedger: failure honesty (R12 — no fake merge) ----------

test("map: zero voices succeeded → verdict NAMES the blocker, not a merge", () => {
  const cr = {
    ok: false,
    successCount: 0,
    agreementScore: 0,
    recommendation: "escalate",
    consensus: null,
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: false, error: "process error: spawn codex ENOENT" },
      { model: "gemini-3-pro-preview", vendor: "google", ok: false, error: "HTTP 429: quota exceeded" },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: false, error: "fetch failed" },
    ],
  };
  const out = mapConsensusToLedger(cr);
  assert.equal(out.ok, false);
  assert.equal(out.successCount, 0);
  // Verdict must NOT be a fabricated answer; must name the blocker.
  assert.match(out.consensus.verdict, /^no-consensus:/);
  assert.match(out.consensus.verdict, /spawn-enoent/);
  assert.match(out.consensus.verdict, /quota-429/);
  assert.match(out.consensus.verdict, /unreachable/);
  // Every voice carries its real failure.
  assert.equal(out.voices.length, 3);
  assert.ok(out.voices.every((v) => v.verdict.startsWith("failed:")));
  assert.ok(out.consensus.dissent_items.length >= 3);
});

// -- mapConsensusToLedger: partial success (1 of 3) -----------------------

test("map: one voice ok → ok:true, verdict is the answer, failures in dissent", () => {
  const cr = {
    ok: true,
    successCount: 1,
    agreementScore: 0.33,
    recommendation: "escalate",
    consensus: { answer: "A milling force model.", confidence: 0.33, voters: ["gemini-2.5-flash"] },
    responses: [
      { model: "gpt-5.5", vendor: "openai", ok: false, error: "spawn codex ENOENT" },
      { model: "gemini-2.5-flash", vendor: "google", ok: true, error: null },
      { model: "deepseek-r1:14b", vendor: "ollama", ok: false, error: "fetch failed" },
    ],
  };
  const out = mapConsensusToLedger(cr);
  assert.equal(out.ok, true);
  assert.match(out.consensus.verdict, /milling force model/);
  // The two failures are recorded as dissent + the escalate recommendation.
  assert.ok(out.consensus.dissent_items.some((d) => /spawn-enoent/.test(d)));
  assert.ok(out.consensus.dissent_items.some((d) => /recommendation:escalate/.test(d)));
});

// -- mapConsensusToLedger: malformed / adversarial input ------------------

test("map: malformed result (no responses) → canonical roster marked not-invoked", () => {
  const out = mapConsensusToLedger({});
  assert.equal(out.ok, false);
  assert.equal(out.voices.length, 5); // canonical fleet
  assert.ok(out.voices.every((v) => v.verdict === "failed:not-invoked"));
  assert.match(out.consensus.verdict, /^no-consensus:/);
});

test("map: null / non-object → safe defaults, never throws", () => {
  for (const bad of [null, undefined, 42, "x", []]) {
    const out = mapConsensusToLedger(bad);
    assert.equal(out.ok, false);
    assert.ok(Array.isArray(out.voices) && out.voices.length > 0);
    assert.equal(typeof out.consensus.verdict, "string");
  }
});

// -- dispatchOctopus: injected engine (no dist, no network) ---------------

test("dispatch: injected engine that succeeds → dispatched:true, mapped ok", async () => {
  const fakeEngine = {
    ask: async (input) => {
      assert.equal(typeof input.prompt, "string");
      assert.equal(input.includeClaude, false); // headless default
      return {
        ok: true,
        successCount: 1,
        agreementScore: 0.5,
        recommendation: "review",
        consensus: { answer: "fake merged answer", confidence: 0.5, voters: ["gemini"] },
        responses: [{ model: "gemini", vendor: "google", ok: true, error: null }],
      };
    },
  };
  const dr = await dispatchOctopus({
    prompt: "test prompt",
    context: "some context",
    engineFactory: async () => fakeEngine,
  });
  assert.equal(dr.dispatched, true);
  assert.equal(dr.mapped.ok, true);
  assert.match(dr.mapped.consensus.verdict, /fake merged answer/);
});

test("dispatch: engine import fails → dispatched:false with reason (no throw)", async () => {
  const dr = await dispatchOctopus({
    prompt: "test prompt",
    engineFactory: async () => { throw new Error("dist not built"); },
  });
  assert.equal(dr.dispatched, false);
  assert.match(dr.reason, /engine-import-failed:dist not built/);
});

test("dispatch: engine missing ask() → dispatched:false", async () => {
  const dr = await dispatchOctopus({
    prompt: "test prompt",
    engineFactory: async () => ({ notAsk: true }),
  });
  assert.equal(dr.dispatched, false);
  assert.equal(dr.reason, "engine-missing-ask");
});

test("dispatch: ask() throws → dispatched:false with reason (no throw)", async () => {
  const dr = await dispatchOctopus({
    prompt: "test prompt",
    engineFactory: async () => ({ ask: async () => { throw new Error("model exploded"); } }),
  });
  assert.equal(dr.dispatched, false);
  assert.match(dr.reason, /ask-threw:model exploded/);
});

test("dispatch: empty / non-string prompt → dispatched:false (no engine call)", async () => {
  let called = false;
  const factory = async () => ({ ask: async () => { called = true; return {}; } });
  for (const bad of ["", "   ", null, 42]) {
    const dr = await dispatchOctopus({ prompt: bad, engineFactory: factory });
    assert.equal(dr.dispatched, false);
    assert.equal(dr.reason, "empty-prompt");
  }
  assert.equal(called, false);
});

test("dispatch: injected engine returning all-failed → dispatched:true but mapped.ok:false (honest)", async () => {
  const fakeEngine = {
    ask: async () => ({
      ok: false, successCount: 0, agreementScore: 0, recommendation: "escalate", consensus: null,
      responses: [{ model: "deepseek-r1:14b", vendor: "ollama", ok: false, error: "fetch failed" }],
    }),
  };
  const dr = await dispatchOctopus({ prompt: "q", engineFactory: async () => fakeEngine });
  assert.equal(dr.dispatched, true);
  assert.equal(dr.mapped.ok, false);
  assert.match(dr.mapped.consensus.verdict, /no-consensus:.*unreachable/);
});

// -- localOnly free mode: every cloud vendor off, local panel on -----------

test("localOnlyOverrides: disables ALL cloud vendors, enables the local panel ($0)", () => {
  const o = localOnlyOverrides();
  // Every paid cloud voice MUST be off -- this is the zero-spend contract.
  for (const k of ["includeClaude", "includeGrok", "includeGemini", "includeCodex", "includeDeepSeek", "includeGLM"]) {
    assert.equal(o[k], false, `${k} must be false in local-only mode`);
  }
  // Diverse local panel ON so a single machine still gets multi-voice signal.
  assert.equal(o.diverseLocalPanel, true);
  // Curated FAST pair (>=2) -- a real consensus, not the 1-voice collapse the
  // engine default (gemma4:31b absent) produced.
  assert.ok(Array.isArray(o.diverseLocalModels) && o.diverseLocalModels.length >= 2);
  // Distinct families present: general (gpt-oss) + coder -> independent signal.
  assert.ok(o.diverseLocalModels.some((m) => /gpt-oss/.test(m)));
  assert.ok(o.diverseLocalModels.some((m) => /coder/.test(m)));
  // Big serialized reasoners deliberately EXCLUDED (engine runs the panel
  // sequentially on one GPU -> total is a SUM; a 120b/deepseek voice would blow
  // the cron budget). Keep the panel fast so worst-case wall time stays bounded.
  assert.ok(!o.diverseLocalModels.some((m) => /:120b|deepseek-r1/.test(m)));
  // forceProbe so a stale capability cache can't silently drop a resident voice.
  assert.equal(o.forceProbe, true);
  // dualOllama is INERT under diverseLocalPanel (engine gates it on
  // !diverseLocalPanel) -- must NOT be set (avoids the misleading dead flag).
  assert.equal(o.dualOllama, undefined);
  // Per-voice ceiling above the 60s base, but bounded (sequential SUM, 2 voices).
  assert.ok(o.timeoutMs > 60000 && o.timeoutMs <= 120000);
});

test("dispatch localOnly:true → ask() receives every cloud flag false + local panel on", async () => {
  let seen = null;
  const fakeEngine = { ask: async (input) => { seen = input; return { ok: true, successCount: 2, consensus: { answer: "local consensus", confidence: 0.6 }, responses: [{ model: "gpt-oss:120b", vendor: "ollama", ok: true, error: null }, { model: "qwen2.5-coder:32b", vendor: "ollama", ok: true, error: null }] }; } };
  const dr = await dispatchOctopus({ prompt: "real crossroad", localOnly: true, engineFactory: async () => fakeEngine });
  assert.equal(dr.dispatched, true);
  // The engine actually saw the cloud-off contract -- not just the helper in isolation.
  assert.equal(seen.includeGrok, false);
  assert.equal(seen.includeGemini, false);
  assert.equal(seen.includeCodex, false);
  assert.equal(seen.includeDeepSeek, false);
  assert.equal(seen.includeGLM, false);
  assert.equal(seen.diverseLocalPanel, true);
});

test("dispatch localOnly:false (default) → no cloud flags injected (back-compat)", async () => {
  let seen = null;
  const fakeEngine = { ask: async (input) => { seen = input; return { ok: true, successCount: 1, consensus: { answer: "x", confidence: 0.5 }, responses: [{ model: "g", vendor: "google", ok: true, error: null }] }; } };
  await dispatchOctopus({ prompt: "q", engineFactory: async () => fakeEngine });
  // Default path is byte-identical to before this feature: only includeClaude:false (the pre-existing headless default), no Grok/Gemini/Codex injection.
  assert.equal(seen.includeClaude, false);
  assert.equal(seen.includeGrok, undefined);
  assert.equal(seen.includeGemini, undefined);
  assert.equal(seen.diverseLocalPanel, undefined);
});

test("dispatch localOnly:true but askOverrides re-enables Gemini → explicit operator override WINS (R7 precedence)", async () => {
  let seen = null;
  const fakeEngine = { ask: async (input) => { seen = input; return { ok: true, successCount: 1, consensus: { answer: "x", confidence: 0.5 }, responses: [{ model: "g", vendor: "google", ok: true, error: null }] }; } };
  await dispatchOctopus({ prompt: "q", localOnly: true, askOverrides: { includeGemini: true }, engineFactory: async () => fakeEngine });
  // localOnly turns Gemini off, but an explicit askOverride re-seats it (askOverrides spread LAST).
  assert.equal(seen.includeGemini, true);
  // The other cloud voices stay off (override is surgical, not a blanket cloud re-enable).
  assert.equal(seen.includeGrok, false);
  assert.equal(seen.includeCodex, false);
});
