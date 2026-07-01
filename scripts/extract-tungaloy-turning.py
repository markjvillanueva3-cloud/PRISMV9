#!/usr/bin/env python3
"""Extract Tungaloy turning/grooving/threading insert data from GC_2023-2024_G_Turning-Grooving.pdf

PDF Structure (1016 pages):
  A: Grades (pages ~8-50) — chipbreaker guides with cutting condition tables
  B: Inserts (pages ~50-230) — turning insert designations with dimensions + grade availability
  E: Threading (pages ~460-530) — threading insert designations with pitch ranges
  F: Grooving (pages ~530-700) — grooving/parting insert designations

Cutting condition format (multi-line):
  Line 1: chipbreaker code (TF, TSF, TM, TH, etc.)
  Line 2: grade code (T9215, NS9530, etc.)
  Line 3: ap range (e.g. "0.2 - 1.5")
  Line 4: feed range (e.g. "0.08 - 0.4")
  Lines 5-7: Vc ranges for material sub-groups (e.g. "150 - 400")
"""
import pymupdf, sys, io, json, re
from collections import Counter, defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
doc = pymupdf.open('C:/PRISM/CATALOGS/GC_2023-2024_G_Turning-Grooving.pdf')
print(f"Total pages: {doc.page_count}")

# ── Constants ──
INSERT_SHAPES = {
    'C': 'Rhombic 80°', 'D': 'Rhombic 55°', 'K': 'Rhombic 55°',
    'R': 'Round', 'S': 'Square', 'T': 'Triangular',
    'V': 'Rhombic 35°', 'W': 'Trigon 80°', 'N': 'Rhombic 55° (neg)',
    'L': 'Rectangular', 'A': 'Parallelogram 85°', 'B': 'Parallelogram 82°',
    'E': 'Rhombic 75°', 'F': 'Rhombic 50°', 'H': 'Hexagonal',
    'M': 'Rhombic 86°', 'O': 'Octagonal', 'P': 'Pentagon',
}

KNOWN_GRADES = {
    'T9205', 'T9215', 'T9225', 'T9235', 'T6215',
    'T505', 'T515', 'T5105', 'T5115', 'T5125',
    'AH8015', 'AH8005', 'AH6225', 'AH6235', 'AH120', 'AH725', 'AH7025',
    'GT9530', 'AT9530', 'NS9530', 'NS520',
    'GH130', 'GH330', 'TH10',
    'BX480', 'BX815', 'BX930', 'BXC90',
    'KS05F', 'TS200', 'TS300',
}

CHIPBREAKERS = {
    'TF', 'TSF', 'TM', 'TH', 'THS', 'TQ', 'TA', 'TRS', 'TU', 'TUS', 'T1',
    'PS', 'PM', 'PSF', 'PSS', 'PF',
    'ZF', 'ZM',
    'AS', 'AM', 'AFW', 'ASW', 'AL',
    'NS', 'NM',
    'TS', 'SS', 'SF', 'SH', 'SM', 'SA', 'SR', 'SW', 'SDM',
    'HRF', 'HRM', 'HMM',
    'CF', 'CM', 'CH', 'CB',
    'FW', 'FR', 'FL', 'FN',
    'LF', 'LT', 'LC',
    'DM',
    'MF', 'MFR', 'MFL', 'MFN',
    'JS',
    'H', 'HC', 'HP', 'HS', 'HF', 'HM',
    'QBN',
    'WJ', 'WG',
    'DIA',
}

GRADE_RE = re.compile(
    r'^(T\d{3,4}|GT\d{4}|AT\d{4}|NS\d{3,4}|AH\d{3,4}|GH\d{3}|BX\d{3}|BXC\d{2}|KS\d{2}F?|TH\d{2}|TS\d{3})$'
)

RANGE_RE = re.compile(r'^([\d.]+)\s*-\s*([\d.]+)$')

