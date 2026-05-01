/**
 * CuttingDataExportEngine — PRISM Physics-Backed Cutting Data Export (E1128)
 *
 * Exports PRISM's Kienzle/Taylor-computed cutting data (Vc, fz, ap, ae, tool life,
 * power) into each CAM system's native cutting data format:
 *
 *   1. Mastercam   — .mcam-operations tool sheets (XML-like JSON structure)
 *   2. SolidCAM    — iMachining material DB entries (JSON)
 *   3. NX          — Machining Data Library .dat records (key=value text)
 *   4. hyperMILL   — speed/feed catalog entries (XML-like JSON)
 *   5. Fusion 360  — cutting data presets (JSON)
 *   6. CSV         — generic tabular (for any system)
 *
 * Physics (inline, matches PRISM canonical):
 *   Vc  = VC_BASE[iso] × coating_mult × coolant_mult          (m/min)
 *   fz  = D × chip_load_factor[iso]                           (mm/tooth)
 *   ap  = D × ap_factor[iso]                                  (mm)
 *   ae  = D × ae_factor[iso]                                  (mm)
 *   Fc  = kc1_1 × ap × fz^(1 − mc)                           (N) — Kienzle
 *   T   = (C / Vc)^(1/n)                                      (min) — Taylor
 *   P   = Fc × Vc / 60000                                     (kW)
 *   RPM = 1000 × Vc / (π × D)
 *   Vf  = fz × z × RPM                                        (mm/min)
 *
 * @engine CuttingDataExportEngine
 * @shortcode E1128
 * @dispatcher camDispatcher
 * @actions cutting_data_export, cutting_data_compute
 * @milestone CAMX-MS10/U06
 */

// ============================================================================
// PHYSICS CONSTANTS
// ============================================================================

/** Baseline cutting speed (m/min) per ISO group — carbide, uncoated, semi-finish.
 *  Derived from UltimateSpeedFeedEngine / CuttingDataLookupEngine tables. */
const VC_BASE: Record<string, number> = {
  P: 150,  // Steel
  M: 100,  // Stainless steel
  K: 200,  // Cast iron
  N: 400,  // Non-ferrous (aluminum, copper)
  S:  50,  // Superalloys (Inconel, Ti)
  H: 120,  // Hardened steel (45–65 HRC)
};

/** Optimal chipload factor (fz = D × factor) per ISO group — Kienzle kc1.1-derived. */
const CHIP_LOAD_FACTOR: Record<string, number> = {
  P: 0.010,   // 10 µm/mm diam
  M: 0.008,
  K: 0.012,
  N: 0.015,
  S: 0.006,
  H: 0.005,
};

/** Axial depth factor (ap = D × factor) for semi-finishing operation */
const AP_FACTOR: Record<string, number> = {
  P: 0.50, M: 0.40, K: 0.60, N: 1.00, S: 0.30, H: 0.25,
};

/** Radial engagement factor (ae = D × factor) for semi-finishing */
const AE_FACTOR: Record<string, number> = {
  P: 0.40, M: 0.35, K: 0.50, N: 0.50, S: 0.25, H: 0.20,
};

/** Coating speed multiplier (applied to VC_BASE) */
const COATING_MULT: Record<string, number> = {
  uncoated: 1.00,
  TiN:      1.10,
  TiCN:     1.15,
  TiAlN:    1.25,
  AlTiN:    1.28,
  AlCrN:    1.25,
  DLC:      1.35,
  diamond:  1.50,
};

/** Coolant strategy multiplier */
const COOLANT_MULT: Record<string, number> = {
  dry:      0.90,
  air_blast: 0.95,
  mist:     1.00,
  mql:      1.05,
  flood:    1.10,
  hpc:      1.20,   // High-pressure coolant
  cryogenic: 1.30,
};

/** Kienzle kc1.1 (N/mm²) and mc exponent per ISO group.
 *  Source: Sandvik Coromant / Machinery's Handbook kc tables */
