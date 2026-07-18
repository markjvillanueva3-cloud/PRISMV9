/**
 * VendorTurningCatalogExtractorEngine — L2-P1-MS2 Unified Vendor Turning Tool Extraction
 *
 * Extracts turning inserts, holders, and cutting data from vendor PDF catalogs.
 * Unifies data into schema compatible with ToolCatalogEngine.
 *
 * Supported vendors: Sandvik, Korloy, Iscar, YG-1, REGO-FIX, Mitsubishi, Kennametal
 *
 * Actions: lathe_vendor_tool_lookup, lathe_insert_grade_select, lathe_iso_code_resolve
 *
 * References:
 *   - ISO 1832: Insert designation system
 *   - ISO 5608: Toolholder designation system
 *   - Sandvik Coromant Turning Guide 2023-2024
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES — ISO 1832 Insert Designation
// ============================================================================

/**
 * ISO 1832 Insert Shape Codes
 */
export type ISOInsertShape =
  | "C" // Rhombic 80°
  | "D" // Rhombic 55°
  | "E" // Rhombic 75°
  | "H" // Hexagonal
  | "K" // Parallelogram 55°
  | "L" // Rectangular
  | "M" // Rhombic 86°
  | "O" // Octagonal
  | "P" // Pentagon
  | "R" // Round
  | "S" // Square
  | "T" // Triangular
  | "V" // Rhombic 35°
  | "W" // Trigon 80°;

/**
 * ISO 1832 Clearance Angle Codes
 */
export type ISOClearanceAngle =
  | "A" // 3°
  | "B" // 5°
  | "C" // 7°
  | "D" // 15°
  | "E" // 20°
  | "F" // 25°
  | "G" // 30°
  | "N" // 0°
  | "O" // Other
  | "P" // 11°;

/**
 * ISO 1832 Tolerance Class
 */
export type ISOToleranceClass = "A" | "C" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M" | "N" | "U";

/**
 * ISO 1832 Fixing Type
 */
export type ISOFixingType =
  | "A" // Hole with 60° countersink
  | "B" // Hole with 60° countersink both sides
  | "C" // Hole with 90° countersink
  | "G" // Hole with chipbreaker both sides
  | "H" // Hole with chipbreaker one side
  | "M" // Hole with 60° and 90° countersink
  | "N" // No hole
  | "Q" // Hole with 40-60° countersink
  | "R" // Hole without countersink
  | "T" // Hole with 40-60° and 80-90° countersink
  | "U" // Hole with 40-60° countersink both sides
  | "W" // No hole with chipbreaker both sides;

// ============================================================================
// UNIFIED TURNING INSERT INTERFACE
// ============================================================================

export interface TurningInsertRecord {
  designation: string;
  vendor: string;
  type: "turning_insert" | "threading_insert" | "grooving_insert" | "parting_insert";

  // ISO 1832 decoded fields
  iso_shape: ISOInsertShape;
  iso_clearance: ISOClearanceAngle;
  iso_tolerance: ISOToleranceClass;
  iso_fixing: ISOFixingType;

  // Physical dimensions
  ic_mm: number;                    // Inscribed circle
  thickness_mm: number;             // Insert thickness
  nose_radius_mm: number;           // Corner radius
  edge_length_mm?: number;          // Cutting edge length
  cutting_edge_count?: number;      // Number of usable edges

  // Chipbreaker info
  chipbreaker?: string;             // Chipbreaker code (e.g., "PM", "SM", "MM")
  chipbreaker_type?: "finishing" | "medium" | "roughing" | "universal";

  // Grade info
  available_grades: string[];
  primary_grade?: string;

  // ISO material compatibility
  iso_groups: string[];             // P, M, K, N, S, H

  // Cutting conditions (per ISO group)
  cutting_data?: TurningCuttingData[];

  // Source tracking
  catalog_page?: number;
  extraction_date?: string;
}

export interface TurningCuttingData {
  grade: string;
  iso_group: string;
  material_description?: string;
  ap_min_mm: number;
  ap_max_mm: number;
  feed_min_mm_rev: number;
  feed_max_mm_rev: number;
  vc_min_m_min: number;
  vc_max_m_min: number;
  operation_type?: "finishing" | "medium" | "roughing";
}

