/**
 * ask-ollama.test.mjs — unit + integration tests for scripts/ask-ollama.mjs
 * (OLLAMA-EXPAND-MS0/U-OE01). Run: node --test scripts/__tests__/ask-ollama.test.mjs
 *
 * Strategy: every pure helper is asserted against real expected values
 * (no toBeDefined() stubs). The impure shell (loadGraph, callOllama,
 * runRequest) is exercised with injected deps; readFileCapped runs against
 * real temp files; loadGraph + runRequest ALSO have a real-data E2E against
 * the on-disk system-viz graph (skip-loud when absent) — so the production
 * wiring is proven, not just the hermetic fakes. fail-on-revert: each test
 * fails if the behavior regresses, not merely if the symbol is missing.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// SUBSTRATE-UTIL (w0yjhqcp9): ask-ollama viz now tries the warm :3101 daemon FIRST. Disable it
// here so the real-data E2E + injected-deps viz tests stay hermetic on the in-process graph path
// (no live daemon). The daemon-first + fallback paths are covered by the viz-daemon injected-stub
// tests in scripts/ask-ollama.test.mjs. searchViaDaemon reads this env at call time.
process.env.PRISM_INDEX_DAEMON_DISABLE = "1";

import {
  truncate,
  estimateTokens,
  pickModel,
  parseArgs,
  tokenizeQuery,
  scoreNode,
  searchGraph,
  renderHits,
  buildVizPrompt,
  buildFilePrompt,
  buildAskPrompt,
  savingsFooter,
  loadGraph,
  callOllama,
  readFileCapped,
  runRequest,
  FILE_MODES,
  TEXT_MODES,
  ALL_MODES,
  MAX_FILE_BYTES,
  mcpRoutingEnabled,
  extractLocalGeneratePayload,
  callViaMcp,
  callModel,
  scaleTimeoutForBytes,
} from "../ask-ollama.mjs";

/** Repo root + on-disk graph, for the real-data E2E (skip-loud if absent). */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REAL_GRAPH = join(REPO_ROOT, "state", "shared", "system-viz", "architecture-graph.json");
const HAVE_REAL_GRAPH = existsSync(REAL_GRAPH);

/** Small graph fixture reused by search + loadGraph + runRequest tests. */
const FIXTURE_GRAPH = {
  nodes: [
    { id: "calc.cutting_force", label: "Cutting Force", layer: "L4", status: "built", domain: "mill", info: "Kienzle cutting force model" },
    { id: "calc.tool_life", label: "Tool Life", layer: "L4", status: "built", domain: "mill", info: "Taylor tool life equation" },
    { id: "p.operator", label: "Operator", layer: "L0", status: "built", domain: "", info: "shop floor persona" },
  ],
};

// ─── truncate ────────────────────────────────────────────────────────────
test("truncate: leaves short strings untouched", () => {
  assert.equal(truncate("hello", 10), "hello");
  assert.equal(truncate("hello", 5), "hello");
});
test("truncate: cuts long strings with an honest marker", () => {
  assert.equal(truncate("abcdefghij", 5), "abcde…[+5 chars]");
});
test("truncate: handles null/undefined/non-string", () => {
  assert.equal(truncate(null, 5), "");
  assert.equal(truncate(undefined, 5), "");
  assert.equal(truncate(12345678, 3), "123…[+5 chars]");
});

// ─── estimateTokens ──────────────────────────────────────────────────────
test("estimateTokens: 4 chars ≈ 1 token", () => {
  assert.equal(estimateTokens("abcd"), 1);
  assert.equal(estimateTokens("abcde"), 2);
  assert.equal(estimateTokens(""), 0);
  assert.equal(estimateTokens(null), 0);
});

// ─── pickModel ───────────────────────────────────────────────────────────
test("pickModel: defaults to the KEPT floor coder model", () => {
  // BLACKWELL-MODEL-UPGRADE retired the 3b/7b/14b coders; qwen2.5-coder:32b is
  // the smallest model still pulled, so it is DEFAULT_MODEL. (Test was stale to
  // that upgrade until 2026-06-09.)
  assert.equal(pickModel(), "qwen2.5-coder:32b");
  assert.equal(pickModel(""), "qwen2.5-coder:32b");
  assert.equal(pickModel("   "), "qwen2.5-coder:32b", "blank override is ignored");
});
test("pickModel: explicit override wins", () => {
  assert.equal(pickModel("mistral:7b"), "mistral:7b");
});

// ─── mode sets ───────────────────────────────────────────────────────────
test("mode sets: file/text partition is complete and disjoint", () => {
  for (const m of FILE_MODES) assert.ok(!TEXT_MODES.has(m), `${m} not in both`);
  for (const m of [...FILE_MODES, ...TEXT_MODES]) assert.ok(ALL_MODES.has(m));
  assert.equal(ALL_MODES.size, FILE_MODES.size + TEXT_MODES.size);
});

