// R9 coverage for the test-rigor-judge CLI fallback ladder (Ollama -> Hermes).
// Pins: provider order, first-non-empty-wins, ollama-throw-falls-through,
// both-fail-throws (R12 never fabricates a verdict), and the hermes-model-routing
// fix (commit 02641a95ca) -- opts.model is an OLLAMA id and must NOT be forwarded
// to Hermes (different namespace -> HTTP 400); Hermes receives opts.hermesModel.
// The real callOllama/callHermes do network IO, so callJudge accepts injected
// `callers` for hermetic testing.
// Run: node scripts/test-rigor-judge-cli.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { callJudge } from "./test-rigor-judge.mjs";

const RESP = '{"rigorScore":80,"wouldCatchRegression":true,"verdict":"rigorous","missingCoverage":[],"rationale":"ok"}';

test("ollama answers first -> via:ollama, hermes NOT called", async () => {
  let hermesCalls = 0;
  const r = await callJudge("p", {}, {
    ollama: async () => RESP,
    hermes: async () => { hermesCalls++; return RESP; },
  });
  assert.equal(r.via, "ollama");
  assert.equal(r.text, RESP);
  assert.equal(hermesCalls, 0); // ollama success short-circuits the ladder
});

test("ollama empty -> falls through to hermes", async () => {
  const r = await callJudge("p", {}, { ollama: async () => "", hermes: async () => RESP });
  assert.equal(r.via, "hermes");
});

test("ollama throws -> falls through to hermes (error not propagated)", async () => {
  const r = await callJudge("p", {}, {
    ollama: async () => { throw new Error("ECONNREFUSED"); },
    hermes: async () => RESP,
  });
  assert.equal(r.via, "hermes");
});

test("both empty -> throws 'all providers failed' (R12: never fabricate a verdict)", async () => {
  await assert.rejects(
    () => callJudge("p", {}, { ollama: async () => "", hermes: async () => "   " }),
    /all providers failed/,
  );
});

test("both throw -> rejects, aggregating BOTH provider errors", async () => {
  await assert.rejects(
    () => callJudge("p", {}, {
      ollama: async () => { throw new Error("ollama-down"); },
      hermes: async () => { throw new Error("hermes-down"); },
    }),
    /ollama-down[\s\S]*hermes-down/,
  );
});

test("hermesFirst:true tries hermes before ollama", async () => {
  const calls = [];
  const r = await callJudge("p", { hermesFirst: true }, {
    ollama: async () => { calls.push("ollama"); return RESP; },
    hermes: async () => { calls.push("hermes"); return RESP; },
  });
  assert.equal(r.via, "hermes");
  assert.deepEqual(calls, ["hermes"]); // ollama never reached
});

test("HERMES-MODEL FIX (02641a95ca): opts.model -> OLLAMA only; hermes gets opts.hermesModel, never opts.model", async () => {
  let ollamaModel, hermesModel;
  await callJudge("p", { model: "gpt-oss:120b", hermesModel: "grok-1" }, {
    ollama: async (_p, m) => { ollamaModel = m; return ""; }, // empty -> fall to hermes
    hermes: async (_p, m) => { hermesModel = m; return RESP; },
  });
  assert.equal(ollamaModel, "gpt-oss:120b");   // ollama receives opts.model
  assert.equal(hermesModel, "grok-1");          // hermes receives opts.hermesModel
  assert.notEqual(hermesModel, "gpt-oss:120b"); // the bug forwarded the ollama id -> HTTP 400
});

test("default OLLAMA model is applied (not undefined) when opts.model absent", async () => {
  let ollamaModel;
  await callJudge("p", {}, {
    ollama: async (_p, m) => { ollamaModel = m; return RESP; },
    hermes: async () => RESP,
  });
  assert.equal(typeof ollamaModel, "string");
  assert.ok(ollamaModel.length > 0); // DEFAULT_MODEL applied, never passed undefined
});
