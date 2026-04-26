/**
 * MCP Barrel File — Re-exports core MCP utilities
 * @module mcp/index
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { log } from "../utils/Logger.js";

/** Stub: registerResources - resource registration handled elsewhere */
export function registerResources(_server: Server): void {
  log.debug("[mcp/index] registerResources called (stub)");
}

/** Stub: registerPrompts - prompt registration handled elsewhere */
export function registerPrompts(_server: Server): void {
  log.debug("[mcp/index] registerPrompts called (stub)");
}

/** Stub: registerTaskTools - task tools registration handled elsewhere */
export function registerTaskTools(_server: Server): void {
  log.debug("[mcp/index] registerTaskTools called (stub)");
}

/** Initialize MCP logging */
export function initMcpLogging(): void {
  log.debug("[mcp/index] MCP logging initialized");
}

/** Re-export getAuthConfig from authConfig */
export { getAuthConfig } from "./authConfig.js";
