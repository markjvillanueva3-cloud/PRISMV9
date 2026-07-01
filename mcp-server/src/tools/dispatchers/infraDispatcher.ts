/**
 * PRISM Infrastructure Dispatcher — INFRA-1-2 + INFRA-MS0 + WIRE-UNWIRED-MS0
 * =============================================
 *
 * prism_infra — infrastructure surface covering database health, persistence
 * monitoring, migration status, registry sync, semantic search, job queue,
 * event bus, ML model registry, plugin lifecycle, auth health, calibration,
 * and (WIRE-UNWIRED-MS0) read-only observability for IngestionOrchestrator,
 * PerformanceBudget, RegistryFederation, and BatchProcessor.
 *
 * Action count is the z.enum() list inside `registerInfraDispatcher` — never
 * inline a number here (drifts on every wire-up). See ACTION_INFRA_SCHEMAS
 * in `src/schemas/infraActionSchemas.ts` for the canonical schema map.
 *
 * @version 2.1.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INFRA_SCHEMAS } from "../../schemas/infraActionSchemas.js";
import type { DurableEventSink } from "../../engines/EventBusEngine.js";

/** Test seam for ensureDurableEventBusWired (inject env/bus/sink); production calls argless. */
export interface DurableEventBusWireDeps {
  env?: string;
  bus?: { attachDurableSink(sink: DurableEventSink | null): void };
  sink?: DurableEventSink & { connect(url?: string): Promise<boolean>; isConnected: boolean };
}

/**
 * Wire RedisStreamSink as the EventBusEngine durable backend when PRISM_EVENT_BUS=redis.
 *
 * INFRA-SYNERGY Phase 3 activation wire (slot:bravo): EventBusEngine exposes
 * attachDurableSink() and fans publish() out to it ONLY when PRISM_EVENT_BUS=redis, but
 * RedisStreamSink (the durable Redis-Streams backend) was built and never attached -- the
 * orphan this closes. Default (flag unset) = NO-OP => byte-identical in-memory bus (zero
 * regression). Fail-soft: the sink self-connects (RedisStreamSink.connect); an absent
 * ioredis dep or a down/unreachable Redis degrades to { ok:false } per-append and NEVER
 * breaks the in-memory bus. Idempotent: re-attaching the same singleton is harmless and
 * connect() is skipped once connected.
 *
 * @param deps test seam; production calls it argless.
 * @returns true only when the sink is attached AND live-connected to Redis.
 */
export async function ensureDurableEventBusWired(deps: DurableEventBusWireDeps = {}): Promise<boolean> {
  const env = deps.env ?? process.env.PRISM_EVENT_BUS;
  if (env !== "redis") return false;
  const bus = deps.bus ?? (await import("../../engines/EventBusEngine.js")).eventBusEngine;
  const sink = deps.sink ?? (await import("../../engines/RedisStreamSink.js")).redisStreamSink;
  bus.attachDurableSink(sink);
  if (!sink.isConnected) {
    try { await sink.connect(); } catch { /* connect() is fail-soft by contract; defensive only */ }
  }
  return sink.isConnected;
}