// ─── parseArgs ───────────────────────────────────────────────────────────
test("parseArgs: viz query with flags", () => {
  const p = parseArgs(["viz", "where", "is", "kienzle", "--max-hits", "5"]);
  assert.equal(p.error, undefined);
  assert.equal(p.mode, "viz");
  assert.equal(p.input, "where is kienzle");
  assert.equal(p.flags.maxHits, 5);
  assert.equal(p.flags.synth, false);
});
test("parseArgs: --synth and --json are boolean flags", () => {
  const p = parseArgs(["viz", "force", "--synth", "--json"]);
  assert.equal(p.flags.synth, true);
  assert.equal(p.flags.json, true);
});
test("parseArgs: file mode + --model consuming the next arg", () => {
  const p = parseArgs(["summarize", "src/x.ts", "--model", "mistral:7b"]);
  assert.equal(p.mode, "summarize");
  assert.equal(p.input, "src/x.ts");
  assert.equal(p.flags.model, "mistral:7b");
});
test("parseArgs: errors are explicit, never silent", () => {
  assert.match(parseArgs([]).error, /no mode/);
  assert.match(parseArgs(["bogus"]).error, /unknown mode/);
  assert.match(parseArgs(["viz"]).error, /needs a query/);
  assert.match(parseArgs(["summarize"]).error, /needs a file path/);
  assert.match(parseArgs(["viz", "q", "--nope"]).error, /unknown flag/);
  assert.match(parseArgs(["viz", "q", "--max-hits", "0"]).error, /positive integer/);
  assert.match(parseArgs(["viz", "q", "--max-hits", "--synth"]).error, /positive integer/);
  assert.match(parseArgs(["viz", "q", "--timeout", "10"]).error, /≥ 1000/);
  assert.match(parseArgs(["viz", "q", "--model"]).error, /--model needs a value/);
});
test("parseArgs: --max-hits is capped at 50", () => {
  assert.equal(parseArgs(["viz", "q", "--max-hits", "999"]).flags.maxHits, 50);
});

// ─── tokenizeQuery ───────────────────────────────────────────────────────
test("tokenizeQuery: drops stopwords and short tokens", () => {
  assert.deepEqual(tokenizeQuery("what handles cutting force"), ["cutting", "force"]);
});
test("tokenizeQuery: dedupes and lowercases", () => {
  assert.deepEqual(tokenizeQuery("Force FORCE force"), ["force"]);
});
test("tokenizeQuery: all-stopword query falls back to raw words ≥2", () => {
  const t = tokenizeQuery("is it a");
  assert.ok(t.includes("is"), "fallback keeps 2-char words so a search still runs");
});
test("tokenizeQuery: empty query yields no tokens", () => {
  assert.deepEqual(tokenizeQuery(""), []);
  assert.deepEqual(tokenizeQuery(null), []);
});

// ─── scoreNode ───────────────────────────────────────────────────────────
test("scoreNode: id/label hits score double", () => {
  const node = { id: "calc.force", label: "Force Calc", info: "cutting force model" };
  assert.equal(scoreNode(node, ["force"]), 2, "force is in id+label (strong) → 1+1");
  assert.equal(scoreNode(node, ["cutting"]), 1, "cutting is only in info → 1");
  assert.equal(scoreNode(node, ["xyz"]), 0);
});
test("scoreNode: guards null node / empty tokens", () => {
  assert.equal(scoreNode(null, ["force"]), 0);
  assert.equal(scoreNode({ id: "a" }, []), 0);
});

// ─── searchGraph ─────────────────────────────────────────────────────────
test("searchGraph: ranks the best match first", () => {
  const hits = searchGraph("cutting force", FIXTURE_GRAPH, 12);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].id, "calc.cutting_force");
  assert.ok(hits[0].score >= 2, "two strong tokens → score ≥ 2");
});
test("searchGraph: returns the compact hit shape, no heavy fields", () => {
  const hits = searchGraph("force", FIXTURE_GRAPH, 12);
  const h = hits[0];
  assert.deepEqual(Object.keys(h).sort(), ["domain", "id", "info", "label", "layer", "score", "status"]);
});
test("searchGraph: respects maxHits and tolerates an empty graph", () => {
  assert.equal(searchGraph("force tool operator mill", FIXTURE_GRAPH, 1).length, 1);
  assert.deepEqual(searchGraph("force", { nodes: [] }, 12), []);
  assert.deepEqual(searchGraph("force", {}, 12), []);
  assert.deepEqual(searchGraph("force", null, 12), []);
});
test("searchGraph: no match returns empty, not a throw", () => {
  assert.deepEqual(searchGraph("zzzznonexistent", FIXTURE_GRAPH, 12), []);
});

