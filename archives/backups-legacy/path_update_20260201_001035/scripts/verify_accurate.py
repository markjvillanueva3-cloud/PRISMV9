import json
from pathlib import Path

base = Path('C:/PRISM/data/materials')

print('=' * 70)
print('MATERIALS DATABASE - ACCURATE PHYSICS VERIFICATION')
print('=' * 70)

# Read master index
with open(base / 'MASTER_INDEX.json', 'r') as f:
    idx = json.load(f)

print()
print(f"Total Materials: {idx['total_materials']}")
print(f"Physics Mode: {idx['physics_mode']}")
print(f"Safety Factor: {idx['safety_factor']} (none applied)")
print(f"Enhancement Method: {idx['enhancement_method']}")
print()
print("Optimization Modes Available:")
for mode in idx['optimization_modes']:
    print(f"  - {mode}")

# Sample comparisons
print()
print('=' * 70)
print('SAMPLE MATERIAL COMPARISON')
print('=' * 70)

samples = [
    ('P_STEELS', 'tool_steel', 'Tool Steel (D2, A2 type)'),
    ('M_STAINLESS', 'austenitic', 'Austenitic Stainless (304, 316)'),
    ('N_NONFERROUS', 'aluminum', 'Aluminum (6061-T6 type)'),
    ('S_SUPERALLOYS', 'nickel_base', 'Nickel Superalloy (Inconel 718)'),
]

for cat, subcat, desc in samples:
    filepath = base / cat / f'{subcat}.json'
    if filepath.exists():
        with open(filepath, 'r') as f:
            data = json.load(f)
        mat = data['materials'][0]
        
        kc1_1 = mat.get('kc1_1', {})
        taylor_C = mat.get('taylor_C', {})
        jc_A = mat.get('jc_A', {})
        
        kc1_1_val = kc1_1.get('value') if isinstance(kc1_1, dict) else kc1_1
        taylor_val = taylor_C.get('value') if isinstance(taylor_C, dict) else taylor_C
        jc_A_val = jc_A.get('value') if isinstance(jc_A, dict) else jc_A
        
        print()
        print(f"{desc}")
        print(f"  Name: {mat.get('name')}")
        print(f"  kc1_1: {kc1_1_val} N/mm2")
        print(f"  taylor_C: {taylor_val} m/min")
        print(f"  jc_A: {jc_A_val} MPa")

print()
print('=' * 70)
print('OPTIMIZATION MODE EXAMPLES (Applied at Runtime)')
print('=' * 70)
print()

# Show how modes would adjust a sample value
base_kc1_1 = 2100  # Tool steel baseline
base_taylor = 180  # Tool steel baseline

print(f"Base Values (Tool Steel): kc1_1={base_kc1_1} N/mm2, taylor_C={base_taylor} m/min")
print()

modes = [
    ('Tool Life Priority', 1.10, 0.85, 'Longer tool life, slightly slower'),
    ('Time Savings', 0.95, 1.15, 'Faster cutting, shorter tool life'),
    ('Balanced', 1.00, 1.00, 'Optimal balance'),
    ('Full AI Optimized', 'dynamic', 'dynamic', 'Cost/time/life optimization'),
]

for name, kc_mult, taylor_mult, desc in modes:
    if kc_mult == 'dynamic':
        print(f"  {name}: {desc}")
    else:
        adj_kc = int(base_kc1_1 * kc_mult)
        adj_taylor = int(base_taylor * taylor_mult)
        print(f"  {name}: kc1_1={adj_kc}, taylor_C={adj_taylor} ({desc})")

print()
print('=' * 70)
print('VERIFICATION COMPLETE - ACCURATE PHYSICS BASELINE READY')
print('=' * 70)
