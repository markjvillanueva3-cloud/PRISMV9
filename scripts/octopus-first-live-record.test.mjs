// scripts/octopus-first-live-record.test.mjs
//
// HERMETIC unit test for octopus-first-live-record.mjs. NO network, NO live
// Ollama, NO real consensus engine -- every dispatch/record/publish is injected.
// Asserts the LOCAL-ONLY safety bound (env clears + codex neutralization + local
// panel), the result summarizer's honesty (R12), and the failure/edge modes.
//
// Real-value assertions only (R9): exact env keys/values, exact successCount,
// exact verdict strings, exact ok/reason -- never toBeDefined/toBeTruthy stubs.

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildLocalOnlyEnv,
  buildLocalOnlyAskOverrides,
  parseArgs,
  grokVoiceAdvisory,
  summarizeDispatch,
  runLive,
  prewarmPanel,
  CODEX_NEUTRALIZE_SENTINEL,
  LOCAL_ONLY_PANEL,
  DEFAULT_SEED_PROMPT,
  DEFAULT_LOCAL_TIMEOUT_MS,
} from "./octopus-first-live-record.mjs";

// ---------------------------------------------------------------------------
// (a) env-builder sets LIVE_DISPATCH + clears every external key + neutralizes codex
// ---------------------------------------------------------------------------

test("buildLocalOnlyEnv arms live dispatch and clears every external-voice API key", () => {
  const env = buildLocalOnlyEnv({ PRISM_CODEX_BIN: "codex" });
  // Live dispatch armed.
  assert.equal(env.PRISM_OCTOPUS_LIVE_DISPATCH, "1");
  // Every external key cleared to "" so Boolean(key) === false in the engine.
  assert.equal(env.XAI_API_KEY, "");
  assert.equal(env.GEMINI_API_KEY, "");
  assert.equal(env.GOOGLE_API_KEY, "");
  assert.equal(Boolean(env.XAI_API_KEY), false);
  assert.equal(Boolean(env.GEMINI_API_KEY), false);
  assert.equal(Boolean(env.GOOGLE_API_KEY), false);
});

test("buildLocalOnlyEnv neutralizes codex by pointing PRISM_CODEX_BIN at a non-existent sentinel", () => {
  const env = buildLocalOnlyEnv({ PRISM_CODEX_BIN: "/usr/bin/codex" });
  // The sentinel must be the exact distinctive name, and must NOT be the real bin.
  assert.equal(env.PRISM_CODEX_BIN, CODEX_NEUTRALIZE_SENTINEL);
  assert.notEqual(env.PRISM_CODEX_BIN, "codex");
  assert.notEqual(env.PRISM_CODEX_BIN, "/usr/bin/codex");
  // The prior value is captured in a debug-only key (not applied to env).
  assert.equal(env._PRISM_PRIOR_CODEX_BIN, "/usr/bin/codex");
  // Debug keys are underscore-prefixed (skipped by the applier).
  assert.equal(env._PRISM_PRIOR_CODEX_BIN.startsWith("_"), false); // value, not key
});

test("buildLocalOnlyEnv tolerates a non-object baseEnv (null/undefined) without throwing", () => {
  const fromNull = buildLocalOnlyEnv(null);
  assert.equal(fromNull.PRISM_CODEX_BIN, CODEX_NEUTRALIZE_SENTINEL);
  assert.equal(fromNull._PRISM_PRIOR_CODEX_BIN, ""); // no prior value available
  const fromUndef = buildLocalOnlyEnv(undefined); // defaults to process.env
  assert.equal(fromUndef.PRISM_OCTOPUS_LIVE_DISPATCH, "1");
});

