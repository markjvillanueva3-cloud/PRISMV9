// scripts/ask-openrouter.test.mjs
// Tests for U-ASK-OPENROUTER pure functions + runRequest (injected deps). R9 reference-value asserts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseArgs, systemPromptFor, capForMode, buildFallbackSignal, renderModels, readCapped, runRequest,
  cloudTokensSaved, recordCloudExecution,
  MAX_SUMMARIZE_BYTES, MAX_LONGREAD_BYTES, MAX_INPUT_CEILING,
} from "./ask-openrouter.mjs";

// ---- parseArgs -------------------------------------------------------------
test("parseArgs: text mode + query", () => {
  const r = parseArgs(["research", "how", "does", "x", "work"]);
  assert.equal(r.mode, "research");
  assert.equal(r.input, "how does x work");
});
test("parseArgs: flags parsed (model/timeout/max-tokens/max-bytes/ask)", () => {
  const r = parseArgs(["longread", "file.md", "--model", "nemotron-ultra-free", "--max-bytes", "1000", "--ask", "what is the bore", "--json"]);
  assert.equal(r.flags.model, "nemotron-ultra-free");
  assert.equal(r.flags.maxBytes, 1000);
  assert.equal(r.flags.ask, "what is the bore");
  assert.equal(r.flags.json, true);
});
test("parseArgs: failure modes -- no mode, unknown mode, missing query, dangling flag value", () => {
  assert.match(parseArgs([]).error, /no mode given/);
  assert.match(parseArgs(["frobnicate", "x"]).error, /unknown mode/);
  assert.match(parseArgs(["ask"]).error, /needs a query/);
  assert.match(parseArgs(["summarize"]).error, /needs a file path/);
  assert.match(parseArgs(["ask", "x", "--model"]).error, /--model needs a value/);
  assert.match(parseArgs(["ask", "x", "--bogus"]).error, /unknown flag/);
});
test("parseArgs: adversarial -- bad numeric flags", () => {
  assert.match(parseArgs(["ask", "x", "--timeout", "5"]).error, /--timeout needs/);   // below MIN
  assert.match(parseArgs(["ask", "x", "--max-tokens", "-1"]).error, /positive integer/);
  assert.match(parseArgs(["summarize", "f", "--max-bytes", "abc"]).error, /positive integer/);
});
test("parseArgs: max-bytes is clamped to the ceiling", () => {
  const r = parseArgs(["longread", "f", "--max-bytes", String(MAX_INPUT_CEILING * 99)]);
  assert.equal(r.flags.maxBytes, MAX_INPUT_CEILING);
});
test("parseArgs: meta mode needs no input", () => {
  const r = parseArgs(["models"]);
  assert.equal(r.mode, "models");
  assert.equal(r.input, "");
});

// ---- systemPromptFor / capForMode ------------------------------------------
test("systemPromptFor: per-mode prompts; longread folds in a focus question", () => {
  assert.match(systemPromptFor("research"), /research assistant/i);
  assert.equal(systemPromptFor("ask"), "");                          // bare question
  assert.match(systemPromptFor("longread", "what is the tolerance"), /Focus your analysis on this question: what is the tolerance/);
  assert.match(systemPromptFor("longread", ""), /thorough structured summary/);
});
test("capForMode: longread cap > summarize cap; --max-bytes overrides; ceiling enforced", () => {
  assert.equal(capForMode("summarize"), MAX_SUMMARIZE_BYTES);
  assert.equal(capForMode("longread"), MAX_LONGREAD_BYTES);
  assert.ok(MAX_LONGREAD_BYTES > MAX_SUMMARIZE_BYTES);
  assert.equal(capForMode("summarize", 1234), 1234);
  assert.equal(capForMode("longread", MAX_INPUT_CEILING * 99), MAX_INPUT_CEILING);
});

