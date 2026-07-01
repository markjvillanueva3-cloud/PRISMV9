#!/usr/bin/env python3
"""Extract tool data from Korloy rotating.pdf and korloy turning.pdf.

Scans for any tables with ISO 13399 or dimension columns (DC, D1, L1, etc.)
Output: korloy-rotating-extracted.json, korloy-turning-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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

def extract_catalog(pdf_path, output_path, catalog_type):
    doc = pymupdf.open(pdf_path)
    print(f"Opened: {pdf_path} ({len(doc)} pages)")

    tools = []
    seen = set()

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        tabs = page.find_tables()
        page_text = page.get_text()[:500]

        for t in tabs.tables:
            data = t.extract()
            if len(data) < 3:
                continue

            # Build flat header from first 3 rows
            flat = ''
            for ri in range(min(3, len(data))):
                flat += str(data[ri])

            # Look for dimension tables
            has_dims = any(kw in flat for kw in ['DC', 'D1', 'OAL', 'LF', 'DCON', 'APMX', 'LU'])
            has_desig = any(kw in flat for kw in ['Designation', 'esignation', 'Order', 'Cat.No', 'Cat. No'])

            if not has_dims:
                continue

            # Find column mapping
            col_map = {}
            data_start = 0
            for ri in range(min(4, len(data))):
                for ci, cell in enumerate(data[ri]):
                    c = str(cell).strip().replace('\n', '') if cell else ''
                    if c == 'DC' or c == 'D1':
                        col_map['dc'] = ci
                    elif c in ('DCONMS', 'DCON-MS', 'D2', 'DMM'):
                        col_map['dmm'] = ci
                    elif c in ('OAL', 'LF', 'L1'):
                        col_map['oal'] = ci
                    elif c in ('APMX', 'APMXS', 'LU', 'L2'):
                        col_map['apmx'] = ci
                    elif c in ('CICT', 'Z', 'NOF'):
                        col_map['z'] = ci
                    elif c == 'KAPR':
                        col_map['kapr'] = ci
                    elif 'esignation' in c or 'Designation' in c:
                        col_map['desig'] = ci
                    elif 'Order' in c or 'Cat' in c:
                        col_map['order'] = ci
                    elif c == 'LH':
                        col_map['lh'] = ci
                    elif c == 'IC':
                        col_map['ic'] = ci
                    elif c == 'RE':
                        col_map['re'] = ci

            if 'dc' not in col_map and 'ic' not in col_map:
                continue

            # Find data start
            check_col = col_map.get('dc') or col_map.get('ic')
            for ri in range(min(5, len(data))):
                if check_col and check_col < len(data[ri]):
                    val = parse_val(str(data[ri][check_col]) if data[ri][check_col] else '')
                    if val and val > 0:
                        data_start = ri
                        break
                else:
                    data_start = max(data_start, ri + 1)

            for row_idx in range(data_start, len(data)):
                row = data[row_idx]
                if not row:
                    continue

                dc = None
                if col_map.get('dc') and col_map['dc'] < len(row):
                    dc = parse_val(str(row[col_map['dc']]) if row[col_map['dc']] else '')
                ic = None
                if col_map.get('ic') and col_map['ic'] < len(row):
                    ic = parse_val(str(row[col_map['ic']]) if row[col_map['ic']] else '')

                if not dc and not ic:
                    continue

                # Get designation
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
                        if cell and len(cell) > 6 and re.match(r'[A-Z]', cell):
                            desig = cell
                            break

                if not desig:
                    desig = f"KORLOY-{catalog_type}-{dc or ic}"

                if desig in seen:
                    continue
                seen.add(desig)

                dmm = parse_val(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
                oal = parse_val(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
                apmx = parse_val(str(row[col_map.get('apmx', -1)]) if col_map.get('apmx') and col_map['apmx'] < len(row) and row[col_map['apmx']] else '')
                z = None
                if col_map.get('z') and col_map['z'] < len(row):
                    z_val = parse_val(str(row[col_map['z']]) if row[col_map['z']] else '')
                    if z_val:
                        z = int(z_val)
                re_val = parse_val(str(row[col_map['re']]) if col_map.get('re') and col_map['re'] < len(row) and row[col_map['re']] else '')

                text_lower = page_text.lower()
                tool_type = catalog_type  # 'milling' or 'turning'
                if 'drill' in text_lower:
                    tool_type = 'drill'
                elif 'face mill' in text_lower:
                    tool_type = 'face_mill'
                elif 'end mill' in text_lower or 'shoulder' in text_lower:
                    tool_type = 'end_mill'

                if ic and not dc:
                    tool = {
                        "designation": desig,
                        "manufacturer": "Korloy",
                        "type": "insert",
                        "subtype": catalog_type,
                        "inscribed_circle_mm": round(ic, 2),
                    }
                    if re_val:
                        tool["corner_radius_mm"] = round(re_val, 3)
                else:
                    tool = {
                        "designation": desig,
                        "manufacturer": "Korloy",
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
                    if z:
                        tool["insert_count"] = z
                    if re_val:
                        tool["corner_radius_mm"] = round(re_val, 3)

                tools.append(tool)

    doc.close()

    type_counts = {}
    for t in tools:
        k = f"{t.get('type')}/{t.get('subtype', '')}"
        type_counts[k] = type_counts.get(k, 0) + 1

    print(f"\nExtracted: {len(tools)} items")
    for tt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {tt}: {count}")

    with open(output_path, 'w') as f:
        json.dump(tools, f, indent=2)
    print(f"Saved to {output_path}\n")

# Extract both catalogs
extract_catalog(
    "C:/PRISM/CATALOGS/korloy rotating.pdf",
    "C:/PRISM/mcp-server/src/data/korloy-rotating-extracted.json",
    "milling"
)

extract_catalog(
    "C:/PRISM/CATALOGS/korloy turning.pdf",
    "C:/PRISM/mcp-server/src/data/korloy-turning-extracted.json",
    "turning"
)
