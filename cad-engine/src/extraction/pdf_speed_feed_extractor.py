"""
PDF Speed/Feed Extractor — Extracts cutting speed and feed data from tooling catalogs
and populates strategy_db.json for the PRISM learning pipeline.

Designed for Tungaloy/Sandvik-style catalogs with "Standard Cutting Conditions" tables.
Uses pypdf for text extraction, regex for data parsing.
"""

import json
import logging
import re
import os
from datetime import datetime, timezone
import pypdf

logger = logging.getLogger(__name__)

# ─── Material Classification ──────────────────────────────────────

MATERIAL_MAP = {
    "low carbon steel": "low_carbon_steel",
    "carbon steel": "carbon_steel",
    "alloy steel": "alloy_steel",
    "prehardened steel": "prehardened_steel",
    "stainless steel": "stainless_steel",
    "gray cast iron": "gray_cast_iron",
    "ductile cast iron": "ductile_cast_iron",
    "ductile cast irons": "ductile_cast_iron",
    "cast iron": "cast_iron",
    "aluminum": "aluminum",
    "aluminum alloy": "aluminum",
    "non-ferrous": "non_ferrous",
    "non-ferrous metal": "non_ferrous",
    "titanium": "titanium",
    "titanium alloys": "titanium",
    "ti-6al-4v": "titanium",
    "superalloys": "nickel_alloy",
    "inconel": "nickel_alloy",
    "inconel718": "nickel_alloy",
    "heat resistant superalloys": "nickel_alloy",
    "hard materials": "hardened_steel",
    "hardened steel": "hardened_steel",
    "copper": "copper",
    "copper alloy": "copper",
}

MATERIAL_ORDER = [
    "low_carbon_steel", "carbon_steel", "alloy_steel", "prehardened_steel",
    "stainless_steel", "gray_cast_iron", "ductile_cast_iron", "cast_iron",
    "aluminum", "non_ferrous", "titanium", "nickel_alloy",
    "hardened_steel", "copper",
]


def sfm_to_m_min(sfm: float) -> float:
    return round(sfm * 0.3048, 1)


def ipt_to_mm_tooth(ipt: float) -> float:
    return round(ipt * 25.4, 4)


def classify_material(text: str) -> str | None:
    tl = text.lower().strip().rstrip(",.:;")
    for pattern, cls in sorted(MATERIAL_MAP.items(), key=lambda x: -len(x[0])):
        if pattern in tl:
            return cls
    return None


# ─── Page Parser ──────────────────────────────────────────────────

def extract_speed_feed_rows(text: str) -> list[tuple[float, float]]:
    """Extract (speed_low, speed_high) pairs from sfm ranges."""
    matches = re.findall(r'(\d{2,4})\s*-\s*(\d{2,4})', text)
    results = []
    for low, high in matches:
        lv, hv = int(low), int(high)
        if 20 <= lv <= 5000 and 20 <= hv <= 5000 and lv < hv:
            results.append((lv, hv))
    return results


def extract_feed_values(text: str) -> list[tuple[float, float]]:
    """Extract feed per tooth/rev ranges."""
    matches = re.findall(r'(0\.\d{3,5})\s*-\s*(0\.\d{3,5})', text)
    results = []
    for low, high in matches:
        lv, hv = float(low), float(high)
        if 0.0001 <= lv <= 0.5 and 0.0001 <= hv <= 0.5 and lv <= hv:
            results.append((lv, hv))
    return results


