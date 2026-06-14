#!/usr/bin/env python3
"""
Extract toolholder data from Tungaloy GC_2023-2024_G_Tooling.pdf (Vol. 4)
Sections: External turning (K008+), Internal turning (K022+), Threading, Grooving, Boring (PINZBOHR)
Output: tungaloy-tooling-extracted.json + tungaloy-tooling-catalog.ts
"""

import fitz
import json
import re
import os
import sys

PDF_PATH = "C:/PRISM/CATALOGS/GC_2023-2024_G_Tooling.pdf"
JSON_OUT = "C:/PRISM/mcp-server/src/data/tungaloy-tooling-extracted.json"
TS_OUT = "C:/PRISM/mcp-server/src/data/tungaloy-tooling-catalog.ts"

# ── ISO Turning Holder Designation Decoding ─────────────────────────────────
# Standard ISO designation: e.g. PCLNR2525M12 or C4PCLNR27050-12
# Clamping system codes
CLAMPING_MAP = {
    'P': 'P-type',   # lever/pin lock
    'M': 'M-type',   # top clamp
    'S': 'S-type',   # screw-on
    'C': 'C-type',   # top & hole clamp
    'D': 'D-type',   # lever lock
    'A': 'A-type',   # special
    'W': 'W-type',   # wedge
}

# Insert shape codes
INSERT_SHAPE_MAP = {
    'C': 'C',  # 80° rhombic
    'D': 'D',  # 55° rhombic
    'S': 'S',  # square
    'T': 'T',  # triangular
    'V': 'V',  # 35° rhombic
    'W': 'W',  # 80° trigon
    'R': 'R',  # round
    'K': 'K',  # 55° parallelogram
    'A': 'A',  # 85° parallelogram
    'B': 'B',  # 82° parallelogram
    'L': 'L',  # 90° rectangle
    'N': 'N',  # 55° special
    'E': 'E',  # 75° rhombic
    'F': 'F',  # 55° special
    'G': 'G',  # grooving
    'H': 'H',  # hexagonal
    'O': 'O',  # octagonal
    'P': 'P',  # pentagonal
    'X': 'X',  # special
}

# Cutting edge angle from ISO designation 5th char
EDGE_ANGLE_MAP = {
    'A': 90, 'B': 75, 'C': 95, 'D': 45, 'E': 75, 'F': 90,
    'G': 90, 'H': 107.5, 'J': 93, 'K': 75, 'L': 95, 'M': 60,
    'N': 63, 'P': 0, 'Q': 117.5, 'R': 75, 'S': 45, 'T': 60,
    'U': 93, 'V': 72.5, 'W': 60, 'X': 0, 'Y': 0,
}

