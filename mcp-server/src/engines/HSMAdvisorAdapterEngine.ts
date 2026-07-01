/**
 * HSMAdvisorAdapterEngine — read-only adapter for HSMAdvisor's `settings_v2.xml`
 *
 * Closes U-OSC9-09 of OSCAR-SFC-9AXIS-MS0: brings HSMAdvisor (operator's local
 * speed/feed calculator) into PRISM as a LIVE comparison baseline. The static
 * SpeedFeedBaselineComparatorEngine already documents HSMAdvisor as a reference
 * source via published tables; this adapter reads the operator's ACTUAL current
 * calculation state directly from disk.
 *
 * Data source (verified 2026-05-26 on operator's machine):
 *   - `%APPDATA%/HSMAdvisor/settings_v2.xml`
 *   - UTF-16 LE encoding (BOM-prefixed) — Node defaults to UTF-8 + `<?xml encoding="utf-16"?>` declaration
 *   - Schema (verified live):
 *       <DataBase>
 *         <Settings>...      ← global UI + calc settings (sfm_pc, ipt_pc, deflection limits, ...)
 *         <Tool>...          ← current selected tool (diameter, flutes, type, material_id, ...)
 *         <Cut>...           ← HSMAdvisor's COMPUTED OUTPUT (sfm, ipt, mrr, rpm, feed, tool_deflection)
 *       </DataBase>
 *
 * The <Cut> block carries the comparison currency: HSMAdvisor's own sfm/ipt/mrr
 * for the operator's currently-selected tool + material. PRISM's NineAxisOrchestrator
 * computes the same fields for the same input — comparison harness (iter3, U-OSC9-10)
 * will diff them.
 *
 * No XML library in PRISM deps — hand-rolled regex extractor for the specific
 * fields we need. The schema is simple (no namespaces, no CDATA, no attributes
 * on the fields we read), so regex is robust enough. Tested with a fixture string
 * that mirrors the live operator file shape exactly.
 *
 * Read-only by design: never writes back to HSMAdvisor's data files.
 *
 * @module engines/HSMAdvisorAdapterEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-09
 * @author oscar (slot:oscar, 2026-05-26)
 */

import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { z } from "zod";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default location of HSMAdvisor's per-user settings (Windows). */
function defaultSettingsPath(): string {
  // %APPDATA% on Windows resolves to C:\Users\<user>\AppData\Roaming
  const appData = process.env["APPDATA"] ?? join(homedir(), "AppData", "Roaming");
  return join(appData, "HSMAdvisor", "settings_v2.xml");
}

/** Override via env var (used for fixture-based tests + CI). */
function resolvedSettingsPath(override?: string): string {
  if (override) return override;
  const envOverride = process.env["PRISM_HSMADVISOR_SETTINGS_PATH"];
  if (envOverride) return envOverride;
  return defaultSettingsPath();
}

// ============================================================================
// SCHEMA — INPUT
// ============================================================================

export const HSMAdvisorReadInputSchema = z.object({
  /** Override the settings file path (tests, alternate install, network drive). */
  settings_path: z.string().optional(),
  /** Convert inch fields to mm in the result (HSMAdvisor stores inches by default). */
  convert_to_mm: z.boolean().default(false),
});

export type HSMAdvisorReadInput = z.infer<typeof HSMAdvisorReadInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Fields parsed from the <Tool> block — the operator's currently-selected tool. */
export interface HSMAdvisorTool {
  guid: string;
  library: string;
  comment: string;
  id: number;
  type: string; // "endmill" | "drill" | "turning" | ...
  diameter: number;
  shank_dia: number;
  flutes: number;
  flute_len: number;
  shoulder_len: number;
  helix_angle: number;
  leadangle: number;
  corner_rad: number;
  stickout: number;
  tool_material_id: number; // HSMAdvisor enum — needs lookup table for ISO mapping (iter3)
  coating_id: number;
  productivity: number;
  maxdeflection_pc: number;
  maxtorque_pc: number;
  sfm_adj: number;
  ipt_adj: number;
  doc: number;
  woc: number;
  number: number; // tool number (T-number)
}

/**
 * Fields parsed from the <Cut> block — HSMAdvisor's computed output for the
 * current tool + material + operation combination. THIS is the comparison
 * currency PRISM measures itself against in iter3.
 */
