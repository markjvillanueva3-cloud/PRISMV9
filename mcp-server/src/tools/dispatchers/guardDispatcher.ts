import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { hookExecutor, type HookContext } from "../../engines/HookExecutor.js";
import { getHookHistory, getDispatchCount } from "../autoHookWrapper.js";
import { PATHS } from "../../constants.js";
import type { HookExecution } from "../../types/prism-schema.js";

const ACTIONS = ["decision_log", "failure_library", "error_capture", "pre_write_gate", "pre_write_diff", "pre_call_validate", "autohook_status", "autohook_test",
  // D3: Learning & Pattern Detection — Python module wiring
  "pattern_scan", "pattern_history", "learning_query", "learning_save", "lkg_status", "priority_score"
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// State and constants
const STATE_DIR = PATHS.STATE_DIR;
const DECISIONS_DIR = path.join(STATE_DIR, "decisions");
const ERROR_LOG_PATH = path.join(STATE_DIR, "error_log.jsonl");
const FAILURE_PATTERNS_PATH = path.join(STATE_DIR, "failure_patterns.jsonl");

const approvedPlans = new Map<string, { plan: string; lines: number; approved_at: string; expires_at: string }>();
const filesReadThisSession = new Set<string>();

// D3: Python module wiring
const SCRIPTS_DIR = PATHS.SCRIPTS_CORE;
const PYTHON = PATHS.PYTHON;

function runPythonScript(scriptName: string, args: string[] = []): string {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) return JSON.stringify({ error: `Script not found: ${scriptPath}` });
  try {
    return execSync(`"${PYTHON}" "${scriptPath}" ${args.join(' ')}`, {
      encoding: 'utf-8', timeout: 30000, cwd: SCRIPTS_DIR
    }).trim();
  } catch (error: any) {
    return JSON.stringify({ error: error.message?.slice(0, 200) || "Script execution failed" });
  }
}

