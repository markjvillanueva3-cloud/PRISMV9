#!/usr/bin/env python3
"""Extract solid end mill data from Seco/Jabro Solid End Mills catalog.

Format: ISO 13399 columns with spanning headers:
  Row 0: ['Ordering and Product No.', ..., 'Dimensions in mm', ...]
  Row 1: [..., 'DC', 'DMM', 'APMXS', 'OAL', 'CHW', ...]
  Row 2+: data

Also extracts speed/feed tables (fz by diameter per ISO material group).

Output: seco-tools-extracted.json
"""

import pymupdf
import json
import sys
import re

pdf_path = "C:/PRISM/CATALOGS/Solid End Mills.pdf"
output_path = "C:/PRISM/mcp-server/src/data/seco-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
speed_feed_tables = []
seen_designations = set()

def parse_euro_float(s):
    """Parse European decimal format (comma as decimal separator)."""
    if not s or s.strip() in ('', 'None', '-'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '')
    # European: comma as decimal
    s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None

def detect_tool_type(designation, page_text):
    """Detect tool type from designation and page context."""
    d = designation.lower() if designation else ''
    t = page_text.lower()
    if 'drill' in t or 'drill' in d:
        return 'drill'
    if 'ball' in t or 'ball' in d or 'js500' in d or 'js700' in d:
        return 'ball_mill'
    return 'end_mill'

def detect_flute_count(designation):
    """Try to extract flute count from designation like JS512010F2C.0Z2-NXT (Z2 = 2 flutes)."""
    if not designation:
        return None
    m = re.search(r'Z(\d+)', designation)
    if m:
        return int(m.group(1))
    return None