def parse_cutting_conditions_page(text: str, page_num: int, catalog: str) -> list[dict]:
    """Parse a single 'Standard Cutting Conditions' page."""
    entries = []
    lines = text.split('\n')

    # Detect operation type from page content
    tl = text.lower()
    if any(k in tl for k in ['end mill', 'endmill']):
        op_type = "milling_endmill"
    elif any(k in tl for k in ['face mill', 'face milling']):
        op_type = "milling_face"
    elif any(k in tl for k in ['shoulder', 'shoulder mill']):
        op_type = "milling_shoulder"
    elif any(k in tl for k in ['milling cutter', 'milling']):
        op_type = "milling"
    elif any(k in tl for k in ['turning', 'insert for turning']):
        op_type = "turning"
    elif any(k in tl for k in ['drill', 'drilling']):
        op_type = "drilling"
    elif any(k in tl for k in ['groov', 'part']):
        op_type = "grooving"
    elif any(k in tl for k in ['thread']):
        op_type = "threading"
    else:
        op_type = "general"

    # Find material labels and associate with speed data
    # Strategy: scan for material name lines, then collect speed/feed data
    # from nearby lines (within next 3 lines)
    material_data = []

    for i, line in enumerate(lines):
        mat = classify_material(line)
        if mat is None:
            continue

        # Look for speed data in this line and next few lines
        context_text = '\n'.join(lines[max(0, i-1):min(len(lines), i+4)])
        speeds = extract_speed_feed_rows(context_text)
        feeds = extract_feed_values(context_text)

        # Also check if the speed data is on the SAME line (common in tabular format)
        line_speeds = extract_speed_feed_rows(line)
        if not line_speeds and i + 1 < len(lines):
            line_speeds = extract_speed_feed_rows(lines[i + 1])

        all_speeds = line_speeds if line_speeds else speeds

        for speed_sfm_low, speed_sfm_high in all_speeds:
            entry = {
                "operation_type": op_type,
                "material_class": mat,
                "cutting_speed_m_min": {
                    "min": sfm_to_m_min(speed_sfm_low),
                    "recommended": sfm_to_m_min((speed_sfm_low + speed_sfm_high) / 2),
                    "max": sfm_to_m_min(speed_sfm_high),
                },
                "cutting_speed_sfm": {
                    "min": speed_sfm_low,
                    "max": speed_sfm_high,
                },
                "source": f"{catalog} p.{page_num + 1}",
                "confidence": 0.85,
            }

            if feeds:
                fr = feeds[0]
                entry["feed_per_tooth_mm"] = {
                    "min": ipt_to_mm_tooth(fr[0]),
                    "recommended": ipt_to_mm_tooth((fr[0] + fr[1]) / 2),
                    "max": ipt_to_mm_tooth(fr[1]),
                }

            material_data.append(entry)

    # Dedup: if same material appears multiple times on one page, keep the one
    # with the widest speed range (most complete data)
    seen = {}
    for entry in material_data:
        key = f"{entry['material_class']}_{entry['operation_type']}"
        vc_range = entry["cutting_speed_m_min"]["max"] - entry["cutting_speed_m_min"]["min"]
        if key not in seen or vc_range > (seen[key]["cutting_speed_m_min"]["max"] - seen[key]["cutting_speed_m_min"]["min"]):
            seen[key] = entry

    return list(seen.values())


# ─── Main Extraction ──────────────────────────────────────────────

def extract_catalog(pdf_path: str) -> list[dict]:
    """Extract all cutting condition data from a tooling catalog PDF."""
    reader = pypdf.PdfReader(pdf_path)
    total_pages = len(reader.pages)
    catalog_name = os.path.basename(pdf_path).replace('.pdf', '')
    all_entries = []

    print(f"Scanning {total_pages} pages of {catalog_name}...")

    for pg in range(0, total_pages):
        try:
            text = reader.pages[pg].extract_text()
        except Exception as exc:
            logger.warning("Failed to extract text from page %d: %s", pg, exc)
            continue
        if not text or len(text.strip()) < 100:
            continue

        tl = text.lower()
        # Only process pages with cutting data
        has_cutting_data = any(k in tl for k in [
            'cutting speed', 'standard cutting conditions',
            'vc (sfm)', 'vc(sfm)', 'cutting conditions',
        ])
        if not has_cutting_data:
            continue

        entries = parse_cutting_conditions_page(text, pg, catalog_name)
        if entries:
            all_entries.extend(entries)

    return all_entries