def decode_iso_designation(desig: str):
    """Decode ISO turning toolholder designation to extract metadata."""
    result = {}

    # Strip TungCap prefix (C3, C4, C5, C6, C8 = polygon coupling sizes)
    clean = desig
    tungcap_size = None
    m = re.match(r'^(C[3-8])', clean)
    if m:
        tungcap_size = m.group(1)
        clean = clean[len(tungcap_size):]

    # Strip /L or /R variant indicators
    clean = re.sub(r'/[RL]', '', clean)
    # Strip trailing suffixes like -CHP, -IN, (1), (2), N at end
    base = re.sub(r'[-](?:CHP|IN|CFC|HP)$', '', clean)
    base = re.sub(r'\(\d+\)$', '', base)
    base = re.sub(r'N$', '', base)

    # Try ISO pattern: [Clamping][Insert][Edge][Clearance][Hand][shank]
    # e.g., PCLNR2525M12, DDJNR2020K15, STFCR2525M16
    iso_pat = re.match(
        r'^([A-Z])([A-Z])([A-Z])([A-Z])([RL])(\d{2})(\d{2})([A-Z]?)(\d{2,4})?',
        base
    )

    if iso_pat:
        clamping_code = iso_pat.group(1)
        insert_code = iso_pat.group(2)
        edge_code = iso_pat.group(3)
        # clearance = iso_pat.group(4)
        hand = iso_pat.group(5)
        shank_h = int(iso_pat.group(6))
        shank_w = int(iso_pat.group(7))

        result['clamping'] = CLAMPING_MAP.get(clamping_code, clamping_code)
        result['insert_shape'] = INSERT_SHAPE_MAP.get(insert_code, insert_code)
        result['cutting_edge_angle_deg'] = EDGE_ANGLE_MAP.get(edge_code, None)
        result['hand'] = 'R' if hand == 'R' else 'L'
        result['shank_height_mm'] = shank_h
        result['shank_width_mm'] = shank_w
        return result

    # TungCap pattern: after stripping C3-C8 prefix and /L or /R
    # e.g., ACLNR22040-0904 or PCLNR27050-12 or PTJNR27050-16
    # Format: [Clamping][Insert][Edge][Clearance][Hand][DCONMS digits][LF digits]-[IC size]
    # Also: ACLNN00090-12 (N=neutral hand), STCR22040-18, CEL18065-16ERB
    tc_pat = re.match(
        r'^([A-Z])([A-Z])([A-Z])([A-Z])([RLN])',
        base
    )

    if tc_pat:
        clamping_code = tc_pat.group(1)
        insert_code = tc_pat.group(2)
        edge_code = tc_pat.group(3)
        # clearance = tc_pat.group(4)
        hand_code = tc_pat.group(5)

        result['clamping'] = CLAMPING_MAP.get(clamping_code, clamping_code)
        result['insert_shape'] = INSERT_SHAPE_MAP.get(insert_code, insert_code)
        result['cutting_edge_angle_deg'] = EDGE_ANGLE_MAP.get(edge_code, None)
        if hand_code in ('R', 'L'):
            result['hand'] = hand_code
        else:
            result['hand'] = 'N'  # neutral
        return result

    # Shorter patterns: 3-4 letter codes (grooving, threading, adapters)
    # e.g., STCR22040-18, CEL18065-16ERB
    short_pat = re.match(r'^([A-Z])([A-Z])([A-Z])([A-Z]?)(\d)', base)
    if short_pat and len(base) >= 5:
        # Try to decode what we can
        first = base[0]
        second = base[1]
        if first in CLAMPING_MAP and second in INSERT_SHAPE_MAP:
            result['clamping'] = CLAMPING_MAP[first]
            result['insert_shape'] = INSERT_SHAPE_MAP[second]
        elif first in INSERT_SHAPE_MAP:
            result['insert_shape'] = INSERT_SHAPE_MAP[first]
        return result

    # Special designations (adapters, etc.) - try to extract insert shape
    for c in base[:5]:
        if c in INSERT_SHAPE_MAP and c not in ('A', 'C', 'S', 'E'):  # skip ambiguous
            result['insert_shape'] = INSERT_SHAPE_MAP[c]
            break

    return result


def classify_holder_type(desig: str, page_context: str = '') -> str:
    """Classify holder type from designation and context."""
    d = desig.upper()

    # SwissBore / boring bars
    if any(k in d for k in ['SWUBR', 'SWUCR', 'STUBR', 'STUCR', 'SWLB', 'SWUB', 'BORE']):
        return 'internal_turning'
    if re.match(r'^S\d{4}', d) or re.match(r'^S\d{2}-', d):
        return 'internal_turning'

    # TungCap internal (C*...with internal bore indicators)
    if 'DMIN' in page_context and any(k in d for k in ['CTFE', 'CTGE', 'CTSE', 'CTWE']):
        return 'internal_turning'

    # Threading
    if any(k in d for k in ['CTFR', 'CTFL', 'CTGR', 'CTGL', 'CTSR', 'CTSL',
                             'CTWR', 'CTWL', 'SEL', 'SER', 'SIR', 'SIL',
                             'THREAD', 'TFR', 'TFL']):
        return 'threading'

    # Grooving / parting
    if any(k in d for k in ['CAER', 'CAEL', 'CGEL', 'CGER', 'CGES',
                             'GCR', 'GCL', 'GDR', 'GDL',
                             'CHSR', 'CHSL', 'CHFV']):
        return 'grooving'

    # External turning (default for most ISO holders)
    if re.match(r'^(C[3-8])?[PMSCDW][A-Z]{3}[RL]', d):
        return 'external_turning'

    # Boring bar
    if re.match(r'^(A|E)\d+', d):
        return 'boring_bar'

    return 'external_turning'


