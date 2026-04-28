/**
 * MastercamFunctionIndexEngine - Unified query surface over all extracted
 * Mastercam UI / function catalogs.
 *
 * Loads every module catalog under `data/cam-functions/mastercam/` via
 * `function-index.json` and exposes typed lookups used by AI orchestration
 * (dispatcher action mapping, parameter discovery, dependency tracing).
 *
 * This engine is pure: no I/O beyond lazy JSON load on first access, no
 * state mutation, no dispatcher imports.
 *
 * Coverage: U-CAM14..U-CAM19 (PHASE-1 Mastercam extraction, CAM-EXHAUST-MS0).
 *
 * @see data/cam-functions/mastercam/function-index.json
 * @see CAM-EXHAUST-MS0 U-CAM20
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES (mirror the JSON catalog shape)
// ============================================================================

export interface MastercamParameterConstraints {
  min?: number;
  max?: number;
  step?: number;
  enum_values?: readonly string[];
  pattern?: string;
  max_length?: number;
}

export interface MastercamParameterValue {
  type: string;
  unit?: string;
  default_value?: unknown;
  constraints?: MastercamParameterConstraints;
}

export interface MastercamPhysicsLink {
  formula_id: string;
  role: "input" | "output";
  affects?: readonly string[];
}

export interface MastercamTribalTip {
  id: string;
  text: string;
  source: string;
  confidence: number;
}

export interface MastercamAIAction {
  dispatcher: string;
  action: string;
  parameter_mapping?: Record<string, string>;
}

export interface MastercamParameter {
  id: string;
  name: string;
  category?: string;
  value: MastercamParameterValue;
  physics_links?: readonly MastercamPhysicsLink[];
  tribal_tips?: readonly MastercamTribalTip[];
  ai_actions?: readonly MastercamAIAction[];
}

export interface MastercamPage {
  id: string;
  name: string;
  parameters: readonly MastercamParameter[];
}

export interface MastercamToolpath {
  id: string;
  name: string;
  sub_types?: readonly string[];
  params_count?: number;
  pages?: Record<string, { params: readonly MastercamParameter[] }>;
  parameters?: readonly MastercamParameter[];
}

export interface MastercamModuleCatalog {
  schemaVersion?: number;
  schema_version?: string;
  system_id: string;
  module_id?: string;
  module_name?: string;
  module?: {
    total_params: number;
    toolpaths?: readonly MastercamToolpath[];
  };
  toolpaths?: readonly MastercamToolpath[];
  description?: string;
  parameter_count?: number;
}

export interface MastercamIndexEntry {
  module_id: string;
  path: string;
  covered_units: readonly string[];
  parameter_count_estimate?: number;
  description?: string;
  dependencies?: readonly string[];
}

export interface MastercamFunctionIndex {
  schema_version: string;
  system_id: "mastercam";
  module_id: "function_index";
  module_name: string;
  description: string;
  indexed_at: string;
  modules: readonly MastercamIndexEntry[];
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
  tribal_knowledge_integration?: {
    tip_count: number;
    categories: readonly string[];
  };
}

export interface MastercamParameterLocator {
  module_id: string;
  toolpath_id: string;
  page_id?: string;
  parameter: MastercamParameter;
}

export interface MastercamModuleLoadError {
  module_id: string;
  path: string;
  error: string;
}

export interface MastercamIndexQueryResult<T> {
  value: T;
  source: "mastercam_function_index";
  module_count: number;
  warning?: string;
}

export interface MastercamToolpathInfo {
  module_id: string;
  toolpath_id: string;
  toolpath_name: string;
  sub_types?: readonly string[];
  params_count?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOG_ROOT = resolve(__dirname, "..", "..", "data", "cam-functions", "mastercam");
const INDEX_PATH = resolve(CATALOG_ROOT, "function-index.json");

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * MastercamFunctionIndexEngine - static API for querying the Mastercam
 * function/parameter index.
 *
 * Lazy-loads the index and individual module catalogs on first access.
 * Subsequent calls are cached in-process (module-level caches).
 */
export class MastercamFunctionIndexEngine {
  private static indexCache: MastercamFunctionIndex | null = null;
  private static moduleCache = new Map<string, MastercamModuleCatalog>();
  private static loadErrors: MastercamModuleLoadError[] = [];

