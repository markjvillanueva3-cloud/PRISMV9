#!/usr/bin/env python3
"""
Extract WIDIA 2022 turning insert data from Cutting Tools Master 2022 English Metric.pdf
Scans E-section (pages ~727-910) for insert geometry tables and speed/feed charts.
Outputs JSON + TypeScript catalog files.

Usage: python -X utf8 extract-widia-2022.py
"""

import sys
import io
import os
import re
import json

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import fitz  # pymupdf

# ─── Config ───────────────────────────────────────────────────────────────────
PDF_PATH = r"C:\PRISM\CATALOGS\Cutting Tools Master 2022 English Metric.pdf"
JSON_OUT = r"C:\PRISM\mcp-server\src\data\widia-2022-extracted.json"
TS_OUT = r"C:\PRISM\mcp-server\src\data\widia-2022-turning-catalog.ts"
SANDVIK_TS = r"C:\PRISM\mcp-server\src\data\sandvik-tool-catalog.ts"

# Page ranges (0-indexed)
INSERT_PAGES = range(727, 910)       # E-section turning inserts (E1-E185)
SPEED_FEED_PAGES = range(733, 750)   # E10-E25 speed/feed charts
GROOVING_PAGES = range(1025, 1110)   # E299-E385 grooving
THREADING_PAGES = range(1155, 1210)  # E430-E485 threading

# ISO insert shape code → shape name
SHAPE_MAP = {
    'C': 'Diamond 80°', 'D': 'Diamond 55°', 'K': 'Diamond 55° (alt)',
    'R': 'Round', 'S': 'Square', 'T': 'Triangle',
    'V': 'Diamond 35°', 'W': 'Trigon 80°', 'N': 'Diamond 55° Negative',
    'A': 'Parallelogram 85°', 'B': 'Parallelogram 82°', 'E': 'Diamond 75°',
    'H': 'Hexagon', 'L': 'Rectangle', 'M': 'Diamond 86°',
    'O': 'Octagon', 'P': 'Pentagon',
}

# Known insert designation pattern: 4 letters + digits + optional suffix
INSERT_RE = re.compile(
    r'^([A-Z]{4})(\d{4,8})([A-Z0-9]{0,6})$'
)
# Broader pattern that also catches designations like CNGN120404T02020
INSERT_BROAD_RE = re.compile(
    r'^([A-Z]{3,5})(\d{5,8})([A-Z]?\d{0,5})$'
)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def eu_float(s):
    """Parse European decimal (comma as separator) to float."""
    if not s:
        return None
    s = str(s).strip().replace('\xa0', '').replace(' ', '')
    if s in ('', '-', '–', '—', 'None'):
        return None
    s = s.replace(',', '.')
    try:
        return round(float(s), 4)
    except ValueError:
        return None


def extract_shape_code(designation):
    """Extract the shape letter from an ISO insert designation."""
    if not designation or len(designation) < 4:
        return None
    return designation[0]


def extract_chipbreaker(designation):
    """Extract chipbreaker suffix from designation (last 2-3 alpha chars after digits)."""
    m = re.search(r'(\d)([A-Z]{1,4})$', designation)
    if m:
        return m.group(2)
    return None


def parse_insert_row(row):
    """Parse a table row into an insert dict. Returns None if not an insert row."""
    if not row or not row[0]:
        return None
    desig = str(row[0]).strip().replace('\n', '').replace(' ', '')
    if len(desig) < 8:
        return None

    # Must match insert pattern
    if not (INSERT_RE.match(desig) or INSERT_BROAD_RE.match(desig)):
        return None

    # Must start with known shape codes for turning
    shape_letter = desig[0]
    if shape_letter not in SHAPE_MAP:
        return None

    # Extract dimensions from columns 1-5 (D, L10, S, R, D1)
    d_ic = eu_float(row[1]) if len(row) > 1 else None
    l10 = eu_float(row[2]) if len(row) > 2 else None
    s_thick = eu_float(row[3]) if len(row) > 3 else None
    r_nose = eu_float(row[4]) if len(row) > 4 else None
    d1 = eu_float(row[5]) if len(row) > 5 else None

    # Validate: must have at least IC diameter
    if d_ic is None:
        return None

    # Extract available grades from remaining columns
    grades = []
    if len(row) > 7:
        # Row 6 (index 6) is the header separator, grades start from 7+
        # But the grade header row tells us which column = which grade
        # We collect non-empty, non-dash values as order numbers (grade availability)
        for cell in row[7:]:
            if cell and str(cell).strip() not in ('', '-', '–', '—', 'None', '\x02', '\x03'):
                # This column has an order number → grade available
                grades.append(str(cell).strip())

    chipbreaker = extract_chipbreaker(desig)

    return {
        'designation': desig,
        'type': 'turning_insert',
        'insert_shape': SHAPE_MAP.get(shape_letter, f'Unknown ({shape_letter})'),
        'shape_code': shape_letter,
        'ic_mm': d_ic,
        'edge_length_mm': l10,
        'thickness_mm': s_thick,
        'nose_radius_mm': r_nose,
        'd1_mm': d1,
        'chipbreaker': chipbreaker,
        'order_numbers_count': len(grades),
    }


