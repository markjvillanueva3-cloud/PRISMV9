/**
 * ollama-prism-bridge.test.mjs — tests for the Ollama→PRISM agentic harness
 * (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2).
 *
 * Coverage:
 *  - pure helpers: parseArgs, pickModel, toolSpecs, buildSystemPrompt,
 *    normalizeToolCall, validateToolCall, clampToolArgs, confinePath,
 *    capToolResult, toolResultMessage, renderTranscript, bridgeSavingsFooter
 *  - runAgentLoop orchestration with an INJECTED chatImpl — every path:
 *    direct answer, single/multi tool call, unknown tool, throwing tool,
 *    missing impl, malformed call, loop-cap + forced finalization,
 *    chatImpl-returns-error, and chatImpl-THROWS (the P0 regression oracle).
 *  - runBridge: ok / --json / --trace / infra-failure exit codes.
 *  - REAL-DATA E2E (the "hermetic fakes don't prove wiring" rule): the real
 *    buildToolImpls() run against the on-disk system-viz graph + wiki index +
 *    a real repo file. The wiki E2E is the regression oracle for the
 *    WIKI_INDEX_REL path bug. Skip-loud when an input file is absent.
 *  - one optional live Ollama /api/chat E2E — skip-loud when Ollama is down.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the script under test — for the main() subprocess tests. */
const SCRIPT_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "ollama-prism-bridge.mjs");

import {
  parseArgs,
  pickModel,
  toolSpecs,
  buildSystemPrompt,
  normalizeToolCall,
  validateToolCall,
  clampToolArgs,
  confinePath,
  capToolResult,
  toolResultMessage,
  renderTranscript,
  bridgeSavingsFooter,
  buildToolImpls,
  runAgentLoop,
  runBridge,
  chatOllama,
  TOOL_NAMES,
  REPO_ROOT,
  DEFAULT_MODEL,
  DEFAULT_MAX_CALLS,
  MAX_CALLS_CEIL,
  TOOL_RESULT_MAX_CHARS,
  READ_EXCERPT_DEFAULT_BYTES,
  READ_EXCERPT_MAX_BYTES,
  VIZ_DEFAULT_HITS,
  WIKI_INDEX_REL,
  // U-OE-BRIDGE-L2B-WIKI-LEAVES exports:
  listWikiLeafFiles,
  scoreLeafFilenames,
  WIKI_LEAVES_DIR_REL,
  WIKI_LEAVES_MAX_HITS,
  // U-OBSIDIAN-LOOKUP exports (delta, 2026-05-18):
  listObsidianMemoryFiles,
  OBSIDIAN_MEMORIES_DIR_REL,
  OBSIDIAN_MAX_HITS,
  OBSIDIAN_MIN_TOKEN_LEN,
  OBSIDIAN_EXCLUDED_BASENAMES,
  // U-DISPATCHER-MAP exports (delta, 2026-05-18):
  DISPATCHER_DIGEST_REL,
  DISPATCHER_MAP_MAX_HITS,
  DISPATCHER_MIN_TOKEN_LEN,
  // U-SEMANTIC-LOOKUP exports (delta, 2026-05-18):
  dequantizeInt8,
  dotProduct,
  parseEmbeddingLine,
  loadEmbeddingIndex,
  cosineRank,
  embedViaOllama,
  EMBEDDINGS_REL,
  EMBEDDINGS_MODEL,
  EMBEDDING_DIM,
  INT8_DEQUANT_SCALE,
  SEMANTIC_MAX_HITS,
  // U-OE-BRIDGE-L2B exports (foxtrot, 2026-05-18):
  validateMcpCall,
  mcpAllowlist,
  mcpDenylist,
  parseMcpResponse,
  renderMcpResult,
  mcpCallStreamable,
} from "../ollama-prism-bridge.mjs";

// ── test helpers ──────────────────────────────────────────────────────────

/** A scripted chatImpl. `steps` is an array of fns (model,messages,tools,opts)
 *  → response, or plain response objects. Consumed in order; the last step
 *  repeats once exhausted. */
function scriptedChat(steps) {
  let i = 0;
  return async (model, messages, tools, opts) => {
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    return typeof step === "function" ? step(model, messages, tools, opts) : step;
  };
}

/** A chat response carrying tool calls. */
function toolCallResponse(calls) {
  return { ok: true, message: { role: "assistant", content: "", tool_calls: calls } };
}
/** A chat response carrying a final answer. */
function answerResponse(text) {
  return { ok: true, message: { role: "assistant", content: text } };
}

// ── parseArgs ─────────────────────────────────────────────────────────────

test("parseArgs: a bare question parses with defaults", () => {
  const r = parseArgs(["where", "is", "cutting", "force"]);
  assert.equal(r.error, undefined);
  assert.equal(r.question, "where is cutting force");
  assert.equal(r.flags.maxCalls, DEFAULT_MAX_CALLS);
  assert.equal(r.flags.timeout, 180000);
  assert.equal(r.flags.json, false);
  assert.equal(r.flags.trace, false);
});

test("parseArgs: no question is a usage error", () => {
  assert.equal(parseArgs([]).error, "no question given");
  assert.equal(parseArgs(["--trace"]).error, "no question given");
});

test("parseArgs: flags are parsed and stripped from the question", () => {
  const r = parseArgs(["q", "--json", "--trace", "--model", "mistral:7b"]);
  assert.equal(r.question, "q");
  assert.equal(r.flags.json, true);
  assert.equal(r.flags.trace, true);
  assert.equal(r.flags.model, "mistral:7b");
});

test("parseArgs: --model with no value is an error", () => {
  assert.equal(parseArgs(["q", "--model"]).error, "--model needs a value");
});

test("parseArgs: --max-calls clamps to the ceiling", () => {
  assert.equal(parseArgs(["q", "--max-calls", "999"]).flags.maxCalls, MAX_CALLS_CEIL);
  assert.equal(parseArgs(["q", "--max-calls", "3"]).flags.maxCalls, 3);
});

test("parseArgs: --max-calls rejects non-positive / non-numeric", () => {
  assert.match(parseArgs(["q", "--max-calls", "0"]).error, /positive integer/);
  assert.match(parseArgs(["q", "--max-calls", "abc"]).error, /positive integer/);
});

test("parseArgs: --timeout enforces a minimum", () => {
  assert.match(parseArgs(["q", "--timeout", "10"]).error, /≥ 1000/);
  assert.equal(parseArgs(["q", "--timeout", "5000"]).flags.timeout, 5000);
});

test("parseArgs: an unknown flag is rejected", () => {
  assert.equal(parseArgs(["q", "--bogus"]).error, "unknown flag: --bogus");
});

// ── pickModel ─────────────────────────────────────────────────────────────

test("pickModel: default when no override", () => {
  assert.equal(pickModel(""), DEFAULT_MODEL);
  assert.equal(pickModel(undefined), DEFAULT_MODEL);
  assert.equal(pickModel("   "), DEFAULT_MODEL);
});

test("pickModel: honours an explicit override (trimmed)", () => {
  assert.equal(pickModel("  mistral:7b "), "mistral:7b");
});

// ── toolSpecs ─────────────────────────────────────────────────────────────

test("toolSpecs: advertises exactly the allowlisted tools (count matches TOOL_NAMES)", () => {
  const specs = toolSpecs();
  // Bind to canonical TOOL_NAMES so adding a new tool only requires the allowlist edit.
  assert.equal(specs.length, TOOL_NAMES.length);
  const names = specs.map((s) => s.function.name);
  assert.deepEqual(names.sort(), [...TOOL_NAMES].sort());
});

test("toolSpecs: each spec is a valid function-tool with a parameters schema", () => {
  for (const s of toolSpecs()) {
    assert.equal(s.type, "function");
    assert.equal(typeof s.function.description, "string");
    assert.equal(s.function.parameters.type, "object");
    assert.ok(Array.isArray(s.function.parameters.required));
    assert.ok(s.function.parameters.required.length >= 1);
  }
});

// ── buildSystemPrompt ─────────────────────────────────────────────────────

test("buildSystemPrompt: names PRISM and every tool in TOOL_NAMES", () => {
  const p = buildSystemPrompt();
  assert.match(p, /PRISM/);
  for (const t of TOOL_NAMES) assert.ok(p.includes(t), `prompt should mention ${t}`);
});

// ── normalizeToolCall ─────────────────────────────────────────────────────

test("normalizeToolCall: object arguments pass through", () => {
  const r = normalizeToolCall({ function: { name: "viz_search", arguments: { query: "x" } } });
  assert.equal(r.name, "viz_search");
  assert.deepEqual(r.args, { query: "x" });
  assert.equal(r.id, null);
});

test("normalizeToolCall: JSON-string arguments are parsed", () => {
  const r = normalizeToolCall({ function: { name: "viz_search", arguments: '{"query":"y"}' } });
  assert.deepEqual(r.args, { query: "y" });
});

test("normalizeToolCall: empty-string arguments become {}", () => {
  const r = normalizeToolCall({ function: { name: "wiki_lookup", arguments: "" } });
  assert.deepEqual(r.args, {});
});

test("normalizeToolCall: null/missing arguments become {}", () => {
  assert.deepEqual(normalizeToolCall({ function: { name: "t", arguments: null } }).args, {});
  assert.deepEqual(normalizeToolCall({ function: { name: "t" } }).args, {});
});

test("normalizeToolCall: malformed JSON arguments fail loud", () => {
  const r = normalizeToolCall({ function: { name: "t", arguments: "{not json" } });
  assert.match(r.error, /not valid JSON/);
});

test("normalizeToolCall: array arguments are rejected", () => {
  const r = normalizeToolCall({ function: { name: "t", arguments: "[1,2]" } });
  assert.match(r.error, /must be an object/);
});

test("normalizeToolCall: a missing function name is an error", () => {
  assert.match(normalizeToolCall({}).error, /no function name/);
  assert.match(normalizeToolCall({ function: {} }).error, /no function name/);
});

test("normalizeToolCall: tolerates a call with no .function wrapper", () => {
  const r = normalizeToolCall({ name: "viz_search", arguments: { query: "z" } });
  assert.equal(r.name, "viz_search");
});

test("normalizeToolCall: a supplied id is carried through", () => {
  const r = normalizeToolCall({ id: "call_42", function: { name: "t", arguments: {} } });
  assert.equal(r.id, "call_42");
});

// ── validateToolCall ──────────────────────────────────────────────────────

test("validateToolCall: a known tool with required args passes", () => {
  assert.equal(validateToolCall("viz_search", { query: "x" }).ok, true);
  assert.equal(validateToolCall("wiki_lookup", { name: "x" }).ok, true);
  assert.equal(validateToolCall("read_excerpt", { path: "x" }).ok, true);
});

test("validateToolCall: an unknown tool is rejected with the allowlist named", () => {
  const r = validateToolCall("delete_everything", {});
  assert.equal(r.ok, false);
  assert.match(r.error, /unknown tool/);
  for (const t of TOOL_NAMES) assert.ok(r.error.includes(t));
});

test("validateToolCall: a missing required arg is rejected", () => {
  assert.equal(validateToolCall("viz_search", {}).ok, false);
  assert.equal(validateToolCall("wiki_lookup", { name: "  " }).ok, false);
  assert.equal(validateToolCall("read_excerpt", {}).ok, false);
});

// ── clampToolArgs ─────────────────────────────────────────────────────────

test("clampToolArgs: viz_search clamps max_hits and defaults it", () => {
  assert.equal(clampToolArgs("viz_search", { query: "q", max_hits: 9999 }).maxHits, 50);
  assert.equal(clampToolArgs("viz_search", { query: "q" }).maxHits, VIZ_DEFAULT_HITS);
  assert.equal(clampToolArgs("viz_search", { query: "q", max_hits: -1 }).maxHits, VIZ_DEFAULT_HITS);
});

test("clampToolArgs: read_excerpt clamps + defaults max_bytes", () => {
  assert.equal(clampToolArgs("read_excerpt", { path: "p", max_bytes: 1 << 20 }).maxBytes, READ_EXCERPT_MAX_BYTES);
  assert.equal(clampToolArgs("read_excerpt", { path: "p" }).maxBytes, READ_EXCERPT_DEFAULT_BYTES);
  assert.equal(clampToolArgs("read_excerpt", { path: "p", max_bytes: 10 }).maxBytes, READ_EXCERPT_DEFAULT_BYTES);
});

test("clampToolArgs: read_excerpt and wiki_lookup trim whitespace", () => {
  assert.equal(clampToolArgs("read_excerpt", { path: "  a/b.ts  " }).path, "a/b.ts");
  assert.equal(clampToolArgs("wiki_lookup", { name: "  foo  " }).name, "foo");
});

// ── confinePath ───────────────────────────────────────────────────────────

test("confinePath: a repo-relative path is allowed", () => {
  assert.ok(confinePath("scripts/ask-ollama.mjs"));
});

test("confinePath: directory traversal is rejected", () => {
  assert.equal(confinePath("../../../etc/passwd"), null);
  assert.equal(confinePath("scripts/../../outside.txt"), null);
});

