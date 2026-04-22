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