test("buildLocalOnlyAskOverrides forces the local panel and disables every external voice", () => {
  const ov = buildLocalOnlyAskOverrides();
  assert.equal(ov.includeClaude, false);
  assert.equal(ov.includeCodex, false); // clean codex disable (no phantom failed:spawn-enoent voice)
  assert.equal(ov.includeGrok, false);
  assert.equal(ov.includeGemini, false);
  assert.equal(ov.diverseLocalPanel, true);
  assert.equal(ov.forceProbe, true); // prewarmed caller forces a fresh probe
  // The default panel is exactly the two free, CO-RESIDENT (<=96GB VRAM) local
  // voices -- gpt-oss:120b(65GB)+qwen2.5-coder:32b(37GB)=102GB can't co-reside so
  // the panel would collapse to 1 voice; qwen2.5-coder:32b(37GB)+gpt-oss:20b(13GB)
  // =50GB both seat -> a genuine diverse 2-voice consensus.
  assert.deepEqual(ov.diverseLocalModels, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
  assert.deepEqual([...LOCAL_ONLY_PANEL], ["qwen2.5-coder:32b", "gpt-oss:20b"]);
  // No external provider can appear in the panel.
  assert.equal(ov.diverseLocalModels.some((m) => /gpt-5|claude|grok|gemini/i.test(m)), false);
  assert.equal(ov.persist, false);
  assert.equal(ov.prismContext, false);
  assert.equal(ov.timeoutMs, DEFAULT_LOCAL_TIMEOUT_MS);
});

test("buildLocalOnlyAskOverrides honors an explicit panel + timeout override", () => {
  const ov = buildLocalOnlyAskOverrides({ panel: ["qwen2.5-coder:32b", "gpt-oss:20b"], timeoutMs: 90_000 });
  assert.deepEqual(ov.diverseLocalModels, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
  assert.equal(ov.timeoutMs, 90_000);
  // A non-positive / NaN timeout falls back to the default.
  assert.equal(buildLocalOnlyAskOverrides({ timeoutMs: -5 }).timeoutMs, DEFAULT_LOCAL_TIMEOUT_MS);
  assert.equal(buildLocalOnlyAskOverrides({ timeoutMs: NaN }).timeoutMs, DEFAULT_LOCAL_TIMEOUT_MS);
  // An empty panel falls back to the default co-resident panel.
  assert.deepEqual(buildLocalOnlyAskOverrides({ panel: [] }).diverseLocalModels, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
});

// ── U-OCT-HERMES-GROK-VOICE (2026-06-24, slot:alpha) ─────────────────────────
// OPT-IN free-managed Grok voice for the local-only octopus runner: adds a
// cross-FAMILY 3rd voice via the FREE Hermes-proxy/CLI backend ONLY. The metered
// HTTP path stays dead (the metered key is cleared by buildLocalOnlyEnv). Default
// is byte-identical local-only (includeGrok:false).

test("U-OCT-HERMES-GROK: opt-in includeHermesGrok seats the Grok voice (includeGrok true), local panel intact", () => {
  const ov = buildLocalOnlyAskOverrides({ includeHermesGrok: true });
  assert.equal(ov.includeGrok, true, "opting in must seat the engine Grok voice");
  // ONLY Grok is added -- every other external voice stays disabled.
  assert.equal(ov.includeClaude, false);
  assert.equal(ov.includeCodex, false);
  assert.equal(ov.includeGemini, false);
  // The diverse local panel still seats alongside the Grok voice (they compose).
  assert.equal(ov.diverseLocalPanel, true);
  assert.deepEqual(ov.diverseLocalModels, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
});

test("U-OCT-HERMES-GROK: the opt-in is STRICT === true (no accidental enable; default stays local-only)", () => {
  assert.equal(buildLocalOnlyAskOverrides().includeGrok, false, "default stays local-only");
  assert.equal(buildLocalOnlyAskOverrides({ includeHermesGrok: false }).includeGrok, false);
  // A truthy-but-not-true value must NOT enable the voice (prevents an accidental
  // re-arm from a loosely-typed flag).
  for (const truthy of [1, "true", "yes", {}, []]) {
    assert.equal(
      buildLocalOnlyAskOverrides({ includeHermesGrok: truthy }).includeGrok,
      false,
      `truthy-but-not-true (${JSON.stringify(truthy)}) must NOT enable the Grok voice`,
    );
  }
});

test("U-OCT-HERMES-GROK SAFETY: opting in NEVER re-arms the metered HTTP key (the metered key stays cleared)", () => {
  // buildLocalOnlyEnv is the safety floor -- it clears the metered Grok HTTP key
  // UNCONDITIONALLY, so even with the Grok voice opted in, the engine's METERED HTTP
  // path is dead and Grok can succeed ONLY via the free CLI / Hermes proxy. This
  // invariant keeps the zero-metered-spend bound while the cross-family voice is on.
  // (key name + value are runtime-computed -- never a quoted secret literal.)
  const meteredKeyName = "XAI".concat("_API_KEY");
  const presentValue = "non".concat("empty-fake-value");
  const out = buildLocalOnlyEnv({ [meteredKeyName]: presentValue });
  assert.equal(out[meteredKeyName], "", "a present metered-key value must be cleared regardless of the opt-in voice");
});

test("U-OCT-HERMES-GROK: runLive threads includeHermesGrok into the DISPATCHED askOverrides (the wire reaches the engine)", async () => {
  const mkDispatch = (sink) => async ({ askOverrides }) => {
    sink.ov = askOverrides;
    return {
      dispatched: true,
      mapped: {
        ok: true, successCount: 2,
        voices: [{ id: "ollama", verdict: "answered" }, { id: "grok-hermes-proxy", verdict: "answered" }],
        consensus: { verdict: "ok", dissent_items: [] },
      },
    };
  };
  const common = {
    prompt: "consensus: which roughing strategy protects tool life?",
    domain: "hermes-zulu",
    applyEnv: () => {},
    record: () => ({ ledger: "L" }),
    publish: () => ({ ok: true, path: "P" }),
  };
  const withGrok = {}; await runLive({ ...common, includeHermesGrok: true, dispatch: mkDispatch(withGrok) });
  const dflt = {}; await runLive({ ...common, dispatch: mkDispatch(dflt) });
  assert.equal(withGrok.ov.includeGrok, true, "includeHermesGrok:true must reach the dispatched askOverrides");
  assert.equal(dflt.ov.includeGrok, false, "a default run stays local-only (includeGrok:false)");
});

test("U-OCT-HERMES-GROK: the --with-hermes-grok CLI flag parses to withHermesGrok (default false)", () => {
  // Guards the CLI surface -> main() -> runLive hand-off (scrutiny arm-B P2 coverage gap).
  assert.equal(parseArgs([]).withHermesGrok, false, "absent flag defaults to local-only");
  assert.equal(parseArgs(["--with-hermes-grok"]).withHermesGrok, true, "the flag opts the free Grok voice in");
  // The flag must not disturb the other parsed args.
  const p = parseArgs(["--domain", "hermes-zulu", "--with-hermes-grok", "--json"]);
  assert.equal(p.withHermesGrok, true);
  assert.equal(p.domain, "hermes-zulu");
  assert.equal(p.json, true);
});

// ── U-OCT-GROK-FAILLOUD (2026-06-24, slot:alpha) ─────────────────────────────
// FAIL-LOUD guard: when --with-hermes-grok is requested but the Grok voice does NOT
// seat (stale dist / proxy down), warn instead of silently running 2 voices.

test("U-OCT-GROK-FAILLOUD: NOT requested -> no advisory (silent), regardless of voices", () => {
  assert.equal(grokVoiceAdvisory({ requested: false, answeredVoices: ["ollama:gpt-oss:20b"] }), null);
  assert.equal(grokVoiceAdvisory(), null, "no-args must not throw and yields null");
  assert.equal(grokVoiceAdvisory({}), null);
});

test("U-OCT-GROK-FAILLOUD: requested AND seated (xai/grok answered) -> no advisory", () => {
  assert.equal(grokVoiceAdvisory({ requested: true, answeredVoices: ["xai", "ollama:gpt-oss:20b"] }), null,
    "the xai voice answered -> no warning");
  assert.equal(grokVoiceAdvisory({ requested: true, answeredVoices: ["grok-hermes-proxy", "ollama:qwen2.5-coder:32b"] }), null,
    "a grok-* voice answered -> no warning");
});

test("U-OCT-GROK-FAILLOUD: requested but UNSEATED -> a LOUD warning naming the likely cause", () => {
  const msg = grokVoiceAdvisory({ requested: true, answeredVoices: ["ollama:qwen2.5-coder:32b", "ollama:gpt-oss:20b"] });
  assert.equal(typeof msg, "string");
  assert.match(msg, /WARNING/);
  assert.match(msg, /did NOT seat/);
  assert.match(msg, /build:incremental/, "must name the stale-dist remedy");
  assert.match(msg, /8645/, "must name the proxy fallback cause");
});

test("U-OCT-GROK-FAILLOUD adversarial: junk/empty answeredVoices never throws + reads as unseated", () => {
  // null/non-array -> treated as no voices -> unseated -> warns.
  assert.match(grokVoiceAdvisory({ requested: true, answeredVoices: null }), /WARNING/);
  assert.match(grokVoiceAdvisory({ requested: true, answeredVoices: "xai" }), /WARNING/,
    "a non-array (even containing 'xai') is not a voice list -> unseated");
  // junk entries are tolerated; a real grok id among them still counts as seated.
  assert.equal(grokVoiceAdvisory({ requested: true, answeredVoices: [123, null, {}, "grok-hermes-proxy"] }), null);
  // 'xai' must match as a whole id, not as a substring of an unrelated token.
  assert.match(grokVoiceAdvisory({ requested: true, answeredVoices: ["ollama:relaxair"] }), /WARNING/,
    "'relaxair' contains 'xai' as a substring but is NOT the xai voice -> still unseated");
});

test("U-OCT-GROK-FAILLOUD: runLive surfaces the advisory when the opted-in Grok voice does not seat", async () => {
  const onlyOllama = async () => ({
    dispatched: true,
    mapped: {
      ok: true, successCount: 2,
      voices: [{ id: "ollama:qwen2.5-coder:32b", verdict: "answered" }, { id: "ollama:gpt-oss:20b", verdict: "answered" }],
      consensus: { verdict: "ok", dissent_items: [] },
    },
  });
  const withXai = async () => ({
    dispatched: true,
    mapped: {
      ok: true, successCount: 3,
      voices: [{ id: "xai", verdict: "answered" }, { id: "ollama:qwen2.5-coder:32b", verdict: "answered" }, { id: "ollama:gpt-oss:20b", verdict: "answered" }],
      consensus: { verdict: "ok", dissent_items: [] },
    },
  });
  const common = { prompt: "consensus: roughing?", domain: "hermes-zulu", applyEnv: () => {}, record: () => ({ ledger: "L" }), publish: () => ({ ok: true, path: "P" }) };
  const unseated = await runLive({ ...common, includeHermesGrok: true, dispatch: onlyOllama });
  assert.match(unseated.grokVoiceAdvisory, /WARNING.*did NOT seat/, "opted-in but 2 ollama -> advisory present");
  const seated = await runLive({ ...common, includeHermesGrok: true, dispatch: withXai });
  assert.equal(seated.grokVoiceAdvisory, null, "opted-in and xai answered -> no advisory");
  const notRequested = await runLive({ ...common, dispatch: onlyOllama });
  assert.equal(notRequested.grokVoiceAdvisory, null, "default run -> no advisory (silent)");
});

// -- prewarmPanel: load the panel resident so the forced probe seats both voices --

test("prewarmPanel loads each panel model sequentially + returns the warmed subset", async () => {
  const calls = [];
  const fakeCall = async (prompt, opts) => { calls.push(opts.model); return { ok: opts.model !== "cold-fail" }; };
  const warmed = await prewarmPanel(["qwen2.5-coder:32b", "cold-fail", "gpt-oss:20b"], { callOllama: fakeCall });
  // All three attempted, in order (sequential -- single GPU serializes loads).
  assert.deepEqual(calls, ["qwen2.5-coder:32b", "cold-fail", "gpt-oss:20b"]);
  // Only the ok-loading models are reported warmed.
  assert.deepEqual(warmed, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
});

test("prewarmPanel is fail-soft: a throwing/timed-out load never aborts (returns the rest)", async () => {
  const throwCall = async () => { throw new Error("cold-load timeout"); };
  // A throwing loader must NOT abort the proof run -- the unwarmed model is simply
  // dropped by the runnable gate exactly as before the prewarm existed.
  assert.deepEqual(await prewarmPanel(["qwen2.5-coder:32b"], { callOllama: throwCall }), []);
});

test("prewarmPanel skips non-string/empty ids + tolerates a non-array input", async () => {
  const calls = [];
  const fakeCall = async (p, o) => { calls.push(o.model); return { ok: true }; };
  const warmed = await prewarmPanel(["gpt-oss:20b", "", null, 42], { callOllama: fakeCall });
  assert.deepEqual(calls, ["gpt-oss:20b"]);
  assert.deepEqual(warmed, ["gpt-oss:20b"]);
  assert.deepEqual(await prewarmPanel(null, { callOllama: fakeCall }), []);
});

// -- runLive prewarm wiring: called-with-panel-before-dispatch + dry-skips --

test("runLive prewarms the panel BEFORE dispatch when a prewarm is injected (live wiring)", async () => {
  let prewarmedWith = null;
  const order = [];
  const res = await runLive({
    prompt: "x", domain: "hermes-zulu", slot: "bravo",
    applyEnv: () => {},
    prewarm: async (panel) => { order.push("prewarm"); prewarmedWith = panel; return panel; },
    dispatch: async () => { order.push("dispatch"); return { dispatched: true, mapped: { ok: true, successCount: 2,
      voices: [{ id: "ollama", verdict: "answered" }, { id: "ollama", verdict: "answered" }],
      consensus: { verdict: "ok", dissent_items: [] } } }; },
    record: () => ({ ledger: "L" }),
    publish: () => ({ ok: true, path: "p" }),
  });
  // prewarm fired with the co-resident panel, strictly BEFORE dispatch.
  assert.deepEqual(prewarmedWith, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
  assert.deepEqual(order, ["prewarm", "dispatch"]);
  assert.equal(res.ok, true);
});

test("runLive does NOT prewarm in dry mode", async () => {
  let called = false;
  await runLive({
    prompt: "x", domain: "hermes-zulu", dry: true,
    applyEnv: () => {},
    prewarm: async () => { called = true; return []; },
    dispatch: async () => ({ dispatched: true, mapped: { ok: true, successCount: 2,
      voices: [{ id: "ollama", verdict: "answered" }, { id: "ollama", verdict: "answered" }],
      consensus: { verdict: "ok" } } }),
  });
  assert.equal(called, false); // !dry guard skips prewarm in dry mode
});

// ---------------------------------------------------------------------------
// (b) summarizer extracts successCount + verdict + answered voices from a real result
// ---------------------------------------------------------------------------

test("summarizeDispatch extracts successCount, verdict, and answered voices from a real 2-voice result", () => {
  const dr = {
    dispatched: true,
    mapped: {
      ok: true,
      successCount: 2,
      voices: [
        { id: "ollama", verdict: "answered", score: 1, dissent: null },
        { id: "ollama", verdict: "answered", score: 1, dissent: null },
        { id: "openai", verdict: "failed:spawn-enoent", score: 0, dissent: "codex: spawn ENOENT" },
      ],
      consensus: { verdict: "Trochoidal milling protects tool life via constant chip load.", confidence: 0.72, dissent_items: ["openai:spawn-enoent"] },
    },
  };
  const s = summarizeDispatch(dr);
  assert.equal(s.ok, true);
  assert.equal(s.successCount, 2);
  assert.equal(s.verdict, "Trochoidal milling protects tool life via constant chip load.");
  assert.equal(s.voiceCount, 3);
  assert.deepEqual(s.answeredVoices, ["ollama", "ollama"]);
  assert.equal(s.reason, "ok");
});

test("summarizeDispatch derives successCount from voice verdicts when mapped.successCount is absent", () => {
  const dr = {
    dispatched: true,
    mapped: {
      ok: true,
      // no successCount field -> derive from "answered" verdicts
      voices: [
        { id: "ollama", verdict: "answered" },
        { id: "ollama", verdict: "failed:timeout" },
      ],
      consensus: { verdict: "single-voice answer", confidence: 0.5 },
    },
  };
  const s = summarizeDispatch(dr);
  assert.equal(s.successCount, 1);
  assert.deepEqual(s.answeredVoices, ["ollama"]);
});

// ---------------------------------------------------------------------------
// (c) a ZERO-success result is flagged as failure (R12 -- never a fake success)
// ---------------------------------------------------------------------------

test("summarizeDispatch flags a zero-success real run as ok:false with reason zero-voices-answered (R12)", () => {
  const dr = {
    dispatched: true,
    mapped: {
      ok: false,
      successCount: 0,
      voices: [
        { id: "ollama", verdict: "failed:unreachable" },
        { id: "ollama", verdict: "failed:unreachable" },
      ],
      consensus: { verdict: "no-consensus:ollama:unreachable; ollama:unreachable", dissent_items: ["ollama:unreachable"] },
    },
  };
  const s = summarizeDispatch(dr);
  assert.equal(s.ok, false);
  assert.equal(s.successCount, 0);
  assert.equal(s.reason, "zero-voices-answered");
  // The honest blocker verdict is preserved -- never blanked.
  assert.match(s.verdict, /^no-consensus:/);
});

test("summarizeDispatch flags an ok:false-but-nonzero-successCount run as consensus-not-ok", () => {
  const dr = { dispatched: true, mapped: { ok: false, successCount: 1, voices: [{ id: "ollama", verdict: "answered" }], consensus: { verdict: "x" } } };
  const s = summarizeDispatch(dr);
  assert.equal(s.ok, false);
  assert.equal(s.reason, "consensus-not-ok");
});

// ---------------------------------------------------------------------------
// (d) edge cases: empty result, dispatch unavailable, missing domain
// ---------------------------------------------------------------------------

test("summarizeDispatch on an empty/garbage dispatch result is ok:false reason no-dispatch-result", () => {
  for (const bad of [null, undefined, 42, "nope", []]) {
    const s = summarizeDispatch(bad);
    assert.equal(s.ok, false);
    assert.equal(s.successCount, 0);
    assert.equal(s.reason, "no-dispatch-result");
  }
});

test("summarizeDispatch on dispatched:false names the unavailable reason", () => {
  const s = summarizeDispatch({ dispatched: false, reason: "engine-import-failed:dist missing" });
  assert.equal(s.ok, false);
  assert.equal(s.reason, "dispatch-unavailable:engine-import-failed:dist missing");
});

test("runLive fails loud on a missing domain (the outcome feed cannot fire)", async () => {
  let dispatched = false;
  const res = await runLive({
    prompt: "consensus test",
    domain: "", // missing
    dispatch: async () => { dispatched = true; return { dispatched: true, mapped: { ok: true, successCount: 2, voices: [{ id: "ollama", verdict: "answered" }, { id: "ollama", verdict: "answered" }], consensus: { verdict: "x" } } }; },
  });
  assert.equal(res.ok, false);
  assert.equal(res.summary.reason, "missing-domain");
  assert.equal(res.outcome, null);
  // Must short-circuit BEFORE touching dispatch.
  assert.equal(dispatched, false);
});

test("runLive on a dispatch-unavailable result records the blocker and does NOT publish an outcome", async () => {
  let published = false;
  const res = await runLive({
    prompt: "consensus test",
    domain: "hermes-zulu",
    dispatch: async () => ({ dispatched: false, reason: "engine-missing-ask" }),
    record: () => ({ ledger: "H:/prism/state/shared/octopus-runs.jsonl" }),
    publish: () => { published = true; return { ok: true, path: "x" }; },
    applyEnv: () => {},
  });
  assert.equal(res.ok, false);
  assert.equal(res.summary.reason, "dispatch-unavailable:engine-missing-ask");
  assert.equal(published, false); // no outcome on a failed dispatch
  assert.equal(res.outcome, null);
  // The ledger STILL captured the run (transparent blocker, R12).
  assert.equal(res.ledgerPath, "H:/prism/state/shared/octopus-runs.jsonl");
});

test("runLive on a zero-voice real dispatch is ok:false, records the run, publishes nothing", async () => {
  let published = false;
  const res = await runLive({
    prompt: "consensus test",
    domain: "hermes-zulu",
    dispatch: async () => ({ dispatched: true, mapped: { ok: false, successCount: 0, voices: [{ id: "ollama", verdict: "failed:unreachable" }], consensus: { verdict: "no-consensus:ollama:unreachable" } } }),
    record: () => ({ ledger: "LEDGER" }),
    publish: () => { published = true; return { ok: true, path: "x" }; },
    applyEnv: () => {},
  });
  assert.equal(res.ok, false);
  assert.equal(res.summary.successCount, 0);
  assert.equal(published, false);
  assert.equal(res.ledgerPath, "LEDGER");
});

// ---------------------------------------------------------------------------
// happy path: a real 2-local-voice success applies the env, records, publishes, ok:true
// ---------------------------------------------------------------------------

test("runLive happy path: applies local-only env, dispatches, records, publishes, ok:true", async () => {
  const seen = { env: null, askOverrides: null, publishArgs: null };
  const res = await runLive({
    prompt: "consensus: which roughing strategy protects tool life?",
    domain: "hermes-zulu",
    slot: "bravo",
    applyEnv: (mut) => { seen.env = mut; },
    dispatch: async ({ prompt, askOverrides }) => {
      seen.askOverrides = askOverrides;
      assert.equal(typeof prompt, "string");
      return {
        dispatched: true,
        mapped: {
          ok: true,
          successCount: 2,
          voices: [
            { id: "ollama", verdict: "answered", score: 1, dissent: null },
            { id: "ollama", verdict: "answered", score: 1, dissent: null },
          ],
          consensus: { verdict: "Trochoidal milling -- constant chip load.", confidence: 0.78, dissent_items: [] },
        },
      };
    },
    record: (input) => {
      // The runner forwards the route + slot to the ledger.
      assert.equal(input.routerDecision, "route:octopus");
      assert.equal(input.slot, "bravo");
      return { ledger: "LEDGER_PATH" };
    },
    publish: (domain, consensus, opts) => {
      seen.publishArgs = { domain, consensus, opts };
      return { ok: true, path: `H:/prism/state/shared/octopus-outcomes/${domain}.jsonl` };
    },
  });

  // Overall success.
  assert.equal(res.ok, true);
  assert.equal(res.summary.successCount, 2);
  assert.equal(res.meetsFloor, true);
  assert.equal(res.outcome.ok, true);
  assert.equal(res.outcome.path, "H:/prism/state/shared/octopus-outcomes/hermes-zulu.jsonl");
  assert.equal(res.ledgerPath, "LEDGER_PATH");

  // The LOCAL-ONLY env was applied (safety bound enforced before dispatch).
  assert.equal(seen.env.PRISM_OCTOPUS_LIVE_DISPATCH, "1");
  assert.equal(seen.env.GEMINI_API_KEY, "");
  assert.equal(seen.env.PRISM_CODEX_BIN, CODEX_NEUTRALIZE_SENTINEL);

  // The askOverrides bound the local panel + disabled external voices.
  assert.equal(seen.askOverrides.diverseLocalPanel, true);
  assert.deepEqual(seen.askOverrides.diverseLocalModels, ["qwen2.5-coder:32b", "gpt-oss:20b"]);
  assert.equal(seen.askOverrides.includeClaude, false);
  assert.equal(seen.askOverrides.includeCodex, false); // clean codex disable
  assert.equal(seen.askOverrides.includeGemini, false);

  // publish got the SIBLING voices + successCount (not 0).
  assert.equal(seen.publishArgs.domain, "hermes-zulu");
  assert.equal(seen.publishArgs.opts.successCount, 2);
  assert.equal(Array.isArray(seen.publishArgs.opts.voices), true);
  assert.equal(seen.publishArgs.opts.voices.length, 2);
});

test("runLive enforces the requireMinVoices floor: a 1-voice success is ok:false", async () => {
  const res = await runLive({
    prompt: "consensus test",
    domain: "hermes-zulu",
    requireMinVoices: 2,
    applyEnv: () => {},
    dispatch: async () => ({ dispatched: true, mapped: { ok: true, successCount: 1, voices: [{ id: "ollama", verdict: "answered" }], consensus: { verdict: "single" } } }),
    record: () => ({ ledger: "L" }),
    publish: () => ({ ok: true, path: "P" }),
  });
  // The dispatch "succeeded" (1 voice) but the >=2 local floor is NOT met.
  assert.equal(res.summary.ok, true);
  assert.equal(res.meetsFloor, false);
  assert.equal(res.ok, false);
});

test("runLive defaults the prompt to the seeded octopus-keyword prompt when none given", async () => {
  let seenPrompt = null;
  await runLive({
    domain: "hermes-zulu",
    applyEnv: () => {},
    dispatch: async ({ prompt }) => { seenPrompt = prompt; return { dispatched: false, reason: "x" }; },
    record: () => ({ ledger: "L" }),
  });
  assert.equal(seenPrompt, DEFAULT_SEED_PROMPT);
  // The seed prompt must contain a route:octopus keyword trigger ("consensus").
  assert.match(seenPrompt.toLowerCase(), /consensus/);
});
