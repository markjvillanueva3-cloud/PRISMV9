#!/usr/bin/env python3
"""Extract Guhring drill and endmill dimensions from guhring full catalog.pdf"""
import pymupdf, sys, io, json, re
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/guhring full catalog.pdf')

tools = []

def pn(s):
    s = str(s).strip()
    if not s or s == '-':
        return None
    s = re.sub(r'[^0-9.\-]', '', s)
    if not s:
        return None
    try:
        return float(s)
    except:
        return None

# Guhring table format:
# Header row has article number (e.g. "6489")
# Column headers: d1 (cutting dia), d2 h6 (shank dia), l1 (OAL), l2 (flute length), l3 (optional)
# Data rows: numeric values then order number

current_article = ''

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_text = page.get_text()

    # Detect article number from page text
    art_match = re.search(r'Article\s+no\.\s+(\d+)', page_text)
    if art_match:
        current_article = art_match.group(1)

    tables = list(page.find_tables())
    for table in tables:
        data = table.extract()
        if not data or len(data) < 2:
            continue

        # Find header row with d1/d2/l1/l2 columns
        header_ri = -1
        col_map = {}
        for ri in range(min(4, len(data))):
            row_text = ' '.join(str(c).lower() if c else '' for c in data[ri])
            if 'd1' in row_text and ('l1' in row_text or 'l2' in row_text):
                header_ri = ri
                # Map columns
                for ci, cell in enumerate(data[ri]):
                    cv = str(cell).strip().lower() if cell else ''
                    if cv == 'd1' or cv.startswith('d1'):
                        col_map['d1'] = ci
                    elif cv in ('d2', 'd2 h6', 'dh6', 'd2h6') or 'd2' in cv:
                        col_map['d2'] = ci
                    elif cv == 'l1':
                        col_map['l1'] = ci
                    elif cv == 'l2':
                        col_map['l2'] = ci
                    elif cv == 'l3':
                        col_map['l3'] = ci
                    elif cv == 'b':
                        col_map['b'] = ci  # width for reamers
                break

        if header_ri < 0 or 'd1' not in col_map:
            continue

        # Check for units row (mm / inch)
        data_start = header_ri + 1
        if data_start < len(data):
            unit_row = data[data_start]
            unit_text = ' '.join(str(c).lower() if c else '' for c in unit_row)
            if 'mm' in unit_text or 'inch' in unit_text:
                data_start += 1

        # Determine tool type from article number ranges (approximate)
        # Guhring article structure:
        # 200-599: Drills (HSS and carbide)
        # 600-899: Step drills, countersinks, reamers
        # 3000-3999: End mills
        # 5000-5999: Micro drills, precision drills
        # 6000-6999: Carbide drills
        # 7000-7999: Step drills
        # 8000-8999: End mills, countersinks
        art_num = int(current_article) if current_article.isdigit() else 0
        if 3000 <= art_num < 4000 or 8000 <= art_num < 9000:
            tool_type = 'end_mill'
        elif any(kw in page_text.upper() for kw in ['END MILL', 'ENDMILL', 'MILLING CUTTER']):
            tool_type = 'end_mill'
        elif any(kw in page_text.upper() for kw in ['REAMER']):
            tool_type = 'reamer'
        elif any(kw in page_text.upper() for kw in ['BALL NOSE', 'BALL END']):
            tool_type = 'ball_mill'
        else:
            tool_type = 'drill'

        for ri in range(data_start, len(data)):
            row = data[ri]
            if not row or len(row) < 2:
                continue

            d1 = pn(row[col_map['d1']]) if 'd1' in col_map and col_map['d1'] < len(row) else None
            if d1 is None or d1 <= 0 or d1 > 100:
                continue

            d2 = pn(row[col_map['d2']]) if 'd2' in col_map and col_map['d2'] < len(row) else None
            l1 = pn(row[col_map['l1']]) if 'l1' in col_map and col_map['l1'] < len(row) else None
            l2 = pn(row[col_map['l2']]) if 'l2' in col_map and col_map['l2'] < len(row) else None

            # Find order number (usually last column or has article prefix)
            order_no = ''
            for ci in range(len(row) - 1, -1, -1):
                cv = str(row[ci]).strip() if row[ci] else ''
                if re.match(r'^\d{3,}\s', cv) or re.match(r'^\d{3,}\.\d', cv):
                    order_no = cv
                    break

            if not order_no and current_article:
                order_no = f'{current_article}-{d1}'

            if not (l1 or l2):
                continue

            rec = {
                'designation': order_no or f'GUH-{current_article}-{d1}',
                'manufacturer': 'Guhring',
                'type': tool_type,
                'article': current_article,
                'cutting_diameter_mm': d1,
                'page': page_idx + 1,
            }
            if d2 is not None and d2 > 0:
                rec['shank_diameter_mm'] = d2
            if l1 is not None and l1 > 0:
                rec['overall_length_mm'] = l1
            if l2 is not None and l2 > 0:
                rec['flute_length_mm'] = l2

            # Validate
            if rec.get('overall_length_mm') and rec['overall_length_mm'] < d1 * 0.5:
                continue
            if rec.get('flute_length_mm') and rec.get('overall_length_mm') and rec['flute_length_mm'] > rec['overall_length_mm']:
                continue

            tools.append(rec)

# Deduplicate by designation
seen = {}
for t in tools:
    d = t['designation']
    if d not in seen:
        seen[d] = t
unique = list(seen.values())

print(f"Unique tools: {len(unique)}")
print(f"By type: {dict(Counter(t['type'] for t in unique))}")
dias = [t['cutting_diameter_mm'] for t in unique]
if dias:
    print(f"Diameter range: {min(dias)}-{max(dias)}mm")
with_loc = [t for t in unique if t.get('flute_length_mm')]
print(f"With LOC data: {len(with_loc)}")
with_shank = [t for t in unique if t.get('shank_diameter_mm')]
print(f"With shank data: {len(with_shank)}")

with open('C:/PRISM/mcp-server/src/data/guhring-tools-extracted.json', 'w') as f:
    json.dump(unique, f, indent=2)
print(f"Saved {len(unique)} records")

for sample in unique[:15]:
    print(f"  {sample['designation']}: type={sample['type']} D={sample.get('cutting_diameter_mm')} shank={sample.get('shank_diameter_mm')} LOC={sample.get('flute_length_mm')} OAL={sample.get('overall_length_mm')}")
