/**
 * drift-aware-bandit-feed-emit.mjs — deterministic multi-armed bandit
 * for feed-rate candidate selection, with EWMA-style drift detection
 * that auto-RESETs the bandit when shop conditions change (material
 * lot change, tool wear regime shift, ambient-temp swing).
 *
 * Why "drift-aware bandit feed":
 *   Without drift detection a bandit converges on the best arm under
 *   conditions present during the EXPLORATION phase, then keeps picking
 *   it even after conditions change. Result: stale recommendations
 *   when a new material lot arrives or tool wear regime shifts.
 *   With split-half drift detection the bandit auto-RESETs when recent
 *   rewards diverge from historical rewards beyond a calibrated threshold.
 *
 *   Echo-soul: this lib does NOT inline feed values. The candidate
 *   feed rates come from upstream (SpeedFeedOrchestrator /
 *   UltimateSpeedFeedEngine). The lib only chooses WHICH candidate to
 *   emit based on past reward history, and emits the bandit state /
 *   drift verdict as dialect-aware G-code comments.
 *
 *   Failure mode the unit prevents: silent stale-bandit feed
 *   recommendation after a shop-condition change (R12 — never recommend
 *   without surfacing the freshness of the recommendation).
 *
 * Algorithm:
 *   1. State: {armIds, pulls[], totalReward[], rewardHistory[][]}
 *   2. recordReward(armId, reward) — incremental, immutable update
 *   3. bestArmId() — argmax mean reward, ties by lowest-index (deterministic)
 *   4. driftScore() — |mean(early-half) - mean(late-half)| / σ_pooled
 *      over the global reward stream (all arms combined, last N pulls)
 *   5. select() — bestArmId, OR signal drift-reset if score > threshold
 *
 * Reuses substrate pattern from existing detector-bandit-tune.mjs
 * (parseDecisionLedger / suppress-boost-hold triage) and the drift-gate
 * pattern from drift-gate.mjs (verdict-based gate). This lib applies
 * both at emit-time for feed-rate selection.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-DRIFT-AWARE-BANDIT-FEED
 * @phase 6 EMIT-side · @row 41 · @effort 3d
 * @slot echo · @date 2026-05-27
 */

export const DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION = 1;

/** Default decimal precision for emitted reward/score values. */
export const DEFAULT_DECIMAL_PLACES = 3;

/** Min reward-history length required to even consider drift detection. */
export const MIN_DRIFT_DETECTION_PULLS = 4;

/** Default drift threshold: |Δmean| / σ_pooled > 2.0 = ~5% under Gaussian. */
export const DEFAULT_DRIFT_THRESHOLD = 2.0;

