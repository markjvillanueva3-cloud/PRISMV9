#!/usr/bin/env node
/**
 * prism-mcp-for-hermes.mjs -- a LEAN curated PRISM facade exposed to the Nous Hermes app
 * as MCP tools (HERMES-PRISM-INTEGRATION-MS0, slot:bravo 2026-06-30).
 *
 * DIRECTION: Hermes -> PRISM (distinct from scripts/hermes-mcp-server.mjs, which is the
 * opposite direction: Claude Code -> Hermes via the :8645 grok lane). This server gives the
 * Hermes desktop/CLI agent deep, TOKEN-CHEAP access to the PRISM substrate WITHOUT the
 * 133K-token init that wiring the full prism :3100 (101 dispatchers / ~6000 tools) would
 * cost -- Hermes's MCP client cannot filter tools at the wire level, so a lean hand-written
 * facade (6 tools) is the only way to stay launch-fast. Full dispatcher/skill/hook/fleet
 * power is reached on-demand via prism_run_skill (Claude Code CLI delegation), not at init.
 *
 * Wire into the Hermes config (mcp_servers):
 *   prism:
 *     command: node
 *     args: [H:/prism/scripts/prism-mcp-for-hermes.mjs]
 *
 * Every tool is a FAIL-SOFT shell-out to a proven PRISM CLI (bounded timeout, returns an MCP
 * tool error on failure, NEVER crashes the stdio transport). Layered design:
 *   L1 prism_search / prism_node_card / prism_blast_radius / prism_vault_search -> system-viz
 *      graph (110K nodes) + Obsidian vault -- token-cheap (reads sidecars, never the 644MB graph).
 *   L2 prism_ask_ollama -> local LLM offload (free, GPU).
 *   L3 prism_run_skill -> `claude.cmd -p "/<skill>"` = the FULL prism dispatcher + 440 skills +
 *      700 hooks + 26-slot fleet surface, on demand (the heavy path; spends Claude tokens).
 *
 * Karpathy: CLASSIFY=transform(shell to mcp); EDGE=cli-missing/nonzero/timeout/empty/injection;
 *   FAILURE=never crash transport, always a tool result; every tool spawns its target binary
 *   DIRECTLY with an argv array (node scripts, and claude.EXE -- NEVER cmd.exe / the .cmd whose
 *   `%*` re-parse is an injection hole), so a query or skill arg can never inject a shell command.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { routeHermesTask } from "./hermes-model-router.mjs";
import {
  resolveEscalationTarget, buildChatBody, buildAnthropicBody, extractAnswer,
} from "./lib/hermes-escalation.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const NODE = process.execPath;
const SYSVIZ = resolve(HERE, "system-viz-query.mjs");
const ASK_OLLAMA = resolve(HERE, "ask-ollama.mjs");
const CLAUDE_CMD = process.env.PRISM_CLAUDE_CMD || "H:/Tools/nodejs/claude.cmd";
// Spawn the REAL claude.exe DIRECTLY -- NEVER `cmd.exe /c claude.cmd`. A .exe takes its argv as a
// clean array with NO shell, so a crafted `args` can never inject a command. The .cmd path forwards
// `%*`, which cmd.exe re-parses (embedded " / & / | / %VAR% escape the -p arg) -- a real command-
// injection hole (scrutiny arm C, proven live). The .cmd runs `<dir>\node_modules\@anthropic-ai\claude-code\bin\claude.exe %*`.
const CLAUDE_EXE = process.env.PRISM_CLAUDE_EXE
  || resolve(dirname(CLAUDE_CMD), "node_modules/@anthropic-ai/claude-code/bin/claude.exe");
const SKILL_MODEL = process.env.PRISM_HERMES_SKILL_MODEL || "claude-opus-4-8"; // NO [1m] suffix; env-overridable so a model-id change needs no code edit
const DEFAULT_TIMEOUT_MS = Number(process.env.PRISM_HERMES_FACADE_TIMEOUT_MS || 45000);
const SKILL_TIMEOUT_MS = Number(process.env.PRISM_HERMES_FACADE_SKILL_TIMEOUT_MS || 300000);
const MAX_CAPTURE_BYTES = 1_500_000;   // hard cap on a single CLI's stdout (kill runaway output)
const MAX_TOOL_TEXT = 24000;           // clamp a tool result so a huge dump can't blow model context
const OLLAMA_MODES = new Set(["viz", "ask", "summarize", "explain", "triage", "rerank"]);
const ESCALATE_TIMEOUT_MS = Number(process.env.PRISM_HERMES_ESCALATE_TIMEOUT_MS || 120000);
const ESCALATE_MAX_TOKENS = Number(process.env.PRISM_HERMES_ESCALATE_MAX_TOKENS || 2048);
// Codex CLI (ChatGPT-subscription frontier lane): spawn `node codex.js exec` DIRECTLY (never the .cmd via
// cmd.exe -> injection). codex.js sits under the same node prefix the bash shim (.claude/bin/codex) resolves.
const CODEX_JS = process.env.PRISM_HERMES_CODEX_JS || resolve(dirname(NODE), "node_modules/@openai/codex/bin/codex.js");
const CODEX_TIMEOUT_MS = Number(process.env.PRISM_HERMES_CODEX_TIMEOUT_MS || 240000); // codex agent startup is slow

// ---- pure helpers (exported, unit-tested) ----------------------------------------------

/** Build the system-viz-query argv (always --json). Pure. sub is the verified subcommand. */
export function buildVizArgs(sub, query, extra = []) {
  return [SYSVIZ, sub, String(query), ...extra, "--json"];
}

