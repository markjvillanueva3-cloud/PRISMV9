/**
 * Viewer Route — Scene catalog and scene graph endpoints
 *
 * GET  /api/viewer/scenes       — List available scenes (demo + any live data)
 * GET  /api/viewer/scene/:id    — Fetch a full scene graph by ID
 *
 * The frontend's viewer API client (`web/src/api/viewer.ts`) calls these
 * paths directly (outside the /api/v1/ namespace) and gracefully falls back
 * to a client-side demo scene when they 404 or error.
 */
import { Router } from "express";
import { visualizationEngine } from "../engines/VisualizationEngine.js";

// Pre-built demo scene catalog
const DEMO_SCENES = [
  { id: "demo_pocket_milling", name: "Demo Pocket Milling", type: "demo" },
  { id: "demo_contour_pass",   name: "Demo Contour Finishing", type: "demo" },
  { id: "demo_drill_pattern",  name: "Demo Drill Pattern", type: "demo" },
] as const;

export function createViewerRouter(): Router {
  const router = Router();

  /** GET /scenes — return a catalog of available scene entries */
  router.get("/scenes", (_req, res) => {
    res.json({
      scenes: DEMO_SCENES,
    });
  });

  /** GET /scene/:id — return a full scene graph */
  router.get("/scene/:id", (req, res) => {
    const { id } = req.params;

    switch (id) {
      case "demo_pocket_milling":
        res.json(
          visualizationEngine.buildScene({
            stock: { width: 120, height: 120, depth: 30 },
            tool: { diameter: 12, length: 40, holder_diameter: 40, holder_length: 60 },
            view: "iso",
            show_grid: true,
            show_axes: true,
          }),
        );
        return;

      case "demo_contour_pass":
        res.json(
          visualizationEngine.buildScene({
            stock: { width: 80, height: 80, depth: 20 },
            tool: { diameter: 6, length: 30 },
            view: "top",
            show_grid: true,
            show_axes: true,
          }),
        );
        return;

      case "demo_drill_pattern":
        res.json(
          visualizationEngine.buildScene({
            stock: { width: 150, height: 100, depth: 25 },
            tool: { diameter: 8, length: 50 },
            view: "iso",
            show_grid: true,
            show_axes: true,
          }),
        );
        return;

      default:
        res.status(404).json({
          error: `Scene '${id}' not found`,
          available: DEMO_SCENES.map((s) => s.id),
        });
    }
  });

  return router;
}
