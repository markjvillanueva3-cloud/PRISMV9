/**
 * db-bridge-absorption-demo.mjs — concrete resolver implementations that
 * absorb 5 of the 23 KNOWN_DB_SOURCES through the iter37 db-node-bridge.
 *
 * Demonstrates U-DB-NODE-ABSORB-N (partial shipment of U-DB-NODE-ABSORB-21).
 * Each resolver here is a real, pure-data DB source backed by the
 * catalogs already in scripts/lib/ from iter29-39. The bigger absorption
 * unit (21-of-23) needs MCP-engine catalog access — this iter proves the
 * bridge contract works end-to-end with concrete sources first.
 *
 * Resolvers shipped:
 *   - material_catalog      — Kienzle defaults + family classifier
 *   - controller_dialect    — 3 add-in dialect maps (Mastercam/hyperMILL/Inventor)
 *   - controller_profile    — 12 supported controllers from post-gen bridge
 *   - kienzle_lookup        — fleet-default kc1.1 per ISO group
 *   - coolant_catalog       — predictive coolant 5-mode catalog
 *
 * Each conforms to the iter37 contract: { resolve(query), describe() }.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-DB-NODE-ABSORB-N
 * @slot echo · @iter 41 · @date 2026-05-27
 */

import { ISO_MATERIAL_GROUPS } from "./sfc-node-bridge.mjs";
import {
  MATERIAL_FAMILIES,
  CANONICAL_MODES,
  MODE_MCODES,
  classifyMaterial,
} from "./v11-predictive-coolant-orch.mjs";
import { MASTERCAM_DIALECT_MAP } from "./mastercam-addin-resource-manifest.mjs";
import { HYPERMILL_DIALECT_MAP } from "./hypermill-addin-resource-manifest.mjs";
import { INVENTOR_DIALECT_MAP } from "./inventor-addin-resource-manifest.mjs";
import { SUPPORTED_CONTROLLERS } from "./post-gen-node-bridge.mjs";

export const ABSORPTION_SCHEMA_VERSION = 1;

// Fleet-default Kienzle kc1.1 per ISO group (canonical per CLAUDE.md §SAFETY).
// These are the reference priors the per-shop Bayesian posterior (iter29)
// updates against.
export const FLEET_DEFAULT_KC_BY_ISO_GROUP = {
  P: 1800, // ferrous (carbon/alloy steel)
  M: 2100, // austenitic stainless
  K: 1100, // cast iron
  N: 700,  // non-ferrous (Al, Cu, brass)
  S: 2800, // superalloys (Ti, Inconel)
  H: 3200, // hardened steel (≥45 HRC)
};

// Reverse map for material_catalog resolver
function familyToIsoGroup(family) {
  switch (family) {
    case "steel": return "P";
    case "stainless": return "M";
    case "cast_iron": return "K";
    case "aluminum": return "N";
    case "titanium":
    case "inconel": return "S";
    default: return null;
  }
}

/** material_catalog resolver: list / lookup material families + ISO mapping + kc prior. */
export const materialCatalogResolver = {
  describe: () => ({
    sourceId: "material_catalog",
    name: "Material Family Catalog (pure-data)",
    version: "1.0",
    schemaVersion: ABSORPTION_SCHEMA_VERSION,
  }),
  resolve: (query) => {
    if (!query || typeof query !== "object") return null;
    if (query.kind === "list") {
      return Object.keys(MATERIAL_FAMILIES);
    }
    if (query.kind === "lookup") {
      const family = classifyMaterial(query.materialName);
      if (family === "unknown") return null;
      const isoGroup = familyToIsoGroup(family);
      return [{
        materialName: query.materialName,
        family,
        isoGroup,
        kc1_1: isoGroup ? FLEET_DEFAULT_KC_BY_ISO_GROUP[isoGroup] : null,
      }];
    }
    if (query.kind === "describe") {
      return materialCatalogResolver.describe();
    }
    return null;
  },
};

/** controller_dialect resolver: 3 add-in dialect maps unified. */
export const controllerDialectResolver = {
  describe: () => ({
    sourceId: "controller_dialect",
    name: "CAM Add-in Dialect Maps (Mastercam/hyperMILL/Inventor)",
    version: "1.0",
    schemaVersion: ABSORPTION_SCHEMA_VERSION,
  }),
  resolve: (query) => {
    if (!query || typeof query !== "object") return null;
    const allMaps = {
      mastercam: MASTERCAM_DIALECT_MAP,
      hypermill: HYPERMILL_DIALECT_MAP,
      inventor_hsm: INVENTOR_DIALECT_MAP,
    };
    if (query.kind === "list") {
      return Object.keys(allMaps);
    }
    if (query.kind === "lookup") {
      const target = query.target;
      const op = query.operation;
      if (!target || !allMaps[target]) return null;
      const token = allMaps[target][op];
      return token != null ? [{ target, operation: op, token }] : null;
    }
    if (query.kind === "search") {
      const op = query.operation;
      const found = [];
      for (const t of Object.keys(allMaps)) {
        if (allMaps[t][op] !== undefined) {
          found.push({ target: t, operation: op, token: allMaps[t][op] });
        }
      }
      return found;
    }
    if (query.kind === "describe") {
      return controllerDialectResolver.describe();
    }
    return null;
  },
};

