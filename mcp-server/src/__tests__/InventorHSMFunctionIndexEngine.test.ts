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

  describe("Multiaxis Operations (U-CAM29)", () => {
    it("includes multiaxis section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("multiaxis");
    });

    it("returns multiaxis section with 6 operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("multiaxis");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("multiaxis");
        expect(Object.keys(section.operations).length).toBe(6);
      }
    });

    it("includes geodesic_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const geodesic = ops.find((op) => op.operation_id === "geodesic_5axis");
      expect(geodesic).toBeDefined();
      expect(geodesic?.display_name).toBe("Geodesic");
      expect(geodesic?.category).toBe("multiaxis_advanced");
    });

    it("includes rotary_4axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const rotary = ops.find((op) => op.operation_id === "rotary_4axis");
      expect(rotary).toBeDefined();
      expect(rotary?.display_name).toBe("Rotary (4-Axis)");
      expect(rotary?.category).toBe("rotary");
    });

    it("includes wrap_toolpath operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const wrap = ops.find((op) => op.operation_id === "wrap_toolpath");
      expect(wrap).toBeDefined();
      expect(wrap?.display_name).toBe("Wrap");
    });

    it("includes indexed_multiaxis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const indexed = ops.find((op) => op.operation_id === "indexed_multiaxis");
      expect(indexed).toBeDefined();
      expect(indexed?.category).toBe("multiaxis_advanced");
    });

    it("includes morph_between operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const morph = ops.find((op) => op.operation_id === "morph_between");
      expect(morph).toBeDefined();
      expect(morph?.display_name).toBe("Morph Between Curves");
    });

    it("includes projection_5axis operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const proj = ops.find((op) => op.operation_id === "projection_5axis");
      expect(proj).toBeDefined();
      expect(proj?.display_name).toBe("Project Onto Surface");
    });

    it("all 6 operations are present in section", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const opsMultiaxis = ops.filter((op) => op.section === "multiaxis");
      expect(opsMultiaxis.length).toBe(6);
      const expectedOps = [
        "geodesic_5axis", "rotary_4axis", "wrap_toolpath",
        "indexed_multiaxis", "morph_between", "projection_5axis"
      ];
      for (const expected of expectedOps) {
        expect(opsMultiaxis.find((op) => op.operation_id === expected)).toBeDefined();
      }
    });

    it("multiaxis section has 5 training topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("multiaxis");
      expect(topics.length).toBe(5);
      const topicNames = topics.map((t) => t.topic);
      expect(topicNames).toContain("Geodesic Toolpath Strategy");
      expect(topicNames).toContain("4-Axis Rotary Machining");
      expect(topicNames).toContain("Wrap Toolpath Conversion");
    });

    it("getOperationsByCategory returns rotary operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("rotary");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const rotary = results.find((r) => r.operation_id === "rotary_4axis");
      expect(rotary).toBeDefined();
    });

    it("findParameter finds wrapRadius in wrap_toolpath", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("wrapRadius");
      const wrap = results.find((r) => r.operation_id === "wrap_toolpath");
      expect(wrap).toBeDefined();
    });

    it("getIndex totals include multiaxis operations", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // 11 2.5D + 12 3D + 9 5axis + 6 multiaxis = 38 minimum
      expect(index.total_operations).toBeGreaterThanOrEqual(38);
    });
  });

  describe("Turning & Mill-Turn Operations (U-CAM30)", () => {
    it("includes turning section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("turning");
    });

    it("returns turning section with 14 operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("turning");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("turning");
        expect(Object.keys(section.operations).length).toBe(14);
      }
    });

    it("includes profile_roughing operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const roughing = ops.find((op) => op.operation_id === "profile_roughing");
      expect(roughing).toBeDefined();
      expect(roughing?.display_name).toBe("Profile Roughing");
      expect(roughing?.category).toBe("turning_roughing");
    });

    it("includes profile_finishing operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const finishing = ops.find((op) => op.operation_id === "profile_finishing");
      expect(finishing).toBeDefined();
      expect(finishing?.display_name).toBe("Profile Finishing");
      expect(finishing?.category).toBe("turning_finishing");
    });

    it("includes threading operation with all thread forms", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("turning");
      if (!("error" in section)) {
        const threading = section.operations["threading"];
        expect(threading).toBeDefined();
        expect(threading.parameters.geometry.threadForm.values).toContain("metric");
        expect(threading.parameters.geometry.threadForm.values).toContain("unified");
        expect(threading.parameters.geometry.threadForm.values).toContain("acme");
        expect(threading.parameters.passes.infeedMethod.values).toContain("modified_flank");
      }
    });

    it("includes boring operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const boring = ops.find((op) => op.operation_id === "boring");
      expect(boring).toBeDefined();
      expect(boring?.category).toBe("turning_roughing");
    });

    it("includes grooving operation with all groove types", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("turning");
      if (!("error" in section)) {
        const grooving = section.operations["grooving"];
        expect(grooving).toBeDefined();
        expect(grooving.parameters.geometry.grooveType.values).toContain("external");
        expect(grooving.parameters.geometry.grooveType.values).toContain("internal");
        expect(grooving.parameters.geometry.grooveType.values).toContain("face");
      }
    });

    it("includes parting operation with feed reduction", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("turning");
      if (!("error" in section)) {
        const parting = section.operations["parting"];
        expect(parting).toBeDefined();
        expect(parting.parameters.passes.feedReduction).toBeDefined();
        expect(parting.parameters.passes.feedReduction.default).toBe(50);
      }
    });

    it("includes caxis_milling operation (mill-turn)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const caxis = ops.find((op) => op.operation_id === "caxis_milling");
      expect(caxis).toBeDefined();
      expect(caxis?.display_name).toBe("C-Axis Milling");
      expect(caxis?.category).toBe("millturn_milling");
    });

    it("includes yaxis_milling operation (mill-turn)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const yaxis = ops.find((op) => op.operation_id === "yaxis_milling");
      expect(yaxis).toBeDefined();
      expect(yaxis?.display_name).toBe("Y-Axis Milling");
      expect(yaxis?.category).toBe("millturn_milling");
    });

    it("includes baxis_milling operation (mill-turn)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const baxis = ops.find((op) => op.operation_id === "baxis_milling");
      expect(baxis).toBeDefined();
      expect(baxis?.display_name).toBe("B-Axis Milling");
    });

    it("includes stock_transfer operation (mill-turn coordination)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const transfer = ops.find((op) => op.operation_id === "stock_transfer");
      expect(transfer).toBeDefined();
      expect(transfer?.category).toBe("millturn_coordination");
    });

    it("includes synchronized_spindle operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const sync = ops.find((op) => op.operation_id === "synchronized_spindle");
      expect(sync).toBeDefined();
      expect(sync?.display_name).toBe("Synchronized Spindle");
    });

    it("includes back_turning operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const back = ops.find((op) => op.operation_id === "back_turning");
      expect(back).toBeDefined();
      expect(back?.category).toBe("millturn_coordination");
    });

    it("all 14 operations are present in section", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const opsTurning = ops.filter((op) => op.section === "turning");
      expect(opsTurning.length).toBe(14);
      const expectedOps = [
        "profile_roughing", "profile_finishing", "facing", "boring",
        "grooving", "threading", "parting", "drilling_turning",
        "caxis_milling", "yaxis_milling", "baxis_milling",
        "stock_transfer", "synchronized_spindle", "back_turning"
      ];
      for (const expected of expectedOps) {
        expect(opsTurning.find((op) => op.operation_id === expected)).toBeDefined();
      }
    });

    it("turning section has 6 training topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("turning");
      expect(topics.length).toBe(6);
      const topicNames = topics.map((t) => t.topic);
      expect(topicNames).toContain("Turning Roughing Strategies");
      expect(topicNames).toContain("Threading Infeed Methods");
      expect(topicNames).toContain("Mill-Turn Coordination");
    });

    it("getOperationsByCategory returns turning_roughing operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("turning_roughing");
      expect(results.length).toBeGreaterThanOrEqual(3);
      const roughing = results.find((r) => r.operation_id === "profile_roughing");
      expect(roughing).toBeDefined();
    });

    it("getOperationsByCategory returns millturn_milling operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("millturn_milling");
      expect(results.length).toBeGreaterThanOrEqual(3);
      const caxis = results.find((r) => r.operation_id === "caxis_milling");
      expect(caxis).toBeDefined();
    });

    it("findParameter finds infeedMethod in threading", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("infeedMethod");
      const threading = results.find((r) => r.operation_id === "threading");
      expect(threading).toBeDefined();
    });

    it("findParameter finds polarInterpolation in caxis_milling", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("polarInterpolation");
      const caxis = results.find((r) => r.operation_id === "caxis_milling");
      expect(caxis).toBeDefined();
    });

    it("getIndex totals include turning operations", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // 11 2.5D + 12 3D + 9 5axis + 6 multiaxis + 14 turning = 52 minimum
      expect(index.total_operations).toBeGreaterThanOrEqual(52);
    });

    it("turning section has machine_considerations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("turning");
      if (!("error" in section)) {
        const raw = section as any;
        expect(raw.machine_considerations).toBeDefined();
        expect(raw.machine_considerations.lathe_types).toBeDefined();
        expect(raw.machine_considerations.lathe_types.twin_spindle).toBeDefined();
      }
    });
  });

  describe("Drilling & Probing Operations (U-CAM31)", () => {
    it("includes drilling section", () => {
      const sections = InventorHSMFunctionIndexEngine.listSections();
      expect(sections).toContain("drilling");
    });

    it("returns drilling section with 12 operations", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("drilling");
      expect("error" in section).toBe(false);
      if (!("error" in section)) {
        expect(section.section_key).toBe("drilling");
        expect(Object.keys(section.operations).length).toBe(12);
      }
    });

    it("includes drill operation (G81)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const drill = ops.find((op) => op.operation_id === "drill");
      expect(drill).toBeDefined();
      expect(drill?.display_name).toBe("Drill");
      expect(drill?.category).toBe("holemaking");
    });

    it("includes peck_drill operation (G83)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const peck = ops.find((op) => op.operation_id === "peck_drill");
      expect(peck).toBeDefined();
      expect(peck?.display_name).toBe("Peck Drill");
      expect(peck?.category).toBe("holemaking");
    });

    it("includes chip_breaking operation (G73)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const chipBreak = ops.find((op) => op.operation_id === "chip_breaking");
      expect(chipBreak).toBeDefined();
      expect(chipBreak?.display_name).toBe("Chip Breaking");
    });

    it("includes spot_drill operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const spot = ops.find((op) => op.operation_id === "spot_drill");
      expect(spot).toBeDefined();
      expect(spot?.display_name).toBe("Spot Drill");
    });

    it("includes counterbore operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const cbore = ops.find((op) => op.operation_id === "counterbore");
      expect(cbore).toBeDefined();
      expect(cbore?.display_name).toBe("Counterbore");
    });

    it("includes countersink operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const csink = ops.find((op) => op.operation_id === "countersink");
      expect(csink).toBeDefined();
      expect(csink?.display_name).toBe("Countersink");
    });

    it("includes tapping operation (G84)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const tap = ops.find((op) => op.operation_id === "tapping");
      expect(tap).toBeDefined();
      expect(tap?.display_name).toBe("Tap");
      expect(tap?.category).toBe("threading");
    });

    it("includes thread_milling operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const threadMill = ops.find((op) => op.operation_id === "thread_milling");
      expect(threadMill).toBeDefined();
      expect(threadMill?.display_name).toBe("Thread Mill");
      expect(threadMill?.category).toBe("threading");
    });

    it("includes reaming operation (G85)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const ream = ops.find((op) => op.operation_id === "reaming");
      expect(ream).toBeDefined();
      expect(ream?.display_name).toBe("Ream");
      expect(ream?.category).toBe("reaming");
    });

    it("includes boring_precision operation (G76)", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const bore = ops.find((op) => op.operation_id === "boring_precision");
      expect(bore).toBeDefined();
      expect(bore?.display_name).toBe("Bore (Precision)");
      expect(bore?.category).toBe("reaming");
    });

    it("includes probe_geometry operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const probeGeom = ops.find((op) => op.operation_id === "probe_geometry");
      expect(probeGeom).toBeDefined();
      expect(probeGeom?.display_name).toBe("Probe Geometry");
      expect(probeGeom?.category).toBe("probing");
    });

    it("includes probe_work_offset operation", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const probeWCS = ops.find((op) => op.operation_id === "probe_work_offset");
      expect(probeWCS).toBeDefined();
      expect(probeWCS?.display_name).toBe("Probe Work Offset");
      expect(probeWCS?.category).toBe("probing");
    });

    it("all 12 operations are present in section", () => {
      const ops = InventorHSMFunctionIndexEngine.listOperations();
      const opsDrilling = ops.filter((op) => op.section === "drilling");
      expect(opsDrilling.length).toBe(12);
      const expectedOps = [
        "drill", "peck_drill", "chip_breaking", "spot_drill",
        "counterbore", "countersink", "tapping", "thread_milling",
        "reaming", "boring_precision", "probe_geometry", "probe_work_offset"
      ];
      for (const expected of expectedOps) {
        expect(opsDrilling.find((op) => op.operation_id === expected)).toBeDefined();
      }
    });

    it("drilling section has 5 training topics", () => {
      const topics = InventorHSMFunctionIndexEngine.getTrainingTopics("drilling");
      expect(topics.length).toBe(5);
      const topicNames = topics.map((t) => t.topic);
      expect(topicNames).toContain("Drilling Cycle Selection (G81/G83/G73)");
      expect(topicNames).toContain("Thread Milling vs Tapping");
      expect(topicNames).toContain("Precision Boring Cycles");
      expect(topicNames).toContain("Probing for WCS Setup");
      expect(topicNames).toContain("Hole Sequence Optimization");
    });

    it("getOperationsByCategory returns holemaking operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("holemaking");
      expect(results.length).toBeGreaterThanOrEqual(6);
      const drill = results.find((r) => r.operation_id === "drill");
      expect(drill).toBeDefined();
    });

    it("getOperationsByCategory returns threading operations (drilling section)", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("threading");
      const tapOp = results.find((r) => r.operation_id === "tapping");
      const threadMillOp = results.find((r) => r.operation_id === "thread_milling");
      expect(tapOp).toBeDefined();
      expect(threadMillOp).toBeDefined();
    });

    it("getOperationsByCategory returns reaming operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("reaming");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const ream = results.find((r) => r.operation_id === "reaming");
      expect(ream).toBeDefined();
    });

    it("getOperationsByCategory returns probing operations", () => {
      const results = InventorHSMFunctionIndexEngine.getOperationsByCategory("probing");
      expect(results.length).toBeGreaterThanOrEqual(2);
      const probeGeom = results.find((r) => r.operation_id === "probe_geometry");
      expect(probeGeom).toBeDefined();
    });

    it("findParameter finds peckDepth in peck_drill", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("peckDepth");
      const peck = results.find((r) => r.operation_id === "peck_drill");
      expect(peck).toBeDefined();
    });

    it("findParameter finds rigidTapping in tapping", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("rigidTapping");
      const tap = results.find((r) => r.operation_id === "tapping");
      expect(tap).toBeDefined();
    });

    it("findParameter finds orientedStop in boring_precision", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("orientedStop");
      const bore = results.find((r) => r.operation_id === "boring_precision");
      expect(bore).toBeDefined();
    });

    it("findParameter finds workOffset in probe_work_offset", () => {
      const results = InventorHSMFunctionIndexEngine.findParameter("workOffset");
      const probe = results.find((r) => r.operation_id === "probe_work_offset");
      expect(probe).toBeDefined();
    });

    it("drilling section has canned_cycle_reference", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("drilling");
      if (!("error" in section)) {
        const raw = section as any;
        expect(raw.canned_cycle_reference).toBeDefined();
        expect(raw.canned_cycle_reference.drilling).toBeDefined();
        expect(raw.canned_cycle_reference.drilling.G81).toBeDefined();
        expect(raw.canned_cycle_reference.drilling.G83).toBeDefined();
        expect(raw.canned_cycle_reference.boring).toBeDefined();
        expect(raw.canned_cycle_reference.boring.G76).toBeDefined();
        expect(raw.canned_cycle_reference.tapping).toBeDefined();
        expect(raw.canned_cycle_reference.tapping.G84).toBeDefined();
      }
    });

    it("getIndex totals include drilling operations", () => {
      const index = InventorHSMFunctionIndexEngine.getIndex();
      // 11 2.5D + 12 3D + 9 5axis + 6 multiaxis + 14 turning + 12 drilling = 64 minimum
      expect(index.total_operations).toBeGreaterThanOrEqual(64);
    });

    it("drilling operations have parameter_count set", () => {
      const section = InventorHSMFunctionIndexEngine.getSection("drilling");
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
