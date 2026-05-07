/**
 * CADSystemRouterEngine — unified router across all 6 CAD plan↔execution bridges.
 *
 * The 6 PRISM CAD systems each have their own catalog + execution emitter:
 *   - fusion360   → Fusion360CADFunctionIndexEngine + AutodeskFusionMCPProxyEngine.renderPythonScript
 *   - inventor    → InventorCADFunctionIndexEngine + InventorCADExecutionBridge (iLogic VB.NET)
 *   - mastercam   → MastercamCADFunctionIndexEngine + MastercamCADExecutionBridge (C# NET-Hook)
 *   - hypercad    → HyperCADCADFunctionIndexEngine + HyperCADCADExecutionBridge (HyperCAD-S macro)
 *   - solidworks  → SolidWorksCADFunctionIndexEngine + SolidWorksCADExecutionBridge (VBA)
 *   - esprit      → EspritFunctionIndexEngine + EspritCADExecutionBridge (KBM macro)
 *
 * This router is the synergy layer the upstream AI orchestrator
 * (MillingAGI / CrossDisciplinaryDeepLearningEngine / PRISMSelfAwarenessEngine)
 * calls when it has a CAD operation it wants to execute but doesn't care
 * which CAD system the source artifact came from. The caller passes either
 * an explicit `system` hint or a `filePath` — the router detects the system
 * from the extension when no hint is given, then dispatches to the right
 * bridge.
 *
 * Esprit shape note: Esprit's function index keys operations by id only
 * (auto-detecting section across milling/turning/mill_turn/swiss) rather
 * than by (module, op). The router accepts moduleId for the unified
 * planAndRender signature and forwards it as Esprit's sectionHint when it
 * matches a known section name; otherwise the moduleId is ignored and
 * Esprit's auto-detect is used.
 *
 * Five static entry points:
 *   1. detectSystem({sourceSystem?, filePath?}) — string + extension routing
 *   2. listSupportedSystems() — taxonomy + extension map snapshot
 *   3. planAndRender({system, moduleId, operationId, params}) — unified
 *      plan + render call; returns the appropriate script artifact for the
 *      detected system (python_script / ilogic_snippet / csharp_scaffold /
 *      macro_scaffold / vba_macro)
 *   4. findOperationAcrossSystems(operationId) — searches every catalog for
 *      an operation matching the given id; returns matches with system +
 *      module breakdown (used by AI consumers asking "where can I do X")
 *   5. listCapabilitiesAcrossSystems() — capability matrix: per-system
 *      module count + total operation count + total parameter count
 *
 * Pure dry-run by design — the Fusion path renders a Python script via
 * `renderPythonScript()` (the same function AutodeskFusionMCPProxyEngine
 * uses internally) but does NOT ship it through fusion_mcp_execute.
 * Operator-in-the-loop is preserved across all 5 systems.
 *
 * @engine CADSystemRouterEngine
 * @milestone CAD-FIDX-ORCH-01
 * @see SolidWorksCADExecutionBridge / InventorCADExecutionBridge /
 *      MastercamCADExecutionBridge / HyperCADCADExecutionBridge — sibling bridges
 * @see AutodeskFusionMCPProxyEngine.renderPythonScript — Fusion render path
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const SUPPORTED_CAD_SYSTEMS = [
  "fusion360",
  "inventor",
  "mastercam",
  "hypercad",
  "solidworks",
  "esprit",
] as const;

export type CADSystemId = (typeof SUPPORTED_CAD_SYSTEMS)[number];

/**
 * File extension → CAD system id map.
 * Used by detectSystem when no explicit `sourceSystem` hint is provided.
 *
 * Sources verified against vendor documentation:
 *   - Fusion 360:   .f3d (part), .f3z (export bundle)
 *   - Inventor:     .ipt (part), .iam (assembly), .idw (drawing), .ipn (presentation)
 *   - Mastercam:    .mcam (project), .mcam-content (content reference)
 *   - HyperCAD-S:   .hcsm (model), .hcss (sketch)
 *   - SolidWorks:   .sldprt (part), .sldasm (assembly), .slddrw (drawing),
 *                   .sldlfp (library part), .sldblk (block)
 *   - ESPRIT:       .esprit (current), .esp (legacy DP Technology), .escx
 *                   (TNG project)
 */
