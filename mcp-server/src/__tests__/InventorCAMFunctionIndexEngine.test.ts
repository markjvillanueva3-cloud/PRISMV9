/**
 * InventorCAMFunctionIndexEngine Tests — CAM-EXHAUST-MS0/U-CAM32
 *
 * Tests for the unified InventorCAM function index engine.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { InventorCAMFunctionIndexEngine } from "../engines/InventorCAMFunctionIndexEngine.js";

describe("InventorCAMFunctionIndexEngine", () => {
  describe("getUnifiedIndex()", () => {
    it("loads the pre-computed function index", () => {
      const idx = InventorCAMFunctionIndexEngine.getUnifiedIndex();
      expect(idx).not.toBeNull();
      expect(idx?.system_id).toBe("inventor-hsm");
    });

    it("has correct schema version", () => {
      const idx = InventorCAMFunctionIndexEngine.getUnifiedIndex();
      expect(idx?.schemaVersion).toBe(1);
    });

    it("has all 6 sections", () => {
      const idx = InventorCAMFunctionIndexEngine.getUnifiedIndex();
      expect(Object.keys(idx?.sections || {}).length).toBe(6);
      expect(idx?.sections["2.5d_milling"]).toBeDefined();
      expect(idx?.sections["3d_hsm"]).toBeDefined();
      expect(idx?.sections["5axis"]).toBeDefined();
      expect(idx?.sections["multiaxis"]).toBeDefined();
      expect(idx?.sections["turning"]).toBeDefined();
      expect(idx?.sections["drilling"]).toBeDefined();
    });
  });

  describe("getSummary()", () => {
    it("returns correct total operations count", () => {
      const summary = InventorCAMFunctionIndexEngine.getSummary();
      expect(summary.total_operations).toBe(64);
    });

    it("returns correct total parameters count", () => {
      const summary = InventorCAMFunctionIndexEngine.getSummary();
      expect(summary.total_parameters).toBe(873);
    });

    it("returns 6 sections", () => {
      const summary = InventorCAMFunctionIndexEngine.getSummary();
      expect(summary.total_sections).toBe(6);
    });

    it("returns 18 categories", () => {
      const summary = InventorCAMFunctionIndexEngine.getSummary();
      expect(summary.total_categories).toBe(18);
    });

    it("returns 31 training topics", () => {
      const summary = InventorCAMFunctionIndexEngine.getSummary();
      expect(summary.total_training_topics).toBe(31);
    });
  });

  describe("getCategoryBreakdown()", () => {
    it("returns category breakdown", () => {
      const breakdown = InventorCAMFunctionIndexEngine.getCategoryBreakdown();
      expect(breakdown.length).toBeGreaterThan(0);
    });

    it("includes roughing category", () => {
      const breakdown = InventorCAMFunctionIndexEngine.getCategoryBreakdown();
      const roughing = breakdown.find((c) => c.category === "roughing");
      expect(roughing).toBeDefined();
      expect(roughing?.operations.length).toBeGreaterThan(0);
    });

    it("includes finishing category", () => {
      const breakdown = InventorCAMFunctionIndexEngine.getCategoryBreakdown();
      const finishing = breakdown.find((c) => c.category === "finishing");
      expect(finishing).toBeDefined();
    });

    it("includes probing category", () => {
      const breakdown = InventorCAMFunctionIndexEngine.getCategoryBreakdown();
      const probing = breakdown.find((c) => c.category === "probing");
      expect(probing).toBeDefined();
    });
  });

  describe("getCannedCycleReference()", () => {
    it("returns canned cycle mapping", () => {
      const cycles = InventorCAMFunctionIndexEngine.getCannedCycleReference();
      expect(Object.keys(cycles).length).toBeGreaterThanOrEqual(6);
    });

    it("includes G81 simple drilling", () => {
      const cycles = InventorCAMFunctionIndexEngine.getCannedCycleReference();
      expect(cycles["G81"]).toContain("drill");
    });

    it("includes G84 rigid tapping", () => {
      const cycles = InventorCAMFunctionIndexEngine.getCannedCycleReference();
      expect(cycles["G84"]).toContain("tap");
    });

    it("includes G83 peck drilling", () => {
      const cycles = InventorCAMFunctionIndexEngine.getCannedCycleReference();
      expect(cycles["G83"]).toContain("peck");
    });
  });

  describe("getLearningPath()", () => {
    it("returns learning path array", () => {
      const path = InventorCAMFunctionIndexEngine.getLearningPath();
      expect(Array.isArray(path)).toBe(true);
      expect(path.length).toBe(6);
    });

    it("starts with 2.5d_milling", () => {
      const path = InventorCAMFunctionIndexEngine.getLearningPath();
      expect(path[0]).toBe("2.5d_milling");
    });

    it("ends with multiaxis", () => {
      const path = InventorCAMFunctionIndexEngine.getLearningPath();
      expect(path[path.length - 1]).toBe("multiaxis");
    });
  });

  describe("getAllOperations()", () => {
    it("returns all 64 operations", () => {
      const ops = InventorCAMFunctionIndexEngine.getAllOperations();
      expect(ops.length).toBe(64);
    });

    it("includes operation_id and section", () => {
      const ops = InventorCAMFunctionIndexEngine.getAllOperations();
      ops.forEach((op) => {
        expect(op.operation_id).toBeTruthy();
        expect(op.section).toBeTruthy();
      });
    });

    it("includes adaptive_2d operation", () => {
      const ops = InventorCAMFunctionIndexEngine.getAllOperations();
      const adaptive = ops.find((op) => op.operation_id === "adaptive_2d");
      expect(adaptive).toBeDefined();
      expect(adaptive?.section).toBe("2.5d_milling");
    });
  });

  describe("searchByCategory()", () => {
    it("finds roughing operations", () => {
      const ops = InventorCAMFunctionIndexEngine.searchByCategory("roughing");
      expect(ops.length).toBeGreaterThan(0);
    });

    it("finds probing operations", () => {
      const ops = InventorCAMFunctionIndexEngine.searchByCategory("probing");
      expect(ops.length).toBeGreaterThan(0);
    });

    it("returns empty for non-existent category", () => {
      const ops = InventorCAMFunctionIndexEngine.searchByCategory("xyz_fake");
      expect(ops.length).toBe(0);
    });
  });

  describe("getMultiaxisOperations()", () => {
    it("returns multiaxis operations array", () => {
      const ops = InventorCAMFunctionIndexEngine.getMultiaxisOperations();
      expect(Array.isArray(ops)).toBe(true);
      expect(ops.length).toBeGreaterThan(0);
    });

    it("includes swarf_5axis", () => {
      const ops = InventorCAMFunctionIndexEngine.getMultiaxisOperations();
      expect(ops).toContain("swarf_5axis");
    });

    it("includes impeller_5axis", () => {
      const ops = InventorCAMFunctionIndexEngine.getMultiaxisOperations();
      expect(ops).toContain("impeller_5axis");
    });
  });

  describe("getProbingOperations()", () => {
    it("returns probing operations", () => {
      const ops = InventorCAMFunctionIndexEngine.getProbingOperations();
      expect(ops.length).toBe(2);
    });

    it("includes probe_geometry", () => {
      const ops = InventorCAMFunctionIndexEngine.getProbingOperations();
      expect(ops).toContain("probe_geometry");
    });

    it("includes probe_work_offset", () => {
      const ops = InventorCAMFunctionIndexEngine.getProbingOperations();
      expect(ops).toContain("probe_work_offset");
    });
  });

  describe("getAdaptiveOperations()", () => {
    it("returns adaptive clearing operations", () => {
      const ops = InventorCAMFunctionIndexEngine.getAdaptiveOperations();
      expect(ops.length).toBe(2);
    });

    it("includes adaptive_2d", () => {
      const ops = InventorCAMFunctionIndexEngine.getAdaptiveOperations();
      expect(ops).toContain("adaptive_2d");
    });

    it("includes adaptive_3d", () => {
      const ops = InventorCAMFunctionIndexEngine.getAdaptiveOperations();
      expect(ops).toContain("adaptive_3d");
    });
  });

  describe("Re-exported base methods", () => {
    it("getIndex returns function index", () => {
      const idx = InventorCAMFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("inventor-hsm");
    });

    it("listSections returns section keys", () => {
      const sections = InventorCAMFunctionIndexEngine.listSections();
      expect(sections.length).toBe(6);
    });

    it("getSection returns section data", () => {
      const section = InventorCAMFunctionIndexEngine.getSection("drilling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("drilling");
      }
    });

    it("listOperations returns all operations", () => {
      const ops = InventorCAMFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(64);
    });

    it("findParameter finds parameters by name", () => {
      const results = InventorCAMFunctionIndexEngine.findParameter("depth");
      expect(results.length).toBeGreaterThan(0);
    });

    it("searchParameters searches by query", () => {
      const results = InventorCAMFunctionIndexEngine.searchParameters("feed");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Cross-references integrity", () => {
    it("all canned cycle references map to valid operations", () => {
      const cycles = InventorCAMFunctionIndexEngine.getCannedCycleReference();
      const ops = InventorCAMFunctionIndexEngine.listOperations();
      const opIds = ops.map((o) => o.operation_id);

      for (const [cycle, desc] of Object.entries(cycles)) {
        const opMatch = desc.split(" ")[0];
        expect(opIds.some((id) => desc.toLowerCase().includes(id))).toBe(true);
      }
    });

    it("multiaxis operations exist in index", () => {
      const multiaxisOps = InventorCAMFunctionIndexEngine.getMultiaxisOperations();
      const allOps = InventorCAMFunctionIndexEngine.listOperations();
      const opIds = allOps.map((o) => o.operation_id);

      for (const op of multiaxisOps) {
        expect(opIds).toContain(op);
      }
    });

    it("probing operations exist in index", () => {
      const probingOps = InventorCAMFunctionIndexEngine.getProbingOperations();
      const allOps = InventorCAMFunctionIndexEngine.listOperations();
      const opIds = allOps.map((o) => o.operation_id);

      for (const op of probingOps) {
        expect(opIds).toContain(op);
      }
    });
  });
});
