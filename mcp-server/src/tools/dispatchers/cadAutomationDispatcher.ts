/**
 * prism_cad_automation — CAD Automation Dispatcher
 *
 * Wires the unified CADAutomationRouter (U-CAUT10) into the MCP action surface
 * so skills, agents, and external clients can drive CAD automation through a
 * single set of 14 actions regardless of which underlying bridge services the
 * call (SolidWorks, Inventor, FreeCAD, Mastercam, Fusion 360, hyperMILL).
 *
 * Action surface:
 *   Routing / discovery
 *     - route                        — resolve a filePath to { bridge, ext }
 *     - list_supported_extensions    — enumerate all 12 covered extensions
 *     - supports_extension           — case-insensitive supports check
 *   Lifecycle
 *     - open                         — open a CAD session by filePath
 *     - close                        — tear down a CAD session
 *   Data access (requires prior open)
 *     - get_geometry                 — normalized entity counts
 *     - get_operation_tree           — normalized op count + cycle palette
 *     - get_toolpaths                — flat list of normalized ops
 *     - export_step                  — emit STEP AP242 to outputPath
 *   Mock-layer passthrough (no open required)
 *     - mock_geometry / mock_operation_tree / mock_toolpaths
 *     - mock_fingerprint / mock_all_fingerprints
 *
 * Design notes:
 *   - No per-bridge actions — callers never pick the bridge manually. The
 *     router inspects the extension and picks the right one.
 *   - In PRISM_CAD_MOCK=1 mode the router short-circuits open/close/export to
 *     no-ops and serves geometry/ops/toolpaths from CADAutomationMockLayer.
 *   - Hooks fire on "pre-calculation" / "post-calculation" to match the
 *     pattern used by every other PRISM dispatcher.
 *
 * @milestone CAD-AUTOMATION-MS0/U-CAUT11
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CAD_AUTOMATION_ACTION_SCHEMAS } from "../../schemas/cadAutomationActionSchemas.js";
import type { ICADCodeGenerator } from "../../interfaces/ICADCodeGenerator.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// Lazy singletons
let _router: typeof import("../../engines/CADAutomationRouter.js").cadAutomationRouter | null = null;
let _mockLayer: typeof import("../../engines/CADAutomationMockLayer.js").cadAutomationMockLayer | null =
  null;

async function getRouter() {
  if (_router) return _router;
  const mod = await import("../../engines/CADAutomationRouter.js");
  _router = mod.cadAutomationRouter;
  return _router;
}

async function getMockLayer() {
  if (_mockLayer) return _mockLayer;
  const mod = await import("../../engines/CADAutomationMockLayer.js");
  _mockLayer = mod.cadAutomationMockLayer;
  return _mockLayer;
}

const ACTIONS = [
  // Routing / discovery
  "route",
  "list_supported_extensions",
  "supports_extension",
  // Lifecycle
  "open",
  "close",
  // Data access
  "get_geometry",
  "get_operation_tree",
  "get_toolpaths",
  "export_step",
  // Mock-layer passthrough
  "mock_geometry",
  "mock_operation_tree",
  "mock_toolpaths",
  "mock_fingerprint",
  "mock_all_fingerprints",
  // CAD-INPUT-MS0 — universal DXF parse + write (closes 1,445-file gap)
  "dxf_parse",
  "dxf_write_polygons",
  // U-CUIX-P0-19 — AI-control surface: route master-AI intent through
  // ICADCodeGenerator adapters (FreeCAD/Fusion360/Inventor/Mastercam today;
  // HyperCAD-S + SolidWorks land in P0-17/P0-18). Closes the "4 adapters
  // with 557 tests but zero dispatcher wiring" orphan flagged by CAD-UIX-MS0
  // round 1 scrutiny finding F4.
  "list_systems",
  "list_capabilities",
  "build_script",
  "execute_script",
  "validate_script",
  // U-CUIX-P0-20 — CADOperationPlanner intent → CADOperation[] surface
  "plan_ops",
  // U-CUIX-P0-21 — ComplexPartPlanner: multi-body + multi-configuration
  "plan_complex_part",
  // U-CUIX-P0-22 — AssemblyPlanner: components + mates + BOM + drawings
  "plan_assembly",
  // U-CADC-AI01 — MasterCADControlBrain: full orchestration facade
  "orchestrate_intent",
  // U-CADC-AI02 — CADIntentDecomposer: NL → structured intent
  "decompose_intent",
  // U-CADC-AI04 — CADAIStateMachine: observable FSM for multi-step flows
  "fsm_open",
  "fsm_close",
  "fsm_dispatch",
  "fsm_snapshot",
  "fsm_log",
  "fsm_list",
  "fsm_allowed_events",
  // U-CADC13 — BladeProfileLibrary: NACA 4/5-digit airfoil generation
  "airfoil_list",
  "airfoil_query",
  "airfoil_get",
  "airfoil_interpolate",
  // U-CADC28 — CADFeatureMemoryEngine: persistent feature pattern memory + similarity search
  "feature_memory_record",
  "feature_memory_query",
  "feature_memory_lookup",
  "feature_memory_stats",
  // U-CGT03 — CADToSTEPPipelineEngine: full CAD→STEP orchestration + AP214/AP242 validation
  "step_pipeline_run",
  "step_pipeline_batch",
  "step_validate",
  "step_pipeline_strategies",
  "step_pipeline_supported",
  // U-CGT04 — GroundTruthFeatureTreeExtractor: canonical feature tree extraction across CAD formats
  "feature_tree_extract",
  "feature_tree_validate",
  "feature_tree_recompute_signature",
  "feature_tree_canonical_types",
  "feature_tree_source_formats",
  // U-CGT01 — FCStdNativeParserEngine: native FreeCAD .FCStd parsing (ZIP+XML)
  "fcstd_parse",
  // U-CGT02 — F3DSQLiteParserEngine: native Fusion .f3d / .f3z parsing (ZIP+SQLite)
  "f3d_parse",
  "f3z_parse",
] as const;

export type CadAutomationAction = (typeof ACTIONS)[number];

async function resolveExtFromParams(params: Record<string, unknown>): Promise<string> {
  if (typeof params["ext"] === "string" && params["ext"]) return params["ext"] as string;
  if (typeof params["filePath"] === "string" && params["filePath"]) {
    const router = await getRouter();
    const d = router.route(params["filePath"] as string);
    return d.ext;
  }
  throw new Error("Provide either 'ext' or 'filePath'");
}

export function registerCadAutomationDispatcher(server: any): void {
  server.tool(
    "prism_cad_automation",
    `CAD automation router — unified access to SolidWorks/Inventor/FreeCAD/Mastercam/Fusion 360/hyperMILL via a single action surface. Supported formats: .sldprt .sldasm .ipt .iam .FCStd .FCStd1 .mcam .mcx .mcx-8 .f3d .f3z .hmc.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: CadAutomationAction;
      params?: Record<string, unknown>;
    }) => {
      log.info(`[prism_cad_automation] Action: ${action}`);
      let result: unknown;
      try {
        let params: Record<string, unknown> = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams) as Record<string, unknown>;
        } catch {
          /* normalizer unavailable — proceed with raw params */
        }

        const validation = validateActionParams(action, params, CAD_AUTOMATION_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cad_automation",
          );
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "cadAutomationDispatcher", action, params },
        };
        const pre = await hookExecutor.execute("pre-calculation", hookCtx);
        if (pre.blocked) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  blocked: true,
                  blocker: pre.blockedBy,
                  reason: pre.summary,
                  action,
                }),
              },
            ],
          };
        }

        const router = await getRouter();

        switch (action) {
          case "route": {
            result = router.route(params["filePath"] as string);
            break;
          }
          case "list_supported_extensions": {
            result = { extensions: router.listSupportedExtensions() };
            break;
          }
          case "supports_extension": {
            const ext = params["ext"] as string;
            result = { ext, supported: router.supportsExtension(ext) };
            break;
          }
          case "open": {
            result = await router.open(params["filePath"] as string);
            break;
          }
          case "close": {
            result = await router.close(params["filePath"] as string);
            break;
          }
          case "get_geometry": {
            result = await router.getGeometry(params["filePath"] as string);
            break;
          }
          case "get_operation_tree": {
            result = await router.getOperationTree(params["filePath"] as string);
            break;
          }
          case "get_toolpaths": {
            result = await router.getToolpaths(params["filePath"] as string);
            break;
          }
          case "export_step": {
            result = await router.exportSTEP(
              params["filePath"] as string,
              params["outputPath"] as string,
            );
            break;
          }
          case "mock_geometry": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = mock.geometryFor(ext as Parameters<typeof mock.geometryFor>[0]);
            break;
          }
          case "mock_operation_tree": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = mock.operationTreeFor(ext as Parameters<typeof mock.operationTreeFor>[0]);
            break;
          }
          case "mock_toolpaths": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = { ops: mock.toolpathsFor(ext as Parameters<typeof mock.toolpathsFor>[0]) };
            break;
          }
          case "mock_fingerprint": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = { ext, fingerprint: mock.fingerprint(ext as Parameters<typeof mock.fingerprint>[0]) };
            break;
          }
          case "mock_all_fingerprints": {
            const mock = await getMockLayer();
            result = mock.allFingerprints();
            break;
          }
          case "dxf_parse": {
            // CAD-INPUT-MS0 — parse DXF content into Polygon2D[] via DXFParserEngine.
            const { dxfParserEngine } = await import("../../engines/DXFParserEngine.js");
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("dxf_parse requires non-empty 'content' string");
            }
            const polygons = dxfParserEngine.parseDXF(content);
            result = {
              polygon_count: polygons.length,
              polygons,
              source: "dxfParserEngine.parseDXF",
            };
            break;
          }
          case "dxf_write_polygons": {
            // CAD-INPUT-MS0 — write Polygon2D[] to DXF R12 ASCII.
            const { dxfWriterEngine } = await import("../../engines/DxfWriterEngine.js");
            result = dxfWriterEngine.writePolygonsToDxf(
              params["polygons"] as Parameters<typeof dxfWriterEngine.writePolygonsToDxf>[0],
              {
                outer_layer: params["outer_layer"] as string | undefined,
                hole_layer: params["hole_layer"] as string | undefined,
                acadver: params["acadver"] as string | undefined,
                precision: params["precision"] as number | undefined,
              },
            );
            break;
          }
          // ── U-CUIX-P0-19: AI-control surface via CADAdapterRegistry ──
          case "list_systems": {
            const { listAllCADSystems } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const inv = listAllCADSystems();
            const includeUnregistered = params["include_unregistered"] !== false;
            result = includeUnregistered
              ? inv
              : { registered: inv.registered, totalDeclared: inv.totalDeclared, coverageRatio: inv.coverageRatio };
            break;
          }
          case "list_capabilities": {
            const { listAllCapabilities, getCADAdapter, isCADSystemRegistered } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const requested = params["cad_system"] as string | undefined;
            if (requested) {
              if (!isCADSystemRegistered(requested)) {
                throw new Error(
                  `CAD system '${requested}' is not registered. Use action 'list_systems' to enumerate available systems.`,
                );
              }
              const adapter = await getCADAdapter(requested);
              const caps = adapter.getCapabilities();
              result = {
                cad_system: caps.cadSystem,
                supported_ops: Array.from(caps.supportedOps).sort(),
                supported_ops_count: caps.supportedOps.size,
                native_length_unit: caps.nativeLengthUnit,
                native_angle_unit: caps.nativeAngleUnit,
                requires_subprocess: caps.requiresSubprocess,
                typical_latency_ms: caps.typicalLatencyMs,
                limits: caps.limits ?? {},
              };
            } else {
              const full = await listAllCapabilities();
              result = {
                systems: full.map((e) => ({
                  cad_system: e.cadSystem,
                  description: e.description,
                  supported_ops_count: e.supportedOpsCount,
                  native_length_unit: e.capabilities.nativeLengthUnit,
                  native_angle_unit: e.capabilities.nativeAngleUnit,
                  requires_subprocess: e.capabilities.requiresSubprocess,
                  typical_latency_ms: e.capabilities.typicalLatencyMs,
                })),
                count: full.length,
              };
            }
            break;
          }
          case "build_script": {
            const { getCADAdapter } = await import("../../engines/CADAdapterRegistry.js");
            const cadSystem = params["cad_system"] as string;
            const operations = params["operations"] as Array<Record<string, unknown>>;
            const context = (params["context"] as Record<string, unknown>) ?? {};
            const adapter = await getCADAdapter(cadSystem);
            const script = adapter.buildScript(
              operations as Parameters<typeof adapter.buildScript>[0],
              context as Parameters<typeof adapter.buildScript>[1],
            );
            // Serialize Map → [key, value][] so the script crosses the MCP wire cleanly.
            const parametersArr = Array.from(script.parameters.entries());
            result = {
              cad_system: script.cadSystem,
              body: script.body,
              filename: script.filename,
              imports: script.imports,
              lineage: script.lineage,
              warnings: script.warnings,
              parameters: parametersArr,
              op_count: operations.length,
              script_bytes: script.body.length,
            };
            break;
          }
          case "execute_script": {
            const { getCADAdapter, cadAdapterRequiresLiveHost } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const cadSystem = params["cad_system"] as string;
            const scriptParam = params["script"] as Record<string, unknown>;
            const adapter = await getCADAdapter(cadSystem);
            // Reconstruct the CADScript<string> shape from the wire payload.
            const parametersInput = scriptParam["parameters"];
            const paramEntries: Array<[string, unknown]> = Array.isArray(parametersInput)
              ? (parametersInput as Array<[string, unknown]>)
              : [];
            const script = {
              cadSystem: scriptParam["cadSystem"] as string,
              body: scriptParam["body"] as string,
              filename: scriptParam["filename"] as string,
              imports: (scriptParam["imports"] as string[]) ?? [],
              lineage: (scriptParam["lineage"] as unknown[]) ?? [],
              warnings: (scriptParam["warnings"] as unknown[]) ?? [],
              parameters: new Map(paramEntries) as Parameters<typeof adapter.executeScript>[0]["parameters"],
            } as Parameters<typeof adapter.executeScript>[0];
            const execResult = await adapter.executeScript(script);
            result = {
              ...execResult,
              cad_system: cadSystem,
              requires_live_host: cadAdapterRequiresLiveHost(cadSystem as never),
            };
            break;
          }
          case "validate_script": {
            const { getCADAdapter } = await import("../../engines/CADAdapterRegistry.js");
            const cadSystem = params["cad_system"] as string;
            const execResult = params["execution_result"] as Parameters<
              ICADCodeGenerator["validateOutput"]
            >[0];
            const adapter = await getCADAdapter(cadSystem);
            const report = adapter.validateOutput(execResult);
            result = {
              cad_system: cadSystem,
              ok: report.ok,
              findings: report.findings,
              acceptance_score: report.acceptanceScore,
            };
            break;
          }
          case "plan_ops": {
            // U-CUIX-P0-20 — structured intent → CADOperation[] via planner.
            const { cadOperationPlannerEngine } = await import(
              "../../engines/CADOperationPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof cadOperationPlannerEngine.plan
            >[0];
            const planResult = await cadOperationPlannerEngine.plan(intent);
            result = {
              cad_system: planResult.cadSystem,
              ops: planResult.ops,
              op_count: planResult.opCount,
              feature_count: planResult.featureCount,
              warnings: planResult.warnings,
              compatibility: planResult.compatibility,
            };
            break;
          }
          case "orchestrate_intent": {
            // U-CADC-AI01 — full chain: intent → select_cad → plan → build → (execute) → validate
            const { masterCADControlBrainEngine } = await import(
              "../../engines/MasterCADControlBrainEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof masterCADControlBrainEngine.orchestrate
            >[0];
            const opts = (params["options"] as Parameters<
              typeof masterCADControlBrainEngine.orchestrate
            >[1]) ?? {};
            const report = await masterCADControlBrainEngine.orchestrate(intent, opts);
            result = {
              tier: report.tier,
              cad_system: report.cadSystem,
              ok: report.ok,
              stages: report.stages,
              op_count: report.ops.length,
              script_bytes: report.script?.body.length ?? 0,
              execution_result: report.executionResult,
              validation_report: report.validationReport,
              total_duration_ms: report.totalDurationMs,
              compatibility: report.compatibility,
              narration: report.narration,
              warnings: report.warnings,
            };
            break;
          }
          case "plan_assembly": {
            // U-CUIX-P0-22 — components + mates + BOM + drawings → plan.
            const { assemblyPlannerEngine } = await import(
              "../../engines/AssemblyPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof assemblyPlannerEngine.plan
            >[0];
            const asm = await assemblyPlannerEngine.plan(intent);
            result = {
              cad_system: asm.cadSystem,
              assembly_name: asm.assemblyName,
              component_count: asm.componentCount,
              mate_count: asm.mateCount,
              drawing_view_count: asm.drawingViewCount,
              ops: asm.ops,
              op_count: asm.opCount,
              bom: asm.bom,
              warnings: asm.warnings,
              compatibility: asm.compatibility,
            };
            break;
          }
          case "airfoil_list": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            result = {
              count: bladeProfileLibraryEngine.profileCount(),
              entries: bladeProfileLibraryEngine.listCatalog(),
            };
            break;
          }
          case "airfoil_query": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            result = {
              entries: bladeProfileLibraryEngine.query({
                designation: params["designation"] as string | undefined,
                family: params["family"] as "naca-4" | "naca-5" | undefined,
                thicknessPct: params["thicknessPct"] as number | undefined,
                thicknessToleranceAbs: params["thicknessToleranceAbs"] as
                  | number
                  | undefined,
              }),
            };
            break;
          }
          case "airfoil_get": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            const designation = params["designation"] as string;
            const samples =
              typeof params["samplesPerSurface"] === "number"
                ? (params["samplesPerSurface"] as number)
                : 80;
            const p = bladeProfileLibraryEngine.getProfile(designation, samples);
            result = {
              designation: p.designation,
              family: p.family,
              digits: p.digits,
              max_camber: p.maxCamber,
              max_camber_pos: p.maxCamberPos,
              thickness: p.thickness,
              upper: p.upper,
              lower: p.lower,
              contour: p.contour,
              samples_per_surface: p.samplesPerSurface,
            };
            break;
          }
          case "airfoil_interpolate": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            const designation = params["designation"] as string;
            const x = params["x"] as number;
            const surface = params["surface"] as "upper" | "lower";
            const samples =
              typeof params["samplesPerSurface"] === "number"
                ? (params["samplesPerSurface"] as number)
                : 80;
            const p = bladeProfileLibraryEngine.getProfile(designation, samples);
            result = {
              designation,
              x,
              surface,
              y: bladeProfileLibraryEngine.interpolate(p, x, surface),
            };
            break;
          }
          case "fsm_open": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.open(params["sessionId"] as string);
            break;
          }
          case "fsm_close": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            cadAIStateMachineEngine.close(params["sessionId"] as string);
            result = { closed: true, sessionId: params["sessionId"] };
            break;
          }
          case "fsm_dispatch": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.dispatch(
              params["sessionId"] as string,
              params["event"] as Parameters<
                typeof cadAIStateMachineEngine.dispatch
              >[1],
              params["payload"],
            );
            break;
          }
          case "fsm_snapshot": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.snapshot(params["sessionId"] as string);
            break;
          }
          case "fsm_log": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            const tail = typeof params["tail"] === "number" ? (params["tail"] as number) : 100;
            result = {
              sessionId: params["sessionId"],
              log: cadAIStateMachineEngine.getLog(params["sessionId"] as string, tail),
            };
            break;
          }
          case "fsm_list": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = { sessions: cadAIStateMachineEngine.list() };
            break;
          }
          case "fsm_allowed_events": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = {
              sessionId: params["sessionId"],
              events: cadAIStateMachineEngine.allowedEvents(params["sessionId"] as string),
            };
            break;
          }
          case "decompose_intent": {
            // U-CADC-AI02 — parse NL into structured CAD intent for AI01.
            const { cadIntentDecomposerEngine } = await import(
              "../../engines/CADIntentDecomposerEngine.js"
            );
            const nl = params["input"] as string;
            const nameHint = params["nameHint"] as string | undefined;
            if (typeof nl !== "string" || nl.trim().length === 0) {
              throw new Error("decompose_intent requires 'input' (non-empty string)");
            }
            const decomposed = cadIntentDecomposerEngine.decompose(nl, nameHint);
            result = {
              raw_input: decomposed.rawInput,
              tier: decomposed.tier,
              cad_system: decomposed.cadSystem,
              operation_type: decomposed.operationType,
              parameters: decomposed.parameters,
              constraints: decomposed.constraints,
              preferred_bridge: decomposed.preferredBridge,
              features: decomposed.features,
              op_intent: decomposed.opIntent,
              ambiguities: decomposed.ambiguities,
              confidence: decomposed.confidence,
              classification: decomposed.classification,
            };
            break;
          }
          case "plan_complex_part": {
            // U-CUIX-P0-21 — multi-body + multi-config ComplexPartIntent → plan.
            const { complexPartPlannerEngine } = await import(
              "../../engines/ComplexPartPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof complexPartPlannerEngine.plan
            >[0];
            const cp = await complexPartPlannerEngine.plan(intent);
            result = {
              cad_system: cp.cadSystem,
              part_name: cp.partName,
              body_count: cp.bodyCount,
              configuration_count: cp.configurationCount,
              default_ops: cp.defaultOps,
              default_op_count: cp.defaultOpCount,
              per_configuration: cp.perConfiguration,
              warnings: cp.warnings,
              compatibility: cp.compatibility,
              boolean_ops_emitted: cp.booleanOpsEmitted,
            };
            break;
          }
          case "feature_memory_record": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const featureType = String(params["feature_type"] ?? "");
            const parameters = (params["parameters"] ?? {}) as Record<string, number | string | boolean>;
            const outcome = String(params["outcome"] ?? "") as "success" | "failure";
            const genTimeMs = Number(params["gen_time_ms"] ?? 0);
            const errorPattern = typeof params["error_pattern"] === "string" ? (params["error_pattern"] as string) : undefined;
            const persistFlag = params["persist"] === undefined ? true : Boolean(params["persist"]);
            const entry = await cadFeatureMemoryEngine.record({
              feature_type: featureType,
              parameters,
              outcome,
              gen_time_ms: genTimeMs,
              error_pattern: errorPattern,
            });
            if (persistFlag) await cadFeatureMemoryEngine.persist();
            result = {
              id: entry.id,
              feature_type: entry.feature_type,
              total_attempts: entry.total_attempts,
              success_count: entry.success_count,
              failure_count: entry.failure_count,
              success_rate: entry.success_rate,
              avg_gen_time_ms: entry.avg_gen_time_ms,
              error_patterns: entry.error_patterns,
              created_at: entry.created_at,
              last_used_at: entry.last_used_at,
              persisted: persistFlag,
            };
            break;
          }
          case "feature_memory_query": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const featureType = String(params["feature_type"] ?? "");
            const parameters = (params["parameters"] ?? {}) as Record<string, number | string | boolean>;
            const matches = await cadFeatureMemoryEngine.query(featureType, parameters, {
              topK: typeof params["topK"] === "number" ? (params["topK"] as number) : undefined,
              minSuccessRate: typeof params["minSuccessRate"] === "number" ? (params["minSuccessRate"] as number) : undefined,
              minAttempts: typeof params["minAttempts"] === "number" ? (params["minAttempts"] as number) : undefined,
              featureTypeFilter: typeof params["featureTypeFilter"] === "string" ? (params["featureTypeFilter"] as string) : undefined,
            });
            result = {
              count: matches.length,
              matches: matches.map((m) => ({
                id: m.entry.id,
                feature_type: m.entry.feature_type,
                parameters: m.entry.parameters,
                similarity: m.similarity,
                success_rate: m.entry.success_rate,
                total_attempts: m.entry.total_attempts,
                avg_gen_time_ms: m.entry.avg_gen_time_ms,
                error_patterns: m.entry.error_patterns,
              })),
            };
            break;
          }
          case "feature_memory_lookup": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const id = String(params["id"] ?? "");
            const entry = await cadFeatureMemoryEngine.lookup(id);
            result = { found: entry !== null, entry };
            break;
          }
          case "feature_memory_stats": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            result = await cadFeatureMemoryEngine.stats();
            break;
          }
          case "step_pipeline_run": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            result = await cadToSTEPPipelineEngine.runPipeline({
              filePath: String(params["filePath"] ?? ""),
              outputPath: String(params["outputPath"] ?? ""),
              requireOutputParent: typeof params["requireOutputParent"] === "boolean" ? (params["requireOutputParent"] as boolean) : undefined,
              validate: typeof params["validate"] === "boolean" ? (params["validate"] as boolean) : undefined,
            });
            break;
          }
          case "step_pipeline_batch": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const rawItems = Array.isArray(params["items"]) ? (params["items"] as Array<{ filePath?: unknown; outputPath?: unknown }>) : [];
            const items = rawItems.map((it) => ({
              filePath: String(it?.filePath ?? ""),
              outputPath: String(it?.outputPath ?? ""),
            }));
            result = await cadToSTEPPipelineEngine.runBatch({
              items,
              continueOnError: typeof params["continueOnError"] === "boolean" ? (params["continueOnError"] as boolean) : undefined,
            });
            break;
          }
          case "step_validate": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            result = cadToSTEPPipelineEngine.validateSTEP(String(params["stepFilePath"] ?? ""));
            break;
          }
          case "step_pipeline_strategies": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const ext = String(params["ext"] ?? "");
            const supported = cadToSTEPPipelineEngine.listSupportedExtensions();
            if (!(supported as readonly string[]).includes(ext)) {
              result = { error: `Unsupported extension: ${ext}`, supportedExtensions: supported };
            } else {
              const chain = cadToSTEPPipelineEngine.selectStrategy(ext as (typeof supported)[number]);
              result = { ext, strategies: chain };
            }
            break;
          }
          case "step_pipeline_supported": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const exts = cadToSTEPPipelineEngine.listSupportedExtensions();
            result = { count: exts.length, extensions: exts };
            break;
          }
          case "feature_tree_extract": {
            // U-CGT04 — Extract canonical feature tree from a CAD file (mock or live).
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            const filePath = String(params["filePath"] ?? "");
            const formatHint = typeof params["formatHint"] === "string"
              ? (params["formatHint"] as string)
              : undefined;
            try {
              result = await groundTruthFeatureTreeExtractor.extract(
                filePath,
                formatHint as Parameters<typeof groundTruthFeatureTreeExtractor.extract>[1],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "feature_tree_validate": {
            // U-CGT04 — Validate a candidate tree against the canonical Zod schema.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = groundTruthFeatureTreeExtractor.validate(params["candidate"]);
            break;
          }
          case "feature_tree_recompute_signature": {
            // U-CGT04 — Recompute canonical signature for a tree (post-edit).
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            try {
              const signature = groundTruthFeatureTreeExtractor.recomputeSignature(
                params["tree"] as Parameters<typeof groundTruthFeatureTreeExtractor.recomputeSignature>[0],
              );
              result = { signature };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "feature_tree_canonical_types": {
            // U-CGT04 — Read-only canonical feature-type vocabulary.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            const types = groundTruthFeatureTreeExtractor.listCanonicalTypes();
            result = { count: types.length, types };
            break;
          }
          case "feature_tree_source_formats": {
            // U-CGT04 — Source format vocabulary (file extensions the extractor recognizes).
            const { SOURCE_FORMATS } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = { count: SOURCE_FORMATS.length, formats: SOURCE_FORMATS };
            break;
          }
          case "fcstd_parse": {
            // U-CGT01 — FreeCAD native .FCStd parser (no FreeCAD installation needed).
            const { fcStdNativeParserEngine } = await import(
              "../../engines/FCStdNativeParserEngine.js"
            );
            result = await fcStdNativeParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3d_parse": {
            // U-CGT02 — Fusion 360 native .f3d parser (ZIP+SQLite, no Fusion install).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            result = await f3dSqliteParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3z_parse": {
            // U-CGT02 — Fusion 360 .f3z multi-document archive (returns array).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            const arr = await f3dSqliteParserEngine.parseF3Z(
              String(params["filePath"] ?? ""),
            );
            result = { count: arr.length, documents: arr };
            break;
          }
          default:
            result = { error: `Unknown action: ${action as string}` };
        }

        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            metadata: { ...hookCtx.metadata, result },
          });
        } catch (postErr) {
          log.warn(`[prism_cad_automation] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_cad_automation");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }],
      };
    },
  );
}

// Exported for tests to introspect the action surface without a running server.
export const CAD_AUTOMATION_ACTIONS = ACTIONS;
