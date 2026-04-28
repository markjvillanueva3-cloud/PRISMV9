/**
 * MCP Barrel File — Re-exports core MCP utilities
 * @module mcp/index
 */

import { log } from "../utils/Logger.js";

/**
 * Stub registration helpers — accept the runtime MCP server (either the SDK's
 * raw `Server` or the higher-level `McpServer`) as `unknown` to avoid pulling
 * in nominal-typed generics that drift between SDK versions.
 */
export function registerResources(_server: unknown): void {
  log.debug("[mcp/index] registerResources called (stub)");
}

export function registerPrompts(_server: unknown): void {
  log.debug("[mcp/index] registerPrompts called (stub)");
}

export function registerTaskTools(_server: unknown): void {
  log.debug("[mcp/index] registerTaskTools called (stub)");
}

/** Initialize MCP logging — optional `_server` argument is accepted but unused. */
export function initMcpLogging(_server?: unknown): void {
  log.debug("[mcp/index] MCP logging initialized");
}

/** Re-export getAuthConfig from authConfig */
export { getAuthConfig } from "./authConfig.js";
