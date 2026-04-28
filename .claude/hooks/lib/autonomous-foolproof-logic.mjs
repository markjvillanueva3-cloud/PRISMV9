/**
 * autonomous-foolproof-logic — pure decision functions for U-AF01..04 hooks.
 *
 * Extracted from the .mjs hooks so tests can import them via static
 * vitest imports without hitting the shebang-parsing bug. Hooks delegate
 * decisions to these functions and only handle I/O glue (stdin/stdout/files).
 *
 * NO I/O. NO process.* access (except input args). Pure logic.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @units U-AF01, U-AF02, U-AF03, U-AF04
 */

const DEFAULT_IDLE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// ──────────────────────────────────────────────────────────────────────
// U-AF01: autonomous-loop-watchdog
// ──────────────────────────────────────────────────────────────────────

/**
 * Decides whether the autonomous loop should be stopped due to idleness.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous - PRISM_AUTONOMOUS=1 set?
 * @param {object|null} input.state    - parsed AUTONOMOUS_STATE.json
 * @param {number} [input.nowMs]       - injectable clock for tests
 * @returns {{continue:boolean, reason:string, decision?:string,
 *            elapsed_ms?:number, threshold_ms?:number, last_commit_at?:string}}
 */
export function decideWatchdog({ isAutonomous, state, nowMs = Date.now() }) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (!state || typeof state !== "object") {
    return { continue: true, reason: "no-state" };
  }

  const lastTs = state.last_commit_at || state.started_at;
  if (!lastTs) {
    return { continue: true, reason: "no-timestamp" };
  }

  let lastMs;
  try {
    lastMs = new Date(lastTs).getTime();
  } catch {
    return { continue: true, reason: "bad-timestamp" };
  }
  if (!Number.isFinite(lastMs)) {
    return { continue: true, reason: "bad-timestamp" };
  }

  const threshold =
    state.caps && Number.isFinite(state.caps.idle_threshold_ms)
      ? Number(state.caps.idle_threshold_ms)
      : DEFAULT_IDLE_THRESHOLD_MS;

  const elapsed = nowMs - lastMs;
  if (elapsed > threshold) {
    return {
      continue: false,
      decision: "block",
      reason: "idle-exceeded",
      elapsed_ms: elapsed,
      threshold_ms: threshold,
      last_commit_at: lastTs,
    };
  }

  return { continue: true, reason: "active", elapsed_ms: elapsed };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF02: tsc-baseline-regression-gate
// ──────────────────────────────────────────────────────────────────────

/**
 * Detects git-commit-like commands. False-positive guards: `git committed`,
 * `echo 'git commit'` etc. Allows leading whitespace, `;`, `&&`, `||` chaining.
 */
export function isGitCommitCommand(cmd) {
  if (typeof cmd !== "string") return false;
  return /(?:^|\s|;|&&|\|\|)\s*git\s+commit(?:\s|$)/.test(cmd);
}

/**
 * Decides whether to block a commit due to tsc error count regression.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.isCommit
 * @param {boolean} input.allowRegression
 * @param {number|null} input.baseline
 * @param {number|null} input.current
 */