def extract_tungcap_tables(doc):
    """Extract TungCap toolholder data from pages 16-59 (external, internal, threading, grooving)."""
    holders = []

    # Page ranges by section (0-indexed)
    sections = [
        (15, 28, 'external_turning'),    # External turning K008-K020
        (29, 36, 'internal_turning'),     # Internal turning K022-K028
        (36, 37, 'threading'),            # Threading K029
        (37, 43, 'grooving'),             # Grooving K030-K035
        (43, 45, 'external_turning'),     # Drilling adapters
        (44, 59, 'external_turning'),     # Milling/holders
    ]

    # Also scan boring pages
    sections.append((185, 210, 'boring_bar'))  # PINZBOHR K178-K202
    sections.append((210, 218, 'internal_turning'))  # SwissBore K203+

    # Regex for TungCap designations: C[3-8] prefix + series
    tungcap_pat = re.compile(
        r'(C[3-8][A-Z]{4,}[RL]?[\w/]*[-\w]*)'
    )

    # Regex for standard ISO designations
    iso_pat = re.compile(
        r'([A-Z]{4,6}[RL]\d{4}[A-Z]?\d{0,4}[-\w]*)'
    )

    # Regex for SwissBore / internal
    swissbore_pat = re.compile(
        r'([SC]\d{4}-[A-Z]{4,}\d{2,})'
    )

    # Boring cartridge patterns
    boring_pat = re.compile(
        r'(CT[A-Z]{2,}R?/?\s*L?\d+[A-Z]*[-\d]*)'
    )

    seen = set()

    for start_pg, end_pg, default_type in sections:
        for pg_idx in range(start_pg, min(end_pg, doc.page_count)):
            text = doc[pg_idx].get_text()
            lines = text.split('\n')

            # Collect all designation-like strings
            desigs_on_page = []

            for line in lines:
                line = line.strip()
                if not line or len(line) < 8:
                    continue

                # TungCap designations
                for m in tungcap_pat.finditer(line):
                    desigs_on_page.append(m.group(1))

                # ISO designations
                for m in iso_pat.finditer(line):
                    d = m.group(1)
                    if d not in ['Tungaloy', 'DCONMS', 'DCONWS', 'DCSFMS'] and len(d) >= 8:
                        desigs_on_page.append(d)

                # SwissBore
                for m in swissbore_pat.finditer(line):
                    desigs_on_page.append(m.group(1))

            # Now extract numeric data from the page
            # Look for table rows: designation followed by numbers
            num_rows = extract_table_rows(text, pg_idx + 1, default_type)

            for row in num_rows:
                if row['designation'] in seen:
                    continue
                seen.add(row['designation'])
                holders.append(row)

    return holders


def extract_table_rows(page_text: str, page_num: int, default_type: str):
    """Extract structured rows from a page's text."""
    rows = []
    lines = page_text.split('\n')

    # Detect column headers on the page
    header_line = ''
    for line in lines:
        if 'DCONMS' in line or 'DMIN' in line or 'WF' in line:
            header_line = line
            break

    # Determine what angle is shown on page
    page_angle = None
    for line in lines[:20]:
        angle_m = re.search(r'(\d+(?:\.\d+)?)\s*[°˚]', line)
        if angle_m:
            page_angle = float(angle_m.group(1))
            break

    # Parse table rows: look for lines starting with a designation pattern
    # TungCap: C[3-8][A-Z]... followed by numbers
    # ISO: [A-Z]{5,6}\d{4}... followed by numbers
    # SwissBore: [SC]\d{4}-...

    row_pat = re.compile(
        r'^(C[3-8][A-Z]{3,}[RL/\-\w]+|'       # TungCap
        r'[A-Z]{4,6}[RL]\d{4}[\w\-]*|'          # ISO standard
        r'[SC]\d{4}-[A-Z]{3,}\d+|'              # SwissBore
        r'CT[A-Z]{2,}R?\d+[A-Z]*[-\d]*)'        # Boring cartridge
    )

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        m = row_pat.match(line)
        if not m:
            continue

        desig = m.group(1)
        rest = line[m.end():].strip()

        # Skip non-product lines
        if desig in ['DCONMS', 'DCONWS', 'DCSFMS', 'Tungaloy']:
            continue

        # Collect numbers from the rest of the line AND subsequent lines
        nums = []
        # Numbers from same line
        nums.extend(re.findall(r'[-]?\d+(?:\.\d+)?', rest))

        # Look ahead for continuation numbers (next 1-3 lines if they're just numbers)
        for j in range(i+1, min(i+4, len(lines))):
            next_line = lines[j].strip()
            if not next_line:
                continue
            # If next line is purely numeric data
            if re.match(r'^[\d\.\-\s,/]+$', next_line):
                nums.extend(re.findall(r'[-]?\d+(?:\.\d+)?', next_line))
            elif row_pat.match(next_line):
                break
            elif re.match(r'^[A-Z]{2}', next_line) and '...' in next_line:
                # Insert designation line (e.g., CN**1204...)
                break
            else:
                break

        nums_f = [float(x) for x in nums]

        # Build holder record
        holder = {
            'designation': desig,
            'holder_type': classify_holder_type(desig, header_line),
            'source_page': page_num,
        }

        # Override type from section default if not clearly classified
        if holder['holder_type'] == 'external_turning' and default_type != 'external_turning':
            holder['holder_type'] = default_type

        # Decode ISO designation metadata
        iso_meta = decode_iso_designation(desig)
        holder.update(iso_meta)

        # Use page angle if available and not decoded from designation
        if page_angle and not holder.get('cutting_edge_angle_deg'):
            holder['cutting_edge_angle_deg'] = page_angle

        # Assign numeric columns based on header context and designation type
        assign_dimensions(holder, nums_f, header_line, default_type)

        # Extract insert compatibility from nearby text
        for j in range(i+1, min(i+5, len(lines))):
            insert_m = re.search(r'([A-Z]{2}\*{2}\d{4})', lines[j])
            if insert_m:
                holder['insert_compat'] = insert_m.group(1).replace('**', 'xx')
                break

        rows.append(holder)

    return rows


