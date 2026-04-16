#!/usr/bin/env python3
"""Generic extractor for any catalog with ISO 13399 or dimensional columns.
Accepts pdf_path and output_path as arguments.
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

if len(sys.argv) < 3:
    print("Usage: extract-generic-catalog.py <pdf_path> <output_path> [manufacturer]")
    sys.exit(1)

pdf_path = sys.argv[1]
output_path = sys.argv[2]
manufacturer = sys.argv[3] if len(sys.argv) > 3 else "Unknown"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_val(s):
    if not s or s.strip() in ('', 'None', '-', '–'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '.')
    m = re.match(r'(-?\d+\.?\d*)', s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

DIM_KEYWORDS = ['DC', 'D1', 'D2', 'OAL', 'LF', 'L1', 'L2', 'DCON', 'APMX', 'DMM',
                'IC', 'RE', 'NOF', 'LU', 'LH', 'KAPR', 'CICT', 'Z']
DESIG_KEYWORDS = ['Designation', 'esignation', 'Order', 'Product', 'Insert Number', 'Cat']

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        flat = ''
        for ri in range(min(4, len(data))):
            flat += str(data[ri])

        has_dims = any(kw in flat for kw in DIM_KEYWORDS[:8])
        if not has_dims:
            continue

        # Map columns
        col_map = {}
        for ri in range(min(4, len(data))):
            for ci, cell in enumerate(data[ri]):
                c = str(cell).strip().replace('\n', '') if cell else ''
                if c in ('DC', 'D1'):
                    col_map.setdefault('dc', ci)
                elif c in ('DCONMS', 'DCON-MS', 'D2', 'DMM'):
                    col_map.setdefault('dmm', ci)
                elif c in ('OAL', 'LF', 'L1'):
                    col_map.setdefault('oal', ci)
                elif c in ('APMX', 'APMXS', 'LU', 'L2'):
                    col_map.setdefault('apmx', ci)
                elif c in ('IC',):
                    col_map.setdefault('ic', ci)
                elif c in ('RE',):
                    col_map.setdefault('re', ci)
                elif c in ('S',) and len(c) == 1:
                    col_map.setdefault('s', ci)
                elif c in ('CICT', 'Z', 'NOF'):
                    col_map.setdefault('z', ci)
                elif c == 'KAPR':
                    col_map.setdefault('kapr', ci)
                elif c == 'LH':
                    col_map.setdefault('lh', ci)
                elif c == 'LE':
                    col_map.setdefault('le', ci)
                elif any(kw in c for kw in DESIG_KEYWORDS):
                    col_map.setdefault('desig', ci)

        primary = col_map.get('dc') or col_map.get('ic')
        if primary is None:
            continue

        # Find data start
        data_start = 2
        for ri in range(min(5, len(data))):
            if primary < len(data[ri]):
                val = parse_val(str(data[ri][primary]) if data[ri][primary] else '')
                if val and val > 0:
                    data_start = ri
                    break

        for row_idx in range(data_start, len(data)):
            row = data[row_idx]
            if not row or primary >= len(row):
                continue

            pv = parse_val(str(row[primary]) if row[primary] else '')
            if not pv or pv <= 0 or pv > 1000:
                continue

            desig = ''
            if col_map.get('desig') and col_map['desig'] < len(row):
                for ci in range(col_map['desig'], min(col_map['desig'] + 3, len(row))):
                    cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                    if cell and len(cell) > 4 and any(c.isalpha() for c in cell):
                        desig = cell
                        break
            if not desig:
                for ci in range(min(5, len(row))):
                    cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                    if cell and len(cell) > 6 and re.match(r'[A-Z0-9]', cell):
                        desig = cell
                        break
            if not desig:
                desig = f"{manufacturer}-{pv}"

            if desig in seen:
                continue
            seen.add(desig)

            dmm = parse_val(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
            oal = parse_val(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
            apmx = parse_val(str(row[col_map.get('apmx', -1)]) if col_map.get('apmx') and col_map['apmx'] < len(row) and row[col_map['apmx']] else '')
            re_val = parse_val(str(row[col_map['re']]) if col_map.get('re') and col_map['re'] < len(row) and row[col_map['re']] else '')
            le_val = parse_val(str(row[col_map['le']]) if col_map.get('le') and col_map['le'] < len(row) and row[col_map['le']] else '')

            text_lower = page_text.lower()
            is_insert = 'ic' in col_map and 'dc' not in col_map
            tool_type = 'insert' if is_insert else 'end_mill'
            if 'drill' in text_lower:
                tool_type = 'drill'
            elif 'turn' in text_lower:
                tool_type = 'turning' if not is_insert else 'insert'
            elif 'face' in text_lower:
                tool_type = 'face_mill'
            elif 'bore' in text_lower or 'boring' in text_lower:
                tool_type = 'boring_bar'

            tool = {
                "designation": desig,
                "manufacturer": manufacturer,
                "type": tool_type,
            }
            if is_insert:
                tool["inscribed_circle_mm"] = round(pv, 2)
                if re_val:
                    tool["corner_radius_mm"] = round(re_val, 3)
                if le_val:
                    tool["cutting_edge_length_mm"] = round(le_val, 2)
            else:
                tool["cutting_diameter_mm"] = round(pv, 2)
                if dmm:
                    tool["shank_diameter_mm"] = round(dmm, 2)
                if oal:
                    tool["overall_length_mm"] = round(oal, 2)
                if apmx:
                    tool["max_depth_of_cut_mm"] = round(apmx, 2)
                if re_val:
                    tool["corner_radius_mm"] = round(re_val, 3)

            tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} items")
for tt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {tt}: {count}")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