# Process all pages
for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        # Check if this is a tool dimension table (DC/DMM/OAL in row 0 or 1)
        flat_header = str(data[0]) + str(data[1]) if len(data) > 1 else str(data[0])

        if 'DC' in flat_header and 'DMM' in flat_header and 'OAL' in flat_header:
            # Find column indices from row 1 (sub-header row)
            sub_header = [str(c).strip() if c else '' for c in data[1]]

            col_map = {}
            for ci, cell in enumerate(sub_header):
                cell_clean = cell.replace('\n', '').strip()
                if cell_clean == 'DC':
                    col_map['dc'] = ci
                elif cell_clean == 'DMM':
                    col_map['dmm'] = ci
                elif cell_clean in ('APMXS', 'APMX', 'LU'):
                    col_map['loc'] = ci
                elif cell_clean == 'OAL':
                    col_map['oal'] = ci
                elif cell_clean == 'CHW':
                    col_map['chw'] = ci  # corner radius / chamfer width

            if 'dc' not in col_map or 'oal' not in col_map:
                continue

            # Find designation and product number columns from row 0
            row0 = [str(c).strip() if c else '' for c in data[0]]
            desig_col = None
            prodno_col = None
            for ci, cell in enumerate(row0):
                if 'Designation' in cell:
                    desig_col = ci
                if 'Product' in cell or 'Ordering' in cell:
                    prodno_col = ci

            # Also look for flute count column
            fc_col = None
            for ci, cell in enumerate(sub_header):
                if cell and cell.strip() in ('PCEDC', 'Z', 'NOF'):
                    fc_col = ci

            # If no explicit FC column, check row 0 for it
            if fc_col is None:
                for ci, cell in enumerate(row0):
                    if cell and 'PCEDC' in cell:
                        fc_col = ci

            # Extract data rows (skip row 0=header, row 1=sub-header, row 2=often blank)
            for row_idx in range(2, len(data)):
                row = data[row_idx]
                if not row or len(row) <= max(col_map.values()):
                    continue

                dc = parse_euro_float(str(row[col_map['dc']]) if row[col_map['dc']] else '')
                if not dc or dc <= 0:
                    continue

                dmm = parse_euro_float(str(row[col_map['dmm']]) if col_map.get('dmm') and col_map['dmm'] < len(row) and row[col_map['dmm']] else '')
                oal = parse_euro_float(str(row[col_map['oal']]) if col_map.get('oal') and col_map['oal'] < len(row) and row[col_map['oal']] else '')
                loc = parse_euro_float(str(row[col_map.get('loc', -1)]) if col_map.get('loc') and col_map['loc'] < len(row) and row[col_map['loc']] else '')
                chw = parse_euro_float(str(row[col_map.get('chw', -1)]) if col_map.get('chw') and col_map['chw'] < len(row) and row[col_map['chw']] else '')

                # Get designation
                desig = ''
                if desig_col is not None and desig_col < len(row) and row[desig_col]:
                    desig = str(row[desig_col]).replace('\n', '').strip()
                # Fallback: check adjacent columns for designation pattern
                if not desig:
                    for ci in range(min(8, len(row))):
                        cell = str(row[ci]).replace('\n', '').strip() if row[ci] else ''
                        if cell and re.match(r'JS\d', cell):
                            desig = cell
                            break

                # Get product number
                prodno = ''
                if prodno_col is not None:
                    # Product number is often in col 1 (the actual number column)
                    for ci in range(max(0, prodno_col), min(prodno_col + 3, len(row))):
                        cell = str(row[ci]).strip() if row[ci] else ''
                        if cell and re.match(r'\d{6,}', cell):
                            prodno = cell
                            break

                if not desig and not prodno:
                    continue

                # Dedup
                dedup_key = desig or prodno
                if dedup_key in seen_designations:
                    continue
                seen_designations.add(dedup_key)

                # Detect flute count
                fc = None
                if fc_col is not None and fc_col < len(row) and row[fc_col]:
                    fc = parse_euro_float(str(row[fc_col]))
                    if fc:
                        fc = int(fc)
                if not fc:
                    fc = detect_flute_count(desig)

                tool_type = detect_tool_type(desig, page_text)

                tool = {
                    "designation": desig or prodno,
                    "manufacturer": "Seco",
                    "type": tool_type,
                    "cutting_diameter_mm": round(dc, 3),
                    "shank_diameter_mm": round(dmm, 3) if dmm else round(dc, 3),
                    "overall_length_mm": round(oal, 2) if oal else None,
                    "flute_length_mm": round(loc, 2) if loc else None,
                }
                if chw and chw > 0:
                    tool["corner_radius_mm"] = round(chw, 3)
                if fc:
                    tool["flute_count"] = fc
                if prodno:
                    tool["product_number"] = prodno

                tools.append(tool)

        # Check for speed/feed tables (SMG column with fz values)
        elif 'SMG' in flat_header and 'fz' in flat_header:
            sf_data = {
                "page": page_idx + 1,
                "series": page_text[:100].replace('\n', ' ').strip(),
                "entries": []
            }

            # Row 1 has diameter values
            dia_row = [str(c).strip() if c else '' for c in data[1]]

            for row_idx in range(2, len(data)):
                row = data[row_idx]
                if not row or len(row) < 4:
                    continue
                smg = str(row[0]).strip() if row[0] else ''
                if not smg or smg == 'None':
                    continue

                # Get vc from last column if present
                vc_str = str(row[-1]).strip() if row[-1] else ''
                vc_match = re.match(r'(\d+)', vc_str.replace(',', '.'))
                vc = int(vc_match.group(1)) if vc_match else None

                entry = {
                    "iso_group": smg,
                    "vc_m_min": vc,
                    "fz_by_diameter": {}
                }

                # Parse fz values by diameter
                for ci in range(3, len(row) - 1):
                    if ci < len(dia_row):
                        dia = parse_euro_float(dia_row[ci])
                        fz = parse_euro_float(str(row[ci]) if row[ci] else '')
                        if dia and fz:
                            entry["fz_by_diameter"][str(dia)] = fz

                if entry["fz_by_diameter"]:
                    sf_data["entries"].append(entry)

            if sf_data["entries"]:
                speed_feed_tables.append(sf_data)

doc.close()

# Clean up None values
for t in tools:
    t = {k: v for k, v in t.items() if v is not None}

# Remove tools with None OAL (clean the list)
tools = [{k: v for k, v in t.items() if v is not None} for t in tools]

# Stats
type_counts = {}
for t in tools:
    tt = t.get('type', 'unknown')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
for tt, count in sorted(type_counts.items()):
    print(f"  {tt}: {count}")

dia_range = [t['cutting_diameter_mm'] for t in tools if t.get('cutting_diameter_mm')]
if dia_range:
    print(f"  Diameter range: {min(dia_range)}-{max(dia_range)}mm")

print(f"  Speed/feed tables: {len(speed_feed_tables)} ({sum(len(sf['entries']) for sf in speed_feed_tables)} entries)")

# Save
with open(output_path, 'w') as f:
    json.dump({
        "manufacturer": "Seco",
        "catalog": "Solid End Mills (Jabro-Solid2)",
        "tools": tools,
        "speed_feed_tables": speed_feed_tables
    }, f, indent=2)

print(f"\nSaved to {output_path}")
