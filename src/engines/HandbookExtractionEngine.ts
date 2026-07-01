/**
 * HandbookExtractionEngine — HBK-MS1
 * ====================================
 * Parses raw handbook content (PDF text, OCR output, structured tables)
 * into typed section records conforming to MachineHandbookRegistryEngine schemas.
 *
 * Pipeline: raw text → section detection → table parsing → unit normalization → confidence scoring
 *
 * References:
 * - MachineHandbookRegistryEngine (10 section schemas)
 * - ISO 841:2001 (CNC axis designation)
 * - ISO 10791-1:2015 (machining centre test conditions — capacity verification)
 */

import { z } from "zod";
import type {
  HandbookSectionKey,
  SourceProvenance,
  HandbookSpindleSpec,
  HandbookAlarmCode,
  HandbookSafetyLimit,
} from "./MachineHandbookRegistryEngine.js";

// ════════════════════════════════════════════════════════════════════
// SECTION 1: SECTION BOUNDARY DETECTION (P0-U01)
// ════════════════════════════════════════════════════════════════════

/** Detected section from raw text with classification confidence. */
export interface DetectedSection {
  type: HandbookSectionKey | "unknown";
  title: string;
  startLine: number;
  endLine: number;
  rawText: string;
  confidence: number;
}

/** Keywords and patterns that indicate each handbook section type. */
const SECTION_SIGNATURES: Record<
  HandbookSectionKey,
  { keywords: string[]; headerPatterns: RegExp[] }
> = {
  cover_info: {
    keywords: ["operator manual", "service manual", "maintenance manual", "owner's manual",
      "programming manual", "parts manual", "publication", "revision", "part number"],
    headerPatterns: [
      /operator['']?s?\s+manual/i,
      /service\s+manual/i,
      /maintenance\s+(manual|guide)/i,
      /programming\s+(manual|guide)/i,
      /parts?\s+(manual|book|catalog)/i,
    ],
  },
  spindle_specs: {
    keywords: ["spindle", "rpm", "torque", "power", "taper", "drawbar", "bearing",
      "gear range", "base speed", "constant power", "constant torque", "spindle motor"],
    headerPatterns: [
      /spindle\s+spec/i,
      /spindle\s+data/i,
      /spindle\s+performance/i,
      /spindle\s+motor/i,
      /main\s+spindle/i,
      /drive\s+system/i,
    ],
  },
  axis_kinematics: {
    keywords: ["axis", "travel", "rapid", "traverse", "acceleration", "repeatability",
      "accuracy", "ball screw", "linear scale", "work envelope", "table size"],
    headerPatterns: [
      /axis\s+(data|spec|travel)/i,
      /machine\s+travel/i,
      /rapid\s+traverse/i,
      /positioning\s+accuracy/i,
      /work(ing)?\s+range/i,
    ],
  },
  controller_features: {
    keywords: ["controller", "cnc", "g-code", "m-code", "macro", "variable",
      "probing", "conversational", "high speed machining", "look-ahead", "block processing"],
    headerPatterns: [
      /controller\s+(spec|feature|option)/i,
      /cnc\s+(unit|system|control)/i,
      /programming\s+feature/i,
      /g[\s-]?code/i,
      /m[\s-]?code/i,
    ],
  },
  alarm_codes: {
    keywords: ["alarm", "error", "fault", "diagnostic", "warning", "emergency stop",
      "servo alarm", "overtravel", "overheat"],
    headerPatterns: [
      /alarm\s+(code|list|reference|table)/i,
      /error\s+(code|message|list)/i,
      /fault\s+(code|list|diagnostic)/i,
      /diagnostic\s+code/i,
    ],
  },
  maintenance_schedule: {
    keywords: ["maintenance", "preventive", "lubrication", "inspection", "service interval",
      "daily check", "weekly", "monthly", "annual", "pm schedule", "fluid change"],
    headerPatterns: [
      /maintenance\s+(schedule|interval|procedure|plan)/i,
      /preventive\s+maintenance/i,
      /lubrication\s+(chart|schedule|point)/i,
      /pm\s+schedule/i,
      /service\s+(interval|schedule)/i,
    ],
  },
  parts_book: {
    keywords: ["part number", "part no", "spare part", "replacement part", "bom",
      "bill of material", "oem part", "cross reference", "vendor"],
    headerPatterns: [
      /parts?\s+(list|book|catalog|reference)/i,
      /spare\s+parts?/i,
      /replacement\s+parts?/i,
      /bill\s+of\s+material/i,
    ],
  },
  programming_tips: {
    keywords: ["programming", "g-code example", "macro example", "canned cycle",
      "subprogram", "fixed cycle", "peck drill", "thread", "interpolation"],
    headerPatterns: [
      /programming\s+(tip|example|guide|hint|note)/i,
      /canned\s+cycle/i,
      /fixed\s+cycle/i,
      /program(ming)?\s+example/i,
    ],
  },
  safety_limits: {
    keywords: ["safety", "limit", "interlock", "override", "maximum", "minimum",
      "emergency", "lockout", "tagout", "guarding", "protective"],
    headerPatterns: [
      /safety\s+(limit|spec|feature|device|interlock)/i,
      /machine\s+limit/i,
      /lockout\s+tagout/i,
      /protective\s+(device|guard)/i,
    ],
  },
  coolant_specs: {
    keywords: ["coolant", "cutting fluid", "lubrication", "mql", "through spindle coolant",
      "tsc", "chip conveyor", "filtration", "tank capacity", "pump pressure"],
    headerPatterns: [
      /coolant\s+(spec|system|data)/i,
      /cutting\s+fluid/i,
      /lubrication\s+system/i,
      /chip\s+(conveyor|removal)/i,
    ],
  },
  tooling_constraints: {
    keywords: ["tool changer", "magazine", "tool capacity", "max tool",
      "pull stud", "gauge line", "pot", "carousel", "tool change time"],
    headerPatterns: [
      /tool(ing)?\s+(changer|magazine|capacity|spec)/i,
      /atc\s+(spec|data)/i,
      /automatic\s+tool\s+changer/i,
      /tool\s+storage/i,
    ],
  },
};

