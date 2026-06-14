#!/usr/bin/env node
/**
 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
 *
 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
 * script lets PRISM (Claude via Bash, or any engine) reach that capability with
 * a compact request/response, the same way ask-ollama.mjs reaches local Ollama.
 *
 * Why a bridge and not a dispatcher: ask-ollama.mjs is the canonical
 * Bash-invoked offload surface; this clones that pattern (R11) so the substrate
 * router / smart executor can route a task to Hermes the same way it routes to
 * Ollama. Token economy (the operator's standing directive): Hermes upstreams
 * are PAID (grok), so on ANY Hermes failure this degrades to free local Ollama
 * via ask-ollama.mjs (loud about why -- R12), unless --no-fallback.
 *
 * Modes (mirror ask-ollama text modes):
 *   ask <question>     general question
 *   summarize <file>   compact digest of a file ("-" = stdin)
 *   explain <file>     plain-language explanation of code ("-" = stdin)
 *   triage <file>      diagnose a build/test/error dump ("-" = stdin)
 *   classify <text>    one-line classification ("-" = stdin)
 *
 * Flags:
 *   --model <id>       upstream model id (default: first from /v1/models)
 *   --json             machine-readable output
 *   --timeout <ms>     request timeout (default 120000)
 *   --max-tokens <n>   completion cap (default 1024)
 *   --no-fallback      do NOT degrade to Ollama on Hermes failure (fail loud)
 *   --url <base>       proxy base url (default env PRISM_HERMES_PROXY_URL or
 *                      http://127.0.0.1:8645/v1)
 *
 * Env:
 *   PRISM_HERMES_PROXY_URL   proxy base (default http://127.0.0.1:8645/v1)
 *   PRISM_HERMES_TOKEN       bearer token (default "prism"; proxy ignores value
 *                            and attaches the real OAuth credential)
 *   PRISM_HERMES_MODEL       default model id when --model is absent
 *
 * Exit codes:
 *   0  ok (answered by Hermes, OR by the Ollama fallback)
 *   2  usage error / missing input file
 *   3  Hermes failed AND fallback disabled/unavailable (fail loud)
 *
 * Design: pure functions (exported, unit-tested) + a thin impure shell.
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const DEFAULT_URL = process.env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
const DEFAULT_TOKEN = process.env.PRISM_HERMES_TOKEN || "prism";

const MODES = new Set(["ask", "summarize", "explain", "triage", "classify"]);

/**
 * System prompt per mode. Kept terse: these route mechanical text work to a
 * remote model, so the instruction must bound the output shape.
 */
export function systemPromptFor(mode) {
  switch (mode) {
    case "summarize":
      return "You are a concise technical summarizer. Return a compact digest only -- no preamble, no restating the prompt.";
    case "explain":
      return "You are a senior engineer. Explain the given code in plain language: what it does, key control flow, and any risk. Be concise.";
    case "triage":
      return "You are a build/test triage assistant. Given an error or log dump, identify the most likely root cause and the single highest-value fix. Be specific and concise.";
    case "classify":
      return "You are a classifier. Return a single short label or one-line classification only -- no explanation.";
    case "ask":
    default:
      return "You are a helpful, concise assistant. Answer directly.";
  }
}

/**
 * Build the OpenAI /v1/chat/completions request body. Pure -- no I/O.
 */
export function buildChatBody({ mode, input, model, maxTokens }) {
  const sys = systemPromptFor(mode);
  return {
    model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: String(input ?? "") },
    ],
    max_tokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 1024,
    stream: false,
  };
}

/**
 * Extract assistant text from an OpenAI-compatible response object.
 * Returns { ok, content, error }. Handles the upstream error envelope, the
 * refusal stop_reason, and an empty/malformed choices array (fail-loud).
 */
