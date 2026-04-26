/**
 * prism_cad_automation â€” CAD Automation Dispatcher
 *
 * Wires the unified CADAutomationRouter (U-CAUT10) into the MCP action surface
 * so skills, agents, and external clients can drive CAD automation through a
 * single set of 14 actions regardless of which underlying bridge services the
 * call (SolidWorks, Inventor, FreeCAD, Mastercam, Fusion 360, hyperMILL).
 *
 * Action surface:
 *   Routing / discovery
 *     - route                        â€” resolve a filePath to { bridge, ext }
 *     - list_supported_extensions    â€” enumerate all 12 covered extensions
 *     - supports_extension           â€” case-insensitive supports check
 *   Lifecycle
 *     - open                         â€” open a CAD session by filePath
 *     - close                        â€” tear down a CAD session
 *   Data access (requires prior open)
 *     - get_geometry                 â€” normalized entity counts
 *     - get_operation_tree           â€” normalized op count + cycle palette
 *     - get_toolpaths                â€” flat list of normalized ops
 *     - export_step                  â€” emit STEP AP242 to outputPath
 *   Mock-layer passthrough (no open required)
 *     - mock_geometry / mock_operation_tree / mock_toolpaths
 *     - mock_fingerprint / mock_all_fingerprints
 *
 * Design notes:
 *   - No per-bridge actions â€” callers never pick the bridge manually. The
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
  // CAD-INPUT-MS0 â€” universal DXF parse + write (closes 1,445-file gap)
  "dxf_parse",
  "dxf_write_polygons",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC11 — pure-JS STL write (closes STL gap)
  "stl_write_polygons",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC07: IGES import
  "iges_parse",
  "iges_extract_geometry",
  "iges_summary",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC08: format conversion matrix
  "cad_classify_conversion",
  "cad_best_path",
  "cad_sniff_format",
  "cad_probe_validity",
  "cad_list_conversion_edges",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC09: feature classifier
  "cad_classify_feature",
  "cad_classify_batch",
  "cad_group_by_family",
  "cad_dominant_family",
  // U-CUIX-P0-19 â€” AI-control surface: route master-AI intent through
  // ICADCodeGenerator adapters (FreeCAD/Fusion360/Inventor/Mastercam today;
  // HyperCAD-S + SolidWorks land in P0-17/P0-18). Closes the "4 adapters
  // with 557 tests but zero dispatcher wiring" orphan flagged by CAD-UIX-MS0
  // round 1 scrutiny finding F4.
  "list_systems",
  "list_capabilities",
  "build_script",
  "execute_script",
  "validate_script",
  // U-CUIX-P0-20 â€” CADOperationPlanner intent â†’ CADOperation[] surface
  "plan_ops",
  // U-CUIX-P0-21 â€” ComplexPartPlanner: multi-body + multi-configuration
  "plan_complex_part",
  // U-CUIX-P0-22 â€” AssemblyPlanner: components + mates + BOM + drawings
  "plan_assembly",
  // U-CADC-AI01 â€” MasterCADControlBrain: full orchestration facade
  "orchestrate_intent",
  // U-CADC-AI02 â€” CADIntentDecomposer: NL â†’ structured intent
  "decompose_intent",
  // U-CADC-AI04 â€” CADAIStateMachine: observable FSM for multi-step flows
  "fsm_open",
  "fsm_close",
  "fsm_dispatch",
  "fsm_snapshot",
  "fsm_log",
  "fsm_list",
  "fsm_allowed_events",
  // U-CADC13 â€” BladeProfileLibrary: NACA 4/5-digit airfoil generation
  "airfoil_list",
  "airfoil_query",
  "airfoil_get",
  "airfoil_interpolate",
  // U-CADC28 â€” CADFeatureMemoryEngine: persistent feature pattern memory + similarity search
  "feature_memory_record",
  "feature_memory_query",
  "feature_memory_lookup",
  "feature_memory_stats",
  // U-CGT03 â€” CADToSTEPPipelineEngine: full CADâ†’STEP orchestration + AP214/AP242 validation
  "step_pipeline_run",
  "step_pipeline_batch",
  "step_validate",
  "step_pipeline_strategies",
  "step_pipeline_supported",
  // U-CGT04 â€” GroundTruthFeatureTreeExtractor: canonical feature tree extraction across CAD formats
  "feature_tree_extract",
  "feature_tree_validate",
  "feature_tree_recompute_signature",
  "feature_tree_canonical_types",
  "feature_tree_source_formats",
  // U-CGT01 â€” FCStdNativeParserEngine: native FreeCAD .FCStd parsing (ZIP+XML)
  "fcstd_parse",
  // U-CGT02 â€” F3DSQLiteParserEngine: native Fusion .f3d / .f3z parsing (ZIP+SQLite)
  "f3d_parse",
  "f3z_parse",
  // U-CGT05 â€” DimensionalSignatureEngine: STEP â†’ SI dimensional fingerprint
  "dim_signature_extract",
  "dim_signature_extract_text",
  "dim_signature_compare",
  "dim_signature_validate",
  "dim_signature_recompute",
  // U-CGT08 â€” GroundTruthRegistryEngine: indexed corpus query
  "gt_registry_build_index",
  "gt_registry_find_file_id",
  "gt_registry_find_customer",
  "gt_registry_find_machine",
  "gt_registry_find_complexity",
  "gt_registry_find_format",
  "gt_registry_query",
  "gt_registry_stats",
  "gt_registry_dump",
  "gt_registry_load",
  // U-CGT09 â€” GroundTruthValidationEngine: corpus integrity gate + quarantine
  "gt_validate_bundle",
  "gt_validate_corpus",
  "gt_export_quarantine",
  "gt_validate_report",
  "gt_list_issue_codes",
  // U-CADC01..U-CADC04 â€” UniversalCADIndexEngine: master CAD-file registry
  "universal_cad_index",
  "universal_cad_load",
  "universal_cad_coverage",
  "universal_cad_has_coverage",
  "universal_cad_target_formats",
  "universal_cad_root_paths",
  // U-CGT06 â€” CADScreenshotCapturer: 6 canonical views via OCCT (mock fallback)
  "screenshot_capture_views",
  "screenshot_list_views",
  "screenshot_validate",
  "screenshot_recompute_signature",
  // U-CGT07 â€” GroundTruthBatchExtractor: 4-stage pipeline across 20K corpus
  "batch_extract",
  "batch_coverage_report",
  "batch_validate",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC10: CAD knowledge graph
  "cad_graph_build",
  "cad_graph_detect_cycles",
  "cad_graph_find_orphans",
  "cad_graph_ancestors",
  "cad_graph_descendants",
  "cad_graph_to_jsonld",
  "cad_assembly_add_node",
  "cad_assembly_add_ref",
  "cad_assembly_remove_node",
  "cad_assembly_get_children",
  "cad_assembly_get_parents",
  "cad_assembly_descendants",
  "cad_assembly_ancestors",
  "cad_assembly_broken_refs",
  "cad_assembly_heal",
  "cad_assembly_detect_cycles",
  "cad_assembly_impact",
  "cad_assembly_list_nodes",
  "cad_assembly_list_edges",
  "cad_assembly_snapshot",
  "cad_assembly_load",
  "cad_assembly_persist",
  "cad_cas_load",
  "cad_cas_persist",
  "cad_cas_upsert",
  "cad_cas_get",
  "cad_cas_get_by_path",
  "cad_cas_ingest",
  "cad_cas_verify",
  "cad_cas_detect_ip_leaks",
  "cad_cas_delete",
  "cad_cas_rebuild_meta",
  "cad_cas_list",
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
    `CAD automation router â€” unified access to SolidWorks/Inventor/FreeCAD/Mastercam/Fusion 360/hyperMILL via a single action surface. Supported formats: .sldprt .sldasm .ipt .iam .FCStd .FCStd1 .mcam .mcx .mcx-8 .f3d .f3z .hmc.
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
          /* normalizer unavailable â€” proceed with raw params */
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
            // CAD-INPUT-MS0 â€” parse DXF content into Polygon2D[] via DXFParserEngine.
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
            // CAD-INPUT-MS0 â€” write Polygon2D[] to DXF R12 ASCII.
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
          case "stl_write_polygons": {
            // CAD-UNIVERSAL-CONTROL-MS0/U-CUC11 — write Polygon2D[] to STL (ASCII or binary).
            const { stlWriterEngine } = await import("../../engines/StlWriterEngine.js");
            result = stlWriterEngine.writePolygonsToStl(
              params["polygons"] as Parameters<typeof stlWriterEngine.writePolygonsToStl>[0],
              {
                thickness: params["thickness"] as number | undefined,
                format: params["format"] as "ascii" | "binary" | undefined,
                solidName: params["solid_name"] as string | undefined,
                precision: params["precision"] as number | undefined,
              },
            );
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC07: IGES import via IGESImportEngine â”€â”€
          case "iges_parse": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_parse requires non-empty 'content' string");
            }
            const parsed = engine.parseIGES({ content });
            result = {
              entity_count: parsed.entities.length,
              entities: parsed.entities,
              global: parsed.global,
              summary: parsed.summary,
              source: "IGESImportEngine.parseIGES",
            };
            break;
          }
          case "iges_extract_geometry": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_extract_geometry requires non-empty 'content' string");
            }
            const filter = params["filter"] as { types?: string[] } | undefined;
            const geometry = engine.extractGeometry({ content, filter });
            result = {
              ...geometry,
              source: "IGESImportEngine.extractGeometry",
            };
            break;
          }
          case "iges_summary": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_summary requires non-empty 'content' string");
            }
            const summary = engine.getSummary({ content });
            result = {
              ...summary,
              source: "IGESImportEngine.getSummary",
            };
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC08: CAD format conversion matrix â”€â”€
          case "cad_classify_conversion": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const from = params["from"] as string;
            const to = params["to"] as string;
            if (!from || !to) {
              throw new Error("cad_classify_conversion requires 'from' and 'to' format strings");
            }
            result = {
              ...cadFormatConversionMatrixEngine.classifyConversion(from, to),
              source: "cadFormatConversionMatrixEngine.classifyConversion",
            };
            break;
          }
          case "cad_best_path": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const from = params["from"] as string;
            const to = params["to"] as string;
            if (!from || !to) {
              throw new Error("cad_best_path requires 'from' and 'to' format strings");
            }
            const pathResult = cadFormatConversionMatrixEngine.bestPath(from, to);
            result = pathResult
              ? { ...pathResult, source: "cadFormatConversionMatrixEngine.bestPath" }
              : { path: null, compositeScore: 0, source: "cadFormatConversionMatrixEngine.bestPath" };
            break;
          }
          case "cad_sniff_format": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const hex = params["hex"] as string | undefined;
            const bytes = params["bytes"] as number[] | undefined;
            if (!hex && !bytes) {
              throw new Error("cad_sniff_format requires 'hex' string or 'bytes' array");
            }
            const input = hex ?? new Uint8Array(bytes!);
            const format = cadFormatConversionMatrixEngine.sniffFormat(input);
            result = {
              format: format ?? null,
              source: "cadFormatConversionMatrixEngine.sniffFormat",
            };
            break;
          }
          case "cad_probe_validity": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const filename = params["filename"] as string;
            const hex = params["hex"] as string | undefined;
            const bytes = params["bytes"] as number[] | undefined;
            if (!filename) {
              throw new Error("cad_probe_validity requires 'filename'");
            }
            if (!hex && !bytes) {
              throw new Error("cad_probe_validity requires 'hex' string or 'bytes' array");
            }
            const input = hex ?? new Uint8Array(bytes!);
            result = {
              ...cadFormatConversionMatrixEngine.probeValidity(filename, input),
              source: "cadFormatConversionMatrixEngine.probeValidity",
            };
            break;
          }
          case "cad_list_conversion_edges": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const edges = cadFormatConversionMatrixEngine.listEdges();
            result = {
              edges,
              count: edges.length,
              source: "cadFormatConversionMatrixEngine.listEdges",
            };
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC09: feature classifier â”€â”€
          case "cad_classify_feature": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const feature = params["feature"] as Parameters<typeof engine.classify>[0];
            if (!feature) {
              throw new Error("cad_classify_feature requires 'feature' object");
            }
            result = {
              ...engine.classify(feature),
              source: "CADFeatureClassifierEngine.classify",
            };
            break;
          }
          case "cad_classify_batch": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const features = params["features"] as Parameters<typeof engine.classifyBatch>[0];
            if (!Array.isArray(features)) {
              throw new Error("cad_classify_batch requires 'features' array");
            }
            result = {
              ...engine.classifyBatch(features),
              source: "CADFeatureClassifierEngine.classifyBatch",
            };
            break;
          }
          case "cad_group_by_family": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const classifications = params["classifications"] as Parameters<typeof engine.groupByFamily>[0];
            if (!Array.isArray(classifications)) {
              throw new Error("cad_group_by_family requires 'classifications' array");
            }
            result = {
              groups: engine.groupByFamily(classifications),
              source: "CADFeatureClassifierEngine.groupByFamily",
            };
            break;
          }
          case "cad_dominant_family": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const classifications = params["classifications"] as Parameters<typeof engine.suggestDominantFamily>[0];
            if (!Array.isArray(classifications)) {
              throw new Error("cad_dominant_family requires 'classifications' array");
            }
            result = {
              ...engine.suggestDominantFamily(classifications),
              source: "CADFeatureClassifierEngine.suggestDominantFamily",
            };
            break;
          }
          // â”€â”€ U-CUIX-P0-19: AI-control surface via CADAdapterRegistry â”€â”€
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
            // Serialize Map â†’ [key, value][] so the script crosses the MCP wire cleanly.
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
            // U-CUIX-P0-20 â€” structured intent â†’ CADOperation[] via planner.
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
            // U-CADC-AI01 â€” full chain: intent â†’ select_cad â†’ plan â†’ build â†’ (execute) â†’ validate
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
            // U-CUIX-P0-22 â€” components + mates + BOM + drawings â†’ plan.
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
            // U-CADC-AI02 â€” parse NL into structured CAD intent for AI01.
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
            // U-CUIX-P0-21 â€” multi-body + multi-config ComplexPartIntent â†’ plan.
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
            // U-CGT04 â€” Extract canonical feature tree from a CAD file (mock or live).
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
            // U-CGT04 â€” Validate a candidate tree against the canonical Zod schema.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = groundTruthFeatureTreeExtractor.validate(params["candidate"]);
            break;
          }
          case "feature_tree_recompute_signature": {
            // U-CGT04 â€” Recompute canonical signature for a tree (post-edit).
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
            // U-CGT04 â€” Read-only canonical feature-type vocabulary.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            const types = groundTruthFeatureTreeExtractor.listCanonicalTypes();
            result = { count: types.length, types };
            break;
          }
          case "feature_tree_source_formats": {
            // U-CGT04 â€” Source format vocabulary (file extensions the extractor recognizes).
            const { SOURCE_FORMATS } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = { count: SOURCE_FORMATS.length, formats: SOURCE_FORMATS };
            break;
          }
          case "fcstd_parse": {
            // U-CGT01 â€” FreeCAD native .FCStd parser (no FreeCAD installation needed).
            const { fcStdNativeParserEngine } = await import(
              "../../engines/FCStdNativeParserEngine.js"
            );
            result = await fcStdNativeParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3d_parse": {
            // U-CGT02 â€” Fusion 360 native .f3d parser (ZIP+SQLite, no Fusion install).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            result = await f3dSqliteParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3z_parse": {
            // U-CGT02 â€” Fusion 360 .f3z multi-document archive (returns array).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            const arr = await f3dSqliteParserEngine.parseF3Z(
              String(params["filePath"] ?? ""),
            );
            result = { count: arr.length, documents: arr };
            break;
          }
          case "dim_signature_extract": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = await dimensionalSignatureEngine.extractFromStep(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "dim_signature_extract_text": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = dimensionalSignatureEngine.extractFromStepText(
              String(params["stepText"] ?? ""),
              String(params["sourceFile"] ?? ""),
            );
            break;
          }
          case "dim_signature_compare": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            try {
              result = dimensionalSignatureEngine.compare(
                params["a"] as Parameters<typeof dimensionalSignatureEngine.compare>[0],
                params["b"] as Parameters<typeof dimensionalSignatureEngine.compare>[1],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "dim_signature_validate": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = dimensionalSignatureEngine.validate(params["candidate"]);
            break;
          }
          case "dim_signature_recompute": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            try {
              const sig = dimensionalSignatureEngine.recomputeSignature(
                params["signature"] as Parameters<typeof dimensionalSignatureEngine.recomputeSignature>[0],
              );
              result = { signature: sig };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "gt_registry_build_index": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const stats = groundTruthRegistryEngine.buildIndex(
              String(params["outputRoot"] ?? ""),
              { includeNonOk: params["includeNonOk"] === true },
            );
            result = { stats, total: groundTruthRegistryEngine.size() };
            break;
          }
          case "gt_registry_find_file_id": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByFileId(
              String(params["fileId"] ?? ""),
            );
            break;
          }
          case "gt_registry_find_customer": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByCustomer(
              String(params["name"] ?? ""),
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByCustomer>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_machine": {
            const { groundTruthRegistryEngine, MACHINE_CATEGORIES } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const cat = params["category"] as (typeof MACHINE_CATEGORIES)[number];
            result = groundTruthRegistryEngine.findByMachineCategory(
              cat,
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByMachineCategory>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_complexity": {
            const { groundTruthRegistryEngine, COMPLEXITY_TIERS } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const tier = params["tier"] as (typeof COMPLEXITY_TIERS)[number];
            result = groundTruthRegistryEngine.findByComplexity(
              tier,
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByComplexity>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_format": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByFormat(
              String(params["format"] ?? ""),
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByFormat>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_query": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.query(
              (params["filter"] as Parameters<typeof groundTruthRegistryEngine.query>[0]) ?? {},
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.query>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_stats": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = {
              size: groundTruthRegistryEngine.size(),
              stats: groundTruthRegistryEngine.getStats(),
            };
            break;
          }
          case "gt_registry_dump": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            await groundTruthRegistryEngine.dumpManifest(
              String(params["filePath"] ?? ""),
            );
            result = { ok: true, filePath: String(params["filePath"] ?? "") };
            break;
          }
          case "gt_registry_load": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = await groundTruthRegistryEngine.loadManifest(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "gt_validate_bundle": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validateBundle(
              String(params["bundleDir"] ?? ""),
              String(params["fileId"] ?? ""),
              {
                skipScreenshots: params["skipScreenshots"] === true,
                quarantineFailedStatus:
                  params["quarantineFailedStatus"] === undefined
                    ? true
                    : params["quarantineFailedStatus"] === true,
                quarantinePartialStatus:
                  params["quarantinePartialStatus"] === true,
              },
            );
            break;
          }
          case "gt_validate_corpus": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validateCorpus(
              String(params["outputRoot"] ?? ""),
              {
                skipScreenshots: params["skipScreenshots"] === true,
                quarantineFailedStatus:
                  params["quarantineFailedStatus"] === undefined
                    ? true
                    : params["quarantineFailedStatus"] === true,
                quarantinePartialStatus:
                  params["quarantinePartialStatus"] === true,
                ...(typeof params["limit"] === "number"
                  ? { limit: params["limit"] as number }
                  : {}),
              },
            );
            break;
          }
          case "gt_export_quarantine": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            await groundTruthValidationEngine.exportQuarantine(
              params["report"] as Parameters<typeof groundTruthValidationEngine.exportQuarantine>[0],
              String(params["filePath"] ?? ""),
            );
            result = { ok: true, filePath: String(params["filePath"] ?? "") };
            break;
          }
          case "gt_validate_report": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validate(params["candidate"]);
            break;
          }
          case "gt_list_issue_codes": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            const codes = groundTruthValidationEngine.listIssueCodes();
            result = { count: codes.length, codes };
            break;
          }
          case "universal_cad_index": {
            // U-CADC01 â€” Run full corpus scan; persist master-index.json by default.
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            const indexOpts: Record<string, unknown> = {};
            if (Array.isArray(params["rootPaths"])) indexOpts["rootPaths"] = params["rootPaths"];
            if (typeof params["outputPath"] === "string") indexOpts["outputPath"] = params["outputPath"];
            if (Array.isArray(params["extensions"])) indexOpts["extensions"] = params["extensions"];
            if (typeof params["maxDepth"] === "number") indexOpts["maxDepth"] = params["maxDepth"];
            if (typeof params["persist"] === "boolean") indexOpts["persist"] = params["persist"];
            result = await universalCADIndexEngine.index(
              indexOpts as Parameters<typeof universalCADIndexEngine.index>[0],
            );
            break;
          }
          case "universal_cad_load": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            const loaded = universalCADIndexEngine.load(
              typeof params["outputPath"] === "string"
                ? (params["outputPath"] as string)
                : undefined,
            );
            result = loaded ?? { error: "master index not found or invalid" };
            break;
          }
          case "universal_cad_coverage": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            try {
              result = universalCADIndexEngine.computeCoverage(
                params["index"] as Parameters<typeof universalCADIndexEngine.computeCoverage>[0],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "universal_cad_has_coverage": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            try {
              const ok = universalCADIndexEngine.hasUniversalCoverage(
                params["index"] as Parameters<typeof universalCADIndexEngine.hasUniversalCoverage>[0],
                typeof params["minCoveragePct"] === "number"
                  ? (params["minCoveragePct"] as number)
                  : 1.0,
              );
              result = { hasCoverage: ok };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "universal_cad_target_formats": {
            const { TARGET_CAD_FORMATS } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            result = { count: TARGET_CAD_FORMATS.length, formats: TARGET_CAD_FORMATS };
            break;
          }
          case "universal_cad_root_paths": {
            const { UNIVERSAL_ROOT_PATHS } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            result = { count: UNIVERSAL_ROOT_PATHS.length, paths: UNIVERSAL_ROOT_PATHS };
            break;
          }
          // U-CGT06 â€” CADScreenshotCapturer wiring
          case "screenshot_capture_views": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = await cadScreenshotCapturer.captureViews(
              String(params["stepPath"] ?? ""),
              {
                fileId: String(params["fileId"] ?? ""),
                outputRoot: String(params["outputRoot"] ?? ""),
                views: params["views"] as readonly string[] | undefined,
                overwrite: params["overwrite"] as boolean | undefined,
                forceMock: params["forceMock"] as boolean | undefined,
              } as never,
            );
            break;
          }
          case "screenshot_list_views": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = { views: cadScreenshotCapturer.listCanonicalViews() };
            break;
          }
          case "screenshot_validate": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = cadScreenshotCapturer.validate(params["candidate"]);
            break;
          }
          case "screenshot_recompute_signature": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = {
              signature: cadScreenshotCapturer.recomputeSignature(
                params["result"] as never,
              ),
            };
            break;
          }
          // U-CGT07 â€” GroundTruthBatchExtractor wiring
          case "batch_extract": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = await groundTruthBatchExtractor.extractBatch(
              params["tasks"] as never,
              {
                outputRoot: String(params["outputRoot"] ?? ""),
                runId: params["runId"] as string | undefined,
                maxConcurrency: params["maxConcurrency"] as number | undefined,
                checkpointEvery: params["checkpointEvery"] as number | undefined,
                skipExisting: params["skipExisting"] as boolean | undefined,
                force: params["force"] as boolean | undefined,
              } as never,
            );
            break;
          }
          case "batch_coverage_report": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = groundTruthBatchExtractor.generateCoverageReport(
              params["results"] as never,
            );
            break;
          }
          case "batch_validate": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = groundTruthBatchExtractor.validate(params["candidate"]);
            break;
          }
          // ── CAD-UNIVERSAL-CONTROL-MS0/U-CUC10: CAD knowledge graph via CADKnowledgeGraphEngine ──
          case "cad_graph_build": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const operations = params["operations"] as Array<Record<string, unknown>>;
            if (!Array.isArray(operations) || operations.length === 0) {
              throw new Error("cad_graph_build requires non-empty 'operations' array");
            }
            const graph = engine.build(operations as Parameters<typeof engine.build>[0]);
            result = {
              node_count: graph.nodes.length,
              edge_count: graph.edges.length,
              nodes: graph.nodes,
              edges: graph.edges,
              source: "CADKnowledgeGraphEngine.build",
            };
            break;
          }
          case "cad_graph_detect_cycles": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_detect_cycles requires 'graph' with nodes and edges arrays");
            }
            const report = engine.detectCycles(graph as Parameters<typeof engine.detectCycles>[0]);
            result = {
              ...report,
              source: "CADKnowledgeGraphEngine.detectCycles",
            };
            break;
          }
          case "cad_graph_find_orphans": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_find_orphans requires 'graph' with nodes and edges arrays");
            }
            const report = engine.findOrphans(graph as Parameters<typeof engine.findOrphans>[0]);
            result = {
              ...report,
              source: "CADKnowledgeGraphEngine.findOrphans",
            };
            break;
          }
          case "cad_graph_ancestors": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            const nodeId = params["node_id"] as string;
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_ancestors requires 'graph' with nodes and edges arrays");
            }
            if (typeof nodeId !== "string" || nodeId.length === 0) {
              throw new Error("cad_graph_ancestors requires non-empty 'node_id' string");
            }
            const ancestors = engine.ancestors(graph as Parameters<typeof engine.ancestors>[0], nodeId);
            result = {
              node_id: nodeId,
              ancestors,
              count: ancestors.length,
              source: "CADKnowledgeGraphEngine.ancestors",
            };
            break;
          }
          case "cad_graph_descendants": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            const nodeId = params["node_id"] as string;
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_descendants requires 'graph' with nodes and edges arrays");
            }
            if (typeof nodeId !== "string" || nodeId.length === 0) {
              throw new Error("cad_graph_descendants requires non-empty 'node_id' string");
            }
            const descendants = engine.descendants(graph as Parameters<typeof engine.descendants>[0], nodeId);
            result = {
              node_id: nodeId,
              descendants,
              count: descendants.length,
              source: "CADKnowledgeGraphEngine.descendants",
            };
            break;
          }
          case "cad_graph_to_jsonld": {
            const { CADKnowledgeGraphEngine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const engine = new CADKnowledgeGraphEngine();
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_to_jsonld requires 'graph' with nodes and edges arrays");
            }
            const jsonld = engine.toJsonLd(graph as Parameters<typeof engine.toJsonLd>[0]);
            result = {
              ...jsonld,
              source: "CADKnowledgeGraphEngine.toJsonLd",
            };
            break;
          }
          case "cad_assembly_add_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            const componentType = params["component_type"] as string;
            if (!partId) {
              throw new Error("cad_assembly_add_node requires 'part_id' string");
            }
            const node = engine.addNode({
              partId,
              componentType: componentType as Parameters<typeof engine.addNode>[0]["componentType"],
              name: (params["name"] as string) || partId,
              paths: (params["paths"] as string[]) || [],
              contentHash: params["content_hash"] as string | undefined,
              tags: (params["tags"] as string[]) || [],
              customer: (params["customer"] as string) || "UNKNOWN",
            });
            engine.persist();
            result = { node, source: "CADAssemblyGraphEngine.addNode" };
            break;
          }
          case "cad_assembly_add_ref": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const parentId = params["parent_id"] as string;
            const childId = params["child_id"] as string;
            if (!parentId || !childId) {
              throw new Error("cad_assembly_add_ref requires 'parent_id' and 'child_id' strings");
            }
            const ref = engine.addReference({
              parentId,
              childId,
              quantity: (params["quantity"] as number) || 1,
              childContentHash: params["child_content_hash"] as string | undefined,
            });
            engine.persist();
            result = { reference: ref, source: "CADAssemblyGraphEngine.addReference" };
            break;
          }
          case "cad_assembly_remove_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_remove_node requires 'part_id' string");
            }
            const removed = engine.removeNode(partId);
            engine.persist();
            result = { removed, partId, source: "CADAssemblyGraphEngine.removeNode" };
            break;
          }
          case "cad_assembly_get_children": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_children requires 'part_id' string");
            }
            const children = engine.getChildren(partId);
            result = { children, count: children.length, source: "CADAssemblyGraphEngine.getChildren" };
            break;
          }
          case "cad_assembly_get_parents": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_parents requires 'part_id' string");
            }
            const parents = engine.getParents(partId);
            result = { parents, count: parents.length, source: "CADAssemblyGraphEngine.getParents" };
            break;
          }
          case "cad_assembly_descendants": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_descendants requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const descendants = engine.getDescendants(partId, maxDepth);
            result = { descendants, count: descendants.length, source: "CADAssemblyGraphEngine.getDescendants" };
            break;
          }
          case "cad_assembly_ancestors": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_ancestors requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const ancestors = engine.getAncestors(partId, maxDepth);
            result = { ancestors, count: ancestors.length, source: "CADAssemblyGraphEngine.getAncestors" };
            break;
          }
          case "cad_assembly_broken_refs": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const broken = engine.findBrokenReferences();
            result = { broken, count: broken.length, source: "CADAssemblyGraphEngine.findBrokenReferences" };
            break;
          }
          case "cad_assembly_heal": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const healedCount = engine.healByContentHash();
            engine.persist();
            result = { healedCount, source: "CADAssemblyGraphEngine.healByContentHash" };
            break;
          }
          case "cad_assembly_detect_cycles": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const cycles = engine.detectCycles();
            result = { cycles, hasCycles: cycles.length > 0, count: cycles.length, source: "CADAssemblyGraphEngine.detectCycles" };
            break;
          }
          case "cad_assembly_impact": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_impact requires 'part_id' string");
            }
            const impact = engine.impactAnalysis(partId);
            result = { ...impact, source: "CADAssemblyGraphEngine.impactAnalysis" };
            break;
          }
          case "cad_assembly_list_nodes": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const nodes = engine.listNodes();
            result = { nodes, count: nodes.length, source: "CADAssemblyGraphEngine.listNodes" };
            break;
          }
          case "cad_assembly_list_edges": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const edges = engine.listEdges();
            result = { edges, count: edges.length, source: "CADAssemblyGraphEngine.listEdges" };
            break;
          }
          case "cad_assembly_snapshot": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const snapshot = engine.snapshot();
            result = { snapshot, source: "CADAssemblyGraphEngine.snapshot" };
            break;
          }
          case "cad_assembly_load": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            result = { loaded: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.load" };
            break;
          }
          case "cad_assembly_persist": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.persist" };
            break;
          }
          case "cad_cas_load": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            result = { registry, entryCount: Object.keys(registry.entries).length, source: "CADContentAddressableStoreEngine.load" };
            break;
          }
          case "cad_cas_persist": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, source: "CADContentAddressableStoreEngine.persist" };
            break;
          }
          case "cad_cas_upsert": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_upsert requires 'content_hash' string");
            }
            const entry = engine.upsert({
              contentHash,
              paths: (params["paths"] as string[]) || [],
              size: (params["size"] as number) || 0,
              customer: (params["customer"] as string) || "UNKNOWN",
              source: (params["source"] as "import" | "local-scan" | "upload" | "migration") || "local-scan",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              chunks: params["chunks"] as Array<{ offset: number; length: number; blake3: string }> | undefined,
            });
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.upsert" };
            break;
          }
          case "cad_cas_get": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_get requires 'content_hash' string");
            }
            const entry = engine.get(contentHash);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.get" };
            break;
          }
          case "cad_cas_get_by_path": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const path = params["path"] as string;
            if (!path) {
              throw new Error("cad_cas_get_by_path requires 'path' string");
            }
            const entry = engine.getByPath(path);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.getByPath" };
            break;
          }
          case "cad_cas_ingest": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const path = params["path"] as string;
            if (!path) {
              throw new Error("cad_cas_ingest requires 'path' string");
            }
            const entry = engine.ingest(path);
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.ingest" };
            break;
          }
          case "cad_cas_verify": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_verify requires 'content_hash' string");
            }
            const verification = engine.verifyIntegrity(contentHash);
            result = { ...verification, source: "CADContentAddressableStoreEngine.verifyIntegrity" };
            break;
          }
          case "cad_cas_detect_ip_leaks": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const leaks = engine.detectIPLeaks();
            result = { leaks, count: leaks.length, source: "CADContentAddressableStoreEngine.detectIPLeaks" };
            break;
          }
          case "cad_cas_delete": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_delete requires 'content_hash' string");
            }
            const deleted = engine.delete(contentHash);
            engine.persist();
            result = { deleted, contentHash, source: "CADContentAddressableStoreEngine.delete" };
            break;
          }
          case "cad_cas_rebuild_meta": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.rebuildMeta();
            engine.persist();
            result = { rebuilt: true, source: "CADContentAddressableStoreEngine.rebuildMeta" };
            break;
          }
          case "cad_cas_list": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            const entries = Object.values(registry.entries);
            result = { entries, count: entries.length, source: "CADContentAddressableStoreEngine.list" };
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
