import os, json

# Count JSON files and entries in each data location
locations = {
    'data/machines': r'C:\PRISM\data\machines',
    'extracted/machines': r'C:\PRISM\extracted\machines',
    'data/controllers': r'C:\PRISM\data\controllers',
    'extracted/controllers': r'C:\PRISM\extracted\controllers',
    'data/tools': r'C:\PRISM\data\tools',
    'extracted/tools': r'C:\PRISM\extracted\tools',
    'data/formulas': r'C:\PRISM\data\formulas' if os.path.exists(r'C:\PRISM\data\formulas') else None,
}

for name, loc in locations.items():
    if loc is None or not os.path.exists(loc):
        print(f"{name}: NOT FOUND")
        continue
    json_count = 0
    entry_count = 0
    for root, dirs, files in os.walk(loc):
        for f in files:
            if f.endswith('.json') and f not in ('index.json', 'MASTER_INDEX.json', 'schema.json'):
                json_count += 1
                fp = os.path.join(root, f)
                try:
                    data = json.loads(open(fp, encoding='utf-8').read())
                    if isinstance(data, list):
                        entry_count += len(data)
                    elif 'materials' in data:
                        entry_count += len(data['materials'])
                    elif 'machines' in data:
                        entry_count += len(data['machines'])
                    elif 'alarms' in data:
                        entry_count += len(data['alarms'])
                    elif 'controllers' in data:
                        entry_count += len(data.get('controllers', []))
                    elif 'tools' in data:
                        entry_count += len(data['tools'])
                    elif 'procedures_by_category' in data:
                        entry_count += sum(len(v) for v in data['procedures_by_category'].values() if isinstance(v, list))
                    else:
                        entry_count += 1
                except:
                    pass
    print(f"{name}: {json_count} files, ~{entry_count} entries")

# Also check FORMULA_REGISTRY
fr = r'C:\PRISM\data\FORMULA_REGISTRY.json'
if os.path.exists(fr):
    data = json.loads(open(fr, encoding='utf-8').read())
    if isinstance(data, dict):
        print(f"\nFORMULA_REGISTRY.json: {len(data)} top-level keys")
        for k, v in list(data.items())[:5]:
            if isinstance(v, list):
                print(f"  {k}: {len(v)} entries")
            elif isinstance(v, dict):
                print(f"  {k}: dict with {len(v)} keys")
