/**
 * Fusion360FunctionIndexEngine - Unified query surface over all extracted
 * Fusion 360 CAM function catalogs.
 *
 * Loads every module catalog under `data/cam-functions/fusion360/` via
 * `function-index.json` and exposes typed lookups used by AI orchestration
 * (dispatcher action mapping, parameter discovery, dependency tracing).
 *
 * This engine is pure: no I/O beyond lazy JSON load on first access, no
 * state mutation, no dispatcher imports.
 *
 * Coverage: U-CAM21..U-CAM24 (PHASE-1 Fusion 360 extraction, CAM-EXHAUST-MS0).
 *
 * @see data/cam-functions/fusion360/function-index.json
 * @see CAM-EXHAUST-MS0 U-CAM25
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// TYPES (mirror the JSON catalog shape)
// ============================================================================

export interface Fusion360ParameterConstraints {
  min?: number;
  max?: number;
  step?: number;
  values?: readonly string[];
  pattern?: string;
  max_length?: number;
}

export interface Fusion360Parameter {
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

export interface Fusion360Tab {
  params: readonly Fusion360Parameter[];
  parameters?: readonly Fusion360Parameter[];
}

export interface Fusion360Toolpath {
  fusion_name?: string;
  name?: string;
  operation_type?: string;
  category?: string;
  description?: string;
  hsm_capable?: boolean;
  manufacturing_extension?: boolean;
  parameterCount?: number;
  tabs?: Record<string, Fusion360Tab>;
}

export interface Fusion360ModuleCatalog {
  schemaVersion?: number | string;
  schema_version?: string;
  system_id?: string;
  section_key?: string;
  section?: Record<string, Fusion360Toolpath>;
  toolpaths?: Record<string, Fusion360Toolpath>;
  metadata?: {
    title?: string;
    description?: string;
    version?: string;
    totalParameters?: number;
    total_items?: number;
    toolpathCount?: number;
  };
  commonTabs?: {
    description?: string;
    tabs?: readonly string[];
  };
  "3d_toolpaths"?: Record<string, Fusion360Toolpath>;
  multiaxis_toolpaths?: Record<string, Fusion360Toolpath>;
  turning_toolpaths?: Record<string, Fusion360Toolpath>;
  probing?: Record<string, Fusion360Toolpath>;
  api_surface?: Record<string, unknown>;
}

export interface Fusion360IndexEntry {
  module_id: string;
  path: string;
  covered_units: readonly string[];
  parameter_count_estimate?: number;
  description?: string;
  dependencies?: readonly string[];
}

export interface Fusion360FunctionIndex {
  schema_version: string;
  system_id: "fusion360";
  module_id: "function_index";
  module_name: string;
  description: string;
  indexed_at: string;
  modules: readonly Fusion360IndexEntry[];
  global_cross_references: {
    physics_formulas: readonly string[];
    dispatchers_touched: readonly string[];
    engines_linked: readonly string[];
  };
  coverage_summary: {
    total_modules: number;
    total_units_covered: readonly string[];
    estimated_parameter_total: number;
    api_surface?: {
      python_api_items?: number;
      post_processor_hooks?: number;
      cloud_api_endpoints?: number;
    };
    pdf_sources_bound: readonly string[];
  };
  tribal_knowledge_integration?: {
    tip_count: number;
    categories: readonly string[];
  };
  platform_integration?: {
    cloud_enabled?: boolean;
    generative_design?: boolean;
    manufacturing_extension?: boolean;
    simulation?: boolean;
    nesting?: boolean;
  };
}

export interface Fusion360ParameterLocator {
  module_id: string;
  toolpath_id: string;
  tab_id?: string;
  parameter: Fusion360Parameter;
}

export interface Fusion360ModuleLoadError {
  module_id: string;
  path: string;
  error: string;
}

export interface Fusion360IndexQueryResult<T> {
  value: T;
  source: "fusion360_function_index";
  module_count: number;
  warning?: string;
}

export interface Fusion360ToolpathInfo {
  module_id: string;
  toolpath_id: string;
  toolpath_name: string;
  operation_type?: string;
  hsm_capable?: boolean;
  manufacturing_extension?: boolean;
  params_count?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOG_ROOT = resolve(__dirname, "..", "..", "data", "cam-functions", "fusion360");
const INDEX_PATH = resolve(CATALOG_ROOT, "function-index.json");

function readJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Fusion360FunctionIndexEngine - static API for querying the Fusion 360
 * CAM function/parameter index.
 *
 * Lazy-loads the index and individual module catalogs on first access.
 * Subsequent calls are cached in-process (module-level caches).
 */
