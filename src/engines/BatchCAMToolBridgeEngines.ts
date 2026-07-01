// @ts-nocheck
/**
 * BatchCAMToolBridgeEngines — 4 CAM Tool Library Bridge Engines in One File (E1143)
 *
 * Bridges native CAM tool library formats into PRISM's 95K+ tool catalog.
 * Each engine supports bidirectional sync: import (native → PRISM ToolRecord),
 * export (PRISM → native format), drift detection, and tool number mapping.
 *
 * Engines:
 *   MastercamToolBridgeEngine   — .mcam-tools format (delegates export to E1123)
 *   SolidCAMToolBridgeEngine    — SolidCAM tool table, iMachining parameters
 *   NXCAMToolBridgeEngine       — NX .dat library, 3D assembly + MDL integration
 *   HyperMillToolBridgeEngine   — hyperMILL SQLite .hmt DB (delegates export to E1127)
 *
 * Methods per engine:
 *   importTools(native_data)        — parse native format → PRISM ToolRecord[]
 *   exportTools(prism_tools[])      — PRISM → native format (or delegate)
 *   detectDrift(native, prism)      — compare libraries, return DriftReport
 *   getToolMapping()                — return tool number ↔ PRISM ID mapping table
 *
 * @engine BatchCAMToolBridgeEngines
 * @shortcode E1143
 * @dispatcher camDispatcher
 * @actions
 *   mastercam_tool_import, mastercam_tool_drift,
 *   solidcam_tool_import, solidcam_tool_drift,
 *   nx_tool_import, nx_tool_drift,
 *   hypermill_tool_import, hypermill_tool_drift
 * @milestone CAMX-MS9/U04
 */

import { mastercamToolExportEngine } from "./MastercamToolExportEngine.js";
import { hyperMillToolExportEngine } from "./HyperMillToolExportEngine.js";

// ─── Shared Types ─────────────────────────────────────────────────────────────

/** Normalized PRISM tool record — common fields across all CAM systems */
export interface ToolRecord {
  prism_id: string;
  tool_number: number;
  tool_type: string;          // "endmill" | "ballmill" | "drill" | "tap" | "reamer" | "chamfer" | ...
  description: string;
  manufacturer: string;
  manufacturer_part_no: string;
  diameter_mm: number;
  corner_radius_mm: number;
  flute_length_mm: number;
  oal_mm: number;
  flutes: number;
  material: string;           // "carbide" | "hss" | "ceramic" | "cbn" | "pcd"
  coating: string;            // "uncoated" | "TiN" | "TiAlN" | "AlTiN" | "DLC" | ...
  iso_group: string;          // "P" | "M" | "K" | "N" | "S" | "H"
  vc_recommended_m_min: number;
  fz_recommended_mm: number;
  holder_id: string;
  coolant_through: boolean;
  cam_native_id: string;      // original ID in source CAM system
  cam_system: string;         // "mastercam" | "solidcam" | "nxcam" | "hypermill"
  extra: Record<string, unknown>;
}

/** Result of detectDrift — itemised differences */
export interface DriftReport {
  cam_system: string;
  total_native: number;
  total_prism: number;
  added_in_prism: ToolRecord[];      // in PRISM but not in native
  missing_from_prism: ToolRecord[];  // in native but not in PRISM
  modified: Array<{
    tool_number: number;
    native_tool: ToolRecord;
    prism_tool: ToolRecord;
    differences: Record<string, { native: unknown; prism: unknown }>;
  }>;
  drift_score: number;               // 0.0 = identical, 1.0 = completely different
  summary: string;
}

/** Tool number ↔ PRISM ID mapping entry */
export interface ToolMappingEntry {
  tool_number: number;
  prism_id: string;
  cam_native_id: string;
  description: string;
  diameter_mm: number;
  is_active: boolean;
  last_synced: string;  // ISO timestamp
}

function unavailableExportResult(
  format: string,
  toolCount: number,
  delegate: string,
): Record<string, unknown> {
  return {
    success: false,
    degraded: true,
    format,
    tool_count: toolCount,
    error: `${delegate} is unavailable; export could not be generated honestly`,
  };
}

// ─── Base Class ───────────────────────────────────────────────────────────────

abstract class CAMToolBridgeBase {
  readonly camSystem: string;

  constructor(camSystem: string) {
    this.camSystem = camSystem;
  }

  /** Parse native CAM data (JSON object or parsed file content) → ToolRecord[] */
  abstract importTools(native_data: Record<string, unknown> | unknown[]): ToolRecord[];

  /** Export PRISM ToolRecords → native CAM format representation */
  abstract exportTools(prism_tools: ToolRecord[]): Record<string, unknown>;

