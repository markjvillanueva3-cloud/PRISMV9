/**
 * Progressive Response Streaming (R3-MS4.5-T4)
 *
 * Streams responses in self-contained layers (L0→L3).
 * Each level is a COMPLETE answer at that verbosity — not truncation.
 * Client sets max_level; server stops at that tier.
 *
 * L0: Status code (1 token) — "ok" | "error" | "partial"
 * L1: Verdict + key metric (10-20 tokens) — { status, verdict, key_metric }
 * L2: Summary with reasoning (50-100 tokens) — { ...L1, reasoning, details }
 * L3: Full payload — complete result with all data
 */

export type ProgressiveLevel = 0 | 1 | 2 | 3;

export interface ProgressiveConfig<T> {
  /** The full computation result */
  result: T;
  /** Maximum level to return (0-3). Default: 2 */
  max_level?: ProgressiveLevel;
  /** L0 status: "ok" | "error" | "partial" */
  status: string;
  /** L1 builder: extract verdict + key metric from result */
  l1: (result: T) => { verdict: string; key_metric: string | number };
  /** L2 builder: extract summary with reasoning */
  l2: (result: T) => { reasoning: string; details: Record<string, unknown> };
  /** Optional: transform result before L3 output (e.g., strip internal fields) */
  l3_transform?: (result: T) => unknown;
}

export interface ProgressiveResponse {
  /** Which level was returned */
  level: ProgressiveLevel;
  /** L0 status */
  status: string;
  /** L1 fields (present at level >= 1) */
  verdict?: string;
  key_metric?: string | number;
  /** L2 fields (present at level >= 2) */
  reasoning?: string;
  details?: Record<string, unknown>;
  /** L3 full payload (present at level === 3) */
  full?: unknown;
}

export interface BatchProgressConfig {
  total: number;
  completed: number;
  failed: number;
  current_item?: string;
  estimated_remaining_ms?: number;
}

/**
 * Build a progressive response at the requested level.
 * Each level includes all lower-level fields (cumulative escalation).
 *
 * @param config - Configuration including result, max_level, status, and level builders
 * @returns A self-contained ProgressiveResponse at the requested verbosity tier
 */
export function buildProgressiveResponse<T>(
  config: ProgressiveConfig<T>
): ProgressiveResponse {
  const level = config.max_level ?? 2;

  // L0: Status only — ~1 token
  const response: ProgressiveResponse = {
    level,
    status: config.status,
  };

  if (level === 0) return response;

  // L1: Verdict + key metric — ~10-20 tokens
  const l1 = config.l1(config.result);
  response.verdict = l1.verdict;
  response.key_metric = l1.key_metric;

  if (level === 1) return response;

  // L2: Summary with reasoning — ~50-100 tokens
  const l2 = config.l2(config.result);
  response.reasoning = l2.reasoning;
  response.details = l2.details;

  if (level === 2) return response;

  // L3: Full payload — complete result
  response.full = config.l3_transform
    ? config.l3_transform(config.result)
    : config.result;

  return response;
}

/**
 * Estimate token count for a progressive response at each level.
 * Uses the rough heuristic of 1 token ≈ 4 JSON characters.
 * Useful for deciding which level to request given a context budget.
 *
 * @param response - An already-built ProgressiveResponse
 * @returns The level and estimated token count
 */
export function estimateTokens(response: ProgressiveResponse): {
  level: ProgressiveLevel;
  estimated_tokens: number;
} {
  const json = JSON.stringify(response);
  // Rough estimate: 1 token ≈ 4 characters for JSON
  return {
    level: response.level,
    estimated_tokens: Math.ceil(json.length / 4),
  };
}

/**
 * Convert a legacy ResponseLevel string to its nearest ProgressiveLevel equivalent.
 *
 * Mapping:
 *   pointer → 1  (verdict + key metric — equivalent brevity)
 *   summary → 2  (reasoning + details — equivalent verbosity)
 *   full    → 3  (complete payload)
 *
 * @param level - A legacy ResponseLevel string
 * @returns The corresponding ProgressiveLevel
 */
export function responseToProgressive(
  level: "pointer" | "summary" | "full"
): ProgressiveLevel {
  switch (level) {
    case "pointer":
      return 1;
    case "summary":
      return 2;
    case "full":
      return 3;
  }
}

/**
 * Convert a ProgressiveLevel back to a legacy ResponseLevel string.
 *
 * Mapping:
 *   0, 1 → pointer  (status-only and verdict are both brief)
 *   2    → summary
 *   3    → full
 *
 * @param level - A ProgressiveLevel (0-3)
 * @returns The nearest legacy ResponseLevel
 */
export function progressiveToResponse(
  level: ProgressiveLevel
): "pointer" | "summary" | "full" {
  if (level <= 1) return "pointer";
  if (level === 2) return "summary";
  return "full";
}

/**
 * Build a progressive response for a batch operation in progress.
 *
 * Derives status automatically:
 *   - "ok"      when all items completed with no failures
 *   - "partial" when there are failures
 *   - "running" when not yet complete
 *
 * @param config   - Current batch progress counters and metadata
 * @param max_level - Maximum response tier to return (default: 2)
 * @returns A self-contained ProgressiveResponse reflecting batch state
 *
 * @example
 * const progress = buildBatchProgress({ total: 100, completed: 50, failed: 2 });
 * // { level: 2, status: "partial", verdict: "50%", key_metric: "50/100",
 * //   reasoning: "50 completed, 2 failed out of 100", details: {...} }
 */
export function buildBatchProgress(
  config: BatchProgressConfig,
  max_level: ProgressiveLevel = 2
): ProgressiveResponse {
  const pct =
    config.total > 0
      ? Math.round((config.completed / config.total) * 100)
      : 0;

  const status =
    config.failed > 0
      ? "partial"
      : config.completed === config.total
      ? "ok"
      : "running";

  return buildProgressiveResponse({
    result: config,
    max_level,
    status,
    l1: () => ({
      verdict: status === "ok" ? "COMPLETE" : `${pct}%`,
      key_metric: `${config.completed}/${config.total}`,
    }),
    l2: () => ({
      reasoning:
        config.failed > 0
          ? `${config.completed} completed, ${config.failed} failed out of ${config.total}`
          : `${config.completed} of ${config.total} completed (${pct}%)`,
      details: {
        completed: config.completed,
        failed: config.failed,
        total: config.total,
        ...(config.current_item ? { current: config.current_item } : {}),
        ...(config.estimated_remaining_ms !== undefined
          ? { eta_ms: config.estimated_remaining_ms }
          : {}),
      },
    }),
  });
}
