/**
 * MonolithFinalCatalogGatewayManifestEngine — U-DB-MONOLITH-FINAL-GATEWAY-MANIFEST
 *
 * MANIFEST port of `PRISM_FINAL_CATALOG_GATEWAY.js` v1.0.0 from the v8.89
 * monolith extraction (`extracted/catalogs/`). The source file is a 416-line
 * *gateway* — pure routing methods that proxy calls to `PRISM_CATALOG_FINAL`
 * (a separate 57K monolith catalog). Without the catalog the methods are
 * no-ops, so the *valuable manifest data* in this file is:
 *
 *   - The 21-manufacturer canonical list (the brands the monolith intended
 *     to support across the 44-PDF extraction corpus)
 *   - The 8 catalog sections (toolHolders/workholding/cuttingTools/
 *     spindleInterfaces/insertGrades/latheTooling/multiMaster/isoMaterials)
 *   - The 17 gateway routes (URL pattern → method target)
 *   - The brand-alias normalization map ("big daishowa" / "bigdaishowa" /
 *     "BIG DAISHOWA" all → bigDaishowa)
 *
 * Engine surfaces:
 *   - listManufacturers() / listCatalogSections() / listGatewayRoutes()
 *   - normalizeManufacturerKey(input) — does the alias-fold (helpful for
 *     "manufacturer.toLowerCase() variant exists?" lookups elsewhere)
 *   - getRoute(routeName) — returns the registered method target
 *   - stats()
 *
 * Note: This engine does NOT proxy to a real catalog (PRISM_CATALOG_FINAL
 * is a separate 57K file that requires its own port + .json conversion).
 * It's pure manifest reference data.
 *
 * @milestone JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FINAL-GATEWAY-MANIFEST
 *   (slot juliett, 2026-05-26)
 * @source extracted/catalogs/PRISM_FINAL_CATALOG_GATEWAY.js v1.0.0
 */

export interface GatewayRoute {
  /** Dot-separated URL pattern, e.g. "final.holder.get". */
  route: string;
  /** Fully-qualified method target string. */
  target: string;
  /** Domain bucket the route belongs to. */
  domain: "tool_holder" | "workholding" | "cutting_tool" | "lathe_tooling"
        | "insert_grade" | "spindle_interface" | "multi_master"
        | "materials_params" | "stats";
}

const VERSION = "1.0.0";
const DESCRIPTION = "Gateway routes for PRISM_CATALOG_FINAL (complete 44 PDF extraction)";

const MANUFACTURERS: readonly string[] = [
  // Tool-holder vendors (the gateway routes to these in getToolHolder)
  "Guhring", "BIG DAISHOWA", "REGO-FIX", "Haimer",
  // Workholding (Orange Vise is the only one in the gateway)
  "Orange Vise",
  // Cutting tool vendors (routes in getCuttingTool)
  "OSG", "ISCAR", "Sandvik", "EMUGE", "Kennametal", "SECO/WIDIA",
  "SGS", "MA Ford", "Ingersoll", "Allied Machine", "Tungaloy",
  "Ceratizit", "Accupro", "Korloy", "Zeni",
  // Lathe-tooling vendor
  "Global CNC",
] as const;

const CATALOG_SECTIONS: readonly string[] = [
  "toolHolders",
  "workholding",
  "cuttingTools",
  "spindleInterfaces",
  "insertGrades",
  "latheTooling",
  "multiMaster",
  "isoMaterials",
] as const;

const GATEWAY_ROUTES: readonly GatewayRoute[] = [
  // Tool holders
  { route: "final.holder.get",         target: "PRISM_FINAL_CATALOG_GATEWAY.getToolHolder",      domain: "tool_holder" },
  { route: "final.holder.hydraulic",   target: "PRISM_FINAL_CATALOG_GATEWAY.getHydraulicChuck",  domain: "tool_holder" },
  // Workholding
  { route: "final.vise.get",           target: "PRISM_FINAL_CATALOG_GATEWAY.getVise",            domain: "workholding" },
  { route: "final.vise.byWidth",       target: "PRISM_FINAL_CATALOG_GATEWAY.getViseByJawWidth",  domain: "workholding" },
  // Cutting tools
  { route: "final.cutting.get",        target: "PRISM_FINAL_CATALOG_GATEWAY.getCuttingTool",     domain: "cutting_tool" },
  { route: "final.drill.get",          target: "PRISM_FINAL_CATALOG_GATEWAY.getDrillData",       domain: "cutting_tool" },
  { route: "final.endmill.get",        target: "PRISM_FINAL_CATALOG_GATEWAY.getEndMillData",     domain: "cutting_tool" },
  // Lathe tooling
  { route: "final.lathe.get",          target: "PRISM_FINAL_CATALOG_GATEWAY.getLatheTooling",    domain: "lathe_tooling" },
  { route: "final.bmt.get",            target: "PRISM_FINAL_CATALOG_GATEWAY.getBMTHolder",       domain: "lathe_tooling" },
  { route: "final.vdi.get",            target: "PRISM_FINAL_CATALOG_GATEWAY.getVDIHolder",       domain: "lathe_tooling" },
  // Insert grades
  { route: "final.grade.get",          target: "PRISM_FINAL_CATALOG_GATEWAY.getInsertGrade",     domain: "insert_grade" },
  { route: "final.grade.equivalent",   target: "PRISM_FINAL_CATALOG_GATEWAY.getEquivalentGrade", domain: "insert_grade" },
  // Spindle interfaces
  { route: "final.spindle.get",        target: "PRISM_FINAL_CATALOG_GATEWAY.getSpindleInterface", domain: "spindle_interface" },
  { route: "final.collision.envelope", target: "PRISM_FINAL_CATALOG_GATEWAY.getCollisionEnvelope", domain: "spindle_interface" },
  // Multi-master
  { route: "final.multimaster.get",    target: "PRISM_FINAL_CATALOG_GATEWAY.getMultiMasterHead", domain: "multi_master" },
  // Materials & params
  { route: "final.iso.classify",       target: "PRISM_FINAL_CATALOG_GATEWAY.classifyMaterial",   domain: "materials_params" },
  { route: "final.params.get",         target: "PRISM_FINAL_CATALOG_GATEWAY.getCuttingParams",   domain: "materials_params" },
  // Stats
  { route: "final.stats",              target: "PRISM_FINAL_CATALOG_GATEWAY.getStats",           domain: "stats" },
];

