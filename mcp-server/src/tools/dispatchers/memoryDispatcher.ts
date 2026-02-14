/**
 * PRISM Memory Graph Dispatcher (#27)
 * =====================================
 * 
 * prism_memory — 6 actions for the F2 cross-session memory graph.
 * 
 * Actions:
 *   get_health       — Graph stats, memory, integrity
 *   trace_decision   — Follow decision chain (forward/backward/both)
 *   find_similar     — Find similar nodes by dispatcher/action/error
 *   get_session      — All nodes from a specific session
 *   get_node         — Single node by ID
 *   run_integrity    — Force integrity check
 * 
 * @version 1.0.0
 * @feature F2
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { memoryGraphEngine } from "../../engines/MemoryGraphEngine.js";
import { log } from "../../utils/Logger.js";

export function registerMemoryDispatcher(server: McpServer): void {
  server.tool(
    "prism_memory",
    "Cross-session memory graph. Actions: get_health, trace_decision, find_similar, get_session, get_node, run_integrity",
    {
      action: z.enum([
        "get_health",
        "trace_decision",
        "find_similar",
        "get_session",
        "get_node",
        "run_integrity",
      ]).describe("Memory graph action"),
      params: z.record(z.any()).optional().describe("Action parameters"),
    },
    async (args) => {
      const { action, params = {} } = args;
      const start = performance.now();

      try {
        let result: any;

        switch (action) {
          case "get_health": {
            const health = memoryGraphEngine.getHealth();
            const stats = memoryGraphEngine.getStats();
            result = {
              ...health,
              sessions: stats.sessions,
              dispatchers: stats.dispatchers,
              memory_kb: (health.memoryUsageBytes / 1024).toFixed(0),
            };
            break;
          }

          case "trace_decision": {
            const nodeId = params.node_id || params.nodeId;
            if (!nodeId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'node_id' parameter" }) }] };
            }
            const trace = memoryGraphEngine.traceDecision({
              nodeId,
              depth: params.depth ?? 3,
              direction: params.direction ?? 'both',
            });
            result = {
              nodes: trace.nodes.length,
              edges: trace.edges.length,
              trace: {
                nodes: trace.nodes.slice(0, 50).map(n => ({
                  id: n.id,
                  type: n.type,
                  timestamp: new Date(n.timestamp).toISOString(),
                  ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as any).action } : {}),
                  ...('success' in n ? { success: (n as any).success } : {}),
                  ...('errorClass' in n ? { errorClass: (n as any).errorClass } : {}),
                  tags: n.tags,
                })),
                edges: trace.edges.slice(0, 100).map(e => ({
                  id: e.id,
                  type: e.type,
                  source: e.sourceId,
                  target: e.targetId,
                  weight: e.weight,
                })),
              },
            };
            break;
          }

          case "find_similar": {
            const nodes = memoryGraphEngine.findSimilar({
              dispatcher: params.dispatcher,
              action: params.action,
              errorClass: params.error_class || params.errorClass,
              nodeType: params.node_type || params.nodeType,
              limit: params.limit ?? 10,
              minConfidence: params.min_confidence,
            });
            result = {
              count: nodes.length,
              nodes: nodes.map(n => ({
                id: n.id,
                type: n.type,
                timestamp: new Date(n.timestamp).toISOString(),
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as any).action } : {}),
                ...('success' in n ? { success: (n as any).success } : {}),
                ...('confidence' in n ? { confidence: (n as any).confidence } : {}),
                tags: n.tags,
              })),
            };
            break;
          }

          case "get_session": {
            const sessionId = params.session_id || params.sessionId;
            if (!sessionId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'session_id' parameter" }) }] };
            }
            const nodes = memoryGraphEngine.getNodesBySession(sessionId);
            result = {
              session: sessionId,
              node_count: nodes.length,
              nodes: nodes.slice(0, 50).map(n => ({
                id: n.id,
                type: n.type,
                timestamp: new Date(n.timestamp).toISOString(),
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as any).action } : {}),
                tags: n.tags,
              })),
            };
            break;
          }

          case "get_node": {
            const nodeId = params.node_id || params.nodeId || params.id;
            if (!nodeId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'node_id' parameter" }) }] };
            }
            const node = memoryGraphEngine.getNode(nodeId);
            result = node || { error: `Node not found: ${nodeId}` };
            break;
          }

          case "run_integrity": {
            const check = memoryGraphEngine.runIntegrityCheck();
            result = {
              ...check,
              health: memoryGraphEngine.getHealth(),
            };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_health', 'trace_decision', 'find_similar', 'get_session', 'get_node', 'run_integrity'] };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ ...result, _action: action, _elapsed_ms: elapsed }),
          }],
        };
      } catch (error: any) {
        log.error(`[MEMORY_DISPATCH] ${action} error: ${error.message}`);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ error: error.message, action }),
          }],
        };
      }
    }
  );

  log.info("[MEMORY_DISPATCH] prism_memory registered (6 actions)");
}