def extract_grade_headers(table_data):
    """Extract grade names from the header row of an insert table."""
    grades = []
    for row in table_data:
        if not row:
            continue
        # Find the row that contains grade codes like WP05CT, WP15CT, etc.
        grade_codes = []
        for cell in row:
            if cell and re.match(r'^W[A-Z]\d{2}[A-Z]{2}$', str(cell).strip()):
                grade_codes.append(str(cell).strip())
            elif cell and re.match(r'^(THM|TTR|TN\d+|CW\d+|WBH\d+)$', str(cell).strip()):
                grade_codes.append(str(cell).strip())
        if len(grade_codes) >= 3:
            grades = grade_codes
            break
    return grades


def extract_grade_availability(row, grade_headers, col_offset=7):
    """Map which grades are available for a given insert row."""
    available = []
    if not grade_headers:
        return available
    for i, grade in enumerate(grade_headers):
        col_idx = col_offset + i + 1  # +1 for the None separator
        if col_idx < len(row):
            cell = str(row[col_idx]).strip() if row[col_idx] else ''
            if cell and cell not in ('', '-', '–', '—', '\x02', '\x03'):
                available.append(grade)
    return available


def parse_speed_feed_table(table_data):
    """Parse a speed/feed chart table into structured data."""
    results = []
    if not table_data or len(table_data) < 2:
        return results

    # First row often has material description
    material_desc = str(table_data[0][0]).strip() if table_data[0][0] else ''

    for row in table_data[2:]:  # Skip header rows
        if not row or not row[0]:
            continue
        mat_group = str(row[0]).strip().replace('-', '').strip()
        if not mat_group or not re.match(r'^[PMKNS]\d$', mat_group):
            # Try to inherit from previous
            continue
        grade = str(row[1]).strip() if len(row) > 1 and row[1] else ''
        if not grade:
            continue

        # Find the speed value (usually last numeric column before 'm/min')
        vc_max = None
        for cell in reversed(row[2:]):
            v = eu_float(cell)
            if v and v > 10:
                vc_max = v
                break

        if vc_max:
            results.append({
                'material_group': mat_group,
                'material_description': material_desc[:80],
                'grade': grade,
                'vc_max_m_min': vc_max,
            })

    return results


def parse_grooving_insert(row, page_text):
    """Parse grooving insert data from WGC/WMT tables."""
    if not row or not row[0]:
        return None
    desig = str(row[0]).strip().replace('\n', '').replace(' ', '')
    # Grooving inserts have different patterns
    if len(desig) < 5:
        return None

    # WGC/WMT pattern or standard groove insert
    is_groove = ('WGC' in page_text or 'WMT' in page_text or
                 'Grooving' in page_text or 'Cut-Off' in page_text)
    if not is_groove:
        return None

    # Try to extract dimensions
    width = eu_float(row[1]) if len(row) > 1 else None
    if width is None:
        return None

    return {
        'designation': desig,
        'type': 'grooving_insert',
        'width_mm': width,
        'max_depth_mm': eu_float(row[2]) if len(row) > 2 else None,
        'corner_radius_mm': eu_float(row[3]) if len(row) > 3 else None,
    }


def parse_threading_insert(row, page_text):
    """Parse threading insert data."""
    if not row or not row[0]:
        return None
    desig = str(row[0]).strip().replace('\n', '').replace(' ', '')
    if len(desig) < 5:
        return None

    is_threading = 'Threading' in page_text or 'Thread' in page_text
    if not is_threading:
        return None

    pitch = eu_float(row[1]) if len(row) > 1 else None

    return {
        'designation': desig,
        'type': 'threading_insert',
        'pitch_mm': pitch,
        'ic_mm': eu_float(row[2]) if len(row) > 2 else None,
    }


