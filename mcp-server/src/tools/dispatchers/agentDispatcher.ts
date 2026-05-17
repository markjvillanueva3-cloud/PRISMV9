/**
 * Agent Dispatcher — MCP Integration Layer for PRISM Agent
 *
 * AGENT-MS5 U-AGT17 — Exposes the AGENT-MS1 through AGENT-MS4 engines
 * via a single MCP tool (prism_agent) so applications can talk to the
 * agent over MCP without running the HTTP layer (U-AGT16, pending).
 *
 * Actions (6):
 *   - chat                — One-shot agentic loop (AgenticLoopEngine.run)
 *   - context_create      — Create a fresh conversation context
 *   - context_add         — Add an item to an existing context
 *   - context_compact     — Run compaction on a context
 *   - memory              — Memory fabric operations (remember/query/search)
 *   - capabilities        — Capability introspection (dispatchers + engines)
 *   - self_awareness      — Build the agent's self-model snapshot
 *   - stats               — Aggregate agent-track telemetry
 *
 * Tool: prism_agent
 *
 * @module dispatchers/agentDispatcher
 * @milestone AGENT-MS5 (U-AGT17)
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
// wrapWithAwareness was removed from awarenessMiddleware; the dispatcher never
// called it. AwarenessResponse was renamed to AwarenessResponse.
import { consultAwareness, extractAwarenessKeywords, type AwarenessResponse } from "./awarenessMiddleware.js";

const ACTIONS = [
  "chat",
  "context_create",
  "context_add",
  "context_compact",
  "memory",
  "capabilities",
  "self_awareness",
  "stats",
  // WIRE-UNWIRED-MS0/U-WIRE-ASP: AgentSpecializationProfileEngine read-only
  "agent_profile_get",
  "agent_profile_list",
  "agent_profile_stats",
] as const;

type Action = typeof ACTIONS[number];

/** Standardized response wrapper — matches the {success, data} pattern
 *  used by the rest of PRISM's dispatcher fleet.
 *  MILL-AGI-P0.1: Optionally includes awareness metadata. */
function okResult(data: unknown, awareness?: AwarenessResponse | null) {
  const result = awareness && awareness.ok && awareness.summary.length > 0
    ? { success: true, data, _awareness: awareness.summary }
    : { success: true, data };
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result),
      },
    ],
  };
}

function errResult(message: string, details?: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: false, error: message, details }),
      },
    ],
  };
}

/**
 * Register the prism_agent dispatcher on the given MCP server instance.
 *
 * @param server - MCP server exposing .tool() registration
 */
