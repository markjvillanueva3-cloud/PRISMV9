"""
PRISM Phase 1 - Detailed Gap Analysis
Identifies WHICH materials are missing critical parameters
"""

import json
from pathlib import Path
from collections import defaultdict

base_path = Path('C:/PRISM/data/materials')
categories = ['P_STEELS', 'M_STAINLESS', 'K_CAST_IRON', 'N_NONFERROUS', 'S_SUPERALLOYS', 'H_HARDENED', 'X_SPECIALTY']

def check_nested(obj, path):
    """Check if a nested path exists and has a value"""
    parts = path.split('.')
    current = obj
    for part in parts:
        if not isinstance(current, dict) or part not in current:
            return False
        current = current[part]
    return current is not None

# Track missing by category and subcategory
missing_by_cat = defaultdict(lambda: defaultdict(list))
complete_by_cat = defaultdict(lambda: defaultdict(list))

critical_params = [
    'kienzle.kc1_1',
    'kienzle.mc', 
    'johnson_cook.A',
    'taylor.C',
    'recommendations.milling.speed.optimal'
]

for cat in categories:
    cat_path = base_path / cat
    if not cat_path.exists():
        continue
    
    for file in cat_path.glob('*.json'):
        if file.name == 'index.json':
            continue
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            subcategory = file.stem
            
            if 'materials' in data:
                for mat in data['materials']:
                    mat_id = mat.get('id', 'unknown')
                    mat_name = mat.get('name', 'unknown')
                    
                    # Check all critical params
                    missing = []
                    for param in critical_params:
                        if not check_nested(mat, param):
                            missing.append(param)
                    
                    if missing:
                        missing_by_cat[cat][subcategory].append({
                            'id': mat_id,
                            'name': mat_name,
                            'missing': missing
                        })
                    else:
                        complete_by_cat[cat][subcategory].append(mat_id)
                            
        except Exception as e:
            print(f'Error in {file}: {e}')

# Print report
print('=' * 80)
print('PHASE 1 DETAILED GAP ANALYSIS')
print('=' * 80)
print()

total_missing = 0
total_complete = 0

for cat in categories:
    cat_missing = sum(len(v) for v in missing_by_cat[cat].values())
    cat_complete = sum(len(v) for v in complete_by_cat[cat].values())
    total_missing += cat_missing
    total_complete += cat_complete
    
    print(f'\n{cat}:')
    print(f'  Complete: {cat_complete}, Missing critical params: {cat_missing}')
    
    if missing_by_cat[cat]:
        print('  Subcategories with gaps:')
        for subcat, materials in sorted(missing_by_cat[cat].items()):
            # Count what's missing
            missing_counts = defaultdict(int)
            for m in materials:
                for param in m['missing']:
                    missing_counts[param] += 1
            
            print(f'    {subcat}: {len(materials)} materials missing params')
            for param, count in sorted(missing_counts.items()):
                print(f'      - {param}: {count} missing')

print()
print('=' * 80)
print(f'TOTALS: {total_complete} complete, {total_missing} with gaps')
print(f'Coverage: {total_complete / (total_complete + total_missing) * 100:.1f}%')
print('=' * 80)

# Show which param is most commonly missing
print('\nMOST COMMONLY MISSING PARAMETERS:')
all_missing_counts = defaultdict(int)
for cat in categories:
    for subcat, materials in missing_by_cat[cat].items():
        for m in materials:
            for param in m['missing']:
                all_missing_counts[param] += 1

for param, count in sorted(all_missing_counts.items(), key=lambda x: -x[1]):
    print(f'  {param}: {count} materials')

# Sample of materials missing ALL critical params
print('\nSAMPLE: Materials missing ALL critical params (first 10):')
count = 0
for cat in categories:
    for subcat, materials in missing_by_cat[cat].items():
        for m in materials:
            if len(m['missing']) >= 4:  # Missing most params
                print(f'  {m["id"]}: {m["name"]} - {cat}/{subcat}')
                count += 1
                if count >= 10:
                    break
        if count >= 10:
            break
    if count >= 10:
        break