export interface TurningHolderRecord {
  designation: string;
  vendor: string;
  type: "external_holder" | "internal_holder" | "parting_holder" | "threading_holder";

  // ISO 5608 fields
  style?: string;                   // e.g., "PCLNR", "DCLNR", "SCLCR"
  hand?: "R" | "L" | "N";           // Right, Left, Neutral
  shank_size: string;               // e.g., "2525M12", "20x20"
  shank_width_mm?: number;
  shank_height_mm?: number;
  boring_bar_diameter_mm?: number;  // For boring bars

  // Insert compatibility
  insert_shape: ISOInsertShape;
  insert_ic_mm: number;
  clamping_system?: string;         // e.g., "P", "S", "C", "M"

  // Geometry
  approach_angle_deg?: number;      // Lead/entering angle (90°, 95°, etc.)
  overall_length_mm?: number;
  functional_length_mm?: number;
  max_boring_depth_mm?: number;     // For boring bars

  // Coolant
  coolant_through?: boolean;
  coolant_type?: "flood" | "through_tool" | "both";
}

export interface TurningGradeRecord {
  grade: string;
  vendor: string;
  description: string;
  substrate: "carbide" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  coating_type?: "CVD" | "PVD" | "uncoated";
  iso_groups: string[];
  hardness_range?: string;          // e.g., "P01-P10"
  application_type?: "finishing" | "medium" | "roughing" | "universal";
  wear_resistance?: number;         // 1-10 scale
  toughness?: number;               // 1-10 scale
}

// ============================================================================
// VENDOR CATALOG STRUCTURE
// ============================================================================

export interface VendorTurningCatalog {
  vendor: string;
  catalog_version: string;
  extraction_date: string;
  inserts: TurningInsertRecord[];
  holders: TurningHolderRecord[];
  grades: TurningGradeRecord[];
  cutting_data: TurningCuttingData[];
  stats: {
    total_inserts: number;
    total_holders: number;
    total_grades: number;
    total_cutting_data: number;
    insert_shapes: Record<string, number>;
    chipbreaker_types: Record<string, number>;
  };
}

// ============================================================================
// ISO CODE PARSING
// ============================================================================

const ISO_SHAPE_ANGLES: Record<ISOInsertShape, number> = {
  C: 80, D: 55, E: 75, H: 120, K: 55, L: 90, M: 86,
  O: 135, P: 108, R: 360, S: 90, T: 60, V: 35, W: 80,
};

const ISO_CLEARANCE_ANGLES: Record<ISOClearanceAngle, number> = {
  A: 3, B: 5, C: 7, D: 15, E: 20, F: 25, G: 30, N: 0, O: 0, P: 11,
};

const ISO_NOSE_RADIUS_CODES: Record<string, number> = {
  "00": 0, "01": 0.1, "02": 0.2, "04": 0.4, "08": 0.8,
  "12": 1.2, "16": 1.6, "20": 2.0, "24": 2.4, "28": 2.8, "32": 3.2,
};

const ISO_IC_CODES: Record<string, number> = {
  "03": 3.97, "04": 4.76, "05": 5.56, "06": 6.35, "08": 7.94,
  "09": 9.525, "11": 11.1, "12": 12.7, "15": 15.875, "16": 15.875,
  "19": 19.05, "22": 22.0, "25": 25.4, "27": 27.0, "32": 31.75,
};

const ISO_THICKNESS_CODES: Record<string, number> = {
  "01": 1.59, "02": 2.38, "03": 3.18, "04": 4.76, "05": 5.56,
  "06": 6.35, "07": 7.94, "09": 9.52, "T3": 3.97, "S4": 4.76,
};

/**
 * Parse ISO 1832 insert designation into structured data.
 * Example: CNMG120408-PM → { shape: C, clearance: N, tolerance: M, fixing: G, ic: 12.7mm, thickness: 4.76mm, nose: 0.8mm, chipbreaker: PM }
 */
