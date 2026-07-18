#!/usr/bin/env python3
"""Extract Accupro tools from PDF catalog.
Accupro tables have multi-line cells where each line is a separate tool.
Columns vary: Size, Dec Equiv, Shank Dia, Flute L, OAL, Order #, Price
Units: inch (some pages show mm for flute/OAL)
Output: src/data/accupro-tools-extracted.json
"""

import pymupdf
import json
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

pdf_path = "C:/PRISM/CATALOGS/Accupro 2013.pdf"
output_path = "C:/PRISM/mcp-server/src/data/accupro-tools-extracted.json"

doc = pymupdf.open(pdf_path)
print(f"Opened: {pdf_path} ({len(doc)} pages)")

tools = []
seen = set()

def parse_fraction(s):
    """Parse fractional inch like '3/64' or '3⁄64' to decimal."""
    s = s.replace('⁄', '/').strip()
    m = re.match(r'(\d+)\s*/\s*(\d+)', s)
    if m:
        return float(m.group(1)) / float(m.group(2))
    m = re.match(r'(\d+)\s+(\d+)\s*/\s*(\d+)', s)
    if m:
        return float(m.group(1)) + float(m.group(2)) / float(m.group(3))
    return None

def parse_num(s):
    """Parse a number, handling fractions."""
    if not s or s.strip() in ('', '-', '–', 'None'):
        return None
    s = s.strip().replace('⁄', '/')
    # Try fraction first
    frac = parse_fraction(s)
    if frac:
        return frac
    # Try decimal
    m = re.match(r'(-?\d+\.?\d*)', s.replace(',', '.'))
    if m:
        return float(m.group(1))
    return None

# Detect tool type from page context
def detect_type(page_text):
    t = page_text.lower()
    if 'thread mill' in t:
        return 'thread_mill'
    if 'tap' in t and 'thread' in t:
        return 'tap'
    if 'drill' in t or 'jobber' in t or 'stub' in t or 'screw machine' in t:
        return 'drill'
    if 'ball' in t and ('end' in t or 'mill' in t):
        return 'ball_mill'
    if 'end mill' in t or 'endmill' in t:
        return 'end_mill'
    if 'reamer' in t:
        return 'reamer'
    if 'counter' in t:
        return 'countersink'
    return 'end_mill'

def detect_units(header_text):
    """Check if dimensions are in mm or inch."""
    if '(mm)' in header_text:
        return 'mm'
    return 'inch'