export class Fusion360FunctionIndexEngine {
  private static indexCache: Fusion360FunctionIndex | null = null;
  private static moduleCache = new Map<string, Fusion360ModuleCatalog>();
  private static loadErrors: Fusion360ModuleLoadError[] = [];

  /**
   * Return the top-level function index (cached after first read).
   */
  static getIndex(): Fusion360FunctionIndex {
    if (!this.indexCache) {
      if (!existsSync(INDEX_PATH)) {
        throw new Error(`Fusion 360 function index not found: ${INDEX_PATH}`);
      }
      this.indexCache = readJson<Fusion360FunctionIndex>(INDEX_PATH);
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
  static getModuleEntry(moduleId: string): Fusion360IndexEntry | null {
    return this.getIndex().modules.find((m) => m.module_id === moduleId) ?? null;
  }

  /**
   * Load a single module catalog by module_id.
   * Returns null if the module is not in the index or fails to parse.
   */
  static getModule(moduleId: string): Fusion360ModuleCatalog | null {
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
      const catalog = readJson<Fusion360ModuleCatalog>(absPath);
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
   * Extract toolpaths from a module catalog, handling different schema shapes.
   */
  private static getToolpathsFromModule(
    mod: Fusion360ModuleCatalog
  ): Record<string, Fusion360Toolpath> {
    // Handle section-based format (2d-operations, 3d-operations, etc.)
    if (mod.section) {
      return mod.section;
    }
    // Handle toolpaths direct format
    if (mod.toolpaths) {
      return mod.toolpaths as Record<string, Fusion360Toolpath>;
    }
    // Handle complete catalog format with multiple sections
    const result: Record<string, Fusion360Toolpath> = {};
    if (mod["3d_toolpaths"]) {
      Object.assign(result, mod["3d_toolpaths"]);
    }
    if (mod.multiaxis_toolpaths) {
      Object.assign(result, mod.multiaxis_toolpaths);
    }
    if (mod.turning_toolpaths) {
      Object.assign(result, mod.turning_toolpaths);
    }
    if (mod.probing) {
      Object.assign(result, mod.probing);
    }
    return result;
  }

  /**
   * Count parameters in a toolpath.
   */
  private static countToolpathParams(tp: Fusion360Toolpath): number {
    let count = 0;
    if (tp.tabs) {
      for (const tab of Object.values(tp.tabs)) {
        const params = tab.params ?? tab.parameters ?? [];
        count += params.length;
      }
    }
    return count || tp.parameterCount || 0;
  }

  /**
   * List all toolpaths across all modules.
   */
  static listAllToolpaths(): Fusion360ToolpathInfo[] {
    const result: Fusion360ToolpathInfo[] = [];
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = this.getToolpathsFromModule(mod);
      for (const [id, tp] of Object.entries(toolpaths)) {
        result.push({
          module_id: entry.module_id,
          toolpath_id: id,
          toolpath_name: tp.fusion_name ?? tp.name ?? id,
          operation_type: tp.operation_type ?? tp.category,
          hsm_capable: tp.hsm_capable,
          manufacturing_extension: tp.manufacturing_extension,
          params_count: this.countToolpathParams(tp),
        });
      }
    }
    return result;
  }

  /**
   * Find a parameter by its name - scans every module's toolpaths/tabs.
   */
  static findParameter(parameterName: string): Fusion360ParameterLocator | null {
    const lowerName = parameterName.toLowerCase();
    for (const entry of this.getIndex().modules) {
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = this.getToolpathsFromModule(mod);
      for (const [tpId, tp] of Object.entries(toolpaths)) {
        if (tp.tabs) {
          for (const [tabId, tab] of Object.entries(tp.tabs)) {
            const params = tab.params ?? tab.parameters ?? [];
            const param = params.find((p) => p.name.toLowerCase() === lowerName);
            if (param) {
              return {
                module_id: entry.module_id,
                toolpath_id: tpId,
                tab_id: tabId,
                parameter: param,
              };
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Search parameters by partial name match (case-insensitive).
   */
  static searchParameters(query: string, limit = 20): Fusion360ParameterLocator[] {
    const results: Fusion360ParameterLocator[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.getIndex().modules) {
      if (results.length >= limit) break;
      const mod = this.getModule(entry.module_id);
      if (!mod) continue;

      const toolpaths = this.getToolpathsFromModule(mod);
      for (const [tpId, tp] of Object.entries(toolpaths)) {
        if (results.length >= limit) break;

        if (tp.tabs) {
          for (const [tabId, tab] of Object.entries(tp.tabs)) {
            const params = tab.params ?? tab.parameters ?? [];
            for (const param of params) {
              if (
                param.name.toLowerCase().includes(lowerQuery) ||
                param.description?.toLowerCase().includes(lowerQuery)
              ) {
                results.push({
                  module_id: entry.module_id,
                  toolpath_id: tpId,
                  tab_id: tabId,
                  parameter: param,
                });
                if (results.length >= limit) break;
              }
            }
            if (results.length >= limit) break;
          }
        }
      }
    }
    return results;
  }

  /**
   * Get toolpaths by type/category.
   */
  static getToolpathsByCategory(category: string): Fusion360ToolpathInfo[] {
    const categoryModuleMap: Record<string, string[]> = {
      "2d": ["2d_operations", "2d_toolpath_params"],
      adaptive: ["2d_operations", "3d_operations"],
      "3d": ["3d_operations", "complete_catalog"],
      hsm: ["3d_operations"],
      multiaxis: ["multiaxis_operations", "complete_catalog"],
      "5axis": ["multiaxis_operations"],
      turning: ["turning_operations", "complete_catalog"],
      lathe: ["turning_operations"],
      roughing: ["2d_operations", "3d_operations"],
      finishing: ["3d_operations", "multiaxis_operations"],
    };

    const targetModules = categoryModuleMap[category.toLowerCase()] ?? [];
    const results: Fusion360ToolpathInfo[] = [];
    const seen = new Set<string>();

    for (const moduleId of targetModules) {
      const mod = this.getModule(moduleId);
      if (!mod) continue;

      const toolpaths = this.getToolpathsFromModule(mod);
      for (const [id, tp] of Object.entries(toolpaths)) {
        const key = `${moduleId}:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const opType = (tp.operation_type ?? tp.category ?? "").toLowerCase();
        const catLower = category.toLowerCase();

        // Filter by category match
        if (
          opType.includes(catLower) ||
          id.toLowerCase().includes(catLower) ||
          (tp.fusion_name ?? "").toLowerCase().includes(catLower)
        ) {
          results.push({
            module_id: moduleId,
            toolpath_id: id,
            toolpath_name: tp.fusion_name ?? tp.name ?? id,
            operation_type: tp.operation_type ?? tp.category,
            hsm_capable: tp.hsm_capable,
            manufacturing_extension: tp.manufacturing_extension,
            params_count: this.countToolpathParams(tp),
          });
        }
      }
    }

    // If no category matches, return all from target modules
    if (results.length === 0) {
      for (const moduleId of targetModules) {
        const mod = this.getModule(moduleId);
        if (!mod) continue;

        const toolpaths = this.getToolpathsFromModule(mod);
        for (const [id, tp] of Object.entries(toolpaths)) {
          const key = `${moduleId}:${id}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            module_id: moduleId,
            toolpath_id: id,
            toolpath_name: tp.fusion_name ?? tp.name ?? id,
            operation_type: tp.operation_type ?? tp.category,
            hsm_capable: tp.hsm_capable,
            manufacturing_extension: tp.manufacturing_extension,
            params_count: this.countToolpathParams(tp),
          });
        }
      }
    }

    return results;
  }

  /**
   * Get total parameter count across all modules.
   */
  static getTotalParameterCount(): number {
    return this.getIndex().coverage_summary.estimated_parameter_total;
  }

  /**
   * Get physics formulas linked to Fusion 360 operations.
   */
  static getPhysicsFormulas(): readonly string[] {
    return this.getIndex().global_cross_references.physics_formulas;
  }

  /**
   * Get dispatchers that interact with Fusion 360 functions.
   */
  static getDispatchersTouched(): readonly string[] {
    return this.getIndex().global_cross_references.dispatchers_touched;
  }

  /**
   * Get engines linked to Fusion 360 functions.
   */
  static getLinkedEngines(): readonly string[] {
    return this.getIndex().global_cross_references.engines_linked;
  }

  /**
   * Get modules that cover a specific unit.
   */
  static getModulesForUnit(unitId: string): string[] {
    return this.getIndex()
      .modules.filter((m) => m.covered_units.includes(unitId))
      .map((m) => m.module_id);
  }

  /**
   * Get module dependencies (for load ordering).
   */
  static getModuleDependencies(moduleId: string): readonly string[] {
    const entry = this.getModuleEntry(moduleId);
    return entry?.dependencies ?? [];
  }

  /**
   * Get HSM-capable toolpaths.
   */
  static getHSMToolpaths(): Fusion360ToolpathInfo[] {
    return this.listAllToolpaths().filter((tp) => tp.hsm_capable === true);
  }

  /**
   * Get a single toolpath by id (matches getOperation parity from peer
   * FunctionIndex engines). Scans every module catalog. Returns the
   * toolpath info plus the module it lives in, or `null` when not found.
   */
  static getToolpath(toolpathId: string):
    | { toolpath_id: string; module_id: string; toolpath: Fusion360ToolpathInfo }
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
   * Get Manufacturing Extension toolpaths.
   */
  static getManufacturingExtensionToolpaths(): Fusion360ToolpathInfo[] {
    return this.listAllToolpaths().filter((tp) => tp.manufacturing_extension === true);
  }

  /**
   * Get cutting toolpaths (CAM-EXHAUST-MS1-03).
   * Covers laser, waterjet, and plasma sheet-cutting operations.
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   *   Categories: "Laser" | "Waterjet" | "Plasma"
   */
  static getCuttingOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("cutting.json", "getCuttingOperations");
  }

  /**
   * Get inspection toolpaths (CAM-EXHAUST-MS1-04).
   * Covers CMM planning, tolerance-stack analysis (RSS + Monte Carlo),
   * GD&T validation, surface-form analysis, point-cloud-to-CAD alignment,
   * probe compensation calibration, and inspection reporting.
   *
   * Complements MS1-01 Probing (on-machine probe cycles) by adding the
   * planning, analysis, validation, and reporting layers above raw probe
   * macros. Anchored to ASME Y14.5-2018 / ISO 1101 / QIF 3.0.
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   *   Categories: "Planning" | "Analysis" | "Validation" | "Reporting"
   */
  static getInspectionOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("inspection.json", "getInspectionOperations");
  }

  /**
   * Get additive toolpaths (CAM-EXHAUST-MS1-02).
   * Reads additive.json catalog covering DED, PBF, FDM, and Hybrid
   * (additive+subtractive) operations.
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   *   Categories: "DED" | "PBF" | "FDM" | "Hybrid"
   */
  static getAdditiveOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("additive.json", "getAdditiveOperations");
  }

  /**
   * Get mill-turn toolpaths (CAM-EXHAUST-MS1-05).
   * Reads mill-turn.json catalog covering dual-spindle synchronization,
   * auxiliary actuation (tailstock / steady-rest), C-axis indexed +
   * interpolated milling, and multi-axis turning (Y-axis offcenter,
   * polygon, thread whirling, cross-drilling).
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   *   Categories: "Synchronization" | "Auxiliary" | "C_Axis" | "Multi_Axis"
   */
  static getMillTurnOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("mill-turn.json", "getMillTurnOperations");
  }

  /**
   * Get manufacturing-model / setup primitives (CAM-EXHAUST-MS1-06).
   * Reads setup.json catalog covering workpiece/stock definition (from
   * model, from previous setup, from body, from box, from cylinder),
   * fixture binding (vise, chuck), work coordinate systems (single +
   * multi-WCS schedules), machine kinematics + post binding, multi-setup
   * Op1/Op2 grouping, and setup-sheet documentation.
   *
   * Anchors every downstream toolpath module to a concrete machine +
   * workpiece + datum frame. Required precursor for any closed-loop
   * CAM-to-shop-floor workflow. References ISO 6983-1 (G54-G59), ISO
   * 230-1/2 (kinematics), ASME B5.54 (machine accuracy), and Fanuc
   * G54.1 P1..P48 / Siemens G505..G599 / Mazak SHIFT extended offsets.
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   *   Categories: "Workpiece" | "Fixture" | "Coordinates" | "Kinematics" | "Multi_Setup" | "Documentation"
   */
  static getSetupOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("setup.json", "getSetupOperations");
  }

