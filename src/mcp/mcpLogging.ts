/**
 * MCP Structured Logging for PRISM
 *
 * Wraps MCP logging notifications (RFC 5424 severity levels) to stream
 * structured physics engine data to MCP clients.
 *
 * Levels: debug < info < notice < warning < error < critical < alert < emergency
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/logging
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

export type McpLogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

let serverInstance: Server | null = null;
let currentMinLevel: McpLogLevel = "info";

const LEVEL_ORDER: Record<McpLogLevel, number> = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7,
};

/**
 * Initialize MCP logging with the low-level Server instance.
 * Must be called after server initialization.
 */
export function initMcpLogging(server: Server): void {
  serverInstance = server;
}

/**
 * Set the minimum log level (called by client via logging/setLevel).
 */
export function setMinLogLevel(level: McpLogLevel): void {
  currentMinLevel = level;
}

/**
 * Send a structured log message to the MCP client.
 * Messages below the minimum level are silently dropped.
 */
export function mcpLog(
  level: McpLogLevel,
  logger: string,
  data: Record<string, unknown> | string
): void {
  if (!serverInstance) return;
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentMinLevel]) return;

  try {
    serverInstance.notification({
      method: "notifications/message",
      params: {
        level,
        logger,
        data: typeof data === "string" ? { message: data } : data,
      },
    });
  } catch {
    // Silently ignore if client doesn't support logging
  }
}

// ═══════════════════════════════════════════════════════════════
// Domain-specific logging helpers for PRISM physics engines
// ═══════════════════════════════════════════════════════════════

/** Log a physics calculation result */
export function logPhysics(engine: string, data: Record<string, unknown>): void {
  mcpLog("info", `physics.${engine}`, data);
}

/** Log a safety check result */
export function logSafety(check: string, data: Record<string, unknown>): void {
  mcpLog("warning", `safety.${check}`, data);
}

/** Log a speed/feed calculation step */
export function logSpeedFeed(step: string, data: Record<string, unknown>): void {
  mcpLog("debug", `speedfeed.${step}`, data);
}

/** Log a simulation progress update */
export function logSimulation(phase: string, data: Record<string, unknown>): void {
  mcpLog("info", `simulation.${phase}`, data);
}

/** Log a pipeline stage completion */
export function logPipeline(pipeline: string, stage: string, data: Record<string, unknown>): void {
  mcpLog("info", `pipeline.${pipeline}.${stage}`, data);
}

/** Log a playbook rule match */
export function logPlaybook(rule: string, data: Record<string, unknown>): void {
  mcpLog("debug", `playbook.${rule}`, data);
}

/** Log a tool catalog lookup */
export function logCatalog(operation: string, data: Record<string, unknown>): void {
  mcpLog("debug", `catalog.${operation}`, data);
}

/** Log a critical manufacturing error */
export function logManufacturingError(source: string, data: Record<string, unknown>): void {
  mcpLog("error", `manufacturing.${source}`, data);
}
