#!/usr/bin/env python3
"""Extract ISCAR Turning tools from TURNING_CATALOG_PART 1.pdf.
Tables have: Designation, H, OAH, HF, B, LF, LH, WF, GAMP, MIID
Also insert dimension tables with IC, RE, L, S columns.
Units: Imperial (inch). Convert to mm.
Output: src/data/iscar-turning-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/TURNING_CATALOG_PART 1.pdf"
output_path = "C:/PRISM/mcp-server/src/data/iscar-turning-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def pv(s):
    """Parse numeric value from cell."""
    if not s or s.strip() in ('', 'None', '-', '–', '—'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '.')
    m = re.match(r'(-?\d+\.?\d*)', s)
    if m:
        try:
            return float(m.group(1))
        except:
            return None
    return None

def to_mm(val_inch):
    """Convert inch to mm."""
    if val_inch is None:
        return None
    return round(val_inch * 25.4, 2)

# Toolholder columns
HOLDER_COLS = {
    'Designation': 'desig',
    'H': 'h', 'OAH': 'oah', 'HF': 'hf',
    'B': 'b', 'LF': 'lf', 'LH': 'lh',
    'WF': 'wf', 'GAMP': 'gamp',
    'GAMF': 'gamf', 'MIID': 'miid',
    'DCONMS': 'dconms', 'DMIN': 'dmin',
    'BD': 'bd', 'LU': 'lu', 'LB': 'lb',
    'MDX': 'mdx',
}

# Insert dimension columns
INSERT_COLS = {
    'IC': 'ic', 'RE': 're', 'L': 'l', 'S': 's', 'LE': 'le',
    'D1': 'd1',
}

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        # Try to map columns from header rows
        col_map = {}
        header_row = -1

        for ri in range(min(4, len(data))):
            for ci, cell in enumerate(data[ri]):
                if not cell:
                    continue
                c = str(cell).strip().replace('\n', ' ')
                # Check for merged columns like "WF GAMP(1)"
                tokens = re.split(r'[\s,]+', c)
                for tok in tokens:
                    clean = re.sub(r'\(\d+\)', '', tok).strip()
                    if clean in HOLDER_COLS:
                        key = HOLDER_COLS[clean]
                        if key not in col_map:
                            col_map[key] = ci
                            header_row = max(header_row, ri)
                    elif clean in INSERT_COLS:
                        key = INSERT_COLS[clean]
                        if key not in col_map:
                            col_map[key] = ci
                            header_row = max(header_row, ri)

        # Need either toolholder or insert columns
        is_holder = 'desig' in col_map and ('lf' in col_map or 'h' in col_map or 'dconms' in col_map)
        is_insert = 'ic' in col_map and ('re' in col_map or 's' in col_map)

        if not is_holder and not is_insert:
            continue

        for row_idx in range(header_row + 1, len(data)):
            row = data[row_idx]
            if not row:
                continue

            if is_holder:
                # Extract toolholder
                desig = ''
                if 'desig' in col_map and col_map['desig'] < len(row) and row[col_map['desig']]:
                    desig = str(row[col_map['desig']]).strip().replace('\n', '')
                if not desig or len(desig) < 5:
                    continue
                if desig in seen or 'Designation' in desig:
                    continue
                seen.add(desig)

                # Parse dimensions (all in inches)
                h = pv(str(row[col_map['h']]) if 'h' in col_map and col_map['h'] < len(row) and row[col_map['h']] else '')
                lf = pv(str(row[col_map['lf']]) if 'lf' in col_map and col_map['lf'] < len(row) and row[col_map['lf']] else '')
                wf = pv(str(row[col_map['wf']]) if 'wf' in col_map and col_map['wf'] < len(row) and row[col_map['wf']] else '')
                dconms = pv(str(row[col_map['dconms']]) if 'dconms' in col_map and col_map['dconms'] < len(row) and row[col_map['dconms']] else '')
                lh = pv(str(row[col_map['lh']]) if 'lh' in col_map and col_map['lh'] < len(row) and row[col_map['lh']] else '')
                gamp = pv(str(row[col_map['gamp']]) if 'gamp' in col_map and col_map['gamp'] < len(row) and row[col_map['gamp']] else '')

                # Get insert designation
                miid = ''
                if 'miid' in col_map and col_map['miid'] < len(row) and row[col_map['miid']]:
                    miid = str(row[col_map['miid']]).strip().replace('\n', ' ')

                # Body diameter: prefer DCONMS, then H, then B
                body_d = dconms or h
                if not body_d or body_d <= 0:
                    continue

                tool = {
                    "designation": desig,
                    "manufacturer": "ISCAR",
                    "type": "turning",
                    "subtype": "toolholder",
                    "cutting_diameter_mm": to_mm(body_d),
                }
                if lf:
                    tool["overall_length_mm"] = to_mm(lf)
                if wf:
                    tool["wf_mm"] = to_mm(wf)
                if lh:
                    tool["projection_length_mm"] = to_mm(lh)
                if gamp is not None and gamp != 0:
                    tool["approach_angle_deg"] = gamp
                if miid:
                    tool["insert_designation"] = miid

                tools.append(tool)

            elif is_insert:
                # Extract insert dimensions
                ic_col = col_map.get('ic')
                re_col = col_map.get('re')
                s_col = col_map.get('s')
                le_col = col_map.get('le')
                d1_col = col_map.get('d1')

                ic_val = pv(str(row[ic_col]) if ic_col is not None and ic_col < len(row) and row[ic_col] else '')
                re_val = pv(str(row[re_col]) if re_col is not None and re_col < len(row) and row[re_col] else '')
                s_val = pv(str(row[s_col]) if s_col is not None and s_col < len(row) and row[s_col] else '')

                if not ic_val or ic_val <= 0:
                    continue

                # Try to get designation from first column or nearby
                desig = ''
                for ci in range(min(3, len(row))):
                    if row[ci]:
                        cell = str(row[ci]).strip().replace('\n', '')
                        if len(cell) > 5 and re.match(r'[A-Z]', cell):
                            desig = cell
                            break

                if not desig:
                    desig = f"ISCAR-IC{ic_val}"
                if desig in seen:
                    continue
                seen.add(desig)

                # IC is in inches for this catalog
                tool = {
                    "designation": desig,
                    "manufacturer": "ISCAR",
                    "type": "insert",
                    "inscribed_circle_mm": to_mm(ic_val),
                }
                if re_val:
                    tool["corner_radius_mm"] = to_mm(re_val)
                if s_val:
                    tool["thickness_mm"] = to_mm(s_val)

                tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} items")
for tt, c in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {tt}: {c}")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
