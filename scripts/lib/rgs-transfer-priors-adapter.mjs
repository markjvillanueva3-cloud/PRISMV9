/**
 * rgs-transfer-priors-adapter.mjs — cross-pipeline transfer-priors adapter for
 * the rgs-tool-planner outcomes reader.
 *
 * Why this exists (U-LIMA-A8 / RGS-TOOL-AUTOINVOKE-MS1 P1 punch-list item #6):
 *   The punch-list names this unit "Cross-milestone transfer priors —
 *   `prism_ai:xproc_transfer_*` for cold-start milestones." Reality check:
 *   `prism_ai:xproc_transfer_*` is backed by `CrossProcessTransferLearningEngine`,
 *   which transfers NEURAL WEIGHTS across MATERIAL clusters (carbon_steel →
 *   stainless_steel, ...), NOT across roadmap milestones. There is no
 *   milestone-cluster transfer API in PRISM's engines.
 *
 *   What the planner's confidence re-rank actually couples to is the
 *   `(pipeline, tier, verdict)` key in `makeOutcomesReader` — and the cold
 *   start is at the PIPELINE level (a brand-new pipeline like `/mill` has zero
 *   outcomes the moment it's first wired). So A8 implements transfer priors at
 *   the pipeline-cluster level (the actually-useful scope) and the wiki entry
 *   surfaces the punch-list's misnamed hint honestly per R7 ("surface
 *   conflicts, don't average them").
 *
 * What it does:
 *   Wraps `makeOutcomesReader()` (or any reader with the same
 *   `({pipeline, tier, verdict}) -> {shipped, blocked, reverted}` contract).
 *   When the underlying reader returns `{0, 0, 0}` for a cold pipeline, the
 *   wrapper:
 *     1. Looks up the cold pipeline's cluster (e.g. `/mill` -> "mill").
 *     2. Lists donor clusters from `TRANSFER_PAIRS` ({source -> {target}}).
 *     3. Enumerates donor pipelines from `KNOWN_PIPELINES`.
 *     4. Calls the underlying reader once per donor pipeline (cheap — the
 *        reader caches the ledger read internally).
 *     5. Returns the discount-weighted (default 0.5x) Math.floor'd aggregate.
 *
 *   When `shipped + blocked + reverted > 0` already (the pipeline has its own
 *   evidence), the wrapper passes the underlying result through unchanged —
 *   own-pipeline signal always wins over donors.
 *
 * Return contract: identical to the base reader. The signal-fusion module
 * (`fuseSignals` in rgs-signal-fusion.mjs:189) calls outcomes async; this
 * adapter stays async as well.
 *
 * Graceful degradation (R12 — fail soft, never crash the planner):
 *   - baseReader throws -> return `{0, 0, 0}` (never bubble the error).
 *   - any donor-pipeline read throws -> skip that donor, continue aggregating.
 *   - opts.discount === 0 -> behave as identity pass-through.
 *   - PRISM_RGS_TRANSFER_PRIORS=0 disables the wrapper entirely at the CLI
 *     layer (no env reads in this module — pure injection).
 *
 * @module scripts/lib/rgs-transfer-priors-adapter
 */

// ---------------------------------------------------------------------------
// Pipeline clusters
// ---------------------------------------------------------------------------

/**
 * Eight pipeline clusters spanning the planner's known pipeline space. The
 * cluster names are stable identifiers; do not rename without updating
 * `PIPELINE_CLUSTER_MAP` AND `TRANSFER_PAIRS` together.
 */
export const PIPELINE_CLUSTERS = Object.freeze([
  "mill",
  "lathe",
  "wedm",
  "cam",
  "cad",
  "knowledge", // /pdf-learn /video-learn (knowledge intake)
  "review",    // /scrutinize /dedup test-team (review/quality)
  "build",     // /forge-triple /wire-unwired (asset creation)
]);

