/**
 * PRISM MCP Server — Customer Portal Routes
 * 17 endpoints: token-based quote/order access, milestones, quality docs, messaging, service cases
 *
 * Public endpoints (token auth, no PRISM account needed):
 *   GET  /portal/quote/:token          — View quote details
 *   POST /portal/quote/:token/respond  — Accept/reject/request changes
 *   GET  /portal/order/:token          — Order status with milestones
 *   GET  /portal/order/:token/documents — List approved quality docs
 *   GET  /portal/order/:token/messages  — List messages
 *   POST /portal/order/:token/messages  — Send customer message
 *
 * Internal endpoints (require PRISM auth):
 *   POST   /portal/tokens              — Create portal token
 *   DELETE /portal/tokens/:token       — Revoke token
 *   GET    /portal/tokens/:entityId    — List tokens for entity
 *   POST   /milestones                 — Create milestone timeline
 *   GET    /milestones/:jobId          — Get milestone timeline
 *   POST   /milestones/:jobId/advance  — Advance milestone
 *   POST   /quality-docs               — Add quality document
 *   GET    /quality-docs/:jobId        — List quality docs for job
 *   POST   /service-cases              — Create service case
 *   GET    /service-cases/:entityType/:entityId — List service cases for a portal entity
 *   POST   /service-cases/:caseId/update — Update service case
 *
 * Session 6-9 U-PORTAL2 + U-PORTAL3
 */
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { customerPortalEngine } from "../engines/CustomerPortalEngine.js";
import { milestoneIntelligenceEngine } from "../engines/MilestoneIntelligenceEngine.js";
import { milestoneTrackingEngine } from "../engines/MilestoneTrackingEngine.js";
import { quoteRevisionEngine } from "../engines/QuoteRevisionEngine.js";

