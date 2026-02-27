/**
 * PRISM MCP Server — Route Registry
 * Central registration for all API route modules
 *
 * 9 route modules, 42 endpoints total:
 * - SFC (7): calculate, cycle-time, engagement, deflection, power-torque, surface-finish, tool-life
 * - CAD (5): import, export, features, transform, analyze
 * - CAM (4): toolpath/generate, simulate, post-process, collision-check
 * - Quality (4): spc, cpk, measurement, tolerance-stack
 * - Schedule (4): jobs, machines, capacity, conflicts
 * - Cost (4): estimate, quote, compare, history
 * - Export (5): pdf, csv, excel, setup-sheet, speed-feed-card
 * - Data (7): material get/search, tool get/search, machine get/search, alarm decode
 * - Safety (4): validate, check-limits, collision, knowledge/search
 */
import type { Express } from "express";
import { corsMiddleware } from "../middleware/cors.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { createSfcRouter } from "./sfc.js";
import { createCadRouter } from "./cad.js";
import { createCamRouter } from "./cam.js";
import { createQualityRouter } from "./quality.js";
import { createScheduleRouter } from "./schedule.js";
import { createCostRouter } from "./cost.js";
import { createExportRouter } from "./exportRoutes.js";
import { createDataRouter } from "./data.js";
import { createSafetyRouter } from "./safety.js";
import { log } from "../utils/Logger.js";

/** Tool call function signature — injected from index.ts */
export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;

/**
 * Register all API routes on the Express app
 */
export function registerRoutes(app: Express, callTool: CallToolFn): void {
  // Apply CORS middleware to all API routes
  app.use("/api", corsMiddleware);

  // Mount route modules under /api/v1/
  app.use("/api/v1/sfc", createSfcRouter(callTool));
  app.use("/api/v1/cad", createCadRouter(callTool));
  app.use("/api/v1/cam", createCamRouter(callTool));
  app.use("/api/v1/quality", createQualityRouter(callTool));
  app.use("/api/v1/schedule", createScheduleRouter(callTool));
  app.use("/api/v1/cost", createCostRouter(callTool));
  app.use("/api/v1/export", createExportRouter(callTool));
  app.use("/api/v1/data", createDataRouter(callTool));
  app.use("/api/v1/safety", createSafetyRouter(callTool));

  // Error handler — must be last
  app.use("/api", errorHandler);

  log.info("[API] Registered 9 route modules (42 endpoints) under /api/v1/");
}
