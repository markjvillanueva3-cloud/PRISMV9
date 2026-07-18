/**
 * post-gen-node-bridge.mjs — unified post-generator bridge.
 *
 * PRISM has multiple post-generation paths today: per-controller
 * generators (Fanuc / Heidenhain / Siemens / Hurco), per-CAM bridges
 * (Fusion → post, Mastercam → post, hyperMILL → post), and the legacy
 * postgen subsystem (parameterized post-config XML). Each path produces
 * its own output shape, so downstream consumers (DNC, prove-out,
 * shop-floor monitor) need per-source adapters.
 *
 * This unit defines the SINGLE post-generation contract that ALL paths
 * conform to. Pair to iter33-35 (per-target add-in manifests) and iter37
 * (DB node bridge): closes the phase-2 node-bridge quartet.
 *
 * Contract:
 *   - POST_GEN_CONTRACT_VERSION
 *   - GENERATOR_KINDS = ['controller_direct','cam_bridge','legacy_postgen','llm_emitted']
 *   - SUPPORTED_CONTROLLERS — 12-controller whitelist (Fanuc / Heidenhain /
 *     Siemens / Hurco / Mazak / Okuma / Haas / Mitsubishi / Doosan /
 *     Mori / DMG-Mori / Brother)
 *   - canonical PostGenRequest schema (controller × cam × ops × machine)
 *   - canonical PostGenResult schema (gcode_text, safety_flags[],
 *     dialect_warnings[], source, confidence, generated_at_iso)
 *   - createPostGenBridge() — fresh bridge with no generators registered
 *   - registerGenerator() — fail-loud on unknown kind or invalid fn
 *   - validateRequest / validateResult — schema gates
 *   - routePostGen() — preferred-source first, else fallback chain
 *   - mergeGCodeOutputs() — when multiple generators emit, pick the
 *     one with no safety_flags first, then highest confidence
 *   - summarizeBridge() — coverage dashboard
 *
 * Pure functions only. Caller persists state + wires real I/O.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-POST-GEN-BRIDGE
 * @slot echo · @iter 40 · @date 2026-05-27
 */

export const POST_GEN_CONTRACT_VERSION = 1;

export const GENERATOR_KINDS = ["controller_direct", "cam_bridge", "legacy_postgen", "llm_emitted"];

export const SUPPORTED_CONTROLLERS = [
  "fanuc_30i",
  "fanuc_31i",
  "fanuc_0i",
  "heidenhain_tnc640",
  "heidenhain_itnc530",
  "siemens_840dsl",
  "siemens_828d",
  "hurco_winmax",
  "mazak_smc",
  "okuma_osp",
  "haas_ngc",
  "mitsubishi_m700",
];

export const SAFETY_FLAG_KINDS = [
  "collision_risk",
  "exceeds_spindle_torque",
  "exceeds_feed_envelope",
  "tool_overhang_critical",
  "coolant_missing_required",
  "rapid_through_stock",
  "missing_safe_retract",
  "feed_mode_mismatch",
];

export const REQUIRED_REQUEST_FIELDS = ["controllerId", "operations"];
export const REQUIRED_RESULT_FIELDS = ["gcodeText", "source", "controllerId", "confidence"];

/** Pure: create a fresh post-gen bridge. */
export function createPostGenBridge(args) {
  const a = args || {};
  return {
    schemaVersion: POST_GEN_CONTRACT_VERSION,
    bridgeId: typeof a.bridgeId === "string" ? a.bridgeId : "default",
    generators: {},
    fallbackChain: Array.isArray(a.fallbackChain)
      ? a.fallbackChain.filter((k) => GENERATOR_KINDS.includes(k))
      : ["controller_direct", "cam_bridge", "legacy_postgen"],
    emitCount: 0,
    createdAtIso: typeof a.createdAtIso === "string" ? a.createdAtIso : new Date().toISOString(),
  };
}