export const CAD_FILE_EXTENSION_MAP: Readonly<Record<string, CADSystemId>> = Object.freeze({
  // Fusion 360
  f3d: "fusion360",
  f3z: "fusion360",
  // Inventor
  ipt: "inventor",
  iam: "inventor",
  idw: "inventor",
  ipn: "inventor",
  // Mastercam
  mcam: "mastercam",
  "mcam-content": "mastercam",
  // HyperCAD-S
  hcsm: "hypercad",
  hcss: "hypercad",
  // SolidWorks
  sldprt: "solidworks",
  sldasm: "solidworks",
  slddrw: "solidworks",
  sldlfp: "solidworks",
  sldblk: "solidworks",
  // ESPRIT
  esprit: "esprit",
  esp: "esprit",
  escx: "esprit",
});

/**
 * Esprit's function index keys ops by id with section auto-detection. The
 * router treats moduleId as a section hint when it matches one of these
 * canonical section names; otherwise moduleId is ignored and Esprit's
 * auto-detect runs.
 */
const ESPRIT_SECTION_KEYS = new Set(["milling", "turning", "mill_turn", "swiss"]);

// ============================================================================
// TYPES
// ============================================================================

export interface DetectSystemArgs {
  sourceSystem?: string;
  filePath?: string;
}

export interface RouterPlanArgs {
  system: CADSystemId;
  moduleId: string;
  operationId: string;
  params?: Record<string, unknown>;
}

export type RoutedExecutionResult =
  | {
      system: "fusion360";
      module_id: string;
      operation_id: string;
      python_api: string;
      python_script: string;
    }
  | {
      system: "inventor";
      module_id: string;
      operation_id: string;
      ilogic_snippet: string;
      plan: unknown;
    }
  | {
      system: "mastercam";
      module_id: string;
      operation_id: string;
      csharp_scaffold: string;
      plan: unknown;
    }
  | {
      system: "hypercad";
      module_id: string;
      operation_id: string;
      macro_scaffold: string;
      plan: unknown;
    }
  | {
      system: "solidworks";
      module_id: string;
      operation_id: string;
      vba_macro: string;
      plan: unknown;
    }
  | {
      system: "esprit";
      module_id: string;
      operation_id: string;
      kbm_macro: string;
      plan: unknown;
    };

export interface OperationMatch {
  system: CADSystemId;
  module_id: string;
  operation_id: string;
  category: string;
  params_count: number;
}

export interface SystemCapabilitySnapshot {
  system: CADSystemId;
  total_modules: number;
  total_operations: number;
  total_parameters: number;
}