  /**
   * Get 2D milling per-op tab deep-pass operations (CAM-EXHAUST-MS1-07).
   * Reads milling-2d-deep.json catalog covering Strategy / Ramp / Holder /
   * Output / Connections tab extensions to the 11 existing 2D ops, plus
   * 4 net-new drill-family ops (DRILL_2D with 12 cycle codes, TAP_2D
   * rigid+floating, REAM_2D G85, COUNTERBORE_2D G82). Closes the input-
   * exhaust gap left by the original MS0/U-CAM21 2d-operations.json.
   *
   * Categories: "Roughing" | "Finishing" | "Drilling"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getMilling2DDeepOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("milling-2d-deep.json", "getMilling2DDeepOperations");
  }

  /**
   * Get 3D milling per-op tab deep-pass operations (CAM-EXHAUST-MS1-08).
   * Reads milling-3d-deep.json catalog covering Strategy / Ramp / Holder /
   * Output / Connections tab extensions to the 12 existing 3D ops, plus
   * 2 net-new finishing ops (PROJECT_3D for sketch-curve projection onto
   * curved surfaces, FLAT_3D for auto-detected flat-surface finishing).
   * Closes the input-exhaust gap left by the original MS0/U-CAM22
   * 3d-operations.json — also fills in Heights/Linking tabs for the 8
   * simpler-finishing ops that the parent catalog omitted.
   *
   * Categories: "Roughing" | "Finishing"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getMilling3DDeepOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("milling-3d-deep.json", "getMilling3DDeepOperations");
  }

  /**
   * Get multiaxis per-op tab deep-pass operations (CAM-EXHAUST-MS1-09).
   * Reads multiaxis-deep.json catalog covering the 5 standard deep tabs
   * (Strategy, Ramp, Holder, Output, Connections) for the 7 existing
   * multiaxis ops, plus 2 net-new ops: BLADE_5AX (turbine-blade
   * leading/trailing-edge blend finishing) and MULTI_AXIS_POCKET (5-axis
   * adaptive pocket roughing with tilt-to-avoid). Closes the input-exhaust
   * gap left by the original MS0/U-CAM23 multiaxis-operations.json — also
   * fills in Heights/Linking tabs for the 5 simpler ops that the parent
   * catalog omitted, and adds RTCP (G43.4 Runtime Tool Center Point)
   * output controls to every op for proper 5-axis NC output.
   *
   * Categories: "Roughing" | "Finishing" | "Specialized"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getMultiaxisDeepOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("multiaxis-deep.json", "getMultiaxisDeepOperations");
  }

  /**
   * Get turning per-op tab deep-pass operations (CAM-EXHAUST-MS1-10).
   * Reads turning-deep.json catalog covering the 6 standard deep tabs
   * (Strategy, Cycle for G70/G71/G72/G74/G75/G76 canned cycles, Ramp,
   * Holder, Output, Connections) for the 5 existing turning ops, plus
   * 6 net-new turning ops: TURNING_CUTOFF, TURNING_BORE, TURNING_DRILL,
   * TURNING_TAP, TURNING_SECONDARY_SPINDLE_TRANSFER, TURNING_LIVE_TOOLING.
   * Closes the input-exhaust gap left by the original MS0/U-CAM24
   * turning-operations.json.
   *
   * Categories: "Roughing" | "Finishing" | "Grooving" | "Threading" |
   *             "Cutoff" | "Boring" | "Drilling" | "Synchronization" |
   *             "Live_Tooling"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getTurningDeepOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("turning-deep.json", "getTurningDeepOperations");
  }

  /**
   * Returns Fusion 360 post-processor + NC-output operations from
   * `post-processing.json` (CAM-EXHAUST-MS1-11). Closes the bottom of the
   * Fusion CAM stack — every catalogued toolpath funnels through this surface
   * to produce shop-ready NC code. 10 ops, 218 params total.
   *
   * Categories: "Kernel" | "Format" | "Controller" | "Section" | "Motion" |
   *             "Cycles" | "Modal" | "Validation" | "Delivery"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getPostProcessingOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("post-processing.json", "getPostProcessingOperations");
  }

  /**
   * Returns Fusion 360 cloud-rendering, Manufacturing Extension, Vault PLM,
   * and Generative Design operations from `cloud-and-mfg-ext.json`
   * (CAM-EXHAUST-MS1-12). Closes Phase 1 of the L2-CAMX-EXHAUST roadmap by
   * cataloguing the licensed / cloud-only surface that the desktop catalogues
   * cannot describe alone. 10 ops, 211 params total.
   *
   * Categories: "Cloud" | "Strategy"
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getCloudAndMfgExtOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("cloud-and-mfg-ext.json", "getCloudAndMfgExtOperations");
  }

  /**
   * Shared loader for Fusion-toolpath-schema catalogs (probing.json,
   * additive.json, etc). Returns flattened operation summaries.
   * @internal
   */
  private static loadFusionToolpathCatalog(
    fileName: string,
    callerName: string
  ): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    const path = resolve(CATALOG_ROOT, fileName);
    if (!existsSync(path)) {
      return [];
    }
    try {
      const data = readJson<{
        toolpaths?: Record<
          string,
          {
            description: string;
            category: string;
            parameterCount: number;
          }
        >;
      }>(path);
      const out: Array<{
        toolpath_id: string;
        category: string;
        parameter_count: number;
        description: string;
      }> = [];
      for (const [id, op] of Object.entries(data.toolpaths ?? {})) {
        out.push({
          toolpath_id: id,
          category: op.category,
          parameter_count: op.parameterCount,
          description: op.description,
        });
      }
      return out;
    } catch (err) {
      throw new Error(
        `Fusion360FunctionIndexEngine.${callerName}: failed to load ${fileName} — ${(err as Error).message}`
      );
    }
  }

  /**
   * Get probing toolpaths (CAM-EXHAUST-MS1-01).
   * Reads the probing module catalog directly to enumerate operations
   * since the catalog uses Fusion's `toolpaths.{ID}.tabs.{Tab}.parameters[]`
   * schema rather than Schema A.
   *
   * Returns all 16 probing operations across 4 categories:
   *   - Probe_WCS (8 ops): single_surface, 2_axis_corner, 3_axis_corner,
   *     web, pocket, boss, bore, plane_angle
   *   - Probe_Geometry (2 ops): sphere calibration, hole pattern
   *   - Probe_Tool (3 ops): length, diameter, breakage detection
   *   - Inspect (3 ops): feature_verify, tolerance_gate, spc_log
   *
   * @returns Array of { toolpath_id, category, parameter_count, description }
   */
  static getProbingOperations(): Array<{
    toolpath_id: string;
    category: string;
    parameter_count: number;
    description: string;
  }> {
    return this.loadFusionToolpathCatalog("probing.json", "getProbingOperations");
  }

  /**
   * Get platform integration info.
   */
  static getPlatformIntegration(): Fusion360FunctionIndex["platform_integration"] {
    return this.getIndex().platform_integration;
  }

  /**
   * Get API surface info.
   */
  static getAPISurface(): Fusion360FunctionIndex["coverage_summary"]["api_surface"] {
    return this.getIndex().coverage_summary.api_surface;
  }

  /**
   * Get any errors that occurred during module loading.
   */
  static getLoadErrors(): readonly Fusion360ModuleLoadError[] {
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
   */
  static getSummary(): Fusion360IndexQueryResult<{
    moduleCount: number;
    totalParams: number;
    unitsTracked: readonly string[];
    physicsFormulas: number;
    linkedEngines: number;
    tribalTipCount: number;
    hsmToolpaths: number;
    manufacturingExtToolpaths: number;
  }> {
    const index = this.getIndex();
    const allToolpaths = this.listAllToolpaths();
    return {
      value: {
        moduleCount: index.modules.length,
        totalParams: index.coverage_summary.estimated_parameter_total,
        unitsTracked: index.coverage_summary.total_units_covered,
        physicsFormulas: index.global_cross_references.physics_formulas.length,
        linkedEngines: index.global_cross_references.engines_linked.length,
        tribalTipCount: index.tribal_knowledge_integration?.tip_count ?? 0,
        hsmToolpaths: allToolpaths.filter((t) => t.hsm_capable).length,
        manufacturingExtToolpaths: allToolpaths.filter((t) => t.manufacturing_extension).length,
      },
      source: "fusion360_function_index",
      module_count: index.modules.length,
    };
  }
}

export default Fusion360FunctionIndexEngine;
