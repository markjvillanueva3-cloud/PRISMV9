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
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "scanner":
      return _scanner ??= (await import("../../engines/FolderScannerEngine.js")).folderScannerEngine;
    case "harvester":
      return _harvester ??= (await import("../../engines/HarvestPipelineEngine.js")).harvestPipelineEngine;
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
