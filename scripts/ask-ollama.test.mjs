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
import { runRequest, pickModel, callOllama, looksLikeNcProgram, readStdin, parseArgs, recordExecution, recordFailure, shouldRecordFailure, loadWarmModels, OFFLOAD_LOADED_PREFERENCE, buildCodegenPrompt, looksLikeGcodeRequest, CODER_LOADED_PREFERENCE, callModel, defaultNumCtxForPrompt } from "./ask-ollama.mjs";

// SUBSTRATE-UTIL (w0yjhqcp9): ask-ollama viz now tries the warm :3101 daemon FIRST. Disable it
// here so the real searchViaDaemon resolves null -> these injected-deps viz tests stay hermetic
// (no live daemon). The daemon-first + fallback paths are covered explicitly by the two
// viz-daemon tests at the end of this file (they inject deps.searchViaDaemon, bypassing this).
process.env.PRISM_INDEX_DAEMON_DISABLE = "1";

// Minimal fake Response for an injected fetchImpl.
const fakeRes = (jsonBody) => ({ ok: true, json: async () => jsonBody, text: async () => "" });

const VIZ = (model) => ({ mode: "viz", input: "token", flags: { model, synth: true, json: false, maxHits: 3, timeout: 180000 } });
const stubGraph = () => ({ ok: true, graph: { nodes: [] } });

test("viz: prefers the WARM daemon when it returns hits (no in-process graph load)", async () => {
  let loadGraphCalled = false;
  const r = await runRequest(
    { mode: "viz", input: "mill", flags: { model: "", synth: false, json: false, maxHits: 3, timeout: 180000 } },
    {
      loadWarmModels: async () => [],
      resolveSynthesisModel: async () => ({ model: "x" }),
      searchViaDaemon: async () => ({ tokens: ["mill"], hits: [{ id: "eng.mill", label: "mill", layer: "L5", status: "stub" }] }),
      loadGraph: () => { loadGraphCalled = true; return { ok: true, graph: { nodes: [] } }; },
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(loadGraphCalled, false, "daemon hits used -> in-process graph NOT loaded (the coverage win)");
  assert.match(r.output, /eng\.mill/, "daemon hit rendered");
  assert.match(r.output, /warm master-index daemon/, "daemon-source footer");
});

test("viz: falls back to the in-process graph when the daemon misses (zero behavior change)", async () => {
  let loadGraphCalled = false;
  const r = await runRequest(
    { mode: "viz", input: "token", flags: { model: "", synth: false, json: false, maxHits: 3, timeout: 180000 } },
    {
      loadWarmModels: async () => [],
      resolveSynthesisModel: async () => ({ model: "x" }),
      searchViaDaemon: async () => null, // daemon down / disabled / empty -> fall back
      loadGraph: () => { loadGraphCalled = true; return { ok: true, graph: { nodes: [{ id: "eng.token", label: "token engine", layer: "L5", status: "s" }] } }; },
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(loadGraphCalled, true, "daemon miss -> in-process graph loaded (fallback)");
  assert.match(r.output, /scanned 1 graph nodes locally/, "in-process footer");
  assert.match(r.output, /eng\.token/, "in-process hit rendered (query matches the fixture node)");
});

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
    loadWarmModels: async () => [], // no model resident -> selection falls through to the resolver
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
    loadWarmModels: async () => [],
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
    {
      loadWarmModels: async () => [], // no warm model -> resolver is still consulted (fail-soft top of runRequest)
      resolveSynthesisModel: async () => { resolverCalled = true; return { model: "x" }; },
      loadGraph: stubGraph,
    },
  );
  assert.equal(r.exitCode, 0);
  // resolver still runs at the top of runRequest (cheap, fail-soft) but no model call happens
  assert.equal(resolverCalled, true);
});

// ── loaded-first model selection (U-ASK-OLLAMA-LOADED-FIRST, slot:alpha) ──────
// Prefer a SUBSTANTIAL chat model already resident in VRAM over cold-loading the
// resolver's best-installed pick (avoids the cold-load + warm-model eviction that
// thrash the shared Blackwell card and slow the offload into a Claude fallback).

test("loaded-first: a substantial warm chat model is used and the resolver is NOT consulted (no cold-load)", async () => {
  let usedModel = null;
  let resolverCalled = false;
  await runRequest(VIZ(""), {
    loadWarmModels: async () => ["gpt-oss:120b", "nomic-embed-text:latest"], // 120b warm, embed ignored
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "qwen2.5-coder:32b" }; },
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "gpt-oss:120b"); // warm model used directly
  assert.equal(resolverCalled, false);     // resolver skipped -> no /api/tags router + no cold-load decision
});