/**
 * Detect section boundaries in raw handbook text.
 * Splits text into logical sections and classifies each.
 */
export function detectSections(rawText: string): DetectedSection[] {
  const lines = rawText.split("\n");
  const sections: DetectedSection[] = [];
  let currentStart = 0;
  let currentType: HandbookSectionKey | "unknown" = "unknown";
  let currentTitle = "";
  let currentConfidence = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line is a section header
    const classification = classifyLine(line);
    if (classification && classification.confidence > 0.5) {
      // Close previous section if we had one
      if (i > currentStart && currentType !== "unknown") {
        sections.push({
          type: currentType,
          title: currentTitle,
          startLine: currentStart,
          endLine: i - 1,
          rawText: lines.slice(currentStart, i).join("\n"),
          confidence: currentConfidence,
        });
      }
      currentStart = i;
      currentType = classification.type;
      currentTitle = line;
      currentConfidence = classification.confidence;
    }
  }

  // Close final section
  if (currentType !== "unknown" && currentStart < lines.length) {
    sections.push({
      type: currentType,
      title: currentTitle,
      startLine: currentStart,
      endLine: lines.length - 1,
      rawText: lines.slice(currentStart).join("\n"),
      confidence: currentConfidence,
    });
  }

  // If no sections detected, treat entire text as unknown and try content-based classification
  if (sections.length === 0 && rawText.trim().length > 0) {
    const contentClass = classifyByContent(rawText);
    sections.push({
      type: contentClass.type,
      title: "Unstructured content",
      startLine: 0,
      endLine: lines.length - 1,
      rawText,
      confidence: contentClass.confidence,
    });
  }

  return sections;
}

/** Classify a single line as a potential section header. */
function classifyLine(line: string): { type: HandbookSectionKey; confidence: number } | null {
  const lower = line.toLowerCase();

  // M2 fix: negative signal — lines with table-data patterns are data rows, not headers.
  // Dot-leaders, pipe-delimited values, colon+number, or tab+number indicate spec data.
  if (/[.·]{3,}\s*[\d,.]/.test(line)) return null;                 // dot-leader table row
  if (/\|\s*[\d,.]+\s*\|/.test(line)) return null;                  // pipe-delimited data
  if (/:\s+[\d,.]+\s*(mm|rpm|kw|nm|bar|kg|sec|hp|in|psi)/i.test(lower)) return null; // colon + value + unit
  if (/\t[\d,.]+\t/.test(line)) return null;                        // tab-delimited data

  let bestType: HandbookSectionKey | null = null;
  let bestScore = 0;

  for (const [sectionType, sig] of Object.entries(SECTION_SIGNATURES)) {
    let score = 0;

    // Header pattern match — strong signal
    for (const pattern of sig.headerPatterns) {
      if (pattern.test(lower)) {
        score += 0.6;
        break;
      }
    }

    // Keyword density in the line
    const keywordHits = sig.keywords.filter(k => lower.includes(k)).length;
    score += Math.min(keywordHits * 0.15, 0.45);

    // Structural heuristics: short lines, ALL CAPS, or numbered headers are more likely section titles
    if (line.length < 80 && line.length > 3) score += 0.05;
    if (line === line.toUpperCase() && /[A-Z]/.test(line)) score += 0.1;
    if (/^\d+[\.\)]\s/.test(line) || /^(chapter|section|part)\s+\d/i.test(line)) score += 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestType = sectionType as HandbookSectionKey;
    }
  }

  if (bestType && bestScore > 0.5) {
    return { type: bestType, confidence: Math.min(bestScore, 1.0) };
  }
  return null;
}

