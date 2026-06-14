/**
 * ToolHolderDatabaseEngine — Complete tool holder interface database
 *
 * 80+ holder types: CAT, BT, HSK (A/B/E/F/T), CAPTO, KM, PSC, VDI, BMT, SK, MT, R8, ER
 * Standards: ANSI B5.50, JIS B6339, DIN 69893, ISO 26623, DIN 69880, DIN 2080, DIN 6499
 *
 * Source: PRISM v8.89 monolith PRISM_TOOL_HOLDER_INTERFACES_COMPLETE.js
 *
 * Cross-CAM axis: each spec may carry the canonical {interface family × taper size × contact type}
 * categorization from ../data/holder-categorization.ts (CAM-agnostic; portable 1:1 across Fusion/
 * hyperMILL/Mastercam/Esprit). The per-size spindle physics below stay authoritative here; the
 * `category` field is the separable taxonomy axis (taper size + dual-contact/BIG-PLUS).
 */
import type { HolderCategory } from "../data/holder-categorization.js";

export interface ToolHolderSpec {
  id: string;
  type: string;
  standard: string;
  max_rpm: number;
  use_case: string;
  /** Canonical CAM-agnostic taper-size × contact-type axis (see ../data/holder-categorization.ts). */
  category?: HolderCategory;
  // Optional fields depending on type
  taper?: string;
  form?: string;
  size?: number | string;
  spindle_bore?: number;
  flange_dia?: number;
  pull_stud?: string;
  taper_ratio?: string;
  symmetric?: boolean;
  manual?: boolean;
  application?: string;
  driven_tool?: boolean;
  coupling_dia?: number;
  torque?: number;
  torque_nm?: number;
  polygon_sides?: number;
  polygon_size?: number;
  shank_dia?: number;
  turret_mount?: boolean;
  taper_per_foot?: number;
  draw_bar?: boolean;
  capacity_range?: [number, number];
  balance_grade?: string;
  clamping?: string;
  collar_dia?: number;
  orientation?: string;
  bore_small?: number;
  bore_large?: number;
  length?: number;
  taper_angle?: number;
  face_width?: number;
  number?: number;
}