GRADE_ISO = {
    'T9205': ['P'], 'T9215': ['P', 'M', 'K'], 'T9225': ['P', 'M', 'K'],
    'T9235': ['P', 'M', 'K'],
    'T6215': ['M'], 'T5105': ['M', 'K'], 'T5115': ['M'], 'T5125': ['K'],
    'T505': ['K', 'N'], 'T515': ['K'],
    'GT9530': ['P'], 'AT9530': ['P'], 'NS9530': ['P', 'M'],
    'NS520': ['N'],
    'AH8015': ['S', 'H'], 'AH8005': ['S', 'H'],
    'AH6225': ['N'], 'AH6235': ['N'], 'AH120': ['N'],
    'AH725': ['P', 'M', 'K'], 'AH7025': ['P', 'M'],
    'GH130': ['H'], 'GH330': ['S', 'H'],
    'BX480': ['H'], 'BX815': ['H'], 'BX930': ['H'], 'BXC90': ['H'],
    'TH10': ['H'], 'KS05F': ['N'],
    'TS200': ['S'], 'TS300': ['S'],
}

GRADE_DESCRIPTIONS = {
    'T9205': 'CVD coated carbide - high speed steel turning (P05)',
    'T9215': 'CVD coated carbide - general purpose steel (P15)',
    'T9225': 'CVD coated carbide - general purpose (P25)',
    'T9235': 'CVD coated carbide - heavy interrupted (P35)',
    'T6215': 'CVD coated carbide - stainless steel (M15)',
    'T5105': 'Cermet - finishing (M/K)',
    'T5115': 'Cermet - general finishing',
    'T5125': 'Cermet - medium finishing',
    'T505': 'Cermet - high precision finishing',
    'T515': 'Cermet - precision finishing',
    'AH8015': 'PVD coated carbide - heat resistant alloy (S15)',
    'AH8005': 'PVD coated carbide - heat resistant alloy finishing (S05)',
    'AH6225': 'PVD coated carbide - aluminum/non-ferrous (N25)',
    'AH6235': 'PVD coated carbide - non-ferrous general',
    'AH120': 'PVD coated carbide - non-ferrous',
    'AH725': 'PVD coated carbide - general purpose',
    'AH7025': 'PVD coated carbide - steel/stainless',
    'GT9530': 'Coated cermet - steel finishing',
    'AT9530': 'Coated cermet - steel finishing',
    'NS9530': 'Cermet - ultra-precision finishing',
    'NS520': 'Cermet - non-ferrous finishing',
    'GH130': 'CBN - hardened steel continuous',
    'GH330': 'CBN - hardened steel interrupted',
    'BX480': 'CBN - hardened steel heavy duty',
    'BX815': 'CBN - hardened steel finishing',
    'BX930': 'CBN - cast iron',
    'BXC90': 'CBN - high-speed hardened steel',
    'TH10': 'Ceramic - hardened steel',
    'KS05F': 'PCD - non-ferrous finishing',
    'TS200': 'Ceramic - heat resistant alloy',
    'TS300': 'Ceramic - cast iron',
}


def decode_nose_radius(code: str) -> float:
    return int(code) / 10.0

def decode_ic(code: str) -> float:
    c = int(code)
    ic_map = {
        6: 6.35, 9: 9.525, 12: 12.7, 15: 15.875, 16: 16.0,
        19: 19.05, 22: 22.0, 25: 25.4, 32: 31.75,
    }
    return ic_map.get(c, float(c))

def decode_thickness(code: str) -> float:
    """ISO thickness code: 01=1.59, 02=2.38, 03=3.18, 04=4.76, 05=5.56, 06=6.35, 07=7.94, 09=9.53"""
    c = int(code)
    thick_map = {
        1: 1.59, 2: 2.38, 3: 3.18, 4: 4.76, 5: 5.56,
        6: 6.35, 7: 7.94, 9: 9.53, 10: 10.0,
    }
    return thick_map.get(c, c * 1.0)