export interface CapabilityMatrix {
  systems: SystemCapabilitySnapshot[];
  totals: {
    total_modules: number;
    total_operations: number;
    total_parameters: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class CADSystemRouterEngine {
  /**
   * Snapshot of the supported-systems taxonomy and extension map.
   *
   * @returns frozen system list + extension→system mapping
   */
  static listSupportedSystems(): {
    systems: readonly CADSystemId[];
    extensions: Readonly<Record<string, CADSystemId>>;
  } {
    return {
      systems: SUPPORTED_CAD_SYSTEMS,
      extensions: CAD_FILE_EXTENSION_MAP,
    };
  }

  /**
   * Detect the CAD system from an explicit hint or a file extension.
   *
   * Resolution order:
   *   1. explicit `sourceSystem` hint (case-insensitive, must be a supported id)
   *   2. file extension lookup (last `.` segment of filePath, lowercased)
   *
   * @returns the resolved CADSystemId or null if unresolvable
   */
  static detectSystem(args: DetectSystemArgs): CADSystemId | null {
    if (args.sourceSystem && typeof args.sourceSystem === "string") {
      const normalized = args.sourceSystem.toLowerCase().trim();
      if ((SUPPORTED_CAD_SYSTEMS as readonly string[]).includes(normalized)) {
        return normalized as CADSystemId;
      }
    }
    if (args.filePath && typeof args.filePath === "string") {
      const lastDot = args.filePath.lastIndexOf(".");
      if (lastDot !== -1 && lastDot < args.filePath.length - 1) {
        const ext = args.filePath.slice(lastDot + 1).toLowerCase();
        const mapped = CAD_FILE_EXTENSION_MAP[ext];
        if (mapped) return mapped;
      }
    }
    return null;
  }

  /**
   * Plan + render an operation against the appropriate CAD bridge.
   *
   * Dispatches to the system-specific bridge:
   *   - fusion360  → Fusion360CADFunctionIndexEngine.getOperation +
   *                  AutodeskFusionMCPProxyEngine.renderPythonScript (pure render,
   *                  no live MCP execution)
   *   - inventor   → InventorCADExecutionBridge.{plan, renderILogicScaffold}
   *   - mastercam  → MastercamCADExecutionBridge.{plan, renderNETHookScaffold}
   *   - hypercad   → HyperCADCADExecutionBridge.{plan, renderMacroScaffold}
   *   - solidworks → SolidWorksCADExecutionBridge.{plan, renderVBAScaffold}
   *
   * Throws on unknown system, missing required params (per bridge contract),
   * or operation absent from the catalog.
   *
   * @param args.system — one of SUPPORTED_CAD_SYSTEMS
   * @param args.moduleId — function-index module id
   * @param args.operationId — operation id
   * @param args.params — flat parameter map (optional, defaults to {})
   * @returns RoutedExecutionResult with the system-appropriate script artifact
   */
  static async planAndRender(args: RouterPlanArgs): Promise<RoutedExecutionResult> {
    if (!args.system || !(SUPPORTED_CAD_SYSTEMS as readonly string[]).includes(args.system)) {
      throw new Error(
        `CADSystemRouterEngine.planAndRender: unsupported system "${String(args.system)}" (supported: ${SUPPORTED_CAD_SYSTEMS.join(", ")})`,
      );
    }
    const params = args.params ?? {};

    if (args.system === "fusion360") {
      const { Fusion360CADFunctionIndexEngine } = await import(
        "./Fusion360CADFunctionIndexEngine.js"
      );
      const { renderPythonScript } = await import("./AutodeskFusionMCPProxyEngine.js");
      const op = Fusion360CADFunctionIndexEngine.getOperation(args.moduleId, args.operationId);
      if (!op) {
        throw new Error(
          `CADSystemRouterEngine: fusion360 operation not found ${args.moduleId}/${args.operationId}`,
        );
      }
      if (!op.python_api) {
        throw new Error(
          `CADSystemRouterEngine: fusion360 operation ${args.moduleId}/${args.operationId} has no python_api binding`,
        );
      }
      const script = renderPythonScript(op.python_api, params);
      return {
        system: "fusion360",
        module_id: args.moduleId,
        operation_id: args.operationId,
        python_api: op.python_api,
        python_script: script,
      };
    }

    if (args.system === "inventor") {
      const { InventorCADExecutionBridge } = await import("./InventorCADExecutionBridge.js");
      const plan = await InventorCADExecutionBridge.plan({
        moduleId: args.moduleId,
        operationId: args.operationId,
        params,
      });
      const ilogic = InventorCADExecutionBridge.renderILogicScaffold(plan);
      return {
        system: "inventor",
        module_id: args.moduleId,
        operation_id: args.operationId,
        ilogic_snippet: ilogic,
        plan,
      };
    }

    if (args.system === "mastercam") {
      const { MastercamCADExecutionBridge } = await import("./MastercamCADExecutionBridge.js");
      const plan = await MastercamCADExecutionBridge.plan({
        moduleId: args.moduleId,
        operationId: args.operationId,
        params,
      });
      const csharp = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
      return {
        system: "mastercam",
        module_id: args.moduleId,
        operation_id: args.operationId,
        csharp_scaffold: csharp,
        plan,
      };
    }

    if (args.system === "hypercad") {
      const { HyperCADCADExecutionBridge } = await import("./HyperCADCADExecutionBridge.js");
      const plan = await HyperCADCADExecutionBridge.plan({
        moduleId: args.moduleId,
        operationId: args.operationId,
        params,
      });
      const macro = HyperCADCADExecutionBridge.renderMacroScaffold(plan);
      return {
        system: "hypercad",
        module_id: args.moduleId,
        operation_id: args.operationId,
        macro_scaffold: macro,
        plan,
      };
    }

    if (args.system === "solidworks") {
      const { SolidWorksCADExecutionBridge } = await import("./SolidWorksCADExecutionBridge.js");
      const swPlan = await SolidWorksCADExecutionBridge.plan({
        moduleId: args.moduleId,
        operationId: args.operationId,
        params,
      });
      const vba = SolidWorksCADExecutionBridge.renderVBAScaffold(swPlan);
      return {
        system: "solidworks",
        module_id: args.moduleId,
        operation_id: args.operationId,
        vba_macro: vba,
        plan: swPlan,
      };
    }

    // args.system === "esprit"
    // Esprit's bridge takes operationId only and auto-detects section.
    // We forward moduleId as sectionHint when it matches a real Esprit
    // section; otherwise moduleId is informational and the bridge auto-
    // detects. This preserves the unified router signature without
    // surfacing Esprit's auto-detect behavior to the caller.
    const { EspritCADExecutionBridge } = await import("./EspritCADExecutionBridge.js");
    const espritArgs: { operationId: string; params: Record<string, unknown>; sectionHint?: string } = {
      operationId: args.operationId,
      params,
    };
    if (args.moduleId && ESPRIT_SECTION_KEYS.has(args.moduleId)) {
      espritArgs.sectionHint = args.moduleId;
    }
    const espritPlan = await EspritCADExecutionBridge.plan(espritArgs);
    const kbm = EspritCADExecutionBridge.renderKBMScaffold(espritPlan);
    return {
      system: "esprit",
      // Echo the resolved section back as module_id so callers can introspect.
      module_id: espritPlan.section,
      operation_id: args.operationId,
      kbm_macro: kbm,
      plan: espritPlan,
    };
  }

  /**
   * Find every catalog match for the given operation id across all 5 systems.
   *
   * Useful when an upstream AI consumer has a feature in mind (e.g. "EXTRUDE"
   * or "CIRCLE") and needs to know which CAD systems can author it. The match
   * is a case-sensitive equality check on the operation id within each
   * system's catalog — the catalog id is the canonical surface for AI lookups.
   *
   * @param operationId — exact operation id (e.g. "EXTRUDE", "CIRCLE", "MATE_ADD")
   * @returns matches across all 5 systems, in SUPPORTED_CAD_SYSTEMS order
   */
  static async findOperationAcrossSystems(operationId: string): Promise<OperationMatch[]> {
    if (!operationId || typeof operationId !== "string") {
      throw new Error("CADSystemRouterEngine.findOperationAcrossSystems: operationId required");
    }
    const matches: OperationMatch[] = [];
    const indexEngines = await loadAllFunctionIndexEngines();

    for (const system of SUPPORTED_CAD_SYSTEMS) {
      const engine = indexEngines[system];
      const ops = engine.listAllOperations();
      for (const op of ops) {
        if (op.operation_id === operationId) {
          matches.push({
            system,
            module_id: op.module_id,
            operation_id: op.operation_id,
            category: op.category,
            params_count: op.params_count,
          });
        }
      }
    }
    return matches;
  }

  /**
   * Capability matrix snapshot across all 5 CAD systems.
   *
   * Returns per-system module / operation / parameter counts plus aggregate
   * totals. The AI orchestrator uses this to surface "PRISM authoring
   * coverage = N modules / M ops / P params across 5 CAD systems" in
   * dashboards and capability self-introspection.
   *
   * @returns CapabilityMatrix with per-system snapshots + aggregate totals
   */
  static async listCapabilitiesAcrossSystems(): Promise<CapabilityMatrix> {
    const indexEngines = await loadAllFunctionIndexEngines();
    const snapshots: SystemCapabilitySnapshot[] = [];
    let totalModules = 0;
    let totalOps = 0;
    let totalParams = 0;

    for (const system of SUPPORTED_CAD_SYSTEMS) {
      const engine = indexEngines[system];
      const allOps = engine.listAllOperations();
      const idx = engine.getIndex();
      const moduleCount = idx.modules.length;
      const opCount = allOps.length;
      const paramCount = engine.getTotalParameterCount();
      snapshots.push({
        system,
        total_modules: moduleCount,
        total_operations: opCount,
        total_parameters: paramCount,
      });
      totalModules += moduleCount;
      totalOps += opCount;
      totalParams += paramCount;
    }

    return {
      systems: snapshots,
      totals: {
        total_modules: totalModules,
        total_operations: totalOps,
        total_parameters: totalParams,
      },
    };
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

/**
 * Common surface every CAD function index engine exposes that the router
 * relies on. The 5 individual engines all ship `getIndex()`,
 * `listAllOperations()`, `getTotalParameterCount()` — TypeScript can't
 * structurally infer a single shared interface across them because each
 * engine has a system-specific index type, so the router uses a structural
 * interface narrow enough to cover what it actually needs.
 */
interface RouterCompatibleIndexEngine {
  getIndex(): { modules: readonly { module_id: string }[] };
  listAllOperations(): readonly {
    module_id: string;
    operation_id: string;
    category: string;
    params_count: number;
  }[];
  getTotalParameterCount(): number;
}

/**
 * Lazy-load all 5 function-index engines and return them keyed by system id.
 * Cached for the lifetime of the process — engines themselves cache catalog
 * JSON loads internally, so re-loading the engine is cheap but redundant.
 */
let _indexEngineCache: Record<CADSystemId, RouterCompatibleIndexEngine> | null = null;

async function loadAllFunctionIndexEngines(): Promise<
  Record<CADSystemId, RouterCompatibleIndexEngine>
> {
  if (_indexEngineCache) return _indexEngineCache;
  const [
    { Fusion360CADFunctionIndexEngine },
    { InventorCADFunctionIndexEngine },
    { MastercamCADFunctionIndexEngine },
    { HyperCADCADFunctionIndexEngine },
    { SolidWorksCADFunctionIndexEngine },
    { EspritFunctionIndexEngine },
  ] = await Promise.all([
    import("./Fusion360CADFunctionIndexEngine.js"),
    import("./InventorCADFunctionIndexEngine.js"),
    import("./MastercamCADFunctionIndexEngine.js"),
    import("./HyperCADCADFunctionIndexEngine.js"),
    import("./SolidWorksCADFunctionIndexEngine.js"),
    import("./EspritFunctionIndexEngine.js"),
  ]);
  _indexEngineCache = {
    fusion360: Fusion360CADFunctionIndexEngine as unknown as RouterCompatibleIndexEngine,
    inventor: InventorCADFunctionIndexEngine as unknown as RouterCompatibleIndexEngine,
    mastercam: MastercamCADFunctionIndexEngine as unknown as RouterCompatibleIndexEngine,
    hypercad: HyperCADCADFunctionIndexEngine as unknown as RouterCompatibleIndexEngine,
    solidworks: SolidWorksCADFunctionIndexEngine as unknown as RouterCompatibleIndexEngine,
    esprit: makeEspritRouterAdapter(EspritFunctionIndexEngine),
  };
  return _indexEngineCache;
}

/**
 * Adapt EspritFunctionIndexEngine to the RouterCompatibleIndexEngine shape.
 *
 * Differences the adapter normalizes:
 *   - Esprit organizes its index as `sections` (milling/turning/mill_turn/
 *     swiss); the router treats each section as a "module" so the existing
 *     OperationMatch.module_id field stays meaningful.
 *   - Esprit doesn't expose `listAllOperations()` — we walk the cached
 *     sections directly. Each operation's params_count comes from the
 *     declared `parameter_count` field when present, or is computed by
 *     summing the group→param table.
 *   - Esprit doesn't expose `getTotalParameterCount()` — the index already
 *     aggregates totals across sections, so we return that.
 *
 * Type assertion at the call site is unavoidable because the donor engines
 * each ship system-specific TypeScript types that can't be structurally
 * unified without refactoring all 5 engines. The adapter ensures the
 * runtime contract holds for the router's actual access pattern.
 */
function makeEspritRouterAdapter(
  espritEngine: typeof import("./EspritFunctionIndexEngine.js")["EspritFunctionIndexEngine"],
): RouterCompatibleIndexEngine {
  return {
    getIndex() {
      const idx = espritEngine.getIndex();
      return {
        modules: Object.keys(idx.sections).map((sectionKey) => ({ module_id: sectionKey })),
      };
    },
    listAllOperations() {
      const idx = espritEngine.getIndex();
      const out: { module_id: string; operation_id: string; category: string; params_count: number }[] = [];
      for (const [sectionKey, section] of Object.entries(idx.sections)) {
        for (const [opId, op] of Object.entries(section.operations || {})) {
          let pc = typeof op.parameter_count === "number" ? op.parameter_count : 0;
          if (pc === 0) {
            for (const group of Object.values(op.parameters || {})) {
              pc += Object.keys(group).length;
            }
          }
          out.push({
            module_id: sectionKey,
            operation_id: opId,
            category: op.category,
            params_count: pc,
          });
        }
      }
      return out;
    },
    getTotalParameterCount() {
      return espritEngine.getIndex().total_parameters;
    },
  };
}
