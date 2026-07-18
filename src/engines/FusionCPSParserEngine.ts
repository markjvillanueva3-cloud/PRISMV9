/**
 * FusionCPSParserEngine — Fusion 360 Post Processor File Parser
 *
 * Parses .cps post processor files to extract structured machine/controller
 * metadata including capabilities, properties, motion limits, and vendor info.
 * Supports batch parsing of entire post processor libraries.
 *
 * Data source: 180 Autodesk Fusion 360 .cps files covering Fanuc, Haas,
 * Siemens, Heidenhain, Mazak, Okuma, Brother, DMG Mori, Makino, Hurco,
 * Doosan, Datron, Tormach, and more.
 *
 * @module FusionCPSParserEngine
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MotionLimits {
  minimumChordLength_mm: number;
  minimumCircularRadius_mm: number;
  maximumCircularRadius_mm: number;
  minimumCircularSweep_rad: number;
  maximumCircularSweep_rad: number;
}

export interface CPSProperty {
  key: string;
  title: string;
  description: string;
  group: string;
  type: string;
  values?: Array<{ title: string; id: string }>;
  defaultValue: any;
}

export interface CPSMetadata {
  filename: string;
  description: string;
  vendor: string;
  vendorUrl: string;
  extension: string;
  capabilities: string[];
  tolerance_mm: number;
  motionLimits: MotionLimits;
  highFeedrate: { mm: number; inch: number };
  programNameIsInteger: boolean;
  probeMultipleFeatures: boolean;
  allowHelicalMoves: boolean;
  allowSpiralMoves: boolean;
  properties: CPSProperty[];
}

export interface PropertyCatalog {
  total_properties: number;
  unique_properties: number;
  by_group: Record<string, string[]>;
  by_controller: Record<string, string[]>;
  universal_properties: string[];
  unique_to: Record<string, string[]>;
}

export interface ControllerComparison {
  controllers: [string, string];
  shared_properties: string[];
  only_in_first: string[];
  only_in_second: string[];
  capability_diff: { first: string[]; second: string[] };
  motion_limit_diff: Record<string, [number, number]>;
}

// ---------------------------------------------------------------------------
// Regex helpers (pre-compiled for performance)
// ---------------------------------------------------------------------------

const RE_DESCRIPTION = /^description\s*=\s*"([^"]+)"/m;
const RE_VENDOR = /^vendor\s*=\s*"([^"]+)"/m;
const RE_VENDOR_URL = /^vendorUrl\s*=\s*"([^"]+)"/m;
const RE_EXTENSION = /^extension\s*=\s*"([^"]+)"/m;
const RE_CAPABILITIES = /^capabilities\s*=\s*(.+?);/m;
const RE_TOLERANCE = /^tolerance\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CHORD = /^minimumChordLength\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CIRC_RAD = /^minimumCircularRadius\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MAX_CIRC_RAD = /^maximumCircularRadius\s*=\s*spatial\(\s*([\d.]+)\s*,\s*MM\s*\)/m;
const RE_MIN_CIRC_SWEEP = /^minimumCircularSweep\s*=\s*toRad\(\s*([\d.]+)\s*\)/m;
const RE_MAX_CIRC_SWEEP = /^maximumCircularSweep\s*=\s*toRad\(\s*([\d.]+)\s*\)/m;
const RE_ALLOW_HELICAL = /^allowHelicalMoves\s*=\s*(true|false)/m;
const RE_ALLOW_SPIRAL = /^allowSpiralMoves\s*=\s*(true|false)/m;
const RE_PROGRAM_NAME_INT = /^programNameIsInteger\s*=\s*(true|false)/m;
const RE_PROBE_MULTI = /^probeMultipleFeatures\s*=\s*(true|false)/m;
const RE_HIGH_FEEDRATE = /^highFeedrate\s*=\s*\(unit\s*==\s*MM\)\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/m;
const RE_CAPABILITY_TOKEN = /CAPABILITY_\w+/g;

// ---------------------------------------------------------------------------
// Property block parser
// ---------------------------------------------------------------------------

/**
 * Extracts the top-level `properties = { ... };` block from CPS content,
 * handling nested braces (for `values` arrays containing objects).
 */