for page_idx in range(len(doc)):
    page = doc[page_idx]
    page_text = page.get_text()[:800]
    tabs = page.find_tables()

    for t in tabs.tables:
        data = t.extract()
        if len(data) < 2:
            continue

        # Parse header to find columns
        header = str(data[0][0]) if data[0] and data[0][0] else ''
        if not header:
            continue

        # Must contain dimension keywords
        has_dims = any(kw in header for kw in ['Flute', 'OAL', 'Dia', 'LOC', 'Length', 'Size'])
        if not has_dims:
            continue

        units = detect_units(header)
        tool_type = detect_type(page_text)

        # Parse header columns from the multi-column header text
        # Headers like: "Size Dec. Shank Flute OAL\n(In.) Equiv. (In.) Dia. (mm) L (mm) (mm)"
        # These are single-cell headers describing the dimension columns within the multi-line data

        # Each data row is actually multiple tools concatenated with newlines
        for row_idx in range(1, len(data)):
            row = data[row_idx]
            if not row or not row[0]:
                continue

            # The first cell contains multiple tool lines
            dim_text = str(row[0]).strip()
            lines = dim_text.split('\n')

            for line in lines:
                line = line.strip()
                if not line or len(line) < 3:
                    continue

                # Parse dimension values from the line
                # Format varies:
                # "3⁄64 0.0469 9⁄32 17⁄64" (size, dec_equiv, flute_l, oal)
                # "1⁄8 0.1250 3 19.8 68" (size, dec_equiv, shank_dia, flute_l, oal - mm)
                # "1⁄8 0.1250 36 65" (size, dec_equiv, flute_l, oal - mm)

                # Extract all numbers/fractions from the line
                tokens = re.split(r'\s+', line)
                numbers = []
                for tok in tokens:
                    tok = tok.replace('⁄', '/')
                    # Try fraction
                    fm = re.match(r'^(\d+/\d+)$', tok)
                    if fm:
                        numbers.append(('frac', parse_fraction(tok)))
                        continue
                    # Try compound fraction like "215⁄16" -> "2 15/16"
                    fm = re.match(r'^(\d+)(\d+/\d+)$', tok)
                    if fm:
                        whole = float(fm.group(1))
                        frac = parse_fraction(fm.group(2))
                        if frac:
                            numbers.append(('frac', whole + frac))
                        continue
                    # Try decimal
                    dm = re.match(r'^(\d+\.?\d*)$', tok)
                    if dm:
                        numbers.append(('dec', float(dm.group(1))))
                        continue
                    # Try #number (drill number)
                    dm = re.match(r'^#(\d+)$', tok)
                    if dm:
                        numbers.append(('drill_num', float(dm.group(1))))
                        continue
                    # Try letter size
                    if re.match(r'^[A-Z]$', tok):
                        numbers.append(('letter', tok))
                        continue

                if len(numbers) < 3:
                    continue

                # Determine what each number means based on header and count
                dc = None  # cutting diameter (inch)
                shank = None
                flute_l = None
                oal = None
                flute_count = None

                if 'Shank' in header and 'Dia' in header:
                    # Format: size, dec_equiv, shank_dia, flute_l, oal
                    if len(numbers) >= 5:
                        dc = numbers[1][1] if numbers[1][0] == 'dec' else None  # dec equiv in inches
                        shank = numbers[2][1]
                        flute_l = numbers[3][1]
                        oal = numbers[4][1]
                    elif len(numbers) >= 4:
                        dc = numbers[1][1] if numbers[1][0] == 'dec' else numbers[0][1]
                        shank = numbers[2][1] if 'Shank' in header else None
                        flute_l = numbers[-2][1]
                        oal = numbers[-1][1]
                elif 'No. of' in header and 'Flutes' in header:
                    # Thread mill format: size, shank, cutter_dia, oal, loc, flutes
                    if len(numbers) >= 6:
                        dc = numbers[2][1]  # cutter dia
                        shank = numbers[1][1]
                        oal = numbers[3][1]
                        flute_l = numbers[4][1]
                        flute_count = int(numbers[5][1])
                elif 'Thread' in header:
                    # Tap format - skip for now (no cutting diameter)
                    continue
                else:
                    # Standard: size, dec_equiv, flute_l, oal
                    if numbers[0][0] == 'drill_num' or numbers[0][0] == 'letter':
                        # Numbered/lettered drill
                        if len(numbers) >= 4:
                            dc = numbers[1][1]
                            flute_l = numbers[2][1]
                            oal = numbers[3][1]
                        else:
                            continue
                    elif len(numbers) >= 4:
                        dc = numbers[1][1] if numbers[1][0] == 'dec' else numbers[0][1]
                        flute_l = numbers[2][1]
                        oal = numbers[3][1]
                    elif len(numbers) >= 3:
                        dc = numbers[0][1]
                        flute_l = numbers[1][1]
                        oal = numbers[2][1]

                if not dc or dc <= 0 or dc > 5:  # Max 5 inch
                    continue

                # Convert to mm
                dc_mm = dc * 25.4 if units == 'inch' or dc < 1 else dc
                # Flute/OAL might be mm or inch depending on header
                if units == 'mm':
                    fl_mm = flute_l if isinstance(flute_l, (int, float)) else None
                    oal_mm = oal if isinstance(oal, (int, float)) else None
                else:
                    fl_mm = flute_l * 25.4 if isinstance(flute_l, (int, float)) and flute_l < 20 else (flute_l if isinstance(flute_l, (int, float)) else None)
                    oal_mm = oal * 25.4 if isinstance(oal, (int, float)) and oal < 20 else (oal if isinstance(oal, (int, float)) else None)

                # Handle shank
                shank_mm = None
                if isinstance(shank, (int, float)):
                    shank_mm = shank * 25.4 if shank < 5 else shank

                # Create designation
                desig = f"ACCU-{dc:.4f}"
                if desig in seen:
                    # Add type suffix for uniqueness
                    desig = f"ACCU-{dc:.4f}-{tool_type}"
                if desig in seen:
                    desig = f"ACCU-{dc:.4f}-{tool_type}-{page_idx}"
                if desig in seen:
                    continue
                seen.add(desig)

                tool = {
                    "designation": desig,
                    "manufacturer": "Accupro",
                    "type": tool_type,
                    "cutting_diameter_mm": round(dc_mm, 3),
                }
                if shank_mm:
                    tool["shank_diameter_mm"] = round(shank_mm, 3)
                if fl_mm:
                    tool["flute_length_mm"] = round(fl_mm, 2)
                if oal_mm:
                    tool["overall_length_mm"] = round(oal_mm, 2)
                if flute_count:
                    tool["flute_count"] = flute_count

                tools.append(tool)

doc.close()

type_counts = {}
for t in tools:
    tt = t.get('type', '?')
    type_counts[tt] = type_counts.get(tt, 0) + 1

print(f"\nExtracted: {len(tools)} tools")
print(f"By type: {type_counts}")
print(f"Diameter range: {min(t['cutting_diameter_mm'] for t in tools):.2f} - {max(t['cutting_diameter_mm'] for t in tools):.2f} mm")

with open(output_path, 'w') as f:
    json.dump(tools, f, indent=2)
print(f"Saved to {output_path}")
