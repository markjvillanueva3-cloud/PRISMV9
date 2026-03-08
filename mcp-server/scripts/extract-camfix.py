#!/usr/bin/env python3
"""Extract CAMFIX quick-change turning toolholders from PDF catalog.
Columns: Designation, DCONMS, WF, LF, GAMP, MIID (insert), plus LU, ECA, L3, etc.
Output: src/data/camfix-tools-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/CAMFIX_Catalog.pdf"
output_path = "C:/PRISM/mcp-server/src/data/camfix-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_val(s):
    if not s or s.strip() in ('', 'None', '-', '–', '—'):
        return None
    s = s.strip().replace('\n', '').replace(' ', '').replace(',', '.')
    m = re.match(r'(-?\d+\.?\d*)', s)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None

# Column name mappings
COL_ALIASES = {
    'DCONMS': 'dconms', 'DCON': 'dconms',
    'WF': 'wf', 'WF2': 'wf2',
    'LF': 'lf', 'LF G': 'lf',
    'OHN': 'ohn', 'OHN(1)': 'ohn',
    'LU': 'lu',
    'LB': 'lb',
    'L3': 'l3',
    'ECA': 'eca',
    'GAMP': 'gamp', 'GAMP(1)': 'gamp', 'GAMP(2)': 'gamp', 'GAMP(3)': 'gamp',
    'GAMF': 'gamf', 'GAMF(2)': 'gamf',
    'MIID': 'miid', 'MIID(1)': 'miid', 'MIID(2)': 'miid', 'MIID(3)': 'miid', 'MIID(4)': 'miid',
    'Insert': 'miid',
    'CP': 'cp', 'CP(1)': 'cp', 'CP(2)': 'cp', 'CP(3)': 'cp', 'CP(4)': 'cp', 'CP(5)': 'cp',
    'CSP': 'cp', 'CSP(1)': 'cp',
    'DCP': 'dcp', 'DCP(1)': 'dcp', 'DCP(2)': 'dcp', 'DCP(3)': 'dcp', 'DCP(4)': 'dcp', 'DCP(5)': 'dcp', 'DCP(6)': 'dcp',
    'AMP': 'amp', 'AMP(1)': 'amp',
    'DMIN': 'dmin',
    'BD': 'bd',
    'MDX': 'mdx', 'MDX(1)': 'mdx',
    'h1': 'h1',
}

for page_idx in range(len(doc)):
    page = doc[page_idx]
    tabs = page.find_tables()

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        # Find header row and column mapping
        col_map = {}
        desig_col = None
        header_row = -1

        for ri in range(min(4, len(data))):
            row = data[ri]
            for ci, cell in enumerate(row):
                if not cell:
                    continue
                c = str(cell).strip().replace('\n', ' ')
                # Check for designation column
                if 'esignation' in c or 'signation' in c:
                    desig_col = ci
                    header_row = ri
                # Check dimension columns
                for alias, key in COL_ALIASES.items():
                    if alias in c.split() or c.startswith(alias):
                        if key not in col_map:
                            col_map[key] = ci
                            header_row = max(header_row, ri)

        # Must have DCONMS or designation
        if 'dconms' not in col_map and desig_col is None:
            continue
        if header_row < 0:
            continue

        # Extract data rows
        for row_idx in range(header_row + 1, len(data)):
            row = data[row_idx]
            if not row:
                continue

            # Get designation
            desig = ''
            if desig_col is not None and desig_col < len(row) and row[desig_col]:
                desig = str(row[desig_col]).strip().replace('\n', '')

            if not desig:
                # Try first column
                if row[0]:
                    cell = str(row[0]).strip().replace('\n', '')
                    if len(cell) > 8 and re.match(r'C\d', cell):
                        desig = cell

            if not desig or len(desig) < 5:
                continue

            # Skip if looks like a header or non-data row
            if 'METRIC' in desig or 'INCH' in desig or 'Designation' in desig:
                continue

            if desig in seen:
                continue
            seen.add(desig)

            # Parse dimensions
            dconms = parse_val(str(row[col_map['dconms']]) if 'dconms' in col_map and col_map['dconms'] < len(row) and row[col_map['dconms']] else '')
            wf = parse_val(str(row[col_map['wf']]) if 'wf' in col_map and col_map['wf'] < len(row) and row[col_map['wf']] else '')
            lf = parse_val(str(row[col_map['lf']]) if 'lf' in col_map and col_map['lf'] < len(row) and row[col_map['lf']] else '')
            lu = parse_val(str(row[col_map['lu']]) if 'lu' in col_map and col_map['lu'] < len(row) and row[col_map['lu']] else '')
            gamp = parse_val(str(row[col_map['gamp']]) if 'gamp' in col_map and col_map['gamp'] < len(row) and row[col_map['gamp']] else '')
            dmin = parse_val(str(row[col_map['dmin']]) if 'dmin' in col_map and col_map['dmin'] < len(row) and row[col_map['dmin']] else '')

            # Get insert designation
            miid = ''
            if 'miid' in col_map and col_map['miid'] < len(row) and row[col_map['miid']]:
                miid = str(row[col_map['miid']]).strip().replace('\n', ' ')

            if not dconms or dconms <= 0:
                continue

            # Determine Capto size from designation
            capto_match = re.match(r'C(\d)', desig)
            capto_size = int(capto_match.group(1)) if capto_match else None

            # Determine tool type from insert/designation
            tool_type = 'turning'
            desig_upper = desig.upper()
            if 'BORE' in desig_upper or 'BORING' in desig_upper:
                tool_type = 'boring_bar'
            elif 'THREAD' in desig_upper:
                tool_type = 'threading'
            elif 'GROOVE' in desig_upper or 'GROOVING' in desig_upper:
                tool_type = 'grooving'

            tool = {
                "designation": desig,
                "manufacturer": "CAMFIX",
                "type": tool_type,
                "subtype": "quick_change_toolholder",
                "cutting_diameter_mm": round(dconms, 2),
            }
            if wf:
                tool["wf_mm"] = round(wf, 2)
            if lf:
                tool["overall_length_mm"] = round(lf, 2)
            if lu:
                tool["effective_cutting_depth_mm"] = round(lu, 2)
            if gamp is not None:
                tool["approach_angle_deg"] = round(gamp, 1)
            if dmin:
                tool["bore_diameter_mm"] = round(dmin, 2)
            if miid:
                tool["insert_designation"] = miid
            if capto_size:
                tool["capto_size"] = capto_size

            tools.append(tool)

doc.close()

# Stats
type_counts = {}
capto_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1
    cs = t.get('capto_size', '?')
    capto_counts[cs] = capto_counts.get(cs, 0) + 1

print(f"\nExtracted: {len(tools)} toolholders")
print(f"By type: {type_counts}")
print(f"By Capto size: {capto_counts}")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