export function parseChatResponse(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, error: "empty or non-object response" };
  }
  if (json.error) {
    const msg = typeof json.error === "string" ? json.error : (json.error.message || JSON.stringify(json.error));
    return { ok: false, error: `upstream error: ${msg}` };
  }
  const choice = Array.isArray(json.choices) ? json.choices[0] : null;
  if (!choice) return { ok: false, error: "no choices in response" };
  if (choice.finish_reason === "refusal" || choice.message?.refusal) {
    return { ok: false, error: `refused: ${choice.message?.refusal || "policy refusal"}` };
  }
  const content = choice.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    return { ok: false, error: "choice has no text content" };
  }
  return { ok: true, content };
}

/**
 * Classify a failure to decide whether degrading to Ollama is appropriate.
 * Connection/timeout/5xx => transient/infra => fallback is sensible.
 * 4xx (auth/billing/bad-request) => a real API condition => still fallback for
 * usefulness (operator wants an answer) but the reason is surfaced loudly.
 * Pure -- takes a {kind,status} descriptor, returns a boolean.
 */
export function shouldFallback({ kind, status } = {}) {
  if (kind === "network" || kind === "timeout") return true;
  if (kind === "http") return true; // any HTTP error -> still try free local
  return true;
}

/**
 * Parse argv into { mode, input(raw), model, json, timeout, maxTokens,
 * fallback, url, error }. Pure (no file reads -- input resolution is the shell).
 */
export function parseArgs(argv) {
  const out = {
    mode: null, rawInput: null, model: process.env.PRISM_HERMES_MODEL || null,
    json: false, timeout: 120000, maxTokens: 1024, fallback: true, url: DEFAULT_URL,
    error: null,
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--no-fallback") out.fallback = false;
    else if (a === "--model") out.model = argv[++i] ?? null;
    else if (a === "--url") out.url = argv[++i] ?? DEFAULT_URL;
    else if (a === "--timeout") out.timeout = parseInt(argv[++i] ?? "120000", 10) || 120000;
    else if (a === "--max-tokens") out.maxTokens = parseInt(argv[++i] ?? "1024", 10) || 1024;
    else if (a.startsWith("--")) { out.error = `unknown flag: ${a}`; return out; }
    else positional.push(a);
  }
  out.mode = positional.shift() || null;
  out.rawInput = positional.join(" ");
  if (!out.mode || !MODES.has(out.mode)) {
    out.error = `mode must be one of: ${[...MODES].join(", ")}`;
  }
  return out;
}

/** Resolve mode input: file path, "-" for stdin, or literal text. Impure (reads). */
function resolveInput(mode, rawInput) {
  // ask/classify take literal text; summarize/explain/triage take a file or "-".
  if (mode === "ask" || mode === "classify") {
    return { ok: true, text: rawInput };
  }
  if (rawInput === "-") {
    try { return { ok: true, text: readFileSync(0, "utf-8") }; }
    catch (e) { return { ok: false, error: `stdin read failed: ${e.message}` }; }
  }
  const p = isAbsolute(rawInput) ? rawInput : resolve(process.cwd(), rawInput);
  if (!existsSync(p)) {
    // Not a file -> treat the words as literal text (lenient, like a question).
    return { ok: true, text: rawInput };
  }
  try { return { ok: true, text: readFileSync(p, "utf-8") }; }
  catch (e) { return { ok: false, error: `file read failed: ${e.message}` }; }
}

/** Fetch the first available model id from the proxy's /v1/models. Impure. */
async function resolveModel(url, token, timeout) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.min(timeout, 20000));
  try {
    const r = await fetch(`${url}/models`, {
      headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const j = await r.json();
    const first = Array.isArray(j?.data) ? j.data.find(m => m?.id) : null;
    return first?.id || null;
  } catch { return null; }
  finally { clearTimeout(t); }
}

/** POST a chat completion to the Hermes proxy. Returns {ok, content|error, fail}. Impure. */
async function callHermes({ url, token, body, timeout }) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let json = null;
    try { json = await r.json(); } catch { /* non-json body */ }
    if (!r.ok) {
      const parsed = parseChatResponse(json);
      const reason = parsed.error || `HTTP ${r.status}`;
      return { ok: false, error: reason, fail: { kind: "http", status: r.status } };
    }
    return parseChatResponse(json);
  } catch (e) {
    const kind = e.name === "AbortError" ? "timeout" : "network";
    return { ok: false, error: `${kind}: ${e.message}`, fail: { kind } };
  } finally { clearTimeout(t); }
}