  /** Compare native library vs PRISM records, return drift report */
  detectDrift(
    native_tools: ToolRecord[],
    prism_tools: ToolRecord[]
  ): DriftReport {
    const nativeByNum = new Map<number, ToolRecord>(
      native_tools.map((t) => [t.tool_number, t])
    );
    const prismByNum = new Map<number, ToolRecord>(
      prism_tools.map((t) => [t.tool_number, t])
    );

    const addedInPrism: ToolRecord[] = [];
    const missingFromPrism: ToolRecord[] = [];
    const modified: DriftReport["modified"] = [];

    // Tools in PRISM but not in native
    for (const [num, pt] of prismByNum) {
      if (!nativeByNum.has(num)) addedInPrism.push(pt);
    }

    // Tools in native but not in PRISM, or with differences
    for (const [num, nt] of nativeByNum) {
      const pt = prismByNum.get(num);
      if (!pt) {
        missingFromPrism.push(nt);
      } else {
        const diffs = this._diffTools(nt, pt);
        if (Object.keys(diffs).length > 0) {
          modified.push({ tool_number: num, native_tool: nt, prism_tool: pt, differences: diffs });
        }
      }
    }

    const total = native_tools.length + addedInPrism.length;
    const changedCount = addedInPrism.length + missingFromPrism.length + modified.length;
    const drift_score = total > 0 ? Math.min(1, changedCount / total) : 0;

    return {
      cam_system: this.camSystem,
      total_native: native_tools.length,
      total_prism: prism_tools.length,
      added_in_prism: addedInPrism,
      missing_from_prism: missingFromPrism,
      modified,
      drift_score: Math.round(drift_score * 1000) / 1000,
      summary: `${this.camSystem}: ${native_tools.length} native, ${prism_tools.length} PRISM — `
        + `${missingFromPrism.length} missing, ${addedInPrism.length} added, ${modified.length} modified. `
        + `Drift score: ${(drift_score * 100).toFixed(1)}%`,
    };
  }

  /** Build tool number ↔ PRISM ID mapping from a merged tool set */
  getToolMapping(tools: ToolRecord[]): ToolMappingEntry[] {
    const now = new Date().toISOString();
    return tools.map((t) => ({
      tool_number: t.tool_number,
      prism_id: t.prism_id,
      cam_native_id: t.cam_native_id,
      description: t.description,
      diameter_mm: t.diameter_mm,
      is_active: true,
      last_synced: now,
    }));
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  protected _diffTools(
    a: ToolRecord,
    b: ToolRecord
  ): Record<string, { native: unknown; prism: unknown }> {
    const COMPARE_KEYS: (keyof ToolRecord)[] = [
      "diameter_mm", "corner_radius_mm", "flute_length_mm", "oal_mm",
      "flutes", "material", "coating", "tool_type", "manufacturer",
      "vc_recommended_m_min", "fz_recommended_mm", "coolant_through",
    ];
    const diffs: Record<string, { native: unknown; prism: unknown }> = {};
    for (const key of COMPARE_KEYS) {
      const av = a[key];
      const bv = b[key];
      if (typeof av === "number" && typeof bv === "number") {
        if (Math.abs(av - bv) > 1e-4) diffs[key] = { native: av, prism: bv };
      } else if (av !== bv) {
        diffs[key] = { native: av, prism: bv };
      }
    }
    return diffs;
  }

  protected _coerceNum(v: unknown, fallback = 0): number {
    const n = parseFloat(String(v ?? ""));
    return isNaN(n) ? fallback : n;
  }

  protected _prismId(camSystem: string, nativeId: string): string {
    return `PRISM-${camSystem.toUpperCase()}-${nativeId}`;
  }
}

// ─── 1. MastercamToolBridgeEngine ─────────────────────────────────────────────

/**
 * Bridges Mastercam's .mcam-tools JSON-serialised tool library to PRISM.
 *
 * The .mcam-tools format is the JSON representation of Mastercam's tool
 * library file (.mcam-tools). Each entry carries:
 *   - tool_number, tool_type, description
 *   - geometry: diameter, corner_radius, flute_length, OAL, flutes
 *   - material_group (1–6 → ISO P/M/K/N/S/H)
 *   - holder_id, coolant_through
 *   - cutting_data: Vc (m/min), fz (mm/tooth) per material group
 *
 * Export delegates to MastercamToolExportEngine (E1123).
 */
export class MastercamToolBridgeEngine extends CAMToolBridgeBase {
  // Mastercam material group → ISO group
  private static readonly MC_GROUP_TO_ISO: Record<number, string> = {
    1: "P", 2: "M", 3: "K", 4: "N", 5: "S", 6: "H",
  };

  // Mastercam tool type codes → PRISM type strings
  private static readonly MC_TYPE_MAP: Record<string, string> = {
    end_mill: "endmill",
    ball_end_mill: "ballmill",
    bull_nose: "radiusmill",
    drill: "drill",
    tap: "tap",
    reamer: "reamer",
    chamfer_mill: "chamfer",
    t_slot: "tslot",
    dovetail: "dovetail",
    face_mill: "facemill",
    boring_bar: "boring",
    thread_mill: "threadmill",
    spot_drill: "spotdrill",
  };

  constructor() {
    super("mastercam");
  }

