/**
 * PRISM Infrastructure Dispatcher — INFRA-1-2 + INFRA-MS0
 * =============================================
 *
 * prism_infra — 25 actions for database health, persistence monitoring,
 * migration status, registry sync, semantic search, job queue, event bus,
 * ML model registry, plugin lifecycle, auth health, calibration.
 *
 * @version 2.0.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INFRA_SCHEMAS } from "../../schemas/infraActionSchemas.js";

export function registerInfraDispatcher(server: McpServer): void {
  server.tool(
    "prism_infra",
    "Infrastructure tools: DB health, search, jobs, events, ML models, plugins, auth, calibration. Actions: db_health, persistence_health, migration_status, registry_sync_status, seed_registries, infra_summary, search_semantic, search_stats, job_enqueue, job_status, job_stats, event_publish, event_recent, event_stats, model_register, model_list, model_stats, plugin_register, plugin_validate, plugin_activate, plugin_list, auth_health, usage_stats, calibration_status, calibration_overrides_preview",
    {
      action: z.enum([
        "db_health", "persistence_health", "migration_status",
        "registry_sync_status", "seed_registries", "infra_summary",
        // INFRA-MS0: Search
        "search_semantic", "search_stats",
        // INFRA-MS0: Jobs
        "job_enqueue", "job_status", "job_stats",
        // INFRA-MS0: Events
        "event_publish", "event_recent", "event_stats",
        // INFRA-MS0: ML Models
        "model_register", "model_list", "model_stats",
        // INFRA-MS0: Plugins
        "plugin_register", "plugin_validate", "plugin_activate", "plugin_list",
        // INFRA-MS0: Auth + Calibration
        "auth_health", "usage_stats", "calibration_status", "calibration_overrides_preview",
        // WIRE-UNWIRED-MS0/U-WIRE-INGEST: IngestionOrchestratorEngine read-only observability
        "ingestion_stats", "ingestion_get_failed",
        // WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET: PerformanceBudgetEngine read-only observability
        "perf_budget_list", "perf_budget_stats", "perf_budget_violations", "perf_budget_report",
      ]).describe("Infrastructure action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params: rawParams = {} } = args;
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      const validation = validateActionParams(action, params, ACTION_INFRA_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action, "prism_infra",
        );
      }

      try {
        let result: unknown;

        switch (action) {
          case "db_health": {
            const { db } = await import("../../db/connection.js");
            const connected = db.isConnected();
            let latencyMs: number | null = null;
            if (connected) {
              const start = Date.now();
              try {
                await db.query("SELECT 1");
                latencyMs = Date.now() - start;
              } catch { latencyMs = -1; }
            }
            result = {
              connected,
              latency_ms: latencyMs,
              mode: connected ? "postgresql" : "in-memory",
            };
            break;
          }

          case "persistence_health": {
            const { persistenceBridge } = await import("../../db/PersistenceBridge.js");
            const health = persistenceBridge.getHealth();
            result = {
              initialized: health.initialized,
              mode: health.mode,
              pending_writes: health.pendingWrites,
              total_flushed: health.totalFlushed,
              total_errors: health.totalErrors,
              last_error: health.lastError,
            };
            break;
          }

          case "migration_status": {
            const { db } = await import("../../db/connection.js");
            if (!db.isConnected()) {
              result = { status: "no_db", applied: [], pending: "unknown" };
              break;
            }
            const { join } = await import("path");
            const migrationsDir = join(process.cwd(), "src", "db", "migrations");
            const { discoverMigrations, getAppliedMigrations } = await import("../../db/migration-runner.js");
            const discovered = await discoverMigrations(migrationsDir);
            const applied = await getAppliedMigrations(db);
            const appliedNames = new Set(applied.map((m: { name: string }) => m.name));
            const pending = discovered.filter((m: { name: string }) => !appliedNames.has(m.name));
            result = {
              status: pending.length === 0 ? "up_to_date" : "pending",
              applied_count: applied.length,
              pending_count: pending.length,
              pending: pending.map((m: { name: string }) => m.name),
              last_applied: applied.length > 0 ? applied[applied.length - 1].name : null,
            };
            break;
          }

          case "registry_sync_status": {
            const entity = params.entity || "all";
            const { db } = await import("../../db/connection.js");
            const results: Record<string, unknown> = {};

            if (!db.isConnected()) {
              result = { status: "no_db", message: "Running in-memory mode — no sync available" };
              break;
            }

            if (entity === "all" || entity === "materials") {
              const { materialRegistry } = await import("../../registries/MaterialRegistry.js");
              const memCount = materialRegistry.getEntries().size;
              const dbResult = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM materials");
              const dbCount: number = dbResult.rows[0]?.count ?? 0;
              results.materials = { memory: memCount, database: dbCount, synced: dbCount >= memCount * 0.95 };
            }
            if (entity === "all" || entity === "machines") {
              const { machineRegistry } = await import("../../registries/MachineRegistry.js");
              const memCount = machineRegistry.getEntries().size;
              const dbResult = await db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM machines");
              const dbCount: number = dbResult.rows[0]?.count ?? 0;
              results.machines = { memory: memCount, database: dbCount, synced: dbCount >= memCount * 0.95 };
            }
            result = results;
            break;
          }

          case "seed_registries": {
            const { seedMaterials, seedMachines, seedAndVerify } = await import("../../db/RegistrySeeder.js");
            const entity = params.entity || "all";
            if (entity === "all") {
              result = await seedAndVerify();
            } else if (entity === "materials") {
              result = await seedMaterials();
            } else {
              result = await seedMachines();
            }
            break;
          }

          case "infra_summary": {
            // Aggregate all health checks into a single dashboard
            const { db } = await import("../../db/connection.js");
            const connected = db.isConnected();
            const { persistenceBridge } = await import("../../db/PersistenceBridge.js");

            const summary: Record<string, unknown> = {
              database: {
                connected,
                mode: connected ? "postgresql" : "in-memory",
              },
              persistence: persistenceBridge.getHealth(),
              registries: { status: "check registry_sync_status for details" },
            };

            if (connected) {
              try {
                const { getAppliedMigrations } = await import("../../db/migration-runner.js");
                const applied = await getAppliedMigrations(db);
                summary.migrations = { applied: applied.length, last: applied[applied.length - 1]?.name ?? null };
              } catch { summary.migrations = { error: "failed to query" }; }
            }

            // INFRA-MS0 subsystems
            try {
              const { getUsageCounter } = await import("../../middleware/usageCounter.js");
              const counter = await getUsageCounter();
              summary.usage_counter = await counter.getStats();
            } catch { summary.usage_counter = { mode: "not_initialized" }; }

            try {
              const { embeddingPipelineEngine } = await import("../../engines/EmbeddingPipelineEngine.js");
              summary.search = embeddingPipelineEngine.getStats();
            } catch { summary.search = { mode: "not_initialized" }; }

            try {
              const { eventBusEngine } = await import("../../engines/EventBusEngine.js");
              summary.event_bus = eventBusEngine.getStats();
            } catch { summary.event_bus = { mode: "not_initialized" }; }

            result = summary;
            break;
          }

          // ── INFRA-MS0: Search ─────────────────────────────────────────
          case "search_semantic": {
            const { embeddingPipelineEngine } = await import("../../engines/EmbeddingPipelineEngine.js");
            result = await embeddingPipelineEngine.search({
              query: params.query ?? "",
              entity_type: params.entity_type ?? "tips",
              limit: params.limit ?? 10,
              min_score: params.min_score ?? 0.1,
            });
            break;
          }
          case "search_stats": {
            const { embeddingPipelineEngine } = await import("../../engines/EmbeddingPipelineEngine.js");
            result = embeddingPipelineEngine.getStats();
            break;
          }

          // ── INFRA-MS0: Job Queue ──────────────────────────────────────
          case "job_enqueue": {
            const { durableJobQueueEngine } = await import("../../engines/DurableJobQueueEngine.js");
            result = await durableJobQueueEngine.enqueue(
              params.queue ?? "default", params.data ?? {},
              { idempotency_key: params.idempotency_key, max_retries: params.max_retries, priority: params.priority },
            );
            break;
          }
          case "job_status": {
            const { durableJobQueueEngine } = await import("../../engines/DurableJobQueueEngine.js");
            result = durableJobQueueEngine.getJob(params.job_id) ?? { error: "Job not found" };
            break;
          }
          case "job_stats": {
            const { durableJobQueueEngine } = await import("../../engines/DurableJobQueueEngine.js");
            const queues = params.queue ? [params.queue] : durableJobQueueEngine.getQueues();
            result = queues.map((q: string) => durableJobQueueEngine.getQueueStats(q));
            break;
          }

          // ── INFRA-MS0: Event Bus ──────────────────────────────────────
          case "event_publish": {
            const { eventBusEngine } = await import("../../engines/EventBusEngine.js");
            const evtId = await eventBusEngine.publish({
              type: params.type ?? "custom", version: params.version ?? 1,
              source: params.source ?? "api", data: params.data ?? {},
              correlation_id: params.correlation_id,
            });
            result = { ok: true, event_id: evtId };
            break;
          }
          case "event_recent": {
            const { eventBusEngine } = await import("../../engines/EventBusEngine.js");
            result = eventBusEngine.getRecentEvents(params.type, params.limit ?? 20);
            break;
          }
          case "event_stats": {
            const { eventBusEngine } = await import("../../engines/EventBusEngine.js");
            result = eventBusEngine.getStats();
            break;
          }

          // ── INFRA-MS0: ML Models ──────────────────────────────────────
          case "model_register": {
            const { modelRegistryEngine } = await import("../../engines/ModelRegistryEngine.js");
            result = modelRegistryEngine.registerModel({
              id: params.id, name: params.name ?? params.id,
              version: params.version ?? "1.0.0", model_type: params.model_type ?? "custom",
              format: params.format ?? "onnx", input_schema: params.input_schema ?? {},
              output_schema: params.output_schema ?? {},
            });
            break;
          }
          case "model_list": {
            const { modelRegistryEngine } = await import("../../engines/ModelRegistryEngine.js");
            result = modelRegistryEngine.listModels({ status: params.status, model_type: params.model_type });
            break;
          }
          case "model_stats": {
            const { modelRegistryEngine } = await import("../../engines/ModelRegistryEngine.js");
            const models = modelRegistryEngine.listModels();
            result = {
              total: models.length,
              by_status: { ready: models.filter(m => m.status === "ready").length, registered: models.filter(m => m.status === "registered").length },
              triggers: modelRegistryEngine.checkRetrainingTriggers(0),
            };
            break;
          }

          // ── INFRA-MS0: Plugins ────────────────────────────────────────
          case "plugin_register": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            result = pluginManifestEngine.register(params.manifest ?? params);
            break;
          }
          case "plugin_validate": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            result = pluginManifestEngine.validate(params.plugin_id);
            break;
          }
          case "plugin_activate": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            result = pluginManifestEngine.activate(params.plugin_id, params.config);
            break;
          }
          case "plugin_list": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            result = pluginManifestEngine.list({ status: params.status });
            break;
          }

          // ── INFRA-MS0: Auth Health + Calibration ──────────────────────
          case "auth_health": {
            const authResult: Record<string, unknown> = {};
            try {
              const { getOAuthServer } = await import("../../mcp/auth.js");
              const oauth = getOAuthServer();
              authResult.oauth = oauth ? await oauth.getStats() : { error: "not initialized" };
            } catch { authResult.oauth = { error: "not available" }; }
            try {
              const { getUsageCounter } = await import("../../middleware/usageCounter.js");
              const counter = await getUsageCounter();
              authResult.usage_counter = await counter.getStats();
            } catch { authResult.usage_counter = { error: "not available" }; }
            result = authResult;
            break;
          }
          case "usage_stats": {
            const { getUsageCounter } = await import("../../middleware/usageCounter.js");
            const counter = await getUsageCounter();
            result = params.user_id ? await counter.getUserUsage(params.user_id) : await counter.getStats();
            break;
          }
          case "calibration_status": {
            result = { ok: true, endpoint: "GET /api/v1/calibration/status", message: "Use HTTP endpoint for live calibration stats" };
            break;
          }
          case "calibration_overrides_preview": {
            result = {
              example: {
                calibration_overrides: {
                  kc1_1_factor: params.kc1_1_factor ?? 1.0,
                  taylor_c_factor: params.taylor_c_factor ?? 1.0,
                  vc_factor: params.vc_factor ?? 1.0,
                  ra_factor: params.ra_factor ?? 1.0,
                  source: "calibration_feedback", confidence: 0.85,
                },
              },
              usage: "Add calibration_overrides to SpeedFeedOrchestrator input",
            };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-INGEST: IngestionOrchestratorEngine read-only observability
          case "ingestion_stats": {
            const { ingestionOrchestratorEngine } = await import("../../engines/IngestionOrchestratorEngine.js");
            result = ingestionOrchestratorEngine.getStats();
            break;
          }
          case "ingestion_get_failed": {
            const { ingestionOrchestratorEngine } = await import("../../engines/IngestionOrchestratorEngine.js");
            result = { failed: ingestionOrchestratorEngine.getFailedRecords() };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET: PerformanceBudgetEngine read-only observability
          case "perf_budget_list": {
            const { performanceBudgetEngine } = await import("../../engines/PerformanceBudgetEngine.js");
            result = { budgets: performanceBudgetEngine.listBudgets() };
            break;
          }
          case "perf_budget_stats": {
            const { performanceBudgetEngine } = await import("../../engines/PerformanceBudgetEngine.js");
            const opId = (params as { operation_id?: string; operationId?: string }).operation_id
              ?? (params as { operation_id?: string; operationId?: string }).operationId;
            if (opId) {
              result = { stats: performanceBudgetEngine.getStats(opId) };
            } else {
              result = { stats: performanceBudgetEngine.getAllStats() };
            }
            break;
          }
          case "perf_budget_violations": {
            const { performanceBudgetEngine } = await import("../../engines/PerformanceBudgetEngine.js");
            const limit = (params as { limit?: number }).limit ?? 100;
            result = { violations: performanceBudgetEngine.getViolations(limit) };
            break;
          }
          case "perf_budget_report": {
            const { performanceBudgetEngine } = await import("../../engines/PerformanceBudgetEngine.js");
            result = { report: performanceBudgetEngine.generateReport() };
            break;
          }
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_infra");
      }
    },
  );
}