const KNOWN_RENAMES: Record<string, string> = {
  // === COLLISION RENAMES (v2 suffix) ===
  "skill_stats": "prism:prism_skill_script action=skill_stats_v2",
  "script_search": "prism:prism_skill_script action=script_search_v2",
  "script_execute": "prism:prism_skill_script action=script_execute_v2",
  "skill_search": "prism:prism_skill_script action=skill_search_v2",

  // === DATA DISPATCHER (prism:prism_data) ===
  "material_get": "prism:prism_data action=material_get",
  "material_search": "prism:prism_data action=material_search",
  "material_compare": "prism:prism_data action=material_compare",
  "machine_get": "prism:prism_data action=machine_get",
  "machine_search": "prism:prism_data action=machine_search",
  "machine_capabilities": "prism:prism_data action=machine_capabilities",
  "tool_get": "prism:prism_data action=tool_get",
  "tool_search": "prism:prism_data action=tool_search",
  "tool_recommend": "prism:prism_data action=tool_recommend",
  "tool_facets": "prism:prism_data action=tool_facets",
  "alarm_decode": "prism:prism_data action=alarm_decode",
  "alarm_search": "prism:prism_data action=alarm_search",
  "alarm_fix": "prism:prism_data action=alarm_fix",
  "formula_get": "prism:prism_data action=formula_get",
  "formula_calculate": "prism:prism_data action=formula_calculate",

  // === CALC DISPATCHER (prism:prism_calc) ===
  "calc_cutting_force": "prism:prism_calc action=cutting_force",
  "calc_tool_life": "prism:prism_calc action=tool_life",
  "calc_speed_feed": "prism:prism_calc action=speed_feed",
  "calc_flow_stress": "prism:prism_calc action=flow_stress",
  "calc_surface_finish": "prism:prism_calc action=surface_finish",
  "calc_mrr": "prism:prism_calc action=mrr",
  "calc_power": "prism:prism_calc action=power",
  "calc_chip_load": "prism:prism_calc action=chip_load",
  "calc_stability": "prism:prism_calc action=stability",
  "calc_deflection": "prism:prism_calc action=deflection",
  "calc_thermal": "prism:prism_calc action=thermal",
  "calc_cost_optimize": "prism:prism_calc action=cost_optimize",
  "calc_multi_optimize": "prism:prism_calc action=multi_optimize",
  "calc_productivity": "prism:prism_calc action=productivity",
  "calc_engagement": "prism:prism_calc action=engagement",
  "calc_trochoidal": "prism:prism_calc action=trochoidal",
  "calc_hsm": "prism:prism_calc action=hsm",
  "calc_scallop": "prism:prism_calc action=scallop",
  "calc_stepover": "prism:prism_calc action=stepover",
  "calc_cycle_time": "prism:prism_calc action=cycle_time",
  "calc_arc_fit": "prism:prism_calc action=arc_fit",

  // === SAFETY DISPATCHER (prism:prism_safety) ===
  "check_toolpath_collision": "prism:prism_safety action=check_toolpath_collision",
  "validate_rapid_moves": "prism:prism_safety action=validate_rapid_moves",
  "check_fixture_clearance": "prism:prism_safety action=check_fixture_clearance",
  "calculate_safe_approach": "prism:prism_safety action=calculate_safe_approach",
  "detect_near_miss": "prism:prism_safety action=detect_near_miss",
  "generate_collision_report": "prism:prism_safety action=generate_collision_report",
  "validate_tool_clearance": "prism:prism_safety action=validate_tool_clearance",
  "check_5axis_head_clearance": "prism:prism_safety action=check_5axis_head_clearance",
  "validate_coolant_flow": "prism:prism_safety action=validate_coolant_flow",
  "check_through_spindle_coolant": "prism:prism_safety action=check_through_spindle_coolant",
  "calculate_chip_evacuation": "prism:prism_safety action=calculate_chip_evacuation",
  "validate_mql_parameters": "prism:prism_safety action=validate_mql_parameters",
  "get_coolant_recommendations": "prism:prism_safety action=get_coolant_recommendations",
  "check_spindle_torque": "prism:prism_safety action=check_spindle_torque",
  "check_spindle_power": "prism:prism_safety action=check_spindle_power",
  "validate_spindle_speed": "prism:prism_safety action=validate_spindle_speed",
  "monitor_spindle_thermal": "prism:prism_safety action=monitor_spindle_thermal",
  "get_spindle_safe_envelope": "prism:prism_safety action=get_spindle_safe_envelope",
  "predict_tool_breakage": "prism:prism_safety action=predict_tool_breakage",
  "calculate_tool_stress": "prism:prism_safety action=calculate_tool_stress",
  "check_chip_load_limits": "prism:prism_safety action=check_chip_load_limits",
  "estimate_tool_fatigue": "prism:prism_safety action=estimate_tool_fatigue",
  "get_safe_cutting_limits": "prism:prism_safety action=get_safe_cutting_limits",
  "calculate_clamp_force_required": "prism:prism_safety action=calculate_clamp_force_required",
  "validate_workholding_setup": "prism:prism_safety action=validate_workholding_setup",
  "check_pullout_resistance": "prism:prism_safety action=check_pullout_resistance",
  "analyze_liftoff_moment": "prism:prism_safety action=analyze_liftoff_moment",
  "calculate_part_deflection": "prism:prism_safety action=calculate_part_deflection",
  "validate_vacuum_fixture": "prism:prism_safety action=validate_vacuum_fixture",

  // === THREAD DISPATCHER (prism:prism_thread) ===
  "calculate_tap_drill": "prism:prism_thread action=calculate_tap_drill",
  "calculate_thread_mill_params": "prism:prism_thread action=calculate_thread_mill_params",
  "calculate_thread_depth": "prism:prism_thread action=calculate_thread_depth",
  "calculate_engagement_percent": "prism:prism_thread action=calculate_engagement_percent",
  "get_thread_specifications": "prism:prism_thread action=get_thread_specifications",
  "get_go_nogo_gauges": "prism:prism_thread action=get_go_nogo_gauges",
  "calculate_pitch_diameter": "prism:prism_thread action=calculate_pitch_diameter",
  "calculate_minor_major_diameter": "prism:prism_thread action=calculate_minor_major_diameter",
  "select_thread_insert": "prism:prism_thread action=select_thread_insert",
  "calculate_thread_cutting_params": "prism:prism_thread action=calculate_thread_cutting_params",
  "validate_thread_fit_class": "prism:prism_thread action=validate_thread_fit_class",
  "generate_thread_gcode": "prism:prism_thread action=generate_thread_gcode",

  // === VALIDATE DISPATCHER (prism:prism_validate) ===
  "validate_material": "prism:prism_validate action=material",
  "validate_kienzle": "prism:prism_validate action=kienzle",
  "validate_taylor": "prism:prism_validate action=taylor",
  "validate_johnson_cook": "prism:prism_validate action=johnson_cook",
  "validate_safety": "prism:prism_validate action=safety",
  "validate_completeness": "prism:prism_validate action=completeness",
  "validate_anti_regression": "prism:prism_validate action=anti_regression",

  // === OMEGA DISPATCHER (prism:prism_omega) ===
  "omega_compute": "prism:prism_omega action=compute",
  "omega_breakdown": "prism:prism_omega action=breakdown",
  "omega_validate": "prism:prism_omega action=validate",
  "omega_optimize": "prism:prism_omega action=optimize",
  "omega_history": "prism:prism_omega action=history",

  // === RALPH DISPATCHER (prism:prism_ralph) ===
  "prism_ralph_loop": "prism:prism_ralph action=loop",
  "prism_ralph_scrutinize": "prism:prism_ralph action=scrutinize",
  "prism_ralph_assess": "prism:prism_ralph action=assess",

  // === SESSION DISPATCHER (prism:prism_session) ===
  "prism_state_load": "prism:prism_session action=state_load",
  "prism_state_save": "prism:prism_session action=state_save",
  "prism_state_checkpoint": "prism:prism_session action=state_checkpoint",
  "prism_state_diff": "prism:prism_session action=state_diff",
  "prism_handoff_prepare": "prism:prism_session action=handoff_prepare",
  "prism_resume_session": "prism:prism_session action=resume_session",
  "prism_memory_save": "prism:prism_session action=memory_save",
  "prism_memory_recall": "prism:prism_session action=memory_recall",
  "prism_context_pressure": "prism:prism_session action=context_pressure",
  "prism_context_size": "prism:prism_session action=context_size",
  "prism_context_compress": "prism:prism_session action=context_compress",
  "prism_context_expand": "prism:prism_session action=context_expand",
  "prism_compaction_detect": "prism:prism_session action=compaction_detect",
  "prism_transcript_read": "prism:prism_session action=transcript_read",
  "prism_state_reconstruct": "prism:prism_session action=state_reconstruct",
  "prism_auto_checkpoint": "prism:prism_session action=auto_checkpoint",

  // === CONTEXT DISPATCHER (prism:prism_context) ===
  "prism_todo_update": "prism:prism_context action=todo_update",
  "prism_todo_read": "prism:prism_context action=todo_read",
  "prism_memory_externalize": "prism:prism_context action=memory_externalize",
  "prism_memory_restore": "prism:prism_context action=memory_restore",
  "prism_error_preserve": "prism:prism_context action=error_preserve",
  "prism_error_patterns": "prism:prism_context action=error_patterns",

  // === DOC DISPATCHER (prism:prism_doc) ===
  "prism_doc_list": "prism:prism_doc action=list",
  "prism_doc_read": "prism:prism_doc action=read",
  "prism_doc_write": "prism:prism_doc action=write",
  "prism_doc_append": "prism:prism_doc action=append",
  "prism_doc_migrate": "prism:prism_doc action=migrate",
  "prism_roadmap_status": "prism:prism_doc action=roadmap_status",
  "prism_action_tracker": "prism:prism_doc action=action_tracker",

  // === DEV DISPATCHER (prism:prism_dev) ===
  "prism_build": "prism:prism_dev action=build",
  "prism_session_boot": "prism:prism_dev action=session_boot",
  "prism_code_template": "prism:prism_dev action=code_template",
  "prism_code_search": "prism:prism_dev action=code_search",
  "prism_file_read": "prism:prism_dev action=file_read",
  "prism_file_write": "prism:prism_dev action=file_write",
  "prism_server_info": "prism:prism_dev action=server_info",

  // === SP DISPATCHER (prism:prism_sp) ===
  "prism_sp_brainstorm": "prism:prism_sp action=brainstorm",
  "prism_sp_plan": "prism:prism_sp action=plan",
  "prism_sp_execute": "prism:prism_sp action=execute",
  "prism_sp_review_spec": "prism:prism_sp action=review_spec",
  "prism_sp_review_quality": "prism:prism_sp action=review_quality",
  "prism_sp_debug": "prism:prism_sp action=debug",
  "prism_evidence_level": "prism:prism_sp action=evidence_level",
  "prism_validate_gates_full": "prism:prism_sp action=validate_gates_full",

  // === GUARD DISPATCHER (prism:prism_guard) ===
  "prism_decision_log": "prism:prism_guard action=decision_log",
  "prism_failure_library": "prism:prism_guard action=failure_library",
  "prism_error_capture": "prism:prism_guard action=error_capture",
  "prism_pre_write_gate": "prism:prism_guard action=pre_write_gate",
  "prism_pre_write_diff": "prism:prism_guard action=pre_write_diff",
  "prism_pre_call_validate": "prism:prism_guard action=pre_call_validate",
  "prism_autohook_status": "prism:prism_guard action=autohook_status",
  "prism_autohook_test": "prism:prism_guard action=autohook_test",

  // === AUTOPILOT DISPATCHER (prism:prism_autopilot_d) ===
  "autopilot": "prism:prism_autopilot_d action=autopilot",
  "prism_autopilot_v2": "prism:prism_autopilot_d action=autopilot_v2",
  "prism_autopilot_quick": "prism:prism_autopilot_d action=autopilot_quick",
  "prism_brainstorm_lenses": "prism:prism_autopilot_d action=brainstorm_lenses",
  "prism_formula_optimize": "prism:prism_autopilot_d action=formula_optimize",
  "ralph_loop_lite": "prism:prism_autopilot_d action=ralph_loop_lite",
  "prism_working_tools": "prism:prism_autopilot_d action=working_tools",
  "prism_registry_status": "prism:prism_autopilot_d action=registry_status",

  // === HOOK DISPATCHER (prism:prism_hook) ===
  "hook_list": "prism:prism_hook action=list",
  "hook_get": "prism:prism_hook action=get",
  "hook_fire": "prism:prism_hook action=fire",
  "hook_execute": "prism:prism_hook action=execute",
  "hook_chain": "prism:prism_hook action=chain",
  "hook_toggle": "prism:prism_hook action=toggle",
  "event_emit": "prism:prism_hook action=emit",
  "event_list": "prism:prism_hook action=event_list",
  "event_history": "prism:prism_hook action=event_history",

  // === SKILL/SCRIPT DISPATCHER (prism:prism_skill_script) ===
  "skill_list": "prism:prism_skill_script action=skill_list",
  "skill_get": "prism:prism_skill_script action=skill_get",
  "skill_find_for_task": "prism:prism_skill_script action=skill_find_for_task",
  "skill_content": "prism:prism_skill_script action=skill_content",
  "skill_load": "prism:prism_skill_script action=skill_load",
  "skill_recommend": "prism:prism_skill_script action=skill_recommend",
  "script_list": "prism:prism_skill_script action=script_list",
  "script_get": "prism:prism_skill_script action=script_get",
  "script_command": "prism:prism_skill_script action=script_command",
  "script_recommend": "prism:prism_skill_script action=script_recommend",

  // === KNOWLEDGE DISPATCHER (prism:prism_knowledge) ===
  "knowledge_search": "prism:prism_knowledge action=search",
  "knowledge_cross_query": "prism:prism_knowledge action=cross_query",
  "knowledge_formula": "prism:prism_knowledge action=formula",
  "knowledge_relations": "prism:prism_knowledge action=relations",
  "knowledge_stats": "prism:prism_knowledge action=stats",

  // === GSD DISPATCHER (prism:prism_gsd) ===
  "prism_gsd_core": "prism:prism_gsd action=core",
  "prism_gsd_quick": "prism:prism_gsd action=quick",
  "prism_gsd_get": "prism:prism_gsd action=get",
  "prism_dev_protocol": "prism:prism_gsd action=dev_protocol",

  // === TOOLPATH DISPATCHER (prism:prism_toolpath) ===
  "prism_toolpath_select": "prism:prism_toolpath action=strategy_select",
  "prism_toolpath_params": "prism:prism_toolpath action=params_calculate",
  "prism_toolpath_search": "prism:prism_toolpath action=strategy_search",

  // === ORCHESTRATE DISPATCHER (prism:prism_orchestrate) ===
  "agent_execute": "prism:prism_orchestrate action=agent_execute",
  "agent_execute_parallel": "prism:prism_orchestrate action=agent_parallel",
  "agent_execute_pipeline": "prism:prism_orchestrate action=agent_pipeline",
  "swarm_execute": "prism:prism_orchestrate action=swarm_execute",
  "swarm_parallel": "prism:prism_orchestrate action=swarm_parallel",
  "swarm_consensus": "prism:prism_orchestrate action=swarm_consensus",

  // === MANUS DISPATCHER (prism:prism_manus) ===
  "prism_manus_create_task": "prism:prism_manus action=create_task",
  "prism_manus_web_research": "prism:prism_manus action=web_research",
  "prism_manus_code_sandbox": "prism:prism_manus action=code_sandbox",

  // === GENERATOR DISPATCHER (prism:prism_generator) ===
  "prism_hook_generate": "prism:prism_generator action=generate",
  "prism_hook_generate_batch": "prism:prism_generator action=generate_batch",
  "prism_hook_validate": "prism:prism_generator action=validate",

  // === ATCS DISPATCHER (prism:prism_atcs) ===
  "atcs_task_init": "prism:prism_atcs action=task_init",
  "atcs_task_resume": "prism:prism_atcs action=task_resume",
  "atcs_task_status": "prism:prism_atcs action=task_status",
  "atcs_queue_next": "prism:prism_atcs action=queue_next",
  "atcs_unit_complete": "prism:prism_atcs action=unit_complete",
  "atcs_batch_validate": "prism:prism_atcs action=batch_validate",
  "atcs_checkpoint": "prism:prism_atcs action=checkpoint",
  "atcs_replan": "prism:prism_atcs action=replan",
  "atcs_assemble": "prism:prism_atcs action=assemble",
  "atcs_stub_scan": "prism:prism_atcs action=stub_scan",
};

