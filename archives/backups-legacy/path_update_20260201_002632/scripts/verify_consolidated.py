import json
from pathlib import Path

base = Path('C:/PRISM/data/materials_consolidated')

# Check master index
idx = json.load(open(base / '_MASTER_INDEX.json'))
print('=== MASTER INDEX ===')
print(f"Total Materials: {idx['total_materials']}")
print(f"Categories: {len(idx['categories'])}")

for cat, info in idx['categories'].items():
    print(f"  {cat}: {info['count']} ({len(info['subcategories'])} subcategories)")

# Check a sample material for parameter coverage
print('\n=== SAMPLE MATERIAL (X_SPECIALTY/composites) ===')
data = json.load(open(base / 'X_SPECIALTY' / 'composites.json'))
mat = data['materials'][0]
print(f"Name: {mat['name']}")
print(f"ID: {mat['id']}")
print(f"Total Parameters: {len(mat.keys())}")

# Check which key params exist
key_params = ['tensile_strength', 'yield_strength', 'hardness_hb', 'density', 
              'kc1_1', 'taylor_C', 'taylor_n', 'jc_A', 'jc_B', 'jc_n', 
              'thermal_conductivity', 'specific_heat', 'coolant_compatibility']
print('\nKey Parameter Coverage:')
found = 0
for p in key_params:
    if p in mat:
        found += 1
        val = mat[p]
        if isinstance(val, dict) and 'value' in val:
            print(f"  [OK] {p}: {val['value']}")
        else:
            print(f"  [OK] {p}: (complex)")
    else:
        print(f"  [--] {p}: MISSING")

print(f"\nCoverage: {found}/{len(key_params)} key params")

# Check category index structure
print('\n=== CATEGORY INDEX STRUCTURE ===')
cat_idx = json.load(open(base / '_CATEGORY_INDEX.json'))
for cat, info in cat_idx['categories'].items():
    print(f"\n{cat}:")
    for subcat, subinfo in info['subcategories'].items():
        print(f"  {subcat}: {subinfo['count']} materials -> {subinfo['file']}")
