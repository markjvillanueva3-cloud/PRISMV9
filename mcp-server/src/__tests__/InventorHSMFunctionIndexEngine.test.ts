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

  describe("3D HSM Operations (U-CAM27)", () => {
    it("includes 3d_hsm section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("3d_hsm");
    });

    it("returns 3d_hsm section with 12 operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("3d_hsm");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("3d_hsm");
        expect(Object.keys(section.operations).length).toBe(12);
      }
    });

    it("includes adaptive_3d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const adaptive = ops.find((op) => op.operation_id === "adaptive_3d");
      expect(adaptive).toBeDefined();
      expect(adaptive?.display_name).toBe("Adaptive Clearing 3D");
      expect(adaptive?.category).toBe("roughing");
    });

    it("includes contour_3d operation (waterline)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const contour = ops.find((op) => op.operation_id === "contour_3d");
      expect(contour).toBeDefined();
      expect(contour?.display_name).toBe("Contour 3D");
      expect(contour?.category).toBe("finishing");
    });

    it("includes parallel_3d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const parallel = ops.find((op) => op.operation_id === "parallel_3d");
      expect(parallel).toBeDefined();
      expect(parallel?.display_name).toBe("Parallel");
    });

    it("includes scallop_3d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const scallop = ops.find((op) => op.operation_id === "scallop_3d");
      expect(scallop).toBeDefined();
      expect(scallop?.display_name).toBe("Scallop");
    });

    it("includes pencil_3d operation (rest finishing)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const pencil = ops.find((op) => op.operation_id === "pencil_3d");
      expect(pencil).toBeDefined();
      expect(pencil?.category).toBe("finishing");
    });

    it("includes steep_shallow_3d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const steepShallow = ops.find((op) => op.operation_id === "steep_shallow_3d");
      expect(steepShallow).toBeDefined();
      expect(steepShallow?.display_name).toBe("Steep and Shallow");
    });

    it("includes morphed_spiral_3d operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const morphed = ops.find((op) => op.operation_id === "morphed_spiral_3d");
      expect(morphed).toBeDefined();
    });

    it("includes all 12 3D operations", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const ops3d = ops.filter((op) => op.section === "3d_hsm");
      expect(ops3d.length).toBe(12);
      const expectedOps = [
        "adaptive_3d", "pocket_clearing_3d", "parallel_3d", "contour_3d",
        "scallop_3d", "pencil_3d", "radial_3d", "spiral_3d",
        "morphed_spiral_3d", "steep_shallow_3d", "horizontal_3d", "ramp_3d"
      ];
      for (const expected of expectedOps) {
        expect(ops3d.find((op) => op.operation_id === expected)).toBeDefined();
      }
    });

    it("getHSMOperations includes adaptive_3d", () => {
      const results = InventorHSMFunctionIndexEngine.getHSMOperations();
      const adaptive3d = results.find((r) => r.operation_id === "adaptive_3d");
      expect(adaptive3d).toBeDefined();
      expect(adaptive3d?.section).toBe("3d_hsm");
    });

    it("3d_hsm section has training topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("3d_hsm");
      expect(topics.length).toBeGreaterThan(0);
      expect(topics[0]).toHaveProperty("topic");
      expect(topics[0]).toHaveProperty("key_concepts");
      expect(topics[0]).toHaveProperty("best_practices");
    });

    it("findParameter finds thresholdAngle in steep_shallow_3d", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("thresholdAngle");
      expect(results.length).toBeGreaterThan(0);
      const steepShallow = results.find((r) => r.operation_id === "steep_shallow_3d");
      expect(steepShallow).toBeDefined();
    });

    it("getIndex totals include 3D operations", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // 11 2.5D + 12 3D = 23 minimum
      expect(index.total_operations).toBeGreaterThanOrEqual(23);
    });
  });

  describe("5-Axis Operations (U-CAM28)", () => {
    it("includes 5axis section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("5axis");
    });

    it("returns 5axis section with 9 operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("5axis");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("5axis");
        expect(Object.keys(section.operations).length).toBe(9);
      }
    });

    it("includes swarf_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const swarf = ops.find((op) => op.operation_id === "swarf_5axis");
      expect(swarf).toBeDefined();
      expect(swarf?.display_name).toBe("Swarf");
      expect(swarf?.category).toBe("multi_axis");
    });

    it("includes contour_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const contour = ops.find((op) => op.operation_id === "contour_5axis");
      expect(contour).toBeDefined();
      expect(contour?.display_name).toBe("Multi-Axis Contour");
      expect(contour?.category).toBe("multi_axis");
    });

    it("includes flow_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const flow = ops.find((op) => op.operation_id === "flow_5axis");
      expect(flow).toBeDefined();
      expect(flow?.display_name).toBe("Flow");
    });

    it("includes drilling_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const drilling = ops.find((op) => op.operation_id === "drilling_5axis");
      expect(drilling).toBeDefined();
      expect(drilling?.display_name).toBe("Multi-Axis Drilling");
    });

    it("includes impeller_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const impeller = ops.find((op) => op.operation_id === "impeller_5axis");
      expect(impeller).toBeDefined();
      expect(impeller?.display_name).toBe("Impeller");
    });

    it("includes port_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const port = ops.find((op) => op.operation_id === "port_5axis");
      expect(port).toBeDefined();
      expect(port?.display_name).toBe("Port Machining");
    });

    it("includes tilted_plane_3plus2 operation (3+2 positioning)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const tilted = ops.find((op) => op.operation_id === "tilted_plane_3plus2");
      expect(tilted).toBeDefined();
      expect(tilted?.display_name).toBe("Tilted Work Plane (3+2)");
      expect(tilted?.category).toBe("positioning");
    });

    it("includes deburring_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const deburr = ops.find((op) => op.operation_id === "deburring_5axis");
      expect(deburr).toBeDefined();
      expect(deburr?.display_name).toBe("Deburring / Edge Break");
    });

    it("all 9 operations are present in section", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const ops5axis = ops.filter((op) => op.section === "5axis");
      expect(ops5axis.length).toBe(9);
      const expectedOps = [
        "swarf_5axis", "contour_5axis", "flow_5axis", "drilling_5axis",
        "impeller_5axis", "port_5axis", "tilted_plane_3plus2",
        "trimming_5axis", "deburring_5axis"
      ];
      for (const expected of expectedOps) {
        expect(ops5axis.find((op) => op.operation_id === expected)).toBeDefined();
      }
    });

    it("5axis section has training topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("5axis");
      expect(topics.length).toBeGreaterThan(0);
      expect(topics[0]).toHaveProperty("topic");
      expect(topics[0]).toHaveProperty("key_concepts");
      expect(topics[0]).toHaveProperty("best_practices");
    });

    it("has 8 training topics covering all strategies", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("5axis");
      expect(topics.length).toBe(8);
      const topicNames = topics.map((t) => t.topic);
      expect(topicNames).toContain("Swarf Cutting Fundamentals");
      expect(topicNames).toContain("3+2 Positioning (Tilted Work Plane)");
      expect(topicNames).toContain("Impeller and Blade Machining");
    });

    it("findParameter finds toolAxisMode in swarf_5axis", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("toolAxisMode");
      expect(results.length).toBeGreaterThan(0);
      const swarf = results.find((r) => r.operation_id === "swarf_5axis");
      expect(swarf).toBeDefined();
    });

    it("findParameter finds leadAngle across multiple 5-axis operations", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("leadAngle");
      const ops5axis = results.filter((r) => r.section === "5axis");
      expect(ops5axis.length).toBeGreaterThanOrEqual(5);
    });

    it("getOperationsByCategory returns multi_axis operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("multi_axis");
      expect(results.length).toBeGreaterThanOrEqual(7);
      const swarf = results.find((r) => r.operation_id === "swarf_5axis");
      expect(swarf).toBeDefined();
    });

    it("getOperationsByCategory returns positioning operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("positioning");
      expect(results.length).toBeGreaterThanOrEqual(1);
      const tilted = results.find((r) => r.operation_id === "tilted_plane_3plus2");
      expect(tilted).toBeDefined();
    });

    it("getIndex totals include 5-axis operations", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // 11 2.5D + 12 3D + 9 5axis = 32 minimum
      expect(index.total_operations).toBeGreaterThanOrEqual(32);
    });

    it("5axis operations have parameter_count set", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("5axis");
      if (!("error" in section)) {
        for (const [opId, op] of Object.entries(section.operations)) {
          expect(op.parameter_count).toBeGreaterThan(0);
        }
      }
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