# ═════════════════════════════════════════════════════
# PHASE 1: Turning inserts from B section (pages 50-230)
# ═════════════════════════════════════════════════════
print("\n=== PHASE 1: Extracting turning inserts ===")

TURNING_RE = re.compile(
    r'\b([CDKRSTVWNABEFHMOP])'       # shape letter
    r'([ABCDEFGNOPU])'                # clearance angle
    r'([ACEFGHJKLMSU])'               # tolerance class
    r'([ACFGMNPRSTUWX])'              # fixing/chipbreaker hole
    r'(\d{2,3})'                      # IC size code
    r'(\d{2})'                        # thickness code
    r'(\d{2})'                        # nose radius code
    r'(?:E)?'                          # optional E suffix
    r'[\-]?'
    r'([A-Z]{1,4}(?:\d{0,2})?)?'     # chipbreaker
    r'\b'
)

turning_inserts = {}
insert_grades = defaultdict(set)

for page_idx in range(49, 230):
    page = doc[page_idx]
    text = page.get_text()
    lines = text.split('\n')

    page_desigs = []
    for line in lines:
        line = line.strip()
        m = TURNING_RE.search(line)
        if not m:
            continue
        desig = m.group(0)
        shape_code = m.group(1)
        ic_code = m.group(5)
        thick_code = m.group(6)
        nose_code = m.group(7)
        chipbreaker = m.group(8) or ''

        nose_r = decode_nose_radius(nose_code)
        ic_mm = decode_ic(ic_code)
        thickness_mm = decode_thickness(thick_code)

        # Get dimensional values from rest of line
        rest = line[m.end():]
        nums = re.findall(r'[\d.]+', rest)

        if desig not in turning_inserts:
            entry = {
                'designation': desig,
                'type': 'turning_insert',
                'insert_shape': INSERT_SHAPES.get(shape_code, shape_code),
                'shape_code': shape_code,
                'clearance_angle': m.group(2),
                'tolerance_class': m.group(3),
                'fixing_type': m.group(4),
                'nose_radius_mm': nose_r,
                'ic_mm': ic_mm,
                'thickness_mm': thickness_mm,
                'chipbreaker': chipbreaker,
            }
            # If numeric data follows on same line: RE IC S D1
            if len(nums) >= 3:
                try:
                    re_val = float(nums[0])
                    ic_val = float(nums[1])
                    if re_val <= 4.0 and ic_val >= 3:
                        entry['nose_radius_mm'] = re_val
                        entry['ic_mm'] = ic_val
                        if len(nums) >= 3:
                            entry['thickness_mm'] = float(nums[2])
                        if len(nums) >= 4:
                            entry['edge_length_mm'] = float(nums[3])
                except:
                    pass
            turning_inserts[desig] = entry
        page_desigs.append(desig)

    # Associate grades found on this page
    for grade in KNOWN_GRADES:
        if grade in text:
            for desig in page_desigs:
                insert_grades[desig].add(grade)

# Store grade lists
for desig, grades in insert_grades.items():
    if desig in turning_inserts:
        turning_inserts[desig]['available_grades'] = sorted(grades)

print(f"  Found {len(turning_inserts)} unique turning inserts")
shape_counts = Counter(v['shape_code'] for v in turning_inserts.values())
print(f"  Shapes: {dict(shape_counts)}")


# ═════════════════════════════════════════════════════
# PHASE 2: Cutting conditions (multi-line format, pages 8-50)
# ═════════════════════════════════════════════════════
print("\n=== PHASE 2: Extracting cutting conditions ===")

cutting_conditions = []

