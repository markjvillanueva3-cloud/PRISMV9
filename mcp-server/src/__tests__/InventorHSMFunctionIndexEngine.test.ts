/**
 * InventorHSMFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM26
 *
 * Tests for the Inventor HSM function index engine covering:
 * - Index loading and structure
 * - Section access
 * - Operation listing
 * - Parameter search
 * - Category filtering
 * - HSM operation detection
 * - 2.5D operation access
 * - Training topics
 * - Dispatcher wiring verification
 */

import { describe, it, expect } from "vitest";
import { InventorHSMFunctionIndexEngine } from "../engines/InventorHSMFunctionIndexEngine.js";

describe("InventorHSMFunctionIndexEngine", () => {
  describe("getIndex", () => {
    it("returns a valid function index with system_id", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      expect(index.system_id).toBe("inventor-hsm");
      expect(index).toHaveProperty("sections");
      expect(index).toHaveProperty("total_operations");
      expect(index).toHaveProperty("total_parameters");
    });

    it("has non-zero totals when sections exist", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // At minimum, 2.5d-milling.json exists with 11 operations
      expect(index.total_operations).toBeGreaterThanOrEqual(11);
      expect(index.total_parameters).toBeGreaterThanOrEqual(100);
    });

    it("returns consistent results on multiple calls (caching)", () => {
      const index1 = InventorHSMFunctionIndexEngine.getIndex();
      const index2 = InventorHSMFunctionIndexEngine.getIndex();
      expect(index1).toBe(index2); // Same reference = cached
    });
  });

  describe("listSections", () => {
    it("returns array of section keys", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(Array.isArray(sections)).toBe(true);
      expect(sections.length).toBeGreaterThanOrEqual(1);
    });

    it("includes 2.5d_milling section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("2.5d_milling");
    });
  });

  describe("getSection", () => {
    it("returns 2.5d_milling section with operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("2.5d_milling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("2.5d_milling");
        expect(section.operations).toBeDefined();
        expect(Object.keys(section.operations).length).toBeGreaterThanOrEqual(11);
      }
    });

    it("returns error for non-existent section", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("nonexistent_section");
      expect("error" in section).toBe(true);
      if ("error" in section) {
        expect(section.error).toContain("not found");
      }
    });

    it("section has system_id inventor-hsm", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("2.5d_milling");
      if (!("error" in section)) {
        expect(section.system_id).toBe("inventor-hsm");
      }
    });
  });

  describe("listOperations", () => {
    it("returns array of operations with required fields", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      expect(Array.isArray(ops)).toBe(true);
      expect(ops.length).toBeGreaterThanOrEqual(11);

      const firstOp = ops[0];
      expect(firstOp).toHaveProperty("operation_id");
      expect(firstOp).toHaveProperty("display_name");
      expect(firstOp).toHaveProperty("section");
      expect(firstOp).toHaveProperty("category");
    });

    it("includes adaptive_2d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const adaptive = ops.find((op) => op.operation_id === "adaptive_2d");
      expect(adaptive).toBeDefined();
      expect(adaptive?.display_name).toBe("2D Adaptive Clearing");
    });

    it("includes contour_2d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const contour = ops.find((op) => op.operation_id === "contour_2d");
      expect(contour).toBeDefined();
      expect(contour?.category).toBe("finishing");
    });

    it("includes pocket_2d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const pocket = ops.find((op) => op.operation_id === "pocket_2d");
      expect(pocket).toBeDefined();
      expect(pocket?.category).toBe("roughing");
    });
  });

  describe("findParameter", () => {
    it("finds stockToLeave parameter across operations", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("stockToLeave");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("operation_id");
      expect(results[0]).toHaveProperty("section");
      expect(results[0]).toHaveProperty("group");
      expect(results[0]).toHaveProperty("parameter");
    });

    it("finds optimalLoad parameter", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("optimalLoad");
      expect(results.length).toBeGreaterThan(0);
      const adaptive = results.find((r) => r.operation_id === "adaptive_2d");
      expect(adaptive).toBeDefined();
    });

    it("returns empty array for non-existent parameter", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("xyz_nonexistent_param");
      expect(results).toEqual([]);
    });

    it("case-insensitive search works", () => {
      const results1 = InventorHSMFunctionIndexEngine.findParameter("STEPOVER");
      const results2 = InventorHSMFunctionIndexEngine.findParameter("stepover");
      expect(results1.length).toBe(results2.length);
    });
  });

  describe("searchParameters", () => {
    it("searches by parameter name", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("depth");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("parameter_name");
    });

    it("searches by description content", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("tool diameter");
      expect(results.length).toBeGreaterThan(0);
    });

    it("respects limit parameter", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("height", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("returns empty for no matches", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("zzz_no_match_zzz");
      expect(results).toEqual([]);
    });
  });

  describe("getOperationsByCategory", () => {
    it("finds roughing operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("roughing");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.section)).toBe(true);
    });

    it("finds finishing operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("finishing");
      expect(results.length).toBeGreaterThan(0);
      const contour = results.find((r) => r.operation_id === "contour_2d");
      expect(contour).toBeDefined();
    });

    it("finds holemaking operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("holemaking");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for unknown category", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("xyz_unknown");
      expect(results).toEqual([]);
    });
  });

  describe("getSummary", () => {
    it("returns summary with all required fields", () => {
      const summary = InventorHSMFunctionIndexEngine.getSummary();
      expect(summary.system_id).toBe("inventor-hsm");
      expect(summary).toHaveProperty("total_sections");
      expect(summary).toHaveProperty("total_operations");
      expect(summary).toHaveProperty("total_parameters");
      expect(summary).toHaveProperty("sections");
      expect(summary).toHaveProperty("categories");
    });

    it("sections array has key and operations count", () => {
      const summary = InventorHSMFunctionIndexEngine.getSummary();
      expect(summary.sections.length).toBeGreaterThan(0);
      expect(summary.sections[0]).toHaveProperty("key");
      expect(summary.sections[0]).toHaveProperty("operations");
    });

    it("totals are consistent with listed operations", () => {
      const summary = InventorHSMFunctionIndexEngine.getSummary();
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      expect(summary.total_operations).toBeGreaterThanOrEqual(ops.length);
    });
  });

  describe("getHSMOperations", () => {
    it("returns array of HSM/adaptive operations", () => {
      const results = InventorHSMFunctionIndexEngine.getHSMOperations();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("includes adaptive_2d operation", () => {
      const results = InventorHSMFunctionIndexEngine.getHSMOperations();
      const adaptive = results.find((r) => r.operation_id === "adaptive_2d");
      expect(adaptive).toBeDefined();
      expect(adaptive?.display_name).toContain("Adaptive");
    });

    it("HSM operations have constant engagement description", () => {
      const results = InventorHSMFunctionIndexEngine.getHSMOperations();
      const hasEngagement = results.some(
        (r) =>
          r.description.toLowerCase().includes("constant engagement") ||
          r.description.toLowerCase().includes("adaptive")
      );
      expect(hasEngagement).toBe(true);
    });
  });

  describe("get25DOperations", () => {
    it("returns 2.5D milling operations", () => {
      const results = InventorHSMFunctionIndexEngine.get25DOperations();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(11); // 11 operations in 2.5d-milling.json
    });

    it("each operation has required fields", () => {
      const results = InventorHSMFunctionIndexEngine.get25DOperations();
      for (const op of results) {
        expect(op).toHaveProperty("operation_id");
        expect(op).toHaveProperty("display_name");
        expect(op).toHaveProperty("category");
        expect(op).toHaveProperty("parameter_count");
      }
    });

    it("includes all expected 2.5D operations", () => {
      const results = InventorHSMFunctionIndexEngine.get25DOperations();
      const ids = results.map((r) => r.operation_id);
      expect(ids).toContain("adaptive_2d");
      expect(ids).toContain("contour_2d");
      expect(ids).toContain("pocket_2d");
      expect(ids).toContain("face_2d");
      expect(ids).toContain("slot_2d");
      expect(ids).toContain("thread_mill_2d");
    });
  });

  describe("getTrainingTopics", () => {
    it("returns training topics for 2.5d_milling section", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("2.5d_milling");
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBeGreaterThan(0);
    });

    it("each topic has required fields", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("2.5d_milling");
      for (const topic of topics) {
        expect(topic).toHaveProperty("topic");
        expect(topic).toHaveProperty("key_concepts");
        expect(topic).toHaveProperty("best_practices");
        expect(Array.isArray(topic.key_concepts)).toBe(true);
        expect(Array.isArray(topic.best_practices)).toBe(true);
      }
    });

    it("returns empty array for section without topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("Edge cases", () => {
    it("handles empty search query gracefully", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("");
      expect(Array.isArray(results)).toBe(true);
    });

    it("handles special characters in search", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("mm/min");
      expect(Array.isArray(results)).toBe(true);
    });

    it("handles unicode in search", () => {
      const results = InventorHSMFunctionIndexEngine.searchParameters("°");
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

describe("Dispatcher wiring", () => {
  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_list_sections", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_list_sections");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get_section", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get_section");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_list_operations", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_list_operations");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_find_parameter", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_find_parameter");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_search_parameters", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_search_parameters");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get_operations_by_category", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get_operations_by_category");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get_summary", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get_summary");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get_hsm_operations", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get_hsm_operations");
  });

  it("camDispatcher ACTIONS includes inventor_hsm_function_index_get_25d_operations", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const actions: string[] = mod.ACTIONS;
    expect(actions).toContain("inventor_hsm_function_index_get_25d_operations");
  });
});