/** controller_profile resolver: 12-controller whitelist from post-gen bridge. */
export const controllerProfileResolver = {
  describe: () => ({
    sourceId: "controller_profile",
    name: "Supported Controller Profiles (12 entries)",
    version: "1.0",
    schemaVersion: ABSORPTION_SCHEMA_VERSION,
  }),
  resolve: (query) => {
    if (!query || typeof query !== "object") return null;
    if (query.kind === "list") {
      return SUPPORTED_CONTROLLERS.slice();
    }
    if (query.kind === "lookup") {
      const c = query.controllerId;
      return SUPPORTED_CONTROLLERS.includes(c) ? [{ controllerId: c, supported: true }] : null;
    }
    if (query.kind === "search") {
      const prefix = String(query.prefix || "").toLowerCase();
      return SUPPORTED_CONTROLLERS.filter((c) => c.toLowerCase().startsWith(prefix)).map((c) => ({ controllerId: c }));
    }
    if (query.kind === "describe") {
      return controllerProfileResolver.describe();
    }
    return null;
  },
};

/** kienzle_lookup resolver: fleet-default kc1.1 per ISO group. */
export const kienzleLookupResolver = {
  describe: () => ({
    sourceId: "kienzle_lookup",
    name: "Fleet-default kc1.1 by ISO Group (P/M/K/N/S/H)",
    version: "1.0",
    schemaVersion: ABSORPTION_SCHEMA_VERSION,
  }),
  resolve: (query) => {
    if (!query || typeof query !== "object") return null;
    if (query.kind === "list") {
      return ISO_MATERIAL_GROUPS.map((g) => ({ isoGroup: g, kc1_1: FLEET_DEFAULT_KC_BY_ISO_GROUP[g] }));
    }
    if (query.kind === "lookup") {
      const g = query.isoGroup;
      const kc = FLEET_DEFAULT_KC_BY_ISO_GROUP[g];
      return kc != null ? [{ isoGroup: g, kc1_1: kc }] : null;
    }
    if (query.kind === "describe") {
      return kienzleLookupResolver.describe();
    }
    return null;
  },
};

/** coolant_catalog resolver: 5 canonical coolant modes + M-codes. */
export const coolantCatalogResolver = {
  describe: () => ({
    sourceId: "coolant_catalog",
    name: "Canonical Coolant Modes (5) + M-codes",
    version: "1.0",
    schemaVersion: ABSORPTION_SCHEMA_VERSION,
  }),
  resolve: (query) => {
    if (!query || typeof query !== "object") return null;
    if (query.kind === "list") {
      return CANONICAL_MODES.map((m) => ({ mode: m, mcode: MODE_MCODES[m] }));
    }
    if (query.kind === "lookup") {
      const m = query.mode;
      const mc = MODE_MCODES[m];
      return mc != null ? [{ mode: m, mcode: mc }] : null;
    }
    if (query.kind === "describe") {
      return coolantCatalogResolver.describe();
    }
    return null;
  },
};

/** All 5 resolver bundles exposed for bridge wire-up. */
export const ALL_ABSORBED_RESOLVERS = {
  material_catalog: materialCatalogResolver,
  controller_dialect: controllerDialectResolver,
  controller_profile: controllerProfileResolver,
  kienzle_lookup: kienzleLookupResolver,
  coolant_catalog: coolantCatalogResolver,
};

/** Pure: wire all 5 resolvers into a fresh bridge. Returns wired bridge. */
export function wireAllAbsorbedResolvers(bridge, registerSourceFn) {
  if (!bridge || typeof registerSourceFn !== "function") return null;
  let next = bridge;
  for (const sourceId of Object.keys(ALL_ABSORBED_RESOLVERS)) {
    const candidate = registerSourceFn(next, sourceId, ALL_ABSORBED_RESOLVERS[sourceId]);
    if (candidate === null) return null;
    next = candidate;
  }
  return next;
}

/** Pure: count how many of KNOWN_DB_SOURCES (23) are now absorbed (5). */
export function absorbedSourceCount() {
  return Object.keys(ALL_ABSORBED_RESOLVERS).length;
}

/** Pure: list the absorbed sourceIds. */
export function listAbsorbedSourceIds() {
  return Object.keys(ALL_ABSORBED_RESOLVERS).sort();
}
