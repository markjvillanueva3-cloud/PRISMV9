// tier: T4
// Tests for scripts/ask-ollama.mjs host-aware model wiring
// (BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-CONSUMERS).
//
// node:test — hermetic: runRequest's I/O (graph load, Ollama call, resolver) is
// fully injected via deps, so NO real Ollama / GPU / filesystem is touched.
//
// Run: node --test H:/prism/scripts/ask-ollama.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { runRequest, pickModel, callOllama, looksLikeNcProgram, readStdin, parseArgs, recordExecution } from "./ask-ollama.mjs";

// Minimal fake Response for an injected fetchImpl.
const fakeRes = (jsonBody) => ({ ok: true, json: async () => jsonBody, text: async () => "" });

const VIZ = (model) => ({ mode: "viz", input: "token", flags: { model, synth: true, json: false, maxHits: 3, timeout: 180000 } });
const stubGraph = () => ({ ok: true, graph: { nodes: [] } });

test("pickModel: explicit override wins, else the kept DEFAULT_MODEL (32b)", () => {
  // explicit override is honoured verbatim (gpt-oss:120b = a kept, pulled model)
  assert.equal(pickModel("gpt-oss:120b"), "gpt-oss:120b");
  assert.equal(pickModel("  foo  "), "foo");
  // DEFAULT_MODEL is the kept floor (qwen2.5-coder:32b) after the small models
  // were retired (BLACKWELL-MODEL-UPGRADE-PLAN) — never a deleted tag.
  assert.equal(pickModel(""), "qwen2.5-coder:32b");
  assert.equal(pickModel(null), "qwen2.5-coder:32b");
});

