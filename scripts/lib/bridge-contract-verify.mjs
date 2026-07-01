/**
 * bridge-contract-verify.mjs — cross-target parity verification for the
 * three CAM add-in resource manifests (Mastercam, hyperMILL, Inventor HSM).
 *
 * Depends on iter33 + iter34 + iter35. The three add-in manifests each have
 * their own categories + dialect maps, but the *contract* — schema fields,
 * required-field invariants, version-bumping conventions, diff semantics —
 * MUST be identical so the operator-facing add-in code can be one codebase
 * with three target configs (no per-target code branches).
 *
 * This pure-fn library verifies that contract symmetry:
 *   - SHARED_CORE_CATEGORIES: 7 categories EVERY add-in must support
 *   - SHARED_REQUIRED_MANIFEST_FIELDS / _RESOURCE_FIELDS: identical across targets
 *   - verifyBridgeParity({mastercam, hypermill, inventor}) — runs all
 *     parity checks, returns {ok, mismatches[]}
 *   - findCommonDialectOps(maps[]) — operations present in EVERY target
 *     (these can be unified at the operator UI; target-only ops require
 *     per-target branching)
 *   - canonicalizeResourceId(target, id) — namespace-prefix to prevent
 *     cross-target ID collision when manifests are loaded together
 *
 * Pure functions only. Caller provides the three target's exports.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-BRIDGE-CONTRACT-VERIFY
 * @slot echo · @iter 36 · @date 2026-05-27
 */

export const CONTRACT_SCHEMA_VERSION = 1;

export const SHARED_CORE_CATEGORIES = [
  "post_processor",
  "tool",
  "material",
  "holder",
  "machine_profile",
  "sample_program",
  "dialect_map",
];

export const SHARED_REQUIRED_MANIFEST_FIELDS = [
  "schemaVersion",
  "addinTarget",
  "generatedAtIso",
  "prismVersion",
  "resources",
];

export const SHARED_REQUIRED_RESOURCE_FIELDS = [
  "id",
  "category",
  "name",
  "version",
];

export const ALL_BRIDGE_TARGETS = ["mastercam", "hypermill", "inventor_hsm"];

/** Pure: assert every entry in needles[] is present in haystack[]. Returns missing items. */
export function findMissing(haystack, needles) {
  if (!Array.isArray(haystack) || !Array.isArray(needles)) return needles || [];
  return needles.filter((n) => !haystack.includes(n));
}

/** Pure: per-target schema export bundle (what each target manifest module ships). */
export function describeTargetContract(target, exports) {
  if (!ALL_BRIDGE_TARGETS.includes(target)) return null;
  if (!exports || typeof exports !== "object") return null;
  return {
    target,
    schemaVersion: Number(exports.MANIFEST_SCHEMA_VERSION),
    addinTarget: exports.ADDIN_TARGET,
    categories: Array.isArray(exports.RESOURCE_CATEGORIES) ? exports.RESOURCE_CATEGORIES : [],
    requiredManifestFields: Array.isArray(exports.REQUIRED_MANIFEST_FIELDS) ? exports.REQUIRED_MANIFEST_FIELDS : [],
    requiredResourceFields: Array.isArray(exports.REQUIRED_RESOURCE_FIELDS) ? exports.REQUIRED_RESOURCE_FIELDS : [],
    hasBuildResourceCatalog: typeof exports.buildResourceCatalog === "function",
    hasValidateManifest: typeof exports.validateManifest === "function",
    hasDiffManifests: typeof exports.diffManifests === "function",
    hasSummarize: typeof exports.summarize === "function",
    hasResolveDialect: typeof exports.resolveDialect === "function",
  };
}

