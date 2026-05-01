#!/usr/bin/env python3
"""Extract YG-1 tools from YU25_America.pdf.
Tables: EDP No., Drill Diameter (Metric/Fractional/Decimal), Shank Diameter, Flute Length, Overall Length
Also end mills with D1/D2/L1/L2/LOC columns.
Units: mixed (metric mm and inch decimal).
Output: src/data/yg1-tools-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/YU25_America.pdf"
output_path = "C:/PRISM/mcp-server/src/data/yg1-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def pv(s):
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

# Column name mappings
COL_MAP = {
    'D1': 'dc', 'D1 = D2': 'dc',
    'Drill Diameter': 'dc_label',
    'Metric': 'dc_metric',
    'Decimal': 'dc_decimal',
    'Fractional': 'dc_frac',
    'D2': 'ds',
    'Shank': 'ds_label',
    'Shank Diameter': 'ds_label',
    'L1': 'loc',
    'Flute': 'loc_label',
    'Flute Length': 'loc_label',
    'L2': 'oal',
    'Overall': 'oal_label',
    'Overall Length': 'oal_label',
    'LOC': 'loc',
    'OAL': 'oal',
    'EDP No.': 'edp',
    'EDP': 'edp',
    'No. of Flutes': 'fc',
}

def detect_type_from_page(page_text):
    t = page_text.lower()
    if 'thread mill' in t:
        return 'thread_mill'
    if 'tap' in t:
        return 'tap'
    if 'ball' in t and ('end' in t or 'mill' in t or 'nose' in t):
        return 'ball_mill'
    if 'end mill' in t or 'endmill' in t:
        return 'end_mill'
    if 'drill' in t or 'carbide' in t:
        return 'drill'
    if 'reamer' in t:
        return 'reamer'
    return 'drill'

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_text = page.get_text()[:600]
    tabs = page.find_tables()

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 3:
            continue

        # Map columns
        col_map = {}
        header_end = 0

        for ri in range(min(4, len(data))):
            for ci, cell in enumerate(data[ri]):
                if not cell:
                    continue
                c = str(cell).strip().replace('\n', ' ')
                for key, val in COL_MAP.items():
                    if key in c:
                        if val not in col_map:
                            col_map[val] = ci
                            header_end = max(header_end, ri)

        # Need at least a diameter column
        dc_col = col_map.get('dc') or col_map.get('dc_metric') or col_map.get('dc_decimal')
        if dc_col is None:
            continue

        ds_col = col_map.get('ds')
        loc_col = col_map.get('loc')
        oal_col = col_map.get('oal')
        edp_col = col_map.get('edp')
        fc_col = col_map.get('fc')

        tool_type = detect_type_from_page(page_text)

        # Detect if metric or inch from page context
        is_mm = 'mm' in page_text[:300].lower() or 'Unit : mm' in page_text or 'metric' in page_text.lower()[:200]

        for row_idx in range(header_end + 1, len(data)):
            row = data[row_idx]
            if not row or dc_col >= len(row):
                continue

            dc = pv(str(row[dc_col]) if row[dc_col] else '')
            if not dc or dc <= 0 or dc > 500:
                continue

            ds = pv(str(row[ds_col]) if ds_col and ds_col < len(row) and row[ds_col] else '')
            loc = pv(str(row[loc_col]) if loc_col and loc_col < len(row) and row[loc_col] else '')
            oal = pv(str(row[oal_col]) if oal_col and oal_col < len(row) and row[oal_col] else '')
            fc = pv(str(row[fc_col]) if fc_col and fc_col < len(row) and row[fc_col] else '')

            # Get EDP as designation
            desig = ''
            if edp_col is not None and edp_col < len(row) and row[edp_col]:
                desig = str(row[edp_col]).strip().replace('\n', '')
            if not desig or len(desig) < 3:
                desig = f"YG1-{dc}"

            if desig in seen:
                continue
            seen.add(desig)

            # Convert to mm if needed
            if not is_mm:
                # Decimal inch values
                if dc < 5:  # Likely inches
                    dc = round(dc * 25.4, 3)
                if ds and ds < 5:
                    ds = round(ds * 25.4, 3)
                if loc and loc < 20:
                    loc = round(loc * 25.4, 2)
                if oal and oal < 30:
                    oal = round(oal * 25.4, 2)

            tool = {
                "designation": desig,
                "manufacturer": "YG-1",
                "type": tool_type,
                "cutting_diameter_mm": round(dc, 3),
            }
            if ds:
                tool["shank_diameter_mm"] = round(ds, 3)
            if loc:
                tool["flute_length_mm"] = round(loc, 2)
            if oal:
                tool["overall_length_mm"] = round(oal, 2)
            if fc:
                tool["flute_count"] = int(fc)

            tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
for tt, c in sorted(type_counts.items(), key=lambda x: -x[1]):
    print(f"  {tt}: {c}")
if tools:
    dcs = [t['cutting_diameter_mm'] for t in tools]
    print(f"Diameter range: {min(dcs):.2f} - {max(dcs):.2f} mm")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
