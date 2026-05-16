/**
 * Data Access Dispatcher - Consolidates data tools → 1 dispatcher (54 actions)
 * Actions: material_get/search/compare, machine_get/search/capabilities,
 *          tool_get/search/recommend, alarm_decode/search/fix, formula_get/calculate,
 *          coolant_get/search/recommend, coating_get/search/recommend,
 *          catalog_machine_lookup/stats, catalog_tool_lookup,
 *          catalog_holder_lookup/recommend, catalog_workholding_lookup/stats
 */

import { z } from "zod";
import { registryManager } from "../../registries/index.js";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { validateMaterialSanity } from "../../validation/materialSanity.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_DATA_SCHEMAS } from "../../schemas/dataActionSchemas.js";
import { toolHolderDatabaseEngine } from "../../engines/ToolHolderDatabaseEngine.js";
import { machineConfigDatabaseEngine } from "../../engines/MachineConfigDatabaseEngine.js";
import { surfaceFinishDatabaseEngine } from "../../engines/SurfaceFinishDatabaseEngine.js";
import { EXTENDED_MACHINE_CATALOG, toCatalogProfiles, getCatalogStats } from "../../data/machine-profiles-catalog.js";
import { SGS_COATINGS, SGS_END_MILL_SERIES, SGS_SPEED_FEED_ZR, SGS_QUICK_SPEED_FEED, SGS_CATALOG_META } from "../../data/sgs-tool-catalog.js";
import { BIG_DAISHOWA_HOLDERS, findHolders as findDaishowaHolders, recommendHolder as recommendDaishowaHolder, getAvailableTapers } from "../../data/big-daishowa-holders.js";
import { ORANGE_VISE_SPECS, findVise, findVisesByJawWidth, findVisesByOpening, findSoftJaws, getCatalogSummary as getWorkholdingSummary } from "../../data/workholding-catalog.js";

/** Registry results have dynamic fields — use this instead of bare `as any` for property access */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegistryRecord = Record<string, any>;

const DataDispatcherSchema = z.object({
  action: z.enum([
    "material_get", "material_search", "material_compare",
    "machine_get", "machine_search", "machine_capabilities",
    "tool_get", "tool_search", "tool_recommend", "tool_facets",
    "tool_holder_catalog_search", "tool_holder_registry_query",
    "tool_geometry_select", "tool_coating_select", "tool_assembly_build",
    "alarm_decode", "alarm_search", "alarm_fix",
    "formula_get", "formula_calculate",
    "cross_query", "machine_toolholder_match", "alarm_diagnose",
    "speed_feed_calc", "tool_compare", "material_substitute",
    "coolant_search", "coolant_recommend", "coolant_get",
    "coating_search", "coating_recommend", "coating_get",
    "cross_lookup", "dsl_lookup", "database_list", "database_search",
    "workholding_get", "workholding_search", "insert_get", "insert_search",
    "holder_get", "holder_search", "holder_recommend", "holder_types",
    "machine_config_get", "machine_config_search",
    "machine_config_smoothing", "machine_config_list",
    "surface_finish_grade", "surface_finish_parse",
    "surface_finish_convert", "surface_finish_recommend",
    "catalog_machine_lookup", "catalog_machine_stats",
    "catalog_tool_lookup",
    "catalog_holder_lookup", "catalog_holder_recommend",
    "catalog_workholding_lookup", "catalog_workholding_stats",
    "chart_pareto", "chart_waterfall", "chart_control",
    "chart_stability_lobe", "chart_histogram",
    "benchmark_run", "benchmark_report", "benchmark_scorecard",
    // BOX Data ingestion engines
    "alarm_fix_lookup", "alarm_fix_search", "alarm_fix_summary",
    "shop_tool_list", "shop_tool_search", "shop_tool_speed_feed", "shop_tool_summary",
    "mfr_catalog_list", "mfr_catalog_search", "mfr_catalog_gaps", "mfr_catalog_summary",
    "raw_tooling_analyze", "raw_tooling_summary",
    // Tool enrichment (SQ3-1-TOOL)
    "tool_enrich_audit", "tool_enrich_batch", "tool_enrich_validate",
    "tool_enrich_holder_matrix", "tool_enrich_summary",
    // BOX-MS0: Program census, parsing, and database
    "box_census_scan", "box_census_quick_count", "box_census_section",
    "box_parse_okuma", "box_parse_haas", "box_parse_hurco", "box_parse_rokuroku",
    "box_cad_index", "box_post_analyze",
    "box_db_add", "box_db_query", "box_db_stats", "box_db_speed_feed_patterns",
    // BOX-MS1: Pattern mining engines
    "box_mine_speed_feed", "box_mine_speed_feed_compare",
    "box_mine_tool_patterns", "box_mine_operation_sequences", "box_check_operation_order",
    // BOX-MS1: Okuma dialect knowledge
    "box_okuma_dialect_search", "box_okuma_dialect_lookup_gcode", "box_okuma_dialect_lookup_mcode",
    "box_okuma_dialect_diffs", "box_okuma_dialect_analyze", "box_okuma_dialect_stats",
    // BOX-MS1: Macro + safety pattern mining
    "box_mine_macro_patterns", "box_mine_safety_patterns", "box_check_program_safety",
    // BOX-MS1: Knowledge integration
    "box_integrate_knowledge",
    // BOX-MS2: Parametric macro conversion
    "box_generate_macro_header", "box_generate_macro_header_minimal",
    "box_get_standard_var",
    "box_calc_auto_speed_feed", "box_calc_rpm", "box_calc_finish_feed",
    "box_calc_peck_schedule", "box_scale_boring_bar_feed",
    // BOX-MS2: Tool substitution
    "box_substitute_boring_bar", "box_substitute_drill", "box_substitute_insert",
    // BOX-MS2: Program macro converter
    "box_convert_to_macro", "box_scan_dimensions", "box_scan_speed_feeds",
    // BOX-MS2: Macro validation
    "box_validate_macro", "box_evaluate_macro_vars",
    // BOX-MS2: Batch conversion
    "box_batch_convert_macros", "box_convert_single_macro",
    // BOX-MS3: Physics optimization
    "box_resolve_material", "box_resolve_tools", "box_optimize_program",
    "box_safety_check", "box_generate_opt_report", "box_batch_optimize",
    // BOX-MS4: Controller knowledge & post processor training
    "box_controller_db", "box_controller_search", "box_controller_lookup_gcode",
    "box_controller_lookup_mcode", "box_controller_compare_dialects",
    "box_post_trainer", "box_fusion_post_sync",
    // BOX-MS5: Gap actions — validation, extraction, capability, calibration
    "box_validate_program", "box_extract_operations",
    "box_controller_capability", "box_controller_safety_codes",
    "box_calibrate_from_shop", "box_full_program_audit",
    // BOX-MS6: Fusion 360 cloud extraction
    "box_fusion_connect", "box_fusion_list_projects", "box_fusion_crawl_project",
    "box_fusion_extract_cam", "box_fusion_extract_tools", "box_fusion_setup_doc",
    // BOX-MS7: Calculator page — program upload + tool callout + auto S/F
    "box_upload_analyze", "box_tool_callouts", "box_program_memory_save",
    "box_program_memory_recall", "box_program_memory_defaults", "box_program_memory_stats",
    "box_program_memory_link_print",
    // BOX-MS8: Wire EDM parsing + mill pattern mining
    "box_parse_wedm", "box_mine_mill_patterns",
    // QCMG-WIRE-MS0: 14 unwired quality/controller/material/grinding engines
    "cmm_history_add", "cmm_history_trend", "cmm_history_features", "cmm_history_alerts", "cmm_history_stats",
    "cmm_import_data", "cmm_import_get", "cmm_import_list", "cmm_import_formats", "cmm_import_validate",
    "spc_feedback_evaluate",
    "controller_knowledge_get", "controller_knowledge_list", "controller_knowledge_compare",
    "hook_controller_compute", "hook_controller_get_setpoint", "hook_controller_set_setpoint", "hook_controller_gains",
    "fusion_material_find", "fusion_material_iso", "fusion_material_cutting", "fusion_material_list_iso",
    "material_cert_register", "material_cert_assign", "material_cert_link_program", "material_cert_record_inspection",
    "material_db_bridge_query", "material_db_bridge_get", "material_db_bridge_by_type",
    "material_db_get", "material_db_search", "material_db_by_category", "material_db_kienzle",
    "material_stock_create", "material_stock_get", "material_stock_update", "material_stock_adjust",
    "pdf_material_save", "pdf_material_stats",
    "grinding_lora_cadence_config", "grinding_lora_cadence_state", "grinding_lora_cadence_record",
    "grinding_lora_dataset_build", "grinding_lora_dataset_schema",
    "grinding_replacement_evaluate", "grinding_replacement_stats",
    // ENGINE-WIRE-MS0/U-WIRE07: 5 material+tool engines
    "material_equivalent_lookup",
    "material_selection_recommend",
    "material_interpolation_find",
    "tool_db_bridge_query",
    "tool_catalog_adaptive_recommend",
    // U-PPL-D1 / MS-PRINT-PROGRAM-LOOP Track D: ProgramPrintLinkIndexEngine surfaces (2 actions, mirror of prism_dev)
    "program_print_link_lookup",
    "program_print_link_coverage",
    // MS-PRINT-PROGRAM-LOOP/U-PPL-C2: CustomerMaterialMapEngine (2 actions)
    "customer_material_map_build",
    "customer_material_lookup",
    // WIRE-UNWIRED-MS0/U-WIRE-MVN: MachineVocabularyNormalizerEngine (3 actions)
    "machine_vocab_normalize",
    "machine_vocab_normalize_record",
    "machine_vocab_catalog",
  ]),
  params: z.record(z.string(), z.any()).optional()
});