for page_idx in range(7, 55):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]

    # Determine page's ISO context from text
    lower = text.lower()
    page_iso = []
    if 'steel' in lower and 'stainless' not in lower:
        page_iso.append('P')
    if 'stainless' in lower:
        page_iso.append('M')
    if 'cast iron' in lower:
        page_iso.append('K')
    if 'alumin' in lower or 'non-ferrous' in lower:
        page_iso.append('N')
    if 'heat' in lower and 'resist' in lower:
        page_iso.append('S')
    if 'hardened' in lower:
        page_iso.append('H')

    # Parse multi-line blocks. Two formats:
    # Format A: chipbreaker -> grade -> ap -> feed -> vc1 -> vc2 -> vc3
    # Format B: chipbreaker (section header) -> then multiple grade blocks:
    #           grade -> ap -> feed -> vc1 -> vc2 -> vc3 -> grade -> ap -> ...
    current_cb = None
    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if this line is a chipbreaker code (section header)
        if line in CHIPBREAKERS:
            current_cb = line
            # Check if next line is a grade (Format A) or not (just a header)
            if i + 1 < len(lines) and GRADE_RE.match(lines[i + 1]):
                grade = lines[i + 1]
                ranges = []
                j = i + 2
                while j < len(lines) and RANGE_RE.match(lines[j]):
                    rm = RANGE_RE.match(lines[j])
                    ranges.append((float(rm.group(1)), float(rm.group(2))))
                    j += 1

                if len(ranges) >= 3:
                    cc = {
                        'chipbreaker': current_cb,
                        'grade': grade,
                        'ap_min_mm': ranges[0][0],
                        'ap_max_mm': ranges[0][1],
                        'feed_min_mm_rev': ranges[1][0],
                        'feed_max_mm_rev': ranges[1][1],
                        'vc_ranges': [],
                        'iso_groups': GRADE_ISO.get(grade, page_iso or ['P']),
                    }
                    for r in ranges[2:]:
                        cc['vc_ranges'].append({
                            'vc_min': int(r[0]),
                            'vc_max': int(r[1]),
                        })
                    cutting_conditions.append(cc)
                    i = j
                    continue
            i += 1
            continue

        # Format B: grade line following a chipbreaker section header
        if current_cb and GRADE_RE.match(line):
            grade = line
            ranges = []
            j = i + 1
            while j < len(lines) and RANGE_RE.match(lines[j]):
                rm = RANGE_RE.match(lines[j])
                ranges.append((float(rm.group(1)), float(rm.group(2))))
                j += 1

            if len(ranges) >= 3:
                cc = {
                    'chipbreaker': current_cb,
                    'grade': grade,
                    'ap_min_mm': ranges[0][0],
                    'ap_max_mm': ranges[0][1],
                    'feed_min_mm_rev': ranges[1][0],
                    'feed_max_mm_rev': ranges[1][1],
                    'vc_ranges': [],
                    'iso_groups': GRADE_ISO.get(grade, page_iso or ['P']),
                }
                for r in ranges[2:]:
                    cc['vc_ranges'].append({
                        'vc_min': int(r[0]),
                        'vc_max': int(r[1]),
                    })
                cutting_conditions.append(cc)
                i = j
                continue

        # Reset chipbreaker context on non-matching lines (but not blank/ISO/header lines)
        if line and line not in ('ISO', '-', '') and not RANGE_RE.match(line) and not GRADE_RE.match(line):
            if line not in CHIPBREAKERS:
                current_cb = None

        i += 1

# Assign material sub-group labels
for cc in cutting_conditions:
    iso = cc['iso_groups']
    if 'P' in iso:
        labels = ['Low carbon steel', 'Alloy steel', 'Stainless steel']
    elif 'M' in iso:
        labels = ['Stainless steel', 'Heat resistant alloy', 'Ti alloy']
    elif 'K' in iso:
        labels = ['Cast iron (grey)', 'Nodular cast iron', 'Malleable cast iron']
    elif 'N' in iso:
        labels = ['Aluminum alloy', 'Copper alloy', 'Non-ferrous']
    elif 'S' in iso:
        labels = ['Ni-based alloy', 'Ti alloy', 'Co-based alloy']
    elif 'H' in iso:
        labels = ['Hardened steel 45-55 HRC', 'Hardened steel 55-65 HRC']
    else:
        labels = ['Material group 1', 'Material group 2', 'Material group 3']
    for idx, vc in enumerate(cc['vc_ranges']):
        if idx < len(labels):
            vc['material_subgroup'] = labels[idx]

