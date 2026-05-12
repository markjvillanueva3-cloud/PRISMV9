/**
 * Hook Dispatcher - Consolidates hookToolsV2 (8) + hookToolsV3 (10) + hookManagementTools (10) = 28 tools → 1
 * Tool: prism_hook
 * Actions: list, get, execute, chain, toggle, emit, event_list, event_history,
 *          fire, chain_v2, status, history, enable, disable, coverage, gaps, performance, failures,
 *          subscribe, reactive_chains, hook_orch_plan, hook_coverage_analyze, hook_bandit_select,
 *          hook_telemetry_metrics, hook_efficiency_roi, manifest
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookEngine } from "../../orchestration/HookEngine.js";
import { eventBus } from "../../engines/EventBus.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { HOOK_ACTION_SCHEMAS } from "../../schemas/hookActionSchemas.js";

const ACTIONS = [
  "list", "get", "execute", "chain", "toggle",
  "emit", "event_list", "event_history",
  "fire", "chain_v2", "status", "history",
  "enable", "disable", "coverage", "gaps", "performance", "failures",
  "subscribe", "reactive_chains",
  // ENGINE-WIRE-MS0/U-WIRE17: 5 hook orchestration engines
  "hook_orch_plan", "hook_coverage_analyze", "hook_bandit_select",
  "hook_telemetry_metrics", "hook_efficiency_roi",
  // HOOK-MANIFEST-DAG-MS26/P0-U01: static hook manifest (catalog + DAG-validator input)
  "manifest"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

/** Registers hook dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerHookDispatcher(server: any): void {
  server.tool(
    "prism_hook",
    `Hook & event management (${ACTIONS.length} actions, consolidates 28 tools). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_hook] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      // Zod schema validation
      const validation = validateActionParams(action, params, HOOK_ACTION_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_hook"
        );
      }

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
            const results = await (hookEngine as unknown as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>).executeHookChain?.(params.event, params.phase || "before", params.data || {}, { stopOnError: params.stop_on_error || false, stopOnHalt: params.stop_on_halt ?? true })
              ?? await hookEngine.executeChain([params.event], params.data || {});
            return ok(results);
          }
          case "toggle": {
            hookEngine.toggleHook(params.hook_id, params.enabled);
            return ok({ hook_id: params.hook_id, enabled: params.enabled });
          }
          // === Event Tools ===
          case "emit": {
            const result = await eventBus.publish(params.event, params.data || {});
            return ok({ event: params.event, result });
          }
          case "event_list": {
            const events = eventBus.listEvents(params.category);
            return ok({ count: events.length, events });
          }
          case "event_history": {
            const history = eventBus.getHistory({ limit: params.limit ?? 20, type: params.event, category: params.category });
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
            const results = await (hookEngine as unknown as Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined>).executeHookChain?.(params.event, params.phase || "before", params.data || {}, { stopOnError: true, parallel: params.parallel || false, enableRollback: params.enable_rollback ?? true })
              ?? await hookEngine.executeChain([params.event], params.data || {});
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
            let history = eventBus.getHistory({ limit: params.last_n ?? 50 });
            if (params.event) history = history.filter((h: any) => h.event === params.event);
            if (params.hook_id) history = history.filter((h: any) => h.data?.hook_id === params.hook_id);
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
            const perf = hookEngine.getPerformance(params.hook_id, params.sort_by ?? "avg_duration", params.limit ?? 20);
            return ok(perf);
          }
          case "failures": {
            const failures = hookEngine.getFailures(params.hook_id, params.last_n ?? 100, params.include_stack ?? false);
            return ok(failures);
          }
          // === Pub/Sub Protocol Actions (R3-MS4.5) ===
          case "subscribe": {
            if (!params.event) return ok({ error: "Missing required param: event" });
            if (typeof params.callback !== "function") {
              // When called via MCP tool (not programmatic), store a no-op subscription and return id
              const subId = eventBus.subscribeTyped({
                event: params.event,
                filter: params.filter,
                callback: (_evt) => { /* no-op for MCP-registered subscriptions */ },
                description: params.description,
                active: params.active !== false
              });
              return ok({ subscription_id: subId, event: params.event, filter: params.filter });
            }
            const subId = eventBus.subscribeTyped({
              event: params.event,
              filter: params.filter,
              callback: params.callback,
              description: params.description,
              active: params.active !== false
            });
            return ok({ subscription_id: subId, event: params.event });
          }
          case "reactive_chains": {
            const chains = eventBus.getReactiveChains();
            return ok({ count: chains.length, chains });
          }
          // ENGINE-WIRE-MS0/U-WIRE17 — 5 hook orchestration engines
          case "hook_orch_plan": {
            const { hookOrchestratorEngine } = await import("../../engines/HookOrchestratorEngine.js");
            const phase = params.phase as "PreTool" | "PostTool" | "UserPromptSubmit" | "SessionStart" | "SessionEnd" | "PreCompact" | "Stop";
            return ok(hookOrchestratorEngine.plan(phase));
          }
          case "hook_coverage_analyze": {
            const { hookCoverageMaximizerEngine } = await import("../../engines/HookCoverageMaximizerEngine.js");
            await hookCoverageMaximizerEngine.initialize();
            return ok(await hookCoverageMaximizerEngine.analyze());
          }
          case "hook_bandit_select": {
            const { hookBanditEngine } = await import("../../engines/HookBanditEngine.js");
            const k = params.k as number;
            const timeBudgetMs = (params.timeBudgetMs ?? params.time_budget_ms) as number | undefined;
            return ok(hookBanditEngine.select(k, timeBudgetMs ?? 500));
          }
          case "hook_telemetry_metrics": {
            const { hookTelemetryEngine } = await import("../../engines/HookTelemetryEngine.js");
            return ok(hookTelemetryEngine.getSystemMetrics());
          }
          case "hook_efficiency_roi": {
            const { hookEfficiencyEngine } = await import("../../engines/HookEfficiencyEngine.js");
            const sessionBudget = (params.sessionBudget ?? params.session_budget) as number | undefined;
            return ok(hookEfficiencyEngine.getROI(sessionBudget ?? 150_000));
          }
          // HOOK-MANIFEST-DAG-MS26/P0-U01 — static hook manifest (catalog of .claude/hooks + mcp-server/src/hooks ⋈ settings.json wirings)
          case "manifest": {
            const { hookManifestEngine } = await import("../../engines/HookManifestEngine.js");
            const opts = { repoRoot: params.repoRoot as string | undefined };
            if (params.write === true || params.regenerate === true) {
              const { manifest, path } = await hookManifestEngine.generateAndWrite({
                ...opts,
                outPath: params.outPath as string | undefined,
              });
              return ok({ written: true, path, stats: manifest.stats, danglingRefs: manifest.danglingRefs });
            }
            const manifest = hookManifestEngine.generate(opts);
            if (params.hook) {
              const key = String(params.hook);
              const hit = manifest.hooks.find((h) => h.file === key || h.id === key);
              return ok(hit ?? { error: `Hook not found: ${key}`, hint: "pass the relative file path or basename" });
            }
            if (params.event) {
              const ev = String(params.event);
              const files = manifest.events[ev] ?? [];
              return ok({
                event: ev,
                count: files.length,
                hooks: files.map((f) => {
                  const e = manifest.hooks.find((h) => h.file === f);
                  return { file: f, id: e?.id, hardBlock: e?.hardBlock ?? false, wirings: (e?.wirings ?? []).filter((w) => w.event === ev) };
                }),
              });
            }
            if (params.full === true) return ok(manifest);
            return ok({
              schemaVersion: manifest.schemaVersion,
              generatedAt: manifest.generatedAt,
              repoRoot: manifest.repoRoot,
              hookDirs: manifest.hookDirs,
              settingsFiles: manifest.settingsFiles,
              stats: manifest.stats,
              danglingRefs: manifest.danglingRefs,
              hint: "params: full=true (entire catalog) · write=true (re)write mcp-server/data/state/hook-manifest.json · event=<name> · hook=<id|path>",
            });
          }
          default: return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_hook");
      }
    }
  );
}