function extractPropertiesBlock(content: string): string | null {
  const startMatch = content.match(/^properties\s*=\s*\{/m);
  if (!startMatch || startMatch.index === undefined) return null;

  let depth = 0;
  const start = startMatch.index + startMatch[0].length - 1; // the opening {
  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Split a properties block into individual property sub-blocks.
 * Each sub-block starts with `key: {` and ends with the matching `}`.
 */
function splitPropertyEntries(block: string): Array<{ key: string; body: string }> {
  const entries: Array<{ key: string; body: string }> = [];
  // Match `  someKey: {` at the top-level depth inside the outer block
  const re = /(\w+)\s*:\s*\{/g;
  // We need to skip the outer `{` — work inside the block content
  const inner = block.slice(1, -1); // strip outer { }

  let match: RegExpExecArray | null;
  while ((match = re.exec(inner)) !== null) {
    const key = match[1];
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
      // Advance regex past this block so we don't match nested keys
      re.lastIndex = endIdx + 1;
    }
  }
  return entries;
}

/**
 * Parse a single property body like `{ title: "...", description: "...", ... }`.
 * Uses regex to extract known fields rather than eval.
 */
function parsePropertyBody(key: string, body: string): CPSProperty {
  const strField = (name: string): string => {
    const m = body.match(new RegExp(`${name}\\s*:\\s*"([^"]*)"`, "s"));
    return m ? m[1] : "";
  };

  const title = strField("title");
  const description = strField("description");
  const group = strField("group");
  const type = strField("type");

  // Default value: try string first, then boolean/number
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

  // Parse values array: [{title:"...", id:"..."}, ...]
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

  return { key, title, description, group, type, values, defaultValue };
}

// ---------------------------------------------------------------------------
// Engine implementation
// ---------------------------------------------------------------------------

class FusionCPSParserEngineImpl {
  /** Cache of parsed metadata, keyed by filename */
  private cache: Map<string, CPSMetadata> = new Map();

  // -------------------------------------------------------------------------
  // Core parsing
  // -------------------------------------------------------------------------

  /**
   * Parse a single CPS file content string and return structured metadata.
   * @param content - Raw .cps file content (JavaScript source)
   * @param filename - Optional filename for the metadata record
   */
  parseCPSFile(content: string, filename: string = "unknown.cps"): CPSMetadata {
    const cached = this.cache.get(filename);
    if (cached) return cached;

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

    // High feedrate: `(unit == MM) ? mmVal : inchVal`
    let highFeedMM = 0;
    let highFeedInch = 0;
    const hfMatch = content.match(RE_HIGH_FEEDRATE);
    if (hfMatch) {
      highFeedMM = parseFloat(hfMatch[1]);
      highFeedInch = parseFloat(hfMatch[2]);
    }

    const metadata: CPSMetadata = {
      filename,
      description: str(RE_DESCRIPTION),
      vendor: str(RE_VENDOR),
      vendorUrl: str(RE_VENDOR_URL),
      extension: str(RE_EXTENSION),
      capabilities: this.extractCapabilities(content),
      tolerance_mm: num(RE_TOLERANCE),
      motionLimits: this.extractMotionLimits(content),
      highFeedrate: { mm: highFeedMM, inch: highFeedInch },
      programNameIsInteger: bool(RE_PROGRAM_NAME_INT),
      probeMultipleFeatures: bool(RE_PROBE_MULTI),
      allowHelicalMoves: bool(RE_ALLOW_HELICAL),
      allowSpiralMoves: bool(RE_ALLOW_SPIRAL),
      properties: this.extractProperties(content),
    };

    this.cache.set(filename, metadata);
    return metadata;
  }

  /**
   * Parse all .cps files in a directory and return an array of metadata.
   * Results are cached; subsequent calls return cached data.
   */
  parseCPSDirectory(dirPath: string): CPSMetadata[] {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath).filter(f => f.toLowerCase().endsWith(".cps"));
    const results: CPSMetadata[] = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        results.push(this.parseCPSFile(content, file));
      } catch (err: any) {
        // Skip unreadable files but log the error
        console.warn(`[FusionCPSParser] Failed to parse ${file}: ${err.message}`);
      }
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Extraction helpers
  // -------------------------------------------------------------------------

  /**
   * Extract the properties block from CPS content and return parsed properties.
   */
  extractProperties(content: string): CPSProperty[] {
    const block = extractPropertiesBlock(content);
    if (!block) return [];

    const entries = splitPropertyEntries(block);
    return entries.map(e => parsePropertyBody(e.key, e.body));
  }

  /**
   * Extract capability flags from a CPS file.
   * Handles: `capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;`
   */
  extractCapabilities(content: string): string[] {
    const lineMatch = content.match(RE_CAPABILITIES);
    if (!lineMatch) return [];

    const tokens: string[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(RE_CAPABILITY_TOKEN.source, "g");
    while ((m = re.exec(lineMatch[1])) !== null) {
      tokens.push(m[0]);
    }
    return tokens;
  }

  /**
   * Extract motion limits (chord length, circular radius/sweep ranges).
   */
  extractMotionLimits(content: string): MotionLimits {
    const num = (re: RegExp, fallback: number = 0): number => {
      const m = content.match(re);
      return m ? parseFloat(m[1]) : fallback;
    };
    return {
      minimumChordLength_mm: num(RE_MIN_CHORD),
      minimumCircularRadius_mm: num(RE_MIN_CIRC_RAD),
      maximumCircularRadius_mm: num(RE_MAX_CIRC_RAD),
      minimumCircularSweep_rad: num(RE_MIN_CIRC_SWEEP),
      maximumCircularSweep_rad: num(RE_MAX_CIRC_SWEEP),
    };
  }

  // -------------------------------------------------------------------------
  // Search & analysis
  // -------------------------------------------------------------------------

  /**
   * Search cached metadata by vendor name (case-insensitive substring match).
   */
  searchByVendor(vendor: string): CPSMetadata[] {
    const lc = vendor.toLowerCase();
    return this.getAllCached().filter(m => m.vendor.toLowerCase().includes(lc));
  }

  /**
   * Search cached metadata by capability flag name (case-insensitive).
   * Accepts short form (e.g. "milling") or full form (e.g. "CAPABILITY_MILLING").
   */
  searchByCapability(cap: string): CPSMetadata[] {
    const normalized = cap.toUpperCase();
    const full = normalized.startsWith("CAPABILITY_") ? normalized : `CAPABILITY_${normalized}`;
    return this.getAllCached().filter(m => m.capabilities.includes(full));
  }

  /**
   * Build a cross-controller property catalog from all cached metadata.
   * Identifies universal properties, per-group breakdown, and controller-unique properties.
   */
  getPropertyCatalog(): PropertyCatalog {
    const allMeta = this.getAllCached();
    if (allMeta.length === 0) {
      return {
        total_properties: 0,
        unique_properties: 0,
        by_group: {},
        by_controller: {},
        universal_properties: [],
        unique_to: {},
      };
    }

    const byController: Record<string, string[]> = {};
    const byGroup: Record<string, Set<string>> = {};
    const propertyCounts: Map<string, number> = new Map();
    let totalProps = 0;

    for (const meta of allMeta) {
      const keys = meta.properties.map(p => p.key);
      byController[meta.description || meta.filename] = keys;
      totalProps += keys.length;

      for (const prop of meta.properties) {
        propertyCounts.set(prop.key, (propertyCounts.get(prop.key) || 0) + 1);
        const grp = prop.group || "ungrouped";
        if (!byGroup[grp]) byGroup[grp] = new Set();
        byGroup[grp].add(prop.key);
      }
    }

    const controllerCount = allMeta.length;
    const universal = [...propertyCounts.entries()]
      .filter(([, count]) => count === controllerCount)
      .map(([key]) => key);

    // Properties unique to a single controller
    const singleUse = new Map<string, string>();
    for (const meta of allMeta) {
      const label = meta.description || meta.filename;
      for (const prop of meta.properties) {
        if (propertyCounts.get(prop.key) === 1) {
          singleUse.set(prop.key, label);
        }
      }
    }
    const uniqueTo: Record<string, string[]> = {};
    for (const [propKey, controller] of singleUse.entries()) {
      if (!uniqueTo[controller]) uniqueTo[controller] = [];
      uniqueTo[controller].push(propKey);
    }

    // Convert group sets to arrays
    const byGroupArr: Record<string, string[]> = {};
    for (const [grp, keys] of Object.entries(byGroup)) {
      byGroupArr[grp] = [...keys].sort();
    }

    return {
      total_properties: totalProps,
      unique_properties: propertyCounts.size,
      by_group: byGroupArr,
      by_controller: byController,
      universal_properties: universal.sort(),
      unique_to: uniqueTo,
    };
  }

  /**
   * Compare two controllers by description or filename.
   * Both must be present in the cache.
   */
  compareControllers(a: string, b: string): ControllerComparison {
    const metaA = this.findByLabel(a);
    const metaB = this.findByLabel(b);

    if (!metaA) throw new Error(`Controller not found in cache: "${a}"`);
    if (!metaB) throw new Error(`Controller not found in cache: "${b}"`);

    const propsA = new Set(metaA.properties.map(p => p.key));
    const propsB = new Set(metaB.properties.map(p => p.key));

    const shared = [...propsA].filter(k => propsB.has(k)).sort();
    const onlyFirst = [...propsA].filter(k => !propsB.has(k)).sort();
    const onlySecond = [...propsB].filter(k => !propsA.has(k)).sort();

    // Capability diff
    const capsA = new Set(metaA.capabilities);
    const capsB = new Set(metaB.capabilities);
    const capOnlyFirst = [...capsA].filter(c => !capsB.has(c));
    const capOnlySecond = [...capsB].filter(c => !capsA.has(c));

    // Motion limit diff
    const ml = metaA.motionLimits;
    const mlB = metaB.motionLimits;
    const motionDiff: Record<string, [number, number]> = {};
    const limitKeys: (keyof MotionLimits)[] = [
      "minimumChordLength_mm",
      "minimumCircularRadius_mm",
      "maximumCircularRadius_mm",
      "minimumCircularSweep_rad",
      "maximumCircularSweep_rad",
    ];
    for (const k of limitKeys) {
      if (ml[k] !== mlB[k]) {
        motionDiff[k] = [ml[k], mlB[k]];
      }
    }

    return {
      controllers: [metaA.description || metaA.filename, metaB.description || metaB.filename],
      shared_properties: shared,
      only_in_first: onlyFirst,
      only_in_second: onlySecond,
      capability_diff: { first: capOnlyFirst, second: capOnlySecond },
      motion_limit_diff: motionDiff,
    };
  }

  // -------------------------------------------------------------------------
  // Cache management
  // -------------------------------------------------------------------------

  /** Return all cached metadata entries. */
  getAllCached(): CPSMetadata[] {
    return [...this.cache.values()];
  }

  /** Clear the entire parse cache. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Get the number of cached entries. */
  get cacheSize(): number {
    return this.cache.size;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Find a cached metadata entry by description or filename (case-insensitive).
   */
  private findByLabel(label: string): CPSMetadata | undefined {
    const lc = label.toLowerCase();
    for (const meta of this.cache.values()) {
      if (
        meta.description.toLowerCase() === lc ||
        meta.filename.toLowerCase() === lc ||
        meta.filename.toLowerCase().replace(/\.cps$/, "") === lc
      ) {
        return meta;
      }
    }
    // Fallback: substring match on description
    for (const meta of this.cache.values()) {
      if (meta.description.toLowerCase().includes(lc)) {
        return meta;
      }
    }
    return undefined;
  }
}

export const fusionCPSParserEngine = new FusionCPSParserEngineImpl();