/** Build the ask-ollama argv. Pure. viz adds --synth so Hermes gets a synthesized answer. */
export function buildOllamaArgs(mode, input) {
  const m = OLLAMA_MODES.has(mode) ? mode : "viz";
  return m === "viz" ? [ASK_OLLAMA, m, String(input), "--synth"] : [ASK_OLLAMA, m, String(input)];
}

/** Normalize a skill name to a leading-slash slash-command and append args. Pure.
 *  Strips control chars / newlines (defense-in-depth: the value becomes the literal `-p` prompt
 *  arg to claude.exe; a newline could split it). Shell injection is already impossible because we
 *  spawn the .exe directly with an argv array (no cmd.exe) -- this is the second belt. */
export function buildSkillLine(skill, args) {
  const clean = (v) => String(v || "").replace(/[\r\n\x00-\x1f]+/g, " ");
  const s = clean(skill).trim().replace(/^\/+/, "");
  const a = args ? ` ${clean(args).trim()}` : "";
  return `/${s}${a}`;
}

/** Claude Code CLI argv: claude.EXE directly (NOT the .cmd via cmd.exe -> injection), plain model
 *  id (NO `[1m]` suffix). Pure. */
export function buildClaudeArgv(skillLine) {
  return [CLAUDE_EXE, "--dangerously-skip-permissions", "--model", SKILL_MODEL, "-p", skillLine];
}

/** Codex CLI argv: `codex.js exec --sandbox read-only --output-last-message <file> "<prompt>"`. Pure.
 *  read-only sandbox = a safe repo-aware reason/answer escalation (NO file edits); the clean final message
 *  is written to outFile (deterministic extraction, no log-parse). approval_policy=never so it can't block
 *  headless. NULs stripped from the prompt (it is the final argv element; spawn is shell-free so metachars
 *  are literal). Model is NOT forced (-m) -- ChatGPT-account auth picks the account's model. */
export function buildCodexArgv(codexJs, prompt, outFile) {
  const clean = String(prompt || "").replace(/\x00/g, "");
  return [codexJs, "exec", "--sandbox", "read-only", "-c", "approval_policy=never", "--output-last-message", outFile, clean];
}

/** Build the {url, headers, body} for an HTTP escalation target. Pure -- the key is passed in
 *  explicitly (read from env only at the call site, never here) so this fn can be tested without a
 *  real secret and never reads/logs one itself. Three wires:
 *   - anthropic: x-api-key header + anthropic-version; Messages body.
 *   - gemini   : key goes in the URL (?key=) + model in the path (:generateContent) -- NO auth header
 *                (special-cased per scrutiny arm A); contents/parts body.
 *   - openai   : Authorization: Bearer; chat/completions body (NVIDIA + OpenAI share this wire). */
export function buildEscalationRequest(target, prompt, key, { maxTokens = ESCALATE_MAX_TOKENS } = {}) {
  if (target.wire === "anthropic") {
    return {
      url: target.endpoint,
      headers: { "content-type": "application/json", [target.headerName]: key, ...(target.extraHeaders || {}) },
      body: buildAnthropicBody(target.model, prompt, { maxTokens }),
    };
  }
  if (target.wire === "gemini") {
    return {
      url: `${target.endpoint}/${encodeURIComponent(target.model)}:generateContent?key=${encodeURIComponent(key || "")}`,
      headers: { "content-type": "application/json" },
      body: { contents: [{ parts: [{ text: String(prompt) }] }], generationConfig: { maxOutputTokens: maxTokens } },
    };
  }
  // openai-compatible (nvidia + openai): Bearer auth
  return {
    url: target.endpoint,
    headers: { "content-type": "application/json", authorization: `Bearer ${key || ""}` },
    body: buildChatBody(target.model, prompt, { maxTokens }),
  };
}

