/**
 * pareto-frontier-emit.mjs — emit a multi-objective Pareto-frontier
 * selection summary as dialect-aware G-code comments at op boundaries.
 *
 * Why "Pareto frontier at emit":
 *   Cycle-time minimization without surfacing the dominated alternatives
 *   hides operator-facing decisions. With this gate the post emits:
 *     ( PARETO chosen=fast_finish  frontier=3 of 5  dom=2 )
 *     ( ALT cycle=183s wear=0.32 finish=0.5 )
 *   The operator sees they could have traded 6 seconds of cycle time
 *   for half the tool wear — instead of the post silently picking
 *   the cycle-time-minimum and discarding the others.
 *
 *   Echo-soul: post-processor observability only. The objective
 *   VECTORS come from upstream physics (SpeedFeedOrchestrator,
 *   ToolWearPrediction, SurfaceFinishPredictor) — this lib only
 *   computes the frontier + emit, no inline Kc / Vc / Taylor / wear
 *   physics.
 *
 *   Failure mode the unit prevents: silent dominated-alternative
 *   suppression (R12 — never hide trade-off information the operator
 *   needs to make a calibrated pick).
 *
 * Pipeline:
 *   1. Caller provides candidates[]: each {id, objectives:[n0,n1,...]}
 *   2. Caller provides directions[]: per-objective +1 (minimize) or -1 (maximize)
 *   3. computeFrontier(candidates, {directions}) returns the non-dominated subset
 *   4. selectRecommended(frontier, strategy, {directions, weights}) picks one
 *   5. emitWithParetoFrontier(...) wraps both + emits dialect-aware comments
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-PARETO-FRONTIER-AT-EMIT
 * @phase 6 EMIT-side · @row 34 · @effort 3d
 * @slot echo · @date 2026-05-27
 */

export const PARETO_FRONTIER_EMIT_SCHEMA_VERSION = 1;

/** Default decimal precision for emitted objective values. */
export const DEFAULT_DECIMAL_PLACES = 3;

/** Max objectives we support (keeps Pareto sane + hand-verifiable). */
export const MAX_OBJECTIVES = 8;

