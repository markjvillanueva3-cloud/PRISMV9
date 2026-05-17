/**
 * PRISM Infrastructure Action Schemas — INFRA-1-2
 * Zod schemas for prism_infra dispatcher actions.
 *
 * 18 actions total:
 *   - 6 core infrastructure: db_health, persistence_health, migration_status,
 *       registry_sync_status, seed_registries, infra_summary
 *   - 6 PluginEngine: plugin_register, plugin_enable, plugin_disable,
 *       plugin_list, plugin_stats, plugin_hooks
 *   - 6 PluginManifestEngine: manifest_register, manifest_validate,
 *       manifest_activate, manifest_deactivate, manifest_list, manifest_get
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
};