/** Degrade to free local Ollama via ask-ollama.mjs. Impure. */
async function fallbackToOllama({ mode, text, model, timeout }) {
  // ask-ollama text modes: ask/summarize/explain/triage. classify -> ask.
  const olMode = mode === "classify" ? "ask" : mode;
  const args = [resolve(REPO_ROOT, "scripts/ask-ollama.mjs"), olMode];
  if (olMode === "ask") args.push(text);
  else args.push("-"); // pass via stdin for file-modes
  args.push("--timeout", String(timeout));
  try {
    const { stdout } = await execFileAsync(process.execPath, args, {
      timeout: timeout + 5000,
      input: olMode === "ask" ? undefined : text,
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf-8",
    });
    return { ok: true, content: stdout.trim() };
  } catch (e) {
    return { ok: false, error: `ollama fallback failed: ${e.message?.slice(0, 300)}` };
  }
}

function emit(json, obj) {
  if (json) process.stdout.write(JSON.stringify(obj) + "\n");
  else process.stdout.write((obj.content ?? obj.error ?? "") + "\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    process.stderr.write(`[ask-hermes] ${args.error}\n`);
    process.stderr.write("usage: ask-hermes.mjs <ask|summarize|explain|triage|classify> <input> [--model id] [--json] [--no-fallback] [--url base] [--timeout ms] [--max-tokens n]\n");
    process.exit(2);
  }
  const inp = resolveInput(args.mode, args.rawInput);
  if (!inp.ok) { process.stderr.write(`[ask-hermes] ${inp.error}\n`); process.exit(2); }
  if (!inp.text || !inp.text.trim()) { process.stderr.write("[ask-hermes] empty input\n"); process.exit(2); }

  let model = args.model || await resolveModel(args.url, DEFAULT_TOKEN, args.timeout);
  let hermes = { ok: false, error: "no model resolved", fail: { kind: "network" } };
  if (model) {
    const body = buildChatBody({ mode: args.mode, input: inp.text, model, maxTokens: args.maxTokens });
    hermes = await callHermes({ url: args.url, token: DEFAULT_TOKEN, body, timeout: args.timeout });
  }

  if (hermes.ok) {
    emit(args.json, { source: "hermes", model, content: hermes.content });
    process.exit(0);
  }

  // Hermes failed.
  process.stderr.write(`[ask-hermes] Hermes proxy failed: ${hermes.error}\n`);
  if (!args.fallback || !shouldFallback(hermes.fail)) {
    if (args.json) emit(true, { source: "hermes", ok: false, error: hermes.error });
    process.exit(3);
  }
  process.stderr.write("[ask-hermes] degrading to free local Ollama (token economy; --no-fallback to disable)\n");
  const ol = await fallbackToOllama({ mode: args.mode, text: inp.text, model: args.model, timeout: args.timeout });
  if (ol.ok) {
    emit(args.json, { source: "ollama-fallback", hermesError: hermes.error, content: ol.content });
    process.exit(0);
  }
  process.stderr.write(`[ask-hermes] ${ol.error}\n`);
  if (args.json) emit(true, { source: "none", ok: false, hermesError: hermes.error, ollamaError: ol.error });
  process.exit(3);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/ask-hermes.mjs");
if (_invokedDirectly) {
  main().catch((e) => {
    process.stderr.write(`[ask-hermes] unexpected: ${e.message}\n`);
    process.exit(3);
  });
}
