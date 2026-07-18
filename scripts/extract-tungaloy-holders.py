#!/usr/bin/env python3
"""Extract Tungaloy holder dimensions from GC_2023-2024_US_Tooling.pdf"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/GC_2023-2024_US_Tooling.pdf')

holders = []

def pn(s):
    s = str(s).strip().rstrip(')')
    if not s or s == '-':
        return None
    try:
        return float(s)
    except:
        return None

def to_mm(v, inch):
    if v is None:
        return None
    return round(v * 25.4, 2) if inch else v

ER_BORE = {
    'ER11': (0.5, 7), 'ER16': (0.5, 10), 'ER20': (1, 13),
    'ER25': (1, 16), 'ER32': (2, 20), 'ER40': (3, 26), 'ER50': (3, 34)
}

for page_idx in range(70, 101):
    page = doc[page_idx]
    tables = page.find_tables()
    for table in tables:
        data = table.extract()
        if not data or len(data) < 2:
            continue
        h0 = ' '.join(str(c).strip() if c else '' for c in data[0]).upper()
        if 'METRIC' not in h0 and 'INCH' not in h0:
            continue
        is_inch = 'INCH' in h0
        cols_raw = h0.replace('METRIC', '').replace('INCH', '').replace('(MM)', '').strip()
        cols = [c for c in re.split(r'\s+', cols_raw) if c]

        for ri in range(1, len(data)):
            row = data[ri]
            first = str(row[0]).strip() if row[0] else ''
            if not first:
                continue
            parts = first.split()
            if len(parts) > 3 and all(str(c).strip() == '' for c in row[1:] if c):
                vals = parts
            else:
                vals = [str(c).strip() if c else '' for c in row]

            desig = re.sub(r'\s*\(\d+\)\s*$', '', vals[0]).strip()
            if not any(k in desig for k in ['HSK', 'CAT', 'BT']):
                continue

            tm = re.match(r'(HSK[AEF]M?\d+|CAT\d+|BT\d+)', desig)
            if not tm:
                continue
            raw = tm.group(1)
            taper = f"HSK-{raw[3:]}" if 'HSK' in raw else raw

            ht = 'other'
            collet = None
            if 'ER' in desig and re.search(r'ER\d', desig):
                ht = 'ER'
                em = re.search(r'ER(\d+)', desig)
                if em:
                    collet = f"ER{em.group(1)}"
            elif 'HYDRO' in desig:
                ht = 'hydraulic'
            elif 'SRK' in desig:
                ht = 'shrink_fit'
            elif 'SEMC' in desig:
                ht = 'side_lock'
            elif 'SEM' in desig and 'SEMC' not in desig:
                ht = 'side_lock'
            elif re.search(r'EM\d', desig):
                ht = 'end_mill'
            elif 'MAXIN' in desig:
                ht = 'milling_chuck'
            elif re.search(r'MT\d', desig):
                ht = 'morse_taper'
            elif 'ODP' in desig:
                ht = 'oil_hole_drill'
            elif 'CF' in desig:
                ht = 'face_mill'
            elif 'B16MN' in desig:
                ht = 'boring'

            nums = []
            for v in vals[1:]:
                if re.match(r'^ER\d+', v):
                    continue
                if re.match(r'^M\d', v):
                    continue
                if re.match(r'^[A-Z]$', v):
                    continue
                if re.match(r'^[\d.]+-[\d.]+$', v):
                    continue
                n = pn(v)
                if n is not None:
                    nums.append(n)

            rec = {
                'designation': desig,
                'manufacturer': 'Tungaloy',
                'taper': taper,
                'holder_type': ht,
                'collet': collet,
            }

            # Map columns to dimensions
            if ht == 'ER' and 'CSI' in cols:
                # DCONMS CSI Range LF LB LB2 BD BD2 J
                if len(nums) >= 4:
                    rec['taper_diameter_mm'] = to_mm(nums[0], is_inch)
                    rec['overall_length_mm'] = to_mm(nums[1], is_inch)
                    rec['gauge_length_mm'] = to_mm(nums[2], is_inch)
                    if len(nums) >= 5:
                        rec['body_diameter_mm'] = to_mm(nums[4], is_inch)
                    elif len(nums) >= 4:
                        rec['body_diameter_mm'] = to_mm(nums[3], is_inch)
                if collet and collet in ER_BORE:
                    rec['bore_min_mm'] = ER_BORE[collet][0]
                    rec['bore_max_mm'] = ER_BORE[collet][1]
            else:
                for i, c in enumerate(cols):
                    if i < len(nums):
                        if c == 'DCONMS':
                            rec['taper_diameter_mm'] = to_mm(nums[i], is_inch)
                        elif c == 'DCONWS':
                            rec['bore_diameter_mm'] = to_mm(nums[i], is_inch)
                        elif c == 'BD':
                            rec['body_diameter_mm'] = to_mm(nums[i], is_inch)
                        elif c == 'LF':
                            rec['overall_length_mm'] = to_mm(nums[i], is_inch)
                        elif c == 'LB':
                            rec['gauge_length_mm'] = to_mm(nums[i], is_inch)

            holders.append(rec)

# Deduplicate
seen = {}
for h in holders:
    d = h['designation']
    if d not in seen:
        seen[d] = h

unique = list(seen.values())
print(f"Unique holders: {len(unique)}")
print(f"By type: {dict(Counter(h['holder_type'] for h in unique))}")
print(f"By taper: {dict(Counter(h['taper'] for h in unique))}")

good = [h for h in unique if h.get('body_diameter_mm') and h.get('gauge_length_mm')]
print(f"With body_dia + gauge_len: {len(good)}")

with open('mcp-server/src/data/tungaloy-holders-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for ht in ['ER', 'shrink_fit', 'hydraulic', 'end_mill', 'side_lock']:
    samples = [h for h in unique if h['holder_type'] == ht and h.get('gauge_length_mm')][:2]
    for s in samples:
        print(f"  {s['designation']}: body={s.get('body_diameter_mm')} bore={s.get('bore_diameter_mm')} gauge={s.get('gauge_length_mm')} OAL={s.get('overall_length_mm')}")