function jsonResponse(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

/**
 * U-PPL-D2 — auto-link orchestration helper.
 *
 * Given a program path, returns the BlueprintLinkInfo to attach (or null if
 * no link could be resolved). Resolves the doc-id → filename via the parent
 * v6 join row's `blueprints[]` because `ProgramToPrintLink` only carries the
 * `print_doc_ids[]` reference (a doc_id is NOT a usable path — reviewer B
 * P0 fix). Page resolves from the matching BlueprintRef.page_index (1-indexed).
 *
 * Resolution priority:
 *   1. training_triple link → use `print_disk_path` directly (real disk path).
 *   2. v6 link → look up parent join row by `part_number_normalized`, find the
 *      BlueprintRef whose doc_id matches `print_doc_ids[0]`, use its filename
 *      + (page_index + 1).
 *   3. Both miss → null (caller falls through to "no link attached").
 */
async function resolveAutoLink(
  programPath: string,
  joinJsonlPath: string | undefined,
  inputProgramPaths: string[] | undefined,
): Promise<{ path: string; confidence: string; page?: number } | null> {
  const { lookupPrintForProgram, loadLinkIndex } = await import(
    "../../engines/ProgramPrintLinkIndexEngine.js"
  );
  const idx = await loadLinkIndex({
    joinJsonlPath,
    inputProgramPaths,
  });
  const lookup = lookupPrintForProgram(programPath, idx);
  if (!lookup.found || !lookup.links || lookup.links.length === 0) {
    return null;
  }
  const link = lookup.links[0]!;
  // Training-triple branch — disk path is authoritative.
  if (link.print_disk_path && link.print_disk_path.length > 0) {
    return { path: link.print_disk_path, confidence: link.match_confidence };
  }
  // v6 join branch — resolve doc_id → BlueprintRef.filename via the parent row.
  const docId = link.print_doc_ids?.[0];
  if (!docId) return null;
  const parentRow = idx.joinIndex.byNormalizedPN.get(link.part_number_normalized);
  if (!parentRow || !Array.isArray(parentRow.blueprints) || parentRow.blueprints.length === 0) {
    return null;
  }
  const bp =
    parentRow.blueprints.find((b) => b.doc_id === docId) ?? parentRow.blueprints[0]!;
  if (!bp.filename || bp.filename.length === 0) return null;
  const page =
    typeof bp.page_index === "number" && Number.isFinite(bp.page_index) && bp.page_index >= 0
      ? bp.page_index + 1
      : undefined;
  return page !== undefined
    ? { path: bp.filename, confidence: link.match_confidence, page }
    : { path: bp.filename, confidence: link.match_confidence };
}

/** Registers data dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerDataDispatcher(server: any): void {
  server.tool(
    "prism_data",
    "Registry data access: material/machine/tool/alarm/formula/coolant/coating get/search/recommend, cross_query, speed_feed_calc. Use 'action' param.",
    DataDispatcherSchema.shape,
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_data] action=${action}`, rawParams);
      await registryManager.initialize();
      let result: any;
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_DATA_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_data"
        );
      }

      // A6: Param ID resolution helpers (eliminates 11 duplicated coalescing patterns)
      const matId = (p: any) => p.identifier || p.material_id || p.id || p.name || null;
      const machId = (p: any) => p.identifier || p.machine_id || p.id || p.model || null;
      const toolId = (p: any) => p.identifier || p.tool_id || p.id || p.catalog || null;
      // A8: Per-call machine lookup memoization
      const _machCache = new Map<string, any>();
      const getMach = (id: string) => {
        if (!_machCache.has(id)) _machCache.set(id, registryManager.machines.getByIdOrModel(id));
        return _machCache.get(id);
      };

      try {
        switch (action) {
          // === MATERIAL (3) ===
          case "material_get": {
            const mid = matId(params);
            if (!mid) return jsonResponse({ error: "Missing material identifier. Provide 'identifier', 'material_id', or 'name'." });
            const mat = await registryManager.materials.getByIdOrName(mid);
            if (!mat) return jsonResponse({ error: `Material not found: ${mid}` });
            let out: any = mat;
            if (params.fields?.length) {
              out = { id: mat.id, name: mat.name };
              for (const f of params.fields) { if (f in mat) out[f] = (mat as RegistryRecord)[f]; }
            }
            result = out;
            // Pressure-aware: strip deep properties
            if (getCurrentPressurePct() > 50 && result) {
              const { composition, tribology, thermal_properties, mechanical_properties, processing_notes, ...essential } = result;
              result = { ...essential, _slimmed: true };
            }
            break;
          }
          case "material_search": {
            result = await registryManager.materials.search({
              query: params.query, iso_group: params.iso_group, category: params.category,
              hardness_min: params.hardness_min, hardness_max: params.hardness_max,
              machinability_min: params.machinability_min, has_kienzle: params.has_kienzle,
              has_taylor: params.has_taylor, limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "material_compare": {
            result = await registryManager.materials.compare(params.material_ids);
            break;
          }

          // === MACHINE (3) ===
          case "machine_get": {
            const mid2 = machId(params);
            if (!mid2) return jsonResponse({ error: "machine_get requires 'identifier', 'machine_id', 'id', or 'model' parameter" });
            const machine = getMach(mid2);
            if (!machine) return jsonResponse({ error: `Machine not found: ${mid2}` });
            result = machine;
            // Pressure-aware: strip deep properties
            if (getCurrentPressurePct() > 50 && result) {
              const { specifications, extended_data, maintenance_history, ...essential } = result as RegistryRecord;
              result = { ...essential, _slimmed: true };
            }
            break;
          }
          case "machine_search": {
            result = registryManager.machines.search({
              query: params.query, manufacturer: params.manufacturer, type: params.type,
              controller: params.controller, min_x_travel: params.min_x_travel,
              min_y_travel: params.min_y_travel, min_z_travel: params.min_z_travel,
              min_spindle_rpm: params.min_spindle_rpm, min_spindle_power: params.min_spindle_power,
              min_tool_capacity: params.min_tool_capacity, simultaneous_axes: params.simultaneous_axes,
              high_speed: params.high_speed, limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "machine_capabilities": {
            const capsId = machId(params);
            if (!capsId) return jsonResponse({ error: "machine_capabilities requires 'identifier', 'machine_id', 'id', or 'model' parameter" });
            const caps = registryManager.machines.getCapabilities(capsId);
            if (!caps) return jsonResponse({ error: `Machine not found: ${capsId}` });
            result = caps;
            break;
          }

          // === CUTTING TOOL (4) ===
          case "tool_get": {
            const tid = toolId(params);
            if (!tid) return jsonResponse({ error: "tool_get requires 'identifier', 'tool_id', 'id', or 'catalog' parameter" });
            const tool = await registryManager.tools.getByIdOrCatalog(tid);
            if (!tool) return jsonResponse({ error: `Tool not found: ${tid}` });
            result = tool;
            // Pressure-aware: strip deep properties
            if (getCurrentPressurePct() > 50 && result) {
              const { extended_data, coating_details, application_notes, ...essential } = result as RegistryRecord;
              result = { ...essential, _slimmed: true };
            }
            break;
          }
          case "tool_search": {
            result = registryManager.tools.search({
              query: params.query, type: params.type, manufacturer: params.manufacturer,
              material_group: params.material_group, diameter_min: params.diameter_min,
              diameter_max: params.diameter_max, diameter_exact: params.diameter_exact,
              flutes: params.flutes, coating: params.coating,
              limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "tool_recommend": {
            const recMatId = params.material_id || params.material || params.identifier;
            if (!recMatId) return jsonResponse({ error: "tool_recommend requires 'material_id' or 'material' parameter" });
            const mat = await registryManager.materials.getByIdOrName(recMatId);
            if (!mat) return jsonResponse({ error: `Material not found: ${recMatId}` });
            const recTools = registryManager.tools.recommendTools({
              material_iso_group: mat.iso_group, operation: params.operation || "milling",
              diameter_target: params.diameter, max_results: params.limit ?? 5
            });
            // Expand material-specific cutting params for the queried ISO group
            result = recTools.map((t: any) => {
              const cpSrc = t.cutting_params?.materials || t.cutting_params || {};
              let materialParams: any = null;
              if (cpSrc) {
                const matchKey = Object.keys(cpSrc).find(k => k.startsWith(mat.iso_group + '_'));
                if (matchKey) materialParams = cpSrc[matchKey];
              }
              return {
                ...t,
                material_cutting_params: materialParams,
                matched_material: { id: (mat as RegistryRecord).material_id || (mat as RegistryRecord).id, name: mat.name, iso_group: mat.iso_group }
              };
            });
            break;
          }
          case "tool_facets": {
            // R1-MS5: Return filterable facets (types, vendors, coatings, diameter ranges)
            // Accepts optional filters to narrow results before aggregating
            const facets = registryManager.tools.getFacets({
              type: params.type,
              vendor: params.vendor || params.manufacturer,
              coating: params.coating,
              category: params.category,
              diameter_min: params.diameter_min,
              diameter_max: params.diameter_max,
              material_group: params.material_group
            });
            result = facets;
            break;
          }

          // === ALARM (3) ===
          case "alarm_decode": {
            const alarmCode = params.code || params.alarm_code || params.identifier;
            if (!alarmCode) return jsonResponse({ error: "alarm_decode requires 'code' or 'alarm_code' parameter" });
            const controller = params.controller || params.manufacturer || "UNKNOWN";
            const alarm = await registryManager.alarms.decode(controller, alarmCode);
            if (!alarm) return jsonResponse({ error: `Alarm not found: ${alarmCode} (controller: ${controller})` });
            result = alarm;
            break;
          }
          case "alarm_search": {
            result = await registryManager.alarms.search({
              query: params.query, controller: params.controller, category: params.category,
              severity: params.severity, has_fix: params.has_fix,
              limit: params.limit ?? 20, offset: params.offset ?? 0
            });
            break;
          }
          case "alarm_fix": {
            const fixAlarmId = params.alarm_id || params.id || params.code;
            if (!fixAlarmId) return jsonResponse({ error: "alarm_fix requires 'alarm_id' or 'code' parameter" });
            const alm = await registryManager.alarms.get(fixAlarmId);
            if (!alm) return jsonResponse({ error: `Alarm not found: ${fixAlarmId}` });
            result = { alarm_id: alm.alarm_id, name: alm.name, quick_fix: alm.quick_fix,
              fix_procedures: alm.fix_procedures, related_alarms: alm.related_alarms };
            break;
          }

          // === FORMULA (2) ===
          case "formula_get": {
            const fid = params.formula_id || params.id || params.name;
            if (!fid) return jsonResponse({ error: "formula_get requires 'formula_id' parameter" });
            const formula = await registryManager.formulas.getFormula(fid);
            if (!formula) return jsonResponse({ error: `Formula not found: ${fid}` });
            result = formula;
            break;
          }
          case "formula_calculate": {
            // Fire pre-calculation hooks (blocking if safety issues)
            const hookCtx = {
              operation: "formula_calculate",
              target: { type: "calculation" as const, id: params.formula_id, data: params },
              metadata: { dispatcher: "dataDispatcher", formula_id: params.formula_id, inputs: params.inputs }
            };
            const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
            if (preResult.blocked) {
              return jsonResponse({ blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, formula_id: params.formula_id });
            }
            
            const calcResult = await registryManager.formulas.calculate(params.formula_id, params.inputs);
            result = { formula_id: params.formula_id, inputs: params.inputs,
              result: calcResult.result, validation: calcResult.validation };
            
            // Fire post-calculation hooks (non-blocking)
            try { await hookExecutor.execute("post-calculation", { ...hookCtx, metadata: { ...hookCtx.metadata, result } }); }
            catch (e) { log.warn(`[dataDispatcher] Post-calc hook error: ${e}`); }
            break;
          }

          // === CROSS-REGISTRY LINKING (3) ===
          case "cross_query": {
            // Material + operation + machine → full cutting parameter recommendation
            const cqMatId = params.material_id || params.material;
            const cqOperation = params.operation || "milling";
            const cqMachineId = params.machine_id || params.machine;
            
            if (!cqMatId) return jsonResponse({ error: "cross_query requires 'material_id' or 'material'" });
            
            // 1. Get material
            const cqMat = await registryManager.materials.getByIdOrName(cqMatId);
            if (!cqMat) return jsonResponse({ error: `Material not found: ${cqMatId}` });
            
            // 2. Get machine (optional - for power/speed limits)
            let cqMachine: any = null;
            let machineConstraints: any = {};
            if (cqMachineId) {
              cqMachine = getMach(cqMachineId);
              if (cqMachine) {
                machineConstraints = {
                  max_rpm: cqMachine.spindle?.max_rpm,
                  max_power_kw: cqMachine.spindle?.power_continuous || cqMachine.spindle?.power_kw,
                  spindle_interface: cqMachine.spindle?.spindle_nose || cqMachine.spindle?.interface || cqMachine.spindle_interface,
                  controller: cqMachine.controller?.brand || cqMachine.controller?.manufacturer,
                  turret_type: cqMachine.turret?.type || cqMachine.turret_type,
                  max_x: cqMachine.travels?.x || cqMachine.work_envelope?.x_mm,
                  max_y: cqMachine.travels?.y || cqMachine.work_envelope?.y_mm,
                  max_z: cqMachine.travels?.z || cqMachine.work_envelope?.z_mm,
                };
              }
            }
            
            // 3. Find recommended tools
            const cqTools = registryManager.tools.recommendTools({
              material_iso_group: cqMat.iso_group,
              operation: cqOperation,
              diameter_target: params.tool_diameter,
              max_results: params.limit ?? 5
            });
            
            // 4. Get cutting parameters from material
            const isoGroup = (cqMat.iso_group || '').toUpperCase();
            const matCutRec = (cqMat as RegistryRecord).cutting_recommendations;
            const opRec = matCutRec?.[cqOperation] || matCutRec?.milling || {};
            
            // 5. Build Kienzle/Taylor params
            const kienzle = (cqMat as RegistryRecord).kienzle;
            const taylor = (cqMat as RegistryRecord).taylor;
            
            // 6. Safety check: if machine has max_power, flag if cutting might exceed
            let safetyWarnings: string[] = [];
            if (machineConstraints.max_power_kw && kienzle?.kc1_1) {
              // Rough estimate: typical milling at full engagement
              // Rough estimate: 1mm² chip area (1mm depth * 1mm width)
              const estForce = kienzle.kc1_1; // kc at h=1mm, typical chip area ~1mm²
              const estPower = (estForce * (opRec.speed_roughing || 150)) / 60000;
              if (estPower > machineConstraints.max_power_kw * 0.9) {
                safetyWarnings.push(`Estimated cutting power (${estPower.toFixed(1)}kW) may approach machine limit (${machineConstraints.max_power_kw}kW)`);
              }
            }
            
            // 7. Find compatible toolholders if machine spindle is known
            let compatibleHolders: any[] = [];
            if (machineConstraints.spindle_interface) {
              const holderResult = registryManager.tools.search({
                query: machineConstraints.spindle_interface,
                limit: 5
              });
              compatibleHolders = holderResult?.tools || (holderResult as RegistryRecord)?.results || [];
            }
            
            result = {
              material: {
                id: cqMat.material_id || cqMat.id,
                name: cqMat.name,
                iso_group: cqMat.iso_group,
                hardness: (cqMat as RegistryRecord).mechanical?.hardness,
                machinability: (cqMat as RegistryRecord).machinability
              },
              operation: cqOperation,
              cutting_parameters: {
                kienzle: kienzle ? { kc1_1: kienzle.kc1_1, mc: kienzle.mc } : null,
                taylor: taylor ? { C: taylor.C, n: taylor.n } : null,
                recommendations: opRec,
                composition: (cqMat as RegistryRecord).composition ? "available" : "not_available",
                tribology: (cqMat as RegistryRecord).tribology ? "available" : "not_available"
              },
              recommended_tools: cqTools,
              machine: cqMachine ? {
                id: cqMachine.id || cqMachine.machine_id,
                model: cqMachine.model || cqMachine.name,
                constraints: machineConstraints
              } : null,
              compatible_holders: compatibleHolders.length > 0 ? compatibleHolders.map((h: any) => ({
                id: h.id, name: h.name, interface: h.spindle_interface || h.tool_interface
              })) : null,
              safety_warnings: safetyWarnings.length > 0 ? safetyWarnings : null,
              _chain: "material → iso_group → cutting_params → tools → holders → machine"
            };
            break;
          }
          
          case "machine_toolholder_match": {
            // Machine spindle interface → compatible toolholders
            const mthMachineId = params.machine_id || params.machine || params.identifier;
            if (!mthMachineId) return jsonResponse({ error: "machine_toolholder_match requires 'machine_id' or 'machine'" });
            
            const mthMachine = getMach(mthMachineId);
            if (!mthMachine) return jsonResponse({ error: `Machine not found: ${mthMachineId}` });
            
            const spindleInterface = mthMachine.spindle?.spindle_nose || (mthMachine.spindle as RegistryRecord)?.interface || (mthMachine as RegistryRecord).spindle_interface;
            const turretType = (mthMachine as RegistryRecord).turret?.type || (mthMachine as RegistryRecord).turret_type;
            const machineType = (mthMachine.type || (mthMachine as RegistryRecord).machine_type || '').toLowerCase();
            const isLathe = machineType.includes('lathe') || machineType.includes('turn');
            
            let holders: any[] = [];
            
            if (isLathe && turretType) {
              // For lathes: search by turret type (VDI30, VDI40, BMT55, etc.)
              const turretResult = registryManager.tools.search({
                query: turretType,
                limit: params.limit ?? 20
              });
              holders = turretResult?.tools || (turretResult as RegistryRecord)?.results || [];
            }
            
            if (spindleInterface) {
              // For mills: search by spindle interface (BT40, CAT40, HSK-A63, etc.)
              const spindleResult = registryManager.tools.search({
                query: spindleInterface,
                limit: params.limit ?? 20
              });
              const spindleHolders = spindleResult?.tools || (spindleResult as RegistryRecord)?.results || [];
              holders = holders.concat(spindleHolders);
            }
            
            // Deduplicate
            const seen = new Set();
            holders = holders.filter(h => {
              const id = h.id || h.tool_id;
              if (seen.has(id)) return false;
              seen.add(id);
              return true;
            });
            
            result = {
              machine: {
                id: mthMachine.id || (mthMachine as RegistryRecord).machine_id,
                model: mthMachine.model || mthMachine.name,
                type: machineType,
                spindle_interface: spindleInterface,
                turret_type: turretType
              },
              compatible_holders: holders.map((h: any) => ({
                id: h.id, name: h.name, type: h.subcategory || h.type,
                interface: h.spindle_interface || h.tool_interface,
                clamping: h.clamping_type, max_rpm: h.max_rpm
              })),
              total_compatible: holders.length,
              search_criteria: isLathe
                ? `turret: ${turretType || 'unknown'}, spindle: ${spindleInterface || 'unknown'}`
                : `spindle: ${spindleInterface || 'unknown'}`
            };
            break;
          }
          
          case "alarm_diagnose": {
            // Machine + alarm code → controller-specific diagnosis + fix
            const adMachineId = params.machine_id || params.machine;
            const adCode = params.code || params.alarm_code;
            
            if (!adCode) return jsonResponse({ error: "alarm_diagnose requires 'code' or 'alarm_code'" });
            
            // Determine controller from machine or params
            let controller = params.controller;
            let machineInfo: any = null;
            
            if (adMachineId) {
              const adMachine = getMach(adMachineId);
              if (adMachine) {
                controller = controller || (adMachine.controller as RegistryRecord)?.brand || adMachine.controller?.manufacturer;
                machineInfo = {
                  id: adMachine.id || (adMachine as RegistryRecord).machine_id,
                  model: adMachine.model || adMachine.name,
                  controller_brand: controller,
                  controller_model: adMachine.controller?.model
                };
              }
            }
            
            if (!controller) return jsonResponse({ error: "Cannot determine controller. Provide 'controller' or 'machine_id' with controller data." });
            
            // Decode alarm
            const adAlarm = await registryManager.alarms.decode(String(controller), String(adCode));
            
            if (!adAlarm) {
              // Try broader search
              const searchResult = await registryManager.alarms.search({
                query: String(adCode), controller: String(controller), limit: 5
              });
              const searchAlarms = searchResult?.alarms || (searchResult as RegistryRecord)?.results || [];
              if (searchAlarms.length > 0) {
                result = {
                  exact_match: false,
                  machine: machineInfo,
                  possible_alarms: searchAlarms.map((a: any) => ({
                    alarm_id: a.alarm_id, code: a.code, name: a.name,
                    severity: a.severity, quick_fix: a.quick_fix
                  })),
                  note: `No exact match for code '${adCode}' on ${controller}. Showing related alarms.`
                };
              } else {
                result = { error: `Alarm ${adCode} not found for controller ${controller}`, machine: machineInfo };
              }
            } else {
              // Build comprehensive diagnosis
              result = {
                alarm: {
                  alarm_id: adAlarm.alarm_id,
                  code: adAlarm.code,
                  name: adAlarm.name,
                  severity: adAlarm.severity,
                  category: adAlarm.category,
                  description: adAlarm.description,
                  causes: adAlarm.causes,
                  requires_power_cycle: adAlarm.requires_power_cycle,
                  requires_service: (adAlarm as RegistryRecord).requires_service
                },
                fix: {
                  quick_fix: adAlarm.quick_fix,
                  procedures: adAlarm.fix_procedures || [],
                  common_parts: (adAlarm as RegistryRecord).common_parts || [],
                  related_parameters: (adAlarm as RegistryRecord).related_parameters || []
                },
                machine: machineInfo,
                related_alarms: adAlarm.related_alarms || [],
                _chain: "machine → controller → alarm_code → diagnosis → fix_procedure"
              };
            }
            break;
          }

          case "speed_feed_calc": {
            const sfMat = params.material ? await registryManager.materials.getByIdOrName(params.material) : null;
            if (!sfMat) return jsonResponse({ error: "speed_feed_calc requires 'material'" });
            const sfToolDiam = params.tool_diameter ?? params.diameter ?? 10;
            const sfFlutes = params.flutes ?? 4;
            const sfOp = (params.operation || "milling").toLowerCase();
            const sfAp = params.depth_of_cut || params.ap;
            const sfAe = params.width_of_cut || params.ae;
            const kienzle = (sfMat as RegistryRecord).kienzle;
            const taylor = (sfMat as RegistryRecord).taylor;
            const cutRec = (sfMat as RegistryRecord).cutting_recommendations;
            const isRoughing = sfOp.includes("rough");
            const recSection = cutRec?.[sfOp === 'turning' ? 'turning' : 'milling'] || {};
            // Handle both nested (roughing: {speed, fz}) and flat (speed_roughing, speed_finishing) schemas
            const recBlock = recSection[isRoughing ? 'roughing' : 'finishing'] || recSection || {};
            let maxRPM = params.max_rpm ?? 12000;
            let maxPower = params.max_power_kw ?? 15;
            if (params.machine) {
              const sfMach = getMach(params.machine);
              if (sfMach) {
                maxRPM = sfMach.spindle?.max_rpm || (sfMach as RegistryRecord).spindle_rpm_max || maxRPM;
                maxPower = (sfMach.spindle as RegistryRecord)?.power_kw || sfMach.spindle?.power_continuous || maxPower;
              }
            }
            const vcRec = recBlock.speed || (isRoughing ? recSection.speed_roughing : recSection.speed_finishing) || (isRoughing ? 150 : 200);
            const rpm = Math.min(Math.round((vcRec * 1000) / (Math.PI * sfToolDiam)), maxRPM);
            const actualVc = Math.round((Math.PI * sfToolDiam * rpm) / 1000 * 10) / 10;
            const fzRec = recBlock.fz_mm || (isRoughing ? recSection.feed_per_tooth_roughing || recSection.feed_roughing : recSection.feed_per_tooth_finishing || recSection.feed_finishing) || (isRoughing ? 0.12 : 0.06);
            const feedRate = Math.round(rpm * sfFlutes * fzRec);
            const ap = sfAp || recSection.doc_roughing || recSection.doc_finishing || (isRoughing ? sfToolDiam * 1.0 : sfToolDiam * 0.2);
            const aeDefault = isRoughing ? (recSection.ae_roughing_pct ? sfToolDiam * recSection.ae_roughing_pct / 100 : sfToolDiam * 0.5) : (recSection.ae_finishing_pct ? sfToolDiam * recSection.ae_finishing_pct / 100 : sfToolDiam * 0.05);
            const ae = sfAe || aeDefault;
            const mrr = Math.round(ae * ap * feedRate / 1000 * 10) / 10;
            const h = fzRec * Math.sin(Math.acos(Math.max(-1, Math.min(1, 1 - (2 * ae / sfToolDiam)))));
            const hex = Math.max(h, 0.01);
            const Fc = kienzle ? Math.round(kienzle.kc1_1 * Math.pow(hex, 1 - kienzle.mc) * ap) : null;
            const Pc = Fc ? Math.round((Fc * actualVc / 60000) * 100) / 100 : null;
            const powerPct = Pc && maxPower ? Math.round((Pc / maxPower) * 100) : null;
            // Tool life — select best Taylor constants for the actual cutting speed
            let tlC = taylor?.C, tlN = taylor?.n, tlGrade = "carbide";
            if (taylor) {
              // If speed exceeds carbide C, try ceramic/CBN which have higher C values
              if (actualVc > (taylor.C || 0) && taylor.C_ceramic) { tlC = taylor.C_ceramic; tlN = taylor.n_ceramic; tlGrade = "ceramic"; }
              if (actualVc > (taylor.C_ceramic || taylor.C || 0) && taylor.C_cbn) { tlC = taylor.C_cbn; tlN = taylor.n_cbn; tlGrade = "cbn"; }
              // If speed is below carbide C but very low, the formula still works
            }
            const toolLifeRaw = (tlC != null && tlN != null && tlN > 0 && actualVc > 0) ? Math.pow(tlC / actualVc, 1 / tlN) : null;
            const toolLife = toolLifeRaw !== null ? Math.max(1, Math.round(toolLifeRaw)) : null;
            const toolGrade = tlGrade;
            const warnings: string[] = [];
            if (rpm >= maxRPM) warnings.push(`RPM limited by machine max (${maxRPM})`);
            if (powerPct && powerPct > 90) warnings.push(`Power usage ${powerPct}% — approaching machine limit`);
            if (toolLife && toolLife < 5) warnings.push(`Very short tool life (${toolLife} min) — reduce speed`);
            result = {
              input: { material: { name: sfMat.name, iso_group: sfMat.iso_group, hardness_bhn: (sfMat as RegistryRecord).mechanical?.hardness?.brinell }, tool: { diameter_mm: sfToolDiam, flutes: sfFlutes }, operation: sfOp, machine_limits: { max_rpm: maxRPM, max_power_kw: maxPower } },
              parameters: { cutting_speed_vc: actualVc, unit_vc: "m/min", rpm, feed_per_tooth_fz: fzRec, unit_fz: "mm", feed_rate_vf: feedRate, unit_vf: "mm/min", depth_of_cut_ap: ap, unit_ap: "mm", width_of_cut_ae: ae, unit_ae: "mm" },
              performance: { mrr_cm3_min: mrr, cutting_force_N: Fc, cutting_power_kW: Pc, power_utilization_pct: powerPct, estimated_tool_life_min: toolLife, tool_grade_used: toolGrade },
              safety: warnings.length > 0 ? warnings : ["All parameters within safe limits"],
              source: { kienzle: !!kienzle, taylor: !!(taylor?.C), taylor_grade: toolGrade, recommendations: (recSection.speed_roughing || recSection.speed_finishing) ? "material-specific" : "iso-group-default" }
            };
            break;
          }

          case "tool_compare": {
            const tc1 = params.tool_1 || params.tool1;
            const tc2 = params.tool_2 || params.tool2;
            if (!tc1 || !tc2) return jsonResponse({ error: "tool_compare requires 'tool_1' and 'tool_2'" });
            const tool1 = registryManager.tools.get(tc1) || registryManager.tools.getByCatalogNumber(tc1);
            const tool2 = registryManager.tools.get(tc2) || registryManager.tools.getByCatalogNumber(tc2);
            if (!tool1) return jsonResponse({ error: `Tool not found: ${tc1}` });
            if (!tool2) return jsonResponse({ error: `Tool not found: ${tc2}` });
            const tcMat = params.material ? await registryManager.materials.getByIdOrName(params.material) : null;
            const tcIsoGroup = tcMat?.iso_group || params.iso_group || 'P';
            const cp1 = (tool1 as RegistryRecord).cutting_params || {};
            const cp2 = (tool2 as RegistryRecord).cutting_params || {};
            // Handle both nested (.materials.P_STEELS) and flat (.P_STEELS) schemas
            const cp1src = cp1.materials || cp1;
            const cp2src = cp2.materials || cp2;
            const isoKey1 = Object.keys(cp1src).find(k => k.startsWith(tcIsoGroup + '_'));
            const isoKey2 = Object.keys(cp2src).find(k => k.startsWith(tcIsoGroup + '_'));
            const t1cp = isoKey1 ? cp1src[isoKey1] : null;
            const t2cp = isoKey2 ? cp2src[isoKey2] : null;
            result = {
              tool_1: { id: (tool1 as RegistryRecord).id, name: tool1.name, vendor: (tool1 as RegistryRecord).vendor, diameter: (tool1 as RegistryRecord).cutting_diameter_mm, flutes: (tool1 as RegistryRecord).flute_count, coating: (tool1 as RegistryRecord).coating || (tool1 as RegistryRecord).coating_type, coolant_through: (tool1 as RegistryRecord).coolant_through, price: (tool1 as RegistryRecord).price_usd, taylor_C: (tool1 as RegistryRecord).taylor_C, cutting_params: t1cp },
              tool_2: { id: (tool2 as RegistryRecord).id, name: tool2.name, vendor: (tool2 as RegistryRecord).vendor, diameter: (tool2 as RegistryRecord).cutting_diameter_mm, flutes: (tool2 as RegistryRecord).flute_count, coating: (tool2 as RegistryRecord).coating || (tool2 as RegistryRecord).coating_type, coolant_through: (tool2 as RegistryRecord).coolant_through, price: (tool2 as RegistryRecord).price_usd, taylor_C: (tool2 as RegistryRecord).taylor_C, cutting_params: t2cp },
              comparison: { for_material: tcMat ? { name: tcMat.name, iso_group: tcIsoGroup } : { iso_group: tcIsoGroup }, diameter_match: (tool1 as RegistryRecord).cutting_diameter_mm === (tool2 as RegistryRecord).cutting_diameter_mm, price_diff_pct: (tool1 as RegistryRecord).price_usd && (tool2 as RegistryRecord).price_usd ? Math.round(((tool2 as RegistryRecord).price_usd - (tool1 as RegistryRecord).price_usd) / (tool1 as RegistryRecord).price_usd * 100) : null, tool_life_ratio: (tool1 as RegistryRecord).taylor_C && (tool2 as RegistryRecord).taylor_C ? Math.round((tool2 as RegistryRecord).taylor_C / (tool1 as RegistryRecord).taylor_C * 100) / 100 : null }
            };
            break;
          }

          // === CROSS-SYSTEM INTELLIGENCE (R3-MS3) ===
          case "material_substitute": {
            const subMat = params.material;
            const subReason = params.reason || "machinability";
            if (!subMat) return jsonResponse({ error: "material_substitute requires 'material' parameter" });
            const validReasons = ["cost", "availability", "machinability", "performance"];
            if (!validReasons.includes(subReason)) return jsonResponse({ error: `Invalid reason: ${subReason}. Use: ${validReasons.join(", ")}` });

            // 1. Get source material
            const source = await registryManager.materials.getByIdOrName(subMat);
            if (!source) return jsonResponse({ error: `Source material not found: ${subMat}` });
            const srcGroup = (source as RegistryRecord).iso_group || "P";
            const srcHardness = (source as RegistryRecord).hardness_hb ?? (source as RegistryRecord).hardness ?? 200;
            const srcTensile = (source as RegistryRecord).tensile_strength_mpa ?? (source as RegistryRecord).tensile_strength ?? 500;
            const srcMachinability = (source as RegistryRecord).machinability_rating ?? (source as RegistryRecord).machinability ?? 50;

            // 2. Find candidates in same ISO group
            const candidates = await registryManager.materials.search({
              iso_group: srcGroup, limit: 50, offset: 0
            });
            const candidateList = Array.isArray(candidates) ? candidates : (candidates as RegistryRecord)?.materials || (candidates as RegistryRecord)?.results || [];

            // 3. Score and rank based on reason
            const scored = candidateList
              .filter((c: any) => c.name !== source.name && c.id !== (source as RegistryRecord).id)
              .map((c: any) => {
                const cHardness = c.hardness_hb ?? c.hardness ?? 200;
                const cTensile = c.tensile_strength_mpa ?? c.tensile_strength ?? 500;
                const cMachinability = c.machinability_rating ?? c.machinability ?? 50;
                const hardnessDiff = Math.abs(cHardness - srcHardness) / Math.max(srcHardness, 1);
                const tensileDiff = Math.abs(cTensile - srcTensile) / Math.max(srcTensile, 1);
                const machinabilityImprovement = ((cMachinability - srcMachinability) / Math.max(srcMachinability, 1)) * 100;

                let score = 0;
                const tradeOffs: string[] = [];
                if (subReason === "machinability") {
                  score = cMachinability;
                  if (hardnessDiff > 0.20) tradeOffs.push(`Hardness differs by ${Math.round(hardnessDiff * 100)}%`);
                  if (tensileDiff > 0.20) tradeOffs.push(`Tensile strength differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "cost") {
                  score = cMachinability * 0.5 + (1 - hardnessDiff) * 50;
                  if (tensileDiff > 0.15) tradeOffs.push(`Tensile differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "availability") {
                  const commonAlloys = ["1045", "4140", "4340", "6061", "7075", "304", "316"];
                  const isCommon = commonAlloys.some(a => c.name?.includes(a));
                  score = (isCommon ? 100 : 50) + cMachinability * 0.3;
                  if (tensileDiff > 0.15) tradeOffs.push(`Tensile differs by ${Math.round(tensileDiff * 100)}%`);
                } else if (subReason === "performance") {
                  score = cTensile * 0.5 + cHardness * 0.3 + cMachinability * 0.2;
                  if (cMachinability < srcMachinability * 0.8) tradeOffs.push(`Lower machinability (${Math.round(cMachinability)} vs ${Math.round(srcMachinability)})`);
                }

                return {
                  name: c.name,
                  iso_group: c.iso_group || srcGroup,
                  machinability_improvement_pct: Math.round(machinabilityImprovement),
                  properties: {
                    hardness: cHardness,
                    tensile: cTensile,
                    density: c.density || null,
                    machinability: cMachinability
                  },
                  trade_offs: tradeOffs,
                  score
                };
              })
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 5);

            result = {
              source_material: { name: source.name, iso_group: srcGroup, hardness: srcHardness, tensile: srcTensile, machinability: srcMachinability },
              reason: subReason,
              substitutes: scored.map(({ score, ...rest }: any) => rest),
              count: scored.length
            };
            break;
          }

          // === COOLANT (3) ===
          case "coolant_get": {
            const coolantId = params.id || params.coolant_id || params.identifier;
            if (!coolantId) return jsonResponse({ error: "Missing coolant identifier. Provide 'id' or 'coolant_id'." });
            const coolant = registryManager.coolants.get(coolantId);
            if (!coolant) return jsonResponse({ error: `Coolant not found: ${coolantId}` });
            result = coolant;
            break;
          }
          case "coolant_search": {
            result = registryManager.coolants.searchCoolants({
              query: params.query, category: params.category, delivery: params.delivery,
              material_group: params.material_group || params.material || params.iso_group,
              operation: params.operation, limit: params.limit ?? 10
            });
            break;
          }
          case "coolant_recommend": {
            const matGroup = params.material_group || params.material || params.iso_group;
            if (!matGroup) return jsonResponse({ error: "Missing material_group (ISO group e.g. 'P', 'M', 'K')" });
            result = registryManager.coolants.recommend({
              material_group: matGroup, operation: params.operation || "general",
              delivery: params.delivery
            });
            break;
          }

          // === COATING (3) ===
          case "coating_get": {
            const coatingId = params.id || params.coating_id || params.identifier;
            if (!coatingId) return jsonResponse({ error: "Missing coating identifier. Provide 'id' or 'coating_id'." });
            const coating = registryManager.coatings.get(coatingId);
            if (!coating) return jsonResponse({ error: `Coating not found: ${coatingId}` });
            result = coating;
            break;
          }
          case "coating_search": {
            result = registryManager.coatings.searchCoatings({
              query: params.query, category: params.category, process: params.process,
              material_group: params.material_group || params.material || params.iso_group,
              application: params.application, limit: params.limit ?? 10
            });
            break;
          }
          case "coating_recommend": {
            const coatMatGroup = params.material_group || params.material || params.iso_group;
            if (!coatMatGroup) return jsonResponse({ error: "Missing material_group (ISO group e.g. 'P', 'M', 'K')" });
            result = registryManager.coatings.recommend({
              material_group: coatMatGroup, application: params.application || params.operation || "general",
              process: params.process
            });
            break;
          }

          // === CROSS-REGISTRY + DSL + DATABASE (L0-P2-MS1) ===
          case "cross_lookup": {
            const from = params.from || params.source;
            const to = params.to || params.target;
            const id = params.id || params.query || params.identifier;
            if (!from || !to || !id) return jsonResponse({ error: "cross_lookup requires 'from', 'to', and 'id' params. Example: from='material', to='tools', id='AISI 4140'" });
            result = await registryManager.crossLookup({ from, to, id, limit: params.limit ?? 10 });
            break;
          }

          case "dsl_lookup": {
            const query = params.query || params.term || params.abbreviation;
            if (!query) return jsonResponse({ error: "dsl_lookup requires 'query' param." });
            const matches = registryManager.dslLookup(query);
            result = { query, matches, count: matches.length };
            break;
          }

          case "database_list": {
            result = { databases: registryManager.databases.list(), stats: registryManager.databases.getStats() };
            break;
          }

          case "database_search": {
            const dbQuery = params.query || params.q;
            if (!dbQuery) return jsonResponse({ error: "database_search requires 'query' param." });
            const dbId = params.database_id || params.db;
            if (dbId) {
              // Search specific database
              const db = registryManager.databases.getData(dbId);
              if (!db) return jsonResponse({ error: `Database not found: ${dbId}` });
              const searchResults = registryManager.databases.search(dbQuery, params.limit ?? 10);
              result = searchResults.filter(r => r.database_id === dbId);
            } else {
              result = registryManager.databases.search(dbQuery, params.limit ?? 10);
            }
            break;
          }

          // L3-P0-MS1: Workholding & Insert registry lookups
          case "workholding_get": {
            const whId = params.identifier || params.workholding_id || params.id || params.name;
            if (!whId) return jsonResponse({ error: "workholding_get requires 'identifier' or 'workholding_id'." });
            // Search across databases for workholding data
            const whResults = registryManager.databases?.search?.(whId, 5) || [];
            result = whResults.length ? whResults[0] : { id: whId, type: "workholding", message: "Not found in registry — check workholding catalog" };
            break;
          }
          case "workholding_search": {
            const whQuery = params.query || params.q || params.type;
            if (!whQuery) return jsonResponse({ error: "workholding_search requires 'query' param." });
            result = registryManager.databases?.search?.(whQuery, params.limit ?? 10) || [];
            break;
          }
          case "insert_get": {
            const insId = params.identifier || params.insert_id || params.id || params.designation;
            if (!insId) return jsonResponse({ error: "insert_get requires 'identifier' or 'insert_id'." });
            // Search tools registry for insert data
            const toolResult = await registryManager.tools.getByIdOrCatalog(insId);
            result = toolResult || { id: insId, type: "insert", message: "Not found — check insert designation (e.g. CNMG120408)" };
            break;
          }
          case "insert_search": {
            const insQuery = params.query || params.q || params.material;
            if (!insQuery) return jsonResponse({ error: "insert_search requires 'query' param." });
            result = await registryManager.tools.search({ query: insQuery, limit: params.limit ?? 10 });
            break;
          }

          // ── Tool Holder Database ──
          case "holder_get": {
            const hId = params.id || params.identifier || params.holder_id;
            if (!hId) return jsonResponse({ error: "holder_get requires 'id'" });
            const holder = toolHolderDatabaseEngine.get(hId);
            result = holder ?? { error: `Holder not found: ${hId}` };
            break;
          }
          case "holder_search": {
            const hq = params.query || params.q || params.type;
            if (!hq) return jsonResponse({ error: "holder_search requires 'query'" });
            result = toolHolderDatabaseEngine.search(hq, params.limit ?? 20);
            break;
          }
          case "holder_recommend": {
            result = toolHolderDatabaseEngine.recommend({
              machine_type: params.machine_type,
              rpm: params.rpm,
              application: params.application,
              torque_nm: params.torque_nm,
            });
            break;
          }
          case "holder_types": {
            const htStats = toolHolderDatabaseEngine.stats();
            result = {
              type_names: toolHolderDatabaseEngine.getTypes(),
              standard_names: toolHolderDatabaseEngine.getStandards(),
              total: htStats.total,
              type_count: htStats.types,
              standard_count: htStats.standards,
              max_rpm: htStats.max_rpm,
            };
            break;
          }

          // ── Machine Config Database ──
          case "machine_config_get": {
            const mcId = params.id || params.machine_id || params.machine;
            if (!mcId) return jsonResponse({ error: "machine_config_get requires 'id'" });
            const mc = machineConfigDatabaseEngine.get(mcId);
            result = mc ?? { error: `Machine config not found: ${mcId}` };
            break;
          }
          case "machine_config_search": {
            const mcq = params.query || params.q || params.controller;
            if (!mcq) return jsonResponse({ error: "machine_config_search requires 'query'" });
            result = machineConfigDatabaseEngine.search(mcq);
            break;
          }
          case "machine_config_smoothing": {
            const smId = params.machine_id || params.machine || params.id;
            const smOp = params.operation || 'roughing';
            if (!smId) return jsonResponse({ error: "machine_config_smoothing requires 'machine_id'" });
            const code = machineConfigDatabaseEngine.getSmoothingCode(smId, smOp);
            result = code != null
              ? { machine: smId, operation: smOp, smoothing_code: code }
              : { error: `Machine not found: ${smId}` };
            break;
          }
          case "machine_config_list": {
            result = {
              configs: machineConfigDatabaseEngine.list(),
              ...machineConfigDatabaseEngine.stats(),
            };
            break;
          }

          // ── Surface Finish Database ──
          case "surface_finish_grade": {
            const sfGrade = params.grade || params.n_grade;
            if (sfGrade) {
              result = surfaceFinishDatabaseEngine.getGrade(sfGrade)
                ?? { error: `Grade not found: ${sfGrade}` };
            } else {
              result = surfaceFinishDatabaseEngine.getAllGrades();
            }
            break;
          }
          case "surface_finish_parse": {
            const sfCallout = params.callout || params.text || params.input;
            if (!sfCallout) return jsonResponse({ error: "surface_finish_parse requires 'callout'" });
            result = surfaceFinishDatabaseEngine.parseCallout(sfCallout);
            break;
          }
          case "surface_finish_convert": {
            const sfVal = params.value;
            const sfFrom = params.from || params.from_unit;
            const sfTo = params.to || params.to_unit;
            if (sfVal == null || !sfFrom || !sfTo) {
              return jsonResponse({ error: "surface_finish_convert requires 'value', 'from', 'to'" });
            }
            result = {
              input: { value: sfVal, unit: sfFrom },
              output: { value: surfaceFinishDatabaseEngine.convert(sfVal, sfFrom, sfTo), unit: sfTo },
            };
            break;
          }
          case "surface_finish_recommend": {
            const sfTarget = params.target_ra_um ?? params.target_ra ?? params.ra;
            if (sfTarget == null) return jsonResponse({ error: "surface_finish_recommend requires 'target_ra_um'" });
            const rec = surfaceFinishDatabaseEngine.getRecommendedProcess(sfTarget);
            result = rec ?? { error: "No process found for target Ra" };
            break;
          }

          // === CATALOG: MACHINES ===
          case "catalog_machine_lookup": {
            const brand = params.brand?.toLowerCase();
            const type = params.type?.toLowerCase();
            const minRpm = params.min_rpm;
            const minPower = params.min_power_kw;
            const taper = params.taper?.toLowerCase();
            let matches = EXTENDED_MACHINE_CATALOG;
            if (brand) matches = matches.filter((m) => m.brand.toLowerCase().includes(brand));
            if (type) matches = matches.filter((m) => m.type.toLowerCase() === type);
            if (minRpm) matches = matches.filter((m) => m.spindle.max_rpm >= minRpm);
            if (minPower) matches = matches.filter((m) => m.spindle.power_kw >= minPower);
            if (taper) matches = matches.filter((m) => m.spindle.taper.toLowerCase().includes(taper));
            result = { count: matches.length, machines: matches.slice(0, params.limit ?? 20) };
            break;
          }
          case "catalog_machine_stats": {
            result = getCatalogStats();
            break;
          }

          // === CATALOG: SGS TOOLS ===
          case "catalog_tool_lookup": {
            const series = params.series?.toLowerCase();
            const coating = params.coating?.toLowerCase();
            const material = params.material?.toLowerCase();
            const isoGroup = params.iso_group?.toUpperCase();
            let seriesMatches = SGS_END_MILL_SERIES;
            if (series) seriesMatches = seriesMatches.filter((s) => s.series.toLowerCase().includes(series) || s.name.toLowerCase().includes(series));
            if (coating) seriesMatches = seriesMatches.filter((s) => s.coating.toLowerCase().includes(coating));
            let sfZr = SGS_SPEED_FEED_ZR.slice();
            if (series) sfZr = sfZr.filter((r) => r.tool_series.toLowerCase().includes(series));
            if (isoGroup) sfZr = sfZr.filter((r) => r.iso_group === isoGroup);
            if (material) sfZr = sfZr.filter((r) => r.material_group.toLowerCase().includes(material));
            let sfQuick = SGS_QUICK_SPEED_FEED.slice();
            if (series) sfQuick = sfQuick.filter((r) => r.series.toLowerCase().includes(series));
            if (isoGroup) sfQuick = sfQuick.filter((r) => r.iso_group === isoGroup);
            if (material) sfQuick = sfQuick.filter((r) => r.material_group.toLowerCase().includes(material));
            let coatingMatches = SGS_COATINGS;
            if (coating) coatingMatches = coatingMatches.filter((c) => c.name.toLowerCase().includes(coating) || c.designation.toLowerCase().includes(coating));
            result = {
              series: seriesMatches.slice(0, params.limit ?? 10),
              speed_feed_zr: sfZr.slice(0, params.limit ?? 20),
              speed_feed_quick: sfQuick.slice(0, params.limit ?? 20),
              coatings: coatingMatches,
              catalog: SGS_CATALOG_META,
            };
            break;
          }

          // === CATALOG: BIG DAISHOWA HOLDERS ===
          case "catalog_holder_lookup": {
            const hdTaper = params.taper;
            const hdDia = params.tool_diameter_mm;
            const hdType = params.type;
            if (hdTaper && hdDia != null) {
              result = { holders: findDaishowaHolders(hdTaper, hdDia, hdType), tapers: getAvailableTapers() };
            } else {
              let matches = BIG_DAISHOWA_HOLDERS;
              if (hdTaper) matches = matches.filter((h) => h.taper === hdTaper);
              if (hdType) matches = matches.filter((h) => h.type === hdType);
              if (hdDia != null) matches = matches.filter((h) => hdDia >= h.bore_range_mm[0] && hdDia <= h.bore_range_mm[1]);
              result = { count: matches.length, holders: matches.slice(0, params.limit ?? 20), tapers: getAvailableTapers() };
            }
            break;
          }
          case "catalog_holder_recommend": {
            const recTaper = params.taper;
            const recDia = params.tool_diameter_mm;
            const recRpm = params.required_rpm;
            const recType = params.type;
            if (!recTaper || recDia == null || recRpm == null) {
              return jsonResponse({ error: "catalog_holder_recommend requires 'taper', 'tool_diameter_mm', 'required_rpm'" });
            }
            const best = recommendDaishowaHolder(recTaper, recDia, recRpm, recType);
            result = best ? { recommendation: best } : { error: "No holder found matching criteria", tapers: getAvailableTapers() };
            break;
          }

          // === CATALOG: WORKHOLDING ===
          case "catalog_workholding_lookup": {
            const whModel = params.model || params.query;
            const whMinWidth = params.min_jaw_width_mm;
            const whPartWidth = params.part_width_mm;
            const whJawViseWidth = params.vise_width_mm;
            const whJawMaterial = params.jaw_material;
            if (whModel) {
              const vise = findVise(whModel);
              result = vise ? { vise } : { error: `No vise found matching '${whModel}'` };
            } else if (whJawViseWidth != null) {
              result = { soft_jaws: findSoftJaws(whJawViseWidth, whJawMaterial) };
            } else if (whMinWidth != null) {
              result = { vises: findVisesByJawWidth(whMinWidth) };
            } else if (whPartWidth != null) {
              result = { vises: findVisesByOpening(whPartWidth) };
            } else {
              result = { vises: ORANGE_VISE_SPECS };
            }
            break;
          }
          case "catalog_workholding_stats": {
            result = getWorkholdingSummary();
            break;
          }

          // ── Chart Data Generator ──
          case "chart_pareto": {
            const { chartDataGeneratorEngine: cge } = await import("../../engines/ChartDataGeneratorEngine.js");
            result = cge.paretoChart(params as any);
            break;
          }
          case "chart_waterfall": {
            const { chartDataGeneratorEngine: cge } = await import("../../engines/ChartDataGeneratorEngine.js");
            result = cge.waterfallChart(params as any);
            break;
          }
          case "chart_control": {
            const { chartDataGeneratorEngine: cge } = await import("../../engines/ChartDataGeneratorEngine.js");
            result = cge.controlChart(params as any);
            break;
          }
          case "chart_stability_lobe": {
            const { chartDataGeneratorEngine: cge } = await import("../../engines/ChartDataGeneratorEngine.js");
            result = cge.stabilityLobeChart(params as any);
            break;
          }
          case "chart_histogram": {
            const { chartDataGeneratorEngine: cge } = await import("../../engines/ChartDataGeneratorEngine.js");
            result = cge.histogramChart(params as any);
            break;
          }

          case "benchmark_run": {
            const { benchmarkReportGeneratorEngine } = await import("../../engines/BenchmarkReportGeneratorEngine.js");
            result = benchmarkReportGeneratorEngine.generateReport(params as any);
            break;
          }
          case "benchmark_report": {
            const { benchmarkReportGeneratorEngine: brge } = await import("../../engines/BenchmarkReportGeneratorEngine.js");
            result = { text: brge.generateTextReport(params as any) };
            break;
          }
          case "benchmark_scorecard": {
            const { benchmarkReportGeneratorEngine: brge2 } = await import("../../engines/BenchmarkReportGeneratorEngine.js");
            result = brge2.scorecard(params as any);
            break;
          }

          // ── BOX Data: AlarmDiagnosticsEngine ────────────────────────────
          case "alarm_fix_lookup": {
            const { alarmDiagnosticsEngine: ade } = await import("../../engines/AlarmDiagnosticsEngine.js");
            result = params.alarm_id ? ade.getFixProcedure(params.alarm_id) : ade.lookupAlarm(params.controller, params.code);
            break;
          }
          case "alarm_fix_search": {
            const { alarmDiagnosticsEngine: ade } = await import("../../engines/AlarmDiagnosticsEngine.js");
            result = ade.searchAlarms(params.query ?? params.q ?? "");
            break;
          }
          case "alarm_fix_summary": {
            const { alarmDiagnosticsEngine: ade } = await import("../../engines/AlarmDiagnosticsEngine.js");
            result = ade.getSummary();
            break;
          }

          // ── BOX Data: ShopToolLibraryEngine ───────────────────────────────
          case "shop_tool_list": {
            const { shopToolLibraryEngine: ste } = await import("../../engines/ShopToolLibraryEngine.js");
            result = params.category ? ste.getByCategory(params.category) : ste.loadAll();
            break;
          }
          case "shop_tool_search": {
            const { shopToolLibraryEngine: ste } = await import("../../engines/ShopToolLibraryEngine.js");
            result = params.diameter ? ste.getByDiameter(params.diameter, params.tolerance) : ste.search(params.query ?? "");
            break;
          }
          case "shop_tool_speed_feed": {
            const { shopToolLibraryEngine: ste } = await import("../../engines/ShopToolLibraryEngine.js");
            result = ste.getSpeedFeed(params.tool_number);
            break;
          }
          case "shop_tool_summary": {
            const { shopToolLibraryEngine: ste } = await import("../../engines/ShopToolLibraryEngine.js");
            result = ste.getSummary();
            break;
          }

          // ── BOX Data: ManufacturerCatalogIndexEngine ──────────────────────
          case "mfr_catalog_list": {
            const { manufacturerCatalogIndexEngine: mci } = await import("../../engines/ManufacturerCatalogIndexEngine.js");
            result = params.type === "workholding" ? mci.getWorkholding() : params.type === "models" ? mci.getMachineModels(params.manufacturer) : mci.getCatalogs(params);
            break;
          }
          case "mfr_catalog_search": {
            const { manufacturerCatalogIndexEngine: mci } = await import("../../engines/ManufacturerCatalogIndexEngine.js");
            result = params.product ? mci.searchByProduct(params.product) : mci.searchByManufacturer(params.manufacturer ?? params.query ?? "");
            break;
          }
          case "mfr_catalog_gaps": {
            const { manufacturerCatalogIndexEngine: mci } = await import("../../engines/ManufacturerCatalogIndexEngine.js");
            result = mci.getGaps();
            break;
          }
          case "mfr_catalog_summary": {
            const { manufacturerCatalogIndexEngine: mci } = await import("../../engines/ManufacturerCatalogIndexEngine.js");
            result = mci.getSummary();
            break;
          }

          // ── BOX Data: RawToolingNormalizerEngine ──────────────────────────
          case "raw_tooling_analyze": {
            const { rawToolingNormalizerEngine: rtn } = await import("../../engines/RawToolingNormalizerEngine.js");
            result = params.file ? rtn.analyzeFile(params.file) : rtn.getSummary();
            break;
          }
          case "raw_tooling_summary": {
            const { rawToolingNormalizerEngine: rtn } = await import("../../engines/RawToolingNormalizerEngine.js");
            result = rtn.getSummary();
            break;
          }

          // ── Tool Enrichment (SQ3-1-TOOL) ──
          case "tool_enrich_audit": {
            const { toolEnrichmentEngine } = await import("../../engines/ToolEnrichmentEngine.js");
            result = toolEnrichmentEngine.audit(params.tools ?? []);
            break;
          }
          case "tool_enrich_batch": {
            const { toolEnrichmentEngine } = await import("../../engines/ToolEnrichmentEngine.js");
            result = toolEnrichmentEngine.enrich(params.tools ?? [], {
              dry_run: params.dry_run ?? true,
              max_tools: params.max_tools,
            });
            break;
          }
          case "tool_enrich_validate": {
            const { toolEnrichmentEngine } = await import("../../engines/ToolEnrichmentEngine.js");
            result = toolEnrichmentEngine.validate(params.tools ?? []);
            break;
          }
          case "tool_enrich_holder_matrix": {
            const { toolEnrichmentEngine } = await import("../../engines/ToolEnrichmentEngine.js");
            result = toolEnrichmentEngine.holderMatrix(params.tools ?? [], {
              taper_filter: params.taper_filter,
            });
            break;
          }
          case "tool_enrich_summary": {
            const { toolEnrichmentEngine } = await import("../../engines/ToolEnrichmentEngine.js");
            result = toolEnrichmentEngine.summary(params.tools ?? []);
            break;
          }

          // ── BOX-MS0: Program Census, Parsing, Database ──────────────────
          case "box_census_scan": {
            const { boxProgramCensusEngine } = await import("../../engines/BoxProgramCensusEngine.js");
            result = boxProgramCensusEngine.scan({
              root_path: params.root_path as string | undefined,
              max_depth: params.max_depth as number | undefined,
              include_cad: params.include_cad as boolean | undefined,
              recent_years_only: params.recent_years_only as number | undefined,
              sections: params.sections as string[] | undefined,
            });
            break;
          }
          case "box_census_quick_count": {
            const { boxProgramCensusEngine } = await import("../../engines/BoxProgramCensusEngine.js");
            result = boxProgramCensusEngine.quickCount(params.root_path as string | undefined);
            break;
          }
          case "box_census_section": {
            const { boxProgramCensusEngine } = await import("../../engines/BoxProgramCensusEngine.js");
            result = boxProgramCensusEngine.scanSection(
              (params.section ?? params.section_name ?? "CNC LATHE") as string,
              params.root_path as string | undefined,
            );
            break;
          }
          case "box_parse_okuma": {
            const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");
            result = okumaOSPParserEngine.parse(
              (params.content ?? params.program ?? "") as string,
              (params.filename ?? "unknown.MIN") as string,
            );
            break;
          }
          case "box_parse_haas": {
            const { haasParserEngine } = await import("../../engines/HaasParserEngine.js");
            result = haasParserEngine.parse(
              (params.content ?? params.program ?? "") as string,
              (params.filename ?? "unknown.nc") as string,
            );
            break;
          }
          case "box_parse_hurco": {
            const { hurcoParserEngine } = await import("../../engines/HurcoParserEngine.js");
            result = hurcoParserEngine.parse(
              (params.content ?? params.program ?? "") as string,
              (params.filename ?? "unknown.nc") as string,
            );
            break;
          }
          case "box_parse_rokuroku": {
            const { rokuRokuParserEngine } = await import("../../engines/RokuRokuParserEngine.js");
            result = rokuRokuParserEngine.parse(
              (params.content ?? params.program ?? "") as string,
              (params.filename ?? "unknown.nc") as string,
            );
            break;
          }
          case "box_cad_index": {
            const { cadFileIndexEngine } = await import("../../engines/CadFileIndexEngine.js");
            const paths = (params.paths ?? params.root_paths ?? ["C:\\Users\\wompu\\Box\\AUTODESK INVENTOR CNC FILES"]) as string[];
            result = cadFileIndexEngine.index(paths);
            break;
          }
          case "box_post_analyze": {
            const { postProcessorAnalyzerEngine } = await import("../../engines/PostProcessorAnalyzerEngine.js");
            result = postProcessorAnalyzerEngine.analyzeDirectory(
              (params.dir_path ?? "C:\\Users\\wompu\\Box\\FUSION POST PROCESSORS") as string,
            );
            break;
          }
          case "box_db_add": {
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            if (Array.isArray(params.records)) {
              result = { added: programDatabaseEngine.addBatch(params.records), total: programDatabaseEngine.size };
            } else if (params.record) {
              programDatabaseEngine.addRecord(params.record as any);
              result = { added: 1, total: programDatabaseEngine.size };
            } else {
              result = { error: "Provide 'records' array or 'record' object" };
            }
            break;
          }
          case "box_db_query": {
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            result = programDatabaseEngine.query(params as any);
            break;
          }
          case "box_db_stats": {
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            result = programDatabaseEngine.getStats();
            break;
          }
          case "box_db_speed_feed_patterns": {
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            result = programDatabaseEngine.getSpeedFeedPatterns();
            break;
          }

          // ── BOX-MS1: Pattern Mining ─────────────────────────────────────
          case "box_mine_speed_feed": {
            const { speedFeedMinerEngine } = await import("../../engines/SpeedFeedMinerEngine.js");
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            const sfRecords = params.records ?? programDatabaseEngine.query(params as any);
            result = speedFeedMinerEngine.mine(sfRecords as any);
            break;
          }
          case "box_mine_speed_feed_compare": {
            const { speedFeedMinerEngine } = await import("../../engines/SpeedFeedMinerEngine.js");
            result = speedFeedMinerEngine.compareToBaseline(
              params.record as any,
              params.baseline as any,
            );
            break;
          }
          case "box_mine_tool_patterns": {
            const { toolPatternMinerEngine } = await import("../../engines/ToolPatternMinerEngine.js");
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            const tpRecords = params.records ?? programDatabaseEngine.query(params as any);
            result = toolPatternMinerEngine.mine(tpRecords as any);
            break;
          }
          case "box_mine_operation_sequences": {
            const { operationSequenceMinerEngine } = await import("../../engines/OperationSequenceMinerEngine.js");
            const { programDatabaseEngine } = await import("../../engines/ProgramDatabaseEngine.js");
            const osRecords = params.records ?? programDatabaseEngine.query(params as any);
            result = operationSequenceMinerEngine.mine(osRecords as any);
            break;
          }
          case "box_check_operation_order": {
            const { operationSequenceMinerEngine } = await import("../../engines/OperationSequenceMinerEngine.js");
            result = operationSequenceMinerEngine.checkOrder(
              (params.operations ?? []) as string[],
            );
            break;
          }

          // ── BOX-MS1: Okuma Dialect Knowledge ─────────────────────────
          case "box_okuma_dialect_search": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            result = okumaDialectKnowledgeEngine.search(params as any);
            break;
          }
          case "box_okuma_dialect_lookup_gcode": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            result = okumaDialectKnowledgeEngine.lookupGCode(String(params.code ?? params.gcode ?? ""));
            break;
          }
          case "box_okuma_dialect_lookup_mcode": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            result = okumaDialectKnowledgeEngine.lookupMCode(String(params.code ?? params.mcode ?? ""));
            break;
          }
          case "box_okuma_dialect_diffs": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            const critical = params.critical_only === true;
            result = critical
              ? okumaDialectKnowledgeEngine.getCriticalDiffs()
              : okumaDialectKnowledgeEngine.getDialectDiffs();
            break;
          }
          case "box_okuma_dialect_analyze": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            result = okumaDialectKnowledgeEngine.analyzeProgram(params.program as any);
            break;
          }
          case "box_okuma_dialect_stats": {
            const { okumaDialectKnowledgeEngine } = await import("../../engines/OkumaDialectKnowledgeEngine.js");
            result = okumaDialectKnowledgeEngine.stats();
            break;
          }

          // ── BOX-MS1: Macro + Safety Pattern Mining ───────────────────
          case "box_mine_macro_patterns": {
            const { macroPatternMinerEngine } = await import("../../engines/MacroPatternMinerEngine.js");
            result = macroPatternMinerEngine.mine(params.programs as any[]);
            break;
          }
          case "box_mine_safety_patterns": {
            const { safetyPatternMinerEngine } = await import("../../engines/SafetyPatternMinerEngine.js");
            result = safetyPatternMinerEngine.mine(params.programs as any[]);
            break;
          }
          case "box_check_program_safety": {
            const { safetyPatternMinerEngine } = await import("../../engines/SafetyPatternMinerEngine.js");
            result = safetyPatternMinerEngine.checkProgram(params.program as any, params.rules as any[]);
            break;
          }
          case "box_integrate_knowledge": {
            const { boxKnowledgeIntegrationEngine } = await import("../../engines/BoxKnowledgeIntegrationEngine.js");
            result = boxKnowledgeIntegrationEngine.integrate(params as any);
            break;
          }

          // ── BOX-MS2: Parametric Macro Conversion ─────────────────────
          case "box_generate_macro_header": {
            const { okumaMacroHeaderGeneratorEngine } = await import("../../engines/OkumaMacroHeaderGeneratorEngine.js");
            result = okumaMacroHeaderGeneratorEngine.generate(params as any);
            break;
          }
          case "box_generate_macro_header_minimal": {
            const { okumaMacroHeaderGeneratorEngine } = await import("../../engines/OkumaMacroHeaderGeneratorEngine.js");
            result = okumaMacroHeaderGeneratorEngine.generateMinimal(params as any);
            break;
          }
          case "box_get_standard_var": {
            const { okumaMacroHeaderGeneratorEngine } = await import("../../engines/OkumaMacroHeaderGeneratorEngine.js");
            result = { variable: okumaMacroHeaderGeneratorEngine.getStandardVar(String(params.purpose ?? "")) };
            break;
          }
          case "box_calc_auto_speed_feed": {
            const { autoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            result = autoSpeedFeedCalculatorEngine.calculate(params as any);
            break;
          }
          case "box_calc_rpm": {
            const { autoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            result = { rpm: autoSpeedFeedCalculatorEngine.calcRPM(
              Number(params.sfm), Number(params.diameter), (params.unit_system as any) ?? "imperial"
            )};
            break;
          }
          case "box_calc_finish_feed": {
            const { autoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            result = { feed: autoSpeedFeedCalculatorEngine.calcFinishFeed(
              Number(params.target_ra_um), Number(params.nose_radius), (params.unit_system as any) ?? "imperial"
            )};
            break;
          }
          case "box_calc_peck_schedule": {
            const { autoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            result = { schedule: autoSpeedFeedCalculatorEngine.calcPeckSchedule(
              Number(params.drill_diameter), Number(params.total_depth),
              (params.unit_system as any) ?? "imperial", params.material_group as any
            )};
            break;
          }
          case "box_scale_boring_bar_feed": {
            const { autoSpeedFeedCalculatorEngine } = await import("../../engines/AutoSpeedFeedCalculatorEngine.js");
            result = autoSpeedFeedCalculatorEngine.scaleBoringBarFeed(
              Number(params.feed), Number(params.bar_diameter), Number(params.bar_stickout)
            );
            break;
          }

          // ── BOX-MS2: Tool Substitution ───────────────────────────────
          case "box_substitute_boring_bar": {
            const { toolSubstitutionEngine } = await import("../../engines/ToolSubstitutionEngine.js");
            result = toolSubstitutionEngine.substituteBoringBar(params as any);
            break;
          }
          case "box_substitute_drill": {
            const { toolSubstitutionEngine } = await import("../../engines/ToolSubstitutionEngine.js");
            result = toolSubstitutionEngine.substituteDrill(params as any);
            break;
          }
          case "box_substitute_insert": {
            const { toolSubstitutionEngine } = await import("../../engines/ToolSubstitutionEngine.js");
            result = toolSubstitutionEngine.substituteInsert(params as any);
            break;
          }

          // ── BOX-MS2: Program Macro Converter ─────────────────────────
          case "box_convert_to_macro": {
            const { programMacroConverterEngine } = await import("../../engines/ProgramMacroConverterEngine.js");
            result = programMacroConverterEngine.convert(params as any);
            break;
          }
          case "box_scan_dimensions": {
            const { programMacroConverterEngine } = await import("../../engines/ProgramMacroConverterEngine.js");
            result = programMacroConverterEngine.scanDimensions(params.program as any, params as any);
            break;
          }
          case "box_scan_speed_feeds": {
            const { programMacroConverterEngine } = await import("../../engines/ProgramMacroConverterEngine.js");
            result = programMacroConverterEngine.scanSpeedFeeds(params.program as any);
            break;
          }

          // ── BOX-MS2: Macro Validation ────────────────────────────────
          case "box_validate_macro": {
            const { macroValidationEngine } = await import("../../engines/MacroValidationEngine.js");
            result = macroValidationEngine.validate(params as any);
            break;
          }
          case "box_evaluate_macro_vars": {
            const { macroValidationEngine } = await import("../../engines/MacroValidationEngine.js");
            result = macroValidationEngine.evaluateVariables(params.lines as string[], params.vars as any);
            break;
          }

          // ── BOX-MS2: Batch Conversion ────────────────────────────────
          case "box_batch_convert_macros": {
            const { batchMacroConversionEngine } = await import("../../engines/BatchMacroConversionEngine.js");
            result = batchMacroConversionEngine.convertBatch(params as any);
            break;
          }
          case "box_convert_single_macro": {
            const { batchMacroConversionEngine } = await import("../../engines/BatchMacroConversionEngine.js");
            result = batchMacroConversionEngine.convertSingle(
              params.program as any,
              (params.unit_system as any) ?? "imperial",
              Boolean(params.skip_validation),
            );
            break;
          }

          // ── BOX-MS4: Controller Knowledge & Post Processor ────────
          case "box_controller_db": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            result = params.family
              ? controllerKnowledgeDBEngine.getDatabase(params.family as any)
              : controllerKnowledgeDBEngine.listFamilies();
            break;
          }
          case "box_controller_search": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            result = controllerKnowledgeDBEngine.search(
              params.query as string ?? "",
              params.family as any,
            );
            break;
          }
          case "box_controller_lookup_gcode": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            result = controllerKnowledgeDBEngine.lookupGCode(
              params.code as string,
              params.family as any,
            );
            break;
          }
          case "box_controller_lookup_mcode": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            result = controllerKnowledgeDBEngine.lookupMCode(
              params.code as string,
              params.family as any,
            );
            break;
          }
          case "box_controller_compare_dialects": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            result = controllerKnowledgeDBEngine.compareDialects(
              params.family_a as any,
              params.family_b as any,
            );
            break;
          }
          case "box_post_trainer": {
            const { postProcessorTrainerEngine } = await import("../../engines/PostProcessorTrainerEngine.js");
            result = postProcessorTrainerEngine.train({
              reference_lines: params.reference_lines as string[],
              generated_lines: params.generated_lines as string[],
              controller: params.controller as any,
            });
            break;
          }
          case "box_fusion_post_sync": {
            const { fusionPostSyncEngine } = await import("../../engines/FusionPostSyncEngine.js");
            result = fusionPostSyncEngine.analyze({
              cps_content: params.cps_content as string,
              filename: params.filename as string,
            });
            break;
          }

          // ── BOX-MS3: Physics Optimization ─────────────────────────
          case "box_resolve_material": {
            const { materialResolverForProgramsEngine } = await import("../../engines/MaterialResolverForProgramsEngine.js");
            result = materialResolverForProgramsEngine.resolve({
              program: params.program as any,
              customer_name: params.customer_name as string | undefined,
              unit_system: (params.unit_system as any) ?? "imperial",
            });
            break;
          }
          case "box_resolve_tools": {
            const { toolResolverForProgramsEngine } = await import("../../engines/ToolResolverForProgramsEngine.js");
            result = toolResolverForProgramsEngine.resolveAll({
              program: params.program as any,
              unit_system: (params.unit_system as any) ?? "imperial",
            });
            break;
          }
          case "box_optimize_program": {
            const { programPhysicsOptimizerEngine } = await import("../../engines/ProgramPhysicsOptimizerEngine.js");
            result = programPhysicsOptimizerEngine.optimize({
              program: params.program as any,
              unit_system: (params.unit_system as any) ?? "imperial",
              machine_max_power_kw: params.machine_max_power_kw as number | undefined,
              machine_max_rpm: params.machine_max_rpm as number | undefined,
              target_tool_life_min: params.target_tool_life_min as number | undefined,
              customer_name: params.customer_name as string | undefined,
            });
            break;
          }
          case "box_safety_check": {
            const { safetyGateForOptimizationEngine } = await import("../../engines/SafetyGateForOptimizationEngine.js");
            result = safetyGateForOptimizationEngine.check(params as any);
            break;
          }
          case "box_generate_opt_report": {
            const { programPhysicsOptimizerEngine } = await import("../../engines/ProgramPhysicsOptimizerEngine.js");
            const { optimizationReportGeneratorEngine } = await import("../../engines/OptimizationReportGeneratorEngine.js");
            const optResult = programPhysicsOptimizerEngine.optimize({
              program: params.program as any,
              unit_system: (params.unit_system as any) ?? "imperial",
              machine_max_power_kw: params.machine_max_power_kw as number | undefined,
              machine_max_rpm: params.machine_max_rpm as number | undefined,
            });
            result = optimizationReportGeneratorEngine.generate(
              params.filename as string ?? "program",
              optResult,
            );
            break;
          }
          case "box_batch_optimize": {
            const { batchPhysicsOptimizationEngine } = await import("../../engines/BatchPhysicsOptimizationEngine.js");
            result = batchPhysicsOptimizationEngine.optimizeBatch({
              programs: params.programs as any[],
              unit_system: (params.unit_system as any) ?? "imperial",
              machine_max_power_kw: params.machine_max_power_kw as number | undefined,
              machine_max_rpm: params.machine_max_rpm as number | undefined,
              max_programs: params.max_programs as number | undefined,
              sort_by: params.sort_by as any,
              customer_name: params.customer_name as string | undefined,
            });
            break;
          }

          // ── BOX-MS5: Gap Actions ────────────────────────────────
          case "box_validate_program": {
            const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");
            const content = (params.content ?? params.program ?? "") as string;
            const filename = (params.filename ?? "unknown.MIN") as string;
            const controller = (params.controller ?? "okuma") as string;
            try {
              if (controller === "okuma") {
                const parsed = okumaOSPParserEngine.parse(content, filename);
                const safety = okumaOSPParserEngine.validateSafety(parsed);
                result = {
                  valid: safety.every(s => s.severity !== "critical"),
                  filename,
                  controller,
                  line_count: parsed.lineCount,
                  tool_count: parsed.toolSections.length,
                  has_threading: parsed.hasThreading,
                  has_bar_feeder: parsed.hasBarFeeder,
                  has_c_axis: parsed.hasCAxis,
                  safety_findings: safety,
                  critical_count: safety.filter(s => s.severity === "critical").length,
                  warning_count: safety.filter(s => s.severity === "warning").length,
                };
              } else if (controller === "haas") {
                const { haasParserEngine } = await import("../../engines/HaasParserEngine.js");
                const parsed = haasParserEngine.parse(content, filename);
                result = { valid: true, filename, controller, line_count: parsed.lineCount, parsed_ok: true };
              } else if (controller === "hurco") {
                const { hurcoParserEngine } = await import("../../engines/HurcoParserEngine.js");
                const parsed = hurcoParserEngine.parse(content, filename);
                result = { valid: true, filename, controller, line_count: parsed.lineCount, parsed_ok: true };
              } else {
                result = { error: `Unsupported controller: ${controller}. Use okuma, haas, or hurco.` };
              }
            } catch (parseErr: any) {
              result = { valid: false, filename, controller, error: parseErr.message };
            }
            break;
          }
          case "box_extract_operations": {
            const content = (params.content ?? params.program ?? "") as string;
            const filename = (params.filename ?? "unknown.MIN") as string;
            const controller = (params.controller ?? "okuma") as string;
            if (controller === "okuma") {
              const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");
              const parsed = okumaOSPParserEngine.parse(content, filename);
              result = {
                filename,
                controller,
                operations: parsed.operations,
                tool_sections: parsed.toolSections.map(ts => ({
                  station: ts.toolNumber,
                  tool_code: ts.toolCode,
                  comment: ts.comment,
                  speed_mode: ts.speedMode,
                  css_value: ts.cssValue,
                  rpm_value: ts.rpmValue,
                  max_rpm: ts.maxRPM,
                  operations: ts.operations.map(op => op.type),
                })),
                summary: {
                  total_tools: parsed.toolSections.length,
                  total_operations: parsed.operations.length,
                  op_types: [...new Set(parsed.operations.map(op => op.type))],
                },
              };
            } else {
              result = { error: `Operation extraction currently supported for Okuma only` };
            }
            break;
          }
          case "box_controller_capability": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            const family = (params.family ?? params.controller ?? "okuma") as any;
            const db = controllerKnowledgeDBEngine.getDatabase(family);
            const safetyCodes = controllerKnowledgeDBEngine.getSafetyCodes(family);
            const postNotes = controllerKnowledgeDBEngine.getPostNotes(family);
            result = {
              family: db.family,
              controller_model: db.controller_model,
              machines: db.machines,
              capabilities: {
                total_gcodes: db.gcodes.length,
                total_mcodes: db.mcodes.length,
                has_canned_cycles: (db.canned_cycles?.length ?? 0) > 0,
                canned_cycle_count: db.canned_cycles?.length ?? 0,
                variable_systems: db.variables.map(v => v.prefix),
                safety_codes: safetyCodes,
                dialect_quirks: db.dialect_quirks ?? [],
              },
              post_notes: postNotes,
            };
            break;
          }
          case "box_controller_safety_codes": {
            const { controllerKnowledgeDBEngine } = await import("../../engines/ControllerKnowledgeDBEngine.js");
            const family = (params.family ?? params.controller ?? "okuma") as any;
            result = {
              family,
              safety_codes: controllerKnowledgeDBEngine.getSafetyCodes(family),
              post_notes: controllerKnowledgeDBEngine.getPostNotes(family),
            };
            break;
          }
          case "box_calibrate_from_shop": {
            const { boxKnowledgeIntegrationEngine } = await import("../../engines/BoxKnowledgeIntegrationEngine.js");
            const integrationResult = boxKnowledgeIntegrationEngine.integrate({
              speed_feed: params.speed_feed_data as any,
              tool_patterns: params.tool_data as any,
              sequences: params.sequence_data as any,
              macros: params.macro_data as any,
              safety: params.safety_data as any,
            });
            result = {
              calibration_entries: integrationResult.calibration_entries,
              stats: integrationResult.integration_stats,
              note: "Calibration entries are physics-corrected from shop data. Amateur S/F values are NOT used as targets — only structural patterns inform calibration.",
            };
            break;
          }
          case "box_full_program_audit": {
            // Full pipeline: parse → resolve material/tools → optimize → safety check → report
            const content = (params.content ?? params.program ?? "") as string;
            const filename = (params.filename ?? "unknown.MIN") as string;
            const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");
            const { materialResolverForProgramsEngine } = await import("../../engines/MaterialResolverForProgramsEngine.js");
            const { toolResolverForProgramsEngine } = await import("../../engines/ToolResolverForProgramsEngine.js");
            const { programPhysicsOptimizerEngine } = await import("../../engines/ProgramPhysicsOptimizerEngine.js");
            const { optimizationReportGeneratorEngine } = await import("../../engines/OptimizationReportGeneratorEngine.js");
            const parsed = okumaOSPParserEngine.parse(content, filename);
            const safety = okumaOSPParserEngine.validateSafety(parsed);
            const material = materialResolverForProgramsEngine.resolve({
              program: parsed,
              customer_name: params.customer_name as string | undefined,
              unit_system: (params.unit_system as any) ?? "imperial",
            });
            const tools = toolResolverForProgramsEngine.resolveAll({
              program: parsed,
              unit_system: (params.unit_system as any) ?? "imperial",
            });
            const optimized = programPhysicsOptimizerEngine.optimize({
              program: parsed,
              unit_system: (params.unit_system as any) ?? "imperial",
              machine_max_power_kw: params.machine_max_power_kw as number | undefined,
              machine_max_rpm: params.machine_max_rpm as number | undefined,
            });
            const report = optimizationReportGeneratorEngine.generate(filename, optimized);
            result = {
              filename,
              parsing: { line_count: parsed.lineCount, tool_count: parsed.toolSections.length, safety_findings: safety },
              material,
              tools: tools.summary,
              optimization: report.summary,
              report_text: report.text_report,
            };
            break;
          }

          // ── BOX-MS6: Fusion 360 cloud extraction ──────────────────
          case "box_fusion_connect": {
            const { FusionCloudConnectorEngine } = await import("../../engines/FusionCloudConnectorEngine.js");
            const connector = new FusionCloudConnectorEngine({ mode: (params.mode as any) ?? "auto" });
            result = await connector.checkConnection();
            break;
          }

          case "box_fusion_list_projects": {
            const { fusionCloudConnectorEngine } = await import("../../engines/FusionCloudConnectorEngine.js");
            await fusionCloudConnectorEngine.checkConnection();
            result = await fusionCloudConnectorEngine.listProjects();
            break;
          }

          case "box_fusion_crawl_project": {
            const { fusionCloudConnectorEngine } = await import("../../engines/FusionCloudConnectorEngine.js");
            const { fusionProjectCrawlerEngine } = await import("../../engines/FusionProjectCrawlerEngine.js");
            await fusionCloudConnectorEngine.checkConnection();
            result = await fusionProjectCrawlerEngine.crawl(
              fusionCloudConnectorEngine,
              (params.project_index as number) ?? 0,
              { maxDepth: (params.max_depth as number) ?? 5, extractMetadata: params.extract_metadata !== false },
            );
            break;
          }

          case "box_fusion_extract_cam": {
            const { fusionCloudConnectorEngine } = await import("../../engines/FusionCloudConnectorEngine.js");
            const { fusionCAMExtractorEngine } = await import("../../engines/FusionCAMExtractorEngine.js");
            await fusionCloudConnectorEngine.checkConnection();
            const files = (params.files ?? []) as Array<{ id: string; name: string }>;
            result = await fusionCAMExtractorEngine.batchExtract(
              fusionCloudConnectorEngine,
              (params.project_index as number) ?? 0,
              files,
            );
            break;
          }

          case "box_fusion_extract_tools": {
            const { fusionToolLibraryExtractorEngine } = await import("../../engines/FusionToolLibraryExtractorEngine.js");
            const camTools = (params.cam_tools ?? []) as Array<{
              tool: { description: string; type: string; diameter_mm: number; flute_count: number };
              program: string;
              speed_feed?: { rpm: number; feed_mm_min: number; stepdown_mm?: number; stepover_mm?: number };
            }>;
            result = fusionToolLibraryExtractorEngine.buildFromCAMData(
              camTools,
              (params.library_name as string) ?? "JM Die Shop Library",
            );
            break;
          }

          case "box_fusion_setup_doc": {
            const { fusionSetupDocumentEngine } = await import("../../engines/FusionSetupDocumentEngine.js");
            const extraction = params.extraction as any;
            const doc = fusionSetupDocumentEngine.generate(extraction);
            const text = (params.render_text !== false) ? fusionSetupDocumentEngine.renderText(doc) : null;
            result = { document: doc, text_report: text };
            break;
          }

          // ── BOX-MS7: Calculator page — program upload + tool callout ─
          case "box_upload_analyze": {
            const { programUploadAnalyzerEngine } = await import("../../engines/ProgramUploadAnalyzerEngine.js");
            result = await programUploadAnalyzerEngine.analyze(
              (params.content ?? "") as string,
              (params.filename ?? "unknown.nc") as string,
            );
            break;
          }

          case "box_tool_callouts": {
            const { toolCalloutCardEngine } = await import("../../engines/ToolCalloutCardEngine.js");
            result = toolCalloutCardEngine.generate({
              tools: (params.tools ?? []) as any[],
              speed_feeds: (params.speed_feeds ?? []) as any[],
              material: (params.material as string) ?? null,
              machine_type: (params.machine_type as string) ?? null,
              unit_system: (params.unit_system as any) ?? "imperial",
            });
            break;
          }

          case "box_program_memory_save": {
            const { programMemoryEngine } = await import("../../engines/ProgramMemoryEngine.js");
            // U-PPL-D2: resolve a blueprint pointer if the operator supplied one
            // explicitly OR if a program_path is given and auto_link != false.
            let linkInfo: { path: string; confidence: string; page?: number } | null = null;
            const explicitPath = (params.linked_blueprint_path ?? null) as string | null;
            const explicitConf = (params.linked_blueprint_confidence ?? null) as string | null;
            const explicitPage = (params.linked_blueprint_page ?? undefined) as number | undefined;
            if (explicitPath && explicitConf) {
              linkInfo = {
                path: explicitPath,
                confidence: explicitConf,
                ...(explicitPage !== undefined ? { page: explicitPage } : {}),
              };
            } else if (
              (params.auto_link === undefined || params.auto_link === true) &&
              params.program_path
            ) {
              try {
                linkInfo = await resolveAutoLink(
                  params.program_path as string,
                  (params.join_jsonl_path ?? undefined) as string | undefined,
                  (params.input_program_paths ?? undefined) as string[] | undefined,
                );
              } catch (err) {
                // FAIL-LOUD on link-index unreadable (caller asked for auto-link but
                // index is missing/corrupt) — log + still complete the save.
                log.warn(
                  `[box_program_memory_save] auto-link failed for ${String(params.program_path)}: ` +
                    `${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
            result = programMemoryEngine.save(
              (params.customer ?? "") as string,
              (params.part_number ?? "") as string,
              (params.filename ?? "") as string,
              (params.dialect ?? "unknown") as string,
              (params.assignments ?? []) as any[],
              linkInfo,
            );
            break;
          }

          case "box_program_memory_recall": {
            const { programMemoryEngine } = await import("../../engines/ProgramMemoryEngine.js");
            result = programMemoryEngine.recall(
              (params.customer ?? "") as string,
              (params.part_number ?? "") as string,
            );
            break;
          }

          case "box_program_memory_defaults": {
            const { programMemoryEngine } = await import("../../engines/ProgramMemoryEngine.js");
            result = programMemoryEngine.getDefaults();
            break;
          }

          case "box_program_memory_stats": {
            const { programMemoryEngine } = await import("../../engines/ProgramMemoryEngine.js");
            result = programMemoryEngine.getStats();
            break;
          }

          case "box_program_memory_link_print": {
            const { programMemoryEngine } = await import("../../engines/ProgramMemoryEngine.js");
            const customer = (params.customer ?? "") as string;
            const partNumber = (params.part_number ?? "") as string;
            const mode = ((params.mode ?? "auto") as "explicit" | "auto" | "clear");
            if (mode === "clear") {
              result = programMemoryEngine.linkPrint(customer, partNumber, null);
              break;
            }
            if (mode === "explicit") {
              const path = (params.linked_blueprint_path ?? "") as string;
              const confidence = (params.linked_blueprint_confidence ?? "") as string;
              const page = (params.linked_blueprint_page ?? undefined) as number | undefined;
              if (!path || !confidence) {
                throw new Error(
                  "[box_program_memory_link_print] mode=explicit requires linked_blueprint_path AND linked_blueprint_confidence",
                );
              }
              result = programMemoryEngine.linkPrint(customer, partNumber, {
                path,
                confidence,
                ...(page !== undefined ? { page } : {}),
              });
              break;
            }
            // mode=auto
            const programPath = (params.program_path ?? "") as string;
            if (!programPath) {
              throw new Error(
                "[box_program_memory_link_print] mode=auto requires program_path",
              );
            }
            // A missing/corrupt/empty join file must NOT escalate to a dispatcher
            // error in auto mode — it's a miss, not a caller bug. Treat any
            // failure as "no link found" (return unchanged record).
            let autoLink: { path: string; confidence: string; page?: number } | null = null;
            try {
              autoLink = await resolveAutoLink(
                programPath,
                (params.join_jsonl_path ?? undefined) as string | undefined,
                (params.input_program_paths ?? undefined) as string[] | undefined,
              );
            } catch (err) {
              log.warn(
                `[box_program_memory_link_print] auto-mode load failed for ${programPath}: ` +
                  `${err instanceof Error ? err.message : String(err)}`,
              );
              result = programMemoryEngine.recall(customer, partNumber);
              break;
            }
            if (!autoLink) {
              // Lookup miss != operator clear. Return unchanged record without
              // mutating (linkPrint(..., null) would CLEAR — wrong here).
              result = programMemoryEngine.recall(customer, partNumber);
              break;
            }
            result = programMemoryEngine.linkPrint(customer, partNumber, autoLink);
            break;
          }

          // ── BOX-MS8: Wire EDM parsing + mill pattern mining ───────
          case "box_parse_wedm": {
            const { wireEDMProgramParserEngine } = await import("../../engines/WireEDMProgramParserEngine.js");
            const content = (params.content ?? "") as string;
            const filename = (params.filename ?? "unknown.nc") as string;
            result = wireEDMProgramParserEngine.parse(content, filename);
            break;
          }

          case "box_mine_mill_patterns": {
            const { millPatternMinerEngine } = await import("../../engines/MillPatternMinerEngine.js");
            const programs = (params.programs ?? []) as Array<{
              filename: string;
              controller: "haas" | "hurco" | "rokuroku";
              parsed: any;
            }>;
            result = millPatternMinerEngine.mineAll(programs);
            break;
          }

          // ── QCMG-WIRE-MS0: 14 unwired quality/controller/material/grinding engines ──
          case "cmm_history_add": {
            const { CMMHistoryEngine } = await import("../../engines/CMMHistoryEngine.js");
            result = CMMHistoryEngine.addRecord(params as any);
            break;
          }
          case "cmm_history_trend": {
            const { CMMHistoryEngine } = await import("../../engines/CMMHistoryEngine.js");
            const p = params as any;
            result = CMMHistoryEngine.getFeatureTrend(p.partNumber, p.featureName, p.limit);
            break;
          }
          case "cmm_history_features": {
            const { CMMHistoryEngine } = await import("../../engines/CMMHistoryEngine.js");
            result = { features: CMMHistoryEngine.getPartFeatures((params as any).partNumber) };
            break;
          }
          case "cmm_history_alerts": {
            const { CMMHistoryEngine } = await import("../../engines/CMMHistoryEngine.js");
            result = { alerts: CMMHistoryEngine.getActiveAlerts((params as any).partNumber) };
            break;
          }
          case "cmm_history_stats": {
            const { CMMHistoryEngine } = await import("../../engines/CMMHistoryEngine.js");
            result = CMMHistoryEngine.getHistoryStats();
            break;
          }
          case "cmm_import_data": {
            const { CMMImportEngine } = await import("../../engines/CMMImportEngine.js");
            const p = params as any;
            result = CMMImportEngine.importData(p.content, p.format, p.metadata);
            break;
          }
          case "cmm_import_get": {
            const { CMMImportEngine } = await import("../../engines/CMMImportEngine.js");
            result = CMMImportEngine.getImportResult((params as any).id);
            break;
          }
          case "cmm_import_list": {
            const { CMMImportEngine } = await import("../../engines/CMMImportEngine.js");
            result = { imports: CMMImportEngine.listByPartNumber((params as any).partNumber) };
            break;
          }
          case "cmm_import_formats": {
            const { CMMImportEngine } = await import("../../engines/CMMImportEngine.js");
            result = { formats: CMMImportEngine.getSupportedFormats() };
            break;
          }
          case "cmm_import_validate": {
            const { CMMImportEngine } = await import("../../engines/CMMImportEngine.js");
            result = CMMImportEngine.validateImport((params as any).id);
            break;
          }
          case "spc_feedback_evaluate": {
            const { spcFeedbackLoopEngine } = await import("../../engines/SPCFeedbackLoopEngine.js");
            result = spcFeedbackLoopEngine.evaluate(params as any);
            break;
          }
          case "controller_knowledge_get": {
            const { controllerKnowledgeEngine } = await import("../../engines/ControllerKnowledgeEngine.js");
            result = controllerKnowledgeEngine.getProfile((params as any).family);
            break;
          }
          case "controller_knowledge_list": {
            const { getAvailableControllers } = await import("../../engines/ControllerKnowledgeEngine.js");
            result = { controllers: getAvailableControllers() };
            break;
          }
          case "controller_knowledge_compare": {
            const { controllerKnowledgeEngine } = await import("../../engines/ControllerKnowledgeEngine.js");
            const p = params as any;
            result = controllerKnowledgeEngine.compare(p.source, p.target);
            break;
          }
          case "hook_controller_compute": {
            const { hookControllerEngine } = await import("../../engines/HookControllerEngine.js");
            result = hookControllerEngine.compute(params as any);
            break;
          }
          case "hook_controller_get_setpoint": {
            const { hookControllerEngine } = await import("../../engines/HookControllerEngine.js");
            result = { setpoint: hookControllerEngine.getSetpoint() };
            break;
          }
          case "hook_controller_set_setpoint": {
            const { hookControllerEngine } = await import("../../engines/HookControllerEngine.js");
            hookControllerEngine.setSetpoint((params as any).value);
            result = { ok: true };
            break;
          }
          case "hook_controller_gains": {
            const { hookControllerEngine } = await import("../../engines/HookControllerEngine.js");
            result = hookControllerEngine.getGains();
            break;
          }
          case "fusion_material_find": {
            const { fusionMaterialBridgeEngine } = await import("../../engines/FusionMaterialBridgeEngine.js");
            result = fusionMaterialBridgeEngine.findMaterial((params as any).query);
            break;
          }
          case "fusion_material_iso": {
            const { fusionMaterialBridgeEngine } = await import("../../engines/FusionMaterialBridgeEngine.js");
            result = { iso: fusionMaterialBridgeEngine.mapToISO((params as any).fusionMaterialName) };
            break;
          }
          case "fusion_material_cutting": {
            const { fusionMaterialBridgeEngine } = await import("../../engines/FusionMaterialBridgeEngine.js");
            result = fusionMaterialBridgeEngine.getCuttingRecommendation((params as any).materialId);
            break;
          }
          case "fusion_material_list_iso": {
            const { fusionMaterialBridgeEngine } = await import("../../engines/FusionMaterialBridgeEngine.js");
            result = { materials: fusionMaterialBridgeEngine.listByISO((params as any).iso) };
            break;
          }
          case "material_cert_register": {
            const { materialCertTraceabilityEngine } = await import("../../engines/MaterialCertTraceabilityEngine.js");
            result = materialCertTraceabilityEngine.registerCert(params as any);
            break;
          }
          case "material_cert_assign": {
            const { materialCertTraceabilityEngine } = await import("../../engines/MaterialCertTraceabilityEngine.js");
            result = materialCertTraceabilityEngine.assignStock(params as any);
            break;
          }
          case "material_cert_link_program": {
            const { materialCertTraceabilityEngine } = await import("../../engines/MaterialCertTraceabilityEngine.js");
            result = materialCertTraceabilityEngine.linkProgram(params as any);
            break;
          }
          case "material_cert_record_inspection": {
            const { materialCertTraceabilityEngine } = await import("../../engines/MaterialCertTraceabilityEngine.js");
            result = materialCertTraceabilityEngine.recordInspection(params as any);
            break;
          }
          case "material_db_bridge_query": {
            const { materialDatabaseBridgeEngine } = await import("../../engines/MaterialDatabaseBridgeEngine.js");
            result = await materialDatabaseBridgeEngine.query(params as any);
            break;
          }
          case "material_db_bridge_get": {
            const { materialDatabaseBridgeEngine } = await import("../../engines/MaterialDatabaseBridgeEngine.js");
            result = await materialDatabaseBridgeEngine.getMaterial((params as any).id);
            break;
          }
          case "material_db_bridge_by_type": {
            const { materialDatabaseBridgeEngine } = await import("../../engines/MaterialDatabaseBridgeEngine.js");
            result = await materialDatabaseBridgeEngine.getByType((params as any).type);
            break;
          }
          case "material_db_get": {
            const { materialDatabaseEngine } = await import("../../engines/MaterialDatabaseEngine.js");
            result = materialDatabaseEngine.getMaterial((params as any).idOrAlias);
            break;
          }
          case "material_db_search": {
            const { materialDatabaseEngine } = await import("../../engines/MaterialDatabaseEngine.js");
            result = { matches: materialDatabaseEngine.search((params as any).query) };
            break;
          }
          case "material_db_by_category": {
            const { materialDatabaseEngine } = await import("../../engines/MaterialDatabaseEngine.js");
            result = { materials: materialDatabaseEngine.getByCategory((params as any).category) };
            break;
          }
          case "material_db_kienzle": {
            const { materialDatabaseEngine } = await import("../../engines/MaterialDatabaseEngine.js");
            result = materialDatabaseEngine.getKienzleCoefficients((params as any).material);
            break;
          }
          case "material_stock_create": {
            const { materialStockEngine } = await import("../../engines/MaterialStockEngine.js");
            result = materialStockEngine.create(params as any);
            break;
          }
          case "material_stock_get": {
            const { materialStockEngine } = await import("../../engines/MaterialStockEngine.js");
            result = materialStockEngine.get((params as any).itemId);
            break;
          }
          case "material_stock_update": {
            const { materialStockEngine } = await import("../../engines/MaterialStockEngine.js");
            const p = params as any;
            result = materialStockEngine.update(p.itemId, p.updates);
            break;
          }
          case "material_stock_adjust": {
            const { materialStockEngine } = await import("../../engines/MaterialStockEngine.js");
            const p = params as any;
            result = materialStockEngine.adjustStock(p.itemId, p.delta, p.reason);
            break;
          }
          case "pdf_material_save": {
            const { pdfMaterialPropertyExtractionEngine } = await import("../../engines/PDFMaterialPropertyExtractionEngine.js");
            await pdfMaterialPropertyExtractionEngine.saveExtracted((params as any).pdfId);
            result = { saved: true };
            break;
          }
          case "pdf_material_stats": {
            const { pdfMaterialPropertyExtractionEngine } = await import("../../engines/PDFMaterialPropertyExtractionEngine.js");
            result = pdfMaterialPropertyExtractionEngine.getStats();
            break;
          }
          case "grinding_lora_cadence_config": {
            const { grindingLoRACadenceEngine } = await import("../../engines/GrindingLoRACadenceEngine.js");
            const p = params as any;
            if (p && Object.keys(p).length > 0) result = grindingLoRACadenceEngine.setConfig(p);
            else result = grindingLoRACadenceEngine.getConfig();
            break;
          }
          case "grinding_lora_cadence_state": {
            const { grindingLoRACadenceEngine } = await import("../../engines/GrindingLoRACadenceEngine.js");
            result = grindingLoRACadenceEngine.getState();
            break;
          }
          case "grinding_lora_cadence_record": {
            const { grindingLoRACadenceEngine } = await import("../../engines/GrindingLoRACadenceEngine.js");
            result = { total: grindingLoRACadenceEngine.recordJobs((params as any).n) };
            break;
          }
          case "grinding_lora_dataset_build": {
            const { grindingLoRADatasetBuilderEngine } = await import("../../engines/GrindingLoRADatasetBuilderEngine.js");
            const p = params as any;
            result = grindingLoRADatasetBuilderEngine.buildDataset(p.jobs, p.split);
            break;
          }
          case "grinding_lora_dataset_schema": {
            const { grindingLoRADatasetBuilderEngine } = await import("../../engines/GrindingLoRADatasetBuilderEngine.js");
            result = grindingLoRADatasetBuilderEngine.requiredSchema();
            break;
          }
          case "grinding_replacement_evaluate": {
            const { grindingReplacementEngine } = await import("../../engines/GrindingReplacementEngine.js");
            result = grindingReplacementEngine.evaluate(params as any);
            break;
          }
          case "grinding_replacement_stats": {
            const { grindingReplacementEngine } = await import("../../engines/GrindingReplacementEngine.js");
            result = grindingReplacementEngine.getStats();
            break;
          }

          // ENGINE-WIRE-MS0/U-WIRE06: 5 tool data plane engines
          case "tool_holder_catalog_search": {
            const { toolHolderCatalogEngine } = await import("../../engines/ToolHolderCatalogEngine.js");
            result = toolHolderCatalogEngine.search(
              params as unknown as Parameters<typeof toolHolderCatalogEngine.search>[0],
            );
            break;
          }
          case "tool_holder_registry_query": {
            const { toolHolderRegistryEngine } = await import("../../engines/ToolHolderRegistryEngine.js");
            result = toolHolderRegistryEngine.query(
              params as unknown as Parameters<typeof toolHolderRegistryEngine.query>[0],
            );
            break;
          }
          case "tool_geometry_select": {
            const { toolGeometrySelectionEngine } = await import("../../engines/ToolGeometrySelectionEngine.js");
            result = toolGeometrySelectionEngine.calculate(
              params as unknown as Parameters<typeof toolGeometrySelectionEngine.calculate>[0],
            );
            break;
          }
          case "tool_coating_select": {
            const { toolCoatingSelectionEngine } = await import("../../engines/ToolCoatingSelectionEngine.js");
            result = toolCoatingSelectionEngine.calculate(
              params as unknown as Parameters<typeof toolCoatingSelectionEngine.calculate>[0],
            );
            break;
          }
          case "tool_assembly_build": {
            const { toolAssemblyModelEngine } = await import("../../engines/ToolAssemblyModelEngine.js");
            const p = params as { tool: unknown; holder?: unknown; spindle?: unknown };
            result = toolAssemblyModelEngine.buildAssembly(
              p.tool as Parameters<typeof toolAssemblyModelEngine.buildAssembly>[0],
              p.holder as Parameters<typeof toolAssemblyModelEngine.buildAssembly>[1],
              p.spindle as Parameters<typeof toolAssemblyModelEngine.buildAssembly>[2],
            );
            break;
          }

          // ENGINE-WIRE-MS0/U-WIRE07: 5 material+tool engines
          case "material_equivalent_lookup": {
            const { materialEquivalenceEngine } = await import("../../engines/MaterialEquivalenceEngine.js");
            result = materialEquivalenceEngine.findEquivalent(
              params as unknown as Parameters<typeof materialEquivalenceEngine.findEquivalent>[0],
            );
            break;
          }
          case "material_selection_recommend": {
            const { materialSelectionEngine } = await import("../../engines/MaterialSelectionEngine.js");
            result = materialSelectionEngine.recommend(
              params as unknown as Parameters<typeof materialSelectionEngine.recommend>[0],
            );
            break;
          }
          case "material_interpolation_find": {
            const { materialInterpolationEngine } = await import("../../engines/MaterialInterpolationEngine.js");
            const p = params as { material_name: string; known_tensile_MPa?: number; known_hardness_HRC?: number; safety_factor?: number; top_n?: number };
            const knownProps = (p.known_tensile_MPa !== undefined || p.known_hardness_HRC !== undefined)
              ? { tensile_strength_MPa: p.known_tensile_MPa, hardness_HRC: p.known_hardness_HRC }
              : undefined;
            result = materialInterpolationEngine.interpolateParams(p.material_name, knownProps, p.safety_factor);
            break;
          }
          case "tool_db_bridge_query": {
            const { toolDatabaseBridgeEngine } = await import("../../engines/ToolDatabaseBridgeEngine.js");
            // U-WIRE07 fix: ToolQuery uses camelCase fields (minDiameter/maxDiameter) but MCP
            // callers send snake_case; paramNormalizer aliases do not cover these. Map
            // snake -> camel here so the engine's filter actually runs.
            const p = params as Record<string, unknown>;
            result = await toolDatabaseBridgeEngine.query({
              type: p.type as string | undefined,
              manufacturer: p.manufacturer as string | undefined,
              minDiameter: (p.minDiameter ?? p.min_diameter) as number | undefined,
              maxDiameter: (p.maxDiameter ?? p.max_diameter) as number | undefined,
              limit: p.limit as number | undefined,
            });
            break;
          }
          case "tool_catalog_adaptive_recommend": {
            const { toolCatalogAdaptiveEngine } = await import("../../engines/ToolCatalogAdaptiveEngine.js");
            const p = params as {
              material: "steel" | "stainless" | "cast_iron" | "aluminum" | "titanium" | "superalloy";
              operation: "roughing" | "finishing";
              target_capability_score: number;
              current_tool_diameter_mm?: number;
              current_tool_flutes?: number;
              current_tool_coating?: string;
              max_diameter_mm?: number;
              min_diameter_mm?: number;
              required_coating?: string;
            };
            result = toolCatalogAdaptiveEngine.recommendForAdaptive({
              material: p.material,
              operation: p.operation,
              target_capability_score: p.target_capability_score,
              current_tool: (p.current_tool_diameter_mm !== undefined)
                ? { diameter_mm: p.current_tool_diameter_mm, flutes: p.current_tool_flutes ?? 4, coating: p.current_tool_coating }
                : undefined,
              constraints: (p.max_diameter_mm !== undefined || p.min_diameter_mm !== undefined || p.required_coating !== undefined)
                ? { max_diameter_mm: p.max_diameter_mm, min_diameter_mm: p.min_diameter_mm, required_coating: p.required_coating }
                : undefined,
            });
            break;
          }

          // ── U-PPL-D1 / MS-PRINT-PROGRAM-LOOP Track D: prism_data mirror of ProgramPrintLinkIndexEngine ──
          // Mirrors prism_dev:program_print_link_{lookup,coverage}. Identical surface contract,
          // identical engine import, identical error handling — but routed through prism_data
          // because the operations are pure registry-style read lookups against the JM-Die
          // archive (no physics compute). See devDispatcher.ts:1480-1532 for the dev twin.
          case "program_print_link_lookup": {
            try {
              const { loadLinkIndex, lookupPrintForProgram, lookupProgramsForPrint } =
                await import("../../engines/ProgramPrintLinkIndexEngine.js");
              const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
              const direction = bp.direction === "program_for_print" ? "program_for_print" : "print_for_program";
              const query = typeof bp.query === "string" ? bp.query.trim() : "";
              if (query.length === 0) {
                result = { error: "query is required (a program path or a part number)" };
                break;
              }
              const inputProgramPaths = Array.isArray(bp.input_program_paths)
                ? bp.input_program_paths.filter((p): p is string => typeof p === "string")
                : undefined;
              const joinJsonlPath = typeof bp.join_jsonl_path === "string" ? bp.join_jsonl_path : undefined;
              const index = await loadLinkIndex({ inputProgramPaths, joinJsonlPath });
              const lookup = direction === "program_for_print"
                ? lookupProgramsForPrint(query, index)
                : lookupPrintForProgram(query, index);
              result = { success: true, data: { direction, lookup, index_stats: index.stats } };
            } catch (err) {
              result = dispatcherError(err, action, "prism_data");
            }
            break;
          }
          case "program_print_link_coverage": {
            try {
              const { loadLinkIndex, coverageReport } =
                await import("../../engines/ProgramPrintLinkIndexEngine.js");
              const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
              const inputProgramPaths = Array.isArray(bp.input_program_paths)
                ? bp.input_program_paths.filter((p): p is string => typeof p === "string")
                : undefined;
              const archiveProgramPaths = Array.isArray(bp.archive_program_paths)
                ? bp.archive_program_paths.filter((p): p is string => typeof p === "string")
                : undefined;
              const joinJsonlPath = typeof bp.join_jsonl_path === "string" ? bp.join_jsonl_path : undefined;
              const index = await loadLinkIndex({ inputProgramPaths, joinJsonlPath });
              const report = coverageReport(index, { archiveProgramPaths });
              result = { success: true, data: { report } };
            } catch (err) {
              result = dispatcherError(err, action, "prism_data");
            }
            break;
          }

          // ── MS-PRINT-PROGRAM-LOOP/U-PPL-C2: CustomerMaterialMapEngine ──
          // Pure-transform engine — caller supplies pre-collected ProgramSampleEntry[]
          // (customer + filename + optional back-annotated blueprint material) and
          // the engine aggregates into a per-customer ISO-513 distribution. The Zod
          // schema validates entry shape at the MCP boundary; the engine itself
          // FAIL-LOUDs on non-array input (TypeError) — wrapped here by dispatcherError.
          //
          // CONSUMER CONTRACT NOTE (slimResponse interaction):
          //   `customer_material_lookup` returns `{ customer, distribution, map_stats }`
          //   where `distribution` is null on lookup miss (unknown customer). The
          //   `slimResponse` post-process at line ~2395 strips null/undefined
          //   fields to save tokens, so consumers will see `distribution: undefined`
          //   (field absent) on miss, NOT `distribution: null`. Check
          //   `data.distribution == null` (loose equality) — both shapes encode the
          //   same miss. `map_stats.customer_count > 0` confirms the build ran.
          //
          // VALIDATION FLOW (reviewer B P0 reassurance):
          //   1. The dispatcher router (`registerActionDispatcher` upstream) runs
          //      `ACTION_DATA_SCHEMAS[action].safeParse(params)` BEFORE this case
          //      fires. Bad shapes (sub-2-char customer, non-array programs,
          //      out-of-enum iso_group) are rejected at the MCP boundary with
          //      `success: false` — verified by `dataDispatcher.uppl-c2.test.ts`
          //      describe block "schema validation — Zod rejects bad input shapes".
          //   2. The `as Parameters<...>[0]` cast below is therefore safe — Zod
          //      already validated the array shape.
          //   3. The engine ALSO has a runtime FAIL-LOUD TypeError on non-array
          //      input (defense in depth) — wrapped here by `dispatcherError`.
          case "customer_material_map_build": {
            try {
              const { buildCustomerMaterialMap } =
                await import("../../engines/CustomerMaterialMapEngine.js");
              const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
              const programs = Array.isArray(bp.programs) ? bp.programs : [];
              const map = buildCustomerMaterialMap(programs as Parameters<typeof buildCustomerMaterialMap>[0]);
              result = { success: true, data: { map } };
            } catch (err) {
              result = dispatcherError(err, action, "prism_data");
            }
            break;
          }
          case "customer_material_lookup": {
            try {
              const { buildCustomerMaterialMap, lookupMaterialDistribution } =
                await import("../../engines/CustomerMaterialMapEngine.js");
              const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
              const customer = typeof bp.customer === "string" ? bp.customer : "";
              if (customer.trim().length === 0) {
                result = { success: false, error: "customer is required (non-empty string)" };
                break;
              }
              const programs = Array.isArray(bp.programs) ? bp.programs : [];
              const map = buildCustomerMaterialMap(programs as Parameters<typeof buildCustomerMaterialMap>[0]);
              const distribution = lookupMaterialDistribution(map, customer);
              result = {
                success: true,
                data: {
                  customer,
                  distribution,  // null when customer not found
                  map_stats: map.stats,
                },
              };
            } catch (err) {
              result = dispatcherError(err, action, "prism_data");
            }
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-MVN: MachineVocabularyNormalizerEngine — 3
          // surfaces. machine_vocab_normalize routes to the right normalize*
          // method by `kind` (model needs `manufacturer`); _record normalizes
          // a whole machine record; _catalog returns a canonical list. The
          // engine is a pure lookup+fuzzy normalizer (no physics/I/O); a fresh
          // process starts with empty per-call stats, so getStats/resetStats/
          // getSelfAwareness are intentionally NOT wired (no standalone value
          // through a stateless dispatcher — don't-wire-for-wiring-sake).
          // Engine: MCAT-MS0 P1-U02.
          case "machine_vocab_normalize":
          case "machine_vocab_normalize_record":
          case "machine_vocab_catalog": {
            try {
              const { machineVocabularyNormalizerEngine } =
                await import("../../engines/MachineVocabularyNormalizerEngine.js");
              const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
              if (action === "machine_vocab_normalize") {
                const kind = String(bp.kind ?? "");
                const value = String(bp.value ?? "");
                if (value.trim().length === 0) {
                  result = { success: false, error: "value is required (non-empty string)" };
                  break;
                }
                let normalized: unknown;
                switch (kind) {
                  case "manufacturer":
                    normalized = machineVocabularyNormalizerEngine.normalizeManufacturer(value);
                    break;
                  case "controller":
                    normalized = machineVocabularyNormalizerEngine.normalizeController(value);
                    break;
                  case "spindle":
                    normalized = machineVocabularyNormalizerEngine.normalizeSpindle(
                      value,
                      typeof bp.max_rpm === "number" ? bp.max_rpm : undefined,
                      typeof bp.power_kw === "number" ? bp.power_kw : undefined,
                    );
                    break;
                  case "coolant":
                    normalized = machineVocabularyNormalizerEngine.normalizeCoolant(value);
                    break;
                  case "capability":
                    normalized = machineVocabularyNormalizerEngine.normalizeCapability(value);
                    break;
                  case "model": {
                    const mfr = typeof bp.manufacturer === "string" ? bp.manufacturer : "";
                    if (mfr.trim().length === 0) {
                      result = { success: false, error: "kind='model' requires a non-empty 'manufacturer'" };
                      break;
                    }
                    normalized = machineVocabularyNormalizerEngine.normalizeModelId(mfr, value);
                    break;
                  }
                  default:
                    result = { success: false, error: `unknown kind '${kind}' (expected manufacturer|controller|spindle|coolant|capability|model)` };
                }
                if ((result as { success?: boolean } | undefined)?.success === false) break;
                result = { success: true, data: normalized };
              } else if (action === "machine_vocab_normalize_record") {
                result = {
                  success: true,
                  data: machineVocabularyNormalizerEngine.normalizeMachineRecord({
                    manufacturer: typeof bp.manufacturer === "string" ? bp.manufacturer : undefined,
                    model: typeof bp.model === "string" ? bp.model : undefined,
                    controller: typeof bp.controller === "string" ? bp.controller : undefined,
                    spindle_type: typeof bp.spindle_type === "string" ? bp.spindle_type : undefined,
                    spindle_max_rpm: typeof bp.spindle_max_rpm === "number" ? bp.spindle_max_rpm : undefined,
                    spindle_power_kw: typeof bp.spindle_power_kw === "number" ? bp.spindle_power_kw : undefined,
                    coolant: typeof bp.coolant === "string" ? bp.coolant : undefined,
                    capabilities: Array.isArray(bp.capabilities) ? bp.capabilities as string[] : undefined,
                  }),
                };
              } else {
                // machine_vocab_catalog
                const which = String(bp.which ?? "");
                let catalog: unknown;
                switch (which) {
                  case "manufacturers":
                    catalog = machineVocabularyNormalizerEngine.getManufacturers();
                    break;
                  case "controllers":
                    catalog = machineVocabularyNormalizerEngine.getControllers();
                    break;
                  case "coolant_types":
                    catalog = machineVocabularyNormalizerEngine.getCoolantTypes();
                    break;
                  default:
                    result = { success: false, error: `unknown catalog '${which}' (expected manufacturers|controllers|coolant_types)` };
                }
                if ((result as { success?: boolean } | undefined)?.success === false) break;
                result = { success: true, data: { which, catalog } };
              }
            } catch (err) {
              result = dispatcherError(err, action, "prism_data");
            }
            break;
          }

          default:
            return jsonResponse({ error: `Unknown action: ${action}` });
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_data");
      }

      return jsonResponse(slimResponse(result, getSlimLevel(getCurrentPressurePct())));
    }
  );

  log.info("[dataDispatcher] Registered prism_data (144 actions)");
}
