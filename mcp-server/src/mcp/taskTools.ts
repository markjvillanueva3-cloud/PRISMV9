/**
 * MCP Task-Based Tools for PRISM
 *
 * Registers long-running PRISM operations as task-augmented tools
 * using the experimental MCP Tasks API. These tools support:
 * - Async execution with progress tracking
 * - Status polling (working/completed/failed)
 * - Result retrieval after completion
 *
 * Task-enabled operations:
 * - prism_simulate_task: CNC simulation (10-60s)
 * - prism_pipeline_task: Full print-to-program pipeline
 *
 * @experimental MCP Tasks API (2025-11-25 spec)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";

// In-memory task store for simulation results
const taskResults = new Map<string, {
  status: "working" | "completed" | "failed";
  progress: number;
  total: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: number;
}>();

/**
 * Register task-based tools if the experimental API is available.
 * Falls back gracefully if the SDK version doesn't support it.
 */
/** Experimental task store interface */
interface TaskStore {
  createTask(opts: { ttl: number; pollInterval: number }): Promise<{ taskId: string }>;
  updateTask(taskId: string, update: { status: string; statusMessage: string }): Promise<void>;
}

/** Extra context passed to task handlers */
interface TaskHandlerExtra {
  taskStore: TaskStore;
  taskId: string;
}

/** McpServer with experimental tasks API (not on public type) */
type McpServerWithExperimental = McpServer & {
  experimental?: {
    tasks?: {
      registerToolTask: (...args: unknown[]) => unknown;
    };
  };
};

export function registerTaskTools(server: McpServer): void {
  const experimental = (server as McpServerWithExperimental).experimental;
  if (!experimental?.tasks?.registerToolTask) {
    log.info(
      "[MCP Tasks] Experimental tasks API not available — " +
      "skipping task tool registration"
    );
    return;
  }

  try {
    // ═══════════════════════════════════════════════════════
    // CNC Simulation Task
    // ═══════════════════════════════════════════════════════
    experimental.tasks.registerToolTask(
      "prism_simulate_task",
      {
        title: "CNC Simulation (Async)",
        description:
          "Long-running CNC simulation with per-block physics. " +
          "Returns task ID for polling. Use tasks/get to check " +
          "status and tasks/result to retrieve results.",
        inputSchema: {
          gcode: z.string().describe("G-code program to simulate"),
          material: z.string().optional().describe(
            "Workpiece material"
          ),
          machine: z.string().optional().describe(
            "Target machine"
          ),
        },
        execution: { taskSupport: "required" as const },
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
          openWorldHint: false,
          title: "CNC Simulation (Async Task)",
        },
      },
      {
        createTask: async (
          args: { gcode: string; material?: string; machine?: string },
          extra: TaskHandlerExtra
        ) => {
          const task = await extra.taskStore.createTask({
            ttl: 300000, // 5 min TTL
            pollInterval: 2000, // 2s poll interval
          });
          const taskId = task.taskId;

          // Store initial state
          taskResults.set(taskId, {
            status: "working",
            progress: 0,
            total: 100,
            createdAt: Date.now(),
          });

          // Kick off simulation in background
          runSimulationAsync(taskId, args, extra.taskStore)
            .catch((err: Error) => {
              const state = taskResults.get(taskId);
              if (state) {
                state.status = "failed";
                state.error = err.message;
              }
              extra.taskStore.updateTask(taskId, {
                status: "failed",
                statusMessage: `Simulation failed: ${err.message}`,
              }).catch(() => {});
            });

          return { task };
        },

        getTask: async (_args: Record<string, unknown>, extra: TaskHandlerExtra) => {
          const state = taskResults.get(extra.taskId);
          if (!state) {
            return {
              task: {
                taskId: extra.taskId,
                status: "failed" as const,
                statusMessage: "Task not found",
              },
            };
          }
          return {
            task: {
              taskId: extra.taskId,
              status: state.status,
              statusMessage:
                `Simulation: ${state.progress}/${state.total} blocks`,
            },
          };
        },

        getTaskResult: async (_args: Record<string, unknown>, extra: TaskHandlerExtra) => {
          const state = taskResults.get(extra.taskId);
          if (!state || state.status !== "completed") {
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({
                  error: "Task not complete",
                  status: state?.status ?? "unknown",
                }),
              }],
            };
          }
          // Clean up after retrieval
          const result = state.result;
          taskResults.delete(extra.taskId);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(result),
            }],
          };
        },
      }
    );

    log.info("[MCP Tasks] Registered 1 task tool: prism_simulate_task");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(
      `[MCP Tasks] Registration failed (non-fatal): ${message}`
    );
  }
}

/**
 * Run CNC simulation asynchronously, updating task state.
 */
async function runSimulationAsync(
  taskId: string,
  args: { gcode: string; material?: string; machine?: string },
  taskStore: TaskStore
): Promise<void> {
  const state = taskResults.get(taskId);
  if (!state) return;

  try {
    // Dynamically import the simulation engine
    const { CNCSimulationPipelineEngine } = await import(
      "../engines/CNCSimulationPipelineEngine.js"
    );
    const engine = new CNCSimulationPipelineEngine();

    // Count G-code blocks for progress
    const blocks = args.gcode.split("\n").filter(
      (l: string) => l.trim() && !l.trim().startsWith("(")
    );
    state.total = blocks.length || 1;

    // Run simulation
    const simResult = engine.simulate({
      gcode_blocks: blocks,
      material: args.material,
      machine_brand: args.machine,
    });

    state.status = "completed";
    state.progress = state.total;
    state.result = simResult as unknown as Record<string, unknown>;

    await taskStore.updateTask(taskId, {
      status: "completed",
      statusMessage: `Simulation complete: ${state.total} blocks`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    state.status = "failed";
    state.error = message;
    await taskStore.updateTask(taskId, {
      status: "failed",
      statusMessage: `Simulation failed: ${message}`,
    });
  }
}

/**
 * Clean up expired tasks (called periodically or on shutdown).
 */
export function cleanupExpiredTasks(maxAgeMs = 600000): void {
  const now = Date.now();
  for (const [id, state] of taskResults.entries()) {
    if (now - state.createdAt > maxAgeMs) {
      taskResults.delete(id);
    }
  }
}