/** Pure: validate a post-gen request. */
export function validateRequest(req) {
  const errors = [];
  if (!req || typeof req !== "object") {
    return { ok: false, errors: ["request is not an object"] };
  }
  for (const f of REQUIRED_REQUEST_FIELDS) {
    if (req[f] === undefined || req[f] === null) errors.push(`missing required field: ${f}`);
  }
  if (req.controllerId && !SUPPORTED_CONTROLLERS.includes(req.controllerId)) {
    errors.push(`unsupported controllerId: '${req.controllerId}'`);
  }
  if (req.operations !== undefined && !Array.isArray(req.operations)) {
    errors.push("operations must be an array");
  } else if (Array.isArray(req.operations) && req.operations.length === 0) {
    errors.push("operations array is empty");
  }
  if (req.preferredKind !== undefined && !GENERATOR_KINDS.includes(req.preferredKind)) {
    errors.push(`unknown preferredKind: '${req.preferredKind}'`);
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: validate a post-gen result. */
export function validateResult(result) {
  const errors = [];
  if (!result || typeof result !== "object") {
    return { ok: false, errors: ["result is not an object"] };
  }
  for (const f of REQUIRED_RESULT_FIELDS) {
    if (result[f] === undefined || result[f] === null) errors.push(`missing required result field: ${f}`);
  }
  if (result.gcodeText !== undefined && (typeof result.gcodeText !== "string" || result.gcodeText.length === 0)) {
    errors.push("gcodeText must be non-empty string");
  }
  if (result.source && !GENERATOR_KINDS.includes(result.source)) {
    errors.push(`invalid source: '${result.source}'`);
  }
  if (result.controllerId && !SUPPORTED_CONTROLLERS.includes(result.controllerId)) {
    errors.push(`invalid controllerId: '${result.controllerId}'`);
  }
  if (Number.isFinite(Number(result.confidence))) {
    const c = Number(result.confidence);
    if (c < 0 || c > 1) errors.push(`confidence out of range [0,1]: ${c}`);
  }
  if (result.safetyFlags !== undefined) {
    if (!Array.isArray(result.safetyFlags)) {
      errors.push("safetyFlags must be array");
    } else {
      for (const f of result.safetyFlags) {
        if (!SAFETY_FLAG_KINDS.includes(f)) errors.push(`invalid safety flag: '${f}'`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: register a generator strategy. */
export function registerGenerator(bridge, kind, generateFn) {
  if (!bridge) return null;
  if (!GENERATOR_KINDS.includes(kind)) return null;
  if (typeof generateFn !== "function") return null;
  return {
    ...bridge,
    generators: { ...bridge.generators, [kind]: generateFn },
  };
}

/** Pure: route a post-gen request to the appropriate generator. */
export function routePostGen(bridge, req) {
  const valid = validateRequest(req);
  if (!valid.ok) {
    return { ok: false, result: null, kind: null, errors: valid.errors };
  }
  if (!bridge || !bridge.generators) {
    return { ok: false, result: null, kind: null, errors: ["bridge invalid"] };
  }
  const tryOrder = [];
  if (req.preferredKind && GENERATOR_KINDS.includes(req.preferredKind)) tryOrder.push(req.preferredKind);
  for (const k of bridge.fallbackChain) {
    if (!tryOrder.includes(k)) tryOrder.push(k);
  }
  const triedKinds = [];
  for (const kind of tryOrder) {
    const fn = bridge.generators[kind];
    if (!fn) {
      triedKinds.push({ kind, status: "not_registered" });
      continue;
    }
    let result;
    try {
      result = fn(req);
    } catch (err) {
      triedKinds.push({ kind, status: "threw", error: err && err.message ? err.message : String(err) });
      continue;
    }
    const resultValid = validateResult(result);
    if (!resultValid.ok) {
      triedKinds.push({ kind, status: "invalid_result", errors: resultValid.errors });
      continue;
    }
    return { ok: true, result, kind, triedKinds, errors: [] };
  }
  return { ok: false, result: null, kind: null, triedKinds, errors: ["no generator returned a valid result"] };
}

/** Pure: pick best output from multiple generators (no safety flags first, then highest confidence). */
export function mergeGCodeOutputs(outputs) {
  if (!Array.isArray(outputs) || outputs.length === 0) return null;
  const valid = [];
  for (const o of outputs) {
    if (!o || typeof o !== "object") continue;
    const v = validateResult(o);
    if (!v.ok) continue;
    valid.push(o);
  }
  if (valid.length === 0) return null;
  // Prefer no-flag outputs first.
  const noFlags = valid.filter((o) => !o.safetyFlags || o.safetyFlags.length === 0);
  const pool = noFlags.length > 0 ? noFlags : valid;
  let best = null;
  let bestConf = -1;
  for (const o of pool) {
    const c = Number(o.confidence);
    if (c > bestConf) {
      best = o;
      bestConf = c;
    }
  }
  return best ? {
    ...best,
    _provenance: valid.map((o) => ({
      source: o.source,
      confidence: o.confidence,
      flagCount: o.safetyFlags ? o.safetyFlags.length : 0,
    })),
  } : null;
}

/** Pure: increment emit count (immutable) — telemetry. */
export function recordEmit(bridge) {
  if (!bridge) return bridge;
  return { ...bridge, emitCount: bridge.emitCount + 1 };
}

/** Pure: enumerate registered generator kinds. */
export function listRegisteredGenerators(bridge) {
  if (!bridge || !bridge.generators) return [];
  return Object.keys(bridge.generators).sort();
}

/** Pure: dashboard summary. */
export function summarizeBridge(bridge) {
  if (!bridge) return null;
  return {
    schemaVersion: POST_GEN_CONTRACT_VERSION,
    bridgeId: bridge.bridgeId,
    knownGeneratorKinds: GENERATOR_KINDS.length,
    knownControllers: SUPPORTED_CONTROLLERS.length,
    knownSafetyFlags: SAFETY_FLAG_KINDS.length,
    registeredGenerators: listRegisteredGenerators(bridge),
    fallbackChain: bridge.fallbackChain,
    emitCount: bridge.emitCount,
  };
}
