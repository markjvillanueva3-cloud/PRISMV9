#!/usr/bin/env python3
"""Simple verification script for PRISM Phase 1."""
import sys
import json
from pathlib import Path

# Output results to file
output_file = Path("C:/PRISM/state/phase1_verification.json")

sys.path.insert(0, 'C:/PRISM/scripts')

results = {
    'status': 'running',
    'tests': []
}

try:
    # Test 1: Import MCP Server
    from prism_mcp_server import PRISMMCPServer
    mcp = PRISMMCPServer()
    results['tests'].append({'name': 'mcp_import', 'status': 'PASS'})
    
    # Test 2: List tools
    tools = mcp.list_tools()
    results['tests'].append({'name': 'list_tools', 'status': 'PASS', 'count': len(tools)})
    
    # Test 3: Materials
    mat = mcp.call('prism_material_get', {'id': 'AL-6061'})
    results['tests'].append({
        'name': 'material_get', 
        'status': 'PASS' if 'name' in mat else 'FAIL',
        'result': mat.get('name', str(mat)[:50])
    })
    
    # Test 4: Physics Kienzle
    kienzle = mcp.call('prism_physics_kienzle', {'kc1_1': 790, 'mc': 0.25, 'b': 5, 'h': 0.2})
    results['tests'].append({
        'name': 'physics_kienzle',
        'status': 'PASS' if 'cutting_force_N' in kienzle else 'FAIL',
        'result': kienzle.get('cutting_force_N', str(kienzle)[:50])
    })
    
    # Test 5: Quality Omega
    omega = mcp.call('prism_quality_omega', {'safety': 0.85, 'reasoning': 0.80})
    results['tests'].append({
        'name': 'quality_omega',
        'status': 'PASS' if 'omega' in omega else 'FAIL',
        'result': omega.get('omega', str(omega)[:50])
    })
    
    # Test 6: Skills list
    skills = mcp.call('prism_skill_list', {})
    results['tests'].append({
        'name': 'skill_list',
        'status': 'PASS' if isinstance(skills, list) else 'FAIL',
        'count': len(skills) if isinstance(skills, list) else 0
    })
    
    # Test 7: Agents list
    agents = mcp.call('prism_agent_list', {})
    results['tests'].append({
        'name': 'agent_list',
        'status': 'PASS' if isinstance(agents, list) else 'FAIL',
        'count': len(agents) if isinstance(agents, list) else 0
    })
    
    # Test 8: Hooks list
    hooks = mcp.call('prism_hook_list', {})
    results['tests'].append({
        'name': 'hook_list',
        'status': 'PASS' if isinstance(hooks, list) else 'FAIL',
        'count': len(hooks) if isinstance(hooks, list) else 0
    })
    
    # Test 9: State get
    state = mcp.call('prism_state_get', {})
    results['tests'].append({
        'name': 'state_get',
        'status': 'PASS' if isinstance(state, dict) else 'FAIL',
        'version': state.get('version', 'N/A')
    })
    
    # Test 10: Validate gates
    gates = mcp.call('prism_validate_gates', {'input_parsed': True, 'output_path': 'C:\\test'})
    results['tests'].append({
        'name': 'validate_gates',
        'status': 'PASS' if 'all_gates_pass' in gates else 'FAIL',
        'passed': gates.get('all_gates_pass', False)
    })
    
    # Summary
    passed = sum(1 for t in results['tests'] if t['status'] == 'PASS')
    total = len(results['tests'])
    results['summary'] = {
        'passed': passed,
        'total': total,
        'percentage': f"{100*passed//total}%",
        'mcp_tools': len(tools)
    }
    results['status'] = 'COMPLETE'
    
except Exception as e:
    results['status'] = 'ERROR'
    results['error'] = str(e)

# Write results
output_file.write_text(json.dumps(results, indent=2, default=str), encoding='utf-8')
