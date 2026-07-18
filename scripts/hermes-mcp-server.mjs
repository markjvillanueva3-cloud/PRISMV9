#!/usr/bin/env node
/**
 * hermes-mcp-server.mjs -- standalone MCP stdio server exposing the PRISM Hermes proxy
 * (xAI Grok via OAuth, http://127.0.0.1:8645/v1, OpenAI-compatible) as first-class MCP tools.
 *
 * #2 of the HERMES -> Claude-Code wiring ladder (HERMES-CLAUDE-CODE-WIRING-2026-06-23):
 *   #1 prism_hermes (in the prism MCP server) drives the Hermes CLI (status/run/cron) -- it does
 *      NOT expose the :8645 CHAT lane. This server fills that gap: a dedicated `hermes` MCP tool
 *      that ASKS Hermes (Grok) as an MCP call, decoupled from the heavy prism :3100 stack -- it
 *      needs ONLY the :8645 proxy (which itself falls back to Ollama if the managed model is down).
 *
 * Wire into the app's MCP config (claude_desktop_config.json / .mcp.json):
 *   "hermes": { "type": "stdio", "command": "node", "args": ["H:/prism/scripts/hermes-mcp-server.mjs"] }
 *
 * Fail-soft: a proxy-down / non-200 call returns an MCP tool error (isError:true), NEVER crashes
 * the stdio transport. Env: PRISM_HERMES_PROXY_URL (default http://127.0.0.1:8645/v1),
 *   PRISM_HERMES_MODEL / PRISM_HERMES_FALLBACK_MODEL (model id when /v1/models is empty),
 *   PRISM_HERMES_MCP_TIMEOUT_MS (default 120000).
 *
 * Karpathy: CLASSIFY=transform(http to mcp); EDGE CASES=proxy-down, non-200, empty-models,
 *   timeout, malformed-json; FAILURE MODES=never crash transport, always return a tool result.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { pathToFileURL } from "node:url";
// GROK-HIGHEST-CAPABILITY (operator /goal 2026-06-26): when /v1/models lists several ids,
// resolve the MOST capable grok, not the first. Single source of truth (shared with ask-hermes).
// Lane-aware served-model primitives live in the SAME lib (single home; re-exported below for the test).
import { pickHighestCapabilityGrok, isGrokId, isNonChatModel, pickServedChatModel } from "./lib/grok-capability-rank.mjs";
export { isGrokId, isNonChatModel, pickServedChatModel };

const DEFAULT_TIMEOUT_MS = 120000;

/** Resolve the proxy base url (.../v1) from env, trimming a trailing slash. Pure. */
export function resolveBase(env = process.env) {
  const raw = env.PRISM_HERMES_PROXY_URL || "http://127.0.0.1:8645/v1";
  return raw.replace(/\/+$/, "");
}

/** The /health endpoint lives at the proxy ROOT, not under /v1. Pure. */
export function healthUrl(base = resolveBase()) {
  return base.replace(/\/v1$/, "") + "/health";
}

/** Bearer auth headers for the upstream. Pure. The local :8645 OAuth proxy IGNORES the bearer
 *  (it attaches the user's real OAuth credential), so sending one is harmless. But when
 *  PRISM_HERMES_PROXY_URL is repointed at a DIRECT OpenAI-compatible cloud lane (NVIDIA
 *  build.nvidia.com -- the working "stronger-than-Ollama" lane after xAI OAuth died), the
 *  endpoint REQUIRES the key as the bearer. Reads PRISM_HERMES_TOKEN, then NVIDIA_API_KEY
 *  (already in the fleet env), so ONE server works against the local proxy AND the cloud lane
 *  with no key duplication. Returns {} when neither is set (back-compat with the proxy default). */
