/**
 * PRISM MCP Server — Route Registry
 * Central registration for all API route modules
 *
 * 15 route modules, 84 endpoints total:
 * - SFC (7), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
 * - PPG (8), Learning (10), ERP (10)
 * + WebSocket handler at /ws (6 channels)
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
import { createAuthRouter } from "./auth.js";
import { createAdminRouter } from "./admin.js";
import { createOpenApiRouter } from "./openapi.js";
import { createPpgRouter } from "./ppg.js";
import { createLearningRouter } from "./learning.js";
import { createErpRouter } from "./erp.js";
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
  app.use("/api/v1/auth", createAuthRouter(callTool));
  app.use("/api/v1/admin", createAdminRouter(callTool));
  app.use("/api/v1/ppg", createPpgRouter(callTool));
  app.use("/api/v1/learning", createLearningRouter(callTool));
  app.use("/api/v1/erp", createErpRouter(callTool));
  app.use("/api", createOpenApiRouter());

  // Error handler — must be last
  app.use("/api", errorHandler);

  log.info("[API] Registered 15 route modules (84 endpoints) under /api/v1/");
}
