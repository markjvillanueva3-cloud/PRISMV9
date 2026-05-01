"""Tests for Technical Parameter Parsing — CC-EXT-MS1-P0-U03.

Tests cutting parameter extraction, unit normalization, range detection,
material/tool context linking, and tolerance parsing.
"""

from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.extraction.param_parser import (
    ParameterRange,
    MaterialContext,
    ToolContext,
    ToleranceSpec,
    ExtractedParameter,
    ParameterParser,
    parse_range,
    parse_tolerance,
    extract_material_context,
    extract_tool_context,
)


# ---------------------------------------------------------------------------
# Range Parsing
# ---------------------------------------------------------------------------

class TestRangeParsing:
    """parse_range() extracts min/typical/max from text."""

    def test_dash_range(self):
        r = parse_range("100-200")
        assert r.min_value == 100.0
        assert r.max_value == 200.0
        assert r.typical == 150.0

    def test_to_range(self):
        r = parse_range("80 to 120")
        assert r.min_value == 80.0
        assert r.max_value == 120.0

    def test_tilde_range(self):
        r = parse_range("50~100")
        assert r.min_value == 50.0
        assert r.max_value == 100.0

    def test_min_max_range(self):
        r = parse_range("min 80 max 120")
        assert r.min_value == 80.0
        assert r.max_value == 120.0
        assert r.typical == 100.0

    def test_single_value(self):
        r = parse_range("300")
        assert r.typical == 300.0
        assert r.min_value is None
        assert r.max_value is None

    def test_float_value(self):
        r = parse_range("0.15")
        assert r.typical == 0.15

    def test_no_number(self):
        r = parse_range("no numbers here")
        assert r is None


# ---------------------------------------------------------------------------
# Material Context
# ---------------------------------------------------------------------------

class TestMaterialContext:
    """extract_material_context() identifies materials in text."""

    def test_aluminum(self):
        ctx = extract_material_context("Cutting aluminum 6061-T6 at high speed")
        assert ctx.name == "aluminum"

    def test_steel_grade(self):
        ctx = extract_material_context("For 4140 steel, use moderate speeds")
        assert ctx.name == "steel"
        assert ctx.grade == "4140"

    def test_stainless(self):
        ctx = extract_material_context("Machining 304 stainless requires coolant")
        assert ctx.name == "stainless_steel"

    def test_titanium(self):
        ctx = extract_material_context("Titanium Ti-6Al-4V requires low speeds")
        assert ctx.name == "titanium"

    def test_inconel(self):
        ctx = extract_material_context("Inconel 718 is difficult to machine")
        assert ctx.name == "nickel_alloy"

    def test_with_hardness(self):
        ctx = extract_material_context("Steel 4140, 28 HRC hardness")
        assert ctx.hardness == "28 HRC"

    def test_no_material(self):
        ctx = extract_material_context("General machining guidelines")
        assert ctx is None

    def test_to_dict(self):
        ctx = MaterialContext(name="steel", grade="4140", hardness="28 HRC")
        d = ctx.to_dict()
        assert d["name"] == "steel"
        assert d["grade"] == "4140"
        assert d["hardness"] == "28 HRC"


# ---------------------------------------------------------------------------
# Tool Context
# ---------------------------------------------------------------------------

class TestToolContext:
    """extract_tool_context() identifies tools in text."""

    def test_endmill(self):
        ctx = extract_tool_context("Use a 10mm diameter end mill with 4 flutes")
        assert ctx.tool_type == "endmill"
        assert ctx.diameter == 10.0
        assert ctx.flute_count == 4

    def test_drill(self):
        ctx = extract_tool_context("8mm drill for pilot holes")
        assert ctx.tool_type == "drill"

    def test_face_mill(self):
        ctx = extract_tool_context("50mm face mill for surfacing")
        assert ctx.tool_type == "facemill"

    def test_coating_detection(self):
        ctx = extract_tool_context("TiAlN coated end mill")
        assert ctx.coating == "TiAlN"

    def test_no_tool(self):
        ctx = extract_tool_context("Set cutting speed to 300 m/min")
        assert ctx is None

    def test_to_dict(self):
        ctx = ToolContext(tool_type="endmill", diameter=10.0, flute_count=4, coating="TiAlN")
        d = ctx.to_dict()
        assert d["tool_type"] == "endmill"
        assert d["diameter_mm"] == 10.0