const KIENZLE_DATA: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },   // Carbon / alloy steel
  M: { kc1_1: 2100, mc: 0.25 },   // Stainless steel
  K: { kc1_1: 1100, mc: 0.28 },   // Cast iron
  N: { kc1_1:  700, mc: 0.23 },   // Aluminum alloys
  S: { kc1_1: 2800, mc: 0.28 },   // Superalloys
  H: { kc1_1: 3200, mc: 0.30 },   // Hardened steel
};

/** Taylor tool-life constant C (m/min at T=1 min) and exponent n per ISO group.
 *  T = (C/Vc)^(1/n). Higher n → life more sensitive to speed. */
const TAYLOR_DATA: Record<string, { C: number; n: number }> = {
  P: { C: 280, n: 0.25 },
  M: { C: 180, n: 0.22 },
  K: { C: 320, n: 0.28 },
  N: { C: 600, n: 0.35 },
  S: { C:  80, n: 0.20 },
  H: { C: 150, n: 0.22 },
};

const ISO_GROUPS = ["P", "M", "K", "N", "S", "H"] as const;
type ISOGroup = typeof ISO_GROUPS[number];

const ISO_LABELS: Record<string, string> = {
  P: "Steel (ISO-P)",
  M: "Stainless Steel (ISO-M)",
  K: "Cast Iron (ISO-K)",
  N: "Non-Ferrous / Aluminum (ISO-N)",
  S: "Superalloy / Titanium (ISO-S)",
  H: "Hardened Steel (ISO-H)",
};

// ============================================================================
// TYPES
// ============================================================================

export type CAMSystem =
  | "mastercam"
  | "solidcam"
  | "nx"
  | "hypermill"
  | "fusion360"
  | "csv";

export type OperationType =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "high_speed";

/** A PRISM tool record (minimal required: tool_type, diameter_mm) */
export interface CuttingTool {
  id?:                string;
  designation?:       string;
  manufacturer?:      string;
  tool_type?:         string;   // endmill | drill | tap | ballnose | face_mill | etc.
  type?:              string;   // alias for tool_type
  diameter_mm:        number;
  flutes?:            number;
  flute_count?:       number;   // alias
  coating?:           string;   // TiAlN | AlCrN | TiN | DLC | uncoated | diamond
  material?:          string;   // carbide | hss | ceramic | cbn | pcd | cermet
  corner_radius_mm?:  number;
  helix_angle_deg?:   number;
  cutting_length_mm?: number;
  overall_length_mm?: number;
  taper?:             string;
  gauge_length_mm?:   number;
}

/** A material description mapped to ISO group */
export interface MaterialRecord {
  id?:       string;
  name:      string;
  iso_group: ISOGroup;
  coolant?:  string;   // flood | mql | dry | hpc | cryogenic | air_blast | mist
  hardness_hb?: number;
}

/** Physics-computed cutting data for one tool+material combination */
export interface ComputedCuttingData {
  Vc_mpm:        number;  // Cutting speed, m/min
  fz_mm:         number;  // Feed per tooth, mm
  ap_mm:         number;  // Axial depth of cut, mm
  ae_mm:         number;  // Radial depth of cut, mm
  rpm:           number;  // Spindle speed
  Vf_mmpm:       number;  // Table feed, mm/min
  Fc_N:          number;  // Kienzle cutting force, N
  power_kW:      number;  // Spindle power, kW
  tool_life_min: number;  // Taylor tool life, min
  iso_group:     ISOGroup;
  material_name: string;
  operation:     OperationType;
}

/** Export result for a single CAM system */
export interface ExportResult {
  cam_system:     CAMSystem;
  format:         string;
  data:           string;        // Serialized export (JSON string, CSV text, .dat text, etc.)
  tool_count:     number;
  material_count: number;
  entry_count:    number;        // tool_count × material_count
  generated_at:   string;
}

