/**
 * BatchQueryEngine — Multi-action dispatcher batching
 *
 * Allows executing multiple dispatcher actions in a single call,
 * reducing round-trip overhead and context token usage.
 * Each action runs independently; failures don't block others.
 *
 * Token savings: N separate tool calls → 1 batched call.
 * Typical savings: 50-200 tokens per batched action (tool call overhead).
 *
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

export interface BatchAction {
  /** Dispatcher tool name (e.g., "prism_calc") */
  tool: string;
  /** Action name within the dispatcher */
  action: string;
  /** Parameters for the action */
  params?: Record<string, any>;
  /** Optional label for identifying results */
  label?: string;
}

export interface BatchResult {
  /** Label or action name */
  label: string;
  /** Whether this action succeeded */
  ok: boolean;
  /** Result data (if ok) */
  data?: any;
  /** Error message (if not ok) */
  error?: string;
  /** Execution time in ms */
  ms: number;
}

export interface BatchResponse {
  /** Total execution time in ms */
  total_ms: number;
  /** Number of actions that succeeded */
  passed: number;
  /** Number of actions that failed */
  failed: number;
  /** Individual results */
  results: BatchResult[];
  /** Compact summary line */
  summary: string;
}

type DispatcherFn = (params: Record<string, any>) => Promise<any>;

export class BatchQueryEngine {
  private dispatchers: Map<string, DispatcherFn> = new Map();

  /**
   * Register a dispatcher function for batching.
   * Called during system initialization.
   */
  registerDispatcher(toolName: string, handler: DispatcherFn): void {
    this.dispatchers.set(toolName, handler);
  }

  /**
   * Execute multiple actions in sequence, collecting results.
   * Each action runs independently — failures don't stop subsequent actions.
   */
  async executeBatch(actions: BatchAction[]): Promise<BatchResponse> {
    const start = Date.now();
    const results: BatchResult[] = [];
    let passed = 0;
    let failed = 0;

    for (const action of actions) {
      const label = action.label || `${action.tool}/${action.action}`;
      const actionStart = Date.now();

      try {
        const handler = this.dispatchers.get(action.tool);
        if (!handler) {
          results.push({
            label,
            ok: false,
            error: `Unknown dispatcher: ${action.tool}`,
            ms: Date.now() - actionStart
          });
          failed++;
          continue;
        }

        const params = { ...action.params, action: action.action };
        const result = await handler(params);

        // Extract text content from MCP response format
        let data = result;
        if (result?.content?.[0]?.text) {
          try {
            data = JSON.parse(result.content[0].text);
          } catch {
            data = result.content[0].text;
          }
        }

        results.push({
          label,
          ok: true,
          data,
          ms: Date.now() - actionStart
        });
        passed++;
      } catch (e: any) {
        results.push({
          label,
          ok: false,
          error: e.message?.slice(0, 200) || "Unknown error",
          ms: Date.now() - actionStart
        });
        failed++;
      }
    }

    const total_ms = Date.now() - start;
    const summary = `Batch: ${passed}/${actions.length} ok in ${total_ms}ms${failed > 0 ? ` (${failed} failed)` : ""}`;

    log.info(`[BatchQuery] ${summary}`);

    return { total_ms, passed, failed, results, summary };
  }

  /**
   * Execute actions in parallel (all at once).
   * Faster but uses more memory.
   */
  async executeBatchParallel(actions: BatchAction[]): Promise<BatchResponse> {
    const start = Date.now();

    const promises = actions.map(async (action): Promise<BatchResult> => {
      const label = action.label || `${action.tool}/${action.action}`;
      const actionStart = Date.now();

      try {
        const handler = this.dispatchers.get(action.tool);
        if (!handler) {
          return { label, ok: false, error: `Unknown dispatcher: ${action.tool}`, ms: Date.now() - actionStart };
        }

        const params = { ...action.params, action: action.action };
        const result = await handler(params);

        let data = result;
        if (result?.content?.[0]?.text) {
          try { data = JSON.parse(result.content[0].text); } catch { data = result.content[0].text; }
        }

        return { label, ok: true, data, ms: Date.now() - actionStart };
      } catch (e: any) {
        return { label, ok: false, error: e.message?.slice(0, 200) || "Unknown error", ms: Date.now() - actionStart };
      }
    });

    const results = await Promise.all(promises);
    const passed = results.filter(r => r.ok).length;
    const failed = results.length - passed;
    const total_ms = Date.now() - start;
    const summary = `Batch(parallel): ${passed}/${actions.length} ok in ${total_ms}ms${failed > 0 ? ` (${failed} failed)` : ""}`;

    log.info(`[BatchQuery] ${summary}`);

    return { total_ms, passed, failed, results, summary };
  }

  /**
   * Get list of registered dispatchers.
   */
  getRegisteredDispatchers(): string[] {
    return Array.from(this.dispatchers.keys());
  }
}

export const batchQueryEngine = new BatchQueryEngine();
