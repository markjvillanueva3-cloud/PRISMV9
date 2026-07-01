"""Catalog Data Extraction — CC-EXT-MS1-P0-U05.

Parses tooling catalogs (Sandvik, Kennametal, Iscar, etc.) to extract
tool specifications, cutting data tables, and part numbers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ToolSpecification:
    """Tool specification extracted from a catalog."""
    part_number: str = ""
    iso_designation: str = ""
    tool_type: str = ""  # "insert", "endmill", "drill", etc.
    geometry: dict = field(default_factory=dict)  # nose_radius, rake_angle, clearance
    grade: str = ""  # carbide, cermet, ceramic, CBN, PCD
    coating: str = ""  # TiAlN, TiCN, CVD, PVD
    application_range: list[str] = field(default_factory=list)
    manufacturer: str = ""
    confidence: float = 0.7

    def to_dict(self) -> dict:
        return {
            "part_number": self.part_number,
            "iso_designation": self.iso_designation,
            "tool_type": self.tool_type,
            "geometry": self.geometry,
            "grade": self.grade,
            "coating": self.coating,
            "application_range": self.application_range,
            "manufacturer": self.manufacturer,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class CuttingDataEntry:
    """Recommended cutting data from a catalog."""
    tool_grade: str = ""
    workpiece_material: str = ""
    operation: str = ""
    speed_min: Optional[float] = None
    speed_max: Optional[float] = None
    speed_unit: str = "m/min"
    feed_min: Optional[float] = None
    feed_max: Optional[float] = None
    feed_unit: str = "mm/rev"
    doc_min: Optional[float] = None
    doc_max: Optional[float] = None
    notes: str = ""
    footnotes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d: dict = {
            "tool_grade": self.tool_grade,
            "workpiece_material": self.workpiece_material,
            "operation": self.operation,
        }
        if self.speed_min is not None:
            d["speed"] = {
                "min": self.speed_min, "max": self.speed_max,
                "unit": self.speed_unit,
            }
        if self.feed_min is not None:
            d["feed"] = {
                "min": self.feed_min, "max": self.feed_max,
                "unit": self.feed_unit,
            }
        if self.doc_min is not None:
            d["doc"] = {"min": self.doc_min, "max": self.doc_max, "unit": "mm"}
        if self.notes:
            d["notes"] = self.notes
        if self.footnotes:
            d["footnotes"] = self.footnotes
        return d


@dataclass
class CatalogExtractionResult:
    """Complete result from catalog extraction."""
    manufacturer: str = ""
    catalog_title: str = ""
    tools: list[ToolSpecification] = field(default_factory=list)
    cutting_data: list[CuttingDataEntry] = field(default_factory=list)
    new_tools_count: int = 0
    discrepancy_count: int = 0
    page_count: int = 0

    def to_dict(self) -> dict:
        return {
            "manufacturer": self.manufacturer,
            "catalog_title": self.catalog_title,
            "tools_count": len(self.tools),
            "cutting_data_count": len(self.cutting_data),
            "new_tools_count": self.new_tools_count,
            "discrepancy_count": self.discrepancy_count,
            "tools": [t.to_dict() for t in self.tools],
            "cutting_data": [cd.to_dict() for cd in self.cutting_data],
        }


# ---------------------------------------------------------------------------
# ISO Insert Designation Parsing
# ---------------------------------------------------------------------------

# ISO insert shape codes
_ISO_SHAPES: dict[str, str] = {
    "C": "rhombic_80", "D": "rhombic_55", "K": "rhombic_55",
    "R": "round", "S": "square", "T": "triangle",
    "V": "rhombic_35", "W": "trigon",
}

# Common ISO insert designations
_ISO_INSERT_PATTERN = re.compile(
    r"\b([CDKRSTVW])(N|P|C|B|E|F|G|H|M|O|W)"
    r"(M|G|E|F|C|H|U|J|L|N|A|B|D|K|P|R|S|T|V|W|X|Y|Z)"
    r"(A|B|C|D|E|F|G|H|J|K|L|M|N|T|U|W|X)"
    r"\s*(\d{2})(\d{2})(\d{2})\b",
    re.IGNORECASE,
)

# Common part number patterns per manufacturer
_MANUFACTURER_PATTERNS: dict[str, re.Pattern] = {
    "sandvik": re.compile(r"\b((?:CNMG|DNMG|WNMG|SNMG|TNMG|VNMG|RCMT)\s*\d{6}(?:-\w+)?)\b", re.IGNORECASE),
    "kennametal": re.compile(r"\b(K[A-Z]{2,4}\s*\d{3,})\b", re.IGNORECASE),
    "iscar": re.compile(r"\b(IC\d{3,4})\b", re.IGNORECASE),
}


def parse_iso_designation(text: str) -> list[str]:
    """Extract ISO insert designations from text."""
    # Simpler pattern for common inserts
    simple_pattern = re.compile(
        r"\b((?:CNMG|DNMG|WNMG|SNMG|TNMG|VNMG|RCMT|CCMT|DCMT|VCMT|TCMT|SCMT)"
        r"\s*\d{4,8}(?:-\w+)?)\b",
        re.IGNORECASE,
    )
    return [m.group(1).upper() for m in simple_pattern.finditer(text)]


# ---------------------------------------------------------------------------
# Manufacturer detection
# ---------------------------------------------------------------------------

_MANUFACTURER_SIGNALS: dict[str, list[str]] = {
    "sandvik": ["sandvik", "coromant", "coromill", "coroturn", "corodrill"],
    "kennametal": ["kennametal", "stellram", "widia"],
    "iscar": ["iscar", "tangmill", "helitang", "chatterfree"],
    "walter": ["walter", "tiger-tec", "waukesha"],
    "mitsubishi": ["mitsubishi", "mmc"],
    "seco": ["seco", "jabro"],
    "kyocera": ["kyocera", "ceratip"],
}


def detect_manufacturer(text: str) -> str:
    """Detect tooling manufacturer from text."""
    t = text.lower()
    for mfr, keywords in _MANUFACTURER_SIGNALS.items():
        if any(kw in t for kw in keywords):
            return mfr
    return ""


# ---------------------------------------------------------------------------
# Catalog Extractor
# ---------------------------------------------------------------------------

class CatalogExtractor:
    """Extracts tool specifications and cutting data from catalog text.

    Parses tooling catalog content to extract:
    - Tool specifications (geometry, grade, coating, application)
    - ISO insert designations and part numbers
    - Cutting data recommendation tables
    - Cross-references against existing tool database
    """

    def __init__(self, existing_tool_db: Optional[dict] = None):
        self._tool_db = existing_tool_db or {}

    def extract(self, text: str, title: str = "") -> CatalogExtractionResult:
        """Extract catalog data from text content."""
        manufacturer = detect_manufacturer(title + " " + text)
        tools = self._extract_tools(text, manufacturer)
        cutting_data = self._extract_cutting_data(text)

        # Cross-reference against existing DB
        new_count, discrepancy_count = self._cross_reference(tools)

        return CatalogExtractionResult(
            manufacturer=manufacturer,
            catalog_title=title,
            tools=tools,
            cutting_data=cutting_data,
            new_tools_count=new_count,
            discrepancy_count=discrepancy_count,
        )

    def _extract_tools(self, text: str, manufacturer: str) -> list[ToolSpecification]:
        """Extract tool specifications from text."""
        tools: list[ToolSpecification] = []

        # Extract ISO designations
        iso_designations = parse_iso_designation(text)
        for iso in iso_designations:
            tool = ToolSpecification(
                iso_designation=iso,
                tool_type="insert",
                manufacturer=manufacturer,
            )

            # Extract grade/coating near the designation
            context = self._get_context(text, iso, window=200)
            tool.grade = self._detect_grade(context)
            tool.coating = self._detect_coating(context)
            tool.geometry = self._detect_geometry(context)

            tools.append(tool)

        # Extract part numbers by manufacturer
        if manufacturer in _MANUFACTURER_PATTERNS:
            pattern = _MANUFACTURER_PATTERNS[manufacturer]
            for match in pattern.finditer(text):
                pn = match.group(1).strip()
                # Avoid duplicates from ISO extraction
                if not any(t.iso_designation == pn for t in tools):
                    tools.append(ToolSpecification(
                        part_number=pn,
                        manufacturer=manufacturer,
                        tool_type="insert",
                    ))

        return tools

    def _extract_cutting_data(self, text: str) -> list[CuttingDataEntry]:
        """Extract cutting data recommendations from text."""
        entries: list[CuttingDataEntry] = []

        # Look for speed/feed recommendations with material context
        from .param_parser import extract_material_context, _SPEED_PATTERN, _FEED_PATTERN

        # Find material-specific sections
        material_sections = re.finditer(
            r"(?:for|material[:\s]+|workpiece[:\s]+)"
            r"([^.]{3,50}?)(?::|,|\n)",
            text, re.IGNORECASE,
        )

        for ms in material_sections:
            material_text = ms.group(1).strip()
            context = text[ms.end():ms.end() + 300]

            speed_match = _SPEED_PATTERN.search(context)
            feed_match = _FEED_PATTERN.search(context)

            if speed_match or feed_match:
                entry = CuttingDataEntry(
                    workpiece_material=material_text,
                )
                if speed_match:
                    if speed_match.group(1) and speed_match.group(2):
                        entry.speed_min = float(speed_match.group(1))
                        entry.speed_max = float(speed_match.group(2))
                        entry.speed_unit = speed_match.group(3).lower()
                    elif speed_match.group(4):
                        val = float(speed_match.group(4))
                        entry.speed_min = val
                        entry.speed_max = val
                        entry.speed_unit = speed_match.group(5).lower()

                if feed_match:
                    if feed_match.group(1) and feed_match.group(2):
                        entry.feed_min = float(feed_match.group(1))
                        entry.feed_max = float(feed_match.group(2))
                        entry.feed_unit = feed_match.group(3).lower()
                    elif feed_match.group(4):
                        val = float(feed_match.group(4))
                        entry.feed_min = val
                        entry.feed_max = val
                        entry.feed_unit = feed_match.group(5).lower()

                entries.append(entry)

        return entries

    def _cross_reference(self, tools: list[ToolSpecification]) -> tuple[int, int]:
        """Cross-reference tools against existing database.

        Returns (new_tools_count, discrepancy_count).
        """
        new_count = 0
        discrepancy_count = 0

        for tool in tools:
            key = tool.iso_designation or tool.part_number
            if not key:
                continue

            # Normalize key: remove internal spaces for lookup
            normalized = re.sub(r"\s+", "", key)
            # Try both original and normalized forms
            matched_key = None
            if key in self._tool_db:
                matched_key = key
            elif normalized in self._tool_db:
                matched_key = normalized

            if matched_key is not None:
                existing = self._tool_db[matched_key]
                # Check for discrepancies
                if tool.grade and existing.get("grade") and tool.grade != existing["grade"]:
                    discrepancy_count += 1
            else:
                new_count += 1

        return new_count, discrepancy_count

    def _get_context(self, text: str, target: str, window: int = 200) -> str:
        """Get text context around a target string."""
        idx = text.upper().find(target.upper())
        if idx < 0:
            return ""
        start = max(0, idx - window)
        end = min(len(text), idx + len(target) + window)
        return text[start:end]

    def _detect_grade(self, context: str) -> str:
        """Detect tool grade from context text."""
        t = context.lower()
        grades = {
            "carbide": ["carbide", "cemented carbide", "wc"],
            "cermet": ["cermet"],
            "ceramic": ["ceramic", "al2o3", "si3n4", "sialon"],
            "cbn": ["cbn", "cubic boron nitride"],
            "pcd": ["pcd", "polycrystalline diamond"],
            "hss": ["hss", "high speed steel"],
        }
        for grade, keywords in grades.items():
            if any(kw in t for kw in keywords):
                return grade
        return ""

    def _detect_coating(self, context: str) -> str:
        """Detect tool coating from context text."""
        coatings = ["TiAlN", "AlTiN", "TiCN", "TiN", "AlCrN", "CVD", "PVD", "DLC"]
        for coating in coatings:
            if re.search(r"\b" + re.escape(coating) + r"\b", context, re.IGNORECASE):
                return coating
        return ""

    def _detect_geometry(self, context: str) -> dict:
        """Detect tool geometry from context text."""
        geo: dict = {}
        # Nose radius
        nr = re.search(r"(?:nose|corner)\s*(?:radius|r)[:\s=]*(\d+(?:\.\d+)?)\s*mm", context, re.IGNORECASE)
        if nr:
            geo["nose_radius_mm"] = float(nr.group(1))
        # Rake angle
        ra = re.search(r"rake\s*(?:angle)?[:\s=]*(-?\d+(?:\.\d+)?)\s*°?", context, re.IGNORECASE)
        if ra:
            geo["rake_angle_deg"] = float(ra.group(1))
        return geo
