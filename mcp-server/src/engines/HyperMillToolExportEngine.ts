/**
 * HyperMillToolExportEngine — Export PRISM Tool Catalog to hyperMILL Tool Database Format (E1127)
 *
 * Exports PRISM's 95K+ tool catalog to hyperMILL's SQLite-based tool database
 * format (.hmt). Generates the full 3-tier hierarchy:
 *   Tools (geometry definition) → NCTools (assembled tool with holder) → DepotItems (magazine slot)
 *
 * Supports 29 hyperMILL geometry classes (Ballmill, Endmill, Radiusmill, Drilltool,
 * Lollipop, Woodruff, GeneralBarrelTool, LensCutter, TouchProbe, etc.) with correct
 * parametric dimension mapping per the sqlite.sql v1.53 schema.
 *
 * Methods:
 *   exportToHMT(tools[], options?)         — full export: schema + INSERT statements
 *   exportToolDefinition(tool)             — single tool SQL INSERT (Tools table)
 *   mapGeometryClass(prism_tool_type)      — PRISM type → hyperMILL geometry class code
 *   getSchemaInfo()                        — full schema description
 *
 * Export structure:
 *   Tools table      — tool_id, name, tool_type_id, dbl_param1..17, int_param1..6
 *   NCTools table    — assembled tool with holder ref, gauge length, projection
 *   DepotItems table — magazine slot assignment
 *   Materials table  — workpiece material rows with Vc/fz correction factors
 *
 * Geometry parameter mapping (from hypermill-tool-schema-notes.ts):
 *   Endmill (2):    dbl_param1=diameter, dbl_param2=corner_radius, dbl_param3=flute_length, dbl_param4=OAL, int_param1=flutes
 *   Ballmill (1):   dbl_param1=diameter (= 2 × radius)
 *   Radiusmill (3): dbl_param1=diameter, dbl_param2=corner_radius, dbl_param3=flute_length, dbl_param4=OAL, int_param1=flutes
 *   Drilltool (4):  dbl_param1=diameter, dbl_param2=point_angle, dbl_param3=flute_length
 *   Chamfer (9):    dbl_param1=diameter, dbl_param2=tip_diameter, dbl_param3=included_angle
 *   Tap (11):       dbl_param1=thread_diameter, dbl_param2=pitch, int_param1=thread_direction
 *   Lollipop (5):   dbl_param1=ball_diameter, dbl_param2=neck_diameter, dbl_param3=neck_length
 *   Woodruff (6):   dbl_param1=diameter, dbl_param2=width, dbl_param3=neck_diameter
 *
 * Sources:
 *   - hypermill-tool-schema-notes.ts (HYPERMILL_GEOMETRY_CLASSES, HYPERMILL_TYPE_TO_PRISM)
 *   - H:/prism/HYPERMILL/Tool Database/33.0/template database/sqlite.sql v1.53
 *   - hyperMILL v33 CAM Manual (H:/prism/HYPERMILL/doc/33.0/PDF/CAM/CAM_Manual-en-US.pdf)
 *
 * @engine HyperMillToolExportEngine
 * @shortcode E1127
 * @dispatcher camDispatcher
 * @actions hypermill_tool_export, hypermill_tool_export_job
 * @milestone CAMX-MS9/U03
 */

import { toolCatalogEngine } from "./ToolCatalogEngine.js";
import { holderSelectionEngine } from "./HolderSelectionEngine.js";
import { ultimateSpeedFeedEngine } from "./UltimateSpeedFeedEngine.js";
import type { ISOGroup, Operation, CutType } from "./UltimateSpeedFeedEngine.js";

// ─── Geometry class constants ─────────────────────────────────────────────────
// From HYPERMILL_GEOMETRY_CLASSES in hypermill-tool-schema-notes.ts

const HM_TYPE: Record<string, number> = {
  // Milling
  Ballmill: 1,
  Endmill: 2,
  Radiusmill: 3,
  Drilltool: 4,
  Lollipop: 5,
  Woodruff: 6,
  GeneralBarrelTool: 7,
  LensCutter: 8,
  ChamferedCutter: 9,
  TSlotCutter: 10,
  Tap: 11,
  BoringBar: 12,
  GunDrill: 13,
  ThreadMill: 15,
  Reamer: 16,
  TangentBarrelTool: 17,
  ConicalBarrelTool: 18,
  IndexableRoundInsertCutter: 19,
  IndexableHighFeedCutter: 20,
  BackboringTool: 21,
  // Turning
  GeneralTurningTool: 1000,
  RadialRecessingTool: 1001,
  AxialRecessingTool: 1002,
  ThreadingTool: 1003,
  PartingTool: 1004,
  RollTurnTool: 1005,
  // Special
  TouchProbe: 2000,
  GrindingBit: 3000,
  AdditiveDevice: 4000,
};

// ─── PRISM type → hyperMILL geometry class name ──────────────────────────────

function prismTypeToHMClass(prismType: string, subtype?: string): string {
  const t = (prismType || "").toLowerCase();
  const s = (subtype || "").toLowerCase();

  if (t.includes("ball")) return "Ballmill";
  if (t.includes("bull") || t.includes("corner_radius") || t.includes("torus") || t.includes("radius")) return "Radiusmill";
  if (t.includes("lollipop") || s.includes("lollipop")) return "Lollipop";
  if (t.includes("woodruff") || s.includes("woodruff")) return "Woodruff";
  if (t.includes("t_slot") || t.includes("tslot") || s.includes("t_slot")) return "TSlotCutter";
  if (t.includes("barrel") && s.includes("tangent")) return "TangentBarrelTool";
  if (t.includes("barrel") && s.includes("conical")) return "ConicalBarrelTool";
  if (t.includes("barrel") || s.includes("barrel")) return "GeneralBarrelTool";
  if (t.includes("lens") || s.includes("lens")) return "LensCutter";
  if (t.includes("chamfer") || t.includes("countersink")) return "ChamferedCutter";
  if (t.includes("drill") && (t.includes("gun") || s.includes("gun"))) return "GunDrill";
  if (t.includes("drill") && t.includes("spot")) return "Drilltool";
  if (t.includes("drill")) return "Drilltool";
  if (t.includes("tap")) return "Tap";
  if (t.includes("thread") && !t.includes("mill")) return "ThreadMill";
  if (t.includes("thread")) return "ThreadMill";
  if (t.includes("ream")) return "Reamer";
  if (t.includes("bore") || t.includes("boring")) {
    if (s.includes("back")) return "BackboringTool";
    return "BoringBar";
  }
  if (t.includes("face") || t.includes("shell")) {
    if (s.includes("round_insert")) return "IndexableRoundInsertCutter";
    if (s.includes("high_feed")) return "IndexableHighFeedCutter";
    return "IndexableHighFeedCutter";
  }
  if (t.includes("turning")) return "GeneralTurningTool";
  if (t.includes("grooving") && s.includes("radial")) return "RadialRecessingTool";
  if (t.includes("grooving") && s.includes("axial")) return "AxialRecessingTool";
  if (t.includes("grooving")) return "RadialRecessingTool";
  if (t.includes("parting")) return "PartingTool";
  if (t.includes("probe")) return "TouchProbe";
  if (t.includes("grind")) return "GrindingBit";
  if (t.includes("additive")) return "AdditiveDevice";
  // Default: endmill
  return "Endmill";
}