export interface HSMAdvisorCut {
  guid: string;
  tool_guid: string;
  tool_id: number;
  material_id: number; // HSMAdvisor enum — needs lookup table for ISO group (iter3)
  diameter: number;
  effective_dia: number;
  doc: number;
  woc: number;
  /** Computed surface speed (in/min on inch tools — units follow tool). */
  sfm: number;
  /** Computed feed per tooth. */
  ipt: number;
  /** Computed spindle RPM. */
  rpm: number;
  /** Computed feed rate. */
  feed: number;
  /** Computed material-removal rate. */
  mrr: number;
  /** Computed tool deflection. */
  tool_deflection: number;
  comment: string;
  operation_type: number;
  surface_finish: number;
  productivity: number;
  hsm: boolean;
  hss: boolean;
  manufacturer_sfm: number;
  manufacturer_ipt: number;
}

/** Subset of <Settings> the comparison harness cares about. */
export interface HSMAdvisorSettings {
  /** Global SFM override percentage applied across tools. */
  sfm_pc: number;
  /** Global IPT override percentage. */
  ipt_pc: number;
  /** Deflection-limit threshold (percent). */
  deflection_limit_pc: number;
  /** Torque-limit threshold (percent). */
  torque_limit_pc: number;
  /** Tool-performance hint level. */
  tool_performance: number;
}

export interface HSMAdvisorState {
  tool: HSMAdvisorTool | null;
  cut: HSMAdvisorCut | null;
  settings: HSMAdvisorSettings;
  /** mtime of the source file (ms since epoch) — for staleness checks in the comparison bridge. */
  source_mtime_ms: number;
  /** Resolved path the engine read from. */
  source_path: string;
  /** Whether result units were converted to mm (vs raw inch).
   *
   *  **IMPORTANT — partial conversion semantics:** when `units_mm=true` the engine
   *  scales LENGTH-bearing fields by 25.4 (diameter, doc, woc, feed, ipt, stickout, etc.).
   *  It does NOT silently scale fields whose unit conversion is non-trivial:
   *    - `sfm` stays in ft/min (HSMAdvisor's native unit) — convert to m/min via ×0.3048
   *    - `mrr` stays in in³/min when units_mm=true (the cm³/min factor is 16.387, NOT 25.4)
   *    - `rpm`, percentages, angles, counts are unitless — never scaled
   *
   *  The iter3 PRISM↔HSMAdvisor compare-bridge owns the unit-aware reconciliation.
   *  Bridge consumers MUST treat `sfm` + `mrr` as native-unit (inch-derived) regardless
   *  of this flag; otherwise iter3 will diff inch³/min vs cm³/min and report 16.4× error. */
  units_mm: boolean;
  /** Non-fatal warnings (missing optional fields, deprecated tags, etc.). */
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class HSMAdvisorAdapterEngine {
  /**
   * Read + parse the operator's HSMAdvisor settings_v2.xml and return the
   * current Tool/Cut/Settings snapshot.
   *
   * @param raw HSMAdvisorReadInput — settings_path override + unit-conversion flag.
   * @returns HSMAdvisorState — parsed snapshot + source mtime + warnings.
   * @throws Error with descriptive message when the file is missing or unreadable.
   *   (Parsing edge cases — missing Tool/Cut block — return null fields with warning.)
   */
  read(raw: unknown): HSMAdvisorState {
    const input = HSMAdvisorReadInputSchema.parse(raw);
    const path = resolvedSettingsPath(input.settings_path);

    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`HSMAdvisor settings not found at ${path}: ${msg}. Set PRISM_HSMADVISOR_SETTINGS_PATH or pass settings_path.`);
    }

