/**
 * CpsPostParserEngine — Comprehensive Fusion 360 CPS Post Processor Parser
 *
 * Consolidates MS1 U01-U05: metadata, properties, format definitions,
 * G/M code tables, WCS definitions, canned cycle detection, and capability
 * fingerprinting for all 180 Fusion 360 .cps post processor files.
 *
 * Parsing is pure regex-based — no eval, no external dependencies.
 *
 * Data source: 180 Autodesk Fusion 360 .cps files covering Fanuc, Haas,
 * Siemens, Heidenhain, Mazak, Okuma, Brother, DMG Mori, Makino, Hurco,
 * Doosan, Datron, Tormach, and more.
 *
 * @module CpsPostParserEngine
 */

import * as fs from "fs";
import * as path from "path";

// ─── Interfaces ──────────────────────────────────────────────────────

export interface CpsCapabilities {
  milling: boolean;
  turning: boolean;
  machineSimulation: boolean;
  inspection: boolean;
  fingerprint: string;
}

export interface CpsTolerances {
  spatial_mm?: number;
  minimumChordLength_mm?: number;
}

export interface CpsCircularLimits {
  minimumRadius_mm?: number;
  maximumRadius_mm?: number;
  minimumSweep_rad?: number;
  maximumSweep_rad?: number;
  allowedPlanes?: string;
}

export interface CpsMetadata {
  filename: string;
  description: string;
  vendor: string;
  vendorUrl: string;
  legal: string;
  certificationLevel: number;
  extension: string;
  longDescription?: string;
  programNameIsInteger?: boolean;
  capabilities: CpsCapabilities;
  tolerances: CpsTolerances;
  circularLimits: CpsCircularLimits;
  helicalMoves: boolean;
  spiralMoves: boolean;
  highFeedrate: { mm: number; inch: number } | number;
  probeMultipleFeatures: boolean;
}

export interface CpsProperty {
  name: string;
  title: string;
  description: string;
  group: string;
  type: "boolean" | "enum" | "integer" | "spatial" | "string" | "number";
  values?: Array<{ title: string; id: string }>;
  defaultValue: any;
  scope: string;
}

export interface CpsFormatDef {
  variableName: string;
  prefix?: string;
  decimals?: number;
  suffix?: string;
  scale?: string;
  type?: string;
  forceSign?: boolean;
  minDigitsLeft?: number;
}

export interface CpsWcsDefinition {
  useZeroOffset: boolean;
  ranges: Array<{ name: string; format: string; range: [number, number] }>;
}

export interface CpsCycleSupport {
  hasDrilling: boolean;
  hasTapping: boolean;
  hasBoring: boolean;
  hasProbing: boolean;
  hasThreadMilling: boolean;
  detectedCycles: string[];
}

export interface CpsFullProfile {
  metadata: CpsMetadata;
  properties: CpsProperty[];
  formats: CpsFormatDef[];
  wcsDefinition?: CpsWcsDefinition;
  cycleSupport: CpsCycleSupport;
  gCodes: Record<string, string>;
  mCodes: Record<string, string>;
  rawPropertyCount: number;
  rawFormatCount: number;
}

export interface CpsParseInput {
  cps_file_path?: string;
  cps_directory?: string;
  include_formats?: boolean;
  include_cycles?: boolean;
}

export interface CpsParseResult {
  profiles: CpsFullProfile[];
  total_files: number;
  total_properties: number;
  unique_property_names: string[];
  manufacturers: string[];
  capability_summary: Record<string, number>;
}

// ─── Pre-compiled Regex Patterns ─────────────────────────────────────

