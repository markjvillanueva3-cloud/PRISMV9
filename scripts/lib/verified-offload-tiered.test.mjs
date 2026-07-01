// R9 coverage for the tiered verified-offload ladder (Hermes -> Ollama -> fallback).
// Pins the SAFETY + TIERING contract of verified-offload-tiered.mjs:
//   - the verifier gates EVERY tier (a hallucinated STRONG answer is rejected,
//     never trusted -- the load-bearing safety invariant);
//   - strong success short-circuits (Ollama never called);
//   - empty / throw / verify-fail at the strong tier DESCENDS to Ollama;
//   - both tiers failing falls back to the trusted floor (source 'kept');
//   - telemetry records the correct source + a tokensSaved estimate ONLY for an
//     off-Claude offload (hermes / ollama-fallback), 0 for a kept;
//   - the real runner factories + the stats recorder behave fail-safe.
// Fully hermetic: runners + telemetry sink + fetch/ollama callers are injected,
// zero network. Run: node scripts/lib/verified-offload-tiered.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import {
  verifiedTieredOffload,
  makeHermesRunner,
  makeOllamaRunner,
  recordTieredUsage,
  DEFAULT_OLLAMA_TIMEOUT_MS,
} from "./verified-offload-tiered.mjs";

// A verifier that accepts exactly "GOOD" (snaps to a canonical value), else fails.
const onlyGood = (raw) => (String(raw).trim() === "GOOD" ? { ok: true, value: "GOOD" } : false);
const FALLBACK = async () => "CLAUDE";
const sinkInto = (arr) => (call) => arr.push(call);

// ---- tier dispatch + short-circuit ----
test("strong: Hermes verifies -> source 'hermes', Ollama NEVER called", async () => {
  let ollamaCalls = 0;
  const rec = [];
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "GOOD",
    ollamaRun: async () => { ollamaCalls++; return "GOOD"; },
    mode: "classify", input: "x", record: sinkInto(rec),
  });
  assert.equal(r.source, "hermes");
  assert.equal(r.tier, "strong");
  assert.equal(r.value, "GOOD");
  assert.equal(r.verified, true);
  assert.equal(ollamaCalls, 0); // strong success short-circuits the ladder
  assert.equal(rec.length, 1);
  assert.equal(rec[0].source, "hermes");
  assert.ok(rec[0].tokensSaved > 0); // an off-Claude offload saves estimated tokens
});

test("strong: Hermes EMPTY -> descends -> Ollama verifies -> source 'ollama-fallback'", async () => {
  const rec = [];
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "", // empty -> verifiedOffload run-empty -> descend
    ollamaRun: async () => "GOOD",
    record: sinkInto(rec),
  });
  assert.equal(r.source, "ollama-fallback");
  assert.equal(r.tier, "local");
  assert.equal(r.value, "GOOD");
  assert.equal(rec[0].source, "ollama-fallback");
  assert.ok(rec[0].tokensSaved > 0);
});

test("strong: Hermes THROWS -> descends -> Ollama verifies", async () => {
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => { throw new Error("ECONNREFUSED"); },
    ollamaRun: async () => "GOOD",
    record: () => {},
  });
  assert.equal(r.source, "ollama-fallback");
  assert.equal(r.value, "GOOD");
});

// ---- THE safety invariant ----
test("ADVERSARIAL: a HALLUCINATED strong answer fails the verifier and is REJECTED (not trusted)", async () => {
  let descended = false;
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "TOTALLY-WRONG-HALLUCINATION", // verifier rejects -> must NOT be returned
    ollamaRun: async () => { descended = true; return "GOOD"; },
    record: () => {},
  });
  assert.equal(descended, true, "must descend past an unverifiable strong answer");
  assert.equal(r.source, "ollama-fallback");
  assert.equal(r.value, "GOOD");
  assert.notEqual(r.value, "TOTALLY-WRONG-HALLUCINATION"); // the hallucination never surfaces
});

