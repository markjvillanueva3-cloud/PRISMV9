#!/usr/bin/env node
/**
 * mcp-streamable-client.mjs -- shared MCP Streamable-HTTP JSON-RPC client
 * (LOCAL-LLM-MS1 / U-LOCAL-GENERATE-CONSUMER, 2026-06-09, slot india).
 *
 * Extracted verbatim from scripts/ollama-prism-bridge.mjs (U-OE-BRIDGE-L2B,
 * slot foxtrot 2026-05-18) so MORE THAN ONE consumer can speak to the live
 * PRISM MCP server without re-implementing the transport. The bridge already
 * imports ask-ollama.mjs, so ask-ollama.mjs CANNOT import the bridge (an ESM
 * cycle); a cycle-free leaf lib that neither side depends back on is the only
 * clean home. Both ollama-prism-bridge.mjs and ask-ollama.mjs now import from
 * here; the bridge re-exports parseMcpResponse + mcpCallStreamable so its
 * existing test imports resolve byte-identically.
 *
 * The MCP request body is a JSON-RPC 2.0 envelope:
 *   { jsonrpc:"2.0", id:<n>, method:"tools/call",
 *     params:{ name:<dispatcher>, arguments:{ action, ...params } } }
 *
 * Dispatcher actions route via the standard `name:<dispatcher>` tool with
 * `arguments.action` matching the dispatcher's action enum and the remaining
 * action params SPREAD alongside `action` (NOT nested under a `params` key).
 *
 * Pure where it can be (parseMcpResponse), fail-loud everywhere (R12): every
 * malformed-body / network / JSON-RPC-error branch names its reason and never
 * throws -- callers get { ok:false, error } and decide.
 */

/** Default MCP endpoint -- matches ollama-prism-bridge.mjs exactly (PRISM_MCP_URL, trailing slash stripped). */
export const MCP_URL = (process.env.PRISM_MCP_URL || "http://127.0.0.1:3100/mcp").replace(/\/$/, "");
/** Per-call MCP timeout. Physics/query actions are typically <100ms warm; cold-init can be slower. */
export const MCP_TIMEOUT_MS = 8000;

/**
 * Parse the MCP server's Streamable HTTP response body.
 *
 * The transport may answer with EITHER:
 *   (a) `application/json` -- a single JSON-RPC envelope, OR
 *   (b) `text/event-stream` -- one or more `data:` lines, each a JSON-RPC
 *       envelope; the meaningful one for a tools/call is the response carrying
 *       our id (or the first non-notification envelope).
 *
 * Pure. Returns { ok:true, envelope } | { ok:false, error }. R12 fail-loud:
 * every malformed-body branch names its reason.
 *
 * @param {string} contentType  HTTP Content-Type header value
 * @param {string} body         the raw response body string
 * @returns {{ok:true, envelope:object} | {ok:false, error:string}}
 */
export function parseMcpResponse(contentType, body) {
  const ct = String(contentType || "").toLowerCase();
  const text = String(body || "");
  if (!text.trim()) return { ok: false, error: "MCP response body is empty" };
  if (ct.includes("application/json")) {
    try {
      const env = JSON.parse(text);
      return { ok: true, envelope: env };
    } catch (e) {
      return { ok: false, error: `MCP response is not valid JSON: ${e && e.message ? e.message : e}` };
    }
  }
  if (ct.includes("text/event-stream")) {
    // SSE: lines starting with `data: ` carry JSON-RPC envelopes; we want the
    // first non-notification (id present) one.
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const env = JSON.parse(payload);
        if (env && (env.id !== undefined || env.error || env.result)) {
          return { ok: true, envelope: env };
        }
      } catch {
        // skip -- try next data line
      }
    }
    return { ok: false, error: "MCP SSE stream had no JSON-RPC response envelope" };
  }
  // Unknown content-type -- try JSON as a tolerant fallback.
  try {
    return { ok: true, envelope: JSON.parse(text) };
  } catch {
    return { ok: false, error: `MCP response has unsupported Content-Type '${ct}' and is not JSON` };
  }
}

/**
 * Call `tools/call` on the PRISM MCP server. Returns { ok:true, result } where
 * `result` is the MCP tool-call result (typically `{ content: [{ type:'text',
 * text:'...' }], structuredContent?, isError? }`), or { ok:false, error }.
 *
 * Impure (network I/O). All side effects flow through the injected `fetchImpl`
 * -- tests pass a fake fetch; real callers use the global `fetch`.
 *
 * @param {object} opts
 * @param {string} opts.dispatcher     e.g. "prism_calc"
 * @param {string} opts.action         e.g. "cutting_force"
 * @param {object} [opts.params]       action params (spread into arguments)
 * @param {string} [opts.url]          MCP endpoint (default MCP_URL)
 * @param {number} [opts.timeoutMs]    per-call timeout (default MCP_TIMEOUT_MS)
 * @param {Function} [opts.fetchImpl]  injected fetch (default global fetch)
 * @returns {Promise<{ok:true, result:any} | {ok:false, error:string}>}
 */
export async function mcpCallStreamable({ dispatcher, action, params = {}, url = MCP_URL, timeoutMs = MCP_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  if (typeof fetchImpl !== "function") return { ok: false, error: "mcpCallStreamable: no fetch impl available" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const id = Math.floor(Math.random() * 1e9) + 1;
  const body = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name: dispatcher,
      arguments: { action, ...params },
    },
  };
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { ok: false, error: `MCP HTTP ${res.status}: ${String(text).slice(0, 200)}` };
    }
    const parsed = parseMcpResponse(res.headers && res.headers.get ? res.headers.get("content-type") : "", text);
    if (!parsed.ok) return parsed;
    const env = parsed.envelope;
    if (env && env.error) {
      const msg = env.error.message || JSON.stringify(env.error).slice(0, 200);
      return { ok: false, error: `MCP JSON-RPC error: ${msg}` };
    }
    if (!env || env.result === undefined) {
      return { ok: false, error: "MCP response has no 'result' field" };
    }
    return { ok: true, result: env.result };
  } catch (e) {
    const why =
      e && e.name === "AbortError"
        ? `MCP /mcp timed out after ${timeoutMs}ms (server may be unreachable on ${url})`
        : `MCP unreachable at ${url}: ${e && e.message ? e.message : e}`;
    return { ok: false, error: why };
  } finally {
    clearTimeout(timer);
  }
}
