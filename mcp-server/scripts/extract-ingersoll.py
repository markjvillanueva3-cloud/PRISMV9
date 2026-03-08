#!/usr/bin/env python3
"""Extract tool data from INGERSOLL CUTTING TOOLS.pdf.
Uses generic dimension table detection.
Output: ingersoll-tools-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/INGERSOLL CUTTING TOOLS.pdf"
output_path = "C:/PRISM/mcp-server/src/data/ingersoll-tools-extracted.json"

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

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        flat = ''
        for ri in range(min(3, len(data))):
            flat += str(data[ri])

        if not any(kw in flat for kw in ['DC', 'D1', 'OAL', 'DCON', 'APMX', 'Designation', 'Order']):
            continue

        col_map = {}
        data_start = 0
        for ri in range(min(4, len(data))):
            for ci, cell in enumerate(data[ri]):
                c = str(cell).strip().replace('\n', '') if cell else ''
                if c in ('DC', 'D1', 'D'):
                    col_map['dc'] = ci
                elif c in ('DCONMS', 'DCON-MS', 'D2', 'DMM', 'd2'):
                    col_map['dmm'] = ci
                elif c in ('OAL', 'LF', 'L1', 'L'):
                    col_map['oal'] = ci
                elif c in ('APMX', 'APMXS', 'LU', 'L2'):
                    col_map['apmx'] = ci
                elif c in ('CICT', 'Z', 'NOF', 'z'):
                    col_map['z'] = ci
                elif c == 'KAPR':
                    col_map['kapr'] = ci
                elif 'esignation' in c or 'Designation' in c:
                    col_map['desig'] = ci
                elif 'Order' in c or 'Cat' in c:
                    col_map['order'] = ci

        if 'dc' not in col_map:
            continue

        check_col = col_map['dc']
        for ri in range(min(5, len(data))):
            if check_col < len(data[ri]):
                val = parse_val(str(data[ri][check_col]) if data[ri][check_col] else '')
                if val and val > 0:
                    data_start = ri
                    break
            else:
                data_start = max(data_start, ri + 1)

        for row_idx in range(data_start, len(data)):
            row = data[row_idx]
            if not row or col_map['dc'] >= len(row):
                continue

            dc = parse_val(str(row[col_map['dc']]) if row[col_map['dc']] else '')
            if not dc or dc <= 0 or dc > 500:
                continue

            desig = ''
            for key in ['desig', 'order']:
                if col_map.get(key) and col_map[key] < len(row):
                    for ci in range(col_map[key], min(col_map[key] + 3, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 4 and any(c.isalpha() for c in cell):
                            desig = cell
                            break
                if desig:
                    break
            if not desig:
                for ci in range(min(4, len(row))):
                    cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                    if cell and len(cell) > 6 and re.match(r'[A-Z0-9]', cell):
                        desig = cell
                        break

            if not desig:
                desig = f"ING-{dc}"
            if desig in seen:
                continue
            seen.add(desig)

            dmm = parse_val(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
            oal = parse_val(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
            apmx = parse_val(str(row[col_map.get('apmx', -1)]) if col_map.get('apmx') and col_map['apmx'] < len(row) and row[col_map['apmx']] else '')

            text_lower = page_text.lower()
            tool_type = 'end_mill'
            if 'face mill' in text_lower:
                tool_type = 'face_mill'
            elif 'drill' in text_lower:
                tool_type = 'drill'
            elif 'turn' in text_lower:
                tool_type = 'turning'

            tool = {
                "designation": desig,
                "manufacturer": "Ingersoll",
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

            tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    k = t.get('type', '?')
    type_counts[k] = type_counts.get(k, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
for tt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {tt}: {count}")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
