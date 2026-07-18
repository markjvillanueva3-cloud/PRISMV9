/**
 * PluginRegistryEngine — HCAP01 capability-layer plugin registry.
 *
 * Pure-core registry for Hermes-style capability plugins (file readers,
 * Excel parsers, web scrapers, etc.).  Plugins register a manifest declaring
 * their capability surface (input kinds, output kinds, side-effect tier);
 * callers query the registry by capability to find an installed plugin.
 *
 * Composes with U-HAGI02 UnifiedControlPlane: plugins with side_effect=
 * "external" require approval before invocation.
 *
 * @module engines/PluginRegistryEngine
 */

import { z } from "zod";

export const SideEffectTierSchema = z.enum(["pure", "local-io", "external", "destructive"]);
export type SideEffectTier = z.infer<typeof SideEffectTierSchema>;

export const PluginManifestSchema = z.object({
  plugin_id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  version: z.string().min(1).max(40),
  capabilities: z.array(z.string().min(1).max(120)).min(1).max(50),
  input_kinds: z.array(z.string()).max(20),
  output_kinds: z.array(z.string()).max(20),
  side_effect: SideEffectTierSchema,
  hermes_compliant: z.boolean().default(false),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export interface PluginRegistryState {
  plugins: PluginManifest[];
}

const HARD_PLUGIN_CEILING = 200;

export class PluginRegistryEngine {
  static validate(m: unknown): PluginManifest { return PluginManifestSchema.parse(m); }

  static empty(): PluginRegistryState { return { plugins: [] }; }

  /** Register a plugin; throws on duplicate plugin_id or ceiling. */
  static register(state: PluginRegistryState, manifest: PluginManifest): PluginRegistryState {
    PluginManifestSchema.parse(manifest);
    if (state.plugins.some((p) => p.plugin_id === manifest.plugin_id)) {
      throw new Error(`PluginRegistry.register: duplicate plugin_id ${manifest.plugin_id}`);
    }
    if (state.plugins.length >= HARD_PLUGIN_CEILING) {
      throw new Error(`PluginRegistry.register: ceiling ${HARD_PLUGIN_CEILING} reached`);
    }
    return { plugins: [...state.plugins, manifest] };
  }

  /** Find all plugins that expose a given capability. */
  static findByCapability(state: PluginRegistryState, capability: string): PluginManifest[] {
    return state.plugins.filter((p) => p.capabilities.includes(capability));
  }

  /** Find plugins by side-effect tier (operator filter). */
  static filterBySideEffect(state: PluginRegistryState, tier: SideEffectTier): PluginManifest[] {
    SideEffectTierSchema.parse(tier);
    return state.plugins.filter((p) => p.side_effect === tier);
  }

  /** Deregister a plugin by id. */
  static deregister(state: PluginRegistryState, plugin_id: string): PluginRegistryState {
    const before = state.plugins.length;
    const plugins = state.plugins.filter((p) => p.plugin_id !== plugin_id);
    if (plugins.length === before) {
      throw new Error(`PluginRegistry.deregister: plugin_id ${plugin_id} not found`);
    }
    return { plugins };
  }

  /** Render registry for operator audit. */
  static renderState(state: PluginRegistryState): string {
    if (state.plugins.length === 0) return "[PLUGINS] (empty)";
    return [
      `[PLUGINS] ${state.plugins.length} registered`,
      ...state.plugins.map((p) =>
        `  ${p.plugin_id}@${p.version}  [${p.side_effect}]  caps=${p.capabilities.length}  hermes=${p.hermes_compliant}`,
      ),
    ].join("\n");
  }
}

export const pluginRegistryEngine = PluginRegistryEngine;
