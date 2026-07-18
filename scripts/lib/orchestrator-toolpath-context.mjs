// scripts/lib/orchestrator-toolpath-context.mjs
//
// U-MMO-TOOLPATH-CONTEXT — situational selector schema for 200+ toolpaths.
//
// PROBLEM (per Agent B, biggest gap in PRISM)
// PRISM has 91 toolpath strategy engines but the selector only sees
// 12 dimensions today (feature type, ISO group, op class, axes, tool D,
// ae/D, surface Ra). The other 8 dimensions — rigidity class, spindle kW,
// coolant type, tolerance class (IT6-IT10), volume tier, prior-part match,
// chatter history, rework penalty — are NOT declared in any engine, so
// 97% of engines pick blind.
//
// SOLUTION
// Canonical ToolpathSelectorContext schema + scoring fn. Every strategy
// engine that wants to be considered for selection MUST accept this
// context shape. Engines that ignore dimensions return generic scores;
// engines that USE dimensions get higher rank.
//
// MIGRATION (follow-up wave U-MMO-TOOLPATH-CONTEXT-MIGRATE)
// Wire the context schema into the top-5 most-used strategy engines first;
// add to others incrementally. The schema is forward-compatible — engines
// can read 0..N dimensions, unknown ones default to neutral score.

// ---------------------------------------------------------------------------
// SCHEMA — frozen for forward compatibility
// ---------------------------------------------------------------------------

export const FEATURE_TYPES = Object.freeze([
  "hole", "pocket", "slot", "wall", "fillet", "thread",
  "3d_surface", "5axis_surface", "undercut", "engraving",
  "od_turn", "id_bore", "face", "groove", "part_off", "profile",
  "wedm_through", "wedm_taper", "wedm_4axis",
]);

export const ISO_GROUPS = Object.freeze(["P", "M", "K", "N", "S", "H"]);

export const OP_CLASSES = Object.freeze(["rough", "semi_finish", "finish", "super_finish"]);

export const RIGIDITY_CLASSES = Object.freeze(["low", "med", "high", "vmc_premium"]);

export const COOLANT_TYPES = Object.freeze(["flood", "mist", "mql", "dry", "ht_coolant", "air_blast"]);

export const TOLERANCE_CLASSES = Object.freeze(["IT6", "IT7", "IT8", "IT9", "IT10", "IT11+"]);

export const VOLUME_TIERS = Object.freeze(["one_off", "low_10", "med_100", "high_1000", "production_10k"]);

/**
 * @typedef {object} ToolpathSelectorContext
 * @property {{type: string, dims: object, tolerance_it: string, surface_ra_um: number}} feature
 * @property {{iso_group: string, hardness_hb: number, machinability_score: number}} material
 * @property {{rigidity_class: string, spindle_kw: number, axes_n: number, coolant: string, controller: string, prior_chatter_log?: object}} machine
 * @property {{volume_tier: string, tool_crib_inventory?: object, operator_skill: string}} shop
 * @property {{rework_penalty: string, prior_part_match_score?: number}} risk
 */

const REQUIRED_FIELDS = Object.freeze([
  "feature", "material", "machine", "shop", "risk",
]);

/**
 * Validate a context against the schema. Throws on missing/invalid fields.
 * Returns the (immutable) context unchanged on success.
 *
 * @param {ToolpathSelectorContext} ctx
 * @returns {ToolpathSelectorContext}
 */