def assign_dimensions(holder: dict, nums: list, header_line: str, section_type: str):
    """Assign numeric values to dimension fields based on context."""
    if not nums:
        return

    desig = holder['designation']

    # TungCap holders (C3/C4/C5/C6/C8 prefix)
    # Typical columns: DCONMS, LF, WF, DMIN, DMIN2/L2, RE
    if re.match(r'^C[3-8]', desig):
        if len(nums) >= 1:
            holder['dconms_mm'] = nums[0]  # Polygon coupling diameter
        if len(nums) >= 2:
            holder['overall_length_mm'] = nums[1]  # LF
        if len(nums) >= 3:
            holder['shank_width_mm'] = nums[2]  # WF
        if len(nums) >= 4:
            holder['bore_diameter_mm'] = nums[3]  # DMIN (min bore) or shank dimension
        if section_type in ('internal_turning', 'boring_bar'):
            if len(nums) >= 4:
                holder['min_bore_mm'] = nums[3]
            if len(nums) >= 5:
                holder['min_bore2_mm'] = nums[4]
        if len(nums) >= 6:
            re_val = nums[5] if nums[5] < 10 else None
            if re_val:
                holder['nose_radius_mm'] = re_val
        return

    # SwissBore internal turning bars
    # Typical: DMIN, DCONMS, WF, LF, LH, LS, RE
    if re.match(r'^[SC]\d{4}-', desig):
        if len(nums) >= 1:
            holder['min_bore_mm'] = nums[0]
        if len(nums) >= 2:
            holder['bore_diameter_mm'] = nums[1]
        if len(nums) >= 3:
            holder['shank_width_mm'] = nums[2]
        if len(nums) >= 4:
            holder['overall_length_mm'] = nums[3]
        if len(nums) >= 5:
            holder['functional_length_mm'] = nums[4]
        if len(nums) >= 7:
            re_val = nums[6]
            if re_val < 10:
                holder['nose_radius_mm'] = re_val
        return

    # Grooving tools (CAER/L)
    if 'CAER' in desig or 'CAEL' in desig:
        if len(nums) >= 1:
            holder['cutting_width_mm'] = nums[0]
        if len(nums) >= 2:
            holder['max_depth_mm'] = nums[1]
        if len(nums) >= 3:
            holder['overall_length_mm'] = nums[2]
        return

    # Standard ISO external turning holders
    # Typical columns: shank_h x shank_w, OAL, ...
    if len(nums) >= 2:
        # If shank already decoded from designation, use for OAL
        if holder.get('shank_height_mm') and holder.get('shank_width_mm'):
            if len(nums) >= 1:
                holder['overall_length_mm'] = nums[0]
        else:
            holder['shank_height_mm'] = nums[0]
            holder['shank_width_mm'] = nums[1]
            if len(nums) >= 3:
                holder['overall_length_mm'] = nums[2]


