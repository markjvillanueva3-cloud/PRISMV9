"""Vendor Part Number Extractor — regex-based SKU extraction for tooling catalogs.

Complements catalog_extractor.py (which focuses on ISO inserts) by supporting
vendor-specific formats (drills, endmills, holders) that don't match the ISO
10x5-character insert pattern. Used to bulk-ingest catalog PDFs into the
PRISM tool database without Claude API calls.

Supports: Tungaloy, Sandvik, Iscar, Kennametal, Seco, Walter, Kyocera,
Mitsubishi, OSG, Guhring, Korloy, Emuge, Dormer Pramet, MA Ford, AMPC,
Rego-Fix, Big Daishowa, Haimer, Helical, Harvey, Niagara, Ingersoll,
Sumitomo, YG1, SGS, Horn, Widia.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Vendor part number patterns
# ---------------------------------------------------------------------------

# Each entry: (vendor, compiled_pattern, tool_type_hint)
# Patterns are ordered by specificity (longer/more-specific first).
_VENDOR_PATTERNS: list[tuple[str, re.Pattern, str]] = [
    # Tungaloy drills — TID, TDS, TDX, TCD, TCH series
    ("Tungaloy", re.compile(r"\bT(?:ID|DS|DX|CD|CH|DL|DR|DT|DU|DW|DS|ET|EH|EF|EC|EB|FJ|FG)[A-Z0-9]?\d{2,4}(?:[A-Z]\d{1,3}(?:[-]\d+)?)?\b"), "drill"),
    # Tungaloy insert grades — T9000, T9215, AH, GH series
    ("Tungaloy", re.compile(r"\b(?:AH\d{3,4}|GH\d{3,4}|T\d{4}|TH\d{3,4}|KS\d{3,4}|NS\d{3,4})\b"), "insert_grade"),
    # Tungaloy indexable — DoFeed, TungRec, TungForce, TungJoy, TungCut series
    ("Tungaloy", re.compile(r"\b(?:DoFeed|TungRec|TungForce|TungJoy|TungCut|TungFlex|TungGrip|TungTurn|HiLinear|Tungaloy-[A-Z]+)[A-Z0-9-]{2,}\b"), "indexable"),
    # Sandvik Coromant modular — CoroMill, CoroDrill, CoroTurn
    ("Sandvik", re.compile(r"\b(?:CoroMill|CoroDrill|CoroTurn|CoroBore|CoroChuck|CoroReamer)\s*\d+(?:[A-Z]?\d*)?(?:-\w+)?\b"), "indexable"),
    # Sandvik R/T/S-prefix systems (R390, R390-170408M-KM, R245, etc.)
    ("Sandvik", re.compile(r"\b(?:R|T|S)\d{3}(?:-\d{6}[A-Z]-[A-Z]{2})?\b"), "indexable"),
    # Sandvik ISO inserts with -MF/-PF/-KM/etc. suffix
    ("Sandvik", re.compile(r"\b(?:CNMG|DNMG|WNMG|SNMG|TNMG|VNMG|RCMT|CCMT|DCMT|VCMT|TCMT|SCMT)\s*\d{4,6}(?:[-](?:MF|PF|PM|KM|MM|MR|PR|MT|QM|HM|HP|WF|WM|WH))?\b"), "insert"),
    # Iscar — Helimill, Heliplus, Heliturn, Chatterfree, Tangmill
    ("Iscar", re.compile(r"\b(?:Helimill|Heliplus|Heliturn|Chatterfree|Tangmill|Helido|Heliquad|Heli3|Heliocto|Solidmill|Dreammill)\s*[A-Z0-9-]{3,}\b"), "indexable"),
    # Iscar grades (IC308, IC328, IC908, IC950)
    ("Iscar", re.compile(r"\bIC\d{3,4}\b"), "insert_grade"),
    # Iscar endmills — EC, ECR, ECP, ECB series
    ("Iscar", re.compile(r"\bEC[A-Z]?\d{2,4}[A-Z0-9-]*\b"), "endmill"),
    # Kennametal — HP, HPR, KMP, KSEM, KSDG, Beyond series
    ("Kennametal", re.compile(r"\b(?:Beyond|KSDG|KSEM|KSEM[A-Z]?|KenCut|KenTIP|KM-?\d|HFPR\d|HPMP\d|HPHV\d|HPHS\d|HPHM\d)[A-Z0-9-]{2,}\b"), "indexable"),
    # Kennametal insert patterns (HFPR1204, HPHV2506)
    ("Kennametal", re.compile(r"\b(?:HFPR|HPHV|HPHS|HPHM|HPMP|HFFR|HFPA)\d{4,6}[A-Z0-9-]*\b"), "insert"),
    # Kennametal grade (K313, KC725M, KCP25, KCPK10)
    ("Kennametal", re.compile(r"\bKC?P?[A-Z]?\d{2,4}[A-Z]?\b"), "insert_grade"),
    # Seco — Jabro, Duratomic, JS, JH, SC series
    ("Seco", re.compile(r"\b(?:Jabro|Duratomic|JS\d{3}|JH\d{3}|SC\d{3}|MS2050|T250M|T350M|MF\d{2})[A-Z0-9-]*\b"), "indexable"),
    # Seco endmills (JS512, JS554, JS753)
    ("Seco", re.compile(r"\bJ[SH]\d{3}[A-Z0-9-]{3,}\b"), "endmill"),
    # Walter — Xtra-tec, Tiger-tec, F2238, F2339, P1234 series
    ("Walter", re.compile(r"\b(?:Xtra-?tec|Tiger-?tec|Prototyp|Titex|Walter-?[A-Z]+|F\d{4}|P\d{4}|K\d{4}|A\d{4})[A-Z0-9-]*\b"), "indexable"),
    # Walter grades (WSM10, WSP45, WXP40)
    ("Walter", re.compile(r"\bW(?:SM|SP|XP|AP|AS|XL|XM|UX)\d{2,3}\b"), "insert_grade"),
    # Mitsubishi — VP, MA, MZ, NX, US, UP, UE, UTi series grades
    ("Mitsubishi", re.compile(r"\b(?:VP15TF|VP20RT|MA\d{4}|MZ\d{4}|NX\d{4}|US\d{3,4}|UP\d{3,4}|UE\d{4}|UTi\d{3,4})\b"), "insert_grade"),
    # Mitsubishi mill — AJX, APX, SMART MIRACLE, etc.
    ("Mitsubishi", re.compile(r"\b(?:AJX|APX|ARX|ASX|AOMT|AXMT|AOX|ANGX|ASX)\d{2,4}[A-Z0-9-]*\b"), "endmill"),
    # Kyocera — CA, PR, CVD grades + ceratip inserts
    ("Kyocera", re.compile(r"\b(?:CA\d{3,4}|PR\d{3,4}|TN\d{3,4}|Ceratip-[A-Z0-9]+)\b"), "insert_grade"),
    # OSG — EXOCARB, WXL, WXS, WDS, ADO series
    ("OSG", re.compile(r"\b(?:EXOCARB|WXL|WXS|WDS|WXLS|ADO|AE|BT|ATD|HY-PRO|DUOCARB|POWERMAX)[A-Z0-9-]{2,}\b"), "indexable"),
    # Guhring — RT, GM, GU, Signum series
    ("Guhring", re.compile(r"\b(?:RT|GM|GU|Signum|Guhring)[- ]?\d{3,4}[A-Z0-9-]*\b"), "indexable"),
    # Korloy — NC, NCMK, NCMP, PC, CN, grades etc.
    ("Korloy", re.compile(r"\b(?:NC|NCMK|NCMP|PC|CN|Korloy)[A-Z]?\d{3,4}[A-Z0-9-]*\b"), "indexable"),
    # Emuge — EF, ER, EX series tap/thread mills
    ("Emuge", re.compile(r"\b(?:EF|ER|EX|Emuge)[- ]?[A-Z0-9]{2,4}[- ]?\d{2,4}[A-Z0-9-]*\b"), "threading"),
    # Dormer Pramet — A, B, C series
    ("Dormer Pramet", re.compile(r"\b(?:Dormer|Pramet)[- ]?[A-Z]\d{4,5}\b"), "indexable"),
    # MA Ford — standard TuffCut series
    ("MA Ford", re.compile(r"\b(?:TuffCut|MA Ford|MAFORD)[- ]?[A-Z0-9]{2,}[- ]?\d{2,4}[A-Z0-9-]*\b"), "endmill"),
    # AMPC carbide tools
    ("AMPC", re.compile(r"\bAMPC[- ]?[A-Z0-9]{3,}\b"), "indexable"),
    # Rego-Fix — powRgrip, ER, PG collet system codes
    ("Rego-Fix", re.compile(r"\b(?:powRgrip|PG|Rego-?Fix)[- ]?\d{2,4}[A-Z0-9-]*\b"), "holder"),
    # Big Daishowa — BBT, HSK, Hi-Power, MEGA chuck series
    ("Big Daishowa", re.compile(r"\b(?:BBT|MEGA|Hi-Power|MEGA-?CHUCK|MEGA-?E|BIG-?PLUS|Big-?Daishowa)[- ]?\d{2,4}[A-Z0-9-]*\b"), "holder"),
    # Haimer holder patterns
    ("Haimer", re.compile(r"\b(?:Haimer|HSK[- ]?[A-Z]\d{2,3}|BT[- ]?\d{2,3})[- ]?[A-Z0-9]{2,}\b"), "holder"),
    # Helical Solutions — H series endmills
    ("Helical", re.compile(r"\b(?:Helical|H[- ]?\d{5}|H[A-Z][- ]?\d{4,5})[- ]?[A-Z0-9-]{2,}\b"), "endmill"),
    # Harvey Tool — miniature series
    ("Harvey", re.compile(r"\b(?:Harvey|HR[- ]?\d{4,6}|HT[- ]?\d{4,6})\b"), "endmill"),
    # Niagara Cutter — N series
    ("Niagara", re.compile(r"\b(?:Niagara|NN[- ]?\d{3,5}|C\d{4,5}|S\d{4,5}|Nexus)[- ]?[A-Z0-9]*\b"), "endmill"),
    # Ingersoll (indexable cutters — G, GS, QCN, QMA series)
    ("Ingersoll", re.compile(r"\b(?:Ingersoll|G[SN]\d{2,4}|QCN\d{3,4}|QMA\d{3,4}|QMN\d{3,4})[A-Z0-9-]*\b"), "indexable"),
    # Sumitomo — SCM, SCC, SGS grades
    ("Sumitomo", re.compile(r"\b(?:Sumitomo|SCM|SCC|SumiDrill|SumiBore)[- ]?[A-Z0-9]{2,4}[- ]?\d{2,4}[A-Z0-9-]*\b"), "indexable"),
    # YG1 — yg brand endmills
    ("YG1", re.compile(r"\b(?:YG-?1|ALU-POWER|X5070|X-?Power)[A-Z0-9-]{2,}\b"), "endmill"),
    # SGS Tool series
    ("SGS", re.compile(r"\b(?:SGS|Z-?Carb|SCHN|SCHL)[A-Z]?[- ]?\d{3,5}[A-Z0-9-]*\b"), "endmill"),
    # Horn — drilling/grooving/turning
    ("Horn", re.compile(r"\b(?:Horn|S112|S117|S224|S229|S274|S317|S224)[A-Z0-9-]{2,}\b"), "indexable"),
    # Widia (Kennametal's solid line)
    ("Widia", re.compile(r"\b(?:Widia|W[A-Z]{2}\d{3,4})[A-Z0-9-]*\b"), "indexable"),
]


# Diameter association — part numbers often embed the cutting diameter
# in mm or imperial units. These patterns find diameter near a part.
_DIAMETER_PATTERN = re.compile(
    r"(?:[⌀Ø]|dia\.?|diameter[:\s]*|D[:\s=]+|d1\s*=\s*)"
    r"(\d+(?:\.\d+)?)\s*(mm|inch|in|\")",
    re.IGNORECASE,
)

# Tool-type classification by part-code prefix
_TYPE_BY_PREFIX: dict[str, str] = {
    "TID": "drill", "TDS": "drill", "TDX": "drill", "TCD": "drill",
    "TCH": "drill", "TDL": "drill", "TDR": "drill",
    "ADO": "drill", "RT": "drill", "GM": "drill",
    "EC": "endmill", "JS": "endmill", "JH": "endmill",
    "WXL": "endmill", "WXS": "endmill", "AOMT": "endmill",
    "CNMG": "insert", "DNMG": "insert", "WNMG": "insert",
    "SNMG": "insert", "TNMG": "insert", "VNMG": "insert",
    "CCMT": "insert", "DCMT": "insert",
    "HSK": "holder", "BT": "holder", "BBT": "holder",
    "PG": "holder", "powRgrip": "holder",
    "ER": "threading", "EX": "threading",
}


def _infer_type(part: str, hint: str) -> str:
    """Infer tool type from part number prefix, falling back to pattern hint."""
    p = part.upper().strip()
    for prefix, tool_type in _TYPE_BY_PREFIX.items():
        if p.startswith(prefix.upper()):
            return tool_type
    return hint


# ---------------------------------------------------------------------------
# Result data
# ---------------------------------------------------------------------------


@dataclass
class ExtractedPart:
    designation: str
    manufacturer: str
    type: str
    cutting_diameter_mm: float | None = None
    page: int | None = None
    context_snippet: str = ""

    def to_dict(self) -> dict:
        out = {
            "designation": self.designation,
            "manufacturer": self.manufacturer,
            "type": self.type,
        }
        if self.cutting_diameter_mm is not None:
            out["cutting_diameter_mm"] = self.cutting_diameter_mm
        if self.page is not None:
            out["page"] = self.page
        return out


@dataclass
class VendorExtractResult:
    manufacturer: str
    source_file: str
    parts: list[ExtractedPart] = field(default_factory=list)
    by_type: dict[str, int] = field(default_factory=dict)
    unique_count: int = 0

    def to_json_records(self) -> list[dict]:
        return [p.to_dict() for p in self.parts]


# ---------------------------------------------------------------------------
# Extractor
# ---------------------------------------------------------------------------


def _find_nearest_diameter(text: str, position: int, window: int = 150) -> float | None:
    """Find a diameter value near a position in text."""
    start = max(0, position - window)
    end = min(len(text), position + window)
    ctx = text[start:end]
    m = _DIAMETER_PATTERN.search(ctx)
    if m:
        val = float(m.group(1))
        unit = m.group(2).lower()
        if unit in ("inch", "in", '"'):
            val *= 25.4
        return round(val, 3)
    return None


def extract_parts_from_text(
    text: str,
    source_file: str = "",
    primary_manufacturer: str | None = None,
    max_parts: int | None = None,
) -> VendorExtractResult:
    """Scan text for vendor part numbers across all known patterns.

    If `primary_manufacturer` is provided, only that vendor's patterns
    are applied (faster + higher precision for known-source PDFs).
    """
    seen: dict[str, ExtractedPart] = {}
    mfg_counts: dict[str, int] = {}

    for vendor, pattern, type_hint in _VENDOR_PATTERNS:
        if primary_manufacturer and vendor != primary_manufacturer:
            continue
        for m in pattern.finditer(text):
            part_str = m.group(0).strip()
            if len(part_str) < 4 or len(part_str) > 40:
                continue
            # Skip pure numeric strings or common false positives
            if not re.search(r"[A-Z]", part_str, re.IGNORECASE):
                continue
            key = part_str.upper()
            if key in seen:
                continue

            tool_type = _infer_type(part_str, type_hint)
            diameter = _find_nearest_diameter(text, m.start())
            seen[key] = ExtractedPart(
                designation=part_str,
                manufacturer=vendor,
                type=tool_type,
                cutting_diameter_mm=diameter,
            )
            mfg_counts[vendor] = mfg_counts.get(vendor, 0) + 1

            if max_parts and len(seen) >= max_parts:
                break
        if max_parts and len(seen) >= max_parts:
            break

    # Determine primary manufacturer (most common in output)
    if primary_manufacturer:
        primary = primary_manufacturer
    else:
        primary = max(mfg_counts.items(), key=lambda kv: kv[1])[0] if mfg_counts else "unknown"

    parts = list(seen.values())
    by_type: dict[str, int] = {}
    for p in parts:
        by_type[p.type] = by_type.get(p.type, 0) + 1

    return VendorExtractResult(
        manufacturer=primary,
        source_file=source_file,
        parts=parts,
        by_type=by_type,
        unique_count=len(parts),
    )


def extract_parts_from_pdf(
    pdf_path: str | Path,
    primary_manufacturer: str | None = None,
    max_parts: int | None = None,
) -> VendorExtractResult:
    """Ingest a PDF and extract part numbers."""
    from src.document_ingest import ingest_document

    result = ingest_document(pdf_path)
    if not result.is_valid:
        return VendorExtractResult(
            manufacturer=primary_manufacturer or "unknown",
            source_file=str(pdf_path),
        )
    return extract_parts_from_text(
        result.text,
        source_file=str(pdf_path),
        primary_manufacturer=primary_manufacturer,
        max_parts=max_parts,
    )