// ─── Cutting material code ────────────────────────────────────────────────────
// hyperMILL CuttingMaterials.id (1=HSS, 2=Carbide, 3=Cermet, 4=Ceramic, 5=CBN, 6=PCD)

const CUTTING_MATERIAL_ID: Record<string, number> = {
  hss: 1,
  carbide: 2,
  cermet: 3,
  ceramic: 4,
  cbn: 5,
  pcd: 6,
};

function mapCuttingMaterial(prismMat: string): number {
  const m = (prismMat || "").toLowerCase();
  if (m.includes("cbn") || m.includes("boron")) return CUTTING_MATERIAL_ID.cbn;
  if (m.includes("pcd") || (m.includes("diamond") && !m.includes("dl"))) return CUTTING_MATERIAL_ID.pcd;
  if (m.includes("ceramic") || m.includes("oxide")) return CUTTING_MATERIAL_ID.ceramic;
  if (m.includes("cermet")) return CUTTING_MATERIAL_ID.cermet;
  if (m.includes("hss") || m.includes("high speed")) return CUTTING_MATERIAL_ID.hss;
  return CUTTING_MATERIAL_ID.carbide; // Default
}

// ─── ISO group cutting data (Vc baselines from UltimateSpeedFeedEngine) ───────

const VC_BASE: Record<string, number> = {
  P: 150, M: 100, K: 200, N: 400, S: 50, H: 120,
};

const FZ_BASE: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.06, H: 0.05,
};

// Coating Vc multiplier
const COATING_MULT: Record<string, number> = {
  uncoated: 1.0, tin: 1.10, ticn: 1.15, tialn: 1.25, altin: 1.30,
  alcrn: 1.25, dlc: 1.35, diamond: 1.50,
};

// ─── Material factor correction (milling_factor_vc, milling_factor_fz) ───────
// Per hyperMILL Materials table fields: correction factors applied to base cutting data

const ISO_LABELS: Record<string, string> = {
  P: "Steel", M: "Stainless Steel", K: "Cast Iron",
  N: "Non-Ferrous", S: "Superalloy/Titanium", H: "Hardened Steel",
};

const ISO_MATERIAL_TYPE: Record<string, number> = {
  P: 1, M: 2, K: 3, N: 4, S: 5, H: 6,
};

const ALL_ISO: string[] = ["P", "M", "K", "N", "S", "H"];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Geometry class name from the 29 supported hyperMILL tool types */
export type HMGeometryClass =
  | "AdditiveDevice"
  | "AxialRecessingTool"
  | "BackboringTool"
  | "Ballmill"
  | "BoringBar"
  | "ChamferedCutter"
  | "ConicalBarrelTool"
  | "Drilltool"
  | "Endmill"
  | "GeneralBarrelTool"
  | "GeneralTurningTool"
  | "GrindingBit"
  | "GunDrill"
  | "IndexableHighFeedCutter"
  | "IndexableRoundInsertCutter"
  | "LensCutter"
  | "Lollipop"
  | "PartingTool"
  | "RadialRecessingTool"
  | "Radiusmill"
  | "Reamer"
  | "RollTurnTool"
  | "TSlotCutter"
  | "TangentBarrelTool"
  | "Tap"
  | "ThreadMill"
  | "ThreadingTool"
  | "TouchProbe"
  | "Woodruff";

export type HMExportOptions = {
  /** Include NCTools table entries (default: true) */
  include_nctool?: boolean;
  /** Include DepotItems table entries (default: true) */
  include_depot?: boolean;
  /** Include Materials table entries (default: true) */
  include_materials?: boolean;
  /** Starting tool_id (default: 1) */
  start_id?: number;
  /** Magazine starting slot number (default: 1) */
  start_slot?: number;
  /** Unit system: 1=Metric (default), 2=Inch */
  mm_system_id?: number;
  /** Catalog-fallback tool count cap (default: 100000 = full catalog; set lower for a subset) */
  max_tools?: number;
};

export interface HMToolRow {
  tool_id: number;
  name: string;
  tool_type_id: number;
  geometry_class: HMGeometryClass;
  cutting_material_id: number;
  mm_system_id: number;
  total_length: number;
  dbl_param1: number;
  dbl_param2: number;
  dbl_param3: number;
  dbl_param4: number;
  dbl_param5: number;
  dbl_param6: number;
  int_param1: number;
  int_param2: number;
  ordering_code: string;
  comment: string;
}

export interface HMNCToolRow {
  nctool_id: number;
  tool_id: number;
  nc_number_val: number;
  nc_name: string;
  gage_length: number;
  tool_length: number;
  usable_length: number;
  preset_diameter: number;
  /** Per-tool spindle-speed ceiling (rpm), 0 = non-rotating / not applicable. */
  max_spindle_speed: number;
  /** Per-tool feedrate ceiling (mm/min) at max_spindle_speed, 0 = not applicable. */
  max_feedrate: number;
}

export interface HMDepotRow {
  depot_item_id: number;
  nctool_id: number;
  slot_number: number;
}

export interface HMMaterialRow {
  material_id: number;
  name: string;
  iso_group: string;
  type: number;
  milling_factor_vc: number;
  milling_factor_fz: number;
}

export interface HMToolExportResult {
  /** Complete SQLite schema DDL for a standalone .hmt database */
  sqlite_schema: string;
  /** All INSERT statements (Tools + NCTools + DepotItems + Materials) */
  insert_statements: string[];
  /** Number of cutting tools exported */
  tool_count: number;
  /** Summary of exported data */
  summary: {
    tools: number;
    nctool_entries: number;
    depot_slots: number;
    materials: number;
    geometry_classes_used: string[];
  };
}

export interface HMExportFilter {
  /** Filter by manufacturer (partial match) */
  manufacturer?: string;
  /** Filter by PRISM tool type */
  tool_type?: string;
  /** Diameter range [min, max] mm */
  diameter_range_mm?: [number, number];
  /** Filter by tool material */
  tool_material?: string;
  /** Max tools to export (default: 5000) */
  max_tools?: number;
}

// ─── Geometry parameter builder ───────────────────────────────────────────────