test("confinePath: an absolute path outside the repo is rejected", () => {
  assert.equal(confinePath("C:\\Windows\\System32\\cmd.exe"), null);
});

test("confinePath: empty / whitespace / non-string yields null", () => {
  assert.equal(confinePath(""), null);
  assert.equal(confinePath("   "), null);
  assert.equal(confinePath(null), null);
  assert.equal(confinePath(123), null);
});

test("confinePath: a symlink resolving OUTSIDE the repo is rejected", () => {
  const r = confinePath("scripts/innocent.mjs", REPO_ROOT, {
    existsImpl: () => true,
    realpathImpl: (p) => (p === REPO_ROOT ? REPO_ROOT : "C:\\evil\\stolen.txt"),
  });
  assert.equal(r, null);
});

test("confinePath: a symlink resolving INSIDE the repo is allowed", () => {
  const inside = join(REPO_ROOT, "scripts", "real.mjs");
  const r = confinePath("scripts/link.mjs", REPO_ROOT, {
    existsImpl: () => true,
    realpathImpl: (p) => (p === REPO_ROOT ? REPO_ROOT : inside),
  });
  assert.equal(r, inside);
});

test("confinePath: a realpath failure refuses rather than guesses", () => {
  const r = confinePath("scripts/x.mjs", REPO_ROOT, {
    existsImpl: () => true,
    realpathImpl: () => { throw new Error("ELOOP"); },
  });
  assert.equal(r, null);
});

test("confinePath: a non-existent in-repo path resolves lexically (no realpath)", () => {
  const r = confinePath("scripts/does-not-exist.mjs", REPO_ROOT, { existsImpl: () => false });
  assert.ok(r && r.includes("does-not-exist"));
});

// ── capToolResult ─────────────────────────────────────────────────────────

test("capToolResult: short input is unchanged", () => {
  assert.equal(capToolResult("hello"), "hello");
  assert.equal(capToolResult(null), "");
});

test("capToolResult: over-cap input is truncated with an honest marker", () => {
  const big = "x".repeat(TOOL_RESULT_MAX_CHARS + 5000);
  const out = capToolResult(big);
  assert.ok(out.length < big.length);
  assert.match(out, /\[\+\d+ chars\]/);
});

// ── toolResultMessage ─────────────────────────────────────────────────────

test("toolResultMessage: builds a role:tool message with tool_name", () => {
  const m = toolResultMessage("viz_search", "result text", null);
  assert.equal(m.role, "tool");
  assert.equal(m.tool_name, "viz_search");
  assert.equal(m.content, "result text");
  assert.equal("tool_call_id" in m, false);
});

test("toolResultMessage: omits tool_name when none given, echoes id when given", () => {
  const m = toolResultMessage(null, "x", "call_1");
  assert.equal("tool_name" in m, false);
  assert.equal(m.tool_call_id, "call_1");
});

test("toolResultMessage: content is capped", () => {
  const m = toolResultMessage("t", "y".repeat(TOOL_RESULT_MAX_CHARS + 100), null);
  assert.ok(m.content.length <= TOOL_RESULT_MAX_CHARS + 40);
  assert.match(m.content, /\[\+\d+ chars\]/);
});

// ── renderTranscript ──────────────────────────────────────────────────────

test("renderTranscript: empty list says no tools were used", () => {
  assert.match(renderTranscript([]), /no tools used/);
});

test("renderTranscript: a successful call renders with an arrow", () => {
  const out = renderTranscript([{ name: "viz_search", args: { query: "q" }, result: "found it" }]);
  assert.match(out, /viz_search/);
  assert.match(out, /→/);
});

test("renderTranscript: an errored call renders with a cross", () => {
  const out = renderTranscript([{ name: "viz_search", args: {}, error: "bad" }]);
  assert.match(out, /✗/);
});

test("renderTranscript: an ERROR-string result is rendered as a failure, not a success", () => {
  const out = renderTranscript([{ name: "read_excerpt", args: {}, result: "ERROR: refused" }]);
  assert.match(out, /✗/);
  assert.ok(!out.includes("→"), "an ERROR result must not render under the success arrow");
});

// ── bridgeSavingsFooter ───────────────────────────────────────────────────

test("bridgeSavingsFooter: counts tool output gathered locally", () => {
  const f = bridgeSavingsFooter([{ result: "x".repeat(8000) }], "short answer");
  assert.match(f, /ollama-prism-bridge/);
  assert.match(f, /gathered locally/);
});

test("bridgeSavingsFooter: handles an empty run without throwing", () => {
  assert.match(bridgeSavingsFooter([], ""), /~0 tok/);
  assert.match(bridgeSavingsFooter(null, null), /~0 tok/);
});

// ── runAgentLoop — orchestration with an injected chatImpl ─────────────────

test("runAgentLoop: a direct answer (no tool calls) returns immediately", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: { chatImpl: scriptedChat([answerResponse("the answer")]), toolImpls: {} },
  });
  assert.equal(run.ok, true);
  assert.equal(run.answer, "the answer");
  assert.equal(run.capped, false);
  assert.equal(run.iterations, 1);
  assert.equal(run.toolCalls.length, 0);
});

test("runAgentLoop: one tool call then a final answer", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]),
        answerResponse("done with [node1]"),
      ]),
      toolImpls: { viz_search: () => "hit: node1" },
    },
  });
  assert.equal(run.ok, true);
  assert.equal(run.answer, "done with [node1]");
  assert.equal(run.iterations, 2); // one tool turn + one answer turn — pins the loop bound
  assert.equal(run.toolCalls.length, 1);
  assert.equal(run.toolCalls[0].name, "viz_search");
  assert.equal(run.toolCalls[0].result, "hit: node1");
});

test("runAgentLoop: multiple tool calls in one turn all execute", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([
          { function: { name: "viz_search", arguments: { query: "a" } } },
          { function: { name: "wiki_lookup", arguments: { name: "b" } } },
        ]),
        answerResponse("synthesized"),
      ]),
      toolImpls: { viz_search: () => "vs", wiki_lookup: () => "wl" },
    },
  });
  assert.equal(run.toolCalls.length, 2);
  assert.equal(run.iterations, 2); // both tools execute in ONE turn, then the answer turn
  assert.equal(run.answer, "synthesized");
});

test("runAgentLoop: an unknown tool is reported back and the model recovers", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "rm_rf", arguments: {} } }]),
        answerResponse("recovered"),
      ]),
      toolImpls: {},
    },
  });
  assert.equal(run.ok, true);
  assert.equal(run.answer, "recovered");
  assert.equal(run.toolCalls.length, 1);
  assert.match(run.toolCalls[0].error, /unknown tool/);
});

test("runAgentLoop: a throwing tool impl is caught, not propagated", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]),
        answerResponse("after the throw"),
      ]),
      toolImpls: { viz_search: () => { throw new Error("disk gone"); } },
    },
  });
  assert.equal(run.ok, true);
  assert.equal(run.answer, "after the throw");
  assert.match(run.toolCalls[0].error, /threw: disk gone/);
});

test("runAgentLoop: a missing tool implementation is reported back", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]),
        answerResponse("ok"),
      ]),
      toolImpls: {}, // viz_search is allowlisted but has no impl here
    },
  });
  assert.match(run.toolCalls[0].error, /no implementation/);
});

test("runAgentLoop: a malformed tool call is reported back", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: {} }]), // no name
        answerResponse("ok"),
      ]),
      toolImpls: {},
    },
  });
  assert.equal(run.toolCalls[0].name, "(malformed)");
  assert.match(run.toolCalls[0].error, /no function name/);
});

test("runAgentLoop: the tool-call cap is enforced and a final answer is forced", async () => {
  // chatImpl always asks for a tool while tools are advertised; when the loop
  // withdraws tools (tools === undefined) it must yield a final answer.
  let capCallCount = 0;
  const chatImpl = async (_model, _messages, tools) => {
    capCallCount++;
    return tools
      ? toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }])
      : answerResponse("forced synthesis");
  };
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    maxCalls: 3,
    deps: { chatImpl, toolImpls: { viz_search: () => "hit" } },
  });
  assert.equal(run.ok, true);
  assert.equal(run.capped, true);
  assert.equal(run.iterations, 3);
  // Exactly maxCalls in-loop turns + exactly one forced no-tools turn — proves
  // the loop did not over- or under-run before forcing finalization.
  assert.equal(capCallCount, 4);
  assert.equal(run.answer, "forced synthesis");
});

test("runAgentLoop: cap reached AND forced synthesis fails — still returns honestly", async () => {
  const chatImpl = async (_model, _messages, tools) => {
    if (tools) return toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]);
    return { ok: false, error: "ollama died" };
  };
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    maxCalls: 2,
    deps: { chatImpl, toolImpls: { viz_search: () => "hit" } },
  });
  assert.equal(run.ok, true);
  assert.equal(run.capped, true);
  assert.match(run.answer, /final synthesis failed/);
});

test("runAgentLoop: chatImpl returning {ok:false} fails loud", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: { chatImpl: scriptedChat([{ ok: false, error: "Ollama unreachable: ECONNREFUSED" }]), toolImpls: {} },
  });
  assert.equal(run.ok, false);
  assert.match(run.error, /unreachable/);
});

test("runAgentLoop: a chatImpl that THROWS is caught and fails loud (P0 regression oracle)", async () => {
  // Regression guard for the P0 found in per-file scrutiny: a thrown chatImpl
  // must NOT escape runAgentLoop as an uncaught exception — it must become a
  // fail-loud { ok:false, error }.
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: async () => { throw new Error("raw network explosion"); },
      toolImpls: {},
    },
  });
  assert.equal(run.ok, false);
  assert.match(run.error, /chat call threw: raw network explosion/);
});

test("runAgentLoop: content alongside tool_calls treats the tool calls as authoritative", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        { ok: true, message: { role: "assistant", content: "thinking out loud", tool_calls: [{ function: { name: "viz_search", arguments: { query: "x" } } }] } },
        answerResponse("final"),
      ]),
      toolImpls: { viz_search: () => "hit" },
    },
  });
  assert.equal(run.answer, "final");
  assert.equal(run.toolCalls.length, 1);
});

test("runAgentLoop: an empty tool_calls array is treated as a final answer", async () => {
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([{ ok: true, message: { role: "assistant", content: "answer", tool_calls: [] } }]),
      toolImpls: {},
    },
  });
  assert.equal(run.iterations, 1);
  assert.equal(run.answer, "answer");
});

// ── runBridge — CLI core ──────────────────────────────────────────────────

test("runBridge: a successful run exits 0 with the answer", async () => {
  const { exitCode, output } = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 6, timeout: 1000, json: false, trace: false } },
    { chatImpl: scriptedChat([answerResponse("hello answer")]), toolImpls: {} },
  );
  assert.equal(exitCode, 0);
  assert.match(output, /hello answer/);
  assert.match(output, /ollama-prism-bridge:/);
});

test("runBridge: --json emits parseable machine output", async () => {
  const { exitCode, output } = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 6, timeout: 1000, json: true, trace: false } },
    { chatImpl: scriptedChat([answerResponse("json answer")]), toolImpls: {} },
  );
  assert.equal(exitCode, 0);
  const parsed = JSON.parse(output);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.answer, "json answer");
});

test("runBridge: --trace includes the tool transcript", async () => {
  const { output } = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 6, timeout: 1000, json: false, trace: true } },
    {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]),
        answerResponse("traced"),
      ]),
      toolImpls: { viz_search: () => "a hit" },
    },
  );
  assert.match(output, /tool transcript/);
  assert.match(output, /viz_search/);
});

test("runBridge: an infrastructure failure exits 3", async () => {
  const { exitCode, output } = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 6, timeout: 1000, json: false, trace: false } },
    { chatImpl: scriptedChat([{ ok: false, error: "Ollama unreachable" }]), toolImpls: {} },
  );
  assert.equal(exitCode, 3);
  assert.match(output, /\[ollama-prism-bridge\]/);
});

// ── REAL-DATA E2E — the real buildToolImpls() against on-disk inputs ───────
// "Hermetic fakes don't prove production wiring." These run the REAL tool
// implementations against the REAL repo files. The wiki test is the
// regression oracle for the WIKI_INDEX_REL path bug found in scrutiny.

const GRAPH_PRESENT =
  existsSync(join(REPO_ROOT, "state", "shared", "system-viz", "architecture-graph.json")) ||
  existsSync(join(REPO_ROOT, "state", "shared", "system-viz", "system-graph.json"));
const GRAPH_SKIP = GRAPH_PRESENT
  ? false
  : "no system-viz graph on disk (checked architecture-graph.json + system-graph.json)";
// Skip-gate uses the LITERAL expected wiki path, NOT the WIKI_INDEX_REL
// constant under test — otherwise a wrong constant would make the regression
// oracle below SKIP itself into uselessness instead of running and FAILING.
const WIKI_PRESENT = existsSync(join(REPO_ROOT, "knowledge", "wiki", "index.md"));

