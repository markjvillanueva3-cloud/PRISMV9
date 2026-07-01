#!/usr/bin/env node
/**
 * hermes-subscription-proxy.mjs -- a LOCAL OpenAI-compatible HTTP server (port 8766) that fronts the
 * operator's SUBSCRIPTION coding CLIs so Hermes can use them as NATIVE, switchable models in its /model
 * picker + app UI (HERMES-MODEL-PICKER-MS0 Phase 2, slot:bravo 2026-06-30):
 *   - claude-opus-4-8 / claude-sonnet-5  -> claude.exe -p --model <m>   (Claude Max subscription, $0 API)
 *   - gpt-5-codex                        -> codex exec --output-last-message  (ChatGPT subscription, $0 API)
 *
 * WHY: the operator wants ALL their models pickable in Hermes. Local Ollama + NVIDIA are OpenAI-compatible
 * endpoints (config-only, Phase 1). Claude + Codex are CLIs, NOT endpoints -- this proxy makes them look
 * like one OpenAI provider so the Hermes custom_provider "PRISM Subscription" (base_url 127.0.0.1:8766/v1,
 * discover_models) lists them via GET /v1/models and routes chat via POST /v1/chat/completions.
 *
 * HONEST CAVEATS: each /v1/chat/completions spawns a CLI -> SECONDS of latency (best for "use Claude/Codex
 * as my MAIN model for this task," not fast interactive chat). Claude draws the Claude Max PROGRAMMATIC pool
 * ($100/$200-mo at API rates); Codex draws ChatGPT plan limits. prism_escalate stays the fast on-demand path.
 *
 * SAFETY: spawns claude.EXE / node+codex.js DIRECTLY (no cmd.exe -> no shell injection); binds 127.0.0.1
 * ONLY (never exposed); NULs stripped from prompts; never logs a prompt/response body.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";

const PORT = Number(process.env.PRISM_HERMES_SUBPROXY_PORT || 8766);
const NODE = process.execPath;
const CLAUDE_CMD = process.env.PRISM_CLAUDE_CMD || "H:/Tools/nodejs/claude.cmd";
const CLAUDE_EXE = process.env.PRISM_CLAUDE_EXE
  || resolve(dirname(CLAUDE_CMD), "node_modules/@anthropic-ai/claude-code/bin/claude.exe");
const CODEX_JS = process.env.PRISM_HERMES_CODEX_JS
  || resolve(dirname(NODE), "node_modules/@openai/codex/bin/codex.js");
const REQ_TIMEOUT_MS = Number(process.env.PRISM_HERMES_SUBPROXY_TIMEOUT_MS || 300000); // CLI agent startup is slow
const MAX_BODY = 4 * 1024 * 1024;

// the models this proxy serves -- what GET /v1/models lists + what the Hermes picker shows.
export const PROXY_MODELS = [
  { id: "claude-opus-4-8", kind: "claude" },
  { id: "claude-sonnet-5", kind: "claude" },
  { id: "gpt-5-codex", kind: "codex" },
];

// ---- pure helpers (exported, unit-tested) ----------------------------------------------

/** OpenAI `GET /v1/models` list shape. Pure. */
export function openAIModelsList() {
  return { object: "list", data: PROXY_MODELS.map((m) => ({ id: m.id, object: "model", created: 0, owned_by: "prism-subscription" })) };
}

/** Which CLI backs a model id -> {kind:"claude"|"codex", model} or null (unknown). Pure. */
export function routeModel(modelId) {
  const id = String(modelId || "");
  const known = PROXY_MODELS.find((m) => m.id === id);
  if (known) return { kind: known.kind, model: id };
  if (/codex|gpt-?5/i.test(id)) return { kind: "codex", model: id };   // permissive aliases
  if (/claude|opus|sonnet/i.test(id)) return { kind: "claude", model: id };
  return null;
}

/** Serialize an OpenAI messages[] into one prompt for a one-shot CLI. Pure. Roles labeled; NULs stripped. */
export function serializeMessages(messages) {
  if (!Array.isArray(messages)) return "";
  const parts = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    let content = m.content;
    if (Array.isArray(content)) content = content.map((c) => (c && (c.text || c.content)) || "").join("");
    parts.push(`[${String(m.role || "user")}]\n${content == null ? "" : String(content)}`);
  }
  return parts.join("\n\n").replace(/\x00/g, "");
}