def extract_boring_system(doc):
    """Extract PINZBOHR boring system data from pages 186-210."""
    holders = []
    seen = set()

    for pg_idx in range(185, min(210, doc.page_count)):
        text = doc[pg_idx].get_text()
        lines = text.split('\n')

        # Look for cartridge/head designations
        # CT** patterns (cartridges), *CT75/CT90 (arbors)
        cart_pat = re.compile(r'(CT[A-Z]{2,}[RL]?\d+[A-Z]*[-\d]*)')
        arbor_pat = re.compile(r'(\*?CT\d{2}[\w\-]+)')
        head_pat = re.compile(r'([A-Z]+\d+[A-Z]*[-]\d+)')

        page_angle = None
        for line in lines[:20]:
            angle_m = re.search(r'(\d+(?:\.\d+)?)\s*[°˚]', line)
            if angle_m:
                page_angle = float(angle_m.group(1))
                break

        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 6:
                continue

            # PINZBOHR cartridge heads (e.g., CTFER/L10CA-11)
            m = re.match(r'(CT[A-Z]{2,}R?/?L?\d+[A-Z]*-\d+)', line)
            if m:
                desig = m.group(1)
                if desig in seen:
                    continue
                seen.add(desig)

                rest = line[m.end():].strip()
                nums = [float(x) for x in re.findall(r'[-]?\d+(?:\.\d+)?', rest)]

                # Collect more numbers from following lines
                for j in range(i+1, min(i+3, len(lines))):
                    nl = lines[j].strip()
                    if re.match(r'^[\d\.\-\s]+$', nl):
                        nums.extend([float(x) for x in re.findall(r'[-]?\d+(?:\.\d+)?', nl)])
                    else:
                        break

                holder = {
                    'designation': desig,
                    'holder_type': 'boring_bar',
                    'source_page': pg_idx + 1,
                }

                if page_angle:
                    holder['cutting_edge_angle_deg'] = page_angle

                # Typical PINZBOHR columns: DMIN, DMIN2, RE, then dimensions
                if len(nums) >= 1:
                    holder['min_bore_mm'] = nums[0]
                if len(nums) >= 2:
                    holder['overall_length_mm'] = nums[1]
                if len(nums) >= 3 and nums[2] < 10:
                    holder['nose_radius_mm'] = nums[2]

                holders.append(holder)

    return holders


def extract_all(doc):
    """Main extraction: scan all relevant pages."""
    all_holders = []
    seen = set()

    # Strategy: scan every page from 15 to 218 and extract any toolholder-like rows
    for pg_idx in range(15, min(218, doc.page_count)):
        text = doc[pg_idx].get_text()
        lines = text.split('\n')

        # Determine section from page number
        if pg_idx < 29:
            section = 'external_turning'
        elif pg_idx < 37:
            section = 'internal_turning'
        elif pg_idx < 38:
            section = 'threading'
        elif pg_idx < 44:
            section = 'grooving'
        elif pg_idx < 60:
            section = 'external_turning'  # milling/adapters
        elif pg_idx < 65:
            section = 'boring_bar'  # SwissBore
        elif pg_idx < 155:
            section = 'toolholder_system'  # TungHold (already in holder catalog)
        elif pg_idx < 185:
            section = 'accessories'
        elif pg_idx < 210:
            section = 'boring_bar'  # PINZBOHR
        else:
            section = 'internal_turning'  # SwissBore bars

        # Skip TungHold pages (already extracted in tungaloy-holder-catalog.ts) and accessories
        if section in ('toolholder_system', 'accessories'):
            continue

        # Detect page angle
        page_angle = None
        for line in lines[:25]:
            angle_m = re.search(r'(\d+(?:\.\d+)?)\s*[°˚]', line)
            if angle_m:
                val = float(angle_m.group(1))
                if val in (45, 60, 63, 72.5, 75, 80, 85, 90, 91, 93, 95, 100, 107.5, 117.5, 142):
                    page_angle = val
                    break

        # Detect header context
        header_ctx = ''
        for line in lines[:15]:
            if any(k in line for k in ['DCONMS', 'DMIN', 'WF', 'LF', 'HF', 'CDX']):
                header_ctx = line
                break

        # Extract rows
        rows = extract_rows_universal(lines, pg_idx + 1, section, page_angle, header_ctx)
        for row in rows:
            if row['designation'] not in seen:
                seen.add(row['designation'])
                all_holders.append(row)

    return all_holders


