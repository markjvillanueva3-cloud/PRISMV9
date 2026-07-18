/**
 * dispatcher-envelope.ts -- shared peel for the prism_business slimResponse envelope.
 *
 * prism_business returns a BARE { type:"text", text:"<json>" } (NOT wrapped in the
 * standard MCP content[] array), so callTool's `result.content?.[0]?.text` peel
 * (index.ts) MISSES it and hands the route the raw envelope. A route that then
 * sends it verbatim (res.json(result) / res.json({ result })) makes the FE read
 * { type, text } instead of the real payload -> a permanently-empty dead panel
 * (the recurring class -- see reference_hotel_rfq_assign_and_envelope).
 *
 * This is the SINGLE shared implementation. Previously each route file
 * (erp.ts, business.ts) carried its own private clone; new consumers import THIS
 * (R8 reuse / R15 build-once). A dispatcher FAILURE that already arrives as a
 * parsed { success:false } / { error } object is not a { type,text } envelope and
 * passes through unchanged, so error-detection downstream still works.
 */

/**
 * Peel a { type:"text", text } slimResponse to its inner JSON. Any other shape
 * (already-parsed object, bare array, primitive) is returned unchanged. On a
 * JSON.parse failure the raw envelope is handed back (a malformed dispatcher
 * payload is surfaced, never silently swallowed -- R12).
 */
export function unwrapDispatcherEnvelope<T = unknown>(result: unknown): T {
  if (
    result &&
    typeof result === "object" &&
    (result as { type?: unknown }).type === "text" &&
    typeof (result as { text?: unknown }).text === "string"
  ) {
    try {
      return JSON.parse((result as { text: string }).text) as T;
    } catch {
      return result as T; // malformed inner JSON -> surface the raw envelope
    }
  }
  return result as T;
}

/**
 * True when a (post-peel) dispatcher result represents a FAILURE. Covers both shapes a
 * failure takes by the time it reaches a route (callTool has parsed the MCP text payload):
 *   1. the dispatcherError envelope `{ success:false, error, details? }` (engine THREW), and
 *   2. the bare `{ error }` emitted by callTool for an unknown tool / top-level catch.
 * A success is `{ success:true, data }` or a bare payload (array/object) -- neither matches.
 * Shared home for the route-local clones in business.ts (P2: migrate that file's copy here).
 */
export function isDispatcherError(result: unknown): result is { error?: unknown; success?: unknown } {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return false;
  const r = result as Record<string, unknown>;
  if (r.success === false) return true; // dispatcherError failure envelope
  return "error" in r && !("data" in r) && !("success" in r); // bare { error }
}

/** Extract a safe, stack-free error message from a failure result (never echo details/stack). */
export function dispatcherErrorMessage(result: { error?: unknown }, fallback = "dispatch failed"): string {
  return typeof result.error === "string" && result.error.trim().length > 0 ? result.error : fallback;
}
