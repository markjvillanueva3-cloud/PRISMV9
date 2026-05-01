import os, json, glob

base = r'C:\PRISM\data\materials'
total = 0
by_group = {}

for group_dir in sorted(os.listdir(base)):
    group_path = os.path.join(base, group_dir)
    if not os.path.isdir(group_path):
        continue
    count = 0
    for jf in glob.glob(os.path.join(group_path, '*_verified.json')):
        try:
            data = json.loads(open(jf, encoding='utf-8').read())
            mats = data.get('materials', [])
            count += len(mats)
        except:
            pass
    by_group[group_dir] = count
    total += count

print(f"TOTAL MATERIALS: {total}")
for g, c in sorted(by_group.items()):
    print(f"  {g}: {c}")