  /**
   * Parse Mastercam .mcam-tools data.
   * Accepts either the top-level JSON object or an array of tool entries.
   */
  importTools(native_data: Record<string, unknown> | unknown[]): ToolRecord[] {
    const entries: unknown[] = Array.isArray(native_data)
      ? native_data
      : (native_data.tools as unknown[]) ?? (native_data.ToolLibrary as unknown[]) ?? [];

    return entries
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const t = e as Record<string, unknown>;
        const geo = (t.geometry as Record<string, unknown>) ?? t;
        const cutData = (t.cutting_data as Record<string, number>) ?? {};
        const mcType = String(t.tool_type ?? t.type ?? "end_mill").toLowerCase().replace(/\s+/g, "_");
        const prismType = MastercamToolBridgeEngine.MC_TYPE_MAP[mcType] ?? mcType;
        const matGroup = this._coerceNum(t.material_group, 1) as 1 | 2 | 3 | 4 | 5 | 6;
        const isoGroup = MastercamToolBridgeEngine.MC_GROUP_TO_ISO[matGroup] ?? "P";
        const toolNo = this._coerceNum(t.tool_number ?? t.ToolNumber, 0);
        const nativeId = String(t.tool_id ?? t.ToolID ?? toolNo);

        return {
          prism_id: this._prismId("MC", nativeId),
          tool_number: toolNo,
          tool_type: prismType,
          description: String(t.description ?? t.Description ?? `Mastercam tool #${toolNo}`),
          manufacturer: String(t.manufacturer ?? t.Manufacturer ?? "Unknown"),
          manufacturer_part_no: String(t.part_number ?? t.PartNumber ?? ""),
          diameter_mm: this._coerceNum(geo.diameter ?? geo.Diameter),
          corner_radius_mm: this._coerceNum(geo.corner_radius ?? geo.CornerRadius),
          flute_length_mm: this._coerceNum(geo.flute_length ?? geo.FluteLength),
          oal_mm: this._coerceNum(geo.oal ?? geo.OAL ?? geo.overall_length),
          flutes: this._coerceNum(geo.flutes ?? geo.Flutes ?? t.num_flutes, 2),
          material: String(t.tool_material ?? t.ToolMaterial ?? "carbide").toLowerCase(),
          coating: String(t.coating ?? t.Coating ?? "uncoated").toLowerCase(),
          iso_group: isoGroup,
          vc_recommended_m_min: this._coerceNum(cutData.vc ?? cutData.CuttingSpeed),
          fz_recommended_mm: this._coerceNum(cutData.fz ?? cutData.ChipLoad),
          holder_id: String(t.holder_id ?? t.HolderID ?? ""),
          coolant_through: Boolean(t.coolant_through ?? t.CoolantThrough ?? false),
          cam_native_id: nativeId,
          cam_system: "mastercam",
          extra: {
            mc_type_raw: mcType,
            mc_material_group: matGroup,
            mc_offset_number: t.offset_number ?? t.OffsetNumber ?? toolNo,
            mc_comp_number: t.comp_number ?? t.CompNumber,
          },
        } as ToolRecord;
      });
  }

  /**
   * Export PRISM tools → Mastercam format.
   * Delegates to MastercamToolExportEngine (E1123) when available and fails
   * honestly if that export engine is unavailable.
   */
  exportTools(prism_tools: ToolRecord[]): Record<string, unknown> {
    if (mastercamToolExportEngine?.exportForJob) {
      const jobTools = prism_tools.map((t) => ({
        type: t.tool_type,
        diameter_mm: t.diameter_mm,
        flutes: t.flutes,
        manufacturer: t.manufacturer,
        part_number: t.manufacturer_part_no,
        iso_group: t.iso_group,
        coating: t.coating,
        tool_material: t.material,
      }));
      return mastercamToolExportEngine.exportForJob(jobTools, "mcam-tools");
    }

    return unavailableExportResult("mcam-tools", prism_tools.length, "MastercamToolExportEngine.exportForJob");
  }

  /** Tool number ↔ PRISM ID mapping with Mastercam offset numbers */
  getToolMapping(tools: ToolRecord[]): ToolMappingEntry[] {
    return super.getToolMapping(tools).map((m, i) => ({
      ...m,
      cam_native_id: tools[i]?.extra?.mc_offset_number
        ? String(tools[i].extra.mc_offset_number)
        : m.cam_native_id,
    }));
  }
}

// ─── 2. SolidCAMToolBridgeEngine ──────────────────────────────────────────────

/**
 * Bridges SolidCAM's tool table (XML/JSON export from SolidCAM Technology DB)
 * to PRISM tool records.
 *
 * SolidCAM tool table features:
 *   - iMachining Technology Wizard compatibility fields (chip_thinning_factor,
 *     woc_max, doc_max, technology_wizard_approved)
 *   - SolidWorks Toolbox holder reference integration (sw_toolbox_holder_id)
 *   - Tool classification: ID/OD/drill/thread per SolidCAM taxonomy
 *   - Feed/speed from SolidCAM Technology Database entries
 */
export class SolidCAMToolBridgeEngine extends CAMToolBridgeBase {
  // SolidCAM tool type → PRISM type
  private static readonly SC_TYPE_MAP: Record<string, string> = {
    EM: "endmill",
    BM: "ballmill",
    TM: "radiusmill",
    DR: "drill",
    TA: "tap",
    RE: "reamer",
    CH: "chamfer",
    TH: "threadmill",
    FA: "facemill",
    BB: "boring",
    SD: "spotdrill",
    GD: "drill",         // Gun drill
  };

