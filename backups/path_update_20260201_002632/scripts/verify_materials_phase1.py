"""
PRISM Phase 1 Materials Database Verification Script
Audits material count, parameter coverage, and critical physics parameters
"""

import json
import os
from pathlib import Path
from collections import defaultdict

base_path = Path('C:/PRISM/data/materials')
categories = ['P_STEELS', 'M_STAINLESS', 'K_CAST_IRON', 'N_NONFERROUS', 'S_SUPERALLOYS', 'H_HARDENED', 'X_SPECIALTY']

def count_params(obj, prefix=''):
    """Recursively count parameters in a material record"""
    count = 0
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.startswith('_'):
                continue
            if isinstance(value, dict):
                count += count_params(value, f'{prefix}.{key}')
            elif isinstance(value, list):
                count += 1
            else:
                count += 1
    return count

def get_param_keys(obj, prefix='', keys=None):
    """Get all parameter keys in a material record"""
    if keys is None:
        keys = set()
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key.startswith('_'):
                continue
            full_key = f'{prefix}.{key}' if prefix else key
            if isinstance(value, dict):
                get_param_keys(value, full_key, keys)
            else:
                keys.add(full_key)
    return keys

results = {}
total_materials = 0
all_param_keys = set()

critical_params = {
    'kienzle.kc1_1': {'present': 0, 'missing': 0},
    'kienzle.mc': {'present': 0, 'missing': 0},
    'johnson_cook.A': {'present': 0, 'missing': 0},
    'johnson_cook.B': {'present': 0, 'missing': 0},
    'johnson_cook.n': {'present': 0, 'missing': 0},
    'taylor.C': {'present': 0, 'missing': 0},
    'taylor.n': {'present': 0, 'missing': 0},
    'physical.density': {'present': 0, 'missing': 0},
    'physical.thermal_conductivity': {'present': 0, 'missing': 0},
    'mechanical.hardness.brinell': {'present': 0, 'missing': 0},
    'mechanical.tensile_strength.typical': {'present': 0, 'missing': 0},
    'mechanical.yield_strength.typical': {'present': 0, 'missing': 0},
    'recommendations.milling.speed.optimal': {'present': 0, 'missing': 0},
    'recommendations.milling.feed_per_tooth.optimal': {'present': 0, 'missing': 0},
    'machinability.aisi_rating': {'present': 0, 'missing': 0},
}

def check_nested(obj, path):
    """Check if a nested path exists and has a value"""
    parts = path.split('.')
    current = obj
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return current is not None

for cat in categories:
    cat_path = base_path / cat
    if not cat_path.exists():
        continue
    
    cat_materials = 0
    cat_params_list = []
    
    for file in cat_path.glob('*.json'):
        if file.name == 'index.json':
            continue
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'materials' in data:
                for mat in data['materials']:
                    cat_materials += 1
                    total_materials += 1
                    
                    # Count params for this material
                    param_count = count_params(mat)
                    cat_params_list.append(param_count)
                    
                    # Get all keys
                    keys = get_param_keys(mat)
                    all_param_keys.update(keys)
                    
                    # Check critical params
                    for param_path in critical_params.keys():
                        if check_nested(mat, param_path):
                            critical_params[param_path]['present'] += 1
                        else:
                            critical_params[param_path]['missing'] += 1
                            
        except Exception as e:
            print(f'Error in {file}: {e}')
    
    avg_params = sum(cat_params_list) / len(cat_params_list) if cat_params_list else 0
    results[cat] = {
        'count': cat_materials,
        'avg_params': avg_params,
        'min_params': min(cat_params_list) if cat_params_list else 0,
        'max_params': max(cat_params_list) if cat_params_list else 0
    }

# Print report
print('=' * 80)
print('PRISM PHASE 1 MATERIALS DATABASE VERIFICATION REPORT')
print('=' * 80)
print()
print(f'TOTAL MATERIALS: {total_materials}')
print(f'UNIQUE PARAMETER KEYS: {len(all_param_keys)}')
print()
print('BY CATEGORY:')
print('-' * 80)
print(f'{"Category":<20} {"Count":>10} {"Avg Params":>12} {"Min":>8} {"Max":>8}')
print('-' * 80)
for cat, data in sorted(results.items()):
    print(f'{cat:<20} {data["count"]:>10} {data["avg_params"]:>12.1f} {data["min_params"]:>8} {data["max_params"]:>8}')
print('-' * 80)
print(f'{"TOTAL":<20} {total_materials:>10}')
print()
print('CRITICAL PARAMETER COVERAGE (Required for Speed/Feed Calculator):')
print('-' * 80)
print(f'{"Parameter":<45} {"Present":>10} {"Missing":>10} {"Coverage":>10}')
print('-' * 80)
for param, counts in critical_params.items():
    total = counts['present'] + counts['missing']
    pct = (counts['present'] / total * 100) if total > 0 else 0
    status = 'OK' if pct >= 95 else 'WARN' if pct >= 50 else 'FAIL'
    print(f'{param:<45} {counts["present"]:>10} {counts["missing"]:>10} {pct:>8.1f}% {status}')
print()

# Summary assessment
kienzle_coverage = critical_params['kienzle.kc1_1']['present'] / total_materials * 100
jc_coverage = critical_params['johnson_cook.A']['present'] / total_materials * 100
taylor_coverage = critical_params['taylor.C']['present'] / total_materials * 100
milling_coverage = critical_params['recommendations.milling.speed.optimal']['present'] / total_materials * 100

print('PHASE 1 ASSESSMENT:')
print('-' * 80)
print(f'  Kienzle Parameters:    {kienzle_coverage:.1f}% coverage')
print(f'  Johnson-Cook Params:   {jc_coverage:.1f}% coverage')
print(f'  Taylor Parameters:     {taylor_coverage:.1f}% coverage')
print(f'  Milling Recommendations: {milling_coverage:.1f}% coverage')
print()

if kienzle_coverage >= 95 and jc_coverage >= 95 and taylor_coverage >= 95 and milling_coverage >= 95:
    print('STATUS: PHASE 1 COMPLETE - Materials database ready for calculator')
elif kienzle_coverage >= 80 and jc_coverage >= 80 and taylor_coverage >= 80:
    print('STATUS: PHASE 1 MOSTLY COMPLETE - Minor gaps to address')
else:
    print('STATUS: PHASE 1 NEEDS WORK - Significant gaps in critical parameters')
print()

# List top-level parameter groups
print('TOP-LEVEL PARAMETER GROUPS:')
print('-' * 80)
top_level = set()
for key in all_param_keys:
    top_level.add(key.split('.')[0])
for group in sorted(top_level):
    group_keys = [k for k in all_param_keys if k.startswith(group + '.') or k == group]
    print(f'  {group}: {len(group_keys)} parameters')
print()
print('=' * 80)
