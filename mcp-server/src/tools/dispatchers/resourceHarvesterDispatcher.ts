/**
 * prism_resource_harvester — Resource Scanning & Harvesting Dispatcher
 * RES-MS0: Foundation for the 28-milestone resource harvesting roadmap
 *
 * 6 actions: scan_folder, classify_file, get_index, start_harvest,
 *   harvest_status, harvest_resume
 *
 * Engine dependencies: FolderScannerEngine, HarvestPipelineEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_RESOURCE_HARVESTER_SCHEMAS } from "../../schemas/resourceHarvesterActionSchemas.js";

let _scanner: any, _harvester: any;
// OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-2
let _jmHarvest: any, _jmHarvester: any, _jmInventory: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "scanner":
      return _scanner ??= (await import("../../engines/FolderScannerEngine.js")).folderScannerEngine;
    case "harvester":
      return _harvester ??= (await import("../../engines/HarvestPipelineEngine.js")).harvestPipelineEngine;
    // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-2
    case "jmHarvest":
      return _jmHarvest ??= (await import("../../engines/JMDieMillProgramHarvestEngine.js")).jmDieMillProgramHarvestEngine;
    case "jmHarvester":
      return _jmHarvester ??= (await import("../../engines/JMDieMillProgramHarvesterEngine.js")).jmDieMillProgramHarvesterEngine;
    case "jmInventory":
      return _jmInventory ??= (await import("../../engines/JMDieProgramInventoryEngine.js")).jmDieProgramInventoryEngine;
    default:
      throw new Error(`Unknown resource harvester engine: ${name}`);
  }
}

const ACTIONS = [
  "scan_folder",
  "classify_file",
  "get_index",
  "start_harvest",
  "harvest_status",
  "harvest_resume",
  // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-2
  "jm_mill_harvest",
  "jm_mill_harvest_customer_recs",
  "jm_mill_harvest_predict_tool",
  "jm_mill_get_tool_rec",
  "jm_mill_get_op_sequence",
  "jm_mill_get_speeds_feeds",
  "jm_mill_get_tribal_tips",
  "jm_mill_get_customers",
  "jm_program_inventory_scan",
  "jm_program_inventory_stats",
  "jm_program_find_by_customer",
  "jm_program_find_by_controller",
  "jm_program_find_by_type",
] as const;

/**
 * Registers the resource_harvester dispatcher.
 * @param server - MCP server instance
 */
