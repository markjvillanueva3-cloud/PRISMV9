#!/usr/bin/env python3
"""Extract threading tool data from Kennametal Threading 2018.1.pdf.
Output: kennametal-threading-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/Threading 2018.1.pdf"
output_path = "C:/PRISM/mcp-server/src/data/kennametal-threading-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_euro(s):
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

        # Look for tool ordering tables with dimensions
        if not any(kw in flat for kw in ['DC', 'OAL', 'Designation', 'Product', 'DMM', 'LF', 'LU']):
            continue

        col_map = {}
        for ri in range(min(4, len(data))):
            for ci, cell in enumerate(data[ri]):
                c = str(cell).strip().replace('\n', '') if cell else ''
                if c == 'DC':
                    col_map['dc'] = ci
                elif c in ('DMM', 'DCONMS'):
                    col_map['dmm'] = ci
                elif c in ('OAL', 'LF'):
                    col_map['oal'] = ci
                elif c in ('LU', 'APMX'):
                    col_map['lu'] = ci
                elif 'Designation' in c or 'esignation' in c:
                    col_map['desig'] = ci
                elif 'Product' in c or 'Ordering' in c:
                    col_map['prodno'] = ci

        if 'dc' not in col_map:
            continue

        data_start = 2
        for ri in range(min(5, len(data))):
            if col_map['dc'] < len(data[ri]):
                val = parse_euro(str(data[ri][col_map['dc']]) if data[ri][col_map['dc']] else '')
                if val and val > 0:
                    data_start = ri
                    break

        for row_idx in range(data_start, len(data)):
            row = data[row_idx]
            if not row or col_map['dc'] >= len(row):
                continue

            dc = parse_euro(str(row[col_map['dc']]) if row[col_map['dc']] else '')
            if not dc or dc <= 0:
                continue

            desig = ''
            for key in ['desig', 'prodno']:
                if col_map.get(key) and col_map[key] < len(row):
                    for ci in range(col_map[key], min(col_map[key] + 4, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 5 and any(c.isalpha() for c in cell):
                            desig = cell
                            break
                if desig:
                    break
            if not desig:
                desig = f"KEN-THD-{dc}"

            if desig in seen:
                continue
            seen.add(desig)

            dmm = parse_euro(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
            oal = parse_euro(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')

            tool = {
                "designation": desig,
                "manufacturer": "Kennametal",
                "type": "thread_mill",
                "cutting_diameter_mm": round(dc, 2),
            }
            if dmm:
                tool["shank_diameter_mm"] = round(dmm, 2)
            if oal:
                tool["overall_length_mm"] = round(oal, 2)

            tools.append(tool)

doc.close()

print(f"\nExtracted: {len(tools)} tools")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
