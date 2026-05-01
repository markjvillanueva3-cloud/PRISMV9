/**
 * HyperMillFunctionIndexEngine — Unified query surface over all extracted
 * hyperMILL UI / function catalogs.
 *
 * Loads every module catalog under `data/cam-functions/hypermill/` via
 * `function-index.json` and exposes typed lookups used by AI orchestration
 * (dispatcher action mapping, parameter discovery, dependency tracing).
 *
 * This engine is pure: no I/O beyond lazy JSON load on first access, no
 * state mutation, no dispatcher imports.
 *
 * Coverage: U-CAM02..U-CAM12 (PHASE-1 hyperMILL extraction, CAM-EXHAUST-MS0).
 *
 * @see data/cam-functions/hypermill/function-index.json
 * @see CAM-EXHAUST-MS0 U-CAM13
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES (mirror the JSON catalog shape — kept minimal)
// ============================================================================

export interface HyperMillParameterValue {
  type: string;
  unit?: string;
  default_value?: unknown;
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    enum_values?: readonly string[];
    pattern?: string;
    max_length?: number;
  };
}

export interface HyperMillPhysicsLink {
  formula_id: string;
  role: "input" | "output";
  affects?: readonly string[];
}

export interface HyperMillTribalTip {
  id: string;
  text: string;
  source: string;
  confidence: number;
}

export interface HyperMillAIAction {
  dispatcher: string;
  action: string;
  parameter_mapping?: Record<string, string>;
}

export interface HyperMillParameter {
  id: string;
  name: string;
  category?: string;
  value: HyperMillParameterValue;
  physics_links?: readonly HyperMillPhysicsLink[];
  tribal_tips?: readonly HyperMillTribalTip[];
  ai_actions?: readonly HyperMillAIAction[];
}

export interface HyperMillDialog {
  id: string;
  name: string;
  type?: string;
  dialog_purpose?: string;
  parameters: readonly HyperMillParameter[];
}

export interface HyperMillMenu {
  id: string;
  name: string;
  operation_class?: string;
  dialogs: readonly HyperMillDialog[];
}

export interface HyperMillModuleCatalog {
  schema_version: string;
  system_id: string;
  module_id: string;
  module_name: string;
  description?: string;
  menus: readonly HyperMillMenu[];
  dispatcher_bindings?: readonly { dispatcher: string; actions: readonly string[] }[];
  cross_references?: {
    engines?: readonly string[];
    registries?: readonly string[];
    physics_constants?: readonly string[];
  };
  parameter_count?: number;
}

export interface HyperMillIndexEntry {
  module_id: string;
  path: string;
  covered_units: readonly string[];
  parameter_count_estimate?: number;
  dependencies?: readonly string[];
}

export interface HyperMillFunctionIndex {
  schema_version: string;
  system_id: "hypermill";
  module_id: "function_index";
  modules: readonly HyperMillIndexEntry[];
  global_cross_references: {
    physics_formulas: readonly string[];
    dispatchers_touched: readonly string[];
    engines_linked: readonly string[];
  };
  coverage_summary: {
    total_modules: number;
    total_units_covered: readonly string[];
    estimated_parameter_total: number;
    pdf_sources_bound: readonly string[];
  };
}

export interface ParameterLocator {
  module_id: string;
  menu_id: string;
  dialog_id: string;
  parameter: HyperMillParameter;
}

export interface ModuleLoadError {
  module_id: string;
  path: string;
  error: string;
}

export interface IndexQueryResult<T> {
  value: T;
  source: "hypermill_function_index";
  module_count: number;
  warning?: string;
}

// ============================================================================
// CAM-EXHAUST-MS3-02 — Raw catalog shapes for normalization adapter.
// hyperMILL catalogs come in three shapes: v1_menus (canonical, 5 modules),
// v1_nested_module (operations[] under module key, 3 modules: 5axis/millturn/maxx),
// v2_categories (drilling_cycles[]+probing_cycles[]+base_shared_parameters,
// 1 module: drilling). The normalizer maps all three to HyperMillModuleCatalog
// so query APIs (findParameter / getParametersByFormula / etc) work uniformly.
// ============================================================================

export type CatalogShape =
  | "v1_menus"
  | "v1_nested_module"
  | "v2_categories"
  | "unknown";

interface RawV1NestedParameter {
  id?: string;
  name?: string;
  type?: string;
  default?: unknown;
  unit?: string;
  range?: readonly [number, number];
}

interface RawV1NestedDialog {
  id: string;
  name?: string;
  parameters: ReadonlyArray<RawV1NestedParameter>;
}

interface RawV1NestedOperation {
  id: string;
  name?: string;
  cfg_file?: string;
  description?: string;
  dialogs?: ReadonlyArray<RawV1NestedDialog>;
  parameters?: ReadonlyArray<RawV1NestedParameter>;
}

interface RawV1NestedCatalog {
  schemaVersion?: number | string;
  schema_version?: string;
  system_id?: string;
  module: {
    module_id: string;
    module_name?: string;
    description?: string;
    total_parameters?: number;
    total_operations?: number;
    operations: ReadonlyArray<RawV1NestedOperation>;
  };
}

interface RawV2Parameter {
  name: string;
  type?: string;
  unit?: string;
  min?: number;
  max?: number;
  default?: unknown;
  values?: readonly string[];
  description?: string;
}

interface RawV2Cycle {
  id: string;
  name?: string;
  category?: string;
  parameters?: { cycleSpecific?: ReadonlyArray<RawV2Parameter> };
  tribal_tips?: ReadonlyArray<HyperMillTribalTip>;
}

interface RawV2Catalog {
  schema_version: string;
  system_id?: string;
  catalog_id?: string;
  catalog_name?: string;
  description?: string;
  total_parameters?: number;
  base_shared_parameters?: {
    categories?: Record<string, ReadonlyArray<RawV2Parameter>>;
  };
  drilling_cycles?: ReadonlyArray<RawV2Cycle>;
  probing_cycles?: ReadonlyArray<RawV2Cycle>;
}

// ============================================================================
// ENGINE
// ============================================================================

const CATALOG_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "cam-functions",
  "hypermill"
);
const INDEX_PATH = resolve(CATALOG_ROOT, "function-index.json");

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * HyperMillFunctionIndexEngine — static API for querying the hyperMILL
 * function/parameter index.
 *
 * Lazy-loads the index and individual module catalogs on first access.
 * Subsequent calls are cached in-process (module-level caches).
 */
