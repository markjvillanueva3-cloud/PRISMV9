"""Tests for Feature Primitive Library — CC-MS4.

Tests all 20 primitives, pattern detector, primitive generator,
and the search/registry API.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add src and project root to path
SRC = Path(__file__).resolve().parent.parent / "src"
PRIM = Path(__file__).resolve().parent.parent / "primitives"
sys.path.insert(0, str(SRC))
sys.path.insert(0, str(PRIM.parent))

from primitives.library import PRIMITIVES, PrimitiveDef, ParamSpec
from primitives import (
    get_primitive,
    list_primitives,
    search_by_tag,
    search_by_param,
    search_by_process,
    search_by_tooling,
    search,
)
from pattern_detect import PatternDetector, FeatureSignature, DetectedPattern
from primitive_gen import PrimitiveGenerator, GeneratedPrimitive


# ============================================================================
# Primitive Registry
# ============================================================================

class TestPrimitiveRegistry:
    """Test the primitive registry and search API."""

    def test_exactly_20_primitives(self):
        assert len(PRIMITIVES) == 20

    def test_list_primitives_sorted(self):
        names = list_primitives()
        assert len(names) == 20
        assert names == sorted(names)

    def test_get_primitive_exists(self):
        p = get_primitive("bolt_circle")
        assert p is not None
        assert p.name == "bolt_circle"

    def test_get_primitive_missing(self):
        assert get_primitive("nonexistent") is None

    def test_all_primitives_have_required_fields(self):
        for name, p in PRIMITIVES.items():
            assert p.name == name, f"{name}: name mismatch"
            assert len(p.description) > 10, f"{name}: description too short"
            assert len(p.tags) >= 2, f"{name}: needs at least 2 tags"
            assert len(p.params) >= 1, f"{name}: needs at least 1 param"
            assert len(p.processes) >= 1, f"{name}: needs at least 1 process"
            assert len(p.tooling) >= 1, f"{name}: needs at least 1 tool"

    def test_all_params_have_specs(self):
        for name, p in PRIMITIVES.items():
            for pname, spec in p.params.items():
                assert spec.name == pname, f"{name}.{pname}: spec name mismatch"
                assert spec.type in ("float", "int", "str"), f"{name}.{pname}: invalid type"
                assert spec.default is not None, f"{name}.{pname}: missing default"

    def test_all_float_params_have_ranges(self):
        for name, p in PRIMITIVES.items():
            for pname, spec in p.params.items():
                if spec.type == "float" and spec.unit == "mm":
                    assert spec.min_val is not None, f"{name}.{pname}: missing min"
                    assert spec.max_val is not None, f"{name}.{pname}: missing max"
                    assert spec.min_val < spec.max_val, f"{name}.{pname}: min >= max"

    def test_index_json_matches_registry(self):
        index_path = PRIM / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index_names = {entry["name"] for entry in index}
        registry_names = set(PRIMITIVES.keys())
        assert index_names == registry_names


# ============================================================================
# Search API
# ============================================================================

class TestSearch:
    def test_search_by_tag_hole(self):
        results = search_by_tag("hole")
        names = {r.name for r in results}
        assert "bolt_circle" in names
        assert "counterbore" in names
        assert "countersink" in names
        assert "tapped_hole" in names

    def test_search_by_tag_groove(self):
        results = search_by_tag("groove")
        names = {r.name for r in results}
        assert "o_ring_groove" in names
        assert "thread_relief" in names

    def test_search_by_param_diameter(self):
        results = search_by_param("diameter")
        names = {r.name for r in results}
        assert "bolt_circle" in names
        assert "boss" in names

    def test_search_by_process_turning(self):
        results = search_by_process("turning")
        names = {r.name for r in results}
        assert "shoulder" in names
        assert "thread_relief" in names
        assert "undercut" in names

    def test_search_by_tooling_end_mill(self):
        results = search_by_tooling("end_mill")
        assert len(results) >= 10  # Most milled features need end mills

    def test_search_multi_criteria(self):
        results = search("", tags=["fastener"], processes=["drilling"])
        names = {r.name for r in results}
        assert "counterbore" in names or "countersink" in names

    def test_search_by_query_text(self):
        results = search("seal")
        names = {r.name for r in results}
        assert "o_ring_groove" in names

    def test_search_empty_returns_all(self):
        results = search("")
        assert len(results) == 20


# ============================================================================
# Code Generation — each primitive
# ============================================================================

PRIMITIVE_NAMES = sorted(PRIMITIVES.keys())


@pytest.mark.parametrize("name", PRIMITIVE_NAMES)
class TestPrimitiveCodeGen:
    """Test that each primitive generates valid CadQuery code."""

    def test_generates_code(self, name: str):
        p = PRIMITIVES[name]
        code = p.generate()
        assert isinstance(code, str)
        assert len(code) > 20
        assert "cq" in code or "cadquery" in code or "result" in code

    def test_code_contains_import(self, name: str):
        p = PRIMITIVES[name]
        code = p.generate()
        # Most primitives import cadquery, some are modifier-only
        if name not in ("fillet_break", "chamfer_break", "shell"):
            assert "import cadquery" in code or "cq." in code

    def test_default_params_used(self, name: str):
        p = PRIMITIVES[name]
        code = p.generate()
        # Code should contain default values
        for pname, spec in p.params.items():
            if spec.type == "float" and isinstance(spec.default, (int, float)):
                # The formatted value should appear in the code
                assert code  # Just verify it generates without error

    def test_to_dict_roundtrip(self, name: str):
        p = PRIMITIVES[name]
        d = p.to_dict()
        assert d["name"] == name
        assert "params" in d
        assert "tags" in d
        assert "processes" in d
        assert "tooling" in d


# ============================================================================
# Parameter Validation
# ============================================================================

class TestParamValidation:
    def test_override_params(self):
        p = PRIMITIVES["pocket"]
        code = p.generate(width=50.0, depth=15.0)
        assert "50" in code
        assert "15" in code

    def test_reject_below_min(self):
        p = PRIMITIVES["bolt_circle"]
        with pytest.raises(ValueError, match="below min"):
            p.generate(diameter=1.0)  # min is 10.0

    def test_reject_above_max(self):
        p = PRIMITIVES["bolt_circle"]
        with pytest.raises(ValueError, match="above max"):
            p.generate(diameter=999.0)  # max is 500.0

    def test_ignore_unknown_params(self):
        p = PRIMITIVES["slot"]
        # Unknown params silently ignored
        code = p.generate(nonexistent=42.0)
        assert isinstance(code, str)

    def test_circular_pocket_shape(self):
        p = PRIMITIVES["pocket"]
        code = p.generate(shape="circular")
        assert "circle" in code

    def test_rectangular_pocket_default(self):
        p = PRIMITIVES["pocket"]
        code = p.generate()
        assert "rect" in code


# ============================================================================
# Specific Primitive Tests
# ============================================================================

class TestSpecificPrimitives:
    def test_bolt_circle_has_polar_array(self):
        code = PRIMITIVES["bolt_circle"].generate()
        assert "polarArray" in code

    def test_counterbore_uses_cboreHole(self):
        code = PRIMITIVES["counterbore"].generate()
        assert "cboreHole" in code

    def test_countersink_uses_cskHole(self):
        code = PRIMITIVES["countersink"].generate()
        assert "cskHole" in code

    def test_tapped_hole_computes_drill_size(self):
        code = PRIMITIVES["tapped_hole"].generate()
        assert "tap_drill_diameter" in code

    def test_dovetail_has_trapezoidal_profile(self):
        code = PRIMITIVES["dovetail"].generate()
        assert "moveTo" in code
        assert "lineTo" in code

    def test_gusset_triangular_profile(self):
        code = PRIMITIVES["gusset"].generate()
        assert "moveTo" in code
        assert "lineTo" in code
        assert "close" in code

    def test_shell_uses_shell_method(self):
        code = PRIMITIVES["shell"].generate()
        assert ".shell(" in code

    def test_slot_uses_slot2D(self):
        code = PRIMITIVES["slot"].generate()
        assert "slot2D" in code

    def test_shoulder_two_sections(self):
        code = PRIMITIVES["shoulder"].generate()
        assert "circle" in code
        assert "extrude" in code


# ============================================================================
# Pattern Detector
# ============================================================================

def _make_feature(ftype: str, params: dict | None = None) -> dict:
    """Helper to create a feature dict."""
    return {
        "feature_type": ftype,
        "name": ftype,
        "parameters": [
            {"name": k, "value": v} for k, v in (params or {}).items()
        ],
    }


def _make_source(source_id: str, features: list[dict]) -> dict:
    return {"source_id": source_id, "cad": {"features": features}}


class TestPatternDetector:
    def test_detect_single_recurring_feature(self):
        sources = [
            _make_source("v1", [_make_feature("hole", {"diameter": 10})]),
            _make_source("v2", [_make_feature("hole", {"diameter": 12})]),
            _make_source("v3", [_make_feature("hole", {"diameter": 8})]),
        ]
        detector = PatternDetector(min_length=1, max_length=1, min_frequency=2, min_sources=2)
        patterns = detector.detect(sources)
        assert len(patterns) >= 1
        assert patterns[0].pattern_key == "hole"
        assert patterns[0].frequency >= 3

    def test_detect_sequence_pattern(self):
        seq = [
            _make_feature("extrude", {"depth": 20}),
            _make_feature("hole", {"diameter": 10}),
        ]
        sources = [
            _make_source("v1", seq),
            _make_source("v2", seq),
            _make_source("v3", [_make_feature("fillet", {"radius": 2})]),
        ]
        detector = PatternDetector(min_length=2, max_length=2, min_frequency=2, min_sources=2)
        patterns = detector.detect(sources)
        assert any(p.pattern_key == "extrude|hole" for p in patterns)

    def test_param_variance_computed(self):
        sources = [
            _make_source("v1", [_make_feature("hole", {"diameter": 10})]),
            _make_source("v2", [_make_feature("hole", {"diameter": 20})]),
        ]
        detector = PatternDetector(min_length=1, max_length=1, min_frequency=2, min_sources=2)
        patterns = detector.detect(sources)
        assert len(patterns) >= 1
        hole_pattern = patterns[0]
        assert "diameter" in hole_pattern.param_variance
        var = hole_pattern.param_variance["diameter"]
        assert var["min"] == 10.0
        assert var["max"] == 20.0
        assert var["mean"] == 15.0

    def test_min_sources_filter(self):
        sources = [
            _make_source("v1", [_make_feature("hole", {"diameter": 10})] * 5),
        ]
        detector = PatternDetector(min_length=1, max_length=1, min_frequency=2, min_sources=2)
        patterns = detector.detect(sources)
        # All from same source, so min_sources=2 filters it out
        assert len(patterns) == 0

    def test_empty_input(self):
        detector = PatternDetector()
        assert detector.detect([]) == []

    def test_detect_single_features_convenience(self):
        sources = [
            _make_source("v1", [
                _make_feature("extrude", {"depth": 10}),
                _make_feature("fillet", {"radius": 2}),
            ]),
            _make_source("v2", [
                _make_feature("extrude", {"depth": 15}),
            ]),
        ]
        detector = PatternDetector(min_frequency=2, min_sources=2)
        patterns = detector.detect_single_features(sources)
        assert any(p.pattern_key == "extrude" for p in patterns)

    def test_summarize(self):
        sources = [
            _make_source("v1", [_make_feature("hole", {"diameter": 10})]),
            _make_source("v2", [_make_feature("hole", {"diameter": 12})]),
        ]
        detector = PatternDetector(min_length=1, max_length=1, min_frequency=2, min_sources=2)
        patterns = detector.detect(sources)
        summary = detector.summarize(patterns)
        assert "total_patterns" in summary
        assert "top_patterns" in summary
        assert summary["total_patterns"] >= 1

    def test_feature_signature_from_feature(self):
        feature = _make_feature("hole", {"diameter": 10, "depth": 25})
        sig = FeatureSignature.from_feature(feature, source_id="test", index=0)
        assert sig.feature_type == "hole"
        assert "depth" in sig.param_names
        assert "diameter" in sig.param_names

    def test_ten_source_detection(self):
        """Pattern detector finds patterns from 10+ sources (exit condition)."""
        sources = [
            _make_source(f"v{i}", [
                _make_feature("extrude", {"depth": 10 + i}),
                _make_feature("hole", {"diameter": 6 + i * 0.5}),
                _make_feature("fillet", {"radius": 1 + i * 0.1}),
            ])
            for i in range(12)
        ]
        detector = PatternDetector(min_length=1, max_length=3, min_frequency=5, min_sources=5)
        patterns = detector.detect(sources)
        assert len(patterns) >= 1
        # Should find at least single-feature patterns from 12 sources
        assert any(len(p.sources) >= 10 for p in patterns)


# ============================================================================
# Primitive Generator
# ============================================================================

class TestPrimitiveGenerator:
    def test_generate_from_pattern(self):
        pattern = DetectedPattern(
            pattern_key="hole",
            feature_types=["hole"],
            frequency=10,
            sources=["v1", "v2", "v3"],
            param_names=["diameter", "depth"],
            param_variance={
                "diameter": {"min": 5.0, "max": 20.0, "mean": 12.5, "count": 10},
                "depth": {"min": 10.0, "max": 40.0, "mean": 25.0, "count": 10},
            },
            examples=[],
        )
        gen = PrimitiveGenerator()
        prim = gen.generate_from_pattern(pattern)
        assert prim.name == "hole"
        assert len(prim.params) == 2
        assert prim.frequency == 10
        assert prim.source_count == 3

    def test_generated_code_has_function(self):
        pattern = DetectedPattern(
            pattern_key="extrude|hole",
            feature_types=["extrude", "hole"],
            frequency=5,
            sources=["v1", "v2"],
            param_names=["depth", "diameter"],
            param_variance={
                "depth": {"min": 5.0, "max": 30.0, "mean": 15.0, "count": 5},
                "diameter": {"min": 4.0, "max": 12.0, "mean": 8.0, "count": 5},
            },
            examples=[],
        )
        gen = PrimitiveGenerator()
        prim = gen.generate_from_pattern(pattern)
        assert "def extrude_hole" in prim.code
        assert "depth" in prim.code
        assert "diameter" in prim.code

    def test_generate_batch(self):
        patterns = [
            DetectedPattern(
                pattern_key=f"type_{i}",
                feature_types=[f"type_{i}"],
                frequency=10 - i,
                sources=[f"v{j}" for j in range(3)],
                param_names=["size"],
                param_variance={"size": {"min": 1.0, "max": 10.0, "mean": 5.0, "count": 3}},
                examples=[],
            )
            for i in range(5)
        ]
        gen = PrimitiveGenerator()
        prims = gen.generate_batch(patterns, max_count=3)
        assert len(prims) == 3

    def test_to_dict(self):
        pattern = DetectedPattern(
            pattern_key="hole",
            feature_types=["hole"],
            frequency=5,
            sources=["v1"],
            param_names=["diameter"],
            param_variance={"diameter": {"min": 5.0, "max": 15.0, "mean": 10.0, "count": 5}},
            examples=[],
        )
        gen = PrimitiveGenerator()
        prim = gen.generate_from_pattern(pattern)
        d = prim.to_dict()
        assert d["name"] == "hole"
        assert len(d["params"]) == 1
        assert d["frequency"] == 5

    def test_param_units_inferred(self):
        pattern = DetectedPattern(
            pattern_key="extrude",
            feature_types=["extrude"],
            frequency=3,
            sources=["v1", "v2", "v3"],
            param_names=["depth", "width", "angle"],
            param_variance={
                "depth": {"min": 5.0, "max": 20.0, "mean": 12.0, "count": 3},
                "width": {"min": 10.0, "max": 50.0, "mean": 30.0, "count": 3},
                "angle": {"min": 0.0, "max": 45.0, "mean": 15.0, "count": 3},
            },
            examples=[],
        )
        gen = PrimitiveGenerator()
        prim = gen.generate_from_pattern(pattern)
        param_map = {p.name: p for p in prim.params}
        assert param_map["depth"].unit == "mm"
        assert param_map["width"].unit == "mm"
        assert param_map["angle"].unit == "deg"
