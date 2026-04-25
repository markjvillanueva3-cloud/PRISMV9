/**
 * Response Slimmer Utility
 * Reduces verbose response objects for MCP transport efficiency.
 * @module utils/responseSlimmer
 */

/**
 * Slim a response object by removing null/undefined values and empty arrays.
 */
export function slimResponse<T>(response: T): T {
  if (response === null || response === undefined) {
    return response;
  }
  if (typeof response !== "object") {
    return response;
  }
  if (Array.isArray(response)) {
    return response.map(slimResponse) as T;
  }

  const slimmed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(response as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    slimmed[key] = typeof value === "object" ? slimResponse(value) : value;
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