export function decideTscRegressionGate({
  isAutonomous,
  isCommit,
  allowRegression,
  baseline,
  current,
}) {
  if (!isCommit) {
    return { continue: true, reason: "not-a-commit" };
  }
  if (allowRegression) {
    return { continue: true, reason: "regression-explicitly-allowed" };
  }
  if (current === null || current === undefined) {
    return { continue: true, reason: "tsc-unavailable" };
  }
  if (baseline === null || baseline === undefined) {
    return {
      continue: true,
      reason: "baseline-initialized",
      initialize_to: current,
    };
  }
  if (current > baseline) {
    if (isAutonomous) {
      return {
        continue: false,
        decision: "block",
        reason: "regression",
        baseline,
        current,
        delta: current - baseline,
      };
    }
    return {
      continue: true,
      reason: "regression-warned",
      baseline,
      current,
      delta: current - baseline,
    };
  }
  return {
    continue: true,
    reason: current < baseline ? "improvement" : "stable",
    baseline,
    current,
  };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF03: reviewer-fail-latch
// ──────────────────────────────────────────────────────────────────────

/**
 * Decides whether the autonomous loop is latched-FAIL by a prior reviewer
 * verdict in the current session.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.overrideEnabled
 * @param {string|null} input.currentSessionId
 * @param {Array|null} input.verdicts
 */
export function decideReviewerFailLatch({
  isAutonomous,
  overrideEnabled,
  currentSessionId,
  verdicts,
}) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (overrideEnabled) {
    return { continue: true, reason: "override-active" };
  }
  if (!currentSessionId) {
    return { continue: true, reason: "no-session-id" };
  }
  if (!Array.isArray(verdicts)) {
    return { continue: true, reason: "no-verdicts-file" };
  }

  const failed = verdicts.filter(
    (v) =>
      v &&
      typeof v === "object" &&
      v.session_id === currentSessionId &&
      typeof v.verdict === "string" &&
      v.verdict.toUpperCase() === "FAIL",
  );

  if (failed.length === 0) {
    return {
      continue: true,
      reason: "no-fails",
      verdict_count: verdicts.length,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: "fail-latched",
    fail_count: failed.length,
    first_fail: {
      unit_id: failed[0].unit_id ?? "<unknown>",
      summary: failed[0].summary ?? "",
      at: failed[0].at ?? "",
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// U-AF04: cost-ceiling-stop
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_COST_CAP_USD = 50.0;
const DEFAULT_TOKEN_CAP = 5_000_000;
const DEFAULT_WALL_TIME_MS = 5 * 60 * 60 * 1000; // 5 hours
const DEFAULT_UNIT_CAP = 25;

/**
 * Decides whether the autonomous loop should stop due to a cost ceiling
 * (any of: total cost USD, total tokens, wall-time, total units).
 *
 * Whichever cap is breached first wins. Multiple breaches reported.
 *
 * @param {object} input
 * @param {boolean} input.isAutonomous
 * @param {boolean} input.overrideEnabled
 * @param {object|null} input.state - AUTONOMOUS_STATE.json contents
 * @param {number} [input.nowMs]
 * @returns {{continue:boolean, reason:string, decision?:string,
 *            breaches?:Array<{cap:string, value:number, limit:number}>}}
 */
export function decideCostCeiling({
  isAutonomous,
  overrideEnabled,
  state,
  nowMs = Date.now(),
}) {
  if (!isAutonomous) {
    return { continue: true, reason: "non-autonomous" };
  }
  if (overrideEnabled) {
    return { continue: true, reason: "override-active" };
  }
  if (!state || typeof state !== "object") {
    return { continue: true, reason: "no-state" };
  }

  const caps = state.caps && typeof state.caps === "object" ? state.caps : {};
  const costLimit = Number.isFinite(caps.cost_usd)
    ? Number(caps.cost_usd)
    : DEFAULT_COST_CAP_USD;
  const tokenLimit = Number.isFinite(caps.token_max)
    ? Number(caps.token_max)
    : DEFAULT_TOKEN_CAP;
  const wallLimit = Number.isFinite(caps.wall_time_ms)
    ? Number(caps.wall_time_ms)
    : DEFAULT_WALL_TIME_MS;
  const unitLimit = Number.isFinite(caps.unit_max)
    ? Number(caps.unit_max)
    : DEFAULT_UNIT_CAP;

  const breaches = [];

  // Cost ceiling
  const costUsed = Number.isFinite(state.cost_used_usd)
    ? Number(state.cost_used_usd)
    : 0;
  if (costUsed >= costLimit) {
    breaches.push({ cap: "cost_usd", value: costUsed, limit: costLimit });
  }

  // Token ceiling
  const tokensUsed = Number.isFinite(state.tokens_used)
    ? Number(state.tokens_used)
    : 0;
  if (tokensUsed >= tokenLimit) {
    breaches.push({ cap: "tokens", value: tokensUsed, limit: tokenLimit });
  }

  // Wall time ceiling
  if (state.started_at) {
    let startMs;
    try {
      startMs = new Date(state.started_at).getTime();
    } catch {
      startMs = NaN;
    }
    if (Number.isFinite(startMs)) {
      const elapsed = nowMs - startMs;
      if (elapsed >= wallLimit) {
        breaches.push({ cap: "wall_time_ms", value: elapsed, limit: wallLimit });
      }
    }
  }

  // Unit count ceiling
  const commitsMade = Number.isFinite(state.commits_made)
    ? Number(state.commits_made)
    : 0;
  if (commitsMade >= unitLimit) {
    breaches.push({ cap: "unit_max", value: commitsMade, limit: unitLimit });
  }

  if (breaches.length === 0) {
    return {
      continue: true,
      reason: "within-caps",
      cost_used_usd: costUsed,
      tokens_used: tokensUsed,
      commits_made: commitsMade,
    };
  }

  return {
    continue: false,
    decision: "block",
    reason: "ceiling-breached",
    breaches,
  };
}
