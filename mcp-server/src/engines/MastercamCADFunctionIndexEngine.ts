/**
 * MastercamCADFunctionIndexEngine — CAD-side parity to Fusion / Inventor / hyperCAD CAD function indexes.
 *
 * Loads the Mastercam CAD operation catalog under
 * `data/cad-functions/mastercam/` and exposes typed lookups for AI orchestration:
 * wireframe operations, solid operations, surface operations, drafting,
 * transformation, analysis, modify, and file/layer ops.
 *
 * Mastercam's CAD layer is independent of its CAM-side toolpath catalog under
 * `cam-functions/mastercam/`. CAM has a dedicated chat — this engine covers
 * ONLY the CAD authoring surface (wireframe + solid + surface + drafting +
 * transform + analysis + modify + file/layer).
 *
 * This engine is pure: lazy JSON load + in-process cache, no I/O beyond initial
 * read, no state mutation, no dispatcher imports.
 *
 * Coverage: U-CAD-FIDX-MC-01..08 (Mastercam CAD exhaust track).
 *
 * @see data/cad-functions/mastercam/function-index.json
 * @see Fusion360CADFunctionIndexEngine (sibling pattern)
 * @see InventorCADFunctionIndexEngine (sibling pattern)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES
// ============================================================================

export interface MastercamCADParameter {
  name: string;
  type: string;
  unit?: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  min?: number;
  max?: number;
  values?: readonly string[];
  options?: readonly string[];
}

export interface MastercamCADTab {
  parameters?: readonly MastercamCADParameter[];
  params?: readonly MastercamCADParameter[];
}

export interface MastercamCADOperation {
  description: string;
  category: string;
  mastercam_command?: string;
  mastercam_api?: string;
  parameterCount?: number;
  tabs?: Record<string, MastercamCADTab>;
}

export interface MastercamCADModuleCatalog {
  schemaVersion?: string;
  metadata?: {
    title?: string;
    description?: string;
    version?: string;
    extractedDate?: string;
    milestone?: string;
    source?: string;
    totalParameters?: number;
    operationCount?: number;
    cad_concepts_used?: readonly string[];
  };
  commonTabs?: {
    description?: string;
    tabs?: readonly string[];
  };
  operations?: Record<string, MastercamCADOperation>;
  platform_notes?: Record<string, unknown>;
}

export interface MastercamCADIndexEntry {
  module_id: string;
  path: string;
  covered_units: readonly string[];
  parameter_count_estimate?: number;
  description?: string;
  dependencies?: readonly string[];
}

export interface MastercamCADFutureModule {
  planned_id: string;
  scope: string;
  estimated_params: number;
  deferred_to: string;
}

export interface MastercamCADFunctionIndex {
  schema_version: string;
  system_id: "mastercam";
  module_id: "cad_function_index";
  module_name: string;
  description: string;
  indexed_at: string;
  modules: readonly MastercamCADIndexEntry[];
  global_cross_references: {
    cad_concepts: readonly string[];
    dispatchers_touched: readonly string[];
    engines_linked: readonly string[];
  };
  coverage_summary: {
    total_modules: number;
    total_units_covered: readonly string[];
    estimated_parameter_total: number;
    api_surface?: Record<string, unknown>;
    pdf_sources_bound?: readonly string[];
  };
  tribal_knowledge_integration?: {
    tip_count: number;
    categories: readonly string[];
  };
  platform_integration?: Record<string, boolean>;
  future_modules?: readonly MastercamCADFutureModule[];
}

export interface MastercamCADParameterLocator {
  module_id: string;
  operation_id: string;
  tab_id?: string;
  parameter: MastercamCADParameter;
}

export interface MastercamCADModuleLoadError {
  module_id: string;
  path: string;
  error: string;
}

export interface MastercamCADOperationInfo {
  module_id: string;
  operation_id: string;
  operation_name: string;
  category: string;
  mastercam_command?: string;
  mastercam_api?: string;
  params_count?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// __dirname when running compiled = mcp-server/dist/src/engines
// running from source via ts-node = mcp-server/src/engines
// data root sits at mcp-server/data/cad-functions/mastercam either way (relative to src or dist)
const CATALOG_ROOT = resolve(__dirname, "..", "..", "data", "cad-functions", "mastercam");
const INDEX_PATH = resolve(CATALOG_ROOT, "function-index.json");

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * MastercamCADFunctionIndexEngine — static API for CAD-side Mastercam function/parameter lookup.
 *
 * Mirrors the Fusion / Inventor / hyperCAD CAD engine API surface:
 *   - getIndex / listModules / getModuleEntry — index navigation
 *   - getModule / listOperations / getOperation — catalog navigation
 *   - findParameter / searchParameters — parameter discovery
 *   - getOperationsByCategory — taxonomy queries
 *   - clearCache — test isolation
 */
export class MastercamCADFunctionIndexEngine {
  private static indexCache: MastercamCADFunctionIndex | null = null;
  private static moduleCache = new Map<string, MastercamCADModuleCatalog>();
  private static loadErrors: MastercamCADModuleLoadError[] = [];

