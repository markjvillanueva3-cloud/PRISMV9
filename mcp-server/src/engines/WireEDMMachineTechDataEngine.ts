/**
 * WireEDMMachineTechDataEngine
 *
 * Comprehensive manufacturer-specific Wire EDM technology data engine.
 * Contains actual tech table data extracted from Mastercam TECH files
 * for Mitsubishi, Makino, and other major Wire EDM manufacturers.
 *
 * Data Sources:
 * - Mitsubishi FA-S Advance V-Package (Metric)
 * - Makino SP43/SP64 MGW-S Library
 * - Makino DUO-Ver6 V Guide
 *
 * Key Features:
 * - Manufacturer-specific cutting parameters
 * - Thickness-based parameter lookup
 * - Pass progression optimization
 * - Wire diameter recommendations
 * - Ra prediction by pass count
 * - EPAC (E-Pack) code management
 *
 * @module engines/WireEDMMachineTechDataEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Wire EDM machine manufacturer
 */
export type WEDMManufacturer =
  | "mitsubishi"
  | "makino"
  | "sodick"
  | "fanuc"
  | "agie"
  | "charmilles";

/**
 * Wire EDM machine model
 */
export type WEDMMachineModel =
  | "fa_s_vpack"    // Mitsubishi FA-S Advance V-Package
  | "fa_s"          // Mitsubishi FA-S
  | "mva"           // Mitsubishi MV-A
  | "sp43"          // Makino SP43
  | "sp64"          // Makino SP64
  | "duo_v6"        // Makino DUO-Ver6
  | "vz300"         // Sodick VZ300
  | "robocut";      // Fanuc Robocut

/**
 * Wire type
 */
export type TechWireType = "BS" | "ZN" | "BR" | "COATED";

/**
 * Workpiece material
 */
export type TechMaterial = "STEEL" | "St" | "Cu" | "CARBIDE" | "AL" | "TI" | "INCONEL";

/**
 * Cutting method
 */
export type TechMethod = "Standard" | "High Precision" | "Both Away" | "High Speed" | "Mirror";

/**
 * Pass data from tech file
 */
export interface TechPassData {
  pass_number: number;
  label?: string;
  approach: "N" | "Y";
  epac: number[];
  feed_mmpm: number[];
  offsets_mm: number[];
  registers: number[];
  ra_um: number;
}

/**
 * Record block (thickness entry)
 */
export interface TechRecord {
  thickness_mm: number;
  taper_deg: number;
  passes: TechPassData[];
}

/**
 * Header block (wire/material/method combination)
 */
export interface TechHeader {
  wire_diameter_mm: number;
  wire_type: TechWireType;
  material: TechMaterial;
  method: TechMethod;
  records: TechRecord[];
}

/**
 * Complete tech file data
 */
export interface TechFileData {
  manufacturer: WEDMManufacturer;
  machine: WEDMMachineModel;
  control: string;
  units: "Metric" | "Inch";
  version: number;
  headers: TechHeader[];
}

/**
 * Parameter lookup result
 */
export interface TechLookupResult {
  found: boolean;
  exact_match: boolean;
  machine: WEDMMachineModel;
  wire_diameter_mm: number;
  material: TechMaterial;
  method: TechMethod;
  thickness_mm: number;
  passes: TechPassData[];
  interpolated?: boolean;
  source: string;
}

/**
 * Optimal pass count recommendation
 */
export interface PassCountRecommendation {
  target_ra_um: number;
  recommended_passes: number;
  achievable_ra_um: number;
  pass_sequence: Array<{
    pass: number;
    expected_ra_um: number;
    feed_mmpm: number;
    offset_mm: number;
  }>;
  time_factor: number;  // relative to single pass
}

// ============================================================================
// MANUFACTURER TECH DATA
// ============================================================================

/**
 * Mitsubishi FA-S Advance V-Package Tech Data
 * Extracted from: Mitsubishi FA-S Advance V-Package (Metric).TECH
 */
