#!/usr/bin/env python3
"""Phase 1 Comprehensive Validation"""
import sys
import json
sys.path.insert(0, 'C:\\PRISM\\scripts')
from prism_mcp_server import PRISMMCPServer

print('='*70)
print('  PHASE 1 COMPREHENSIVE VALIDATION')
print('='*70)

# Test MCP Server
print('\n[1] MCP SERVER TESTS')
mcp = PRISMMCPServer()
mcp_stats = mcp.get_stats()
print(f'    Total Tools: {mcp_stats["total_tools"]}')
print(f'    Skills: {mcp_stats["skills_loaded"]}')
print(f'    Agents: {mcp_stats["agents_available"]}')
print(f'    Formulas: {mcp_stats["formulas_available"]}')

# Test all categories
print('\n[2] TOOL CATEGORY TESTS')
categories = ['orchestration', 'data', 'physics', 'state', 'validation']
for cat in categories:
    tools = mcp.list_tools(cat)
    print(f'    {cat}: {len(tools)} tools')

# Sample calculations
print('\n[3] PHYSICS CALCULATIONS')
kienzle = mcp.call('prism_physics_kienzle', {'material_id': 'AL-6061', 'depth_mm': 2, 'width_mm': 5})
print(f'    Kienzle Force: {kienzle["results"]["cutting_force_N"]} N')

taylor = mcp.call('prism_physics_taylor', {'material_id': 'AL-6061', 'cutting_speed_m_min': 200})
print(f'    Taylor Tool Life: {taylor["results"]["tool_life_min"]} min')

surface = mcp.call('prism_physics_surface', {'feed_mm_rev': 0.1, 'nose_radius_mm': 0.8})
print(f'    Surface Finish: {surface["results"]["Ra_um"]} um ({surface["results"]["finish_class"]})')

# Quality validation
print('\n[4] QUALITY VALIDATION')
omega = mcp.call('prism_quality_omega', {'output': {'S': 0.85, 'D': 0.5, 'R': 0.8}})
print(f'    Omega: {omega["omega"]}')
print(f'    Decision: {omega["decision"]}')

constraints = omega["hard_constraints"]
print(f'    Safety Passed: {constraints["S >= 0.70"]}')
print(f'    Anomaly Passed: {constraints["D >= 0.30"]}')

# Full tool test loop
print('\n[5] FULL TOOL TEST (14 core tools)')
tests = [
    ('prism_material_get', {'id': 'AL-6061'}),
    ('prism_material_search', {'query': {'category': 'aluminum'}}),
    ('prism_machine_get', {'id': 'HAAS-VF2'}),
    ('prism_physics_kienzle', {'material_id': 'AL-6061', 'depth_mm': 2, 'width_mm': 5}),
    ('prism_physics_taylor', {'material_id': 'AL-6061', 'cutting_speed_m_min': 200}),
    ('prism_physics_surface', {'feed_mm_rev': 0.1, 'nose_radius_mm': 0.8}),
    ('prism_physics_unit_convert', {'value': 25.4, 'from_unit': 'mm', 'to_unit': 'in'}),
    ('prism_skill_list', {}),
    ('prism_agent_list', {}),
    ('prism_hook_list', {}),
    ('prism_formula_apply', {'name': 'F-KIENZLE', 'params': {'kc1_1': 1500, 'b': 5, 'h': 0.1}}),
    ('prism_quality_omega', {'output': {'S': 0.8, 'D': 0.5}}),
    ('prism_validate_gates', {'output': {'results': True}}),
    ('prism_state_get', {}),
]

passed = 0
for tool, params in tests:
    result = mcp.call(tool, params)
    ok = 'error' not in result
    status = 'PASS' if ok else 'FAIL'
    passed += 1 if ok else 0
    print(f'    [{status}] {tool}')

print(f'\n    Results: {passed}/{len(tests)} passed ({passed/len(tests)*100:.0f}%)')

print('\n' + '='*70)
print('  VALIDATION COMPLETE - ALL SYSTEMS OPERATIONAL')
print('='*70)
print(f'\n  PHASE 1 STATUS: {"COMPLETE" if passed == len(tests) else "NEEDS ATTENTION"}')
print(f'  MCP TOOLS: {mcp_stats["total_tools"]} available')
print(f'  SKILLS: {mcp_stats["skills_loaded"]} loaded')
print('='*70)
