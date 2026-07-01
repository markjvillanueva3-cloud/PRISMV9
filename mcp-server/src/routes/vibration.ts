/**
 * PRISM Vibration Routes -- /api/v1/vibration/*
 *
 * Wired to real prism_vibration_physics actions (U-FE-VIBRATION-ACTION-FIX, slot:sierra). The prior
 * action names (stability_lobe_calculate / modal_analysis / chatter_detect / process_damping) did NOT
 * exist on the dispatcher -> z.enum reject -> silent HTTP 200 + {error}. All endpoints are POST
 * (req.body), so the SPA owns the param shape; the dispatcher (strict-validate) checks it.
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createVibrationRouter(callTool: CallToolFn): Router {
  const router = Router();

  // /stability-lobes -> chatter_stable_rpm_recommend (stability-lobe analysis = stable-RPM recommendation;
  // there is no standalone stability_lobe_calculate action on prism_vibration_physics).
  router.post("/stability-lobes", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "chatter_stable_rpm_recommend", req.body) }); } catch (e) { next(e); }
  });

  // /modal -> 501. prism_vibration_physics has NO modal-analysis action (its spectral actions are
  // fourier_analysis / wavelet_analysis -- different math: FFT/wavelet content, not modal frequencies +
  // mode shapes). Fail loud rather than mislabel a spectral transform as modal analysis (R12).
  router.post("/modal", async (_req, res) => {
    res.status(501).json({
      message: "modal analysis not yet wired -- prism_vibration_physics has no modal action (fourier_analysis/wavelet_analysis are spectral, not modal). Wire a modal-analysis engine/action to enable this endpoint.",
      error: "not_implemented",
    });
  });

  // /chatter -> regenerative_chatter_predict (predicts/detects regenerative chatter; prior chatter_detect
  // did not exist).
  router.post("/chatter", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "regenerative_chatter_predict", req.body) }); } catch (e) { next(e); }
  });

  // /damping -> vibration_dampening_calculate (prior process_damping did not exist).
  router.post("/damping", async (req, res, next) => {
    try { res.json({ result: await callTool("prism_vibration_physics", "vibration_dampening_calculate", req.body) }); } catch (e) { next(e); }
  });

  return router;
}