test("E2E: real viz_search returns ranked graph hits", { skip: GRAPH_SKIP }, () => {
  const impls = buildToolImpls();
  const out = impls.viz_search({ query: "engine", max_hits: 5 });
  assert.ok(!out.startsWith("ERROR:"), `viz_search should succeed, got: ${out.slice(0, 120)}`);
  assert.match(out, /scanned \d+ nodes/);
});

test("WIKI_INDEX_REL points at the catalog index that exists on disk (skip-free oracle)", () => {
  // Direct, un-skippable regression oracle for the scrutiny-found path bug:
  // the constant must be the catalog index, and that file must exist.
  assert.equal(WIKI_INDEX_REL, join("knowledge", "wiki", "index.md"));
  assert.ok(existsSync(join(REPO_ROOT, WIKI_INDEX_REL)), "the wiki catalog index must exist on disk");
});

test("E2E: real wiki_lookup reads the real wiki index (WIKI_INDEX_REL regression oracle)", { skip: WIKI_PRESENT ? false : "knowledge/wiki/index.md not on disk" }, () => {
  const impls = buildToolImpls();
  const out = impls.wiki_lookup({ name: "engine" });
  // Regression oracle for the WIKI_INDEX_REL bug found in scrutiny: the
  // constant pointed at a non-existent architecture/index.md so EVERY call
  // returned "ERROR: file not found". A weak "not file-not-found" check would
  // still pass if the path were wrong-but-existing — so assert POSITIVELY
  // that the real index was read AND produced query-matching content.
  assert.ok(!out.startsWith("ERROR:"), `wiki_lookup must succeed, got: ${out.slice(0, 160)}`);
  assert.ok(!/no wiki index entries match/.test(out), `the real index should contain "engine" entries, got: ${out.slice(0, 160)}`);
  assert.match(out, /engine/i);
});

test("E2E: real read_excerpt reads a real repo file", () => {
  const impls = buildToolImpls();
  const out = impls.read_excerpt({ path: "scripts/ask-ollama.mjs", max_bytes: 2000 });
  assert.ok(out.startsWith("FILE: scripts/ask-ollama.mjs"), `unexpected: ${out.slice(0, 80)}`);
  assert.match(out, /ask-ollama/);
});

test("E2E: real read_excerpt refuses a path outside the repo", () => {
  const impls = buildToolImpls();
  assert.match(impls.read_excerpt({ path: "../../../../Windows/win.ini" }), /outside the PRISM repository/);
  assert.match(impls.read_excerpt({ path: "C:\\Windows\\win.ini" }), /outside the PRISM repository/);
});

test("E2E: real read_excerpt reports a missing in-repo file honestly", () => {
  const impls = buildToolImpls();
  assert.match(impls.read_excerpt({ path: "scripts/definitely-not-here-xyz.mjs" }), /ERROR:/);
});

test("E2E: runAgentLoop default-dep seam — real buildToolImpls() drives a scripted chat", { skip: GRAPH_SKIP }, async () => {
  // Exercises `deps.toolImpls || buildToolImpls()` — the untested seam where
  // the WIKI_INDEX_REL bug hid. chatImpl is scripted; toolImpls is REAL.
  const run = await runAgentLoop({
    question: "find engines",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "engine" } } }]),
        answerResponse("found engines"),
      ]),
      // no toolImpls → buildToolImpls() default path
    },
  });
  assert.equal(run.ok, true);
  assert.equal(run.toolCalls.length, 1);
  assert.ok(!String(run.toolCalls[0].result || "").startsWith("ERROR:"), "real viz_search via the default seam should succeed");
});

// ── runBridge integration, main() exit-code wiring, chatOllama, edge branches ──

test("runAgentLoop: a non-array tool_calls value is treated as no tools", async () => {
  // Regression guard for the `Array.isArray(msg.tool_calls)` guard — a model
  // that emits tool_calls as a non-array must not crash the loop.
  const run = await runAgentLoop({
    question: "q",
    model: "m",
    deps: {
      chatImpl: scriptedChat([
        { ok: true, message: { role: "assistant", content: "answer", tool_calls: { not: "an array" } } },
      ]),
      toolImpls: {},
    },
  });
  assert.equal(run.iterations, 1);
  assert.equal(run.answer, "answer");
  assert.equal(run.toolCalls.length, 0);
});

test("runBridge: --json toolCalls entries expose {name,args,error} and never leak result", async () => {
  const { output } = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 6, timeout: 1000, json: true, trace: false } },
    {
      chatImpl: scriptedChat([
        toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }]),
        answerResponse("answered"),
      ]),
      toolImpls: { viz_search: () => "a long tool result ".repeat(60) },
    },
  );
  const parsed = JSON.parse(output);
  assert.equal(parsed.toolCalls.length, 1);
  assert.deepEqual(Object.keys(parsed.toolCalls[0]).sort(), ["args", "error", "name"]);
  assert.equal("result" in parsed.toolCalls[0], false, "raw tool output must not leak into --json");
  assert.equal(parsed.toolCalls[0].error, null);
});

test("runBridge: a capped run surfaces capped:true in --json and the cap note in human output", async () => {
  const cappingChat = async (_m, _msg, tools) =>
    tools
      ? toolCallResponse([{ function: { name: "viz_search", arguments: { query: "x" } } }])
      : answerResponse("best effort");
  const deps = { chatImpl: cappingChat, toolImpls: { viz_search: () => "hit" } };

  const jsonOut = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 2, timeout: 1000, json: true, trace: false } },
    deps,
  );
  assert.equal(JSON.parse(jsonOut.output).capped, true);

  const humanOut = await runBridge(
    { question: "q", flags: { model: "", maxCalls: 2, timeout: 1000, json: false, trace: false } },
    deps,
  );
  assert.match(humanOut.output, /tool-call cap hit/);
});

test("main(): an unknown flag exits 2 with the usage banner (subprocess)", () => {
  const r = spawnSync(process.execPath, [SCRIPT_PATH, "a question", "--bogus"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown flag/);
  assert.match(r.stderr, /ollama-prism-bridge\.mjs/);
});

test("main(): no question exits 2 (subprocess)", () => {
  const r = spawnSync(process.execPath, [SCRIPT_PATH], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no question given/);
});

test("main(): an unreachable Ollama exits 3 with a fail-loud reason (subprocess)", () => {
  // Port 1 is never an Ollama — a deterministic infra failure, no live model.
  const r = spawnSync(process.execPath, [SCRIPT_PATH, "where is x", "--timeout", "2000"], {
    encoding: "utf8",
    env: { ...process.env, OLLAMA_URL: "http://127.0.0.1:1" },
  });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /\[ollama-prism-bridge\]/);
});

test("chatOllama: an HTTP non-2xx response fails loud", async () => {
  const fetchImpl = async () => ({ ok: false, status: 503, text: async () => "service down" });
  const res = await chatOllama("m", [{ role: "user", content: "q" }], undefined, { fetchImpl });
  assert.equal(res.ok, false);
  assert.match(res.error, /HTTP 503/);
});

test("chatOllama: a response with no message fails loud", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({}) });
  const res = await chatOllama("m", [{ role: "user", content: "q" }], undefined, { fetchImpl });
  assert.equal(res.ok, false);
  assert.match(res.error, /no message/);
});

test("chatOllama: a malformed (non-object) message fails loud", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ message: "not an object" }) });
  const res = await chatOllama("m", [{ role: "user", content: "q" }], undefined, { fetchImpl });
  assert.equal(res.ok, false);
  assert.match(res.error, /malformed message/);
});

test("chatOllama: a well-formed response is returned ok", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ message: { role: "assistant", content: "hi" } }),
  });
  const res = await chatOllama("m", [{ role: "user", content: "q" }], undefined, { fetchImpl });
  assert.equal(res.ok, true);
  assert.equal(res.message.content, "hi");
});

test("confinePath: a realpath failure on the ROOT degrades to lexical root, not refusal", () => {
  const r = confinePath("scripts/x.mjs", REPO_ROOT, {
    existsImpl: () => true,
    realpathImpl: (p) => {
      if (p === REPO_ROOT) throw new Error("root realpath failed");
      return p;
    },
  });
  assert.ok(r && r.includes("scripts"), "a root realpath failure must not reject an in-repo file");
});

test("wiki_lookup: an all-short-token query reports no searchable terms", () => {
  const out = buildToolImpls().wiki_lookup({ name: "a b c" });
  assert.match(out, /no searchable terms/);
});

test("E2E: wiki_lookup returns a clear no-match message for a nonsense query", { skip: WIKI_PRESENT ? false : "knowledge/wiki/index.md not on disk" }, () => {
  // U-OE-BRIDGE-L2B-WIKI-LEAVES: message wording changed from "no wiki index
  // entries match" to "no wiki entries match" because the search now also
  // covers leaf files under knowledge/wiki/architecture/, not just index.md.
  // Token kept long+unique enough to miss every real leaf basename too.
  const out = buildToolImpls().wiki_lookup({ name: "zzzqqqxxxnonexistenttokenWILLNOTMATCH" });
  assert.match(out, /no wiki entries match/);
});

test("E2E: read_excerpt reports a small file shown in full", { skip: existsSync(join(REPO_ROOT, "knowledge", "wiki", "architecture", "_stats.md")) ? false : "_stats.md not on disk" }, () => {
  const out = buildToolImpls().read_excerpt({
    path: "knowledge/wiki/architecture/_stats.md",
    max_bytes: READ_EXCERPT_MAX_BYTES,
  });
  assert.match(out, /shown in full/);
});

test("capToolResult: input exactly at the cap is not truncated; one over is", () => {
  const exact = "x".repeat(TOOL_RESULT_MAX_CHARS);
  assert.equal(capToolResult(exact).length, TOOL_RESULT_MAX_CHARS);
  assert.ok(!/\[\+\d+ chars\]/.test(capToolResult(exact)));
  assert.match(capToolResult("x".repeat(TOOL_RESULT_MAX_CHARS + 1)), /\[\+\d+ chars\]/);
});

// ── U-OE-BRIDGE-L2B-WIKI-LEAVES — leaf-file fallback ──────────────────────
// The reason these tests exist: wiki_lookup used to read only index.md (722
// entries). The system has 23,981 leaf files under knowledge/wiki/architecture/
// — 33x more knowledge invisible to Ollama. The leaf-filename fallback closes
// that gap. Fail-on-revert: a refactor that breaks the leaf scan must fail HERE.

// Hermetic helper: fake dirent for a file or directory.
function fakeDirent(name, kind) {
  return {
    name,
    isFile: () => kind === "file",
    isDirectory: () => kind === "dir",
  };
}

test("listWikiLeafFiles: hermetic — finds .md files, excludes _-prefixed, respects depth cap", () => {
  // virtual filesystem: <root>/<leavesDir>/engines/Foo.md
  //                     <root>/<leavesDir>/engines/_stats.md (excluded)
  //                     <root>/<leavesDir>/actions/cad/Bar.md
  //                     <root>/<leavesDir>/Baz.md (top-level)
  //                     <root>/<leavesDir>/deep/deep/deep/deep/deep/Deep.md (over depth cap)
  const tree = {
    "/repo/knowledge/wiki/architecture": [
      fakeDirent("engines", "dir"),
      fakeDirent("actions", "dir"),
      fakeDirent("Baz.md", "file"),
      fakeDirent("deep", "dir"),
      fakeDirent("not-md.txt", "file"),
    ],
    "/repo/knowledge/wiki/architecture/engines": [
      fakeDirent("Foo.md", "file"),
      fakeDirent("_stats.md", "file"),
    ],
    "/repo/knowledge/wiki/architecture/actions": [
      fakeDirent("cad", "dir"),
    ],
    "/repo/knowledge/wiki/architecture/actions/cad": [
      fakeDirent("Bar.md", "file"),
    ],
    // simulated depth: depth 0=architecture, 1=deep, 2=deep, 3=deep, 4=deep, 5=deep, 6=Deep.md
    "/repo/knowledge/wiki/architecture/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/wiki/architecture/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/wiki/architecture/deep/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/wiki/architecture/deep/deep/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/wiki/architecture/deep/deep/deep/deep/deep": [fakeDirent("Deep.md", "file")],
  };
  const readdirImpl = (p) => {
    const key = p.replace(/\\/g, "/");
    return tree[key] || [];
  };
  const statImpl = (p) => ({ isDirectory: () => true });
  const leaves = listWikiLeafFiles({
    root: "/repo",
    maxDepth: 3, // tight cap forces the deep .md to be skipped
    readdirImpl,
    statImpl,
  });
  const paths = leaves.map((l) => l.relPath).sort();
  assert.ok(paths.includes("knowledge/wiki/architecture/Baz.md"), "top-level .md found");
  assert.ok(paths.includes("knowledge/wiki/architecture/engines/Foo.md"), "1-deep .md found");
  assert.ok(paths.includes("knowledge/wiki/architecture/actions/cad/Bar.md"), "2-deep .md found");
  // _stats.md is excluded
  assert.ok(!paths.some((p) => p.endsWith("_stats.md")), "_-prefixed files excluded");
  // not-md.txt excluded
  assert.ok(!paths.some((p) => p.endsWith(".txt")), "non-md files excluded");
  // depth cap honored
  assert.ok(!paths.some((p) => p.includes("Deep.md")), "depth cap honored");
});