# Deduplicate
seen_cc = set()
unique_conditions = []
for cc in cutting_conditions:
    key = (cc['chipbreaker'], cc['grade'], cc['ap_min_mm'], cc['feed_min_mm_rev'])
    if key not in seen_cc:
        seen_cc.add(key)
        unique_conditions.append(cc)
cutting_conditions = unique_conditions

print(f"  Found {len(cutting_conditions)} unique cutting conditions")
grade_cc_counts = Counter(cc['grade'] for cc in cutting_conditions)
print(f"  Grades with conditions: {dict(grade_cc_counts)}")


# ═════════════════════════════════════════════════════
# PHASE 3: Threading inserts (pages 460-530)
# ═════════════════════════════════════════════════════
print("\n=== PHASE 3: Extracting threading inserts ===")

# Threading designation format: 16ERA60-M, 11IRA60-B, 16ERG60-B, 22ER4.0ISO-A, etc.
THREAD_DESIG_RE = re.compile(
    r'\b(\d{2})'                        # IC size (06,08,11,16,22,27)
    r'([EI]R)'                          # external/internal
    r'(A?G?)'                           # A=full profile, G=multi-start
    r'(\d+\.?\d*)'                      # pitch or TPI or angle code
    r'([A-Z]{0,4})'                     # thread standard (ISO, etc.) or empty
    r'[\-]?([A-Z]{1,3})'               # chipbreaker (B, M, A, etc.)
    r'\b'
)

threading_inserts = {}
threading_page_context = {}  # page_idx -> {pitch_range, tpi_range}

# First pass: collect page-level pitch/TPI context
for page_idx in range(459, 530):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]
    ctx = {}
    for line in lines:
        # Pitch range: "0.5 - 1.5" or "0.5 ~ 6 mm"
        pm = re.search(r'([\d.]+)\s*[-~]\s*([\d.]+)\s*(?:mm)?', line)
        tpim = re.search(r'(\d+)\s*[-~]\s*(\d+)\s*(?:TPI)?', line)
        if pm and 'mm' in line:
            ctx['pitch_min_mm'] = float(pm.group(1))
            ctx['pitch_max_mm'] = float(pm.group(2))
        if tpim and 'TPI' in line:
            ctx['tpi_min'] = int(tpim.group(1))
            ctx['tpi_max'] = int(tpim.group(2))
    threading_page_context[page_idx] = ctx

