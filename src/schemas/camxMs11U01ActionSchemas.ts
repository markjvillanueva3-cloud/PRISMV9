/**
 * CAMX-MS11 U01 Action Schemas — Zod v4
 *
 * 6 dispatcher actions (CAMAddInFrameworkEngine E1125):
 *   cam_addin_generate         — Generate complete add-in package for a CAM system
 *   cam_addin_http_client      — Generate HTTP client code for PRISM MCP server connection
 *   cam_addin_ui_panel         — Generate HTML/JS/CSS UI panel template
 *   cam_addin_tool_sync        — Generate tool library sync module
 *   cam_addin_post_integration — Generate post-processor integration code
 *   cam_addin_list_systems     — List supported CAM systems with feature details
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared enums ──────────────────────────────────────────────────────────────

const camSystemZ = z.enum([
  "catia",
  "fusion360",
  "hypermill",
  "mastercam",
  "nx",
  "powermill",
  "solidcam",
]).describe(
  "Target CAM system: mastercam (C#/.NET) | solidcam (VBA) | nx (Python) | "
  + "hypermill (Python) | fusion360 (Python/JS) | powermill (Python) | catia (VBA)",
);

const languageZ = z.enum([
  "csharp",
  "javascript",
  "python",
  "vba",
]).describe(
  "Target programming language. Not all languages are available for every CAM system.",
);

const featureZ = z.enum([
  "http_client",
  "post_integration",
  "tool_sync",
  "ui_panel",
]).describe(
  "Add-in feature module: "
  + "http_client=JSON-RPC HTTP client for PRISM MCP | "
  + "ui_panel=Material+Tool+S/F HTML panel | "
  + "tool_sync=Tool library import/export/drift detection | "
  + "post_integration=G-code per-block S/F optimization via AutoSpeedFeedEngine",
);

// ── cam_addin_generate ────────────────────────────────────────────────────────

const camAddinGenerateSchema = z.object({
  cam_system: camSystemZ,
  language: languageZ.optional().default("python").describe(
    "Primary language for generated code. Defaults to python.",
  ),
  features: z.array(featureZ)
    .min(1)
    .optional()
    .default(["http_client", "ui_panel", "tool_sync", "post_integration"])
    .describe(
      "Feature modules to include. Default: all four modules. "
      + "Features not supported by the target CAM system are skipped.",
    ),
}).describe(
  "Generate a complete multi-file add-in package for the specified CAM system. "
  + "Returns { files: [{path, content, language, description}], install_instructions, notes }.",
);

// ── cam_addin_http_client ─────────────────────────────────────────────────────

const camAddinHttpClientSchema = z.object({
  language: languageZ.describe(
    "Target language for the generated HTTP client code.",
  ),
}).describe(
  "Generate HTTP client code for connecting to the PRISM MCP server at localhost:18361. "
  + "Includes JSON-RPC format, retry logic, health check, and convenience wrappers "
  + "for speed/feed, strategy recommendation, cost estimate, and G-code optimization. "
  + "Returns { language, code, description }.",
);

// ── cam_addin_ui_panel ────────────────────────────────────────────────────────

const camAddinUiPanelSchema = z.object({
  cam_system: camSystemZ.optional().describe(
    "Optional: set CAM_SYSTEM constant in generated JS. Defaults to 'generic'.",
  ),
}).describe(
  "Generate a Material Design-inspired HTML/JS/CSS UI panel template for embedding "
  + "in any CAM system browser or WebView component. Includes: material selector "
  + "(PRISM 2,957 materials), tool selector (95K tools), speed/feed display "
  + "(from SpeedFeedOrchestrator), strategy recommendation display, cost estimate, "
  + "and an Optimize button that calls the PRISM pipeline. "
  + "Returns { html, js, css, description }.",
);

// ── cam_addin_tool_sync ───────────────────────────────────────────────────────

const camAddinToolSyncSchema = z.object({
  cam_system: camSystemZ,
  language: z.enum(["csharp", "python"]).optional().default("python").describe(
    "Language for generated sync module. Supported: python, csharp.",
  ),
}).describe(
  "Generate a tool library synchronization module with three modes: "
  + "import_from_prism (pull tools from PRISM 95K catalog into CAM native library), "
  + "export_to_prism (push CAM tools to PRISM for analysis), and "
  + "detect_drift (compare libraries using SHA-256 fingerprinting and report differences). "
  + "Returns { cam_system, language, code, description }.",
);

// ── cam_addin_post_integration ────────────────────────────────────────────────

const camAddinPostIntegrationSchema = z.object({
  cam_system: camSystemZ,
}).describe(
  "Generate post-processor integration code for sending G-code to PRISM's "
  + "AutoSpeedFeedEngine for per-block S/F optimization, receiving optimized G-code back, "
  + "and applying PRISM tribal knowledge warnings as program comments. "
  + "Also supports batch processing of multiple programs. "
  + "Returns { cam_system, code, description }.",
);

// ── cam_addin_list_systems ────────────────────────────────────────────────────

const camAddinListSystemsSchema = z.object({}).describe(
  "List all supported CAM systems with their primary language, plugin type, "
  + "API references, supported features, and installation notes. "
  + "Returns { systems: [{cam_system, display_name, primary_language, "
  + "alt_languages, plugin_type, api_reference, features_supported, notes}] }.",
);

// ── Export ────────────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS11_U01_SCHEMAS: ActionSchemaMap = {
  cam_addin_generate:         camAddinGenerateSchema,
  cam_addin_http_client:      camAddinHttpClientSchema,
  cam_addin_ui_panel:         camAddinUiPanelSchema,
  cam_addin_tool_sync:        camAddinToolSyncSchema,
  cam_addin_post_integration: camAddinPostIntegrationSchema,
  cam_addin_list_systems:     camAddinListSystemsSchema,
};