/**
 * Pipeline-name -> cluster. Keys are the canonical pipeline strings emitted
 * by `matchPipelines` in `scripts/lib/rgs-pipeline-rules.mjs` plus the common
 * Tier-3 sub-skills that frequently appear in OutcomeRecord.predictedPipelines
 * (mill-studio, lathe-lora, wedm-audit, etc.). Unknown pipelines resolve to
 * `null` via `pipelineToCluster` -> no transfer prior applied (safe default).
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PIPELINE_CLUSTER_MAP = Object.freeze({
  // mill cluster
  "/mill": "mill",
  "/mill-studio": "mill",
  "/mill-master": "mill",
  "/mill-harden": "mill",
  // lathe cluster
  "/lathe": "lathe",
  "/lathe-lora": "lathe",
  "/lathe-studio": "lathe",
  "/lathe-postgen": "lathe",
  "/lathe-validate": "lathe",
  "/lathe-harden": "lathe",
  // wedm cluster
  "/wedm": "wedm",
  "/wedm-audit": "wedm",
  "/wedm-studio": "wedm",
  "/wedm-program": "wedm",
  "/wedm-validate": "wedm",
  // cam cluster
  "/cam-strategy": "cam",
  "/cam-strategy-compare": "cam",
  "/cam-strategy-select": "cam",
  // cad cluster
  "/cad-from-blueprint": "cad",
  "/cad-from-text": "cad",
  "/cad-extract": "cad",
  "/cad-validate": "cad",
  // knowledge cluster (intake)
  "/pdf-learn": "knowledge",
  "/video-learn": "knowledge",
  "/wiki-ingest": "knowledge",
  // review cluster
  "/scrutinize": "review",
  "/dedup": "review",
  "test-team": "review",
  // build cluster
  "/forge-triple": "build",
  "/wire-unwired": "build",
  "/forge-audit": "build",
});

/**
 * Directional transfer permissions: TRANSFER_PAIRS[target] = donor cluster
 * Set. A target's donor pool is "every pipeline whose cluster is in
 * `TRANSFER_PAIRS[targetCluster]`."
 *
 * Justifications (each pair has a metallurgical / methodological reason):
 *   mill   <- lathe, cam        : shared metal-cutting physics + CAM tooling
 *   lathe  <- mill, cam         : symmetric to the above
 *   wedm   <- (none)            : EDM physics is non-cutting; do NOT borrow
 *                                  from milling/turning outcomes.
 *   cam    <- mill, lathe       : CAM strategy generalizes from process priors
 *   cad    <- knowledge         : CAD intake shares document-parse failure
 *                                  modes with /pdf-learn (blueprint OCR, etc.)
 *   knowledge <- cad            : symmetric (CAD intake is a knowledge form)
 *   review <- build             : reviewing creation work uses build outcomes
 *   build  <- review            : symmetric; auditors and builders co-evolve
 *
 * Empty donor set is the "do not borrow" default (e.g. wedm — different
 * physics, would introduce bias rather than reduce variance).
 *
 * @type {Readonly<Record<string, ReadonlySet<string>>>}
 */
export const TRANSFER_PAIRS = Object.freeze({
  mill: new Set(["lathe", "cam"]),
  lathe: new Set(["mill", "cam"]),
  wedm: new Set(),
  cam: new Set(["mill", "lathe"]),
  cad: new Set(["knowledge"]),
  knowledge: new Set(["cad"]),
  review: new Set(["build"]),
  build: new Set(["review"]),
});

/** Default donor-outcome weight when no opts.discount is provided. */
export const DEFAULT_DISCOUNT = 0.5;

/** Pre-computed (cluster -> pipelines[]) reverse index for the wrapper. */
const PIPELINES_BY_CLUSTER = (() => {
  /** @type {Record<string, string[]>} */
  const map = {};
  for (const cluster of PIPELINE_CLUSTERS) map[cluster] = [];
  for (const [pipeline, cluster] of Object.entries(PIPELINE_CLUSTER_MAP)) {
    if (map[cluster]) map[cluster].push(pipeline);
  }
  // Sort deterministically so test snapshots are stable.
  for (const cluster of Object.keys(map)) map[cluster].sort();
  // Freeze each array so the singleton can't be mutated by callers.
  for (const cluster of Object.keys(map)) Object.freeze(map[cluster]);
  return Object.freeze(map);
})();

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Classify a pipeline name into one of the eight `PIPELINE_CLUSTERS`. Returns
 * `null` if the pipeline is unknown — callers MUST treat null as "no transfer
 * prior available" (the safe default).
 *
 * @param {string|undefined|null} pipeline
 * @returns {string|null}
 */
