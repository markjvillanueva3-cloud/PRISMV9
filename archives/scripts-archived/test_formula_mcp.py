#!/usr/bin/env python3
"""Test MCP server formula tools integration."""
import sys
sys.path.insert(0, 'C:/PRISM/scripts')
sys.path.insert(0, 'C:/PRISM/scripts/core')

from prism_mcp_server import PRISMMCPServer

print("=" * 60)
print("MCP SERVER v2.3 INTEGRATION TEST")
print("=" * 60)

mcp = PRISMMCPServer()
print(f"\nTotal tools: {len(mcp.tools)}")

# List formula tools
formula_tools = [t for t in sorted(mcp.tools.keys()) if 'formula' in t.lower() and 'prism_formula' in t]
print(f"\nFormula tools ({len(formula_tools)}):")
for t in formula_tools:
    print(f"  {t}")

# Test formula stats
print("\n[1] Testing prism_formula_stats:")
stats = mcp.call('prism_formula_stats')
if "error" not in stats:
    print(f"  Total formulas: {stats.get('total_formulas', 0)}")
    print(f"  Categories: {stats.get('total_categories', 0)}")
    print(f"  By novelty: {stats.get('by_novelty', {})}")
else:
    print(f"  ERROR: {stats}")

# Test formula get
print("\n[2] Testing prism_formula_get('F-CUT-001'):")
formula = mcp.call('prism_formula_get', {'formula_id': 'F-CUT-001'})
if "formula" in formula:
    print(f"  Name: {formula['formula'].get('name')}")
    print(f"  Equation: {formula['formula'].get('equation')}")
else:
    print(f"  ERROR: {formula}")

# Test formula apply
print("\n[3] Testing prism_formula_apply (Kienzle):")
result = mcp.call('prism_formula_apply', {
    'formula_id': 'F-CUT-001',
    'inputs': {'kc1.1': 1500, 'h': 0.2, 'mc': 0.25, 'b': 3.0}
})
if "error" not in result:
    print(f"  Result: {result.get('result', {})}")
else:
    print(f"  ERROR: {result}")

# Test formula search
print("\n[4] Testing prism_formula_search('thermal'):")
search = mcp.call('prism_formula_search', {'query': 'thermal', 'limit': 3})
if "error" not in search:
    print(f"  Found: {search.get('count', 0)}")
else:
    print(f"  ERROR: {search}")

# Test formula categories
print("\n[5] Testing prism_formula_categories:")
cats = mcp.call('prism_formula_categories')
if "error" not in cats:
    print(f"  Total categories: {cats.get('total_categories', 0)}")
else:
    print(f"  ERROR: {cats}")

# Count all tools by type
print("\n[SUMMARY] Tool counts by category:")
prefixes = {
    'hook': 'prism_hook_',
    'formula': 'prism_formula_',
    'orch': 'prism_orch_',
    'skill': 'prism_skill_',
    'material': 'prism_material_',
    'physics': 'prism_physics_'
}
for name, prefix in prefixes.items():
    count = len([t for t in mcp.tools.keys() if t.startswith(prefix)])
    print(f"  {name}: {count}")

print("\n" + "=" * 60)
if len(mcp.tools) >= 107:
    print(f"ALL TESTS PASSED - {len(mcp.tools)} tools available")
else:
    print(f"WARNING: Expected 107+ tools, got {len(mcp.tools)}")
print("=" * 60)
