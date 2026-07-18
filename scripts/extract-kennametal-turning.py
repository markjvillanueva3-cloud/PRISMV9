#!/usr/bin/env python3
"""Extract turning toolholder data from Kennametal Turning 2018.1.pdf.

Format: Capto turning toolholders with crammed dimension columns:
  Row 0: ['Capto size', '', 'Designation', ..., 'Dimensions in mm', ...]
  Row 1: [..., 'DCSFMS', 'WF LF', 'DCINN', ...]
  Data rows have dimensions sometimes merged in cells.

Also looks for insert ordering tables and shank toolholder tables.
Output: kennametal-turning-extracted.json
"""

import pymupdf
import json
import re

pdf_path = "C:/PRISM/CATALOGS/Turning 2018.1.pdf"
output_path = "C:/PRISM/mcp-server/src/data/kennametal-turning-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_euro(s):
    if not s or s.strip() in ('', 'None', '-', '–'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '.')
    # Try to extract first number from merged cells
    m = re.match(r'(-?\d+\.?\d*)', s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

def split_merged(s):
    """Split merged dimension values like '40 27,0 50' into list of floats."""
    if not s:
        return []
    s = s.strip().replace('\n', ' ')
    # Replace European commas (but only when followed by digit)
    s = re.sub(r'(\d),(\d)', r'\1.\2', s)
    parts = re.findall(r'-?\d+\.?\d*', s)
    return [float(p) for p in parts]

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()
    page_text = page.get_text()[:500]

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 4:
            continue

        flat = str(data[0]) + (str(data[1]) if len(data) > 1 else '')

        # Pattern 1: Capto toolholders (Designation + Dimensions in mm)
        if 'Designation' in flat and 'Dimensions' in flat:
            # Find designation column
            desig_col = None
            for ri in range(min(2, len(data))):
                for ci, cell in enumerate(data[ri]):
                    if cell and 'Designation' in str(cell):
                        desig_col = ci
                        break

            # Find dimension column indices from sub-header
            dim_cols = {}
            for ri in range(min(3, len(data))):
                for ci, cell in enumerate(data[ri]):
                    c = str(cell).strip().replace('\n', ' ') if cell else ''
                    if 'DCSFMS' in c:
                        dim_cols['dcsfms'] = ci
                    elif 'WF' in c and 'LF' in c:
                        dim_cols['wf_lf'] = ci
                    elif c.strip() == 'WF':
                        dim_cols['wf'] = ci
                    elif c.strip() == 'LF':
                        dim_cols['lf'] = ci
                    elif 'DCINN' in c and 'DCINN3' not in c:
                        dim_cols['dcinn'] = ci
                    elif 'GAMO' in c:
                        dim_cols['gamo'] = ci
                    elif c.strip() == 'H':
                        dim_cols['h'] = ci
                    elif c.strip() == 'B':
                        dim_cols['b'] = ci
                    elif c.strip() == 'F':
                        dim_cols['f'] = ci
                    elif c.strip() == 'OAL':
                        dim_cols['oal'] = ci

            for row_idx in range(2, len(data)):
                row = data[row_idx]
                if not row:
                    continue

                # Get designation
                desig = ''
                if desig_col is not None:
                    for ci in range(max(0, desig_col), min(desig_col + 3, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and re.match(r'C\d+-[A-Z]', cell):
                            desig = cell
                            break
                if not desig:
                    for ci in range(min(6, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and re.match(r'[A-Z]\d+-[A-Z]', cell) and len(cell) > 10:
                            desig = cell
                            break

                if not desig or desig in seen:
                    continue
                seen.add(desig)

                # Parse dimensions (may be merged in cells)
                dcsfms = None
                wf = None
                lf = None

                if dim_cols.get('dcsfms') and dim_cols['dcsfms'] < len(row):
                    vals = split_merged(str(row[dim_cols['dcsfms']]) if row[dim_cols['dcsfms']] else '')
                    if vals:
                        dcsfms = vals[0]

                if dim_cols.get('wf_lf') and dim_cols['wf_lf'] < len(row):
                    vals = split_merged(str(row[dim_cols['wf_lf']]) if row[dim_cols['wf_lf']] else '')
                    if len(vals) >= 2:
                        wf = vals[0]
                        lf = vals[1]
                    elif len(vals) == 1:
                        wf = vals[0]

                if dim_cols.get('wf') and dim_cols['wf'] < len(row):
                    v = parse_euro(str(row[dim_cols['wf']]) if row[dim_cols['wf']] else '')
                    if v:
                        wf = v
                if dim_cols.get('lf') and dim_cols['lf'] < len(row):
                    v = parse_euro(str(row[dim_cols['lf']]) if row[dim_cols['lf']] else '')
                    if v:
                        lf = v

                dcinn = None
                if dim_cols.get('dcinn') and dim_cols['dcinn'] < len(row):
                    dcinn = parse_euro(str(row[dim_cols['dcinn']]) if row[dim_cols['dcinn']] else '')

                oal = None
                if dim_cols.get('oal') and dim_cols['oal'] < len(row):
                    oal = parse_euro(str(row[dim_cols['oal']]) if row[dim_cols['oal']] else '')

                if not dcsfms and not wf:
                    continue

                tool = {
                    "designation": desig,
                    "manufacturer": "Kennametal",
                    "type": "turning",
                    "subtype": "toolholder",
                }
                if dcsfms:
                    tool["cutting_diameter_mm"] = round(dcsfms, 2)
                    tool["shank_diameter_mm"] = round(dcsfms, 2)
                if wf:
                    tool["wf_mm"] = round(wf, 2)
                if lf:
                    tool["overall_length_mm"] = round(lf, 2)
                if dcinn:
                    tool["bore_diameter_mm"] = round(dcinn, 2)
                if oal:
                    tool["overall_length_mm"] = round(oal, 2)

                tools.append(tool)

        # Pattern 2: Shank toolholders (H x B x LF)
        elif ('H' in flat or 'B' in flat) and ('LF' in flat or 'OAL' in flat) and 'Designation' in flat:
            col_map = {}
            for ri in range(min(3, len(data))):
                for ci, cell in enumerate(data[ri]):
                    c = str(cell).strip().replace('\n', '') if cell else ''
                    if c == 'H':
                        col_map['h'] = ci
                    elif c == 'B':
                        col_map['b'] = ci
                    elif c == 'F':
                        col_map['f'] = ci
                    elif c in ('LF', 'OAL'):
                        col_map['lf'] = ci
                    elif 'Designation' in c:
                        col_map['desig'] = ci

            if not col_map.get('h') and not col_map.get('b'):
                continue

            for row_idx in range(2, len(data)):
                row = data[row_idx]
                if not row:
                    continue

                desig = ''
                if col_map.get('desig') and col_map['desig'] < len(row):
                    for ci in range(col_map['desig'], min(col_map['desig'] + 3, len(row))):
                        cell = str(row[ci]).strip().replace('\n', '') if row[ci] else ''
                        if cell and len(cell) > 8 and re.match(r'[A-Z]', cell):
                            desig = cell
                            break
                if not desig or desig in seen:
                    continue
                seen.add(desig)

                h = parse_euro(str(row[col_map['h']]) if col_map.get('h') and col_map['h'] < len(row) and row[col_map['h']] else '')
                b = parse_euro(str(row[col_map['b']]) if col_map.get('b') and col_map['b'] < len(row) and row[col_map['b']] else '')
                lf = parse_euro(str(row[col_map['lf']]) if col_map.get('lf') and col_map['lf'] < len(row) and row[col_map['lf']] else '')

                if not h and not b:
                    continue

                tool = {
                    "designation": desig,
                    "manufacturer": "Kennametal",
                    "type": "turning",
                    "subtype": "shank_holder",
                }
                if h:
                    tool["height_mm"] = round(h, 2)
                if b:
                    tool["width_mm"] = round(b, 2)
                if lf:
                    tool["overall_length_mm"] = round(lf, 2)

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
print(f"Saved to {output_path}")
