#!/usr/bin/env python3
"""Quick analysis of 4340 variants"""
import re

with open(r'C:\\PRISM\EXTRACTED\materials_complete\P_STEELS\P_STEELS_complete.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all 4340 variants
pattern = r'"name":\s*"([^"]*4340[^"]*)"'
matches = re.findall(pattern, content)

print('='*70)
print('AISI 4340 CONDITION VARIANTS:')
print('='*70)
for i, m in enumerate(sorted(set(matches)), 1):
    print(f'{i:2}. {m}')
print('='*70)
print(f'Total 4340 variants: {len(set(matches))}')
print()

# Also count total unique materials
pattern2 = r'"name":\s*"([^"]+)"'
all_names = re.findall(pattern2, content)
unique_names = set(all_names)
print(f'Total unique materials in P_STEELS: {len(unique_names)}')

# Count by condition type
conditions = {}
for name in unique_names:
    if 'Annealed' in name:
        conditions['Annealed'] = conditions.get('Annealed', 0) + 1
    elif 'Normalized' in name:
        conditions['Normalized'] = conditions.get('Normalized', 0) + 1
    elif 'Q&T' in name:
        conditions['Q&T'] = conditions.get('Q&T', 0) + 1
    elif 'Hardened' in name:
        conditions['Hardened'] = conditions.get('Hardened', 0) + 1
    elif 'Cold' in name:
        conditions['Cold Worked'] = conditions.get('Cold Worked', 0) + 1
    elif 'Carburized' in name:
        conditions['Carburized'] = conditions.get('Carburized', 0) + 1

print('\nCondition Distribution:')
for k, v in sorted(conditions.items(), key=lambda x: -x[1]):
    print(f'  {k}: {v}')
