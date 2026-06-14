/**
 * PRISM MCP Server — Route Registry
 * Central registration for all API route modules
 *
 * 41 route modules:
 * - SFC (7), SpeedFeed (8), CAD (5), CAM (4), Quality (4), Schedule (4), Cost (4)
 * - Export (5), Data (7), Safety (4), Auth (6), Admin (6), OpenAPI (1)
 * - PPG (8), Learning (10), ERP (10)
 * - EDM (7), Turning (6)
 * - Threads (12), Compliance (8), Telemetry (7)
 * - Orchestration (26), Bridge (13), PUOA (14)
 * - Session (32), Context (26)
 * - Validate (7), Omega (5), Ralph (3), Dev (12)
 * - SP (19), SkillScript (27), Doc (7)
 * - Hook (20), GSD (6), Manus (11)
 * + WebSocket handler at /ws (6 channels)
 */
import type { Express } from "express";
import { corsMiddleware } from "../middleware/cors.js";
import { securityHeaders } from "../middleware/securityHeaders.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { optionalToken } from "../middleware/auth.js";
import { auditLog } from "../middleware/auditLog.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { createSfcRouter } from "./sfc.js";
import { createSpeedFeedRouter } from "./speedfeed.js";
import { createQuotingRouter } from "./quoting.js";
import { createCadRouter } from "./cad.js";
import { createCadRegressionRouter } from "./cadRegression.js";
import { createCamRouter } from "./cam.js";
import { createQualityRouter } from "./quality.js";
import { createScheduleRouter } from "./schedule.js";
import { createCostRouter } from "./cost.js";
import { createExportRouter } from "./exportRoutes.js";
import { createDataRouter } from "./data.js";
import { createSafetyRouter } from "./safety.js";
import { createAuthRouter } from "./auth.js";
import { createAgentRouter } from "./agent.js";
import { createAdminRouter } from "./admin.js";
import { createHotelPortalRouter } from "./hotel-portal.js";
import { createOpenApiRouter } from "./openapi.js";
import { createPpgRouter } from "./ppg.js";
import { createLearningRouter } from "./learning.js";
import { createErpRouter } from "./erp.js";
import { createBusinessRouter } from "./business.js";
import { createEdmRouter } from "./edm.js";
import { createTurningRouter } from "./turning.js";
import { createThreadRouter } from "./threads.js";
import { createComplianceRouter } from "./compliance.js";
import { createTelemetryRouter } from "./telemetry.js";
import { createOrchestrationRouter } from "./orchestration.js";
import { createBridgeRouter } from "./bridge.js";
import { createSessionRouter } from "./session.js";
import { createContextRouter } from "./context.js";
import { createValidateRouter } from "./validate.js";
import { createOmegaRouter } from "./omega.js";
import { createRalphRouter } from "./ralph.js";
import { createDevRouter } from "./dev.js";
import { createSpRouter } from "./sp.js";
import { createSkillScriptRouter } from "./skillScript.js";
import { createDocRouter } from "./doc.js";
import { createInboxRouter } from "./inbox.js";
import { createHookRouter } from "./hook.js";
import { createGsdRouter } from "./gsd.js";
import { createManusRouter } from "./manus.js";
import { createLatheTurningRouter } from "./latheTurning.js";
import { createPartsRouter } from "./parts.js";
import { createQuotesRouter } from "./quotes.js";
import { createQuoteRouter } from "./quote.js";
import { createDfmRouter } from "./dfm.js";
import { createOperatingSystemRouter } from "./operating-system.js";
import { createMachineLiveRouter } from "./machineLive.js";
import { createPipelineRouter } from "./pipeline.js";
import { createIntegrationsRouter } from "./integrations.js";
import { createKnowledgeExtRouter } from "./knowledgeExt.js";
import { createTravelerRouter } from "./traveler.js";
import { createPortalRouter } from "./portal.js";
import { createPresetsLearningRouter } from "./presets-learning.js";
import { createBillingRouter } from "./billing.js";
import { createRealtimeRouter } from "./realtime.js";
import { createViewerRouter } from "./viewer.js";
import { createApiExtRouter } from "./api-ext.js";
import { createCalibrationRouter } from "./calibration.js";
import { createAssetCheckRouter } from "./asset-check.js";
// import { createPUOARouter } from "./puoa.js";  // TEMP: file corrupted, recreate
import { apiVersioning } from "./openapi.js";
import { log } from "../utils/Logger.js";