  /**
   * Return the top-level function index (cached after first read).
   * @returns MastercamFunctionIndex
   */
  static getIndex(): MastercamFunctionIndex {
    if (!this.indexCache) {
      if (!existsSync(INDEX_PATH)) {
        throw new Error(`Mastercam function index not found: ${INDEX_PATH}`);
      }
      this.indexCache = readJson<MastercamFunctionIndex>(INDEX_PATH);
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
   * Get module entry metadata without loading the full catalog.
   * @param moduleId e.g. "2d_toolpaths", "lathe_toolpaths"
   * @returns MastercamIndexEntry or null if not found
   */
  static getModuleEntry(moduleId: string): MastercamIndexEntry | null {
    return this.getIndex().modules.find((m) => m.module_id === moduleId) ?? null;
  }

  /**
   * Load a single module catalog by module_id.
   * Returns null if the module is not in the index or fails to parse.
   * @param moduleId e.g. "2d_toolpaths", "lathe_toolpaths"
   */
  static getModule(moduleId: string): MastercamModuleCatalog | null {
    if (this.moduleCache.has(moduleId)) {
      return this.moduleCache.get(moduleId)!;
    }
    const entry = this.getIndex().modules.find((m) => m.module_id === moduleId);
    if (!entry) return null;

    const absPath = resolve(CATALOG_ROOT, "..", "..", entry.path);
    try {
      if (!existsSync(absPath)) {
        this.loadErrors.push({ module_id: moduleId, path: absPath, error: "File not found" });
        return null;
      }
      const catalog = readJson<MastercamModuleCatalog>(absPath);
      this.moduleCache.set(moduleId, catalog);
      return catalog;
    } catch (err) {
      this.loadErrors.push({
        module_id: moduleId,
        path: absPath,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * List all toolpaths across all modules.
   * @returns Array of toolpath info objects
   */
  static listAllToolpaths(): MastercamToolpathInfo[] {
    const result: MastercamToolpathInfo[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = mod.module?.toolpaths ?? mod.toolpaths ?? [];
      for (const tp of toolpaths) {
        result.push({
          module_id: entry.module_id,
          toolpath_id: tp.id,
          toolpath_name: tp.name,
          sub_types: tp.sub_types,
          params_count: tp.params_count,
        });
      }
    }
    return result;
  }

  /**
   * Find a parameter by its globally-unique id - scans every module's
   * toolpaths/pages in index order and returns the first match.
   * @param parameterId the parameter.id field from the catalog JSON
   */
  static findParameter(parameterId: string): MastercamParameterLocator | null {
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = mod.module?.toolpaths ?? mod.toolpaths ?? [];
      for (const tp of toolpaths) {
        // Check pages structure
        if (tp.pages) {
          for (const [pageId, page] of Object.entries(tp.pages)) {
            const param = page.params?.find((p) => p.id === parameterId);
            if (param) {
              return {
                module_id: entry.module_id,
                toolpath_id: tp.id,
                page_id: pageId,
                parameter: param,
              };
            }
          }
        }
        // Check direct parameters
        if (tp.parameters) {
          const param = tp.parameters.find((p) => p.id === parameterId);
          if (param) {
            return {
              module_id: entry.module_id,
              toolpath_id: tp.id,
              parameter: param,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Search parameters by partial name match (case-insensitive).
   * @param query Search string
   * @param limit Maximum results to return
   * @returns Array of parameter locators
   */
  static searchParameters(query: string, limit = 20): MastercamParameterLocator[] {
    const results: MastercamParameterLocator[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.getIndex().modules) {
      if (results.length >= limit) break;
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = mod.module?.toolpaths ?? mod.toolpaths ?? [];
      for (const tp of toolpaths) {
        if (results.length >= limit) break;

        if (tp.pages) {
          for (const [pageId, page] of Object.entries(tp.pages)) {
            for (const param of page.params ?? []) {
              if (
                param.id.toLowerCase().includes(lowerQuery) ||
                param.name?.toLowerCase().includes(lowerQuery)
              ) {
                results.push({
                  module_id: entry.module_id,
                  toolpath_id: tp.id,
                  page_id: pageId,
                  parameter: param,
                });
                if (results.length >= limit) break;
              }
            }
            if (results.length >= limit) break;
          }
        }

        if (tp.parameters && results.length < limit) {
          for (const param of tp.parameters) {
            if (
              param.id.toLowerCase().includes(lowerQuery) ||
              param.name?.toLowerCase().includes(lowerQuery)
            ) {
              results.push({
                module_id: entry.module_id,
                toolpath_id: tp.id,
                parameter: param,
              });
              if (results.length >= limit) break;
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * Get a single toolpath by id (parity with peer FunctionIndex engines).
   * Scans every module catalog. Returns the toolpath info plus its module,
   * or { error } when not found. Throws on empty/invalid input.
   * @param toolpathId Toolpath identifier (e.g. "dynamic_mill")
   */
  static getToolpath(toolpathId: string):
    | { toolpath_id: string; module_id: string; toolpath: MastercamToolpathInfo }
    | { error: string } {
    if (!toolpathId || typeof toolpathId !== "string") {
      throw new Error("getToolpath: toolpathId must be a non-empty string");
    }
    const all = this.listAllToolpaths();
    const hit = all.find((t) => t.toolpath_id === toolpathId);
    if (!hit) {
      return { error: `Toolpath '${toolpathId}' not found` };
    }
    return {
      toolpath_id: hit.toolpath_id,
      module_id: hit.module_id,
      toolpath: hit,
    };
  }

  /**
   * Get toolpaths by type/category.
   * @param category e.g. "dynamic", "hst", "multiaxis", "lathe", "wire"
   * @returns Array of toolpath info objects
   */
  static getToolpathsByCategory(category: string): MastercamToolpathInfo[] {
    const categoryModuleMap: Record<string, string[]> = {
      dynamic: ["2d_toolpaths"],
      "2d": ["2d_toolpaths", "x8_2d_3d_hst_catalog"],
      "3d": ["3d_hst_toolpaths", "x8_2d_3d_hst_catalog"],
      hst: ["3d_hst_toolpaths", "x8_2d_3d_hst_catalog"],
      multiaxis: ["multiaxis_toolpaths", "x8_advanced_modules_audit"],
      "5axis": ["multiaxis_toolpaths"],
      lathe: ["lathe_toolpaths", "x8_advanced_modules_audit"],
      turning: ["lathe_toolpaths"],
      wire: ["wire_edm", "x8_advanced_modules_audit"],
      edm: ["wire_edm"],
      simulation: ["machine_simulation"],
    };

    const targetModules = categoryModuleMap[category.toLowerCase()] ?? [];
    const results: MastercamToolpathInfo[] = [];

    for (const moduleId of targetModules) {
      const mod = this.getModule(moduleId);
      if (!mod) continue;

      const toolpaths = mod.module?.toolpaths ?? mod.toolpaths ?? [];
      for (const tp of toolpaths) {
        results.push({
          module_id: moduleId,
          toolpath_id: tp.id,
          toolpath_name: tp.name,
          sub_types: tp.sub_types,
          params_count: tp.params_count,
        });
      }
    }
    return results;
  }

  /**
   * Get total parameter count across all modules.
   * @returns Total estimated parameter count
   */
  static getTotalParameterCount(): number {
    return this.getIndex().coverage_summary.estimated_parameter_total;
  }

  /**
   * Get physics formulas linked to Mastercam operations.
   * @returns Array of physics formula IDs
   */
  static getPhysicsFormulas(): readonly string[] {
    return this.getIndex().global_cross_references.physics_formulas;
  }

  /**
   * Get dispatchers that interact with Mastercam functions.
   * @returns Array of dispatcher names
   */
  static getDispatchersTouched(): readonly string[] {
    return this.getIndex().global_cross_references.dispatchers_touched;
  }

  /**
   * Get engines linked to Mastercam functions.
   * @returns Array of engine class names
   */
  static getLinkedEngines(): readonly string[] {
    return this.getIndex().global_cross_references.engines_linked;
  }

  /**
   * Get modules that cover a specific unit.
   * @param unitId e.g. "U-CAM14"
   * @returns Array of module IDs
   */
  static getModulesForUnit(unitId: string): string[] {
    return this.getIndex()
      .modules.filter((m) => m.covered_units.includes(unitId))
      .map((m) => m.module_id);
  }

  /**
   * Get module dependencies (for load ordering).
   * @param moduleId Module to get dependencies for
   * @returns Array of dependency module IDs
   */
  static getModuleDependencies(moduleId: string): readonly string[] {
    const entry = this.getModuleEntry(moduleId);
    return entry?.dependencies ?? [];
  }

  /**
   * Get any errors that occurred during module loading.
   * @returns Array of load error objects
   */
  static getLoadErrors(): readonly MastercamModuleLoadError[] {
    return this.loadErrors;
  }

  /**
   * Clear all caches (for testing or forced reload).
   */
  static clearCache(): void {
    this.indexCache = null;
    this.moduleCache.clear();
    this.loadErrors = [];
  }

  /**
   * Get a summary of the index for diagnostic purposes.
   * @returns Summary object
   */
  static getSummary(): MastercamIndexQueryResult<{
    moduleCount: number;
    totalParams: number;
    unitsTracked: readonly string[];
    physicsFormulas: number;
    linkedEngines: number;
    tribalTipCount: number;
  }> {
    const index = this.getIndex();
    return {
      value: {
        moduleCount: index.modules.length,
        totalParams: index.coverage_summary.estimated_parameter_total,
        unitsTracked: index.coverage_summary.total_units_covered,
        physicsFormulas: index.global_cross_references.physics_formulas.length,
        linkedEngines: index.global_cross_references.engines_linked.length,
        tribalTipCount: index.tribal_knowledge_integration?.tip_count ?? 0,
      },
      source: "mastercam_function_index",
      module_count: index.modules.length,
    };
  }
}

export default MastercamFunctionIndexEngine;
