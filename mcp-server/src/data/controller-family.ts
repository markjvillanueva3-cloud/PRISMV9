/**
 * controller-family.ts — the canonical, cross-domain CONTROLLER-BRAND axis.
 * =============================================================================
 * One source of truth for "which CNC control brand" — shared by AlarmDB (alarm-categorization.ts),
 * GCodeTemplateDB, MachineDB, and the post-processor dialect layer. Built 2026-06-01 (slot juliett,
 * DB-domain categorization audit) because the alarm corpus carries 12 distinct families (+1210
 * "undefined") while ControllerDialectEngine's `type ControllerFamily` enumerated only 6 and
 * ALARM_SCHEMA.json's enum omitted DOOSAN + DMG_MORI that the data actually contains.
 *
 * Canonical form is UPPERCASE (matches ALARM_SCHEMA.json, the alarm data, and the existing
 * AlarmRegistry index convention). normalizeControllerFamily() folds free-text / model-suffixed /
 * spaced variants ("DMG MORI", "Fanuc 30i", "Mazatrol", "Sinumerik 840D") to a canonical key and
 * returns null on a genuinely unknown brand — NEVER silently coerces to OTHER (the caller decides
 * whether an unknown brand is bucketed to OTHER or surfaced as a data-quality issue).
 */
import { z } from "zod";

/** Canonical controller-brand families (UPPERCASE). Superset of ALARM_SCHEMA.json enum + the
 *  DOOSAN/DMG_MORI families present in the live alarm corpus. OTHER is the explicit catch-all
 *  bucket — only assigned by a caller, never by normalize(). */
export const CONTROLLER_FAMILY = [
  "FANUC", "SIEMENS", "HAAS", "HEIDENHAIN", "OKUMA", "MAZAK", "MITSUBISHI",
  "BROTHER", "HURCO", "FAGOR", "DMG_MORI", "DOOSAN", "NUM", "CENTROID", "MACH", "OTHER",
] as const;
export type ControllerFamily = (typeof CONTROLLER_FAMILY)[number];

const CANON = new Set<string>(CONTROLLER_FAMILY);

/** Exact aliases (normalized key → canonical) for names that are NOT a brand prefix.
 *  Includes the 3-letter alarm_id abbreviations the corpus uses ("ALM-FAN-000" → FAN → FANUC).
 *  These MUST stay EXACT-keyed (never prefix/substring) — e.g. "bro" must not match inside
 *  "brother", "fag" must not over-trigger — so they live here, not in BRAND_TOKENS. */
const EXACT_ALIASES: Record<string, ControllerFamily> = {
  fan: "FANUC", oku: "OKUMA", maz: "MAZAK", hei: "HEIDENHAIN", mit: "MITSUBISHI",
  doo: "DOOSAN", sie: "SIEMENS", hur: "HURCO", fag: "FAGOR", bro: "BROTHER", haa: "HAAS",
  sinumerik: "SIEMENS",
  mazatrol: "MAZAK", matrix: "MAZAK", smooth: "MAZAK", smoothx: "MAZAK", smoothg: "MAZAK",
  meldas: "MITSUBISHI",
  ngc: "HAAS",
  tnc: "HEIDENHAIN", itnc: "HEIDENHAIN",
  osp: "OKUMA",
  winmax: "HURCO", ultimax: "HURCO",
  speedio: "BROTHER",
  flexium: "NUM",
  acorn: "CENTROID", oak: "CENTROID",
  celos: "DMG_MORI",
};

/** Brand tokens checked by prefix/substring AFTER exact checks. ORDER MATTERS — longer / more
 *  specific tokens first so "dmgmori" wins over "dmg", "mazatrol" is caught before generic, etc. */
const BRAND_TOKENS: [string, ControllerFamily][] = [
  ["dmgmori", "DMG_MORI"], ["dmg", "DMG_MORI"],
  ["sinumerik", "SIEMENS"], ["siemens", "SIEMENS"],
  ["mazatrol", "MAZAK"], ["mazak", "MAZAK"],
  ["heidenhain", "HEIDENHAIN"],
  ["mitsubishi", "MITSUBISHI"], ["meldas", "MITSUBISHI"],
  ["brother", "BROTHER"], ["speedio", "BROTHER"],
  ["hurco", "HURCO"], ["winmax", "HURCO"],
  ["fagor", "FAGOR"],
  ["doosan", "DOOSAN"],
  ["centroid", "CENTROID"],
  ["okuma", "OKUMA"], ["osp", "OKUMA"],           // OSP-P300 / ospp300 → Okuma control line
  ["itnc", "HEIDENHAIN"], ["tnc", "HEIDENHAIN"],  // (i)TNC 640/530 control line (brand token added above)
  ["fanuc", "FANUC"],
  ["haas", "HAAS"], ["ngc", "HAAS"],              // Haas NGC control line
  ["mach", "MACH"],
];

/**
 * Normalize a free-text controller-brand string to a canonical CONTROLLER_FAMILY key.
 * Folds casing, separators, and model suffixes ("Fanuc 30i" → FANUC, "DMG MORI" → DMG_MORI,
 * "Sinumerik 840D" → SIEMENS). Returns null for empty / "undefined" / "null" / unknown brands.
 */
export function normalizeControllerFamily(raw: unknown): ControllerFamily | null {
  if (typeof raw !== "string") return null;
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key || key === "undefined" || key === "null") return null;

  // exact canonical (case-insensitive)
  const upper = key.toUpperCase();
  if (CANON.has(upper)) return upper as ControllerFamily;
  // exact alias
  if (EXACT_ALIASES[key]) return EXACT_ALIASES[key];
  // brand prefix/substring (catches model suffixes: fanuc30i, osp-p300, tnc640)
  for (const [tok, fam] of BRAND_TOKENS) {
    if (key.startsWith(tok) || key.includes(tok)) return fam;
  }
  return null;
}

export const ControllerFamilySchema = z.enum(CONTROLLER_FAMILY);
