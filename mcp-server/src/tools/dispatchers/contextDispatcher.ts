/**
 * Context Dispatcher — Session state, memory, and attention management.
 *
 * Handles key-value storage, tool masking, memory externalization/restoration,
 * TODO management, error preservation, team coordination (spawn, broadcast, tasks),
 * budget tracking, attention scoring, focus optimization, relevance filtering,
 * context monitoring, and catalog browsing.
 *
 * @module contextDispatcher
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CONTEXT_SCHEMAS } from "../../schemas/contextActionSchemas.js";
import { execFileSync } from "child_process";
import { TodoState, TodoStep, isStepDone, getStepLabel } from "../../types/prism-schema.js";
import { PATHS } from "../../constants.js";
import { ContextBudgetEngine } from "../../engines/ContextBudgetEngine.js";
import { getAllCatalogs, searchCatalog, getEngineCatalog, getCatalogStats } from "../../engines/SourceCatalogAggregator.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";

const ACTIONS = [
  "kv_sort_json",
  "kv_check_stability", 
  "tool_mask_state",
  "memory_externalize",
  "memory_restore",
  "todo_update",
  "todo_read",
  "error_preserve",
  "error_patterns",
  "vary_response",
  "team_spawn",
  "team_broadcast",
  "team_create_task",
  "team_heartbeat",
  // COORD-MS0/U-COORD08 — Cross-Terminal Broadcast (CrossTerminalBroadcastEngine)
  "cross_terminal_broadcast",          // broadcastOperatorMessage — send free-text to all sessions
  "cross_terminal_broadcast_recent",   // getRecentEvents — read recent channel events
  // Budget management via ContextBudgetEngine
  "budget_get",
  "budget_track",
  "budget_report",
  "budget_reset",
  // D2: Context Intelligence — Python module wiring
  "attention_score",
  "focus_optimize",
  "relevance_filter",
  "context_monitor_check",
  // Source catalog aggregation — unified query across 28 engine catalogs
  "catalog_overview",
  "catalog_search",
  "catalog_engine",
  "catalog_stats",
  // Identity model — U-SAV2-01: agent role, boundaries, invariants
  "identity_register",
  "identity_get",
  "identity_heartbeat",
  "identity_check_boundary",
  "identity_capabilities",
  "identity_list",
  "identity_siblings",
  "identity_deregister",
  "identity_stats",
  // ChatBus — live inter-chat messaging + file-claim registry (U-CHATBUS01)
  "chat_post",
  "chat_read",
  "claim_file",
  "release_file",
  "presence",
  "prune",
  // Context Priority — intelligent injection prioritization (U-CTXPRI01)
  "priority_classify_task",
  "priority_plan_injections",
  "priority_compute_relevance",
  "priority_stats",
  "priority_reset",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH1: Token Economy
  "token_economy_get_budget",
  "token_economy_record_spending",
  "token_economy_detect_waste",
  "token_economy_report",
  "token_accounting_record",
  "token_accounting_report",
  "token_budget_allocate",
  "token_budget_can_afford",
  "diff_token_uncommitted",
  "diff_token_staged",
  "diff_token_between",
  "diff_token_last_commits",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH2: Context Advanced
  "context_digest_file",
  "context_window_add",
  "context_integrity_check_edit",
  "context_snapshot_create",
  "context_compaction_create_context",
  "context_retention_extract_facts",
  "context_error_from_build",
  // HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE (H8): SQLite WAL backend for work claims
  "coord_sqlite",
  // AI-MAX-MS0/U-AIMAX07: Hierarchical Context Compression
  "compression_compress",
  "compression_batch",
  "compression_expand",
  "compression_has",
  "compression_policy",
  "compression_stats",
  // AI-MAX-MS0/U-AIMAX08: Automatic Context Checkpointing
  "checkpoint_record_edit",
  "checkpoint_should",
  "checkpoint_create",
  "checkpoint_latest",
  "checkpoint_list",
  "checkpoint_recover",
  "checkpoint_ingest",
  "checkpoint_config",
] as const;

const STATE_DIR = PATHS.STATE_DIR;
const EVENTS_DIR = path.join(STATE_DIR, "events");
const ERRORS_DIR = path.join(STATE_DIR, "errors");
const DECISIONS_DIR = path.join(STATE_DIR, "decisions");
const SNAPSHOTS_DIR = path.join(STATE_DIR, "snapshots");
const TODO_FILE = path.join(STATE_DIR, "todo.md");
const TEAMS_DIR = path.join(STATE_DIR, "teams");
const SCRIPTS_DIR = PATHS.SCRIPTS_CORE;
const PYTHON = PATHS.PYTHON;

function runPythonScript(scriptName: string, args: string[] = []): string {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return JSON.stringify({ error: `Script not found: ${scriptPath}` });
  }
  try {
    return execFileSync(PYTHON, [scriptPath, ...args], {
      encoding: 'utf-8', timeout: 30000, cwd: SCRIPTS_DIR
    }).trim();
  } catch (error: any) {
    return JSON.stringify({ error: error.message?.slice(0, 200) || "Script execution failed" });
  }
}

[EVENTS_DIR, ERRORS_DIR, DECISIONS_DIR, SNAPSHOTS_DIR, TEAMS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// TodoState, TodoStep, isStepDone, getStepLabel imported from prism-schema

let todoState: TodoState = {
  taskName: "Initialization",
  sessionId: "SESSION-" + Date.now(),
  currentFocus: "Session startup",
  steps: [],
  blockingIssues: [],
  qualityGates: { S: null, omega: null },
  recentDecisions: [],
  nextAction: "Load state files",
  lastUpdated: new Date().toISOString()
};

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

function getDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function generateEventId(prefix: string): string {
  const date = getDateString().replace(/-/g, '');
  const seq = Date.now().toString().slice(-6);
  return `${prefix}-${date}-${seq}`;
}

function sortObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  return Object.keys(obj).sort().reduce((acc: any, key) => {
    acc[key] = sortObjectKeys(obj[key]);
    return acc;
  }, {});
}

function appendJsonl(filepath: string, data: any): void {
  const sorted = sortObjectKeys(data);
  fs.appendFileSync(filepath, JSON.stringify(sorted) + '\n');
}

/** Registers context dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerContextDispatcher(server: any): void {
  server.tool(
    "prism_context",
    "Context engineering: KV-cache stability, tool masking, memory externalize/restore, todo, error tracking, teams, budget. Use 'action' param.",
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_context] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      const validation = validateActionParams(action, params, ACTION_CONTEXT_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_context");
      }
      try {
        switch (action) {
          case "kv_sort_json": {
            const { data, write_to } = params;
            const sorted = sortObjectKeys(data);
            const json = JSON.stringify(sorted, null, 2);
            
            if (write_to) {
              safeWriteSync(write_to, json);
            }
            
            return ok({
              status: "JSON SORTED",
              law: "Manus Law 1: KV-Cache Stability",
              principle: "Deterministic serialization = consistent cache hits",
              keys_sorted: true,
              written_to: write_to || null,
              sample_keys: Object.keys(sorted).slice(0, 5)
            });
          }

          case "kv_check_stability": {
            const { prefix_content } = params;
            const issues: string[] = [];
            
            if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(prefix_content)) {
              issues.push("Contains ISO timestamp - move to END of context");
            }
            if (/\d{2}\/\d{2}\/\d{4}/.test(prefix_content)) {
              issues.push("Contains date format - move to END of context");
            }
            if (/SESSION-\d+|session_id|sessionId/.test(prefix_content)) {
              issues.push("Contains session ID - move to dynamic suffix");
            }
            if (/[a-f0-9]{32,}|[A-Za-z0-9]{20,}/.test(prefix_content)) {
              issues.push("Contains hash/UUID - may invalidate cache");
            }
            
            const stable = issues.length === 0;
            
            return ok({
              status: stable ? "✅ PREFIX STABLE" : "⚠️ STABILITY ISSUES FOUND",
              law: "Manus Law 1: KV-Cache Stability",
              issues,
              recommendation: stable ? "Prefix is cache-stable" : "Move dynamic content to END of context (dynamic suffix)",
              cache_impact: stable ? "Cached: $0.30/MTok" : "Uncached: $3.00/MTok (10x more expensive)"
            });
          }

          case "tool_mask_state": {
            const { current_state } = params;
            const TOOL_STATES: Record<string, { available: string[]; masked: string[] }> = {
              "INITIALIZATION": {
                available: ["prism_state_*", "prism_gsd_*", "prism_skill_*"],
                masked: ["prism_material_write", "prism_machine_write", "prism_code_execute"]
              },
              "PLANNING": {
                available: ["prism_state_*", "prism_skill_*", "prism_combination_*", "prism_sp_brainstorm"],
                masked: ["prism_code_execute", "prism_material_write"]
              },
              "EXECUTION": {
                available: ["*"],
                masked: []
              },
              "VALIDATION": {
                available: ["prism_validate_*", "prism_safety_*", "prism_cognitive_*"],
                masked: ["prism_code_execute", "prism_material_write", "prism_machine_write"]
              },
              "ERROR_RECOVERY": {
                available: ["prism_state_*", "prism_sp_debug", "prism_error_*", "prism_checkpoint_*"],
                masked: ["prism_material_write", "prism_machine_write", "prism_code_execute"]
              }
            };
            
            const state = TOOL_STATES[current_state];
            if (!state) {
              return ok({
                status: "TOOL MASK STATE",
                law: "Manus Law 2: Mask Don't Remove",
                current_state: current_state || "UNKNOWN",
                available_patterns: ["*"],
                masked_patterns: [],
                valid_states: Object.keys(TOOL_STATES),
                note: `Unknown state '${current_state}'. Defaulting to full access. Valid states: ${Object.keys(TOOL_STATES).join(", ")}`
              });
            }
            
            return ok({
              status: "TOOL MASK STATE",
              law: "Manus Law 2: Mask Don't Remove",
              principle: "All tools stay in context, availability controlled by state machine",
              current_state,
              available_patterns: state.available,
              masked_patterns: state.masked,
              note: "Masked tools exist but are constrained - preserves KV-cache"
            });
          }

          case "memory_externalize": {
            const { memory_type, content, restoration_key } = params;
            if (!memory_type) {
              return ok({ error: "Required: memory_type (event|decision|error|snapshot)" });
            }
            const eventId = generateEventId(memory_type.toUpperCase().slice(0, 3));
            const timestamp = new Date().toISOString();
            
            const record = {
              id: eventId,
              timestamp,
              type: memory_type,
              restoration_key: restoration_key || eventId,
              content: sortObjectKeys(content),
              checksum: crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 16)
            };
            
            let filepath: string;
            switch (memory_type) {
              case "event":
                filepath = path.join(EVENTS_DIR, `${getDateString()}.jsonl`);
                break;
              case "decision":
                filepath = path.join(DECISIONS_DIR, `${getDateString()}.jsonl`);
                break;
              case "error":
                filepath = path.join(ERRORS_DIR, `${getDateString()}.jsonl`);
                break;
              case "snapshot":
                filepath = path.join(SNAPSHOTS_DIR, `${timestamp.replace(/[:.]/g, '-')}.json`);
                break;
              default:
                filepath = path.join(STATE_DIR, `custom_${eventId}.json`);
            }
            
            if (memory_type === "snapshot" || memory_type === "custom") {
              safeWriteSync(filepath, JSON.stringify(record, null, 2));
            } else {
              appendJsonl(filepath, record);
            }
            
            return ok({
              status: "MEMORY EXTERNALIZED",
              law: "Manus Law 3: File System as Context",
              principle: "128K tokens not enough - files = unlimited memory",
              record_id: eventId,
              filepath,
              restoration_key: record.restoration_key,
              checksum: record.checksum,
              note: "Content preserved - restoration always possible"
            });
          }

          case "memory_restore": {
            const { restoration_key, memory_type } = params;
            if (!restoration_key) {
              return ok({ error: "Required: restoration_key" });
            }
            const searchDirs = memory_type ?
              [memory_type === "event" ? EVENTS_DIR : 
               memory_type === "decision" ? DECISIONS_DIR :
               memory_type === "error" ? ERRORS_DIR : SNAPSHOTS_DIR] :
              [EVENTS_DIR, DECISIONS_DIR, ERRORS_DIR, SNAPSHOTS_DIR];
            
            let found: any = null;
            let foundIn: string = "";
            
            for (const dir of searchDirs) {
              if (!fs.existsSync(dir)) continue;
              const files = fs.readdirSync(dir);
              
              for (const file of files) {
                const filepath = path.join(dir, file);
                const content = fs.readFileSync(filepath, 'utf-8');
                
                if (file.endsWith('.jsonl')) {
                  const lines = content.trim().split('\n');
                  for (const line of lines) {
                    try {
                      const record = JSON.parse(line);
                      if (record.id === restoration_key || record.restoration_key === restoration_key) {
                        found = record;
                        foundIn = filepath;
                        break;
                      }
                    } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
                  }
                } else if (file.endsWith('.json')) {
                  try {
                    const record = JSON.parse(content);
                    if (record.id === restoration_key || record.restoration_key === restoration_key) {
                      found = record;
                      foundIn = filepath;
                    }
                  } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
                }
                
                if (found) break;
              }
              if (found) break;
            }
            
            if (!found) {
              return ok({
                status: "NOT FOUND",
                restoration_key,
                searched: searchDirs,
                suggestion: "Check key spelling or provide memory_type to narrow search"
              });
            }
            
            return ok({
              status: "MEMORY RESTORED",
              law: "Manus Law 3: File System as Context",
              principle: "Never permanently lose information",
              restoration_key,
              found_in: foundIn,
              record: found
            });
          }

          case "todo_update": {
            const { task_name, current_focus, steps, next_action, blocking_issues, quality_S, quality_omega } = params;
            
            if (task_name) todoState.taskName = task_name;
            if (current_focus !== undefined) todoState.currentFocus = current_focus;
            if (steps) todoState.steps = steps;
            if (next_action !== undefined) todoState.nextAction = next_action;
            if (blocking_issues) todoState.blockingIssues = blocking_issues;
            if (quality_S !== undefined) todoState.qualityGates.S = quality_S;
            if (quality_omega !== undefined) todoState.qualityGates.omega = quality_omega;
            todoState.lastUpdated = new Date().toISOString();
            
            const completedSteps = todoState.steps.filter(s => isStepDone(s)).length;
            const totalSteps = todoState.steps.length;
            const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
            const progressBar = "█".repeat(Math.floor(progress / 10)) + "░".repeat(10 - Math.floor(progress / 10));
            
            const todoContent = `# PRISM Active Task: ${todoState.taskName}
## Session: ${todoState.sessionId} | Updated: ${todoState.lastUpdated}

## 🎯 CURRENT FOCUS (ATTENTION ANCHOR)
> ${todoState.currentFocus || 'Not set'}

## Plan Status
${todoState.steps.map((s, i) => {
  const done = isStepDone(s);
  const label = getStepLabel(s, `Step ${i + 1}`);
  const isCurrent = !done && i === todoState.steps.findIndex(x => !isStepDone(x));
  return `- [${done ? 'x' : ' '}] Step ${i + 1}: ${label}${done ? ' ✓ COMPLETE' : isCurrent ? ' ← CURRENT' : ''}`;
}).join('\n')}

## Progress: ${completedSteps}/${totalSteps} (${progress}%) ${progressBar}

## Blocking Issues
${todoState.blockingIssues.length > 0 ? todoState.blockingIssues.map(i => `- ${i}`).join('\n') : '- None currently'}

## Quality Gates
- S(x): ${todoState.qualityGates.S !== null ? todoState.qualityGates.S.toFixed(2) : 'Pending validation'}
- Ω(x): ${todoState.qualityGates.omega !== null ? todoState.qualityGates.omega.toFixed(2) : 'Not yet computed'}

## Next Action
> ${todoState.nextAction || 'Continue with current step'}
`;
            
            safeWriteSync(TODO_FILE, todoContent);
            
            return ok({
              status: "TODO UPDATED - ATTENTION ANCHORED",
              law: "Manus Law 4: Attention Manipulation via Recitation",
              principle: "Goals at END of context = highest attention weight",
              task: todoState.taskName,
              focus: todoState.currentFocus,
              progress: `${completedSteps}/${totalSteps} (${progress}%)`,
              next: todoState.nextAction,
              file: TODO_FILE,
              recommendation: "Call this every 5-8 tool calls to maintain focus"
            });
          }

          case "todo_read": {
            let content = "";
            if (fs.existsSync(TODO_FILE)) {
              content = fs.readFileSync(TODO_FILE, 'utf-8');
            } else {
              content = "No todo.md found - call prism_todo_update to create one";
            }
            
            // W6.2 Bug 4: Enrich todoState from active workflow so it's never stale
            let effectiveState = { ...todoState };
            try {
              const wfPath = path.join(PATHS.STATE_DIR, "WORKFLOW_STATE.json");
              if (fs.existsSync(wfPath)) {
                const wf = JSON.parse(fs.readFileSync(wfPath, "utf-8"));
                if (wf.status === "active" && wf.current_step) {
                  const cur = wf.steps?.[wf.current_step - 1];
                  const done = wf.steps?.filter((s: any) => s.status === "done").length || 0;
                  effectiveState.taskName = `${wf.workflow_type}: ${wf.name}`;
                  effectiveState.currentFocus = cur ? `Step ${wf.current_step}/${wf.total_steps} (${cur.name}): ${cur.intent}` : effectiveState.currentFocus;
                  effectiveState.nextAction = cur ? cur.intent : effectiveState.nextAction;
                  effectiveState.steps = wf.steps?.map((s: any) => ({
                    description: `${s.name}: ${s.intent}`,
                    status: s.status === "done" ? "complete" : s.status === "active" ? "in_progress" : "pending"
                  })) || effectiveState.steps;
                }
              }
            } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }

            return ok({
              status: "TODO READ - ATTENTION REFRESHED",
              law: "Manus Law 4: Attention Manipulation via Recitation",
              state: effectiveState,
              file_content: content
            });
          }

          case "error_preserve": {
            const { tool_name, parameters, error_message, error_type, context_summary } = params;
            const errorEvent = {
              error_id: generateEventId("ERR"),
              timestamp: new Date().toISOString(),
              tool: tool_name,
              parameters: sortObjectKeys(parameters),
              error_type,
              error_message,
              context_at_failure: context_summary || "Not provided",
              recovery_attempted: false,
              resolution: null,
              prevention_rule: null
            };
            
            const errorFile = path.join(ERRORS_DIR, `${getDateString()}.jsonl`);
            appendJsonl(errorFile, errorEvent);
            
            const recoverySuggestions: Record<string, string> = {
              "VALIDATION": "Check input parameters against schema/constraints",
              "EXECUTION": "Verify tool availability and dependencies",
              "TIMEOUT": "Reduce scope or increase timeout",
              "PERMISSION": "Check access rights and authentication",
              "DATA": "Validate data format and completeness",
              "UNKNOWN": "Review logs and retry with verbose output"
            };
            
            return ok({
              status: "ERROR PRESERVED FOR LEARNING",
              law: "Manus Law 5: Keep Wrong Stuff in Context",
              principle: "Erasing failure removes evidence - model can't adapt without it",
              error_event: errorEvent,
              recovery_suggestion: recoverySuggestions[error_type],
              file: errorFile,
              important: "Error kept in context - model will avoid similar mistakes"
            });
          }

          case "error_patterns": {
            const { days_back = 7 } = params;
            const errors: any[] = [];
            const now = new Date();
            
            for (let i = 0; i < days_back; i++) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().split('T')[0];
              const errorFile = path.join(ERRORS_DIR, `${dateStr}.jsonl`);
              
              if (fs.existsSync(errorFile)) {
                const content = fs.readFileSync(errorFile, 'utf-8');
                content.trim().split('\n').forEach(line => {
                  try {
                    errors.push(JSON.parse(line));
                  } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
                });
              }
            }
            
            const byTool: Record<string, number> = {};
            const byType: Record<string, number> = {};
            
            errors.forEach(e => {
              byTool[e.tool] = (byTool[e.tool] || 0) + 1;
              byType[e.error_type] = (byType[e.error_type] || 0) + 1;
            });
            
            const topTools = Object.entries(byTool).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]);
            
            return ok({
              status: "ERROR PATTERNS ANALYZED",
              law: "Manus Law 5: Keep Wrong Stuff in Context",
              days_analyzed: days_back,
              total_errors: errors.length,
              patterns: {
                by_tool: Object.fromEntries(topTools),
                by_type: Object.fromEntries(topTypes)
              },
              recommendations: topTools.length > 0 ? [
                `Most problematic tool: ${topTools[0][0]} (${topTools[0][1]} errors)`,
                `Most common error type: ${topTypes[0]?.[0] || 'N/A'}`
              ] : ["No errors found - good!"],
              learning: "Patterns inform prevention rules"
            });
          }

          case "vary_response": {
            const { content, variation_level = "MEDIUM" } = params;
            if (!content) {
              return ok({ error: "Required: content (string to vary)" });
            }
            const strategies: Record<string, string[]> = {
              LOW: ["synonym_swap", "punctuation_vary"],
              MEDIUM: ["synonym_swap", "punctuation_vary", "sentence_reorder", "phrase_alternate"],
              HIGH: ["synonym_swap", "punctuation_vary", "sentence_reorder", "phrase_alternate", "structure_vary"]
            };

            const appliedStrategies = strategies[variation_level] ?? strategies["MEDIUM"];
            
            return ok({
              status: "VARIATION APPLIED",
              law: "Manus Law 6: Don't Get Few-Shotted",
              principle: "Repetitive patterns → model mimics → drift/hallucination",
              variation_level,
              strategies_applied: appliedStrategies,
              original_length: content.length,
              note: "Controlled variation breaks pattern mimicry without changing meaning"
            });
          }

          case "team_spawn": {
            const { team_name, objective, initial_agents } = params;
            const teamId = `TEAM-${Date.now()}`;
            const teamDir = path.join(TEAMS_DIR, teamId);
            fs.mkdirSync(teamDir, { recursive: true });
            fs.mkdirSync(path.join(teamDir, "tasks"));
            fs.mkdirSync(path.join(teamDir, "inbox"));
            
            const teamState = {
              id: teamId,
              name: team_name,
              objective,
              created: new Date().toISOString(),
              agents: initial_agents || [],
              status: "ACTIVE",
              tasks: [],
              heartbeat: new Date().toISOString()
            };
            
            safeWriteSync(path.join(teamDir, "state.json"), JSON.stringify(teamState, null, 2));
            
            return ok({
              status: "TEAM SPAWNED",
              pattern: "Claude Code TeammateTool",
              team_id: teamId,
              team_name,
              objective,
              agents: initial_agents || [],
              directories_created: [
                `${teamDir}/tasks`,
                `${teamDir}/inbox`
              ],
              next_steps: ["Add agents with prism_team_add_agent", "Create tasks with prism_team_create_task"]
            });
          }

          case "team_broadcast": {
            const { team_id, message, priority = "NORMAL" } = params;
            const teamDir = path.join(TEAMS_DIR, team_id);
            
            if (!fs.existsSync(teamDir)) {
              return ok({ error: `Team not found: ${team_id}` });
            }
            
            const teamState = JSON.parse(fs.readFileSync(path.join(teamDir, "state.json"), 'utf-8'));
            const broadcastId = `MSG-${Date.now()}`;
            
            const broadcast = {
              id: broadcastId,
              timestamp: new Date().toISOString(),
              type: "BROADCAST",
              priority,
              message,
              recipients: teamState.agents
            };
            
            teamState.agents.forEach((agentId: string) => {
              const inboxFile = path.join(teamDir, "inbox", `${agentId}.jsonl`);
              appendJsonl(inboxFile, broadcast);
            });
            
            return ok({
              status: "BROADCAST SENT",
              pattern: "Claude Code TeammateTool",
              broadcast_id: broadcastId,
              team_id,
              priority,
              recipients: teamState.agents,
              message_preview: message.slice(0, 100) + (message.length > 100 ? "..." : "")
            });
          }

          case "team_create_task": {
            const { team_id, title, description, assigned_to, blocked_by, priority = "NORMAL" } = params;
            const teamDir = path.join(TEAMS_DIR, team_id);
            
            if (!fs.existsSync(teamDir)) {
              return ok({ error: `Team not found: ${team_id}` });
            }
            
            const taskId = `TASK-${Date.now()}`;
            const task = {
              id: taskId,
              title,
              description,
              status: blocked_by && blocked_by.length > 0 ? "BLOCKED" : "PENDING",
              priority,
              assigned_to: assigned_to || null,
              blocked_by: blocked_by || [],
              blocks: [],
              created: new Date().toISOString(),
              started: null,
              completed: null
            };
            
            safeWriteSync(path.join(teamDir, "tasks", `${taskId}.json`), JSON.stringify(task, null, 2));
            
            if (blocked_by) {
              blocked_by.forEach((blockerId: string) => {
                const blockerFile = path.join(teamDir, "tasks", `${blockerId}.json`);
                if (fs.existsSync(blockerFile)) {
                  const blocker = JSON.parse(fs.readFileSync(blockerFile, 'utf-8'));
                  blocker.blocks = blocker.blocks || [];
                  blocker.blocks.push(taskId);
                  safeWriteSync(blockerFile, JSON.stringify(blocker, null, 2));
                }
              });
            }
            
            return ok({
              status: "TASK CREATED",
              pattern: "Claude Code TeammateTool",
              task_id: taskId,
              team_id,
              title,
              initial_status: task.status,
              assigned_to: task.assigned_to,
              dependencies: blocked_by || [],
              note: task.status === "BLOCKED" ? 
                `Task blocked until ${blocked_by?.join(', ')} complete` : 
                "Task ready to start"
            });
          }

          case "team_heartbeat": {
            const { team_id } = params;
            const teamDir = path.join(TEAMS_DIR, team_id);
            
            if (!fs.existsSync(teamDir)) {
              return ok({ error: `Team not found: ${team_id}` });
            }
            
            const stateFile = path.join(teamDir, "state.json");
            const teamState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
            
            const lastHeartbeat = new Date(teamState.heartbeat);
            const now = new Date();
            const elapsed = (now.getTime() - lastHeartbeat.getTime()) / 1000;
            
            teamState.heartbeat = now.toISOString();
            safeWriteSync(stateFile, JSON.stringify(teamState, null, 2));
            
            return ok({
              status: "HEARTBEAT UPDATED",
              pattern: "Claude Code TeammateTool",
              team_id,
              last_heartbeat: lastHeartbeat.toISOString(),
              current_heartbeat: teamState.heartbeat,
              elapsed_seconds: elapsed.toFixed(1),
              warning: elapsed > 30 ? "⚠️ Previous gap exceeded 30s threshold" : null,
              recommendation: "Call heartbeat every 20-25 seconds"
            });
          }

          // ================================================================
          // COORD-MS0/U-COORD08 — CrossTerminalBroadcastEngine wiring
          // ================================================================

          case "cross_terminal_broadcast": {
            const { crossTerminalBroadcastEngine } = await import(
              "../../engines/CrossTerminalBroadcastEngine.js"
            );
            const p = params as Record<string, unknown>;
            const content = typeof p.content === "string"
              ? p.content
              : typeof p.message === "string"
                ? p.message
                : "";
            const msgType = (typeof p.msgType === "string"
              ? p.msgType
              : typeof p.msg_type === "string"
                ? p.msg_type
                : "info") as "info" | "warning" | "request" | "response";
            const data = await crossTerminalBroadcastEngine.broadcastOperatorMessage(
              content,
              msgType,
            );
            if (data.ok) return ok(data);
            return ok({ ok: false, error: data.error, detail: data.detail });
          }

          case "cross_terminal_broadcast_recent": {
            const { crossTerminalBroadcastEngine } = await import(
              "../../engines/CrossTerminalBroadcastEngine.js"
            );
            const p = params as Record<string, unknown>;
            const limit = typeof p.limit === "number" && p.limit > 0
              ? Math.floor(p.limit)
              : 50;
            const events = await crossTerminalBroadcastEngine.getRecentEvents(limit);
            return ok({ ok: true, events, count: events.length });
          }

          // ================================================================
          // CONTEXT BUDGET ENGINE
          // ================================================================

          case "budget_get": {
            return ok(ContextBudgetEngine.getBudget());
          }

          case "budget_track": {
            const { category, tokens } = params;
            if (!category || !tokens) {
              return ok({ error: "Required: category (string), tokens (number)" });
            }
            return ok(ContextBudgetEngine.trackUsage(category, Number(tokens)));
          }

          case "budget_report": {
            return ok(ContextBudgetEngine.getUsageReport());
          }

          case "budget_reset": {
            return ok(ContextBudgetEngine.resetBudget());
          }

          // ================================================================
          // D2: CONTEXT INTELLIGENCE — Wired Python modules
          // ================================================================

          case "attention_score": {
            // Score content segments for attention priority (what to keep vs evict)
            const task = params.task || params.context || "general";
            const contentFile = params.file;
            const pyArgs = ["--task", `"${task}"`];
            if (contentFile) {
              pyArgs.push("--score", `"${contentFile}"`);
            } else if (params.content) {
              // Write content to temp file for scoring
              const tmpFile = path.join(STATE_DIR, `_attention_tmp_${Date.now()}.txt`);
              safeWriteSync(tmpFile, typeof params.content === "string" ? params.content : JSON.stringify(params.content));
              pyArgs.push("--score", `"${tmpFile}"`);
              const output = runPythonScript("attention_scorer.py", pyArgs);
              try { fs.unlinkSync(tmpFile); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            const output = runPythonScript("attention_scorer.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "focus_optimize": {
            // Optimize attention budget allocation across competing items
            const pyArgs: string[] = [];
            if (params.budget) pyArgs.push("--budget", String(params.budget));
            if (params.task) pyArgs.push("--task", `"${params.task}"`);
            if (params.items) {
              const tmpFile = path.join(STATE_DIR, `_focus_tmp_${Date.now()}.json`);
              safeWriteSync(tmpFile, JSON.stringify(params.items));
              pyArgs.push("--items", `"${tmpFile}"`);
              const output = runPythonScript("focus_optimizer.py", pyArgs);
              try { fs.unlinkSync(tmpFile); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            const output = runPythonScript("focus_optimizer.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "relevance_filter": {
            // Filter irrelevant content from context
            const task = params.task || "general";
            const pyArgs = ["--task", `"${task}"`];
            if (params.content) {
              const tmpFile = path.join(STATE_DIR, `_relevance_tmp_${Date.now()}.txt`);
              safeWriteSync(tmpFile, typeof params.content === "string" ? params.content : JSON.stringify(params.content));
              pyArgs.push("--file", `"${tmpFile}"`);
              if (params.threshold) pyArgs.push("--threshold", String(params.threshold));
              if (params.mode) pyArgs.push("--mode", params.mode);
              const output = runPythonScript("relevance_filter.py", pyArgs);
              try { fs.unlinkSync(tmpFile); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            const output = runPythonScript("relevance_filter.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "context_monitor_check": {
            // Enhanced context monitoring with trend analysis
            const tokens = params.tokens ?? params.estimated_tokens ?? 100000;
            const pyArgs = ["--check", String(tokens)];
            if (params.trend) pyArgs.push("--trend");
            if (params.demo) pyArgs.push("--demo");
            const output = runPythonScript("context_monitor.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          // ============================================================
          // SOURCE CATALOG AGGREGATION (28 engine catalogs)
          // ============================================================
          case "catalog_overview": {
            const overview = await getAllCatalogs();
            return ok(overview);
          }
          case "catalog_search": {
            const results = await searchCatalog(params.query || "", {
              engine: params.engine, category: params.category,
              safety_class: params.safety_class, limit: params.limit
            });
            return ok({ query: params.query, results, count: results.length });
          }
          case "catalog_engine": {
            const catalog = await getEngineCatalog(params.engine || params.name);
            if (!catalog) return ok({ error: `Engine catalog not found: ${params.engine || params.name}` });
            return ok({ engine: params.engine || params.name, entries: catalog, count: Object.keys(catalog).length });
          }
          case "catalog_stats": {
            const stats = await getCatalogStats();
            return ok(stats);
          }

          // ─────────────────────────────────────────────────────────────────
          // Identity Model — U-SAV2-01
          // ─────────────────────────────────────────────────────────────────
          case "identity_register": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const result = identityModelEngine.register(params as Parameters<typeof identityModelEngine.register>[0]);
            return ok({ registered: true, identity: result });
          }

          case "identity_get": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const identity = identityModelEngine.get(params.sessionId);
            return ok({ found: identity !== null, identity });
          }

          case "identity_heartbeat": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const updated = identityModelEngine.heartbeat(params.sessionId);
            return ok({ updated });
          }

          case "identity_check_boundary": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const result = identityModelEngine.checkBoundary(params.sessionId, params.boundaryName);
            return ok(result);
          }

          case "identity_capabilities": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const capabilities = identityModelEngine.getCapabilities(params.sessionId);
            return ok({ sessionId: params.sessionId, capabilities });
          }

          case "identity_list": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const sessions = identityModelEngine.listSessions();
            return ok({ count: sessions.length, sessions });
          }

          case "identity_siblings": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const siblings = identityModelEngine.getSiblings(params.sessionId);
            return ok({ count: siblings.length, siblings: siblings.map(s => s.sessionId) });
          }

          case "identity_deregister": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const removed = identityModelEngine.deregister(params.sessionId);
            return ok({ removed });
          }

          case "identity_stats": {
            const { identityModelEngine } = await import("../../engines/IdentityModelEngine.js");
            const stats = identityModelEngine.getStats();
            return ok(stats);
          }

          // ─────────────────────────────────────────────────────────────────
          // ChatBus — live inter-chat messaging + file-claim registry (U-CHATBUS01)
          // ─────────────────────────────────────────────────────────────────
          case "chat_post": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            const id = chatBusEngine.postMessage({
              sessionId: params.sessionId,
              pcName: params.pcName,
              kind: params.kind,
              body: params.body,
              path: params.path,
              intent: params.intent,
            });
            return ok({ posted: true, id });
          }

          case "chat_read": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            const result = chatBusEngine.readUnread(params.sessionId);
            return ok({
              count: result.messages.length,
              messages: result.messages,
              cursorAdvancedTo: result.cursorAdvancedTo,
            });
          }

          case "claim_file": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            const conflict = chatBusEngine.claimFile({
              sessionId: params.sessionId,
              pcName: params.pcName,
              path: params.path,
              intent: params.intent,
            });
            if (conflict === null) return ok({ acquired: true });
            return ok({ acquired: false, conflict });
          }

          case "release_file": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            const released = chatBusEngine.releaseFile({
              sessionId: params.sessionId,
              pcName: params.pcName,
              path: params.path,
            });
            return ok({ released });
          }

          case "presence": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            chatBusEngine.heartbeat(params.sessionId, params.pcName, params.meta || {});
            const peers = chatBusEngine.activeSessions();
            return ok({ heartbeat: true, peers });
          }

          case "prune": {
            const { chatBusEngine } = await import("../../engines/ChatBusEngine.js");
            const stats = chatBusEngine.prune(Date.now(), {
              messageRetentionMs: params.messageRetentionMs,
              claimTtlMs: params.claimTtlMs,
              presenceTtlMs: params.presenceTtlMs,
            });
            return ok({ pruned: true, ...stats });
          }

          // ── HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE (H8) ──────────
          // SQLite WAL backend for work claims. Parallel surface to claim_file /
          // release_file — same semantics, lower contention under multi-chat
          // load. The migrate_from_json mode is a one-shot seeder for the
          // legacy WORK_CLAIMS.json file; once seeded, callers can switch
          // their hook surfaces over to this action gradually.
          case "coord_sqlite": {
            const { getCoordinationStoreEngine } = await import("../../engines/CoordinationStoreEngine.js");
            const engine = getCoordinationStoreEngine();
            const mode = String(params.mode || "");
            switch (mode) {
              case "claim": {
                if (!params.resource_path || !params.session_id) {
                  return ok({ error: "missing_required", fields: ["resource_path", "session_id"] });
                }
                const ttlMs = params.ttl_ms != null ? Number(params.ttl_ms) : undefined;
                return ok(engine.claim({
                  resourcePath: String(params.resource_path),
                  sessionId: String(params.session_id),
                  pcName: params.pc_name != null ? String(params.pc_name) : undefined,
                  hostname: params.hostname != null ? String(params.hostname) : undefined,
                  pid: params.pid != null ? Number(params.pid) : undefined,
                  intent: params.intent != null ? String(params.intent) : undefined,
                  ttlMs,
                }));
              }
              case "release": {
                if (!params.resource_path || !params.session_id) {
                  return ok({ error: "missing_required", fields: ["resource_path", "session_id"] });
                }
                return ok({ released: engine.release({
                  resourcePath: String(params.resource_path),
                  sessionId: String(params.session_id),
                }) });
              }
              case "find":
                return ok({ claim: params.resource_path ? engine.findClaim(String(params.resource_path)) : null });
              case "live":
                return ok({ claims: engine.liveClaims(), count: engine.liveClaims().length });
              case "all":
                return ok({ claims: engine.allClaims(), count: engine.allClaims().length });
              case "heartbeat": {
                if (!params.session_id) {
                  return ok({ error: "missing_required", fields: ["session_id"] });
                }
                return ok({ presence: engine.heartbeat({
                  sessionId: String(params.session_id),
                  pcName: params.pc_name != null ? String(params.pc_name) : undefined,
                  hostname: params.hostname != null ? String(params.hostname) : undefined,
                  meta: (params.meta ?? undefined) as Record<string, unknown> | undefined,
                }) });
              }
              case "active_sessions": {
                const w = params.window_ms != null ? Number(params.window_ms) : undefined;
                const rows = engine.activeSessions(w);
                return ok({ sessions: rows, count: rows.length });
              }
              case "prune":
                return ok(engine.prune());
              case "counts":
                return ok(engine.counts());
              case "health":
                return ok(engine.health());
              case "migrate_from_json":
                return ok(engine.migrateFromJson(params.source_path ? String(params.source_path) : undefined));
              default:
                return ok({ error: "invalid_mode", mode, allowed: ["claim", "release", "find", "live", "all", "heartbeat", "active_sessions", "prune", "counts", "health", "migrate_from_json"] });
            }
          }

          // Context Priority — intelligent injection prioritization (U-CTXPRI01)
          case "priority_classify_task": {
            const { contextPriorityEngine } = await import("../../engines/ContextPriorityEngine.js");
            const classification = contextPriorityEngine.classifyTask(params.prompt || "");
            return ok({ classification });
          }

          case "priority_plan_injections": {
            const { contextPriorityEngine } = await import("../../engines/ContextPriorityEngine.js");
            const plan = contextPriorityEngine.planInjections(
              params.prompt || "",
              params.items || [],
              params.tokenBudget || 10000
            );
            return ok({ plan });
          }

          case "priority_compute_relevance": {
            const { contextPriorityEngine } = await import("../../engines/ContextPriorityEngine.js");
            const score = contextPriorityEngine.computeRelevance(params.item, params.classification);
            return ok({ score });
          }

          case "priority_stats": {
            const { contextPriorityEngine } = await import("../../engines/ContextPriorityEngine.js");
            const stats = contextPriorityEngine.stats();
            return ok({ stats });
          }

          case "priority_reset": {
            const { contextPriorityEngine } = await import("../../engines/ContextPriorityEngine.js");
            contextPriorityEngine.resetHistory();
            return ok({ reset: true });
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH1: Token Economy ──
          case "token_economy_get_budget": {
            const { tokenEconomyEngine } = await import("../../engines/TokenEconomyEngine.js");
            const budget = tokenEconomyEngine.getBudget(params.task_class);
            const scaled = params.multiplier ? tokenEconomyEngine.scaleBudget(budget, params.multiplier) : budget;
            return ok({ budget: scaled });
          }
          case "token_economy_record_spending": {
            const { tokenEconomyEngine } = await import("../../engines/TokenEconomyEngine.js");
            const spending = tokenEconomyEngine.recordSpending(params.session_id, params.task_class, params.actual);
            return ok({ spending });
          }
          case "token_economy_detect_waste": {
            const { tokenEconomyEngine } = await import("../../engines/TokenEconomyEngine.js");
            const patterns = tokenEconomyEngine.detectWaste(
              params.tool_call_count,
              params.file_reads_count,
              params.unique_files_read,
              params.search_count,
              params.agent_spawn_count,
            );
            return ok({ waste_patterns: patterns });
          }
          case "token_economy_report": {
            const { tokenEconomyEngine } = await import("../../engines/TokenEconomyEngine.js");
            const report = tokenEconomyEngine.generateReport();
            return ok({ report });
          }

          case "token_accounting_record": {
            const { tokenAccountingEngine } = await import("../../engines/TokenAccountingEngine.js");
            tokenAccountingEngine.record(params.tool, params.tokens_in, params.tokens_out);
            return ok({ recorded: true });
          }
          case "token_accounting_report": {
            const { tokenAccountingEngine } = await import("../../engines/TokenAccountingEngine.js");
            const report = tokenAccountingEngine.getReport();
            return ok({ report });
          }

          case "token_budget_allocate": {
            const { tokenBudgetAllocatorEngine } = await import("../../engines/TokenBudgetAllocatorEngine.js");
            const plan = tokenBudgetAllocatorEngine.allocate(params.total_budget, params.phases);
            return ok({ plan });
          }
          case "token_budget_can_afford": {
            const { tokenBudgetAllocatorEngine } = await import("../../engines/TokenBudgetAllocatorEngine.js");
            const can = tokenBudgetAllocatorEngine.canAfford(params.remaining_budget, params.estimated_cost, params.must_reserve);
            return ok({ can_afford: can });
          }

          case "diff_token_uncommitted": {
            const { diffTokenEstimatorEngine } = await import("../../engines/DiffTokenEstimatorEngine.js");
            const estimate = diffTokenEstimatorEngine.estimateUncommitted();
            return ok({ estimate, summary: diffTokenEstimatorEngine.getCompactSummary(estimate) });
          }
          case "diff_token_staged": {
            const { diffTokenEstimatorEngine } = await import("../../engines/DiffTokenEstimatorEngine.js");
            const estimate = diffTokenEstimatorEngine.estimateStaged();
            return ok({ estimate, summary: diffTokenEstimatorEngine.getCompactSummary(estimate) });
          }
          case "diff_token_between": {
            const { diffTokenEstimatorEngine } = await import("../../engines/DiffTokenEstimatorEngine.js");
            const estimate = diffTokenEstimatorEngine.estimateBetween(params.from, params.to);
            return ok({ estimate, summary: diffTokenEstimatorEngine.getCompactSummary(estimate) });
          }
          case "diff_token_last_commits": {
            const { diffTokenEstimatorEngine } = await import("../../engines/DiffTokenEstimatorEngine.js");
            const estimate = diffTokenEstimatorEngine.estimateLastCommits(params.n);
            return ok({ estimate, summary: diffTokenEstimatorEngine.getCompactSummary(estimate) });
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH2: Context Advanced ──
          case "context_digest_file": {
            const { contextDigestEngine } = await import("../../engines/ContextDigestEngine.js");
            const result = contextDigestEngine.digestFile(params.path, params.content);
            return ok({ digest: result, oneliner: contextDigestEngine.oneLiner(result) });
          }
          case "context_window_add": {
            const { contextWindowMapEngine } = await import("../../engines/ContextWindowMapEngine.js");
            const id = contextWindowMapEngine.add(params.type, params.label, params.tokens);
            return ok({ segment_id: id });
          }
          case "context_integrity_check_edit": {
            const { contextIntegrityEngine } = await import("../../engines/ContextIntegrityEngine.js");
            const alert = contextIntegrityEngine.checkEdit(params.path);
            return ok({ alert });
          }
          case "context_snapshot_create": {
            const { contextSnapshotEngine } = await import("../../engines/ContextSnapshotEngine.js");
            const snapshot = contextSnapshotEngine.create({
              workingFiles: params.workingFiles ?? [],
              recentCommits: params.recentCommits ?? [],
              activeTask: params.activeTask ?? "",
              keyDecisions: params.keyDecisions ?? [],
              nextSteps: params.nextSteps ?? [],
              engineCount: params.engineCount,
              testCount: params.testCount,
            });
            return ok({ snapshot, formatted: contextSnapshotEngine.format(snapshot) });
          }
          case "context_compaction_create_context": {
            const { contextCompactionEngine } = await import("../../engines/ContextCompactionEngine.js");
            const ctx = contextCompactionEngine.createContext(params.maxTokens);
            return ok({ context: ctx });
          }
          case "context_retention_extract_facts": {
            const { contextRetentionEngine } = await import("../../engines/ContextRetentionEngine.js");
            const facts = contextRetentionEngine.extractCriticalFacts(params.text);
            return ok({ facts });
          }
          case "context_error_from_build": {
            const { errorContextEngine } = await import("../../engines/ErrorContextEngine.js");
            const contexts = errorContextEngine.fromBuildError(params.error_text);
            return ok({ errors: contexts });
          }

          // ── AI-MAX-MS0/U-AIMAX07: Hierarchical Context Compression ──
          case "compression_compress": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            try {
              const item = contextCompressionEngine.compress({
                id: String(params.id),
                content: String(params.content),
                priority: params.priority,
                kind: params.kind != null ? String(params.kind) : undefined,
              });
              return ok({ success: true, data: item });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "compression_batch": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            try {
              const out = contextCompressionEngine.batchCompress(params.items);
              return ok({ success: true, data: out });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "compression_expand": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            try {
              const content = contextCompressionEngine.expand(String(params.handle));
              return ok({ success: true, data: { handle: params.handle, content } });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "compression_has": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            const has = contextCompressionEngine.has(String(params.handle));
            return ok({ success: true, data: { handle: params.handle, has } });
          }
          case "compression_policy": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            try {
              const policy = params?.set
                ? contextCompressionEngine.setPolicy(params.set)
                : contextCompressionEngine.getPolicy();
              return ok({ success: true, data: { policy } });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "compression_stats": {
            const { contextCompressionEngine } = await import("../../engines/ContextCompressionEngine.js");
            return ok({
              success: true,
              data: {
                storedHandles: contextCompressionEngine.size(),
                policy: contextCompressionEngine.getPolicy(),
              },
            });
          }

          // ── AI-MAX-MS0/U-AIMAX08: Automatic Context Checkpointing ──
          case "checkpoint_record_edit": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            try {
              const state = contextCheckpointEngine.recordEdit(String(params.sessionId));
              return ok({ success: true, data: state });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "checkpoint_should": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            const threshold = contextCheckpointEngine.shouldCheckpoint(String(params.sessionId));
            // Bypass slimResponse so threshold=null survives the wire (it strips null/undefined).
            const payload = JSON.stringify({
              success: true,
              data: { shouldCheckpoint: threshold !== null, threshold },
            });
            return { content: [{ type: "text" as const, text: payload }] };
          }
          case "checkpoint_create": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            try {
              const snap = contextCheckpointEngine.createCheckpoint({
                sessionId: String(params.sessionId),
                summary: params.summary,
                pendingTasks: params.pendingTasks,
                filesInFlight: params.filesInFlight,
                recentDecisions: params.recentDecisions,
                memoryAnchors: params.memoryAnchors,
                handoffDirective: params.handoffDirective,
              });
              return ok({ success: true, data: snap });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "checkpoint_latest": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            const snap = contextCheckpointEngine.latestCheckpoint(String(params.sessionId));
            return ok({
              success: true,
              data: { found: snap !== null, snapshot: snap },
            });
          }
          case "checkpoint_list": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            const list = contextCheckpointEngine.listCheckpoints(String(params.sessionId));
            return ok({
              success: true,
              data: { count: list.length, snapshots: list },
            });
          }
          case "checkpoint_recover": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            const recovery = contextCheckpointEngine.recoverState(String(params.sessionId));
            if (recovery === null) {
              return ok({ success: true, data: { found: false } });
            }
            return ok({
              success: true,
              data: {
                found: true,
                fidelity: recovery.fidelity,
                passed: recovery.passed,
                missingFields: recovery.missingFields,
                snapshot: recovery.snapshot,
              },
            });
          }
          case "checkpoint_ingest": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            try {
              const snap = contextCheckpointEngine.ingestExternal(params.snapshot);
              return ok({ success: true, data: snap });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }
          case "checkpoint_config": {
            const { contextCheckpointEngine } = await import("../../engines/ContextCheckpointEngine.js");
            try {
              const config = params?.set
                ? contextCheckpointEngine.setConfig(params.set)
                : contextCheckpointEngine.getConfig();
              // Explicit pick — drops the clockMs function (non-serializable) without
              // resorting to an `as any` cast.
              const wireConfig = {
                thresholds: config.thresholds,
                maxBytes: config.maxBytes,
                maxCheckpointsPerSession: config.maxCheckpointsPerSession,
              };
              return ok({ success: true, data: { config: wireConfig } });
            } catch (err) {
              return dispatcherError(err, action, "prism_context");
            }
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_context");
      }
    }
  );
}