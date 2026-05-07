/**
 * HyperCADCADFunctionIndexEngine — CAD-side parity to Fusion360FunctionIndexEngine.
 *
 * Loads the hyperCAD-S (OPEN MIND CAM-oriented CAD) operation catalog under
 * `data/cad-functions/hypercad/` and exposes typed lookups for AI orchestration
 * across all 8 hyperCAD-S workspaces: sketch, solid, surface, healing, mesh,
 * assembly, drawing, and datum / reference geometry.
 *
 * This engine is pure: lazy JSON load + in-process cache, no I/O beyond initial
 * read, no state mutation, no dispatcher imports.
 *
 * Coverage state: COMPLETE — 8 modules / 160 operations / 1001 parameters.
 *   U-CAD-FIDX-HCAD-01 sketch_operations    32 ops / 242 params
 *   U-CAD-FIDX-HCAD-02 solid_operations     30 ops / 214 params
 *   U-CAD-FIDX-HCAD-03 surface_operations   28 ops / 148 params
 *   U-CAD-FIDX-HCAD-04 healing_operations   16 ops /  83 params
 *   U-CAD-FIDX-HCAD-05 mesh_operations      12 ops /  66 params
 *   U-CAD-FIDX-HCAD-06 assembly_operations  15 ops /  74 params
 *   U-CAD-FIDX-HCAD-07 drawing_operations   21 ops / 118 params
 *   U-CAD-FIDX-HCAD-08 datum_operations      6 ops /  56 params
 *
 * @see data/cad-functions/hypercad/function-index.json
 * @see Fusion360FunctionIndexEngine (sister CAD function-index for Fusion 360)
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES
// ============================================================================

export interface CADParameter {
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

export interface CADTab {
  parameters?: readonly CADParameter[];
  params?: readonly CADParameter[];
}

export interface CADOperation {
  description: string;
  category: string;
  fusion_command?: string;
  python_api?: string;
  parameterCount?: number;
  tabs?: Record<string, CADTab>;
}

export interface CADModuleCatalog {
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
  operations?: Record<string, CADOperation>;
  platform_notes?: Record<string, unknown>;
}

export interface CADIndexEntry {
  module_id: string;
  path: string;
  covered_units: readonly string[];
  parameter_count_estimate?: number;
  description?: string;
  dependencies?: readonly string[];
}

export interface CADFutureModule {
  planned_id: string;
  scope: string;
  estimated_params: number;
  deferred_to: string;
}

export interface HyperCADCADFunctionIndex {
  schema_version: string;
  system_id: "hypercad_s";
  module_id: "cad_function_index";
  module_name: string;
  description: string;
  indexed_at: string;
  modules: readonly CADIndexEntry[];
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
  future_modules?: readonly CADFutureModule[];
}

export interface CADParameterLocator {
  module_id: string;
  operation_id: string;
  tab_id?: string;
  parameter: CADParameter;
}

export interface CADModuleLoadError {
  module_id: string;
  path: string;
  error: string;
}

export interface CADOperationInfo {
  module_id: string;
  operation_id: string;
  operation_name: string;
  category: string;
  fusion_command?: string;
  python_api?: string;
  params_count?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// __dirname when running compiled code = mcp-server/dist/src/engines
// when running from source via ts-node = mcp-server/src/engines
// data root sits at mcp-server/data/cad-functions/fusion360 either way (relative to src or dist)
const CATALOG_ROOT = resolve(__dirname, "..", "..", "data", "cad-functions", "hypercad");
const INDEX_PATH = resolve(CATALOG_ROOT, "function-index.json");

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * HyperCADCADFunctionIndexEngine — static API for hyperCAD-S function/parameter lookup.
 *
 * Mirrors the CAM-side Fusion360FunctionIndexEngine API surface:
 *   - getIndex / listModules / getModuleEntry — index navigation
 *   - getModule / listOperations / getOperation — catalog navigation
 *   - findParameter / searchParameters — parameter discovery
 *   - getOperationsByCategory — taxonomy queries
 *   - clearCache — test isolation
 */
export class HyperCADCADFunctionIndexEngine {
  private static indexCache: HyperCADCADFunctionIndex | null = null;
  private static moduleCache = new Map<string, CADModuleCatalog>();
  private static loadErrors: CADModuleLoadError[] = [];

  /**
   * Return the top-level CAD function index (cached after first read).
   * @throws Error if the index file is missing.
   */
  static getIndex(): HyperCADCADFunctionIndex {
    if (!this.indexCache) {
      if (!existsSync(INDEX_PATH)) {
        throw new Error(`hyperCAD-S CAD function index not found: ${INDEX_PATH}`);
      }
      this.indexCache = readJson<HyperCADCADFunctionIndex>(INDEX_PATH);
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
   * @param moduleId Module identifier (e.g. "sketch_operations").
   * @returns Index entry or null if module not registered.
   */
  static getModuleEntry(moduleId: string): CADIndexEntry | null {
    return this.getIndex().modules.find((m) => m.module_id === moduleId) ?? null;
  }

  /**
   * Load a single module catalog by module_id.
   * @returns Module catalog or null if not registered or fails to parse.
   */
  static getModule(moduleId: string): CADModuleCatalog | null {
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
      const catalog = readJson<CADModuleCatalog>(absPath);
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
  private static countOperationParams(op: CADOperation): number {
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
   * Modules that fail to load are silently skipped (errors recorded internally).
   */
  static listAllOperations(): CADOperationInfo[] {
    const result: CADOperationInfo[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod || !mod.operations) continue;

      for (const [opId, op] of Object.entries(mod.operations)) {
        result.push({
          module_id: entry.module_id,
          operation_id: opId,
          operation_name: opId,
          category: op.category,
          fusion_command: op.fusion_command,
          python_api: op.python_api,
          params_count: this.countOperationParams(op),
        });
      }
    }
    return result;
  }

  /**
   * List operations filtered to a single module.
   */
  static listOperations(moduleId: string): CADOperationInfo[] {
    const mod = this.getModule(moduleId);
    if (!mod || !mod.operations) return [];

    return Object.entries(mod.operations).map(([opId, op]) => ({
      module_id: moduleId,
      operation_id: opId,
      operation_name: opId,
      category: op.category,
      fusion_command: op.fusion_command,
      python_api: op.python_api,
      params_count: this.countOperationParams(op),
    }));
  }

  /**
   * Get a single operation definition.
   */
  static getOperation(moduleId: string, operationId: string): CADOperation | null {
    const mod = this.getModule(moduleId);
    if (!mod || !mod.operations) return null;
    return mod.operations[operationId] ?? null;
  }

  /**
   * Find a parameter by name within a specific operation.
   * Returns the first match across all tabs (tab order is implementation-defined).
   */
  static findParameter(
    moduleId: string,
    operationId: string,
    parameterName: string
  ): CADParameterLocator | null {
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
  static searchParameters(query: string, limit = 50): CADParameterLocator[] {
    const target = query.toLowerCase();
    const results: CADParameterLocator[] = [];

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
  static getOperationsByCategory(category: string, moduleId?: string): CADOperationInfo[] {
    const all = moduleId ? this.listOperations(moduleId) : this.listAllOperations();
    return all.filter((op) => op.category === category);
  }

  /**
   * Aggregate count of all parameters across all loaded modules.
   * Loads every module to compute — useful for health/coverage checks.
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
  static getLoadErrors(): readonly CADModuleLoadError[] {
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