# Second pass: extract threading inserts
for page_idx in range(459, 530):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]
    ctx = threading_page_context.get(page_idx, {})

    # Detect thread type from page headers
    thread_type = 'ISO Metric 60°'
    if '55' in text[:200] and ('W' in text[:200] or 'BSP' in text[:200]):
        thread_type = 'Whitworth/BSP 55°'
    elif 'ACME' in text[:300]:
        thread_type = 'ACME 29°'
    elif 'BSPT' in text[:300] or 'NPT' in text[:300]:
        thread_type = 'Pipe thread'

    for i, line in enumerate(lines):
        for m in THREAD_DESIG_RE.finditer(line):
            desig = m.group(0)
            ic_code = m.group(1)
            direction = m.group(2)
            profile = m.group(3)
            spec_val = m.group(4)
            standard = m.group(5)
            suffix = m.group(6)

            ic_mm = decode_ic(ic_code)

            # Determine thread angle from designation
            angle_deg = 60.0
            if '55' in line[:line.index(desig)] if desig in line else False:
                angle_deg = 55.0
            elif 'A60' in desig or '60' in spec_val:
                angle_deg = 60.0
            elif 'A55' in desig or '55' in spec_val:
                angle_deg = 55.0

            # Get dimensions from following lines
            dims = {}
            # Look ahead for numeric values (IC, PDX, PDY, RE)
            nums_after = []
            rest = line[m.end():]
            nums_after = re.findall(r'[\d.]+', rest)
            # Also check next few lines
            for offset in range(1, 5):
                if i + offset < len(lines):
                    nl = lines[i + offset]
                    if nl and re.match(r'^[\d.]+$', nl):
                        nums_after.append(nl)

            if nums_after:
                try:
                    if len(nums_after) >= 1:
                        dims['ic_mm'] = float(nums_after[0]) if float(nums_after[0]) > 3 else ic_mm
                    if len(nums_after) >= 2:
                        dims['pdx_mm'] = float(nums_after[1]) if float(nums_after[1]) < 5 else None
                    if len(nums_after) >= 3:
                        dims['pdy_mm'] = float(nums_after[2]) if float(nums_after[2]) < 5 else None
                    if len(nums_after) >= 4:
                        dims['re_mm'] = float(nums_after[3]) if float(nums_after[3]) < 1 else None
                except:
                    pass

            # Look for pitch range from context (lines above current insert)
            pitch_range = None
            tpi_range = None
            for back in range(1, 6):
                if i - back >= 0:
                    prev = lines[i - back]
                    pr = re.match(r'^([\d.]+)\s*-\s*([\d.]+)$', prev)
                    if pr:
                        v1, v2 = float(pr.group(1)), float(pr.group(2))
                        if v1 < 10 and v2 < 10:
                            pitch_range = (v1, v2)
                        elif v1 >= 4 and v2 >= 4:
                            tpi_range = (int(v1), int(v2))

            entry = {
                'designation': desig,
                'type': 'threading_insert',
                'ic_mm': dims.get('ic_mm', ic_mm),
                'direction': 'external' if 'E' in direction else 'internal',
                'thread_type': thread_type,
                'thread_angle_deg': angle_deg,
                'profile': 'full' if 'A' in profile else ('multi-start' if 'G' in profile else 'partial'),
                'chipbreaker': suffix,
            }
            if dims.get('pdx_mm'):
                entry['pdx_mm'] = dims['pdx_mm']
            if dims.get('pdy_mm'):
                entry['pdy_mm'] = dims['pdy_mm']
            if dims.get('re_mm'):
                entry['re_mm'] = dims['re_mm']
            if pitch_range:
                entry['pitch_min_mm'] = pitch_range[0]
                entry['pitch_max_mm'] = pitch_range[1]
            if tpi_range:
                entry['tpi_min'] = tpi_range[0]
                entry['tpi_max'] = tpi_range[1]
            # Fallback from page context
            if 'pitch_min_mm' not in entry and 'pitch_min_mm' in ctx:
                entry['pitch_min_mm'] = ctx['pitch_min_mm']
                entry['pitch_max_mm'] = ctx['pitch_max_mm']
            if 'tpi_min' not in entry and 'tpi_min' in ctx:
                entry['tpi_min'] = ctx['tpi_min']
                entry['tpi_max'] = ctx['tpi_max']

            if desig not in threading_inserts:
                threading_inserts[desig] = entry

    # Associate grades with threading inserts on this page
    for grade in KNOWN_GRADES:
        if grade in text:
            for desig in threading_inserts:
                if desig in text:
                    if 'available_grades' not in threading_inserts[desig]:
                        threading_inserts[desig]['available_grades'] = []
                    if grade not in threading_inserts[desig]['available_grades']:
                        threading_inserts[desig]['available_grades'].append(grade)

# Sort grade lists
for entry in threading_inserts.values():
    if 'available_grades' in entry:
        entry['available_grades'] = sorted(entry['available_grades'])