  constructor() {
    super("solidcam");
  }

  /**
   * Parse SolidCAM Technology Database export (XML parsed to JSON or raw JSON).
   * Accepts top-level array or { tools: [...] } wrapper.
   */
  importTools(native_data: Record<string, unknown> | unknown[]): ToolRecord[] {
    const entries: unknown[] = Array.isArray(native_data)
      ? native_data
      : (native_data.tools as unknown[])
        ?? (native_data.ToolTable as unknown[])
        ?? (native_data.SolidCAMTools as unknown[])
        ?? [];

    return entries
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const t = e as Record<string, unknown>;
        const scType = String(t.type_code ?? t.TypeCode ?? t.tool_type ?? "EM").toUpperCase();
        const prismType = SolidCAMToolBridgeEngine.SC_TYPE_MAP[scType] ?? "endmill";
        const toolNo = this._coerceNum(t.tool_number ?? t.ToolNumber ?? t.T_NUM, 0);
        const nativeId = String(t.tool_id ?? t.ToolID ?? t.sc_id ?? toolNo);

        // iMachining Technology Wizard fields
        const imachining = t.imachining ?? t.iMachining ?? {};
        const im = typeof imachining === "object" ? (imachining as Record<string, unknown>) : {};

        return {
          prism_id: this._prismId("SC", nativeId),
          tool_number: toolNo,
          tool_type: prismType,
          description: String(t.description ?? t.Description ?? t.tool_name ?? `SolidCAM #${toolNo}`),
          manufacturer: String(t.manufacturer ?? t.Manufacturer ?? "Unknown"),
          manufacturer_part_no: String(t.catalog_number ?? t.CatalogNumber ?? t.part_no ?? ""),
          diameter_mm: this._coerceNum(t.diameter ?? t.Diameter ?? t.d),
          corner_radius_mm: this._coerceNum(t.corner_radius ?? t.CornerRadius ?? t.r),
          flute_length_mm: this._coerceNum(t.flute_length ?? t.FluteLength ?? t.fl),
          oal_mm: this._coerceNum(t.oal ?? t.OAL ?? t.overall_length),
          flutes: this._coerceNum(t.flutes ?? t.Flutes ?? t.z, 2),
          material: String(t.tool_material ?? t.ToolMaterial ?? "carbide").toLowerCase(),
          coating: String(t.coating ?? t.Coating ?? "uncoated").toLowerCase(),
          iso_group: String(t.iso_material_group ?? t.ISOGroup ?? "P").toUpperCase(),
          vc_recommended_m_min: this._coerceNum(t.vc ?? t.cutting_speed),
          fz_recommended_mm: this._coerceNum(t.fz ?? t.chipload ?? t.feed_per_tooth),
          holder_id: String(t.holder_id ?? t.HolderID ?? t.sw_toolbox_holder_id ?? ""),
          coolant_through: Boolean(t.coolant_through ?? t.CoolantThrough ?? t.internal_coolant ?? false),
          cam_native_id: nativeId,
          cam_system: "solidcam",
          extra: {
            sc_type_code: scType,
            // iMachining Technology Wizard
            imachining_approved: Boolean(im.technology_wizard_approved ?? im.approved ?? false),
            chip_thinning_factor: this._coerceNum(im.chip_thinning_factor ?? im.ctf, 1.0),
            woc_max_mm: this._coerceNum(im.woc_max ?? im.max_woc),
            doc_max_mm: this._coerceNum(im.doc_max ?? im.max_doc),
            im_morphic_factor: this._coerceNum(im.morphic_factor, 1.0),
            // SolidWorks Toolbox
            sw_toolbox_holder_id: String(t.sw_toolbox_holder_id ?? ""),
            sw_toolbox_standard: String(t.sw_toolbox_standard ?? ""),
            // SolidCAM technology DB
            sc_tech_db_id: String(t.tech_db_id ?? t.TechDBID ?? ""),
          },
        } as ToolRecord;
      });
  }

  /**
   * Export PRISM tools → SolidCAM Technology Database JSON format.
   * Produces fields compatible with SolidCAM's XML import template.
   */
  exportTools(prism_tools: ToolRecord[]): Record<string, unknown> {
    const reverseTypeMap: Record<string, string> = {
      endmill: "EM", ballmill: "BM", radiusmill: "TM",
      drill: "DR", tap: "TA", reamer: "RE",
      chamfer: "CH", threadmill: "TH", facemill: "FA",
      boring: "BB", spotdrill: "SD",
    };

    return {
      format: "solidcam-tool-table",
      version: "2024",
      source: "PRISM E1143",
      tool_count: prism_tools.length,
      tools: prism_tools.map((t) => ({
        tool_number: t.tool_number,
        type_code: reverseTypeMap[t.tool_type] ?? "EM",
        description: t.description,
        manufacturer: t.manufacturer,
        catalog_number: t.manufacturer_part_no,
        diameter: t.diameter_mm,
        corner_radius: t.corner_radius_mm,
        flute_length: t.flute_length_mm,
        oal: t.oal_mm,
        flutes: t.flutes,
        tool_material: t.material,
        coating: t.coating,
        iso_material_group: t.iso_group,
        vc: t.vc_recommended_m_min,
        fz: t.fz_recommended_mm,
        holder_id: t.holder_id,
        internal_coolant: t.coolant_through,
        imachining: {
          technology_wizard_approved: Boolean(t.extra?.imachining_approved),
          chip_thinning_factor: t.extra?.chip_thinning_factor ?? 1.0,
          woc_max: t.extra?.woc_max_mm ?? t.diameter_mm * 0.5,
          doc_max: t.extra?.doc_max_mm ?? t.diameter_mm * 0.5,
        },
        sw_toolbox_holder_id: t.extra?.sw_toolbox_holder_id ?? "",
      })),
    };
  }
}