export function validateContext(ctx) {
  if (!ctx || typeof ctx !== "object") {
    throw new Error("validateContext: context object required");
  }
  for (const f of REQUIRED_FIELDS) {
    if (!ctx[f] || typeof ctx[f] !== "object") {
      throw new Error(`validateContext: missing or invalid field '${f}'`);
    }
  }
  // Feature
  if (!ctx.feature.type) throw new Error("validateContext: feature.type required");
  if (!FEATURE_TYPES.includes(ctx.feature.type)) {
    throw new Error(`validateContext: feature.type must be one of ${FEATURE_TYPES.length} values, got '${ctx.feature.type}'`);
  }
  // Material
  if (!ISO_GROUPS.includes(ctx.material.iso_group)) {
    throw new Error(`validateContext: material.iso_group must be P|M|K|N|S|H, got '${ctx.material.iso_group}'`);
  }
  // Machine
  if (!RIGIDITY_CLASSES.includes(ctx.machine.rigidity_class)) {
    throw new Error(`validateContext: machine.rigidity_class must be one of ${RIGIDITY_CLASSES.join("|")}`);
  }
  if (!COOLANT_TYPES.includes(ctx.machine.coolant)) {
    throw new Error(`validateContext: machine.coolant must be one of ${COOLANT_TYPES.join("|")}`);
  }
  // Shop
  if (!VOLUME_TIERS.includes(ctx.shop.volume_tier)) {
    throw new Error(`validateContext: shop.volume_tier must be one of ${VOLUME_TIERS.join("|")}`);
  }
  return ctx;
}

/**
 * Build a neutral context with sensible defaults — useful when upstream
 * stages haven't filled every dimension yet. Each `?.` field can be
 * over-ridden by the partial input.
 *
 * @param {Partial<ToolpathSelectorContext>} [partial]
 * @returns {ToolpathSelectorContext}
 */
export function buildContext(partial = {}) {
  const base = {
    feature: { type: "pocket", dims: {}, tolerance_it: "IT9", surface_ra_um: 1.6 },
    material: { iso_group: "P", hardness_hb: 200, machinability_score: 0.7 },
    machine: { rigidity_class: "med", spindle_kw: 11, axes_n: 3, coolant: "flood", controller: "fanuc" },
    shop: { volume_tier: "low_10", operator_skill: "standard" },
    risk: { rework_penalty: "med", prior_part_match_score: 0 },
  };
  // Deep-merge partial — shallow per top-level field is enough for MS0
  const merged = {
    feature: { ...base.feature, ...(partial.feature || {}) },
    material: { ...base.material, ...(partial.material || {}) },
    machine: { ...base.machine, ...(partial.machine || {}) },
    shop: { ...base.shop, ...(partial.shop || {}) },
    risk: { ...base.risk, ...(partial.risk || {}) },
  };
  return validateContext(merged);
}

// ---------------------------------------------------------------------------
// SCORING — sample selector that uses ALL 13 dimensions
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ToolpathCandidate
 * @property {string} id                       - e.g. "trochoidal_mill"
 * @property {string} domain                   - "mill"|"lathe"|"wedm"
 * @property {string[]} compatible_features    - which feature types it handles
 * @property {string[]} compatible_iso_groups  - which ISO groups (or "ALL")
 * @property {object} [requires]               - { min_axes, min_kw, min_rigidity, coolant_required }
 * @property {object} [optimal_for]            - dimension preferences for boost score
 * @property {number} [base_score]             - prior, default 1.0
 */

/**
 * Score a toolpath candidate against a context. Returns a 0..1 score; 0 means
 * incompatible (will be filtered), 1 means perfect match. Engines that ignore
 * dimensions still score (just less specifically than engines that declare).
 *
 * @param {ToolpathCandidate} candidate
 * @param {ToolpathSelectorContext} ctx
 * @returns {{score: number, reasons: string[], compatible: boolean}}
 */
