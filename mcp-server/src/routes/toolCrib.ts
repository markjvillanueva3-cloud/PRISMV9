/**
 * PRISM MCP Server -- Tool Crib REST route (QUEBEC / U-TOOLCRIB-ROUTE)
 *
 *   GET  /api/v1/tool-crib/inventory                                                -> prism_calc:tool_crib_inventory
 *   GET  /api/v1/tool-crib/reorder                                                  -> prism_calc:tool_crib_reorder
 *   POST /api/v1/tool-crib/checkout  { tool_id, operator_id, machine_id, job_id }   -> prism_calc:tool_crib_checkout
 *   POST /api/v1/tool-crib/checkin   { tool_id, operator_id, usage_min, condition } -> prism_calc:tool_crib_checkin
 *
 * Why this exists. `ToolCribEngine` (checkout / checkin / inventoryReport / reorderRecommendations)
 * is wired into `calcDispatcher` as `tool_crib_*`, but had NO REST surface -- so the web client
 * (`web/src/api/toolCrib.ts`, consumed by the Kienzle Tool Crib page) could not reach it. This is the
 * calc-domain sibling of `createSfcRouter`: same `callTool("prism_calc", action, params)` call and the
 * same `{ result }` envelope as the proven sfc cycle-time route, plus `business.ts`'s fail-loud mapping
 * (a dispatcher/transport `{ error }` -> HTTP 400/500, never a 200 hiding an error; R12).
 *
 * IMPORTANT semantic difference from `business.ts`. The business route treats `success === false` as
 * an error envelope. The tool-crib ENGINE does NOT: a checkout that is denied (out of stock) returns
 * `{ success: false, record: null, message, remaining_available }` -- a VALID 200 result the UI renders
 * (it shows `message`), with NO `error` field. So HTTP-error gating here is on a real `error` field
 * ONLY; a business-level `success:false` denial passes through as 200.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

const CALC_TOOL = "prism_calc";

/** Safe message extraction from an unknown thrown value. */
function messageOf(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

/**
 * True when a `callTool` result is a DISPATCHER/TRANSPORT failure (vs a real engine payload).
 * `callTool` returns `{ error }` (HTTP-200-style) on dispatcher failure instead of throwing, and the
 * dispatcherError envelope `{ success: false, error, details }` when an engine throws -- both carry an
 * `error` field. A tool-crib business denial `{ success: false, record, message }` has NO `error` field
 * and is therefore NOT flagged here (it is a valid result the page renders). A success engine payload
 * (InventoryReport, ToolCribCheckout with `success:true`, etc.) has no `error` field either.
 * @param result parsed callTool payload
 * @returns true iff the payload represents a dispatcher/transport error
 */
export function isToolCribError(result: unknown): result is { error?: unknown } {
  if (typeof result !== "object" || result === null || Array.isArray(result)) return false;
  const r = result as Record<string, unknown>;
  return "error" in r && r.error != null && r.error !== "";
}

/**
 * Stack-free message from a failure result (never echo dispatcher details/stack to the browser).
 * @param result a failure result carrying an `error`
 * @returns a clean human-readable message
 */
export function toolCribErrorMessage(result: { error?: unknown }): string {
  return typeof result.error === "string" && result.error.trim().length > 0
    ? result.error
    : "tool crib dispatch failed";
}

/**
 * Pick ONLY the checkout fields `ToolCribEngine.checkout(tool_id, operator_id, machine_id, job_id)`
 * reads, with safe defaults. Extra body fields are dropped so the dispatcher schema is not surprised.
 * @param body raw request body
 * @returns `{ tool_id, operator_id, machine_id, job_id }`
 */
export function pickCheckoutParams(body: unknown): Record<string, unknown> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  return {
    tool_id: typeof b.tool_id === "string" ? b.tool_id : "",
    operator_id: typeof b.operator_id === "string" ? b.operator_id : "",
    machine_id: typeof b.machine_id === "string" ? b.machine_id : "",
    job_id: typeof b.job_id === "string" ? b.job_id : "",
  };
}

/**
 * Pick ONLY the checkin fields `ToolCribEngine.checkin(tool_id, operator_id, usage_min, condition)`
 * reads. `usage_min` is coerced to a finite number (default 0); `condition` defaults to "good".
 * @param body raw request body
 * @returns `{ tool_id, operator_id, usage_min, condition }`
 */
export function pickCheckinParams(body: unknown): Record<string, unknown> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const usageRaw = typeof b.usage_min === "number" ? b.usage_min : Number(b.usage_min);
  return {
    tool_id: typeof b.tool_id === "string" ? b.tool_id : "",
    operator_id: typeof b.operator_id === "string" ? b.operator_id : "",
    usage_min: Number.isFinite(usageRaw) ? usageRaw : 0,
    condition: typeof b.condition === "string" ? b.condition : "good",
  };
}

/**
 * Pure, HTTP-free dispatch core (unit-testable). Forwards to `prism_calc` and maps the result to an
 * `{ status, body }` pair: success -> 200 `{ result }`; dispatcher error envelope -> 400 `{ error }`.
 * A THROW from `callTool` is intentionally NOT caught here -- the router maps it to 500, so a transport
 * failure stays distinguishable from a clean dispatcher error.
 * @param callTool bound MCP call function
 * @param action one of the tool_crib_* actions
 * @param params engine params (already field-picked)
 * @returns `{ status, body }` ready for `res.status(status).json(body)`
 */
export async function dispatchToolCrib(
  callTool: CallToolFn,
  action: string,
  params: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const result = await callTool(CALC_TOOL, action, params);
  if (isToolCribError(result)) {
    return { status: 400, body: { error: toolCribErrorMessage(result as { error?: unknown }) } };
  }
  return { status: 200, body: { result } };
}

/**
 * Creates the tool-crib router (mounted at `/api/v1/tool-crib` in routes/index.ts).
 * @param callTool bound MCP call function (from routes/index.ts)
 * @returns express Router exposing inventory/reorder (GET) + checkout/checkin (POST)
 */
export function createToolCribRouter(callTool: CallToolFn): Router {
  const router = Router();

  router.get("/inventory", async (_req, res) => {
    try {
      const r = await dispatchToolCrib(callTool, "tool_crib_inventory", {});
      res.status(r.status).json(r.body);
    } catch (e) {
      res.status(500).json({ error: messageOf(e, "tool crib inventory failed") });
    }
  });

  router.get("/reorder", async (_req, res) => {
    try {
      const r = await dispatchToolCrib(callTool, "tool_crib_reorder", {});
      res.status(r.status).json(r.body);
    } catch (e) {
      res.status(500).json({ error: messageOf(e, "tool crib reorder failed") });
    }
  });

  router.post("/checkout", async (req, res) => {
    try {
      const r = await dispatchToolCrib(callTool, "tool_crib_checkout", pickCheckoutParams(req.body));
      res.status(r.status).json(r.body);
    } catch (e) {
      res.status(500).json({ error: messageOf(e, "tool crib checkout failed") });
    }
  });

  router.post("/checkin", async (req, res) => {
    try {
      const r = await dispatchToolCrib(callTool, "tool_crib_checkin", pickCheckinParams(req.body));
      res.status(r.status).json(r.body);
    } catch (e) {
      res.status(500).json({ error: messageOf(e, "tool crib checkin failed") });
    }
  });

  return router;
}