/** Clamp a tool's text output so a huge CLI dump can't blow the model's context. Pure. */
export function clampText(s, max = MAX_TOOL_TEXT) {
  const t = typeof s === "string" ? s : JSON.stringify(s);
  return t.length > max ? t.slice(0, max) + `\n...[truncated ${t.length - max} chars]` : t;
}

// ---- bounded impure runner -------------------------------------------------------------

/** Run a command, capturing stdout/stderr, bounded. stdin is closed (= `< nul`, so an
 *  interactive CLI gets EOF and never blocks). Never throws -> returns {ok,code,out,err}. */
function runCmd(file, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((res) => {
    let done = false;
    // Spawn the target DIRECTLY (a node binary or claude.exe). We NEVER route through cmd.exe --
    // that would re-parse args (the .cmd `%*` injection hole). args pass as a clean argv array.
    let out = "", err = "";
    let child;
    try {
      child = spawn(file, args, { cwd: REPO_ROOT, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { return res({ ok: false, code: -1, out: "", err: String(e && e.message || e) }); }
    const timer = setTimeout(() => { if (!done) { done = true; try { child.kill("SIGKILL"); } catch { /* */ } res({ ok: false, code: -2, out, err: err + "\n[timeout]" }); } }, timeoutMs);
    child.stdout.on("data", (d) => { out += d; if (out.length > MAX_CAPTURE_BYTES) { try { child.kill(); } catch { /* */ } } });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => { if (done) return; done = true; clearTimeout(timer); res({ ok: false, code: -1, out, err: String(e && e.message || e) }); });
    child.on("close", (code) => { if (done) return; done = true; clearTimeout(timer); res({ ok: code === 0, code, out, err }); });
  });
}

/** Execute an HTTP escalation target with a bounded timeout. Reads the key from env HERE (only), never
 *  logs it. Error strings reference target.endpoint (the base URL, no key) -- NEVER the constructed
 *  gemini URL (which carries ?key=). Never throws -> {ok,code,out,err}. */
async function httpEscalate(target, prompt, { timeoutMs = ESCALATE_TIMEOUT_MS, maxTokens = ESCALATE_MAX_TOKENS, fetchImpl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  if (typeof doFetch !== "function") return { ok: false, code: -1, out: "", err: "fetch unavailable in this runtime" };
  const key = process.env[target.keyEnv];              // read at execution ONLY; never logged
  const req = buildEscalationRequest(target, prompt, key, { maxTokens });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await doFetch(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(req.body), signal: ctrl.signal });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* non-json error body */ }
    if (!r.ok) return { ok: false, code: r.status, out: "", err: `HTTP ${r.status} from ${target.endpoint}: ${text.slice(0, 800)}` };
    const answer = extractAnswer(target.wire, json);
    if (answer) return { ok: true, code: 0, out: answer };
    return { ok: false, code: r.status, out: "", err: `empty answer from ${target.model} (raw: ${text.slice(0, 400)})` };
  } catch (e) {
    return { ok: false, code: -1, out: "", err: `escalation fetch failed (${target.endpoint}): ${String(e && e.message || e)}` };
  } finally { clearTimeout(timer); }
}

export function toolResult(r, label) {
  if (r.ok) return { content: [{ type: "text", text: clampText(r.out || "(no output)") }] };
  const detail = clampText((r.err || r.out || "").trim() || `exit ${r.code}`, 1200);
  return { content: [{ type: "text", text: `[${label}] failed (exit ${r.code}): ${detail}` }], isError: true };
}

// ---- server ----------------------------------------------------------------------------

