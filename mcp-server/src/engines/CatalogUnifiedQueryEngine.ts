/**
 * CatalogUnifiedQueryEngine — U-DB-BRIDGE-03 + U-DB-BRIDGE-03-EXT.
 *
 * Cross-catalog unified query: given a material (by name or id), return the
 * material record + top compatible tools + coatings + machines + tool holders
 * + workholding fixtures in ONE call. Replaces the 6-dispatcher round trip a
 * quoting flow used to need (material_get → tool_list → coating_list →
 * machine_list → holder_search → workholding_search → manual join).
 *
 * Designed for quoting/frontend intake: a quote estimator can call this once
 * to seed material + tooling + machine + holder + fixture candidates instead
 * of orchestrating 6 separate dispatcher actions.
 *
 * Wraps registryManager (singleton catalogs: MaterialRegistry · ToolRegistry
 * · MachineRegistry · CoatingRegistry · DatabaseRegistry-for-workholding) +
 * the standalone ToolHolderDatabaseEngine (TC-Holder catalog).
 *
 * @milestone
 *   - U-DB-BRIDGE-03 (slot juliett, 2026-05-25, b783f986ab) — initial 4-catalog bridge
 *   - U-DB-BRIDGE-03-EXT (slot juliett, 2026-05-26) — +tool holders +workholding
 *     per /goal "continue all database expansion, bridging for machines,
 *     tooling, tool holders, work holding and material"
 */

import { registryManager } from "../registries/manager.js";
import { toolHolderDatabaseEngine } from "./ToolHolderDatabaseEngine.js";
import { monolithWorkholdingDatabaseEngine } from "./MonolithWorkholdingDatabaseEngine.js";
import { monolithFixtureDatabaseEngine } from "./MonolithFixtureDatabaseEngine.js";
import { monolithToolTypesDatabaseEngine } from "./MonolithToolTypesDatabaseEngine.js";
import { monolithSurfaceFinishDatabaseEngine } from "./MonolithSurfaceFinishDatabaseEngine.js";
import { monolithHyperMillFixtureDatabaseEngine } from "./MonolithHyperMillFixtureDatabaseEngine.js";

/** Maximum default candidates returned per catalog. Operators can override. */
export const DEFAULT_MAX_PER_CATALOG = 5;
/** Hard ceiling on max_per_catalog — prevents pathological full-catalog returns. */
export const MAX_PER_CATALOG_CEILING = 50;

export interface CatalogUnifiedQueryInput {
  /** Material name or id — passed to MaterialRegistry.getByIdOrName(). */
  material: string;
  /** Optional operation type filter for tools (e.g. "mill", "turn", "drill"). */
  op_type?: string;
  /** Optional ISO group override (P/M/K/N/S/H/X). If absent, derived from material. */
  iso_group?: string;
  /** Max items returned per catalog. Default DEFAULT_MAX_PER_CATALOG, capped at MAX_PER_CATALOG_CEILING. */
  max_per_catalog?: number;
  /** Optional machine type filter — forwarded to toolHolderDatabaseEngine.recommend() (U-DB-BRIDGE-03-EXT). */
  machine_type?: string;
  /** Optional spindle RPM — forwarded to toolHolderDatabaseEngine.recommend() balance-class filter. */
  rpm?: number;
}