export function createPortalRouter(): Router {
  const router = Router();

  // ─── Public Portal Endpoints (token-authenticated) ────────────────────

  // GET /portal/quote/:token — View quote (customer-facing)
  router.get("/quote/:token", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "view");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "quote") {
        res.status(400).json({ ok: false, error: "Token is not a quote token" });
        return;
      }
      const history = quoteRevisionEngine.getHistory(pt.entity_id);
      const revision = history.revisions[0];
      if (!revision) {
        res.status(400).json({ ok: false, error: "Quote revision data unavailable for portal view" });
        return;
      }

      const view = customerPortalEngine.getQuoteView({
        quote_id: pt.entity_id,
        revision,
        status: history.current_status,
      });
      res.json({ ok: true, data: view });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /portal/quote/:token/respond — Customer responds to quote
  router.post("/quote/:token/respond", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "respond");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "quote") {
        res.status(400).json({ ok: false, error: "Token is not a quote token" });
        return;
      }
      const { response, customer_name, message, requested_changes } = req.body || {};
      if (!response || !customer_name) {
        res.status(400).json({ ok: false, error: "response and customer_name are required" });
        return;
      }
      const result = customerPortalEngine.respondToQuote({
        quote_id: pt.entity_id,
        response,
        customer_name,
        message,
        requested_changes,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /portal/order/:token — Order status with milestone timeline
  router.get("/order/:token", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "view");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "order") {
        res.status(400).json({ ok: false, error: "Token is not an order token" });
        return;
      }
      const timeline = milestoneTrackingEngine.getTimeline(pt.entity_id);
      const orderStatus = customerPortalEngine.getOrderStatus({
        job_id: pt.entity_id,
        timeline: timeline ?? undefined,
      });
      res.json({ ok: true, data: orderStatus });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /portal/order/:token/documents — List approved quality documents
  router.get("/order/:token/documents", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "documents");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "order") {
        res.status(400).json({ ok: false, error: "Token is not an order token" });
        return;
      }
      const docs = customerPortalEngine.listQualityDocuments(pt.entity_id, true);
      res.json({ ok: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // GET /portal/order/:token/messages — List messages
  router.get("/order/:token/messages", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "messages");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "order") {
        res.status(400).json({ ok: false, error: "Token is not an order token" });
        return;
      }
      const limit = Math.max(parseInt(req.query.limit as string) || 50, 1);
      const msgs = customerPortalEngine.listMessages(pt.token_type, pt.entity_id, limit);
      res.json({ ok: true, data: msgs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /portal/order/:token/messages — Customer sends message
  router.post("/order/:token/messages", async (req, res) => {
    try {
      const validation = customerPortalEngine.validateToken(req.params.token, "messages");
      if (!validation.valid) {
        res.status(403).json({ ok: false, error: validation.reason });
        return;
      }
      const pt = validation.token!;
      if (pt.token_type !== "order") {
        res.status(400).json({ ok: false, error: "Token is not an order token" });
        return;
      }
      const { sender_name, message } = req.body || {};
      if (!sender_name || !message) {
        res.status(400).json({ ok: false, error: "sender_name and message are required" });
        return;
      }
      const msg = customerPortalEngine.addMessage({
        entity_type: pt.token_type,
        entity_id: pt.entity_id,
        sender_type: "customer",
        sender_name,
        message,
      });
      res.json({ ok: true, data: msg });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // ─── Internal Endpoints (PRISM auth required in production) ───────────
  router.use(verifyToken);

  // POST /portal/tokens — Create portal access token
  router.post("/tokens", async (req, res) => {
    try {
      const result = customerPortalEngine.createToken(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // DELETE /portal/tokens/:token — Revoke token
  router.delete("/tokens/:token", async (req, res) => {
    try {
      const result = customerPortalEngine.revokeToken(req.params.token);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /portal/tokens/:entityId — List tokens for entity
  router.get("/tokens/:entityId", async (req, res) => {
    try {
      const tokens = customerPortalEngine.listTokens(req.params.entityId);
      res.json({ ok: true, data: tokens });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /milestones — Create milestone timeline
  router.post("/milestones", async (req, res) => {
    try {
      const result = milestoneTrackingEngine.createTimeline(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /milestones/:jobId — Get milestone timeline
  router.get("/milestones/:jobId", async (req, res) => {
    try {
      const timeline = milestoneTrackingEngine.getTimeline(req.params.jobId);
      if (!timeline) {
        res.status(404).json({ ok: false, error: "No timeline found for this job" });
        return;
      }
      res.json({ ok: true, data: timeline });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /milestones/:jobId/advance — Advance milestone
  router.post("/milestones/:jobId/advance", async (req, res) => {
    try {
      const result = milestoneTrackingEngine.advanceMilestone({
        job_id: req.params.jobId,
        milestone_key: req.body?.milestone_key,
        notes: req.body?.notes,
        advanced_by: req.body?.advanced_by,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // POST /quality-docs — Add quality document (internal)
  router.post("/quality-docs", async (req, res) => {
    try {
      const result = customerPortalEngine.addQualityDocument(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /quality-docs/:jobId — List quality documents (internal: all statuses)
  router.get("/quality-docs/:jobId", async (req, res) => {
    try {
      const docs = customerPortalEngine.listQualityDocuments(req.params.jobId, false);
      res.json({ ok: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /service-cases — Create service case
  router.post("/service-cases", async (req, res) => {
    try {
      const result = customerPortalEngine.createServiceCase(req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // GET /service-cases/:entityType/:entityId — List service cases
  router.get("/service-cases/:entityType/:entityId", async (req, res) => {
    try {
      const entityType = req.params.entityType;
      if (entityType !== "quote" && entityType !== "order") {
        res.status(400).json({ ok: false, error: "entityType must be quote or order" });
        return;
      }

      const cases = customerPortalEngine.listServiceCases(entityType, req.params.entityId);
      res.json({ ok: true, data: cases });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // POST /service-cases/:caseId/update — Update service case
  router.post("/service-cases/:caseId/update", async (req, res) => {
    try {
      const result = customerPortalEngine.updateServiceCase({
        case_id: req.params.caseId,
        status: req.body?.status,
        owner: req.body?.owner,
        escalate: req.body?.escalate,
        satisfaction_score: req.body?.satisfaction_score,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.post("/milestones/:jobId/sync", async (req, res) => {
    try {
      const result = milestoneIntelligenceEngine.syncMutation({
        job_id: req.params.jobId,
        source: req.body?.source,
        trigger: req.body?.trigger,
        status: req.body?.status,
        operation: req.body?.operation,
        hours: req.body?.hours,
        quantity_completed: req.body?.quantity_completed,
        scrap_qty: req.body?.scrap_qty,
        note: req.body?.note,
      });
      res.json({ ok: true, data: result });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.get("/milestones/:jobId/sync-events", async (req, res) => {
    try {
      const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
      const events = milestoneIntelligenceEngine.listSyncEvents(req.params.jobId, limit);
      res.json({ ok: true, data: events });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  return router;
}
