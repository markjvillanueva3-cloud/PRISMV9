/**
 * MarksMultusPatterns.test.ts — MS5 U-LAT40-U-LAT42 Test Suite (T045)
 *
 * Regression guard for Mark's MULTUS pattern library.
 * Validates 14 patterns extracted from JM Die's production macros.
 */

import { describe, it, expect } from "vitest";
import {
  MARKS_MULTUS_PATTERNS,
  findPatternById,
  getPatternsByCategory,
  searchPatterns,
  getPatternsForPartType,
  getPatternsForMaterial,
  getPatternStats,
} from "../data/marks-multus-patterns.js";

describe("MarksMultusPatterns — MS5 Regression Guard", () => {
  // ============================================================================
  // Catalog Loading
  // ============================================================================

  describe("Catalog Loading", () => {
    it("should load 14 Mark's MULTUS patterns", () => {
      expect(MARKS_MULTUS_PATTERNS.length).toBe(14);
    });

    it("should have all required fields for each pattern", () => {
      for (const pattern of MARKS_MULTUS_PATTERNS) {
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.category).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.use_case).toBeDefined();
        expect(pattern.machine_type).toBeDefined();
        expect(pattern.controller).toBeDefined();
        expect(Array.isArray(pattern.part_types)).toBe(true);
        expect(Array.isArray(pattern.material_groups)).toBe(true);
      }
    });

    it("should have unique IDs", () => {
      const ids = new Set<string>();
      for (const pattern of MARKS_MULTUS_PATTERNS) {
        expect(ids.has(pattern.id)).toBe(false);
        ids.add(pattern.id);
      }
    });
  });

  // ============================================================================
  // Category Coverage
  // ============================================================================

  describe("Category Coverage", () => {
    it("should have macro_structure patterns", () => {
      const patterns = getPatternsByCategory("macro_structure");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have cycle_sequence patterns", () => {
      const patterns = getPatternsByCategory("cycle_sequence");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have cutoff_technique patterns", () => {
      const patterns = getPatternsByCategory("cutoff_technique");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have bar_handling patterns", () => {
      const patterns = getPatternsByCategory("bar_handling");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have parametric patterns", () => {
      const patterns = getPatternsByCategory("parametric");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have safety patterns", () => {
      const patterns = getPatternsByCategory("safety");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });

    it("should have optimization patterns", () => {
      const patterns = getPatternsByCategory("optimization");
      expect(patterns.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // ID Lookup
  // ============================================================================

  describe("ID Lookup", () => {
    it("should find PAT-001 (Parametric Casing Macro)", () => {
      const pattern = findPatternById("PAT-001");
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe("Parametric Casing Macro");
      expect(pattern?.category).toBe("macro_structure");
    });

    it("should find PAT-005 (S1/S2 Cutoff with Grab)", () => {
      const pattern = findPatternById("PAT-005");
      expect(pattern).toBeDefined();
      expect(pattern?.category).toBe("cutoff_technique");
      expect(pattern?.machine_type).toBe("mill_turn");
    });

    it("should find PAT-011 (Safe Start Block)", () => {
      const pattern = findPatternById("PAT-011");
      expect(pattern).toBeDefined();
      expect(pattern?.category).toBe("safety");
    });

    it("should return undefined for non-existent ID", () => {
      const pattern = findPatternById("PAT-999");
      expect(pattern).toBeUndefined();
    });
  });

  // ============================================================================
  // Search
  // ============================================================================

  describe("Search", () => {
    it("should find patterns by name keyword", () => {
      const results = searchPatterns("cutoff");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find patterns by description keyword", () => {
      const results = searchPatterns("parametric");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should find patterns by use case keyword", () => {
      const results = searchPatterns("bar work");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should be case-insensitive", () => {
      const upper = searchPatterns("CASING");
      const lower = searchPatterns("casing");
      expect(upper.length).toBe(lower.length);
    });
  });

  // ============================================================================
  // Part Type Filtering
  // ============================================================================

  describe("Part Type Filtering", () => {
    it("should return patterns for casing parts", () => {
      const patterns = getPatternsForPartType("casing");
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should return patterns for bar_work", () => {
      const patterns = getPatternsForPartType("bar_work");
      expect(patterns.length).toBeGreaterThan(0);
    });

    it("should include 'any' patterns for specific part types", () => {
      const patterns = getPatternsForPartType("shaft");
      // Should include both shaft-specific and 'any' patterns
      expect(patterns.some(p => p.part_types.includes("any"))).toBe(true);
    });
  });

  // ============================================================================
  // Material Group Filtering
  // ============================================================================

  describe("Material Group Filtering", () => {
    it("should return patterns for P-group (steel)", () => {
      const patterns = getPatternsForMaterial("P");
      expect(patterns.length).toBeGreaterThan(5);
    });

    it("should return patterns for M-group (stainless)", () => {
      const patterns = getPatternsForMaterial("M");
      expect(patterns.length).toBeGreaterThan(5);
    });

    it("should return patterns for H-group (hardened)", () => {
      const patterns = getPatternsForMaterial("H");
      expect(patterns.length).toBeGreaterThan(3);
    });
  });

  // ============================================================================
  // Template Validation
  // ============================================================================

  describe("Template Validation", () => {
    it("should have templates for key patterns", () => {
      const pat001 = findPatternById("PAT-001");
      expect(pat001?.template).toBeDefined();
      expect(pat001?.template?.includes("V1")).toBe(true);

      const pat009 = findPatternById("PAT-009");
      expect(pat009?.template).toBeDefined();
      expect(pat009?.template?.includes("RPM")).toBe(true);
    });

    it("should have variables for parametric patterns", () => {
      const pat001 = findPatternById("PAT-001");
      expect(pat001?.variables).toBeDefined();
      expect(pat001?.variables?.length).toBeGreaterThan(5);
    });
  });

  // ============================================================================
  // Safety Notes
  // ============================================================================

  describe("Safety Notes", () => {
    it("should have safety notes for critical patterns", () => {
      const pat005 = findPatternById("PAT-005"); // S1/S2 cutoff
      expect(pat005?.safety_notes).toBeDefined();
      expect(pat005?.safety_notes?.length).toBeGreaterThan(0);

      const pat011 = findPatternById("PAT-011"); // Safe start
      expect(pat011?.safety_notes).toBeDefined();
    });
  });

  // ============================================================================
  // Statistics
  // ============================================================================

  describe("Statistics", () => {
    it("should return correct stats", () => {
      const stats = getPatternStats();
      expect(stats.total).toBe(14);
      expect(stats.by_category.macro_structure).toBeGreaterThan(0);
      expect(stats.by_category.safety).toBeGreaterThan(0);
      expect(stats.by_machine_type.lathe).toBeGreaterThan(0);
      expect(stats.by_controller.okuma_osp).toBeGreaterThan(0);
    });
  });
});
