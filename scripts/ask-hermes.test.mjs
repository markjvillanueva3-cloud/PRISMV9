#!/usr/bin/env node
// Tests for ask-hermes.mjs -- the PRISM->Hermes-proxy bridge pure functions.
// (HERMES-BRIDGE-MS0/U-ASK-HERMES). Pure functions only; importing the script
// is side-effect-free (isMain is false under the test runner, so main() never
// runs and no network call is made).
// Run: node --test scripts/ask-hermes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  systemPromptFor,
  buildChatBody,
  parseChatResponse,
  shouldFallback,
  pickModel,
  parseArgs,
  tallyUsage,
  estimateHermesSaved,
  resolveInput,
  shouldRefuseUnsafe,
  effectiveTimeout,
  runGraphMode,
  fallbackToOllama,
} from "./ask-hermes.mjs";
// PARITY (U-HERMES-OLLAMA-PARITY L1a): assert ask-hermes reuses ask-ollama's CANONICAL
// timeout + NC-guard helpers (one implementation fleet-wide), not a fork.
import { scaleTimeoutForBytes, looksLikeNcProgram } from "./ask-ollama.mjs";

// --- systemPromptFor ---
test("systemPromptFor: each mode yields a distinct non-empty prompt", () => {
  const modes = ["ask", "summarize", "explain", "triage", "classify"];
  const seen = new Set();
  for (const m of modes) {
    const p = systemPromptFor(m);
    assert.equal(typeof p, "string");
    assert.ok(p.length > 0, `${m} prompt empty`);
    seen.add(p);
  }
  assert.equal(seen.size, modes.length, "prompts should be distinct per mode");
});

test("systemPromptFor: unknown mode falls back to the ask prompt", () => {
  assert.equal(systemPromptFor("bogus"), systemPromptFor("ask"));
});

// --- buildChatBody ---
test("buildChatBody: builds a valid OpenAI chat body (system+user, no stream)", () => {
  const b = buildChatBody({ mode: "ask", input: "hello", model: "grok-x", maxTokens: 50 });
  assert.equal(b.model, "grok-x");
  assert.equal(b.stream, false);
  assert.equal(b.max_tokens, 50);
  assert.equal(b.messages.length, 2);
  assert.equal(b.messages[0].role, "system");
  assert.equal(b.messages[1].role, "user");
  assert.equal(b.messages[1].content, "hello");
});

test("buildChatBody: non-positive/NaN maxTokens falls back to 1024", () => {
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m", maxTokens: 0 }).max_tokens, 1024);
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m", maxTokens: NaN }).max_tokens, 1024);
  assert.equal(buildChatBody({ mode: "ask", input: "x", model: "m" }).max_tokens, 1024);
});

test("buildChatBody: null input coerces to empty string (no crash)", () => {
  const b = buildChatBody({ mode: "ask", input: null, model: "m" });
  assert.equal(b.messages[1].content, "");
});

// --- parseChatResponse ---
test("parseChatResponse: happy path returns the assistant text", () => {
  const r = parseChatResponse({ choices: [{ message: { content: "PRISM_OK" }, finish_reason: "stop" }] });
  assert.deepEqual(r, { ok: true, content: "PRISM_OK" });
});

test("parseChatResponse: upstream error envelope -> ok:false with message", () => {
  const r = parseChatResponse({ error: { message: "extra usage required", type: "invalid_request_error" } });
  assert.equal(r.ok, false);
  assert.match(r.error, /extra usage required/);
});

test("parseChatResponse: string error field -> ok:false", () => {
  const r = parseChatResponse({ error: "boom" });
  assert.equal(r.ok, false);
  assert.match(r.error, /boom/);
});

