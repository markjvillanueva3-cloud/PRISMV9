/**
 * Hook Dispatcher - Consolidates hookToolsV2 (8) + hookToolsV3 (10) + hookManagementTools (10) = 28 tools → 1
 * Tool: prism_hook
 * Actions: list, get, execute, chain, toggle, emit, event_list, event_history,
 *          fire, chain_v2, status, history, enable, disable, coverage, gaps, performance, failures
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookEngine } from "../../orchestration/HookEngine.js";
import { eventBus } from "../../engines/EventBus.js";

const ACTIONS = [
  "list", "get", "execute", "chain", "toggle",
  "emit", "event_list", "event_history",
  "fire", "chain_v2", "status", "history",
  "enable", "disable", "coverage", "gaps", "performance", "failures"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerHookDispatcher(server: any): void {
  server.tool(
    "prism_hook",
    `Hook & event management (18 actions, consolidates 28 tools). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_hook] ${action}`);
      try {
        switch (action) {
          // === V2 Hook Tools ===
          case "list": {
            let hooks = hookEngine.listHooks();
            if (params.event) hooks = hooks.filter((h: any) => h.event === params.event);
            if (params.phase) hooks = hooks.filter((h: any) => h.phase === params.phase);
            if (params.enabled !== undefined) hooks = hooks.filter((h: any) => h.enabled === params.enabled);
            return ok({ count: hooks.length, hooks });
          }
          case "get": {
            const hook = hookEngine.getHook(params.hook_id);
            if (!hook) return ok({ error: `Hook not found: ${params.hook_id}` });
            return ok(hook);
          }
          case "execute": {
            const result = await hookEngine.executeHook(params.hook_id, params.data || {});
            return ok(result);
          }
          case "chain": {
            const results = await hookEngine.executeHookChain(params.event, params.phase || "before", params.data || {}, { stopOnError: params.stop_on_error || false, stopOnHalt: params.stop_on_halt ?? true });
            return ok(results);
          }
          case "toggle": {
            hookEngine.toggleHook(params.hook_id, params.enabled);
            return ok({ hook_id: params.hook_id, enabled: params.enabled });
          }
          // === Event Tools ===
          case "emit": {
            const result = await eventBus.emit(params.event, params.data || {});
            return ok({ event: params.event, result });
          }
          case "event_list": {
            const events = eventBus.listEvents(params.category);
            return ok({ count: events.length, events });
          }
          case "event_history": {
            const history = eventBus.getHistory(params.event, params.limit || 20);
            return ok({ count: history.length, history });
          }
          // === V3/Management Tools (unified) ===
          case "fire": {
            const safety = params.validate_safety ?? true;
            if (safety) {
              const hook = hookEngine.getHook(params.hook_id);
              if (!hook) return ok({ error: `Hook not found: ${params.hook_id}` });
            }
            const result = await hookEngine.executeHook(params.hook_id, params.data || params.context || {});
            return ok(result);
          }
          case "chain_v2": {
            const results = await hookEngine.executeHookChain(params.event, params.phase || "before", params.data || {}, { stopOnError: true, parallel: params.parallel || false, enableRollback: params.enable_rollback ?? true });
            return ok(results);
          }
          case "status": {
            let hooks = hookEngine.listHooks();
            if (params.filter_domain) hooks = hooks.filter((h: any) => h.domain === params.filter_domain);
            if (params.filter_enabled !== undefined) hooks = hooks.filter((h: any) => h.enabled === params.filter_enabled);
            const enabled = hooks.filter((h: any) => h.enabled).length;
            const disabled = hooks.length - enabled;
            return ok({ total: hooks.length, enabled, disabled, hooks: params.show_metrics !== false ? hooks : hooks.map((h: any) => ({ id: h.id, enabled: h.enabled, event: h.event })) });
          }
          case "history": {
            const history = hookEngine.getExecutionHistory(params.hook_id, params.event, params.last_n || 50, params.success_only);
            return ok({ count: history.length, history });
          }
          case "enable": {
            hookEngine.toggleHook(params.hook_id, true);
            log.info(`[prism_hook] Enabled ${params.hook_id}: ${params.reason || "no reason"}`);
            return ok({ hook_id: params.hook_id, enabled: true, reason: params.reason });
          }
          case "disable": {
            hookEngine.toggleHook(params.hook_id, false);
            log.info(`[prism_hook] Disabled ${params.hook_id}: ${params.reason || "no reason"}`);
            return ok({ hook_id: params.hook_id, enabled: false, reason: params.reason, temporary: params.temporary || false });
          }
          case "coverage": {
            const coverage = hookEngine.getCoverage(params.domain);
            return ok(coverage);
          }
          case "gaps": {
            const gaps = hookEngine.getGaps(params.domain, params.severity || "all");
            return ok(gaps);
          }
          case "performance": {
            const perf = hookEngine.getPerformance(params.hook_id, params.sort_by || "avg_duration", params.limit || 20);
            return ok(perf);
          }
          case "failures": {
            const failures = hookEngine.getFailures(params.hook_id, params.last_n || 100, params.include_stack || false);
            return ok(failures);
          }
          default: return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}
