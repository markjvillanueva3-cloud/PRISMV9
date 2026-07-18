"""Test auto-fire integration"""
import sys
sys.path.insert(0, r'C:\PRISM\mcp-server\src\tools\intelligence')

from auto_fire_integration import get_auto_fire_registry
from token_budget import TokenBudget
import json

print('=== INTEGRATED AUTO-FIRE + TOKEN BUDGET TEST ===')

registry = get_auto_fire_registry()
budget = TokenBudget()

print('\n1. Before calc_cutting_force:')
fires = registry.fire('calc_cutting_force', 'before', args={'material': '4140'})
print(f'   Patterns fired: {len(fires)}')

print('\n2. After calc_cutting_force:')
fires = registry.fire('calc_cutting_force', 'after', result={'force_N': 1234.5, 'power_kW': 5.6})
print(f'   Patterns fired: {len(fires)}')
for f in fires:
    print(f"   - {f['pattern_id']}: {f['result'].get('action')}")

print('\n3. Test swarm_execute (expensive op):')
fires = registry.fire('swarm_execute', 'before', args={'agents': ['A1', 'A2']})
print(f'   Patterns fired: {len(fires)}')
for f in fires:
    print(f"   - {f['pattern_id']}: {f['result'].get('action')}")

print('\n4. Simulate error:')
try:
    raise ValueError("Test error")
except Exception as e:
    fires = registry.fire('some_tool', 'on_error', error=e)
    print(f'   Patterns fired: {len(fires)}')
    for f in fires:
        print(f"   - {f['pattern_id']}: suggestions={f['result'].get('suggestions', [])[:2]}")

print('\n5. Stats:')
stats = registry.get_stats()
print(f'   Total fires: {stats["total_fires"]}')
print(f'   Tokens tracked: {stats["tokens_tracked"]}')
print(f'   Proofs validated: {stats["proofs_validated"]}')
print(f'   Failures reflected: {stats["failures_reflected"]}')

print('\n6. Token Budget Status:')
print(json.dumps(budget.status(), indent=2))