    // Encoding detection: HSMAdvisor's settings_v2.xml declares `encoding="utf-16"` in the XML
    // prolog, but the live-operator file (verified 2026-05-26 on Win11) is actually stored as
    // UTF-8 on disk. .NET's XmlSerializer can produce this declaration/storage mismatch. So we
    // SNIFF THE BOM + first bytes and pick the right decoder instead of trusting the declaration.
    let buf: Buffer;
    try {
      buf = readFileSync(path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read HSMAdvisor settings at ${path}: ${msg}`);
    }
    let xml: string;
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      // UTF-16 LE BOM
      xml = buf.toString("utf16le").slice(1);
    } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      // UTF-16 BE BOM — swap to LE then decode
      xml = buf.swap16().toString("utf16le").slice(1);
    } else if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      // UTF-8 BOM
      xml = buf.toString("utf8").slice(1);
    } else {
      // No BOM — sniff first 4 bytes. UTF-16 LE without BOM has alternating zero high-bytes
      // for ASCII content, e.g. `<` at offset 0 is bytes 0x3C 0x00. UTF-8 / ASCII has the
      // ASCII byte at offset 0 and the next ASCII byte at offset 1.
      if (buf.length >= 4 && buf[0] !== 0 && buf[1] === 0 && buf[2] !== 0 && buf[3] === 0) {
        // ASCII-in-UTF-16-LE pattern
        xml = buf.toString("utf16le");
      } else if (buf.length >= 4 && buf[0] === 0 && buf[1] !== 0 && buf[2] === 0 && buf[3] !== 0) {
        // ASCII-in-UTF-16-BE pattern
        xml = buf.swap16().toString("utf16le");
      } else {
        // Default: UTF-8. Matches the live operator file (which declares utf-16 but stores utf-8).
        xml = buf.toString("utf8");
      }
    }

    return this.parseXml(xml, {
      sourcePath: path,
      sourceMtimeMs: stat.mtimeMs,
      convertToMm: input.convert_to_mm,
    });
  }

  /**
   * Parse the XML payload. Exposed for tests that feed a fixture string directly.
   *
   * @param xml UTF-8 / UTF-16-decoded XML string (BOM-stripped).
   * @param meta Source path + mtime + unit flag.
   * @returns HSMAdvisorState
   */
  parseXml(
    xml: string,
    meta: { sourcePath: string; sourceMtimeMs: number; convertToMm: boolean },
  ): HSMAdvisorState {
    const warnings: string[] = [];

    const settings = this.extractSettings(xml, warnings);
    const tool = this.extractTool(xml, warnings, meta.convertToMm);
    const cut = this.extractCut(xml, warnings, meta.convertToMm);

    return {
      tool,
      cut,
      settings,
      source_mtime_ms: meta.sourceMtimeMs,
      source_path: meta.sourcePath,
      units_mm: meta.convertToMm,
      warnings,
    };
  }

  // -- Section extractors ----------------------------------------------------

  private extractSettings(xml: string, warnings: string[]): HSMAdvisorSettings {
    const block = extractBlock(xml, "Settings");
    if (!block) {
      warnings.push("<Settings> block missing — using zeroed defaults");
      return { sfm_pc: 0, ipt_pc: 0, deflection_limit_pc: 0, torque_limit_pc: 0, tool_performance: 0 };
    }
    return {
      sfm_pc: extractNumberTag(block, "settings_sfm_pc") ?? 100,
      ipt_pc: extractNumberTag(block, "settings_ipt_pc") ?? 100,
      deflection_limit_pc: extractNumberTag(block, "settings_CMB_deflection_limit") ?? 70,
      torque_limit_pc: extractNumberTag(block, "settings_CMB_torque_limit") ?? 70,
      tool_performance: extractNumberTag(block, "settings_CMB_tool_performance") ?? 0,
    };
  }

  private extractTool(xml: string, warnings: string[], convertToMm: boolean): HSMAdvisorTool | null {
    const block = extractBlock(xml, "Tool");
    if (!block) {
      warnings.push("<Tool> block missing — no current tool selected in HSMAdvisor");
      return null;
    }
    const k = convertToMm ? 25.4 : 1;
    return {
      guid: extractStringTag(block, "guid") ?? "",
      library: extractStringTag(block, "library") ?? "",
      comment: extractStringTag(block, "comment") ?? "",
      id: extractNumberTag(block, "id") ?? 0,
      type: extractStringTag(block, "type") ?? "",
      diameter: (extractNumberTag(block, "diameter") ?? 0) * k,
      shank_dia: (extractNumberTag(block, "Shank_Dia") ?? 0) * k,
      flutes: extractNumberTag(block, "Flute_N") ?? 0,
      flute_len: (extractNumberTag(block, "Flute_Len") ?? 0) * k,
      shoulder_len: (extractNumberTag(block, "Shoulder_Len") ?? 0) * k,
      helix_angle: extractNumberTag(block, "helix_angle") ?? 0,
      leadangle: extractNumberTag(block, "leadangle") ?? 0,
      corner_rad: (extractNumberTag(block, "corner_rad") ?? 0) * k,
      stickout: (extractNumberTag(block, "stickout") ?? 0) * k,
      tool_material_id: extractNumberTag(block, "tool_material_id") ?? 0,
      coating_id: extractNumberTag(block, "coating_id") ?? 0,
      productivity: extractNumberTag(block, "productivity") ?? 0,
      maxdeflection_pc: extractNumberTag(block, "maxdeflection_pc") ?? 0,
      maxtorque_pc: extractNumberTag(block, "maxtorque_pc") ?? 0,
      sfm_adj: extractNumberTag(block, "sfm_adj") ?? 100,
      ipt_adj: extractNumberTag(block, "ipt_adj") ?? 100,
      doc: (extractNumberTag(block, "doc") ?? 0) * k,
      woc: (extractNumberTag(block, "woc") ?? 0) * k,
      number: extractNumberTag(block, "number") ?? 0,
    };
  }

  private extractCut(xml: string, warnings: string[], convertToMm: boolean): HSMAdvisorCut | null {
    const block = extractBlock(xml, "Cut");
    if (!block) {
      warnings.push("<Cut> block missing — no current cut computed in HSMAdvisor");
      return null;
    }
    const k = convertToMm ? 25.4 : 1;
    return {
      guid: extractStringTag(block, "guid") ?? "",
      tool_guid: extractStringTag(block, "tool_guid") ?? "",
      tool_id: extractNumberTag(block, "tool_id") ?? 0,
      material_id: extractNumberTag(block, "material_id") ?? 0,
      diameter: (extractNumberTag(block, "diameter") ?? 0) * k,
      effective_dia: (extractNumberTag(block, "effective_dia") ?? 0) * k,
      doc: (extractNumberTag(block, "doc") ?? 0) * k,
      woc: (extractNumberTag(block, "woc") ?? 0) * k,
      sfm: extractNumberTag(block, "sfm") ?? 0,
      ipt: (extractNumberTag(block, "ipt") ?? 0) * k,
      rpm: extractNumberTag(block, "rpm") ?? 0,
      feed: (extractNumberTag(block, "feed") ?? 0) * k,
      mrr: extractNumberTag(block, "mrr") ?? 0,
      tool_deflection: (extractNumberTag(block, "tool_deflection") ?? 0) * k,
      comment: extractStringTag(block, "comment") ?? "",
      operation_type: extractNumberTag(block, "operation_type") ?? 0,
      surface_finish: extractNumberTag(block, "surface_finish") ?? 0,
      productivity: extractNumberTag(block, "productivity") ?? 0,
      hsm: (extractNumberTag(block, "hsm") ?? 0) === 1,
      hss: (extractNumberTag(block, "hss") ?? 0) === 1,
      manufacturer_sfm: extractNumberTag(block, "Manufacturer_SFM") ?? 0,
      manufacturer_ipt: extractNumberTag(block, "Manufacturer_IPT") ?? 0,
    };
  }
}

// ============================================================================
// HAND-ROLLED XML EXTRACTORS
// ============================================================================

/**
 * Extract the contents of the FIRST `<TagName>...</TagName>` block.
 * Tolerates nested same-named tags only at the depth-1 level (HSMAdvisor schema
 * does not nest <Tool>, <Cut>, or <Settings> within themselves at depth 2+).
 *
 * Returns null if the block is missing.
 */
function extractBlock(xml: string, tagName: string): string | null {
  const open = `<${tagName}>`;
  const close = `</${tagName}>`;
  const openIdx = xml.indexOf(open);
  if (openIdx === -1) return null;
  const start = openIdx + open.length;
  const closeIdx = xml.indexOf(close, start);
  if (closeIdx === -1) return null;
  return xml.slice(start, closeIdx);
}

/**
 * Extract the text content of the FIRST `<tagName>value</tagName>` in `block`.
 * Returns undefined when the tag is missing or self-closing.
 */
function extractStringTag(block: string, tagName: string): string | undefined {
  // Anchor on a tag that opens with `<tagName>` (closing-bracket immediate — no attributes
  // on these fields per HSMAdvisor schema) to avoid matching `<tagName_other>`.
  const open = `<${tagName}>`;
  const close = `</${tagName}>`;
  const openIdx = block.indexOf(open);
  if (openIdx === -1) return undefined;
  const start = openIdx + open.length;
  const closeIdx = block.indexOf(close, start);
  if (closeIdx === -1) return undefined;
  return block.slice(start, closeIdx);
}

/**
 * Parse a numeric tag. Returns undefined when the tag is missing or the value
 * cannot be coerced (Number.isFinite is the gate — rejects NaN, Infinity, "").
 */
function extractNumberTag(block: string, tagName: string): number | undefined {
  const raw = extractStringTag(block, tagName);
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const hsmAdvisorAdapterEngine = new HSMAdvisorAdapterEngine();