// ─── renderHits / prompts ────────────────────────────────────────────────
test("renderHits: empty vs populated", () => {
  assert.match(renderHits([]), /no matching/);
  const out = renderHits([{ id: "a", label: "Alpha", layer: "L7", status: "built", domain: "", info: "i" }]);
  assert.match(out, /\[a\] Alpha/);
  assert.match(out, /L7, built/);
});
test("buildVizPrompt: embeds the question and the hits", () => {
  const p = buildVizPrompt("where is X", [{ id: "n1", label: "N1", info: "i" }]);
  assert.match(p, /QUESTION: where is X/);
  assert.match(p, /\[n1\]/);
  assert.match(p, /do not invent nodes/i);
});
test("buildFilePrompt: distinct instruction per mode, content fenced", () => {
  assert.match(buildFilePrompt("summarize", "f.ts", "CODE"), /Summarize this file/);
  assert.match(buildFilePrompt("explain", "f.ts", "CODE"), /plain language/);
  assert.match(buildFilePrompt("triage", "f.ts", "CODE"), /ROOT cause/);
  assert.match(buildFilePrompt("summarize", "f.ts", "CODE"), /```\nCODE\n```/);
});
test("buildAskPrompt: bare question", () => {
  assert.match(buildAskPrompt("why sky blue"), /QUESTION: why sky blue/);
});

// ─── savingsFooter ───────────────────────────────────────────────────────
test("savingsFooter: reports the offload delta, guards bad input", () => {
  const f = savingsFooter(40000, 400);
  assert.match(f, /~10000 tok/);
  assert.match(f, /~100 tok/);
  assert.match(f, /~9900 saved/);
  assert.match(savingsFooter(-5, -5), /~0 tok processed/);
  assert.match(savingsFooter(NaN, NaN), /~0 saved/);
});

// ─── loadGraph (injected fs deps) ────────────────────────────────────────
const smallStat = () => ({ size: 1024 });

test("loadGraph: reads + parses the first available graph file", () => {
  const r = loadGraph({
    root: "/x",
    existsImpl: (p) => p.includes("architecture-graph.json"),
    statImpl: smallStat,
    readImpl: () => JSON.stringify(FIXTURE_GRAPH),
  });
  assert.equal(r.ok, true);
  assert.equal(r.file, "architecture-graph.json");
  assert.equal(r.graph.nodes.length, 3);
});
test("loadGraph: falls back to system-graph.json", () => {
  const r = loadGraph({
    root: "/x",
    existsImpl: (p) => p.includes("system-graph.json"),
    statImpl: smallStat,
    readImpl: () => JSON.stringify(FIXTURE_GRAPH),
  });
  assert.equal(r.ok, true);
  assert.equal(r.file, "system-graph.json");
});
test("loadGraph: no graph file fails loud", () => {
  const r = loadGraph({ root: "/x", existsImpl: () => false, statImpl: smallStat, readImpl: () => "" });
  assert.equal(r.ok, false);
  assert.match(r.error, /no system-viz graph found/);
});
test("loadGraph: invalid JSON fails loud", () => {
  const r = loadGraph({ root: "/x", existsImpl: () => true, statImpl: smallStat, readImpl: () => "not json" });
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/);
});
test("loadGraph: missing nodes array fails loud", () => {
  const r = loadGraph({ root: "/x", existsImpl: () => true, statImpl: smallStat, readImpl: () => '{"foo":1}' });
  assert.equal(r.ok, false);
  assert.match(r.error, /no nodes array/);
});
test("loadGraph: an over-cap graph is SKIPPED, never read (OOM guard)", () => {
  let readCalled = false;
  const r = loadGraph({
    root: "/x",
    existsImpl: (p) => p.includes("system-graph.json"),
    statImpl: () => ({ size: 400 * 1024 * 1024 }),
    readImpl: () => { readCalled = true; return ""; },
  });
  assert.equal(r.ok, false);
  assert.equal(readCalled, false, "an over-cap file must never be readFileSync'd");
  assert.match(r.error, /too large/);
  assert.match(r.error, /generate-system-viz/);
});
test("loadGraph: a non-numeric stat size fails loud (no fail-open read)", () => {
  let readCalled = false;
  const r = loadGraph({
    root: "/x",
    existsImpl: () => true,
    statImpl: () => ({ size: undefined }),
    readImpl: () => { readCalled = true; return ""; },
  });
  assert.equal(r.ok, false);
  assert.equal(readCalled, false, "an unsized file must never be read");
  assert.match(r.error, /cannot determine the size/);
});
test("loadGraph: a stat failure fails loud", () => {
  const r = loadGraph({
    root: "/x",
    existsImpl: () => true,
    statImpl: () => { throw new Error("EACCES"); },
    readImpl: () => "",
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /cannot stat/);
});
test(
  "loadGraph: REAL on-disk architecture graph parses (E2E)",
  { skip: HAVE_REAL_GRAPH ? false : "architecture-graph.json not present" },
  () => {
    const r = loadGraph();
    assert.equal(r.ok, true, r.error || "");
    assert.ok(Array.isArray(r.graph.nodes) && r.graph.nodes.length > 100, "real graph has many nodes");
  },
);

// ─── callOllama (injected fetchImpl) ─────────────────────────────────────
const fakeRes = (over = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({ response: "the answer", eval_count: 7 }),
  text: async () => "",
  ...over,
});

