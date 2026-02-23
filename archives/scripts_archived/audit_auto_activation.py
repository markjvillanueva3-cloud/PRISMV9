# -*- coding: utf-8 -*-
"""
COMPREHENSIVE MCP SERVER AUTO-ACTIVATION AUDIT
Scans all tools and categorizes by auto-fire requirement
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Categories and their auto-fire requirements
TOOL_CATEGORIES = {
    # SAFETY CRITICAL - Should auto-fire on relevant operations
    "safety_critical": {
        "collision": ["check_toolpath_collision", "validate_rapid_moves", "check_fixture_clearance", 
                     "calculate_safe_approach", "detect_near_miss", "generate_collision_report",
                     "validate_tool_clearance", "check_5axis_head_clearance"],
        "spindle": ["check_spindle_torque", "check_spindle_power", "validate_spindle_speed",
                   "monitor_spindle_thermal", "get_spindle_safe_envelope"],
        "tool_breakage": ["predict_tool_breakage", "calculate_tool_stress", "check_chip_load_limits",
                         "estimate_tool_fatigue", "get_safe_cutting_limits"],
        "workholding": ["calculate_clamp_force_required", "validate_workholding_setup", 
                       "check_pullout_resistance", "analyze_liftoff_moment", 
                       "calculate_part_deflection", "validate_vacuum_fixture"],
        "coolant": ["validate_coolant_flow", "check_through_spindle_coolant", 
                   "calculate_chip_evacuation", "validate_mql_parameters", "get_coolant_recommendations"]
    },
    
    # VALIDATION - Should auto-fire before data persistence
    "validation": {
        "material": ["validate_material", "validate_kienzle", "validate_taylor", 
                    "validate_johnson_cook", "validate_safety", "validate_completeness"],
        "anti_regression": ["validate_anti_regression"]
    },
    
    # SESSION LIFECYCLE - Should auto-fire at session boundaries
    "session_lifecycle": {
        "start": ["prism_session_start_full", "prism_quick_resume", "intel_budget_reset", 
                 "intel_budget_status", "dev_context_watch_start"],
        "end": ["prism_session_end_full", "intel_budget_report", "intel_review_stats",
               "auto_hooks_session_end", "dev_context_watch_stop"],
        "periodic": ["prism_auto_checkpoint", "prism_context_pressure", "dev_context_sync",
                    "dev_checkpoint_auto"]
    },
    
    # CONTEXT MANAGEMENT - Should auto-fire based on context pressure
    "context_management": {
        "monitor": ["prism_context_pressure", "prism_context_size"],
        "compress": ["prism_context_compress"],
        "recovery": ["prism_compaction_detect", "prism_session_recover", "prism_state_reconstruct"]
    },
    
    # CODE QUALITY - Should auto-fire on code write
    "code_quality": {
        "review": ["intel_review_cascade", "dev_code_change_risk"],
        "analysis": ["intel_ast_complexity", "intel_entropy_quick", "dev_code_impact"],
        "indexing": ["dev_semantic_index"]
    },
    
    # ERROR HANDLING - Should auto-fire on failures
    "error_handling": {
        "reflection": ["intel_hook_on_failure", "intel_reflection_run"],
        "recovery": ["prism_error_preserve", "prism_error_patterns"]
    },
    
    # HOOKS - Manual management tools
    "hook_management": {
        "control": ["prism_hook_fire", "prism_hook_enable", "prism_hook_disable"],
        "monitoring": ["prism_hook_status", "prism_hook_history", "prism_hook_coverage",
                      "prism_hook_gaps", "prism_hook_performance", "prism_hook_failures"],
        "chain": ["prism_hook_chain_v2"]
    },
    
    # CALCULATIONS - On-demand, no auto-fire needed
    "calculations": {
        "cutting": ["calc_cutting_force", "calc_tool_life", "calc_flow_stress", 
                   "calc_surface_finish", "calc_mrr", "calc_speed_feed"],
        "toolpath": ["calc_engagement", "calc_trochoidal", "calc_hsm", "calc_scallop",
                    "calc_stepover", "calc_cycle_time", "calc_arc_fit"],
        "optimization": ["calc_power", "calc_chip_load", "calc_stability", "calc_deflection",
                        "calc_thermal", "calc_cost_optimize", "calc_multi_optimize", "calc_productivity"]
    },
    
    # DATA ACCESS - On-demand queries
    "data_access": {
        "materials": ["material_get", "material_search", "material_compare"],
        "machines": ["machine_get", "machine_search", "machine_capabilities"],
        "tools": ["tool_get", "tool_search", "tool_recommend"],
        "alarms": ["alarm_decode", "alarm_search", "alarm_fix"]
    },
    
    # ORCHESTRATION - Manual triggering
    "orchestration": {
        "autopilot": ["prism_autopilot", "prism_autopilot_quick", "prism_autopilot_v2"],
        "swarm": ["swarm_execute", "swarm_parallel", "swarm_consensus", "swarm_pipeline"],
        "agents": ["agent_execute", "agent_execute_parallel", "agent_execute_pipeline"]
    },
    
    # DEV TOOLS - Mix of auto and manual
    "dev_tools": {
        "tasks": ["dev_task_start", "dev_task_status", "dev_task_update", 
                 "dev_task_complete", "dev_task_list"],
        "checkpoints": ["dev_checkpoint_create", "dev_checkpoint_restore", 
                       "dev_checkpoint_list", "dev_checkpoint_diff", "dev_checkpoint_auto"],
        "semantic": ["dev_semantic_search", "dev_semantic_index", "dev_semantic_similar"],
        "context": ["dev_context_watch_start", "dev_context_watch_stop", 
                   "dev_context_sync", "dev_context_status"]
    }
}

# Auto-fire requirements
AUTO_FIRE_TRIGGERS = {
    # Session boundaries
    "session_start": [
        "prism_session_start_full", "prism_quick_resume", "intel_budget_reset", 
        "intel_budget_status", "dev_context_watch_start", "prism_gsd_core"
    ],
    "session_end": [
        "prism_session_end_full", "intel_budget_report", "intel_review_stats",
        "auto_hooks_session_end", "dev_context_watch_stop"
    ],
    
    # Code operations
    "code_write": [
        "intel_review_cascade", "intel_ast_complexity", "intel_entropy_quick",
        "dev_code_change_risk", "dev_semantic_index"
    ],
    
    # Error events
    "on_failure": [
        "intel_hook_on_failure", "prism_error_preserve"
    ],
    
    # Calculation events (before any calc)
    "before_calculation": [
        "validate_safety"  # Check S(x) >= 0.70
    ],
    
    # Data persistence events
    "before_file_write": [
        "validate_anti_regression"
    ],
    
    # Periodic (every N operations)
    "periodic_5_ops": [
        "prism_todo_update", "dev_checkpoint_create"
    ],
    "periodic_context_check": [
        "prism_context_pressure"
    ],
    
    # Safety-critical (before machining parameters are used)
    "before_machining": [
        "check_toolpath_collision", "validate_workholding_setup", 
        "predict_tool_breakage", "get_spindle_safe_envelope",
        "validate_coolant_flow"
    ]
}

# Currently implemented auto-fire
CURRENTLY_AUTO = {
    "intel_budget_reset": "session_start",
    "intel_budget_status": "session_start", 
    "intel_review_cascade": "code_write",
    "intel_ast_complexity": "code_write",
    "intel_entropy_quick": "code_write",
    "intel_hook_on_failure": "on_failure"
}

def generate_audit():
    """Generate comprehensive audit report"""
    
    report = []
    report.append("# COMPREHENSIVE MCP SERVER AUTO-ACTIVATION AUDIT")
    report.append("=" * 60)
    report.append("")
    report.append("## EXECUTIVE SUMMARY")
    report.append("")
    
    total_should_auto = 0
    total_currently_auto = len(CURRENTLY_AUTO)
    
    for trigger, tools in AUTO_FIRE_TRIGGERS.items():
        total_should_auto += len(tools)
    
    report.append(f"| Metric | Count |")
    report.append(f"|--------|-------|")
    report.append(f"| Tools that SHOULD auto-fire | {total_should_auto} |")
    report.append(f"| Tools currently auto-firing | {total_currently_auto} |")
    report.append(f"| GAP | {total_should_auto - total_currently_auto} |")
    report.append(f"| Auto-activation rate | {total_currently_auto/total_should_auto*100:.0f}% |")
    report.append("")
    
    report.append("## CURRENTLY AUTO-FIRING (6 tools)")
    report.append("")
    report.append("| Tool | Trigger | Status |")
    report.append("|------|---------|--------|")
    for tool, trigger in CURRENTLY_AUTO.items():
        report.append(f"| {tool} | {trigger} | [ACTIVE] |")
    report.append("")
    
    report.append("## SHOULD BE AUTO-FIRING (Gap Analysis)")
    report.append("")
    
    for trigger, tools in AUTO_FIRE_TRIGGERS.items():
        report.append(f"### Trigger: `{trigger}`")
        report.append("")
        report.append("| Tool | Currently Auto? | Priority |")
        report.append("|------|-----------------|----------|")
        
        for tool in tools:
            is_auto = "YES" if tool in CURRENTLY_AUTO else "NO"
            priority = "CRITICAL" if "safety" in trigger or "failure" in trigger else "HIGH" if "session" in trigger else "MEDIUM"
            report.append(f"| {tool} | {is_auto} | {priority} |")
        report.append("")
    
    report.append("## SAFETY-CRITICAL TOOLS (NOT Auto-Firing)")
    report.append("")
    report.append("These tools protect against injury/death and should fire automatically:")
    report.append("")
    
    safety_tools = []
    for cat, subcats in TOOL_CATEGORIES["safety_critical"].items():
        for tool in subcats:
            if tool not in CURRENTLY_AUTO:
                safety_tools.append((cat, tool))
    
    report.append("| Category | Tool | Recommended Trigger |")
    report.append("|----------|------|---------------------|")
    for cat, tool in safety_tools:
        report.append(f"| {cat} | {tool} | before_machining |")
    report.append("")
    
    report.append("## RECOMMENDED IMPLEMENTATION ORDER")
    report.append("")
    report.append("### Phase 1: Session Lifecycle (Immediate - 30 min)")
    report.append("```")
    report.append("1. intel_budget_report      -> session_end")
    report.append("2. intel_review_stats       -> session_end")
    report.append("3. dev_context_watch_start  -> session_start")
    report.append("4. dev_context_watch_stop   -> session_end")
    report.append("5. prism_gsd_core           -> session_start (first tool call)")
    report.append("```")
    report.append("")
    
    report.append("### Phase 2: Periodic Operations (30 min)")
    report.append("```")
    report.append("1. prism_todo_update        -> every 5 tool calls")
    report.append("2. dev_checkpoint_create    -> every 10 tool calls")
    report.append("3. prism_context_pressure   -> every 20 tool calls")
    report.append("```")
    report.append("")
    
    report.append("### Phase 3: Code Quality (30 min)")
    report.append("```")
    report.append("1. dev_code_change_risk     -> code_write")
    report.append("2. dev_semantic_index       -> file_write")
    report.append("```")
    report.append("")
    
    report.append("### Phase 4: Safety Critical (1 hour)")
    report.append("```")
    report.append("1. validate_anti_regression -> before_file_replace")
    report.append("2. validate_safety          -> before_calculation")
    report.append("3. Safety tools integrated  -> before_machining_output")
    report.append("```")
    report.append("")
    
    report.append("## IMPLEMENTATION ARCHITECTURE")
    report.append("")
    report.append("```")
    report.append("+------------------------------------------------------------+")
    report.append("|                    AUTO-HOOK SYSTEM                        |")
    report.append("+------------------------------------------------------------+")
    report.append("|  TRIGGER          |  FIRES                                 |")
    report.append("+-------------------+----------------------------------------+")
    report.append("|  First tool call  |  gsd_core, budget_reset, context_watch |")
    report.append("|  Code write       |  review_cascade, ast, entropy, risk    |")
    report.append("|  File replace     |  anti_regression                       |")
    report.append("|  Any exception    |  hook_on_failure, error_preserve       |")
    report.append("|  Every 5 calls    |  todo_update                           |")
    report.append("|  Every 10 calls   |  checkpoint_create                     |")
    report.append("|  Every 20 calls   |  context_pressure                      |")
    report.append("|  Session end      |  budget_report, review_stats, stop     |")
    report.append("|  Before calc      |  validate_safety (S(x) >= 0.70)        |")
    report.append("|  Before machining |  collision, spindle, breakage checks   |")
    report.append("+-------------------+----------------------------------------+")
    report.append("```")
    report.append("")
    
    report.append("## TOTAL EFFORT ESTIMATE")
    report.append("")
    report.append("| Phase | Tools | Effort | Impact |")
    report.append("|-------|-------|--------|--------|")
    report.append("| 1. Session Lifecycle | 5 | 30 min | HIGH |")
    report.append("| 2. Periodic Ops | 3 | 30 min | HIGH |")
    report.append("| 3. Code Quality | 2 | 30 min | MEDIUM |")
    report.append("| 4. Safety Critical | 3+ | 1 hour | CRITICAL |")
    report.append("| **TOTAL** | **13+** | **2.5 hours** | **CRITICAL** |")
    report.append("")
    
    return "\n".join(report)

if __name__ == "__main__":
    report = generate_audit()
    
    # Save report
    output_path = Path("C:/PRISM/docs/COMPREHENSIVE_AUTO_AUDIT.md")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding='utf-8')
    print(f"Saved to: {output_path}")