/** exportAll result */
export interface ExportAllResult {
  per_system:    Record<CAMSystem, ExportResult>;
  total_entries: number;
  generated_at:  string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CuttingDataExportEngineClass {
  readonly version = "1.0.0";

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Compute physics-backed cutting data for a single tool+material+operation.
   *
   * Physics:
   *   Vc  = VC_BASE[iso] × coating_mult × coolant_mult
   *   fz  = D × chip_load_factor[iso]  (scaled for operation type)
   *   ap  = D × ap_factor[iso]          (scaled for operation type)
   *   ae  = D × ae_factor[iso]          (scaled for operation type)
   *   Fc  = kc1_1 × ap × fz^(1−mc)     (Kienzle)
   *   T   = (C/Vc)^(1/n)               (Taylor)
   *   P   = Fc × Vc / 60000            (kW)
   */
  computeCuttingData(
    tool: CuttingTool,
    material: MaterialRecord,
    operation: OperationType = "semi_finishing",
  ): ComputedCuttingData {
    const D      = tool.diameter_mm;
    const iso    = material.iso_group;
    const flutes = tool.flutes ?? tool.flute_count ?? 4;

    // ── Coating multiplier ──────────────────────────────────────────────────
    const coatingKey = (tool.coating ?? "uncoated").toLowerCase();
    const coatMult = COATING_MULT[coatingKey] ?? 1.00;

    // ── Coolant multiplier ──────────────────────────────────────────────────
    const coolantKey = (material.coolant ?? "flood").toLowerCase().replace(/-/g, "_");
    const coolMult = COOLANT_MULT[coolantKey] ?? 1.00;

    // ── Operation scale factors ─────────────────────────────────────────────
    // roughing: higher DOC, more conservative speed
    // finishing: shallower DOC, higher speed
    // high_speed: very high speed, tiny chipload
    const opScale = this._operationScale(operation);

    // ── Vc (m/min) ──────────────────────────────────────────────────────────
    const Vc_mpm = +(VC_BASE[iso] * coatMult * coolMult * opScale.vc).toFixed(3);

    // ── fz (mm/tooth) ───────────────────────────────────────────────────────
    const fz_mm = +(D * CHIP_LOAD_FACTOR[iso] * opScale.fz).toFixed(4);

    // ── ap, ae (mm) ─────────────────────────────────────────────────────────
    const ap_mm = +(D * AP_FACTOR[iso] * opScale.ap).toFixed(3);
    const ae_mm = +(D * AE_FACTOR[iso] * opScale.ae).toFixed(3);

    // ── Derived kinematics ───────────────────────────────────────────────────
    const rpm    = +(1000 * Vc_mpm / (Math.PI * D)).toFixed(1);
    const Vf_mmpm = +(fz_mm * flutes * rpm).toFixed(1);

    // ── Kienzle cutting force: Fc = kc1_1 × ap × fz^(1−mc) ────────────────
    const { kc1_1, mc } = KIENZLE_DATA[iso];
    const Fc_N = +(kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc)).toFixed(1);

    // ── Taylor tool life: T = (C/Vc)^(1/n) ─────────────────────────────────
    const { C, n } = TAYLOR_DATA[iso];
    const tool_life_min = +(Math.pow(C / Vc_mpm, 1 / n)).toFixed(1);

    // ── Spindle power: P = Fc × Vc / 60000 ─────────────────────────────────
    const power_kW = +(Fc_N * Vc_mpm / 60000).toFixed(3);

    return {
      Vc_mpm,
      fz_mm,
      ap_mm,
      ae_mm,
      rpm,
      Vf_mmpm,
      Fc_N,
      power_kW,
      tool_life_min,
      iso_group:     iso,
      material_name: material.name,
      operation,
    };
  }