interface GeomParams {
  dbl_param1: number;
  dbl_param2: number;
  dbl_param3: number;
  dbl_param4: number;
  dbl_param5: number;
  dbl_param6: number;
  int_param1: number;
  int_param2: number;
  total_length: number;
}

function buildGeomParams(hmClass: string, phys: any): GeomParams {
  const d = phys.cutting_diameter_mm ?? phys.diameter_mm ?? 10;
  const cr = phys.corner_radius_mm ?? 0;
  const fl = phys.flute_length_mm ?? d * 3;
  const oal = phys.overall_length_mm ?? d * 6;
  const shankD = phys.shank_diameter_mm ?? d;
  const flutes = phys.flute_count ?? phys.flutes ?? 4;
  const pointAngle = phys.point_angle_deg ?? 140;
  const pitch = phys.pitch_mm ?? phys.thread_pitch_mm ?? 1.0;

  switch (hmClass) {
    case "Ballmill":
      // dbl_param1=ball_diameter (full diameter, not radius)
      return {
        dbl_param1: d,
        dbl_param2: 0,
        dbl_param3: 0,
        dbl_param4: 0,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Endmill":
      // Per hypermill-tool-schema-notes.ts HYPERMILL_TO_PRISM_FIELD_MAP (sqlite.sql v1.53):
      // dbl_param1=diameter, dbl_param2=flute_length, dbl_param3=shank_diameter, dbl_param4=corner_radius(0 for square)
      return {
        dbl_param1: d,
        dbl_param2: fl,           // flute_length
        dbl_param3: shankD,       // shank_diameter
        dbl_param4: 0,            // corner_radius = 0 for square endmill
        dbl_param5: 0,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Radiusmill":
      // Per schema: dbl_param1=diameter, dbl_param2=flute_length, dbl_param3=shank_diameter, dbl_param4=corner_radius
      return {
        dbl_param1: d,
        dbl_param2: fl,
        dbl_param3: shankD,
        dbl_param4: cr > 0 ? cr : d * 0.05,
        dbl_param5: 0,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Drilltool":
    case "GunDrill":
      // Per schema notes: dbl_param1=diameter, dbl_param2=point_angle, dbl_param3=shank_diameter
      // (point_angle is the key discriminator for drill type vs endmill in param2 position)
      return {
        dbl_param1: d,
        dbl_param2: pointAngle,   // point_angle_deg (118° HSS / 140° carbide typical)
        dbl_param3: shankD,       // shank_diameter
        dbl_param4: fl,           // flute_length
        dbl_param5: 0,
        dbl_param6: 0,
        int_param1: 2,            // drills typically 2-flute
        int_param2: 0,
        total_length: oal,
      };

    case "ChamferedCutter":
      // dbl_param1=major_diameter, dbl_param2=tip_diameter, dbl_param3=included_angle_half (deg)
      return {
        dbl_param1: d,
        dbl_param2: phys.tip_diameter_mm ?? 0,
        dbl_param3: (phys.included_angle_deg ?? 90) / 2,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Tap":
      // dbl_param1=thread_diameter, dbl_param2=pitch, int_param1=1(RH)/2(LH)
      return {
        dbl_param1: d,
        dbl_param2: pitch,
        dbl_param3: fl,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: 1,          // 1=right-hand
        int_param2: 0,
        total_length: oal,
      };

    case "ThreadMill":
      return {
        dbl_param1: d,
        dbl_param2: pitch,
        dbl_param3: fl,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Reamer":
    case "BoringBar":
    case "BackboringTool":
      return {
        dbl_param1: d,
        dbl_param2: 0,
        dbl_param3: fl,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Lollipop":
      // dbl_param1=ball_diameter, dbl_param2=neck_diameter, dbl_param3=neck_length
      return {
        dbl_param1: d,
        dbl_param2: phys.neck_diameter_mm ?? d * 0.6,
        dbl_param3: phys.neck_length_mm ?? fl,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "Woodruff":
    case "TSlotCutter":
      // dbl_param1=cutter_diameter, dbl_param2=cutter_width, dbl_param3=neck_diameter
      return {
        dbl_param1: d,
        dbl_param2: phys.width_mm ?? phys.cutter_width_mm ?? d * 0.2,
        dbl_param3: phys.neck_diameter_mm ?? shankD * 0.7,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "GeneralBarrelTool":
    case "TangentBarrelTool":
    case "ConicalBarrelTool":
      // dbl_param1=barrel_diameter, dbl_param2=tip_radius, dbl_param3=barrel_radius, dbl_param4=OAL
      return {
        dbl_param1: d,
        dbl_param2: phys.tip_radius_mm ?? d * 0.1,
        dbl_param3: phys.barrel_radius_mm ?? d * 2,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "LensCutter":
      // dbl_param1=diameter, dbl_param2=lens_radius, dbl_param3=OAL
      return {
        dbl_param1: d,
        dbl_param2: phys.lens_radius_mm ?? d * 1.5,
        dbl_param3: oal,
        dbl_param4: 0,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };

    case "IndexableRoundInsertCutter":
    case "IndexableHighFeedCutter":
      return {
        dbl_param1: d,
        dbl_param2: phys.insert_diameter_mm ?? d * 0.3,
        dbl_param3: phys.axial_depth_mm ?? d * 0.1,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: phys.insert_count ?? Math.max(1, Math.floor(d / 15)),
        int_param2: 0,
        total_length: oal,
      };

    case "GeneralTurningTool":
    case "RadialRecessingTool":
    case "AxialRecessingTool":
    case "PartingTool":
    case "RollTurnTool":
    case "ThreadingTool":
      return {
        dbl_param1: d,
        dbl_param2: phys.insert_width_mm ?? d * 0.25,
        dbl_param3: oal,
        dbl_param4: 0,
        dbl_param5: 0,
        dbl_param6: 0,
        int_param1: 1,
        int_param2: 0,
        total_length: oal,
      };

    case "TouchProbe":
      return {
        dbl_param1: d,
        dbl_param2: 0,
        dbl_param3: oal,
        dbl_param4: 0,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: 0,
        int_param2: 0,
        total_length: oal,
      };

    default:
      // Fallback to Endmill geometry
      return {
        dbl_param1: d,
        dbl_param2: 0,
        dbl_param3: fl,
        dbl_param4: oal,
        dbl_param5: shankD,
        dbl_param6: 0,
        int_param1: flutes,
        int_param2: 0,
        total_length: oal,
      };
  }
}

// ─── SQL escaping ─────────────────────────────────────────────────────────────

function sq(s: string): string {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function fmt(n: number, dec = 4): string {
  // Guard non-finite source dims (undefined/null/NaN/Infinity). The hyperMILL .hmt
  // schema has NOT NULL numeric columns (e.g. Tools.total_length), so a bareword "NaN"
  // both breaks SQL parse AND violates NOT NULL -- emit a 0 default so the tool still
  // imports with its valid dims instead of aborting the whole DB build.
  // (slot:romeo 2026-06-15, NaN-export bugfix found while placing the full-corpus .hmt.)
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(dec) : "0";
}

// ─── Cutting data computation ─────────────────────────────────────────────────

function coatingMult(coating: string): number {
  const c = (coating ?? "").toLowerCase();
  // LONGEST key first: "altin" must not be shadowed by the shorter "tin" substring it contains
  // (a real mismatch surfaced when this helper went live in U-HMT-CUTTING-DATA -- AlTiN was being
  // scored 1.10 (tin) instead of 1.30 (altin) because Object.keys order tested "tin" first).
  const key = Object.keys(COATING_MULT)
    .sort((a, b) => b.length - a.length)
    .find(k => c.includes(k)) ?? "uncoated";
  return COATING_MULT[key] ?? 1.0;
}

function materialMult(mat: string): number {
  const m = mat.toLowerCase();
  if (m.includes("cbn")) return 2.50;
  if (m.includes("pcd")) return 3.00;
  if (m.includes("ceramic")) return 2.20;
  if (m.includes("cermet")) return 1.10;
  if (m.includes("hss")) return 0.40;
  return 1.00; // carbide baseline
}

// --- Per-tool cutting-data ceiling (CATALOG-APP-WIRING-MS0/U-HMT-CUTTING-DATA, slot:romeo) ---
//
// NCTools.max_spindle_speed / max_feedrate are the per-ASSEMBLED-TOOL ceilings the hyperMILL
// programmer scales per workpiece via the Materials.milling_factor_vc/fz columns (relative to
// the P-steel baseline). Before this wire those ceilings defaulted to 0.0, so every Materials
// factor scaled 0 -> 0 and the whole per-material preset system was inert. We derive the ceiling
// from the tool's FASTEST legitimate application (ISO N, non-ferrous -- what actually sets a
// spindle ceiling) at the tool's own diameter, then derate for substrate (materialMult) and
// coating (coatingMult) -- the two helpers that were defined-but-dead before this unit.
//
// The base Vc/fz come from UltimateSpeedFeedEngine.lookupCuttingData (carbide-calibrated). We do
// NOT pass tool_material to it: the substrate factor is applied via materialMult so the cbn/pcd/
// ceramic UPLIFT (which lookupCuttingData does not model) is captured, while materialMult's hss
// derate (0.40) matches lookupCuttingData's own hss derate (0.40) -- no double counting either way.
//
// Turning tools + probes + additive heads do not spin -> no spindle ceiling (left 0.0). All paths
// are fail-soft: a null lookup, non-finite diameter, or non-finite Vc returns a zeroed ceiling
// rather than emitting a NaN/Infinity into the .hmt (which would make the DB unimportable).

const NON_ROTATING_CLASSES: ReadonlySet<HMGeometryClass> = new Set<HMGeometryClass>([
  "GeneralTurningTool", "RadialRecessingTool", "AxialRecessingTool",
  "ThreadingTool", "PartingTool", "RollTurnTool", "TouchProbe", "AdditiveDevice",
]);

const DRILLING_CLASSES: ReadonlySet<HMGeometryClass> = new Set<HMGeometryClass>([
  "Drilltool", "GunDrill", "Reamer", "BoringBar", "BackboringTool",
]);

interface ToolCuttingCeiling {
  /** Max spindle speed (rpm) for the assembled tool, 0 = not applicable / non-rotating. */
  maxSpindleSpeed: number;
  /** Max feedrate (mm/min) at that ceiling, 0 = not applicable. */
  maxFeedrate: number;
}

/**
 * Per-tool cutting-data ceiling for the hyperMILL NCTools row. Pure + fail-soft.
 *
 * @param hmClass    hyperMILL geometry class (rotating vs turning/probe is read from this)
 * @param diameterMm cutting diameter (mm) -- drives rpm = Vc*1000/(pi*D)
 * @param substrate  tool substrate string (carbide/hss/cbn/pcd/...) -> materialMult derate
 * @param coating    coating string (TiAlN/AlCrN/...) -> coatingMult uplift
 * @param flutes     flute/tooth count -> feed_per_rev = fz*flutes (drilling: fz is feed/rev)
 * @returns {maxSpindleSpeed (rpm), maxFeedrate (mm/min)} -- both 0 when not applicable
 */
function computeToolCuttingCeiling(
  hmClass: HMGeometryClass,
  diameterMm: number,
  substrate: string,
  coating: string,
  flutes: number,
): ToolCuttingCeiling {
  const ZERO: ToolCuttingCeiling = { maxSpindleSpeed: 0, maxFeedrate: 0 };
  // Turning tools, probes and additive heads do not spin -> no spindle ceiling.
  if (NON_ROTATING_CLASSES.has(hmClass)) return ZERO;
  const d = diameterMm;
  if (!Number.isFinite(d) || d <= 0) return ZERO;

  const op: Operation = DRILLING_CLASSES.has(hmClass) ? "drilling" : "milling";
  // Carbide-baseline Vc/fz at the fastest legit application (ISO N). Substrate handled below.
  const cd = ultimateSpeedFeedEngine.lookupCuttingData({
    iso_group: "N" as ISOGroup,
    operation: op,
    cut_type: "roughing" as CutType,
    tool_diameter_mm: d,
  });
  if (!cd) return ZERO;

  const vc = cd.vc * materialMult(substrate ?? "") * coatingMult(coating ?? ""); // m/min
  if (!Number.isFinite(vc) || vc <= 0) return ZERO;

  // rpm = Vc*1000 / (pi*D)   (Vc m/min, D mm -> rpm)
  const rpm = (vc * 1000) / (Math.PI * d);
  if (!Number.isFinite(rpm) || rpm <= 0) return ZERO;

  // feed_per_rev: milling fz is per-tooth -> *flutes; drilling fz is already feed-per-rev (*1).
  const fl = Number.isFinite(flutes) && flutes > 0 ? flutes : (op === "drilling" ? 1 : 2);
  const feedPerRev = op === "drilling" ? cd.fz : cd.fz * fl; // mm/rev
  const feedrate = rpm * feedPerRev; // mm/min

  return {
    maxSpindleSpeed: Math.round(rpm),
    maxFeedrate: Number.isFinite(feedrate) && feedrate > 0 ? Math.round(feedrate) : 0,
  };
}

// ─── Fallback tool generation ─────────────────────────────────────────────────

function generateFallbackTools(): any[] {
  const tools: any[] = [];
  const diams = [3, 4, 6, 8, 10, 12, 16, 20, 25, 32];
  const types = ["endmill", "ball_mill", "bull_mill", "drill"];
  let i = 0;
  for (const d of diams) {
    for (const tp of types) {
      tools.push({
        type: tp,
        physical: {
          cutting_diameter_mm: d,
          flute_count: tp === "drill" ? 2 : 4,
          flute_length_mm: d * (tp === "drill" ? 5 : 3),
          overall_length_mm: d * (tp === "drill" ? 8 : 6),
          shank_diameter_mm: d,
          corner_radius_mm: tp === "bull_mill" ? d * 0.1 : 0,
          point_angle_deg: 140,
        },
        coating: "TiAlN",
        material: "carbide",
        manufacturer: "Generic",
        part_number: `GEN-${tp.toUpperCase().replace("_", "")}-D${d}`,
        description: `Generic ${tp} Ø${d}mm`,
      });
      i++;
    }
  }
  return tools;
}

// ─── PRISM tool → HMToolRow ───────────────────────────────────────────────────

function convertTool(prismTool: any, toolId: number, mmSys: number): HMToolRow {
  const phys = prismTool.physical ?? {};
  const rawType = prismTool.type ?? prismTool.tool_type ?? "endmill";
  const rawSub = prismTool.subtype ?? "";
  const hmClass = prismTypeToHMClass(rawType, rawSub) as HMGeometryClass;
  const typeId = HM_TYPE[hmClass] ?? HM_TYPE["Endmill"];
  const rawMat = prismTool.material ?? prismTool.substrate ?? "carbide";
  const cuttingMatId = mapCuttingMaterial(rawMat);
  const geom = buildGeomParams(hmClass, phys);

  const mfr = prismTool.manufacturer ?? prismTool.brand ?? "Generic";
  const pn = prismTool.part_number ?? prismTool.designation ?? prismTool.model ?? "";
  const desc = prismTool.description ?? `${hmClass} Ø${geom.dbl_param1}mm`;
  const nameBase = pn ? `${mfr} ${pn}` : desc;
  const name = nameBase.substring(0, 127);

  return {
    tool_id: toolId,
    name,
    tool_type_id: typeId,
    geometry_class: hmClass,
    cutting_material_id: cuttingMatId,
    mm_system_id: mmSys,
    total_length: geom.total_length,
    dbl_param1: geom.dbl_param1,
    dbl_param2: geom.dbl_param2,
    dbl_param3: geom.dbl_param3,
    dbl_param4: geom.dbl_param4,
    dbl_param5: geom.dbl_param5,
    dbl_param6: geom.dbl_param6,
    int_param1: geom.int_param1,
    int_param2: geom.int_param2,
    ordering_code: pn.substring(0, 127),
    comment: `Exported from PRISM by HyperMillToolExportEngine E1127`.substring(0, 127),
  };
}

// ─── NCTool row builder ───────────────────────────────────────────────────────

function buildNCTool(toolRow: HMToolRow, ncId: number, prismTool?: any): HMNCToolRow {
  const d = toolRow.dbl_param1;
  const oal = toolRow.total_length;
  // Diameter-based fallback gauge (hyperMILL holder standard practice). Tool-scaled, so it stays
  // BELOW the tool OAL -- it is what drives the tool stickout length below.
  const fallbackGage = d >= 32 ? 100 : d >= 16 ? 80 : d >= 6 ? 60 : 50;

  // tool_length = tool stickout from the holder gauge point -- a TOOL-geometry quantity. It is
  // derived from the tool's OWN overall length and the tool-scaled fallback gauge ONLY. It must
  // NEVER be derived by subtracting a real holder's (much larger) gauge from the tool OAL: a real
  // CAT40 holder gauge (80-200mm) exceeds a short tool's OAL, so `oal - holderGauge` goes negative
  // and silently clamps to the 10mm floor for the common case (U-HOLDER-WIRE-HYPERMILL, slot:romeo).
  const toolLen = Math.max(oal - fallbackGage, 10);
  const usable = toolRow.dbl_param3 > 0 ? toolRow.dbl_param3 : toolLen * 0.5;

  // Attach a REAL cataloged holder by spindle taper + shank-bore fit -- the same selection the
  // Fusion + Mastercam exporters use (CATALOG-APP-WIRING-MS0/U-HOLDER-WIRE-HYPERMILL, slot:romeo).
  // hyperMILL's NCTools row has no holder_vendor column, so the brand + designation rides in
  // nc_name. The real holder's gauge (spindle-face-to-holder projection) plus the tool stickout
  // gives a true spindle-face-to-tip gage_length. No catalog match -> the diameter-based fallback
  // gauge is retained (never a silent wrong-holder grab), and tool_length is unaffected either way.
  let gageLen = fallbackGage;
  let ncName = toolRow.name;
  const phys = prismTool?.physical ?? {};
  const shankD = phys.shank_diameter_mm ?? d;
  const taper = (prismTool?.spindle_taper as string) || "CAT40";
  const realHolder = holderSelectionEngine.select({
    taper,
    shankDiameterMm: shankD,
    typePreference: shankD <= 12 ? "shrink_fit" : "hydraulic",
  });
  if (realHolder) {
    if (realHolder.gaugeMm != null) gageLen = realHolder.gaugeMm + toolLen;
    ncName = `${ncName} [${realHolder.brand} ${realHolder.designation}]`;
  }

  // Per-tool cutting-data ceiling (NCTools.max_spindle_speed/max_feedrate). Substrate + coating
  // ride on the source prismTool; flute/tooth count is int_param1 on the geometry row.
  const ceiling = computeToolCuttingCeiling(
    toolRow.geometry_class,
    d,
    (prismTool?.material ?? prismTool?.substrate ?? "carbide") as string,
    (prismTool?.coating ?? "") as string,
    toolRow.int_param1,
  );

  return {
    nctool_id: ncId,
    tool_id: toolRow.tool_id,
    nc_number_val: ncId,
    nc_name: ncName.substring(0, 127),
    gage_length: Math.round(gageLen * 1000) / 1000,
    tool_length: Math.round(toolLen * 1000) / 1000,
    usable_length: Math.round(usable * 1000) / 1000,
    preset_diameter: Math.round(d * 1000) / 1000,
    max_spindle_speed: ceiling.maxSpindleSpeed,
    max_feedrate: ceiling.maxFeedrate,
  };
}

// ─── INSERT statement generators ─────────────────────────────────────────────

function toolInsert(r: HMToolRow): string {
  return (
    `INSERT INTO Tools (id, name, tool_type_id, cutting_material_id, mm_system_id, ` +
    `total_length, dbl_param1, dbl_param2, dbl_param3, dbl_param4, dbl_param5, dbl_param6, ` +
    `int_param1, int_param2, ordering_code, comment) VALUES (` +
    `${r.tool_id}, ${sq(r.name)}, ${r.tool_type_id}, ${r.cutting_material_id}, ${r.mm_system_id}, ` +
    `${fmt(r.total_length)}, ${fmt(r.dbl_param1)}, ${fmt(r.dbl_param2)}, ${fmt(r.dbl_param3)}, ` +
    `${fmt(r.dbl_param4)}, ${fmt(r.dbl_param5)}, ${fmt(r.dbl_param6)}, ` +
    `${r.int_param1}, ${r.int_param2}, ${sq(r.ordering_code)}, ${sq(r.comment)});`
  );
}

function ncToolInsert(r: HMNCToolRow): string {
  return (
    `INSERT INTO NCTools (id, tool_id, nc_number_val, nc_number_str, nc_name, ` +
    `gage_length, tool_length, usable_length, preset_diameter, max_spindle_speed, max_feedrate) VALUES (` +
    `${r.nctool_id}, ${r.tool_id}, ${r.nc_number_val}, ${sq(String(r.nc_number_val))}, ` +
    `${sq(r.nc_name)}, ${fmt(r.gage_length)}, ${fmt(r.tool_length)}, ` +
    `${fmt(r.usable_length)}, ${fmt(r.preset_diameter)}, ${fmt(r.max_spindle_speed)}, ${fmt(r.max_feedrate)});`
  );
}

function depotInsert(r: HMDepotRow): string {
  return (
    `INSERT INTO DepotItems (id, nctool_id, slot_number) VALUES (` +
    `${r.depot_item_id}, ${r.nctool_id}, ${r.slot_number});`
  );
}

function materialInsert(r: HMMaterialRow): string {
  return (
    `INSERT INTO Materials (id, name, type, milling_factor_vc, milling_factor_fz, ` +
    `drilling_factor_vc, drilling_factor_fz) VALUES (` +
    `${r.material_id}, ${sq(r.name)}, ${r.type}, ` +
    `${fmt(r.milling_factor_vc)}, ${fmt(r.milling_factor_fz)}, ` +
    `${fmt(r.milling_factor_vc * 0.9)}, ${fmt(r.milling_factor_fz * 0.8)});`
  );
}

// ─── Schema DDL ──────────────────────────────────────────────────────────────

const SQLITE_SCHEMA = `-- hyperMILL Tool Database Schema (PRISM export subset)
-- Generated by HyperMillToolExportEngine E1127
-- Compatible with hyperMILL v33.0 sqlite.sql v1.53 structure

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS GeometryClasses (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS CuttingMaterials (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Materials (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  type                INTEGER NOT NULL DEFAULT 1,
  milling_factor_vc   REAL    NOT NULL DEFAULT 1.0,
  milling_factor_fz   REAL    NOT NULL DEFAULT 1.0,
  drilling_factor_vc  REAL    NOT NULL DEFAULT 1.0,
  drilling_factor_fz  REAL    NOT NULL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS Tools (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT    NOT NULL,
  tool_type_id        INTEGER NOT NULL REFERENCES GeometryClasses(id),
  cutting_material_id INTEGER NOT NULL DEFAULT 2 REFERENCES CuttingMaterials(id),
  mm_system_id        INTEGER NOT NULL DEFAULT 1,
  total_length        REAL    NOT NULL DEFAULT 0.0,
  dbl_param1          REAL    NOT NULL DEFAULT 0.0,
  dbl_param2          REAL    NOT NULL DEFAULT 0.0,
  dbl_param3          REAL    NOT NULL DEFAULT 0.0,
  dbl_param4          REAL    NOT NULL DEFAULT 0.0,
  dbl_param5          REAL    NOT NULL DEFAULT 0.0,
  dbl_param6          REAL    NOT NULL DEFAULT 0.0,
  dbl_param7          REAL    NOT NULL DEFAULT 0.0,
  dbl_param8          REAL    NOT NULL DEFAULT 0.0,
  dbl_param9          REAL    NOT NULL DEFAULT 0.0,
  dbl_param10         REAL    NOT NULL DEFAULT 0.0,
  dbl_param11         REAL    NOT NULL DEFAULT 0.0,
  dbl_param12         REAL    NOT NULL DEFAULT 0.0,
  dbl_param13         REAL    NOT NULL DEFAULT 0.0,
  dbl_param14         REAL    NOT NULL DEFAULT 0.0,
  dbl_param15         REAL    NOT NULL DEFAULT 0.0,
  dbl_param16         REAL    NOT NULL DEFAULT 0.0,
  dbl_param17         REAL    NOT NULL DEFAULT 0.0,
  int_param1          INTEGER NOT NULL DEFAULT 0,
  int_param2          INTEGER NOT NULL DEFAULT 0,
  int_param3          INTEGER NOT NULL DEFAULT 0,
  int_param4          INTEGER NOT NULL DEFAULT 0,
  int_param5          INTEGER NOT NULL DEFAULT 0,
  int_param6          INTEGER NOT NULL DEFAULT 0,
  ordering_code       TEXT    NOT NULL DEFAULT '',
  comment             TEXT    NOT NULL DEFAULT '',
  spindle_direction   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS NCTools (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id           INTEGER NOT NULL REFERENCES Tools(id),
  nc_number_val     INTEGER NOT NULL DEFAULT 0,
  nc_number_str     TEXT    NOT NULL DEFAULT '',
  nc_name           TEXT    NOT NULL DEFAULT '',
  gage_length       REAL    NOT NULL DEFAULT 0.0,
  tool_length       REAL    NOT NULL DEFAULT 0.0,
  usable_length     REAL    NOT NULL DEFAULT 0.0,
  preset_diameter   REAL    NOT NULL DEFAULT 0.0,
  compensation_length REAL  NOT NULL DEFAULT 0.0,
  max_spindle_speed REAL    NOT NULL DEFAULT 0.0,
  max_feedrate      REAL    NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS Depots (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL DEFAULT 'PRISM Magazine'
);

CREATE TABLE IF NOT EXISTS DepotItems (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nctool_id   INTEGER NOT NULL REFERENCES NCTools(id),
  slot_number INTEGER NOT NULL DEFAULT 0
);

-- Seed GeometryClasses
INSERT OR IGNORE INTO GeometryClasses (id, name) VALUES
  (1,'Ballmill'),(2,'Endmill'),(3,'Radiusmill'),(4,'Drilltool'),
  (5,'Lollipop'),(6,'Woodruff'),(7,'GeneralBarrelTool'),(8,'LensCutter'),
  (9,'ChamferedCutter'),(10,'TSlotCutter'),(11,'Tap'),(12,'BoringBar'),
  (13,'GunDrill'),(15,'ThreadMill'),(16,'Reamer'),(17,'TangentBarrelTool'),
  (18,'ConicalBarrelTool'),(19,'IndexableRoundInsertCutter'),
  (20,'IndexableHighFeedCutter'),(21,'BackboringTool'),
  (1000,'GeneralTurningTool'),(1001,'RadialRecessingTool'),
  (1002,'AxialRecessingTool'),(1003,'ThreadingTool'),(1004,'PartingTool'),
  (1005,'RollTurnTool'),(2000,'TouchProbe'),(3000,'GrindingBit'),(4000,'AdditiveDevice');

-- Seed CuttingMaterials
INSERT OR IGNORE INTO CuttingMaterials (id, name) VALUES
  (1,'HSS'),(2,'Carbide'),(3,'Cermet'),(4,'Ceramic'),(5,'CBN'),(6,'PCD');

-- Seed default Depot
INSERT OR IGNORE INTO Depots (id, name) VALUES (1, 'PRISM Magazine');
`;

// ─── Engine class ─────────────────────────────────────────────────────────────

export class HyperMillToolExportEngineClass {
  /**
   * Export PRISM tools to hyperMILL Tool Database format.
   *
   * Produces a complete SQLite schema DDL and all INSERT statements for:
   *   - Tools table (geometry definitions)
   *   - NCTools table (assembled tool with gauge length)
   *   - DepotItems table (magazine slot assignments)
   *   - Materials table (6 ISO groups with Vc/fz correction factors)
   *
   * @param tools    PRISM tool objects (or empty for full catalog)
   * @param options  Export options (mm_system, start_id, include flags)
   */
  exportToHMT(
    tools: any[],
    options: HMExportOptions = {},
  ): HMToolExportResult {
    const mmSys = options.mm_system_id ?? 1;
    const startId = options.start_id ?? 1;
    const startSlot = options.start_slot ?? 1;
    const incNCT = options.include_nctool !== false;
    const incDepot = options.include_depot !== false;
    const incMat = options.include_materials !== false;

    // Use provided tools or fall back to catalog / synthetic
    let prismTools = tools;
    if (!prismTools || prismTools.length === 0) {
      try {
        if (toolCatalogEngine?.search) {
          // Full catalog (~74K) by default so an empty-tools call exports the whole DB,
          // not a silent 5000 slice (CATALOG-APP-WIRING-MS0/U-CAM-TOOL-FULL-CATALOG, slot:romeo).
          prismTools = toolCatalogEngine.search({ max_results: options.max_tools ?? 100_000 }) || [];
        }
      } catch { /* ignore */ }
      if (!prismTools || prismTools.length === 0) {
        prismTools = generateFallbackTools();
      }
    }

    const toolRows: HMToolRow[] = [];
    const ncToolRows: HMNCToolRow[] = [];
    const depotRows: HMDepotRow[] = [];
    const classesUsed = new Set<string>();

    prismTools.forEach((pt, idx) => {
      const toolId = startId + idx;
      const row = convertTool(pt, toolId, mmSys);
      toolRows.push(row);
      classesUsed.add(row.geometry_class);

      if (incNCT) {
        const ncRow = buildNCTool(row, toolId, pt);
        ncToolRows.push(ncRow);

        if (incDepot) {
          depotRows.push({
            depot_item_id: toolId,
            nctool_id: toolId,
            slot_number: startSlot + idx,
          });
        }
      }
    });

    // Build Materials rows (6 ISO groups)
    const matRows: HMMaterialRow[] = incMat
      ? ALL_ISO.map((iso, i) => ({
          material_id: i + 1,
          iso_group: iso,
          name: ISO_LABELS[iso],
          type: ISO_MATERIAL_TYPE[iso],
          milling_factor_vc: VC_BASE[iso] / 150,  // normalized to P-steel baseline
          milling_factor_fz: FZ_BASE[iso] / 0.10,
        }))
      : [];

    // Assemble INSERT statements
    const inserts: string[] = [];

    if (incMat && matRows.length > 0) {
      inserts.push("-- Materials (ISO groups)");
      matRows.forEach(r => inserts.push(materialInsert(r)));
    }

    inserts.push("-- Tools (geometry definitions)");
    toolRows.forEach(r => inserts.push(toolInsert(r)));

    if (incNCT && ncToolRows.length > 0) {
      inserts.push("-- NCTools (assembled tools)");
      ncToolRows.forEach(r => inserts.push(ncToolInsert(r)));
    }

    if (incDepot && depotRows.length > 0) {
      inserts.push("-- DepotItems (magazine slots)");
      depotRows.forEach(r => inserts.push(depotInsert(r)));
    }

    return {
      sqlite_schema: SQLITE_SCHEMA,
      insert_statements: inserts,
      tool_count: toolRows.length,
      summary: {
        tools: toolRows.length,
        nctool_entries: ncToolRows.length,
        depot_slots: depotRows.length,
        materials: matRows.length,
        geometry_classes_used: [...classesUsed].sort(),
      },
    };
  }

  /**
   * Export a single PRISM tool as a hyperMILL Tools table INSERT statement.
   *
   * @param tool      PRISM tool object
   * @param toolId    Desired tool_id (default: 1)
   * @returns         SQL INSERT string for the Tools table row
   */
  exportToolDefinition(tool: any, toolId = 1): string {
    const row = convertTool(tool, toolId, 1);
    return toolInsert(row);
  }

  /**
   * Map a PRISM tool type string to a hyperMILL geometry class code.
   *
   * @param prism_tool_type  PRISM type string (e.g. "ball_mill", "drill", "end_mill")
   * @param subtype          Optional PRISM subtype (e.g. "lollipop", "barrel")
   * @returns                Object with geometry_class name and type_id integer
   */
  mapGeometryClass(
    prism_tool_type: string,
    subtype?: string,
  ): { geometry_class: HMGeometryClass; type_id: number } {
    const cls = prismTypeToHMClass(prism_tool_type, subtype ?? "") as HMGeometryClass;
    return { geometry_class: cls, type_id: HM_TYPE[cls] ?? 2 };
  }

  /**
   * Return a full description of the hyperMILL tool database schema.
   *
   * Covers all 4 export tables, the 29 geometry classes, and the
   * parameter mapping semantics per tool type.
   */
  getSchemaInfo(): {
    database_format: string;
    schema_version: string;
    tables: Record<string, Record<string, string>>;
    geometry_classes: Record<number, string>;
    geometry_param_map: Record<string, string[]>;
    cutting_material_ids: Record<string, number>;
    notes: string[];
  } {
    return {
      database_format: "SQLite (.hmt) — hyperMILL Tool Database",
      schema_version: "v1.53 (hyperMILL 33.0)",
      tables: {
        Tools: {
          id: "Auto-increment primary key",
          name: "Unique tool name (max 128 chars)",
          tool_type_id: "FK to GeometryClasses — determines dbl_param semantics",
          cutting_material_id: "1=HSS, 2=Carbide, 3=Cermet, 4=Ceramic, 5=CBN, 6=PCD",
          mm_system_id: "1=Metric, 2=Inch",
          total_length: "Overall assembly length (OAL), mm",
          "dbl_param1..17": "Parametric geometry — semantics vary by tool_type_id",
          "int_param1..6": "Integer parameters (flute count, thread direction, etc.)",
          ordering_code: "Manufacturer catalog/part number",
          comment: "User notes",
        },
        NCTools: {
          id: "Auto-increment primary key",
          tool_id: "FK to Tools",
          nc_number_val: "T-number for NC program (integer)",
          nc_number_str: "T-number as string (unique in DB)",
          nc_name: "Tool name for NC output",
          gage_length: "Gauge length (spindle face to tool tip), mm",
          tool_length: "Tool stickout from holder gauge point, mm",
          usable_length: "Effective cutting depth available, mm",
          preset_diameter: "Diameter at tip for compensation, mm",
          max_spindle_speed: "Per-tool spindle-speed ceiling (rpm), 0 = non-rotating/n.a.",
          max_feedrate: "Per-tool feedrate ceiling (mm/min) at max_spindle_speed, 0 = n.a.",
        },
        DepotItems: {
          id: "Auto-increment primary key",
          nctool_id: "FK to NCTools",
          slot_number: "Magazine pocket/slot number (1-based)",
        },
        Materials: {
          id: "Auto-increment primary key",
          name: "Workpiece material name (e.g. Steel ISO-P)",
          type: "ISO group number: 1=P, 2=M, 3=K, 4=N, 5=S, 6=H",
          milling_factor_vc: "Vc correction factor relative to P-steel baseline",
          milling_factor_fz: "fz correction factor relative to P-steel baseline",
          drilling_factor_vc: "Vc correction for drilling operations",
          drilling_factor_fz: "fz correction for drilling operations",
        },
      },
      geometry_classes: {
        1: "Ballmill", 2: "Endmill", 3: "Radiusmill", 4: "Drilltool",
        5: "Lollipop", 6: "Woodruff", 7: "GeneralBarrelTool", 8: "LensCutter",
        9: "ChamferedCutter", 10: "TSlotCutter", 11: "Tap", 12: "BoringBar",
        13: "GunDrill", 15: "ThreadMill", 16: "Reamer", 17: "TangentBarrelTool",
        18: "ConicalBarrelTool", 19: "IndexableRoundInsertCutter",
        20: "IndexableHighFeedCutter", 21: "BackboringTool",
        1000: "GeneralTurningTool", 1001: "RadialRecessingTool",
        1002: "AxialRecessingTool", 1003: "ThreadingTool", 1004: "PartingTool",
        1005: "RollTurnTool", 2000: "TouchProbe", 3000: "GrindingBit", 4000: "AdditiveDevice",
      },
      geometry_param_map: {
        "Endmill (2)": [
          "dbl_param1 = cutting_diameter",
          "dbl_param2 = flute_length (cutting length)",
          "dbl_param3 = shank_diameter",
          "dbl_param4 = corner_radius (0 for square endmill)",
          "int_param1 = flute_count",
          "Source: HYPERMILL_TO_PRISM_FIELD_MAP in hypermill-tool-schema-notes.ts",
        ],
        "Ballmill (1)": [
          "dbl_param1 = ball_diameter (full diameter = 2 * ball_radius)",
          "dbl_param5 = shank_diameter",
          "int_param1 = flute_count",
        ],
        "Radiusmill (3)": [
          "dbl_param1 = cutting_diameter",
          "dbl_param2 = flute_length",
          "dbl_param3 = shank_diameter",
          "dbl_param4 = corner_radius (bull-nose radius)",
          "int_param1 = flute_count",
        ],
        "Drilltool (4)": [
          "dbl_param1 = cutting_diameter",
          "dbl_param2 = point_angle (degrees, typically 118° HSS / 140° carbide)",
          "dbl_param3 = shank_diameter",
          "dbl_param4 = flute_length",
          "int_param1 = 2 (drills are typically 2-flute)",
          "Source: HYPERMILL_TO_PRISM_FIELD_MAP in hypermill-tool-schema-notes.ts",
        ],
        "Tap (11)": [
          "dbl_param1 = thread_diameter",
          "dbl_param2 = thread_pitch (mm)",
          "dbl_param3 = flute_length",
          "int_param1 = 1 (right-hand) or 2 (left-hand)",
        ],
        "Lollipop (5)": [
          "dbl_param1 = ball_diameter",
          "dbl_param2 = neck_diameter",
          "dbl_param3 = neck_length",
          "dbl_param4 = OAL",
        ],
        "Woodruff / TSlotCutter (6/10)": [
          "dbl_param1 = cutter_diameter",
          "dbl_param2 = cutter_width",
          "dbl_param3 = neck_diameter",
          "dbl_param4 = OAL",
        ],
        "GeneralBarrelTool (7)": [
          "dbl_param1 = barrel_diameter",
          "dbl_param2 = tip_radius",
          "dbl_param3 = barrel_radius (effective cutter radius)",
          "dbl_param4 = OAL",
          "int_param1 = flute_count",
        ],
      },
      cutting_material_ids: {
        HSS: 1, Carbide: 2, Cermet: 3, Ceramic: 4, CBN: 5, PCD: 6,
      },
      notes: [
        "All dimensions in mm (mm_system_id=1) unless inch mode requested",
        "tool_type_id 14 is unassigned in hyperMILL schema — skip from 13 to 15",
        "NCTools.nc_number_val = T-number; must be unique per DB for magazine management",
        "DepotItems.slot_number is 1-based magazine pocket number",
        "Materials factors are relative to P-steel (VC_BASE[P]=150 m/min) baseline",
        "Import the .hmt file via hyperMILL Tool Database > File > Import SQLite",
        "3D collision geometry (polyline/polyeder) is not exported — set in TOOL Builder",
        "Per-tool cutting-data ceiling IS exported: NCTools.max_spindle_speed (rpm) + max_feedrate (mm/min), derived from UltimateSpeedFeedEngine Vc/fz at ISO-N derated by substrate + coating; scale per workpiece via the Materials.milling_factor_vc/fz factors",
        "Per-operation Technologies-table cutting data is still assigned via hyperMILL technology templates (v1.53 Technologies DDL not yet reconned)",
      ],
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _queryCatalog(filter?: HMExportFilter): any[] {
    try {
      if (!toolCatalogEngine?.search) return [];
      return toolCatalogEngine.search({
        type: filter?.tool_type,
        manufacturer: filter?.manufacturer,
        diameter_range: filter?.diameter_range_mm,
        max_results: filter?.max_tools ?? 100_000,
      }) || [];
    } catch {
      return [];
    }
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const hyperMillToolExportEngine = new HyperMillToolExportEngineClass();