test("loaded-first: only a TINY coder warm (1.5b, not in preference) -> resolver's better pick is cold-loaded (quality gate)", async () => {
  let usedModel = null;
  let resolverCalled = false;
  await runRequest(VIZ(""), {
    loadWarmModels: async () => ["qwen2.5-coder:1.5b"], // chat-capable but below the offload quality bar
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "qwen2.5-coder:32b" }; },
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b"); // strict gate refused the tiny warm model
  assert.equal(resolverCalled, true);
});

test("loaded-first: only vision/embed warm -> resolver pick (a VLM is never handed to /api/generate)", async () => {
  let usedModel = null;
  await runRequest(VIZ(""), {
    loadWarmModels: async () => ["qwen2.5vl:7b", "nomic-embed-text:latest"],
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b");
});

test("loaded-first: best PREFERRED warm model wins by order (120b over a warm 20b)", async () => {
  let usedModel = null;
  await runRequest(VIZ(""), {
    loadWarmModels: async () => ["gpt-oss:20b", "gpt-oss:120b"], // both warm; 120b ranks higher in preference
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "gpt-oss:120b");
});

test("loaded-first: explicit --model wins and the warm probe is NOT consulted (operator intent skips /api/ps)", async () => {
  let usedModel = null;
  let warmProbed = false;
  await runRequest(VIZ("gpt-oss:20b"), {
    loadWarmModels: async () => { warmProbed = true; return ["gpt-oss:120b"]; },
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    loadGraph: stubGraph,
    callOllama: async (m) => { usedModel = m; return { ok: true, response: "ok" }; },
  });
  assert.equal(usedModel, "gpt-oss:20b"); // operator override honored verbatim
  assert.equal(warmProbed, false);        // /api/ps probe skipped entirely when --model is set
});

// ── per-mode measured cheap floor (U-ALPHA-OLLAMA-MODE-SUFFICIENCY, slot:alpha) ──────────────────
// The judged ladder proved qwen2.5-coder:7b is NON-INFERIOR to the 32b floor for summarize/explain,
// so loadedPreferenceForMode prepends 7b for THOSE two modes only. A WARM 7b is then preferred at
// equal quality / ~4x less VRAM; a COLD 7b still falls straight through to the big-first base
// (strict, no cold-load). Unmeasured modes (triage/codegen/...) are untouched.
const SUMM = (extra = {}) => ({ mode: "summarize", input: "-", flags: { model: "", json: false, allowUnsafe: false, timeout: 180000, ...extra } });
const PLAIN_STDIN = (content) => async () => ({ ok: true, content, bytes: content.length, truncated: false });

test("per-mode floor: summarize prefers a WARM 7b (measured non-inferior) over cold-loading 32b", async () => {
  let usedModel = null;
  let resolverCalled = false;
  await runRequest(SUMM(), {
    loadWarmModels: async () => ["qwen2.5-coder:7b", "qwen2.5-coder:32b"], // both warm
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "qwen2.5-coder:32b" }; },
    readStdin: PLAIN_STDIN("explain what this function does in plain prose, several lines of code here"),
    callModel: async (m) => { usedModel = m; return { ok: true, text: "digest" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:7b"); // the WIN: 7b warm preferred for a measured mode
  assert.equal(resolverCalled, false);          // no resolver, no cold-load
});

test("per-mode floor: summarize with a COLD 7b but WARM 32b -> 32b (strict, never cold-loads 7b)", async () => {
  let usedModel = null;
  await runRequest(SUMM(), {
    loadWarmModels: async () => ["qwen2.5-coder:32b"], // 7b NOT warm
    resolveSynthesisModel: async () => ({ model: "deepseek-r1:32b" }),
    readStdin: PLAIN_STDIN("a block of plain text to summarize, nothing safety-critical in here"),
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b"); // big-first base still wins when 7b is cold
});

test("per-mode floor: summarize with only a warm 1.5b -> resolver (1.5b is BELOW the measured floor)", async () => {
  let usedModel = null;
  let resolverCalled = false;
  await runRequest(SUMM(), {
    loadWarmModels: async () => ["qwen2.5-coder:1.5b"], // below the floor; 7b not added
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "qwen2.5-coder:32b" }; },
    readStdin: PLAIN_STDIN("plain prose for a summary, no g-code"),
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b"); // 1.5b refused, resolver's better pick cold-loaded
  assert.equal(resolverCalled, true);
});

test("per-mode floor: an UNMEASURED mode (triage) does NOT downshift to a warm 7b (scoped to measured modes)", async () => {
  let usedModel = null;
  await runRequest(
    { mode: "triage", input: "-", flags: { model: "", json: false, allowUnsafe: false, timeout: 180000 } },
    {
      loadWarmModels: async () => ["qwen2.5-coder:7b"], // 7b warm, but triage is unmeasured
      resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
      readStdin: PLAIN_STDIN("Error: build failed\n  at foo (bar.ts:3)\nTS2554 expected 5 args"),
      callModel: async (m) => { usedModel = m; return { ok: true, text: "diagnosis" }; },
    },
  );
  assert.equal(usedModel, "qwen2.5-coder:32b"); // triage has no measured floor -> base, 7b skipped
});

test("per-mode floor: codegen with a warm 7b stays coder-first (DEFAULT floor) -- codegen is untouched", async () => {
  let usedModel = null;
  await runRequest(
    { mode: "codegen", input: "reverse a string in python", flags: { model: "", json: false, timeout: 180000 } },
    {
      loadWarmModels: async () => ["qwen2.5-coder:7b"], // 7b not in CODER/OFFLOAD preference
      callModel: async (m) => { usedModel = m; return { ok: true, text: "def rev(s): return s[::-1]" }; },
    },
  );
  assert.equal(usedModel, "qwen2.5-coder:32b"); // codegen branch unchanged: coder floor, never 7b
});

test("per-mode floor: a measured-mode call that lands on 32b fires the cheap-tier prime (demand-driven warm)", async () => {
  let primedWith = null;
  await runRequest(SUMM(), {
    loadWarmModels: async () => ["qwen2.5-coder:32b"], // 7b cold -> picks 32b -> should prime 7b
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    readStdin: PLAIN_STDIN("plain prose for a summary"),
    callModel: async () => ({ ok: true, text: "x" }),
    primeCheapTier: (mode, selected) => { primedWith = { mode, selected }; return { primed: true }; },
  });
  assert.deepEqual(primedWith, { mode: "summarize", selected: "qwen2.5-coder:32b" }); // prime invoked
});

test("per-mode floor: prime invocation never breaks the hot path even if it throws", async () => {
  let usedModel = null;
  const r = await runRequest(SUMM(), {
    loadWarmModels: async () => ["qwen2.5-coder:32b"],
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    readStdin: PLAIN_STDIN("plain prose"),
    callModel: async (m) => { usedModel = m; return { ok: true, text: "ok" }; },
    primeCheapTier: () => { throw new Error("prime blew up"); }, // must be swallowed
  });
  assert.equal(r.exitCode, 0);                 // request still succeeds
  assert.equal(usedModel, "qwen2.5-coder:32b"); // selection unaffected
});

// ── loadWarmModels probe (/api/ps reader) ────────────────────────────────────
// Pure given an injected fetchImpl. MUST be fail-soft: any error -> [] so the
// caller falls back to the resolver -- the probe never throws into runRequest.

test("loadWarmModels: parses /api/ps -> resident model names (name field, model fallback)", async () => {
  const r = await loadWarmModels({
    fetchImpl: async () => ({ ok: true, json: async () => ({ models: [{ name: "gpt-oss:120b" }, { model: "qwen2.5-coder:32b" }, { name: "" }] }) }),
  });
  assert.deepEqual(r, ["gpt-oss:120b", "qwen2.5-coder:32b"]); // blank name dropped
});

test("loadWarmModels: empty /api/ps (nothing resident) -> []", async () => {
  const r = await loadWarmModels({ fetchImpl: async () => ({ ok: true, json: async () => ({ models: [] }) }) });
  assert.deepEqual(r, []);
});

test("loadWarmModels: non-200 response -> [] (fail-soft, never throws)", async () => {
  const r = await loadWarmModels({ fetchImpl: async () => ({ ok: false, json: async () => ({ models: [{ name: "x" }] }) }) });
  assert.deepEqual(r, []);
});

test("loadWarmModels: fetch throws (Ollama down) -> [] (fail-soft)", async () => {
  const r = await loadWarmModels({ fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.deepEqual(r, []);
});

test("loadWarmModels: malformed body (no models array) -> []", async () => {
  const r = await loadWarmModels({ fetchImpl: async () => ({ ok: true, json: async () => ({ unexpected: true }) }) });
  assert.deepEqual(r, []);
});

test("OFFLOAD_LOADED_PREFERENCE: excludes the tiny coders (quality gate) and lists the kept substantial models", () => {
  assert.ok(OFFLOAD_LOADED_PREFERENCE.includes("gpt-oss:120b"));
  assert.ok(OFFLOAD_LOADED_PREFERENCE.includes("qwen2.5-coder:32b"));
  assert.ok(!OFFLOAD_LOADED_PREFERENCE.includes("qwen2.5-coder:1.5b")); // tiny -> cold-load the better pick instead
  assert.ok(!OFFLOAD_LOADED_PREFERENCE.includes("qwen2.5-coder:7b"));
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

// -- recordFailure (U-OLLAMA-OFFLOAD-SUCCESS-RATE, slot:alpha) --------------
test("recordFailure: records decision:'keep' / extras.mode:'failed' so a failed offload is countable", async () => {
  let recorded = null;
  const ok = await recordFailure(
    { mode: "summarize", reason: "Ollama HTTP 500" },
    async () => ({ recordOllamaEvent: (e) => { recorded = e; } }),
  );
  assert.equal(ok, true);
  assert.equal(recorded.hook, "ask-ollama");
  assert.equal(recorded.decision, "keep", "a failed offload fell back to Claude -> keep");
  assert.equal(recorded.category, "summarize");
  assert.equal(recorded.extras.mode, "failed");
  assert.equal(recorded.extras.reason, "Ollama HTTP 500");
  assert.equal(recorded.tokensSaved ?? 0, 0, "a failure saves no tokens");
});

test("recordFailure: ADVERSARIAL -- no mode / import failure / knob=0 -> false, never throws, never imports", async () => {
  assert.equal(await recordFailure(null), false);
  assert.equal(await recordFailure({}), false, "no mode -> no-op");
  const failImport = await recordFailure(
    { mode: "ask" },
    async () => { throw new Error("stats lib missing"); },
  );
  assert.equal(failImport, false);
  process.env.PRISM_ASK_OLLAMA_TELEMETRY = "0";
  try {
    let imported = false;
    const off = await recordFailure(
      { mode: "ask" },
      async () => { imported = true; return { recordOllamaEvent: () => {} }; },
    );
    assert.equal(off, false);
    assert.equal(imported, false, "knob=0 must short-circuit before any import");
  } finally {
    delete process.env.PRISM_ASK_OLLAMA_TELEMETRY;
  }
});

// -- shouldRecordFailure (U-OLLAMA-OFFLOAD-SUCCESS-RATE-EXITCODE, slot:alpha) --
// The main() decision for WHEN a runRequest outcome is a failed offload. The
// narrowing from `exitCode !== 0` to `=== 3` is the honesty fix: a safety
// refusal / bad input (exitCode 2) is NOT an Ollama failure, so it must not
// deflate the success rate. These lock that contract so a regression that
// re-broadens the condition fails loudly.
test("shouldRecordFailure: ONLY exitCode 3 in a model mode counts as a failed offload", () => {
  // exitCode 3 = model-infra failure (Ollama unreachable / bad output) -> count it
  assert.equal(shouldRecordFailure(3, "ask"), true);
  assert.equal(shouldRecordFailure(3, "codegen"), true);
  assert.equal(shouldRecordFailure(3, "summarize"), true);
});

test("shouldRecordFailure: exitCode 2 (usage / NC safety refusal / missing input) is NOT a failure", () => {
  // the R12 honesty fix: a refusal or bad input is neither success nor Ollama failure
  assert.equal(shouldRecordFailure(2, "ask"), false);
  assert.equal(shouldRecordFailure(2, "codegen"), false);
  assert.equal(shouldRecordFailure(2, "file"), false);
});

test("shouldRecordFailure: success (0) and viz/rerank non-model modes are excluded from BOTH counts", () => {
  assert.equal(shouldRecordFailure(0, "ask"), false, "a success is never a failure");
  // viz/rerank are pure-local: a viz graph-load exits 3 but is not an offload
  assert.equal(shouldRecordFailure(3, "viz"), false);
  assert.equal(shouldRecordFailure(3, "rerank"), false);
  // defensive: no mode -> never a failure (mirrors recordFailure's own guard)
  assert.equal(shouldRecordFailure(3, ""), false);
  assert.equal(shouldRecordFailure(3, undefined), false);
});

// -- codegen mode (U-ASK-OLLAMA-CODEGEN, slot:zulu) ------------------------
const CODEGEN = (input, model = "") => ({ mode: "codegen", input, flags: { model, json: false, timeout: 180000 } });

test("codegen: routes the spec through a coder model with the codegen prompt", async () => {
  let usedModel = null, usedPrompt = null;
  const r = await runRequest(CODEGEN("a function that reverses a string"), {
    loadWarmModels: async () => [],
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    callModel: async (m, p) => { usedModel = m; usedPrompt = p; return { ok: true, text: "def rev(s): return s[::-1]" }; },
  });
  assert.equal(r.exitCode, 0);
  assert.equal(usedModel, "qwen2.5-coder:32b");
  assert.match(usedPrompt, /CODE:/);
  assert.match(usedPrompt, /reverses a string/);
  assert.match(r.output, /return s\[::-1\]/);
  assert.equal(r.telemetry.mode, "codegen");
});

test("codegen: prefers a WARM coder over a warm reasoner (coder bias)", async () => {
  let usedModel = null;
  await runRequest(CODEGEN("a debounce helper"), {
    loadWarmModels: async () => ["gpt-oss:120b", "qwen2.5-coder:32b"], // both warm
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b", "a warm coder beats a warm reasoner for codegen");
});

test("codegen: no warm coder -> uses a warm reasoner (loaded-first, no VRAM thrash)", async () => {
  let usedModel = null, resolverCalled = false;
  await runRequest(CODEGEN("a debounce helper"), {
    loadWarmModels: async () => ["gpt-oss:120b"], // only a reasoner is warm
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "x" }; },
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "gpt-oss:120b", "use the warm reasoner rather than thrash VRAM");
  assert.equal(resolverCalled, false, "codegen never consults the reasoner-biased synthesis resolver");
});

test("codegen: nothing warm -> cold-loads the 32B coder floor, NOT a 60GB reasoner", async () => {
  let usedModel = null, resolverCalled = false;
  await runRequest(CODEGEN("a debounce helper"), {
    loadWarmModels: async () => [], // cold host
    resolveSynthesisModel: async () => { resolverCalled = true; return { model: "gpt-oss:120b" }; },
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "qwen2.5-coder:32b", "cold fallback is the coder floor, not the resolver's reasoner");
  assert.equal(resolverCalled, false);
});

test("contrast: ask mode DOES use the warm reasoner (per-mode preference divergence)", async () => {
  let usedModel = null;
  await runRequest({ mode: "ask", input: "q", flags: { model: "", json: false, timeout: 180000 } }, {
    loadWarmModels: async () => ["gpt-oss:120b"],
    callModel: async (m) => { usedModel = m; return { ok: true, text: "a" }; },
  });
  assert.equal(usedModel, "gpt-oss:120b");
});

test("codegen: explicit --model wins over the coder preference", async () => {
  let usedModel = null;
  await runRequest(CODEGEN("a helper", "qwen3-coder:30b"), {
    callModel: async (m) => { usedModel = m; return { ok: true, text: "x" }; },
  });
  assert.equal(usedModel, "qwen3-coder:30b");
});

test("codegen: refuses a G-code GENERATION request -- exit 2, no model call", async () => {
  let called = false;
  const r = await runRequest(CODEGEN("generate g-code to mill a 10mm pocket at 5000 rpm"), {
    callModel: async () => { called = true; return { ok: true, text: "x" }; },
  });
  assert.equal(r.exitCode, 2);
  assert.equal(called, false, "the safety guard must short-circuit before any model call");
  assert.match(r.output, /refusing to generate G-code/);
});

test("codegen: ALLOWS a g-code PARSER request (processing != emitting machine output)", async () => {
  let called = false;
  const r = await runRequest(CODEGEN("write a parser that reads a g-code file into tokens"), {
    loadWarmModels: async () => [],
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    callModel: async () => { called = true; return { ok: true, text: "tokens=[]" }; },
  });
  assert.equal(r.exitCode, 0);
  assert.equal(called, true);
});

test("codegen: --allow-unsafe overrides the g-code guard", async () => {
  let called = false;
  const r = await runRequest(
    { mode: "codegen", input: "generate g-code for a square", flags: { model: "", json: false, timeout: 180000, allowUnsafe: true } },
    {
      loadWarmModels: async () => [],
      resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
      callModel: async () => { called = true; return { ok: true, text: "G0 X0" }; },
    },
  );
  assert.equal(r.exitCode, 0);
  assert.equal(called, true);
});

test("codegen: local model failure -> exit 3 fallback signal (not a crash)", async () => {
  const r = await runRequest(CODEGEN("a quicksort"), {
    loadWarmModels: async () => [],
    resolveSynthesisModel: async () => ({ model: "qwen2.5-coder:32b" }),
    callModel: async () => ({ ok: false, error: "ollama down" }),
  });
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /FALLBACK|fell back|down/i);
});

test("buildCodegenPrompt: raw-code instruction + the spec + a CODE: anchor", () => {
  const p = buildCodegenPrompt("a fizzbuzz");
  assert.match(p, /ONLY the code/);
  assert.match(p, /SPEC: a fizzbuzz/);
  assert.match(p, /CODE:$/);
});

test("looksLikeGcodeRequest: refuses EMIT-a-program, allows PROCESS + ordinary code", () => {
  // refuse: emitting shop-floor output
  assert.equal(looksLikeGcodeRequest("generate g-code to mill a pocket"), true);
  assert.equal(looksLikeGcodeRequest("write an NC program for this part"), true);
  assert.equal(looksLikeGcodeRequest("output gcode for a circle"), true);
  // allow: code that PROCESSES g-code (not machine output)
  assert.equal(looksLikeGcodeRequest("write a g-code parser"), false);
  assert.equal(looksLikeGcodeRequest("a visualizer for nc programs"), false);
  assert.equal(looksLikeGcodeRequest("lint a gcode file"), false);
  // allow: ordinary codegen
  assert.equal(looksLikeGcodeRequest("a binary search function"), false);
  assert.equal(looksLikeGcodeRequest("react component for a todo list"), false);
  // guards
  assert.equal(looksLikeGcodeRequest(""), false);
  assert.equal(looksLikeGcodeRequest(null), false);
});

test("CODER_LOADED_PREFERENCE: coder-only, excludes general reasoners", () => {
  assert.ok(CODER_LOADED_PREFERENCE.includes("qwen2.5-coder:32b"));
  assert.ok(!CODER_LOADED_PREFERENCE.includes("gpt-oss:120b"));
  assert.ok(CODER_LOADED_PREFERENCE.every((m) => /coder/.test(m)));
});

// --- U-ALPHA-OLLAMA-NUMCTX-FIX: adaptive context window (KV-cache wedge fix) ----

test("defaultNumCtxForPrompt: tiny -> MIN floor; scales with input bytes; clamps to MAX", () => {
  assert.equal(defaultNumCtxForPrompt("hello", 100), 2048); // 5+100+1024=1129 -> MIN 2048
  assert.equal(defaultNumCtxForPrompt("x".repeat(6000), 256), 6000 + 256 + 1024); // 7280 (bytes-based)
  assert.equal(defaultNumCtxForPrompt("x".repeat(500000), 256), 131072); // estimate > MAX -> clamp
});

test("defaultNumCtxForPrompt: num_ctx >= UTF-8 bytes -> PROVABLY never truncates (any script, incl CJK)", () => {
  // tokens <= utf8 bytes for byte-level BPE, so num_ctx >= bytes guarantees the whole
  // prompt fits. Pin it for English, CJK, and accented Latin (the chars/3 bug undershot
  // the latter two -- scrutiny arm-B P1).
  for (const s of ["y".repeat(5000), "中".repeat(3000), "łąka".repeat(1000)]) {
    const bytes = Buffer.byteLength(s, "utf8");
    const ctx = defaultNumCtxForPrompt(s, 256);
    if (ctx < 131072) assert.ok(ctx >= bytes, `num_ctx ${ctx} must cover ${bytes} UTF-8 bytes`);
  }
  // CJK regression guard: 3000x "中" = 9000 UTF-8 bytes -> must reserve >= that
  // (the old chars/3 estimate reserved only ~1000 -> would truncate).
  assert.ok(defaultNumCtxForPrompt("中".repeat(3000), 256) >= 9000);
});

test("defaultNumCtxForPrompt: includes the system prompt length in the estimate", () => {
  const withSys = defaultNumCtxForPrompt("x".repeat(3000), 128, "y".repeat(3000));
  const withoutSys = defaultNumCtxForPrompt("x".repeat(3000), 128, "");
  assert.ok(withSys > withoutSys); // system tokens counted -> larger reservation
});

test("callModel: defaults num_ctx to fit the input when the caller omits it", async () => {
  let seenCtx;
  const callOllamaImpl = async (_m, _p, o) => { seenCtx = o.numCtx; return { ok: true, text: "x" }; };
  await callModel("m", "a short offload prompt", { viaMcp: false, callOllamaImpl });
  assert.equal(seenCtx, defaultNumCtxForPrompt("a short offload prompt"));
  assert.ok(seenCtx >= 2048 && seenCtx <= 131072);
});

test("callModel: preserves an explicit num_ctx (large-context callers untouched)", async () => {
  let seenCtx;
  const callOllamaImpl = async (_m, _p, o) => { seenCtx = o.numCtx; return { ok: true, text: "x" }; };
  await callModel("m", "p", { viaMcp: false, callOllamaImpl, numCtx: 65000 });
  assert.equal(seenCtx, 65000); // not overridden by the adaptive default
});
