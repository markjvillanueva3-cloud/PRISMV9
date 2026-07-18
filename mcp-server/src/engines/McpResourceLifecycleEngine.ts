/**
 * McpResourceLifecycleEngine — HMPI10 MCP resource lifecycle state machine.
 *
 * Pure-core: tracks MCP resource (file/db/api) lifecycle states with
 * deterministic transitions: requested → loading → ready → revoked.
 *
 * @module engines/McpResourceLifecycleEngine
 */

import { z } from "zod";

export const ResourceStateSchema = z.enum(["requested", "loading", "ready", "failed", "revoked"]);
export type ResourceState = z.infer<typeof ResourceStateSchema>;

export const McpResourceSchema = z.object({
  resource_id: z.string().min(1).max(120),
  uri: z.string().min(1).max(1000),
  kind: z.enum(["file", "database", "api", "memory", "other"]),
  state: ResourceStateSchema,
  loaded_at: z.string().optional(),
  size_bytes: z.number().int().min(0).optional(),
  failure_reason: z.string().max(500).optional(),
});
export type McpResource = z.infer<typeof McpResourceSchema>;

export class McpResourceLifecycleEngine {
  static validate(r: unknown): McpResource { return McpResourceSchema.parse(r); }

  static beginLoad(resource: McpResource): McpResource {
    if (resource.state !== "requested") throw new Error(`McpResourceLifecycle.beginLoad: invalid state ${resource.state}`);
    return McpResourceSchema.parse({ ...resource, state: "loading" });
  }

  static markReady(resource: McpResource, size_bytes: number, at: string): McpResource {
    if (resource.state !== "loading") throw new Error(`McpResourceLifecycle.markReady: invalid state ${resource.state}`);
    return McpResourceSchema.parse({ ...resource, state: "ready", size_bytes, loaded_at: at });
  }

  static markFailed(resource: McpResource, reason: string): McpResource {
    if (resource.state !== "loading" && resource.state !== "requested") {
      throw new Error(`McpResourceLifecycle.markFailed: invalid state ${resource.state}`);
    }
    return McpResourceSchema.parse({ ...resource, state: "failed", failure_reason: reason });
  }

  static revoke(resource: McpResource): McpResource {
    if (resource.state !== "ready") throw new Error(`McpResourceLifecycle.revoke: can only revoke ready resources`);
    return McpResourceSchema.parse({ ...resource, state: "revoked" });
  }

  static renderResource(r: McpResource): string {
    return `[MCP-RES ${r.state.toUpperCase()}] ${r.resource_id} kind=${r.kind} uri=${r.uri.slice(0, 80)}${r.size_bytes ? ` size=${r.size_bytes}B` : ""}${r.failure_reason ? ` (${r.failure_reason})` : ""}`;
  }
}

export const mcpResourceLifecycleEngine = McpResourceLifecycleEngine;
