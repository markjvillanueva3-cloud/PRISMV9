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
    "Cross-session memory graph + semantic vector recall + agent memory fabric. Actions: get_health, trace_decision, find_similar, get_session, get_node, run_integrity, consolidate, consolidation_stats, consolidation_patterns, record_session_end, semantic_search, remember, qdrant_vector_search, qdrant_vector_upsert, agent_memory_remember, agent_memory_query, agent_memory_reinforce, agent_memory_forget, agent_memory_stats, emerging_thesis, daily_brief_get, daily_context_get, contradiction_check, postmortem_create, performance_report, connections_materialize, content_brief_create, voice_validate, capture_sharpen, embed_text, embed_pairwise_cosine, inbox_prune_now, inbox_promote_now",
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
        // TOOL-INVENTORY-MS0/U-TOOLINV-01: qdrant MCP exposure surface
        "qdrant_vector_search",
        "qdrant_vector_upsert",
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
        // OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW: morning brief from
        // yesterday's daily + active projects + inbox (optional Ollama summariser)
        "daily_context_get",
        // OBSIDIAN-COMPOUND-MS1/S3/U-CONTRADICTION-DETECTOR: vault disagreement check
        "contradiction_check",
        // OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE: auto-postmortem markdown
        "postmortem_create",
        // OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP: cyrilXBT JARVIS monthly report
        "performance_report",
        // OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST: materialize connection notes
        "connections_materialize",
        // OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF: cyrilXBT 5-field brief
        "content_brief_create",
        // OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC: voice-rule validator
        "voice_validate",
        // OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN: raw→punchy capture assessment
        "capture_sharpen",
        // OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS: Ollama nomic-embed-text wrapper
        "embed_text",
        "embed_pairwise_cosine",
        // OBSIDIAN-AUTOMATE-MS3/U-INBOX-OPS-EXPOSE: on-demand inbox operators
        "inbox_prune_now",
        "inbox_promote_now",
        // WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC: MemorySyncEngine read-only bundle inspection
        "memory_sync_list_bundles",
        "memory_sync_bundle_metadata",
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
            if (recalled.ok === false) {
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
            if (r.ok === true) {
              result = { ok: true, kind, id };
            } else {
              result = { ok: false, error: r.error, kind, id };
            }
            break;
          }

          // TOOL-INVENTORY-MS0/U-TOOLINV-01: standard `qdrant` MCP tool
          // surface (vector_search / vector_upsert) over QdrantMemoryEngine.
          // The surface does its own shape validation + collection→kind
          // resolution + structured error envelope, so the dispatcher just
          // forwards params and maps {ok:false} to a numeric httpCode for
          // wire-format parity with the external qdrant MCP server.
          case "qdrant_vector_search": {
            const { QdrantSurfaceEngine } = await import(
              "../../engines/QdrantSurfaceEngine.js"
            );
            const sr = await QdrantSurfaceEngine.vectorSearch({
              collection: typeof params.collection === "string" ? params.collection : "",
              query: typeof params.query === "string" ? params.query : "",
              limit: typeof params.limit === "number" ? params.limit : undefined,
              filter:
                params.filter && typeof params.filter === "object" && !Array.isArray(params.filter)
                  ? (params.filter as Record<string, unknown>)
                  : undefined,
            });
            if (sr.ok === true) {
              result = { ok: true, ...sr.value };
            } else {
              result = {
                ok: false,
                code: sr.code,
                httpCode: QdrantSurfaceEngine.httpCodeFor(sr.code),
                error: sr.error,
                field: sr.field,
              };
            }
            break;
          }
          case "qdrant_vector_upsert": {
            const { QdrantSurfaceEngine } = await import(
              "../../engines/QdrantSurfaceEngine.js"
            );
            const rawId = params.id;
            const sr = await QdrantSurfaceEngine.vectorUpsert({
              collection: typeof params.collection === "string" ? params.collection : "",
              id:
                typeof rawId === "string" || typeof rawId === "number"
                  ? rawId
                  : "",
              text: typeof params.text === "string" ? params.text : "",
              metadata:
                params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
                  ? (params.metadata as Record<string, unknown>)
                  : undefined,
            });
            if (sr.ok === true) {
              result = { ok: true, ...sr.value };
            } else {
              result = {
                ok: false,
                code: sr.code,
                httpCode: QdrantSurfaceEngine.httpCodeFor(sr.code),
                error: sr.error,
                field: sr.field,
              };
            }
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

          // OBSIDIAN-INTELLIGENCE-MS3/B1/U-DAILY-CONTEXT-WORKFLOW — morning brief
          // synthesizing yesterday's daily-context note + active projects + inbox.
          // Engine returns deterministic markdown in literal mode; optional Ollama
          // summarisation is opt-in via the runner adapter (not exposed here — the
          // dispatcher always runs in literal mode to keep responses fast + cheap).
          case "daily_context_get": {
            const { dailyContextWorkflowEngine } = await import("../../engines/DailyContextWorkflowEngine.js");
            const vaultRoot = typeof params.vault_root === "string"
              ? params.vault_root
              : (typeof params.vaultRoot === "string" ? params.vaultRoot : undefined);
            const generatedRoot = typeof params.generated_root === "string"
              ? params.generated_root
              : (typeof params.generatedRoot === "string" ? params.generatedRoot : undefined);
            const now = typeof params.now === "number" ? params.now : undefined;
            const maxProjects = typeof params.max_projects === "number"
              ? params.max_projects
              : (typeof params.maxProjects === "number" ? params.maxProjects : undefined);
            const maxInbox = typeof params.max_inbox === "number"
              ? params.max_inbox
              : (typeof params.maxInbox === "number" ? params.maxInbox : undefined);
            const projectWindowMs = typeof params.project_window_ms === "number"
              ? params.project_window_ms
              : (typeof params.projectWindowMs === "number" ? params.projectWindowMs : undefined);
            const excerptBytes = typeof params.excerpt_bytes === "number"
              ? params.excerpt_bytes
              : (typeof params.excerptBytes === "number" ? params.excerptBytes : undefined);
            // Dispatcher path runs literal (no Ollama) — fast, deterministic, safe.
            // Cron path uses scripts/run-daily-context.mjs which provides the client.
            result = await dailyContextWorkflowEngine.synthesize({
              vaultRoot, generatedRoot, now, maxProjects, maxInbox, projectWindowMs, excerptBytes,
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

          // OBSIDIAN-CONTENT-MS2/U-CAPTURE-SHARPEN — raw→punchy assessment
          case "capture_sharpen": {
            const { captureSharpenEngine } = await import("../../engines/CaptureSharpenEngine.js");
            const raw = typeof params.raw === "string" ? params.raw : "";
            const threshold = typeof params.threshold === "number" ? params.threshold : undefined;
            const contentPillarHint = typeof params.content_pillar_hint === "string"
              ? params.content_pillar_hint
              : (typeof params.contentPillarHint === "string" ? params.contentPillarHint : undefined);
            result = captureSharpenEngine.assess(raw, { threshold, contentPillarHint });
            break;
          }

          // OBSIDIAN-CONTENT-MS2/U-VOICE-SPEC — voice-rule validator
          case "voice_validate": {
            const { contentWriterEngine } = await import("../../engines/ContentWriterEngine.js");
            const draft = typeof params.draft === "string" ? params.draft : "";
            const voiceSpecPath = typeof params.voice_spec_path === "string"
              ? params.voice_spec_path
              : (typeof params.voiceSpecPath === "string" ? params.voiceSpecPath : undefined);
            result = contentWriterEngine.validate(draft, { voiceSpecPath });
            break;
          }

          // OBSIDIAN-CONTENT-MS2/U-CONTENT-BRIEF — cyrilXBT 5-field brief
          case "content_brief_create": {
            const { contentBriefEngine } = await import("../../engines/ContentBriefEngine.js");
            const seed = {
              oneThing: typeof params.one_thing === "string" ? params.one_thing : (typeof params.oneThing === "string" ? params.oneThing : ""),
              proof: typeof params.proof === "string" ? params.proof : "",
              audience: typeof params.audience === "string" ? params.audience : "",
              readerBefore: typeof params.reader_before === "string" ? params.reader_before : (typeof params.readerBefore === "string" ? params.readerBefore : ""),
              readerAfter: typeof params.reader_after === "string" ? params.reader_after : (typeof params.readerAfter === "string" ? params.readerAfter : ""),
              sourceNotes: Array.isArray(params.source_notes) ? params.source_notes : (Array.isArray(params.sourceNotes) ? params.sourceNotes : undefined),
              contentPillar: typeof params.content_pillar === "string" ? params.content_pillar : (typeof params.contentPillar === "string" ? params.contentPillar : undefined),
              hookFormatHint: typeof params.hook_format_hint === "string" ? params.hook_format_hint : (typeof params.hookFormatHint === "string" ? params.hookFormatHint : undefined),
            };
            const briefsDir = typeof params.briefs_dir === "string"
              ? params.briefs_dir
              : (typeof params.briefsDir === "string" ? params.briefsDir : undefined);
            const apply = params.apply !== false;
            result = contentBriefEngine.generate(seed, { briefsDir, apply });
            break;
          }

          // OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST — materialize connection notes
          case "connections_materialize": {
            const { connectionMaterializerEngine } = await import("../../engines/ConnectionMaterializerEngine.js");
            const connections = Array.isArray(params.connections) ? params.connections : [];
            const connectionsDir = typeof params.connections_dir === "string"
              ? params.connections_dir
              : (typeof params.connectionsDir === "string" ? params.connectionsDir : undefined);
            const mode = (typeof params.mode === "string" ? params.mode : "skip") as "skip" | "update";
            const apply = params.apply !== false;
            result = connectionMaterializerEngine.materialize(connections, { connectionsDir, mode, apply });
            break;
          }

          // OBSIDIAN-CONTENT-MS2/U-PERFORMANCE-LOOP — cyrilXBT JARVIS monthly report
          case "performance_report": {
            const { performanceLoopEngine } = await import("../../engines/PerformanceLoopEngine.js");
            const publishedDir = typeof params.published_dir === "string"
              ? params.published_dir
              : (typeof params.publishedDir === "string" ? params.publishedDir : undefined);
            const sinceIso = typeof params.since_iso === "string"
              ? params.since_iso
              : (typeof params.sinceIso === "string" ? params.sinceIso : undefined);
            const maxFiles = typeof params.max_files === "number"
              ? params.max_files
              : (typeof params.maxFiles === "number" ? params.maxFiles : undefined);
            result = performanceLoopEngine.monthlyReport({ publishedDir, sinceIso, maxFiles });
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

          // OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS — Ollama embedding for a single text
          case "embed_text": {
            const { ollamaEmbedderEngine } = await import("../../engines/OllamaEmbedderEngine.js");
            const text = typeof params.text === "string" ? params.text : "";
            if (!text) {
              result = { ok: false, error: "missing-text-param" };
              break;
            }
            const r = await ollamaEmbedderEngine.embed(text);
            if (r.ok === true) {
              result = { ok: true, dims: r.vector.length, vector: r.vector };
            } else {
              result = { ok: false, error: r.error };
            }
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-INBOX-OPS-EXPOSE — run inbox-prune-stale on demand
          case "inbox_prune_now": {
            // @ts-expect-error — .mjs script lacks .d.ts; runtime contract is { runInboxPrune(opts): Result }
            const { runInboxPrune } = await import("../../../scripts/inbox-prune-stale.mjs");
            const apply = params.apply !== false; // default true
            const inbox = typeof params.inbox === "string" ? params.inbox : undefined;
            const archive = typeof params.archive === "string" ? params.archive : undefined;
            const stateFile = typeof params.state_file === "string"
              ? params.state_file
              : (typeof params.stateFile === "string" ? params.stateFile : undefined);
            result = runInboxPrune({
              flags: { apply },
              ...(inbox ? { inbox } : {}),
              ...(archive ? { archive } : {}),
              ...(stateFile ? { stateFile } : {}),
            });
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-INBOX-OPS-EXPOSE — run inbox-auto-promote on demand
          case "inbox_promote_now": {
            // @ts-expect-error — .mjs script lacks .d.ts; runtime contract is { runInboxAutoPromote(opts): Promise<Result> }
            const { runInboxAutoPromote } = await import("../../../scripts/inbox-auto-promote.mjs");
            const apply = params.apply !== false; // default true
            const inbox = typeof params.inbox === "string" ? params.inbox : undefined;
            const stateFile = typeof params.state_file === "string"
              ? params.state_file
              : (typeof params.stateFile === "string" ? params.stateFile : undefined);
            result = await runInboxAutoPromote({
              flags: { apply },
              ...(inbox ? { inbox } : {}),
              ...(stateFile ? { stateFile } : {}),
            });
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS — pairwise cosine similarity for N inputs
          case "embed_pairwise_cosine": {
            const { ollamaEmbedderEngine } = await import("../../engines/OllamaEmbedderEngine.js");
            const inputs = Array.isArray(params.inputs) ? params.inputs : [];
            const valid = inputs.filter(
              (x: unknown): x is { path: string; text: string } =>
                !!x && typeof x === "object" &&
                typeof (x as { path?: unknown }).path === "string" &&
                typeof (x as { text?: unknown }).text === "string",
            );
            if (valid.length === 0) {
              result = { ok: false, error: "no-valid-inputs", embedded: 0, failed: [], pairs: [] };
              break;
            }
            const r = await ollamaEmbedderEngine.pairwiseCosine(valid);
            result = {
              ok: r.ok,
              embedded: r.embedded,
              failed: r.failed,
              pairs: r.similarities
                ? Array.from(r.similarities.entries()).map(([k, s]) => ({ pair: k, similarity: s }))
                : [],
            };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-MEMSYNC: MemorySyncEngine read-only bundle inspection
          case "memory_sync_list_bundles": {
            const { memorySyncEngine } = await import("../../engines/MemorySyncEngine.js");
            const dir = typeof params.dir === "string" ? params.dir : "";
            if (!dir) throw new Error("memory_sync_list_bundles requires 'dir' (string)");
            const bundles = await memorySyncEngine.listBundles(dir);
            result = { bundles, count: bundles.length };
            break;
          }
          case "memory_sync_bundle_metadata": {
            const { memorySyncEngine } = await import("../../engines/MemorySyncEngine.js");
            const srcPath = typeof params.src_path === "string"
              ? params.src_path
              : (typeof params.srcPath === "string" ? params.srcPath : "");
            if (!srcPath) throw new Error("memory_sync_bundle_metadata requires 'src_path' (string)");
            const metadata = await memorySyncEngine.bundleMetadata(srcPath);
            result = { metadata };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_health', 'trace_decision', 'find_similar', 'get_session', 'get_node', 'run_integrity', 'consolidate', 'consolidation_stats', 'consolidation_patterns', 'record_session_end', 'semantic_search', 'remember', 'qdrant_vector_search', 'qdrant_vector_upsert', 'agent_memory_remember', 'agent_memory_query', 'agent_memory_reinforce', 'agent_memory_forget', 'agent_memory_stats', 'emerging_thesis', 'daily_brief_get', 'daily_context_get', 'contradiction_check', 'postmortem_create', 'performance_report', 'connections_materialize', 'content_brief_create', 'voice_validate', 'capture_sharpen', 'embed_text', 'embed_pairwise_cosine', 'inbox_prune_now', 'inbox_promote_now', 'memory_sync_list_bundles', 'memory_sync_bundle_metadata'] };
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

  log.info("[MEMORY_DISPATCH] prism_memory registered (30 actions: 12 graph + 5 agent-memory-fabric + 1 emerging-thesis + 1 daily-brief + 1 contradiction-check + 1 postmortem-create + 1 performance-report + 1 connections-materialize + 1 content-brief-create + 1 voice-validate + 1 capture-sharpen + 2 ollama-embedding + 2 inbox-ops)");
}
