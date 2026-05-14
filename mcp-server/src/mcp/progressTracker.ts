/**
 * MCP Progress Tracking for PRISM
 *
 * Sends progress notifications for long-running operations:
 * - CNC simulation (per-block progress)
 * - Monte Carlo analysis (per-trial progress)
 * - Batch program generation (per-operation progress)
 * - Feasibility analysis (per-engine progress)
 *
 * Uses notifications/progress with progressToken from request _meta.
 *
 * @see MCP spec 2025-11-25 utilities/progress
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

let serverInstance: Server | null = null;

export function initProgressTracker(server: Server): void {
  serverInstance = server;
}

/**
 * Send a progress notification to the client.
 * @param token - progressToken from the request's _meta
 * @param progress - Current progress value
 * @param total - Total expected (optional)
 * @param message - Human-readable status message
 */
export function sendProgress(
  token: string | number,
  progress: number,
  total?: number,
  message?: string
): void {
  if (!serverInstance) return;

  try {
    serverInstance.notification({
      method: "notifications/progress",
      params: {
        progressToken: token,
        progress,
        total,
        message,
      },
    });
  } catch {
    // Client may not support progress — silently ignore
  }
}

/**
 * Helper: Create a progress reporter for a multi-step operation.
 * Returns a function that increments and reports progress.
 */
export function createProgressReporter(
  token: string | number | undefined,
  total: number,
  label: string
): (step?: number, detail?: string) => void {
  if (!token) return () => {};

  let current = 0;
  return (step = 1, detail?: string) => {
    current += step;
    const msg = detail
      ? `${label}: ${detail} (${current}/${total})`
      : `${label}: ${current}/${total}`;
    sendProgress(token, current, total, msg);
  };
}

/**
 * Pre-built reporters for common PRISM operations.
 */
export const reporters = {
  simulation(
    token: string | number | undefined,
    totalBlocks: number
  ) {
    return createProgressReporter(
      token, totalBlocks, "CNC Simulation"
    );
  },

  monteCarlo(
    token: string | number | undefined,
    totalTrials: number
  ) {
    return createProgressReporter(
      token, totalTrials, "Monte Carlo"
    );
  },

  pipeline(
    token: string | number | undefined,
    totalStages: number
  ) {
    return createProgressReporter(
      token, totalStages, "Pipeline"
    );
  },

  feasibility(
    token: string | number | undefined,
    totalEngines: number
  ) {
    return createProgressReporter(
      token, totalEngines, "Feasibility"
    );
  },

  batch(
    token: string | number | undefined,
    totalItems: number
  ) {
    return createProgressReporter(
      token, totalItems, "Batch Processing"
    );
  },
};
