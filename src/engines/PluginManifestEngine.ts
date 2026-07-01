/**
 * PluginManifestEngine — Plugin Manifest Format + Lifecycle Management
 * INFRA-7-2 U-PLG2
 *
 * Defines the plugin manifest JSON schema, validates manifests,
 * and manages plugin lifecycle (register → validate → activate → deactivate).
 *
 * Actions: plugin_register, plugin_validate, plugin_activate,
 *          plugin_deactivate, plugin_list, plugin_get
 */
import { z } from "zod";
import { log } from "../utils/Logger.js";

// ============================================================================
// Manifest Schema (Zod)
// ============================================================================

/** Permission scopes a plugin can request */
const PluginPermissionSchema = z.enum([
  "read:materials",
  "read:tools",
  "read:machines",
  "read:formulas",
  "write:custom_data",
  "execute:calculations",
  "execute:pipelines",
  "hook:before_calculate",
  "hook:after_calculate",
  "hook:before_program",
  "hook:after_program",
]);

/** Plugin manifest — required in every plugin package */
export const PluginManifestSchema = z.object({
  /** Unique plugin identifier (npm-style: @scope/name or name) */
  id: z.string().regex(/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/, "Plugin ID must be lowercase, alphanumeric, hyphens only"),
  /** Semantic version */
  version: z.string().regex(/^\d+\.\d+\.\d+/, "Must be semver (e.g., 1.0.0)"),
  /** Human-readable name */
  name: z.string().min(3).max(100),
  /** Description */
  description: z.string().max(500),
  /** Author info */
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional(),
  }),
  /** Minimum PRISM version required */
  prism_version: z.string().regex(/^\d+\.\d+\.\d+/).default("1.0.0"),
  /** Entry point (relative path to main module) */
  main: z.string().default("index.js"),
  /** Permissions requested */
  permissions: z.array(PluginPermissionSchema).default([]),
  /** Hooks this plugin registers */
  hooks: z.array(z.object({
    point: z.string(),
    handler: z.string(),
    priority: z.number().min(0).max(1000).default(500),
  })).default([]),
  /** Custom actions this plugin provides */
  actions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    handler: z.string(),
  })).default([]),
  /** Configuration schema (JSON Schema) */
  config_schema: z.record(z.string(), z.unknown()).optional(),
  /** Tags for discoverability */
  tags: z.array(z.string()).default([]),
  /** License */
  license: z.string().default("UNLICENSED"),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
export type PluginPermission = z.infer<typeof PluginPermissionSchema>;

// ============================================================================
// Plugin State
// ============================================================================

export type PluginStatus = "registered" | "validated" | "active" | "inactive" | "error";

export interface PluginRecord {
  manifest: PluginManifest;
  status: PluginStatus;
  registered_at: string;
  activated_at?: string;
  deactivated_at?: string;
  error?: string;
  config?: Record<string, unknown>;
}

// ============================================================================
// Engine
// ============================================================================

export class PluginManifestEngine {
  private plugins = new Map<string, PluginRecord>();

  /** Register a plugin from its manifest */
  register(manifest: unknown): { ok: boolean; plugin_id?: string; error?: string } {
    const parsed = PluginManifestSchema.safeParse(manifest);
    if (!parsed.success) {
      return { ok: false, error: `Invalid manifest: ${parsed.error.issues.map(i => i.message).join(", ")}` };
    }

    const m = parsed.data;
    if (this.plugins.has(m.id)) {
      return { ok: false, error: `Plugin '${m.id}' is already registered. Deactivate and remove first.` };
    }

    this.plugins.set(m.id, {
      manifest: m,
      status: "registered",
      registered_at: new Date().toISOString(),
    });

    log.info(`[PluginManifest] Registered plugin: ${m.id} v${m.version}`);
    return { ok: true, plugin_id: m.id };
  }

  /** Validate a registered plugin */
  validate(pluginId: string): { ok: boolean; warnings: string[]; error?: string } {
    const record = this.plugins.get(pluginId);
    if (!record) return { ok: false, warnings: [], error: `Plugin '${pluginId}' not found` };

    const warnings: string[] = [];
    const m = record.manifest;

    // Check permissions
    if (m.permissions.length === 0) {
      warnings.push("Plugin requests no permissions — it won't be able to access any data");
    }
    if (m.permissions.includes("execute:pipelines")) {
      warnings.push("Plugin requests pipeline execution — this is a high-privilege permission");
    }

    // Check hooks
    for (const hook of m.hooks) {
      if (hook.priority > 900) {
        warnings.push(`Hook '${hook.point}' has very high priority (${hook.priority}) — may override core behavior`);
      }
    }

    // Check version compatibility
    // (In production, compare m.prism_version against actual PRISM version)

    record.status = "validated";
    return { ok: true, warnings };
  }

  /** Activate a validated plugin */
  activate(pluginId: string, config?: Record<string, unknown>): { ok: boolean; error?: string } {
    const record = this.plugins.get(pluginId);
    if (!record) return { ok: false, error: `Plugin '${pluginId}' not found` };
    if (record.status !== "validated" && record.status !== "inactive") {
      return { ok: false, error: `Plugin must be validated before activation (current: ${record.status})` };
    }

    record.status = "active";
    record.activated_at = new Date().toISOString();
    record.config = config;

    log.info(`[PluginManifest] Activated plugin: ${pluginId}`);
    return { ok: true };
  }

  /** Deactivate an active plugin */
  deactivate(pluginId: string): { ok: boolean; error?: string } {
    const record = this.plugins.get(pluginId);
    if (!record) return { ok: false, error: `Plugin '${pluginId}' not found` };
    if (record.status !== "active") {
      return { ok: false, error: `Plugin is not active (current: ${record.status})` };
    }

    record.status = "inactive";
    record.deactivated_at = new Date().toISOString();

    log.info(`[PluginManifest] Deactivated plugin: ${pluginId}`);
    return { ok: true };
  }

  /** Remove a plugin entirely */
  remove(pluginId: string): { ok: boolean; error?: string } {
    const record = this.plugins.get(pluginId);
    if (!record) return { ok: false, error: `Plugin '${pluginId}' not found` };
    if (record.status === "active") {
      return { ok: false, error: "Deactivate plugin before removing" };
    }

    this.plugins.delete(pluginId);
    return { ok: true };
  }

  /** List all plugins */
  list(filter?: { status?: PluginStatus }): PluginRecord[] {
    const all = Array.from(this.plugins.values());
    if (filter?.status) return all.filter(p => p.status === filter.status);
    return all;
  }

  /** Get a specific plugin */
  get(pluginId: string): PluginRecord | null {
    return this.plugins.get(pluginId) ?? null;
  }

  /** Validate a manifest without registering */
  static validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
    const parsed = PluginManifestSchema.safeParse(manifest);
    if (parsed.success) return { valid: true, errors: [] };
    return { valid: false, errors: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
  }
}

/** Singleton instance */
export const pluginManifestEngine = new PluginManifestEngine();
