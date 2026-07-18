#!/usr/bin/env node
// tool-unit-convert.mjs -- field-selective mm -> inch conversion for Fusion 360 `.tools` libraries.
//
// WHY (slot:romeo, 2026-06-21): JM Die is an INCH shop ("we do everything in inches"). The brand
// tool catalogs were emitted with `unit:"millimeters"` and physically-correct mm geometry. The values
// are NOT wrong (a 1/2in end mill is correctly 12.7mm) but they read as metric to an inch shop. This
// lib converts a Fusion tool object to native inches the SAFE way: it scales ONLY the length-valued
// geometry/holder fields by 1/25.4 and leaves angles (HA/TA/thread-profile-angle) and integer counts
// (NOF/NT) untouched. Mis-scaling an angle or a flute count would be a silent corruption, so the
// field classification is an explicit allow/deny set -- never a heuristic.
//
// UNITS-FIRST: a 25.4x error in EITHER direction is catastrophic. The conversion is idempotent
// (a tool already `unit:"inches"` is returned unchanged) and it REFUSES a feed-bearing tool: Fusion
// `start-values` presets carry a length-based feed-per-rev (`f_n`, mm/rev) that would also need
// scaling -- converting geometry while leaving feeds in mm/min yields a 25.4x feed mismatch, so the
// converter throws rather than silently corrupt. Feed-bearing libs stay in mm (Fusion still displays
// mm tools correctly inside an inch document).

export const MM_PER_INCH = 25.4;

// Fusion CAM geometry keys that are LENGTHS (mm in the source) -> scaled by 1/25.4.
// Sourced from the live brand `.tools` (DC/SFDM/LCF/OAL/RE) + the legacy JM_Milling/crib schema
// (DCN/LF/shoulder-length/shaft-diameter/tip-diameter/tip-length) + standard Fusion neck/shaft fields.
export const LENGTH_GEOMETRY_KEYS = new Set([
  "DC", "DCN", "SFDM", "LF", "LCF", "OAL", "RE", "LB",
  "shoulder-length", "shaft-diameter", "shaft-length",
  "tip-diameter", "tip-length", "neck-diameter", "neck-length",
  "BLD", "NW",
]);

// Geometry keys that are explicitly NOT lengths -- angles (degrees) and integer counts/booleans. Listed
// so a test can assert KNOWN = LENGTH u NON_LENGTH covers every key the emitter/legacy libs actually
// emit (an UNKNOWN key is left untouched by convertToolMmToInch, so this set is the audit anchor).
// SIG = drill point angle (deg, 90..140 across 26 libs); HAND = handedness boolean (R/L).
export const NON_LENGTH_GEOMETRY_KEYS = new Set([
  "HA", "TA", "NOF", "NT", "thread-profile-angle", "SIG", "HAND",
]);

// Geometry keys whose UNIT is genuinely UNVERIFIED. They are 0 across the entire current corpus, so
// leaving them unchanged cannot produce a wrong value today -- but convertToolMmToInch FAILS LOUD if it
// ever meets a NON-zero value, rather than silently risk a 25.4x error. TP (thread pitch vs taper vs
// threads-per-inch -- ambiguous; 0 on every non-thread tool) is the only member.
export const UNVERIFIED_GEOMETRY_KEYS = new Set(["TP"]);

// Holder segment fields are all lengths (profile diameters + heights) in the Fusion holder schema.
export const HOLDER_SEGMENT_LENGTH_KEYS = ["upper-diameter", "lower-diameter", "height"];

/** Scale one millimetre value to inches, rounded to `dp`. Non-finite/non-number passes through
 *  unchanged (a null/absent length must stay absent, never become 0in). */
export function mmToInch(value, dp = 6) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  return +(value / MM_PER_INCH).toFixed(dp);
}

/** Geometry keys present on `tool` that are in NO classification set (length / non-length / unverified)
 *  -- these would be left as-is by convertToolMmToInch, so a non-empty result is an audit signal that a
 *  new field needs classifying before it can silently mis-scale a tool. */