test("ADVERSARIAL: BOTH tiers produce garbage -> trusted fallback, source 'kept', verified:false", async () => {
  const rec = [];
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "junk-1",
    ollamaRun: async () => "junk-2",
    record: sinkInto(rec),
  });
  assert.equal(r.source, "kept");
  assert.equal(r.tier, "fallback");
  assert.equal(r.value, "CLAUDE"); // the trusted floor
  assert.equal(r.verified, false);
  assert.equal(r.fellBack, true);
  assert.equal(rec[0].source, "kept");
  assert.equal(rec[0].tokensSaved, 0); // a kept saves nothing
});

test("tier 'local' SKIPS Hermes even when a hermesRun is provided", async () => {
  let hermesCalls = 0;
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK, tier: "local",
    hermesRun: async () => { hermesCalls++; return "GOOD"; },
    ollamaRun: async () => "GOOD",
    record: () => {},
  });
  assert.equal(hermesCalls, 0);
  assert.equal(r.source, "ollama-fallback");
});

test("no Ollama runner -> straight to trusted fallback, reason 'no-ollama-runner'", async () => {
  const rec = [];
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "", // hermes empty, no ollama tier
    record: sinkInto(rec),
  });
  assert.equal(r.source, "kept");
  assert.equal(r.reason, "no-ollama-runner");
  assert.equal(r.value, "CLAUDE");
  assert.equal(rec[0].source, "kept");
});

test("verifier returns a PARSED value object -> .value is the object; tokensSaved still estimated", async () => {
  const rec = [];
  const parsed = { label: "steel", n: 7 };
  const r = await verifiedTieredOffload({
    verify: () => ({ ok: true, value: parsed }),
    fallback: FALLBACK,
    hermesRun: async () => '{"label":"steel","n":7}',
    input: "classify this",
    record: sinkInto(rec),
  });
  assert.deepEqual(r.value, parsed);
  assert.equal(r.source, "hermes");
  assert.ok(rec[0].tokensSaved > 0);
});

// ---- guards ----
test("throws when verify is not a function", async () => {
  await assert.rejects(() => verifiedTieredOffload({ fallback: FALLBACK }), /verify must be a function/);
});

test("throws when fallback is missing (no auto-offload without a trusted floor)", async () => {
  await assert.rejects(() => verifiedTieredOffload({ verify: onlyGood }), /fallback is REQUIRED/);
});

test("telemetry sink throwing does NOT break the offload (fail-safe)", async () => {
  const r = await verifiedTieredOffload({
    verify: onlyGood, fallback: FALLBACK,
    hermesRun: async () => "GOOD",
    record: () => { throw new Error("telemetry exploded"); },
  });
  assert.equal(r.source, "hermes"); // result still returned despite the sink throwing
});

// ---- makeHermesRunner (real runner factory, injected fetch) ----
const okResponse = (content) => ({ ok: true, json: async () => ({ choices: [{ message: { content } }] }) });

test("makeHermesRunner: good OpenAI response -> returns the content", async () => {
  const run = makeHermesRunner({ mode: "classify", input: "x", model: "grok-4.3", fetchImpl: async () => okResponse("GOOD") });
  assert.equal(await run(), "GOOD");
});

test("makeHermesRunner: NO model still sends a real model id (regression: classify-strong CLI sent model:undefined -> proxy reject -> silent descend)", async () => {
  let sentModel = "absent";
  const run = makeHermesRunner({ mode: "classify", input: "x", fetchImpl: async (_url, opts) => { sentModel = JSON.parse(opts.body).model; return okResponse("GOOD"); } });
  assert.equal(await run(), "GOOD");
  assert.equal(typeof sentModel, "string");
  assert.ok(sentModel.length > 0, "a Hermes chat must carry a model id, never undefined");
});

test("makeHermesRunner: HTTP !ok -> '' (descend)", async () => {
  const run = makeHermesRunner({ input: "x", fetchImpl: async () => ({ ok: false, status: 500 }) });
  assert.equal(await run(), "");
});

test("makeHermesRunner: a fetch throw -> '' (never throws out of the runner)", async () => {
  const run = makeHermesRunner({ input: "x", fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(await run(), "");
});

test("makeHermesRunner: refusal / empty content -> '' via parseChatResponse", async () => {
  const run = makeHermesRunner({ input: "x", fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }) }) });
  assert.equal(await run(), "");
});

