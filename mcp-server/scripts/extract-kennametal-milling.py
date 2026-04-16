#!/usr/bin/env python3
"""Extract indexable milling cutter data from Kennametal Milling 2018.1.pdf.

Format: ISO 13399 columns with spanning headers:
  Row 0: ['Designation', ..., 'Dimensions in mm', ...]
  Row 1: [..., 'APMXE', 'APMXS', 'DC', 'DMM', 'OAL', ...]
  Row 2+: data with European decimals

Output: kennametal-milling-extracted.json
"""

import pymupdf
import json
import sys
import re

pdf_path = "C:/PRISM/CATALOGS/Milling 2018.1.pdf"
output_path = "C:/PRISM/mcp-server/src/data/kennametal-milling-extracted.json"

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

        # Look for ISO 13399 dimension tables
        flat = str(data[0]) + (str(data[1]) if len(data) > 1 else '')

        if 'DC' in flat and ('OAL' in flat or 'DMM' in flat):
            # Find column indices from sub-header row (usually row 1)
            sub = None
            for ri in range(min(3, len(data))):
                row_str = str(data[ri])
                if 'DC' in row_str and ('OAL' in row_str or 'DMM' in row_str or 'APMX' in row_str):
                    sub = [str(c).strip().replace('\n', '') if c else '' for c in data[ri]]
                    data_start = ri + 1
                    break
            if not sub:
                continue

            col_map = {}
            for ci, cell in enumerate(sub):
                c = cell.strip()
                if c == 'DC':
                    col_map['dc'] = ci
                elif c == 'DMM' or c == 'DCONMS':
                    col_map['dmm'] = ci
                elif c in ('OAL', 'LF'):
                    col_map['oal'] = ci
                elif c in ('APMXS', 'APMX', 'LU'):
                    col_map['apmx'] = ci
                elif c == 'APMXE':
                    col_map['apmxe'] = ci
                elif c in ('CICT', 'Z', 'NOF'):
                    col_map['z'] = ci
                elif c == 'KAPR':
                    col_map['kapr'] = ci
                elif c == 'LH':
                    col_map['lh'] = ci

            if 'dc' not in col_map:
                continue

            # Find designation column
            desig_col = None
            for ri in range(min(3, len(data))):
                for ci, cell in enumerate(data[ri]):
                    if cell and 'Designation' in str(cell):
                        # Designation values are usually a few columns after the header
                        desig_col = ci
                        break

            for row_idx in range(data_start, len(data)):
                row = data[row_idx]
                if not row or len(row) <= col_map['dc']:
                    continue

                dc = parse_euro(str(row[col_map['dc']]) if row[col_map['dc']] else '')
                if not dc or dc <= 0:
                    continue

                dmm = parse_euro(str(row[col_map.get('dmm', -1)]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
                oal = parse_euro(str(row[col_map.get('oal', -1)]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
                apmx = parse_euro(str(row[col_map.get('apmx', -1)]) if col_map.get('apmx') and col_map['apmx'] < len(row) and row[col_map['apmx']] else '')
                apmxe = parse_euro(str(row[col_map.get('apmxe', -1)]) if col_map.get('apmxe') and col_map['apmxe'] < len(row) and row[col_map['apmxe']] else '')
                z = parse_euro(str(row[col_map.get('z', -1)]) if col_map.get('z') and col_map['z'] < len(row) and row[col_map['z']] else '')
                kapr = parse_euro(str(row[col_map.get('kapr', -1)]) if col_map.get('kapr') and col_map['kapr'] < len(row) and row[col_map['kapr']] else '')

                # Get designation
                desig = ''
                if desig_col is not None:
                    for ci in range(max(0, desig_col), min(desig_col + 5, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 5 and any(c.isalpha() for c in cell):
                            desig = cell
                            break
                if not desig:
                    for ci in range(min(6, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 8 and re.match(r'[A-Z0-9]', cell):
                            desig = cell
                            break

                if not desig:
                    desig = f"KEN-MILL-{dc}"

                if desig in seen:
                    continue
                seen.add(desig)

                # Detect tool type from page text
                tool_type = 'face_mill'
                if 'end mill' in page_text or 'endmill' in page_text:
                    tool_type = 'end_mill'
                elif 'shoulder' in page_text:
                    tool_type = 'end_mill'
                elif 'slot' in page_text:
                    tool_type = 'end_mill'

                tool = {
                    "designation": desig,
                    "manufacturer": "Kennametal",
                    "type": tool_type,
                    "subtype": "indexable",
                    "cutting_diameter_mm": round(dc, 2),
                }
                if dmm:
                    tool["shank_diameter_mm"] = round(dmm, 2)
                if oal:
                    tool["overall_length_mm"] = round(oal, 2)
                if apmx:
                    tool["max_depth_of_cut_mm"] = round(apmx, 2)
                if apmxe:
                    tool["effective_cutting_depth_mm"] = round(apmxe, 2)
                if z:
                    tool["insert_count"] = int(z)
                if kapr:
                    tool["approach_angle_deg"] = round(kapr, 1)

                tools.append(tool)

doc.close()

# Stats
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