def extract_rows_universal(lines: list, page_num: int, section: str,
                           page_angle: float | None, header_ctx: str):
    """Universal row extractor for all sections."""
    rows = []

    # Patterns that match toolholder designations
    patterns = [
        # TungCap: C[3-8] + letters + numbers
        re.compile(r'^(C[3-8][A-Z]{3,}[RL/]*[\w\-\.]*(?:\(\d\))?)(?:\s|$)'),
        # ISO standard: 5+ uppercase + R/L + 4 digits + optional suffix
        re.compile(r'^([A-Z]{4,7}[RL]\d{4}[A-Z]?\d{0,4}[\-\w]*)(?:\s|$)'),
        # SwissBore: S/C + 4 digits + dash + letters + digits
        re.compile(r'^([SC]\d{4}-[A-Z]{3,}\d{2,3})(?:\s|$)'),
        # Boring cartridge: CT + letters + digits
        re.compile(r'^(CT[A-Z]{2,}R?/?L?\d+[A-Z]*[-]\d+)(?:\s|$)'),
        # Grooving: CAER/CAEL
        re.compile(r'^(CAER/L-\d+T\d+)(?:\s|$)'),
        # Generic series with numbers
        re.compile(r'^(C[3-8]SEM\d+X\d+[A-Z]?)(?:\s|$)'),
    ]

    skip_prefixes = ['DCONMS', 'DCONWS', 'DCSFMS', 'Tungaloy', 'Grade', 'Insert',
                     'Others', 'Method', 'Note', 'When', 'Select', 'Tool']

    for i, line in enumerate(lines):
        line = line.strip()
        if not line or len(line) < 6:
            continue

        # Skip header/text lines
        if any(line.startswith(p) for p in skip_prefixes):
            continue

        matched_desig = None
        for pat in patterns:
            m = pat.match(line)
            if m:
                matched_desig = m.group(1)
                break

        if not matched_desig:
            continue

        # Clean up designation
        desig = matched_desig.strip()
        if len(desig) < 8:
            continue

        # Collect numbers from rest of line and following lines
        rest = line[len(desig):].strip()
        all_nums_str = re.findall(r'[-]?\d+(?:\.\d+)?', rest)

        for j in range(i+1, min(i+4, len(lines))):
            nl = lines[j].strip()
            if not nl:
                continue
            if re.match(r'^[\d\.\-\s,/]+$', nl):
                all_nums_str.extend(re.findall(r'[-]?\d+(?:\.\d+)?', nl))
            elif any(p.match(nl) for p in patterns):
                break
            elif nl.startswith(('C3', 'C4', 'C5', 'C6', 'C8')) and len(nl) > 5:
                break
            elif re.match(r'^[A-Z]{2}\*{2}', nl):
                break
            elif re.match(r'^[A-Z]{3,}', nl) and not re.match(r'^[\d]', nl):
                break
            else:
                break

        nums = [float(x) for x in all_nums_str]

        # Determine holder type
        htype = classify_holder_type(desig, header_ctx)
        if htype == 'external_turning' and section in ('internal_turning', 'boring_bar', 'threading', 'grooving'):
            htype = section

        holder = {
            'designation': desig,
            'holder_type': htype,
            'source_page': page_num,
        }

        # Decode ISO metadata from designation
        iso_meta = decode_iso_designation(desig)
        holder.update(iso_meta)

        if page_angle and not holder.get('cutting_edge_angle_deg'):
            holder['cutting_edge_angle_deg'] = page_angle

        # Assign dimensions
        assign_dimensions_v2(holder, nums, section, header_ctx)

        rows.append(holder)

    return rows


