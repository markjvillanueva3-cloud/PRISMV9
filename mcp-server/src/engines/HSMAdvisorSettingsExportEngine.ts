/**
 * HSMAdvisorSettingsExportEngine — write a PRISM tool into HSMAdvisor's settings_v2.xml state.
 *
 * Sibling of the read-only `HSMAdvisorAdapterEngine` (OSCAR-SFC-9AXIS-MS0/U-OSC9-09); the
 * inverse direction. SCOPE (honest, R12): HSMAdvisor's `settings_v2.xml` holds the operator's
 * CURRENTLY-SELECTED tool — a single `<Tool>` block plus the computed `<Cut>` and global
 * `<Settings>`. It is NOT a bulk tool library (HSMAdvisor's library is a separate format PRISM
 * has no reader for, so a bulk-library export could not be round-trip-verified — and romeo does
 * not ship wiring without a round-trip test). What IS verifiable + valuable: push ONE PRISM
 * catalog tool (the operator's chosen/recommended tool) into HSMAdvisor's current state so they
 * open HSMAdvisor pre-loaded with PRISM's selection. Round-trips through the existing
 * `hsmAdvisorAdapterEngine.parseXml` reader.
 *
 * SAFETY / DESIGN (romeo, 2026-06-09):
 *   • UNITS — HSMAdvisor stores INCH natively (the adapter multiplies length fields by 25.4 only
 *     when read with convert_to_mm=true). PRISM's catalog is mm, so we convert mm→inch (÷25.4) on
 *     emit. The round-trip test reads back with convert_to_mm=true (×25.4) and asserts the mm
 *     value is recovered — this explicitly proves the 25.4× conversion runs in the right direction
 *     (the units-first safety rail, made a test).
 *   • Deterministic GUID from the catalog id (idempotent — re-export overwrites the same state).
 *   • Non-destructive default — writeSettings() writes a PRISM staging path, NOT the operator's
 *     live %APPDATA%/HSMAdvisor/settings_v2.xml. Live write is opt-in via explicit out_path
 *     (overwriting the operator's live calculator state is outward-facing).
 *   • Length fields unknown at catalog level (stickout, doc, woc) are emitted 0 — HSMAdvisor
 *     recomputes them per operation. Material/coating enum ids are HSMAdvisor-internal with no
 *     clean PRISM mapping, so emitted 0 (default) and flagged in a warning rather than guessed.
 *
 * @module engines/HSMAdvisorSettingsExportEngine
 * @milestone CATALOG-APP-WIRING / hsmadvisor_export_settings (romeo, 2026-06-09)
 * @author romeo (slot:romeo)
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { z } from "zod";
import { toolCatalogEngine } from "./ToolCatalogEngine.js";

// ============================================================================
// SCHEMA — INPUT
// ============================================================================

export const HSMAdvisorExportInputSchema = z.object({
  /** The single PRISM CatalogTool to push into HSMAdvisor's <Tool> state. */
  tool: z.any().optional(),
  /** Or resolve one from the catalog by id (first match wins). */
  tool_id: z.string().optional(),
  /** Optional catalog filter when neither `tool` nor `tool_id` is given — takes the top match. */
  type: z.string().optional(),
  iso_group: z.string().optional(),
  manufacturer: z.string().optional(),
  /** Global settings to emit in the <Settings> block (percentages). */
  sfm_pc: z.number().optional(),
  ipt_pc: z.number().optional(),
  /** Optional output path. Required to write the operator's LIVE settings_v2.xml (opt-in). */
  out_path: z.string().optional(),
});

export type HSMAdvisorExportInput = z.infer<typeof HSMAdvisorExportInputSchema>;

export interface HSMAdvisorExportResult {
  /** The settings_v2.xml text (UTF-8; values in INCH, HSMAdvisor-native). */
  xml: string;
  /** Whether a tool was resolved + emitted (false → header/settings-only with a warning). */
  tool_emitted: boolean;
  warnings: string[];
}

