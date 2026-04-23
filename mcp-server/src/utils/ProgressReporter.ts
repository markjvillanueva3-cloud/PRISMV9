/**
 * Progress Reporter — MCP Streaming Progress for Long-Running Operations
 * ========================================================================
 * Wraps MCP's progress token support to provide incremental updates during
 * multi-step pipeline operations (DFM checks, full-job quotes, program generation).
 *
 * Clean-room implementation inspired by streaming progress patterns in agentic tools.
 *
 * @module utils/ProgressReporter
 * @version 1.0.0
 */

import { log } from "./Logger.js";

/** Progress update payload */
export interface ProgressUpdate {
  progress: number;       // 0.0 to 1.0
  total?: number;         // total steps (optional)
  message: string;        // human-readable status
  step?: string;          // machine-readable step identifier
}

/** Actions known to be long-running (>5s typical) */
export const LONG_RUNNING_ACTIONS = new Set([
  // Pipeline operations
  "prism_cam:generate_toolpath",
  "prism_cam:full_cam_pipeline",
  "prism_cam:generate_program",
  "prism_turning_program:generate",
  "prism_multiaxis_program:generate",
  "prism_cnc_ops:print_to_program",
  "prism_cnc_ops:full_job_pipeline",
  // Multi-engine cascades
  "prism_calc:full_analysis",
  "prism_calc:batch_calculate",
  "prism_intelligence:dfm_check",
  "prism_intelligence:full_job",
  "prism_intelligence:quote_job",
  "prism_intelligence:feasibility_check",
  // Data-heavy operations
  "prism_data:material_search",
  "prism_data:tool_search",
  "prism_export:generate_report",
  "prism_business:quote_estimate",
  "prism_business:cost_breakdown",
  // Agent/orchestration
  "prism_orchestrate:execute_agent",
  "prism_orchestrate:swarm_quick",
  "prism_atcs:execute_task",
  "prism_autonomous:execute",
  "prism_autopilot_d:run",
]);

/**
 * Creates a progress reporter for a given action.
 * Returns a no-op reporter if the action isn't long-running or if
 * the MCP transport doesn't support progress tokens.
 */
export function createProgressReporter(
  action: string,
  meta?: { sendProgress?: (update: { progress: number; total?: number; message?: string }) => Promise<void> }
): ProgressReporter {
  const isLongRunning = LONG_RUNNING_ACTIONS.has(action);
  const canReport = meta?.sendProgress != null;

  if (!isLongRunning || !canReport) {
    return new NoOpProgressReporter();
  }

  return new McpProgressReporter(action, meta!.sendProgress!);
}

/** Interface for progress reporting */
export interface IProgressReporter {
  report(update: ProgressUpdate): Promise<void>;
  start(message: string): Promise<void>;
  step(progress: number, message: string): Promise<void>;
  complete(message?: string): Promise<void>;
  error(message: string): Promise<void>;
}

/** No-op reporter for non-long-running actions */
class NoOpProgressReporter implements IProgressReporter {
  async report(_update: ProgressUpdate): Promise<void> {}
  async start(_message: string): Promise<void> {}
  async step(_progress: number, _message: string): Promise<void> {}
  async complete(_message?: string): Promise<void> {}
  async error(_message: string): Promise<void> {}
}

/** Active reporter that sends progress via MCP transport */
class McpProgressReporter implements IProgressReporter {
  private lastReportTime = 0;
  private minIntervalMs = 250; // Don't flood — min 250ms between updates

  constructor(
    private action: string,
    private sendProgress: (update: { progress: number; total?: number; message?: string }) => Promise<void>,
  ) {}

  async report(update: ProgressUpdate): Promise<void> {
    const now = Date.now();
    if (now - this.lastReportTime < this.minIntervalMs && update.progress < 1.0) {
      return; // Throttle
    }
    this.lastReportTime = now;

    try {
      await this.sendProgress({
        progress: Math.round(update.progress * 100),
        total: 100,
        message: update.message,
      });
    } catch (e) {
      log.debug(`[PROGRESS] Failed to send progress for ${this.action}: ${(e as Error).message}`);
    }
  }

  async start(message: string): Promise<void> {
    await this.report({ progress: 0, message });
  }

  async step(progress: number, message: string): Promise<void> {
    await this.report({ progress: Math.min(progress, 0.99), message });
  }

  async complete(message?: string): Promise<void> {
    await this.report({ progress: 1.0, message: message ?? "Complete" });
  }

  async error(message: string): Promise<void> {
    await this.report({ progress: 1.0, message: `Error: ${message}` });
  }
}

export class ProgressReporter extends NoOpProgressReporter {}
