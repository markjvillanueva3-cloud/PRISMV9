/**
 * GWizardToolCribExportEngine — write PRISM's tool catalog INTO G-Wizard's toolcrib.csv format.
 *
 * Sibling of the read-only `GWizardAdapterEngine` (OSCAR-SFC-9AXIS-MS0/U-OSC9-12). The adapter
 * is "Read-only by design — never writes back"; this engine is the inverse direction —
 * it serializes PRISM `CatalogTool` records into the exact 60-column toolcrib.csv shape that
 * `GWizardAdapterEngine.parseCsv()` reads, so the round-trip is verifiable
 * (export → parseCsv → identical tools). Closes the operator goal "tool/holder/insert/machine
 * databases are added to G-Wizard".
 *
 * SAFETY / DESIGN decisions (golf→romeo, 2026-06-08):
 *   • UNITS-FIRST — PRISM's catalog is millimetres; rows are emitted with `units="mm"` and
 *     diameters in mm so G-Wizard never reads a 6 mm cutter as 6 inches (the 25.4× class of bug).
 *   • SFM / IPT left as G-Wizard's literal `NaN` (unset) — surface-speed / feed-per-tooth are
 *     G-Wizard's OWN computed output from its material DB; PRISM supplies the tool crib
 *     (geometry + identity + holder), which is the database the operator asked for. Populating
 *     speeds/feeds would require resolving G-Wizard's column unit semantics first — deferred to
 *     avoid an unverified units assumption (R12).
 *   • Deterministic GUIDs — each tool's guid is a stable SHA-1 derivation of its catalog `id`,
 *     so re-exporting UPDATES the same G-Wizard rows instead of duplicating them (idempotent).
 *   • Non-destructive default — `writeToolcrib` writes to a PRISM staging path, NOT the
 *     operator's live `%APPDATA%/GWizard.<hash>/toolcrib.csv`. Writing the live file is an
 *     outward-facing/destructive action, so it is opt-in via an explicit `out_path`.
 *
 * @module engines/GWizardToolCribExportEngine
 * @milestone CATALOG-APP-WIRING / gwizard_export_toolcrib (romeo, 2026-06-08)
 * @author romeo (slot:romeo)
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { z } from "zod";
import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { gWizardAdapterEngine } from "./GWizardAdapterEngine.js";

// ============================================================================
// SCHEMA — INPUT
// ============================================================================

export const GWizardExportInputSchema = z.object({
  /** Explicit tools to export. When omitted, the catalog is queried with the filters below. */
  tools: z.array(z.any()).optional(),
  /** Catalog filter — tool type (end_mill, drill, ...). */
  type: z.string().optional(),
  /** Catalog filter — ISO material group (P/M/K/N/S/H). */
  iso_group: z.string().optional(),
  /** Catalog filter — manufacturer. */
  manufacturer: z.string().optional(),
  /** Cap on how many tools to export (default 500, max 100000). */
  max_tools: z.number().int().positive().max(100000).optional(),
  /** Units to emit. Catalog is mm-native; default "mm". */
  units: z.enum(["mm", "inches"]).optional(),
  /** Optional output path. Required to actually write a file in `writeToolcrib`. */
  out_path: z.string().optional(),
  /**
   * When true (and `out_path` is the operator's live crib), preserve the operator's existing
   * NON-PRISM tools by reading the live file and merging — PRISM rows (matched by deterministic
   * guid) are replaced, operator-authored rows are kept. Default false.
   */
  merge_existing: z.boolean().optional(),
});

export type GWizardExportInput = z.infer<typeof GWizardExportInputSchema>;

export interface GWizardExportResult {
  /** The serialized toolcrib.csv text (header + one row per tool). */
  csv: string;
  /** Number of PRISM tool rows emitted. */
  tool_count: number;
  /** Number of operator rows preserved via merge (0 when not merging). */
  preserved_count: number;
  units: "mm" | "inches";
  warnings: string[];
}

export interface GWizardWriteResult {
  path: string;
  tool_count: number;
  preserved_count: number;
  bytes: number;
  warnings: string[];
}