// ---- buildFallbackSignal ---------------------------------------------------
test("buildFallbackSignal: text + json forms both name Claude as the fallback", () => {
  const t = buildFallbackSignal({ mode: "research", target: "q", error: "no key" });
  assert.match(t, /CLOUD FALLBACK -> Claude/);
  assert.match(t, /no key/);
  const j = JSON.parse(buildFallbackSignal({ mode: "ask", target: "q", error: "down", json: true }));
  assert.equal(j.cloudUnavailable, true);
  assert.equal(j.lane, "claude");
});

// ---- renderModels ----------------------------------------------------------
test("renderModels: lists every registry entry with price tier", () => {
  const s = renderModels();
  assert.match(s, /nemotron-super-free/);
  assert.match(s, /nvidia\/nemotron-3-ultra-550b-a55b:free/);
  assert.match(s, /\$0 \(free\)/);
  assert.match(s, /per 1M/);   // a paid row
});

// ---- readCapped ------------------------------------------------------------
test("readCapped: reads + truncates at cap; reports failure modes", () => {
  const deps = {
    existsImpl: (p) => p.endsWith("good.txt"),
    statImpl: () => ({ isFile: () => true, size: 10 }),
    readImpl: () => "0123456789",
  };
  const ok = readCapped("good.txt", 4, deps);
  assert.equal(ok.ok, true);
  assert.equal(ok.content, "0123");
  assert.equal(ok.truncated, true);
  // not found
  assert.equal(readCapped("missing.txt", 4, deps).ok, false);
  // not a file
  assert.equal(readCapped("good.txt", 4, { ...deps, statImpl: () => ({ isFile: () => false, size: 0 }) }).ok, false);
});

// ---- runRequest (injected callOpenRouter / readers) ------------------------
const fakeGen = (text) => async () => ({ ok: true, text, model: "nvidia/nemotron-3-super-120b-a12b:free", usage: { prompt_tokens: 5, completion_tokens: 2 }, durationMs: 10 });

test("runRequest: ask happy path returns answer + cloud footer", async () => {
  const r = await runRequest(parseArgs(["ask", "ping"]), { callOpenRouter: fakeGen("pong") });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /pong/);
  assert.match(r.output, /0 tokens entered the Claude context/);
});
test("runRequest: cloud failure -> exit 3 + Claude fallback directive (no faked success)", async () => {
  const r = await runRequest(parseArgs(["research", "deep q"]), { callOpenRouter: async () => ({ ok: false, error: "OPENROUTER_API_KEY not set" }) });
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /CLOUD FALLBACK -> Claude/);
  assert.match(r.output, /OPENROUTER_API_KEY not set/);
});
test("runRequest: NC/G-code content is REFUSED for cloud egress (safety) -- exit 2, no network", async () => {
  let called = false;
  const gcode = ["O1000", "N10 G0 X0 Y0", "N20 G1 Z-0.5 F100", "N30 X1.0 Y1.0", "N40 G0 Z0.1", "N50 M30"].join("\n");
  const deps = {
    callOpenRouter: async () => { called = true; return { ok: true, text: "x" }; },
    readCapped: () => ({ ok: true, content: gcode, bytes: gcode.length, truncated: false }),
  };
  const r = await runRequest(parseArgs(["summarize", "prog.nc"]), deps);
  assert.equal(r.exitCode, 2);
  assert.match(r.output, /refusing to send NC\/G-code/);
  assert.equal(called, false, "must not reach the cloud with G-code");
});
test("runRequest: --allow-unsafe overrides the NC refusal", async () => {
  const gcode = ["O1000", "N10 G0 X0 Y0", "N20 G1 Z-0.5 F100", "N30 X1.0 Y1.0", "N40 G0 Z0.1", "N50 M30"].join("\n");
  const deps = { callOpenRouter: fakeGen("summary"), readCapped: () => ({ ok: true, content: gcode, bytes: gcode.length, truncated: false }) };
  const r = await runRequest(parseArgs(["summarize", "prog.nc", "--allow-unsafe"]), deps);
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /summary/);
});
test("runRequest: file-not-found -> exit 2", async () => {
  const r = await runRequest(parseArgs(["summarize", "nope.md"]), { callOpenRouter: fakeGen("x"), readCapped: () => ({ ok: false, error: "file not found: nope.md" }) });
  assert.equal(r.exitCode, 2);
  assert.match(r.output, /file not found/);
});
test("runRequest: models mode lists registry, never calls the cloud", async () => {
  let called = false;
  const r = await runRequest(parseArgs(["models"]), { callOpenRouter: async () => { called = true; } });
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /nemotron-super-free/);
  assert.equal(called, false);
});
// ---- cloudTokensSaved (telemetry savings calc) -----------------------------
test("cloudTokensSaved: prefers authoritative OpenRouter usage (prompt - completion)", () => {
  assert.equal(cloudTokensSaved({ usage: { prompt_tokens: 5000, completion_tokens: 200 } }), 4800);
  // never negative (a tiny input with a long answer)
  assert.equal(cloudTokensSaved({ usage: { prompt_tokens: 10, completion_tokens: 99 } }), 0);
});
test("cloudTokensSaved: falls back to char estimate when usage absent (4 chars/token)", () => {
  // 4000 inChars -> 1000 tok in; 40 outChars -> 10 tok out; saved 990
  assert.equal(cloudTokensSaved({ inChars: 4000, outChars: 40 }), 990);
  assert.equal(cloudTokensSaved({}), 0);
  assert.equal(cloudTokensSaved(null), 0);
});

