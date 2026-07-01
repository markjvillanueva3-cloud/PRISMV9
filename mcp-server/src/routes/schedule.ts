/**
 * PRISM MCP Server -- Schedule Routes
 * Job scheduling, machine status, capacity planning
 */
import { Router } from "express";
import type { CallToolFn } from "./index.js";

/** Creates schedule router.
 * @param callTool - call tool
 * @returns router
 */
export function createScheduleRouter(callTool: CallToolFn): Router {
  const router = Router();

  // POST /api/v1/schedule/jobs -- Schedule jobs across machines
  router.post("/jobs", async (req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "job_schedule", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/schedule/machines -- Machine status OVERVIEW (all machines). prism_scheduling has NO
  // machine-status action (prior `machine_status` -> silent 200+{error}). Re-routed to the
  // prism_machine_live dispatcher's `machine_all_status` -- the ALL-machines overview, whose schema is
  // { response_level? }.passthrough() so an empty body validates. (Its sibling `machine_live_status`
  // REQUIRES machine_id:min(1), so calling it here with {} would itself 200+{error} -- the very class
  // this fixes; machine_all_status is the correct no-id overview for this endpoint.)
  router.get("/machines", async (_req, res, next) => {
    try {
      const result = await callTool("prism_machine_live", "machine_all_status", {});
      res.json({ result });
    } catch (e) { next(e); }
  });

  // POST /api/v1/schedule/capacity -- Capacity planning
  router.post("/capacity", async (req, res, next) => {
    try {
      const result = await callTool("prism_scheduling", "capacity_plan", req.body);
      res.json({ result });
    } catch (e) { next(e); }
  });

  // GET /api/v1/schedule/conflicts -- Schedule conflicts. prism_scheduling exposes no conflict
  // detector (prior `conflict_detect` did not exist); the nearest actions (bottleneck_find,
  // resource_balance) answer DIFFERENT questions (capacity bottlenecks / load balancing, not
  // double-booking conflicts). Fail loud (501) rather than mislabel one of them as a conflict scan.
  router.get("/conflicts", async (_req, res) => {
    res.status(501).json({
      message: "schedule conflict detection not yet wired -- prism_scheduling has no conflict_detect action (bottleneck_find / resource_balance answer different questions). Wire a real conflict scan to enable this endpoint.",
      error: "not_implemented",
    });
  });

  return router;
}
