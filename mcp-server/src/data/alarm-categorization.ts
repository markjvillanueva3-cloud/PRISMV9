/**
 * alarm-categorization.ts — the canonical AlarmDB categorization axis.
 * =============================================================================
 * Operator directive (2026-06-01, DB-domain categorization audit, slot juliett): ensure each
 * database domain is properly categorized. AlarmDB was the P0 gap — 2511 alarms with the grouping
 * keys (controller_family / category / severity) stored as raw free-text strings, 1210 (48%)
 * controller_family="undefined", and 52 distinct categories against a 17-value schema (35 strays).
 *
 * Sibling of tool-material-categorization.ts (ISO 513) and holder-categorization.ts (taper×contact):
 * taxonomy const + normalize fn + zod schema + categorize fn. The controller-brand axis is shared,
 * so it is imported from controller-family.ts (NOT re-declared here) — AlarmDB, GCodeTemplateDB and
 * MachineDB all key off the SAME CONTROLLER_FAMILY list.
 *
 * Fail-loud contract (juliett): every normalize returns null on an unrecognized value — NEVER
 * coerces to a default. categorizeAlarm() surfaces a null axis as confidence:"low" rather than
 * silently bucketing to OTHER, so data-quality gaps stay visible.
 */
import { z } from "zod";
import { CONTROLLER_FAMILY, ControllerFamily, normalizeControllerFamily } from "./controller-family.js";

export { CONTROLLER_FAMILY, normalizeControllerFamily };
export type { ControllerFamily };

/** Severity ordinal (matches ALARM_SCHEMA.json + the live data exactly). */
export const ALARM_SEVERITY = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export type AlarmSeverity = (typeof ALARM_SEVERITY)[number];

/** Machine-stoppage ordinal (ALARM_SCHEMA.json) — how the control reacts to the alarm. */
export const MACHINE_STOPPAGE = ["IMMEDIATE", "CONTROLLED", "WARNING_ONLY", "NONE"] as const;
export type MachineStoppage = (typeof MACHINE_STOPPAGE)[number];

/** Canonical alarm subsystem categories — folds the 52 free-text strays in the corpus into a
 *  stable closed set. OTHER is the explicit catch-all (caller-assigned, never by normalize). */
export const ALARM_CATEGORY = [
  "SERVO", "SPINDLE", "AXIS", "ATC", "OVERTRAVEL", "PROGRAM", "SAFETY", "SYSTEM", "PLC",
  "HYDRAULIC", "PNEUMATIC", "LUBRICATION", "COOLANT", "THERMAL", "ENCODER", "DRIVE",
  "COMMUNICATION", "PROBE", "WORKHOLDING", "TAILSTOCK", "TOOL", "NC", "MACHINE", "MEMORY",
  "PARAMETER", "POWER", "IO", "INTERLOCK", "COLLISION", "AUXILIARY", "BATTERY", "OTHER",
] as const;
export type AlarmCategory = (typeof ALARM_CATEGORY)[number];

const CAT_SET = new Set<string>(ALARM_CATEGORY);
const SEV_SET = new Set<string>(ALARM_SEVERITY);
const STOP_SET = new Set<string>(MACHINE_STOPPAGE);

/** Fold the off-schema category strays (UPPERCASE) into canonical keys. Anything not exact-canonical
 *  and not here → null (surfaced, not silently mapped). */
const CATEGORY_ALIASES: Record<string, AlarmCategory> = {
  OVERHEAT: "THERMAL",
  PMC: "PLC",
  AMPLIFIER: "DRIVE",
  PROBING: "PROBE",
  NETWORK: "COMMUNICATION", COMM: "COMMUNICATION",
  "I/O": "IO", INPUT: "IO", OUTPUT: "IO",
  ELECTRICAL: "POWER",
  LATHE: "MACHINE", MILLTURN: "MACHINE", MILL: "MACHINE",
  OPERATION: "PROGRAM", CYCLE: "PROGRAM", CALCULATION: "PROGRAM", TRANSFORMATION: "PROGRAM",
  CONFIGURATION: "PARAMETER", SETUP: "PARAMETER", OPTION: "PARAMETER",
  FILE: "SYSTEM",
};

/** Severity aliases for common variants in raw data. */
const SEVERITY_ALIASES: Record<string, AlarmSeverity> = {
  FATAL: "CRITICAL", SEVERE: "CRITICAL", EMERGENCY: "CRITICAL",
  WARNING: "MEDIUM", WARN: "MEDIUM",
  NOTICE: "LOW", MINOR: "LOW",
  INFORMATION: "INFO", INFORMATIONAL: "INFO",
};