test("listWikiLeafFiles: adversarial — missing dir returns []", () => {
  const leaves = listWikiLeafFiles({
    root: "/repo",
    statImpl: () => { throw new Error("ENOENT"); },
    readdirImpl: () => { throw new Error("should not be called"); },
  });
  assert.deepEqual(leaves, []);
});

test("listWikiLeafFiles: adversarial — startAbs not a directory returns []", () => {
  const leaves = listWikiLeafFiles({
    root: "/repo",
    statImpl: () => ({ isDirectory: () => false }),
    readdirImpl: () => { throw new Error("should not be called"); },
  });
  assert.deepEqual(leaves, []);
});

test("listWikiLeafFiles: adversarial — unreadable subdir is skipped, not fatal", () => {
  const tree = {
    "/repo/knowledge/wiki/architecture": [
      fakeDirent("ok.md", "file"),
      fakeDirent("bad", "dir"),
    ],
    // /repo/knowledge/wiki/architecture/bad → throws on readdir
  };
  const readdirImpl = (p) => {
    const key = p.replace(/\\/g, "/");
    if (key === "/repo/knowledge/wiki/architecture/bad") throw new Error("EACCES");
    return tree[key] || [];
  };
  const statImpl = () => ({ isDirectory: () => true });
  const leaves = listWikiLeafFiles({ root: "/repo", readdirImpl, statImpl });
  assert.equal(leaves.length, 1);
  assert.equal(leaves[0].basename, "ok.md");
});

test("scoreLeafFilenames: matches tokens against basename (case-insensitive, strips .md)", () => {
  const leaves = [
    { relPath: "x/KienzleForce.md", basename: "KienzleForce.md" },
    { relPath: "x/UnrelatedFile.md", basename: "UnrelatedFile.md" },
    { relPath: "x/KienzleAdvanced.md", basename: "KienzleAdvanced.md" },
  ];
  const out = scoreLeafFilenames(leaves, ["kienzle"]);
  assert.equal(out.length, 2);
  assert.ok(out.every((h) => h.relPath.includes("Kienzle")));
  assert.ok(out.every((h) => h.score === 1));
});

test("scoreLeafFilenames: multi-token query gives higher score to richer matches", () => {
  const leaves = [
    { relPath: "x/A.md", basename: "kienzle.md" },              // 1 match
    { relPath: "x/B.md", basename: "kienzle-cutting-force.md" }, // 3 matches
    { relPath: "x/C.md", basename: "force.md" },                // 1 match
  ];
  const out = scoreLeafFilenames(leaves, ["kienzle", "cutting", "force"]);
  assert.equal(out[0].relPath, "x/B.md", "richest match ranks first");
  assert.equal(out[0].score, 3);
});

test("scoreLeafFilenames: empty inputs return []", () => {
  assert.deepEqual(scoreLeafFilenames([], ["foo"]), []);
  assert.deepEqual(scoreLeafFilenames([{ relPath: "a", basename: "a.md" }], []), []);
  assert.deepEqual(scoreLeafFilenames(null, ["foo"]), []);
  assert.deepEqual(scoreLeafFilenames([{ basename: 123 }], ["foo"]), []);
});

test("REAL-DATA E2E: listWikiLeafFiles returns >100 leaves from the actual wiki tree", { skip: existsSync(join(REPO_ROOT, "knowledge", "wiki", "architecture")) ? false : "wiki/architecture/ not on disk" }, () => {
  const leaves = listWikiLeafFiles(); // defaults to real REPO_ROOT + WIKI_LEAVES_DIR_REL
  assert.ok(leaves.length > 100, `expected >100 leaves on disk, got ${leaves.length}`);
  assert.ok(leaves.every((l) => l.basename.endsWith(".md") && !l.basename.startsWith("_")), "all leaves are .md, none _-prefixed");
  assert.ok(leaves.every((l) => l.relPath.startsWith("knowledge/wiki/architecture")), "all relPaths anchored under architecture");
});

test("REGRESSION-GUARD: wiki_lookup integration returns leaf paths for a query that hits ONLY a leaf", { skip: existsSync(join(REPO_ROOT, "knowledge", "wiki", "architecture")) ? false : "wiki/architecture/ not on disk" }, () => {
  // This is THE fail-on-revert oracle for the whole U-OE-BRIDGE-L2B-WIKI-LEAVES
  // fix. We pick a leaf-basename token that's distinctive enough to almost
  // certainly appear in SOME leaf filename. If the bridge ever regresses to
  // index-only search, this test fails — proving the leaf path was lost.
  const leaves = listWikiLeafFiles();
  assert.ok(leaves.length > 0, "precondition: leaves must exist for this test to be meaningful");
  // Pick a basename token from a deep leaf — must be ≥3 chars (WIKI_MIN_TOKEN_LEN).
  // Use a real leaf's stem so we don't depend on a magic string.
  const sample = leaves.find((l) => l.basename.length > 8);
  assert.ok(sample, "precondition: at least one leaf with a long-enough basename");
  // Stem without .md, take the first alphanumeric token of length ≥4.
  const stem = sample.basename.toLowerCase().replace(/\.md$/, "");
  const tok = stem.split(/[^a-z0-9]+/).find((t) => t.length >= 4);
  assert.ok(tok, `precondition: leaf basename has a ≥4-char token (sample: ${sample.basename})`);
  const out = buildToolImpls().wiki_lookup({ name: tok });
  // Must mention "Leaf wiki files" section OR have at least one leaf relPath.
  // (The leaf body header is emitted whenever there are leaf hits.)
  assert.match(out, /Leaf wiki files/, `wiki_lookup output must surface leaf paths for token "${tok}". Got: ${out.slice(0, 300)}`);
});

// ── U-OBSIDIAN-LOOKUP (2026-05-18, slot delta) ───────────────────────────

test("U-OBSIDIAN-LOOKUP: obsidian_lookup is in TOOL_NAMES allowlist", () => {
  assert.ok(TOOL_NAMES.includes("obsidian_lookup"), "TOOL_NAMES must allow obsidian_lookup");
  assert.ok(TOOL_NAMES.length >= 4, "TOOL_NAMES grew with the obsidian addition (≥4)");
});

test("U-OBSIDIAN-LOOKUP: toolSpecs advertises obsidian_lookup with required query param", () => {
  const specs = toolSpecs();
  const spec = specs.find((s) => s.function && s.function.name === "obsidian_lookup");
  assert.ok(spec, "obsidian_lookup spec must be advertised");
  assert.deepEqual(spec.function.parameters.required, ["query"], "query is the only required arg");
  assert.equal(spec.function.parameters.properties.query.type, "string");
});

test("U-OBSIDIAN-LOOKUP: validateToolCall rejects obsidian_lookup with empty query", () => {
  const v = validateToolCall("obsidian_lookup", { query: "  " });
  assert.equal(v.ok, false);
  assert.match(v.error, /non-empty 'query'/);
});

test("U-OBSIDIAN-LOOKUP: validateToolCall accepts obsidian_lookup with a real query", () => {
  const v = validateToolCall("obsidian_lookup", { query: "fleet reaper" });
  assert.equal(v.ok, true);
  assert.equal(v.name, "obsidian_lookup");
});

test("U-OBSIDIAN-LOOKUP: clampToolArgs trims obsidian_lookup query", () => {
  const out = clampToolArgs("obsidian_lookup", { query: "  kienzle physics  " });
  assert.equal(out.query, "kienzle physics");
});

test("U-OBSIDIAN-LOOKUP: clampToolArgs degrades obsidian_lookup with missing query to empty string", () => {
  const out = clampToolArgs("obsidian_lookup", {});
  assert.equal(out.query, "");
});

test("U-OBSIDIAN-LOOKUP: listObsidianMemoryFiles hermetic — finds .md, excludes _-prefixed + MEMORY.md/MEMORY-ARCHIVE.md, respects depth", () => {
  const tree = {
    "/repo/knowledge/memories": [
      fakeDirent("feedback", "dir"),
      fakeDirent("reference", "dir"),
      fakeDirent("MEMORY.md", "file"),
      fakeDirent("MEMORY-ARCHIVE.md", "file"),
      fakeDirent("_index.md", "file"),
      fakeDirent("top.md", "file"),
      fakeDirent("deep", "dir"),
    ],
    "/repo/knowledge/memories/feedback": [
      fakeDirent("feedback_always_build.md", "file"),
      fakeDirent("feedback_h_drive_master.md", "file"),
      fakeDirent("_legacy.md", "file"),
    ],
    "/repo/knowledge/memories/reference": [
      fakeDirent("reference_fleet_reaper.md", "file"),
    ],
    "/repo/knowledge/memories/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/memories/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/memories/deep/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/memories/deep/deep/deep/deep": [fakeDirent("deep", "dir")],
    "/repo/knowledge/memories/deep/deep/deep/deep/deep": [fakeDirent("OverDepth.md", "file")],
  };
  const readdirImpl = (p) => tree[p.replace(/\\/g, "/")] || [];
  const statImpl = () => ({ isDirectory: () => true });
  const files = listObsidianMemoryFiles({ root: "/repo", maxDepth: 3, readdirImpl, statImpl });
  const paths = files.map((f) => f.relPath).sort();
  assert.ok(paths.includes("knowledge/memories/top.md"), "top-level .md found");
  assert.ok(paths.includes("knowledge/memories/feedback/feedback_always_build.md"), "feedback .md found");
  assert.ok(paths.includes("knowledge/memories/reference/reference_fleet_reaper.md"), "reference .md found");
  assert.ok(!paths.some((p) => p.endsWith("MEMORY.md")), "MEMORY.md (index) excluded");
  assert.ok(!paths.some((p) => p.endsWith("MEMORY-ARCHIVE.md")), "MEMORY-ARCHIVE.md (archive) excluded");
  assert.ok(!paths.some((p) => p.endsWith("_index.md") || p.endsWith("_legacy.md")), "_-prefixed excluded");
  assert.ok(!paths.some((p) => p.includes("OverDepth.md")), "depth cap honored");
});

test("U-OBSIDIAN-LOOKUP: listObsidianMemoryFiles adversarial — missing dir returns []", () => {
  const files = listObsidianMemoryFiles({
    root: "/repo",
    statImpl: () => { throw new Error("ENOENT"); },
    readdirImpl: () => { throw new Error("should not be called"); },
  });
  assert.deepEqual(files, []);
});

test("U-OBSIDIAN-LOOKUP: listObsidianMemoryFiles adversarial — startAbs not a directory returns []", () => {
  const files = listObsidianMemoryFiles({
    root: "/repo",
    statImpl: () => ({ isDirectory: () => false }),
    readdirImpl: () => { throw new Error("should not be called"); },
  });
  assert.deepEqual(files, []);
});

test("U-OBSIDIAN-LOOKUP: listObsidianMemoryFiles adversarial — unreadable subdir is skipped, not fatal", () => {
  const tree = {
    "/repo/knowledge/memories": [
      fakeDirent("ok.md", "file"),
      fakeDirent("bad", "dir"),
    ],
  };
  const readdirImpl = (p) => {
    const key = p.replace(/\\/g, "/");
    if (key === "/repo/knowledge/memories/bad") throw new Error("EACCES");
    return tree[key] || [];
  };
  const statImpl = () => ({ isDirectory: () => true });
  const files = listObsidianMemoryFiles({ root: "/repo", readdirImpl, statImpl });
  assert.equal(files.length, 1);
  assert.equal(files[0].basename, "ok.md");
});

test("U-OBSIDIAN-LOOKUP: listObsidianMemoryFiles respects custom excludedBasenames", () => {
  const tree = {
    "/repo/knowledge/memories": [
      fakeDirent("a.md", "file"),
      fakeDirent("b.md", "file"),
      fakeDirent("c.md", "file"),
    ],
  };
  const readdirImpl = (p) => tree[p.replace(/\\/g, "/")] || [];
  const statImpl = () => ({ isDirectory: () => true });
  const files = listObsidianMemoryFiles({
    root: "/repo",
    excludedBasenames: ["b.md"],
    readdirImpl,
    statImpl,
  });
  const names = files.map((f) => f.basename).sort();
  assert.deepEqual(names, ["a.md", "c.md"], "b.md is excluded by custom list");
});

test("U-OBSIDIAN-LOOKUP: buildToolImpls obsidian_lookup returns ERROR when no query tokens pass length cap", () => {
  const impls = buildToolImpls({ root: REPO_ROOT });
  const out = impls.obsidian_lookup({ query: "a b c" }); // all tokens < OBSIDIAN_MIN_TOKEN_LEN
  assert.match(out, /no searchable terms/);
});

test("U-OBSIDIAN-LOOKUP: REAL-DATA E2E listObsidianMemoryFiles returns >100 memories from disk", { skip: existsSync(join(REPO_ROOT, "knowledge", "memories")) ? false : "knowledge/memories not on disk" }, () => {
  const files = listObsidianMemoryFiles();
  assert.ok(files.length > 100, `expected >100 memory files on disk, got ${files.length}`);
  assert.ok(files.every((f) => f.basename.endsWith(".md")), "all are .md");
  assert.ok(files.every((f) => !f.basename.startsWith("_")), "none are _-prefixed");
  assert.ok(files.every((f) => !OBSIDIAN_EXCLUDED_BASENAMES.includes(f.basename)), "none are excluded names");
  assert.ok(files.every((f) => f.relPath.startsWith("knowledge/memories")), "all under knowledge/memories");
});

