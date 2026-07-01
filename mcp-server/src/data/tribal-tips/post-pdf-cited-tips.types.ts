/**
 * Controller-dialect union — single source of truth for the post-pdf-cited-tips
 * file. Mirrors UnifiedControllerType in
 * mcp-server/src/engines/MasterPostProcessorUnifiedAGIEngine.ts (kept in sync
 * by convention — when a profile is added there, append the dialect here).
 *
 * @milestone POST-PDF-NODE-MS0/U-POST-PDF-TRIBAL-TIPS
 * @slot echo
 * @date 2026-05-26
 */
export type ControllerDialect =
  | "fanuc" | "siemens" | "haas" | "okuma" | "mazak"
  | "heidenhain" | "mitsubishi" | "fagor" | "hurco"
  | "dmg_mori" | "brother" | "doosan" | "citizen" | "generic";

/** All 14 controller dialects PRISM currently has a profile for. */
export const ALL_CONTROLLER_DIALECTS: ControllerDialect[] = [
  "fanuc", "siemens", "haas", "okuma", "mazak",
  "heidenhain", "mitsubishi", "fagor", "hurco",
  "dmg_mori", "brother", "doosan", "citizen", "generic",
];