const MITSUBISHI_FA_S_VPACK: TechFileData = {
  manufacturer: "mitsubishi",
  machine: "fa_s_vpack",
  control: "Generic",
  units: "Metric",
  version: 5,
  headers: [
    {
      wire_diameter_mm: 0.20,
      wire_type: "BS",
      material: "STEEL",
      method: "Standard",
      records: [
        {
          thickness_mm: 5,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1001], feed_mmpm: [6.2], offsets_mm: [0.123], registers: [1], ra_um: 2.60 },
            { pass_number: 2, approach: "N", epac: [1001, 1002], feed_mmpm: [6.2, 7.4], offsets_mm: [0.169, 0.109], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1001, 1002, 1003], feed_mmpm: [6.2, 7.4, 10.0], offsets_mm: [0.185, 0.125, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1001, 1002, 1003, 1004], feed_mmpm: [6.2, 7.4, 10.0, 9.0], offsets_mm: [0.188, 0.128, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.34 }
          ]
        },
        {
          thickness_mm: 10,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1011], feed_mmpm: [4.6], offsets_mm: [0.126], registers: [1], ra_um: 2.70 },
            { pass_number: 2, approach: "N", epac: [1011, 1012], feed_mmpm: [4.6, 5.8], offsets_mm: [0.167, 0.107], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1011, 1012, 1013], feed_mmpm: [4.6, 5.8, 9.5], offsets_mm: [0.182, 0.122, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1011, 1012, 1013, 1014], feed_mmpm: [4.6, 5.8, 9.5, 8.5], offsets_mm: [0.185, 0.125, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.34 }
          ]
        },
        {
          thickness_mm: 20,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1021], feed_mmpm: [2.6], offsets_mm: [0.128], registers: [1], ra_um: 2.70 },
            { pass_number: 2, approach: "N", epac: [1021, 1022], feed_mmpm: [2.6, 4.8], offsets_mm: [0.166, 0.106], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1021, 1022, 1023], feed_mmpm: [2.6, 4.8, 9.0], offsets_mm: [0.180, 0.120, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1021, 1022, 1023, 1024], feed_mmpm: [2.6, 4.8, 9.0, 8.0], offsets_mm: [0.183, 0.123, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.34 }
          ]
        },
        {
          thickness_mm: 30,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1031], feed_mmpm: [2.0], offsets_mm: [0.131], registers: [1], ra_um: 2.70 },
            { pass_number: 2, approach: "N", epac: [1031, 1032], feed_mmpm: [2.0, 3.9], offsets_mm: [0.166, 0.106], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1031, 1032, 1033], feed_mmpm: [2.0, 3.9, 8.7], offsets_mm: [0.180, 0.120, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1031, 1032, 1033, 1034], feed_mmpm: [2.0, 3.9, 8.7, 7.7], offsets_mm: [0.183, 0.123, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.35 }
          ]
        },
        {
          thickness_mm: 40,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1041], feed_mmpm: [1.6], offsets_mm: [0.134], registers: [1], ra_um: 2.70 },
            { pass_number: 2, approach: "N", epac: [1041, 1042], feed_mmpm: [1.6, 3.0], offsets_mm: [0.166, 0.106], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1041, 1042, 1043], feed_mmpm: [1.6, 3.0, 8.0], offsets_mm: [0.180, 0.120, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1041, 1042, 1043, 1044], feed_mmpm: [1.6, 3.0, 8.0, 7.2], offsets_mm: [0.183, 0.123, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.35 }
          ]
        },
        {
          thickness_mm: 50,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1051], feed_mmpm: [1.3], offsets_mm: [0.136], registers: [1], ra_um: 2.70 },
            { pass_number: 2, approach: "N", epac: [1051, 1052], feed_mmpm: [1.3, 2.5], offsets_mm: [0.168, 0.108], registers: [1, 2], ra_um: 2.50 },
            { pass_number: 3, approach: "N", epac: [1051, 1052, 1053], feed_mmpm: [1.3, 2.5, 7.5], offsets_mm: [0.182, 0.122, 0.105], registers: [1, 2, 3], ra_um: 0.70 },
            { pass_number: 4, approach: "N", epac: [1051, 1052, 1053, 1054], feed_mmpm: [1.3, 2.5, 7.5, 6.8], offsets_mm: [0.185, 0.125, 0.108, 0.103], registers: [1, 2, 3, 4], ra_um: 0.35 }
          ]
        },
        {
          thickness_mm: 75,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1071], feed_mmpm: [0.9], offsets_mm: [0.140], registers: [1], ra_um: 2.80 },
            { pass_number: 2, approach: "N", epac: [1071, 1072], feed_mmpm: [0.9, 1.8], offsets_mm: [0.172, 0.112], registers: [1, 2], ra_um: 2.60 },
            { pass_number: 3, approach: "N", epac: [1071, 1072, 1073], feed_mmpm: [0.9, 1.8, 6.5], offsets_mm: [0.185, 0.125, 0.108], registers: [1, 2, 3], ra_um: 0.75 },
            { pass_number: 4, approach: "N", epac: [1071, 1072, 1073, 1074], feed_mmpm: [0.9, 1.8, 6.5, 5.8], offsets_mm: [0.188, 0.128, 0.111, 0.106], registers: [1, 2, 3, 4], ra_um: 0.38 }
          ]
        },
        {
          thickness_mm: 100,
          taper_deg: 0,
          passes: [
            { pass_number: 1, approach: "N", epac: [1101], feed_mmpm: [0.7], offsets_mm: [0.145], registers: [1], ra_um: 2.90 },
            { pass_number: 2, approach: "N", epac: [1101, 1102], feed_mmpm: [0.7, 1.4], offsets_mm: [0.178, 0.118], registers: [1, 2], ra_um: 2.70 },
            { pass_number: 3, approach: "N", epac: [1101, 1102, 1103], feed_mmpm: [0.7, 1.4, 5.5], offsets_mm: [0.190, 0.130, 0.112], registers: [1, 2, 3], ra_um: 0.80 },
            { pass_number: 4, approach: "N", epac: [1101, 1102, 1103, 1104], feed_mmpm: [0.7, 1.4, 5.5, 5.0], offsets_mm: [0.193, 0.133, 0.115, 0.110], registers: [1, 2, 3, 4], ra_um: 0.42 }
          ]
        }
      ]
    }
  ]
};

