/**
 * PRISM MCP Server — External Integration API Routes
 * PP-REV-MS5-U-REV34: Public API endpoints for third-party integration
 *
 * POST /optimize      — Full G-code optimization pipeline
 * POST /feedback      — RL learning feedback (program rating)
 * GET  /machines/:id/learning — Machine learning state
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyTokenOrApiKey } from "../middleware/apiKeyAuth.js";

export function createApiExtRouter(callTool: CallToolFn): Router {
  const router = Router();

  // INFRA-MS0: External API routes accept both Bearer tokens and API keys
  router.use(verifyTokenOrApiKey);

  // POST /api/v1/ext/optimize — accepts G-code, returns optimized + report
  router.post("/optimize", async (req, res) => {
    try {
      const { gcode, controller, material_iso, tool_diameter_mm, spindle_rpm,
        feed_rate_mmmin, operation_type, enable_hsm, enable_cross_cam,
        enable_subprogram_extraction } = req.body;

      if (!gcode) {
        res.status(400).json({ ok: false, error: "gcode is required" });
        return;
      }

      // 1. Generate optimization report
      const report = await callTool("prism_product", "ppg_optimization_report", {
        gcode,
        controller: controller || "fanuc",
        material_iso: material_iso || "P",
        tool_diameter_mm: tool_diameter_mm || 12,
        spindle_rpm: spindle_rpm || 8000,
        feed_rate_mmmin: feed_rate_mmmin || 1200,
        operation_type: operation_type || "roughing",
      });

      // 2. Cross-CAM injection if requested
      let crossCam = null;
      if (enable_cross_cam) {
        crossCam = await callTool("prism_product", "ppg_cross_cam_inject", {
          gcode,
          controller: controller || "fanuc",
          enable_cross_cam: true,
          enable_hsm: enable_hsm ?? true,
          enable_feed_optimization: true,
        });
      }

      // 3. Subprogram extraction if requested
      let subprograms = null;
      if (enable_subprogram_extraction) {
        subprograms = await callTool("prism_product", "ppg_subprogram_extract", {
          gcode: crossCam?.gcode || gcode,
          controller: controller || "fanuc",
        });
      }

      // 4. Air-cut detection
      const airCuts = await callTool("prism_product", "ppg_air_cut_detect", {
        gcode: subprograms?.main_program || crossCam?.gcode || gcode,
        controller: controller || "fanuc",
      });

      const optimizedGcode = airCuts?.optimized_gcode
        || subprograms?.main_program
        || crossCam?.gcode
        || gcode;

      res.json({
        ok: true,
        data: {
          optimized_gcode: optimizedGcode,
          report,
          cross_cam: crossCam ? {
            enhancements: crossCam.enhancements_applied,
            cam_sources: crossCam.cam_sources_used,
          } : null,
          subprograms: subprograms ? {
            count: subprograms.subprogram_count,
            savings_percent: subprograms.savings_percent,
            offer: subprograms.offer,
          } : null,
          air_cuts: airCuts ? {
            detections: airCuts.detection_count,
            time_wasted_sec: airCuts.total_time_wasted_sec,
          } : null,
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /api/v1/ext/feedback — RL learning feedback
  router.post("/feedback", async (req, res) => {
    try {
      const { program_id, controller, outcome, execution_time_sec,
        expected_time_sec, surface_quality } = req.body;

      if (!program_id || !outcome) {
        res.status(400).json({ ok: false, error: "program_id and outcome are required" });
        return;
      }

      const validOutcomes = ["ran_great", "too_slow", "surface_rough", "tool_broke", "crashed"];
      if (!validOutcomes.includes(outcome)) {
        res.status(400).json({ ok: false, error: `outcome must be one of: ${validOutcomes.join(", ")}` });
        return;
      }

      const result = await callTool("prism_product", "ppg_rl_feedback", {
        program_id,
        controller: controller || "fanuc",
        outcome,
        execution_time_sec: execution_time_sec ?? 60,
        expected_time_sec: expected_time_sec ?? 60,
        surface_quality: surface_quality ?? (outcome === "ran_great" ? 0.95 : outcome === "surface_rough" ? 0.4 : 0.7),
      });

      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /api/v1/ext/machines/:id/learning — machine learning state
  router.get("/machines/:id/learning", async (req, res) => {
    try {
      const machineId = req.params.id;
      const controller = (req.query.controller as string) || "fanuc";

      // Create a processor for this machine to get its learning state
      const { rlPostProcessorEngine } = await import("../engines/RLPostProcessorEngine.js");
      const processor = rlPostProcessorEngine.createProcessor(controller);
      const stats = rlPostProcessorEngine.stats(processor);

      res.json({
        ok: true,
        data: {
          machine_id: machineId,
          controller,
          learning: {
            total_experiences: stats.totalExperiences,
            optimized_actions: stats.optimizedActions,
            avg_reward: stats.avgReward,
            q_table_size: stats.qTableSize,
            learning_score: Math.min(100, Math.round(stats.totalExperiences * 2.5)),
          },
          summary: `${machineId} — ${stats.totalExperiences} programs optimized, learning score ${Math.min(100, Math.round(stats.totalExperiences * 2.5))}/100`,
        },
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
