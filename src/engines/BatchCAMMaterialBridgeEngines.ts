// @ts-nocheck
/**
 * BatchCAMMaterialBridgeEngines — 4 CAM Material Bridge Engines in One File
 *
 * Maps material libraries from Mastercam, SolidCAM, NX, and PowerMill into
 * PRISM's ISO material taxonomy (P/M/K/N/S/H) with machinability correction
 * factors and per-strategy speed/feed multipliers.
 *
 * @engine BatchCAMMaterialBridgeEngines
 * @shortcode E1116
 * @dispatcher camDispatcher
 * @actions
 *   mastercam_material_lookup, mastercam_material_search,
 *   solidcam_material_lookup, solidcam_material_search,
 *   nx_material_lookup, nx_material_search,
 *   powermill_material_lookup, powermill_material_search
 * @milestone CAMX-MS7/U01
 */

// ─── ISO Material Groups ───────────────────────────────────────────────────────

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ─── Shared Result Type ────────────────────────────────────────────────────────

export interface MaterialBridgeResult {
  /** Canonical ISO group (P/M/K/N/S/H) */
  iso_group: ISOGroup;
  /** Vc range in m/min */
  vc_range: [number, number];
  /** fz range in mm/tooth */
  fz_range: [number, number];
  /** Relative machinability index (1.0 = reference steel) */
  machinability_index: number;
  /** CAM-system-specific parameters */
  cam_specific_params: Record<string, unknown>;
  /** Per-strategy speed/feed multipliers */
  strategy_multipliers: Record<string, { vc_mult: number; fz_mult: number }>;
  /** Canonical name used internally */
  canonical_name: string;
  /** Human-readable description */
  description: string;
}

// ─── Base Class ────────────────────────────────────────────────────────────────

abstract class CAMMaterialBridgeBase {
  readonly camSystem: string;
  protected abstract readonly db: Record<string, MaterialBridgeResult>;
  /** All alias → canonical_name mappings for fuzzy search */
  protected abstract readonly aliases: Record<string, string>;

  constructor(camSystem: string) {
    this.camSystem = camSystem;
  }

  /** Exact or ISO lookup. Pass material name from CAM UI or ISO group like "P". */
  lookup(material_name_or_iso: string): MaterialBridgeResult | { error: string } {
    const key = material_name_or_iso.trim();
    // Direct hit
    if (this.db[key]) return this.db[key];
    // Alias lookup
    const canonical = this.aliases[key.toLowerCase()];
    if (canonical && this.db[canonical]) return this.db[canonical];
    // ISO group fallback — return first match
    const isoUpper = key.toUpperCase() as ISOGroup;
    const byISO = Object.values(this.db).find(r => r.iso_group === isoUpper);
    if (byISO) return byISO;
    return {
      error: `Material "${material_name_or_iso}" not found in ${this.camSystem} database. Use search() to find available materials.`,
    };
  }

