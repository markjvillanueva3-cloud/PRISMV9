#!/usr/bin/env python3
"""Extract Haimer tool holder dimensions from Haimer USA Master Catalog.pdf
Haimer tables are transposed: rows=dimensions, columns=sizes
Key dims: D1(bore), D2(body dia), D3(nut dia), L(length), Gage length A
"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/Haimer USA Master Catalog.pdf')

holders = []

def pn(s):
    s = str(s).strip()
    if not s or s in ('-', '—', '––', '—'):
        return None
    s = re.sub(r'[^0-9.\-/]', '', s)
    if not s:
        return None
    if '/' in s:
        parts = s.split('/')
        try:
            return float(parts[0]) / float(parts[1])
        except:
            return None
    try:
        return float(s)
    except:
        return None

def inch_to_mm(v):
    return round(v * 25.4, 2) if v is not None else None

# Track current taper and holder type from page text
current_taper = ''
current_type = ''

for page_idx in range(259, 508):
    page = doc[page_idx]
    page_text = page.get_text()
    txt_upper = page_text.upper()

    # Detect taper from page
    for taper in ['HSK-A125', 'HSK-A100', 'HSK-A63', 'HSK-A50', 'HSK-A40',
                  'HSK-E40', 'HSK-E50', 'HSK-E63',
                  'CAT50', 'CAT40', 'BT50', 'BT40', 'BT30',
                  'SK50', 'SK40', 'SK30', 'PSC']:
        if taper in txt_upper or taper.replace('-', '') in txt_upper:
            current_taper = taper
            break

    # Detect holder type
    if 'SHRINK' in txt_upper:
        current_type = 'shrink_fit'
    elif 'COLLET CHUCK' in txt_upper or 'ER CHUCK' in txt_upper:
        current_type = 'ER'
    elif 'HEAVY DUTY CHUCK' in txt_upper:
        current_type = 'heavy_duty'
    elif 'MILLING CHUCK' in txt_upper:
        current_type = 'milling_chuck'
    elif 'HYDRAULIC' in txt_upper:
        current_type = 'hydraulic'
    elif 'WELDON' in txt_upper or 'SIDE LOCK' in txt_upper:
        current_type = 'weldon'
    elif 'MORSE TAPER' in txt_upper:
        current_type = 'morse_taper'

    tables = list(page.find_tables())
    for table in tables:
        data = table.extract()
        if not data or len(data) < 3:
            continue

        # Look for transposed holder tables
        # First column contains row labels like "Clamping Ø D1", "Ø D2", "L", "Gage length"
        row_map = {}  # label -> row index
        is_metric = False
        is_inch = False

        for ri, row in enumerate(data):
            label = str(row[0]).strip().upper() if row[0] else ''
            if 'METRIC' in label:
                is_metric = True
            if 'INCH' in label:
                is_inch = True
            if 'D1' in label and ('CLAMPING' in label or 'Ø' in label.upper()):
                row_map['d1'] = ri
            elif 'D2' in label and 'SLIM' not in label:
                if 'STANDARD' in label or 'D2' in label:
                    row_map['d2'] = ri
            elif 'D3' in label:
                row_map['d3'] = ri
            elif label.startswith('L ') or label == 'L' or ('L [' in label and 'GAGE' not in label.upper()):
                row_map['length'] = ri
            elif 'GAGE' in label or 'GAUGE' in label:
                row_map['gauge'] = ri
            elif 'ORDER' in label:
                row_map['order'] = ri

        if 'd1' not in row_map:
            continue

        # Number of size columns (skip first label column)
        num_cols = len(data[row_map['d1']])

        for ci in range(1, num_cols):
            d1_raw = str(data[row_map['d1']][ci]).strip() if ci < len(data[row_map['d1']]) else ''
            d1 = pn(d1_raw)
            if d1 is None:
                continue

            # Convert inch to mm if needed
            if is_inch and not is_metric:
                d1 = inch_to_mm(d1)
                if d1 is None:
                    continue

            d2 = None
            if 'd2' in row_map and ci < len(data[row_map['d2']]):
                d2 = pn(data[row_map['d2']][ci])
                if is_inch and not is_metric and d2 is not None:
                    d2 = inch_to_mm(d2)

            d3 = None
            if 'd3' in row_map and ci < len(data[row_map['d3']]):
                d3 = pn(data[row_map['d3']][ci])
                if is_inch and not is_metric and d3 is not None:
                    d3 = inch_to_mm(d3)

            length = None
            if 'length' in row_map and ci < len(data[row_map['length']]):
                length = pn(data[row_map['length']][ci])
                if is_inch and not is_metric and length is not None:
                    length = inch_to_mm(length)

            gauge = None
            if 'gauge' in row_map and ci < len(data[row_map['gauge']]):
                gauge_cell = str(data[row_map['gauge']][ci]).strip()
                # Gauge cell may contain "80\n.1/4Z.4" — first line is gauge length
                gauge_parts = gauge_cell.split('\n')
                gauge = pn(gauge_parts[0])
                if is_inch and not is_metric and gauge is not None:
                    gauge = inch_to_mm(gauge)

            order = ''
            if 'order' in row_map and ci < len(data[row_map['order']]):
                order = str(data[row_map['order']][ci]).strip() if data[row_map['order']][ci] else ''

            # Body diameter for collision is max(D2, D3)
            body_dia = max(filter(None, [d2, d3]), default=None)

            if not (body_dia or gauge):
                continue

            # Skip very small values (< 3mm bore is suspicious)
            if d1 < 1:
                continue

            designation = order if order else f'HAIMER-{current_taper}-{current_type}-{d1}'

            rec = {
                'designation': designation,
                'manufacturer': 'Haimer',
                'taper': current_taper,
                'holder_type': current_type,
                'bore_diameter_mm': round(d1, 2),
                'page': page_idx + 1,
            }
            if body_dia is not None:
                rec['body_diameter_mm'] = round(body_dia, 2)
            if d2 is not None:
                rec['d2_mm'] = round(d2, 2)
            if d3 is not None:
                rec['d3_mm'] = round(d3, 2)
            if gauge is not None:
                rec['gauge_length_mm'] = round(gauge, 2)
            if length is not None:
                rec['overall_length_mm'] = round(length, 2)

            holders.append(rec)

# Deduplicate by designation+taper+bore
seen = {}
for h in holders:
    key = f"{h['taper']}-{h['holder_type']}-{h['bore_diameter_mm']}-{h.get('gauge_length_mm','')}"
    if key not in seen:
        seen[key] = h
unique = list(seen.values())

print(f"Unique holders: {len(unique)}")
print(f"By type: {dict(Counter(h['holder_type'] for h in unique))}")
print(f"By taper: {dict(Counter(h['taper'] for h in unique))}")
with_body = [h for h in unique if h.get('body_diameter_mm')]
print(f"With body diameter (collision): {len(with_body)}")
with_gauge = [h for h in unique if h.get('gauge_length_mm')]
print(f"With gauge length: {len(with_gauge)}")

with open('C:/PRISM/mcp-server/src/data/haimer-holders-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:15]:
    print(f"  {sample['designation'][:30]}: taper={sample['taper']} type={sample['holder_type']} bore={sample['bore_diameter_mm']} body={sample.get('body_diameter_mm')} gauge={sample.get('gauge_length_mm')}")
