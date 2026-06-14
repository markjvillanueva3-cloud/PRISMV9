/**
 * Response Slimmer Utility
 * Reduces verbose response objects for MCP transport efficiency.
 * @module utils/responseSlimmer
 */

/**
 * Slim a response object by removing null/undefined values and empty arrays.
 *
 * @param response - the value to slim
 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
 *   pathologically deep payload would otherwise recurse until the call stack
 *   overflows and crashes the request (and, unguarded in the handler, the
 *   process). Real manufacturing responses are shallow, so the happy path never
 *   reaches the cap; returning the un-slimmed subtree at the cap is lossless.
 * @param depth - internal recursion counter (callers pass nothing).
 */
export function slimResponse<T>(response: T, maxDepth: number | SlimLevel = 32, depth = 0): T {
  if (response === null || response === undefined) {
    return response;
  }
  if (typeof response !== "object") {
    return response;
  }
  // Legacy callers (calcDispatcher) pass a SlimLevel string in this slot -- the
  // old getSlimLevel(...) arg that slimResponse ignored before maxDepth existed.
  // A non-numeric cap makes `depth >= cap` a NaN-compare (always false), silently
  // DISABLING the stack-overflow guard on the busiest dispatcher. Coerce to the
  // default so the guard is active everywhere; numeric callers are unchanged.
  const cap = typeof maxDepth === "number" && Number.isFinite(maxDepth) ? maxDepth : 32;
  if (depth >= cap) {
    return response;
  }
  if (Array.isArray(response)) {
    // Explicit arrow (not bare `.map(slimResponse)`) so Array.map's index/array
    // arguments never leak into the maxDepth/depth params.
    return response.map((item) => slimResponse(item, cap, depth + 1)) as T;
  }

  const slimmed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(response as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    slimmed[key] = typeof value === "object" ? slimResponse(value, cap, depth + 1) : value;
  }
  return slimmed as T;
}

// Backward-compat helpers (esbuild fix 2026-04-25)
// Prior context-pressure plumbing was removed; callers expect a numeric
// pressure 0-100. We return 0 (no pressure) which makes getSlimLevel
// degrade to the lightest level — safe default.
export function getCurrentPressurePct(): number {
  return 0;
}
export type SlimLevel = "L0" | "L1" | "L2" | "L3" | "L4";
export function getSlimLevel(pressurePct: number): SlimLevel {
  if (pressurePct >= 90) return "L4";
  if (pressurePct >= 75) return "L3";
  if (pressurePct >= 50) return "L2";
  if (pressurePct >= 25) return "L1";
  return "L0";
}