# ---------------------------------------------------------------------------
# Tolerance Parsing
# ---------------------------------------------------------------------------

class TestToleranceParsing:
    """parse_tolerance() extracts tolerance specs from text."""

    def test_symmetric_tolerance(self):
        tol = parse_tolerance("10.0 ± 0.05 mm")
        assert tol.nominal == 10.0
        assert tol.plus == 0.05
        assert tol.minus == -0.05

    def test_asymmetric_tolerance(self):
        tol = parse_tolerance("25.0 +0.02/-0.01")
        assert tol.nominal == 25.0
        assert tol.plus == 0.02
        assert tol.minus == -0.01

    def test_fit_class(self):
        tol = parse_tolerance("Bore tolerance H7/g6")
        assert tol.fit_class == "H7/g6"

    def test_surface_finish_ra(self):
        tol = parse_tolerance("Surface finish Ra 0.8 µm")
        assert "Ra" in tol.surface_finish

    def test_no_tolerance(self):
        tol = parse_tolerance("General machining text")
        assert tol is None

    def test_to_dict(self):
        tol = ToleranceSpec(nominal=10.0, plus=0.05, minus=-0.05, raw_text="10.0 ± 0.05")
        d = tol.to_dict()
        assert d["nominal"] == 10.0
        assert d["plus"] == 0.05


# ---------------------------------------------------------------------------
# Parameter Extraction
# ---------------------------------------------------------------------------