export function pipelineToCluster(pipeline) {
  if (typeof pipeline !== "string" || pipeline === "") return null;
  return Object.prototype.hasOwnProperty.call(PIPELINE_CLUSTER_MAP, pipeline)
    ? PIPELINE_CLUSTER_MAP[pipeline]
    : null;
}

/**
 * Return all pipelines registered in `PIPELINE_CLUSTER_MAP` for the given
 * cluster. Unknown clusters return `[]`. The returned array is frozen.
 *
 * @param {string} cluster
 * @returns {readonly string[]}
 */
export function pipelinesInCluster(cluster) {
  return PIPELINES_BY_CLUSTER[cluster] ?? Object.freeze([]);
}

/**
 * List the donor pipelines for a target pipeline, EXCLUDING the target itself.
 * Returns `[]` for unknown targets or targets with no donor clusters (e.g.
 * `/wedm`).
 *
 * @param {string} targetPipeline
 * @returns {readonly string[]}
 */
export function listDonorPipelines(targetPipeline) {
  const targetCluster = pipelineToCluster(targetPipeline);
  if (targetCluster == null) return Object.freeze([]);
  const donorClusters = TRANSFER_PAIRS[targetCluster];
  if (!donorClusters || donorClusters.size === 0) return Object.freeze([]);
  const out = [];
  for (const donorCluster of donorClusters) {
    for (const donorPipeline of pipelinesInCluster(donorCluster)) {
      // Defensive: skip the target itself if it somehow appears in a donor
      // cluster (would never happen with the current map, but the guard
      // future-proofs the function against typos in PIPELINE_CLUSTER_MAP).
      if (donorPipeline !== targetPipeline) out.push(donorPipeline);
    }
  }
  return Object.freeze(out);
}

// ---------------------------------------------------------------------------
// Outcome-record helpers
// ---------------------------------------------------------------------------

/**
 * Coerce a value to a non-negative finite integer; everything else maps to 0.
 * Outcome counts MUST stay integer-valued because the planner's re-rank
 * multiplier (`0.5 + (s+1)/(s+f+2)`) is closed under integer math but produces
 * weirdness with fractional s/f (e.g. negative inputs flip the multiplier
 * direction).
 *
 * @param {unknown} n
 * @returns {number}
 */
