"""Test Omega Integration"""
import sys
sys.path.insert(0, r'C:\PRISM\mcp-server\src\tools\intelligence')

from omega_integration import get_omega_calculator, OmegaComponents
import json

print('=== P6-OMEGA INTEGRATION TEST ===\n')

calc = get_omega_calculator()

# Test 1: Compute with good scores
print('1. GOOD SCORES (R=0.85, C=0.80, P=0.75, S=0.90, L=0.60):')
result = calc.compute(R=0.85, C=0.80, P=0.75, S=0.90, L=0.60)
print(f'   Omega = {result.score:.4f}')
print(f'   Status: {result.status}')
print(f'   Safety OK: {result.hard_constraint_passed}')

# Test 2: Safety violation
print('\n2. SAFETY VIOLATION (S=0.50):')
result = calc.compute(R=0.90, C=0.90, P=0.90, S=0.50, L=0.90)
print(f'   Omega = {result.score:.4f}')
print(f'   Status: {result.status}')
print(f'   Recommendations: {result.recommendations[0]}')

# Test 3: Breakdown
print('\n3. DETAILED BREAKDOWN:')
breakdown = calc.breakdown()
print(f'   Contributions: {breakdown["contributions"]}')
print(f'   Hard Constraint: S={breakdown["hard_constraint"]["actual"]:.2f} (threshold: 0.70)')

# Test 4: Optimization
print('\n4. OPTIMIZATION SUGGESTIONS (current Omega=0.60):')
opt = calc.optimize(OmegaComponents(R=0.6, C=0.6, P=0.6, S=0.7, L=0.4), target=0.70)
print(f'   Gap: {opt["gap"]:.4f}')
print(f'   Top suggestion: {opt["suggestions"][0]["component"]} (+{opt["suggestions"][0]["impact"]:.4f} impact)')

# Test 5: Validate
print('\n5. VALIDATION:')
val = calc.validate(omega=0.75, S=0.85)
print(f'   Can release: {val["can_release"]}')
print(f'   Can proceed: {val["can_proceed"]}')

# Test 6: Weight Learning
print('\n6. WEIGHT LEARNING:')
outcomes = [
    {'components': {'R': 0.9, 'C': 0.8, 'P': 0.7, 'S': 0.95, 'L': 0.6}, 'actual_quality': 0.88, 'success': True},
    {'components': {'R': 0.7, 'C': 0.6, 'P': 0.5, 'S': 0.70, 'L': 0.3}, 'actual_quality': 0.55, 'success': False},
]
learn = calc.learn_weights(outcomes)
print(f'   Old weights: {learn["old_weights"]}')
print(f'   New weights: {learn["new_weights"]}')

print('\n✅ P6-OMEGA Integration Complete!')
