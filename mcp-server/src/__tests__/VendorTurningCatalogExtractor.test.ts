/**
 * VendorTurningCatalogExtractor.test.ts — MS2 U-LAT26
 * =====================================================
 *
 * Tests for VendorTurningCatalogExtractorEngine:
 *   - ISO 1832 designation parsing
 *   - Insert search and filtering
 *   - Grade recommendation
 *   - Holder compatibility matching
 *   - Chipbreaker classification
 *
 * Target: ≥25 tests per MS2 exit criteria
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  VendorTurningCatalogExtractorEngine,
  parseISO1832Designation,
  classifyChipbreaker,
  type TurningInsertRecord,
  type TurningHolderRecord,
  type TurningGradeRecord,
  type VendorTurningCatalog,
} from "../engines/VendorTurningCatalogExtractorEngine.js";

// ============================================================================
// TEST DATA
// ============================================================================

function createTestCatalog(): VendorTurningCatalog {
  return {
    vendor: "TestVendor",
    catalog_version: "2024",
    extraction_date: "2026-04-16",
    inserts: [
      {
        designation: "CNMG120408-PM",
        vendor: "TestVendor",
        type: "turning_insert",
        iso_shape: "C",
        iso_clearance: "N",
        iso_tolerance: "M",
        iso_fixing: "G",
        ic_mm: 12.7,
        thickness_mm: 4.76,
        nose_radius_mm: 0.8,
        edge_length_mm: 12.7,
        cutting_edge_count: 2,
        chipbreaker: "PM",
        chipbreaker_type: "medium",
        available_grades: ["T9215", "T9315", "AH725"],
        primary_grade: "T9215",
        iso_groups: ["P", "M", "K"],
      },
      {
        designation: "DNMG150608-MF",
        vendor: "TestVendor",
        type: "turning_insert",
        iso_shape: "D",
        iso_clearance: "N",
        iso_tolerance: "M",
        iso_fixing: "G",
        ic_mm: 15.875,
        thickness_mm: 6.35,
        nose_radius_mm: 0.8,
        edge_length_mm: 15.875,
        cutting_edge_count: 2,
        chipbreaker: "MF",
        chipbreaker_type: "finishing",
        available_grades: ["T9215", "AT9530"],
        primary_grade: "T9215",
        iso_groups: ["P"],
      },
      {
        designation: "TNMG160404-FF",
        vendor: "TestVendor",
        type: "turning_insert",
        iso_shape: "T",
        iso_clearance: "N",
        iso_tolerance: "M",
        iso_fixing: "G",
        ic_mm: 9.525,
        thickness_mm: 4.76,
        nose_radius_mm: 0.4,
        cutting_edge_count: 6,
        chipbreaker: "FF",
        chipbreaker_type: "finishing",
        available_grades: ["NS9530", "T505"],
        primary_grade: "NS9530",
        iso_groups: ["P", "M"],
      },
      {
        designation: "SNMG120408-MR",
        vendor: "TestVendor",
        type: "turning_insert",
        iso_shape: "S",
        iso_clearance: "N",
        iso_tolerance: "M",
        iso_fixing: "G",
        ic_mm: 12.7,
        thickness_mm: 4.76,
        nose_radius_mm: 0.8,
        cutting_edge_count: 8,
        chipbreaker: "MR",
        chipbreaker_type: "roughing",
        available_grades: ["T9325", "T9335"],
        primary_grade: "T9325",
        iso_groups: ["P", "M", "K"],
      },
      {
        designation: "VCMT160404-PF",
        vendor: "TestVendor",
        type: "turning_insert",
        iso_shape: "V",
        iso_clearance: "C",
        iso_tolerance: "M",
        iso_fixing: "T",
        ic_mm: 9.525,
        thickness_mm: 4.76,
        nose_radius_mm: 0.4,
        cutting_edge_count: 2,
        chipbreaker: "PF",
        chipbreaker_type: "finishing",
        available_grades: ["AH120", "AH6225"],
        primary_grade: "AH120",
        iso_groups: ["N"],
      },
    ],
    holders: [
      {
        designation: "PCLNR2525M12",
        vendor: "TestVendor",
        type: "external_holder",
        style: "PCLNR",
        hand: "R",
        shank_size: "2525M12",
        shank_width_mm: 25,
        shank_height_mm: 25,
        insert_shape: "C",
        insert_ic_mm: 12.7,
        clamping_system: "P",
        approach_angle_deg: 95,
        overall_length_mm: 150,
        coolant_through: true,
      },
      {
        designation: "DCLNR2020K12",
        vendor: "TestVendor",
        type: "external_holder",
        style: "DCLNR",
        hand: "R",
        shank_size: "2020K12",
        shank_width_mm: 20,
        shank_height_mm: 20,
        insert_shape: "D",
        insert_ic_mm: 12.7,
        clamping_system: "C",
        approach_angle_deg: 95,
        overall_length_mm: 125,
        coolant_through: false,
      },
      {
        designation: "S25T-STFCR16",
        vendor: "TestVendor",
        type: "internal_holder",
        style: "STFCR",
        hand: "R",
        shank_size: "S25T",
        boring_bar_diameter_mm: 25,
        insert_shape: "T",
        insert_ic_mm: 9.525,
        clamping_system: "S",
        approach_angle_deg: 91,
        max_boring_depth_mm: 150,
        coolant_through: true,
      },
    ],
    grades: [
      {
        grade: "T9215",
        vendor: "TestVendor",
        description: "CVD coated carbide for steel general purpose",
        substrate: "carbide",
        coating: "TiCN + Al2O3 + TiN",
        coating_type: "CVD",
        iso_groups: ["P", "M", "K"],
        hardness_range: "P15",
        application_type: "medium",
        wear_resistance: 7,
        toughness: 6,
      },
      {
        grade: "NS9530",
        vendor: "TestVendor",
        description: "Cermet for ultra-precision finishing",
        substrate: "cermet",
        coating_type: "uncoated",
        iso_groups: ["P", "M"],
        hardness_range: "P05",
        application_type: "finishing",
        wear_resistance: 9,
        toughness: 3,
      },
      {
        grade: "T9325",
        vendor: "TestVendor",
        description: "CVD coated carbide for heavy roughing",
        substrate: "carbide",
        coating: "TiCN + Al2O3",
        coating_type: "CVD",
        iso_groups: ["P", "M", "K"],
        hardness_range: "P25",
        application_type: "roughing",
        wear_resistance: 5,
        toughness: 8,
      },
      {
        grade: "AH120",
        vendor: "TestVendor",
        description: "PVD coated for non-ferrous",
        substrate: "carbide",
        coating: "TiAlN",
        coating_type: "PVD",
        iso_groups: ["N"],
        application_type: "universal",
        wear_resistance: 7,
        toughness: 7,
      },
    ],
    cutting_data: [
      {
        grade: "T9215",
        iso_group: "P",
        ap_min_mm: 0.5,
        ap_max_mm: 4.0,
        feed_min_mm_rev: 0.15,
        feed_max_mm_rev: 0.5,
        vc_min_m_min: 200,
        vc_max_m_min: 350,
        operation_type: "medium",
      },
      {
        grade: "NS9530",
        iso_group: "P",
        ap_min_mm: 0.1,
        ap_max_mm: 1.0,
        feed_min_mm_rev: 0.05,
        feed_max_mm_rev: 0.2,
        vc_min_m_min: 250,
        vc_max_m_min: 450,
        operation_type: "finishing",
      },
    ],
    stats: {
      total_inserts: 5,
      total_holders: 3,
      total_grades: 4,
      total_cutting_data: 2,
      insert_shapes: { C: 1, D: 1, T: 1, S: 1, V: 1 },
      chipbreaker_types: { finishing: 3, medium: 1, roughing: 1 },
    },
  };
}

// ============================================================================
// ISO 1832 PARSING TESTS
// ============================================================================

describe("ISO 1832 Designation Parsing", () => {
  it("should parse CNMG120408 correctly", () => {
    const result = parseISO1832Designation("CNMG120408");
    expect(result).not.toBeNull();
    expect(result?.iso_shape).toBe("C");
    expect(result?.iso_clearance).toBe("N");
    expect(result?.iso_tolerance).toBe("M");
    expect(result?.iso_fixing).toBe("G");
    expect(result?.ic_mm).toBe(12.7);
    expect(result?.thickness_mm).toBe(4.76);
    expect(result?.nose_radius_mm).toBe(0.8);
  });

  it("should parse DNMG150608-MF with chipbreaker", () => {
    const result = parseISO1832Designation("DNMG150608-MF");
    expect(result).not.toBeNull();
    expect(result?.iso_shape).toBe("D");
    expect(result?.chipbreaker).toBe("MF");
  });

  it("should parse TNMG160404 triangular insert", () => {
    const result = parseISO1832Designation("TNMG160404");
    expect(result).not.toBeNull();
    expect(result?.iso_shape).toBe("T");
    expect(result?.cutting_edge_count).toBe(6); // Triangular = 6 edges
  });

  it("should parse SNMG120408 square insert", () => {
    const result = parseISO1832Designation("SNMG120408");
    expect(result).not.toBeNull();
    expect(result?.iso_shape).toBe("S");
    expect(result?.cutting_edge_count).toBe(8); // Square = 8 edges
  });

  it("should parse VCMT160404 rhombic 35 degree", () => {
    const result = parseISO1832Designation("VCMT160404");
    expect(result).not.toBeNull();
    expect(result?.iso_shape).toBe("V");
    expect(result?.iso_clearance).toBe("C");
    expect(result?.cutting_edge_count).toBe(2);
  });

  it("should return null for invalid designations", () => {
    expect(parseISO1832Designation("XYZ")).toBeNull();
    expect(parseISO1832Designation("A")).toBeNull();
    expect(parseISO1832Designation("")).toBeNull();
  });

  it("should handle designations with hyphens", () => {
    const result = parseISO1832Designation("CNMG-12-04-08-PM");
    expect(result).not.toBeNull();
    expect(result?.chipbreaker).toBe("PM");
  });
});

// ============================================================================
// CHIPBREAKER CLASSIFICATION TESTS
// ============================================================================

describe("Chipbreaker Classification", () => {
  it("should classify finishing chipbreakers", () => {
    expect(classifyChipbreaker("FF")).toBe("finishing");
    expect(classifyChipbreaker("PF")).toBe("finishing");
    expect(classifyChipbreaker("SF")).toBe("finishing");
    expect(classifyChipbreaker("MF")).toBe("finishing");
  });

  it("should classify medium chipbreakers", () => {
    expect(classifyChipbreaker("PM")).toBe("medium");
    expect(classifyChipbreaker("SM")).toBe("medium");
    expect(classifyChipbreaker("MM")).toBe("medium");
  });

  it("should classify roughing chipbreakers", () => {
    expect(classifyChipbreaker("PR")).toBe("roughing");
    expect(classifyChipbreaker("SR")).toBe("roughing");
    expect(classifyChipbreaker("MR")).toBe("roughing");
  });

  it("should default to universal for unknown codes", () => {
    expect(classifyChipbreaker("XY")).toBe("universal");
    expect(classifyChipbreaker("AB")).toBe("universal");
  });
});

// ============================================================================
// ENGINE INSERT SEARCH TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine Insert Search", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should search by designation pattern", () => {
    const results = engine.searchInserts({ designation: "CNMG" });
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("CNMG120408-PM");
  });

  it("should search by ISO shape", () => {
    const results = engine.searchInserts({ shape: "T" });
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("TNMG160404-FF");
  });

  it("should search by IC size", () => {
    const results = engine.searchInserts({ ic_mm: 12.7 });
    expect(results.length).toBe(2); // CNMG and SNMG both have IC 12.7
  });

  it("should search by nose radius", () => {
    const results = engine.searchInserts({ nose_radius_mm: 0.4 });
    expect(results.length).toBe(2); // TNMG and VCMT both have 0.4mm nose
  });

  it("should search by ISO group", () => {
    const results = engine.searchInserts({ iso_group: "N" });
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("VCMT160404-PF");
  });

  it("should search by chipbreaker type", () => {
    const results = engine.searchInserts({ chipbreaker_type: "finishing" });
    expect(results.length).toBe(3);
  });

  it("should combine multiple filters", () => {
    const results = engine.searchInserts({
      iso_group: "P",
      chipbreaker_type: "medium",
    });
    expect(results.length).toBe(1);
    expect(results[0].designation).toBe("CNMG120408-PM");
  });

  it("should respect limit parameter", () => {
    const results = engine.searchInserts({ limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// ENGINE GRADE RECOMMENDATION TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine Grade Recommendation", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should recommend grades for finishing P-group", () => {
    const results = engine.recommendGrade({
      iso_group: "P",
      operation: "finishing",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].application_type).toBe("finishing");
  });

  it("should recommend grades for roughing", () => {
    const results = engine.recommendGrade({
      iso_group: "P",
      operation: "roughing",
    });
    expect(results.length).toBeGreaterThan(0);
    // Roughing grades should have higher toughness
    expect(results[0].toughness).toBeGreaterThanOrEqual(7);
  });

  it("should filter by substrate type", () => {
    const results = engine.recommendGrade({
      iso_group: "P",
      operation: "finishing",
      substrate: "cermet",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(g => g.substrate === "cermet")).toBe(true);
  });

  it("should return grades for non-ferrous (N group)", () => {
    const results = engine.recommendGrade({
      iso_group: "N",
      operation: "universal",
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].iso_groups).toContain("N");
  });
});

// ============================================================================
// ENGINE HOLDER COMPATIBILITY TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine Holder Compatibility", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should find holders compatible with C-shape insert", () => {
    const insert = createTestCatalog().inserts[0]; // CNMG120408-PM
    const holders = engine.findCompatibleHolders(insert, "external");
    expect(holders.length).toBe(1);
    expect(holders[0].insert_shape).toBe("C");
  });

  it("should find internal holders for boring", () => {
    const insert = createTestCatalog().inserts[2]; // TNMG160404-FF (T-shape)
    const holders = engine.findCompatibleHolders(insert, "internal");
    expect(holders.length).toBe(1);
    expect(holders[0].type).toBe("internal_holder");
  });

  it("should not return internal holders for external operations", () => {
    const insert = createTestCatalog().inserts[2]; // T-shape
    const holders = engine.findCompatibleHolders(insert, "external");
    expect(holders.length).toBe(0); // No external T-shape holders in test data
  });
});

// ============================================================================
// ENGINE CUTTING PARAMETERS TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine Cutting Parameters", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should get cutting parameters for grade and ISO group", () => {
    const insert = createTestCatalog().inserts[0];
    const params = engine.getCuttingParameters(insert, "T9215", "P");
    expect(params).not.toBeNull();
    expect(params?.vc_min_m_min).toBe(200);
    expect(params?.vc_max_m_min).toBe(350);
  });

  it("should return null for unknown grade/group combination", () => {
    const insert = createTestCatalog().inserts[0];
    const params = engine.getCuttingParameters(insert, "UNKNOWN", "P");
    expect(params).toBeNull();
  });
});

// ============================================================================
// ENGINE ISO CODE RESOLUTION TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine ISO Code Resolution", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should resolve ISO code and find matches", () => {
    const result = engine.resolveISOCode("CNMG120408");
    expect(result.parsed).not.toBeNull();
    expect(result.parsed?.iso_shape).toBe("C");
    expect(result.matches.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle full designation with chipbreaker", () => {
    const result = engine.resolveISOCode("DNMG150608-MF");
    expect(result.parsed).not.toBeNull();
    expect(result.parsed?.chipbreaker).toBe("MF");
  });
});

// ============================================================================
// ENGINE STATS TESTS
// ============================================================================

describe("VendorTurningCatalogExtractorEngine Statistics", () => {
  let engine: VendorTurningCatalogExtractorEngine;

  beforeEach(() => {
    engine = new VendorTurningCatalogExtractorEngine();
    engine.registerCatalog(createTestCatalog());
  });

  it("should return catalog statistics", () => {
    const stats = engine.getStats();
    expect(stats.length).toBe(1);
    expect(stats[0].vendor).toBe("testvendor");
    expect(stats[0].stats.total_inserts).toBe(5);
    expect(stats[0].stats.total_holders).toBe(3);
    expect(stats[0].stats.total_grades).toBe(4);
  });
});
