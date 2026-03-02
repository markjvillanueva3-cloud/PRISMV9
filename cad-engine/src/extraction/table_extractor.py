"""Table Extraction Engine — CC-EXT-MS1-P0-U02.

Detects and extracts tables from PDF text content. Handles merged cells,
multi-line cells, headerless tables. Outputs structured data with column
headers and engineering unit detection.

Supports:
  - Tab-delimited tables
  - Space-aligned tables
  - Pipe-delimited tables
  - Tables with separator lines (---+---)
  - Merged cells and multi-line cells
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ---------------------------------------------------------------------------
# Engineering Units
# ---------------------------------------------------------------------------

class UnitCategory(str, Enum):
    LENGTH = "length"
    SPEED = "speed"
    FEED = "feed"
    ROTATION = "rotation"
    FORCE = "force"
    POWER = "power"
    HARDNESS = "hardness"
    ROUGHNESS = "roughness"
    TEMPERATURE = "temperature"
    PRESSURE = "pressure"
    UNKNOWN = "unknown"


# Maps unit strings to (category, unit_name, to_si_factor)
_UNIT_MAP: dict[str, tuple[UnitCategory, str, float]] = {
    # Length
    "mm": (UnitCategory.LENGTH, "millimeter", 1.0),
    "cm": (UnitCategory.LENGTH, "centimeter", 10.0),
    "m": (UnitCategory.LENGTH, "meter", 1000.0),
    "in": (UnitCategory.LENGTH, "inch", 25.4),
    "inch": (UnitCategory.LENGTH, "inch", 25.4),
    "inches": (UnitCategory.LENGTH, "inch", 25.4),
    "ft": (UnitCategory.LENGTH, "foot", 304.8),
    # Speed
    "m/min": (UnitCategory.SPEED, "m/min", 1.0),
    "sfm": (UnitCategory.SPEED, "sfm", 0.3048),
    "ft/min": (UnitCategory.SPEED, "sfm", 0.3048),
    # Feed
    "mm/rev": (UnitCategory.FEED, "mm/rev", 1.0),
    "mm/tooth": (UnitCategory.FEED, "mm/tooth", 1.0),
    "mm/z": (UnitCategory.FEED, "mm/tooth", 1.0),
    "ipr": (UnitCategory.FEED, "ipr", 25.4),
    "ipt": (UnitCategory.FEED, "ipt", 25.4),
    "in/rev": (UnitCategory.FEED, "ipr", 25.4),
    "in/tooth": (UnitCategory.FEED, "ipt", 25.4),
    # Rotation
    "rpm": (UnitCategory.ROTATION, "rpm", 1.0),
    "rev/min": (UnitCategory.ROTATION, "rpm", 1.0),
    # Force
    "n": (UnitCategory.FORCE, "newton", 1.0),
    "kn": (UnitCategory.FORCE, "kilonewton", 1000.0),
    "lbf": (UnitCategory.FORCE, "pound_force", 4.448),
    # Power
    "kw": (UnitCategory.POWER, "kilowatt", 1.0),
    "hp": (UnitCategory.POWER, "horsepower", 0.7457),
    "w": (UnitCategory.POWER, "watt", 0.001),
    # Hardness
    "hrc": (UnitCategory.HARDNESS, "rockwell_c", 1.0),
    "hrb": (UnitCategory.HARDNESS, "rockwell_b", 1.0),
    "hb": (UnitCategory.HARDNESS, "brinell", 1.0),
    "hv": (UnitCategory.HARDNESS, "vickers", 1.0),
    # Roughness
    "ra": (UnitCategory.ROUGHNESS, "ra_um", 1.0),
    "rz": (UnitCategory.ROUGHNESS, "rz_um", 1.0),
    "µm": (UnitCategory.ROUGHNESS, "micrometer", 1.0),
    # Temperature
    "°c": (UnitCategory.TEMPERATURE, "celsius", 1.0),
    "°f": (UnitCategory.TEMPERATURE, "fahrenheit", 1.0),
    # Pressure
    "mpa": (UnitCategory.PRESSURE, "megapascal", 1.0),
    "psi": (UnitCategory.PRESSURE, "psi", 0.006895),
    "bar": (UnitCategory.PRESSURE, "bar", 0.1),
}


def detect_unit(text: str) -> Optional[tuple[UnitCategory, str]]:
    """Detect engineering unit from text string.

    Returns (category, unit_name) or None if no unit detected.
    """
    t = text.strip().lower()
    # Try exact match first
    if t in _UNIT_MAP:
        cat, name, _ = _UNIT_MAP[t]
        return cat, name

    # Try matching unit at end of string (e.g., "300 m/min")
    for unit_str, (cat, name, _) in sorted(
        _UNIT_MAP.items(), key=lambda x: -len(x[0])
    ):
        if t.endswith(unit_str):
            return cat, name

    # Try matching unit in parentheses (e.g., "Speed (m/min)")
    paren_match = re.search(r"\(([^)]+)\)", t)
    if paren_match:
        inner = paren_match.group(1).strip().lower()
        if inner in _UNIT_MAP:
            cat, name, _ = _UNIT_MAP[inner]
            return cat, name

    return None


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class TableCell:
    """A single cell in an extracted table."""
    value: str
    row: int
    col: int
    row_span: int = 1
    col_span: int = 1
    is_header: bool = False
    numeric_value: Optional[float] = None
    unit: Optional[str] = None

    def to_dict(self) -> dict:
        d: dict = {
            "value": self.value,
            "row": self.row,
            "col": self.col,
        }
        if self.row_span > 1:
            d["row_span"] = self.row_span
        if self.col_span > 1:
            d["col_span"] = self.col_span
        if self.is_header:
            d["is_header"] = True
        if self.numeric_value is not None:
            d["numeric_value"] = self.numeric_value
        if self.unit:
            d["unit"] = self.unit
        return d


@dataclass
class ExtractedTable:
    """A table extracted from a PDF page."""
    cells: list[TableCell] = field(default_factory=list)
    headers: list[str] = field(default_factory=list)
    column_units: list[Optional[str]] = field(default_factory=list)
    row_count: int = 0
    col_count: int = 0
    page_number: int = 0
    caption: str = ""
    has_merged_cells: bool = False
    confidence: float = 0.8

    def get_row(self, row_idx: int) -> list[TableCell]:
        """Get all cells in a specific row."""
        return sorted(
            [c for c in self.cells if c.row == row_idx],
            key=lambda c: c.col,
        )

    def get_column(self, col_idx: int) -> list[TableCell]:
        """Get all cells in a specific column (excluding header)."""
        return sorted(
            [c for c in self.cells if c.col == col_idx and not c.is_header],
            key=lambda c: c.row,
        )

    def to_dict(self) -> dict:
        return {
            "headers": self.headers,
            "column_units": self.column_units,
            "row_count": self.row_count,
            "col_count": self.col_count,
            "page_number": self.page_number,
            "caption": self.caption,
            "has_merged_cells": self.has_merged_cells,
            "confidence": round(self.confidence, 4),
            "cells": [c.to_dict() for c in self.cells],
        }

    def to_rows(self) -> list[list[str]]:
        """Convert to a list of row lists (values only)."""
        rows: list[list[str]] = []
        for r in range(self.row_count):
            row_cells = self.get_row(r)
            rows.append([c.value for c in row_cells])
        return rows


# ---------------------------------------------------------------------------
# Chart data
# ---------------------------------------------------------------------------

@dataclass
class ChartDataPoint:
    """A single data point from a chart."""
    x: float
    y: float
    series: str = ""
    label: str = ""

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "series": self.series, "label": self.label}


@dataclass
class ExtractedChart:
    """Data extracted from a chart/graph."""
    chart_type: str = "unknown"  # "bar", "line", "scatter"
    title: str = ""
    x_axis_label: str = ""
    y_axis_label: str = ""
    x_unit: str = ""
    y_unit: str = ""
    data_points: list[ChartDataPoint] = field(default_factory=list)
    page_number: int = 0
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "chart_type": self.chart_type,
            "title": self.title,
            "x_axis": {"label": self.x_axis_label, "unit": self.x_unit},
            "y_axis": {"label": self.y_axis_label, "unit": self.y_unit},
            "data_points": [dp.to_dict() for dp in self.data_points],
            "page_number": self.page_number,
            "confidence": round(self.confidence, 4),
        }


# ---------------------------------------------------------------------------
# Table extraction engine
# ---------------------------------------------------------------------------

def _parse_numeric(value: str) -> Optional[float]:
    """Try to parse a numeric value from a cell string."""
    cleaned = re.sub(r"[,\s]", "", value.strip())
    # Handle ranges — take midpoint
    range_match = re.match(r"(-?\d+\.?\d*)\s*[-–—]\s*(-?\d+\.?\d*)", cleaned)
    if range_match:
        lo, hi = float(range_match.group(1)), float(range_match.group(2))
        return (lo + hi) / 2.0

    try:
        return float(cleaned)
    except ValueError:
        return None


def _detect_separator_line(line: str) -> bool:
    """Check if a line is a table separator (e.g., ---+--- or ===+===)."""
    stripped = line.strip()
    if not stripped:
        return False
    sep_chars = sum(1 for c in stripped if c in "-─═=+┼|│")
    return sep_chars > len(stripped) * 0.6 and len(stripped) >= 3


def _detect_delimiter(lines: list[str]) -> str:
    """Detect the most likely delimiter: tab, pipe, or multi-space."""
    tab_count = sum(line.count("\t") for line in lines)
    pipe_count = sum(line.count("|") for line in lines)
    # Count lines with 2+ consecutive spaces (not at start)
    space_count = sum(1 for line in lines if re.search(r"\S\s{2,}\S", line))

    if tab_count >= len(lines):
        return "\t"
    if pipe_count >= len(lines):
        return "|"
    if space_count >= len(lines) * 0.5:
        return "  "  # Multi-space
    return "\t"  # Default to tab


def _split_by_delimiter(line: str, delimiter: str) -> list[str]:
    """Split a line by the detected delimiter."""
    if delimiter == "|":
        parts = line.split("|")
        # Remove empty outer parts from leading/trailing pipes
        if parts and not parts[0].strip():
            parts = parts[1:]
        if parts and not parts[-1].strip():
            parts = parts[:-1]
        return [p.strip() for p in parts]
    elif delimiter == "  ":
        return [p.strip() for p in re.split(r"\s{2,}", line.strip()) if p.strip()]
    else:
        return [p.strip() for p in line.split(delimiter)]


def _infer_headers(first_row: list[str], all_rows: list[list[str]]) -> bool:
    """Determine if the first row is a header row.

    Header heuristics:
    - First row is all text, subsequent rows have numbers
    - First row has different formatting (all caps, bold markers)
    """
    if not first_row or not all_rows:
        return False

    # Check if first row is mostly non-numeric and data rows are mostly numeric
    first_numeric = sum(1 for v in first_row if _parse_numeric(v) is not None)
    if len(all_rows) > 1:
        data_row = all_rows[1]
        data_numeric = sum(1 for v in data_row if _parse_numeric(v) is not None)
        if first_numeric == 0 and data_numeric > 0:
            return True

    # Check for unit indicators in first row
    for val in first_row:
        if detect_unit(val) is not None:
            return True

    # Check if first row values look like labels (contain letters)
    label_count = sum(1 for v in first_row if re.search(r"[a-zA-Z]", v))
    if label_count >= len(first_row) * 0.5:
        return True

    return False


class TableExtractor:
    """Extracts structured tables from text content.

    Detects table boundaries, splits cells, infers headers,
    and detects engineering units in column headers.
    """

    def __init__(self, min_columns: int = 2, min_rows: int = 2):
        self._min_columns = min_columns
        self._min_rows = min_rows

    def extract_tables(self, text: str, page_number: int = 0) -> list[ExtractedTable]:
        """Extract all tables from a text block.

        Args:
            text: Raw text content (from a PDF page or section).
            page_number: Source page number for provenance.

        Returns:
            List of ExtractedTable objects.
        """
        tables: list[ExtractedTable] = []
        table_blocks = self._find_table_blocks(text)

        for caption, block_lines in table_blocks:
            table = self._parse_table_block(block_lines, page_number, caption)
            if table and table.row_count >= self._min_rows and table.col_count >= self._min_columns:
                tables.append(table)

        return tables

    def _find_table_blocks(self, text: str) -> list[tuple[str, list[str]]]:
        """Find contiguous blocks of text that look like tables.

        Returns list of (caption, lines) tuples.
        """
        lines = text.split("\n")
        blocks: list[tuple[str, list[str]]] = []
        current_block: list[str] = []
        caption = ""
        in_table = False

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Check for table caption
            cap_match = re.match(r"Table\s+\d+[.:]\s*(.+)", stripped, re.IGNORECASE)
            if cap_match:
                caption = cap_match.group(0)
                continue

            # Skip separator lines but keep as indicator
            if _detect_separator_line(stripped):
                if current_block:
                    in_table = True
                continue

            # Check if line looks tabular
            if self._is_tabular_line(stripped):
                current_block.append(stripped)
                in_table = True
            elif in_table and stripped:
                # Non-tabular line after table — might be multi-line cell
                if current_block and len(stripped) < 60:
                    current_block.append(stripped)
                else:
                    if len(current_block) >= self._min_rows:
                        blocks.append((caption, current_block))
                    current_block = []
                    caption = ""
                    in_table = False
            elif not stripped and in_table:
                if len(current_block) >= self._min_rows:
                    blocks.append((caption, current_block))
                current_block = []
                caption = ""
                in_table = False

        if current_block and len(current_block) >= self._min_rows:
            blocks.append((caption, current_block))

        return blocks

    def _is_tabular_line(self, line: str) -> bool:
        """Check if a line appears to be part of a table."""
        if not line.strip():
            return False
        # Has tabs
        if "\t" in line:
            return True
        # Has pipes
        if "|" in line and line.count("|") >= 2:
            return True
        # Has multi-space separators (at least 2 columns)
        parts = re.split(r"\s{2,}", line.strip())
        if len(parts) >= self._min_columns:
            return True
        return False

    def _parse_table_block(self, lines: list[str], page_number: int,
                           caption: str) -> Optional[ExtractedTable]:
        """Parse a block of tabular lines into an ExtractedTable."""
        if not lines:
            return None

        delimiter = _detect_delimiter(lines)
        rows: list[list[str]] = []
        for line in lines:
            parts = _split_by_delimiter(line, delimiter)
            if parts:
                rows.append(parts)

        if not rows:
            return None

        # Normalize column count (pad short rows)
        max_cols = max(len(r) for r in rows)
        for row in rows:
            while len(row) < max_cols:
                row.append("")

        # Detect headers
        has_header = _infer_headers(rows[0], rows)
        headers: list[str] = []
        data_start = 0

        if has_header:
            headers = rows[0]
            data_start = 1

        # Detect units in headers
        column_units: list[Optional[str]] = []
        for h in headers:
            unit_info = detect_unit(h)
            column_units.append(unit_info[1] if unit_info else None)

        # Build cells
        cells: list[TableCell] = []
        has_merged = False

        # Header cells
        for col_idx, h in enumerate(headers):
            cells.append(TableCell(
                value=h, row=0, col=col_idx, is_header=True,
            ))

        # Data cells
        for row_idx, row in enumerate(rows[data_start:], start=data_start):
            for col_idx, val in enumerate(row):
                numeric = _parse_numeric(val)
                unit = column_units[col_idx] if col_idx < len(column_units) else None
                cells.append(TableCell(
                    value=val,
                    row=row_idx,
                    col=col_idx,
                    numeric_value=numeric,
                    unit=unit,
                ))

                # Check for merged cells (empty followed by content)
                if val == "" and col_idx > 0:
                    has_merged = True

        return ExtractedTable(
            cells=cells,
            headers=headers,
            column_units=column_units,
            row_count=len(rows),
            col_count=max_cols,
            page_number=page_number,
            caption=caption,
            has_merged_cells=has_merged,
            confidence=0.85 if has_header else 0.70,
        )


# ---------------------------------------------------------------------------
# Chart extraction (text-based heuristics)
# ---------------------------------------------------------------------------

class ChartExtractor:
    """Extracts chart/graph data from text descriptions.

    Looks for chart captions and associated data in text. For actual
    image-based chart extraction, integrates with vision pipeline.
    """

    def extract_charts(self, text: str, page_number: int = 0) -> list[ExtractedChart]:
        """Extract chart data from text references.

        Finds chart/figure references and attempts to extract
        any associated data points from nearby text.
        """
        charts: list[ExtractedChart] = []

        # Find chart/figure references
        chart_matches = re.finditer(
            r"(?:Figure|Fig\.?|Chart|Graph|Diagram)\s+(\d+)[.:]\s*(.+?)(?:\n|$)",
            text, re.IGNORECASE,
        )

        for match in chart_matches:
            chart_num = match.group(1)
            title = match.group(2).strip()

            # Detect chart type from title
            chart_type = self._detect_chart_type(title)

            # Extract axis info from title
            x_label, y_label, x_unit, y_unit = self._extract_axis_info(title)

            # Look for data points after the chart reference
            context = text[match.end():match.end() + 500]
            data_points = self._extract_data_points(context)

            charts.append(ExtractedChart(
                chart_type=chart_type,
                title=f"Figure {chart_num}: {title}",
                x_axis_label=x_label,
                y_axis_label=y_label,
                x_unit=x_unit,
                y_unit=y_unit,
                data_points=data_points,
                page_number=page_number,
                confidence=0.6 if data_points else 0.3,
            ))

        return charts

    def _detect_chart_type(self, title: str) -> str:
        """Detect chart type from title keywords."""
        t = title.lower()
        if any(kw in t for kw in ["bar chart", "histogram", "bar graph"]):
            return "bar"
        if any(kw in t for kw in ["scatter", "correlation"]):
            return "scatter"
        if any(kw in t for kw in ["line", "curve", "trend", "vs", "versus"]):
            return "line"
        return "unknown"

    def _extract_axis_info(self, title: str) -> tuple[str, str, str, str]:
        """Extract axis labels and units from chart title.

        Returns (x_label, y_label, x_unit, y_unit).
        """
        # "Y vs X" pattern
        vs_match = re.search(r"(.+?)\s+(?:vs\.?|versus)\s+(.+)", title, re.IGNORECASE)
        if vs_match:
            y_label = vs_match.group(1).strip()
            x_label = vs_match.group(2).strip()
        else:
            x_label = ""
            y_label = title

        # Extract units from labels
        x_unit_info = detect_unit(x_label)
        y_unit_info = detect_unit(y_label)

        return (
            x_label,
            y_label,
            x_unit_info[1] if x_unit_info else "",
            y_unit_info[1] if y_unit_info else "",
        )

    def _extract_data_points(self, context: str) -> list[ChartDataPoint]:
        """Extract numeric data points from text near a chart reference."""
        points: list[ChartDataPoint] = []

        # Look for x, y pairs in text
        pair_matches = re.findall(
            r"(\d+(?:\.\d+)?)\s*[,;]\s*(\d+(?:\.\d+)?)",
            context,
        )
        for x_str, y_str in pair_matches[:20]:  # Cap at 20 points
            points.append(ChartDataPoint(
                x=float(x_str),
                y=float(y_str),
            ))

        return points
