/**
 * PRISM Infrastructure Action Schemas — INFRA-1-2 + INFRA-MS0 + WIRE-UNWIRED-MS0
 * Zod schemas for prism_infra dispatcher actions.
 *
 * Action count is the source of truth; see the keys of `ACTION_INFRA_SCHEMAS`
 * and the matching z.enum() in `infraDispatcher.ts`. Action groups:
 *   - core infrastructure (db/persistence/migration/registry/seed/summary)
 *   - search, jobs, events, ML models, plugins, auth, calibration (INFRA-MS0)
 *   - WIRE-UNWIRED-MS0 read-only observability:
 *       ingestion (IngestionOrchestratorEngine),
 *       perf_budget (PerformanceBudgetEngine),
 *       registry_fed (RegistryFederationEngine),
 *       batch (BatchProcessor singleton — getQueueSize/getStats/persistStats).
 */

import { z } from "zod";

/** Simple plugin manifest schema for PluginEngine */
const SimplePluginManifestSchema = z.object({
  id: z.string().describe("Unique plugin identifier"),
  name: z.string().describe("Human-readable plugin name"),
  version: z.string().describe("Semantic version (e.g., 1.0.0)"),
  description: z.string().optional().describe("Plugin description"),
  author: z.string().optional().describe("Plugin author"),
  dependencies: z.array(z.string()).optional().describe("Required plugin IDs"),
  min_prism_version: z.string().optional().describe("Minimum PRISM version"),
  hooks: z.array(z.string()).optional().describe("Hook points this plugin uses"),
  permissions: z.array(z.string()).optional().describe("Permissions requested"),
});

/** Full plugin manifest schema for PluginManifestEngine */
const FullPluginManifestSchema = z.object({
  id: z.string().regex(/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/).describe("Plugin ID (npm-style)"),
  version: z.string().regex(/^\d+\.\d+\.\d+/).describe("Semantic version"),
  name: z.string().min(3).max(100).describe("Human-readable name"),
  description: z.string().max(500).describe("Plugin description"),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }).describe("Author information"),
  prism_version: z.string().optional().describe("Minimum PRISM version"),
  main: z.string().optional().describe("Entry point module"),
  permissions: z.array(z.string()).optional().describe("Permissions requested"),
  hooks: z.array(z.object({
    point: z.string(),
    handler: z.string(),
    priority: z.number().min(0).max(1000).optional(),
  })).optional().describe("Hook registrations"),
  actions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    handler: z.string(),
  })).optional().describe("Custom actions"),
  tags: z.array(z.string()).optional().describe("Tags for discoverability"),
  license: z.string().optional().describe("License identifier"),
});

