/**
 * sfc-node-bridge.mjs — unified Speed/Feed computation bridge.
 *
 * Today PRISM has 5+ duplicate Speed/Feed code paths scattered across
 * CAM, post processor, quoting, the standalone calculator, and shop
 * floor. Each consumer computes SF slightly differently (different
 * material-name normalization, different default chipload tables,
 * different chip-thinning correction, different power-budget caps).
 * Operators get inconsistent recommendations across surfaces, and the
 * audit trail for "where did THIS number come from" is broken.
 *
 * This pure-fn library defines ONE bridge contract:
 *   - canonical SFRequest shape (material × tool × operation × machine)
 *   - canonical SFResult shape (Vc, n, fz, vf, ap, ae, source, citations)
 *   - validateRequest() — fail-loud on missing / bad inputs
 *   - registerComputer() — register a SF computation strategy
 *     (kienzle-based, table-lookup, ml-predicted, vendor-recommended)
 *   - routeRequest() — picks computer by request hint or fallback chain
 *   - mergeAlternatives() — when multiple computers return, pick the
 *     highest-confidence (or merge as ensemble) with provenance
 *   - recordOutcome() — close-loop: shop-floor actuals fed back so
 *     downstream calibration can tighten priors
 *
 * The bridge does NOT itself compute SF — it routes to a registered
 * computer. Pure-fn shape; caller wires real physics at the edge.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-SFC-NODE-BRIDGE
 * @slot echo · @iter 39 · @date 2026-05-27
 */

export const SFC_CONTRACT_VERSION = 1;

export const ISO_MATERIAL_GROUPS = ["P", "M", "K", "N", "S", "H"];
// P = ferrous (steel)         · M = austenitic stainless
// K = cast iron               · N = non-ferrous (Al/Cu)
// S = superalloys (Ti/Inco)   · H = hardened steel (≥45 HRC)

export const OPERATION_KINDS = [
  "face_mill",
  "shoulder_mill",
  "slot_mill",
  "pocket_rough",
  "pocket_finish",
  "contour_finish",
  "drill",
  "peck_drill",
  "tap",
  "ream",
  "bore",
  "thread_mill",
  "trochoidal",
  "adaptive_clearing",
];

export const COMPUTER_SOURCES = ["kienzle", "table", "ml", "vendor", "ensemble"];

export const CONFIDENCE_FLOOR = 0.0;
export const CONFIDENCE_CEIL = 1.0;
export const REQUIRED_REQUEST_FIELDS = ["materialIsoGroup", "toolDiameterMm", "operation"];
export const REQUIRED_RESULT_FIELDS = ["Vc_m_per_min", "n_rpm", "fz_mm_per_tooth", "vf_mm_per_min", "source", "confidence"];

/** Pure: create a fresh SFC bridge. */
export function createSFCBridge(args) {
  const a = args || {};
  return {
    schemaVersion: SFC_CONTRACT_VERSION,
    bridgeId: typeof a.bridgeId === "string" ? a.bridgeId : "default",
    computers: {},
    fallbackChain: Array.isArray(a.fallbackChain) ? a.fallbackChain.filter((s) => COMPUTER_SOURCES.includes(s)) : ["kienzle", "table", "vendor"],
    outcomeCount: 0,
    createdAtIso: typeof a.createdAtIso === "string" ? a.createdAtIso : new Date().toISOString(),
  };
}