// ─── 3. NXCAMToolBridgeEngine ─────────────────────────────────────────────────

/**
 * Bridges NX CAM's .dat tool library format (Siemens NX) to PRISM.
 *
 * NX tool library features:
 *   - .dat ASCII format: tab-separated sections (TOOL, GEOM, CUTDATA, HOLDER)
 *   - 3D tool assembly support: STEP geometry reference paths per tool
 *   - Machining Data Library (MDL) integration: NX_MDL_ID cross-reference
 *   - Tool pocket and magazine slot assignment
 *   - Multiple cutting data sets (roughing/semi/finish)
 */
export class NXCAMToolBridgeEngine extends CAMToolBridgeBase {
  // NX tool type strings → PRISM types
  private static readonly NX_TYPE_MAP: Record<string, string> = {
    MILL: "endmill",
    BALL_MILL: "ballmill",
    TAPER_BALL_MILL: "ballmill",
    BULL_NOSE_MILL: "radiusmill",
    CHAMFER_MILL: "chamfer",
    DRILL: "drill",
    SPOT_DRILL: "spotdrill",
    CENTER_DRILL: "spotdrill",
    TAP: "tap",
    REAMER: "reamer",
    BORING_TOOL: "boring",
    THREAD_MILL: "threadmill",
    T_SLOT_CUTTER: "tslot",
    FACE_MILL: "facemill",
    GUN_DRILL: "drill",
    STEP_DRILL: "drill",
  };

  constructor() {
    super("nxcam");
  }

