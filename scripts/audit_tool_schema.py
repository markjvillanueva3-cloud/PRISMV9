import json, os
from collections import Counter

results = {}
tool_dir = r"C:\PRISM\data\tools"
for f in sorted(os.listdir(tool_dir)):
    if not f.endswith('.json'):
        continue
    fpath = os.path.join(tool_dir, f)
    try:
        with open(fpath, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        if isinstance(data, list):
            tools = data
        elif isinstance(data, dict) and 'tools' in data:
            tools = data['tools']
        elif isinstance(data, dict):
            tools = [data]
        else:
            tools = []
        
        keys = Counter()
        for t in tools:
            if isinstance(t, dict):
                for k in t.keys():
                    keys[k] += 1
        
        results[f] = {'count': len(tools), 'keys': dict(keys.most_common(30))}
    except Exception as e:
        results[f] = {'error': str(e)}

for fname, info in results.items():
    if 'error' in info:
        print(f"ERROR {fname}: {info['error']}")
    else:
        print(f"\n=== {fname}: {info['count']} entries ===")
        for k, v in info['keys'].items():
            coverage = round(100 * v / info['count'])
            print(f"  {k}: {v}/{info['count']} ({coverage}%)")

# Also check for the key vendor/manufacturer split
print("\n\n=== VENDOR vs MANUFACTURER ANALYSIS ===")
for f in sorted(os.listdir(tool_dir)):
    if not f.endswith('.json'):
        continue
    fpath = os.path.join(tool_dir, f)
    try:
        with open(fpath, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        if isinstance(data, list):
            tools = data
        elif isinstance(data, dict) and 'tools' in data:
            tools = data['tools']
        else:
            continue
        
        has_vendor = sum(1 for t in tools if isinstance(t, dict) and 'vendor' in t)
        has_mfr = sum(1 for t in tools if isinstance(t, dict) and 'manufacturer' in t)
        has_both = sum(1 for t in tools if isinstance(t, dict) and 'vendor' in t and 'manufacturer' in t)
        has_neither = sum(1 for t in tools if isinstance(t, dict) and 'vendor' not in t and 'manufacturer' not in t)
        total = len(tools)
        print(f"  {f}: vendor={has_vendor} manufacturer={has_mfr} both={has_both} neither={has_neither} total={total}")
    except:
        pass
