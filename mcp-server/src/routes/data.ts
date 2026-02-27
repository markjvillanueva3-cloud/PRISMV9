/**
 * PRISM MCP Server — Data Routes
 * Material, tool, machine, and alarm lookups from registries
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createDataRouter(callTool: CallToolFn): Router {
  const router = Router();

  // GET /api/v1/data/material/:id — Get material by ID
  router.get("/material/:id", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "material_get", { id: req.params.id });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/material/search — Search materials
  router.post("/material/search", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "material_search", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/tool/:id — Get tool by ID
  router.get("/tool/:id", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "tool_get", { id: req.params.id });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/tool/search — Search tools
  router.post("/tool/search", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "tool_search", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/data/machine/:id — Get machine by ID
  router.get("/machine/:id", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "machine_get", { id: req.params.id });
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/machine/search — Search machines
  router.post("/machine/search", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "machine_search", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/data/alarm/decode — Decode machine alarm
  router.post("/alarm/decode", async (req, res, next) => {
    try {
      const result = await callTool("prism_data", "alarm_decode", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
