#!/usr/bin/env python3
"""Phase 1 MCP Server Test Suite"""
import sys
sys.path.insert(0, r'C:\PRISM\scripts')
from prism_mcp_server import PRISMMCPServer
import json

mcp = PRISMMCPServer()

print('='*70)
print('COMPREHENSIVE TEST SUITE - PHASE 1 MCP SERVER')
print('='*70)

tests = []

# Test groups
print('\n[1] ORCHESTRATION (14 tools)')
r = mcp.call('prism_skill_list', {'category': 'physics'})
tests.append(('skill_list', len(r) > 0))
print(f'  skill_list: {len(r)} physics skills')

r = mcp.call('prism_skill_select', {'task': 'materials database', 'n': 5})
tests.append(('skill_select', len(r) == 5))
print(f'  skill_select: {len(r)} selected')

r = mcp.call('prism_agent_list', {'tier': 'OPUS'})
tests.append(('agent_list', len(r) > 0))
print(f'  agent_list: {len(r)} OPUS agents')

r = mcp.call('prism_hook_list', {'category': 'context'})
tests.append(('hook_list', len(r) > 0))
print(f'  hook_list: {len(r)} context hooks')

r = mcp.call('prism_formula_apply', {'name': 'F-KIENZLE', 'params': {'kc1_1': 1500, 'b': 5, 'h': 0.2, 'mc': 0.25}})
tests.append(('formula_apply', 'result' in r))
fc = r.get('result', {}).get('Fc', '?')
print(f'  formula_apply: Fc={fc} N')

print('\n[2] DATA QUERY (9 tools)')
r = mcp.call('prism_material_get', {'id': 'AL-6061'})
tests.append(('material_get', 'name' in r))
print(f"  material_get: {r.get('name', '?')}")

r = mcp.call('prism_material_search', {'query': {'category': 'aluminum'}})
tests.append(('material_search', len(r) >= 2))
print(f'  material_search: {len(r)} aluminum')

r = mcp.call('prism_machine_get', {'id': 'HAAS-VF2'})
tests.append(('machine_get', 'name' in r))
print(f"  machine_get: {r.get('name', '?')}")

r = mcp.call('prism_alarm_search', {'query': {'family': 'FANUC'}})
tests.append(('alarm_search', len(r) > 0))
print(f'  alarm_search: {len(r)} FANUC alarms')

print('\n[3] PHYSICS (12 tools)')
r = mcp.call('prism_physics_kienzle', {'material_id': 'AL-6061', 'depth_mm': 2, 'feed_mm': 0.2})
tests.append(('physics_kienzle', 'cutting_force_N' in r))
print(f"  Kienzle: Fc={r.get('cutting_force_N', '?')} N")

r = mcp.call('prism_physics_taylor', {'material_id': 'AL-6061', 'cutting_speed_m_min': 200})
tests.append(('physics_taylor', 'tool_life_min' in r))
print(f"  Taylor: T={r.get('tool_life_min', '?')} min")

r = mcp.call('prism_physics_stability', {'machine_id': 'HAAS-VF2', 'tool_diameter_mm': 10, 'overhang_mm': 40, 'rpm': 6000})
tests.append(('physics_stability', 'stable' in r))
stable = 'STABLE' if r.get('stable') else 'UNSTABLE'
print(f'  Stability: {stable}')

r = mcp.call('prism_physics_deflection', {'tool_diameter_mm': 10, 'overhang_mm': 40, 'cutting_force_N': 500})
tests.append(('physics_deflection', 'deflection_mm' in r))
print(f"  Deflection: {r.get('deflection_mm', '?')} mm")

r = mcp.call('prism_physics_surface', {'feed_mm_rev': 0.15, 'tool_nose_radius_mm': 0.8})
tests.append(('physics_surface', 'Ra_practical_um' in r))
print(f"  Surface: Ra={r.get('Ra_practical_um', '?')} um")

r = mcp.call('prism_physics_optimize_speed', {'material_id': 'AL-6061', 'machine_id': 'HAAS-VF2', 'tool_diameter_mm': 10, 'target_life_min': 30})
tests.append(('physics_optimize_speed', 'optimal_rpm' in r))
print(f"  Optimize: {r.get('optimal_rpm', '?')} RPM")