def merge_entries(entries: list[dict]) -> list[dict]:
    """Merge entries by operation+material, computing consensus ranges."""
    groups: dict[str, list[dict]] = {}
    for e in entries:
        key = f"{e['operation_type']}_{e['material_class']}"
        groups.setdefault(key, []).append(e)

    merged = []
    for key, group in groups.items():
        speeds = [e["cutting_speed_m_min"] for e in group]
        avg_min = sum(s["min"] for s in speeds) / len(speeds)
        avg_rec = sum(s["recommended"] for s in speeds) / len(speeds)
        avg_max = sum(s["max"] for s in speeds) / len(speeds)

        # Use the widest observed range (union, not average)
        union_min = min(s["min"] for s in speeds)
        union_max = max(s["max"] for s in speeds)

        entry = {
            "operation_type": group[0]["operation_type"],
            "material_class": group[0]["material_class"],
            "cutting_speed_m_min": {
                "min": round(union_min, 1),
                "recommended": round(avg_rec, 1),
                "max": round(union_max, 1),
            },
            "source_count": len(group),
            "sources": list(set(e["source"] for e in group)),
            "confidence": min(0.95, 0.70 + 0.05 * len(group)),
        }

        # Merge feeds if available
        feeds = [e["feed_per_tooth_mm"] for e in group if "feed_per_tooth_mm" in e]
        if feeds:
            entry["feed_per_tooth_mm"] = {
                "min": round(min(f["min"] for f in feeds), 4),
                "recommended": round(sum(f["recommended"] for f in feeds) / len(feeds), 4),
                "max": round(max(f["max"] for f in feeds), 4),
            }

        merged.append(entry)

    # Sort by operation, then material order
    def sort_key(e):
        mat_idx = MATERIAL_ORDER.index(e["material_class"]) if e["material_class"] in MATERIAL_ORDER else 99
        return (e["operation_type"], mat_idx)

    return sorted(merged, key=sort_key)


