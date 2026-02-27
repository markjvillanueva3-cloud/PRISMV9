/**
 * PluginEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Plugin lifecycle management: discovery, registration, loading,
 * enabling/disabling, dependency resolution, and hook system.
 *
 * Actions: plugin_register, plugin_enable, plugin_disable,
 *          plugin_list, plugin_hooks, plugin_stats
 */

// ============================================================================
// TYPES
// ============================================================================

export type PluginStatus = "registered" | "enabled" | "disabled" | "error" | "incompatible";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  min_prism_version?: string;
  hooks?: string[];
  permissions?: string[];
}

export interface Plugin {
  manifest: PluginManifest;
  status: PluginStatus;
  enabled_at?: string;
  disabled_at?: string;
  error?: string;
  load_time_ms?: number;
  hooks_registered: string[];
}

export interface PluginHook {
  plugin_id: string;
  hook_name: string;
  priority: number;
  handler: (context: Record<string, unknown>) => Record<string, unknown>;
}

export interface PluginStats {
  total_plugins: number;
  enabled: number;
  disabled: number;
  errored: number;
  total_hooks: number;
  by_status: Record<PluginStatus, number>;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PluginEngine {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<string, PluginHook[]>();

  register(manifest: PluginManifest): Plugin {
    // Check dependencies
    const missingDeps = (manifest.dependencies || []).filter(d => !this.plugins.has(d));
    const status: PluginStatus = missingDeps.length > 0 ? "incompatible" : "registered";
    const error = missingDeps.length > 0 ? `Missing dependencies: ${missingDeps.join(", ")}` : undefined;

    const plugin: Plugin = {
      manifest, status, error,
      hooks_registered: [],
    };

    this.plugins.set(manifest.id, plugin);
    return plugin;
  }

  enable(pluginId: string): { success: boolean; error?: string } {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return { success: false, error: "Plugin not found" };
    if (plugin.status === "incompatible") return { success: false, error: plugin.error || "Incompatible plugin" };

    const start = performance.now();

    // Register hooks
    if (plugin.manifest.hooks) {
      for (const hookName of plugin.manifest.hooks) {
        this.registerHook(pluginId, hookName, 100, (ctx) => ctx);
        plugin.hooks_registered.push(hookName);
      }
    }

    plugin.status = "enabled";
    plugin.enabled_at = new Date().toISOString();
    plugin.load_time_ms = Math.round(performance.now() - start);
    plugin.error = undefined;

    return { success: true };
  }

  disable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // Unregister hooks
    for (const hookName of plugin.hooks_registered) {
      const hookList = this.hooks.get(hookName);
      if (hookList) {
        this.hooks.set(hookName, hookList.filter(h => h.plugin_id !== pluginId));
      }
    }
    plugin.hooks_registered = [];
    plugin.status = "disabled";
    plugin.disabled_at = new Date().toISOString();

    return true;
  }

  unregister(pluginId: string): boolean {
    this.disable(pluginId);
    return this.plugins.delete(pluginId);
  }

  registerHook(pluginId: string, hookName: string, priority: number, handler: PluginHook["handler"]): void {
    const hook: PluginHook = { plugin_id: pluginId, hook_name: hookName, priority, handler };
    const existing = this.hooks.get(hookName) || [];
    existing.push(hook);
    existing.sort((a, b) => a.priority - b.priority);
    this.hooks.set(hookName, existing);
  }

  executeHook(hookName: string, context: Record<string, unknown>): Record<string, unknown> {
    const hookList = this.hooks.get(hookName);
    if (!hookList) return context;

    let result = { ...context };
    for (const hook of hookList) {
      try {
        result = hook.handler(result);
      } catch {
        // Hook failure shouldn't crash pipeline
      }
    }
    return result;
  }

  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  list(status?: PluginStatus): Plugin[] {
    let result = [...this.plugins.values()];
    if (status) result = result.filter(p => p.status === status);
    return result;
  }

  listHooks(): { hook_name: string; plugin_count: number }[] {
    return [...this.hooks.entries()].map(([name, hooks]) => ({
      hook_name: name,
      plugin_count: hooks.length,
    }));
  }

  stats(): PluginStats {
    const byStatus: Record<PluginStatus, number> = { registered: 0, enabled: 0, disabled: 0, error: 0, incompatible: 0 };
    let totalHooks = 0;

    for (const p of this.plugins.values()) {
      byStatus[p.status]++;
      totalHooks += p.hooks_registered.length;
    }

    return {
      total_plugins: this.plugins.size,
      enabled: byStatus.enabled,
      disabled: byStatus.disabled,
      errored: byStatus.error,
      total_hooks: totalHooks,
      by_status: byStatus,
    };
  }

  clear(): void { this.plugins.clear(); this.hooks.clear(); }
}

export const pluginEngine = new PluginEngine();