  /**
   * Return the top-level CAD function index (cached after first read).
   * @throws Error if the index file is missing.
   */
  static getIndex(): MastercamCADFunctionIndex {
    if (!this.indexCache) {
      if (!existsSync(INDEX_PATH)) {
        throw new Error(`Mastercam CAD function index not found: ${INDEX_PATH}`);
      }
      this.indexCache = readJson<MastercamCADFunctionIndex>(INDEX_PATH);
    }
    return this.indexCache;
  }

  /**
   * List all module IDs declared in the index.
   */
  static listModules(): readonly string[] {
    return this.getIndex().modules.map((m) => m.module_id);
  }

  /**
   * Get module entry metadata without loading the full catalog.
   */
  static getModuleEntry(moduleId: string): MastercamCADIndexEntry | null {
    return this.getIndex().modules.find((m) => m.module_id === moduleId) ?? null;
  }

  /**
   * Load a single module catalog by module_id.
   */
  static getModule(moduleId: string): MastercamCADModuleCatalog | null {
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
      const catalog = readJson<MastercamCADModuleCatalog>(absPath);
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
   * Count parameters for a single operation across all tabs.
   */
  private static countOperationParams(op: MastercamCADOperation): number {
    if (!op.tabs) return op.parameterCount ?? 0;
    let count = 0;
    for (const tab of Object.values(op.tabs)) {
      const params = tab.parameters ?? tab.params ?? [];
      count += params.length;
    }
    return count || op.parameterCount || 0;
  }

  /**
   * List every operation across every loaded module.
   */
  static listAllOperations(): MastercamCADOperationInfo[] {
    const result: MastercamCADOperationInfo[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod || !mod.operations) continue;

      for (const [opId, op] of Object.entries(mod.operations)) {
        result.push({
          module_id: entry.module_id,
          operation_id: opId,
          operation_name: opId,
          category: op.category,
          mastercam_command: op.mastercam_command,
          mastercam_api: op.mastercam_api,
          params_count: this.countOperationParams(op),
        });
      }
    }
    return result;
  }

  /**
   * List operations filtered to a single module.
   */
  static listOperations(moduleId: string): MastercamCADOperationInfo[] {
    const mod = this.getModule(moduleId);
    if (!mod || !mod.operations) return [];

    return Object.entries(mod.operations).map(([opId, op]) => ({
      module_id: moduleId,
      operation_id: opId,
      operation_name: opId,
      category: op.category,
      mastercam_command: op.mastercam_command,
      mastercam_api: op.mastercam_api,
      params_count: this.countOperationParams(op),
    }));
  }

  /**
   * Get a single operation definition.
   */
  static getOperation(moduleId: string, operationId: string): MastercamCADOperation | null {
    const mod = this.getModule(moduleId);
    if (!mod || !mod.operations) return null;
    return mod.operations[operationId] ?? null;
  }

  /**
   * Find a parameter by name within a specific operation.
   * Case-insensitive exact match across all tabs.
   */
  static findParameter(
    moduleId: string,
    operationId: string,
    parameterName: string,
  ): MastercamCADParameterLocator | null {
    const op = this.getOperation(moduleId, operationId);
    if (!op || !op.tabs) return null;

    const target = parameterName.toLowerCase();
    for (const [tabId, tab] of Object.entries(op.tabs)) {
      const params = tab.parameters ?? tab.params ?? [];
      const found = params.find((p) => p.name.toLowerCase() === target);
      if (found) {
        return { module_id: moduleId, operation_id: operationId, tab_id: tabId, parameter: found };
      }
    }
    return null;
  }

  /**
   * Search every operation across every module for parameters whose name
   * matches the substring (case-insensitive). Returns at most `limit` matches.
   */
  static searchParameters(query: string, limit = 50): MastercamCADParameterLocator[] {
    const target = query.toLowerCase();
    const results: MastercamCADParameterLocator[] = [];

    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod || !mod.operations) continue;

      for (const [opId, op] of Object.entries(mod.operations)) {
        if (!op.tabs) continue;
        for (const [tabId, tab] of Object.entries(op.tabs)) {
          const params = tab.parameters ?? tab.params ?? [];
          for (const p of params) {
            if (p.name.toLowerCase().includes(target)) {
              results.push({
                module_id: entry.module_id,
                operation_id: opId,
                tab_id: tabId,
                parameter: p,
              });
              if (results.length >= limit) return results;
            }
          }
        }
      }
    }
    return results;
  }

  /**
   * List operations in a category, optionally filtered to a single module.
   */
  static getOperationsByCategory(
    category: string,
    moduleId?: string,
  ): MastercamCADOperationInfo[] {
    const all = moduleId ? this.listOperations(moduleId) : this.listAllOperations();
    return all.filter((op) => op.category === category);
  }

  /**
   * Aggregate count of all parameters across all loaded modules.
   */
  static getTotalParameterCount(): number {
    let total = 0;
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod || !mod.operations) continue;
      for (const op of Object.values(mod.operations)) {
        total += this.countOperationParams(op);
      }
    }
    return total;
  }

  /**
   * Snapshot of any module load failures since last clearCache.
   */
  static getLoadErrors(): readonly MastercamCADModuleLoadError[] {
    return this.loadErrors.slice();
  }

  /**
   * Clear all caches and load-error log. Used by tests for isolation.
   */
  static clearCache(): void {
    this.indexCache = null;
    this.moduleCache.clear();
    this.loadErrors = [];
  }
}