export function parseISO1832Designation(designation: string): Partial<TurningInsertRecord> | null {
  // Standard format: SHAPE + CLEARANCE + TOLERANCE + FIXING + SIZE + NOSE + CHIPBREAKER
  // Example: CNMG 12 04 08 -PM or DNMG150608-MF
  const cleaned = designation.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  if (cleaned.length < 7) return null;

  const shape = cleaned[0] as ISOInsertShape;
  const clearance = cleaned[1] as ISOClearanceAngle;
  const tolerance = cleaned[2] as ISOToleranceClass;
  const fixing = cleaned[3] as ISOFixingType;

  // Size codes: IC + thickness + nose radius
  const sizeBlock = cleaned.substring(4, 10);
  const icCode = sizeBlock.substring(0, 2);
  const thicknessCode = sizeBlock.substring(2, 4);
  const noseCode = sizeBlock.substring(4, 6);

  // Extract chipbreaker (after size)
  const chipbreakerMatch = designation.match(/[-_]?([A-Z]{2,3})$/i);
  const chipbreaker = chipbreakerMatch ? chipbreakerMatch[1].toUpperCase() : undefined;

  const ic_mm = ISO_IC_CODES[icCode] ?? parseFloat(icCode) / 10 * 25.4;
  const thickness_mm = ISO_THICKNESS_CODES[thicknessCode] ?? parseFloat(thicknessCode) / 100 * 25.4;
  const nose_radius_mm = ISO_NOSE_RADIUS_CODES[noseCode] ?? parseFloat(noseCode) / 10;

  return {
    designation,
    iso_shape: shape,
    iso_clearance: clearance,
    iso_tolerance: tolerance,
    iso_fixing: fixing,
    ic_mm: Math.round(ic_mm * 100) / 100,
    thickness_mm: Math.round(thickness_mm * 100) / 100,
    nose_radius_mm: Math.round(nose_radius_mm * 100) / 100,
    chipbreaker,
    cutting_edge_count: shape === "S" ? 8 : shape === "T" ? 6 : shape === "R" ? 1 : shape === "C" || shape === "D" || shape === "V" ? 2 : 4,
  };
}

/**
 * Determine chipbreaker type from code.
 */
