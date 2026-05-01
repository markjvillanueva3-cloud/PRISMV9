#!/usr/bin/env python3
"""Extract OSG drill and endmill dimensions from OSG.pdf"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/OSG.pdf')

tools = []

def pn(s):
    """Parse numeric value, return None if invalid"""
    s = str(s).strip()
    if not s or s == '-':
        return None
    s = re.sub(r'[^0-9.\-/]', '', s)
    if not s:
        return None
    # Handle fractions like 1/4, 3/16
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
    return round(v * 25.4, 3) if v is not None else None

def detect_units(header_row):
    """Detect if table uses mm or inch from header"""
    htext = ' '.join(str(c) if c else '' for c in header_row).lower()
    if '(mm)' in htext:
        return 'mm'
    if '(inch)' in htext or '(in)' in htext or 'fractional' in htext:
        return 'inch'
    return 'mm'  # default

def detect_tool_type(page_idx):
    """Determine tool type from page location in catalog"""
    if page_idx < 375:  # Drilling section p22-375
        return 'drill'
    if page_idx < 795:  # Threading section p376-795
        return 'tap'
    if page_idx < 1131:  # Milling section p796-1131
        return 'end_mill'
    return 'unknown'

def detect_subtype(page_text, page_idx):
    """Detect ball/square from page text"""
    txt = page_text.upper()
    # Only match explicit ball nose/end references, not random 'BN' occurrences
    if 'BALL NOSE' in txt or 'BALL END' in txt or 'BALL-NOSE' in txt or 'BALL-END' in txt:
        return 'ball_mill'
    return None

def find_col_indices(header_row, sub_header_row=None):
    """Map column names to indices from header.
    OSG tables often have multi-column headers like 'Shank Diameter' spanning
    d(in) and d(mm) sub-columns. We need to handle empty header cells that
    inherit from a previous spanning header.
    """
    cols = {}
    headers = []
    sub_headers = []
    for i, cell in enumerate(header_row):
        headers.append(str(cell).strip().upper().replace('\n', ' ') if cell else '')
    if sub_header_row:
        for i in range(len(header_row)):
            s = str(sub_header_row[i]).strip().upper().replace('\n', ' ') if sub_header_row and i < len(sub_header_row) and sub_header_row[i] else ''
            sub_headers.append(s)

    # Propagate spanning headers: if header[i] is empty, inherit from previous non-empty
    propagated = list(headers)
    last_header = ''
    for i in range(len(propagated)):
        if propagated[i]:
            last_header = propagated[i]
        else:
            propagated[i] = last_header

    # Build combined header+subheader
    combined = []
    for i in range(len(headers)):
        h = propagated[i]
        s = sub_headers[i] if i < len(sub_headers) else ''
        combined.append(f'{h} {s}'.strip())

    for i, c in enumerate(combined):
        sub = sub_headers[i] if i < len(sub_headers) else ''
        if 'EDP' in c:
            cols['edp'] = i
        elif 'DIAMETER' in c and 'SHANK' not in c and 'NECK' not in c:
            if 'MM' in sub or ('(MM)' in c and 'SHANK' not in c):
                cols['diameter_mm'] = i
            elif 'INCH' in sub or 'FRACT' in sub or '(IN)' in sub:
                cols['diameter_inch'] = i
            elif 'MM' in c:
                cols['diameter_mm'] = i
            elif 'INCH' in c or 'FRACT' in c:
                cols['diameter_inch'] = i
            else:
                cols['diameter'] = i
        elif 'FLUTE LENGTH' in c or ('FL' in c and '(MM)' in sub):
            cols['flute_length'] = i
        elif 'LENGTH OF CUT' in c or ('LC' in c and i > 0):
            cols['loc'] = i
        elif 'OVERALL' in c and 'LENGTH' in c:
            if '(MM)' in sub or 'MM' in sub:
                cols['oal'] = i
            elif '(INCH)' in sub or '(IN)' in sub:
                cols['oal_inch'] = i
            else:
                cols['oal'] = i
        elif 'NECK LENGTH' in c or ('L1' in sub and 'NECK' in propagated[i] if i < len(propagated) else False):
            cols['neck_length'] = i
        elif 'NECK DIAMETER' in c or ('D1' in sub and 'NECK' in propagated[i] if i < len(propagated) else False):
            cols['neck_diameter'] = i
        elif 'SHANK' in c:
            if '(MM)' in sub or 'D (MM)' in c:
                cols['shank_mm'] = i
            elif '(IN)' in sub or '(INCH)' in sub or 'D (IN)' in c:
                cols['shank_inch'] = i
            elif 'MM' in sub:
                cols['shank_mm'] = i
            else:
                cols['shank'] = i
        elif c.strip() in ('D (MM)', 'D(MM)'):
            cols['diameter_mm'] = i
        elif c.strip() in ('D (INCH)', 'D(INCH)'):
            cols['diameter_inch'] = i
    return cols

# Track which series we're in
current_series = ''
current_flute_count = 2
current_material = 'carbide'

# Scan drilling section (p22-375) and milling section (p796-1131)
scan_ranges = list(range(21, 375)) + list(range(795, 1131))

for page_idx in scan_ranges:
    if page_idx >= len(doc):
        continue
    page = doc[page_idx]
    page_text = page.get_text()
    tool_type = detect_tool_type(page_idx)
    subtype = detect_subtype(page_text, page_idx)
    if subtype:
        tool_type = subtype

    # Detect flute count from page text
    txt_upper = page_text.upper()
    if '6 FLUTE' in txt_upper or '6-FLUTE' in txt_upper:
        current_flute_count = 6
    elif '5 FLUTE' in txt_upper or '5-FLUTE' in txt_upper:
        current_flute_count = 5
    elif '4 FLUTE' in txt_upper or '4-FLUTE' in txt_upper:
        current_flute_count = 4
    elif '3 FLUTE' in txt_upper or '3-FLUTE' in txt_upper:
        current_flute_count = 3
    elif '2 FLUTE' in txt_upper or '2-FLUTE' in txt_upper:
        current_flute_count = 2

    # Detect material
    if 'HSS' in txt_upper or 'COBALT' in txt_upper:
        current_material = 'hss'
    elif 'CARBIDE' in txt_upper:
        current_material = 'carbide'

    # Detect series name from header table
    for line in page_text.split('\n')[:10]:
        line_s = line.strip()
        if 'ADO-' in line_s or 'ADF-' in line_s or 'List ' in line_s:
            current_series = line_s[:50]
            break

    tables = list(page.find_tables())
    for table in tables:
        data = table.extract()
        if not data or len(data) < 3:
            continue

        # Find the header rows - look for EDP/Diameter pattern
        header_ri = -1
        for ri in range(min(3, len(data))):
            row_text = ' '.join(str(c) if c else '' for c in data[ri]).upper()
            if 'EDP' in row_text or ('DIAMETER' in row_text and ('LENGTH' in row_text or 'SHANK' in row_text)):
                header_ri = ri
                break

        if header_ri < 0:
            continue

        # Get sub-header if present
        sub_header = data[header_ri + 1] if header_ri + 1 < len(data) else None
        # Check if sub_header looks like a sub-header (has unit labels)
        if sub_header:
            sub_text = ' '.join(str(c) if c else '' for c in sub_header).upper()
            if 'MM' in sub_text or 'INCH' in sub_text or 'FRACT' in sub_text:
                data_start = header_ri + 2
            else:
                sub_header = None
                data_start = header_ri + 1
        else:
            data_start = header_ri + 1

        units = detect_units(sub_header if sub_header else data[header_ri])
        cols = find_col_indices(data[header_ri], sub_header)

        if not cols:
            continue

        for ri in range(data_start, len(data)):
            row = data[ri]
            if not row or len(row) < 3:
                continue

            # Get EDP number
            edp = ''
            if 'edp' in cols:
                edp = str(row[cols['edp']]).strip() if row[cols['edp']] else ''
            if not edp or not re.match(r'^\d{5,}', edp):
                # Try first column
                first = str(row[0]).strip() if row[0] else ''
                if re.match(r'^\d{5,}', first):
                    edp = first
                else:
                    continue

            # Extract diameter
            dia = None
            if 'diameter_mm' in cols:
                dia = pn(row[cols['diameter_mm']])
            elif 'diameter_inch' in cols:
                v = pn(row[cols['diameter_inch']])
                dia = inch_to_mm(v)
            elif 'diameter' in cols:
                v = pn(row[cols['diameter']])
                if v is not None:
                    dia = inch_to_mm(v) if units == 'inch' else v

            if dia is None or dia <= 0 or dia > 100:
                continue

            # Extract flute/LOC length
            loc = None
            for key in ['loc', 'flute_length']:
                if key in cols and cols[key] < len(row):
                    v = pn(row[cols[key]])
                    if v is not None:
                        loc = inch_to_mm(v) if units == 'inch' else v
                        break

            # Extract OAL
            oal = None
            if 'oal' in cols and cols['oal'] < len(row):
                v = pn(row[cols['oal']])
                if v is not None:
                    oal = inch_to_mm(v) if units == 'inch' else v
            elif 'oal_inch' in cols and cols['oal_inch'] < len(row):
                v = pn(row[cols['oal_inch']])
                if v is not None:
                    oal = inch_to_mm(v)

            # Extract shank diameter
            shank = None
            for key in ['shank_mm', 'shank_inch', 'shank']:
                if key in cols and cols[key] < len(row):
                    v = pn(row[cols[key]])
                    if v is not None:
                        if 'inch' in key or (key == 'shank' and units == 'inch'):
                            shank = inch_to_mm(v)
                        else:
                            shank = v
                        break

            # Extract neck
            neck_len = None
            neck_dia = None
            if 'neck_length' in cols and cols['neck_length'] < len(row):
                v = pn(row[cols['neck_length']])
                if v is not None:
                    neck_len = inch_to_mm(v) if units == 'inch' else v
            if 'neck_diameter' in cols and cols['neck_diameter'] < len(row):
                v = pn(row[cols['neck_diameter']])
                if v is not None:
                    neck_dia = inch_to_mm(v) if units == 'inch' else v

            if not (oal or loc):
                continue

            rec = {
                'edp': edp,
                'manufacturer': 'OSG',
                'type': tool_type,
                'material': current_material,
                'cutting_diameter_mm': round(dia, 3),
                'page': page_idx + 1,
            }
            if shank is not None:
                rec['shank_diameter_mm'] = round(shank, 3)
            if loc is not None:
                rec['flute_length_mm'] = round(loc, 3)
            if oal is not None:
                rec['overall_length_mm'] = round(oal, 3)
            if neck_len is not None:
                rec['neck_length_mm'] = round(neck_len, 3)
            if neck_dia is not None:
                rec['neck_diameter_mm'] = round(neck_dia, 3)
            if tool_type in ('end_mill', 'ball_mill'):
                rec['flute_count'] = current_flute_count

            # Validate
            if rec.get('overall_length_mm') and rec['overall_length_mm'] < rec['cutting_diameter_mm']:
                continue
            if rec.get('flute_length_mm') and rec.get('overall_length_mm') and rec['flute_length_mm'] > rec['overall_length_mm']:
                continue

            tools.append(rec)

# Deduplicate by EDP
seen = {}
for t in tools:
    edp = t['edp']
    if edp not in seen:
        seen[edp] = t
unique = list(seen.values())

# Stats
print(f"Unique tools: {len(unique)}")
print(f"By type: {dict(Counter(t['type'] for t in unique))}")
print(f"By material: {dict(Counter(t['material'] for t in unique))}")

dias = [t['cutting_diameter_mm'] for t in unique]
if dias:
    print(f"Diameter range: {min(dias)}-{max(dias)}mm")

with_loc = [t for t in unique if t.get('flute_length_mm')]
print(f"With LOC data: {len(with_loc)}")

with open('C:/PRISM/mcp-server/src/data/osg-tools-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:10]:
    print(f"  {sample['edp']}: type={sample['type']} D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')} flutes={sample.get('flute_count')}")
print("...")
for sample in [t for t in unique if t['type'] == 'end_mill'][:10]:
    print(f"  {sample['edp']}: type={sample['type']} D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')} flutes={sample.get('flute_count')}")