class TestParameterParser:
    """ParameterParser extracts cutting parameters from text."""

    def test_cutting_speed_mmin(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Cutting speed: 300 m/min for aluminum")
        speed_params = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speed_params) >= 1
        assert speed_params[0].value.typical == 300.0
        assert speed_params[0].value.si_unit == "m/min"

    def test_cutting_speed_sfm(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Use 800 SFM for brass")
        speed_params = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speed_params) >= 1
        assert speed_params[0].value.source_unit == "sfm"
        # SI conversion: 800 * 0.3048 = 243.84 m/min
        assert abs(speed_params[0].value.si_value - 243.84) < 0.1

    def test_speed_range(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Speed: 100-200 m/min")
        speed_params = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speed_params) >= 1
        assert speed_params[0].value.min_value == 100.0
        assert speed_params[0].value.max_value == 200.0

    def test_feed_mmrev(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Feed rate: 0.15 mm/rev")
        feed_params = [p for p in params if p.param_type == "feed"]
        assert len(feed_params) >= 1
        assert feed_params[0].value.typical == 0.15

    def test_feed_ipr(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Feed: 0.005 IPR for finishing")
        feed_params = [p for p in params if p.param_type == "feed"]
        assert len(feed_params) >= 1
        # SI conversion: 0.005 * 25.4 = 0.127 mm/rev
        assert abs(feed_params[0].value.si_value - 0.127) < 0.01

    def test_rpm_extraction(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Spindle speed: 5000 RPM")
        rpm_params = [p for p in params if p.param_type == "rpm"]
        assert len(rpm_params) >= 1
        assert rpm_params[0].value.typical == 5000.0

    def test_rpm_range(self):
        parser = ParameterParser()
        params = parser.extract_parameters("RPM range: 3000-5000 RPM")
        rpm_params = [p for p in params if p.param_type == "rpm"]
        assert len(rpm_params) >= 1
        assert rpm_params[0].value.min_value == 3000.0
        assert rpm_params[0].value.max_value == 5000.0

    def test_doc_extraction(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Depth of cut: 2.5 mm")
        doc_params = [p for p in params if p.param_type == "doc"]
        assert len(doc_params) >= 1
        assert doc_params[0].value.typical == 2.5

    def test_woc_extraction(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Stepover: 5 mm for roughing")
        woc_params = [p for p in params if p.param_type == "woc"]
        assert len(woc_params) >= 1

    def test_chipload_extraction(self):
        parser = ParameterParser()
        params = parser.extract_parameters("Chip load fz: 0.08 mm")
        cl_params = [p for p in params if p.param_type == "chipload"]
        assert len(cl_params) >= 1
        assert cl_params[0].value.typical == 0.08

    def test_material_context_linked(self):
        parser = ParameterParser()
        params = parser.extract_parameters("For 4140 steel, cutting speed 150 m/min")
        speed_params = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speed_params) >= 1
        assert speed_params[0].material_context is not None
        assert speed_params[0].material_context.name == "steel"

    def test_tool_context_linked(self):
        parser = ParameterParser()
        params = parser.extract_parameters("10mm diameter end mill at 300 m/min with 4 flutes")
        speed_params = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speed_params) >= 1
        assert speed_params[0].tool_context is not None
        assert speed_params[0].tool_context.tool_type == "endmill"

    def test_multiple_parameters(self):
        parser = ParameterParser()
        text = "For aluminum: speed 300 m/min, feed 0.10 mm/rev, 5000 RPM, DOC 2 mm"
        params = parser.extract_parameters(text)
        types = {p.param_type for p in params}
        assert "cutting_speed" in types
        assert "feed" in types
        assert "rpm" in types
        assert "doc" in types

    def test_no_parameters_in_prose(self):
        parser = ParameterParser()
        params = parser.extract_parameters("General machining guidelines for beginners.")
        assert len(params) == 0

    def test_tolerance_extraction(self):
        parser = ParameterParser()
        tolerances = parser.extract_tolerances("Bore 25.0 ± 0.01 mm. Shaft fit H7/g6.")
        assert len(tolerances) >= 1

    def test_parameter_to_dict(self):
        param = ExtractedParameter(
            param_type="cutting_speed",
            value=ParameterRange(typical=300.0, si_value=300.0, si_unit="m/min"),
            material_context=MaterialContext(name="aluminum"),
            confidence=0.8,
            source_text="300 m/min",
        )
        d = param.to_dict()
        assert d["param_type"] == "cutting_speed"
        assert d["material"]["name"] == "aluminum"
        assert d["confidence"] == 0.8


# ---------------------------------------------------------------------------
# Machinery's Handbook Reference Values
# ---------------------------------------------------------------------------

class TestMachineryHandbookValues:
    """Verify extraction against known reference values."""

    def test_aluminum_speed_range(self):
        parser = ParameterParser()
        text = "Aluminum 6061: recommended cutting speed 200-400 m/min with carbide tooling"
        params = parser.extract_parameters(text)
        speeds = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speeds) >= 1
        assert speeds[0].value.min_value == 200.0
        assert speeds[0].value.max_value == 400.0
        assert speeds[0].material_context.name == "aluminum"

    def test_steel_feed_range(self):
        parser = ParameterParser()
        text = "4140 steel turning: feed 0.10-0.30 mm/rev"
        params = parser.extract_parameters(text)
        feeds = [p for p in params if p.param_type == "feed"]
        assert len(feeds) >= 1
        assert feeds[0].value.min_value == 0.10
        assert feeds[0].value.max_value == 0.30

    def test_imperial_conversion(self):
        parser = ParameterParser()
        text = "Stainless 304: 350 SFM recommended"
        params = parser.extract_parameters(text)
        speeds = [p for p in params if p.param_type == "cutting_speed"]
        assert len(speeds) >= 1
        # 350 SFM = 350 * 0.3048 = 106.68 m/min
        si = speeds[0].value.si_value
        assert abs(si - 106.68) < 0.1