export function registerInfraDispatcher(server: McpServer): void {
  // INFRA-SYNERGY Phase 3: attach the Redis durable backend when PRISM_EVENT_BUS=redis.
  // Fire-and-forget + fail-soft; default (flag unset) is a no-op => byte-identical bus.
  // The .catch makes the "never breaks the bus" contract literal even if a dynamic
  // import under the redis flag were to reject (it never does in practice).
  void ensureDurableEventBusWired().catch(() => { /* fail-soft: registration must never throw */ });
  server.tool(
    "prism_infra",
    "Infrastructure tools: DB health, search, jobs, events, ML models, plugins, auth, calibration. Actions: db_health, persistence_health, migration_status, registry_sync_status, seed_registries, infra_summary, search_semantic, search_stats, search_es_health, job_enqueue, job_status, job_stats, event_publish, event_recent, event_stats, model_register, model_list, model_stats, plugin_register, plugin_validate, plugin_activate, plugin_list, auth_health, usage_stats, calibration_status, calibration_overrides_preview, ingestion_stats, ingestion_get_failed, perf_budget_list, perf_budget_stats, perf_budget_violations, perf_budget_report, registry_fed_query, registry_fed_get, registry_fed_list, registry_fed_stats, batch_queue_size, batch_stats, batch_persist_stats, diff_stats, diff_persist_stats, diff_would_change, diff_invalidate, config_get, config_get_with_meta, config_list, config_validate, config_export, evt_emit, evt_history, evt_replay, evt_subscriptions_list, evt_dead_letter, evt_stats, sys_health_check, sys_health_liveness, sys_health_readiness, sys_health_components, sys_health_history, q_get_job, q_list_jobs, q_stats, q_list_queues, log_query, log_stats, log_get_config",
    {
      action: z.enum([
        "db_health", "persistence_health", "migration_status",
        "registry_sync_status", "seed_registries", "infra_summary",
        // INFRA-MS0: Search
        "search_semantic", "search_stats",
        // INFRA-SYNERGY Phase 2: Elasticsearch lexical backend observability (gated)
        "search_es_health",
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
        // WIRE-UNWIRED-MS0/U-WIRE-REGFED: RegistryFederationEngine read-only federation
        "registry_fed_query", "registry_fed_get", "registry_fed_list", "registry_fed_stats",
        // WIRE-UNWIRED-MS0/U-WIRE-BATCH-PROCESSOR: BatchProcessor read-only observability
        "batch_queue_size", "batch_stats", "batch_persist_stats",
        // WIRE-UNWIRED-MS0/U-WIRE-DIFF-ENGINE: DiffEngine read-only + admin (no writeIfChanged exposure — would let MCP clients write to any path)
        "diff_stats", "diff_persist_stats", "diff_would_change", "diff_invalidate",
        // WIRE-UNWIRED-MS0/U-WIRE-CONFIG-ENGINE: ConfigEngine read-only (no set/delete/import/clear exposure — config writes go through typed adapters)
        "config_get", "config_get_with_meta", "config_list", "config_validate", "config_export",
        // WIRE-UNWIRED-MS0/U-WIRE-EVENT-ENGINE: EventEngine in-process pub/sub (distinct from eventBusEngine — subscribe/unsubscribe not MCP-shaped)
        "evt_emit", "evt_history", "evt_replay", "evt_subscriptions_list", "evt_dead_letter", "evt_stats",
        // WIRE-UNWIRED-MS0/U-WIRE-HEALTH-ENGINE: HealthEngine read-only (sys_health_ prefix — health_check is taken by prism_session)
        "sys_health_check", "sys_health_liveness", "sys_health_readiness", "sys_health_components", "sys_health_history",
        // WIRE-UNWIRED-MS0/U-WIRE-QUEUE-ENGINE: QueueEngine read-only (q_ prefix — job_* is taken by durableJobQueueEngine)
        "q_get_job", "q_list_jobs", "q_stats", "q_list_queues",
        // WIRE-UNWIRED-MS0/U-WIRE-LOGGING-ENGINE: LoggingEngine read-only (write/configure/clear not MCP-exposed)
        "log_query", "log_stats", "log_get_config",
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
          // INFRA-SYNERGY Phase 2: SearchIndexEngine (Elasticsearch lexical backend)
          // read-only observability. Gated by PRISM_SEARCH_BACKEND=es: default "file"
          // makes NO network call and returns a structured disabled result. Distinct
          // from search_semantic (EmbeddingPipelineEngine vector search). Fail-soft.
          case "search_es_health": {
            const { searchIndexEngine } = await import("../../engines/SearchIndexEngine.js");
            const esEnabled = searchIndexEngine.isEsEnabled();
            result = {
              backend: searchIndexEngine.searchBackend(),
              es_enabled: esEnabled,
              health: esEnabled ? await searchIndexEngine.health(params.timeout_ms) : null,
              note: esEnabled ? undefined : "Elasticsearch backend disabled (set PRISM_SEARCH_BACKEND=es to enable).",
            };
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
          // WIRE-UNWIRED-MS0/U-WIRE-REGFED: RegistryFederationEngine read-only federation
          case "registry_fed_query": {
            const { registryFederationEngine } = await import("../../engines/RegistryFederationEngine.js");
            const p = params as { query: string; registries?: string[]; limit?: number };
            result = { results: await registryFederationEngine.query(p) };
            break;
          }
          case "registry_fed_get": {
            const { registryFederationEngine } = await import("../../engines/RegistryFederationEngine.js");
            const id = (params as { id?: string; registry_id?: string }).id
              ?? (params as { registry_id?: string }).registry_id;
            result = { registry: await registryFederationEngine.getRegistry(id ?? "") };
            break;
          }
          case "registry_fed_list": {
            const { registryFederationEngine } = await import("../../engines/RegistryFederationEngine.js");
            result = { registries: await registryFederationEngine.listRegistries() };
            break;
          }
          case "registry_fed_stats": {
            const { registryFederationEngine } = await import("../../engines/RegistryFederationEngine.js");
            result = { stats: await registryFederationEngine.getStats() };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-BATCH-PROCESSOR: BatchProcessor read-only observability
          case "batch_queue_size": {
            const { batchProcessor } = await import("../../engines/BatchProcessor.js");
            result = { queue_size: batchProcessor.getQueueSize() };
            break;
          }
          case "batch_stats": {
            const { batchProcessor } = await import("../../engines/BatchProcessor.js");
            result = { stats: batchProcessor.getStats() };
            break;
          }
          case "batch_persist_stats": {
            const { batchProcessor } = await import("../../engines/BatchProcessor.js");
            batchProcessor.persistStats();
            result = { ok: true, persisted: true };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-DIFF-ENGINE: DiffEngine read-only + admin
          case "diff_stats": {
            const { diffEngine } = await import("../../engines/DiffEngine.js");
            result = { stats: diffEngine.getStats() };
            break;
          }
          case "diff_persist_stats": {
            const { diffEngine } = await import("../../engines/DiffEngine.js");
            diffEngine.persistStats();
            result = { ok: true, persisted: true };
            break;
          }
          case "diff_would_change": {
            const { diffEngine } = await import("../../engines/DiffEngine.js");
            const p = params as { file_path: string; content: string };
            result = { would_change: diffEngine.wouldChange(p.file_path, p.content) };
            break;
          }
          case "diff_invalidate": {
            const { diffEngine } = await import("../../engines/DiffEngine.js");
            const p = params as { file_path: string };
            diffEngine.invalidateChecksum(p.file_path);
            result = { ok: true, invalidated: p.file_path };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-CONFIG-ENGINE: ConfigEngine read-only
          case "config_get": {
            const { configEngine } = await import("../../engines/ConfigEngine.js");
            const p = params as { key: string };
            const value = configEngine.get(p.key);
            result = { key: p.key, value: value === undefined ? null : value };
            break;
          }
          case "config_get_with_meta": {
            const { configEngine } = await import("../../engines/ConfigEngine.js");
            const p = params as { key: string };
            const entry = configEngine.getWithMeta(p.key);
            result = { key: p.key, entry: entry ?? null };
            break;
          }
          case "config_list": {
            const { configEngine } = await import("../../engines/ConfigEngine.js");
            const p = params as { prefix?: string };
            const entries = p.prefix
              ? configEngine.getByPrefix(p.prefix)
              : configEngine.getAll();
            result = { count: entries.length, entries };
            break;
          }
          case "config_validate": {
            const { configEngine } = await import("../../engines/ConfigEngine.js");
            result = { validation: configEngine.validate() };
            break;
          }
          case "config_export": {
            const { configEngine } = await import("../../engines/ConfigEngine.js");
            const p = params as { include_secrets?: boolean };
            result = { config: configEngine.exportConfig(p.include_secrets ?? false) };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-EVENT-ENGINE: in-process pub/sub bus
          case "evt_emit": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            const p = params as {
              topic: string;
              payload: unknown;
              source?: string;
              correlation_id?: string;
            };
            const event = eventEngine.emit(p.topic, p.payload, p.source ?? "system", p.correlation_id);
            result = { event };
            break;
          }
          case "evt_history": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            const p = params as { topic?: string; limit?: number };
            result = { events: eventEngine.getHistory(p.topic, p.limit ?? 50) };
            break;
          }
          case "evt_replay": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            const p = params as { topic: string; since?: string };
            result = { replayed: eventEngine.replay(p.topic, p.since) };
            break;
          }
          case "evt_subscriptions_list": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            result = { subscriptions: eventEngine.listSubscriptions() };
            break;
          }
          case "evt_dead_letter": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            const p = params as { limit?: number };
            result = { dead_letter: eventEngine.getDeadLetter(p.limit ?? 50) };
            break;
          }
          case "evt_stats": {
            const { eventEngine } = await import("../../engines/EventEngine.js");
            result = { stats: eventEngine.stats() };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-HEALTH-ENGINE: HealthEngine read-only probes
          case "sys_health_check": {
            const { healthEngine } = await import("../../engines/HealthEngine.js");
            result = { health: healthEngine.check() };
            break;
          }
          case "sys_health_liveness": {
            const { healthEngine } = await import("../../engines/HealthEngine.js");
            result = { liveness: healthEngine.liveness() };
            break;
          }
          case "sys_health_readiness": {
            const { healthEngine } = await import("../../engines/HealthEngine.js");
            result = { readiness: healthEngine.readiness() };
            break;
          }
          case "sys_health_components": {
            const { healthEngine } = await import("../../engines/HealthEngine.js");
            result = { components: healthEngine.listComponents() };
            break;
          }
          case "sys_health_history": {
            const { healthEngine } = await import("../../engines/HealthEngine.js");
            const p = params as { limit?: number };
            result = { history: healthEngine.getHistory(p.limit ?? 50) };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-QUEUE-ENGINE: QueueEngine read-only
          case "q_get_job": {
            const { queueEngine } = await import("../../engines/QueueEngine.js");
            const p = params as { job_id: string };
            result = { job: queueEngine.getJob(p.job_id) ?? null };
            break;
          }
          case "q_list_jobs": {
            const { queueEngine } = await import("../../engines/QueueEngine.js");
            const p = params as {
              queue_name: string;
              status?: "pending" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";
            };
            const jobs = queueEngine.listJobs(p.queue_name, p.status);
            result = { count: jobs.length, jobs };
            break;
          }
          case "q_stats": {
            const { queueEngine } = await import("../../engines/QueueEngine.js");
            const p = params as { queue_name: string };
            result = { stats: queueEngine.stats(p.queue_name) };
            break;
          }
          case "q_list_queues": {
            const { queueEngine } = await import("../../engines/QueueEngine.js");
            result = { queues: queueEngine.listQueues() };
            break;
          }
          // WIRE-UNWIRED-MS0/U-WIRE-LOGGING-ENGINE: LoggingEngine read-only
          case "log_query": {
            const { loggingEngine } = await import("../../engines/LoggingEngine.js");
            const p = params as {
              level?: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
              namespace?: string;
              since?: string;
              until?: string;
              search?: string;
              correlation_id?: string;
              limit?: number;
            };
            const entries = loggingEngine.query({
              level: p.level,
              namespace: p.namespace,
              since: p.since,
              until: p.until,
              search: p.search,
              correlation_id: p.correlation_id,
              limit: p.limit,
            });
            result = { count: entries.length, entries };
            break;
          }
          case "log_stats": {
            const { loggingEngine } = await import("../../engines/LoggingEngine.js");
            result = { stats: loggingEngine.stats() };
            break;
          }
          case "log_get_config": {
            const { loggingEngine } = await import("../../engines/LoggingEngine.js");
            result = { config: loggingEngine.getConfig() };
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