def assign_dimensions_v2(holder: dict, nums: list, section: str, header_ctx: str):
    """Assign dimensions based on section type and available numbers."""
    if not nums:
        return

    desig = holder['designation']
    is_tungcap = bool(re.match(r'^C[3-8]', desig))

    if is_tungcap:
        # TungCap: DCONMS, LF, WF/L2, DMIN, DMIN2/L2, RE
        if len(nums) >= 1:
            holder['dconms_mm'] = nums[0]
        if len(nums) >= 2:
            holder['overall_length_mm'] = nums[1]
        if len(nums) >= 3:
            holder['shank_width_mm'] = nums[2]
        if section in ('internal_turning', 'boring_bar'):
            if len(nums) >= 4:
                holder['min_bore_mm'] = nums[3]
            if len(nums) >= 5:
                # Could be DMIN2 or L2
                val = nums[4]
                if val < 100:
                    holder['min_bore2_mm'] = val
                else:
                    holder['functional_length_mm'] = val
        else:
            if len(nums) >= 4:
                holder['bore_diameter_mm'] = nums[3]
        # Last small number is nose radius
        for n in reversed(nums):
            if 0.1 <= n <= 6.4:
                holder['nose_radius_mm'] = n
                break

    elif section == 'grooving':
        # Grooving: CW, CDX, LF, WF, ...
        if len(nums) >= 1:
            holder['cutting_width_mm'] = nums[0]
        if len(nums) >= 2:
            holder['max_depth_mm'] = nums[1]
        if len(nums) >= 3:
            holder['overall_length_mm'] = nums[2]

    elif section in ('internal_turning', 'boring_bar'):
        # SwissBore/boring: DMIN, DCONMS, WF, LF, LH, LS, RE
        if 'DMIN' in header_ctx:
            if len(nums) >= 1:
                holder['min_bore_mm'] = nums[0]
            if len(nums) >= 2:
                holder['bore_diameter_mm'] = nums[1]
            if len(nums) >= 3:
                holder['shank_width_mm'] = nums[2]
            if len(nums) >= 4:
                holder['overall_length_mm'] = nums[3]
        else:
            if len(nums) >= 1:
                holder['bore_diameter_mm'] = nums[0]
            if len(nums) >= 2:
                holder['overall_length_mm'] = nums[1]
        # Nose radius
        for n in reversed(nums):
            if 0.1 <= n <= 6.4:
                holder['nose_radius_mm'] = n
                break

    else:
        # External turning: typically shank already decoded
        if holder.get('shank_height_mm') and holder.get('shank_width_mm'):
            if len(nums) >= 1:
                holder['overall_length_mm'] = nums[0]
        elif len(nums) >= 2:
            if nums[0] > 100:
                holder['overall_length_mm'] = nums[0]
            else:
                holder['shank_height_mm'] = nums[0]
                holder['shank_width_mm'] = nums[1] if nums[1] <= 100 else nums[0]
                if len(nums) >= 3:
                    holder['overall_length_mm'] = nums[2]


def generate_json(holders: list):
    """Write extracted data to JSON."""
    # Clean up: remove None values, ensure types
    cleaned = []
    for h in holders:
        clean = {k: v for k, v in h.items() if v is not None}
        cleaned.append(clean)

    with open(JSON_OUT, 'w', encoding='utf-8') as f:
        json.dump({
            'source': 'Tungaloy GC_2023-2024_G_Tooling.pdf (Vol. 4)',
            'extracted': '2026-03-14',
            'count': len(cleaned),
            'holders': cleaned
        }, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(cleaned)} holders to {JSON_OUT}")
    return cleaned


