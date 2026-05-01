import json
from pathlib import Path

base = Path('C:/PRISM/data/materials_final')

# Read master index
with open(base / 'MASTER_INDEX.json', 'r') as f:
    idx = json.load(f)

print('=' * 70)
print('MATERIALS DATABASE VERIFICATION')
print('=' * 70)
print()
print('MASTER INDEX:')
print(f"  Total Materials: {idx['total_materials']}")
print(f"  Physics Complete: {idx['physics_complete']}")
print(f"  Safety Factor: {idx['safety_factor']}")

print()
print('By Category:')
for cat, data in sorted(idx['categories'].items()):
    print(f"  {cat}: {data['total']} materials, {data['enhanced']} enhanced")

# Full physics parameter audit
print()
print('PHYSICS PARAMETER AUDIT:')
total = 0
complete = 0
missing_kc = 0
missing_taylor = 0
missing_jc = 0

for cat_dir in base.iterdir():
    if not cat_dir.is_dir():
        continue
    for f in cat_dir.glob('*.json'):
        if f.name == 'index.json':
            continue
        with open(f, 'r') as fh:
            d = json.load(fh)
        for m in d.get('materials', []):
            total += 1
            has_kc = m.get('kc1_1') is not None
            has_taylor = m.get('taylor_C') is not None
            has_jc = m.get('jc_A') is not None
            
            if not has_kc:
                missing_kc += 1
            if not has_taylor:
                missing_taylor += 1
            if not has_jc:
                missing_jc += 1
            
            if has_kc and has_taylor and has_jc:
                complete += 1

print(f"  Total materials: {total}")
print(f"  Complete (all 3 physics): {complete}")
print(f"  Missing kc1_1: {missing_kc}")
print(f"  Missing taylor_C: {missing_taylor}")
print(f"  Missing jc_A: {missing_jc}")
print(f"  Coverage: {round(complete/total*100, 2)}%")

# Sample verification
print()
print('SAMPLE MATERIAL (P_STEELS/tool_steel):')
with open(base / 'P_STEELS' / 'tool_steel.json', 'r') as f:
    data = json.load(f)
mat = data['materials'][0]
print(f"  Name: {mat.get('name')}")
print(f"  ID: {mat.get('id')}")
print()
print("  Physics Parameters:")
print(f"    kc1_1: {mat.get('kc1_1')}")
print(f"    taylor_C: {mat.get('taylor_C')}")
print(f"    taylor_n: {mat.get('taylor_n')}")
print(f"    jc_A: {mat.get('jc_A')}")
print(f"    jc_B: {mat.get('jc_B')}")
print(f"    jc_n: {mat.get('jc_n')}")

print()
print('=' * 70)
if complete == total:
    print('VERIFICATION PASSED: 100% PHYSICS COVERAGE')
else:
    print(f'VERIFICATION FAILED: {total - complete} materials missing physics')
print('=' * 70)
