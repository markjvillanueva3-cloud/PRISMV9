/**
 * Skill & Script Dispatcher — Skill management and script execution.
 *
 * Provides CRUD and search for skills and scripts, task-based skill finding,
 * skill loading/recommendation/chaining, script execution (sync and queued),
 * bundle management, and v2 enhanced search/stats/execute actions.
 *
 * @module skillScriptDispatcher
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SKILL_SCRIPT_SCHEMAS } from "../../schemas/skillScriptActionSchemas.js";
import { registryManager } from "../../registries/index.js";
import { skillExecutor, SkillLoadResult, SkillRecommendation, SkillChain, TaskAnalysis } from "../../engines/SkillExecutor.js";
import { scriptExecutor, ExecutionResult, QueuedExecution, ScriptRecommendation, ExecutionParams } from "../../engines/ScriptExecutor.js";
import { skillRegistry, SkillCategory, Skill } from "../../registries/SkillRegistry.js";
import { scriptRegistry, ScriptCategory, ScriptLanguage, Script } from "../../registries/ScriptRegistry.js";
import { getAllBundles, getBundle, getBundlesForAction, getBundlesForDomain, listBundles } from "../../engines/SkillBundleEngine.js";

const ACTIONS = [
  "skill_list", "skill_get", "skill_search", "skill_find_for_task", "skill_content", "skill_stats",
  "script_list", "script_get", "script_search", "script_command", "script_execute", "script_stats",
  "skill_load", "skill_recommend", "skill_analyze", "skill_chain", "skill_search_v2", "skill_stats_v2",
  "script_execute_v2", "script_queue", "script_recommend", "script_search_v2", "script_history",
  "bundle_list", "bundle_get", "bundle_for_action", "bundle_for_domain",
  "skill_tier_register", "skill_tier_assign", "skill_tier_classify_all", "skill_tier_list", "skill_tier_size",
  "skill_auto_load", "skill_auto_load_clear_cache",
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

/** Registers skill script dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerSkillScriptDispatcher(server: any): void {
  server.tool(
    "prism_skill_script",
    "Skills, scripts, and bundles: list/get/search/execute/recommend/chain. Use 'action' param.",
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_skill_script] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_SKILL_SCRIPT_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_skill_script"
        );
      }
      try {
        switch (action) {
          case "skill_list": {
            await registryManager.initialize();
            let skills = params.category
              ? registryManager.skills.getByCategory(params.category)
              : registryManager.skills.all();
            
            if (params.enabled_only !== false) {
              skills = skills.filter(s => s.enabled && s.status === "active");
            }
            
            skills.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            
            const total = skills.length;
            const offset = params.offset || 0;
            const limit = params.limit || 20;
            const paged = skills.slice(offset, offset + limit);
            
            const result = { skills: paged, total, hasMore: offset + paged.length < total };
            return ok(result);
          }

          case "skill_get": {
            await registryManager.initialize();
            const skill = registryManager.skills.getSkill(params.skill_id);
            
            if (!skill) {
              return ok({ error: `Skill not found: ${params.skill_id}` });
            }
            
            let skillContent;
            if (params.include_content) {
              skillContent = await registryManager.skills.getContent(params.skill_id);
            }
            
            return ok({ ...skill, content: skillContent });
          }

          case "skill_search": {
            await registryManager.initialize();
            const results = registryManager.skills.search({
              query: params.query,
              category: params.category,
              tag: params.tag,
              enabled: params.enabled,
              limit: params.limit || 20,
              offset: params.offset || 0
            });
            return ok(results);
          }

          case "skill_find_for_task": {
            await registryManager.initialize();
            const taskDesc = params.task_description || params.task || params.query || "";
            if (!taskDesc) return ok({ error: "Missing task description. Provide 'task' or 'task_description' parameter." });
            const skills = registryManager.skills.findForTask(taskDesc);
            const topSkills = skills.slice(0, params.max_results || 5);
            return ok({ task: taskDesc, skills: topSkills });
          }

          case "skill_content": {
            await registryManager.initialize();
            const content = await registryManager.skills.getContent(params.skill_id);
            
            if (!content) {
              return ok({ error: `Skill content not found: ${params.skill_id}` });
            }
            
            return ok({ skill_id: params.skill_id, content, length: content.length });
          }

          case "skill_stats": {
            await registryManager.initialize();
            const stats = registryManager.skills.getStats();
            return ok(stats);
          }

          case "script_list": {
            await registryManager.initialize();
            
            let scripts = params.category
              ? registryManager.scripts.getByCategory(params.category)
              : params.language
                ? registryManager.scripts.getByLanguage(params.language)
                : registryManager.scripts.all();
            
            if (params.enabled_only !== false) {
              scripts = scripts.filter(s => s.enabled && s.status === "active");
            }
            
            scripts.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            
            const total = scripts.length;
            const offset = params.offset || 0;
            const limit = params.limit || 20;
            const paged = scripts.slice(offset, offset + limit);
            
            const result = { scripts: paged, total, hasMore: offset + paged.length < total };
            return ok(result);
          }

          case "script_get": {
            await registryManager.initialize();
            const script = registryManager.scripts.getScript(params.script_id);
            
            if (!script) {
              return ok({ error: `Script not found: ${params.script_id}` });
            }
            
            return ok(script);
          }

          case "script_search": {
            await registryManager.initialize();
            const results = registryManager.scripts.search({
              query: params.query,
              category: params.category,
              language: params.language,
              tag: params.tag,
              limit: params.limit || 20,
              offset: params.offset || 0
            });
            return ok(results);
          }

          case "script_command": {
            await registryManager.initialize();
            const command = registryManager.scripts.getExecutionCommand(params.script_id, params.args);
            
            if (!command) {
              return ok({ error: `Script not found: ${params.script_id}` });
            }
            
            return ok({ command, script_id: params.script_id });
          }

          case "script_execute": {
            // W5-DEV: Upgraded from simulation to real execution via ScriptExecutor
            await scriptExecutor.initialize();
            const script = scriptExecutor.getScript(params.script_id);
            
            if (!script) {
              return ok({ error: `Script not found: ${params.script_id}` });
            }
            
            const command = scriptExecutor.getCommand(params.script_id, params.args || params.params);
            
            // If simulate_only=true, return command without executing (old behavior)
            if (params.simulate_only) {
              return ok({
                status: "simulated",
                script_id: params.script_id,
                command,
                message: "Run this command in terminal:",
              });
            }
            
            // Real execution
            const result = await scriptExecutor.executeScript(
              params.script_id,
              params.args || params.params || {},
              { timeout_ms: params.timeout_ms || 30000, working_dir: params.working_dir }
            );
            
            return ok({
              success: result.success,
              script_id: params.script_id,
              command,
              output: result.stdout?.substring(0, 4000),
              error: result.stderr?.substring(0, 2000),
              exit_code: result.exit_code,
              duration_ms: result.duration_ms
            });
          }

          case "script_stats": {
            await registryManager.initialize();
            const stats = registryManager.scripts.getStats();
            return ok(stats);
          }

          case "skill_load": {
            await skillExecutor.initialize();
            const skill = skillRegistry.getSkill(params.skill_id);
            
            if (!skill) {
              return ok({ success: false, error: `Skill not found: ${params.skill_id}` });
            }

            let content;
            let loadResult;
            
            if (params.include_content !== false) {
              loadResult = await skillExecutor.loadSkill(params.skill_id);
              if (loadResult.success) {
                content = loadResult.content;
              }
            }

            return ok({ success: true, skill, content, load_result: loadResult });
          }

          case "skill_recommend": {
            const analysis = skillExecutor.analyzeTask(params.task);
            const recommendations = await skillExecutor.recommendSkills(params.task);
            
            const minRelevance = params.min_relevance || 0.3;
            const filtered = recommendations.filter(r => r.relevance_score >= minRelevance);
            const limited = filtered.slice(0, params.max_results || 10);
            
            const suggestedChain = limited
              .filter(r => r.estimated_value === "HIGH" || r.estimated_value === "MEDIUM")
              .map(r => r.skill_id)
              .slice(0, 5);

            return ok({
              success: true,
              task_analysis: analysis,
              recommendations: limited,
              suggested_chain: suggestedChain.length > 0 ? suggestedChain : undefined
            });
          }

          case "skill_analyze": {
            const analysis = skillExecutor.analyzeTask(params.task);
            return ok({ success: true, analysis });
          }

          case "skill_chain": {
            // Support predefined chains by name OR custom skill_ids
            let chainSkills = params.skill_ids;
            let chainPurpose = params.purpose || "";
            
            if (params.chain_name) {
              const predefined = skillExecutor.getPredefinedChain(params.chain_name);
              if (!predefined) {
                const available = skillExecutor.listPredefinedChains();
                return ok({ error: `Unknown chain: ${params.chain_name}`, available_chains: available });
              }
              chainSkills = predefined.skills;
              chainPurpose = chainPurpose || predefined.purpose;
            }
            
            if (!chainSkills?.length && !params.chain_name) {
              // List mode: return all predefined chains
              return ok({ predefined_chains: skillExecutor.listPredefinedChains() });
            }
            
            if (!chainSkills?.length) return ok({ error: "No skill_ids provided and chain_name not found" });
            
            const chain = await skillExecutor.buildSkillChain(chainSkills, chainPurpose);
            
            let executionResult;
            if (params.execute) {
              executionResult = await skillExecutor.executeSkillChain(chain);
            }

            return ok({ success: true, chain, execution_result: executionResult });
          }

          case "skill_search_v2": {
            await skillExecutor.initialize();
            
            const result = skillRegistry.search({
              query: params.query,
              category: params.category,
              tag: params.tag,
              enabled: params.enabled_only !== false ? true : undefined,
              limit: params.limit || 20,
              offset: params.offset || 0
            });

            const categories = skillExecutor.getCategories();

            return ok({
              success: true,
              skills: result.skills,
              total: result.total,
              has_more: result.hasMore,
              categories
            });
          }

          case "skill_stats_v2": {
            await skillExecutor.initialize();
            const executorStats = skillExecutor.getStats();
            const registryStats = executorStats.registry;

            const stats: Record<string, any> = {
              skills_available: executorStats.skills_available,
              by_category: registryStats.byCategory,
              total_lines: registryStats.totalLines,
              total_size_kb: registryStats.totalSizeKB,
              active_enabled: registryStats.activeEnabled
            };

            if (params.include_cache !== false) {
              stats.cache = (executorStats as Record<string, unknown>).cache;
            }

            if (params.include_usage !== false) {
              stats.usage = (executorStats as Record<string, unknown>).usage;

              const topN = params.top_n || 10;
              const topUsed = skillExecutor.getMostUsed(topN);
              stats.top_used = topUsed.map(u => ({
                skill_id: u.skill_id,
                load_count: u.load_count,
                avg_load_time_ms: Math.round(u.avg_load_time_ms * 100) / 100
              }));
            }

            return ok({ success: true, stats });
          }

          case "script_execute_v2": {
            await scriptExecutor.initialize();

            const script = scriptExecutor.getScript(params.script_id);
            if (!script) {
              return ok({ success: false, error: `Script not found: ${params.script_id}` });
            }

            const isDestructive = scriptExecutor.isDestructive(params.script_id);
            const command = scriptExecutor.getCommand(params.script_id, params.params);

            if (isDestructive && !params.bypass_safe_mode) {
              return ok({
                success: false,
                script,
                command,
                is_destructive: true,
                error: `Script ${params.script_id} is marked as potentially destructive. Set bypass_safe_mode=true to execute.`
              });
            }

            const result = await scriptExecutor.executeScript(
              params.script_id,
              params.params || {},
              {
                timeout_ms: params.timeout_ms || 60000,
                working_dir: params.working_dir
              }
            );

            return ok({
              success: result.success,
              result,
              script,
              command,
              is_destructive: isDestructive
            });
          }

          case "script_queue": {
            await scriptExecutor.initialize();

            const queued: any[] = [];
            for (const script of params.scripts || []) {
              const execution = scriptExecutor.queueScript(
                script.script_id,
                script.params || {},
                {},
                script.priority || 5
              );
              queued.push(execution);
            }

            let results;
            if (params.process_immediately) {
              results = await scriptExecutor.processQueue();
            }

            const queueStatus = scriptExecutor.getQueueStatus();

            return ok({
              success: true,
              queued,
              results,
              queue_status: queueStatus
            });
          }

          case "script_recommend": {
            const recommendations = await scriptExecutor.recommendScripts(params.task);
            const limited = recommendations.slice(0, params.max_results || 10);

            return ok({ success: true, recommendations: limited });
          }

          case "script_search_v2": {
            await scriptExecutor.initialize();
            
            const result = scriptRegistry.search({
              query: params.query,
              category: params.category,
              language: params.language,
              tag: params.tag,
              enabled: params.enabled_only !== false ? true : undefined,
              limit: params.limit || 20,
              offset: params.offset || 0
            });

            const categories = scriptExecutor.getCategories();
            const languages = ["python", "powershell", "bash", "javascript", "typescript"];

            return ok({
              success: true,
              scripts: result.scripts,
              total: result.total,
              has_more: result.hasMore,
              categories,
              languages
            });
          }

          case "script_history": {
            await scriptExecutor.initialize();

            const history = scriptExecutor.getHistory({
              script_id: params.script_id,
              success: params.success_only,
              limit: params.limit || 20
            });

            let stats;
            if (params.include_stats !== false) {
              stats = scriptExecutor.getStats();
            }

            return ok({ success: true, history, stats });
          }

          case "bundle_list":
            return ok(listBundles());

          case "bundle_get": {
            const bundle = getBundle(params.id || params.bundle_id || "");
            if (!bundle) return ok({ error: `Bundle not found: ${params.id}` });
            return ok(bundle);
          }

          case "bundle_for_action": {
            const bundles = getBundlesForAction(params.action || params.name || "");
            return ok({ action: params.action || params.name, bundles: bundles.map(b => ({ id: b.id, name: b.name, digest: b.digest })) });
          }

          case "bundle_for_domain": {
            const bundles = getBundlesForDomain(params.domain || "");
            return ok({ domain: params.domain, bundles: bundles.map(b => ({ id: b.id, name: b.name, digest: b.digest })) });
          }

          case "skill_tier_register": {
            const { skillTierRegistryEngine } = await import("../../engines/SkillTierRegistryEngine.js");
            const canon = skillTierRegistryEngine.register({
              command: String(params.command),
              description: String(params.description),
              triggers: Array.isArray(params.triggers) ? params.triggers.map((t: unknown) => String(t)) : [],
              tags: Array.isArray(params.tags) ? params.tags.map((t: unknown) => String(t)) : undefined,
              explicitTier: params.explicit_tier || params.explicitTier,
              invocationCount: typeof params.invocation_count === "number" ? params.invocation_count
                : typeof params.invocationCount === "number" ? params.invocationCount : undefined,
            });
            return ok({ success: true, registered: canon, size: skillTierRegistryEngine.size() });
          }

          case "skill_tier_assign": {
            const { skillTierRegistryEngine } = await import("../../engines/SkillTierRegistryEngine.js");
            const assignment = skillTierRegistryEngine.assign(String(params.command));
            return ok({ success: true, assignment });
          }

          case "skill_tier_classify_all": {
            const { skillTierRegistryEngine } = await import("../../engines/SkillTierRegistryEngine.js");
            const report = skillTierRegistryEngine.classifyAll();
            return ok({ success: true, ...report });
          }

          case "skill_tier_list": {
            const { skillTierRegistryEngine } = await import("../../engines/SkillTierRegistryEngine.js");
            const tier = String(params.tier) as "essential" | "intermediate" | "advanced";
            const list = skillTierRegistryEngine.listByTier(tier);
            return ok({ success: true, tier, count: list.length, list });
          }

          case "skill_tier_size": {
            const { skillTierRegistryEngine } = await import("../../engines/SkillTierRegistryEngine.js");
            return ok({ success: true, size: skillTierRegistryEngine.size() });
          }

          case "skill_auto_load": {
            const { autoLoadForTask, getLoadedExcerptsBlock } = await import("../../engines/SkillAutoLoader.js");
            const callNumber = typeof params.call_number === "number" ? params.call_number
              : typeof params.callNumber === "number" ? params.callNumber : 0;
            const domain = String(params.domain || "");
            const actionParam = String(params.task_action || params.taskAction || params.action_for_skill || "");
            const passthrough = (params.params && typeof params.params === "object") ? params.params : undefined;
            const result = autoLoadForTask(callNumber, domain, actionParam, passthrough);
            const excerptsBlock = getLoadedExcerptsBlock(result);
            return ok({ success: true, ...result, excerptsBlock });
          }

          case "skill_auto_load_clear_cache": {
            const { clearSkillCache } = await import("../../engines/SkillAutoLoader.js");
            clearSkillCache();
            return ok({ success: true, cleared: true });
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_skill_script");
      }
    }
  );
}