  /**
   * Export cutting data for tools × materials in one CAM system's native format.
   */
  exportForSystem(
    tools:      CuttingTool[],
    materials:  MaterialRecord[],
    cam_system: CAMSystem,
    operation:  OperationType = "semi_finishing",
  ): ExportResult {
    const entries = this._computeMatrix(tools, materials, operation);

    let data: string;
    let format: string;

    switch (cam_system) {
      case "mastercam":  { const r = this._exportMastercam(tools, entries); data = r.data; format = r.format; break; }
      case "solidcam":   { const r = this._exportSolidCAM(tools, entries);  data = r.data; format = r.format; break; }
      case "nx":         { const r = this._exportNX(tools, entries);        data = r.data; format = r.format; break; }
      case "hypermill":  { const r = this._exportHyperMILL(tools, entries); data = r.data; format = r.format; break; }
      case "fusion360":  { const r = this._exportFusion360(tools, entries); data = r.data; format = r.format; break; }
      case "csv":
      default:           { const r = this._exportCSV(tools, entries);       data = r.data; format = r.format; break; }
    }

    return {
      cam_system,
      format,
      data,
      tool_count:     tools.length,
      material_count: materials.length,
      entry_count:    entries.length,
      generated_at:   new Date().toISOString(),
    };
  }

  /**
   * Export cutting data for all 6 CAM systems simultaneously.
   */
  exportAll(
    tools:     CuttingTool[],
    materials: MaterialRecord[],
    operation: OperationType = "semi_finishing",
  ): ExportAllResult {
    const systems: CAMSystem[] = ["mastercam", "solidcam", "nx", "hypermill", "fusion360", "csv"];
    const per_system = {} as Record<CAMSystem, ExportResult>;
    for (const sys of systems) {
      per_system[sys] = this.exportForSystem(tools, materials, sys, operation);
    }
    const totalEntries = tools.length * materials.length;
    return {
      per_system,
      total_entries: totalEntries,
      generated_at: new Date().toISOString(),
    };
  }

  /** List supported CAM systems */
  listSystems(): Array<{ system: CAMSystem; description: string; format: string }> {
    return [
      { system: "mastercam",  description: "Mastercam tool sheets",              format: ".mcam-operations JSON" },
      { system: "solidcam",   description: "SolidCAM iMachining material DB",    format: "iMachining JSON" },
      { system: "nx",         description: "NX Machining Data Library",           format: ".dat key=value text" },
      { system: "hypermill",  description: "hyperMILL speed/feed catalog",        format: "XML-like JSON" },
      { system: "fusion360",  description: "Fusion 360 cutting data presets",     format: "Fusion preset JSON" },
      { system: "csv",        description: "Generic CSV for any system",          format: "CSV text" },
    ];
  }

  // --------------------------------------------------------------------------
  // PRIVATE: COMPUTATION MATRIX
  // --------------------------------------------------------------------------