  /**
   * Parse NX .dat tool library data.
   * Accepts either pre-parsed JSON (from NX library export) or a flat array
   * of tool entry objects matching the NX section structure.
   *
   * NX .dat JSON structure expected:
   * {
   *   tools: [{
   *     TOOL_NUMBER, TOOL_TYPE, DESCRIPTION,
   *     GEOM: { DIAMETER, CORNER_RADIUS, FLUTE_LENGTH, LENGTH, FLUTES },
   *     CUTDATA: { VC, FZ, AP, AE },
   *     HOLDER: { HOLDER_ID, STEP_FILE },
   *     MDL: { NX_MDL_ID },
   *     ASSEMBLY: { step_geometry_ref, step_file_path }
   *   }]
   * }
   */
  importTools(native_data: Record<string, unknown> | unknown[]): ToolRecord[] {
    const entries: unknown[] = Array.isArray(native_data)
      ? native_data
      : (native_data.tools as unknown[])
        ?? (native_data.TOOLS as unknown[])
        ?? (native_data.NXToolLibrary as unknown[])
        ?? [];

    return entries
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const t = e as Record<string, unknown>;
        const geom = (t.GEOM as Record<string, unknown>) ?? (t.geometry as Record<string, unknown>) ?? t;
        const cutdata = (t.CUTDATA as Record<string, unknown>) ?? (t.cutting_data as Record<string, unknown>) ?? {};
        const holder = (t.HOLDER as Record<string, unknown>) ?? (t.holder as Record<string, unknown>) ?? {};
        const mdl = (t.MDL as Record<string, unknown>) ?? (t.mdl as Record<string, unknown>) ?? {};
        const assembly = (t.ASSEMBLY as Record<string, unknown>) ?? (t.assembly as Record<string, unknown>) ?? {};

        const nxType = String(t.TOOL_TYPE ?? t.tool_type ?? "MILL").toUpperCase();
        const prismType = NXCAMToolBridgeEngine.NX_TYPE_MAP[nxType] ?? "endmill";
        const toolNo = this._coerceNum(t.TOOL_NUMBER ?? t.tool_number ?? t.pocket, 0);
        const nativeId = String(t.NX_TOOL_ID ?? t.nx_tool_id ?? t.TOOL_ID ?? toolNo);

        return {
          prism_id: this._prismId("NX", nativeId),
          tool_number: toolNo,
          tool_type: prismType,
          description: String(t.DESCRIPTION ?? t.description ?? t.NAME ?? `NX tool #${toolNo}`),
          manufacturer: String(t.MANUFACTURER ?? t.manufacturer ?? "Unknown"),
          manufacturer_part_no: String(t.PART_NUMBER ?? t.part_number ?? ""),
          diameter_mm: this._coerceNum(geom.DIAMETER ?? geom.diameter ?? geom.D),
          corner_radius_mm: this._coerceNum(geom.CORNER_RADIUS ?? geom.corner_radius ?? geom.R),
          flute_length_mm: this._coerceNum(geom.FLUTE_LENGTH ?? geom.flute_length ?? geom.FL),
          oal_mm: this._coerceNum(geom.LENGTH ?? geom.OAL ?? geom.oal ?? geom.TOTAL_LENGTH),
          flutes: this._coerceNum(geom.FLUTES ?? geom.flutes ?? geom.NUM_FLUTES, 2),
          material: String(t.TOOL_MATERIAL ?? t.tool_material ?? "carbide").toLowerCase(),
          coating: String(t.COATING ?? t.coating ?? "uncoated").toLowerCase(),
          iso_group: String(t.ISO_GROUP ?? t.iso_group ?? "P").toUpperCase(),
          vc_recommended_m_min: this._coerceNum(cutdata.VC ?? cutdata.vc),
          fz_recommended_mm: this._coerceNum(cutdata.FZ ?? cutdata.fz),
          holder_id: String(holder.HOLDER_ID ?? holder.holder_id ?? ""),
          coolant_through: Boolean(t.COOLANT_THROUGH ?? t.coolant_through ?? t.INTERNAL_COOLANT ?? false),
          cam_native_id: nativeId,
          cam_system: "nxcam",
          extra: {
            nx_type_raw: nxType,
            nx_pocket: this._coerceNum(t.POCKET ?? t.pocket, toolNo),
            nx_magazine: this._coerceNum(t.MAGAZINE ?? t.magazine, 1),
            // MDL integration
            nx_mdl_id: String(mdl.NX_MDL_ID ?? mdl.mdl_id ?? ""),
            nx_mdl_source: String(mdl.SOURCE ?? mdl.source ?? ""),
            // 3D assembly / STEP geometry
            step_geometry_ref: String(assembly.step_geometry_ref ?? assembly.STEP_REF ?? ""),
            step_file_path: String(assembly.step_file_path ?? holder.STEP_FILE ?? ""),
            // Multiple cutting data sets
            ap_roughing_mm: this._coerceNum(cutdata.AP_ROUGH ?? cutdata.ap_roughing),
            ap_finishing_mm: this._coerceNum(cutdata.AP_FINISH ?? cutdata.ap_finishing),
            ae_roughing_mm: this._coerceNum(cutdata.AE_ROUGH ?? cutdata.ae_roughing),
            ae_finishing_mm: this._coerceNum(cutdata.AE_FINISH ?? cutdata.ae_finishing),
          },
        } as ToolRecord;
      });
  }

  /**
   * Export PRISM tools → NX .dat library JSON format.
   * Includes STEP geometry references and MDL IDs where available.
   */
  exportTools(prism_tools: ToolRecord[]): Record<string, unknown> {
    const reverseTypeMap: Record<string, string> = {
      endmill: "MILL", ballmill: "BALL_MILL", radiusmill: "BULL_NOSE_MILL",
      drill: "DRILL", spotdrill: "SPOT_DRILL", tap: "TAP",
      reamer: "REAMER", chamfer: "CHAMFER_MILL", threadmill: "THREAD_MILL",
      tslot: "T_SLOT_CUTTER", facemill: "FACE_MILL", boring: "BORING_TOOL",
    };

    return {
      format: "nx-tool-library",
      version: "NX2406",
      source: "PRISM E1143",
      tool_count: prism_tools.length,
      tools: prism_tools.map((t) => ({
        NX_TOOL_ID: t.cam_native_id || t.prism_id,
        TOOL_NUMBER: t.tool_number,
        TOOL_TYPE: reverseTypeMap[t.tool_type] ?? "MILL",
        DESCRIPTION: t.description,
        MANUFACTURER: t.manufacturer,
        PART_NUMBER: t.manufacturer_part_no,
        GEOM: {
          DIAMETER: t.diameter_mm,
          CORNER_RADIUS: t.corner_radius_mm,
          FLUTE_LENGTH: t.flute_length_mm,
          LENGTH: t.oal_mm,
          FLUTES: t.flutes,
        },
        TOOL_MATERIAL: t.material.toUpperCase(),
        COATING: t.coating.toUpperCase(),
        ISO_GROUP: t.iso_group,
        COOLANT_THROUGH: t.coolant_through,
        CUTDATA: {
          VC: t.vc_recommended_m_min,
          FZ: t.fz_recommended_mm,
          AP_ROUGH: t.extra?.ap_roughing_mm ?? t.diameter_mm * 0.5,
          AP_FINISH: t.extra?.ap_finishing_mm ?? t.diameter_mm * 0.25,
          AE_ROUGH: t.extra?.ae_roughing_mm ?? t.diameter_mm * 0.4,
          AE_FINISH: t.extra?.ae_finishing_mm ?? t.diameter_mm * 0.1,
        },
        HOLDER: {
          HOLDER_ID: t.holder_id,
          STEP_FILE: t.extra?.step_file_path ?? "",
        },
        ASSEMBLY: {
          step_geometry_ref: t.extra?.step_geometry_ref ?? "",
          step_file_path: t.extra?.step_file_path ?? "",
        },
        MDL: {
          NX_MDL_ID: t.extra?.nx_mdl_id ?? "",
          SOURCE: t.extra?.nx_mdl_source ?? "PRISM",
        },
        POCKET: t.extra?.nx_pocket ?? t.tool_number,
        MAGAZINE: t.extra?.nx_magazine ?? 1,
      })),
    };
  }
}

