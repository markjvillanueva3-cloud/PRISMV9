/**
 * Turning Vendor Catalog Loader — MS2 U-LAT22
 *
 * Loads existing Tungaloy and Widia turning catalogs into the
 * VendorTurningCatalogExtractorEngine's unified format.
 *
 * Current coverage: ~4,095 turning inserts
 *   - Tungaloy: 2,973 items (2561 turning + 323 threading + 89 grooving)
 *   - Widia: 1,122 items (613 turning + 199 grooving + 310 threading)
 *
 * Additional Sandvik extraction pending via /pdf-learn.
 */

import { vendorTurningCatalogExtractorEngine, type VendorTurningCatalog, type TurningInsertRecord, type TurningGradeRecord, classifyChipbreaker } from "../engines/VendorTurningCatalogExtractorEngine.js";
import { TUNGALOY_TURNING_INSERTS, TUNGALOY_TURNING_GRADES, TUNGALOY_TURNING_CONDITIONS, TUNGALOY_THREADING_INSERTS, TUNGALOY_GROOVING_INSERTS } from "./tungaloy-turning-catalog.js";
import { WIDIA_TURNING_INSERTS, WIDIA_SPEED_FEED_DATA as WIDIA_SPEED_FEED, type WidiaSpeedFeed } from "./widia-2022-turning-catalog.js";
import { log } from "../utils/Logger.js";

// ISO shape code mapping
const SHAPE_CODE_MAP: Record<string, any> = {
  "C": "C", "D": "D", "T": "T", "S": "S", "V": "V", "W": "W", "R": "R",
  "K": "K", "L": "L", "M": "M", "O": "O", "P": "P", "H": "H", "E": "E",
};

// ISO group mapping from grade descriptions
function inferISOGroups(gradeDescription: string, availableGrades: string[]): string[] {
  const groups: Set<string> = new Set();

  // Check grade prefixes
  for (const grade of availableGrades) {
    if (grade.startsWith("WP") || grade.includes("P15") || grade.includes("P25") || grade.includes("P35")) groups.add("P");
    if (grade.startsWith("WM") || grade.includes("M15") || grade.includes("M25") || grade.includes("M35")) groups.add("M");
    if (grade.startsWith("WK") || grade.includes("K05") || grade.includes("K15") || grade.includes("K20")) groups.add("K");
    if (grade.startsWith("WS") || grade.includes("S05") || grade.includes("S15")) groups.add("S");
    if (grade.startsWith("WU") || grade.includes("H")) groups.add("H");
    if (grade.startsWith("TH") || grade.includes("N")) groups.add("N");
    if (grade.startsWith("AH") && grade.includes("6")) groups.add("N"); // Non-ferrous grades
    if (grade.startsWith("T9")) { groups.add("P"); groups.add("M"); groups.add("K"); } // General CVD grades
    if (grade.startsWith("GH") || grade.startsWith("BX")) groups.add("H"); // CBN grades
  }

  return groups.size > 0 ? Array.from(groups) : ["P"]; // Default to P if can't infer
}

/**
 * Convert Tungaloy turning inserts to unified format.
 */
function convertTungaloyInserts(): TurningInsertRecord[] {
  const results: TurningInsertRecord[] = [];

  for (const insert of TUNGALOY_TURNING_INSERTS) {
    const shapeCode = insert.shape_code as any || "C";
    const isoGroups = inferISOGroups("", insert.available_grades || []);

    results.push({
      designation: insert.designation,
      vendor: "Tungaloy",
      type: "turning_insert",
      iso_shape: SHAPE_CODE_MAP[shapeCode] || "C",
      iso_clearance: insert.clearance_angle?.[0] as any || "N",
      iso_tolerance: insert.tolerance_class as any || "M",
      iso_fixing: insert.fixing_type as any || "G",
      ic_mm: insert.ic_mm,
      thickness_mm: insert.thickness_mm,
      nose_radius_mm: insert.nose_radius_mm,
      edge_length_mm: insert.edge_length_mm,
      cutting_edge_count: shapeCode === "S" ? 8 : shapeCode === "T" ? 6 : shapeCode === "R" ? 1 : 2,
      chipbreaker: insert.chipbreaker,
      chipbreaker_type: insert.chipbreaker ? classifyChipbreaker(insert.chipbreaker) : undefined,
      available_grades: insert.available_grades || [],
      primary_grade: insert.available_grades?.[0],
      iso_groups: isoGroups,
    });
  }

  // Add threading inserts
  for (const insert of TUNGALOY_THREADING_INSERTS || []) {
    results.push({
      designation: insert.designation,
      vendor: "Tungaloy",
      type: "threading_insert",
      iso_shape: "T" as any,
      iso_clearance: "N" as any,
      iso_tolerance: "M" as any,
      iso_fixing: "G" as any,
      ic_mm: insert.ic_mm,
      thickness_mm: 4.76,
      nose_radius_mm: insert.re_mm || 0.2,
      chipbreaker: insert.chipbreaker,
      available_grades: insert.available_grades || [],
      iso_groups: ["P", "M"],
    });
  }

  // Add grooving inserts
  for (const insert of TUNGALOY_GROOVING_INSERTS || []) {
    results.push({
      designation: insert.designation,
      vendor: "Tungaloy",
      type: "grooving_insert",
      iso_shape: "L" as any,
      iso_clearance: "N" as any,
      iso_tolerance: "M" as any,
      iso_fixing: "N" as any,
      ic_mm: 0,
      thickness_mm: insert.width_mm || 3,
      nose_radius_mm: insert.corner_radius_mm || 0.2,
      chipbreaker: insert.family,
      available_grades: insert.available_grades || [],
      iso_groups: ["P", "M", "K"],
    });
  }

  return results;
}

