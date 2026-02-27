import json
import os
import re

BASE_PATH = r'C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\controllers\alarms'

print('='*70)
print('COMPREHENSIVE AUDIT - Alarm Data Quality Analysis')
print('='*70)
print()

families = ['FANUC', 'SIEMENS', 'HAAS', 'MAZAK', 'OKUMA', 'HEIDENHAIN', 
            'MITSUBISHI', 'BROTHER', 'HURCO', 'FAGOR', 'DMG_MORI', 'DOOSAN']

# Patterns that indicate generic/generated alarms
generic_patterns = [
    r'ALARM \d+$',
    r'PROGRAM ALARM \d+$',
    r'SERVO ALARM \d+$', 
    r'SPINDLE ALARM \d+$',
    r'ATC ALARM \d+$',
    r'SYSTEM ALARM \d+$',
    r'OEM ALARM \d+$',
    r'NC ALARM \d+$',
    r'NC ERROR \d+$',
    r'PLC ALARM \d+$',
    r'ALARM {0,1}\d+$',
    r'ERROR \d+$',
    r'MSG \d+$',
]

def is_generic(name, description):
    """Check if alarm appears to be generic/generated"""
    for pattern in generic_patterns:
        if re.search(pattern, name):
            return True
    # Also check if description is same as name or very generic
    if description == name.lower() or 'alarm ' in description.lower() and description.count(' ') < 3:
        return True
    return False

total_alarms = 0
total_specific = 0
total_generic = 0

print('ANALYSIS BY FAMILY:')
print('-'*70)
print(f'{"Family":<15} {"Total":>8} {"Specific":>10} {"Generic":>10} {"% Generic":>12}')
print('-'*70)

for fam in families:
    filepath = os.path.join(BASE_PATH, f'{fam}_ALARMS_COMPLETE.json')
    if not os.path.exists(filepath):
        print(f'{fam:<15} FILE NOT FOUND')
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    alarms = data.get('alarms', [])
    specific = 0
    generic = 0
    
    for a in alarms:
        name = a.get('name', '')
        desc = a.get('description', '')
        if is_generic(name, desc):
            generic += 1
        else:
            specific += 1
    
    total_alarms += len(alarms)
    total_specific += specific
    total_generic += generic
    
    pct = generic/len(alarms)*100 if len(alarms) > 0 else 0
    print(f'{fam:<15} {len(alarms):>8} {specific:>10} {generic:>10} {pct:>11.1f}%')

print('-'*70)
pct_total = total_generic/total_alarms*100 if total_alarms > 0 else 0
print(f'{"TOTAL":<15} {total_alarms:>8} {total_specific:>10} {total_generic:>10} {pct_total:>11.1f}%')
print()

# Sample specific vs generic alarms
print('='*70)
print('SAMPLE SPECIFIC ALARMS (Real Data):')
print('-'*70)

for fam in ['FANUC', 'SIEMENS', 'HAAS']:
    filepath = os.path.join(BASE_PATH, f'{fam}_ALARMS_COMPLETE.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f'\n{fam}:')
    count = 0
    for a in data.get('alarms', []):
        name = a.get('name', '')
        desc = a.get('description', '')
        if not is_generic(name, desc) and count < 5:
            print(f"  {a.get('code')}: {name}")
            print(f"       {desc}")
            count += 1

print()
print('='*70)
print('SAMPLE GENERIC ALARMS (Generated/Placeholder):')
print('-'*70)

for fam in ['FANUC', 'SIEMENS', 'HAAS']:
    filepath = os.path.join(BASE_PATH, f'{fam}_ALARMS_COMPLETE.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f'\n{fam}:')
    count = 0
    for a in data.get('alarms', []):
        name = a.get('name', '')
        desc = a.get('description', '')
        if is_generic(name, desc) and count < 5:
            print(f"  {a.get('code')}: {name}")
            print(f"       {desc}")
            count += 1

print()
print('='*70)
print('AUDIT CONCLUSION')
print('='*70)
print()
print(f'Total Alarms:     {total_alarms}')
print(f'Specific (Real):  {total_specific} ({total_specific/total_alarms*100:.1f}%)')
print(f'Generic (Filler): {total_generic} ({total_generic/total_alarms*100:.1f}%)')
print()

if total_generic > total_specific:
    print('WARNING: More than 50% of alarms are generic placeholders!')
    print('         Database requires significant enhancement with real data.')
elif total_generic > total_alarms * 0.3:
    print('CAUTION: More than 30% of alarms are generic placeholders.')
    print('         Database should be enhanced with real alarm data.')
else:
    print('ACCEPTABLE: Less than 30% generic alarms.')
