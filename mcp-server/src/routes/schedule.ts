/**
 * PRISM MCP Server — Schedule Routes
 * Job scheduling, machine status, capacity planning
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

export function createScheduleRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/schedule/jobs — Schedule jobs across machines
  router.post("/jobs", async (req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "job_schedule", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/schedule/machines — Machine status overview
  router.get("/machines", async (_req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "machine_status", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/schedule/capacity — Capacity planning
  router.post("/capacity", async (req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "capacity_plan", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/schedule/conflicts — Schedule conflicts
  router.get("/conflicts", async (_req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "conflict_detect", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  return router;
}