test("callOllama: returns trimmed text on success", async () => {
  const r = await callOllama("m", "prompt", { fetchImpl: async () => fakeRes() });
  assert.equal(r.ok, true);
  assert.equal(r.text, "the answer");
  assert.equal(r.evalCount, 7);
});
test("callOllama: request body carries keep_alive and stream:false", async () => {
  let captured;
  await callOllama("m", "p", {
    fetchImpl: async (_url, opts) => { captured = JSON.parse(opts.body); return fakeRes(); },
  });
  assert.equal(captured.keep_alive, "10m");
  assert.equal(captured.stream, false);
});
test("callOllama: HTTP error is reported, not thrown", async () => {
  const r = await callOllama("m", "p", {
    fetchImpl: async () => fakeRes({ ok: false, status: 404, text: async () => "no model" }),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /HTTP 404/);
  assert.match(r.error, /no model/);
});
test("callOllama: empty response is a failure", async () => {
  const r = await callOllama("m", "p", {
    fetchImpl: async () => fakeRes({ json: async () => ({ response: "   " }) }),
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty/);
});
test("callOllama: network throw becomes an unreachable error", async () => {
  const r = await callOllama("m", "p", { fetchImpl: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(r.ok, false);
  assert.match(r.error, /unreachable/);
  assert.match(r.error, /ECONNREFUSED/);
});
test("callOllama: abort surfaces as a cold-load-aware timeout message", async () => {
  const r = await callOllama("m", "p", {
    timeoutMs: 1000,
    fetchImpl: async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; },
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out/);
  assert.match(r.error, /cold-loading/);
});

// ─── readFileCapped ──────────────────────────────────────────────────────
test("readFileCapped: reads a real file", () => {
  const dir = mkdtempSync(join(tmpdir(), "askollama-"));
  const f = join(dir, "small.txt");
  writeFileSync(f, "hello world");
  try {
    const r = readFileCapped(f);
    assert.equal(r.ok, true);
    assert.equal(r.content, "hello world");
    assert.equal(r.truncated, false);
  } finally {
    unlinkSync(f);
  }
});
test("readFileCapped: missing file fails loud", () => {
  const r = readFileCapped(join(tmpdir(), "definitely-not-here-" + Date.now() + ".txt"));
  assert.equal(r.ok, false);
  assert.match(r.error, /not found/);
});
test("readFileCapped: caps oversized files and reports truncation", () => {
  const dir = mkdtempSync(join(tmpdir(), "askollama-big-"));
  const f = join(dir, "big.txt");
  writeFileSync(f, "x".repeat(MAX_FILE_BYTES + 5000));
  try {
    const r = readFileCapped(f);
    assert.equal(r.ok, true);
    assert.equal(r.truncated, true);
    assert.equal(r.content.length, MAX_FILE_BYTES);
    assert.ok(r.bytes > MAX_FILE_BYTES);
  } finally {
    unlinkSync(f);
  }
});

// ─── runRequest: viz orchestration ───────────────────────────────────────
const okGraph = () => ({ ok: true, graph: FIXTURE_GRAPH, file: "architecture-graph.json", bytes: 999 });

test("runRequest viz: default returns ranked hits, no Ollama call", async () => {
  let ollamaCalled = false;
  const deps = {
    loadGraph: okGraph,
    callOllama: async () => { ollamaCalled = true; return { ok: true, text: "x" }; },
  };
  const r = await runRequest({ mode: "viz", input: "cutting force", flags: { synth: false, maxHits: 12, timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(ollamaCalled, false, "viz without --synth must not call Ollama");
  assert.match(r.output, /\[calc\.cutting_force\]/);
  assert.match(r.output, /scanned 3 graph nodes/);
});
test("runRequest viz --synth: synthesizes, calls Ollama, threads the timeout", async () => {
  let ollamaCalled = false;
  let passedTimeout;
  const deps = {
    loadGraph: okGraph,
    callOllama: async (_m, _p, opts) => {
      ollamaCalled = true;
      passedTimeout = opts.timeoutMs;
      return { ok: true, text: "synthesized [calc.cutting_force]" };
    },
  };
  const r = await runRequest({ mode: "viz", input: "cutting force", flags: { synth: true, maxHits: 12, timeout: 4242 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(ollamaCalled, true, "--synth must actually call Ollama");
  assert.equal(passedTimeout, 4242, "flags.timeout must thread into callOllama");
  assert.match(r.output, /synthesized/);
});
test("runRequest viz --synth: degrades to hits (exit 0) when Ollama is down", async () => {
  const deps = { loadGraph: okGraph, callOllama: async () => ({ ok: false, error: "Ollama timed out after 180000ms" }) };
  const r = await runRequest({ mode: "viz", input: "cutting force", flags: { synth: true, maxHits: 12, timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0, "degrade path must still succeed — graph hits beat nothing");
  assert.match(r.output, /synthesis unavailable/);
  assert.match(r.output, /\[calc\.cutting_force\]/);
});
test("runRequest viz: graph load failure is exit 3", async () => {
  const deps = { loadGraph: () => ({ ok: false, error: "no system-viz graph found" }) };
  const r = await runRequest({ mode: "viz", input: "q", flags: { synth: false, maxHits: 12, timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /no system-viz graph found/);
});

// ─── runRequest: rerank orchestration (verified ollama re-rank) ───────────
// 3-node graph all matching "force" so searchGraph yields >=2 candidates (the
// re-rank only calls the model with >=2). Lexical order is alpha,beta,gamma.
const forceGraph = () => ({
  ok: true, file: "architecture-graph.json", bytes: 1,
  graph: { nodes: [
    { id: "n.alpha", label: "Alpha force", info: "force one" },
    { id: "n.beta", label: "Beta force", info: "force two" },
    { id: "n.gamma", label: "Gamma force", info: "force three" },
  ] },
});
test("runRequest rerank: valid model reorder -> VERIFIED, ids reordered", async () => {
  let passedTimeout;
  const deps = {
    loadGraph: forceGraph,
    callModel: async (_m, _p, opts) => { passedTimeout = opts.timeoutMs; return { ok: true, text: "[n.gamma]\n[n.alpha]\n[n.beta]" }; },
  };
  const r = await runRequest({ mode: "rerank", input: "force", flags: { maxHits: 12, timeout: 4242 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(passedTimeout, 4242, "flags.timeout must thread into the model call");
  assert.match(r.output, /VERIFIED/);
  // gamma promoted above alpha (lexical had alpha first)
  assert.ok(r.output.indexOf("[n.gamma]") < r.output.indexOf("[n.alpha]"), "model order must win when verified");
});
test("runRequest rerank: model down -> fall back to lexical order (exit 0)", async () => {
  const deps = {
    loadGraph: forceGraph,
    callModel: async () => ({ ok: false, error: "Ollama unreachable: ECONNREFUSED" }),
  };
  const r = await runRequest({ mode: "rerank", input: "force", flags: { maxHits: 12, timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0, "a down model must NOT fail the search -- lexical hits beat nothing");
  assert.match(r.output, /fell back to lexical/);
  assert.ok(r.output.indexOf("[n.alpha]") < r.output.indexOf("[n.gamma]"), "fallback preserves lexical order");
});
test("runRequest rerank: graph load failure is exit 3", async () => {
  const deps = { loadGraph: () => ({ ok: false, error: "no system-viz graph found" }) };
  const r = await runRequest({ mode: "rerank", input: "q", flags: { maxHits: 12, timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 3);
  assert.match(r.output, /no system-viz graph found/);
});
test(
  "runRequest viz: REAL graph end-to-end, no injected loadGraph (E2E)",
  { skip: HAVE_REAL_GRAPH ? false : "architecture-graph.json not present" },
  async () => {
    // {} deps — exercises the real loadGraph + searchGraph against the disk graph.
    const r = await runRequest(
      { mode: "viz", input: "cutting force", flags: { synth: false, maxHits: 6, timeout: 1000 } },
      {},
    );
    assert.equal(r.exitCode, 0, r.output);
    assert.match(r.output, /scanned \d+ graph nodes/);
  },
);

// ─── runRequest: ask + file modes ────────────────────────────────────────
test("runRequest ask: returns the model answer", async () => {
  const deps = { callOllama: async () => ({ ok: true, text: "42" }) };
  const r = await runRequest({ mode: "ask", input: "meaning", flags: { timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(r.output, "42");
});
test("runRequest ask: Ollama down -> exit 3 + actionable Sonnet-fallback directive (P0-3)", async () => {
  const deps = { callOllama: async () => ({ ok: false, error: "Ollama unreachable" }) };
  const r = await runRequest({ mode: "ask", input: "q", flags: { timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 3);
  // P0-3 (OLLAMA-FLEET-AUDIT FM-2): the dead-end no longer emits a cryptic
  // error -- it hands Claude an explicit "you are the fallback" directive.
  assert.match(r.output, /OLLAMA FALLBACK/);
  assert.match(r.output, /you are the fallback/i);
  assert.match(r.output, /Ollama unreachable/);
});
test("runRequest ask --json down -> machine-readable {lane:claude} fallback hint (P0-3)", async () => {
  const deps = { callOllama: async () => ({ ok: false, error: "ECONNREFUSED" }) };
  const r = await runRequest({ mode: "ask", input: "q", flags: { timeout: 1000, json: true } }, deps);
  assert.equal(r.exitCode, 3);
  const parsed = JSON.parse(r.output); // must be valid JSON (was a bare error string before)
  assert.equal(parsed.lane, "claude");
  assert.equal(parsed.ollamaUnavailable, true);
  assert.equal(parsed.fellBack, true);
});
test("runRequest summarize: reads file then synthesizes", async () => {
  const deps = {
    readFileCapped: () => ({ ok: true, content: "FILE BODY", bytes: 9, truncated: false }),
    callOllama: async () => ({ ok: true, text: "this file does X" }),
  };
  const r = await runRequest({ mode: "summarize", input: "f.ts", flags: { timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 0);
  assert.match(r.output, /this file does X/);
});

// ─── P1-5: input-size-scaled timeout (FM-4: large inputs always failed at 180s) ──
test("scaleTimeoutForBytes: floor for small, scales up for large, capped, base wins, edges", () => {
  const D = 180000;
  assert.equal(scaleTimeoutForBytes(1000), D, "small input keeps the default floor");
  assert.ok(scaleTimeoutForBytes(57000) > D, "57KB scales above the default");
  assert.equal(scaleTimeoutForBytes(256000), 600000, "256KB caps at the 10min ceiling");
  assert.equal(scaleTimeoutForBytes(57000, 300000), 300000, "a larger base (explicit) wins");
  for (const bad of [0, -5, "x", null, undefined, NaN]) {
    assert.equal(scaleTimeoutForBytes(bad), D, `bad input ${String(bad)} -> floor`);
  }
});
test("runRequest file-mode: timeout SCALES with file size when --timeout not pinned (P1-5)", async () => {
  let passedTimeout;
  const big = "x".repeat(200000); // 200KB -> scaled well above the 180s default
  const deps = {
    readFileCapped: () => ({ ok: true, content: big, bytes: big.length, truncated: false }),
    callModel: async (_m, _p, opts) => { passedTimeout = opts.timeoutMs; return { ok: true, text: "summary" }; },
  };
  const r = await runRequest({ mode: "summarize", input: "big.md", flags: {} }, deps);
  assert.equal(r.exitCode, 0);
  assert.ok(passedTimeout > 180000, `200KB must scale the timeout above 180s, got ${passedTimeout}`);
});
test("runRequest file-mode: explicit --timeout WINS over size-scaling (P1-5)", async () => {
  let passedTimeout;
  const big = "x".repeat(200000);
  const deps = {
    readFileCapped: () => ({ ok: true, content: big, bytes: big.length, truncated: false }),
    callModel: async (_m, _p, opts) => { passedTimeout = opts.timeoutMs; return { ok: true, text: "summary" }; },
  };
  // operator pinned --timeout 5000 -> must NOT be scaled up despite the 200KB input
  const r = await runRequest({ mode: "summarize", input: "big.md", flags: { timeout: 5000, timeoutExplicit: true } }, deps);
  assert.equal(r.exitCode, 0);
  assert.equal(passedTimeout, 5000, "an explicit --timeout must win over size-scaling");
});
test("runRequest summarize: missing file is exit 2 (usage), not 3", async () => {
  const deps = { readFileCapped: () => ({ ok: false, error: "file not found: f.ts" }) };
  const r = await runRequest({ mode: "summarize", input: "f.ts", flags: { timeout: 1000 } }, deps);
  assert.equal(r.exitCode, 2);
  assert.match(r.output, /file not found/);
});
test("runRequest: --json output is machine-parseable", async () => {
  const deps = { callOllama: async () => ({ ok: true, text: "json answer" }) };
  const r = await runRequest({ mode: "ask", input: "q", flags: { json: true, timeout: 1000 } }, deps);
  const parsed = JSON.parse(r.output);
  assert.equal(parsed.mode, "ask");
  assert.equal(parsed.answer, "json answer");
});

// ─── MCP routing (LOCAL-LLM-MS1/U-LOCAL-GENERATE-CONSUMER) ─────────────────

// mcpRoutingEnabled — pure env gate
test("mcpRoutingEnabled: truthy spellings enable, case/space-insensitive", () => {
  for (const v of ["1", "true", "TRUE", "yes", "on", "  On  "]) {
    assert.equal(mcpRoutingEnabled({ PRISM_LOCAL_LLM_VIA_MCP: v }), true, `'${v}' should enable`);
  }
});
test("mcpRoutingEnabled: unset/falsey/garbage stays OFF (default path preserved)", () => {
  for (const v of [undefined, "", "0", "false", "no", "1x", "enabled-ish"]) {
    assert.equal(mcpRoutingEnabled({ PRISM_LOCAL_LLM_VIA_MCP: v }), false, `'${v}' should NOT enable`);
  }
  assert.equal(mcpRoutingEnabled({}), false);
  assert.equal(mcpRoutingEnabled(null), false); // adversarial: null env never throws
});

// extractLocalGeneratePayload — pure unwrap of the MCP tools/call result
test("extractLocalGeneratePayload: prefers structuredContent shaped like the output", () => {
  const r = extractLocalGeneratePayload({ structuredContent: { success: true, content: "hi", model: "m" } });
  assert.equal(r.ok, true);
  assert.equal(r.data.content, "hi");
});
test("extractLocalGeneratePayload: parses content[].text JSON (joined across parts)", () => {
  const json = JSON.stringify({ success: true, content: "answer", model: "gpt-oss:20b" });
  const r = extractLocalGeneratePayload({ content: [{ type: "text", text: json }] });
  assert.equal(r.ok, true);
  assert.equal(r.data.success, true);
  assert.equal(r.data.content, "answer");
});
test("extractLocalGeneratePayload: tool-level isError surfaces the error text (not a JSON-parse complaint)", () => {
  // Live 2026-06-09: a :3100 bundle predating local_generate returns an error
  // text part. We must surface THAT, not "not valid JSON", so the fallback is clean.
  const r = extractLocalGeneratePayload({ isError: true, content: [{ type: "text", text: "MCP error: unknown action local_generate" }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown action local_generate/);
  assert.doesNotMatch(r.error, /not valid JSON/i);
});
test("extractLocalGeneratePayload: non-object result is fail-loud", () => {
  assert.equal(extractLocalGeneratePayload(null).ok, false);
  assert.equal(extractLocalGeneratePayload("nope").ok, false);
});
test("extractLocalGeneratePayload: content text that is not JSON is fail-loud (never silent)", () => {
  const r = extractLocalGeneratePayload({ content: [{ type: "text", text: "not json {" }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/i);
});
test("extractLocalGeneratePayload: neither structuredContent nor text part is fail-loud", () => {
  const r = extractLocalGeneratePayload({ content: [{ type: "image" }] });
  assert.equal(r.ok, false);
  assert.match(r.error, /neither structuredContent nor a text content part/i);
});
test("extractLocalGeneratePayload: structuredContent missing success falls through to content path", () => {
  // adversarial: a partial structuredContent must NOT be trusted; the text part wins.
  const json = JSON.stringify({ success: true, content: "from-text" });
  const r = extractLocalGeneratePayload({ structuredContent: { foo: 1 }, content: [{ type: "text", text: json }] });
  assert.equal(r.ok, true);
  assert.equal(r.data.content, "from-text");
});

// callViaMcp — routes through prism_local:local_generate (injected mcpCallImpl)
test("callViaMcp: happy path builds the local_generate call + returns callOllama shape", async () => {
  let captured = null;
  const mcpCallImpl = async (args) => {
    captured = args;
    return { ok: true, result: { content: [{ type: "text", text: JSON.stringify({ success: true, content: "hello from mcp", model: "gpt-oss:20b", ollamaUsed: true }) }] } };
  };
  const r = await callViaMcp("gpt-oss:20b", "what is 2+2", { numPredict: 256, timeoutMs: 30000, mcpCallImpl });
  assert.equal(r.ok, true);
  assert.equal(r.text, "hello from mcp");
  assert.equal(r.source, "mcp");
  // the dispatcher contract: prism_local / local_generate, params mapped correctly
  assert.equal(captured.dispatcher, "prism_local");
  assert.equal(captured.action, "local_generate");
  assert.equal(captured.params.prompt, "what is 2+2");
  assert.equal(captured.params.model, "gpt-oss:20b");
  assert.equal(captured.params.maxTokens, 256); // numPredict -> maxTokens
  assert.equal(captured.params.timeoutMs, 30000);
  assert.equal(captured.timeoutMs, 35000); // envelope timeout = inner + 5s margin
  assert.equal("system" in captured.params, false); // omitted when not provided
});
test("callViaMcp: a system prompt is forwarded when supplied", async () => {
  let captured = null;
  const mcpCallImpl = async (args) => { captured = args; return { ok: true, result: { structuredContent: { success: true, content: "ok" } } }; };
  await callViaMcp("m", "p", { system: "You are terse.", mcpCallImpl });
  assert.equal(captured.params.system, "You are terse.");
});
test("callViaMcp: numCtx forwards to local_generate params, omitted when unset (large-context callers must not truncate)", async () => {
  let captured = null;
  const mcpCallImpl = async (args) => { captured = args; return { ok: true, result: { structuredContent: { success: true, content: "ok" } } }; };
  await callViaMcp("m", "p", { numCtx: 32768, mcpCallImpl });
  assert.equal(captured.params.numCtx, 32768);
  captured = null;
  await callViaMcp("m", "p", { mcpCallImpl });
  assert.equal(Object.prototype.hasOwnProperty.call(captured.params, "numCtx"), false);
});
test("callOllama: numCtx maps to options.num_ctx in the request body, absent when unset (the fail-soft fallback also preserves context)", async () => {
  let body = null;
  const fetchImpl = async (_url, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ response: "hi" }) }; };
  const a = await callOllama("m", "p", { fetchImpl, numCtx: 32768 });
  assert.equal(a.ok, true);
  assert.equal(body.options.num_ctx, 32768);
  body = null;
  await callOllama("m", "p", { fetchImpl });
  assert.equal(Object.prototype.hasOwnProperty.call(body.options, "num_ctx"), false);
});
test("callViaMcp: MCP transport failure is fail-loud with source mcp (then caller can fall back)", async () => {
  const mcpCallImpl = async () => ({ ok: false, error: "MCP unreachable at http://127.0.0.1:3100/mcp" });
  const r = await callViaMcp("m", "p", { mcpCallImpl });
  assert.equal(r.ok, false);
  assert.equal(r.source, "mcp");
  assert.match(r.error, /MCP route:.*unreachable/);
});
test("callViaMcp: dispatcher success:false surfaces the dispatcher error", async () => {
  const mcpCallImpl = async () => ({ ok: true, result: { structuredContent: { success: false, content: "", error: "ollama cold" } } });
  const r = await callViaMcp("m", "p", { mcpCallImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /local_generate failed: ollama cold/);
});
test("callViaMcp: success:true but empty content is fail-loud (not a phantom ok)", async () => {
  const mcpCallImpl = async () => ({ ok: true, result: { structuredContent: { success: true, content: "   " } } });
  const r = await callViaMcp("m", "p", { mcpCallImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty content/);
});

// callModel — transport router with fail-soft fallback
test("callModel: gate OFF routes directly to Ollama, never touches MCP", async () => {
  let mcpCalled = false;
  const callOllamaImpl = async () => ({ ok: true, text: "direct" });
  const callViaMcpImpl = async () => { mcpCalled = true; return { ok: true, text: "via-mcp" }; };
  const r = await callModel("m", "p", { viaMcp: false, callOllamaImpl, callViaMcpImpl });
  assert.equal(r.text, "direct");
  assert.equal(r.source, "ollama");
  assert.equal(mcpCalled, false);
});
test("callModel: gate ON + MCP ok returns the MCP answer, never touches Ollama", async () => {
  let ollamaCalled = false;
  const callOllamaImpl = async () => { ollamaCalled = true; return { ok: true, text: "direct" }; };
  const callViaMcpImpl = async () => ({ ok: true, text: "via-mcp" });
  const r = await callModel("m", "p", { viaMcp: true, callOllamaImpl, callViaMcpImpl });
  assert.equal(r.text, "via-mcp");
  assert.equal(r.source, "mcp");
  assert.equal(ollamaCalled, false);
});
test("callModel: gate ON + MCP fails FAILS SOFT to direct Ollama (carries mcpError)", async () => {
  const callOllamaImpl = async () => ({ ok: true, text: "direct-fallback" });
  const callViaMcpImpl = async () => ({ ok: false, error: "MCP route: server down" });
  const r = await callModel("m", "p", { viaMcp: true, callOllamaImpl, callViaMcpImpl });
  assert.equal(r.ok, true);
  assert.equal(r.text, "direct-fallback");
  assert.equal(r.source, "ollama-fallback");
  assert.match(r.mcpError, /server down/);
});
test("callModel: gate ON + BOTH fail returns the Ollama error (primary path), mcpError attached", async () => {
  const callOllamaImpl = async () => ({ ok: false, error: "Ollama unreachable" });
  const callViaMcpImpl = async () => ({ ok: false, error: "MCP down" });
  const r = await callModel("m", "p", { viaMcp: true, callOllamaImpl, callViaMcpImpl });
  assert.equal(r.ok, false);
  assert.equal(r.source, "ollama");
  assert.match(r.error, /Ollama unreachable/);
  assert.match(r.mcpError, /MCP down/);
});
test("callModel: viaMcp defaults to the env gate (set+restore, no leak)", async () => {
  const prev = process.env.PRISM_LOCAL_LLM_VIA_MCP;
  try {
    process.env.PRISM_LOCAL_LLM_VIA_MCP = "1";
    let mcpCalled = false;
    const callViaMcpImpl = async () => { mcpCalled = true; return { ok: true, text: "x" }; };
    const callOllamaImpl = async () => ({ ok: true, text: "y" });
    await callModel("m", "p", { callOllamaImpl, callViaMcpImpl }); // no explicit viaMcp -> reads env
    assert.equal(mcpCalled, true);
  } finally {
    if (prev === undefined) delete process.env.PRISM_LOCAL_LLM_VIA_MCP;
    else process.env.PRISM_LOCAL_LLM_VIA_MCP = prev;
  }
});
test("callModel: does not forward the impl-injection keys into the inner call opts", async () => {
  // Guards the runRequest contract: existing callOllama stubs must see only
  // {timeoutMs}, never callOllamaImpl/callViaMcpImpl/viaMcp leaking through.
  let seen = null;
  const callOllamaImpl = async (model, prompt, opts) => { seen = opts; return { ok: true, text: "z" }; };
  await callModel("m", "p", { viaMcp: false, timeoutMs: 4242, callOllamaImpl, callViaMcpImpl: async () => ({ ok: false }) });
  // The test's intent (above): the IMPL-INJECTION keys must never leak into the inner opts.
  // numCtx (defaultNumCtxForPrompt) is a LEGIT forwarded generation param, so assert the intent
  // directly (impl-keys absent + real opts present) rather than an over-strict deepEqual that
  // went stale when numCtx forwarding landed. (Drive-by fix of a pre-existing failure, unrelated
  // to the viz-daemon change in this commit -- the deepEqual was red before this edit.)
  assert.equal(seen.callOllamaImpl, undefined, "callOllamaImpl must not leak into inner opts");
  assert.equal(seen.callViaMcpImpl, undefined, "callViaMcpImpl must not leak into inner opts");
  assert.equal(seen.viaMcp, undefined, "viaMcp must not leak into inner opts");
  assert.equal(seen.timeoutMs, 4242, "real opts (timeoutMs) forwarded through");
});