/**
 * Convert Tungaloy grades to unified format.
 */
function convertTungaloyGrades(): TurningGradeRecord[] {
  return (TUNGALOY_TURNING_GRADES || []).map(grade => ({
    grade: grade.grade,
    vendor: "Tungaloy",
    description: grade.description,
    substrate: grade.description.includes("cermet") ? "cermet" as const
      : grade.description.includes("CBN") ? "cbn" as const
      : grade.description.includes("PCD") ? "pcd" as const
      : grade.description.includes("Ceramic") ? "ceramic" as const
      : "carbide" as const,
    coating_type: grade.description.includes("PVD") ? "PVD" as const
      : grade.description.includes("CVD") ? "CVD" as const
      : "uncoated" as const,
    iso_groups: grade.iso_groups,
    application_type: grade.description.includes("finishing") ? "finishing" as const
      : grade.description.includes("roughing") || grade.description.includes("heavy") ? "roughing" as const
      : "medium" as const,
    wear_resistance: grade.description.includes("finishing") ? 8 : 6,
    toughness: grade.description.includes("roughing") || grade.description.includes("interrupted") ? 8 : 5,
  }));
}

/**
 * Convert Widia turning inserts to unified format.
 */
function convertWidiaInserts(): TurningInsertRecord[] {
  const results: TurningInsertRecord[] = [];

  for (const insert of WIDIA_TURNING_INSERTS) {
    const shapeCode = insert.shape_code || "C";
    const isoGroups = inferISOGroups("", insert.available_grades || []);

    if (insert.type === "turning_insert") {
      results.push({
        designation: insert.designation,
        vendor: "Widia",
        type: "turning_insert",
        iso_shape: SHAPE_CODE_MAP[shapeCode] || "C",
        iso_clearance: "N" as any,
        iso_tolerance: insert.designation[2] as any || "M",
        iso_fixing: insert.designation[3] as any || "G",
        ic_mm: insert.ic_mm || 12.7,
        thickness_mm: insert.thickness_mm || 4.76,
        nose_radius_mm: insert.nose_radius_mm || 0.8,
        edge_length_mm: insert.edge_length_mm,
        chipbreaker: insert.chipbreaker,
        chipbreaker_type: insert.chipbreaker ? classifyChipbreaker(insert.chipbreaker) : undefined,
        available_grades: insert.available_grades || [],
        primary_grade: insert.available_grades?.[0],
        iso_groups: isoGroups,
        catalog_page: parseInt(insert.catalog_page?.replace("E", "") || "0"),
      });
    } else if (insert.type === "grooving_insert") {
      results.push({
        designation: insert.designation,
        vendor: "Widia",
        type: "grooving_insert",
        iso_shape: "L" as any,
        iso_clearance: "N" as any,
        iso_tolerance: "M" as any,
        iso_fixing: "N" as any,
        ic_mm: insert.ic_mm || 0,
        thickness_mm: insert.width_mm || 3,
        nose_radius_mm: insert.corner_radius_mm || 0.2,
        chipbreaker: insert.chipbreaker,
        available_grades: insert.available_grades || [],
        iso_groups: isoGroups,
      });
    } else if (insert.type === "threading_insert") {
      results.push({
        designation: insert.designation,
        vendor: "Widia",
        type: "threading_insert",
        iso_shape: "T" as any,
        iso_clearance: "N" as any,
        iso_tolerance: "M" as any,
        iso_fixing: "G" as any,
        ic_mm: insert.ic_mm || 16,
        thickness_mm: insert.thickness_mm || 4.76,
        nose_radius_mm: 0.2,
        chipbreaker: insert.chipbreaker,
        available_grades: insert.available_grades || [],
        iso_groups: ["P", "M"],
      });
    }
  }

  return results;
}

/**
 * Convert Widia grades to unified format.
 */