def save_strategy_db(entries: list[dict], output_path: str):
    """Save to strategy_db.json."""
    db = {
        "metadata": {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "total_strategies": len(entries),
            "sources": list(set(e.get("source", "") for e in entries if "source" in e)),
            "extraction_method": "pdf_speed_feed_extractor.py",
        },
        "strategies": entries,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(db, f, indent=2)

    return db


def main():
    pdf_path = "C:/PRISM/CATALOGS/GC_2023-2024_US_Milling.pdf"
    output_path = "C:/PRISM/cad-engine/data/cam_strategies/strategy_db.json"

    # Use robust pattern-based extraction
    raw = extract_catalog_robust(pdf_path)
    print("Raw entries: " + str(len(raw)))

    merged = merge_entries(raw)
    print("Merged strategies: " + str(len(merged)))
    for e in merged:
        vc = e["cutting_speed_m_min"]
        op = e["operation_type"]
        mat = e["material_class"]
        sc = e.get("source_count", 1)
        print("  " + op + " | " + mat + " | Vc=" + str(vc["min"]) + "-" + str(vc["max"]) + " m/min | " + str(sc) + " sources")

    db = save_strategy_db(merged, output_path)
    materials = set(e["material_class"] for e in merged)
    operations = set(e["operation_type"] for e in merged)
    print("Saved " + str(len(merged)) + " strategies | " + str(len(materials)) + " materials | " + str(len(operations)) + " operations")


def extract_catalog_robust(pdf_path: str) -> list[dict]:
    """Robust extraction using 'STANDARD CUTTING CONDITIONS' pages with broad material + speed matching."""
    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    total = len(reader.pages)
    all_entries = []

    # Extended material patterns (longer first for priority)
    mat_patterns = [
        (r'aluminum alloy.*si\s*[<]\s*12', 'aluminum_wrought'),
        (r'aluminum alloy.*si\s*[>≥]\s*12', 'aluminum_cast_high_si'),
        (r'aluminum alloy', 'aluminum'),
        (r'copper alloy', 'copper'),
        (r'low carbon steel', 'low_carbon_steel'),
        (r'carbon steel.*alloy steel|alloy steel.*carbon steel', 'alloy_steel'),
        (r'1055.*4140|4140.*1055', 'alloy_steel'),
        (r'1045.*etc|1015.*etc', 'carbon_steel'),
        (r'carbon steel', 'carbon_steel'),
        (r'alloy steel', 'alloy_steel'),
        (r'prehardened steel', 'prehardened_steel'),
        (r'nak80|px5', 'prehardened_steel'),
        (r'hardened steel', 'hardened_steel'),
        (r'hard material', 'hardened_steel'),
        (r'stainless steel|303.*etc|304.*etc|316.*etc', 'stainless_steel'),
        (r'gray cast iron|no\.250b|no\.300b', 'gray_cast_iron'),
        (r'ductile cast iron|60-40-18|65-45-12', 'ductile_cast_iron'),
        (r'cast iron', 'cast_iron'),
        (r'titanium|ti-6al-4v', 'titanium'),
        (r'superalloy|inconel', 'nickel_alloy'),
        (r'heat resistant', 'nickel_alloy'),
        (r'non-ferrous', 'non_ferrous'),
    ]

    print("Scanning " + str(total) + " pages...")

    for pg in range(total):
        try:
            text = reader.pages[pg].extract_text()
        except Exception as exc:
            logger.warning("Failed to extract text from page %d (speed/feed): %s", pg, exc)
            continue
        if not text or 'STANDARD CUTTING CONDITIONS' not in text.upper():
            continue

        tl = text.lower()

        # Detect operation
        if 'endmill' in tl or 'end mill' in tl:
            op = 'milling_endmill'
        elif 'face mill' in tl:
            op = 'milling_face'
        elif 'shoulder' in tl:
            op = 'milling_shoulder'
        elif 'milling cutter' in tl or 'milling' in tl:
            op = 'milling'
        elif 'drill' in tl:
            op = 'drilling'
        elif 'thread' in tl:
            op = 'threading'
        elif 'groov' in tl or 'parting' in tl:
            op = 'grooving'
        elif 'boring' in tl:
            op = 'boring'
        elif 'turning' in tl or 'chipbreaker' in tl:
            op = 'turning'
        else:
            op = 'general'

        # Find materials mentioned
        materials = []
        for pat, cls in mat_patterns:
            if re.search(pat, tl):
                if cls not in materials:
                    materials.append(cls)

        if not materials:
            continue

        # Extract ALL sfm speed ranges from page
        speed_matches = re.findall(r'(\d{2,4})\s*-\s*(\d{2,4})', text)
        speed_ranges = []
        for lo, hi in speed_matches:
            lv, hv = int(lo), int(hi)
            if 20 <= lv < hv <= 10000:
                ratio = hv / lv
                if 1.2 <= ratio <= 50:
                    speed_ranges.append((lv, hv))

        if not speed_ranges:
            continue

        # Extract feed ranges
        feed_matches = re.findall(r'(0\.\d{3,5})\s*-\s*(0\.\d{3,5})', text)
        feed_ranges = []
        for lo, hi in feed_matches:
            lv, hv = float(lo), float(hi)
            if 0.0001 <= lv <= hv <= 0.5:
                feed_ranges.append((lv, hv))

        # Distribute speeds across materials
        n_mat = len(materials)
        spd_per = max(1, len(speed_ranges) // n_mat)

        for i, mat in enumerate(materials):
            start = i * spd_per
            end = min(start + spd_per, len(speed_ranges))
            mat_spds = speed_ranges[start:end] if start < len(speed_ranges) else speed_ranges[:1]

            for sfm_lo, sfm_hi in mat_spds:
                entry = {
                    "operation_type": op,
                    "material_class": mat,
                    "cutting_speed_m_min": {
                        "min": round(sfm_lo * 0.3048, 1),
                        "recommended": round((sfm_lo + sfm_hi) / 2 * 0.3048, 1),
                        "max": round(sfm_hi * 0.3048, 1),
                    },
                    "source": "Tungaloy_GC_2023-2024 p." + str(pg + 1),
                    "confidence": 0.80,
                }
                if feed_ranges:
                    fr = feed_ranges[0]
                    entry["feed_per_tooth_mm"] = {
                        "min": round(fr[0] * 25.4, 4),
                        "recommended": round((fr[0] + fr[1]) / 2 * 25.4, 4),
                        "max": round(fr[1] * 25.4, 4),
                    }
                all_entries.append(entry)

    return all_entries


if __name__ == "__main__":
    main()