export function makeServer(deps = {}) {
  const run = deps.run || runCmd; // injectable for tests
  const doHttpEscalate = deps.httpEscalate || httpEscalate; // injectable for tests
  const server = new McpServer({ name: "prism", version: "1.0.0" });

  server.tool(
    "prism_search",
    "Search the PRISM system-viz graph (110K nodes: engines, dispatchers, actions, wiki, memories) + master-index by keyword. Token-cheap (reads sidecars, not the 644MB graph). Use FIRST to find any PRISM asset before acting. Returns ranked JSON hits.",
    { query: z.string().describe("keywords, e.g. 'kienzle cutting force' or 'collision check'") },
    async (a) => toolResult(await run(NODE, buildVizArgs("find", a.query)), "prism_search"),
  );

  server.tool(
    "prism_vault_search",
    "Search ONLY the documented Obsidian vault (wiki + memories, 'brain-backed' nodes) -- PRISM's persistent knowledge. Use to recall prior decisions, tribal knowledge, lessons. Returns ranked JSON hits.",
    { query: z.string().describe("topic to recall from the vault") },
    async (a) => toolResult(await run(NODE, buildVizArgs("find", a.query, ["--brain-only"])), "prism_vault_search"),
  );

  server.tool(
    "prism_node_card",
    "Read a compact NodeCard for a PRISM node id (id/label/layer/status + the wiki/memory docs to read next). ~200 tokens vs reading the 644MB graph. Pair with prism_search: search -> ids -> node_card.",
    { id: z.string().describe("a node id from prism_search, e.g. 'eng.mill' or a dispatcher/action id") },
    async (a) => toolResult(await run(NODE, buildVizArgs("node-card", a.id)), "prism_node_card"),
  );

  server.tool(
    "prism_blast_radius",
    "Upstream/downstream impact of changing a PRISM node (what depends on it / what it depends on). Use before proposing a change so Hermes understands the blast radius. Returns JSON.",
    { id: z.string().describe("the node id to analyze") },
    async (a) => toolResult(await run(NODE, buildVizArgs("blast-radius", a.id)), "prism_blast_radius"),
  );

  server.tool(
    "prism_ask_ollama",
    "Offload a mechanical text task to the LOCAL Ollama model (free, GPU, OUTSIDE Hermes's own loop): viz (graph search+synthesis) | ask (free question) | summarize/explain/triage (a file path). Use for code digest, error triage, cheap questions.",
    {
      mode: z.enum(["viz", "ask", "summarize", "explain", "triage", "rerank"]).describe("the ask-ollama mode"),
      input: z.string().describe("a query (viz/ask/rerank) or a file path (summarize/explain/triage)"),
    },
    async (a) => toolResult(await run(NODE, buildOllamaArgs(a.mode, a.input)), "prism_ask_ollama"),
  );

  server.tool(
    "prism_route_model",
    "Deterministically pick the OPTIMAL local Blackwell model for a task -- the USABLE hybrid router (replaces the black-box model_router/MOA that landed on nemo3 and hung). Returns {tier,model,provider,ctx,reason}. Tiers: fast=gpt-oss:20b (mechanical) | code=qwen2.5-coder:32b | reason=gpt-oss:120b (deep, default) | vision=qwen2.5vl:32b | cloud=NVIDIA >=64K non-reasoning (opt-in only). Route a sub-task to the cheapest model that handles it, then call prism_ask_ollama with that model.",
    {
      task: z.string().describe("the task / sub-task to route to a model tier"),
      allow_cloud: z.boolean().optional().describe("permit the opt-in NVIDIA cloud tier (default false; local-only otherwise)"),
    },
    async (a) => {
      const v = routeHermesTask(a.task, { allowCloud: !!a.allow_cloud });
      return { content: [{ type: "text", text: JSON.stringify(v) }] };
    },
  );

  server.tool(
    "prism_run_skill",
    "Delegate a task to the Claude Code CLI, which has the FULL PRISM surface: all 101 dispatchers (prism_calc/cam/cad/safety/dev/...), 440 skills, 700 hooks, the 26-slot fleet. Heavy path (spends Claude tokens, can take minutes) -- use for real build/analysis/physics tasks beyond Hermes's local reach. Pass a PRISM skill/slash-command name + args (e.g. skill='ask-ollama', args=\"summarize foo.ts\"), or skill='smart' with a free-form task in args.",
    {
      skill: z.string().describe("PRISM slash-command / skill name (without leading slash), e.g. 'master-index', 'dedup', 'smart'"),
      args: z.string().optional().describe("arguments / free-form task passed to the skill"),
    },
    async (a) => {
      if (!existsSync(CLAUDE_EXE)) {
        return { content: [{ type: "text", text: `[prism_run_skill] claude.exe not found at ${CLAUDE_EXE} (set PRISM_CLAUDE_EXE)` }], isError: true };
      }
      const argv = buildClaudeArgv(buildSkillLine(a.skill, a.args)); // [exe, ...flags]
      return toolResult(await run(argv[0], argv.slice(1), { timeoutMs: SKILL_TIMEOUT_MS }), "prism_run_skill");
    },
  );

  server.tool(
    "prism_escalate",
    "Escalate ONE hard task beyond local gpt-oss:120b to a stronger model (OPT-IN -- local stays the default; never Hermes's native model, so this can't hard-fail launch or hang the loop). tier=claude -> Claude Opus 4.8 via your Claude Max SUBSCRIPTION ($0 marginal; best for deep reasoning/orchestration). tier=codex -> GPT-5.x via your ChatGPT SUBSCRIPTION (Codex CLI, $0 API; read-only repo-aware coding answers). tier=nvidia -> a vetted NVIDIA cloud instruct model (needs NVIDIA_API_KEY; cheap burst; model= alias 'default'|'heavy'|'llama4'|'nemotron'). tier=frontier -> a configured frontier API (needs PRISM_HERMES_FRONTIER_PROVIDER=anthropic|openai|gemini + that provider's key in env). One-shot question -> answer text. Use ONLY when a task genuinely exceeds the local model.",
    {
      tier: z.enum(["claude", "codex", "nvidia", "frontier"]).describe("which escalation lane"),
      prompt: z.string().describe("the task / question to send to the stronger model"),
      model: z.string().optional().describe("optional model override / NVIDIA alias (default|heavy|llama4|nemotron)"),
      provider: z.string().optional().describe("frontier provider (anthropic|openai|gemini); default = PRISM_HERMES_FRONTIER_PROVIDER"),
    },
    async (a) => {
      const target = resolveEscalationTarget(a.tier, { model: a.model, provider: a.provider });
      if (target.error) return { content: [{ type: "text", text: `[prism_escalate:${a.tier}] ${target.error}` }], isError: true };
      const prompt = String(a.prompt || "").replace(/\x00/g, ""); // strip only NULs; spawn is shell-free so newlines are safe
      if (!prompt.trim()) return { content: [{ type: "text", text: "[prism_escalate] empty prompt" }], isError: true };
      if (target.backend === "claude-cli") {
        if (!existsSync(CLAUDE_EXE)) {
          return { content: [{ type: "text", text: `[prism_escalate:claude] claude.exe not found at ${CLAUDE_EXE} (set PRISM_CLAUDE_EXE)` }], isError: true };
        }
        // spawn claude.EXE directly (no cmd.exe -> no injection); plain opus id; RAW prompt (not a slash-command)
        const argv = [CLAUDE_EXE, "--dangerously-skip-permissions", "--model", target.model, "-p", prompt];
        return toolResult(await run(argv[0], argv.slice(1), { timeoutMs: SKILL_TIMEOUT_MS }), "prism_escalate:claude");
      }
      if (target.backend === "codex-cli") {
        if (!existsSync(CODEX_JS)) {
          return { content: [{ type: "text", text: `[prism_escalate:codex] codex.js not found at ${CODEX_JS} (npm i -g @openai/codex, or set PRISM_HERMES_CODEX_JS)` }], isError: true };
        }
        // codex exec writes ONLY the final assistant message to a temp file -> clean extraction (no log-parse)
        const outFile = resolve(tmpdir(), `prism-codex-${process.pid}-${Date.now()}.txt`);
        const r = await run(NODE, buildCodexArgv(CODEX_JS, prompt, outFile), { timeoutMs: CODEX_TIMEOUT_MS });
        let answer = "";
        try { answer = readFileSync(outFile, "utf8").trim(); } catch { /* codex may have failed before writing */ }
        try { unlinkSync(outFile); } catch { /* */ }
        if (answer) return { content: [{ type: "text", text: clampText(answer) }] };
        // no clean message -> surface codex's own error/stdout so the failure is VISIBLE (R12), never silent
        return toolResult(r.ok ? { ok: true, out: r.out || "(codex returned no message)" } : r, "prism_escalate:codex");
      }
      // http backend (nvidia / frontier)
      const label = `prism_escalate:${a.tier}${target.provider ? "/" + target.provider : ""}`;
      return toolResult(await doHttpEscalate(target, prompt), label);
    },
  );

  return server;
}

export async function main() {
  const server = makeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { process.stderr.write(`[prism-mcp-for-hermes] fatal: ${String(e && e.stack || e)}\n`); process.exit(1); });
}
