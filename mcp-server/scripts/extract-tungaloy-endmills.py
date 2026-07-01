#!/usr/bin/env python3
"""Extract Tungaloy solid endmill dimensions from GC_2023-2024_G_Milling.pdf"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/GC_2023-2024_G_Milling.pdf')

tools = []

def pn(s):
    s = str(s).strip()
    if not s or s == '-' or ord(s[0]) > 127:
        return None
    s = re.sub(r'[^\d.\-]', '', s)
    if not s:
        return None
    try:
        return float(s)
    except:
        return None

# Scan solid endmill section (pages 260-350)
for page_idx in range(259, 350):
    page = doc[page_idx]
    tables = page.find_tables()
    for table in tables:
        data = table.extract()
        if not data or len(data) < 2:
            continue

        # Check header for endmill dimension columns
        header = ' '.join(str(c).strip() if c else '' for c in data[0]).upper()
        if 'DC' not in header and 'DCONMS' not in header:
            continue

        # Parse all rows (including first row which might be data if header is in t0)
        for ri in range(0, len(data)):
            row = data[ri]
            first = str(row[0]).strip() if row[0] else ''
            if not first:
                continue

            # Handle concatenated rows (all data in first cell)
            parts = first.split()
            if len(parts) > 3 and all(str(c).strip() == '' for c in row[1:] if c):
                vals = parts
            else:
                vals = [str(c).strip() if c else '' for c in row]

            desig = vals[0]

            # Must be a Tungaloy tool designation
            if not re.match(r'^TE[A-Z]', desig):
                continue

            # Extract all numeric values (skip grade marker byte \x01)
            nums = []
            for v in vals[1:]:
                if v in ('\x01', '\uf06e', '\uf075'):
                    continue
                # Skip text like 'Cylindrical', 'Weldon', degree symbols
                if re.match(r'^[A-Za-z]', v):
                    continue
                if '°' in v or 'º' in v:
                    continue
                n = pn(v)
                if n is not None:
                    nums.append(n)

            if len(nums) < 3:
                continue

            # Determine tool type from designation
            tool_type = 'end_mill'
            if re.search(r'B\d[LMSX]', desig) or 'B4L' in desig or 'B3' in desig:
                # Has B + flute count + length code = could be ball or square
                if 'A' in desig[3:5]:  # TECA = ball, TEB = ball
                    tool_type = 'ball_mill'
            if desig.startswith('TEB'):
                tool_type = 'ball_mill'
            if desig.startswith('TECA') and 'B' in desig:
                tool_type = 'ball_mill'
            if 'FF' in desig:
                tool_type = 'end_mill'  # high feed

            # Standard column order: DC, DCONMS, NOF, [CHW/RE], APMX, [LH], LF
            # Sometimes RE comes before APMX, sometimes CHW
            rec = {
                'designation': desig,
                'manufacturer': 'Tungaloy',
                'type': tool_type,
                'page': page_idx + 1,
            }

            # First two nums are usually DC and DCONMS
            if len(nums) >= 2:
                rec['cutting_diameter_mm'] = nums[0]
                rec['shank_diameter_mm'] = nums[1]

            # Third is usually NOF (integer 2-10)
            if len(nums) >= 3 and 1 <= nums[2] <= 20 and nums[2] == int(nums[2]):
                rec['flute_count'] = int(nums[2])
                remaining = nums[3:]
            else:
                remaining = nums[2:]

            # Find APMX (LOC) and LF (OAL) from remaining
            # APMX is typically 1-6x diameter, LF is typically 38-200mm
            # LF is always the largest value and last meaningful number
            if remaining:
                # Corner radius is small (< 3mm usually)
                # APMX is medium (flute length)
                # LF is large (overall length)
                large_vals = [v for v in remaining if v >= 30]
                small_vals = [v for v in remaining if v < 30]

                if large_vals:
                    rec['overall_length_mm'] = large_vals[-1]  # Last large = LF
                    if len(large_vals) >= 2:
                        rec['flute_length_mm'] = large_vals[0]  # First large could be APMX if > 30
                    elif small_vals:
                        # Find the flute length among small vals (larger one)
                        apmx_candidates = [v for v in small_vals if v > 1]
                        if apmx_candidates:
                            rec['flute_length_mm'] = max(apmx_candidates)

                # Corner radius
                cr_candidates = [v for v in small_vals if 0 < v <= 5]
                if cr_candidates:
                    rec['corner_radius_mm'] = min(cr_candidates)

            if rec.get('cutting_diameter_mm') and rec.get('overall_length_mm'):
                tools.append(rec)

# Deduplicate
seen = {}
for t in tools:
    d = t['designation']
    if d not in seen:
        seen[d] = t
unique = list(seen.values())

print(f"Unique tools: {len(unique)}")
print(f"By type: {dict(Counter(t.get('type', 'unknown') for t in unique))}")

dias = [t['cutting_diameter_mm'] for t in unique]
if dias:
    print(f"Diameter range: {min(dias)}-{max(dias)}mm")

with_loc = [t for t in unique if t.get('flute_length_mm')]
print(f"With LOC data: {len(with_loc)}")

with open('mcp-server/src/data/tungaloy-endmills-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:15]:
    print(f"  {sample['designation']}: D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')} flutes={sample.get('flute_count')} R={sample.get('corner_radius_mm')}")