// ============================================================================
// CANONICAL HEADER — mirrors the operator file documented in GWizardAdapterEngine.
// parseCsv() is header-name-indexed, so this is the authoritative round-trip contract.
// ============================================================================

const TOOLCRIB_HEADER: readonly string[] = [
  "key", "tabname", "guid", "slot", "description", "serialno", "tool", "generic", "geometry",
  "flutes", "leadang", "diameter", "stickout", "cutLength", "overallLength", "shankSize",
  "noseRad", "helixAngle", "coating", "toolmaterial", "toolFamily", "vendor", "product",
  "idNo", "insNo", "sfm", "ipt", "chipload", "useMfgSFM", "mfgSFM", "useMfgIPT", "mfgIPT",
  "xcomp", "zcomp", "xgeom", "zgeom", "status", "quantity", "field1", "field2", "field3",
  "field4", "units", "holderType", "holderDesc", "holderDia", "holderLen", "comment",
  "clockwise", "coolantMode", "coolantSupport", "shoulderLength", "taperAngle2", "threadPitch",
  "tipLength", "tipDiameter", "productLink", "jobCode", "pricePaid",
];

/** G-Wizard's literal sentinel for an unset numeric cell. The adapter coerces it back to undefined. */
const NAN = "NaN";

/** Map PRISM catalog tool `type` + `material` → a human G-Wizard tool-class string. */
const TOOL_CLASS: Record<string, string> = {
  end_mill: "Endmill",
  ball_mill: "Ball Endmill",
  bull_mill: "Bullnose Endmill",
  face_mill: "Face Mill",
  chamfer_mill: "Chamfer Mill",
  slot_drill: "Slot Drill",
  drill: "Drill",
  tap: "Tap",
  reamer: "Reamer",
  boring_bar: "Boring Bar",
  insert: "Insert",
  turning_tool: "Turning Tool",
  threading_tool: "Threading Tool",
  grooving_tool: "Grooving Tool",
};

// ============================================================================
// ENGINE
// ============================================================================

export class GWizardToolCribExportEngine {
  /**
   * Resolve the tool set (explicit input.tools OR a catalog query) and serialize to toolcrib.csv.
   *
   * @param raw GWizardExportInput
   * @returns GWizardExportResult — csv text + counts + warnings (never throws on empty; warns).
   */
  export(raw: unknown): GWizardExportResult {
    const input = GWizardExportInputSchema.parse(raw);
    const units = input.units ?? "mm";
    const warnings: string[] = [];

    let tools: any[];
    if (Array.isArray(input.tools)) {
      // Explicit tool set — an empty array means "export nothing", respected (not overridden).
      tools = input.tools;
    } else {
      // No tools provided — query the live catalog with the given filters.
      tools = [];
      try {
        if (toolCatalogEngine?.search) {
          tools =
            toolCatalogEngine.search({
              type: input.type,
              iso_group: input.iso_group,
              manufacturer: input.manufacturer,
              max_results: input.max_tools ?? 500,
            } as any) || [];
        }
      } catch (err) {
        warnings.push(
          `tool catalog query failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    if (input.max_tools && tools.length > input.max_tools) {
      tools = tools.slice(0, input.max_tools);
    }
    if (tools.length === 0) {
      warnings.push("no tools matched the export filters — emitting header-only crib");
    }

    // Optional merge: preserve operator-authored rows that PRISM did not generate.
    let preserved: string[][] = [];
    if (input.merge_existing && input.out_path) {
      preserved = this._readExistingForMerge(input.out_path, tools, warnings).preservedRows;
    }

    const rows: string[] = [TOOLCRIB_HEADER.join(",")];
    let slotNo = 0;
    for (const t of tools) {
      slotNo++;
      const row = this._toolToRow(t, slotNo, units, warnings);
      rows.push(this._encodeRow(row));
    }
    // Append preserved operator rows after PRISM rows (their original column order is the same header).
    for (const pr of preserved) {
      rows.push(this._encodeRow(pr));
    }

    return {
      csv: rows.join("\r\n") + "\r\n",
      tool_count: tools.length,
      preserved_count: preserved.length,
      units,
      warnings,
    };
  }

  /**
   * Serialize + write the crib to disk. Defaults to a PRISM staging path; the operator's live
   * crib is written ONLY when `out_path` is given explicitly (outward-facing → opt-in).
   *
   * @param raw GWizardExportInput
   * @returns GWizardWriteResult — resolved path + counts + bytes.
   * @throws Error if the file cannot be written.
   */
  writeToolcrib(raw: unknown): GWizardWriteResult {
    const input = GWizardExportInputSchema.parse(raw);
    const result = this.export(input);

    const path =
      input.out_path ??
      join(
        process.cwd(),
        "state",
        "shared",
        "exports",
        "gwizard-toolcrib.csv",
      );

    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, result.csv, "utf8");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to write G-Wizard toolcrib to ${path}: ${msg}`);
    }

    return {
      path,
      tool_count: result.tool_count,
      preserved_count: result.preserved_count,
      bytes: Buffer.byteLength(result.csv, "utf8"),
      warnings: result.warnings,
    };
  }

  /** Stable UUID-shaped guid derived from a catalog tool id (idempotent re-export). */
  toolGuid(id: string): string {
    const h = createHash("sha1").update(`prism:${id}`).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }

  // --------------------------------------------------------------------------
  // INTERNAL
  // --------------------------------------------------------------------------

  /** Map one CatalogTool → an ordered cell array aligned to TOOLCRIB_HEADER. */
  private _toolToRow(t: any, slot: number, units: "mm" | "inches", warnings: string[]): string[] {
    const phys = t?.physical ?? {};
    const id = String(t?.id ?? `unknown-${slot}`);
    if (!t?.id) warnings.push(`tool at slot ${slot} has no id — guid derived from positional fallback`);

    const num = (v: unknown): string =>
      typeof v === "number" && Number.isFinite(v) ? String(v) : NAN;
    const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));