/** OpenAI chat.completion response shape. Pure (takes `created` for deterministic tests). */
export function openAIResponse(model, answer, created = 0) {
  return {
    id: `chatcmpl-prism-${created}`,
    object: "chat.completion",
    created,
    model,
    choices: [{ index: 0, message: { role: "assistant", content: String(answer == null ? "" : answer) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

/** claude.exe argv (variable model; injection-safe -- spawned directly, no shell). Pure. */
export function claudeArgv(model, prompt) {
  return ["--dangerously-skip-permissions", "--model", String(model), "-p", String(prompt || "").replace(/\x00/g, "")];
}

/** codex.js argv (exec, read-only sandbox, clean output to a file). Pure. */
export function codexArgv(codexJs, prompt, outFile) {
  return [codexJs, "exec", "--sandbox", "read-only", "-c", "approval_policy=never", "--output-last-message", outFile, String(prompt || "").replace(/\x00/g, "")];
}

// ---- impure execution ------------------------------------------------------------------

function run(file, args, timeoutMs) {
  return new Promise((res) => {
    let out = "", err = "", done = false, child;
    try { child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { return res({ ok: false, out: "", err: String((e && e.message) || e) }); }
    const t = setTimeout(() => { if (!done) { done = true; try { child.kill("SIGKILL"); } catch { /* */ } res({ ok: false, out, err: err + "\n[timeout]" }); } }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { if (done) return; done = true; clearTimeout(t); res({ ok: false, out, err: String((e && e.message) || e) }); });
    child.on("close", (code) => { if (done) return; done = true; clearTimeout(t); res({ ok: code === 0, out, err }); });
  });
}

async function execClaude(model, prompt) {
  if (!existsSync(CLAUDE_EXE)) return { ok: false, err: `claude.exe not found at ${CLAUDE_EXE}` };
  const r = await run(CLAUDE_EXE, claudeArgv(model, prompt), REQ_TIMEOUT_MS);
  return r.ok ? { ok: true, answer: r.out.trim() } : { ok: false, err: (r.err || "claude failed").slice(0, 400) };
}

async function execCodex(_model, prompt) {
  if (!existsSync(CODEX_JS)) return { ok: false, err: `codex.js not found at ${CODEX_JS}` };
  const outFile = resolve(tmpdir(), `prism-subproxy-codex-${process.pid}-${Date.now()}.txt`);
  const r = await run(NODE, codexArgv(CODEX_JS, prompt, outFile), REQ_TIMEOUT_MS);
  let answer = "";
  try { answer = readFileSync(outFile, "utf8").trim(); } catch { /* codex may fail before writing */ }
  try { unlinkSync(outFile); } catch { /* */ }
  if (answer) return { ok: true, answer };
  return r.ok ? { ok: true, answer: (r.out.trim() || "(codex returned no message)") } : { ok: false, err: (r.err || "codex failed").slice(0, 400) };
}

/** Handle a parsed /v1/chat/completions body. Executors injectable for tests. Returns {status, body}. Pure-ish. */
export async function handleChatCompletion(body, deps = {}) {
  const doClaude = deps.execClaude || execClaude;
  const doCodex = deps.execCodex || execCodex;
  const created = deps.now || 0;
  if (!body || typeof body !== "object") return { status: 400, body: { error: { message: "invalid body" } } };
  const route = routeModel(body.model);
  if (!route) return { status: 400, body: { error: { message: `unknown model '${body.model}'` } } };
  const prompt = serializeMessages(body.messages);
  if (!prompt.trim()) return { status: 400, body: { error: { message: "empty messages" } } };
  const r = route.kind === "claude" ? await doClaude(route.model, prompt) : await doCodex(route.model, prompt);
  if (!r.ok) return { status: 502, body: { error: { message: `${route.kind} backend failed: ${r.err}` } } };
  return { status: 200, body: openAIResponse(route.model, r.answer, created) };
}

// ---- server ----------------------------------------------------------------------------

export function makeHandler(deps = {}) {
  return async (req, res) => {
    const send = (status, obj) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
    try {
      const url = req.url || "";
      if (req.method === "GET" && (url === "/health" || url === "/")) return send(200, { status: "ok", models: PROXY_MODELS.map((m) => m.id) });
      if (req.method === "GET" && url.startsWith("/v1/models")) return send(200, openAIModelsList());
      if (req.method === "POST" && url.startsWith("/v1/chat/completions")) {
        let raw = "";
        for await (const chunk of req) { raw += chunk; if (raw.length > MAX_BODY) return send(413, { error: { message: "body too large" } }); }
        let parsed = null; try { parsed = JSON.parse(raw); } catch { return send(400, { error: { message: "invalid JSON" } }); }
        const now = Math.floor(Date.now() / 1000);
        const { status, body } = await handleChatCompletion(parsed, { ...deps, now });
        if (status !== 200 || !parsed || !parsed.stream) return send(status, body);
        // minimal SSE: emit the whole answer as one delta chunk + [DONE] (Hermes may request stream:true)
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        const content = body.choices[0].message.content;
        res.write(`data: ${JSON.stringify({ id: body.id, object: "chat.completion.chunk", created: body.created, model: body.model, choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ id: body.id, object: "chat.completion.chunk", created: body.created, model: body.model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      return send(404, { error: { message: "not found" } });
    } catch (e) {
      try { res.writeHead(500, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: String((e && e.message) || e) } })); } catch { /* */ }
    }
  };
}

export function startServer(port = PORT, deps = {}) {
  const server = createServer(makeHandler(deps));
  server.listen(port, "127.0.0.1");
  return server;
}

const _direct = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/hermes-subscription-proxy.mjs");
if (_direct) {
  const server = startServer();
  process.stdout.write(`[hermes-subscription-proxy] listening on 127.0.0.1:${PORT} -- models: ${PROXY_MODELS.map((m) => m.id).join(", ")}\n`);
  process.on("SIGTERM", () => { try { server.close(); } catch { /* */ } process.exit(0); });
  process.on("SIGINT", () => { try { server.close(); } catch { /* */ } process.exit(0); });
}