  /** Fuzzy search — returns up to 5 closest matches */
  search(query: string): { matches: Array<{ name: string; iso_group: ISOGroup; machinability_index: number; description: string }> } {
    const q = query.toLowerCase();
    const matches = Object.entries(this.db)
      .map(([name, r]) => {
        let score = 0;
        if (name.toLowerCase().includes(q)) score += 10;
        if (r.description.toLowerCase().includes(q)) score += 5;
        if (r.iso_group.toLowerCase() === q) score += 15;
        // Check aliases
        for (const [alias, canonical] of Object.entries(this.aliases)) {
          if (canonical === name && alias.includes(q)) { score += 8; break; }
        }
        return { name, iso_group: r.iso_group, machinability_index: r.machinability_index, description: r.description, score };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ score: _s, ...rest }) => rest);
    return { matches };
  }

  /** Map a CAM-system material name to its ISO group */
  mapToISO(cam_material_name: string): ISOGroup | null {
    const res = this.lookup(cam_material_name);
    if ("error" in res) return null;
    return res.iso_group;
  }

  /** Return per-strategy multipliers for a given material and CAM strategy name */
  getStrategyMultipliers(
    material: string,
    strategy: string,
  ): { vc_mult: number; fz_mult: number } | { error: string } {
    const res = this.lookup(material);
    if ("error" in res) return res;
    const mults = res.strategy_multipliers[strategy];
    if (mults) return mults;
    // Fallback to iso_group-level defaults
    const defaults: Record<ISOGroup, { vc_mult: number; fz_mult: number }> = {
      P: { vc_mult: 1.0, fz_mult: 1.0 },
      M: { vc_mult: 0.85, fz_mult: 0.90 },
      K: { vc_mult: 1.10, fz_mult: 1.05 },
      N: { vc_mult: 1.40, fz_mult: 1.20 },
      S: { vc_mult: 0.55, fz_mult: 0.70 },
      H: { vc_mult: 0.40, fz_mult: 0.60 },
    };
    return defaults[res.iso_group] ?? { vc_mult: 1.0, fz_mult: 1.0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MastercamMaterialBridgeEngine
// ═══════════════════════════════════════════════════════════════════════════════

class MastercamMaterialBridgeEngine extends CAMMaterialBridgeBase {
  constructor() { super("Mastercam"); }

  protected readonly db: Record<string, MaterialBridgeResult> = {
    "Low Carbon Steel": {
      iso_group: "P",
      vc_range: [150, 280],
      fz_range: [0.06, 0.18],
      machinability_index: 1.0,
      canonical_name: "Low Carbon Steel",
      description: "AISI 1008-1025, free-machining grades, Mastercam Material Group 1",
      cam_specific_params: {
        mastercam_group_id: 1,
        dynamic_motion_multiplier: 1.15,
        optirough_multiplier: 1.10,
        default_coolant: "flood",
        chip_breaker: false,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.15, fz_mult: 1.10 },
        OptiRough:        { vc_mult: 1.10, fz_mult: 1.05 },
        Waterline:        { vc_mult: 0.95, fz_mult: 1.00 },
        Raster:           { vc_mult: 1.00, fz_mult: 1.00 },
        Contour:          { vc_mult: 1.05, fz_mult: 1.00 },
        "2D_HST_Peeling": { vc_mult: 1.12, fz_mult: 1.08 },
      },
    },
    "Medium Carbon Steel": {
      iso_group: "P",
      vc_range: [120, 220],
      fz_range: [0.05, 0.15],
      machinability_index: 0.85,
      canonical_name: "Medium Carbon Steel",
      description: "AISI 1030-1050, normalized/annealed, Mastercam Material Group 2",
      cam_specific_params: {
        mastercam_group_id: 2,
        dynamic_motion_multiplier: 1.10,
        optirough_multiplier: 1.05,
        default_coolant: "flood",
        chip_breaker: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.10, fz_mult: 1.05 },
        OptiRough:        { vc_mult: 1.05, fz_mult: 1.00 },
        Waterline:        { vc_mult: 0.90, fz_mult: 0.95 },
        Raster:           { vc_mult: 0.95, fz_mult: 1.00 },
        Contour:          { vc_mult: 1.00, fz_mult: 0.95 },
        "2D_HST_Peeling": { vc_mult: 1.08, fz_mult: 1.02 },
      },
    },
    "High Carbon Steel": {
      iso_group: "P",
      vc_range: [80, 160],
      fz_range: [0.04, 0.12],
      machinability_index: 0.70,
      canonical_name: "High Carbon Steel",
      description: "AISI 1060-1095, Mastercam Material Group 3",
      cam_specific_params: {
        mastercam_group_id: 3,
        dynamic_motion_multiplier: 0.95,
        optirough_multiplier: 0.90,
        default_coolant: "flood",
        chip_breaker: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.95, fz_mult: 0.90 },
        OptiRough:        { vc_mult: 0.90, fz_mult: 0.85 },
        Waterline:        { vc_mult: 0.80, fz_mult: 0.88 },
        Raster:           { vc_mult: 0.85, fz_mult: 0.90 },
        Contour:          { vc_mult: 0.88, fz_mult: 0.90 },
        "2D_HST_Peeling": { vc_mult: 0.92, fz_mult: 0.88 },
      },
    },
    "Tool Steel": {
      iso_group: "H",
      vc_range: [60, 140],
      fz_range: [0.03, 0.10],
      machinability_index: 0.55,
      canonical_name: "Tool Steel",
      description: "D2, H13, M2, P20 — prehardened or fully hardened, Mastercam Material Group 4",
      cam_specific_params: {
        mastercam_group_id: 4,
        dynamic_motion_multiplier: 0.85,
        optirough_multiplier: 0.80,
        default_coolant: "air_blast",
        chip_breaker: false,
        high_feed_capable: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.85, fz_mult: 0.80 },
        OptiRough:        { vc_mult: 0.80, fz_mult: 0.75 },
        Waterline:        { vc_mult: 0.70, fz_mult: 0.75 },
        Raster:           { vc_mult: 0.75, fz_mult: 0.80 },
        Contour:          { vc_mult: 0.78, fz_mult: 0.80 },
        High_Feed:        { vc_mult: 1.10, fz_mult: 0.40 },
      },
    },
    "Stainless Steel": {
      iso_group: "M",
      vc_range: [80, 180],
      fz_range: [0.04, 0.12],
      machinability_index: 0.65,
      canonical_name: "Stainless Steel",
      description: "300/400 series SS, Mastercam Material Group 5",
      cam_specific_params: {
        mastercam_group_id: 5,
        dynamic_motion_multiplier: 0.90,
        optirough_multiplier: 0.88,
        default_coolant: "flood_high_pressure",
        chip_breaker: true,
        work_hardening_sensitive: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.90, fz_mult: 0.88 },
        OptiRough:        { vc_mult: 0.88, fz_mult: 0.85 },
        Waterline:        { vc_mult: 0.80, fz_mult: 0.85 },
        Raster:           { vc_mult: 0.85, fz_mult: 0.90 },
        Contour:          { vc_mult: 0.85, fz_mult: 0.88 },
        "2D_HST_Peeling": { vc_mult: 0.88, fz_mult: 0.85 },
      },
    },
    "Cast Iron": {
      iso_group: "K",
      vc_range: [100, 250],
      fz_range: [0.08, 0.22],
      machinability_index: 0.90,
      canonical_name: "Cast Iron",
      description: "Gray/ductile/malleable cast iron, Mastercam Material Group 6",
      cam_specific_params: {
        mastercam_group_id: 6,
        dynamic_motion_multiplier: 1.05,
        optirough_multiplier: 1.00,
        default_coolant: "dry_or_mist",
        chip_breaker: false,
        graphite_abrasive: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.05, fz_mult: 1.00 },
        OptiRough:        { vc_mult: 1.00, fz_mult: 1.05 },
        Waterline:        { vc_mult: 1.00, fz_mult: 1.05 },
        Raster:           { vc_mult: 1.05, fz_mult: 1.10 },
        Contour:          { vc_mult: 1.02, fz_mult: 1.05 },
        "2D_HST_Peeling": { vc_mult: 1.08, fz_mult: 1.05 },
      },
    },
    "Aluminum": {
      iso_group: "N",
      vc_range: [300, 1500],
      fz_range: [0.08, 0.35],
      machinability_index: 3.50,
      canonical_name: "Aluminum",
      description: "Al alloys 2xxx/6xxx/7xxx, Mastercam Material Group 7",
      cam_specific_params: {
        mastercam_group_id: 7,
        dynamic_motion_multiplier: 1.45,
        optirough_multiplier: 1.40,
        default_coolant: "flood_or_mist",
        chip_breaker: false,
        high_rpm_capable: true,
        builtup_edge_risk: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.45, fz_mult: 1.30 },
        OptiRough:        { vc_mult: 1.40, fz_mult: 1.25 },
        Waterline:        { vc_mult: 1.30, fz_mult: 1.20 },
        Raster:           { vc_mult: 1.35, fz_mult: 1.25 },
        Contour:          { vc_mult: 1.35, fz_mult: 1.20 },
        High_Speed:       { vc_mult: 1.60, fz_mult: 1.15 },
      },
    },
    "Copper Alloy": {
      iso_group: "N",
      vc_range: [200, 600],
      fz_range: [0.06, 0.20],
      machinability_index: 2.00,
      canonical_name: "Copper Alloy",
      description: "Brass, bronze, copper — Mastercam Material Group 8",
      cam_specific_params: {
        mastercam_group_id: 8,
        dynamic_motion_multiplier: 1.20,
        optirough_multiplier: 1.15,
        default_coolant: "flood",
        chip_breaker: false,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.20, fz_mult: 1.10 },
        OptiRough:        { vc_mult: 1.15, fz_mult: 1.08 },
        Waterline:        { vc_mult: 1.10, fz_mult: 1.05 },
        Raster:           { vc_mult: 1.12, fz_mult: 1.08 },
        Contour:          { vc_mult: 1.15, fz_mult: 1.08 },
      },
    },
    "Titanium": {
      iso_group: "S",
      vc_range: [40, 100],
      fz_range: [0.03, 0.08],
      machinability_index: 0.35,
      canonical_name: "Titanium",
      description: "Ti-6Al-4V, CP titanium, Mastercam Material Group 9",
      cam_specific_params: {
        mastercam_group_id: 9,
        dynamic_motion_multiplier: 0.60,
        optirough_multiplier: 0.55,
        default_coolant: "flood_high_pressure",
        chip_breaker: false,
        thermal_sensitive: true,
        max_radial_doc_pct: 10,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.60, fz_mult: 0.75 },
        OptiRough:        { vc_mult: 0.55, fz_mult: 0.70 },
        Waterline:        { vc_mult: 0.50, fz_mult: 0.65 },
        Raster:           { vc_mult: 0.52, fz_mult: 0.68 },
        Contour:          { vc_mult: 0.55, fz_mult: 0.70 },
        Trochoidal:       { vc_mult: 0.65, fz_mult: 0.65 },
      },
    },
    "Nickel Alloy": {
      iso_group: "S",
      vc_range: [20, 60],
      fz_range: [0.02, 0.07],
      machinability_index: 0.22,
      canonical_name: "Nickel Alloy",
      description: "Inconel 718, Waspaloy, Hastelloy — Mastercam Material Group 10",
      cam_specific_params: {
        mastercam_group_id: 10,
        dynamic_motion_multiplier: 0.45,
        optirough_multiplier: 0.40,
        default_coolant: "flood_high_pressure",
        chip_breaker: false,
        thermal_sensitive: true,
        work_hardening_severe: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.45, fz_mult: 0.65 },
        OptiRough:        { vc_mult: 0.40, fz_mult: 0.60 },
        Waterline:        { vc_mult: 0.38, fz_mult: 0.58 },
        Raster:           { vc_mult: 0.40, fz_mult: 0.62 },
        Contour:          { vc_mult: 0.42, fz_mult: 0.62 },
        Trochoidal:       { vc_mult: 0.50, fz_mult: 0.58 },
      },
    },
    "Cobalt Alloy": {
      iso_group: "S",
      vc_range: [25, 65],
      fz_range: [0.02, 0.06],
      machinability_index: 0.28,
      canonical_name: "Cobalt Alloy",
      description: "Stellite, CoCrMo — Mastercam Material Group 11",
      cam_specific_params: {
        mastercam_group_id: 11,
        dynamic_motion_multiplier: 0.50,
        optirough_multiplier: 0.45,
        default_coolant: "flood_high_pressure",
        chip_breaker: false,
        abrasive_wear_high: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 0.50, fz_mult: 0.65 },
        OptiRough:        { vc_mult: 0.45, fz_mult: 0.60 },
        Waterline:        { vc_mult: 0.42, fz_mult: 0.58 },
        Raster:           { vc_mult: 0.44, fz_mult: 0.60 },
        Contour:          { vc_mult: 0.46, fz_mult: 0.62 },
      },
    },
    "Plastics": {
      iso_group: "N",
      vc_range: [100, 400],
      fz_range: [0.04, 0.20],
      machinability_index: 1.80,
      canonical_name: "Plastics",
      description: "Acetal, nylon, PEEK, UHMWPE, ABS — Mastercam Material Group 12",
      cam_specific_params: {
        mastercam_group_id: 12,
        dynamic_motion_multiplier: 1.25,
        optirough_multiplier: 1.20,
        default_coolant: "dry_or_air",
        chip_breaker: false,
        heat_sensitive: true,
        sharp_edge_required: true,
      },
      strategy_multipliers: {
        Dynamic_Motion:   { vc_mult: 1.25, fz_mult: 1.15 },
        OptiRough:        { vc_mult: 1.20, fz_mult: 1.10 },
        Waterline:        { vc_mult: 1.10, fz_mult: 1.10 },
        Raster:           { vc_mult: 1.15, fz_mult: 1.12 },
        Contour:          { vc_mult: 1.18, fz_mult: 1.10 },
      },
    },
  };

  protected readonly aliases: Record<string, string> = {
    "low carbon": "Low Carbon Steel",
    "mild steel": "Low Carbon Steel",
    "1018": "Low Carbon Steel",
    "1020": "Low Carbon Steel",
    "medium carbon": "Medium Carbon Steel",
    "1040": "Medium Carbon Steel",
    "1045": "Medium Carbon Steel",
    "high carbon": "High Carbon Steel",
    "1080": "High Carbon Steel",
    "1095": "High Carbon Steel",
    "tool steel": "Tool Steel",
    "d2": "Tool Steel",
    "h13": "Tool Steel",
    "m2": "Tool Steel",
    "p20": "Tool Steel",
    "stainless": "Stainless Steel",
    "ss": "Stainless Steel",
    "304": "Stainless Steel",
    "316": "Stainless Steel",
    "cast iron": "Cast Iron",
    "gray iron": "Cast Iron",
    "ductile iron": "Cast Iron",
    "aluminum": "Aluminum",
    "aluminium": "Aluminum",
    "al": "Aluminum",
    "6061": "Aluminum",
    "7075": "Aluminum",
    "copper": "Copper Alloy",
    "brass": "Copper Alloy",
    "bronze": "Copper Alloy",
    "titanium": "Titanium",
    "ti-6al-4v": "Titanium",
    "grade 5 ti": "Titanium",
    "nickel": "Nickel Alloy",
    "inconel": "Nickel Alloy",
    "inconel 718": "Nickel Alloy",
    "waspaloy": "Nickel Alloy",
    "hastelloy": "Nickel Alloy",
    "cobalt": "Cobalt Alloy",
    "stellite": "Cobalt Alloy",
    "cocr": "Cobalt Alloy",
    "plastic": "Plastics",
    "peek": "Plastics",
    "nylon": "Plastics",
    "acetal": "Plastics",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SolidCAMMaterialBridgeEngine
// ═══════════════════════════════════════════════════════════════════════════════

class SolidCAMMaterialBridgeEngine extends CAMMaterialBridgeBase {
  constructor() { super("SolidCAM"); }

  protected readonly db: Record<string, MaterialBridgeResult> = {
    "Steel_Low_Alloy": {
      iso_group: "P",
      vc_range: [140, 260],
      fz_range: [0.05, 0.16],
      machinability_index: 1.0,
      canonical_name: "Steel_Low_Alloy",
      description: "iMachining TW Group: Low alloy steel, kc1_1=1800 N/mm², mc=0.26",
      cam_specific_params: {
        imachining_tw_group: "P1",
        kc1_1: 1800,
        mc: 0.26,
        tw_coefficient_a: 1.05,
        tw_coefficient_b: 0.92,
        imachining_speed_factor: 1.00,
        engagement_limit_deg: 60,
        technology_level_range: [3, 7],
        chip_thickness_min: 0.015,
        chip_thickness_max: 0.12,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 1.00, fz_mult: 1.00 },
        iMachining_3D:       { vc_mult: 0.95, fz_mult: 0.98 },
        HSS_Roughing:        { vc_mult: 0.90, fz_mult: 1.05 },
        Contour_3D:          { vc_mult: 0.88, fz_mult: 0.95 },
        Pocket:              { vc_mult: 0.85, fz_mult: 1.00 },
        Rest_Machining:      { vc_mult: 0.90, fz_mult: 0.92 },
      },
    },
    "Stainless_Austenitic": {
      iso_group: "M",
      vc_range: [70, 160],
      fz_range: [0.04, 0.11],
      machinability_index: 0.60,
      canonical_name: "Stainless_Austenitic",
      description: "iMachining TW Group: Austenitic SS (304/316), kc1_1=2100 N/mm², mc=0.25",
      cam_specific_params: {
        imachining_tw_group: "M1",
        kc1_1: 2100,
        mc: 0.25,
        tw_coefficient_a: 0.88,
        tw_coefficient_b: 0.82,
        imachining_speed_factor: 0.72,
        engagement_limit_deg: 45,
        technology_level_range: [2, 5],
        chip_thickness_min: 0.012,
        chip_thickness_max: 0.09,
        work_hardening_factor: 1.3,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 0.72, fz_mult: 0.88 },
        iMachining_3D:       { vc_mult: 0.68, fz_mult: 0.85 },
        HSS_Roughing:        { vc_mult: 0.65, fz_mult: 0.90 },
        Contour_3D:          { vc_mult: 0.70, fz_mult: 0.88 },
        Pocket:              { vc_mult: 0.68, fz_mult: 0.88 },
        Rest_Machining:      { vc_mult: 0.72, fz_mult: 0.85 },
      },
    },
    "Cast_Iron_Gray": {
      iso_group: "K",
      vc_range: [120, 280],
      fz_range: [0.07, 0.20],
      machinability_index: 0.95,
      canonical_name: "Cast_Iron_Gray",
      description: "iMachining TW Group: Gray cast iron, kc1_1=1100 N/mm², mc=0.28",
      cam_specific_params: {
        imachining_tw_group: "K1",
        kc1_1: 1100,
        mc: 0.28,
        tw_coefficient_a: 1.08,
        tw_coefficient_b: 1.02,
        imachining_speed_factor: 1.10,
        engagement_limit_deg: 65,
        technology_level_range: [4, 8],
        chip_thickness_min: 0.018,
        chip_thickness_max: 0.16,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 1.10, fz_mult: 1.08 },
        iMachining_3D:       { vc_mult: 1.05, fz_mult: 1.05 },
        HSS_Roughing:        { vc_mult: 1.00, fz_mult: 1.10 },
        Contour_3D:          { vc_mult: 1.02, fz_mult: 1.05 },
        Pocket:              { vc_mult: 1.05, fz_mult: 1.08 },
        Rest_Machining:      { vc_mult: 1.05, fz_mult: 1.05 },
      },
    },
    "Aluminum_Alloy": {
      iso_group: "N",
      vc_range: [400, 2000],
      fz_range: [0.08, 0.40],
      machinability_index: 4.00,
      canonical_name: "Aluminum_Alloy",
      description: "iMachining TW Group: Al alloys, kc1_1=700 N/mm², mc=0.23",
      cam_specific_params: {
        imachining_tw_group: "N1",
        kc1_1: 700,
        mc: 0.23,
        tw_coefficient_a: 1.55,
        tw_coefficient_b: 1.35,
        imachining_speed_factor: 2.10,
        engagement_limit_deg: 75,
        technology_level_range: [5, 10],
        chip_thickness_min: 0.025,
        chip_thickness_max: 0.28,
        builtup_edge_risk: true,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 2.10, fz_mult: 1.35 },
        iMachining_3D:       { vc_mult: 1.95, fz_mult: 1.28 },
        HSS_Roughing:        { vc_mult: 1.80, fz_mult: 1.30 },
        Contour_3D:          { vc_mult: 1.60, fz_mult: 1.20 },
        Pocket:              { vc_mult: 1.75, fz_mult: 1.28 },
        Rest_Machining:      { vc_mult: 1.70, fz_mult: 1.20 },
      },
    },
    "Titanium_Grade5": {
      iso_group: "S",
      vc_range: [35, 90],
      fz_range: [0.025, 0.07],
      machinability_index: 0.30,
      canonical_name: "Titanium_Grade5",
      description: "iMachining TW Group: Ti-6Al-4V, kc1_1=2800 N/mm², mc=0.25",
      cam_specific_params: {
        imachining_tw_group: "S1",
        kc1_1: 2800,
        mc: 0.25,
        tw_coefficient_a: 0.52,
        tw_coefficient_b: 0.58,
        imachining_speed_factor: 0.42,
        engagement_limit_deg: 30,
        technology_level_range: [1, 4],
        chip_thickness_min: 0.008,
        chip_thickness_max: 0.05,
        thermal_sensitive: true,
        max_technology_level: 5,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 0.42, fz_mult: 0.65 },
        iMachining_3D:       { vc_mult: 0.40, fz_mult: 0.62 },
        HSS_Roughing:        { vc_mult: 0.38, fz_mult: 0.60 },
        Contour_3D:          { vc_mult: 0.45, fz_mult: 0.68 },
        Pocket:              { vc_mult: 0.40, fz_mult: 0.65 },
        Rest_Machining:      { vc_mult: 0.45, fz_mult: 0.65 },
      },
    },
    "Inconel_718": {
      iso_group: "S",
      vc_range: [18, 55],
      fz_range: [0.015, 0.06],
      machinability_index: 0.18,
      canonical_name: "Inconel_718",
      description: "iMachining TW Group: Ni superalloy, kc1_1=2800 N/mm², mc=0.25",
      cam_specific_params: {
        imachining_tw_group: "S2",
        kc1_1: 2800,
        mc: 0.25,
        tw_coefficient_a: 0.35,
        tw_coefficient_b: 0.42,
        imachining_speed_factor: 0.28,
        engagement_limit_deg: 22,
        technology_level_range: [1, 3],
        chip_thickness_min: 0.005,
        chip_thickness_max: 0.038,
        work_hardening_severe: true,
        max_technology_level: 4,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 0.28, fz_mult: 0.55 },
        iMachining_3D:       { vc_mult: 0.26, fz_mult: 0.52 },
        HSS_Roughing:        { vc_mult: 0.25, fz_mult: 0.50 },
        Contour_3D:          { vc_mult: 0.30, fz_mult: 0.58 },
        Pocket:              { vc_mult: 0.28, fz_mult: 0.55 },
        Rest_Machining:      { vc_mult: 0.30, fz_mult: 0.55 },
      },
    },
    "Hardened_Steel": {
      iso_group: "H",
      vc_range: [50, 130],
      fz_range: [0.02, 0.08],
      machinability_index: 0.48,
      canonical_name: "Hardened_Steel",
      description: "iMachining TW Group: Hardened 45-65 HRC, kc1_1=4000 N/mm², mc=0.22",
      cam_specific_params: {
        imachining_tw_group: "H1",
        kc1_1: 4000,
        mc: 0.22,
        tw_coefficient_a: 0.62,
        tw_coefficient_b: 0.55,
        imachining_speed_factor: 0.55,
        engagement_limit_deg: 35,
        technology_level_range: [1, 4],
        chip_thickness_min: 0.006,
        chip_thickness_max: 0.055,
        high_feed_preferred: true,
      },
      strategy_multipliers: {
        iMachining_2D:       { vc_mult: 0.55, fz_mult: 0.60 },
        iMachining_3D:       { vc_mult: 0.52, fz_mult: 0.58 },
        HSS_Roughing:        { vc_mult: 0.50, fz_mult: 0.55 },
        Contour_3D:          { vc_mult: 0.58, fz_mult: 0.62 },
        Pocket:              { vc_mult: 0.52, fz_mult: 0.60 },
        High_Feed_Mill:      { vc_mult: 1.05, fz_mult: 0.35 },
      },
    },
  };

  protected readonly aliases: Record<string, string> = {
    "steel low alloy": "Steel_Low_Alloy",
    "low alloy": "Steel_Low_Alloy",
    "p1": "Steel_Low_Alloy",
    "stainless austenitic": "Stainless_Austenitic",
    "austenitic": "Stainless_Austenitic",
    "304": "Stainless_Austenitic",
    "316": "Stainless_Austenitic",
    "m1": "Stainless_Austenitic",
    "cast iron gray": "Cast_Iron_Gray",
    "gray iron": "Cast_Iron_Gray",
    "k1": "Cast_Iron_Gray",
    "aluminum alloy": "Aluminum_Alloy",
    "aluminium": "Aluminum_Alloy",
    "al": "Aluminum_Alloy",
    "n1": "Aluminum_Alloy",
    "titanium grade5": "Titanium_Grade5",
    "ti-6al-4v": "Titanium_Grade5",
    "ti64": "Titanium_Grade5",
    "s1": "Titanium_Grade5",
    "inconel 718": "Inconel_718",
    "nickel superalloy": "Inconel_718",
    "in718": "Inconel_718",
    "s2": "Inconel_718",
    "hardened steel": "Hardened_Steel",
    "h13": "Hardened_Steel",
    "d2 hardened": "Hardened_Steel",
    "h1": "Hardened_Steel",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NXCAMMaterialBridgeEngine
// ═══════════════════════════════════════════════════════════════════════════════

class NXCAMMaterialBridgeEngine extends CAMMaterialBridgeBase {
  constructor() { super("NX CAM"); }

  protected readonly db: Record<string, MaterialBridgeResult> = {
    "MTRL_STEEL_CARBON_LOW": {
      iso_group: "P",
      vc_range: [160, 300],
      fz_range: [0.06, 0.18],
      machinability_index: 1.0,
      canonical_name: "MTRL_STEEL_CARBON_LOW",
      description: "NX MRL: Low carbon steel (AISI 1018-1025), NX Machining Data Library code MTRL_STEEL_CARBON_LOW",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_STEEL_CARBON_LOW",
        nx_material_class: "STEEL",
        nx_hardness_hb: 150,
        adaptive_milling_engagement: 0.08,
        adaptive_milling_step_down_pct: 80,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 160, carbide_coated: 200, cermet: 220, cbn: 280 },
        feed_table: { rough: 0.14, semi: 0.10, finish: 0.06 },
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 1.15, fz_mult: 1.10 },
        Cavity_Mill:         { vc_mult: 1.00, fz_mult: 1.00 },
        Contour:             { vc_mult: 1.00, fz_mult: 0.95 },
        Fixed_Axis_Surface:  { vc_mult: 0.95, fz_mult: 0.90 },
        Variable_Axis:       { vc_mult: 0.90, fz_mult: 0.88 },
        High_Speed_Milling:  { vc_mult: 1.20, fz_mult: 1.05 },
        Plunge_Milling:      { vc_mult: 0.80, fz_mult: 1.80 },
      },
    },
    "MTRL_STEEL_STAINLESS_300": {
      iso_group: "M",
      vc_range: [75, 170],
      fz_range: [0.04, 0.12],
      machinability_index: 0.62,
      canonical_name: "MTRL_STEEL_STAINLESS_300",
      description: "NX MRL: 300-series austenitic SS, code MTRL_STEEL_STAINLESS_300",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_STEEL_STAINLESS_300",
        nx_material_class: "STAINLESS",
        nx_hardness_hb: 200,
        adaptive_milling_engagement: 0.06,
        adaptive_milling_step_down_pct: 60,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 80, carbide_coated: 130, cermet: 145, cbn: 170 },
        feed_table: { rough: 0.10, semi: 0.07, finish: 0.04 },
        work_hardening_class: "moderate",
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 0.88, fz_mult: 0.88 },
        Cavity_Mill:         { vc_mult: 0.80, fz_mult: 0.85 },
        Contour:             { vc_mult: 0.82, fz_mult: 0.85 },
        Fixed_Axis_Surface:  { vc_mult: 0.80, fz_mult: 0.82 },
        Variable_Axis:       { vc_mult: 0.78, fz_mult: 0.80 },
        High_Speed_Milling:  { vc_mult: 0.85, fz_mult: 0.88 },
        Plunge_Milling:      { vc_mult: 0.70, fz_mult: 1.60 },
      },
    },
    "MTRL_CAST_IRON_GRAY": {
      iso_group: "K",
      vc_range: [110, 260],
      fz_range: [0.08, 0.22],
      machinability_index: 0.88,
      canonical_name: "MTRL_CAST_IRON_GRAY",
      description: "NX MRL: Gray cast iron, code MTRL_CAST_IRON_GRAY",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_CAST_IRON_GRAY",
        nx_material_class: "CAST_IRON",
        nx_hardness_hb: 220,
        adaptive_milling_engagement: 0.10,
        adaptive_milling_step_down_pct: 75,
        ipw_tracking: "partial",
        speed_table: { carbide_uncoated: 120, carbide_coated: 180, cermet: 220, cbn: 260 },
        feed_table: { rough: 0.18, semi: 0.13, finish: 0.08 },
        graphite_abrasive: true,
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 1.05, fz_mult: 1.08 },
        Cavity_Mill:         { vc_mult: 1.05, fz_mult: 1.10 },
        Contour:             { vc_mult: 1.02, fz_mult: 1.05 },
        Fixed_Axis_Surface:  { vc_mult: 1.00, fz_mult: 1.05 },
        Variable_Axis:       { vc_mult: 0.98, fz_mult: 1.02 },
        High_Speed_Milling:  { vc_mult: 1.10, fz_mult: 1.05 },
        Plunge_Milling:      { vc_mult: 0.90, fz_mult: 1.90 },
      },
    },
    "MTRL_ALUM_ALLOY_6061": {
      iso_group: "N",
      vc_range: [350, 1800],
      fz_range: [0.08, 0.38],
      machinability_index: 3.80,
      canonical_name: "MTRL_ALUM_ALLOY_6061",
      description: "NX MRL: Aluminum 6061-T6, code MTRL_ALUM_ALLOY_6061",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_ALUM_ALLOY_6061",
        nx_material_class: "ALUMINUM",
        nx_hardness_hb: 95,
        adaptive_milling_engagement: 0.15,
        adaptive_milling_step_down_pct: 95,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 400, carbide_coated: 700, cermet: 600, cbn: 1800 },
        feed_table: { rough: 0.30, semi: 0.20, finish: 0.10 },
        high_speed_spindle_preferred: true,
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 1.60, fz_mult: 1.35 },
        Cavity_Mill:         { vc_mult: 1.40, fz_mult: 1.25 },
        Contour:             { vc_mult: 1.35, fz_mult: 1.20 },
        Fixed_Axis_Surface:  { vc_mult: 1.30, fz_mult: 1.15 },
        Variable_Axis:       { vc_mult: 1.25, fz_mult: 1.12 },
        High_Speed_Milling:  { vc_mult: 1.80, fz_mult: 1.20 },
        Plunge_Milling:      { vc_mult: 1.20, fz_mult: 2.20 },
      },
    },
    "MTRL_TITANIUM_TI6AL4V": {
      iso_group: "S",
      vc_range: [38, 95],
      fz_range: [0.025, 0.075],
      machinability_index: 0.32,
      canonical_name: "MTRL_TITANIUM_TI6AL4V",
      description: "NX MRL: Ti-6Al-4V Grade 5, code MTRL_TITANIUM_TI6AL4V",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_TITANIUM_TI6AL4V",
        nx_material_class: "TITANIUM",
        nx_hardness_hb: 330,
        adaptive_milling_engagement: 0.05,
        adaptive_milling_step_down_pct: 40,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 40, carbide_coated: 70, cermet: 60, cbn: 95 },
        feed_table: { rough: 0.065, semi: 0.045, finish: 0.025 },
        thermal_management: "high_pressure_coolant",
        max_chip_temp_c: 550,
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 0.55, fz_mult: 0.72 },
        Cavity_Mill:         { vc_mult: 0.48, fz_mult: 0.68 },
        Contour:             { vc_mult: 0.52, fz_mult: 0.70 },
        Fixed_Axis_Surface:  { vc_mult: 0.50, fz_mult: 0.68 },
        Variable_Axis:       { vc_mult: 0.48, fz_mult: 0.65 },
        High_Speed_Milling:  { vc_mult: 0.58, fz_mult: 0.65 },
        Plunge_Milling:      { vc_mult: 0.40, fz_mult: 1.40 },
      },
    },
    "MTRL_NICKEL_INCONEL718": {
      iso_group: "S",
      vc_range: [16, 52],
      fz_range: [0.012, 0.055],
      machinability_index: 0.19,
      canonical_name: "MTRL_NICKEL_INCONEL718",
      description: "NX MRL: Inconel 718 Ni superalloy, code MTRL_NICKEL_INCONEL718",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_NICKEL_INCONEL718",
        nx_material_class: "SUPERALLOY",
        nx_hardness_hb: 380,
        adaptive_milling_engagement: 0.03,
        adaptive_milling_step_down_pct: 25,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 18, carbide_coated: 35, cermet: 40, cbn: 52 },
        feed_table: { rough: 0.05, semi: 0.03, finish: 0.015 },
        thermal_management: "high_pressure_coolant",
        work_hardening_class: "severe",
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 0.38, fz_mult: 0.60 },
        Cavity_Mill:         { vc_mult: 0.32, fz_mult: 0.58 },
        Contour:             { vc_mult: 0.35, fz_mult: 0.60 },
        Fixed_Axis_Surface:  { vc_mult: 0.33, fz_mult: 0.58 },
        Variable_Axis:       { vc_mult: 0.32, fz_mult: 0.55 },
        High_Speed_Milling:  { vc_mult: 0.40, fz_mult: 0.55 },
        Plunge_Milling:      { vc_mult: 0.28, fz_mult: 1.20 },
      },
    },
    "MTRL_STEEL_HARDENED_55HRC": {
      iso_group: "H",
      vc_range: [55, 145],
      fz_range: [0.018, 0.08],
      machinability_index: 0.50,
      canonical_name: "MTRL_STEEL_HARDENED_55HRC",
      description: "NX MRL: Hardened steel 50-60 HRC, code MTRL_STEEL_HARDENED_55HRC",
      cam_specific_params: {
        nx_mtrl_code: "MTRL_STEEL_HARDENED_55HRC",
        nx_material_class: "HARDENED_STEEL",
        nx_hardness_hrc: 55,
        adaptive_milling_engagement: 0.04,
        adaptive_milling_step_down_pct: 30,
        ipw_tracking: "full",
        speed_table: { carbide_uncoated: 55, carbide_coated: 100, cermet: 115, cbn: 145 },
        feed_table: { rough: 0.07, semi: 0.04, finish: 0.02 },
        high_feed_mill_preferred: true,
      },
      strategy_multipliers: {
        Adaptive_Milling:    { vc_mult: 0.60, fz_mult: 0.65 },
        Cavity_Mill:         { vc_mult: 0.55, fz_mult: 0.62 },
        Contour:             { vc_mult: 0.58, fz_mult: 0.65 },
        Fixed_Axis_Surface:  { vc_mult: 0.55, fz_mult: 0.62 },
        Variable_Axis:       { vc_mult: 0.52, fz_mult: 0.60 },
        High_Speed_Milling:  { vc_mult: 0.62, fz_mult: 0.60 },
        Plunge_Milling:      { vc_mult: 0.45, fz_mult: 1.30 },
      },
    },
  };

  protected readonly aliases: Record<string, string> = {
    "mtrl_steel_carbon_low": "MTRL_STEEL_CARBON_LOW",
    "steel carbon low": "MTRL_STEEL_CARBON_LOW",
    "low carbon steel": "MTRL_STEEL_CARBON_LOW",
    "mtrl_steel_stainless_300": "MTRL_STEEL_STAINLESS_300",
    "stainless 300": "MTRL_STEEL_STAINLESS_300",
    "304 ss": "MTRL_STEEL_STAINLESS_300",
    "316 ss": "MTRL_STEEL_STAINLESS_300",
    "mtrl_cast_iron_gray": "MTRL_CAST_IRON_GRAY",
    "gray iron": "MTRL_CAST_IRON_GRAY",
    "cast iron": "MTRL_CAST_IRON_GRAY",
    "mtrl_alum_alloy_6061": "MTRL_ALUM_ALLOY_6061",
    "aluminum 6061": "MTRL_ALUM_ALLOY_6061",
    "al 6061": "MTRL_ALUM_ALLOY_6061",
    "6061": "MTRL_ALUM_ALLOY_6061",
    "mtrl_titanium_ti6al4v": "MTRL_TITANIUM_TI6AL4V",
    "titanium": "MTRL_TITANIUM_TI6AL4V",
    "ti-6al-4v": "MTRL_TITANIUM_TI6AL4V",
    "ti64": "MTRL_TITANIUM_TI6AL4V",
    "mtrl_nickel_inconel718": "MTRL_NICKEL_INCONEL718",
    "inconel 718": "MTRL_NICKEL_INCONEL718",
    "inconel": "MTRL_NICKEL_INCONEL718",
    "in718": "MTRL_NICKEL_INCONEL718",
    "mtrl_steel_hardened_55hrc": "MTRL_STEEL_HARDENED_55HRC",
    "hardened steel": "MTRL_STEEL_HARDENED_55HRC",
    "55 hrc": "MTRL_STEEL_HARDENED_55HRC",
    "h13 hardened": "MTRL_STEEL_HARDENED_55HRC",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PowerMillMaterialBridgeEngine
// ═══════════════════════════════════════════════════════════════════════════════

class PowerMillMaterialBridgeEngine extends CAMMaterialBridgeBase {
  constructor() { super("PowerMill"); }

  protected readonly db: Record<string, MaterialBridgeResult> = {
    "PM_Steel_General": {
      iso_group: "P",
      vc_range: [145, 270],
      fz_range: [0.05, 0.17],
      machinability_index: 1.0,
      canonical_name: "PM_Steel_General",
      description: "PowerMill: General steel — carbon/alloy steels up to 35 HRC",
      cam_specific_params: {
        pm_material_group: "Steel",
        vortex_speed_multiplier: 1.12,
        vortex_engagement_limit_deg: 58,
        vortex_thermal_limit_c: 820,
        vortex_stepdown_pct: 75,
        burnishing_risk: "low",
        recommended_coolant: "flood",
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 1.12, fz_mult: 1.08 },
        Adaptive_Clearing:   { vc_mult: 1.05, fz_mult: 1.05 },
        Raster_Finishing:    { vc_mult: 0.95, fz_mult: 0.95 },
        Spiral_Finishing:    { vc_mult: 0.98, fz_mult: 0.95 },
        Steep_Shallow:       { vc_mult: 0.92, fz_mult: 0.90 },
        Corner_Finishing:    { vc_mult: 0.88, fz_mult: 0.90 },
        Plunge_Milling:      { vc_mult: 0.80, fz_mult: 1.75 },
      },
    },
    "PM_Stainless_Steel": {
      iso_group: "M",
      vc_range: [72, 162],
      fz_range: [0.038, 0.11],
      machinability_index: 0.62,
      canonical_name: "PM_Stainless_Steel",
      description: "PowerMill: Stainless steel — 300/400 series, duplex",
      cam_specific_params: {
        pm_material_group: "Stainless",
        vortex_speed_multiplier: 0.88,
        vortex_engagement_limit_deg: 42,
        vortex_thermal_limit_c: 650,
        vortex_stepdown_pct: 55,
        burnishing_risk: "moderate",
        recommended_coolant: "flood_high_pressure",
        work_hardening_aware: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 0.88, fz_mult: 0.88 },
        Adaptive_Clearing:   { vc_mult: 0.82, fz_mult: 0.85 },
        Raster_Finishing:    { vc_mult: 0.78, fz_mult: 0.82 },
        Spiral_Finishing:    { vc_mult: 0.80, fz_mult: 0.84 },
        Steep_Shallow:       { vc_mult: 0.78, fz_mult: 0.82 },
        Corner_Finishing:    { vc_mult: 0.75, fz_mult: 0.80 },
        Plunge_Milling:      { vc_mult: 0.68, fz_mult: 1.55 },
      },
    },
    "PM_Cast_Iron": {
      iso_group: "K",
      vc_range: [115, 265],
      fz_range: [0.075, 0.22],
      machinability_index: 0.90,
      canonical_name: "PM_Cast_Iron",
      description: "PowerMill: Cast iron — gray, ductile, CGI",
      cam_specific_params: {
        pm_material_group: "CastIron",
        vortex_speed_multiplier: 1.08,
        vortex_engagement_limit_deg: 62,
        vortex_thermal_limit_c: 780,
        vortex_stepdown_pct: 78,
        burnishing_risk: "low",
        recommended_coolant: "dry_or_mist",
        graphite_abrasive: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 1.08, fz_mult: 1.10 },
        Adaptive_Clearing:   { vc_mult: 1.02, fz_mult: 1.08 },
        Raster_Finishing:    { vc_mult: 1.00, fz_mult: 1.05 },
        Spiral_Finishing:    { vc_mult: 1.02, fz_mult: 1.05 },
        Steep_Shallow:       { vc_mult: 0.98, fz_mult: 1.02 },
        Corner_Finishing:    { vc_mult: 0.96, fz_mult: 1.02 },
        Plunge_Milling:      { vc_mult: 0.88, fz_mult: 1.88 },
      },
    },
    "PM_Aluminum": {
      iso_group: "N",
      vc_range: [350, 2000],
      fz_range: [0.09, 0.40],
      machinability_index: 3.90,
      canonical_name: "PM_Aluminum",
      description: "PowerMill: Aluminum alloys — 2xxx/6xxx/7xxx series",
      cam_specific_params: {
        pm_material_group: "Aluminum",
        vortex_speed_multiplier: 1.65,
        vortex_engagement_limit_deg: 78,
        vortex_thermal_limit_c: 420,
        vortex_stepdown_pct: 95,
        burnishing_risk: "high",
        recommended_coolant: "flood_or_mist",
        builtup_edge_risk: true,
        high_rpm_spindle_required: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 1.65, fz_mult: 1.40 },
        Adaptive_Clearing:   { vc_mult: 1.50, fz_mult: 1.30 },
        Raster_Finishing:    { vc_mult: 1.35, fz_mult: 1.20 },
        Spiral_Finishing:    { vc_mult: 1.38, fz_mult: 1.22 },
        Steep_Shallow:       { vc_mult: 1.30, fz_mult: 1.18 },
        Corner_Finishing:    { vc_mult: 1.28, fz_mult: 1.15 },
        Plunge_Milling:      { vc_mult: 1.20, fz_mult: 2.20 },
      },
    },
    "PM_Titanium": {
      iso_group: "S",
      vc_range: [35, 92],
      fz_range: [0.022, 0.072],
      machinability_index: 0.31,
      canonical_name: "PM_Titanium",
      description: "PowerMill: Titanium alloys — Ti-6Al-4V, CP Ti",
      cam_specific_params: {
        pm_material_group: "Titanium",
        vortex_speed_multiplier: 0.52,
        vortex_engagement_limit_deg: 28,
        vortex_thermal_limit_c: 480,
        vortex_stepdown_pct: 38,
        burnishing_risk: "low",
        recommended_coolant: "high_pressure_through_tool",
        thermal_sensitive: true,
        min_engagement_for_chip_cooling: 15,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 0.52, fz_mult: 0.72 },
        Adaptive_Clearing:   { vc_mult: 0.48, fz_mult: 0.68 },
        Raster_Finishing:    { vc_mult: 0.50, fz_mult: 0.70 },
        Spiral_Finishing:    { vc_mult: 0.52, fz_mult: 0.70 },
        Steep_Shallow:       { vc_mult: 0.48, fz_mult: 0.68 },
        Corner_Finishing:    { vc_mult: 0.46, fz_mult: 0.65 },
        Plunge_Milling:      { vc_mult: 0.40, fz_mult: 1.38 },
      },
    },
    "PM_Nickel_Superalloy": {
      iso_group: "S",
      vc_range: [15, 50],
      fz_range: [0.010, 0.050],
      machinability_index: 0.18,
      canonical_name: "PM_Nickel_Superalloy",
      description: "PowerMill: Nickel-based superalloys — Inconel, Waspaloy, Rene",
      cam_specific_params: {
        pm_material_group: "Superalloy",
        vortex_speed_multiplier: 0.32,
        vortex_engagement_limit_deg: 20,
        vortex_thermal_limit_c: 580,
        vortex_stepdown_pct: 22,
        burnishing_risk: "low",
        recommended_coolant: "high_pressure_through_tool",
        work_hardening_severe: true,
        dwell_avoidance: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 0.32, fz_mult: 0.60 },
        Adaptive_Clearing:   { vc_mult: 0.28, fz_mult: 0.55 },
        Raster_Finishing:    { vc_mult: 0.30, fz_mult: 0.58 },
        Spiral_Finishing:    { vc_mult: 0.32, fz_mult: 0.60 },
        Steep_Shallow:       { vc_mult: 0.28, fz_mult: 0.55 },
        Corner_Finishing:    { vc_mult: 0.26, fz_mult: 0.52 },
        Plunge_Milling:      { vc_mult: 0.22, fz_mult: 1.15 },
      },
    },
    "PM_Hardened_Steel": {
      iso_group: "H",
      vc_range: [48, 138],
      fz_range: [0.016, 0.075],
      machinability_index: 0.47,
      canonical_name: "PM_Hardened_Steel",
      description: "PowerMill: Hardened steel 45-65 HRC — mold/die steels",
      cam_specific_params: {
        pm_material_group: "HardenedSteel",
        vortex_speed_multiplier: 0.62,
        vortex_engagement_limit_deg: 32,
        vortex_thermal_limit_c: 720,
        vortex_stepdown_pct: 28,
        burnishing_risk: "moderate",
        recommended_coolant: "air_blast",
        high_feed_mill_preferred: true,
        cbn_tool_capable: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 0.62, fz_mult: 0.65 },
        Adaptive_Clearing:   { vc_mult: 0.58, fz_mult: 0.62 },
        Raster_Finishing:    { vc_mult: 0.60, fz_mult: 0.65 },
        Spiral_Finishing:    { vc_mult: 0.62, fz_mult: 0.65 },
        Steep_Shallow:       { vc_mult: 0.58, fz_mult: 0.62 },
        Corner_Finishing:    { vc_mult: 0.55, fz_mult: 0.60 },
        Plunge_Milling:      { vc_mult: 0.45, fz_mult: 1.28 },
        High_Feed:           { vc_mult: 1.05, fz_mult: 0.35 },
      },
    },
    "PM_Graphite_Electrode": {
      iso_group: "N",
      vc_range: [500, 3000],
      fz_range: [0.05, 0.30],
      machinability_index: 5.00,
      canonical_name: "PM_Graphite_Electrode",
      description: "PowerMill: Graphite/carbon electrode material for EDM manufacturing",
      cam_specific_params: {
        pm_material_group: "Graphite",
        vortex_speed_multiplier: 2.20,
        vortex_engagement_limit_deg: 85,
        vortex_thermal_limit_c: 350,
        vortex_stepdown_pct: 100,
        burnishing_risk: "none",
        recommended_coolant: "dry_or_suction",
        dust_extraction_required: true,
        diamond_coat_tool_preferred: true,
      },
      strategy_multipliers: {
        Vortex:              { vc_mult: 2.20, fz_mult: 1.50 },
        Adaptive_Clearing:   { vc_mult: 2.00, fz_mult: 1.40 },
        Raster_Finishing:    { vc_mult: 1.80, fz_mult: 1.30 },
        Spiral_Finishing:    { vc_mult: 1.85, fz_mult: 1.32 },
        Steep_Shallow:       { vc_mult: 1.75, fz_mult: 1.28 },
        Corner_Finishing:    { vc_mult: 1.70, fz_mult: 1.25 },
      },
    },
  };

  protected readonly aliases: Record<string, string> = {
    "pm_steel_general": "PM_Steel_General",
    "steel general": "PM_Steel_General",
    "carbon steel": "PM_Steel_General",
    "pm_stainless_steel": "PM_Stainless_Steel",
    "stainless": "PM_Stainless_Steel",
    "ss": "PM_Stainless_Steel",
    "pm_cast_iron": "PM_Cast_Iron",
    "cast iron": "PM_Cast_Iron",
    "gray iron": "PM_Cast_Iron",
    "pm_aluminum": "PM_Aluminum",
    "aluminum": "PM_Aluminum",
    "aluminium": "PM_Aluminum",
    "al alloy": "PM_Aluminum",
    "pm_titanium": "PM_Titanium",
    "titanium": "PM_Titanium",
    "ti-6al-4v": "PM_Titanium",
    "ti64": "PM_Titanium",
    "pm_nickel_superalloy": "PM_Nickel_Superalloy",
    "nickel superalloy": "PM_Nickel_Superalloy",
    "inconel": "PM_Nickel_Superalloy",
    "waspaloy": "PM_Nickel_Superalloy",
    "pm_hardened_steel": "PM_Hardened_Steel",
    "hardened steel": "PM_Hardened_Steel",
    "mold steel": "PM_Hardened_Steel",
    "die steel": "PM_Hardened_Steel",
    "pm_graphite_electrode": "PM_Graphite_Electrode",
    "graphite": "PM_Graphite_Electrode",
    "electrode": "PM_Graphite_Electrode",
    "carbon electrode": "PM_Graphite_Electrode",
  };
}

// ─── Singletons ────────────────────────────────────────────────────────────────

export const mastercamMaterialBridgeEngine = new MastercamMaterialBridgeEngine();
export const solidCAMMaterialBridgeEngine  = new SolidCAMMaterialBridgeEngine();
export const nxCAMMaterialBridgeEngine     = new NXCAMMaterialBridgeEngine();
export const powerMillMaterialBridgeEngine = new PowerMillMaterialBridgeEngine();
