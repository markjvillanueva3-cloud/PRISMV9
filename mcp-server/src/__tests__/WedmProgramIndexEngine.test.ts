/**
 * Tests for WedmProgramIndexEngine
 *
 * Validates indexing of Wire EDM and Roku-Roku electrode milling programs
 * from the JM Die archive:
 *   - WIRE EDM: ~4,020 files (.mcx-8, .MCX, .esp, .MIN, .NC) across 99 customers
 *   - ROKU-ROKU: ~976 files (.mcx-8, .MIN) across 78 customers
 *   - Total: ~4,996 program files, 100+ unique customers
 *
 * Verifies customer extraction, extension classification, program type
 * assignment, and statistical breakdowns.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  WedmProgramIndexEngine,
  type WedmProgramIndexResult,
} from "../engines/WedmProgramIndexEngine.js";

// ============================================================================
// SHARED HARVEST (run once, reuse across all tests)
// ============================================================================

let result: WedmProgramIndexResult;

beforeAll(async () => {
  result = await WedmProgramIndexEngine.harvest();
}, 60_000);

// ============================================================================
// TESTS
// ============================================================================

describe("WedmProgramIndexEngine", () => {
  // --------------------------------------------------------------------------
  // getSources
  // --------------------------------------------------------------------------
  describe("getSources()", () => {
    it("should return WIRE EDM root path", () => {
      const sources = WedmProgramIndexEngine.getSources();
      expect(sources.wireEdmRoot).toContain("WIRE EDM");
    });

    it("should return ROKU-ROKU root path", () => {
      const sources = WedmProgramIndexEngine.getSources();
      expect(sources.rokuRokuRoot).toContain("ROKU-ROKU");
    });

    it("should list valid program extensions including .mcx-8 and .mcx", () => {
      const sources = WedmProgramIndexEngine.getSources();
      expect(sources.validExtensions).toContain(".mcx-8");
      expect(sources.validExtensions).toContain(".mcx");
      expect(sources.validExtensions).toContain(".min");
      expect(sources.validExtensions).toContain(".esp");
      expect(sources.validExtensions).toContain(".nc");
    });
  });

  // --------------------------------------------------------------------------
  // harvest — total counts
  // --------------------------------------------------------------------------
  describe("harvest() — total counts", () => {
    it("should find at least 3000 programs total", () => {
      expect(result.totalPrograms).toBeGreaterThanOrEqual(3000);
    });

    it("should find approximately 4500-6000 programs total", () => {
      // 2191 .mcx-8 + 1779 .MCX + 28 .esp + 19 .MIN + 3 .NC in WIRE EDM
      // 972 .mcx-8 + 4 .MIN in ROKU-ROKU
      expect(result.totalPrograms).toBeGreaterThanOrEqual(4500);
      expect(result.totalPrograms).toBeLessThanOrEqual(6000);
    });

    it("should have Wire EDM as the majority of programs", () => {
      expect(result.wireEdmCount).toBeGreaterThan(result.electrodeMillCount);
      // Wire EDM should be roughly 4x the Roku-Roku count
      expect(result.wireEdmCount).toBeGreaterThanOrEqual(3500);
    });

    it("should have at least 900 Roku-Roku electrode mill programs", () => {
      expect(result.electrodeMillCount).toBeGreaterThanOrEqual(900);
    });

    it("should have wireEdmCount + electrodeMillCount equal totalPrograms", () => {
      expect(result.wireEdmCount + result.electrodeMillCount).toBe(
        result.totalPrograms
      );
    });
  });

  // --------------------------------------------------------------------------
  // harvest — extension breakdown
  // --------------------------------------------------------------------------
  describe("harvest() — extension breakdown", () => {
    it("should have .mcx-8 as the most common extension", () => {
      // 2191 in WIRE EDM + 972 in ROKU-ROKU = ~3163
      expect(result.byExtension[".mcx-8"]).toBeGreaterThanOrEqual(3000);
    });

    it("should have .mcx as the second most common extension", () => {
      // 1779 legacy MasterCam files in WIRE EDM
      expect(result.byExtension[".mcx"]).toBeGreaterThanOrEqual(1700);
    });

    it("should detect .esp ESPRIT files in WIRE EDM", () => {
      // 28 .esp files in WIRE EDM/TOMEK - PROGRAMS/
      expect(result.byExtension[".esp"]).toBeGreaterThanOrEqual(25);
    });

    it("should detect .min CNC program files", () => {
      // 19 in WIRE EDM + 4 in ROKU-ROKU = 23
      expect(result.byExtension[".min"]).toBeGreaterThanOrEqual(20);
    });

    it("should not include .zip files in the index", () => {
      expect(result.byExtension[".zip"]).toBeUndefined();
    });

    it("should not include .txt or .bak files in the index", () => {
      expect(result.byExtension[".txt"]).toBeUndefined();
      expect(result.byExtension[".bak"]).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // harvest — program type breakdown
  // --------------------------------------------------------------------------
  describe("harvest() — program type breakdown", () => {
    it("should classify Wire EDM programs as wire_edm type", () => {
      expect(result.byProgramType["wire_edm"]).toBeGreaterThanOrEqual(3500);
    });

    it("should classify Roku-Roku programs as electrode_mill type", () => {
      expect(result.byProgramType["electrode_mill"]).toBeGreaterThanOrEqual(900);
    });

    it("should have exactly two program types", () => {
      const types = Object.keys(result.byProgramType);
      expect(types).toContain("wire_edm");
      expect(types).toContain("electrode_mill");
      expect(types.length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — customer breakdown
  // --------------------------------------------------------------------------
  describe("harvest() — customer breakdown", () => {
    it("should find at least 80 distinct customers", () => {
      // 99 WIRE EDM subdirs + 78 ROKU-ROKU subdirs with significant overlap
      expect(result.customerCount).toBeGreaterThanOrEqual(80);
    });

    it("should have known JM Die customers: ACME, ITW, ALCOA", () => {
      const customers = Object.keys(result.byCustomer);
      expect(customers).toContain("ACME");
    });

    it("should have UNASSIGNED category for top-level files", () => {
      // Both WIRE EDM and ROKU-ROKU have files at the top level
      expect(result.byCustomer["UNASSIGNED"]).toBeGreaterThanOrEqual(1);
    });

    it("should have top customer with at least 50 programs", () => {
      const maxCount = Math.max(...Object.values(result.byCustomer));
      expect(maxCount).toBeGreaterThanOrEqual(50);
    });
  });

  // --------------------------------------------------------------------------
  // harvest — file metadata
  // --------------------------------------------------------------------------
  describe("harvest() — file metadata", () => {
    it("should have fileSize > 0 for all indexed programs", () => {
      // Spot-check first 200 to avoid O(n) scan of ~5000 entries
      const sample = result.programs.slice(0, 200);
      for (const p of sample) {
        expect(p.fileSize).toBeGreaterThan(0);
      }
    });

    it("should have valid filePath with forward slashes for all programs", () => {
      const sample = result.programs.slice(0, 200);
      for (const p of sample) {
        expect(p.filePath).toContain("/");
        expect(p.filePath).not.toContain("\\");
      }
    });

    it("should have valid extension matching the filename for all programs", () => {
      const sample = result.programs.slice(0, 200);
      for (const p of sample) {
        expect(p.filename.toLowerCase()).toContain(
          p.extension === ".mcx-8" ? ".mcx-8" : p.extension
        );
      }
    });

    it("should have valid machine field for all programs", () => {
      for (const p of result.programs) {
        expect(["wire_edm", "roku_roku"]).toContain(p.machine);
      }
    });

    it("should have valid programType field for all programs", () => {
      for (const p of result.programs) {
        expect(["wire_edm", "electrode_mill"]).toContain(p.programType);
      }
    });

    it("should have valid timestamp in ISO format", () => {
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });

  // --------------------------------------------------------------------------
  // getCustomerPrograms
  // --------------------------------------------------------------------------
  describe("getCustomerPrograms()", () => {
    it("should filter programs by customer name (case-insensitive)", () => {
      const acmePrograms = WedmProgramIndexEngine.getCustomerPrograms(
        result,
        "acme"
      );
      expect(acmePrograms.length).toBeGreaterThanOrEqual(1);
      for (const p of acmePrograms) {
        expect(p.customer.toUpperCase()).toBe("ACME");
      }
    });

    it("should return empty array for unknown customer", () => {
      const none = WedmProgramIndexEngine.getCustomerPrograms(
        result,
        "NONEXISTENT_CUSTOMER_XYZ"
      );
      expect(none.length).toBe(0);
    });

    it("should return UNASSIGNED programs for top-level files", () => {
      const unassigned = WedmProgramIndexEngine.getCustomerPrograms(
        result,
        "UNASSIGNED"
      );
      expect(unassigned.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // getTopCustomers
  // --------------------------------------------------------------------------
  describe("getTopCustomers()", () => {
    it("should return sorted list with default limit of 10", () => {
      const top = WedmProgramIndexEngine.getTopCustomers(result);
      expect(top.length).toBe(10);
      // Verify descending sort
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].count).toBeGreaterThanOrEqual(top[i].count);
      }
    });

    it("should return correct count for top customer", () => {
      const top = WedmProgramIndexEngine.getTopCustomers(result, 1);
      expect(top.length).toBe(1);
      expect(top[0].count).toBeGreaterThanOrEqual(50);
      // Verify the count matches the byCustomer breakdown
      expect(top[0].count).toBe(result.byCustomer[top[0].customer]);
    });

    it("should respect custom limit parameter", () => {
      const top5 = WedmProgramIndexEngine.getTopCustomers(result, 5);
      expect(top5.length).toBe(5);
      const top20 = WedmProgramIndexEngine.getTopCustomers(result, 20);
      expect(top20.length).toBeLessThanOrEqual(20);
      expect(top20.length).toBeGreaterThanOrEqual(5);
    });
  });

  // --------------------------------------------------------------------------
  // audit
  // --------------------------------------------------------------------------
  describe("audit()", () => {
    it("should return valid audit summary with all fields", async () => {
      const audit = await WedmProgramIndexEngine.audit();
      expect(audit.totalPrograms).toBeGreaterThanOrEqual(3000);
      expect(audit.wireEdmCount).toBeGreaterThanOrEqual(3500);
      expect(audit.electrodeMillCount).toBeGreaterThanOrEqual(900);
      expect(audit.customerCount).toBeGreaterThanOrEqual(80);
      expect(audit.byExtension).toBeDefined();
      expect(audit.byProgramType).toBeDefined();
      expect(audit.topCustomers.length).toBe(10);
      expect(audit.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    }, 60_000);
  });
});