/** Classify entire text block by content analysis when no headers detected. */
function classifyByContent(text: string): { type: HandbookSectionKey | "unknown"; confidence: number } {
  const lower = text.toLowerCase();
  let bestType: HandbookSectionKey | "unknown" = "unknown";
  let bestScore = 0;

  for (const [sectionType, sig] of Object.entries(SECTION_SIGNATURES)) {
    const hits = sig.keywords.filter(k => lower.includes(k)).length;
    const density = hits / sig.keywords.length;
    if (density > bestScore) {
      bestScore = density;
      bestType = sectionType as HandbookSectionKey;
    }
  }

  return { type: bestType, confidence: Math.min(bestScore * 2, 0.9) };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 2: TABLE PARSER (P0-U02)
// ════════════════════════════════════════════════════════════════════

/** A parsed spec row from a handbook table. */
export interface ParsedSpecRow {
  parameter: string;
  value: number;
  rawValue: string;
  unit: string;
  rawUnit: string;
  confidence: number;
}

/** Common unit patterns for CNC specifications. */
const UNIT_PATTERNS: Array<{ pattern: RegExp; canonical: string; multiplier: number }> = [
  // Speed
  { pattern: /\brpm\b/i, canonical: "RPM", multiplier: 1 },
  { pattern: /\bmin[-\s]?1\b/i, canonical: "RPM", multiplier: 1 },
  // Torque (must precede linear ft to avoid ft-lbs matching as feet)
  { pattern: /\bnm\b|\bn[·.]m\b/i, canonical: "Nm", multiplier: 1 },
  { pattern: /\bft[\s·.-]?lb[sf]?\b/i, canonical: "Nm", multiplier: 1.3558 },
  { pattern: /\bkgf[\s·.-]?cm\b/i, canonical: "Nm", multiplier: 0.09807 },
  // Feed rate (must precede linear to avoid "in" in "in/min" matching inches)
  { pattern: /\bmm\s*\/\s*min\b/i, canonical: "mm_min", multiplier: 1 },
  { pattern: /\bipm\b|\bin\s*\/\s*min\b/i, canonical: "mm_min", multiplier: 25.4 },
  { pattern: /\bm\s*\/\s*min\b/i, canonical: "mm_min", multiplier: 1000 },
  { pattern: /\bipr\b|\bin\s*\/\s*rev\b/i, canonical: "mm_rev", multiplier: 25.4 },
  { pattern: /\bmm\s*\/\s*rev\b/i, canonical: "mm_rev", multiplier: 1 },
  // Linear (C2 fix: require period after "in" or full word "inch")
  { pattern: /\bmm\b/i, canonical: "mm", multiplier: 1 },
  { pattern: /\bin\.(?:\s|$)|\binch(?:es)?\b/i, canonical: "mm", multiplier: 25.4 },
  { pattern: /\bft\b|\bfeet\b/i, canonical: "mm", multiplier: 304.8 },
  { pattern: /\bμm\b|\bum\b|\bmicron/i, canonical: "um", multiplier: 1 },
  { pattern: /\bmil\b/i, canonical: "um", multiplier: 25.4 },
  // Power (H1 fix: removed standalone \bw\b — too broad, kW and HP cover practical cases)
  { pattern: /\bkw\b/i, canonical: "kW", multiplier: 1 },
  { pattern: /\bhp\b|\bhorsepower\b/i, canonical: "kW", multiplier: 0.7457 },
  // Pressure
  { pattern: /\bbar\b/i, canonical: "bar", multiplier: 1 },
  { pattern: /\bpsi\b/i, canonical: "bar", multiplier: 0.06895 },
  { pattern: /\bmpa\b/i, canonical: "bar", multiplier: 10 },
  // Acceleration
  { pattern: /\bm\s*\/\s*s\s*2\b|\bm\/s²\b/i, canonical: "m_s2", multiplier: 1 },
  { pattern: /\bg\b(?=\s*\(?\s*(?:9\.8|accel))/i, canonical: "m_s2", multiplier: 9.81 },
  // Force (must precede mass to catch "lbf" before "lb")
  { pattern: /\bkn\b/i, canonical: "kN", multiplier: 1 },
  { pattern: /\blbf\b/i, canonical: "N", multiplier: 4.4482 },
  // Mass (H3: "lb" in force context handled by resolveUnit parameter-name override)
  { pattern: /\bkg\b/i, canonical: "kg", multiplier: 1 },
  { pattern: /\blb[s]?\b/i, canonical: "kg", multiplier: 0.4536 },
  // Volume
  { pattern: /\bliter[s]?\b|\bl\b(?=[\s,)])/i, canonical: "L", multiplier: 1 },
  { pattern: /\bgal(lon)?[s]?\b/i, canonical: "L", multiplier: 3.7854 },
  // Flow
  { pattern: /\bl\s*\/\s*min\b|\blpm\b/i, canonical: "L_min", multiplier: 1 },
  { pattern: /\bgpm\b|\bgal\s*\/\s*min\b/i, canonical: "L_min", multiplier: 3.7854 },
  // Temperature (must precede angle — °F/°C are more specific than bare °)
  // M5 note: Fahrenheit multiplier is intentionally 1 (inert) because F→C is non-linear:
  // conversion is (value - 32) * 5/9, handled via isFahrenheit flag in normalizeValue().
  { pattern: /°\s*C\b|\bcelsius\b/i, canonical: "C", multiplier: 1 },
  { pattern: /°\s*F\b|\bfahrenheit\b/i, canonical: "C", multiplier: 1 },
  // Angle (after temperature to avoid °F/°C false matches)
  { pattern: /\bdeg(ree)?[s]?\b|°/i, canonical: "deg", multiplier: 1 },
  // Time
  { pattern: /\bsec(ond)?[s]?\b/i, canonical: "sec", multiplier: 1 },
  { pattern: /\bminute[s]?\b/i, canonical: "min", multiplier: 1 }, // H2 fix: full word "minute" only, not "min"
  // Noise
  { pattern: /\bdb[a]?\b/i, canonical: "dBA", multiplier: 1 },
  // Electrical
  { pattern: /\bkva\b/i, canonical: "kVA", multiplier: 1 },
];

/**
 * Parse specification tables from raw text.
 * Handles common handbook table formats:
 * - "Parameter ........... Value Unit"
 * - "Parameter | Value | Unit"
 * - "Parameter: Value Unit"
 */
export function parseSpecTable(rawText: string): ParsedSpecRow[] {
  const lines = rawText.split("\n");
  const rows: ParsedSpecRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    const parsed = parseSpecLine(trimmed);
    if (parsed) {
      rows.push(parsed);
    }
  }

  return rows;
}