export const ACTION_INFRA_SCHEMAS: Record<string, z.ZodObject<any>> = {
  // ── Core Infrastructure (6) ────────────────────────────────────────────────
  db_health: z.object({}),
  persistence_health: z.object({}),
  migration_status: z.object({
    dry_run: z.boolean().optional().describe("Show pending migrations without applying"),
  }),
  registry_sync_status: z.object({
    entity: z.enum(["materials", "machines", "all"]).optional().default("all"),
  }),
  seed_registries: z.object({
    entity: z.enum(["materials", "machines", "all"]).optional().default("all"),
    force: z.boolean().optional().describe("Re-seed even if counts match"),
  }),
  infra_summary: z.object({}),

  // ── PluginEngine Actions (6) ───────────────────────────────────────────────
  plugin_register: z.object({
    manifest: SimplePluginManifestSchema.describe("Plugin manifest to register"),
  }),
  plugin_enable: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to enable"),
    id: z.string().optional().describe("Alias for plugin_id"),
  }),
  plugin_disable: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to disable"),
    id: z.string().optional().describe("Alias for plugin_id"),
  }),
  plugin_list: z.object({
    status: z.enum(["registered", "enabled", "disabled", "error", "incompatible"]).optional()
      .describe("Filter by plugin status"),
  }),
  plugin_stats: z.object({}),
  plugin_hooks: z.object({}),

  // ── PluginManifestEngine Actions (6) ───────────────────────────────────────
  manifest_register: z.object({
    manifest: FullPluginManifestSchema.describe("Full plugin manifest to register"),
  }),
  manifest_validate: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to validate"),
    id: z.string().optional().describe("Alias for plugin_id"),
  }),
  manifest_activate: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to activate"),
    id: z.string().optional().describe("Alias for plugin_id"),
    config: z.record(z.string(), z.unknown()).optional().describe("Plugin configuration"),
  }),
  manifest_deactivate: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to deactivate"),
    id: z.string().optional().describe("Alias for plugin_id"),
  }),
  manifest_list: z.object({
    status: z.enum(["registered", "validated", "active", "inactive", "error"]).optional()
      .describe("Filter by manifest status"),
  }),
  manifest_get: z.object({
    plugin_id: z.string().optional().describe("Plugin ID to get"),
    id: z.string().optional().describe("Alias for plugin_id"),
  }),

  // ── WIRE-UNWIRED-MS0/U-WIRE-INGEST: IngestionOrchestratorEngine ────────────
  /** Read-only ingestion statistics (no params). */
  ingestion_stats: z.object({}),
  /** Read-only list of failed ingestion records (no params). */
  ingestion_get_failed: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-PERFBUDGET: PerformanceBudgetEngine ────────────
  /** Read-only — list all registered performance budgets (no params). */
  perf_budget_list: z.object({}),
  /** Read-only — stats for one operation (operation_id required) or all (no params). */
  perf_budget_stats: z.object({
    operation_id: z.string().min(1).optional().describe("Specific operation to fetch stats for; omit for all"),
    operationId: z.string().min(1).optional().describe("camelCase alias for operation_id"),
  }),
  /** Read-only — recent budget violations (optional limit, default 100). */
  perf_budget_violations: z.object({
    limit: z.number().int().positive().max(10000).optional().describe("Max violations to return (default 100)"),
  }),
  /** Read-only — full budget report (no params). */
  perf_budget_report: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-REGFED: RegistryFederationEngine ───────────────
  /** Read-only — federated query across registries. */
  registry_fed_query: z.object({
    query: z.string().min(1).describe("Free-text query string"),
    registries: z.array(z.string()).optional().describe("Limit search to these registry IDs"),
    limit: z.number().int().positive().max(1000).optional().describe("Max results (default 50)"),
  }),
  /** Read-only — single registry info by ID. */
  registry_fed_get: z.object({
    id: z.string().min(1).optional().describe("Registry ID"),
    registry_id: z.string().min(1).optional().describe("snake_case alias for id"),
  }).refine(
    (d) => (typeof d.id === "string" && d.id.length > 0) || (typeof d.registry_id === "string" && d.registry_id.length > 0),
    { message: "registry_fed_get requires non-empty 'id' (or 'registry_id')" },
  ),
  /** Read-only — list every registry (no params). */
  registry_fed_list: z.object({}),
  /** Read-only — federation-wide stats (no params). */
  registry_fed_stats: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-BATCH-PROCESSOR: BatchProcessor read-only ─────
  /** Read-only — current batch queue size (no params). */
  batch_queue_size: z.object({}),
  /** Read-only — full batch processor stats (queue size, throughput, latencies). */
  batch_stats: z.object({}),
  /** Persist current batch stats to disk (admin/observability; no params). */
  batch_persist_stats: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-DIFF-ENGINE: DiffEngine read-only + admin ─────
  /** Read-only — DiffEngine stats (total/actual/skipped writes, bytes saved). */
  diff_stats: z.object({}),
  /** Persist current DiffEngine stats to disk (no params). */
  diff_persist_stats: z.object({}),
  /** Predicate — would the proposed content change `file_path` on disk?
   *  No mutation. Returns { would_change: boolean }. */
  diff_would_change: z.object({
    file_path: z.string().min(1).describe("Absolute path of the file to test"),
    content: z.string().describe("Proposed file content"),
  }),
  /** Admin — drop cached checksum for one path (forces fresh disk read on next op). */
  diff_invalidate: z.object({
    file_path: z.string().min(1).describe("Absolute path whose cached checksum to drop"),
  }),

  // ── WIRE-UNWIRED-MS0/U-WIRE-CONFIG-ENGINE: ConfigEngine read-only ─────────
  // Mutation actions (set/delete/import/loadDefaults/clear) are intentionally
  // not exposed — config writes go through the engine's typed loadDefaults +
  // file/env adapters, not arbitrary MCP clients.
  /** Read-only — fetch the highest-priority value for one key.
   *  Returns { key, value } or { key, value: null } if unset. */
  config_get: z.object({
    key: z.string().min(1).describe("Config key to fetch"),
  }),
  /** Read-only — fetch the full ConfigEntry (value + source + type + required + secret + updated_at).
   *  Auto-redacts secret values per engine policy. */
  config_get_with_meta: z.object({
    key: z.string().min(1).describe("Config key to fetch"),
  }),
  /** Read-only — list config entries. Optional `prefix` filters to keys starting with that string. */
  config_list: z.object({
    prefix: z.string().optional().describe("If set, return only keys starting with this prefix"),
  }),
  /** Read-only — validate the full config (missing required, type mismatches). No params. */
  config_validate: z.object({}),
  /** Read-only — export config as a flat key→value record.
   *  Secrets are redacted unless `include_secrets` is true. */
  config_export: z.object({
    include_secrets: z.boolean().optional().describe("Include unredacted secret values (default false)"),
  }),

  // ── WIRE-UNWIRED-MS0/U-WIRE-EVENT-ENGINE: EventEngine (in-process pub/sub) ──
  // The `evt_*` prefix avoids collision with the `event_*` actions wired to
  // the separate `eventBusEngine` (DurableJobQueue-backed). subscribe/
  // unsubscribe are NOT exposed — they require an in-process EventHandler
  // function and cannot survive an MCP boundary.
  /** Emit an event onto the in-process bus. */
  evt_emit: z.object({
    topic: z.string().min(1).describe("Event topic (e.g. 'machine.start')"),
    payload: z.unknown().describe("Arbitrary JSON-serializable payload"),
    source: z.string().optional().describe("Origin identifier (default 'system')"),
    correlation_id: z.string().optional().describe("Optional correlation id for tracing"),
  }),
  /** Read-only — recent event history, optionally filtered by topic pattern. */
  evt_history: z.object({
    topic: z.string().optional().describe("Optional topic-pattern filter (wildcard '*' and 'foo.*' supported)"),
    limit: z.number().int().positive().max(1000).optional().describe("Max events to return (default 50)"),
  }),
  /** Re-delivers historical events matching the topic pattern to current subscribers. */
  evt_replay: z.object({
    topic: z.string().min(1).describe("Topic pattern to replay"),
    since: z.string().optional().describe("ISO-8601 cutoff; replay events at or after this timestamp"),
  }),
  /** Read-only — list active subscriptions (id, topic_pattern, subscriber, events_received). */
  evt_subscriptions_list: z.object({}),
  /** Read-only — recent dead-letter events (delivered to no subscriber). */
  evt_dead_letter: z.object({
    limit: z.number().int().positive().max(1000).optional().describe("Max DLQ events to return (default 50)"),
  }),
  /** Read-only — aggregate event-bus stats (total emitted, subs, topics, DLQ count). */
  evt_stats: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-HEALTH-ENGINE: HealthEngine read-only ──────────
  // The `sys_health_` prefix avoids collision with `health_check` already
  // wired in prism_session. registerComponent / unregisterComponent / setVersion
  // / clear are NOT exposed — component registration needs an in-process
  // HealthChecker callback that cannot cross the MCP boundary.
  /** Read-only — run all registered health checkers and return the full report
   *  (status, uptime, per-component results, score). No params. */
  sys_health_check: z.object({}),
  /** Read-only — liveness probe: { alive, uptime_sec }. No params. */
  sys_health_liveness: z.object({}),
  /** Read-only — readiness probe: { ready, components[] }. No params. */
  sys_health_readiness: z.object({}),
  /** Read-only — names of all registered health-check components. No params. */
  sys_health_components: z.object({}),
  /** Read-only — recent health-check history entries. */
  sys_health_history: z.object({
    limit: z.number().int().positive().max(500).optional().describe("Max history entries to return (default 50)"),
  }),

  // ── WIRE-UNWIRED-MS0/U-WIRE-QUEUE-ENGINE: QueueEngine read-only ────────────
  // The `q_` prefix avoids collision with the `job_*` actions wired to the
  // separate durableJobQueueEngine. Mutation surface (enqueue / dequeue /
  // complete / fail / cancel / retry / purge / clear) is NOT exposed — the
  // in-memory QueueEngine has no MCP-facing job processor.
  /** Read-only — fetch a single job by id. Returns { job } or { job: null }. */
  q_get_job: z.object({
    job_id: z.string().min(1).describe("Job id (e.g. 'JOB-000001')"),
  }),
  /** Read-only — list jobs in a queue, optionally filtered by status. */
  q_list_jobs: z.object({
    queue_name: z.string().min(1).describe("Queue name to list"),
    status: z.enum([
      "pending", "processing", "completed", "failed", "cancelled", "dead_letter",
    ]).optional().describe("Optional job-status filter"),
  }),
  /** Read-only — aggregate stats for one queue (per-status counts, throughput). */
  q_stats: z.object({
    queue_name: z.string().min(1).describe("Queue name to summarize"),
  }),
  /** Read-only — names of every queue with at least one job. No params. */
  q_list_queues: z.object({}),

  // ── WIRE-UNWIRED-MS0/U-WIRE-LOGGING-ENGINE: LoggingEngine read-only ────────
  // Write (log/trace/debug/...) + configure + clear are NOT exposed — the
  // structured log buffer is fed by in-process engine calls, not MCP clients.
  /** Read-only — query the structured log buffer with optional filters. */
  log_query: z.object({
    level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).optional()
      .describe("Minimum log level — returns this level and above"),
    namespace: z.string().optional().describe("Namespace exact-match or dotted-prefix match"),
    since: z.string().optional().describe("ISO-8601 lower-bound timestamp (inclusive)"),
    until: z.string().optional().describe("ISO-8601 upper-bound timestamp (inclusive)"),
    search: z.string().optional().describe("Case-insensitive substring match on the message"),
    correlation_id: z.string().optional().describe("Exact correlation-id filter"),
    limit: z.number().int().positive().max(10000).optional().describe("Max entries to return (default 100)"),
  }),
  /** Read-only — aggregate log stats (counts by level + namespace, errors/hour). No params. */
  log_stats: z.object({}),
  /** Read-only — current logging configuration (min level, max entries, namespace filters). */
  log_get_config: z.object({}),
};
