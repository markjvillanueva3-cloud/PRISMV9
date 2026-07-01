#!/usr/bin/env python3
"""Extract Tungaloy drill dimensions from GC_2023-2024_G_Drilling.pdf"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/GC_2023-2024_G_Drilling.pdf')

tools = []

def pn(s):
    s = str(s).strip()
    if not s or s == '-' or (len(s) == 1 and ord(s[0]) > 127):
        return None
    s = re.sub(r'[^\d.\-]', '', s)
    if not s:
        return None
    try:
        return float(s)
    except:
        return None

# Scan drill sections: 2 Effective Drill (p17-48), SolidDrill (p49-66), Deep Hole (p99-171)
for page_idx in range(16, 172):
    page = doc[page_idx]
    tables = page.find_tables()
    for table in tables:
        data = table.extract()
        if not data or len(data) < 2:
            continue
        header = ' '.join(str(c).strip() if c else '' for c in data[0]).upper()
        if 'DC' not in header and 'DCONMS' not in header:
            continue

        for ri in range(0, len(data)):
            row = data[ri]
            first = str(row[0]).strip() if row[0] else ''
            if not first:
                continue

            parts = first.split()
            if len(parts) > 3 and all(str(c).strip() == '' for c in row[1:] if c):
                vals = parts
            else:
                vals = [str(c).strip() if c else '' for c in row]

            desig = vals[0]

            # Tungaloy drill designations: DMP*, DSX*, DGS*, SGS*, DGM*, DTX*, DTE*, etc.
            if not re.match(r'^(D[GMSTX]|SG[SMN]|T[DE]|DR)', desig):
                continue

            nums = []
            for v in vals[1:]:
                if v in ('\x01', '\uf06e', '\uf075'):
                    continue
                if re.match(r'^[A-Za-z]', v):
                    continue
                if '°' in v or 'º' in v:
                    continue
                n = pn(v)
                if n is not None:
                    nums.append(n)

            if len(nums) < 2:
                continue

            rec = {
                'designation': desig,
                'manufacturer': 'Tungaloy',
                'type': 'drill',
                'page': page_idx + 1,
            }

            # Drill columns typically: DC, DCONMS, LU (flute len), LF (OAL), SIG (point angle)
            if len(nums) >= 2:
                rec['cutting_diameter_mm'] = nums[0]
                rec['shank_diameter_mm'] = nums[1]

            # Remaining: find LOC and OAL
            remaining = nums[2:]
            if remaining:
                large_vals = sorted([v for v in remaining if v >= 20], reverse=True)
                if len(large_vals) >= 2:
                    rec['overall_length_mm'] = large_vals[0]
                    rec['flute_length_mm'] = large_vals[1]
                elif len(large_vals) == 1:
                    rec['overall_length_mm'] = large_vals[0]

                # Point angle (typically 130-180)
                angles = [v for v in remaining if 100 <= v <= 180]
                if angles:
                    rec['point_angle_deg'] = angles[0]

            if rec.get('cutting_diameter_mm') and (rec.get('overall_length_mm') or rec.get('flute_length_mm')):
                tools.append(rec)

# Deduplicate
seen = {}
for t in tools:
    d = t['designation']
    if d not in seen:
        seen[d] = t
unique = list(seen.values())

print(f"Unique drills: {len(unique)}")
dias = [t['cutting_diameter_mm'] for t in unique]
if dias:
    print(f"Diameter range: {min(dias)}-{max(dias)}mm")

with_loc = [t for t in unique if t.get('flute_length_mm')]
print(f"With LOC data: {len(with_loc)}")

with open('mcp-server/src/data/tungaloy-drills-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:15]:
    print(f"  {sample['designation']}: D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')} angle={sample.get('point_angle_deg')}")