export function registerResourceHarvesterDispatcher(server: any): void {
  server.tool(
    "prism_resource_harvester",
    `Resource scanning & harvesting dispatcher — scan folders, classify files, build resource index, orchestrate harvesting pipelines.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_resource_harvester] Action: ${action}`);
      let result: any;
      try {
        // Normalize params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Validate params against schema
        const validation = validateActionParams(action, params, ACTION_RESOURCE_HARVESTER_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_resource_harvester"
          );
        }

        switch (action) {
          case "scan_folder": {
            const scanner = await getEngine("scanner");
            const scanPath = params.path || "H:/prism/resources/";
            const recursive = params.recursive !== false;
            const maxDepth = params.maxDepth || params.max_depth || 10;
            result = await scanner.scan(scanPath, { recursive, maxDepth });
            break;
          }

          case "classify_file": {
            const scanner = await getEngine("scanner");
            const filePath = params.filePath || params.file_path;
            if (!filePath) {
              return dispatcherError("file_path is required", action, "prism_resource_harvester");
            }
            result = scanner.classifyFile(filePath);
            break;
          }

          case "get_index": {
            const scanner = await getEngine("scanner");
            const filterType = params.filterType || params.filter_type;
            const filterDomain = params.filterDomain || params.filter_domain;
            const limit = params.limit || 100;
            const index = scanner.getIndex?.() || { entries: [], stats: {} };
            let entries = index.entries || [];
            if (filterType) {
              entries = entries.filter((e: any) => e.type === filterType);
            }
            if (filterDomain) {
              entries = entries.filter((e: any) => e.domain === filterDomain);
            }
            result = {
              total: entries.length,
              entries: entries.slice(0, limit),
              stats: index.stats,
            };
            break;
          }

          case "start_harvest": {
            const harvester = await getEngine("harvester");
            const sourcePath = params.sourcePath || params.source_path;
            if (!sourcePath) {
              return dispatcherError("source_path is required", action, "prism_resource_harvester");
            }
            const fileTypes = params.fileTypes || params.file_types;
            const dryRun = params.dryRun || params.dry_run || false;
            result = await harvester.startHarvest({
              sourcePath,
              fileTypes,
              dryRun,
            });
            break;
          }

          case "harvest_status": {
            const harvester = await getEngine("harvester");
            const harvestId = params.harvestId || params.harvest_id;
            result = harvester.getStatus(harvestId);
            break;
          }

          case "harvest_resume": {
            const harvester = await getEngine("harvester");
            const harvestId = params.harvestId || params.harvest_id;
            if (!harvestId) {
              return dispatcherError("harvest_id is required", action, "prism_resource_harvester");
            }
            result = await harvester.resumeHarvest(harvestId);
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-JM-EXPOSE-2: surface 3 JM Die orphan engines
          case "jm_mill_harvest": {
            const engine = await getEngine("jmHarvest");
            result = await engine.harvest();
            break;
          }

          case "jm_mill_harvest_customer_recs": {
            const engine = await getEngine("jmHarvest");
            const customer = params.customer;
            if (!customer) {
              return dispatcherError("customer is required", action, "prism_resource_harvester");
            }
            result = engine.getCustomerRecommendations(customer);
            break;
          }

          case "jm_mill_harvest_predict_tool": {
            const engine = await getEngine("jmHarvest");
            const operation = params.operation;
            const materialIso = params.material_iso || params.materialIso;
            if (!operation || !materialIso) {
              return dispatcherError("operation and material_iso are required", action, "prism_resource_harvester");
            }
            const diameterMm = params.diameter_mm ?? params.diameterMm;
            result = engine.predictTool(operation, materialIso, diameterMm);
            break;
          }

          case "jm_mill_get_tool_rec": {
            const engine = await getEngine("jmHarvester");
            result = engine.getToolRecommendation({
              material: params.material,
              feature: params.feature,
              customer: params.customer,
            });
            break;
          }

          case "jm_mill_get_op_sequence": {
            const engine = await getEngine("jmHarvester");
            const featureType = params.feature_type || params.featureType;
            if (!featureType) {
              return dispatcherError("feature_type is required", action, "prism_resource_harvester");
            }
            result = engine.getOperationSequence(featureType);
            break;
          }

          case "jm_mill_get_speeds_feeds": {
            const engine = await getEngine("jmHarvester");
            const material = params.material;
            if (!material) {
              return dispatcherError("material is required", action, "prism_resource_harvester");
            }
            result = engine.getSpeedsFeedsRecommendation(material);
            break;
          }

          case "jm_mill_get_tribal_tips": {
            const engine = await getEngine("jmHarvester");
            const tips = engine.getAllTribalTips();
            result = { count: tips.length, tips };
            break;
          }

          case "jm_mill_get_customers": {
            const engine = await getEngine("jmHarvester");
            const customers = engine.getCustomers();
            result = { count: customers.length, customers };
            break;
          }

          case "jm_program_inventory_scan": {
            const engine = await getEngine("jmInventory");
            const rootPath = params.root_path || params.rootPath;
            const maxDepth = params.max_depth ?? params.maxDepth;
            result = rootPath !== undefined
              ? (maxDepth !== undefined ? engine.scan(rootPath, maxDepth) : engine.scan(rootPath))
              : engine.scan();
            break;
          }

          case "jm_program_inventory_stats": {
            const engine = await getEngine("jmInventory");
            const rootPath = params.root_path || params.rootPath;
            result = rootPath !== undefined ? engine.getQuickStats(rootPath) : engine.getQuickStats();
            break;
          }

          case "jm_program_find_by_customer": {
            const engine = await getEngine("jmInventory");
            const customer = params.customer;
            if (!customer) {
              return dispatcherError("customer is required", action, "prism_resource_harvester");
            }
            const entries = engine.findByCustomer(customer);
            result = { count: entries.length, entries };
            break;
          }

          case "jm_program_find_by_controller": {
            const engine = await getEngine("jmInventory");
            const controller = params.controller;
            if (!controller) {
              return dispatcherError("controller is required", action, "prism_resource_harvester");
            }
            const entries = engine.findByController(controller);
            result = { count: entries.length, entries };
            break;
          }

          case "jm_program_find_by_type": {
            const engine = await getEngine("jmInventory");
            const programType = params.program_type || params.programType;
            if (!programType) {
              return dispatcherError("program_type is required", action, "prism_resource_harvester");
            }
            const entries = engine.findByType(programType);
            result = { count: entries.length, entries };
            break;
          }

          default: {
            return dispatcherError(`Unknown action: ${action}`, action, "prism_resource_harvester");
          }
        }

        return slimResponse({
          content: [{
            type: "text" as const,
            text: JSON.stringify({ success: true, action, data: result }, null, 2),
          }],
        });
      } catch (err: any) {
        log.error(`[prism_resource_harvester] Error in ${action}: ${err.message}`);
        return dispatcherError(
          `${action} failed: ${err.message}`,
          action, "prism_resource_harvester"
        );
      }
    }
  );
}