export class HyperMillFunctionIndexEngine {
  private static indexCache: HyperMillFunctionIndex | null = null;
  private static moduleCache = new Map<string, HyperMillModuleCatalog>();
  private static loadErrors: ModuleLoadError[] = [];

  /**
   * Return the top-level function index (cached after first read).
   * @returns HyperMillFunctionIndex
   */
  static getIndex(): HyperMillFunctionIndex {
    if (!this.indexCache) {
      this.indexCache = readJson<HyperMillFunctionIndex>(INDEX_PATH);
    }
    return this.indexCache;
  }

  /**
   * List all module IDs declared in the index.
   * @returns string[] of module_id values
   */
  static listModules(): readonly string[] {
    return this.getIndex().modules.map((m) => m.module_id);
  }

  /**
   * Load a single module catalog by module_id.
   * Returns null if the module is not in the index or fails to parse.
   * Normalizes v1_nested_module and v2_categories shapes into the canonical
   * v1_menus structure so downstream query APIs work uniformly across all
   * registered catalogs (CAM-EXHAUST-MS3-02).
   * @param moduleId e.g. "tool_database", "drilling", "5axis", "maxx"
   */
  static getModule(moduleId: string): HyperMillModuleCatalog | null {
    if (this.moduleCache.has(moduleId)) {
      return this.moduleCache.get(moduleId)!;
    }
    const entry = this.getIndex().modules.find((m) => m.module_id === moduleId);
    if (!entry) return null;
    const abs = resolve(CATALOG_ROOT, "..", "..", entry.path);
    try {
      const raw = readJson<unknown>(abs);
      const shape = this.detectCatalogShape(raw);
      let catalog: HyperMillModuleCatalog;
      switch (shape) {
        case "v1_menus":
          catalog = raw as HyperMillModuleCatalog;
          break;
        case "v1_nested_module":
          catalog = this.normalizeV1Nested(raw as RawV1NestedCatalog);
          break;
        case "v2_categories":
          catalog = this.normalizeV2Categories(raw as RawV2Catalog);
          break;
        default:
          catalog = raw as HyperMillModuleCatalog;
          this.loadErrors.push({
            module_id: moduleId,
            path: abs,
            error: "Unknown catalog shape — not v1_menus, v1_nested_module, or v2_categories",
          });
          break;
      }
      this.moduleCache.set(moduleId, catalog);
      return catalog;
    } catch (err) {
      this.loadErrors.push({
        module_id: moduleId,
        path: abs,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Load a single module catalog as raw JSON (no normalization).
   * Use this when you need to inspect the original catalog shape — for
   * example, regression-guarding the on-disk schema.
   * @param moduleId catalog id from function-index.json
   */
  static getModuleRaw(moduleId: string): unknown | null {
    const entry = this.getIndex().modules.find((m) => m.module_id === moduleId);
    if (!entry) return null;
    const abs = resolve(CATALOG_ROOT, "..", "..", entry.path);
    try {
      return readJson<unknown>(abs);
    } catch (err) {
      this.loadErrors.push({
        module_id: moduleId,
        path: abs,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Detect catalog shape — exposed publicly so callers (and tests) can
   * confirm which adapter path a given catalog will use without having to
   * load the file twice.
   * @param raw parsed JSON from a hyperMILL catalog file
   */
  static detectCatalogShape(raw: unknown): CatalogShape {
    if (!raw || typeof raw !== "object") return "unknown";
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.menus)) return "v1_menus";
    const m = r.module as Record<string, unknown> | undefined;
    if (m && Array.isArray(m.operations)) return "v1_nested_module";
    if (r.schema_version === "2.0.0" && r.categories && typeof r.categories === "object") {
      return "v2_categories";
    }
    return "unknown";
  }

  /**
   * Find a parameter by its globally-unique id (e.g. "cutting_speed_vc",
   * "overhang") — scans every module's menus/dialogs in index order and
   * returns the first match.
   * @param parameterId the parameter.id field from the catalog JSON
   */
  static findParameter(parameterId: string): ParameterLocator | null {
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;
      for (const menu of mod.menus ?? []) {
        for (const dialog of menu.dialogs ?? []) {
          const param = dialog.parameters.find((p) => p.id === parameterId);
          if (param) {
            return {
              module_id: entry.module_id,
              menu_id: menu.id,
              dialog_id: dialog.id,
              parameter: param,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Return every parameter linked to a given physics formula id.
   * Example: `getParametersByFormula("KIENZLE_FORCE")` returns all inputs
   * the CAM UI surfaces which feed the Kienzle model.
   * @param formulaId e.g. "KIENZLE_FORCE", "TAYLOR_TOOL_LIFE"
   */
  static getParametersByFormula(formulaId: string): readonly ParameterLocator[] {
    const results: ParameterLocator[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;
      for (const menu of mod.menus ?? []) {
        for (const dialog of menu.dialogs ?? []) {
          for (const param of dialog.parameters) {
            if (param.physics_links?.some((l) => l.formula_id === formulaId)) {
              results.push({
                module_id: entry.module_id,
                menu_id: menu.id,
                dialog_id: dialog.id,
                parameter: param,
              });
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Return every parameter that has an AI action binding to the given
   * dispatcher (e.g. all params handed off to `prism_cam`).
   * @param dispatcherName e.g. "prism_cam", "prism_calc", "prism_safety"
   */
  static getParametersByDispatcher(dispatcherName: string): readonly ParameterLocator[] {
    const results: ParameterLocator[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;
      for (const menu of mod.menus ?? []) {
        for (const dialog of menu.dialogs ?? []) {
          for (const param of dialog.parameters) {
            if (param.ai_actions?.some((a) => a.dispatcher === dispatcherName)) {
              results.push({
                module_id: entry.module_id,
                menu_id: menu.id,
                dialog_id: dialog.id,
                parameter: param,
              });
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Return every tribal-knowledge tip from a named source across the index
   * (e.g. all "jm_die" tips).
   * @param source e.g. "jm_die", "sandvik_handbook", "shop_floor"
   */
  static getTribalTipsBySource(source: string): readonly HyperMillTribalTip[] {
    const tips: HyperMillTribalTip[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;
      for (const menu of mod.menus ?? []) {
        for (const dialog of menu.dialogs ?? []) {
          for (const param of dialog.parameters) {
            for (const tip of param.tribal_tips ?? []) {
              if (tip.source === source) tips.push(tip);
            }
          }
        }
      }
    }
    return tips;
  }

  /**
   * Compute the transitive dependency closure for a module in load order.
   * Returns an array in dependency-first order (topologically sorted).
   * Cycles are broken by first-seen ordering; `warning` is set when a cycle
   * is detected.
   * @param moduleId the module whose closure is requested
   */
  static resolveDependencies(moduleId: string): IndexQueryResult<readonly string[]> {
    const index = this.getIndex();
    const byId = new Map(index.modules.map((m) => [m.module_id, m]));
    const seen = new Set<string>();
    const order: string[] = [];
    let cycleDetected = false;

    const visit = (id: string, path: Set<string>): void => {
      if (seen.has(id)) return;
      if (path.has(id)) {
        cycleDetected = true;
        return;
      }
      const entry = byId.get(id);
      if (!entry) return;
      path.add(id);
      for (const dep of entry.dependencies ?? []) visit(dep, path);
      path.delete(id);
      seen.add(id);
      order.push(id);
    };

    visit(moduleId, new Set());
    return {
      value: order,
      source: "hypermill_function_index",
      module_count: order.length,
      warning: cycleDetected ? "cycle_detected_in_dependency_graph" : undefined,
    };
  }

  /**
   * Aggregate parameter count across all loaded modules.
   * Uses each module's declared `parameter_count` when present, falling
   * back to a live count of dialog parameters.
   */
  static totalParameterCount(): IndexQueryResult<number> {
    let total = 0;
    let loadedModules = 0;
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;
      loadedModules += 1;
      if (typeof mod.parameter_count === "number") {
        total += mod.parameter_count;
      } else {
        for (const menu of mod.menus ?? []) {
          for (const dialog of menu.dialogs ?? []) {
            total += dialog.parameters.length;
          }
        }
      }
    }
    return {
      value: total,
      source: "hypermill_function_index",
      module_count: loadedModules,
    };
  }

  /**
   * Return the collected non-fatal load errors (empty if all modules loaded
   * cleanly). Does not throw — callers can surface diagnostics without
   * interrupting index-wide queries.
   */
  static getLoadErrors(): readonly ModuleLoadError[] {
    return [...this.loadErrors];
  }

  /**
   * Reset the in-process cache. Test-only — useful when fixtures mutate the
   * catalog JSONs between cases.
   */
  static resetCache(): void {
    this.indexCache = null;
    this.moduleCache.clear();
    this.loadErrors = [];
  }

  /**
   * Normalize a v1_nested_module catalog (operations[] under module key) to
   * the canonical menus[] / dialogs[] / parameters[] structure.
   * Used by 5axis-operations.json, turning-operations.json (millturn), and
   * maxx-machining.json.
   * @param raw parsed v1-nested catalog JSON
   */
  private static normalizeV1Nested(raw: RawV1NestedCatalog): HyperMillModuleCatalog {
    const m = raw.module;
    const schemaVersion =
      typeof raw.schemaVersion === "number"
        ? "1.0.0"
        : (raw.schema_version ?? raw.schemaVersion ?? "1.0.0");
    const operations = m.operations ?? [];
    const menus: HyperMillMenu[] = operations.map((op) => ({
      id: op.id,
      name: op.name ?? op.id,
      operation_class: op.cfg_file,
      dialogs: this.buildV1NestedDialogs(op),
    }));
    return {
      schema_version: String(schemaVersion),
      system_id: raw.system_id ?? "hypermill",
      module_id: m.module_id,
      module_name: m.module_name ?? m.module_id,
      description: m.description,
      parameter_count: m.total_parameters,
      menus,
    };
  }

  /**
   * Build dialog list for a v1-nested operation. Handles three sub-shapes:
   *   (a) op.dialogs[]            — canonical (most ops)
   *   (b) op.parameters[]          — flat fallback (e.g. maxx barrel_tool_params,
   *                                  millturn live_tool_face)
   *   (c) neither                  — operation has no parameters at all
   *                                  (e.g. 5axis 5ax_indexed)
   */
  private static buildV1NestedDialogs(op: RawV1NestedOperation): HyperMillDialog[] {
    if (op.dialogs && op.dialogs.length > 0) {
      return op.dialogs.map((d) => ({
        id: d.id,
        name: d.name ?? d.id,
        parameters: (d.parameters ?? []).map((p) => this.wrapV1NestedParameter(p)),
      }));
    }
    if (op.parameters && op.parameters.length > 0) {
      return [
        {
          id: `${op.id}_params`,
          name: op.name ?? "Parameters",
          parameters: op.parameters.map((p) => this.wrapV1NestedParameter(p)),
        },
      ];
    }
    return [];
  }

  /**
   * Wrap a raw v1-nested parameter (id/name/type/default/unit/range) into the
   * canonical HyperMillParameter shape with a value sub-object.
   */
  private static wrapV1NestedParameter(p: RawV1NestedParameter): HyperMillParameter {
    const constraints: NonNullable<HyperMillParameterValue["constraints"]> = {};
    if (p.range && p.range.length === 2) {
      constraints.min = p.range[0];
      constraints.max = p.range[1];
    }
    const hasConstraints = Object.keys(constraints).length > 0;
    return {
      id: p.id ?? p.name ?? "unknown",
      name: p.name ?? p.id ?? "unknown",
      value: {
        type: p.type ?? "string",
        unit: p.unit,
        default_value: p.default,
        constraints: hasConstraints ? constraints : undefined,
      },
    };
  }

  /**
   * Normalize a v2_categories catalog (drilling_cycles[] + probing_cycles[]
   * + base_shared_parameters) to canonical menus[] structure.
   * Strategy: emit one synthetic "_shared" menu carrying base_shared_parameters
   * (avoids duplicating shared params across every cycle's menu), then one
   * menu per drilling cycle and one per probing cycle.
   * Used by drilling-operations.json.
   * @param raw parsed v2.0.0 catalog JSON
   */
  private static normalizeV2Categories(raw: RawV2Catalog): HyperMillModuleCatalog {
    const sharedDialogs = this.extractV2SharedDialogs(raw.base_shared_parameters);
    const menus: HyperMillMenu[] = [];
    if (sharedDialogs.length > 0) {
      menus.push({
        id: "_shared",
        name: "Shared Parameters",
        operation_class: "shared",
        dialogs: sharedDialogs,
      });
    }
    const drillingCycles = raw.drilling_cycles ?? [];
    for (const cycle of drillingCycles) {
      menus.push(this.buildV2CycleMenu(cycle));
    }
    const probingCycles = raw.probing_cycles ?? [];
    for (const cycle of probingCycles) {
      menus.push(this.buildV2CycleMenu(cycle));
    }
    return {
      schema_version: raw.schema_version,
      system_id: raw.system_id ?? "hypermill",
      module_id: raw.catalog_id ?? "unknown",
      module_name: raw.catalog_name ?? raw.catalog_id ?? "unknown",
      description: raw.description,
      parameter_count: raw.total_parameters,
      menus,
    };
  }

  /**
   * Extract base_shared_parameters.categories into one dialog per category
   * (e.g. cuttingData → "cuttingData" dialog with spindle_speed, feed_rate, ...).
   */
  private static extractV2SharedDialogs(
    shared?: RawV2Catalog["base_shared_parameters"],
  ): HyperMillDialog[] {
    if (!shared?.categories) return [];
    return Object.entries(shared.categories).map(([categoryName, params]) => ({
      id: `shared_${categoryName}`,
      name: categoryName,
      parameters: params.map((p) => this.wrapV2Parameter(p)),
    }));
  }

  /**
   * Build a per-cycle menu from a v2 drilling/probing cycle. The cycle's
   * cycleSpecific parameters become the only dialog. tribal_tips at the
   * cycle level are attached to the first parameter (avoids duplication
   * during getTribalTipsBySource queries).
   */
  private static buildV2CycleMenu(cycle: RawV2Cycle): HyperMillMenu {
    const cycleParams = cycle.parameters?.cycleSpecific ?? [];
    const wrappedParams = cycleParams.map((p) => this.wrapV2Parameter(p));
    if (cycle.tribal_tips && cycle.tribal_tips.length > 0 && wrappedParams.length > 0) {
      wrappedParams[0] = { ...wrappedParams[0], tribal_tips: cycle.tribal_tips };
    }
    return {
      id: cycle.id,
      name: cycle.name ?? cycle.id,
      operation_class: cycle.category,
      dialogs: [
        {
          id: `${cycle.id}_cycleSpecific`,
          name: "Cycle-Specific",
          parameters: wrappedParams,
        },
      ],
    };
  }

  /**
   * Wrap a v2 parameter (name/type/unit/min/max/default/values/description)
   * into the canonical HyperMillParameter shape. v2 uses `name` as the unique
   * identifier (no separate `id` field).
   */
  private static wrapV2Parameter(p: RawV2Parameter): HyperMillParameter {
    const constraints: NonNullable<HyperMillParameterValue["constraints"]> = {};
    if (typeof p.min === "number") constraints.min = p.min;
    if (typeof p.max === "number") constraints.max = p.max;
    if (p.values && p.values.length > 0) constraints.enum_values = p.values;
    const hasConstraints = Object.keys(constraints).length > 0;
    return {
      id: p.name,
      name: p.name,
      value: {
        type: p.type ?? "string",
        unit: p.unit,
        default_value: p.default,
        constraints: hasConstraints ? constraints : undefined,
      },
    };
  }
}