export interface HSMAdvisorWriteResult {
  path: string;
  tool_emitted: boolean;
  bytes: number;
  warnings: string[];
}

/** Map PRISM catalog tool `type` → HSMAdvisor's `<type>` string. */
const HSM_TYPE: Record<string, string> = {
  end_mill: "endmill",
  ball_mill: "endmill",
  bull_mill: "endmill",
  chamfer_mill: "endmill",
  slot_drill: "endmill",
  face_mill: "facemill",
  drill: "drill",
  tap: "tap",
  reamer: "reamer",
  boring_bar: "boring",
  turning_tool: "turning",
  threading_tool: "threading",
  grooving_tool: "grooving",
  insert: "turning",
};

const MM_PER_INCH = 25.4;

// ============================================================================
// ENGINE
// ============================================================================

export class HSMAdvisorSettingsExportEngine {
  /**
   * Resolve a single tool + serialize a settings_v2.xml snapshot.
   *
   * @param raw HSMAdvisorExportInput
   * @returns HSMAdvisorExportResult — xml + tool_emitted + warnings (never throws on no-tool).
   */
  export(raw: unknown): HSMAdvisorExportResult {
    const input = HSMAdvisorExportInputSchema.parse(raw);
    const warnings: string[] = [];

    const tool = this._resolveTool(input, warnings);
    const settingsXml = this._settingsBlock(input);
    const toolXml = tool ? this._toolBlock(tool, warnings) : "";
    if (!tool) warnings.push("no tool resolved — emitting <Settings>-only state (no <Tool> block)");

    const xml =
      `<?xml version="1.0" encoding="utf-16"?>\r\n` +
      `<DataBase>\r\n` +
      settingsXml +
      toolXml +
      `</DataBase>\r\n`;

    return { xml, tool_emitted: !!tool, warnings };
  }