test("parseChatResponse: refusal stop_reason -> ok:false", () => {
  const r = parseChatResponse({ choices: [{ finish_reason: "refusal", message: { refusal: "declined" } }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /declined|refus/i);
});

test("parseChatResponse: empty choices -> ok:false", () => {
  assert.equal(parseChatResponse({ choices: [] }).ok, false);
});

test("parseChatResponse: missing/empty content -> ok:false", () => {
  assert.equal(parseChatResponse({ choices: [{ message: { content: "" } }] }).ok, false);
  assert.equal(parseChatResponse({ choices: [{ message: {} }] }).ok, false);
});

test("parseChatResponse: non-object / null -> ok:false", () => {
  assert.equal(parseChatResponse(null).ok, false);
  assert.equal(parseChatResponse(42).ok, false);
  assert.equal(parseChatResponse(undefined).ok, false);
});

// --- shouldFallback ---
test("shouldFallback: network/timeout/http all permit fallback (token economy)", () => {
  assert.equal(shouldFallback({ kind: "network" }), true);
  assert.equal(shouldFallback({ kind: "timeout" }), true);
  assert.equal(shouldFallback({ kind: "http", status: 400 }), true);
  assert.equal(shouldFallback({ kind: "http", status: 500 }), true);
});

test("shouldFallback: undefined descriptor still returns a boolean (no crash)", () => {
  assert.equal(typeof shouldFallback(undefined), "boolean");
  assert.equal(typeof shouldFallback({}), "boolean");
});

// --- parseArgs ---
test("parseArgs: ask mode with literal question", () => {
  const a = parseArgs(["ask", "what", "is", "2+2"]);
  assert.equal(a.error, null);
  assert.equal(a.mode, "ask");
  assert.equal(a.rawInput, "what is 2+2");
  assert.equal(a.fallback, true);
  assert.equal(a.json, false);
});

test("parseArgs: flags parse (model/json/no-fallback/timeout/max-tokens/url)", () => {
  const a = parseArgs(["summarize", "file.txt", "--model", "grok-y", "--json", "--no-fallback", "--timeout", "5000", "--max-tokens", "256", "--url", "http://x/v1"]);
  assert.equal(a.mode, "summarize");
  assert.equal(a.rawInput, "file.txt");
  assert.equal(a.model, "grok-y");
  assert.equal(a.json, true);
  assert.equal(a.fallback, false);
  assert.equal(a.timeout, 5000);
  assert.equal(a.maxTokens, 256);
  assert.equal(a.url, "http://x/v1");
});

test("parseArgs: missing mode -> error", () => {
  assert.match(parseArgs([]).error, /mode must be one of/);
});

test("parseArgs: invalid mode -> error", () => {
  assert.match(parseArgs(["frobnicate", "x"]).error, /mode must be one of/);
});

test("parseArgs: unknown flag -> error", () => {
  assert.match(parseArgs(["ask", "--bogus"]).error, /unknown flag/);
});

test("parseArgs: bad numeric flag values fall back to defaults", () => {
  const a = parseArgs(["ask", "q", "--timeout", "abc", "--max-tokens", "xyz"]);
  assert.equal(a.timeout, 120000);
  assert.equal(a.maxTokens, 1024);
});

// --- tallyUsage (HERMES-UTIL-TRACK: make Hermes utilization measurable) ---
const NOW = "2026-06-14T00:00:00.000Z";

test("tallyUsage: a hermes call records fired+offloaded+bySource+byMode under byHook['ask-hermes']", () => {
  const s = tallyUsage({}, { source: "hermes", mode: "summarize", now: NOW });
  const h = s.byHook["ask-hermes"];
  assert.equal(h.fired, 1);
  assert.equal(h.offloaded, 1);        // Hermes answered -> work went off-Claude
  assert.equal(h.kept, 0);
  assert.equal(h.bySource.hermes, 1);
  assert.equal(h.byMode.summarize, 1);
  assert.equal(h.lastUsed, NOW);
});

test("tallyUsage: ollama-fallback counts as offloaded but is a DISTINCT source (not real Hermes use)", () => {
  const s = tallyUsage({}, { source: "ollama-fallback", mode: "triage", now: NOW });
  const h = s.byHook["ask-hermes"];
  assert.equal(h.offloaded, 1);
  assert.equal(h.bySource["ollama-fallback"], 1);
  assert.equal(h.bySource.hermes, undefined); // the split is what makes "is Hermes used?" answerable
});

test("tallyUsage: a total failure counts as kept, NOT offloaded (Claude must still answer)", () => {
  const s = tallyUsage({}, { source: "fail", mode: "ask", now: NOW });
  const h = s.byHook["ask-hermes"];
  assert.equal(h.offloaded, 0);
  assert.equal(h.kept, 1);
  assert.equal(h.bySource.fail, 1);
});

test("tallyUsage: accumulates across calls without clobbering prior counts", () => {
  let s = { byHook: { "ask-hermes": { fired: 5, offloaded: 4, kept: 1, suggested: 0, tokensSaved: 0, bySource: { hermes: 4, fail: 1 }, byMode: { ask: 5 } } } };
  s = tallyUsage(s, { source: "hermes", mode: "explain", now: NOW });
  const h = s.byHook["ask-hermes"];
  assert.equal(h.fired, 6);
  assert.equal(h.offloaded, 5);
  assert.equal(h.bySource.hermes, 5);
  assert.equal(h.byMode.explain, 1);
  assert.equal(h.byMode.ask, 5);       // prior mode count preserved
});

// --- U-OLLAMA-BRIDGE-EXEC-VISIBILITY (alpha 2026-06-20): savings attribution ---
test("tallyUsage: an offloaded call adds the estimated tokensSaved", () => {
  const s = tallyUsage({}, { source: "hermes", mode: "ask", now: NOW, tokensSaved: 320 });
  assert.equal(s.byHook["ask-hermes"].tokensSaved, 320);
});

test("tallyUsage: a kept (fail) call adds NO tokensSaved even if one is passed", () => {
  const s = tallyUsage({}, { source: "fail", mode: "ask", now: NOW, tokensSaved: 999 });
  assert.equal(s.byHook["ask-hermes"].tokensSaved, 0);
  assert.equal(s.byHook["ask-hermes"].kept, 1);
});

test("tallyUsage: tokensSaved accumulates across offloaded calls (|| 0 add, NOT 32-bit | 0)", () => {
  // 4e9 exceeds the 32-bit signed range -- a bitwise `| 0` add would wrap negative.
  let s = tallyUsage({}, { source: "hermes", mode: "ask", now: NOW, tokensSaved: 2_000_000_000 });
  s = tallyUsage(s, { source: "ollama-fallback", mode: "ask", now: NOW, tokensSaved: 2_000_000_000 });
  assert.equal(s.byHook["ask-hermes"].tokensSaved, 4_000_000_000);
});

test("tallyUsage: missing/non-finite tokensSaved on an offload is a 0 add (no NaN)", () => {
  const s = tallyUsage({}, { source: "hermes", mode: "ask", now: NOW });
  assert.equal(s.byHook["ask-hermes"].tokensSaved, 0);
});

test("estimateHermesSaved: (input+output) chars / 4, ceil", () => {
  assert.equal(estimateHermesSaved("abcd", "efgh"), 2); // 8/4
  assert.equal(estimateHermesSaved("abc", ""), 1);      // 3/4 -> ceil 1
  assert.equal(estimateHermesSaved("", ""), 0);
});

test("estimateHermesSaved: non-string args contribute 0 (never throws)", () => {
  assert.equal(estimateHermesSaved(null, undefined), 0);
  assert.equal(estimateHermesSaved(123, {}), 0);
  assert.equal(estimateHermesSaved("abcd", null), 1); // only the 4-char input counts
});

test("tallyUsage: tolerates null/non-object stats + preserves sibling byHook entries", () => {
  const s = tallyUsage({ byHook: { "ollama-task-offloader": { fired: 9 } } }, { source: "hermes", mode: "classify", now: NOW });
  assert.equal(s.byHook["ollama-task-offloader"].fired, 9); // sibling untouched
  assert.equal(s.byHook["ask-hermes"].fired, 1);
  // null/garbage input must not throw and must still produce a valid structure
  const s2 = tallyUsage(null, { source: "hermes", mode: "ask", now: NOW });
  assert.equal(s2.byHook["ask-hermes"].fired, 1);
});

test("tallyUsage: an unknown/empty source is bucketed as 'unknown' and counts as kept", () => {
  const s = tallyUsage({}, { mode: "ask", now: NOW });
  const h = s.byHook["ask-hermes"];
  assert.equal(h.bySource.unknown, 1);
  assert.equal(h.kept, 1);
  assert.equal(h.offloaded, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// L1a SAFETY/ROBUSTNESS PARITY (U-HERMES-OLLAMA-PARITY) -- the critical gap:
// ask-hermes had NO NC/G-code guard, NO file cap, NO size-scaled timeout, so a
// dense G-code program could be shipped UNCAPPED to the PAID remote proxy. These
// surfaces now mirror ask-ollama's vetted helpers; verify the gating intent (R9).
// ═══════════════════════════════════════════════════════════════════════════

// --- parseArgs: new --allow-unsafe + timeoutExplicit flags ---
test("parseArgs: --allow-unsafe sets allowUnsafe; default is false", () => {
  assert.equal(parseArgs(["summarize", "f.txt"]).allowUnsafe, false);
  assert.equal(parseArgs(["summarize", "f.txt", "--allow-unsafe"]).allowUnsafe, true);
});

test("parseArgs: --timeout marks timeoutExplicit; absent leaves it false", () => {
  assert.equal(parseArgs(["summarize", "f.txt"]).timeoutExplicit, false);
  const a = parseArgs(["summarize", "f.txt", "--timeout", "9000"]);
  assert.equal(a.timeoutExplicit, true);
  assert.equal(a.timeout, 9000);
});

// --- shouldRefuseUnsafe: a dense NC program must NOT reach the paid proxy ---
// A clearly-dense G-code block (>=~18 modal G/M lines). Self-validating: assert
// the shared detector actually flags it, so the gating test can't pass for the
// wrong reason if the fixture were too sparse.
const NC_PROGRAM = [
  "%", "O1000 (PARITY-TEST)",
  "N10 G21 G90 G54",
  "N20 G00 X0. Y0. Z5.",
  "N30 G43 H01 Z5.",
  "N40 G01 Z-2. F100",
  "N50 G01 X50. Y0. F250",
  "N60 X50. Y50.",
  "N70 X0. Y50.",
  "N80 X0. Y0.",
  "N90 G00 Z5.",
  "N100 X25. Y25.",
  "N110 G01 Z-3. F80",
  "N120 G02 X30. Y25. I5. J0.",
  "N130 G01 X35. Y30.",
  "N140 G00 Z10.",
  "N150 M09",
  "N160 M05",
  "N170 G91 G28 Z0.",
  "N180 M30", "%",
].join("\n");
const PLAIN_TEXT =
  "Build failed: TypeError at line 42. The function returned undefined.\n" +
  "Stack trace follows. This is a normal error dump with no machine code.\n" +
  "Investigate the null guard in the caller.";

test("shouldRefuseUnsafe: fixture sanity -- the shared detector flags the dense NC block", () => {
  assert.equal(looksLikeNcProgram(NC_PROGRAM), true, "NC fixture must be dense enough to trip the guard");
  assert.equal(looksLikeNcProgram(PLAIN_TEXT), false, "plain prose must NOT trip the guard");
});

test("shouldRefuseUnsafe: a file mode + dense NC program is REFUSED (safety stays on Claude)", () => {
  assert.equal(shouldRefuseUnsafe({ mode: "summarize", allowUnsafe: false, text: NC_PROGRAM }), true);
  assert.equal(shouldRefuseUnsafe({ mode: "explain", allowUnsafe: false, text: NC_PROGRAM }), true);
  assert.equal(shouldRefuseUnsafe({ mode: "triage", allowUnsafe: false, text: NC_PROGRAM }), true);
});

test("shouldRefuseUnsafe: --allow-unsafe OVERRIDES the guard (operator escape hatch)", () => {
  assert.equal(shouldRefuseUnsafe({ mode: "summarize", allowUnsafe: true, text: NC_PROGRAM }), false);
});

test("shouldRefuseUnsafe: text modes (ask/classify) are NEVER guarded -- not file inputs", () => {
  // even NC-shaped text passed as a literal question is not a 'route a program file' case
  assert.equal(shouldRefuseUnsafe({ mode: "ask", allowUnsafe: false, text: NC_PROGRAM }), false);
  assert.equal(shouldRefuseUnsafe({ mode: "classify", allowUnsafe: false, text: NC_PROGRAM }), false);
});

test("shouldRefuseUnsafe: plain text in a file mode is allowed through (no false positive)", () => {
  assert.equal(shouldRefuseUnsafe({ mode: "triage", allowUnsafe: false, text: PLAIN_TEXT }), false);
});

test("shouldRefuseUnsafe: missing/empty args do not throw and return false", () => {
  assert.equal(shouldRefuseUnsafe(), false);
  assert.equal(shouldRefuseUnsafe({}), false);
  assert.equal(shouldRefuseUnsafe({ mode: "summarize", allowUnsafe: false, text: "" }), false);
});

// --- effectiveTimeout: file modes size-scale unless --timeout was pinned ---
test("effectiveTimeout: file mode + not pinned scales to input size (== canonical scaler)", () => {
  const big = "x".repeat(200000); // ~200KB -> well above the flat base
  const got = effectiveTimeout({ mode: "summarize", timeoutExplicit: false, textLen: big.length, base: 120000 });
  assert.equal(got, scaleTimeoutForBytes(big.length, 120000)); // exact parity with ask-ollama's scaler
  assert.ok(got > 120000, "a large file must lengthen the timeout, not keep the flat default");
});

test("effectiveTimeout: a pinned --timeout (timeoutExplicit) is honored verbatim, never scaled", () => {
  const big = "x".repeat(200000);
  assert.equal(effectiveTimeout({ mode: "summarize", timeoutExplicit: true, textLen: big.length, base: 30000 }), 30000);
});

test("effectiveTimeout: text modes (ask/classify) keep the flat base regardless of length", () => {
  const big = "x".repeat(500000);
  assert.equal(effectiveTimeout({ mode: "ask", timeoutExplicit: false, textLen: big.length, base: 120000 }), 120000);
  assert.equal(effectiveTimeout({ mode: "classify", timeoutExplicit: false, textLen: big.length, base: 120000 }), 120000);
});

test("effectiveTimeout: extreme input clamps at the canonical ceiling (never an unbounded hang)", () => {
  // two different extreme sizes must clamp to the SAME value -> proves the ceiling branch is hit,
  // not just that the value grows with size (R9: pin the clamp, not the slope).
  const a = effectiveTimeout({ mode: "summarize", timeoutExplicit: false, textLen: 50_000_000, base: 120000 });
  const b = effectiveTimeout({ mode: "summarize", timeoutExplicit: false, textLen: 100_000_000, base: 120000 });
  assert.equal(a, b, "both extreme sizes must clamp to the same ceiling");
  assert.equal(a, scaleTimeoutForBytes(50_000_000, 120000)); // exact parity with the canonical scaler's clamp
});

// --- resolveInput: caps via the CANONICAL ask-ollama readers; lenient literal fallthrough ---
test("resolveInput: ask/classify modes return the literal text (no file read)", async () => {
  const a = await resolveInput("ask", "what is 2+2");
  assert.deepEqual(a, { ok: true, text: "what is 2+2", truncated: false, bytes: 11 });
  const c = await resolveInput("classify", "label this");
  assert.equal(c.text, "label this");
  assert.equal(c.truncated, false);
});

test("resolveInput: a file mode reuses readFileCapped and propagates the truncated flag", async () => {
  const deps = { readFileCapped: () => ({ ok: true, content: "XXXXXXXXXX", bytes: 999999, truncated: true }) };
  const r = await resolveInput("summarize", "big.nc", deps);
  assert.equal(r.ok, true);
  assert.equal(r.text, "XXXXXXXXXX");
  assert.equal(r.truncated, true);   // capped -> downstream emits the truncation note
  assert.equal(r.bytes, 999999);
});

test("resolveInput: a file mode propagates truncated:false for a small file (no false note)", async () => {
  const deps = { readFileCapped: () => ({ ok: true, content: "small", bytes: 5, truncated: false }) };
  const r = await resolveInput("explain", "small.txt", deps);
  assert.equal(r.ok, true);
  assert.equal(r.text, "small");
  assert.equal(r.truncated, false);  // small file -> downstream must NOT emit a truncation note
  assert.equal(r.bytes, 5);
});

test("resolveInput: '-' reuses readStdin (the rtk-pipe seam)", async () => {
  const deps = { readStdin: async () => ({ ok: true, content: "piped content", bytes: 13, truncated: false }) };
  const r = await resolveInput("explain", "-", deps);
  assert.equal(r.ok, true);
  assert.equal(r.text, "piped content");
  assert.equal(r.truncated, false);
  assert.equal(r.bytes, 13);  // byte count propagates from the canonical stdin reader
});

test("resolveInput: a NON-EXISTENT path is treated LENIENTLY as literal text (prior CLI UX)", async () => {
  const deps = { readFileCapped: () => ({ ok: false, error: "file not found: some words here" }) };
  const r = await resolveInput("summarize", "some words here", deps);
  assert.equal(r.ok, true);             // not a hard error -> treated as a literal prompt
  assert.equal(r.text, "some words here");
  assert.equal(r.truncated, false);
  assert.equal(r.lenient, true);        // flags the shell to emit a "treating as literal text" advisory (R12)
});

test("resolveInput: a REAL read error (not 'file not found') propagates ok:false (fail loud)", async () => {
  const deps = { readFileCapped: () => ({ ok: false, error: "cannot read x: EACCES" }) };
  const r = await resolveInput("summarize", "x", deps);
  assert.equal(r.ok, false);
  assert.match(r.error, /EACCES/);
});

test("resolveInput: a stdin read failure surfaces ok:false (does not silently empty)", async () => {
  const deps = { readStdin: async () => ({ ok: false, error: "stdin was empty (nothing piped to '-')" }) };
  const r = await resolveInput("triage", "-", deps);
  assert.equal(r.ok, false);
  assert.match(r.error, /stdin read failed.*empty/);
});

// ═══════════════════════════════════════════════════════════════════════════
// L1b GRAPH-MODE PARITY (U-HERMES-OLLAMA-PARITY) -- viz + rerank reuse ask-ollama's
// exported graph helpers; the search is $0-local and only synth/rerank touch the model.
// runGraphMode is fully dependency-injectable (callModel + loadGraphImpl), so every
// branch is unit-tested without a live graph or a live proxy.
// ═══════════════════════════════════════════════════════════════════════════

const GRAPH = {
  nodes: [
    { id: "eng.alpha", label: "Alpha cutting engine", info: "cutting force kienzle model" }, // strong match -> score 2
    { id: "eng.beta", label: "Beta engine", info: "cutting speed feed" },                    // info match  -> score 1
    { id: "eng.gamma", label: "Gamma unrelated", info: "thermal expansion only" },           // no match
  ],
};
const loadOk = () => ({ ok: true, graph: GRAPH });
const NEVER = async () => { throw new Error("callModel must NOT be called"); };

// --- parseArgs: viz/rerank modes + --synth / --max-hits ---
test("parseArgs: viz and rerank are valid modes; --synth + --max-hits parse", () => {
  assert.equal(parseArgs(["viz", "cutting"]).error, null);
  assert.equal(parseArgs(["rerank", "cutting"]).error, null);
  assert.equal(parseArgs(["viz", "cutting"]).synth, false);                 // default
  assert.equal(parseArgs(["viz", "cutting", "--synth"]).synth, true);
  assert.equal(parseArgs(["viz", "q", "--max-hits", "5"]).maxHits, 5);
  assert.equal(parseArgs(["viz", "q"]).maxHits, 12);                        // DEFAULT_MAX_HITS
  assert.equal(parseArgs(["viz", "q", "--max-hits", "junk"]).maxHits, 12);  // bad -> default
});

// --- resolveInput: viz/rerank are literal-text modes (never a file read) ---
test("resolveInput: viz/rerank take a literal query (not a file/stdin read)", async () => {
  const v = await resolveInput("viz", "cutting force");
  assert.deepEqual(v, { ok: true, text: "cutting force", truncated: false, bytes: 13 });
  const r = await resolveInput("rerank", "speed feed");
  assert.equal(r.text, "speed feed");
  assert.equal(r.truncated, false);
});

// --- runGraphMode: viz ---
test("runGraphMode: viz without --synth returns local hits and NEVER calls the model ($0)", async () => {
  const res = await runGraphMode({ mode: "viz", query: "cutting", synth: false, loadGraphImpl: loadOk, callModel: NEVER });
  assert.equal(res.exitCode, 0);
  assert.match(res.output, /eng\.alpha/);   // strong hit present
  assert.match(res.output, /eng\.beta/);    // weaker hit present
  assert.doesNotMatch(res.output, /eng\.gamma/); // non-matching node excluded
  assert.match(res.output, /scanned 3 graph nodes locally \(\$0\) -> 2 hit/);
});

test("runGraphMode: viz --synth returns the Hermes answer on top of the hits", async () => {
  const callModel = async () => ({ ok: true, content: "SYNTH: [eng.alpha] is the cutting-force engine." });
  const res = await runGraphMode({ mode: "viz", query: "cutting", synth: true, loadGraphImpl: loadOk, callModel });
  assert.equal(res.exitCode, 0);
  assert.match(res.output, /SYNTH: \[eng\.alpha\]/);
});

test("runGraphMode: viz --synth degrades to local hits when Hermes fails (never worse than search)", async () => {
  const callModel = async () => ({ ok: false, error: "proxy down" });
  const res = await runGraphMode({ mode: "viz", query: "cutting", synth: true, loadGraphImpl: loadOk, callModel });
  assert.equal(res.exitCode, 0);                                   // graph search succeeded -> still exit 0
  assert.match(res.output, /Hermes synthesis unavailable \(proxy down\)/);
  assert.match(res.output, /eng\.alpha/);                          // the local hits are still shown
});

test("runGraphMode: viz --json emits a machine-readable hits payload", async () => {
  const res = await runGraphMode({ mode: "viz", query: "cutting", synth: false, json: true, loadGraphImpl: loadOk, callModel: NEVER });
  const obj = JSON.parse(res.output);
  assert.equal(obj.mode, "viz");
  assert.equal(obj.synth, false);
  assert.equal(obj.scanned, 3);
  assert.equal(obj.hits.length, 2);
  assert.equal(obj.hits[0].id, "eng.alpha");  // best (strong) hit first
});

test("runGraphMode: --max-hits truncates the hit set (the top-scored survivor is kept)", async () => {
  const res = await runGraphMode({ mode: "viz", query: "cutting", synth: false, maxHits: 1, json: true, loadGraphImpl: loadOk, callModel: NEVER });
  const obj = JSON.parse(res.output);
  assert.equal(obj.hits.length, 1);            // cap honored end-to-end
  assert.equal(obj.hits[0].id, "eng.alpha");   // the score-2 winner survives the cap
});

test("runGraphMode: a zero-hit query renders the no-match line (no crash, exit 0)", async () => {
  const res = await runGraphMode({ mode: "viz", query: "zzzznomatch", synth: false, loadGraphImpl: loadOk, callModel: NEVER });
  assert.equal(res.exitCode, 0);
  assert.match(res.output, /no matching graph nodes/);
  assert.match(res.output, /-> 0 hit/);
});

// --- runGraphMode: rerank ---
test("runGraphMode: rerank VERIFIED reorders by the model's ids (anti-hallucination kept)", async () => {
  // model proposes beta-first (reverse of the lexical alpha-first), using bracketed ids the prompt asks for
  const callModel = async () => ({ ok: true, content: "[eng.beta]\n[eng.alpha]" });
  const res = await runGraphMode({ mode: "rerank", query: "cutting", json: true, loadGraphImpl: loadOk, callModel });
  const obj = JSON.parse(res.output);
  assert.equal(obj.verified, true);
  assert.equal(obj.source, "hermes");          // R12: backend reported honestly, never the lib's "ollama"
  assert.equal(obj.ranked[0].id, "eng.beta");  // model's order applied
  assert.equal(obj.ranked[1].id, "eng.alpha");
});

test("runGraphMode: rerank falls back to the lexical order when Hermes fails (verified:false)", async () => {
  const callModel = async () => ({ ok: false, error: "proxy down" });
  const res = await runGraphMode({ mode: "rerank", query: "cutting", json: true, loadGraphImpl: loadOk, callModel });
  const obj = JSON.parse(res.output);
  assert.equal(obj.verified, false);
  assert.equal(obj.source, "lexical");
  assert.equal(obj.ranked[0].id, "eng.alpha"); // lexical: strong hit (score 2) first
});

test("runGraphMode: rerank with <2 candidates degrades to lexical WITHOUT calling the model", async () => {
  // only eng.alpha matches "kienzle" -> 1 candidate -> rerankCandidates 'too-few-candidates' fallback,
  // which must NOT invoke run (callModel:NEVER would throw if it did).
  const oneHitGraph = { nodes: [{ id: "eng.alpha", label: "Alpha", info: "kienzle force" }, { id: "eng.gamma", label: "Gamma", info: "thermal only" }] };
  const res = await runGraphMode({ mode: "rerank", query: "kienzle", json: true, loadGraphImpl: () => ({ ok: true, graph: oneHitGraph }), callModel: NEVER });
  const obj = JSON.parse(res.output);
  assert.equal(obj.verified, false);
  assert.equal(obj.source, "lexical");
  assert.equal(obj.ranked.length, 1);
  assert.equal(obj.ranked[0].id, "eng.alpha");
});

// --- runGraphMode: graph load failure fails loud (exit 3) ---
test("runGraphMode: a graph-load failure returns exitCode 3 and the error (fail loud)", async () => {
  const res = await runGraphMode({ mode: "viz", query: "cutting", loadGraphImpl: () => ({ ok: false, error: "no system-viz graph found" }), callModel: NEVER });
  assert.equal(res.exitCode, 3);
  assert.match(res.output, /no system-viz graph found/);
});

// --- pickModel (HERMES-UTIL-RESILIENCE 2026-06-18) ---
// The model-selection priority that lets a chat be ATTEMPTED with a configured
// fallback when the proxy serves a model but does not list it via /v1/models.
test("pickModel: explicit (--model / PRISM_HERMES_MODEL) wins over listed + fallback", () => {
  const r = pickModel({ explicit: "grok-x", listed: "llama", fallback: "grok-4.3" });
  assert.equal(r.model, "grok-x");
  assert.equal(r.source, "explicit");
});

test("pickModel: proxy-listed wins when no explicit", () => {
  const r = pickModel({ explicit: null, listed: "llama", fallback: "grok-4.3" });
  assert.equal(r.model, "llama");
  assert.equal(r.source, "listed");
});

test("pickModel: FALLBACK used when explicit+listed both absent (the resilience fix -- proxy up, /models empty)", () => {
  const r = pickModel({ explicit: null, listed: null, fallback: "grok-4.3" });
  assert.equal(r.model, "grok-4.3");
  assert.equal(r.source, "fallback"); // drives the stderr transparency note + the chat attempt
});

test("pickModel: source 'none' only when ALL three are absent (so the lane abandons honestly)", () => {
  const r = pickModel({ explicit: null, listed: null, fallback: null });
  assert.equal(r.model, null);
  assert.equal(r.source, "none");
});

test("pickModel: empty-string inputs are falsy -> skipped (no empty model id sent)", () => {
  const r = pickModel({ explicit: "", listed: "", fallback: "grok-4.3" });
  assert.equal(r.model, "grok-4.3");
  assert.equal(r.source, "fallback");
});

test("pickModel: no-arg / undefined -> none (never throws)", () => {
  assert.deepEqual(pickModel(), { model: null, source: "none" });
  assert.deepEqual(pickModel({}), { model: null, source: "none" });
});

// --- GROK-HIGHEST-CAPABILITY (operator /goal 2026-06-26) ---
// When the proxy lists MULTIPLE ids, pick the most capable grok -- not the first listed.
test("pickModel: ranks a full listed[] for highest capability (not first-listed)", () => {
  // grok-3 is FIRST; the most capable is grok-4.20-0309-reasoning -- that must win.
  const r = pickModel({
    listed: ["grok-3", "grok-4", "grok-4.3", "grok-4.20-0309-reasoning"],
    fallback: "grok-4.3",
  });
  assert.equal(r.model, "grok-4.20-0309-reasoning");
  assert.equal(r.source, "listed");
});

test("pickModel: PRISM_HERMES_PREFERRED_MODEL pin wins over auto-ranking (operator override)", () => {
  const r = pickModel({ preferred: "grok-5-future", listed: ["grok-4.3"], fallback: "grok-4.3" });
  assert.equal(r.model, "grok-5-future");
  assert.equal(r.source, "preferred");
});

// ═══════════════════════════════════════════════════════════════════════════
// fallbackToOllama: contextBlock grounding survives the Hermes->Ollama degradation
//
// The bug: when --with-context is used AND Hermes fails, the contextBlock computed
// inside the old `if (model)` block was out of scope at the fallback call site, so
// the Ollama fallback received only inp.text (ungrounded). Fix: contextBlock is now
// hoisted before the `if (model)` block and threaded into fallbackToOllama.
//
// These tests use the injectable _spawnImpl so no subprocess is spawned (hermetic).
// ═══════════════════════════════════════════════════════════════════════════

test("fallbackToOllama: with contextBlock -- grounding is PREPENDED to the text sent to Ollama", async () => {
  // Simulates: Hermes failed, --with-context was set, contextBlock was built.
  const CONTEXT = "[PRISM memory: kienzle kc1.1=1800]\n";
  const TEXT = "what is the cutting force?";
  let capturedArgs = null;
  let capturedInput = null;
  const _spawnImpl = async (_bin, args, opts) => {
    capturedArgs = args;
    capturedInput = opts.input;
    return { stdout: "grounded answer" };
  };
  const result = await fallbackToOllama({ mode: "ask", text: TEXT, contextBlock: CONTEXT, timeout: 5000, _spawnImpl });
  assert.equal(result.ok, true);
  assert.equal(result.content, "grounded answer");
  // For "ask" mode the grounded text is passed as a positional arg (not stdin).
  const groundedArg = capturedArgs.find((a) => a.includes(CONTEXT.trim().slice(0, 10)));
  assert.ok(groundedArg, "the contextBlock must appear in the positional arg passed to ask-ollama");
  assert.ok(groundedArg.startsWith(CONTEXT), "contextBlock must be PREPENDED (grounding first, then user text)");
  assert.ok(groundedArg.endsWith(TEXT), "user text must follow the contextBlock");
  // stdin must be undefined for ask mode (text is positional, not piped)
  assert.equal(capturedInput, undefined);
});

test("fallbackToOllama: WITHOUT contextBlock -- text sent to Ollama is byte-identical to inp.text (no regression)", async () => {
  const TEXT = "explain this build error";
  let capturedArgs = null;
  const _spawnImpl = async (_bin, args, _opts) => {
    capturedArgs = args;
    return { stdout: "explanation" };
  };
  const result = await fallbackToOllama({ mode: "ask", text: TEXT, contextBlock: "", timeout: 5000, _spawnImpl });
  assert.equal(result.ok, true);
  // The positional arg must be exactly TEXT -- no prefix, no mutation.
  const textArg = capturedArgs[capturedArgs.length - 3]; // ask-ollama.mjs <mode> <TEXT> --timeout <ms>
  assert.equal(textArg, TEXT, "without contextBlock the text arg must be byte-identical to inp.text");
});

test("fallbackToOllama: file mode (summarize) -- grounding is passed via stdin, not as positional", async () => {
  const CONTEXT = "[PRISM memory: Taylor C=350]\n";
  const TEXT = "big file content here";
  let capturedInput = null;
  let capturedArgs = null;
  const _spawnImpl = async (_bin, args, opts) => {
    capturedArgs = args;
    capturedInput = opts.input;
    return { stdout: "summary" };
  };
  await fallbackToOllama({ mode: "summarize", text: TEXT, contextBlock: CONTEXT, timeout: 5000, _spawnImpl });
  // File modes pass "-" as the path argument and pipe content via stdin.
  assert.ok(capturedArgs.includes("-"), 'file mode must pass "-" to ask-ollama (stdin pipe)');
  assert.ok(typeof capturedInput === "string", "file mode must pass input via opts.input (stdin)");
  assert.ok(capturedInput.startsWith(CONTEXT), "contextBlock must be PREPENDED in the stdin pipe");
  assert.ok(capturedInput.endsWith(TEXT), "user text must follow the contextBlock in stdin");
});

test("fallbackToOllama: subprocess failure is surfaced as ok:false (fail loud, no crash)", async () => {
  const _spawnImpl = async () => { throw new Error("Ollama not running"); };
  const result = await fallbackToOllama({ mode: "ask", text: "q", contextBlock: "", timeout: 5000, _spawnImpl });
  assert.equal(result.ok, false);
  assert.match(result.error, /ollama fallback failed.*Ollama not running/);
});