// HookExecution — imported from prism-schema

const hookHistory: HookExecution[] = [];

function ensureDirs(): void {
  if (!fs.existsSync(DECISIONS_DIR)) {
    fs.mkdirSync(DECISIONS_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function appendJsonl(filePath: string, record: any): void {
  ensureDirs();
  fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf-8");
}

function readJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n").filter(Boolean);
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean) as T[];
}

async function fireHook(hookId: string, data: Record<string, any>): Promise<any> {
  const startTime = Date.now();
  try {
    const hookContext: Partial<HookContext> = {
      operation: data.tool_name || 'unknown',
      phase: 'before' as any,
      timestamp: new Date(),
      target: { type: 'calculation', data: data },
      metadata: { hookId, ...data },
    };
    
    const executorResult = await hookExecutor.execute('before' as any, hookContext).catch(() => null);
    
    const result = {
      hook_id: hookId,
      success: true,
      data: { logged: true, executorFired: !!executorResult, ...data },
      duration_ms: Date.now() - startTime,
    };

    hookHistory.unshift({
      timestamp: new Date().toISOString(),
      hook_id: hookId,
      tool_name: data.tool_name || 'unknown',
      event: data.event || 'auto_fire',
      success: true,
      duration_ms: result.duration_ms,
      data: result.data,
    });

    if (hookHistory.length > 1000) hookHistory.pop();
    return result;
  } catch (error) {
    return {
      hook_id: hookId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    };
  }
}

export function registerGuardDispatcher(server: any): void {
  server.tool(
    "prism_guard",
    `Reasoning + Enforcement + AutoHook diagnostics (8 actions). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_guard] ${action}`);
      try {
        switch (action) {
          case "decision_log": {
            const subAction = params.action;
            if (subAction === "record") {
              ensureDirs();
              const id = `DEC-${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;
              const decision = {
                id,
                decision: params.decision || "Unnamed decision",
                alternatives: params.alternatives || [],
                reasoning: params.reasoning || "",
                revisit_if: params.revisit_if || [],
                confidence: params.confidence ?? 0.8,
                domain: params.domain || "general",
                status: "active",
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                session: 0,
              };
              const filePath = path.join(DECISIONS_DIR, `${id}.json`);
              fs.writeFileSync(filePath, JSON.stringify(decision, null, 2), "utf-8");
              return ok({ action: "recorded", ...decision });
            } else if (subAction === "search") {
              ensureDirs();
              const results: any[] = [];
              const queryLower = (params.query || "").toLowerCase();
              try {
                const files = fs.readdirSync(DECISIONS_DIR).filter(f => f.endsWith(".json"));
                for (const file of files) {
                  const content = fs.readFileSync(path.join(DECISIONS_DIR, file), "utf-8");
                  const dec = JSON.parse(content);
                  const searchText = `${dec.decision} ${dec.reasoning} ${dec.alternatives.join(" ")} ${dec.domain}`.toLowerCase();
                  if (searchText.includes(queryLower)) {
                    results.push(dec);
                  }
                }
              } catch (e) { /* empty dir */ }
              return ok({ action: "search", query: params.query, count: results.length, decisions: results.slice(0, 10) });
            } else if (subAction === "list") {
              ensureDirs();
              const results: any[] = [];
              try {
                const files = fs.readdirSync(DECISIONS_DIR).filter(f => f.endsWith(".json"));
                for (const file of files.slice(-20)) {
                  const content = fs.readFileSync(path.join(DECISIONS_DIR, file), "utf-8");
                  results.push(JSON.parse(content));
                }
              } catch (e) { /* empty dir */ }
              return ok({ action: "list", count: results.length, decisions: results.sort((a, b) => b.created.localeCompare(a.created)) });
            }
            return ok({ error: "Invalid decision_log action", available: ["record", "search", "list"] });
          }

          case "failure_library": {
            const subAction = params.action;
            if (subAction === "record") {
              const patterns = readJsonl<any>(FAILURE_PATTERNS_PATH);
              const existing = patterns.find((p: any) => p.type === params.type && p.domain === (params.domain || "other"));
              if (existing) {
                existing.occurrences++;
                existing.last_seen = new Date().toISOString();
                if (params.root_cause && !existing.root_cause) existing.root_cause = params.root_cause;
                if (params.prevention && !existing.prevention) existing.prevention = params.prevention;
                const updated = patterns.map((p: any) => p.id === existing.id ? existing : p);
                fs.writeFileSync(FAILURE_PATTERNS_PATH, updated.map((p: any) => JSON.stringify(p)).join("\n") + "\n", "utf-8");
                return ok({ action: "recorded", pattern: existing });
              }
              const pattern = {
                id: `FAIL-${Date.now().toString(36)}`,
                type: params.type || "unknown",
                context: params.context || "",
                error: params.error || "",
                root_cause: params.root_cause || "",
                prevention: params.prevention || "",
                domain: params.domain || "other",
                severity: params.severity || "medium",
                occurrences: 1,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                sessions: [],
              };
              appendJsonl(FAILURE_PATTERNS_PATH, pattern);
              return ok({ action: "recorded", pattern });
            } else if (subAction === "check" || subAction === "search") {
              const patterns = readJsonl<any>(FAILURE_PATTERNS_PATH);
              const queryLower = (params.query || "").toLowerCase();
              const matches = patterns.filter((p: any) => {
                const text = `${p.type} ${p.context} ${p.error} ${p.root_cause} ${p.domain} ${p.prevention}`.toLowerCase();
                return text.includes(queryLower);
              });
              const warnings = matches.map((p: any) => `⚠️ [${p.severity.toUpperCase()}] "${p.type}" (${p.occurrences}x): ${p.prevention || p.root_cause || "No prevention recorded"}`);
              return ok({ action: subAction, query: params.query, warning_count: warnings.length, warnings, patterns: matches.slice(0, 5) });
            } else if (subAction === "stats") {
              const patterns = readJsonl<any>(FAILURE_PATTERNS_PATH);
              const by_domain: Record<string, number> = {};
              const by_severity: Record<string, number> = {};
              for (const p of patterns) {
                by_domain[p.domain] = (by_domain[p.domain] || 0) + 1;
                by_severity[p.severity] = (by_severity[p.severity] || 0) + 1;
              }
              const top_recurring = [...patterns].sort((a: any, b: any) => b.occurrences - a.occurrences).slice(0, 10);
              return ok({ action: "stats", total: patterns.length, by_domain, by_severity, top_recurring });
            }
            return ok({ error: "Invalid failure_library action", available: ["record", "check", "stats", "search"] });
          }

          case "error_capture": {
            ensureDirs();
            const entry = {
              id: `ERR-${Date.now().toString(36)}`,
              timestamp: new Date().toISOString(),
              error_message: params.error_message || "",
              tool_name: params.tool_name || "",
              error_type: params.error_type || "uncategorized",
              context: params.context || "",
              parameters: params.parameters || {},
              auto_fix_attempted: params.auto_fix_attempted || false,
              session: 0,
            };
            appendJsonl(ERROR_LOG_PATH, entry);
            
            const patterns = readJsonl<any>(FAILURE_PATTERNS_PATH);
            const matchingPattern = patterns.find((p: any) =>
              entry.error_message.toLowerCase().includes(p.type.toLowerCase()) ||
              p.type.toLowerCase().includes(entry.error_type)
            );

            if (matchingPattern) {
              matchingPattern.occurrences++;
              matchingPattern.last_seen = entry.timestamp;
              const updated = patterns.map((p: any) => p.id === matchingPattern.id ? matchingPattern : p);
              fs.writeFileSync(FAILURE_PATTERNS_PATH, updated.map((p: any) => JSON.stringify(p)).join("\n") + "\n", "utf-8");
            }
            
            const related = patterns.filter((p: any) => {
              const text = `${p.type} ${p.context} ${p.error} ${p.root_cause} ${p.domain} ${p.prevention}`.toLowerCase();
              return text.includes(entry.error_message.toLowerCase());
            });
            
            const warnings = related.map((p: any) => `⚠️ [${p.severity.toUpperCase()}] "${p.type}" (${p.occurrences}x): ${p.prevention || p.root_cause || "No prevention recorded"}`);
            
            return ok({
              captured: entry,
              matching_patterns: related.slice(0, 3),
              prevention_warnings: warnings.slice(0, 3),
            });
          }

          case "pre_write_gate": {
            const subAction = params.action;
            if (subAction === "approve") {
              if (!params.file_path || !params.plan) {
                return ok({ error: "file_path and plan required for approve" });
              }
              const now = new Date();
              const expires = new Date(now.getTime() + 30 * 60 * 1000);
              approvedPlans.set(params.file_path, {
                plan: params.plan,
                lines: params.line_count || 0,
                approved_at: now.toISOString(),
                expires_at: expires.toISOString(),
              });
              return ok({ status: "APPROVED", file: params.file_path, plan: params.plan, expires: expires.toISOString() });
            } else if (subAction === "check") {
              if (!params.file_path) {
                return ok({ error: "file_path required for check" });
              }
              const lineCount = params.line_count || 0;
              if (lineCount <= 50) {
                return ok({ status: "ALLOWED", reason: "≤50 lines, no approval needed", file: params.file_path, lines: lineCount });
              }
              const approval = approvedPlans.get(params.file_path);
              if (!approval) {
                return ok({ status: "BLOCKED", reason: `${lineCount} lines exceeds 50-line threshold. Call with action='approve' first.`, file: params.file_path, lines: lineCount });
              }
              if (new Date() > new Date(approval.expires_at)) {
                approvedPlans.delete(params.file_path);
                return ok({ status: "BLOCKED", reason: "Approval expired. Re-approve the plan.", file: params.file_path });
              }
              return ok({ status: "ALLOWED", reason: "Approved plan exists", file: params.file_path, plan: approval.plan, approved_at: approval.approved_at });
            } else if (subAction === "status") {
              const entries = Array.from(approvedPlans.entries()).map(([path, a]) => ({ path, ...a }));
              return ok({ active_approvals: entries.length, approvals: entries });
            }
            return ok({ error: "Invalid pre_write_gate action", available: ["approve", "check", "status"] });
          }

          case "pre_write_diff": {
            const subAction = params.action;
            const normalized = (params.file_path || "").replace(/\\/g, "/").toLowerCase();
            if (subAction === "register_read") {
              filesReadThisSession.add(normalized);
              return ok({ status: "REGISTERED", file: params.file_path, total_reads: filesReadThisSession.size });
            } else if (subAction === "check_write") {
              const wasRead = filesReadThisSession.has(normalized);
              if (wasRead) {
                return ok({ status: "ALLOWED", file: params.file_path, reason: "File was read this session before writing" });
              }
              return ok({ 
                status: "BLOCKED", 
                file: params.file_path, 
                reason: "File was NOT read this session. Read it first with DC:read_file or prism_file_read before editing.",
                files_read: Array.from(filesReadThisSession).slice(0, 20)
              });
            } else if (subAction === "status") {
              return ok({ files_read_count: filesReadThisSession.size, files_read: Array.from(filesReadThisSession) });
            }
            return ok({ error: "Invalid pre_write_diff action", available: ["register_read", "check_write", "status"] });
          }

          case "pre_call_validate": {
            const toolName = params.tool_name;
            if (!toolName) {
              return ok({ error: "tool_name required" });
            }
            const renames = { ...KNOWN_RENAMES, ...(params.known_renames || {}) };
            if (renames[toolName]) {
              return ok({
                status: "RENAMED",
                original: toolName,
                correct_name: renames[toolName],
                message: `"${toolName}" was renamed to "${renames[toolName]}". Use the new name.`
              });
            }
            return ok({
              status: "NOT_IN_RENAME_MAP",
              tool_name: toolName,
              message: "Tool not found in rename map. Likely valid — call prism_working_tools to verify if unsure.",
              known_renames: Object.keys(renames),
            });
          }

          case "autohook_status": {
            const limit = params.last_n ?? 20;
            // Read from autoHookWrapper's shared history (where universal hooks log)
            const universalHistory = getHookHistory(limit);
            // Also include local guard dispatcher history
            const localHistory = hookHistory.slice(0, limit);
            const combined = [...universalHistory, ...localHistory]
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, limit);
            const allUniversal = getHookHistory(1000);
            return ok({
              enabled: true,
              global_dispatch_count: getDispatchCount(),
              execution_history: {
                total_logged: allUniversal.length + hookHistory.length,
                universal_count: allUniversal.length,
                local_count: hookHistory.length,
                showing: combined.length,
                executions: combined,
              },
              summary: {
                total: allUniversal.length + hookHistory.length,
                succeeded: [...allUniversal, ...hookHistory].filter(h => h.success).length,
                failed: [...allUniversal, ...hookHistory].filter(h => !h.success).length,
                unique_hooks: [...new Set([...allUniversal, ...hookHistory].map(h => h.hook_id))],
                unique_tools: [...new Set([...allUniversal, ...hookHistory].map(h => h.tool_name))],
              },
            });
          }

          case "autohook_test": {
            const testResult = await fireHook('AUTOHOOK-TEST-001', {
              tool_name: 'prism_autohook_test',
              event: 'test:ping',
              message: 'Auto-hook system test',
              timestamp: new Date().toISOString(),
            });
            return ok({
              test_result: testResult,
              history_count: hookHistory.length,
              system_active: true,
            });
          }

          // ================================================================
          // D3: LEARNING & PATTERN DETECTION — Wired Python modules
          // ================================================================

          case "pattern_scan": {
            const pyArgs = ["--detect"];
            if (params.content) {
              const tmpFile = path.join(STATE_DIR, `_pattern_tmp_${Date.now()}.txt`);
              fs.writeFileSync(tmpFile, typeof params.content === "string" ? params.content : JSON.stringify(params.content));
              pyArgs.push(tmpFile);
              const output = runPythonScript("pattern_detector.py", pyArgs);
              try { fs.unlinkSync(tmpFile); } catch {}
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            const output = runPythonScript("pattern_detector.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "pattern_history": {
            const output = runPythonScript("pattern_detector.py", ["--list"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "learning_query": {
            const topic = params.topic || params.query || "general";
            const output = runPythonScript("learning_store.py", ["--lookup", `"${topic}"`]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "learning_save": {
            const data = params.data || params.content || params.lesson;
            if (!data) return ok({ error: "Missing data/content/lesson parameter" });
            const tmpFile = path.join(STATE_DIR, `_learning_tmp_${Date.now()}.txt`);
            fs.writeFileSync(tmpFile, typeof data === 'string' ? data : JSON.stringify(data));
            const output = runPythonScript("learning_store.py", ["--learn-file", tmpFile]);
            try { fs.unlinkSync(tmpFile); } catch {}
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "lkg_status": {
            const sub = params.subcommand || "get";
            const pyArgs = [sub, "--json"];
            if (params.checkpoint) pyArgs.splice(1, 0, params.checkpoint);
            if (params.reason) pyArgs.push("--reason", `"${params.reason}"`);
            const output = runPythonScript("lkg_tracker.py", pyArgs);
            try {
              const parsed = JSON.parse(output);
              return ok(parsed !== null ? parsed : { status: "NO_LKG", message: "No last-known-good state recorded yet. Run lkg_status with subcommand='mark' after a successful build." });
            } catch { return ok({ raw: output }); }
          }

          case "priority_score": {
            const pyArgs: string[] = [];
            if (params.content) {
              const tmpFile = path.join(STATE_DIR, `_priority_tmp_${Date.now()}.txt`);
              fs.writeFileSync(tmpFile, typeof params.content === "string" ? params.content : JSON.stringify(params.content));
              pyArgs.push("--file", tmpFile);
              if (params.target && !isNaN(Number(params.target))) pyArgs.push("--target", String(params.target));
              const output = runPythonScript("priority_scorer.py", pyArgs);
              try { fs.unlinkSync(tmpFile); } catch {}
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            if (params.target && !isNaN(Number(params.target))) pyArgs.push("--target", String(params.target));
            const output = runPythonScript("priority_scorer.py", pyArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          default:
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}