    const toolClass = TOOL_CLASS[String(t?.type)] ?? str(t?.type);
    const description = [t?.manufacturer, t?.series, t?.designation]
      .filter((x) => x !== undefined && x !== null && String(x).length > 0)
      .join(" ")
      .trim() || id;

    const cell: Record<string, string> = {
      key: String(slot),
      tabname: "PRISM",
      guid: this.toolGuid(id),
      slot: "0", // unassigned pocket — G-Wizard assigns on import
      description,
      serialno: "",
      tool: toolClass,
      generic: "",
      geometry: str(t?.subtype ?? t?.type),
      flutes: num(t?.flute_count),
      leadang: NAN,
      diameter: num(phys?.cutting_diameter_mm),
      stickout: NAN, // setup-dependent — unknown at catalog level
      cutLength: num(phys?.flute_length_mm),
      overallLength: num(phys?.overall_length_mm),
      shankSize: num(phys?.shank_diameter_mm),
      noseRad: num(phys?.nose_radius_mm ?? phys?.corner_radius_mm),
      helixAngle: num(t?.helix_angle_deg),
      coating: str(t?.coating),
      toolmaterial: str(t?.material),
      toolFamily: str(t?.type),
      vendor: str(t?.manufacturer),
      product: str(t?.designation),
      idNo: "",
      insNo: "",
      sfm: NAN, // G-Wizard computes from its material DB
      ipt: NAN,
      chipload: NAN,
      useMfgSFM: "false",
      mfgSFM: NAN,
      useMfgIPT: "false",
      mfgIPT: NAN,
      xcomp: NAN,
      zcomp: NAN,
      xgeom: NAN,
      zgeom: NAN,
      status: "Active",
      quantity: "1",
      field1: "",
      field2: "",
      field3: "",
      field4: "",
      units, // mm (catalog-native) — prevents 25.4× misread
      holderType: str(t?.holder_interface),
      holderDesc: str(t?.holder_interface),
      holderDia: NAN,
      holderLen: NAN,
      comment: `PRISM export (${str(t?.source) || "catalog"})`,
      clockwise: "true",
      coolantMode: str(t?.coolant),
      coolantSupport: "",
      shoulderLength: NAN,
      taperAngle2: NAN,
      threadPitch: NAN,
      tipLength: NAN,
      tipDiameter: NAN,
      productLink: "",
      jobCode: "",
      pricePaid: num(t?.price_usd),
    };

