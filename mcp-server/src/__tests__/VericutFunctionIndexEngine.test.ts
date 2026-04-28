/**
 * VericutFunctionIndexEngine.test.ts — CAM-EXHAUST-MS0/U-CAM-FIDX-25
 *
 * Real-data tests against the four VERICUT (CGTech) catalogs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VericutFunctionIndexEngine } from "../engines/VericutFunctionIndexEngine";

describe("VericutFunctionIndexEngine", () => {
  beforeEach(() => {
    VericutFunctionIndexEngine.resetCache();
  });

  describe("loadIndex / getIndex", () => {
    it("loads all four sections from disk", () => {
      const idx = VericutFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("vericut");
      const keys = Object.keys(idx.sections).sort();
      expect(keys).toEqual(["optimization", "review", "simulation", "verification"]);
    });

    it("aggregates total operations to 16 (4 ops × 4 sections)", () => {
      const idx = VericutFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates total parameters to 240", () => {
      const idx = VericutFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(240);
    });

    it("collects categories across all four sections", () => {
      const idx = VericutFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("collision_detect");
      expect(idx.categories).toContain("optipath");
      expect(idx.categories).toContain("full_machine_sim");
      expect(idx.categories).toContain("design_compare");
    });

    it("caches loaded index — second call returns identical object", () => {
      const a = VericutFunctionIndexEngine.getIndex();
      const b = VericutFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });

    it("resetCache forces a fresh load with stable totals", () => {
      const a = VericutFunctionIndexEngine.getIndex();
      VericutFunctionIndexEngine.resetCache();
      const b = VericutFunctionIndexEngine.getIndex();
      expect(a).not.toBe(b);
      expect(b.total_operations).toBe(16);
      expect(b.total_parameters).toBe(240);
    });
  });

  describe("listSections", () => {
    it("returns the four expected section keys", () => {
      const sections = VericutFunctionIndexEngine.listSections().sort();
      expect(sections).toEqual(["optimization", "review", "simulation", "verification"]);
    });
  });

  describe("getSection", () => {
    it("returns verification section with collision_detect flagship", () => {
      const section = VericutFunctionIndexEngine.getSection("verification");
      expect("error" in section).toBe(false);
      if ("operations" in section) {
        expect(Object.keys(section.operations)).toHaveLength(4);
        expect(section.operations.collision_detect.display_name).toBe("Collision Detection");
        expect(section.operations.collision_detect.parameters.tolerance.rapid_collision_clearance_mm.default).toBe(0.001);
      }
    });

    it("returns optimization with kienzle as default force model", () => {
      const section = VericutFunctionIndexEngine.getSection("optimization");
      if ("operations" in section) {
        const fo = section.operations.force_optimize;
        expect(fo.parameters.force_model.force_model.default).toBe("kienzle");
        expect(fo.parameters.limits.target_force_N.default).toBe(800);
      }
    });

    it("returns simulation with fanuc_31i as default controller", () => {
      const section = VericutFunctionIndexEngine.getSection("simulation");
      if ("operations" in section) {
        const fms = section.operations.full_machine_sim;
        expect(fms.parameters.machine.controller_model.default).toBe("fanuc_31i");
        expect(fms.parameters.kinematics.include_jerk_limits.default).toBe(true);
      }
    });

    it("returns review with renishaw default probe macro", () => {
      const section = VericutFunctionIndexEngine.getSection("review");
      if ("operations" in section) {
        const ipi = section.operations.in_process_inspect;
        expect(ipi.parameters.probe.probe_macro_format.default).toBe("renishaw_o9810");
        expect(ipi.parameters.features.probe_count_per_feature.default).toBe(3);
      }
    });

    it("returns error object with available list for unknown section", () => {
      const result = VericutFunctionIndexEngine.getSection("nonexistent");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Section 'nonexistent' not found");
        expect(result.available).toContain("verification");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations across all sections", () => {
      const ops = VericutFunctionIndexEngine.listOperations();
      expect(ops).toHaveLength(16);
    });

    it("first row has non-empty fields and recognized section", () => {
      const ops = VericutFunctionIndexEngine.listOperations();
      const first = ops[0];
      expect(first.operation_id.length).toBeGreaterThan(0);
      expect(first.display_name.length).toBeGreaterThan(0);
      expect(["verification", "optimization", "simulation", "review"]).toContain(first.section);
      expect(first.category.length).toBeGreaterThan(0);
    });

    it("includes the four flagship operations", () => {
      const ops = VericutFunctionIndexEngine.listOperations();
      const ids = ops.map((o) => o.operation_id);
      const flagshipCount = ids.filter((i) =>
        ["collision_detect", "optipath", "full_machine_sim", "design_compare"].includes(i)
      ).length;
      expect(flagshipCount).toBe(4);
    });
  });

  describe("findParameter", () => {
    it("finds 'voxel_resolution_mm' across multiple ops", () => {
      const hits = VericutFunctionIndexEngine.findParameter("voxel_resolution_mm");
      expect(hits.length).toBeGreaterThanOrEqual(2);
    });

    it("finds 'force_model' only in force_optimize", () => {
      const hits = VericutFunctionIndexEngine.findParameter("force_model");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const fo = hits.find((h) => h.operation_id === "force_optimize");
      expect(fo?.parameter.default).toBe("kienzle");
    });

    it("finds 'rapid_collision_clearance_mm' only in collision_detect", () => {
      const hits = VericutFunctionIndexEngine.findParameter("rapid_collision_clearance_mm");
      expect(hits).toHaveLength(1);
      expect(hits[0].operation_id).toBe("collision_detect");
      expect(hits[0].parameter.default).toBe(0.001);
    });

    it("returns empty array for nonexistent parameter", () => {
      const hits = VericutFunctionIndexEngine.findParameter("xyzzy_no_match");
      expect(hits).toEqual([]);
    });

    it("throws on empty parameter name", () => {
      expect(() => VericutFunctionIndexEngine.findParameter("")).toThrow(
        "findParameter: parameterName must be a non-empty string"
      );
    });

    it("throws on null parameter name", () => {
      expect(() => VericutFunctionIndexEngine.findParameter(null as unknown as string)).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("searches 'tolerance' across multiple sections", () => {
      const results = VericutFunctionIndexEngine.searchParameters("tolerance");
      expect(results.length).toBeGreaterThan(3);
      const sectionsHit = new Set(results.map((r) => r.section));
      expect(sectionsHit.size).toBeGreaterThan(1);
    });

    it("clamps limit to 1", () => {
      const results = VericutFunctionIndexEngine.searchParameters("voxel", 1);
      expect(results).toHaveLength(1);
    });

    it("clamps oversized limit to 500", () => {
      const results = VericutFunctionIndexEngine.searchParameters("feed", 99999);
      expect(results.length).toBeLessThanOrEqual(500);
    });

    it("matches description text — finds 'Kienzle' in force model description", () => {
      const results = VericutFunctionIndexEngine.searchParameters("Kienzle");
      const force = results.find((r) => r.operation_id === "force_optimize");
      expect(force?.section).toBe("optimization");
    });

    it("throws on empty query", () => {
      expect(() => VericutFunctionIndexEngine.searchParameters("")).toThrow(
        "searchParameters: query must be a non-empty string"
      );
    });
  });

  describe("getOperationsByCategory", () => {
    it("matches collision_detect with single hit", () => {
      const ops = VericutFunctionIndexEngine.getOperationsByCategory("collision_detect");
      expect(ops).toHaveLength(1);
      expect(ops[0].operation_id).toBe("collision_detect");
    });

    it("matches case-insensitive 'OPTIMIZE' across multiple ops", () => {
      const ops = VericutFunctionIndexEngine.getOperationsByCategory("OPTIMIZE");
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("force_optimize");
      expect(ids).toContain("feed_optimize");
      expect(ids).toContain("surface_finish_optimize");
    });

    it("returns empty for unknown category", () => {
      const ops = VericutFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
      expect(ops).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => VericutFunctionIndexEngine.getOperationsByCategory("")).toThrow(
        "getOperationsByCategory: category must be a non-empty string"
      );
    });
  });

  describe("getSummary", () => {
    it("reports system_id=vericut, 4 sections, 16 ops, 240 params", () => {
      const s = VericutFunctionIndexEngine.getSummary();
      expect(s.system_id).toBe("vericut");
      expect(s.total_sections).toBe(4);
      expect(s.total_operations).toBe(16);
      expect(s.total_parameters).toBe(240);
    });

    it("each of the 4 section entries reports exactly 4 operations", () => {
      const s = VericutFunctionIndexEngine.getSummary();
      expect(s.sections).toHaveLength(4);
      const counts = s.sections.map((sec) => sec.operations);
      expect(counts).toEqual([4, 4, 4, 4]);
    });
  });

  describe("getVerificationOperations (flagship surface)", () => {
    it("returns the 4 verification operations", () => {
      const ops = VericutFunctionIndexEngine.getVerificationOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "collision_detect",
        "fixture_collision",
        "gouge_check",
        "holder_collision",
      ]);
    });

    it("all returned ops report section='verification'", () => {
      const ops = VericutFunctionIndexEngine.getVerificationOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("verification")).toBe(true);
    });
  });

  describe("getOptimizationOperations (engine-only surface)", () => {
    it("returns the 4 optimization ops", () => {
      const ops = VericutFunctionIndexEngine.getOptimizationOperations();
      expect(ops).toHaveLength(4);
      const ids = ops.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "feed_optimize",
        "force_optimize",
        "optipath",
        "surface_finish_optimize",
      ]);
    });

    it("all from optimization section", () => {
      const ops = VericutFunctionIndexEngine.getOptimizationOperations();
      const sections = new Set(ops.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("optimization")).toBe(true);
    });
  });

  describe("getOperation", () => {
    it("finds optipath in optimization section", () => {
      const result = VericutFunctionIndexEngine.getOperation("optipath");
      if ("operation" in result) {
        expect(result.section).toBe("optimization");
        expect(result.operation.dialog_tabs).toContain("Limits");
      } else {
        expect.fail("expected found op");
      }
    });

    it("finds virtual_machine in simulation section", () => {
      const result = VericutFunctionIndexEngine.getOperation("virtual_machine");
      if ("operation" in result) {
        expect(result.section).toBe("simulation");
        expect(result.operation.parameters.controller.controller_emulation.default).toBe("fanuc_full_emu");
      } else {
        expect.fail("expected found op");
      }
    });

    it("returns error object for unknown operation id", () => {
      const result = VericutFunctionIndexEngine.getOperation("not_a_real_op");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toBe("Operation 'not_a_real_op' not found");
      }
    });

    it("throws on empty operation id", () => {
      expect(() => VericutFunctionIndexEngine.getOperation("")).toThrow(
        "getOperation: operationId must be a non-empty string"
      );
    });
  });

  describe("getTrainingTopics", () => {
    it("returns voxel-based topic for verification section", () => {
      const topics = VericutFunctionIndexEngine.getTrainingTopics("verification");
      expect(topics).toHaveLength(1);
      expect(topics[0].topic).toBe("Voxel-Based Material Removal");
    });

    it("returns OptiPath methodology topic for optimization", () => {
      const topics = VericutFunctionIndexEngine.getTrainingTopics("optimization");
      expect(topics[0].topic).toBe("OptiPath Methodology");
    });

    it("returns Digital Twin topic for simulation", () => {
      const topics = VericutFunctionIndexEngine.getTrainingTopics("simulation");
      expect(topics[0].topic).toBe("Digital Twin vs Geometric Sim");
    });

    it("returns report workflow topic for review", () => {
      const topics = VericutFunctionIndexEngine.getTrainingTopics("review");
      expect(topics[0].topic).toBe("Verification Report Workflow");
    });

    it("returns empty array for unknown section", () => {
      const topics = VericutFunctionIndexEngine.getTrainingTopics("nonexistent");
      expect(topics).toEqual([]);
    });
  });

  describe("VERICUT-specific structural checks", () => {
    it("collision_detect default action is stop_immediately with screenshot capture", () => {
      const result = VericutFunctionIndexEngine.getOperation("collision_detect");
      if ("operation" in result) {
        expect(result.operation.parameters.action.action_on_collision.default).toBe("stop_immediately");
        expect(result.operation.parameters.report.include_3d_screenshots.default).toBe(true);
        expect(result.operation.parameters.tolerance.feed_collision_clearance_mm.default).toBe(0.0);
      }
    });

    it("gouge_check defaults to voxel_subtract method with strict 0mm overcut", () => {
      const result = VericutFunctionIndexEngine.getOperation("gouge_check");
      if ("operation" in result) {
        expect(result.operation.parameters.reference.compare_method.default).toBe("voxel_subtract");
        expect(result.operation.parameters.tolerance.max_overcut_mm.default).toBe(0.0);
      }
    });

    it("holder_collision flags L/D > 4 as chatter risk", () => {
      const result = VericutFunctionIndexEngine.getOperation("holder_collision");
      if ("operation" in result) {
        expect(result.operation.parameters.output.warn_if_extension_LD_high.default).toBe(true);
        expect(result.operation.parameters.output.max_acceptable_LD.default).toBe(4.0);
      }
    });

    it("optipath caps modification at 30%-200% of original feed", () => {
      const result = VericutFunctionIndexEngine.getOperation("optipath");
      if ("operation" in result) {
        expect(result.operation.parameters.limits.min_feed_pct_of_original.default).toBe(30.0);
        expect(result.operation.parameters.limits.max_feed_pct_of_original.default).toBe(200.0);
        expect(result.operation.parameters.limits.max_spindle_load_pct.default).toBe(85.0);
      }
    });

    it("force_optimize defaults to PI_controller feed response with Kienzle model", () => {
      const result = VericutFunctionIndexEngine.getOperation("force_optimize");
      if ("operation" in result) {
        expect(result.operation.parameters.strategy.feed_response_mode.default).toBe("PI_controller");
        expect(result.operation.parameters.force_model.force_model.default).toBe("kienzle");
        expect(result.operation.parameters.strategy.PI_kp.default).toBe(0.5);
      }
    });

    it("full_machine_sim includes jerk limits + singularity check by default", () => {
      const result = VericutFunctionIndexEngine.getOperation("full_machine_sim");
      if ("operation" in result) {
        expect(result.operation.parameters.kinematics.include_jerk_limits.default).toBe(true);
        expect(result.operation.parameters.verify.verify_singularity_zones.default).toBe(true);
        expect(result.operation.parameters.machine.controller_model.default).toBe("fanuc_31i");
      }
    });

    it("post_verify uses all_three comparison method with 1um tolerance", () => {
      const result = VericutFunctionIndexEngine.getOperation("post_verify");
      if ("operation" in result) {
        expect(result.operation.parameters.comparison.compare_method.default).toBe("all_three");
        expect(result.operation.parameters.comparison.match_tolerance_um.default).toBe(1.0);
      }
    });

    it("virtual_machine emulates Fanuc with 200-block lookahead by default", () => {
      const result = VericutFunctionIndexEngine.getOperation("virtual_machine");
      if ("operation" in result) {
        expect(result.operation.parameters.controller.controller_emulation.default).toBe("fanuc_full_emu");
        expect(result.operation.parameters.controller.look_ahead_blocks.default).toBe(200);
        expect(result.operation.parameters.validation.verify_tool_compensation.default).toBe(true);
      }
    });

    it("design_compare colors band: pass=25, warn=50, fail=100 um", () => {
      const result = VericutFunctionIndexEngine.getOperation("design_compare");
      if ("operation" in result) {
        expect(result.operation.parameters.tolerance.color_pass_um.default).toBe(25);
        expect(result.operation.parameters.tolerance.color_warn_um.default).toBe(50);
        expect(result.operation.parameters.tolerance.color_fail_um.default).toBe(100);
      }
    });

    it("report_generate defaults to HTML interactive format", () => {
      const result = VericutFunctionIndexEngine.getOperation("report_generate");
      if ("operation" in result) {
        expect(result.operation.parameters.format.format_type.default).toBe("html_interactive");
        expect(result.operation.parameters.distribution.save_to_part_folder.default).toBe(true);
      }
    });
  });

  describe("dispatcher round-trip (E2E) — U-CAM-FIDX-25 + 25b", () => {
    type Handler = (input: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
    let camHandler: Handler | null = null;

    const captureHandler = async () => {
      if (camHandler) return camHandler;
      const { registerCamDispatcher } = await import("../tools/dispatchers/camDispatcher.js");
      let captured: Handler | null = null;
      const fakeServer = {
        tool: (_n: string, _d: string, _s: unknown, h: Handler) => {
          captured = h;
        },
      };
      registerCamDispatcher(fakeServer);
      if (!captured) throw new Error("camDispatcher did not register handler");
      camHandler = captured;
      return camHandler;
    };

    const callCam = async (action: string, params: Record<string, unknown>) => {
      const handler = await captureHandler();
      const raw = await handler({ action, params });
      const r = raw as { content?: Array<{ text: string }> };
      if (r.content?.[0]?.text) return JSON.parse(r.content[0].text) as Record<string, unknown>;
      return raw as Record<string, unknown>;
    };

    it("camDispatcher exposes all 11 vericut_function_index_* actions in ACTIONS enum", async () => {
      const { ACTIONS } = await import("../tools/dispatchers/camDispatcher.js");
      const expected = [
        "vericut_function_index_get",
        "vericut_function_index_list_sections",
        "vericut_function_index_get_section",
        "vericut_function_index_list_operations",
        "vericut_function_index_find_parameter",
        "vericut_function_index_search_parameters",
        "vericut_function_index_get_operations_by_category",
        "vericut_function_index_get_summary",
        "vericut_function_index_get_verification_operations",
        "vericut_function_index_get_optimization_operations",
        "vericut_function_index_get_operation",
      ];
      for (const a of expected) {
        expect(ACTIONS).toContain(a);
      }
    });

    it("camDispatcher routes get_summary to engine", async () => {
      const res = await callCam("vericut_function_index_get_summary", {});
      expect(res.success).toBe(true);
      expect(res.system_id).toBe("vericut");
      expect(res.total_operations).toBe(16);
      expect(res.total_parameters).toBe(240);
    });

    it("camDispatcher routes get_verification_operations", async () => {
      const res = (await callCam(
        "vericut_function_index_get_verification_operations",
        {}
      )) as { success: boolean; operations: Array<{ operation_id: string }> };
      expect(res.success).toBe(true);
      expect(res.operations).toHaveLength(4);
      const ids = res.operations.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "collision_detect",
        "fixture_collision",
        "gouge_check",
        "holder_collision",
      ]);
    });

    it("camDispatcher routes get_operation with operation_id", async () => {
      const res = (await callCam("vericut_function_index_get_operation", {
        operation_id: "optipath",
      })) as { success: boolean; section: string };
      expect(res.success).toBe(true);
      expect(res.section).toBe("optimization");
    });

    it("camDispatcher routes get_optimization_operations (U-CAM-FIDX-25b OptiPath surface)", async () => {
      const res = (await callCam(
        "vericut_function_index_get_optimization_operations",
        {}
      )) as {
        success: boolean;
        operations: Array<{ operation_id: string; section: string }>;
      };
      expect(res.success).toBe(true);
      expect(res.operations).toHaveLength(4);
      const ids = res.operations.map((o) => o.operation_id).sort();
      expect(ids).toEqual([
        "feed_optimize",
        "force_optimize",
        "optipath",
        "surface_finish_optimize",
      ]);
      const sections = new Set(res.operations.map((o) => o.section));
      expect(sections.size).toBe(1);
      expect(sections.has("optimization")).toBe(true);
    });

    it("camDispatcher routes get_operations_by_category for case-insensitive 'COLLISION'", async () => {
      const res = (await callCam(
        "vericut_function_index_get_operations_by_category",
        { category: "COLLISION" }
      )) as {
        success: boolean;
        operations: Array<{ operation_id: string }>;
      };
      expect(res.success).toBe(true);
      const ids = res.operations.map((o) => o.operation_id);
      expect(ids).toContain("collision_detect");
      expect(ids).toContain("holder_collision");
      expect(ids).toContain("fixture_collision");
    });
  });
});
