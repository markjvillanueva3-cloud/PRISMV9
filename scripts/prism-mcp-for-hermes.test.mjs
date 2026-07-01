/**
 * Tests for prism-mcp-for-hermes.mjs pure helpers + result shaping (HERMES-PRISM-INTEGRATION-MS0).
 * Run: node scripts/prism-mcp-for-hermes.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVizArgs,
  buildOllamaArgs,
  buildSkillLine,
  buildClaudeArgv,
  buildCodexArgv,
  buildEscalationRequest,
  clampText,
  toolResult,
  makeServer,
} from "./prism-mcp-for-hermes.mjs";

const getCb = (server, name) => {
  const t = server._registeredTools[name];
  return t.callback || t.handler || t.cb;
};

test("buildVizArgs: always appends --json; passes the subcommand + query + extra", () => {
  const a = buildVizArgs("find", "kienzle force");
  assert.equal(a[1], "find");
  assert.equal(a[2], "kienzle force");
  assert.equal(a[a.length - 1], "--json");
  assert.ok(a[0].endsWith("system-viz-query.mjs"));
  const b = buildVizArgs("find", "x", ["--brain-only"]);
  assert.ok(b.includes("--brain-only"));
  assert.equal(b[b.length - 1], "--json");
});

test("buildVizArgs: non-string query is coerced (no throw on number)", () => {
  const a = buildVizArgs("node-card", 123);
  assert.equal(a[2], "123");
});

test("buildOllamaArgs: viz adds --synth; file modes do not; unknown mode falls back to viz", () => {
  assert.deepEqual(buildOllamaArgs("viz", "q").slice(1), ["viz", "q", "--synth"]);
  assert.deepEqual(buildOllamaArgs("summarize", "f.ts").slice(1), ["summarize", "f.ts"]);
  assert.deepEqual(buildOllamaArgs("bogus", "q").slice(1), ["viz", "q", "--synth"]); // unknown -> viz
});

test("buildSkillLine: normalizes leading slashes, appends args, strips control chars/newlines", () => {
  assert.equal(buildSkillLine("master-index", "cutting force"), "/master-index cutting force");
  assert.equal(buildSkillLine("/dedup", ""), "/dedup");
  assert.equal(buildSkillLine("smart", undefined), "/smart");
  assert.equal(buildSkillLine("///x", "y"), "/x y");              // collapses leading slashes
  assert.equal(buildSkillLine("smart", "a\nb\r\nc"), "/smart a b c"); // newlines -> space (no -p split)
  // shell metachars are LEFT literal (safe: .exe is spawned directly, no shell) -- only control chars go
  assert.equal(buildSkillLine("smart", 'a"&"b'), '/smart a"&"b');
});

test("buildClaudeArgv: spawns claude.EXE directly (not the .cmd) with a plain model id", () => {
  const a = buildClaudeArgv("/ask-ollama summarize foo.ts");
  assert.ok(a[0].toLowerCase().endsWith("claude.exe"), "element 0 is the .exe, not the cmd.exe-routed .cmd");
  assert.ok(!a[0].toLowerCase().endsWith(".cmd"));
  assert.equal(a[2], "--model");
  assert.equal(a[3], "claude-opus-4-8");
  assert.ok(!a[3].includes("[1m]"));            // the documented headless bug
  assert.ok(a.includes("--dangerously-skip-permissions"));
  assert.equal(a[a.length - 1], "/ask-ollama summarize foo.ts");
});

test("clampText: truncates over the cap, leaves short text intact, JSON-stringifies objects", () => {
  const big = "x".repeat(30000);
  const out = clampText(big);
  assert.ok(out.length < big.length);
  assert.match(out, /truncated \d+ chars/);
  assert.equal(clampText("short"), "short");
  assert.equal(clampText({ a: 1 }), '{"a":1}');
});

test("toolResult: ok -> text content (no isError); fail -> isError + diagnostic", () => {
  const ok = toolResult({ ok: true, out: "hello" }, "prism_search");
  assert.equal(ok.content[0].text, "hello");
  assert.equal(ok.isError, undefined);
  const bad = toolResult({ ok: false, code: 3, err: "boom" }, "prism_search");
  assert.equal(bad.isError, true);
  assert.match(bad.content[0].text, /\[prism_search\] failed \(exit 3\): boom/);
});

test("makeServer: registers EXACTLY the 8 PRISM facade tools (catches a drop/rename)", () => {
  const server = makeServer({ run: async () => ({ ok: true, out: "[]" }) });
  const tools = server._registeredTools || {};
  assert.deepEqual(
    Object.keys(tools).sort(),
    ["prism_ask_ollama", "prism_blast_radius", "prism_escalate", "prism_node_card", "prism_route_model", "prism_run_skill", "prism_search", "prism_vault_search"],
  );
});

test("makeServer: a tool handler routes args through the injected runner -> toolResult", async () => {
  const calls = [];
  const server = makeServer({ run: async (file, args) => { calls.push({ file, args }); return { ok: true, out: "INJECTED" }; } });
  const tool = server._registeredTools.prism_search;
  const cb = tool.callback || tool.handler || tool.cb;
  assert.equal(typeof cb, "function", "tool exposes an invocable callback");
  const r = await cb({ query: "kienzle" }, {});
  assert.equal(calls.length, 1, "the injected runner was actually called");
  assert.ok(calls[0].args.includes("--json"), "viz argv carries --json");
  assert.ok(calls[0].args.includes("kienzle"), "the query reached the runner");
  assert.equal(r.content[0].text, "INJECTED");
  assert.equal(r.isError, undefined);
});

test("makeServer: prism_run_skill assembles a claude.EXE argv through the runner (or guards if exe missing)", async () => {
  const calls = [];
  const server = makeServer({ run: async (file, args) => { calls.push({ file, args }); return { ok: true, out: "DELEGATED" }; } });
  const tool = server._registeredTools.prism_run_skill;
  const cb = tool.callback || tool.handler || tool.cb;
  const r = await cb({ skill: "master-index", args: "cutting force" }, {});
  if (r.isError && /not found/.test(r.content[0].text)) return; // claude.exe absent -> guard path (acceptable)
  assert.equal(calls.length, 1, "delegated through the injected runner");
  assert.ok(calls[0].file.toLowerCase().endsWith("claude.exe"), "spawns claude.exe directly (no cmd.exe)");
  assert.ok(calls[0].args.includes("-p"));
  assert.ok(calls[0].args.some((a) => a === "/master-index cutting force"), "skill line assembled + passed");
  assert.equal(r.content[0].text, "DELEGATED");
});

// ---- prism_escalate (HERMES-ESCALATION-LADDER-MS0) --------------------------------------

test("buildEscalationRequest: openai wire -> Bearer auth + chat-completions body", () => {
  const t = { wire: "openai", endpoint: "https://x/v1/chat/completions", model: "m", headerName: "authorization" };
  const req = buildEscalationRequest(t, "hi", "present");
  assert.equal(req.url, "https://x/v1/chat/completions");
  assert.equal(req.headers.authorization, "Bearer present");
  assert.deepEqual(req.body.messages, [{ role: "user", content: "hi" }]);
});

test("buildEscalationRequest: anthropic wire -> x-api-key + version header + Messages body", () => {
  const t = { wire: "anthropic", endpoint: "https://api.anthropic.com/v1/messages", model: "claude-sonnet-5",
    headerName: "x-api-key", extraHeaders: { "anthropic-version": "2023-06-01" } };
  const req = buildEscalationRequest(t, "hi", "present");
  assert.equal(req.headers["x-api-key"], "present");
  assert.equal(req.headers["anthropic-version"], "2023-06-01");
  assert.ok(req.body.max_tokens > 0);
  assert.deepEqual(req.body.messages, [{ role: "user", content: "hi" }]);
});

test("buildEscalationRequest: gemini wire -> key in URL (?key=), model in path, NO auth header", () => {
  const t = { wire: "gemini", endpoint: "https://g/v1beta/models", model: "gemini-3-pro" };
  const req = buildEscalationRequest(t, "hi", "present");
  assert.match(req.url, /models\/gemini-3-pro:generateContent\?key=present$/);
  assert.equal(req.headers.authorization, undefined);
  assert.equal(req.headers["x-api-key"], undefined);
  assert.deepEqual(req.body.contents, [{ parts: [{ text: "hi" }] }]);
});

test("prism_escalate: empty prompt -> isError before any backend call", async () => {
  const server = makeServer({ run: async () => ({ ok: true, out: "X" }), httpEscalate: async () => ({ ok: true, out: "X" }) });
  const r = await getCb(server, "prism_escalate")({ tier: "claude", prompt: "   " }, {});
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /empty prompt/);
});

test("prism_escalate: unknown frontier provider -> clear {error}, no backend call", async () => {
  const calls = [];
  const server = makeServer({ httpEscalate: async (...a) => { calls.push(a); return { ok: true, out: "X" }; } });
  const r = await getCb(server, "prism_escalate")({ tier: "frontier", prompt: "q", provider: "bogus" }, {});
  assert.equal(r.isError, true);
  assert.match(r.content[0].text, /frontier provider not configured/);
  assert.equal(calls.length, 0, "must not hit the http backend when the target failed to resolve");
});

test("prism_escalate: claude tier spawns claude.EXE with the RAW prompt (or guards if exe missing)", async () => {
  const calls = [];
  const server = makeServer({ run: async (file, args) => { calls.push({ file, args }); return { ok: true, out: "OPUS-SAYS-HI" }; } });
  const r = await getCb(server, "prism_escalate")({ tier: "claude", prompt: "prove 2+2=4" }, {});
  if (r.isError && /not found/.test(r.content[0].text)) return; // claude.exe absent in this env -> guard path OK
  assert.equal(calls.length, 1, "claude tier routed through the injected runner");
  assert.ok(calls[0].file.toLowerCase().endsWith("claude.exe"), "spawns claude.exe directly (no cmd.exe)");
  assert.ok(calls[0].args.includes("-p"));
  assert.ok(calls[0].args.includes("prove 2+2=4"), "RAW prompt passed (no leading slash, not a skill line)");
  assert.equal(calls[0].args[calls[0].args.length - 1], "prove 2+2=4");
  assert.equal(r.content[0].text, "OPUS-SAYS-HI");
});

test("prism_escalate: nvidia tier routes through injected httpEscalate (or guards if key absent)", async () => {
  const calls = [];
  const server = makeServer({ httpEscalate: async (target, prompt) => { calls.push({ target, prompt }); return { ok: true, out: "NV-ANSWER" }; } });
  const r = await getCb(server, "prism_escalate")({ tier: "nvidia", prompt: "route this" }, {});
  if (r.isError && /NVIDIA_API_KEY not set/.test(r.content[0].text)) return; // no key in this env -> guard path OK
  assert.equal(calls.length, 1, "nvidia tier routed through the injected http runner");
  assert.equal(calls[0].target.wire, "openai");
  assert.equal(calls[0].target.model, "qwen/qwen3-next-80b-a3b-instruct");
  assert.equal(calls[0].prompt, "route this");
  assert.equal(r.content[0].text, "NV-ANSWER");
});

test("buildCodexArgv: exec + read-only sandbox + never-approve + output-last-message + raw prompt", () => {
  const a = buildCodexArgv("/x/codex.js", "explain this bug", "/tmp/out.txt");
  assert.equal(a[0], "/x/codex.js");
  assert.equal(a[1], "exec");
  assert.equal(a[a.indexOf("--sandbox") + 1], "read-only");
  assert.equal(a[a.indexOf("--output-last-message") + 1], "/tmp/out.txt");
  assert.equal(a[a.indexOf("-c") + 1], "approval_policy=never");
  assert.equal(a[a.length - 1], "explain this bug");
  assert.equal(buildCodexArgv("c.js", "a b", "o").pop(), "ab"); // NUL stripped
});

test("prism_escalate: codex tier spawns `node codex.js exec` (ChatGPT-sub lane) or guards if codex absent", async () => {
  const calls = [];
  const server = makeServer({ run: async (file, args) => { calls.push({ file, args }); return { ok: true, out: "CODEX-STDOUT-FALLBACK" }; } });
  const r = await getCb(server, "prism_escalate")({ tier: "codex", prompt: "reason about X" }, {});
  if (r.isError && /codex\.js not found/.test(r.content[0].text)) return; // codex absent in this env -> guard OK
  assert.equal(calls.length, 1, "codex tier routed through the injected runner");
  assert.ok(calls[0].file === process.execPath || /node(\.exe)?$/i.test(calls[0].file), "spawns node");
  assert.ok(calls[0].args.some((a) => String(a).endsWith("codex.js")), "runs codex.js");
  assert.ok(calls[0].args.includes("exec"));
  assert.ok(calls[0].args.includes("--output-last-message"));
  assert.ok(calls[0].args.includes("reason about X"));
  // the mock writes no temp file -> falls back to codex stdout (R12: failure is visible, never silent)
  assert.equal(r.content[0].text, "CODEX-STDOUT-FALLBACK");
});