/** Pure: verify cross-target parity. Returns {ok, mismatches[]}. */
export function verifyBridgeParity(args) {
  const mismatches = [];
  const a = args || {};
  for (const tgt of ALL_BRIDGE_TARGETS) {
    if (!a[tgt] || typeof a[tgt] !== "object") {
      mismatches.push(`missing target contract: ${tgt}`);
    }
  }
  if (mismatches.length > 0) return { ok: false, mismatches };

  const contracts = ALL_BRIDGE_TARGETS.map((tgt) => describeTargetContract(tgt, a[tgt]));

  // 1. schemaVersion must match across all targets
  const versions = new Set(contracts.map((c) => c.schemaVersion));
  if (versions.size !== 1) {
    mismatches.push(`schemaVersion divergence across targets: ${[...versions].join(", ")}`);
  }

  // 2. addinTarget must match per-target self-identification
  contracts.forEach((c, i) => {
    if (c.addinTarget !== ALL_BRIDGE_TARGETS[i]) {
      mismatches.push(`target[${ALL_BRIDGE_TARGETS[i]}] addinTarget self-id mismatch: got '${c.addinTarget}'`);
    }
  });

  // 3. every contract must cover SHARED_CORE_CATEGORIES
  contracts.forEach((c) => {
    const missing = findMissing(c.categories, SHARED_CORE_CATEGORIES);
    if (missing.length > 0) {
      mismatches.push(`target[${c.target}] missing core categories: ${missing.join(", ")}`);
    }
  });

  // 4. requiredManifestFields must be identical
  contracts.forEach((c) => {
    const missing = findMissing(c.requiredManifestFields, SHARED_REQUIRED_MANIFEST_FIELDS);
    if (missing.length > 0) {
      mismatches.push(`target[${c.target}] missing required manifest fields: ${missing.join(", ")}`);
    }
  });

  // 5. requiredResourceFields must be identical
  contracts.forEach((c) => {
    const missing = findMissing(c.requiredResourceFields, SHARED_REQUIRED_RESOURCE_FIELDS);
    if (missing.length > 0) {
      mismatches.push(`target[${c.target}] missing required resource fields: ${missing.join(", ")}`);
    }
  });

  // 6. every target must export the 5 canonical functions
  contracts.forEach((c) => {
    if (!c.hasBuildResourceCatalog) mismatches.push(`target[${c.target}] missing buildResourceCatalog`);
    if (!c.hasValidateManifest) mismatches.push(`target[${c.target}] missing validateManifest`);
    if (!c.hasDiffManifests) mismatches.push(`target[${c.target}] missing diffManifests`);
    if (!c.hasSummarize) mismatches.push(`target[${c.target}] missing summarize`);
    if (!c.hasResolveDialect) mismatches.push(`target[${c.target}] missing resolveDialect`);
  });

  return { ok: mismatches.length === 0, mismatches };
}

/** Pure: find dialect operations present in ALL provided dialect maps. */
export function findCommonDialectOps(dialectMaps) {
  if (!Array.isArray(dialectMaps) || dialectMaps.length === 0) return [];
  const sets = dialectMaps.map((m) => m && typeof m === "object" ? new Set(Object.keys(m)) : new Set());
  if (sets.length === 0 || sets[0].size === 0) return [];
  const out = [];
  for (const key of sets[0]) {
    if (sets.every((s) => s.has(key))) out.push(key);
  }
  return out.sort();
}

/** Pure: find dialect operations present in EXACTLY ONE target (target-specific). */
export function findTargetOnlyDialectOps(target, allMaps) {
  if (!target || !allMaps || typeof allMaps !== "object") return [];
  const self = allMaps[target];
  if (!self || typeof self !== "object") return [];
  const selfKeys = Object.keys(self);
  const out = [];
  for (const key of selfKeys) {
    let onlyHere = true;
    for (const t of Object.keys(allMaps)) {
      if (t === target) continue;
      const other = allMaps[t];
      if (other && typeof other === "object" && other[key] !== undefined) {
        onlyHere = false;
        break;
      }
    }
    if (onlyHere) out.push(key);
  }
  return out.sort();
}

/** Pure: namespace-prefix a resource id by target to prevent collision. */
export function canonicalizeResourceId(target, id) {
  if (!ALL_BRIDGE_TARGETS.includes(target)) return null;
  if (typeof id !== "string" || id.length === 0) return null;
  return `${target}::${id}`;
}

/** Pure: parse a canonicalized id back into {target, id}. */
export function parseCanonicalResourceId(canonical) {
  if (typeof canonical !== "string" || canonical.length === 0) return null;
  const sep = canonical.indexOf("::");
  if (sep <= 0 || sep >= canonical.length - 2) return null;
  const target = canonical.slice(0, sep);
  const id = canonical.slice(sep + 2);
  if (!ALL_BRIDGE_TARGETS.includes(target)) return null;
  return { target, id };
}

/** Pure: aggregate parity report across all 3 targets. */
export function summarizeParity(args) {
  const result = verifyBridgeParity(args);
  const out = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    bridgeTargets: ALL_BRIDGE_TARGETS,
    coreCategories: SHARED_CORE_CATEGORIES.length,
    ok: result.ok,
    mismatchCount: result.mismatches.length,
    mismatches: result.mismatches,
  };
  if (args && typeof args === "object") {
    const dialectMaps = {};
    for (const tgt of ALL_BRIDGE_TARGETS) {
      if (args[tgt] && args[tgt].MASTERCAM_DIALECT_MAP) dialectMaps[tgt] = args[tgt].MASTERCAM_DIALECT_MAP;
      else if (args[tgt] && args[tgt].HYPERMILL_DIALECT_MAP) dialectMaps[tgt] = args[tgt].HYPERMILL_DIALECT_MAP;
      else if (args[tgt] && args[tgt].INVENTOR_DIALECT_MAP) dialectMaps[tgt] = args[tgt].INVENTOR_DIALECT_MAP;
    }
    out.commonDialectOps = findCommonDialectOps(Object.values(dialectMaps));
    out.targetOnlyOps = {};
    for (const tgt of ALL_BRIDGE_TARGETS) {
      out.targetOnlyOps[tgt] = findTargetOnlyDialectOps(tgt, dialectMaps);
    }
  }
  return out;
}