// ─── 4. HyperMillToolBridgeEngine ─────────────────────────────────────────────

/**
 * Bridges hyperMILL's SQLite-based tool database (.hmt) to PRISM.
 *
 * hyperMILL tool DB features:
 *   - 29 geometry classes (mapped via HM_TYPE constants from E1127)
 *   - 3-tier hierarchy: Tools → NCTools → DepotItems (magazine slots)
 *   - Speed/feed integration with hyperMILL Intelligent Macro DB
 *   - Chipping class → ISO group mapping (29 classes, E1127 reference)
 *
 * Import accepts the JSON-serialised form of the SQLite DB (e.g. from
 * sqlite3 .json export or hyperMILL's own XML export parsed to JSON).
 *
 * Export delegates to HyperMillToolExportEngine (E1127) for full
 * SQL schema + INSERT statement generation.
 */
export class HyperMillToolBridgeEngine extends CAMToolBridgeBase {
  // hyperMILL tool_type_id → PRISM type string (from E1127 HM_TYPE)
  private static readonly HM_TYPE_ID_MAP: Record<number, string> = {
    1: "ballmill",
    2: "endmill",
    3: "radiusmill",
    4: "drill",
    5: "lollipop",
    6: "woodruff",
    7: "barrel",
    8: "lenscutter",
    9: "chamfer",
    10: "tslot",
    11: "tap",
    12: "boring",
    13: "gundrill",
    15: "threadmill",
    16: "reamer",
    17: "tangentbarrel",
    18: "conicalbarrel",
    19: "indexableround",
    20: "highfeed",
    21: "backboring",
    1000: "turning_general",
    1001: "turning_radial_recess",
    1002: "turning_axial_recess",
    1003: "turning_thread",
    1004: "turning_parting",
    1005: "turning_roll",
    2000: "probe",
    3000: "grinding",
  };

  // Chipping class → ISO group (matches HyperMillMaterialBridgeEngine)
  private static readonly CC_TO_ISO: Record<number, string> = {
    1: "P", 2: "P", 3: "P", 4: "P", 5: "H",
    6: "H", 7: "H", 8: "H", 9: "H",
    10: "P", 11: "P",
    12: "M", 13: "M", 14: "M", 15: "M",
    16: "S",
    17: "K",
    18: "S", 19: "S",
    20: "N", 21: "N",
    22: "N", 23: "N", 24: "N",
    25: "N",
    26: "N", 27: "N",
    28: "H",
    1000: "P",
  };

  constructor() {
    super("hypermill");
  }