  private _computeMatrix(
    tools:     CuttingTool[],
    materials: MaterialRecord[],
    operation: OperationType,
  ): Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }> {
    const entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }> = [];
    for (const tool of tools) {
      for (const mat of materials) {
        entries.push({
          tool,
          material: mat,
          data: this.computeCuttingData(tool, mat, operation),
        });
      }
    }
    return entries;
  }

  private _operationScale(op: OperationType): { vc: number; fz: number; ap: number; ae: number } {
    switch (op) {
      case "roughing":       return { vc: 0.85, fz: 1.20, ap: 1.50, ae: 1.30 };
      case "semi_finishing": return { vc: 1.00, fz: 1.00, ap: 1.00, ae: 1.00 };
      case "finishing":      return { vc: 1.15, fz: 0.70, ap: 0.30, ae: 0.25 };
      case "high_speed":     return { vc: 1.40, fz: 0.40, ap: 0.15, ae: 0.10 };
    }
  }

  // --------------------------------------------------------------------------
  // FORMAT 1: MASTERCAM (.mcam-operations tool sheets)
  // --------------------------------------------------------------------------

  private _exportMastercam(
    tools:   CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    const toolSheets = tools.map((tool, idx) => {
      const toolEntries = entries.filter(e => e.tool === tool);
      const D      = tool.diameter_mm;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;

      const materialFeedTable = toolEntries.map(e => ({
        material_group:  e.data.iso_group,
        material_label:  ISO_LABELS[e.data.iso_group],
        material_name:   e.data.material_name,
        Vc_mpm:          e.data.Vc_mpm,
        fz_mm:           e.data.fz_mm,
        ap_mm:           e.data.ap_mm,
        ae_mm:           e.data.ae_mm,
        rpm:             e.data.rpm,
        feed_mmpm:       e.data.Vf_mmpm,
        power_kW:        e.data.power_kW,
        tool_life_min:   e.data.tool_life_min,
        cutting_force_N: e.data.Fc_N,
        operation:       e.data.operation,
      }));

      return {
        mcam_format:       "mcam-operations",
        tool_number:       idx + 1,
        tool_id:           tool.id ?? `T${String(idx + 1).padStart(3, "0")}`,
        designation:       tool.designation ?? `${(tool.tool_type ?? tool.type ?? "endmill").toUpperCase()} Ø${D}`,
        manufacturer:      tool.manufacturer ?? "Generic",
        tool_type:         tool.tool_type ?? tool.type ?? "endmill",
        diameter_mm:       D,
        flutes,
        corner_radius_mm:  tool.corner_radius_mm ?? 0,
        helix_angle_deg:   tool.helix_angle_deg ?? 35,
        overall_length_mm: tool.overall_length_mm ?? D * 10,
        cutting_length_mm: tool.cutting_length_mm ?? D * 3,
        coating:           tool.coating ?? "uncoated",
        substrate:         tool.material ?? "carbide",
        holder_taper:      tool.taper ?? "CAT40",
        gauge_length_mm:   tool.gauge_length_mm ?? 75,
        material_feed_table: materialFeedTable,
        prism_physics:     "Kienzle/Taylor canonical",
        generated_by:      "PRISM CuttingDataExportEngine E1128",
      };
    });

    return {
      data:   JSON.stringify({ mcam_tool_sheets: toolSheets, count: toolSheets.length }, null, 2),
      format: ".mcam-operations",
    };
  }

  // --------------------------------------------------------------------------
  // FORMAT 2: SOLIDCAM iMachining material DB entries
  // --------------------------------------------------------------------------

  private _exportSolidCAM(
    tools:   CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    // SolidCAM iMachining stores cutting data per material-group, per tool
    const imachiningDB = tools.map((tool, idx) => {
      const toolEntries = entries.filter(e => e.tool === tool);
      const D      = tool.diameter_mm;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;

      const materialEntries = toolEntries.map(e => ({
        imachining_material_group: e.data.iso_group,
        material_name:             e.data.material_name,
        iso_label:                 ISO_LABELS[e.data.iso_group],
        // iMachining uses target chip thickness (equivalent to fz)
        target_chip_thickness_mm:  e.data.fz_mm,
        cutting_speed_mpm:         e.data.Vc_mpm,
        axial_depth_mm:            e.data.ap_mm,
        radial_step_mm:            e.data.ae_mm,
        spindle_rpm:               e.data.rpm,
        feed_mmpm:                 e.data.Vf_mmpm,
        tool_life_min:             e.data.tool_life_min,
        power_kw:                  e.data.power_kW,
        cutting_force_N:           e.data.Fc_N,
        operation_type:            e.data.operation,
        // iMachining-specific: engagement arc computed from ae/D
        engagement_pct:            +((e.data.ae_mm / D) * 100).toFixed(1),
      }));

      return {
        solidcam_format:    "iMachining_MaterialDB",
        tool_index:         idx + 1,
        tool_id:            tool.id ?? `T${String(idx + 1).padStart(3, "0")}`,
        tool_description:   tool.designation ?? `${tool.tool_type ?? tool.type ?? "endmill"} Ø${D}`,
        manufacturer:       tool.manufacturer ?? "Generic",
        tool_type:          tool.tool_type ?? tool.type ?? "endmill",
        diameter_mm:        D,
        number_of_teeth:    flutes,
        corner_radius_mm:   tool.corner_radius_mm ?? 0,
        coating:            tool.coating ?? "uncoated",
        substrate:          tool.material ?? "carbide",
        imachining_entries: materialEntries,
        prism_physics:      "Kienzle/Taylor canonical",
        generated_by:       "PRISM CuttingDataExportEngine E1128",
      };
    });

    return {
      data:   JSON.stringify({ solidcam_imachining_db: imachiningDB, count: imachiningDB.length }, null, 2),
      format: "SolidCAM-iMachining-JSON",
    };
  }

  // --------------------------------------------------------------------------
  // FORMAT 3: NX Machining Data Library (.dat key=value)
  // --------------------------------------------------------------------------

  private _exportNX(
    tools:   CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    const lines: string[] = [
      "# NX Machining Data Library",
      "# Generated by PRISM CuttingDataExportEngine E1128",
      "# Physics: Kienzle cutting force / Taylor tool life",
      `# Generated: ${new Date().toISOString()}`,
      "",
    ];

    tools.forEach((tool, idx) => {
      const toolEntries = entries.filter(e => e.tool === tool);
      const D      = tool.diameter_mm;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;
      const toolId = tool.id ?? `T${String(idx + 1).padStart(3, "0")}`;

      lines.push(`[TOOL_${toolId}]`);
      lines.push(`TOOL_NUMBER=${idx + 1}`);
      lines.push(`TOOL_ID=${toolId}`);
      lines.push(`DESCRIPTION=${tool.designation ?? `${tool.tool_type ?? "endmill"} D${D}`}`);
      lines.push(`MANUFACTURER=${tool.manufacturer ?? "Generic"}`);
      lines.push(`TYPE=${tool.tool_type ?? tool.type ?? "endmill"}`);
      lines.push(`DIAMETER=${D}`);
      lines.push(`FLUTES=${flutes}`);
      lines.push(`CORNER_RADIUS=${tool.corner_radius_mm ?? 0}`);
      lines.push(`HELIX_ANGLE=${tool.helix_angle_deg ?? 35}`);
      lines.push(`OVERALL_LENGTH=${tool.overall_length_mm ?? D * 10}`);
      lines.push(`CUTTING_LENGTH=${tool.cutting_length_mm ?? D * 3}`);
      lines.push(`COATING=${tool.coating ?? "uncoated"}`);
      lines.push(`SUBSTRATE=${tool.material ?? "carbide"}`);
      lines.push(`HOLDER_TAPER=${tool.taper ?? "CAT40"}`);
      lines.push("");

      toolEntries.forEach(e => {
        const key = `${toolId}_${e.data.iso_group}`;
        lines.push(`[CDATA_${key}]`);
        lines.push(`ISO_GROUP=${e.data.iso_group}`);
        lines.push(`MATERIAL=${e.data.material_name}`);
        lines.push(`ISO_LABEL=${ISO_LABELS[e.data.iso_group]}`);
        lines.push(`OPERATION=${e.data.operation}`);
        lines.push(`VC_MPM=${e.data.Vc_mpm}`);
        lines.push(`FZ_MM=${e.data.fz_mm}`);
        lines.push(`AP_MM=${e.data.ap_mm}`);
        lines.push(`AE_MM=${e.data.ae_mm}`);
        lines.push(`RPM=${e.data.rpm}`);
        lines.push(`FEED_MMPM=${e.data.Vf_mmpm}`);
        lines.push(`POWER_KW=${e.data.power_kW}`);
        lines.push(`TOOL_LIFE_MIN=${e.data.tool_life_min}`);
        lines.push(`CUTTING_FORCE_N=${e.data.Fc_N}`);
        lines.push("");
      });
    });

    return { data: lines.join("\n"), format: "NX-MDL-.dat" };
  }

  // --------------------------------------------------------------------------
  // FORMAT 4: hyperMILL speed/feed catalog entries
  // --------------------------------------------------------------------------

  private _exportHyperMILL(
    tools:   CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    const catalog = tools.map((tool, idx) => {
      const toolEntries = entries.filter(e => e.tool === tool);
      const D      = tool.diameter_mm;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;

      const speedFeedEntries = toolEntries.map(e => ({
        // hyperMILL uses "material class" = ISO group
        material_class:    e.data.iso_group,
        material_name:     e.data.material_name,
        iso_label:         ISO_LABELS[e.data.iso_group],
        operation:         e.data.operation,
        // hyperMILL native fields
        cutting_speed_vc:  e.data.Vc_mpm,         // Vc in m/min
        feed_per_tooth_fz: e.data.fz_mm,           // fz in mm
        axial_depth_ap:    e.data.ap_mm,           // ap in mm
        radial_depth_ae:   e.data.ae_mm,           // ae in mm
        spindle_n:         e.data.rpm,             // n in 1/min
        feed_rate_vf:      e.data.Vf_mmpm,         // Vf in mm/min
        // Extended physics data
        cutting_force_fc:  e.data.Fc_N,
        power_pc:          e.data.power_kW,
        tool_life_t:       e.data.tool_life_min,
        // hyperMILL adaptive entry flag
        adaptive_enabled:  true,
        hsc_capable:       e.data.operation === "high_speed",
      }));

      return {
        hypermill_format:    "speed_feed_catalog",
        tool_number:         idx + 1,
        tool_id:             tool.id ?? `T${String(idx + 1).padStart(3, "0")}`,
        tool_name:           tool.designation ?? `${tool.tool_type ?? "endmill"} Ø${D}`,
        manufacturer:        tool.manufacturer ?? "Generic",
        tool_type:           tool.tool_type ?? tool.type ?? "endmill",
        diameter_d:          D,
        num_flutes_z:        flutes,
        corner_radius_r:     tool.corner_radius_mm ?? 0,
        helix_angle_lam:     tool.helix_angle_deg ?? 35,
        total_length_lt:     tool.overall_length_mm ?? D * 10,
        cutting_length_lc:   tool.cutting_length_mm ?? D * 3,
        coating:             tool.coating ?? "uncoated",
        substrate:           tool.material ?? "carbide",
        speed_feed_table:    speedFeedEntries,
        prism_physics:       "Kienzle/Taylor canonical",
        generated_by:        "PRISM CuttingDataExportEngine E1128",
      };
    });

    return {
      data:   JSON.stringify({ hypermill_catalog: catalog, count: catalog.length }, null, 2),
      format: "hyperMILL-SpeedFeed-JSON",
    };
  }

  // --------------------------------------------------------------------------
  // FORMAT 5: Fusion 360 cutting data presets
  // --------------------------------------------------------------------------

  private _exportFusion360(
    tools:   CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    // Fusion 360 cutting data presets follow the HSMWorks / Fusion library format
    const presets = tools.map((tool, idx) => {
      const toolEntries = entries.filter(e => e.tool === tool);
      const D      = tool.diameter_mm;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;

      const cuttingData = toolEntries.map(e => ({
        // Fusion 360 material group keys
        material:           e.data.iso_group,
        material_label:     ISO_LABELS[e.data.iso_group],
        material_name:      e.data.material_name,
        operation:          e.data.operation,
        // Fusion 360 preset fields (metric)
        spindleSpeed:       e.data.rpm,           // RPM
        cuttingFeedrate:    e.data.Vf_mmpm,        // mm/min
        surfaceSpeed:       e.data.Vc_mpm,         // m/min
        chipLoad:           e.data.fz_mm,          // mm/tooth
        axialDepth:         e.data.ap_mm,          // mm
        radialDepth:        e.data.ae_mm,          // mm
        // Extended (not in standard Fusion library but useful)
        powerKw:            e.data.power_kW,
        toolLifeMin:        e.data.tool_life_min,
        cuttingForceN:      e.data.Fc_N,
        // Fusion engagement percentage
        radialEngagementPct: +((e.data.ae_mm / D) * 100).toFixed(1),
      }));

      return {
        // Fusion 360 tool library structure
        type:             "tool-preset",
        unit:             "millimeters",
        toolNumber:       idx + 1,
        description:      tool.designation ?? `${tool.tool_type ?? "endmill"} Ø${D}`,
        manufacturer:     tool.manufacturer ?? "Generic",
        partNumber:       tool.id ?? `T${String(idx + 1).padStart(3, "0")}`,
        toolType:         tool.tool_type ?? tool.type ?? "endmill",
        diameter:         D,
        numberOfFlutes:   flutes,
        cornerRadius:     tool.corner_radius_mm ?? 0,
        helixAngle:       tool.helix_angle_deg ?? 35,
        overallLength:    tool.overall_length_mm ?? D * 10,
        cuttingLength:    tool.cutting_length_mm ?? D * 3,
        coating:          tool.coating ?? "uncoated",
        material:         tool.material ?? "carbide",
        cuttingData,
        source:           "PRISM CuttingDataExportEngine E1128 — Kienzle/Taylor physics",
      };
    });

    const library = {
      version:    "1.0.0",
      unit:       "millimeters",
      data:       presets,
      count:      presets.length,
      generated:  new Date().toISOString(),
      source:     "PRISM CuttingDataExportEngine E1128",
    };

    return {
      data:   JSON.stringify(library, null, 2),
      format: "Fusion360-Preset-JSON",
    };
  }

  // --------------------------------------------------------------------------
  // FORMAT 6: Generic CSV
  // --------------------------------------------------------------------------

  private _exportCSV(
    _tools:  CuttingTool[],
    entries: Array<{ tool: CuttingTool; material: MaterialRecord; data: ComputedCuttingData }>,
  ): { data: string; format: string } {
    const header = [
      "tool_id", "designation", "manufacturer", "tool_type",
      "diameter_mm", "flutes", "coating", "substrate",
      "material_name", "iso_group", "iso_label", "operation",
      "Vc_mpm", "fz_mm", "ap_mm", "ae_mm", "rpm", "Vf_mmpm",
      "Fc_N", "power_kW", "tool_life_min",
    ].join(",");

    const rows = entries.map((e, idx) => {
      const tool = e.tool;
      const d    = e.data;
      const flutes = tool.flutes ?? tool.flute_count ?? 4;
      return [
        this._csvEsc(tool.id ?? `T${String(idx + 1).padStart(3, "0")}`),
        this._csvEsc(tool.designation ?? `${tool.tool_type ?? "endmill"} Ø${tool.diameter_mm}`),
        this._csvEsc(tool.manufacturer ?? "Generic"),
        this._csvEsc(tool.tool_type ?? tool.type ?? "endmill"),
        tool.diameter_mm,
        flutes,
        this._csvEsc(tool.coating ?? "uncoated"),
        this._csvEsc(tool.material ?? "carbide"),
        this._csvEsc(d.material_name),
        d.iso_group,
        this._csvEsc(ISO_LABELS[d.iso_group]),
        d.operation,
        d.Vc_mpm,
        d.fz_mm,
        d.ap_mm,
        d.ae_mm,
        d.rpm,
        d.Vf_mmpm,
        d.Fc_N,
        d.power_kW,
        d.tool_life_min,
      ].join(",");
    });

    return {
      data:   [header, ...rows].join("\n"),
      format: "CSV",
    };
  }

  private _csvEsc(val: string): string {
    if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const cuttingDataExportEngine = new CuttingDataExportEngineClass();
