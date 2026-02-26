#!/usr/bin/env python3
"""
PRISM Quick Queries - Pre-built data analysis queries

Usage:
    python quick_queries.py missing_kc1_1 <json_dir>
    python quick_queries.py incomplete <json_dir>
    python quick_queries.py categories <json_dir>
    python quick_queries.py hardness <json_dir>
    python quick_queries.py duplicates <json_dir>
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

def load_materials(json_dir):
    materials = []
    for json_file in Path(json_dir).glob('**/*.json'):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            items = data if isinstance(data, list) else data.get('materials', [])
            materials.extend(items)
        except: pass
    return materials

def missing_kc1_1(json_dir):
    """Find materials missing Kienzle kc1.1 coefficient."""
    materials = load_materials(json_dir)
    missing = [m for m in materials if not m.get('kc1_1')]
    print(f"\nMaterials Missing kc1.1: {len(missing)} / {len(materials)} ({len(missing)/len(materials)*100:.1f}%)\n")
    for m in missing[:30]:
        print(f"  {m.get('id', 'N/A'):20} {m.get('name', 'N/A')[:35]}")
    if len(missing) > 30: print(f"\n  ... and {len(missing) - 30} more")

def incomplete(json_dir):
    """Find materials missing critical fields."""
    materials = load_materials(json_dir)
    critical = ['kc1_1', 'mc', 'density', 'hardness_brinell', 'tensile_strength']
    
    incomplete = []
    for m in materials:
        missing = [f for f in critical if not m.get(f)]
        if missing:
            incomplete.append({'id': m.get('id'), 'name': m.get('name'), 'missing': missing})
    
    incomplete.sort(key=lambda x: -len(x['missing']))
    print(f"\nIncomplete: {len(incomplete)} / {len(materials)}\n")
    for m in incomplete[:25]:
        print(f"  {m['id']:20} Missing: {', '.join(m['missing'])}")

def categories(json_dir):
    """Summarize by ISO 513 category."""
    materials = load_materials(json_dir)
    by_cat = defaultdict(lambda: {'count': 0, 'with_kc1_1': 0})
    
    for m in materials:
        cat = m.get('category', 'Unknown')
        by_cat[cat]['count'] += 1
        if m.get('kc1_1'): by_cat[cat]['with_kc1_1'] += 1
    
    print(f"\n{'Category':<15} {'Count':>8} {'kc1.1':>8} {'%':>8}")
    print("-" * 45)
    for cat in sorted(by_cat.keys()):
        d = by_cat[cat]
        pct = f"{d['with_kc1_1']/d['count']*100:.0f}%" if d['count'] > 0 else "N/A"
        print(f"{cat:<15} {d['count']:>8} {d['with_kc1_1']:>8} {pct:>8}")

def hardness(json_dir):
    """Show hardness distribution."""
    materials = load_materials(json_dir)
    ranges = [('0-100 HB', 0, 100), ('100-200 HB', 100, 200), ('200-300 HB', 200, 300),
              ('300-400 HB', 300, 400), ('400+ HB', 400, 10000)]
    dist = {r[0]: 0 for r in ranges}
    unknown = 0
    
    for m in materials:
        hb = m.get('hardness_brinell')
        if hb is None: unknown += 1
        else:
            for name, low, high in ranges:
                if low <= hb < high: dist[name] += 1; break
    
    print(f"\nHardness Distribution:")
    for name, _, _ in ranges:
        bar = '█' * (dist[name] // 5)
        print(f"  {name:<15} {dist[name]:>5}  {bar}")
    print(f"  {'Unknown':<15} {unknown:>5}")

def duplicates(json_dir):
    """Find duplicate IDs or names."""
    materials = load_materials(json_dir)
    by_id = defaultdict(list)
    by_name = defaultdict(list)
    
    for m in materials:
        by_id[m.get('id', '')].append(m)
        by_name[m.get('name', '')].append(m)
    
    dup_ids = {k: v for k, v in by_id.items() if len(v) > 1 and k}
    dup_names = {k: v for k, v in by_name.items() if len(v) > 1 and k}
    
    print(f"\nDuplicate IDs: {len(dup_ids)}")
    for id_, items in list(dup_ids.items())[:10]:
        print(f"  {id_}: {len(items)} occurrences")
    print(f"\nDuplicate Names: {len(dup_names)}")
    for name, items in list(dup_names.items())[:10]:
        print(f"  {name[:40]}: {len(items)} occurrences")

def main():
    if len(sys.argv) < 3:
        print(__doc__); return
    
    cmd, json_dir = sys.argv[1], sys.argv[2]
    cmds = {'missing_kc1_1': missing_kc1_1, 'incomplete': incomplete, 
            'categories': categories, 'hardness': hardness, 'duplicates': duplicates}
    
    if cmd in cmds: cmds[cmd](json_dir)
    else: print(__doc__)

if __name__ == '__main__':
    main()
