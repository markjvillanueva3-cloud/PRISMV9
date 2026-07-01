/**
 * EDM Routes — Non-Traditional Machining API
 * WEDM-MS0 U-WEDM01
 *
 * Legacy routes (7): wire, sinker, laser, waterjet, pipeline, recommendation
 * WEDM Pipeline routes (20): geometry parsing, interpretation, feasibility,
 *   material/machine/wire, start holes, toolpath, optimization, cutting params,
 *   wire management, monitoring, G-code, cost, quality
 *
 * Auth: verifyToken + requirePermission('edm:read'|'edm:write')
 * Rate limits: RL-EDM-COMPUTE for expensive computation routes
 * File upload: multer for /interpret route (DXF/STEP/IGES, max 15MB)
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";
import { requirePermission } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";

export function createEdmRouter(callTool: CallToolFn): Router {
  const router = Router();

  // ── Helpers ──────────────────────────────────────────────────────────

  async function invoke(
    action: string,
    body: Record<string, any> | undefined,
  ): Promise<{ result: any }> {
    return { result: await callTool("prism_edm", action, body) };
  }

  // Upload semaphore: max 3 concurrent file uploads
  let activeUploads = 0;
  const MAX_CONCURRENT_UPLOADS = 3;

  function uploadSemaphore(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ): void {
    if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
      res.status(503).json({ error: "Too many concurrent uploads. Try again shortly." });
      return;
    }
    activeUploads++;
    res.on("finish", () => { activeUploads--; });
    next();
  }

  // Apply auth to all EDM routes
  router.use(verifyToken);

  // ── Legacy routes (read-only) ───────────────────────────────────────

  router.post("/wire", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wire_settings", req.body)); } catch (e) { next(e); }
  });
  router.post("/sinker", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("sinker_calculate", req.body)); } catch (e) { next(e); }
  });
  router.post("/laser", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("laser_calculate", req.body)); } catch (e) { next(e); }
  });
  router.post("/waterjet", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("waterjet_calculate", req.body)); } catch (e) { next(e); }
  });
  router.post("/pipeline", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_run_pipeline", req.body)); } catch (e) { next(e); }
  });
  router.post("/recommendation", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_get_recommendation", req.body)); } catch (e) { next(e); }
  });

  // ── CWEDM-MS0: Calculator orchestration (6-engine chain) ────────────

  router.post("/calculator-solve",
    requirePermission("edm:read"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try { res.json(await invoke("wedm_calculator_solve", req.body)); } catch (e) { next(e); }
    },
  );

  // ── CWEDM-MS0 S2: Calculator catalog endpoints ─────────────────────

  const WEDM_MACHINE_CATALOG = [
    { id: "makino-u3", manufacturer: "Makino", model: "U3", travel_x_mm: 370, travel_y_mm: 270, travel_z_mm: 255, travel_u_mm: 370, travel_v_mm: 270, max_taper_deg: 30, auto_thread: true, controller: "fanuc" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 255, max_thickness_mm: 220 },
    { id: "makino-u6", manufacturer: "Makino", model: "U6", travel_x_mm: 650, travel_y_mm: 450, travel_z_mm: 420, travel_u_mm: 650, travel_v_mm: 450, max_taper_deg: 30, auto_thread: true, controller: "makino" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 420, max_thickness_mm: 400 },
    { id: "sodick-vl400q", manufacturer: "Sodick", model: "VL400Q", travel_x_mm: 400, travel_y_mm: 300, travel_z_mm: 250, travel_u_mm: 120, travel_v_mm: 120, max_taper_deg: 15, auto_thread: true, controller: "sodick" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 250, max_thickness_mm: 220 },
    { id: "sodick-vz300l", manufacturer: "Sodick", model: "VZ300L", travel_x_mm: 300, travel_y_mm: 220, travel_z_mm: 200, travel_u_mm: 80, travel_v_mm: 80, max_taper_deg: 10, auto_thread: true, controller: "sodick" as const, wire_dia_range: "0.05–0.25 mm", submerge_depth_mm: 200, max_thickness_mm: 180 },
    { id: "fanuc-c600ib", manufacturer: "FANUC", model: "ROBOCUT C600iB", travel_x_mm: 600, travel_y_mm: 400, travel_z_mm: 310, travel_u_mm: 120, travel_v_mm: 120, max_taper_deg: 15, auto_thread: true, controller: "fanuc" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 310, max_thickness_mm: 300 },
    { id: "fanuc-c400ib", manufacturer: "FANUC", model: "ROBOCUT C400iB", travel_x_mm: 400, travel_y_mm: 300, travel_z_mm: 255, travel_u_mm: 80, travel_v_mm: 80, max_taper_deg: 15, auto_thread: true, controller: "fanuc" as const, wire_dia_range: "0.10–0.25 mm", submerge_depth_mm: 255, max_thickness_mm: 220 },
    { id: "agie-cut-p-350", manufacturer: "AgieCharmilles", model: "CUT P 350", travel_x_mm: 350, travel_y_mm: 250, travel_z_mm: 256, travel_u_mm: 160, travel_v_mm: 160, max_taper_deg: 30, auto_thread: true, controller: "agiecharmilles" as const, wire_dia_range: "0.10–0.33 mm", submerge_depth_mm: 256, max_thickness_mm: 256 },
    { id: "agie-cut-p-550", manufacturer: "AgieCharmilles", model: "CUT P 550", travel_x_mm: 550, travel_y_mm: 350, travel_z_mm: 400, travel_u_mm: 200, travel_v_mm: 200, max_taper_deg: 30, auto_thread: true, controller: "agiecharmilles" as const, wire_dia_range: "0.10–0.33 mm", submerge_depth_mm: 400, max_thickness_mm: 400 },
    { id: "mitsubishi-mv1200r", manufacturer: "Mitsubishi", model: "MV1200R", travel_x_mm: 400, travel_y_mm: 300, travel_z_mm: 220, travel_u_mm: 120, travel_v_mm: 120, max_taper_deg: 15, auto_thread: true, controller: "mitsubishi" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 220, max_thickness_mm: 215 },
    { id: "mitsubishi-mv2400s", manufacturer: "Mitsubishi", model: "MV2400S", travel_x_mm: 600, travel_y_mm: 400, travel_z_mm: 305, travel_u_mm: 200, travel_v_mm: 200, max_taper_deg: 20, auto_thread: true, controller: "mitsubishi" as const, wire_dia_range: "0.10–0.30 mm", submerge_depth_mm: 305, max_thickness_mm: 300 },
  ];

  const WEDM_WIRE_CATALOG = [
    { id: "brass-025", material: "brass" as const, diameter_mm: 0.25, tensile_MPa: 900, conductivity_pct_IACS: 20, best_for: "General purpose, D2/M2/4140", cost_per_m: 0.02, max_speed_m_min: 12 },
    { id: "brass-020", material: "brass" as const, diameter_mm: 0.20, tensile_MPa: 900, conductivity_pct_IACS: 20, best_for: "Tighter corners, medium detail", cost_per_m: 0.03, max_speed_m_min: 10 },
    { id: "brass-015", material: "brass" as const, diameter_mm: 0.15, tensile_MPa: 900, conductivity_pct_IACS: 20, best_for: "Fine detail, small radii", cost_per_m: 0.04, max_speed_m_min: 8 },
    { id: "brass-010", material: "brass" as const, diameter_mm: 0.10, tensile_MPa: 900, conductivity_pct_IACS: 20, best_for: "Micro features, <0.05mm radii", cost_per_m: 0.06, max_speed_m_min: 5 },
    { id: "zinc-coated-025", material: "zinc_coated" as const, diameter_mm: 0.25, tensile_MPa: 1000, conductivity_pct_IACS: 25, best_for: "Speed, auto-threading, general", cost_per_m: 0.04, max_speed_m_min: 15 },
    { id: "zinc-coated-020", material: "zinc_coated" as const, diameter_mm: 0.20, tensile_MPa: 1000, conductivity_pct_IACS: 25, best_for: "Speed + tighter corners", cost_per_m: 0.05, max_speed_m_min: 12 },
    { id: "zinc-coated-030", material: "zinc_coated" as const, diameter_mm: 0.30, tensile_MPa: 980, conductivity_pct_IACS: 25, best_for: "Thick stock speed cutting", cost_per_m: 0.04, max_speed_m_min: 16 },
    { id: "moly-020", material: "molybdenum" as const, diameter_mm: 0.20, tensile_MPa: 1800, conductivity_pct_IACS: 34, best_for: "Carbide, PCD, hard materials", cost_per_m: 0.15, max_speed_m_min: 6 },
    { id: "moly-018", material: "molybdenum" as const, diameter_mm: 0.18, tensile_MPa: 1800, conductivity_pct_IACS: 34, best_for: "Carbide fine detail", cost_per_m: 0.18, max_speed_m_min: 5 },
    { id: "tungsten-010", material: "tungsten" as const, diameter_mm: 0.10, tensile_MPa: 2800, conductivity_pct_IACS: 31, best_for: "Ultra-fine, micro EDM, hardest materials", cost_per_m: 0.20, max_speed_m_min: 3 },
    { id: "tungsten-005", material: "tungsten" as const, diameter_mm: 0.05, tensile_MPa: 2800, conductivity_pct_IACS: 31, best_for: "Micro WEDM, medical implants", cost_per_m: 0.35, max_speed_m_min: 1.5 },
  ];

  router.get("/machines", requirePermission("edm:read"), (_req, res) => {
    res.json({ ok: true, data: WEDM_MACHINE_CATALOG });
  });

  router.get("/wire-catalog", requirePermission("edm:read"), (_req, res) => {
    res.json({ ok: true, data: WEDM_WIRE_CATALOG });
  });

  // ── WEDM Pipeline: Geometry (U-WEDM00) ─────────────────────────────

  router.post("/parse-geometry",
    requirePermission("edm:write"),
    uploadSemaphore,
    async (req, res, next) => {
      try { res.json(await invoke("wedm_parse_geometry", req.body)); } catch (e) { next(e); }
    },
  );
  router.post("/validate-geometry",
    requirePermission("edm:read"),
    async (req, res, next) => {
      try { res.json(await invoke("wedm_validate_geometry", req.body)); } catch (e) { next(e); }
    },
  );

  // ── WEDM Pipeline: Drawing Interpretation ───────────────────────────

  router.post("/interpret",
    requirePermission("edm:write"),
    uploadSemaphore,
    async (req, res, next) => {
      try { res.json(await invoke("wedm_interpret_drawing", req.body)); } catch (e) { next(e); }
    },
  );
  router.post("/classify-features", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_classify_features", req.body)); } catch (e) { next(e); }
  });
  router.post("/calculate-passes", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_calculate_passes", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Feasibility ──────────────────────────────────────

  router.post("/feasibility", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_assess_feasibility", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Material / Machine / Wire Selection ──────────────

  router.post("/selection", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_full_selection", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Machine UV Travel ─────────────────────────────────

  router.post("/machine-uv-travel", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_machine_uv_travel", req.body)); } catch (e) { next(e); }
  });

  // ── U-WH15: Spec Compliance ──────────────────────────────────────────

  router.post("/spec-compliance", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_evaluate_spec_compliance", req.body)); } catch (e) { next(e); }
  });
  router.post("/spec-limits", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_get_spec_limits", req.body)); } catch (e) { next(e); }
  });

  // ── Bi-Material Compensation ─────────────────────────────────────────

  router.post("/bimaterial/optimize", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_bimaterial_optimize", req.body)); } catch (e) { next(e); }
  });
  router.post("/bimaterial/transition-risk", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_bimaterial_transition_risk", req.body)); } catch (e) { next(e); }
  });
  router.post("/bimaterial/infer-zones", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_bimaterial_infer_zones", req.body)); } catch (e) { next(e); }
  });
  router.post("/bimaterial/uv-compensation", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_bimaterial_uv_compensation", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Start Holes + Setup ──────────────────────────────

  router.post("/start-holes", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_plan_start_holes", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Toolpath ─────────────────────────────────────────

  router.post("/toolpath", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_generate_toolpath", req.body)); } catch (e) { next(e); }
  });
  router.post("/tabs", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_plan_tabs", req.body)); } catch (e) { next(e); }
  });
  router.post("/sequence", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_optimize_sequence", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Multi-Pass + Optimization ────────────────────────

  router.post("/multipass",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try { res.json(await invoke("wedm_full_multipass", req.body)); } catch (e) { next(e); }
    },
  );
  router.post("/optimize",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try { res.json(await invoke("wedm_optimize_params", req.body)); } catch (e) { next(e); }
    },
  );
  router.post("/flushing", requirePermission("edm:write"), async (req, res, next) => {
    try { res.json(await invoke("wedm_plan_flushing", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Safety ───────────────────────────────────────────

  router.post("/predict-wire-break", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_predict_wire_break", req.body)); } catch (e) { next(e); }
  });
  router.post("/calculate-corners", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_calculate_corners", req.body)); } catch (e) { next(e); }
  });
  router.post("/solve-taper", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_solve_taper", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: G-code Generation ────────────────────────────────

  router.post("/gcode",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try { res.json(await invoke("wedm_generate_gcode", req.body)); } catch (e) { next(e); }
    },
  );

  // ── WEDM Pipeline: Cost + Documentation ─────────────────────────────

  router.post("/cost", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_estimate_cost", req.body)); } catch (e) { next(e); }
  });
  router.post("/setup-sheet", requirePermission("edm:read"), async (req, res, next) => {
    try { res.json(await invoke("wedm_generate_setup_sheet", req.body)); } catch (e) { next(e); }
  });

  // ── WEDM Pipeline: Blueprint Vision OCR ──────────────────────────

  /**
   * POST /ocr
   *
   * Send a photo of a manufacturing blueprint → Claude Vision extracts
   * dimensions, tolerances, GD&T, material, surface finishes, and geometry.
   *
   * Input: {
   *   image: { type: "base64", data: "..." } | { type: "file", path: "..." },
   *   expected_units?: "mm" | "inch",
   *   blueprint_type?: "wire_edm" | "milling" | "turning" | "general",
   *   extract_geometry?: boolean,
   * }
   *
   * Returns: BlueprintVisionResult (dimensions, GD&T, profiles, thickness, material)
   */
  router.post("/ocr",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try {
        const { blueprintVisionOCREngine } = await import("../engines/BlueprintVisionOCREngine.js");
        const result = await blueprintVisionOCREngine.analyzeBlueprint(req.body);
        res.json({ ok: true, data: result });
      } catch (e) { next(e); }
    },
  );

  /**
   * POST /ocr/quick
   *
   * Quick extraction — just material, thickness, dimension count, and tightest
   * tolerance. Faster and cheaper than full /ocr analysis.
   */
  router.post("/ocr/quick",
    requirePermission("edm:read"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try {
        const { blueprintVisionOCREngine } = await import("../engines/BlueprintVisionOCREngine.js");
        const result = await blueprintVisionOCREngine.quickExtract(req.body);
        res.json({ ok: true, data: result });
      } catch (e) { next(e); }
    },
  );

  // ── WEDM Pipeline: File-to-Program (Photo/DXF → G-code) ───────────

  /**
   * POST /photo-to-program
   *
   * End-to-end pipeline: DXF content (or pre-parsed contours) + material specs
   * → complete Mitsubishi wire EDM NC program.
   *
   * Also accepts image_base64 — will run OCR first to extract geometry.
   *
   * Input: {
   *   dxf_content?: string,           // Raw DXF file content
   *   contours?: WireEDMContour[],    // Pre-parsed contours (skip DXF step)
   *   image_base64?: string,          // Photo of blueprint (runs OCR first)
   *   material?: string,              // "D2", "4140", "A2", "S7" (auto-detected from OCR if image)
   *   thickness_mm?: number,          // Auto-detected from OCR if image
   *   target_ra_um?: number,          // Default: 0.8
   *   target_accuracy_mm?: number,    // Default: 0.005
   *   controller?: string,            // Default: "mitsubishi"
   *   wire_type?: string,             // Default: auto-selected
   *   program_number?: number,
   *   part_name?: string,
   *   part_number?: string,
   * }
   *
   * Returns: Complete NC program text + setup sheet + pass details + OCR data
   */
  router.post("/photo-to-program",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try {
        let programInput = { ...req.body };
        let ocrResult = null;

        // If image provided, run Vision OCR first to extract geometry + material
        if (req.body.image_base64 && !req.body.dxf_content && !req.body.contours) {
          const { blueprintVisionOCREngine } = await import("../engines/BlueprintVisionOCREngine.js");
          ocrResult = await blueprintVisionOCREngine.analyzeBlueprint({
            image: { type: "base64", data: req.body.image_base64 },
            blueprint_type: "wire_edm",
            extract_geometry: true,
            expected_units: req.body.expected_units,
          });

          // Auto-fill from OCR if not explicitly provided
          if (!programInput.material && ocrResult.title_block.material) {
            programInput.material = ocrResult.title_block.material;
          }
          if (!programInput.thickness_mm && ocrResult.thickness_mm) {
            programInput.thickness_mm = ocrResult.thickness_mm;
          }
          if (!programInput.part_name && ocrResult.title_block.title) {
            programInput.part_name = ocrResult.title_block.title;
          }
          if (!programInput.part_number && ocrResult.title_block.part_number) {
            programInput.part_number = ocrResult.title_block.part_number;
          }

          // Use tightest tolerance for target accuracy
          if (!programInput.target_accuracy_mm && ocrResult.summary.tightest_tolerance_mm > 0) {
            programInput.target_accuracy_mm = ocrResult.summary.tightest_tolerance_mm;
          }

          // Use extracted surface finish target
          const tightestRa = ocrResult.dimensions
            .filter((d: { surface_finish_ra?: number }) => d.surface_finish_ra)
            .map((d: { surface_finish_ra?: number }) => d.surface_finish_ra!)
            .sort((a: number, b: number) => a - b)[0];
          if (!programInput.target_ra_um && tightestRa) {
            programInput.target_ra_um = tightestRa;
          }

          // Convert OCR profiles to WireEDMContour format for the pipeline
          if (ocrResult.profiles.length > 0) {
            programInput.contours = ocrResult.profiles
              .filter((p: { is_closed: boolean }) => p.is_closed)
              .map((p: { id: string; type: string; points: Array<{ x: number; y: number }>; is_closed: boolean; width_mm?: number; height_mm?: number }, idx: number) => {
                const pts = p.points;
                const segments = [];
                for (let i = 0; i < pts.length; i++) {
                  const next = pts[(i + 1) % pts.length];
                  segments.push({ type: "line" as const, start: pts[i], end: next });
                }
                const xs = pts.map((pt: { x: number }) => pt.x);
                const ys = pts.map((pt: { y: number }) => pt.y);
                return {
                  id: p.id || `ocr_profile_${idx}`,
                  segments,
                  is_closed: true,
                  is_exterior: p.type === "external",
                  area_mm2: (p.width_mm || 0) * (p.height_mm || 0),
                  perimeter_mm: segments.reduce((s: number, seg: { start: { x: number; y: number }; end: { x: number; y: number } }) =>
                    s + Math.sqrt((seg.end.x - seg.start.x) ** 2 + (seg.end.y - seg.start.y) ** 2), 0),
                  bbox: {
                    min_x: Math.min(...xs),
                    min_y: Math.min(...ys),
                    max_x: Math.max(...xs),
                    max_y: Math.max(...ys),
                  },
                };
              });
          }
        }

        // Validate minimum required fields
        if (!programInput.material) {
          res.status(400).json({ ok: false, error: "material is required (provide directly or via image OCR)" });
          return;
        }
        if (!programInput.thickness_mm) {
          res.status(400).json({ ok: false, error: "thickness_mm is required (provide directly or via image OCR)" });
          return;
        }

        const { wedmPrintToProgramEngine } = await import("../engines/WEDMPrintToProgramEngine.js");
        const result = await wedmPrintToProgramEngine.generate(programInput);
        res.json({
          ok: result.success,
          data: result,
          ocr: ocrResult ? {
            dimensions_found: ocrResult.summary.total_dimensions,
            material_detected: ocrResult.title_block.material,
            thickness_detected: ocrResult.thickness_mm,
            profiles_detected: ocrResult.profiles.length,
            tokens_used: ocrResult.tokens_used,
          } : null,
        });
      } catch (e) { next(e); }
    },
  );

  // ── WEDM Pipeline: G-code Export (.NC file download) ───────────────

  /**
   * POST /gcode-export
   *
   * Returns the program text as a downloadable .NC file.
   *
   * Input: { program_text: string, filename?: string }
   * Response: application/octet-stream with Content-Disposition attachment
   */
  router.post("/gcode-export",
    requirePermission("edm:read"),
    (req, res) => {
      const { program_text, filename } = req.body;
      if (!program_text || typeof program_text !== "string") {
        res.status(400).json({ ok: false, error: "program_text is required" });
        return;
      }
      // FIX H3: sanitize filename to prevent HTTP header injection
      const rawName = typeof filename === "string" ? filename : "PRISM_WEDM.NC";
      const ncFilename = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${ncFilename}"`);
      res.send(program_text);
    },
  );

  /**
   * POST /gcode-export-from-dxf
   *
   * Combined: DXF → G-code → .NC file download in one step.
   * Same input as /photo-to-program but returns the NC file directly.
   */
  router.post("/gcode-export-from-dxf",
    requirePermission("edm:write"),
    rateLimitMiddleware("RL-EDM-COMPUTE", "user"),
    async (req, res, next) => {
      try {
        const { wedmPrintToProgramEngine } = await import("../engines/WEDMPrintToProgramEngine.js");
        const result = await wedmPrintToProgramEngine.generate(req.body);
        if (!result.success) {
          res.status(422).json({ ok: false, error: "Failed to generate program", warnings: result.warnings });
          return;
        }
        const ncFilename = req.body.filename
          || `${(req.body.part_number || req.body.part_name || "PRISM_WEDM").replace(/[^a-zA-Z0-9_-]/g, "_")}.NC`;
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename="${ncFilename}"`);
        res.send(result.program_text);
      } catch (e) { next(e); }
    },
  );

  return router;
}
