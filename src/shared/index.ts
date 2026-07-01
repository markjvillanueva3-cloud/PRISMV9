/**
 * Shared utilities barrel export
 */

// Response level (legacy 3-tier)
export { formatResponse, writeOrReturn } from "./response-level.js";
export type { ResponseLevel, ResponseLevelOptions } from "./response-level.js";

// Progressive response (R3-MS4.5-T4 — 4-tier streaming)
export {
  buildProgressiveResponse,
  estimateTokens,
  responseToProgressive,
  progressiveToResponse,
  buildBatchProgress,
} from "./progressive-response.js";
export type {
  ProgressiveLevel,
  ProgressiveConfig,
  ProgressiveResponse,
  BatchProgressConfig,
} from "./progressive-response.js";