export function unknownGeometryKeys(tool) {
  const g = tool?.geometry;
  if (!g || typeof g !== "object") return [];
  return Object.keys(g).filter(
    (k) => !LENGTH_GEOMETRY_KEYS.has(k) && !NON_LENGTH_GEOMETRY_KEYS.has(k) && !UNVERIFIED_GEOMETRY_KEYS.has(k),
  );
}

// ## Feed-preset unit classification (verified vs a known-good inch crib + machining identities)
// Fusion stores feeds in the TOOL's unit. v_f = n * f_z * NOF holds in both mm + inch libs, proving the
// feed-rate fields share the tool length unit and rpm does not. v_c is a SURFACE SPEED -- m/min in metric,
// SFM (ft/min) in imperial -- so it scales by ft-per-metre, NOT 1/25.4 (459 SFM / 3.28 = 140 m/min; the
// 1/25.4 or x25.4 alternatives give physically-absurd 18 or 11658).
export const FT_PER_M = 3.280839895; // metres/min surface speed -> surface feet/min (SFM)
export const FEED_LENGTH_KEYS = new Set([
  "f_n", "f_z", "v_f", "v_f_leadIn", "v_f_leadOut", "v_f_plunge", "v_f_ramp", "v_f_transition",
  "f_ramp", "stepdown", "stepover",
]);
export const FEED_SURFACE_SPEED_KEYS = new Set(["v_c"]);
// rpm (n/n_ramp), angle (ramp-angle), booleans, and string metadata are unit-independent. `expressions`
// is a derived formula string (the authoritative numeric n/f/v fields are converted; leave it as-is).
export const FEED_UNCHANGED_KEYS = new Set([
  "n", "n_ramp", "ramp-angle", "use-stepdown", "use-stepover",
  "guid", "name", "description", "material", "tool-coolant", "tool_coolant", "expressions",
]);

/** Convert one Fusion feed PRESET object mm->inch (field-selective). Feed-rate fields scale 1/25.4,
 *  v_c (surface speed) scales by FT_PER_M (m/min -> SFM), rpm/angle/bool/string are unchanged.
 *  FAILS LOUD on any unclassified preset field -- a new feed field must be verified, never guessed. */
export function convertPresetMmToInch(preset, dp = 6) {
  if (!preset || typeof preset !== "object") return preset;
  const out = {};
  for (const [k, v] of Object.entries(preset)) {
    if (FEED_LENGTH_KEYS.has(k)) out[k] = mmToInch(v, dp);
    else if (FEED_SURFACE_SPEED_KEYS.has(k)) {
      out[k] = typeof v === "number" && Number.isFinite(v) ? +(v * FT_PER_M).toFixed(dp) : v;
    } else if (FEED_UNCHANGED_KEYS.has(k)) out[k] = v;
    else {
      throw new Error(
        `convertPresetMmToInch: unverified preset field "${k}" -- its mm/inch unit is unknown; refusing ` +
          "to guess (a wrong feed/speed is a scrap/tool-break risk). Classify it first.",
      );
    }
  }
  return out;
}

/**
 * Convert a Fusion `.tools` tool object from millimetres to inches (field-selective, immutable).
 *  - idempotent: a tool already `unit:"inches"` is returned unchanged.
 *  - scales LENGTH_GEOMETRY_KEYS + holder segment lengths; leaves angles/counts/unknown keys as-is.
 *  - feed presets (start-values.presets): by DEFAULT REFUSES (throws) a feed-bearing tool, because
 *    Fusion stores feeds in the tool's unit (verified: an inch crib's f_n/f_z/v_f are in/rev,
 *    in/tooth, IPM) -- converting geometry while leaving feeds in mm yields a 25.4x feed mismatch.
 *    Pass `opts.convertPreset(preset) -> preset` to convert each preset (the caller owns the feed-field
 *    unit semantics: n is rpm/unit-independent, f_n/f_z are length-based and scale by 1/25.4, v_c is
 *    m/min->SFM, etc.). The whole tool (incl. unit) is still set to inches.
 * @param {{dp?:number, convertPreset?:((preset:object)=>object)|null}} opts
 * @returns {object} a new tool object with `unit:"inches"`.
 */
