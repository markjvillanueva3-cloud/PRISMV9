/**
 * hypermill-addin-resource-manifest.mjs — resource-catalog builder,
 * validator, and delta-differ for the hyperMILL add-in bridge.
 *
 * Parallel to mastercam-addin-resource-manifest (iter33) but with
 * hyperMILL-specific differences:
 *   - addinTarget = "hypermill" (no cross-bridge confusion)
 *   - strategy_template added to RESOURCE_CATEGORIES (hyperMILL ships
 *     parameterized strategy files (.hmsteel/.hmgear/.hmaero) — these
 *     are first-class resources the add-in needs to discover/load)
 *   - HYPERMILL_DIALECT_MAP carries Heidenhain TNC + Siemens 840D
 *     primary tokens (hyperMILL's canonical post targets) instead of
 *     Mastercam's Fanuc-dominant token set
 *   - vendor_post_config added (per-controller hyperMILL post-config
 *     XML — Heidenhain TNC640, Siemens 840Dsl, Fanuc 30i, Mazak SMC)
 *
 * Same pure-fn shape as the Mastercam manifest: caller persists JSON,
 * HTTP transport is the add-in's responsibility.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-HYPERMILL-ADDIN-RESOURCES
 * @slot echo · @iter 34 · @date 2026-05-27
 */

export const MANIFEST_SCHEMA_VERSION = 1;
export const ADDIN_TARGET = "hypermill";

export const RESOURCE_CATEGORIES = [
  "post_processor",
  "tool",
  "material",
  "holder",
  "machine_profile",
  "sample_program",
  "dialect_map",
  "strategy_template",
  "vendor_post_config",
];

export const REQUIRED_MANIFEST_FIELDS = [
  "schemaVersion",
  "addinTarget",
  "generatedAtIso",
  "prismVersion",
  "resources",
];

export const REQUIRED_RESOURCE_FIELDS = [
  "id",
  "category",
  "name",
  "version",
];

// hyperMILL-canonical dialect tokens. Where multiple controllers diverge,
// we publish the most common token per controller — the add-in selects
// based on the active vendor_post_config.
export const HYPERMILL_DIALECT_MAP = {
  // Heidenhain TNC (primary hyperMILL post target)
  heidenhain_work_offset_call: "CYCL DEF 247",
  heidenhain_drill_cycle: "CYCL DEF 200",
  heidenhain_peck_cycle: "CYCL DEF 203",
  heidenhain_tap_cycle: "CYCL DEF 207",
  heidenhain_bore_cycle: "CYCL DEF 202",
  heidenhain_rapid: "L FMAX",
  heidenhain_feed: "L F",
  // Siemens 840D (secondary)
  siemens_work_offset_call: "G500-G599",
  siemens_drill_cycle: "CYCLE81",
  siemens_peck_cycle: "CYCLE83",
  siemens_tap_cycle: "CYCLE84",
  // Canonical (Fanuc fallback)
  flood_on: "M8",
  coolant_off: "M9",
  tsc_on: "M88",
  tsc_off: "M89",
  drill_cycle: "G81",
  peck_drill_cycle: "G83",
  tap_cycle: "G84",
  rapid: "G0",
  feed: "G1",
};

export const HYPERMILL_STRATEGY_TEMPLATE_EXTS = [
  ".hmsteel",   // steel-family strategies
  ".hmgear",    // gear-family strategies
  ".hmaero",    // aerospace-family strategies
  ".hmturn",    // turning strategies
  ".hmprobe",   // probing cycles
];

export const HYPERMILL_VENDOR_POST_CONTROLLERS = [
  "heidenhain_tnc640",
  "heidenhain_itnc530",
  "siemens_840dsl",
  "siemens_828d",
  "fanuc_30i",
  "fanuc_31i",
  "mazak_smc",
];