function convertWidiaGrades(): TurningGradeRecord[] {
  const gradeSet = new Set<string>();
  for (const insert of WIDIA_TURNING_INSERTS) {
    for (const g of insert.available_grades || []) {
      gradeSet.add(g);
    }
  }

  return Array.from(gradeSet).map(grade => {
    const isPGroup = grade.startsWith("WP");
    const isMGroup = grade.startsWith("WM");
    const isKGroup = grade.startsWith("WK");
    const isSGroup = grade.startsWith("WS") || grade.startsWith("WU");
    const isTHM = grade === "THM" || grade === "TTR";

    return {
      grade,
      vendor: "Widia",
      description: `Widia ${grade} grade`,
      substrate: isTHM ? "cermet" as const : "carbide" as const,
      coating_type: grade.includes("CT") ? "CVD" as const : grade.includes("PT") || grade.includes("HT") || grade.includes("TT") ? "PVD" as const : "uncoated" as const,
      iso_groups: isPGroup ? ["P"] : isMGroup ? ["M"] : isKGroup ? ["K"] : isSGroup ? ["S", "H"] : isTHM ? ["P", "M", "K", "N"] : ["P"],
      application_type: grade.includes("15") ? "finishing" as const : grade.includes("35") ? "roughing" as const : "medium" as const,
      wear_resistance: 6,
      toughness: 6,
    };
  });
}

/**
 * Load all vendor catalogs and register with the engine.
 */
export function loadVendorTurningCatalogs(): void {
  // Tungaloy catalog
  const tungaloyInserts = convertTungaloyInserts();
  const tungaloyGrades = convertTungaloyGrades();

  const tungaloyCatalog: VendorTurningCatalog = {
    vendor: "Tungaloy",
    catalog_version: "2023-2024",
    extraction_date: "2026-04-16",
    inserts: tungaloyInserts,
    holders: [], // Holders require separate extraction
    grades: tungaloyGrades,
    cutting_data: (TUNGALOY_TURNING_CONDITIONS || []).map(c => ({
      grade: c.grade,
      iso_group: c.iso_groups[0] || "P",
      ap_min_mm: c.ap_min_mm,
      ap_max_mm: c.ap_max_mm,
      feed_min_mm_rev: c.feed_min_mm_rev,
      feed_max_mm_rev: c.feed_max_mm_rev,
      vc_min_m_min: c.vc_ranges?.[0]?.vc_min || 100,
      vc_max_m_min: c.vc_ranges?.[0]?.vc_max || 300,
    })),
    stats: {
      total_inserts: tungaloyInserts.length,
      total_holders: 0,
      total_grades: tungaloyGrades.length,
      total_cutting_data: (TUNGALOY_TURNING_CONDITIONS || []).length,
      insert_shapes: countShapes(tungaloyInserts),
      chipbreaker_types: countChipbreakers(tungaloyInserts),
    },
  };

  // Widia catalog
  const widiaInserts = convertWidiaInserts();
  const widiaGrades = convertWidiaGrades();

  const widiaCatalog: VendorTurningCatalog = {
    vendor: "Widia",
    catalog_version: "2022",
    extraction_date: "2026-04-16",
    inserts: widiaInserts,
    holders: [],
    grades: widiaGrades,
    cutting_data: (WIDIA_SPEED_FEED || []).map((sf: WidiaSpeedFeed) => ({
      grade: sf.grade,
      iso_group: sf.material_group[0] || "P",
      material_description: sf.material_description,
      ap_min_mm: 0.5,
      ap_max_mm: 4.0,
      feed_min_mm_rev: 0.1,
      feed_max_mm_rev: 0.4,
      vc_min_m_min: sf.vc_max_m_min * 0.6,
      vc_max_m_min: sf.vc_max_m_min,
    })),
    stats: {
      total_inserts: widiaInserts.length,
      total_holders: 0,
      total_grades: widiaGrades.length,
      total_cutting_data: (WIDIA_SPEED_FEED || []).length,
      insert_shapes: countShapes(widiaInserts),
      chipbreaker_types: countChipbreakers(widiaInserts),
    },
  };

  // Register catalogs
  vendorTurningCatalogExtractorEngine.registerCatalog(tungaloyCatalog);
  vendorTurningCatalogExtractorEngine.registerCatalog(widiaCatalog);

  log.info(`[TurningCatalogLoader] Loaded ${tungaloyInserts.length + widiaInserts.length} turning inserts from 2 vendors`);
}

function countShapes(inserts: TurningInsertRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const insert of inserts) {
    counts[insert.iso_shape] = (counts[insert.iso_shape] || 0) + 1;
  }
  return counts;
}

function countChipbreakers(inserts: TurningInsertRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const insert of inserts) {
    const type = insert.chipbreaker_type || "none";
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

// Auto-load on import
let _loaded = false;
export function ensureCatalogsLoaded(): void {
  if (!_loaded) {
    loadVendorTurningCatalogs();
    _loaded = true;
  }
}
