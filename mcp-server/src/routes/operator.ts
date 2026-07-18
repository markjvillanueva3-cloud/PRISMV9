import { Router } from "express";
import type { Response, NextFunction } from "express";
import type { CallToolFn } from "./index.js";
import { verifyToken } from "../middleware/auth.js";

/**
 * Operator REST bridge for the SPA OperatorFeedbackPanel (RLHF capture).
 *
 * U-FE-OPERATOR-FEEDBACK (slot:bravo 2026-06-19). web/src/components/operator/OperatorFeedbackPanel.tsx
 * POSTs { operatorId, tenantId, timestamp, feedbackType, context, reason, tags, rlhfEligible } to
 * /api/operator/feedback (both online and via offline-queue replay) and only inspects res.ok. The
 * panel had no backend mount (romeo FE<->BE contract-audit gap) -> 404. This relays to the new
 * prism_session:operator_feedback_record action (OperatorPreferencesEngine.recordFeedback), whose
 * stored feedback feeds RLHF/LoRA training via getUnprocessedFeedback.
 *
 * The dispatcher validates the (untrusted) payload and returns { success:false, error } on a bad
 * record; the route maps that to 400 so the panel's offline-queue retry path engages correctly.
 */
export function createOperatorRouter(callTool: CallToolFn): Router {
  const router = Router();

  // SECURITY (U-ERP-P2-HARDENING): this route seeds RLHF/LoRA training data and was
  // anon-reachable under the global optionalToken (untrusted training-data injection).
  // verifyToken gates it, and operatorId is BOUND to the verified identity so an authed
  // caller cannot impersonate another operator's feedback either. The SPA panel
  // (OperatorFeedbackPanel, currently unrendered) now sends getRequestHeaders() Bearer.
  router.post("/feedback", verifyToken, async (req: any, res: Response, next: NextFunction) => {
    try {
      const feedback = { ...(req.body ?? {}), operatorId: req.userId };
      const r: any = await callTool("prism_session", "operator_feedback_record", { feedback });
      if (r && typeof r === "object" && r.success === false) {
        res.status(400).json({ message: String(r.error ?? "feedback rejected") });
        return;
      }
      res.json(r);
    } catch (e) {
      next(e);
    }
  });

  return router;
}
