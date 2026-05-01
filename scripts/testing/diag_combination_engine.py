"""Diagnostic script for CombinationEngine"""
import sys
sys.path.insert(0, r'C:\PRISM\scripts')

# Test PuLP availability
try:
    from pulp import LpProblem
    print('PuLP: AVAILABLE')
except ImportError:
    print('PuLP: NOT INSTALLED')

# Test CombinationEngine
from prism_unified_system_v6 import CombinationEngine, SKILL_KEYWORDS, AGENT_DEFINITIONS

print(f'SKILL_KEYWORDS count: {len(SKILL_KEYWORDS)}')
print(f'AGENT_DEFINITIONS count: {len(AGENT_DEFINITIONS)}')

engine = CombinationEngine()
print(f'Capability Matrix resources: {len(engine.name_to_caps)}')

synergy_pairs = engine.synergy_matrix.get("synergyMatrix", {}).get("pairs", {})
print(f'Synergy Matrix pairs: {len(synergy_pairs)}')

# Test single optimization
task = 'Calculate optimal speed and feed for milling 4140 steel'
parsed = engine.parse_task(task)
print(f'\nParsed Task:')
print(f'  Domains: {parsed.domains}')
print(f'  Operations: {parsed.operations}')
print(f'  Complexity: {parsed.complexity}')

# Get capability scores
scores = []
for skill in SKILL_KEYWORDS.keys():
    score = engine.compute_capability_score(skill, parsed)
    scores.append((skill, score.capability_score))

scores.sort(key=lambda x: x[1], reverse=True)
print('\nTop skill scores:')
for name, score in scores[:5]:
    print(f'  {name}: {score:.3f}')

# Also check agent scores
agent_scores = []
for agent in AGENT_DEFINITIONS.keys():
    score = engine.compute_capability_score(agent, parsed)
    agent_scores.append((agent, score.capability_score))
agent_scores.sort(key=lambda x: x[1], reverse=True)
print('\nTop agent scores:')
for name, score in agent_scores[:5]:
    print(f'  {name}: {score:.3f}')

# Run full optimize
print('\nRunning full optimize...')
result = engine.optimize(task)
print(f'\nFull Optimize Result:')
print(f'  Skills selected: {len(result.skills)} - {result.skills}')
print(f'  Agents selected: {len(result.agents)} - {result.agents}')
print(f'  PSI: {result.psi_score:.4f}')
print(f'  Coverage: {result.coverage_score:.4f}')
print(f'  Synergy: {result.synergy_score:.4f}')
print(f'  Cost: ${result.total_cost:.2f}')
print(f'  Proof Certificate: {result.proof.get("certificate", "NONE")}')
