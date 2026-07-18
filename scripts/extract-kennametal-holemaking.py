#!/usr/bin/env python3
"""Extract drill/reamer data from Kennametal Holemaking.pdf.

Format: ISO 13399 columns:
  Row 0: ['DC m7 (mm)', 'DC m7 (inch)', 'LU', 'Ordering and Product No.', ..., 'Dimensions in mm']
  Row 1: [..., 'OAL']
  Row 2+: data

Output: kennametal-holemaking-extracted.json
"""

import pymupdf
import json
import re

pdf_path = "C:/PRISM/CATALOGS/Holemaking.pdf"
output_path = "C:/PRISM/mcp-server/src/data/kennametal-holemaking-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_euro(s):
    if not s or s.strip() in ('', 'None', '-', '–'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500].lower()

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 4:
            continue

        # Check for dimension tables
        flat = str(data[0]) + (str(data[1]) if len(data) > 1 else '')

        has_dc = 'DC' in flat
        has_oal = 'OAL' in flat
        has_desig = 'Designation' in flat or 'esignation' in flat or 'Product' in flat

        if not (has_dc or has_desig):
            continue

        # Find column mapping
        col_map = {}
        data_start = 2  # default

        for ri in range(min(3, len(data))):
            for ci, cell in enumerate(data[ri]):
                c = str(cell).strip().replace('\n', '') if cell else ''
                if 'DC' in c and 'mm' in c:
                    col_map['dc_mm'] = ci
                elif 'DC' in c and 'inch' in c:
                    col_map['dc_inch'] = ci
                elif c == 'DC':
                    col_map['dc'] = ci
                elif c == 'LU':
                    col_map['lu'] = ci
                elif c == 'OAL':
                    col_map['oal'] = ci
                elif c in ('DMM', 'DCONMS'):
                    col_map['dmm'] = ci
                elif 'Designation' in c or 'esignation' in c:
                    col_map['desig'] = ci
                elif 'Product' in c or 'Ordering' in c:
                    col_map['prodno'] = ci
                elif c in ('APMXS', 'APMX'):
                    col_map['apmx'] = ci

        # Determine DC column
        dc_col = col_map.get('dc_mm') or col_map.get('dc')
        if not dc_col and not col_map.get('dc_inch'):
            continue

        # Find data start row
        for ri in range(min(4, len(data))):
            row = data[ri]
            if dc_col and dc_col < len(row):
                val = parse_euro(str(row[dc_col]) if row[dc_col] else '')
                if val and val > 0:
                    data_start = ri
                    break

        for row_idx in range(data_start, len(data)):
            row = data[row_idx]
            if not row:
                continue

            # Get DC
            dc = None
            if dc_col and dc_col < len(row):
                dc = parse_euro(str(row[dc_col]) if row[dc_col] else '')
            if not dc and col_map.get('dc_inch') and col_map['dc_inch'] < len(row):
                dc_inch = parse_euro(str(row[col_map['dc_inch']]) if row[col_map['dc_inch']] else '')
                if dc_inch:
                    dc = round(dc_inch * 25.4, 3)
            if not dc or dc <= 0:
                continue

            # Get other dims
            lu = parse_euro(str(row[col_map['lu']]) if col_map.get('lu') and col_map['lu'] < len(row) and row[col_map['lu']] else '')
            oal = parse_euro(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
            dmm = parse_euro(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')

            # Get designation
            desig = ''
            for key in ['desig', 'prodno']:
                if col_map.get(key) and col_map[key] < len(row):
                    # Check this and adjacent columns
                    for ci in range(col_map[key], min(col_map[key] + 4, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 5 and re.match(r'[A-Z0-9]', cell):
                            desig = cell
                            break
                if desig:
                    break

            if not desig:
                desig = f"KEN-HOLE-{dc}-{lu or ''}"

            if desig in seen:
                continue
            seen.add(desig)

            # Detect type
            tool_type = 'drill'
            if 'reamer' in page_text or 'ream' in page_text:
                tool_type = 'reamer'
            elif 'boring' in page_text or 'bore' in page_text:
                tool_type = 'boring_bar'
            elif 'tap' in page_text:
                tool_type = 'tap'

            tool = {
                "designation": desig,
                "manufacturer": "Kennametal",
                "type": tool_type,
                "cutting_diameter_mm": round(dc, 3),
            }
            if dmm:
                tool["shank_diameter_mm"] = round(dmm, 2)
            else:
                tool["shank_diameter_mm"] = round(dc, 2)
            if oal:
                tool["overall_length_mm"] = round(oal, 2)
            if lu:
                tool["flute_length_mm"] = round(lu, 2)

            tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', 'unknown')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
for tt, count in sorted(type_counts.items()):
    print(f"  {tt}: {count}")

dia_range = [t['cutting_diameter_mm'] for t in tools]
if dia_range:
    print(f"  Diameter range: {min(dia_range)}-{max(dia_range)}mm")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