const RE_DESCRIPTION = /^description\s*=\s*"([^"]+)"/m;
const RE_VENDOR = /^vendor\s*=\s*"([^"]+)"/m;
const RE_VENDOR_URL = /^vendorUrl\s*=\s*"([^"]+)"/m;
const RE_LEGAL = /^legal\s*=\s*"([^"]+)"/m;
const RE_CERT_LEVEL = /^certificationLevel\s*=\s*(\d+)/m;
const RE_EXTENSION = /^extension\s*=\s*"([^"]+)"/m;
const RE_LONG_DESCRIPTION = /^longDescription\s*=\s*"([^"]+)"/m;
const RE_CAPABILITIES = /^capabilities\s*=\s*(.+?);/m;
const RE_CAPABILITY_TOKEN = /CAPABILITY_\w+/g;
const RE_TOLERANCE = /^tolerance\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CHORD = /^minimumChordLength\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CIRC_RAD = /^minimumCircularRadius\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MAX_CIRC_RAD = /^maximumCircularRadius\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CIRC_SWEEP = /^minimumCircularSweep\s*=\s*toRad\(\s*([\d.]+)\s*\)/m;
const RE_MAX_CIRC_SWEEP = /^maximumCircularSweep\s*=\s*toRad\(\s*([\d.]+)\s*\)/m;
const RE_ALLOW_HELICAL = /^allowHelicalMoves\s*=\s*(true|false)/m;
const RE_ALLOW_SPIRAL = /^allowSpiralMoves\s*=\s*(true|false)/m;
const RE_ALLOWED_PLANES = /^allowedCircularPlanes\s*=\s*(.+?)[\s;]/m;
const RE_PROGRAM_NAME_INT = /^programNameIsInteger\s*=\s*(true|false)/m;
const RE_PROBE_MULTI = /^probeMultipleFeatures\s*=\s*(true|false)/m;
const RE_HIGH_FEEDRATE = /^highFeedrate\s*=\s*\(unit\s*==\s*MM\)\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/m;
const RE_HIGH_FEEDRATE_SIMPLE = /^highFeedrate\s*=\s*([\d.]+)/m;

// Format/Variable extraction
const RE_CREATE_FORMAT = /(?:var|const|let)\s+(\w+)\s*=\s*createFormat\(\s*\{([^}]*)\}\s*\)/g;
const RE_CREATE_VARIABLE = /(?:var|const|let)\s+(\w+)\s*=\s*createVariable\(\s*\{([^}]*)\}\s*,\s*(\w+)\s*\)/g;
const RE_CREATE_OUTPUT_VARIABLE = /(?:var|const|let)\s+(\w+)\s*=\s*createOutputVariable\(\s*\{([^}]*)\}\s*,\s*(\w+)\s*\)/g;
const RE_CREATE_REFERENCE_VARIABLE = /(?:var|const|let)\s+(\w+)\s*=\s*createReferenceVariable/g;

// G/M code extraction: gFormat.format(N) or mFormat.format(N)
const RE_G_FORMAT_CALL = /gFormat\.format\(\s*(\d+)\s*\)/g;
const RE_M_FORMAT_CALL = /mFormat\.format\(\s*(\d+)\s*\)/g;

// WCS definitions
const RE_WCS_BLOCK = /wcsDefinitions\s*=\s*\{([\s\S]*?)\};/m;
const RE_WCS_USE_ZERO = /useZeroOffset\s*:\s*(true|false)/;
const RE_WCS_RANGE = /\{\s*name\s*:\s*"([^"]*)"[\s,]*format\s*:\s*"([^"]*)"[\s,]*range\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]\s*\}/g;

