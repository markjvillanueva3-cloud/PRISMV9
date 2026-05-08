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
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MEMORY_SCHEMAS } from "../../schemas/memoryActionSchemas.js";

/** MCP server with dynamic tool registration — avoids bare `as any` on server calls */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedServer = any;

/** Memory graph nodes have dynamic fields depending on node type — use instead of bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GraphNodeRecord = Record<string, any>;

/** Registers memory dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerMemoryDispatcher(server: McpServer): void {
  (server as ValidatedServer).tool(
    "prism_memory",
    "Cross-session memory graph + semantic vector recall + agent memory fabric. Actions: get_health, trace_decision, find_similar, get_session, get_node, run_integrity, consolidate, consolidation_stats, consolidation_patterns, record_session_end, semantic_search, remember, agent_memory_remember, agent_memory_query, agent_memory_reinforce, agent_memory_forget, agent_memory_stats, emerging_thesis, daily_brief_get, contradiction_check, postmortem_create",
    {
      action: z.enum([
        "get_health",
        "trace_decision",
        "find_similar",
        "get_session",
        "get_node",
        "run_integrity",
        "consolidate",
        "consolidation_stats","record_session_end","semantic_search","remember",
        "consolidation_patterns",
        // ENGINE-WIRE-MS0/U-WIRE19: AgentMemoryFabricEngine — persistent cross-session memory
        "agent_memory_remember",
        "agent_memory_query",
        "agent_memory_reinforce",
        "agent_memory_forget",
        "agent_memory_stats",
        // OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS: TF-IDF synthesis over vault
        "emerging_thesis",
        // OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF: cyrilXBT daily brief
        "daily_brief_get",
        // OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR: vault disagreement check
        "contradiction_check",
        // OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE: auto-postmortem markdown
        "postmortem_create",
      ]).describe("Memory graph action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async (args: { action: string; params?: Record<string, any> }) => {
      const { action, params: rawParams = {} } = args;
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      const start = performance.now();

      const validation = validateActionParams(action, params, ACTION_MEMORY_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_memory"
        );
      }
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
                  ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
                  ...('success' in n ? { success: (n as GraphNodeRecord).success } : {}),
                  ...('errorClass' in n ? { errorClass: (n as GraphNodeRecord).errorClass } : {}),
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
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
                ...('success' in n ? { success: (n as GraphNodeRecord).success } : {}),
                ...('confidence' in n ? { confidence: (n as GraphNodeRecord).confidence } : {}),
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
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
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

          case "consolidate": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            const report = await memoryConsolidationEngine.consolidate();
            result = report || { message: "Consolidation not needed yet", stats: memoryConsolidationEngine.getStats() };
            break;
          }

          case "consolidation_stats": {
            const { memoryConsolidationEngine: mce } = await import("../../engines/MemoryConsolidationEngine.js");
            result = mce.getStats();
            break;
          }

          case "consolidation_patterns": {
            const { memoryConsolidationEngine: mce2 } = await import("../../engines/MemoryConsolidationEngine.js");
            const patterns = mce2.getPatterns();
            result = { count: patterns.length, patterns: patterns.slice(0, params.limit ?? 50) };
            break;
          }

          case "record_session_end": {
            const { memoryConsolidationEngine: mce3 } = await import("../../engines/MemoryConsolidationEngine.js");
            mce3.recordSessionEnd();
            const stats = mce3.getStats();
            const ready = (stats as { sessionsSinceLast?: number }).sessionsSinceLast !== undefined
              ? (stats as { sessionsSinceLast: number }).sessionsSinceLast >= 5
              : false;
            const auto = params.auto_consolidate !== false;
            let report: unknown = null;
            if (ready && auto) {
              report = await mce3.consolidate();
            }
            result = {
              ok: true,
              sessions_since_last: (stats as { sessionsSinceLast?: number }).sessionsSinceLast ?? null,
              ready_to_consolidate: ready,
              auto_consolidate: auto,
              ran_consolidate: report !== null,
              report,
              session_id: typeof params.session_id === "string" ? params.session_id : undefined,
            };
            break;
          }

          case "semantic_search": {
            const { QdrantMemoryEngineSingleton } = await import("../../engines/QdrantMemoryEngineSingleton.js");
            const query = typeof params.query === "string" ? params.query : "";
            if (!query) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing or empty 'query' parameter" }) }] };
            }
            const kind = (typeof params.kind === "string" ? params.kind : "note") as any;
            const limit = typeof params.limit === "number" ? params.limit : 10;
            const threshold = typeof params.threshold === "number" ? params.threshold : undefined;
            const filter = (params.filter && typeof params.filter === "object") ? params.filter : undefined;
            const engine = QdrantMemoryEngineSingleton.getInstance();
            const recalled = await engine.recall({ kind, query, limit, filter });
            if (!recalled.ok) {
              result = { ok: false, error: recalled.error, query, kind, limit };
              break;
            }
            let items = recalled.value;
            if (threshold !== undefined) {
              items = items.filter((it) => (it.score ?? 0) >= threshold);
            }
            result = {
              ok: true,
              query,
              kind,
              count: items.length,
              items: items.map((it) => ({
                id: it.id,
                kind: it.kind,
                text: it.text,
                score: it.score,
                metadata: it.metadata,
                createdAt: it.createdAt,
              })),
            };
            break;
          }
          case "remember": {
            const { QdrantMemoryEngineSingleton } = await import("../../engines/QdrantMemoryEngineSingleton.js");
            const kind = (typeof params.kind === "string" ? params.kind : "note") as any;
            const id = params.id ?? "";
            const text = typeof params.text === "string" ? params.text : "";
            if (!text || (typeof id !== "string" && typeof id !== "number") || id === "") {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing required 'kind', 'id', or 'text' parameter" }) }] };
            }
            const metadata = (params.metadata && typeof params.metadata === "object") ? params.metadata : undefined;
            const engine = QdrantMemoryEngineSingleton.getInstance();
            const r = await engine.remember({ kind, id, text, metadata });
            result = r.ok ? { ok: true, kind, id } : { ok: false, error: r.error, kind, id };
            break;
          }

          // ENGINE-WIRE-MS0/U-WIRE19: AgentMemoryFabricEngine wiring
          case "agent_memory_remember": {
            const { agentMemoryFabricEngine } = await import("../../engines/AgentMemoryFabricEngine.js");
            const memType = typeof params.memory_type === "string" ? params.memory_type : params.memoryType;
            const content = typeof params.content === "string" ? params.content : "";
            if (!content) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing required 'content' parameter" }) }] };
            }
            const opts = {
              relatedEntity: params.related_entity ?? params.relatedEntity,
              tags: Array.isArray(params.tags) ? params.tags : undefined,
              confidence: typeof params.confidence === "number" ? params.confidence : undefined,
              priority: typeof params.priority === "number" ? params.priority : undefined,
              source: params.source,
              expiresInDays: typeof params.expires_in_days === "number"
                ? params.expires_in_days
                : (typeof params.expiresInDays === "number" ? params.expiresInDays : undefined),
            };
            let entry;
            switch (memType) {
              case "fact":
                entry = await agentMemoryFabricEngine.rememberFact(content, opts);
                break;
              case "preference":
                entry = await agentMemoryFabricEngine.rememberPreference(content, opts);
                break;
              case "correction": {
                const wrong = typeof params.wrong === "string" ? params.wrong : "";
                const correct = typeof params.correct === "string" ? params.correct : "";
                entry = await agentMemoryFabricEngine.rememberCorrection(wrong, correct, content, opts);
                break;
              }
              case "context":
                entry = await agentMemoryFabricEngine.rememberContext(content, opts);
                break;
              case "tribal":
                entry = await agentMemoryFabricEngine.rememberTribal(content, opts);
                break;
              default:
                return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown memory_type: '${memType}'. Use one of: fact, preference, correction, context, tribal` }) }] };
            }
            result = { ok: true, id: entry.id, type: entry.type, priority: entry.priority };
            break;
          }

          case "agent_memory_query": {
            const { agentMemoryFabricEngine } = await import("../../engines/AgentMemoryFabricEngine.js");
            const queryOpts = {
              type: params.type,
              tags: Array.isArray(params.tags) ? params.tags : undefined,
              relatedEntity: params.related_entity ?? params.relatedEntity,
              minConfidence: typeof params.min_confidence === "number"
                ? params.min_confidence
                : (typeof params.minConfidence === "number" ? params.minConfidence : undefined),
              maxAgeDays: typeof params.max_age_days === "number"
                ? params.max_age_days
                : (typeof params.maxAgeDays === "number" ? params.maxAgeDays : undefined),
              limit: typeof params.limit === "number" ? params.limit : 25,
              sortBy: params.sort_by ?? params.sortBy,
              sortOrder: params.sort_order ?? params.sortOrder,
            };
            const matches = await agentMemoryFabricEngine.query(queryOpts);
            result = {
              count: matches.length,
              memories: matches.map(m => ({
                id: m.id,
                type: m.type,
                content: m.content.slice(0, 500),
                source: m.source,
                confidence: m.confidence,
                priority: m.priority,
                tags: m.tags,
                relatedEntity: m.relatedEntity,
                reinforcements: m.reinforcements,
                createdAt: m.createdAt,
                lastAccessedAt: m.lastAccessedAt,
              })),
            };
            break;
          }

          case "agent_memory_reinforce": {
            const { agentMemoryFabricEngine } = await import("../../engines/AgentMemoryFabricEngine.js");
            const memId = typeof params.memory_id === "string" ? params.memory_id : params.memoryId;
            if (typeof memId !== "string" || !memId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing required 'memory_id' parameter" }) }] };
            }
            const reinforced = await agentMemoryFabricEngine.reinforce(memId);
            if (!reinforced) {
              result = { ok: false, error: `Memory not found: ${memId}` };
            } else {
              result = {
                ok: true,
                id: reinforced.id,
                reinforcements: reinforced.reinforcements,
                lastReinforcedAt: reinforced.lastReinforcedAt,
              };
            }
            break;
          }

          case "agent_memory_forget": {
            const { agentMemoryFabricEngine } = await import("../../engines/AgentMemoryFabricEngine.js");
            const memId = typeof params.memory_id === "string" ? params.memory_id : params.memoryId;
            if (typeof memId !== "string" || !memId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing required 'memory_id' parameter" }) }] };
            }
            const removed = await agentMemoryFabricEngine.forget(memId);
            result = { ok: removed, id: memId };
            break;
          }

          case "agent_memory_stats": {
            const { agentMemoryFabricEngine } = await import("../../engines/AgentMemoryFabricEngine.js");
            result = await agentMemoryFabricEngine.getStats();
            break;
          }

          // OBSIDIAN-COMPOUND-MS1/S2/U-EMERGING-THESIS — vault TF-IDF synthesis
          case "emerging_thesis": {
            const { emergingThesisEngine } = await import("../../engines/EmergingThesisEngine.js");
            const window = (typeof params.window === "string" ? params.window : "7d") as "24h" | "7d" | "30d";
            if (window !== "24h" && window !== "7d" && window !== "30d") {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Invalid window '${window}'. Use one of: 24h, 7d, 30d` }) }] };
            }
            const vaultRoot = typeof params.vault_root === "string"
              ? params.vault_root
              : (typeof params.vaultRoot === "string" ? params.vaultRoot : undefined);
            const maxFiles = typeof params.max_files === "number"
              ? params.max_files
              : (typeof params.maxFiles === "number" ? params.maxFiles : undefined);
            result = emergingThesisEngine.synthesize(window, { vaultRoot, maxFiles });
            break;
          }

          // OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF — cyrilXBT brief synth
          case "daily_brief_get": {
            const { dailyPersonalBriefEngine } = await import("../../engines/DailyPersonalBriefEngine.js");
            const vaultRoot = typeof params.vault_root === "string"
              ? params.vault_root
              : (typeof params.vaultRoot === "string" ? params.vaultRoot : undefined);
            const wikiRoot = typeof params.wiki_root === "string"
              ? params.wiki_root
              : (typeof params.wikiRoot === "string" ? params.wikiRoot : undefined);
            const threshold = typeof params.threshold === "number" ? params.threshold : undefined;
            const maxConnections = typeof params.max_connections === "number"
              ? params.max_connections
              : (typeof params.maxConnections === "number" ? params.maxConnections : undefined);
            result = dailyPersonalBriefEngine.synthesize({
              vaultRoot, wikiRoot, threshold, maxConnections,
            });
            break;
          }

          // OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR — vault disagreement check
          case "contradiction_check": {
            const { contradictionDetectorEngine } = await import("../../engines/ContradictionDetectorEngine.js");
            const newMemoryPath = typeof params.new_memory_path === "string"
              ? params.new_memory_path
              : (typeof params.newMemoryPath === "string" ? params.newMemoryPath : "");
            if (!newMemoryPath) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing required 'new_memory_path' parameter" }) }] };
            }
            const vaultRoot = typeof params.vault_root === "string"
              ? params.vault_root
              : (typeof params.vaultRoot === "string" ? params.vaultRoot : undefined);
            const maxFiles = typeof params.max_files === "number"
              ? params.max_files
              : (typeof params.maxFiles === "number" ? params.maxFiles : undefined);
            const topK = typeof params.top_k === "number"
              ? params.top_k
              : (typeof params.topK === "number" ? params.topK : undefined);
            result = await contradictionDetectorEngine.detectConflicts(newMemoryPath, {
              vaultRoot, maxFiles, topK,
            });
            break;
          }

          // OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE — auto-postmortem
          case "postmortem_create": {
            const { autoPostmortemEngine } = await import("../../engines/AutoPostmortemEngine.js");
            const events = Array.isArray(params.events) ? params.events : [];
            const recentCommits = Array.isArray(params.recent_commits)
              ? params.recent_commits
              : (Array.isArray(params.recentCommits) ? params.recentCommits : []);
            const errorDescription = typeof params.error_description === "string"
              ? params.error_description
              : (typeof params.errorDescription === "string" ? params.errorDescription : undefined);
            const scrutinyVerdict = (typeof params.scrutiny_verdict === "string"
              ? params.scrutiny_verdict
              : params.scrutinyVerdict) as "PASS" | "FAIL" | "MISSING" | undefined;
            const mistakesDir = typeof params.mistakes_dir === "string"
              ? params.mistakes_dir
              : (typeof params.mistakesDir === "string" ? params.mistakesDir : undefined);
            const apply = params.apply !== false; // default true for dispatcher invocation
            const mode = (typeof params.mode === "string" ? params.mode : "create") as "create" | "update";
            result = autoPostmortemEngine.evaluate(
              { events, recentCommits, errorDescription, scrutinyVerdict },
              { mistakesDir, apply, mode },
            );
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_health', 'trace_decision', 'find_similar', 'get_session', 'get_node', 'run_integrity', 'consolidate', 'consolidation_stats', 'consolidation_patterns', 'record_session_end', 'semantic_search', 'remember', 'agent_memory_remember', 'agent_memory_query', 'agent_memory_reinforce', 'agent_memory_forget', 'agent_memory_stats', 'emerging_thesis', 'daily_brief_get', 'contradiction_check', 'postmortem_create'] };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(slimResponse({ ...result, _action: action, _elapsed_ms: elapsed })),
          }],
        };
      } catch (error) {
        return dispatcherError(error, action, "prism_memory");
      }
    }
  );

  log.info("[MEMORY_DISPATCH] prism_memory registered (21 actions: 12 graph + 5 agent-memory-fabric + 1 emerging-thesis + 1 daily-brief + 1 contradiction-check + 1 postmortem-create)");
}
