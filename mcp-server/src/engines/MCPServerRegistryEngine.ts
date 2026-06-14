/**
 * MCPServerRegistryEngine — HMPI01 MCP plugin/integration registry.
 *
 * Pure-core registry of MCP servers PRISM consumes/exposes.  Each server's
 * manifest declares transport (stdio/http/sse), capability surface, and
 * tier (vendor / community / internal).  Composes with U-HCAP01 plugin
 * registry but specialized for MCP-protocol-conformant integrations.
 *
 * @module engines/MCPServerRegistryEngine
 */

import { z } from "zod";

export const MCPTransportSchema = z.enum(["stdio", "http", "sse", "websocket"]);
export type MCPTransport = z.infer<typeof MCPTransportSchema>;

export const MCPServerTierSchema = z.enum(["vendor", "community", "internal", "experimental"]);
export type MCPServerTier = z.infer<typeof MCPServerTierSchema>;

export const MCPServerManifestSchema = z.object({
  server_id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  endpoint: z.string().min(1).max(500),
  transport: MCPTransportSchema,
  tier: MCPServerTierSchema,
  tool_names: z.array(z.string().min(1).max(120)).min(0).max(500),
  oauth_required: z.boolean().default(false),
  added_at: z.string().min(1),
});
export type MCPServerManifest = z.infer<typeof MCPServerManifestSchema>;

export interface MCPRegistryState { servers: MCPServerManifest[]; }

const HARD_SERVER_CEILING = 100;

export class MCPServerRegistryEngine {
  static validate(m: unknown): MCPServerManifest { return MCPServerManifestSchema.parse(m); }
  static empty(): MCPRegistryState { return { servers: [] }; }

  static register(state: MCPRegistryState, manifest: MCPServerManifest): MCPRegistryState {
    MCPServerManifestSchema.parse(manifest);
    if (state.servers.some((s) => s.server_id === manifest.server_id)) {
      throw new Error(`MCPServerRegistry: duplicate server_id ${manifest.server_id}`);
    }
    if (state.servers.length >= HARD_SERVER_CEILING) {
      throw new Error(`MCPServerRegistry: ceiling ${HARD_SERVER_CEILING} reached`);
    }
    return { servers: [...state.servers, manifest] };
  }

  static deregister(state: MCPRegistryState, server_id: string): MCPRegistryState {
    const filtered = state.servers.filter((s) => s.server_id !== server_id);
    if (filtered.length === state.servers.length) {
      throw new Error(`MCPServerRegistry: server_id ${server_id} not found`);
    }
    return { servers: filtered };
  }

  static findByTool(state: MCPRegistryState, tool_name: string): MCPServerManifest[] {
    return state.servers.filter((s) => s.tool_names.includes(tool_name));
  }

  static filterByTier(state: MCPRegistryState, tier: MCPServerTier): MCPServerManifest[] {
    MCPServerTierSchema.parse(tier);
    return state.servers.filter((s) => s.tier === tier);
  }

  static filterByTransport(state: MCPRegistryState, transport: MCPTransport): MCPServerManifest[] {
    MCPTransportSchema.parse(transport);
    return state.servers.filter((s) => s.transport === transport);
  }

  /** Find servers requiring OAuth (operator surface for credential-rotation cron). */
  static findOAuthGated(state: MCPRegistryState): MCPServerManifest[] {
    return state.servers.filter((s) => s.oauth_required);
  }

  static renderState(state: MCPRegistryState): string {
    if (state.servers.length === 0) return "[MCP-SERVERS] (empty)";
    return [
      `[MCP-SERVERS] ${state.servers.length} registered`,
      ...state.servers.map((s) =>
        `  ${s.server_id}  [${s.tier}/${s.transport}]  tools=${s.tool_names.length}  oauth=${s.oauth_required}`,
      ),
    ].join("\n");
  }
}

export const mcpServerRegistryEngine = MCPServerRegistryEngine;
