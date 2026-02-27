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
      "/auth/login": {
        post: { summary: "User login", tags: ["Auth"], requestBody: jsonBody(["username", "password"]), responses: stdResponse() }
      },
      "/auth/register": {
        post: { summary: "User registration", tags: ["Auth"], requestBody: jsonBody(["username", "email", "password"]), responses: stdResponse() }
      },
      "/admin/status": {
        get: { summary: "System status", tags: ["Admin"], responses: stdResponse() }
      },
      "/admin/registries": {
        get: { summary: "Registry statistics", tags: ["Admin"], responses: stdResponse() }
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
      }
    },
    tags: [
      { name: "SFC", description: "Speed & Feed Calculator" },
      { name: "CAD", description: "CAD geometry operations" },
      { name: "CAM", description: "CAM toolpath operations" },
      { name: "Quality", description: "Quality and SPC" },
      { name: "Schedule", description: "Job scheduling" },
      { name: "Cost", description: "Cost estimation" },
      { name: "Data", description: "Registry data lookups" },
      { name: "Safety", description: "Safety validation" },
      { name: "Auth", description: "Authentication" },
      { name: "Admin", description: "Administration" },
      { name: "PPG", description: "Post Processor Generator" }
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