export function convertToolMmToInch(tool, opts = {}) {
  if (!tool || typeof tool !== "object") return tool;
  if (tool.unit === "inches") return tool; // idempotent -- already inches
  const { dp = 6, convertPreset = null } = typeof opts === "number" ? { dp: opts } : opts;

  const out = { ...tool, unit: "inches" };

  const presets = tool["start-values"]?.presets;
  if (Array.isArray(presets) && presets.length > 0) {
    if (typeof convertPreset !== "function") {
      throw new Error(
        "convertToolMmToInch: tool carries feed presets (start-values.presets); Fusion feeds are in " +
          "the tool unit, so geometry+feeds must convert together -- pass opts.convertPreset, or leave mm",
      );
    }
    out["start-values"] = { ...tool["start-values"], presets: presets.map((p) => convertPreset(p)) };
  }

  if (tool.geometry && typeof tool.geometry === "object") {
    const g = {};
    for (const [k, v] of Object.entries(tool.geometry)) {
      // an UNVERIFIED-unit field is safe to leave only while it is 0/absent; fail loud on a real value.
      if (UNVERIFIED_GEOMETRY_KEYS.has(k) && typeof v === "number" && Number.isFinite(v) && v !== 0) {
        throw new Error(
          `convertToolMmToInch: geometry field "${k}" has an UNVERIFIED unit and a non-zero value (${v}); ` +
            "refusing to risk a 25.4x error -- classify it first",
        );
      }
      g[k] = LENGTH_GEOMETRY_KEYS.has(k) ? mmToInch(v, dp) : v; // angles/counts/booleans/unverified untouched
    }
    out.geometry = g;
  }
  if (tool.holder && Array.isArray(tool.holder.segments) && tool.holder.segments.length > 0) {
    out.holder = {
      ...tool.holder,
      segments: tool.holder.segments.map((seg) => {
        const s = { ...seg };
        for (const k of HOLDER_SEGMENT_LENGTH_KEYS) if (k in s) s[k] = mmToInch(s[k], dp);
        return s;
      }),
    };
  }
  return out;
}

/**
 * Null/repair impossible LENGTH geometry on a millimetre `.tools` tool (parse-artifact hygiene).
 * Immutable. The cutting diameter (DC) is left to the separate end-mill-oversize gate; here:
 *  - OAL / LF / LCF / tip-length past its ceiling -> the field is DELETED (Fusion derives a default).
 *  - SFDM / shaft-diameter past `shankMax` (or <=0) -> reset to DC (a straight shank ~ cutting dia),
 *    or deleted when there is no DC to fall back to.
 * @param {object} tool
 * @param {{oalMax:number, lcfMax:number, shankMax:number}} bounds
 * @returns {{tool:object, changed:boolean}}
 */
export function sanitizeToolGeometryMm(tool, { oalMax, lcfMax, shankMax }) {
  if (!tool?.geometry || typeof tool.geometry !== "object") return { tool, changed: false };
  const g = { ...tool.geometry };
  const dc = typeof g.DC === "number" && Number.isFinite(g.DC) ? g.DC : null;
  let changed = false;
  // "must be positive" lengths: a present OAL/flute-length cannot be 0/negative/oversize -> delete.
  // (Fields where 0 is a legitimate "none" value -- tip-length, shoulder-length -- are intentionally
  // NOT swept here: 0 there is valid, not garbage.)
  const badLen = (v, max) => typeof v === "number" && !(Number.isFinite(v) && v > 0 && v <= max);
  for (const [key, max] of [["OAL", oalMax], ["LF", lcfMax], ["LCF", lcfMax]]) {
    if (key in g && badLen(g[key], max)) { delete g[key]; changed = true; }
  }
  for (const key of ["SFDM", "shaft-diameter"]) {
    if (key in g && badLen(g[key], shankMax)) {
      if (dc != null) g[key] = dc; else delete g[key];
      changed = true;
    }
  }
  return changed ? { tool: { ...tool, geometry: g }, changed: true } : { tool, changed: false };
}