/**
 * Makino SP43/SP64 Tech Data
 * Extracted from: Makino (SP43,SP64).tech
 */
const MAKINO_SP43_SP64: TechFileData = {
  manufacturer: "makino",
  machine: "sp43",
  control: "MGW-S",
  units: "Inch",
  version: 5,
  headers: [
    {
      wire_diameter_mm: 0.10,  // 0.004"
      wire_type: "BS",
      material: "Cu",
      method: "High Precision",
      records: [
        {
          thickness_mm: 6.35,  // 0.25"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [7025], feed_mmpm: [0], offsets_mm: [0.079], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "2nd 50uinRa", approach: "N", epac: [7025, 7221], feed_mmpm: [0, 0], offsets_mm: [0.109, 0.058], registers: [1, 2], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [7025, 7221, 7222], feed_mmpm: [0, 0, 0], offsets_mm: [0.114, 0.066, 0.058], registers: [1, 2, 3], ra_um: 0.30 }
          ]
        },
        {
          thickness_mm: 12.7,  // 0.5"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [7035], feed_mmpm: [0], offsets_mm: [0.081], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "2nd 50uinRa", approach: "N", epac: [7035, 7231], feed_mmpm: [0, 0], offsets_mm: [0.112, 0.061], registers: [1, 2], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [7035, 7231, 7232], feed_mmpm: [0, 0, 0], offsets_mm: [0.117, 0.066, 0.058], registers: [1, 2, 3], ra_um: 0.30 }
          ]
        },
        {
          thickness_mm: 19.05,  // 0.75"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [7045], feed_mmpm: [0], offsets_mm: [0.086], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "2nd 50uinRa", approach: "N", epac: [7045, 7241], feed_mmpm: [0, 0], offsets_mm: [0.117, 0.064], registers: [1, 2], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [7045, 7241, 7242], feed_mmpm: [0, 0, 0], offsets_mm: [0.122, 0.069, 0.058], registers: [1, 2, 3], ra_um: 0.30 }
          ]
        },
        {
          thickness_mm: 25.4,  // 1.0"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [7055], feed_mmpm: [0], offsets_mm: [0.086], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "2nd 50uinRa", approach: "N", epac: [7055, 7251], feed_mmpm: [0, 0], offsets_mm: [0.119, 0.066], registers: [1, 2], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [7055, 7251, 7252], feed_mmpm: [0, 0, 0], offsets_mm: [0.124, 0.071, 0.061], registers: [1, 2, 3], ra_um: 0.30 }
          ]
        }
      ]
    },
    {
      wire_diameter_mm: 0.10,  // 0.004"
      wire_type: "BS",
      material: "St",
      method: "Both Away",
      records: [
        {
          thickness_mm: 6.35,  // 0.25"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [1026], feed_mmpm: [0], offsets_mm: [0.064], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "Finish 35", approach: "N", epac: [1026, 1421, 1422, 1423], feed_mmpm: [0, 0, 0, 0], offsets_mm: [0.094, 0.069, 0.058, 0.056], registers: [1, 2, 3, 4], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [1026, 1421, 1422, 1423, 1424], feed_mmpm: [0, 0, 0, 0, 0], offsets_mm: [0.099, 0.074, 0.064, 0.061, 0.058], registers: [1, 2, 3, 4, 5], ra_um: 0.38 }
          ]
        },
        {
          thickness_mm: 12.7,  // 0.5"
          taper_deg: 0,
          passes: [
            { pass_number: 1, label: "Roughing", approach: "N", epac: [1036], feed_mmpm: [0], offsets_mm: [0.066], registers: [1], ra_um: 1.83 },
            { pass_number: 2, label: "Finish 35", approach: "N", epac: [1036, 1431, 1432, 1433], feed_mmpm: [0, 0, 0, 0], offsets_mm: [0.097, 0.071, 0.061, 0.058], registers: [1, 2, 3, 4], ra_um: 0.91 },
            { pass_number: 3, label: "Finish 15", approach: "N", epac: [1036, 1431, 1432, 1433, 1434], feed_mmpm: [0, 0, 0, 0, 0], offsets_mm: [0.102, 0.076, 0.066, 0.064, 0.061], registers: [1, 2, 3, 4, 5], ra_um: 0.38 }
          ]
        }
      ]
    }
  ]
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Wire EDM Machine Tech Data Engine
 *
 * Provides manufacturer-specific cutting parameters based on
 * actual tech table data from major Wire EDM manufacturers.
 */