/** Tool call function signature — injected from index.ts */
export type CallToolFn = (toolName: string, action: string, params?: Record<string, any>) => Promise<any>;

/**
 * Register all API routes on the Express app
 */
export function registerRoutes(app: Express, callTool: CallToolFn): void {
  // Health check endpoints (no auth, no rate limit)
  const startTime = new Date().toISOString();
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime_sec: Math.floor(process.uptime()), started_at: startTime });
  });
  // Alias for PRISM.cps which calls /api/health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime_sec: Math.floor(process.uptime()), started_at: startTime });
  });
  app.get("/ready", (_req, res) => {
    res.json({ status: "ready", routes: 35, timestamp: new Date().toISOString() });
  });

  // Global middleware stack (order matters)
  app.use("/api", securityHeaders);          // Security headers on all responses
  app.use("/api", corsMiddleware);           // CORS for browser clients
  app.use("/api", rateLimitMiddleware("RL-API-GLOBAL", "global")); // Global rate limit
  app.use("/api", optionalToken);            // Extract user from token if present
  app.use("/api", auditLog);                 // Audit log all write operations
  app.use("/api", apiVersioning);            // INFRA-7-1: X-API-Version + deprecation headers

  // Mount route modules under /api/v1/
  app.use("/api/v1/sfc", createSfcRouter(callTool));
  app.use("/api/v1/speed-feed", createSpeedFeedRouter(callTool));
  // QUOTING-PIPELINE-MS0/U-QP08-HTTP — camera-intake quoting bridge (also mounted at /api/mcp/quoting for the mobile-quote page client)
  app.use("/api/v1/quoting", createQuotingRouter(callTool));
  app.use("/api/mcp/quoting", createQuotingRouter(callTool));
  app.use("/api/v1/cad", createCadRouter(callTool));
  // CAD-INFRA-MS0/U-CINF08: CADRegressionDashboard read-only progress API
  app.use("/api/v1/cad-regression", createCadRegressionRouter(callTool));
  app.use("/api/v1/cam", createCamRouter(callTool));
  app.use("/api/v1/quality", createQualityRouter(callTool));
  app.use("/api/v1/schedule", createScheduleRouter(callTool));
  app.use("/api/v1/cost", createCostRouter(callTool));
  app.use("/api/v1/export", createExportRouter(callTool));
  app.use("/api/v1/data", createDataRouter(callTool));
  app.use("/api/v1/safety", createSafetyRouter(callTool));
  app.use("/api/v1/auth", createAuthRouter(callTool));
  app.use("/api/v1/agent", createAgentRouter(callTool));
  app.use("/api/v1/admin", createAdminRouter(callTool));
  app.use("/api/v1/hotel-portal", createHotelPortalRouter(callTool));
  app.use("/api/v1/ppg", createPpgRouter(callTool));
  // Alias: PRISM.cps and web UI use /api/ppg/ (no v1 prefix)
  app.use("/api/ppg", createPpgRouter(callTool));
  app.use("/api/v1/learning", createLearningRouter(callTool));
  app.use("/api/v1/erp", createErpRouter(callTool));
  // HOTEL-NETPLAT-UI/U-VNET-ROUTE: generic business dispatch surface (deny-by-default allowlist) —
  // the route web/src/api/businessDispatch.ts targets; makes charlie's vendor corpus reachable in the UI.
  app.use("/api/v1/business", createBusinessRouter(callTool));
  app.use("/api/v1/edm", createEdmRouter(callTool));
  app.use("/api/v1/turning", createTurningRouter(callTool));
  app.use("/api/v1/lathe", createLatheTurningRouter(callTool));
  app.use("/api/v1/threads", createThreadRouter(callTool));
  app.use("/api/v1/compliance", createComplianceRouter(callTool));
  app.use("/api/v1/telemetry", createTelemetryRouter(callTool));
  app.use("/api/v1/orchestration", createOrchestrationRouter(callTool));
  app.use("/api/v1/bridge", createBridgeRouter(callTool));
  app.use("/api/v1/session", createSessionRouter(callTool));
  app.use("/api/v1/context", createContextRouter(callTool));
  app.use("/api/v1/validate", createValidateRouter(callTool));
  app.use("/api/v1/omega", createOmegaRouter(callTool));
  app.use("/api/v1/ralph", createRalphRouter(callTool));
  app.use("/api/v1/dev", createDevRouter(callTool));
  app.use("/api/v1/sp", createSpRouter(callTool));
  app.use("/api/v1/skill-script", createSkillScriptRouter(callTool));
  app.use("/api/v1/doc", createDocRouter(callTool));
  app.use("/api/v1/inbox", createInboxRouter(callTool));
  app.use("/api/v1/hook", createHookRouter(callTool));
  app.use("/api/v1/gsd", createGsdRouter(callTool));
  app.use("/api/v1/manus", createManusRouter(callTool));
  app.use("/api/v1", createPartsRouter(callTool));  // /api/v1/parts/* + /api/v1/files/*
  app.use("/api/v1/quote", createQuoteRouter(callTool));
  app.use("/api/v1/quotes", createQuotesRouter(callTool));
  app.use("/api/v1/billing", createBillingRouter());
  app.use("/api/v1/dfm", createDfmRouter(callTool));
  app.use("/api/v1/operating-system", createOperatingSystemRouter(callTool));
  app.use("/api/v1/machine-live", createMachineLiveRouter(callTool));
  app.use("/api/v1/pipeline", createPipelineRouter(callTool));
  app.use("/api/v1/integrations", createIntegrationsRouter(callTool));
  app.use("/api/v1/knowledge-ext", createKnowledgeExtRouter(callTool));
  app.use("/api/v1", createTravelerRouter());  // /api/v1/traveler/* + /api/v1/dispatch/*
  app.use("/api/v1/portal", createPortalRouter());  // /api/v1/portal/* (customer portal + milestones + quality docs)
  app.use("/api/v1", createPresetsLearningRouter());  // /api/v1/presets/* + /api/v1/learning/*
  app.use("/api/v1/realtime", createRealtimeRouter());  // /api/v1/realtime/* (SSE stream + emit + stats)
  app.use("/api/v1/ext", createApiExtRouter(callTool)); // /api/v1/ext/* (external integration — optimize, feedback, learning)
  app.use("/api/v1/calibration", createCalibrationRouter()); // INFRA-5-1: actuals ingestion + outlier detection
  app.use("/api/v1/asset-check", createAssetCheckRouter(callTool)); // PP-INFRA: dedup name/layered gate for hooks
  // app.use("/api/v1/puoa", createPUOARouter());          // TEMP: disabled, file corrupted
  app.use("/api/viewer", createViewerRouter());         // /api/viewer/* (3D scene catalog + scene graph — no /v1/ prefix, matches frontend viewer API)

  // ─── Bare-path aliases (frontend calls these directly) ────────────────────
  app.post("/api/v1/job-plan", async (req, res) => {
    try {
      const result = await callTool("prism_intelligence", "job_plan", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });
  app.post("/api/v1/alarm-decode", async (req, res) => {
    try {
      const result = await callTool("prism_data", "alarm_decode", req.body);
      res.json({ ok: true, data: result });
    } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
  });

  // COST-CASCADE-MS0/U-COST-DASHBOARD — top-level aliases for spec
  // (`/cost-dashboard` per HOTEL-PUNCH-LIST). Canonical URLs remain
  // /api/v1/cost/dashboard + /api/v1/cost/aggregate.
  app.get("/cost-dashboard", (_req, res) => res.redirect(302, "/api/v1/cost/dashboard"));
  app.get("/api/cost-aggregate", (req, res) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") qs.set(k, v);
    }
    const qstr = qs.toString();
    res.redirect(302, "/api/v1/cost/aggregate" + (qstr ? "?" + qstr : ""));
  });

  app.use("/api", createOpenApiRouter());

  // Error handler — must be last
  app.use("/api", errorHandler);

  log.info("[API] Registered 41 route modules under /api/v1/");
}