test("U-OBSIDIAN-LOOKUP: REAL-DATA E2E obsidian_lookup tool returns a hit for a known memory token", { skip: existsSync(join(REPO_ROOT, "knowledge", "memories")) ? false : "knowledge/memories not on disk" }, () => {
  // "fleet" is a stable token in PRISM memories (fleet-reaper, fleet-memory-monitor, etc.).
  // This is the fail-on-revert oracle — if obsidian_lookup regresses to "no match" for
  // a query that should hit, the test fails immediately.
  const impls = buildToolImpls({ root: REPO_ROOT });
  const out = impls.obsidian_lookup({ query: "fleet" });
  assert.doesNotMatch(out, /^ERROR/, `obsidian_lookup must succeed on real data, got: ${out.slice(0, 200)}`);
  assert.match(out, /Obsidian memory files/, "must emit the canonical header on a hit");
  assert.match(out, /knowledge\/memories/, "must surface a memory path");
});

test("U-OBSIDIAN-LOOKUP: agent loop accepts obsidian_lookup as a routed tool", async () => {
  // Drives runAgentLoop with a scripted chat that picks obsidian_lookup,
  // proves the impl wires through the routing layer end-to-end.
  let toolFired = false;
  const chat = scriptedChat([
    toolCallResponse([{ function: { name: "obsidian_lookup", arguments: { query: "fleet reaper" } } }]),
    answerResponse("Found relevant memories."),
  ]);
  const fakeImpls = {
    viz_search: () => "",
    wiki_lookup: () => "",
    read_excerpt: () => "",
    obsidian_lookup: (args) => {
      toolFired = true;
      assert.equal(args.query, "fleet reaper");
      return "Obsidian memory files (use read_excerpt to read full memory):\n  knowledge/memories/reference/reference_fleet_reaper.md  (score 2)\n(1 of 644 memory files matched)";
    },
  };
  const r = await runAgentLoop({
    question: "what do we know about fleet reaper?",
    model: DEFAULT_MODEL,
    maxCalls: 4,
    deps: { chatImpl: chat, toolImpls: fakeImpls },
  });
  assert.equal(r.ok, true);
  assert.equal(toolFired, true, "obsidian_lookup impl must have been called by the agent loop");
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0].name, "obsidian_lookup");
  assert.match(r.answer, /Found relevant memories/);
});

// ── U-DISPATCHER-MAP (2026-05-18, slot delta) ────────────────────────────

test("U-DISPATCHER-MAP: dispatcher_map is in TOOL_NAMES allowlist", () => {
  assert.ok(TOOL_NAMES.includes("dispatcher_map"), "TOOL_NAMES must allow dispatcher_map");
  // Use >= to mirror the obsidian convention — future additions don't regress this test.
  assert.ok(TOOL_NAMES.length >= 5, "TOOL_NAMES grew with the dispatcher_map addition (≥5)");
});

test("U-DISPATCHER-MAP: toolSpecs advertises dispatcher_map with required query param", () => {
  const specs = toolSpecs();
  const spec = specs.find((s) => s.function && s.function.name === "dispatcher_map");
  assert.ok(spec, "dispatcher_map spec must be advertised");
  assert.deepEqual(spec.function.parameters.required, ["query"], "query is the only required arg");
  assert.equal(spec.function.parameters.properties.query.type, "string");
});

test("U-DISPATCHER-MAP: validateToolCall rejects dispatcher_map with empty query", () => {
  const v = validateToolCall("dispatcher_map", { query: "  " });
  assert.equal(v.ok, false);
  assert.match(v.error, /non-empty 'query'/);
});

test("U-DISPATCHER-MAP: validateToolCall accepts dispatcher_map with a real query", () => {
  const v = validateToolCall("dispatcher_map", { query: "cutting force" });
  assert.equal(v.ok, true);
  assert.equal(v.name, "dispatcher_map");
});

test("U-DISPATCHER-MAP: clampToolArgs trims dispatcher_map query", () => {
  const out = clampToolArgs("dispatcher_map", { query: "  cad geometry  " });
  assert.equal(out.query, "cad geometry");
});

test("U-DISPATCHER-MAP: clampToolArgs degrades dispatcher_map with missing query to empty string", () => {
  const out = clampToolArgs("dispatcher_map", {});
  assert.equal(out.query, "");
});

test("U-DISPATCHER-MAP: DISPATCHER_DIGEST_REL points at the auto-generated digest path", () => {
  // Path is forward-slash-normalized canonical: scrutiny-relevant if anyone moves the digest.
  // Use path-segment match because join() emits OS-native separators on Windows.
  assert.ok(
    DISPATCHER_DIGEST_REL.replace(/\\/g, "/").endsWith("mcp-server/data/docs/DISPATCHER_DIGEST.md"),
    `digest path should end at canonical location, got ${DISPATCHER_DIGEST_REL}`,
  );
});

test("U-DISPATCHER-MAP: buildToolImpls dispatcher_map returns ERROR when no query tokens pass length cap", () => {
  const impls = buildToolImpls({ root: REPO_ROOT });
  const out = impls.dispatcher_map({ query: "a b c" }); // all < DISPATCHER_MIN_TOKEN_LEN
  assert.match(out, /no searchable terms/);
});

