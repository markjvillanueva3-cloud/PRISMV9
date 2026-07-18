"""Tests for CC-MS3 Parametric Code Generator.

Tests feature_translator, param_template, code_gen, and code_validator
using 3 test parts: simple box, flanged plate, and revolved shaft.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

import pytest

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from feature_translator import FeatureTranslator, TranslatedOp
from param_template import ParamTemplateGenerator, ParamDef
from code_gen import CodeGenerator, GeneratedScript
from code_validator import CodeValidator


def _cadquery_available() -> bool:
    """Check if CadQuery is installed."""
    try:
        import cadquery  # noqa: F401
        return True
    except ImportError:
        return False


# =====================================================================
# Test Feature Trees (knowledge_schema_v2 format)
# =====================================================================

SIMPLE_BOX = [
    {
        "id": "f1",
        "name": "base_sketch",
        "feature_type": "sketch",
        "parameters": [{"name": "plane", "value": "XY"}],
        "provenance": {"source_type": "vision", "confidence": 0.95, "timestamp_seconds": 12.5},
    },
    {
        "id": "f2",
        "name": "box_extrude",
        "feature_type": "extrude",
        "parameters": [
            {"name": "width", "value": 50.0, "unit": "mm", "min": 10.0, "max": 200.0},
            {"name": "height", "value": 30.0, "unit": "mm", "min": 10.0, "max": 200.0},
            {"name": "depth", "value": 20.0, "unit": "mm", "min": 5.0, "max": 100.0},
        ],
        "parent_feature_id": "f1",
        "provenance": {"source_type": "transcript", "confidence": 0.9, "timestamp_seconds": 15.0},
    },
    {
        "id": "f3",
        "name": "edge_fillet",
        "feature_type": "fillet",
        "parameters": [
            {"name": "radius", "value": 2.0, "unit": "mm"},
        ],
        "parent_feature_id": "f2",
    },
]

FLANGED_PLATE = [
    {
        "id": "fp1",
        "name": "plate_sketch",
        "feature_type": "sketch",
        "parameters": [{"name": "plane", "value": "XY"}],
    },
    {
        "id": "fp2",
        "name": "plate_body",
        "feature_type": "extrude",
        "parameters": [
            {"name": "width", "value": 80.0, "unit": "mm"},
            {"name": "height", "value": 60.0, "unit": "mm"},
            {"name": "depth", "value": 8.0, "unit": "mm"},
        ],
    },
    {
        "id": "fp3",
        "name": "mounting_holes",
        "feature_type": "pattern",
        "parameters": [
            {"name": "pattern_type", "value": "linear"},
            {"name": "count_x", "value": 2},
            {"name": "count_y", "value": 2},
            {"name": "spacing_x", "value": 56.0, "unit": "mm"},
            {"name": "spacing_y", "value": 36.0, "unit": "mm"},
        ],
    },
    {
        "id": "fp4",
        "name": "hole",
        "feature_type": "hole",
        "parameters": [
            {"name": "diameter", "value": 10.0, "unit": "mm"},
            {"name": "depth", "value": 8.0, "unit": "mm"},
        ],
        "parent_feature_id": "fp3",
    },
    {
        "id": "fp5",
        "name": "edge_chamfer",
        "feature_type": "chamfer",
        "parameters": [
            {"name": "distance", "value": 1.5, "unit": "mm"},
            {"name": "edges", "value": "|Z"},
        ],
    },
]

REVOLVED_SHAFT = [
    {
        "id": "rs1",
        "name": "profile_sketch",
        "feature_type": "sketch",
        "parameters": [{"name": "plane", "value": "XZ"}],
    },
    {
        "id": "rs2",
        "name": "shaft_body",
        "feature_type": "revolve",
        "parameters": [
            {"name": "angle", "value": 360.0, "unit": "deg"},
        ],
        "provenance": {
            "source_type": "vision",
            "confidence": 0.88,
            "timestamp_seconds": 42.0,
            "transcript_span": "now we revolve the profile 360 degrees",
        },
    },
    {
        "id": "rs3",
        "name": "keyway",
        "feature_type": "boolean_subtract",
        "parameters": [],
    },
    {
        "id": "rs4",
        "name": "mirror_keyway",
        "feature_type": "mirror",
        "parameters": [{"name": "mirror_plane", "value": "YZ"}],
    },
]


# =====================================================================
# FeatureTranslator tests
# =====================================================================


class TestFeatureTranslator:
    def setup_method(self):
        self.tr = FeatureTranslator()

    def test_translate_sketch(self):
        op = self.tr.translate(SIMPLE_BOX[0])
        assert isinstance(op, TranslatedOp)
        assert "Workplane" in op.code
        assert '"XY"' in op.code

    def test_translate_extrude(self):
        op = self.tr.translate(SIMPLE_BOX[1])
        assert "extrude" in op.code
        assert "rect" in op.code

    def test_translate_fillet(self):
        op = self.tr.translate(SIMPLE_BOX[2])
        assert "fillet" in op.code
        assert "2" in op.code

    def test_translate_hole(self):
        op = self.tr.translate(FLANGED_PLATE[3])
        assert "hole" in op.code
        assert "10" in op.code

    def test_translate_chamfer_with_edges(self):
        op = self.tr.translate(FLANGED_PLATE[4])
        assert "chamfer" in op.code
        assert "|Z" in op.code

    def test_translate_revolve(self):
        op = self.tr.translate(REVOLVED_SHAFT[1])
        assert "revolve" in op.code
        assert "360" in op.code

    def test_translate_boolean_subtract(self):
        op = self.tr.translate(REVOLVED_SHAFT[2])
        assert "cut" in op.code

    def test_translate_mirror(self):
        op = self.tr.translate(REVOLVED_SHAFT[3])
        assert "mirror" in op.code
        assert "YZ" in op.code

    def test_translate_pattern_linear(self):
        op = self.tr.translate(FLANGED_PLATE[2])
        assert "rarray" in op.code

    def test_translate_pattern_circular(self):
        feat = {
            "id": "cp1",
            "name": "bolt_circle",
            "feature_type": "pattern",
            "parameters": [
                {"name": "pattern_type", "value": "circular"},
                {"name": "count", "value": 6},
                {"name": "radius", "value": 30.0},
            ],
        }
        op = self.tr.translate(feat)
        assert "polarArray" in op.code

    def test_translate_shell(self):
        feat = {
            "id": "sh1", "name": "hollow", "feature_type": "shell",
            "parameters": [{"name": "thickness", "value": 2.0}],
        }
        op = self.tr.translate(feat)
        assert "shell" in op.code

    def test_translate_tree(self):
        ops = self.tr.translate_tree(SIMPLE_BOX)
        assert len(ops) == 3
        assert all(isinstance(o, TranslatedOp) for o in ops)

    def test_provenance_preserved(self):
        op = self.tr.translate(SIMPLE_BOX[0])
        assert "vision" in op.provenance_note
        assert "95%" in op.provenance_note

    def test_unknown_feature_type(self):
        feat = {"id": "u1", "name": "weird", "feature_type": "weld_bead", "parameters": []}
        op = self.tr.translate(feat)
        assert "Unknown" in op.code or "weld_bead" in op.code

    def test_all_schema_types_handled(self):
        """Every feature_type in schema has a translator."""
        schema_types = [
            "sketch", "extrude", "revolve", "loft", "sweep",
            "fillet", "chamfer", "hole", "pattern", "mirror",
            "shell", "boolean_union", "boolean_subtract", "boolean_intersect",
            "draft", "rib", "reference_geometry", "surface", "sheet_metal", "other",
        ]
        for ftype in schema_types:
            feat = {"id": "t", "name": "test", "feature_type": ftype, "parameters": []}
            op = self.tr.translate(feat)
            assert isinstance(op, TranslatedOp)


# =====================================================================
# ParamTemplateGenerator tests
# =====================================================================


class TestParamTemplate:
    def setup_method(self):
        self.gen = ParamTemplateGenerator()

    def test_extract_params_simple_box(self):
        params = self.gen.extract_params(SIMPLE_BOX)
        assert len(params) >= 4  # plane, width, height, depth, radius
        names = {p.name for p in params}
        assert "box_extrude_width" in names
        assert "box_extrude_depth" in names

    def test_param_types(self):
        params = self.gen.extract_params(SIMPLE_BOX)
        by_name = {p.name: p for p in params}
        assert by_name["box_extrude_width"].python_type == "float"
        assert by_name["box_extrude_width"].unit == "mm"

    def test_param_ranges(self):
        params = self.gen.extract_params(SIMPLE_BOX)
        by_name = {p.name: p for p in params}
        wp = by_name["box_extrude_width"]
        assert wp.min_val == 10.0
        assert wp.max_val == 200.0

    def test_param_code_generation(self):
        params = self.gen.extract_params(SIMPLE_BOX)
        code = self.gen.generate_param_block(params)
        assert "box_extrude_width" in code
        assert "float" in code
        assert "mm" in code

    def test_deduplication(self):
        """Same param name from different features should not duplicate."""
        features = [
            {"id": "a", "name": "top", "feature_type": "extrude",
             "parameters": [{"name": "depth", "value": 10.0}]},
            {"id": "b", "name": "top", "feature_type": "extrude",
             "parameters": [{"name": "depth", "value": 20.0}]},
        ]
        params = self.gen.extract_params(features)
        depth_params = [p for p in params if "depth" in p.name]
        # First occurrence wins
        assert len(depth_params) == 1
        assert depth_params[0].value == 10.0

    def test_int_type_detection(self):
        params = self.gen.extract_params(FLANGED_PLATE)
        by_name = {p.name: p for p in params}
        assert by_name["mounting_holes_count_x"].python_type == "int"

    def test_string_type_detection(self):
        params = self.gen.extract_params(FLANGED_PLATE)
        by_name = {p.name: p for p in params}
        assert by_name["mounting_holes_pattern_type"].python_type == "str"

    def test_to_code_float(self):
        p = ParamDef(name="width", value=50.0, python_type="float", unit="mm")
        code = p.to_code()
        assert "width: float = 50" in code
        assert "mm" in code

    def test_to_code_int(self):
        p = ParamDef(name="count", value=4, python_type="int")
        code = p.to_code()
        assert "count: int = 4" in code


# =====================================================================
# CodeGenerator tests
# =====================================================================


class TestCodeGenerator:
    def setup_method(self):
        self.gen = CodeGenerator()

    def test_generate_simple_box(self):
        result = self.gen.generate_from_features(SIMPLE_BOX, "simple_box")
        assert isinstance(result, GeneratedScript)
        assert result.feature_count == 3
        assert result.op_count == 3
        assert len(result.params) >= 4

    def test_generated_code_has_imports(self):
        result = self.gen.generate_from_features(SIMPLE_BOX, "box")
        assert "import cadquery" in result.code

    def test_generated_code_has_parameters(self):
        result = self.gen.generate_from_features(SIMPLE_BOX, "box")
        assert "box_extrude_width" in result.code
        assert "box_extrude_depth" in result.code

    def test_generated_code_has_provenance(self):
        result = self.gen.generate_from_features(
            SIMPLE_BOX, "box", video_id="VID-001"
        )
        assert "VID-001" in result.code
        assert "PRISM" in result.code

    def test_generated_code_has_export(self):
        result = self.gen.generate_from_features(SIMPLE_BOX, "box")
        assert "export" in result.code.lower()
        assert ".step" in result.code

    def test_generated_code_parses_as_python(self):
        """All generated code must be valid Python."""
        for features, name in [
            (SIMPLE_BOX, "box"),
            (FLANGED_PLATE, "plate"),
            (REVOLVED_SHAFT, "shaft"),
        ]:
            result = self.gen.generate_from_features(features, name)
            try:
                ast.parse(result.code)
            except SyntaxError as e:
                pytest.fail(f"{name} generated invalid Python: {e}")

    def test_flanged_plate_generation(self):
        result = self.gen.generate_from_features(FLANGED_PLATE, "flanged_plate")
        assert result.feature_count == 5
        assert "hole" in result.code
        assert "chamfer" in result.code

    def test_revolved_shaft_generation(self):
        result = self.gen.generate_from_features(REVOLVED_SHAFT, "shaft")
        assert "revolve" in result.code
        assert "mirror" in result.code
        assert "cut" in result.code

    def test_generate_with_knowledge_wrapper(self):
        knowledge = {
            "video_id": "VID-TEST",
            "title": "Test Part",
            "cad": {"features": SIMPLE_BOX},
        }
        result = self.gen.generate(knowledge, part_name="test_part")
        assert "VID-TEST" in result.code

    def test_generate_empty_features_raises(self):
        with pytest.raises(ValueError, match="No CAD features"):
            self.gen.generate({"cad": {"features": []}})

    def test_generate_to_file(self, tmp_path):
        out = str(tmp_path / "test_part.py")
        result = self.gen.generate_from_features(SIMPLE_BOX, "test")
        result2 = self.gen.generate(
            {"cad": {"features": SIMPLE_BOX}},
            output_path=out,
            part_name="test",
        )
        assert Path(out).exists()
        assert Path(out).read_text(encoding="utf-8") == result2.code

    def test_all_params_parameterized(self):
        """Verify dimensions use parameter names, not literals."""
        result = self.gen.generate_from_features(SIMPLE_BOX, "box")
        # The parameter block should contain all extracted params
        for p in result.params:
            assert p.name in result.code, f"Param {p.name} not in generated code"


# =====================================================================
# CodeValidator tests
# =====================================================================


class TestCodeValidator:
    def setup_method(self):
        self.val = CodeValidator()

    def test_valid_python_passes_parse(self):
        code = "import cadquery as cq\nresult = cq.Workplane('XY').box(10, 10, 10)\n"
        result = self.val.validate(code)
        assert result.parse_ok

    def test_invalid_python_fails_parse(self):
        code = "def invalid(\n"
        result = self.val.validate(code)
        assert not result.parse_ok
        assert not result.is_valid
        assert len(result.errors) > 0

    def test_missing_import_warns(self):
        code = "x = 1 + 2\n"
        result = self.val.validate(code)
        assert result.parse_ok
        assert any("cadquery" in w.lower() for w in result.warnings)

    def test_generated_code_passes_parse(self):
        """All 3 test parts generate parseable code."""
        gen = CodeGenerator()
        for features, name in [
            (SIMPLE_BOX, "box"),
            (FLANGED_PLATE, "plate"),
            (REVOLVED_SHAFT, "shaft"),
        ]:
            result = gen.generate_from_features(features, name)
            val_result = self.val.validate(result.code)
            assert val_result.parse_ok, f"{name} failed parse: {val_result.errors}"

    @pytest.mark.skipif(
        not _cadquery_available(),
        reason="CadQuery not installed",
    )
    def test_simple_box_executes(self):
        code = (
            "import cadquery as cq\n"
            "result = cq.Workplane('XY').box(50, 30, 20).fillet(2)\n"
        )
        result = self.val.validate(code)
        assert result.executes_ok
        assert result.volume_mm3 > 0

    @pytest.mark.skipif(
        not _cadquery_available(),
        reason="CadQuery not installed",
    )
    def test_geometry_check(self):
        code = (
            "import cadquery as cq\n"
            "result = cq.Workplane('XY').box(10, 10, 10)\n"
        )
        result = self.val.validate(code)
        assert result.geometry_ok
        assert result.volume_mm3 > 900  # ~1000mm³


# =====================================================================
# Edge Case Tests (Step 6)
# =====================================================================


class TestEdgeCases:
    """Edge cases: counterbore/countersink, symmetric extrude, loft, sweep,
    draft, rib, sheet metal, surface, reference, and multi-body."""

    def setup_method(self):
        self.tr = FeatureTranslator()
        self.gen = CodeGenerator()
        self.param_gen = ParamTemplateGenerator()

    # -- Hole variants --

    def test_counterbore_hole(self):
        feature = {
            "id": "h1", "name": "cbore_hole", "feature_type": "hole",
            "parameters": [
                {"name": "diameter", "value": 6.0},
                {"name": "counterbore_diameter", "value": 12.0},
                {"name": "counterbore_depth", "value": 4.0},
                {"name": "depth", "value": 20.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "cboreHole" in op.code
        assert "12" in op.code
        assert "depth=" in op.code

    def test_countersink_hole(self):
        feature = {
            "id": "h2", "name": "csink_hole", "feature_type": "hole",
            "parameters": [
                {"name": "diameter", "value": 5.0},
                {"name": "countersink_angle", "value": 82.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "cskHole" in op.code
        assert "82" in op.code

    def test_hole_with_position(self):
        feature = {
            "id": "h3", "name": "pos_hole", "feature_type": "hole",
            "parameters": [
                {"name": "diameter", "value": 8.0},
                {"name": "position", "value": "(10, 15)"},
            ],
        }
        op = self.tr.translate(feature)
        assert "pushPoints" in op.code
        assert "(10, 15)" in op.code

    # -- Extrude variants --

    def test_symmetric_extrude(self):
        feature = {
            "id": "e1", "name": "sym_pad", "feature_type": "extrude",
            "parameters": [
                {"name": "depth", "value": 25.0},
                {"name": "width", "value": 40.0},
                {"name": "height", "value": 30.0},
                {"name": "symmetric", "value": True},
            ],
        }
        op = self.tr.translate(feature)
        assert "both=True" in op.code
        assert "rect(" in op.code

    def test_tapered_extrude(self):
        feature = {
            "id": "e2", "name": "tapered_pad", "feature_type": "extrude",
            "parameters": [
                {"name": "depth", "value": 15.0},
                {"name": "taper_angle", "value": 5.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "taper=" in op.code

    # -- Loft / Sweep --

    def test_loft_ruled(self):
        feature = {
            "id": "l1", "name": "ruled_loft", "feature_type": "loft",
            "parameters": [{"name": "ruled", "value": True}],
        }
        op = self.tr.translate(feature)
        assert "loft" in op.code
        assert "ruled=True" in op.code

    def test_sweep(self):
        feature = {
            "id": "s1", "name": "pipe_sweep", "feature_type": "sweep",
            "parameters": [],
        }
        op = self.tr.translate(feature)
        assert "sweep" in op.code
        assert "path_wire" in op.code

    # -- Draft / Rib / Shell --

    def test_draft(self):
        feature = {
            "id": "d1", "name": "mold_draft", "feature_type": "draft",
            "parameters": [{"name": "draft_angle", "value": 3.0}],
        }
        op = self.tr.translate(feature)
        assert "3" in op.code
        assert "Draft" in op.comment

    def test_rib(self):
        feature = {
            "id": "r1", "name": "support_rib", "feature_type": "rib",
            "parameters": [
                {"name": "thickness", "value": 2.5},
                {"name": "height", "value": 12.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "rect(" in op.code
        assert "extrude(" in op.code

    # -- Sheet metal / Surface / Reference --

    def test_sheet_metal(self):
        feature = {
            "id": "sm1", "name": "bracket", "feature_type": "sheet_metal",
            "parameters": [
                {"name": "thickness", "value": 1.2},
                {"name": "bend_radius", "value": 3.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "1.2" in op.code
        assert "3" in op.code

    def test_surface(self):
        feature = {
            "id": "sf1", "name": "freeform", "feature_type": "surface",
            "parameters": [],
        }
        op = self.tr.translate(feature)
        assert "Surface" in op.comment

    def test_reference_geometry(self):
        feature = {
            "id": "rg1", "name": "work_plane", "feature_type": "reference_geometry",
            "parameters": [{"name": "reference_type", "value": "axis"}],
        }
        op = self.tr.translate(feature)
        assert "axis" in op.code

    # -- Boolean variants --

    def test_boolean_union(self):
        feature = {
            "id": "b1", "name": "join", "feature_type": "boolean_union",
            "parameters": [],
        }
        op = self.tr.translate(feature)
        assert "union" in op.code

    def test_boolean_intersect(self):
        feature = {
            "id": "b2", "name": "common", "feature_type": "boolean_intersect",
            "parameters": [],
        }
        op = self.tr.translate(feature)
        assert "intersect" in op.code

    # -- Pattern edge cases --

    def test_circular_pattern(self):
        feature = {
            "id": "cp1", "name": "bolt_circle", "feature_type": "pattern",
            "parameters": [
                {"name": "pattern_type", "value": "circular"},
                {"name": "count", "value": 6},
                {"name": "radius", "value": 25.0},
            ],
        }
        op = self.tr.translate(feature)
        assert "polarArray" in op.code
        assert "360" in op.code
        assert "6" in op.code

    # -- Param edge cases --

    def test_empty_feature_params(self):
        """Feature with no parameters should still translate."""
        feature = {
            "id": "x1", "name": "empty", "feature_type": "other",
            "parameters": [],
        }
        op = self.tr.translate(feature)
        assert op.code  # Should produce something

    def test_param_with_provenance(self):
        """Parameters with source provenance should carry through."""
        features = [{
            "id": "pv1", "name": "prov_test", "feature_type": "extrude",
            "parameters": [{
                "name": "depth", "value": 15.0,
                "source": {
                    "source_type": "ocr",
                    "confidence": 0.95,
                },
            }],
        }]
        params = self.param_gen.extract_params(features)
        assert len(params) == 1
        assert params[0].provenance_note == "ocr, 95%"

    def test_duplicate_param_names_across_features(self):
        """Same param name in different features should be uniquified."""
        features = [
            {
                "id": "d1", "name": "base", "feature_type": "extrude",
                "parameters": [{"name": "depth", "value": 10.0}],
            },
            {
                "id": "d2", "name": "pocket", "feature_type": "extrude",
                "parameters": [{"name": "depth", "value": 5.0}],
            },
        ]
        params = self.param_gen.extract_params(features)
        names = [p.name for p in params]
        assert "base_depth" in names
        assert "pocket_depth" in names
        assert len(set(names)) == len(names)  # All unique

    def test_multi_feature_generation_parses(self):
        """A complex 8-feature part should generate parseable code."""
        features = [
            {"id": "m1", "name": "base_sketch", "feature_type": "sketch",
             "parameters": [{"name": "plane", "value": "XY"}]},
            {"id": "m2", "name": "base_pad", "feature_type": "extrude",
             "parameters": [{"name": "depth", "value": 30}, {"name": "width", "value": 100}, {"name": "height", "value": 60}]},
            {"id": "m3", "name": "top_fillet", "feature_type": "fillet",
             "parameters": [{"name": "radius", "value": 3.0}, {"name": "edges", "value": ">Z"}]},
            {"id": "m4", "name": "center_hole", "feature_type": "hole",
             "parameters": [{"name": "diameter", "value": 20.0}, {"name": "depth", "value": 30.0}]},
            {"id": "m5", "name": "bolt_pattern", "feature_type": "pattern",
             "parameters": [{"name": "pattern_type", "value": "circular"}, {"name": "count", "value": 4}, {"name": "radius", "value": 35.0}]},
            {"id": "m6", "name": "pocket", "feature_type": "extrude",
             "parameters": [{"name": "depth", "value": 10.0}, {"name": "width", "value": 40.0}, {"name": "height", "value": 20.0}]},
            {"id": "m7", "name": "sym_mirror", "feature_type": "mirror",
             "parameters": [{"name": "mirror_plane", "value": "XZ"}]},
            {"id": "m8", "name": "final_chamfer", "feature_type": "chamfer",
             "parameters": [{"name": "distance", "value": 0.5}]},
        ]
        result = self.gen.generate_from_features(features, "complex_bracket")
        assert ast.parse(result.code)  # Must parse
        assert result.feature_count == 8
        assert result.op_count == 8
        assert len(result.params) > 5

    def test_generate_from_knowledge_domains_key(self):
        """Knowledge with 'domains.cad' key should also work."""
        knowledge = {
            "video_id": "v123",
            "title": "test",
            "domains": {"cad": {"features": SIMPLE_BOX}},
        }
        result = self.gen.generate(knowledge)
        assert "Workplane" in result.code
        assert result.feature_count == 3

    def test_param_block_empty(self):
        """Empty param list should produce a comment, not crash."""
        block = self.param_gen.generate_param_block([])
        assert "No parameters" in block

    def test_safe_name_special_chars(self):
        """Part names with special chars should be sanitized."""
        from code_gen import _safe_name
        assert _safe_name("My Part-v2.1") == "my_part_v2_1"
        assert _safe_name("  ") == "part"
        assert _safe_name("123!@#") == "123"
        assert _safe_name("") == "part"

    def test_sanitize_leading_digits(self):
        """Param sanitizer should strip leading digits."""
        from param_template import _sanitize
        assert _sanitize("3d_sketch") == "d_sketch"
        assert _sanitize("normal_name") == "normal_name"
        assert _sanitize("---") == "___"


def _cadquery_available() -> bool:
    try:
        import cadquery  # noqa: F401
        return True
    except ImportError:
        return False