/** Parse a single specification line into a typed row. */
function parseSpecLine(line: string): ParsedSpecRow | null {
  // Pattern 1: "Parameter .... Value Unit" (dot-leader tables)
  // Pattern 2: "Parameter | Value | Unit" (pipe-delimited)
  // Pattern 3: "Parameter: Value Unit" (colon-separated)
  // Pattern 4: "Parameter  Value Unit" (whitespace-separated with wide gap)

  const patterns = [
    // Dot leaders: "X-Axis Travel ........... 762 mm"
    /^(.+?)\s*[.·]{3,}\s*([\d,.]+)\s*(.*)$/,
    // Pipe: "X-Axis Travel | 762 | mm"
    /^(.+?)\s*\|\s*([\d,.]+)\s*\|?\s*(.*)$/,
    // Colon: "X-Axis Travel: 762 mm"
    /^(.+?):\s*([\d,.]+)\s*(.*)$/,
    // Tab-separated: "X-Axis Travel\t762\tmm"
    /^(.+?)\t+([\d,.]+)\t*(.*)$/,
    // Wide whitespace: "X-Axis Travel          762 mm"
    /^(.+?)\s{3,}([\d,.]+)\s*(.*)$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const param = match[1].trim();
      const rawValue = match[2].trim().replace(/,/g, "");
      const rawUnitStr = match[3].trim();
      const numValue = parseFloat(rawValue);

      if (isNaN(numValue)) continue;
      if (param.length < 2 || param.length > 100) continue;
      // M4 fix: reject year-like values (1900-2099) and ISO standard numbers as spec values
      if (numValue >= 1900 && numValue <= 2099 && rawUnitStr.length === 0) continue;
      if (/\bISO\b/i.test(param) && rawUnitStr.length === 0) continue;

      const unitResult = resolveUnit(rawUnitStr, param);
      const normalizedValue = normalizeValue(numValue, unitResult);

      return {
        parameter: param,
        value: normalizedValue.value,
        rawValue: match[2].trim(),
        unit: unitResult.canonical,
        rawUnit: rawUnitStr,
        confidence: computeRowConfidence(param, rawValue, rawUnitStr, unitResult),
      };
    }
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 3: UNIT NORMALIZATION + CONFIDENCE (P0-U03)
// ════════════════════════════════════════════════════════════════════

interface UnitResolution {
  canonical: string;
  multiplier: number;
  matched: boolean;
  isFahrenheit: boolean;
}

/** Resolve a raw unit string to canonical PRISM unit. */
function resolveUnit(rawUnit: string, parameterName: string): UnitResolution {
  const combined = (rawUnit + " " + parameterName).toLowerCase();
  const isForceContext = /force|drawbar|thrust|clamp/i.test(parameterName);

  // H3 fix: override "lb" → N (force) when parameter indicates a force context
  if (isForceContext && /\blb[s]?\b/i.test(rawUnit)) {
    return { canonical: "N", multiplier: 4.4482, matched: true, isFahrenheit: false };
  }

  for (const up of UNIT_PATTERNS) {
    if (up.pattern.test(rawUnit) || (rawUnit.length === 0 && up.pattern.test(parameterName))) {
      // C1 fix: Fahrenheit detection requires degree symbol
      const isFahrenheit = /°\s*F\b|\bfahrenheit\b/i.test(rawUnit) && up.canonical === "C";
      return { canonical: up.canonical, multiplier: up.multiplier, matched: true, isFahrenheit };
    }
  }

  // Infer unit from parameter name when not explicit
  if (/rpm|speed|spindle/i.test(combined) && !/power|torque|motor/i.test(combined)) return { canonical: "RPM", multiplier: 1, matched: false, isFahrenheit: false };
  if (/travel|stroke|distance/i.test(combined) && !/rapid/i.test(combined)) return { canonical: "mm", multiplier: 1, matched: false, isFahrenheit: false };
  if (/rapid|feed.*rate|traverse/i.test(combined)) return { canonical: "mm_min", multiplier: 1, matched: false, isFahrenheit: false };
  if (/torque/i.test(combined)) return { canonical: "Nm", multiplier: 1, matched: false, isFahrenheit: false };
  if (/power|motor/i.test(combined)) return { canonical: "kW", multiplier: 1, matched: false, isFahrenheit: false };
  if (isForceContext) return { canonical: "N", multiplier: 1, matched: false, isFahrenheit: false };
  if (/weight|mass/i.test(combined)) return { canonical: "kg", multiplier: 1, matched: false, isFahrenheit: false };
  if (/pressure/i.test(combined)) return { canonical: "bar", multiplier: 1, matched: false, isFahrenheit: false };
  if (/capacity|volume/i.test(combined) && /tank|coolant/i.test(combined)) return { canonical: "L", multiplier: 1, matched: false, isFahrenheit: false };
  if (/time|change.*time/i.test(combined)) return { canonical: "sec", multiplier: 1, matched: false, isFahrenheit: false };

  return { canonical: "unknown", multiplier: 1, matched: false, isFahrenheit: false };
}

/** Normalize a numeric value to canonical units. */
function normalizeValue(value: number, unit: UnitResolution): { value: number } {
  if (unit.isFahrenheit) {
    // F → C conversion
    return { value: (value - 32) * 5 / 9 };
  }
  return { value: value * unit.multiplier };
}

/** Compute confidence for a parsed row. */
function computeRowConfidence(
  param: string,
  rawValue: string,
  rawUnit: string,
  unitResult: UnitResolution,
): number {
  let confidence = 0.5; // base

  // Unit was explicitly matched
  if (unitResult.matched) confidence += 0.2;
  // Unit was inferred — lower confidence
  else if (unitResult.canonical !== "unknown") confidence += 0.1;

  // Reasonable parameter name length
  if (param.length > 5 && param.length < 60) confidence += 0.05;

  // Value looks reasonable (not suspiciously large or tiny)
  const val = parseFloat(rawValue.replace(/,/g, ""));
  if (!isNaN(val) && val > 0 && val < 1e8) confidence += 0.1;

  // Has explicit unit text
  if (rawUnit.length > 0) confidence += 0.1;

  // Precision indicator: decimal point suggests measured/spec value
  if (rawValue.includes(".")) confidence += 0.05;

  return Math.min(confidence, 1.0);
}

// ════════════════════════════════════════════════════════════════════
// SECTION 4: HIGH-LEVEL EXTRACTION ORCHESTRATOR
// ════════════════════════════════════════════════════════════════════

/** Typed suggested sections — properly typed instead of unknown. */
export interface SuggestedSections {
  spindle_specs?: Partial<HandbookSpindleSpec>;
  axis_kinematics?: { axes: Array<{ name: string; travel_mm?: number; rapid_mm_min?: number; repeatability_um?: number; accuracy_um?: number }>; source: SourceProvenance };
  tooling_constraints?: { magazine_capacity?: number; tool_change_time_sec?: number; max_tool_diameter_mm?: number; max_tool_length_mm?: number; max_tool_weight_kg?: number; source: SourceProvenance };
  coolant_specs?: { coolant_types: unknown[]; tank_capacity_liters?: number; pump_pressure_bar?: number; flow_rate_lpm?: number; through_spindle_pressure_bar?: number; filtration_um?: number; source: SourceProvenance };
  alarm_codes?: Partial<HandbookAlarmCode>[];
  safety_limits?: Partial<HandbookSafetyLimit>[];
}

/** Input schema for extraction. */
export const ExtractionInputSchema = z.object({
  rawText: z.string().min(10).max(5_000_000),
  machineId: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  extractionMethod: z.enum(["manual", "ocr", "table_parse", "api", "web_scrape"]).default("table_parse"),
  handbookTitle: z.string().optional(),
});
export type ExtractionInput = z.infer<typeof ExtractionInputSchema>;

/** Result of extraction with sections and metadata. */
export interface ExtractionResult {
  sections: DetectedSection[];
  specRows: ParsedSpecRow[];
  suggestedSections: SuggestedSections;
  provenance: SourceProvenance;
  quality: {
    totalLines: number;
    parsedLines: number;
    avgConfidence: number;
    sectionsCovered: string[];
    warnings: string[];
  };
}

/**
 * Extract structured handbook data from raw text.
 * This is the main entry point for the extraction pipeline.
 *
 * @param input - Raw text and metadata about the handbook source
 * @returns Structured extraction result with sections, specs, and quality metrics
 */
export function extractHandbook(input: ExtractionInput): ExtractionResult {
  const validated = ExtractionInputSchema.parse(input);
  const now = new Date().toISOString();

  const provenance: SourceProvenance = {
    handbook_title: validated.handbookTitle ?? `${validated.manufacturer ?? "Unknown"} ${validated.model ?? ""} Handbook`.trim(),
    extraction_method: validated.extractionMethod,
    confidence: 0, // will be computed
    extracted_at: now,
  };

  // Step 1: Detect section boundaries
  const sections = detectSections(validated.rawText);

  // Step 2: Parse spec tables from each section
  const allSpecRows: ParsedSpecRow[] = [];
  for (const section of sections) {
    const rows = parseSpecTable(section.rawText);
    allSpecRows.push(...rows);
  }

  // Also parse the full text for tables that span sections
  const fullTextRows = parseSpecTable(validated.rawText);
  // Deduplicate by parameter name
  const seenParams = new Set(allSpecRows.map(r => r.parameter.toLowerCase()));
  for (const row of fullTextRows) {
    if (!seenParams.has(row.parameter.toLowerCase())) {
      allSpecRows.push(row);
      seenParams.add(row.parameter.toLowerCase());
    }
  }

  // Step 3: Build suggested section data from parsed rows
  const suggested = buildSuggestedSections(allSpecRows, sections, provenance);

  // Step 4: Compute quality metrics
  const totalLines = validated.rawText.split("\n").length;
  const avgConf = allSpecRows.length > 0
    ? allSpecRows.reduce((s, r) => s + r.confidence, 0) / allSpecRows.length
    : 0;

  provenance.confidence = avgConf;

  const sectionsCovered = [...new Set(sections.map(s => s.type))].filter(t => t !== "unknown");
  const warnings: string[] = [];
  if (sections.length === 0) warnings.push("No section boundaries detected — content may be unstructured");
  if (allSpecRows.length === 0) warnings.push("No specification table rows extracted");
  if (avgConf < 0.5) warnings.push("Low average extraction confidence — manual review recommended");
  if (sectionsCovered.length < 3) warnings.push("Fewer than 3 section types detected — incomplete extraction");

  return {
    sections,
    specRows: allSpecRows,
    suggestedSections: suggested,
    provenance,
    quality: {
      totalLines,
      parsedLines: allSpecRows.length,
      avgConfidence: Math.round(avgConf * 1000) / 1000,
      sectionsCovered,
      warnings,
    },
  };
}

/** Build suggested section objects from parsed spec rows. C1 fix: no `as any`. */
function buildSuggestedSections(
  rows: ParsedSpecRow[],
  sections: DetectedSection[],
  prov: SourceProvenance,
): SuggestedSections {
  const suggested: SuggestedSections = {};

  // Map spec rows to spindle specs
  const spindleRows = rows.filter(r =>
    /spindle|rpm|torque|power|drawbar/i.test(r.parameter)
  );
  if (spindleRows.length >= 2) {
    const spindle: Partial<HandbookSpindleSpec> = { source: prov };
    for (const row of spindleRows) {
      const p = row.parameter.toLowerCase();
      if (/max.*rpm|spindle.*speed/i.test(p)) spindle.max_rpm = row.value;
      else if (/continuous.*power|power.*cont/i.test(p)) spindle.power_continuous_kw = row.value;
      else if (/peak.*power|power.*peak|30\s*min|15\s*min|rating/i.test(p)) spindle.power_30min_kw = row.value;
      else if (/max.*torque|torque.*max/i.test(p)) spindle.torque_max_nm = row.value;
      else if (/continuous.*torque|torque.*cont/i.test(p)) spindle.torque_continuous_nm = row.value;
      else if (/drawbar/i.test(p)) spindle.drawbar_force_kn = row.value;
    }
    if (spindle.max_rpm && spindle.torque_max_nm) {
      suggested.spindle_specs = spindle;
    }
  }

  // Map spec rows to axis kinematics
  const axisRows = rows.filter(r =>
    /axis|travel|rapid|repeatability|accuracy|x[\s-]|y[\s-]|z[\s-]/i.test(r.parameter)
  );
  if (axisRows.length >= 2) {
    const axes: Array<{ name: string; travel_mm?: number; rapid_mm_min?: number; repeatability_um?: number; accuracy_um?: number }> = [];
    for (const axisName of ["X", "Y", "Z", "A", "B", "C"]) {
      const axisSpecific = axisRows.filter(r =>
        new RegExp(`\\b${axisName}[\\s-]`, "i").test(r.parameter)
      );
      if (axisSpecific.length > 0) {
        const axisObj: { name: string; travel_mm?: number; rapid_mm_min?: number; repeatability_um?: number; accuracy_um?: number } = { name: axisName };
        for (const row of axisSpecific) {
          const p = row.parameter.toLowerCase();
          if (/travel|stroke/i.test(p)) axisObj.travel_mm = row.value;
          else if (/rapid/i.test(p)) axisObj.rapid_mm_min = row.value;
          else if (/repeat/i.test(p)) axisObj.repeatability_um = row.value;
          else if (/accura/i.test(p)) axisObj.accuracy_um = row.value;
        }
        if (axisObj.travel_mm) axes.push(axisObj);
      }
    }
    if (axes.length > 0) {
      suggested.axis_kinematics = { axes, source: prov };
    }
  }

  // Map spec rows to tooling constraints (M2: removed dead taper branch — parser rejects non-numeric)
  const toolingRows = rows.filter(r =>
    /magazine|tool.*cap|tool.*change|tool.*diam|tool.*length|tool.*weight/i.test(r.parameter)
  );
  if (toolingRows.length >= 2) {
    const tooling: SuggestedSections["tooling_constraints"] = { source: prov };
    for (const row of toolingRows) {
      const p = row.parameter.toLowerCase();
      if (/magazine.*cap|tool.*cap/i.test(p)) tooling!.magazine_capacity = row.value;
      else if (/tool.*change.*time/i.test(p)) tooling!.tool_change_time_sec = row.value;
      else if (/max.*tool.*diam/i.test(p)) tooling!.max_tool_diameter_mm = row.value;
      else if (/max.*tool.*length/i.test(p)) tooling!.max_tool_length_mm = row.value;
      else if (/max.*tool.*weight/i.test(p)) tooling!.max_tool_weight_kg = row.value;
    }
    suggested.tooling_constraints = tooling;
  }

  // Map spec rows to coolant specs
  const coolantRows = rows.filter(r =>
    /coolant|tank|through.*spindle|tsc|pump.*pressure|flow|filtration|chip.*conveyor/i.test(r.parameter)
  );
  if (coolantRows.length >= 1) {
    const coolant: SuggestedSections["coolant_specs"] = { coolant_types: [], source: prov };
    for (const row of coolantRows) {
      const p = row.parameter.toLowerCase();
      if (/tank.*cap/i.test(p)) coolant!.tank_capacity_liters = row.value;
      else if (/pump.*press|coolant.*press/i.test(p)) coolant!.pump_pressure_bar = row.value;
      else if (/flow/i.test(p)) coolant!.flow_rate_lpm = row.value;
      else if (/through.*spindle.*press|tsc.*press/i.test(p)) coolant!.through_spindle_pressure_bar = row.value;
      else if (/filtration/i.test(p)) coolant!.filtration_um = row.value;
    }
    suggested.coolant_specs = coolant;
  }

  // Map alarm sections
  const alarmSections = sections.filter(s => s.type === "alarm_codes");
  if (alarmSections.length > 0) {
    const alarmCodes = parseAlarmEntries(alarmSections[0].rawText, prov);
    if (alarmCodes.length > 0) {
      suggested.alarm_codes = alarmCodes;
    }
  }

  // Map safety sections
  const safetyRows = rows.filter(r =>
    /safety|limit|max.*speed|max.*feed|max.*load|interlock/i.test(r.parameter)
  );
  if (safetyRows.length >= 1) {
    suggested.safety_limits = safetyRows.map(row => ({
      parameter: row.parameter,
      max_value: row.value,
      unit: row.unit as HandbookSafetyLimit["unit"],
      consequence_of_violation: "Exceeds handbook-documented limit",
      source: prov,
    }));
  }

  return suggested;
}

/** Parse alarm code entries from raw text. */
function parseAlarmEntries(rawText: string, prov: SourceProvenance): Partial<HandbookAlarmCode>[] {
  const alarms: Partial<HandbookAlarmCode>[] = [];
  const lines = rawText.split("\n");

  // Look for patterns like "Alarm 102: SERVO ALARM - X AXIS MOTOR OVERHEAT"
  const alarmPattern = /(?:alarm|error|fault)\s*#?\s*(\d+)\s*[:\-]\s*(.+)/i;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(alarmPattern);
    if (match) {
      const code = match[1];
      const description = match[2].trim();

      // Look ahead for causes/actions
      const causes: string[] = [];
      const actions: string[] = [];
      let j = i + 1;
      while (j < lines.length && !alarmPattern.test(lines[j])) {
        const trimmed = lines[j].trim();
        // M7 fix: match bullet, numbered, or indented list items. M3 fix: cap at 20 items.
        const LIST_ITEM = /^\s*(?:[-•*]|\d+[.)]\s)\s*/;
        if (/^[-•*]\s*cause/i.test(trimmed) || /probable.*cause/i.test(trimmed)) {
          j++;
          while (j < lines.length && causes.length < 20 && (LIST_ITEM.test(lines[j]) || /^\s{2,}\S/.test(lines[j])) && lines[j].trim().length > 0) {
            causes.push(lines[j].replace(LIST_ITEM, "").trim());
            j++;
          }
          continue;
        }
        if (/^[-•*]\s*(action|correct|remedy|fix)/i.test(trimmed) || /corrective.*action/i.test(trimmed)) {
          j++;
          while (j < lines.length && actions.length < 20 && (LIST_ITEM.test(lines[j]) || /^\s{2,}\S/.test(lines[j])) && lines[j].trim().length > 0) {
            actions.push(lines[j].replace(LIST_ITEM, "").trim());
            j++;
          }
          continue;
        }
        j++;
      }

      alarms.push({
        code,
        severity: inferAlarmSeverity(description),
        description,
        probable_causes: causes.length > 0 ? causes : ["See handbook for details"],
        corrective_actions: actions.length > 0 ? actions : ["Refer to service manual"],
        source: prov,
      });
    }
  }

  return alarms;
}

/** Infer alarm severity from description text. */
function inferAlarmSeverity(desc: string): "info" | "warning" | "error" | "critical" | "emergency" {
  const lower = desc.toLowerCase();
  if (/emergency|e[\s-]?stop|collision|crash/i.test(lower)) return "emergency";
  if (/critical|fatal|hardware.*fail/i.test(lower)) return "critical";
  if (/servo|overheat|over\s?travel|over\s?load|over\s?current/i.test(lower)) return "error";
  if (/warning|caution|low.*level|battery/i.test(lower)) return "warning";
  return "info";
}

// ════════════════════════════════════════════════════════════════════
// SECTION 5: SINGLETON EXPORT
// ════════════════════════════════════════════════════════════════════

/** Stateless engine — all methods are pure functions. */
export const handbookExtractionEngine = {
  detectSections,
  parseSpecTable,
  extractHandbook,
};
