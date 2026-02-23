# -*- coding: utf-8 -*-
"""
PARALLEL IMPLEMENTATION: Remaining 11 Auto-Hooks
Uses 5 parallel Claude instances to generate all remaining hooks
"""

import sys
sys.path.insert(0, r'C:\PRISM\mcp-server\src\tools\intelligence')

import importlib
import parallel_claude
importlib.reload(parallel_claude)
from parallel_claude import ParallelClaudeExecutor
from pathlib import Path
import json

print('='*70)
print('PARALLEL AUTO-HOOK IMPLEMENTATION - REMAINING 11 HOOKS')
print('='*70)

executor = ParallelClaudeExecutor(max_workers=5)

system = '''You are a PRISM Manufacturing Intelligence developer.
Write Python code for auto-hook implementations.
Return ONLY the Python code with proper imports, no markdown, no explanations.
Code must be production-ready with error handling and logging.
Use pathlib for paths. Include docstrings. Thread-safe where needed.'''

tasks = [
    # =========================================================================
    # MACHINING SAFETY HOOKS (5)
    # =========================================================================
    {
        'task_id': 'machining_collision',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_collision_hook.py that triggers collision checks before machining output.

Requirements:
1. should_check_collision(output_type: str, params: dict) -> bool:
   - Return True if output is G-code, toolpath, or NC program
   - Check for keywords: G0, G1, rapid, toolpath, nc_program
   
2. CollisionCheckTrigger class:
   - detect_machining_output(content: str) -> bool
   - get_check_params(content: str) -> dict (extract tool, workpiece info)
   - log_trigger(check_type: str, params: dict)

3. HOOKS_TO_FIRE = ['check_toolpath_collision', 'validate_rapid_moves']

Include: regex patterns for G-code detection, logging to C:/PRISM/logs/machining_hooks.log'''
    },
    {
        'task_id': 'machining_workholding',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_workholding_hook.py for workholding validation.

Requirements:
1. should_check_workholding(params: dict) -> bool:
   - Return True if cutting_force or clamp_force in params
   - Return True if operation involves material removal

2. WorkholdingTrigger class:
   - extract_forces(params: dict) -> dict with cutting_force, feed_force
   - estimate_clamp_requirement(forces: dict) -> float
   - is_safe(forces: dict, clamp_force: float) -> bool

3. HOOKS_TO_FIRE = ['validate_workholding_setup', 'calculate_clamp_force_required']

Include: safety factor of 2.5, friction coefficient 0.3 default'''
    },
    {
        'task_id': 'machining_breakage',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_breakage_hook.py for tool breakage prediction.

Requirements:
1. should_check_breakage(params: dict) -> bool:
   - Return True if tool_diameter, depth_of_cut, or feed present
   - Return True if L/D ratio > 4

2. BreakageTrigger class:
   - calculate_ld_ratio(tool_diameter: float, stickout: float) -> float
   - estimate_deflection_risk(ld_ratio: float, force: float) -> str (LOW/MEDIUM/HIGH)
   - get_breakage_factors(params: dict) -> dict

3. HOOKS_TO_FIRE = ['predict_tool_breakage', 'check_chip_load_limits', 'get_safe_cutting_limits']

Include: L/D thresholds (4=caution, 6=warning, 8=critical)'''
    },
    {
        'task_id': 'machining_spindle',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_spindle_hook.py for spindle safety checks.

Requirements:
1. should_check_spindle(params: dict) -> bool:
   - Return True if spindle_speed, power, or torque in params
   - Return True if rpm > 10000 or power > 10kW

2. SpindleTrigger class:
   - check_speed_limits(rpm: int, max_rpm: int) -> bool
   - check_power_limits(power_kw: float, max_power: float) -> bool
   - check_torque_limits(torque_nm: float, max_torque: float) -> bool

3. HOOKS_TO_FIRE = ['get_spindle_safe_envelope', 'check_spindle_power', 'check_spindle_torque']

Include: default limits (max_rpm=15000, max_power=30kW, max_torque=100Nm)'''
    },
    {
        'task_id': 'machining_coolant',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_coolant_hook.py for coolant validation.

Requirements:
1. should_check_coolant(params: dict) -> bool:
   - Return True if operation is drilling, tapping, or deep pocket
   - Return True if depth/diameter ratio > 3

2. CoolantTrigger class:
   - detect_operation_type(params: dict) -> str
   - requires_through_spindle(operation: str, depth_ratio: float) -> bool
   - get_flow_requirements(operation: str, material: str) -> dict

3. HOOKS_TO_FIRE = ['validate_coolant_flow', 'check_through_spindle_coolant']

Include: operation-specific flow rates (drilling=20L/min, tapping=15L/min)'''
    },
    # =========================================================================
    # SESSION START HOOKS (3)
    # =========================================================================
    {
        'task_id': 'session_start_gsd',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write session_start_gsd_hook.py to fire GSD and context hooks on first call.

Requirements:
1. SessionStartManager class:
   - _first_call: bool (thread-safe with Lock)
   - is_first_call() -> bool
   - mark_started()
   - get_start_hooks() -> list

2. on_first_tool_call() -> list:
   - If first call, return hooks to fire
   - Mark as started
   - Log to C:/PRISM/logs/session_start.log

3. HOOKS_TO_FIRE = ['prism_gsd_core', 'dev_context_watch_start', 'prism_quick_resume', 'intel_budget_reset']

Include: singleton pattern, thread Lock, timestamp logging'''
    },
    {
        'task_id': 'session_start_context',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write session_start_context_hook.py for context initialization.

Requirements:
1. ContextInitializer class:
   - load_previous_state() -> dict (from C:/PRISM/state/CURRENT_STATE.json)
   - detect_continuation() -> bool (check if resuming previous session)
   - get_quick_resume_info() -> dict

2. initialize_context() -> dict:
   - Load state if exists
   - Return context summary
   - Log initialization

3. CONTEXT_HOOKS = ['prism_state_load', 'prism_memory_recall']

Include: JSON loading with error handling, fallback to empty state'''
    },
    # =========================================================================
    # SESSION END HOOKS (3)
    # =========================================================================
    {
        'task_id': 'session_end_budget',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write session_end_budget_hook.py for budget reporting at session end.

Requirements:
1. BudgetReporter class:
   - collect_budget_stats() -> dict (tokens used, saved, efficiency)
   - format_report() -> str (human-readable summary)
   - save_report(path: str)

2. on_session_end() -> dict:
   - Collect stats
   - Generate report
   - Save to C:/PRISM/logs/budget_reports/
   - Return summary

3. HOOKS_TO_FIRE = ['intel_budget_report', 'intel_review_stats']

Include: datetime in filename, JSON stats + text summary'''
    },
    {
        'task_id': 'session_end_context',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write session_end_context_hook.py for context cleanup at session end.

Requirements:
1. ContextFinalizer class:
   - save_state(state: dict) -> bool
   - stop_watchers() -> bool
   - generate_handoff() -> dict

2. finalize_context() -> dict:
   - Save current state to C:/PRISM/state/CURRENT_STATE.json
   - Stop file watchers
   - Generate handoff summary
   - Return finalization result

3. HOOKS_TO_FIRE = ['dev_context_watch_stop', 'prism_state_save', 'prism_handoff_prepare']

Include: atomic file write (write to .tmp then rename), error handling'''
    },
    {
        'task_id': 'session_end_cleanup',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write session_end_cleanup_hook.py for session cleanup tasks.

Requirements:
1. SessionCleanup class:
   - flush_logs() -> bool
   - archive_session_data(session_id: str) -> str (returns archive path)
   - clear_temp_files() -> int (returns count cleared)

2. cleanup_session() -> dict:
   - Flush all log buffers
   - Archive session data to C:/PRISM/archives/sessions/
   - Clear temp files from C:/PRISM/temp/
   - Return cleanup summary

3. Include session duration calculation and final metrics

Include: shutil for archiving, glob for temp file cleanup'''
    },
    # =========================================================================
    # COORDINATOR UPDATE
    # =========================================================================
    {
        'task_id': 'machining_coordinator',
        'model': 'haiku',
        'system_prompt': system,
        'task': '''Write machining_hook_coordinator.py that coordinates all machining safety hooks.

Requirements:
1. MachiningHookCoordinator class:
   - Register all 5 machining hook modules
   - check_all(params: dict) -> dict with all check results
   - get_required_hooks(params: dict) -> list of hooks to fire

2. Events:
   - BEFORE_GCODE_OUTPUT
   - BEFORE_TOOLPATH_GENERATION
   - BEFORE_NC_PROGRAM_SAVE

3. should_block(results: dict) -> bool:
   - Return True if ANY safety check failed
   - Log blocking reason

Include: centralized logging, result aggregation, blocking logic'''
    }
]

