"""Technical Parameter Parsing — CC-EXT-MS1-P0-U03.

Extracts cutting parameters from text: speed, feed, DOC, WOC, RPM, chipload.
Handles unit normalization (SI + imperial), range detection, material-conditional
and tool-conditional parameter linking, and tolerance parsing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Unit conversion factors (to SI base)
# ---------------------------------------------------------------------------

_SPEED_TO_MMIN: dict[str, float] = {
    "m/min": 1.0,
    "sfm": 0.3048,
    "ft/min": 0.3048,
}

_FEED_TO_MMREV: dict[str, float] = {
    "mm/rev": 1.0,
    "mm/tooth": 1.0,  # feed per tooth, not per rev
    "mm/z": 1.0,
    "ipr": 25.4,
    "ipt": 25.4,
    "in/rev": 25.4,
    "in/tooth": 25.4,
}

_LENGTH_TO_MM: dict[str, float] = {
    "mm": 1.0,
    "cm": 10.0,
    "m": 1000.0,
    "in": 25.4,
    "inch": 25.4,
    "inches": 25.4,
}


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ParameterRange:
    """A parameter value with optional range."""
    min_value: Optional[float] = None
    typical: Optional[float] = None
    max_value: Optional[float] = None
    raw_text: str = ""
    source_unit: str = ""
    si_value: Optional[float] = None
    si_unit: str = ""
    imperial_value: Optional[float] = None
    imperial_unit: str = ""

    def to_dict(self) -> dict:
        d: dict = {}
        if self.min_value is not None:
            d["min"] = round(self.min_value, 4)
        if self.typical is not None:
            d["typical"] = round(self.typical, 4)
        if self.max_value is not None:
            d["max"] = round(self.max_value, 4)
        d["raw_text"] = self.raw_text
        d["source_unit"] = self.source_unit
        if self.si_value is not None:
            d["si"] = {"value": round(self.si_value, 4), "unit": self.si_unit}
        if self.imperial_value is not None:
            d["imperial"] = {"value": round(self.imperial_value, 4), "unit": self.imperial_unit}
        return d


@dataclass
class MaterialContext:
    """Material context for a parameter."""
    name: str = ""
    grade: str = ""
    hardness: str = ""
    condition: str = ""

    def to_dict(self) -> dict:
        d: dict = {}
        if self.name:
            d["name"] = self.name
        if self.grade:
            d["grade"] = self.grade
        if self.hardness:
            d["hardness"] = self.hardness
        if self.condition:
            d["condition"] = self.condition
        return d


@dataclass
class ToolContext:
    """Tool context for a parameter."""
    tool_type: str = ""
    diameter: Optional[float] = None
    flute_count: Optional[int] = None
    coating: str = ""
    grade: str = ""

    def to_dict(self) -> dict:
        d: dict = {}
        if self.tool_type:
            d["tool_type"] = self.tool_type
        if self.diameter is not None:
            d["diameter_mm"] = self.diameter
        if self.flute_count is not None:
            d["flute_count"] = self.flute_count
        if self.coating:
            d["coating"] = self.coating
        if self.grade:
            d["grade"] = self.grade
        return d


@dataclass
class ToleranceSpec:
    """Tolerance specification extracted from text."""
    nominal: Optional[float] = None
    plus: Optional[float] = None
    minus: Optional[float] = None
    fit_class: str = ""  # e.g., "H7", "g6"
    surface_finish: str = ""  # e.g., "Ra 0.8"
    gdt_symbol: str = ""  # GD&T symbol if present
    raw_text: str = ""

    def to_dict(self) -> dict:
        d: dict = {"raw_text": self.raw_text}
        if self.nominal is not None:
            d["nominal"] = self.nominal
        if self.plus is not None:
            d["plus"] = self.plus
        if self.minus is not None:
            d["minus"] = self.minus
        if self.fit_class:
            d["fit_class"] = self.fit_class
        if self.surface_finish:
            d["surface_finish"] = self.surface_finish
        if self.gdt_symbol:
            d["gdt_symbol"] = self.gdt_symbol
        return d


@dataclass
class ExtractedParameter:
    """A single extracted technical parameter with context."""
    param_type: str  # "cutting_speed", "feed", "doc", "woc", "rpm", "chipload"
    value: ParameterRange
    material_context: Optional[MaterialContext] = None
    tool_context: Optional[ToolContext] = None
    tolerance: Optional[ToleranceSpec] = None
    confidence: float = 0.5
    source_text: str = ""

    def to_dict(self) -> dict:
        d: dict = {
            "param_type": self.param_type,
            "value": self.value.to_dict(),
            "confidence": round(self.confidence, 4),
            "source_text": self.source_text[:200],
        }
        if self.material_context:
            d["material"] = self.material_context.to_dict()
        if self.tool_context:
            d["tool"] = self.tool_context.to_dict()
        if self.tolerance:
            d["tolerance"] = self.tolerance.to_dict()
        return d


# ---------------------------------------------------------------------------
# Range parsing
# ---------------------------------------------------------------------------

def parse_range(text: str) -> Optional[ParameterRange]:
    """Parse a range from text like '100-200', '100 to 200', 'min 80 max 120'.

    Returns ParameterRange with min/typical/max populated.
    """
    t = text.strip()

    # Pattern: "min X max Y"
    minmax = re.search(
        r"min\s+(\d+(?:\.\d+)?)\s+max\s+(\d+(?:\.\d+)?)", t, re.IGNORECASE
    )
    if minmax:
        lo, hi = float(minmax.group(1)), float(minmax.group(2))
        return ParameterRange(
            min_value=lo, typical=(lo + hi) / 2, max_value=hi, raw_text=t
        )

    # Pattern: "X to Y" or "X-Y" or "X~Y" or "X–Y"
    range_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])\s*(\d+(?:\.\d+)?)", t, re.IGNORECASE
    )
    if range_match:
        lo, hi = float(range_match.group(1)), float(range_match.group(2))
        return ParameterRange(
            min_value=lo, typical=(lo + hi) / 2, max_value=hi, raw_text=t
        )

    # Single value
    single = re.search(r"(\d+(?:\.\d+)?)", t)
    if single:
        val = float(single.group(1))
        return ParameterRange(typical=val, raw_text=t)

    return None


def _normalize_speed(value: float, source_unit: str) -> tuple[float, float]:
    """Normalize speed to (m/min, SFM)."""
    factor = _SPEED_TO_MMIN.get(source_unit.lower(), 1.0)
    si_value = value * factor
    imperial_value = si_value / 0.3048
    return si_value, imperial_value


def _normalize_feed(value: float, source_unit: str) -> tuple[float, float]:
    """Normalize feed to (mm/rev or mm/tooth, in/rev or in/tooth)."""
    factor = _FEED_TO_MMREV.get(source_unit.lower(), 1.0)
    si_value = value * factor
    imperial_value = si_value / 25.4
    return si_value, imperial_value


def _normalize_length(value: float, source_unit: str) -> tuple[float, float]:
    """Normalize length to (mm, inches)."""
    factor = _LENGTH_TO_MM.get(source_unit.lower(), 1.0)
    si_value = value * factor
    imperial_value = si_value / 25.4
    return si_value, imperial_value


# ---------------------------------------------------------------------------
# Material extraction
# ---------------------------------------------------------------------------

_MATERIAL_PATTERNS: list[tuple[str, str]] = [
    # Grade numbers first — more specific matches before generic names
    (r"\b(4140|1018|1045|4340|8620)\b", "steel"),
    (r"\b(d2|a2|o1|m2|h13)\b", "tool_steel"),
    (r"\b(6061|7075|2024|5052)\b", "aluminum"),
    (r"\b(304|316|17-4|15-5)\b", "stainless_steel"),
    (r"\b(inconel|718|625)\b", "nickel_alloy"),
    (r"\b(titanium|ti-6al-4v|ti64)\b", "titanium"),
    (r"\b(aluminum|aluminium)\b", "aluminum"),
    (r"\b(stainless)\b", "stainless_steel"),
    (r"\b(steel)\b", "steel"),
    (r"\b(cast iron|grey iron|ductile iron)\b", "cast_iron"),
    (r"\b(brass|bronze|copper)\b", "copper_alloy"),
    (r"\b(plastic|delrin|nylon|peek|acetal|ptfe)\b", "plastic"),
]

_HARDNESS_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(HRC|HRB|HB|HV|Rockwell\s*C)", re.IGNORECASE
)


def extract_material_context(text: str) -> Optional[MaterialContext]:
    """Extract material context from text."""
    t = text.lower()
    for pattern, name in _MATERIAL_PATTERNS:
        match = re.search(pattern, t, re.IGNORECASE)
        if match:
            grade = match.group(1)
            hardness_match = _HARDNESS_PATTERN.search(text)
            hardness = hardness_match.group(0) if hardness_match else ""
            return MaterialContext(
                name=name, grade=grade, hardness=hardness
            )
    return None


# ---------------------------------------------------------------------------
# Tool extraction
# ---------------------------------------------------------------------------

_TOOL_TYPE_PATTERNS: list[tuple[str, str]] = [
    (r"end\s*mill", "endmill"),
    (r"ball\s*(?:nose|end)", "ball_endmill"),
    (r"face\s*mill", "facemill"),
    (r"drill", "drill"),
    (r"tap", "tap"),
    (r"reamer", "reamer"),
    (r"insert", "insert"),
    (r"boring\s*bar", "boring_bar"),
    (r"turning\s*tool", "turning_tool"),
]

_COATING_PATTERNS = [
    "TiAlN", "TiCN", "AlTiN", "TiN", "AlCrN",
    "CVD", "PVD", "DLC", "diamond", "uncoated",
]

_DIAMETER_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:mm|in)?\s*(?:diameter|dia\.?|[øⓓ])", re.IGNORECASE
)

_FLUTE_PATTERN = re.compile(
    r"(\d+)\s*(?:flute|fl\.?)", re.IGNORECASE
)


def extract_tool_context(text: str) -> Optional[ToolContext]:
    """Extract tool context from text."""
    t = text.lower()
    tool_type = ""
    for pattern, ttype in _TOOL_TYPE_PATTERNS:
        if re.search(pattern, t):
            tool_type = ttype
            break

    if not tool_type:
        return None

    diameter = None
    dia_match = _DIAMETER_PATTERN.search(text)
    if dia_match:
        diameter = float(dia_match.group(1))

    flute_count = None
    flute_match = _FLUTE_PATTERN.search(text)
    if flute_match:
        flute_count = int(flute_match.group(1))

    coating = ""
    for coat in _COATING_PATTERNS:
        if coat.lower() in t:
            coating = coat
            break

    return ToolContext(
        tool_type=tool_type,
        diameter=diameter,
        flute_count=flute_count,
        coating=coating,
    )


# ---------------------------------------------------------------------------
# Tolerance parsing
# ---------------------------------------------------------------------------

_PLUS_MINUS_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*[±]\s*(\d+(?:\.\d+)?)", re.IGNORECASE
)

_ASYM_TOL_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)\s*/?\s*-\s*(\d+(?:\.\d+)?)"
)

_FIT_PATTERN = re.compile(r"\b([A-Z]\d+)\s*/\s*([a-z]\d+)\b")

_SINGLE_FIT_PATTERN = re.compile(r"\b([A-Za-z]\d{1,2})\b")

_SURFACE_FINISH_PATTERN = re.compile(
    r"(Ra|Rz|Rmax)\s*(\d+(?:\.\d+)?)\s*(µm|um|μm)?", re.IGNORECASE
)


def parse_tolerance(text: str) -> Optional[ToleranceSpec]:
    """Extract tolerance specification from text."""
    # Symmetric tolerance: 10.0 ± 0.05
    pm = _PLUS_MINUS_PATTERN.search(text)
    if pm:
        nominal = float(pm.group(1))
        tol = float(pm.group(2))
        return ToleranceSpec(
            nominal=nominal, plus=tol, minus=-tol, raw_text=pm.group(0)
        )

    # Asymmetric: 10.0 +0.02/-0.01
    asym = _ASYM_TOL_PATTERN.search(text)
    if asym:
        nominal = float(asym.group(1))
        plus = float(asym.group(2))
        minus = -float(asym.group(3))
        return ToleranceSpec(
            nominal=nominal, plus=plus, minus=minus, raw_text=asym.group(0)
        )

    # Fit class: H7/g6
    fit = _FIT_PATTERN.search(text)
    if fit:
        return ToleranceSpec(
            fit_class=fit.group(0), raw_text=fit.group(0)
        )

    # Surface finish: Ra 0.8
    sf = _SURFACE_FINISH_PATTERN.search(text)
    if sf:
        return ToleranceSpec(
            surface_finish=sf.group(0).strip(), raw_text=sf.group(0)
        )

    return None


# ---------------------------------------------------------------------------
# Parameter extraction engine
# ---------------------------------------------------------------------------

# Regex patterns for parameter extraction
_SPEED_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])\s*(\d+(?:\.\d+)?)\s*(m/min|sfm|ft/min)"
    r"|(\d+(?:\.\d+)?)\s*(m/min|sfm|ft/min)",
    re.IGNORECASE,
)

_FEED_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])\s*(\d+(?:\.\d+)?)\s*(mm/rev|mm/tooth|mm/z|ipr|ipt|in/rev|in/tooth)"
    r"|(\d+(?:\.\d+)?)\s*(mm/rev|mm/tooth|mm/z|ipr|ipt|in/rev|in/tooth)",
    re.IGNORECASE,
)

_RPM_PATTERN = re.compile(
    r"(\d{3,6})\s*(?:to|[-–—~])\s*(\d{3,6})\s*(?:rpm|rev/min)"
    r"|(\d{3,6})\s*(?:rpm|rev/min)",
    re.IGNORECASE,
)

_DOC_PATTERN = re.compile(
    r"(?:depth\s+of\s+cut|DOC|ap|axial\s+depth)\s*[:=]?\s*"
    r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])?\s*(\d+(?:\.\d+)?)?\s*(mm|in)?",
    re.IGNORECASE,
)

_WOC_PATTERN = re.compile(
    r"(?:width\s+of\s+cut|WOC|ae|radial\s+depth|stepover)\s*[:=]?\s*"
    r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])?\s*(\d+(?:\.\d+)?)?\s*(mm|in|%)?",
    re.IGNORECASE,
)

_CHIPLOAD_PATTERN = re.compile(
    r"(?:chip\s*load|fz|feed\s+per\s+tooth)\s*[:=]?\s*"
    r"(\d+(?:\.\d+)?)\s*(?:to|[-–—~])?\s*(\d+(?:\.\d+)?)?\s*(mm|in)?",
    re.IGNORECASE,
)


class ParameterParser:
    """Extracts cutting parameters from text with context.

    Parses speeds, feeds, DOC, WOC, RPM, chipload values and links
    them to material and tool context when available.
    """

    def extract_parameters(self, text: str) -> list[ExtractedParameter]:
        """Extract all cutting parameters from text."""
        params: list[ExtractedParameter] = []

        # Extract context for the whole text block
        material_ctx = extract_material_context(text)
        tool_ctx = extract_tool_context(text)

        # Extract each parameter type
        params.extend(self._extract_speeds(text, material_ctx, tool_ctx))
        params.extend(self._extract_feeds(text, material_ctx, tool_ctx))
        params.extend(self._extract_rpm(text, material_ctx, tool_ctx))
        params.extend(self._extract_doc(text, material_ctx, tool_ctx))
        params.extend(self._extract_woc(text, material_ctx, tool_ctx))
        params.extend(self._extract_chipload(text, material_ctx, tool_ctx))

        return params

    def extract_tolerances(self, text: str) -> list[ToleranceSpec]:
        """Extract all tolerances from text."""
        tolerances: list[ToleranceSpec] = []
        # Split into sentences for context
        sentences = re.split(r"[.;]\s+", text)
        for sent in sentences:
            tol = parse_tolerance(sent)
            if tol:
                tolerances.append(tol)
        return tolerances

    def _extract_speeds(self, text: str, mat: Optional[MaterialContext],
                        tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _SPEED_PATTERN.finditer(text):
            if m.group(1) and m.group(2):
                lo, hi = float(m.group(1)), float(m.group(2))
                unit = m.group(3).lower()
                si_lo, imp_lo = _normalize_speed(lo, unit)
                si_hi, imp_hi = _normalize_speed(hi, unit)
                value = ParameterRange(
                    min_value=lo, typical=(lo + hi) / 2, max_value=hi,
                    raw_text=m.group(0), source_unit=unit,
                    si_value=(si_lo + si_hi) / 2, si_unit="m/min",
                    imperial_value=(imp_lo + imp_hi) / 2, imperial_unit="SFM",
                )
            else:
                val = float(m.group(4))
                unit = m.group(5).lower()
                si_val, imp_val = _normalize_speed(val, unit)
                value = ParameterRange(
                    typical=val, raw_text=m.group(0), source_unit=unit,
                    si_value=si_val, si_unit="m/min",
                    imperial_value=imp_val, imperial_unit="SFM",
                )
            params.append(ExtractedParameter(
                param_type="cutting_speed",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.8 if mat else 0.6,
                source_text=m.group(0),
            ))
        return params

    def _extract_feeds(self, text: str, mat: Optional[MaterialContext],
                       tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _FEED_PATTERN.finditer(text):
            if m.group(1) and m.group(2):
                lo, hi = float(m.group(1)), float(m.group(2))
                unit = m.group(3).lower()
                si_lo, imp_lo = _normalize_feed(lo, unit)
                si_hi, imp_hi = _normalize_feed(hi, unit)
                value = ParameterRange(
                    min_value=lo, typical=(lo + hi) / 2, max_value=hi,
                    raw_text=m.group(0), source_unit=unit,
                    si_value=(si_lo + si_hi) / 2, si_unit=unit if "mm" in unit else "mm/rev",
                    imperial_value=(imp_lo + imp_hi) / 2, imperial_unit="IPR" if "rev" in unit else "IPT",
                )
            else:
                val = float(m.group(4))
                unit = m.group(5).lower()
                si_val, imp_val = _normalize_feed(val, unit)
                value = ParameterRange(
                    typical=val, raw_text=m.group(0), source_unit=unit,
                    si_value=si_val, si_unit=unit if "mm" in unit else "mm/rev",
                    imperial_value=imp_val, imperial_unit="IPR" if "rev" in unit else "IPT",
                )
            params.append(ExtractedParameter(
                param_type="feed",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.8 if mat else 0.6,
                source_text=m.group(0),
            ))
        return params

    def _extract_rpm(self, text: str, mat: Optional[MaterialContext],
                     tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _RPM_PATTERN.finditer(text):
            if m.group(1) and m.group(2):
                lo, hi = float(m.group(1)), float(m.group(2))
                value = ParameterRange(
                    min_value=lo, typical=(lo + hi) / 2, max_value=hi,
                    raw_text=m.group(0), source_unit="rpm",
                    si_value=(lo + hi) / 2, si_unit="rpm",
                )
            else:
                val = float(m.group(3))
                value = ParameterRange(
                    typical=val, raw_text=m.group(0), source_unit="rpm",
                    si_value=val, si_unit="rpm",
                )
            params.append(ExtractedParameter(
                param_type="rpm",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.7,
                source_text=m.group(0),
            ))
        return params

    def _extract_doc(self, text: str, mat: Optional[MaterialContext],
                     tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _DOC_PATTERN.finditer(text):
            val1 = float(m.group(1))
            val2 = float(m.group(2)) if m.group(2) else None
            unit = (m.group(3) or "mm").lower()
            si_val1, imp_val1 = _normalize_length(val1, unit)
            if val2:
                si_val2, imp_val2 = _normalize_length(val2, unit)
                value = ParameterRange(
                    min_value=val1, typical=(val1 + val2) / 2, max_value=val2,
                    raw_text=m.group(0), source_unit=unit,
                    si_value=(si_val1 + si_val2) / 2, si_unit="mm",
                    imperial_value=(imp_val1 + imp_val2) / 2, imperial_unit="in",
                )
            else:
                value = ParameterRange(
                    typical=val1, raw_text=m.group(0), source_unit=unit,
                    si_value=si_val1, si_unit="mm",
                    imperial_value=imp_val1, imperial_unit="in",
                )
            params.append(ExtractedParameter(
                param_type="doc",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.7,
                source_text=m.group(0),
            ))
        return params

    def _extract_woc(self, text: str, mat: Optional[MaterialContext],
                     tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _WOC_PATTERN.finditer(text):
            val1 = float(m.group(1))
            val2 = float(m.group(2)) if m.group(2) else None
            unit = (m.group(3) or "mm").lower()

            if unit == "%":
                value = ParameterRange(
                    typical=val1, raw_text=m.group(0), source_unit="%",
                )
            else:
                si_val1, imp_val1 = _normalize_length(val1, unit)
                value = ParameterRange(
                    typical=val1, raw_text=m.group(0), source_unit=unit,
                    si_value=si_val1, si_unit="mm",
                    imperial_value=imp_val1, imperial_unit="in",
                )
            params.append(ExtractedParameter(
                param_type="woc",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.7,
                source_text=m.group(0),
            ))
        return params

    def _extract_chipload(self, text: str, mat: Optional[MaterialContext],
                          tool: Optional[ToolContext]) -> list[ExtractedParameter]:
        params: list[ExtractedParameter] = []
        for m in _CHIPLOAD_PATTERN.finditer(text):
            val1 = float(m.group(1))
            val2 = float(m.group(2)) if m.group(2) else None
            unit = (m.group(3) or "mm").lower()

            if val2:
                value = ParameterRange(
                    min_value=val1, typical=(val1 + val2) / 2, max_value=val2,
                    raw_text=m.group(0), source_unit=unit,
                )
            else:
                value = ParameterRange(
                    typical=val1, raw_text=m.group(0), source_unit=unit,
                )
            params.append(ExtractedParameter(
                param_type="chipload",
                value=value,
                material_context=mat,
                tool_context=tool,
                confidence=0.7,
                source_text=m.group(0),
            ))
        return params