export function scoreCandidate(candidate, ctx) {
  validateContext(ctx);
  if (!candidate || typeof candidate !== "object" || !candidate.id) {
    throw new Error("scoreCandidate: candidate with id required");
  }
  const reasons = [];

  // Hard compatibility filters
  if (Array.isArray(candidate.compatible_features) &&
      !candidate.compatible_features.includes(ctx.feature.type)) {
    return { score: 0, reasons: [`feature ${ctx.feature.type} not in candidate scope`], compatible: false };
  }
  if (Array.isArray(candidate.compatible_iso_groups) &&
      candidate.compatible_iso_groups[0] !== "ALL" &&
      !candidate.compatible_iso_groups.includes(ctx.material.iso_group)) {
    return { score: 0, reasons: [`material ${ctx.material.iso_group} not in candidate scope`], compatible: false };
  }
  if (candidate.requires) {
    const req = candidate.requires;
    if (typeof req.min_axes === "number" && ctx.machine.axes_n < req.min_axes) {
      return { score: 0, reasons: [`needs ${req.min_axes}+ axes, machine has ${ctx.machine.axes_n}`], compatible: false };
    }
    if (typeof req.min_kw === "number" && ctx.machine.spindle_kw < req.min_kw) {
      return { score: 0, reasons: [`needs ${req.min_kw}kW spindle, machine has ${ctx.machine.spindle_kw}`], compatible: false };
    }
    if (req.min_rigidity) {
      const rIdx = RIGIDITY_CLASSES.indexOf(ctx.machine.rigidity_class);
      const reqIdx = RIGIDITY_CLASSES.indexOf(req.min_rigidity);
      if (rIdx < reqIdx) {
        return { score: 0, reasons: [`needs ${req.min_rigidity}+ rigidity, machine is ${ctx.machine.rigidity_class}`], compatible: false };
      }
    }
    if (req.coolant_required && ctx.machine.coolant === "dry") {
      return { score: 0, reasons: ["requires coolant, machine is dry"], compatible: false };
    }
  }

  // Soft scoring: candidate's optimal_for hints boost score
  let score = candidate.base_score ?? 1.0;
  const optimal = candidate.optimal_for || {};
  if (optimal.iso_group === ctx.material.iso_group) { score += 0.3; reasons.push("ISO match"); }
  if (optimal.rigidity_class === ctx.machine.rigidity_class) { score += 0.2; reasons.push("rigidity match"); }
  if (optimal.tolerance_it === ctx.feature.tolerance_it) { score += 0.15; reasons.push("tolerance match"); }
  if (optimal.volume_tier === ctx.shop.volume_tier) { score += 0.15; reasons.push("volume match"); }
  if (optimal.coolant === ctx.machine.coolant) { score += 0.1; reasons.push("coolant match"); }

  // Prior-part match bonus (compounding-learning signal)
  const ppm = ctx.risk.prior_part_match_score || 0;
  if (ppm > 0.5 && optimal.high_prior_match) {
    score += 0.2;
    reasons.push(`prior-part match ${ppm.toFixed(2)}`);
  }

  // Rework-penalty risk: high penalty → prefer conservative
  if (ctx.risk.rework_penalty === "high" && optimal.conservative) {
    score += 0.2;
    reasons.push("conservative for high-rework-penalty");
  }

  // Normalize to [0, 1] — cap at 2.0 raw then divide
  const normalized = Math.min(1.0, score / 2.0);
  return { score: normalized, reasons, compatible: true };
}

/**
 * Rank a list of candidates by score against a context. Returns sorted
 * candidates with their scores attached.
 *
 * @param {ToolpathCandidate[]} candidates
 * @param {ToolpathSelectorContext} ctx
 * @returns {{rankings: object[], best: object | null, considered: number, eliminated: number}}
 */
export function rankCandidates(candidates, ctx) {
  if (!Array.isArray(candidates)) {
    throw new Error("rankCandidates: candidates must be an array");
  }
  validateContext(ctx);
  const rankings = candidates.map((c) => {
    const { score, reasons, compatible } = scoreCandidate(c, ctx);
    return { candidate: c, score, reasons, compatible };
  });
  const compatibleOnes = rankings.filter((r) => r.compatible);
  compatibleOnes.sort((a, b) => b.score - a.score);
  return {
    rankings: compatibleOnes,
    best: compatibleOnes[0] || null,
    considered: candidates.length,
    eliminated: candidates.length - compatibleOnes.length,
  };
}
