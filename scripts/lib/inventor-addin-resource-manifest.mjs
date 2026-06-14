/**
 * inventor-addin-resource-manifest.mjs — resource-catalog builder,
 * validator, and delta-differ for the Inventor HSM add-in bridge.
 *
 * Parallel to iter33 (Mastercam) and iter34 (hyperMILL). Inventor HSM is
 * the Autodesk Inventor CAM module (shared engine with Fusion 360 HSM —
 * historical name "HSMWorks"), so the dialect inherits canonical Fanuc
 * primary tokens AND Fusion-tuned probing + adaptive overrides.
 *
 * Inventor-specific resource categories:
 *   + iam_assembly_template — Inventor assembly (.iam) post-out template
 *   + idw_drawing_template  — Inventor drawing (.idw) post-out template
 *   + adaptive_clearing_preset — Fusion/HSM adaptive-clearing preset XML
 *   + probing_routine — Renishaw-style probing macro (.cnc/.f3d)
 *
 * INVENTOR_DIALECT_MAP carries Fanuc-canonical M-codes + Fusion-HSM-
 * specific tokens for adaptive control, probing pre-position, retract
 * mode preferences. Inventor HSM defaults to Fanuc-compatible output so
 * the dialect is the most overlap-friendly of the three add-ins.
 *
 * Same pure-fn shape as siblings.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-INVENTOR-ADDIN-RESOURCES
 * @slot echo · @iter 35 · @date 2026-05-27
 */

export const MANIFEST_SCHEMA_VERSION = 1;
export const ADDIN_TARGET = "inventor_hsm";

export const RESOURCE_CATEGORIES = [
  "post_processor",
  "tool",
  "material",
  "holder",
  "machine_profile",
  "sample_program",
  "dialect_map",
  "iam_assembly_template",
  "idw_drawing_template",
  "adaptive_clearing_preset",
  "probing_routine",
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

export const INVENTOR_DIALECT_MAP = {
  // Canonical Fanuc-compatible tokens (Inventor HSM defaults)
  work_offsets: ["G54", "G55", "G56", "G57", "G58", "G59"],
  drill_cycle: "G81",
  spot_drill_cycle: "G82",
  peck_drill_cycle: "G83",
  tap_cycle: "G84",
  rigid_tap_cycle: "G84.2",
  bore_cycle: "G85",
  rapid: "G0",
  feed: "G1",
  arc_cw: "G2",
  arc_ccw: "G3",
  flood_on: "M8",
  coolant_off: "M9",
  tsc_on: "M88",
  tsc_off: "M89",
  // Fusion-HSM-specific tokens
  adaptive_load_factor: "ADAPTIVE_LOAD",
  adaptive_min_radius: "ADAPTIVE_MIN_R",
  probe_pre_position: "G65 P9810",
  probe_single_surface: "G65 P9811",
  probe_bore_id: "G65 P9812",
  probe_boss_od: "G65 P9814",
  retract_mode_safe: "G0 G53 Z0",
  retract_mode_optimized: "G0 Z",
};

export const INVENTOR_PROBING_MACROS = ["P9810", "P9811", "P9812", "P9814", "P9815", "P9816", "P9817"];

export const INVENTOR_HSM_LICENSE_TIERS = ["hsm_express", "hsm_premium", "hsm_ultimate"];

/** Pure: build a fresh Inventor HSM resource manifest. */
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
      licenseTier: typeof r.licenseTier === "string" && INVENTOR_HSM_LICENSE_TIERS.includes(r.licenseTier)
        ? r.licenseTier
        : null,
    });
  }
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    generatedAtIso,
    prismVersion: a.prismVersion,
    resources,
    dialectMap: INVENTOR_DIALECT_MAP,
    probingMacros: INVENTOR_PROBING_MACROS,
    licenseTiers: INVENTOR_HSM_LICENSE_TIERS,
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
      if (r.category === "adaptive_clearing_preset" && r.licenseTier == null) {
        errors.push(`resource[${i}] adaptive_clearing_preset requires licenseTier (Premium/Ultimate only)`);
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

/** Pure: per-category + per-license-tier resource counts. */
export function summarize(manifest) {
  const base = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    totalResources: 0,
    byCategory: {},
    byLicenseTier: {},
  };
  for (const c of RESOURCE_CATEGORIES) base.byCategory[c] = 0;
  for (const t of INVENTOR_HSM_LICENSE_TIERS) base.byLicenseTier[t] = 0;
  if (!manifest || !Array.isArray(manifest.resources)) return base;
  base.totalResources = manifest.resources.length;
  for (const r of manifest.resources) {
    if (r && typeof r.category === "string" && base.byCategory[r.category] != null) {
      base.byCategory[r.category]++;
    }
    if (r && typeof r.licenseTier === "string" && base.byLicenseTier[r.licenseTier] != null) {
      base.byLicenseTier[r.licenseTier]++;
    }
  }
  return base;
}

/** Pure: resolve a canonical PRISM operation to its Inventor HSM dialect token. */
export function resolveDialect(operation) {
  if (typeof operation !== "string" || operation.length === 0) return null;
  const token = INVENTOR_DIALECT_MAP[operation];
  return token != null ? token : null;
}

/** Pure: is a macro number one of Inventor HSM's canonical Renishaw probing macros? */
export function isProbingMacro(macroId) {
  if (typeof macroId !== "string" || macroId.length === 0) return false;
  return INVENTOR_PROBING_MACROS.includes(macroId.toUpperCase());
}
