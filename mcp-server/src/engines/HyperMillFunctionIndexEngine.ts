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
   * @param moduleId e.g. "tool_database", "simulation"
   */
  static getModule(moduleId: string): HyperMillModuleCatalog | null {
    if (this.moduleCache.has(moduleId)) {
      return this.moduleCache.get(moduleId)!;
    }
    const entry = this.getIndex().modules.find((m) => m.module_id === moduleId);
    if (!entry) return null;
    const abs = resolve(CATALOG_ROOT, "..", "..", entry.path);
    try {
      const catalog = readJson<HyperMillModuleCatalog>(abs);
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
}