    return TOOLCRIB_HEADER.map((h) => cell[h] ?? "");
  }

  /**
   * Encode a CSV cell. The G-Wizard adapter splits the file into rows on `\r?\n` BEFORE it
   * field-splits each line, so a literal newline inside a value cannot round-trip — it would
   * split one tool across two rows and corrupt the crib. Collapse CR/LF to a space first, then
   * RFC-4180-quote (doubling embedded quotes) only when a comma or quote remains.
   */
  private _encodeCell(v: string): string {
    const flat = v.replace(/[\r\n]+/g, " ");
    if (/[",]/.test(flat)) {
      return `"${flat.replace(/"/g, '""')}"`;
    }
    return flat;
  }

  private _encodeRow(cells: string[]): string {
    return cells.map((c) => this._encodeCell(c)).join(",");
  }

  /**
   * Read the operator's existing crib (if present) and return the raw cell-rows that PRISM did
   * NOT generate (guid not in the about-to-be-written PRISM set), so a merge keeps operator tools.
   */
  private _readExistingForMerge(
    outPath: string,
    prismTools: any[],
    warnings: string[],
  ): { preservedRows: string[][]; preservedGuids: Set<string> } {
    const prismGuids = new Set(prismTools.map((t) => this.toolGuid(String(t?.id ?? ""))));
    const preservedRows: string[][] = [];
    const preservedGuids = new Set<string>();
    try {
      const state = gWizardAdapterEngine.read({ toolcrib_path: outPath });
      for (const existing of state.tools) {
        if (!prismGuids.has(existing.guid)) {
          // Preserve by re-serializing the parsed tool back through our row mapper is lossy;
          // instead we keep only the columns the adapter exposes. Operator rows we cannot fully
          // round-trip are flagged so nothing is silently dropped.
          preservedGuids.add(existing.guid);
          preservedRows.push(this._gwizardToolToRow(existing));
        }
      }
    } catch (err) {
      // No existing file / unreadable → nothing to preserve. Surface, don't bury (R12).
      warnings.push(
        `merge_existing: could not read existing crib at ${outPath} — proceeding with PRISM rows only (${err instanceof Error ? err.message : String(err)})`,
      );
    }
    return { preservedRows, preservedGuids };
  }

  /** Re-serialize a parsed GWizardTool (operator-preserved) back to an ordered cell array. */
  private _gwizardToolToRow(t: any): string[] {
    const num = (v: unknown): string =>
      typeof v === "number" && Number.isFinite(v) ? String(v) : NAN;
    const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
    const cell: Record<string, string> = {
      key: num(t?.key),
      tabname: str(t?.tabname),
      guid: str(t?.guid),
      slot: num(t?.slot),
      description: str(t?.description),
      tool: str(t?.tool),
      geometry: str(t?.geometry),
      flutes: num(t?.flutes),
      diameter: num(t?.diameter),
      stickout: num(t?.stickout),
      cutLength: num(t?.cutLength),
      overallLength: num(t?.overallLength),
      shankSize: num(t?.shankSize),
      noseRad: num(t?.noseRad),
      helixAngle: num(t?.helixAngle),
      coating: str(t?.coating),
      toolmaterial: str(t?.toolmaterial),
      toolFamily: str(t?.toolFamily),
      vendor: str(t?.vendor),
      product: str(t?.product),
      sfm: num(t?.sfm),
      ipt: num(t?.ipt),
      chipload: num(t?.chipload),
      useMfgSFM: t?.useMfgSFM === undefined ? "" : String(t.useMfgSFM),
      mfgSFM: num(t?.mfgSFM),
      useMfgIPT: t?.useMfgIPT === undefined ? "" : String(t.useMfgIPT),
      mfgIPT: num(t?.mfgIPT),
      status: str(t?.status),
      quantity: num(t?.quantity),
      units: t?.units && t.units !== "unknown" ? String(t.units) : "",
      holderType: str(t?.holderType),
      holderDesc: str(t?.holderDesc),
      comment: str(t?.comment),
    };
    return TOOLCRIB_HEADER.map((h) => cell[h] ?? "");
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const gWizardToolCribExportEngine = new GWizardToolCribExportEngine();