  /**
   * Serialize + write the settings snapshot. Defaults to a PRISM staging path; the operator's
   * live settings_v2.xml is written ONLY when out_path is given explicitly (outward-facing).
   *
   * @throws Error if the file cannot be written.
   */
  writeSettings(raw: unknown): HSMAdvisorWriteResult {
    const input = HSMAdvisorExportInputSchema.parse(raw);
    const result = this.export(input);
    const path =
      input.out_path ??
      join(process.cwd(), "state", "shared", "exports", "hsmadvisor-settings_v2.xml");
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, result.xml, "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to write HSMAdvisor settings to ${path}: ${msg}`);
    }
    return {
      path,
      tool_emitted: result.tool_emitted,
      bytes: Buffer.byteLength(result.xml, "utf8"),
      warnings: result.warnings,
    };
  }

  /** Stable UUID-shaped guid derived from a catalog tool id (idempotent re-export). */
  toolGuid(id: string): string {
    const h = createHash("sha1").update(`prism-hsm:${id}`).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  private _resolveTool(input: HSMAdvisorExportInput, warnings: string[]): any | null {
    if (input.tool && typeof input.tool === "object") return input.tool;
    try {
      if (toolCatalogEngine?.search) {
        const results =
          toolCatalogEngine.search({
            type: input.type,
            iso_group: input.iso_group,
            manufacturer: input.manufacturer,
            max_results: 50,
          } as any) || [];
        if (input.tool_id) {
          const byId = results.find((t: any) => String(t?.id) === input.tool_id);
          if (byId) return byId;
          warnings.push(`tool_id "${input.tool_id}" not found in catalog query — falling back to top match`);
        }
        if (results.length > 0) return results[0];
      }
    } catch (err) {
      warnings.push(`tool catalog query failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
  }

  /** mm → inch (HSMAdvisor-native), rounded to 5 decimals to keep the XML readable. */
  private _toInch(mm: unknown): number {
    if (typeof mm !== "number" || !Number.isFinite(mm)) return 0;
    return Math.round((mm / MM_PER_INCH) * 1e5) / 1e5;
  }

  private _settingsBlock(input: HSMAdvisorExportInput): string {
    const sfm = typeof input.sfm_pc === "number" ? input.sfm_pc : 100;
    const ipt = typeof input.ipt_pc === "number" ? input.ipt_pc : 100;
    return (
      `  <Settings>\r\n` +
      `    <settings_sfm_pc>${sfm}</settings_sfm_pc>\r\n` +
      `    <settings_ipt_pc>${ipt}</settings_ipt_pc>\r\n` +
      `    <settings_CMB_deflection_limit>70</settings_CMB_deflection_limit>\r\n` +
      `    <settings_CMB_torque_limit>70</settings_CMB_torque_limit>\r\n` +
      `    <settings_CMB_tool_performance>0</settings_CMB_tool_performance>\r\n` +
      `  </Settings>\r\n`
    );
  }

  private _toolBlock(t: any, warnings: string[]): string {
    const phys = t?.physical ?? {};
    const id = String(t?.id ?? "unknown");
    if (!t?.id) warnings.push("tool has no id — guid derived from positional fallback");

    const hsmType = HSM_TYPE[String(t?.type)] ?? "endmill";
    const comment = `PRISM export ${[t?.manufacturer, t?.designation].filter(Boolean).join(" ")}`.trim();
    if (typeof t?.material === "string" && t.material.length > 0) {
      // HSMAdvisor material/coating enum ids are internal — we cannot map PRISM material strings
      // to them safely, so they are left 0 (HSMAdvisor default) rather than guessed.
      warnings.push(`material "${t.material}"/coating not mapped to HSMAdvisor enum ids (emitted 0)`);
    }

    const noseRad = phys?.corner_radius_mm ?? phys?.nose_radius_mm;
    const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

    return (
      `  <Tool>\r\n` +
      `    <guid>${this._xmlEscape(this.toolGuid(id))}</guid>\r\n` +
      `    <library>${this._xmlEscape(String(t?.source ?? "PRISM"))}</library>\r\n` +
      `    <comment>${this._xmlEscape(comment)}</comment>\r\n` +
      `    <id>1</id>\r\n` +
      `    <type>${this._xmlEscape(hsmType)}</type>\r\n` +
      `    <diameter>${this._toInch(phys?.cutting_diameter_mm)}</diameter>\r\n` +
      `    <Shank_Dia>${this._toInch(phys?.shank_diameter_mm)}</Shank_Dia>\r\n` +
      `    <Flute_N>${num(t?.flute_count)}</Flute_N>\r\n` +
      `    <Flute_Len>${this._toInch(phys?.flute_length_mm)}</Flute_Len>\r\n` +
      `    <Shoulder_Len>${this._toInch(phys?.neck_length_mm ?? phys?.flute_length_mm)}</Shoulder_Len>\r\n` +
      `    <helix_angle>${num(t?.helix_angle_deg)}</helix_angle>\r\n` +
      `    <leadangle>0</leadangle>\r\n` +
      `    <corner_rad>${this._toInch(noseRad)}</corner_rad>\r\n` +
      `    <stickout>0</stickout>\r\n` +
      `    <tool_material_id>0</tool_material_id>\r\n` +
      `    <coating_id>0</coating_id>\r\n` +
      `    <productivity>0</productivity>\r\n` +
      `    <maxdeflection_pc>0</maxdeflection_pc>\r\n` +
      `    <maxtorque_pc>0</maxtorque_pc>\r\n` +
      `    <sfm_adj>100</sfm_adj>\r\n` +
      `    <ipt_adj>100</ipt_adj>\r\n` +
      `    <doc>0</doc>\r\n` +
      `    <woc>0</woc>\r\n` +
      `    <number>1</number>\r\n` +
      `  </Tool>\r\n`
    );
  }

  /** Escape the 5 XML predefined entities for text content. */
  private _xmlEscape(v: string): string {
    return v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const hsmAdvisorSettingsExportEngine = new HSMAdvisorSettingsExportEngine();
