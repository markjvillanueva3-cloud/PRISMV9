#!/usr/bin/env python3
"""Extract tool data from ISCAR PART 1.pdf.

Format: Various ISO 13399 columns in inch:
  ['Designation', 'DC', 'CICT', 'OAL', 'LH', 'APMX', 'DCONMS', 'Shank', ...]

Output: iscar-tools-extracted.json
"""

import pymupdf
import json
import re

pdf_path = "C:/PRISM/CATALOGS/ISCAR PART 1.pdf"
output_path = "C:/PRISM/mcp-server/src/data/iscar-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_val(s, is_inch=True):
    """Parse numeric value, converting inch to mm if needed."""
    if not s or s.strip() in ('', 'None', '-', '–', '*'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '')
    # Handle fractions
    m = re.match(r'(\d+)/(\d+)', s)
    if m:
        val = int(m.group(1)) / int(m.group(2))
        return round(val * 25.4, 3) if is_inch else val
    try:
        val = float(s)
        if is_inch and val < 20:  # likely inches if < 20
            return round(val * 25.4, 3)
        return val
    except ValueError:
        return None

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        # Find header row with DC/OAL/DCONMS
        header_row = None
        data_start = 0
        for ri in range(min(3, len(data))):
            flat = str(data[ri])
            if 'DC' in flat and ('OAL' in flat or 'DCONMS' in flat or 'LH' in flat):
                header_row = ri
                data_start = ri + 1
                break

        if header_row is None:
            continue

        # Map columns
        h = [str(c).strip().replace('\n', '') if c else '' for c in data[header_row]]
        col_map = {}
        for ci, cell in enumerate(h):
            c = cell.strip()
            # Handle truncated headers (e.g., 'ignation' for 'Designation')
            if 'ignation' in c or 'Designation' in c:
                col_map['desig'] = ci
            elif c == 'DC':
                col_map['dc'] = ci
            elif c in ('DCONMS', 'DCON-MS'):
                col_map['dmm'] = ci
            elif c == 'OAL':
                col_map['oal'] = ci
            elif c in ('APMX', 'APMXS'):
                col_map['apmx'] = ci
            elif c == 'LU':
                col_map['lu'] = ci
            elif c == 'LH':
                col_map['lh'] = ci
            elif c in ('CICT', 'Z'):
                col_map['z'] = ci
            elif c == 'KAPR':
                col_map['kapr'] = ci
            elif 'MIID' in c:
                col_map['insert'] = ci

        if 'dc' not in col_map:
            continue

        # Skip None-only data rows
        if data_start < len(data) and all(str(c) in ('None', '', ' ') for c in data[data_start]):
            data_start += 1

        for row_idx in range(data_start, len(data)):
            row = data[row_idx]
            if not row or len(row) <= col_map['dc']:
                continue

            dc_raw = str(row[col_map['dc']]).strip() if row[col_map['dc']] else ''
            dc = parse_val(dc_raw, is_inch=True)
            if not dc or dc <= 0 or dc > 500:
                continue

            # If DC > 25.4 it was probably already mm or a combined cell
            # Check if value looks metric already
            dc_num = parse_val(dc_raw, is_inch=False)
            if dc_num and dc_num > 3 and dc_num < 500:
                # Could be mm already if value > 25.4
                if dc > 500:
                    dc = dc_num

            dmm = parse_val(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
            oal = parse_val(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
            apmx = parse_val(str(row[col_map.get('apmx', -1)]) if col_map.get('apmx') and col_map['apmx'] < len(row) and row[col_map['apmx']] else '')
            lu = parse_val(str(row[col_map.get('lu', -1)]) if col_map.get('lu') and col_map['lu'] < len(row) and row[col_map['lu']] else '')
            lh = parse_val(str(row[col_map.get('lh', -1)]) if col_map.get('lh') and col_map['lh'] < len(row) and row[col_map['lh']] else '')
            z = None
            if col_map.get('z') and col_map['z'] < len(row) and row[col_map['z']]:
                try:
                    z = int(float(str(row[col_map['z']]).strip().replace(',', '.')))
                except (ValueError, TypeError):
                    pass

            # Get designation
            desig = ''
            if col_map.get('desig') and col_map['desig'] < len(row):
                cell = str(row[col_map['desig']]).strip().replace('\n', '') if row[col_map['desig']] else ''
                if cell and len(cell) > 3:
                    desig = cell
            if not desig:
                for ci in range(min(3, len(row))):
                    cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                    if cell and len(cell) > 8 and re.match(r'[A-Z]', cell):
                        desig = cell
                        break

            if not desig:
                desig = f"ISCAR-{dc:.1f}"

            if desig in seen:
                continue
            seen.add(desig)

            # Get insert designation if present
            insert_desig = None
            if col_map.get('insert') and col_map['insert'] < len(row):
                insert_desig = str(row[col_map['insert']]).strip().replace('\n', '') if row[col_map['insert']] else None

            # Detect type from page text
            text_lower = page_text.lower()
            tool_type = 'end_mill'
            subtype = 'indexable'
            if 'drill' in text_lower:
                tool_type = 'drill'
            elif 'face mill' in text_lower or 'facemill' in text_lower:
                tool_type = 'face_mill'
            elif 'slot' in text_lower:
                tool_type = 'end_mill'
            elif 'groove' in text_lower or 'grooving' in text_lower:
                tool_type = 'grooving'
            elif 'turn' in text_lower:
                tool_type = 'turning'

            tool = {
                "designation": desig,
                "manufacturer": "ISCAR",
                "type": tool_type,
                "subtype": subtype,
                "cutting_diameter_mm": round(dc, 2),
            }
            if dmm:
                tool["shank_diameter_mm"] = round(dmm, 2)
            if oal:
                tool["overall_length_mm"] = round(oal, 2)
            if apmx:
                tool["max_depth_of_cut_mm"] = round(apmx, 2)
            if lu:
                tool["flute_length_mm"] = round(lu, 2)
            if lh:
                tool["projection_length_mm"] = round(lh, 2)
            if z:
                tool["insert_count"] = z
            if insert_desig:
                tool["insert_designation"] = insert_desig

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
