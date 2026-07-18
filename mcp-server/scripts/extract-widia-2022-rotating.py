#!/usr/bin/env python3
"""
Extract rotating tool data (end mills, drills) from WIDIA 2022 Master Catalog.
Scans Solid End Milling (pages 347-544) and Holemaking (pages 545-720).
Uses pymupdf find_tables() to extract dimension tables.
"""

import sys
import io
import os
import json
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import fitz

PDF_PATH = r"C:\PRISM\CATALOGS\Cutting Tools Master 2022 English Metric.pdf"
JSON_OUT = r"C:\PRISM\mcp-server\src\data\widia-2022-rotating-extracted.json"
TS_OUT = r"C:\PRISM\mcp-server\src\data\widia-2022-rotating-catalog.ts"
SANDVIK_TS = r"C:\PRISM\mcp-server\src\data\sandvik-tool-catalog.ts"

# Page ranges to scan
# Section B: Solid End Milling (347-544), Section C: Holemaking solid carbide drills (545-670)
PAGE_START = 347
PAGE_END = 670


def fix_decimal(val):
    """Convert European comma decimal to dot, strip whitespace."""
    if val is None:
        return None
    val = str(val).strip().replace('\u00a0', '').replace('\n', ' ')
    # Handle comma as decimal separator
    val = val.replace(',', '.')
    # Remove any trailing dots
    val = val.rstrip('.')
    return val


def try_float(val):
    """Attempt to parse a float from a string. Returns None on failure."""
    val = fix_decimal(val)
    if val is None or val == '' or val == '-' or val == '\u2014':
        return None
    # Remove everything that's not digit, dot, or minus
    cleaned = re.sub(r'[^\d.\-]', '', val)
    if not cleaned or cleaned == '.' or cleaned == '-':
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def try_int(val):
    """Attempt to parse an int from a string."""
    f = try_float(val)
    if f is not None:
        return int(round(f))
    return None


def extract_designation(cell):
    """Extract catalogue designation from an order#/catalogue# cell."""
    if cell is None:
        return None
    text = str(cell).strip().replace('\n', ' ')
    # Pattern: order_number catalogue_number (e.g., "6945502 W401M03003SZT")
    # Or just catalogue number
    parts = text.split()
    if len(parts) >= 2:
        # Second part is usually the catalogue number (alphanumeric with letters)
        for p in parts[1:]:
            if re.match(r'^[A-Za-z0-9]{6,}$', p):
                return p
        # If no match, try first part
        for p in parts:
            if re.match(r'^[A-Za-z0-9]{6,}$', p) and re.search(r'[A-Za-z]', p):
                return p
    elif len(parts) == 1 and re.search(r'[A-Za-z]', parts[0]):
        return parts[0]
    return None


def is_header_row(row):
    """Check if a row is a header row (contains column label text)."""
    text = ' '.join(str(c) for c in row if c).lower()
    header_kws = ['order', 'catalogue', 'diameter', 'length', 'cut', 'grade', 'tialn', 'ticrn']
    return sum(1 for kw in header_kws if kw in text) >= 2


def is_nav_table(row):
    """Check if a table is a navigation sidebar (INDEXABLE MILLING, SOLID END MILLING, etc.)."""
    text = ' '.join(str(c) for c in row if c).upper()
    return any(kw in text for kw in ['INDEXABLE MILLING', 'HOLEMAKING', 'TAPPING', 'TURNING'])


def classify_tool_type(page_text, page_num, designation):
    """Determine tool type from page context and designation."""
    text_lower = page_text.lower()
    desig_upper = (designation or '').upper()

    # Drill indicators
    if page_num >= 545:
        return 'drill'
    if any(kw in text_lower for kw in ['drill', 'varidrill', 'top drill', 'tds', 'tdd', 'vds']):
        if any(kw in desig_upper for kw in ['VDS', 'TDS', 'TDD', 'TD1', 'DRILL']):
            return 'drill'

    # Ball nose indicators
    if any(kw in text_lower for kw in ['ball nose', 'ball end', 'ball mill']):
        return 'ball_mill'

    # Default: end mill for section B
    return 'end_mill'


def detect_point_angle(page_text):
    """Try to extract point angle from page text (for drills)."""
    m = re.search(r'(\d{2,3})\s*[°\u00b0]\s*(?:point|P\s*point)', page_text)
    if m:
        return int(m.group(1))
    m = re.search(r'point\s*angle[:\s]*(\d{2,3})', page_text.lower())
    if m:
        return int(m.group(1))
    return None