def generate_typescript(holders: list):
    """Generate TypeScript catalog file."""

    # Group by type for stats
    by_type = {}
    for h in holders:
        t = h.get('holder_type', 'unknown')
        by_type.setdefault(t, []).append(h)

    type_counts = {k: len(v) for k, v in by_type.items()}

    ts_lines = []
    ts_lines.append('/**')
    ts_lines.append(' * Tungaloy Tooling Catalog — Extracted from GC_2023-2024_G_Tooling.pdf (Vol. 4)')
    ts_lines.append(f' * {len(holders)} toolholders: {", ".join(f"{k}={v}" for k,v in sorted(type_counts.items()))}')
    ts_lines.append(' * Generated by extract-tungaloy-tooling.py')
    ts_lines.append(' */')
    ts_lines.append('')
    ts_lines.append('export interface TungaloyToolholder {')
    ts_lines.append('  designation: string;')
    ts_lines.append('  holder_type: "external_turning" | "internal_turning" | "boring_bar" | "threading" | "grooving";')
    ts_lines.append('  clamping?: string;')
    ts_lines.append('  insert_shape?: string;')
    ts_lines.append('  cutting_edge_angle_deg?: number;')
    ts_lines.append('  hand?: "R" | "L";')
    ts_lines.append('  shank_height_mm?: number;')
    ts_lines.append('  shank_width_mm?: number;')
    ts_lines.append('  dconms_mm?: number;')
    ts_lines.append('  bore_diameter_mm?: number;')
    ts_lines.append('  min_bore_mm?: number;')
    ts_lines.append('  min_bore2_mm?: number;')
    ts_lines.append('  overall_length_mm?: number;')
    ts_lines.append('  functional_length_mm?: number;')
    ts_lines.append('  cutting_width_mm?: number;')
    ts_lines.append('  max_depth_mm?: number;')
    ts_lines.append('  nose_radius_mm?: number;')
    ts_lines.append('  insert_compat?: string;')
    ts_lines.append('  source_page?: number;')
    ts_lines.append('}')
    ts_lines.append('')
    ts_lines.append('export const TUNGALOY_TOOLHOLDERS: TungaloyToolholder[] = [')

    for h in holders:
        parts = []
        parts.append(f'designation: "{h["designation"]}"')
        parts.append(f'holder_type: "{h.get("holder_type", "external_turning")}"')

        for key in ['clamping', 'insert_shape', 'hand', 'insert_compat']:
            if key in h and h[key] is not None:
                parts.append(f'{key}: "{h[key]}"')

        for key in ['cutting_edge_angle_deg', 'shank_height_mm', 'shank_width_mm',
                     'dconms_mm', 'bore_diameter_mm', 'min_bore_mm', 'min_bore2_mm',
                     'overall_length_mm', 'functional_length_mm',
                     'cutting_width_mm', 'max_depth_mm', 'nose_radius_mm', 'source_page']:
            if key in h and h[key] is not None:
                val = h[key]
                if isinstance(val, float) and val == int(val):
                    parts.append(f'{key}: {int(val)}')
                else:
                    parts.append(f'{key}: {val}')

        ts_lines.append(f'  {{ {", ".join(parts)} }},')

    ts_lines.append('];')
    ts_lines.append('')

    with open(TS_OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(ts_lines))

    print(f"Wrote TypeScript to {TS_OUT}")


def main():
    print(f"Opening {PDF_PATH}...")
    doc = fitz.open(PDF_PATH)
    print(f"Total pages: {doc.page_count}")

    print("Extracting toolholder data...")
    holders = extract_all(doc)
    doc.close()

    print(f"\nExtracted {len(holders)} total toolholders")

    # Stats
    by_type = {}
    for h in holders:
        t = h.get('holder_type', 'unknown')
        by_type.setdefault(t, []).append(h)

    print("\nBy type:")
    for t, items in sorted(by_type.items()):
        print(f"  {t}: {len(items)}")
        # Sample designations
        for item in items[:3]:
            d = item['designation']
            oal = item.get('overall_length_mm', '?')
            angle = item.get('cutting_edge_angle_deg', '?')
            print(f"    e.g. {d} (OAL={oal}, angle={angle}°)")

    # Count holders with key dimensions
    with_oal = sum(1 for h in holders if 'overall_length_mm' in h)
    with_angle = sum(1 for h in holders if 'cutting_edge_angle_deg' in h)
    with_clamp = sum(1 for h in holders if 'clamping' in h)
    with_insert = sum(1 for h in holders if 'insert_shape' in h)
    with_bore = sum(1 for h in holders if 'min_bore_mm' in h)

    print(f"\nDimension coverage:")
    print(f"  overall_length: {with_oal}/{len(holders)}")
    print(f"  cutting_edge_angle: {with_angle}/{len(holders)}")
    print(f"  clamping_system: {with_clamp}/{len(holders)}")
    print(f"  insert_shape: {with_insert}/{len(holders)}")
    print(f"  min_bore (boring): {with_bore}/{len(holders)}")

    # Generate outputs
    cleaned = generate_json(holders)
    generate_typescript(holders)

    print(f"\nDone! {len(holders)} holders extracted.")


if __name__ == '__main__':
    main()