export function classifyChipbreaker(code: string): "finishing" | "medium" | "roughing" | "universal" {
  const upper = code.toUpperCase();

  // Common finishing chipbreakers
  if (["FF", "PF", "SF", "MF", "UF", "LF", "FQ"].includes(upper)) return "finishing";

  // Common roughing chipbreakers (check first - MR is roughing, not medium)
  if (["PR", "SR", "MR", "UR", "GR", "HR", "RR"].includes(upper)) return "roughing";

  // Common medium chipbreakers
  if (["PM", "SM", "MM", "UM", "GM", "MP"].includes(upper)) return "medium";

  // Universal chipbreakers
  return "universal";
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class VendorTurningCatalogExtractorEngine {
  private catalogs: Map<string, VendorTurningCatalog> = new Map();

  /**
   * Register a vendor catalog.
   */
  registerCatalog(catalog: VendorTurningCatalog): void {
    this.catalogs.set(catalog.vendor.toLowerCase(), catalog);
    log.info(`VendorTurningCatalogExtractor: Registered ${catalog.vendor} catalog — ${catalog.stats.total_inserts} inserts, ${catalog.stats.total_holders} holders`);
  }

  /**
   * Search for inserts across all vendor catalogs.
   */
  searchInserts(query: {
    designation?: string;
    shape?: ISOInsertShape;
    ic_mm?: number;
    nose_radius_mm?: number;
    iso_group?: string;
    vendor?: string;
    chipbreaker_type?: "finishing" | "medium" | "roughing" | "universal";
    limit?: number;
  }): TurningInsertRecord[] {
    const results: TurningInsertRecord[] = [];
    const limit = query.limit ?? 50;

    for (const [vendorKey, catalog] of this.catalogs) {
      if (query.vendor && vendorKey !== query.vendor.toLowerCase()) continue;

      for (const insert of catalog.inserts) {
        if (results.length >= limit) break;

        // Filter by designation pattern
        if (query.designation && !insert.designation.includes(query.designation.toUpperCase())) continue;

        // Filter by shape
        if (query.shape && insert.iso_shape !== query.shape) continue;

        // Filter by IC size (±0.5mm tolerance)
        if (query.ic_mm && Math.abs(insert.ic_mm - query.ic_mm) > 0.5) continue;

        // Filter by nose radius (±0.05mm tolerance)
        if (query.nose_radius_mm && Math.abs(insert.nose_radius_mm - query.nose_radius_mm) > 0.05) continue;

        // Filter by ISO material group
        if (query.iso_group && !insert.iso_groups.includes(query.iso_group)) continue;

        // Filter by chipbreaker type
        if (query.chipbreaker_type && insert.chipbreaker_type !== query.chipbreaker_type) continue;

        results.push(insert);
      }
    }

    return results;
  }

  /**
   * Lookup holders compatible with a given insert.
   */
  findCompatibleHolders(insert: TurningInsertRecord, operationType: "external" | "internal"): TurningHolderRecord[] {
    const results: TurningHolderRecord[] = [];

    for (const catalog of this.catalogs.values()) {
      for (const holder of catalog.holders) {
        // Match insert shape
        if (holder.insert_shape !== insert.iso_shape) continue;

        // Match IC size (±0.1mm)
        if (Math.abs(holder.insert_ic_mm - insert.ic_mm) > 0.1) continue;

        // Match operation type
        const holderIsInternal = holder.type === "internal_holder" || holder.boring_bar_diameter_mm !== undefined;
        if (operationType === "internal" && !holderIsInternal) continue;
        if (operationType === "external" && holderIsInternal) continue;

        results.push(holder);
      }
    }

    return results;
  }

  /**
   * Get recommended grade for material and operation.
   */
  recommendGrade(params: {
    iso_group: string;
    operation: "finishing" | "medium" | "roughing";
    vendor?: string;
    substrate?: "carbide" | "cermet" | "ceramic" | "cbn" | "pcd";
  }): TurningGradeRecord[] {
    const results: TurningGradeRecord[] = [];

    for (const [vendorKey, catalog] of this.catalogs) {
      if (params.vendor && vendorKey !== params.vendor.toLowerCase()) continue;

      for (const grade of catalog.grades) {
        if (!grade.iso_groups.includes(params.iso_group)) continue;
        if (params.substrate && grade.substrate !== params.substrate) continue;
        if (grade.application_type !== params.operation && grade.application_type !== "universal") continue;

        results.push(grade);
      }
    }

    // Sort by toughness for roughing, wear resistance for finishing
    if (params.operation === "roughing") {
      results.sort((a, b) => (b.toughness ?? 5) - (a.toughness ?? 5));
    } else if (params.operation === "finishing") {
      results.sort((a, b) => (b.wear_resistance ?? 5) - (a.wear_resistance ?? 5));
    }

    return results;
  }

  /**
   * Get cutting parameters for an insert/grade/material combination.
   */
  getCuttingParameters(insert: TurningInsertRecord, grade: string, iso_group: string): TurningCuttingData | null {
    // First check insert-specific cutting data
    if (insert.cutting_data) {
      const match = insert.cutting_data.find(cd => cd.grade === grade && cd.iso_group === iso_group);
      if (match) return match;
    }

    // Fall back to catalog-level cutting data
    for (const catalog of this.catalogs.values()) {
      const match = catalog.cutting_data.find(cd =>
        cd.grade === grade && cd.iso_group === iso_group
      );
      if (match) return match;
    }

    return null;
  }

  /**
   * Get catalog statistics.
   */
  getStats(): { vendor: string; stats: VendorTurningCatalog["stats"] }[] {
    return Array.from(this.catalogs.entries()).map(([vendor, catalog]) => ({
      vendor,
      stats: catalog.stats,
    }));
  }

  /**
   * Resolve ISO code to full insert details.
   */
  resolveISOCode(designation: string): {
    parsed: Partial<TurningInsertRecord> | null;
    matches: TurningInsertRecord[];
  } {
    const parsed = parseISO1832Designation(designation);
    const matches = parsed ? this.searchInserts({ designation, limit: 10 }) : [];
    return { parsed, matches };
  }
}

export const vendorTurningCatalogExtractorEngine = new VendorTurningCatalogExtractorEngine();