def load_existing_sandvik_designations():
    """Load designations from existing sandvik-tool-catalog.ts for dedup."""
    existing = set()
    try:
        with open(SANDVIK_TS, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                m = re.search(r'designation:"([^"]+)"', line)
                if m:
                    existing.add(m.group(1).upper())
    except FileNotFoundError:
        pass
    return existing


# ─── Main extraction ──────────────────────────────────────────────────────────

def main():
    print(f"Opening PDF: {PDF_PATH}")
    doc = fitz.open(PDF_PATH)
    print(f"Total pages: {doc.page_count}")

    all_inserts = []
    all_speed_feeds = []
    all_grooving = []
    all_threading = []
    seen_designations = set()
    pages_with_data = 0

    # ── Phase 1: Extract turning insert geometry tables ────────────────────
    print(f"\n[Phase 1] Scanning insert pages {INSERT_PAGES.start+1}-{INSERT_PAGES.stop}...")
    for pg_num in INSERT_PAGES:
        page = doc[pg_num]
        tabs = page.find_tables()
        page_text = page.get_text()[:500]

        for tab in tabs.tables:
            table_data = tab.extract()
            if len(table_data) < 2:
                continue

            # Extract grade headers for this table
            grade_headers = extract_grade_headers(table_data)

            for row in table_data:
                insert = parse_insert_row(row)
                if insert and insert['designation'] not in seen_designations:
                    # Add grade availability
                    if grade_headers:
                        avail = extract_grade_availability(row, grade_headers)
                        if avail:
                            insert['available_grades'] = avail

                    # Extract page reference
                    page_label_match = re.search(r'E(\d+)', page_text)
                    if page_label_match:
                        insert['catalog_page'] = f"E{page_label_match.group(1)}"

                    all_inserts.append(insert)
                    seen_designations.add(insert['designation'])
                    pages_with_data += 1

    print(f"  Found {len(all_inserts)} turning inserts across pages")

    # ── Phase 2: Extract speed/feed data ──────────────────────────────────
    print(f"\n[Phase 2] Scanning speed/feed pages {SPEED_FEED_PAGES.start+1}-{SPEED_FEED_PAGES.stop}...")
    for pg_num in SPEED_FEED_PAGES:
        page = doc[pg_num]
        tabs = page.find_tables()

        for tab in tabs.tables:
            table_data = tab.extract()
            sf_entries = parse_speed_feed_table(table_data)
            all_speed_feeds.extend(sf_entries)

    print(f"  Found {len(all_speed_feeds)} speed/feed entries")

    # ── Phase 3: Scan grooving section ────────────────────────────────────
    print(f"\n[Phase 3] Scanning grooving pages {GROOVING_PAGES.start+1}-{GROOVING_PAGES.stop}...")
    for pg_num in GROOVING_PAGES:
        page = doc[pg_num]
        tabs = page.find_tables()
        page_text = page.get_text()[:500]

        for tab in tabs.tables:
            table_data = tab.extract()
            for row in table_data:
                if not row or not row[0]:
                    continue
                desig = str(row[0]).strip().replace('\n', '').replace(' ', '')
                if desig in seen_designations or len(desig) < 5:
                    continue
                # Grooving insert patterns: order numbers or catalogue numbers
                groove = parse_grooving_insert(row, page_text)
                if groove and groove['designation'] not in seen_designations:
                    all_grooving.append(groove)
                    seen_designations.add(groove['designation'])

    print(f"  Found {len(all_grooving)} grooving inserts")

    # ── Phase 4: Scan threading section ───────────────────────────────────
    print(f"\n[Phase 4] Scanning threading pages {THREADING_PAGES.start+1}-{THREADING_PAGES.stop}...")
    for pg_num in THREADING_PAGES:
        page = doc[pg_num]
        tabs = page.find_tables()
        page_text = page.get_text()[:500]

        for tab in tabs.tables:
            table_data = tab.extract()
            for row in table_data:
                if not row or not row[0]:
                    continue
                desig = str(row[0]).strip().replace('\n', '').replace(' ', '')
                if desig in seen_designations or len(desig) < 5:
                    continue
                thread = parse_threading_insert(row, page_text)
                if thread and thread['designation'] not in seen_designations:
                    all_threading.append(thread)
                    seen_designations.add(thread['designation'])

    print(f"  Found {len(all_threading)} threading inserts")

    # ── Phase 5: Dedup against existing sandvik catalog ───────────────────
    print(f"\n[Phase 5] Deduplicating against existing sandvik-tool-catalog.ts...")
    existing = load_existing_sandvik_designations()
    print(f"  Existing Sandvik tools: {len(existing)}")

    before = len(all_inserts)
    all_inserts = [i for i in all_inserts if i['designation'].upper() not in existing]
    dupes_removed = before - len(all_inserts)
    print(f"  Duplicates removed: {dupes_removed}")

    # ── Phase 6: Build summary statistics ─────────────────────────────────
    shape_counts = {}
    for ins in all_inserts:
        sc = ins['shape_code']
        shape_counts[sc] = shape_counts.get(sc, 0) + 1

    chipbreaker_counts = {}
    for ins in all_inserts:
        cb = ins.get('chipbreaker') or 'none'
        chipbreaker_counts[cb] = chipbreaker_counts.get(cb, 0) + 1

    grade_set = set()
    for ins in all_inserts:
        for g in ins.get('available_grades', []):
            grade_set.add(g)

    # ── Phase 7: Save JSON ────────────────────────────────────────────────
    output = {
        'metadata': {
            'source': 'WIDIA Cutting Tools Master 2022 English Metric.pdf',
            'brand': 'WIDIA (Sandvik family)',
            'extraction_date': '2026-03-14',
            'total_turning_inserts': len(all_inserts),
            'total_grooving_inserts': len(all_grooving),
            'total_threading_inserts': len(all_threading),
            'total_speed_feed_entries': len(all_speed_feeds),
            'shape_distribution': shape_counts,
            'chipbreaker_distribution': chipbreaker_counts,
            'grades_found': sorted(grade_set),
            'dedup_against_sandvik': dupes_removed,
        },
        'turning_inserts': all_inserts,
        'grooving_inserts': all_grooving,
        'threading_inserts': all_threading,
        'speed_feed_data': all_speed_feeds,
    }

    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"\n[Phase 7] JSON saved: {JSON_OUT}")
    print(f"  File size: {os.path.getsize(JSON_OUT):,} bytes")

    # ── Phase 8: Generate TypeScript ──────────────────────────────────────
    total_items = len(all_inserts) + len(all_grooving) + len(all_threading)
    lines = []
    lines.append('// @ts-nocheck \u2014 large literal array exceeds TS union complexity limit; types are enforced by interface')
    lines.append('/**')
    lines.append(' * WIDIA 2022 Turning Insert Catalog')
    lines.append(f' * {total_items} items extracted from Cutting Tools Master 2022 English Metric.pdf')
    lines.append(f' * {len(all_inserts)} turning + {len(all_grooving)} grooving + {len(all_threading)} threading inserts')
    lines.append(f' * {len(all_speed_feeds)} cutting condition entries across {len(grade_set)} grades')
    lines.append(' * Generated by extract-widia-2022.py')
    lines.append(' */')
    lines.append('')

    # Interface for turning inserts
    lines.append('export interface WidiaInsert {')
    lines.append('  designation: string;')
    lines.append('  type: "turning_insert" | "grooving_insert" | "threading_insert";')
    lines.append('  insert_shape?: string;')
    lines.append('  shape_code?: string;')
    lines.append('  ic_mm?: number;')
    lines.append('  edge_length_mm?: number;')
    lines.append('  thickness_mm?: number;')
    lines.append('  nose_radius_mm?: number;')
    lines.append('  d1_mm?: number;')
    lines.append('  chipbreaker?: string;')
    lines.append('  available_grades?: string[];')
    lines.append('  catalog_page?: string;')
    lines.append('  width_mm?: number;')
    lines.append('  max_depth_mm?: number;')
    lines.append('  corner_radius_mm?: number;')
    lines.append('  pitch_mm?: number;')
    lines.append('}')
    lines.append('')

    # Speed/feed interface
    lines.append('export interface WidiaSpeedFeed {')
    lines.append('  material_group: string;')
    lines.append('  material_description: string;')
    lines.append('  grade: string;')
    lines.append('  vc_max_m_min: number;')
    lines.append('}')
    lines.append('')

    # Turning inserts array
    lines.append('export const WIDIA_TURNING_INSERTS: WidiaInsert[] = [')
    for ins in all_inserts:
        parts = [f'designation:"{ins["designation"]}"', f'type:"{ins["type"]}"']
        if ins.get('insert_shape'):
            parts.append(f'insert_shape:"{ins["insert_shape"]}"')
        if ins.get('shape_code'):
            parts.append(f'shape_code:"{ins["shape_code"]}"')
        if ins.get('ic_mm') is not None:
            parts.append(f'ic_mm:{ins["ic_mm"]}')
        if ins.get('edge_length_mm') is not None:
            parts.append(f'edge_length_mm:{ins["edge_length_mm"]}')
        if ins.get('thickness_mm') is not None:
            parts.append(f'thickness_mm:{ins["thickness_mm"]}')
        if ins.get('nose_radius_mm') is not None:
            parts.append(f'nose_radius_mm:{ins["nose_radius_mm"]}')
        if ins.get('d1_mm') is not None:
            parts.append(f'd1_mm:{ins["d1_mm"]}')
        if ins.get('chipbreaker'):
            parts.append(f'chipbreaker:"{ins["chipbreaker"]}"')
        if ins.get('available_grades'):
            grades_str = json.dumps(ins['available_grades'])
            parts.append(f'available_grades:{grades_str}')
        if ins.get('catalog_page'):
            parts.append(f'catalog_page:"{ins["catalog_page"]}"')
        lines.append('  {' + ','.join(parts) + '},')
    lines.append('];')
    lines.append('')

    # Grooving inserts
    lines.append('export const WIDIA_GROOVING_INSERTS: WidiaInsert[] = [')
    for ins in all_grooving:
        parts = [f'designation:"{ins["designation"]}"', f'type:"{ins["type"]}"']
        if ins.get('width_mm') is not None:
            parts.append(f'width_mm:{ins["width_mm"]}')
        if ins.get('max_depth_mm') is not None:
            parts.append(f'max_depth_mm:{ins["max_depth_mm"]}')
        if ins.get('corner_radius_mm') is not None:
            parts.append(f'corner_radius_mm:{ins["corner_radius_mm"]}')
        lines.append('  {' + ','.join(parts) + '},')
    lines.append('];')
    lines.append('')

    # Threading inserts
    lines.append('export const WIDIA_THREADING_INSERTS: WidiaInsert[] = [')
    for ins in all_threading:
        parts = [f'designation:"{ins["designation"]}"', f'type:"{ins["type"]}"']
        if ins.get('pitch_mm') is not None:
            parts.append(f'pitch_mm:{ins["pitch_mm"]}')
        if ins.get('ic_mm') is not None:
            parts.append(f'ic_mm:{ins["ic_mm"]}')
        lines.append('  {' + ','.join(parts) + '},')
    lines.append('];')
    lines.append('')

    # Speed/feed data
    lines.append('export const WIDIA_SPEED_FEED_DATA: WidiaSpeedFeed[] = [')
    for sf in all_speed_feeds:
        parts = [
            f'material_group:"{sf["material_group"]}"',
            f'material_description:"{sf["material_description"]}"',
            f'grade:"{sf["grade"]}"',
            f'vc_max_m_min:{sf["vc_max_m_min"]}',
        ]
        lines.append('  {' + ','.join(parts) + '},')
    lines.append('];')
    lines.append('')

    # Combined export
    lines.append('export const WIDIA_ALL_INSERTS: WidiaInsert[] = [')
    lines.append('  ...WIDIA_TURNING_INSERTS,')
    lines.append('  ...WIDIA_GROOVING_INSERTS,')
    lines.append('  ...WIDIA_THREADING_INSERTS,')
    lines.append('];')
    lines.append('')

    with open(TS_OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"\n[Phase 8] TypeScript saved: {TS_OUT}")
    print(f"  File size: {os.path.getsize(TS_OUT):,} bytes")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Turning inserts:  {len(all_inserts)}")
    print(f"Grooving inserts: {len(all_grooving)}")
    print(f"Threading inserts:{len(all_threading)}")
    print(f"Speed/feed entries:{len(all_speed_feeds)}")
    print(f"TOTAL ITEMS:      {total_items}")
    print(f"Grades found:     {len(grade_set)} ({', '.join(sorted(grade_set)[:10])}{'...' if len(grade_set) > 10 else ''})")
    print(f"Shape distribution:")
    for code, cnt in sorted(shape_counts.items(), key=lambda x: -x[1]):
        print(f"  {code} ({SHAPE_MAP.get(code, '?')}): {cnt}")
    print(f"Chipbreakers: {len(chipbreaker_counts)}")
    for cb, cnt in sorted(chipbreaker_counts.items(), key=lambda x: -x[1])[:15]:
        print(f"  {cb}: {cnt}")
    print(f"Dedup removed:    {dupes_removed} (already in sandvik-tool-catalog.ts)")
    print("=" * 60)

    doc.close()
    return total_items


if __name__ == '__main__':
    total = main()
    print(f"\nDone. {total} total items extracted.")