print(f"  Found {len(threading_inserts)} unique threading inserts")
dir_counts = Counter(v['direction'] for v in threading_inserts.values())
print(f"  Directions: {dict(dir_counts)}")


# ═════════════════════════════════════════════════════
# PHASE 4: Grooving inserts (pages 530-700)
# ═════════════════════════════════════════════════════
print("\n=== PHASE 4: Extracting grooving inserts ===")

grooving_inserts = {}
GROOVE_FAMILIES = ['DGS', 'DGM', 'DGE', 'DGG', 'DGL', 'SGS', 'SGM', 'GE', 'GX', 'JXG', 'JXR']

# Grooving designation patterns:
# DGS1.4-005: family + width + depth code
# DGM2-002-15R: family + width + code + IC + hand
# SGS3-020-15R: same
# GE20-2: simple groove
GROOVE_RE = re.compile(
    r'\b(DG[SMEGL]|SG[SM]|GE|GX|JX[GR])'     # family
    r'(\d+\.?\d*)'                                # width/size
    r'[\-](\d{2,3})'                              # code 1
    r'(?:[\-](\d{2,3}))?'                         # code 2 (optional)
    r'([R/L])?'                                   # hand (optional)
    r'\b'
)

for page_idx in range(529, 700):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]

    for i, line in enumerate(lines):
        for m in GROOVE_RE.finditer(line):
            desig = m.group(0)
            family = m.group(1)
            width_str = m.group(2)
            code1 = m.group(3)
            code2 = m.group(4)
            hand = m.group(5)

            try:
                width = float(width_str)
            except:
                width = None

            # Get numeric data from rest of line
            rest = line[m.end():]
            nums = re.findall(r'[\d.]+', rest)

            entry = {
                'designation': desig,
                'type': 'grooving_insert',
                'family': family,
                'width_mm': width,
            }

            if hand:
                entry['hand'] = 'right' if hand == 'R' else 'left'

            # Parse dimensional data: CW RE INSL h
            if nums:
                try:
                    idx = 0
                    # First: corner radius or cutting width
                    v = float(nums[idx])
                    if family.startswith('DGS') or family.startswith('SGS'):
                        # DGS: CW (cutting width ±0.05) then RE then INSL then h
                        if v < 1:
                            entry['corner_radius_mm'] = v
                            idx += 1
                    if idx < len(nums):
                        v = float(nums[idx])
                        if v == ord('N') or v > 100:
                            pass  # skip non-numeric
                        elif v < 5:
                            entry['cutting_width_mm'] = v
                            idx += 1
                        else:
                            entry['max_grooving_depth_mm'] = v
                            idx += 1
                    if idx < len(nums):
                        v = float(nums[idx])
                        if v > 5:
                            entry['max_grooving_depth_mm'] = v
                            idx += 1
                except:
                    pass

            if desig not in grooving_inserts:
                grooving_inserts[desig] = entry

    # Also look for grooving cutting conditions on this page
    # Format similar to turning: separate lines with ranges

# Also scan broader grooving insert patterns
for page_idx in range(529, 700):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]

    for line in lines:
        # Match GE-type grooving inserts: GE20, GE30, GEF, GECF
        gm = re.findall(r'\b(GE[A-Z]?[FR]?\d+[\-]?\d*(?:[\-][A-Z]{1,3})?)\b', line)
        for desig in gm:
            if desig in grooving_inserts or len(desig) < 4:
                continue
            # Extract width from designation
            wm = re.search(r'(\d+\.?\d*)', desig)
            entry = {
                'designation': desig,
                'type': 'grooving_insert',
                'family': 'GE',
                'width_mm': float(wm.group(1)) if wm else None,
            }
            grooving_inserts[desig] = entry

    # Associate grades
    for grade in KNOWN_GRADES:
        if grade in text:
            for desig in list(grooving_inserts.keys()):
                if desig in text:
                    if 'available_grades' not in grooving_inserts[desig]:
                        grooving_inserts[desig]['available_grades'] = []
                    if grade not in grooving_inserts[desig]['available_grades']:
                        grooving_inserts[desig]['available_grades'].append(grade)

