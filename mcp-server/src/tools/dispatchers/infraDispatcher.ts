/**
 * PRISM Infrastructure Dispatcher — INFRA-1-2
 * =============================================
 *
 * prism_infra — 18 actions for database health, persistence monitoring,
 * migration status, registry sync, infrastructure summary, and plugin management.
 *
 * Plugin Actions (6):
 *   - plugin_register: Register a plugin from manifest
 *   - plugin_enable: Enable a registered plugin
 *   - plugin_disable: Disable an enabled plugin
 *   - plugin_list: List all registered plugins
 *   - plugin_stats: Get plugin statistics
 *   - plugin_hooks: List registered hooks across plugins
 *
 * Plugin Manifest Actions (6):
 *   - manifest_register: Register and validate a plugin manifest
 *   - manifest_validate: Validate a registered plugin manifest
 *   - manifest_activate: Activate a validated plugin
 *   - manifest_deactivate: Deactivate an active plugin
 *   - manifest_list: List all plugin manifests
 *   - manifest_get: Get a specific plugin manifest
 *
 * @version 1.1.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_INFRA_SCHEMAS } from "../../schemas/infraActionSchemas.js";
import { SCHEMA_VERSION } from "../../schemas/schemaVersioning.js";

export function registerInfraDispatcher(server: McpServer): void {
  server.tool(
    "prism_infra",
    "Infrastructure health & observability. Database connectivity, PersistenceBridge stats, migration status, registry sync verification, manual re-seeding, plugin lifecycle management. Actions: db_health, persistence_health, migration_status, registry_sync_status, seed_registries, infra_summary, plugin_register, plugin_enable, plugin_disable, plugin_list, plugin_stats, plugin_hooks, manifest_register, manifest_validate, manifest_activate, manifest_deactivate, manifest_list, manifest_get",
    {
      action: z.enum([
        "db_health", "persistence_health", "migration_status",
        "registry_sync_status", "seed_registries", "infra_summary",
        // PluginEngine actions
        "plugin_register", "plugin_enable", "plugin_disable",
        "plugin_list", "plugin_stats", "plugin_hooks",
        // PluginManifestEngine actions
        "manifest_register", "manifest_validate", "manifest_activate",
        "manifest_deactivate", "manifest_list", "manifest_get",
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
              timestamp: new Date().toISOString(),
              schema_version: SCHEMA_VERSION,
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

            result = summary;
            break;
          }

          // ── PluginEngine Actions (6) ─────────────────────────────────────────
          case "plugin_register": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            const manifest = params.manifest;
            if (!manifest || !manifest.id || !manifest.name || !manifest.version) {
              result = { success: false, error: "manifest must include id, name, and version" };
              break;
            }
            const plugin = pluginEngine.register(manifest);
            result = { success: true, plugin };
            log.info(`[prism_infra] Registered plugin: ${manifest.id}`);
            break;
          }

          case "plugin_enable": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { success: false, error: "plugin_id is required" };
              break;
            }
            const enableResult = pluginEngine.enable(pluginId);
            result = enableResult;
            if (enableResult.success) {
              log.info(`[prism_infra] Enabled plugin: ${pluginId}`);
            }
            break;
          }

          case "plugin_disable": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { success: false, error: "plugin_id is required" };
              break;
            }
            const disabled = pluginEngine.disable(pluginId);
            result = { success: disabled };
            if (disabled) {
              log.info(`[prism_infra] Disabled plugin: ${pluginId}`);
            }
            break;
          }

          case "plugin_list": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            const status = params.status;
            const plugins = pluginEngine.list(status);
            result = {
              count: plugins.length,
              plugins: plugins.map(p => ({
                id: p.manifest.id,
                name: p.manifest.name,
                version: p.manifest.version,
                status: p.status,
                hooks_registered: p.hooks_registered.length,
              })),
            };
            break;
          }

          case "plugin_stats": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            result = pluginEngine.stats();
            break;
          }

          case "plugin_hooks": {
            const { pluginEngine } = await import("../../engines/PluginEngine.js");
            const hooks = pluginEngine.listHooks();
            result = {
              count: hooks.length,
              hooks,
            };
            break;
          }

          // ── PluginManifestEngine Actions (6) ─────────────────────────────────
          case "manifest_register": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const manifest = params.manifest;
            if (!manifest) {
              result = { ok: false, error: "manifest is required" };
              break;
            }
            result = pluginManifestEngine.register(manifest);
            break;
          }

          case "manifest_validate": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { ok: false, warnings: [], error: "plugin_id is required" };
              break;
            }
            result = pluginManifestEngine.validate(pluginId);
            break;
          }

          case "manifest_activate": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { ok: false, error: "plugin_id is required" };
              break;
            }
            result = pluginManifestEngine.activate(pluginId, params.config);
            break;
          }

          case "manifest_deactivate": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { ok: false, error: "plugin_id is required" };
              break;
            }
            result = pluginManifestEngine.deactivate(pluginId);
            break;
          }

          case "manifest_list": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const status = params.status;
            const plugins = pluginManifestEngine.list(status ? { status } : undefined);
            result = {
              count: plugins.length,
              plugins: plugins.map(p => ({
                id: p.manifest.id,
                name: p.manifest.name,
                version: p.manifest.version,
                status: p.status,
                registered_at: p.registered_at,
                activated_at: p.activated_at,
              })),
            };
            break;
          }

          case "manifest_get": {
            const { pluginManifestEngine } = await import("../../engines/PluginManifestEngine.js");
            const pluginId = params.plugin_id || params.id;
            if (!pluginId) {
              result = { error: "plugin_id is required" };
              break;
            }
            const record = pluginManifestEngine.get(pluginId);
            result = record ? { found: true, plugin: record } : { found: false, error: `Plugin '${pluginId}' not found` };
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