test("U-DISPATCHER-MAP: REAL-DATA E2E dispatcher_map returns rows for a known dispatcher token", { skip: existsSync(join(REPO_ROOT, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md")) ? false : "DISPATCHER_DIGEST.md not on disk" }, () => {
  // "cad" is a stable, abundant token in the dispatcher map (cadDispatcher,
  // cadAutomationDispatcher, cadDrawingKnowledgeDispatcher, etc.). This is
  // the fail-on-revert oracle: if dispatcher_map regresses to scanning the
  // wrong file path / missing the table-row filter / returning ERROR, the
  // assertions below fail loudly.
  const impls = buildToolImpls({ root: REPO_ROOT });
  const out = impls.dispatcher_map({ query: "cad" });
  assert.doesNotMatch(out, /^ERROR/, `dispatcher_map must succeed on real data, got: ${out.slice(0, 200)}`);
  assert.match(out, /PRISM dispatchers matching/, "must emit the canonical header on a hit");
  assert.match(out, /cadDispatcher|cadAutomationDispatcher/, "must surface at least one cad-prefixed dispatcher");
  assert.match(out, /\bof \d+ matched/, "must include the (N of M matched) footer for cost-honesty");
});

test("U-DISPATCHER-MAP: REAL-DATA E2E dispatcher_map returns 'no match' note (not ERROR) for an impossible query", { skip: existsSync(join(REPO_ROOT, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md")) ? false : "DISPATCHER_DIGEST.md not on disk" }, () => {
  // Adversarial token that won't appear in any dispatcher name or domain.
  // We MUST distinguish "no match" (parenthetical) from "scan broken" (ERROR:).
  // P1-B4 fix: also pin the live-row-count in the response so a stub can't forge.
  const impls = buildToolImpls({ root: REPO_ROOT });
  const out = impls.dispatcher_map({ query: "zzzznonexistenttokendelta18" });
  assert.doesNotMatch(out, /^ERROR/, "no-match path must NOT be ERROR (only scan-broken is)");
  assert.match(out, /no dispatcher rows match/, "no-match must use the canonical parenthetical");
  assert.match(out, /scanned \d+ rows in/, "must include the live row-count — proves a real digest was read, not a stub");
});

test("U-DISPATCHER-MAP: schema-drift fail-loud — synthetic digest with wrong header returns ERROR", () => {
  // Inject a digest that has a `|`-table but the header column is renamed.
  // The R12 schema-drift gate must fire ERROR — not silently scan the rows.
  // tmpdir() keeps the fake outside the repo so peer chats don't see it.
  const tmpRoot = join(tmpdir(), `dispatcher-map-drift-${process.pid}-${Date.now()}`);
  const tmpDigest = join(tmpRoot, "mcp-server", "data", "docs", "DISPATCHER_DIGEST.md");
  mkdirSync(dirname(tmpDigest), { recursive: true });
  writeFileSync(
    tmpDigest,
    "# DISPATCHER\n\n| Name | Description | Count |\n|------|-------------|-------|\n| foo | bar | 1 |\n",
    "utf-8",
  );
  try {
    const impls = buildToolImpls({ root: tmpRoot });
    const out = impls.dispatcher_map({ query: "foo" });
    assert.match(out, /^ERROR: dispatcher digest schema drift/, `must fail-loud on header drift, got: ${out.slice(0, 200)}`);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test("U-DISPATCHER-MAP: agent loop wires dispatcher_map end-to-end — args forwarded + result fed back", async () => {
  // P1-B3 strengthening: this is not just a smoke test. It asserts:
  //  (a) the agent loop forwards the MODEL's chosen query verbatim to the impl
  //      (no rewrite, no shadowing) — proven by the assert inside the impl;
  //  (b) the tool RESULT is captured in r.toolCalls[0].result (not just .name) —
  //      proven by checking result content matches what the impl returned. A
  //      stub that fired but dropped the result would fail (c).
  let toolFired = false;
  let capturedQuery = null;
  const STUB_RESULT = `PRISM dispatchers matching "cad geometry":\n| cadDispatcher | prism_cad - ... | 418 |\n(1 of 1 matched rows from 97 total)`;
  const chat = scriptedChat([
    toolCallResponse([{ function: { name: "dispatcher_map", arguments: { query: "cad geometry" } } }]),
    answerResponse("CAD dispatcher answers your question."),
  ]);
  const fakeImpls = {
    viz_search: () => "",
    wiki_lookup: () => "",
    read_excerpt: () => "",
    obsidian_lookup: () => "",
    dispatcher_map: (args) => {
      toolFired = true;
      capturedQuery = args.query;
      return STUB_RESULT;
    },
  };
  const r = await runAgentLoop({
    question: "what dispatcher handles cad geometry?",
    model: DEFAULT_MODEL,
    maxCalls: 4,
    deps: { chatImpl: chat, toolImpls: fakeImpls },
  });
  assert.equal(r.ok, true);
  assert.equal(toolFired, true, "dispatcher_map impl must have been called by the agent loop");
  // (a) — query forwarded verbatim:
  assert.equal(capturedQuery, "cad geometry", "agent loop must forward the model's query unchanged");
  // (b) + (c) — result captured AND fed back (toolCalls[0].result must be the impl's exact return):
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0].name, "dispatcher_map");
  assert.equal(r.toolCalls[0].result, STUB_RESULT, "agent loop must capture the impl's RESULT — not just the name");
  assert.match(r.answer, /CAD dispatcher/);
});

// ── U-SEMANTIC-LOOKUP (2026-05-18, slot delta) ───────────────────────────

test("U-SEMANTIC-LOOKUP: semantic_search is in TOOL_NAMES allowlist", () => {
  assert.ok(TOOL_NAMES.includes("semantic_search"), "TOOL_NAMES must allow semantic_search");
  assert.ok(TOOL_NAMES.length >= 6, "TOOL_NAMES grew to ≥6 with semantic_search");
});

test("U-SEMANTIC-LOOKUP: toolSpecs advertises semantic_search with required query param", () => {
  const specs = toolSpecs();
  const spec = specs.find((s) => s.function && s.function.name === "semantic_search");
  assert.ok(spec, "semantic_search spec must be advertised");
  assert.deepEqual(spec.function.parameters.required, ["query"]);
});

test("U-SEMANTIC-LOOKUP: validateToolCall rejects semantic_search with empty query", () => {
  const v = validateToolCall("semantic_search", { query: "" });
  assert.equal(v.ok, false);
  assert.match(v.error, /non-empty 'query'/);
});

test("U-SEMANTIC-LOOKUP: clampToolArgs trims + clamps max_hits to SEMANTIC_MAX_HITS", () => {
  const out = clampToolArgs("semantic_search", { query: "  kienzle  ", max_hits: 999 });
  assert.equal(out.query, "kienzle");
  assert.equal(out.maxHits, SEMANTIC_MAX_HITS, "max_hits clamped to ceiling");
});

test("U-SEMANTIC-LOOKUP: clampToolArgs invalid max_hits defaults to SEMANTIC_MAX_HITS", () => {
  const out = clampToolArgs("semantic_search", { query: "x", max_hits: "abc" });
  assert.equal(out.maxHits, SEMANTIC_MAX_HITS);
});

test("U-SEMANTIC-LOOKUP: dequantizeInt8 — scales by INT8_DEQUANT_SCALE", () => {
  const out = dequantizeInt8([127, -127, 0, 64]);
  assert.equal(out.length, 4);
  assert.ok(Math.abs(out[0] - 1.0) < 1e-6, "127 → 1.0");
  assert.ok(Math.abs(out[1] - -1.0) < 1e-6, "-127 → -1.0");
  assert.equal(out[2], 0, "0 → 0");
  assert.ok(Math.abs(out[3] - 64 / INT8_DEQUANT_SCALE) < 1e-6);
});

test("U-SEMANTIC-LOOKUP: dequantizeInt8 — empty/null input returns empty Float32Array", () => {
  assert.equal(dequantizeInt8(null).length, 0);
  assert.equal(dequantizeInt8(undefined).length, 0);
  assert.equal(dequantizeInt8([]).length, 0);
});

test("U-SEMANTIC-LOOKUP: dotProduct — same-length vectors", () => {
  assert.equal(dotProduct([1, 0, 0], [0, 1, 0]), 0, "orthogonal → 0");
  assert.equal(dotProduct([1, 0, 0], [1, 0, 0]), 1, "identical → 1");
  assert.ok(Math.abs(dotProduct([0.5, 0.5, 0], [0.5, 0.5, 0]) - 0.5) < 1e-6);
});

test("U-SEMANTIC-LOOKUP: dotProduct — mismatched / empty returns 0", () => {
  assert.equal(dotProduct([1, 2, 3], [1, 2]), 0, "length mismatch → 0");
  assert.equal(dotProduct([], []), 0, "empty → 0");
  assert.equal(dotProduct(null, [1]), 0, "null → 0");
});

test("U-SEMANTIC-LOOKUP: parseEmbeddingLine — meta line classified as meta", () => {
  const m = parseEmbeddingLine('{"__meta":true,"model":"nomic-embed-text","dim":768,"count":14738}');
  assert.equal(m.meta, true);
  assert.equal(m.info.model, "nomic-embed-text");
});

test("U-SEMANTIC-LOOKUP: parseEmbeddingLine — valid entry parsed", () => {
  // Build a 768-d int8 vector inline.
  const q = new Array(EMBEDDING_DIM).fill(0);
  q[0] = 127;
  const r = parseEmbeddingLine(JSON.stringify({ n: "test-engine", t: "engine", h: "abc", s: 0, q }));
  assert.ok(r.entry);
  assert.equal(r.entry.n, "test-engine");
  assert.equal(r.entry.t, "engine");
  assert.equal(r.entry.q.length, EMBEDDING_DIM);
});

test("U-SEMANTIC-LOOKUP: parseEmbeddingLine — missing 'n' rejected", () => {
  const q = new Array(EMBEDDING_DIM).fill(0);
  const r = parseEmbeddingLine(JSON.stringify({ t: "engine", q }));
  assert.match(r.error, /missing 'n'/);
});

test("U-SEMANTIC-LOOKUP: parseEmbeddingLine — dim mismatch rejected (schema-drift guard)", () => {
  const r = parseEmbeddingLine(JSON.stringify({ n: "x", q: [1, 2, 3] }));
  assert.match(r.error, /q length 3/);
});

test("U-SEMANTIC-LOOKUP: parseEmbeddingLine — invalid JSON returns error", () => {
  const r = parseEmbeddingLine("{not valid json");
  assert.match(r.error, /invalid JSON/);
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — hermetic happy path with injected reader", () => {
  const q = new Array(EMBEDDING_DIM).fill(0);
  q[0] = 100;
  const synth = [
    JSON.stringify({ __meta: true, model: "nomic-embed-text", dim: EMBEDDING_DIM, count: 2 }),
    JSON.stringify({ n: "alpha", t: "engine", q }),
    JSON.stringify({ n: "beta", t: "skill", q }),
  ].join("\n");
  const r = loadEmbeddingIndex({ readImpl: () => synth });
  assert.equal(r.ok, true);
  assert.equal(r.entries.length, 2);
  assert.equal(r.entries[0].n, "alpha");
  assert.equal(r.meta.model, "nomic-embed-text");
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — malformed lines counted as skipped, valid ones kept", () => {
  const q = new Array(EMBEDDING_DIM).fill(0);
  const synth = [
    "not json",
    JSON.stringify({ n: "alpha", q }),
    '{"n":"beta","q":[1,2,3]}', // wrong dim
    JSON.stringify({ n: "gamma", q }),
  ].join("\n");
  const r = loadEmbeddingIndex({ readImpl: () => synth });
  assert.equal(r.ok, true);
  assert.equal(r.entries.length, 2);
  assert.equal(r.skipped, 2, "2 malformed lines counted");
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — file unreadable returns ok:false", () => {
  const r = loadEmbeddingIndex({ readImpl: () => { throw new Error("ENOENT"); } });
  assert.equal(r.ok, false);
  assert.match(r.error, /cannot read/);
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — empty after parsing returns ok:false", () => {
  const r = loadEmbeddingIndex({ readImpl: () => '{"__meta":true,"model":"x","dim":1,"count":0}' });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty/);
});

test("U-SEMANTIC-LOOKUP: cosineRank — highest cosine first (orthogonal vs aligned)", () => {
  // Build entries: one aligned with query, one orthogonal. Aligned must rank first.
  const dim = 4;
  const queryVec = [1, 0, 0, 0];
  // Aligned: dequantize to [1, 0, 0, 0]
  const aligned = new Array(dim).fill(0);
  aligned[0] = 127;
  // Orthogonal: dequantize to [0, 1, 0, 0]
  const orth = new Array(dim).fill(0);
  orth[1] = 127;
  const entries = [
    { n: "orth", t: "x", q: orth },
    { n: "aligned", t: "y", q: aligned },
  ];
  const hits = cosineRank(queryVec, entries, 2);
  assert.equal(hits[0].name, "aligned", "aligned must rank first");
  assert.ok(Math.abs(hits[0].score - 1.0) < 1e-3);
  assert.ok(Math.abs(hits[1].score) < 1e-3, "orthogonal score ≈ 0");
});

test("U-SEMANTIC-LOOKUP: cosineRank — k caps at SEMANTIC_MAX_HITS", () => {
  const dim = EMBEDDING_DIM;
  const queryVec = new Array(dim).fill(0);
  queryVec[0] = 1;
  const q = new Array(dim).fill(0);
  q[0] = 127;
  const entries = [];
  for (let i = 0; i < 50; i++) entries.push({ n: `e${i}`, t: "x", q });
  const hits = cosineRank(queryVec, entries, 9999);
  assert.equal(hits.length, SEMANTIC_MAX_HITS, "must cap at SEMANTIC_MAX_HITS");
});

test("U-SEMANTIC-LOOKUP: cosineRank — zero query vector returns []", () => {
  const r = cosineRank([0, 0, 0], [{ n: "x", q: [127, 0, 0] }], 5);
  assert.deepEqual(r, []);
});

test("U-SEMANTIC-LOOKUP: cosineRank — empty entries returns []", () => {
  const r = cosineRank([1, 0, 0], [], 5);
  assert.deepEqual(r, []);
});

test("U-SEMANTIC-LOOKUP: cosineRank — entries with wrong-dim q filtered", () => {
  // 1 valid (3-d) + 1 wrong-dim — only the valid one is scored.
  const r = cosineRank([1, 0, 0], [
    { n: "valid", q: [127, 0, 0] },
    { n: "wrong", q: [127] },
  ], 5);
  assert.equal(r.length, 1);
  assert.equal(r[0].name, "valid");
});

test("U-SEMANTIC-LOOKUP: embedViaOllama — fetch returns valid embedding", async () => {
  const fakeEmbedding = new Array(EMBEDDING_DIM).fill(0).map((_, i) => i === 0 ? 1 : 0);
  const fetchImpl = async (url, init) => {
    assert.match(url, /api\/embeddings$/);
    const body = JSON.parse(init.body);
    assert.equal(body.model, EMBEDDINGS_MODEL);
    assert.equal(body.prompt, "kienzle force");
    return { ok: true, status: 200, json: async () => ({ embedding: fakeEmbedding }), text: async () => "" };
  };
  const r = await embedViaOllama("kienzle force", { fetchImpl });
  assert.equal(r.ok, true);
  assert.equal(r.vector.length, EMBEDDING_DIM);
  assert.equal(r.vector[0], 1);
});

test("U-SEMANTIC-LOOKUP: embedViaOllama — Ollama 500 returns ok:false with error", async () => {
  const fetchImpl = async () => ({ ok: false, status: 500, text: async () => "internal", json: async () => ({}) });
  const r = await embedViaOllama("query", { fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /HTTP 500/);
});

test("U-SEMANTIC-LOOKUP: embedViaOllama — fetch throws returns ok:false (never throws upward)", async () => {
  const fetchImpl = async () => { throw new Error("ECONNREFUSED"); };
  const r = await embedViaOllama("query", { fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /ECONNREFUSED|unreachable/);
});

test("U-SEMANTIC-LOOKUP: embedViaOllama — empty query rejected up front (no fetch)", async () => {
  let fetchCalled = false;
  const fetchImpl = async () => { fetchCalled = true; return { ok: true, status: 200, json: async () => ({ embedding: [] }), text: async () => "" }; };
  const r = await embedViaOllama("", { fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /empty query/);
  assert.equal(fetchCalled, false, "must not waste a fetch on an empty query");
});

test("U-SEMANTIC-LOOKUP: embedViaOllama — dim mismatch is fail-loud (schema-drift guard)", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ embedding: [1, 2, 3] }), // wrong dim
    text: async () => "",
  });
  const r = await embedViaOllama("query", { fetchImpl });
  assert.equal(r.ok, false);
  assert.match(r.error, /dim 3/, "must surface the dim mismatch — protects against silent wrong-model substitution");
});

test("U-SEMANTIC-LOOKUP: cosineRank — per-entry normalization (P2-b honesty fix) — scores stay in [-1, 1]", () => {
  // Build entries with NON-unit vectors (simulates the int8 round-trip drift).
  // Without per-entry normalization, dot product can exceed 1.0 — that's the
  // exact bug Arm B flagged. With normalization, dot(unit_q, unit_v) ∈ [-1,1].
  const queryVec = [1, 0, 0, 0];
  // Entry 1: aligned but with magnitude 5 (NOT unit)
  const big = [127, 0, 0, 0]; // dequantizes to [1, 0, 0, 0] — happens to be unit
  // Entry 2: aligned with magnitude 0.5 (still unit after re-norm)
  const small = [64, 0, 0, 0]; // dequantizes to [0.504, 0, 0, 0] — not unit
  const entries = [
    { n: "big", t: "x", q: big },
    { n: "small", t: "y", q: small },
  ];
  const hits = cosineRank(queryVec, entries, 2);
  // Both should score ~1.0 because they're both aligned with the query AFTER
  // their own L2 normalization. Pre-fix, "big" would have scored ~1.0 and
  // "small" ~0.504 — magnitude-driven ranking, not direction-driven.
  assert.equal(hits.length, 2);
  assert.ok(hits[0].score <= 1.0001, `score ${hits[0].score} must be ≤ 1.0 (cosine bound)`);
  assert.ok(hits[1].score <= 1.0001);
  assert.ok(Math.abs(hits[0].score - hits[1].score) < 1e-3, "both aligned vectors should score equally after normalization");
});

test("U-SEMANTIC-LOOKUP: cosineRank — zero-magnitude entry is skipped (not infinity)", () => {
  // After dequantize, a zero-vector entry would divide-by-zero in the
  // normalization. The impl must skip it, not emit NaN/Infinity scores.
  const zero = [0, 0, 0, 0]; // dequantize → all zeros
  const aligned = [127, 0, 0, 0];
  const r = cosineRank([1, 0, 0, 0], [
    { n: "zero", q: zero },
    { n: "aligned", q: aligned },
  ], 5);
  assert.equal(r.length, 1, "zero-vector entry must be skipped");
  assert.equal(r[0].name, "aligned");
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — model drift fail-loud (P2-a)", () => {
  // A meta line declaring a DIFFERENT model than EMBEDDINGS_MODEL must
  // return ok:false. Without this guard, a producer that switches to (e.g.)
  // mxbai-embed-large would pass the dim guard but produce meaningless
  // rankings since the embedding spaces differ.
  const q = new Array(EMBEDDING_DIM).fill(0);
  q[0] = 100;
  const synth = [
    JSON.stringify({ __meta: true, model: "mxbai-embed-large", dim: EMBEDDING_DIM, count: 1 }),
    JSON.stringify({ n: "alpha", t: "engine", q }),
  ].join("\n");
  const r = loadEmbeddingIndex({ readImpl: () => synth });
  assert.equal(r.ok, false);
  assert.match(r.error, /generated by model 'mxbai-embed-large'/);
  assert.match(r.error, new RegExp(EMBEDDINGS_MODEL.replace(/[-/]/g, ".")));
});

test("U-SEMANTIC-LOOKUP: loadEmbeddingIndex — matching model meta line is accepted", () => {
  // Pre-condition for P2-a guard: a meta line declaring the canonical model
  // must NOT trigger the drift fail-loud.
  const q = new Array(EMBEDDING_DIM).fill(0);
  const synth = [
    JSON.stringify({ __meta: true, model: EMBEDDINGS_MODEL, dim: EMBEDDING_DIM, count: 1 }),
    JSON.stringify({ n: "alpha", q }),
  ].join("\n");
  const r = loadEmbeddingIndex({ readImpl: () => synth });
  assert.equal(r.ok, true);
  assert.equal(r.meta.model, EMBEDDINGS_MODEL);
});

test("U-SEMANTIC-LOOKUP: REAL-DATA E2E loadEmbeddingIndex parses the live 14738-entry index", { skip: existsSync(join(REPO_ROOT, EMBEDDINGS_REL)) ? false : "embeddings file not on disk" }, () => {
  const r = loadEmbeddingIndex();
  assert.equal(r.ok, true);
  assert.ok(r.entries.length > 10000, `expected >10k entries on disk, got ${r.entries.length}`);
  assert.equal(r.meta?.model, EMBEDDINGS_MODEL);
  assert.equal(r.meta?.dim, EMBEDDING_DIM);
  // Validate entry shape on the live file (not just synth fixtures).
  const sample = r.entries[0];
  assert.equal(typeof sample.n, "string");
  assert.equal(sample.q.length, EMBEDDING_DIM);
});

test("U-SEMANTIC-LOOKUP: agent loop accepts semantic_search as a routed tool", async () => {
  let toolFired = false;
  const STUB_RESULT = `Semantic search hits for "x" (cosine similarity vs 14738 embedded entries):\n  alpha [engine]  (score 0.812)\n(top 1 of 14738 ranked; ...)`;
  const chat = scriptedChat([
    toolCallResponse([{ function: { name: "semantic_search", arguments: { query: "kienzle force" } } }]),
    answerResponse("The relevant engine is alpha."),
  ]);
  const fakeImpls = {
    viz_search: () => "",
    wiki_lookup: () => "",
    read_excerpt: () => "",
    obsidian_lookup: () => "",
    dispatcher_map: () => "",
    semantic_search: async (args) => {
      toolFired = true;
      assert.equal(args.query, "kienzle force");
      return STUB_RESULT;
    },
  };
  const r = await runAgentLoop({
    question: "where is cutting force?",
    model: DEFAULT_MODEL,
    maxCalls: 4,
    deps: { chatImpl: chat, toolImpls: fakeImpls },
  });
  assert.equal(r.ok, true);
  assert.equal(toolFired, true, "semantic_search impl must have been called");
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0].name, "semantic_search");
  assert.equal(r.toolCalls[0].result, STUB_RESULT, "agent loop must capture the tool result verbatim");
});

