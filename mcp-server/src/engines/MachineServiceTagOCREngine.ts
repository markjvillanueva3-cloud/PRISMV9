/**
 * MachineServiceTagOCREngine — QUOTING-PIPELINE-MS0 / U-QP04
 *
 * Extracts {make, model, serial} from an OCR'd machine service-tag photo.
 * Builds on ImageOCRPipelineEngine output (pre-extracted text).
 *
 * Per R12 fail-loud:
 *   - Missing required fields → `result.success=false` with explicit `missing[]`
 *   - NEVER silently return empty strings or "Unknown" without flagging
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP04-MACHINE-SERVICE-TAG-OCR
 * @author slot:charlie /goal-13 iter3, 2026-05-24
 */

export interface ServiceTagInput {
  text: string;
  ocrConfidence?: number;
}

export interface ServiceTagFields {
  make: string | null;
  model: string | null;
  serial: string | null;
  voltage: string | null;
  spindle_hp: string | null;
  mfg_date: string | null;
}

export interface ServiceTagResult {
  success: boolean;
  fields: ServiceTagFields;
  /** Per-field confidence (0..1) — caller uses for fail-loud gating */
  field_confidence: Record<keyof ServiceTagFields, number>;
  missing: Array<keyof ServiceTagFields>;
  overall_confidence: number;
  reason?: string;
}

/** Canonical machine-builder names (case-insensitive). */
const BUILDERS = [
  "HAAS", "OKUMA", "MAZAK", "DOOSAN", "HURCO", "MORI SEIKI", "DMG MORI",
  "MAKINO", "MATSUURA", "TSUGAMI", "KITAMURA", "BROTHER", "FANUC",
  "SODICK", "AGIE", "MITSUBISHI EDM", "CHARMILLES", "ROBOFIL", "ROKU-ROKU",
  "ROBODRILL", "INTEGREX", "MAKINO EDM",
];

/** Per-builder model pattern — bounded quantifiers (\w{0,12}) prevent catastrophic backtracking on oversized text. */
const MODEL_HINTS = [
  /\b(VF|UMC|ST|VR|GR|MT|TM|TL|ES)[-\s]?\d{1,4}(\.\d{1,2})?\w{0,8}\b/i, // Haas family
  /\b(LB|MULTUS|GENOS|LU|MA|MB|MU|VAC)[-\s]?\d{1,4}\w{0,8}\b/i,         // Okuma + Mori
  /\b(VM|VMX|TMM|TMX|VTXU)[-\s]?\d{1,4}\w{0,8}\b/i,                     // Hurco
  /\b(INTEGREX|VARIAXIS|VORTEX|QTU|QTS|QT|HCN)[-\s]?[A-Z0-9-]{1,12}\b/i, // Mazak
  /\b(AQ|SL|EM|VL|SLP)\d{1,5}[A-Z]{0,3}\b/i,                            // Sodick wire EDM
  /\b(VMS|VMM)\d{1,4}[A-Z]?\w{0,4}\b/i,                                 // Makino (VF handled by Haas pattern)
];

const SERIAL_PATTERNS = [
  /\b(?:S\/N|SERIAL\s*NO?|SN)[\s:#]+([A-Z0-9-]{4,20})\b/i,
  /\b(?:SERIAL\s*NUMBER)[\s:#]+([A-Z0-9-]{4,20})\b/i,
];

const VOLTAGE_PATTERN = /\b(?:VOLTAGE|VOLT|VOLTS)[\s:#]*(\d{2,4})\b|\b(\d{3,4})\s*V(?:OLT)?\b/i;
const HP_PATTERN = /\b(?:SPINDLE\s*)?(?:HP|POWER)[\s:#]*(\d+(?:\.\d+)?)\s*HP?\b/i;
const DATE_PATTERN = /\b(?:MFG\s*DATE|MANUFACTURED|MFD)[\s:#]+(\d{4}(?:[-/]\d{1,2})?(?:[-/]\d{1,2})?)\b/i;

function extractBuilder(text: string): { make: string | null; confidence: number } {
  const upper = text.toUpperCase();
  for (const b of BUILDERS) {
    if (upper.includes(b)) return { make: b, confidence: 0.90 };
  }
  return { make: null, confidence: 0 };
}

function extractModel(text: string): { model: string | null; confidence: number } {
  for (const re of MODEL_HINTS) {
    const m = text.match(re);
    if (m) return { model: m[0].toUpperCase().replace(/\s+/g, "-"), confidence: 0.85 };
  }
  return { model: null, confidence: 0 };
}

function extractSerial(text: string): { serial: string | null; confidence: number } {
  for (const re of SERIAL_PATTERNS) {
    const m = text.match(re);
    if (m) return { serial: m[1].toUpperCase(), confidence: 0.90 };
  }
  return { serial: null, confidence: 0 };
}

function extractScalarOpt(text: string, re: RegExp, conf: number): { value: string | null; confidence: number } {
  const m = text.match(re);
  if (m) {
    // Use first non-empty capture group (handles alternation in voltage pattern)
    const value = m[1] ?? m[2] ?? null;
    if (value) return { value, confidence: conf };
  }
  return { value: null, confidence: 0 };
}

export class MachineServiceTagOCREngine {
  extract(input: ServiceTagInput): ServiceTagResult {
    if (!input || typeof input.text !== "string" || input.text.trim().length === 0) {
      const empty: ServiceTagFields = { make: null, model: null, serial: null, voltage: null, spindle_hp: null, mfg_date: null };
      return {
        success: false,
        fields: empty,
        field_confidence: { make: 0, model: 0, serial: 0, voltage: 0, spindle_hp: 0, mfg_date: 0 },
        missing: ["make", "model", "serial", "voltage", "spindle_hp", "mfg_date"],
        overall_confidence: 0,
        reason: "empty-or-missing-text",
      };
    }

    const builder = extractBuilder(input.text);
    const model = extractModel(input.text);
    const serial = extractSerial(input.text);
    const voltage = extractScalarOpt(input.text, VOLTAGE_PATTERN, 0.85);
    const hp = extractScalarOpt(input.text, HP_PATTERN, 0.85);
    const date = extractScalarOpt(input.text, DATE_PATTERN, 0.80);

    const fields: ServiceTagFields = {
      make: builder.make,
      model: model.model,
      serial: serial.serial,
      voltage: voltage.value,
      spindle_hp: hp.value,
      mfg_date: date.value,
    };
    const field_confidence: Record<keyof ServiceTagFields, number> = {
      make: builder.confidence,
      model: model.confidence,
      serial: serial.confidence,
      voltage: voltage.confidence,
      spindle_hp: hp.confidence,
      mfg_date: date.confidence,
    };
    const missing = (Object.keys(fields) as Array<keyof ServiceTagFields>).filter((k) => fields[k] === null);
    // Required fields for "success" verdict: make + model + serial. The rest are nice-to-have.
    const requiredMissing = missing.filter((k) => k === "make" || k === "model" || k === "serial");
    const success = requiredMissing.length === 0;

    let overall = (builder.confidence + model.confidence + serial.confidence) / 3;
    if (typeof input.ocrConfidence === "number" && Number.isFinite(input.ocrConfidence)) {
      overall *= Math.max(0, Math.min(1, input.ocrConfidence));
    }

    return {
      success,
      fields,
      field_confidence,
      missing,
      overall_confidence: overall,
      reason: success ? undefined : `missing-required-fields:${requiredMissing.join(",")}`,
    };
  }
}

export const machineServiceTagOCREngine = new MachineServiceTagOCREngine();
