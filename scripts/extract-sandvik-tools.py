#!/usr/bin/env python3
"""Extract Sandvik/WIDIA solid endmill and drill dimensions from Cutting Tools Master 2022"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/Cutting Tools Master 2022 English Metric.pdf')

tools = []

def pn(s):
    s = str(s).strip().replace(',', '.')  # European decimal comma
    if not s or s == '-' or s == '—':
        return None
    s = re.sub(r'[^0-9.\-]', '', s)
    if not s:
        return None
    try:
        return float(s)
    except:
        return None

# Sandvik table format:
# 1-4 order/grade columns, then dimension columns ending with:
#   D1 (cutting dia), D (shank dia), LOC, OAL, [corner_radius], flute_count
# Header always contains "D1 D" in one cell, "length of cut length" in another

# Solid end mills: p360-544
# Solid drills: p550-595
scan_ranges = list(range(359, 544)) + list(range(549, 596))

for page_idx in scan_ranges:
    if page_idx >= len(doc):
        continue
    page = doc[page_idx]
    page_text = page.get_text()

    # Determine tool type from page location
    tool_type = 'end_mill' if page_idx < 545 else 'drill'

    # Detect flute count from page if visible in header area
    txt_upper = page_text.upper()

    tables = list(page.find_tables())
    for table in tables:
        data = table.extract()
        if not data or len(data) < 2:
            continue

        # Find the header row with "D1 D" pattern
        header_ri = -1
        for ri in range(min(2, len(data))):
            row_text = ' '.join(str(c) if c else '' for c in data[ri])
            if 'D1' in row_text and ('length' in row_text.lower() or 'D ' in row_text):
                header_ri = ri
                break

        if header_ri < 0:
            continue

        # Find dimension columns (rightmost columns after order numbers)
        # The pattern is: [order_cols...] D1 D [d_neck] LOC [neck_len] OAL [radius] [—] flute_count
        # D1 and D are typically the first two numeric dimension columns

        for ri in range(header_ri + 1 if header_ri == 0 else 1, len(data)):
            row = data[ri]
            if not row:
                continue

            # Find the order number (first cell with pattern like "1234567 XXXXX")
            order_no = ''
            first_dim_col = -1
            for ci, cell in enumerate(row):
                cv = str(cell).strip() if cell else ''
                # Order numbers are 7-digit + catalog designation
                if re.match(r'^\d{7}\s+\S', cv):
                    order_no = cv.split()[1] if len(cv.split()) > 1 else cv.split()[0]
                    continue
                # First numeric-only cell is start of dimensions
                v = pn(cv)
                if v is not None and first_dim_col < 0:
                    first_dim_col = ci
                    break

            if first_dim_col < 0:
                continue

            # Extract all numeric values from dimension columns
            nums = []
            for ci in range(first_dim_col, len(row)):
                cv = str(row[ci]).strip() if row[ci] else ''
                # Handle merged cells like "6 3,60" (shank + neck_dia)
                parts = cv.split()
                for part in parts:
                    v = pn(part)
                    if v is not None:
                        nums.append(v)

            if len(nums) < 3:
                continue

            # Interpret columns based on count:
            # Minimum: D1, D(shank), LOC, OAL, flute_count
            # With radius: D1, D(shank), LOC, OAL, radius, flute_count
            # With neck: D1, D(shank), D_neck, LOC, neck_len, OAL, radius, flute_count
            d1 = nums[0]  # cutting diameter
            if d1 <= 0 or d1 > 100:
                continue

            # For drills, nums[1] might be the inch equivalent (< 1.0 for small drills)
            # Shank is typically the last large value or same as D1
            d_shank = nums[1] if len(nums) > 1 and nums[1] >= 1.0 else d1

            # Last value is usually flute count (integer 2-8)
            flute_count = None
            if nums[-1] == int(nums[-1]) and 1 <= nums[-1] <= 10:
                flute_count = int(nums[-1])
                remaining = nums[2:-1]
            else:
                remaining = nums[2:]

            # Find LOC and OAL from remaining
            # OAL is typically the largest value (38-200mm)
            # LOC is the second-largest or medium value
            loc = None
            oal = None
            corner_radius = None

            if remaining:
                large_vals = sorted([v for v in remaining if v >= 20], reverse=True)
                small_vals = [v for v in remaining if 0 < v < 20]

                if large_vals:
                    oal = large_vals[0]
                    if len(large_vals) >= 2:
                        loc = large_vals[1]

                # If no large LOC found, check medium values
                if loc is None and small_vals:
                    loc_candidates = [v for v in small_vals if v > 2]
                    if loc_candidates:
                        loc = max(loc_candidates)

                # Corner radius is small (< 5mm)
                cr_candidates = [v for v in small_vals if 0 < v <= 5]
                if cr_candidates:
                    corner_radius = min(cr_candidates)

            if not oal:
                continue

            if not order_no:
                order_no = f'SVK-{d1}-{oal}'

            rec = {
                'designation': order_no,
                'manufacturer': 'Sandvik',
                'type': tool_type,
                'cutting_diameter_mm': d1,
                'page': page_idx + 1,
            }
            if d_shank > 0:
                rec['shank_diameter_mm'] = d_shank
            if loc is not None:
                rec['flute_length_mm'] = loc
            if oal is not None:
                rec['overall_length_mm'] = oal
            if corner_radius is not None and corner_radius < d1 / 2:
                rec['corner_radius_mm'] = corner_radius
            if flute_count is not None:
                rec['flute_count'] = flute_count

            # Validate
            if rec.get('overall_length_mm', 0) < d1:
                continue
            if rec.get('flute_length_mm') and rec.get('overall_length_mm') and rec['flute_length_mm'] > rec['overall_length_mm']:
                continue

            tools.append(rec)

# Deduplicate by designation
seen = {}
for t in tools:
    d = t['designation']
    if d not in seen:
        seen[d] = t
unique = list(seen.values())

print(f"Unique tools: {len(unique)}")
print(f"By type: {dict(Counter(t['type'] for t in unique))}")
dias = [t['cutting_diameter_mm'] for t in unique]
if dias:
    print(f"Diameter range: {min(dias)}-{max(dias)}mm")
with_loc = [t for t in unique if t.get('flute_length_mm')]
print(f"With LOC data: {len(with_loc)}")
with_flutes = [t for t in unique if t.get('flute_count')]
print(f"With flute count: {len(with_flutes)}")

with open('C:/PRISM/mcp-server/src/data/sandvik-tools-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:10]:
    print(f"  {sample['designation']}: D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')} flutes={sample.get('flute_count')} R={sample.get('corner_radius_mm')}")
print("...")
drills = [t for t in unique if t['type'] == 'drill']
for sample in drills[:5]:
    print(f"  {sample['designation']}: D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')}")
