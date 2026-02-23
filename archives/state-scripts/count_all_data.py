import os, json

# Count alarms
alarm_dirs = [
    r'C:\PRISM\extracted\controllers\alarms_verified',
    r'C:\PRISM\extracted\controllers\alarms_accurate', 
    r'C:\PRISM\extracted\controllers\alarms'
]

for d in alarm_dirs:
    total = 0
    tier = os.path.basename(d)
    for f in os.listdir(d):
        if f.endswith('.json'):
            try:
                data = json.loads(open(os.path.join(d, f), encoding='utf-8').read())
                if isinstance(data, list):
                    total += len(data)
                elif isinstance(data, dict) and 'alarms' in data:
                    total += len(data['alarms'])
                elif isinstance(data, dict):
                    total += len(data)
            except:
                pass
    print(f"{tier}: {total} alarms")

# Count machines
print("\n--- MACHINES ---")
mpath = r'C:\PRISM\extracted\machines\CORE\PRISM_LATHE_MACHINE_DB.json'
data = json.loads(open(mpath, encoding='utf-8').read())
print(f"Lathe DB: {len(data)} machines")

# Count tools
print("\n--- TOOLS ---")
for f in os.listdir(r'C:\PRISM\extracted\tools'):
    fpath = os.path.join(r'C:\PRISM\extracted\tools', f)
    size = os.path.getsize(fpath)
    print(f"  {f}: {size//1024}KB")

# Master alarm DB
print("\n--- MASTER ALARM DB ---")
mpath2 = r'C:\PRISM\extracted\controllers\MASTER_ALARM_DATABASE_v3.json'
data2 = json.loads(open(mpath2, encoding='utf-8').read())
if isinstance(data2, list):
    print(f"Master v3: {len(data2)} entries")
elif isinstance(data2, dict):
    total_alarms = sum(len(v) if isinstance(v, list) else 1 for v in data2.values())
    print(f"Master v3: {len(data2)} families, {total_alarms} total entries")