function safeNonNegInt(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Zero-outcomes sentinel — returned in every degenerate / failed-fetch case.
 * Frozen so consumers can't mutate the shared singleton.
 */
const ZERO_OUTCOMES = Object.freeze({ shipped: 0, blocked: 0, reverted: 0 });

/**
 * Normalize whatever the base reader returns into the canonical
 * `{shipped, blocked, reverted}` triple of non-negative integers. Tolerates
 * partial / malformed payloads (returns zeros for any missing field).
 *
 * @param {unknown} raw
 * @returns {{shipped:number, blocked:number, reverted:number}}
 */
function normalizeOutcomes(raw) {
  if (raw == null || typeof raw !== "object") return { ...ZERO_OUTCOMES };
  const r = /** @type {Record<string, unknown>} */ (raw);
  return {
    shipped: safeNonNegInt(r.shipped),
    blocked: safeNonNegInt(r.blocked),
    reverted: safeNonNegInt(r.reverted),
  };
}

/**
 * Apply a discount factor to a normalized outcome triple, floor-rounding.
 * Floor (not round) prevents the discount from inflating donor evidence —
 * `{shipped:1, blocked:0}` * 0.5 -> `{shipped:0, blocked:0}` is correct
 * (a single donor success at half-weight is honestly less than one full
 * success, not "round up to one").
 *
 * @param {{shipped:number, blocked:number, reverted:number}} triple
 * @param {number} discount
 * @returns {{shipped:number, blocked:number, reverted:number}}
 */
function applyDiscount(triple, discount) {
  if (!Number.isFinite(discount) || discount <= 0) return { ...ZERO_OUTCOMES };
  const d = Math.min(1, discount); // cap at 1.0 — a >1 discount would AMPLIFY
  return {
    shipped: Math.floor(triple.shipped * d),
    blocked: Math.floor(triple.blocked * d),
    reverted: Math.floor(triple.reverted * d),
  };
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Build an outcomes reader that augments the base reader with cross-cluster
 * transfer priors. The returned reader has the same signature and contract as
 * the base; callers (rgs-signal-fusion's `fuseSignals`) cannot tell whether
 * a returned `{shipped, blocked, reverted}` came from own-pipeline or donor
 * fallback.
 *
 * The base reader is called UNCONDITIONALLY first — the wrapper never
 * suppresses an own-pipeline signal, regardless of options. Transfer priors
 * fire only when own = `{0, 0, 0}`.
 *
 * @param {(args: {pipeline:string, tier:string, verdict:string}) => Promise<{shipped:number, blocked:number, reverted:number}|null|undefined>} baseReader
 *   The underlying outcomes reader (typically `makeOutcomesReader()` from
 *   `rgs-tool-planner.mjs`).
 * @param {{discount?: number}} [opts]
 *   - `discount` — donor-outcome weight, [0, 1]. Default `DEFAULT_DISCOUNT`.
 *     `0` or anything non-finite disables transfer (identity wrapper).
 * @returns {(args: {pipeline:string, tier:string, verdict:string}) => Promise<{shipped:number, blocked:number, reverted:number}>}
 */
export function makeTransferPriorsOutcomes(baseReader, opts = {}) {
  if (typeof baseReader !== "function") {
    // Pure shape check — the planner would throw later anyway, but failing
    // fast here is more debuggable than a confusing async "is not a function".
    throw new TypeError("makeTransferPriorsOutcomes: baseReader must be a function");
  }
  const discount =
    typeof opts.discount === "number" && Number.isFinite(opts.discount) && opts.discount >= 0
      ? Math.min(1, opts.discount)
      : DEFAULT_DISCOUNT;

  return async function outcomesWithTransferPrior({ pipeline, tier, verdict }) {
    // 1) Own-pipeline read — single underlying call, errors swallowed.
    let own;
    try {
      own = normalizeOutcomes(await baseReader({ pipeline, tier, verdict }));
    } catch {
      return { ...ZERO_OUTCOMES };
    }

    // 2) Has own signal -> short-circuit (own ALWAYS wins).
    if (own.shipped > 0 || own.blocked > 0 || own.reverted > 0) {
      return own;
    }

    // 3) Discount disabled (=0) -> identity pass-through (no donor fetch).
    if (discount <= 0) {
      return own;
    }

    // 4) Donor enumeration.
    const donors = listDonorPipelines(pipeline);
    if (donors.length === 0) return own;

    // 5) Aggregate donor outcomes via the same base reader. Errors are
    //    per-donor — one failure does not abort the aggregate.
    let donorAgg = { shipped: 0, blocked: 0, reverted: 0 };
    for (const donor of donors) {
      let donorRaw;
      try {
        donorRaw = await baseReader({ pipeline: donor, tier, verdict });
      } catch {
        continue;
      }
      const donorTriple = normalizeOutcomes(donorRaw);
      donorAgg = {
        shipped: donorAgg.shipped + donorTriple.shipped,
        blocked: donorAgg.blocked + donorTriple.blocked,
        reverted: donorAgg.reverted + donorTriple.reverted,
      };
    }

    // 6) Discount + return. If every donor was zero or threw, this naturally
    //    resolves to ZERO_OUTCOMES — same as own, so still safe.
    return applyDiscount(donorAgg, discount);
  };
}
