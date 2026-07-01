/**
 * mastercam-addin-resource-manifest.mjs — resource-catalog builder, validator,
 * and delta-differ for the Mastercam add-in bridge.
 *
 * The Mastercam add-in surfaces PRISM intelligence inside Mastercam itself
 * (post processors, tool library, material library, holder library, machine
 * profiles, sample programs, dialect-translation tables). The add-in does NOT
 * embed PRISM logic — it pulls a *resource manifest* describing what's
 * available, what version, and where to fetch it. This lets the add-in stay
 * thin (UI only) while PRISM owns the truth.
 *
 * This pure-fn library is the manifest substrate:
 *   - RESOURCE_CATEGORIES — canonical category whitelist
 *   - buildResourceCatalog() — turn (versioned) PRISM state into a manifest
 *   - validateManifest() — schema check (fail-loud on missing required fields)
 *   - diffManifests() — what was added/removed/changed between two manifests
 *   - summarize() — per-category counts for dashboards
 *
 * The MASTERCAM_DIALECT_MAP is the seed lookup the add-in uses to translate
 * canonical PRISM post-output to Mastercam's expected dialect (e.g.
 * G54 .. G59.7 work offsets, M88/M89 TSC, cycle G81/G82/G83 variants).
 *
 * Pure functions only. Caller persists JSON; HTTP transport is the add-in's
 * responsibility, not this library's.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-MASTERCAM-ADDIN-RESOURCES
 * @slot echo · @iter 33 · @date 2026-05-27
 */

export const MANIFEST_SCHEMA_VERSION = 1;
export const ADDIN_TARGET = "mastercam";

export const RESOURCE_CATEGORIES = [
  "post_processor",
  "tool",
  "material",
  "holder",
  "machine_profile",
  "sample_program",
  "dialect_map",
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

export const MASTERCAM_DIALECT_MAP = {
  work_offsets: ["G54", "G55", "G56", "G57", "G58", "G59", "G59.1", "G59.2", "G59.3", "G59.4", "G59.5", "G59.6", "G59.7"],
  tsc_on: "M88",
  tsc_off: "M89",
  flood_on: "M8",
  coolant_off: "M9",
  drill_cycle: "G81",
  spot_drill_cycle: "G82",
  peck_drill_cycle: "G83",
  tap_cycle: "G84",
  bore_cycle: "G85",
  rapid: "G0",
  feed: "G1",
  arc_cw: "G2",
  arc_ccw: "G3",
};

/** Pure: build a fresh resource manifest from a list of resource entries. */
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
    });
  }
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    generatedAtIso,
    prismVersion: a.prismVersion,
    resources,
    dialectMap: MASTERCAM_DIALECT_MAP,
  };
}

/** Pure: validate a manifest against the schema. Returns {ok, errors[]}. */
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
    });
  }
  return { ok: errors.length === 0, errors };
}

/** Pure: diff two manifests by resource id. Returns {added[], removed[], changed[]}. */
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

/** Pure: per-category resource counts. */
export function summarize(manifest) {
  const base = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    addinTarget: ADDIN_TARGET,
    totalResources: 0,
    byCategory: {},
  };
  for (const c of RESOURCE_CATEGORIES) base.byCategory[c] = 0;
  if (!manifest || !Array.isArray(manifest.resources)) return base;
  base.totalResources = manifest.resources.length;
  for (const r of manifest.resources) {
    if (r && typeof r.category === "string" && base.byCategory[r.category] != null) {
      base.byCategory[r.category]++;
    }
  }
  return base;
}

/** Pure: resolve a canonical PRISM operation to its Mastercam dialect token. */
export function resolveDialect(operation) {
  if (typeof operation !== "string" || operation.length === 0) return null;
  const token = MASTERCAM_DIALECT_MAP[operation];
  return token != null ? token : null;
}