print(f'Executing {len(tasks)} tasks in parallel (5 workers)...')
print()

results = executor.parallel_execute(tasks)
summary = executor.get_summary()

print()
print('='*70)
print(f"RESULTS: {summary['successful']}/{summary['total_tasks']} successful")
print(f"Total tokens: {summary['total_tokens']}")
print(f"Total time: {summary['total_duration_ms']}ms")
print(f"Avg time per task: {summary['avg_duration_ms']}ms")
print('='*70)

# Save results
output_dir = Path('C:/PRISM/mcp-server/src/tools/intelligence/auto_hooks_v2')
output_dir.mkdir(exist_ok=True)

success_count = 0
fail_count = 0

for r in results:
    if r.success:
        # Clean markdown fences if present
        code = r.result
        if code.startswith('```'):
            lines = code.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            code = '\n'.join(lines)
        
        filename = f'{r.task_id}.py'
        filepath = output_dir / filename
        filepath.write_text(code, encoding='utf-8')
        lines = len(code.split('\n'))
        print(f'OK: {filename} ({lines} lines, {r.tokens_used} tokens, {r.duration_ms}ms)')
        success_count += 1
    else:
        print(f'FAIL: {r.task_id} - {r.error[:80]}...')
        fail_count += 1

print()
print(f'Output: {output_dir}')
print(f'Success: {success_count}, Failed: {fail_count}')

# Save summary
summary_path = output_dir / 'GENERATION_SUMMARY.json'
summary_data = {
    'generated_at': str(Path('.').resolve()),
    'total_tasks': len(tasks),
    'successful': success_count,
    'failed': fail_count,
    'total_tokens': summary['total_tokens'],
    'total_duration_ms': summary['total_duration_ms'],
    'files': [r.task_id + '.py' for r in results if r.success]
}
summary_path.write_text(json.dumps(summary_data, indent=2), encoding='utf-8')
print(f'Summary saved to: {summary_path}')