/** Normalize a free-text alarm category to a canonical key, or null if unrecognized. */
export function normalizeAlarmCategory(raw: unknown): AlarmCategory | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toUpperCase();
  if (!k || k === "UNDEFINED" || k === "NULL") return null;
  if (CAT_SET.has(k)) return k as AlarmCategory;
  if (CATEGORY_ALIASES[k]) return CATEGORY_ALIASES[k];
  return null;
}

/** Normalize a free-text severity to a canonical ordinal, or null if unrecognized. */
export function normalizeSeverity(raw: unknown): AlarmSeverity | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toUpperCase();
  if (!k || k === "UNDEFINED" || k === "NULL") return null;
  if (SEV_SET.has(k)) return k as AlarmSeverity;
  if (SEVERITY_ALIASES[k]) return SEVERITY_ALIASES[k];
  return null;
}

/** Normalize a free-text machine-stoppage value to a canonical ordinal, or null. */
export function normalizeMachineStoppage(raw: unknown): MachineStoppage | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!k || k === "UNDEFINED" || k === "NULL") return null;
  return STOP_SET.has(k) ? (k as MachineStoppage) : null;
}

export const AlarmCategorySchema = z.object({
  controllerFamily: z.enum(CONTROLLER_FAMILY).nullable(),
  category: z.enum(ALARM_CATEGORY).nullable(),
  severity: z.enum(ALARM_SEVERITY).nullable(),
  machineStoppage: z.enum(MACHINE_STOPPAGE).nullable().optional(),
  matched: z.object({
    controllerFamilyRaw: z.string().optional(),
    categoryRaw: z.string().optional(),
    severityRaw: z.string().optional(),
  }).optional(),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});
export type AlarmCategoryResult = z.infer<typeof AlarmCategorySchema>;

/** A raw alarm record (subset of the AlarmRegistry Alarm shape) the categorizer reads. */
export interface AlarmLike {
  controller_family?: string;
  family?: string;          // the corpus carries BOTH — `family` recovers many of the 1210 undefined
  alarm_id?: string;        // e.g. "ALM-FANUC-0000" — last-resort family source
  category?: string;
  severity?: string;
  machine_stoppage?: string;
}

/** Recover a controller-family string from a record, in order of reliability:
 *  controller_family → `family` (the PRIMARY recovery for the ~1210 corpus records whose
 *  controller_family is the literal "undefined"; `family` carries the full UPPERCASE brand) →
 *  alarm_id token (best-effort; handles BOTH "ALM-FANUC-0000" full names and "ALM-FAN-000"
 *  abbreviations via the abbreviation aliases in controller-family.ts). */
export function resolveControllerFamilyRaw(rec: AlarmLike): string | undefined {
  if (rec.controller_family && rec.controller_family !== "undefined") return rec.controller_family;
  if (rec.family && rec.family !== "undefined") return rec.family;
  const m = typeof rec.alarm_id === "string" ? rec.alarm_id.match(/^ALM-([A-Za-z_]+)-/) : null;
  return m ? m[1] : undefined;
}

/**
 * Canonical alarm categorization. Accepts a designation string (treated as controller family) OR an
 * alarm record. Reads controller_family→family→alarm_id to recover the brand (fixes the 48% that
 * carry controller_family="undefined" but a populated `family`). Returns nulls (not defaults) for
 * unrecognized axes; confidence is "high" only when the controller family AND category both resolve.
 */
export function categorizeAlarm(input: string | AlarmLike): AlarmCategoryResult {
  const rec: AlarmLike = typeof input === "string" ? { controller_family: input } : (input || {});
  const cfRaw = resolveControllerFamilyRaw(rec);
  const controllerFamily = normalizeControllerFamily(cfRaw ?? null);
  const category = normalizeAlarmCategory(rec.category ?? null);
  const severity = normalizeSeverity(rec.severity ?? null);
  const machineStoppage = rec.machine_stoppage !== undefined ? normalizeMachineStoppage(rec.machine_stoppage) : undefined;

  const resolved = (controllerFamily ? 1 : 0) + (category ? 1 : 0) + (severity ? 1 : 0);
  const confidence = controllerFamily && category ? "high" : resolved >= 1 ? "medium" : "low";

  return AlarmCategorySchema.parse({
    controllerFamily,
    category,
    severity,
    machineStoppage,
    matched: { controllerFamilyRaw: cfRaw, categoryRaw: rec.category, severityRaw: rec.severity },
    confidence,
  });
}