/** Pure: build a fresh hyperMILL resource manifest. */
export function buildResourceCatalog(args) {
  const a = args || {};
  if (typeof a.prismVersion !== "string" || a.prismVersion.length === 0) return null;
  const generatedAtIso = typeof a.generatedAtIso === "string" ? a.generatedAtIso : new Date().toISOString();
  const resourcesIn = Array.isArray(a.resources) ? a.resources : [];
  const resources = [];
  for (const r of resourcesIn) {
    if (!r || typeof r !== "object") continue;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    if (typeof r.category !== "string" || !RESOURCE_CATEGORIES.includes(r.category)) continue;
    if (typeof r.name !== "string" || r.name.length === 0) continue;
    if (typeof r.version !== "string" || r.version.length === 0) continue;
    resources.push({
      id: r.id,
      category: r.category,
      name: r.name,
      version: r.version,
      url: typeof r.url === "string" ? r.url : null,
      sha256: typeof r.sha256 === "string" ? r.sha256 : null,
      sizeBytes: Number.isFinite(Number(r.sizeBytes)) ? Number(r.sizeBytes) : null,
      tags: Array.isArray(r.tags) ? r.tags.filter((t) => typeof t === "string") : [],
      controllerProfile: typeof r.controllerProfile === "string" && HYPERMILL_VENDOR_POST_CONTROLLERS.includes(r.controllerProfile)
        ? r.controllerProfile
        : null,
    });
  }
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    generatedAtIso,
    prismVersion: a.prismVersion,
    resources,
    dialectMap: HYPERMILL_DIALECT_MAP,
    strategyTemplateExtensions: HYPERMILL_STRATEGY_TEMPLATE_EXTS,
    supportedControllers: HYPERMILL_VENDOR_POST_CONTROLLERS,
  };
}

/** Pure: validate a manifest against the schema. */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return { ok: false, errors: ["manifest is not an object"] };
  }
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null) {
      errors.push(`missing required field: ${field}`);
    }
  }
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    errors.push(`schemaVersion mismatch: expected ${MANIFEST_SCHEMA_VERSION}, got ${manifest.schemaVersion}`);
  }
  if (manifest.addinTarget !== ADDIN_TARGET) {
    errors.push(`addinTarget mismatch: expected '${ADDIN_TARGET}', got '${manifest.addinTarget}'`);
  }
  if (!Array.isArray(manifest.resources)) {
    errors.push("resources is not an array");
  } else {
    manifest.resources.forEach((r, i) => {
      if (!r || typeof r !== "object") {
        errors.push(`resource[${i}] is not an object`);
        return;
      }
      for (const field of REQUIRED_RESOURCE_FIELDS) {
        if (r[field] === undefined || r[field] === null) {
          errors.push(`resource[${i}] missing required field: ${field}`);
        }
      }
      if (r.category && !RESOURCE_CATEGORIES.includes(r.category)) {
        errors.push(`resource[${i}] invalid category: '${r.category}'`);
      }
      if (r.category === "vendor_post_config" && r.controllerProfile == null) {
        errors.push(`resource[${i}] vendor_post_config requires controllerProfile`);
      }
    });
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: diff two manifests by resource id. */
export function diffManifests(prev, next) {
  const out = { added: [], removed: [], changed: [] };
  const prevResources = prev && Array.isArray(prev.resources) ? prev.resources : [];
  const nextResources = next && Array.isArray(next.resources) ? next.resources : [];
  const prevById = new Map(prevResources.map((r) => [r.id, r]));
  const nextById = new Map(nextResources.map((r) => [r.id, r]));
  for (const [id, nr] of nextById) {
    const pr = prevById.get(id);
    if (!pr) {
      out.added.push(id);
    } else if (pr.version !== nr.version || pr.sha256 !== nr.sha256) {
      out.changed.push({ id, fromVersion: pr.version, toVersion: nr.version });
    }
  }
  for (const [id] of prevById) {
    if (!nextById.has(id)) out.removed.push(id);
  }
  return out;
}

/** Pure: per-category + per-controller resource counts. */
export function summarize(manifest) {
  const base = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    totalResources: 0,
    byCategory: {},
    byController: {},
  };
  for (const c of RESOURCE_CATEGORIES) base.byCategory[c] = 0;
  for (const c of HYPERMILL_VENDOR_POST_CONTROLLERS) base.byController[c] = 0;
  if (!manifest || !Array.isArray(manifest.resources)) return base;
  base.totalResources = manifest.resources.length;
  for (const r of manifest.resources) {
    if (r && typeof r.category === "string" && base.byCategory[r.category] != null) {
      base.byCategory[r.category]++;
    }
    if (r && typeof r.controllerProfile === "string" && base.byController[r.controllerProfile] != null) {
      base.byController[r.controllerProfile]++;
    }
  }
  return base;
}

/** Pure: resolve a canonical PRISM operation to its hyperMILL dialect token. */
export function resolveDialect(operation) {
  if (typeof operation !== "string" || operation.length === 0) return null;
  const token = HYPERMILL_DIALECT_MAP[operation];
  return token != null ? token : null;
}

/** Pure: check if a filename extension is a hyperMILL strategy template. */
export function isStrategyTemplateFile(filename) {
  if (typeof filename !== "string" || filename.length === 0) return false;
  const lower = filename.toLowerCase();
  for (const ext of HYPERMILL_STRATEGY_TEMPLATE_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}