def detect_helix_angle(page_text):
    """Try to extract helix angle from page text."""
    m = re.search(r'(?:helix|helix angle)[:\s]*(\d{1,2})\s*[°\u00b0]', page_text, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def parse_end_mill_table(table_data, page_text, page_num):
    """
    Parse end mill dimension tables.
    Common column layouts observed:
    - 6 cols: designation, D1, D, Ap1_max, L, Z
    - 7 cols: designation, D1, D, Ap1_max, L, BCH(corner_radius), Z
    - 8 cols: designation, D1, D, D3, Ap1_max, L3, L, Z
    """
    tools = []
    helix = detect_helix_angle(page_text)

    for row in table_data:
        if not row or len(row) < 5:
            continue
        if is_header_row(row) or is_nav_table(row):
            continue

        # Skip rows where first cell has no alphanumeric content
        first = str(row[0] or '').strip()
        if not first or not re.search(r'[A-Za-z0-9]', first):
            continue

        desig = extract_designation(row[0])
        if not desig:
            continue

        ncols = len(row)
        tool_type = classify_tool_type(page_text, page_num, desig)

        # Parse based on column count
        if ncols == 6:
            # designation, D1, D, Ap1_max, L, Z
            d1 = try_float(row[1])
            d_shank = try_float(row[2])
            loc = try_float(row[3])
            oal = try_float(row[4])
            cr = None
            z = try_int(row[5])
        elif ncols == 7:
            # designation, D1, D, Ap1_max, L, BCH, Z
            d1 = try_float(row[1])
            d_shank = try_float(row[2])
            loc = try_float(row[3])
            oal = try_float(row[4])
            cr = try_float(row[5])
            z = try_int(row[6])
        elif ncols == 8:
            # designation, D1, D, D3, Ap1_max, L3, L, Z
            d1 = try_float(row[1])
            d_shank = try_float(row[2])
            # row[3] = D3 (neck diameter), skip
            loc = try_float(row[4])
            l3 = try_float(row[5])
            oal = try_float(row[6])
            cr = None
            z = try_int(row[7])
            # Some 8-col tables have: desig, D1, D, D3, Ap1max, L3, L, Z
            # If L3 > L, swap
            if l3 and oal and l3 > oal:
                loc, oal = oal, l3
        else:
            continue

        # Build tool entry
        tool = build_tool(desig, tool_type, d1, d_shank, oal, loc, cr, z, helix, None)
        if tool:
            tools.append(tool)

    return tools


def parse_drill_table(table_data, page_text, page_num):
    """
    Parse drill dimension tables.
    Common layouts:
    - 9 cols (VDS/TDS 3xD/5xD): desig(+alt), D1_mm, D1_in, L4max, L3, L5, L, LS, D
      Header: "order# catalogue#", "D1 diameter mm in", "L4 max L3 L5 L LS D"
    - 9 cols (TDD deep hole): desig(+alt), D1_mm, D1_in, D, L3, L4max, L5, LS, L
      Header: "D1 diameter mm in", "D L3 L4 max L5 LS L"
    """
    tools = []
    point_angle = detect_point_angle(page_text)
    helix = detect_helix_angle(page_text)
    text_lower = page_text.lower()

    # Detect if deep hole drill (TDD) — columns are reordered
    is_deep_hole = 'deep hole' in text_lower or 'tdd' in text_lower

    for row in table_data:
        if not row or len(row) < 7:
            continue
        if is_header_row(row) or is_nav_table(row):
            continue

        first = str(row[0] or '').strip()
        if not first or not re.search(r'[A-Za-z0-9]', first):
            continue

        # Drill tables may have two designations in col 0 and col 1
        # e.g., "4144195 VDS201A01000" and "–" or "4140312 VDS401A03700"
        desig = extract_designation(row[0])
        desig2 = extract_designation(row[1]) if len(row) > 1 else None

        ncols = len(row)

        if ncols >= 9:
            if is_deep_hole:
                # TDD: desig, D1_mm, D1_in, D_shank, L3(flute), L4max, L5, LS, L(OAL)
                d1 = try_float(row[2])       # D1 mm (col index varies)
                d_shank = try_float(row[3])
                loc = try_float(row[4])       # L3 = flute length
                oal = try_float(row[8])       # L = overall length
            else:
                # VDS/TDS: desig(+alt), D1_mm, D1_in, L4max, L3(flute), L5, L(OAL), LS, D_shank
                # But col 1 might be alt desig or D1_mm
                # Check if col 1 looks like a designation or number
                col1_is_desig = bool(extract_designation(row[1]))
                if col1_is_desig:
                    # Two designation columns
                    d1 = try_float(row[2])
                    # row[3] = D1 in inches, skip
                    loc = try_float(row[5])       # L3
                    oal = try_float(row[7])        # L (sometimes) or row[4]
                    d_shank = try_float(row[9]) if ncols > 9 else try_float(row[8])
                    # Heuristic: if row[4] looks like OAL (>50), it might be L
                    r4 = try_float(row[4])
                    r7 = try_float(row[7])
                    if r4 and r7 and r4 > r7:
                        oal = r4
                        loc = try_float(row[5])
                else:
                    # Single designation column
                    d1 = try_float(row[1])
                    # row[2] = D1 in inches
                    loc = try_float(row[4])       # L3
                    oal = try_float(row[6])        # L
                    d_shank = try_float(row[8])
        elif ncols >= 7:
            d1 = try_float(row[1])
            d_shank = try_float(row[2])
            loc = try_float(row[3])
            oal = try_float(row[4])
        else:
            continue

        # Build drill tools
        for d in [desig, desig2]:
            if d:
                tool = build_tool(d, 'drill', d1, d_shank, oal, loc, None, 2, helix, point_angle)
                if tool:
                    tools.append(tool)

    return tools


def build_tool(desig, tool_type, d1, d_shank, oal, loc, cr, z, helix, point_angle):
    """Build and validate a tool dict."""
    if not desig or d1 is None or d1 <= 0:
        return None

    # Basic validation
    if oal is not None and oal <= 0:
        oal = None
    if loc is not None and loc <= 0:
        loc = None

    # OAL should be > LOC
    if oal and loc and oal < loc:
        oal, loc = loc, oal  # swap if reversed

    # Shank should be reasonable (0.5 - 50mm typical)
    if d_shank is not None and (d_shank <= 0 or d_shank > 80):
        d_shank = None

    # Corner radius: ignore dash/none values
    if cr is not None and cr <= 0:
        cr = None

    tool = {
        'designation': desig,
        'type': tool_type,
        'cutting_diameter_mm': round(d1, 3),
    }
    if d_shank is not None:
        tool['shank_diameter_mm'] = round(d_shank, 3)
    if oal is not None:
        tool['overall_length_mm'] = round(oal, 2)
    if loc is not None:
        tool['flute_length_mm'] = round(loc, 2)
    if cr is not None:
        tool['corner_radius_mm'] = round(cr, 3)
    if z is not None and 1 <= z <= 12:
        tool['flute_count'] = z
    if helix is not None:
        tool['helix_angle_deg'] = helix
    if point_angle is not None and tool_type == 'drill':
        tool['point_angle_deg'] = point_angle

    return tool


def load_existing_designations():
    """Load designations from sandvik-tool-catalog.ts for dedup."""
    existing = set()
    if not os.path.exists(SANDVIK_TS):
        return existing
    with open(SANDVIK_TS, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            m = re.search(r'designation:"([^"]+)"', line)
            if m:
                existing.add(m.group(1).upper())
    print(f"Loaded {len(existing)} existing Sandvik designations for dedup")
    return existing


def main():
    print("Opening PDF...")
    doc = fitz.open(PDF_PATH)
    print(f"PDF has {len(doc)} pages. Scanning pages {PAGE_START}-{PAGE_END}...")

    existing_desigs = load_existing_designations()
    all_tools = []
    seen_desigs = set()
    pages_with_data = 0
    skipped_dupes = 0
    skipped_existing = 0

    for pg_num in range(PAGE_START, min(PAGE_END + 1, len(doc))):
        page = doc[pg_num]
        page_text = page.get_text()

        tabs = page.find_tables()
        if not tabs.tables:
            continue

        is_drill_section = pg_num >= 545
        page_tools = []

        for tab in tabs.tables:
            data = tab.extract()
            if not data or len(data) < 2:
                continue

            # Skip tiny nav sidebar tables
            if len(data) <= 2 and len(data[0]) <= 2:
                if is_nav_table(data[0]):
                    continue

            # Skip speed/feed recommendation tables (many columns with Material Group)
            header_text = ' '.join(str(c) for c in data[0] if c).lower()
            if 'material' in header_text and 'group' in header_text:
                continue
            if 'speed' in header_text and 'feed' in header_text:
                continue
            if 'recommended' in header_text:
                continue

            if is_drill_section:
                page_tools.extend(parse_drill_table(data, page_text, pg_num))
            else:
                page_tools.extend(parse_end_mill_table(data, page_text, pg_num))

        # Dedup within this extraction
        for tool in page_tools:
            key = tool['designation'].upper()
            if key in seen_desigs:
                skipped_dupes += 1
                continue
            if key in existing_desigs:
                skipped_existing += 1
                continue
            seen_desigs.add(key)
            all_tools.append(tool)

        if page_tools:
            pages_with_data += 1

        if (pg_num - PAGE_START) % 50 == 0:
            print(f"  Page {pg_num}: {len(all_tools)} tools so far...")

    doc.close()

    # Summary stats
    end_mills = sum(1 for t in all_tools if t['type'] == 'end_mill')
    ball_mills = sum(1 for t in all_tools if t['type'] == 'ball_mill')
    drills = sum(1 for t in all_tools if t['type'] == 'drill')

    print(f"\n=== EXTRACTION COMPLETE ===")
    print(f"Pages with data: {pages_with_data}")
    print(f"Total tools extracted: {len(all_tools)}")
    print(f"  End mills: {end_mills}")
    print(f"  Ball mills: {ball_mills}")
    print(f"  Drills: {drills}")
    print(f"Skipped (internal dupes): {skipped_dupes}")
    print(f"Skipped (in Sandvik catalog): {skipped_existing}")

    # Save JSON
    print(f"\nSaving JSON to {JSON_OUT}...")
    os.makedirs(os.path.dirname(JSON_OUT), exist_ok=True)
    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump(all_tools, f, indent=2, ensure_ascii=False)
    print(f"JSON saved: {len(all_tools)} tools")

    # Generate TypeScript
    print(f"Generating TypeScript to {TS_OUT}...")
    generate_typescript(all_tools)
    print(f"TypeScript saved: {len(all_tools)} tools")


def generate_typescript(tools):
    """Generate TypeScript catalog file."""
    lines = []
    lines.append('// @ts-nocheck - large array exceeds TS union complexity limit')
    lines.append('// Auto-generated from WIDIA Cutting Tools Master 2022 English Metric.pdf')
    lines.append(f'// Total: {len(tools)} rotating tools (end mills + drills)')
    lines.append(f'// Extraction date: 2026-03-14')
    lines.append('')
    lines.append('export interface WidiaTool {')
    lines.append('  designation: string;')
    lines.append('  type: "end_mill" | "drill" | "ball_mill";')
    lines.append('  cutting_diameter_mm: number;')
    lines.append('  shank_diameter_mm?: number;')
    lines.append('  overall_length_mm?: number;')
    lines.append('  flute_length_mm?: number;')
    lines.append('  corner_radius_mm?: number;')
    lines.append('  flute_count?: number;')
    lines.append('  helix_angle_deg?: number;')
    lines.append('  point_angle_deg?: number;')
    lines.append('}')
    lines.append('')
    lines.append('export const WIDIA_2022_ROTATING_TOOLS: WidiaTool[] = [')

    for tool in tools:
        parts = [f'designation:"{tool["designation"]}"']
        parts.append(f'type:"{tool["type"]}"')
        parts.append(f'cutting_diameter_mm:{tool["cutting_diameter_mm"]}')
        if 'shank_diameter_mm' in tool:
            parts.append(f'shank_diameter_mm:{tool["shank_diameter_mm"]}')
        if 'overall_length_mm' in tool:
            parts.append(f'overall_length_mm:{tool["overall_length_mm"]}')
        if 'flute_length_mm' in tool:
            parts.append(f'flute_length_mm:{tool["flute_length_mm"]}')
        if 'corner_radius_mm' in tool:
            parts.append(f'corner_radius_mm:{tool["corner_radius_mm"]}')
        if 'flute_count' in tool:
            parts.append(f'flute_count:{tool["flute_count"]}')
        if 'helix_angle_deg' in tool:
            parts.append(f'helix_angle_deg:{tool["helix_angle_deg"]}')
        if 'point_angle_deg' in tool:
            parts.append(f'point_angle_deg:{tool["point_angle_deg"]}')
        lines.append('  {' + ','.join(parts) + '},')

    lines.append('];')
    lines.append('')

    with open(TS_OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


if __name__ == '__main__':
    main()
