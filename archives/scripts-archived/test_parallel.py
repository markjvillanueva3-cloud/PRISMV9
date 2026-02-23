"""Test parallel execution with 2 agents"""
import sys
sys.path.insert(0, r'C:\PRISM\scripts')
from api_swarm_executor_v2 import PRISMSwarmExecutor

print('Testing parallel execution with 2 agents...')
print('='*60)

executor = PRISMSwarmExecutor()

# Simple test tasks
tasks = [
    {
        'agent': 'validator_syntax',
        'task': 'Validate: const x: number = 1;',
    },
    {
        'agent': 'validator_completeness', 
        'task': 'Check: interface Test { id: string; }',
    }
]

results = executor.run_parallel(tasks, max_workers=2)

print()
print('Results:')
for r in results:
    status = 'OK' if r['success'] else 'FAIL'
    agent = r.get('agent', 'unknown')
    print(f'  {agent}: {status}')

print(f'Total cost: ${executor.usage["cost"]:.4f}')
