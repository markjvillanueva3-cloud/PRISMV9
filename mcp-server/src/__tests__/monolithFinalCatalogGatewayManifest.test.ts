/**
 * MonolithFinalCatalogGatewayManifestEngine round-trip tests.
 * JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-FINAL-GATEWAY-MANIFEST.
 */

import { describe, it, expect } from "vitest";
import {
  MonolithFinalCatalogGatewayManifestEngine,
  monolithFinalCatalogGatewayManifestEngine,
} from "../engines/MonolithFinalCatalogGatewayManifestEngine.js";

const engine = monolithFinalCatalogGatewayManifestEngine;

describe("MonolithFinalCatalogGatewayManifestEngine — metadata", () => {
  it("version is '1.0.0'", () => {
    expect(engine.version).toBe("1.0.0");
  });

  it("description preserves monolith source verbatim (44-PDF extraction)", () => {
    expect(engine.description).toBe(
      "Gateway routes for PRISM_CATALOG_FINAL (complete 44 PDF extraction)",
    );
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — manufacturer list", () => {
  it("ships exactly 21 manufacturers", () => {
    expect(engine.listManufacturers()).toHaveLength(21);
  });

  it("includes the 4 tool-holder vendors (Guhring, BIG DAISHOWA, REGO-FIX, Haimer)", () => {
    const m = engine.listManufacturers();
    expect(m).toContain("Guhring");
    expect(m).toContain("BIG DAISHOWA");
    expect(m).toContain("REGO-FIX");
    expect(m).toContain("Haimer");
  });

  it("includes Orange Vise (the only workholding vendor in the gateway)", () => {
    expect(engine.listManufacturers()).toContain("Orange Vise");
  });

  it("includes the major cutting-tool vendors", () => {
    const m = engine.listManufacturers();
    expect(m).toContain("OSG");
    expect(m).toContain("ISCAR");
    expect(m).toContain("Sandvik");
    expect(m).toContain("Kennametal");
    expect(m).toContain("SECO/WIDIA");
    expect(m).toContain("Tungaloy");
  });

  it("includes lathe-tooling vendor Global CNC", () => {
    expect(engine.listManufacturers()).toContain("Global CNC");
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — catalog sections", () => {
  it("ships exactly 8 catalog sections", () => {
    expect(engine.listCatalogSections()).toHaveLength(8);
  });

  it("lists the canonical 8 sections (matching source's getStats check)", () => {
    expect(engine.listCatalogSections().sort()).toEqual([
      "cuttingTools", "insertGrades", "isoMaterials", "latheTooling",
      "multiMaster", "spindleInterfaces", "toolHolders", "workholding",
    ]);
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — gateway routes", () => {
  it("ships exactly 18 gateway routes", () => {
    expect(engine.listGatewayRoutes()).toHaveLength(18);
  });

  it("all routes prefix with 'final.' (gateway naming convention)", () => {
    const routes = engine.listGatewayRoutes();
    for (const r of routes) {
      expect(r.route.startsWith("final.")).toBe(true);
    }
  });

  it("all target strings prefix with 'PRISM_FINAL_CATALOG_GATEWAY.' (monolith binding)", () => {
    const routes = engine.listGatewayRoutes();
    for (const r of routes) {
      expect(r.target.startsWith("PRISM_FINAL_CATALOG_GATEWAY.")).toBe(true);
    }
  });

  it("getRoute resolves 'final.holder.get' to getToolHolder target", () => {
    const r = engine.getRoute("final.holder.get");
    expect(r?.target).toBe("PRISM_FINAL_CATALOG_GATEWAY.getToolHolder");
    expect(r?.domain).toBe("tool_holder");
  });

  it("getRoute resolves 'final.vise.byWidth' to getViseByJawWidth target", () => {
    const r = engine.getRoute("final.vise.byWidth");
    expect(r?.target).toBe("PRISM_FINAL_CATALOG_GATEWAY.getViseByJawWidth");
    expect(r?.domain).toBe("workholding");
  });

  it("getRoute resolves 'final.iso.classify' to classifyMaterial / materials_params domain", () => {
    const r = engine.getRoute("final.iso.classify");
    expect(r?.target).toBe("PRISM_FINAL_CATALOG_GATEWAY.classifyMaterial");
    expect(r?.domain).toBe("materials_params");
  });

  it("listGatewayRoutesByDomain('tool_holder') returns 2 routes", () => {
    const hits = engine.listGatewayRoutesByDomain("tool_holder");
    expect(hits).toHaveLength(2);
    expect(hits.map((r) => r.route).sort()).toEqual([
      "final.holder.get", "final.holder.hydraulic",
    ]);
  });

  it("listGatewayRoutesByDomain('cutting_tool') returns 3 routes (get/drill/endmill)", () => {
    const hits = engine.listGatewayRoutesByDomain("cutting_tool");
    expect(hits).toHaveLength(3);
  });

  it("listGatewayRoutesByDomain('lathe_tooling') returns 3 routes (lathe/bmt/vdi)", () => {
    const hits = engine.listGatewayRoutesByDomain("lathe_tooling");
    expect(hits).toHaveLength(3);
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — brand-alias normalization", () => {
  it("'big daishowa' / 'bigdaishowa' / 'BIG DAISHOWA' all → 'bigDaishowa'", () => {
    expect(engine.normalizeManufacturerKey("big daishowa")).toBe("bigDaishowa");
    expect(engine.normalizeManufacturerKey("bigdaishowa")).toBe("bigDaishowa");
    expect(engine.normalizeManufacturerKey("BIG DAISHOWA")).toBe("bigDaishowa");
  });

  it("'rego-fix' / 'regofix' / 'REGO-FIX' all → 'regoFix'", () => {
    expect(engine.normalizeManufacturerKey("rego-fix")).toBe("regoFix");
    expect(engine.normalizeManufacturerKey("regofix")).toBe("regoFix");
    expect(engine.normalizeManufacturerKey("REGO-FIX")).toBe("regoFix");
  });

  it("'ma ford' / 'maford' / 'MA Ford' all → 'maFordTuffCut'", () => {
    expect(engine.normalizeManufacturerKey("ma ford")).toBe("maFordTuffCut");
    expect(engine.normalizeManufacturerKey("maford")).toBe("maFordTuffCut");
    expect(engine.normalizeManufacturerKey("MA Ford")).toBe("maFordTuffCut");
  });

  it("'seco' AND 'widia' both → 'secoWidia' (shared catalog key)", () => {
    expect(engine.normalizeManufacturerKey("seco")).toBe("secoWidia");
    expect(engine.normalizeManufacturerKey("widia")).toBe("secoWidia");
  });

  it("'orange vise' / 'orangevise' both → 'orangeVise'", () => {
    expect(engine.normalizeManufacturerKey("orange vise")).toBe("orangeVise");
    expect(engine.normalizeManufacturerKey("orangevise")).toBe("orangeVise");
  });

  it("'allied' AND 'allied machine' both → 'alliedMachine'", () => {
    expect(engine.normalizeManufacturerKey("allied")).toBe("alliedMachine");
    expect(engine.normalizeManufacturerKey("allied machine")).toBe("alliedMachine");
  });

  it("UPPERCASE-only brand keys (TUNGALOY, CERATIZIT, ACCUPRO, KORLOY) preserved as canonical", () => {
    expect(engine.normalizeManufacturerKey("tungaloy")).toBe("TUNGALOY");
    expect(engine.normalizeManufacturerKey("ceratizit")).toBe("CERATIZIT");
    expect(engine.normalizeManufacturerKey("accupro")).toBe("ACCUPRO");
    expect(engine.normalizeManufacturerKey("korloy")).toBe("KORLOY");
  });

  it("SGS canonical key is uppercase SGS (per source)", () => {
    expect(engine.normalizeManufacturerKey("sgs")).toBe("SGS");
  });

  it("listBrandAliases returns ≥25 spelling variants (the alias set is wider than the manufacturer set)", () => {
    const aliases = engine.listBrandAliases();
    expect(aliases.length).toBeGreaterThanOrEqual(25);
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — fail-soft (R12)", () => {
  it("getRoute unknown route returns null", () => {
    expect(engine.getRoute("UNKNOWN.route.xyz")).toBe(null);
  });

  it("getRoute empty/whitespace returns null", () => {
    expect(engine.getRoute("")).toBe(null);
    expect(engine.getRoute("   ")).toBe(null);
  });

  it("normalizeManufacturerKey unknown name returns null", () => {
    expect(engine.normalizeManufacturerKey("UNKNOWN_VENDOR")).toBe(null);
  });

  it("normalizeManufacturerKey empty/whitespace returns null", () => {
    expect(engine.normalizeManufacturerKey("")).toBe(null);
    expect(engine.normalizeManufacturerKey("   ")).toBe(null);
  });

  it("listGatewayRoutesByDomain unknown domain returns []", () => {
    // Cast through unknown — narrow union type would prevent at compile time;
    // this verifies runtime behavior matches.
    const result = engine.listGatewayRoutesByDomain(
      "UNKNOWN_DOMAIN" as unknown as "tool_holder",
    );
    expect(result).toEqual([]);
  });
});

describe("MonolithFinalCatalogGatewayManifestEngine — stats + immutability", () => {
  it("stats reports 21 manufacturers + 8 sections + 18 routes + version 1.0.0", () => {
    const s = engine.stats();
    expect(s.version).toBe("1.0.0");
    expect(s.manufacturerCount).toBe(21);
    expect(s.catalogSectionCount).toBe(8);
    expect(s.gatewayRouteCount).toBe(18);
    expect(s.brandAliasCount).toBeGreaterThanOrEqual(25);
  });

  it("stats.routesByDomain sums to total route count", () => {
    const s = engine.stats();
    const sum = Object.values(s.routesByDomain).reduce((a, b) => a + b, 0);
    expect(sum).toBe(s.gatewayRouteCount);
  });

  it("fresh instance returns identical data", () => {
    const fresh = new MonolithFinalCatalogGatewayManifestEngine();
    expect(fresh.stats()).toEqual(engine.stats());
    expect(fresh.listManufacturers()).toEqual(engine.listManufacturers());
  });

  it("listGatewayRoutes immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listGatewayRoutes();
    a.pop();
    expect(engine.listGatewayRoutes()).toHaveLength(18);
  });

  it("listManufacturers immutability: mutating returned array doesn't affect store", () => {
    const a = engine.listManufacturers();
    a.pop();
    expect(engine.listManufacturers()).toHaveLength(21);
  });
});