/** Max arm count we support per bandit. */
export const MAX_ARMS = 32;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/** Possible selection statuses. */
export const SUPPORTED_SELECTION_STATUSES = [
  "greedy",
  "drift-reset-suggested",
  "insufficient-data",
];

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/**
 * Pure: format a comment per dialect (mirrors iter51-54 paren-strip).
 */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safe = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safe}${d.close}`;
}

/**
 * Pure: initialize a fresh bandit state.
 * armIds must be a non-empty array of unique non-empty strings.
 * Returns null on bad input.
 */
export function initBanditState(armIds) {
  if (!Array.isArray(armIds) || armIds.length === 0) return null;
  if (armIds.length > MAX_ARMS) return null;
  const seen = new Set();
  for (const id of armIds) {
    if (typeof id !== "string" || id.length === 0) return null;
    if (seen.has(id)) return null;
    seen.add(id);
  }
  return {
    armIds: [...armIds],
    pulls: armIds.map(() => 0),
    totalReward: armIds.map(() => 0),
    rewardStream: [], // ordered list of every recorded reward (across arms)
    schemaVersion: DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION,
  };
}

/**
 * Pure: get arm index by id. Returns -1 on miss.
 */
function armIndex(state, armId) {
  if (!state || !Array.isArray(state.armIds)) return -1;
  return state.armIds.indexOf(armId);
}

/**
 * Pure: record a reward for an arm. Returns a NEW state (immutable).
 * Returns null on bad input.
 */
export function recordReward(state, armId, reward) {
  if (!state || typeof state !== "object") return null;
  if (!Array.isArray(state.armIds) || !Array.isArray(state.pulls)) return null;
  if (!Number.isFinite(reward)) return null;
  const i = armIndex(state, armId);
  if (i < 0) return null;
  const pulls = [...state.pulls];
  const totalReward = [...state.totalReward];
  const rewardStream = [...state.rewardStream, { armId, reward }];
  pulls[i] = pulls[i] + 1;
  totalReward[i] = totalReward[i] + reward;
  return {
    armIds: state.armIds,
    pulls,
    totalReward,
    rewardStream,
    schemaVersion: state.schemaVersion,
  };
}

/**
 * Pure: get the mean reward for an arm. Returns null if armId unknown
 * OR no pulls recorded (avoid 0/0 NaN — fail-loud).
 */
export function meanReward(state, armId) {
  const i = armIndex(state, armId);
  if (i < 0) return null;
  if (state.pulls[i] === 0) return null;
  return state.totalReward[i] / state.pulls[i];
}

/**
 * Pure: arm with highest mean reward. Ties broken by lowest array index
 * (deterministic, matches initial armIds order).
 * Returns null if no arms have any pulls yet (cold-start).
 */
export function bestArmId(state) {
  if (!state || !Array.isArray(state.armIds)) return null;
  let bestIdx = -1;
  let bestMean = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < state.armIds.length; i++) {
    if (state.pulls[i] === 0) continue;
    const m = state.totalReward[i] / state.pulls[i];
    if (m > bestMean) {
      bestMean = m;
      bestIdx = i;
    }
  }
  if (bestIdx < 0) return null;
  return state.armIds[bestIdx];
}

/**
 * Pure: compute drift score for the global reward stream.
 * Split-half: |mean(early half) - mean(late half)| / σ_pooled.
 * Returns null if < MIN_DRIFT_DETECTION_PULLS or σ_pooled = 0.
 */
export function driftScore(state) {
  if (!state || !Array.isArray(state.rewardStream)) return null;
  const stream = state.rewardStream;
  if (stream.length < MIN_DRIFT_DETECTION_PULLS) return null;
  const half = Math.floor(stream.length / 2);
  const early = stream.slice(0, half).map((r) => r.reward);
  const late = stream.slice(stream.length - half).map((r) => r.reward);
  const meanE = early.reduce((s, v) => s + v, 0) / early.length;
  const meanL = late.reduce((s, v) => s + v, 0) / late.length;
  const varE = early.reduce((s, v) => s + (v - meanE) ** 2, 0) / Math.max(1, early.length - 1);
  const varL = late.reduce((s, v) => s + (v - meanL) ** 2, 0) / Math.max(1, late.length - 1);
  // Pooled standard deviation (unbiased estimator)
  const pooledVar = (varE + varL) / 2;
  const sigma = Math.sqrt(pooledVar);
  if (sigma === 0) return null; // identical rewards → no drift can be detected via this metric
  return Math.abs(meanL - meanE) / sigma;
}

/**
 * Pure: drift detected? Compares driftScore to threshold.
 * Returns false (no drift) when score is null (insufficient data / σ=0).
 */
export function isDriftDetected(state, threshold) {
  const t = Number.isFinite(threshold) ? threshold : DEFAULT_DRIFT_THRESHOLD;
  const s = driftScore(state);
  if (s == null) return false;
  return s > t;
}

/**
 * Pure: reset bandit state after drift detected. Preserves armIds,
 * zeros everything else. Returns null on bad input.
 */
export function resetAfterDrift(state) {
  if (!state || !Array.isArray(state.armIds)) return null;
  return initBanditState(state.armIds);
}

/**
 * Pure: select arm for emit + signal drift verdict.
 *
 * Returns { armId, status, driftScore, meanReward } where:
 *   status="insufficient-data"      — no arm has any pulls yet
 *   status="drift-reset-suggested"  — drift detected; caller SHOULD reset
 *                                     bandit + treat next emit as exploration
 *   status="greedy"                 — pick best arm, no drift
 *
 * In drift-reset case the armId is STILL the current best (caller can
 * use it for this emit, but the recommendation to reset for next time
 * is surfaced via status + driftScore).
 *
 * Returns null on bad input.
 */
export function selectArm(state, options) {
  if (!state || !Array.isArray(state.armIds)) return null;
  const threshold = options?.driftThreshold ?? DEFAULT_DRIFT_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold <= 0) return null;
  const bestId = bestArmId(state);
  if (bestId == null) {
    return {
      armId: state.armIds[0],
      status: "insufficient-data",
      driftScore: null,
      meanReward: null,
    };
  }
  const dScore = driftScore(state);
  const drift = (dScore != null) && (dScore > threshold);
  return {
    armId: bestId,
    status: drift ? "drift-reset-suggested" : "greedy",
    driftScore: dScore,
    meanReward: meanReward(state, bestId),
  };
}

/**
 * Pure: format the bandit-selection band as text (no comment wrap).
 */
export function formatBanditBandText(selection, options) {
  if (!selection || typeof selection !== "object") return null;
  if (!SUPPORTED_SELECTION_STATUSES.includes(selection.status)) return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const meanStr = selection.meanReward == null ? "n/a" : selection.meanReward.toFixed(dp);
  const driftStr = selection.driftScore == null ? "n/a" : selection.driftScore.toFixed(dp);
  return `BANDIT arm=${selection.armId} status=${selection.status} meanR=${meanStr} drift=${driftStr}`;
}

/**
 * Pure: build dialect-aware comment for a bandit selection.
 */
export function buildBanditEmitComment({ selection, dialect, options }) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const text = formatBanditBandText(selection, options);
  if (text == null) return null;
  return formatComment(dialect, text);
}

/**
 * Pure: full emit pipeline.
 *
 * @param {Object} req
 * @param {Object} req.state — bandit state from initBanditState
 * @param {string} req.dialect — one of SUPPORTED_DIALECTS
 * @param {Object} [req.armToProgramLine] — map of armId → programLine string
 *   (the upstream-computed feed-rate emit line for each arm). If supplied,
 *   the SELECTED arm's programLine is echoed in output; otherwise programLine
 *   is null.
 * @param {Object} [req.options] — { driftThreshold, decimalPlaces }
 * @returns {Object|null} { selection, comment, programLine, summary }
 */
export function emitWithDriftAwareBanditFeed(req) {
  if (!req || typeof req !== "object") return null;
  const { state, dialect, armToProgramLine } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const selection = selectArm(state, req.options);
  if (selection == null) return null;
  const comment = buildBanditEmitComment({ selection, dialect, options: req.options });
  if (comment == null) return null;
  let programLine = null;
  if (armToProgramLine && typeof armToProgramLine === "object") {
    const v = armToProgramLine[selection.armId];
    if (typeof v === "string") programLine = v;
  }
  return {
    selection,
    comment,
    programLine,
    summary: {
      status: selection.status,
      armId: selection.armId,
      meanReward: selection.meanReward,
      driftScore: selection.driftScore,
      totalArmCount: state?.armIds?.length ?? 0,
      totalPullCount: state?.rewardStream?.length ?? 0,
      dialect,
      schemaVersion: DRIFT_AWARE_BANDIT_FEED_SCHEMA_VERSION,
    },
  };
}
