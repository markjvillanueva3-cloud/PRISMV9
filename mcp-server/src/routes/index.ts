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
import { attachUserPlan } from "../middleware/attachUserPlan.js";
import { auditLog } from "../middleware/auditLog.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { createSfcRouter } from "./sfc.js";
import { createToolCribRouter } from "./toolCrib.js";
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
import shopLiveRouter from "./shopLive.js"; // default-export router (paths /shop/*, mounts at /api)
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
import { createDocLearnRouter } from "./docLearn.js";
import { createDocumentRouter } from "./document.js";
import { createDrawingRouter } from "./drawing.js";
import { createUploadRouter } from "./upload.js";
import { createOperatorRouter } from "./operator.js";
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
import { createKnowledgeRouter } from "./knowledge.js";
import { createTravelerRouter } from "./traveler.js";
import { createPortalRouter } from "./portal.js";
import { createPresetsLearningRouter } from "./presets-learning.js";
import { createBillingRouter } from "./billing.js";
import { createRealtimeRouter } from "./realtime.js";
import { createViewerRouter } from "./viewer.js";
import { createApiExtRouter } from "./api-ext.js";
import { createCalibrationRouter } from "./calibration.js";
import { createAssetCheckRouter } from "./asset-check.js";
// FE-ROUTE-MOUNT (slot:sierra 2026-06-18): 8 frontend-facing routers existed in routes/ with real
// handlers + verified-registered dispatcher ACTIONS but were NEVER mounted here -> the web app 404'd
// on every /api/v1/{cnc-ops,diagnosis,mechanical,milling,thermal,vibration,settings,print} call.
// Wired below. (specialty/{grinding,forming,welding} is NOT mounted -- its router calls dispatcher
// action names that do not exist; deferred to U-FE-SPECIALTY-CONTRACT, see the mount-block note.)
import { createCncOpsRouter } from "./cncOps.js";
import { createDiagnosisRouter } from "./diagnosis.js";
import { createMechanicalRouter } from "./mechanical.js";
import { createMillingRouter } from "./milling.js";
import { createThermalRouter } from "./thermal.js";
import { createVibrationRouter } from "./vibration.js";
import { createSettingsRouter } from "./settings.js";
import { createPrintRouter } from "./print.js";
// FE-ROUTE-MOUNT (slot:romeo 2026-06-18): 2 MORE orphaned routers found by the FE<->BE contract audit --
// engine-backed (no callTool/dispatcher dependency, so no missing-action issue), each with a passing route
// test, but never mounted -> the SPA's shopProfile.ts (/api/v1/shop) + wedmErp.ts (/api/v1/wedm-erp) 404'd.
import { createShopProfileRouter } from "./shopProfile.js";
import { createWedmErpRouter } from "./wedm-erp.js";
// FE-ROUTE-MOUNT (slot:romeo 2026-06-18): MCAT-MS0 U-MCAT19 machine-audit dashboard backend -- real JM
// fleet data-completeness audit for web/src/pages/MachineDataAuditPage.tsx (was 404 -> mock fallback).
import { createMachineAuditRouter } from "./machineAudit.js";
import { createSpecialtyRouter } from "./specialty.js";
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
  app.use("/api", attachUserPlan);           // U-COMM-03: resolve subscription plan + usage onto req.user (gates depend on it)
  app.use("/api", auditLog);                 // Audit log all write operations
  app.use("/api", apiVersioning);            // INFRA-7-1: X-API-Version + deprecation headers

  // Mount route modules under /api/v1/
  app.use("/api/v1/sfc", createSfcRouter(callTool));
  // QUEBEC/U-TOOLCRIB-ROUTE: REST bridge for ToolCribEngine (prism_calc:tool_crib_*) -- the calc-domain
  // sibling of the sfc router; web/src/api/toolCrib.ts (Kienzle Tool Crib page) targets this path.
  app.use("/api/v1/tool-crib", createToolCribRouter(callTool));
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
  // FE-ROUTE-MOUNT (slot:bravo 2026-06-19, U-FE-DOC-LEARN-MOUNT): the SPA web/src/api/docLearn.ts
  // posts to /api/v1/doc-learn/* and casts the raw body to its result type; prism_doc_learn is built
  // but learning.ts only served it at /api/v1/learning/document/* in an {ok,data} envelope -> SPA 404'd.
  app.use("/api/v1/doc-learn", createDocLearnRouter(callTool));
  // U-XRAY-DOCUMENT-REST-ROUTE (slot:xray 2026-06-24): REST parity for the document extraction chain
  // (office/OCR/documentLearning -> versioned contract -> consumer fan-out) -- previously MCP-only via
  // prism_resource_extraction. Mirrors the blueprint extract routes in routes/cad.ts. Endpoints:
  // POST /api/v1/document/extract-{contract,route}. Distinct base from doc/doc-learn -> no shadowing.
  app.use("/api/v1/document", createDocumentRouter(callTool));
  // U-XRAY-DRAWING-EXTRACT-ROUTE (slot:xray 2026-06-24): Phase-1 upload->extract->contract chain.
  // POST /api/v1/drawing/extract -- DXF/content synchronous (producer -> blueprint_extract_and_route),
  // PDF/raster returns 202 queued (async VLM OCR). Distinct base from /cad + /document -> no shadowing.
  app.use("/api/v1/drawing", createDrawingRouter(callTool));
  // U-XRAY-UPLOAD-ROUTE-WIRE (slot:xray 2026-06-24): register the previously-orphaned upload router
  // (POST /api/v1/upload, GET /types) -- the front of the upload -> /drawing/extract chain. Adds a
  // 64MB base64 size guard (disk-fill DoS). Distinct base -> no shadowing.
  app.use("/api/v1/upload", createUploadRouter(callTool));
  // FE-ROUTE-MOUNT (slot:bravo 2026-06-19, U-FE-OPERATOR-FEEDBACK): the SPA OperatorFeedbackPanel
  // POSTs to /api/operator/feedback (no v1 prefix) -> prism_session:operator_feedback_record (RLHF).
  app.use("/api/operator", createOperatorRouter(callTool));
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
  // FEATURE-AI-DASHBOARD-WIRE/U-KNOWLEDGE-ROUTER-MOUNT (slot:india 2026-06-19):
  // the web app's api/knowledge.ts client (AI/Fleet learning dashboards, knowledge
  // search, course builder) calls /api/v1/knowledge/* -- previously 404 (only the
  // unrelated -ext router was mounted). Wires those 14 endpoints to real
  // prism_knowledge (learn_*) actions.
  app.use("/api/v1/knowledge", createKnowledgeRouter(callTool));
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

  // FE-ROUTE-MOUNT (slot:sierra 2026-06-18): 8 routers that had real handlers + verified dispatcher
  // actions but were never mounted, so the web app 404'd on these. Each inherits the global /api
  // middleware stack. Mounted after the bare-path aliases, before the error handler, so registration
  // order never shadows an existing route (the bases are all distinct).
  //
  // U-FE-SPECIALTY-CONTRACT (slot:sierra 2026-06-18): the specialty router now serves the GRINDING
  // cluster (/grinding/{calculate,wheel-select,dressing}) against REAL prism_grinding actions with
  // faithful param/result adapters. forming/* + welding/* return fail-loud 501s carrying the verified
  // per-endpoint contract reason (deferred to U-FE-SPECIALTY-{FORMING,WELDING}-CONTRACT). Mounted bare
  // at /api/v1 so the SPA's /api/v1/{grinding,forming,welding}/* paths resolve; sub-paths are distinct
  // from every other /api/v1 router so registration order never shadows.
  app.use("/api/v1/cnc-ops", createCncOpsRouter(callTool));
  app.use("/api/v1/diagnosis", createDiagnosisRouter(callTool));
  app.use("/api/v1/mechanical", createMechanicalRouter(callTool));
  app.use("/api/v1/milling", createMillingRouter(callTool));
  app.use("/api/v1/thermal", createThermalRouter(callTool));
  app.use("/api/v1/vibration", createVibrationRouter(callTool));
  app.use("/api/v1/settings", createSettingsRouter(callTool));
  app.use("/api/v1/print", createPrintRouter(callTool));
  app.use("/api/v1", createSpecialtyRouter(callTool)); // /grinding/* live; /forming/*,/welding/* 501-deferred
  // FE-ROUTE-MOUNT (slot:romeo 2026-06-18): orphaned engine-backed routers (no callTool arg).
  app.use("/api/v1/shop", createShopProfileRouter());      // SPA web/src/api/shopProfile.ts (/profile,/machines,/magazine)
  app.use("/api/v1/wedm-erp", createWedmErpRouter());      // SPA web/src/api/wedmErp.ts + WedmQuote/Completion components
  app.use("/api/machine-audit", createMachineAuditRouter()); // SPA web/src/pages/MachineDataAuditPage.tsx (real JM fleet audit)

  app.use("/api", createOpenApiRouter());

  // FE-ROUTE-MOUNT 2026-06-18 (slot:romeo, frontend<->backend contract audit): shopLive.ts was a
  // complete 19-endpoint live-shop router (ShopStateEngine-backed) that was NEVER mounted -> the web
  // SPA's getShopFloorSnapshot()/getShopJobs() (GET /api/shop/snapshot, /api/shop/jobs) 404'd. Its
  // routes are top-level (/shop/*) so it mounts BARE at /api (same pattern as openapi/ppg). No callTool
  // dependency. See state/shared/FRONTEND-BACKEND-CONTRACT-AUDIT.json.
  app.use("/api", shopLiveRouter);

  // Error handler — must be last
  app.use("/api", errorHandler);

  log.info("[API] Registered 49 route modules under /api/v1/ (+8 FE-ROUTE-MOUNT 2026-06-18: cnc-ops, diagnosis, mechanical, milling, thermal, vibration, settings, print; specialty grinding-cluster live (U-FE-SPECIALTY-CONTRACT), forming/welding 501-deferred; +1 shopLive /api/shop/*; +3 romeo FE-ROUTE-MOUNT: /api/v1/shop, /api/v1/wedm-erp, /api/machine-audit)");
}