// Complete database — 80+ holders
const HOLDER_DB: Record<string, Omit<ToolHolderSpec, 'id'>> = {
  // === V-Flange (CAT) — ANSI B5.50 ===
  CAT30:  { type: "v_flange", taper: "30", standard: "ANSI B5.50", spindle_bore: 31.75, flange_dia: 44.45, pull_stud: "std", max_rpm: 20000, use_case: "small_machines" },
  CAT40:  { type: "v_flange", taper: "40", standard: "ANSI B5.50", spindle_bore: 44.45, flange_dia: 63.55, pull_stud: "std", max_rpm: 15000, use_case: "general_purpose" },
  CAT45:  { type: "v_flange", taper: "45", standard: "ANSI B5.50", spindle_bore: 57.15, flange_dia: 82.55, pull_stud: "std", max_rpm: 10000, use_case: "heavy_duty" },
  CAT50:  { type: "v_flange", taper: "50", standard: "ANSI B5.50", spindle_bore: 69.85, flange_dia: 101.6, pull_stud: "std", max_rpm: 8000, use_case: "large_machines" },
  CAT60:  { type: "v_flange", taper: "60", standard: "ANSI B5.50", spindle_bore: 107.95, flange_dia: 152.4, pull_stud: "std", max_rpm: 4000, use_case: "very_large" },

  // === BT Taper — JIS B6339 ===
  BT30:   { type: "bt_taper", taper: "30", standard: "JIS B6339", spindle_bore: 31.75, flange_dia: 46.0, pull_stud: "MAS403", max_rpm: 24000, use_case: "high_speed" },
  BT35:   { type: "bt_taper", taper: "35", standard: "JIS B6339", spindle_bore: 38.1, flange_dia: 52.0, pull_stud: "MAS403", max_rpm: 18000, use_case: "medium" },
  BT40:   { type: "bt_taper", taper: "40", standard: "JIS B6339", spindle_bore: 44.45, flange_dia: 63.0, pull_stud: "MAS403", max_rpm: 15000, use_case: "general_purpose" },
  BT45:   { type: "bt_taper", taper: "45", standard: "JIS B6339", spindle_bore: 57.15, flange_dia: 82.0, pull_stud: "MAS403", max_rpm: 10000, use_case: "heavy_duty" },
  BT50:   { type: "bt_taper", taper: "50", standard: "JIS B6339", spindle_bore: 69.85, flange_dia: 101.0, pull_stud: "MAS403", max_rpm: 8000, use_case: "large_machines" },

  // === HSK-A — DIN 69893 (Auto change, symmetric) ===
  "HSK-A25":  { type: "hsk", form: "A", size: 25, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 26.0, max_rpm: 50000, use_case: "ultra_high_speed" },
  "HSK-A32":  { type: "hsk", form: "A", size: 32, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 33.0, max_rpm: 42000, use_case: "very_high_speed" },
  "HSK-A40":  { type: "hsk", form: "A", size: 40, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 42.0, max_rpm: 35000, use_case: "high_speed" },
  "HSK-A50":  { type: "hsk", form: "A", size: 50, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 52.0, max_rpm: 28000, use_case: "high_speed" },
  "HSK-A63":  { type: "hsk", form: "A", size: 63, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 65.0, max_rpm: 24000, use_case: "general_purpose" },
  "HSK-A80":  { type: "hsk", form: "A", size: 80, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 82.0, max_rpm: 18000, use_case: "heavy_duty" },
  "HSK-A100": { type: "hsk", form: "A", size: 100, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 102.0, max_rpm: 14000, use_case: "large" },
  "HSK-A125": { type: "hsk", form: "A", size: 125, standard: "DIN 69893", taper_ratio: "1:10", flange_dia: 127.0, max_rpm: 10000, use_case: "very_large" },

  // === HSK-E — DIN 69893 (Symmetric, balanced for high speed) ===
  "HSK-E25":  { type: "hsk", form: "E", size: 25, standard: "DIN 69893", taper_ratio: "1:10", symmetric: true, max_rpm: 60000, use_case: "micro_high_speed" },
  "HSK-E32":  { type: "hsk", form: "E", size: 32, standard: "DIN 69893", taper_ratio: "1:10", symmetric: true, max_rpm: 50000, use_case: "small_high_speed" },
  "HSK-E40":  { type: "hsk", form: "E", size: 40, standard: "DIN 69893", taper_ratio: "1:10", symmetric: true, max_rpm: 42000, use_case: "high_speed" },
  "HSK-E50":  { type: "hsk", form: "E", size: 50, standard: "DIN 69893", taper_ratio: "1:10", symmetric: true, max_rpm: 35000, use_case: "high_speed" },
  "HSK-E63":  { type: "hsk", form: "E", size: 63, standard: "DIN 69893", taper_ratio: "1:10", symmetric: true, max_rpm: 28000, use_case: "general_hs" },

  // === HSK-B — DIN 69893 (Manual change) ===
  "HSK-B50":  { type: "hsk", form: "B", size: 50, standard: "DIN 69893", taper_ratio: "1:10", manual: true, max_rpm: 15000, use_case: "manual_change" },
  "HSK-B63":  { type: "hsk", form: "B", size: 63, standard: "DIN 69893", taper_ratio: "1:10", manual: true, max_rpm: 12000, use_case: "manual_change" },
  "HSK-B80":  { type: "hsk", form: "B", size: 80, standard: "DIN 69893", taper_ratio: "1:10", manual: true, max_rpm: 10000, use_case: "manual_heavy" },
  "HSK-B100": { type: "hsk", form: "B", size: 100, standard: "DIN 69893", taper_ratio: "1:10", manual: true, max_rpm: 8000, use_case: "manual_large" },

  // === HSK-F — DIN 69893 (Grinding) ===
  "HSK-F63":  { type: "hsk", form: "F", size: 63, standard: "DIN 69893", application: "grinding", max_rpm: 20000, use_case: "grinding" },

  // === HSK-T — DIN 69893 (Turning/driven tools) ===
  "HSK-T63":  { type: "hsk", form: "T", size: 63, standard: "DIN 69893", application: "turning", driven_tool: true, max_rpm: 12000, use_case: "lathe_driven" },
  "HSK-T80":  { type: "hsk", form: "T", size: 80, standard: "DIN 69893", application: "turning", driven_tool: true, max_rpm: 10000, use_case: "lathe_driven" },
  "HSK-T100": { type: "hsk", form: "T", size: 100, standard: "DIN 69893", application: "turning", driven_tool: true, max_rpm: 8000, use_case: "lathe_heavy" },

  // === Coromant Capto — ISO 26623 ===
  "CAPTO-C3":  { type: "capto", size: "C3", standard: "ISO 26623", coupling_dia: 32.0, torque: 65, max_rpm: 28000, use_case: "small_turning" },
  "CAPTO-C4":  { type: "capto", size: "C4", standard: "ISO 26623", coupling_dia: 40.0, torque: 150, max_rpm: 22000, use_case: "general_turning" },
  "CAPTO-C5":  { type: "capto", size: "C5", standard: "ISO 26623", coupling_dia: 50.0, torque: 340, max_rpm: 18000, use_case: "medium_turning" },
  "CAPTO-C6":  { type: "capto", size: "C6", standard: "ISO 26623", coupling_dia: 63.0, torque: 700, max_rpm: 14000, use_case: "heavy_turning" },
  "CAPTO-C8":  { type: "capto", size: "C8", standard: "ISO 26623", coupling_dia: 80.0, torque: 1500, max_rpm: 10000, use_case: "very_heavy" },
  "CAPTO-C10": { type: "capto", size: "C10", standard: "ISO 26623", coupling_dia: 100.0, torque: 3000, max_rpm: 6000, use_case: "extreme_heavy" },

  // === KM (Kennametal) ===
  KM16:  { type: "km", size: 16, standard: "Kennametal", coupling_dia: 16.0, torque: 25, max_rpm: 40000, use_case: "micro_machining" },
  KM25:  { type: "km", size: 25, standard: "Kennametal", coupling_dia: 25.0, torque: 60, max_rpm: 35000, use_case: "small_precision" },
  KM32:  { type: "km", size: 32, standard: "Kennametal", coupling_dia: 32.0, torque: 50, max_rpm: 25000, use_case: "small" },
  KM40:  { type: "km", size: 40, standard: "Kennametal", coupling_dia: 40.0, torque: 110, max_rpm: 20000, use_case: "general" },
  KM50:  { type: "km", size: 50, standard: "Kennametal", coupling_dia: 50.0, torque: 250, max_rpm: 16000, use_case: "medium" },
  KM63:  { type: "km", size: 63, standard: "Kennametal", coupling_dia: 63.0, torque: 550, max_rpm: 12000, use_case: "heavy" },
  KM80:  { type: "km", size: 80, standard: "Kennametal", coupling_dia: 80.0, torque: 1100, max_rpm: 8000, use_case: "very_heavy" },
  KM100: { type: "km", size: 100, standard: "Kennametal", coupling_dia: 100.0, torque: 2000, max_rpm: 6000, use_case: "very_heavy" },

  // === PSC — ISO 26623-2 (Polygonal) ===
  PSC25: { type: "psc", size: "25", standard: "ISO 26623", polygon_size: 25.0, torque_nm: 30, max_rpm: 40000, use_case: "high_speed_small" },
  PSC32: { type: "psc", size: "32", standard: "ISO 26623-2", polygon_sides: 3, max_rpm: 30000, use_case: "turning" },
  PSC40: { type: "psc", size: "40", standard: "ISO 26623-2", polygon_sides: 3, max_rpm: 25000, use_case: "turning" },
  PSC50: { type: "psc", size: "50", standard: "ISO 26623-2", polygon_sides: 3, max_rpm: 20000, use_case: "turning" },
  PSC63: { type: "psc", size: "63", standard: "ISO 26623-2", polygon_sides: 3, max_rpm: 15000, use_case: "turning" },
  PSC80: { type: "psc", size: "80", standard: "ISO 26623", polygon_size: 80.0, torque_nm: 1200, max_rpm: 10000, use_case: "heavy_duty" },

  // === VDI — DIN 69880 (Lathe turret) ===
  VDI20: { type: "vdi", size: 20, standard: "DIN 69880", shank_dia: 20.0, max_rpm: 6000, use_case: "small_lathe" },
  VDI25: { type: "vdi", size: 25, standard: "DIN 69880", shank_dia: 25.0, max_rpm: 6000, use_case: "small_lathe" },
  VDI30: { type: "vdi", size: 30, standard: "DIN 69880", shank_dia: 30.0, max_rpm: 6000, use_case: "general_lathe" },
  VDI40: { type: "vdi", size: 40, standard: "DIN 69880", shank_dia: 40.0, max_rpm: 6000, use_case: "general_lathe" },
  VDI50: { type: "vdi", size: 50, standard: "DIN 69880", shank_dia: 50.0, max_rpm: 5000, use_case: "large_lathe" },
  VDI60: { type: "vdi", size: 60, standard: "DIN 69880", shank_dia: 60.0, max_rpm: 4000, use_case: "large_lathe" },
  VDI30_AXIAL:  { type: "vdi_axial", size: "30", standard: "DIN 69880", shank_dia: 30.0, collar_dia: 42.0, orientation: "axial", max_rpm: 6000, use_case: "axial_drilling" },
  VDI30_RADIAL: { type: "vdi_radial", size: "30", standard: "DIN 69880", shank_dia: 30.0, collar_dia: 42.0, orientation: "radial", max_rpm: 6000, use_case: "radial_milling" },

  // === BMT (Built-in Motor Turret) ===
  BMT45: { type: "bmt", size: 45, standard: "BMT", turret_mount: true, max_rpm: 6000, torque_nm: 40, use_case: "mill_turn" },
  BMT55: { type: "bmt", size: 55, standard: "BMT", turret_mount: true, max_rpm: 5000, torque_nm: 60, use_case: "mill_turn" },
  BMT65: { type: "bmt", size: 65, standard: "BMT", turret_mount: true, max_rpm: 4000, torque_nm: 90, use_case: "mill_turn_heavy" },
  BMT75: { type: "bmt", size: 75, standard: "BMT", turret_mount: true, max_rpm: 3500, torque_nm: 120, use_case: "mill_turn_heavy" },

  // === SK (Steep Taper) — DIN 2080 ===
  SK30: { type: "sk", taper: "30", standard: "DIN 2080", spindle_bore: 31.75, max_rpm: 12000, use_case: "european_small" },
  SK40: { type: "sk", taper: "40", standard: "DIN 2080", spindle_bore: 44.45, max_rpm: 10000, use_case: "european_general" },
  SK50: { type: "sk", taper: "50", standard: "DIN 2080", spindle_bore: 69.85, max_rpm: 6000, use_case: "european_large" },

  // === Morse Taper — DIN 228-1 / ANSI B5.10 ===
  MT0: { type: "morse_taper", number: 0, standard: "ANSI B5.10", bore_small: 6.401, bore_large: 9.045, length: 49.8, taper_angle: 2.9852, max_rpm: 3000, use_case: "small_drilling" },
  MT1: { type: "morse", number: 1, standard: "DIN 228-1", taper_per_foot: 0.5986, max_rpm: 2500, use_case: "legacy" },
  MT2: { type: "morse", number: 2, standard: "DIN 228-1", taper_per_foot: 0.5994, max_rpm: 2000, use_case: "drill_press" },
  MT3: { type: "morse", number: 3, standard: "DIN 228-1", taper_per_foot: 0.6024, max_rpm: 1800, use_case: "manual_lathe" },
  MT4: { type: "morse", number: 4, standard: "DIN 228-1", taper_per_foot: 0.6233, max_rpm: 1500, use_case: "heavy_lathe" },
  MT5: { type: "morse", number: 5, standard: "DIN 228-1", taper_per_foot: 0.6315, max_rpm: 1200, use_case: "large_lathe" },
  MT6: { type: "morse_taper", number: 6, standard: "ANSI B5.10", bore_small: 63.348, bore_large: 76.213, length: 218.4, taper_angle: 2.9708, max_rpm: 1000, use_case: "very_heavy_drilling" },

  // === R8 (Bridgeport) ===
  R8: { type: "r8", standard: "Bridgeport", shank_dia: 0.95, draw_bar: true, max_rpm: 6000, use_case: "manual_mill" },

  // === ER Collet — DIN 6499 ===
  ER8:  { type: "er_collet", size: 8,  standard: "DIN 6499", capacity_range: [0.5, 5.0],  max_rpm: 40000, balance_grade: "G2.5", use_case: "micro" },
  ER11: { type: "er_collet", size: 11, standard: "DIN 6499", capacity_range: [0.5, 7.0],  max_rpm: 35000, balance_grade: "G2.5", use_case: "small" },
  ER16: { type: "er_collet", size: 16, standard: "DIN 6499", capacity_range: [1.0, 10.0], max_rpm: 30000, balance_grade: "G2.5", use_case: "general" },
  ER20: { type: "er_collet", size: 20, standard: "DIN 6499", capacity_range: [1.0, 13.0], max_rpm: 25000, balance_grade: "G2.5", use_case: "general" },
  ER25: { type: "er_collet", size: 25, standard: "DIN 6499", capacity_range: [1.0, 16.0], max_rpm: 20000, balance_grade: "G2.5", use_case: "general" },
  ER32: { type: "er_collet", size: 32, standard: "DIN 6499", capacity_range: [2.0, 20.0], max_rpm: 18000, balance_grade: "G6.3", use_case: "general_heavy" },
  ER40: { type: "er_collet", size: 40, standard: "DIN 6499", capacity_range: [3.0, 26.0], max_rpm: 12000, balance_grade: "G6.3", use_case: "heavy" },
  ER50: { type: "er_collet", size: 50, standard: "DIN 6499", capacity_range: [6.0, 34.0], max_rpm: 8000,  balance_grade: "G6.3", use_case: "very_heavy" },
};

