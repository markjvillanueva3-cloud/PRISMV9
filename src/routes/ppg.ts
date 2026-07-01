/**
 * PRISM MCP Server — PPG (Post Processor Generator) Product Routes
 * 8 endpoints wrapping canonical PPG product actions plus CAM post-processing
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates ppg router.
 * @param callTool - call tool
 * @returns router
 */
export function createPpgRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /ppg/pipeline — PPG-VAR-MS0: Full 38-stage PostProcessorPipelineEngine
  // Accepts PipelineInput (gcode, machine, material, tools, stages, controller)
  // Returns PipelineOutput (optimized gcode, stages, blocks, analytics)
  router.post("/pipeline", async (req, res) => {
    try {
      const { postProcessorPipelineEngine } = await import("../engines/PostProcessorPipelineEngine.js");
      const result = await postProcessorPipelineEngine.process(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/material/search — PPG-VAR-MS0 U03: Search MaterialRegistry
  router.post("/material/search", async (req, res) => {
    try {
      const result = await callTool("prism_data", "material_search", { query: req.body.query ?? "", limit: 20 });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      // Fallback: return canonical materials from constants
      try {
        const { CANONICAL_MATERIAL_DB } = await import("../physics/constants.js");
        const query = (req.body.query ?? "").toLowerCase();
        const matches = Object.entries(CANONICAL_MATERIAL_DB)
          .filter(([key, mat]) => key.includes(query) || mat.name.toLowerCase().includes(query))
          .slice(0, 20)
          .map(([key, mat]) => ({ id: key, name: mat.name, iso_group: mat.iso_group, kc1_1: mat.kc1_1, mc: mat.mc, hardness_HB: mat.hardness_HB }));
        res.json({ ok: true, data: { materials: matches, source: "canonical" } });
      } catch {
        res.status(500).json({ ok: false, error: e.message });
      }
    }
  });

  // POST /ppg/generate — Generate G-code from toolpath moves
  router.post("/generate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "post_process", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/template — Generate from parametric template (facing, drilling, etc.)
  router.post("/template", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/program — Generate multi-operation program
  router.post("/program", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/validate — Validate G-code for controller compatibility
  router.post("/validate", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_validate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/compare — Compare G-code output across controllers
  router.post("/compare", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_compare", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/optimize — Optimize G-code (reduce motion, merge rapids)
  router.post("/optimize", async (req, res) => {
    try {
      const result = await callTool("prism_calc", "gcode_optimize", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/controllers — List supported CNC controllers
  router.get("/controllers", async (_req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_controllers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── CPS Library Routes (PP-MS1) ─────────────────────────────────────

  // GET /ppg/cps/catalog — List all parsed CPS posts with stats
  router.get("/cps/catalog", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "cps_summary", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/cps/analyze — Parse and analyze a CPS file or directory
  router.post("/cps/analyze", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "cps_parse", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/cps/match — Cross-reference CPS posts against machine catalog
  router.post("/cps/match", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "post_match_machines", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/cps/map-dialect — Map CPS properties to PRISM dialect config
  router.post("/cps/map-dialect", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "cps_map_dialect", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Machine Fingerprint Routes (PP-MS2) ────────────────────────────

  // POST /ppg/machine/fingerprint — Resolve machine to post config
  router.post("/machine/fingerprint", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "machine_fingerprint", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/machine/features — Get firmware features for controller + year
  router.get("/machine/features", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "firmware_features", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/machine/manufacturers — List all machine manufacturers
  router.get("/machine/manufacturers", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "machine_list_manufacturers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Download Routes (PP-MS4) ────────────────────────────────────────

  // POST /ppg/download — Format G-code for controller-native download
  router.post("/download", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_format_download", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/download/setup-sheet — Generate operator setup sheet
  router.post("/download/setup-sheet", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_setup_sheet", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/download/manifest — Multi-file download package
  router.post("/download/manifest", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_manifest", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Prove-Out & Validation Routes (PP-MS5) ─────────────────────────

  // POST /ppg/prove-out — Apply prove-out derating to G-code
  router.post("/prove-out", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_prove_out", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/validate-limits — Validate G-code against machine limits
  router.post("/validate-limits", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_validate_limits", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/validation-report — Generate validation report
  router.post("/validation-report", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_validation_report", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/prove-out/promote — Promote prove-out to production
  router.post("/prove-out/promote", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_prove_out_promote", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/air-cut/detect — Detect air cuts in G-code
  router.post("/air-cut/detect", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_air_cut_detect", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Library Routes (PP-MS6) ─────────────────────────────────────────

  // POST /ppg/library/search — Search post catalog
  router.post("/library/search", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_library_search", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/library/facets — Get facet counts for filters
  router.get("/library/facets", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_library_facets", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/library/detail — Get post detail by ID
  router.post("/library/detail", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_library_detail", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/edm/generate — Generate EDM post program (PP-MS8/U-PP36)
  router.post("/edm/generate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_edm_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/edm/controllers — List EDM controllers (PP-MS8/U-PP36)
  router.get("/edm/controllers", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_edm_controllers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/laser/generate — Generate laser post program (PP-MS8/U-PP37)
  router.post("/laser/generate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_laser_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/waterjet/generate — Generate waterjet post program (PP-MS8/U-PP37)
  router.post("/waterjet/generate", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_waterjet_generate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/sheet/controllers — List laser/waterjet controllers (PP-MS8/U-PP37)
  router.get("/sheet/controllers", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_sheet_controllers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/coolant/config — Get coolant M-codes for controller (PP-MS7/U-PP32)
  router.post("/coolant/config", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_coolant_config", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/coolant/controllers — List supported coolant controllers (PP-MS7/U-PP32)
  router.get("/coolant/controllers", async (_req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_coolant_controllers", {});
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/probe/generate — Generate probe routine for controller (PP-MS7/U-PP33)
  router.post("/probe/wcs", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_probe_wcs", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/probe/inspect", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_probe_inspect", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/probe/tool", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_probe_tool", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/subprogram/analyze — Analyze G-code for subprogram extraction (PP-MS7/U-PP34)
  router.post("/subprogram/analyze", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_subprogram_analyze", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post("/subprogram/detect", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_subprogram_detect", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/telemetry — Record telemetry event (PP-MS11/U-PP47)
  router.post("/telemetry", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_telemetry_record", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/telemetry/funnel — Get funnel metrics (PP-MS11/U-PP47)
  router.get("/telemetry/funnel", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_telemetry_funnel", req.query);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/roi — Calculate ROI (PP-MS10/U-PP45)
  router.post("/roi", async (req, res) => {
    try {
      const result = await callTool("prism_cam", "ppg_roi_calculate", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/operations — List supported G-code operations
  router.get("/operations", async (_req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_templates", {});
      const templateResult = result as {
        templates?: Array<{ operation?: string }>;
        supported_operations?: string[];
      };
      const operations = Array.isArray(templateResult.supported_operations)
        ? templateResult.supported_operations
        : [...new Set(
          (templateResult.templates ?? [])
            .map((template) => template.operation)
            .filter((operation): operation is string => typeof operation === "string" && operation.length > 0),
        )];
      res.json({ ok: true, data: { operations, total: operations.length } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/setup-sheet — Auto-generate setup sheet from G-code
  router.post("/setup-sheet", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_setup_sheet_auto", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/cycle-time — Estimate cycle time from G-code
  router.post("/cycle-time", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_cycle_time", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/cycle-time-compare — Compare cycle time across machines
  router.post("/cycle-time-compare", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_cycle_time_compare", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/tool-optimize — Optimize tool change sequence
  router.post("/tool-optimize", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_tool_change_optimize", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/magazine-layout — Optimize tool magazine pocket assignment
  router.post("/magazine-layout", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_magazine_layout", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/optimization-report — Full before/after optimization report
  router.post("/optimization-report", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_optimization_report", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /ppg/feature-select — Auto-select post-processor features for a job context
  router.post("/feature-select", async (req, res) => {
    try {
      const result = await callTool("prism_product", "ppg_feature_select", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ── Program Browser Routes ──────────────────────────────────────────

  // GET /ppg/programs/catalog — List all available CNC programs by controller
  router.get("/programs/catalog", async (_req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const catalogPath = path.resolve("data/ppg-asset-catalog.json");
      if (fs.existsSync(catalogPath)) {
        const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
        res.json({ ok: true, data: catalog });
      } else {
        res.json({ ok: true, data: { nc_programs: [], cps_posts: [], summary: { total_nc_programs: 0, total_cps_posts: 0 } } });
      }
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/programs/list — List NC programs in a directory (paginated)
  router.get("/programs/list", async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const controller = String(req.query.controller || "okuma");
      const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
      const search = String(req.query.search || "").toLowerCase();

      const progDir = path.resolve(`data/programs/${controller}`);
      if (!fs.existsSync(progDir)) {
        res.json({ ok: true, data: { programs: [], total: 0 } });
        return;
      }
      let files = fs.readdirSync(progDir).filter((f: string) => /\.(min|nc|hnc|tap|ngc|gcode|prg|mpf)$/i.test(f));
      if (search) files = files.filter((f: string) => f.toLowerCase().includes(search));
      const total = files.length;
      const page = files.slice(offset, offset + limit).map((f: string) => {
        const fp = path.join(progDir, f);
        const stats = fs.statSync(fp);
        const parts = f.replace(/\.(min|nc|hnc|tap|ngc|gcode|prg|mpf)$/i, "").split("__");
        return {
          name: f,
          customer: parts.length > 1 ? parts[0].replace(/_/g, " ") : undefined,
          program: parts.length > 1 ? parts.slice(1).join("__") : parts[0],
          size_bytes: stats.size,
          path: fp.replace(/\\/g, "/"),
        };
      });
      res.json({ ok: true, data: { programs: page, total, offset, limit } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/programs/load — Load a specific NC program's content
  router.get("/programs/load", async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = String(req.query.path || "");
      // Security: only allow paths within data/programs/
      const resolved = path.resolve(filePath);
      const programsRoot = path.resolve("data/programs");
      const fixturesRoot = path.resolve("src/__tests__/fixtures");
      if (!resolved.startsWith(programsRoot) && !resolved.startsWith(fixturesRoot)) {
        res.status(403).json({ ok: false, error: "Access denied — path must be within data/programs/ or fixtures/" });
        return;
      }
      if (!fs.existsSync(resolved)) {
        res.status(404).json({ ok: false, error: "File not found" });
        return;
      }
      const content = fs.readFileSync(resolved, "utf8");
      const lines = content.split("\n").length;
      res.json({ ok: true, data: { content, lines, path: filePath, name: path.basename(filePath) } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /ppg/programs/stats — Quick stats on program library
  router.get("/programs/stats", async (_req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const progRoot = path.resolve("data/programs");
      const stats: Record<string, number> = {};
      if (fs.existsSync(progRoot)) {
        for (const dir of fs.readdirSync(progRoot)) {
          const dp = path.join(progRoot, dir);
          if (fs.statSync(dp).isDirectory()) {
            stats[dir] = fs.readdirSync(dp).filter((f: string) => /\.(min|nc|hnc|tap|ngc|gcode|prg|mpf)$/i.test(f)).length;
          }
        }
      }
      res.json({ ok: true, data: { controllers: stats, total: Object.values(stats).reduce((a, b) => a + b, 0) } });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
