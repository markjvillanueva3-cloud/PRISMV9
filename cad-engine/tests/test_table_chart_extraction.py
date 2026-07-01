"""Tests for Table and Chart Extraction — CC-EXT-MS1-P0-U02.

Tests table detection, cell extraction, header inference, unit detection,
merged cells, chart data extraction, and edge cases.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.table_extractor import (
    UnitCategory,
    TableCell,
    ExtractedTable,
    ChartDataPoint,
    ExtractedChart,
    TableExtractor,
    ChartExtractor,
    detect_unit,
    _parse_numeric,
    _detect_separator_line,
    _infer_headers,
)


# ---------------------------------------------------------------------------
# Unit Detection
# ---------------------------------------------------------------------------

class TestUnitDetection:
    """detect_unit() identifies engineering units in text."""

    def test_speed_mmin(self):
        cat, name = detect_unit("m/min")
        assert cat == UnitCategory.SPEED
        assert name == "m/min"

    def test_speed_sfm(self):
        cat, name = detect_unit("SFM")
        assert cat == UnitCategory.SPEED

    def test_feed_mmrev(self):
        cat, name = detect_unit("mm/rev")
        assert cat == UnitCategory.FEED

    def test_feed_ipt(self):
        cat, name = detect_unit("IPT")
        assert cat == UnitCategory.FEED

    def test_rotation_rpm(self):
        cat, name = detect_unit("RPM")
        assert cat == UnitCategory.ROTATION
        assert name == "rpm"

    def test_hardness_hrc(self):
        cat, name = detect_unit("HRC")
        assert cat == UnitCategory.HARDNESS

    def test_length_mm(self):
        cat, name = detect_unit("mm")
        assert cat == UnitCategory.LENGTH

    def test_length_inch(self):
        cat, name = detect_unit("in")
        assert cat == UnitCategory.LENGTH
        assert name == "inch"

    def test_power_kw(self):
        cat, name = detect_unit("kW")
        assert cat == UnitCategory.POWER

    def test_power_hp(self):
        cat, name = detect_unit("HP")
        assert cat == UnitCategory.POWER
        assert name == "horsepower"

    def test_roughness_ra(self):
        cat, name = detect_unit("Ra")
        assert cat == UnitCategory.ROUGHNESS

    def test_unit_in_parentheses(self):
        cat, name = detect_unit("Speed (m/min)")
        assert cat == UnitCategory.SPEED

    def test_unit_at_end(self):
        cat, name = detect_unit("300 m/min")
        assert cat == UnitCategory.SPEED

    def test_unknown_unit(self):
        result = detect_unit("widgets")
        assert result is None

    def test_empty_string(self):
        result = detect_unit("")
        assert result is None


# ---------------------------------------------------------------------------
# Numeric Parsing
# ---------------------------------------------------------------------------

class TestNumericParsing:
    """_parse_numeric() extracts float values from strings."""

    def test_integer(self):
        assert _parse_numeric("300") == 300.0

    def test_float(self):
        assert _parse_numeric("0.15") == 0.15

    def test_with_commas(self):
        assert _parse_numeric("1,500") == 1500.0

    def test_range_returns_midpoint(self):
        result = _parse_numeric("100-200")
        assert result == 150.0

    def test_range_with_dash(self):
        result = _parse_numeric("50–100")
        assert result == 75.0

    def test_non_numeric(self):
        assert _parse_numeric("aluminum") is None

    def test_empty_string(self):
        assert _parse_numeric("") is None


# ---------------------------------------------------------------------------
# Separator Detection
# ---------------------------------------------------------------------------

class TestSeparatorDetection:
    """_detect_separator_line() identifies table rule lines."""

    def test_dash_line(self):
        assert _detect_separator_line("--------+--------") is True

    def test_equals_line(self):
        assert _detect_separator_line("========+========") is True

    def test_unicode_line(self):
        assert _detect_separator_line("────────┼────────") is True

    def test_normal_text(self):
        assert _detect_separator_line("This is normal text") is False

    def test_empty_line(self):
        assert _detect_separator_line("") is False


# ---------------------------------------------------------------------------
# Header Inference
# ---------------------------------------------------------------------------

class TestHeaderInference:
    """_infer_headers() detects header rows."""

    def test_text_header_numeric_data(self):
        header = ["Material", "Speed", "Feed"]
        rows = [header, ["aluminum", "300", "0.10"], ["steel", "150", "0.08"]]
        assert _infer_headers(header, rows) is True

    def test_all_numeric_no_header(self):
        row1 = ["300", "0.10", "5000"]
        rows = [row1, ["150", "0.08", "3000"]]
        assert _infer_headers(row1, rows) is False

    def test_unit_in_header(self):
        header = ["Material", "Speed (m/min)", "Feed (mm/rev)"]
        rows = [header, ["steel", "150", "0.08"]]
        assert _infer_headers(header, rows) is True

    def test_empty_rows(self):
        assert _infer_headers([], []) is False


# ---------------------------------------------------------------------------
# TableCell
# ---------------------------------------------------------------------------

class TestTableCell:
    """TableCell data class."""

    def test_to_dict_minimal(self):
        cell = TableCell(value="300", row=1, col=2)
        d = cell.to_dict()
        assert d["value"] == "300"
        assert d["row"] == 1
        assert d["col"] == 2
        assert "row_span" not in d
        assert "is_header" not in d

    def test_to_dict_with_spans(self):
        cell = TableCell(value="merged", row=0, col=0, row_span=2, col_span=3, is_header=True)
        d = cell.to_dict()
        assert d["row_span"] == 2
        assert d["col_span"] == 3
        assert d["is_header"] is True

    def test_numeric_and_unit(self):
        cell = TableCell(value="300", row=1, col=1, numeric_value=300.0, unit="m/min")
        d = cell.to_dict()
        assert d["numeric_value"] == 300.0
        assert d["unit"] == "m/min"


# ---------------------------------------------------------------------------
# ExtractedTable
# ---------------------------------------------------------------------------

class TestExtractedTable:
    """ExtractedTable data class and methods."""

    def _make_table(self) -> ExtractedTable:
        return ExtractedTable(
            cells=[
                TableCell("Material", 0, 0, is_header=True),
                TableCell("Speed", 0, 1, is_header=True),
                TableCell("aluminum", 1, 0),
                TableCell("300", 1, 1, numeric_value=300.0),
                TableCell("steel", 2, 0),
                TableCell("150", 2, 1, numeric_value=150.0),
            ],
            headers=["Material", "Speed"],
            column_units=[None, "m/min"],
            row_count=3,
            col_count=2,
            page_number=5,
            caption="Table 1: Cutting speeds",
        )

    def test_get_row(self):
        table = self._make_table()
        row1 = table.get_row(1)
        assert len(row1) == 2
        assert row1[0].value == "aluminum"

    def test_get_column(self):
        table = self._make_table()
        col1 = table.get_column(1)
        assert len(col1) == 2
        assert col1[0].numeric_value == 300.0

    def test_to_dict(self):
        table = self._make_table()
        d = table.to_dict()
        assert d["headers"] == ["Material", "Speed"]
        assert d["row_count"] == 3
        assert d["col_count"] == 2
        assert d["page_number"] == 5
        assert len(d["cells"]) == 6

    def test_to_rows(self):
        table = self._make_table()
        rows = table.to_rows()
        assert len(rows) == 3
        assert rows[0] == ["Material", "Speed"]
        assert rows[1] == ["aluminum", "300"]


# ---------------------------------------------------------------------------
# Table Extraction
# ---------------------------------------------------------------------------

class TestTableExtractor:
    """TableExtractor processes text into structured tables."""

    def test_tab_delimited_table(self):
        text = "Material\tSpeed\tFeed\naluminum\t300\t0.10\nsteel\t150\t0.08\ntitanium\t50\t0.05"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        table = tables[0]
        assert table.col_count >= 3
        assert table.row_count >= 3

    def test_pipe_delimited_table(self):
        text = "| Material | Speed | Feed |\n| aluminum | 300 | 0.10 |\n| steel | 150 | 0.08 |"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        assert tables[0].col_count == 3

    def test_space_delimited_table(self):
        text = "Material     Speed     Feed\naluminum     300       0.10\nsteel        150       0.08"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1

    def test_header_detection(self):
        text = "Material\tSpeed (m/min)\tFeed (mm/rev)\naluminum\t300\t0.10\nsteel\t150\t0.08"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        assert tables[0].headers[0] == "Material"

    def test_unit_detection_in_headers(self):
        text = "Material\tSpeed (m/min)\tFeed (mm/rev)\naluminum\t300\t0.10\nsteel\t150\t0.08"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        units = tables[0].column_units
        assert "m/min" in [u for u in units if u]

    def test_numeric_values_parsed(self):
        text = "Mat\tRPM\tForce\nAl\t5000\t250\nSteel\t3000\t400"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        numeric_cells = [c for c in tables[0].cells if c.numeric_value is not None]
        assert len(numeric_cells) >= 4  # 4 numeric values

    def test_caption_detection(self):
        text = "Table 1: Recommended Cutting Speeds\nMaterial\tSpeed\naluminum\t300\nsteel\t150"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        assert "Cutting Speeds" in tables[0].caption

    def test_no_table_in_prose(self):
        text = "This is a regular paragraph about machining. It discusses various cutting parameters and their effects on surface finish."
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 0

    def test_min_rows_enforced(self):
        text = "Mat\tSpeed\naluminum\t300"
        extractor = TableExtractor(min_rows=3)
        tables = extractor.extract_tables(text)
        assert len(tables) == 0

    def test_multiple_tables(self):
        text = (
            "Material\tSpeed\tFeed\naluminum\t300\t0.10\nsteel\t150\t0.08\n\n"
            "Some prose text between tables.\n\n"
            "Tool\tDiameter\tFlutes\nEndmill\t10\t4\nBall\t8\t2"
        )
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 2

    def test_page_number_preserved(self):
        text = "A\tB\n1\t2\n3\t4"
        extractor = TableExtractor()
        tables = extractor.extract_tables(text, page_number=42)
        assert tables[0].page_number == 42

    def test_merged_cell_detection(self):
        text = "Cat\tA\tB\nGroup1\t10\t20\n\t30\t40"  # Empty first col = merged
        extractor = TableExtractor()
        tables = extractor.extract_tables(text)
        assert len(tables) == 1
        assert tables[0].has_merged_cells is True


# ---------------------------------------------------------------------------
# Chart Extraction
# ---------------------------------------------------------------------------

class TestChartExtractor:
    """ChartExtractor processes text chart references."""

    def test_figure_reference_detected(self):
        text = "Figure 1: Tool life vs Cutting Speed\nData shows 100, 200 and 50, 150 values."
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert len(charts) == 1
        assert "Tool life" in charts[0].title

    def test_chart_type_detection_line(self):
        text = "Figure 2: Surface roughness vs Feed rate curve"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert len(charts) == 1
        assert charts[0].chart_type == "line"

    def test_chart_type_detection_bar(self):
        text = "Figure 3: Bar chart of material removal rates"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert len(charts) == 1
        assert charts[0].chart_type == "bar"

    def test_chart_type_detection_scatter(self):
        text = "Figure 4: Scatter plot showing correlation between hardness and speed"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert charts[0].chart_type == "scatter"

    def test_data_points_extracted(self):
        text = "Figure 5: Speed vs Life\nMeasured values: 100, 500; 200, 350; 300, 200"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert len(charts) == 1
        assert len(charts[0].data_points) == 3
        assert charts[0].data_points[0].x == 100.0
        assert charts[0].data_points[0].y == 500.0

    def test_axis_labels_from_vs_pattern(self):
        text = "Figure 6: Force vs Depth of Cut"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert charts[0].y_axis_label == "Force"
        assert charts[0].x_axis_label == "Depth of Cut"

    def test_no_charts_in_prose(self):
        text = "This paragraph discusses machining parameters without any chart references."
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text)
        assert len(charts) == 0

    def test_chart_to_dict(self):
        chart = ExtractedChart(
            chart_type="line",
            title="Figure 1: Test",
            x_axis_label="Speed",
            y_axis_label="Force",
            data_points=[ChartDataPoint(100, 200)],
            page_number=3,
        )
        d = chart.to_dict()
        assert d["chart_type"] == "line"
        assert d["x_axis"]["label"] == "Speed"
        assert len(d["data_points"]) == 1

    def test_page_number_preserved(self):
        text = "Figure 7: Test chart with data"
        extractor = ChartExtractor()
        charts = extractor.extract_charts(text, page_number=15)
        assert charts[0].page_number == 15


# ---------------------------------------------------------------------------
# Enum completeness
# ---------------------------------------------------------------------------

class TestEnums:
    def test_unit_category_members(self):
        expected = {"length", "speed", "feed", "rotation", "force", "power",
                    "hardness", "roughness", "temperature", "pressure", "unknown"}
        actual = {uc.value for uc in UnitCategory}
        assert expected == actual
