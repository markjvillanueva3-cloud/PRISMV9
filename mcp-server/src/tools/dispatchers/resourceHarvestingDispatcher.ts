/**
 * prism_resource_harvesting — Automated Resource Harvesting Pipeline Dispatcher
 * RESOURCE-HARVEST-MS1: Full automation of PDF, video, MIT course, CAM file & NC program ingestion
 *
 * 8 actions:
 *   harvest_scan     — Quick scan of all resource directories (calls quickScan)
 *   harvest_start    — Start a full automated harvest (calls runFullHarvest)
 *   harvest_progress — Get current progress counters (calls getProgress)
 *   harvest_status   — Check whether a harvest is running (calls isHarvestRunning)
 *   harvest_jobs     — Get all harvest jobs (calls getJobs)
 *   harvest_results  — Get all harvest results (calls getResults)
 *   harvest_dry_run  — Simulate a harvest without ingesting (calls runFullHarvest with dryRun)
 *   harvest_filter   — Run a harvest filtered by type / domain / limit
 *
 * Engine: AutomatedResourceHarvestingPipeline (singleton)
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_RESOURCE_HARVESTING_SCHEMAS } from "../schemas/resourceHarvestingSchema.js";

// ── Actions (alphabetical) ────────────────────────────────────

const ACTIONS = [
  "harvest_dry_run",
  "harvest_filter",
  "harvest_jobs",
  "harvest_progress",
  "harvest_results",
  "harvest_scan",
  "harvest_start",
  "harvest_status",
] as const;

type HarvestAction = typeof ACTIONS[number];

// ── Lazy engine accessor ──────────────────────────────────────

async function getPipeline() {
  const { automatedResourceHarvestingPipeline } = await import(
    "../../engines/AutomatedResourceHarvestingPipeline.js"
  );
  return automatedResourceHarvestingPipeline;
}

// ── Registration ──────────────────────────────────────────────

/**
 * Registers the prism_resource_harvesting dispatcher on the MCP server.
 * @param server - MCP server instance
 */
export function registerResourceHarvestingDispatcher(server: any): void {
  server.tool(
    "prism_resource_harvesting",
    `Automated resource harvesting pipeline — scan, ingest, and track progress for PDFs, videos, MIT courses, CAM files, and NC programs.
Actions: ${ACTIONS.join(", ")}.
Use harvest_scan for a quick count, harvest_start to run the full pipeline, harvest_dry_run to preview without ingesting.
Params vary by action — pass relevant fields in the params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: HarvestAction;
      params?: Record<string, any>;
    }) => {
      log.info(`[prism_resource_harvesting] Action: ${action}`);
      let result: any;

      try {
        // Normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch {
          /* normalizer optional */
        }

        // Validate params against schema
        const validation = validateActionParams(
          action,
          params,
          ACTION_RESOURCE_HARVESTING_SCHEMAS
        );
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_resource_harvesting"
          );
        }

        const pipeline = await getPipeline();

        switch (action) {
          // ── harvest_scan ──────────────────────────────────────────
          case "harvest_scan": {
            const scan = await pipeline.quickScan();
            result = {
              ...scan,
              metadata: {
                action: "harvest_scan",
                description: "Quick count of all harvestable resources",
              },
            };
            break;
          }

          // ── harvest_start ─────────────────────────────────────────
          case "harvest_start": {
            const report = await pipeline.runFullHarvest({
              types: params.types,
              domains: params.domains,
              limit: params.limit,
            });
            result = {
              report,
              metadata: {
                action: "harvest_start",
                description: "Full automated harvest complete",
              },
            };
            break;
          }

          // ── harvest_progress ──────────────────────────────────────
          case "harvest_progress": {
            const progress = pipeline.getProgress();
            result = {
              progress,
              metadata: {
                action: "harvest_progress",
                description: "Current harvesting progress counters",
              },
            };
            break;
          }

          // ── harvest_status ────────────────────────────────────────
          case "harvest_status": {
            const running = pipeline.isHarvestRunning();
            result = {
              is_running: running,
              metadata: {
                action: "harvest_status",
                description: "Whether a harvest is currently in progress",
              },
            };
            break;
          }

          // ── harvest_jobs ──────────────────────────────────────────
          case "harvest_jobs": {
            let jobs = pipeline.getJobs();
            if (params.status) {
              jobs = jobs.filter((j: any) => j.status === params.status);
            }
            const limit: number | undefined = params.limit;
            const truncated = limit !== undefined ? jobs.slice(0, limit) : jobs;
            result = {
              total: jobs.length,
              returned: truncated.length,
              jobs: truncated,
              metadata: {
                action: "harvest_jobs",
                description: "All harvest jobs with optional status filter",
              },
            };
            break;
          }

          // ── harvest_results ───────────────────────────────────────
          case "harvest_results": {
            let results = pipeline.getResults();
            if (params.successOnly || params.success_only) {
              results = results.filter((r: any) => r.success);
            }
            const limit: number | undefined = params.limit;
            const truncated = limit !== undefined ? results.slice(0, limit) : results;
            result = {
              total: results.length,
              returned: truncated.length,
              results: truncated,
              metadata: {
                action: "harvest_results",
                description: "All harvest results from the current or last run",
              },
            };
            break;
          }

          // ── harvest_dry_run ───────────────────────────────────────
          case "harvest_dry_run": {
            const report = await pipeline.runFullHarvest({
              types: params.types,
              domains: params.domains,
              limit: params.limit,
              dryRun: true,
            });
            result = {
              report,
              dry_run: true,
              metadata: {
                action: "harvest_dry_run",
                description: "Dry-run preview — no resources were ingested",
              },
            };
            break;
          }

          // ── harvest_filter ────────────────────────────────────────
          case "harvest_filter": {
            const report = await pipeline.runFullHarvest({
              types: params.types,
              domains: params.domains,
              limit: params.limit,
            });
            result = {
              report,
              filters_applied: {
                types: params.types ?? null,
                domains: params.domains ?? null,
                limit: params.limit ?? null,
              },
              metadata: {
                action: "harvest_filter",
                description: "Filtered harvest by type, domain, and/or count",
              },
            };
            break;
          }

          default: {
            return dispatcherError(
              `Unknown action: ${action}`,
              action,
              "prism_resource_harvesting"
            );
          }
        }

        return slimResponse({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ success: true, action, data: result }, null, 2),
            },
          ],
        });
      } catch (err: any) {
        log.error(`[prism_resource_harvesting] Error in ${action}: ${err.message}`);
        return dispatcherError(
          `${action} failed: ${err.message}`,
          action,
          "prism_resource_harvesting"
        );
      }
    }
  );

  log.info("Registered: prism_resource_harvesting dispatcher (8 actions)");
}