export function authHeaders(env = process.env) {
  const tok = env.PRISM_HERMES_TOKEN || env.NVIDIA_API_KEY || "";
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

/** Resolve the fallback model id (used when /v1/models lists nothing). Pure.
 *  PRISM_HERMES_PREFERRED_MODEL is the operator's "grok highest capability" pin -- it ranks
 *  above the generic FALLBACK but below an explicit per-call PRISM_HERMES_MODEL. */
export function fallbackModel(env = process.env) {
  return env.PRISM_HERMES_MODEL || env.PRISM_HERMES_PREFERRED_MODEL || env.PRISM_HERMES_FALLBACK_MODEL || "default";
}

/** Build the OpenAI /v1/chat/completions request body. Pure -- no I/O. */
export function buildChatBody({ prompt, model, system }) {
  const messages = [];
  if (system && String(system).trim()) messages.push({ role: "system", content: String(system) });
  messages.push({ role: "user", content: String(prompt) });
  return { model, messages, stream: false };
}

/** Extract the assistant text from an OpenAI-compatible chat response. Pure. Defensive:
 *  a proxy that returns a non-standard shape must not throw -> fall back to a JSON dump. */
export function extractAnswer(json) {
  const c = json && json.choices && json.choices[0];
  const txt = c && c.message && c.message.content;
  if (typeof txt === "string" && txt.length) return txt;
  // some proxies use {text} on the choice -- try that before giving up
  if (c && typeof c.text === "string" && c.text.length) return c.text;
  return typeof json === "string" ? json : JSON.stringify(json);
}

/** One fetch with a hard timeout; returns {ok,status,body} where body is parsed JSON or raw text.
 *  Never throws on a non-200 -- only on network/abort, which callers catch. */
async function httpJson(url, opts, timeoutMs, fetchImpl) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetchImpl(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: r.ok, status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

/** Resolve the model id to send. Impure (`deps.env` overridable for tests). Priority:
 *   1. explicit per-call arg.
 *   2. PRISM_HERMES_PREFERRED_MODEL operator pin.
 *   3. lane-aware default from /v1/models:
 *        - GROK lane (list serves >=1 grok id): highest-capability grok (operator 2026-06-26).
 *        - NON-grok lane (NVIDIA cloud etc.): the configured SERVED fallback, else the first served
 *          chat-capable id -- NEVER the blind first-listed id, which 404s when /v1/models leads with a
 *          non-chat model (embed/guard/vision). This is the fleet-wide no-model-404 fix.
 *   4. configured fallback (empty / unreachable /v1/models).
 */
export async function resolveModel(explicit, deps) {
  if (explicit && String(explicit).trim()) return String(explicit);
  const preferred = ((deps && deps.env) || process.env).PRISM_HERMES_PREFERRED_MODEL;
  if (preferred && String(preferred).trim()) return String(preferred);
  try {
    const { ok, body } = await httpJson(`${deps.base}/models`, { headers: authHeaders() }, 8000, deps.fetchImpl);
    if (ok && body && Array.isArray(body.data) && body.data.length) {
      const ids = body.data.map(m => m && m.id).filter(Boolean);
      if (ids.some(isGrokId)) {
        const best = pickHighestCapabilityGrok(ids); // grok lane: highest-capability grok
        if (best) return best;
      } else {
        return pickServedChatModel(ids, deps.fallback); // non-grok lane: served configured model, never blind first-listed
      }
    }
  } catch { /* fall through to configured fallback */ }
  return deps.fallback;
}

/** TOOL: hermes_ask -- ask Hermes (Grok) via the :8645 OpenAI-compatible chat lane. */
export async function hermesAsk(args, deps) {
  const model = await resolveModel(args.model, deps);
  let res;
  try {
    res = await httpJson(`${deps.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(buildChatBody({ prompt: args.prompt, model, system: args.system })),
    }, deps.timeoutMs, deps.fetchImpl);
  } catch (e) {
    return { ok: false, text: `[hermes] proxy unreachable at ${deps.base} -- is the Hermes proxy (:8645) up? (${String(e && e.message || e)})` };
  }
  if (!res.ok) {
    const detail = typeof res.body === "string" ? res.body.slice(0, 500) : JSON.stringify(res.body).slice(0, 500);
    return { ok: false, text: `[hermes] proxy error ${res.status}: ${detail}` };
  }
  return { ok: true, text: extractAnswer(res.body), model };
}

/** TOOL: hermes_status -- proxy health + auth (the :8645 /health endpoint). */
export async function hermesStatus(deps) {
  // The local :8645 proxy exposes /health (with upstream OAuth auth state). A DIRECT
  // OpenAI-compatible cloud lane (NVIDIA) has NO /health -> a /health probe would 404 and
  // falsely report the lane DOWN, degrading the fleet to Ollama even though chat works. So:
  // try /health first (keeps the proxy's richer body), then fall back to an authed /models
  // probe -- a 200 there means the lane can actually serve chat (authHeaders attaches the key).
  try {
    const h = await httpJson(deps.health, {}, 6000, deps.fetchImpl);
    if (h.ok) return { ok: true, text: JSON.stringify({ up: true, httpStatus: h.status, ...(h.body && typeof h.body === "object" ? h.body : { body: h.body }) }) };
  } catch { /* health unavailable (cloud lane) -> models probe below */ }
  try {
    const m = await httpJson(`${deps.base}/models`, { headers: authHeaders() }, 6000, deps.fetchImpl);
    return { ok: m.ok, text: JSON.stringify({ up: m.ok, httpStatus: m.status, via: "models-probe", authenticated: m.ok, base: deps.base }) };
  } catch (e) {
    return { ok: false, text: JSON.stringify({ up: false, error: String(e && e.message || e), base: deps.base }) };
  }
}

/** TOOL: hermes_models -- list models the proxy currently serves. */
export async function hermesModels(deps) {
  try {
    const { ok, status, body } = await httpJson(`${deps.base}/models`, { headers: authHeaders() }, 8000, deps.fetchImpl);
    const ids = ok && body && Array.isArray(body.data) ? body.data.map((m) => m && m.id).filter(Boolean) : [];
    return { ok, text: JSON.stringify({ httpStatus: status, models: ids, fallback: deps.fallback }) };
  } catch (e) {
    return { ok: false, text: JSON.stringify({ error: String(e && e.message || e), fallback: deps.fallback }) };
  }
}

/** Build the McpServer with the 3 hermes tools wired. deps is injectable for tests. */
export function makeServer(deps = {}) {
  const base = deps.base || resolveBase();
  const resolved = {
    base,
    health: deps.health || healthUrl(base),
    fallback: deps.fallback || fallbackModel(),
    timeoutMs: deps.timeoutMs || Number(process.env.PRISM_HERMES_MCP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    fetchImpl: deps.fetchImpl || ((...a) => fetch(...a)),
  };
  const server = new McpServer({ name: "hermes", version: "1.0.0" });

  server.tool(
    "hermes_ask",
    "Ask Hermes (xAI Grok via OAuth -- the stronger-than-Ollama managed lane, free, runs OUTSIDE the Claude context window). Use for a text question/instruction that wants a capable model but should not spend Claude tokens. Returns the model's text answer.",
    {
      prompt: z.string().describe("the question or instruction to send to Hermes"),
      model: z.string().optional().describe("override the upstream model id (default: highest-capability grok if the lane serves grok, else the configured served model)"),
      system: z.string().optional().describe("optional system prompt"),
    },
    async (args) => {
      const r = await hermesAsk(args, resolved);
      return { content: [{ type: "text", text: r.text }], ...(r.ok ? {} : { isError: true }) };
    },
  );

  server.tool(
    "hermes_status",
    "Check the Hermes proxy (:8645) health + upstream auth. Returns {up, httpStatus, ...proxy health}.",
    {},
    async () => {
      const r = await hermesStatus(resolved);
      return { content: [{ type: "text", text: r.text }], ...(r.ok ? {} : { isError: true }) };
    },
  );

  server.tool(
    "hermes_models",
    "List the models the Hermes proxy currently serves (and the configured fallback).",
    {},
    async () => {
      const r = await hermesModels(resolved);
      return { content: [{ type: "text", text: r.text }], ...(r.ok ? {} : { isError: true }) };
    },
  );

  return server;
}

/** Entry point -- only when run directly (never on import, so tests stay hermetic). */
export async function main() {
  const server = makeServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    process.stderr.write(`[hermes-mcp-server] fatal: ${String(e && e.stack || e)}\n`);
    process.exit(1);
  });
}