test("no --model → the host-resolved model (32b on Blackwell) is threaded into callOllama", async () => {
  let usedModel = null;
  const r = await runRequest(VIZ(""), {
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b", source: "blackwell-best" }),
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(r.exitCode, 0);
  assert.equal(usedModel, "qwen2.5-coder:32b"); // the resolver's pick reached the model call
});

test("explicit --model wins and the resolver is NOT consulted (operator intent)", async () => {
  let resolverCalled = false;
  let usedModel = null;
  await runRequest(VIZ("gpt-oss:120b"), {
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "qwen2.5-coder:32b" }; },
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "gpt-oss:120b");
  assert.equal(resolverCalled, false);
});

test("fail-soft: resolver yields no model → DEFAULT_MODEL (never a phantom/empty model)", async () => {
  let usedModel = null;
  await runRequest(VIZ(""), {
    resolveSynthesisModel: async () => ({ model: null }),
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b");
});

test("non-synth viz path skips the model entirely (no resolver/callOllama needed)", async () => {
  let resolverCalled = false;
  const r = await runRequest(
    { mode: "viz", input: "token", flags: { model: "", synth: false, json: true, maxHits: 3, timeout: 180000 } },
    { resolveSynthesisModel: async () => { resolverCalled = true; return { model: "x" }; }, loadGraph: stubGraph },
  );
  assert.equal(r.exitCode, 0);
  // resolver still runs at the top of runRequest (cheap, fail-soft) but no model call happens
  assert.equal(resolverCalled, true);
});

// ── callOllama num_predict + harmony-format handling (2026-06-08, golf) ──────
// Regression: finishing the gpt-oss:120b pull made the router select it for
// best-tier synthesis, but reasoning models emit a `thinking` channel BEFORE
// `response`; the old code sent NO num_predict (Ollama default 128) and read
// only `.response`, so 120b returned empty → silent synergy failure.

test("callOllama sends a num_predict budget (default 1024) so reasoning models can finish", async () => {
  let sentBody = null;
  const r = await callOllama("gpt-oss:120b", "hi", {
    fetchImpl: async (_url, init) => { sentBody = JSON.parse(init.body); return fakeRes({ response: "answer", eval_count: 5 }); },
  });
  assert.equal(r.ok, true);
  assert.equal(r.text, "answer");
  assert.equal(sentBody.options.num_predict, 1024); // budget present, not Ollama's starving 128 default
});

test("callOllama honors an explicit numPredict override", async () => {
  let sentBody = null;
  await callOllama("gpt-oss:120b", "hi", {
    numPredict: 4096,
    fetchImpl: async (_url, init) => { sentBody = JSON.parse(init.body); return fakeRes({ response: "x" }); },
  });
  assert.equal(sentBody.options.num_predict, 4096);
});

test("callOllama: reasoning model truncated (thinking filled, response empty, done_reason=length) → honest diagnostic, not generic empty", async () => {
  const r = await callOllama("gpt-oss:120b", "hi", {
    numPredict: 32,
    fetchImpl: async () => fakeRes({ response: "", thinking: "the user wants X so I should...", done_reason: "length" }),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /reasoning model truncated/);
  assert.match(r.error, /num_predict \(current 32\)/); // surfaces the real cause + the budget to raise
});

test("callOllama: genuinely empty (no thinking, not length) still returns the generic empty error", async () => {
  const r = await callOllama("qwen2.5-coder:32b", "hi", {
    fetchImpl: async () => fakeRes({ response: "   ", done_reason: "stop" }),
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, "Ollama returned an empty response");
});

test("callOllama: normal non-reasoning response path unaffected (response read, trimmed)", async () => {
  const r = await callOllama("qwen2.5-coder:32b", "hi", {
    fetchImpl: async () => fakeRes({ response: "  climb milling is...  ", eval_count: 12 }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.text, "climb milling is...");
  assert.equal(r.evalCount, 12);
});

// -- stdin pipe mode + NC/G-code safety-routing guard (RTK-LLM upgrade, 2026-06-10) --
// The rtk-complementary seam: `rtk grep foo | ask-ollama summarize -` pipes command
// output to a local model. The mandatory guard refuses to route NC/G-code PROGRAM
// output to a non-Claude model (PRISM safety-routing rule).

const NC_PROGRAM = [
  "N10 G0 X0 Y0", "N20 G1 Z-0.1 F10", "N30 G2 X1 Y1 I0.5 J0",
  "N40 M03 S1200", "N50 G1 X2 Y2", "N60 M30",
].join("\n");

const FILE_FLAGS = (extra = {}) => ({ model: "qwen2.5-coder:32b", json: false, allowUnsafe: false, timeout: 180000, ...extra });

test("looksLikeNcProgram: dense NC program flagged; prose + single-stray-block dump are NOT", () => {
  assert.equal(looksLikeNcProgram(["%", "O1234", NC_PROGRAM].join("\n")), true);
  const prose = "This function gets the value.\nIt returns a result.\nNo codes here.\nGood morning all.\nAll clear now.";
  assert.equal(looksLikeNcProgram(prose), false);
  // a triage/error dump that happens to mention ONE G-code line must NOT be flagged
  const dump = ["Error: build failed", "stack: foo.ts:10", "G01 X1 was in a comment", "more log", "another line", "final"].join("\n");
  assert.equal(looksLikeNcProgram(dump), false);
  assert.equal(looksLikeNcProgram(""), false);
  assert.equal(looksLikeNcProgram(null), false);
});

test("looksLikeNcProgram: broadened coverage -- continuation-heavy ISO + Heidenhain flagged; bare coordinate table is NOT (3-of-3 P2 close)", () => {
  // ISO program dominated by MODAL coordinate-continuation lines (no leading G/M word):
  // the exact false-negative reviewers A+C found -- now caught via two-tier counting.
  const contHeavy = ["O0001", "G0 X0 Y0", "G1 Z-0.1 F10", "X5.0 Y2.5", "X6.0 Y3.0", "Z-0.5", "X7.0 Y4.0", "M30"].join("\n");
  assert.equal(looksLikeNcProgram(contHeavy), true);
  // Heidenhain conversational dialect -- previously missed entirely.
  const heid = ["0 BEGIN PGM TEST MM", "1 TOOL CALL 5 Z S2000", "2 L X+10 Y+5 R0 FMAX", "3 L Z-2 F250", "4 CYCL DEF 200 DRILLING", "5 END PGM TEST MM"].join("\n");
  assert.equal(looksLikeNcProgram(heid), true);
  // a plain coordinate data table with NO G/M or Heidenhain context must NOT flag:
  // continuation lines only count when >= NC_STRONG_MIN strong signals exist (FP guard).
  const coordTable = ["X1.0 Y1.0", "X2.0 Y2.0", "X3.0 Y3.0", "X4.0 Y4.0", "X5.0 Y5.0", "X6.0 Y6.0"].join("\n");
  assert.equal(looksLikeNcProgram(coordTable), false);
});

test("readStdin: reads an injected stream into the file shape; whitespace-only refuses", async () => {
  const r = await readStdin({ stream: [Buffer.from("hello "), Buffer.from("world")] });
  assert.equal(r.ok, true);
  assert.equal(r.content, "hello world");
  assert.equal(r.truncated, false);
  const empty = await readStdin({ stream: [Buffer.from("   ")] });
  assert.equal(empty.ok, false);
  assert.match(empty.error, /stdin was empty/);
});

test("readStdin: caps at maxBytes and flags truncation", async () => {
  const r = await readStdin({ stream: [Buffer.from("x".repeat(50))], maxBytes: 10 });
  assert.equal(r.ok, true);
  assert.equal(r.content.length, 10);
  assert.equal(r.truncated, true);
});

test("runRequest: file mode with '-' reads stdin (never a file) and labels the prompt (stdin)", async () => {
  let prompt = null;
  let readFileCalled = false;
  const r = await runRequest(
    { mode: "summarize", input: "-", flags: FILE_FLAGS() },
    {
      readStdin: async () => ({ ok: true, content: "piped grep output\nsrc/foo.ts:1: a match", bytes: 38, truncated: false }),
      readFileCapped: () => { readFileCalled = true; return { ok: false, error: "should not touch the filesystem" }; },
      callModel: async (_m, p) => { prompt = p; return { ok: true, text: "digest" }; },
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(readFileCalled, false);        // "-" routed to stdin, never the filesystem
  assert.match(prompt, /\(stdin\)/);          // synthetic filename in the prompt
  assert.match(prompt, /piped grep output/);  // the piped content reached the model
  assert.match(r.output, /digest/);
});

test("runRequest: NC/G-code program piped to stdin is REFUSED (safety-routing); model never called", async () => {
  let modelCalled = false;
  const r = await runRequest(
    { mode: "summarize", input: "-", flags: FILE_FLAGS() },
    {
      readStdin: async () => ({ ok: true, content: NC_PROGRAM, bytes: NC_PROGRAM.length, truncated: false }),
      callModel: async () => { modelCalled = true; return { ok: true, text: "x" }; },
    },
  );
  assert.equal(r.exitCode, 2);
  assert.equal(modelCalled, false);           // safety: NC output never routed to a local model
  assert.match(r.output, /refusing to route NC\/G-code/);
});

test("runRequest: --allow-unsafe overrides the NC guard (operator deems content non-safety)", async () => {
  let modelCalled = false;
  const r = await runRequest(
    { mode: "summarize", input: "-", flags: FILE_FLAGS({ allowUnsafe: true }) },
    {
      readStdin: async () => ({ ok: true, content: NC_PROGRAM, bytes: NC_PROGRAM.length, truncated: false }),
      callModel: async () => { modelCalled = true; return { ok: true, text: "ok" }; },
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(modelCalled, true);            // override lets it through
});

test("parseArgs: --allow-unsafe sets the flag; '-' is a valid file-mode input", () => {
  const p = parseArgs(["summarize", "-", "--allow-unsafe"]);
  assert.equal(p.error, undefined);
  assert.equal(p.mode, "summarize");
  assert.equal(p.input, "-");
  assert.equal(p.flags.allowUnsafe, true);
  assert.equal(parseArgs(["summarize", "-"]).flags.allowUnsafe, false);
});

// -- U-OFFLOAD-ACTION (2026-06-12): executed-offload telemetry ----------------
// runRequest attaches MEASURED telemetry on success so main() records an
// EXECUTED offload event -- the dashboard previously counted only directives
// ISSUED by hooks, so actual adoption was invisible. Failure paths attach none.

test("runRequest: file-mode success attaches measured telemetry (in/out chars)", async () => {
  const content = "x".repeat(400);
  const r = await runRequest(
    { mode: "summarize", input: "-", flags: FILE_FLAGS() },
    {
      readStdin: async () => ({ ok: true, content, bytes: 400, truncated: false }),
      callModel: async () => ({ ok: true, text: "tiny digest" }),
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(r.telemetry.mode, "summarize");
  assert.equal(r.telemetry.inChars, 400);
  assert.equal(r.telemetry.outChars, "tiny digest".length);
});

test("runRequest: ask-mode success attaches telemetry; model FAILURE attaches none", async () => {
  const ok = await runRequest(
    { mode: "ask", input: "what is a spindle taper", flags: FILE_FLAGS() },
    { callModel: async () => ({ ok: true, text: "an answer" }) },
  );
  assert.equal(ok.exitCode, 0);
  assert.equal(ok.telemetry.mode, "ask");
  const fail = await runRequest(
    { mode: "ask", input: "what is a spindle taper", flags: FILE_FLAGS() },
    { callModel: async () => ({ ok: false, error: "boom" }) },
  );
  assert.equal(fail.exitCode, 3);
  assert.equal(fail.telemetry, undefined, "no execution happened -> no executed event may be recorded");
});

test("recordExecution: records decision:'offload' / extras.mode:'executed' with measured token delta", async () => {
  let recorded = null;
  const ok = await recordExecution(
    { mode: "summarize", model: "qwen2.5-coder:32b", inChars: 4000, outChars: 400 },
    async () => ({ recordOllamaEvent: (e) => { recorded = e; } }),
  );
  assert.equal(ok, true);
  assert.equal(recorded.hook, "ask-ollama");
  assert.equal(recorded.decision, "offload");
  assert.equal(recorded.category, "summarize");
  assert.equal(recorded.extras.mode, "executed");
  assert.equal(recorded.extras.model, "qwen2.5-coder:32b");
  assert.ok(recorded.tokensSaved > 0, "in >> out must yield positive measured savings");
});

test("recordExecution: ADVERSARIAL -- lib import failure or knob=0 -> false, never throws, never imports", async () => {
  const failImport = await recordExecution(
    { mode: "ask", model: "m", inChars: 10, outChars: 1 },
    async () => { throw new Error("stats lib missing"); },
  );
  assert.equal(failImport, false);
  process.env.PRISM_ASK_OLLAMA_TELEMETRY = "0";
  try {
    let imported = false;
    const off = await recordExecution(
      { mode: "ask", model: "m", inChars: 10, outChars: 1 },
      async () => { imported = true; return { recordOllamaEvent: () => {} }; },
    );
    assert.equal(off, false);
    assert.equal(imported, false, "knob=0 must short-circuit before any import");
  } finally {
    delete process.env.PRISM_ASK_OLLAMA_TELEMETRY;
  }
});
