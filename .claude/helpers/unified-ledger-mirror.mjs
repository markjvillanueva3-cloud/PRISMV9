#!/usr/bin/env node
/**
 * unified-ledger-mirror.mjs — shared helper for error-capture hooks
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02.
 *
 * Mirrors a captured error into UNIFIED_ERROR_LEDGER via the
 * `prism_guard:error_ledger_append` dispatcher action. Hooks call
 * `mirrorToUnifiedLedger({ source, tool, errorClass, message, context })`
 * once per capture; the helper handles MCP unreachable / HTTP non-2xx /
 * malformed inner JSON without throwing — silence is success when MCP
 * is down, so the legacy local write remains the durability fallback.
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P2-U02
 */

const REQUEST_TIMEOUT_MS = 4_000;
function mcpUrl() { return process.env.MCP_HTTP_URL ?? "http://127.0.0.1:3100/mcp"; }

/**
 * @param {{ source: "hook_block"|"pattern_memory"|"recovery"|"session"|"learner", tool?: string, errorClass?: string, message?: string, context?: Record<string, unknown>, ts?: string, id?: string }} input
 * @returns {Promise<{ ok: boolean, deduped?: boolean, error?: string }>}
 */
export async function mirrorToUnifiedLedger(input) {
  if (!input || typeof input !== "object" || !input.source) {
    return { ok: false, error: "missing-source" };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(mcpUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "prism_guard",
          arguments: {
            action: "error_ledger_append",
            params: {
              source: input.source,
              tool: input.tool,
              errorClass: input.errorClass,
              message: input.message,
              context: input.context,
              ts: input.ts,
              id: input.id,
            },
          },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const body = await res.json();
    const inner = body?.result?.content?.[0]?.text ?? "";
    try {
      const parsed = JSON.parse(inner);
      return { ok: parsed?.ok === true, deduped: parsed?.deduped === true, error: parsed?.error };
    } catch {
      return { ok: false, error: "bad-inner-json" };
    }
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/** Fire-and-forget wrapper — never blocks, never throws. */
export function mirrorToUnifiedLedgerAsync(input) {
  mirrorToUnifiedLedger(input).catch(() => { /* swallow */ });
}