export function registerAgentDispatcher(server: any): void {
  server.tool(
    "prism_agent",
    `PRISM Agent — Intelligent manufacturing agent exposing memory, reasoning, and capability introspection. 8 actions: ${ACTIONS.join(", ")}. Chains AGENT-MS1 through AGENT-MS4 engines: CapabilityIndexEngine, EngineDigestEngine, AgentMemoryFabricEngine, ContextRetentionEngine, LearningLoopEngine, ManufacturingReasoningEngine, MultiPathReasoningEngine, ExtendedThinkingBridgeEngine, IntentRouterEngine, AgenticLoopEngine, ToolExecutionEngine, ContextCompactionEngine, MultiToolOrchestratorEngine.`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params = {} }: { action: Action; params: Record<string, any> }) => {
      log.info(`[prism_agent] ${action}`);

      // MILL-AGI-P0.1: Awareness middleware — consult PRISM knowledge before execution
      let awareness: AwarenessResponse | null = null;
      try {
        const keywords = extractAwarenessKeywords(action, params);
        awareness = await consultAwareness({
          dispatcher: "agent",
          action,
          keywords,
        });
      } catch { /* awareness failure is non-blocking */ }

      try {
        switch (action) {
          // ── chat ────────────────────────────────────────────────────
          case "chat": {
            if (!params.text || typeof params.text !== "string") {
              return errResult("Missing required param: text (string)");
            }
            const { agenticLoopEngine } = await import(
              "../../engines/AgenticLoopEngine.js"
            );
            const response = await agenticLoopEngine.run({
              text: params.text,
              context: params.context,
              config: params.config,
            });
            return okResult(response, awareness);
          }

          // ── context_create ─────────────────────────────────────────
          case "context_create": {
            const { contextCompactionEngine } = await import(
              "../../engines/ContextCompactionEngine.js"
            );
            const maxTokens =
              typeof params.max_tokens === "number" ? params.max_tokens : undefined;
            const ctx = contextCompactionEngine.createContext(maxTokens);
            return okResult(ctx, awareness);
          }

          // ── context_add ─────────────────────────────────────────────
          case "context_add": {
            if (!params.context_id || typeof params.context_id !== "string") {
              return errResult("Missing required param: context_id");
            }
            if (!params.type || typeof params.type !== "string") {
              return errResult("Missing required param: type (ContextItemType)");
            }
            if (!params.content || typeof params.content !== "string") {
              return errResult("Missing required param: content");
            }
            // Note: the engine expects a ConversationContext object, not an id.
            // Callers are expected to persist/round-trip the full context.
            // Here we accept the context inline so MCP callers stay stateless.
            const { contextCompactionEngine } = await import(
              "../../engines/ContextCompactionEngine.js"
            );
            if (!params.context || typeof params.context !== "object") {
              return errResult(
                "Missing required param: context (ConversationContext object from context_create)"
              );
            }
            const item = contextCompactionEngine.addItem(
              params.context,
              params.type as Parameters<typeof contextCompactionEngine.addItem>[1],
              params.content,
              {
                priority: params.priority,
                preserveOnCompact: params.preserve_on_compact,
                metadata: params.metadata,
              }
            );
            return okResult({ item, context: params.context }, awareness);
          }

          // ── context_compact ─────────────────────────────────────────
          case "context_compact": {
            if (!params.context || typeof params.context !== "object") {
              return errResult(
                "Missing required param: context (ConversationContext object)"
              );
            }
            const { contextCompactionEngine } = await import(
              "../../engines/ContextCompactionEngine.js"
            );
            const strategy = params.strategy ?? "balanced";
            const result = contextCompactionEngine.compact(
              params.context,
              strategy,
              params.config
            );
            return okResult({ result, context: params.context }, awareness);
          }

          // ── memory ──────────────────────────────────────────────────
          case "memory": {
            const op = params.op as string | undefined;
            const { agentMemoryFabricEngine } = await import(
              "../../engines/AgentMemoryFabricEngine.js"
            );
            await agentMemoryFabricEngine.initialize(params.shop_id ?? "default");

            switch (op) {
              case "remember_fact":
                if (!params.content) return errResult("Missing content");
                return okResult(
                  await agentMemoryFabricEngine.rememberFact(params.content, {
                    relatedEntity: params.related_entity,
                    tags: params.tags,
                    confidence: params.confidence,
                    priority: params.priority,
                  }), awareness
                );
              case "remember_preference":
                if (!params.content) return errResult("Missing content");
                return okResult(
                  await agentMemoryFabricEngine.rememberPreference(params.content, {
                    tags: params.tags,
                    priority: params.priority,
                  }), awareness
                );
              case "remember_correction":
                if (!params.incorrect || !params.correct)
                  return errResult("Missing incorrect/correct");
                return okResult(
                  await agentMemoryFabricEngine.rememberCorrection(
                    params.incorrect,
                    params.correct,
                    params.reason ?? "",
                    {
                      relatedEntity: params.related_entity,
                      tags: params.tags,
                    }
                  ), awareness
                );
              case "query":
                return okResult(
                  await agentMemoryFabricEngine.query({
                    type: params.type,
                    tags: params.tags,
                    relatedEntity: params.related_entity,
                    minConfidence: params.min_confidence,
                    maxAgeDays: params.max_age_days,
                    limit: params.limit,
                    sortBy: params.sort_by,
                    sortOrder: params.sort_order,
                  }), awareness
                );
              case "search":
                if (!params.query) return errResult("Missing query");
                return okResult(await agentMemoryFabricEngine.search(params.query), awareness);
              case "reinforce":
                if (!params.memory_id) return errResult("Missing memory_id");
                return okResult(await agentMemoryFabricEngine.reinforce(params.memory_id), awareness);
              case "forget":
                if (!params.memory_id) return errResult("Missing memory_id");
                return okResult({
                  forgotten: await agentMemoryFabricEngine.forget(params.memory_id),
                }, awareness);
              case "stats":
                return okResult(await agentMemoryFabricEngine.getStats(), awareness);
              case "context_injection":
                return okResult(
                  await agentMemoryFabricEngine.getForContextInjection(
                    params.max_tokens ?? 1000
                  ), awareness
                );
              default:
                return errResult(
                  `Unknown memory op: ${op}. Valid: remember_fact, remember_preference, remember_correction, query, search, reinforce, forget, stats, context_injection`
                );
            }
          }

          // ── capabilities ───────────────────────────────────────────
          case "capabilities": {
            const op = params.op as string | undefined;
            const { capabilityIndexEngine } = await import(
              "../../engines/CapabilityIndexEngine.js"
            );
            const { engineDigestEngine } = await import(
              "../../engines/EngineDigestEngine.js"
            );

            switch (op) {
              case "search": {
                if (!params.query) return errResult("Missing query");
                const target = params.target ?? "actions"; // "actions" | "engines" | "both"
                if (target === "engines") {
                  return okResult(
                    await engineDigestEngine.search(params.query, params.limit ?? 10), awareness
                  );
                }
                if (target === "both") {
                  return okResult({
                    actions: await capabilityIndexEngine.search(
                      params.query,
                      params.limit ?? 10
                    ),
                    engines: await engineDigestEngine.search(
                      params.query,
                      params.limit ?? 10
                    ),
                  }, awareness);
                }
                return okResult(
                  await capabilityIndexEngine.search(params.query, params.limit ?? 10), awareness
                );
              }
              case "by_tool":
                if (!params.tool) return errResult("Missing tool");
                return okResult(await capabilityIndexEngine.getByTool(params.tool), awareness);
              case "by_category":
                if (!params.category) return errResult("Missing category");
                return okResult(
                  await capabilityIndexEngine.getByCategory(params.category), awareness
                );
              case "engine_by_name":
                if (!params.name) return errResult("Missing name");
                return okResult(await engineDigestEngine.findByName(params.name), awareness);
              case "engine_deps":
                if (!params.name) return errResult("Missing name");
                return okResult(await engineDigestEngine.getDependencies(params.name), awareness);
              case "engine_dependents":
                if (!params.name) return errResult("Missing name");
                return okResult(await engineDigestEngine.getDependents(params.name), awareness);
              case "stats":
                return okResult({
                  actions: await capabilityIndexEngine.getStats(),
                  engines: await engineDigestEngine.getStats(),
                }, awareness);
              default:
                return errResult(
                  `Unknown capabilities op: ${op}. Valid: search, by_tool, by_category, engine_by_name, engine_deps, engine_dependents, stats`
                );
            }
          }

          // ── self_awareness ─────────────────────────────────────────
          case "self_awareness": {
            const { buildSelfAwareness, serializeCompact } = await import(
              "../../schemas/selfAwarenessSchema.js"
            );
            const { capabilityIndexEngine } = await import(
              "../../engines/CapabilityIndexEngine.js"
            );
            const { engineDigestEngine } = await import(
              "../../engines/EngineDigestEngine.js"
            );

            const capStats = await capabilityIndexEngine.getStats();
            const engStats = await engineDigestEngine.getStats();

            const model = buildSelfAwareness({
              identity: {
                name: params.name ?? "PRISM-Agent",
                role: params.role ?? "executor",
                model_id: params.model_id ?? "unknown",
                session_id: params.session_id ?? `sess_${Date.now()}`,
                machine_id: params.machine_id,
              },
              capabilities: {
                dispatcher_count: capStats.dispatcherCount,
                action_count: capStats.actionCount,
                engine_count: engStats.engineCount,
                categories: capStats.categories,
              },
              state: params.state,
              memory: params.memory,
              constraints: params.constraints,
              active_context: params.active_context,
            });

            const compact =
              params.compact === true ? serializeCompact(model) : undefined;
            return okResult({ model, compact }, awareness);
          }

          // ── stats ───────────────────────────────────────────────────
          case "stats": {
            const { capabilityIndexEngine } = await import(
              "../../engines/CapabilityIndexEngine.js"
            );
            const { engineDigestEngine } = await import(
              "../../engines/EngineDigestEngine.js"
            );
            const { agentMemoryFabricEngine } = await import(
              "../../engines/AgentMemoryFabricEngine.js"
            );
            const { learningLoopEngine } = await import(
              "../../engines/LearningLoopEngine.js"
            );
            const { agenticLoopEngine } = await import(
              "../../engines/AgenticLoopEngine.js"
            );

            const [cap, engines, memory, learning, loop] = await Promise.all([
              capabilityIndexEngine.getStats(),
              engineDigestEngine.getStats(),
              agentMemoryFabricEngine.getStats().catch(() => ({})),
              learningLoopEngine.getStats().catch(() => ({})),
              Promise.resolve(agenticLoopEngine.getStats()),
            ]);

            return okResult({
              capabilities: cap,
              engines_inventory: engines,
              memory,
              learning,
              agentic_loop: loop,
            }, awareness);
          }

          // WIRE-UNWIRED-MS0/U-WIRE-ASP: AgentSpecializationProfileEngine read-only
          case "agent_profile_get": {
            const { agentSpecializationProfileEngine } = await import(
              "../../engines/AgentSpecializationProfileEngine.js"
            );
            const profileId = typeof params.profile_id === "string"
              ? params.profile_id
              : (typeof params.profileId === "string" ? params.profileId : "");
            if (!profileId) return errResult("agent_profile_get requires 'profile_id' (string)");
            const profile = agentSpecializationProfileEngine.getProfile(profileId);
            return okResult({ profile }, awareness);
          }
          case "agent_profile_list": {
            const { agentSpecializationProfileEngine } = await import(
              "../../engines/AgentSpecializationProfileEngine.js"
            );
            // Optional filter pass-through; engine signature: { family?, tier?, domain?, capability? }
            const filters = (params.filters && typeof params.filters === "object")
              ? params.filters as Parameters<typeof agentSpecializationProfileEngine.listProfiles>[0]
              : undefined;
            const profiles = agentSpecializationProfileEngine.listProfiles(filters);
            return okResult({ profiles, count: profiles.length }, awareness);
          }
          case "agent_profile_stats": {
            const { agentSpecializationProfileEngine } = await import(
              "../../engines/AgentSpecializationProfileEngine.js"
            );
            return okResult(agentSpecializationProfileEngine.getStats(), awareness);
          }

          default:
            return errResult(`Unknown action: ${action}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error(`[prism_agent] ${action} failed: ${message}`);
        return errResult(message, { action });
      }
    }
  );
}

// Export the action list for tests and dispatcher inventory
export const AGENT_DISPATCHER_ACTIONS = ACTIONS;