  /**
   * Parse hyperMILL tool DB entries (from SQLite JSON export or XML→JSON).
   *
   * Expected input shapes:
   *   Array of rows from the Tools table: { tool_id, name, tool_type_id,
   *     dbl_param1..17, int_param1..6, chipping_class, ... }
   *   OR wrapper: { Tools: [...], NCTools: [...], DepotItems: [...] }
   */
  importTools(native_data: Record<string, unknown> | unknown[]): ToolRecord[] {
    let toolRows: unknown[];
    if (Array.isArray(native_data)) {
      toolRows = native_data;
    } else {
      toolRows = (native_data.Tools as unknown[])
        ?? (native_data.tools as unknown[])
        ?? (native_data.tool_rows as unknown[])
        ?? [];
    }

    // Build NCTools index for holder/projection data
    const ncToolsByToolId = new Map<number, Record<string, unknown>>();
    if (!Array.isArray(native_data) && Array.isArray(native_data.NCTools)) {
      for (const nc of native_data.NCTools as Record<string, unknown>[]) {
        const tid = this._coerceNum(nc.tool_id ?? nc.ToolID, -1);
        if (tid >= 0) ncToolsByToolId.set(tid, nc);
      }
    }

    return toolRows
      .filter((e) => e && typeof e === "object")
      .map((e) => {
        const t = e as Record<string, unknown>;
        const typeId = this._coerceNum(t.tool_type_id ?? t.ToolTypeID, 2);
        const prismType = HyperMillToolBridgeEngine.HM_TYPE_ID_MAP[typeId] ?? "endmill";
        const toolId = this._coerceNum(t.tool_id ?? t.ToolID ?? t.id, 0);
        const nativeId = String(t.tool_id ?? t.ToolID ?? t.id ?? toolId);

        // dbl_param mapping by geometry class (E1127 reference):
        // Endmill/Radiusmill: p1=diameter, p2=corner_radius, p3=flute_length, p4=OAL
        // Ballmill: p1=diameter (= 2×radius)
        // Drilltool: p1=diameter, p2=point_angle, p3=flute_length
        const p = (n: number) => this._coerceNum(t[`dbl_param${n}`] ?? t[`DblParam${n}`]);
        const ip = (n: number) => this._coerceNum(t[`int_param${n}`] ?? t[`IntParam${n}`]);

        const diameter_mm = p(1);
        const corner_radius_mm = [2, 3, 9, 15, 16, 17, 18, 19, 20, 21].includes(typeId) ? p(2) : 0;
        const flute_length_mm = p(3);
        const oal_mm = p(4) || p(5);
        const flutes = ip(1) || 2;

        const chippingClass = this._coerceNum(t.chipping_class ?? t.ChippingClass, 1);
        const isoGroup = HyperMillToolBridgeEngine.CC_TO_ISO[chippingClass] ?? "P";

        // NCTool data for holder and projection
        const nc = ncToolsByToolId.get(toolId) ?? {};

        return {
          prism_id: this._prismId("HM", nativeId),
          tool_number: this._coerceNum(t.tool_number ?? t.ToolNumber ?? t.pocket_number, toolId),
          tool_type: prismType,
          description: String(t.name ?? t.Name ?? t.description ?? `HM tool #${toolId}`),
          manufacturer: String(t.manufacturer ?? t.Manufacturer ?? "Unknown"),
          manufacturer_part_no: String(t.article_number ?? t.ArticleNumber ?? t.part_no ?? ""),
          diameter_mm,
          corner_radius_mm,
          flute_length_mm,
          oal_mm,
          flutes,
          material: String(t.cutting_material ?? t.CuttingMaterial ?? "carbide").toLowerCase(),
          coating: String(t.coating ?? t.Coating ?? "uncoated").toLowerCase(),
          iso_group: isoGroup,
          vc_recommended_m_min: this._coerceNum(t.cutting_speed ?? t.CuttingSpeed ?? nc.cutting_speed),
          fz_recommended_mm: this._coerceNum(t.feed_per_tooth ?? t.FeedPerTooth ?? nc.feed_per_tooth),
          holder_id: String(nc.holder_id ?? nc.HolderID ?? t.holder_id ?? ""),
          coolant_through: Boolean(t.coolant_through ?? t.CoolantThrough ?? t.internal_coolant ?? false),
          cam_native_id: nativeId,
          cam_system: "hypermill",
          extra: {
            hm_type_id: typeId,
            hm_chipping_class: chippingClass,
            // All 17 double params preserved for round-trip
            dbl_params: Array.from({ length: 17 }, (_, i) => p(i + 1)),
            int_params: Array.from({ length: 6 }, (_, i) => ip(i + 1)),
            // NCTool fields
            nc_tool_id: this._coerceNum(nc.nc_tool_id ?? nc.NCToolID, toolId),
            gauge_length_mm: this._coerceNum(nc.gauge_length ?? nc.GaugeLength),
            projection_mm: this._coerceNum(nc.projection ?? nc.Projection),
            // Speed/feed catalog reference
            hm_mat_tech_ref: String(t.mat_tech_ref ?? nc.mat_tech_ref ?? ""),
          },
        } as ToolRecord;
      });
  }

  /**
   * Export PRISM tools → hyperMILL .hmt SQLite format.
   * Delegates to HyperMillToolExportEngine (E1127) for full SQL generation
   * when available and fails honestly otherwise.
   */
  exportTools(prism_tools: ToolRecord[]): Record<string, unknown> {
    if (hyperMillToolExportEngine?.exportToHMT) {
      const exportTools = prism_tools.map((t) => ({
        type: t.tool_type,
        physical: {
          cutting_diameter_mm: t.diameter_mm,
          flute_count: t.flutes,
          flute_length_mm: t.flute_length_mm,
          overall_length_mm: t.oal_mm,
          shank_diameter_mm: t.diameter_mm,
          corner_radius_mm: t.corner_radius_mm,
          point_angle_deg: 140,
        },
        material: t.material,
        coating: t.coating,
        manufacturer: t.manufacturer,
        part_number: t.manufacturer_part_no,
        description: t.description,
      }));
      return hyperMillToolExportEngine.exportToHMT(exportTools, {});
    }

    return unavailableExportResult("hypermill-hmt", prism_tools.length, "HyperMillToolExportEngine.exportToHMT");
  }

  /** getToolMapping with hyperMILL-specific NCTool IDs */
  getToolMapping(tools: ToolRecord[]): ToolMappingEntry[] {
    return super.getToolMapping(tools).map((m, i) => ({
      ...m,
      cam_native_id: tools[i]?.extra?.nc_tool_id
        ? String(tools[i].extra.nc_tool_id)
        : m.cam_native_id,
    }));
  }
}

// ─── Singletons ───────────────────────────────────────────────────────────────

export const mastercamToolBridgeEngine  = new MastercamToolBridgeEngine();
export const solidCAMToolBridgeEngine   = new SolidCAMToolBridgeEngine();
export const nxCAMToolBridgeEngine      = new NXCAMToolBridgeEngine();
export const hyperMillToolBridgeEngine  = new HyperMillToolBridgeEngine();