export class ToolHolderDatabaseEngine {
  /** Get a specific holder by ID */
  get(id: string): ToolHolderSpec | null {
    // Try exact match first
    const spec = HOLDER_DB[id];
    if (spec) return { id, ...spec };
    // Try case-insensitive / normalized
    const normalized = id.toUpperCase().replace(/[_ ]/g, '-');
    for (const [key, val] of Object.entries(HOLDER_DB)) {
      if (key.toUpperCase().replace(/[_ ]/g, '-') === normalized) {
        return { id: key, ...val };
      }
    }
    return null;
  }

  /** Search holders by query string */
  search(query: string, limit = 20): ToolHolderSpec[] {
    const q = query.toLowerCase();
    const results: ToolHolderSpec[] = [];
    for (const [id, spec] of Object.entries(HOLDER_DB)) {
      const searchable = `${id} ${spec.type} ${spec.standard} ${spec.use_case} ${spec.form ?? ''} ${spec.application ?? ''}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ id, ...spec });
        if (results.length >= limit) break;
      }
    }
    return results;
  }

  /** List all holders of a specific type */
  listByType(type: string): ToolHolderSpec[] {
    const t = type.toLowerCase();
    return Object.entries(HOLDER_DB)
      .filter(([, spec]) => spec.type.toLowerCase().includes(t) || (spec.form ?? '').toLowerCase() === t)
      .map(([id, spec]) => ({ id, ...spec }));
  }

  /** Find holders compatible with a given RPM */
  findByRpm(rpm: number): ToolHolderSpec[] {
    return Object.entries(HOLDER_DB)
      .filter(([, spec]) => spec.max_rpm >= rpm)
      .map(([id, spec]) => ({ id, ...spec }))
      .sort((a, b) => a.max_rpm - b.max_rpm);
  }

  /** Recommend holder for given application */
  recommend(params: { machine_type?: string; rpm?: number; application?: string; torque_nm?: number }): ToolHolderSpec[] {
    return Object.entries(HOLDER_DB)
      .filter(([, spec]) => {
        if (params.rpm && spec.max_rpm < params.rpm) return false;
        if (params.torque_nm && (spec.torque ?? spec.torque_nm ?? Infinity) < params.torque_nm) return false;
        if (params.application) {
          const app = params.application.toLowerCase();
          const match = `${spec.use_case} ${spec.application ?? ''} ${spec.type}`.toLowerCase();
          if (!match.includes(app)) return false;
        }
        if (params.machine_type) {
          const mt = params.machine_type.toLowerCase();
          if (mt.includes('lathe') || mt.includes('turn')) {
            if (!['vdi', 'bmt', 'capto', 'hsk'].some(t => spec.type.includes(t)) && !spec.driven_tool) return false;
          }
        }
        return true;
      })
      .map(([id, spec]) => ({ id, ...spec }))
      .sort((a, b) => a.max_rpm - b.max_rpm);
  }

  /** Get all unique holder types */
  getTypes(): string[] {
    return [...new Set(Object.values(HOLDER_DB).map(s => s.type))].sort();
  }

  /** Get all unique standards */
  getStandards(): string[] {
    return [...new Set(Object.values(HOLDER_DB).map(s => s.standard))].sort();
  }

  /** Get summary statistics */
  stats(): { total: number; types: number; standards: number; max_rpm: number } {
    const specs = Object.values(HOLDER_DB);
    return {
      total: specs.length,
      types: new Set(specs.map(s => s.type)).size,
      standards: new Set(specs.map(s => s.standard)).size,
      max_rpm: Math.max(...specs.map(s => s.max_rpm)),
    };
  }
}

export const toolHolderDatabaseEngine = new ToolHolderDatabaseEngine();