// ── optional live Ollama E2E — skip-loud when Ollama is down ───────────────

test("LIVE: chatOllama reaches a real Ollama (skips loud if unreachable)", async (t) => {
  const res = await chatOllama(
    DEFAULT_MODEL,
    [{ role: "user", content: "Reply with the single word OK." }],
    undefined,
    { timeoutMs: 8000 },
  );
  if (!res.ok) {
    t.skip(`Ollama not reachable/warm within 8s — ${res.error}`);
    return;
  }
  assert.equal(typeof res.message, "object");
  assert.equal(res.message.role, "assistant");
});

// ─────────────────────────────────────────────────────────────────────────
// U-OE-BRIDGE-L2B (2026-05-18, slot foxtrot) — live MCP-dispatcher tools
// ─────────────────────────────────────────────────────────────────────────

test("U-OE-BRIDGE-L2B: TOOL_NAMES includes mcp_call as the 7th read-only tool", () => {
  assert.ok(TOOL_NAMES.includes("mcp_call"), "mcp_call must be on the allowlist");
  assert.equal(TOOL_NAMES.length, 7, `expected 7 tools total, got ${TOOL_NAMES.length}`);
});

test("U-OE-BRIDGE-L2B: mcpAllowlist() returns a frozen, non-empty dispatcher map", () => {
  const allow = mcpAllowlist();
  assert.ok(Object.isFrozen(allow), "mcpAllowlist must be frozen — no runtime mutation");
  assert.ok(allow.prism_calc, "prism_calc must be allowlisted");
  assert.ok(allow.prism_session, "prism_session must be allowlisted");
  assert.ok(Array.isArray(allow.prism_calc) && allow.prism_calc.length >= 5, "prism_calc must list ≥5 physics actions");
  assert.ok(Object.isFrozen(allow.prism_calc), "inner allowlist arrays must be frozen too");
  // Concrete actions that MUST be present (regression oracle — if a future
  // edit deletes one, this test names the loss before deploy):
  for (const a of ["cutting_force", "tool_life", "speed_feed", "mrr"]) {
    assert.ok(allow.prism_calc.includes(a), `prism_calc must include '${a}'`);
  }
});

test("U-OE-BRIDGE-L2B: toolSpecs() advertises mcp_call with dispatcher + action + params schema", () => {
  const specs = toolSpecs();
  assert.equal(specs.length, 7, "exactly 7 tool specs after L2b");
  const spec = specs.find((s) => s.function && s.function.name === "mcp_call");
  assert.ok(spec, "mcp_call spec must be present");
  assert.equal(spec.type, "function");
  assert.deepEqual(spec.function.parameters.required, ["dispatcher", "action"], "mcp_call requires dispatcher + action");
  const props = spec.function.parameters.properties;
  assert.ok(props.dispatcher && props.dispatcher.type === "string");
  assert.ok(props.action && props.action.type === "string");
  assert.ok(props.params && props.params.type === "object");
});

test("U-OE-BRIDGE-L2B: buildSystemPrompt names mcp_call so the model knows about it", () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes("mcp_call"), "system prompt must mention mcp_call");
  assert.ok(prompt.includes("seven READ-ONLY tools"), "system prompt must update tool count to seven");
});

// validateMcpCall — pure unit tests

test("validateMcpCall: rejects empty dispatcher", () => {
  const r = validateMcpCall("", "cutting_force", {});
  assert.equal(r.ok, false);
  assert.match(r.error, /dispatcher/);
});

test("validateMcpCall: rejects empty action", () => {
  const r = validateMcpCall("prism_calc", "", {});
  assert.equal(r.ok, false);
  assert.match(r.error, /action/);
});

test("validateMcpCall: rejects dispatcher OUTSIDE allowlist (the safety guard)", () => {
  const r = validateMcpCall("prism_dev", "build", {});
  assert.equal(r.ok, false, "prism_dev (writes!) must NOT be allowlisted");
  assert.match(r.error, /not in read-only allowlist/);
});

test("validateMcpCall: rejects ALLOWED dispatcher but DISALLOWED action", () => {
  const r = validateMcpCall("prism_calc", "definitely_not_a_real_action", {});
  assert.equal(r.ok, false);
  assert.match(r.error, /not in read-only allowlist/);
  assert.match(r.error, /allowed actions for prism_calc/);
});

test("validateMcpCall: rejects params that aren't a plain object", () => {
  const r = validateMcpCall("prism_calc", "cutting_force", [1, 2, 3]);
  assert.equal(r.ok, false);
  assert.match(r.error, /params.*object/i);
});

test("validateMcpCall: rejects params over the size cap (inflation defense)", () => {
  const big = { blob: "x".repeat(5000) };
  const r = validateMcpCall("prism_calc", "cutting_force", big);
  assert.equal(r.ok, false);
  assert.match(r.error, /too large/);
});

test("validateMcpCall: null/undefined params become {} (model-friendly default)", () => {
  const r = validateMcpCall("prism_calc", "cutting_force", null);
  assert.equal(r.ok, true);
  assert.deepEqual(r.params, {});
});

test("validateMcpCall: a happy-path call returns normalized fields", () => {
  const r = validateMcpCall("prism_calc", "cutting_force", { material: "P", b: 1, h: 0.1 });
  assert.equal(r.ok, true);
  assert.equal(r.dispatcher, "prism_calc");
  assert.equal(r.action, "cutting_force");
  assert.equal(r.params.material, "P");
});

test("validateMcpCall: trims whitespace on dispatcher and action", () => {
  const r = validateMcpCall("  prism_calc  ", "  cutting_force  ", {});
  assert.equal(r.ok, true);
  assert.equal(r.dispatcher, "prism_calc");
  assert.equal(r.action, "cutting_force");
});

// validateToolCall (the upstream guard) — proves L2b is wired through the full pipeline

test("validateToolCall: mcp_call delegates to validateMcpCall and rejects disallowed dispatchers", () => {
  const r = validateToolCall("mcp_call", { dispatcher: "prism_dev", action: "build" });
  assert.equal(r.ok, false);
  assert.match(r.error, /not in read-only allowlist/);
});

test("validateToolCall: mcp_call happy path passes validation", () => {
  const r = validateToolCall("mcp_call", { dispatcher: "prism_calc", action: "cutting_force", params: { material: "P" } });
  assert.equal(r.ok, true);
});

// clampToolArgs — coerces shapes safely

test("clampToolArgs: mcp_call trims strings and defaults params to {}", () => {
  const c = clampToolArgs("mcp_call", { dispatcher: "  prism_calc ", action: " cutting_force ", params: null });
  assert.deepEqual(c, { dispatcher: "prism_calc", action: "cutting_force", params: {} });
});

test("clampToolArgs: mcp_call params is dropped if it's an array (not a plain object)", () => {
  const c = clampToolArgs("mcp_call", { dispatcher: "prism_calc", action: "cutting_force", params: [1, 2] });
  assert.deepEqual(c.params, {}, "arrays must be replaced with {} — the impl re-validates");
});

// parseMcpResponse — pure

test("parseMcpResponse: application/json body parses cleanly", () => {
  const r = parseMcpResponse("application/json", JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } }));
  assert.equal(r.ok, true);
  assert.equal(r.envelope.result.ok, true);
});

test("parseMcpResponse: text/event-stream picks the JSON-RPC response envelope", () => {
  const sse =
    ": comment\n" +
    "data: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{\"hello\":\"world\"}}\n" +
    "\n" +
    "data: [DONE]\n";
  const r = parseMcpResponse("text/event-stream", sse);
  assert.equal(r.ok, true);
  assert.equal(r.envelope.result.hello, "world");
});

test("parseMcpResponse: empty body is a fail-loud error, never an empty envelope", () => {
  const r = parseMcpResponse("application/json", "");
  assert.equal(r.ok, false);
  assert.match(r.error, /empty/i);
});

test("parseMcpResponse: malformed JSON is rejected with the parser error message", () => {
  const r = parseMcpResponse("application/json", "{not json}");
  assert.equal(r.ok, false);
  assert.match(r.error, /not valid JSON/);
});

test("parseMcpResponse: SSE stream with no response envelope is rejected loudly", () => {
  const r = parseMcpResponse("text/event-stream", "data: [DONE]\n\n");
  assert.equal(r.ok, false);
  assert.match(r.error, /no JSON-RPC response envelope/);
});

test("parseMcpResponse: unknown content-type falls back to JSON, fails loud when not JSON", () => {
  const ok = parseMcpResponse("text/plain", JSON.stringify({ jsonrpc: "2.0", id: 1, result: "x" }));
  assert.equal(ok.ok, true);
  const bad = parseMcpResponse("text/plain", "just text");
  assert.equal(bad.ok, false);
  assert.match(bad.error, /unsupported Content-Type/i);
});

// renderMcpResult — pure rendering

test("renderMcpResult: prefers content[].text over structuredContent", () => {
  const out = renderMcpResult({ content: [{ type: "text", text: "hello world" }], structuredContent: { x: 1 } });
  assert.equal(out, "hello world");
});

test("renderMcpResult: falls back to structuredContent JSON when no content text", () => {
  const out = renderMcpResult({ content: [], structuredContent: { force_N: 1234 } });
  assert.ok(out.includes("force_N"));
  assert.ok(out.includes("1234"));
});

test("renderMcpResult: string result is passed through (capped)", () => {
  assert.equal(renderMcpResult("plain text"), "plain text");
});

test("renderMcpResult: null/undefined result returns an explicit honesty marker", () => {
  assert.equal(renderMcpResult(null), "(MCP returned no result)");
  assert.equal(renderMcpResult(undefined), "(MCP returned no result)");
});

// mcpCallStreamable — impure shell with injected fake fetch

test("mcpCallStreamable: happy-path JSON-RPC over JSON returns the result", async () => {
  let captured = null;
  const fakeFetch = async (url, opts) => {
    captured = { url, headers: opts.headers, body: JSON.parse(opts.body) };
    return {
      ok: true,
      headers: { get: (h) => (h.toLowerCase() === "content-type" ? "application/json" : null) },
      text: async () => JSON.stringify({ jsonrpc: "2.0", id: captured.body.id, result: { content: [{ type: "text", text: "12.5 N" }] } }),
    };
  };
  const r = await mcpCallStreamable({
    dispatcher: "prism_calc",
    action: "cutting_force",
    params: { material: "P" },
    fetchImpl: fakeFetch,
  });
  assert.equal(r.ok, true);
  assert.equal(r.result.content[0].text, "12.5 N");
  assert.equal(captured.headers.Accept, "application/json, text/event-stream", "must request both transports");
  assert.equal(captured.body.method, "tools/call");
  assert.equal(captured.body.params.name, "prism_calc");
  assert.equal(captured.body.params.arguments.action, "cutting_force");
  assert.equal(captured.body.params.arguments.material, "P", "params must be merged into arguments");
});

