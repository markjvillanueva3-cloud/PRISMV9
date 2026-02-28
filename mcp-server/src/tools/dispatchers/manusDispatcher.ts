/**
 * Manus Dispatcher - PRISM's own agent task execution engine
 * Uses Claude API (NOT external Manus service) for all AI tasks.
 * Actions: create_task, task_status, task_result, cancel_task, list_tasks,
 *          knowledge_lookup, code_reasoning, hook_trigger, hook_list, hook_chain, hook_stats
 * 
 * This is PRISM's built-in task executor — no external Manus API key needed.
 * Tasks execute via Claude API using the key in .env / claude_desktop_config.json.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import { hasValidApiKey, getApiKey, getModelForTier } from "../../config/api-config.js";
import { PATHS } from "../../constants.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

const ACTIONS = ["create_task", "task_status", "task_result", "cancel_task", "list_tasks",
  "knowledge_lookup", "code_reasoning", "hook_trigger", "hook_list", "hook_chain", "hook_stats"] as const;

// ============================================================================
// INTERNAL TASK STORE (in-memory, persists for session lifetime)
// ============================================================================

interface ManusTask {
  id: string;
  prompt: string;
  mode: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
  result?: string;
  error?: string;
  model: string;
  tokens?: { input: number; output: number };
  duration_ms?: number;
}

const taskStore = new Map<string, ManusTask>();
let taskCounter = 0;

function genTaskId(): string {
  return `manus_${++taskCounter}_${Date.now()}`;
}

// ============================================================================
// CLAUDE API CALLER (raw fetch, same pattern as ralphDispatcher)
// ============================================================================

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  model?: string,
  maxTokens?: number
): Promise<{ text: string; tokens: { input: number; output: number }; duration_ms: number; model: string }> {
  const apiKey = getApiKey(); // throws if not set
  const useModel = model || getModelForTier("sonnet");
  const startTime = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: useModel,
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Claude API ${response.status}: ${response.statusText} ${errText}`);
  }

  const data: any = await response.json();
  const text = data.content?.map((b: any) => b.text || "").join("\n") || "";
  return {
    text,
    tokens: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    duration_ms: Date.now() - startTime,
    model: useModel
  };
}

// ============================================================================
// TASK EXECUTION — runs asynchronously, stores result
// ============================================================================

async function executeTask(task: ManusTask): Promise<void> {
  task.status = "running";
  task.updated_at = new Date().toISOString();

  try {
    const tierMap: Record<string, 'opus' | 'sonnet' | 'haiku'> = {
      quality: "sonnet", speed: "haiku", balanced: "sonnet", deep: "sonnet"
    };
    const tier = tierMap[task.mode] || "sonnet";
    const result = await callClaude(
      "You are PRISM Manufacturing Intelligence — an expert agent. Provide thorough, accurate, structured responses. For manufacturing queries, cite physics and verified data.",
      task.prompt,
      getModelForTier(tier)
    );
    task.result = result.text;
    task.tokens = result.tokens;
    task.duration_ms = result.duration_ms;
    task.model = result.model;
    task.status = "completed";
  } catch (err: any) {
    task.error = err.message;
    task.status = "failed";
  }
  task.updated_at = new Date().toISOString();
}

// ============================================================================
// HOOK REGISTRY LOADER (unchanged)
// ============================================================================

function loadHookRegistry(): any {
  try {
    const content = fs.readFileSync(PATHS.HOOKS_REGISTRY, "utf-8");
    return JSON.parse(content);
  } catch { return null; }
}

// ============================================================================
// DISPATCHER REGISTRATION
// ============================================================================

export function registerManusDispatcher(server: any): void {
  server.tool(
    "prism_manus",
    `Manus AI agent + development hooks. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Manus action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_manus] Action: ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      let result: any;
      try {
        switch (action) {
          // === TASK MANAGEMENT (uses Claude API) ===
          case "create_task": {
            if (!hasValidApiKey()) return ok({ error: "ANTHROPIC_API_KEY not configured. Add to .env file." });
            const task: ManusTask = {
              id: genTaskId(),
              prompt: params.prompt || "",
              mode: params.mode || "quality",
              status: "pending",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              model: getModelForTier("sonnet")
            };
            taskStore.set(task.id, task);
            // Execute asynchronously (don't await — return ID immediately)
            executeTask(task).catch(e => log.error(`[manus] Task ${task.id} failed: ${e}`));
            result = { success: true, task_id: task.id, status: "pending", message: "Task queued. Use task_status to monitor." };
            break;
          }

          case "task_status": {
            const task = taskStore.get(params.task_id);
            if (!task) { result = { error: `Task not found: ${params.task_id}` }; break; }
            result = { task_id: task.id, status: task.status, mode: task.mode, created_at: task.created_at, updated_at: task.updated_at, model: task.model, has_result: !!task.result, error: task.error };
            break;
          }

          case "task_result": {
            const task = taskStore.get(params.task_id);
            if (!task) { result = { error: `Task not found: ${params.task_id}` }; break; }
            if (task.status === "pending" || task.status === "running") {
              result = { task_id: task.id, status: task.status, message: "Task still in progress. Check back shortly." };
              break;
            }
            result = { task_id: task.id, status: task.status, output: task.result, tokens: task.tokens, duration_ms: task.duration_ms, model: task.model, error: task.error };
            break;
          }

          case "cancel_task": {
            const task = taskStore.get(params.task_id);
            if (!task) { result = { error: `Task not found: ${params.task_id}` }; break; }
            if (task.status === "pending") { task.status = "cancelled"; task.updated_at = new Date().toISOString(); }
            result = { task_id: task.id, status: task.status };
            break;
          }

          case "list_tasks": {
            const limit = params.limit || 20;
            const tasks = Array.from(taskStore.values())
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, limit)
              .map(t => ({ id: t.id, status: t.status, mode: t.mode, model: t.model, created_at: t.created_at, has_result: !!t.result }));
            result = { total: taskStore.size, showing: tasks.length, tasks };
            break;
          }

          // === SPECIALIZED TASKS (still via Claude API) ===
          case "knowledge_lookup": {
            if (!hasValidApiKey()) return ok({ error: "ANTHROPIC_API_KEY not configured." });
            const depth = params.depth || "standard";
            const query = params.query || "";
            const researchPrompt = `Conduct ${depth} research on: ${query}\n\nProvide:\n1. Key findings with explanations\n2. Relevant data points and statistics\n3. Different perspectives or approaches\n4. Recommendations based on findings\n\nBe thorough and cite your reasoning. For manufacturing topics, reference ISO standards, material specs, and physics-based analysis where applicable.`;
            const r = await callClaude(
              "You are a research analyst specializing in manufacturing, engineering, and technical topics. Provide structured, evidence-based analysis.",
              researchPrompt,
              getModelForTier(depth === "deep" ? "sonnet" : "haiku")
            );
            result = { success: true, query, depth, research: r.text, tokens: r.tokens, duration_ms: r.duration_ms, model: r.model };
            break;
          }

          case "code_reasoning": {
            if (!hasValidApiKey()) return ok({ error: "ANTHROPIC_API_KEY not configured." });
            const lang = params.language || "python";
            const code = params.code || "";
            const taskDesc = params.task_description || "";
            const codePrompt = `Analyze and execute this ${lang} code mentally, providing the expected output:\n\`\`\`${lang}\n${code}\n\`\`\`\n${taskDesc ? `\nTask: ${taskDesc}` : ""}\n\nProvide:\n1. Expected output\n2. Any errors or issues found\n3. Optimization suggestions\n4. For manufacturing calculations: verify units and physical plausibility`;
            const r = await callClaude(
              `You are a ${lang} expert and code reviewer for manufacturing systems. Analyze code thoroughly — errors in manufacturing code can cause machine crashes.`,
              codePrompt,
              getModelForTier("sonnet")
            );
            result = { success: true, language: lang, analysis: r.text, tokens: r.tokens, duration_ms: r.duration_ms, model: r.model };
            break;
          }

          // === HOOK MANAGEMENT (unchanged, uses local registry file) ===
          case "hook_trigger": {
            const registry = loadHookRegistry();
            if (!registry) { result = { error: "Hook registry not found" }; break; }
            const hook = registry.hooks.find((h: any) => h.id === params.hook_id);
            if (!hook) { result = { error: `Hook not found: ${params.hook_id}` }; break; }
            // M-018: Honestly report that this is a registry lookup, not real execution
            result = { hook_id: params.hook_id, domain: hook.domain, category: hook.category, trigger: hook.trigger,
              queried_at: new Date().toISOString(), params: params.params || {}, status: "simulated",
              note: "Hook metadata returned from registry. Use HookExecutor for real hook execution.",
              side_effects: hook.sideEffects, next_hooks: hook.relatedHooks };
            break;
          }
          case "hook_list": {
            const registry = loadHookRegistry();
            if (!registry) { result = { error: "Hook registry not found" }; break; }
            let hooks = registry.hooks;
            if (params.domain) hooks = hooks.filter((h: any) => h.domain === params.domain);
            if (params.category) hooks = hooks.filter((h: any) => h.category === params.category);
            result = { total: hooks.length, domains: registry.statistics?.domains || {},
              hooks: hooks.map((h: any) => ({ id: h.id, name: h.name, trigger: h.trigger, domain: h.domain, isBlocking: h.isBlocking })) };
            break;
          }

          case "hook_chain": {
            const registry = loadHookRegistry();
            if (!registry) { result = { error: "Hook registry not found" }; break; }
            const hooksMap = new Map(registry.hooks.map((h: any) => [h.id, h]));
            const chain: any[] = [];
            const visited = new Set<string>();
            let cur: string | null = params.start_hook_id || null;
            const maxDepth = params.max_depth || 10;
            while (cur && !visited.has(cur) && chain.length < maxDepth) {
              visited.add(cur);
              const hook: any = hooksMap.get(cur);
              if (!hook) break;
              chain.push({ hook_id: cur, domain: hook.domain, trigger: hook.trigger });
              cur = hook.relatedHooks?.length > 0 ? hook.relatedHooks[0] : null;
            }
            result = { chain_length: chain.length, hooks_executed: chain.map(r => r.hook_id), results: chain };
            break;
          }
          case "hook_stats": {
            const registry = loadHookRegistry();
            if (!registry) { result = { error: "Hook registry not found" }; break; }
            result = { version: registry.version, generated: registry.generated, statistics: registry.statistics };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }
        return ok(result);
      } catch (error) {
        return dispatcherError(error, action, "prism_manus");
      }
    }
  );
}

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}