// ---- makeOllamaRunner ----
test("makeOllamaRunner: ok result -> text; not-ok -> ''", async () => {
  const okRun = makeOllamaRunner({ input: "x", callImpl: async () => ({ ok: true, text: "LOCAL" }) });
  assert.equal(await okRun(), "LOCAL");
  const badRun = makeOllamaRunner({ input: "x", callImpl: async () => ({ ok: false }) });
  assert.equal(await badRun(), "");
});

test("makeOllamaRunner: forwards the env-knobbed default timeout; explicit overrides it", async () => {
  // Regression lock for U-HERMES-TIER-OLLAMA-TIMEOUT-KNOB: the ollama tier hardcoded
  // timeoutMs:30000 (no env knob) while the hermes tier was env-tunable. This pins
  // (a) the runner forwards the MODULE default to the caller (hermetic -- asserts against
  // the imported constant, so it holds for ANY PRISM_TIERED_OLLAMA_TIMEOUT_MS value), and
  // (b) the unset default is 30000 (loud value-pin: fails clearly if the env var is set).
  let seen = -1;
  const run = makeOllamaRunner({ input: "x", callImpl: async (_input, opts) => { seen = opts.timeoutMs; return { ok: true, text: "L" }; } });
  await run();
  assert.equal(seen, DEFAULT_OLLAMA_TIMEOUT_MS, "the module default timeout is forwarded to the caller (wiring)");
  assert.equal(DEFAULT_OLLAMA_TIMEOUT_MS, 30000, "ollama-tier default is 30000 when PRISM_TIERED_OLLAMA_TIMEOUT_MS is unset");
  let seen2 = -1;
  const run2 = makeOllamaRunner({ input: "x", timeoutMs: 5000, callImpl: async (_i, o) => { seen2 = o.timeoutMs; return { ok: true, text: "L" }; } });
  await run2();
  assert.equal(seen2, 5000, "an explicit timeoutMs overrides the default");
});

// ---- recordTieredUsage (canonical offload-stats fold, fail-safe) ----
test("recordTieredUsage: folds byHook['ask-hermes'] (fired/offloaded/bySource) into the stats file", () => {
  const tmp = path.join(os.tmpdir(), `tiered-stats-${process.pid}-${Math.floor(performance.now())}.json`);
  fs.writeFileSync(tmp, JSON.stringify({ byHook: {} }, null, 2));
  try {
    assert.equal(recordTieredUsage({ source: "hermes", mode: "classify", tokensSaved: 42 }, { statsPath: tmp }), true);
    const stats = JSON.parse(fs.readFileSync(tmp, "utf8"));
    const h = stats.byHook["ask-hermes"];
    assert.equal(h.fired, 1);
    assert.equal(h.offloaded, 1);
    assert.equal(h.bySource.hermes, 1);
    assert.equal(h.tokensSaved, 42);
    // a 'kept' increments fired + kept, not offloaded
    recordTieredUsage({ source: "kept", mode: "classify" }, { statsPath: tmp });
    const s2 = JSON.parse(fs.readFileSync(tmp, "utf8"));
    assert.equal(s2.byHook["ask-hermes"].fired, 2);
    assert.equal(s2.byHook["ask-hermes"].kept, 1);
    assert.equal(s2.byHook["ask-hermes"].offloaded, 1);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

test("recordTieredUsage: MISSING stats file -> false (never creates a parallel store)", () => {
  const missing = path.join(os.tmpdir(), `does-not-exist-${process.pid}.json`);
  assert.equal(recordTieredUsage({ source: "hermes" }, { statsPath: missing }), false);
  assert.equal(fs.existsSync(missing), false); // never created
});

test("recordTieredUsage: garbage (non-JSON) stats file -> false, never throws", () => {
  const tmp = path.join(os.tmpdir(), `garbage-stats-${process.pid}.json`);
  fs.writeFileSync(tmp, "not json {{{");
  try {
    assert.equal(recordTieredUsage({ source: "hermes" }, { statsPath: tmp }), false);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});
