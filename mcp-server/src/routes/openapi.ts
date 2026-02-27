/**
 * PRISM MCP Server — OpenAPI Specification
 * Generates OpenAPI 3.0 spec for all REST endpoints
 */
import { Router } from "express";

export function createOpenApiRouter(): Router {
  const router = Router();

  // GET /api/docs — OpenAPI JSON specification
  router.get("/docs", (_req, res) => {
    res.json(getOpenApiSpec());
  });

  return router;
}

function getOpenApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "PRISM Manufacturing Intelligence API",
      version: "1.0.0",
      description: "REST API for CNC manufacturing calculations, CAD/CAM operations, quality management, scheduling, and cost estimation. All endpoints proxy to PRISM MCP dispatchers."
    },
    servers: [
      { url: "/api/v1", description: "PRISM API v1" }
    ],
    paths: {
      "/sfc/calculate": {
        post: { summary: "Speed & feed calculation", tags: ["SFC"], requestBody: jsonBody(["material", "operation"]), responses: stdResponse() }
      },
      "/sfc/cycle-time": {
        post: { summary: "Cycle time estimation", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sfc/engagement": {
        post: { summary: "Tool engagement analysis", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sfc/deflection": {
        post: { summary: "Tool deflection check", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sfc/power-torque": {
        post: { summary: "Power and torque calculation", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sfc/surface-finish": {
        post: { summary: "Surface finish prediction", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sfc/tool-life": {
        post: { summary: "Tool life estimation", tags: ["SFC"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cad/import": {
        post: { summary: "Import STEP/IGES/DXF geometry", tags: ["CAD"], requestBody: jsonBody(["filename"]), responses: stdResponse() }
      },
      "/cad/export": {
        post: { summary: "Export geometry", tags: ["CAD"], requestBody: jsonBody(["format"]), responses: stdResponse() }
      },
      "/cad/features": {
        post: { summary: "Feature recognition", tags: ["CAD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cad/transform": {
        post: { summary: "Geometry transform", tags: ["CAD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cad/analyze": {
        post: { summary: "Geometry analysis", tags: ["CAD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cam/toolpath/generate": {
        post: { summary: "Generate toolpath", tags: ["CAM"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cam/simulate": {
        post: { summary: "Toolpath simulation", tags: ["CAM"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cam/post-process": {
        post: { summary: "Post-process to G-code", tags: ["CAM"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cam/collision-check": {
        post: { summary: "Collision checking", tags: ["CAM"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/quality/spc": {
        post: { summary: "SPC calculation", tags: ["Quality"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/quality/cpk": {
        post: { summary: "Process capability analysis", tags: ["Quality"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/quality/measurement": {
        post: { summary: "Measurement analysis", tags: ["Quality"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/quality/tolerance-stack": {
        post: { summary: "Tolerance stack-up", tags: ["Quality"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/schedule/jobs": {
        post: { summary: "Schedule jobs", tags: ["Schedule"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/schedule/machines": {
        get: { summary: "Machine status overview", tags: ["Schedule"], responses: stdResponse() }
      },
      "/schedule/capacity": {
        post: { summary: "Capacity planning", tags: ["Schedule"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/schedule/conflicts": {
        get: { summary: "Schedule conflicts", tags: ["Schedule"], responses: stdResponse() }
      },
      "/cost/estimate": {
        post: { summary: "Cost estimation", tags: ["Cost"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cost/quote": {
        post: { summary: "Generate quote", tags: ["Cost"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cost/compare": {
        post: { summary: "Cost comparison", tags: ["Cost"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/cost/history/{jobId}": {
        get: { summary: "Job cost history", tags: ["Cost"], parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string" } }], responses: stdResponse() }
      },
      "/export/pdf": {
        post: { summary: "Export to PDF", tags: ["Export"], requestBody: jsonBody(["template"]), responses: stdResponse() }
      },
      "/export/csv": {
        post: { summary: "Export to CSV", tags: ["Export"], requestBody: jsonBody(["data"]), responses: stdResponse() }
      },
      "/export/excel": {
        post: { summary: "Export to Excel", tags: ["Export"], requestBody: jsonBody(["data"]), responses: stdResponse() }
      },
      "/export/setup-sheet": {
        post: { summary: "Generate setup sheet", tags: ["Export"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/export/speed-feed-card": {
        post: { summary: "Generate speed & feed card", tags: ["Export"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/data/material/{id}": {
        get: { summary: "Get material by ID", tags: ["Data"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: stdResponse() }
      },
      "/data/material/search": {
        post: { summary: "Search materials", tags: ["Data"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/data/tool/{id}": {
        get: { summary: "Get tool by ID", tags: ["Data"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: stdResponse() }
      },
      "/data/tool/search": {
        post: { summary: "Search tools", tags: ["Data"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/data/machine/{id}": {
        get: { summary: "Get machine by ID", tags: ["Data"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: stdResponse() }
      },
      "/data/machine/search": {
        post: { summary: "Search machines", tags: ["Data"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/data/alarm/decode": {
        post: { summary: "Decode machine alarm", tags: ["Data"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/safety/validate": {
        post: { summary: "Validate cutting parameters", tags: ["Safety"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/safety/check-limits": {
        post: { summary: "Check machine limits", tags: ["Safety"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/safety/collision": {
        post: { summary: "Collision detection", tags: ["Safety"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/safety/knowledge/search": {
        post: { summary: "Search safety knowledge base", tags: ["Safety"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/auth/login": {
        post: { summary: "User login", tags: ["Auth"], requestBody: jsonBody(["username", "password"]), responses: stdResponse() }
      },
      "/auth/register": {
        post: { summary: "User registration", tags: ["Auth"], requestBody: jsonBody(["username", "email", "password"]), responses: stdResponse() }
      },
      "/auth/refresh": {
        post: { summary: "Refresh auth token", tags: ["Auth"], requestBody: jsonBody(["refreshToken"]), responses: stdResponse() }
      },
      "/auth/logout": {
        post: { summary: "User logout", tags: ["Auth"], responses: stdResponse() }
      },
      "/auth/me": {
        get: { summary: "Get current user profile", tags: ["Auth"], responses: stdResponse() }
      },
      "/auth/api-key": {
        post: { summary: "Generate API key", tags: ["Auth"], responses: stdResponse() }
      },
      "/admin/status": {
        get: { summary: "System status", tags: ["Admin"], responses: stdResponse() }
      },
      "/admin/registries": {
        get: { summary: "Registry statistics", tags: ["Admin"], responses: stdResponse() }
      },
      "/admin/dispatchers": {
        get: { summary: "List dispatchers", tags: ["Admin"], responses: stdResponse() }
      },
      "/admin/users": {
        post: { summary: "Manage users", tags: ["Admin"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/admin/audit-log": {
        get: { summary: "View audit log", tags: ["Admin"], responses: stdResponse() }
      },
      "/admin/cache/clear": {
        post: { summary: "Clear system cache", tags: ["Admin"], responses: stdResponse() }
      },
      "/ppg/generate": {
        post: { summary: "Generate G-code from toolpath", tags: ["PPG"], requestBody: jsonBody(["moves", "controller"]), responses: stdResponse() }
      },
      "/ppg/template": {
        post: { summary: "Generate from parametric template", tags: ["PPG"], requestBody: jsonBody(["controller", "operation"]), responses: stdResponse() }
      },
      "/ppg/program": {
        post: { summary: "Multi-operation program generation", tags: ["PPG"], requestBody: jsonBody(["controller", "operations"]), responses: stdResponse() }
      },
      "/ppg/validate": {
        post: { summary: "Validate G-code for controller", tags: ["PPG"], requestBody: jsonBody(["gcode", "controller"]), responses: stdResponse() }
      },
      "/ppg/compare": {
        post: { summary: "Compare output across controllers", tags: ["PPG"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/ppg/optimize": {
        post: { summary: "Optimize G-code", tags: ["PPG"], requestBody: jsonBody(["gcode"]), responses: stdResponse() }
      },
      "/ppg/controllers": {
        get: { summary: "List supported CNC controllers", tags: ["PPG"], responses: stdResponse() }
      },
      "/ppg/operations": {
        get: { summary: "List supported G-code operations", tags: ["PPG"], responses: stdResponse() }
      },
      "/learning/assess": {
        post: { summary: "Assess operator skill levels", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/plan": {
        post: { summary: "Generate learning plan", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/progress": {
        post: { summary: "Track learning progress", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/recommend": {
        post: { summary: "Recommend learning modules", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/knowledge/search": {
        post: { summary: "Search knowledge base", tags: ["Learning"], requestBody: jsonBody(["query"]), responses: stdResponse() }
      },
      "/learning/tribal": {
        post: { summary: "Search tribal knowledge", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/select/material": {
        post: { summary: "Material selection wizard", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/select/tool": {
        post: { summary: "Tool selection wizard", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/select/machine": {
        post: { summary: "Machine selection wizard", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/learning/twin": {
        post: { summary: "Digital twin operations", tags: ["Learning"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/quote/generate": {
        post: { summary: "Generate manufacturing quote", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/quote/breakdown": {
        post: { summary: "Detailed cost breakdown", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/quote/compare": {
        post: { summary: "Compare quotes", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/job/plan": {
        post: { summary: "Plan manufacturing job", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/job/schedule": {
        post: { summary: "Schedule job on machines", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/job/track": {
        post: { summary: "Track job progress", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/analytics/capacity": {
        post: { summary: "Capacity utilization analysis", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/analytics/bottleneck": {
        post: { summary: "Bottleneck identification", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/analytics/oee": {
        post: { summary: "Overall Equipment Effectiveness", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/erp/analytics/predictive": {
        post: { summary: "Predictive maintenance", tags: ["ERP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/tap-drill": {
        post: { summary: "Calculate tap drill size", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/mill-params": {
        post: { summary: "Thread milling parameters", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/depth": {
        post: { summary: "Thread depth calculation", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/engagement": {
        post: { summary: "Thread engagement percentage", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/specifications": {
        post: { summary: "Get thread specifications", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/gauges": {
        post: { summary: "Go/no-go gauge dimensions", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/pitch-diameter": {
        post: { summary: "Pitch diameter calculation", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/diameters": {
        post: { summary: "Minor/major diameter calculation", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/select-insert": {
        post: { summary: "Select threading insert", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/cutting-params": {
        post: { summary: "Thread cutting parameters", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/validate-fit": {
        post: { summary: "Validate thread fit class", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/threads/gcode": {
        post: { summary: "Generate threading G-code", tags: ["Threads"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/template/apply": {
        post: { summary: "Apply compliance template", tags: ["Compliance"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/template/remove": {
        post: { summary: "Remove compliance template", tags: ["Compliance"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/templates": {
        get: { summary: "List compliance templates", tags: ["Compliance"], responses: stdResponse() }
      },
      "/compliance/audit": {
        get: { summary: "Audit compliance status", tags: ["Compliance"], responses: stdResponse() }
      },
      "/compliance/check": {
        post: { summary: "Check compliance against standards", tags: ["Compliance"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/resolve": {
        post: { summary: "Resolve compliance conflicts", tags: ["Compliance"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/gap-analysis": {
        post: { summary: "Run compliance gap analysis", tags: ["Compliance"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/compliance/config": {
        get: { summary: "Get compliance configuration", tags: ["Compliance"], responses: stdResponse() }
      },
      "/telemetry/dashboard": {
        get: { summary: "Telemetry dashboard overview", tags: ["Telemetry"], responses: stdResponse() }
      },
      "/telemetry/detail": {
        post: { summary: "Detailed metric telemetry", tags: ["Telemetry"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/telemetry/anomalies": {
        get: { summary: "Detected anomalies", tags: ["Telemetry"], responses: stdResponse() }
      },
      "/telemetry/optimization": {
        get: { summary: "Optimization recommendations", tags: ["Telemetry"], responses: stdResponse() }
      },
      "/telemetry/acknowledge": {
        post: { summary: "Acknowledge anomaly or alert", tags: ["Telemetry"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/telemetry/freeze": {
        post: { summary: "Freeze telemetry weights", tags: ["Telemetry"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/telemetry/unfreeze": {
        post: { summary: "Unfreeze telemetry weights", tags: ["Telemetry"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/agent/execute": {
        post: { summary: "Execute single agent", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/agent/parallel": {
        post: { summary: "Execute agents in parallel", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/agent/pipeline": {
        post: { summary: "Execute agent pipeline", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/plan/create": {
        post: { summary: "Create execution plan", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/plan/execute": {
        post: { summary: "Execute plan", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/plan/status": {
        get: { summary: "Plan execution status", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/queue/stats": {
        get: { summary: "Queue statistics", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/sessions": {
        get: { summary: "List active sessions", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/swarm/execute": {
        post: { summary: "Execute swarm task", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/swarm/parallel": {
        post: { summary: "Parallel swarm execution", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/swarm/consensus": {
        post: { summary: "Swarm consensus decision", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/swarm/pipeline": {
        post: { summary: "Swarm pipeline execution", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/swarm/status": {
        get: { summary: "Swarm execution status", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/swarm/patterns": {
        get: { summary: "Available swarm patterns", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/swarm/quick": {
        post: { summary: "Quick swarm execution", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/plan": {
        post: { summary: "Create roadmap plan", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/next-batch": {
        post: { summary: "Get next roadmap batch", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/advance": {
        post: { summary: "Advance roadmap position", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/gate": {
        post: { summary: "Run roadmap phase gate", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/list": {
        get: { summary: "List roadmap milestones", tags: ["Orchestration"], responses: stdResponse() }
      },
      "/orchestration/roadmap/load": {
        post: { summary: "Load roadmap definition", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/claim": {
        post: { summary: "Claim roadmap unit", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/release": {
        post: { summary: "Release roadmap unit", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/heartbeat": {
        post: { summary: "Roadmap worker heartbeat", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/discover": {
        post: { summary: "Discover roadmap files", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/orchestration/roadmap/register": {
        post: { summary: "Register roadmap", tags: ["Orchestration"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/endpoint/register": {
        post: { summary: "Register external endpoint", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/endpoint/remove": {
        post: { summary: "Remove external endpoint", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/endpoint/status": {
        post: { summary: "Set endpoint status", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/endpoints": {
        get: { summary: "List registered endpoints", tags: ["Bridge"], responses: stdResponse() }
      },
      "/bridge/key/create": {
        post: { summary: "Create API key", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/key/revoke": {
        post: { summary: "Revoke API key", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/key/validate": {
        post: { summary: "Validate API key", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/keys": {
        get: { summary: "List API keys", tags: ["Bridge"], responses: stdResponse() }
      },
      "/bridge/route": {
        post: { summary: "Route request to external system", tags: ["Bridge"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/bridge/route-map": {
        get: { summary: "Get routing map", tags: ["Bridge"], responses: stdResponse() }
      },
      "/bridge/health": {
        get: { summary: "Bridge health check", tags: ["Bridge"], responses: stdResponse() }
      },
      "/bridge/stats": {
        get: { summary: "Bridge statistics", tags: ["Bridge"], responses: stdResponse() }
      },
      "/bridge/config": {
        get: { summary: "Bridge configuration", tags: ["Bridge"], responses: stdResponse() }
      },
      "/session/state/load": {
        post: { summary: "Load session state", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/state/save": {
        post: { summary: "Save session state", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/state/checkpoint": {
        post: { summary: "Create state checkpoint", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/state/diff": {
        post: { summary: "Diff session states", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/state/rollback": {
        post: { summary: "Rollback session state", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/state/reconstruct": {
        post: { summary: "Reconstruct session state", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/start": {
        post: { summary: "Start new session", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/end": {
        post: { summary: "End session", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/recover": {
        post: { summary: "Recover session", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/resume": {
        post: { summary: "Resume session", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/quick-resume": {
        post: { summary: "Quick resume session", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/resume-score": {
        post: { summary: "Score resume candidates", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/handoff": {
        post: { summary: "Prepare session handoff", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/memory/save": {
        post: { summary: "Save to session memory", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/memory/recall": {
        post: { summary: "Recall from session memory", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/context/pressure": {
        get: { summary: "Get context pressure", tags: ["Session"], responses: stdResponse() }
      },
      "/session/context/size": {
        get: { summary: "Get context size", tags: ["Session"], responses: stdResponse() }
      },
      "/session/context/compress": {
        post: { summary: "Compress context", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/context/expand": {
        post: { summary: "Expand context", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/context/compaction": {
        get: { summary: "Detect compaction", tags: ["Session"], responses: stdResponse() }
      },
      "/session/transcript": {
        post: { summary: "Read transcript", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/wip/capture": {
        post: { summary: "Capture work in progress", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/wip/list": {
        get: { summary: "List WIP items", tags: ["Session"], responses: stdResponse() }
      },
      "/session/wip/restore": {
        post: { summary: "Restore WIP", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/checkpoint/auto": {
        post: { summary: "Auto checkpoint", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/checkpoint/enhanced": {
        post: { summary: "Enhanced checkpoint", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/workflow/start": {
        post: { summary: "Start workflow", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/workflow/advance": {
        post: { summary: "Advance workflow", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/workflow/status": {
        get: { summary: "Workflow status", tags: ["Session"], responses: stdResponse() }
      },
      "/session/workflow/complete": {
        post: { summary: "Complete workflow", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/session/health": {
        get: { summary: "Session health check", tags: ["Session"], responses: stdResponse() }
      },
      "/session/dsl-mode": {
        post: { summary: "Set DSL mode", tags: ["Session"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/kv/sort": {
        post: { summary: "Sort JSON KV store", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/kv/stability": {
        post: { summary: "Check KV stability", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/tool-mask": {
        post: { summary: "Tool mask state", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/memory/externalize": {
        post: { summary: "Externalize memory", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/memory/restore": {
        post: { summary: "Restore memory", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/todo/update": {
        post: { summary: "Update todo", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/todo": {
        get: { summary: "Read todos", tags: ["Context"], responses: stdResponse() }
      },
      "/context/error/preserve": {
        post: { summary: "Preserve error context", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/error/patterns": {
        get: { summary: "Get error patterns", tags: ["Context"], responses: stdResponse() }
      },
      "/context/vary-response": {
        post: { summary: "Vary response style", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/team/spawn": {
        post: { summary: "Spawn team member", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/team/broadcast": {
        post: { summary: "Broadcast to team", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/team/task": {
        post: { summary: "Create team task", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/team/heartbeat": {
        post: { summary: "Team heartbeat", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/budget": {
        get: { summary: "Get budget", tags: ["Context"], responses: stdResponse() }
      },
      "/context/budget/track": {
        post: { summary: "Track budget usage", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/budget/report": {
        get: { summary: "Budget report", tags: ["Context"], responses: stdResponse() }
      },
      "/context/budget/reset": {
        post: { summary: "Reset budget", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/attention/score": {
        post: { summary: "Score attention", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/focus/optimize": {
        post: { summary: "Optimize focus", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/relevance/filter": {
        post: { summary: "Filter by relevance", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/monitor": {
        get: { summary: "Context monitor check", tags: ["Context"], responses: stdResponse() }
      },
      "/context/catalog": {
        get: { summary: "Catalog overview", tags: ["Context"], responses: stdResponse() }
      },
      "/context/catalog/search": {
        post: { summary: "Search catalog", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/catalog/engine": {
        post: { summary: "Get engine details", tags: ["Context"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/context/catalog/stats": {
        get: { summary: "Catalog statistics", tags: ["Context"], responses: stdResponse() }
      },
      "/validate/material": {
        post: { summary: "Validate material data", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/kienzle": {
        post: { summary: "Validate Kienzle coefficients", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/taylor": {
        post: { summary: "Validate Taylor tool life", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/johnson-cook": {
        post: { summary: "Validate Johnson-Cook model", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/safety": {
        post: { summary: "Validate safety parameters", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/completeness": {
        post: { summary: "Validate data completeness", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/validate/anti-regression": {
        post: { summary: "Anti-regression validation", tags: ["Validate"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/omega/compute": {
        post: { summary: "Compute Omega quality score", tags: ["Omega"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/omega/breakdown": {
        post: { summary: "Omega score breakdown", tags: ["Omega"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/omega/validate": {
        post: { summary: "Validate against Omega threshold", tags: ["Omega"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/omega/optimize": {
        post: { summary: "Optimize for Omega score", tags: ["Omega"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/omega/history": {
        get: { summary: "Omega score history", tags: ["Omega"], responses: stdResponse() }
      },
      "/ralph/loop": {
        post: { summary: "RALPH quality loop", tags: ["Ralph"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/ralph/scrutinize": {
        post: { summary: "RALPH scrutinize", tags: ["Ralph"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/ralph/assess": {
        post: { summary: "RALPH quality assessment", tags: ["Ralph"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/session-boot": {
        post: { summary: "Boot dev session", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/build": {
        post: { summary: "Trigger build", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/code/template": {
        post: { summary: "Generate code template", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/code/search": {
        post: { summary: "Search codebase", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/file/read": {
        post: { summary: "Read file", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/file/write": {
        post: { summary: "Write file", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/server-info": {
        get: { summary: "Server information", tags: ["Dev"], responses: stdResponse() }
      },
      "/dev/test/smoke": {
        post: { summary: "Run smoke tests", tags: ["Dev"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/dev/test/results": {
        get: { summary: "Get test results", tags: ["Dev"], responses: stdResponse() }
      },
      "/sp/brainstorm": {
        post: { summary: "Brainstorm solutions", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/plan": {
        post: { summary: "Create execution plan", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/execute": {
        post: { summary: "Execute plan step", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/review/spec": {
        post: { summary: "Review specification", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/review/quality": {
        post: { summary: "Review quality", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/debug": {
        post: { summary: "Debug issue", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/cognitive/init": {
        post: { summary: "Initialize cognitive model", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/cognitive/check": {
        post: { summary: "Cognitive consistency check", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/cognitive/bayes": {
        post: { summary: "Bayesian reasoning", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/cognitive/rl": {
        post: { summary: "Reinforcement learning step", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/combination/ilp": {
        post: { summary: "ILP combination solver", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/context/kv-optimize": {
        post: { summary: "KV context optimization", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/context/attention-anchor": {
        post: { summary: "Attention anchoring", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/context/error-preserve": {
        post: { summary: "Preserve error context", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/session/start": {
        post: { summary: "Start SP session", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/session/end": {
        post: { summary: "End SP session", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/evidence-level": {
        post: { summary: "Evaluate evidence level", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/validate/gates": {
        post: { summary: "Validate quality gates", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/sp/validate/mathplan": {
        post: { summary: "Validate math plan", tags: ["SP"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/list": {
        get: { summary: "List skills", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/skill/get": {
        post: { summary: "Get skill details", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/search": {
        post: { summary: "Search skills", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/find": {
        post: { summary: "Find skill for task", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/content": {
        post: { summary: "Get skill content", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/stats": {
        get: { summary: "Skill statistics", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/skill/load": {
        post: { summary: "Load skill", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/recommend": {
        post: { summary: "Recommend skills", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/analyze": {
        post: { summary: "Analyze skill usage", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/chain": {
        post: { summary: "Chain skills", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/search-v2": {
        post: { summary: "Search skills v2", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/skill/stats-v2": {
        get: { summary: "Skill statistics v2", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/script/list": {
        get: { summary: "List scripts", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/script/get": {
        post: { summary: "Get script details", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/search": {
        post: { summary: "Search scripts", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/command": {
        post: { summary: "Get script command", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/execute": {
        post: { summary: "Execute script", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/stats": {
        get: { summary: "Script statistics", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/script/execute-v2": {
        post: { summary: "Execute script v2", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/queue": {
        post: { summary: "Queue script execution", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/recommend": {
        post: { summary: "Recommend scripts", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/search-v2": {
        post: { summary: "Search scripts v2", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/script/history": {
        get: { summary: "Script execution history", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/bundle/list": {
        get: { summary: "List bundles", tags: ["SkillScript"], responses: stdResponse() }
      },
      "/skill-script/bundle/get": {
        post: { summary: "Get bundle", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/bundle/for-action": {
        post: { summary: "Bundle for action", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/skill-script/bundle/for-domain": {
        post: { summary: "Bundle for domain", tags: ["SkillScript"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/doc/list": {
        get: { summary: "List documents", tags: ["Doc"], responses: stdResponse() }
      },
      "/doc/read": {
        post: { summary: "Read document", tags: ["Doc"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/doc/write": {
        post: { summary: "Write document", tags: ["Doc"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/doc/append": {
        post: { summary: "Append to document", tags: ["Doc"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/doc/roadmap-status": {
        get: { summary: "Roadmap status", tags: ["Doc"], responses: stdResponse() }
      },
      "/doc/action-tracker": {
        get: { summary: "Action tracker", tags: ["Doc"], responses: stdResponse() }
      },
      "/doc/migrate": {
        post: { summary: "Migrate documents", tags: ["Doc"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/list": {
        get: { summary: "List hooks", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/get": {
        post: { summary: "Get hook details", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/execute": {
        post: { summary: "Execute hook", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/chain": {
        post: { summary: "Chain hooks", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/toggle": {
        post: { summary: "Toggle hook enabled state", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/emit": {
        post: { summary: "Emit event", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/event/list": {
        get: { summary: "List event types", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/event/history": {
        get: { summary: "Event history", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/fire": {
        post: { summary: "Fire hook v2", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/chain-v2": {
        post: { summary: "Chain hooks v2", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/status": {
        get: { summary: "Hook system status", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/history": {
        get: { summary: "Hook execution history", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/enable": {
        post: { summary: "Enable hook", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/disable": {
        post: { summary: "Disable hook", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/coverage": {
        get: { summary: "Hook coverage report", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/gaps": {
        get: { summary: "Hook coverage gaps", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/performance": {
        get: { summary: "Hook performance metrics", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/failures": {
        get: { summary: "Hook failure log", tags: ["Hook"], responses: stdResponse() }
      },
      "/hook/subscribe": {
        post: { summary: "Subscribe to events", tags: ["Hook"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/hook/reactive-chains": {
        get: { summary: "List reactive chains", tags: ["Hook"], responses: stdResponse() }
      },
      "/gsd/core": {
        post: { summary: "GSD core protocol", tags: ["GSD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/gsd/quick": {
        post: { summary: "GSD quick mode", tags: ["GSD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/gsd/get": {
        post: { summary: "Get GSD state", tags: ["GSD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/gsd/dev-protocol": {
        post: { summary: "GSD dev protocol", tags: ["GSD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/gsd/resources": {
        get: { summary: "GSD resources summary", tags: ["GSD"], responses: stdResponse() }
      },
      "/gsd/quick-resume": {
        post: { summary: "Quick resume session", tags: ["GSD"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/task/create": {
        post: { summary: "Create agent task", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/task/status": {
        post: { summary: "Get task status", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/task/result": {
        post: { summary: "Get task result", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/task/cancel": {
        post: { summary: "Cancel task", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/task/list": {
        get: { summary: "List agent tasks", tags: ["Manus"], responses: stdResponse() }
      },
      "/manus/web-research": {
        post: { summary: "Web research task", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/code-sandbox": {
        post: { summary: "Code sandbox execution", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/hook/trigger": {
        post: { summary: "Trigger manus hook", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/hook/list": {
        get: { summary: "List manus hooks", tags: ["Manus"], responses: stdResponse() }
      },
      "/manus/hook/chain": {
        post: { summary: "Chain manus hooks", tags: ["Manus"], requestBody: jsonBody([]), responses: stdResponse() }
      },
      "/manus/hook/stats": {
        get: { summary: "Manus hook statistics", tags: ["Manus"], responses: stdResponse() }
      }
    },
    tags: [
      { name: "SFC", description: "Speed & Feed Calculator" },
      { name: "CAD", description: "CAD geometry operations" },
      { name: "CAM", description: "CAM toolpath operations" },
      { name: "Quality", description: "Quality and SPC" },
      { name: "Schedule", description: "Job scheduling" },
      { name: "Cost", description: "Cost estimation" },
      { name: "Export", description: "Document & report export" },
      { name: "Data", description: "Registry data lookups" },
      { name: "Safety", description: "Safety validation" },
      { name: "Auth", description: "Authentication" },
      { name: "Admin", description: "Administration" },
      { name: "PPG", description: "Post Processor Generator" },
      { name: "Learning", description: "Learning paths & knowledge" },
      { name: "ERP", description: "ERP, quoting & analytics" },
      { name: "Threads", description: "Thread manufacturing calculations" },
      { name: "Compliance", description: "Regulatory compliance management" },
      { name: "Telemetry", description: "System telemetry & monitoring" },
      { name: "Orchestration", description: "Agent, swarm & roadmap orchestration" },
      { name: "Bridge", description: "External system integration & API keys" },
      { name: "Session", description: "Session state, memory & workflow" },
      { name: "Context", description: "Context management, teams & budget" },
      { name: "Validate", description: "Material & formula validation" },
      { name: "Omega", description: "Omega quality scoring" },
      { name: "Ralph", description: "RALPH quality assessment" },
      { name: "Dev", description: "Developer tools & testing" },
      { name: "SP", description: "SPARC Protocol workflow & cognitive" },
      { name: "SkillScript", description: "Skill & script registry" },
      { name: "Doc", description: "Document management" },
      { name: "Hook", description: "Hook execution & event management" },
      { name: "GSD", description: "Getting Stuff Done protocol" },
      { name: "Manus", description: "Agent task management & sandboxing" }
    ]
  };
}

function jsonBody(required: string[]) {
  return {
    required: required.length > 0,
    content: { "application/json": { schema: { type: "object" as const } } }
  };
}

function stdResponse() {
  return {
    "200": { description: "Success", content: { "application/json": { schema: { type: "object" as const } } } },
    "400": { description: "Validation error" },
    "500": { description: "Internal server error" }
  };
}
