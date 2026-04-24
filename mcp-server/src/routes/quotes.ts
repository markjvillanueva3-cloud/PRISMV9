/**
 * PRISM MCP Server — Instant Quote & Revision Routes
 * 7 endpoints: instant quote, qty breaks, lead time, revise, history, status, share
 *
 * Session 6-3 U-IQUOTE3
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

function parseOptionalInt(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createQuotesRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /quotes/instant — Generate instant quote with CI95, DFM, qty breaks, lead times
  router.post("/instant", async (req, res) => {
    try {
      const result = await callTool("prism_business", "instant_quote", req.body);
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // POST /quotes/qty-breaks — Standalone qty break calculation
  router.post("/qty-breaks", async (req, res) => {
    try {
      const result = await callTool("prism_business", "instant_quote_qty_breaks", req.body);
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // POST /quotes/lead-time — Standalone lead time options
  router.post("/lead-time", async (req, res) => {
    try {
      const result = await callTool("prism_business", "instant_quote_lead_time", req.body);
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // POST /quotes/:id/revise — Create new revision
  router.post("/:id/revise", async (req, res) => {
    try {
      const result = await callTool("prism_business", "quote_revise", {
        ...req.body,
        quote_id: req.params.id,
      });
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // GET /quotes/:id/history — Get revision + status history
  router.get("/:id/history", async (req, res) => {
    try {
      const result = await callTool("prism_business", "quote_get_history", {
        quote_id: req.params.id,
      });
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // POST /quotes/:id/status — Change quote status
  router.post("/:id/status", async (req, res) => {
    try {
      const result = await callTool("prism_business", "quote_status_change", {
        ...req.body,
        quote_id: req.params.id,
      });
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  // GET /quotes/:id/share — Generate share token for customer portal
  router.get("/:id/share", async (req, res) => {
    try {
      const result = await callTool("prism_business", "quote_generate_share_token", {
        quote_id: req.params.id,
        expires_in_days: parseOptionalInt(req.query.expires_in_days),
      });
      res.json({ ok: true, data: result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ ok: false, error: msg });
    }
  });

  return router;
}
