#!/usr/bin/env python3
"""Extract drill data from AMPC_US-EN.pdf (Allied Machine & Engineering).
Looks for D1 inch/mm, Body, Shank columns.
Output: ampc-tools-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/AMPC_US-EN.pdf"
output_path = "C:/PRISM/mcp-server/src/data/ampc-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_val(s, to_mm=False):
    if not s or s.strip() in ('', 'None', '-', '–', '*'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '')
    # Handle fractions
    m = re.match(r'(\d+)/(\d+)', s)
    if m:
        val = int(m.group(1)) / int(m.group(2))
        return round(val * 25.4, 3) if to_mm else val
    m = re.match(r'(-?\d+\.?\d*)', s)
    if m:
        val = float(m.group(1))
        if to_mm and val < 30:
            return round(val * 25.4, 3)
        return val
    return None

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 4:
            continue

        flat = ''
        for ri in range(min(4, len(data))):
            flat += str(data[ri])

        # Look for dimension columns
        has_d1 = 'D 1' in flat or 'D1' in flat
        has_body = 'Body' in flat or 'Bod' in flat
        has_shank = 'Shank' in flat

        if not has_d1:
            continue

        # Find column mapping
        col_map = {}
        for ri in range(min(5, len(data))):
            for ci, cell in enumerate(data[ri]):
                c = str(cell).strip().replace('\n', ' ') if cell else ''
                if 'D 1 mm' in c or 'D1 mm' in c:
                    col_map['d1_mm'] = ci
                elif 'D 1 inch' in c or 'D1 inch' in c:
                    col_map['d1_inch'] = ci
                elif c.strip() in ('D 1', 'D1'):
                    col_map['d1'] = ci
                elif 'Body' in c or 'Bod' in c:
                    col_map['body'] = ci
                elif 'Shank' in c:
                    col_map['shank'] = ci
                elif 'OAL' in c or 'Overall' in c:
                    col_map['oal'] = ci
                elif 'Flute' in c and 'Length' in c:
                    col_map['flute_len'] = ci
                elif 'Order' in c or 'Catalog' in c or 'Cat.' in c:
                    col_map['order'] = ci
                elif 'Fractional' in c:
                    col_map['frac'] = ci

        d1_col = col_map.get('d1_mm') or col_map.get('d1_inch') or col_map.get('d1')
        if not d1_col:
            continue

        is_inch = 'd1_inch' in col_map and 'd1_mm' not in col_map

        for row_idx in range(2, len(data)):
            row = data[row_idx]
            if not row or d1_col >= len(row):
                continue

            # Get D1
            d1 = None
            if col_map.get('d1_mm') and col_map['d1_mm'] < len(row):
                d1 = parse_val(str(row[col_map['d1_mm']]) if row[col_map['d1_mm']] else '')
            if not d1 and col_map.get('d1_inch') and col_map['d1_inch'] < len(row):
                d1 = parse_val(str(row[col_map['d1_inch']]) if row[col_map['d1_inch']] else '', to_mm=True)
            if not d1 and col_map.get('d1') and col_map['d1'] < len(row):
                d1 = parse_val(str(row[col_map['d1']]) if row[col_map['d1']] else '', to_mm=is_inch)

            if not d1 or d1 <= 0 or d1 > 200:
                continue

            # Get designation
            desig = ''
            if col_map.get('order') and col_map['order'] < len(row):
                cell = str(row[col_map['order']]).strip().replace('\n', '') if row[col_map['order']] else ''
                if cell and len(cell) > 3:
                    desig = cell
            if not desig:
                for ci in range(min(5, len(row))):
                    cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                    if cell and len(cell) > 6 and re.match(r'[A-Z0-9]', cell):
                        desig = cell
                        break

            if not desig:
                desig = f"AMPC-{d1:.2f}"

            if desig in seen:
                continue
            seen.add(desig)

            shank = parse_val(str(row[col_map['shank']]) if col_map.get('shank') and col_map['shank'] < len(row) and row[col_map['shank']] else '', to_mm=True)
            oal = parse_val(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '', to_mm=True)

            tool_type = 'drill'
            if 'reamer' in page_text.lower():
                tool_type = 'reamer'
            elif 'boring' in page_text.lower():
                tool_type = 'boring_bar'

            tool = {
                "designation": desig,
                "manufacturer": "Allied",
                "type": tool_type,
                "cutting_diameter_mm": round(d1, 3),
            }
            if shank:
                tool["shank_diameter_mm"] = round(shank, 2)
            if oal:
                tool["overall_length_mm"] = round(oal, 2)

            tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
for tt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {tt}: {count}")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