/**
 * Brand-alias normalization. Source's getToolHolder/getCuttingTool methods
 * lowercase the input then check several spellings — this maps every
 * accepted spelling to the canonical lookup key used in PRISM_CATALOG_FINAL.
 */
const BRAND_ALIASES: Record<string, string> = {
  // Tool holders
  "guhring":      "guhring",
  "big daishowa": "bigDaishowa",
  "bigdaishowa":  "bigDaishowa",
  "rego-fix":     "regoFix",
  "regofix":      "regoFix",
  "haimer":       "haimer",
  // Workholding
  "orange vise":  "orangeVise",
  "orangevise":   "orangeVise",
  // Cutting tools
  "osg":          "osg",
  "iscar":        "iscar",
  "sandvik":      "sandvik",
  "emuge":        "emuge",
  "kennametal":   "kennametal",
  "seco":         "secoWidia",
  "widia":        "secoWidia",
  "sgs":          "SGS",
  "ma ford":      "maFordTuffCut",
  "maford":       "maFordTuffCut",
  "ingersoll":    "ingersollFaceMills",
  "allied":       "alliedMachine",
  "allied machine": "alliedMachine",
  "tungaloy":     "TUNGALOY",
  "ceratizit":    "CERATIZIT",
  "accupro":      "ACCUPRO",
  "korloy":       "KORLOY",
  "zeni":         "zeni",
};

export class MonolithFinalCatalogGatewayManifestEngine {
  get version(): string { return VERSION; }
  get description(): string { return DESCRIPTION; }

  /** The 21 manufacturer canonical names (display form). */
  listManufacturers(): string[] {
    return [...MANUFACTURERS];
  }

  /** The 8 catalog section names. */
  listCatalogSections(): string[] {
    return [...CATALOG_SECTIONS];
  }

  /** All 18 gateway routes (deep-cloned). */
  listGatewayRoutes(): GatewayRoute[] {
    return GATEWAY_ROUTES.map((r) => ({ ...r }));
  }

  /** Routes filtered to a single domain. */
  listGatewayRoutesByDomain(domain: GatewayRoute["domain"]): GatewayRoute[] {
    return GATEWAY_ROUTES.filter((r) => r.domain === domain).map((r) => ({ ...r }));
  }

  /**
   * Resolve a route name to its method target. Returns null on unknown route.
   * Never throws.
   */
  getRoute(routeName: string): GatewayRoute | null {
    if (typeof routeName !== "string" || routeName.trim() === "") return null;
    const r = GATEWAY_ROUTES.find((x) => x.route === routeName);
    return r ? { ...r } : null;
  }

  /**
   * Normalize a user-typed manufacturer name (any case + alias) to the
   * canonical key used in PRISM_CATALOG_FINAL lookups. Returns null on
   * unknown input.
   */
  normalizeManufacturerKey(input: string): string | null {
    if (typeof input !== "string" || input.trim() === "") return null;
    const key = input.trim().toLowerCase();
    return BRAND_ALIASES[key] ?? null;
  }

  /** All brand-alias spellings the gateway accepts (lowercase keys). */
  listBrandAliases(): string[] {
    return Object.keys(BRAND_ALIASES).sort();
  }

  stats(): {
    version: string;
    manufacturerCount: number;
    catalogSectionCount: number;
    gatewayRouteCount: number;
    brandAliasCount: number;
    routesByDomain: Record<string, number>;
  } {
    const byDomain: Record<string, number> = {};
    for (const r of GATEWAY_ROUTES) {
      byDomain[r.domain] = (byDomain[r.domain] ?? 0) + 1;
    }
    return {
      version: VERSION,
      manufacturerCount: MANUFACTURERS.length,
      catalogSectionCount: CATALOG_SECTIONS.length,
      gatewayRouteCount: GATEWAY_ROUTES.length,
      brandAliasCount: Object.keys(BRAND_ALIASES).length,
      routesByDomain: byDomain,
    };
  }
}

export const monolithFinalCatalogGatewayManifestEngine =
  new MonolithFinalCatalogGatewayManifestEngine();