// ---- recordCloudExecution (offload-stats telemetry) ------------------------
test("recordCloudExecution: records an executed cloud offload via the canonical surface", async () => {
  let rec = null;
  const fakeImport = async () => ({ recordOllamaEvent: (e) => { rec = e; } });
  const ok = await recordCloudExecution({ mode: "research", model: "nvidia/nemotron-3-super-120b-a12b:free", usage: { prompt_tokens: 8000, completion_tokens: 500 } }, fakeImport);
  assert.equal(ok, true);
  assert.equal(rec.hook, "ask-openrouter");
  assert.equal(rec.decision, "offload");
  assert.equal(rec.category, "research");
  assert.equal(rec.tokensSaved, 7500);
  assert.equal(rec.extras.mode, "executed");   // -> executedOffloads, NOT the headline Ollama rate
  assert.equal(rec.extras.lane, "cloud");
});
test("recordCloudExecution: disabled by PRISM_ASK_OPENROUTER_TELEMETRY=0; no-op on null", async () => {
  const prev = process.env.PRISM_ASK_OPENROUTER_TELEMETRY;
  process.env.PRISM_ASK_OPENROUTER_TELEMETRY = "0";
  let called = false;
  const r = await recordCloudExecution({ mode: "ask" }, async () => { called = true; return { recordOllamaEvent: () => {} }; });
  assert.equal(r, false);
  assert.equal(called, false);
  if (prev === undefined) delete process.env.PRISM_ASK_OPENROUTER_TELEMETRY; else process.env.PRISM_ASK_OPENROUTER_TELEMETRY = prev;
  assert.equal(await recordCloudExecution(null), false);
});
test("recordCloudExecution: fail-soft when the stats lib import throws (never breaks the CLI)", async () => {
  const r = await recordCloudExecution({ mode: "ask" }, async () => { throw new Error("module gone"); });
  assert.equal(r, false);
});

test("runRequest: longread folds the --ask focus into the system prompt sent to the cloud", async () => {
  let sentMessages = null;
  const deps = {
    readCapped: () => ({ ok: true, content: "big document body", bytes: 17, truncated: false }),
    callOpenRouter: async ({ messages }) => { sentMessages = messages; return { ok: true, text: "ans", model: "m", usage: null, durationMs: 1 }; },
  };
  await runRequest(parseArgs(["longread", "big.md", "--ask", "what is the datum"]), deps);
  assert.ok(sentMessages, "cloud was called");
  assert.match(sentMessages[0].content, /Focus your analysis on this question: what is the datum/);
  assert.match(sentMessages[1].content, /big document body/);
});
