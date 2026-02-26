#!/usr/bin/env python3
"""Test script for PRISM MCP Server."""
import sys
sys.path.insert(0, 'C:/PRISM/scripts')
from prism_mcp_server import PRISMMCPServer

mcp = PRISMMCPServer()

print('='*70)
print('  COMPREHENSIVE MCP TEST')
print('='*70)

passed = 0
total = 0

# Test 1: Materials
print('\n[1] MATERIALS')
total += 1
mat = mcp.call('prism_material_get', {'id': 'AL-6061'})
if 'error' not in mat:
    print(f"  AL-6061: {mat.get('name')} - kc1.1={mat.get('kienzle_kc1_1')}")
    passed += 1
else:
    print(f"  ERROR: {mat}")

# Test 2: Physics
print('\n[2] PHYSICS')
total += 2
kienzle = mcp.call('prism_physics_kienzle', {'kc1_1': 790, 'mc': 0.25, 'b': 5, 'h': 0.2})
if 'cutting_force_N' in kienzle:
    print(f"  Kienzle: Fc = {kienzle['cutting_force_N']} N")
    passed += 1
else:
    print(f"  Kienzle ERROR: {kienzle}")

taylor = mcp.call('prism_physics_taylor', {'C': 335, 'n': 0.13, 'V': 150})
if 'tool_life_min' in taylor:
    print(f"  Taylor: T = {taylor['tool_life_min']} min")
    passed += 1
else:
    print(f"  Taylor ERROR: {taylor}")

# Test 3: Machines
print('\n[3] MACHINES')
total += 1
machines = mcp.call('prism_machine_search', {'type': 'vmc'})
if isinstance(machines, list):
    print(f"  VMC machines found: {len(machines)}")
    passed += 1
else:
    print(f"  ERROR: {machines}")

# Test 4: Skills
print('\n[4] SKILLS')
total += 1
skills = mcp.call('prism_skill_list', {})
if isinstance(skills, list):
    print(f"  Total skills: {len(skills)}")
    passed += 1
else:
    print(f"  ERROR: {skills}")

# Test 5: Agents
print('\n[5] AGENTS')
total += 1
agents = mcp.call('prism_agent_list', {})
if isinstance(agents, list):
    print(f"  Total agents: {len(agents)}")
    passed += 1
else:
    print(f"  ERROR: {agents}")

# Test 6: Formulas
print('\n[6] FORMULAS')
total += 1
formulas = mcp.call('prism_formula_list', {})
if isinstance(formulas, list):
    print(f"  Total formulas: {len(formulas)}")
    passed += 1
else:
    print(f"  ERROR: {formulas}")

# Test 7: Quality
print('\n[7] QUALITY')
total += 1
quality = mcp.call('prism_quality_omega', {'safety': 0.85, 'reasoning': 0.80, 'code': 0.75})
if 'omega' in quality:
    print(f"  Omega(x) = {quality['omega']} - Decision: {quality['decision']}")
    passed += 1
else:
    print(f"  ERROR: {quality}")

# Test 8: State
print('\n[8] STATE')
total += 1
state = mcp.call('prism_state_get', {})
if isinstance(state, dict):
    print(f"  State version: {state.get('version', 'N/A')}")
    passed += 1
else:
    print(f"  ERROR: {state}")

# Test 9: Hooks
print('\n[9] HOOKS')
total += 1
hooks = mcp.call('prism_hook_list', {})
if isinstance(hooks, list):
    print(f"  Total hooks: {len(hooks)}")
    passed += 1
else:
    print(f"  ERROR: {hooks}")

# Test 10: Alarms
print('\n[10] ALARMS')
total += 1
alarms = mcp.call('prism_alarm_search', {'family': 'FANUC'})
if isinstance(alarms, list):
    print(f"  FANUC alarms found: {len(alarms)}")
    passed += 1
else:
    print(f"  ERROR: {alarms}")

# Test 11: Unit conversion
print('\n[11] UNIT CONVERSION')
total += 1
conv = mcp.call('prism_physics_unit_convert', {'value': 100, 'from_unit': 'm/min', 'to_unit': 'sfm'})
if 'converted' in conv:
    print(f"  100 m/min = {conv['converted']} SFM")
    passed += 1
else:
    print(f"  ERROR: {conv}")

# Test 12: Validate gates
print('\n[12] VALIDATION GATES')
total += 1
gates = mcp.call('prism_validate_gates', {'input_parsed': True, 'output_path': 'C:\\test'})
if 'all_gates_pass' in gates:
    print(f"  Gates: {gates['all_gates_pass']} - Blocked by: {gates['blocked_by']}")
    passed += 1
else:
    print(f"  ERROR: {gates}")

# Summary
print('\n' + '='*70)
stats = mcp.get_statistics()
print(f'  TOTAL TOOLS: {stats["total_tools"]}')
print(f'  TESTS: {passed}/{total} passed ({100*passed//total}%)')
print(f'  CALLS MADE: {stats["call_count"]}')
print('='*70)