export interface CatalogUnifiedQueryResult {
  ok: boolean;
  material: any | null;
  iso_group: string | null;
  tools_top: any[];
  coatings_top: any[];
  machines_top: any[];
  /** U-DB-BRIDGE-03-EXT — top tool holders for the (material, op_type, machine_type) combo. */
  tool_holders_top: any[];
  /** U-DB-BRIDGE-03-EXT — top workholding/fixture records from the database catalog. */
  workholding_top: any[];
  /** U-DB-BRIDGE-MONOLITH-WIRE — fixture categories/stiffness/friction/safety from the monolith fixture DB. */
  fixtures_top: any[];
  /** U-DB-BRIDGE-MONOLITH-WIRE — tool-type taxonomy records from the monolith tool-types DB (helps disambiguate generic 'tools' queries). */
  tool_types_top: any[];
  /** U-DB-BRIDGE-MONOLITH-WIRE-V2 — surface-finish records (ISO symbols, N-grades, application guides) from the monolith surface-finish DB. */
  surface_finishes_top: any[];
  /** U-DB-MONOLITH-HYPERMILL-FIXTURE-LOADER — hyperMILL-bound vise/chuck/clamp catalog (6 vises + 7 chucks + 3 clamp families + auto-select). */
  hypermill_fixtures_top: any[];
  stats: {
    queried_material: string;
    op_type: string | null;
    max_per_catalog: number;
    tools_returned: number;
    coatings_returned: number;
    machines_returned: number;
    tool_holders_returned: number;
    workholding_returned: number;
    fixtures_returned: number;
    tool_types_returned: number;
    surface_finishes_returned: number;
    hypermill_fixtures_returned: number;
    miss_reasons: string[];
  };
  warning?: string;
}

/**
 * Cross-catalog unified query engine — the U-DB-BRIDGE-03 surface.
 * Stateless wrapper over registryManager.
 */
