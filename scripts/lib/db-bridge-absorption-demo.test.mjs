/**
 * db-bridge-absorption-demo.test.mjs — concrete-value tests for the 5
 * absorbed DB resolvers + LIVE integration over the iter37 db-node-bridge.
 *
 * Last suite is the load-bearing assertion: actually wire all 5 resolvers
 * into a real createNodeBridge() instance from iter37 and prove
 * end-to-end routeQuery() works through the published bridge contract.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-DB-NODE-ABSORB-N
 * @slot echo · @iter 41 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ABSORPTION_SCHEMA_VERSION,
  FLEET_DEFAULT_KC_BY_ISO_GROUP,
  materialCatalogResolver,
  controllerDialectResolver,
  controllerProfileResolver,
  kienzleLookupResolver,
  coolantCatalogResolver,
  ALL_ABSORBED_RESOLVERS,
  wireAllAbsorbedResolvers,
  absorbedSourceCount,
  listAbsorbedSourceIds,
} from "./db-bridge-absorption-demo.mjs";

import {
  createNodeBridge,
  registerSource,
  routeQuery,
  listRegisteredSources,
  KNOWN_DB_SOURCES,
  validateContract,
} from "./db-node-bridge.mjs";

describe("constants", () => {
  it("ABSORPTION_SCHEMA_VERSION = 1", () => {
    assert.equal(ABSORPTION_SCHEMA_VERSION, 1);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.P = 1800 (carbon/alloy steel)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.P, 1800);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.M = 2100 (austenitic SS)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.M, 2100);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.K = 1100 (cast iron)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.K, 1100);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.N = 700 (non-ferrous)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.N, 700);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.S = 2800 (superalloys)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.S, 2800);
  });
  it("FLEET_DEFAULT_KC_BY_ISO_GROUP.H = 3200 (hardened steel)", () => {
    assert.equal(FLEET_DEFAULT_KC_BY_ISO_GROUP.H, 3200);
  });
});

describe("contract conformance: all 5 resolvers pass validateContract", () => {
  it("materialCatalogResolver", () => {
    assert.equal(validateContract(materialCatalogResolver).ok, true);
  });
  it("controllerDialectResolver", () => {
    assert.equal(validateContract(controllerDialectResolver).ok, true);
  });
  it("controllerProfileResolver", () => {
    assert.equal(validateContract(controllerProfileResolver).ok, true);
  });
  it("kienzleLookupResolver", () => {
    assert.equal(validateContract(kienzleLookupResolver).ok, true);
  });
  it("coolantCatalogResolver", () => {
    assert.equal(validateContract(coolantCatalogResolver).ok, true);
  });
});

describe("materialCatalogResolver", () => {
  it("list → 6 family names", () => {
    const r = materialCatalogResolver.resolve({ kind: "list" });
    assert.equal(r.length, 6);
  });
  it("lookup '4140' → family=steel, isoGroup=P, kc1_1=1800", () => {
    const r = materialCatalogResolver.resolve({ kind: "lookup", materialName: "4140" });
    assert.equal(r[0].family, "steel");
    assert.equal(r[0].isoGroup, "P");
    assert.equal(r[0].kc1_1, 1800);
  });
  it("lookup '6061-T6' → family=aluminum, isoGroup=N, kc1_1=700", () => {
    const r = materialCatalogResolver.resolve({ kind: "lookup", materialName: "6061-T6" });
    assert.equal(r[0].isoGroup, "N");
    assert.equal(r[0].kc1_1, 700);
  });
  it("lookup 'Inconel 718' → isoGroup=S, kc1_1=2800", () => {
    const r = materialCatalogResolver.resolve({ kind: "lookup", materialName: "Inconel 718" });
    assert.equal(r[0].isoGroup, "S");
    assert.equal(r[0].kc1_1, 2800);
  });
  it("lookup 'Unobtanium' → null (unknown material)", () => {
    assert.equal(materialCatalogResolver.resolve({ kind: "lookup", materialName: "Unobtanium" }), null);
  });
  it("describe → has sourceId='material_catalog'", () => {
    assert.equal(materialCatalogResolver.describe().sourceId, "material_catalog");
  });
});

describe("controllerDialectResolver", () => {
  it("list → 3 targets (mastercam/hypermill/inventor_hsm)", () => {
    const r = controllerDialectResolver.resolve({ kind: "list" });
    assert.equal(r.length, 3);
  });
  it("lookup mastercam + flood_on → 'M8'", () => {
    const r = controllerDialectResolver.resolve({ kind: "lookup", target: "mastercam", operation: "flood_on" });
    assert.equal(r[0].token, "M8");
  });
  it("lookup hypermill + heidenhain_drill_cycle → 'CYCL DEF 200'", () => {
    const r = controllerDialectResolver.resolve({ kind: "lookup", target: "hypermill", operation: "heidenhain_drill_cycle" });
    assert.equal(r[0].token, "CYCL DEF 200");
  });
  it("lookup inventor_hsm + probe_pre_position → 'G65 P9810'", () => {
    const r = controllerDialectResolver.resolve({ kind: "lookup", target: "inventor_hsm", operation: "probe_pre_position" });
    assert.equal(r[0].token, "G65 P9810");
  });
  it("search 'flood_on' → 3 hits (all targets share it)", () => {
    const r = controllerDialectResolver.resolve({ kind: "search", operation: "flood_on" });
    assert.equal(r.length, 3);
  });
  it("search 'heidenhain_drill_cycle' → 1 hit (hypermill only)", () => {
    const r = controllerDialectResolver.resolve({ kind: "search", operation: "heidenhain_drill_cycle" });
    assert.equal(r.length, 1);
    assert.equal(r[0].target, "hypermill");
  });
});

describe("controllerProfileResolver", () => {
  it("list → 12 controllers", () => {
    const r = controllerProfileResolver.resolve({ kind: "list" });
    assert.equal(r.length, 12);
  });
  it("lookup 'fanuc_30i' → supported", () => {
    const r = controllerProfileResolver.resolve({ kind: "lookup", controllerId: "fanuc_30i" });
    assert.equal(r[0].supported, true);
  });
  it("lookup 'fake' → null", () => {
    assert.equal(controllerProfileResolver.resolve({ kind: "lookup", controllerId: "fake" }), null);
  });
  it("search prefix='heidenhain_' → 2 hits", () => {
    const r = controllerProfileResolver.resolve({ kind: "search", prefix: "heidenhain_" });
    assert.equal(r.length, 2);
  });
  it("search prefix='fanuc_' → 3 hits (30i/31i/0i)", () => {
    const r = controllerProfileResolver.resolve({ kind: "search", prefix: "fanuc_" });
    assert.equal(r.length, 3);
  });
});

describe("kienzleLookupResolver", () => {
  it("list → 6 ISO groups with kc values", () => {
    const r = kienzleLookupResolver.resolve({ kind: "list" });
    assert.equal(r.length, 6);
  });
  it("lookup 'P' → kc1_1 = 1800", () => {
    const r = kienzleLookupResolver.resolve({ kind: "lookup", isoGroup: "P" });
    assert.equal(r[0].kc1_1, 1800);
  });
  it("lookup 'S' → kc1_1 = 2800", () => {
    const r = kienzleLookupResolver.resolve({ kind: "lookup", isoGroup: "S" });
    assert.equal(r[0].kc1_1, 2800);
  });
  it("lookup 'X' (invalid ISO group) → null", () => {
    assert.equal(kienzleLookupResolver.resolve({ kind: "lookup", isoGroup: "X" }), null);
  });
});

describe("coolantCatalogResolver", () => {
  it("list → 5 canonical modes", () => {
    const r = coolantCatalogResolver.resolve({ kind: "list" });
    assert.equal(r.length, 5);
  });
  it("lookup 'flood' → mcode 'M8'", () => {
    const r = coolantCatalogResolver.resolve({ kind: "lookup", mode: "flood" });
    assert.equal(r[0].mcode, "M8");
  });
  it("lookup 'through_spindle' → mcode 'M88'", () => {
    const r = coolantCatalogResolver.resolve({ kind: "lookup", mode: "through_spindle" });
    assert.equal(r[0].mcode, "M88");
  });
  it("lookup 'fake' → null", () => {
    assert.equal(coolantCatalogResolver.resolve({ kind: "lookup", mode: "fake" }), null);
  });
});

describe("absorbed source helpers", () => {
  it("absorbedSourceCount = 5", () => {
    assert.equal(absorbedSourceCount(), 5);
  });
  it("listAbsorbedSourceIds returns sorted 5", () => {
    assert.deepEqual(listAbsorbedSourceIds(), [
      "controller_dialect",
      "controller_profile",
      "coolant_catalog",
      "kienzle_lookup",
      "material_catalog",
    ]);
  });
  it("every absorbed sourceId is in KNOWN_DB_SOURCES whitelist", () => {
    for (const id of listAbsorbedSourceIds()) {
      assert.equal(KNOWN_DB_SOURCES.includes(id), true);
    }
  });
  it("ALL_ABSORBED_RESOLVERS has 5 entries", () => {
    assert.equal(Object.keys(ALL_ABSORBED_RESOLVERS).length, 5);
  });
});

describe("LIVE: end-to-end through iter37 db-node-bridge", () => {
  it("wireAllAbsorbedResolvers registers all 5 into a fresh bridge", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    assert.notEqual(wired, null);
    assert.equal(listRegisteredSources(wired).length, 5);
  });
  it("LIVE routeQuery(material_catalog, lookup '4140') → returns kc=1800", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const r = routeQuery(wired, { sourceId: "material_catalog", kind: "lookup", materialName: "4140" });
    assert.equal(r.ok, true);
    assert.equal(r.result[0].kc1_1, 1800);
  });
  it("LIVE routeQuery(controller_dialect, lookup mastercam+flood_on) → 'M8'", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const r = routeQuery(wired, { sourceId: "controller_dialect", kind: "lookup", target: "mastercam", operation: "flood_on" });
    assert.equal(r.ok, true);
    assert.equal(r.result[0].token, "M8");
  });
  it("LIVE routeQuery(kienzle_lookup, lookup 'H') → kc=3200", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const r = routeQuery(wired, { sourceId: "kienzle_lookup", kind: "lookup", isoGroup: "H" });
    assert.equal(r.ok, true);
    assert.equal(r.result[0].kc1_1, 3200);
  });
  it("LIVE routeQuery(coolant_catalog, list) → 5 modes returned", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const r = routeQuery(wired, { sourceId: "coolant_catalog", kind: "list" });
    assert.equal(r.ok, true);
    assert.equal(r.result.length, 5);
  });
  it("LIVE routeQuery on UNREGISTERED 'tool_catalog' → ok=false (proves 5 absorbed, 18 still pending)", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const r = routeQuery(wired, { sourceId: "tool_catalog", kind: "lookup" });
    assert.equal(r.ok, false);
    assert.equal(r.error.includes("no resolver registered"), true);
  });
  it("LIVE wireAllAbsorbedResolvers with bad registerSourceFn → null", () => {
    const bridge = createNodeBridge();
    assert.equal(wireAllAbsorbedResolvers(bridge, "not-a-function"), null);
  });
  it("LIVE wireAllAbsorbedResolvers with null bridge → null", () => {
    assert.equal(wireAllAbsorbedResolvers(null, registerSource), null);
  });
  it("LIVE 5 of 23 sources absorbed = 21.7% coverage", () => {
    const bridge = createNodeBridge();
    const wired = wireAllAbsorbedResolvers(bridge, registerSource);
    const coverage = listRegisteredSources(wired).length / KNOWN_DB_SOURCES.length;
    assert.equal(Math.abs(coverage - 5 / 23) < 1e-9, true);
  });
});
