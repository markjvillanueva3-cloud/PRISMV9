/**
 * PRISM MCP Server — Preset Library + Learning Progression Routes
 * 20 endpoints for preset CRUD/share/compare/validate and course enrollment/progression.
 * Session 6-10
 */
import { Router } from "express";
import { presetLibraryEngine } from "../engines/PresetLibraryEngine.js";
import { learningProgressionEngine } from "../engines/LearningProgressionEngine.js";

export function createPresetsLearningRouter(): Router {
  const router = Router();

  // ─── Presets ──────────────────────────────────────────────────────────────

  router.post("/presets", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.savePreset(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get("/presets/:presetId", async (req, res) => {
    try {
      const p = presetLibraryEngine.getPreset(req.params.presetId, req.query.user_id as string);
      if (!p) { res.status(404).json({ ok: false, error: "Preset not found" }); return; }
      res.json({ ok: true, data: p });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/presets", async (req, res) => {
    try {
      const q = req.query;
      const result = presetLibraryEngine.listPresets({
        user_id: q.user_id as string || "anonymous",
        preset_type: q.preset_type as any,
        include_shared: q.include_shared === "true",
        machine_id: q.machine_id as string,
        material_id: q.material_id as string,
        operation: q.operation as string,
        limit: q.limit ? parseInt(q.limit as string) : undefined,
        offset: q.offset ? parseInt(q.offset as string) : undefined,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/presets/search", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.searchPresets(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post("/presets/:presetId/share", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.sharePreset(req.params.presetId, req.body.user_id) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post("/presets/compare", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.comparePresets(req.body.preset_ids, req.body.user_id) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.delete("/presets/:presetId", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.deletePreset(req.params.presetId, req.body.user_id) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post("/presets/:presetId/unshare", async (req, res) => {
    try { res.json({ ok: true, data: presetLibraryEngine.unsharePreset(req.params.presetId, req.body.user_id) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get("/presets/:presetId/validate", async (req, res) => {
    try {
      const userId = req.query.user_id as string;
      if (!userId) { res.status(400).json({ ok: false, error: "user_id is required" }); return; }
      const preset = presetLibraryEngine.getPreset(req.params.presetId, userId);
      if (!preset || preset.user_id !== userId) {
        res.status(400).json({ ok: false, error: "Cannot validate another user's preset" });
        return;
      }
      res.json({ ok: true, data: presetLibraryEngine.validatePreset(req.params.presetId) });
    }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post("/presets/:presetId/use", async (req, res) => {
    try {
      const userId = req.body.user_id as string | undefined;
      if (!userId) { res.status(400).json({ ok: false, error: "user_id is required" }); return; }
      const preset = presetLibraryEngine.getPreset(req.params.presetId, userId);
      if (!preset) {
        res.status(400).json({ ok: false, error: `Preset ${req.params.presetId} not found or not accessible` });
        return;
      }
      res.json({ ok: true, data: presetLibraryEngine.incrementUseCount(req.params.presetId) });
    }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  // ─── Learning Courses ─────────────────────────────────────────────────────

  router.post("/learning/courses", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.createCourse(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get("/learning/courses/:courseId", async (req, res) => {
    try {
      const c = learningProgressionEngine.getCourse(req.params.courseId);
      if (!c) { res.status(404).json({ ok: false, error: "Course not found" }); return; }
      res.json({ ok: true, data: c });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/learning/courses", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.searchCourses(req.query as any) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/learning/enroll", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.enroll(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get("/learning/my-progress", async (req, res) => {
    try {
      const userId = req.query.user_id as string;
      const courseId = req.query.course_id as string;
      if (!userId?.trim()) {
        res.status(400).json({ ok: false, error: "user_id is required" });
        return;
      }
      if (courseId) {
        res.json({ ok: true, data: learningProgressionEngine.getProgress(userId, courseId) });
      } else {
        res.json({ ok: true, data: learningProgressionEngine.getEnrollmentSummary(userId) });
      }
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.post("/learning/checkpoint", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.submitCheckpoint(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.post("/learning/media", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.addMedia(req.body) }); }
    catch (e: any) { res.status(400).json({ ok: false, error: e.message }); }
  });

  router.get("/learning/media/:courseId", async (req, res) => {
    try {
      const moduleIdx = req.query.module_idx !== undefined ? parseInt(req.query.module_idx as string) : undefined;
      if (req.query.module_idx !== undefined && Number.isNaN(moduleIdx)) {
        res.status(400).json({ ok: false, error: "module_idx must be a number" });
        return;
      }
      res.json({ ok: true, data: learningProgressionEngine.listMedia(req.params.courseId, moduleIdx) });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  router.get("/learning/facets", async (req, res) => {
    try { res.json({ ok: true, data: learningProgressionEngine.searchCourses(req.query as any) }); }
    catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  return router;
}
