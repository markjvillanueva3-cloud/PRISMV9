/**
 * PluginInstallManifestEngine — HMPI09 plugin install manifest validation.
 *
 * Pure-core validator over a plugin install manifest (id, version, entry,
 * declared capabilities, declared MCP servers, peer deps).  Cross-checks:
 * version is semver-shape, declared capabilities are unique, no
 * self-circular peer deps.
 *
 * @module engines/PluginInstallManifestEngine
 */

import { z } from "zod";

const SEMVER_RE = /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/;

export const PluginInstallManifestSchema = z.object({
  plugin_id: z.string().min(1).max(120),
  version: z.string().regex(SEMVER_RE, "version must be semver-shaped"),
  entry: z.string().min(1).max(500),
  declared_capabilities: z.array(z.string().min(1).max(120)).max(100),
  declared_mcp_servers: z.array(z.string().min(1).max(120)).max(20),
  peer_deps: z.array(z.string().min(1).max(120)).max(50),
});
export type PluginInstallManifest = z.infer<typeof PluginInstallManifestSchema>;

export interface ManifestValidation {
  plugin_id: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PluginInstallManifestEngine {
  static validate(m: unknown): PluginInstallManifest { return PluginInstallManifestSchema.parse(m); }

  /** Cross-field validation beyond zod schema. */
  static check(manifest: PluginInstallManifest): ManifestValidation {
    PluginInstallManifestSchema.parse(manifest);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Uniqueness of declared_capabilities.
    const capSet = new Set(manifest.declared_capabilities);
    if (capSet.size !== manifest.declared_capabilities.length) {
      errors.push("declared_capabilities contains duplicates");
    }
    // Uniqueness of declared_mcp_servers.
    const srvSet = new Set(manifest.declared_mcp_servers);
    if (srvSet.size !== manifest.declared_mcp_servers.length) {
      errors.push("declared_mcp_servers contains duplicates");
    }
    // Uniqueness of peer_deps.
    const depSet = new Set(manifest.peer_deps);
    if (depSet.size !== manifest.peer_deps.length) {
      errors.push("peer_deps contains duplicates");
    }
    // Self-circular peer_dep.
    if (manifest.peer_deps.includes(manifest.plugin_id)) {
      errors.push("self-circular peer_dep — plugin lists itself");
    }
    // Zero capabilities → warn.
    if (manifest.declared_capabilities.length === 0) {
      warnings.push("no declared_capabilities — plugin exposes nothing");
    }
    // Pre-release version → warn.
    if (manifest.version.includes("-")) {
      warnings.push(`pre-release version ${manifest.version} — not production-stable`);
    }

    return {
      plugin_id: manifest.plugin_id,
      valid: errors.length === 0,
      errors, warnings,
    };
  }

  /** Check if version is a pre-release per semver. */
  static isPrerelease(version: string): boolean {
    return SEMVER_RE.test(version) && version.includes("-");
  }

  static renderValidation(v: ManifestValidation): string {
    const tag = v.valid ? "OK" : "INVALID";
    const errs = v.errors.length === 0 ? "" : ` | errors: ${v.errors.join("; ")}`;
    const warns = v.warnings.length === 0 ? "" : ` | warnings: ${v.warnings.join("; ")}`;
    return `[MANIFEST ${tag}] ${v.plugin_id}${errs}${warns}`;
  }
}

export const pluginInstallManifestEngine = PluginInstallManifestEngine;