r = mcp.call('prism_physics_unit_convert', {'value': 100, 'from_unit': 'm/min', 'to_unit': 'sfm'})
tests.append(('physics_unit_convert', 'output' in r))
sfm = r.get('output', {}).get('value', '?')
print(f'  Unit Convert: 100 m/min = {sfm} SFM')

print('\n[4] STATE SERVER (11 tools)')
r = mcp.call('prism_state_get', {})
tests.append(('state_get', isinstance(r, dict)))
print(f"  state_get: v{r.get('version', '?')}")

r = mcp.call('prism_state_checkpoint', {'name': 'phase1-test'})
tests.append(('state_checkpoint', 'checkpoint_id' in r))
print(f"  checkpoint: {r.get('checkpoint_id', '?')}")

r = mcp.call('prism_event_append', {'event': {'type': 'TEST', 'msg': 'Phase 1 validation'}})
tests.append(('event_append', 'EVT-' in str(r)))
print(f'  event_append: {r}')

r = mcp.call('prism_event_recent', {'n': 3})
tests.append(('event_recent', isinstance(r, list)))
print(f'  events: {len(r)} recent')

r = mcp.call('prism_decision_record', {'decision': {'type': 'TEST', 'choice': 'Phase 1 complete'}})
tests.append(('decision_record', 'DEC-' in str(r)))
print(f'  decision: {r}')

print('\n[5] VALIDATION (8 tools)')
r = mcp.call('prism_quality_omega', {'output': {'S': 0.85, 'D': 0.5, 'R': 0.8, 'C': 0.75, 'P': 0.7}})
tests.append(('quality_omega', 'omega_final' in r))
omega = r.get('omega_final', 0)
decision = r.get('decision', '?')
print(f'  Omega: {omega} [{decision}]')

r = mcp.call('prism_quality_safety', {'output': {'rpm': 8000, 'cutting_force_N': 1500}})
tests.append(('quality_safety', 'S_score' in r))
s_passed = 'PASS' if r.get('passed') else 'FAIL'
print(f"  Safety: S={r.get('S_score', '?')} [{s_passed}]")

r = mcp.call('prism_validate_gates', {'output': {'S': 0.85, 'D': 0.5, 'evidence_level': 3, 'output_path': 'C:/test'}})
tests.append(('validate_gates', 'gates' in r))
g_passed = sum(1 for g in r.get('gates', []) if g['passed'])
g_total = len(r.get('gates', []))
print(f'  Gates: {g_passed}/{g_total} passed')

r = mcp.call('prism_validate_anti_regression', {'old': {'items': 100}, 'new': {'items': 120}})
tests.append(('validate_anti_regression', 'safe_to_proceed' in r))
reg_status = 'SAFE' if r.get('safe_to_proceed') else 'REGRESSION'
print(f'  Anti-Regression: {reg_status}')

r = mcp.call('prism_safety_check_limits', {'params': {'rpm': 8000, 'feed_mm_rev': 0.2}})
tests.append(('safety_check_limits', 'safe' in r))
lim_status = 'SAFE' if r.get('safe') else 'VIOLATIONS'
print(f'  Limits: {lim_status}')

r = mcp.call('prism_safety_check_collision', {'path': {'z_min': 0, 'z_max': 100, 'work_height': 50}})
tests.append(('safety_check_collision', 'safe' in r))
col_status = 'SAFE' if r.get('safe') else 'COLLISION'
print(f'  Collision: {col_status}')

# Summary
print('\n' + '='*70)
passed = sum(1 for _, p in tests if p)
total = len(tests)
print(f'TEST SUMMARY: {passed}/{total} PASSED')
if passed == total:
    print('ALL TESTS PASSED ✓')
else:
    failed = [t[0] for t in tests if not t[1]]
    print(f'FAILED: {failed}')
print('='*70)

# Final status
print(f'\nPHASE 1 MCP SERVER: {"COMPLETE" if passed == total else "NEEDS FIXES"}')
print(f'Tools: 54 total across 5 categories')
print(f'Skills: {mcp.status()["skills_loaded"]}')
print(f'Hooks: {mcp.status()["hooks_loaded"]}')
print(f'Formulas: {mcp.status()["formulas_loaded"]}')