for entry in grooving_inserts.values():
    if 'available_grades' in entry:
        entry['available_grades'] = sorted(entry['available_grades'])

print(f"  Found {len(grooving_inserts)} unique grooving inserts")
gf_counts = Counter(v.get('family', '?') for v in grooving_inserts.values())
print(f"  Families: {dict(gf_counts)}")


# ═════════════════════════════════════════════════════
# PHASE 5: Grooving cutting conditions (pages 530-560)
# ═════════════════════════════════════════════════════
print("\n=== PHASE 5: Grooving cutting conditions ===")

grooving_conditions = []
for page_idx in range(529, 560):
    page = doc[page_idx]
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n')]

    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for grade codes followed by range data
        if GRADE_RE.match(line):
            grade = line
            ranges = []
            j = i + 1
            while j < len(lines) and RANGE_RE.match(lines[j]):
                rm = RANGE_RE.match(lines[j])
                ranges.append((float(rm.group(1)), float(rm.group(2))))
                j += 1
            if len(ranges) >= 2:
                gc = {
                    'grade': grade,
                    'feed_min_mm_rev': ranges[0][0],
                    'feed_max_mm_rev': ranges[0][1],
                }
                if len(ranges) >= 2:
                    gc['vc_min'] = int(ranges[1][0])
                    gc['vc_max'] = int(ranges[1][1])
                grooving_conditions.append(gc)
                i = j
                continue
        i += 1

print(f"  Found {len(grooving_conditions)} grooving cutting condition entries")


# ═════════════════════════════════════════════════════
# PHASE 6: Assemble and output JSON
# ═════════════════════════════════════════════════════
print("\n=== PHASE 6: Assembling output ===")

output = {
    'source': 'Tungaloy GC_2023-2024_G_Turning-Grooving.pdf',
    'extracted_date': '2026-03-14',
    'summary': {
        'turning_inserts': len(turning_inserts),
        'threading_inserts': len(threading_inserts),
        'grooving_inserts': len(grooving_inserts),
        'cutting_conditions': len(cutting_conditions),
        'grooving_conditions': len(grooving_conditions),
        'total_items': len(turning_inserts) + len(threading_inserts) + len(grooving_inserts),
        'known_grades': sorted(KNOWN_GRADES),
    },
    'turning_inserts': list(turning_inserts.values()),
    'threading_inserts': list(threading_inserts.values()),
    'grooving_inserts': list(grooving_inserts.values()),
    'cutting_conditions': cutting_conditions,
    'grooving_conditions': grooving_conditions,
    'grade_descriptions': GRADE_DESCRIPTIONS,
}

json_path = 'C:/PRISM/mcp-server/src/data/tungaloy-turning-extracted.json'
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nOutput written to {json_path}")
print(f"\n{'='*50}")
print(f"  EXTRACTION SUMMARY")
print(f"{'='*50}")
print(f"  Turning inserts:      {len(turning_inserts):>5}")
print(f"  Threading inserts:    {len(threading_inserts):>5}")
print(f"  Grooving inserts:     {len(grooving_inserts):>5}")
print(f"  Cutting conditions:   {len(cutting_conditions):>5}")
print(f"  Grooving conditions:  {len(grooving_conditions):>5}")
print(f"  {'─'*30}")
print(f"  Total insert items:   {len(turning_inserts) + len(threading_inserts) + len(grooving_inserts):>5}")

cb_counts = Counter(v.get('chipbreaker', '') for v in turning_inserts.values())
print(f"\n  Top chipbreakers: {dict(cb_counts.most_common(15))}")

grade_cc = Counter(cc['grade'] for cc in cutting_conditions)
print(f"  Cutting cond. by grade: {dict(grade_cc)}")
