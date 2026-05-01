import os, json, glob

base = r'C:\PRISM\data\materials'
total_files = 0
total_materials = 0
groups = {}

for group_dir in sorted(os.listdir(base)):
    group_path = os.path.join(base, group_dir)
    if not os.path.isdir(group_path):
        if group_dir.endswith('.json'):
            total_files += 1
        continue
    
    files = [f for f in os.listdir(group_path) if f.endswith('.json') and f != 'index.json']
    mat_count = 0
    file_issues = []
    
    for f in files:
        fp = os.path.join(group_path, f)
        total_files += 1
        try:
            data = json.loads(open(fp, encoding='utf-8').read())
            mats = data.get('materials', [])
            mat_count += len(mats)
            
            # Check data quality
            for m in mats[:2]:  # sample first 2
                has_kienzle = 'kienzle' in m and m['kienzle'].get('kc1_1')
                has_taylor = 'taylor' in m and m['taylor'].get('C')
                has_physical = 'physical' in m and m['physical'].get('density')
                if not (has_kienzle and has_taylor and has_physical):
                    file_issues.append(f"{f}: missing {'kienzle' if not has_kienzle else 'taylor' if not has_taylor else 'physical'}")
        except Exception as e:
            file_issues.append(f"{f}: PARSE ERROR {e}")
    
    total_materials += mat_count
    groups[group_dir] = {'files': len(files), 'materials': mat_count, 'issues': file_issues}

print(f"TOTAL FILES: {total_files}")
print(f"TOTAL MATERIALS: {total_materials}")
print(f"\nBY GROUP:")
for g, info in sorted(groups.items()):
    status = "OK" if not info['issues'] else f"ISSUES: {len(info['issues'])}"
    print(f"  {g}: {info['files']} files, {info['materials']} materials [{status}]")
    for issue in info['issues'][:3]:
        print(f"    ! {issue}")

# Now check machines
machines_path = r'C:\PRISM\extracted\machines'
if os.path.exists(machines_path):
    mach_files = []
    for root, dirs, files in os.walk(machines_path):
        mach_files.extend([os.path.join(root, f) for f in files if f.endswith('.json')])
    print(f"\nMACHINES: {len(mach_files)} JSON files in {machines_path}")
    total_machines = 0
    for f in mach_files[:5]:
        try:
            data = json.loads(open(f, encoding='utf-8').read())
            if isinstance(data, list):
                total_machines += len(data)
                print(f"  {os.path.basename(f)}: {len(data)} machines (list)")
            elif 'machines' in data:
                total_machines += len(data['machines'])
                print(f"  {os.path.basename(f)}: {len(data['machines'])} machines")
            else:
                print(f"  {os.path.basename(f)}: unknown format, keys={list(data.keys())[:5]}")
        except Exception as e:
            print(f"  {os.path.basename(f)}: ERROR {e}")
    print(f"  (sampled 5 files, found {total_machines} machines so far)")
else:
    print(f"\nMACHINES: PATH NOT FOUND {machines_path}")

# Check alarms
alarms_path = r'C:\PRISM\extracted\controllers'
if os.path.exists(alarms_path):
    alarm_files = []
    for root, dirs, files in os.walk(alarms_path):
        alarm_files.extend([os.path.join(root, f) for f in files if f.endswith('.json')])
    print(f"\nALARMS: {len(alarm_files)} JSON files in {alarms_path}")
    for f in alarm_files[:3]:
        try:
            data = json.loads(open(f, encoding='utf-8').read())
            if isinstance(data, list):
                print(f"  {os.path.basename(f)}: {len(data)} entries (list)")
            elif 'alarms' in data:
                print(f"  {os.path.basename(f)}: {len(data['alarms'])} alarms")
            else:
                print(f"  {os.path.basename(f)}: keys={list(data.keys())[:5]}")
        except Exception as e:
            print(f"  {os.path.basename(f)}: ERROR {e}")
else:
    print(f"\nALARMS: PATH NOT FOUND {alarms_path}")
