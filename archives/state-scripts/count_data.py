import json

# Count alarms in master database
for f in ['MASTER_ALARM_DATABASE.json', 'MASTER_ALARM_DATABASE_v3.json']:
    path = rf'C:\PRISM\extracted\controllers\{f}'
    try:
        data = json.loads(open(path, encoding='utf-8').read())
        if isinstance(data, list):
            print(f"{f}: {len(data)} alarms")
        elif isinstance(data, dict):
            if 'alarms' in data:
                print(f"{f}: {len(data['alarms'])} alarms")
            elif 'controller_families' in data:
                total = sum(len(fam.get('alarms', [])) for fam in data['controller_families'])
                families = len(data['controller_families'])
                print(f"{f}: {total} alarms across {families} families")
            else:
                print(f"{f}: dict with keys: {list(data.keys())[:5]}")
    except Exception as e:
        print(f"{f}: ERROR {e}")

# Count machines
for f in ['PRISM_LATHE_MACHINE_DB.json', 'PRISM_MACHINE_3D_MODEL_DATABASE_V2.json']:
    path = rf'C:\PRISM\extracted\machines\CORE\{f}'
    try:
        data = json.loads(open(path, encoding='utf-8').read())
        if isinstance(data, list):
            print(f"\n{f}: {len(data)} machines")
        elif isinstance(data, dict):
            print(f"\n{f}: dict keys: {list(data.keys())[:5]}")
    except Exception as e:
        print(f"\n{f}: ERROR {e}")