export class WireEDMMachineTechDataEngine {
  private readonly techFiles: Map<WEDMMachineModel, TechFileData>;

  constructor() {
    this.techFiles = new Map();
    this.techFiles.set("fa_s_vpack", MITSUBISHI_FA_S_VPACK);
    this.techFiles.set("sp43", MAKINO_SP43_SP64);
    this.techFiles.set("sp64", MAKINO_SP43_SP64);  // Same data

    log.info("[WireEDMMachineTechData] Initialized with " + this.techFiles.size + " machine tech files");
  }

  // ==========================================================================
  // PARAMETER LOOKUP
  // ==========================================================================

  /**
   * Look up cutting parameters for given conditions
   */
  lookupParameters(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    target_ra_um?: number;
  }): TechLookupResult {
    const techFile = this.techFiles.get(query.machine);

    if (!techFile) {
      return {
        found: false,
        exact_match: false,
        machine: query.machine,
        wire_diameter_mm: query.wire_diameter_mm,
        material: query.material,
        thickness_mm: query.thickness_mm,
        passes: [],
        source: "not_found"
      };
    }

    // Find matching header
    const header = techFile.headers.find(h =>
      Math.abs(h.wire_diameter_mm - query.wire_diameter_mm) < 0.01 &&
      this.materialsMatch(h.material, query.material)
    );

    if (!header) {
      return {
        found: false,
        exact_match: false,
        machine: query.machine,
        wire_diameter_mm: query.wire_diameter_mm,
        material: query.material,
        thickness_mm: query.thickness_mm,
        passes: [],
        source: "no_matching_header"
      };
    }

    // Find closest thickness record
    const sortedRecords = [...header.records].sort((a, b) =>
      Math.abs(a.thickness_mm - query.thickness_mm) - Math.abs(b.thickness_mm - query.thickness_mm)
    );

    const closestRecord = sortedRecords[0];
    const exactMatch = Math.abs(closestRecord.thickness_mm - query.thickness_mm) < 0.5;

    // If target Ra specified, select appropriate pass count
    let passes = closestRecord.passes;
    if (query.target_ra_um !== undefined) {
      const requiredPasses = this.getMinPassesForRa(closestRecord.passes, query.target_ra_um);
      passes = closestRecord.passes.slice(0, requiredPasses);
    }

    return {
      found: true,
      exact_match: exactMatch,
      machine: query.machine,
      wire_diameter_mm: header.wire_diameter_mm,
      material: header.material,
      method: header.method,
      thickness_mm: closestRecord.thickness_mm,
      passes,
      interpolated: !exactMatch,
      source: `${techFile.manufacturer}_${techFile.machine}_v${techFile.version}`
    };
  }

  /**
   * Get optimal pass count recommendation for target Ra
   */
  recommendPassCount(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    target_ra_um: number;
  }): PassCountRecommendation {
    const lookup = this.lookupParameters({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material,
      thickness_mm: query.thickness_mm
    });

    if (!lookup.found || lookup.passes.length === 0) {
      // Default recommendation
      return {
        target_ra_um: query.target_ra_um,
        recommended_passes: query.target_ra_um < 0.5 ? 4 : query.target_ra_um < 1.0 ? 3 : query.target_ra_um < 2.0 ? 2 : 1,
        achievable_ra_um: query.target_ra_um,
        pass_sequence: [],
        time_factor: 1.0
      };
    }

    // Find minimum passes to achieve target Ra
    const allPasses = lookup.passes;
    let recommendedCount = allPasses.length;
    let achievableRa = allPasses[allPasses.length - 1].ra_um;

    for (let i = 0; i < allPasses.length; i++) {
      const passRa = allPasses[i].ra_um;
      if (passRa <= query.target_ra_um) {
        recommendedCount = i + 1;
        achievableRa = passRa;
        break;
      }
    }

    // Build pass sequence
    const passSequence = allPasses.slice(0, recommendedCount).map((pass, idx) => ({
      pass: idx + 1,
      expected_ra_um: pass.ra_um,
      feed_mmpm: pass.feed_mmpm[idx] || pass.feed_mmpm[0],
      offset_mm: pass.offsets_mm[idx] || pass.offsets_mm[0]
    }));

    // Calculate time factor (rough estimate)
    const timeFactor = recommendedCount;

    return {
      target_ra_um: query.target_ra_um,
      recommended_passes: recommendedCount,
      achievable_ra_um: achievableRa,
      pass_sequence: passSequence,
      time_factor: timeFactor
    };
  }

  /**
   * Get all available thickness values for a machine/wire/material
   */
  getAvailableThicknesses(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
  }): number[] {
    const techFile = this.techFiles.get(query.machine);
    if (!techFile) return [];

    const header = techFile.headers.find(h =>
      Math.abs(h.wire_diameter_mm - query.wire_diameter_mm) < 0.01 &&
      this.materialsMatch(h.material, query.material)
    );

    if (!header) return [];

    return header.records.map(r => r.thickness_mm).sort((a, b) => a - b);
  }

  /**
   * Get feed rate for specific conditions
   */
  getFeedRate(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    pass_number: number;
  }): { feed_mmpm: number; source: string } | null {
    const lookup = this.lookupParameters({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material,
      thickness_mm: query.thickness_mm
    });

    if (!lookup.found) return null;

    const pass = lookup.passes.find(p => p.pass_number === query.pass_number);
    if (!pass) return null;

    const feedIdx = Math.min(query.pass_number - 1, pass.feed_mmpm.length - 1);
    return {
      feed_mmpm: pass.feed_mmpm[feedIdx],
      source: lookup.source
    };
  }

  /**
   * Get wire offset for specific conditions
   */
  getWireOffset(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    pass_number: number;
    total_passes: number;
  }): { offset_mm: number; source: string } | null {
    const lookup = this.lookupParameters({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material,
      thickness_mm: query.thickness_mm
    });

    if (!lookup.found) return null;

    // Find the pass data for total_passes configuration
    const targetPass = lookup.passes.find(p => p.pass_number === query.total_passes);
    if (!targetPass) return null;

    const offsetIdx = Math.min(query.pass_number - 1, targetPass.offsets_mm.length - 1);
    return {
      offset_mm: targetPass.offsets_mm[offsetIdx],
      source: lookup.source
    };
  }

  /**
   * Get EPAC codes for a cutting operation
   */
  getEPACCodes(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    total_passes: number;
  }): { epac_codes: number[]; source: string } | null {
    const lookup = this.lookupParameters({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material,
      thickness_mm: query.thickness_mm
    });

    if (!lookup.found) return null;

    const targetPass = lookup.passes.find(p => p.pass_number === query.total_passes);
    if (!targetPass) return null;

    return {
      epac_codes: targetPass.epac,
      source: lookup.source
    };
  }

  // ==========================================================================
  // INTERPOLATION
  // ==========================================================================

  /**
   * Interpolate parameters for thickness between known values
   */
  interpolateParameters(query: {
    machine: WEDMMachineModel;
    wire_diameter_mm: number;
    material: TechMaterial;
    thickness_mm: number;
    pass_number: number;
  }): {
    feed_mmpm: number;
    offset_mm: number;
    expected_ra_um: number;
    interpolated: boolean;
  } | null {
    const thicknesses = this.getAvailableThicknesses({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material
    });

    if (thicknesses.length === 0) return null;

    // Find bracketing thicknesses
    const lower = thicknesses.filter(t => t <= query.thickness_mm).pop();
    const upper = thicknesses.find(t => t >= query.thickness_mm);

    if (lower === undefined && upper === undefined) return null;

    // Exact match
    if (lower === query.thickness_mm || upper === query.thickness_mm) {
      const lookup = this.lookupParameters({
        machine: query.machine,
        wire_diameter_mm: query.wire_diameter_mm,
        material: query.material,
        thickness_mm: query.thickness_mm
      });

      if (!lookup.found) return null;

      const pass = lookup.passes.find(p => p.pass_number === query.pass_number);
      if (!pass) return null;

      const idx = Math.min(query.pass_number - 1, pass.feed_mmpm.length - 1);
      return {
        feed_mmpm: pass.feed_mmpm[idx],
        offset_mm: pass.offsets_mm[idx],
        expected_ra_um: pass.ra_um,
        interpolated: false
      };
    }

    // Interpolate between lower and upper
    if (lower !== undefined && upper !== undefined) {
      const lowerData = this.lookupParameters({
        machine: query.machine,
        wire_diameter_mm: query.wire_diameter_mm,
        material: query.material,
        thickness_mm: lower
      });

      const upperData = this.lookupParameters({
        machine: query.machine,
        wire_diameter_mm: query.wire_diameter_mm,
        material: query.material,
        thickness_mm: upper
      });

      if (!lowerData.found || !upperData.found) return null;

      const lowerPass = lowerData.passes.find(p => p.pass_number === query.pass_number);
      const upperPass = upperData.passes.find(p => p.pass_number === query.pass_number);

      if (!lowerPass || !upperPass) return null;

      const ratio = (query.thickness_mm - lower) / (upper - lower);
      const idx = Math.min(query.pass_number - 1, lowerPass.feed_mmpm.length - 1);

      return {
        feed_mmpm: lowerPass.feed_mmpm[idx] + ratio * (upperPass.feed_mmpm[idx] - lowerPass.feed_mmpm[idx]),
        offset_mm: lowerPass.offsets_mm[idx] + ratio * (upperPass.offsets_mm[idx] - lowerPass.offsets_mm[idx]),
        expected_ra_um: lowerPass.ra_um + ratio * (upperPass.ra_um - lowerPass.ra_um),
        interpolated: true
      };
    }

    // Extrapolate from nearest
    const nearest = lower ?? upper!;
    const lookup = this.lookupParameters({
      machine: query.machine,
      wire_diameter_mm: query.wire_diameter_mm,
      material: query.material,
      thickness_mm: nearest
    });

    if (!lookup.found) return null;

    const pass = lookup.passes.find(p => p.pass_number === query.pass_number);
    if (!pass) return null;

    const idx = Math.min(query.pass_number - 1, pass.feed_mmpm.length - 1);

    // Apply thickness correction factor
    const thicknessRatio = query.thickness_mm / nearest;
    const feedCorrection = 1 / Math.sqrt(thicknessRatio);  // Feed decreases with thickness

    return {
      feed_mmpm: pass.feed_mmpm[idx] * feedCorrection,
      offset_mm: pass.offsets_mm[idx] * (1 + (thicknessRatio - 1) * 0.1),  // Offset increases slightly
      expected_ra_um: pass.ra_um,
      interpolated: true
    };
  }

  // ==========================================================================
  // MACHINE INFO
  // ==========================================================================

  /**
   * Get all available machines
   */
  getAvailableMachines(): WEDMMachineModel[] {
    return Array.from(this.techFiles.keys());
  }

  /**
   * Get tech file summary for a machine
   */
  getMachineSummary(machine: WEDMMachineModel): {
    manufacturer: WEDMManufacturer;
    control: string;
    units: string;
    wire_diameters: number[];
    materials: TechMaterial[];
    methods: TechMethod[];
    thickness_range: [number, number];
    max_passes: number;
  } | null {
    const techFile = this.techFiles.get(machine);
    if (!techFile) return null;

    const wireDiameters = [...new Set(techFile.headers.map(h => h.wire_diameter_mm))];
    const materials = [...new Set(techFile.headers.map(h => h.material))];
    const methods = [...new Set(techFile.headers.map(h => h.method))];

    const allThicknesses = techFile.headers.flatMap(h => h.records.map(r => r.thickness_mm));
    const thicknessRange: [number, number] = [
      Math.min(...allThicknesses),
      Math.max(...allThicknesses)
    ];

    const maxPasses = Math.max(...techFile.headers.flatMap(h =>
      h.records.flatMap(r => r.passes.map(p => p.pass_number))
    ));

    return {
      manufacturer: techFile.manufacturer,
      control: techFile.control,
      units: techFile.units,
      wire_diameters: wireDiameters,
      materials,
      methods,
      thickness_range: thicknessRange,
      max_passes: maxPasses
    };
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get engine status
   */
  getStatus(): {
    machines: number;
    total_records: number;
    manufacturers: WEDMManufacturer[];
    wire_diameters: number[];
    thickness_range: [number, number];
  } {
    let totalRecords = 0;
    const manufacturers: Set<WEDMManufacturer> = new Set();
    const wireDiameters: Set<number> = new Set();
    let minThickness = Infinity;
    let maxThickness = 0;

    for (const techFile of this.techFiles.values()) {
      manufacturers.add(techFile.manufacturer);
      for (const header of techFile.headers) {
        wireDiameters.add(header.wire_diameter_mm);
        for (const record of header.records) {
          totalRecords++;
          minThickness = Math.min(minThickness, record.thickness_mm);
          maxThickness = Math.max(maxThickness, record.thickness_mm);
        }
      }
    }

    return {
      machines: this.techFiles.size,
      total_records: totalRecords,
      manufacturers: Array.from(manufacturers),
      wire_diameters: Array.from(wireDiameters).sort((a, b) => a - b),
      thickness_range: [minThickness, maxThickness]
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private materialsMatch(techMaterial: TechMaterial, queryMaterial: TechMaterial): boolean {
    const normalized = (m: TechMaterial): string => {
      switch (m) {
        case "STEEL":
        case "St":
          return "steel";
        case "Cu":
          return "copper";
        case "CARBIDE":
          return "carbide";
        case "AL":
          return "aluminum";
        case "TI":
          return "titanium";
        case "INCONEL":
          return "inconel";
        default:
          return m.toLowerCase();
      }
    };

    return normalized(techMaterial) === normalized(queryMaterial);
  }

  private getMinPassesForRa(passes: TechPassData[], targetRa: number): number {
    for (let i = 0; i < passes.length; i++) {
      if (passes[i].ra_um <= targetRa) {
        return i + 1;
      }
    }
    return passes.length;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wireEDMMachineTechDataEngine = new WireEDMMachineTechDataEngine();