// Cycle detection
const RE_ON_CYCLE = /function\s+onCycle\s*\(/;
const RE_ON_CYCLE_POINT = /function\s+onCyclePoint\s*\(/;
const RE_ON_CYCLE_END = /function\s+onCycleEnd\s*\(/;
const RE_CYCLE_TYPE_DRILLING = /["']drilling["']/;
const RE_CYCLE_TYPE_TAPPING = /["']tapping["']/;
const RE_CYCLE_TYPE_BORING = /["']boring["']/;
const RE_CYCLE_TYPE_PROBING = /["']probing[-\w]*["']|inspectionCycleInspect|CYCLE_PROBING/i;
const RE_CYCLE_TYPE_THREAD = /["']thread[-\w]*["']|threadMilling/i;
const RE_CYCLE_G_CODE = /(?:gCycleModal|gFormat)\.format\(\s*(\d+)\s*\).*?(?:\/\/\s*(.+))?$/gm;

// ─── Helper: Extract balanced brace block ────────────────────────────

function extractBalancedBlock(content: string, startPattern: RegExp): string | null {
  const startMatch = content.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return null;

  let depth = 0;
  const searchStart = startMatch.index + startMatch[0].length - 1;
  for (let i = searchStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        return content.slice(searchStart, i + 1);
      }
    }
  }
  return null;
}

// ─── Helper: Split property entries from block ───────────────────────

function splitPropertyEntries(block: string): Array<{ key: string; body: string }> {
  const entries: Array<{ key: string; body: string }> = [];
  const inner = block.slice(1, -1);
  const re = /(\w+)\s*:\s*\{/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    const key = match[1];
    // Check this isn't a nested key inside another property (like values array items)
    // by verifying we're at top-level depth
    const braceStart = match.index + match[0].length - 1;
    let depth = 0;
    let endIdx = -1;
    for (let i = braceStart; i < inner.length; i++) {
      if (inner[i] === "{") depth++;
      else if (inner[i] === "}") {
        depth--;
        if (depth === 0) {
          endIdx = i;
          break;
        }
      }
    }
    if (endIdx > braceStart) {
      entries.push({ key, body: inner.slice(braceStart, endIdx + 1) });
      re.lastIndex = endIdx + 1;
    }
  }
  return entries;
}

// ─── Helper: Parse property body ─────────────────────────────────────

function parsePropertyBody(key: string, body: string): CpsProperty {
  const strField = (name: string): string => {
    const m = body.match(new RegExp(`${name}\\s*:\\s*"([^"]*)"`, "s"));
    return m ? m[1] : "";
  };

  const title = strField("title");
  const description = strField("description");
  const group = strField("group");
  const rawType = strField("type");

  // Normalize type
  const typeMap: Record<string, CpsProperty["type"]> = {
    boolean: "boolean",
    enum: "enum",
    integer: "integer",
    spatial: "spatial",
    string: "string",
    number: "number",
  };
  const type = typeMap[rawType] || "string";

  // Default value
  let defaultValue: any = undefined;
  const valStringMatch = body.match(/\bvalue\s*:\s*"([^"]*)"/);
  const valBoolMatch = body.match(/\bvalue\s*:\s*(true|false)/);
  const valNumMatch = body.match(/\bvalue\s*:\s*(-?[\d.]+)/);
  if (valStringMatch) {
    defaultValue = valStringMatch[1];
  } else if (valBoolMatch) {
    defaultValue = valBoolMatch[1] === "true";
  } else if (valNumMatch) {
    defaultValue = parseFloat(valNumMatch[1]);
  }

  // Scope
  const scope = strField("scope") || "post";

  // Values array for enum types
  let values: Array<{ title: string; id: string }> | undefined;
  const valuesBlockMatch = body.match(/values\s*:\s*\[([\s\S]*?)\]/);
  if (valuesBlockMatch) {
    values = [];
    const itemRe = /\{\s*title\s*:\s*"([^"]*)"[\s,]*id\s*:\s*"([^"]*)"\s*\}/g;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRe.exec(valuesBlockMatch[1])) !== null) {
      values.push({ title: itemMatch[1], id: itemMatch[2] });
    }
    if (values.length === 0) values = undefined;
  }

  return { name: key, title, description, group, type, values, defaultValue, scope };
}

// ─── Helper: Parse format config from param string ───────────────────

function parseFormatConfig(varName: string, configStr: string): CpsFormatDef {
  const fmt: CpsFormatDef = { variableName: varName };

  const prefixMatch = configStr.match(/prefix\s*:\s*"([^"]*)"/);
  if (prefixMatch) fmt.prefix = prefixMatch[1];

  const suffixMatch = configStr.match(/suffix\s*:\s*"([^"]*)"/);
  if (suffixMatch) fmt.suffix = suffixMatch[1];

  const decimalsMatch = configStr.match(/decimals\s*:\s*(\d+)/);
  if (decimalsMatch) fmt.decimals = parseInt(decimalsMatch[1], 10);

  // Handle conditional decimals: decimals:(unit == MM ? 3 : 4) — take MM value
  if (!decimalsMatch) {
    const condMatch = configStr.match(/decimals\s*:\s*\(\s*unit\s*==\s*MM\s*\?\s*(\d+)\s*:\s*(\d+)\s*\)/);
    if (condMatch) fmt.decimals = parseInt(condMatch[1], 10);
  }

  const scaleMatch = configStr.match(/scale\s*:\s*(\w+)/);
  if (scaleMatch) fmt.scale = scaleMatch[1];

  const typeMatch = configStr.match(/type\s*:\s*(\w+)/);
  if (typeMatch) fmt.type = typeMatch[1];

  const forceSignMatch = configStr.match(/forceSign\s*:\s*(true|false)/);
  if (forceSignMatch) fmt.forceSign = forceSignMatch[1] === "true";

  const minDigitsMatch = configStr.match(/minDigitsLeft\s*:\s*(\d+)/);
  if (minDigitsMatch) fmt.minDigitsLeft = parseInt(minDigitsMatch[1], 10);

  return fmt;
}

// ─── Engine Implementation ───────────────────────────────────────────

class CpsPostParserEngineImpl {
  private cache: Map<string, CpsFullProfile> = new Map();

  // ─── U01: Parse CPS Metadata ────────────────────────────────────────

  private parseMetadata(content: string, filename: string): CpsMetadata {
    const str = (re: RegExp): string => {
      const m = content.match(re);
      return m ? m[1] : "";
    };
    const num = (re: RegExp, fallback: number = 0): number => {
      const m = content.match(re);
      return m ? parseFloat(m[1]) : fallback;
    };
    const bool = (re: RegExp, fallback: boolean = false): boolean => {
      const m = content.match(re);
      return m ? m[1] === "true" : fallback;
    };

    // Capabilities
    const capabilities = this.parseCapabilities(content, filename);

    // Tolerances
    const tolerances: CpsTolerances = {};
    const spatialTol = num(RE_TOLERANCE);
    if (spatialTol > 0) tolerances.spatial_mm = spatialTol;
    const chordLen = num(RE_MIN_CHORD);
    if (chordLen > 0) tolerances.minimumChordLength_mm = chordLen;

    // Circular limits
    const circularLimits: CpsCircularLimits = {};
    const minRad = num(RE_MIN_CIRC_RAD);
    if (minRad > 0) circularLimits.minimumRadius_mm = minRad;
    const maxRad = num(RE_MAX_CIRC_RAD);
    if (maxRad > 0) circularLimits.maximumRadius_mm = maxRad;
    const minSweep = num(RE_MIN_CIRC_SWEEP);
    if (minSweep > 0) circularLimits.minimumSweep_rad = minSweep;
    const maxSweep = num(RE_MAX_CIRC_SWEEP);
    if (maxSweep > 0) circularLimits.maximumSweep_rad = maxSweep;

    // Allowed circular planes
    const planesMatch = content.match(RE_ALLOWED_PLANES);
    if (planesMatch) {
      circularLimits.allowedPlanes = planesMatch[1].trim().replace(/;$/, "");
    }

    // High feedrate: either conditional or simple number
    let highFeedrate: { mm: number; inch: number } | number = 0;
    const hfMatch = content.match(RE_HIGH_FEEDRATE);
    if (hfMatch) {
      highFeedrate = { mm: parseFloat(hfMatch[1]), inch: parseFloat(hfMatch[2]) };
    } else {
      const hfSimple = content.match(RE_HIGH_FEEDRATE_SIMPLE);
      if (hfSimple) highFeedrate = parseFloat(hfSimple[1]);
    }

    // Long description
    const longDesc = str(RE_LONG_DESCRIPTION) || undefined;

    // Certification level
    const certLevel = num(RE_CERT_LEVEL);

    return {
      filename,
      description: str(RE_DESCRIPTION),
      vendor: str(RE_VENDOR),
      vendorUrl: str(RE_VENDOR_URL),
      legal: str(RE_LEGAL),
      certificationLevel: certLevel,
      extension: str(RE_EXTENSION),
      longDescription: longDesc,
      programNameIsInteger: bool(RE_PROGRAM_NAME_INT),
      capabilities,
      tolerances,
      circularLimits,
      helicalMoves: bool(RE_ALLOW_HELICAL),
      spiralMoves: bool(RE_ALLOW_SPIRAL),
      highFeedrate,
      probeMultipleFeatures: bool(RE_PROBE_MULTI),
    };
  }

  // ─── U05: Parse Capabilities & Fingerprint ──────────────────────────

  private parseCapabilities(content: string, filename: string): CpsCapabilities {
    const lineMatch = content.match(RE_CAPABILITIES);
    const tokens: string[] = [];
    if (lineMatch) {
      const re = new RegExp(RE_CAPABILITY_TOKEN.source, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(lineMatch[1])) !== null) {
        tokens.push(m[0]);
      }
    }

    const milling = tokens.includes("CAPABILITY_MILLING");
    const turning = tokens.includes("CAPABILITY_TURNING");
    const machineSimulation = tokens.includes("CAPABILITY_MACHINE_SIMULATION");
    const inspection = filename.toLowerCase().includes("inspection") ||
      tokens.includes("CAPABILITY_INSPECTION");

    // Build fingerprint string
    const parts: string[] = [];
    if (milling) parts.push("mill");
    if (turning) parts.push("turn");
    if (machineSimulation) parts.push("sim");
    if (inspection) parts.push("inspect");
    const fingerprint = parts.length > 0 ? parts.join("+") : "unknown";

    return { milling, turning, machineSimulation, inspection, fingerprint };
  }

  // ─── U02: Extract Properties ────────────────────────────────────────

  private parseProperties(content: string): CpsProperty[] {
    const block = extractBalancedBlock(content, /^properties\s*=\s*\{/m);
    if (!block) return [];

    const entries = splitPropertyEntries(block);
    return entries.map(e => parsePropertyBody(e.key, e.body));
  }

  // ─── U03: Extract Format Definitions ────────────────────────────────

  private parseFormats(content: string): CpsFormatDef[] {
    const formats: CpsFormatDef[] = [];
    const seen = new Set<string>();

    // createFormat({...}) calls
    const fmtRe = new RegExp(RE_CREATE_FORMAT.source, "g");
    let m: RegExpExecArray | null;
    while ((m = fmtRe.exec(content)) !== null) {
      const varName = m[1];
      if (seen.has(varName)) continue;
      seen.add(varName);
      formats.push(parseFormatConfig(varName, m[2]));
    }

    // createVariable({...}, formatRef) calls
    const varRe = new RegExp(RE_CREATE_VARIABLE.source, "g");
    while ((m = varRe.exec(content)) !== null) {
      const varName = m[1];
      if (seen.has(varName)) continue;
      seen.add(varName);
      const cfg = parseFormatConfig(varName, m[2]);
      // The third group is the format reference
      const fmtRef = m[3];
      if (!cfg.prefix) {
        // Try to extract prefix from the config
        const prefixMatch = m[2].match(/prefix\s*:\s*"([^"]*)"/);
        if (prefixMatch) cfg.prefix = prefixMatch[1];
      }
      // Tag with format reference
      if (fmtRef && !cfg.type) cfg.type = `ref:${fmtRef}`;
      formats.push(cfg);
    }

    // createOutputVariable({...}, formatRef) calls
    const outVarRe = new RegExp(RE_CREATE_OUTPUT_VARIABLE.source, "g");
    while ((m = outVarRe.exec(content)) !== null) {
      const varName = m[1];
      if (seen.has(varName)) continue;
      seen.add(varName);
      const cfg = parseFormatConfig(varName, m[2]);
      const fmtRef = m[3];
      if (fmtRef && !cfg.type) cfg.type = `ref:${fmtRef}`;
      formats.push(cfg);
    }

    // createReferenceVariable calls (just record presence)
    const refVarRe = new RegExp(RE_CREATE_REFERENCE_VARIABLE.source, "g");
    while ((m = refVarRe.exec(content)) !== null) {
      const varName = m[1];
      if (seen.has(varName)) continue;
      seen.add(varName);
      formats.push({ variableName: varName, type: "referenceVariable" });
    }

    return formats;
  }

  // ─── U04: Extract G/M Code Tables ──────────────────────────────────

  private parseGMCodes(content: string): { gCodes: Record<string, string>; mCodes: Record<string, string> } {
    const gCodes: Record<string, string> = {};
    const mCodes: Record<string, string> = {};

    // Extract G-codes from gFormat.format(N) calls with optional comments
    const lines = content.split("\n");
    for (const line of lines) {
      // G-codes
      const gMatches = line.matchAll(/gFormat\.format\(\s*(\d+)\s*\)/g);
      for (const gm of gMatches) {
        const code = `G${gm[1]}`;
        if (!gCodes[code]) {
          // Try to extract a comment from the same line
          const commentMatch = line.match(/\/\/\s*(.+?)$/);
          gCodes[code] = commentMatch ? commentMatch[1].trim() : "";
        }
      }

      // Also match gMotionModal.format(N), gPlaneModal.format(N), etc.
      const gModalMatches = line.matchAll(/g\w+Modal\.format\(\s*(\d+)\s*\)/g);
      for (const gm of gModalMatches) {
        const code = `G${gm[1]}`;
        if (!gCodes[code]) {
          const commentMatch = line.match(/\/\/\s*(.+?)$/);
          gCodes[code] = commentMatch ? commentMatch[1].trim() : "";
        }
      }

      // Also match gCycleModal.format(N)
      const gCycleMatches = line.matchAll(/gCycleModal\.format\(\s*(\d+)\s*\)/g);
      for (const gm of gCycleMatches) {
        const code = `G${gm[1]}`;
        if (!gCodes[code]) {
          const commentMatch = line.match(/\/\/\s*(.+?)$/);
          gCodes[code] = commentMatch ? commentMatch[1].trim() : "";
        }
      }

      // M-codes
      const mMatches = line.matchAll(/mFormat\.format\(\s*(\d+)\s*\)/g);
      for (const mm of mMatches) {
        const code = `M${mm[1]}`;
        if (!mCodes[code]) {
          const commentMatch = line.match(/\/\/\s*(.+?)$/);
          mCodes[code] = commentMatch ? commentMatch[1].trim() : "";
        }
      }
    }

    return { gCodes, mCodes };
  }

  // ─── U04: Extract WCS Definition ───────────────────────────────────

  private parseWcsDefinition(content: string): CpsWcsDefinition | undefined {
    const wcsBlockMatch = content.match(RE_WCS_BLOCK);
    if (!wcsBlockMatch) return undefined;

    const blockContent = wcsBlockMatch[1];

    const useZeroMatch = blockContent.match(RE_WCS_USE_ZERO);
    const useZeroOffset = useZeroMatch ? useZeroMatch[1] === "true" : false;

    const ranges: Array<{ name: string; format: string; range: [number, number] }> = [];
    const rangeRe = new RegExp(RE_WCS_RANGE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = rangeRe.exec(blockContent)) !== null) {
      ranges.push({
        name: m[1],
        format: m[2],
        range: [parseInt(m[3], 10), parseInt(m[4], 10)],
      });
    }

    if (ranges.length === 0 && !useZeroOffset) return undefined;

    return { useZeroOffset, ranges };
  }

  // ─── U04: Detect Canned Cycles ─────────────────────────────────────

  private parseCycleSupport(content: string): CpsCycleSupport {
    const hasOnCycle = RE_ON_CYCLE.test(content);
    const hasOnCyclePoint = RE_ON_CYCLE_POINT.test(content);

    // If no cycle handlers, no cycle support
    if (!hasOnCycle && !hasOnCyclePoint) {
      return {
        hasDrilling: false,
        hasTapping: false,
        hasBoring: false,
        hasProbing: false,
        hasThreadMilling: false,
        detectedCycles: [],
      };
    }

    const hasDrilling = RE_CYCLE_TYPE_DRILLING.test(content);
    const hasTapping = RE_CYCLE_TYPE_TAPPING.test(content);
    const hasBoring = RE_CYCLE_TYPE_BORING.test(content);
    const hasProbing = RE_CYCLE_TYPE_PROBING.test(content);
    const hasThreadMilling = RE_CYCLE_TYPE_THREAD.test(content);

    // Detect specific G-code cycles (G73, G76, G80-G89, etc.)
    const detectedCycles: string[] = [];
    const cycleCodeRe = /(?:gCycleModal|gFormat)\.format\(\s*(7[3-9]|8[0-9])\s*\)/g;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = cycleCodeRe.exec(content)) !== null) {
      const code = `G${m[1]}`;
      if (!seen.has(code)) {
        seen.add(code);
        detectedCycles.push(code);
      }
    }

    // Detect textual cycle type references (only machining-related cycle names)
    const CYCLE_PREFIXES = [
      "drilling", "counter-boring", "deep-drilling", "chip-breaking",
      "tapping", "left-tapping", "right-tapping",
      "boring", "fine-boring", "back-boring", "stop-boring", "manual-boring",
      "reaming", "probing", "thread",
    ];
    const cycleNameRe = /case\s*["']([\w-]+)["']\s*:/g;
    while ((m = cycleNameRe.exec(content)) !== null) {
      const cycleName = m[1];
      const isCycleType = CYCLE_PREFIXES.some(p => cycleName.startsWith(p));
      if (isCycleType && !seen.has(cycleName)) {
        seen.add(cycleName);
        detectedCycles.push(cycleName);
      }
    }

    return {
      hasDrilling,
      hasTapping,
      hasBoring,
      hasProbing,
      hasThreadMilling,
      detectedCycles: detectedCycles.sort(),
    };
  }

  // ─── Full Profile Parse ─────────────────────────────────────────────

  /**
   * Parse a single CPS file content and return a complete profile.
   */
  parseFile(content: string, filename: string, includeFormats = true, includeCycles = true): CpsFullProfile {
    const cached = this.cache.get(filename);
    if (cached) return cached;

    const metadata = this.parseMetadata(content, filename);
    const properties = this.parseProperties(content);
    const formats = includeFormats ? this.parseFormats(content) : [];
    const { gCodes, mCodes } = this.parseGMCodes(content);
    const wcsDefinition = this.parseWcsDefinition(content);
    const cycleSupport = includeCycles
      ? this.parseCycleSupport(content)
      : { hasDrilling: false, hasTapping: false, hasBoring: false, hasProbing: false, hasThreadMilling: false, detectedCycles: [] };

    const profile: CpsFullProfile = {
      metadata,
      properties,
      formats,
      wcsDefinition,
      cycleSupport,
      gCodes,
      mCodes,
      rawPropertyCount: properties.length,
      rawFormatCount: formats.length,
    };

    this.cache.set(filename, profile);
    return profile;
  }

  /**
   * Parse all CPS files in a directory.
   */
  parseDirectory(dirPath: string, includeFormats = true, includeCycles = true): CpsFullProfile[] {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith(".cps"));
    const results: CpsFullProfile[] = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        results.push(this.parseFile(content, file, includeFormats, includeCycles));
      } catch (err: any) {
        // Skip unreadable files
        console.warn(`[CpsPostParser] Failed to parse ${file}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Build a summary result from an array of profiles.
   */
  private buildResult(profiles: CpsFullProfile[]): CpsParseResult {
    const allPropertyNames = new Set<string>();
    const manufacturers = new Set<string>();
    const capSummary: Record<string, number> = {
      milling: 0,
      turning: 0,
      machineSimulation: 0,
      inspection: 0,
      "mill+turn": 0,
    };
    let totalProps = 0;

    for (const p of profiles) {
      for (const prop of p.properties) {
        allPropertyNames.add(prop.name);
      }
      totalProps += p.properties.length;

      if (p.metadata.vendor) manufacturers.add(p.metadata.vendor);

      const caps = p.metadata.capabilities;
      if (caps.milling) capSummary.milling++;
      if (caps.turning) capSummary.turning++;
      if (caps.machineSimulation) capSummary.machineSimulation++;
      if (caps.inspection) capSummary.inspection++;
      if (caps.milling && caps.turning) capSummary["mill+turn"]++;
    }

    return {
      profiles,
      total_files: profiles.length,
      total_properties: totalProps,
      unique_property_names: [...allPropertyNames].sort(),
      manufacturers: [...manufacturers].sort(),
      capability_summary: capSummary,
    };
  }

  // ─── Action Handlers ───────────────────────────────────────────────

  /**
   * Parse a single CPS file by path.
   */
  cpsParse(input: CpsParseInput): CpsParseResult {
    const includeFormats = input.include_formats !== false;
    const includeCycles = input.include_cycles !== false;

    if (input.cps_file_path) {
      if (!fs.existsSync(input.cps_file_path)) {
        throw new Error(`CPS file not found: ${input.cps_file_path}`);
      }
      const content = fs.readFileSync(input.cps_file_path, "utf-8");
      const filename = path.basename(input.cps_file_path);
      const profile = this.parseFile(content, filename, includeFormats, includeCycles);
      return this.buildResult([profile]);
    }

    if (input.cps_directory) {
      const profiles = this.parseDirectory(input.cps_directory, includeFormats, includeCycles);
      return this.buildResult(profiles);
    }

    throw new Error("Either cps_file_path or cps_directory must be provided");
  }

  /**
   * Batch parse: always parses the entire default directory.
   */
  cpsParseBatch(input: CpsParseInput): CpsParseResult {
    const dir = input.cps_directory || "H:/prism/BOX/FUSION BASIC POSTS";
    const includeFormats = input.include_formats !== false;
    const includeCycles = input.include_cycles !== false;
    const profiles = this.parseDirectory(dir, includeFormats, includeCycles);
    return this.buildResult(profiles);
  }

  /**
   * Summary: returns aggregated stats without full profile data.
   */
  cpsSummary(input: CpsParseInput): {
    total_files: number;
    total_properties: number;
    unique_property_count: number;
    manufacturers: string[];
    capability_summary: Record<string, number>;
    fingerprints: Record<string, number>;
    extensions: Record<string, number>;
    avg_properties_per_file: number;
    avg_formats_per_file: number;
    cycle_support_count: number;
    wcs_definition_count: number;
  } {
    const dir = input.cps_directory || "H:/prism/BOX/FUSION BASIC POSTS";
    const profiles = this.parseDirectory(dir, true, true);

    const propNames = new Set<string>();
    const manufacturers = new Set<string>();
    const fingerprints: Record<string, number> = {};
    const extensions: Record<string, number> = {};
    let totalProps = 0;
    let totalFormats = 0;
    let cycleCount = 0;
    let wcsCount = 0;

    const capSummary: Record<string, number> = {
      milling: 0, turning: 0, machineSimulation: 0, inspection: 0, "mill+turn": 0,
    };

    for (const p of profiles) {
      for (const prop of p.properties) propNames.add(prop.name);
      totalProps += p.properties.length;
      totalFormats += p.formats.length;

      if (p.metadata.vendor) manufacturers.add(p.metadata.vendor);

      const fp = p.metadata.capabilities.fingerprint;
      fingerprints[fp] = (fingerprints[fp] || 0) + 1;

      const ext = p.metadata.extension.toLowerCase();
      extensions[ext] = (extensions[ext] || 0) + 1;

      const caps = p.metadata.capabilities;
      if (caps.milling) capSummary.milling++;
      if (caps.turning) capSummary.turning++;
      if (caps.machineSimulation) capSummary.machineSimulation++;
      if (caps.inspection) capSummary.inspection++;
      if (caps.milling && caps.turning) capSummary["mill+turn"]++;

      if (p.cycleSupport.hasDrilling || p.cycleSupport.hasTapping || p.cycleSupport.hasBoring) {
        cycleCount++;
      }
      if (p.wcsDefinition) wcsCount++;
    }

    const fileCount = profiles.length || 1;

    return {
      total_files: profiles.length,
      total_properties: totalProps,
      unique_property_count: propNames.size,
      manufacturers: [...manufacturers].sort(),
      capability_summary: capSummary,
      fingerprints,
      extensions,
      avg_properties_per_file: Math.round((totalProps / fileCount) * 10) / 10,
      avg_formats_per_file: Math.round((totalFormats / fileCount) * 10) / 10,
      cycle_support_count: cycleCount,
      wcs_definition_count: wcsCount,
    };
  }

  // ─── Cache Management ──────────────────────────────────────────────

  /** Return all cached profiles. */
  getAllCached(): CpsFullProfile[] {
    return [...this.cache.values()];
  }

  /** Clear parse cache. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get cache size. */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ─── Execute (PRISM action router) ─────────────────────────────────

  /**
   * PRISM engine execute method. Routes actions to the appropriate handler.
   *
   * Supported actions:
   *  - cps_parse:       Parse a single file or directory
   *  - cps_parse_batch: Batch parse entire CPS library
   *  - cps_summary:     Aggregate statistics across all CPS files
   */
  execute(action: string, input: CpsParseInput): any {
    switch (action) {
      case "cps_parse":
        return this.cpsParse(input);
      case "cps_parse_batch":
        return this.cpsParseBatch(input);
      case "cps_summary":
        return this.cpsSummary(input);
      default:
        throw new Error(
          `[CpsPostParserEngine] Unknown action "${action}". ` +
          `Supported: cps_parse, cps_parse_batch, cps_summary`
        );
    }
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const cpsPostParserEngine = new CpsPostParserEngineImpl();