export class CatalogUnifiedQueryEngine {
  /**
   * One-call cross-catalog match. Returns ok:false with warning on bad input;
   * never throws.
   */
  async query(input: CatalogUnifiedQueryInput): Promise<CatalogUnifiedQueryResult> {
    const max = Math.min(
      Math.max(1, input.max_per_catalog ?? DEFAULT_MAX_PER_CATALOG),
      MAX_PER_CATALOG_CEILING,
    );
    const queried = String(input.material ?? "").trim();
    if (!queried) {
      return {
        ok: false,
        material: null, iso_group: null,
        tools_top: [], coatings_top: [], machines_top: [],
        tool_holders_top: [], workholding_top: [],
        fixtures_top: [], tool_types_top: [], surface_finishes_top: [],
        hypermill_fixtures_top: [],
        stats: {
          queried_material: "",
          op_type: input.op_type ?? null,
          max_per_catalog: max,
          tools_returned: 0, coatings_returned: 0, machines_returned: 0,
          tool_holders_returned: 0, workholding_returned: 0,
          fixtures_returned: 0, tool_types_returned: 0,
          surface_finishes_returned: 0,
          hypermill_fixtures_returned: 0,
          miss_reasons: ["empty_material_query"],
        },
        warning: "material query is empty",
      };
    }

    // Ensure catalog registries are loaded (idempotent via ensureLoaded).
    await registryManager.initialize();

    const missReasons: string[] = [];

    // 1) Material — primary anchor.
    let material: any = null;
    try {
      material = await registryManager.materials.getByIdOrName(queried);
    } catch { /* fall through */ }
    if (!material) {
      missReasons.push("material_not_found");
    }

    const isoGroup = (input.iso_group ?? material?.iso_group ?? material?.iso ?? null) as string | null;

    // 2) Tools — list() then filter; BaseRegistry.search() schema varies, so
    // we use list() + lightweight predicate. Bounded by `max` upper limit.
    let tools: any[] = [];
    try {
      const allTools = await registryManager.tools.list();
      tools = (allTools || []).filter((t: any) => {
        if (input.op_type && t && typeof t.op_type === "string") {
          if (t.op_type.toLowerCase() !== input.op_type.toLowerCase()) return false;
        }
        // Material-class filter: if tool declares material_compat[] and we
        // know ISO group, include only matching entries.
        if (isoGroup && t && Array.isArray(t.material_compat)) {
          return t.material_compat.includes(isoGroup);
        }
        return true;
      }).slice(0, max);
    } catch {
      missReasons.push("tools_list_failed");
    }

    // 3) Coatings — list() then take first N (no material filter — most
    // coatings are general-purpose; advanced filter is future work).
    let coatings: any[] = [];
    try {
      const all = await registryManager.coatings.list();
      coatings = (all || []).slice(0, max);
    } catch {
      missReasons.push("coatings_list_failed");
    }

    // 4) Machines — list() then take first N. Future work: filter by
    // envelope size + spindle power needed for this material.
    let machines: any[] = [];
    try {
      const all = await registryManager.machines.list();
      machines = (all || []).slice(0, max);
    } catch {
      missReasons.push("machines_list_failed");
    }

    // 5) Tool holders (U-DB-BRIDGE-03-EXT) — prefer .recommend() when we
    // have machine_type/op_type/rpm context, else fall back to search().
    // The recommend() surface filters by balance-class + application;
    // search() is a free-text fallback over holder name + type fields.
    let holders: any[] = [];
    try {
      const hasContext =
        input.machine_type !== undefined ||
        input.op_type !== undefined ||
        input.rpm !== undefined;
      if (hasContext) {
        holders = toolHolderDatabaseEngine.recommend({
          machine_type: input.machine_type,
          rpm: input.rpm,
          application: input.op_type,
        }).slice(0, max);
      } else {
        // No context — fall back to free-text search anchored on the
        // material name. Returns broadly-applicable holders; quoting layer
        // can filter further.
        holders = toolHolderDatabaseEngine.search(queried, max);
      }
    } catch {
      missReasons.push("tool_holders_failed");
    }
    if (holders.length === 0 && !missReasons.includes("tool_holders_failed")) {
      missReasons.push("tool_holders_empty");
    }

    // 6) Workholding / fixtures (U-DB-BRIDGE-03-EXT, MONOLITH-LOADER-extended).
    // PRIMARY source: MonolithWorkholdingDatabaseEngine — TS-typed port of
    // PRISM_WORKHOLDING_DATABASE.js carrying 13 fixture types + 5 specific
    // products from the v8.89 monolith extraction (
    //   extracted/workholding/PRISM_WORKHOLDING_DATABASE.js).
    // FALLBACK: registryManager.databases.search — the old path that powered
    // the U-DB-BRIDGE-03-EXT initial wiring. Kept so the channel keeps
    // returning data even if the monolith loader is somehow disabled.
    let workholding: any[] = [];
    try {
      // Search by op_type if specified (e.g. "lathe" → chucks),
      // else by material name as a weak anchor.
      const whQuery = input.op_type ?? queried;
      const monoHits = monolithWorkholdingDatabaseEngine.search(whQuery, max);
      workholding = monoHits.slice(0, max);
    } catch {
      missReasons.push("workholding_monolith_failed");
    }

    // If the monolith loader returned nothing, try the legacy registry path
    // as a fallback. This preserves backward-compat with the original
    // U-DB-BRIDGE-03-EXT behavior.
    if (workholding.length === 0) {
      try {
        const dbs = (registryManager as { databases?: { search?: (q: string, n: number) => unknown[] } }).databases;
        if (dbs && typeof dbs.search === "function") {
          const whQuery = input.op_type ?? queried;
          const raw = dbs.search(whQuery, max);
          workholding = Array.isArray(raw) ? raw.slice(0, max) : [];
        } else {
          missReasons.push("workholding_registry_absent");
        }
      } catch {
        missReasons.push("workholding_search_failed");
      }
    }

    if (workholding.length === 0
        && !missReasons.includes("workholding_search_failed")
        && !missReasons.includes("workholding_registry_absent")
        && !missReasons.includes("workholding_monolith_failed")) {
      missReasons.push("workholding_empty");
    }

    // 7) Fixtures (MONOLITH-WIRE) — MonolithFixtureDatabaseEngine carries
    // 7 categories + 16 stiffness defaults + 10 friction coefficients +
    // 6 safety factors. Anchored on op_type when present (e.g. 'roughing'
    // surfaces the roughing safety factor + relevant fixture categories).
    let fixtures: any[] = [];
    try {
      const fxQuery = input.op_type ?? queried;
      fixtures = monolithFixtureDatabaseEngine.search(fxQuery, max);
    } catch {
      missReasons.push("fixtures_failed");
    }
    if (fixtures.length === 0 && !missReasons.includes("fixtures_failed")) {
      missReasons.push("fixtures_empty");
    }

    // 8) Tool types (MONOLITH-WIRE) — MonolithToolTypesDatabaseEngine
    // carries 55 type definitions across 11 categories. Helps disambiguate
    // a generic 'tools_top' result by adding the type taxonomy. Anchored
    // on op_type (e.g. 'drill' → drill family) or material name fallback.
    let toolTypes: any[] = [];
    try {
      const ttQuery = input.op_type ?? queried;
      toolTypes = monolithToolTypesDatabaseEngine.search(ttQuery, max);
    } catch {
      missReasons.push("tool_types_failed");
    }
    if (toolTypes.length === 0 && !missReasons.includes("tool_types_failed")) {
      missReasons.push("tool_types_empty");
    }

    // 9) Surface finishes (MONOLITH-WIRE-V2) — MonolithSurfaceFinishDatabase
    // carries 5 ISO symbols + 12 N-grades + 6 application guides. Anchored
    // on op_type when present (e.g. 'finishing' → N5/N6 grades), else
    // material name fallback.
    let surfaceFinishes: any[] = [];
    try {
      const sfQuery = input.op_type ?? queried;
      surfaceFinishes = monolithSurfaceFinishDatabaseEngine.search(sfQuery, max);
    } catch {
      missReasons.push("surface_finishes_failed");
    }
    if (surfaceFinishes.length === 0 && !missReasons.includes("surface_finishes_failed")) {
      missReasons.push("surface_finishes_empty");
    }

    // 10) HyperMILL fixtures (U-DB-MONOLITH-HYPERMILL-FIXTURE-LOADER) —
    // MonolithHyperMillFixtureDatabaseEngine carries OPEN MIND / hyperMILL's
    // 6 vises + 7 chucks + 3 clamp families. When op_type/material yield no
    // text hits AND we have dim/machine context, the engine's autoSelect()
    // would be a better surface — but this channel intentionally stays in
    // the search() lane to keep the bridge contract uniform (text-query in,
    // hit list out). Callers needing dim-based autoSelect should invoke the
    // engine directly via prism_data.
    let hypermillFixtures: any[] = [];
    try {
      const hmQuery = input.op_type ?? input.machine_type ?? queried;
      hypermillFixtures = monolithHyperMillFixtureDatabaseEngine.search(hmQuery, max);
    } catch {
      missReasons.push("hypermill_fixtures_failed");
    }
    if (hypermillFixtures.length === 0 && !missReasons.includes("hypermill_fixtures_failed")) {
      missReasons.push("hypermill_fixtures_empty");
    }

    return {
      ok: material !== null,
      material,
      iso_group: isoGroup,
      tools_top: tools,
      coatings_top: coatings,
      machines_top: machines,
      tool_holders_top: holders,
      workholding_top: workholding,
      fixtures_top: fixtures,
      tool_types_top: toolTypes,
      surface_finishes_top: surfaceFinishes,
      hypermill_fixtures_top: hypermillFixtures,
      stats: {
        queried_material: queried,
        op_type: input.op_type ?? null,
        max_per_catalog: max,
        tools_returned: tools.length,
        coatings_returned: coatings.length,
        machines_returned: machines.length,
        tool_holders_returned: holders.length,
        workholding_returned: workholding.length,
        fixtures_returned: fixtures.length,
        tool_types_returned: toolTypes.length,
        surface_finishes_returned: surfaceFinishes.length,
        hypermill_fixtures_returned: hypermillFixtures.length,
        miss_reasons: missReasons,
      },
    };
  }
}

/** Singleton — share across dispatcher invocations. */
export const catalogUnifiedQueryEngine = new CatalogUnifiedQueryEngine();