/** Recognized selection strategies. */
export const SUPPORTED_STRATEGIES = ["lex-min-primary", "weighted-sum"];

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/**
 * Pure: format a comment string for the target dialect.
 * Mirrors iter51/iter52 paren-strip pattern.
 */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safeText = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safeText}${d.close}`;
}

/**
 * Validate a candidates[] array. Returns null if invalid.
 * Each candidate must be {id: string, objectives: number[]}.
 * All candidates must share the same objectives length.
 */
function validateCandidates(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!first || typeof first !== "object") return null;
  if (typeof first.id !== "string" || first.id.length === 0) return null;
  if (!Array.isArray(first.objectives)) return null;
  const dim = first.objectives.length;
  if (dim < 1 || dim > MAX_OBJECTIVES) return null;
  for (const c of candidates) {
    if (!c || typeof c !== "object") return null;
    if (typeof c.id !== "string" || c.id.length === 0) return null;
    if (!Array.isArray(c.objectives) || c.objectives.length !== dim) return null;
    for (const v of c.objectives) {
      if (!Number.isFinite(v)) return null;
    }
  }
  return { dim };
}

/**
 * Validate or default directions array.
 * directions[i] = +1 (minimize, smaller-is-better) or -1 (maximize, larger-is-better).
 * Returns array on success, null on bad input.
 */
function resolveDirections(dim, directions) {
  if (directions == null) return new Array(dim).fill(1); // default: minimize all
  if (!Array.isArray(directions) || directions.length !== dim) return null;
  for (const d of directions) {
    if (d !== 1 && d !== -1) return null;
  }
  return [...directions];
}

/**
 * Pure: does objective vector A dominate B under given directions?
 *
 * Domination rule (Pareto): A dominates B iff
 *   (∀ i: A_i ≤ B_i under direction)  AND
 *   (∃ i: A_i < B_i under direction)
 * Where direction +1 means smaller-is-better, -1 means larger-is-better.
 *
 * Returns false on dim mismatch or non-finite inputs.
 */
export function dominatesDirected(a, b, directions) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const dim = a.length;
  if (dim === 0) return false;
  const dirs = Array.isArray(directions) && directions.length === dim
    ? directions
    : new Array(dim).fill(1);
  let anyStrict = false;
  for (let i = 0; i < dim; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) return false;
    const ai = a[i] * dirs[i]; // flip sign for maximize so smaller-is-better universally
    const bi = b[i] * dirs[i];
    if (ai > bi) return false;        // A is worse in some objective → not dominate
    if (ai < bi) anyStrict = true;     // strict win in some objective
  }
  return anyStrict;
}

/** Pure: shortcut for all-minimize. */
export function dominates(a, b) {
  return dominatesDirected(a, b, null);
}

/**
 * Pure: compute the Pareto frontier (non-dominated subset).
 * Returns null on bad input.
 *
 * O(n²) algorithm — fine for emit-time candidate sets (typically n ≤ 20).
 *
 * @returns {{frontier: Candidate[], frontierIndices: number[], dominatedCount: number}}
 */
export function computeFrontier(candidates, options) {
  const v = validateCandidates(candidates);
  if (v == null) return null;
  const directions = resolveDirections(v.dim, options?.directions);
  if (directions == null) return null;

  const n = candidates.length;
  const frontier = [];
  const frontierIndices = [];
  for (let i = 0; i < n; i++) {
    let isDominated = false;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (dominatesDirected(candidates[j].objectives, candidates[i].objectives, directions)) {
        isDominated = true;
        break;
      }
    }
    if (!isDominated) {
      frontier.push(candidates[i]);
      frontierIndices.push(i);
    }
  }
  return {
    frontier,
    frontierIndices,
    dominatedCount: n - frontier.length,
  };
}

/**
 * Pure: pick a recommended candidate from a frontier.
 *
 * Strategies:
 *   - "lex-min-primary" (default): sort frontier by directions-adjusted objectives
 *     lexicographically (primary first), return first.
 *   - "weighted-sum": minimize Σᵢ wᵢ · objᵢ · directionᵢ. Requires options.weights[]
 *     of same length as dim. Defaults weights to all-1 if absent.
 *
 * Returns null on bad input or empty frontier.
 */
export function selectRecommended(frontier, strategy, options) {
  if (!Array.isArray(frontier) || frontier.length === 0) return null;
  if (strategy != null && !SUPPORTED_STRATEGIES.includes(strategy)) return null;
  const strat = strategy ?? "lex-min-primary";
  const dim = frontier[0].objectives.length;
  const directions = resolveDirections(dim, options?.directions);
  if (directions == null) return null;

  if (strat === "lex-min-primary") {
    let bestIdx = 0;
    for (let i = 1; i < frontier.length; i++) {
      const a = frontier[i].objectives;
      const b = frontier[bestIdx].objectives;
      for (let k = 0; k < dim; k++) {
        const av = a[k] * directions[k];
        const bv = b[k] * directions[k];
        if (av < bv) { bestIdx = i; break; }
        if (av > bv) break;
      }
    }
    return { candidate: frontier[bestIdx], index: bestIdx, strategy: strat };
  }

  // weighted-sum
  const weights = Array.isArray(options?.weights) && options.weights.length === dim
    ? options.weights
    : new Array(dim).fill(1);
  for (const w of weights) {
    if (!Number.isFinite(w) || w < 0) return null;
  }
  let bestIdx = 0;
  let bestSum = Number.POSITIVE_INFINITY;
  for (let i = 0; i < frontier.length; i++) {
    let s = 0;
    for (let k = 0; k < dim; k++) {
      s += weights[k] * frontier[i].objectives[k] * directions[k];
    }
    if (s < bestSum) { bestSum = s; bestIdx = i; }
  }
  return { candidate: frontier[bestIdx], index: bestIdx, strategy: strat, score: bestSum };
}

/**
 * Pure: format objective values for an emitted alt-line.
 * objectiveNames is optional; if absent uses "o0/o1/..." auto-naming.
 */
export function formatObjectives(objectives, objectiveNames, decimalPlaces) {
  if (!Array.isArray(objectives)) return null;
  const dp = Number.isFinite(decimalPlaces) && decimalPlaces >= 0
    ? Math.floor(decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const parts = [];
  for (let i = 0; i < objectives.length; i++) {
    const name = (Array.isArray(objectiveNames) && typeof objectiveNames[i] === "string")
      ? objectiveNames[i]
      : `o${i}`;
    parts.push(`${name}=${Number(objectives[i]).toFixed(dp)}`);
  }
  return parts.join(" ");
}

/**
 * Pure: build the dialect-aware Pareto frontier comment block.
 *
 * Emits ONE program-header line + N alt-lines (one per frontier member).
 * The PICKED candidate is flagged inline.
 *
 * Returns null on bad input. Returns { headerLine, altLines, picked } on success.
 */
export function buildFrontierEmitBlock({ candidates, dialect, options }) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const v = validateCandidates(candidates);
  if (v == null) return null;
  const directions = resolveDirections(v.dim, options?.directions);
  if (directions == null) return null;
  const frontierResult = computeFrontier(candidates, { directions });
  if (frontierResult == null) return null;
  const strategy = options?.strategy ?? "lex-min-primary";
  const pick = selectRecommended(frontierResult.frontier, strategy, {
    directions,
    weights: options?.weights,
  });
  if (pick == null) return null;

  const totalN = candidates.length;
  const frontierN = frontierResult.frontier.length;
  const domN = frontierResult.dominatedCount;
  const headerText = `PARETO chosen=${pick.candidate.id} strategy=${strategy} frontier=${frontierN} of ${totalN} dom=${domN}`;
  const headerLine = formatComment(dialect, headerText);
  if (headerLine == null) return null;

  const altLines = [];
  const dp = options?.decimalPlaces;
  const names = options?.objectiveNames;
  for (let i = 0; i < frontierResult.frontier.length; i++) {
    const c = frontierResult.frontier[i];
    const objText = formatObjectives(c.objectives, names, dp);
    if (objText == null) return null;
    const tag = (i === pick.index) ? "PICK" : "ALT";
    const line = formatComment(dialect, `${tag} ${c.id}  ${objText}`);
    if (line == null) return null;
    altLines.push(line);
  }

  return {
    headerLine,
    altLines,
    picked: pick.candidate,
    pickedIndex: pick.index,
    frontierCount: frontierN,
    dominatedCount: domN,
    totalCount: totalN,
    strategy,
  };
}

/**
 * Pure: full emit pipeline. Wraps the block-build + caller's programLines.
 *
 * @param {Object} req
 * @param {Array} req.candidates — [{id, objectives:[n0,n1,...]}]
 * @param {string} req.dialect — one of SUPPORTED_DIALECTS
 * @param {string[]} [req.programLines] — emit lines for the PICKED candidate
 *   (echoed in output when picked is non-null; suppressed otherwise)
 * @param {Object} [req.options]
 * @param {number[]} [req.options.directions] — +1 minimize / -1 maximize per dim
 * @param {string} [req.options.strategy] — "lex-min-primary" | "weighted-sum"
 * @param {number[]} [req.options.weights] — required for weighted-sum
 * @param {string[]} [req.options.objectiveNames] — labels for alt-line emit
 * @param {number} [req.options.decimalPlaces] — toFixed precision
 * @param {boolean} [req.options.emitAltLines=true] — show non-picked alternates
 * @returns {Object|null} { allowed, picked, headerLine, altLines, programLines, summary }
 */
export function emitWithParetoFrontier(req) {
  if (!req || typeof req !== "object") return null;
  const { candidates, dialect, programLines } = req;
  const block = buildFrontierEmitBlock({ candidates, dialect, options: req.options });
  if (block == null) return null;
  const emitAltLines = req.options?.emitAltLines !== false;
  const altLines = emitAltLines ? block.altLines : [];
  return {
    allowed: true,
    picked: block.picked,
    pickedIndex: block.pickedIndex,
    headerLine: block.headerLine,
    altLines,
    programLines: Array.isArray(programLines)
      ? programLines.filter((l) => typeof l === "string")
      : [],
    summary: {
      strategy: block.strategy,
      frontierCount: block.frontierCount,
      dominatedCount: block.dominatedCount,
      totalCount: block.totalCount,
      dialect,
      schemaVersion: PARETO_FRONTIER_EMIT_SCHEMA_VERSION,
    },
  };
}