/** Pure: validate a request has all required fields + valid enums. */
export function validateRequest(req) {
  const errors = [];
  if (!req || typeof req !== "object") {
    return { ok: false, errors: ["request is not an object"] };
  }
  for (const f of REQUIRED_REQUEST_FIELDS) {
    if (req[f] === undefined || req[f] === null) {
      errors.push(`missing required field: ${f}`);
    }
  }
  if (req.materialIsoGroup && !ISO_MATERIAL_GROUPS.includes(req.materialIsoGroup)) {
    errors.push(`invalid materialIsoGroup: '${req.materialIsoGroup}' (must be one of ${ISO_MATERIAL_GROUPS.join("/")})`);
  }
  if (req.operation && !OPERATION_KINDS.includes(req.operation)) {
    errors.push(`invalid operation: '${req.operation}'`);
  }
  if (req.toolDiameterMm !== undefined && (!Number.isFinite(Number(req.toolDiameterMm)) || Number(req.toolDiameterMm) <= 0)) {
    errors.push(`invalid toolDiameterMm: must be positive number`);
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: validate a result has all required fields + valid ranges. */
export function validateResult(result) {
  const errors = [];
  if (!result || typeof result !== "object") {
    return { ok: false, errors: ["result is not an object"] };
  }
  for (const f of REQUIRED_RESULT_FIELDS) {
    if (result[f] === undefined || result[f] === null) {
      errors.push(`missing required result field: ${f}`);
    }
  }
  if (result.source && !COMPUTER_SOURCES.includes(result.source)) {
    errors.push(`invalid source: '${result.source}'`);
  }
  if (Number.isFinite(Number(result.confidence))) {
    const c = Number(result.confidence);
    if (c < CONFIDENCE_FLOOR || c > CONFIDENCE_CEIL) {
      errors.push(`confidence out of range [${CONFIDENCE_FLOOR}, ${CONFIDENCE_CEIL}]: ${c}`);
    }
  }
  for (const num of ["Vc_m_per_min", "n_rpm", "fz_mm_per_tooth", "vf_mm_per_min"]) {
    if (result[num] !== undefined && (!Number.isFinite(Number(result[num])) || Number(result[num]) < 0)) {
      errors.push(`invalid ${num}: must be non-negative number`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: register a SF computer strategy. Returns new bridge or null on failure. */
export function registerComputer(bridge, source, computeFn) {
  if (!bridge) return null;
  if (!COMPUTER_SOURCES.includes(source)) return null;
  if (typeof computeFn !== "function") return null;
  return {
    ...bridge,
    computers: { ...bridge.computers, [source]: computeFn },
  };
}

/** Pure: route a request to the right computer via hint + fallback chain. */
export function routeRequest(bridge, req) {
  const valid = validateRequest(req);
  if (!valid.ok) {
    return { ok: false, result: null, source: null, errors: valid.errors };
  }
  if (!bridge || !bridge.computers) {
    return { ok: false, result: null, source: null, errors: ["bridge invalid"] };
  }
  const tryOrder = [];
  if (req.preferredSource && COMPUTER_SOURCES.includes(req.preferredSource)) tryOrder.push(req.preferredSource);
  for (const s of bridge.fallbackChain) {
    if (!tryOrder.includes(s)) tryOrder.push(s);
  }
  const triedSources = [];
  for (const source of tryOrder) {
    const fn = bridge.computers[source];
    if (!fn) {
      triedSources.push({ source, status: "not_registered" });
      continue;
    }
    let result;
    try {
      result = fn(req);
    } catch (err) {
      triedSources.push({ source, status: "threw", error: err && err.message ? err.message : String(err) });
      continue;
    }
    const resultValid = validateResult(result);
    if (!resultValid.ok) {
      triedSources.push({ source, status: "invalid_result", errors: resultValid.errors });
      continue;
    }
    return { ok: true, result, source, triedSources, errors: [] };
  }
  return { ok: false, result: null, source: null, triedSources, errors: ["no computer returned a valid result"] };
}

/** Pure: pick best alternative from multiple SF results (highest confidence). */
export function mergeAlternatives(alternatives) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) return null;
  let best = null;
  let bestConf = -1;
  const provenance = [];
  for (const a of alternatives) {
    if (!a || typeof a !== "object") continue;
    const valid = validateResult(a);
    if (!valid.ok) continue;
    const c = Number(a.confidence);
    provenance.push({ source: a.source, confidence: c });
    if (c > bestConf) {
      best = a;
      bestConf = c;
    }
  }
  if (!best) return null;
  return { ...best, _provenance: provenance };
}

/** Pure: record an outcome from shop floor (predicted vs actual). */
export function recordOutcome(bridge, outcome) {
  if (!bridge || !outcome || typeof outcome !== "object") return bridge;
  if (!Number.isFinite(Number(outcome.predictedVf)) || !Number.isFinite(Number(outcome.actualVf))) return bridge;
  return {
    ...bridge,
    outcomeCount: bridge.outcomeCount + 1,
  };
}

/** Pure: enumerate registered computer sources. */
export function listRegisteredComputers(bridge) {
  if (!bridge || !bridge.computers) return [];
  return Object.keys(bridge.computers).sort();
}

/** Pure: summary for dashboards. */
export function summarizeBridge(bridge) {
  if (!bridge) return null;
  return {
    schemaVersion: SFC_CONTRACT_VERSION,
    bridgeId: bridge.bridgeId,
    knownSources: COMPUTER_SOURCES.length,
    registeredSources: listRegisteredComputers(bridge),
    registeredCount: listRegisteredComputers(bridge).length,
    fallbackChain: bridge.fallbackChain,
    outcomeCount: bridge.outcomeCount,
    knownMaterialGroups: ISO_MATERIAL_GROUPS.length,
    knownOperationKinds: OPERATION_KINDS.length,
  };
}