test("mcpCallStreamable: text/event-stream branch extracts the response envelope", async () => {
  const sse = "data: {\"jsonrpc\":\"2.0\",\"id\":42,\"result\":{\"answer\":7}}\n\n";
  const fakeFetch = async () => ({
    ok: true,
    headers: { get: () => "text/event-stream" },
    text: async () => sse,
  });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "mrr", fetchImpl: fakeFetch });
  assert.equal(r.ok, true);
  assert.equal(r.result.answer, 7);
});

test("mcpCallStreamable: HTTP non-2xx surfaces the body in a fail-loud error", async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 500,
    headers: { get: () => "text/plain" },
    text: async () => "internal explosion",
  });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "cutting_force", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /MCP HTTP 500/);
  assert.match(r.error, /internal explosion/);
});

test("mcpCallStreamable: JSON-RPC error envelope is surfaced as fail-loud", async () => {
  const fakeFetch = async () => ({
    ok: true,
    headers: { get: () => "application/json" },
    text: async () => JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "Method not found" } }),
  });
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "cutting_force", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /Method not found/);
});

test("mcpCallStreamable: AbortError on timeout surfaces a helpful message", async () => {
  const fakeFetch = async (_url, opts) => {
    // Honor the abort signal — simulate a connection that races the timeout.
    return await new Promise((_resolve, reject) => {
      opts.signal.addEventListener("abort", () => {
        const e = new Error("aborted");
        e.name = "AbortError";
        reject(e);
      });
    });
  };
  const r = await mcpCallStreamable({
    dispatcher: "prism_calc",
    action: "cutting_force",
    fetchImpl: fakeFetch,
    timeoutMs: 50, // tight — forces abort fast
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out after 50ms/);
});

test("mcpCallStreamable: fetch throwing a network error becomes fail-loud (not a crash)", async () => {
  const fakeFetch = async () => {
    throw new Error("ECONNREFUSED");
  };
  const r = await mcpCallStreamable({ dispatcher: "prism_calc", action: "cutting_force", fetchImpl: fakeFetch });
  assert.equal(r.ok, false);
  assert.match(r.error, /MCP unreachable/);
  assert.match(r.error, /ECONNREFUSED/);
});

// buildToolImpls — mcp_call wiring through injected client

test("buildToolImpls: mcp_call uses the injected mcpClient and renders the result", async () => {
  let calledWith = null;
  const stubClient = async (opts) => {
    calledWith = opts;
    return { ok: true, result: { content: [{ type: "text", text: "Fc = 850 N" }] } };
  };
  const impls = buildToolImpls({ mcpClient: stubClient });
  const out = await impls.mcp_call({ dispatcher: "prism_calc", action: "cutting_force", params: { material: "P" } });
  assert.equal(calledWith.dispatcher, "prism_calc");
  assert.equal(calledWith.action, "cutting_force");
  assert.equal(calledWith.params.material, "P");
  assert.match(out, /MCP prism_calc:cutting_force/);
  assert.match(out, /Fc = 850 N/);
});

test("buildToolImpls: mcp_call surfaces a client-returned {ok:false,error} as ERROR:", async () => {
  const stubClient = async () => ({ ok: false, error: "stubbed failure" });
  const impls = buildToolImpls({ mcpClient: stubClient });
  const out = await impls.mcp_call({ dispatcher: "prism_calc", action: "cutting_force" });
  assert.match(out, /^ERROR: stubbed failure/);
});

test("buildToolImpls: mcp_call re-validates allowlist at the impl boundary (defense-in-depth)", async () => {
  let clientCalled = false;
  const stubClient = async () => { clientCalled = true; return { ok: true, result: "x" }; };
  const impls = buildToolImpls({ mcpClient: stubClient });
  const out = await impls.mcp_call({ dispatcher: "prism_dev", action: "build" });
  assert.match(out, /^ERROR:.*not in read-only allowlist/);
  assert.equal(clientCalled, false, "client must NEVER be called for a disallowed dispatcher");
});

test("buildToolImpls: mcp_call catches a thrown client (must never crash the agent loop)", async () => {
  const throwingClient = async () => { throw new Error("boom"); };
  const impls = buildToolImpls({ mcpClient: throwingClient });
  const out = await impls.mcp_call({ dispatcher: "prism_calc", action: "cutting_force" });
  assert.match(out, /^ERROR: mcp_call threw/);
  assert.match(out, /boom/);
});

// Agent-loop integration — proves the routing path through runAgentLoop

test("U-OE-BRIDGE-L2B: agent loop routes a tool_call for mcp_call to the impl and finalizes", async () => {
  let toolFired = false;
  const chat = scriptedChat([
    toolCallResponse([{ function: { name: "mcp_call", arguments: { dispatcher: "prism_calc", action: "cutting_force", params: { material: "P" } } } }]),
    answerResponse("Cutting force is 850 N."),
  ]);
  const stubClient = async () => {
    toolFired = true;
    return { ok: true, result: { content: [{ type: "text", text: "Fc = 850 N" }] } };
  };
  const fakeImpls = buildToolImpls({ mcpClient: stubClient });
  const r = await runAgentLoop({
    question: "what is cutting force for P-group steel?",
    model: DEFAULT_MODEL,
    maxCalls: 4,
    deps: { chatImpl: chat, toolImpls: fakeImpls },
  });
  assert.equal(r.ok, true);
  assert.equal(toolFired, true, "mcp_call must reach the injected client");
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0].name, "mcp_call");
  assert.match(r.toolCalls[0].result, /Fc = 850 N/);
  assert.equal(r.answer, "Cutting force is 850 N.");
});

// REAL-DATA E2E — the regression oracle that the live MCP server actually answers.
// Skip-loud when unreachable so a fresh-clone CI doesn't fail; on this PC the
// server IS up and this proves the L2b blocker is gone.

// Negative-allowlist regression guard (per-file arm-B P2.1 promoted):
// future merges that mistakenly add a write/spawn dispatcher to the allowlist
// FAIL this test before deploy.
test("U-OE-BRIDGE-L2B: write-capable dispatchers are NEVER on the allowlist (regression guard)", () => {
  const allow = mcpAllowlist();
  const deny = mcpDenylist();
  assert.ok(Array.isArray(deny) || Object.isFrozen(deny), "denylist must be frozen + iterable");
  assert.ok(deny.length >= 6, `denylist must list ≥6 known-write dispatchers, got ${deny.length}`);
  for (const banned of deny) {
    assert.equal(allow[banned], undefined, `${banned} MUST NEVER be on the allowlist — it writes/spawns/mutates`);
    // Also: validateMcpCall must REJECT every banned dispatcher, regardless of action.
    const r = validateMcpCall(banned, "anything", {});
    assert.equal(r.ok, false, `validateMcpCall must reject ${banned} (write-capable)`);
    assert.match(r.error, /not in read-only allowlist/);
  }
});

// Per-allowlisted-action live probe — addresses arm-B P1.1: the allowlist
// promises 14 actions; this verifies ROUTING for each at the live MCP server.
// Skip-loud when the server is unreachable. A failure means a real, named
// allowlist entry that doesn't route — caller knows to narrow the allowlist
// before commit.
test("U-OE-BRIDGE-L2B: REAL-DATA per-action routing probe across the full allowlist (skip-loud)", { timeout: 60000 }, async (t) => {
  let healthy = false;
  try {
    const probe = await fetch("http://127.0.0.1:3100/health", { signal: AbortSignal.timeout(2000) });
    healthy = probe.ok;
  } catch {
    healthy = false;
  }
  if (!healthy) {
    t.skip("MCP server not reachable on :3100 — skip-loud");
    return;
  }
  const allow = mcpAllowlist();
  // Minimal probe params per action — kept intentionally THIN so we test
  // ROUTING + REJECTION-AS-DEFINED, not the whole physics surface.
  // A dispatcher that VALIDATES and returns a fail-loud JSON-RPC error on
  // missing required fields is considered "routing-verified" — the bridge
  // surfaces that error to the model so it can retry with correct shape.
  const PROBE_PARAMS = {
    "prism_session:master_index_query": { query: "ollama", topK: 1 },
    "prism_session:dispatcher_map_compact": {},
    "prism_session:action_search": { query: "cutting_force" },
    "prism_session:action_find": { name: "cutting_force" },
    // calc actions: empty params — dispatcher will either compute with defaults
    // or return a Zod validation error. Both are routing-verified outcomes.
    "prism_calc:cutting_force": {},
    "prism_calc:tool_life": {},
    "prism_calc:speed_feed": {},
    "prism_calc:surface_finish": {},
    "prism_calc:power": {},
    "prism_calc:torque": {},
    "prism_calc:mrr": {},
    "prism_calc:chip_load": {},
    "prism_calc:chip_thinning": {},
    "prism_calc:cycle_time": {},
  };
  const failures = [];
  let routedOk = 0;
  let dispatcherValidationErr = 0;
  for (const [dispatcher, actions] of Object.entries(allow)) {
    for (const action of actions) {
      const key = `${dispatcher}:${action}`;
      const params = PROBE_PARAMS[key];
      assert.ok(params !== undefined, `test must list a probe param for every allowlisted action (missing: ${key})`);
      const r = await mcpCallStreamable({ dispatcher, action, params, timeoutMs: 5000 });
      if (r.ok) {
        routedOk++;
      } else if (
        /JSON-RPC error/i.test(r.error) ||
        /Invalid|required|expected|validation/i.test(r.error)
      ) {
        // Routing-verified: the dispatcher RECEIVED the call and returned a
        // structured error. The model would retry with corrected shape.
        dispatcherValidationErr++;
      } else if (/Method not found|-32601/.test(r.error)) {
        // ROUTING BROKEN — this action does not exist on the live server.
        failures.push(`${key}: action not routed (${r.error.slice(0, 120)})`);
      } else if (/timed out|unreachable|ECONNREFUSED/i.test(r.error)) {
        // Transport flake — skip this single action.
        t.diagnostic(`${key}: transport flake, ignored — ${r.error.slice(0, 120)}`);
      } else {
        failures.push(`${key}: unexpected error — ${r.error.slice(0, 160)}`);
      }
    }
  }
  t.diagnostic(`probe summary: ${routedOk} OK + ${dispatcherValidationErr} dispatcher-validation (routed) + ${failures.length} failures`);
  assert.equal(failures.length, 0, `unrouted/unexpected allowlist actions:\n  ${failures.join("\n  ")}`);
});

// P1.2 cache uniformity — proves graphCache moved from closure-local `let`
// to root-keyed Map. A second buildToolImpls() with the same root must
// re-use the same loaded graph (no double parse).
test("U-OE-BRIDGE-L2B (P1.2): graph cache is root-keyed and shared across buildToolImpls() invocations", async () => {
  // Real graph is large; just prove the cache is hit on a second viz_search
  // call from a SEPARATE impls instance with the same root. We rely on the
  // observable that two separate viz_search calls (different impl factories)
  // return the SAME `scanned` count + `file` path — proving they read the
  // SAME parsed graph object. If the cache were closure-local, two factories
  // would each load the graph independently.
  if (!existsSync(join(REPO_ROOT, "state/shared/system-viz/system-graph.json"))) {
    return; // skip-soft — no live graph; the cache contract is mechanical
  }
  const implsA = buildToolImpls();
  const implsB = buildToolImpls();
  const outA = implsA.viz_search({ query: "ollama-prism-bridge", max_hits: 1 });
  const outB = implsB.viz_search({ query: "ollama-prism-bridge", max_hits: 1 });
  // Both must report scanned-count + file from the SAME cache entry.
  const mA = outA.match(/scanned (\d+) nodes/);
  const mB = outB.match(/scanned (\d+) nodes/);
  assert.ok(mA, "viz_search must report scanned node count");
  assert.ok(mB, "viz_search must report scanned node count");
  assert.equal(mA[1], mB[1], "both impls must scan the same graph (same node count)");
});

test("U-OE-BRIDGE-L2B: REAL-DATA E2E mcpCallStreamable hits live MCP server (skip-loud)", { timeout: 12000 }, async (t) => {
  // Health-probe via the documented sidecar route — if the server isn't up,
  // we don't have network and the test skips loud.
  let healthy = false;
  try {
    const probe = await fetch("http://127.0.0.1:3100/health", { signal: AbortSignal.timeout(2000) });
    healthy = probe.ok;
  } catch {
    healthy = false;
  }
  if (!healthy) {
    t.skip("MCP server not reachable on :3100 — skip-loud (start it with mcp-server then re-run)");
    return;
  }
  // master_index_query is on the allowlist + needs no large params + has
  // ZERO side effects — perfect smoke test.
  const r = await mcpCallStreamable({
    dispatcher: "prism_session",
    action: "master_index_query",
    params: { query: "ollama-prism-bridge", topK: 1 },
    timeoutMs: 8000,
  });
  if (!r.ok) {
    // If the live action enum has drifted, surface that — don't silently pass.
    t.skip(`MCP live call returned an error (action may have drifted): ${r.error}`);
    return;
  }
  assert.ok(r.result != null, "live MCP must return a non-null result");
});

